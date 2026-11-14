// 正解が最長の単一選択問題を、差の小さい順に出す。使い方: node scripts/length-gaps.mjs <資格> <件数>
import { loadAll } from './patch-lib.mjs';
const [cert, limit] = [process.argv[2], Number(process.argv[3] || 100)];
const rows = [];
for (const f of loadAll().filter((f) => f.path.includes(cert))) for (const q of f.qs) {
  if (q.type !== 'single') continue;
  const len = q.choices.find((c) => c.id === q.answer[0]).text.length;
  const wrong = q.choices.filter((c) => !q.answer.includes(c.id)).sort((a, b) => b.text.length - a.text.length);
  if (wrong[0].text.length >= len) continue;
  rows.push({ gap: len - wrong[0].text.length, line: `${q.id.replace(/^(dev|arch)-/, '')} +${len - wrong[0].text.length} ${wrong[0].id}:${wrong[0].text}` });
}
rows.sort((a, b) => a.gap - b.gap);
console.log(rows.slice(0, limit).map((r) => r.line).join('\n'));
