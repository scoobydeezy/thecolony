#!/usr/bin/env node
// Fails the GM build if anything designer-only reached it: designer pages,
// designer markup, designer notes (frontmatter `design:` or :::design blocks),
// or production status. Scans HTML, JSON, XML, text and Pagefind fragments.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { listFiles, parseEntityFile, CONTENT_DIR, ROOT, rel } from '../src/lib/registry.mjs';

const dist = path.resolve(ROOT, process.argv[2] ?? 'dist');
if (!fs.existsSync(dist)) {
  console.error(`✗ privacy-scan: ${dist} does not exist`);
  process.exit(1);
}

// Private text and built output are reduced to the same form (letters and digits,
// single spaces, lower case) so markup, entities and punctuation can't hide a match.
const canon = (s) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[#\w]+;/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .toLowerCase()
    .trim();
// Distinctive snippets of private text, long enough not to collide with book prose.
const needles = new Map(); // snippet -> origin
const addPrivate = (text, origin) => {
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    const s = canon(sentence);
    if (s.length >= 32) needles.set(s.slice(0, 60).trim(), origin);
  }
};

for (const file of listFiles(CONTENT_DIR, /\.(mdx?|ya?ml)$/)) {
  const { data, body } = parseEntityFile(file);
  if (typeof data.design === 'string') addPrivate(data.design, `${rel(file)} (design:)`);
  if (data.fabrication?.notes) addPrivate(data.fabrication.notes, `${rel(file)} (fabrication)`);
  for (const m of body.matchAll(/^(:{3,})design\b[^\n]*\n([\s\S]*?)^\1\s*$/gm)) addPrivate(m[2], `${rel(file)} (:::design)`);
}

// Structural markers that only designer output contains.
const markers = [
  ['data-private=', 'designer-only markup'],
  ['/docs/designer/', 'link to a designer page'],
  ['rp-cite', 'source-document citation'],
  ['rp-design', 'designer note block'],
];

const problems = [];
if (fs.existsSync(path.join(dist, 'designer'))) problems.push('dist/designer/ exists in the GM build');

const textOf = (file) => {
  const buf = fs.readFileSync(file);
  if (file.includes(`${path.sep}pagefind${path.sep}`) && /\.pf_(fragment|index|meta)$/.test(file)) {
    try {
      return zlib.gunzipSync(buf).toString('utf8');
    } catch {
      return buf.toString('utf8');
    }
  }
  return buf.toString('utf8');
};

const files = listFiles(dist, /\.(html|json|xml|txt|js|pf_fragment|pf_index|pf_meta)$/);
for (const file of files) {
  const text = textOf(file);
  const flat = canon(text);
  const where = path.relative(dist, file);
  // Starlight's own CSS/JS bundles never contain our markers, but our generated ones would.
  if (!file.endsWith('.js')) for (const [m, why] of markers) if (text.includes(m)) problems.push(`${where}: ${why} (${m})`);
  for (const [needle, origin] of needles) if (flat.includes(needle)) problems.push(`${where}: contains private text from ${origin}: "${needle}…"`);
}

if (problems.length) {
  console.error(`\n✗ privacy-scan: ${problems.length} leak(s) in the GM build`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`✓ privacy-scan: ${files.length} files clean (${needles.size} private snippets checked)`);
