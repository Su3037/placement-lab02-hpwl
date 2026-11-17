// Challenge graders: wrong answers fail, several different correct answers pass, collapse is not rewarded.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as D from '../site/js/domain.js';
import {grade, CHALLENGES, setupState} from '../site/js/grade.js';

const fixtures = D.prepareFixtures(JSON.parse(readFileSync(new URL('../fixtures/hpwl-fixtures.json', import.meta.url))));
const ch = id => CHALLENGES.find(c => c.id === id);
const move = (state, moves) => moves.reduce((s, [c, x, y]) => { const r = D.moveCell(s, c, {x, y}); assert.ok(r.ok, `${c} ${r.reason}`); return r.state; }, state);

test('c1: exact box values pass, perimeter or swapped values fail; numeric strings accepted', () => {
  assert.equal(grade('c1-one-net', {fixtures, answers: {minX: '1', maxX: '7', minY: '1', maxY: '6', hpwl: '11'}}).pass, true);
  assert.equal(grade('c1-one-net', {fixtures, answers: {minX: 1, maxX: 7, minY: 1, maxY: 6, hpwl: 22}}).pass, false);
  assert.equal(grade('c1-one-net', {fixtures, answers: {minX: 1, maxX: 7, minY: 1, maxY: 6, hpwl: ''}}).pass, false);
});

test('c2 and c3: diagnosis and hyperedge sum', () => {
  assert.equal(grade('c2-half-not-full', {fixtures, answers: {cause: 'full-perimeter', hpwl: 11}}).pass, true);
  assert.equal(grade('c2-half-not-full', {fixtures, answers: {cause: 'euclidean', hpwl: 11}}).pass, false);
  assert.equal(grade('c3-hyperedge-sum', {fixtures, answers: {abcd: 16, total: 52}}).pass, true);
  // Treating ABCD as a clique (six pairs, 64) gives 100; must fail.
  assert.equal(grade('c3-hyperedge-sum', {fixtures, answers: {abcd: 64, total: 100}}).pass, false);
});

test('c4: two different interior moves pass; moving an extreme pin or not moving fails', () => {
  const s0 = setupState(fixtures, ch('c4-interior-move'));
  for (const [x, y] of [[5, 4], [2.5, 5], [6, 4.5]]) assert.equal(grade('c4-interior-move', {fixtures, state: move(s0, [['S', x, y]]), answers: {predict: 14}}).pass, true, `${x},${y}`);
  assert.equal(grade('c4-interior-move', {fixtures, state: s0, answers: {predict: 14}}).pass, false);
  assert.equal(grade('c4-interior-move', {fixtures, state: move(s0, [['S', 9.5, 3]]), answers: {predict: 14}}).pass, false); // leaves the box
  assert.equal(grade('c4-interior-move', {fixtures, state: move(s0, [['Q', 9, 1]]), answers: {predict: 14}}).pass, false);
  assert.equal(grade('c4-interior-move', {fixtures, state: move(s0, [['S', 5, 4]]), answers: {predict: 11}}).pass, false);
});

test('c5: compact and a translated compact pass; the collapse (HPWL 0) fails on overlap', () => {
  const s0 = setupState(fixtures, ch('c5-free-target'));
  const compact = Object.entries(fixtures.teacher.placements.compact).map(([c, p]) => [c, p.x, p.y]);
  assert.equal(grade('c5-free-target', {fixtures, state: move(s0, compact)}).pass, true);
  const shifted = compact.map(([c, x, y]) => [c, x + 3, y + 1]);
  assert.equal(grade('c5-free-target', {fixtures, state: move(s0, shifted)}).pass, true);
  const collapsed = Object.keys(fixtures.teacher.placements.starter).map(c => [c, 4, 4]);
  const g = grade('c5-free-target', {fixtures, state: move(s0, collapsed)});
  assert.equal(g.pass, false);
  assert.equal(g.checks.find(c => c.key === 'target').ok, true);
  assert.equal(g.checks.find(c => c.key === 'noOverlap').ok, false);
  assert.equal(grade('c5-free-target', {fixtures, state: s0}).pass, false); // starter 52
});

test('c6: two different 49 layouts pass with anchors locked; free-mode cheating fails', () => {
  const s0 = setupState(fixtures, ch('c6-fixed-anchor'));
  const a = move(s0, [['B', 5, 3], ['C', 3, 5], ['F', 3, 4]]);
  const b = move(s0, [['B', 8, 4], ['C', 0, 6], ['E', 6, 6], ['F', 6, 7]]);
  assert.equal(D.analyse(a).total, 49); assert.equal(D.analyse(b).total, 49);
  assert.equal(grade('c6-fixed-anchor', {fixtures, state: a}).pass, true);
  assert.equal(grade('c6-fixed-anchor', {fixtures, state: b}).pass, true);
  assert.equal(D.moveCell(s0, 'A', {x: 3, y: 3}).ok, false);
  const freed = move(D.setMode(s0, 'free').state, [['A', 2, 2], ['D', 4, 4]]);
  assert.equal(grade('c6-fixed-anchor', {fixtures, state: D.setMode(freed, 'fixed').state}).pass, false);
  // E on top of F: HPWL 48, below the footprint bound, but overlapping -> fails.
  const stacked = move(s0, [['F', 4, 4]]);
  assert.equal(grade('c6-fixed-anchor', {fixtures, state: stacked}).pass, false);
});

test('c7 and c8', () => {
  assert.equal(grade('c7-collapse', {fixtures, answers: {reasons: ['overlap', 'anchors']}}).pass, true);
  assert.equal(grade('c7-collapse', {fixtures, answers: {reasons: ['overlap']}}).pass, false);
  assert.equal(grade('c7-collapse', {fixtures, answers: {reasons: ['overlap', 'anchors', 'formula']}}).pass, false);
  assert.equal(grade('c8-weighted', {fixtures, answers: {starterW: 116, compactW: 30}}).pass, true);
  assert.equal(grade('c8-weighted', {fixtures, answers: {starterW: 52, compactW: 14}}).pass, false);
});
