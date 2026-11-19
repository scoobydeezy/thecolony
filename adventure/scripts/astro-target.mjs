#!/usr/bin/env node
// Set the build target without shell-specific environment assignment (Windows and Unix).
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [target, ...args] = process.argv.slice(2);
if (!['gm', 'designer'].includes(target) || !args.length) {
  console.error('Usage: node scripts/astro-target.mjs <gm|designer> <astro command> [options]');
  process.exit(1);
}
const result = spawnSync(process.execPath, [fileURLToPath(new URL('../node_modules/astro/bin/astro.mjs', import.meta.url)), ...args], {
  stdio: 'inherit',
  env: { ...process.env, BOOK_TARGET: target },
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
