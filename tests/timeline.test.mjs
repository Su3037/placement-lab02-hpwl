// Timeline: clock validity, random-access determinism, cue boundaries, numbers vs goldens, handoff content.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as D from '../site/js/domain.js';
import {stateAt, validateClock, cueIndexAt, labHandoff, frameAt, frameTime} from '../site/js/timeline.js';
import {Scene} from '../site/js/scene.js';

const read = p => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url)));
const fixtures = D.prepareFixtures(read('fixtures/hpwl-fixtures.json'));
const script = read('site/data/script.json'), clock = read('site/data/clock.json');
const at = t => stateAt(t, fixtures, script, clock);
const seg = id => clock.segments.find(s => s.id === id);

test('clock is final, contiguous, ordered like the script and matches the source script', () => {
  assert.equal(validateClock(clock, script), true);
  assert.equal(clock.provisional, false);
  assert.deepEqual(read('site/data/script.json'), read('content/script.json'));
  assert.ok(clock.duration > 240 && clock.duration < 360, `duration ${clock.duration}`);
});

test('random access: direct, out-of-order and repeated calls give identical states', () => {
  const times = [0, 2, 12.3, 27, 107.5, 118.2, 140, clock.duration - 0.01, clock.duration];
  const fresh = times.map(t => JSON.stringify(at(t)));
  const order = [27, 2, 12.3, clock.duration, 140, 0, 118.2, 107.5, clock.duration - 0.01];
  for (const t of order) at(t);
  times.forEach((t, i) => assert.equal(JSON.stringify(at(t)), fresh[i], `t=${t}`));
  // Scene markup is deterministic too.
  assert.equal(Scene(at(12.3), script), Scene(at(12.3), script));
});

test('cue boundaries are half-open and every frame belongs to exactly one cue', () => {
  for (let i = 1; i < clock.segments.length; i++) {
    const s = clock.segments[i];
    assert.equal(at(s.start).cueId, s.id);
    assert.equal(at(s.start - 1e-6).cueId, clock.segments[i - 1].id);
  }
  const fps = 30, frames = Math.round(clock.duration * fps);
  let last = -1;
  for (let f = 0; f < frames; f++) {
    const i = cueIndexAt(frameTime(f, fps), clock);
    assert.ok(i >= last); last = i;
    assert.equal(frameAt(frameTime(f, fps), fps), f);
  }
  assert.equal(last, clock.segments.length - 1);
});

test('numbers shown at the end of each motion match the hand-computed goldens', () => {
  const end = id => at(seg(id).sceneEnd - 0.05);
  assert.equal(end('two_h').metrics.total, 5);
  assert.equal(end('two_manhattan').metrics.total, 7);
  assert.equal(end('multi_scan').metrics.selected.hpwl, 11);
  assert.equal(end('half_name').clique, 35);
  const em = end('extreme_move');
  assert.deepEqual(em.board.positions.Q, {x: 9, y: 0});
  assert.equal(em.metrics.selected.hpwl, 14);
  assert.equal(em.metrics.total, 18);
  const im = end('interior_move');
  assert.equal(im.metrics.selected.hpwl, 14);
  assert.equal(im.metrics.total, 16);
  assert.equal(end('teacher_starter').metrics.total, 52);
  const ties = end('ties');
  assert.equal(ties.metrics.total, 52);
  assert.equal(ties.metrics.nets.find(n => n.id === 'ABCD').hpwl, 16);
  const cmp = end('compact');
  assert.deepEqual(cmp.boardsMetrics.map(m => m.total), [52, 14]);
  assert.deepEqual(end('weights').weightedRows.map(m => m.weightedTotal), [116, 30]);
  const col = end('collapse');
  assert.equal(col.metrics.total, 0); assert.equal(col.metrics.overlaps.length, 15);
  const fx = end('fixed_anchor');
  assert.equal(fx.metrics.total, 49); assert.equal(fx.metrics.overlaps.length, 0);
  assert.deepEqual(fx.board.positions.A, {x: 0, y: 0}); assert.deepEqual(fx.board.positions.D, {x: 8, y: 8});
});

test('during the extreme move the minimum-y pin switches from P to Q exactly when Q passes y = 1', () => {
  const s = seg('extreme_move');
  let switched = null;
  for (let t = s.start; t < s.sceneEnd; t += 1 / 30) {
    const st = at(t), b = st.metrics.selected;
    // geometry and arithmetic come from one computation
    assert.equal(b.hpwl, (b.maxX - b.minX) + (b.maxY - b.minY));
    assert.equal(b.minY, Math.min(...b.pins.map(p => st.board.positions[p].y)));
    if (switched === null && b.extremes.minY.includes('Q')) switched = st.board.positions.Q.y;
  }
  assert.ok(switched !== null && switched <= 1 + 1e-9, `switched at ${switched}`);
});

test('interior move: N1 is constant through the whole cue while N2 changes', () => {
  const s = seg('interior_move');
  const n2 = new Set();
  for (let t = s.start; t < s.sceneEnd; t += 0.1) {
    const st = at(t);
    assert.equal(st.metrics.nets.find(n => n.id === 'N1').hpwl, 14);
    n2.add(st.metrics.nets.find(n => n.id === 'N2').hpwl);
  }
  assert.ok(n2.size > 5);
});

test('sample window (extreme + interior move) lasts 30-45 s', () => {
  const d = seg('interior_move').sceneEnd - seg('extreme_move').start;
  assert.ok(d >= 30 && d <= 45, `sample ${d}s`);
});

test('handoff carries actual interpolated coordinates, mode, net, constraints and the intermediate flag', () => {
  const s = seg('extreme_move');
  const L = s.lines[1];
  const t = L.start + 0.3 * (L.end - L.start);
  const st = at(t), h = labHandoff(st);
  assert.equal(h.intermediate, true);
  assert.deepEqual(h.positions, st.board.positions);
  assert.ok(h.positions.Q.y > 0 && h.positions.Q.y < 2);
  assert.equal(h.selectedNet, 'N1');
  const fx = labHandoff(at(seg('fixed_anchor').sceneEnd - 0.05));
  assert.equal(fx.mode, 'fixed'); assert.deepEqual(fx.fixed, ['A', 'D']); assert.equal(fx.footprint, true);
  assert.equal(labHandoff(at(seg('weights').start + 1)).weighted, true);
  // The handed-off state evaluates to the same numbers as the film panel.
  const re = D.analyse({...D.makeState(fixtures[h.fixtureId], 'start'), positions: h.positions, selectedNet: h.selectedNet});
  assert.equal(re.total, st.metrics.total);
});

test('captions: every line is shown inside its window and not outside it', () => {
  for (const s of clock.segments) s.lines.forEach((L, i) => {
    assert.equal(at((L.start + L.end) / 2).caption.id, `${s.id}-${i + 1}`);
  });
  assert.equal(at(0.1).caption, null); // lead-in before the first caption
});
