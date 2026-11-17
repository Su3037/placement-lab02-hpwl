// Deterministic local build (no network): data, the four films' clocks, captions, chapters, transcripts,
// slides (PDF/JPG/PPTX), Python zip.
//   node scripts/build.mjs [--no-slides]
// Film rendering is separate (node scripts/render.mjs --film <id> --lang <zh|en> --full) because it takes minutes;
// the lab walkthrough screenshots come from node scripts/record-walk.mjs.
import {copyFileSync, mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const run = (cmd, args) => { console.log(`$ ${cmd} ${args.join(' ')}`); const r = spawnSync(cmd, args, {cwd: ROOT, stdio: 'inherit'}); if (r.status !== 0) process.exit(r.status ?? 1); };
mkdirSync(`${ROOT}site/data`, {recursive: true});
copyFileSync(`${ROOT}fixtures/hpwl-fixtures.json`, `${ROOT}site/data/fixtures.json`);
copyFileSync(`${ROOT}content/slides.json`, `${ROOT}site/data/slides.json`);
run('node', ['scripts/build-films.mjs', ...(process.argv.includes('--draft') ? ['--draft'] : [])]);
run('python3', ['scripts/build-python-zip.py']);
if (!process.argv.includes('--no-slides')) {
  run('node', ['scripts/build-slides.mjs']);
  run('python3', ['scripts/build_pptx.py']);
}
console.log('build done');
