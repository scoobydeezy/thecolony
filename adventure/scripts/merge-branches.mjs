#!/usr/bin/env node
// Narrative merge, step 2 (ADVENTURE-BOOK-PLAN.md §14): branching into canonical files.
//   - each PathSet becomes branches/<slug>.yaml, declaring its paths (path.<slug>)
//   - each event's per-path versions (overrides), participation (variesBy) and scope (onPaths) go into
//     its own file; the waiting canon fixes for per-path text (sources/narrative-canon-check.yaml) apply
//   - links in a version whose "replaces links" switch is off had no effect and are dropped (user, 2026-11-18)
//
// Read-only on all inputs. Writes only staging/branches/ (git-ignored):
//   branches/, events/, encounters/   the files (event files: only those that change)
//   id-map.yaml                       PathSet row -> branch id, path row -> path id
//   MERGE-REPORT.md
//
//   node scripts/merge-branches.mjs [path/to/colony.db]
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import yaml from 'js-yaml';
import { slug } from 'github-slugger';
import { ROOT, CONTENT_DIR } from '../src/lib/registry.mjs';
import { schemas } from '../src/schemas.mjs';

const DB_PATH = path.resolve(process.argv[2] ?? path.join(ROOT, '../colony-data/colony.db'));
const OUT = path.join(ROOT, 'staging/branches');
const db = new DatabaseSync(DB_PATH, { readOnly: true });
const rows = (sql, ...a) => db.prepare(sql).all(...a);
if (!rows("SELECT name FROM sqlite_master WHERE type='table' AND name='NarrativeEventOverrides'").length) {
  console.error('Retired: branching already lives in src/content (the database no longer has the path tables).');
  process.exit(1);
}
const dump = (o) => yaml.dump(o, { lineWidth: -1, noRefs: true, quotingType: '"' });
const asciiSlug = (t) => slug(String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[“”"'’]/g, ' ')).replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
const report = [];
const note = (s) => report.push(s);
const VIS = ['Public', 'GMOnly', 'Revealed'];

// ------------------------------------------------------------------ canon check (per-path text)
const check = yaml.load(fs.readFileSync(path.join(ROOT, 'sources/narrative-canon-check.yaml'), 'utf8'));
const checkOf = new Map(check.items.map((i) => [i.id, i]));
const applied = [];
function corrected(id, field, appText) {
  const c = checkOf.get(id);
  const here = (c?.conflicts ?? []).filter((x) => x.field === field);
  if (here.some((x) => x.use === 'decide')) throw new Error(`${id} ${field}: still waiting for a ruling`);
  const chosen = here.filter((x) => x.use === 'canon');
  if (chosen.length === 0) return appText;
  const text = chosen.length === 1 ? chosen[0].proposed : c.combined?.[field];
  if (!text) throw new Error(`${id} ${field}: ${chosen.length} canon fixes; needs a combined text`);
  applied.push(`${id} ${field.replace(/^variant:/, '').replace(/:description$/, ' (synopsis)').replace(/:summary$/, ' (summary)')}`);
  return text;
}

// ------------------------------------------------------------------ ids
const canonOf = new Map();
for (const [type, table] of [['event', 'NarrativeEvents'], ['thread', 'NarrativeThreads'], ['faction', 'Factions'], ['character', 'Characters'], ['asset', 'Assets'], ['location', 'Locations']])
  for (const r of rows(`SELECT Id, CanonId FROM ${table} WHERE CanonId IS NOT NULL`)) canonOf.set(`${type}:${r.Id}`, r.CanonId);
const ref = (type, id, where) => {
  const c = canonOf.get(`${type}:${id}`);
  if (!c) throw new Error(`${where}: ${type} ${id} has no canonical file`);
  return c;
};
const ENTITY = ['faction', 'character', 'asset', 'location'];   // NarrativeEntityType 0..3

const sets = rows('SELECT * FROM PathSets ORDER BY Name');
const paths = rows('SELECT * FROM NarrativePaths ORDER BY SortOrder, Name');
const idMap = [];
const branchOf = new Map();   // PathSet row -> branch id
const pathOf = new Map();     // path row -> path id
const pathName = new Map();
const files = [];
for (const s of sets) {
  const id = `branch.${asciiSlug(s.Name)}`;
  branchOf.set(s.Id, id);
  idMap.push({ type: 'branch', appId: s.Id, id, name: s.Name });
  for (const p of paths.filter((x) => x.PathSetId === s.Id)) {
    const pid = `path.${asciiSlug(p.Name)}`;
    if ([...pathOf.values()].includes(pid)) throw new Error(`two paths named ${p.Name}`);
    pathOf.set(p.Id, pid);
    pathName.set(pid, p.Name);
    idMap.push({ type: 'path', appId: p.Id, id: pid, name: p.Name });
  }
}
for (const s of sets) {
  const d = { id: branchOf.get(s.Id), slug: branchOf.get(s.Id).slice('branch.'.length), name: s.Name };
  if (s.OriginEventId) d.origin = ref('event', s.OriginEventId, `${d.id} origin`);
  if (s.ConvergenceEventId) d.convergence = ref('event', s.ConvergenceEventId, `${d.id} convergence`);
  const req = rows('SELECT RequiredPathId FROM PathSetContexts WHERE PathSetId = ?', s.Id).map((r) => pathOf.get(r.RequiredPathId));
  if (req.length) d.requires = req;
  d.paths = paths.filter((x) => x.PathSetId === s.Id).map((p) => ({ id: pathOf.get(p.Id), name: p.Name }));
  d.status = 'draft';
  const parsed = schemas.branch.safeParse(d);
  if (!parsed.success) throw new Error(`${d.id}: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  files.push({ dir: 'branches', file: `${d.slug}.yaml`, text: `# yaml-language-server: $schema=../../../schemas/branch.schema.json\n${dump(d)}` });
}

// A version's key: its paths' names without the branch name ("The Reading is Stopped" -> stopped).
function keyOf(pathIds) {
  const parts = pathIds.map((pid) => {
    const set = sets.find((s) => paths.some((p) => p.PathSetId === s.Id && pathOf.get(p.Id) === pid));
    return asciiSlug(pathName.get(pid).replace(set?.Name ?? '', '')).replace(/^is-/, '') || asciiSlug(pathName.get(pid));
  });
  return parts.join('-') || 'unconditional';
}

// ------------------------------------------------------------------ event files
const FILE_OF = new Map();
for (const dir of ['events', 'encounters'])
  for (const f of fs.readdirSync(path.join(CONTENT_DIR, dir))) {
    const text = fs.readFileSync(path.join(CONTENT_DIR, dir, f), 'utf8');
    const m = text.match(/^---\n(# yaml-language-server[^\n]*\n)([\s\S]*?)---\n([\s\S]*)$/);
    const data = yaml.load(m[2]);
    FILE_OF.set(data.id, { dir, file: f, text, schemaLine: m[1], fm: m[2], data, body: m[3] });
  }
const KEYS = ['id', 'slug', 'name', 'summary', 'function', 'synopsis', 'visibility', 'chapter', 'section', 'order', 'event', 'route', 'leadsTo', 'links',
  'variesBy', 'onPaths', 'variants', 'status', 'readiness', 'inventory', 'revelations', 'provenance', 'design'];
const ordered = (d) => Object.fromEntries([...KEYS.filter((k) => k in d).map((k) => [k, d[k]]), ...Object.keys(d).filter((k) => !KEYS.includes(k)).map((k) => [k, d[k]])]);

// The dump of an untouched frontmatter must equal the file, or re-dumping would reformat it.
for (const [id, f] of FILE_OF) if (dump(f.data) !== f.fm) throw new Error(`${id}: frontmatter does not round-trip through js-yaml; refusing to rewrite it`);

const touched = new Map();
const add = (eventRow, mutate) => {
  const canon = ref('event', eventRow, 'event');
  const f = FILE_OF.get(canon);
  if (!f) throw new Error(`${canon}: no file`);
  const d = touched.get(canon) ?? structuredClone(f.data);
  mutate(d);
  touched.set(canon, d);
};

for (const p of rows('SELECT * FROM NarrativeEventVariantParticipations'))
  add(p.NarrativeEventId, (d) => (d.variesBy = [...new Set([...(d.variesBy ?? []), branchOf.get(p.PathSetId)])]));
for (const s of rows('SELECT * FROM PathEventScopes'))
  add(s.NarrativeEventId, (d) => (d.onPaths = [...new Set([...(d.onPaths ?? []), pathOf.get(s.PathId)])]));

let dropped = 0;
const overrides = rows('SELECT * FROM NarrativeEventOverrides');
const sortKey = (pids) => pids.map((pid) => paths.find((p) => pathOf.get(p.Id) === pid)?.SortOrder ?? 99).join(',');
const variantsOf = new Map();
for (const o of overrides) {
  const canon = ref('event', o.NarrativeEventId, 'override');
  const when = rows('SELECT PathId FROM EventOverridePaths WHERE EventOverrideId = ?', o.Id).map((r) => pathOf.get(r.PathId))
    .sort((a, b) => sortKey([a]).localeCompare(sortKey([b])));
  const v = { key: keyOf(when), when };
  const names = when.map((pid) => pathName.get(pid));
  if (o.OverridesSummary) v.summary = corrected(canon, `variant:${names.join(' + ')}:summary`, o.Summary ?? '');
  if (o.OverridesDescription) v.synopsis = corrected(canon, `variant:${names.join(' + ')}:description`, o.Description ?? '');
  const conns = rows('SELECT * FROM EventOverrideConnections WHERE EventOverrideId = ?', o.Id);
  if (o.OverridesConnections)
    v.leadsTo = conns.map((c) => ({ to: ref('event', c.TargetNarrativeEventId, `${canon} ${v.key} leadsTo`), thread: ref('thread', c.ThreadId, `${canon} ${v.key} thread`), ...(VIS[c.Visibility] !== 'GMOnly' ? { visibility: VIS[c.Visibility] } : {}) }));
  else if (conns.length) throw new Error(`${canon} ${v.key}: connections with the switch off`);
  const links = rows('SELECT * FROM EventOverrideEntityLinks WHERE EventOverrideId = ?', o.Id);
  if (o.OverridesAssets)
    v.links = links.map((l) => {
      const id = ref(ENTITY[l.EntityType] ?? '?', l.EntityId, `${canon} ${v.key} link`);
      const extra = { ...(l.Role ? { role: l.Role } : {}), ...(l.IsPrimary ? { primary: true } : {}), ...(VIS[l.Visibility] !== 'GMOnly' ? { visibility: VIS[l.Visibility] } : {}) };
      return Object.keys(extra).length ? { id, ...extra } : id;
    });
  else if (links.length) {
    dropped += links.length;
    note(`- **${canon}, ${names.join(' + ')}:** dropped ${links.length} link(s) (${links.map((l) => ref(ENTITY[l.EntityType], l.EntityId, 'link')).join(', ')}); its "replaces links" switch was off, so they had no effect (user, 2026-11-18).`);
  }
  variantsOf.set(canon, [...(variantsOf.get(canon) ?? []), { v, order: sortKey(when) }]);
  add(o.NarrativeEventId, () => {});
}
for (const [canon, list] of variantsOf) {
  const keys = list.map((x) => x.v.key);
  if (new Set(keys).size !== keys.length) throw new Error(`${canon}: two versions with the key ${keys.join(', ')}`);
  touched.get(canon).variants = list.sort((a, b) => a.order.localeCompare(b.order)).map((x) => x.v);
}

for (const [canon, d] of touched) {
  const f = FILE_OF.get(canon);
  const data = ordered(d);
  const parsed = schemas[f.dir === 'events' ? 'event' : 'encounter'].safeParse(data);
  if (!parsed.success) throw new Error(`${canon}: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  files.push({ dir: f.dir, file: f.file, text: `---\n${f.schemaLine}${dump(data)}---\n${f.body}` });
}

// Every pending per-path fix in the canon check must have been applied.
const pending = check.items.flatMap((i) => (i.conflicts ?? []).filter((x) => x.field.startsWith('variant:') && x.use === 'canon').map((x) => `${i.id} ${x.field}`));
const unapplied = pending.filter((p) => {
  const [id, field] = [p.slice(0, p.indexOf(' ')), p.slice(p.indexOf(' ') + 1)];
  return !applied.some((a) => a.startsWith(id) && a.includes(field.split(':')[1]));
});
if (unapplied.length) throw new Error(`per-path fixes not applied (no matching version): ${unapplied.join('; ')}`);

// ------------------------------------------------------------------ write
fs.rmSync(OUT, { recursive: true, force: true });
for (const f of files) {
  fs.mkdirSync(path.join(OUT, f.dir), { recursive: true });
  fs.writeFileSync(path.join(OUT, f.dir, f.file), f.text);
}
fs.writeFileSync(path.join(OUT, 'id-map.yaml'), `# PathSet and path rows -> canonical ids (branching, §14).\n${dump(idMap)}`);
fs.writeFileSync(
  path.join(OUT, 'MERGE-REPORT.md'),
  [
    '# Branching merge report (narrative step 2)',
    '',
    `- ${sets.length} branch file(s), ${paths.length} paths.`,
    `- ${touched.size} event / encounter files change: ${[...touched.keys()].join(', ')}.`,
    `- ${overrides.length} versions, ${rows('SELECT COUNT(*) AS n FROM NarrativeEventVariantParticipations')[0].n} variesBy entries, ${rows('SELECT COUNT(*) AS n FROM PathEventScopes')[0].n} onPaths entries.`,
    `- Canon fixes applied to per-path text: ${applied.length ? applied.join('; ') : 'none'}.`,
    `- Dropped: ${dropped} link(s) that had no effect.`,
    '',
    ...report,
    '',
  ].join('\n'),
);
console.log(`staging/branches: ${sets.length} branches, ${paths.length} paths, ${overrides.length} versions in ${touched.size} files; ${applied.length} fixes; ${dropped} links dropped`);
console.log(report.join('\n'));
