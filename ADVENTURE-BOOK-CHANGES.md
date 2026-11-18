# Adventure Book — Changes

Provenance log for the adventure book work. See `ADVENTURE-BOOK-PLAN.md` for the plan and decisions. Nothing is committed.

## 2026-11-17 — Stages A and B (no app changes)

### What was built

A new Astro + Starlight project at `adventure/`, serving the book at `/docs/`. No files outside `adventure/` changed, apart from this log and the plan.

- **Stack:** Astro 7.3.8, Starlight 0.42.8 and `@astrojs/markdown-remark` 7.3.5, using the `unified()` processor.
  - These are pinned to versions that run on the machine's Node 22.21. Astro 7.4.6 and later need Node 22.23.4 or later.
  - `npm install` prints two engine warnings, for `@astrojs/prism` and `sitemap`. Both are transitive and unused at runtime: Prism isn't used, and the sitemap is skipped because `site` isn't set.
- **Content model** (`src/schemas.mjs`, `src/content.config.ts`):
  - One Zod schema per entity type: creature, npc, location, rule, source (Veiled Source), item, inventory, revelation, clock, handout.
  - Chapters extend Starlight's `docsSchema()` with `canon.concepts`, `readiness`, `inventory` and `revelations`.
  - The canonical ID comes from frontmatter `id`, never from the filename.
- **Portable markup** (`src/lib/remark-colony.mjs`): the plan's "components" are Markdown directives, so plain `.md` works everywhere and the future drawer export can reuse the same plugin.
  - **Blocks:** `:::read-aloud`, `:::player-facing`, `:::secret`, `:::gm-note`, `:::design`, `:::branch[Label]`.
  - **Leaf:** `::clock[Label]{segments=N note="…"}` and `::embed{#id}` (inlines a rule's text, or a creature's stat block plus abilities).
  - **Inline:** `:ref[Text]{#id}`, `:stat{#source.id key=…}`, `:cite[Label]{doc=… anchor=…}`.
- **Derived Veiled values** (`src/lib/veiled.mjs`, `src/lib/pf2e.mjs`):
  - Source DC = the PF2e level-based DC + Class, and Backlash = `C d(2C+2)` mental damage, plus Ward HP, threshold, Bulk and radius.
  - For the Book (Class V, level 15) this reproduces The Burden's block exactly.
- **One stat-block renderer** (`src/lib/statblock.mjs`), shared by Bestiary pages and inline embeds. The drawer export will use it too.
- **Entity pages and indexes:** Bestiary, NPCs, Gazetteer, Rules Reference and Veiled Sources, plus `previousSlugs` redirects.
- **Two builds:**
  - `npm run build` produces the GM build in `dist/`.
  - `npm run build:designer` produces the designer build in `dist-designer/`, local only.
  - The designer build adds the Migration Status page, the 13 source documents rendered **in place from `The Colony/`** with migration banners under the listed headings, provenance panels, `:::design` notes and `:cite` links. The plan said to copy the documents into `adventure/sources/`; I didn't, because a copy would be a second home for every unmigrated fact.
- **Checks that run on every build:**
  - `scripts/validate.mjs` checks: duplicate IDs; ID prefix against type; URL collisions; unknown references in directives and frontmatter; unknown directive names (catches typos like `:::readaloud`); `:stat` keys; `:cite` documents and anchors; provenance heading paths in the source documents; the migration map's targets, statuses and provenance; and, in the built output, every internal link and `#anchor` plus any unresolved reference that was rendered.
  - `scripts/privacy-scan.mjs` (GM build only) fails if `dist/` contains a designer page, designer markup, a link to a designer page, or any sentence from a `design:` field or `:::design` block. It scans HTML, JSON, XML and the Pagefind index.
- **JSON Schema** for every entity type (`npm run schema` writes to `schemas/`). YAML entities carry `yaml-language-server` hints.
- **Theme** (`src/styles/colony.css`): the dark palette mirrors `client/src/styles.scss`, alongside a matching light theme. The header has a "← Colony" link to `/`. On phones, Starlight moves this link into the menu.

### Content added

| File | Notes |
|---|---|
| `veiled-sources/book-of-names.yaml` | Class 5, Source Level 15. Every other value is derived. |
| `rules/book-keeper-bound-handling.md` | **Pilot concept.** Merged from The Veiled, The Burden, Encounters §5 and Creatures (The Book Clock), following the 2026-11-17 ruling. |
| `creatures/kelda-varruk.md` | **Pilot creature.** "Tactical Priority" and the nonlethal-default line moved to The Reading, per the ruling. |
| `npcs/*.yaml` (5), `locations/*.yaml` (2) | Stubs: name, role and provenance only. No invented text. |
| `inventory/book-of-names-prop.yaml` | Fabrication status left blank because it isn't known. |
| `docs/running/how-to-use.md` | Part I stub that demonstrates every marker. |
| `docs/act-1/the-calling.md` | Scaffold compiled from Campaign Outline › Session 1. Read-aloud is marked "to be written" in designer notes. |
| `docs/act-1/the-reading.md` | Representative section compiled from Encounters §5 and Creatures (Trust, Appeal, Book Clock). It embeds the pilot rule and Kelda's stat block. |
| `sources/migration-map.yaml` | Four concepts, all `in-progress`, with per-location provenance and reconciliation notes. |

### Wording deliberately not changed

I briefly generalised "Vara" to "the Keeper" in Kelda's No One Crosses and Protector of the Keeper, then reverted it because it would change canon. It is now recorded as an open question.

### Verification (2026-11-17)

- `npm run build`: 20 pages and 480 internal links valid; privacy scan clean.
- `npm run build:designer`: 35 pages and 912 links valid. Every migration banner anchor resolves to a heading on its source page.
- **Planted errors**, each caught and then removed:
  - duplicate ID;
  - bad provenance heading;
  - unknown block `:::readaloud`;
  - unknown reference;
  - bad `:stat` key;
  - bad `:cite` anchor;
  - broken link and missing anchor in the built output;
  - designer text injected into the GM output.
- **Browser checks** (Playwright with local Chrome, against `astro preview`; the script is not in the repo), all passing:
  - no horizontal scroll at 390 px in light and dark;
  - search finds the rule and the moved Tactical Priority text;
  - search excerpts never contain designer notes or source-only text;
  - Back and Forward across Calling → Reading → Kelda;
  - a `#the-book-clock` deep link survives a reload;
  - unknown URL → 404;
  - `/docs/designer/…` → 404 in the GM build;
  - "Colony" link → `/`.

### Bugs found and fixed while building

- **Directive attributes split IDs.** `{#npc.vara-cairn}` parses as id `npc` plus class `vara-cairn`. `directiveId()` rebuilds the full ID. The validator now walks the same parsed tree as the renderer, so the two can't disagree.
- **The validator's `err()` returned a number,** which unist-util-visit reads as "skip to index", so a sibling directive was silently skipped. `err()` now returns undefined.
- **The project root was taken from `import.meta.url`,** which is wrong inside Astro's bundled page code. `ROOT` is now the nearest folder containing `astro.config.mjs`.
- **The privacy scan normalised only one side of the comparison,** so a single colon defeated a match. Both sides are now reduced to the same form.
- **Astro's content cache** kept stale renders after plugin or entity changes. All scripts now pass `--force`.

### Known limitations and follow-ups

- **Cross-file freshness in dev:** editing an entity doesn't re-render chapters that `:ref` or `::embed` it until `npm run dev` is restarted. Production builds are always fresh because of `--force`. Fixing this properly means a dependency-aware loader (later stage).
- **Repeated headings:** a provenance path that names a repeated heading (The Burden's three "Book of Names — Source 15" blocks) resolves to the first occurrence. Add an occurrence suffix if that matters.
- **Open questions for the user** (also shown on the designer Migration Status page):
  1. Is the Book's Source Level 15 for the whole campaign, including The Reading?
  2. "Reconstruction Threshold" (The Burden) or "Stability Threshold" (The Veiled)?
  3. Are Kelda's No One Crosses and Protector of the Keeper general abilities, or specific to The Reading?

## 2026-11-17 — Running the book alongside the app (dev)

- **`client/proxy.conf.json`:** added `/docs` → `http://localhost:4321` (with `ws` and `changeOrigin`). This is the first change to the app; it only affects `ng serve`.
- **`adventure/scripts/serve.mjs` (`npm run serve`):** builds the GM book and serves `dist/` on port 4321 the way nginx will (`$uri`, `$uri/index.html`, else `404.html`). It watches `src/`, `sources/`, `public/` and `astro.config.mjs` and rebuilds on save, in about 2 seconds including validation and the privacy scan. If a build fails, it reports why and keeps serving the last good build.
- **Ports:**
  - `serve`: 4321 (the proxy target)
  - `dev`: 4322
  - `dev:designer`: 4323
- **"← Colony" link:** points to `/` in built pages and to `http://localhost:4200/` under `astro dev`. Override with `PUBLIC_APP_URL`.
- **Why not proxy `astro dev`:** Astro 7's dev server emits module and style URLs at root paths (`/node_modules/@astrojs/starlight/…`, `/src/styles/…`), ignoring `base`. Through the Angular proxy, those returned 404, which broke search, the menus and the table of contents. Proxying those paths as well would collide with Angular's own dev server.
- **Verified** with `ng serve` and `npm run serve` both on Node 24.22.3:
  - book pages at `localhost:4200/docs/…` with zero failed requests;
  - search works on the app origin;
  - "← Colony" goes to `/dashboard`, and Back returns to the chapter;
  - editing Kelda's AC (36 → 37) updated both her Bestiary page and the stat block embedded in The Reading after one rebuild, and reverting it propagated the same way.
- **Node:** the Angular CLI needs Node 22.22.3 or later. Non-interactive shells on this machine default to 22.21.0, while nvm's Node 24 works.
- **README:** added "With the adventure book" under Dev Mode.
- **Follow-up:** this mostly resolves the earlier "cross-file freshness in dev" limitation. `serve` is always fresh; only `npm run dev` still needs a restart.

## 2026-11-17 — One-command start

New files: `package.json` (workspace root), `tools/dev.mjs`, `.nvmrc` (`24`). The README now has a "Quick Start" section.

- **`npm start`:**
  1. checks Node (22.22.3+ or 24.15+, as the Angular CLI requires) and fails with "Try: nvm use" if it's too old;
  2. runs `npm install` in `client/` (with `--legacy-peer-deps`, as in its Dockerfile) and in `adventure/` if their `node_modules` are missing;
  3. refuses to start if port 4200 or 4321 is already taken;
  4. runs `docker compose up -d` for the API only;
  5. runs `client` `npm start` and `adventure` `npm run serve` together, with `[app]` and `[book]` prefixes, and prints a **Ready** banner once both are up.

  Ctrl+C stops the app and the book. The API container keeps running, as in the existing dev workflow. If either child exits, the other is stopped too.
- **Other scripts:**
  - `npm run start:web`: the same, but without Docker, for an API you run yourself.
  - `npm run stop`: `docker compose down`.
  - `npm run build:book`: the GM book build.
  - `npm test`: client unit tests.
- **Dependencies:** none added. The launcher is plain Node.
- **Verified on Node 24.22.3:**
  - the guard rejects Node 22.21.0;
  - the app, the book (`/docs/act-1/the-reading/`) and the API (`/api/factions`) all return 200 through port 4200;
  - the Ready banner prints;
  - Ctrl+C frees 4200 and 4321, and the API stays up.
- **Bug fixed during testing:** Angular's "Local:" line is wrapped in ANSI colour codes, so the ready-detection now strips them before matching.

## 2026-11-17 — NPC / stat block ownership split

**User rulings:**
- Kelda is a dwarf.
- The NPC entry owns identity and the Bestiary entry owns mechanics.
- Each page links to the other.

**Drift this removes:**
- The name was stored twice and didn't match ("Kelda Varruk" vs "Captain Kelda Varruk").
- The link was stored on both sides (`npc.statblock` and `creature.npc`).
- The Dwarf ancestry was missing from the stat block. The source block in Creatures.md said only "Medium Humanoid".

**Changes:**
- **Schemas:**
  - `npc` gains `title` and `ancestry`, and loses `statblock`.
  - `creature.name` is now forbidden when `npc:` is set, and required otherwise.
  - `creature.variant` labels the different stat blocks of one person.
  - All entity schemas are now `.strict()`, so unknown fields fail the build. Zod used to drop them silently.
- **`viewOf()` in the registry:** a linked stat block displays the NPC's full name (title plus name) and puts the NPC's ancestry first in its traits. The remark plugin (`:ref`, `::embed`), the stat-block renderer, entity pages and index pages all use it.
- **NPC pages** list their stat blocks by reverse lookup, e.g. "Stat block: Creature 13 in the Bestiary". Bestiary pages keep "NPC profile: …".
- **Validator rules:**
  - an NPC must not have `statblock:` or any stat field;
  - a linked stat block must not have `name:` or repeat the ancestry trait;
  - if a person has several stat blocks, each needs a `variant:`.
- **Content:**
  - all five NPCs have `ancestry` from Character Briefs: Perrik Goblin, Vara Human, Uldren Human, Serevan Elf, Kelda Dwarf;
  - Kelda gets `title: Captain`;
  - her stat block loses `name`;
  - the migration map records the ruling and adds Character Briefs as provenance for her ancestry and title.
- **Side effect:** Uldren's source block also omits his ancestry trait ("Medium Humanoid"). When his stat block is migrated, Human is derived the same way.

**Verified:**
- Kelda's NPC page shows "Captain Kelda Varruk · Ancestry: Dwarf" and links to `/docs/bestiary/kelda-varruk/`.
- Her Bestiary page and the embed in The Reading both show "Captain Kelda Varruk · Creature 13 · Medium Dwarf Humanoid" and link back to the NPC page.
- Planted violations were each caught and removed: name on a linked stat block, a repeated Dwarf trait, two stat blocks with no variants, `ac` on an NPC, and an `acc:` typo (rejected by the strict schema at build).

**Unexplained:** one rebuild straight after the deliberately failed `acc:` build reported 6 validation problems, and I didn't capture their text. I couldn't reproduce it: three further clean builds passed, including the exact failed-then-rebuild sequence. If it happens again, the validator output will show what it was.

## 2026-11-17 — Characters: one store in content files (steps 1–2)

**Decisions** are recorded in `ADVENTURE-BOOK-PLAN.md` §9:
- content files are the single store, tracked in git, and the app reads and saves through its API;
- the whole character lives there, including starting values;
- NPCs read "<Ancestry> <Class> <Level>", and "Creature" is reserved for entities that are not NPCs.

**Ruling 3, applied:**
- `kind` is removed from the creature schema.
- A linked stat block has no `level` of its own (unless it's a `variant`). Level and class live on the character.
- The header is derived: Kelda's stat block now reads **DWARF FIGHTER 13** in the Bestiary and in The Reading, and the app's "Level 11" is replaced.
- The validator requires `class` and `level` on any NPC that has a stat block.

**Step 1: character schema** (`src/schemas.mjs`):
- `npc` and `pc` share one full character schema:
  - **identity:** title, role, ancestry, heritage, class, background, level, gender, pronouns, age, aliases, portrait, narrative tier, origin (prepared or improvised);
  - **`start:`:** faction, social class, location, state, instability, reaffirmed faction, value vector (must sum to 1), belief overrides, doubt, conviction, pressure, influence, impressionable.
- Profile and detail text are `##` sections in the Markdown body. Public sections are wrapped in `:::player-facing`.
- A new `pcs/` type was added, with no book pages.
- I confirmed the `Characters` table holds starting state: the server only writes it from the edit forms, and play is replayed from events.

**Step 2: merge tool** (`scripts/merge-characters.mjs`, run as `node --no-warnings scripts/merge-characters.mjs`):
- **Reads:** `colony-data/colony.db` (read-only, through `node:sqlite`, no new dependency), `Character Briefs.md`, and the book's NPC entries.
- **Writes:** `staging/characters/` (git-ignored): 49 NPC files and 1 PC file, `id-map.yaml` (app GUID → canonical ID, for the link rows at the switch) and `MERGE-REPORT.md`.
- **Precedence:** the book's entries, then Character Briefs, then the app.
- **How differences are classified:**
  - "same" after normalising quotes, emphasis, bullets and whitespace;
  - "kept the longer version" when one value contains the other, so nothing is lost;
  - "conflict" otherwise, which is listed for a decision.
- **Every file is validated** against the Zod schema.
- **Result:** 50 characters, **21 conflicts to decide**, 22 kept-longer, 0 invalid. Three characters exist only in Character Briefs: Silas Venn, Willow Stoutfoot and Portia Harthwright.

**Notable conflicts:**
- **App edits that look like later rewrites:** Serevan's Overview, Personality, Narrative Role and Relationship to the Ritual; Kivren's Methods; Perrik's Motivation.
- **Ages:** Serevan 230 or 260; Veyra 51 or 41.
- **Nine roles worded differently,** e.g. "Shattered Instigator" vs "Shattered Field Operative", or "The Keeper's Father" vs "Civic Surveyor".

**Caveat:** the "book" precedence for Perrik, Serevan and Vara's `role` comes from stubs I created from the briefs, not from your rulings. For Vara, "The Keeper — newly Called" is my own wording, taken from Campaign Outline.

**Not changed:** `src/content/`, the app and the database. Steps 3 and 4 (the API's file store, parallel read, then switch) haven't started.

### Conflict resolutions (user, 2026-11-17)

The decisions live in `adventure/sources/character-merge-resolutions.yaml`, and the merge tool applies them on every run.
- **How a resolution works:** it names a source (`book`, `brief` or `app`), says `keep` (precedence), or gives consolidated `text`.
- **Stale resolutions** (ones that no longer match a conflict) are listed in the report.

The decisions:
- **Kivren:** keep the app for role ("Shattered Field Operative") and Methods.
- **Marek:** keep the app's role ("Civic Surveyor").
- **Tarn:** keep the app's role ("Cult Roadwarden").
- **Vara:** keep the brief's role, "The Keeper". The book's stub `npcs/vara-cairn.yaml` was updated to match, replacing my wording "The Keeper — newly Called".
- **Serevan:** where descriptions differ, combine them. I wrote consolidated text for Overview (identical content), Personality (adds "compassionate" and keeps the brief's paragraph about his fear), Narrative Role (the app's branch framing plus the brief's "not defending a lie" and the consequences of his defeat; the second "genuinely works" is dropped as a repeat) and Relationship to the Ritual (adds "meaningful"). His role and age are not descriptions, so they keep the suggested values ("His Prominence", 230).
- **Everything else:** keep the suggested value.

**Result:** 0 open conflicts, 21 resolved, 0 stale.

### Next stages (from the plan)

- **C:** finish the pilot migrations once the open questions are answered.
- **D:** generated Inventory, Continuity and Readiness pages.
- **E:** reference JSON export.
- **F onward:** app integration (`BookRef`, `/ref/:id`, drawer, Docs navigation), state persistence, hosting, conformance pilot.

## 2026-11-17 — Characters step 3: parallel read path in the API

The app still reads and writes characters in the database. Nothing it does has changed.

### New code

| File | What it does |
|---|---|
| `server/Services/Canon/CanonCharacter.cs` | The character-file model: identity, `start:` and sections |
| `server/Services/Canon/CanonText.cs` | A slug function that matches github-slugger, plus the same text normalisation the merge tool uses |
| `server/Services/Canon/CanonCharacterReader.cs` | Parses the frontmatter (YamlDotNet 18.1.0, added to the server) and the `##` sections (`:::player-facing` means Public). Reports a bad file instead of throwing. |
| `server/Services/Canon/CharacterParity.cs` | Compares each database row with its file, field by field: identity, every `start:` value (exact, including doubles), the 13 profile sections, and each detail section with its audience. Differences listed in `expected-differences.json` are counted, not reported. Duplicate headings are reported. |
| `server/Controllers/CanonController.cs` | `GET /api/canon/characters` (the parsed files) and `GET /api/canon/characters/parity` |
| `server.Tests/CanonCharacterTests.cs` | 10 tests: parsing, slugs checked against keys from the JavaScript side, normalisation, bad files, and parity (clean, unexpected, expected, stale, audience, missing on either side) |

### Configuration

- **`Canon:CharactersPath`:** defaults to `../adventure/staging/characters`.
- **`docker-compose.yml`** mounts `./adventure/staging/characters` read-only at `/app/canon/characters`. At the switch, this becomes `adventure/src/content`, read-write.
- **`tools/dev.mjs`** now runs `docker compose up -d --build`. Before this, `npm start` never rebuilt the API image, so server changes didn't reach the running API.

### Merge tool changes this step required

- **Starting values are written as exact doubles,** not rounded to four places. Rounding would have changed the simulation's inputs at the switch.
- **New output, `expected-differences.json`:** the fields whose final value intentionally differs from the app.
- **`id-map.yaml`** now records section renames (app detail key → file section key).
- **Briefs are also matched through app aliases and brief titles.** The app's "The Observer" (alias "Silas Venn") had become two files; it's now one, `npc.silas-venn`. The merge produces 49 characters (was 50).
- **Brief parsing fix:** Tomlin Cobb's heading in Character Briefs is `# Groundskeeper - Tomlin Cobb` (level 1, not level 2). His whole brief had been merged into Miriel Stoutfoot's file. An H1 in "Title - Name" form now starts a character; any other H1 ends one. Character Briefs itself is unchanged.
- **Duplicate section headings** in a merged character now count as invalid.

### Verification

- **Parity against a copy of the database** (API on port 5083), then against the **live** database through the Docker API: files 49, compared 47 of 47, 2,211 fields, 91 expected differences, **0 unexpected**. Nothing is missing on either side and no expected difference is stale. Files with no app record: Portia Harthwright and Willow Stoutfoot, both one-line brief entries.
- **Tests:** server `dotnet test` 45 of 45 (was 35 of 35); client `npm run test:unit` 228 of 228, including the replay goldens.
- **Not this change:** the build warns about known vulnerabilities in `Microsoft.OpenApi` 2.0.0 and `SQLitePCLRaw.lib.e_sqlite3` 2.1.11. Both were already in the server.

### Open

**9 merge conflicts the fixes uncovered,** listed in `staging/characters/MERGE-REPORT.md`:
- **Silas Venn / The Observer:** name, role, Overview, The Manor.
- **Tomlin Cobb:** age, Blind Spot, Narrative Role, Performance Inspiration, and The Name.

## 2026-11-17 — Last merge conflicts resolved; server vulnerabilities fixed

### Resolutions (user)

Recorded in `adventure/sources/character-merge-resolutions.yaml`:
- **Silas Venn:** name "Silas Venn" (from the brief), aliases `[The Observer]`, role "GM Stand-in". The small wording differences in Overview and The Manor are ignored, so the suggested values are kept.
- **Tomlin Cobb:** the brief's version for age (82), Blind Spot, Narrative Role, Performance Inspiration, and The Name.

**Merge tool change:** a resolution now applies to any field it names, whether or not that field was a conflict (Silas's aliases weren't one). Resolutions can also give a non-text `value:`, such as a list.

**Result:** 0 open conflicts, 31 resolved, 0 stale. Parity on the live database: 47 of 47 characters, 2,211 fields, 92 expected differences, 0 unexpected.

**Noticed, not changed:** the app has Silas's ancestry as "Human?", with the question mark. It has been carried into his file as it stands.

### Vulnerabilities

Both projects had high-severity indirect dependencies:
- `Microsoft.OpenApi` 2.0.0 ([GHSA-v5pm-xwqc-g5wc](https://github.com/advisories/GHSA-v5pm-xwqc-g5wc), fixed in 2.7.5);
- `SQLitePCLRaw.lib.e_sqlite3` 2.1.11 ([GHSA-2m69-gcr7-jv3q](https://github.com/advisories/GHSA-2m69-gcr7-jv3q), affects versions up to 2.1.11).

**Fix:** patch updates within .NET 10. I used 10.0.14 (released 25 October), which has been out for three weeks. 10.0.15 (10 November) is newer but adds no further fix for these two.

| Package | Before | After | Pulls in |
|---|---|---|---|
| `Microsoft.AspNetCore.OpenApi` (server) | 10.0.3 | 10.0.14 | `Microsoft.OpenApi` 2.12.2 |
| `Microsoft.EntityFrameworkCore.Sqlite` (server and tests) | 10.0.9 | 10.0.14 | `SQLitePCLRaw.*` 2.1.13 |
| `Microsoft.EntityFrameworkCore.Design` (server) | 10.0.9 | 10.0.14 | — |

**Verified:**
- `dotnet list package --vulnerable --include-transitive` reports "no vulnerable packages" for both projects.
- The build succeeds with no NU1903 warnings.
- `dotnet test`: 45 of 45.
- The Docker image rebuilds. The API serves `/api/characters` (47) and `/openapi/v1.json` (200), and parity is clean.

**Restore note:** the company NuGet feed `tylertech.jfrog.io` returned 403, which makes `dotnet restore` fail outright. I restored once with `--source https://api.nuget.org/v3/index.json`, leaving the NuGet configuration unchanged. The Docker build restores from nuget.org and isn't affected. The remaining NU1900 warning only means the vulnerability check couldn't query that feed.

## 2026-11-17 — Public package feeds only (user)

**Ruling:** this project must not use the company package feed (`tylertech.jfrog.io`). It was configured user-wide in `~/.nuget/NuGet/NuGet.Config`, which wasn't changed. Project-level config now overrides it:

- **`nuget.config` (repo root):**
  - `<clear />` drops every inherited source, leaving nuget.org as the only one;
  - `packageSourceMapping` pins every package to nuget.org;
  - it covers `server/` and `server.Tests/`, as `dotnet nuget list source` confirms from both;
  - the Docker build context is `./server` with no user config, so it already used nuget.org only.
- **`.npmrc`** with `registry=https://registry.npmjs.org/`, in the repo root, `client/` and `adventure/`. npm reads project config only from the folder that holds the `package.json`, so each package needs its own. All three were already on npmjs, and their lock files resolve only from `registry.npmjs.org`. This pins it.

**Verified:**
- a plain `dotnet restore` (no `--source`) succeeds;
- the NU1900 "unable to load service index" warning is gone;
- `dotnet test`: 45 of 45;
- `npm config get registry --location=project` shows npmjs in all three packages.

This replaces the one-off `--source` workaround described in the previous entry.

## 2026-11-17 — Package updates

**Policy:**
- Updates stay within each package's current major version.
- Each package goes to the newest release that is at least 14 days old. Security fixes are the exception.
- Major versions are held for a decision.
- Everything comes from public feeds only (see the previous entry).

### Client (`client/`)

| Package | Before | After |
|---|---|---|
| `@angular/*` framework (common, compiler, compiler-cli, core, forms, platform-browser, router) | 22.0.1 | 22.2.4 |
| `@angular/cli`, `@angular/build` | 22.0.1 | 22.2.5 |
| `@ngrx/*` (store, effects, operators, signals, store-devtools) | 21.1.1 | **22.0.1** |
| `@analogjs/vitest-angular` | 2.6.0 | 2.9.5 |
| `vitest`, `@vitest/coverage-v8` | 4.1.8 | 4.1.12 |
| `chart.js` | 4.5.1 | 4.6.1 |
| `ngx-vflow` | 2.6.0 | 2.7.0 |
| `prettier` | 3.8.4 | 3.9.10 |
| `tslib` | 2.8.1 | 2.9.1 |
| `d3-drag`, `d3-selection`, `d3-zoom` | 3.0.0 | 3.0.1 |
| `@types/d3-selection`, `@types/d3-zoom`, `@types/leaflet` | — | 3.0.12, 3.0.9, 1.9.22 |
| Indirect: `undici`, `browserslist`, `baseline-browser-mapping` | | Fixed versions, via `npm audit fix` (not `--force`) |

**About NgRx 22:** it is NgRx's release for Angular 22; the app had been running NgRx 21 on Angular 22. I updated it with `ng update`, which applies NgRx's code migrations. None were needed: no source files changed.

**Verified:**
- `npm run test:unit`: 228 of 228, before and after.
- The development build compiles cleanly.
- **Browser check against the live API:** no console or page errors on any of the 12 main screens.
  - Real data renders: characters, goals, Assets, sessions and narrative.
  - Kelda's detail page shows her profile.
  - The Relationship Rules chart draws on chart.js 4.6.1.
  - The dashboard's timeline charts can't be checked yet: the campaign has no session history, so they don't appear.

**Problem that predates this update:** `npm run build` (the production configuration, which `docker-compose.full.yml` uses) **was already failing before any update**. It fails on Angular's size budgets: the initial bundle is 1.34 MB against a 1 MB limit, and six component stylesheets are over their 8 kB limit. The failures are the same before and after the update. This needs a decision: raise the budgets in `angular.json`, or slim the stylesheets and bundle. I haven't changed it.

**Note:** npm 11 holds back package install scripts until they're approved (`npm install-scripts approve`). `esbuild` and `fsevents` are held. The build doesn't need them: esbuild uses its platform-specific package.

### Book (`adventure/`)

| Package | Before | After |
|---|---|---|
| `astro` | 7.3.8 | 7.4.7 |
| `js-yaml` | 4.1.1 | 4.3.2 |
| `hast-util-to-html` | 9.0.5 | 9.0.6 |
| `mdast-util-directive` | 3.1.0 | 3.2.0 |
| `mdast-util-from-markdown` | 2.0.2 | 2.1.0 |
| `unist-util-visit` | 5.1.0 | 5.2.0 |

- **Astro 7.4** needs Node 22.23.4 or later. I had held it at 7.3 for the machine's default Node 22.21. The workspace now standardises on Node 24 (`.nvmrc`), and the Angular CLI already needs 22.22.3 or later, so that reason is gone.
- **7.4.7** is the smallest release that fixes GHSA-r3h5-4585-7x3w. That flaw is in the `@astrojs/node` server adapter, which this static book doesn't use.
- **`js-yaml` 4.3.2** fixes four quadratic-CPU advisories (GHSA-h67p-54hq-rp68 and three others).
- **Starlight stays at 0.42.8:** 0.43 is a minor release in the 0.x series, which can break, and it's only four days old.

**Verified:**
- Both builds pass, with validation and the privacy scan clean.
- All 17 browser checks on the GM build pass (phone layout, search, privacy, history, deep links, 404s).
- The merge tool still produces 49 characters with 0 conflicts.
- With `npm start` on the updated packages: app, book (search included) and API return 200 through port 4200, with no failed requests.

### Security status after the update

- **.NET:** no vulnerable packages.
- **npm, both projects:** the only remaining root advisory is **`picomatch` ≤ 4.0.7** (GHSA-fc5q-39xc-vjpf, ReDoS through repeated extglobs).
  - No fixed version exists yet: 4.0.7 is the newest.
  - It's build-time only (Vite, Angular's builder, Astro), and it only matches patterns from our own config.
  - The other "vulnerable" entries in `npm audit` are packages that depend on it.
  - Re-check when picomatch publishes a fix.

### Held: major versions to decide

- **.NET 11:** EF Core 11, AspNetCore.OpenApi 11. This needs the .NET 11 SDK and runtime images; this machine has the 10.0 SDK.
- **Server test tooling:** Microsoft.NET.Test.Sdk 18, xunit.runner.visualstudio 4, coverlet.collector 10.
- **Client:** TypeScript 7 (check whether Angular 22 supports it first), Vitest 5 and coverage-v8 5, jsdom 31, ng2-charts 11.
- **Book:** Starlight 0.43, js-yaml 5.

## 2026-11-17 — Loose ends, then the switch: characters live in content files

### Loose ends (user rulings)

1. **Production budgets raised** (`client/angular.json`):
   - initial bundle: warning 1.5 MB, error 2 MB (was 500 kB / 1 MB);
   - component styles: warning 24 kB, error 32 kB (was 4 / 8 kB).

   `npm run build` now succeeds. The only remaining warnings are about CommonJS modules (leaflet, leaflet-draw, polylabel), which were already there.
2. **The Book's Source Level is 15 throughout the campaign.** Recorded in the migration map and the Source entity.
3. **Kelda's No One Crosses and Protector of the Keeper are, for now, her general abilities.** They stay on her stat block as written.
4. **Kivren's Methods:** "identifed" is corrected to "identified", as a resolution `text:`. **Silas's ancestry:** "Human?" becomes "Human", as a resolution `value:`.

**Still open:** "Reconstruction Threshold" or "Stability Threshold".

### The switch (ADVENTURE-BOOK-PLAN.md §9, step 4)

#### Content

- 48 NPC files and 1 PC file from the final merge are now in `adventure/src/content/npcs/` and `pcs/`, replacing the 5 stub entries. They are tracked by git from here on.
- The book builds all of them: 63 pages in the GM build and 78 in the designer build. Validation and the privacy scan are clean.

#### Server

| File | Change |
|---|---|
| `Services/Canon/CanonCharacterStore.cs` | **New.** The single store. Loads `npcs/` and `pcs/` and rescans every 300 ms, so outside edits are picked up. A broken file keeps its last good version and is reported. **Writes:** edit the YAML in place, so fields the app doesn't own (title, provenance, design, status, unknown keys) survive; keep the merge tool's key order; validate against `adventure/schemas/<kind>.schema.json` (JsonSchema.Net 9.6.0) plus the values-sum rule; refuse if the file version changed since it was read; write atomically (temp file, then rename). |
| `Services/Canon/CanonCharacterMapping.cs` | **New.** Maps `Character` to the file and back. Lists the 32 file-backed properties. Snapshots each character "as loaded", so edits EF can't see are still detected. `CanonMaterializationInterceptor` fills every character as EF loads it, so the controllers, the simulation and ChampionRules work unchanged. |
| `Services/Canon/CanonSections.cs` | **New.** Maps profile fields to fixed `##` sections, and detail sections to `CharacterDetail` (id `<characterId>~<key>`; Public is wrapped in `:::player-facing`). |
| `Services/Canon/CanonLinks.cs` | **New.** `GuardSwitch` refuses the migration unless the files exist and every row is in the link map. `Backfill` sets `CanonId` from `adventure/staging/characters/id-map.yaml`. |
| `Models/Character.cs` | Adds `CanonId` (column) and `CanonVersion` / `CanonMissing` (not mapped). |
| `Models/CharacterSectionReveal.cs` | **New** table: section key revealed at the table (play state). |
| `Data/AppDbContext.cs` | File-backed properties are ignored as columns, and the profile and detail tables are gone. `SaveChangesAsync` marks characters with file-backed changes as Modified, runs the live lock, then writes files **before** the database commit. A file is deleted only with its last link; a missing file is never written. |
| `Services/SimulationGuard.cs` | **Live lock:** file-backed properties are compared with the file. For a detached update with no `CanonId`, the link is taken from the row. |
| `Controllers/CharactersController.cs` | Sorts by name in memory. On update, `CanonId` comes from the database. |
| `Controllers/CharacterNarrativeProfileController.cs`, `CharacterDetailsController.cs` | Rewritten on the store, with the same API shape. Revealed is kept in the database. |
| `Controllers/CanonController.cs` | Parity is replaced by `GET /api/canon/status` (paths, load errors, missing files) and `GET /api/canon/characters`. `CharacterParity` was removed. |
| `Controllers/CampaignsController.cs` | **Delete:** removes this campaign's links and reveal flags, never the files. **Import skips characters** and says so, because an import re-maps faction ids, which one shared file can't hold. This returns at step 5. |
| `Data/SeedData.cs` | A fresh database links to existing character files; with no files, it seeds the defaults as before. |
| `Program.cs` | Registers the store and the interceptor. Maps conflicts to 409 `canon-conflict` and schema failures to 400 `canon-invalid`. Startup order: GuardSwitch → Migrate → Backfill → Seed. |
| `Migrations/20261117210133_CanonCharacterStore.cs` | Drops 32 columns and the two tables, adds `CanonId` with an index, and creates `CharacterSectionReveals`. **Hand-corrected:** EF had generated `RenameColumn(Summary → CanonId)`, which would have put every summary into the link column. It now drops Summary and adds CanonId. |

- **Tooling:** `dotnet-tools.json` adds `dotnet-ef` 10.0.14 as a repo-local tool.
- **Docker:** both compose files mount `./adventure` at `/app/adventure` read-write, with `Canon__ContentPath`, `Canon__SchemaPath` and `Canon__LinkMapPath`.
- **Merge tool retired:** `scripts/merge-characters.mjs` now exits with a message, since the database no longer has character columns.

#### Tests

- `server.Tests`: 51 of 51.
  - New: `CanonCharacterStoreTests`, 9 tests covering create and read, tracked edits, keeping fields the app doesn't own, outside-edit conflict, schema refusal, the live lock on `start:` values, shared-file delete, missing files, and the section round trip.
  - `TestCanon` provides a temporary store, validated against the real schemas.
  - `ChampionRulesTests` and `SimulationGuardTests` now use it.
- Client: 228 of 228.

**Bugs found while testing:**
- A tracked character whose file was missing had no snapshot, so an edit to it was silently dropped. It's now refused.
- A detached update with no `CanonId` skipped the live lock and would have created a duplicate file. The link is now taken from the row.

#### Verification

1. **Baseline** captured from the live API before any code change: 47 characters, 21 profiles, 26 detail rows.
2. **Rehearsal** on a copy of the database and a scratch copy of the content:
   - the guarded migration ran and linked 47 of 47;
   - before against after across 2,258 fields: the **92 intended merge differences**, plus one format normalisation (Evin's aliases, "The Child; Former Keeper" becomes "The Child, Former Keeper");
   - write paths through the API, 11 of 11: PUT to file; book-owned fields kept; outside edit then stale PUT gives 409 with the file untouched; level 99 gives 400; detail create (player-facing), update (Revealed in the database), reorder and delete; profile upsert; character create (new file) and delete (file removed);
   - an API-written file builds in the book.
3. **Live:** backed up `colony-data/colony.db.bak-pre-canon-20261117150533` (47 characters and 21 profiles, verified), then `docker compose up -d --build`.
   - The migration applied and linked 47 of 47.
   - The same comparison gave the same result (92 intended, 1 normalisation).
4. **End to end with `npm start`:**
   - an edit through the app's origin reached the file, the book showed it about 2 seconds later, and the app's character page showed it with no errors;
   - reverting gave a byte-identical file.

#### Known limits and follow-ups

- **Shared canon:** campaigns that link the same file share its starting values. Campaign import of characters is off until factions are files too (step 5).
- **Section saves** (profile and details) are last-write-wins at section level: the file is re-read at write time and only the sections change. Whole-character saves are version-checked.
- **One batch, several characters:** in a single save that touches several characters, files are written before the database commit, so a failure partway through can leave earlier files written.
- **Characters not in the campaign:** Portia Harthwright and Willow Stoutfoot are canon files with no link in this campaign.
- **Leftovers:** `adventure/staging/` and `Canon__LinkMapPath` are now only needed for database copies made before the switch. They can be retired.

---

## 2026-11-17: Stability Threshold; factions, Assets and locations move into files

### Ruling: "Stability Threshold"

The user chose **Stability Threshold** (The Veiled). The Burden's and Creatures' "Reconstruction Threshold" is retired.
- The book already used Stability Threshold.
- The open question is closed in `book-of-names.yaml` and `sources/migration-map.yaml`.

### Ruling: every other entity into files

Factions, Assets and locations now live only in `adventure/src/content/{factions,assets,locations}/*.yaml` (ADVENTURE-BOOK-PLAN.md §10). The app reads and saves them through the same store as characters.

#### Book

| File | Change |
|---|---|
| `src/schemas.mjs` | New `faction` and `asset` schemas, and `location` extended. Character `start:` references must be canonical IDs. The shared `values` vector check moved into one place. |
| `src/lib/registry.mjs`, `astro.config.mjs` | New Factions and Assets appendix sections. |
| `src/pages/[section]/[slug].astro` | Pages for each new type. A faction page shows its identity table, origin and history, GM notes, Assets and notable members. An Asset page shows its controller and location. A location page shows its parent, Asset, places within and Assets there. |
| `scripts/validate.mjs` | Checks that every reference between files resolves (dotted paths such as `start.faction`). |
| `scripts/merge-entities.mjs` | New: one file per database row, plus the character reference rewrite, into `staging/entities/` with `id-map.yaml` and `MERGE-REPORT.md`. Now retired: it exits because the columns are gone. |

#### Merge decisions

- **Sources:** the app database is the only structured source. No source document has per-faction, per-Asset or per-location entries.
- **Data checks:** the live data had no dangling references, no duplicate names, and every value vector summed to 1.
- **House of Abiding:** merged into the existing book stub. The book's ID, slug, status and provenance were kept, and the app's description became its summary.
- **Ritual Chamber:** the book stub's summary was kept under the standing policy that book entries win: "Beneath the Monument of the First Keeper, reached through the Memorial Building and down a spiral stair." The app's "A hidden chamber where the Reading is performed." is replaced. **This is the only value that changed.**
- **Character files:** 46 of 49 had their `start:` references rewritten from app IDs to canonical IDs. No other byte changed.

#### Server

| File | Change |
|---|---|
| `Services/Canon/CanonStore.cs` | Renamed from `CanonCharacterStore` and now holds five kinds: npc, pc, faction, asset, location. A miss rescans once, so a file created within the 300 ms scan window is found. |
| `Services/Canon/CanonEntityMapping.cs` | New. One field table per type maps each property to a dotted path in the file. Unchanged values keep their YAML node, so their quoting survives. |
| `Services/Canon/CanonYaml` (in the same file) | New. Shared scalar styling: literal blocks for multi-line text, and double quotes where YAML needs them (matching js-yaml). Characters use it too. |
| `Services/Canon/CanonRefs.cs` | New. Translates canonical IDs to and from row IDs per campaign. It loads with a raw query on the context's own connection, so it works during materialisation. |
| `Services/Canon/CanonMapping.cs` | New. Dispatches for all four types, holds the snapshot change detection, and contains the generic materialisation interceptor. |
| `Models/ICanonEntity.cs` | New. Implemented by Character, Faction, Asset and Location; the last three gain `CanonId`, `CanonVersion` and `CanonMissing`. |
| `Data/AppDbContext.cs` | Ignores the file-backed properties for all four types. The save first gives every entity its link (so references between new rows resolve), then writes the files. |
| `Services/SimulationGuard.cs` | The live lock compares against the file for any file-backed type. |
| Controllers | Sorting and filtering on file-backed fields now happen after loading (Factions, Assets, Locations, Relationships, the Asset/location sync). PUT takes the file link from the row. Create always makes a new file. |
| `Controllers/CampaignsController.cs` | Import re-enabled for characters, and it links instead of copying. |
| `Controllers/CanonController.cs` | `/api/canon/status` covers every kind. |
| `Services/Canon/CanonLinks.cs`, `Program.cs` | Guard and backfill for the second switch. It refuses unless every row has a file through `staging/entities/id-map.yaml` and the character files already use canonical references. |
| `Data/SeedData.cs` | A fresh database links to every file when files exist. |
| `Migrations/20261117225526_CanonEntityStore.cs` | Drops 51 columns and adds `CanonId` with indexes. **Hand-corrected again:** EF had scaffolded `RenameColumn` for `Locations.ParentLocationId`, `Factions.Summary` and `Assets.StatusActorFactionId` into `CanonId`. These are now drop plus add. |
| `docker-compose.yml`, `docker-compose.full.yml` | Add `Canon__EntityLinkMapPath`. |

#### Bugs found while testing (latent for characters too)

- **Value-sum check crash:** the check crashed on whole numbers (`agency: 0`). A character with `stability: 1` would have hit it.
- **Spurious `start:` block:** a character file without `start:` gained one on any app save.
- **Single quotes:** new values that needed quoting were written in single quotes, unlike the rest of the files.

#### Tests

- **Server:** 65 of 65.
  - New: `CanonEntityTests`, 14 tests covering:
    - canonical references in, row IDs out;
    - refusing an app ID in a file;
    - the live lock on a faction baseline, with prose staying editable;
    - a detached update keeping book-owned fields;
    - delete;
    - two campaigns sharing files;
    - every content file surviving an unchanged app save byte for byte (`CANON_TEST_CONTENT` points it at another folder);
    - schema enums matching the C# enums.
- **Client:** 230 of 230.

#### Verification

1. **Baseline** captured from the live API before any change: 11 factions, 31 Assets, 37 locations, 47 characters with profiles and details, 49 relationships, 53 goals, 2 maps.
2. **Rehearsal** on a copy of the database and a scratch copy of the content:
   - the guarded migration linked 11, 31 and 37 of 11, 31 and 37;
   - before and after matched across **5,532 values**, list order included, except the one Ritual Chamber summary;
   - write paths, 15 of 15:
     - re-saving all 126 entities unchanged left every file byte-identical;
     - a prose edit changed exactly one line, and reverting it gave a byte-identical file;
     - reference edits wrote canonical IDs;
     - the location/Asset sync worked through both files;
     - create and delete (including "The" being dropped from IDs);
     - 409 on an outside edit;
     - 400 on an invalid tier;
     - a character faction edit;
   - import into a second campaign linked 58 entities with no file writes, references resolved to that campaign's rows, the live lock refused a Momentum change and allowed prose, and deleting the campaign left every file intact.
3. **Live:** backed up `colony-data/colony.db.bak-pre-entities-20261117170141` (11, 31, 37 and 47 rows verified), copied the staged files into `src/content`, then `docker compose up -d --build`.
   - The migration linked every row.
   - Same comparison: 5,532 values, the one intended difference.
4. **End to end with `npm start`:**
   - a motto edit through the API reached the file, the book showed it within about 6 seconds, and the app's faction page showed it with no console errors;
   - the locations map renders all 76 placements;
   - reverting gave a byte-identical file.
5. **Book:** GM build validates 132 entities and the privacy scan is clean. The designer build checked 4,194 links in 157 pages.

#### Known limits

See ADVENTURE-BOOK-PLAN.md §10. Goals remain in the database.

---

## 2026-11-17: Goals into files; Asset location merged into the location

### User rulings

- **Ritual Chamber:** keep the book's summary. No change.
- **Goals:** convert them to files too. See ADVENTURE-BOOK-PLAN.md §11.
- **Asset location:** merge it into the location. An Asset that a location stands for no longer stores its own location (ADVENTURE-BOOK-PLAN.md §10).

### Changes

| Area | Change |
|---|---|
| Book schema | New `goal` schema, with Effects whose IDs are canonical. The Asset `start.location` comment explains the merge. |
| Book registry | An Asset's view derives `location` (and `place`) from the location that stands for it. A new Faction Goals section. |
| Book pages | Goal pages show faction, priority, visibility, Act, champion, target and Effects in words. Faction pages list their goals. Asset and location pages use the derived location. |
| `scripts/validate.mjs` | Checks goal references, including the IDs inside Effects. Refuses `start.location` on an Asset that a location stands for. |
| `scripts/merge-goals.mjs` | New. Writes 53 goal files and removes `start.location` from the 11 linked Assets that had one, after checking each equals the location's parent (all did). Now retired. |
| `CanonEntityMapping` | New goal table. A `PolyRef` kind for the goal target and an `Effects` kind (YAML list ↔ the app's compact JSON, with IDs translated). Unchanged Effects keep their YAML nodes. Assets derive their location from the linking location. |
| `CanonStore` | Adds the `goal` kind and `LocationLinking(assetId)`. |
| `AppDbContext` | When a location takes an Asset, the Asset's own location is removed. When it lets the Asset go (or is deleted), the Asset keeps the location's old parent. Every saved entity is re-read after the writes, so derived values are current. |
| `FactionGoal` | Now `ICanonEntity`. |
| `FactionGoalsController`, `ChampionRules` | Filter and sort after loading. PUT takes the file link from the row; create makes a new file. |
| `CanonRefs`, `CanonController`, `SeedData` | Cover goals. |
| `CanonLinks`, `Program.cs` | Guard and backfill for `CanonGoalStore`, through `staging/goals/id-map.yaml` (`Canon__GoalLinkMapPath` in both compose files). |
| `Migrations/20261117234715_CanonGoalStore.cs` | Drops 18 goal columns and adds `CanonId`. **Hand-corrected a third time:** EF had scaffolded `RenameColumn(TargetState → CanonId)`. |

### Tests

- **Server:** 74 of 74. New tests cover:
  - Assets deriving their location: load, moving the place, unlinking, relinking, deleting;
  - goals written with canonical IDs and their Effects read back as the exact JSON string;
  - the live lock on a goal's baseline;
  - refusing an Effect that names something with no file;
  - goal enums matching the C# enums.
- The byte-for-byte round trip covers goal files.
- **Client:** 230 of 230.

### Verification

1. **Baseline** from the live API.
2. **Rehearsal** on a copy of the database and content:
   - linked 53 of 53;
   - before and after match across 5,532 values with **zero differences**;
   - write paths, 21 of 21, including:
     - re-saving all 179 entities unchanged;
     - moving a location moving its Asset, and moving the Asset moving its location;
     - a goal Effect edit changing exactly one line, and reverting it;
     - the one-champion rule still refusing a second active goal (409);
     - goal create and delete;
   - import and the live lock unchanged.
3. **Live:** backup `colony-data/colony.db.bak-pre-goals-20261117175028` (53 goals). Linked 53 of 53; zero differences.
4. **End to end:**
   - a goal title edit through the API reached the file, the goal's book page, the faction's goal list and the app's Goals page, with no console errors;
   - reverting gave a byte-identical file;
   - the Ritual Chamber Asset page derives "Location: Memorial Building".
5. **Book:** 185 entities validate. The designer build checked 5,913 links in 211 pages.

---

## 2026-11-17: Clean-up

### Staging archived

- `adventure/staging/` (the three merges' output, reports and link maps) moved to `colony-data/canon-switch-archive/staging/`, outside git, beside the database backups. The archive was verified identical before the original was removed.
- It includes the iCloud duplicate copies (`* 2.*`) in `characters/`, kept as found.
- `Canon__LinkMapPath`, `Canon__EntityLinkMapPath` and `Canon__GoalLinkMapPath` stay, pointing at the archive. Both compose files use `/app/data/canon-switch-archive/...`, and the server defaults use `../colony-data/canon-switch-archive/...`.
- The maps matter only if a pre-switch backup is restored: CanonLinks then links its rows to their files. Without them it refuses to migrate rather than lose data.

### All-or-nothing saves

- **Before:** a save that wrote several files did so before the database commit, so a failure partway through could leave some files written.
- **Now:** `CanonStore.BeginJournal()` records each file as it was before the save's first change to it (per async flow, so concurrent requests don't mix). `AppDbContext.SaveChangesAsync` rolls every one back if a later file or the commit fails: changed files are restored, created files removed, deleted files recreated.
- **Tests:** 76 of 76. Two new tests:
  - a schema refusal partway through a batch, after one changed file and one new file were already written;
  - a database commit failure (duplicate key) after the files were written.

  In both, every file ends up byte-identical to before.
- **Live:** API rebuilt. Status clean, and the output still matches the baseline with zero differences.

### Portia Harthwright and Willow Stoutfoot

- **Merge bug found:** the character merge (step 2) dropped the one-line descriptions of characters that existed only in Character Briefs. Their files held only a name.
- **Fixed:** both lines restored verbatim as `summary:`.
  - Willow: “Miriel Stoutfoot’s grandmother. The object of a rescue attempt that she voluntarily rejected.”
  - Portia: “The original owner of the Veiled House on Crescent Island.”
- **No one else affected:** every other one-line brief entry belongs to a character the app also had, and their app text already covers it (Evin, Pépé). Vic had no summary in the app either.
- **Linked (user ruling below):** both are characters in the app, state Forgotten.

## 2026-11-17: One source of truth, both directions

**User ruling:** "If they're characters in the book, they'll show up in the app, and vice versa." Portia Harthwright and Willow Stoutfoot are both Forgotten.

- **New: `Services/Canon/CanonAutoLink.cs`.** A hosted service gives every canon file with no row a link row in each **Design** campaign.
  - This covers files added in VS Code, by git, or by a merge.
  - It checks every 2 s, and queries the database only when the set of files changes.
  - A file under 5 s old is left for a later pass, because it may be one the app is creating right now.
  - **Live campaigns are skipped:** a new entity enters a Live campaign through an Event (`IntroducedAtEventId`), so an unlinked file is listed in `/api/canon/status` instead.
- **A link row writes nothing.** A new row that only links an existing file (seed, import, auto-link) and changes none of its values no longer re-saves the file, so hand-written files keep their exact text.
- **New: `Migrations/*_CanonLinkUnique.cs`.** A unique index on (`CampaignId`, `CanonId`) for characters, factions, Assets, locations and goals: one file is never linked twice in a campaign.
- **Tests:** 78 of 78. New tests cover:
  - a hand-written file linked once, without being rewritten, with its references resolved;
  - Live campaigns skipped and new files left to settle;
  - a double link refused.
- **Live:**
  - backup `colony-data/colony.db.bak-pre-autolink-20261117194554`;
  - on rebuild, the linker linked both characters with their files byte-identical, giving 49 characters and nothing unlinked;
  - both were then set to Forgotten through the API, so their files gained a `start:` block with the app's neutral defaults (values ⅓ each, no faction);
  - the book validates.

## 2026-11-17: Flag, don't delete

**User ruling:** a missing record is flagged in the app and in the book, never deleted automatically. All deletes go through the API; deleting in VS Code is frowned upon. A clean-up button for stale references may come later.

| Area | Change |
|---|---|
| App shell (`app.html`, `app.ts`, `app.scss`) | **Missing-file banner:** every record whose file is missing, from the entities' `canonMissing`. **Stale-reference banner:** grouped by missing entry, with the full list behind "Show all", from `/api/canon/status`. It refreshes whenever an entity list changes. |
| `core/models/types.ts`, `api.service.ts` | `canonId`, `canonVersion` and `canonMissing` on the five models; `getCanonStatus()`. |
| `CanonEntityMapping.References`, `CanonController` | Every canonical id a file refers to, including goal Effects. Status returns `staleReferences` (from, path, to). |
| Book: `registry.mjs` | `REF_FIELDS`, `referencesOf` and `staleReferences`: one implementation for the validator and the pages. |
| Book: `components/Ref.astro`, entity pages | A reference to a missing entry renders flagged ("faction.witnesses (missing)") instead of as a link or bare id. |
| Book: `pages/stale-references.astro` | New **Stale references** appendix: entry, field, missing target. |
| Book: `scripts/validate.mjs` | Unknown references (entry data, `:ref`/`:stat`, chapter inventory and revelations, flagged output) are now warnings listed as stale. Structural problems still fail. |

**Verification:**
- **Scratch copy of the database and the book:**
  - Deleting the Witnesses faction through the API left 23 stale references (its Assets' controllers, goals and members). All were reported by the API and flagged in the app.
  - Deleting `kelda-varruk.md` directly flagged Kelda's record as missing.
  - The book still built: 70 flags in total, 26 in the sources and 44 on rendered pages. Every affected page showed "(missing)", and the Stale references page listed the 24 data references.
- **Tests:** server 79 of 79 (new: an API delete leaves stale references that are flagged, never rewritten); client 230 of 230; the production build passes.
- **Live:** no stale references, no missing files, nothing unlinked, and the book's page reads "None".

## 2026-11-17: Narrative merge, step 1 (staged, awaiting review)

- **`adventure/scripts/merge-narrative.mjs`** (read-only; writes `staging/narrative/`) drafts:
  - 17 events and 18 encounters (two of them new: the Confluence and Totality encounters);
  - 17 threads and 4 chapter pages, from `sources/narrative-outline.yaml`;
  - 47 connections, stored on their source as `leadsTo`, and the cast links, stored on their owner as `links`.
- **The two existing book pages** become the bodies of `event.the-calling` and `encounter.the-reading`. Their `canon.concepts` merge into `links`, and their descriptions give way to the item summaries.
- **Timing ruling applied to connections:** Confluence → Eclipse → Observer → Totality (4 connections rewired, each keeping its thread).
- **Canon check:** four parallel reviewers compared all 52 items, including their per-path versions, with the source documents.
  - 25 conflicts found: 23 contradictions, 1 source conflict, 1 outdated name.
  - Every quote was verified verbatim against the item and the cited source line, and all 107 provenance headings resolve.
  - Decisions are in `adventure/sources/narrative-canon-check.yaml`: 14 default to the canon text, 10 low-confidence ones to the app's text, and 1 awaits a ruling.
- **Applied in staging:** 9 fixes, including The Way Out ("Miriel's grandfather led the operation") and The Burden ("the final Name is restored"). 5 per-path fixes wait for step 2.
- **Validation:** all 52 staged files pass the new `event`, `encounter` and `thread` schemas (also added: `chapter` on chapter pages), and 208 references resolve.
- **Found along the way:** the Campaign Outline (Session 9) says the Sheep "punishes unbroken observation". Encounters.md and Creatures.md say the opposite: it is harmless while watched, and losing sight of it is the catastrophe.

## 2026-11-18: Narrative canon check ruled

- **Rulings:** the planning agent's review, accepted by the user, with one change: "Pépé Sylvya" (the Golarion spelling) everywhere, including the thread.
  - Result: 21 canon, 1 app (The Observer), 3 still open.
  - Reviewer confidence no longer picks the default.
- **Rewritten whole from Encounters.md**, so that no sentences from obsolete designs survive:
  - A Life (§2): the Infant and Child, then the bow and the Adult, then the Ledger and the shaving case.
  - The Shape of Someone (§7): Form Stations, Totems, the Ward, three Releases, the Formless Shape, Source becomes Anchor.
  - Revolutionaries, both versions (§9): the Mirror Squad, Vara or Miriel as the target, Choice restored by dropping the rope.
  - Witness Me, Stopped version (§10): the Knocker, one fixed maze, the house's own Order Keeper. Vara is no longer cast into the role.
- **Other changes:**
  - The Official Duskwood Story drops Candlestone, which no source ties to the official story.
  - The thread id is now `thread.pepe-sylvya`: `merge-narrative.mjs` takes the id from a corrected title.
  - The report now lists open per-path decisions as well.
- **Still open:**
  - Eclipse, both versions: Observer before or after the eclipse, which changes what causes the transfer.
  - The Thin Place: the introductory demonstration's Source.
- **Staging:** 17 fixes applied at the switch, 3 per-path fixes wait for step 2, 52 files valid, and 208 references resolve.
- **Source document:** `Campaign Outline.md` line 2337, in The Breach, now says "the Sheep is harmless while watched but kills its last watcher the moment observation breaks", matching Encounters.md and Creatures.md.
  - A copy of the earlier file is in the session scratchpad (`Campaign Outline.pre-sheep.md`).

## 2026-11-18: Observer timing and The Thin Place ruled

- **The Observer ends Act II** (last item in Convergence) and holds the whole reveal, in whichever order the path puts it.
  - Reading stopped: the eclipse begins at the Confluence, and then the Observer calls the Party back.
  - Reading succeeded: the anchors converge at the Manor, the Observer reveals himself, and then the eclipse begins.
  - Eclipse opens Act III with the eclipse already begun.
  - Connections: Confluence → Observer → Eclipse → Totality, the app's own order. The 2026-11-17 rewiring of 4 connections is withdrawn.
- **Canon check:**
  - Eclipse, Reading succeeded: app (correct as written).
  - Eclipse, Reading stopped: canon (Vara disappears in the aftermath of the Confluence; applied in step 2).
  - The Thin Place: app. The demonstration uses an ordinary object as a second Source.
  - Totals: 22 canon, 3 app, none open.
- **Source documents** (copies of the earlier files are in the session scratchpad, `*.pre-observer.md`):
  - `Campaign Outline.md`, Session 8 "If the Reading Was Stopped": Vara disappears after the collision, and the Observer calls the Party back once the eclipse is under way.
  - `Campaign Outline.md`, The Observer Reveal: the timing now depends on the path.
  - `Character Briefs.md`, The Manor (second visit) and Relationship to the Party: now depend on the path.
- **Staging:** 17 fixes applied at the switch, 4 per-path fixes wait for step 2, 52 files valid, 208 references resolve.

## 2026-11-18: Narrative switch, step 1 (live)

Events, encounters and threads are canonical files (ADVENTURE-BOOK-PLAN.md §13), shared by the app and the book.
- Event and encounter files: `adventure/src/content/events/*.md` (17) and `encounters/*.md` (18).
- Thread files: `threads/*.yaml` (17).
- Connections are stored on the source event as `leadsTo`.
- Links to factions, characters, Assets and locations are stored on the owner as `links`.
- Play data stays in the database: event status, thread state, sort order, board positions, realizations, session links, and the per-path versions (step 2).

| Where | Change |
|---|---|
| `server/Models/NarrativeEvent.cs`, `NarrativeThread.cs` | `ICanonEntity`. Events gain `Kind` (Event / Encounter, from which file it is, fixed at creation) and `ParentEventId` (an encounter's `event:`). |
| `server/Models/NarrativeEventConnection.cs`, `NarrativeEntityLink.cs` | A connection is no longer a table. Authored links are no longer rows; session links still are. |
| `server/Services/Canon/CanonNarrativeLists.cs` (new) | `leadsTo` and `links` between YAML (canonical ids) and the entity's JSON (row ids). Book-only link ids (`creature.`, `rule.`, `source.`) stay in the file untouched. |
| `server/Services/NarrativeGraph.cs` (new) | Serves connections and links as before, with ids derived from what each connects. Edits them by saving the owner. |
| `CanonEntityMapping`, `CanonStore`, `CanonRefs`, `CanonMapping`, `CanonAutoLink`, `CanonController` | New kinds `event`, `encounter` and `thread`. The Markdown body is kept byte for byte. GMOnly visibility is left out of the file. New event and thread ids keep a leading "The". Stale-reference checks cover only kinds the app stores. |
| `CanonLinks`, `Program.cs`, migration `CanonNarrativeStore`, `docker-compose.yml` | Guard: every event and thread row has its file, and every dropped connection or link is in its owner's file. Backfill from `Canon__NarrativeLinkMapPath`. EF's guessed `Summary → CanonId` rename was replaced with drop plus add, in both directions. |
| Controllers: narrative events, threads, connections, entity links; campaigns | Rewritten for the above. Deleting an item leaves references to it flagged as stale, never rewritten. Unknown owner → 404. |
| Client: `types.ts`, `app.store.ts`, event editor, events list, event card, `styles.scss` | Kind (chosen at creation, read-only afterwards), "Part of event" for encounters, an Encounter badge on cards. The store replaces a connection by its old id. The events list keeps fields it doesn't show. |
| Book: `schemas.mjs`, `registry.mjs`, `remark-colony.mjs`, `[section]/[slug].astro`, `[section]/index.astro`, `unplaced/index.astro`, `astro.config.mjs`, `validate.mjs` | `links` entries may carry a role and so on; chapter, section and order are optional (unplaced items get their own page). Items live at `/<chapter>/<slug>/`. Item pages show synopsis, body, led from / leads to, and involves. Thread pages show where each thread runs. `::chapter-contents` lists a chapter's sections with their arrangement. The sidebar is built from the chapter pages. |
| Book content | `docs/act-1|act-2|act-3|running/index.md` are chapter pages. `docs/act-1/the-calling.md` and `the-reading.md` are now the bodies of `event.the-calling` and `encounter.the-reading` (copies of the pages are in the session scratchpad). Migration map: `chapter.act-1.the-reading` targets `encounter.the-reading`. |
| `scripts/merge-narrative.mjs` | Files are named by id. An encounter that shares its event's slug in a chapter takes its title's slug (`the-confluence-faction-pileup`, `totality-race-against-the-eclipse`). Chapter pages get `::chapter-contents`. |

**Verification:**
- **Tests:** server 85 of 85 (new `CanonNarrativeTests`). Every staged and live file survives an unchanged app save byte for byte. Client 230 of 230 (`ng test`). The production build passes.
- **Book:** GM and designer builds validate (237 entries, 18,112 internal links), and the privacy scan is clean.
- **Rehearsal (database copy and content copy):**
  - The guard passed. 33 events and 17 threads were linked, and the two new encounters were auto-linked.
  - Against the baseline API capture, 7,885 values were compared and 89 differ, all intended:
    - 66 new `kind` and `parentEventId` fields;
    - 14 text fields carrying the 17 canon fixes, including the thread title "Pépé Sylvya";
    - 2 new encounters;
    - 4 new links from the old book pages' featured entries (The Calling → Vara, Uldren, House of Abiding; The Reading → Ritual Chamber);
    - list order.
  - Writes through the API (edit and revert, add, change and delete a connection and a link, create and delete an encounter) left the content byte-identical.
- **Live:**
  - Backup: `colony-data/colony.db.bak-pre-narrative-20261118092214`.
  - Staging was re-run against the live database just before the switch (unchanged) and archived to `colony-data/canon-switch-archive/staging/narrative/`.
  - The live result equals the rehearsal, apart from the two new encounters' row ids.
  - Status: 179 files, none missing, no stale references, none unlinked. The Narrative page has no console errors.
- **Noticed:** `colony-data/canon-switch-archive/staging/characters/` holds iCloud duplicates (`npcs 2`, `id-map 2.yaml`, ...) from before. Left alone.

## 2026-11-18: Narrative step 2, branching (live)

Branches, paths and per-path versions move into the files (ADVENTURE-BOOK-PLAN.md §14).
- **Branch file:** `branches/the-reading.yaml` declares its paths (`path.the-reading-succeeds`, `path.the-reading-is-stopped`), its origin and its convergence.
- **Event files** gain `variesBy` (8 events), `onPaths` (The Manor) and `variants` (16 versions). Each version has a `key` and `when`, plus optional `summary`, `synopsis`, `leadsTo` and `links`. An absent field is inherited; a present one replaces, even when empty.
- **The book** gets "If The Reading…" sections on event pages, a Branches appendix with a page per branch, and `:::branch{when=path.…}` for path-specific notes inside the prose (labelled from the branch file and checked by the validator).
- **Merge** (`adventure/scripts/merge-branches.mjs`, writes staging only):
  - applies the 4 waiting per-path fixes: Revolutionaries ×2, Witness Me (Stopped) and Eclipse (Stopped);
  - drops 4 links whose "replaces links" switch was off, per the user's ruling (The Manor / Succeeds: Uldren, Vara; Revolutionaries / Stopped: Miriel, Dawn Charter).

| Where | Change |
|---|---|
| Models: `PathSet` (`ICanonEntity`); `NarrativePath`, `PathSetContext`, `PathEventScope`, `NarrativeEventVariantParticipation`, `NarrativeEventOverride` (+ `Key`), `EventOverridePath`, `EventOverrideConnection`, `EventOverrideEntityLink` | No longer tables. A path's app id is its canonical id. A version's id is derived from its event and key, and its connections and links from what they connect. |
| `CanonNarrativeLists`, `CanonEntityMapping`, `CanonStore`, `CanonRefs`, `CanonMapping`, `CanonAutoLink`, `CanonController` | New field kinds: RefList, Paths, Variants. New kind `branch`. Stale-reference checks know declared path ids. |
| `server/Services/NarrativeBranches.cs` (new) and the nine path / version controllers | Same routes and shapes as before, scoped to the active campaign. Edits save the owning file. Deleting a path or branch leaves references flagged, never rewritten. |
| `CanonLinks`, `Program.cs`, migration `CanonBranchStore`, `docker-compose.yml` | Guard: every path, version (shape), participation and scope row is in the files. Backfill from `Canon__BranchLinkMapPath`. EF's guessed `OriginEventId → CanonId` rename was replaced with drop plus add. |
| Client: `app.store.ts`, `types.ts` | A version's connections and links are replaced by their old id, and are removed with their version. |
| Book: `schemas.mjs`, `registry.mjs` (paths indexed as entries), `[section]/[slug].astro`, `remark-colony.mjs`, `validate.mjs`, `astro.config.mjs` | As described above. |

**Verification so far:**
- **Tests:** server 87 of 87 (new `CanonBranchTests`). All content, including the staged files, survives an unchanged app save byte for byte. Client 230 of 230.
- **Book:** the scratch build validates (238 entries, 17,030 links).
- **Rehearsal (database and content copies):**
  - The guard passed, and 1 path set was linked.
  - 7,947 values were compared; 13 differ, all intended: the 4 dropped links, the 4 fixed per-path texts, and list order.
  - A full write round trip through every endpoint left the content byte-identical.
  - Status is clean.
- **Live (approved by the user after the classifier paused it):**
  - Backup: `colony-data/colony.db.bak-pre-branches-20261118094530`.
  - Staging was re-run against the live database (unchanged) and archived to `colony-data/canon-switch-archive/staging/branches/`.
  - Migration applied and 1 path set linked.
  - Live equals the rehearsal: 7,943 values compared, 0 differences.
  - Status: 234 files, nothing missing or stale.
  - The book rebuilt and validated (238 entries; the privacy scan is clean).
  - The Narrative page has no console errors.

## 2026-11-18: World Conditions and character relationships into files (live)

World Conditions and character relationships are now canonical (ADVENTURE-BOOK-PLAN.md §15).
- **World Conditions:** `adventure/src/content/conditions/*.yaml` (36).
  - Each has `rule`, `otherwise`, `stress` (absent = 0), `requires`, `variesBy` and `start.established` (absent = true).
  - Requirements and "varies by" keep the app's structure (`kind`, `assetId`, `factionId`, …), with canonical ids; `""` still means "no one" / "no faction".
  - Sort order stays in the row, and so do the Events that establish or end a condition (play data).
- **Relationships:** each character's are `relationships:` in its own file (27 in 17 files): `to`, `type`, `summary`, `state` (absent = Active), `visibility` (absent = GMOnly).

| Where | Change |
|---|---|
| `server/Models/WorldCondition.cs` (`ICanonEntity`), `Character.cs` (`RelationshipsJson`), `CharacterRelationship.cs` | A relationship is no longer a table. Its id is derived from the character, the other character and the type. |
| `server/Services/Canon/CanonConditionJson.cs`, `CanonCharacterRelations.cs` (new) | Translation between the files and the app's JSON. Unchanged lists keep their nodes. |
| `CanonEntityMapping`, `CanonCharacterMapping`, `CanonStore`, `CanonRefs`, `CanonMapping`, `CanonAutoLink`, `CanonController`, `AppDbContext` | New kind `condition`, and `relationships` on characters. A condition back at the defaults loses `start:`. |
| `WorldConditionsController`, `CharacterRelationshipsController`, `CampaignsController` | Conditions are updated on the loaded record. Relationships are edited in the character's file; a duplicate (same other character and type) is refused. |
| `CanonLinks`, `Program.cs`, migration `CanonConditionStore`, `docker-compose.yml` | Guard: every condition row has its file, and every relationship row is in its character's file. Backfill from `Canon__ConditionLinkMapPath`. EF's guessed `VariesByJson → CanonId` rename was replaced with drop plus add. |
| Client: `character-detail.component.ts`, `types.ts` | An edited relationship is replaced by its old id. |
| Book: `schemas.mjs`, `registry.mjs`, `[section]/[slug].astro`, `astro.config.mjs` | New World Conditions appendix: each page gives the rule, the requirements as sentences, and a table for "varies by". Entity pages list the conditions that use them. NPC pages show relationships, and who names them in theirs. |
| `adventure/scripts/merge-conditions.mjs` (new) | Read-only merge into `staging/conditions/`. Relationships are inserted as a block, so each character file keeps its exact text. |

**Verification:**
- **Tests:** server 89 of 89 (new `CanonConditionTests`). Every live and staged file survives an unchanged app save byte for byte. Client 230 of 230.
- **Book:** the scratch build validates (274 entries, 19,780 links), and the privacy scan is clean.
- **Rehearsal:**
  - 36 conditions linked. 8,797 values compared; 1 differs: Gressa's "Daughter" relationship summary was `""` and is now absent. Empty text isn't stored in the files.
  - A write round trip (edit, revert, create and delete a condition; add, retype and delete a relationship) left the content byte-identical.
  - Status is clean.
- **Live:**
  - Backup: `colony-data/colony.db.bak-pre-conditions-20261118101301`.
  - Staging was re-checked against the live database and archived to `colony-data/canon-switch-archive/staging/conditions/`.
  - Live equals the rehearsal: 0 differences, 270 files, nothing missing or stale.
  - The book rebuilt (274 entries). The World Conditions page and Celia's relationships show in the app, with no console errors.
- **Noticed:** during the work the `colony-tracker-api` container disappeared, after a Docker restart outside this session. It was restarted from its existing image (`--no-build`, the branching version) before the baseline was taken, so nothing ran against the database early.

## 2026-11-18: Ruling: overrides are play data

The user ruled that relationship overrides (manual score adjustments between factions) and other manual adjustments are play tuning, not authoring. They stay in the database and are not moved into canonical files.

## 2026-11-18: Clean-up after the switches

- **Plan:** ADVENTURE-BOOK-PLAN.md §13 is rewritten as done, and §14 (branching) and §15 (World Conditions, relationships) are new, so the references in the code lead somewhere.
- **Migration map:** three narrative rulings are now concepts, all `migrated`: `narrative.observer-timing`, `narrative.final-reading` and `narrative.sheep-observation` (7 concepts in all).
- **The Reading's outcome blocks** name their paths:
  - `:::branch[Vara chooses to stop]{when=path.the-reading-is-stopped}`;
  - the same for the Party stopping the Reading against her choice;
  - `::::branch{when=path.the-reading-succeeds}` (its label was redundant).
  - They render "If The Reading is Stopped: …" and "If The Reading Succeeds". The Calling's yes/no blocks are in-scene choices and were left alone. A copy of the earlier file is in the session scratchpad.
- **`merge-narrative.mjs`** now refuses to run after the switch, like the other merge scripts.
- **Historical records:** `sources/narrative-outline.yaml` and `sources/narrative-canon-check.yaml` are marked as historical (edit the content files instead).
- **Deleted placeholder files** (their migrations were applied long ago): `server/Models/CampaignPath.cs`, `NarrativeEventPathVariant.cs`, `server/Controllers/CampaignPathsController.cs`, `NarrativeEventVariantsController.cs`.
- **Cleared** `adventure/staging/{narrative,branches,conditions}`. The archived copies under `colony-data/canon-switch-archive/staging/` were checked identical first; the only differences were iCloud duplicates inside staging.
- **Left as the user asked:**
  - the database backups (24 files);
  - iCloud's duplicate files;
  - the Flow board's Encounter badge (the user will do it).
- **Checks:** server 89 of 89; the book builds and validates (274 entries, 7 migration concepts), and the privacy scan is clean.

## 2026-11-18: The Confluence and Totality are events only

- **User ruling:** The Confluence and Totality are narrative events, not encounters.
- **Removed through the API** (`DELETE /api/narrative/events/{id}`, which also deletes the file): the two encounters the narrative merge had created for them. Both were stubs, with no text and no connections.
  - The Confluence — Faction Pileup (`encounter.the-confluence`)
  - Totality — Race Against the Eclipse (`encounter.totality`)
- **Nothing else referred to them.** Status after: 16 encounters, 17 events, nothing missing or stale. The book validates (272 entries).
- **Records updated:** ADVENTURE-BOOK-PLAN.md §13 has the ruling, and `sources/narrative-outline.yaml` notes it.

## 2026-11-18: Editing in the book (§16)

An in-browser editor in the book, with create, edit and delete. Saves go through the API into the same source files the app reads (user ruling: edits can come from anywhere, as long as they update the one source).

| Where | Change |
|---|---|
| `server/Services/Canon/CanonStore.cs` | `ResolveContent`, `ReadFile`, `WriteFile`, `DeleteFile`, `NewFile`: path checks, schema validation for every entry type, an app-readability check for app kinds, id rules (prefix; no change; unique on create), version check, atomic write. |
| `server/Controllers/ContentController.cs` (new) | `GET/PUT/DELETE /api/content/file`, `POST /api/content/new`. A delete of an app-tracked entry removes its rows in every campaign (and its session links, for events and threads). |
| `server/Program.cs` | CORS also allows the book's own ports (4321-4323). |
| `adventure/src/components/overrides/PageTitle.astro` (new), `astro.config.mjs` | The toolbar (Edit / New / Delete), hidden unless the API answers. |
| `adventure/src/editor/toolbar.js`, `editor.js` (new) | The editor: CodeMirror, two panes, autocomplete, checks before saving, waiting for the rebuild, build errors shown. |
| `adventure/src/lib/markup.mjs` (new) | The markup vocabulary and parser, split out of remark-colony so the browser checks are the build's (remark-colony re-exports them). |
| `adventure/src/pages/rp-index.json.js` (new) | Every entry's id, name, type, file and URL, for autocomplete, link checks and finding a new entry's page. |
| `adventure/src/schemas.mjs`, `[section]/[slug].astro`, `[section]/index.astro` | `rpSource` and `rpNew` page metadata. |
| `adventure/scripts/serve.mjs` | `/docs/__build`: whether a build that started after a save has finished, and its errors. |
| `adventure/package.json` | `codemirror` 6.0.2, `@codemirror/lang-markdown` 6.5.2, `@codemirror/lang-yaml` 6.1.3, `@codemirror/autocomplete` 6.20.4, `@codemirror/view` 6.43.15, `@codemirror/state` 6.7.6 (exact versions, public registry). |

**Verification:**
- **Server tests:** 96 of 96. New `ContentEditorTests`: a book edit is what the app reads; a stale version is refused; path checks; invalid YAML, a schema error and a changed id are refused (nothing written); new ids and pages; deleting a book-only file; deleting an app entry removes its rows.
- **Book:** builds and validates; the privacy scan is clean.
- **Browser, through the running app:**
  - The toolbar appears and the editor opens with two panes.
  - An unknown `:::block` is refused before saving.
  - A new rule without `version` is refused by the schema, then created once it's fixed.
  - Deleting through the toolbar removed the file.
  - Everything was restored afterwards: "How to Use" byte for byte, and the test rule deleted.
- **The full loop, verified after the restart (on Node 24):** a save rebuilt the book (`/docs/__build` reported it) and the reloaded page showed the edit, with the editor closed. A new rule opened at its new page once created. Deleting returned to the index. All test content was put back.
  - The only console error was the expected 400 from the deliberate schema refusal.

## 2026-11-18: Fixes from the first real save in the book

- **`adventure/scripts/serve.mjs`:** `/docs/__build` crashed the book server ("Cannot access 'status' before initialization"). The request handler declares its own `status`. The build status object is now `buildStatus`.
- **`tools/dev.mjs`:** the Node check accepted 22.22.3 (the Angular CLI's minimum), but Astro needs 22.23.4+. So `npm start` could run on a Node that can't build the book, and every rebuild failed at once; that was the earlier "book stopped rebuilding". It now requires 22.23.4+ or 24.15+ and says to run `nvm use` (the repo's `.nvmrc` says 24).

## 2026-11-18: Book structure approved; coverage inventory

- **`BOOK-STRUCTURE.md`** (new), revision 2, approved by the user.
  - Six Parts, page templates, the ownership contract, the five readiness measures and the tooling the structure needs.
  - The decisions are settled, from the planning agent's review.
  - Kept against that review, per the user's 2026-11-18 rulings: The Observer ends Act II (`narrative.observer-timing`), and The Confluence and Totality stay events that carry the procedures of Encounters #11 and #12.
- **Coverage inventory** (BOOK-STRUCTURE.md §8):
  - `adventure/scripts/coverage-inventory.mjs` (new) generates `adventure/sources/coverage.yaml`.
  - **Sections:** 352 across the 13 source documents; subheadings are grouped under the section that owns them; 0 are unclassified.
  - **Homes** come from names in the headings, then a rule table pointing at the planned pages, then provenance. Citations are recorded as `citedBy`, and seeded `dependsOn` entries cover foreshadowing.
  - **Status:** migrated only when a reconciled concept covers the section itself.
  - **Edited rows:** a row marked `confirmed: true` survives regeneration.
- **Designer build:** a Coverage inventory page (by document, by destination, every section with its home and status).
- **Validator:** every home must be an entry or a planned page.
- **Gaps found** (planned pages with no source material): Character Progression and Rewards; Geography and Districts; Civic Institutions; Who's Who; and The Seven Components of Identity (thin).

## 2026-11-18: First chapter drafts (Act I overview, The Calling, The House of Abiding)

- **Pages written:**
  - The Act I overview (`docs/act-1/index.md`, template 3.1): the act in brief, its questions, GM truths, Vara's Trust spine, routes with their availability and the convergence choice, what changes, and pacing.
  - **The Calling** (template 3.2): Perrik's records as a table of five anomalies, two read-alouds, and the bells with the resting stroke. It ends as the crowd moves to the House.
  - **The House of Abiding:** meeting Vara and Uldren, the bad map, and Trust 1 as a branch, with the session's Required Change.
  - Vara's meeting moved from The Calling to The House of Abiding (one fact, one place).
  - Both events' readiness: `compiled`.
- **Canon check:** an independent reviewer compared the drafts with the sources. Its fixes are applied:
  - "Debts without debtors" was described backwards (a debt with no creditor); it now means a debt no one can be named as owing.
  - The eclipse gaps are the Registry's historical records, at irregular intervals, not Perrik's own yearly reconciliations (he is approaching his first Reading).
  - Perrik's knowledge is no longer limited beyond what his brief says.
  - The Lord-Mayor *office* exists; the forgotten person is the one who held it.
  - The Manor no longer appears in Session 1; that discovery belongs to Session 5.
  - The House of Abiding synopsis: Vara *asks* to come; it no longer says she invites the Party.
  - Restored: the Required Change, the "Hats" objection and Vara as an apparent orphan.
  - The "no" branch follows her brief: being refused "for her own protection" angers her.
  - The overview: Trust 2's "she believes she has always owned it"; Trust 3's refusal rule; the route availability conditions; Dawn against Serevan as the side choice; the emotional progression without inventing a session mapping.
- **Open for the user** (listed in each page's designer note):
  - the arrival hook ("UFO mission order" is undefined);
  - Perrik's timeline (years on the records against his first Reading);
  - seeding Pépé Sylvya through the Lord-Mayor file;
  - which district the bad map shows;
  - two stale entity facts: Perrik's note "personal name remains undecided", and the Manor's summary "Abandoned manor" (the sources say maintained and occupied).
- **Checks:** validator passes, the GM build shows no designer content, and no references are missing.

## 2026-11-18: Rulings on the first drafts

- **The arrival:** Darkwing comes under a **UFO mission order** (to be expanded later). The Calling's Opening State now says so, with the initial intelligence from the Synopsis: Aspis influence, suspicious disappearances, cult activity, an unusually secretive Keeper order.
- **Perrik's timeline:** he has been in the Colony **less than eighteen months**, between Marek Cairn's Reading and Vara's Calling.
  - The eclipse gaps he shows are in the Registry's historical records, and this Calling is the first he has seen.
  - `npcs/perrik-tallow.md` Overview: "He has spent years…" became "Since arriving, less than eighteen months ago, he has been trying…".
- **No Lord-Mayor line:** too on the nose. The unrecognised signatures stay anonymous.
- **The bad map:** the slums are in **Abiding Way**, the same district as the House of Abiding.
- **Stale data:** removed "personal name remains undecided" from Perrik Tallow and Silas Venn. The user expects more stale notes like these; fix them as they turn up.
- **The Manor, "abandoned" and recently lived in:** intentional, a clue to the Observer. Left as it is.
- **Checks:** validator passes; the round-trip test passes; the app reads both characters.

## 2026-11-18: Lean Part I and the first rule entries

- **Part I pages (new):**
  - `docs/running/campaign-at-a-glance.md`: premise, the kind of campaign, the Colony, the three acts, the shape of the ending.
  - `docs/running/gm-truths.md`: the First Law, the Book, Aletheia, the Calling and the Reading, the inversion, the eclipse, the Forgotten and the Veiled; Vara and Marek and the Observer as secrets; The Light Remains, never defined.
  - `docs/running/veiled-primer.md`: the Veiled at the table, step by step through an Incursion, linking to the rules.
- **Rule entries (new; version 1, draft):** `rule.sources-and-resonance`, `rule.class`, `rule.active-sources`, `rule.dispersal`, `rule.stabilization-window`, `rule.source-transfer`, `rule.source-destruction`, `rule.containment`. These are the universal mechanics Bad Maps uses (Encounters §1, "Systems Established"). The Class formulas match `veiled.mjs`; "Stability Threshold" is used throughout.
- **How they were made:** a writing agent drafted the rules and the primer, the narrative pages were written directly, and an independent canon check reviewed all eleven files. Its 21 fixes are applied, among them:
  - Restore and Anchor are possible in Act I, on the A Life route.
  - Rupture moves the Weight and doesn't close the Window.
  - The movement exception.
  - Reflected damage applies in full only to a non-creature Vessel.
  - A Scar's universal defaults versus its site-specific numbers.
  - Containment's severing is the Order's procedure, not a universal rule.
  - "Never define *the light remains*" added as GM guidance.
- **Open (in the entries' `design:` fields):**
  - whether a Reconstruction Condition restored after the threshold was crossed reconstructs at once or opens a fresh Window;
  - what happens to a manifested Incursion when its Weight becomes a Scar.
- **Defaults taken where the sources imply but don't state them:** the Spill radius equals the Rupture radius; a hands-on Reposition counts as direct contact; sufficient Capacity means Capacity ≥ Class; transfer checks use the Source DC.
- **Needed when Bad Maps is written:**
  - the cloth toy's Source stats (the worked example's Source Level 15 is odd for a first encounter);
  - Tantrum (encounter-specific);
  - Gressa's Reconstruction Condition as a living Source;
  - rule entries for the Echo and the Restoration paths;
  - the Capacity of the Order's portable vessel.
- **Checks:** validator passes (280 entries); the GM build shows no designer content and no missing references. The coverage inventory was regenerated: 84 sections in progress.

## 2026-11-18: Sidebar labels without "Part" prefixes

- **`adventure/astro.config.mjs`:** the sidebar group labels are now the chapter pages' own titles ("Running Results Pending", "Act I — The Secret", …). The generated "Part I — …" prefixes are gone (user, 2026-11-18). The Parts remain the book's organising idea in BOOK-STRUCTURE.md; they just aren't shown in the navigation.

## 2026-11-18: Separate names for a chapter's sidebar group and its page

- **The three names a chapter page can have:**
  - its `title` (the page heading);
  - `chapter.label`, the sidebar group's name (new, optional);
  - `sidebar.label`, the page's own entry inside the group (Starlight's).

  Both labels default to the title, so nothing changes until one is set.
- **Files:** `src/schemas.mjs` (`chapterMeta.chapter.label`), `src/lib/registry.mjs` (`loadChapters` returns `label` and `pageLabel`), and `astro.config.mjs` (uses them). JSON schemas regenerated; validator passes.

## 2026-11-18: The whole book structure, stubbed and navigable

Every page of the approved structure (BOOK-STRUCTURE.md §1) now exists. A new page is a stub: a title, "not written yet", and a designer note with what it covers and its main sources.

- **Running Results Pending:** the 7 missing pages, in order (Reading and Branches, Seven Components, Colony Turn, Faction Operations, Running the Game, Progression and Rewards, Promises and Threads).
- **The Colony** (new chapter `docs/setting/`, `chapter.the-colony`, between Running and Act I): History, Geography and Districts, Everyday Life and Traditions, The Factions, Civic Institutions, Who's Who. Chapter order: Running 0, The Colony 1, Acts 2–4.
- **Act II:** a Resources section (arrangement `reference`) listing the Clearing House location.
- **Act III:** The Burden's four phase pages (`docs/act-3/the-burden-phase-1…4.md`, `partOf: encounter.the-burden`), grouped under the encounter in the sidebar (Overview, then the phases). The Light Remains opens with a named "The Final Reading" section.
- **Reference** (was "Appendices"), in the approved order:
  - Bestiary, Veiled Sources, Hazards, Items and Treasure;
  - NPCs, Factions, Faction Goals, Assets, Locations;
  - World Conditions, Narrative Threads, Branches;
  - Rules Reference, Maps, Handouts and Props;
  - Glossary and Quick Reference (stub pages in `docs/reference/`).
- **Designer area:** Readiness, Open decisions, Fabrication and Playtest log (stub pages). Stale references and Unplaced events moved here from the GM navigation.

**Tooling:**
- **Schema:** chapter sections may list other `entries`; a fifth arrangement, `reference`; `partOf` on book pages. New book-only types `hazard` and `map` (`hazards/`, `maps/`); empty folders for `items/` and `handouts/` (each has an ignored `_about.md`). The locations index is titled "Locations" (its web address stays `/gazetteer/`). Handouts get an index page.
- **Sidebar:** section labels show their arrangement ("(alternatives)", "(any order)", "(at the same time)", "(throughout the act)"). `::chapter-contents` lists an item's own pages under it.
- **Editor:** `CanonStore.TypeOfFolder` covers `hazards` and `maps`.

**Checks:** validator passes (280 entries, 121 Markdown files); the GM build (the user's running book) and the designer build both pass, the designer build checking 35,452 internal links in 345 pages; server tests pass.

## 2026-11-18: Structural terms match Starlight (parts, chapters, sections)

The book used "chapter" for a top-level group and "section" for a sub-group. Starlight calls those a group and a sub-group, and its own UI uses "section" for a heading on a page ("Section titled …"). The terms are now:

- **part:** a top-level sidebar group and its docs folder (`running`, `setting`, `act-1`, `act-2`, `act-3`), id `part.<dir>`;
- **chapter:** a sub-group within a part (key, title, arrangement, optional `entries`);
- **item page:** an event's or encounter's page; an item can span several pages;
- **section:** a heading on a page;
- **area:** the URL's first segment (a part folder or an entry-type folder).

**Renamed:**
- **Frontmatter:** a part page's `chapter: {id: chapter.x, sections: […]}` is now `part: {id: part.x, chapters: […]}`. An event's or encounter's `chapter: chapter.act-N` / `section: <key>` is now `part: part.act-N` / `chapter: <key>`. A book page's `partOf` is now `belongsTo` (the Burden's phase pages). 38 content files.
- **Markup:** `::chapter-contents` is now `::part-contents`.
- **Code:** schema `chapterMeta` → `partMeta`; registry `CHAPTER` → `PART`, `loadChapters` → `loadParts`, `chapterSections` → `partChapters`, the entry types' `section` field → `area`; route folder `src/pages/[section]/` → `src/pages/[area]/`; `rp-index.json` lists `parts`; editor, validator, remark plugin, sidebar and designer pages follow.
- **Server:** `CanonStore.NarrativeKeys` orders `part, chapter, order`; one test fixture updated.
- **Migration map:** concept `chapter.act-1.the-reading` → `encounter.the-reading`.
- **Documents:** BOOK-STRUCTURE.md (adds a terms note) and ADVENTURE-BOOK-PLAN.md use the new terms.

Web addresses are unchanged. A backup of the content before the rename is in the session scratchpad (`pre-part-rename/`).

**Checks:** validator passes (280 entries, 121 Markdown files, 7 concepts); server tests pass (96); the running book rebuilt cleanly; the designer build checks 35,452 internal links in 345 pages, none broken.

## 2026-11-18: Every sidebar label can be overridden; chapters styled like pages

**Labels.** Each label defaults to the title; set one to override it:

| Sidebar entry | Override |
|---|---|
| A part (its group) | `part.label` on the part page |
| The part page's own link | `sidebar.label` on the part page (Starlight's) |
| A page in a general part (Running, The Colony) or in Reference (Glossary, Quick Reference) | `sidebar.label` on that page |
| A chapter | `label` on the chapter, used as written (default: the title plus its arrangement hint) |
| An event or encounter | `sidebar.label` on the item (default: its name) |
| The first link of an item with pages of its own (The Burden) | `sidebar.overviewLabel` on the item (default: "Overview") |
| An item's extra pages (the Burden phases) | `sidebar.label` on that page |

The generated index pages (Bestiary, NPCs, …) and the Designer links are labelled in the `appendices` and `designer` lists in `astro.config.mjs`.

**Styling.** A chapter's label (any sub-group in a part) now looks like a page link (same size, weight and colour). Parts keep Starlight's larger group heading. `src/styles/colony.css`.

**Files:** `src/schemas.mjs` (chapter `label`; event and encounter `sidebar: {label, overviewLabel}`, book only), `astro.config.mjs`, `src/styles/colony.css`, `server/Services/Canon/CanonStore.cs` (`sidebar` added to the narrative key order, after `order`). JSON schemas regenerated; API container rebuilt.

**Checks:** validator passes; server tests pass (96); a live test set a chapter label, an item label and an overview label, saw all three in the rebuilt sidebar, then restored both files.

## 2026-11-18: Narrative threads in the right sidebar

An event's or encounter's page now has a **Narrative threads** section under "On this page", linking to each thread the item is on. A thread counts when a connection carrying it leads into or out of the item (including its variants' connections), or when the item links to it. The Burden's phase pages show The Burden's threads. Pages that aren't about an event or encounter show no section; so would an item on no thread (none today: all 33 have at least one). A thread with a `color` gets a matching dot.

The section is in the desktop right sidebar only; on narrow screens Starlight folds "On this page" into a dropdown, and the threads stay listed in the page's own Leads to / Led from lines.

- **Files:** `src/components/overrides/PageSidebar.astro` (new; Starlight's sidebar, then the threads), `astro.config.mjs` (registers it), `src/lib/registry.mjs` (`threadsOf`), `src/schemas.mjs` (`rpEntity`: the entry a generated page shows), `src/pages/[area]/[slug].astro` (passes it). JSON schemas regenerated.
- **Checks:** validator passes; the running book rebuilt; The Calling shows Pépé Sylvya and The Keeper, The Burden and its phase pages show its six threads, Running and part pages show none; the designer build checks 35,554 internal links in 345 pages.
