/* 粵語升級器 · 遊戲層 UI（段位／關卡地圖／詞卡收集冊／對話 Boss）
   對外：window.CANTO_GAMEUI = { mount, album, passed, rankInfo, levelState, cardOpen, slangOpen, _test }
   ctx（由 app.js 注入）：{ getS, save, esc, speak, go, startLevel, placement, ai } */
(function () {
  var G = window.CANTO_GAME;
  if (!G) return;

  function S(ctx) { var s = ctx.getS(); if (!s.game) s.game = { passed: {}, bosses: {}, stars: {} }; return s; }
  function GAME(ctx) { var s = S(ctx); return s.game; }

  function passed(ctx) {
    var p = GAME(ctx).passed || {}, n = 0, k;
    for (k in p) if (p[k]) n++;
    return n;
  }
  function bossCount(ctx) {
    var b = GAME(ctx).bosses || {}, n = 0, k;
    for (k in b) if (b[k]) n++;
    return n;
  }
  function passedAll(ctx) { return passed(ctx) + bossCount(ctx); }
  function rankInfo(ctx) {
    var n = passedAll(ctx), cur = G.rankOf(n), nx = G.nextRank(n);
    var total = G.levelCount() + G.bosses.length;
    return { passed: n, total: total, rank: cur, next: nx, toNext: nx ? Math.max(0, nx.min - n) : 0 };
  }
  /* 關卡狀態：locked / open / done（同區前一關過了才開） */
  function levelState(ctx, zone, li) {
    var p = GAME(ctx).passed || {};
    if (p[zone.levels[li].id]) return "done";
    if (li === 0) return "open";
    return p[zone.levels[li - 1].id] ? "open" : "locked";
  }
  function cardOpen(ctx, idx) {
    var it = S(ctx).items["word:" + idx];
    return !!(it && (it.ok || 0) >= G.CARD_OK);
  }
  function slangOpen(ctx, i) {
    var r = G.rankIndex(passedAll(ctx));
    return i < (r + 1) * G.slangPerRank;
  }

  /* 星等用 SVG 畫，唔用 ★☆ 字元（避免被當成 emoji，亦唔受字型影響） */
  function starSVG(on) {
    return '<svg viewBox="0 0 12 12"' + (on ? "" : ' class="off"') +
      ' aria-hidden="true"><path d="M6 .9l1.6 3.3 3.6.5-2.6 2.5.6 3.6L6 9.2 2.8 10.8l.6-3.6L.8 4.7l3.6-.5z"/></svg>';
  }

  function starsHTML(n) {
    return '<span class="stars" title="' + n + ' 星">' +
      starSVG(n > 0) + starSVG(n > 1) + starSVG(n > 2) + "</span>";
  }

  function mapHTML(ctx) {
    var e = ctx.esc, ri = rankInfo(ctx), p = GAME(ctx).passed || {}, b = GAME(ctx).bosses || {};
    var rows = (window.CANTO_DATA.lexicon || {}).rows || [], slang = window.CANTO_DATA.slang || [];
    var got = 0, i;
    for (i = 0; i < rows.length; i++) if (cardOpen(ctx, i)) got++;
    for (i = 0; i < slang.length; i++) if (slangOpen(ctx, i)) got++;
    var totalCards = rows.length + slang.length;

    var h = '<div class="rankbar"><div class="rk">' +
      '<div class="rkname">' + e(ri.rank.name) + '</div>' +
      '<div class="rkyue">' + e(ri.rank.yue) + "</div>" +
      '<div class="rkdesc">' + e(ri.rank.desc) + "</div></div>" +
      '<div class="rkprog"><div class="rkline"><b>已通關 ' + ri.passed + " / " + ri.total + "</b>" +
      (ri.next ? '<span class="dim">距離「' + e(ri.next.name) + "」還差 " + ri.toNext + " 關</span>"
        : '<span class="dim">已經係老細，冇嘢好教喇。</span>') + "</div>" +
      '<div class="bar"><i style="width:' + Math.round((ri.passed / ri.total) * 100) + '%"></i></div>' +
      '<div class="chips"><button class="chip" data-act="album">詞卡冊　' + got + " / " + totalCards + "</button>" +
      '<button class="chip" data-act="free">自由練習（八塊）</button>' +
      '<button class="chip" data-act="place">12 題定級測試</button>' +
      '<button class="chip" data-act="ref">粵拼速查</button></div></div></div>';

    G.zones.forEach(function (z, zi) {
      var done = 0, lv = "";
      z.levels.forEach(function (L, li) {
        var st = levelState(ctx, z, li), rec = p[L.id];
        if (st === "done") done++;
        lv += '<button class="lvl ' + st + '"' + (st === "locked" ? " disabled" : "") +
          (st === "locked" ? "" : ' data-act="lvl" data-zone="' + z.id + '" data-li="' + li + '"') + ">" +
          '<span class="lvn">' + (li + 1) + "　" + e(L.name) + "</span>" +
          (st === "locked" ? '<span class="lvs dim">未解鎖</span>'
            : '<span class="lvs">' + (rec ? starsHTML(rec.stars) + "　" + rec.acc + "%" : "　") + "</span>") +
          "</button>";
      });
      h += '<div class="zone"><div class="zh2"><span class="zi">' + e(z.zi != null ? z.zi : (zi + 1)) + "</span>" +
        '<b>' + e(z.name) + "</b>" + (z.life ? '<span class="life">計命</span>' : '<span class="life no">唔計命</span>') +
        '<span class="dim zsub">' + e(z.sub) + "</span></div>" +
        '<div class="zmeta">' + done + " / " + z.levels.length + ' 關通關</div>' +
        '<div class="lvls">' + lv + "</div></div>";
    });

    var boss = "";
    G.bosses.forEach(function (B, bi) {
      var ok = !!b[B.id];
      boss += '<div class="boss' + (ok ? " done" : "") + '"><div class="bn">對話 Boss　' + (bi + 1) + "　" + e(B.name) +
        (ok ? '<span class="okmark">已通過</span>' : "") + "</div>" +
        '<div class="bd">' + e(B.tip) + "</div>" +
        '<div class="actions" style="justify-content:flex-start">' +
        '<button class="btn ghost small" data-act="bossgo" data-v="' + e(B.name) + '">去 ⑦ AI 陪練傾呢個場景</button>' +
        (ok ? "" : '<button class="btn small" data-act="bossclear" data-v="' + B.id + '">傾完喇，打卡</button>') +
        "</div></div>";
    });
    h += '<div class="zone bosszone"><div class="zh2"><span class="zi">7</span><b>AI 對話 Boss 戰</b>' +
      '<span class="dim zsub">要填一次 DeepSeek key；傾夠幾輪再打卡</span></div>' +
      '<div class="bosslist">' + boss + "</div></div>";

    return h;
  }

  function albumHTML(ctx, cat) {
    var e = ctx.esc, L = window.CANTO_DATA.lexicon || {}, rows = L.rows || [], cats = L.cats || [];
    var slang = window.CANTO_DATA.slang || [], h = "", i;
    var isSlang = cat === "俚語";
    var list = isSlang ? slang : rows;
    var got = 0;
    for (i = 0; i < list.length; i++) {
      var open = isSlang ? slangOpen(ctx, i) : cardOpen(ctx, i);
      if (open) got++;
    }
    h += '<div class="albhead"><h1 class="albname">詞卡冊</h1><div class="albmeta">' +
      '<div class="albcount"><b>' + got + " / " + list.length + "</b> 張已收集</div>" +
      '<p class="dim small">蒐集規則：詞庫每條<b>答對 ' + G.CARD_OK +
      " 次</b>開一張卡（做「港式詞彙」關卡或自由練習都會算）；俚語卡按段位開，每升一段開 " + G.slangPerRank + " 張。</p>" +
      '<div class="actions" style="justify-content:flex-start">' +
      ["全部"].concat(cats, ["俚語"]).map(function (c) {
        return '<button class="btn ghost small" data-act="albumcat" data-v="' + e(c) + '"' +
          (c === cat ? ' style="background:rgba(79,185,138,.12)"' : "") + ">" + e(c) + "</button>";
      }).join("") + "</div>" +
      '<p class="dim small">' + (isSlang ? "俚語" : cat === "全部" ? "全部" : cat) + "：" + got + " / " + list.length + " 張已收集</p></div></div>";

    h += '<div class="cardgrid">';
    for (i = 0; i < list.length; i++) {
      var x = list[i], op = isSlang ? slangOpen(ctx, i) : cardOpen(ctx, i);
      if (isSlang) {
        h += '<div class="wcard' + (op ? "" : " lock") + '">' + (op
          ? '<div class="wk">' + e(x.hz) + '</div><div class="wj">' + e(x.jy) + '</div><div class="wn">' + e(x.zh + "　" + x.note) + "</div>"
          : '<div class="wk">？</div><div class="wn">升到「' + e(G.ranks[Math.min(G.ranks.length - 1, Math.floor(i / G.slangPerRank))].name) + "」開呢張卡</div>") +
          "</div>";
      } else {
        h += '<div class="wcard' + (op ? "" : " lock") + '"' + (op ? ' data-act="say" data-text="' + e(x.hk) + '"' : "") + ">" + (op
          ? '<div class="wk">' + e(x.hk) + '</div><div class="wj">' + e(x.jy) + '</div><div class="wn">' + e(x.cn) + "　" + e(x.cat) + "</div>"
          : '<div class="wk">？</div><div class="wn">' + e(x.cat) + "　答對 " + G.CARD_OK + " 次開卡</div>") +
          "</div>";
      }
    }
    h += "</div>";
    return h;
  }

  function bind(el, ctx) {
    if (!el || el.__gBound || !el.addEventListener) return;
    el.__gBound = true;
    el.addEventListener("click", function (ev) {
      var b = ev.target.closest ? ev.target.closest("[data-act]") : null;
      if (!b) return;
      var act = b.getAttribute("data-act"), v = b.getAttribute("data-v"), s = S(ctx);
      if (act === "lvl") {
        var zone = null, i;
        for (i = 0; i < G.zones.length; i++) if (G.zones[i].id === b.getAttribute("data-zone")) zone = G.zones[i];
        if (!zone) return;
        ctx.startLevel(zone, Number(b.getAttribute("data-li")) || 0);
      } else if (act === "album") ctx.go("album");
      else if (act === "free") ctx.go("free");
      else if (act === "place") ctx.placement();
      else if (act === "albumcat") { s.game.albumCat = v; ctx.save(); ctx.render(); }
      else if (act === "say") ctx.speak(b.getAttribute("data-text"));
      else if (act === "bossgo") { ctx.ai(v); }
      else if (act === "bossclear") {
        s.game.bosses = s.game.bosses || {};
        var turns = (s.aiStats && s.aiStats.turns) || 0;
        if (turns < 2 && !window.confirm("你仲未喺 ⑦ 傾過偈（記錄係 " + turns + " 輪）。真係要打卡？")) return;
        s.game.bosses[v] = { at: Date.now(), turns: turns };
        ctx.save();
        if (window.CANTO_SFX) window.CANTO_SFX.play("unlock");
        ctx.render();
      }
      else if (act === "albumback") ctx.go("home");
    });
  }

  window.CANTO_GAMEUI = {
    mount: function (el, ctx) {
      if (!el) return;
      el.innerHTML = mapHTML(ctx);
      bind(el, ctx);
    },
    album: function (el, ctx) {
      if (!el) return;
      var cat = GAME(ctx).albumCat || "全部";
      el.innerHTML = albumHTML(ctx, cat);
      bind(el, ctx);
    },
    passed: passed, rankInfo: rankInfo, levelState: levelState,
    cardOpen: cardOpen, slangOpen: slangOpen,
    _test: { mapHTML: mapHTML, albumHTML: albumHTML, passedAll: passedAll }
  };
})();
