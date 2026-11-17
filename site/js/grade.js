// Challenge definitions and graders. Pure: every check reads the actual state or answer and the domain model.
// Texts live in content.js (by challenge id); this file holds only the logic so it can be unit-tested.
import {analyse, netBox, approxEqual, approxLE, TOLERANCE, makeState} from './domain.js';

const num = v => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v.replace(',', '.')) : NaN);
const near = (v, target) => Number.isFinite(num(v)) && approxEqual(num(v), target);

export const CHALLENGES = [
  {id: 'c1-one-net', category: 'compute', difficulty: 1, kind: 'answer', fixture: 'multi', placement: 'start', selectedNet: 'N1',
    fields: ['minX', 'maxX', 'minY', 'maxY', 'hpwl']},
  {id: 'c2-half-not-full', category: 'diagnose', difficulty: 1, kind: 'answer', fixture: 'multi', placement: 'start', selectedNet: 'N1',
    fields: ['cause', 'hpwl']},
  {id: 'c3-hyperedge-sum', category: 'compute', difficulty: 2, kind: 'answer', fixture: 'teacher', placement: 'starter', selectedNet: 'ABCD',
    fields: ['abcd', 'total']},
  {id: 'c4-interior-move', category: 'experiment', difficulty: 2, kind: 'state', fixture: 'multi', placement: 'q_low', selectedNet: 'N1',
    fields: ['predict']},
  {id: 'c5-free-target', category: 'construct', difficulty: 2, kind: 'state', fixture: 'teacher', placement: 'starter', mode: 'free', footprint: true, selectedNet: 'ABCD'},
  {id: 'c6-fixed-anchor', category: 'construct', difficulty: 3, kind: 'state', fixture: 'teacher', placement: 'starter', mode: 'fixed', footprint: true, selectedNet: 'ABCD'},
  {id: 'c7-collapse', category: 'judge', difficulty: 2, kind: 'answer', fixture: 'teacher', placement: 'collapsed', selectedNet: 'ABCD',
    fields: ['reasons']},
  {id: 'c8-weighted', category: 'extension', difficulty: 2, kind: 'answer', fixture: 'teacher', placement: 'starter', weighted: true, selectedNet: 'ABCD',
    fields: ['starterW', 'compactW']},
];

/** The lab state a challenge starts from (same constructor as the lab). */
export function setupState(fixtures, ch) {
  return makeState(fixtures[ch.fixture], ch.placement, {mode: ch.mode ?? 'free', footprint: Boolean(ch.footprint), weighted: Boolean(ch.weighted), selectedNet: ch.selectedNet});
}

const result = checks => ({pass: checks.every(c => c.ok), checks});

/**
 * grade(id, {state, answers, fixtures}) -> {pass, checks: [{key, ok, got?}]}
 * `state` is the learner's CURRENT lab state for 'state' challenges; answers are raw strings/arrays from the form.
 */
export function grade(id, {state = null, answers = {}, fixtures}) {
  const ch = CHALLENGES.find(c => c.id === id);
  if (!ch) throw new Error(`unknown challenge ${id}`);
  const ref = setupState(fixtures, ch);
  switch (id) {
    case 'c1-one-net': {
      const b = netBox(ref.nets.find(n => n.id === 'N1'), ref.positions);
      return result([
        {key: 'minX', ok: near(answers.minX, b.minX)}, {key: 'maxX', ok: near(answers.maxX, b.maxX)},
        {key: 'minY', ok: near(answers.minY, b.minY)}, {key: 'maxY', ok: near(answers.maxY, b.maxY)},
        {key: 'hpwl', ok: near(answers.hpwl, b.hpwl)},
      ]);
    }
    case 'c2-half-not-full': {
      const b = netBox(ref.nets.find(n => n.id === 'N1'), ref.positions);
      return result([{key: 'cause', ok: answers.cause === 'full-perimeter'}, {key: 'hpwl', ok: near(answers.hpwl, b.hpwl)}]);
    }
    case 'c3-hyperedge-sum': {
      const a = analyse(ref);
      return result([{key: 'abcd', ok: near(answers.abcd, a.nets.find(n => n.id === 'ABCD').hpwl)}, {key: 'total', ok: near(answers.total, a.total)}]);
    }
    case 'c4-interior-move': {
      if (!state || state.fixtureId !== 'multi') return result([{key: 'load', ok: false}]);
      const before = analyse(ref), now = analyse(state);
      const n1 = now.nets.find(n => n.id === 'N1').hpwl, n2 = now.nets.find(n => n.id === 'N2').hpwl;
      const othersStill = ['P', 'Q', 'R', 'T'].every(c => approxEqual(state.positions[c].x, ref.positions[c].x) && approxEqual(state.positions[c].y, ref.positions[c].y));
      const sMoved = Math.hypot(state.positions.S.x - ref.positions.S.x, state.positions.S.y - ref.positions.S.y) > 0.2;
      return result([
        {key: 'predict', ok: near(answers.predict, before.nets.find(n => n.id === 'N1').hpwl)},
        {key: 'onlyS', ok: othersStill},
        {key: 'sMoved', ok: sMoved},
        {key: 'n1Same', ok: approxEqual(n1, before.nets.find(n => n.id === 'N1').hpwl), got: n1},
        {key: 'n2Changed', ok: !approxEqual(n2, before.nets.find(n => n.id === 'N2').hpwl), got: n2},
      ]);
    }
    case 'c5-free-target': {
      if (!state || state.fixtureId !== 'teacher') return result([{key: 'load', ok: false}]);
      const a = analyse({...state, weighted: false});
      return result([
        {key: 'free', ok: state.mode === 'free'},
        {key: 'target', ok: approxLE(a.total, 14), got: a.total},
        {key: 'noOverlap', ok: a.overlaps.length === 0, got: a.overlaps.length},
      ]);
    }
    case 'c6-fixed-anchor': {
      if (!state || state.fixtureId !== 'teacher') return result([{key: 'load', ok: false}]);
      const a = analyse({...state, weighted: false});
      const seats = fixtures.teacher.placements.starter;
      const anchored = state.fixed.every(c => approxEqual(state.positions[c].x, seats[c].x) && approxEqual(state.positions[c].y, seats[c].y));
      return result([
        {key: 'fixedMode', ok: state.mode === 'fixed'},
        {key: 'anchors', ok: anchored},
        {key: 'noOverlap', ok: a.overlaps.length === 0, got: a.overlaps.length},
        {key: 'target', ok: approxLE(a.total, 49), got: a.total},
      ]);
    }
    case 'c7-collapse': {
      const picked = new Set(Array.isArray(answers.reasons) ? answers.reasons : []);
      const correct = new Set(['overlap', 'anchors']);
      const exact = picked.size === correct.size && [...correct].every(k => picked.has(k));
      return result([{key: 'reasons', ok: exact}]);
    }
    case 'c8-weighted': {
      const T = fixtures.teacher;
      const s = analyse(makeState(T, 'starter')), c = analyse(makeState(T, 'compact'));
      return result([{key: 'starterW', ok: near(answers.starterW, s.weightedTotal)}, {key: 'compactW', ok: near(answers.compactW, c.weightedTotal)}]);
    }
    default: throw new Error('unreachable');
  }
}

export {TOLERANCE};
