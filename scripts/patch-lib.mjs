// 問題バンクの JSON を直接書き換えるための補助。問題 ID ごとの差分を適用する。
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
export function loadAll() {
  const files = [];
  for (const cert of ['developer', 'architect', 'architect-pro'])
    for (const f of readdirSync(`questions/${cert}`))
      if (f !== 'scenarios.json') { const path = `questions/${cert}/${f}`; files.push({ path, qs: JSON.parse(readFileSync(path, 'utf8')) }); }
  return files;
}
export const saveAll = (files) => { for (const f of files) writeFileSync(f.path, JSON.stringify(f.qs, null, 1) + '\n'); };
export const find = (files, pred) => files.flatMap((f) => f.qs).filter(pred);
