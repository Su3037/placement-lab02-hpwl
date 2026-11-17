// HPWL domain model. Pure functions only: no DOM, no media, no clocks, no randomness.
// Shared by the website lab, the challenges, the film timeline, the slide builder and the tests.
// Coordinates are point pins in abstract grid units; y grows upward.

export const TOLERANCE = 1e-9;

/** Relative/absolute comparison used by grading. Never compare display-rounded strings. */
export function approxEqual(a, b, tol = TOLERANCE) {
  return Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
}
export const approxLE = (a, b, tol = TOLERANCE) => a <= b || approxEqual(a, b, tol);

export class HpwlInputError extends Error {
  constructor(code, message, detail = {}) {
    super(message);
    this.name = 'HpwlInputError';
    this.code = code;
    this.detail = detail;
  }
}

const isFiniteNumber = v => typeof v === 'number' && Number.isFinite(v);

/**
 * Normalise a net. Accepts ["A","B"] or {id, pins, weight}.
 * Policy (documented in docs/decision-log.md):
 *  - empty net            -> error EMPTY_NET (never a silent zero)
 *  - duplicate pin in net -> error DUPLICATE_PIN (data error; HPWL would be unchanged, but we refuse to guess)
 *  - singleton net        -> valid, HPWL 0, flagged `singleton`
 *  - weight               -> finite and >= 0, default 1
 */
export function normaliseNet(net, index = 0) {
  const raw = Array.isArray(net) ? {pins: net} : net;
  if (!raw || !Array.isArray(raw.pins)) throw new HpwlInputError('BAD_NET', `Net #${index} has no pin list.`, {index});
  const id = raw.id ?? (raw.pins.join('') || `net${index}`);
  if (raw.pins.length === 0) throw new HpwlInputError('EMPTY_NET', `Net ${id} has no pins.`, {net: id});
  const seen = new Set();
  for (const pin of raw.pins) {
    if (typeof pin !== 'string' || pin.length === 0) throw new HpwlInputError('BAD_PIN_ID', `Net ${id} has a non-string pin id.`, {net: id});
    if (seen.has(pin)) throw new HpwlInputError('DUPLICATE_PIN', `Net ${id} lists pin ${pin} twice.`, {net: id, pin});
    seen.add(pin);
  }
  const weight = raw.weight ?? 1;
  if (!isFiniteNumber(weight) || weight < 0) throw new HpwlInputError('BAD_WEIGHT', `Net ${id} weight must be a finite number >= 0.`, {net: id, weight});
  return {id, pins: [...raw.pins], weight};
}

/** Validate every referenced pin before computing anything (upstream helpers silently skipped unknown ids). */
export function validate(nets, positions) {
  if (!Array.isArray(nets)) throw new HpwlInputError('BAD_NETLIST', 'Nets must be an array.');
  if (nets.length === 0) throw new HpwlInputError('EMPTY_NETLIST', 'A placement needs at least one net to score.');
  if (!positions || typeof positions !== 'object') throw new HpwlInputError('BAD_POSITIONS', 'Positions must be an object.');
  const normal = nets.map(normaliseNet);
  const ids = new Set();
  for (const n of normal) {
    if (ids.has(n.id)) throw new HpwlInputError('DUPLICATE_NET_ID', `Net id ${n.id} is used twice.`, {net: n.id});
    ids.add(n.id);
    for (const pin of n.pins) {
      const p = positions[pin];
      if (!p) throw new HpwlInputError('UNKNOWN_PIN', `Net ${n.id} references unknown pin ${pin}.`, {net: n.id, pin});
      if (!isFiniteNumber(p.x) || !isFiniteNumber(p.y)) throw new HpwlInputError('BAD_COORDINATE', `Pin ${pin} needs finite x and y.`, {pin, x: p.x, y: p.y});
    }
  }
  return normal;
}

/** Bounding box of one (already validated) net, with every pin that attains each extreme. */
export function netBox(net, positions) {
  const n = normaliseNet(net);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const pin of n.pins) {
    const p = positions[pin];
    if (!p || !isFiniteNumber(p.x) || !isFiniteNumber(p.y)) throw new HpwlInputError('UNKNOWN_PIN', `Pin ${pin} missing or non-finite.`, {net: n.id, pin});
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const at = (axis, value) => n.pins.filter(pin => positions[pin][axis] === value);
  const extremes = {minX: at('x', minX), maxX: at('x', maxX), minY: at('y', minY), maxY: at('y', maxY)};
  const extremePins = new Set(Object.values(extremes).flat());
  const width = maxX - minX, height = maxY - minY;
  return {
    id: n.id, pins: n.pins, weight: n.weight,
    minX, maxX, minY, maxY, width, height,
    hpwl: width + height,
    singleton: n.pins.length === 1,
    extremes,
    // A pin is "interior" when it attains none of the four extremes (strictly inside on both axes).
    interior: n.pins.filter(pin => !extremePins.has(pin)),
  };
}

export const hpwl = (net, positions) => netBox(net, positions).hpwl;

/** Full evaluation of a placement. Weighted total is reported separately and only used when asked. */
export function evaluate(nets, positions) {
  const normal = validate(nets, positions);
  const boxes = normal.map(n => netBox(n, positions));
  const total = boxes.reduce((s, b) => s + b.hpwl, 0);
  const weightedTotal = boxes.reduce((s, b) => s + b.weight * b.hpwl, 0);
  return {nets: boxes, total, weightedTotal};
}

/**
 * The region where one pin can move without changing THIS net's HPWL: the bounding box of the
 * other pins (closed). Other nets containing the pin may still change.
 */
export function neutralRegion(net, positions, pin) {
  const n = normaliseNet(net);
  if (!n.pins.includes(pin)) throw new HpwlInputError('PIN_NOT_IN_NET', `${pin} is not on net ${n.id}.`);
  const others = n.pins.filter(p => p !== pin);
  if (others.length === 0) return null; // singleton: any move keeps HPWL 0
  const b = netBox({id: n.id, pins: others}, positions);
  return {minX: b.minX, maxX: b.maxX, minY: b.minY, maxY: b.maxY};
}

/** Step-by-step scan used by the lab "step" button and by the film: one event per pin read. */
export function scanTrace(net, positions) {
  const n = normaliseNet(net);
  const steps = [];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  n.pins.forEach((pin, i) => {
    const p = positions[pin];
    if (!p || !isFiniteNumber(p.x) || !isFiniteNumber(p.y)) throw new HpwlInputError('UNKNOWN_PIN', `Pin ${pin} missing or non-finite.`, {net: n.id, pin});
    const changed = [];
    if (p.x < minX) { minX = p.x; changed.push('minX'); }
    if (p.x > maxX) { maxX = p.x; changed.push('maxX'); }
    if (p.y < minY) { minY = p.y; changed.push('minY'); }
    if (p.y > maxY) { maxY = p.y; changed.push('maxY'); }
    steps.push({index: i, pin, x: p.x, y: p.y, changed, minX, maxX, minY, maxY, partial: (maxX - minX) + (maxY - minY)});
  });
  return {net: n.id, steps, hpwl: steps.length ? steps.at(-1).partial : 0};
}

/** Wrong-model helpers, used only to TEACH the difference (never in the total). */
export function fullPerimeter(net, positions) { return 2 * hpwl(net, positions); }
export function cliqueSum(net, positions) {
  const n = normaliseNet(net); let s = 0;
  for (let i = 0; i < n.pins.length; i++) for (let j = i + 1; j < n.pins.length; j++) s += hpwl({id: 'pair', pins: [n.pins[i], n.pins[j]]}, positions);
  return s;
}
export function euclidean(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

// ---------- placement state, modes and constraints ----------

export const clone = value => JSON.parse(JSON.stringify(value));

/**
 * A lab/film placement state. `mode` is 'free' (every point may move: pure metric measurement)
 * or 'fixed' (cells listed in `fixed` are anchors and cannot move).
 */
export function makeState(fixture, placementName, overrides = {}) {
  const positions = clone(fixture.placements[placementName]);
  return {
    fixtureId: fixture.id,
    placement: placementName,
    cells: [...fixture.cells],
    nets: fixture.nets.map(n => ({...n, pins: [...n.pins]})),
    fixed: [...(fixture.fixed ?? [])],
    bounds: {...fixture.bounds},
    positions,
    mode: 'free',
    weighted: false,
    footprint: false,
    selectedNet: fixture.nets[0]?.id ?? null,
    ...overrides,
  };
}

export const isLocked = (state, cell) => state.mode === 'fixed' && state.fixed.includes(cell);

/** Apply a move. Returns {ok, state, reason}. Never mutates the input. */
export function moveCell(state, cell, point) {
  if (!state.cells.includes(cell)) return {ok: false, state, reason: 'unknown-cell'};
  if (!isFiniteNumber(point.x) || !isFiniteNumber(point.y)) return {ok: false, state, reason: 'non-finite'};
  if (isLocked(state, cell)) return {ok: false, state, reason: 'fixed-anchor'};
  const b = state.bounds;
  const x = Math.min(b.xmax, Math.max(b.xmin, point.x));
  const y = Math.min(b.ymax, Math.max(b.ymin, point.y));
  const next = clone(state);
  next.positions[cell] = {x, y};
  next.placement = 'edited';
  return {ok: true, state: next, reason: x !== point.x || y !== point.y ? 'clamped' : 'moved'};
}

/** Switch mode, carrying both coordinates and constraints. Fixed mode with anchors off their seats is reported, not silently repaired. */
export function setMode(state, mode, anchorSeats = null) {
  if (mode !== 'free' && mode !== 'fixed') throw new HpwlInputError('BAD_MODE', `Unknown mode ${mode}`);
  const next = clone(state);
  next.mode = mode;
  const displaced = mode === 'fixed' && anchorSeats
    ? next.fixed.filter(c => !approxEqual(next.positions[c].x, anchorSeats[c].x) || !approxEqual(next.positions[c].y, anchorSeats[c].y))
    : [];
  return {state: next, displacedAnchors: displaced};
}

// ---------- physical sanity (separate teaching proxy, not legalization) ----------

/** Pairs of cells whose points coincide (within tolerance). */
export function coincidentPairs(positions, cells = Object.keys(positions)) {
  const out = [];
  for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
    const a = positions[cells[i]], b = positions[cells[j]];
    if (approxEqual(a.x, b.x) && approxEqual(a.y, b.y)) out.push([cells[i], cells[j]]);
  }
  return out;
}

/**
 * Optional 1x1 footprint proxy: each cell is a unit square centred on its point.
 * Two footprints overlap when the intersection AREA is positive (touching edges is fine).
 */
export function footprintOverlaps(positions, cells = Object.keys(positions), size = 1) {
  const out = [];
  for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
    const a = positions[cells[i]], b = positions[cells[j]];
    const ox = size - Math.abs(a.x - b.x), oy = size - Math.abs(a.y - b.y);
    if (ox > TOLERANCE && oy > TOLERANCE) out.push({pair: [cells[i], cells[j]], area: ox * oy});
  }
  return out;
}

/** Everything the UI, film and grader need about one state, from one computation. */
export function analyse(state) {
  const ev = evaluate(state.nets, state.positions);
  return {
    ...ev,
    score: state.weighted ? ev.weightedTotal : ev.total,
    coincident: coincidentPairs(state.positions, state.cells),
    overlaps: footprintOverlaps(state.positions, state.cells),
    selected: ev.nets.find(n => n.id === state.selectedNet) ?? null,
  };
}

/** Linear interpolation of two placements (film only). Intermediate states are labelled by the timeline. */
export function lerpPositions(a, b, p) {
  const out = {};
  for (const k of Object.keys(a)) out[k] = {x: a[k].x + (b[k].x - a[k].x) * p, y: a[k].y + (b[k].y - a[k].y) * p};
  return out;
}

/** Number formatting for display only (grading never uses this). */
export function fmt(v, digits = 2) {
  if (!Number.isFinite(v)) return String(v);
  const r = Math.round(v * 10 ** digits) / 10 ** digits;
  const text = (Object.is(r, -0) ? 0 : r).toFixed(digits);
  return text.includes('.') ? text.replace(/\.?0+$/, '') : text;
}

/** Attach ids to the fixtures file (the single data source for site, film, slides and Python). */
export function prepareFixtures(json) {
  const out = {};
  for (const [id, f] of Object.entries(json.fixtures)) out[id] = {...f, id};
  return out;
}
