#!/usr/bin/env node
// World Conditions and character relationships into canonical files (ADVENTURE-BOOK-PLAN.md §15).
//   - each World Condition becomes conditions/<slug>.yaml (condition.<slug>); ids in requirements and
//     "varies by" become canonical ids
//   - each character's relationships become `relationships:` in that character's file, inserted as a
//     block so the rest of the file keeps its exact text
//
// Read-only on all inputs. Writes only staging/conditions/ (git-ignored):
//   conditions/, npcs/, pcs/   the files (character files: only those that gain relationships)
//   id-map.yaml                WorldCondition row -> condition id
//   MERGE-REPORT.md
//
//   node scripts/merge-conditions.mjs [path/to/colony.db]
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import yaml from 'js-yaml';
import { slug } from 'github-slugger';
import { ROOT, CONTENT_DIR } from '../src/lib/registry.mjs';
import { schemas } from '../src/schemas.mjs';

const DB_PATH = path.resolve(process.argv[2] ?? path.join(ROOT, '../colony-data/colony.db'));
const OUT = path.join(ROOT, 'staging/conditions');
const db = new DatabaseSync(DB_PATH, { readOnly: true });
const rows = (sql, ...a) => db.prepare(sql).all(...a);
if (!rows("SELECT name FROM pragma_table_info('WorldConditions')").some((c) => c.name === 'Title')) {
  console.error('Retired: World Conditions already live in src/content (the database no longer has their columns).');
  process.exit(1);
}
const dump = (o) => yaml.dump(o, { lineWidth: -1, noRefs: true, quotingType: '"' });
const asciiSlug = (t) => slug(String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[“”"'’]/g, ' ')).replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
const report = [];
const note = (s) => report.push(s);
const empty = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

// ------------------------------------------------------------------ ids
const canonOf = new Map();
for (const [type, table] of [['character', 'Characters'], ['faction', 'Factions'], ['asset', 'Assets'], ['location', 'Locations'], ['goal', 'FactionGoals']])
  for (const r of rows(`SELECT Id, CanonId FROM ${table} WHERE CanonId IS NOT NULL`)) canonOf.set(`${type}:${r.Id}`, r.CanonId);
const conditions = rows('SELECT * FROM WorldConditions ORDER BY SortOrder, Title');
const idMap = [];
const taken = new Set();
for (const c of conditions) {
  let id = `condition.${asciiSlug(c.Title) || 'condition'}`;
  for (let n = 2; taken.has(id); n++) id = `condition.${asciiSlug(c.Title)}-${n}`;
  taken.add(id);
  canonOf.set(`condition:${c.Id}`, id);
  idMap.push({ type: 'condition', appId: c.Id, id, name: c.Title });
}
const ref = (type, id, where) => {
  if (id === '' && type === 'faction') return '';   // "no one" / "no faction"
  const c = canonOf.get(`${type}:${id}`);
  if (!c) throw new Error(`${where}: ${type} ${id} has no canonical id`);
  return c;
};
const KEY_TYPE = { assetId: 'asset', characterId: 'character', factionId: 'faction', locationId: 'location', conditionId: 'condition', goalId: 'goal' };
const SUBJECT_TYPE = { assetStatus: 'asset', assetController: 'asset', characterState: 'character', characterFaction: 'character', locationState: 'location', goalStage: 'goal' };

// ------------------------------------------------------------------ conditions
const files = [];
for (const c of conditions) {
  const id = canonOf.get(`condition:${c.Id}`);
  const d = { id, slug: id.slice('condition.'.length), name: c.Title };
  if (!empty(c.Rule)) d.rule = c.Rule;
  if (!empty(c.RuleOtherwise)) d.otherwise = c.RuleOtherwise;
  if (c.StressContribution) d.stress = c.StressContribution;
  const reqs = JSON.parse(c.RequirementsJson || '[]');
  if (reqs.length)
    d.requires = reqs.map((r, i) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, KEY_TYPE[k] ? ref(KEY_TYPE[k], v, `${id} requires[${i}].${k}`) : v])));
  const vb = empty(c.VariesByJson) ? null : JSON.parse(c.VariesByJson);
  if (vb) d.variesBy = { subject: { kind: vb.subject.kind, id: ref(SUBJECT_TYPE[vb.subject.kind], vb.subject.id, `${id} variesBy`) }, rows: vb.rows.map((r) => ({ state: r.state, text: r.text, stress: r.stress })) };
  if (!c.ActiveAtStart) d.start = { established: false };
  d.status = 'draft';
  const parsed = schemas.condition.safeParse(d);
  if (!parsed.success) throw new Error(`${id}: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  files.push({ dir: 'conditions', file: `${d.slug}.yaml`, text: `# yaml-language-server: $schema=../../../schemas/condition.schema.json\n${dump(d)}` });
}

// ------------------------------------------------------------------ relationships
const STATE = ['Active', 'Estranged', 'Severed', 'Unknown'];
const VIS = ['Public', 'GMOnly', 'Revealed'];
const rels = rows('SELECT * FROM CharacterRelationships ORDER BY SourceCharacterId, SortOrder, Id');
const bySource = new Map();
for (const r of rels) {
  const src = ref('character', r.SourceCharacterId, `relationship ${r.Id}`);
  const e = { ...(r.TargetCharacterId ? { to: ref('character', r.TargetCharacterId, `relationship ${r.Id} target`) } : {}), type: r.RelationshipType };
  if (!empty(r.Summary)) e.summary = r.Summary;
  if (STATE[r.State] !== 'Active') e.state = STATE[r.State];
  if (VIS[r.Visibility] !== 'GMOnly') e.visibility = VIS[r.Visibility];
  const list = bySource.get(src) ?? [];
  if (list.some((x) => x.to === e.to && x.type === e.type)) throw new Error(`${src}: two "${e.type}" relationships to ${e.to ?? 'no one'}`);
  list.push(e);
  bySource.set(src, list);
}
// Key order in character files (CanonStore.CharacterKeys): relationships comes after start, before provenance / design.
const AFTER = ['provenance', 'design'];
for (const [src, list] of bySource) {
  const dir = src.startsWith('pc.') ? 'pcs' : 'npcs';
  const file = path.join(CONTENT_DIR, dir, `${src.slice(src.indexOf('.') + 1)}.md`);
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const fm = yaml.load(m[1]);
  if (fm.relationships) throw new Error(`${src}: already has relationships`);
  const lines = m[1].split('\n');
  const at = lines.findIndex((l) => AFTER.some((k) => l.startsWith(`${k}:`)));
  const block = dump({ relationships: list }).trimEnd().split('\n');
  const next = [...(at < 0 ? lines : lines.slice(0, at)), ...block, ...(at < 0 ? [] : lines.slice(at))].join('\n');
  const data = yaml.load(next);
  const parsed = schemas[src.startsWith('pc.') ? 'pc' : 'npc'].safeParse(data);
  if (!parsed.success) throw new Error(`${src}: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  files.push({ dir, file: path.basename(file), text: `---\n${next}\n---\n${m[2]}` });
}

// ------------------------------------------------------------------ write
fs.rmSync(OUT, { recursive: true, force: true });
for (const f of files) {
  fs.mkdirSync(path.join(OUT, f.dir), { recursive: true });
  fs.writeFileSync(path.join(OUT, f.dir, f.file), f.text);
}
fs.writeFileSync(path.join(OUT, 'id-map.yaml'), `# WorldCondition rows -> canonical ids (§15).\n${dump(idMap)}`);
fs.writeFileSync(
  path.join(OUT, 'MERGE-REPORT.md'),
  [
    '# World Conditions and relationships merge report',
    '',
    `- ${conditions.length} World Conditions (${conditions.filter((c) => !empty(c.VariesByJson)).length} vary by an entity, ${conditions.filter((c) => JSON.parse(c.RequirementsJson || '[]').length).length} with requirements, ${conditions.filter((c) => !c.ActiveAtStart).length} not established at the start).`,
    `- ${rels.length} relationships in ${bySource.size} character files.`,
    '- Stays in the database: each condition\'s sort order; the Events that establish or end conditions (play data).',
    ...report,
    '',
  ].join('\n'),
);
console.log(`staging/conditions: ${conditions.length} conditions, ${rels.length} relationships in ${bySource.size} character files`);
