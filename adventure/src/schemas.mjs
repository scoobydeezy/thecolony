// Canonical entity schemas. Astro validates every content file against these
// at build time; scripts/json-schema.mjs turns them into JSON Schema for YAML
// editing and for the Angular reference contract.
import { z } from 'astro/zod';

const idOf = (prefix) =>
  z.string().regex(new RegExp(`^${prefix}\\.[a-z0-9]+(?:[.-][a-z0-9]+)*$`), `must look like ${prefix}.some-name`);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'kebab-case slug');
const anyId = z.string().regex(/^[a-z]+\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/, 'canonical id');

// Where a fact came from in the original source documents (designer metadata).
const provenance = z
  .array(z.object({ doc: z.string(), heading: z.string(), note: z.string().optional() }))
  .default([]);

const base = (prefix) =>
  z.object({
    id: idOf(prefix),
    slug,
    name: z.string().min(1),
    summary: z.string().optional(),
    status: z.enum(['stub', 'draft', 'canonical']).default('draft'),
    previousSlugs: z.array(slug).default([]),
    aliases: z.array(anyId).default([]),
    provenance,
    // Internal designer notes. Never rendered in the GM build.
    design: z.string().optional(),
  });

const strike = z.object({
  name: z.string(),
  type: z.enum(['melee', 'ranged']).default('melee'),
  bonus: z.number().int(),
  damage: z.string(),
  traits: z.array(z.string()).default([]),
});

const level = z.number().int().min(-1).max(25);
const statblock = {
  level: level.optional(), // required for creatures; an NPC's stat block takes the NPC's level
  rarity: z.enum(['common', 'uncommon', 'rare', 'unique']).default('common'),
  size: z.enum(['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan', 'Small or Medium']),
  traits: z.array(z.string()).default([]),
  perception: z.number().int(),
  senses: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  skills: z.record(z.string(), z.number().int()).default({}),
  ac: z.number().int(),
  saves: z.object({ fort: z.number().int(), ref: z.number().int(), will: z.number().int() }),
  hp: z.number().int().positive(),
  immunities: z.array(z.string()).default([]),
  resistances: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  speed: z.string(),
  strikes: z.array(strike).default([]),
  abilityDC: z.number().int().optional(),
};

// Ownership split for people who also have stat blocks:
//   character (npc / pc)  owns identity, profile, class and level, and starting values
//   creature              owns mechanics: defences, Strikes, abilities (never identity)
// The link lives only on the creature (`npc:`); the NPC's stat blocks are found by
// reverse lookup, so the link can't disagree with itself.
// Ruling 2026-11-17: an NPC's stat block reads "<Ancestry> <Class> <Level>" (e.g.
// "Dwarf Fighter 13"); "Creature" is reserved for entities that are not NPCs.
const creature = base('creature')
  .extend({
    ...statblock,
    name: z.string().min(1).optional(), // only for creatures that are not NPCs
    npc: idOf('npc').optional(),
    // Distinguishes several stat blocks for one person, e.g. "Ritual Chamber".
    variant: z.string().optional(),
  })
  .strict()
  .superRefine((d, ctx) => {
    if (d.npc && d.name) ctx.addIssue({ code: 'custom', path: ['name'], message: `stat block of ${d.npc} must not set name; it comes from the NPC entry` });
    if (!d.npc && !d.name) ctx.addIssue({ code: 'custom', path: ['name'], message: 'a creature without npc: needs a name' });
    if (!d.npc && d.level === undefined) ctx.addIssue({ code: 'custom', path: ['level'], message: 'a creature without npc: needs a level' });
    if (d.npc && d.level !== undefined && !d.variant) ctx.addIssue({ code: 'custom', path: ['level'], message: `level comes from ${d.npc}; only a variant: stat block may set a different level` });
  });

// The whole character, one file each. The app reads and saves these through its API;
// only what happens in play (events and their replayed effects) stays in the database.
const belief = z.enum(['Positive', 'Neutral', 'Negative']);
// The Truth / Stability / Agency vector every simulated entity starts from.
const values = z
  .object({ truth: z.number().min(0).max(1), stability: z.number().min(0).max(1), agency: z.number().min(0).max(1) })
  .strict()
  .refine((v) => Math.abs(v.truth + v.stability + v.agency - 1) < 0.02, { message: 'truth + stability + agency must sum to 1' });
const beliefs = z.object({ a: belief.optional(), b: belief.optional(), c: belief.optional() }).strict().default({});

// References between entity files are canonical ids (faction.order-of-theia), never app ids;
// the app maps them to its own rows per campaign.
const start = z
  .object({
    faction: idOf('faction').optional(),
    socialClass: idOf('faction').optional(), // a faction entry with type: SocialClass
    location: idOf('location').optional(),
    state: z.enum(['Alive', 'Dead', 'Missing', 'Forgotten']).default('Alive'),
    instability: z.enum(['Stable', 'Conflicted', 'Compromised']).default('Stable'),
    reaffirmedFaction: idOf('faction').optional(),
    values,
    beliefs,
    doubt: z.enum(['A', 'B', 'C', 'AB', 'AC', 'BC']).optional(),
    conviction: z.number().int().min(0).max(100).default(50),
    pressure: z.number().int().default(0),
    influence: z.number().int().min(0).max(100).default(0),
    impressionable: z.number().int().min(0).max(100).default(50),
  })
  .strict();

// A character's relationships (ADVENTURE-BOOK-PLAN.md §15), stored on the character they belong to.
const characterId = z.string().regex(/^(npc|pc)\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/, 'must look like npc.some-name or pc.some-name');
const relationship = z
  .object({
    to: characterId.optional(), // the other character, if it is one
    type: z.string().min(1), // "Spouse", "Mentor", "Political Symbol", ...
    summary: z.string().optional(),
    state: z.enum(['Active', 'Estranged', 'Severed', 'Unknown']).optional(), // absent = Active
    visibility: z.enum(['Public', 'GMOnly', 'Revealed']).optional(), // absent = GMOnly
  })
  .strict();

const character = (prefix) =>
  base(prefix)
    .extend({
      title: z.string().optional(), // shown before the name, e.g. "Captain"
      role: z.string().optional(), // occupation / position, e.g. "Captain of the Guard"
      ancestry: z.string().optional(), // becomes the ancestry trait on every linked stat block
      heritage: z.string().optional(),
      class: z.string().optional(),
      background: z.string().optional(),
      level: level.optional(),
      gender: z.string().optional(),
      pronouns: z.string().optional(),
      age: z.number().int().positive().optional(),
      aliases: z.array(z.string()).default([]),
      portrait: z.string().optional(),
      narrativeTier: z.enum(['Major', 'Supporting', 'Minor', 'Background']).default('Minor'),
      // improvised: created at the table, not yet promoted to prepared canon
      origin: z.enum(['prepared', 'improvised']).default('prepared'),
      start: start.optional(),
      relationships: z.array(relationship).default([]),
    })
    .strict();

// Factions and social classes (ADVENTURE-BOOK-PLAN.md §10): the whole group, one file each.
// The app reads and saves these through its API, as it does characters.
const faction = base('faction')
  .extend({
    type: z.enum(['Faction', 'SocialClass']).default('Faction'),
    motto: z.string().optional(),
    represents: z.string().optional(),
    publicFace: z.string().optional(),
    selfImage: z.string().optional(),
    coreTenet: z.string().optional(),
    focus: z.string().optional(),
    certainOf: z.string().optional(),
    rightAbout: z.string().optional(),
    afraidOf: z.string().optional(),
    wrongAbout: z.string().optional(),
    response: z.string().optional(),
    origin: z.string().optional(),
    foundedAs: z.string().optional(),
    became: z.string().optional(),
    history: z.string().optional(),
    notes: z.string().optional(), // GM notes (rendered in the GM book); designer notes go in design:
    heraldry: z
      .object({
        glyph: z.string().optional(),
        icon: z.string().optional(),
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        bannerShape: z.string().optional(),
      })
      .strict()
      .default({}),
    // Simulation baseline (live-locked once a campaign starts; play changes it through Effects).
    start: z
      .object({
        active: z.boolean().default(true),
        leader: z.string().regex(/^(npc|pc)\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/, 'must be an npc. or pc. id').optional(),
        momentum: z.number().int().min(-2).max(2).default(0),
        size: z.number().int().min(0).default(0),
        values,
        beliefs,
      })
      .strict()
      .optional(),
  })
  .strict();

// Assets: what factions hold and contest (infrastructure, artifacts, resources, intelligence).
// Faction goals (ADVENTURE-BOOK-PLAN.md §11). Effects are the app's advance Effects, with ids canonical.
const effect = z
  .object({
    targetType: z.enum(['asset', 'character', 'faction', 'location']),
    targetId: anyId,
    property: z.string(),
    delta: z.number().optional(),
    value: z.string().optional(), // a faction id (controllingFactionId) or location id (locationChange), or a state name
  })
  .strict();
const goal = base('goal')
  .extend({
    faction: idOf('faction'),
    type: z.enum(['Achieve', 'Maintain']).default('Achieve'),
    priority: z.enum(['Critical', 'Major', 'Minor']).default('Major'),
    visibility: z.enum(['Open', 'Known', 'Secret']).default('Known'),
    outcome: z.enum(['Automatic', 'Adjudicated']).default('Automatic'),
    earliestAct: z.number().int().min(1).max(3).default(2),
    champion: z.string().regex(/^(npc|pc)\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/, 'must be an npc. or pc. id').optional(),
    target: z
      .object({
        type: z.enum(['Faction', 'Character', 'Asset']).optional(),
        id: anyId.optional(),
        state: z.string().optional(),
        owner: idOf('faction').optional(),
        property: z.string().optional(),
        operator: z.string().optional(),
        threshold: z.number().int().optional(),
      })
      .strict()
      .optional(),
    effects: z.object({ progressing: z.array(effect).optional(), accomplished: z.array(effect).optional() }).strict().optional(),
    start: z.object({ status: z.enum(['Plotting', 'Progressing', 'Stalled', 'Accomplished', 'Failed', 'Retired']).default('Plotting') }).strict().optional(),
  })
  .strict();

// Narrative content (ADVENTURE-BOOK-PLAN.md §13). Events (narrative containers) and encounters (complex
// scenarios) are pages in a part's chapters; the part page owns its chapters and how their items relate.
// Frontmatter is app data; the Markdown body is the book's prose, which the app never touches.
const visibility = z.enum(['Public', 'GMOnly', 'Revealed']);
// A bare id, or a mapping when the link carries more (as the app records it).
const links = z
  .array(
    z.union([
      anyId,
      z.object({ id: anyId, role: z.string().optional(), notes: z.string().optional(), primary: z.boolean().optional(), visibility: visibility.optional() }).strict(),
    ]),
  )
  .default([]);
const linkId = (l) => (typeof l === 'string' ? l : l.id);
export { linkId };
const readiness = z
  .object({
    status: z.enum(['scaffold', 'compiled', 'audited', 'inventoried', 'written', 'closed']),
    playtest: z.array(z.string()).default([]),
  })
  .strict();
// A connection (stored on its source).
const leadsToEntry = z.object({ to: z.string().regex(/^(event|encounter)\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/), thread: idOf('thread'), visibility: visibility.optional() }).strict();
// Branching (ADVENTURE-BOOK-PLAN.md §14): a version of the item that holds on some paths. A field that is
// absent is inherited from the item; one that is present replaces it, even when empty.
const variant = z
  .object({
    key: slug, // stable handle for this version (the app's id for it is derived from the item and the key)
    when: z.array(idOf('path')).default([]), // all of these paths must hold
    summary: z.string().optional(),
    synopsis: z.string().optional(),
    leadsTo: z.array(leadsToEntry).optional(),
    links: z.array(z.union([anyId, z.object({ id: anyId, role: z.string().optional(), notes: z.string().optional(), primary: z.boolean().optional(), visibility: visibility.optional() }).strict()])).optional(),
  })
  .strict();
const narrativeItem = (prefix, extra = {}) =>
  base(prefix)
    .extend({
      function: z.string().optional(), // narrative function, e.g. "Introduce The Keeper"
      synopsis: z.string().optional(),
      visibility: visibility.default('GMOnly'),
      // Where the item sits in the book. Optional: an item created in the app is unplaced until it is
      // given a chapter (the book lists it under "Unplaced").
      part: idOf('part').optional(), // the part page (an act, or a general part) the item belongs to
      chapter: slug.optional(), // a chapter key on the part page
      order: z.number().int().min(1).optional(),
      // The item's sidebar labels (book only; the app ignores them). label: its entry, or its group when it
      // has pages of its own (defaults to the name). overviewLabel: that group's first link (defaults to "Overview").
      sidebar: z.object({ label: z.string().optional(), overviewLabel: z.string().optional() }).strict().optional(),
      route: z.string().optional(), // which faction route, for alternative / concurrent chapters
      // Stored once, on the source: "what leads here" is a reverse lookup.
      leadsTo: z.array(leadsToEntry).default([]),
      // Every entry the item involves or presents (cast, places, Assets, rules, stat blocks...).
      links,
      variesBy: z.array(idOf('branch')).default([]), // branches whose paths this item resolves differently on
      onPaths: z.array(idOf('path')).default([]), // paths whose timeline passes through this item (explicit scope)
      variants: z.array(variant).default([]),
      readiness: readiness.optional(),
      inventory: z.array(z.object({ id: idOf('inventory'), note: z.string().optional() }).strict()).default([]),
      revelations: z.array(z.object({ id: idOf('revelation'), mode: z.enum(['introduces', 'requires', 'keeps-available']) }).strict()).default([]),
      ...extra,
    })
    .strict();
const event = narrativeItem('event');
const encounter = narrativeItem('encounter', { event: idOf('event').optional() }); // the event it belongs to, if any
const thread = base('thread').extend({ color: z.string().optional(), links }).strict();
// A branch (§14): where the story splits into paths and where they rejoin. Paths are declared here; their
// ids are canonical (path.<slug>) and are what events' `when` and `onPaths` name.
// World Conditions (ADVENTURE-BOOK-PLAN.md §15; §18.6, §18.9 of the board-game review): a persistent rule or
// circumstance. In force = established (from the start, or by an Event) and every requirement holds.
// Requirements and "varies by" read recorded entity state only; ids are canonical. A faction id of ""
// means "no one" / "no faction".
const factionOrNone = z.union([idOf('faction'), z.literal('')]);
const requirement = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('assetController'), assetId: idOf('asset'), factionId: factionOrNone }).strict(),
  z.object({ kind: z.literal('assetStatus'), assetId: idOf('asset'), statuses: z.array(z.string()) }).strict(),
  z.object({ kind: z.literal('characterState'), characterId, states: z.array(z.string()) }).strict(),
  z.object({ kind: z.literal('characterFaction'), characterId, factionId: factionOrNone }).strict(),
  z.object({ kind: z.literal('leaderCapable'), factionId: idOf('faction'), capable: z.boolean() }).strict(),
  z.object({ kind: z.literal('locationState'), locationId: idOf('location'), states: z.array(z.string()) }).strict(),
  z.object({ kind: z.literal('condition'), conditionId: idOf('condition'), inForce: z.boolean() }).strict(),
  z.object({ kind: z.literal('goalStage'), goalId: idOf('goal'), stages: z.array(z.string()) }).strict(),
]);
const condition = base('condition')
  .extend({
    rule: z.string().optional(), // the rule as stated at the table while in force
    otherwise: z.string().optional(), // what holds at the table while it is not
    stress: z.number().int().default(0), // added to Colony Stress while in force (may be negative)
    requires: z.array(requirement).default([]),
    // The rule depends on one entity's property: a row per state, with its text and Stress.
    variesBy: z
      .object({
        subject: z.object({ kind: z.enum(['assetStatus', 'assetController', 'characterState', 'characterFaction', 'locationState', 'goalStage']), id: anyId }).strict(),
        rows: z.array(z.object({ state: z.string(), text: z.string(), stress: z.number().int() }).strict()),
      })
      .strict()
      .optional(),
    start: z.object({ established: z.boolean().default(true) }).strict().optional(), // absent = established at the start
  })
  .strict();

const branch = base('branch')
  .extend({
    origin: z.string().regex(/^(event|encounter)\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/).optional(),
    convergence: z.string().regex(/^(event|encounter)\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/).optional(),
    requires: z.array(idOf('path')).default([]), // paths of other branches that must all hold for this branch to apply
    paths: z.array(z.object({ id: idOf('path'), name: z.string().min(1) }).strict()).default([]),
  })
  .strict();

const asset = base('asset')
  .extend({
    type: z.enum(['Infrastructure', 'Artifact', 'Resource', 'Intelligence']).default('Infrastructure'),
    role: z.enum(['Operational', 'Strategic', 'Symbolic', 'Covert', 'Mandate']).default('Operational'),
    tier: z.number().int().min(1).max(5).default(3),
    keystone: z.boolean().default(false),
    start: z
      .object({
        controller: idOf('faction').optional(),
        // Omitted when a location stands for this Asset (location asset:): the Asset is where that location is.
        location: idOf('location').optional(),
        status: z.enum(['Stable', 'Contested', 'Damaged', 'Destroyed']).default('Stable'),
        statusActor: idOf('faction').optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const location = base('location')
  .extend({
    type: z.string().optional(), // free text: District, Building, Room, ...
    parent: idOf('location').optional(),
    asset: idOf('asset').optional(), // the Asset this place is; the Asset's location is this entry's parent
    markerColor: z.string().optional(),
    start: z.object({ state: z.enum(['Stable', 'ActiveIncursion', 'Unstable']).default('Stable') }).strict().optional(),
  })
  .strict();

export const schemas = {
  creature,
  npc: character('npc'),
  pc: character('pc'),
  faction,
  goal,
  event,
  encounter,
  thread,
  branch,
  condition,
  asset,
  location,
  rule: base('rule').extend({
    version: z.number().int().positive(),
    appliesTo: z.array(anyId).default([]),
  }).strict(),
  source: base('source').extend({
    class: z.number().int().min(1).max(5),
    sourceLevel: z.number().int().min(0).max(25),
    keystone: z.boolean().default(false),
  }).strict(),
  // BOOK-STRUCTURE.md §6: PF2e hazards, and maps (artwork, grid, scale, orientation; keyed areas belong to
  // the location or encounter that uses the map).
  hazard: base('hazard').extend({
    level: z.number().int().min(-1).max(25).optional(),
    complexity: z.enum(['simple', 'complex']).default('simple'),
    traits: z.array(z.string()).default([]),
  }).strict(),
  map: base('map').extend({
    image: z.string().optional(), // path under public/, e.g. maps/abiding-way.webp
    grid: z.string().optional(), // e.g. "5-foot squares"
    scale: z.string().optional(),
    orientation: z.string().optional(), // e.g. "north is up"
  }).strict(),
  item: base('item').extend({ level: z.number().int().min(0).max(25).optional(), traits: z.array(z.string()).default([]) }).strict(),
  inventory: base('inventory').extend({
    kind: z.enum(['prop', 'miniature', 'token', 'card', 'map', 'handout', 'reference-sheet', 'other']),
    quantity: z.number().int().positive().default(1),
    // Production status is designer-only (see the GM/designer visibility table).
    fabrication: z.object({ status: z.enum(['needed', 'designed', 'in-progress', 'done']), notes: z.string().optional() }).optional(),
  }).strict(),
  revelation: base('revelation').extend({ missable: z.boolean().default(false) }).strict(),
  clock: base('clock').extend({ segments: z.number().int().min(1).max(24) }).strict(),
  handout: base('handout').extend({ audience: z.enum(['players', 'gm']).default('players') }).strict(),
};

// Extra frontmatter on book chapters (extends Starlight's docsSchema()).
export const partMeta = z.object({
  // The book's editor (§16): the source file a generated page shows (relative to src/content), and on an
  // index page the type its "New" button creates. Docs pages use their own file.
  rpSource: z.string().optional(),
  rpNew: z.string().optional(),
  // On a generated entry page: the entry it shows (the right sidebar lists an event's or encounter's threads).
  rpEntity: anyId.optional(),
  // A book page that belongs to an event or encounter (The Burden's phase pages): listed under that item
  // in the sidebar and on the part page, in sidebar.order.
  belongsTo: anyId.optional(),
  // A part page (ADVENTURE-BOOK-PLAN.md §13, BOOK-STRUCTURE.md §1): its chapters, in order, and how each
  // chapter's items relate. Events and encounters name their part and chapter. A general part (Running,
  // The Colony) has no chapters: its pages are listed from its folder. A page's ## headings are its
  // sections, in Starlight's sense.
  part: z
    .object({
      id: idOf('part'),
      // The part's name in the sidebar (its group). Defaults to the page's title. The page's own entry
      // inside the group uses Starlight's sidebar.label, which also defaults to the title.
      label: z.string().optional(),
      chapters: z
        .array(
          z
            .object({
              key: slug,
              title: z.string(),
              // The chapter's sidebar label, used as written. Defaults to the title plus its arrangement hint.
              label: z.string().optional(),
              // reference: resources available throughout the part (BOOK-STRUCTURE.md §2).
              arrangement: z.enum(['sequence', 'alternatives', 'optional', 'concurrent', 'reference']),
              // Entries listed in the chapter that are not events or encounters (a location as a resource).
              entries: z.array(anyId).optional(),
              // Every entry of one type, by name, after any listed entries (the Veiled Sources).
              entriesOf: z.string().optional(),
            })
            .strict(),
        )
        .default([]),
    })
    .strict()
    .optional(),
  canon: z
    .object({
      // Canonical concept / entity IDs this chapter presents or depends on.
      concepts: z.array(anyId).default([]),
    })
    .default({ concepts: [] }),
  readiness: z
    .object({
      status: z.enum(['scaffold', 'compiled', 'audited', 'inventoried', 'written', 'closed']),
      playtest: z.array(z.string()).default([]),
    })
    .optional(),
  inventory: z.array(z.object({ id: idOf('inventory'), note: z.string().optional() })).default([]),
  revelations: z
    .array(z.object({ id: idOf('revelation'), mode: z.enum(['introduces', 'requires', 'keeps-available']) }))
    .default([]),
});
