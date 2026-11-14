// 使い方: node scripts/apply-patch.mjs <差分ファイル>  差分は { 問題ID: { 選択肢ID: 新しい文 } }
import { pathToFileURL } from 'node:url';
import { loadAll, saveAll } from './patch-lib.mjs';
const { P } = await import(pathToFileURL(process.argv[2]));
const files = loadAll(); const byId = Object.fromEntries(files.flatMap((f) => f.qs).map((q) => [q.id, q]));
let n = 0;
for (const [id, ch] of Object.entries(P)) {
  const q = byId[id]; if (!q) throw new Error('no question ' + id);
  for (const [cid, text] of Object.entries(ch)) {
    const c = q.choices.find((x) => x.id === cid); if (!c) throw new Error(`${id} ${cid}`);
    if (q.answer.includes(cid)) throw new Error(`${id} ${cid} は正解の選択肢`);
    c.text = text; n++;
  }
}
saveAll(files); console.log(`${n} 個の選択肢を書き換えた`);
