// Behavioural tests of the HPWL domain against hand-computed goldens in fixtures/hpwl-fixtures.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as D from '../site/js/domain.js';

const JSON_FIX = JSON.parse(readFileSync(new URL('../fixtures/hpwl-fixtures.json', import.meta.url)));
const FX = D.prepareFixtures(JSON_FIX);
const G = JSON_FIX.goldens;
const T = FX.teacher;

test('every golden placement matches the hand-computed per-net values and totals', () => {
  for (const [key, golden] of Object.entries(G)) {
    if (!golden.perNet) continue;
    const [fid, pname] = key.split('.');
    const f = FX[fid];
    const ev = D.evaluate(f.nets, f.placements[pname]);
    assert.deepEqual(ev.nets.map(n => n.hpwl), golden.perNet, key);
    assert.equal(ev.total, golden.total, key);
    if ('weighted' in golden) assert.equal(ev.weightedTotal, golden.weighted, key);
  }
});

test('teacher goldens: 52 and 14, weighted 116 and 30, drop 38', () => {
  const s = D.evaluate(T.nets, T.placements.starter), c = D.evaluate(T.nets, T.placements.compact);
  assert.equal(s.total, 52); assert.equal(c.total, 14);
  assert.equal(s.weightedTotal, 116); assert.equal(c.weightedTotal, 30);
  assert.equal(s.total - c.total, 38);
  // Hyperedge ABCD is ONE net: its contribution is 16, not a clique sum.
  assert.equal(D.hpwl(T.nets[4], T.placements.starter), 16);
  assert.equal(D.cliqueSum(T.nets[4], T.placements.starter), 8 + 8 + 16 + 16 + 8 + 8);
});

test('the compact reference moves the fixed pads A and D (not a fixed-anchor trajectory)', () => {
  for (const c of T.fixed) assert.notDeepEqual(T.placements.starter[c], T.placements.compact[c]);
});

test('names: half perimeter, not full perimeter / Euclidean / clique', () => {
  const m = FX.multi, p = m.placements.start, n1 = m.nets[0];
  const b = D.netBox(n1, p);
  assert.equal(b.width, 6); assert.equal(b.height, 5); assert.equal(b.hpwl, 11);
  assert.equal(D.fullPerimeter(n1, p), 22);
  assert.equal(D.cliqueSum(n1, p), G['multi.start'].N1.cliqueSum);
  const mm = FX.two_pin_manhattan.placements.start;
  assert.equal(D.hpwl(['P', 'Q'], mm), 7);
  assert.equal(D.euclidean(mm.P, mm.Q), 5);
});

test('validation: unknown ids, missing / non-finite coordinates, empty nets and netlists are errors', () => {
  const pos = {A: {x: 0, y: 0}, B: {x: 1, y: 2}};
  const code = fn => { try { fn(); } catch (e) { return e.code; } return 'NO_ERROR'; };
  assert.equal(code(() => D.evaluate([['A', 'Z']], pos)), 'UNKNOWN_PIN');
  assert.equal(code(() => D.evaluate([['A', 'B']], {A: {x: 0, y: 0}, B: {x: NaN, y: 0}})), 'BAD_COORDINATE');
  assert.equal(code(() => D.evaluate([['A', 'B']], {A: {x: 0, y: 0}, B: {x: Infinity, y: 0}})), 'BAD_COORDINATE');
  assert.equal(code(() => D.evaluate([['A', 'B']], {A: {x: 0, y: 0}, B: {x: 1}})), 'BAD_COORDINATE');
  assert.equal(code(() => D.evaluate([['A', 'B']], {A: {x: 0, y: 0}, B: {x: '1', y: 0}})), 'BAD_COORDINATE');
  assert.equal(code(() => D.evaluate([[]], pos)), 'EMPTY_NET');
  assert.equal(code(() => D.evaluate([], pos)), 'EMPTY_NETLIST');
  assert.equal(code(() => D.evaluate([['A', 'A']], pos)), 'DUPLICATE_PIN');
  assert.equal(code(() => D.evaluate([{id: 'n', pins: ['A', 'B'], weight: -1}], pos)), 'BAD_WEIGHT');
  assert.equal(code(() => D.evaluate([{id: 'n', pins: ['A']}, {id: 'n', pins: ['B']}], pos)), 'DUPLICATE_NET_ID');
});

test('singleton nets are valid and contribute zero', () => {
  const ev = D.evaluate([['A'], ['A', 'B']], {A: {x: 3, y: 3}, B: {x: 5, y: 4}});
  assert.equal(ev.nets[0].hpwl, 0); assert.equal(ev.nets[0].singleton, true);
  assert.equal(ev.total, 3);
});

test('negative coordinates are allowed by the metric', () => {
  assert.equal(D.hpwl(['A', 'B'], {A: {x: -3, y: -1}, B: {x: 2, y: -4}}), 8);
});

test('ties at extrema: every tied pin is reported', () => {
  const b = D.netBox(T.nets[4], T.placements.starter);
  assert.deepEqual(b.extremes.minX, ['A', 'C']);
  assert.deepEqual(b.extremes.maxX, ['B', 'D']);
  assert.deepEqual(b.extremes.minY, ['A', 'B']);
  assert.deepEqual(b.extremes.maxY, ['C', 'D']);
  // Moving one tied pin inward does not shrink the box: C still holds minX.
  const moved = {...T.placements.starter, A: {x: 2, y: 0}};
  assert.equal(D.netBox(T.nets[4], moved).width, 8);
});

test('translation invariance and pin-order invariance (seeded)', () => {
  let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let trial = 0; trial < 200; trial++) {
    const n = 1 + Math.floor(rnd() * 6), ids = Array.from({length: n}, (_, i) => `c${i}`);
    const pos = Object.fromEntries(ids.map(id => [id, {x: rnd() * 20 - 10, y: rnd() * 20 - 10}]));
    const h = D.hpwl(ids, pos);
    const dx = rnd() * 100 - 50, dy = rnd() * 100 - 50;
    const shifted = Object.fromEntries(ids.map(id => [id, {x: pos[id].x + dx, y: pos[id].y + dy}]));
    assert.ok(D.approxEqual(D.hpwl(ids, shifted), h));
    assert.equal(D.hpwl([...ids].reverse(), pos), h);
  }
});

test('extreme-pin move changes the box; strict interior move keeps the selected net but can change another net', () => {
  const m = FX.multi, P = m.placements;
  assert.deepEqual(D.netBox(m.nets[0], P.start).interior, ['S']);
  assert.equal(D.hpwl(m.nets[0], P.q_right), 13);           // Q moved right: width 6 -> 8
  const low = D.netBox(m.nets[0], P.q_low);
  assert.deepEqual(low.extremes.minY, ['Q']);              // extremum switched from P to Q
  assert.equal(low.hpwl, 14);
  for (const name of ['s_moved', 's_moved2']) {
    assert.equal(D.hpwl(m.nets[0], P[name]), 14, name);     // selected net unchanged
    assert.notEqual(D.hpwl(m.nets[1], P[name]), D.hpwl(m.nets[1], P.q_low), name); // N2 changed
  }
  const region = D.neutralRegion(m.nets[0], P.q_low, 'S');
  assert.deepEqual(region, {minX: 1, maxX: 9, minY: 0, maxY: 6});
});

test('scan trace reads pins in order and ends at the HPWL', () => {
  const tr = D.scanTrace(FX.multi.nets[0], FX.multi.placements.start);
  assert.equal(tr.steps.length, 4);
  assert.deepEqual(tr.steps[0].changed, ['minX', 'maxX', 'minY', 'maxY']);
  assert.deepEqual(tr.steps[3].changed, []);  // S is interior: changes nothing
  assert.equal(tr.hpwl, 11);
});

test('fixed-anchor mode: fixed pads cannot move; free mode can; mode change carries coordinates', () => {
  let s = D.makeState(T, 'starter', {mode: 'fixed'});
  const r1 = D.moveCell(s, 'A', {x: 2, y: 2});
  assert.equal(r1.ok, false); assert.equal(r1.reason, 'fixed-anchor');
  assert.deepEqual(r1.state.positions.A, {x: 0, y: 0});
  const r2 = D.moveCell(s, 'B', {x: 3, y: 1});
  assert.equal(r2.ok, true);
  const free = D.setMode(r2.state, 'free').state;
  assert.deepEqual(free.positions, r2.state.positions);
  assert.deepEqual(free.fixed, ['A', 'D']);
  const r3 = D.moveCell(free, 'A', {x: 2, y: 2});
  assert.equal(r3.ok, true);
  const back = D.setMode(r3.state, 'fixed', T.placements.starter);
  assert.deepEqual(back.displacedAnchors, ['A']);           // reported, not silently repaired
  assert.deepEqual(back.state.positions.A, {x: 2, y: 2});
});

test('moves are clamped to the board and reject non-finite input', () => {
  const s = D.makeState(T, 'starter');
  assert.equal(D.moveCell(s, 'B', {x: 99, y: 3}).reason, 'clamped');
  assert.equal(D.moveCell(s, 'B', {x: NaN, y: 3}).ok, false);
  assert.equal(D.moveCell(s, 'Z', {x: 1, y: 1}).ok, false);
});

test('collapse: all points coincide gives HPWL 0 but every footprint overlaps', () => {
  const s = D.makeState(T, 'collapsed');
  const a = D.analyse(s);
  assert.equal(a.total, 0);
  assert.equal(a.coincident.length, 15);
  assert.equal(a.overlaps.length, 15);
  assert.equal(D.analyse(D.makeState(T, 'compact')).overlaps.length, 0); // compact touches only at corners
});

test('fixed-anchor lower bounds 48 (points) and 49 (1x1 footprints) by brute force on the grid', () => {
  // A=(0,0), D=(8,8) fixed. B and C only appear in AB, CD, AC, BD, ABCD; E and F only in EF.
  const base = T.placements.starter;
  let bestBC = Infinity;
  const grid = []; for (let x = 0; x <= 8; x += 0.5) for (let y = 0; y <= 8; y += 0.5) grid.push({x, y});
  for (const B of grid) for (const C of grid) {
    const pos = {...base, B, C};
    const t = T.nets.slice(0, 5).reduce((s, n) => s + D.hpwl(n, pos), 0);
    bestBC = Math.min(bestBC, t);
  }
  assert.equal(bestBC, 48);
  let bestEFpoint = Infinity, bestEFfoot = Infinity;
  for (const E of grid) for (const F of grid) {
    const h = D.hpwl(['E', 'F'], {E, F});
    bestEFpoint = Math.min(bestEFpoint, h);
    if (D.footprintOverlaps({E, F}).length === 0) bestEFfoot = Math.min(bestEFfoot, h);
  }
  assert.equal(bestBC + bestEFpoint, G['teacher.fixedAnchorPointMin']);
  assert.equal(bestBC + bestEFfoot, G['teacher.fixedAnchorFootprintMin']);
});

test('tolerance: full precision, documented epsilon', () => {
  const pos = {A: {x: 0.1, y: 0}, B: {x: 0.3, y: 0}};
  assert.notEqual(D.hpwl(['A', 'B'], pos), 0.2);           // 0.19999999999999998
  assert.ok(D.approxEqual(D.hpwl(['A', 'B'], pos), 0.2));
  assert.ok(!D.approxEqual(14.01, 14));
  assert.equal(D.fmt(13.996), '14'); // display only
  assert.equal(D.fmt(10, 0), '10');
});

test('fixed49 placement keeps the anchors, has no footprint overlap and reaches 49', () => {
  const s = D.makeState(T, 'fixed49', {mode: 'fixed'});
  const a = D.analyse(s);
  assert.equal(a.total, 49); assert.equal(a.overlaps.length, 0);
  for (const c of T.fixed) assert.deepEqual(s.positions[c], T.placements.starter[c]);
});
