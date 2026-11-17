// Slide deck renderer: each slide is HTML with a figure drawn by the shared Board() from the fixtures.
import {prepareFixtures, makeState} from './domain.js';
import {Board, escapeText as E} from './board.js';
import {TEXT} from './content.js';

export function slideFigure(fixtures, spec, lang) {
  const fx = fixtures[spec.fixture];
  const st = makeState(fx, spec.placement, {mode: spec.mode ?? 'free', footprint: Boolean(spec.footprint), selectedNet: spec.selectedNet ?? null});
  const view = {...st, showBoxes: spec.showBoxes ?? 'selected', visibleNets: spec.visibleNets, highlights: spec.highlights ?? {}, showMode: Boolean(spec.showMode)};
  return Board(view, {width: 760, height: 720, lang, id: `slide-fig-${spec.fixture}-${spec.placement}`});
}

export function renderDeck(root, {fixtures, slides, lang}) {
  const n = slides.length;
  root.innerHTML = slides.map((s, i) => {
    const t = s[lang];
    const fig = s.fig ? `<div class="s-fig">${slideFigure(fixtures, s.fig, lang)}</div>` : s.code ? `<pre class="s-code">${E(TEXT[lang].pseudo)}</pre>` : '';
    return `<section class="slide ${i === 0 ? 'title-slide' : ''}" data-i="${i + 1}"><h1>${E(t.title)}</h1><div class="s-body"><ul>${t.bullets.map(b => `<li>${E(b)}</li>`).join('')}</ul>${fig}</div>
      <footer><span>Placement · Lab 02 · HPWL</span><span class="pn">${i + 1} / ${n}</span></footer></section>`;
  }).join('');
}

export async function boot() {
  const lang = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'zh';
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  const [fx, deck] = await Promise.all([fetch('data/fixtures.json').then(r => r.json()), fetch('data/slides.json').then(r => r.json())]);
  renderDeck(document.getElementById('deck'), {fixtures: prepareFixtures(fx), slides: deck.slides, lang});
  await document.fonts.ready;
  window.deck = deck; window.slidesReady = true;
}
