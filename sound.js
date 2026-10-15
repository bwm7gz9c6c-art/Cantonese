/* 粵語升級器 · 音效層（WebAudio 現場合成，零素材、零依賴、可靜音）
   對外：window.CANTO_SFX = { play(name), setMute(bool), muted(), names }
   設計原則：不載入任何音檔；不在使用者第一次點擊前建立 AudioContext（瀏覽器會擋）。 */
(function () {
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, muted = false;

  function ac() {
    if (!AC) return null;
    if (!ctx) { try { ctx = new AC(); } catch (e) { return null; } }
    if (ctx && ctx.state === "suspended" && ctx.resume) { try { ctx.resume(); } catch (e) {} }
    return ctx;
  }

  /* 一個音：頻率、起始時間（秒，相對現在）、長度、波形、音量 */
  function beep(freq, at, len, type, vol) {
    var c = ac(); if (!c) return;
    var t0 = c.currentTime + at;
    var osc = c.createOscillator(), g = c.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.16, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    osc.connect(g); g.connect(c.destination);
    osc.start(t0); osc.stop(t0 + len + 0.02);
  }

  /* 一組音符：[頻率, 起始, 長度, 波形, 音量] */
  function seq(notes) {
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      beep(n[0], n[1], n[2], n[3] || "sine", n[4] == null ? 0.16 : n[4]);
    }
  }

  var BANK = {
    right: [[784, 0, 0.09, "sine", 0.14], [1175, 0.07, 0.13, "sine", 0.12]],
    wrong: [[196, 0, 0.16, "sawtooth", 0.10], [155, 0.10, 0.22, "sawtooth", 0.09]],
    combo: [[1046, 0, 0.07, "triangle", 0.11], [1318, 0.06, 0.07, "triangle", 0.11], [1568, 0.12, 0.12, "triangle", 0.10]],
    win: [[523, 0, 0.12], [659, 0.11, 0.12], [784, 0.22, 0.14], [1046, 0.34, 0.28, "sine", 0.15]],
    lose: [[392, 0, 0.18, "triangle", 0.11], [330, 0.16, 0.20, "triangle", 0.11], [262, 0.34, 0.34, "triangle", 0.10]],
    unlock: [[659, 0, 0.10, "sine", 0.12], [880, 0.09, 0.10, "sine", 0.12], [1319, 0.18, 0.22, "sine", 0.12]],
    click: [[520, 0, 0.045, "square", 0.05]]
  };

  window.CANTO_SFX = {
    names: Object.keys(BANK),
    play: function (name) {
      if (muted) return false;
      var s = BANK[name]; if (!s) return false;
      seq(s); return true;
    },
    setMute: function (b) { muted = !!b; },
    muted: function () { return muted; }
  };
})();
