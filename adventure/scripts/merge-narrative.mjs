#!/usr/bin/env node
// Narrative content into canonical files (ADVENTURE-BOOK-PLAN.md §13), step 1: events, encounters,
// threads, connections (leadsTo) and cast links, placed in chapters by sources/narrative-outline.yaml.
// Per-path versions (branching) are step 2 and stay in the database; their text is still included in
// the prose check, so conflicts are reported now.
//
// Read-only on all inputs. Writes only staging/narrative/ (git-ignored):
//   events/, encounters/, threads/      the drafted canon files
//   docs/act-*/index.md, ...            chapter pages (sections and their arrangement)
//   id-map.yaml                         app id -> canonical id
//   checks/*.json                       one bundle per item for the prose check against canon
//   MERGE-REPORT.md                     every structural decision and change
//
//   node scripts/merge-narrative.mjs [path/to/colony.db]
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import yaml from 'js-yaml';
import { slug } from 'github-slugger';
import { ROOT, CONTENT_DIR } from '../src/lib/registry.mjs';
import { SOURCE_DOCS_DIR } from '../src/lib/source-docs.mjs';

const DB_PATH = path.resolve(process.argv[2] ?? path.join(ROOT, '../colony-data/colony.db'));
const OUT = path.join(ROOT, 'staging/narrative');
const db = new DatabaseSync(DB_PATH, { readOnly: true });
const rows = (sql, ...a) => db.prepare(sql).all(...a);
if (!rows("SELECT name FROM pragma_table_info('NarrativeEvents')").some((c) => c.name === 'Title')) {
  console.error('Retired: narrative content already lives in src/content (the database no longer has its columns).');
  process.exit(1);
}
const outline = yaml.load(fs.readFileSync(path.join(ROOT, 'sources/narrative-outline.yaml'), 'utf8'));
// The canon check (sources/narrative-canon-check.yaml): provenance for every item, and for each conflict
// which text to use. Per-path (variant:) fixes wait for step 2; `decide` keeps the app's text until ruled.
const check = yaml.load(fs.readFileSync(path.join(ROOT, 'sources/narrative-canon-check.yaml'), 'utf8'));
const checkOf = new Map(check.items.map((i) => [i.id, i]));
const pendingVariants = [];
const pendingDecisions = [];
function corrected(id, field, appText) {
  const c = checkOf.get(id);
  const here = (c?.conflicts ?? []).filter((x) => x.field === field);
  for (const x of here.filter((x) => x.use === 'decide')) pendingDecisions.push(`${id} ${field}`);
  const chosen = here.filter((x) => x.use === 'canon');
  if (chosen.length === 0) return appText;
  const text = chosen.length === 1 ? chosen[0].proposed : c.combined?.[field];
  if (!text) throw new Error(`${id} ${field}: ${chosen.length} canon fixes chosen; sources/narrative-canon-check.yaml needs a combined text`);
  return text;
}
const report = [];
const note = (s) => report.push(s);
const empty = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const dump = (o) => yaml.dump(o, { lineWidth: -1, noRefs: true, quotingType: '"' });

const VIS = ['Public', 'GMOnly', 'Revealed'];
const ENTITY = { 0: ['faction', 'Factions'], 1: ['character', 'Characters'], 2: ['asset', 'Assets'], 3: ['location', 'Locations'] };

// ------------------------------------------------------------------ ids
const items = outline.chapters.flatMap((c) =>
  c.sections.flatMap((s) => s.items.map((it, order) => ({ ...it, chapter: c.id, section: slug(s.title), order: order + 1 }))),
);
const byAppId = new Map(items.filter((i) => i.appId !== 'new').map((i) => [i.appId, i]));
const appEvents = rows('SELECT * FROM NarrativeEvents ORDER BY SortOrder');
for (const e of appEvents) if (!byAppId.has(e.Id)) throw new Error(`app item "${e.Title}" (${e.Id}) is not in the outline`);
const threads = rows('SELECT * FROM NarrativeThreads ORDER BY Title');
// ASCII ids, as for every other kind (no accents: thread.pepe-silvia).
const asciiSlug = (t) => slug(String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[“”"'’]/g, ' ')).replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
// A title fixed by the canon check also fixes the id (Pépé Silvia -> thread.pepe-sylvya); the check item has the new id.
const renamed = new Map(check.items.flatMap((i) => (i.conflicts ?? []).filter((x) => x.field === 'title' && x.use === 'canon').map((x) => [x.app, i.id])));
const threadId = new Map(threads.map((t) => [t.Id, renamed.get(t.Title) ?? `thread.${asciiSlug(t.Title)}`]));
const canonOfEntity = (type, id) => {
  const [kind, table] = ENTITY[type] ?? [];
  if (!kind) return null;
  return rows(`SELECT CanonId FROM ${table} WHERE Id = ?`, id)[0]?.CanonId ?? null;
};

// ------------------------------------------------------------------ connections (stored on the source)
// Timing ruling (user, 2026-11-18): Confluence -> Observer -> Eclipse -> Totality, the app's own order, so no
// connection is rewired (the 2026-11-17 rewiring is withdrawn). The Observer ends Act II; Eclipse opens Act III.
const titleOf = new Map(appEvents.map((e) => [e.Id, e.Title]));
const idOfTitle = (t) => items.find((i) => i.title === t).id;
const REWIRE = {};
const leads = new Map(); // canonical source id -> [{to, thread}]
for (const c of rows('SELECT * FROM NarrativeEventConnections')) {
  let from = titleOf.get(c.SourceNarrativeEventId);
  let to = titleOf.get(c.TargetNarrativeEventId);
  const key = `${from}>${to}`;
  if (REWIRE[key]) {
    const [nf, nt] = REWIRE[key][0].split('>');
    note(`- **Connection rewired (timing ruling):** ${from} → ${to} [${threads.find((t) => t.Id === c.ThreadId).Title}] becomes ${nf.replace('The Eclipse', 'Eclipse')} → ${nt}.`);
    from = nf.replace('The Eclipse', 'Eclipse');
    to = nt;
  }
  const src = idOfTitle(from);
  const entry = { to: idOfTitle(to), thread: threadId.get(c.ThreadId) };
  if (VIS[c.Visibility] !== 'GMOnly') entry.visibility = VIS[c.Visibility];
  leads.set(src, [...(leads.get(src) ?? []), entry]);
}

// ------------------------------------------------------------------ links (stored on the owner)
const links = new Map(); // owner canonical id -> [canonical ids]
for (const l of rows('SELECT * FROM NarrativeEntityLinks')) {
  const owner = l.OwnerType === 1 ? byAppId.get(l.OwnerId)?.id : threadId.get(l.OwnerId);
  if (!owner) throw new Error(`link ${l.Id}: unknown owner ${l.OwnerId}`);
  const canon = canonOfEntity(l.EntityType, l.EntityId);
  if (!canon) throw new Error(`link ${l.Id}: entity type ${l.EntityType} ${l.EntityId} has no canonical file`);
  if (!empty(l.Role) || !empty(l.Notes) || l.IsPrimary || VIS[l.Visibility] !== 'GMOnly') throw new Error(`link ${l.Id} has role/notes/primary/visibility; the format needs them`);
  links.set(owner, [...new Set([...(links.get(owner) ?? []), canon])]);
}

// ------------------------------------------------------------------ the two existing book pages
// Their prose becomes the body of the event / encounter; their book-only metadata moves with it, and
// `canon.concepts` (the entries the page presents) merges into `links`, one list per item.
const PAGES = { 'event.the-calling': 'act-1/the-calling.md', 'encounter.the-reading': 'act-1/the-reading.md' };
const pageOf = {};
for (const [id, rel] of Object.entries(PAGES)) {
  const text = fs.readFileSync(path.join(CONTENT_DIR, 'docs', rel), 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  pageOf[id] = { rel, data: yaml.load(m[1]), body: m[2] };
}

// ------------------------------------------------------------------ files
const files = [];
const idMap = [];
const checks = [];
for (const it of items) {
  const app = it.appId === 'new' ? null : appEvents.find((e) => e.Id === it.appId);
  const page = pageOf[it.id];
  const d = { id: it.id, slug: it.id.slice(it.id.indexOf('.') + 1), name: app?.Title ?? it.title };
  // An encounter that shares its event's slug in the same chapter would share its URL: use its title.
  if (it.kind === 'encounter' && items.some((o) => o.kind === 'event' && o.chapter === it.chapter && o.id.slice(o.id.indexOf('.') + 1) === d.slug)) {
    d.slug = asciiSlug(d.name);
    note(`- **${it.id}:** slug \`${d.slug}\` (its event has the slug \`${it.id.slice(it.id.indexOf('.') + 1)}\` in the same chapter).`);
  }
  if (!empty(app?.Summary)) d.summary = corrected(it.id, 'summary', app.Summary);
  if (!empty(app?.NarrativeFunction)) d.function = corrected(it.id, 'function', app.NarrativeFunction);
  if (!empty(app?.Description)) d.synopsis = corrected(it.id, 'synopsis', app.Description);
  for (const x of (checkOf.get(it.id)?.conflicts ?? []).filter((x) => x.field.startsWith('variant:'))) {
    const at = `${it.id} ${x.field}`;
    if (x.use === 'canon' && !pendingVariants.includes(at)) pendingVariants.push(at);
    if (x.use === 'decide') pendingDecisions.push(at);
  }
  if (app && VIS[app.Visibility] !== 'GMOnly') d.visibility = VIS[app.Visibility];
  d.chapter = it.chapter;
  d.section = it.section;
  d.order = it.order;
  if (it.kind === 'encounter' && it.event) d.event = it.event;
  if (it.route) d.route = it.route;
  if (leads.get(it.id)?.length) d.leadsTo = leads.get(it.id);
  const linked = [...(links.get(it.id) ?? [])];
  for (const c of page?.data.canon?.concepts ?? []) if (!linked.includes(c)) linked.push(c);
  if (linked.length) d.links = linked;
  d.status = page ? 'draft' : app ? 'draft' : 'stub';
  if (page?.data.readiness) d.readiness = page.data.readiness;
  if (page?.data.inventory) d.inventory = page.data.inventory;
  if (page?.data.revelations) d.revelations = page.data.revelations;
  if (checkOf.get(it.id)?.provenance?.length) d.provenance = checkOf.get(it.id).provenance;
  if (page) {
    if (page.data.description && page.data.description !== d.summary)
      note(`- **${it.id}:** the book page's description (“${page.data.description}”) is replaced by the item's summary (“${d.summary}”). One summary per item.`);
    note(`- **${it.id}:** body taken from \`docs/${page.rel}\`; its \`canon.concepts\` merged into \`links\` (${page.data.canon?.concepts?.length ?? 0} ids). The page is removed at the switch.`);
  }
  if (it.appId === 'new') note(`- **${it.id}:** new (${it.kind}); the app gets a record for it at the switch.`);
  const folder = it.kind === 'event' ? 'events' : 'encounters';
  const text = `---\n# yaml-language-server: $schema=../../../schemas/${it.kind}.schema.json\n${dump(d)}---\n${page ? page.body : '\n'}`;
  files.push({ dir: folder, file: `${it.id.slice(it.id.indexOf('.') + 1)}.md`, text });   // named by id, as the app names files
  if (app) idMap.push({ type: it.kind, appId: app.Id, id: it.id, name: app.Title });

  // Prose check bundle: every piece of authored app text about this item, including per-path versions.
  const variants = app
    ? rows(
        `SELECT p.Name AS path, o.OverridesSummary, o.Summary, o.OverridesDescription, o.Description FROM NarrativeEventOverrides o
         JOIN EventOverridePaths op ON op.EventOverrideId = o.Id JOIN NarrativePaths p ON p.Id = op.PathId WHERE o.NarrativeEventId = ?`,
        app.Id,
      ).map((v) => ({ path: v.path, summary: v.OverridesSummary ? v.Summary : undefined, description: v.OverridesDescription ? v.Description : undefined }))
    : [];
  checks.push({ id: it.id, kind: it.kind, title: d.name, chapter: it.chapter, function: d.function, summary: d.summary, synopsis: d.synopsis, variants, links: linked });
}
for (const t of threads) {
  const id = threadId.get(t.Id);
  const d = { id, slug: id.slice('thread.'.length), name: corrected(id, 'title', t.Title) };
  if (!empty(t.Summary)) d.summary = corrected(id, 'summary', t.Summary);
  if (!empty(t.Color)) d.color = t.Color;
  if (links.get(id)?.length) d.links = links.get(id);
  d.status = 'draft';
  if (checkOf.get(id)?.provenance?.length) d.provenance = checkOf.get(id).provenance;
  files.push({ dir: 'threads', file: `${d.slug}.yaml`, text: `# yaml-language-server: $schema=../../../schemas/thread.schema.json\n${dump(d)}` });
  idMap.push({ type: 'thread', appId: t.Id, id, name: t.Title });
  checks.push({ id, kind: 'thread', title: t.Title, summary: d.summary });
}
// Chapter pages: the chapter owns its sections and how their items relate; items say which section.
for (const [i, c] of outline.chapters.entries()) {
  const dir = c.id === 'chapter.running-the-campaign' ? 'running' : c.id.slice('chapter.'.length);
  const fm = {
    title: c.title,
    sidebar: { order: i },
    chapter: { id: c.id, sections: c.sections.map((s) => ({ key: slug(s.title), title: s.title, arrangement: s.arrangement })) },
  };
  // A chapter with sections lists them (and their items) with ::chapter-contents (remark-colony).
  files.push({ dir: `docs/${dir}`, file: 'index.md', text: `---\n${dump(fm)}---\n${c.sections.length ? '\n::chapter-contents\n' : ''}` });
}

// ------------------------------------------------------------------ write
fs.rmSync(OUT, { recursive: true, force: true });
for (const f of files) {
  fs.mkdirSync(path.join(OUT, f.dir), { recursive: true });
  fs.writeFileSync(path.join(OUT, f.dir, f.file), f.text);
}
fs.mkdirSync(path.join(OUT, 'checks'), { recursive: true });
for (const c of checks) fs.writeFileSync(path.join(OUT, 'checks', `${c.id}.json`), JSON.stringify(c, null, 1));
fs.writeFileSync(path.join(OUT, 'id-map.yaml'), `# App id -> canonical id for narrative items and threads.\n${dump(idMap)}`);
const counts = (k) => items.filter((i) => i.kind === k).length;
fs.writeFileSync(
  path.join(OUT, 'MERGE-REPORT.md'),
  [
    '# Narrative merge report (step 1)',
    '',
    `- ${counts('event')} events, ${counts('encounter')} encounters, ${threads.length} threads, ${outline.chapters.length} chapter pages.`,
    `- Connections: ${[...leads.values()].flat().length} (stored on their source as \`leadsTo\`). Links: ${[...links.values()].flat().length} (stored on their owner as \`links\`).`,
    '- Stays in the database: event status (play), thread state (play), board positions, realizations, and the per-path versions (step 2).',
    '',
    '## Canon check',
    '',
    `- Conflicts: ${check.items.flatMap((i) => i.conflicts ?? []).length} (decisions in \`sources/narrative-canon-check.yaml\`).`,
    `- Applied at this switch: ${check.items.flatMap((i) => (i.conflicts ?? []).filter((x) => x.use === 'canon' && !x.field.startsWith('variant:'))).length}.`,
    `- Waiting for step 2 (per-path versions): ${pendingVariants.length ? pendingVariants.join('; ') : 'none'}.`,
    `- Waiting for a ruling: ${pendingDecisions.length ? pendingDecisions.join('; ') : 'none'}.`,
    '',
    '## Structural decisions',
    '',
    ...report,
    '',
  ].join('\n'),
);
console.log(`staging/narrative: ${counts('event')} events, ${counts('encounter')} encounters, ${threads.length} threads, ${checks.length} check bundles`);
console.log(report.join('\n'));
