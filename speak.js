/* ============================================================
   粵語升級器 · 口語層（講嘢）  speak.js
   只放內容，不放邏輯。改一行刷新即生效。
   所有粤拼都用 LSHK 粵拼；變調按香港人實際講法寫。

   字段约定：
     oralQuiz  { q, opts[], ans, why }            語氣詞／口語替換選擇題
     shadow    { scene, hk, jy, zh, tip }         跟讀句（先聽，再出聲跟）
     particles { hz, jy, use, ex, exJy, exZh }    語氣詞表
     tips      { t, d, ex, jy }                   港味口語習慣
     dialogues { title, scene, turns:[{ s:"o"|"y", hk, jy, zh, tip }] }
   派生：
     roleTurns —— 把每個對話裡「你的台詞」抽成可抽樣的題目（每條都帶著對方上一句）
   ============================================================ */
window.CANTO_DATA = window.CANTO_DATA || {};

window.CANTO_DATA.speak = {
  /* ---------- 語氣詞／口語替換選擇題 ---------- */
  oralQuiz: [
    { q: "只是開玩笑而已 → 講笑（　）", opts: ["啫", "喇", "添", "咩"], ans: "啫", why: "啫＝而已、只是，把話說小；港味最重的小詞之一。" },
    { q: "再吃一碗 → 食多碗（　）", opts: ["添", "啫", "囉", "㗎"], ans: "添", why: "添＝還、再，放句末。要「再來一碗」就靠它。" },
    { q: "下雨了（提醒你快帶傘）→ 落雨（　）", opts: ["喎", "咩", "嘅", "啫"], ans: "喎", why: "喎＝提醒你一個新消息，等於「我告訴你哦」。" },
    { q: "你不去嗎？（帶點意外）→ 你唔去（　）", opts: ["咩", "喇", "添", "嘛"], ans: "咩", why: "咩＝疑問＋意外，比單說「你唔去呀」更有「不是吧」的味道。" },
    { q: "就是這樣的（強調事實）→ 係咁（　）", opts: ["㗎", "啩", "啫", "囉"], ans: "㗎", why: "㗎＝強調事實、也可能是反駁，「本來就是這樣」。" },
    { q: "沒辦法啦 → 冇（　）", opts: ["囉", "添", "咩", "㗎"], ans: "囉", why: "囉＝就是這樣、無可奈何，帶點攤手。" },
    { q: "快走吧（催促）→ 走（　）", opts: ["啦", "喇", "嘅", "添"], ans: "啦", why: "啦＝建議、催促、讓步；比「喇」輕、更口語。" },
    { q: "應該是吧（猜測）→ 應該係（　）", opts: ["啩", "㗎", "啫", "喇"], ans: "啩", why: "啩＝大概吧，用來把話說得不那麼肯定。" },
    { q: "我吃過飯了 → 我食咗飯（　）", opts: ["喇", "咩", "啫", "添"], ans: "喇", why: "喇＝情況已經變了，普通話常對應「了」。" },
    { q: "本來就是你說的那樣 → 你話嘅（　）", opts: ["嘛", "咩", "啩", "添"], ans: "嘛", why: "嘛＝「不是嗎、本來就是」，用來堵對方的嘴。" },
    { q: "你有沒有時間？→ 你（　）時間？", opts: ["有冇", "有唔有", "係唔係有", "有冇得"], ans: "有冇", why: "粵語問「有沒有」用正反問「有冇」，不是「有唔有」。" },
    { q: "給我一本 →（　）一本我", opts: ["畀", "給", "把", "拿"], ans: "畀", why: "畀（bei2）＝給。粵語口語不說「給」。" },
    { q: "這個多少錢？→ 呢個（　）錢？", opts: ["幾多", "多少", "幾", "好幾"], ans: "幾多", why: "問數量用「幾多」；「幾」要接量詞（幾錢、幾個人）。" },
    { q: "你吃了飯沒有？→ 你食咗飯（　）？", opts: ["未", "冇", "唔", "咗"], ans: "未", why: "「未」放句末＝還沒有？，這是最地道的完成體問法。" }
  ],

  /* ---------- 跟讀句（先聽，再大聲跟） ---------- */
  shadow: [
    { scene: "職場", hk: "唔使急，最緊要快。", jy: "m4 sai2 gap1 zeoi3 gan2 jiu3 faai3", zh: "不用急，最重要是快。", tip: "「唔使」＝不用，「最緊要」＝最重要。這句是港式幽默的典型，說出來立刻有港味。" },
    { scene: "職場", hk: "唔好意思，阻你一分鐘。", jy: "m4 hou2 ji3 si1 zo2 nei5 jat1 fan1 zung1", zh: "不好意思，耽誤你一分鐘。", tip: "職場打擾人一定要先「唔好意思」，直接講事會顯得失禮。" },
    { scene: "職場", hk: "我而家跟緊，下晝覆你。", jy: "ngo5 ji4 gaa1 gan1 gan2 haa6 zau3 fuk1 nei5", zh: "我現在跟進，下午回覆你。", tip: "「跟緊」＝正在跟進（緊＝正在）；「下晝」＝下午，「覆」＝回覆。" },
    { scene: "職場", hk: "收到，冇問題。", jy: "sau1 dou3 mou5 man6 tai4", zh: "收到，沒問題。", tip: "職場萬能回應。比「明白」更常用、更短。" },
    { scene: "職場", hk: "唔係咁嘅意思，你聽我講先。", jy: "m4 hai6 gam3 ge3 ji3 si1 nei5 teng1 ngo5 gong2 sin1", zh: "不是這個意思，你先聽我說。", tip: "句末「先」把語氣放軟，等於「你先聽我說完」。" },
    { scene: "職場", hk: "開會前大家先睇睇份文件。", jy: "hoi1 wui2 cin4 daai6 gaa1 sin1 tai2 tai2 fan6 man4 gin2", zh: "開會前大家先看看這份文件。", tip: "「睇睇」＝看一下（疊動詞表「短暫」）；「份」是文件的量詞。" },
    { scene: "職場", hk: "呢排做到冇停手。", jy: "ni1 paai4 zou6 dou3 mou5 ting4 sau2", zh: "最近忙得停不下來。", tip: "「呢排」＝最近這段時間，比「最近」地道得多。" },
    { scene: "茶餐廳", hk: "唔該，埋單。", jy: "m4 goi1 maai4 daan1", zh: "勞駕，結帳。", tip: "結帳、叫人做事一律用「唔該」；「多謝」是收禮物才說的。" },
    { scene: "茶餐廳", hk: "凍檸茶少甜，唔該。", jy: "dung3 ning2 caa4 siu2 tim4 m4 goi1", zh: "冰檸檬茶少糖，謝謝。", tip: "「少甜」是茶餐廳標準術語；完全不加糖叫「走甜」。" },
    { scene: "茶餐廳", hk: "有冇餐蛋麵？", jy: "jau5 mou5 caan1 daan2 min6", zh: "有沒有餐蛋麵？", tip: "「有冇」＝有沒有，粵語問句的核心正反問格式。" },
    { scene: "茶餐廳", hk: "唔要蔥，唔該。", jy: "m4 jiu3 cung1 m4 goi1", zh: "不要蔥，謝謝。", tip: "「唔要」比「唔需要」自然一百倍。" },
    { scene: "茶餐廳", hk: "呢度食定拎走？", jy: "ni1 dou6 sik6 ding6 ling1 zau2", zh: "在這裡吃還是帶走？", tip: "「定」＝還是；「拎走」＝外帶、打包。" },
    { scene: "茶餐廳", hk: "好好食呀，下次再嚟。", jy: "hou2 hou2 sik6 aa3 haa6 ci3 zoi3 lai4", zh: "很好吃，下次再來。", tip: "粵語說「食」不說「吃」；「好好食」＝非常好吃。" },
    { scene: "出行", hk: "唔該借借。", jy: "m4 goi1 ze3 ze3", zh: "借過一下。", tip: "地鐵、電梯裡最實用的一句，兩個「借」疊著說。" },
    { scene: "出行", hk: "請問地鐵站點行？", jy: "cing2 man6 dei6 tit3 zaam6 dim2 haang4", zh: "請問地鐵站怎麼走？", tip: "「點行」＝怎麼走。問路開頭加「請問」或「唔好意思」。" },
    { scene: "出行", hk: "唔好意思，我落錯車。", jy: "m4 hou2 ji3 si1 ngo5 lok6 co3 ce1", zh: "不好意思，我下錯車了。", tip: "「落車」＝下車，粵語不用「下車」。" },
    { scene: "出行", hk: "呢班車去唔去中環？", jy: "ni1 baan1 ce1 heoi3 m4 heoi3 zung1 waan4", zh: "這班車去不去中環？", tip: "「去唔去」這種正反問句是粵語標誌，比「去不去」自然。" },
    { scene: "出行", hk: "我行過去就得。", jy: "ngo5 haang4 gwo3 heoi3 zau6 dak1", zh: "我走過去就行。", tip: "「就得」＝就可以了，讓步、輕鬆的語氣。" },
    { scene: "出行", hk: "差唔多到喇。", jy: "caa1 m4 do1 dou3 laa3", zh: "差不多到了。", tip: "「差唔多」＝差不多；句末「喇」表示狀態變化。" },
    { scene: "社交", hk: "得閒飲茶。", jy: "dak1 haan4 jam2 caa4", zh: "有空喝茶。", tip: "香港的告別語，不等於真的要約你——跟「下次見」差不多。" },
    { scene: "社交", hk: "你最近點呀？", jy: "nei5 zeoi3 gan6 dim2 aa3", zh: "你最近怎麼樣？", tip: "「點」＝怎麼樣；加「呀」語氣變軟，適合聊天開場。" },
    { scene: "社交", hk: "好耐冇見，你瘦咗喎。", jy: "hou2 noi6 mou5 gin3 nei5 sau3 zo2 wo3", zh: "好久不見，你瘦了。", tip: "「好耐」＝很久；「喎」＝我注意到這件事，帶著關心。" },
    { scene: "社交", hk: "唔好意思，我今日真係唔得閒。", jy: "m4 hou2 ji3 si1 ngo5 gam1 jat6 zan1 hai6 m4 dak1 haan4", zh: "不好意思，我今天真的沒空。", tip: "拒絕要留餘地。先道歉再拒絕，比單說「我唔得閒」軟很多。" },
    { scene: "社交", hk: "係囉，我都覺得係。", jy: "hai6 lo1 ngo5 dou1 gok3 dak1 hai6", zh: "是啊，我也這麼覺得。", tip: "「係囉」＝附和、就是啊。聊天接話必備，比「對」自然。" },
    { scene: "社交", hk: "慢慢嚟，唔急。", jy: "maan6 maan2 lai4 m4 gap1", zh: "慢慢來，不急。", tip: "「嚟」＝來。安慰人時這句話很好用。" },
    { scene: "社交", hk: "我好攰，想唞下。", jy: "ngo5 hou2 gui6 soeng2 tau2 haa5", zh: "我很累，想休息一下。", tip: "「攰」（gui6）＝累、「唞」（tau2）＝休息。這兩個字是港味核心，普通話沒有對應字。" }
  ],

  /* ---------- 語氣詞表 ---------- */
  particles: [
    { hz: "喇", jy: "laa3", use: "情況已經變了／已經發生，常對應普通話的「了」；也可以催人。", ex: "我食咗飯喇。", exJy: "ngo5 sik6 zo2 faan6 laa3", exZh: "我吃過飯了。" },
    { hz: "啦", jy: "laa1", use: "建議、催促、讓步；比「喇」輕，語氣更軟。", ex: "走啦，唔好等佢。", exJy: "zau2 laa1 m4 hou2 dang2 keoi5", exZh: "走吧，別等他了。" },
    { hz: "囉", jy: "lo1", use: "就是這樣、無可奈何、理所當然，帶點攤手。", ex: "冇囉，我都冇辦法。", exJy: "mou5 lo1 ngo5 dou1 mou5 baan6 faat3", exZh: "沒有啊，我也沒辦法。" },
    { hz: "㗎", jy: "gaa3", use: "強調事實或反駁，等於「本來就是」。", ex: "係咁㗎，唔到你話事。", exJy: "hai6 gam3 gaa3 m4 dou3 nei5 waa6 si6", exZh: "就是這樣的，輪不到你決定。" },
    { hz: "咩", jy: "me1", use: "疑問＋意外，帶「不是吧」的味道。", ex: "你唔去咩？", exJy: "nei5 m4 heoi3 me1", exZh: "你不去嗎？" },
    { hz: "喎", jy: "wo3", use: "提醒對方一個新消息；也表示「我注意到」。", ex: "落雨喎，帶遮呀。", exJy: "lok6 jyu5 wo3 daai3 ze1 aa3", exZh: "下雨了，帶傘吧。" },
    { hz: "嘛", jy: "maa3", use: "本來就是、不是嗎，用來堵對方的話。", ex: "你話嘅嘛。", exJy: "nei5 waa6 ge3 maa3", exZh: "是你說的嘛。" },
    { hz: "啫", jy: "ze1", use: "而已、只是，把話說小。", ex: "講笑啫，唔好嬲。", exJy: "gong2 siu3 ze1 m4 hou2 nau1", exZh: "開玩笑而已，別生氣。" },
    { hz: "添", jy: "tim1", use: "還、再，放在句末。", ex: "食多碗添。", exJy: "sik6 do1 wun2 tim1", exZh: "再吃一碗。" },
    { hz: "啩", jy: "gwaa3", use: "猜測，等於「大概吧」。", ex: "佢應該到咗啩。", exJy: "keoi5 jing1 goi1 dou3 zo2 gwaa3", exZh: "他應該到了吧。" },
    { hz: "嘅", jy: "ge3", use: "所屬（我的）或肯定語氣。", ex: "呢個係我嘅。", exJy: "ni1 go3 hai6 ngo5 ge3", exZh: "這個是我的。" },
    { hz: "先", jy: "sin1", use: "「先」放在動詞後面（普通話放前面）；也表示等一下才。", ex: "我走先喇。", exJy: "ngo5 zau2 sin1 laa3", exZh: "我先走了。" }
  ],

  /* ---------- 港味口語習慣 ---------- */
  tips: [
    { t: "語氣詞是港味的總開關", d: "同一句話，加不加句末語氣詞就是「背書」和「講嘢」的差別。喇／囉／㗎／咩／喎／啫／添／啩 這八個先練熟。", ex: "係咁（　）→ 係咁㗎", jy: "hai6 gam3 gaa3" },
    { t: "副詞放在動詞後面", d: "「先、多、少、晒、埋」都掛在動詞或句末，不要按普通話的順序放前面。", ex: "你先走 → 你走先", jy: "nei5 zau2 sin1" },
    { t: "時間詞用本地說法", d: "而家＝現在、呢排＝最近、頭先＝剛才、琴日＝昨天、聽日＝明天、下晝＝下午。", ex: "我而家跟緊", jy: "ngo5 ji4 gaa1 gan1 gan2" },
    { t: "「唔使」取代「唔需要」", d: "愈短愈地道。唔使急、唔使客氣、唔使咁緊張。", ex: "唔使急，最緊要快", jy: "m4 sai2 gap1 zeoi3 gan2 jiu3 faai3" },
    { t: "問句用正反問", d: "有冇、得唔得、係唔係、去唔去——這是最粵語的問法，不要說「有沒有」。", ex: "你有冇時間？", jy: "nei5 jau5 mou5 si4 gaan3" },
    { t: "萬能動詞：搵、搞、傾、攞", d: "搵＝找、搞＝弄（搞掂＝搞定）、傾＝談（傾偈＝聊天）、攞＝拿（攞籌＝取號）。", ex: "有問題隨時搵我", jy: "jau5 man6 tai4 ceoi4 si4 wan2 ngo5" },
    { t: "稱呼帶職銜或「阿」", d: "陳生、陳太、張小姐；朋友之間用「阿」＋名（阿明、阿玲）。", ex: "陳生，唔好意思", jy: "can4 saang1 m4 hou2 ji3 si1" },
    { t: "拒絕要留餘地", d: "先道歉、再拒絕、句末加個軟語氣詞。不要只丟一句「唔得閒」。", ex: "唔好意思，我今日唔得閒喎", jy: "m4 hou2 ji3 si1 ngo5 gam1 jat6 m4 dak1 haan4 wo3" },
    { t: "不要直譯普通話的虛詞", d: "正在 → 緊（佢打緊電話）；被 → 畀；把 → 將；的 → 嘅。直譯就會立刻露餡。", ex: "佢打緊電話", jy: "keoi5 daa2 gan2 din6 waa2" },
    { t: "省略主語和量詞很正常", d: "「食咗飯未？」「得閒飲茶」都不帶主語。說全了反而像課本。", ex: "食咗飯未？", jy: "sik6 zo2 faan6 mei6" },
    { t: "疊動詞表示「一下」", d: "睇睇、諗諗、等等——把動作說短、說輕。", ex: "畀我睇睇", jy: "bei2 ngo5 tai2 tai2" },
    { t: "入聲尾音一定要收住", d: "-p/-t/-k 的短促收尾（食 sik6、一 jat1、十 sap6）收不住，是最容易聽出「不是本地人」的地方。", ex: "一齊食飯", jy: "jat1 cai4 sik6 faan6" }
  ],

  /* ---------- 情境對話（o = 對方，y = 你） ---------- */
  dialogues: [
    {
      title: "茶餐廳落單",
      scene: "茶餐廳",
      turns: [
        { s: "o", hk: "幾位呀？", jy: "gei2 wai2 aa3", zh: "幾位？", tip: "「位」是人的量詞。" },
        { s: "y", hk: "一位，唔該。", jy: "jat1 wai2 m4 goi1", zh: "一位，謝謝。", tip: "「唔該」用在對方為你服務時。" },
        { s: "o", hk: "坐呢邊啦。", jy: "co5 ni1 bin1 laa1", zh: "坐這邊吧。", tip: "句末「啦」＝建議。" },
        { s: "y", hk: "唔該。有冇餐蛋麵？", jy: "m4 goi1 jau5 mou5 caan1 daan2 min6", zh: "謝謝。有沒有餐蛋麵？", tip: "「有冇」正反問。" },
        { s: "o", hk: "有。要凍檸茶定熱奶茶？", jy: "jau5 jiu3 dung3 ning2 caa4 ding6 jit6 naai5 caa4", zh: "有。要冰檸茶還是熱奶茶？", tip: "「定」＝還是（二選一）。" },
        { s: "y", hk: "凍檸茶，少甜。", jy: "dung3 ning2 caa4 siu2 tim4", zh: "冰檸茶，少糖。", tip: "「少甜」＝少糖，「走甜」＝不加糖。" }
      ]
    },
    {
      title: "茶水間交代工作",
      scene: "職場",
      turns: [
        { s: "o", hk: "呢份嘢今日下晝要。", jy: "ni1 fan6 je5 gam1 jat6 haa6 zau3 jiu3", zh: "這份東西今天下午要。", tip: "「嘢」＝東西、事情，萬能詞。" },
        { s: "y", hk: "收到，我而家跟緊。", jy: "sau1 dou3 ngo5 ji4 gaa1 gan1 gan2", zh: "收到，我現在跟進。", tip: "「而家」＝現在；「緊」＝正在。" },
        { s: "o", hk: "有問題隨時搵我。", jy: "jau5 man6 tai4 ceoi4 si4 wan2 ngo5", zh: "有問題隨時找我。", tip: "「搵」＝找。" },
        { s: "y", hk: "好呀，唔該晒。", jy: "hou2 aa3 m4 goi1 saai3", zh: "好的，太感謝了。", tip: "「晒」＝完全、全部，掛在動詞後面。" },
        { s: "o", hk: "唔使客氣，大家咁話。", jy: "m4 sai2 haak3 hei3 daai6 gaa1 gam3 waa6", zh: "別客氣，彼此彼此。", tip: "「大家咁話」是固定的客套回應。" },
        { s: "y", hk: "一於咁話。", jy: "jat1 jyu1 gam3 waa6", zh: "就這麼說定。", tip: "「一於」＝就這麼定了。" }
      ]
    },
    {
      title: "街頭問路",
      scene: "出行",
      turns: [
        { s: "y", hk: "唔好意思，請問地鐵站點行？", jy: "m4 hou2 ji3 si1 cing2 man6 dei6 tit3 zaam6 dim2 haang4", zh: "不好意思，請問地鐵站怎麼走？", tip: "問路先「唔好意思」，再「請問」。" },
        { s: "o", hk: "直行，見到第二個路口轉左。", jy: "zik6 haang4 gin3 dou3 dai6 ji6 go3 lou6 hau2 zyun3 zo2", zh: "直走，看到第二個路口左轉。", tip: "「轉左」＝左轉（不是「左轉」的語序）。" },
        { s: "y", hk: "遠唔遠㗎？", jy: "jyun5 m4 jyun5 gaa3", zh: "遠不遠？", tip: "「遠唔遠」正反問＋「㗎」問事實。" },
        { s: "o", hk: "行五分鐘度。", jy: "haang4 ng5 fan1 zung1 dou6", zh: "走五分鐘左右。", tip: "「度」放在數量後面＝大約。" },
        { s: "y", hk: "唔該晒你。", jy: "m4 goi1 saai3 nei5", zh: "太感謝你了。", tip: "「唔該晒」比「唔該」更重的道謝。" },
        { s: "o", hk: "唔使客氣。", jy: "m4 sai2 haak3 hei3", zh: "別客氣。", tip: "回應道謝的標準句。" }
      ]
    },
    {
      title: "同朋友傾偈",
      scene: "社交",
      turns: [
        { s: "o", hk: "你今日點呀？", jy: "nei5 gam1 jat6 dim2 aa3", zh: "你今天怎麼樣？", tip: "「點」＝怎麼樣。" },
        { s: "y", hk: "麻麻地啫，做到好攰。", jy: "maa4 maa2 dei2 ze1 zou6 dou3 hou2 gui6", zh: "一般般而已，累死了。", tip: "「麻麻地」＝一般般；「啫」把話說小。" },
        { s: "o", hk: "咁你今晚早啲瞓啦。", jy: "gam3 nei5 gam1 maan5 zou2 di1 fan3 laa1", zh: "那你今晚早點睡吧。", tip: "「早啲」＝早一點；「瞓」＝睡。" },
        { s: "y", hk: "係囉，今晚唔捱夜喇。", jy: "hai6 lo1 gam1 maan5 m4 ngaai4 je6 laa3", zh: "是啊，今晚不熬夜了。", tip: "「係囉」＝附和；「捱夜」＝熬夜。" },
        { s: "o", hk: "身體緊要呀。", jy: "san1 tai2 gan2 jiu3 aa3", zh: "身體要緊。", tip: "「緊要」＝要緊、重要。" },
        { s: "y", hk: "知喇，多謝你。", jy: "zi1 laa3 do1 ze6 nei5", zh: "知道了，謝謝你。", tip: "對方是出於關心（心送過來），所以用「多謝」不用「唔該」。" }
      ]
    }
  ]
};

/* 派生：把每個對話裡「你的台詞」抽成獨立可抽樣的題目，每條帶著對方上一句 */
(function (SP) {
  SP.roleTurns = [];
  SP.dialogues.forEach(function (d) {
    d.turns.forEach(function (t, i) {
      if (t.s !== "y") return;
      var prev = d.turns[i - 1];
      SP.roleTurns.push({
        d: d.title,
        scene: d.scene,
        opener: i === 0,
        prevHk: prev ? prev.hk : "",
        prevJy: prev ? prev.jy : "",
        hk: t.hk,
        jy: t.jy,
        zh: t.zh,
        tip: t.tip || ""
      });
    });
  });
})(window.CANTO_DATA.speak);
