// Build every film's final clock, captions, chapters and transcript from content/films/*.json.
//   node scripts/build-films.mjs            (fails if a voiced film has no measured voice takes)
//   node scripts/build-films.mjs --draft    (voiced films without takes get a provisional reading-time clock;
//                                            the renderer and validateClock refuse provisional clocks)
//
// Three clock kinds (decision log D-07, D-19, D-20):
//   reading  silent film: each caption line lasts long enough to read in BOTH languages (house rule):
//            zh = 0.8 s + w / 4.5 (w = CJK chars + 0.5 x other visible chars), en = 0.8 s + c / 15,
//            line = max(zh, en, hold, 2.0). One clock serves both language versions.
//   music    popular film cut to a recorded track: each cue starts at its `at` time (seconds into the track);
//            its lines follow the reading rule and must end before the next cue starts (violations fail the build).
//   voice    narrated film: one clock PER LANGUAGE. Each line lasts the MEASURED duration of its voice take
//            (media-source/voice/<film>-<cue>-<n>-<lang>.m4a, measured with ffprobe) + a pause, or its hold.
// Outputs: site/data/films/index.json, site/data/films/<id>.json, site/data/films/<id>.clock.<lang>.json,
//          site/media/<id>.<lang>.vtt, site/media/<id>.chapters.<lang>.vtt, media-source/transcripts/<id>.<lang>.md
import {readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const ROOT = new URL('../', import.meta.url);
const P = rel => new URL(rel, ROOT);
const DRAFT = process.argv.includes('--draft');
export const RULE = {zhBase: 0.8, zhRate: 4.5, enBase: 0.8, enRate: 15, minLine: 2.0, tail: 0.8, lastTail: 2.5, lead: 0.6};
export const VOICE = {pause: 0.55, offset: 0.2, minLine: 1.6};
export const ORDER = ['story', 'concise', 'advanced', 'lab'];

const visible = s => [...s].filter(ch => !/\s/.test(ch));
const cjk = ch => /[　-〿㐀-鿿＀-￯—…“”]/.test(ch);
export const zhSeconds = s => RULE.zhBase + visible(s).reduce((a, ch) => a + (cjk(ch) ? 1 : 0.5), 0) / RULE.zhRate;
export const enSeconds = s => RULE.enBase + visible(s).length / RULE.enRate;
export const readingSeconds = line => (line.zh || line.en) ? Math.max(zhSeconds(line.zh), enSeconds(line.en), line.hold ?? 0, RULE.minLine) : (line.hold ?? RULE.minLine);
const r3 = v => Math.round(v * 1000) / 1000;
const sha = buf => createHash('sha256').update(buf).digest('hex');

function probe(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], {encoding: 'utf8'});
  const d = Number(out.trim());
  if (!(d > 0)) throw new Error(`bad duration for ${file}`);
  return d;
}

function readingClock(film) {
  let t = RULE.lead;
  const segments = film.cues.map((cue, ci) => {
    const start = r3(t);
    const lines = cue.lines.map(line => { const d = readingSeconds(line); const o = {start: r3(t), end: r3(t + d)}; t += d; return o; });
    const end = r3(t);
    t += ci === film.cues.length - 1 ? RULE.lastTail : RULE.tail;
    return {id: cue.id, chapter: cue.chapter, start: ci === 0 ? 0 : start, end, sceneEnd: r3(t), lines};
  });
  for (let i = 0; i < segments.length - 1; i++) segments[i].sceneEnd = segments[i + 1].start;
  return {kind: 'reading', rule: RULE, duration: r3(t), segments, violations: []};
}

function musicClock(film) {
  const track = JSON.parse(readFileSync(P(`content/music/${film.music}.json`)));
  const violations = [];
  const segments = film.cues.map((cue, ci) => {
    const start = ci === 0 ? 0 : cue.at;
    const next = ci + 1 < film.cues.length ? film.cues[ci + 1].at : track.duration;
    let t = start + (ci === 0 ? 0.4 : 0.3);
    const lines = cue.lines.map(line => { const d = readingSeconds(line); const o = {start: r3(t), end: r3(t + d)}; t += d; return o; });
    if (t > next - 0.15) violations.push(`${cue.id}: lines need ${(t - start).toFixed(2)} s but the cue has ${(next - start).toFixed(2)} s`);
    return {id: cue.id, chapter: cue.chapter, start: r3(start), end: r3(Math.min(t, next)), sceneEnd: r3(next), lines};
  });
  return {kind: 'music', music: film.music, rule: RULE, duration: r3(track.duration), segments, violations,
    track: {title: track.track, artist: track.artist, sections: track.sections,
      // strong onsets inside the drum roll: the title assembles one piece per hit (music-locked, still a pure function of t)
      hits: track.onsets.filter(([time, strength]) => time >= track.sections.roll - 0.05 && time <= track.sections.lock + 0.05 && strength >= 0.8 * Math.max(...track.onsets.filter(o => o[0] >= track.sections.roll - 0.05 && o[0] <= track.sections.lock + 0.05).map(o => o[1]))).map(o => o[0])}};
}

function voiceClock(film, lang, takes) {
  let t = RULE.lead;
  const segments = film.cues.map((cue, ci) => {
    const start = r3(t);
    const lines = cue.lines.map((line, li) => {
      const take = takes[`${film.id}-${cue.id}-${li + 1}-${lang}`];
      const d = take ? Math.max(take.duration + VOICE.pause, line.hold ?? 0, VOICE.minLine) : readingSeconds(line);
      const o = {start: r3(t), end: r3(t + d)};
      if (take) Object.assign(o, {voice: take.file, voiceAt: r3(t + VOICE.offset), voiceDuration: r3(take.duration)});
      t += d;
      return o;
    });
    const end = r3(t);
    t += ci === film.cues.length - 1 ? RULE.lastTail : RULE.tail;
    return {id: cue.id, chapter: cue.chapter, start: ci === 0 ? 0 : start, end, sceneEnd: r3(t), lines};
  });
  for (let i = 0; i < segments.length - 1; i++) segments[i].sceneEnd = segments[i + 1].start;
  return {kind: 'voice', lang, rule: {...VOICE, lead: RULE.lead, tail: RULE.tail, lastTail: RULE.lastTail}, duration: r3(t), segments, violations: []};
}

function loadTakes() {
  const dir = P('media-source/voice/');
  const takes = {};
  if (!existsSync(dir)) return {takes, voices: null};
  for (const f of readdirSync(dir).sort()) {
    if (!f.endsWith('.m4a')) continue;
    const path = new URL(f, dir);
    takes[f.replace(/\.m4a$/, '')] = {file: `media-source/voice/${f}`, duration: probe(path.pathname), sha256: sha(readFileSync(path))};
  }
  const vj = new URL('voices.json', dir);
  return {takes, voices: existsSync(vj) ? JSON.parse(readFileSync(vj)) : null};
}

const ts = s => { const ms = Math.round(s * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`; };
function vtt(film, clock, lang) {
  let out = 'WEBVTT\n\n';
  film.cues.forEach((cue, ci) => cue.lines.forEach((line, li) => {
    if (!line[lang]) return;
    const L = clock.segments[ci].lines[li];
    out += `${cue.id}-${li + 1}\n${ts(L.start)} --> ${ts(L.end)}\n${line[lang]}\n\n`;
  }));
  return out;
}
function chaptersVtt(film, clock, lang) {
  let out = 'WEBVTT\n\n';
  clock.segments.forEach((s, i) => { out += `${s.id}\n${ts(s.start)} --> ${ts(s.sceneEnd)}\n${film.chapters[s.chapter][lang]} · ${film.cues[i].title[lang]}\n\n`; });
  return out;
}
function transcript(film, clock, lang) {
  const head = {zh: {reading: '无旁白影片的字幕文字稿。', music: '配乐影片（无旁白）的字幕文字稿。', voice: '旁白文字稿（与配音一致）。'},
    en: {reading: 'Caption transcript of the silent film.', music: 'Caption transcript of the music-cut film (no narration).', voice: 'Narration transcript (matches the voice-over).'}}[lang][film.kind];
  let out = `# ${film.title[lang]}\n\n${head} ${lang === 'zh' ? '时间与' : 'Times match'} site/data/films/${film.id}.clock.${lang}.json.\n`;
  let chapter = null;
  film.cues.forEach((cue, ci) => {
    if (cue.chapter !== chapter) { chapter = cue.chapter; out += `\n## ${film.chapters[cue.chapter][lang]}\n`; }
    out += `\n### ${cue.title[lang]} \`${cue.id}\` (${ts(clock.segments[ci].start)})\n\n`;
    cue.lines.forEach(line => { if (line[lang]) out += `- ${line[lang]}\n`; });
  });
  return out;
}

const {takes, voices} = loadTakes();
for (const d of ['site/data/films/', 'site/media/', 'media-source/transcripts/']) mkdirSync(P(d), {recursive: true});
const index = [];
const problems = [];
for (const id of ORDER) {
  const raw = readFileSync(P(`content/films/${id}.json`));
  const film = JSON.parse(raw);
  const scriptSha256 = sha(raw);
  writeFileSync(P(`site/data/films/${id}.json`), JSON.stringify(film, null, 1));
  const entry = {id, kind: film.kind, title: film.title, langs: {}};
  for (const lang of ['zh', 'en']) {
    let clock;
    if (film.kind === 'reading') clock = readingClock(film);
    else if (film.kind === 'music') clock = musicClock(film);
    else {
      clock = voiceClock(film, lang, takes);
      const missing = film.cues.flatMap(c => c.lines.map((_, li) => `${id}-${c.id}-${li + 1}-${lang}`)).filter(k => !takes[k]);
      if (missing.length) {
        if (!DRAFT) problems.push(`${id}.${lang}: ${missing.length} voice takes missing (render them with scripts/voice/render-voice-mac.sh)`);
        clock.provisional = true;
        clock.missingTakes = missing.length;
      } else clock.voices = voices;
    }
    clock = {id: `${id}.${lang}`, film: id, lang, provisional: Boolean(clock.provisional), scriptSha256, ...clock};
    if (clock.violations.length) problems.push(...clock.violations.map(v => `${id}: ${v}`));
    writeFileSync(P(`site/data/films/${id}.clock.${lang}.json`), JSON.stringify(clock, null, 1));
    writeFileSync(P(`site/media/${id}.${lang}.vtt`), vtt(film, clock, lang));
    writeFileSync(P(`site/media/${id}.chapters.${lang}.vtt`), chaptersVtt(film, clock, lang));
    writeFileSync(P(`media-source/transcripts/${id}.${lang}.md`), transcript(film, clock, lang));
    entry.langs[lang] = {clock: `data/films/${id}.clock.${lang}.json`, video: `media/${id}.${lang}.mp4`, poster: `media/${id}.${lang}.jpg`,
      vtt: `media/${id}.${lang}.vtt`, chapters: `media/${id}.chapters.${lang}.vtt`, duration: clock.duration, provisional: clock.provisional};
  }
  index.push(entry);
  console.log(`${id}: ${film.kind}, zh ${entry.langs.zh.duration} s, en ${entry.langs.en.duration} s${entry.langs.zh.provisional ? ' (provisional)' : ''}`);
}
writeFileSync(P('site/data/films/index.json'), JSON.stringify(index, null, 1));
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
