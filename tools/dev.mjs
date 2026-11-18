#!/usr/bin/env node
// `npm start` from colony-tracker/: the whole GM workspace in one terminal.
//   1. checks Node and installs client/ and adventure/ packages if missing
//   2. starts the API in Docker (docker-compose.yml, API only, detached)
//   3. runs the Angular dev server (4200) and the adventure book (4321)
// Ctrl+C stops the app and the book. The API container keeps running, as in the
// usual dev workflow. `npm run stop` stops it too.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const color = (code) => (s) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
const C = { api: color(36), app: color(35), book: color(33), dim: color(2), bold: color(1), red: color(31), green: color(32) };
const say = (msg) => console.log(`${C.bold('[start]')} ${msg}`);
const fail = (msg) => {
  console.error(`${C.red('[start]')} ${msg}`);
  process.exit(1);
};

// ---------------------------------------------------------------- 1. Node + packages
const [maj, min, pat] = process.versions.node.split('.').map(Number);
// Both must be satisfied: the Angular CLI (22.22.3+ or 24.15+) and Astro, which builds the book (22.23.4+).
const nodeOk = maj > 24 || (maj === 24 && min >= 15) || (maj === 22 && (min > 23 || (min === 23 && pat >= 4)));
if (!nodeOk) fail(`Node ${process.versions.node} is too old: the app needs 22.22.3+ or 24.15+ and the book (Astro) 22.23.4+. Run "nvm use" here (the .nvmrc says 24), then npm start again.`);

for (const [dir, extra] of [['client', ['--legacy-peer-deps']], ['adventure', []]]) {
  if (fs.existsSync(path.join(ROOT, dir, 'node_modules'))) continue;
  say(`installing ${dir}/ packages (first run)…`);
  const r = spawnSync('npm', ['install', '--no-fund', '--no-audit', ...extra], { cwd: path.join(ROOT, dir), stdio: 'inherit' });
  if (r.status !== 0) fail(`npm install failed in ${dir}/`);
}

// ---------------------------------------------------------------- 2. ports free?
const inUse = (port) =>
  new Promise((resolve) => {
    const s = net.connect({ port, host: '127.0.0.1' });
    s.once('connect', () => (s.destroy(), resolve(true)));
    s.once('error', () => resolve(false));
  });
for (const [port, what] of [[4200, 'the app (ng serve)'], [4321, 'the book (npm run serve)']]) {
  if (await inUse(port)) fail(`Port ${port} is already in use: is ${what} already running in another terminal?`);
}

// ---------------------------------------------------------------- 3. API in Docker
// --no-api (npm run start:web): you're running the API yourself, e.g. `cd server && dotnet run`.
if (process.argv.includes('--no-api')) say('skipping Docker (--no-api); expecting the API on http://localhost:5000');
else startApi();

function startApi() {
say('starting the API in Docker…');
// --build: pick up server code changes (Docker's layer cache makes it quick when nothing changed).
const docker = spawnSync('docker', ['compose', 'up', '-d', '--build'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
if (docker.error || docker.status !== 0) {
  fail(`could not start the API with Docker.\n${(docker.stderr || docker.error?.message || '').trim()}\nIs Docker Desktop running? To run the API without Docker, use "cd server && dotnet run" and "npm run start:web".`);
}
for (const line of `${docker.stdout}${docker.stderr}`.split('\n').filter(Boolean)) console.log(`${C.api('[api] ')} ${line.trim()}`);
}

// ---------------------------------------------------------------- 4. app + book
startWeb();

function startWeb() {
  const procs = [];
  const ready = { app: false, book: false };
  let announced = false;
  const announce = () => {
    if (announced || !ready.app || !ready.book) return;
    announced = true;
    console.log(
      `\n${C.green('Ready.')}\n` +
        `  App   http://localhost:4200/\n` +
        `  Book  http://localhost:4200/docs/\n` +
        `  API   http://localhost:5000/\n` +
        C.dim('  Saving a book file rebuilds it (~2s); refresh to see it. Ctrl+C stops the app and the book.\n'),
    );
  };

  const run = (name, cwd, args, isReady) => {
    const child = spawn('npm', args, { cwd: path.join(ROOT, cwd), stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, FORCE_COLOR: '1' } });
    const tag = C[name](`[${name}]`.padEnd(6));
    const pipe = (stream) => {
      let buf = '';
      stream.on('data', (d) => {
        buf += d;
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          console.log(`${tag} ${line}`);
          if (!ready[name] && isReady(line.replace(/\x1b\[[0-9;]*m/g, ''))) {
            ready[name] = true;
            announce();
          }
        }
      });
    };
    pipe(child.stdout);
    pipe(child.stderr);
    child.on('exit', (code, signal) => {
      if (shuttingDown) return;
      console.log(`${tag} exited (${signal ?? code}); stopping the rest.`);
      shutdown(code ?? 1);
    });
    procs.push(child);
  };

  let shuttingDown = false;
  const shutdown = (code = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const p of procs) if (p.exitCode === null) p.kill('SIGTERM');
    setTimeout(() => process.exit(code), 500);
  };
  process.on('SIGINT', () => {
    console.log(`\n${C.bold('[start]')} stopping the app and the book (the API keeps running; "npm run stop" stops it).`);
    shutdown(0);
  });
  process.on('SIGTERM', () => shutdown(0));

  run('app', 'client', ['start'], (l) => /Local:\s+http/.test(l));
  run('book', 'adventure', ['run', 'serve'], (l) => /✓ built in/.test(l) || /✗ build failed/.test(l));
}
