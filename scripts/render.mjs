// Deterministic frame renderer for the HPWL film (adapted from GateUltra/vlsi-course-director render_html.py, MIT;
// rewritten in Node because this environment ships Playwright for Node, not Python). See NOTICE.md.
//
//   node scripts/render.mjs --stills [t1,t2,...]          one PNG per time (default: each cue's mid-point) -> build/stills/
//   node scripts/render.mjs --sample                      the sample (cues extreme_move + interior_move) -> site/media/sample.zh.mp4
//   node scripts/render.mjs --range 107.5 148.6 --out x.mp4
//   node scripts/render.mjs --full                        whole film -> site/media/film.zh.mp4
// Options: --lang zh|en  --fps 30  --workers 4  --width 1920 --height 1080 --crf 20
//
// Contract: the page sets window.ready only after data and fonts load; window.renderAt(t) draws the complete state
// for time t (random access, no history). Frame i is rendered at t = start + i / fps.
import {createRequire} from 'node:module';
import {spawnSync, spawn} from 'node:child_process';
import {mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync, existsSync, renameSync, statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join, dirname, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {startServer} from './serve.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require('playwright');
const ROOT = fileURLToPath(new URL('../', import.meta.url));

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def; };
const has = name => args.includes(`--${name}`);
const lang = opt('lang', 'zh');
const fps = Number(opt('fps', 30)), width = Number(opt('width', 1920)), height = Number(opt('height', 1080));
const workers = Number(opt('workers', 4)), crf = Number(opt('crf', 20));
const clock = JSON.parse(readFileSync(join(ROOT, 'site/data/clock.json')));

function sha(path) { return createHash('sha256').update(readFileSync(path)).digest('hex'); }
function sourceHashes() {
  const files = ['site/render.html', 'site/css/film.css', 'site/css/fonts.css', 'site/data/clock.json', 'site/data/script.json', 'site/data/fixtures.json',
    ...readdirSync(join(ROOT, 'site/js')).filter(f => ['domain.js', 'board.js', 'timeline.js', 'scene.js'].includes(f)).map(f => `site/js/${f}`),
    ...readdirSync(join(ROOT, 'site/fonts')).filter(f => f.endsWith('.woff2')).map(f => `site/fonts/${f}`)].sort();
  return Object.fromEntries(files.map(f => [f, sha(join(ROOT, f))]));
}
function versions(browser) {
  const ff = spawnSync('ffmpeg', ['-version'], {encoding: 'utf8'}).stdout.split('\n')[0];
  return {node: process.version, playwright: require('playwright/package.json').version, chromium: browser.version(), ffmpeg: ff, platform: `${process.platform}-${process.arch}`};
}

async function openPages(n, url) {
  const browser = await chromium.launch({args: ['--hide-scrollbars', '--disable-background-timer-throttling', '--font-render-hinting=none', '--disable-lcd-text']});
  const errors = [];
  const pages = [];
  for (let i = 0; i < n; i++) {
    const page = await browser.newPage({viewport: {width, height}, deviceScaleFactor: 1});
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
    await page.goto(`${url}render.html?lang=${lang}`, {waitUntil: 'load'});
    await page.waitForFunction(() => window.ready === true || window.renderError, null, {timeout: 60000});
    const err = await page.evaluate(() => window.renderError ?? null);
    if (err) throw new Error(err);
    const pageClock = await page.evaluate(() => window.clock);
    if (Math.abs(pageClock.duration - clock.duration) > 1e-9 || pageClock.segments.length !== clock.segments.length) throw new Error('page clock differs from site/data/clock.json');
    pages.push(page);
  }
  return {browser, pages, errors};
}

async function shoot(page, t, path, type = 'png') {
  await page.evaluate(s => window.renderAt(s), t);
  return page.screenshot({path, type, ...(type === 'jpeg' ? {quality: 95} : {}), clip: {x: 0, y: 0, width, height}});
}

async function stills(url, times, outDir) {
  mkdirSync(outDir, {recursive: true});
  const {browser, pages, errors} = await openPages(1, url);
  try {
    const out = [];
    for (const t of times) {
      const file = join(outDir, `${lang}-${t.toFixed(3).padStart(8, '0')}s.png`);
      await shoot(pages[0], t, file);
      out.push(relative(ROOT, file));
    }
    if (errors.length) throw new Error('Page errors: ' + errors.join('; '));
    console.log(JSON.stringify({stills: out}, null, 1));
  } finally { await browser.close(); }
}

async function encodeRange(url, start, end, output, label) {
  const frames = Math.round((end - start) * fps);
  const tmp = join(ROOT, 'build', 'render-tmp', `${label}-${lang}`);
  rmSync(tmp, {recursive: true, force: true});
  mkdirSync(tmp, {recursive: true});
  const began = Date.now();
  const {browser, pages, errors} = await openPages(Math.max(1, Math.min(workers, frames)), url);
  const env = versions(browser);
  try {
    // Each worker renders an interleaved set of frames; random access makes the order irrelevant.
    let done = 0;
    await Promise.all(pages.map(async (page, w) => {
      for (let i = w; i < frames; i += pages.length) {
        await shoot(page, start + i / fps, join(tmp, `${String(i).padStart(6, '0')}.jpg`), 'jpeg');
        if (++done % (fps * 20) === 0) console.log(`rendered ${done}/${frames} frames`);
      }
    }));
    if (errors.length) throw new Error('Page errors: ' + errors.join('; '));
  } finally { await browser.close(); }
  mkdirSync(dirname(output), {recursive: true});
  const part = output.replace(/\.mp4$/, '.part.mp4');
  const ff = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(fps), '-i', join(tmp, '%06d.jpg'), '-an', '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation',
    '-crf', String(crf), '-pix_fmt', 'yuv420p', '-g', String(fps * 2), '-movflags', '+faststart', '-metadata', `comment=HPWL film ${lang} t=${start}-${end}`, part], {encoding: 'utf8'});
  if (ff.status !== 0) throw new Error('ffmpeg failed: ' + ff.stderr);
  renameSync(part, output);
  const probe = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,nb_read_frames,r_frame_rate,codec_name,pix_fmt:format=duration', '-of', 'json', output], {encoding: 'utf8'}).stdout);
  const st = probe.streams[0];
  if (Number(st.nb_read_frames) !== frames || st.width !== width || st.height !== height) throw new Error(`encoded video mismatch: ${JSON.stringify(probe)}`);
  // Frame map: which cue each frame shows (frame i <-> t = start + i/fps). The web player uses the same rule.
  const cueFrames = clock.segments.filter(s => s.sceneEnd > start && s.start < end).map(s => ({id: s.id,
    firstFrame: Math.max(0, Math.ceil((s.start - start) * fps - 1e-6)), lastFrame: Math.min(frames - 1, Math.ceil((s.sceneEnd - start) * fps - 1e-6) - 1)}));
  const record = {output: relative(ROOT, output), lang, start, end, fps, frames, width, height, crf, codec: st.codec_name, pixFmt: st.pix_fmt,
    durationProbe: Number(probe.format.duration), clockId: clock.id, clockDuration: clock.duration, clockSha256: sha(join(ROOT, 'site/data/clock.json')),
    timeOfFrame: 'start + frameIndex / fps', cueFrames, sources: sourceHashes(), environment: env, mp4Sha256: sha(output), bytes: statSync(output).size,
    wallSeconds: Math.round((Date.now() - began) / 1000), pageErrors: errors};
  writeFileSync(output.replace(/\.mp4$/, '.render.json'), JSON.stringify(record, null, 1));
  rmSync(tmp, {recursive: true, force: true});
  console.log(JSON.stringify({output: record.output, frames, durationProbe: record.durationProbe, wallSeconds: record.wallSeconds, bytes: record.bytes}));
  return record;
}

const srv = await startServer({prefix: '/placement-lab02-hpwl/'});
try {
  if (has('stills')) {
    const list = opt('stills', null);
    const times = list ? list.split(',').map(Number) : clock.segments.map(s => +(((s.start + s.sceneEnd) / 2).toFixed(3)));
    await stills(srv.url, times, join(ROOT, opt('out', 'build/stills')));
  } else if (has('sample')) {
    const a = clock.segments.find(s => s.id === 'extreme_move'), b = clock.segments.find(s => s.id === 'interior_move');
    await encodeRange(srv.url, a.start, b.sceneEnd, join(ROOT, opt('out', `site/media/sample.${lang}.mp4`)), 'sample');
  } else if (has('range')) {
    const i = args.indexOf('--range');
    await encodeRange(srv.url, Number(args[i + 1]), Number(args[i + 2]), join(ROOT, opt('out', 'build/range.mp4')), 'range');
  } else if (has('full')) {
    await encodeRange(srv.url, 0, clock.duration, join(ROOT, opt('out', `site/media/film.${lang}.mp4`)), 'full');
  } else {
    console.log('usage: node scripts/render.mjs --stills [t,...] | --sample | --range a b --out f.mp4 | --full  [--lang zh|en]');
  }
} finally { await srv.close(); }
