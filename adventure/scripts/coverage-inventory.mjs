#!/usr/bin/env node
// The coverage inventory (BOOK-STRUCTURE.md §8): every section of the current source exports, with a
// provisional home in the book, its migration status, and its dependencies. A coverage safety net, not
// a migration: homes are confirmed one chapter at a time.
//
// Generated mechanically:
//   units     a document's sections; subheadings stay inside the section that owns them. A large section
//             (over 150 lines) splits into its children. In a document with numbered sections (The Burden),
//             unnumbered sections belong to the numbered one before them.
//   homes     1. provenance: book files that already cite the section (most reliable)
//             2. names: an encounter, event, creature or character named in the heading
//             3. rules: the table below, pointing at the pages planned in BOOK-STRUCTURE.md
//   status    migrated (a migration-map concept with reconciled provenance covers it) · in-progress (a book
//             file cites it) · not-started
//
// A row marked `confirmed: true` in sources/coverage.yaml survives regeneration as it is.
//
//   node scripts/coverage-inventory.mjs
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { ROOT, loadRegistry } from '../src/lib/registry.mjs';
import { listSourceDocs, headingsOf, resolveHeadingPath, loadMigrationMap } from '../src/lib/source-docs.mjs';

const OUT = path.join(ROOT, 'sources/coverage.yaml');
const reg = loadRegistry({ fresh: true });

// ------------------------------------------------------------------ planned homes (BOOK-STRUCTURE.md §1)
const PLANNED = {
  'page:running/how-to-use': 'Part I · How to Use This Book',
  'page:running/campaign-at-a-glance': 'Part I · The Campaign at a Glance',
  'page:running/gm-truths': 'Part I · GM Truths',
  'page:running/reading-and-branches': 'Part I · The Reading and Its Branches',
  'page:running/seven-components': 'Part I · The Seven Components of Identity',
  'page:running/veiled-primer': 'Part I · The Veiled: A Practical Primer',
  'page:running/colony-turn': 'Part I · The Colony Turn',
  'page:running/faction-operations': 'Part I · Faction Operations and the Act III Fronts',
  'page:running/running-the-game': 'Part I · Running Investigations, Relationships and Consequences',
  'page:running/progression-and-rewards': 'Part I · Character Progression and Rewards',
  'page:running/promises-and-threads': 'Part I · Promises and Threads',
  'page:setting/history': 'Part II · History of the Colony',
  'page:setting/geography': 'Part II · Geography and Districts',
  'page:setting/everyday-life': 'Part II · Everyday Life and Traditions',
  'page:setting/factions': 'Part II · The Factions',
  'page:setting/institutions': 'Part II · Civic Institutions',
  'page:setting/whos-who': "Part II · Who's Who",
  'page:act-1': 'Part III · Act I overview',
  'page:act-2': 'Part IV · Act II overview',
  'page:act-3': 'Part V · Act III overview',
  'page:act-3/the-burden-phase-1': 'Part V · The Burden, Phase I: Wound',
  'page:act-3/the-burden-phase-2': 'Part V · The Burden, Phase II: Composite',
  'page:act-3/the-burden-phase-3': 'Part V · The Burden, Phase III: Echo',
  'page:act-3/the-burden-phase-4': 'Part V · The Burden, Phase IV: Chorus',
  'page:reference/glossary': 'Part VI · Glossary',
  'page:reference/quick-reference': 'Part VI · Quick Reference',
  'handout.ledger': 'Part VI · Handouts: the Ledger (Hall of Remembrance records)',
  'handout.material-concordance': 'Part VI · Handouts: the Witnesses\' Material Concordance',
  designer: 'Designer area (rationale, open decisions, tuning, production)',
};
// Rule entries the primer will need (The Veiled); planned, not yet written.
for (const r of ['sources-and-resonance', 'class', 'active-sources', 'dispersal', 'stabilization-window', 'source-transfer', 'source-destruction', 'containment',
  'keystones', 'recover-and-restore', 'acceptance-and-stabilization', 'anchoring', 'corrupted-engrams'])
  PLANNED[`rule.${r}`] = `Part VI · Rules Reference: ${r.replace(/-/g, ' ')} (planned)`;

// ------------------------------------------------------------------ rules: [document, heading pattern, homes]
// Matched against the unit's heading path ("A > B"); the first match wins. Provisional by design.
const RULES = [
  ['Campaign Vision', /^Campaign Vision$|Final Entry/, ['page:running/campaign-at-a-glance']],
  ['Campaign Vision', /Design Principles/, ['page:running/running-the-game']],
  ['Campaign Vision', /.*/, ['designer']],
  ['The Colony — Foundational Truths', /First Law|Book of Names|The Ritual|Answer that Forgot/, ['page:running/gm-truths']],
  ['The Colony — Foundational Truths', /First Keeper/, ['page:running/gm-truths', 'page:setting/history']],
  ['The Colony — Foundational Truths', /^The Colony$/, ['page:setting/history']],
  ['The Colony — Foundational Truths', /Traditions/, ['page:setting/everyday-life']],
  ['The Colony — Foundational Truths', /Factions/, ['page:setting/factions']],
  ['The Colony — Foundational Truths', /Veiled/, ['page:running/veiled-primer']],
  ['The Colony — Foundational Truths', /.*/, ['page:running/campaign-at-a-glance']],
  ['GM Design Guide', /^The Veiled/, ['page:running/veiled-primer']],
  ['GM Design Guide', /^The Observer/, ['npc.silas-venn']],
  ['GM Design Guide', /^Endings/, ['page:act-3']],
  ['GM Design Guide', /.*/, ['page:running/running-the-game']],
  ['Faction Goals', /Document Contract|Core Principles|Open Decisions/, ['designer']],
  ['Faction Goals', /Goal Model/, ['rule.faction-goals', 'page:running/faction-operations']],
  ['Faction Goals', /Worked Examples/, ['page:running/faction-operations']],
  ['Faction Goals', /Colony Turn|Direct Play/, ['rule.colony-turn', 'page:running/colony-turn']],
  ['Faction Goals', /Act III/, ['rule.act-three-fronts', 'page:running/faction-operations', 'event.totality']],
  ['Faction Goals', /Quick Reference/, ['page:reference/quick-reference']],
  ['Faction Goals', /.*/, ['page:running/faction-operations']],
  ['The Veiled', /Player-Facing Rules Vocabulary/, ['page:reference/glossary']],
  ['The Veiled', /^Sources and Resonance/, ['rule.sources-and-resonance']],
  ['The Veiled', /^Class|Veiled Classification/, ['rule.class']],
  ['The Veiled', /^Active Sources/, ['rule.active-sources']],
  ['The Veiled', /^Dispersal/, ['rule.dispersal']],
  ['The Veiled', /^The Stabilization Window/, ['rule.stabilization-window']],
  ['The Veiled', /^Source Transfer/, ['rule.source-transfer']],
  ['The Veiled', /^Source Destruction/, ['rule.source-destruction']],
  ['The Veiled', /^Containment/, ['rule.containment']],
  ['The Veiled', /^Keystones/, ['rule.keystones']],
  ['The Veiled', /^Identity as Meaning|^Recovering Identity|^Recover and Restore|^Acceptance and Stabilization|^Reconstruction After Partial Stabilization/, ['rule.identity-and-stabilization']],
  ['The Veiled', /^Anchoring and Resolution/, ['rule.anchoring-and-resolution']],
  ['The Veiled', /^Anchors by Resonance/, ['rule.anchoring-and-resolution']],
  ['The Veiled', /^Corrupted Engrams/, ['rule.corrupted-engrams']],
  ['The Veiled', /^Faction Methods/, ['page:setting/factions']],
  ['The Veiled', /^The Final Veiled|Final Problem Is Anchoring/, ['encounter.the-burden']],
  ['The Veiled', /^Campaign Foreshadowing/, ['page:running/promises-and-threads']],
  ['The Veiled', /^Minimal Worked Example — Bad Maps/, ['encounter.bad-maps']],
  ['The Veiled', /Numerical Tuning|Final Design Test|Encounter Planning Worksheet|Common Design Failure Modes|Pathfinder Encounter Framework/, ['designer']],
  ['The Veiled', /.*/, ['page:running/veiled-primer']],
  ['Campaign Outline', /Document Contract|Causal Spines|Continuity Watchlist|Final Design Test/, ['designer']],
  ['Campaign Outline', /^Campaign Outline$|^Campaign Premise|^Campaign Structure|Twelve-Session/, ['page:running/campaign-at-a-glance']],
  ['Campaign Outline', /^Foundational Narrative Truths/, ['page:running/gm-truths']],
  ['Campaign Outline', /^The Seven Components/, ['page:running/seven-components']],
  ['Campaign Outline', /^Campaign-Wide Promises/, ['page:running/promises-and-threads']],
  ['Campaign Outline', /^Branching and Continuity/, ['page:running/reading-and-branches']],
  ['Campaign Outline', /^Session Preparation/, ['page:running/running-the-game']],
  ['Campaign Outline', /^Colony State Handoff/, ['page:running/colony-turn']],
  ['Campaign Outline', /^Faction Relationships as Act III/, ['page:running/faction-operations']],
  ['Campaign Outline', /^Faction Function Across/, ['page:setting/factions']],
  ['Campaign Outline', /Clearing House/, ['location.clearing-house']],
  ['Campaign Outline', /^The Manor Investigation Model/, ['page:act-2', 'event.the-manor']],
  ['Campaign Outline', /^What Will You Carry/, ['event.the-light-remains']],
  ['Campaign Outline', /^Act I —/, ['page:act-1']],
  ['Campaign Outline', /^Act II —/, ['page:act-2']],
  ['Campaign Outline', /^Act III —/, ['page:act-3']],
  ['Character Briefs', /Document Contract|^Character Briefs$/, ['designer']],
  ['Encounters', /^Encounters$|Document Contract/, ['designer']],
  ['Creatures', /^Creatures$/, ['designer']],
  ['The Ledger — Hall of Remembrance Source Records', /Sealed Key/, ['encounter.the-tangled-web']],
  ['The Ledger — Hall of Remembrance Source Records', /Change Log/, ['designer']],
  ['The Ledger — Hall of Remembrance Source Records', /.*/, ['handout.ledger']],
  ['The Witnesses — Material Concordance', /Act III Archival Tests/, ['encounter.the-tangled-web']],
  ['The Witnesses — Material Concordance', /Status and remaining/, ['designer']],
  ['The Witnesses — Material Concordance', /.*/, ['handout.material-concordance']],
  ['The Burden — Final Veiled Encounter', /^(1|2|3|4|12|13|14|15|16|17|20|21)\./, ['encounter.the-burden']],
  ['The Burden — Final Veiled Encounter', /^5\./, ['page:act-3/the-burden-phase-1']],
  ['The Burden — Final Veiled Encounter', /^6\./, ['page:act-3/the-burden-phase-2']],
  ['The Burden — Final Veiled Encounter', /^7\./, ['page:act-3/the-burden-phase-3']],
  ['The Burden — Final Veiled Encounter', /^(8|9)\./, ['page:act-3/the-burden-phase-4']],
  ['The Burden — Final Veiled Encounter', /^(10|11)\./, ['event.aletheia']],
  ['The Burden — Final Veiled Encounter', /^(18|19)\./, ['designer']],
  ['The Burden — Final Veiled Encounter', /^The Burden — Final Veiled Encounter$/, ['encounter.the-burden']],
];

// Dependencies: what must foreshadow or come before (BOOK-STRUCTURE.md §8). Seeded; extended by hand.
const DEPENDS = [
  [/^The Ledger/, /.*/, ['encounter.a-life', 'encounter.the-tangled-web']],
  [/^The Witnesses — Material Concordance/, /.*/, ['encounter.a-life', 'encounter.the-tangled-web']],
  [/^The Burden/, /^4\.|^(5|6|7|9)\./, ['page:running/seven-components']],
  [/^Campaign Outline/, /^The Seven Components/, ['encounter.the-burden']],
  [/^The Veiled/, /Campaign Foreshadowing/, ['encounter.the-burden']],
];

// ------------------------------------------------------------------ units
const PREVIOUS = fs.existsSync(OUT) ? yaml.load(fs.readFileSync(OUT, 'utf8')) : null;
const confirmed = new Map();
for (const [doc, rows] of Object.entries(PREVIOUS?.documents ?? {})) for (const r of rows) if (r.confirmed) confirmed.set(`${doc}\n${r.heading}`, r);

function unitsOf(doc) {
  const lines = fs.readFileSync(doc.file, 'utf8').split('\n');
  // headingsOf skips fenced code; find each heading's line number in order.
  const hs = headingsOf(doc.file);
  let at = 0;
  for (const h of hs) {
    while (at < lines.length && !(lines[at].startsWith('#'.repeat(h.depth) + ' ') && lines[at].replace(/\*\*|__|`/g, '').includes(h.text.slice(0, 20)))) at++;
    h.line = at + 1;
    at++;
  }
  hs.forEach((h, i) => (h.end = (hs.slice(i + 1).find((x) => x.depth <= h.depth)?.line ?? lines.length + 1) - 1));
  const pathOf = (i) => {
    const out = [hs[i].text];
    for (let j = i - 1, d = hs[i].depth; j >= 0; j--) if (hs[j].depth < d) { out.unshift(hs[j].text); d = hs[j].depth; }
    return out;
  };
  const title = hs[0]?.depth === 1 ? 0 : -1;
  let top = hs.map((h, i) => ({ h, i })).filter(({ h, i }) => h.depth === 1 && i !== title);
  if (top.length <= 3) top = hs.map((h, i) => ({ h, i })).filter(({ h }) => h.depth === 2);
  const numbered = top.filter(({ h }) => /^\d+\./.test(h.text)).length >= 5;
  let units = [];
  for (const u of top) {
    if (numbered && !/^\d+\./.test(u.h.text) && units.length) {
      const owner = units[units.length - 1];
      owner.end = Math.max(owner.end, u.h.end);
      owner.sub.push(u.h.text);
      continue;
    }
    units.push({ i: u.i, h: u.h, end: u.h.end, sub: [] });
  }
  // Split a large section into its children (once); the parent keeps a row for its own introduction.
  const out = [];
  if (title === 0 && hs[1] && hs[1].line - hs[0].line > 3) out.push({ i: 0, h: hs[0], end: hs[1].line - 1, sub: [] });
  for (const u of units) {
    const kids = hs.map((h, i) => ({ h, i })).filter(({ h, i }) => i > u.i && h.depth === u.h.depth + 1 && h.line <= u.end);
    if (!numbered && u.end - u.h.line > 150 && kids.length > 1) {
      if (kids[0].h.line - u.h.line > 3) out.push({ ...u, end: kids[0].h.line - 1, intro: true });
      for (const k of kids) out.push({ i: k.i, h: k.h, end: k.h.end, sub: [], parent: u.h.text });
    } else out.push(u);
  }
  return out.map((u) => ({
    // The document's own title is not part of a section's path (except for the title's introduction).
    heading: pathOf(u.i).filter((t, j) => !(j === 0 && title === 0 && u.i !== 0 && t === hs[0].text)).join(' > '),
    line: u.h.line,
    lines: u.end - u.h.line + 1,
    subheadings: hs.filter((h) => h.line > u.h.line && h.line <= u.end).length,
    ...(u.intro ? { intro: true } : {}),
    _range: [u.h.line, u.end],
    _text: u.h.text,
    _parent: u.parent ?? null,
  }));
}

// ------------------------------------------------------------------ provenance and concepts
const cites = []; // { doc, line, id }
const docs = listSourceDocs();
if (!docs.length) throw new Error('No source documents found; set COLONY_SOURCE_DOCS_DIR. Existing coverage was not changed.');
const headingsCache = new Map(docs.map((d) => [d.name, headingsOf(d.file)]));
function lineOf(docName, heading) {
  const d = docs.find((x) => x.name === docName);
  if (!d) return null;
  const hs = headingsCache.get(docName);
  const target = resolveHeadingPath(hs, heading);
  if (!target) return null;
  const lines = fs.readFileSync(d.file, 'utf8').split('\n');
  const idx = lines.findIndex((l) => /^#{1,6} /.test(l) && l.replace(/\*\*|__|`/g, '').includes(target.text));
  return idx < 0 ? null : idx + 1;
}
for (const e of reg.entities) for (const p of e.data.provenance ?? []) { const line = lineOf(p.doc, p.heading); if (line) cites.push({ doc: p.doc, line, id: e.data.id }); }
const map = loadMigrationMap();
const concepts = [];
for (const [id, c] of Object.entries(map.concepts ?? {}))
  for (const p of c.provenance ?? []) { const line = lineOf(p.doc, p.heading); if (line) concepts.push({ doc: p.doc, line, id, migrated: c.status === 'migrated' && p.reconciled }); }

// ------------------------------------------------------------------ names
const named = reg.entities.filter((e) => ['event', 'encounter', 'npc', 'pc', 'location'].includes(e.type)).map((e) => ({ id: e.data.id, name: e.view?.name ?? e.data.name, type: e.type }));
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[“”"'’]/g, '').replace(/^the /, '').trim();
function byName(docName, text) {
  if (docName === 'Encounters' || docName === 'Creatures') {
    const t = norm(text.replace(/^\d+\.\s*/, '').split(' — ')[0].replace(/^shape of someone$/, 'the shape of someone'));
    if (/^11\. The Confluence/.test(text)) return ['event.the-confluence'];
    if (/^12\. Totality/.test(text)) return ['event.totality'];
    const hit = named.filter((n) => (n.type === 'encounter' || n.type === 'event') && norm(n.name) === t);
    return hit.length ? [hit.find((h) => h.type === 'encounter')?.id ?? hit[0].id] : null;
  }
  if (docName === 'Character Briefs') {
    const t = norm(text.includes(' - ') ? text.split(' - ').slice(1).join(' - ') : text);
    const hit = named.filter((n) => (n.type === 'npc' || n.type === 'pc') && (norm(n.name) === t || t.includes(norm(n.name)) || norm(n.name).includes(t)));
    return hit.length === 1 ? [hit[0].id] : null;
  }
  return null;
}
// Creatures.md sections that continue the encounter before them (no encounter name in the heading).
const CREATURE_CONTINUES = /Evin Fragment Sources|The Six Lives|Mechanical Running Notes|Gallery Forms|Phase Transition — Three Released|Tuning Notes|Vault Procedures|Formation and Line|Progress Track|Remembered Rescue Team/;

// ------------------------------------------------------------------ build
const documents = {};
const summary = [];
for (const d of docs) {
  const rows = [];
  let lastEncounter = null;
  for (const u of unitsOf(d)) {
    const key = `${d.name}\n${u.heading}`;
    if (confirmed.has(key)) { rows.push(confirmed.get(key)); continue; }
    const inRange = (x) => x.doc === d.name && x.line >= u._range[0] && x.line <= u._range[1];
    const prov = [...new Set(cites.filter(inRange).map((c) => c.id))];
    const con = concepts.filter(inRange);
    // Order: a name in the heading, then a rule for the section itself, then the book files that cite it,
    // then the parent section's rule. Citations are always recorded (citedBy), whatever wins.
    let homes = [], basis = 'none';
    const ownRule = RULES.find(([doc, re]) => doc === d.name && re.test(u._text));
    const parentRule = u._parent ? RULES.find(([doc, re]) => doc === d.name && re.test(u._parent)) : null;
    if ((homes = byName(d.name, u._text) ?? (u._parent ? byName(d.name, u._parent) : null) ?? [])?.length) basis = 'name';
    else if (d.name === 'Creatures' && (CREATURE_CONTINUES.test(u._text) || CREATURE_CONTINUES.test(u._parent ?? '')) && lastEncounter) { homes = [lastEncounter]; basis = 'name'; }
    else if (ownRule && !(ownRule[1].source === '.*' && prov.length)) { homes = ownRule[2]; basis = 'rule'; }
    else if (prov.length) { homes = prov; basis = 'provenance'; }
    else if (parentRule) { homes = parentRule[2]; basis = 'rule'; }
    else if (ownRule) { homes = ownRule[2]; basis = 'rule'; }
    if (d.name === 'Creatures' && basis === 'name') lastEncounter = homes[0];
    // Migrated only when a reconciled concept covers this very section; anything cited inside it is progress.
    const status = con.some((c) => c.migrated && c.line === u.line) ? 'migrated' : con.length || prov.length ? 'in-progress' : 'not-started';
    const deps = [...new Set(DEPENDS.filter(([doc, re]) => doc.test(d.name) && re.test(u._text)).flatMap((x) => x[2]))].filter((x) => !homes.includes(x));
    rows.push({
      heading: u.heading, line: u.line, lines: u.lines, subheadings: u.subheadings, ...(u.intro ? { intro: true } : {}),
      home: homes.length ? homes : ['unclassified'], basis, status,
      ...(prov.filter((x) => !homes.includes(x)).length ? { citedBy: prov.filter((x) => !homes.includes(x)) } : {}),
      ...(con.length ? { concepts: [...new Set(con.map((c) => c.id))] } : {}),
      ...(deps.length ? { dependsOn: deps } : {}),
    });
  }
  documents[d.name] = rows;
  const n = (f) => rows.filter(f).length;
  summary.push({ doc: d.name, sections: rows.length, unclassified: n((r) => r.home.includes('unclassified')), migrated: n((r) => r.status === 'migrated'), inProgress: n((r) => r.status === 'in-progress') });
}

// Every home must be an existing entry or a planned one.
const unknown = [...new Set(Object.values(documents).flat().flatMap((r) => r.home))].filter((h) => h !== 'unclassified' && !PLANNED[h] && !reg.byId.has(h));
if (unknown.length) throw new Error(`homes that are neither entries nor planned: ${unknown.join(', ')}`);

const header = `# Coverage inventory (BOOK-STRUCTURE.md §8), generated by scripts/coverage-inventory.mjs.
# Every section of the ${docs.length} source documents, with a provisional home in the book. A coverage safety net:
# homes are confirmed one chapter at a time. Set confirmed: true on a row to keep it as edited when this is
# regenerated (other rows are rebuilt from provenance, names and the script's rules).
#   home     entry ids, planned pages (page:...), planned entries, "designer", or "unclassified"
#   basis    provenance (a book file cites the section) · name (named in the heading) · rule (the script's table) · none
#   status   migrated · in-progress · not-started
`;
fs.writeFileSync(OUT, header + yaml.dump({ generated: new Date().toISOString().slice(0, 10), planned: PLANNED, summary, documents }, { lineWidth: -1, noRefs: true, quotingType: '"' }));
const total = summary.reduce((a, s) => ({ sections: a.sections + s.sections, unclassified: a.unclassified + s.unclassified, migrated: a.migrated + s.migrated, inProgress: a.inProgress + s.inProgress }), { sections: 0, unclassified: 0, migrated: 0, inProgress: 0 });
console.log(`sources/coverage.yaml: ${total.sections} sections in ${docs.length} documents; ${total.unclassified} unclassified, ${total.inProgress} in progress, ${total.migrated} migrated`);
for (const s of summary) console.log(`  ${s.doc.padEnd(48)} ${String(s.sections).padStart(4)} sections  ${String(s.unclassified).padStart(3)} unclassified  ${s.inProgress} in progress  ${s.migrated} migrated`);
