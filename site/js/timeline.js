// Deterministic random-access timeline: stateAt(t) depends only on t, the fixtures, the script and the clock.
// No wall clock, no randomness, no accumulated history. Every number is recomputed from positions by domain.js.
import {analyse, scanTrace, lerpPositions, clone, netBox, cliqueSum} from './domain.js';

export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const ease = v => { const p = clamp(v); return p * p * (3 - 2 * p); };

/** Index of the cue whose picture window contains t (windows are contiguous and half-open). */
export function cueIndexAt(t, clock) {
  const segs = clock.segments;
  for (let i = 0; i < segs.length; i++) if (t < segs[i].sceneEnd) return i;
  return segs.length - 1;
}

export function validateClock(clock, script) {
  if (!clock || !Array.isArray(clock.segments) || !clock.segments.length) throw new TypeError('clock.segments required');
  if (clock.provisional) throw new Error('final film cannot use a provisional clock');
  let prev = 0;
  clock.segments.forEach((s, i) => {
    if (s.id !== script.cues[i]?.id) throw new Error(`clock/script order mismatch at ${i}: ${s.id}`);
    if (!(s.start >= 0 && s.start <= s.end && s.end <= s.sceneEnd && s.sceneEnd <= clock.duration)) throw new Error(`bad times in ${s.id}`);
    if (Math.abs(s.start - prev) > 1e-9) throw new Error(`gap before ${s.id}`);
    if (s.lines.length !== script.cues[i].lines.length) throw new Error(`line count mismatch in ${s.id}`);
    for (const L of s.lines) if (!(L.start >= s.start - 1e-9 && L.end <= s.end + 1e-9 && L.start < L.end)) throw new Error(`bad line in ${s.id}`);
    prev = s.sceneEnd;
  });
  if (Math.abs(prev - clock.duration) > 1e-9) throw new Error('clock does not end at duration');
  return true;
}

// One layout reaching the fixed-anchor footprint bound 49 (fixtures: teacher.placements.fixed49).
const TARGET49 = {B: {x: 5, y: 3}, C: {x: 3, y: 5}, F: {x: 3, y: 4}};

function view(fx, positions, extra = {}) {
  return {
    fixtureId: fx.id, cells: [...fx.cells], nets: fx.nets.map(n => ({...n, pins: [...n.pins]})), fixed: [...(fx.fixed ?? [])],
    bounds: {...fx.bounds}, positions, mode: 'free', weighted: false, footprint: false, selectedNet: null,
    showBoxes: 'selected', highlights: {}, showMode: false, ...extra,
  };
}

/** Build the cue-specific picture. `c` holds timing helpers for this cue. */
const CUES = {
  title(FX, c) {
    const T = FX.teacher;
    return {board: view(T, clone(T.placements.starter), {showBoxes: c.li >= 1 ? 'all' : 'none', highlights: {flylines: c.li >= 1 ? 0.35 : 0.55}}), panel: {kind: 'title'}};
  },
  problem(FX, c) {
    const T = FX.teacher;
    return {board: view(T, clone(T.placements.starter), {showBoxes: c.li >= 1 ? 'all' : 'none', highlights: {flylines: true, legend: c.li >= 2}}), panel: {kind: 'notes', set: 'problem', reveal: c.li + 1}};
  },
  coords(FX, c) {
    const f = FX.two_pin_h;
    return {board: view(f, clone(f.placements.start), {selectedNet: 'PQ', showBoxes: 'none', footprint: c.li >= 1 ? +c.lp(1, 0, 0.35).toFixed(3) : false, highlights: {coords: true}}), panel: {kind: 'notes', set: 'coords', reveal: c.li + 1}};
  },
  two_h(FX, c) {
    const f = FX.two_pin_h;
    const st = view(f, clone(f.placements.start), {selectedNet: 'PQ', highlights: {coords: true, dims: c.lp(0, 0.2, 0.6), extremes: c.lp(0, 0.4, 0.8)}});
    return {board: st, panel: {kind: 'net', formula: c.li >= 1, net: 'PQ'}};
  },
  two_manhattan(FX, c) {
    const a = FX.two_pin_h.placements.start, b = FX.two_pin_manhattan.placements.start;
    const p = c.lp(0, 0, 0.35);
    const st = view(FX.two_pin_manhattan, lerpPositions(a, b, p), {selectedNet: 'PQ',
      highlights: {coords: true, dims: c.lp(0, 0.4, 0.7), euclid: c.li >= 1 ? +c.lp(1, 0.3, 0.6).toFixed(3) : 0, lpath: c.li >= 2 ? c.lp(2, 0.05, 0.6) : 0}});
    return {board: st, panel: {kind: 'net', formula: c.li >= 1, net: 'PQ', euclid: c.li >= 1}, intermediate: p > 0 && p < 1};
  },
  multi_scan(FX, c) {
    const f = FX.multi;
    const hl = {coords: true};
    if (c.li === 0) hl.scanUpto = 0;
    else if (c.li === 1) hl.scanUpto = Math.min(4, 1 + Math.floor(c.raw(1) * 4));
    else Object.assign(hl, {dims: c.lp(2, 0, 0.3), extremes: c.lp(2, 0.1, 0.4)});
    return {board: view(f, clone(f.placements.start), {selectedNet: 'N1', visibleNets: ['N1'], highlights: hl}),
      panel: {kind: 'scan', net: 'N1', upto: hl.scanUpto ?? 4, formula: c.li >= 2}};
  },
  half_name(FX, c) {
    const f = FX.multi;
    return {board: view(f, clone(f.placements.start), {selectedNet: 'N1', visibleNets: ['N1'], highlights: {perimeter: {full: c.lp(0, 0, 0.4), half: c.lp(0, 0.45, 0.85)}, dims: 1}}),
      panel: {kind: 'names', net: 'N1', reveal: c.li >= 1 ? 2 : 1}};
  },
  extreme_move(FX, c) {
    const f = FX.multi, P = f.placements;
    const px = c.lp(0, 0.1, 0.55), py = c.li >= 1 ? c.lp(1, 0.05, 0.6) : 0;
    const pos = clone(P.start);
    pos.Q = {x: 7 + (9 - 7) * px, y: 2 + (0 - 2) * py};
    const moving = (px > 0 && px < 1) || (py > 0 && py < 1);
    return {board: view(f, pos, {selectedNet: 'N1', showBoxes: 'all', highlights: {ghost: {Q: P.start.Q}, dims: 1, extremes: 1, dimOthers: false}}),
      panel: {kind: 'move', net: 'N1', from: 'start', focus: 'Q'}, intermediate: moving};
  },
  interior_move(FX, c) {
    const f = FX.multi, P = f.placements;
    const p = c.lp(0, 0.15, 0.6);
    const pos = lerpPositions(P.q_low, P.s_moved, p);
    return {board: view(f, pos, {selectedNet: 'N1', showBoxes: 'all', highlights: {neutral: {net: 'N1', pin: 'S'}, ghost: {S: P.q_low.S}, dims: 1, dimOthers: false}}),
      panel: {kind: 'move', net: 'N1', from: 'q_low', focus: 'S', showN2: c.li >= 1}, intermediate: p > 0 && p < 1};
  },
  teacher_starter(FX, c) {
    const T = FX.teacher;
    let k = 4, reveal = 0;
    if (c.li === 1) { k = Math.min(5, Math.floor(c.raw(1) * 6)); reveal = k + 1; }
    if (c.li >= 2) reveal = 6;
    return {board: view(T, clone(T.placements.starter), {selectedNet: c.li >= 2 ? null : T.nets[k].id, showBoxes: c.li === 0 ? 'selected' : 'all', highlights: {dims: c.li === 1 ? 1 : 0, flylines: c.li === 0 ? 0.4 : false}}),
      panel: {kind: 'table', reveal, total: c.li >= 2, active: c.li === 1 ? T.nets[k].id : null}};
  },
  ties(FX, c) {
    const T = FX.teacher, S = T.placements.starter;
    const p = c.li >= 1 ? c.lp(1, 0.1, 0.5) : 0;
    const pos = clone(S); pos.A = {x: 2 * p, y: 0};
    return {board: view(T, pos, {selectedNet: 'ABCD', showBoxes: c.li >= 1 ? 'all' : 'selected', showMode: true, highlights: {extremes: 1, ghost: c.li >= 1 ? {A: S.A} : null, dimOthers: false}}),
      panel: {kind: 'table', reveal: 6, total: true, compareTo: 'starter', active: 'ABCD'}, intermediate: p > 0 && p < 1};
  },
  compact(FX, c) {
    const T = FX.teacher;
    const left = view(T, clone(T.placements.starter), {showBoxes: 'all'});
    const right = view(T, clone(T.placements.compact), {showBoxes: 'all', highlights: {ghost: c.li >= 2 ? {A: T.placements.starter.A, D: T.placements.starter.D} : null}});
    return {board: right, boards: [left, right], panel: {kind: 'compare', highlightPads: c.li >= 2, showDrop: c.li >= 1}};
  },
  weights(FX, c) {
    const T = FX.teacher;
    return {board: view(T, clone(T.placements.starter), {selectedNet: 'ABCD', showBoxes: 'all', weighted: true}), panel: {kind: 'weights', sums: c.li >= 1}};
  },
  collapse(FX, c) {
    const T = FX.teacher;
    const p = c.lp(0, 0.1, 0.6);
    const pos = lerpPositions(T.placements.starter, T.placements.collapsed, p);
    return {board: view(T, pos, {showBoxes: 'all', footprint: c.li >= 2 ? +c.lp(2, 0, 0.3).toFixed(3) : false}), panel: {kind: 'collapse', showOverlap: c.li >= 2, judge: c.li >= 1}, intermediate: p > 0 && p < 1};
  },
  fixed_anchor(FX, c) {
    const T = FX.teacher, S = T.placements.starter;
    const p = c.li >= 1 ? c.lp(1, 0.05, 0.6) : 0;
    const target = {...clone(S), ...TARGET49};
    const pos = lerpPositions(S, target, p);
    return {board: view(T, pos, {mode: 'fixed', showMode: true, selectedNet: c.li === 0 ? 'ABCD' : null, showBoxes: c.li === 0 ? 'selected' : 'all', footprint: c.li >= 1 ? +c.lp(1, 0.6, 0.8).toFixed(3) : false, highlights: {extremes: c.li === 0 ? 1 : 0, dimOthers: false}}),
      panel: {kind: 'fixed', bound: c.li >= 1}, intermediate: p > 0 && p < 1};
  },
  pseudocode(FX, c) {
    const T = FX.teacher;
    let line = 0, k = -1;
    if (c.li === 1) { k = Math.min(5, Math.floor(c.raw(1) * 6)); line = 2; }
    if (c.li >= 2) { k = 5; line = 4; }
    return {board: view(T, clone(T.placements.starter), {selectedNet: k >= 0 && c.li === 1 ? T.nets[k].id : null, showBoxes: c.li >= 2 ? 'all' : 'selected', highlights: {dims: c.li === 1 ? 1 : 0}}),
      panel: {kind: 'code', line, upto: k + 1}};
  },
  takeaway(FX, c) {
    const T = FX.teacher;
    return {board: view(T, clone(T.placements.compact), {showBoxes: 'all'}), panel: {kind: 'summary', reveal: c.li + 1}};
  },
};

/**
 * stateAt(t, fixtures, script, clock): the complete semantic state at time t.
 * fixtures: prepared fixtures (domain.prepareFixtures).
 */
export function stateAt(time, fixtures, script, clock) {
  if (!Number.isFinite(time)) throw new TypeError('A finite time is required.');
  const t = clamp(time, 0, clock.duration);
  const i = cueIndexAt(t, clock);
  const seg = clock.segments[i], cue = script.cues[i];
  if (!cue || cue.id !== seg.id) throw new Error(`Missing script cue for ${seg.id}`);
  const L = seg.lines;
  let li = 0;
  for (let k = 0; k < L.length; k++) if (L[k].start <= t) li = k;
  const raw = k => (k < li ? 1 : k > li ? 0 : clamp((t - L[k].start) / (L[k].end - L[k].start)));
  const lp = (k, a = 0, b = 1) => ease((raw(k) - a) / (b - a));
  const build = CUES[cue.id];
  if (!build) throw new Error(`No picture for cue ${cue.id}`);
  const pic = build(fixtures, {li, raw, lp});
  const captionOn = t >= L[li].start && t < L[li].end;
  // Numbers for the panel: computed here, from the same positions the board draws.
  const metrics = analyse(pic.board);
  const extra = {};
  if (pic.boards) extra.boardsMetrics = pic.boards.map(b => analyse(b));
  if (pic.panel.kind === 'scan') extra.scan = scanTrace(pic.board.nets.find(n => n.id === pic.panel.net), pic.board.positions);
  if (pic.panel.kind === 'names') { const n = pic.board.nets.find(x => x.id === pic.panel.net); extra.clique = cliqueSum(n, pic.board.positions); }
  if (pic.panel.kind === 'move') {
    const fx = fixtures[pic.board.fixtureId];
    extra.reference = analyse({...pic.board, positions: clone(fx.placements[pic.panel.from])});
    extra.box = netBox(pic.board.nets.find(n => n.id === pic.panel.net), pic.board.positions);
  }
  if (pic.panel.kind === 'table' && pic.panel.compareTo) extra.reference = analyse({...pic.board, positions: clone(fixtures[pic.board.fixtureId].placements[pic.panel.compareTo])});
  if (pic.panel.kind === 'weights') {
    const T = fixtures.teacher;
    extra.weightedRows = ['starter', 'compact'].map(name => analyse({...pic.board, positions: clone(T.placements[name])}));
  }
  return {
    time: t, duration: clock.duration, cueIndex: i, cueId: cue.id, chapter: cue.chapter, layout: cue.layout,
    lineIndex: li, lineProgress: raw(li), cueProgress: clamp((t - seg.start) / (seg.sceneEnd - seg.start)),
    caption: captionOn ? {zh: cue.lines[li].zh, en: cue.lines[li].en, id: `${cue.id}-${li + 1}`} : null,
    intermediate: Boolean(pic.intermediate),
    board: pic.board, boards: pic.boards ?? null, panel: pic.panel, metrics, ...extra,
  };
}

/** What "Try this frame" hands to the lab: the actual coordinates and settings of the primary board. */
export function labHandoff(state) {
  const b = state.board;
  return {
    fixtureId: b.fixtureId, positions: clone(b.positions), mode: b.mode, selectedNet: b.selectedNet ?? b.nets[0].id,
    weighted: b.weighted, footprint: Boolean(b.footprint), fixed: [...b.fixed],
    cueId: state.cueId, time: state.time, intermediate: state.intermediate,
  };
}

/** Frame index <-> time mapping used by both the renderer and the web player. */
export const frameTime = (frame, fps) => frame / fps;
export const frameAt = (seconds, fps) => Math.floor(seconds * fps + 1e-6);
