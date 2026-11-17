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

const index = JSON.parse(readFileSync(join(ROOT, 'site/data/films/index.json')));
const FILMS = index.flatMap(e => ['zh', 'en'].map(lang => ({id: e.id, lang, file: `site/${e.langs[lang].video}`, clockPath: `site/data/films/${e.id}.clock.${lang}.json`})));
for (const f of FILMS) {
  const name = `${f.id}.${f.lang}`;
  const clock = JSON.parse(readFileSync(join(ROOT, f.clockPath)));
  const script = JSON.parse(readFileSync(join(ROOT, `site/data/films/${f.id}.json`)));
  if (!existsSync(join(ROOT, f.file))) { check(`${name} exists`, false, f.file); continue; }
  const meta = JSON.parse(readFileSync(join(ROOT, f.file.replace('.mp4', '.render.json'))));
  const p = probe(join(ROOT, f.file)), s = p.streams[0];
  const expectFrames = Math.round(clock.duration * meta.fps);
  check(`${name}: h264 1920x1080 yuv420p`, s.codec_name === 'h264' && s.width === 1920 && s.height === 1080 && s.pix_fmt === 'yuv420p', JSON.stringify(s));
  check(`${name}: frame count ${expectFrames} = round(clock duration x fps)`, Number(s.nb_read_frames) === expectFrames, s.nb_read_frames);
  check(`${name}: duration matches the clock`, Math.abs(Number(p.format.duration) - clock.duration) <= 1 / meta.fps + 0.03, p.format.duration);
  const dec = sh('ffmpeg', ['-v', 'error', '-i', join(ROOT, f.file), '-f', 'null', '-']);
  check(`${name}: full decode without errors`, dec.status === 0 && !dec.stderr.trim(), dec.stderr);
  check(`${name}: mp4 hash matches render record`, sha(f.file) === meta.mp4Sha256);
  const stale = Object.entries(meta.sources).filter(([x, h]) => !existsSync(join(ROOT, x)) || sha(x) !== h).map(([x]) => x);
  check(`${name}: rendered from the current sources`, stale.length === 0, stale.join(', '));
  check(`${name}: rendered from the current clock (${clock.kind})`, meta.clockSha256 === sha(f.clockPath) && meta.clockKind === clock.kind);
  // audio: present, the expected kind, and not silent
  const a = JSON.parse(sh('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_name,channels,sample_rate', '-of', 'json', join(ROOT, f.file)]).stdout).streams[0];
  const want = {music: 'music', voice: 'voice+score', reading: 'score'}[clock.kind];
  check(`${name}: AAC stereo soundtrack (${want})`, a?.codec_name === 'aac' && a.channels === 2 && meta.audio?.audio === want, JSON.stringify({a, audio: meta.audio?.audio}));
  const vol = /mean_volume: (-?[\d.]+) dB/.exec(sh('ffmpeg', ['-v', 'info', '-i', join(ROOT, f.file), '-map', '0:a', '-af', 'volumedetect', '-f', 'null', '-']).stderr);
  check(`${name}: soundtrack is audible`, vol && Number(vol[1]) > -45, vol?.[1]);
  if (clock.kind === 'voice') {
    const lines = clock.segments.reduce((n, sg) => n + sg.lines.length, 0);
    check(`${name}: every caption line has its voice take in the mix`, meta.audio.takes === lines, `${meta.audio.takes} / ${lines}`);
  }
  for (const [kind, path] of [['captions', `site/media/${f.id}.${f.lang}.vtt`], ['chapters', `site/media/${f.id}.chapters.${f.lang}.vtt`]]) {
    const v = vtt(join(ROOT, path), clock.duration);
    const ids = kind === 'chapters' ? clock.segments.map(sg => sg.id) : clock.segments.flatMap((sg, ci) => sg.lines.map((_, i) => `${sg.id}-${i + 1}`).filter((_, i) => script.cues[ci].lines[i][f.lang]));
    check(`${name} ${kind}: valid, ordered, inside the film, ids match the clock`, v.ok && v.cues.length === ids.length && v.cues.every((c, i) => c.id === ids[i]), v.why ?? `${v.cues?.length} vs ${ids.length}`);
  }
}

// Decoded frames vs a fresh renderAt() at the same t, for every film and language
{
  const tmp = join(ROOT, 'build/media-check'); mkdirSync(tmp, {recursive: true});
  const srv = await startServer({prefix: '/placement-lab02-hpwl/'});
  const browser = await chromium.launch({args: ['--hide-scrollbars', '--font-render-hinting=none', '--disable-lcd-text']});
  const fps = 30;
  const grab = (file, f, out) => sh('ffmpeg', ['-v', 'error', '-y', '-i', join(ROOT, file), '-vf', `select=eq(n\\,${f})`, '-vsync', '0', '-frames:v', '1', out]);
  for (const film of FILMS.filter(x => existsSync(join(ROOT, x.file)))) {
    const clock = JSON.parse(readFileSync(join(ROOT, film.clockPath)));
    const page = await browser.newPage({viewport: {width: 1920, height: 1080}, deviceScaleFactor: 1});
    await page.goto(`${srv.url}render.html?film=${film.id}&lang=${film.lang}`); await page.waitForFunction(() => window.ready === true || window.renderError);
    const last = Math.round(clock.duration * fps) - 1;
    const frames = [0, ...clock.segments.slice(1, 4).map(sg => Math.round(sg.start * fps)), Math.round(last * 0.37), Math.round(last * 0.71), last];
    for (const f of frames) {
      const ref = join(tmp, `${film.id}.${film.lang}-render-${f}.png`), dec = join(tmp, `${film.id}.${film.lang}-decoded-${f}.png`);
      await page.evaluate(t => window.renderAt(t), f / fps);
      await page.screenshot({path: ref, clip: {x: 0, y: 0, width: 1920, height: 1080}});
      grab(film.file, f, dec);
      const db = psnr(ref, dec);
      check(`${film.id}.${film.lang} frame ${f} (t=${(f / fps).toFixed(3)}) matches renderAt(t)`, db >= 32, `PSNR ${db.toFixed ? db.toFixed(1) : db} dB`);
    }
    if (film.id === 'story' && film.lang === 'zh') {
      // frame map: during a motion, frame f matches t = f/fps better than t = (f+6)/fps
      const script = JSON.parse(readFileSync(join(ROOT, 'site/data/films/story.json')));
      const sg = clock.segments[script.cues.findIndex(c => c.scene === 'extreme_move')];
      const fm = Math.round((sg.start + (sg.sceneEnd - sg.start) * 0.5) * fps);
      grab(film.file, fm, join(tmp, 'decoded-shift.png'));
      const at = async t => { await page.evaluate(t => window.renderAt(t), t); await page.screenshot({path: join(tmp, 'render-x.png'), clip: {x: 0, y: 0, width: 1920, height: 1080}}); return psnr(join(tmp, 'render-x.png'), join(tmp, 'decoded-shift.png')); };
      const same = await at(fm / fps), off = await at((fm + 6) / fps);
      check('frame map is exact: frame f matches t=f/fps better than t=(f+6)/fps during motion', same > off, `same ${same.toFixed(1)} dB vs shifted ${off.toFixed(1)} dB`);
    }
    await page.close();
  }
  await browser.close(); await srv.close();
}

// Slides
for (const lang of ['zh', 'en']) {
  const r = sh('python3', ['-c', `import pypdf;r=pypdf.PdfReader('site/slides/hpwl-slides.${lang}.pdf');print(len(r.pages));print('|'.join(p.extract_text() for p in r.pages))`]);
  const [n, text] = [Number(r.stdout.split('\n')[0]), r.stdout.split('\n').slice(1).join('\n')];
  const deck = JSON.parse(readFileSync(join(ROOT, 'content/slides.json'))).slides.length;
  const numbered = Array.from({length: deck}, (_, i) => text.includes(`p${i + 1}/${deck}`)).every(Boolean);
  check(`slides ${lang}: ${deck} PDF pages with visible page numbers`, n === deck && numbered, `${n} pages`);
}
mkdirSync(join(ROOT, 'build'), {recursive: true});
const passed = results.filter(r => r.ok).length;
writeFileSync(join(ROOT, 'build/media-report.json'), JSON.stringify({passed, total: results.length, results}, null, 1));
console.log(`\n${passed}/${results.length} media checks passed`);
process.exit(passed === results.length ? 0 : 1);
