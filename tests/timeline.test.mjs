// Timeline: clocks of all four films, random-access determinism, cue boundaries, numbers vs goldens, handoff,
// captions, the music-locked title and the lab walkthrough.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as D from '../site/js/domain.js';
import {stateAt, validateClock, cueIndexAt, labHandoff, frameAt, frameTime} from '../site/js/timeline.js';
import {Scene} from '../site/js/scene.js';

const raw = p => readFileSync(new URL(`../${p}`, import.meta.url));
const read = p => JSON.parse(raw(p));
const fixtures = D.prepareFixtures(read('fixtures/hpwl-fixtures.json'));
const index = read('site/data/films/index.json');
const FILMS = {};
for (const e of index) for (const lang of ['zh', 'en']) {
  const script = read(`site/data/films/${e.id}.json`), clock = read(`site/data/films/${e.id}.clock.${lang}.json`);
  const walk = e.id === 'lab' && existsSync(new URL(`../site/data/walk/${lang}.json`, import.meta.url)) ? read(`site/data/walk/${lang}.json`) : null;
  FILMS[`${e.id}.${lang}`] = {id: e.id, lang, script, clock, walk, at: t => stateAt(t, fixtures, script, clock, {walk})};
}
const F = (id, lang = 'zh') => FILMS[`${id}.${lang}`];
const seg = (f, scene) => {
  const i = f.script.cues.findIndex(c => (c.scene ?? c.id) === scene);
  assert.ok(i >= 0, `${f.id} has no scene ${scene}`);
  return f.clock.segments[i];
};
const end = (f, scene) => f.at(seg(f, scene).sceneEnd - 0.05);

test('index lists the four films in house order, each with a zh and an en version', () => {
  assert.deepEqual(index.map(e => e.id), ['story', 'concise', 'advanced', 'lab']);
  assert.deepEqual(index.map(e => e.kind), ['music', 'voice', 'reading', 'voice']);
  for (const e of index) for (const l of ['zh', 'en']) assert.equal(e.langs[l].clock, `data/films/${e.id}.clock.${l}.json`);
});

test('clocks are contiguous, ordered like their scripts and built from the current source scripts', () => {
  for (const f of Object.values(FILMS)) {
    assert.equal(validateClock(f.clock, f.script, {allowProvisional: true}), true);
    assert.deepEqual(f.script, read(`content/films/${f.id}.json`));
    assert.equal(f.clock.scriptSha256, createHash('sha256').update(raw(`content/films/${f.id}.json`)).digest('hex'));
    assert.deepEqual(f.clock.violations, []);
  }
  // reading and music films share one clock across languages; voice films have one per language
  for (const id of ['story', 'advanced']) assert.deepEqual(F(id, 'zh').clock.segments, F(id, 'en').clock.segments);
  assert.equal(F('story').clock.duration, 189.823);
});

test('voice films are final: every line has a measured take, and zh and en clocks differ', () => {
  for (const id of ['concise', 'lab']) for (const lang of ['zh', 'en']) {
    const c = F(id, lang).clock;
    assert.equal(c.provisional, false, `${id}.${lang} is provisional: voice takes missing`);
    assert.equal(validateClock(c, F(id, lang).script), true);
    for (const s of c.segments) for (const L of s.lines) {
      assert.ok(L.voice && L.voiceDuration > 0, `${id}.${lang} ${s.id}`);
      assert.ok(L.voiceAt >= L.start && L.voiceAt + L.voiceDuration <= L.end + 1e-6, `${id}.${lang} ${s.id}: take overruns its line`);
    }
  }
  assert.notDeepEqual(F('concise', 'zh').clock.segments, F('concise', 'en').clock.segments);
});

test('random access: direct, out-of-order and repeated calls give identical states', () => {
  for (const f of Object.values(FILMS)) {
    const d = f.clock.duration;
    const times = [0, 2, d * 0.13, d * 0.4, d * 0.77, d - 0.01, d];
    const fresh = times.map(t => JSON.stringify(f.at(t)));
    for (const t of [...times].reverse()) f.at(t);
    times.forEach((t, i) => assert.equal(JSON.stringify(f.at(t)), fresh[i], `${f.id}.${f.lang} t=${t}`));
    assert.equal(Scene(f.at(d * 0.4), f.script, {lang: f.lang}), Scene(f.at(d * 0.4), f.script, {lang: f.lang}));
  }
});

test('cue boundaries are half-open and every frame belongs to exactly one cue', () => {
  for (const f of Object.values(FILMS)) {
    const {clock} = f;
    for (let i = 1; i < clock.segments.length; i++) {
      assert.equal(f.at(clock.segments[i].start).cueId, clock.segments[i].id);
      assert.equal(f.at(clock.segments[i].start - 1e-6).cueId, clock.segments[i - 1].id);
    }
    const fps = 30, frames = Math.round(clock.duration * fps);
    let last = -1;
    for (let fr = 0; fr < frames; fr++) {
      const i = cueIndexAt(frameTime(fr, fps), clock);
      assert.ok(i >= last); last = i;
      assert.equal(frameAt(frameTime(fr, fps), fps), fr);
    }
    assert.equal(last, clock.segments.length - 1);
  }
});

test('numbers shown at the end of each motion match the hand-computed goldens', () => {
  for (const lang of ['zh', 'en']) {
    const c = F('concise', lang), a = F('advanced', lang), s = F('story', lang);
    assert.equal(end(c, 'two_manhattan').metrics.total, 7);
    assert.equal(end(c, 'multi_scan').metrics.selected.hpwl, 11);
    const em = end(c, 'extreme_move');
    assert.deepEqual(em.board.positions.Q, {x: 9, y: 0});
    assert.equal(em.metrics.selected.hpwl, 14); assert.equal(em.metrics.total, 18);
    const im = end(c, 'interior_move');
    assert.equal(im.metrics.selected.hpwl, 14); assert.equal(im.metrics.total, 16);
    assert.equal(end(c, 'teacher_starter').metrics.total, 52);
    assert.equal(end(a, 'half_name').clique, 35);
    const ties = end(a, 'ties');
    assert.equal(ties.metrics.total, 52); assert.equal(ties.metrics.nets.find(n => n.id === 'ABCD').hpwl, 16);
    assert.deepEqual(end(a, 'compact').boardsMetrics.map(m => m.total), [52, 14]);
    assert.deepEqual(end(a, 'weights').weightedRows.map(m => m.weightedTotal), [116, 30]);
    const col = end(a, 'collapse');
    assert.equal(col.metrics.total, 0); assert.equal(col.metrics.overlaps.length, 15);
    for (const f of [a, s]) {
      const fx = end(f, 'fixed_anchor');
      assert.equal(fx.metrics.total, 49); assert.equal(fx.metrics.overlaps.length, 0);
      assert.deepEqual(fx.board.positions.A, {x: 0, y: 0}); assert.deepEqual(fx.board.positions.D, {x: 8, y: 8});
    }
    assert.equal(end(s, 'collapse_hold').metrics.total, 0);
    assert.equal(end(s, 'two_manhattan').metrics.total, 7);
  }
});

test('during the extreme move the minimum-y pin switches from P to Q exactly when Q passes y = 1', () => {
  for (const f of [F('concise', 'zh'), F('concise', 'en'), F('story')]) {
    const s = seg(f, 'extreme_move');
    let switched = null;
    for (let t = s.start; t < s.sceneEnd; t += 1 / 30) {
      const st = f.at(t), b = st.metrics.selected;
      assert.equal(b.hpwl, (b.maxX - b.minX) + (b.maxY - b.minY));
      assert.equal(b.minY, Math.min(...b.pins.map(p => st.board.positions[p].y)));
      if (switched === null && b.extremes.minY.includes('Q')) switched = st.board.positions.Q.y;
    }
    assert.ok(switched !== null && switched <= 1 + 1e-9, `${f.id}: switched at ${switched}`);
  }
});

test('interior move: N1 is constant through the whole cue while N2 changes', () => {
  for (const f of [F('concise'), F('story')]) {
    const s = seg(f, 'interior_move');
    const n2 = new Set();
    for (let t = s.start; t < s.sceneEnd; t += 0.1) {
      const st = f.at(t);
      assert.equal(st.metrics.nets.find(n => n.id === 'N1').hpwl, 14);
      n2.add(st.metrics.nets.find(n => n.id === 'N2').hpwl);
    }
    assert.ok(n2.size > 5, `${f.id}: N2 took ${n2.size} values`);
  }
});

test('handoff carries actual interpolated coordinates, mode, net, constraints and the intermediate flag', () => {
  const c = F('concise'), s = seg(c, 'extreme_move');
  let st = null;
  for (let t = s.start; t < s.sceneEnd && !st; t += 0.05) { const x = c.at(t); if (x.intermediate) st = x; }
  assert.ok(st, 'extreme move has intermediate frames');
  const h = labHandoff(st);
  assert.equal(h.intermediate, true);
  assert.deepEqual(h.positions, st.board.positions);
  assert.equal(h.selectedNet, 'N1');
  const a = F('advanced');
  const fx = labHandoff(end(a, 'fixed_anchor'));
  assert.equal(fx.mode, 'fixed'); assert.deepEqual(fx.fixed, ['A', 'D']); assert.equal(fx.footprint, true);
  assert.equal(labHandoff(a.at(seg(a, 'weights').start + 1)).weighted, true);
  const re = D.analyse({...D.makeState(fixtures[h.fixtureId], 'start'), positions: h.positions, selectedNet: h.selectedNet});
  assert.equal(re.total, st.metrics.total);
});

test('captions: every line is shown inside its window and not outside it', () => {
  for (const f of Object.values(FILMS)) {
    for (const s of f.clock.segments) s.lines.forEach((L, i) => {
      const line = f.script.cues.find(c => c.id === s.id).lines[i];
      const st = f.at((L.start + L.end) / 2);
      if (line.zh || line.en) assert.equal(st.caption?.id, `${s.id}-${i + 1}`, `${f.id}.${f.lang} ${s.id}-${i + 1}`);
      else assert.equal(st.caption, null);
    });
    assert.equal(f.at(0.1).caption, null, `${f.id}: lead-in before the first caption`);
  }
});

test('story film: cues sit on the music, and the title assembles one piece per drum hit', () => {
  const f = F('story');
  f.script.cues.forEach((c, i) => { if (i > 0) assert.equal(f.clock.segments[i].start, c.at); });
  const hits = f.clock.track.hits;
  assert.ok(hits.length >= 5 && hits.every(h => h >= f.clock.track.sections.roll - 0.05 && h <= f.clock.track.sections.lock + 0.05));
  const title = seg(f, 'title_story');
  assert.ok(title.start <= hits[0] && title.sceneEnd > hits.at(-1));
  const before = Scene(f.at(hits[1] - 0.02), f.script, {lang: 'zh'}), after = Scene(f.at(hits[1] + 0.02), f.script, {lang: 'zh'});
  assert.notEqual(before, after, 'a drum hit changes the title');
});

test('lab walkthrough: every cue draws a recorded screenshot of the real page, and there is nothing to hand off', () => {
  for (const lang of ['zh', 'en']) {
    const f = F('lab', lang);
    assert.ok(f.walk, `site/data/walk/${lang}.json missing (run node scripts/record-walk.mjs)`);
    for (const s of f.clock.segments) {
      const st = f.at((s.start + s.sceneEnd) / 2);
      assert.equal(st.board, null);
      assert.equal(labHandoff(st), null);
      assert.ok(st.walk?.img.startsWith(`data/walk/${lang}-${s.id}-`), `${lang} ${s.id}`);
      assert.ok(existsSync(new URL(`../site/${st.walk.img}`, import.meta.url)));
      assert.ok(st.walk.cursor.every(Number.isFinite));
    }
  }
});
