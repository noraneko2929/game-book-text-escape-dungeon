/**
 * validateStory.js
 * storyData.js の整合性チェック用スクリプト
 * 使い方: node validateStory.js [storyData.jsのパス]
 *
 * 【エラーにする項目（1件でもあれば終了コード1）】
 *  - 遷移先IDの存在 / 孤立ノード / 行き止まり(normal) / ID重複定義
 *  - 本文の文字数（90文字以内。タイトル行を含み、HTMLタグと改行は除く）
 *  - type / floor / checkpoint / endingId の整合
 *  - 通常ノード間の遷移は、floor が「同じ」か「1つ下」（例外は許可リストのみ）
 *  - ゲームオーバーの floor 省略は、許可リストのIDのみ
 *  - floor を持つゲームオーバーは、遷移元の通常ノードの floor と一致
 *  - checkpoint は true のみ、type: normal のノードにのみ付与可
 *  - endingId は "true" / "normal" / "gamble" のみ
 *  - type とノードIDの接頭辞の整合（gameover_ / escape_）
 *
 * 【参考値として出力する項目（合否・終了コードには影響しない）】
 *  - 直接死亡の選択肢の割合
 *  - 死亡選択肢を含み正解が1つのページのうち、正解が1番目のページの割合
 *  - 同ページのうち、正解が最長の選択肢（同率を含む）のページの割合
 */
const fs = require('fs');
const vm = require('vm');

// ---- 許可リスト（追加する場合は理由を明記すること） ----
// floor が2つ以上下がる、または上がる遷移の例外（縦穴の近道）
const FLOOR_JUMP_ALLOW = {
  'hole_climb->hole_top': { from: 10, to: 8 }
};
// 複数階層から共有されるため floor を省略できるゲームオーバー
const GAMEOVER_FLOOR_OMIT_ALLOW = new Set(['gameover_light']);

const TYPES = ['normal', 'gameover', 'ending'];
const ENDING_IDS = ['true', 'normal', 'gamble'];
const MAX = 90;

const file = process.argv[2] || 'storyData.js';
const src = fs.readFileSync(file, 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(src + '\n;this.__data = storyData;', ctx);
const d = ctx.__data;
const ids = Object.keys(d);
const errors = [];
const err = (m) => errors.push(m);

// ID重複（オブジェクトリテラルでは後勝ちになり気づけないため、ソースを直接数える）
const seen = {};
for (const m of src.matchAll(/^  ([A-Za-z0-9_]+): \{$/gm)) seen[m[1]] = (seen[m[1]] || 0) + 1;
for (const [k, n] of Object.entries(seen)) if (n > 1) err(`ID重複: ${k} (${n}回)`);

// 遷移元の一覧
const preds = {};
for (const id of ids) for (const c of d[id].choices) (preds[c.next] = preds[c.next] || []).push(id);

for (const id of ids) {
  const p = d[id];
  const len = [...String(p.text).replace(/<[^>]*>/g, '').replace(/\n/g, '')].length;
  if (len > MAX) err(`文字数超過: ${id} (${len}字)`);

  // type / ID接頭辞
  if (!TYPES.includes(p.type)) err(`type不正: ${id} (${p.type})`);
  if (id.startsWith('gameover_') && p.type !== 'gameover') err(`type不一致: ${id} は gameover であるべき (${p.type})`);
  if (id.startsWith('escape_') && p.type !== 'ending') err(`type不一致: ${id} は ending であるべき (${p.type})`);
  if (p.type === 'gameover' && !id.startsWith('gameover_')) err(`ID不一致: type:gameover のIDは gameover_ で始める (${id})`);
  if (p.type === 'ending' && !id.startsWith('escape_')) err(`ID不一致: type:ending のIDは escape_ で始める (${id})`);
  if (p.type === 'normal' && (id.startsWith('gameover_') || id.startsWith('escape_'))) err(`ID不一致: normal に予約接頭辞 (${id})`);

  // floor
  if (p.floor !== undefined && !(Number.isInteger(p.floor) && p.floor >= 1 && p.floor <= 10)) err(`floor範囲外: ${id} (${p.floor})`);
  if (p.type !== 'gameover' && !Number.isInteger(p.floor)) err(`floor欠落: ${id}`);
  if (p.type === 'gameover' && p.floor === undefined && !GAMEOVER_FLOOR_OMIT_ALLOW.has(id)) {
    err(`floor省略は許可リスト外: ${id}`);
  }
  if (p.type === 'gameover' && Number.isInteger(p.floor)) {
    for (const from of preds[id] || []) {
      if (d[from].type === 'normal' && d[from].floor !== p.floor) {
        err(`ゲームオーバーのfloor不一致: ${id}(floor ${p.floor}) <- ${from}(floor ${d[from].floor})`);
      }
    }
  }

  // checkpoint / endingId
  if ('checkpoint' in p) {
    if (p.checkpoint !== true) err(`checkpointは true のみ許可: ${id} (${JSON.stringify(p.checkpoint)})`);
    if (p.type !== 'normal') err(`checkpointは normal のみ: ${id} (${p.type})`);
  }
  if ('endingId' in p && !ENDING_IDS.includes(p.endingId)) err(`endingId不正: ${id} (${p.endingId})`);
  if (p.type === 'ending' && !p.endingId) err(`endingId欠落: ${id}`);
  if (p.type !== 'ending' && 'endingId' in p) err(`endingIdが不要: ${id}`);

  // 選択肢・状態
  if (p.type === 'gameover' && p.choices.length !== 0) err(`gameoverに選択肢あり: ${id}`);
  if (p.type === 'normal' && p.choices.length === 0) err(`行き止まり(normal): ${id}`);
  if (p.type === 'normal' && !p.status) err(`status欠落: ${id}`);
  for (const c of p.choices) {
    if (!d[c.next]) { err(`リンク切れ: ${id} -> ${c.next}`); continue; }
    if (!c.text) err(`選択肢の文章が空: ${id}`);
    // 通常ノード間の階層遷移
    if (p.type === 'normal' && d[c.next].type === 'normal') {
      const diff = p.floor - d[c.next].floor;
      const key = `${id}->${c.next}`;
      const allowedJump = FLOOR_JUMP_ALLOW[key];
      if (!allowedJump && !(diff === 0 || diff === 1)) {
        err(`階層遷移が不正: ${key} (floor ${p.floor} -> ${d[c.next].floor})`);
      }
    }
  }
}

// 許可リストの死に項目（実在しない遷移・ID）を検出
for (const [key, expected] of Object.entries(FLOOR_JUMP_ALLOW)) {
  const [a, b] = key.split('->');
  if (!d[a] || !d[a].choices.some((c) => c.next === b)) {
    err(`許可リストの遷移が存在しない: ${key}`);
    continue;
  }
  if (!Number.isInteger(expected.from) || !Number.isInteger(expected.to)) {
    err(`許可リストの階層指定が不正: ${key}`);
  } else if (d[a].floor !== expected.from || !d[b] || d[b].floor !== expected.to) {
    err(`許可リストの階層指定不一致: ${key} (期待 ${expected.from} -> ${expected.to} / 実際 ${d[a].floor} -> ${d[b] && d[b].floor})`);
  }
}
for (const id of GAMEOVER_FLOOR_OMIT_ALLOW) if (!d[id]) err(`許可リストのIDが存在しない: ${id}`);

// 到達可能性
const reach = new Set(['start']);
const q = ['start'];
while (q.length) {
  const i = q.shift();
  for (const c of d[i].choices) if (d[c.next] && !reach.has(c.next)) { reach.add(c.next); q.push(c.next); }
}
for (const id of ids) if (!reach.has(id)) err(`孤立ノード: ${id}`);

// チェックポイント: 各階層に最低1つ
for (let f = 1; f <= 10; f++) {
  if (!ids.some((i) => d[i].checkpoint === true && d[i].floor === f)) err(`チェックポイントなし: 第${f}層`);
}

// ---- 参考値（合否に影響しない） ----
const cnt = (t) => ids.filter((i) => d[i].type === t).length;
const trans = ids.reduce((n, i) => n + d[i].choices.length, 0);
console.log(`ノード数: ${ids.length}（normal ${cnt('normal')} / gameover ${cnt('gameover')} / ending ${cnt('ending')}）、遷移数: ${trans}`);

const isDeath = (c) => d[c.next] && d[c.next].type === 'gameover';
let br = 0, death = 0;
const single = []; // 死亡選択肢を含み、正解（非死亡）が1つのページ
for (const id of ids) {
  const p = d[id];
  if (p.choices.length < 2) continue;
  for (const c of p.choices) { br++; if (isDeath(c)) death++; }
  const good = p.choices.filter((c) => !isDeath(c));
  if (p.choices.some(isDeath) && good.length === 1) single.push(id);
}
const pct = (a, b) => (b ? `${a}/${b}（${Math.round((a / b) * 100)}%）` : '0/0');
console.log(`[参考] 直接死亡の選択肢の割合: ${pct(death, br)}`);
const lenOf = (c) => [...c.text].length;
let first = 0, longest = 0;
const firstIds = [], longestIds = [];
for (const id of single) {
  const ch = d[id].choices;
  const idx = ch.findIndex((c) => !isDeath(c));
  if (idx === 0) { first++; firstIds.push(id); }
  if (lenOf(ch[idx]) >= Math.max(...ch.map(lenOf))) { longest++; longestIds.push(id); }
}
console.log(`[参考] 死亡選択肢を含み正解が1つのページ数: ${single.length}`);
console.log(`[参考] 正解が1番目のページの割合: ${pct(first, single.length)}`);
console.log(`[参考] 正解が最長（同率含む）のページの割合: ${pct(longest, single.length)}`);

if (errors.length) {
  console.log(`\nNG: ${errors.length}件`);
  errors.forEach((e) => console.log(' - ' + e));
  process.exit(1);
}
console.log('OK: すべてのチェックに合格しました');