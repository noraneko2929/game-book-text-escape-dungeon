/**
 * storyData.js
 * 地下ダンジョン脱出ゲームのシナリオデータ（全10階層版）
 *
 * 【構成】 第十層（最深）→ 第一層 → 地上
 *  第十層 闇の底 / 第九層 骨の回廊 / 第八層 毒霧の湿地 / 第七層 熱の大空洞
 *  第六層 錆びた鉱山 / 第五層 水没の礼拝堂 / 第四層 牢獄回廊 / 第三層 崩れた書庫
 *  第二層 夕日の裂け目 / 第一層 旧坑道
 *
 * 【悪魔の設定】
 *  ・目は弱く、音・匂い・動きに敏感
 *  ・揺れる小さな炎（ランタン等）には惹かれる
 *  ・逃げる者を追う
 *  ・揺れない光（苔・魔石灯）には反応しない
 *  ・直射日光（夕日・朝日を含む）を嫌う。月明かりは無関係
 *  ・水中の悪魔は水辺から離れられない
 *
 * 【水の設定】 水袋は第四層まで温存。外套を濡らすのは湿地の泥水のみ
 *
 * 【ルール】 本文は1ページ90文字以内（タイトル行を含み、HTMLタグと改行は除く）。長い場面は分割して「続ける」で繋ぐ。
 *
 * 【エンディング】 escape_true / escape_normal / escape_gamble
 *
 * 【任意フィールド（エンジン拡張用。既存の text / status / choices は従来どおり）】
 *  type       : "normal" | "gameover" | "ending"
 *  floor      : 階層番号（10〜1）。複数階層から共有されるゲームオーバーは省略
 *                （省略時は、直前の通常ノードの floor を引き継ぐ）
 *  checkpoint : true のノードに到達したら、再開地点として保存する
 *  endingId   : エンディングの識別（"true" | "normal" | "gamble"）
 */

const storyData = {

  // ==================================================
  // 第十層：闇の底
  // ==================================================

  start: {
    type: "normal",
    floor: 10,
    text: "駆け出し冒険者のあなたは、古い罠の床を踏み抜き、層の裂け目を幾度も滑り落ちて、闇の底へ着いた。砂の山が衝撃を和らげたらしい。全身が痛む。",
    status: "闇の底／全身が痛む",
    choices: [
      { text: "持ち物を確かめる", next: "start_2" }
    ]
  },

  start_2: {
    type: "normal",
    floor: 10,
    text: "手元にはランタン（油わずか）、水袋、ナイフ、外套。地図は第四層まで。ここは、その遥か下だ。",
    status: "闇の底／ランタン、水袋、ナイフ、外套",
    choices: [
      { text: "冒険者の噂を思い出す", next: "start_3" }
    ]
  },

  start_3: {
    type: "normal",
    floor: 10,
    checkpoint: true,
    text: "悪魔は音と匂いに敏感で、揺れる炎に惹かれ、逃げる者を追い、日光を嫌うという噂だ。",
    status: "闇の底／ランタン、水袋、ナイフ、外套",
    choices: [
      { text: "声を出して、誰かを呼ぶ", next: "gameover_shout" },
      { text: "ランタンに火を灯す", next: "look_around" },
      { text: "灯りをつけず、壁伝いに進む", next: "wall_follow" }
    ]
  },


  look_around: {
    type: "normal",
    floor: 10,
    text: "灯りが、骨の散らばる広大な空洞を照らした。油は長くもたない。",
    status: "闇の底／ランタン点灯中",
    choices: [
      { text: "灯りを消し、暗闇に目を慣らす", next: "dark_adapt" },
      { text: "灯りを頼りに広い通路を進む", next: "gameover_light" },
      { text: "灯りを消し、壁伝いに進む", next: "wall_follow" }
    ]
  },

  wall_follow: {
    type: "normal",
    floor: 10,
    text: "生臭い匂いが濃くなる。手を伸ばすと、温かい塊が規則的に上下していた。眠る悪魔だ。脇に隙間がある。",
    status: "闇の底／眠る大悪魔の前",
    choices: [
      { text: "脇の隙間を、腹ばいで抜ける", next: "crawl_past" },
      { text: "小石を反対側へ投げて、注意を逸らす", next: "throw_stone" },
      { text: "悪魔から離れ、灯りをつけず別の道を探す", next: "dark_adapt" }
    ]
  },

  dark_adapt: {
    type: "normal",
    floor: 10,
    text: "暗闇に目を慣らして数分待つと、壁の青白い苔の光と、頬を撫でる風の流れが分かってきた。",
    status: "闇の底／暗闇に目が慣れた",
    choices: [
      { text: "苔の光る道を進む", next: "moss_path" },
      { text: "風の流れをたどる", next: "wind_path" }
    ]
  },

  moss_path: {
    type: "normal",
    floor: 10,
    text: "苔の光の先に階段が見える。足元にも苔が広がり、割れ目では下級悪魔の群れが眠り、光が寝顔を青白く照らす。",
    status: "闇の底／下級悪魔の巣の脇",
    choices: [
      { text: "苔を踏まないよう、壁際をすり足で進む", next: "f10_stairs" },
      { text: "苔を踏み潰して、光を消しながら進む", next: "gameover_moss" }
    ]
  },

  wind_path: {
    type: "normal",
    floor: 10,
    text: "風をたどると、天井の高い縦穴の底に着いた。落ちてきた経路とは別の、自然の割れ目らしい。岩肌の手がかりが、上へ続いている。",
    status: "闇の底／縦穴の底",
    choices: [
      { text: "縦穴を登り、一気に上を目指す", next: "hole_climb" },
      { text: "脇の細い通路を進み、階段を探す", next: "f10_stairs" }
    ]
  },

  hole_climb: {
    type: "normal",
    floor: 10,
    text: "十数メートル登ったところで手がかりが途切れた。次の岩棚まで、腕一本分以上ある。",
    status: "縦穴の中腹／宙づり",
    choices: [
      { text: "体重移動を重ね、時間をかけて手を伸ばす", next: "hole_top" },
      { text: "腕が震える。力尽きる前に跳びつく", next: "gameover_hole" }
    ]
  },

  hole_top: {
    type: "normal",
    floor: 8,
    text: "縦穴の出口に這い出た。壁の刻印は「八」。大きな近道だったが、肩を痛めたようだ。",
    status: "縦穴の出口／肩を痛めた",
    choices: [
      { text: "先へ進む", next: "f8_start_hurt" }
    ]
  },

  crawl_past: {
    type: "normal",
    floor: 10,
    text: "腹ばいで悪魔の脇を進む。生臭い息が頬にかかる。隙間は残りわずかだ。",
    status: "闇の底／悪魔のすぐ脇",
    choices: [
      { text: "最後まで、少しずつ呼吸を殺して進む", next: "crawl_success" },
      { text: "あと少しだ。跳ね起きて、一気に駆け抜ける", next: "gameover_run" }
    ]
  },

  throw_stone: {
    type: "normal",
    floor: 10,
    text: "小石が遠くで鳴った。悪魔が目を覚まし、重い足音で音のほうへ歩き出す。",
    status: "闇の底／悪魔が覚醒",
    choices: [
      { text: "悪魔が離れた隙に、元の隙間を抜ける", next: "crawl_success" },
      { text: "その場で立ち尽くし、様子を見る", next: "gameover_stone" }
    ]
  },

  crawl_success: {
    type: "normal",
    floor: 10,
    text: "隙間を抜けた。悪魔の気配を背に手探りで進むと、石の階段に突き当たった。",
    status: "闇の底／階段の前",
    choices: [
      { text: "階段を調べる", next: "f10_stairs" }
    ]
  },

  f10_stairs: {
    type: "normal",
    floor: 10,
    text: "刻印を確かめると、上り階段に「九」とあった。ここは第十層だったのだ。",
    status: "第十層・階段の前",
    choices: [
      { text: "階段を上る", next: "f9_start" }
    ]
  },

  // ==================================================
  // 第九層：骨の回廊
  // ==================================================

  f9_start: {
    type: "normal",
    floor: 9,
    checkpoint: true,
    text: "壁の苔が淡く光る回廊に、白い骨が敷き詰められている。踏めば鳴る。奥から、見張りの足音が聞こえる。",
    status: "第九層・骨の回廊",
    choices: [
      { text: "骨を避け、壁際の窪みを伝って進む", next: "f9_niche" },
      { text: "外套の裾を裂いて靴に巻き、骨の上を行く", next: "f9_cloth" },
      { text: "骨の薄い回廊の中央を通り、素早く抜ける", next: "gameover_bones" }
    ]
  },

  f9_niche: {
    type: "normal",
    floor: 9,
    text: "窪みに身を潜めると、長い腕の悪魔が巡回して通り過ぎた。往復の間隔は一定のようだ。",
    status: "第九層・窪みの中",
    choices: [
      { text: "間隔を数え、遠ざかった隙に進む", next: "f9_count" },
      { text: "悪魔の足音に合わせ、骨の上を踏んで後をつける", next: "f9_follow" }
    ]
  },

  f9_cloth: {
    type: "normal",
    floor: 9,
    text: "自分の足音は消えた。だが見張りの足音が、思ったより近くまで来ている。",
    status: "第九層・見張りが接近",
    choices: [
      { text: "近くの窪みに隠れ、見張りの足音の間隔を数える", next: "f9_count" },
      { text: "見つかる前に走って逃げる", next: "gameover_chase" }
    ]
  },

  f9_count: {
    type: "normal",
    floor: 9,
    text: "足音を数え、窪みから窪みへ移動し、回廊の出口までたどり着いた。",
    status: "第九層・回廊の出口",
    choices: [
      { text: "階段へ向かう", next: "f9_stairs" }
    ]
  },

  f9_follow: {
    type: "normal",
    floor: 9,
    text: "悪魔の足音に紛れて後を追う。突然、悪魔が立ち止まり、鼻を鳴らした。",
    status: "第九層・気づかれかけている",
    choices: [
      { text: "岩のように動かず、気配を消す", next: "f9_still" },
      { text: "逃げる", next: "gameover_chase" }
    ]
  },

  f9_still: {
    type: "normal",
    floor: 9,
    text: "息を止めて耐える。悪魔は興味を失い、再び歩き出した。その隙に出口へ急ぐ。",
    status: "第九層・出口付近／消耗",
    choices: [
      { text: "階段へ向かう", next: "f9_stairs" }
    ]
  },

  f9_stairs: {
    type: "normal",
    floor: 9,
    text: "階段の刻印は「八」。上から、湿った生ぬるい空気が降りてくる。",
    status: "第九層・階段の前",
    choices: [
      { text: "階段を上る", next: "f8_start" }
    ]
  },

  // ==================================================
  // 第八層：毒霧の湿地
  // ==================================================

  f8_start: {
    type: "normal",
    floor: 8,
    checkpoint: true,
    text: "腐った卵のような匂いの緑の霧が立ち込める湿地。吸うと頭が痛む。霧の奥で、ごぼ、ごぼと泡立つ音がする。",
    status: "第八層・毒霧の湿地",
    choices: [
      { text: "外套を泥水で濡らして口に当て、慎重に進む", next: "f8_cloak" },
      { text: "ランタンに火を灯し、霧を照らして進む", next: "gameover_gas" },
      { text: "霧の薄い高所の岩場を伝って進む", next: "f8_rocks" }
    ]
  },

  f8_cloak: {
    type: "normal",
    floor: 8,
    text: "濡れた外套越しに息をする。霧は濃く、足元は泥だ。泡立つ音が左から聞こえる。",
    status: "第八層・霧の中",
    choices: [
      { text: "泡立つ音から遠ざかる方向へ進む", next: "f8_away" },
      { text: "泡立つ音のする左手へ、足場を探して進む", next: "gameover_swamp" }
    ]
  },

  f8_away: {
    type: "normal",
    floor: 8,
    text: "霧が薄れ、乾いた岩の道に出た。前方に、上り階段が見える。",
    status: "第八層・霧の外れ",
    choices: [
      { text: "階段へ向かう", next: "f8_stairs" }
    ]
  },

  f8_rocks: {
    type: "normal",
    floor: 8,
    text: "高い岩場は霧が薄い。だが岩は濡れて滑り、下では巨大な影が泥を這っている。",
    status: "第八層・岩場の上",
    choices: [
      { text: "三点で体を支え、確実に進む", next: "f8_stairs" },
      { text: "跳び移って、早く抜ける", next: "gameover_slip" }
    ]
  },

  f8_start_hurt: {
    type: "normal",
    floor: 8,
    checkpoint: true,
    text: "縦穴の出口は、腐卵臭の緑の霧が立ち込める湿地だった。痛めた肩をかばい、咳をこらえる。",
    status: "第八層・毒霧の湿地／肩を痛めている",
    choices: [
      { text: "外套を泥水で濡らして口に当て、咳を殺して進む", next: "f8_cloak_hurt" },
      { text: "ランタンに火を灯し、霧を照らして進む", next: "gameover_gas" },
      { text: "霧の薄い高所の岩場を伝って進む", next: "f8_rocks_hurt" }
    ]
  },

  f8_cloak_hurt: {
    type: "normal",
    floor: 8,
    text: "濡れた外套越しでも、咳が込み上げる。霧の奥の泡立つ音が、左から聞こえる。",
    status: "第八層・霧の中／肩を痛めている",
    choices: [
      { text: "外套を外して、咳をして息を整える", next: "gameover_cough" },
      { text: "泡立つ音から遠ざかり、咳は外套で押さえる", next: "f8_away_hurt" },
      { text: "咳が出る前に急ぎ、泡立つ音のする左手へ進む", next: "gameover_swamp" }
    ]
  },

  f8_away_hurt: {
    type: "normal",
    floor: 8,
    text: "霧が薄れ、乾いた岩の道に出た。痛めた肩が疼くが、前方に上り階段が見える。",
    status: "第八層・霧の外れ／肩を痛めている",
    choices: [
      { text: "階段へ向かう", next: "f8_stairs" }
    ]
  },

  f8_rocks_hurt: {
    type: "normal",
    floor: 8,
    text: "高所の岩は濡れて滑り、泥の中では巨大な影が蠢く。痛めた肩では、体を支えきれない。",
    status: "第八層・岩場の上／肩を痛めている",
    choices: [
      { text: "肩をかばい、岩の裂け目に足を掛けて進む", next: "f8_stairs" },
      { text: "痛みをこらえ、肩に力を入れて三点で支える", next: "gameover_slip_hurt" }
    ]
  },

  f8_stairs: {
    type: "normal",
    floor: 8,
    text: "階段の刻印は「七」。上から、焼けるような熱風が降りてくる。",
    status: "第八層・階段の前",
    choices: [
      { text: "階段を上る", next: "f7_start" }
    ]
  },

  // ==================================================
  // 第七層：熱の大空洞
  // ==================================================

  f7_start: {
    type: "normal",
    floor: 7,
    checkpoint: true,
    text: "灼熱の大空洞。足元を溶岩の川が赤く脈打ち、熱気で視界が揺れ、熱風が喉を焼く。",
    status: "第七層・熱の大空洞／体力が削られる",
    choices: [
      { text: "周囲を見渡す", next: "f7_start2" }
    ]
  },

  f7_start2: {
    type: "normal",
    floor: 7,
    text: "対岸に階段が見える。道は三つ。古い石橋、壁沿いの岩棚、灰混じりの熱気を噴く岩壁の亀裂だ。",
    status: "第七層・熱の大空洞",
    choices: [
      { text: "古い石橋を渡る", next: "f7_bridge" },
      { text: "壁沿いの細い岩棚を進む", next: "f7_ledge" },
      { text: "外套の裾で口を覆い、亀裂に入る", next: "f7_crevice" }
    ]
  },

  f7_bridge: {
    type: "normal",
    floor: 7,
    text: "橋の中央に、悪魔の石像が立っている。あまりに精巧で、今にも動き出しそうだ。",
    status: "第七層・石橋の手前",
    choices: [
      { text: "ただの石像だろう。近づいて調べる", next: "gameover_statue" },
      { text: "嫌な予感がする。橋を諦めて岩棚へ", next: "f7_ledge" }
    ]
  },

  f7_ledge: {
    type: "normal",
    floor: 7,
    text: "細い岩棚の途中で、足元の岩が崩れ始めた。次の足場まで、あと数歩。",
    status: "第七層・岩棚／足場が脆い",
    choices: [
      { text: "壁に体を押し付け、横歩きで進む", next: "f7_ledge_ok" },
      { text: "足場が崩れきる前に、素早く渡りきる", next: "gameover_fall" }
    ]
  },

  f7_ledge_ok: {
    type: "normal",
    floor: 7,
    text: "崩れかけの岩棚を渡りきった。背後で、岩が溶岩へ落ちていく。階段はもうすぐだ。",
    status: "第七層・対岸",
    choices: [
      { text: "階段へ向かう", next: "f7_stairs" }
    ]
  },

  f7_crevice: {
    type: "normal",
    floor: 7,
    text: "亀裂の奥は悪魔の巣。獣毛と灰を敷き固めた寝床で幼体が眠り、奥には上へ続く道がある。",
    status: "第七層・悪魔の巣の中",
    choices: [
      { text: "巣の端を、静かに通り抜ける", next: "f7_nest" },
      { text: "怖い。引き返す", next: "f7_start2" }
    ]
  },

  f7_nest: {
    type: "normal",
    floor: 7,
    text: "巣の中ほどで、幼体が寝返りを打った。遠くから、大きな足音が近づいてくる。",
    status: "第七層・巣の中／親が接近",
    choices: [
      { text: "足音が近づく前に、静かに急いで抜ける", next: "f7_stairs" },
      { text: "騒がれる前に、ナイフで先手を打つ", next: "gameover_nest" }
    ]
  },

  f7_stairs: {
    type: "normal",
    floor: 7,
    text: "たどり着いた上り階段の刻印は「六」。上から、金属の軋む音が聞こえてくる。",
    status: "第七層・階段の前",
    choices: [
      { text: "階段を上る", next: "f6_start" }
    ]
  },

  // ==================================================
  // 第六層：錆びた鉱山
  // ==================================================

  f6_start: {
    type: "normal",
    floor: 6,
    checkpoint: true,
    text: "壁の魔石灯が揺れず淡く光る、錆びたレールの鉱山跡。腐った支柱が軋み、天井から石が落ちてくる。",
    status: "第六層・錆びた鉱山",
    choices: [
      { text: "天井を気にしつつ、レール沿いに進む", next: "f6_walk" },
      { text: "脇の狭い坑道に入る", next: "f6_side" }
    ]
  },

  f6_walk: {
    type: "normal",
    floor: 6,
    text: "進むほど、天井の軋みが大きくなる。背後から、崩落の轟音が迫ってきた。",
    status: "第六層・崩落が迫る",
    choices: [
      { text: "崩落に追いつかれる前に、出口へ走る", next: "f6_exit" },
      { text: "壁際に伏せて、やり過ごす", next: "gameover_crush" }
    ]
  },

  f6_exit: {
    type: "normal",
    floor: 6,
    text: "崩落を背に、ぎりぎりで駆け抜けた。振り返ると、通路は岩で埋まっていた。",
    status: "第六層・出口付近",
    choices: [
      { text: "階段へ向かう", next: "f6_stairs" }
    ]
  },

  f6_side: {
    type: "normal",
    floor: 6,
    text: "狭い坑道の奥で、爪が岩を掘る音がする。ときおり音が止み、悪魔が耳を澄ます。",
    status: "第六層・脇の坑道",
    choices: [
      { text: "掘る音に足音を紛らせ、止まったら固まる", next: "f6_stairs" },
      { text: "静まった隙に、一気に走って抜ける", next: "gameover_dig" }
    ]
  },

  f6_stairs: {
    type: "normal",
    floor: 6,
    text: "階段の刻印は「五」。上から、冷たく湿った空気が降りてくる。",
    status: "第六層・階段の前",
    choices: [
      { text: "階段を上る", next: "f5_start" }
    ]
  },

  // ==================================================
  // 第五層：水没の礼拝堂
  // ==================================================

  f5_start: {
    type: "normal",
    floor: 5,
    checkpoint: true,
    text: "水没した巨大な礼拝堂。浅い所の水底で魔法陣が淡く光り、水が下層へ抜けるのを押さえている。",
    status: "第五層・水没の礼拝堂",
    choices: [
      { text: "さらに見回す", next: "f5_start2" }
    ]
  },

  f5_start2: {
    type: "normal",
    floor: 5,
    text: "水は浅い所でも腰の高さ、奥は底が見えない。浮かぶ長椅子や板の下に気配がある。天井には梁と、鐘が吊られている。",
    status: "第五層・水没の礼拝堂／水中に悪魔",
    choices: [
      { text: "向こう岸まで泳いで渡る", next: "gameover_water" },
      { text: "長椅子や板を並べ、足場にして渡る", next: "f5_bench" },
      { text: "天井の梁を伝って渡る", next: "f5_beam" },
      { text: "鐘を鳴らして、水中の悪魔を誘導する", next: "f5_bell" }
    ]
  },

  f5_bench: {
    type: "normal",
    floor: 5,
    text: "足場の下を、巨大な影がすぅっと通り過ぎた。水面がわずかに揺れる。",
    status: "第五層・足場の上",
    choices: [
      { text: "影が遠ざかるのを待ち、ゆっくり進む", next: "f5_stairs" },
      { text: "影が戻る前に、残りを走って渡る", next: "gameover_bench" }
    ]
  },

  f5_beam: {
    type: "normal",
    floor: 5,
    text: "腐った梁を伝う。途中の一本が折れており、隣の梁へ飛び移るしかない。",
    status: "第五層・梁の上／足場が脆い",
    choices: [
      { text: "思い切って、隣の梁へ飛び移る", next: "f5_jump" },
      { text: "危険だ。降りて別の方法を探す", next: "f5_start2" }
    ]
  },

  f5_jump: {
    type: "normal",
    floor: 5,
    text: "隣の梁にしがみついた。腕を強く打ち、梁が嫌な音を立てて軋んでいる。",
    status: "第五層・梁の上／腕を打撲",
    choices: [
      { text: "梁に体重をかけず、腕で這って進む", next: "f5_stairs_hurt" },
      { text: "梁によじ登り、立ち上がって走って渡る", next: "gameover_beam" }
    ]
  },

  f5_bell: {
    type: "normal",
    floor: 5,
    text: "鐘は広間の中央。綱は水際の柱まで伸びる。引くと、悪魔たちが鐘の真下へ泳いでいった。",
    status: "第五層・柱の陰／悪魔が誘導された",
    choices: [
      { text: "悪魔が鐘に向かった隙に、水の中を走る", next: "f5_bell_run" },
      { text: "確実に引きつけるため、もう一度鳴らす", next: "gameover_bell" }
    ]
  },

  f5_bell_run: {
    type: "normal",
    floor: 5,
    text: "水を蹴って走る。数匹が追ってきたが、岸に上がると水際で牙を鳴らすだけだった。",
    status: "第五層・向こう岸",
    choices: [
      { text: "階段へ向かう", next: "f5_stairs" }
    ]
  },

  f5_stairs_hurt: {
    type: "normal",
    floor: 5,
    text: "階段の刻印は「四」。打撲した腕が疼くが、じき引くだろう。上から、鉄と血の匂いが降りてくる。",
    status: "第五層・階段の前／腕を打撲",
    choices: [
      { text: "階段を上る", next: "f4_start" }
    ]
  },

  f5_stairs: {
    type: "normal",
    floor: 5,
    text: "階段の刻印は「四」。上から、鉄と血の匂いが降りてくる。",
    status: "第五層・階段の前",
    choices: [
      { text: "階段を上る", next: "f4_start" }
    ]
  },

  // ==================================================
  // 第四層：牢獄回廊
  // ==================================================

  f4_start: {
    type: "normal",
    floor: 4,
    checkpoint: true,
    text: "揺れない魔石灯に照らされた牢獄の廊下。地図の最下層だが、載るのは階段の位置だけ。奥には看守部屋がある。檻の悪魔たちが、こちらをうかがう。",
    status: "第四層・牢獄回廊",
    choices: [
      { text: "気配を殺して、ゆっくり歩く", next: "f4_slow" },
      { text: "走って、一気に駆け抜ける", next: "gameover_cell" },
      { text: "水袋の水を牢の奥へ撒き、気を引く", next: "f4_water" }
    ]
  },

  f4_slow: {
    type: "normal",
    floor: 4,
    text: "檻の気配を背に歩く。廊下の奥の看守部屋から、いびきが聞こえてくる。",
    status: "第四層・看守部屋の前",
    choices: [
      { text: "看守部屋の前を、忍び足で通る", next: "f4_guard" },
      { text: "別の道を探して引き返す", next: "f4_start" }
    ]
  },

  f4_guard: {
    type: "normal",
    floor: 4,
    text: "看守の悪魔が椅子で眠っている。出口の扉は、看守のすぐ後ろだ。",
    status: "第四層・看守の目の前",
    choices: [
      { text: "足音を殺して、背後を通る", next: "f4_stairs" },
      { text: "看守の顔の前を、堂々と通る", next: "gameover_guard" }
    ]
  },

  f4_water: {
    type: "normal",
    floor: 4,
    text: "撒かれた水に、渇いた悪魔たちが檻を揺らして群がる。物陰に身を寄せると、看守が怒鳴りながら脇を通り、檻へ向かった。",
    status: "第四層・牢獄回廊／水袋を失う",
    choices: [
      { text: "看守が離れた隙に、看守部屋の奥の扉へ急ぐ", next: "f4_stairs" },
      { text: "物陰で、騒ぎが収まるのを待つ", next: "gameover_guard_back" }
    ]
  },

  f4_stairs: {
    type: "normal",
    floor: 4,
    text: "階段の刻印は「三」。上から、古い紙とカビの匂いが降りてくる。",
    status: "第四層・階段の前",
    choices: [
      { text: "階段を上る", next: "f3_start" }
    ]
  },

  // ==================================================
  // 第三層：崩れた書庫
  // ==================================================

  f3_start: {
    type: "normal",
    floor: 3,
    checkpoint: true,
    text: "地図では書庫のはずの場所は崩れ果て、倒れた本棚が迷路のように積み重なる。壁の苔が淡く光り、奥で紙をめくる音がする。",
    status: "第三層・崩れた書庫",
    choices: [
      { text: "本棚の上をよじ登って進む", next: "f3_shelf" },
      { text: "本棚の間の通路を進む", next: "f3_aisle" },
      { text: "ランタンを灯して、明るく進む", next: "gameover_light" }
    ]
  },

  f3_shelf: {
    type: "normal",
    floor: 3,
    text: "朽ちた本棚の上を進む。木が軋む。下では、何かが這い回っている。",
    status: "第三層・本棚の上",
    choices: [
      { text: "体重を分散し、這って進む", next: "f3_shelf2" },
      { text: "次の棚へ跳び移る", next: "gameover_shelf" }
    ]
  },

  f3_aisle: {
    type: "normal",
    floor: 3,
    text: "通路の先の紙屑の山から、紙を食む悪魔が顔を上げた。",
    status: "第三層・通路／悪魔と遭遇",
    choices: [
      { text: "紙屑を頭からかぶり、山に紛れる", next: "f3_paper" },
      { text: "火を灯したランタンを、遠くの紙の山へ投げる", next: "f3_lure" },
      { text: "ナイフで斬りかかる", next: "gameover_blade" }
    ]
  },

  f3_paper: {
    type: "normal",
    floor: 3,
    text: "紙屑の下で身を伏せる。紙とカビの匂いが人の匂いを隠し、悪魔は山を素通りした。",
    status: "第三層・紙屑の下",
    choices: [
      { text: "悪魔が去ってから、先へ進む", next: "f3_stairs" }
    ]
  },

  f3_lure: {
    type: "normal",
    floor: 3,
    text: "ランタンが遠くの紙の山に落ち、炎が燃え広がる。悪魔は炎に群がり、煙が書庫に広がり始めた。",
    status: "第三層・書庫／ランタンを手放した",
    choices: [
      { text: "息を潜め、煙の中を静かに進む", next: "gameover_smoke" },
      { text: "口を覆い、煙が回る前に走り抜ける", next: "f3_stairs" }
    ]
  },

  f3_shelf2: {
    type: "normal",
    floor: 3,
    text: "棚の端で、下の悪魔が顔を上げた。軋む音に気づいたらしい。",
    status: "第三層・本棚の上／悪魔が見上げている",
    choices: [
      { text: "動きを止め、悪魔が下を向くまで息を殺す", next: "f3_stairs" },
      { text: "ゆっくり静かに、そのまま進み続ける", next: "gameover_creak" }
    ]
  },

  f3_stairs: {
    type: "normal",
    floor: 3,
    text: "階段の刻印は「二」。上から、かすかに温かい光が降りてくる。",
    status: "第三層・階段の前",
    choices: [
      { text: "階段を上る", next: "f2_start" }
    ]
  },

  // ==================================================
  // 第二層：夕日の裂け目
  // ==================================================

  f2_start: {
    type: "normal",
    floor: 2,
    checkpoint: true,
    text: "天井の裂け目から、夕日の一筋が洞窟に差している。悪魔たちは光を避け、影に潜む。",
    status: "第二層・夕日の裂け目",
    choices: [
      { text: "光の筋の中を進む", next: "f2_light" },
      { text: "影の濃い壁際を進む", next: "f2_shadow" }
    ]
  },

  f2_light: {
    type: "normal",
    floor: 2,
    text: "光の中は安全だった。だが日が傾き、光の筋が急速に細く弱まっていく。",
    status: "第二層・光の筋の中／日没が迫る",
    choices: [
      { text: "光が消える前に、出口へ走る", next: "f2_edge" },
      { text: "光の中にとどまり、夜明けを待つ", next: "gameover_dark" }
    ]
  },

  f2_shadow: {
    type: "normal",
    floor: 2,
    text: "壁際の影は、悪魔たちの縄張りだった。無数の気配が、息を潜めてこちらをうかがっている。",
    status: "第二層・影の中／囲まれつつある",
    choices: [
      { text: "光の筋の中へ飛び込む", next: "f2_light" },
      { text: "影に紛れて、そのまま進む", next: "gameover_shadow" }
    ]
  },

  f2_edge: {
    type: "normal",
    floor: 2,
    text: "光の筋の端に来た。出口へは、足場の崩れかけた岩場と、風が通る静かな抜け道がある。岩場には残光が差し、抜け道は闇の中だ。",
    status: "第二層・光の端／日没が迫る",
    choices: [
      { text: "風の通る静かな抜け道を、闇の中へ進む", next: "gameover_passage" },
      { text: "崩れかけの岩場を、残光の中で越える", next: "f2_run" },
      { text: "崩れる前に、岩場を一気に駆け抜けて越える", next: "gameover_rocks" }
    ]
  },


  f2_run: {
    type: "normal",
    floor: 2,
    text: "光が消える寸前、坑道へ駆け込んだ。入口の刻印は「一」。背後で、悪魔たちが残光に阻まれ牙を鳴らす。",
    status: "第二層・出口",
    choices: [
      { text: "坑道を進む", next: "f1_start" }
    ]
  },

  // ==================================================
  // 第一層：旧坑道
  // ==================================================

  f1_start: {
    type: "normal",
    floor: 1,
    checkpoint: true,
    text: "崩れた旧坑道。外の風の匂いがする。出口の前に、巨大な悪魔が座り込んでいる。",
    status: "第一層・旧坑道／夜",
    choices: [
      { text: "様子をうかがう", next: "f1_start2" }
    ]
  },

  f1_start2: {
    type: "normal",
    floor: 1,
    text: "最近の崩落で開いた出口を、夜は見張っているらしい。脇には、細い排水溝と横穴がある。",
    status: "第一層・旧坑道／出口は目前",
    choices: [
      { text: "狭い排水溝をくぐって外へ出る", next: "f1_drain" },
      { text: "風下の物陰に潜み、夜明けを待つ", next: "f1_dawn" },
      { text: "起きている悪魔へ、逃げずに近づく", next: "f1_bold" }
    ]
  },

  f1_drain: {
    type: "normal",
    floor: 1,
    text: "排水溝の中ほどで肩がつかえ、動けなくなった。外の月明かりは、すぐそこだ。",
    status: "第一層・排水溝の中／身動きがとれない",
    choices: [
      { text: "上着と荷物を脱ぎ、息を吐いて身体を細くする", next: "escape_normal" },
      { text: "力任せに、壁を押し広げる", next: "gameover_stuck" }
    ]
  },

  f1_dawn: {
    type: "normal",
    floor: 1,
    text: "風下の物陰で夜明けを待つ。悪魔は動かない。崩れた天井の隙間から細い光が差し始め、少しずつ出口の悪魔へ伸びていく。",
    status: "第一層・物陰／夜明け",
    choices: [
      { text: "悪魔の動きを、最後まで見極める", next: "escape_true" },
      { text: "気が緩み、出口へ駆け出す", next: "gameover_gate" }
    ]
  },

  f1_bold: {
    type: "normal",
    floor: 1,
    text: "悪魔が鼻を鳴らし、あなたへ顔を向ける。そして、ゆっくりと立ち上がった。",
    status: "第一層・悪魔の目の前",
    choices: [
      { text: "動きを抑え、ゆっくり後ずさりする", next: "f1_bold2" },
      { text: "恐怖に耐えかね、背を向けて走る", next: "gameover_gate" }
    ]
  },

  f1_bold2: {
    type: "normal",
    floor: 1,
    text: "悪魔は唸るが、逃げない獲物に興味を失ったように、身を丸めて目を閉じた。眠りは浅く、鼻先がまだ小さく動いている。",
    status: "第一層・悪魔が浅く眠っている",
    choices: [
      { text: "悪魔の気が変わる前に、横を駆け抜ける", next: "gameover_gate" },
      { text: "壁際を回り込み、足音を殺して外へ向かう", next: "escape_gamble" },
      { text: "悪魔が深く眠るまで、その場で待つ", next: "gameover_wait" }
    ]
  },


  // ==================================================
  // ゲームオーバー
  // ==================================================

  gameover_shout: {
    type: "gameover",
    floor: 10,
    text: "<span class='danger-text'>【ゲームオーバー：呼び声】</span>\n\n声は闇に反響した。返事の代わりに、無数の何かが這い寄る音が答えた。",
    status: "死亡",
    choices: []
  },

  gameover_light: {
    type: "gameover",
    text: "<span class='danger-text'>【ゲームオーバー：灯火】</span>\n\n揺れる炎に群がるように、闇の中の赤い目が集まってきた。",
    status: "死亡",
    choices: []
  },

  gameover_moss: {
    type: "gameover",
    floor: 10,
    text: "<span class='danger-text'>【ゲームオーバー：消えた光】</span>\n\n苔を潰す音と匂いに、小悪魔たちが一斉に目を覚まし、牙を剥いた。",
    status: "死亡",
    choices: []
  },

  gameover_run: {
    type: "gameover",
    floor: 10,
    text: "<span class='danger-text'>【ゲームオーバー：疾走】</span>\n\n駆ける足音が空洞に響く。眠っていた悪魔の目が、ゆっくりと開いた。",
    status: "死亡",
    choices: []
  },

  gameover_stone: {
    type: "gameover",
    floor: 10,
    text: "<span class='danger-text'>【ゲームオーバー：立ち尽くす者】</span>\n\n何もないと悟った悪魔が振り返る。立ち尽くすあなたの匂いを、鼻が捉えた。",
    status: "死亡",
    choices: []
  },

  gameover_hole: {
    type: "gameover",
    floor: 10,
    text: "<span class='danger-text'>【ゲームオーバー：落下】</span>\n\n指先は岩に届かなかった。身体は闇に吸い込まれ、悲鳴は消えた。",
    status: "死亡",
    choices: []
  },

  gameover_bones: {
    type: "gameover",
    floor: 9,
    text: "<span class='danger-text'>【ゲームオーバー：骨の音】</span>\n\n骨の砕ける音が回廊に響く。駆けてきた悪魔の長い腕が、あなたを掴んだ。",
    status: "死亡",
    choices: []
  },

  gameover_chase: {
    type: "gameover",
    floor: 9,
    text: "<span class='danger-text'>【ゲームオーバー：追跡】</span>\n\n走り出した気配に、見張りが振り向いた。狭い回廊に、逃げ場はなかった。",
    status: "死亡",
    choices: []
  },

  gameover_gas: {
    type: "gameover",
    floor: 8,
    text: "<span class='danger-text'>【ゲームオーバー：爆炎】</span>\n\n霧は可燃性のガスだった。炎が触れた瞬間、湿地は火の海になった。",
    status: "死亡",
    choices: []
  },

  gameover_swamp: {
    type: "gameover",
    floor: 8,
    text: "<span class='danger-text'>【ゲームオーバー：沼】</span>\n\n泡立つ音の方は底なし沼だった。泥が足を飲み込み、もがくほど沈んだ。",
    status: "死亡",
    choices: []
  },

  gameover_slip: {
    type: "gameover",
    floor: 8,
    text: "<span class='danger-text'>【ゲームオーバー：滑落】</span>\n\n濡れた岩に足が滑った。泥の中の巨大な影が、口を開けて待っていた。",
    status: "死亡",
    choices: []
  },

  gameover_statue: {
    type: "gameover",
    floor: 7,
    text: "<span class='danger-text'>【ゲームオーバー：擬態】</span>\n\n石像の目が動いた。悪魔はあなたを掴み、溶岩の川へ放り投げた。",
    status: "死亡",
    choices: []