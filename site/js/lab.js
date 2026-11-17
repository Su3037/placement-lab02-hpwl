// Live HPWL lab. Draws with the shared Board() and recomputes with domain.js after every edit.
import {Board, geometry, boardGeometryOptions, netColor, escapeText as E} from './board.js';
import {makeState, moveCell, setMode, analyse, scanTrace, clone, fmt, isLocked} from './domain.js';
import {setupState} from './grade.js';

const W = 900, H = 900;

export function createLab(root, {fixtures, text, lang, onChange = () => {}}) {
  const L = text.lab;
  let st = makeState(fixtures.teacher, 'starter', {selectedNet: 'ABCD'});
  let ui = {showAll: true, scanUpto: undefined, focusCell: 'B', snap: 0.5, message: '', banner: '', challenge: null};
  const undo = [], redo = [];

  root.innerHTML = `
  <div class="lab-controls">
    <label>${L.fixture} <select data-k="fixture">${Object.values(fixtures).map(f => `<option value="${f.id}">${E(f.title[lang])}</option>`).join('')}</select></label>
    <span class="presets" data-k="presets"></span>
    <fieldset class="mode"><legend>${L.mode}</legend><label><input type="radio" name="lab-mode" value="free"> ${L.free}</label><label><input type="radio" name="lab-mode" value="fixed"> ${L.fixed}</label></fieldset>
    <label><input type="checkbox" data-k="showAll"> ${L.boxes}</label>
    <label><input type="checkbox" data-k="weighted"> ${L.weighted}</label>
    <label><input type="checkbox" data-k="footprint"> ${L.footprint}</label>
    <label>${L.snap} <select data-k="snap"><option value="1">1</option><option value="0.5">0.5</option><option value="0.25">0.25</option><option value="0">${L.snapOff}</option></select></label>
  </div>
  <div class="lab-banner" data-k="banner" hidden></div>
  <div class="lab-main">
    <div class="lab-board" data-k="board"></div>
    <div class="lab-side">
      <div class="lab-total" data-k="total"></div>
      <div class="lab-nets" data-k="nets" role="group" aria-label="${E(L.net)}"></div>
      <div class="lab-formula" data-k="formula"></div>
      <div class="lab-row"><button type="button" data-a="scan">${L.scan}</button><span data-k="scanlog" class="scanlog"></span></div>
      <div class="lab-row cell-edit"><label>${L.cell} <select data-k="cell"></select></label>
        <label>${L.x} <input data-k="x" type="number" step="0.25" inputmode="decimal"></label><label>${L.y} <input data-k="y" type="number" step="0.25" inputmode="decimal"></label>
        <button type="button" data-a="apply">${L.apply}</button></div>
      <div class="lab-row"><button type="button" data-a="undo">${L.undo}</button><button type="button" data-a="redo">${L.redo}</button><button type="button" data-a="reset">${L.reset}</button><button type="button" data-a="export">${L.export}</button></div>
      <p class="lab-status" data-k="status" aria-live="polite"></p>
      <div class="table-wrap"><table class="contrib" data-k="table"></table></div>
    </div>
  </div>`;
  const $ = k => root.querySelector(`[data-k="${k}"]`);
  const boardEl = $('board');

  function commit(next, message = '') {
    undo.push(clone(st)); if (undo.length > 200) undo.shift();
    redo.length = 0;
    st = next; ui.message = message; ui.scanUpto = undefined;
    render();
  }

  function view() {
    return {...st, showBoxes: ui.showAll ? 'all' : 'selected', showMode: (st.fixed ?? []).length > 0,
      highlights: {dims: 1, extremes: 1, coords: true, dimOthers: false, scanUpto: ui.scanUpto}};
  }

  function render(keepFocus = false) {
    const a = analyse(st);
    const hadFocus = keepFocus || (document.activeElement && boardEl.contains(document.activeElement));
    boardEl.innerHTML = Board(view(), {width: W, height: H, interactive: true, id: 'lab-board-svg', lang, focusCell: ui.focusCell});
    if (hadFocus) boardEl.querySelector(`[data-cell="${ui.focusCell}"]`)?.focus({preventScroll: true});
    // controls reflect state
    $('fixture').value = st.fixtureId;
    const fx = fixtures[st.fixtureId];
    $('presets').innerHTML = Object.keys(fx.placements).map(p => `<button type="button" data-preset="${p}" class="${st.placement === p ? 'on' : ''}">${p}</button>`).join('');
    root.querySelectorAll('input[name="lab-mode"]').forEach(r => { r.checked = r.value === st.mode; r.disabled = !st.fixed.length; });
    $('showAll').checked = ui.showAll; $('weighted').checked = st.weighted; $('footprint').checked = st.footprint; $('snap').value = String(ui.snap);
    $('nets').innerHTML = st.nets.map((n, i) => `<button type="button" data-net="${n.id}" aria-pressed="${n.id === st.selectedNet}" style="--c:${netColor(n.id, i)}">${n.id}</button>`).join('');
    $('cell').innerHTML = st.cells.map(c => `<option ${c === ui.focusCell ? 'selected' : ''}>${c}</option>`).join('');
    const p = st.positions[ui.focusCell];
    if (document.activeElement !== $('x')) $('x').value = p ? +p.x.toFixed(4) : '';
    if (document.activeElement !== $('y')) $('y').value = p ? +p.y.toFixed(4) : '';
    const sel = a.selected;
    $('total').innerHTML = `<span>${L.total}</span><b>${fmt(a.total, 4)}</b>${st.weighted ? `<span>${L.weightedTotal}</span><b>${fmt(a.weightedTotal, 4)}</b>` : ''}`;
    $('formula').innerHTML = sel ? `<b style="color:${netColor(sel.id)}">${sel.id}</b> = (${fmt(sel.maxX)} − ${fmt(sel.minX)}) + (${fmt(sel.maxY)} − ${fmt(sel.minY)}) = <b>${fmt(sel.hpwl, 4)}</b>
      <div class="ext">min x: ${sel.extremes.minX.join(', ')} · max x: ${sel.extremes.maxX.join(', ')} · min y: ${sel.extremes.minY.join(', ')} · max y: ${sel.extremes.maxY.join(', ')}${sel.interior.length ? ` · interior: ${sel.interior.join(', ')}` : ''}</div>` : '';
    const th = text.th;
    $('table').innerHTML = `<thead><tr><th>${th.net}</th><th>${th.pins}</th><th>x</th><th>y</th><th>${th.w}</th><th>${th.h}</th><th>${th.hpwl}</th>${st.weighted ? `<th>${th.weight}</th><th>${th.wh}</th>` : ''}</tr></thead><tbody>${a.nets.map((n, i) => `<tr data-net="${n.id}" class="${n.id === st.selectedNet ? 'sel' : ''}"><td><span class="nettag" style="--c:${netColor(n.id, i)}">${n.id}</span></td><td>${n.pins.join(' ')}</td><td>[${fmt(n.minX)}, ${fmt(n.maxX)}]</td><td>[${fmt(n.minY)}, ${fmt(n.maxY)}]</td><td>${fmt(n.width)}</td><td>${fmt(n.height)}</td><td><b>${fmt(n.hpwl, 4)}</b></td>${st.weighted ? `<td>${n.weight}</td><td>${fmt(n.weight * n.hpwl, 4)}</td>` : ''}</tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="6">${L.total}</td><td><b>${fmt(a.total, 4)}</b></td>${st.weighted ? `<td></td><td><b>${fmt(a.weightedTotal, 4)}</b></td>` : ''}</tr></tfoot>`;
    const status = [];
    if (ui.message) status.push(ui.message);
    status.push(L.live(fmt(a.total, 4), sel?.id ?? '-', sel ? fmt(sel.hpwl, 4) : '-'));
    if (a.coincident.length) status.push(`${L.coincident}: ${a.coincident.length}`);
    if (st.footprint) status.push(`${L.overlaps}: ${a.overlaps.length}`);
    $('status').textContent = status.join(' · ');
    const banner = [ui.banner, ui.challenge ? L.challenge(text.ch[ui.challenge].title) : ''].filter(Boolean).join(' ');
    $('banner').hidden = !banner; $('banner').textContent = banner;
    onChange(st);
  }

  // ---- pointer drag (mouse, pen, touch) ----
  let drag = null;
  const toWorld = (clientX, clientY) => {
    const svg = boardEl.querySelector('svg');
    const pt = svg.createSVGPoint(); pt.x = clientX; pt.y = clientY;
    const q = pt.matrixTransform(svg.getScreenCTM().inverse());
    return geometry(st.bounds, boardGeometryOptions(W, H)).toWorld(q);
  };
  const snap = v => (ui.snap > 0 ? Math.round(v / ui.snap) * ui.snap : v);
  boardEl.addEventListener('pointerdown', e => {
    const g = e.target.closest('[data-cell]'); if (!g) return;
    const c = g.dataset.cell; ui.focusCell = c;
    if (isLocked(st, c)) { ui.message = L.locked(c); render(true); return; }
    drag = {cell: c, before: clone(st), id: e.pointerId};
    try { boardEl.setPointerCapture(e.pointerId); } catch { /* pointer already released: dragging still works via bubbling */ }
    e.preventDefault();
    render(true);
  });
  boardEl.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const w = toWorld(e.clientX, e.clientY);
    const r = moveCell(st, drag.cell, {x: snap(w.x), y: snap(w.y)});
    if (r.ok) { st = r.state; ui.scanUpto = undefined; ui.message = ''; render(true); }
  });
  const endDrag = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const before = drag.before; drag = null;
    if (JSON.stringify(before.positions) !== JSON.stringify(st.positions)) {
      undo.push(before); redo.length = 0;
      const d = analyse(st).total - analyse(before).total;
      ui.message = `${Math.abs(d) < 1e-9 ? '±0' : (d > 0 ? '+' : '−') + fmt(Math.abs(d), 4)}`;
      render(true);
    }
  };
  boardEl.addEventListener('pointerup', endDrag);
  boardEl.addEventListener('pointercancel', endDrag);

  // ---- keyboard ----
  boardEl.addEventListener('keydown', e => {
    const g = e.target.closest('[data-cell]'); if (!g) return;
    const c = g.dataset.cell;
    const step = e.shiftKey ? 0.25 : e.altKey ? 1 : (ui.snap || 0.25);
    const dir = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1]}[e.key];
    if (dir) {
      e.preventDefault();
      const p = st.positions[c];
      const r = moveCell(st, c, {x: p.x + dir[0] * step, y: p.y + dir[1] * step});
      ui.focusCell = c;
      if (!r.ok) { ui.message = r.reason === 'fixed-anchor' ? L.locked(c) : r.reason; render(true); }
      else commit(r.state, r.reason === 'clamped' ? L.clamped : '');
      boardEl.querySelector(`[data-cell="${c}"]`)?.focus({preventScroll: true});
    } else if (e.key === 'Tab' && !e.shiftKey && st.cells.indexOf(c) < st.cells.length - 1 || e.key === 'Tab' && e.shiftKey && st.cells.indexOf(c) > 0) {
      e.preventDefault();
      ui.focusCell = st.cells[st.cells.indexOf(c) + (e.shiftKey ? -1 : 1)];
      render(true);
    }
  });
  boardEl.addEventListener('focusin', e => { const g = e.target.closest('[data-cell]'); if (g && g.dataset.cell !== ui.focusCell) { ui.focusCell = g.dataset.cell; render(true); } });

  // ---- controls ----
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !root.contains(b)) return;
    if (b.dataset.preset) { const s = makeState(fixtures[st.fixtureId], b.dataset.preset, {mode: st.mode, weighted: st.weighted, footprint: st.footprint, selectedNet: st.selectedNet}); ui.banner = ''; return commit(s); }
    if (b.dataset.net) { st = {...st, selectedNet: b.dataset.net}; ui.scanUpto = undefined; return render(); }
    const a = b.dataset.a;
    if (a === 'undo' && undo.length) { redo.push(clone(st)); st = undo.pop(); ui.message = ''; render(); }
    if (a === 'redo' && redo.length) { undo.push(clone(st)); st = redo.pop(); ui.message = ''; render(); }
    if (a === 'reset') { ui.banner = ''; const ch = ui.challenge; commit(ch ? setupState(fixtures, {...challengeSpec}) : makeState(fixtures[st.fixtureId], Object.keys(fixtures[st.fixtureId].placements)[0], {selectedNet: st.selectedNet})); }
    if (a === 'scan') {
      const net = st.nets.find(n => n.id === st.selectedNet); if (!net) return;
      const tr = scanTrace(net, st.positions);
      ui.scanUpto = ui.scanUpto === undefined ? 1 : ui.scanUpto + 1;
      if (ui.scanUpto > tr.steps.length) { ui.scanUpto = undefined; $('scanlog').textContent = ''; return render(); }
      const s = tr.steps[ui.scanUpto - 1];
      $('scanlog').textContent = L.scanStep(ui.scanUpto, tr.steps.length, s.pin, s.changed) + ` → (${fmt(s.maxX)} − ${fmt(s.minX)}) + (${fmt(s.maxY)} − ${fmt(s.minY)}) = ${fmt(s.partial)}`;
      render();
    }
    if (a === 'apply') {
      const r = moveCell(st, ui.focusCell, {x: Number($('x').value), y: Number($('y').value)});
      if (!r.ok) { ui.message = r.reason === 'fixed-anchor' ? L.locked(ui.focusCell) : r.reason; render(); } else commit(r.state, r.reason === 'clamped' ? L.clamped : '');
    }
    if (a === 'export') {
      const json = JSON.stringify({fixtureId: st.fixtureId, mode: st.mode, weighted: st.weighted, selectedNet: st.selectedNet, positions: st.positions, total: analyse(st).total}, null, 1);
      try { navigator.clipboard.writeText(json).then(() => { ui.message = L.copied; render(); }, () => {}); } catch { /* clipboard unavailable */ }
    }
  });
  let challengeSpec = null;
  $('table').addEventListener('click', e => { const tr = e.target.closest('tr[data-net]'); if (tr) { st = {...st, selectedNet: tr.dataset.net}; render(); } });
  $('fixture').addEventListener('change', e => { const fx = fixtures[e.target.value]; ui.challenge = null; ui.banner = ''; ui.focusCell = fx.cells[1] ?? fx.cells[0]; commit(makeState(fx, Object.keys(fx.placements)[0], {selectedNet: fx.nets[0].id})); });
  $('cell').addEventListener('change', e => { ui.focusCell = e.target.value; render(); });
  $('showAll').addEventListener('change', e => { ui.showAll = e.target.checked; render(); });
  $('weighted').addEventListener('change', e => { st = {...st, weighted: e.target.checked}; render(); });
  $('footprint').addEventListener('change', e => { st = {...st, footprint: e.target.checked}; render(); });
  $('snap').addEventListener('change', e => { ui.snap = Number(e.target.value); render(); });
  root.querySelectorAll('input[name="lab-mode"]').forEach(r => r.addEventListener('change', e => {
    const fx = fixtures[st.fixtureId];
    const seats = fx.placements.starter ?? fx.placements[Object.keys(fx.placements)[0]];
    const res = setMode(st, e.target.value, seats);
    commit(res.state, res.displacedAnchors.length ? L.displaced(res.displacedAnchors.join(', ')) : '');
  }));

  render();
  return {
    getState: () => clone(st),
    /** Take the film's actual state (positions, mode, net, flags). Nothing is replaced by a preset. */
    load(h) {
      const fx = fixtures[h.fixtureId];
      const s = makeState(fx, Object.keys(fx.placements)[0], {positions: clone(h.positions), placement: 'film', mode: h.mode, weighted: h.weighted, footprint: h.footprint, selectedNet: h.selectedNet, fixed: [...h.fixed]});
      ui.challenge = null; challengeSpec = null;
      ui.banner = L.fromFilm(h.time, h.cueId) + (h.intermediate ? ' ' + L.intermediate : '');
      ui.focusCell = fx.cells.includes(ui.focusCell) ? ui.focusCell : fx.cells[0];
      commit(s);
    },
    setup(ch) {
      challengeSpec = ch; ui.challenge = ch.id; ui.banner = '';
      const s = setupState(fixtures, ch);
      ui.focusCell = ch.fixture === 'multi' ? 'S' : 'B';
      ui.showAll = true;
      commit(s);
    },
    activeChallenge: () => ui.challenge,
  };
}
