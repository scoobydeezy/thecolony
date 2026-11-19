#!/usr/bin/env node
// Canon validation. Without arguments it checks the sources; with a build
// directory (dist / dist-designer) it also checks every internal link and anchor.
//   node scripts/validate.mjs            source checks only
//   node scripts/validate.mjs dist       + built-output link checks
//   node scripts/validate.mjs --sources  + original-document provenance checks
import fs from 'node:fs';
import path from 'node:path';
import { loadRegistry, listFiles, parseEntityFile, ENTITY_TYPES, CONTENT_DIR, ROOT, rel, staleReferences, PART, partDir, loadParts } from '../src/lib/registry.mjs';
import { visit } from 'unist-util-visit';
import { BLOCKS, TEXT_DIRECTIVES, LEAF_DIRECTIVES, directiveId, parseMarkdownBody } from '../src/lib/remark-colony.mjs';
import { directoryError } from '../src/lib/directory.mjs';
import { STAT_KEYS } from '../src/lib/veiled.mjs';
import { listSourceDocs, headingsOf, resolveHeadingPath, loadMigrationMap } from '../src/lib/source-docs.mjs';

const errors = [];
const warnings = [];
// Must return undefined: a number returned from a unist visitor means "skip to index".
const err = (m) => {
  errors.push(m);
};
// §12: a reference to an entry that no longer exists is flagged (here, on the page and on the
// Stale references page), not a build failure, so a delete through the app never stops the book.
const stale = [];
const staleRef = (m) => {
  stale.push(m);
};

// ---------------------------------------------------------------- entities
const reg = loadRegistry({ fresh: true });
reg.problems.forEach(err);
for (const d of reg.duplicates) err(`Duplicate canonical id ${d.id}: ${d.files.join(' and ')}`);

const slugsBySection = new Map();
for (const e of reg.entities) {
  const { id, slug, previousSlugs = [], aliases = [] } = e.data;
  if (id && !id.startsWith(`${e.type}.`)) err(`${rel(e.file)}: id "${id}" must start with "${e.type}."`);
  for (const a of aliases) if (reg.byId.has(a)) err(`${rel(e.file)}: alias ${a} collides with an existing id`);
  const area = ENTITY_TYPES[e.type].area === PART ? partDir(e.data.part) : ENTITY_TYPES[e.type].area;
  if (area && slug) {
    for (const s of [slug, ...previousSlugs]) {
      const key = `${area}/${s}`;
      if (slugsBySection.has(key)) err(`URL /${key}/ used by both ${slugsBySection.get(key)} and ${id}`);
      else slugsBySection.set(key, id);
    }
  }
}

// ---------------------------------------------------------------- source documents
const sourceDocs = listSourceDocs();
// The published book must remain verifiable after the source exports are retired.
// Original heading/citation checks are an explicit migration check, not a build dependency.
const checkSources = process.argv.includes('--sources');
if (checkSources && !sourceDocs.length) err('No source documents found; set COLONY_SOURCE_DOCS_DIR to the source exports folder.');
const docByName = new Map(sourceDocs.map((d) => [d.name, d]));
const docById = new Map(sourceDocs.map((d) => [d.id, d]));
const headingCache = new Map();
const headings = (doc) => {
  if (!headingCache.has(doc.id)) headingCache.set(doc.id, headingsOf(doc.file));
  return headingCache.get(doc.id);
};
function checkProvenance(where, p) {
  if (!checkSources) return;
  const doc = docByName.get(p.doc);
  if (!doc) return err(`${where}: unknown source document "${p.doc}"`);
  if (!resolveHeadingPath(headings(doc), p.heading)) err(`${where}: heading "${p.heading}" not found in ${p.doc}`);
}
for (const e of reg.entities) (e.data.provenance ?? []).forEach((p) => checkProvenance(`${rel(e.file)} provenance`, p));

// ---------------------------------------------------------------- migration map
const map = loadMigrationMap();
const conceptIds = new Set(Object.keys(map.concepts ?? {}));
for (const [id, c] of Object.entries(map.concepts ?? {})) {
  const where = `migration-map ${id}`;
  if (!['unmigrated', 'in-progress', 'migrated'].includes(c.status)) err(`${where}: bad status "${c.status}"`);
  for (const t of c.targets ?? []) if (!reg.byId.has(t)) err(`${where}: target ${t} does not exist`);
  for (const p of c.provenance ?? []) checkProvenance(where, p);
  if (c.status === 'migrated' && (c.provenance ?? []).some((p) => !p.reconciled)) err(`${where}: marked migrated but has unreconciled provenance`);
}
const known = (id) => reg.byId.has(id) || conceptIds.has(id);

// ---------------------------------------------------------------- coverage inventory (BOOK-STRUCTURE.md §8)
const coverageFile = path.join(ROOT, 'sources/coverage.yaml');
if (fs.existsSync(coverageFile)) {
  const cov = (await import('js-yaml')).default.load(fs.readFileSync(coverageFile, 'utf8'));
  for (const [doc, rows] of Object.entries(cov.documents ?? {})) {
    if (checkSources && !docByName.has(doc)) err(`coverage: unknown source document "${doc}"`);
    for (const r of rows)
      for (const h of [...(r.home ?? []), ...(r.dependsOn ?? [])])
        if (h !== 'unclassified' && !cov.planned?.[h] && !reg.byId.has(h)) staleRef(`coverage: ${doc} › ${r.heading}: home ${h} is neither an entry nor a planned page`);
  }
}

// ---------------------------------------------------------------- markup and references
const ASIDES = ['note', 'tip', 'caution', 'danger'];
const frontmatterLines = (file) => {
  const m = fs.readFileSync(file, 'utf8').match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return m ? m[0].split('\n').length - 1 : 0;
};
const markdownFiles = listFiles(CONTENT_DIR, /\.mdx?$/);
for (const file of markdownFiles) {
  const { data, body } = parseEntityFile(file);
  const where = rel(file);
  // Walk the same syntax tree the renderer sees, so validation can't disagree with output.
  visit(parseMarkdownBody(body), (node) => {
    if (!node.type?.endsWith('Directive')) return;
    const at = `${where}:${(node.position?.start.line ?? 0) + frontmatterLines(file)}`;
    const name = node.name;
    if (node.type === 'containerDirective') {
      if (!BLOCKS[name] && !ASIDES.includes(name)) err(`${at}: unknown block :::${name}`);
      // §14: :::branch{when=...} must name paths.
      if (name === 'branch' && node.attributes?.when)
        for (const id of String(node.attributes.when).split(/[\s,]+/).filter(Boolean)) {
          const p = reg.byId.get(id);
          if (!p) staleRef(`${at}: :::branch when → ${id} (no such path)`);
          else if (p.type !== 'path') err(`${at}: :::branch when must name paths (got ${id})`);
        }
      return;
    }
    if (node.type === 'leafDirective' && !LEAF_DIRECTIVES.includes(name)) return err(`${at}: unknown directive ::${name}`);
    if (node.type === 'textDirective' && !TEXT_DIRECTIVES.includes(name)) {
      // A bare ":word" in prose is not a directive; one with [label] or {attrs} is a typo.
      if (node.attributes && Object.keys(node.attributes).length) err(`${at}: unknown directive :${name}`);
      return;
    }
    const attrs = node.attributes ?? {};
    if (name === 'directory') {
      const problem = directoryError(attrs);
      if (problem) err(`${at}: ${problem}`);
      return;
    }
    if (name === 'cite') {
      if (!checkSources) return;
      const doc = docById.get(attrs.doc);
      if (!doc) err(`${at}: :cite to unknown source document "${attrs.doc}"`);
      else if (attrs.anchor && !headings(doc).some((h) => h.anchor === attrs.anchor)) err(`${at}: :cite anchor #${attrs.anchor} not in ${doc.name}`);
      return;
    }
    if (name === 'part-contents') {
      if (!data.part?.id) err(`${at}: ::part-contents is only for a part page (frontmatter part.id)`);
      return;
    }
    if (name === 'clock') {
      const n = Number(attrs.segments);
      if (!Number.isInteger(n) || n < 1 || n > 24) err(`${at}: ::clock needs segments=1..24`);
      return;
    }
    const id = directiveId(node);
    if (!id) return err(`${at}: :${name} without an #id`);
    if (!reg.byId.has(id)) return staleRef(`${at}: :${name} → ${id} (no such entry)`);
    if (name === 'stat') {
      if (reg.byId.get(id).type !== 'source') err(`${at}: :stat must point at a Veiled Source (got ${id})`);
      if (!STAT_KEYS.includes(attrs.key)) err(`${at}: :stat key "${attrs.key}" must be one of ${STAT_KEYS.join(', ')}`);
    }
  });

  // frontmatter references on chapters
  for (const c of data.canon?.concepts ?? []) if (!known(c)) err(`${where}: canon concept ${c} is neither an entity nor in the migration map`);
  for (const inv of data.inventory ?? []) if (!reg.byId.has(inv.id)) staleRef(`${where}: inventory → ${inv.id} (no such entry)`);
  for (const r of data.revelations ?? []) if (!reg.byId.has(r.id)) staleRef(`${where}: revelations → ${r.id} (no such entry)`);
}

// frontmatter references on entities

// Ownership split: the NPC entry owns identity, the stat block owns mechanics, and the
// link is stored once (creature.npc). Enforced here so `npm run check` catches it too.
const STAT_FIELDS = ['ac', 'hp', 'saves', 'perception', 'skills', 'strikes', 'speed', 'abilityDC', 'traits', 'size'];
for (const e of reg.entities) {
  const where = rel(e.file);
  if (e.type === 'npc') {
    if ('statblock' in e.data) err(`${where}: remove statblock: — the link lives on the stat block (creature npc: ${e.data.id})`);
    for (const f of STAT_FIELDS) if (f in e.data) err(`${where}: NPC entries hold identity only; "${f}" belongs in a creature stat block`);
  }
  if (e.type === 'creature' && e.data.npc) {
    const person = reg.byId.get(e.data.npc);
    if ('name' in e.data) err(`${where}: remove name: — a stat block linked to ${e.data.npc} takes its name from the NPC entry`);
    const ancestry = person?.data.ancestry;
    if (ancestry && (e.data.traits ?? []).some((t) => t.toLowerCase() === ancestry.toLowerCase())) {
      err(`${where}: remove the "${ancestry}" trait — it is derived from ${e.data.npc} ancestry`);
    }
    const siblings = reg.statblocksOf(e.data.npc);
    if (siblings.length > 1 && !e.data.variant) err(`${where}: ${e.data.npc} has ${siblings.length} stat blocks; each needs a variant: label`);
    if ('level' in e.data && !e.data.variant) err(`${where}: remove level: — it comes from ${e.data.npc} (only a variant: stat block may differ)`);
    if ('kind' in e.data) err(`${where}: remove kind: — NPC stat blocks read "<Ancestry> <Class> <Level>" from ${e.data.npc}`);
    // Ruling 2026-11-17: NPCs with stat blocks have race/class profiles like PCs.
    if (person && (!person.data.class || person.data.level === undefined)) err(`${rel(person.file)}: an NPC with a stat block needs class: and level: (header reads "<Ancestry> <Class> <Level>")`);
  }
}
// Narrative items (§13): a part and chapter that exist, an encounter's event, kinds of connection.
const parts = loadParts();
for (const e of reg.entities.filter((x) => x.type === 'event' || x.type === 'encounter')) {
  const where = rel(e.file);
  const p = parts.find((x) => x.id === e.data.part);
  if (e.data.part && !p) staleRef(`${where}: part → ${e.data.part} (no such part page)`);
  else if (p && !p.chapters.some((c) => c.key === e.data.chapter)) err(`${where}: chapter "${e.data.chapter}" is not a chapter of ${p.id}`);
  if (e.data.event && reg.byId.get(e.data.event) && reg.byId.get(e.data.event).type !== 'event') err(`${where}: event: must name an event`);
  // §14: versions have unique keys and name paths; paths named in `when` / `onPaths` are paths.
  const keys = (e.data.variants ?? []).map((v) => v.key);
  if (new Set(keys).size !== keys.length) err(`${where}: two versions with the same key`);
  for (const id of [...(e.data.onPaths ?? []), ...(e.data.variants ?? []).flatMap((v) => v.when ?? [])])
    if (reg.byId.has(id) && reg.byId.get(id).type !== 'path') err(`${where}: ${id} is not a path`);
  for (const id of e.data.variesBy ?? []) if (reg.byId.has(id) && reg.byId.get(id).type !== 'branch') err(`${where}: variesBy ${id} is not a branch`);
}
for (const e of reg.entities) {
  // One fact, one place: an Asset a location stands for takes its location from that location.
  if (e.type === 'asset' && e.view.place && e.data.start?.location)
    err(`${rel(e.file)}: remove start.location — ${e.view.place} stands for this Asset, so its location is that entry's parent`);
}

// ---------------------------------------------------------------- built output
const distArg = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
if (distArg) {
  const dist = path.resolve(ROOT, distArg);
  if (!fs.existsSync(dist)) err(`Build directory ${distArg} does not exist`);
  else checkDist(dist);
}

function checkDist(dist) {
  const htmlFiles = listFiles(dist, /\.html$/);
  const idCache = new Map();
  const idsOf = (file) => {
    if (!idCache.has(file)) idCache.set(file, new Set([...fs.readFileSync(file, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
    return idCache.get(file);
  };
  const resolve = (urlPath) => {
    const p = decodeURIComponent(urlPath.replace(/^\/docs/, ''));
    const candidates = p.endsWith('/') ? [path.join(dist, p, 'index.html')] : [path.join(dist, p), path.join(dist, p, 'index.html'), path.join(dist, `${p}.html`)];
    return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
  };
  let checked = 0;
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    for (const m of html.matchAll(/class="rp-ref-missing"[^>]*>([^<]*)|\[missing (?:stat|reference): ([^\]]*)\]/g)) {
      staleRef(`${path.relative(dist, file)}: flagged on the page (${(m[1] ?? m[2]).trim()})`);
    }
    for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
      const url = m[1].replace(/&amp;/g, '&');
      if (!url.startsWith('/docs/') && !url.startsWith('#')) continue;
      const [pathPart, hash] = url.split('#');
      const target = pathPart ? resolve(pathPart.split('?')[0]) : file;
      checked++;
      if (!target) {
        err(`${path.relative(dist, file)}: broken link ${url}`);
        continue;
      }
      if (hash && target.endsWith('.html') && !idsOf(target).has(decodeURIComponent(hash))) err(`${path.relative(dist, file)}: missing anchor ${url}`);
    }
  }
  warnings.push(`checked ${checked} internal links in ${htmlFiles.length} pages`);
}

for (const r of staleReferences(reg)) staleRef(`${r.file}: ${r.path} → ${r.to} (no such entry)`);

// ---------------------------------------------------------------- report
for (const w of warnings) console.log(`  · ${w}`);
if (stale.length) {
  console.log(`  ⚠ ${stale.length} stale reference(s), flagged in the book (see /stale-references/):`);
  for (const m of stale) console.log(`    - ${m}`);
}
if (errors.length) {
  console.error(`\n✗ validate: ${errors.length} problem(s)`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✓ validate: ${reg.entities.length} entities, ${markdownFiles.length} markdown files, ${conceptIds.size} migration concepts`);
