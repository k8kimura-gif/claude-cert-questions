// トピックと、問題の解説の書き換えを適用する。
// 使い方: node scripts/apply-topics.mjs <差分ファイル.mjs>
// 差分ファイルは次を export する。
//   CERT   資格 ID (developer / associate など)
//   TOPICS トピックの配列。同じ id があれば置き換える
//   Q      { 問題ID: { explanation?, topics?, refs?, why?: { 選択肢ID: 新しい文 } } }
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { loadAll, saveAll } from './patch-lib.mjs';

const { CERT, TOPICS = [], Q = {} } = await import(pathToFileURL(resolve(process.argv[2])).href);
const tpath = `topics/${CERT}.json`;
const topics = existsSync(tpath) ? JSON.parse(readFileSync(tpath, 'utf8')) : [];
for (const t of TOPICS) {
  const i = topics.findIndex((x) => x.id === t.id);
  if (i >= 0) topics[i] = t; else topics.push(t);
}
writeFileSync(tpath, JSON.stringify(topics, null, 1) + '\n');

const files = loadAll();
const byId = new Map(files.flatMap((f) => f.qs).map((q) => [q.id, q]));
let n = 0;
for (const [id, p] of Object.entries(Q)) {
  const q = byId.get(id);
  if (!q) throw new Error(`問題がない: ${id}`);
  if (q.cert !== CERT) throw new Error(`資格が違う: ${id}`);
  if (p.explanation) q.explanation = p.explanation;
  if (p.refs) q.refs = p.refs;
  for (const [cid, text] of Object.entries(p.why || {})) {
    const c = q.choices.find((x) => x.id === cid);
    if (!c) throw new Error(`選択肢がない: ${id} ${cid}`);
    c.why = text;
  }
  if (p.topics) {
    for (const t of p.topics) if (!topics.some((x) => x.id === t)) throw new Error(`トピックがない: ${id} ${t}`);
    // topics は refs の直後に置く
    const { refs, ...rest } = q;
    for (const k of Object.keys(q)) delete q[k];
    Object.assign(q, rest, { refs, topics: p.topics });
  }
  n++;
}
saveAll(files);
console.log(`トピック ${TOPICS.length} 件、問題 ${n} 問を更新した (${tpath} は計 ${topics.length} 件)`);
