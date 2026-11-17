// Build the final silent-film clock and captions from content/script.json.
//   node scripts/build-clock.mjs
// Outputs: site/data/script.json, site/data/clock.json, site/media/film.zh.vtt, site/media/film.en.vtt,
//          media-source/transcript.zh.md, media-source/transcript.en.md
//
// Reading-time rule (documented in docs/decision-log.md, D-07). There is no narration, so each caption line
// lasts long enough to be read in BOTH languages and to let its animation finish:
//   zh = 1.0 s + w / 5.0,   w = CJK characters + 0.5 x other visible characters
//   en = 0.8 s + c / 15,    c = visible characters
//   line = max(zh, en, hold, 2.0)   (hold = the animation's minimum, from the script)
// Each cue adds TAIL seconds after its last line so the final picture can be read without a caption change.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';

const ROOT = new URL('../', import.meta.url);
const script = JSON.parse(readFileSync(new URL('content/script.json', ROOT)));
export const RULE = {zhBase: 1.0, zhRate: 5.0, enBase: 0.8, enRate: 15, minLine: 2.0, tail: 0.8, lastTail: 2.5, lead: 0.6};

const visible = s => [...s].filter(ch => !/\s/.test(ch));
const cjk = ch => /[　-〿㐀-鿿＀-￯—…“”]/.test(ch);
export function zhSeconds(s) { const v = visible(s); const w = v.reduce((a, ch) => a + (cjk(ch) ? 1 : 0.5), 0); return RULE.zhBase + w / RULE.zhRate; }
export function enSeconds(s) { return RULE.enBase + visible(s).length / RULE.enRate; }
const r3 = v => Math.round(v * 1000) / 1000;

let t = RULE.lead;
const segments = [];
script.cues.forEach((cue, ci) => {
  const start = r3(t);
  const lines = cue.lines.map(line => {
    const d = Math.max(zhSeconds(line.zh), enSeconds(line.en), line.hold ?? 0, RULE.minLine);
    const out = {start: r3(t), end: r3(t + d), basis: {zh: r3(zhSeconds(line.zh)), en: r3(enSeconds(line.en)), hold: line.hold ?? 0}};
    t += d;
    return out;
  });
  const end = r3(t);
  t += ci === script.cues.length - 1 ? RULE.lastTail : RULE.tail;
  segments.push({id: cue.id, chapter: cue.chapter, start: ci === 0 ? 0 : start, end, sceneEnd: r3(t), lines});
});
// Picture windows are contiguous: each cue's picture runs until the next cue starts.
for (let i = 0; i < segments.length - 1; i++) segments[i].sceneEnd = segments[i + 1].start;
const duration = r3(t);
const scriptHash = createHash('sha256').update(readFileSync(new URL('content/script.json', ROOT))).digest('hex');
const clock = {id: 'zh-silent', provisional: false, kind: 'silent-reading-time', rule: RULE, scriptSha256: scriptHash, duration, segments};

const ts = s => { const ms = Math.round(s * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`; };
function vtt(lang) {
  let out = 'WEBVTT\n\n';
  script.cues.forEach((cue, ci) => cue.lines.forEach((line, li) => {
    const L = segments[ci].lines[li];
    out += `${cue.id}-${li + 1}\n${ts(L.start)} --> ${ts(L.end)}\n${line[lang]}\n\n`;
  }));
  return out;
}
function chaptersVtt(lang) {
  let out = 'WEBVTT\n\n';
  segments.forEach((s, i) => { out += `${s.id}\n${ts(s.start)} --> ${ts(s.sceneEnd)}\n${script.chapters[s.chapter][lang]} · ${script.cues[i].title[lang]}\n\n`; });
  return out;
}
function transcript(lang) {
  let out = `# ${script.title[lang]}\n\n${lang === 'zh' ? '无旁白影片的字幕文字稿。时间与 site/data/clock.json 一致。' : 'Caption transcript of the silent film. Times match site/data/clock.json.'}\n`;
  let chapter = null;
  script.cues.forEach((cue, ci) => {
    if (cue.chapter !== chapter) { chapter = cue.chapter; out += `\n## ${cue.chapter} · ${script.chapters[cue.chapter][lang]}\n`; }
    out += `\n### ${cue.title[lang]} \`${cue.id}\` (${ts(segments[ci].start)})\n\n`;
    cue.lines.forEach(line => { out += `- ${line[lang]}\n`; });
  });
  return out;
}
mkdirSync(new URL('site/data/', ROOT), {recursive: true});
mkdirSync(new URL('site/media/', ROOT), {recursive: true});
mkdirSync(new URL('media-source/', ROOT), {recursive: true});
writeFileSync(new URL('site/data/script.json', ROOT), JSON.stringify(script, null, 1));
writeFileSync(new URL('site/data/clock.json', ROOT), JSON.stringify(clock, null, 1));
for (const lang of ['zh', 'en']) {
  writeFileSync(new URL(`site/media/film.${lang}.vtt`, ROOT), vtt(lang));
  writeFileSync(new URL(`site/media/chapters.${lang}.vtt`, ROOT), chaptersVtt(lang));
  writeFileSync(new URL(`media-source/transcript.${lang}.md`, ROOT), transcript(lang));
}
console.log(JSON.stringify({duration, cues: segments.length, lines: segments.reduce((a, s) => a + s.lines.length, 0)}));
