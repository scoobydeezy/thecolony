#!/usr/bin/env node
// Integrated mode: build the GM book, serve dist/ at http://localhost:4321/docs/
// exactly as nginx will in production (try $uri, $uri/index.html, else 404.html),
// and rebuild whenever content or code changes. The Angular dev server proxies
// /docs here (client/proxy.conf.json), so the book and the app share one origin.
//
// Unlike `astro dev`, every page is a real build: search works, cross-file
// references are always fresh, and nothing loads from outside /docs/.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ROOT } from '../src/lib/registry.mjs';

const PORT = Number(process.env.PORT ?? 4321);
const BASE = '/docs';
const DIST = path.join(ROOT, 'dist');
const WATCH = ['src', 'sources', 'public', 'astro.config.mjs'];

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',   // player handout downloads
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

// ---------------------------------------------------------------- build loop
let building = false;
let again = false;
let lastOk = false;
// The editor (§16) asks /docs/__build whether a build that started after its save has finished.
const buildStatus = { building: false, startedAt: 0, finishedAt: 0, ok: false, errors: [] };

function build(reason) {
  if (building) {
    again = true;
    return;
  }
  building = true;
  const started = Date.now();
  Object.assign(buildStatus, { building: true, startedAt: started });
  console.log(`\n⟳ building (${reason})…`);
  const child = spawn('npm', ['run', '--silent', 'build'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  child.on('close', (code) => {
    building = false;
    lastOk = code === 0;
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    if (lastOk) {
      const summary = log.split('\n').filter((l) => /✓ (validate|privacy)/.test(l));
      console.log(`✓ built in ${secs}s  ${summary.map((s) => s.replace(/^.*?✓ /, '')).join(' · ')}`);
    } else {
      // Show only the useful part of a failure; the previous good build keeps being served.
      const lines = log.split('\n').filter((l) => /✗|^\s+- |\[ERROR\]|Error:/.test(l));
      console.log(`✗ build failed after ${secs}s — still serving the last good build\n${(lines.length ? lines : log.split('\n').slice(-25)).join('\n')}`);
    }
    buildStatus.building = false;
    buildStatus.finishedAt = Date.now();
    buildStatus.ok = lastOk;
    buildStatus.errors = lastOk ? [] : log.split('\n').filter((l) => /✗|^\s+- |\[ERROR\]|Error:/.test(l)).slice(0, 30);
    if (again) {
      again = false;
      build('more changes');
    }
  });
}

let timer = null;
for (const entry of WATCH) {
  const full = path.join(ROOT, entry);
  if (!fs.existsSync(full)) continue;
  fs.watch(full, { recursive: true }, (_event, file) => {
    if (file && /(^|\/)\.|~$/.test(String(file))) return;
    clearTimeout(timer);
    timer = setTimeout(() => build(path.join(entry, String(file ?? ''))), 300);
  });
}

// ---------------------------------------------------------------- static server
function resolveFile(urlPath) {
  const rel = decodeURIComponent(urlPath.slice(BASE.length)) || '/';
  const safe = path.normalize(rel).replace(/^(\.\.[/\\])+/, '');
  const candidates = safe.endsWith('/') ? [path.join(DIST, safe, 'index.html')] : [path.join(DIST, safe), path.join(DIST, safe, 'index.html')];
  return candidates.find((c) => c.startsWith(DIST) && fs.existsSync(c) && fs.statSync(c).isFile());
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === `${BASE}/__build`) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify(buildStatus));
      return;
    }
    if (url.pathname === BASE) {
      res.writeHead(301, { Location: `${BASE}/` }).end();
      return;
    }
    if (!url.pathname.startsWith(`${BASE}/`)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not part of the book');
      return;
    }
    let file = resolveFile(url.pathname);
    let status = 200;
    if (!file) {
      status = 404;
      file = path.join(DIST, '404.html');
      if (!fs.existsSync(file)) {
        res.writeHead(503, { 'Content-Type': 'text/plain' }).end('The book has not been built yet.');
        return;
      }
    }
    res.writeHead(status, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => {
    console.log(`Book: http://localhost:${PORT}${BASE}/   (through the app: http://localhost:4200${BASE}/)`);
    console.log(`Watching ${WATCH.join(', ')} — saves trigger a rebuild. Ctrl+C to stop.`);
    build('start');
  });
