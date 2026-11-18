#!/usr/bin/env node
// RETIRED 2026-11-17 (the switch is done). Kept for the record.
// Step 5 of the canon store (ADVENTURE-BOOK-PLAN.md §10): writes every faction, Asset and
// location in the app database as one canonical file each, and rewrites the character files'
// references (start.faction, start.location, ...) from app ids to canonical ids.
//
// Read-only on all inputs. Writes only staging/entities/ (git-ignored); the switch copies it
// into src/content/ together with the server change that reads it.
//
//   node scripts/merge-entities.mjs [path/to/colony.db]
//
// Sources: the app database is the only structured source for these entities (no source
// document has per-faction, per-Asset or per-location entries). The book's existing entries
// (the two location stubs) win for the fields they set; every difference is reported.
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import yaml from 'js-yaml';
import { slug } from 'github-slugger';
import { ROOT, CONTENT_DIR, loadRegistry, parseEntityFile } from '../src/lib/registry.mjs';
import { schemas } from '../src/schemas.mjs';

const DB_PATH = path.resolve(process.argv[2] ?? path.join(ROOT, '../colony-data/colony.db'));
const OUT = path.join(ROOT, 'staging/entities');
const db = new DatabaseSync(DB_PATH, { readOnly: true });
const rows = (sql) => db.prepare(sql).all();
if (!rows("SELECT name FROM pragma_table_info('Factions')").some((c) => c.name === 'Name')) {
  console.error('Retired: factions, Assets and locations already live in src/content (the database no longer has their columns).');
  process.exit(1);
}

const ENUMS = {
  group: ['Faction', 'SocialClass'],
  belief: ['Positive', 'Neutral', 'Negative'],
  assetType: ['Infrastructure', 'Artifact', 'Resource', 'Intelligence'],
  assetRole: ['Operational', 'Strategic', 'Symbolic', 'Covert', 'Mandate'],
  assetStatus: ['Stable', 'Contested', 'Damaged', 'Destroyed'],
  locationState: ['Stable', 'ActiveIncursion', 'Unstable'],
};
const en = (kind, v) => (v === null || v === undefined ? undefined : ENUMS[kind][v]);
const empty = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const put = (o, k, v) => {
  if (!empty(v)) o[k] = v;
};
// Same rule as the API's id allocation for these kinds: ASCII slug of the name, without a leading "the".
const nameSlug = (name) =>
  slug(String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[“”"'’]/g, ' '))
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/^the-/, '');

const report = [];
const note = (s) => report.push(s);
const reg = loadRegistry({ fresh: true });

// ------------------------------------------------------------------ ids
const idMap = []; // { type, appId, id, name }
const canonOf = new Map(); // `${type}:${appId}` -> canonical id
function allocate(type, appId, name, taken) {
  let basis = nameSlug(name) || type;
  let id = `${type}.${basis}`;
  for (let n = 2; taken.has(id); n++) id = `${type}.${basis}-${n}`;
  taken.add(id);
  idMap.push({ type, appId, id, name });
  canonOf.set(`${type}:${appId}`, id);
  return id;
}
const ref = (type, appId, where) => {
  if (empty(appId)) return undefined;
  const id = canonOf.get(`${type}:${appId}`);
  if (!id) throw new Error(`${where}: ${type} ${appId} is not in the database`);
  return id;
};

const factions = rows('SELECT * FROM Factions ORDER BY SortOrder, Name');
const assets = rows('SELECT * FROM Assets ORDER BY Name');
const locations = rows('SELECT * FROM Locations ORDER BY Name');
const characters = rows('SELECT Id, CanonId FROM Characters');
const charCanon = new Map(characters.map((c) => [c.Id, c.CanonId]));

if (new Set([...factions, ...assets, ...locations].map((r) => r.CampaignId)).size > 1)
  throw new Error('More than one campaign has factions, Assets or locations; the merge expects one.');

for (const [type, list] of [['faction', factions], ['asset', assets], ['location', locations]]) {
  const taken = new Set(reg.entities.filter((e) => e.type === type && !list.some((r) => nameSlug(r.Name) === e.data.slug)).map((e) => e.data.id));
  for (const r of list) allocate(type, r.Id, r.Name, taken);
}

// ------------------------------------------------------------------ files
const header = (kind) => `# yaml-language-server: $schema=../../../schemas/${kind}.schema.json\n`;
const dump = (o) => yaml.dump(o, { lineWidth: -1, noRefs: true, quotingType: '"' });
const files = []; // { kind, dir, file, text, data }

function emit(kind, dir, data) {
  const parsed = schemas[kind].safeParse(data);
  if (!parsed.success) throw new Error(`${data.id}: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  files.push({ kind, dir, file: `${data.slug}.yaml`, text: header(kind) + dump(data), data });
}

// Book entries already in src/content win for the fields they set.
function withBook(kind, data, appFields) {
  const book = reg.byId.get(data.id);
  if (!book) return { ...data, status: 'draft' };
  const out = { ...data };
  for (const [k, v] of Object.entries(book.data)) {
    if (k in out && JSON.stringify(out[k]) !== JSON.stringify(v) && appFields.includes(k))
      note(`- **${data.id}** \`${k}\`: book entry kept (“${v}”); app value was “${out[k]}”.`);
    out[k] = v;
  }
  note(`- **${data.id}**: merged into the existing book entry ${path.relative(ROOT, book.file)} (book's id, slug, status and provenance kept).`);
  return out;
}

for (const f of factions) {
  const id = canonOf.get(`faction:${f.Id}`);
  const d = { id, slug: id.slice('faction.'.length), name: f.Name, type: en('group', f.Type) };
  for (const [k, col] of [
    ['summary', 'Summary'], ['motto', 'Motto'], ['represents', 'Represents'], ['publicFace', 'PublicFace'], ['selfImage', 'SelfImage'],
    ['coreTenet', 'CoreTenet'], ['focus', 'Focus'], ['certainOf', 'CertainOf'], ['rightAbout', 'RightAbout'], ['afraidOf', 'AfraidOf'],
    ['wrongAbout', 'WrongAbout'], ['response', 'Response'], ['origin', 'Origin'], ['foundedAs', 'FoundedAs'], ['became', 'Became'],
    ['history', 'History'], ['notes', 'Notes'],
  ]) put(d, k, f[col]);
  const heraldry = {};
  put(heraldry, 'glyph', f.GlyphPath);
  put(heraldry, 'icon', f.IconPath);
  put(heraldry, 'primaryColor', f.PrimaryColor);
  put(heraldry, 'secondaryColor', f.SecondaryColor);
  put(heraldry, 'bannerShape', f.BannerShape);
  if (Object.keys(heraldry).length) d.heraldry = heraldry;
  d.status = 'draft';
  const start = { active: f.Active === 1 };
  if (!empty(f.LeaderId)) {
    const leader = charCanon.get(f.LeaderId);
    if (!leader) throw new Error(`${id}: leader ${f.LeaderId} is not a linked character`);
    start.leader = leader;
  }
  start.momentum = f.MomentumTier;
  start.size = f.FactionSize;
  start.values = { truth: f.TruthValue, stability: f.StabilityValue, agency: f.AgencyValue };
  const beliefs = {};
  put(beliefs, 'a', en('belief', f.BeliefA));
  put(beliefs, 'b', en('belief', f.BeliefB));
  put(beliefs, 'c', en('belief', f.BeliefC));
  start.beliefs = beliefs;
  d.start = start;
  emit('faction', 'factions', withBook('faction', d, ['summary']));
}

for (const a of assets) {
  const id = canonOf.get(`asset:${a.Id}`);
  const d = { id, slug: id.slice('asset.'.length), name: a.Name, type: en('assetType', a.Type), role: en('assetRole', a.Role), tier: a.Tier, keystone: a.Keystone === 1 };
  put(d, 'summary', a.Description);
  d.status = 'draft';
  const start = {};
  put(start, 'controller', ref('faction', a.ControllingFactionId, id));
  put(start, 'location', ref('location', a.LocationId, id));
  start.status = en('assetStatus', a.Status);
  put(start, 'statusActor', ref('faction', a.StatusActorFactionId, id));
  d.start = start;
  emit('asset', 'assets', withBook('asset', d, ['summary']));
}

for (const l of locations) {
  const id = canonOf.get(`location:${l.Id}`);
  const d = { id, slug: id.slice('location.'.length), name: l.Name };
  put(d, 'type', l.LocationType);
  put(d, 'summary', l.Description);
  put(d, 'parent', ref('location', l.ParentLocationId, id));
  put(d, 'asset', ref('asset', l.LinkedAssetId, id));
  put(d, 'markerColor', l.MarkerColor);
  d.status = 'draft';
  d.start = { state: en('locationState', l.State) };
  const merged = withBook('location', d, ['summary']);
  // Key order: the book entry's keys come first otherwise; restore the canonical order.
  const order = ['id', 'slug', 'name', 'type', 'summary', 'parent', 'asset', 'markerColor', 'status', 'start', 'provenance', 'design'];
  const sorted = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99)));
  emit('location', 'locations', sorted);
}

// ------------------------------------------------------------------ character references
// Character files keep their text byte for byte except the four start: references.
const CHAR_REFS = [['faction', 'faction'], ['socialClass', 'faction'], ['location', 'location'], ['reaffirmedFaction', 'faction']];
const charFiles = [];
for (const e of reg.entities.filter((x) => x.type === 'npc' || x.type === 'pc')) {
  let text = fs.readFileSync(e.file, 'utf8');
  for (const [key, type] of CHAR_REFS) {
    const v = e.data.start?.[key];
    if (empty(v)) continue;
    if (/^[a-z]+\./.test(String(v))) continue; // already canonical
    const id = ref(type, v, e.data.id);
    const re = new RegExp(`^(  ${key}: )(?:"${v}"|'${v}'|${v})$`, 'm');
    if (!re.test(text)) throw new Error(`${e.data.id}: cannot find start.${key}: ${v} to rewrite`);
    text = text.replace(re, `$1${id}`);
  }
  charFiles.push({ dir: e.type === 'pc' ? 'pcs' : 'npcs', file: path.basename(e.file), text });
}

// ------------------------------------------------------------------ write
fs.rmSync(OUT, { recursive: true, force: true });
for (const f of [...files, ...charFiles]) {
  fs.mkdirSync(path.join(OUT, f.dir), { recursive: true });
  fs.writeFileSync(path.join(OUT, f.dir, f.file), f.text);
}
fs.writeFileSync(
  path.join(OUT, 'id-map.yaml'),
  `# App row id -> canonical id for factions, Assets and locations. Used at the switch to create the link rows.\n${yaml.dump(idMap, { lineWidth: -1 })}`,
);
const changedChars = charFiles.filter((c) => c.text !== fs.readFileSync(path.join(CONTENT_DIR, c.dir, c.file), 'utf8')).length;
fs.writeFileSync(
  path.join(OUT, 'MERGE-REPORT.md'),
  [
    '# Faction, Asset and location merge report',
    '',
    `Database: \`${path.relative(ROOT, DB_PATH)}\``,
    '',
    `- ${factions.length} factions, ${assets.length} Assets, ${locations.length} locations written.`,
    `- ${changedChars} of ${charFiles.length} character files had references rewritten to canonical ids.`,
    '- Stays in the database (not canon): faction SortOrder (app list order), the retired Momentum and PowerModifier columns, IntroducedAtEventId.',
    '',
    '## Decisions',
    '',
    ...(report.length ? report : ['- None.']),
    '',
  ].join('\n'),
);
console.log(`staging/entities: ${files.length} entity files, ${charFiles.length} character files (${changedChars} with rewritten references)`);
console.log(report.join('\n'));
