/* 粵語升級器 · 遊戲層內容（段位／關卡地圖／詞卡收集／對話 Boss）
   對外：window.CANTO_GAME = { ranks, zones, bosses, FAST, rankOf, nextRank, starFor, ratingFor,
                              resolvePool, CARD_OK, slangPerRank, totalCards }
   純資料 + 純函式：不碰 DOM、不碰 localStorage（方便 _verify.js 直接驗）。
   設計約束（沿用使用者偏好）：不做打卡、不做連續天數；連擊只在一局之內；段位只升不降。 */
(function () {
  /* 段位：茶客 → 伙記 → 樓面 → 大廚 → 老細（依「已通關關卡數」，含 Boss 戰） */
  var ranks = [
    { name: "茶客", min: 0, yue: "caa4 haak3", desc: "入得茶樓，識聽唔識叫。" },
    { name: "伙記", min: 4, yue: "fo2 gei3", desc: "識落單、識答「係咁先」，講嘢仲有書面味。" },
    { name: "樓面", min: 9, yue: "lau4 min2", desc: "茶餐廳暢通，語氣詞開始順。" },
    { name: "大廚", min: 15, yue: "daai6 cyu4", desc: "聲調穩、詞夠地道，本地人唔會即刻聽出你係外地。" },
    { name: "老細", min: 21, yue: "lou5 sai3", desc: "全場通關，講嘢有港味，連 AI 都拗你唔過。" }
  ];

  /* 哪些題型「快答」——只有這些答錯會扣命、才計連擊（使用者選 A：練耳朵的題不罰） */
  var FAST = { drill: 1, word: 1, usage: 1, oral: 1 };

  /* 關卡地圖：每一 zone 有若干關（level）。pool 用規則描述，由 resolvePool 展開成題目清單。 */
  var zones = [
    {
      id: "tone", name: "聲調校準", sub: "調號 ↔ 音高，整個地基", life: false,
      levels: [
        { id: "tone1", name: "兩調對比", pool: { kind: "tone", from: 0, to: 7 }, n: 8 },
        { id: "tone2", name: "三調分辨", pool: { kind: "tone", from: 8, to: 15 }, n: 8 },
        { id: "tone3", name: "六調全開", pool: { kind: "tone", from: 16, to: 23 }, n: 8 }
      ]
    },
    {
      id: "pair", name: "音素顆粒", sub: "aam/am、-p/-t/-k、ng-、n-/l-", life: false,
      levels: [
        { id: "pair1", name: "長短元音", pool: { kind: "pair", from: 0, to: 6 }, n: 7 },
        { id: "pair2", name: "入聲韻尾", pool: { kind: "pair", from: 7, to: 13 }, n: 7 },
        { id: "pair3", name: "聲母難點", pool: { kind: "pair", from: 14, to: 19 }, n: 6 }
      ]
    },
    {
      id: "drill", name: "主動提取", sub: "中文 → 粵語，修那條斷掉的單向通路", life: true,
      levels: [
        { id: "drill1", name: "職場", pool: { kind: "drill", scene: "職場" }, n: 10 },
        { id: "drill2", name: "茶餐廳", pool: { kind: "drill", scene: "茶餐廳" }, n: 9 },
        { id: "drill3", name: "出行", pool: { kind: "drill", scene: "出行" }, n: 5 },
        { id: "drill4", name: "社交", pool: { kind: "drill", scene: "社交" }, n: 10 }
      ]
    },
    {
      id: "usage", name: "語用地道", sub: "唔該／多謝、語氣詞、語序、懶音", life: true,
      levels: [
        { id: "usage1", name: "禮貌與稱呼", pool: { kind: "usage", from: 0, to: 5 }, n: 6 },
        { id: "usage2", name: "語氣詞", pool: { kind: "usage", from: 6, to: 11 }, n: 6 },
        { id: "usage3", name: "語序與體標記", pool: { kind: "usage", from: 12, to: 17 }, n: 6 }
      ]
    },
    {
      id: "word", name: "港式詞彙（295 條）", sub: "認得但講唔出 → 逼自己講出來", life: true,
      levels: [
        { id: "word1", name: "職場", pool: { kind: "word", cat: "職場" }, n: 10 },
        { id: "word2", name: "茶餐廳", pool: { kind: "word", cat: "茶餐廳" }, n: 10 },
        { id: "word3", name: "出行", pool: { kind: "word", cat: "出行" }, n: 10 },
        { id: "word4", name: "社交", pool: { kind: "word", cat: "社交" }, n: 10 },
        { id: "word5", name: "日常起居", pool: { kind: "word", cat: "日常起居" }, n: 10 },
        { id: "word6", name: "形容與時間", pool: { kind: "word", cat: "形容與時間" }, n: 10 }
      ]
    },
    {
      id: "speak", name: "講嘢（口語輸出）", sub: "先出聲，再揭曉，可以錄音比對", life: false,
      levels: [
        { id: "speak1", name: "跟讀熱身", pool: { kind: "shadow", from: 0, to: 8 }, n: 8 },
        { id: "speak2", name: "跟讀進階", pool: { kind: "shadow", from: 9, to: 17 }, n: 8 },
        { id: "speak3", name: "跟讀收尾", pool: { kind: "shadow", from: 18, to: 25 }, n: 8 },
        { id: "speak4", name: "語氣詞實戰", pool: { kind: "oral", from: 0, to: 13 }, n: 8 },
        { id: "speak5", name: "對話接龍", pool: { kind: "role", from: 0, to: 11 }, n: 8 }
      ]
    }
  ];

  /* 對話 Boss 戰：去 ⑦ AI 陪練跟指定的香港人場景聊，聊夠再返來打卡 */
  var bosses = [
    { id: "boss1", name: "茶餐廳落單", scene: "茶餐廳落單", need: 4, tip: "叫一個餐、加底、少甜，最後埋單。唔好講書面語。" },
    { id: "boss2", name: "公司茶水間", scene: "公司茶水間", need: 5, tip: "同同事傾兩句工作量，用「搞掂」「跟手」「聽日先」。" },
    { id: "boss3", name: "街市買餸", scene: "街市買餸", need: 6, tip: "問價、講貴、講要半斤、講唔使搭。" }
  ];

  /* 詞卡收集：lexicon 每條答對 2 次開卡；俚語卡按段位開（每升一段開 3 張） */
  var CARD_OK = 2;
  var slangPerRank = 3;

  /* 純函式：把 pool 規則展開成 IDX 裡的原始題目清單（回傳 [{kind, i, x}]） */
  function resolvePool(pool, IDX) {
    var kind = pool.kind, arr = (IDX && IDX[kind]) || [], out = [], i, x;
    for (i = 0; i < arr.length; i++) {
      x = arr[i];
      if (pool.from != null && i < pool.from) continue;
      if (pool.to != null && i > pool.to) continue;
      if (pool.scene != null && x.scene !== pool.scene) continue;
      if (pool.cat != null && x.cat !== pool.cat) continue;
      out.push({ kind: kind, i: i, x: x });
    }
    return out;
  }

  function rankIndex(passed) {
    var idx = 0, i;
    for (i = 0; i < ranks.length; i++) if (passed >= ranks[i].min) idx = i;
    return idx;
  }
  function rankOf(passed) { return ranks[rankIndex(passed)]; }
  function nextRank(passed) { return ranks[rankIndex(passed) + 1] || null; }

  /* 一關的成績：pass ≥ 0.7；星 3 = 全對、2 = ≥0.85、1 = 過關 */
  function starFor(acc) {
    if (acc >= 1) return 3;
    if (acc >= 0.85) return 2;
    if (acc >= 0.7) return 1;
    return 0;
  }
  function ratingFor(acc) {
    if (acc >= 1) return "S";
    if (acc >= 0.85) return "A";
    if (acc >= 0.7) return "B";
    if (acc >= 0.5) return "C";
    return "D";
  }

  function levelCount() {
    var n = 0, i;
    for (i = 0; i < zones.length; i++) n += zones[i].levels.length;
    return n;
  }
  function totalCards() {
    var L = (window.CANTO_DATA && window.CANTO_DATA.lexicon) || {};
    var rows = L.rows || [], slang = (window.CANTO_DATA && window.CANTO_DATA.slang) || [];
    return rows.length + slang.length;
  }

  window.CANTO_GAME = {
    ranks: ranks, zones: zones, bosses: bosses, FAST: FAST,
    CARD_OK: CARD_OK, slangPerRank: slangPerRank,
    rankIndex: rankIndex, rankOf: rankOf, nextRank: nextRank,
    starFor: starFor, ratingFor: ratingFor, resolvePool: resolvePool,
    levelCount: levelCount, totalCards: totalCards
  };
})();
