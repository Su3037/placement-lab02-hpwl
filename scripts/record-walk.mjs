// Record the lab walkthrough: drive the real page with Playwright and save one screenshot per step, with the
// pointer position at that moment. The film (scene "walk" in site/js/timeline.js) draws these screenshots, a
// cursor gliding between the recorded positions, and a click ring, so the walkthrough shows the actual site.
//   node scripts/record-walk.mjs            -> site/data/walk/<lang>.json + site/data/walk/<lang>-wNN-K.jpg
// Shots record only what the page really showed; nothing is painted in afterwards.
import {createRequire} from 'node:module';
import {mkdirSync, writeFileSync, readdirSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {startServer} from './serve.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require('playwright');
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUT = join(ROOT, 'site/data/walk');
const VIEW = {w: 1440, h: 810};

async function record(browser, url, lang) {
  const ctx = await browser.newContext({viewport: {width: VIEW.w, height: VIEW.h}, deviceScaleFactor: 1, reducedMotion: 'reduce', locale: lang === 'zh' ? 'zh-CN' : 'en-US'});
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${url}?lang=${lang}`);
  await page.waitForFunction(() => window.appReady === true || window.appError, null, {timeout: 30000});
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({content: '*{caret-color:transparent!important} .skip{display:none}'});
  const shots = {};
  let cursor = [VIEW.w / 2, VIEW.h / 2];
  const center = async sel => {
    const b = await page.locator(sel).first().boundingBox();
    if (!b) throw new Error(`no box for ${sel}`);
    const c = [b.x + b.width / 2, b.y + b.height / 2];
    if (c[0] < 0 || c[1] < 0 || c[0] > VIEW.w || c[1] > VIEW.h) throw new Error(`${sel} is off screen at ${c}`);
    return c;
  };
  const top = async (sel, offset = 132) => { await page.evaluate(([s, o]) => { const el = document.querySelector(s); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - o); }, [sel, offset]); await page.waitForTimeout(120); };
  const shot = async (cue, at, {click = false} = {}) => {
    await page.waitForTimeout(150);
    (shots[cue] ??= []);
    const k = shots[cue].length;
    const name = `${lang}-${cue}-${k}.jpg`;
    await page.screenshot({path: join(OUT, name), type: 'jpeg', quality: 88});
    shots[cue].push({img: `data/walk/${name}`, at, cursor: cursor.map(v => Math.round(v)), click});
  };
  const point = async (sel, {clickIt = true} = {}) => { cursor = await center(sel); await page.mouse.move(...cursor); if (clickIt) await page.mouse.click(...cursor); };
  // grid -> screen, measured from the starter layout's corner cells A (0,0) and D (8,8)
  const grid = async () => {
    const [ax, ay] = await center('#lab [data-cell="A"]'), [dx, dy] = await center('#lab [data-cell="D"]');
    return (x, y) => [ax + (dx - ax) * x / 8, ay + (dy - ay) * y / 8];
  };

  // w01: the lab opens on the starter layout
  await top('#lab .lab-controls', 150);
  cursor = await center('#lab .lab-total b'); await page.mouse.move(...cursor);
  await shot('w01', 0);
  // w02: pick a net
  await point('#lab .lab-nets button[data-net="AB"]'); await shot('w02', 0.12, {click: true});
  await point('#lab .lab-nets button[data-net="ABCD"]'); await shot('w02', 0.55, {click: true});
  // w03: drag C from (0, 8) to (3, 5)
  const g = await grid();
  cursor = g(0, 8); await page.mouse.move(...cursor); await shot('w03', 0.08);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) { const p = g(3 * i / 12, 8 - 3 * i / 12); await page.mouse.move(...p, {steps: 2}); if (i === 6) { cursor = p; await shot('w03', 0.3); } }
  cursor = g(3, 5); await page.mouse.up(); await shot('w03', 0.5);
  // w04: keyboard: focus E, two arrow presses, then undo
  await point('#lab [data-cell="E"]'); await shot('w04', 0.06, {click: true});
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await shot('w04', 0.35);
  await point('#lab [data-a="undo"]'); await shot('w04', 0.7, {click: true});
  // w05: step-by-step scan of ABCD
  await point('#lab .lab-nets button[data-net="ABCD"]', {clickIt: true});
  for (let i = 0; i < 4; i++) { await point('#lab [data-a="scan"]'); await shot('w05', 0.05 + i * 0.2, {click: true}); }
  await point('#lab [data-a="reset"]'); await shot('w05', 0.88, {click: true});
  // w06: fixed-anchor mode, then try to drag A
  await point('#lab input[name="lab-mode"][value="fixed"]'); await shot('w06', 0.08, {click: true});
  const g2 = await grid();
  cursor = g2(0, 0); await page.mouse.move(...cursor); await page.mouse.down(); await page.mouse.move(...g2(2, 1), {steps: 6}); await page.mouse.up();
  await shot('w06', 0.45, {click: true});
  await point('#lab input[name="lab-mode"][value="free"]');
  // w07: from the film: pause the advanced film on a frame and hand it to the lab
  await page.evaluate(async () => {
    const P = window.hpwlPlayer; await P.load('advanced', document.documentElement.lang.startsWith('zh') ? 'zh' : 'en');
    await new Promise(r => { const v = P.video; const go = () => { v.currentTime = 40.5; }; v.addEventListener('seeked', r, {once: true}); if (v.readyState >= 1) go(); else v.addEventListener('loadedmetadata', go, {once: true}); setTimeout(r, 4000); });
    if (P.video.error || P.video.readyState < 2) { const live = document.querySelector('[data-k="live"]'); if (!live.checked) live.click(); }
  });
  await top('#films .player-tools', VIEW.h - 150);
  await page.waitForFunction(() => { const v = window.hpwlPlayer.video; return v.error || (!v.seeking && v.readyState >= 3); }, null, {timeout: 15000});
  await page.waitForTimeout(600);
  cursor = await center('#films [data-a="try"]'); await page.mouse.move(...cursor); await shot('w07', 0.06);
  await page.mouse.click(...cursor); await page.waitForTimeout(300);
  await top('#lab .lab-controls', 150);
  cursor = await center('#lab .lab-banner'); await page.mouse.move(...cursor); await shot('w07', 0.45, {click: true});
  // w08: a challenge that checks the lab's layout, then a computed one
  await top('#c1-one-net', 140);
  for (const [k, v] of Object.entries({minX: 1, maxX: 7, minY: 1, maxY: 6, hpwl: 11})) { const f = page.locator(`#c1-one-net [name="c1-one-net-${k}"]`); if (await f.count()) await f.fill(String(v)); }
  cursor = await center('#c1-one-net [name="c1-one-net-hpwl"]'); await page.mouse.move(...cursor); await shot('w08', 0.06);
  await point('#c1-one-net button[type="submit"]'); await shot('w08', 0.4, {click: true});
  // w09: Python practice
  await top('#python', 140);
  cursor = await center('#python a[download]'); await page.mouse.move(...cursor); await shot('w09', 0.1);
  if (errors.length) throw new Error(`page errors while recording ${lang}: ${errors.join(' | ')}`);
  await ctx.close();
  return {viewport: VIEW, lang, shots};
}

mkdirSync(OUT, {recursive: true});
for (const f of readdirSync(OUT)) rmSync(join(OUT, f));
const srv = await startServer({prefix: '/placement-lab02-hpwl/'});
const browser = await chromium.launch({args: ['--hide-scrollbars', '--font-render-hinting=none']});
try {
  for (const lang of ['zh', 'en']) {
    const data = await record(browser, srv.url, lang);
    writeFileSync(join(OUT, `${lang}.json`), JSON.stringify(data, null, 1));
    console.log(`${lang}: ${Object.values(data.shots).flat().length} shots`);
  }
} finally { await browser.close(); await srv.close(); }
