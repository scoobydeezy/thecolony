#!/usr/bin/env node
// RETIRED 2026-11-17 (the switch is done). Kept for the record.
// Step 2 of the character store (ADVENTURE-BOOK-PLAN.md §9): merge every character
// from the app database, Character Briefs and the book's existing NPC entries into one
// file each, in staging/characters/, with a report of every decision and conflict.
//
// Read-only on all inputs. Writes only staging/characters/ (git-ignored). Nothing in
// src/content/ or the app changes until the switch (step 4).
//
//   node scripts/merge-characters.mjs [path/to/colony.db]
//
// Precedence when sources differ (never silent; every difference is reported):
//   1. the book's existing entries   (user rulings already applied)
//   2. Character Briefs              (unmigrated source documents are authoritative)
//   3. the app database              (kept as canon wherever it is the only source)
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import yaml from 'js-yaml';
import { slug } from 'github-slugger';
import { ROOT, loadRegistry } from '../src/lib/registry.mjs';
import { SOURCE_DOCS_DIR } from '../src/lib/source-docs.mjs';
import { schemas } from '../src/schemas.mjs';

const DB_PATH = path.resolve(process.argv[2] ?? path.join(ROOT, '../colony-data/colony.db'));
const BRIEFS = path.join(SOURCE_DOCS_DIR, 'Character Briefs.md');
const OUT = path.join(ROOT, 'staging/characters');
const RESOLUTIONS_FILE = path.join(ROOT, 'sources/character-merge-resolutions.yaml');
const resolutions = fs.existsSync(RESOLUTIONS_FILE) ? yaml.load(fs.readFileSync(RESOLUTIONS_FILE, 'utf8')) ?? {} : {};
const usedResolutions = new Set();
let currentId = null; // the character being merged, for resolution lookup

// ------------------------------------------------------------------ helpers
const norm = (s) =>
  String(s ?? '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/^\s*[•*-]\s+/gm, '- ')
    .replace(/\*\*|__|(?<!\w)[*_](?!\s)|(?<!\s)[*_](?!\w)|`/g, '')
    .replace(/\s+/g, ' ')
    .trim();
const asciiSlug = (s) => slug(norm(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/["']/g, ''));
const nameKey = (s) => norm(s).toLowerCase().replace(/["']/g, '');
const empty = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);
const ENUMS = {
  state: ['Alive', 'Dead', 'Missing', 'Forgotten'],
  tier: ['Major', 'Supporting', 'Minor', 'Background'],
  belief: ['Positive', 'Neutral', 'Negative'],
  doubt: ['A', 'B', 'C', 'AB', 'AC', 'BC'],
  instability: ['Stable', 'Conflicted', 'Compromised'],
  visibility: ['Public', 'GMOnly', 'Revealed'],
};
const enumName = (kind, v) => (v === null || v === undefined ? undefined : typeof v === 'number' ? ENUMS[kind][v] : v);

// Profile fields ↔ the fixed section headings used in files (and in Character Briefs).
const PROFILE = [
  ['overview', 'Overview'],
  ['personality', 'Personality'],
  ['motivation', 'Motivation'],
  ['primaryProtection', 'Primary Protection'],
  ['fears', 'Fears'],
  ['blindSpot', 'Blind Spot'],
  ['narrativeRole', 'Narrative Role'],
  ['portrayalNotes', 'Portrayal Notes'],
  ['pressureResponse', 'Pressure Response'],
  ['signatureQuote', 'Signature Quote'],
  ['signatureObject', 'Signature Object'],
  ['performanceInspiration', 'Performance Inspiration'],
  ['notes', 'Notes'],
];
const PROFILE_BY_HEADING = new Map(PROFILE.map(([k, h]) => [h.toLowerCase(), k]));

// ------------------------------------------------------------------ inputs
const db = new DatabaseSync(DB_PATH, { readOnly: true });
// Retired after the switch (2026-11-17): characters now live in src/content/npcs and pcs, and the
// database no longer has character columns. Kept as a record of how the migration was done.
if (!db.prepare("select name from pragma_table_info('Characters')").all().some((c) => c.name === 'Name')) {
  console.error('merge-characters: the switch is complete. Characters live in src/content/npcs/ and pcs/ and are edited there or in the app; this tool is retired.');
  process.exit(1);
}
const chars = db.prepare('select * from Characters order by Name').all();
const profiles = new Map(db.prepare('select * from CharacterNarrativeProfiles').all().map((p) => [p.CharacterId, p]));
const details = new Map();
for (const d of db.prepare('select * from CharacterDetails order by SortOrder').all()) {
  if (!details.has(d.CharacterId)) details.set(d.CharacterId, []);
  details.get(d.CharacterId).push(d);
}

// Character Briefs: "## Title - Name" (or "## Name"), optional "Ancestry | Age | flavor: X", then ### sections.
function parseBriefs(text) {
  const briefs = [];
  let cur = null;
  let sec = null;
  for (const line of text.split('\n')) {
    // Characters are "## Title - Name" (or "## Name"). One brief uses "# Title - Name" (Tomlin Cobb),
    // so an H1 in Title - Name form also starts a character; any other H1 is a group heading
    // ("Supporting Characters") and ends the current character.
    const h1 = line.match(/^# (.*)$/);
    if (h1 && !/ - /.test(h1[1])) {
      cur = null;
      sec = null;
      continue;
    }
    const h2 = line.match(/^## (.*)$/) ?? (h1 && / - /.test(h1[1]) ? h1 : null);
    if (h2) {
      const heading = h2[1].trim();
      if (/^Document Contract/i.test(heading)) {
        cur = null;
        continue;
      }
      const m = heading.match(/^(.*?) - (.*)$/);
      cur = { heading, title: m ? m[1].trim() : undefined, name: (m ? m[2] : heading).trim(), sections: [], meta: {} };
      sec = null;
      briefs.push(cur);
      continue;
    }
    if (!cur) continue;
    const h3 = line.match(/^### (.*)$/);
    if (h3) {
      sec = { heading: h3[1].trim(), lines: [] };
      cur.sections.push(sec);
      continue;
    }
    if (!sec && /\|/.test(line) && !cur.meta.raw) {
      const parts = line.split('|').map((s) => s.trim());
      cur.meta = { raw: line, ancestry: parts[0] || undefined, age: /^\d+$/.test(parts[1]) ? Number(parts[1]) : undefined, flavor: parts.slice(2).join('|').replace(/^flavor:\s*/i, '').trim() || undefined };
      continue;
    }
    if (sec) sec.lines.push(line);
  }
  for (const b of briefs) for (const s of b.sections) s.body = s.lines.join('\n').replace(/^\s*---\s*$/gm, '').trim();
  return briefs;
}
const briefs = parseBriefs(fs.readFileSync(BRIEFS, 'utf8'));
const briefByName = new Map(briefs.map((b) => [nameKey(b.name), b]));
const briefByTitle = new Map(briefs.filter((b) => b.title).map((b) => [nameKey(b.title), b]));
// A brief can name a character differently from the app: match on the name, then on any of the
// app's aliases, then on the brief's title ("## The Observer - Silas Venn" ↔ app "The Observer").
function findBrief(row) {
  const aliases = (row.Aliases ?? '').split(/\s*[,;]\s*/).filter(Boolean);
  for (const key of [row.Name, ...aliases]) if (briefByName.has(nameKey(key))) return { brief: briefByName.get(nameKey(key)), how: key === row.Name ? 'name' : `alias "${key}"` };
  if (briefByTitle.has(nameKey(row.Name))) return { brief: briefByTitle.get(nameKey(row.Name)), how: 'brief title' };
  return null;
}

const reg = loadRegistry({ fresh: true });
const bookByName = new Map(reg.entities.filter((e) => e.type === 'npc').map((e) => [nameKey(e.data.name), e]));
const statblocksOf = (npcId) => reg.statblocksOf(npcId);

// ------------------------------------------------------------------ merge
const report = [];
const idMap = [];
const usedIds = new Set();
const totals = { characters: 0, conflicts: 0, fuzzy: 0, invalid: 0, briefOnly: 0 };
const countStatus = (st) => report.reduce((n, r) => n + r.log.filter((l) => l.status === st).length, 0);

// Differences are classified so the report only asks about real ones:
//   same       equal after normalising quotes, emphasis, bullets and whitespace
//   extends    one value contains the other: keep the longer, nothing is lost
//   conflict   genuinely different: keep by precedence, show the others for review
function decide(field, { book, brief, app }, log) {
  const vals = { book, brief, app };
  const present = Object.entries(vals).filter(([, v]) => !empty(v));
  const flat = (v) => norm(Array.isArray(v) ? v.join(', ') : v);
  // A recorded decision (sources/character-merge-resolutions.yaml) settles the field, conflict or not.
  const r = resolutions[currentId]?.[field];
  if (r !== undefined) {
    usedResolutions.add(`${currentId}\u0000${field}`);
    if (r && typeof r === 'object' && ('text' in r || 'value' in r)) {
      const v = 'text' in r ? r.text : r.value;
      log.push({ field, status: 'resolved', winner: 'consolidated', value: v, others: present });
      return v;
    }
    if (r === 'keep') {
      if (!present.length) throw new Error(`${currentId} ${field}: resolution "keep" but no source has a value`);
      log.push({ field, status: 'resolved', winner: present[0][0], value: present[0][1], others: present.slice(1) });
      return present[0][1];
    }
    const chosen = present.find(([src]) => src === r);
    if (!chosen) throw new Error(`${currentId} ${field}: resolution "${r}" names a source with no value`);
    log.push({ field, status: 'resolved', winner: r, value: chosen[1], others: present.filter(([src]) => src !== r) });
    return chosen[1];
  }
  if (present.length === 0) return undefined;
  let [winner, value] = present[0];
  const differing = present.filter(([, v]) => flat(v) !== flat(value));
  if (!differing.length) {
    log.push({ field, status: present.length > 1 ? 'same' : `${winner} only`, winner, value });
    return value;
  }
  // Superset rule: if every differing value is contained in one candidate, keep that one.
  const all = present.map(([src, v]) => [src, v, flat(v)]);
  const superset = all.find(([, , f]) => all.every(([, , g]) => f.includes(g)));
  if (superset) {
    const [src, v] = superset;
    log.push({ field, status: 'extends', winner: src, value: v, others: all.filter(([s2]) => s2 !== src).map(([s2, v2]) => [s2, v2]) });
    return v;
  }
  totals.conflicts++;
  log.push({ field, status: 'conflict', winner, value, others: differing });
  return value;
}

function sectionMatch(appDetail, briefSections) {
  const a = slug(appDetail.Heading);
  const k = appDetail.Key;
  for (const s of briefSections) {
    const b = slug(s.heading);
    if (b === a || b === k) return { section: s, how: 'exact' };
  }
  for (const s of briefSections) {
    const b = slug(s.heading);
    if (b.startsWith(`${k}-`) || b.endsWith(`-${k}`) || b.startsWith(`${a}-`) || a.endsWith(`-${b}`) || b.endsWith(`-${a}`)) return { section: s, how: 'fuzzy' };
  }
  return null;
}

function mergeOne({ row, brief, book, matchedBy }) {
  const kind = row?.CharacterType === 1 ? 'pc' : 'npc';
  const name = book?.data.name ?? brief?.name ?? row?.Name;
  let id = book?.data.id;
  if (!id) {
    const base = `${kind}.${asciiSlug(name)}`;
    id = base;
    for (let n = 2; usedIds.has(id); n++) id = `${base}-${n}`;
  }
  usedIds.add(id);
  currentId = id;
  const log = [];
  if (matchedBy && matchedBy !== 'name') log.push({ field: 'match', status: 'note', value: `app "${row.Name}" matched Character Briefs "${brief.heading}" by ${matchedBy}` });
  const prof = row ? profiles.get(row.Id) : undefined;
  const briefSec = (heading) => brief?.sections.find((s) => s.heading.toLowerCase() === heading.toLowerCase())?.body;
  const bd = book?.data ?? {};

  // ---- identity
  const d = {
    id,
    slug: id.slice(id.indexOf('.') + 1),
    name: decide('name', { book: bd.name, brief: brief?.name, app: row?.Name }, log),
    title: decide('title', { book: bd.title }, log),
    role: decide('role', { book: bd.role, brief: brief?.title, app: row?.Occupation }, log),
    ancestry: decide('ancestry', { book: bd.ancestry, brief: brief?.meta.ancestry, app: row?.Ancestry }, log),
    heritage: decide('heritage', { app: row?.Heritage }, log),
    class: decide('class', { book: bd.class, app: row?.Class }, log),
    background: decide('background', { app: row?.Background }, log),
  };
  // Level: the book entry (ruling) > the linked stat block > the app.
  const sb = book ? statblocksOf(book.data.id).find((s) => !s.data.variant) : undefined;
  d.level = decide('level', { book: bd.level ?? sb?.data.level, app: row?.Level }, log);
  Object.assign(d, {
    gender: decide('gender', { app: row?.Gender }, log),
    pronouns: decide('pronouns', { app: row?.Pronouns }, log),
    age: decide('age', { brief: brief?.meta.age, app: row?.Age }, log),
    aliases: decide('aliases', { app: row?.Aliases ? row.Aliases.split(/\s*[,;]\s*/).filter(Boolean) : undefined }, log),
    summary: decide('summary', { book: bd.summary, app: row?.Summary }, log),
    portrait: decide('portrait', { app: row?.PortraitPath }, log),
    narrativeTier: row ? enumName('tier', row.NarrativeTier) : 'Minor',
    status: bd.status && bd.status !== 'stub' ? bd.status : 'draft',
    origin: 'prepared',
  });
  if (row) {
    d.start = {
      faction: row.FactionId ?? undefined,
      socialClass: row.SocialClassId ?? undefined,
      location: row.LocationId ?? undefined,
      state: enumName('state', row.State),
      instability: enumName('instability', row.Instability),
      reaffirmedFaction: row.ReaffirmedFactionId ?? undefined,
      // Exact doubles, not rounded: the simulation must see identical inputs after the switch.
      values: { truth: row.TruthValue, stability: row.StabilityValue, agency: row.AgencyValue },
      beliefs: prune({ a: enumName('belief', row.BeliefA), b: enumName('belief', row.BeliefB), c: enumName('belief', row.BeliefC) }),
      doubt: enumName('doubt', row.DoubtDirection),
      conviction: row.Conviction,
      pressure: row.Pressure,
      influence: row.Influence,
      impressionable: row.Impressionable,
    };
  }
  const provenance = [...(bd.provenance ?? [])];
  if (brief && !provenance.some((p) => p.doc === 'Character Briefs')) provenance.push({ doc: 'Character Briefs', heading: brief.heading });
  if (provenance.length) d.provenance = provenance;
  if (bd.design) d.design = bd.design;

  // ---- profile + detail sections (body)
  const sections = [];
  for (const [field, heading] of PROFILE) {
    const briefValue = field === 'performanceInspiration' ? brief?.meta.flavor : briefSec(heading);
    const v = decide(`§ ${heading}`, { brief: briefValue, app: prof?.[field[0].toUpperCase() + field.slice(1)] }, log);
    if (!empty(v)) sections.push({ heading, body: v, audience: 'gm' });
  }
  const usedBrief = new Set(PROFILE.map(([, h]) => h.toLowerCase()));
  const appDetails = row ? details.get(row.Id) ?? [] : [];
  const extra = (brief?.sections ?? []).filter((s) => !usedBrief.has(s.heading.toLowerCase()) && !PROFILE_BY_HEADING.has(s.heading.toLowerCase()));
  const matchedBrief = new Set();
  const detailOut = [];
  for (const det of appDetails) {
    const m = sectionMatch(det, extra);
    const audience = det.Visibility === 0 ? 'players' : 'gm';
    if (det.Visibility === 2) log.push({ field: `§ ${det.Heading}`, status: 'note', value: 'Revealed at the table: the revealed flag stays in the database' });
    if (m) {
      matchedBrief.add(m.section);
      if (m.how === 'fuzzy') {
        totals.fuzzy++;
        log.push({ field: `§ ${det.Heading}`, status: 'fuzzy match', value: `app "${det.Heading}" (key ${det.Key}) ↔ brief "${m.section.heading}"` });
      }
      const v = decide(`§ ${m.section.heading}`, { brief: m.section.body, app: det.Body }, log);
      detailOut.push({ heading: m.section.heading, body: v, audience, appKey: det.Key, at: extra.indexOf(m.section) });
    } else {
      const v = decide(`§ ${det.Heading}`, { app: det.Body }, log);
      if (!empty(v)) detailOut.push({ heading: det.Heading, body: v, audience, appKey: det.Key, at: Infinity });
    }
  }
  extra.forEach((s, i) => {
    if (matchedBrief.has(s)) return;
    const v = decide(`§ ${s.heading}`, { brief: s.body }, log);
    if (!empty(v)) detailOut.push({ heading: s.heading, body: v, audience: 'gm', at: i });
  });
  detailOut.sort((a, b) => a.at - b.at);
  for (const s of detailOut) {
    if (s.appKey && s.appKey !== slug(s.heading)) log.push({ field: `§ ${s.heading}`, status: 'key change', value: `app key "${s.appKey}" → "${slug(s.heading)}" (no Revealed state references it)` });
    sections.push(s);
  }
  // Book stub bodies (if any) are carried over verbatim at the end.
  if (book?.body?.trim()) sections.push({ heading: 'Notes (from the book entry)', body: book.body.trim(), audience: 'gm' });

  // ---- write + validate
  const dupes = sections.map((x) => slug(x.heading)).filter((k, i, all) => all.indexOf(k) !== i);
  if (dupes.length) {
    totals.invalid++;
    log.push({ field: 'sections', status: 'INVALID', value: `duplicate section headings: ${[...new Set(dupes)].join(', ')}` });
  }
  const fm = prune(d);
  const parsed = schemas[kind].safeParse(fm);
  if (!parsed.success) {
    totals.invalid++;
    log.push({ field: 'schema', status: 'INVALID', value: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
  }
  const body = sections
    .map((s) => {
      const text = s.audience === 'players' ? `:::player-facing\n${s.body}\n:::` : s.body;
      return `## ${s.heading}\n\n${text}\n`;
    })
    .join('\n');
  const header = `---\n# yaml-language-server: $schema=../../../schemas/${kind}.schema.json\n${yaml.dump(fm, { lineWidth: -1, noRefs: true, quotingType: '"' })}---\n\n`;
  const dir = path.join(OUT, kind === 'pc' ? 'pcs' : 'npcs');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${d.slug}.md`), header + body);

  totals.characters++;
  if (!row) totals.briefOnly++;
  // App detail keys whose section now has a different heading (e.g. matched to a brief section).
  const renames = Object.fromEntries(detailOut.filter((x) => x.appKey && x.appKey !== slug(x.heading)).map((x) => [x.appKey, slug(x.heading)]));
  idMap.push({ appId: row?.Id ?? null, id, name: d.name, kind, ...(Object.keys(renames).length ? { sections: renames } : {}) });
  report.push({ id, name: d.name, kind, sources: [row && 'app', brief && 'Character Briefs', book && 'book'].filter(Boolean), log });
}

function prune(o) {
  if (Array.isArray(o)) return o;
  if (!o || typeof o !== 'object') return o;
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    if (empty(v)) continue;
    const p = typeof v === 'object' && !Array.isArray(v) ? prune(v) : v;
    if (p && typeof p === 'object' && !Array.isArray(p) && Object.keys(p).length === 0 && k !== 'beliefs') continue;
    out[k] = p;
  }
  return out;
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const seenBriefs = new Set();
for (const row of chars) {
  const found = findBrief(row);
  const brief = found?.brief;
  if (brief) {
    if (seenBriefs.has(brief)) throw new Error(`Character Briefs "${brief.heading}" matches more than one app character`);
    seenBriefs.add(brief);
  }
  mergeOne({ row, brief, matchedBy: found?.how, book: bookByName.get(nameKey(row.Name)) ?? (brief && bookByName.get(nameKey(brief.name))) });
}
for (const brief of briefs) if (!seenBriefs.has(brief)) mergeOne({ row: null, brief, book: bookByName.get(nameKey(brief.name)) });

// ------------------------------------------------------------------ outputs
// Fields whose final value intentionally differs from the app database (merge decisions).
// The API's parity check (step 3) suppresses exactly these; anything else is a reader bug.
const expected = {};
for (const r of report) {
  if (!r.sources.includes('app')) continue;
  const fields = r.log
    .filter((l) => {
      if (['same', 'app only', 'note', 'key change', 'fuzzy match', 'INVALID'].includes(l.status)) return false;
      if (l.status === 'conflict' || l.status === 'resolved' || l.status === 'extends') return l.winner !== 'app';
      return / only$/.test(l.status); // book only / brief only: the app had nothing
    })
    .map((l) => l.field);
  if (fields.length) expected[r.id] = [...new Set(fields)];
}
fs.writeFileSync(path.join(OUT, 'expected-differences.json'), `${JSON.stringify(expected, null, 2)}\n`);

fs.writeFileSync(
  path.join(OUT, 'id-map.yaml'),
  `# App character GUID -> canonical id. Used at the switch (step 4) to create the link rows.\n${yaml.dump(idMap, { lineWidth: -1 })}`,
);

const clip = (v) => {
  const s = Array.isArray(v) ? v.join(', ') : String(v);
  return s.length > 400 ? `${s.slice(0, 400)}…` : s;
};
const q = (v) => clip(v).replace(/\n+/g, ' ⏎ ');
let md = `# Character merge report\n\nGenerated ${new Date().toISOString()} by \`scripts/merge-characters.mjs\` from:\n\n- app database: \`${path.relative(ROOT, DB_PATH)}\` (read-only)\n- \`Character Briefs.md\`\n- the book's existing NPC entries\n\n`;
md += `**${totals.characters} characters** written to \`staging/characters/\` · **${totals.conflicts} conflicts to decide** (kept by precedence: book → Character Briefs → app) · **${countStatus('resolved')} resolved** · **${countStatus('extends')} kept the longer version** · **${totals.fuzzy} fuzzy section matches** to confirm · **${totals.briefOnly}** in Character Briefs with no app record · **${totals.invalid}** failing the schema.\n\n`;
md += `Review the conflicts below. Nothing in \`src/content/\` or the app has changed.\n\n`;
md += `## 1. Conflicts to decide\n\nGenuinely different values. The kept value follows the precedence above; say which to keep where it is wrong.\n\n`;
for (const r of report) {
  const items = r.log.filter((l) => l.status === 'conflict' || l.status === 'INVALID');
  if (!items.length) continue;
  md += `### ${r.name} (\`${r.id}\`)\n\n`;
  for (const l of items) {
    if (l.status === 'INVALID') md += `- **schema** — INVALID: ${l.value}\n`;
    else {
      md += `- **${l.field}** — kept **${l.winner}**: “${q(l.value)}”\n`;
      for (const [src, v] of l.others) md += `  - ${src}: “${q(v)}”\n`;
    }
  }
  md += '\n';
}
md += `## Resolved (from \`sources/character-merge-resolutions.yaml\`)\n\n`;
for (const r of report) {
  const items = r.log.filter((l) => l.status === 'resolved');
  if (items.length) md += `- **${r.name}**: ${items.map((l) => `${l.field} → ${l.winner}`).join(', ')}\n`;
}
const stale = [];
for (const [cid, fields] of Object.entries(resolutions)) {
  if (!fields || typeof fields !== 'object') continue;
  for (const f of Object.keys(fields)) if (!usedResolutions.has(`${cid}\u0000${f}`)) stale.push(`${cid} ${f}`);
}
if (stale.length) md += `\n**Stale resolutions** (no matching conflict any more; remove or update): ${stale.join(', ')}\n`;
md += '\n';
md += `## 2. Kept the longer version (one contains the other)\n\nNo information lost. Listed so you can spot a deliberate shortening.\n\n`;
for (const r of report) {
  const items = r.log.filter((l) => l.status === 'extends');
  if (items.length) md += `- **${r.name}**: ${items.map((l) => `${l.field} (kept ${l.winner})`).join(', ')}\n`;
}
md += `\n## 3. Other notes\n\n`;
for (const r of report) {
  const items = r.log.filter((l) => ['fuzzy match', 'key change', 'note'].includes(l.status));
  for (const l of items) md += `- **${r.name}** — ${l.field}: ${l.status}: ${q(l.value)}\n`;
}
const briefOnly = report.filter((r) => !r.sources.includes('app'));
if (briefOnly.length) md += `- **In Character Briefs but not in the app:** ${briefOnly.map((r) => r.name).join(', ')}. Files were written from the brief alone; they get app records at the switch.\n`;
md += '\n';
md += `## All characters\n\n| Character | Kind | Sources | Same | From one source | Longer kept | Conflicts |\n|---|---|---|---:|---:|---:|---:|\n`;
for (const r of report) {
  const c = (s) => r.log.filter((l) => l.status === s).length;
  md += `| ${r.name} | ${r.kind} | ${r.sources.join(', ')} | ${c('same')} | ${r.log.filter((l) => / only$/.test(l.status)).length} | ${c('extends')} | ${c('conflict')} |\n`;
}
fs.writeFileSync(path.join(OUT, 'MERGE-REPORT.md'), md);
console.log(`✓ merged ${totals.characters} characters → ${path.relative(ROOT, OUT)}/  (${totals.conflicts} conflicts to decide, ${countStatus('resolved')} resolved, ${countStatus('extends')} kept-longer, ${totals.fuzzy} fuzzy matches, ${totals.briefOnly} brief-only, ${totals.invalid} invalid)`);
