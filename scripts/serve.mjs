// Minimal static server with HTTP Range support (video seeking) and an optional path prefix, so the site can
// be tested both at "/" and at the GitHub Pages subpath "/placement-lab02-hpwl/".
//   node scripts/serve.mjs [port] [prefix]      e.g. node scripts/serve.mjs 8800 /placement-lab02-hpwl/
import {createServer} from 'node:http';
import {createReadStream, statSync} from 'node:fs';
import {join, normalize, extname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.vtt': 'text/vtt; charset=utf-8', '.mp4': 'video/mp4', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.zip': 'application/zip', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', '.py': 'text/x-python; charset=utf-8'};

export function startServer({root = fileURLToPath(new URL('../site/', import.meta.url)), port = 0, prefix = '/'} = {}) {
  const base = resolve(root);
  const pre = prefix.endsWith('/') ? prefix : prefix + '/';
  const server = createServer((req, res) => {
    let url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (pre !== '/' && url === pre.slice(0, -1)) { res.writeHead(301, {Location: pre}); return res.end(); }
    if (!url.startsWith(pre)) { res.writeHead(404); return res.end('outside prefix'); }
    url = url.slice(pre.length - 1);
    if (url.endsWith('/')) url += 'index.html';
    const file = normalize(join(base, url));
    if (!file.startsWith(base)) { res.writeHead(403); return res.end(); }
    let st;
    try { st = statSync(file); } catch { res.writeHead(404, {'Content-Type': 'text/plain'}); return res.end('not found'); }
    if (st.isDirectory()) { res.writeHead(301, {Location: req.url.replace(/\/?$/, '/')}); return res.end(); }
    const type = TYPES[extname(file)] ?? 'application/octet-stream';
    const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
    if (range) {
      const start = range[1] ? Number(range[1]) : st.size - Number(range[2]);
      const end = range[1] && range[2] ? Math.min(Number(range[2]), st.size - 1) : st.size - 1;
      if (start > end || start >= st.size) { res.writeHead(416, {'Content-Range': `bytes */${st.size}`}); return res.end(); }
      res.writeHead(206, {'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Cache-Control': 'no-store'});
      return createReadStream(file, {start, end}).pipe(res);
    }
    res.writeHead(200, {'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store'});
    if (req.method === 'HEAD') return res.end();
    createReadStream(file).pipe(res);
  });
  return new Promise(ok => server.listen(port, '127.0.0.1', () => ok({server, url: `http://127.0.0.1:${server.address().port}${pre}`, close: () => new Promise(r => server.close(r))})));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const port = Number(process.argv[2] ?? 8800), prefix = process.argv[3] ?? '/placement-lab02-hpwl/';
  startServer({port, prefix}).then(s => console.log(`serving site/ at ${s.url}`));
}
