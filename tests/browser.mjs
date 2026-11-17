// Browser tests in headless Chromium (Playwright). Serves site/ at the GitHub Pages subpath and at "/".
//   node tests/browser.mjs [--base https://su3037.github.io/placement-lab02-hpwl/]   (--base tests a deployed site)
// Writes build/browser-report.json. Exit code 1 on any failure.
import {createRequire} from 'node:module';
import {mkdirSync, writeFileSync, readFileSync, existsSync} from 'node:fs';
import {startServer} from '../scripts/serve.mjs';
import * as D from '../site/js/domain.js';
import {stateAt, frameAt, frameTime} from '../site/js/timeline.js';

const require = createRequire(import.meta.url);
const {chromium} = require('playwright');
const ROOT = new URL('../', import.meta.url);
const fixtures = D.prepareFixtures(JSON.parse(readFileSync(new URL('fixtures/hpwl-fixtures.json', ROOT))));
// The player opens on the first film (科普 story, music clock); its zh clock drives the handoff and caption checks.
const readJ = p => JSON.parse(readFileSync(new URL(p, ROOT)));
const storyScript = readJ('site/data/films/story.json'), clock = readJ('site/data/films/story.clock.zh.json');
const index = readJ('site/data/films/index.json');
const baseArg = process.argv.includes('--base') ? process.argv[process.argv.indexOf('--base') + 1] : null;
const results = [];
const check = (name, ok, detail = '') => { results.push({name, ok: Boolean(ok), detail: String(detail).slice(0, 300)}); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail && !ok ? ' :: ' + detail : ''}`); };

const srv = baseArg ? null : await startServer({prefix: '/placement-lab02-hpwl/'});
const srvRoot = baseArg ? null : await startServer({prefix: '/'});
const BASE = baseArg ?? srv.url;
const browser = await chromium.launch();

async function open(url, opts = {}) {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 1000}, ...opts});
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  await page.goto(url);
  await page.waitForFunction(() => window.appReady || window.appError || window.ready || window.renderError, null, {timeout: 30000});
  return {ctx, page, errors};
}
const labTotal = page => page.evaluate(() => Number(document.querySelector('#lab .lab-total b').textContent));
const labState = page => page.evaluate(() => window.hpwlLab.getState());

try {
  // 1. Load at the Pages subpath, Chinese, desktop
  {
    const {ctx, page, errors} = await open(BASE);
    check('subpath load without errors', errors.length === 0 && await page.evaluate(() => window.appReady === true), errors.join('; '));
    const ids = await page.evaluate(() => [...document.querySelectorAll('main section')].map(s => s.id));
    check('all ten numbered sections present in house order', JSON.stringify(ids) === JSON.stringify(['goals', 'films', 'lesson', 'slides', 'lab', 'challenges', 'quiz', 'python', 'mistakes', 'repro']), ids);
    check('lesson has background, definitions, worked example and pseudocode', await page.evaluate(() => ['background', 'definitions', 'worked', 'pseudocode'].every(id => document.querySelector(`#lesson #${id}`))));
    check('four film cards in order 科普 → 精讲 → 进阶 → 实验演示', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('#films .film-card')].map(b => b.dataset.film))) === '["story","concise","advanced","lab"]');
    const worked = await page.evaluate(() => [...document.querySelectorAll('#worked tfoot b')].map(b => b.textContent));
    check('worked table totals 52 / 116', worked[0] === '52' && worked[1] === '116', worked);
    check('lab starts at 52', await labTotal(page) === 52);

    // net selection
    await page.click('#lab .lab-nets button[data-net="EF"]');
    check('net selector selects EF', (await labState(page)).selectedNet === 'EF');

    // keyboard move of B, then the page total equals an independent evaluation of the lab state
    await page.focus('#lab [data-cell="B"]');
    await page.keyboard.press('ArrowLeft');
    let s = await labState(page);
    check('keyboard moves B by the snap step', s.positions.B.x === 7.5 && s.positions.B.y === 0, JSON.stringify(s.positions.B));
    check('keyboard focus stays on B after re-render', await page.evaluate(() => document.activeElement?.dataset.cell) === 'B');
    check('displayed total = domain total of the lab state', await labTotal(page) === D.evaluate(s.nets, s.positions).total);

    // mouse drag of C to (3,5)
    await page.locator('#lab .lab-board svg').scrollIntoViewIfNeeded();
    const box = {...await page.locator('#lab .lab-board svg').boundingBox()};
    const toPx = (x, y) => { const sc = Math.min((900 - 70 - 150) / 8, (900 - 70 - 90) / 8); const ox = 70 + (900 - 220 - sc * 8) / 2, oy = 90 + (900 - 160 - sc * 8) / 2; return {x: box.x + (ox + x * sc) * box.width / 900, y: box.y + (oy + (8 - y) * sc) * box.height / 900}; };
    const c0 = toPx(0, 8), c1 = toPx(3, 5);
    await page.mouse.move(c0.x, c0.y); await page.mouse.down(); await page.mouse.move(c1.x, c1.y, {steps: 8}); await page.mouse.up();
    s = await labState(page);
    check('mouse drag moves C to (3,5) via the shared geometry', s.positions.C.x === 3 && s.positions.C.y === 5, JSON.stringify(s.positions.C));
    check('undo restores C', (await page.click('#lab [data-a="undo"]'), (await labState(page)).positions.C.x === 0));

    // touch-style pointer drag (pointerType touch) of E
    await page.locator('#lab .lab-board svg').scrollIntoViewIfNeeded();
    Object.assign(box, await page.locator('#lab .lab-board svg').boundingBox());
    const e0 = toPx(4, 4), e1 = toPx(6, 2);
    await page.evaluate(([a, b]) => {
      const el = document.querySelector('#lab [data-cell="E"]'), board = document.querySelector('#lab .lab-board');
      const ev = (t, p, target) => target.dispatchEvent(new PointerEvent(t, {bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: p.x, clientY: p.y}));
      ev('pointerdown', a, el); ev('pointermove', b, board); ev('pointerup', b, board);
    }, [e0, e1]);
    s = await labState(page);
    check('touch pointer drag moves E', s.positions.E.x === 6 && s.positions.E.y === 2, JSON.stringify(s.positions.E));

    // fixed mode: A cannot move
    await page.click('#lab button[data-preset="starter"]');
    await page.check('#lab input[name="lab-mode"][value="fixed"]');
    await page.focus('#lab [data-cell="A"]');
    await page.keyboard.press('ArrowRight');
    s = await labState(page);
    check('fixed-anchor mode blocks moving A', s.mode === 'fixed' && s.positions.A.x === 0);
    check('mode switch keeps coordinates and constraints', JSON.stringify(s.fixed) === '["A","D"]' && s.positions.D.x === 8);

    // step-by-step scan
    await page.click('#lab .lab-nets button[data-net="ABCD"]');
    for (let i = 0; i < 2; i++) await page.click('#lab [data-a="scan"]');
    check('scan log reports pin 2 of 4', /2\/4/.test(await page.textContent('#lab .scanlog')));

    // challenges: c1 answer, c5 state (pass with compact, fail with collapse), studied vs independent
    await page.fill('[name="c1-one-net-minX"]', '1'); await page.fill('[name="c1-one-net-maxX"]', '7');
    await page.fill('[name="c1-one-net-minY"]', '1'); await page.fill('[name="c1-one-net-maxY"]', '6'); await page.fill('[name="c1-one-net-hpwl"]', '11');
    await page.click('#c1-one-net button[type="submit"]');
    check('c1 passes with the right numbers', await page.getAttribute('#c1-one-net [data-k="result"]', 'class') === 'ch-result ok');
    check('c1 tracked as independent', /独立/.test(await page.textContent('#c1-one-net [data-k="progress"]')));
    await page.click('#c5-free-target [data-a="start"]');
    await page.click('#lab button[data-preset="collapsed"]');
    await page.click('#c5-free-target button[type="submit"]');
    check('c5 rejects the HPWL-0 collapse', await page.getAttribute('#c5-free-target [data-k="result"]', 'class') === 'ch-result bad');
    await page.click('#c5-free-target [data-a="answer"]');
    await page.click('#lab button[data-preset="compact"]');
    await page.click('#c5-free-target button[type="submit"]');
    check('c5 passes with the compact layout', await page.getAttribute('#c5-free-target [data-k="result"]', 'class') === 'ch-result ok');
    check('c5 tracked as studied answer', /学习答案/.test(await page.textContent('#c5-free-target [data-k="progress"]')));
    await page.click('#c3-hyperedge-sum [data-a="hint"]'); await page.click('#c3-hyperedge-sum [data-a="hint"]');
    check('two-stage hints', await page.locator('#c3-hyperedge-sum .hint').count() === 2);

    // quiz feedback
    await page.check('[name="quiz-0"][value="1"]');
    check('quiz gives feedback', /✓/.test(await page.textContent('#quiz .quiz-item .fb')));

    // film: frame-to-lab handoff (only when the full film exists)
    if (existsSync(new URL('site/media/story.zh.mp4', ROOT))) {
      await page.waitForFunction(() => document.querySelector('#films video').readyState >= 1, null, {timeout: 20000});
      const sg = seg('extreme_move');
      let t = sg.start;
      while (t < sg.sceneEnd && !stateAt(frameTime(frameAt(t, 30), 30), fixtures, storyScript, clock).intermediate) t += 1 / 30;
      t += 0.5;
      await page.evaluate(t => new Promise(r => { const v = document.querySelector('#films video'); v.addEventListener('seeked', r, {once: true}); v.currentTime = t; }), t);
      const cur = await page.evaluate(() => { const c = window.hpwlPlayer.current(); return {f: c.f, t: c.t, pos: c.state.board.positions, cue: c.state.cueId, inter: c.state.intermediate}; });
      await page.click('#films [data-a="try"]');
      s = await labState(page);
      check('try-this-frame transfers the exact interpolated coordinates', JSON.stringify(s.positions) === JSON.stringify(cur.pos) && cur.cue === sg.id && cur.inter, JSON.stringify({cur, lab: s.positions}));
      check('handoff keeps fixture, net and mode', s.fixtureId === 'multi' && s.selectedNet === 'N1' && s.mode === 'free');
      check('lab shows the intermediate-frame notice', /中间帧/.test(await page.textContent('#lab .lab-banner')));
      check('lab recomputes after handoff with the same function (shown to display precision)', Math.abs(await labTotal(page) - D.evaluate(s.nets, s.positions).total) < 0.005);
      const fx = seg('fixed_anchor');
      await page.evaluate(t => new Promise(r => { const v = document.querySelector('#films video'); v.addEventListener('seeked', r, {once: true}); v.currentTime = t; }), fx.sceneEnd - 0.2);
      await page.click('#films [data-a="try"]');
      s = await labState(page);
      check('handoff of a fixed-anchor frame carries mode, anchors and footprint flag', s.mode === 'fixed' && s.footprint === true && s.positions.A.x === 0 && D.analyse(s).total === 49);
      await page.selectOption('#films [data-k="capsel"]', 'en');
      const capL = fx.lines.find((L, i) => storyScript.cues.find(c => c.id === fx.id).lines[i].en);
      const capT = (capL.start + capL.end) / 2;
      await page.evaluate(t => new Promise(r => { const v = document.querySelector('#films video'); v.addEventListener('seeked', r, {once: true}); v.currentTime = t; }), capT);
      const capWant = await page.evaluate(() => window.hpwlPlayer.current().state.caption?.en || '');
      check('English caption bar follows the frame', capWant.length > 10 && (await page.textContent('#films .caption-bar')) === capWant, capWant);
      await page.evaluate(t => new Promise(r => { const v = document.querySelector('#films video'); v.addEventListener('seeked', r, {once: true}); v.currentTime = t; }), fx.sceneEnd - 0.2);
      check('caption bar is empty in the silent tail after a cue', (await page.textContent('#films .caption-bar')) === '');
      const dur = await page.evaluate(() => document.querySelector('#films video').duration);
      check('video duration matches the clock (±1 frame)', Math.abs(dur - clock.duration) <= 1 / 30 + 1e-3, `${dur} vs ${clock.duration}`);
          // switching films: the advanced card loads its own video, clock and chapters
      await page.click('#films .film-card[data-film="advanced"]');
      await page.waitForFunction(() => window.hpwlPlayer.current()?.film === 'advanced');
      const adv = index.find(e => e.id === 'advanced');
      check('film card switches video and chapters', (await page.getAttribute('#films video source', 'src')) === adv.langs.zh.video &&
        await page.locator('#films .chapters li').count() === readJ('site/data/films/advanced.clock.zh.json').segments.length);
      for (const e of index) for (const l of ['zh', 'en']) check(`film ${e.id}.${l} rendered`, existsSync(new URL(`site/${e.langs[l].video}`, ROOT)));
    } else check('full film present', false, 'site/media/story.zh.mp4 missing');

    // refresh at a hash
    await page.goto(BASE + '#lab'); await page.waitForFunction(() => window.appReady);
    check('refresh with #lab works', await page.evaluate(() => window.appReady === true));
    // slides viewer
    const slideSrc = await page.getAttribute('#slides .slide-img', 'src');
    check('slide viewer shows page 1 with notes', Boolean(slideSrc) && (await page.textContent('#slides .slide-notes')).length > 10, slideSrc);
    check('no page errors after interaction', errors.length === 0, errors.join('; '));
    await ctx.close();
  }

  // 2. English, phone width, reduced motion, touch
  {
    const {ctx, page, errors} = await open(BASE + '?lang=en', {viewport: {width: 390, height: 844}, reducedMotion: 'reduce', hasTouch: true, isMobile: true, deviceScaleFactor: 1});
    check('English page loads at 390 px', errors.length === 0 && await page.evaluate(() => document.documentElement.lang === 'en'), errors.join('; '));
    const sw = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    check('no horizontal page overflow at 390 px', sw[0] <= sw[1], sw);
    const fontPx = await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
    check('body text at least 16 px on phone', fontPx >= 16, fontPx);
    const bw = await page.evaluate(() => document.querySelector('#lab .lab-board svg').getBoundingClientRect().width);
    check('lab board fits the phone width', bw <= 390 && bw > 300, bw);
    check('English page plays the English version of the film', await page.evaluate(() => document.querySelector('#films [data-k="vlang"]').value === 'en' && window.hpwlPlayer.current().vlang === 'en'));
    await page.screenshot({path: new URL('build/page-en-390.png', ROOT).pathname, fullPage: false});
    await ctx.close();
  }

  // 3. Root path also works (no hard-coded /placement-lab02-hpwl/)
  if (!baseArg) {
    const {ctx, page, errors} = await open(srvRoot.url);
    check('root path load without errors', errors.length === 0 && await page.evaluate(() => window.appReady === true), errors.join('; '));
    await ctx.close();
  }

  // 4. Missing resource: the film fails visibly, the rest of the page still works
  {
    const ctx = await browser.newContext({viewport: {width: 1200, height: 900}});
    const page = await ctx.newPage();
    await page.route('**/media/story.zh.mp4', r => r.fulfill({status: 404, body: 'missing'}));
    await page.goto(BASE); await page.waitForFunction(() => window.appReady);
    await page.waitForFunction(() => !document.querySelector('#films [data-k="err"]').hidden, null, {timeout: 10000}).catch(() => {});
    check('missing film shows an explicit error', await page.evaluate(() => !document.querySelector('#films [data-k="err"]').hidden));
    check('lab still works without the film', await labTotal(page) === 52);
    await ctx.close();
    const ctx2 = await browser.newContext(); const p2 = await ctx2.newPage();
    await p2.route('**/data/films/index.json', r => r.fulfill({status: 404, body: 'missing'}));
    await p2.goto(BASE); await p2.waitForFunction(() => window.appReady || window.appError);
    check('missing data shows a load error instead of a blank page', /index\.json/.test(await p2.textContent('#app')));
    await ctx2.close();
  }

  // 5. renderAt determinism: fresh 12.3 vs after 2 -> 27 -> 12.3, pixel-identical in this environment
  {
    const shot = async seq => {
      const {ctx, page} = await open(`${BASE}render.html?film=story&lang=zh`, {viewport: {width: 1920, height: 1080}});
      let snap;
      for (const t of seq) snap = await page.evaluate(t => window.renderAt(t), t);
      const png = await page.screenshot({clip: {x: 0, y: 0, width: 1920, height: 1080}});
      await ctx.close();
      return {png, snap};
    };
    for (const t of [12.3, seg('extreme_move').start, seg('extreme_move').lines.at(-1).start + 1.234, seg('compact_collapse').start - 1e-3, clock.track.hits[2] + 0.01]) {
      const a = await shot([t]), b = await shot([2, 27, clock.duration, t]), c = await shot([t, 100, t]);
      check(`renderAt(${t.toFixed(3)}) same semantic state in any order`, JSON.stringify(a.snap) === JSON.stringify(b.snap) && JSON.stringify(a.snap) === JSON.stringify(c.snap));
      check(`renderAt(${t.toFixed(3)}) pixel-identical in any order`, a.png.equals(b.png) && a.png.equals(c.png));
    }
  }
} catch (e) {
  check('browser test harness', false, e.stack);
} finally {
  await browser.close();
  if (srv) await srv.close();
  if (srvRoot) await srvRoot.close();
}
function seg(scene) { return clock.segments[storyScript.cues.findIndex(c => (c.scene ?? c.id) === scene)]; }
mkdirSync(new URL('build/', ROOT), {recursive: true});
const passed = results.filter(r => r.ok).length;
writeFileSync(new URL('build/browser-report.json', ROOT), JSON.stringify({base: BASE, passed, total: results.length, results}, null, 1));
console.log(`\n${passed}/${results.length} browser checks passed`);
process.exit(passed === results.length ? 0 : 1);
