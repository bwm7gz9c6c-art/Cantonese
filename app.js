/* ============================================================
   粵語升級器 · 应用层
   纯 vanilla JS，无依赖、无构建，可 file:// 直接双击打开
   ============================================================ */
(function () {
  "use strict";

  /* ---- 開機自診斷：唔好再交白卷 ---- */
  function bootFail(msg) {
    try {
      var v = document.getElementById("view") || document.body;
      v.innerHTML = '<div class="card"><h3>呢一頁載入唔齊，所以空白</h3>' +
        '<p class="sub">' + String(msg || "") + "</p>" +
        '<p class="sub">多數係手機用咗舊緩存，或者上傳中途斷咗。做法：① 喺手機清一次呢個網站嘅資料／開無痕視窗再入；' +
        "② 仍然唔得，就重新上傳 data.js、app.js、game.js、gameui.js、index.html、style.css 六個檔，再強制刷新。</p></div>";
    } catch (e) {}
  }
  window.onerror = function (m, src, ln) {
    bootFail("JavaScript 出錯：" + m + (src ? "（" + String(src).split("/").pop() + " 第 " + ln + " 行）" : ""));
    return false;
  };
  /* 某個模組炸咗都唔好交白卷：上面出警告，下面照樣出自由練習頁，起碼用得返 */
  function bizFallback(v, msg) {
    try {
      v.innerHTML = '<div class="card"><p class="sub"><b>呢一頁出咗事</b>：' + String(msg) +
        "。你仍然可以用下面嘅自由練習；想修好，清一次網站資料或者重新上傳六個檔再刷新。</p></div>" + freeHTML();
    } catch (e2) { bootFail(msg); }
  }
  /* 逐個檔案點名：lexicon.js / speak.js / ai.js 都係掛喺 CANTO_DATA 之下，
     aiui.js 才出 CANTO_AI，所以唔可以只靠 window.CANTO_XXX 命名習慣 */
  var NEED = [
    ["data.js", function () { return window.CANTO_DATA && window.CANTO_DATA.toneQuiz; }],
    ["lexicon.js", function () { return window.CANTO_DATA && window.CANTO_DATA.lexicon; }],
    ["speak.js", function () { return window.CANTO_DATA && window.CANTO_DATA.speak; }],
    ["sound.js", function () { return window.CANTO_SFX; }],
    ["game.js", function () { return window.CANTO_GAME; }],
    ["gameui.js", function () { return window.CANTO_GAMEUI; }],
    ["ai.js", function () { return window.CANTO_DATA && window.CANTO_DATA.ai; }],
    ["aiui.js", function () { return window.CANTO_AI; }]
  ];
  var MISSING = [], mi;
  for (mi = 0; mi < NEED.length; mi++) {
    try { if (!NEED[mi][1]()) MISSING.push(NEED[mi][0]); }
    catch (e) { MISSING.push(NEED[mi][0]); }
  }
  if (MISSING.length) {
    bootFail("呢幾個檔案冇載入成功：" + MISSING.join("、") + "。");
    return;
  }

  var D = window.CANTO_DATA;
  var KEY = "cantodrill.v1";

  var SP = D.speak || { oralQuiz: [], shadow: [], roleTurns: [], particles: [], tips: [], dialogues: [] };
  var G = window.CANTO_GAME || null;            /* 遊戲層內容：段位／關卡／Boss */
  var GC = window.CANTO_GAMEUI || null;         /* 遊戲層 UI */
  var SFX = window.CANTO_SFX || null;           /* 音效層（WebAudio 合成） */
  /* ⓪ 粵拼入門：8 節小測攤平成一個題池（kind "jy"），每題記住自己屬邊一節 */
  var JYQ = (function () {
    var out = [], c = D.jyCourse || [], li, ci, L, q;
    for (li = 0; li < c.length; li++) {
      L = c[li];
      for (ci = 0; ci < (L.checks || []).length; ci++) {
        q = L.checks[ci];
        out.push({
          lesson: li, lessonId: L.id, lessonName: L.name,
          q: q.q, opts: q.opts, ans: q.opts[q.a], why: q.why
        });
      }
    }
    return out;
  })();
  var IDX = {
    tone: D.toneQuiz, pair: D.pairs, drill: D.drill, usage: D.usageQuiz, word: (D.lexicon ? D.lexicon.rows : []),
    oral: SP.oralQuiz, shadow: SP.shadow, role: SP.roleTurns, jy: JYQ
  };
  var LABEL = {
    tone: "聲調", pair: "音素", drill: "主動提取", usage: "語用", word: "詞彙",
    oral: "口語", shadow: "跟讀", role: "對話", jy: "粵拼"
  };
  var SCENES = ["全部", "職場", "茶餐廳", "出行", "社交"];
  var LCATS = (D.lexicon ? D.lexicon.cats : []);
  var SPEAKTABS = [["shadow", "跟讀句"], ["oral", "語氣詞・替換"], ["role", "情境對話"], ["particle", "語氣詞表"], ["tip", "港味習慣"]];

  /* ---------------- 进度存储 ---------------- */
  function blank() {
    return {
      stats: {}, items: {}, wrong: [], days: {},
      settings: {
        voiceURI: "", rate: 0.8, len: 12, autoSpeak: true, sfx: true,
        apiKey: "", apiBase: "https://api.deepseek.com", apiModel: "deepseek-chat", asrLang: "yue-Hant-HK"
      },
      lexTab: "words", speakTab: "shadow",
      aiLang: "yue", level: 0, placeDone: false, placeAsked: false, placeScore: null, aiStats: { turns: 0 },
      game: { passed: {}, bosses: {}, albumCat: "全部" }
    };
  }
  var S = (function () {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var o = JSON.parse(raw), b = blank(), k;
        for (k in b) if (!(k in o)) o[k] = b[k];
        for (k in b.settings) if (!(k in o.settings)) o.settings[k] = b.settings[k];
        return o;
      }
    } catch (e) {}
    return blank();
  })();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  function dkey(d) {
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  function todayKey() { return dkey(new Date()); }
  function streak() {
    var n = 0, d = new Date();
    while (n < 400 && S.days[dkey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  /* ---------------- 语音 ---------------- */
  var voices = [];
  function loadVoices() {
    if (!("speechSynthesis" in window)) { paintVoiceUI(); return; }
    voices = window.speechSynthesis.getVoices() || [];
    paintVoiceUI();
  }
  function rank(v) {
    var s = 0, l = (v.lang || "").toLowerCase(), n = v.name || "";
    if (l === "zh-hk" || l.indexOf("yue") === 0) s += 100;
    if (/粤|粵|Cantonese|Hong Kong|Tracy|Danny|Sinji|WanLung|Hiuga/.test(n)) s += 50;
    if (l.indexOf("zh") === 0) s += 10;
    if (v.localService) s += 3;
    return s;
  }
  function cands() { return voices.slice().sort(function (a, b) { return rank(b) - rank(a); }); }
  function currentVoice() {
    if (!voices.length) return null;
    if (S.settings.voiceURI) {
      for (var i = 0; i < voices.length; i++) if (voices[i].voiceURI === S.settings.voiceURI) return voices[i];
    }
    var best = cands()[0];
    return best && rank(best) >= 50 ? best : null;
  }
  function speak(text) {
    if (!text || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      var v = currentVoice();
      if (v) u.voice = v;
      u.lang = v ? v.lang : "zh-HK";
      u.rate = Number(S.settings.rate) || 0.8;
      u.pitch = 1;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  function paintVoiceUI() {
    var chip = $("voiceChip"), warn = $("voiceWarn");
    if (!chip) return;
    if (!("speechSynthesis" in window)) {
      chip.textContent = "瀏覽器不支援語音";
      chip.className = "chip off";
      warn.textContent = "这个浏览器不支持 Web Speech API，本 App 只显示文字与粤拼。换 Edge 或 Chrome 即可。";
      warn.classList.remove("hidden");
      return;
    }
    var v = currentVoice();
    if (v) {
      chip.textContent = (v.name.split(" - ")[0] || v.name);
      chip.className = "chip on";
      warn.classList.add("hidden");
    } else {
      chip.textContent = "未檢測到粵語語音";
      chip.className = "chip off";
      warn.innerHTML = "<b>没有检测到粤语（zh-HK）语音</b>，题目不会发声。装法：Windows 设置 → 时间和语言 → 语言和区域 → 添加「中文(繁体，香港特别行政区)」→ 语言选项 → 语音 → 安装，然后刷新本页。详见右上角 設定。";
      warn.classList.remove("hidden");
    }
    var sel = $("voiceSel");
    if (sel) {
      sel.innerHTML = '<option value="">（自动选最优）</option>' + cands().map(function (x) {
        return '<option value="' + x.voiceURI + '"' + (x.voiceURI === S.settings.voiceURI ? " selected" : "") + ">" +
          esc(x.name) + " · " + esc(x.lang) + "</option>";
      }).join("");
    }
  }
  function contourSVG(shape) {
    var P = { "high-flat": [5, 5], "high-rise": [3, 5], "mid-flat": [3, 3], "low-fall": [2, 1], "low-rise": [1, 3], "low-flat": [2, 2] }[shape] || [3, 3];
    var y = function (p) { return (30 - p * 5.2).toFixed(1); };
    return '<svg viewBox="0 0 66 32" width="66" height="30"><line x1="4" y1="' + y(P[0]) + '" x2="62" y2="' + y(P[1]) +
      '" stroke="#2fc08b" stroke-width="3.5" stroke-linecap="round"/></svg>';
  }

  /* ---------------- 抽样（轻度间隔重复） ---------------- */
  function idOf(kind, i) { return kind + ":" + i; }
  function weightOf(id) {
    var it = S.items[id];
    if (!it) return 2.2;
    return Math.max(0.35, 1 + (it.bad || 0) * 2.5 - Math.min(it.ok || 0, 3) * 0.4);
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function weightedSample(kind, arr, n, filter) {
    var pool = [], i;
    for (i = 0; i < arr.length; i++) {
      if (filter && !filter(arr[i])) continue;
      pool.push({ i: i, x: arr[i], w: weightOf(idOf(kind, i)) });
    }
    var out = [];
    while (out.length < n && pool.length) {
      var total = 0, j;
      for (j = 0; j < pool.length; j++) total += pool[j].w;
      var r = Math.random() * total, k = 0;
      for (k = 0; k < pool.length - 1; k++) { r -= pool[k].w; if (r <= 0) break; }
      out.push(pool.splice(k, 1)[0]);
    }
    return out;
  }

  /* ---------------- 题目构造 ---------------- */
  function makeQ(kind, entry) {
    var item = entry.x, idx = entry.i;
    if (kind === "tone") return { kind: "tone", idx: idx, item: item };
    if (kind === "usage") return { kind: "usage", idx: idx, item: item, opts: shuffle(item.opts) };
    if (kind === "oral") return { kind: "oral", idx: idx, item: item, opts: shuffle(item.opts) };
    if (kind === "drill") return { kind: "drill", idx: idx, item: item };
    if (kind === "word") return { kind: "word", idx: idx, item: item };
    if (kind === "shadow") return { kind: "shadow", idx: idx, item: item };
    if (kind === "role") return { kind: "role", idx: idx, item: item };
    if (kind === "jy") return { kind: "jy", idx: idx, item: item, opts: shuffle(item.opts) };
    var aFirst = Math.random() < 0.5;
    var play = aFirst ? item.a : item.b;
    var list = aFirst
      ? [{ key: "a", hz: item.a.hz, jy: item.a.jy, gl: item.a.gl }, { key: "b", hz: item.b.hz, jy: item.b.jy, gl: item.b.gl }]
      : [{ key: "b", hz: item.b.hz, jy: item.b.jy, gl: item.b.gl }, { key: "a", hz: item.a.hz, jy: item.a.jy, gl: item.a.gl }];
    return { kind: "pair", idx: idx, item: item, key: aFirst ? "a" : "b", playChar: play.hz, playJy: play.jy, opts: list };
  }
  function sample(kind, arr, n, filter) {
    return weightedSample(kind, arr, n, filter).map(function (e) { return makeQ(kind, e); });
  }
  function mixedPlan() {
    var lv = Number(S.level) || 2, arr = (D.ai && D.ai.levels) || [], info = arr[lv - 1];
    return (info && info.plan) ? info.plan
      : [["tone", 0.30], ["pair", 0.15], ["drill", 0.15], ["word", 0.15], ["usage", 0.08], ["oral", 0.07], ["shadow", 0.10]];
  }
  function levelTitle() {
    var lv = Number(S.level) || 0, arr = (D.ai && D.ai.levels) || [], info = arr[lv - 1];
    return info ? info.title : "L2 · 識聽唔識講";
  }
  function levelLine() {
    var sc = S.placeScore;
    if (S.level && sc) return "你上次測到 " + levelTitle() + "（加權 " + sc.ratio + "%）。";
    return "未測過：做完按你嘅級數配題。";
  }
  function buildMixed(n) {
    var plan = mixedPlan(), out = [];
    plan.forEach(function (p) {
      out = out.concat(sample(p[0], IDX[p[0]], Math.max(1, Math.round(n * p[1]))));
    });
    return shuffle(out).slice(0, n);
  }
  function build(kind, n) {
    if (kind === "mixed") return buildMixed(n);
    if (kind === "drill") return sample("drill", IDX.drill, n, function (x) { return drillScene === "全部" || x.scene === drillScene; });
    if (kind === "word") return sample("word", IDX.word, n, function (x) { return wordCat === "全部" || x.cat === wordCat; });
    if (kind === "shadow") return sample("shadow", IDX.shadow, n, function (x) { return speakScene === "全部" || x.scene === speakScene; });
    return sample(kind, IDX[kind], n);
  }

  /* ---------------- 记录 ---------------- */
  function record(kind, idx, ok) {
    var id = idOf(kind, idx);
    var st = S.stats[kind] || (S.stats[kind] = { seen: 0, ok: 0 });
    st.seen++; if (ok) st.ok++;
    var it = S.items[id] || (S.items[id] = { seen: 0, ok: 0, bad: 0 });
    it.seen++; it.last = Date.now();
    if (ok) {
      it.ok++;
      var p = S.wrong.indexOf(id);
      if (p >= 0) S.wrong.splice(p, 1);
    } else {
      it.bad++;
      if (S.wrong.indexOf(id) < 0) S.wrong.push(id);
    }
    var t = todayKey();
    S.days[t] = (S.days[t] || 0) + 1;
    save();
    paintFoot();
  }
  function paintFoot() {
    var f = $("footStat");
    if (f) f.textContent = "今日 " + (S.days[todayKey()] || 0) + " 題 · 連續 " + streak() + " 天 · 錯題本 " + S.wrong.length + " 條";
  }

  /* ---------------- 状态 ---------------- */
  var sess = null, route = "home", pairMode = "listen", drillScene = "全部", lexCat = "全部", wordCat = "全部", speakScene = "全部";
  var lessonOpen = null, refOpen = false;

  function start(kind, n) {
    n = n || Number(S.settings.len) || 12;
    sess = { kind: kind, qs: build(kind, n), i: 0, ok: 0, bad: 0 };
    render();
  }
  function go(r) {
    route = r; sess = null; render();
    var bs = document.querySelectorAll("#tabs button"), i, tgt = (r === "lesson" || r === "album") ? "home" : r;
    for (i = 0; i < bs.length; i++) bs[i].classList.toggle("active", bs[i].getAttribute("data-route") === tgt);
    window.scrollTo(0, 0);
  }

  /* ---------------- 工具 ---------------- */
  function $(id) { return document.getElementById(id); }
  function view() { return $("view"); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function md(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>"); }

  /* ---------------- AI 面板注入 + 界面语言（普通话模式） ---------------- */
  var SIMP = (D.ai && D.ai.simp) || {};
  var AICTX = {
    getS: function () { return S; },
    save: save,
    speak: speak,
    esc: esc,
    render: render,
    go: go,
    start: start
  };
  function simpText(s) {
    var out = "", i, c;
    for (i = 0; i < s.length; i++) { c = s.charAt(i); out += (SIMP[c] || c); }
    return out;
  }
  function localize() {
    if (S.aiLang !== "zh" || !document.createTreeWalker) return;
    var roots = [$("view"), $("tabs")], i;
    for (i = 0; i < roots.length; i++) {
      var r = roots[i];
      if (!r) continue;
      var w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT, null), n;
      while ((n = w.nextNode())) {
        var p = n.parentNode, cls = (p && p.className) ? String(p.className) : "";
        if (/(^|\s)(hz|jy|cn|zh)(\s|$)/.test(cls)) continue;   // 粤语例句/拼音/词条不动
        var t = simpText(n.nodeValue);
        if (t !== n.nodeValue) n.nodeValue = t;
      }
    }
  }

  /* ---------------- 路由渲染 ---------------- */
  function render() {
    if (sess) { renderQuiz(); paintFoot(); return; }
    var v = view();
    if (route === "home") {
      v.innerHTML = '<div id="gameroot"></div>';
      if (GC) { try { GC.mount($("gameroot"), GCTX); } catch (e) { bizFallback(v, "關卡地圖出錯：" + ((e && e.message) || e)); } }
      else v.innerHTML = freeHTML();
    }
    else if (route === "album") {
      v.innerHTML = '<div id="gameroot"></div>';
      if (GC) { try { GC.album($("gameroot"), GCTX); } catch (e) { bizFallback(v, "詞卡冊出錯：" + ((e && e.message) || e)); } }
      else v.innerHTML = freeHTML();
    }
    else if (route === "free") v.innerHTML = freeHTML();
    else if (route === "lesson") v.innerHTML = lessonHTML();
    else if (route === "tone") v.innerHTML = toneIntroHTML();
    else if (route === "pair") v.innerHTML = pairIntroHTML();
    else if (route === "drill") v.innerHTML = drillIntroHTML();
    else if (route === "lex") v.innerHTML = lexHTML();
    else if (route === "speak") v.innerHTML = speakIntroHTML();
    else if (route === "ai") {
      v.innerHTML = '<div id="airoot"></div>';
      if (window.CANTO_AI) window.CANTO_AI.mount($("airoot"), AICTX);
    }
    else if (route === "progress") v.innerHTML = progressHTML();
    localize();
    paintFoot();
  }

  /* ---------------- 遊戲層 ctx（交給 gameui.js） ---------------- */
  var GCTX = {
    getS: function () { return S; },
    save: save,
    esc: esc,
    speak: speak,
    go: go,
    render: render,
    startLevel: startLevel,
    placement: function () { if (window.CANTO_AI) { go("ai"); window.CANTO_AI.startPlacement(); } },
    ai: function () { go("ai"); }
  };

  /* ---------------- ⓪ 粵拼入門（教學頁 ＋ 全站速查表） ---------------- */
  /* 例字要發音時，只讀漢字部分：去掉「 → 」後半同括號註解 */
  function sayText(s) { return String(s == null ? "" : s).split(" → ")[0].replace(/（[^）]*）/g, "").trim(); }

  function lessonHTML() {
    var c = D.jyCourse || [];
    if (!lessonOpen) return freeHTML();
    var L = c[lessonOpen.teach];
    if (!L) return freeHTML();
    var h = '<div class="card lead lesson"><div class="lhead"><span class="lnum">⓪ 粵拼入門</span>' +
      '<h1 class="lname">' + esc(L.name) + "</h1>" +
      '<div class="lsub dim">第 ' + (lessonOpen.teach + 1) + "／" + c.length + " 節 · " + esc(L.sub) + " · 約 " + L.mins + " 分鐘</div></div>";
    (L.blocks || []).forEach(function (b) {
      h += '<div class="lblock"><h4>' + esc(b.h) + "</h4><p>" + esc(b.p) + "</p>";
      if (b.eg && b.eg.length) {
        h += '<div class="legs">' + b.eg.map(function (g) {
          return '<button class="leg" data-act="play" data-text="' + esc(sayText(g.hz)) + '">' +
            '<span class="hz">' + esc(g.hz) + '</span><span class="jy">' + esc(g.jy) + "</span>" +
            '<span class="gl dim">' + esc(g.gl) + "</span></button>";
        }).join("") + "</div>";
      }
      h += "</div>";
    });
    h += '<div class="actions" style="justify-content:flex-start;margin-top:16px">' +
      '<button class="btn" data-act="lessonstart">開始 ' + ((L.checks || []).length) + ' 題小測 →</button>' +
      '<button class="btn ghost" data-act="ref">粵拼速查</button>' +
      '<button class="btn ghost" data-act="home">跳過呢一區，返地圖</button></div>' +
      '<p class="dim small">⓪ 區係選修：跳過都得，之後任何一題都可以撳「粵拼速查」。</p></div>';
    return h;
  }

  function refHTML() {
    var R = D.jyRef || { steps: [], groups: [] }, T = D.toneTable || [];
    var h = '<div class="refhead"><h3>粵拼速查</h3>' +
      '<span class="dim small">任何時候都開得，唔使離開題目</span>' +
      '<button class="btn ghost small" data-act="refclose">閂埋</button></div>' +
      '<ol class="refsteps">' + (R.steps || []).map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol>" +
      '<h4>六個調（撳一下聽）</h4><div class="reftones">' + T.map(function (t) {
        return '<button class="reftone" data-act="play" data-text="' + esc(t.ex) + '">' +
          '<span class="tn">' + t.n + '</span><span class="hz">' + esc(t.ex) + '</span>' +
          '<span class="jy">' + esc(t.jy) + '</span><span class="dim refc">' + esc(t.name + " " + t.contour) + "</span></button>";
      }).join("") + "</div>";
    (R.groups || []).forEach(function (g) {
      h += '<h4>' + esc(g.h) + '</h4><p class="dim small refnote">' + esc(g.note) + '</p><div class="refgrid">' +
        g.items.map(function (it) {
          return '<button class="refitem" data-act="play" data-text="' + esc(sayText(it.hz)) + '">' +
            '<span class="rk2">' + esc(it.k) + '</span><span class="jy">' + esc(it.ex) + "</span>" +
            '<span class="hz">' + esc(it.hz) + "</span></button>";
        }).join("") + "</div>";
    });
    return h;
  }

  function toggleRef(open) {
    refOpen = !!open;
    var box = $("refbox");
    if (!box) return;
    if (refOpen && !box.getAttribute("data-filled")) {
      box.innerHTML = '<div class="refcard">' + refHTML() + "</div>";
      box.setAttribute("data-filled", "1");
    }
    box.classList.toggle("hidden", !refOpen);
    if (SFX) SFX.play("click");
  }

  function initRef() {
    var box = $("refbox"), b = $("btnRef");
    if (b) b.onclick = function () { toggleRef(true); };
    if (!box || !box.addEventListener) return;
    box.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest("[data-act]") : null;
      if (!t) return;
      var act = t.getAttribute("data-act");
      if (act === "refclose") toggleRef(false);
      else if (act === "play") speak(t.getAttribute("data-text"));
    });
  }

  /* ---------------- 自由練習（舊首頁，八塊） ---------------- */
  function freeHTML() {
    var n = Number(S.settings.len) || 12;
    return '<div class="card"><div class="actions" style="justify-content:flex-start">' +
      '<button class="btn ghost small" data-act="go" data-v="home">← 返關卡地圖</button>' +
      '<button class="btn ghost small" data-act="go" data-v="album">詞卡冊</button></div>' +
      '<h3 style="margin-top:12px">自由練習（唔計命、唔計星，練手感用）</h3>' +
      '<p class="dim small">想闖關就返地圖；想隨便練兩分鐘就喺呢度揀。</p>' +
      '<div class="grid" style="margin-top:12px">' +
      '<div class="mod" data-act="start" data-kind="mixed" data-n="' + n + '" style="background:rgba(79,185,138,.1)"><b>開始 ' + n + ' 題混合局</b><span>约 3 分钟。七块按你错题权重抽题，随时进随时练。</span></div>' +
      '<div class="mod" data-act="start" data-kind="tone" data-n="8"><b>① 聲調校准</b><span>你唯一的硬缺口：调号 ↔ 音高没接上。地基，先砸。</span></div>' +
      '<div class="mod" data-act="start" data-kind="pair" data-n="8"><b>② 音素顆粒度</b><span>aam/am、-p/-t/-k、ng-、n-/l-，治「靠上下文猜」。</span></div>' +
      '<div class="mod" data-act="start" data-kind="drill" data-n="10"><b>③ 主動提取</b><span>中文 → 粤语。直接修你那条断掉的单向通路。</span></div>' +
      '<div class="mod" data-act="start" data-kind="usage" data-n="6"><b>④ 語用與地道度</b><span>唔該/多謝、語氣詞、語序、懒音。你实测错最多的类型。</span></div>' +
      '<div class="mod" data-act="start" data-kind="word" data-all="1" data-n="10"><b>⑤ 港式詞彙庫（約 300 條）</b><span>職場／茶餐廳／出行／社交／日常起居／形容與時間。普通話 → 粵語，專治「認得但講唔出」。</span></div>' +
      '<div class="mod" data-act="start" data-kind="shadow" data-all="1" data-n="8" style="border-color:var(--jade)"><b>⑥ 講嘢（口語輸出）</b><span>跟讀 26 句＋語氣詞＋情境對話。練嘴巴的那一塊：先出聲，再揭曉，能錄音比對。</span></div>' +
      '<div class="mod" data-act="go" data-v="ai" style="border-color:var(--jade)"><b>⑦ AI 陪練（香港本地人）</b><span>同 AI 傾偈：佢全程講粵語、糾正你嘅用詞同語序，仲可以做「跟讀校準」。要填一次 DeepSeek key。</span></div>' +
      '<div class="mod" data-act="place"><b>⑧ 12 題定級測試</b><span>' + levelLine() + '約 4 分鐘，做完混合局就按你嘅級數配題。</span></div>' +
      '</div></div>' +
      '<div class="card"><h3>定级证据（你答过的原题）</h3>' +
      '<table><tr><th>你选了</th><th>正确</th><th>暴露的问题</th></tr>' +
      '<tr><td>升降机</td><td><b>𨋢 lip1</b></td><td>调的是书面词，不是街头词</td></tr>' +
      '<tr><td>多謝更客气</td><td><b>唔該=勞煩，多謝=饋贈</b></td><td>拿普通话礼貌逻辑套粤语</td></tr>' +
      '<tr><td>你走走先</td><td><b>你走先</b></td><td>语序方向对了，形式没锁死</td></tr>' +
      '<tr><td>佢<b>係</b>打緊電話</td><td><b>佢打緊電話</b></td><td>把普通话「正在」直译进来</td></tr>' +
      '<tr><td>三／心差在声母</td><td><b>韵母 aam / am</b></td><td>听辨颗粒度不够细</td></tr>' +
      '<tr><td>我 → ngo2</td><td><b>我 → o5（懒音）</b></td><td>把声母脱落误判成变调</td></tr>' +
      '</table></div>' +
      '<div class="card"><h3>用法建议（配合你「时间不固定」的现实）</h3>' +
      '<p class="dim small" style="margin:0">不要排课程表。<b>每次 3 分钟，一天想练几次练几次。</b>想重点突破就进单块；只做混合局也行——错题会自动加权回到你面前。声调那块建议每天固定刷 8 题，它是另外三块的地基。</p>' +
      '</div>';
  }

  /* ---------------- ① 声调 ---------------- */
  function toneIntroHTML() {
    var rows = D.toneTable.map(function (t) {
      return '<tr><td><b>' + t.n + "</b></td><td>" + t.name + "</td><td>" + contourSVG(t.shape) + "</td><td>" + t.contour +
        '</td><td><b>' + t.ex + '</b> <span class="dim">' + t.jy + '</span></td><td class="dim small">' + esc(t.anchor) + "</td></tr>";
    }).join("");
    return '<div class="card"><h2>① 聲調校準</h2>' +
      '<p class="dim small" style="margin-top:0">你能读粤拼，但调号和音高没接上——所以听得出一句话「语调怪」，却说不出怪在第几调。先把这张表和耳朵焊死。</p>' +
      '<table><tr><th>調</th><th>名</th><th>音高</th><th>調值</th><th>例字</th><th>拿你已知的词做锚点</th></tr>' + rows + "</table>" +
      '<p class="small dim" style="margin-bottom:0">口诀：<b>1 高平 / 2 高升 / 3 中平 / 4 低降 / 5 低升 / 6 低平</b>。前三个是高调组（陰），后三个是低调组（陽）——先分高低，再分升降。</p>' +
      '<div class="actions" style="justify-content:flex-start;margin-top:12px">' +
      '<button class="btn" data-act="start" data-kind="tone" data-n="8">開始 8 題</button>' +
      '<button class="btn ghost" data-act="start" data-kind="tone" data-n="16">16 題</button>' +
      "</div></div>" +
      '<div class="card"><h3>六声对照练习（不靠 App 也能练）</h3>' +
      '<p class="dim small">同一个音節配六个调，是粤语最经典的听力体检。依次读出来，卡在哪个调，就是你的盲区。</p>' +
      ["詩 si1 · 史 si2 · 試 si3 · 時 si4 · 市 si5 · 事 si6",
        "衣 ji1 · 椅 ji2 · 意 ji3 · 兒 ji4 · 耳 ji5 · 二 ji6",
        "夫 fu1 · 苦 fu2 · 富 fu3 · 符 fu4 · 婦 fu5 · 父 fu6",
        "因 jan1 · 忍 jan2 · 印 jan3 · 人 jan4 · 引 jan5 · 刃 jan6",
        "分 fan1 · 粉 fan2 · 訓 fan3 · 焚 fan4 · 奮 fan5 · 份 fan6"
      ].map(function (line) { return '<div class="item"><div class="l">' + line + "</div></div>"; }).join("") +
      "</div>";
  }

  function jyWithBlank(jy, target) {
    return jy.split(" ").map(function (p, i) {
      if (i !== target) return esc(p);
      return '<span style="color:var(--amber);text-decoration:underline">' + esc(p.replace(/[0-9]$/, "?")) + "</span>";
    }).join(" ");
  }

  /* ---------------- ② 音素 ---------------- */
  function pairIntroHTML() {
    function mbtn(v, t) {
      return '<button class="btn ghost small" data-act="pairmode" data-v="' + v + '"' +
        (pairMode === v ? ' style="border-color:var(--jade);color:var(--jade)"' : "") + ">" + t + "</button>";
    }
    return '<div class="card"><h2>② 音素顆粒度（最小對比）</h2>' +
      '<p class="dim small" style="margin-top:0">你听港剧靠上下文补全，所以「听懂 80%」是真的；但把声音拆成音素就失准。这一块专门拆：<b>aam/am、aai/ai、-p/-t/-k、ng-、n-/l-、gw-/g-</b>。每对只差一个特征，逼耳朵做精细分辨。</p>' +
      '<div class="actions" style="justify-content:flex-start">' + mbtn("listen", "聽音選字") + mbtn("read", "看粵拼選字") + "</div>" +
      '<div class="actions" style="justify-content:flex-start">' +
      '<button class="btn" data-act="start" data-kind="pair" data-n="8">開始 8 題</button>' +
      '<button class="btn ghost" data-act="start" data-kind="pair" data-n="16">16 題</button>' +
      "</div></div>" +
      '<div class="card"><h3>对照表（点 听）</h3>' +
      D.pairs.map(function (p) {
        return '<div class="item"><div class="l"><span class="hz">' + p.a.hz + '</span><span class="jy">' + p.a.jy + " · " + esc(p.a.gl) +
          '</span> <span class="dim">vs</span> <span class="hz">' + p.b.hz + '</span><span class="jy">' + p.b.jy + " · " + esc(p.b.gl) + "</span>" +
          '<div class="note"><b>' + esc(p.cat) + "</b> — " + esc(p.tip) + "</div></div>" +
          '<button class="mini" title="聽 A" data-act="play" data-text="' + p.a.hz + '">聽</button>' +
          '<button class="mini" title="聽 B" data-act="play" data-text="' + p.b.hz + '">聽</button></div>';
      }).join("") + "</div>";
  }

  /* ---------------- ③ 主动提取 ---------------- */
  function drillIntroHTML() {
    var scenes = SCENES.map(function (s) {
      return '<button class="btn ghost small" data-act="scene" data-v="' + s + '"' +
        (drillScene === s ? ' style="border-color:var(--jade);color:var(--jade)"' : "") + ">" + s + "</button>";
    }).join("");
    var cnt = D.drill.filter(function (x) { return drillScene === "全部" || x.scene === drillScene; }).length;
    return '<div class="card"><h2>③ 主動提取（中文 → 粵語）</h2>' +
      '<p class="dim small" style="margin-top:0">治你核心病的模块。规则只有一条：<b>先自己出声讲一遍，再点「揭曉」</b>。不开口直接看答案等于没练——你要建的是「意思 → 粤语」那条通路，看答案建不了它。</p>' +
      '<p class="dim small">揭曉后按真实情况自评：<b>脫口而出</b>（权重降低）／<b>想了一下</b>／<b>說不出</b>（权重拉高，很快再见到）。</p>' +
      '<div class="actions" style="justify-content:flex-start">' + scenes + "</div>" +
      '<div class="actions" style="justify-content:flex-start">' +
      '<button class="btn" data-act="start" data-kind="drill" data-n="10">開始 10 題（' + drillScene + " · " + cnt + " 條）</button>" +
      '<button class="btn ghost" data-act="start" data-kind="drill" data-n="20">20 題</button>' +
      "</div></div>" +
      '<div class="card"><h3>全部句子（点 跟读）</h3>' +
      D.drill.map(function (x) {
        return '<div class="item"><div class="l"><span class="dim small">[' + x.scene + "]</span> " + esc(x.zh) +
          '<div class="note"><span class="hz">' + x.hz + '</span><span class="jy">' + x.jy + "</span>" +
          '<div style="margin-top:3px">' + esc(x.note) + "</div></div></div>" +
          '<button class="mini" data-act="play" data-text="' + x.hz + '">聽</button></div>';
      }).join("") + "</div>";
  }

  /* ---------------- ④ 用词地道 ---------------- */
  function lexHTML() {
    var tabs = [["words", "分場景詞表"], ["thanks", "唔該 vs 多謝"], ["lazy", "懒音"], ["slang", "俚語"]];
    var nav = tabs.map(function (t) {
      return '<button class="btn ghost small" data-act="lextab" data-v="' + t[0] + '"' +
        ((S.lexTab === t[0] || (t[0] === "words" && S.lexTab === "map")) ? ' style="border-color:var(--jade);color:var(--jade)"' : "") + ">" + t[1] + "</button>";
    }).join("");
    var body = "";
    if (S.lexTab === "words" || S.lexTab === "map") {
      var lrows = (D.lexicon ? D.lexicon.rows : D.lexmap), lcats = (D.lexicon ? D.lexicon.cats : []);
      var shown = lrows.filter(function (x) { return lexCat === "全部" || x.cat === lexCat; });
      var catBtns = ["全部"].concat(lcats).map(function (c) {
        return '<button class="btn ghost small" data-act="lexcat" data-v="' + c + '"' +
          (lexCat === c ? ' style="border-color:var(--jade);color:var(--jade)"' : "") + ">" + c + "</button>";
      }).join("");
      body = '<p class="dim small">共 <b>' + lrows.length + '</b> 條，按場景分。左邊是你腦裡的普通話說法，右邊是香港街頭真實說法。' +
        '<b>認得 ≠ 講得出</b>——看完務必按下面那顆按鈕進「詞彙提取」練一遍，否則這張表對你的病沒用。</p>' +
        '<div class="actions" style="justify-content:flex-start">' + catBtns + "</div>" +
        '<div class="actions" style="justify-content:flex-start">' +
        '<button class="btn" data-act="start" data-kind="word" data-n="10">練詞彙提取（' + lexCat + " · " + shown.length + " 條）</button></div>" +
        shown.map(function (x) {
          return '<div class="item"><div class="l"><span class="dim small">[' + x.cat + ']</span> ' +
            '<span class="cn">' + esc(x.cn) + '</span> → <span class="hz">' + x.hk + '</span>' +
            '<span class="jy">' + x.jy + '</span>' +
            (x.note ? '<div class="note">' + esc(x.note) + '</div>' : '') + '</div>' +
            '<button class="mini" data-act="play" data-text="' + x.hk + '">聽</button></div>';
        }).join("");
    } else if (S.lexTab === "thanks") {
      body = "<h3>" + esc(D.usageRule.title) + "</h3>" + D.usageRule.lines.map(function (l) {
        return '<p class="small" style="margin:6px 0">' + md(l) + "</p>";
      }).join("") +
        '<div class="actions" style="justify-content:flex-start;margin-top:12px">' +
        '<button class="btn" data-act="start" data-kind="usage" data-n="8">開始語用測驗</button></div>';
    } else if (S.lexTab === "lazy") {
      body = "<h3>" + esc(D.lazy.title) + "</h3><p class='dim small'>" + md(D.lazy.intro) + "</p>" +
        D.lazy.rows.map(function (r) {
          return '<div class="item"><div class="l"><b>' + esc(r.name) + '</b><div class="note">' + esc(r.ex) + "</div>" +
            '<div class="note" style="color:#c9d8e4">' + esc(r.advice) + "</div></div></div>";
        }).join("");
    } else {
      body = '<p class="dim small">你自评认识 5 个（食花生、好行唔送、冇得輸、側側膊、唔使急最緊要快）；收皮、頂硬上 你说不认识，看完再决定用不用——<b>收皮偏粗俗，職場慎用</b>。</p>' +
        D.slang.map(function (x) {
          return '<div class="item"><div class="l"><span class="hz">' + x.hz + '</span><span class="jy">' + x.jy + "</span>" +
            '<div class="note">' + esc(x.gl) + "　例：" + esc(x.ex) + "</div></div>" +
            '<button class="mini" data-act="play" data-text="' + x.hz + '">聽</button></div>';
        }).join("");
    }
    return '<div class="card"><h2>④ 用詞與地道度　⑤ 詞彙庫</h2><div class="actions" style="justify-content:flex-start">' + nav + "</div></div>" +
      '<div class="card">' + body + "</div>";
  }

  /* ---------------- ⑥ 講嘢（口語輸出） ---------------- */
  function playDialogue(i) {
    var d = SP.dialogues[i];
    if (!d || !d.turns.length) return;
    var k = 0, rate = Number(S.settings.rate) || 0.8;
    (function step() {
      if (k >= d.turns.length) return;
      var t = d.turns[k++];
      speak(t.hk);
      setTimeout(step, Math.max(1400, Math.round(t.hk.length * 520 / rate)));
    })();
  }

  function speakIntroHTML() {
    var tab = S.speakTab || "shadow";
    var nav = SPEAKTABS.map(function (t) {
      return '<button class="btn ghost small" data-act="speaktab" data-v="' + t[0] + '"' +
        (tab === t[0] ? ' style="border-color:var(--jade);color:var(--jade)"' : "") + ">" + t[1] + "</button>";
    }).join("");
    var head = '<div class="card"><h2>⑥ 講嘢（口語輸出）</h2>' +
      '<p class="dim small" style="margin-top:0">這一塊練的是<b>嘴巴</b>，不是耳朵。規則跟 ③ 一樣：<b>一定要先出聲講，再揭曉</b>。' +
      '揭曉後有「錄音比對」——先聽範例，再聽自己那條；差別通常落在<b>聲調尾音</b>跟<b>句末語氣詞</b>這兩處。</p>' +
      '<div class="actions" style="justify-content:flex-start">' + nav + "</div></div>";
    var body = "";
    if (tab === "shadow") {
      var sbtn = SCENES.map(function (s) {
        return '<button class="btn ghost small" data-act="speakscene" data-v="' + s + '"' +
          (speakScene === s ? ' style="border-color:var(--jade);color:var(--jade)"' : "") + ">" + s + "</button>";
      }).join("");
      var list = SP.shadow.filter(function (x) { return speakScene === "全部" || x.scene === speakScene; });
      body = '<p class="dim small"><b>跟讀</b>是最快的口語訓練：聽一句、立刻跟著講一句，模仿它的<b>聲調起伏和句末語氣</b>。' +
        '不要只在心裡念——你的問題是「意思 → 粵語」那條路沒建好，默念建不了它。</p>' +
        '<div class="actions" style="justify-content:flex-start">' + sbtn + "</div>" +
        '<div class="actions" style="justify-content:flex-start">' +
        '<button class="btn" data-act="start" data-kind="shadow" data-n="8">開始 8 句（' + speakScene + " · " + list.length + " 條）</button>" +
        '<button class="btn ghost" data-act="start" data-kind="shadow" data-n="16">16 句</button></div>' +
        '<h3>全部句子（點 先聽，再自己講一次）</h3>' +
        list.map(function (x) {
          return '<div class="item"><div class="l"><span class="dim small">[' + esc(x.scene) + "]</span> " +
            '<span class="hz">' + x.hk + '</span><span class="jy">' + esc(x.jy) + "</span>" +
            '<div class="note">' + esc(x.zh) + "</div>" +
            '<div class="note" style="color:#c9d8e4">港味點：' + esc(x.tip) + "</div></div>" +
            '<button class="mini" data-act="play" data-text="' + x.hk + '">聽</button></div>';
        }).join("");
    } else if (tab === "oral") {
      body = '<p class="dim small"><b>句末語氣詞</b>是港味的總開關：同一句話，加對語氣詞就是「講嘢」，不加或加錯就是「背書」。' +
        '這組題專門練它，另外混了幾個最容易直譯錯的口語替換（畀／有冇／幾多／未）。</p>' +
        '<div class="actions" style="justify-content:flex-start">' +
        '<button class="btn" data-act="start" data-kind="oral" data-n="8">開始 8 題</button>' +
        '<button class="btn ghost" data-act="start" data-kind="oral" data-n="' + SP.oralQuiz.length + '">全部 ' + SP.oralQuiz.length + " 題</button></div>" +
        '<div class="actions" style="justify-content:flex-start">' +
        '<button class="btn ghost small" data-act="speaktab" data-v="particle">看語氣詞表 →</button></div>';
    } else if (tab === "role") {
      body = '<p class="dim small"><b>情境對話</b>：App 講對方的台詞，你負責接自己那句。這是最近似真實聊天的一塊——' +
        '因為你得先聽懂對方，再決定自己講什麼。黃色左邊線是你的台詞。</p>' +
        '<div class="actions" style="justify-content:flex-start">' +
        '<button class="btn" data-act="start" data-kind="role" data-n="8">抽 8 句台詞來接</button>' +
        '<button class="btn ghost" data-act="start" data-kind="role" data-n="12">12 句</button></div>' +
        SP.dialogues.map(function (d, di) {
          return '<h3>' + esc(d.title) + ' <span class="dim small">[' + esc(d.scene) + "]</span></h3>" +
            '<div class="actions" style="justify-content:flex-start">' +
            '<button class="btn ghost small" data-act="playdlg" data-v="' + di + '">整段播放</button></div>' +
            d.turns.map(function (t) {
              return '<div class="item"' + (t.s === "y" ? ' style="border-left:3px solid var(--jade)"' : "") + ">" +
                '<div class="l"><span class="dim small">' + (t.s === "y" ? "你" : "對方") + "</span> " +
                '<span class="hz">' + t.hk + '</span><span class="jy">' + esc(t.jy) + "</span>" +
                '<div class="note">' + esc(t.zh) + (t.tip ? "　·　" + esc(t.tip) : "") + "</div></div>" +
                '<button class="mini" data-act="play" data-text="' + t.hk + '">聽</button></div>';
            }).join("");
        }).join("");
    } else if (tab === "particle") {
      body = '<p class="dim small">12 個高頻句末語氣詞。看的時候<b>把例句出聲念出來</b>，語氣要一起念——只記意思是沒用的，語氣詞是肌肉記憶。</p>' +
        SP.particles.map(function (p) {
          return '<div class="item"><div class="l"><span class="hz">' + p.hz + '</span><span class="jy">' + esc(p.jy) + "</span>" +
            '<div class="note">' + esc(p.use) + "</div>" +
            '<div class="note" style="color:#c9d8e4">例：' + p.ex + "（" + esc(p.exJy) + "）" + esc(p.exZh) + "</div></div>" +
            '<button class="mini" data-act="play" data-text="' + p.ex + '">聽</button></div>';
        }).join("");
    } else {
      body = '<p class="dim small">12 條港味口語習慣。這不是知識，是「每次開口都要做的動作」——先挑三條練成條件反射。</p>' +
        SP.tips.map(function (t) {
          return '<div class="item"><div class="l"><b>' + esc(t.t) + "</b>" +
            '<div class="note">' + esc(t.d) + "</div>" +
            (t.ex ? '<div class="note" style="color:#c9d8e4">例：' + esc(t.ex) + (t.jy ? "（" + esc(t.jy) + "）" : "") + "</div>" : "") +
            "</div>" + (t.ex ? '<button class="mini" data-act="play" data-text="' + t.ex + '">聽</button>' : "") + "</div>";
        }).join("");
    }
    return head + '<div class="card">' + body + "</div>";
  }

  /* ---------------- 錄音比對（離線可用；拿不到權限就降級成純跟讀） ---------------- */
  var REC = { mr: null, chunks: [], stream: null, url: "" };
  function recReady() {
    return !!(typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia &&
      typeof window.MediaRecorder !== "undefined");
  }
  function recFail(msg) {
    var b = $("recbox");
    if (b) b.innerHTML = '<p class="dim small">' + msg + "</p>";
  }
  function recToggle() {
    if (!$("recbox")) return;
    if (REC.mr) { try { REC.mr.stop(); } catch (e) {} return; }
    if (!recReady()) {
      recFail("這個環境拿不到麥克風（瀏覽器要支援 MediaRecorder，且用 https 或直接雙擊本機檔案開啟）。<b>完全不影響練習</b>：大聲跟讀三遍，或用手機錄音機錄下來對比。");
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (st) {
      REC.stream = st;
      REC.chunks = [];
      var mr = new window.MediaRecorder(st);
      REC.mr = mr;
      mr.ondataavailable = function (e) { if (e.data && e.data.size) REC.chunks.push(e.data); };
      mr.onstop = function () {
        try { REC.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
        REC.mr = null;
        REC.stream = null;
        var blob = new Blob(REC.chunks, { type: (REC.chunks[0] && REC.chunks[0].type) || "audio/webm" });
        if (REC.url) URL.revokeObjectURL(REC.url);
        REC.url = URL.createObjectURL(blob);
        var b = $("recbox");
        if (b) b.innerHTML = '<p class="small" style="color:var(--amber)">先按上面「聽一次跟讀」聽範例，再聽自己這條——差距通常在<b>聲調尾音</b>和<b>語氣詞</b>。</p>' +
          '<audio controls src="' + REC.url + '" style="width:100%;margin:6px 0"></audio>';
      };
      mr.start();
      var b2 = $("recbox");
      if (b2) b2.innerHTML = '<p class="small" style="color:var(--amber)">錄音中…念完再按一次「錄音比對」停止。</p>';
    }).catch(function (err) {
      recFail("拿不到麥克風（" + esc((err && err.name) || "未知錯誤") + "）。不影響練習：大聲跟讀三遍即可。");
    });
  }

  /* ---------------- 进度 ---------------- */
  function progressHTML() {
    var t = todayKey(), total = 0, ok = 0, k;
    for (k in S.stats) { total += S.stats[k].seen; ok += S.stats[k].ok; }
    var acc = total ? Math.round(ok / total * 100) : 0;
    var mods = ["tone", "pair", "drill", "word", "usage", "oral", "shadow", "role"].map(function (kk) {
      var st = S.stats[kk] || { seen: 0, ok: 0 };
      var a = st.seen ? Math.round(st.ok / st.seen * 100) : 0;
      return '<div style="margin-bottom:12px"><div class="small"><b>' + LABEL[kk] + "</b> <span class='dim'>" + st.seen +
        " 題 · 正確率 " + a + '%</span></div><div class="acc"><i style="width:' + a + '%"></i></div></div>';
    }).join("");
    var wrongHTML = S.wrong.length ? S.wrong.map(function (id) {
      var p = id.split(":"), kind = p[0], i = Number(p[1]);
      var o = IDX[kind] && IDX[kind][i];
      if (!o) return "";
      var title = "", sub = "", audio = "";
      if (kind === "tone") { title = o.hz; sub = o.jy + "（第 " + o.ans + " 調）" + (o.gl ? " · " + o.gl : ""); audio = o.hz; }
      else if (kind === "pair") { title = o.a.hz + " / " + o.b.hz; sub = o.a.jy + " vs " + o.b.jy + " — " + o.cat; audio = o.a.hz; }
      else if (kind === "drill") { title = o.zh; sub = o.hz + " " + o.jy; audio = o.hz; }
      else if (kind === "word") { title = o.cn; sub = o.hk + " " + o.jy; audio = o.hk; }
      else if (kind === "oral") { title = o.q; sub = "→ " + o.ans; }
      else if (kind === "shadow") { title = o.zh; sub = o.hk + " " + o.jy; audio = o.hk; }
      else if (kind === "role") { title = o.zh; sub = "（" + o.d + "）" + o.hk + " " + o.jy; audio = o.hk; }
      else { title = o.q; sub = "→ " + o.ans; }
      var it = S.items[id] || {};
      return '<div class="item"><div class="l"><span class="dim small">[' + (LABEL[kind] || kind) + "]</span> <b>" + esc(title) + "</b>" +
        '<div class="note">' + esc(sub) + "</div>" +
        '<div class="note">錯 ' + (it.bad || 0) + " · 對 " + (it.ok || 0) + "（權重 " + weightOf(id).toFixed(1) + "）</div></div>" +
        (audio ? '<button class="mini" data-act="play" data-text="' + audio + '">聽</button>' : "") + "</div>";
    }).join("") : '<p class="dim small">还没有错题。练几局就会在这里堆起来——这就是你的复习队列。</p>';
    return '<div class="card"><h2>進度</h2><div class="stat">' +
      "<div><b>" + (S.days[t] || 0) + "</b><span>今日題數</span></div>" +
      "<div><b>" + streak() + "</b><span>連續天數</span></div>" +
      "<div><b>" + acc + "%</b><span>總正確率</span></div>" +
      "<div><b>" + total + "</b><span>累計題數</span></div></div>" +
      '<div style="margin-top:14px">' + mods + "</div></div>" +
      '<div class="card"><h2>關卡與段位</h2>' +
      (GC ? (function () {
        var ri = GC.rankInfo(GCTX), g = S.game || {}, best = 0, stars = 0, k;
        for (k in (g.passed || {})) {
          if (!g.passed[k]) continue;
          stars += g.passed[k].stars || 0;
          if ((g.passed[k].score || 0) > best) best = g.passed[k].score;
        }
        return '<p class="small">段位 <b>' + esc(ri.rank.name) + '</b>　通關 ' + ri.passed + " / " + ri.total +
          "　總星數 " + stars + "　單關最高分 " + best + "</p>";
      })() : '<p class="dim small">遊戲層未載入。</p>') +
      '<div class="actions" style="justify-content:flex-start">' +
      '<button class="btn ghost small" data-act="go" data-v="home">返關卡地圖</button>' +
      '<button class="btn ghost small" data-act="go" data-v="album">詞卡冊</button></div></div>' +
      '<div class="card"><h2>等級與 AI 陪練</h2>' +
      '<p class="small">' + esc(levelTitle()) +
      (S.placeScore ? '<span class="dim">　12 題測到 ' + S.placeScore.ratio + "%（" + S.placeScore.ok + "/" + S.placeScore.n + "）</span>" : '<span class="dim">　仲未做定級測試</span>') + "</p>" +
      '<p class="dim small">AI 對話 ' + ((S.aiStats && S.aiStats.turns) || 0) + " 輪。</p>" +
      '<div class="actions" style="justify-content:flex-start">' +
      '<button class="btn ghost small" data-act="place">重新做 12 題定級測試</button>' +
      '<button class="btn ghost small" data-act="go" data-v="ai">去 AI 陪練</button></div></div>' +
      '<div class="card"><h2>錯題本（' + S.wrong.length + "）</h2>" + wrongHTML +
      '<div class="actions" style="justify-content:flex-start">' +
      '<button class="btn" data-act="start" data-kind="mixed" data-n="12">用混合局清錯題</button>' +
      '<button class="btn ghost" data-act="start" data-kind="tone" data-n="8">只練聲調</button></div></div>';
  }

  /* ---------------- 遊戲層對局（關卡／三條命／連擊／分數／結算） ---------------- */
  function fastKind(kind) { return !!(G && G.FAST[kind]); }
  function buildPool(pool) {
    var list = G ? G.resolvePool(pool, IDX) : [];
    return list.map(function (e) { return makeQ(e.kind, e); });
  }
  function findZone(id) {
    if (!G) return null;
    for (var i = 0; i < G.zones.length; i++) if (G.zones[i].id === id) return G.zones[i];
    return null;
  }
  function startLevel(zone, li) {
    if (!zone) return;
    var L = zone.levels[li] || zone.levels[0];
    li = zone.levels.indexOf(L);
    if (L.teach != null) { openLesson(zone, li); return; }
    var qs = shuffle(buildPool(L.pool)).slice(0, L.n);
    sess = {
      kind: "level", qs: qs, i: 0, ok: 0, bad: 0,
      level: { zone: zone.id, li: li, id: L.id, name: L.name, zoneName: zone.name, total: zone.levels.length },
      lives: 3, combo: 0, maxCombo: 0, score: 0, over: false, pts: ""
    };
    if (SFX) SFX.play("click");
    render();
  }
  /* ⓪ 粵拼入門：先睇教學（route "lesson"），再開始 3 題小測 */
  function openLesson(zone, li) {
    var L = zone.levels[li];
    lessonOpen = { zone: zone.id, li: li, id: L.id, name: L.name, teach: L.teach };
    go("lesson");
  }
  function startLessonQuiz() {
    if (!lessonOpen) { go("home"); return; }
    var zone = findZone(lessonOpen.zone);
    if (!zone) { go("home"); return; }
    var li = lessonOpen.li, L = zone.levels[li];
    var qs = shuffle(buildPool(L.pool)).slice(0, L.n);
    sess = {
      kind: "level", qs: qs, i: 0, ok: 0, bad: 0,
      level: { zone: zone.id, li: li, id: L.id, name: L.name, zoneName: zone.name, total: zone.levels.length },
      lives: 3, combo: 0, maxCombo: 0, score: 0, over: false, pts: ""
    };
    if (SFX) SFX.play("click");
    render();
  }
  function comboMult() { return sess && sess.level ? 1 + Math.min(Math.floor(sess.combo / 3), 2) : 1; }  function addScore(ok) {
    if (!sess || !sess.level) return;
    if (ok) {
      sess.combo++;
      if (sess.combo > sess.maxCombo) sess.maxCombo = sess.combo;
      var mult = comboMult(), pts = 100 * mult;
      sess.score += pts;
      sess.pts = "+" + pts + (mult > 1 ? "　×" + mult : "");
      if (SFX) SFX.play(sess.combo >= 3 ? "combo" : "right");
    } else {
      sess.combo = 0;
      sess.pts = "";
      if (fastKind(curQ().kind)) {
        sess.lives--;
        if (sess.lives <= 0) { sess.over = true; if (SFX) SFX.play("lose"); }
        else if (SFX) SFX.play("wrong");
      } else if (SFX) SFX.play("wrong");
    }
  }
  function ptsHTML() {
    if (!sess || !sess.level || !sess.pts) return "";
    return '<div class="pts">' + sess.pts + "</div>";
  }
  function totalPassed() {
    var g = S.game || {}, n = 0, k;
    for (k in (g.passed || {})) if (g.passed[k]) n++;
    for (k in (g.bosses || {})) if (g.bosses[k]) n++;
    return n;
  }
  function renderLevelResult() {
    var L = sess.level, ans = sess.ok + sess.bad;
    var acc = ans ? Math.round((sess.ok / ans) * 100) : 0;
    var stars = G ? G.starFor(acc / 100) : 0;
    var rating = G ? G.ratingFor(acc / 100) : "-";
    var pass = stars > 0 && !sess.over;
    var before = totalPassed();
    if (pass) {
      var g = S.game || (S.game = { passed: {}, bosses: {} });
      var old = g.passed[L.id];
      g.passed[L.id] = {
        stars: Math.max(stars, old ? old.stars : 0),
        acc: Math.max(acc, old ? old.acc : 0),
        score: Math.max(sess.score, old ? (old.score || 0) : 0),
        maxCombo: Math.max(sess.maxCombo, old ? (old.maxCombo || 0) : 0),
        at: Date.now()
      };
      save();
    }
    var after = totalPassed();
    var rankUp = (G && G.rankIndex(after) > G.rankIndex(before)) ? G.rankOf(after) : null;
    var zone = findZone(L.zone), nextL = (zone && zone.levels[L.li + 1]) ? zone.levels[L.li + 1] : null;
    if (SFX) SFX.play(pass ? (stars === 3 ? "win" : "unlock") : "lose");
    var say = sess.over ? "命用光了——GAME OVER。呢一關有三條命，答錯要扣；練聲調同跟讀嘅題唔扣，放心慢慢聽。"
      : rating === "S" ? "全對。呢一關你已經食得住。"
        : pass ? "過關。錯咗嘅題會自動加權，下次返嚟搵你。"
          : "差少少（過關線 70%）。再嚟一次就得，唔使怕。";
    view().innerHTML = '<div class="card lead result"><div class="rgrade g' + rating + '">' + rating + "</div>" +
      '<h2>' + esc(L.zoneName) + "　" + esc(L.name) + "　" + (pass ? "通關" : "未通關") + "</h2>" +
      '<p class="dim small" style="margin-top:0">' + say + (rankUp ? "　<b>段位升到「" + esc(rankUp.name) + "」！</b>" : "") + "</p>" +
      '<div class="stat"><div><b>' + stars + '</b><span>星</span></div><div><b>' + sess.score + "</b><span>分</span></div>" +
      "<div><b>" + sess.maxCombo + '</b><span>最高連擊</span></div><div><b>' + sess.lives + '</b><span>剩餘命</span></div>' +
      "<div><b>" + sess.ok + "／" + ans + '</b><span>對／答</span></div><div><b>' + acc + "%</b><span>正確率</span></div></div>" +
      '<div class="actions" style="justify-content:flex-start">' +
      (nextL ? '<button class="btn" data-act="lvl" data-zone="' + L.zone + '" data-li="' + (L.li + 1) + '">下一關：' + esc(nextL.name) + "</button>" : "") +
      '<button class="btn ghost" data-act="retry">再嚟一次</button>' +
      '<button class="btn ghost" data-act="home">返地圖</button>' +
      '<button class="btn ghost" data-act="go" data-v="album">睇詞卡冊</button></div></div>';
    paintFoot();
  }

  /* ---------------- 答题 ---------------- */
  function curQ() { return sess.qs[sess.i]; }

  function renderQuiz() {
    if (sess.i >= sess.qs.length) { renderResult(); return; }
    var q = curQ(), v = view();
    var head = '<div class="qhead"><span>' + (sess.level ? esc(sess.level.name) : sess.kind === "mixed" ? "混合局" : LABEL[q.kind]) + " · 第 " + (sess.i + 1) + "/" + sess.qs.length +
      '</span><span>✔ ' + sess.ok + "　✘ " + sess.bad + "</span>" +
      '<button class="chip mini" data-act="ref" title="粵拼速查：聲母／韻母／六調／入聲／變調">粵拼速查</button></div>' +
      '<div class="bar"><i style="width:' + Math.round((sess.i / sess.qs.length) * 100) + '%"></i></div>';
    if (sess.level) {
      head += '<div class="hud"><span class="hl">命 ' + sess.lives + '</span>' +
        '<span class="hc">連擊 ' + sess.combo + (comboMult() > 1 ? "　×" + comboMult() : "") + "</span>" +
        '<span class="hs">分 ' + sess.score + "</span>" +
        '<span class="hn">' + esc(sess.level.zoneName) + "　剩 " + (sess.qs.length - sess.i) + " 題</span></div>";
    }

    if (q.kind === "tone") {
      v.innerHTML = '<div class="card">' + head +
        '<div class="prompt"><div class="asklbl">聽發音，判斷<b style="color:var(--amber)">黃色</b>那個音節是第幾調</div>' +
        '<div class="hz">' + q.item.hz + '</div><div class="jy">' + jyWithBlank(q.item.jy, q.item.target) + "</div>" +
        (q.item.gl ? '<div class="mean">意思：' + esc(q.item.gl) + "</div>" : "") + "</div>" +
        '<div class="actions"><button class="btn ghost small" data-act="play" data-text="' + q.item.hz + '">聽多一次</button></div>' +
        '<div class="opts six">' + [1, 2, 3, 4, 5, 6].map(function (n) {
          return '<button class="opt" data-act="opt" data-v="' + n + '">' + n + "</button>";
        }).join("") + "</div><div id='fb'></div></div>";
      speak(q.item.hz);
    } else if (q.kind === "jy") {
      v.innerHTML = '<div class="card">' + head +
        '<div class="prompt"><div class="asklbl">⓪ 粵拼入門 · ' + esc(q.item.lessonName) + '</div><div class="zh">' + esc(q.item.q) + "</div></div>" +
        '<div class="opts one-col">' + q.opts.map(function (o) {
          return '<button class="opt" data-act="opt" data-v="' + esc(o) + '">' + esc(o) + "</button>";
        }).join("") + "</div><div id='fb'></div></div>";
    } else if (q.kind === "pair") {
      var body = pairMode === "listen"
        ? '<div class="prompt"><div class="asklbl">聽發音，選出你聽到的是哪一個</div><div class="hz">聽</div></div>'
        : '<div class="prompt"><div class="asklbl">讀粵拼，選出對應的字</div><div class="jy" style="font-size:30px">' + esc(q.playJy) + "</div></div>";
      v.innerHTML = '<div class="card">' + head + body +
        '<div class="actions"><button class="btn ghost small" data-act="play" data-text="' + q.playChar + '">聽多一次</button></div>' +
        '<div class="opts">' + q.opts.map(function (o) {
          return '<button class="opt" data-act="opt" data-v="' + o.key + '">' + o.hz + '<span class="l2">' + o.jy + " · " + esc(o.gl) + "</span></button>";
        }).join("") + "</div><div id='fb'></div></div>";
      if (pairMode === "listen") speak(q.playChar);
    } else if (q.kind === "usage") {
      v.innerHTML = '<div class="card">' + head +
        '<div class="prompt"><div class="asklbl">選出正確答案</div><div class="zh">' + esc(q.item.q) + "</div></div>" +
        '<div class="opts one-col">' + q.opts.map(function (o) {
          return '<button class="opt" data-act="opt" data-v="' + esc(o) + '">' + esc(o) + "</button>";
        }).join("") + "</div><div id='fb'></div></div>";
    } else if (q.kind === "drill") {
      v.innerHTML = '<div class="card">' + head +
        '<div class="prompt"><div class="asklbl">[' + q.item.scene + '] 先出聲講一次，再揭曉</div><div class="zh">' + esc(q.item.zh) + "</div></div>" +
        '<div class="actions"><button class="btn" id="btnReveal" data-act="reveal">揭曉答案</button></div>' +
        '<div id="fb"></div></div>';
    } else if (q.kind === "oral") {
      v.innerHTML = '<div class="card">' + head +
        '<div class="prompt"><div class="asklbl">語氣詞／口語替換——選出香港人真正會講的說法</div><div class="zh">' + esc(q.item.q) + "</div></div>" +
        '<div class="opts one-col">' + q.opts.map(function (o) {
          return '<button class="opt" data-act="opt" data-v="' + esc(o) + '">' + esc(o) + "</button>";
        }).join("") + "</div><div id='fb'></div></div>";
    } else if (q.kind === "shadow" || q.kind === "role") {
      var sit = q.item;
      var cue = q.kind === "role" ? (sit.prevHk || "") : sit.hk;
      var ctx = q.kind === "role"
        ? (cue
          ? '<div class="asklbl">[' + esc(sit.d) + '] 對方說：</div><div class="hz">' + sit.prevHk + '</div>' +
            '<div class="jy">' + esc(sit.prevJy) + "</div>" +
            '<div class="asklbl" style="margin-top:12px">輪到你，出聲說出你的台詞（意思：' + esc(sit.zh) + "）</div>"
          : '<div class="asklbl">[' + esc(sit.d) + '] 這次由你先開口（意思：' + esc(sit.zh) + "）</div>")
        : '<div class="asklbl">[' + esc(sit.scene) + '] 聽一句，立刻大聲跟著講一次</div>' +
          '<div class="zh">' + sit.hk + '</div><div class="jy" style="font-size:14px">' + esc(sit.jy) + "</div>";
      v.innerHTML = '<div class="card">' + head +
        '<div class="prompt">' + ctx + "</div>" +
        '<div class="actions">' + (cue ? '<button class="btn ghost small" data-act="play" data-text="' + cue + '">聽範例</button>' : "") +
        '<button class="btn" id="btnReveal" data-act="reveal">揭曉答案</button></div>' +
        '<div id="fb"></div></div>';
      if (cue) speak(cue);
    } else {
      v.innerHTML = '<div class="card">' + head +
        '<div class="prompt"><div class="asklbl">[' + q.item.cat + '] 普通話 → 粵語，先出聲講一次，再揭曉</div><div class="zh">' + esc(q.item.cn) + "</div></div>" +
        '<div class="actions"><button class="btn" id="btnReveal" data-act="reveal">揭曉答案</button></div>' +
        '<div id="fb"></div></div>';
    }
  }

  function targetOf(q) { return q.kind === "tone" ? String(q.item.ans) : (q.kind === "pair" ? q.key : q.item.ans); }

  function answerOpt(btn) {
    var q = curQ();
    if (q.done) return;
    q.done = true;
    var val = btn.getAttribute("data-v"), ok = false, fb = "";
    if (q.kind === "tone") {
      ok = Number(val) === q.item.ans;
      var t = D.toneTable[q.item.ans - 1];
      var pos = q.item.jy.split(" ")[q.item.target];
      fb = '<div class="fb ' + (ok ? "ok" : "no") + '"><span class="tag">' + (ok ? "對" : "錯") + "</span>" +
        esc(pos) + " = 第 <b>" + t.n + "</b> 調 · " + t.name + " · " + t.contour + " " + contourSVG(t.shape) +
        '<span class="rule">锚点：' + esc(t.anchor) + "</span></div>";
    } else if (q.kind === "pair") {
      ok = val === q.key;
      fb = '<div class="fb ' + (ok ? "ok" : "no") + '"><span class="tag">' + (ok ? "對" : "錯") + "</span>" +
        "正確是 <b>" + q.playChar + "</b> " + q.playJy +
        (q.item[q.key] && q.item[q.key].gl ? "（" + esc(q.item[q.key].gl) + "）" : "") + "，刚才播放的正是它。" +
        '<span class="rule"><b>' + esc(q.item.cat) + "</b> — " + esc(q.item.tip) + "</span></div>";
    } else {
      ok = val === q.item.ans;
      fb = '<div class="fb ' + (ok ? "ok" : "no") + '"><span class="tag">' + (ok ? "對" : "錯") + "</span>正確答案：<b>" +
        esc(q.item.ans) + '</b><span class="rule">' + esc(q.item.why) + "</span></div>";
    }
    if (ok) sess.ok++; else sess.bad++;
    addScore(ok);
    record(q.kind, q.idx, ok);
    btn.classList.add(ok ? "right" : "wrong");
    if (!ok) {
      var opts = view().querySelectorAll(".opt"), i, tg = targetOf(q);
      for (i = 0; i < opts.length; i++) if (opts[i].getAttribute("data-v") === tg) opts[i].classList.add("right");
    }
    $("fb").innerHTML = ptsHTML() + fb +
      '<div class="actions"><button class="btn" data-act="next">下一題 →</button>' +
      (q.kind === "tone" ? '<button class="btn ghost small" data-act="play" data-text="' + q.item.hz + '">再聽</button>' : "") +
      "</div>";
  }

  function revealDrill() {
    var q = curQ();
    if (q.revealed) return;
    q.revealed = true;
    var it = q.item;
    var spoken = (q.kind === "word" || q.kind === "shadow" || q.kind === "role");
    var big = spoken ? it.hk : it.hz;
    var extra = q.kind === "word" ? '<div class="dim small">' + esc(it.cn) + "</div>"
      : q.kind === "shadow" ? '<div class="dim small">' + esc(it.zh) + "</div>"
        : q.kind === "role" ? '<div class="dim small">情境：' + esc(it.d) + "　你的意思：" + esc(it.zh) + "</div>"
          : "";
    var tail = spoken
      ? (it.tip ? '<div class="rule">港味點：' + esc(it.tip) + "</div>" : "")
      : '<div class="dim">' + esc(it.note) + "</div>";
    $("fb").innerHTML = '<div class="fb ok" style="background:var(--panel2);border-color:var(--line)">' +
      '<div style="font-size:22px;font-weight:600">' + big + "</div>" +
      '<div style="color:var(--jade);font-size:15px;margin:4px 0 8px">' + it.jy + "</div>" +
      extra + tail + "</div>" +
      '<div class="actions"><button class="btn ghost small" data-act="play" data-text="' + big + '">聽一次跟讀</button>' +
      '<button class="btn ghost small" data-act="rec">錄音比對</button></div>' +
      '<div id="recbox"></div>' +
      '<div class="actions" style="flex-direction:column">' +
      '<button class="btn" data-act="grade" data-v="0">脫口而出（已掌握）</button>' +
      '<button class="btn ghost" data-act="grade" data-v="1">想了一下才出來</button>' +
      '<button class="btn ghost" data-act="grade" data-v="2">說不出來</button></div>';
    speak(big);
  }

  function gradeDrill(g) {
    var q = curQ();
    if (q.graded) return;
    q.graded = true;
    var ok = g === 0;
    if (ok) sess.ok++; else sess.bad++;
    addScore(ok);
    record(q.kind, q.idx, ok);
    var txt = ["記為「已掌握」，權重已降低。", "記為「半熟」，很快會再見到它。", "記為「不會」，權重已拉高，會優先再出現。"][g];
    $("fb").innerHTML += ptsHTML() + '<div class="fb ' + (ok ? "ok" : "no") + '"><span class="tag">已記錄</span>' + txt + "</div>" +
      '<div class="actions"><button class="btn" data-act="next">下一題 →</button></div>';
  }

  function nextQ() { sess.i++; if (sess.over) sess.i = sess.qs.length; render(); }

  function renderResult() {
    if (sess && sess.level) { renderLevelResult(); return; }
    var n = sess.qs.length, acc = n ? Math.round((sess.ok / n) * 100) : 0;
    var missed = S.wrong.length;
    var tip = acc >= 85 ? "這局很順。下一局會把權重壓向還沒掌握的題。"
      : acc >= 60 ? "正常區間。錯的那幾條已經進錯題本，會自動回來找你。"
        : "這局偏難——說明抽到了你沒掌握的題，這正是練到了。別重刷同一塊，回混合局讓系統重新配比。";
    view().innerHTML = '<div class="card"><h2>這局完了</h2><div class="stat">' +
      "<div><b>" + n + "</b><span>題數</span></div><div><b>" + sess.ok + "</b><span>對</span></div>" +
      "<div><b>" + sess.bad + '</b><span>錯／不會</span></div><div><b>' + acc + "%</b><span>正確率</span></div></div>" +
      '<p class="dim small">' + tip + "　錯題本現在有 " + missed + " 條。</p>" +
      '<div class="actions" style="justify-content:flex-start">' +
      '<button class="btn" data-act="again">再來一局</button>' +
      '<button class="btn ghost" data-act="home">回首頁</button>' +
      '<button class="btn ghost" data-act="go" data-v="progress">看進度</button></div></div>';
  }

  /* ---------------- 事件委托（只绑一次） ---------------- */
  view().addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]");
    if (!b) return;
    var act = b.getAttribute("data-act"), v = b.getAttribute("data-v");
    if (act === "start") { b.blur(); if (b.getAttribute("data-all")) { wordCat = "全部"; speakScene = "全部"; } start(b.getAttribute("data-kind"), Number(b.getAttribute("data-n")) || null); }
    else if (act === "play") speak(b.getAttribute("data-text"));
    else if (act === "scene") { drillScene = v; render(); }
    else if (act === "speakscene") { speakScene = v; render(); }
    else if (act === "speaktab") { S.speakTab = v; save(); render(); }
    else if (act === "playdlg") { playDialogue(Number(v)); }
    else if (act === "rec") { recToggle(); }
    else if (act === "lexcat") { lexCat = v; wordCat = v; render(); }
    else if (act === "pairmode") { pairMode = v; render(); }
    else if (act === "lextab") { S.lexTab = v; save(); render(); }
    else if (act === "go") go(v);
    else if (act === "opt") answerOpt(b);
    else if (act === "reveal") revealDrill();
    else if (act === "grade") gradeDrill(Number(v));
    else if (act === "next") nextQ();
    else if (act === "again") start(sess.kind);
    else if (act === "home") go("home");
    else if (act === "lang") { S.aiLang = v; save(); render(); }
    else if (act === "lvl") { var z = findZone(b.getAttribute("data-zone")); if (z) startLevel(z, Number(b.getAttribute("data-li")) || 0); }
    else if (act === "retry") {
      /* 教學關卡（⓪ 區）「再嚟一次」應該直接重測，唔係返去再讀一次 */
      if (sess && sess.level) {
        var rz = findZone(sess.level.zone), rl = rz && rz.levels[sess.level.li];
        if (rl && rl.teach != null) {
          lessonOpen = { zone: rz.id, li: sess.level.li, id: rl.id, name: rl.name, teach: rl.teach };
          startLessonQuiz();
        } else startLevel(rz, sess.level.li);
      }
    }
    else if (act === "place") { if (window.CANTO_AI) { go("ai"); window.CANTO_AI.startPlacement(); } }
    else if (act === "ref") toggleRef(true);
    else if (act === "refclose") toggleRef(false);
    else if (act === "lessonstart") startLessonQuiz();
  });

  document.getElementById("tabs").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-route]");
    if (b) go(b.getAttribute("data-route"));
  });

  document.addEventListener("keydown", function (e) {
    if (!sess || !$("settings").classList.contains("hidden")) return;
    if (/^[1-9]$/.test(e.key)) {
      var o = view().querySelector('.opt[data-v="' + e.key + '"]');
      if (o) o.click();
    } else if (e.key === "Enter" || e.key === " ") {
      var nx = view().querySelector('[data-act="next"]');
      if (nx) { e.preventDefault(); nx.click(); }
    }
  });

  /* ---------------- 设置面板 ---------------- */
  $("btnSettings").onclick = function () { $("settings").classList.remove("hidden"); paintVoiceUI(); };
  $("btnClose").onclick = function () { $("settings").classList.add("hidden"); };
  $("voiceChip").onclick = function () { $("settings").classList.remove("hidden"); paintVoiceUI(); };
  $("btnList").onclick = function () {
    $("voiceListBody").innerHTML = voices.length
      ? voices.map(function (v) { return "• " + esc(v.name) + "　[" + esc(v.lang) + "]" + (v.localService ? " · 本機" : " · 雲端"); }).join("<br>")
      : "一个语音都没读到。若系统里确实装了粤语语音，试试用 Edge 打开本页。";
    $("voiceList").classList.remove("hidden");
  };
  $("btnCloseList").onclick = function () { $("voiceList").classList.add("hidden"); };
  $("btnTest").onclick = function () { speak("唔該，埋單。"); };
  $("voiceSel").onchange = function () { S.settings.voiceURI = this.value; save(); paintVoiceUI(); speak("唔該"); };
  $("rate").oninput = function () { S.settings.rate = Number(this.value); $("rateVal").textContent = Number(this.value).toFixed(2); save(); };
  $("rate").value = S.settings.rate;
  $("rateVal").textContent = Number(S.settings.rate).toFixed(2);
  $("len").oninput = function () { S.settings.len = Number(this.value); $("lenVal").textContent = this.value; save(); };
  $("len").value = S.settings.len;
  $("lenVal").textContent = S.settings.len;
  $("btnReset").onclick = function () {
    if (!confirm("清除全部学习进度（错题本、正确率、连续天数）？内容不受影响。")) return;
    S = blank(); save(); $("settings").classList.add("hidden"); go("home");
  };

  /* ---------------- AI 与语言设置 ---------------- */
  var langSel = $("aiLangSel");
  if (langSel) {
    langSel.value = S.aiLang || "yue";
    langSel.onchange = function () { S.aiLang = this.value; save(); render(); };
  }
  var keySet = $("aiKeySet");
  if (keySet) {
    keySet.value = S.settings.apiKey || "";
    keySet.onchange = function () { S.settings.apiKey = this.value.trim(); save(); };
  }
  var modelSet = $("aiModelSet");
  if (modelSet) {
    modelSet.value = S.settings.apiModel || "deepseek-chat";
    modelSet.onchange = function () { S.settings.apiModel = this.value.trim() || "deepseek-chat"; save(); };
  }
  var asrSet = $("asrLangSel");
  if (asrSet) {
    asrSet.value = S.settings.asrLang || "yue-Hant-HK";
    asrSet.onchange = function () { S.settings.asrLang = this.value; save(); };
  }
  var asSpeak = $("autoSpeakSet");
  if (asSpeak) {
    asSpeak.checked = S.settings.autoSpeak !== false;
    asSpeak.onchange = function () { S.settings.autoSpeak = !!this.checked; save(); };
  }
  var sfxSet = $("sfxSet");
  if (sfxSet) {
    sfxSet.checked = S.settings.sfx !== false;
    if (SFX) SFX.setMute(S.settings.sfx === false);
    sfxSet.onchange = function () {
      S.settings.sfx = !!this.checked; save();
      if (SFX) { SFX.setMute(!this.checked); SFX.play("click"); }
    };
  } else if (SFX) SFX.setMute(S.settings.sfx === false);
  var btnDiag = $("btnDiag");
  if (btnDiag) btnDiag.onclick = function () { selfCheck(); };

  /* ---------------- 一键自检：把「为什么没声音 / 不能说话」变成可见的事实 ---------------- */
  function selfCheck() {
    var out = $("diagOut");
    if (!out) return;
    function row(mark, cls, txt) {
      return '<div class="r"><span class="k ' + cls + '">' + mark + '</span><span class="vv">' + txt + "</span></div>";
    }
    var h = [], tt = window.speechSynthesis;
    h.push(row(tt ? "✓" : "✗", tt ? "ok" : "no", "语音合成 speechSynthesis：" + (tt ? "支持" : "不支持（换 Chrome／Edge 打开）")));
    var n = voices.length;
    h.push(row(n ? "✓" : "✗", n ? "ok" : "no", "读到语音总数：" + n + " 个" + (n ? "" : "（可能还没加载完，等一秒再按一次）")));
    var zh = voices.filter(function (v) {
      var l = (v.lang || "").toLowerCase();
      return l.indexOf("zh") === 0 || l.indexOf("yue") === 0;
    });
    h.push(row("·", "", "中文／粤语语音：" + (zh.length
      ? zh.map(function (v) { return esc(v.name) + " [" + esc(v.lang) + "]"; }).join("、")
      : "一个都没有 —— 这就是「AI 说不出话」的原因之一")));
    var cv = currentVoice();
    h.push(row(cv ? "✓" : "✗", cv ? "ok" : "no", "实际选中的语音：" + (cv
      ? esc(cv.name) + " [" + esc(cv.lang) + "]"
      : "没有选中粤语语音（评分 rank<50），会用系统默认音，多半读普通话或者干脆没声")));
    if (tt) {
      try { speak("唔該，埋單。"); h.push(row("✓", "ok", "测试朗读：已发送「唔該，埋單。」（能听到声音就是通）")); }
      catch (e) { h.push(row("✗", "no", "测试朗读失败：" + esc(String((e && e.message) || e)))); }
    } else h.push(row("✗", "no", "测试朗读：跳过（没有 speechSynthesis）"));
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    h.push(row(SR ? "✓" : "✗", SR ? "ok" : "no", "语音识别（听你说话）：" + (SR
      ? "支持，当前识别语言 " + esc(S.settings.asrLang)
      : "不支持 —— iPhone Safari 打开就会这样，换电脑 Chrome 或 Android Chrome")));
    var MR = !!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    h.push(row(MR ? "✓" : "✗", MR ? "ok" : "no", "录音回放（录音比对）：" + (MR ? "支持" : "不支持，或者要用 https／file:// 打开才有麦克风")));
    var kk = String(S.settings.apiKey || "");
    h.push(row(kk ? "✓" : "✗", kk ? "ok" : "no", "DeepSeek key：" + (kk
      ? "已填（" + kk.length + " 个字符，只存本机）"
      : "未填 —— AI 陪练必须有 key 才会回话，去 platform.deepseek.com 建一个")));
    h.push(row("·", "", "模型 " + esc(S.settings.apiModel || "deepseek-chat") + "　接口 " + esc(S.settings.apiBase || "https://api.deepseek.com") + "　自动朗读 " + (S.settings.autoSpeak !== false ? "开" : "关")));
    out.innerHTML = h.join("") + row("→", "", "搞不定就把这一段截图发我。");
    out.classList.remove("hidden");
  }

  /* ---------------- 启动 ---------------- */
  try {
    initRef();
    go("home");
    if (window.CANTO_AI) window.CANTO_AI.maybeAskPlacement(AICTX);
    loadVoices();
    if ("speechSynthesis" in window) window.speechSynthesis.onvoiceschanged = loadVoices;
    setTimeout(loadVoices, 500);
    setTimeout(loadVoices, 1500);
  } catch (e) {
    bootFail("啟動出錯：" + ((e && e.message) || e));
  }
})();
