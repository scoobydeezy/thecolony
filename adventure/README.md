# Results Pending — adventure book

The canonical campaign content and the GM's book, served at `/docs/`. Design and decisions: `../ADVENTURE-BOOK-PLAN.md`. Change log: `../ADVENTURE-BOOK-CHANGES.md`.

Node 24 (`nvm use` reads `../.nvmrc`). Astro 7.4 needs Node 22.23.4 or later.

## Commands

| | |
|---|---|
| `npm run serve` | **With the app.** Builds the GM book, serves it on port 4321 (proxied by `ng serve` at http://localhost:4200/docs/) and rebuilds on every save. Search works. |
| `npm run dev` | **Writing.** Live-reload GM book on its own port, http://localhost:4322/docs/. No search, and "← Colony" goes to `localhost:4200`. |
| `npm run dev:designer` | Designer book (source docs, notes, migration status) at http://localhost:4323/docs/ |
| `npm run build` | GM build to `dist/`, then link validation and privacy scan. Fails on any problem. |
| `npm run build:designer` | Designer build to `dist-designer/` (local only, never deployed) |
| `npm run check` | Book content and reference validation (fast; no build output required) |
| `npm run check -- --sources` | Also verify migration provenance and citations against the original exports; set `COLONY_SOURCE_DOCS_DIR` first. |
| `npm run schema` | Regenerate JSON Schemas in `schemas/` |

**Why `serve` rather than `dev` behind the app:** Astro's dev server loads Starlight's scripts and styles from root paths (`/node_modules/…`, `/src/…`) instead of under `/docs/`. Through the app's proxy, those requests reach Angular, which breaks search and the menus. `serve` always serves real built pages, so it also never shows a stale cross-reference.

## Original documents during migration

The twelve current Markdown exports are read-only migration evidence. **Campaign Synopsis is retired into Campaign Vision and Campaign Outline** (user, 2026-11-18). Recover accepted decisions and missing context from campaign chats without reviving superseded proposals; record evidence and open questions in `sources/`. The finished book supersedes the originals.

Set `COLONY_SOURCE_DOCS_DIR` to the exports folder for the designer's source views and explicit provenance checks. Relative paths resolve from `adventure/`; without the variable, the legacy two-level parent location is used. On this Windows checkout:

```powershell
$env:COLONY_SOURCE_DOCS_DIR = 'C:\Users\scoob\Documents\ChatGPT\The Colony'
npm run check -- --sources
```

The GM build checks the book's own references without needing the old exports. `--sources` adds the migration-only checks and fails if the exports are unavailable. It does not change or synchronize the originals.

## Where things go

- `src/content/docs/`: chapters (`.md`). Parts are folders, and `sidebar.order` sets the order.
- `src/content/<type>/`: canonical entities, one file each. Use `.yaml` for data, or `.md` with frontmatter for anything with rules text.
  - Types: `creatures`, `npcs`, `locations`, `rules`, `veiled-sources`, `items`, `inventory`, `revelations`, `clocks`, `handouts`.
- `sources/migration-map.yaml`: which source-document sections have moved into which concepts.
- `sources/remaining-reconciliation.yaml`: per-scene chat lookups, retrieval limits and reviewed source ranges for the remaining campaign draft. See the repository’s `MIGRATION-REVIEW.md` for provisional decisions and preparation still required.

**IDs** are `<type>.<kebab-name>`, set in frontmatter. They're permanent and never reused. To rename a page, change `slug` and add the old one to `previousSlugs`.

**Ownership:** an entity owns what it mechanically does; an encounter chapter owns how the scenario works. Never put scenario-specific text in a stat block.

**Characters are shared with the app.** Every character the Colony app knows is a file in `src/content/npcs/` or `pcs/`: identity, profile and detail sections, and the simulation's starting values (`start:`). The app reads and saves these same files through its API, so an edit in either place is the only copy.

**So are factions, Assets and locations** (`src/content/factions/`, `assets/`, `locations/`, as `.yaml`). Files refer to each other by canonical ID (`start.faction: faction.order-of-theia`), never by app ID; the app maps those to its own rows per campaign, and `npm run check` fails on a reference that doesn't resolve.
- Edit by hand or in the app. The app refuses to overwrite a file that changed since it loaded it, and validates every save against `schemas/`.
- What the app owns in a file: identity fields, `start:`, and the `##` sections. What it never touches: `title`, `status`, `provenance`, `design` and anything else it doesn't know about.
- What happens in play (events, current state, which sections were revealed) stays in the app's database.

**People with stat blocks:** the NPC entry (`npcs/`) owns identity: `name`, `title`, `ancestry`, `role`. The stat block (`creatures/`) owns mechanics and links to the person with `npc:`. That link is stored only there.
- A linked stat block has **no `name`** and **no ancestry trait**. Both come from the NPC entry, so it shows as "Captain Kelda Varruk … Medium Dwarf Humanoid".
- If a person has more than one stat block, give each a `variant:` label.
- The NPC page lists its stat blocks automatically, and each stat block links back to the NPC page.
- The build fails if any of these rules is broken, and entity schemas reject unknown fields, so a typo like `acc:` fails too.

## Markup

```md
:::read-aloud            (also: player-facing, secret, gm-note, design, branch[Label])
Text…
:::

::clock[Book of Names: ritual pages]{segments=12 note="…"}
::embed{#rule.book.keeper-bound-handling}

:ref[Kelda]{#npc.kelda-varruk}
:stat{#source.book-of-names key=backlash}          → DC 39 basic Will, 5d12 mental
:cite[Encounters §5]{doc=encounters anchor=5-the-reading--ritual-chamber}   (designer build only)
```

- `:::design` blocks and `design:` frontmatter never appear in the GM build.
- Setting directories read their facts from the entity entries: `::directory{type=location}`, `::directory{type=faction}`, and `::directory{type=npc group=faction}` or `group=location`. They show the campaign baseline, including Forgotten characters, not live availability.
- Nest blocks by using a longer outer fence (`::::branch` … `::::`).
- `:stat` keys: `class`, `source-level`, `source-dc`, `backlash`, `backlash-damage`, `stability-threshold`, `ward-hp`, `active-bulk-minimum`, `rupture-radius`.
- Never type a Veiled value by hand. Use `:stat`.

## Player-only handout downloads

Each player handout links to `/docs/player-handouts/<slug>.md`. The export includes only explicit top-level `:::player-facing` blocks. Nested directives are rejected so private blocks and GM reference expansion cannot enter a download. Tables and record notation remain Markdown. Surrounding GM notes, frontmatter, navigation and the sealed solution stay out of the export. Share the downloaded file, not the GM handout page.

Run `node --test scripts/directory.test.mjs scripts/player-handout.test.mjs` for the directory ownership and export-boundary checks. Normal GM builds also run the existing link validator and privacy scan. These checks do not establish encounter balance or replace a physical playtest.
