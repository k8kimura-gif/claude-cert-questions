// 検証の下準備。問題を参照元のページごとにまとめ、ページ本文を手元に取得する。
// 使い方: node scripts/verify-prep.mjs [--ids id1,id2,...] [--no-fetch]
// 出力 (.verify/ 以下。git には入れない):
//   index.tsv           問題数 / ページのキー / URL (問題数の多い順)
//   claims/<キー>.txt   そのページを第一参照にする問題の「ID: 問題文 → 正解 / 解説」
//   pages/<キー>.txt    ページ本文
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { loadAll } from './patch-lib.mjs';

const args = process.argv.slice(2);
const ids = args.includes('--ids') ? new Set(args[args.indexOf('--ids') + 1].split(',')) : null;
const OUT = '.verify';
for (const d of ['claims', 'pages']) mkdirSync(`${OUT}/${d}`, { recursive: true });

export const keyOf = (url) => url.replace(/^https?:\/\//, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/_+$/, '');

const groups = new Map();
for (const q of loadAll().flatMap((f) => f.qs)) {
  if (ids && !ids.has(q.id)) continue;
  const url = q.refs[0];
  if (!groups.has(url)) groups.set(url, []);
  groups.get(url).push(q);
}
const sorted = [...groups].sort((a, b) => b[1].length - a[1].length);
writeFileSync(`${OUT}/index.tsv`, sorted.map(([url, qs]) => `${qs.length}\t${keyOf(url)}\t${url}`).join('\n') + '\n');
for (const [url, qs] of sorted) {
  const lines = qs.map((q) => {
    const right = q.choices.filter((c) => q.answer.includes(c.id)).map((c) => c.text).join(' / ');
    return `${q.id}: ${q.stem}\n  → ${right}\n  解説: ${q.explanation}`;
  });
  writeFileSync(`${OUT}/claims/${keyOf(url)}.txt`, `${url}\n\n${lines.join('\n\n')}\n`);
}
console.log(`${sorted.length} ページ / ${sorted.reduce((n, [, qs]) => n + qs.length, 0)} 問を ${OUT}/ にまとめた`);

if (!args.includes('--no-fetch')) {
  const strip = (html) => html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'");
  const get = async (url) => {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30000), headers: { 'user-agent': 'cert-question-verifier' } });
    return { ok: r.ok, status: r.status, moved: r.url !== url ? r.url : null, text: await r.text() };
  };
  const problems = [];
  for (const [url] of sorted) {
    const path = `${OUT}/pages/${keyOf(url)}.txt`;
    if (existsSync(path)) continue;
    try {
      // ドキュメントのサイトは .md を付けると Markdown の原文が返る。だめなら HTML から文字だけを取り出す。
      let r = /\/docs\//.test(url) ? await get(url + '.md') : { ok: false };
      let text = r.ok && !/^\s*<!doctype html/i.test(r.text) ? r.text : null;
      if (!text) { r = await get(url); if (r.ok) text = strip(r.text); }
      if (!text || text.length < 500) { problems.push(`取得できない (${r.status}): ${url}`); continue; }
      if (r.moved && !r.moved.startsWith(url)) problems.push(`移転している: ${url} → ${r.moved}`);
      writeFileSync(path, text);
    } catch (e) { problems.push(`取得できない (${e.message}): ${url}`); }
  }
  console.log(problems.length ? `確認が必要なページ:\n  ${problems.join('\n  ')}` : 'すべてのページを取得した');
  process.exit(0); // 接続が残っていると終了しないことがあるので、明示的に終える
}
