// Page bootstrap: language, sections, figures, worked table, lab, film player, challenges, quiz, slides.
import {prepareFixtures, makeState, analyse, fmt} from './domain.js';
import {Board, netColor, escapeText as E} from './board.js';
import {validateClock} from './timeline.js';
import {TEXT, REPO, TEACHER} from './content.js';
import {createLab} from './lab.js';
import {createPlayer} from './player.js';
import {CHALLENGES, grade} from './grade.js';

const params = new URLSearchParams(location.search);
const lang = params.get('lang') === 'en' ? 'en' : 'zh';
const T = TEXT[lang];
document.documentElement.lang = T.lang;
document.title = `${T.title} · Placement Lab 02`;

async function data(path) { const r = await fetch(path); if (!r.ok) throw new Error(`${path} (HTTP ${r.status})`); return r.json(); }
const store = {
  get() { try { return JSON.parse(localStorage.getItem('hpwl-progress') || '{}'); } catch { return {}; } },
  set(v) { try { localStorage.setItem('hpwl-progress', JSON.stringify(v)); } catch { /* storage unavailable: progress is per page view */ } },
};
const links = html => html.replace('href="REPO"', `href="${REPO}"`).replace('href="TEACHER"', `href="${TEACHER}"`);

function figure(fixtures, kind) {
  const F = fixtures;
  const v = (fx, pl, extra) => ({...makeState(F[fx], pl), showBoxes: 'selected', highlights: {}, ...extra});
  const views = {
    coords: v('two_pin_h', 'start', {selectedNet: null, showBoxes: 'none', highlights: {coords: true}}),
    multi: v('multi', 'start', {selectedNet: null, showBoxes: 'all', highlights: {flylines: true}}),
    box: v('multi', 'start', {selectedNet: 'N1', visibleNets: ['N1'], highlights: {dims: 1, extremes: 1}}),
    manhattan: v('two_pin_manhattan', 'start', {selectedNet: 'PQ', highlights: {dims: 1, euclid: 1, lpath: 1}}),
    interior: v('multi', 'start', {selectedNet: 'N1', visibleNets: ['N1'], highlights: {neutral: {net: 'N1', pin: 'S'}}}),
    fixed: v('teacher', 'starter', {mode: 'fixed', showMode: true, selectedNet: 'ABCD', highlights: {}}),
  };
  return Board(views[kind], {width: 560, height: 480, lang, compact: true, id: `fig-${kind}`});
}

function workedTable(fixtures) {
  const s = makeState(fixtures.teacher, 'starter');
  const a = analyse(s);
  const th = T.th;
  return `<div class="table-wrap"><table class="contrib"><thead><tr><th>${th.net}</th><th>${th.pins}</th><th>x</th><th>y</th><th>${th.w}</th><th>${th.h}</th><th>${th.hpwl}</th><th>${th.weight}</th><th>${th.wh}</th></tr></thead><tbody>
  ${a.nets.map((n, i) => `<tr><td><span class="nettag" style="--c:${netColor(n.id, i)}">${n.id}</span></td><td>${n.pins.map(p => `${p}(${fmt(s.positions[p].x)},${fmt(s.positions[p].y)})`).join(' ')}</td><td>[${fmt(n.minX)}, ${fmt(n.maxX)}]</td><td>[${fmt(n.minY)}, ${fmt(n.maxY)}]</td><td>${fmt(n.width)}</td><td>${fmt(n.height)}</td><td><b>${fmt(n.hpwl)}</b></td><td>${n.weight}</td><td>${fmt(n.weight * n.hpwl)}</td></tr>`).join('')}
  </tbody><tfoot><tr><td colspan="6">${lang === 'zh' ? '总和' : 'total'}</td><td><b>${fmt(a.total)}</b></td><td></td><td><b>${fmt(a.weightedTotal)}</b></td></tr></tfoot></table></div>`;
}

function challengeCard(ch) {
  const c = T.ch[ch.id], ui = T.chUi;
  const field = k => {
    if (c.options && (k === 'cause')) return `<fieldset><legend>${E(c.labels[k])}</legend>${Object.entries(c.options).map(([v, l]) => `<label><input type="radio" name="${ch.id}-${k}" value="${v}"> ${E(l)}</label>`).join('')}</fieldset>`;
    if (c.options && k === 'reasons') return `<fieldset><legend>${E(c.labels[k])}</legend>${Object.entries(c.options).map(([v, l]) => `<label><input type="checkbox" name="${ch.id}-${k}" value="${v}"> ${E(l)}</label>`).join('')}</fieldset>`;
    return `<label class="numfield">${E(c.labels[k])} <input type="text" inputmode="decimal" name="${ch.id}-${k}" autocomplete="off"></label>`;
  };
  return `<article class="challenge" id="${ch.id}" data-id="${ch.id}">
    <header><h3>${E(c.title)}</h3><span class="badge cat">${E(T.cat[ch.category])}</span><span class="badge diff d${ch.difficulty}">${E(T.diff[ch.difficulty])}</span><span class="badge progress" data-k="progress"></span></header>
    <p class="goal"><b>${ui.goal}:</b> ${E(c.goal)}</p><p>${E(c.prompt)}</p>
    <form>${(ch.fields ?? []).map(field).join('')}
      <div class="ch-actions">${ch.kind === 'state' ? `<button type="button" data-a="start">${ui.start}</button>` : ''}<button type="submit" class="primary">${ui.check}</button><button type="button" data-a="hint">${ui.hint1}</button><button type="button" data-a="answer">${ui.showAnswer}</button><button type="reset">${ui.retry}</button></div>
    </form>
    <div class="ch-hints" data-k="hints"></div><div class="ch-result" data-k="result" aria-live="polite"></div></article>`;
}

function wireChallenges(root, fixtures, lab) {
  const progress = store.get();
  const paint = () => root.querySelectorAll('.challenge').forEach(el => {
    const p = progress[el.dataset.id];
    const badge = el.querySelector('[data-k="progress"]');
    badge.textContent = p?.done ? (p.studied ? T.chUi.studied : T.chUi.independent) : T.chUi.notYet;
    badge.className = `badge progress ${p?.done ? (p.studied ? 'studied' : 'indep') : ''}`;
  });
  root.querySelectorAll('.challenge').forEach(el => {
    const ch = CHALLENGES.find(c => c.id === el.dataset.id), c = T.ch[ch.id];
    let hintLevel = 0;
    const form = el.querySelector('form');
    const answers = () => {
      const out = {};
      for (const k of ch.fields ?? []) {
        const inputs = [...form.querySelectorAll(`[name="${ch.id}-${k}"]`)];
        if (inputs[0]?.type === 'checkbox') out[k] = inputs.filter(i => i.checked).map(i => i.value);
        else if (inputs[0]?.type === 'radio') out[k] = inputs.find(i => i.checked)?.value ?? null;
        else out[k] = inputs[0]?.value ?? '';
      }
      return out;
    };
    form.addEventListener('submit', e => {
      e.preventDefault();
      const needsLab = ch.kind === 'state';
      const state = needsLab ? (lab.activeChallenge() === ch.id ? lab.getState() : null) : null;
      const g = grade(ch.id, {state, answers: answers(), fixtures});
      const names = c.check ?? Object.fromEntries((ch.fields ?? []).map(k => [k, c.labels[k] ?? k]));
      const res = el.querySelector('[data-k="result"]');
      if (g.pass) {
        progress[ch.id] = {...(progress[ch.id] ?? {}), done: true, studied: Boolean(progress[ch.id]?.sawAnswer)};
        store.set(progress);
        res.className = 'ch-result ok';
        res.innerHTML = `<b>${T.chUi.pass}</b> ${E(c.explain)}`;
      } else {
        res.className = 'ch-result bad';
        res.innerHTML = `<b>${T.chUi.fail}</b> ${g.checks.map(x => `<span class="${x.ok ? 'okc' : 'badc'}">${x.ok ? '✓' : '✗'} ${E(names[x.key] ?? x.key)}${x.got !== undefined && !x.ok ? ` (${fmt(x.got, 4)})` : ''}</span>`).join(' ')}`;
      }
      paint();
    });
    form.addEventListener('reset', () => { el.querySelector('[data-k="result"]').textContent = ''; hintLevel = 0; el.querySelector('[data-k="hints"]').innerHTML = ''; el.querySelector('[data-a="hint"]').textContent = T.chUi.hint1; if (ch.kind === 'state') lab.setup(ch); });
    el.addEventListener('click', e => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'start') { lab.setup(ch); document.getElementById('lab').scrollIntoView(); }
      if (a === 'hint' && hintLevel < 2) {
        el.querySelector('[data-k="hints"]').innerHTML += `<p class="hint">${hintLevel === 0 ? T.chUi.hint1 : T.chUi.hint2}: ${E(c.hints[hintLevel])}</p>`;
        hintLevel++;
        e.target.textContent = hintLevel === 1 ? T.chUi.hint2 : T.chUi.hint2;
        e.target.disabled = hintLevel >= 2;
      }
      if (a === 'answer') {
        progress[ch.id] = {...(progress[ch.id] ?? {}), sawAnswer: true}; store.set(progress);
        el.querySelector('[data-k="hints"]').innerHTML += `<p class="answer">${E(c.answer)}</p>`;
        paint();
      }
    });
  });
  paint();
}

function wireQuiz(root) {
  root.querySelectorAll('.quiz-item').forEach((el, i) => el.addEventListener('change', e => {
    const q = T.quiz[i], pick = Number(e.target.value);
    const fb = el.querySelector('.fb');
    fb.className = `fb ${pick === q.ok ? 'ok' : 'bad'}`;
    fb.textContent = `${pick === q.ok ? '✓' : '✗'} ${q.why}`;
  }));
}

function wireSlides(root, manifest) {
  const slides = manifest?.[lang] ?? manifest?.zh;
  if (!slides?.length) { root.querySelector('.slide-view').textContent = '—'; return; }
  let i = 0;
  const show = () => {
    const s = slides[i];
    root.querySelector('.slide-img').src = s.img; root.querySelector('.slide-img').alt = s.title;
    root.querySelector('.slide-notes').textContent = s.notes;
    root.querySelector('.slide-page').textContent = T.page(i + 1, slides.length);
  };
  root.querySelector('[data-a="prev"]').addEventListener('click', () => { i = Math.max(0, i - 1); show(); });
  root.querySelector('[data-a="next"]').addEventListener('click', () => { i = Math.min(slides.length - 1, i + 1); show(); });
  show();
}

async function main() {
  const app = document.getElementById('app');
  app.textContent = T.loading;
  const [fx, script, clock] = await Promise.all([data('data/fixtures.json'), data('data/script.json'), data('data/clock.json')]);
  validateClock(clock, script);
  const slidesManifest = await data('slides/manifest.json').catch(() => null);
  const fixtures = prepareFixtures(fx);
  app.innerHTML = `
  <header class="hero"><div class="wrap"><div class="topline"><span>${T.kicker}</span><a class="lang" href="${T.switchHref}">${T.switchTo}</a></div>
    <h1>${T.title}</h1><p class="lead">${T.subtitle}</p><p class="meta">${T.meta}</p></div></header>
  <nav class="toc" aria-label="sections"><div class="wrap">${T.nav.map(([id, l]) => `<a href="#${id}">${l}</a>`).join('')}</div></nav>
  <main class="wrap">
    <section id="outcomes"><h2>${T.outcomesTitle}</h2><ol class="outcomes">${T.outcomes.map(o => `<li>${o}</li>`).join('')}</ol></section>
    <section id="background"><h2>${T.backgroundTitle}</h2>${T.background.map(p => `<p>${p}</p>`).join('')}</section>
    <section id="definitions"><h2>${T.defsTitle}</h2><div class="defs">${T.defs.map(d => `<article class="def"><div class="fig">${figure(fixtures, d.fig)}</div><h3>${d.term}</h3><p>${d.text}</p></article>`).join('')}</div></section>
    <section id="worked"><h2>${T.workedTitle}</h2><p>${T.workedIntro}</p>${workedTable(fixtures)}<p>${T.workedNote}</p></section>
    <section id="film" class="dark"><h2>${T.filmTitle}</h2><p>${T.filmIntro} <a href="media/sample.zh.mp4">${T.sampleLink}</a></p><div data-k="player"></div></section>
    <section id="lab" class="dark"><h2>${T.labTitle}</h2><p>${T.labIntro}</p><div data-k="lab" class="lab"></div></section>
    <section id="pseudocode"><h2>${T.pseudoTitle}</h2><pre class="code">${E(T.pseudo)}</pre><ul>${T.pseudoNotes.map(n => `<li>${n}</li>`).join('')}</ul></section>
    <section id="mistakes"><h2>${T.mistakesTitle}</h2><div class="mistakes">${T.mistakes.map(([a, b]) => `<div><h3>✗ ${a}</h3><p>${b}</p></div>`).join('')}</div>
      <h2>${T.limitsTitle}</h2><ul>${T.limits.map(l => `<li>${l}</li>`).join('')}</ul></section>
    <section id="challenges"><h2>${T.challengesTitle}</h2><p>${T.challengesIntro}</p><div class="challenges">${CHALLENGES.map(challengeCard).join('')}</div></section>
    <section id="quiz"><h2>${T.quizTitle}</h2>${T.quiz.map((q, i) => `<fieldset class="quiz-item"><legend>${i + 1}. ${E(q.q)}</legend>${q.a.map((a, j) => `<label><input type="radio" name="quiz-${i}" value="${j}"> ${E(a)}</label>`).join('')}<p class="fb" aria-live="polite"></p></fieldset>`).join('')}</section>
    <section id="python"><h2>${T.pythonTitle}</h2><p>${T.pythonIntro}</p><ol>${T.pythonSteps.map(s => `<li>${s}</li>`).join('')}</ol><p><a class="button" href="downloads/hpwl-python.zip" download>${T.pythonDownload}</a></p><p class="small">${T.pythonNote}</p></section>
    <section id="slides"><h2>${T.slidesTitle}</h2><p>${T.slidesIntro} <a href="slides/hpwl-slides.${lang}.pdf">${T.slidesPdf}</a> · <a href="slides/hpwl-slides.${lang}.pptx">${T.slidesPptx}</a></p>
      <div class="slide-view"><img class="slide-img" alt="" width="1600" height="900"><div class="slide-nav"><button type="button" data-a="prev">${T.prev}</button><span class="slide-page"></span><button type="button" data-a="next">${T.next}</button></div><p class="slide-notes"></p></div></section>
    <section id="repro"><h2>${T.reproTitle}</h2>${T.repro.map(p => `<p>${links(p)}</p>`).join('')}<h3>${T.sourcesTitle}</h3><ul>${T.sources.map(s => `<li>${links(s)}</li>`).join('')}</ul></section>
  </main>
  <footer><div class="wrap">${T.footer} · <a href="${REPO}">GitHub</a></div></footer>`;
  const lab = createLab(app.querySelector('[data-k="lab"]'), {fixtures, text: T, lang});
  window.hpwlLab = lab; // exposed for the browser tests
  window.hpwlPlayer = createPlayer(app.querySelector('[data-k="player"]'), {fixtures, script, clock, text: T, lang, lab, media: {film: 'media/film.zh.mp4'}});
  wireChallenges(app.querySelector('#challenges'), fixtures, lab);
  wireQuiz(app.querySelector('#quiz'));
  wireSlides(app.querySelector('#slides'), slidesManifest);
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
  window.appReady = true;
}

main().catch(e => {
  document.getElementById('app').innerHTML = `<p class="fatal">${E(T.loadError)}${E(String(e.message ?? e))}</p>`;
  window.appError = String(e);
  console.error(e);
});
