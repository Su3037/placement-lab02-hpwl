// Film scene composition: board(s) + panel + caption for one semantic state. Used by render.html
// (frame export) and by the in-page scene preview. Pure string output from state; no timing logic here.
import {Board, escapeText as E, netColor, cellColor} from './board.js';
import {fmt} from './domain.js';

const TXT = {
  zh: {
    brand: 'Su3037 · Placement Lab 02', titleSub: '半周长线长：一个估计，以及它的边界', titleTags: ['单元', '线网', '包围盒', '宽 + 高'],
    notes: {
      problem: ['布局：决定每个单元的位置', '布线：画出真实导线（慢，代价高）', 'HPWL：布局阶段的快速线长估计'],
      coords: ['引脚看成点 (x, y)', '单位：抽象网格单位', 'x 向右，y 向上', '真实单元有面积（方块仅为示意）'],
    },
    width: '宽', height: '高', pins: '引脚', net: '线网', total: '总和', hpwl: 'HPWL', step: '读取', changed: '更新', none: '不变',
    euclidNot: '直线距离 = √(4² + 3²) = 5，不是 HPWL',
    names: ['HPWL = 宽 + 高', '周长 = 2 ×（宽 + 高）', '两两距离之和（clique）', '真实导线长度：布线后才知道'],
    move: {from: '相对起点', unchanged: '不变', pin: '引脚'},
    table: {net: '线网', pins: '引脚', value: 'HPWL', before: '移动前', now: '现在'},
    compare: {starter: '起始布局', compact: '紧凑参考', drop: '少 38 个坐标单位：两个布局的比较，不是优化过程', pads: '固定焊盘 A、D 被移动：只是自由点测量'},
    weights: {w: '权重', wh: '权重 × HPWL', unweighted: '普通总和', weighted: '加权总和', note: '加权是可选扩展，HPWL 定义不变'},
    collapse: {coincident: '重合的单元对', overlap: '1 × 1 方块重叠的对', judge: '最低分 ≠ 可用布局'},
    fixed: {anchors: 'A (0, 0)、D (8, 8) 固定', bound: '下限', point: '点模型', foot: '1 × 1 方块不重叠', now: '当前', overlaps: '重叠对'},
    code: ['validate(nets, pos)   // 未知引脚 / 空线网 / 非有限坐标 → 报错', 'total ← 0', 'for net in nets:', '    xs, ys ← net 中引脚的 x, y', '    total ← total + (max xs − min xs) + (max ys − min ys)', 'return total'],
    summary: ['HPWL = 宽 + 高 = 包围盒周长的一半；多引脚线网只算一个盒子', '移动极值引脚会改变盒子；内部移动不改变该线网，却可能改变别的线网', '低 HPWL 不能单独证明布局合法、可用：先检查约束'],
    sampleTag: '',
    story: {
      hook: ['四家店 P、Q、R、S', '街道只有横、竖两个方向', '最少要多长的光纤？'],
      box: ['最小的框：把四家店都框住', '宽 + 高 = 周长的一半'],
      chip: ['约 100 个线网（示意）', '每个盒子：一次遍历', '不看拥挤与时序', '下限式的估计', '与约束一起用', '100 个引脚呢？'],
    },
    end: {lab: '实验台 · 挑战 · Python 练习', site: 'su3037.github.io/placement-lab02-hpwl', credit: '音乐：We Never (Remix)（若如初见）· Hi Noise / 秋成 · 不属于本课程授权'},
  },
  en: {
    brand: 'Su3037 · Placement Lab 02', titleSub: 'Half-perimeter wirelength: an estimate and its limits', titleTags: ['cells', 'nets', 'bounding box', 'width + height'],
    notes: {
      problem: ['Placement: where each cell goes', 'Routing: draws the real wires (slow, costly)', 'HPWL: a fast wirelength estimate during placement'],
      coords: ['Pins are points (x, y)', 'Units: abstract grid units', 'x grows right, y grows up', 'Real cells have area (squares are illustrative)'],
    },
    width: 'width', height: 'height', pins: 'pins', net: 'net', total: 'total', hpwl: 'HPWL', step: 'read', changed: 'updates', none: 'no change',
    euclidNot: 'straight line = √(4² + 3²) = 5, not HPWL',
    names: ['HPWL = width + height', 'perimeter = 2 × (width + height)', 'all-pairs sum (clique)', 'real wire length: known only after routing'],
    move: {from: 'vs. start', unchanged: 'unchanged', pin: 'pin'},
    table: {net: 'net', pins: 'pins', value: 'HPWL', before: 'before', now: 'now'},
    compare: {starter: 'starter', compact: 'compact reference', drop: '38 coordinate units less: a comparison of two placements, not an optimization run', pads: 'fixed pads A and D moved: a free-point measurement only'},
    weights: {w: 'weight', wh: 'weight × HPWL', unweighted: 'plain total', weighted: 'weighted total', note: 'Weighting is an optional extension; HPWL is unchanged'},
    collapse: {coincident: 'coincident cell pairs', overlap: 'overlapping 1 × 1 pairs', judge: 'lowest score ≠ usable placement'},
    fixed: {anchors: 'A (0, 0) and D (8, 8) fixed', bound: 'bound', point: 'point model', foot: 'non-overlapping 1 × 1', now: 'now', overlaps: 'overlapping pairs'},
    code: ['validate(nets, pos)   // unknown pin / empty net / non-finite → error', 'total ← 0', 'for net in nets:', '    xs, ys ← x and y of the net’s pins', '    total ← total + (max xs − min xs) + (max ys − min ys)', 'return total'],
    summary: ['HPWL = width + height = half the box perimeter; a multi-pin net is one box', 'Moving an extreme pin changes the box; an interior move keeps that net but may change others', 'A low HPWL alone does not prove a placement legal or usable: check constraints first'],
    story: {
      hook: ['Four shops: P, Q, R, S', 'Streets run only across and up', 'How much fibre at least?'],
      box: ['The smallest box around all four', 'width + height = half the perimeter'],
      chip: ['about 100 nets (illustration)', 'each box: one pass', 'blind to congestion and timing', 'a lower-bound estimate', 'used together with constraints', 'and with 100 pins?'],
    },
    end: {lab: 'Lab · Challenges · Python practice', site: 'su3037.github.io/placement-lab02-hpwl', credit: 'Music: We Never (Remix) · Hi Noise / Qiucheng · not covered by the course licence'},
  },
};

const tag = (id, i) => `<span class="nettag" style="--c:${netColor(id, i)}">${E(id)}</span>`;
const ctag = id => `<span class="celltag" style="--c:${cellColor(id)}">${E(id)}</span>`;
const num = v => `<b class="num">${fmt(v)}</b>`;
const pinsOf = (state, id) => state.board.nets.find(n => n.id === id).pins;

function boxLines(t, b) { return kvLines(b) + eqLines(t, b); }
function kvLines(b) {
  return `<div class="kv"><span>min x = ${num(b.minX)} <small>${b.extremes.minX.map(ctag).join('')}</small></span><span>max x = ${num(b.maxX)} <small>${b.extremes.maxX.map(ctag).join('')}</small></span>
  <span>min y = ${num(b.minY)} <small>${b.extremes.minY.map(ctag).join('')}</small></span><span>max y = ${num(b.maxY)} <small>${b.extremes.maxY.map(ctag).join('')}</small></span></div>`;
}
function eqLines(t, b) {
  return `<div class="eq">${t.width} = ${fmt(b.maxX)} − ${fmt(b.minX)} = ${num(b.width)}</div><div class="eq">${t.height} = ${fmt(b.maxY)} − ${fmt(b.minY)} = ${num(b.height)}</div>
  <div class="eq big">HPWL = ${fmt(b.width)} + ${fmt(b.height)} = ${num(b.hpwl)}</div>`;
}

const WALK = {zh: {step: (i, n) => `第 ${i} 步，共 9 步`, missing: '（实验台截图尚未录制：运行 scripts/record-walk.mjs）'}, en: {step: (i, n) => `Step ${i} of 9`, missing: '(Lab screenshots not recorded yet: run scripts/record-walk.mjs)'}};
const CURSOR = '<path d="M0 0 L0 30 L8 23 L13.5 35 L18.5 33 L13 21.5 L23 21.5 Z" fill="#fffdf8" stroke="#0b1b1f" stroke-width="2" stroke-linejoin="round"/>';
function walkStage(state, lang) {
  const w = state.walk;
  if (!w) return `<div class="walk-stage"><div class="walk-missing">${E(WALK[lang].missing)}</div></div>`;
  const W = 1380, H = Math.round(W * w.viewport.h / w.viewport.w), k = W / w.viewport.w;
  const [cx, cy] = w.cursor ?? [w.viewport.w / 2, w.viewport.h / 2];
  const ring = w.click == null ? '' : `<circle cx="${(cx * k).toFixed(1)}" cy="${(cy * k).toFixed(1)}" r="${(10 + 34 * w.click).toFixed(1)}" fill="none" stroke="#ddbd78" stroke-width="3" opacity="${(1 - w.click).toFixed(3)}"/>`;
  return `<div class="walk-stage"><div class="walk-chrome"><i></i><i></i><i></i><span>su3037.github.io/placement-lab02-hpwl/${lang === 'en' ? '?lang=en' : ''}</span></div>
    <div class="walk-shot" style="width:${W}px;height:${H}px"><img src="${E(w.img)}" width="${W}" height="${H}" alt="">
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${ring}<g transform="translate(${(cx * k).toFixed(1)} ${(cy * k).toFixed(1)})">${CURSOR}</g></svg></div></div>`;
}

const PANELS = {
  walk: (s, t) => `<p class="walk-step num">${E(WALK[s.lang].step(Number(s.panel.step.slice(1)), 9))}</p>`,
  title(s, t) {
    const words = s.lang === 'zh' ? ['半', '周', '长', '线', '长'] : ['Half-', 'perimeter ', 'wire', 'length'];
    // Music-locked assembly (story film): drum hit i reveals piece i (title pieces, then HPWL, then the subtitle).
    const n = s.panel.shown === undefined ? Infinity : s.panel.shown;
    const head = words.map((w, i) => `<span class="${i < n ? 'on' : 'off'}">${E(w)}</span>`).join('');
    const on = i => (n > i ? 1 : 0);
    return `<div class="title-card"><div class="kicker">${E(s.filmTitle)}</div><h1>${head}</h1><div class="hpwl" style="opacity:${on(words.length)}">HPWL</div>
    <p style="opacity:${on(words.length + 1)}">${E(t.titleSub)}</p></div>`;
  },
  story: (s, t) => `<ul class="story">${t.story[s.panel.set].map((x, i) => `<li class="${i < s.panel.reveal ? 'on' : 'off'}">${E(x)}</li>`).join('')}</ul>${s.panel.set === 'box' && s.panel.reveal >= 2 ? `<div class="eq big">${fmt(s.metrics.selected.width)} + ${fmt(s.metrics.selected.height)} = ${num(s.metrics.selected.hpwl)}</div>` : ''}`,
  end: (s, t) => `<div class="end-card"><div class="kicker">${E(s.filmTitle)}</div><h1>${E(t.end.lab)}</h1><p class="site">${E(t.end.site)}</p><p class="credit ${s.panel.credit ? 'on' : 'off'}">${E(t.end.credit)}</p></div>`,
  notes: (s, t) => `<ul class="notes">${t.notes[s.panel.set].map((x, i) => `<li class="${i < (s.panel.set === 'coords' ? (s.panel.reveal === 1 ? 3 : 4) : s.panel.reveal) ? 'on' : 'off'}">${E(x)}</li>`).join('')}</ul>`,
  net(s, t) {
    const b = s.metrics.selected;
    let out = `<div class="pinlist">${b.pins.map(p => `${ctag(p)} (${fmt(s.board.positions[p].x)}, ${fmt(s.board.positions[p].y)})`).join('<br>')}</div>`;
    out += s.panel.formula ? boxLines(t, b) : kvLines(b);
    if (s.panel.euclid) out += `<div class="warn">✗ ${E(t.euclidNot)}</div>`;
    return out;
  },
  scan(s, t) {
    const sc = s.scan, upto = s.panel.upto;
    const rows = sc.steps.map((st, i) => `<tr class="${i < upto ? (i === upto - 1 && !s.panel.formula ? 'cur' : 'on') : 'off'}"><td>${ctag(st.pin)}</td><td>(${fmt(st.x)}, ${fmt(st.y)})</td><td>${i < upto ? (st.changed.length ? st.changed.join(', ') : t.none) : ''}</td></tr>`).join('');
    const last = sc.steps[Math.max(0, upto - 1)];
    const run = upto > 0 ? `<div class="kv"><span>x: [${num(last.minX)}, ${num(last.maxX)}]</span><span>y: [${num(last.minY)}, ${num(last.maxY)}]</span></div>` : '';
    return `<table class="tbl"><tr><th>${t.step}</th><th>(x, y)</th><th>${t.changed}</th></tr>${rows}</table>${run}${s.panel.formula ? `<div class="eq">${t.width} = ${fmt(last.maxX)} − ${fmt(last.minX)} = ${num(last.maxX - last.minX)}</div><div class="eq">${t.height} = ${fmt(last.maxY)} − ${fmt(last.minY)} = ${num(last.maxY - last.minY)}</div><div class="eq big">HPWL = ${num(sc.hpwl)}</div>` : ''}`;
  },
  names(s, t) {
    const b = s.metrics.selected;
    const rows = [[t.names[0], `${fmt(b.width)} + ${fmt(b.height)} = ${fmt(b.hpwl)}`, true], [t.names[1], `2 × ${fmt(b.hpwl)} = ${fmt(2 * b.hpwl)}`, false], [t.names[2], `${fmt(s.clique)}`, false], [t.names[3], '?', false]];
    return `<div class="names">${rows.map(([k, v, ok], i) => `<div class="${i === 0 || s.panel.reveal >= 2 ? 'on' : 'off'} ${ok ? 'ok' : 'bad'}"><span class="mark">${ok ? '✓' : '✗'}</span><span>${E(k)}</span><b class="num">${E(v)}</b></div>`).join('')}</div>`;
  },
  move(s, t) {
    const b = s.box, ref = s.reference;
    const refN = ref.nets.find(n => n.id === b.id);
    const delta = b.hpwl - refN.hpwl;
    let out = `<div class="sub">${tag(b.id, 0)} = {${b.pins.join(', ')}} · ${t.move.pin} ${ctag(s.panel.focus)} (${fmt(s.board.positions[s.panel.focus].x)}, ${fmt(s.board.positions[s.panel.focus].y)})</div>${boxLines(t, b)}`;
    out += `<div class="delta">${t.move.from} ${fmt(refN.hpwl)} → ${fmt(b.hpwl)} ${Math.abs(delta) < 1e-9 ? `(${t.move.unchanged})` : `(${delta > 0 ? '+' : '−'}${fmt(Math.abs(delta))})`}</div>`;
    const others = s.metrics.nets.filter(n => n.id !== b.id);
    out += `<div class="others ${s.panel.showN2 === false ? 'dim' : ''}">${others.map((n, i) => `${tag(n.id, i + 1)} = ${num(n.hpwl)} <small>(${t.move.from} ${fmt(ref.nets.find(r => r.id === n.id).hpwl)})</small>`).join('<br>')}<br>${t.total} = ${num(s.metrics.total)} <small>(${t.move.from} ${fmt(ref.total)})</small></div>`;
    return out;
  },
  table(s, t) {
    const ref = s.reference;
    const rows = s.metrics.nets.map((n, i) => {
      const shown = i < s.panel.reveal;
      const r = ref?.nets[i];
      const changed = r && Math.abs(r.hpwl - n.hpwl) > 1e-9;
      return `<tr class="${n.id === s.panel.active ? 'cur' : shown ? 'on' : 'off'}${changed ? ' chg' : ''}"><td>${tag(n.id, i)}</td><td>${n.pins.join(' ')}</td>${ref ? `<td>${fmt(r.hpwl)}</td>` : ''}<td>${shown ? num(n.hpwl) : '·'}</td></tr>`;
    }).join('');
    const tot = s.panel.total ? `<tr class="sum"><td colspan="2">${t.total}</td>${ref ? `<td>${fmt(ref.total)}</td>` : ''}<td>${num(s.metrics.total)}</td></tr>` : '';
    const sumExpr = s.panel.total && !ref ? `<div class="eq big">${s.metrics.nets.map(n => fmt(n.hpwl)).join(' + ')} = ${num(s.metrics.total)}</div>` : '';
    return `<table class="tbl"><tr><th>${t.table.net}</th><th>${t.table.pins}</th>${ref ? `<th>${t.table.before}</th><th>${t.table.now}</th>` : `<th>${t.table.value}</th>`}</tr>${rows}${tot}</table>${sumExpr}`;
  },
  compare(s, t) {
    const [a, b] = s.boardsMetrics;
    const rows = a.nets.map((n, i) => `<tr class="on"><td>${tag(n.id, i)}</td><td>${num(n.hpwl)}</td><td>${num(b.nets[i].hpwl)}</td></tr>`).join('');
    return `<table class="tbl"><tr><th>${t.table.net}</th><th>${t.compare.starter}</th><th>${t.compare.compact}</th></tr>${rows}<tr class="sum"><td>${t.total}</td><td>${num(a.total)}</td><td>${num(b.total)}</td></tr></table>
    <div class="note ${s.panel.showDrop ? 'on' : 'off'}">${E(t.compare.drop)}</div><div class="warn ${s.panel.highlightPads ? 'on' : 'off'}">A (0, 0) → (2, 2) · D (8, 8) → (4, 4)<br>${E(t.compare.pads)}</div>`;
  },
  weights(s, t) {
    const [a, b] = s.weightedRows;
    const rows = a.nets.map((n, i) => `<tr class="${n.weight !== 1 ? 'cur' : 'on'}"><td>${tag(n.id, i)}</td><td>${n.weight}</td><td>${n.weight} × ${fmt(n.hpwl)} = ${num(n.weight * n.hpwl)}</td><td>${n.weight} × ${fmt(b.nets[i].hpwl)} = ${num(n.weight * b.nets[i].hpwl)}</td></tr>`).join('');
    const sums = s.panel.sums ? `<tr class="sum"><td colspan="2">${t.weights.unweighted}</td><td>${num(a.total)}</td><td>${num(b.total)}</td></tr><tr class="sum"><td colspan="2">${t.weights.weighted}</td><td>${num(a.weightedTotal)}</td><td>${num(b.weightedTotal)}</td></tr>` : '';
    return `<table class="tbl"><tr><th>${t.table.net}</th><th>${t.weights.w}</th><th>${t.compare.starter}</th><th>${t.compare.compact}</th></tr>${rows}${sums}</table><div class="note on">${E(t.weights.note)}</div>`;
  },
  collapse(s, t) {
    const m = s.metrics;
    return `<div class="eq big">HPWL = ${m.nets.map(n => fmt(n.hpwl)).join(' + ')} = ${num(m.total)}</div>
    <div class="kv"><span>${t.collapse.coincident}: ${num(m.coincident.length)} / 15</span><span class="${s.panel.showOverlap ? 'on' : 'off'}">${t.collapse.overlap}: ${num(m.overlaps.length)} / 15</span></div>
    <div class="warn ${s.panel.judge ? 'on' : 'off'}">${E(t.collapse.judge)}</div>`;
  },
  fixed(s, t) {
    const m = s.metrics, h = id => m.nets.find(n => n.id === id).hpwl;
    return `<div class="sub">🔒 ${E(t.fixed.anchors)}</div>
    <table class="tbl"><tr><th></th><th>${t.fixed.bound}</th><th>${t.fixed.now}</th></tr>
    <tr class="on"><td>${tag('ABCD', 4)}</td><td>≥ 16</td><td>${num(h('ABCD'))}</td></tr>
    <tr class="on"><td>${tag('AB', 0)} + ${tag('BD', 3)}</td><td>≥ 16</td><td>${num(h('AB') + h('BD'))}</td></tr>
    <tr class="on"><td>${tag('AC', 2)} + ${tag('CD', 1)}</td><td>≥ 16</td><td>${num(h('AC') + h('CD'))}</td></tr>
    <tr class="${s.panel.bound ? 'on' : 'off'}"><td>${tag('EF', 5)}</td><td>≥ 0 / ≥ 1</td><td>${num(h('EF'))}</td></tr>
    <tr class="sum"><td>${t.total}</td><td>${s.panel.bound ? '48 / 49' : '·'}</td><td>${num(m.total)}</td></tr></table>
    <div class="kv ${s.panel.bound ? 'on' : 'off'}"><span>${t.fixed.point}: 48</span><span>${t.fixed.foot}: 49</span><span>${t.fixed.overlaps}: ${num(m.overlaps.length)}</span></div>`;
  },
  code(s, t) {
    const active = {0: [0], 2: [2, 3, 4], 4: [5]}[s.panel.line];
    const code = t.code.map((line, i) => `<div class="${active.includes(i) ? 'hl' : ''}"><i>${i + 1}</i>${E(line)}</div>`).join('');
    const nets = s.metrics.nets.slice(0, s.panel.upto);
    const run = nets.length ? `<div class="eq">total = ${nets.map(n => fmt(n.hpwl)).join(' + ')} = ${num(nets.reduce((a, n) => a + n.hpwl, 0))}</div>` : '';
    return `<pre class="code">${code}</pre>${run}`;
  },
  summary: (s, t) => `<ol class="summary">${t.summary.map((x, i) => `<li class="${i < s.panel.reveal ? 'on' : 'off'}">${E(x)}</li>`).join('')}</ol>`,
};

export function Scene(state, script, {lang = 'zh', captions = true} = {}) {
  const t = TXT[lang];
  const cue = script.cues[state.cueIndex];
  const chapter = script.chapters[state.chapter][lang];
  const s = {...state, lang, filmTitle: script.title[lang]};
  let boards;
  if (state.panel.kind === 'walk') {
    boards = walkStage(state, lang);
  } else if (state.boards) {
    boards = `<div class="boards two">${state.boards.map((b, i) => `<figure><figcaption>${i === 0 ? t.compare.starter : t.compare.compact} · ${t.total} ${fmt(state.boardsMetrics[i].total)}</figcaption>${Board(b, {width: 560, height: 560, id: `film-board-${i}`, lang, compact: true})}</figure>`).join('')}</div>`;
  } else if (state.layout === 'wide') {
    boards = `<div class="boards wide">${Board(state.board, {width: 1160, height: 820, id: 'film-board', lang})}</div>`;
  } else {
    boards = `<div class="boards one ${state.layout === 'title' ? 'faded' : ''}">${Board(state.board, {width: 840, height: 840, id: 'film-board', lang})}</div>`;
  }
  const panel = PANELS[state.panel.kind](s, t);
  // Chinese version: Chinese line with the English line small and italic under it. English version: English only.
  const cap = captions && state.caption ? `<div class="caption"><div class="shade"></div><p class="main">${E(state.caption[lang])}</p>${lang === 'zh' && state.caption.en ? `<p class="second">${E(state.caption.en)}</p>` : ''}</div>` : '';
  const narrow = state.boards || state.layout === 'wide';
  const walkLayout = state.panel.kind === 'walk' ? ' walk' : '';
  return `<section class="film-frame layout-${state.layout}" data-cue="${state.cueId}" lang="${lang === 'zh' ? 'zh-CN' : 'en'}"><header><span class="brand">${E(t.brand)}</span><span class="chap">${E(chapter)}</span><span class="film">${E(script.title[lang].split(' · ')[0])}</span></header>${boards}<div class="panel ${narrow ? 'narrow' : ''}${walkLayout}"><h2>${E(cue.title[lang])}</h2>${panel}</div>${cap}</section>`;
}
