// Build slides from content/slides.json with the shared board code.
//   node scripts/build-slides.mjs   -> site/slides/hpwl-slides.{zh,en}.pdf, site/slides/{zh,en}/slide-NN.jpg,
//                                      site/slides/manifest.json, build/slides/{lang}/fig-NN.png (for the PPTX)
// Then: python3 scripts/build_pptx.py -> site/slides/hpwl-slides.{zh,en}.pptx
import {createRequire} from 'node:module';
import {mkdirSync, writeFileSync, copyFileSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {startServer} from './serve.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require('playwright');
const ROOT = fileURLToPath(new URL('../', import.meta.url));
copyFileSync(join(ROOT, 'content/slides.json'), join(ROOT, 'site/data/slides.json'));
const deck = JSON.parse(readFileSync(join(ROOT, 'content/slides.json')));
const srv = await startServer({prefix: '/placement-lab02-hpwl/'});
const browser = await chromium.launch();
const manifest = {};
try {
  for (const lang of ['zh', 'en']) {
    const page = await browser.newPage({viewport: {width: 1600, height: 900}, deviceScaleFactor: 1});
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('response', r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
    await page.goto(`${srv.url}slides.html?lang=${lang}`);
    await page.waitForFunction(() => window.slidesReady || window.slidesError, null, {timeout: 30000});
    if (errors.length) throw new Error(errors.join('; '));
    mkdirSync(join(ROOT, 'site/slides', lang), {recursive: true});
    mkdirSync(join(ROOT, 'build/slides', lang), {recursive: true});
    await page.pdf({path: join(ROOT, `site/slides/hpwl-slides.${lang}.pdf`), width: '1600px', height: '900px', printBackground: true, preferCSSPageSize: true});
    const n = await page.locator('.slide').count();
    manifest[lang] = [];
    for (let i = 0; i < n; i++) {
      const slide = page.locator('.slide').nth(i);
      const id = String(i + 1).padStart(2, '0');
      await slide.screenshot({path: join(ROOT, `site/slides/${lang}/slide-${id}.jpg`), type: 'jpeg', quality: 88});
      manifest[lang].push({img: `slides/${lang}/slide-${id}.jpg`, title: deck.slides[i][lang].title, notes: deck.slides[i][lang].notes});
    }
    await page.close();
    // High-resolution figures for the editable PPTX.
    const hi = await browser.newPage({viewport: {width: 1600, height: 900}, deviceScaleFactor: 2});
    await hi.goto(`${srv.url}slides.html?lang=${lang}`);
    await hi.waitForFunction(() => window.slidesReady);
    for (let i = 0; i < n; i++) {
      const fig = hi.locator('.slide').nth(i).locator('.s-fig, .s-code');
      if (await fig.count()) await fig.first().screenshot({path: join(ROOT, `build/slides/${lang}/fig-${String(i + 1).padStart(2, '0')}.png`)});
    }
    await hi.close();
    console.log(`${lang}: ${n} slides`);
  }
  writeFileSync(join(ROOT, 'site/slides/manifest.json'), JSON.stringify(manifest, null, 1));
} finally { await browser.close(); await srv.close(); }
