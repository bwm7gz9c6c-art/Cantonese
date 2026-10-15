/* ============================================================
   aiui.js · AI 陪練面板（邏輯層）
   - AI 對話（扮演香港本地人）／跟讀校準／12 題定級測試
   - 純瀏覽器：key 存 localStorage，直接叫 DeepSeek（OpenAI 兼容）
   - 依賴 app.js 注入的 ctx（getS / save / speak / esc / go / start / render）
   ============================================================ */
(function () {
  "use strict";

  var A = (window.CANTO_DATA && window.CANTO_DATA.ai) || {};
  var D = window.CANTO_DATA || {};
  var SP = D.speak || {};
  var POOL = {
    tone: D.toneQuiz, pair: D.pairs, usage: D.usageQuiz, oral: SP.oralQuiz,
    word: (D.lexicon ? D.lexicon.rows : []), drill: D.drill, shadow: SP.shadow, role: SP.roleTurns
  };
  var ctx = null, root = null;

  var chat = { scene: null, msgs: [], busy: false, notice: "", rec: null, practice: null, listening: false, lastErr: "" };
  var place = { on: false, i: 0, qs: [], ok: 0, earned: 0, max: 0, done: false, lv: 0, ratio: 0 };

  /* ---------------- 文案 ---------------- */
  function lang() { return ctx && ctx.getS().aiLang === "zh" ? "zh" : "yue"; }
  function T(k) {
    var t = A.ui && A.ui[lang()];
    return (t && t[k]) || k;
  }
  function tf(k, vars) {
    var s = T(k);
    for (var key in vars) if (vars.hasOwnProperty(key)) s = s.split("{" + key + "}").join(vars[key]);
    return s;
  }
  function esc(s) { return ctx.esc(s); }
  function S() { return ctx.getS(); }
  function save() { ctx.save(); }

  /* ---------------- 网络 ---------------- */
  function apiKey() { return String(S().settings.apiKey || "").trim(); }
  function apiBase() {
    var b = String(S().settings.apiBase || "https://api.deepseek.com").trim().replace(/\/+$/, "");
    return b || "https://api.deepseek.com";
  }
  function apiModel() { return String(S().settings.apiModel || "deepseek-chat").trim() || "deepseek-chat"; }

  function ask(messages) {
    var key = apiKey();
    if (!key) return Promise.reject({ code: "nokey" });
    var body = JSON.stringify({ model: apiModel(), messages: messages, temperature: 0.8, max_tokens: 500, stream: false });
    return fetch(apiBase() + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: body
    }).then(function (r) {
      return r.text().then(function (t) {
        if (!r.ok) throw { code: r.status, body: t };
        var j = null;
        try { j = JSON.parse(t); } catch (e) { throw { code: "parse", body: t }; }
        var m = j.choices && j.choices[0] && j.choices[0].message;
        return (m && m.content) || "";
      });
    }, function (e) { throw { code: "net", body: String((e && e.message) || e) }; });
  }

  function errText(err) {
    var c = err && err.code;
    if (c === "nokey") return T("noKey");
    if (c === 401) return T("errKey");
    if (c === 402 || c === 429) return T("errQuota");
    if (c === "net" || c === "parse") return T("errCors") + " (" + esc(String(err.body).slice(0, 120)) + ")";
    return T("errNet") + esc(String(c) + " " + String((err && err.body) || "").slice(0, 160));
  }

  /* ---------------- 场景与提示词 ---------------- */
  function scenario() {
    var list = A.scenarios || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === chat.scene) return list[i];
    return null;
  }
  function lvTitle() {
    var lv = Number(S().level) || 0, arr = A.levels || [];
    if (lv >= 1 && lv <= arr.length) return arr[lv - 1].title;
    return "L2 · 識聽唔識講";
  }
  function systemPrompt() {
    var sc = scenario() || { persona: "香港朋友", sceneName: "閒聊", goals: "日常對話" };
    var p = A.prompts || {};
    var s = String(p.system || "")
      .split("{persona}").join(sc.persona)
      .split("{level}").join(lvTitle())
      .split("{format}").join(p.format || "")
      .split("{sceneName}").join(sc.name || sc.scene || "閒聊")
      .split("{goals}").join(sc.goals || "日常對話");
    if (lang() === "zh") s += "\n" + (p.langZh || "");
    return s;
  }
  function history() {
    var sys = [{ role: "system", content: systemPrompt() }];
    var h = chat.msgs.slice(-12).map(function (m) { return { role: m.role, content: m.content }; });
    return sys.concat(h);
  }

  /* ---------------- 回覆解析 ---------------- */
  function field(txt, tag) {
    var re = new RegExp("【" + tag + "】([\\s\\S]*?)(?=【|$)", "m");
    var m = re.exec(txt);
    return m ? m[1].trim() : "";
  }
  function parseReply(txt) {
    var o = { hk: "", jy: "", zh: "", fix: "", raw: String(txt || "").trim() };
    o.hk = field(o.raw, "粵");
    o.jy = field(o.raw, "拼");
    o.zh = field(o.raw, "普");
    o.fix = field(o.raw, "糾");
    if (!o.hk) { o.hk = o.raw.replace(/【[^】]*】/g, " ").trim(); o.raw = ""; }
    if (o.fix === "—" || o.fix === "-" || o.fix === "－") o.fix = "";
    return o;
  }

  /* ---------------- 语音识别 ---------------- */
  function SRClass() { return window.SpeechRecognition || window.webkitSpeechRecognition || null; }
  function asrLang() { return String(S().settings.asrLang || "yue-Hant-HK"); }
  function asrNote() {
    var l = asrLang();
    if (l === "yue-Hant-HK") return T("asrCanto");
    if (l === "zh-HK") return T("asrFallback");
    return T("asrAll");
  }
  function startASR(onText) {
    var C = SRClass();
    if (!C) { chat.notice = T("asrBad"); paint(); return; }
    if (chat.rec) { try { chat.rec.stop(); } catch (e) {} return; }
    var r = new C(), retried = false;
    chat.rec = r;
    chat.listening = true;
    chat.notice = T("listening");
    paint();
    r.lang = asrLang();
    r.continuous = false;
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = function (e) {
      var txt = (e.results && e.results[0] && e.results[0][0] && e.results[0][0].transcript) || "";
      chat.notice = "";
      onText(txt);
    };
    r.onerror = function (e) {
      var code = (e && e.error) || "unknown";
      if ((code === "language-not-supported" || code === "bad-grammar") && !retried) {
        retried = true;
        var next = asrLang() === "yue-Hant-HK" ? "zh-HK" : "zh-CN";
        S().settings.asrLang = next;
        save();
        chat.rec = null;
        chat.listening = false;
        setTimeout(function () { startASR(onText); }, 60);
        return;
      }
      chat.listening = false;
      chat.rec = null;
      chat.notice = (code === "not-allowed" || code === "service-not-allowed") ? T("asrDenied")
        : (code === "no-speech" ? T("compareNo") : (T("errNet") + code));
      paint();
    };
    r.onend = function () { chat.listening = false; chat.rec = null; paint(); };
    try { r.start(); } catch (e2) { chat.listening = false; chat.rec = null; chat.notice = T("asrBad"); paint(); }
  }

  /* ---------------- 发音比对（本地，无需 AI） ---------------- */
  function cleanText(s) {
    return String(s == null ? "" : s).replace(/[\s，。！？、：；「」『』（）()【】…·,.!?;:"'~～\-—_]/g, "");
  }
  function diffChars(a, b) {
    var n = a.length, m = b.length, dp = [], i, j;
    for (i = 0; i <= n; i++) { dp[i] = []; for (j = 0; j <= m; j++) dp[i][j] = 0; }
    for (i = n - 1; i >= 0; i--) {
      for (j = m - 1; j >= 0; j--) {
        dp[i][j] = a.charAt(i) === b.charAt(j) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    var ops = [];
    i = 0; j = 0;
    while (i < n && j < m) {
      if (a.charAt(i) === b.charAt(j)) { ops.push({ t: "same", a: a.charAt(i), b: b.charAt(j) }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ t: "miss", a: a.charAt(i) }); i++; }
      else { ops.push({ t: "extra", b: b.charAt(j) }); j++; }
    }
    while (i < n) { ops.push({ t: "miss", a: a.charAt(i) }); i++; }
    while (j < m) { ops.push({ t: "extra", b: b.charAt(j) }); j++; }
    return ops;
  }
  function confusionHint(right, heard) {
    var list = (A.pronHints && A.pronHints.confusions) || [];
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if ((c.a === right && c.b === heard) || (c.a === heard && c.b === right)) return c.hint;
    }
    return "";
  }
  function compare(practice, heardRaw) {
    var right = cleanText(practice.hk), heard = cleanText(heardRaw);
    if (!heard) return { none: true };
    var ops = diffChars(right, heard), ok = 0, rightHTML = "", heardHTML = "", hints = [];
    ops.forEach(function (op, k) {
      if (op.t === "same") { ok++; rightHTML += '<span style="color:var(--jade)">' + esc(op.a) + "</span>"; heardHTML += esc(op.b); }
      else if (op.t === "miss") {
        rightHTML += '<span style="color:var(--red2,#ff6b6b);text-decoration:underline">' + esc(op.a) + "</span>";
      } else {
        heardHTML += '<span style="color:var(--red2,#ff6b6b);text-decoration:underline">' + esc(op.b) + "</span>";
        var prev = ops[k - 1];
        if (prev && prev.t === "miss") { var h = confusionHint(prev.a, op.b); if (h && hints.indexOf(h) < 0) hints.push(h); }
      }
    });
    return { none: false, ok: ok, all: right.length, rightHTML: rightHTML, heardHTML: heardHTML, hints: hints, perfect: ok === right.length && heard.length === right.length };
  }

  /* ============================================================
     渲染
     ============================================================ */
  function paint() {
    if (!root) return;
    root.innerHTML = place.on ? placeHTML() : chatHTML();
  }

  /* ---------------- ⑦ AI 陪練 ---------------- */
  function setupHTML() {
    return '<div class="card"><h3>' + T("noKey") + "</h3>" +
      '<p class="dim small">' + T("steps") + "</p>" +
      '<label class="fld"><span>' + T("keyLabel") + '</span><input id="aiKey" type="password" autocomplete="off" spellcheck="false" placeholder="sk-..." value="' + esc(apiKey()) + '"></label>' +
      '<label class="fld"><span>' + T("modelLabel") + '</span><input id="aiModel" type="text" spellcheck="false" value="' + esc(apiModel()) + '"></label>' +
      '<div class="actions" style="justify-content:flex-start">' +
      '<button class="btn" data-act="ai-save">' + T("save") + "</button>" +
      '<button class="btn ghost small" data-act="go" data-v="speak">' + T("skipKey") + "</button></div>" +
      '<p class="dim small" style="margin-bottom:0">key 只存喺你部機（localStorage），直接送去 ' + esc(apiBase()) + "。</p></div>";
  }

  function sceneHTML() {
    var btns = (A.scenarios || []).map(function (s) {
      return '<div class="mod" data-act="ai-scene" data-v="' + s.id + '"><b>' + esc(s.name) + "</b><span>" + esc(s.persona) + "</span></div>";
    }).join("");
    return '<div class="card"><h3>' + T("pickScene") + '</h3><div class="grid">' + btns + "</div></div>";
  }

  function bubbleHTML(m) {
    if (m.role === "user") {
      return '<div class="msg me"><div class="who">' + T("youLabel") + '</div><div class="txt">' + esc(m.content) + "</div></div>";
    }
    var p = m.parsed || parseReply(m.content);
    return '<div class="msg ai"><div class="who">' + T("aiLabel") + '</div>' +
      '<div class="txt hz">' + esc(p.hk) + "</div>" +
      (p.jy ? '<div class="jy">' + esc(p.jy) + "</div>" : "") +
      (p.zh ? '<div class="note">' + esc(p.zh) + "</div>" : "") +
      (p.fix ? '<div class="fix"><b>糾正：</b>' + esc(p.fix) + "</div>" : "") +
      '<div class="actions" style="justify-content:flex-start">' +
      '<button class="mini" data-act="play" data-text="' + esc(p.hk) + '">🔊</button></div></div>';
  }

  function practiceHTML() {
    var pr = chat.practice;
    var head = '<h3 style="margin-top:16px">' + T("practiceTitle") + "</h3>";
    if (!pr) {
      return head + '<div class="actions" style="justify-content:flex-start">' +
        '<button class="btn ghost small" data-act="ai-practice">' + T("practiceGo") + "</button></div>" +
        '<p class="dim small" style="margin-bottom:0">' + asrNote() + "</p>";
    }
    var out = head +
      '<div class="item"><div class="l"><div class="hz">' + esc(pr.hk) + "</div>" +
      (pr.jy ? '<div class="jy">' + esc(pr.jy) + "</div>" : "") +
      (pr.zh ? '<div class="note">' + esc(pr.zh) + "</div>" : "") + "</div>" +
      '<button class="mini" data-act="play" data-text="' + esc(pr.hk) + '">🔊</button></div>' +
      '<div class="actions" style="justify-content:flex-start">' +
      '<button class="btn" data-act="ai-mic-read">' + T("practiceSay") + "</button>" +
      '<button class="btn ghost small" data-act="ai-practice">' + T("practiceGo") + "</button></div>";
    if (pr.cmp) {
      var c = pr.cmp;
      if (c.none) out += '<div class="fb no">' + T("compareNo") + "</div>";
      else {
        out += '<div class="fb ' + (c.perfect ? "ok" : "no") + '">' +
          '<span class="tag">' + (c.perfect ? "✔" : "⚠") + "</span>" +
          (c.perfect ? T("compareOk") : tf("comparePart", { ok: c.ok, all: c.all })) +
          '<span class="rule">' + tf("compareDetail", { right: c.rightHTML, heard: c.heardHTML }) + "</span>" +
          (c.hints.length ? '<span class="rule">💡 ' + esc(c.hints.join("；")) + "</span>" : "") +
          '<span class="rule">' + T("compareTip") + "</span></div>" +
          (pr.judge ? '<div class="msg ai"><div class="who">AI</div><div class="txt">' + esc(pr.judge) + "</div></div>" : "") +
          '<div class="actions" style="justify-content:flex-start">' +
          '<button class="btn ghost small" data-act="ai-judge">叫 AI 評一評</button></div>';
      }
    }
    return out + '<p class="dim small">' + asrNote() + "</p>";
  }

  function chatHTML() {
    var sc = scenario();
    var head = '<div class="card"><h2>' + T("title") + "</h2>" +
      '<p class="dim small" style="margin-top:0">' + T("intro") + "</p>" +
      '<div class="actions" style="justify-content:flex-start">' +
      '<button class="btn ghost small" data-act="ai-lang" data-v="' + (lang() === "zh" ? "yue" : "zh") + '">' +
      (lang() === "zh" ? "🇭🇰 粵語界面" : "🀄 普通话界面") + "</button>" +
      (apiKey() ? '<button class="btn ghost small" data-act="ai-clear">' + T("clear") + "</button>" : "") +
      "</div></div>";

    if (!apiKey()) return head + setupHTML();
    if (!sc) return head + sceneHTML();

    var log = chat.msgs.map(bubbleHTML).join("");
    if (!log) log = bubbleHTML({ role: "assistant", content: "【粵】" + sc.opener.hk + "\n【拼】" + sc.opener.jy + "\n【普】" + sc.opener.zh + "\n【糾】—" });
    var busy = chat.busy ? '<div class="msg ai"><div class="who">' + T("aiLabel") + '</div><div class="txt dim">' + T("thinking") + "</div></div>" : "";
    var notice = chat.notice ? '<div class="fb no">' + esc(chat.notice) + "</div>" : "";

    return head +
      '<div class="card"><div class="chathead"><b>[' + esc(sc.name) + "]</b><span class=\"dim small\">" + esc(sc.tip) + "</span>" +
      '<div class="actions" style="justify-content:flex-start;margin:8px 0 0">' +
      '<button class="btn ghost small" data-act="ai-scene" data-v="">' + T("reScene") + "</button>" +
      '<button class="btn ghost small" data-act="ai-practice-open">' + T("practiceTitle") + "</button></div></div>" +
      '<div class="chat" id="aiLog">' + log + busy + "</div>" + notice +
      '<label class="fld"><textarea id="aiIn" rows="2" placeholder="' + T("inputPh") + '"></textarea></label>' +
      '<div class="actions" style="justify-content:flex-start">' +
      '<button class="btn" data-act="ai-send">' + T("send") + "</button>" +
      '<button class="btn ghost" data-act="ai-mic-chat">' + (chat.listening ? T("micStop") : T("mic")) + "</button></div>" +
      (chat.practice || chat.practiceOpen ? practiceHTML() : "") +
      "</div>";
  }

  /* ---------------- 12 題定級測試 ---------------- */
  function buildPlace() {
    var list = (A.place || []).slice();
    place.qs = list.map(function (p) {
      var q = { kind: p.kind, idx: p.idx, lv: p.lv, note: p.note, item: (POOL[p.kind] || [])[p.idx] };
      if (!q.item) return null;
      if (p.kind === "pair") {
        var first = Math.random() < 0.5;
        q.key = first ? "a" : "b";
        q.playChar = first ? q.item.a.hz : q.item.b.hz;
        q.playJy = first ? q.item.a.jy : q.item.b.jy;
        q.opts = [{ k: "a", hz: q.item.a.hz, jy: q.item.a.jy, gl: q.item.a.gl }, { k: "b", hz: q.item.b.hz, jy: q.item.b.jy, gl: q.item.b.gl }];
        if (!first) q.opts.reverse();
      } else if (p.kind === "tone") {
        q.opts = [1, 2, 3, 4, 5, 6].map(function (n) { return { k: String(n), hz: String(n), jy: "第 " + n + " 調" }; });
      } else if (p.kind === "usage" || p.kind === "oral") {
        q.opts = q.item.opts.slice();
        for (var i = q.opts.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = q.opts[i]; q.opts[i] = q.opts[j]; q.opts[j] = t; }
        q.opts = q.opts.map(function (o) { return { k: o, hz: o, jy: "" }; });
      }
      return q;
    }).filter(function (x) { return !!x; });
    place.max = place.qs.reduce(function (n, q) { return n + q.lv; }, 0);
  }
  function startPlacement() {
    if (!A.place || !A.place.length || !ctx || !root) return;
    buildPlace();
    place.on = true; place.i = 0; place.ok = 0; place.earned = 0; place.done = false; place.lv = 0; place.ratio = 0;
    paint();
    var q = place.qs[0];
    if (q && (q.kind === "tone" || q.kind === "pair")) setTimeout(function () { ctx.speak(q.kind === "pair" ? q.playChar : q.item.hz); }, 250);
  }
  function placeHead() {
    var n = place.qs.length;
    return '<div class="qhead"><span>' + tf("levelProgress", { i: Math.min(place.i + 1, n), n: n }) + "</span>" +
      '<span>✔ ' + place.ok + "</span></div>" +
      '<div class="bar"><i style="width:' + Math.round((place.i / n) * 100) + '%"></i></div>';
  }
  function placeQHTML(q) {
    var head = placeHead();
    if (q.kind === "tone") {
      return '<div class="card">' + head +
        '<div class="prompt"><div class="asklbl">聽發音，判斷黃色音節係第幾調</div><div class="hz">' + q.item.hz + "</div>" +
        '<div class="jy">' + q.item.jy + "</div></div>" +
        '<div class="actions"><button class="btn ghost small" data-act="play" data-text="' + esc(q.item.hz) + '">🔊 再聽一次</button></div>' +
        '<div class="opts six">' + q.opts.map(function (o) { return '<button class="opt" data-act="ai-opt" data-v="' + o.k + '">' + o.hz + "</button>"; }).join("") + "</div>" +
        '<div id="fb"></div></div>';
    }
    if (q.kind === "pair") {
      return '<div class="card">' + head +
        '<div class="prompt"><div class="asklbl">聽發音，選出你聽到嘅係邊個</div><div class="hz">🎧</div></div>' +
        '<div class="actions"><button class="btn ghost small" data-act="play" data-text="' + esc(q.playChar) + '">🔊 再聽一次</button></div>' +
        '<div class="opts">' + q.opts.map(function (o) {
          return '<button class="opt" data-act="ai-opt" data-v="' + o.k + '">' + o.hz + '<span class="l2">' + esc(o.jy) + " · " + esc(o.gl) + "</span></button>";
        }).join("") + "</div><div id='fb'></div></div>";
    }
    if (q.kind === "usage" || q.kind === "oral") {
      return '<div class="card">' + head +
        '<div class="prompt"><div class="asklbl">選出正確答案</div><div class="zh">' + esc(q.item.q) + "</div></div>" +
        '<div class="opts one-col">' + q.opts.map(function (o) {
          return '<button class="opt" data-act="ai-opt" data-v="' + esc(o.k) + '">' + esc(o.hz) + "</button>";
        }).join("") + "</div><div id='fb'></div></div>";
    }
    /* 自評型：word / drill / shadow / role */
    var it = q.item, cue = "";
    if (q.kind === "word") cue = '<div class="asklbl">[' + esc(it.cat) + "] 普通話 → 粵語，先出聲講一次</div><div class=\"zh\">" + esc(it.cn) + "</div>";
    else if (q.kind === "drill") cue = '<div class="asklbl">[' + esc(it.scene) + "] 先出聲講一次</div><div class=\"zh\">" + esc(it.zh) + "</div>";
    else if (q.kind === "shadow") cue = '<div class="asklbl">聽一句，跟住大聲講一次</div><div class="zh">' + esc(it.hk) + '</div><div class="jy">' + esc(it.jy) + "</div>";
    else cue = (it.prevHk ? '<div class="asklbl">[' + esc(it.d) + "] 對方講：</div><div class=\"hz\">" + esc(it.prevHk) + '</div><div class="jy">' + esc(it.prevJy) + "</div>" : "") +
      '<div class="asklbl" style="margin-top:10px">輪到你（意思：' + esc(it.zh) + "）</div>";
    return '<div class="card">' + head + '<div class="prompt">' + cue + "</div>" +
      '<p class="dim small">' + T("spokenPractice") + "</p>" +
      '<div class="actions">' + (q.kind === "shadow" ? '<button class="btn ghost small" data-act="play" data-text="' + esc(it.hk) + '">🔊 聽範例</button>' : "") +
      '<button class="btn" id="btnReveal" data-act="ai-reveal">' + T("reveal") + "</button></div>" +
      '<div id="fb"></div></div>';
  }
  function placeHTML() {
    if (place.done) return placeResultHTML();
    if (place.i >= place.qs.length) return placeResultHTML();
    var q = place.qs[place.i];
    var head = '<div class="card"><h2>' + T("levelTitle") + "</h2>" +
      '<p class="dim small" style="margin-top:0">' + T("levelIntro") + "</p>" +
      '<div class="actions" style="justify-content:flex-start">' +
      '<button class="btn ghost small" data-act="ai-place-quit">' + T("levelSkip") + "</button></div></div>";
    return head + placeQHTML(q);
  }
  function placeAnswer(val) {
    var q = place.qs[place.i];
    if (!q || q.done) return;
    q.done = true;
    var ok = false, fb = "";
    if (q.kind === "tone") {
      ok = Number(val) === q.item.ans;
      var t = (D.toneTable || [])[q.item.ans - 1] || {};
      var pos = q.item.jy.split(" ")[q.item.target];
      fb = '<div class="fb ' + (ok ? "ok" : "no") + '"><span class="tag">' + (ok ? "✔ 對" : "✘ 錯") + "</span>" +
        esc(pos) + " = 第 <b>" + t.n + "</b> 調 · " + esc(t.name) + " · " + esc(t.contour) + "</div>";
    } else if (q.kind === "pair") {
      ok = val === q.key;
      fb = '<div class="fb ' + (ok ? "ok" : "no") + '"><span class="tag">' + (ok ? "✔ 對" : "✘ 錯") + "</span>" +
        "正確係 <b>" + esc(q.playChar) + "</b> " + esc(q.playJy) + '<span class="rule"><b>' + esc(q.item.cat) + "</b> — " + esc(q.item.tip) + "</span></div>";
    } else {
      ok = val === q.item.ans;
      fb = '<div class="fb ' + (ok ? "ok" : "no") + '"><span class="tag">' + (ok ? "✔ 對" : "✘ 錯") + "</span>正確答案：<b>" +
        esc(q.item.ans) + '</b><span class="rule">' + esc(q.item.why || "") + "</span></div>";
    }
    if (ok) { place.ok++; place.earned += q.lv; }
    fb += '<div class="actions"><button class="btn" data-act="ai-next">' + T("next") + "</button></div>";
    if (q.kind === "tone" || q.kind === "pair") {
      var opts = root.querySelectorAll(".opt"), tg = q.kind === "tone" ? String(q.item.ans) : q.key, i;
      for (i = 0; i < opts.length; i++) {
        var ov = opts[i].getAttribute("data-v");
        if (ov === String(val) && !ok) opts[i].classList.add("wrong");
        if (ov === tg) opts[i].classList.add("right");
      }
    } else {
      var os2 = root.querySelectorAll(".opt"), j;
      for (j = 0; j < os2.length; j++) {
        var v2 = os2[j].getAttribute("data-v");
        if (v2 === String(val) && !ok) os2[j].classList.add("wrong");
        if (v2 === q.item.ans) os2[j].classList.add("right");
      }
    }
    var fbEl = document.getElementById("fb");
    if (fbEl) fbEl.innerHTML = fb;
  }
  function placeReveal() {
    var q = place.qs[place.i];
    if (!q || q.revealed) return;
    q.revealed = true;
    var it = q.item;
    var big = (q.kind === "shadow" || q.kind === "role") ? it.hk : (q.kind === "word" ? it.hk : it.hz);
    var sub = (q.kind === "shadow" || q.kind === "role" || q.kind === "word") ? it.hk : it.hz;
    var extra = q.kind === "word" ? '<div class="dim small">' + esc(it.cn) + "</div>"
      : q.kind === "drill" ? '<div class="dim small">' + esc(it.zh) + "</div>"
        : q.kind === "shadow" ? '<div class="dim small">' + esc(it.zh) + "</div>"
          : '<div class="dim small">情境：' + esc(it.d) + "　你的意思：" + esc(it.zh) + "</div>";
    var tail = (q.kind === "word" || q.kind === "drill") ? '<div class="dim">' + esc(it.note || "") + "</div>"
      : (it.tip ? '<div class="rule">港味點：' + esc(it.tip) + "</div>" : "");
    document.getElementById("fb").innerHTML = '<div class="fb ok" style="background:var(--panel2);border-color:var(--line)">' +
      '<div style="font-size:22px;font-weight:600">' + esc(big) + "</div>" +
      '<div style="color:var(--jade);font-size:15px;margin:4px 0 8px">' + esc(it.jy) + "</div>" +
      extra + tail + "</div>" +
      '<div class="actions"><button class="btn ghost small" data-act="play" data-text="' + esc(big) + '">🔊 聽一次跟讀</button></div>' +
      '<div class="actions" style="flex-direction:column">' +
      '<button class="btn" data-act="ai-self" data-v="1">' + T("iGotIt") + "</button>" +
      '<button class="btn ghost" data-act="ai-self" data-v="0">' + T("iMissed") + "</button></div>" +
      '<div id="sub"></div>';
    ctx.speak(sub);
  }
  function placeSelf(ok) {
    var q = place.qs[place.i];
    if (!q || q.graded) return;
    q.graded = true;
    if (ok) { place.ok++; place.earned += q.lv; }
    var el = document.getElementById("sub");
    var fb = '<div class="fb ' + (ok ? "ok" : "no") + '"><span class="tag">已記錄</span>' +
      (ok ? "計入本題分數。" : "唔計分——呢題正好係你要練嘅。") + "</div>" +
      '<div class="actions"><button class="btn" data-act="ai-next">' + T("next") + "</button></div>";
    if (el) el.innerHTML = fb;
  }
  function placeNext() {
    place.i++;
    if (place.i >= place.qs.length) { finishPlacement(); return; }
    paint();
    var q = place.qs[place.i];
    if (q && (q.kind === "tone" || q.kind === "pair")) setTimeout(function () { ctx.speak(q.kind === "pair" ? q.playChar : q.item.hz); }, 200);
  }
  function levelOf(ratio) {
    var cuts = A.levelCuts || [0.35, 0.5, 0.65, 0.78, 0.9];
    for (var i = 0; i < cuts.length; i++) if (ratio < cuts[i]) return i + 1;
    return cuts.length + 1;
  }
  function finishPlacement() {
    place.done = true;
    var n = place.qs.length || 1;
    var ratio = place.max ? place.earned / place.max : 0;
    place.ratio = ratio;
    place.lv = levelOf(ratio);
    var s = S();
    s.level = place.lv;
    s.placeDone = true;
    s.placeScore = { ok: place.ok, n: n, ratio: Math.round(ratio * 100), at: Date.now() };
    save();
    paint();
  }
  function placeResultHTML() {
    var arr = A.levels || [];
    var info = arr[place.lv - 1] || arr[1] || { title: "L?", desc: "", advice: "" };
    var ratio = Math.round(place.ratio * 100);
    return '<div class="card"><h2>' + tf("levelResult", { lv: info.title }) + "</h2>" +
      '<p class="small">' + tf("levelDone", { ok: place.ok, ratio: ratio }) + "</p>" +
      '<p class="small">' + esc(info.desc) + "</p>" +
      '<p class="small" style="color:var(--amber)">' + esc(info.advice) + "</p>" +
      '<div class="actions" style="justify-content:flex-start">' +
      '<button class="btn" data-act="start" data-kind="mixed" data-n="12">' + T("levelGo") + "</button>" +
      '<button class="btn ghost" data-act="ai-place">' + T("retest") + "</button>" +
      '<button class="btn ghost" data-act="go" data-v="ai">' + T("title") + "</button></div></div>" +
      '<div class="card"><h3>點解係呢個級</h3><p class="dim small" style="margin:0">12 題由易到難，每題按難度加權（' +
      place.max + " 分滿分，你攞到 " + place.earned + " 分）。錯得越多嘅部分，混合局之後配得越重。</p></div>";
  }

  /* ---------------- 首次進入：問要唔要定級 ---------------- */
  function maybeAskPlacement(passedCtx) {
    if (!ctx && passedCtx) ctx = passedCtx;
    if (!ctx) return;
    var s = S();
    if (s.placeAsked || s.placeDone) return;
    /* smoke 测试的 DOM 桩没有 body / createElement，直接跳过（不能报错） */
    if (!document.body || !document.createElement || !document.body.appendChild) return;
    if (document.getElementById("placeAsk")) return;
    var box = document.createElement("div");
    box.id = "placeAsk";
    box.className = "overlay";
    box.innerHTML = '<div class="sheet"><h3>' + T("levelTitle") + "</h3>" +
      '<p class="small">' + T("levelIntro") + "</p>" +
      '<div class="actions" style="flex-direction:column">' +
      '<button class="btn big" data-act="ai-place">' + T("levelStart") + "</button>" +
      '<button class="btn ghost" data-act="ai-place-later">' + T("levelSkip") + "</button></div></div>";
    document.body.appendChild(box);
    box.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]");
      if (!b) return;
      var act = b.getAttribute("data-act");
      s.placeAsked = true;
      save();
      box.parentNode.removeChild(box);
      if (box.parentNode && box.parentNode.removeChild) box.parentNode.removeChild(box);
      if (act === "ai-place") { if (ctx.go) ctx.go("ai"); startPlacement(); }
      else paint();
    });
  }

  /* ---------------- 事件 ---------------- */
  function sendText(text) {
    var t = String(text || "").trim();
    if (!t || chat.busy) return;
    chat.msgs.push({ role: "user", content: t });
    chat.busy = true; chat.notice = "";
    paint();
    var log = document.getElementById("aiLog");
    if (log) log.scrollTop = log.scrollHeight;
    ask(history()).then(function (content) {
      chat.busy = false;
      chat.msgs.push({ role: "assistant", content: content, parsed: parseReply(content) });
      var s = S();
      s.aiStats = s.aiStats || { turns: 0 };
      s.aiStats.turns++;
      save();
      paint();
      var lg = document.getElementById("aiLog");
      if (lg) lg.scrollTop = lg.scrollHeight;
    }).catch(function (err) {
      chat.busy = false;
      chat.notice = errText(err);
      paint();
    });
  }

  function genLine() {
    var sc = scenario() || { name: "日常對話" };
    var p = A.prompts || {};
    var msg = String(p.genLine || "").split("{sceneName}").join(sc.name).split("{level}").join(lvTitle());
    if (lang() === "zh") msg += "\n" + (p.judgeZh || "");
    chat.busy = true; chat.notice = "";
    paint();
    ask([{ role: "user", content: msg }]).then(function (content) {
      chat.busy = false;
      var pr = parseReply(content);
      chat.practice = { hk: pr.hk, jy: pr.jy, zh: pr.zh, cmp: null, judge: "" };
      paint();
    }).catch(function (err) {
      chat.busy = false;
      chat.notice = errText(err);
      paint();
    });
  }
  function judgePron() {
    var pr = chat.practice;
    if (!pr || !pr.cmp || pr.cmp.none) return;
    var p = A.prompts || {};
    var msg = String(p.pronJudge || "")
      .split("{target}").join(pr.hk)
      .split("{jy}").join(pr.jy || "")
      .split("{heard}").join(pr.heard || "");
    if (lang() === "zh") msg += "\n" + (p.judgeZh || "");
    chat.busy = true;
    paint();
    ask([{ role: "user", content: msg }]).then(function (content) {
      chat.busy = false;
      pr.judge = content.replace(/【[^】]*】/g, " ").trim();
      paint();
    }).catch(function (err) {
      chat.busy = false;
      chat.notice = errText(err);
      paint();
    });
  }
  function readTarget() {
    var pr = chat.practice;
    if (!pr) return;
    startASR(function (txt) {
      pr.heard = txt;
      pr.cmp = compare(pr, txt);
      paint();
    });
  }

  function onClick(e) {
    var b = e.target.closest("[data-act]");
    if (!b || !root || !root.contains(b)) return;
    var act = b.getAttribute("data-act"), v = b.getAttribute("data-v"), s = S();
    if (act === "ai-save") {
      var ki = document.getElementById("aiKey"), mi = document.getElementById("aiModel");
      s.settings.apiKey = ki ? ki.value.trim() : "";
      s.settings.apiModel = (mi && mi.value.trim()) || "deepseek-chat";
      save();
      if (s.settings.apiKey) { chat.notice = T("saved"); }
      paint();
    } else if (act === "ai-lang") { s.aiLang = v; save(); ctx.render(); }
    else if (act === "ai-scene") { chat.scene = v || null; chat.msgs = []; chat.practice = null; paint(); }
    else if (act === "ai-send") { var ta = document.getElementById("aiIn"); sendText(ta ? ta.value : ""); }
    else if (act === "ai-mic-chat") {
      if (chat.rec) { try { chat.rec.stop(); } catch (e3) {} return; }
      startASR(function (txt) { sendText(txt); });
    }
    else if (act === "ai-practice" || act === "ai-practice-open") { chat.practiceOpen = true; genLine(); }
    else if (act === "ai-mic-read") { readTarget(); }
    else if (act === "ai-judge") { judgePron(); }
    else if (act === "ai-clear") { chat.msgs = []; paint(); }
    else if (act === "ai-opt") { placeAnswer(v); }
    else if (act === "ai-reveal") { placeReveal(); }
    else if (act === "ai-self") { placeSelf(v === "1"); }
    else if (act === "ai-next") { placeNext(); }
    else if (act === "ai-place") { startPlacement(); }
    else if (act === "ai-place-quit") { place.on = false; place.done = false; paint(); }
  }

  function onKey(e) {
    if (!root || !root.contains(e.target)) return;
    if (e.target.id === "aiIn" && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendText(e.target.value);
    }
  }

  /* ---------------- 对外 ---------------- */
  var bound = false;
  window.CANTO_AI = {
    mount: function (el, c) {
      ctx = c; root = el;
      if (!bound) {
        bound = true;
        document.addEventListener("keydown", onKey);
      }
      if (!el.__aiBound) { el.__aiBound = true; el.addEventListener("click", onClick); }
      chat.practiceOpen = false;
      /* 定級測完之後再入嚟呢一頁，應該見到對話（唔係重複睇結果頁） */
      if (place.done) place.on = false;
      paint();
    },
    startPlacement: startPlacement,
    maybeAskPlacement: maybeAskPlacement,
    isPlacement: function () { return place.on; },
    /* 供进度页显示 */
    stats: function () {
      var s = S();
      return { turns: (s.aiStats && s.aiStats.turns) || 0, level: s.level || 0, placeDone: !!s.placeDone };
    },
    _test: { parseReply: parseReply, compare: compare, diffChars: diffChars, levelOf: levelOf, buildPlace: buildPlace }
  };
})();
