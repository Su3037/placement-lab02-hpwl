// Generate seeded random instances, evaluate them with site/js/domain.js, and write the results
// for tests/test_python.py to compare against the independent Python reference.
//   node scripts/crosscheck-gen.mjs [out.json] [count] [seed]
import {writeFileSync, mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {evaluate} from '../site/js/domain.js';

const out = process.argv[2] ?? 'build/crosscheck.json';
const count = Number(process.argv[3] ?? 300);
let seed = Number(process.argv[4] ?? 20261117) >>> 0;
// mulberry32: fixed-seed PRNG so the instances are reproducible.
const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const cases = [];
for (let i = 0; i < count; i++) {
  const nCells = 1 + Math.floor(rnd() * 9);
  const cells = Array.from({length: nCells}, (_, k) => `c${k}`);
  const integer = rnd() < 0.5;
  const coord = () => integer ? Math.floor(rnd() * 21) - 10 : (rnd() * 200 - 100) / 7;
  const positions = Object.fromEntries(cells.map(c => [c, {x: coord(), y: coord()}]));
  const nets = Array.from({length: 1 + Math.floor(rnd() * 6)}, () => {
    const pool = cells.filter(() => rnd() < 0.6);
    return pool.length ? pool : [cells[0]];
  });
  const weights = nets.map(() => Math.floor(rnd() * 6));
  const ev = evaluate(nets.map((pins, k) => ({id: `n${k}`, pins, weight: weights[k]})), positions);
  cases.push({nets, positions, weights, perNet: ev.nets.map(n => n.hpwl), total: ev.total, weightedTotal: ev.weightedTotal});
}
mkdirSync(dirname(out), {recursive: true});
writeFileSync(out, JSON.stringify({seed: Number(process.argv[4] ?? 20261117), count, cases}));
console.log(`wrote ${count} cases to ${out}`);
