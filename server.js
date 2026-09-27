// Zero-dependency static server for Sort Arena.
// Usage: node server.js [--open]   (PORT env var overrides the default 5173)

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), 'public');
const START_PORT = Number(process.env.PORT) || 5173;
const HOST = '127.0.0.1';
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

const server = createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = normalize(join(ROOT, pathname));
    if (!file.startsWith(ROOT + sep)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' }).end('Forbidden');
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch (err) {
    const status = err.code === 'ENOENT' || err.code === 'EISDIR' ? 404 : 500;
    res.writeHead(status, { 'Content-Type': 'text/plain' }).end(status === 404 ? 'Not found' : 'Server error');
  }
});

function openBrowser(url) {
  const cmd =
    process.platform === 'win32' ? `start "" "${url}"` :
    process.platform === 'darwin' ? `open "${url}"` :
    `xdg-open "${url}"`;
  exec(cmd, () => {});
}

function listen(port, retries = 10) {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && retries > 0) listen(port + 1, retries - 1);
    else throw err;
  });
  server.listen(port, HOST, () => {
    const url = `http://localhost:${port}`;
    console.log('\n  🔒  SORT//ARENA is locked in\n');
    console.log(`  ➜  ${url}\n`);
    console.log('  Ctrl+C to stop\n');
    if (process.argv.includes('--open')) openBrowser(url);
  });
}

listen(START_PORT);
