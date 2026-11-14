// 選択肢の長さから正解を推測できるかを測る。使い方: node scripts/length-bias.mjs
import { loadAll } from './patch-lib.mjs';
for (const cert of ['developer', 'architect']) {
  const rank = [0, 0, 0, 0]; let n = 0;
  for (const f of loadAll().filter((f) => f.path.includes(cert))) for (const q of f.qs) {
    if (q.type !== 'single') continue;
    const len = q.choices.find((c) => c.id === q.answer[0]).text.length;
    rank[Math.min(3, q.choices.filter((c) => c.text.length > len).length)]++; n++;
  }
  console.log(`${cert}: 単一選択 ${n} 問。正解の長さの順位 1位 ${rank[0]} (${Math.round(rank[0] / n * 100)}%) / 2位 ${rank[1]} / 3位 ${rank[2]} / 4位 ${rank[3]}`);
}
