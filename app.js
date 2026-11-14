'use strict';
// Claude 資格対策アプリ。バックエンドなし。学習記録は端末の localStorage に資格ごとに保存する。

const KEY = 'ccq:v1:';
const CERTS = ['developer', 'architect'];
const INTERVALS = [1, 3, 7, 14]; // 連続正解数ごとの復習間隔(日)
const RESERVE_DAYS = 2;          // 試験直前は新規問題を出さず、模試と復習に充てる
const MIN_DAILY = 5;

// ---------- 小道具 ----------
const el = (tag, props = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return n;
};
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => ymd(new Date());
const toDate = (s) => new Date(s + 'T00:00:00');
const addDays = (s, n) => { const d = toDate(s); d.setDate(d.getDate() + n); return ymd(d); };
const diffDays = (a, b) => Math.round((toDate(b) - toDate(a)) / 864e5);
const pct = (ok, n) => (n ? Math.round((ok / n) * 100) : 0);
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const weightedPick = (arr, w) => {
  const ws = arr.map((x) => Math.max(0.001, w(x)));
  let r = Math.random() * ws.reduce((s, x) => s + x, 0);
  for (let i = 0; i < arr.length; i++) { r -= ws[i]; if (r <= 0) return arr[i]; }
  return arr[arr.length - 1];
};
const weightedSample = (arr, n, w) => {
  const pool = [...arr], out = [];
  while (pool.length && out.length < n) { const x = weightedPick(pool, w); out.push(x); pool.splice(pool.indexOf(x), 1); }
  return out;
};
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const fmtTime = (sec) => { const s = Math.max(0, Math.floor(sec)); return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

const load = (k, def) => { try { return JSON.parse(localStorage.getItem(KEY + k)) ?? def; } catch { return def; } };
const save = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch { /* 保存できなくても動作は続ける */ } };
const emptyProgress = () => ({ answers: {}, log: [], mocks: [], mock: null, lastMock: null, day: null });

// ---------- 状態 ----------
const settings = load('settings', { cert: null, examDates: {} });
const A = { cert: null, exam: null, qs: [], byId: {}, scenarios: {}, p: emptyProgress() };
let sess = null;      // 練習・今日の問題・復習のセッション(メモリ上のみ)
let timerId = null;

const saveSettings = () => save('settings', settings);
const saveProgress = () => save('progress:' + A.cert, A.p);
const examDate = (cert = A.cert, exam = A.exam) => settings.examDates[cert] || exam.examDate;
const domainOf = (id) => A.exam.domains.find((d) => d.id === id);

async function getJson(path, fallback) {
  try { const r = await fetch(path, { cache: 'no-cache' }); if (!r.ok) throw new Error(r.status); return await r.json(); }
  catch (e) { if (fallback !== undefined) return fallback; throw e; }
}

async function loadCert(cert) {
  const exam = await getJson(`exams/${cert}.json`);
  const files = await Promise.all(exam.domains.map((d) => getJson(`questions/${cert}/${d.id}.json`, [])));
  const scen = exam.scenarioBased ? await getJson(`questions/${cert}/scenarios.json`, []) : [];
  A.cert = cert; A.exam = exam;
  // 別資格の問題が紛れ込んでも出題しない
  A.qs = files.flat().filter((q) => q.cert === cert && domainOf(q.domain));
  A.byId = Object.fromEntries(A.qs.map((q) => [q.id, q]));
  A.scenarios = Object.fromEntries(scen.map((s) => [s.id, s]));
  A.p = { ...emptyProgress(), ...load('progress:' + cert, {}) };
  settings.cert = cert; saveSettings();
  document.documentElement.dataset.cert = cert;
  sess = null;
}

// ---------- 学習記録 ----------
function record(q, ok, mode) {
  const t = today();
  const a = A.p.answers[q.id] ?? { n: 0, correct: 0, streak: 0 };
  a.n++;
  if (ok) { a.correct++; a.streak++; } else a.streak = 0;
  a.last = t;
  a.due = addDays(t, ok ? INTERVALS[Math.min(a.streak, INTERVALS.length - 1)] : 1);
  A.p.answers[q.id] = a;
  A.p.log.push({ d: t, q: q.id, ok: ok ? 1 : 0, m: mode });
}
function domainStat(id) {
  let n = 0, ok = 0, seen = 0, total = 0;
  for (const q of A.qs) if (q.domain === id) { total++; const a = A.p.answers[q.id]; if (a) { seen++; n += a.n; ok += a.correct; } }
  return { n, ok, seen, total, acc: n ? ok / n : null };
}
const domainWeight = (id) => domainOf(id).weight * (1.3 - (domainStat(id).acc ?? 0.5));
function recentAccuracy() {
  const r = A.p.log.slice(-30);
  return r.length >= 10 ? r.reduce((s, x) => s + x.ok, 0) / r.length : null;
}

// ---------- 1日の出題量 ----------
// 試験日までに全問を一巡できる量 + 期限が来た復習。直近の正答率で増減する。
function computePlan() {
  const t = today();
  const daysToExam = diffDays(t, examDate());
  const studyDays = Math.max(1, daysToExam - RESERVE_DAYS);
  const unseen = A.qs.filter((q) => !A.p.answers[q.id]);
  const due = A.qs.filter((q) => A.p.answers[q.id] && A.p.answers[q.id].due <= t);
  const acc = recentAccuracy();

  let newCount = Math.ceil(unseen.length / studyDays);
  let adjust = '';
  if (acc !== null && acc >= 0.85) { newCount = Math.ceil(newCount * 1.25); adjust = '正答率が高いので新規を増やしています'; }
  newCount = Math.min(unseen.length, Math.max(newCount, MIN_DAILY - due.length));
  const newIds = weightedSample(unseen, newCount, (q) => domainWeight(q.domain)).map((q) => q.id);

  let ids = [...due.map((q) => q.id), ...newIds];
  let extra = 0;
  const seenRest = A.qs.filter((q) => A.p.answers[q.id] && !ids.includes(q.id));
  const weakness = (q) => { const a = A.p.answers[q.id]; return 0.1 + (1 - a.correct / a.n) + (1 - (domainStat(q.domain).acc ?? 0.5)); };
  if (acc !== null && acc < 0.6) {
    const add = weightedSample(seenRest, 5, weakness).map((q) => q.id);
    extra = add.length; ids.push(...add);
    if (extra) adjust = '正答率が低いので苦手問題を追加しています';
  }
  if (ids.length < MIN_DAILY) {
    const add = weightedSample(seenRest.filter((q) => !ids.includes(q.id)), MIN_DAILY - ids.length, weakness).map((q) => q.id);
    extra += add.length; ids.push(...add);
  }
  return { date: t, ids, newCount: newIds.length, dueCount: due.length, extra, acc, adjust, daysToExam };
}
function ensureDay() {
  const d = A.p.day;
  if (d && d.date === today() && d.ids.every((id) => A.byId[id])) return d;
  A.p.day = computePlan(); saveProgress();
  return A.p.day;
}
const dayRemaining = () => ensureDay().ids.filter((id) => A.p.answers[id]?.last !== today());

// ---------- 画面の土台 ----------
const app = () => document.getElementById('app');
function show(...nodes) {
  clearInterval(timerId); timerId = null;
  app().replaceChildren(...nodes.flat(Infinity).filter(Boolean));
  window.scrollTo(0, 0);
}
function bar(right) {
  const b = document.getElementById('bar');
  b.replaceChildren(
    el('button', { class: 'home', onclick: () => go('home') }, 'Claude 資格対策'),
    right || (A.exam && el('span', { class: 'badge' }, A.exam.code))
  );
}
const routes = {};
function go(name, arg) { bar(); routes[name](arg); }

// ---------- ホーム ----------
routes.home = () => {
  const d = ensureDay();
  const remaining = dayRemaining().length;
  const done = d.ids.length - remaining;
  const reviewCount = reviewQueue().length;
  const breakdown = [d.newCount && `新規 ${d.newCount}`, d.dueCount && `復習 ${d.dueCount}`, d.extra && `補強 ${d.extra}`].filter(Boolean).join(' / ');
  const domainSel = el('select', { 'aria-label': 'ドメイン' },
    el('option', { value: '' }, 'すべてのドメイン'),
    A.exam.domains.map((x) => el('option', { value: x.id }, `${x.ja}(${domainStat(x.id).total}問)`)));

  show(
    el('div', { class: 'seg', role: 'tablist' }, CERTS.map((c) =>
      el('button', { class: c === A.cert ? 'on' : '', onclick: async () => { if (c !== A.cert) { await loadCert(c); go('home'); } } },
        c === 'developer' ? 'Developer' : 'Architect', el('small', {}, 'Foundations')))),
    el('div', { class: 'card' },
      el('div', { class: 'row' },
        el('div', { class: 'grow' }, el('div', { class: 'muted' }, `${A.exam.code} 試験日 ${examDate()}`),
          el('div', { class: 'big' }, d.daysToExam >= 0 ? `あと ${d.daysToExam} 日` : '試験日を過ぎています')),
        el('div', {}, el('div', { class: 'muted' }, '今日の目標'), el('div', { class: 'big' }, `${done} / ${d.ids.length}`))),
      el('div', { class: 'meter' }, el('i', { style: `width:${pct(done, d.ids.length)}%` })),
      el('div', { class: 'muted' }, [breakdown, d.acc !== null && `直近の正答率 ${Math.round(d.acc * 100)}%`, d.adjust].filter(Boolean).join(' ・ '))),
    !A.qs.length && el('div', { class: 'notice' }, 'この資格の問題がまだ登録されていません。'),
    el('button', { class: 'btn primary', disabled: !remaining, onclick: () => startSession('today') },
      remaining ? `今日の問題を解く(残り ${remaining} 問)` : '今日の分は完了しました'),
    el('div', { class: 'card' },
      el('div', { class: 'row' }, el('strong', { class: 'grow' }, 'ひたすら解く'), domainSel),
      el('p', { class: 'muted' }, '回答するとすぐに解説が出ます。やめるまで続きます。'),
      el('button', { class: 'btn primary', disabled: !A.qs.length, onclick: () => startSession('practice', domainSel.value) }, '開始')),
    el('button', { class: 'btn', disabled: !reviewCount, onclick: () => startSession('review') }, '復習', el('small', {}, `間違えた問題と期限が来た問題 ${reviewCount} 問`)),
    el('button', { class: 'btn', disabled: !A.qs.length, onclick: () => go('mock') }, '模擬試験',
      el('small', {}, A.p.mock ? '受験中の模試があります' : `本番形式 ${A.exam.questions}問 / ${A.exam.minutes}分`)),
    el('button', { class: 'btn', onclick: () => go('stats') }, '成績', el('small', {}, `回答 ${A.p.log.length} 回 / ${Object.keys(A.p.answers).length} / ${A.qs.length} 問に着手`)),
    el('button', { class: 'btn', onclick: () => go('settings') }, '設定', el('small', {}, '試験日、記録の書き出し・読み込み'))
  );
};

// ---------- 問題カード(練習と模試で共用) ----------
function questionCard(q, st, onChange) {
  const sc = q.scenarioId && A.scenarios[q.scenarioId];
  const multi = q.type === 'multi';
  return el('div', {},
    sc && el('details', { class: 'scenario', open: st.openScenario !== false }, el('summary', {}, `シナリオ: ${sc.title}`), el('p', {}, sc.text)),
    el('div', { class: 'qmeta' }, el('span', {}, domainOf(q.domain).ja), multi && el('span', { class: 'badge' }, `${q.answer.length}つ選択`)),
    el('div', { class: 'stem' }, q.stem),
    st.order.map((cid, i) => {
      const c = q.choices.find((x) => x.id === cid);
      const sel = st.selected.includes(cid), right = q.answer.includes(cid);
      const cls = ['choice', !st.revealed && sel && 'sel', st.revealed && right && 'correct', st.revealed && sel && !right && 'wrong'].filter(Boolean).join(' ');
      return el('button', {
        class: cls, disabled: st.revealed, 'aria-pressed': String(sel),
        onclick: () => {
          if (multi) st.selected = sel ? st.selected.filter((x) => x !== cid) : [...st.selected, cid];
          else st.selected = [cid];
          onChange();
        },
      }, el('span', { class: 'mark' }, 'ABCDEFG'[i]),
        el('span', { class: 'body' }, c.text,
          st.revealed && el('span', { class: 'why' }, `${right ? '正解。' : sel ? 'あなたの回答。' : ''}${c.why}`)));
    }));
}
function explanation(q) {
  return el('div', { class: 'card' },
    el('strong', {}, '解説'), el('p', { class: 'explain' }, q.explanation),
    el('div', { class: 'refs' }, q.refs.map((r) => el('div', {}, el('a', { href: r, target: '_blank', rel: 'noopener' }, r)))));
}

// ---------- 練習・今日の問題・復習 ----------
function reviewQueue() {
  const t = today();
  return A.qs.filter((q) => { const a = A.p.answers[q.id]; return a && (a.due <= t || a.streak === 0); }).map((q) => q.id);
}
function pickPractice(domain, recent) {
  const all = A.qs.filter((q) => !domain || q.domain === domain);
  let pool = all.filter((q) => !recent.includes(q.id));
  if (!pool.length) pool = all;
  const t = today();
  const due = pool.filter((q) => A.p.answers[q.id]?.due <= t);
  if (due.length) return rand(due);
  const unseen = pool.filter((q) => !A.p.answers[q.id]);
  if (unseen.length) return weightedPick(unseen, (q) => domainWeight(q.domain));
  return weightedPick(pool, (q) => { const a = A.p.answers[q.id]; return 0.2 + (1 - a.correct / a.n) * 2 + (1 - (domainStat(q.domain).acc ?? 0.5)); });
}
function startSession(mode, domain) {
  const queue = mode === 'today' ? shuffle(dayRemaining()) : mode === 'review' ? shuffle(reviewQueue()) : null;
  // シナリオ問題は同じシナリオが続くように並べる
  if (queue && A.exam.scenarioBased) queue.sort((a, b) => String(A.byId[a].scenarioId).localeCompare(String(A.byId[b].scenarioId)));
  sess = { mode, domain: domain || '', queue, recent: [], n: 0, ok: 0, cur: null };
  nextQuestion();
}
function nextQuestion() {
  let q;
  if (sess.queue) { const id = sess.queue.shift(); q = id && A.byId[id]; }
  else {
    q = pickPractice(sess.domain, sess.recent);
    const size = A.qs.filter((x) => !sess.domain || x.domain === sess.domain).length;
    sess.recent = [...sess.recent, q.id].slice(-Math.max(0, Math.min(8, size - 1)));
  }
  if (!q) return go('done');
  sess.cur = { q, order: shuffle(q.choices.map((c) => c.id)), selected: [], revealed: false };
  go('quiz');
}
const MODE_NAME = { today: '今日の問題', practice: 'ひたすら解く', review: '復習' };
routes.quiz = () => {
  if (!sess?.cur) return go('home');
  const st = sess.cur, q = st.q;
  const rerender = () => go('quiz');
  const y = window.scrollY;
  const status = sess.queue ? `${MODE_NAME[sess.mode]} 残り ${sess.queue.length + (st.revealed ? 0 : 1)} 問` : `${MODE_NAME[sess.mode]} ${sess.n} 問回答 / 正解 ${sess.ok}`;
  const ok = st.revealed && sameSet(st.selected, q.answer);
  show(
    el('div', { class: 'muted' }, status),
    questionCard(q, st, rerender),
    st.revealed && el('div', { class: `verdict ${ok ? 'ok' : 'ng'}` }, ok ? '正解' : '不正解'),
    st.revealed && explanation(q),
    el('div', { class: 'foot' }, el('div', { class: 'inner' },
      el('button', { class: 'btn', style: 'flex:0 0 96px', onclick: () => go(sess.n ? 'done' : 'home') }, 'やめる'),
      st.revealed
        ? el('button', { class: 'btn primary', onclick: nextQuestion }, '次の問題')
        : el('button', {
            class: 'btn primary', disabled: q.type === 'multi' ? st.selected.length !== q.answer.length : !st.selected.length,
            onclick: () => {
              st.revealed = true;
              const good = sameSet(st.selected, q.answer);
              sess.n++; if (good) sess.ok++;
              record(q, good, sess.mode); saveProgress();
              rerender();
            },
          }, '回答する')))
  );
  if (st.selected.length && !st.justRevealed) window.scrollTo(0, y); // 選択し直しても表示位置を保つ
  if (st.revealed && !st.justRevealed) { st.justRevealed = true; document.querySelector('.verdict')?.scrollIntoView({ block: 'center' }); }
};
routes.done = () => {
  const s = sess; sess = null;
  if (!s) return go('home');
  const left = dayRemaining().length;
  show(
    el('h1', {}, `${MODE_NAME[s.mode]} 終了`),
    el('div', { class: 'card' }, el('div', { class: 'big' }, `${s.ok} / ${s.n} 問正解`), el('div', { class: 'muted' }, s.n ? `正答率 ${pct(s.ok, s.n)}%` : '')),
    el('p', { class: 'muted' }, left ? `今日の目標まであと ${left} 問です。` : '今日の目標は達成済みです。'),
    el('button', { class: 'btn primary', onclick: () => go('home') }, 'ホームへ'));
};

// ---------- 模擬試験 ----------
function buildMock() {
  let ids = [];
  if (A.exam.scenarioBased) {
    const chosen = shuffle(Object.keys(A.scenarios).filter((s) => A.qs.some((q) => q.scenarioId === s))).slice(0, A.exam.scenariosPerExam);
    for (const s of chosen) ids.push(...shuffle(A.qs.filter((q) => q.scenarioId === s)).map((q) => q.id));
    ids = ids.slice(0, A.exam.questions);
  } else {
    for (const d of A.exam.domains) ids.push(...shuffle(A.qs.filter((q) => q.domain === d.id)).slice(0, d.mockCount).map((q) => q.id));
    ids = shuffle(ids);
  }
  const order = Object.fromEntries(ids.map((id) => [id, shuffle(A.byId[id].choices.map((c) => c.id))]));
  return { ids, order, answers: {}, flags: {}, idx: 0, startedAt: Date.now(), durationSec: Math.round(A.exam.minutes * 60 * ids.length / A.exam.questions) };
}
routes.mock = () => {
  if (A.p.mock && !A.p.mock.ids.every((id) => A.byId[id])) { A.p.mock = null; saveProgress(); }
  const m = A.p.mock;
  const preview = m || buildMock();
  const short = preview.ids.length < A.exam.questions;
  show(
    el('h1', {}, `模擬試験 ${A.exam.code}`),
    el('div', { class: 'card' },
      el('p', {}, `本番: ${A.exam.questions}問 / ${A.exam.minutes}分 / 合格 720点(スケールドスコア)`),
      el('p', {}, `この模試: ${preview.ids.length}問 / ${Math.round(preview.durationSec / 60)}分`),
      A.exam.scenarioBased && el('p', { class: 'muted' }, `シナリオ ${A.exam.scenariosPerExam} 件をまとめて出題します。`),
      el('p', { class: 'muted' }, '終了するまで正誤と解説は表示されません。開始後は画面を閉じても時計が進みます。')),
    short && el('div', { class: 'notice' }, `問題バンクが本番の問題数に足りないため、${preview.ids.length}問に短縮し、制限時間も同じ比率で短くしています。`),
    m ? [el('button', { class: 'btn primary', onclick: () => go('mockrun') }, '受験中の模試を再開'),
         el('button', { class: 'btn', onclick: () => { A.p.mock = null; saveProgress(); go('mock'); } }, '受験中の模試を破棄')]
      : el('button', { class: 'btn primary', onclick: () => { A.p.mock = buildMock(); saveProgress(); go('mockrun'); } }, '開始'),
    A.p.lastMock && el('button', { class: 'btn', onclick: () => go('result') }, '前回の結果を見る'));
};
routes.mockrun = (view) => {
  const m = A.p.mock;
  if (!m) return go('mock');
  const left = () => m.durationSec - (Date.now() - m.startedAt) / 1000;
  if (left() <= 0) return finishMock();
  const timer = el('span', { class: 'timer' });
  const tick = () => { const l = left(); timer.textContent = fmtTime(l); timer.className = 'timer' + (l < 300 ? ' low' : ''); if (l <= 0) finishMock(); };
  bar(timer);
  const answered = m.ids.filter((id) => m.answers[id]?.length).length;

  if (view === 'list') {
    show(
      el('h1', {}, '問題一覧'),
      el('p', { class: 'muted' }, `回答済み ${answered} / ${m.ids.length}、見直し ${Object.values(m.flags).filter(Boolean).length} 件(黄色の枠)`),
      el('div', { class: 'grid' }, m.ids.map((id, i) => el('button', {
        class: [m.answers[id]?.length && 'done', m.flags[id] && 'flag', i === m.idx && 'cur'].filter(Boolean).join(' '),
        onclick: () => { m.idx = i; saveProgress(); go('mockrun'); },
      }, i + 1))),
      answered < m.ids.length && el('div', { class: 'notice' }, `未回答が ${m.ids.length - answered} 問あります。未回答は不正解になります。`),
      el('button', { class: 'btn', onclick: () => go('mockrun') }, '問題に戻る'),
      el('button', { class: 'btn primary', onclick: finishMock }, '試験を終了して採点する'));
  } else {
    const id = m.ids[m.idx], q = A.byId[id];
    const st = { order: m.order[id], selected: m.answers[id] || [], revealed: false, openScenario: m.idx === 0 || A.byId[m.ids[m.idx - 1]].scenarioId !== q.scenarioId };
    const y = window.scrollY;
    const move = (d) => { m.idx = Math.min(m.ids.length - 1, Math.max(0, m.idx + d)); saveProgress(); go('mockrun'); };
    show(
      el('div', { class: 'row' }, el('span', { class: 'muted grow' }, `問 ${m.idx + 1} / ${m.ids.length}`),
        el('button', { class: 'btn small', 'aria-pressed': String(!!m.flags[id]), onclick: () => { m.flags[id] = !m.flags[id]; saveProgress(); go('mockrun', 'keep'); } }, m.flags[id] ? '見直し中 ✓' : '見直しに追加')),
      questionCard(q, st, () => { m.answers[id] = st.selected; saveProgress(); go('mockrun', 'keep'); }),
      el('div', { class: 'foot' }, el('div', { class: 'inner' },
        el('button', { class: 'btn', disabled: m.idx === 0, onclick: () => move(-1) }, '前へ'),
        el('button', { class: 'btn', onclick: () => go('mockrun', 'list') }, '一覧・終了'),
        el('button', { class: 'btn primary', disabled: m.idx === m.ids.length - 1, onclick: () => move(1) }, '次へ'))));
    if (view === 'keep') window.scrollTo(0, y);
  }
  tick(); timerId = setInterval(tick, 1000);
};
function finishMock() {
  const m = A.p.mock;
  if (!m) return go('mock');
  const byDomain = {};
  const detail = m.ids.map((id) => {
    const q = A.byId[id], sel = m.answers[id] || [], ok = sameSet(sel, q.answer);
    const b = (byDomain[q.domain] ??= { n: 0, ok: 0 }); b.n++; if (ok) b.ok++;
    record(q, ok, 'mock');
    return { id, sel, ok, order: m.order[id] };
  });
  const res = { date: today(), total: m.ids.length, correct: detail.filter((x) => x.ok).length, sec: Math.min(m.durationSec, Math.round((Date.now() - m.startedAt) / 1000)), byDomain };
  A.p.mocks.push(res); A.p.lastMock = { ...res, detail }; A.p.mock = null;
  saveProgress(); go('result');
}
routes.result = (openIdx) => {
  const r = A.p.lastMock;
  if (!r) return go('mock');
  const score = pct(r.correct, r.total), pass = score >= A.exam.passGuidePercent;
  const detail = r.detail.filter((x) => A.byId[x.id]);
  if (typeof openIdx === 'number') {
    const x = detail[openIdx], q = A.byId[x.id];
    return show(
      el('div', { class: 'muted' }, `模試の見直し 問 ${openIdx + 1} / ${detail.length}`),
      questionCard(q, { order: x.order, selected: x.sel, revealed: true }, () => {}),
      el('div', { class: `verdict ${x.ok ? 'ok' : 'ng'}` }, x.ok ? '正解' : x.sel.length ? '不正解' : '未回答'),
      explanation(q),
      el('div', { class: 'foot' }, el('div', { class: 'inner' },
        el('button', { class: 'btn', disabled: openIdx === 0, onclick: () => go('result', openIdx - 1) }, '前へ'),
        el('button', { class: 'btn', onclick: () => go('result') }, '結果へ'),
        el('button', { class: 'btn primary', disabled: openIdx === detail.length - 1, onclick: () => go('result', openIdx + 1) }, '次へ'))));
  }
  show(
    el('h1', {}, `模擬試験の結果 ${A.exam.code}`),
    el('div', { class: 'card' },
      el('div', { class: 'big' }, `${score}%(${r.correct} / ${r.total})`),
      el('div', { class: `meter ${pass ? 'ok' : 'ng'}` }, el('i', { style: `width:${score}%` })),
      el('p', {}, pass ? `目安の ${A.exam.passGuidePercent}% 以上です。` : `目安の ${A.exam.passGuidePercent}% に届いていません。`),
      el('p', { class: 'muted' }, `所要時間 ${fmtTime(r.sec)}。本番のスケールドスコア(720点で合格)への換算式は公開されていないため、正答率で表示しています。`)),
    domainTable(A.exam.domains.filter((d) => r.byDomain[d.id]).map((d) => ({ d, ...r.byDomain[d.id] }))),
    el('h2', {}, '問題ごとの見直し'),
    el('div', { class: 'grid' }, detail.map((x, i) => el('button', { class: x.ok ? 'ok' : 'ng', onclick: () => go('result', i) }, i + 1))),
    el('button', { class: 'btn primary', onclick: () => go('home') }, 'ホームへ'));
};

// ---------- 成績 ----------
function domainTable(rows) {
  return el('div', { class: 'card' }, el('table', {},
    el('tr', {}, el('th', {}, 'ドメイン'), el('th', { class: 'num' }, '正解'), el('th', { class: 'num' }, '正答率')),
    rows.map((r) => el('tr', {},
      el('td', {}, r.d.ja, el('div', { class: 'muted' }, `配点 ${r.d.weight}%${r.note ? ' ・ ' + r.note : ''}`),
        el('div', { class: `meter ${r.n && r.ok / r.n < 0.6 ? 'ng' : ''}` }, el('i', { style: `width:${pct(r.ok, r.n)}%` }))),
      el('td', { class: 'num' }, `${r.ok} / ${r.n}`), el('td', { class: 'num' }, r.n ? `${pct(r.ok, r.n)}%` : '—')))));
}
routes.stats = () => {
  const days = {};
  for (const x of A.p.log) { const d = (days[x.d] ??= { n: 0, ok: 0 }); d.n++; d.ok += x.ok; }
  const dates = Object.keys(days).sort().slice(-14).reverse();
  const tot = A.p.log.reduce((s, x) => s + x.ok, 0);
  show(
    el('h1', {}, `成績 ${A.exam.code}`),
    el('div', { class: 'card' }, el('div', { class: 'big' }, A.p.log.length ? `${pct(tot, A.p.log.length)}%` : '—'),
      el('div', { class: 'muted' }, `通算 ${tot} / ${A.p.log.length} 回正解 ・ ${Object.keys(A.p.answers).length} / ${A.qs.length} 問に着手`)),
    el('h2', {}, 'ドメイン別'),
    domainTable(A.exam.domains.map((d) => { const s = domainStat(d.id); return { d, n: s.n, ok: s.ok, note: `${s.seen} / ${s.total} 問に着手` }; })),
    el('h2', {}, '日別(直近14日)'),
    el('div', { class: 'card' }, dates.length ? el('table', {},
      el('tr', {}, el('th', {}, '日付'), el('th', { class: 'num' }, '回答'), el('th', { class: 'num' }, '正答率')),
      dates.map((d) => el('tr', {}, el('td', {}, d), el('td', { class: 'num' }, days[d].n), el('td', { class: 'num' }, `${pct(days[d].ok, days[d].n)}%`)))) : el('p', { class: 'muted' }, 'まだ記録がありません。')),
    el('h2', {}, '模擬試験の履歴'),
    el('div', { class: 'card' }, A.p.mocks.length ? el('table', {},
      el('tr', {}, el('th', {}, '日付'), el('th', { class: 'num' }, '正解'), el('th', { class: 'num' }, '正答率')),
      [...A.p.mocks].reverse().map((m) => el('tr', {}, el('td', {}, m.date), el('td', { class: 'num' }, `${m.correct} / ${m.total}`), el('td', { class: 'num' }, `${pct(m.correct, m.total)}%`)))) : el('p', { class: 'muted' }, 'まだ受験していません。')),
    el('button', { class: 'btn primary', onclick: () => go('home') }, 'ホームへ'));
};

// ---------- 設定 ----------
routes.settings = (msg) => {
  const box = el('textarea', { 'aria-label': '学習記録の JSON', placeholder: '書き出した JSON をここに貼り付けて「読み込む」を押す' });
  let armed = false;
  const dateRow = (cert, label) => {
    const input = el('input', { type: 'date', value: settings.examDates[cert] || (cert === A.cert ? A.exam.examDate : '') });
    input.addEventListener('change', async () => {
      if (!input.value) return;
      settings.examDates[cert] = input.value; saveSettings();
      const p = cert === A.cert ? A.p : load('progress:' + cert, null);
      if (p) { p.day = null; if (cert === A.cert) saveProgress(); else save('progress:' + cert, p); } // 出題量を計算し直す
      go('settings', '試験日を保存しました。今日の出題量を計算し直します。');
    });
    return el('div', { class: 'row' }, el('span', { class: 'grow' }, label), input);
  };
  show(
    el('h1', {}, '設定'),
    msg && el('div', { class: 'notice' }, msg),
    el('div', { class: 'card' }, el('strong', {}, '試験日'),
      el('p', { class: 'muted' }, '試験日までに全問を一巡できるよう、毎日の出題量を決めます。'),
      dateRow('developer', 'Developer (CCDV-F)'), dateRow('architect', 'Architect (CCAR-F)')),
    el('div', { class: 'card' }, el('strong', {}, '学習記録の書き出し・読み込み'),
      el('p', { class: 'muted' }, '記録は端末ごとに保存されます。別の端末に移すときは、書き出した文字列をコピーして移行先で読み込みます。両資格の記録が対象です。'),
      box,
      el('button', { class: 'btn small', onclick: () => {
        box.value = JSON.stringify({ app: 'ccq', v: 1, settings, progress: Object.fromEntries(CERTS.map((c) => [c, c === A.cert ? A.p : load('progress:' + c, emptyProgress())])) });
        box.select(); navigator.clipboard?.writeText(box.value).catch(() => {});
      } }, '書き出す(コピー)'),
      el('button', { class: 'btn small', onclick: async () => {
        try {
          const data = JSON.parse(box.value);
          if (data.app !== 'ccq' || !data.progress) throw new Error('形式が違います');
          for (const c of CERTS) if (data.progress[c]) save('progress:' + c, { ...emptyProgress(), ...data.progress[c] });
          Object.assign(settings.examDates, data.settings?.examDates); saveSettings();
          await loadCert(A.cert); go('settings', '読み込みました。');
        } catch (e) { go('settings', `読み込めませんでした: ${e.message}`); }
      } }, '読み込む')),
    el('div', { class: 'card' }, el('strong', {}, `${A.exam.code} の記録を消去`),
      el('p', { class: 'muted' }, '表示中の資格の学習記録と模試履歴を削除します。元に戻せません。'),
      el('button', { class: 'btn small', onclick: (e) => {
        if (!armed) { armed = true; e.target.textContent = 'もう一度押すと消去します'; return; }
        A.p = emptyProgress(); saveProgress(); go('settings', '消去しました。');
      } }, '消去する')),
    el('button', { class: 'btn primary', onclick: () => go('home') }, 'ホームへ'));
};

// ---------- 起動 ----------
(async () => {
  try {
    await loadCert(CERTS.includes(settings.cert) ? settings.cert : 'developer');
    go('home');
  } catch (e) {
    show(el('div', { class: 'notice' }, `問題データを読み込めませんでした(${e.message})。通信状態を確認して再読み込みしてください。`));
  }
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
