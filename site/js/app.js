// Page bootstrap: language, sections, figures, worked table, lab, film player, challenges, quiz, slides.
import {prepareFixtures, makeState, analyse, fmt} from './domain.js';
import {Board, netColor, escapeText as E} from './board.js';
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
    <header><h3>${E(c.title)}</h3><span class="tag cat">${E(T.cat[ch.category])}</span><span class="tag diff d${ch.difficulty}">${E(T.diff[ch.difficulty])}</span><span class="tag progress" data-k="progress"></span></header>
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
    badge.className = `tag progress ${p?.done ? (p.studied ? 'studied' : 'indep') : ''}`;
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
    root.querySelector('.slide-notes-text').textContent = s.notes;
    root.querySelector('.slide-page').textContent = T.page(i + 1, slides.length);
  };
  root.querySelector('[data-a="prev"]').addEventListener('click', () => { i = Math.max(0, i - 1); show(); });
  root.querySelector('[data-a="next"]').addEventListener('click', () => { i = Math.min(slides.length - 1, i + 1); show(); });
  show();
}

const sec = (id, no, title, intro, body, cls = '') => `<section id="${id}" class="section ${cls}"><div class="wrap">
  <div class="section-head"><div><p class="eyebrow">${no} / ${E(T.nav.find(n => n[0] === id)?.[1] ?? '')}</p><h2>${title}</h2></div>${intro ? `<p>${intro}</p>` : ''}</div>${body}</div></section>`;
const BRAND = '<svg viewBox="0 0 26 26" aria-hidden="true"><rect x="4.5" y="7.5" width="17" height="11" fill="none" stroke="#0f6b5c" stroke-width="1.4" stroke-dasharray="3 2"/><circle cx="4.5" cy="18.5" r="2.6" fill="#fffdf8" stroke="#0f6b5c" stroke-width="1.4"/><circle cx="21.5" cy="7.5" r="2.6" fill="#fffdf8" stroke="#0f6b5c" stroke-width="1.4"/><circle cx="12" cy="12" r="2.2" fill="#946a17"/></svg>';

function wireNav() {
  const links = [...document.querySelectorAll('.module-nav a')];
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) links.forEach(a => a.classList.toggle('active', a.hash === `#${en.target.id}`));
  }), {rootMargin: '-45% 0px -50% 0px'});
  links.forEach(a => { const el = document.querySelector(a.hash); if (el) io.observe(el); });
}

async function main() {
  const app = document.getElementById('app');
  app.textContent = T.loading;
  const [fx, films] = await Promise.all([data('data/fixtures.json'), data('data/films/index.json')]);
  const slidesManifest = await data('slides/manifest.json').catch(() => null);
  const fixtures = prepareFixtures(fx);
  const other = lang === 'zh' ? 'en' : 'zh';
  app.innerHTML = `
  <a class="skip" href="#main">${lang === 'zh' ? '跳到正文' : 'Skip to content'}</a>
  <header class="topbar"><div class="wrap"><a class="brand" href="./${lang === 'en' ? '?lang=en' : ''}">${BRAND}<span class="brand-name">Placement Lab 02</span><span class="brand-sub">${E(T.title)}</span></a>
    <nav class="topnav" aria-label="${lang === 'zh' ? '页面' : 'Page'}"><a href="#films">${E(T.nav[1][1])}</a><a href="#lab">${E(T.nav[4][1])}</a><a href="#challenges">${E(T.nav[5][1])}</a><a href="${REPO}">GitHub</a></nav>
    <div class="lang-switch" role="group" aria-label="Language">${lang === 'zh' ? '<span aria-current="true" lang="zh-CN">中文</span><a href="?lang=en" lang="en">EN</a>' : '<a href="?lang=zh" lang="zh-CN">中文</a><span aria-current="true" lang="en">EN</span>'}</div></div></header>
  <nav class="module-nav" aria-label="${lang === 'zh' ? '本课各部分' : 'Sections'}"><div class="wrap">${T.nav.map(([id, l, n]) => `<a href="#${id}"><span>${n}</span>${E(l)}</a>`).join('')}</div></nav>
  <main id="main">
  <header class="mod-hero"><div class="wrap"><div><p class="eyebrow">${E(T.eyebrow)}</p><h1>${E(T.title)}</h1><p class="sub">${E(T.heroSub)}</p><p class="byline">${E(T.meta)}</p></div>
    <aside class="factbox"><dl>${T.facts.map(([k, v]) => `<dt>${E(k)}</dt><dd>${E(v)}</dd>`).join('')}</dl></aside></div></header>
  ${sec('goals', '01', T.outcomesTitle, '', `<div class="grid-2"><div><ol class="objectives">${T.outcomes.map(o => `<li>${o}</li>`).join('')}</ol></div>
    <div><h3>${T.problemTitle}</h3><div class="problem">${T.problem.map(([k, v]) => `<div><b>${E(k)}</b><p>${E(v)}</p></div>`).join('')}</div></div></div>`)}
  ${sec('films', '02', T.filmsTitle, T.filmsIntro, '<div data-k="player"></div>', 'dark')}
  ${sec('lesson', '03', T.lessonTitle, '', `<div class="lesson-layout"><nav class="lesson-toc">${[['background', T.backgroundTitle], ['definitions', T.defsTitle], ['worked', T.workedTitle], ['pseudocode', T.pseudoTitle]].map(([id, t], i) => `<a href="#${id}"><span>03.${i + 1}</span>${E(t)}</a>`).join('')}</nav>
    <div class="prose wide">
    <div class="lesson-part" id="background"><span class="part-no">03.1</span><h3>${T.backgroundTitle}</h3>${T.background.map(p => `<p>${p}</p>`).join('')}</div>
    <div class="lesson-part" id="definitions"><span class="part-no">03.2</span><h3>${T.defsTitle}</h3><div class="defs">${T.defs.map(d => `<article class="def"><div class="fig">${figure(fixtures, d.fig)}</div><h4>${d.term}</h4><p>${d.text}</p></article>`).join('')}</div></div>
    <div class="lesson-part" id="worked"><span class="part-no">03.3</span><h3>${T.workedTitle}</h3><p>${T.workedIntro}</p>${workedTable(fixtures)}<p class="callout">${T.workedNote}</p></div>
    <div class="lesson-part" id="pseudocode"><span class="part-no">03.4</span><h3>${T.pseudoTitle}</h3><pre class="code">${E(T.pseudo)}</pre><ul>${T.pseudoNotes.map(n => `<li>${n}</li>`).join('')}</ul></div>
    </div></div>`)}
  ${sec('slides', '04', T.slidesTitle, `${T.slidesIntro} <a href="slides/hpwl-slides.${lang}.pdf">${T.slidesPdf}</a> · <a href="slides/hpwl-slides.${lang}.pptx">${T.slidesPptx}</a>`,
    `<div class="slides slide-view"><div class="slide-bar"><button type="button" class="btn small" data-a="prev">${T.prev}</button><span class="pageno slide-page"></span><button type="button" class="btn small" data-a="next">${T.next}</button></div>
     <div class="slide-stage"><img class="slide-img" alt="" width="1600" height="900"></div><div class="slide-notes"><h4>${lang === 'zh' ? '讲稿' : 'Notes'}</h4><p class="slide-notes-text"></p></div></div>`)}
  ${sec('lab', '05', T.labTitle, T.labIntro, '<div data-k="lab" class="lab"></div>', 'dark')}
  ${sec('challenges', '06', T.challengesTitle, T.challengesIntro, `<div class="challenges">${CHALLENGES.map(challengeCard).join('')}</div>`)}
  ${sec('quiz', '07', T.quizTitle, '', T.quiz.map((q, i) => `<fieldset class="quiz-item"><legend><span>${String(i + 1).padStart(2, '0')}</span> ${E(q.q)}</legend>${q.a.map((a, j) => `<label><input type="radio" name="quiz-${i}" value="${j}"> ${E(a)}</label>`).join('')}<p class="fb" aria-live="polite"></p></fieldset>`).join(''))}
  ${sec('python', '08', T.pythonTitle, T.pythonIntro, `<ol class="objectives">${T.pythonSteps.map(s => `<li>${s}</li>`).join('')}</ol><p class="btn-row"><a class="btn primary" href="downloads/hpwl-python.zip" download>${T.pythonDownload}</a></p><p class="small muted">${T.pythonNote}</p>`)}
  ${sec('mistakes', '09', T.mistakesTitle, '', `<div class="mistakes">${T.mistakes.map(([a, b]) => `<div class="mistake"><h4>${a}</h4><p>${b}</p></div>`).join('')}</div>
    <div class="limits"><h3>${T.limitsTitle}</h3><ul class="prose">${T.limits.map(l => `<li>${l}</li>`).join('')}</ul></div>`)}
  ${sec('repro', '10', T.reproTitle, '', `<div class="grid-2"><div class="prose">${T.repro.map(p => `<p>${links(p)}</p>`).join('')}</div><div><h3>${T.sourcesTitle}</h3><ul class="credits-list">${T.sources.map(s => `<li>${links(s)}</li>`).join('')}</ul></div></div>`)}
  </main>
  <footer class="footer"><div class="wrap"><p>${T.footer}</p><p><a href="${REPO}">GitHub</a> · <a href="?lang=${other}">${T.switchTo}</a></p></div></footer>`;
  const lab = createLab(app.querySelector('[data-k="lab"]'), {fixtures, text: T, lang});
  window.hpwlLab = lab; // exposed for the browser tests
  window.hpwlPlayer = createPlayer(app.querySelector('[data-k="player"]'), {fixtures, films, text: T, lang, lab});
  wireChallenges(app.querySelector('#challenges'), fixtures, lab);
  wireQuiz(app.querySelector('#quiz'));
  wireSlides(app.querySelector('#slides'), slidesManifest);
  wireNav();
  await window.hpwlPlayer.ready.catch(e => console.error(e));
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
  window.appReady = true;
}

main().catch(e => {
  document.getElementById('app').innerHTML = `<p class="fatal">${E(T.loadError)}${E(String(e.message ?? e))}</p>`;
  window.appError = String(e);
  console.error(e);
});
