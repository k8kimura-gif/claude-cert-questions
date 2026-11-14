// 事実の主張が、取得済みのページ本文に書かれているかを調べる。
// 使い方: node scripts/check-claims.mjs <照合ファイル>
// 照合ファイルは 1 行 1 件で「ラベル || 正規表現 || ページのキーの一部」。# で始まる行は無視する。
//   例: so: additionalProperties false || additionalProperties.{0,60}false || structured_outputs
// OK なら前後の本文を出すので、主張と同じ意味かを必ず目で確かめる (語が載っているだけでは裏付けにならない)。
// MISSING は「書かれていない」か「正規表現が合っていない」のどちらかなので、本文を読んで判断する。
import { readFileSync, readdirSync } from 'node:fs';
const DIR = '.verify/pages';
const files = readdirSync(DIR);
let bad = 0;
for (const line of readFileSync(process.argv[2], 'utf8').split('\n')) {
  if (!line.trim() || line.startsWith('#')) continue;
  const [label, pat, fpat] = line.split(' || ').map((s) => s.trim());
  if (!fpat) { console.log(`書式エラー  ${line}`); bad++; continue; }
  const hits = files.filter((f) => f.includes(fpat));
  if (hits.length !== 1) { console.log(`${hits.length ? 'ページが複数に一致' : 'ページなし'}  ${label}  [${fpat}] ${hits.join(', ')}`); bad++; continue; }
  const text = readFileSync(`${DIR}/${hits[0]}`, 'utf8');
  const m = new RegExp(pat, 'is').exec(text);
  if (!m) { console.log(`MISSING  ${label}  [${hits[0]}]`); bad++; continue; }
  const around = text.slice(Math.max(0, m.index - 80), m.index + m[0].length + 120).replace(/\s+/g, ' ');
  console.log(`OK  ${label} :: ${around.slice(0, 260)}`);
}
console.log(bad ? `\n要確認 ${bad} 件` : '\nすべて本文に見つかった');
