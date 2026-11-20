// 問題バンクの検証。使い方: node scripts/validate.mjs
import { readFileSync, existsSync } from 'node:fs';

const errors = [];
const err = (m) => errors.push(m);
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const ids = new Set();

for (const cert of ['developer', 'architect', 'architect-pro', 'associate']) {
  const exam = readJson(`exams/${cert}.json`);
  const weight = exam.domains.reduce((s, d) => s + d.weight, 0);
  if (Math.abs(weight - 100) > 0.5) err(`${cert}: 配点の合計が ${weight}`);
  const mockSum = exam.domains.reduce((s, d) => s + d.mockCount, 0);
  if (mockSum !== exam.questions) err(`${cert}: mockCount の合計 ${mockSum} が問題数 ${exam.questions} と不一致`);

  // トピック(公式資料の概要)。問題の topics から参照される
  const tpath = `topics/${cert}.json`;
  const topics = new Set();
  if (existsSync(tpath)) {
    for (const t of readJson(tpath)) {
      const at = `${tpath} ${t.id}`;
      if (!t.id || topics.has(t.id)) err(`${at}: id がない、または重複`);
      topics.add(t.id);
      if (!t.title || !t.summary) err(`${at}: title / summary がない`);
      if (!Array.isArray(t.points) || !t.points.length || t.points.some((x) => typeof x !== 'string' || !x)) err(`${at}: points が不正`);
      if (!Array.isArray(t.sources) || !t.sources.length || t.sources.some((x) => !x.title || !/^https:\/\//.test(x.url ?? ''))) err(`${at}: sources が不正`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(t.checked ?? '')) err(`${at}: checked が日付でない`);
    }
  }
  const usedTopics = new Set();
  let withTopics = 0;

  let scenarios = {};
  if (exam.scenarioBased) {
    for (const s of readJson(`questions/${cert}/scenarios.json`)) {
      if (!s.id || !s.title || !s.text) err(`${cert}: シナリオの項目不足 ${s.id}`);
      scenarios[s.id] = 0;
    }
  }

  console.log(`\n${exam.code} ${exam.name}`);
  let total = 0;
  for (const d of exam.domains) {
    const path = `questions/${cert}/${d.id}.json`;
    const qs = existsSync(path) ? readJson(path) : [];
    total += qs.length;
    console.log(`  ${String(qs.length).padStart(3)} 問 (模試に必要 ${String(d.mockCount).padStart(2)})  ${d.name}${!exam.scenarioBased && qs.length < d.mockCount ? '  ← 不足' : ''}`);
    for (const q of qs) {
      const at = `${path} ${q.id}`;
      if (!q.id) err(`${path}: id がない`);
      if (ids.has(q.id)) err(`${at}: id が重複`);
      ids.add(q.id);
      if (q.cert !== cert) err(`${at}: cert が ${q.cert}`);
      if (q.domain !== d.id) err(`${at}: domain が ${q.domain}`);
      if (!['single', 'multi'].includes(q.type)) err(`${at}: type が不正`);
      if (!q.stem || !q.explanation) err(`${at}: stem / explanation がない`);
      if (!Array.isArray(q.choices) || q.choices.length < 4) err(`${at}: 選択肢が4つ未満`);
      const cids = (q.choices ?? []).map((c) => c.id);
      if (new Set(cids).size !== cids.length) err(`${at}: 選択肢 id が重複`);
      for (const c of q.choices ?? []) if (!c.text || !c.why) err(`${at}: 選択肢 ${c.id} の text / why がない`);
      if (!Array.isArray(q.answer) || !q.answer.length) err(`${at}: answer がない`);
      for (const a of q.answer ?? []) if (!cids.includes(a)) err(`${at}: answer ${a} が選択肢にない`);
      if (q.type === 'single' && q.answer?.length !== 1) err(`${at}: single なのに正解が ${q.answer?.length} 個`);
      if (q.type === 'multi') {
        if (q.answer?.length < 2) err(`${at}: multi なのに正解が1個`);
        if (!q.stem.includes(`${q.answer?.length}つ`)) err(`${at}: multi の問題文に「${q.answer?.length}つ」がない`);
      }
      if (!Array.isArray(q.refs) || !q.refs.length || q.refs.some((r) => !/^https:\/\//.test(r))) err(`${at}: refs が不正`);
      if (q.topics !== undefined) {
        if (!Array.isArray(q.topics) || !q.topics.length) err(`${at}: topics が不正`);
        else {
          withTopics++;
          for (const t of q.topics) { if (!topics.has(t)) err(`${at}: トピック ${t} が ${tpath} にない`); usedTopics.add(t); }
        }
      }
      if (exam.scenarioBased) {
        if (!(q.scenarioId in scenarios)) err(`${at}: scenarioId ${q.scenarioId} がない`);
        else scenarios[q.scenarioId]++;
      } else if (q.scenarioId) err(`${at}: シナリオ形式でない試験に scenarioId がある`);
    }
  }
  console.log(`  計 ${total} 問`);
  if (topics.size) {
    console.log(`  トピック ${topics.size} 件。トピック付きの問題 ${withTopics} / ${total} 問`);
    for (const t of topics) if (!usedTopics.has(t)) err(`${tpath} ${t}: どの問題からも参照されていない`);
  }
  for (const [s, n] of Object.entries(scenarios)) console.log(`  シナリオ ${s}: ${n} 問`);
}

if (errors.length) {
  console.error(`\n${errors.length} 件のエラー`);
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
console.log('\n問題バンクは正常です');
