#!/usr/bin/env node
// Faction goals into canonical files (ADVENTURE-BOOK-PLAN.md §11), plus the Asset/location merge
// (§10, one fact in one place): an Asset that a location stands for loses its own start.location,
// which is the same fact as that location's parent.
//
// Read-only on all inputs. Writes only staging/goals/ (git-ignored); the switch copies it into
// src/content/ together with the server change that reads it.
//
//   node scripts/merge-goals.mjs [path/to/colony.db]
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import yaml from 'js-yaml';
import { slug } from 'github-slugger';
import { ROOT, CONTENT_DIR, loadRegistry } from '../src/lib/registry.mjs';
import { schemas } from '../src/schemas.mjs';

const DB_PATH = path.resolve(process.argv[2] ?? path.join(ROOT, '../colony-data/colony.db'));
const OUT = path.join(ROOT, 'staging/goals');
const db = new DatabaseSync(DB_PATH, { readOnly: true });
const rows = (sql) => db.prepare(sql).all();
if (!rows("SELECT name FROM pragma_table_info('FactionGoals')").some((c) => c.name === 'Title')) {
  console.error('Retired: goals already live in src/content (the database no longer has their columns).');
  process.exit(1);
}

const ENUMS = {
  status: ['Plotting', 'Progressing', 'Stalled', 'Accomplished', 'Failed', 'Retired'],
  type: ['Achieve', 'Maintain'],
  priority: ['Critical', 'Major', 'Minor'],
  visibility: ['Open', 'Known', 'Secret'],
  outcome: ['Automatic', 'Adjudicated'],
  target: ['Faction', 'Character', 'Asset'],
};
const en = (k, v) => (v === null || v === undefined ? undefined : ENUMS[k][v]);
const empty = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const put = (o, k, v) => {
  if (!empty(v)) o[k] = v;
};
const nameSlug = (name) =>
  slug(String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[“”"'’]/g, ' '))
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/^the-/, '');

// Row id -> canonical id, from the link rows the earlier switches made.
const canon = new Map();
for (const [type, table] of [['character', 'Characters'], ['faction', 'Factions'], ['asset', 'Assets'], ['location', 'Locations']])
  for (const r of rows(`SELECT Id, CanonId FROM ${table} WHERE CanonId IS NOT NULL`)) canon.set(`${type}:${r.Id}`, r.CanonId);
const ref = (type, id, where) => {
  if (empty(id)) return undefined;
  const c = canon.get(`${type}:${id}`);
  if (!c) throw new Error(`${where}: ${type} ${id} has no canonical file`);
  return c;
};

const report = [];
const goals = rows('SELECT * FROM FactionGoals ORDER BY Title');
const idMap = [];
const taken = new Set();
const files = [];

function effects(json, where) {
  const list = JSON.parse(json || '[]');
  return list.map((fx) => {
    const out = {};
    for (const [k, v] of Object.entries(fx)) {
      if (k === 'targetId') out[k] = ref(fx.targetType, v, `${where} targetId`);
      else if (k === 'value' && fx.property === 'controllingFactionId') out[k] = ref('faction', v, `${where} value`);
      else if (k === 'value' && fx.property === 'locationChange') out[k] = ref('location', v, `${where} value`);
      else out[k] = v;
    }
    return out;
  });
}

for (const g of goals) {
  let id = `goal.${nameSlug(g.Title) || 'goal'}`;
  for (let n = 2; taken.has(id); n++) id = `goal.${nameSlug(g.Title)}-${n}`;
  taken.add(id);
  idMap.push({ type: 'goal', appId: g.Id, id, name: g.Title });
  const d = { id, slug: id.slice('goal.'.length), name: g.Title, faction: ref('faction', g.FactionId, id) };
  d.type = en('type', g.ConditionType);
  d.priority = en('priority', g.Priority);
  d.visibility = en('visibility', g.Visibility);
  d.outcome = en('outcome', g.OutcomeMode);
  d.earliestAct = g.EarliestAct;
  put(d, 'champion', ref('character', g.ChampionId, `${id} champion`));
  const target = {};
  const tt = en('target', g.TargetEntityType);
  put(target, 'type', tt);
  put(target, 'id', tt ? ref(tt.toLowerCase(), g.TargetEntityId, `${id} target`) : empty(g.TargetEntityId) ? undefined : g.TargetEntityId);
  put(target, 'state', g.TargetState);
  put(target, 'owner', ref('faction', g.TargetOwnerFactionId, `${id} target.owner`));
  put(target, 'property', g.TargetProperty);
  put(target, 'operator', g.TargetOperator);
  if (g.TargetThreshold !== null && g.TargetThreshold !== undefined) target.threshold = g.TargetThreshold;
  if (Object.keys(target).length) d.target = target;
  const fx = {};
  const p = effects(g.ProgressingEffectsJson, `${id} effects.progressing`);
  const a = effects(g.AccomplishedEffectsJson, `${id} effects.accomplished`);
  if (p.length) fx.progressing = p;
  if (a.length) fx.accomplished = a;
  if (Object.keys(fx).length) d.effects = fx;
  d.status = 'draft';
  d.start = { status: en('status', g.Status) };
  const parsed = schemas.goal.safeParse(d);
  if (!parsed.success) throw new Error(`${id}: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  files.push({ dir: 'goals', file: `${d.slug}.yaml`, text: `# yaml-language-server: $schema=../../../schemas/goal.schema.json\n${yaml.dump(d, { lineWidth: -1, noRefs: true, quotingType: '"' })}` });
}

// The Asset/location merge: drop start.location from every Asset a location stands for, after
// checking it equals that location's parent (else stop: that would be a decision, not a merge).
const reg = loadRegistry({ fresh: true });
let stripped = 0;
for (const loc of reg.entities.filter((e) => e.type === 'location' && e.data.asset)) {
  const asset = reg.byId.get(loc.data.asset);
  const own = asset.data.start?.location;
  if (own === undefined) continue;
  if (own !== loc.data.parent) throw new Error(`${asset.data.id}: start.location ${own} differs from ${loc.data.id} parent ${loc.data.parent}`);
  const text = fs.readFileSync(asset.file, 'utf8');
  const next = text.replace(new RegExp(`^  location: ${own.replace('.', '\\.')}\\n`, 'm'), '');
  if (next === text) throw new Error(`${asset.data.id}: cannot find start.location to remove`);
  files.push({ dir: 'assets', file: path.basename(asset.file), text: next });
  stripped++;
}

fs.rmSync(OUT, { recursive: true, force: true });
for (const f of files) {
  fs.mkdirSync(path.join(OUT, f.dir), { recursive: true });
  fs.writeFileSync(path.join(OUT, f.dir, f.file), f.text);
}
fs.writeFileSync(path.join(OUT, 'id-map.yaml'), `# App goal id -> canonical id. Used at the switch to create the link rows.\n${yaml.dump(idMap, { lineWidth: -1 })}`);
fs.writeFileSync(
  path.join(OUT, 'MERGE-REPORT.md'),
  `# Goal merge report\n\n- ${goals.length} goals written.\n- ${stripped} Assets lose start.location (the location that stands for each has the same parent).\n${report.join('\n')}\n`,
);
console.log(`staging/goals: ${goals.length} goals, ${stripped} Asset files with start.location removed`);
