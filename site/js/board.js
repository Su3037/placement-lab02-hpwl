// Shared SVG board. The film renderer, the live lab, the definition figures and the slides all call Board().
// It only DRAWS a state; every number it prints comes from domain.js on the same positions.
import {netBox, neutralRegion, footprintOverlaps, coincidentPairs, isLocked, fmt, euclidean} from './domain.js';

// House palette (dark technical films): ivory text, gold focus, teal main net, muted secondary hues.
export const THEME = {bg: '#081a22', line: '#1d3640', grid: '#14303a', axis: '#3d5d64', tick: '#6f8a8c', ink: '#eeeadd', muted: '#8fa3a3',
  gold: '#ddbd78', teal: '#76cbb5', rose: '#d99a9a', sage: '#9fc79a', node: '#0b2029'};
export const CELL_COLORS = {A: '#86a9e0', B: '#d58f62', C: '#a3b26f', D: '#d99a9a', E: '#a18bc0', F: '#d9b06c',
  P: '#86a9e0', Q: '#d58f62', R: '#a3b26f', S: '#a18bc0', T: '#d9b06c'};
export const NET_COLORS = {AB: '#86a9e0', CD: '#d99a9a', AC: '#a3b26f', BD: '#d9b06c', ABCD: '#76cbb5', EF: '#a18bc0',
  PQ: '#76cbb5', N1: '#76cbb5', N2: '#d9b06c'};
const FALLBACK = ['#76cbb5', '#d9b06c', '#a18bc0', '#d99a9a', '#a3b26f', '#86a9e0'];
export const netColor = (id, i = 0) => NET_COLORS[id] ?? FALLBACK[i % FALLBACK.length];
export const cellColor = id => CELL_COLORS[id] ?? '#8fa3a3';

const L = {
  zh: {width: '宽', height: '高', free: '自由点模式', fixed: '固定焊盘模式', fixedPad: '固定', neutral: 'S 可自由移动的区域', notWire: '虚线 = 连接关系，不是导线',
    euclid: '直线距离', lpath: '一条等长的曼哈顿路径', perimeter: '周长', half: '半周长', board: '布局图板', stacked: '叠在一起'},
  en: {width: 'width', height: 'height', free: 'free-point mode', fixed: 'fixed-anchor mode', fixedPad: 'fixed', neutral: 'region where S keeps N1 unchanged', notWire: 'dashed = connectivity, not a wire',
    euclid: 'straight line', lpath: 'one equal-length Manhattan path', perimeter: 'perimeter', half: 'half', board: 'placement board', stacked: 'stacked'},
};

export const escapeText = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

/** World <-> screen mapping. The lab inverts drags with the SAME function used to draw. */
export function geometry(bounds, {width = 900, height = 900, pad = 70, padRight = pad, padTop = pad} = {}) {
  const spanX = bounds.xmax - bounds.xmin, spanY = bounds.ymax - bounds.ymin;
  const s = Math.min((width - pad - padRight) / spanX, (height - pad - padTop) / spanY);
  const ox = pad + (width - pad - padRight - s * spanX) / 2, oy = padTop + (height - pad - padTop - s * spanY) / 2;
  return {
    width, height, s, ox, oy, bounds,
    toScreen: p => ({x: ox + (p.x - bounds.xmin) * s, y: oy + (bounds.ymax - p.y) * s}),
    toWorld: q => ({x: bounds.xmin + (q.x - ox) / s, y: bounds.ymax - (q.y - oy) / s}),
  };
}

/** One place that decides the board margins, so drawing and drag inversion always agree. */
export const boardGeometryOptions = (width, height, compact = false) => compact ? {width, height, pad: 46, padRight: 46, padTop: 60} : {width, height, pad: 70, padRight: 150, padTop: 90};

const n2 = v => Math.round(v * 100) / 100; // SVG coordinate rounding (2 decimals) for stable markup

/**
 * view = {
 *   cells, nets, bounds, positions, fixed, mode, footprint, selectedNet,
 *   showBoxes: 'selected'|'all'|'none', visibleNets?: [ids],
 *   highlights?: {dims, extremes, flylines, coords, scanUpto, neutral:{net,pin}, ghost, perimeter:{full,half}, euclid, lpath, dimAlpha}
 * }
 */
export function Board(view, {width = 900, height = 900, interactive = false, id = 'board', lang = 'zh', focusCell = null, compact = false} = {}) {
  const t = L[lang] ?? L.zh;
  const hl = view.highlights ?? {};
  const g = geometry(view.bounds, boardGeometryOptions(width, height, compact));
  const {s, toScreen} = g;
  const b = view.bounds;
  const parts = [];
  const fs = compact ? 0.8 : 1;

  // grid + axes
  const grid = [];
  for (let x = Math.ceil(b.xmin); x <= b.xmax; x++) { const p = toScreen({x, y: b.ymin}), q = toScreen({x, y: b.ymax}); grid.push(`M${n2(p.x)} ${n2(p.y)}V${n2(q.y)}`); }
  for (let y = Math.ceil(b.ymin); y <= b.ymax; y++) { const p = toScreen({x: b.xmin, y}), q = toScreen({x: b.xmax, y}); grid.push(`M${n2(p.x)} ${n2(p.y)}H${n2(q.x)}`); }
  const o = toScreen({x: b.xmin, y: b.ymin}), xe = toScreen({x: b.xmax, y: b.ymin}), ye = toScreen({x: b.xmin, y: b.ymax});
  parts.push(`<rect width="${width}" height="${height}" rx="14" fill="${THEME.bg}" stroke="${THEME.line}" stroke-width="1.5"/>`);
  parts.push(`<path d="${grid.join('')}" stroke="${THEME.grid}" stroke-width="1" fill="none"/>`);
  if (hl.city) { // city blocks between the streets (grid lines); pins sit on street corners
    const blocks = [];
    for (let x = Math.ceil(b.xmin); x < b.xmax; x++) for (let y = Math.ceil(b.ymin); y < b.ymax; y++) {
      const a = toScreen({x: x + 0.16, y: y + 0.84}), c = toScreen({x: x + 0.84, y: y + 0.16});
      blocks.push(`<rect x="${n2(a.x)}" y="${n2(a.y)}" width="${n2(c.x - a.x)}" height="${n2(c.y - a.y)}" rx="3"/>`);
    }
    parts.push(`<g fill="#10303a" fill-opacity=".85" stroke="#1d3e48" stroke-width="1">${blocks.join('')}</g>`);
  }
  parts.push(`<path d="M${n2(o.x)} ${n2(o.y)}H${n2(xe.x + 18)}M${n2(o.x)} ${n2(o.y)}V${n2(ye.y - 18)}" stroke="${THEME.axis}" stroke-width="1.6" fill="none"/>`);
  parts.push(`<path d="M${n2(xe.x + 18)} ${n2(o.y)}l-9 -5v10zM${n2(o.x)} ${n2(ye.y - 18)}l-5 9h10z" fill="${THEME.axis}"/>`);
  const tick = [];
  const stepLabel = (b.xmax - b.xmin) > 9 ? 2 : 1;
  for (let x = Math.ceil(b.xmin); x <= b.xmax; x += stepLabel) { const p = toScreen({x, y: b.ymin}); tick.push(`<text x="${n2(p.x)}" y="${n2(p.y + 26 * fs)}" text-anchor="middle">${x}</text>`); }
  for (let y = Math.ceil(b.ymin); y <= b.ymax; y += stepLabel) { const p = toScreen({x: b.xmin, y}); tick.push(`<text x="${n2(p.x - 14 * fs)}" y="${n2(p.y + 6)}" text-anchor="end">${y}</text>`); }
  parts.push(`<g fill="${THEME.tick}" font-size="${18 * fs}" font-family="var(--mono)">${tick.join('')}<text x="${n2(xe.x + 22)}" y="${n2(o.y + 6)}" font-style="italic">x</text><text x="${n2(o.x - 6)}" y="${n2(ye.y - 26)}" font-style="italic" text-anchor="middle">y</text></g>`);

  const nets = view.nets.filter(n => !view.visibleNets || view.visibleNets.includes(n.id));
  const boxes = Object.fromEntries(nets.map(n => [n.id, netBox(n, view.positions)]));
  const netIndex = Object.fromEntries(view.nets.map((n, i) => [n.id, i]));
  const sel = view.selectedNet && boxes[view.selectedNet] ? boxes[view.selectedNet] : null;

  // neutral region for an interior move
  if (hl.neutral) {
    const net = view.nets.find(n => n.id === hl.neutral.net);
    const r = net && neutralRegion(net, view.positions, hl.neutral.pin);
    if (r) {
      const a = toScreen({x: r.minX, y: r.maxY}), c = toScreen({x: r.maxX, y: r.minY});
      parts.push(`<rect x="${n2(a.x)}" y="${n2(a.y)}" width="${n2(c.x - a.x)}" height="${n2(c.y - a.y)}" fill="${THEME.sage}" fill-opacity=".12" stroke="${THEME.sage}" stroke-opacity=".7" stroke-dasharray="4 6" stroke-width="2"/>`);
      if (!compact) parts.push(`<text x="${n2(a.x + 10)}" y="${n2(c.y - 12)}" fill="${THEME.sage}" font-size="19">${escapeText(t.neutral)}</text>`);
    }
  }

  // flylines: connectivity only (two-pin nets as straight dotted lines; multi-pin nets as a star to the first pin)
  if (hl.flylines) {
    const fl = [];
    for (const n of nets) {
      const pins = n.pins.map(p => toScreen(view.positions[p]));
      for (let i = 1; i < pins.length; i++) fl.push(`<path d="M${n2(pins[0].x)} ${n2(pins[0].y)}L${n2(pins[i].x)} ${n2(pins[i].y)}" stroke="${netColor(n.id, netIndex[n.id])}"/>`);
    }
    parts.push(`<g stroke-width="2" stroke-dasharray="3 7" stroke-opacity="${hl.flylines === true ? 0.55 : hl.flylines}" fill="none">${fl.join('')}</g>`);
  }

  // bounding boxes (labels avoid each other and the cells)
  const rCell = Math.max(15, Math.min(27, s * 0.3)) + 4;
  const labelRects = view.cells.map(c => { const p = toScreen(view.positions[c]); return [p.x - rCell, p.y - rCell, p.x + rCell, p.y + rCell]; });
  const drawBox = (bx, i, strong) => {
    const a = toScreen({x: bx.minX, y: bx.maxY}), c = toScreen({x: bx.maxX, y: bx.minY});
    const col = netColor(bx.id, i);
    const w = Math.max(0, c.x - a.x), h = Math.max(0, c.y - a.y);
    const op = strong ? 1 : 0.55;
    let out = `<rect x="${n2(a.x)}" y="${n2(a.y)}" width="${n2(w)}" height="${n2(h)}" fill="${col}" fill-opacity="${strong ? 0.1 : 0.04}" stroke="${col}" stroke-opacity="${op}" stroke-width="${strong ? 3.5 : 2}" ${strong ? '' : 'stroke-dasharray="8 6"'}/>`;
    if (w < 1 && h < 1) out += `<circle cx="${n2(a.x)}" cy="${n2(a.y)}" r="${strong ? 9 : 6}" fill="none" stroke="${col}" stroke-width="2"/>`;
    if ((strong || view.showBoxes === 'all') && !hl.tiny) {
      const label = `${bx.id} = ${fmt(bx.hpwl)}`;
      const size = (strong ? 21 : 17) * fs, lw = label.length * size * 0.62, lh = size * 1.1;
      // Try label slots around the box and keep the first one that does not collide with earlier labels or cells.
      const slots = [[a.x + 4, a.y - 8, 'start'], [c.x - 4, a.y - 8, 'end'], [a.x + 4, c.y + size + 4, 'start'], [c.x - 4, c.y + size + 4, 'end'],
        [a.x + 4, a.y + size + 4, 'start'], [c.x - 4, c.y - 8, 'end'], [a.x + 4, a.y - 8 - lh, 'start'], [a.x + 4, c.y + size + 4 + lh, 'start']];
      let pick = slots[0];
      for (const sl of slots) {
        const x0 = sl[2] === 'end' ? sl[0] - lw : sl[0], rect = [x0, sl[1] - size, x0 + lw, sl[1] + 3];
        const hit = labelRects.some(r => rect[0] < r[2] && rect[2] > r[0] && rect[1] < r[3] && rect[3] > r[1]);
        if (!hit) { pick = sl; break; }
      }
      const x0 = pick[2] === 'end' ? pick[0] - lw : pick[0];
      labelRects.push([x0, pick[1] - size, x0 + lw, pick[1] + 3]);
      out += `<text x="${n2(pick[0])}" y="${n2(pick[1])}" text-anchor="${pick[2]}" fill="${col}" fill-opacity="${op}" font-size="${size}" font-weight="${strong ? 700 : 500}" font-family="var(--mono)">${escapeText(label)}</text>`;
    }
    return out;
  };
  if (view.showBoxes === 'all') nets.forEach(n => { if (n.id !== view.selectedNet) parts.push(drawBox(boxes[n.id], netIndex[n.id], false)); });
  if (sel && view.showBoxes !== 'none' && hl.scanUpto === undefined) parts.push(drawBox(sel, netIndex[sel.id], true));

  // step-by-step scan: partial box of the pins read so far
  if (sel && hl.scanUpto !== undefined) {
    const read = sel.pins.slice(0, Math.max(0, Math.min(sel.pins.length, hl.scanUpto)));
    if (read.length) parts.push(drawBox(netBox({id: sel.id, pins: read}, view.positions), netIndex[sel.id], true));
  }

  // perimeter vs half perimeter
  if (sel && hl.perimeter) {
    const a = toScreen({x: sel.minX, y: sel.maxY}), c = toScreen({x: sel.maxX, y: sel.minY});
    const per = 2 * ((c.x - a.x) + (c.y - a.y));
    parts.push(`<path d="M${n2(a.x)} ${n2(c.y)}H${n2(c.x)}V${n2(a.y)}H${n2(a.x)}Z" fill="none" stroke="${THEME.ink}" stroke-opacity=".45" stroke-width="4" stroke-dasharray="${n2(per * (hl.perimeter.full ?? 0))} ${n2(per + 10)}"/>`);
    const half = (c.x - a.x) + (c.y - a.y);
    parts.push(`<path d="M${n2(a.x)} ${n2(c.y)}H${n2(c.x)}V${n2(a.y)}" fill="none" stroke="${THEME.gold}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${n2(half * (hl.perimeter.half ?? 0))} ${n2(half + 10)}"/>`);
  }

  // two-pin extras: straight-line distance and one L path
  if (hl.euclid && sel && sel.pins.length === 2) {
    const [p, q] = sel.pins.map(id => view.positions[id]); const a = toScreen(p), c = toScreen(q);
    parts.push(`<path d="M${n2(a.x)} ${n2(a.y)}L${n2(c.x)} ${n2(c.y)}" stroke="${THEME.rose}" stroke-width="3" stroke-dasharray="10 8" opacity="${hl.euclid}"/>`);
    parts.push(`<text x="${n2((a.x + c.x) / 2 - 16)}" y="${n2((a.y + c.y) / 2 - 14)}" fill="${THEME.rose}" font-size="${20 * fs}" text-anchor="end" opacity="${hl.euclid}">${escapeText(t.euclid)} ${fmt(euclidean(p, q))} ✗</text>`);
  }
  if (hl.lpath && sel && sel.pins.length === 2) {
    const [p, q] = sel.pins.map(id => view.positions[id]); const a = toScreen(p), c = toScreen(q);
    const len = Math.abs(c.x - a.x) + Math.abs(c.y - a.y);
    parts.push(`<path d="M${n2(a.x)} ${n2(a.y)}H${n2(c.x)}V${n2(c.y)}" fill="none" stroke="${THEME.gold}" stroke-width="5" stroke-dasharray="${n2(len * hl.lpath)} ${n2(len + 10)}"/>`);
    if (hl.lpath >= 1 && !compact) parts.push(`<text x="${n2(c.x + 14)}" y="${n2((a.y + c.y) / 2 + 30)}" fill="${THEME.gold}" font-size="19">${escapeText(t.lpath)}</text>`);
  }

  // dimensions of the selected box
  if (sel && hl.dims) {
    const a = toScreen({x: sel.minX, y: sel.maxY}), c = toScreen({x: sel.maxX, y: sel.minY});
    const col = THEME.ink, yb = c.y + 46 * fs, xl = a.x - 46 * fs;
    parts.push(`<g stroke="${col}" stroke-width="2" fill="none" opacity="${hl.dims}"><path d="M${n2(a.x)} ${n2(c.y + 8)}V${n2(yb + 8)}M${n2(c.x)} ${n2(c.y + 8)}V${n2(yb + 8)}M${n2(a.x)} ${n2(yb)}H${n2(c.x)}"/><path d="M${n2(a.x - 8)} ${n2(a.y)}H${n2(xl - 8)}M${n2(a.x - 8)} ${n2(c.y)}H${n2(xl - 8)}M${n2(xl)} ${n2(a.y)}V${n2(c.y)}"/></g>`);
    parts.push(`<g fill="${col}" font-size="${22 * fs}" font-family="var(--mono)" opacity="${hl.dims}"><text x="${n2((a.x + c.x) / 2)}" y="${n2(yb - 10)}" text-anchor="middle">${escapeText(t.width)} ${fmt(sel.width)}</text><text x="${n2(xl - 12)}" y="${n2((a.y + c.y) / 2 + 7)}" text-anchor="end">${escapeText(t.height)} ${fmt(sel.height)}</text></g>`);
  }

  // projections of the extreme pins onto the axes
  if (sel && hl.extremes) {
    const pr = [], lab = [];
    const ext = sel.extremes;
    for (const [key, axis] of [['minX', 'x'], ['maxX', 'x'], ['minY', 'y'], ['maxY', 'y']]) {
      const v = sel[key];
      // Guide lines run across the whole grid; labels sit at the top (x) and right (y) ends, clear of the box labels.
      const lo = toScreen({x: axis === 'x' ? v : b.xmin, y: axis === 'x' ? b.ymin : v});
      const hi = toScreen({x: axis === 'x' ? v : b.xmax, y: axis === 'x' ? b.ymax : v});
      pr.push(axis === 'x' ? `M${n2(lo.x)} ${n2(lo.y)}V${n2(hi.y)}` : `M${n2(lo.x)} ${n2(lo.y)}H${n2(hi.x)}`);
      const txt = `${key.startsWith('min') ? 'min' : 'max'} ${axis} = ${fmt(v)}${compact ? '' : ' (' + ext[key].join(',') + ')'}`;
      lab.push(axis === 'x'
        ? `<text x="${n2(hi.x)}" y="${n2(hi.y - (key === 'minX' ? 58 : 36) * fs)}" text-anchor="middle">${txt}</text>`
        : `<text x="${n2(hi.x + 8)}" y="${n2(hi.y + (key === 'minY' ? 16 : -6))}">${txt}</text>`);
    }
    parts.push(`<path d="${pr.join('')}" stroke="${THEME.gold}" stroke-opacity="${0.45 * hl.extremes}" stroke-width="1.5" stroke-dasharray="4 7" fill="none"/>`);
    parts.push(`<g fill="${THEME.gold}" font-size="${17 * fs}" font-family="var(--mono)" opacity="${hl.extremes}">${lab.join('')}</g>`);
  }

  // 1x1 footprints (teaching proxy for cell area)
  if (view.footprint) {
    const bad = new Set(footprintOverlaps(view.positions, view.cells).flatMap(o => o.pair));
    const fp = view.cells.map(c => {
      const p = view.positions[c], a = toScreen({x: p.x - 0.5, y: p.y + 0.5});
      return `<rect x="${n2(a.x)}" y="${n2(a.y)}" width="${n2(s)}" height="${n2(s)}" rx="4" fill="${bad.has(c) ? THEME.rose : cellColor(c)}" fill-opacity="${bad.has(c) ? 0.22 : 0.12}" stroke="${bad.has(c) ? THEME.rose : cellColor(c)}" stroke-width="2"/>`;
    });
    parts.push(`<g opacity="${view.footprint === true ? 1 : view.footprint}">${fp.join('')}</g>`);
  }

  // ghost (previous) positions
  if (hl.ghost) {
    parts.push(`<g opacity=".35">${Object.entries(hl.ghost).map(([c, p]) => { const q = toScreen(p); return `<circle cx="${n2(q.x)}" cy="${n2(q.y)}" r="14" fill="none" stroke="${cellColor(c)}" stroke-width="2" stroke-dasharray="3 4"/>`; }).join('')}</g>`);
  }

  // cells
  const r = Math.max(15, Math.min(27, s * 0.3)) * (compact ? 0.85 : 1);
  const selPins = sel ? new Set(sel.pins) : null;
  const scanRead = sel && hl.scanUpto !== undefined ? new Set(sel.pins.slice(0, hl.scanUpto)) : null;
  const scanCur = sel && hl.scanUpto !== undefined ? sel.pins[hl.scanUpto - 1] : null;
  const stackCount = {};
  for (const [a, c] of coincidentPairs(view.positions, view.cells)) { stackCount[a] = (stackCount[a] ?? 1); stackCount[c] = (stackCount[c] ?? 1); }
  const order = [...view.cells].sort((a, c) => (a === focusCell) - (c === focusCell));
  const cellsSvg = order.map(c => {
    const p = toScreen(view.positions[c]);
    if (hl.tiny) return `<circle cx="${n2(p.x)}" cy="${n2(p.y)}" r="4.5" fill="${THEME.node}" stroke="${selPins?.has(c) ? THEME.gold : THEME.teal}" stroke-opacity="${selPins?.has(c) ? 1 : 0.7}" stroke-width="1.6"/>`;
    const locked = isLocked(view, c), pad = (view.fixed ?? []).includes(c);
    let dim = selPins && hl.dimOthers !== false && !selPins.has(c) ? 0.35 : 1;
    if (scanRead && selPins.has(c) && !scanRead.has(c)) dim = 0.45;
    if (hl.appear !== undefined) dim *= hl.appear;
    const pulseRing = hl.pulse ? `<circle r="${n2(r + 8 + 10 * hl.pulse)}" fill="none" stroke="${THEME.gold}" stroke-opacity="${n2(0.8 * (1 - hl.pulse))}" stroke-width="2"/>` : '';
    const ring = locked
      ? `<rect x="${n2(-r - 6)}" y="${n2(-r - 6)}" width="${n2(2 * r + 12)}" height="${n2(2 * r + 12)}" rx="6" fill="none" stroke="${THEME.ink}" stroke-width="2.5"/>`
      : pad ? `<circle r="${n2(r + 6)}" fill="none" stroke="${THEME.ink}" stroke-opacity=".55" stroke-width="1.6" stroke-dasharray="4 4"/>` : '';
    const scanRing = c === scanCur ? `<circle r="${n2(r + 11)}" fill="none" stroke="${THEME.gold}" stroke-width="3.5"/>` : '';
    const lock = locked ? `<g transform="translate(${n2(r * 0.75)} ${n2(-r * 0.75)})"><rect x="-8" y="-3" width="16" height="12" rx="2" fill="${THEME.gold}"/><path d="M-5 -3v-4a5 5 0 0 1 10 0v4" fill="none" stroke="${THEME.gold}" stroke-width="2.5"/></g>` : '';
    const coord = hl.coords ? `<text x="${n2(r + 8)}" y="${n2(r + 20)}" fill="${THEME.muted}" font-size="${18 * fs}" font-family="var(--mono)">(${fmt(view.positions[c].x)}, ${fmt(view.positions[c].y)})</text>` : '';
    const attrs = interactive
      ? ` data-cell="${c}" tabindex="${c === focusCell ? 0 : -1}" role="button" aria-label="${escapeText(`${c} (${fmt(view.positions[c].x)}, ${fmt(view.positions[c].y)})${locked ? ' ' + t.fixedPad : ''}`)}" class="cell${locked ? ' locked' : ''}${c === focusCell ? ' focus' : ''}"`
      : ' class="cell"';
    return `<g${attrs} transform="translate(${n2(p.x)} ${n2(p.y)})" opacity="${n2(dim)}">${pulseRing}${scanRing}${ring}<circle r="${n2(r + 5)}" fill="none" stroke="${cellColor(c)}" stroke-opacity=".18" stroke-width="6"/><circle r="${n2(r)}" fill="${THEME.node}" stroke="${cellColor(c)}" stroke-width="2.6"/><text y="${n2(r * 0.36)}" text-anchor="middle" fill="${cellColor(c)}" font-size="${n2(r * 1.05)}" font-weight="500" font-family="var(--serif)">${c}</text>${lock}${coord}</g>`;
  });
  parts.push(cellsSvg.join(''));
  const stacked = Object.keys(stackCount);
  if (stacked.length >= 3) {
    const p = toScreen(view.positions[stacked[0]]);
    parts.push(`<g transform="translate(${n2(p.x + r + 10)} ${n2(p.y - r - 10)})"><rect x="0" y="-24" width="${compact ? 92 : 128}" height="34" rx="17" fill="none" stroke="${THEME.rose}" stroke-width="2"/><text x="${compact ? 46 : 64}" y="0" text-anchor="middle" fill="${THEME.rose}" font-size="${19 * fs}" font-weight="500">${escapeText(t.stacked)} ×${new Set(stacked).size}</text></g>`);
  }

  // mode tag
  if (view.showMode) parts.push(`<text x="${width - 18}" y="34" text-anchor="end" fill="${view.mode === 'fixed' ? THEME.gold : THEME.muted}" font-size="${19 * fs}">${escapeText(view.mode === 'fixed' ? t.fixed : t.free)}</text>`);
  if (hl.legend) parts.push(`<text x="18" y="34" fill="${THEME.muted}" font-size="${18 * fs}">${escapeText(t.notWire)}</text>`);

  return `<svg id="${escapeText(id)}" class="shared-board" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeText(t.board)}" font-family="var(--sans)">${parts.join('')}</svg>`;
}
