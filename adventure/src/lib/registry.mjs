// Reads canonical entity files straight from disk. Used by the remark plugin,
// the validation script and (later) the reference export, so every consumer
// resolves IDs, names and URLs the same way Astro's content collections do.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { BASE } from './target.mjs';

// Project root = nearest folder (from the working directory, then this file) with
// astro.config.mjs. import.meta.url alone is wrong once Astro bundles page code.
function findRoot() {
  for (const start of [process.cwd(), path.dirname(fileURLToPath(import.meta.url))]) {
    let dir = start;
    while (true) {
      if (fs.existsSync(path.join(dir, 'astro.config.mjs')) && fs.existsSync(path.join(dir, 'src/content'))) return dir;
      const up = path.dirname(dir);
      if (up === dir) break;
      dir = up;
    }
  }
  throw new Error('Cannot locate the adventure project root (astro.config.mjs)');
}
export const ROOT = findRoot();
export const CONTENT_DIR = path.join(ROOT, 'src/content');

// The URL area of events and encounters is their part's folder (/act-1/the-calling/), not a fixed area.
export const PART = '@part';

// type -> { dir under src/content, collection name, URL area (null = no page) }
export const ENTITY_TYPES = {
  creature: { dir: 'creatures', area: 'bestiary', label: 'Creature', plural: 'Bestiary' },
  npc: { dir: 'npcs', area: 'npcs', label: 'NPC', plural: 'NPCs' },
  pc: { dir: 'pcs', area: null, label: 'Player character', plural: 'Player characters' },
  location: { dir: 'locations', area: 'gazetteer', label: 'Location', plural: 'Locations' },
  faction: { dir: 'factions', area: 'factions', label: 'Faction', plural: 'Factions' },
  asset: { dir: 'assets', area: 'assets', label: 'Asset', plural: 'Assets' },
  goal: { dir: 'goals', area: 'goals', label: 'Faction goal', plural: 'Faction Goals' },
  // Narrative content (ADVENTURE-BOOK-PLAN.md §13): events and encounters live in their part's URL
  // space (/act-1/the-calling/); PART is a marker, not a URL area.
  event: { dir: 'events', area: PART, label: 'Event', plural: 'Events' },
  encounter: { dir: 'encounters', area: PART, label: 'Encounter', plural: 'Encounters' },
  thread: { dir: 'threads', area: 'threads', label: 'Narrative thread', plural: 'Narrative Threads' },
  // §14: where the story splits. Its paths (path.<slug>) are declared inside the branch file and indexed
  // as entries of type "path" (no file of their own; the URL is an anchor on the branch page).
  branch: { dir: 'branches', area: 'branches', label: 'Branch', plural: 'Branches' },
  // §15: World Conditions, one file each.
  condition: { dir: 'conditions', area: 'conditions', label: 'World Condition', plural: 'World Conditions' },
  rule: { dir: 'rules', area: 'rules', label: 'Rule', plural: 'Rules Reference' },
  source: { dir: 'veiled-sources', area: 'veiled-sources', label: 'Veiled Source', plural: 'Veiled Sources' },
  item: { dir: 'items', area: 'items', label: 'Item', plural: 'Items and Treasure' },
  hazard: { dir: 'hazards', area: 'hazards', label: 'Hazard', plural: 'Hazards' },
  map: { dir: 'maps', area: 'maps', label: 'Map', plural: 'Maps' },
  inventory: { dir: 'inventory', area: null, label: 'Inventory item', plural: 'Inventory' },
  revelation: { dir: 'revelations', area: null, label: 'Revelation', plural: 'Revelations' },
  clock: { dir: 'clocks', area: null, label: 'Clock', plural: 'Clocks' },
  handout: { dir: 'handouts', area: 'handouts', label: 'Handout', plural: 'Handouts and Props' },
};
for (const [type, spec] of Object.entries(ENTITY_TYPES)) spec.collection = spec.dir.replace(/-./g, (m) => m[1].toUpperCase());

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseEntityFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  if (/\.ya?ml$/.test(file)) return { data: yaml.load(text) ?? {}, body: '' };
  const m = text.match(FRONTMATTER);
  if (!m) return { data: {}, body: text };
  return { data: yaml.load(m[1]) ?? {}, body: m[2] };
}

export function listFiles(dir, exts = /\.(md|ya?ml)$/) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.name.startsWith('_') || name.name.startsWith('.')) continue;
    const full = path.join(dir, name.name);
    if (name.isDirectory()) out.push(...listFiles(full, exts));
    else if (exts.test(name.name)) out.push(full);
  }
  return out;
}

let cache = null;
let cacheAt = 0;

export function loadRegistry({ fresh = false } = {}) {
  if (!fresh && cache && Date.now() - cacheAt < 1000) return cache;
  const entities = [];
  const byId = new Map();
  const duplicates = [];
  const problems = [];
  for (const [type, spec] of Object.entries(ENTITY_TYPES)) {
    for (const file of listFiles(path.join(CONTENT_DIR, spec.dir))) {
      let parsed;
      try {
        parsed = parseEntityFile(file);
      } catch (err) {
        problems.push(`${rel(file)}: cannot parse (${err.message})`);
        continue;
      }
      const entity = { type, file, data: parsed.data, body: parsed.body };
      entities.push(entity);
      const id = parsed.data.id;
      if (!id) problems.push(`${rel(file)}: missing id`);
      else if (byId.has(id)) duplicates.push({ id, files: [rel(byId.get(id).file), rel(file)] });
      else byId.set(id, entity);
    }
  }
  // Paths live inside branch files: index them so references (`when`, `onPaths`, `requires`) resolve.
  for (const b of entities.filter((e) => e.type === 'branch')) {
    for (const p of b.data.paths ?? []) {
      if (!p?.id) continue;
      if (byId.has(p.id)) duplicates.push({ id: p.id, files: [rel(byId.get(p.id).file), rel(b.file)] });
      else byId.set(p.id, { type: 'path', file: b.file, branch: b, data: { id: p.id, name: p.name, slug: p.id.slice('path.'.length) }, body: '', view: { id: p.id, name: p.name } });
    }
  }
  for (const e of entities) e.view = viewOf(e, byId, entities);
  cache = { entities, byId, duplicates, problems, statblocksOf: (npcId) => entities.filter((e) => e.type === 'creature' && e.data.npc === npcId) };
  cacheAt = Date.now();
  return cache;
}

// What every consumer displays. Identity always comes from its owner: a stat block
// linked to an NPC takes the NPC's name (with title) and ancestry trait, so those
// facts exist in exactly one file.
export function viewOf(entity, byId, entities = []) {
  const d = entity.data;
  // One fact, one place: an Asset that a location stands for is where that location is.
  if (entity.type === 'asset') {
    const place = entities.find((e) => e.type === 'location' && e.data.asset === d.id);
    return { ...d, location: place ? place.data.parent : d.start?.location, place: place?.data.id };
  }
  if (entity.type === 'npc' || entity.type === 'pc') {
    return { ...d, fullName: [d.title, d.name].filter(Boolean).join(' '), levelLabel: profileLabel(d, d.level) };
  }
  if (entity.type !== 'creature') return d;
  if (!d.npc) return { ...d, levelLabel: `Creature ${d.level}` };
  const person = byId.get(d.npc)?.data;
  if (!person) return { ...d, name: d.name ?? `[missing ${d.npc}]`, levelLabel: `Creature ${d.level ?? '?'}` };
  const fullName = [person.title, person.name].filter(Boolean).join(' ');
  const traits = [person.ancestry, ...(d.traits ?? [])].filter(Boolean);
  const lvl = d.level ?? person.level; // a variant may set its own level
  return { ...d, name: fullName, level: lvl, traits: [...new Set(traits)], levelLabel: profileLabel(person, lvl) };
}

// Ruling 2026-11-17: NPCs (and PCs) read like PCs, "<Ancestry> <Class> <Level>".
const profileLabel = (person, lvl) => [person.ancestry, person.class, lvl].filter((x) => x !== undefined && x !== null && x !== '').join(' ');

export function entityUrl(entity) {
  if (entity.type === 'path') return entity.branch.data.slug ? `${BASE}/branches/${entity.branch.data.slug}/#${entity.data.slug}` : null;
  const area = ENTITY_TYPES[entity.type]?.area;
  if (!area || !entity.data.slug) return null;
  if (area === PART) return `${BASE}/${partDir(entity.data.part)}/${entity.data.slug}/`;
  return `${BASE}/${area}/${entity.data.slug}/`;
}

// ---------------------------------------------------------------- parts and chapters
// A part is a docs folder whose index.md has `part:` frontmatter: its id and its chapters (the groups of
// events and encounters inside it). A part with no chapters lists its folder's pages.
export const UNPLACED = 'unplaced';
export function loadParts() {
  const docs = path.join(CONTENT_DIR, 'docs');
  const out = [];
  for (const dir of fs.existsSync(docs) ? fs.readdirSync(docs, { withFileTypes: true }) : []) {
    const index = path.join(docs, dir.name, 'index.md');
    if (!dir.isDirectory() || !fs.existsSync(index)) continue;
    const { data } = parseEntityFile(index);
    // The part folder's other pages that belong to an item (belongsTo), in sidebar order.
    const itemPages = fs.readdirSync(path.join(docs, dir.name)).filter((f) => f.endsWith('.md') && f !== 'index.md').map((f) => {
      const p = parseEntityFile(path.join(docs, dir.name, f)).data;
      return { slug: f.replace(/\.md$/, ''), title: p.title, label: p.sidebar?.label ?? p.title, order: p.sidebar?.order ?? 99, belongsTo: p.belongsTo };
    }).filter((p) => p.belongsTo).sort((a, b) => a.order - b.order);
    if (data.part?.id)
      out.push({
        itemPages,
        dir: dir.name, id: data.part.id, title: data.title,
        label: data.part.label ?? data.title,             // the sidebar group
        pageLabel: data.sidebar?.label ?? data.title,     // the part page's own entry in it
        order: data.sidebar?.order ?? 99, chapters: data.part.chapters ?? [],
      });
  }
  return out.sort((a, b) => a.order - b.order);
}
export function partDir(partId) {
  return loadParts().find((p) => p.id === partId)?.dir ?? UNPLACED;
}
// A part's chapters with their items, in order; items naming a missing part or chapter are unplaced.
export function partChapters(reg, part) {
  const items = reg.entities.filter((e) => (e.type === 'event' || e.type === 'encounter') && e.data.part === part.id);
  return part.chapters.map((s) => ({
    ...s,
    items: [
      ...items.filter((e) => e.data.chapter === s.key).sort((a, b) => (a.data.order ?? 99) - (b.data.order ?? 99)),
      ...(s.entries ?? []).map((id) => reg.byId.get(id)).filter(Boolean),
    ].map((e) => Object.assign(e, { pages: (part.itemPages ?? []).filter((p) => p.belongsTo === e.data.id) })),
  }));
}
// The narrative threads an event or encounter is on: every thread carried by a connection that leads out of
// it or into it (its own and its variants' leadsTo, and other items' leadsTo that end at it), plus threads
// it links to. Sorted by name; unknown ids are left out (the validator reports them).
export function threadsOf(reg, id) {
  const ids = new Set();
  const conns = (e) => [...(e.data.leadsTo ?? []), ...(e.data.variants ?? []).flatMap((v) => v.leadsTo ?? [])];
  for (const e of reg.entities) {
    if (e.type !== 'event' && e.type !== 'encounter') continue;
    for (const l of conns(e)) if (l.thread && (e.data.id === id || l.to === id)) ids.add(l.thread);
    if (e.data.id === id) for (const l of e.data.links ?? []) { const lid = typeof l === 'string' ? l : l.id; if (lid?.startsWith('thread.')) ids.add(lid); }
  }
  return [...ids].map((t) => reg.byId.get(t)).filter((t) => t?.type === 'thread').sort((a, b) => a.view.name.localeCompare(b.view.name));
}
export function unplacedItems(reg) {
  const parts = loadParts();
  return reg.entities.filter((e) => {
    if (e.type !== 'event' && e.type !== 'encounter') return false;
    const p = parts.find((x) => x.id === e.data.part);
    return !p || !p.chapters.some((c) => c.key === e.data.chapter);
  });
}

export const rel = (file) => path.relative(ROOT, file);

// ---------------------------------------------------------------- references between entries
// Every canonical id an entry's data refers to (dotted paths). Shared by the validator, the pages
// and the stale-references page, so all three agree.
export const REF_FIELDS = {
  creature: ['npc'],
  npc: ['start.faction', 'start.socialClass', 'start.location', 'start.reaffirmedFaction'],
  pc: ['start.faction', 'start.socialClass', 'start.location', 'start.reaffirmedFaction'],
  faction: ['start.leader'],
  asset: ['start.controller', 'start.location', 'start.statusActor'],
  location: ['parent', 'asset'],
  goal: ['faction', 'champion', 'target.id', 'target.owner'],
  encounter: ['event'],
  branch: ['origin', 'convergence'],
};
const valueAt = (data, dotted) => dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), data);

export function referencesOf(entity) {
  const d = entity.data;
  const out = [];
  for (const f of REF_FIELDS[entity.type] ?? []) if (valueAt(d, f)) out.push({ path: f, id: valueAt(d, f) });
  (d.appliesTo ?? []).forEach((id, i) => out.push({ path: `appliesTo[${i}]`, id }));
  if (['event', 'encounter', 'thread'].includes(entity.type)) {
    (d.leadsTo ?? []).forEach((l, i) => {
      out.push({ path: `leadsTo[${i}].to`, id: l.to });
      out.push({ path: `leadsTo[${i}].thread`, id: l.thread });
    });
    (d.links ?? []).forEach((l, i) => out.push({ path: `links[${i}]`, id: typeof l === 'string' ? l : l.id }));
    (d.variesBy ?? []).forEach((id, i) => out.push({ path: `variesBy[${i}]`, id }));
    (d.onPaths ?? []).forEach((id, i) => out.push({ path: `onPaths[${i}]`, id }));
    (d.variants ?? []).forEach((v, i) => {
      (v.when ?? []).forEach((id, j) => out.push({ path: `variants[${i}].when[${j}]`, id }));
      (v.leadsTo ?? []).forEach((l, j) => {
        out.push({ path: `variants[${i}].leadsTo[${j}].to`, id: l.to });
        out.push({ path: `variants[${i}].leadsTo[${j}].thread`, id: l.thread });
      });
      (v.links ?? []).forEach((l, j) => out.push({ path: `variants[${i}].links[${j}]`, id: typeof l === 'string' ? l : l.id }));
    });
  }
  if (entity.type === 'branch') (d.requires ?? []).forEach((id, i) => out.push({ path: `requires[${i}]`, id }));
  if (entity.type === 'npc' || entity.type === 'pc') (d.relationships ?? []).forEach((r, i) => r.to && out.push({ path: `relationships[${i}].to`, id: r.to }));
  if (entity.type === 'condition') {
    (d.requires ?? []).forEach((r, i) => {
      for (const k of ['assetId', 'characterId', 'factionId', 'locationId', 'conditionId', 'goalId']) if (r[k]) out.push({ path: `requires[${i}].${k}`, id: r[k] });
    });
    if (d.variesBy?.subject?.id) out.push({ path: 'variesBy.subject.id', id: d.variesBy.subject.id });
  }
  for (const [when, list] of Object.entries(entity.type === 'goal' ? (d.effects ?? {}) : {}))
    (list ?? []).forEach((fx, i) => {
      out.push({ path: `effects.${when}[${i}].targetId`, id: fx.targetId });
      if (/^(controllingFactionId|locationChange)$/.test(fx.property)) out.push({ path: `effects.${when}[${i}].value`, id: fx.value });
    });
  return out;
}

// §12: references to entries that no longer exist (usually something deleted through the app while
// other entries still name it). Flagged in the book and the app; never removed automatically.
export function staleReferences(reg) {
  return reg.entities.flatMap((e) => referencesOf(e).filter((r) => !reg.byId.has(r.id)).map((r) => ({ from: e.data.id, entity: e, file: rel(e.file), path: r.path, to: r.id })));
}

