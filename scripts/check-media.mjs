// Media checks on the ENCODED files (not just the source):
//  - ffprobe: codec, size, frame count = round(clock.duration * fps), duration
//  - full decode with ffmpeg (no errors)
//  - WebVTT: parse, ordered, inside [0, duration], ids match the clock lines
//  - decoded MP4 frames vs a fresh renderAt() of the same t (PSNR >= 32 dB) at cue boundaries and mid-motion
//  - render.json source hashes still match the files (the movie was rendered from this source)
//  - slides PDF page count and visible page numbers
//   node scripts/check-media.mjs        -> build/media-report.json
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {startServer} from './serve.mjs';

const require = createRequire(import.meta.url);
const {chromium} = require('playwright');
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const clock = JSON.parse(readFileSync(join(ROOT, 'site/data/clock.json')));
const results = [];
const check = (name, ok, detail = '') => { results.push({name, ok: Boolean(ok), detail: String(detail).slice(0, 400)}); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + String(detail).slice(0, 200) : ''}`); };
const sh = (cmd, args) => spawnSync(cmd, args, {encoding: 'utf8', maxBuffer: 1 << 26});
const sha = p => createHash('sha256').update(readFileSync(join(ROOT, p))).digest('hex');

function probe(file) {
  const r = sh('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,width,height,nb_read_frames,r_frame_rate,pix_fmt:format=duration', '-of', 'json', file]);
  return JSON.parse(r.stdout);
}
function vtt(file, duration) {
  const text = readFileSync(file, 'utf8');
  if (!text.startsWith('WEBVTT')) return {ok: false, why: 'header'};
  const cues = [...text.matchAll(/^(\S+)\n(\d\d):(\d\d):(\d\d)\.(\d{3}) --> (\d\d):(\d\d):(\d\d)\.(\d{3})\n(.+)$/gm)].map(m => ({id: m[1], a: +m[2] * 3600 + +m[3] * 60 + +m[4] + m[5] / 1000, b: +m[6] * 3600 + +m[7] * 60 + +m[8] + m[9] / 1000, text: m[10]}));
  let prev = 0;
  for (const c of cues) { if (!(c.a >= prev - 1e-9 && c.b > c.a && c.b <= duration + 1e-9 && c.text.trim())) return {ok: false, why: `cue ${c.id}`}; prev = c.b; }
  return {ok: true, cues};
}
function psnr(a, b) {
  const r = sh('ffmpeg', ['-v', 'info', '-i', a, '-i', b, '-lavfi', 'psnr', '-f', 'null', '-']);
  const m = /average:([\d.]+|inf)/.exec(r.stderr);
  return m ? (m[1] === 'inf' ? Infinity : Number(m[1])) : NaN;
}

for (const [name, file] of [['film', 'site/media/film.zh.mp4'], ['sample', 'site/media/sample.zh.mp4']]) {
  if (!existsSync(join(ROOT, file))) { check(`${name} exists`, false, file); continue; }
  const meta = JSON.parse(readFileSync(join(ROOT, file.replace('.mp4', '.render.json'))));
  const p = probe(join(ROOT, file)), s = p.streams[0];
  const expectFrames = Math.round((meta.end - meta.start) * meta.fps);
  check(`${name}: h264 1920x1080 yuv420p`, s.codec_name === 'h264' && s.width === 1920 && s.height === 1080 && s.pix_fmt === 'yuv420p', JSON.stringify(s));
  check(`${name}: frame count ${expectFrames}`, Number(s.nb_read_frames) === expectFrames, s.nb_read_frames);
  check(`${name}: duration matches clock window`, Math.abs(Number(p.format.duration) - (meta.end - meta.start)) <= 1 / meta.fps + 1e-3, p.format.duration);
  const dec = sh('ffmpeg', ['-v', 'error', '-i', join(ROOT, file), '-f', 'null', '-']);
  check(`${name}: full decode without errors`, dec.status === 0 && !dec.stderr.trim(), dec.stderr);
  check(`${name}: mp4 hash matches render record`, sha(file) === meta.mp4Sha256);
  const stale = Object.entries(meta.sources).filter(([f, h]) => !existsSync(join(ROOT, f)) || sha(f) !== h).map(([f]) => f);
  check(`${name}: rendered from the current sources`, stale.length === 0, stale.join(', '));
  if (name === 'film') check('film: clock is the current clock', meta.clockSha256 === sha('site/data/clock.json'));
}
for (const lang of ['zh', 'en']) {
  const v = vtt(join(ROOT, `site/media/film.${lang}.vtt`), clock.duration);
  const ids = clock.segments.flatMap(s => s.lines.map((_, i) => `${s.id}-${i + 1}`));
  check(`captions ${lang}: valid, ordered, inside the film`, v.ok && v.cues.length === ids.length && v.cues.every((c, i) => c.id === ids[i]), v.why);
}

// Decoded frames vs fresh renderAt() at the same t
if (existsSync(join(ROOT, 'site/media/film.zh.mp4'))) {
  const tmp = join(ROOT, 'build/media-check'); mkdirSync(tmp, {recursive: true});
  const srv = await startServer({prefix: '/placement-lab02-hpwl/'});
  const browser = await chromium.launch({args: ['--hide-scrollbars', '--font-render-hinting=none', '--disable-lcd-text']});
  const page = await browser.newPage({viewport: {width: 1920, height: 1080}, deviceScaleFactor: 1});
  await page.goto(`${srv.url}render.html`); await page.waitForFunction(() => window.ready === true);
  const fps = 30;
  const seg = id => clock.segments.find(s => s.id === id);
  const frames = [0, Math.round(seg('extreme_move').start * fps), Math.round((seg('extreme_move').lines[1].start + 1.5) * fps), Math.round(seg('interior_move').start * fps) - 1,
    Math.round((seg('collapse').lines[0].start + 2) * fps), Math.round(seg('fixed_anchor').sceneEnd * fps) - 1, Math.round(clock.duration * fps) - 1];
  for (const f of frames) {
    const t = f / fps;
    const ref = join(tmp, `render-${f}.png`), dec = join(tmp, `decoded-${f}.png`);
    await page.evaluate(t => window.renderAt(t), t);
    await page.screenshot({path: ref, clip: {x: 0, y: 0, width: 1920, height: 1080}});
    sh('ffmpeg', ['-v', 'error', '-y', '-i', join(ROOT, 'site/media/film.zh.mp4'), '-vf', `select=eq(n\\,${f})`, '-vsync', '0', '-frames:v', '1', dec]);
    const db = psnr(ref, dec);
    check(`film frame ${f} (t=${t.toFixed(3)}) matches renderAt(t)`, db >= 32, `PSNR ${db.toFixed ? db.toFixed(1) : db} dB`);
    // and a neighbouring t must differ during motion (guards against an off-by-one frame map)
  }
  const fm = Math.round((seg('extreme_move').lines[0].start + 2) * fps);
  await page.evaluate(t => window.renderAt(t), (fm + 6) / fps);
  await page.screenshot({path: join(tmp, 'render-shift.png'), clip: {x: 0, y: 0, width: 1920, height: 1080}});
  sh('ffmpeg', ['-v', 'error', '-y', '-i', join(ROOT, 'site/media/film.zh.mp4'), '-vf', `select=eq(n\\,${fm})`, '-vsync', '0', '-frames:v', '1', join(tmp, 'decoded-shift.png')]);
  const off = psnr(join(tmp, 'render-shift.png'), join(tmp, 'decoded-shift.png'));
  const same = await (async () => { await page.evaluate(t => window.renderAt(t), fm / fps); await page.screenshot({path: join(tmp, 'render-same.png'), clip: {x: 0, y: 0, width: 1920, height: 1080}}); return psnr(join(tmp, 'render-same.png'), join(tmp, 'decoded-shift.png')); })();
  check('frame map is exact: frame f matches t=f/fps better than t=(f+6)/fps during motion', same > off, `same ${same.toFixed(1)} dB vs shifted ${off.toFixed(1)} dB`);
  await browser.close(); await srv.close();
}

// Slides
for (const lang of ['zh', 'en']) {
  const r = sh('python3', ['-c', `import pypdf;r=pypdf.PdfReader('site/slides/hpwl-slides.${lang}.pdf');print(len(r.pages));print('|'.join(p.extract_text() for p in r.pages))`]);
  const [n, text] = [Number(r.stdout.split('\n')[0]), r.stdout.split('\n').slice(1).join('\n')];
  const deck = JSON.parse(readFileSync(join(ROOT, 'content/slides.json'))).slides.length;
  const numbered = Array.from({length: deck}, (_, i) => text.includes(`${i + 1} / ${deck}`)).every(Boolean);
  check(`slides ${lang}: ${deck} PDF pages with visible page numbers`, n === deck && numbered, `${n} pages`);
}
mkdirSync(join(ROOT, 'build'), {recursive: true});
const passed = results.filter(r => r.ok).length;
writeFileSync(join(ROOT, 'build/media-report.json'), JSON.stringify({passed, total: results.length, results}, null, 1));
console.log(`\n${passed}/${results.length} media checks passed`);
process.exit(passed === results.length ? 0 : 1);
