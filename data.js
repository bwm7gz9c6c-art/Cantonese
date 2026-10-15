/* ============================================================
   粵語升級器 · 内容层
   ------------------------------------------------------------
   粤拼（Jyutping）按香港语言学学会方案。
   这里只收录高频、读音无争议的词，避开多音字。
   发现音标有误 → 直接改本文件对应行，刷新浏览器即生效。
   写法约定：hz = 粤语汉字（繁体，跟香港字幕一致）
             jy = 粤拼        zh = 普通话说法
   ============================================================ */

window.CANTO_DATA = {

  /* ---------- 0. 六声基准表 ---------- */
  toneTable: [
    { n: 1, name: "陰平", contour: "高平 55", ex: "詩", jy: "si1", anchor: "唔該嘅「該」goi1", shape: "high-flat" },
    { n: 2, name: "陰上", contour: "高升 35", ex: "史", jy: "si2", anchor: "幾多嘅「幾」gei2", shape: "high-rise" },
    { n: 3, name: "陰去", contour: "中平 33", ex: "試", jy: "si3", anchor: "凍奶茶嘅「凍」dung3", shape: "mid-flat" },
    { n: 4, name: "陽平", contour: "低降 21", ex: "時", jy: "si4", anchor: "而家嘅「而」ji4", shape: "low-fall" },
    { n: 5, name: "陽上", contour: "低升 13", ex: "市", jy: "si5", anchor: "冇問題嘅「冇」mou5", shape: "low-rise" },
    { n: 6, name: "陽去", contour: "低平 22", ex: "事", jy: "si6", anchor: "聽日嘅「日」jat6", shape: "low-flat" }
  ],

  /* ---------- 1. 声调校准题：目标音节的调号被隐藏 ---------- */
  /* target = 第几个音节（从 0 起）；ans = 正确调号 */
  toneQuiz: [
    { hz: "香港", jy: "hoeng1 gong2", target: 0, ans: 1 },
    { hz: "唔該", jy: "m4 goi1", target: 1, ans: 1 },
    { hz: "埋單", jy: "maai4 daan1", target: 1, ans: 1 },
    { hz: "多謝", jy: "do1 ze6", target: 1, ans: 6 },
    { hz: "冇問題", jy: "mou5 man6 tai4", target: 0, ans: 5 },
    { hz: "開會", jy: "hoi1 wui2", target: 1, ans: 2 },
    { hz: "聽日", jy: "ting1 jat6", target: 1, ans: 6 },
    { hz: "而家", jy: "ji4 gaa1", target: 0, ans: 4 },
    { hz: "遲啲", jy: "ci4 di1", target: 0, ans: 4 },
    { hz: "得閒", jy: "dak1 haan4", target: 0, ans: 1 },
    { hz: "茶餐廳", jy: "caa4 caan1 teng1", target: 0, ans: 4 },
    { hz: "凍奶茶", jy: "dung3 naai5 caa4", target: 0, ans: 3 },
    { hz: "幾多錢", jy: "gei2 do1 cin2", target: 0, ans: 2 },
    { hz: "邊度", jy: "bin1 dou6", target: 1, ans: 6 },
    { hz: "點解", jy: "dim2 gaai2", target: 0, ans: 2 },
    { hz: "唔好意思", jy: "m4 hou2 ji3 si1", target: 1, ans: 2 },
    { hz: "對唔住", jy: "deoi3 m4 zyu6", target: 0, ans: 3 },
    { hz: "好犀利", jy: "hou2 sai1 lei6", target: 1, ans: 1 },
    { hz: "眼瞓", jy: "ngaan5 fan3", target: 0, ans: 5 },
    { hz: "攰", jy: "gui6", target: 0, ans: 6 },
    { hz: "靚", jy: "leng3", target: 0, ans: 3 },
    { hz: "返工", jy: "faan1 gung1", target: 0, ans: 1 },
    { hz: "屋企", jy: "uk1 kei2", target: 1, ans: 2 },
    { hz: "雪櫃", jy: "syut3 gwai6", target: 0, ans: 3 }
  ],

  /* ---------- 2. 最小对比：练音素颗粒度 ---------- */
  pairs: [
    { a: { hz: "三", jy: "saam1", gl: "三" }, b: { hz: "心", jy: "sam1", gl: "心" },
      cat: "長短元音 aam / am", tip: "「三」個 a 要拉長，口張大；「心」個 a 短促，嘴形細。" },
    { a: { hz: "藍", jy: "laam4", gl: "蓝" }, b: { hz: "林", jy: "lam4", gl: "林（姓）" },
      cat: "長短元音 aam / am", tip: "同一個道理：藍 laam4 拖長，林 lam4 收短。" },
    { a: { hz: "減", jy: "gaam2", gl: "减" }, b: { hz: "金", jy: "gam1", gl: "金" },
      cat: "長短元音 aam / am", tip: "減 gaam2 是高升調；金 gam1 是高平調，兩個都容易混，先聽元音長短。" },
    { a: { hz: "街", jy: "gaai1", gl: "街" }, b: { hz: "雞", jy: "gai1", gl: "鸡" },
      cat: "長短元音 aai / ai", tip: "「街」拖長、「雞」短。你出差講「行街」haang4 gaai1 就係長音。" },
    { a: { hz: "買", jy: "maai5", gl: "买" }, b: { hz: "米", jy: "mai5", gl: "米" },
      cat: "長短元音 aai / ai", tip: "聲調一樣（都係第 5 調），只有元音長短唔同——純靠長短分。" },
    { a: { hz: "手", jy: "sau2", gl: "手" }, b: { hz: "收", jy: "sau1", gl: "收" },
      cat: "同音節·唔同調", tip: "聲母韻母完全一樣，只有調：手 sau2 高升、收 sau1 高平。" },
    { a: { hz: "春", jy: "ceon1", gl: "春" }, b: { hz: "親", jy: "can1", gl: "亲／吻" },
      cat: "長短元音 eo / a", tip: "「春」個 eo 要圓唇；「親」係普通的 a。" },
    { a: { hz: "濕", jy: "sap1", gl: "湿" }, b: { hz: "失", jy: "sat1", gl: "失" },
      cat: "入聲韻尾 -p / -t", tip: "-p 要合嘴（雙唇收）；-t 係舌尖頂上齒齦，嘴唔合。" },
    { a: { hz: "塞", jy: "sak1", gl: "塞" }, b: { hz: "失", jy: "sat1", gl: "失" },
      cat: "入聲韻尾 -k / -t", tip: "-k 係舌根收（同 -ng 同位置）；-t 係舌尖收。" },
    { a: { hz: "十", jy: "sap6", gl: "十" }, b: { hz: "實", jy: "sat6", gl: "实／牢" },
      cat: "入聲韻尾 -p / -t", tip: "同上，但聲調都係第 6 調，只剩韻尾分別。" },
    { a: { hz: "六", jy: "luk6", gl: "六" }, b: { hz: "碌", jy: "luk1", gl: "碌（量词／滚）" },
      cat: "入聲同韻·唔同調", tip: "兩個都係 luk + k 尾；六 luk6 低平、碌 luk1 高平。「碌卡」就係碌 luk1。" },
    { a: { hz: "白", jy: "baak6", gl: "白" }, b: { hz: "北", jy: "bak1", gl: "北" },
      cat: "長短元音＋入聲", tip: "白 baak6 元音長、北 bak1 元音短。你的耳朵最容易在這裡偷懶。" },
    { a: { hz: "我", jy: "ngo5", gl: "我" }, b: { hz: "澳", jy: "ou3", gl: "澳（澳门）" },
      cat: "ng- 聲母有無", tip: "正音：我 ngo5 帶鼻音 ng-；無咗 ng- 就變 o5，係香港常見懒音。" },
    { a: { hz: "牛", jy: "ngau4", gl: "牛" }, b: { hz: "歐", jy: "au1", gl: "欧" },
      cat: "ng- 聲母有無", tip: "牛 ngau4 起頭要鼻音；歐 au1 直接出元音。" },
    { a: { hz: "牙", jy: "ngaa4", gl: "牙" }, b: { hz: "亞", jy: "aa3", gl: "亚（阿）" },
      cat: "ng- 聲母有無", tip: "「牙」ngaa4、「亞」aa3。香港人叫「阿明」就係 aa3。" },
    { a: { hz: "你", jy: "nei5", gl: "你" }, b: { hz: "李", jy: "lei5", gl: "李（姓）" },
      cat: "n- / l- 合流", tip: "正音分 n / l；香港口語大量合流成 l，「你」讀 lei5。聽要識，自己講要一致。" },
    { a: { hz: "男", jy: "naam4", gl: "男" }, b: { hz: "藍", jy: "laam4", gl: "蓝" },
      cat: "n- / l- 合流", tip: "男 naam4 同 藍 laam4，除咗 n/l 完全一樣。" },
    { a: { hz: "泥", jy: "nai4", gl: "泥" }, b: { hz: "黎", jy: "lai4", gl: "黎（姓）" },
      cat: "n- / l- 合流", tip: "同上，短元音版本。" },
    { a: { hz: "瓜", jy: "gwaa1", gl: "瓜" }, b: { hz: "家", jy: "gaa1", gl: "家" },
      cat: "gw- / g-", tip: "「瓜」要圓唇 gw-，兩秒就聽得出。" },
    { a: { hz: "廣", jy: "gwong2", gl: "广" }, b: { hz: "講", jy: "gong2", gl: "讲" },
      cat: "gw- / g-（懒音高发区）", tip: "正音廣 gwong2；香港懒音讀 gong2，同「講」同音。所以你聽到「gong2 東話」唔係聽錯。" }
  ],

  /* ---------- 3. 主動提取：中 → 粤。先自己開口，再揭晓 ---------- */
  drill: [
    /* 職場 */
    { scene: "職場", zh: "明天开会，你有空吗？", hz: "聽日開會，你得唔得閒？", jy: "ting1 jat6 hoi1 wui2, nei5 dak1 m4 dak1 haan4?", note: "「得唔得閒」＝ 粵語用「V 唔 V」重疊問句，唔講「你有冇空」。" },
    { scene: "職場", zh: "这份文件我下午发给你。", hz: "呢份文件我下晝發畀你。", jy: "ni1 fan6 man4 gin2 ngo5 haa6 zau3 faat3 bei2 nei5.", note: "「發畀你」用畀 bei2，唔用「給」。香港同事更常講 send 畀你。" },
    { scene: "職場", zh: "麻烦你帮我看一下。", hz: "唔該你幫我睇下。", jy: "m4 goi1 nei5 bong1 ngo5 tai2 haa5.", note: "請求＝唔該，唔係多謝。「睇下」個「下」讀 haa5，係輕聲尾。" },
    { scene: "職場", zh: "这个方案我明天回复你。", hz: "呢個方案我聽日覆你。", jy: "ni1 go3 fong1 on3 ngo5 ting1 jat6 fuk1 nei5.", note: "「覆你」＝ 回覆你，兩個字就夠，唔使講「回覆返你」。" },
    { scene: "職場", zh: "不好意思，我迟到了。", hz: "唔好意思，我遲到咗。", jy: "m4 hou2 ji3 si1, ngo5 ci4 dou3 zo2.", note: "「咗」zo2 ＝ 完成體，唔用「了」。" },
    { scene: "職場", zh: "我先走，你们慢慢聊。", hz: "我走先，你哋慢慢傾。", jy: "ngo5 zau2 sin1, nei5 dei6 maan6 maan2 king1.", note: "「先」放動詞之後——「走先」唔係「先走」。呢個係你實測錯過嘅句式。" },
    { scene: "職場", zh: "这个我不太清楚，要问一下。", hz: "呢個我唔係好清楚，要問下。", jy: "ni1 go3 ngo5 m4 hai6 hou2 cing1 co2, jiu3 man6 haa5.", note: "「唔係好 X」＝ 唔太 X，比「唔 X」委婉。" },
    { scene: "職場", zh: "大概要多久？", hz: "大概要幾耐？", jy: "daai6 koi3 jiu3 gei2 noi6?", note: "「幾耐」＝ 多久；「幾時」＝ 什麼時候。" },
    { scene: "職場", zh: "麻烦你重发一次。", hz: "唔該你 send 多次。", jy: "m4 goi1 nei5 send do1 ci3.", note: "香港職場中英夾雜係正常語言，唔係唔夠地道。「多次」＝ 再一次。「多」放動詞前。" },
    { scene: "職場", zh: "我马上处理。", hz: "我即刻搞。", jy: "ngo5 zik1 hak1 gaau2.", note: "「搞」＝ 處理；搞掂＝ 搞定。" },
    { scene: "職場", zh: "收到，谢谢。", hz: "收到，唔該晒。", jy: "sau1 dou3, m4 goi1 saai3.", note: "「晒」＝ 全部／非常，加在動詞後加強語氣。" },
    { scene: "職場", zh: "几点可以？", hz: "幾點得？", jy: "gei2 dim2 dak1?", note: "「得」＝ 可以、OK。粵語用一個「得」字搞掂「行不行／可以／有空」。" },
    { scene: "職場", zh: "没问题。", hz: "冇問題。", jy: "mou5 man6 tai4.", note: "冇 mou5 ＝ 沒有。你答對了這題的聲調（第 5 調，低升）。" },

    /* 茶餐廳 */
    { scene: "茶餐廳", zh: "我要一杯冻奶茶，少甜。", hz: "我要一杯凍奶茶，少甜。", jy: "ngo5 jiu3 jat1 bui1 dung3 naai5 caa4, siu2 tim4.", note: "香港茶餐廳落單術語：少甜、走冰、飛沙走奶、加底。" },
    { scene: "茶餐廳", zh: "多少钱？", hz: "幾多錢？／幾錢？", jy: "gei2 do1 cin2? / gei2 cin2?", note: "「幾錢」更口語，兩個都通。" },
    { scene: "茶餐廳", zh: "买单，谢谢。", hz: "唔該，埋單。", jy: "m4 goi1, maai4 daan1.", note: "埋單 maai4 daan1——唔係「買單」。你選「雪櫃」的時候是對的，這裡同理：要街頭詞。" },
    { scene: "茶餐廳", zh: "可以刷卡吗？", hz: "可唔可以碌卡？", jy: "ho2 m4 ho2 ji5 luk1 kaat1?", note: "碌卡 luk1 kaat1 ＝ 刷卡，香港獨有說法。" },
    { scene: "茶餐廳", zh: "有位置吗？两位。", hz: "有冇位？兩位。", jy: "jau5 mou5 wai2? loeng5 wai2.", note: "「有冇」＝ 有沒有。兩位＝ 兩個人。" },
    { scene: "茶餐廳", zh: "这个太辣了。", hz: "呢個好辣。", jy: "ni1 go3 hou2 laat6.", note: "粵語「好」＝ 很，唔係 good。「好辣」＝ 很辣。" },
    { scene: "茶餐廳", zh: "打包带走。", hz: "唔該，拎走。", jy: "m4 goi1, ling1 zau2.", note: "香港唔講「打包」，講「拎走」／「外賣」。台灣先講「外帶」。" },
    { scene: "茶餐廳", zh: "麻烦加杯水。", hz: "唔該加杯水。", jy: "m4 goi1 gaa1 bui1 seoi2.", note: "要求服務，開頭一律「唔該」。" },
    { scene: "茶餐廳", zh: "我吃完了。", hz: "我食完喇。", jy: "ngo5 sik6 jyun4 laa3.", note: "「食」唔係「吃」；「喇」laa3 表示狀態變化——你食完，可以埋單。" },

    /* 出行 */
    { scene: "出行", zh: "去机场，谢谢。", hz: "去機場，唔該。", jy: "heoi3 gei1 coeng4, m4 goi1.", note: "搭的士講目的地，一句就夠。" },
    { scene: "出行", zh: "在这里停就好。", hz: "喺呢度停就得。", jy: "hai2 ni1 dou6 ting4 zau6 dak1.", note: "喺 hai2 ＝ 在；「就得」＝ 就可以了。" },
    { scene: "出行", zh: "前面左转。", hz: "前面轉左。", jy: "cin4 min6 zyun3 zo2.", note: "又係「先／左／右」後置：轉左、轉右，唔係「左轉」。呢個係你實測錯過嘅語序類型。" },
    { scene: "出行", zh: "大概多久到？", hz: "大概幾耐到？", jy: "daai6 koi3 gei2 noi6 dou3?", note: "同職場那句同一個句式，記一次用兩次。" },
    { scene: "出行", zh: "在这里放我下来。", hz: "喺呢度放低我。", jy: "hai2 ni1 dou6 fong3 dai1 ngo5.", note: "「放低」＝ 放下；粵語「低」可以表完成（放低、坐低、睇低）。" },

    /* 社交 */
    { scene: "社交", zh: "好久不见！", hz: "好耐冇見！", jy: "hou2 noi6 mou5 gin3!", note: "「好耐」＝ 很久；「冇見」＝ 沒見。" },
    { scene: "社交", zh: "你最近怎么样？", hz: "你最近點呀？", jy: "nei5 zeoi3 gan6 dim2 aa3?", note: "「點」＝ 怎麼樣，一個字頂普通話三個字。" },
    { scene: "社交", zh: "真的吗？", hz: "真㗎？", jy: "zan1 gaa3?", note: "「㗎」gaa3 係肯定語氣詞，帶驚訝。「㗎咩？」就更加不信。" },
    { scene: "社交", zh: "不是吧！", hz: "唔係啩！", jy: "m4 hai6 gwaa3!", note: "「啩」gwaa3 ＝ 推測、難以置信，普通話冇對應詞。" },
    { scene: "社交", zh: "原来是这样。", hz: "原來係咁。", jy: "jyun4 loi4 hai6 gam2.", note: "「咁」gam2 ＝ 這樣／那麼。" },
    { scene: "社交", zh: "慢慢来，不用急。", hz: "慢慢嚟，唔使急。", jy: "maan6 maan2 lai4, m4 sai2 gap1.", note: "「嚟」lai4 ＝ 來；「唔使」＝ 不用、不必。" },
    { scene: "社交", zh: "你说得对。", hz: "你講得啱。", jy: "nei5 gong2 dak1 ngaam1.", note: "「啱」ngaam1 ＝ 對、正確、合適，粵語核心字之一。" },
    { scene: "社交", zh: "我请你吃饭。", hz: "我請你食飯。", jy: "ngo5 ceng2 nei5 sik6 faan6.", note: "請客的「請」讀 ceng2，唔係 cing2——呢個係聲調分辨的實戰例子。" },
    { scene: "社交", zh: "别客气。", hz: "唔使客氣。", jy: "m4 sai2 haak3 hei3.", note: "回應「多謝」用「唔使客氣」，回應「唔該」用「唔使」。層次要對。" },
    { scene: "社交", zh: "一起吃饭？", hz: "一齊食飯？", jy: "jat1 cai4 sik6 faan6?", note: "「一齊」＝ 一起。" }
  ],

  /* ---------- 4. 語用與地道度 ---------- */
  /* 4a. 唔該 vs 多謝 —— 你實測錯在這 */
  usageRule: {
    title: "唔該 vs 多謝：粵語的禮貌是分層的",
    lines: [
      "唔該 m4 goi1 → 用於【勞煩、服務、舉手之勞】：遞東西、讓位、加水、問路、叫服務員、請人幫手。",
      "多謝 do1 ze6 → 用於【實質饋贈、心意、讚美】：送禮、請客、紅包、別人誇你、合作成功。",
      "加強版：唔該晒 m4 goi1 saai3（非常感謝你的幫忙）／多謝晒 do1 ze6 saai3。",
      "口訣：**手遞過來的用唔該，心送過來的用多謝。**"
    ]
  },
  usageQuiz: [
    { q: "便利店店員把飲品遞給你", ans: "唔該", opts: ["唔該", "多謝"], why: "服務性質、舉手之勞 → 唔該。" },
    { q: "朋友送你生日禮物", ans: "多謝", opts: ["唔該", "多謝"], why: "實質饋贈、心意 → 多謝。" },
    { q: "同事幫你頂了一個通宵的班", ans: "唔該晒", opts: ["唔該晒", "多謝"], why: "勞煩對方付出時間 → 唔該，加「晒」表示程度。" },
    { q: "客戶誇你方案做得好", ans: "多謝", opts: ["唔該", "多謝"], why: "讚美算心意 → 多謝。呢句講錯最易露底。" },
    { q: "侍應幫你加水", ans: "唔該", opts: ["唔該", "多謝"], why: "服務 → 唔該。" },
    { q: "長輩過年給你利是（紅包）", ans: "多謝", opts: ["唔該", "多謝"], why: "饋贈 → 多謝。" },
    { q: "「你唔去咩？」——「咩」me1 表示？", ans: "帶意外的疑問", opts: ["帶意外的疑問", "肯定", "命令", "轉述"], why: "「咩」＝ 真的嗎？你竟然不去？" },
    { q: "「我食咗飯喇。」——「喇」laa3 表示？", ans: "狀態變化／已完成", opts: ["狀態變化／已完成", "疑問", "假設", "轉述"], why: "「喇」＝ 情況變了，唔係單純的「了」。" },
    { q: "「係囉。」——「囉」lo1 表示？", ans: "理所當然／附和", opts: ["理所當然／附和", "疑問", "命令", "驚訝"], why: "「係囉」＝ 就係咁囉，帶點「早就係咁」。" },
    { q: "「呢個好貴㗎！」——「㗎」gaa3 表示？", ans: "肯定＋提醒對方", opts: ["肯定＋提醒對方", "疑問", "假設", "轉述"], why: "「㗎」＝ 我告訴你，這是事實。" },
    { q: "「佢話唔嚟喎。」——「喎」wo3 表示？", ans: "轉述別人的話", opts: ["轉述別人的話", "自己肯定", "命令", "疑問"], why: "「喎」＝ 聽說是這樣，責任不在我。" },
    { q: "「佢喺度睇書。」對應普通話？", ans: "他正在看書", opts: ["他正在看書", "他看過書", "他看完書了", "他去看書"], why: "「喺度」＋動詞 ＝ 正在。" },
    { q: "「我去過香港。」——「過」gwo3 表示？", ans: "經歷過", opts: ["經歷過", "正在", "完成", "將來"], why: "咗＝完成；緊＝正在；過＝經歷。三個唔可以混。" },
    { q: "「食多啲」對應普通話？", ans: "多吃一點", opts: ["多吃一點", "吃得多", "吃得太多", "少吃一点"], why: "「多」放動詞後＝ 多一些。「多吃」係普通話語序，粵語要後置。" },
    { q: "「我畀本書佢。」對應普通話？", ans: "我给他一本书", opts: ["我给他一本书", "他给我一本书", "我把书给他看", "书是他的"], why: "粵語「畀＋物＋人」，接受者放最後。呢個係你實測錯過嘅語序類型。" },
    { q: "「你」讀成 lei5，屬於？", ans: "n- / l- 合流", opts: ["n- / l- 合流", "ng- 脫落", "gw- 變 g-", "變調"], why: "你實測誤判成變調。呢個係聲母問題，唔關聲調事。" },
    { q: "「廣東話」聽起來像「gong2 東話」，屬於？", ans: "gw- 變 g-", opts: ["gw- 變 g-", "n- / l- 合流", "ng- 脫落", "入聲丟失"], why: "圓唇 w 掉了，廣 gwong2 → gong2，同「講」撞音。" },
    { q: "「我」聽起來像 o5，屬於？", ans: "ng- 聲母脫落", opts: ["ng- 聲母脫落", "n- / l- 合流", "變調", "gw- 變 g-"], why: "你實測選了「變調」（ngo2）。係聲母消失，唔係聲調變。" }
  ],

  /* 4b. 懒音正解 */
  lazy: {
    title: "懒音：要「聽得懂」，唔一定要「講得出」",
    intro: "你的目標裡有「不想被聽出是外地人」——這裡要先破除一個誤會：**懒音不是外不外地人的分界線**。香港母語者大量使用懒音，你把它學滿了反而容易變成四不像。真正決定「一開口就聽得出」的，是另外四樣：聲調、元音長短、句末語氣詞、用詞選擇。",
    rows: [
      { name: "ng- 聲母脫落", ex: "我 ngo5 → o5；牛 ngau4 → au4；牙 ngaa4 → aa4", advice: "【聽】一定要適應。【說】初學階段保留 ng- 更安全，因為丟掉後我／牛／牙會跟其他字撞音。" },
      { name: "n- / l- 合流", ex: "你 nei5 → lei5；男 naam4 → laam4", advice: "【聽】必須懂。【說】任選一種，但**全篇要一致**；一時 nei5 一時 lei5 最刺耳。" },
      { name: "gw- → g-", ex: "廣 gwong2 → gong2；國 gwok3 → gok3；過 gwo3 → go3", advice: "【聽】要懂。【說】保留 gw- 圓唇，這是你目前最不吃力的部分。" },
      { name: "零聲母加 ng-", ex: "愛 oi3 → ngoi3；安 on1 → ngon1", advice: "方向跟第一條相反，同一個人可以兩條都犯。當作噪音處理，不影響理解。" },
      { name: "-ng 韻尾 → -n", ex: "恆 hang4 → han4；香港 hoeng1 gong2 → hoeng1 gon2", advice: "【聽】要懂。【說】不要學，這個最容易讓人覺得你講得含糊。" },
      { name: "「唔」m4 唔可以丟", ex: "唔該、唔好、唔使、唔知、唔係", advice: "「唔」是粵語最高頻音節之一，也是唯一一個自成音節的鼻音。它讀得乾脆，整句就顯得地道。" }
    ]
  },

  /* 4c. 用詞替換表：書面／普通话詞 → 香港街頭詞 */
  lexmap: [
    { cn: "电梯", hk: "𨋢", jy: "lip1", note: "「升降機」是書面；日常一律講𨋢。撳𨋢＝按電梯。" },
    { cn: "冰箱", hk: "雪櫃", jy: "syut3 gwai6", note: "你答對了。" },
    { cn: "空调", hk: "冷氣", jy: "laang5 hei3", note: "" },
    { cn: "塑料袋", hk: "膠袋", jy: "gaau1 doi2", note: "香港買膠袋要收錢。" },
    { cn: "吸管", hk: "飲管", jy: "jam2 gun2", note: "「走飲管」＝不要吸管。" },
    { cn: "公交车", hk: "巴士", jy: "baa1 si2", note: "" },
    { cn: "出租车", hk: "的士", jy: "dik1 si2", note: "截的士＝攔計程車。" },
    { cn: "自行车", hk: "單車", jy: "daan1 ce1", note: "" },
    { cn: "土豆", hk: "薯仔", jy: "syu4 zai2", note: "" },
    { cn: "冰淇淋", hk: "雪糕", jy: "syut3 gou1", note: "" },
    { cn: "盒饭", hk: "飯盒", jy: "faan6 hap6", note: "" },
    { cn: "充值", hk: "增值", jy: "zang1 zik6", note: "八達通增值。" },
    { cn: "复印", hk: "影印", jy: "jing2 jan3", note: "打印＝print，影印＝photocopy，香港分得很清。" },
    { cn: "转账", hk: "過數", jy: "gwo3 sou3", note: "「過數畀你」＝轉帳給你。" },
    { cn: "取号排队", hk: "攞籌", jy: "lo2 cau4", note: "銀行、餐廳都講攞籌。" },
    { cn: "卫生间", hk: "廁所", jy: "ci3 so2", note: "問路講「洗手間喺邊？」。" },
    { cn: "老板", hk: "老細", jy: "lou5 sai3", note: "「老闆」都可以，但老細更口語。" },
    { cn: "帮忙", hk: "幫手", jy: "bong1 sau2", note: "" },
    { cn: "便宜", hk: "平", jy: "peng4", note: "「平啲啦」＝便宜一點吧——在香港買東西可以講。" },
    { cn: "好吃", hk: "好食", jy: "hou2 sik6", note: "" },
    { cn: "厉害", hk: "犀利／勁", jy: "sai1 lei6 / ging6", note: "" },
    { cn: "可爱", hk: "得意", jy: "dak1 ji3", note: "陷阱詞：粵語「得意」＝可愛，不是 proud。" },
    { cn: "漂亮", hk: "靚", jy: "leng3", note: "靚仔／靚女。" },
    { cn: "生气", hk: "嬲", jy: "nau1", note: "" },
    { cn: "累", hk: "攰", jy: "gui6", note: "「好攰」＝很累。" },
    { cn: "困（想睡）", hk: "眼瞓", jy: "ngaan5 fan3", note: "" },
    { cn: "聊天", hk: "傾偈", jy: "king1 gai2", note: "「傾」單用＝談。" },
    { cn: "逛街", hk: "行街", jy: "haang4 gaai1", note: "行 haang4＝走。" },
    { cn: "上班", hk: "返工", jy: "faan1 gung1", note: "返＝回。返工／收工一對。" },
    { cn: "下班", hk: "收工", jy: "sau1 gung1", note: "" },
    { cn: "上学", hk: "返學", jy: "faan1 hok6", note: "" },
    { cn: "回家", hk: "返屋企", jy: "faan1 uk1 kei2", note: "" },
    { cn: "睡觉", hk: "瞓覺", jy: "fan3 gaau3", note: "瞓 fan3＝睡。" },
    { cn: "昨天", hk: "琴日", jy: "kam4 jat6", note: "或「昨日」。" },
    { cn: "今天", hk: "今日", jy: "gam1 jat6", note: "" },
    { cn: "明天", hk: "聽日", jy: "ting1 jat6", note: "" },
    { cn: "现在", hk: "而家", jy: "ji4 gaa1", note: "" },
    { cn: "一会儿", hk: "陣間", jy: "zan6 gaan1", note: "「等陣」＝等一下。" },
    { cn: "什么时候", hk: "幾時", jy: "gei2 si4", note: "" },
    { cn: "哪里", hk: "邊度", jy: "bin1 dou6", note: "" },
    { cn: "为什么", hk: "點解", jy: "dim2 gaai2", note: "" },
    { cn: "谁", hk: "邊個", jy: "bin1 go3", note: "" },
    { cn: "这个／那个", hk: "呢個／嗰個", jy: "ni1 go3 / go2 go3", note: "呢＝這，嗰＝那。" },
    { cn: "这里／那里", hk: "呢度／嗰度", jy: "ni1 dou6 / go2 dou6", note: "" },
    { cn: "全部", hk: "晒", jy: "saai3", note: "「食晒」＝全吃光，放在動詞後。" },
    { cn: "一起", hk: "一齊", jy: "jat1 cai4", note: "" }
  ],

  /* ---------- 5. 俚语（你自评认识的，做成词卡） ---------- */
  slang: [
    { hz: "食花生", jy: "sik6 faa1 sang1", gl: "看热闹、当吃瓜群众", ex: "我唔出聲，我食花生。" },
    { hz: "好行唔送", jy: "hou2 haang4 m4 sung3", gl: "（諷刺）慢走不送", ex: "哦，好行唔送。" },
    { hz: "冇得輸", jy: "mou5 dak1 syu1", gl: "不可能输、稳赢", ex: "你出馬，冇得輸。" },
    { hz: "側側膊", jy: "caak1 caak1 bok3", gl: "推卸責任、裝沒事", ex: "佢側側膊唔認數。" },
    { hz: "唔使急最緊要快", jy: "m4 sai2 gap1 zeoi3 gan2 jiu3 faai3", gl: "（矛盾幽默）別急，最重要是快", ex: "老細話：唔使急，最緊要快。" },
    { hz: "收皮", jy: "sau1 pei4", gl: "閉嘴、收攤、滾蛋（粗俗，慎用）", ex: "你收皮啦。" },
    { hz: "頂硬上", jy: "ding2 ngaang6 soeng5", gl: "硬著頭皮頂上", ex: "冇人做，我頂硬上。" },
    { hz: "搞掂", jy: "gaau2 dim6", gl: "搞定、完成", ex: "搞掂晒。" },
    { hz: "巴閉", jy: "baa1 bai3", gl: "囂張、了不起（貶）", ex: "使唔使咁巴閉？" },
    { hz: "核突", jy: "wat6 dat6", gl: "難看、噁心", ex: "呢件衫好核突。" },
    { hz: "論盡", jy: "leon6 zeon6", gl: "笨手笨腳、麻煩", ex: "佢做嘢好論盡。" },
    { hz: "醒目", jy: "sing2 muk6", gl: "機靈、精明", ex: "醒目仔。" },
    { hz: "冇眼睇", jy: "mou5 ngaan5 tai2", gl: "不忍直視", ex: "我都冇眼睇。" }
  ]
};
