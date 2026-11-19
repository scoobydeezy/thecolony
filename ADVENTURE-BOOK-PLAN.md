# Adventure Book: Architecture Recommendation and Staged Plan

**Date:** 2026-11-17
**Responds to:** *The Colony — Adventure Book Integration Brief (v3)*, which is approved, and the reviewer's three closing notes on it.
**Status:** A recommendation for approval. Implementation starts after the user signs off on §2 and §7.

This document is the brief's "deliver first" output. It covers:
- the architecture recommendation (§1–§4);
- the answers to the brief's §10 open questions (§5);
- the risks (§6);
- decisions that need the user (§7);
- the staged plan (§8).

Where this document and v3 disagree, this document wins. The disagreements are listed in §2.

---

## 1. Verdict on v3

**Adopt v3 with one change.** That change is to how app records are linked (§2.1). It's based on live campaign data that v3 didn't account for. Every other v3 decision is confirmed.

The reviewer's three closing notes are adopted as requirements in §3, and the user's repository decision is recorded in §5.1.

## 2. Changes to v3

### 2.1 Store app ↔ book links in the app only, resolved at runtime

**Finding:** the live campaign database (`colony-data/colony.db`) has 47 characters. Only five are seeded with slug IDs:
- Mira Voss
- Castor Vael
- Sable Ren
- Delegate Orin
- Tessara

Every character the book cares about first, including Vara (`65dff6f5-…`), Kelda Varruk, Serevan Ilvar and the narrative events *The Calling* and *The Reading*, was entered by hand and has a **GUID ID**.

v3 put the mapping for "seeded/static" records on the book side (`appRefs`), and declared book → app links impossible for GUID records. In practice that covers almost nothing, and it would mean pasting database GUIDs into canonical files. Those GUIDs belong to one campaign database and mean nothing in a new campaign.

**Recommendation: one mapping, stored in the app, and resolved when the link is followed.**
- **Mapping column:** add a nullable `BookRef` (a canonical ID) to each linkable app entity: Character, Faction, Asset, Location, FactionGoal, WorldCondition and NarrativeEvent. This is the **only** place a book ↔ app mapping exists.
- **App → book:**
  1. The record's `BookRef` is looked up in the reference index (canonical ID → URL and entity JSON).
  2. The app opens the drawer or links to the full page.
- **Book → app:**
  1. The book links to a stable app URL, `/ref/<canonical-id>`, for example `/ref/npc.vara-cairn`.
  2. A small Angular route resolves it through `GET /api/refs/{canonicalId}`.
  3. That redirects to `/characters/<guid>`, or shows "No record for this in the current campaign".
- **What this gives us:**
  - Starlight stays fully static and never holds campaign data or GUIDs.
  - The link is the same for every campaign.
  - Renaming a page or changing the database doesn't break it.
  - It satisfies "each mapping stored once".
- **Removed from v3:** `appRefs` on book entities. The "book → app not supported" row becomes supported.
- **Seed import:** when the future import tool creates records from canon, it fills in `BookRef` automatically.

### 2.2 Correction to slice item 8

v3's example, "Vara's NPC entry ↔ her character record via `appRefs`", becomes:
- Vara, Kelda and Serevan, plus the two narrative events, get their `BookRef` backfilled in the live database;
- links work in both directions through the mechanism in §2.1.

## 3. Reviewer's closing notes: adopted as requirements

### 3.1 Ownership: entity vs. encounter

**An entity owns what it mechanically does. An encounter owns how the scenario works.**

| Belongs to the entity | Belongs to the encounter chapter |
|---|---|
| Stats, Strikes, abilities and their effects | Setup, deployment, objectives, flow, tactics specific to this scenario, clocks, branches |
| *Kelda:* No One Crosses, Orderly Removal, Plant the Shield, Protector of the Keeper | *Kelda:* "Tactical Priority" (holding the route to the dais in the Ritual Chamber) |
| *Old Town Corpus:* Shell, Migratory Fragments, Recognize a Life | *Old Town:* the six-Corpus setup, investigation flow, Named Boundary progression |
| *Flood Deck:* card definitions, in a card data collection | *Milltown:* how the deck is run |

- **Pulling shared rules into an encounter:** an encounter can include a canonical rule inline with `<RuleEmbed id="…"/>`. For example, *The Burden* would show Keeper-Bound Handling in full. The embed renders the canonical text at build time and is never copied into the chapter, so the finale stays self-contained without duplicating anything.
- **First test of the rule:** Kelda's "Tactical Priority" is currently in Creatures.md but is specific to the scenario. Moving it into The Reading is the first application of this rule. See §7, decision 2.

### 3.2 What each build contains

| Generated content | GM build | Designer build |
|---|---|---|
| Adventure chapters and stat blocks | Yes | Yes |
| Encounter preparation inventories | Yes | Yes |
| Player handouts | Yes | Yes |
| Revelation and continuity reference | Yes, the GM-facing version | Yes |
| Production status and outstanding fabrication work | No | Yes |
| Concept migration status and drift reports | No | Yes |
| Original source documents and internal designer notes | No | Yes |

**How private content is excluded:**
- **Designer-only pages:** each content collection's loader filters entries on `BOOK_TARGET=gm|designer`. Designer-only pages are never generated in the GM build, so Pagefind never sees them.
- **Designer notes:**
  - `design:` frontmatter is never rendered;
  - the `<DesignNote>` component renders nothing when `BOOK_TARGET=gm`.
- **Post-build check:** after every GM build, a script scans `dist/` (HTML, the Pagefind index and the reference JSON) for a sentinel string planted in every private item. If it finds one, the build fails.

**Spoilers:** the GM build is a full spoiler. Today `/docs/` is exactly as exposed as the app itself, which already holds every GM secret and has no authentication. The access policy is therefore: **`/docs/` is never reachable from anywhere the app isn't.** If the app is ever made remotely accessible, both need authentication together. This is recorded as a hosting constraint, with nothing to build now.

### 3.3 Publishing the reference data atomically

- The reference JSON is produced **by the same Astro build** as the pages and served from the same `dist/` directory and image, so pages and data ship together.
- **Manifest:** `/docs/reference/manifest.json` contains:
  - `schemaVersion`;
  - `contentBuild`, a content hash;
  - a file list with a hash in each filename, for example `creatures.3f9a1c.json`.
- **Caching (nginx):**
  - the manifest and HTML: `Cache-Control: no-cache`;
  - hashed JSON: `immutable`.
- **Angular** always reads the manifest first, then the files it lists. It can never mix a new manifest with old data.

## 4. Confirmed architecture

### Repository layout

```text
colony-tracker/
  adventure/                 Astro + Starlight (new)
    astro.config.mjs         base: '/docs', BOOK_TARGET switch
    src/content.config.ts    docsSchema() extension + entity collections
    src/content/
      docs/                  parts / chapters / scenes (MDX); designer-only pages under docs/_designer/
      rules/  creatures/  npcs/  locations/  items/  clocks/  revelations/  inventory/
    src/components/          ReadAloud, GMNote, DesignNote, EntityRef, CanonCitation, RuleEmbed, Clock, Branch
    sources/                 frozen copies of the 13 source docs + migration-map.yaml (designer build only)
    scripts/                 export-reference, validate, privacy-scan, json-schema
  client/  server/  server.Tests/   (existing)
```

**Source documents:** the 13 originals stay where they are in `The Colony/` until the user retires them. `adventure/sources/` gets a copy taken at the moment the migration starts. The copy is what the migration map's anchors point at.

### Hosting and routing

- **Docker:** `client/Dockerfile` becomes three stages:
  1. build Angular;
  2. build the adventure with `BOOK_TARGET=gm`;
  3. nginx, copying Angular to `/` and the book to `/docs/`.
- The `ui` service's build context in `docker-compose.full.yml` moves to the repo root, so the build can see `adventure/`.
- **nginx:**
  - a `location /docs/` block before the SPA catch-all, with `try_files $uri $uri/ $uri.html =404` and Starlight's 404 page;
  - the cache headers from §3.3;
  - generated redirects for old slugs.
- **Dev:**
  - `cd adventure && npm run dev` runs Astro on port 4321 with `base` `/docs`;
  - `proxy.conf.json` gets a `/docs` → `localhost:4321` entry, so `npm start` serves both on one origin.
  - The designer build is run locally with `npm run dev:designer`.

### Identity

| | Format | Notes |
|---|---|---|
| **Canonical ID** | `<type>.<kebab-slug>` | Examples: `npc.vara-cairn`, `creature.kelda-varruk`, `rule.book.keeper-bound-handling`. Permanent and never reused. Set in frontmatter (`id:`), not derived from the filename. |
| **Rule version** | `version: <int>` on rule entities | References are unversioned and always mean the current version. Conformance tags pin a version: `rule.x@2`. |
| **URL slug** | Separate `slug:` field | Changing it moves the old value into `previousSlugs:`, which generates a redirect. |
| **App link** | App-side `BookRef` | See §2.1. |

### Reference contract

- **Entity JSON** contains: `id`, `type`, `version`, typed frontmatter, `bodyHtml` (pre-rendered with the same Markdown pipeline the book uses) and `url`.
- **Allowed components:** entity bodies may only use plain Markdown, `EntityRef`, `RuleEmbed` and a static `Clock`. Each has a plain-HTML version.
- **Angular:**
  - sanitises `bodyHtml` with its built-in sanitiser;
  - ignores unknown fields;
  - accepts schema versions in `^1`;
  - on any other version, the drawer shows "Open full reference" only.

### Drawer

A new `shared/reference-drawer` component. It follows the pattern of the existing `settings-drawer` and `narrative-inspector`, and loads its data through a `ReferenceService` that fetches the manifest and then the data files.

### Conformance tagging

- Tests carry `[Trait("Rule", "rule.colony-turn.goal-advance@1")]`.
- A script reads the traits (with `dotnet test --list-tests` or reflection) and writes a coverage table. The designer build displays it.

### Change log

Following the repo convention, changes are recorded in `ADVENTURE-BOOK-CHANGES.md`. No branches and no commits.

## 5. Answers to the brief's open questions

1. **Repository location — decided by the user:** `colony-tracker/adventure/`, in the same git repo and the same Docker stack, staying in iCloud Drive. Mitigations:
   - `.gitignore` gets `adventure/node_modules/`, `adventure/dist/` and `adventure/.astro/`. The existing `node_modules/` and `dist/` patterns already match these at any depth, so only `.astro/` is new.
   - The GitHub remote (`origin`) is the real backup, because iCloud can corrupt a `.git` folder mid-sync. Recommend pushing after each commit.
   - *Optional:* if iCloud sync churn becomes a problem, point Astro's `cacheDir` and `outDir` at `*.nosync` folders, which iCloud skips.
2. **Publication audience: the user decides (§7, decision 3).** Recommendation: treat the book as **private for now**, with a `license:` field in the site config, and revisit before sharing anything. ORC affects attribution and terminology, not the schema shape, so this doesn't block the slice.
3. **Designer build hosting:** **local only**, via `npm run dev:designer` or a local build. It is never put in the Docker image.
4. **Canonical ID convention:** as in §4, Identity.
5. **Seed import timing:**
   - **Not before the Act I chapters are closed.** Until then, `BookRef` is backfilled by hand or with a simple name-matching script against the live database, run under review.
   - When the import tool is built, it produces a diff for existing databases and never applies it automatically.
6. **First creature: Kelda Varruk (Creature 13), not the Old Town Corpus.**
   - She is small (about 55 lines).
   - She appears in The Reading section the slice already needs.
   - She has a Character Brief and a live app record, so she exercises the drawer and both link directions.
   - Her "Tactical Priority" is a natural first test of the ownership rule in §3.1.

   The Old Town Corpus comes after the slice, as the stress test for the rules-heavy format.

## 6. Risks

| Risk | Mitigation |
|---|---|
| **Reconciliation is design work.** The pilot concept already has differences between its sources (§7, decision 1). | Cap the slice at one concept and one creature. Record contradictions; the user decides them. |
| **Private content leaking** into the GM build, search index or JSON | Build-target filtering at the loaders, plus the post-build sentinel scan, which fails the build on a leak |
| **Pages and data out of step** (stale drawer data) | One build produces both, a hashed manifest, and the cache policy in §3.3 |
| **State persistence growing into an app-wide refactor** | The slice covers `viewingContext` (in the URL), filters on Factions, Characters, Assets and Goals, and a guard on unsaved forms. Everything else is a logged follow-up. |
| **iCloud corrupting `.git`** | Push to the GitHub remote regularly. Keep build output and caches out of git. |
| **Pagefind is only available in production builds**, so search can't be checked in dev | Verify search against `npm run build && npm run preview` and against the Docker stack |
| **Entity components that can't be exported** to the drawer | A small allow-list, checked by validation |
| **The Docker build context moving to the repo root** sends a larger context | A `.dockerignore` at the root excluding `node_modules`, `dist`, `colony-data` and `*.db` |

## 7. Decisions (resolved 2026-11-17)

**User rulings:**

1. **Keeper-Bound Handling.** "Current" has no meaning. Mnemonic Backlash is always computed from the Source's Veiled Class (The Veiled §Class I–V: `C d(2C+2)` mental damage, basic Will save against the Source DC; Source DC = the level-based DC for the Source Level + C).
   - **How this is built:** the Book of Names becomes a Source entity, `source.book-of-names` (Class V, Source Level 15, as listed in The Burden).
   - The Backlash damage and DC are **computed at build time** from the canonical formulas, never written into the text. Level 15 gives DC 34 + 5 = 39, and Class V gives 5d12, which matches every source.
   - "Keeper-Bound Backlash" (Burden line ~3415) is a wording slip for "Mnemonic Backlash".
2. **Scenario-specific text leaves stat blocks.** Any information specific to a scenario or encounter is removed from character stat blocks and moved into the relevant encounter passage. Kelda's "Tactical Priority", and her line about using nonlethal force "when doing so does not materially endanger the Reading", move to The Reading.
3. **Audience: the book is for the GM running the campaign,** but passages must be markable as **player-facing**, **secret** and so on. This adds audience markers to the component set (Stage B): `PlayerFacing` and `Secret`, with `ReadAloud` counting as player-facing. Everything is visible in the GM book. The markers are for presentation and for later extracting handouts and player material.
4. **App-side `BookRef`: approved,** on condition that **the app can display content such as stat blocks from the same source files the book uses.** That is the reference export (Stage E): the drawer renders the same entity files through the generated JSON, never through a copy.

**Still to confirm:** is the Book's Source Level 15 for the whole campaign, including The Reading in Act I? The Burden states 15. Encounters §5 gives only the Class.

## 7a. Decisions as originally posed

1. **Reconciling the pilot concept** (`rule.book.keeper-bound-handling`). The three sources mostly agree, but differ in detail:
   - **The name of the consequence:**
     - The Veiled §"Keeper-Bound Handling" and Encounters §5 call it **"Class V Mnemonic Backlash"**.
     - The Burden §"Keeper-Bound Handling" says **"full *current* Class V Mnemonic Backlash"**.
     - The Burden at line ~3415 says **"Class V Keeper-Bound Backlash"**.
   - **The Burden adds two things:**
     - "intrinsic to the Book rather than generated by the current Incursion";
     - "hold" and "carry" listed separately.
   - **Only The Veiled allows** attacking an active Ward from range.
   - **Encounters adds** that why Serevan is recognised is a deliberate open thread.

   *Proposal:*
   - Use one name: "the Book's Class V Mnemonic Backlash (DC 39 Will, 5d12 mental)".
   - "Current" means "whatever the Book's Class is at the time". Confirm whether the Class can change.
   - Combine the allowed and blocked actions from all three sources.
   - Keep the Serevan thread as a GM-facing note.
2. **Moving Kelda's "Tactical Priority" from her stat block to The Reading,** under the ownership rule in §3.1.
3. **Publication audience:** private for now (recommended), or possibly shared?
4. **The change from `appRefs` to app-side `BookRef`** (§2.1).

## 8. Staged plan

Each stage ends with something that can be checked. The writing of Part I and The Calling proceeds in parallel; prose goes into `adventure/src/content/docs/` as it's written.

| Stage | What | Done when |
|---|---|---|
| **A. Foundations** | Astro + Starlight project in `adventure/`; `docsSchema()` extension; entity collections and Zod schemas; ID, slug and `previousSlugs` handling; `BOOK_TARGET` filtering; JSON Schema generation; validation script (IDs, links, references, provenance anchors); privacy scan | `npm run build` passes; GM and designer builds differ as in §3.2; planted errors (broken link, duplicate ID, bad anchor, leaked sentinel) each fail the build |
| **B. Components and pages** | ReadAloud, GMNote, DesignNote, EntityRef, CanonCitation, RuleEmbed, Clock, Branch; Part I stub; The Calling scaffold; The Reading section (clock, branches, GM-only information, PF2e references, stat block links) | Both chapters render; components still read sensibly as plain Markdown |
| **C. Pilot migration** | Copy the sources into `adventure/sources/` with anchors; build the migration map; migrate `rule.book.keeper-bound-handling` and `creature.kelda-varruk` (after the §7 decisions); superseded banners | Migration Status page lists both concepts as migrated, with provenance; The Reading embeds the rule; the Bestiary shows Kelda |
| **D. Chapter metadata** | Inventory, revelations and readiness metadata for both chapters; generated Inventory, Continuity, Readiness and Migration pages | A shared inventory item appears once, listing both chapters |
| **E. Reference export** | Entity JSON with `bodyHtml`, hashed files, manifest | Changing one stat and one line of rules text updates the JSON with no other edits |
| **F. App integration** | `BookRef` columns and EF migration; `GET /api/refs/{id}`; `/ref/:id` resolver route; `ReferenceService` and reference drawer; Docs nav entry (current tab) and open-in-new-tab; backfill `BookRef` for Vara, Kelda, Serevan, The Calling and The Reading | App → drawer → full page, and book → `/ref/…` → app record, both work; an unknown ID fails gracefully; an unsupported `schemaVersion` falls back to the link only |
| **G. State persistence** | `viewingContext` in the URL with a sessionStorage fallback; filters on the main list pages; unsaved-edit guard | Round trip and refresh while viewing a past session snapshot come back to the same snapshot |
| **H. Hosting** | Three-stage Dockerfile, root build context and `.dockerignore`, nginx `/docs/` block with cache headers and redirects, dev proxy | The full Docker stack serves both; direct URLs, reload, history, redirects and search work; search contains no private content |
| **I. Conformance pilot** | Rule entity for one Colony Turn rule (goal advance, which already has `GoalAdvanceRulesTests`); `[Trait]` tags; coverage table in the designer build | The designer build shows the rule, its version and its tagged tests |
| **J. Verification and write-up** | The brief's §8.11 checklist on the Docker stack, at desktop and phone widths; `ADVENTURE-BOOK-CHANGES.md` | The checklist passes; the results are recorded |

**Order:**
- A → B → C/D can run without touching the app.
- E needs C.
- F and G can start in parallel with C, because `BookRef`, the resolver and state persistence don't depend on content.
- H and I can come last.

The first visible milestone is the end of Stage B: the book with two chapters, at `/docs/` in dev.

## 9. Characters: content files as the single store (decided 2026-11-17)

**User rulings:**

1. **Content files are the one central location for characters,** tracked in git. The app stays fully editable, but it reads and saves through its API to the same files the book reads. There is no sync between two copies.
2. **Scope: the entire character.** This covers identity, profile and detail sections, stat blocks, and the starting values the simulation uses.
3. **NPCs with playable ancestries have race and class profiles like PCs.** The stat block header reads "Dwarf Fighter 13". "Creature" is reserved for entities that are not NPCs. For Kelda, the app's "Level 11" is replaced by 13.

**This supersedes §2.1** for characters: §2.1 put mappings in the app, while canonical facts now live in files.

### The boundary

**Written about the character → the file. Happened in play → the database.**

| In the character's file (`adventure/src/content/npcs/`, `pcs/`) | In the database |
|---|---|
| **Identity:** name, title, role or occupation, ancestry, heritage, class, level, gender, pronouns, age, aliases, summary, portrait, narrative tier | Event history and everything replayed from it: current state, faction, location, pressure, influence, instability, reaffirmed |
| **Profile and detail sections** as Markdown `##` sections, each with its default audience | Which sections have been **Revealed** at the table |
| **Starting values** (`start:`): faction, social class, location, state, value vector, belief overrides, doubt, conviction, pressure, influence, impressionable | The link row: app GUID ↔ canonical ID. Event effects keep pointing at the GUID. |
| **Stat blocks:** separate `creatures/` files linked by `npc:`; level and class come from the character | Campaign mode (Design or Live) |

### The level/class rule (ruling 3)

- `class` and `level` live on the character, like a PC.
- A linked stat block has no `level` of its own, unless it is a `variant` at a different level.
- The header is `<ancestry> <class> <level>`.
- An NPC that has a stat block must have a `class`.

### App mechanics (steps 3 and 4, not started)

- **A file store in the API:** loads files at startup, notices edits made outside the app, and writes each save in one step.
- **Validation:** every save is checked against the JSON Schema generated from the book's Zod schemas.
- **Overwrite protection:** if the file changed since the app read it, the save is refused rather than overwriting the edit.
- **Live-campaign lock:** applies to `start:` values in files, plus a warning if a locked value was hand-edited.
- **Docker:** the content folder is mounted into the API container read-write.
- **The API combines the link row and the file** into today's character data, so Angular changes stay minimal.

### Steps

1. **Character file format and schema.** *Done 2026-11-17.*
2. **Merge tool**, from the database plus Character Briefs into staging, with a conflict report. *Done 2026-11-17.*
3. **Parallel read path in the API,** reporting differences while all tests, including replay goldens, keep passing. *Done 2026-11-17:* `GET /api/canon/characters/parity` is clean on the live database (47 of 47 characters, 2,211 fields, 0 unexpected).
4. **Switch** reads and saves to files, then drop the redundant columns. *Done 2026-11-17:* the live database is switched (backup `colony-data/colony.db.bak-pre-canon-20261117150533`), and API output matches the pre-switch baseline across 2,258 fields. Campaign import skips characters until step 5.
5. **Same pattern** for factions, Assets and locations (*done 2026-11-17, see §10*) and faction goals (*done 2026-11-17, see §11*).

**Merge policy:**
- If a fact is in both Character Briefs and the app and they differ, **the brief wins by default**, because unmigrated source documents are authoritative. The app's value is listed in the report.
- Facts that exist only in the app are kept, as canon.
- Facts in the book's existing entries (user rulings) win over both.
- **Nothing is chosen silently;** every difference appears in the report.

## 10. Factions, Assets and locations: the same store (done 2026-11-17)

**User ruling:** move every other entity into files "the same way as characters": factions, Assets and locations. Goals followed (§11).

### Files

| Kind | Folder | Format | Book section |
|---|---|---|---|
| Faction or social class | `adventure/src/content/factions/` | `.md` (frontmatter is app data; the body is the book's) | Factions |
| Asset | `adventure/src/content/assets/` | `.yaml` | Assets |
| Location | `adventure/src/content/locations/` | `.yaml` | Gazetteer |

- **IDs come from names,** without a leading "The": `faction.order-of-theia`, `asset.ritual-chamber`. The old app slugs (`keepers`, `seekers`, ...) are only row ids now.
- **Simulation baselines go under `start:`,** as for characters: a faction's active flag, leader, Momentum, size, values and beliefs; an Asset's controller, location, status and status actor; a location's state. They are live-locked once a campaign starts.
- **Prose fields** are plain YAML strings; multi-line text is a literal block.

### References between files are canonical IDs

- **Every reference in a file is a canonical ID:** `start.faction: faction.order-of-theia`, `parent: location.memorial-building`, `start.leader: npc.serevan-ilvar`. This includes the characters' `start:` references, which used app IDs until this step.
- **The app keeps using row IDs.** `CanonRefs` translates per campaign from the link rows, so two campaigns that link the same files each resolve to their own rows.
- **A file never holds an app ID.** A save that would write one is refused (400). The book's validator checks that every reference resolves.

### What stays in the database

- **Every type:** the row's link (`Id`, `CampaignId`, `CanonId`) and `IntroducedAtEventId`.
- **Factions only:** `SortOrder` (the app's list order) and the retired `Momentum` and `PowerModifier` columns, kept for audit.
- **Everything else, as before:** events, effects, goals, relationships, maps and placements.

### Campaign import

Import is back on for characters. It links the target campaign to the same files rather than copying fields. References resolve to the target campaign's own rows. A reference to something that wasn't imported shows its canonical ID until that entity is imported too.

### Known limits

- **Asset location: merged (user, 2026-11-17).** An Asset that a location stands for (location `asset:`) has no `start.location`; its location is that entry's `parent`. The app derives it on load, removes it from the Asset's file when a location takes the Asset, and writes it back when the location lets the Asset go or is deleted. Moving either one in the app moves the one fact. The book derives it the same way, and the validator refuses a duplicate.
- **One batch, several files:** resolved 2026-11-17. A save's file writes are journaled and rolled back if a later file or the database commit fails.

## 11. Faction goals: the same store (done 2026-11-17)

**User ruling:** convert goals too.

- **Files:** one `.yaml` file per goal in `adventure/src/content/goals/`, with ID `goal.<title-slug>`. The book shows them on a Faction Goals page and on each faction's page.
- **Fields:** name (the title), faction, type, priority, visibility, outcome, earliest Act, champion, `target:` (type, id, state, owner, property, operator, threshold), `effects:` (`progressing` and `accomplished` lists), and `start.status`.
- **Polymorphic target:** `target.id` is a faction, character or Asset ID, by `target.type`.
- **Effects are YAML lists, and every ID in them is canonical:** `targetId`, and `value` for `controllingFactionId` (a faction) and `locationChange` (a location). The app keeps its compact JSON strings, and the API returns exactly the string it saved.
- **Database:** keeps `Id`, `CampaignId`, `CanonId` and `IntroducedAtEventId`. World Conditions, Effects and Colony Turns keep referring to goals by row ID.
- **Live lock:** the goal's baseline (faction, status, type, priority, target, champion, outcome) is locked once a campaign starts.
- **Import:** campaign import still doesn't bring goals, as before.

## 12. One source of truth, both directions (user, 2026-11-17)

- **Every app entity is a file.** This held already: the app writes a file for everything it creates.
- **Every file is an app entity.** `CanonAutoLink` links any file with no row into each Design campaign. Live campaigns list such files in `/api/canon/status`, because a new entity there enters through an Event.
- **Deletes go through the API (user, 2026-11-17).** Deleting a file in VS Code is frowned upon. Nothing is ever deleted or rewritten automatically to follow a missing file; it is flagged instead:
  - **A record whose file is missing:** the app shows a banner listing each one and marks the record "⚠ … (file missing)". It can't be saved until the file is restored (for example with git), and it can be removed by deleting it in the app.
  - **A stale reference** (an entry naming something that no longer exists, usually after a delete through the app): the app's banner groups them by the missing entry, from `/api/canon/status` `staleReferences`. In the book, each one is flagged on its page ("… (missing)"), the **Stale references** appendix lists them all, and the validator reports them as warnings rather than failing the build, so the book keeps updating.
- **Later:** a clean-up button in the app to remove stale references.


## 13. Narrative content: chapters, events and encounters (done 2026-11-18)

**User rulings:**
- **Authored content gets canon files; play stays in the database.**
- **Parts are the parents.** A part is a top-level sidebar group and a docs folder (Running the Adventure, the Setting, the three acts). A part's chapters are its sub-groups, and they hold the events and encounters; both appear in the outline. Some parts hold neither: general information, or the generated entity archives.
- **Terms follow Starlight.** Part = top-level group; chapter = sub-group within a part; item page = an event's or encounter's page; section = a heading on a page (`##`). The URL's first segment is the page's *area* (a part folder or an entry-type folder).
- **Two kinds of narrative item.** An event is a narrative container. An encounter is a complex scenario (maps, stat blocks, clocks) that usually belongs to an event, but not always.
- **Play state stays in the database:** event status, thread state, sort order, board positions, realizations, and links to sessions.

**Files:**
- **Part pages:** `src/content/docs/<dir>/index.md` (`running`, `setting`, `act-1`, `act-2`, `act-3`).
  - `part:` frontmatter holds the part id (`part.<dir>`) and its chapters; each chapter has a key, a title, an arrangement and, for a `reference` chapter, `entries`.
  - Arrangements are `sequence`, `alternatives`, `optional`, `concurrent` or `reference`. Inside a chapter, presentation order is not chronology.
  - The body's `::part-contents` lists the chapters and their items.
  - The sidebar is generated from these pages.
- **Events and encounters:** `src/content/events/*.md` and `encounters/*.md` (`event.<slug>`, `encounter.<slug>`). Frontmatter is app data:
  - `name`, `summary`, `function`, `synopsis`, `visibility` (absent = GMOnly);
  - `part`, `chapter`, `order` (all optional: items without them are listed as unplaced);
  - `route`, and for an encounter its `event`;
  - `leadsTo` (connections, stored on the source), `links`, and the branching fields (§14).
  - The body is the book's prose; the app never touches it.
  - Items live at `/<chapter dir>/<slug>/`. An encounter that shares its event's slug in a chapter takes its title's slug.
- **Threads:** `src/content/threads/*.yaml` (`thread.<slug>`): `name`, `summary`, `color`, `links`.
- **`links`:** bare ids, or `{id, role, notes, primary, visibility}`. Ids of kinds the app doesn't model (`creature.`, `rule.`, `source.`) stay in the file, unseen by the app.
- **The app** serves connections and links under the same endpoints as before, with ids derived from what each entry connects (`NarrativeGraph`). The kind (event or encounter) is fixed when an item is created.

**Rulings applied by the merge:**
- **Timing (2026-11-18):** The Observer ends Act II and holds the whole reveal, in either order. If the Reading was stopped, the eclipse begins at the Confluence; if it succeeded, the Observer reveals himself and then the eclipse begins. Eclipse opens Act III. Campaign Outline and Character Briefs were reconciled to match.
- **The Final Reading** is prose inside The Light Remains.
- **The Confluence and Totality are narrative events, not encounters (user, 2026-11-18).** The two encounters the merge created for them (Encounters.md #11 and #12) were removed through the API.
- **Prose:** the source documents win over app text, through a reviewed conflict report (`sources/narrative-canon-check.yaml`, now a historical record). Reviewer confidence never picks the winner, and texts that carried obsolete mechanics were rewritten whole from Encounters.md. "Pépé Sylvya" (Golarion spelling) everywhere.
- **The Sheep:** the Campaign Outline (The Breach) was corrected to match Encounters.md and Creatures.md: harmless while watched, lethal when observation breaks.
- **Records:** `sources/narrative-outline.yaml` and the canon check are kept as historical records of the merge. The rulings are concepts in `sources/migration-map.yaml`.

## 14. Branching: branches, paths and per-path versions (done 2026-11-18)

- **Branch file:** `src/content/branches/<slug>.yaml` (`branch.<slug>`): `name`, `origin` (where the paths split), `convergence` (where they rejoin), `requires` (paths of other branches that must all hold), `paths` (`[{id: path.<slug>, name}]`).
  - A path's canonical id is also its app id.
  - The book indexes paths as entries, so `path.` references resolve. Each path is an anchor on its branch's page.
- **On an event or encounter:**
  - `variesBy` lists the branches it resolves differently on;
  - `onPaths` gives explicit scope;
  - `variants` holds the per-path versions.
- **A version** has a `key` (its stable handle; the app derives the version's id from the event and the key) and `when` (the paths that must all hold). It may also have `summary`, `synopsis`, `leadsTo` and `links`. **An absent field is inherited; a present one replaces it, even when empty** (the app's "overrides" switches).
- **Prose inside a section:** `:::branch[Label]{when=path.…}` marks a path-specific addendum. It is labelled "If <path name>" from the branch file, and the validator checks the path. A page can have several, one per section. A plain `:::branch[Label]` stays an in-scene choice.
- **Merge rulings:** 4 links in versions whose "replaces links" switch was off had no effect and were dropped (user, 2026-11-18).
- **The app** serves path sets, paths, contexts, scope, participation, versions, and versions' paths, connections and links from the files (`NarrativeBranches`). The remembered path selection reset once, when path ids became canonical.

## 15. World Conditions and character relationships (done 2026-11-18)

- **World Conditions:** `src/content/conditions/<slug>.yaml` (`condition.<slug>`): `name`, `rule`, `otherwise`, `stress` (absent = 0), `requires`, `variesBy`, `start.established` (absent = true).
  - `requires` and `variesBy` keep the app's structure (`core/sim/conditions.ts`), with canonical ids; `""` means no one / no faction.
  - Sort order, and the Events that establish or end a condition, stay in the database.
- **Relationships:** a character's are `relationships:` in its own file. Each entry has `to` (optional), `type`, `summary`, `state` (absent = Active) and `visibility` (absent = GMOnly). The app derives each relationship's id from the two characters and the type; a duplicate is refused.
- **Play tuning stays in the database (user, 2026-11-18):** relationship overrides (manual score adjustments between factions) and other manual adjustments.

**After §9 to §15:** every authored entity lives in the content files. The database keeps play only: status and state, sort order, board positions, sessions, Event Effects, realizations, session links and manual adjustments.

## 16. Editing in the book (2026-11-18)

**User ruling:** an edit may be made anywhere (the app, the book, VS Code), as long as it updates the one source file both the book and the app read, so they can't drift.

- **Toolbar:** every book page has **Edit** and **Delete**, plus **New** on index pages (a new entry of that type) and on book pages (a new page in the same chapter folder).
  - The toolbar is a `PageTitle` override. It stays hidden unless the Colony API answers, so a copy of the book without the app shows no editing.
  - A generated page names its source file in `rpSource`; an index page names the type it creates in `rpNew`.
- **Editor:** CodeMirror with two panes, the frontmatter (YAML) and the Markdown body (a data-only `.yaml` file has one pane).
  - Autocomplete covers entry ids (from `/docs/rp-index.json`) and directive names.
  - Ctrl/Cmd-S saves; Escape closes, asking first if there are unsaved changes.
- **Before a save, in the browser:** the YAML must parse, and the markup must use known blocks and directives. These are the build's own rules (`src/lib/markup.mjs`, shared with remark-colony and the validator). Unknown references are warnings, as in the build.
- **On the server** (`PUT /api/content/file`, `CanonStore.WriteFile`):
  - the path must be inside a content folder, `.md` / `.yaml`, and not hidden;
  - the entry must match its type's schema;
  - for kinds the app reads, it must load as the app reads it;
  - a docs page needs a title;
  - the id can't change;
  - the file must not have changed since it was opened (409);
  - the write is atomic. The app reads the result at once.
- **New:** `POST /api/content/new` allocates the id from the name, as the app does, and returns a starting text. Nothing is written until the first save. A new entry of an app kind is linked into Design campaigns by the auto-linker.
- **Delete:** `DELETE /api/content/file`. An entry the app tracks loses its rows in every campaign, and the file goes with the last one, exactly as an app delete. A book-only file is deleted directly. References elsewhere are flagged, never rewritten (§12).
- **After a save:** the book rebuilds. The editor waits for it through `/docs/__build` (`scripts/serve.mjs`), then reloads, or shows the build's errors if it failed (the last good build keeps being served). Against a server without that endpoint, it waits until the page changes.

