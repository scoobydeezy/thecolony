// The original source documents and the migration map that supersedes them.
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import GithubSlugger, { slug } from 'github-slugger';
import { ROOT } from './registry.mjs';

// colony-tracker/adventure -> "The Colony/"
export const SOURCE_DOCS_DIR = path.resolve(ROOT, '../..');
export const MIGRATION_MAP = path.join(ROOT, 'sources/migration-map.yaml');

export const sourceDocId = (fileName) => slug(fileName.replace(/\.md$/, ''));

export function listSourceDocs() {
  if (!fs.existsSync(SOURCE_DOCS_DIR)) return [];
  return fs
    .readdirSync(SOURCE_DOCS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({ file: path.join(SOURCE_DOCS_DIR, f), name: f.replace(/\.md$/, ''), id: sourceDocId(f) }));
}

// Headings of a document as { depth, text, anchor } in order, with anchors
// computed the same way the rendered page computes heading ids.
export function headingsOf(file) {
  const slugger = new GithubSlugger();
  const out = [];
  let fenced = false;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) continue;
    const m = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (!m) continue;
    const text = m[2].replace(/\*\*|__|`/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').trim();
    out.push({ depth: m[1].length, text, anchor: slugger.slug(text) });
  }
  return out;
}

// Resolve "A > B > C" to the anchor of C, requiring each segment to appear in order
// as a deeper heading than the one before.
export function resolveHeadingPath(headings, headingPath) {
  let from = 0;
  let parentDepth = 0;
  let found = null;
  for (const part of headingPath.split(' > ').map((s) => s.trim())) {
    found = null;
    for (let i = from; i < headings.length; i++) {
      const hd = headings[i];
      if (parentDepth > 0 && hd.depth <= parentDepth) break; // left the parent's section
      if (hd.text === part) {
        found = hd;
        from = i + 1;
        parentDepth = hd.depth;
        break;
      }
    }
    if (!found) return null;
  }
  return found;
}

export function loadMigrationMap() {
  if (!fs.existsSync(MIGRATION_MAP)) return { concepts: {} };
  return yaml.load(fs.readFileSync(MIGRATION_MAP, 'utf8')) ?? { concepts: {} };
}
