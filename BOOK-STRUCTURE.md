# Results Pending: book structure, page templates and ownership

**Status:** revision 2, approved by the user (2026-11-18), after the planning agent's review. The open decisions are settled (§9). Two review points conflicted with the user's rulings of 2026-11-18; the rulings stand and are explained in §9. Nothing has been built or migrated yet.

**Contents:**
1. The table of contents
2. Navigation versus chronology
3. Page templates
4. The ownership contract
5. Readiness: five separate measures
6. What the structure needs from the tooling
7. Existing migrations to keep
8. After approval: the coverage inventory
9. Decisions (settled)

**Working method (agreed 2026-11-18):**
1. Fix this structure first.
2. Index every heading of the 13 source documents against it (the coverage inventory, §8).
3. Then write the adventure chapter by chapter. Reconcile each chapter's sources as it is written, and bring in its rules, creatures and characters as it needs them.
4. Don't bulk-migrate any source document ahead of the chapters.

**How it relates to what exists:** the book already has the part pages, the 33 events and encounters, and the chapters that place them. It also has entry types for characters, factions, Assets, locations, goals, World Conditions, threads, branches, rules, creatures, Veiled Sources, inventory, revelations, clocks and handouts, and it has an in-browser editor. This document decides what the finished book contains, and where each kind of content lives.

**Terms (Starlight's):** a *part* is a top-level sidebar group and its docs folder; a *chapter* is a sub-group within a part; an *item page* is an event's or encounter's page (an item can span several pages, joined by `belongsTo`); a *section* is a heading on a page.

---

## 1. The table of contents

The published book has six Parts. A Part is a hierarchy, not a file plan:
- one page can cover several items (The Calling and The House of Abiding could share a page);
- one item can span several pages (The Burden's four phases).

The designer tools sit outside the table of contents (section 1.7).

### Part I — Running Results Pending (the GM's handbook)

Authored pages in `docs/running/`. They explain; the rules they mention link to rule entries (Part VI), and are never restated.

| Page | Covers | Main sources |
|---|---|---|
| How to Use This Book | Layout, markup legend (read-aloud, GM note, branch addenda), the reference drawer, what the app does | (exists) |
| The Campaign at a Glance | Premise, the Colony's secret, the central question, the three acts, the shape of the ending | Campaign Vision; Campaign Synopsis; Campaign Outline: Campaign Premise, Foundational Narrative Truths; Foundational Truths |
| GM Truths | What the GM knows that no one at the table does: the First Law, the Book of Names, Aletheia, the Reading, the Eclipse, the Forgotten | Foundational Truths; Campaign Outline: Foundational Narrative Truths |
| The Reading and Its Branches | How the Act I climax splits the campaign (stopped / succeeds), what each path changes, how paths are marked in this book | Campaign Outline: If the Reading Is Stopped / Succeeds, The Shared Endgame; `branch.the-reading` |
| The Seven Components of Identity | Name, Relationship, Form, Context, Pattern, Choice, Memory: what each is, how it is restored, where each is taught | Campaign Outline: The Seven Components of Identity; The Veiled: Identity as Meaning, Recovering Identity |
| The Veiled: A Practical Primer | The mnemonic cycle, Sources, Class, Dispersal, the Stabilization Window, Restore / Anchor, in table terms; links to every rule entry | The Veiled (player-facing vocabulary and the GM-facing core) |
| The Colony Turn | How factions act between sessions; goals, Momentum, the Character Phase; what the app does for you | Faction Goals II–III; the app's rules |
| Faction Operations and the Act III Fronts | Running faction goals at the table; how the five fronts work in Act III | Faction Goals I, IV |
| Running Investigations, Relationships and Consequences | Session design, NPC play, props, clues that persist, consequences that continue | GM Design Guide; Campaign Vision: Design Principles |
| Character Progression and Rewards | Levels by act, rewards, Keystones as rewards | Gap: no single source; to be written (see §9) |
| Promises and Threads | The campaign-wide promises (the cloth toy, the missing father, Old Town and Sunny, …) and where each pays off | Campaign Outline: Campaign-Wide Promises and Narrative Threads; the thread entries |

### Part II — The Colony (the gazetteer)

Authored overview pages in `docs/setting/`. They are prose about the place, linking to the entity entries, which hold the facts.

| Page | Covers | Main sources |
|---|---|---|
| History of the Colony | The First Keeper, the founding, the Answer that forgot its question | Foundational Truths |
| Geography and Districts | The districts and their character; a map; links to every location | Location entries; maps |
| Everyday Life and Traditions | Customs, the Procession, traditions and empty spaces, the Colony's negative space | Foundational Truths: Traditions and Empty Spaces; Campaign Outline: The Colony's Negative Space |
| The Factions | The seven factions as a whole: what each is right and wrong about, how they see each other; links to each faction entry. The four social classes (Burdened, Civilians, Fractured, Heirs; also faction entries, of type SocialClass) are a separate section, not listed as factions | Foundational Truths: The Factions; Campaign Vision; faction entries |
| Civic Institutions | The Order, the Assembly, the Claims Registry, the Hall of Remembrance, EGRESS: what they do in daily life | Faction and Asset entries; Character Briefs |
| Who's Who | A short authored introduction to the social circles that matter, then a directory generated from the NPC entries (by faction and location) | NPC entries |

### Part III — Act I: The Secret

`docs/act-1/` (exists). The part page is an act overview (template 3.1), followed by its items. The chapters already in place:

| Chapter | Arrangement | Items |
|---|---|---|
| Arrival and the first Incursion | sequence | The Calling → The House of Abiding → Bad Maps → Prisoners |
| Session 3 investigations | alternatives (by Source state and the party's choices) | A Life (Witnesses) · Containment (EGRESS) · Duskwood (Cult) |
| Act I climax | sequence | An Opportunity → The Reading |

### Part IV — Act II: The Cost

`docs/act-2/` (exists).

| Chapter | Arrangement | Items |
|---|---|---|
| Opening | sequence | The Morning After → The Manor |
| The Manor routes | optional, any order (about two expected) | The Broken Bell / Old Town (Shattered) · The Thin Place / The Shape of Someone (Cult) · The Institute / Playing for Keeps (EGRESS) · The Way Out / Revolutionaries (Dawn) · The Veiled House / Witness Me (Witnesses) |
| Resources | reference | **New:** The Clearing House, the location entry (extended as a resource, template 3.6), listed here as an investigative resource available at any point in the act |
| Convergence | sequence | The Confluence → The Observer (ends the act). Per the user's ruling of 2026-11-18 (`narrative.observer-timing`): The Observer holds the whole reveal, in either order. If the Reading was stopped, the eclipse has already begun at the Confluence; if it succeeded, the Observer reveals himself and then the eclipse begins. |

### Part V — Act III: The Reckoning

`docs/act-3/` (exists).

| Chapter | Arrangement | Items |
|---|---|---|
| Catastrophe | sequence | Eclipse (the eclipse already under way, on both paths) → Totality |
| The five fronts | concurrent | Sunny (Shattered) · The Breach (EGRESS) · Milltown (Dawn) · The Tangled Web (Witnesses) · The Open Door (Cult) |
| Finale | sequence | **The Burden**, on several pages: an overview, then Phase I Wound: The Monument, Phase II Composite: The Borrowed First Keeper, Phase III Echo: Through Her Eyes, and Phase IV Chorus: The Succession. Each page has its own At the Table panel and the state handed on to the next phase. → Aletheia (who carries the Weight, and on what terms) → The Light Remains, which opens with **The Final Reading** as a named section (its own heading and anchor, listed on the part page; no separate app event). The Final Reading enacts the answer already given: no new test and no surprise failure. |

### Part VI — Reference (the GM appendices)

These are generated from the entries, never authored as separate copies. Most exist.

| Appendix | From | Status |
|---|---|---|
| Bestiary | creature entries | exists |
| Veiled Sources | source entries | exists |
| Hazards | **new** hazard entries | to add (see §6) |
| Items and Treasure | item entries (unique items, treasure by act) | type exists, no entries |
| NPCs · Factions · Faction Goals · Assets · Locations | the entries | exist |
| World Conditions · Narrative Threads · Branches | the entries | exist |
| Rules Reference | rule entries | exists (1 entry) |
| Maps | **new** map entries: artwork, grid, scale, orientation. The keyed-area descriptions belong to the location or encounter that uses the map | to add |
| Handouts and Props | handout and inventory entries (player-facing material, GM key). Each handout also produces a clean player-only export that can't include the GM key | types exist |
| Glossary | **new**: generated from the rule entries' definitions, plus `term` entries only for concepts that have no rule owner | to add |
| Quick Reference | an assembled page of embedded rules (the cards a GM keeps open) | to add |

### 1.7 Designer area (outside the table of contents; designer build only)

These pages are already designer-only, or would become so:
- Migration status (exists)
- Source documents (exists)
- **Readiness dashboard** (new; see §5)
- **Open decisions** (new)
- **Fabrication** (inventory production status)
- **Playtest log**
- Stale references and unplaced items. Both are maintenance views, so they would move here from the GM appendices.

---

## 2. Navigation versus chronology

- **Sessions are pacing, not structure.** The source documents' "Session 1 … Session 12" and "Week 1 … Week 12" become suggested pacing on the act overview page. They are never chapter boundaries.
- **A chapter's arrangement says how its items relate.** The order within a chapter is only presentation order. The book shows the arrangement on the part page, and should also show it in the sidebar label (for example "The Manor routes (any order)").
  - `sequence`: one after another.
  - `alternatives`: chosen by state and player choice; usually only some are played.
  - `optional`: independent, in any order.
  - `concurrent`: at the same time, each with its own deadline.
  - `reference`: resources available throughout an act (the Clearing House).
- **Path-dependent material is marked where it applies.** Whole versions are the item's `variants` ("If The Reading is Stopped"). Small differences are `:::branch{when=…}` addenda inside a section. A page reads as one text with clearly marked differences, never as two copies.
- **"Leads to" is causal, not navigational.** The connections an item stores describe what can follow; the sidebar describes where to find things. The two are allowed to differ.

---

## 3. Page templates

One framework, several specialized forms. Every page has the shared metadata: stable id, provenance, related entries (`links`), availability (part, chapter, branch), dependencies (the entries it requires), and readiness (§5). Readiness and production details appear only in the designer build. The GM-facing page contains only what helps run the game.

Each template below gives the **body skeleton** (the `##` headings, in order, all optional unless marked *required*) and what is **data** (frontmatter, edited in the app or the editor's YAML pane).

### 3.1 Act overview (the part page)
- **Data:** the part id and its chapters with their arrangements (exists).
- **Body:**
  - *The Act in Brief* (required)
  - The Act Question
  - The Relational Question
  - The Apparent Answer
  - GM Truths for this Act
  - Routes Through the Act
  - Promises Made and Kept
  - What Changes by the End
  - Suggested Pacing
  - `::part-contents` (required, generated)

### 3.2 Narrative event (scene)
- **Data:** name, summary, function, synopsis, `leadsTo`, `links`, `variesBy` / `variants` (exist).
- **Body:**
  - *Opening State* (required)
  - Read-Aloud (`:::read-aloud`), optional: some scenes are better opened through live NPC interaction
  - Who Is Here (rendered from the cast links)
  - The Scene: dialogue guidance, beats
  - Clues and Revelations (each a `:ref` to a revelation or record where it is reused)
  - Player Choices
  - Outcomes, with `:::branch` for choices and `:::branch{when=…}` for paths
  - *Possible Next Developments* (required): what can follow, under what conditions, or nothing immediately. For modular routes, not tied one-to-one to `leadsTo`.
- **An event that carries an encounter's procedures** (The Confluence, Encounters.md #11; Totality, #12; see §9) adds the encounter sections it needs after the scene: At the Table, Objective, NPC Objectives, Phases / Clocks, Resolution, If the Party Does Not Intervene.

### 3.3 Encounter
- **Data:** as for an event, plus `event:` (exists); the inventory and revelations it uses (exist).
- **Body:**
  - **At the Table** panel (required for complex encounters, those with phases, boards or decks): the objective, the moving parts, the essential rules, and the outcomes on one screen.
  - *Objective* (required)
  - Availability / Trigger: when the encounter becomes available or starts, and what sets it off
  - Setup and Map (embeds the map entry; keyed areas written here or in the location)
  - Opening State: what the players see
  - Rules in Play: `::embed` of the rule entries; encounter-specific procedures written here
  - Phases / Clocks / Boards
  - Player Leverage
  - NPC Objectives: what each side present is trying to do, independent of the party
  - The Opposition: `::embed` of the creature / Source / hazard entries, plus tactics for this encounter
  - *Resolution* (required)
  - Rewards
  - Consequences: per path where needed
  - If the Party Does Not Intervene: the delegated or unattended outcome. Essential for A Life, Containment and the five Act III fronts, where the party can't be everywhere.

### 3.4 NPC (character entry)
- **Data:** identity, role, ancestry / class / level, faction, location, start state, relationships (exist).
- **Body:** the 13 sections the NPC files already use (Overview, Narrative Role, Personality, Motivation, Fears, Blind Spot, Primary Protection, Pressure Response, Signature Quote, Signature Object, Performance Inspiration, Portrayal Notes, Relationship to the Party), plus:
  - What They Know: per act, and what they will reveal and when
  - How They Respond: dynamic responses to the party's choices and the Colony state
- **Major NPCs** get the full set. Minor NPCs use only the sections they have something for: never invent content to fill a heading.

### 3.5 Faction
- **Data:** the existing faction fields (tenets, right / wrong about, history, heraldry, start state).
- **Body:**
  - Overview
  - What They Want: rendered from the goal entries
  - Methods
  - Capabilities: rendered from the Assets they control
  - Members: rendered
  - At the Table: how to play the faction in a scene
  - How They Change Across the Acts

### 3.6 Location
- **Data:** type, parent, the Asset it stands for, marker colour, start state (exist).
- **Body:**
  - Description
  - Map: embedded map entry
  - Keyed Areas
  - Who Is Here
  - Discoveries
  - Treasure: links to item entries
  - Across the Acts: how it changes, with `:::branch{when=…}` where paths differ
- **As a resource** (the Clearing House): a location can add What the Party Can Learn, Access and Terms (an exchange can be a relationship, not a price) and Who Is There. It is then listed in an act's `reference` section.

### 3.7 Creature, hazard and Veiled Source
- **Data:** full PF2e statistics (exists for creatures, and for Sources as Class / Source Level); the hazard's statistics (new type).
- **Body:**
  - Description
  - Abilities: the mechanics, owned here
  - Tactics: in general; encounter-specific tactics belong in the encounter
  - Variants
  - Appears In: rendered from the encounters that embed it

### 3.8 Rule
- **Data:** version, `appliesTo` (exist).
- **Body:**
  - *Definition* (required)
  - *Procedure* (required: the exact steps)
  - Examples
  - Interactions
  - Where It Applies: rendered from `appliesTo` and the pages that embed it

### 3.9 Handout and prop
- **Data:** audience (players / GM, exists); availability: which item, from when; production specification (designer only).
- **Body:**
  - *Player-Facing* (required: the material itself, or its image)
  - GM Key
  - When It Is Given
  - Production: designer only
- **Player export:** a separate, player-only rendering (print / PDF) built from the Player-Facing section only, so the GM key can never leak into it.

### The Burden's exception

The finale stays self-contained in presentation: each phase page assembles everything needed to run that phase. It does so by embedding the rule, creature and Source entries, never by copying them. So the GM never leaves the phase page, but each rule still has one home.

---

## 4. The ownership contract

Each piece of information has exactly one canonical home. A page may show content it doesn't own, by embedding or rendering the owning entry, but never keeps its own copy.

| Information | Canonical home | Where it is shown |
|---|---|---|
| Universal Veiled mechanics (Dispersal, the Stabilization Window, Restore, Anchor, Class, Backlash, …) | rule entries (`rules/`) | embedded in Part I, in encounters and in the Quick Reference |
| Creature abilities and stat blocks; Source and hazard mechanics | creature / source / hazard entries | embedded in encounters, and in the Bestiary and Sources appendices |
| Encounter setup, boards, decks, clocks, phase logic, victory conditions, encounter-specific tactics | the encounter (body and frontmatter) | the encounter page |
| Narrative causality, connections, branching consequences | events and encounters (`leadsTo`, `variants`, `:::branch`) and part pages | part and item pages; the app's Narrative board |
| NPC identity, motivations, relationships, established knowledge | character entries | NPC pages; embedded in scenes; the app |
| Faction definitions, goals, Assets | faction, goal and Asset entries | Part II, faction pages, the app |
| The Colony Turn's normative rules | rule entries, plus the app's rule engine (which must agree with them, see "conformance" in §6) | Part I; the app |
| Stable geography, traditions, location facts | location entries and the Part II pages | the gazetteer and location pages |
| Historical clues and player-facing evidence | a handout or record entry when reused (the Ledger's dossiers, Concordance entries); otherwise inside the scene | handout pages; embedded in scenes |
| World Conditions | condition entries | condition pages; the app |
| Design rationale, historical decisions, simulation findings | `:::design` blocks and `design:` fields (designer build only), or the designer area | designer build only |
| Live faction state, NPC conditions, session events, play tuning | the Colony app's database | the app |

**Baseline versus live state.** The files hold the campaign's starting state (`start:` values, starting controllers and members); the app holds what has happened since. A book page that renders relationships (a faction's Assets and members, a location's occupants) shows the baseline and labels it as such ("At the start of the campaign"). It never presents a starting value as current, and the app never presents a live value as canon. The app can show both: the live value, and the baseline from the file.

**Rules of thumb:**
- **Where to write:** if you find yourself writing a rule's procedure inside an encounter, it belongs in a rule entry, and the encounter embeds it. If a procedure exists only for one encounter (the Faceoff Board, the Engram Vault), it stays in the encounter.
- **Two versions of a fact:** when two pages need the same fact said differently (a player-facing and a GM-facing version), that is two audiences of one entry, not two entries: `:::player-facing` inside the owning entry.

---

## 5. Readiness: five separate measures

A page existing is not proof that its encounter is complete. Each part page, event and encounter carries five independent measures, shown on the designer build's readiness dashboard, and never in the GM book:

| Measure | Meaning | Values |
|---|---|---|
| `canon` | Its authoritative content has been transferred from the sources and reconciled | none / partial / migrated |
| `authored` | The GM-facing text has been written | none / draft / written |
| `runReady` | The rules, clues, maps, stat blocks and procedures it needs all exist | no / partial / yes |
| `production` | The physical and digital assets it needs are designed (props, decks, maps, handouts) | none / partial / designed / built |
| `validated` | Balance, usability and continuity checks are done (playtest notes attached) | no / partial / yes |

**Judgement stays human.** The build can check the objective prerequisites: every referenced entry exists, and every essential inventory item has a substitute. `runReady: yes` and `validated: yes` are set by a person after review, never by a successful build. The build only refuses "yes" while a prerequisite is missing.

**Essential versus enhancement.** An inventory link on a page is marked `essential` (the encounter can't run without it, or an operational substitute: The Reading's page clock) or an enhancement (Bad Maps runs with ordinary tokens until its painted miniature exists). Only essential items affect `runReady`.

**This replaces the current single `readiness.status` scale** (scaffold → compiled → audited → inventoried → written → closed), which mixed these measures together. Some values can be computed rather than entered. For example, `runReady` can't be "yes" while a page references a missing entry or an unresolved inventory item.

`canon` is per page. The migration map keeps tracking concepts: a page can be authored while one of its concepts is still in progress.

---

## 6. What the structure needs from the tooling

The infrastructure work this implies, for after approval:
1. **New entry types:**
   - `hazard` (PF2e hazards);
   - `map` (an image plus keyed areas);
   - `term` (a glossary entry, or the glossary could be generated from rule and concept definitions; see §9).

   These are book-only types, so the app doesn't change.
2. **Readiness:** the five measures (§5) in the schema; the dashboard page; migrate the two existing readiness blocks (The Calling, The Reading).
3. **Templates in the editor:** "New" on an index page starts from the type's template skeleton (§3) instead of an empty body.
4. **Sidebar labels show the arrangement:** "(alternatives)", "(any order)", "(at the same time)".
5. **Multi-page items:** The Burden's phase pages, as docs pages grouped under the encounter in the sidebar.
6. **Rendered sections:** "Who Is Here", "Members", "Appears In" and "Where It Applies" render from the data, so they never go stale.
7. **Chapters that list other entries:** the `reference` arrangement (approved) lists entries that aren't events or encounters (the Clearing House location).
8. **Player-only handout exports** (§3.9), and baseline labels on rendered relationships (§4).
9. **Designer area:** move stale references and unplaced items there; add the Open Decisions, Fabrication and Playtest pages.
10. **Not blocking, from the original plan (§8 of ADVENTURE-BOOK-PLAN.md), still undone:**
   - the app's reference drawer (an entry's book page inside the app);
   - production hosting for the book;
   - conformance tagging (rules linked to the tests that check the app's engine against them).

---

## 7. Existing migrations to keep

Nothing below is redone. Its ids and provenance stay.
- **Entries:** 48 NPCs and 1 PC; 11 factions; 31 Assets; 37 locations; 53 goals; 36 World Conditions; 17 events; 16 encounters; 17 threads; 1 branch; 1 creature (`creature.kelda-varruk`); 1 rule (`rule.book.keeper-bound-handling`); 1 Veiled Source (`source.book-of-names`); 1 inventory item.
- **Migration map:** 7 concepts: `rule.book.keeper-bound-handling`, `source.book-of-names`, `creature.kelda-varruk`, `encounter.the-reading`, `narrative.observer-timing`, `narrative.final-reading` and `narrative.sheep-observation`.
- **Rulings:** every ruling recorded in ADVENTURE-BOOK-PLAN.md §7 to §16, and the canon-check decisions (historical record in `adventure/sources/`).

---

## 8. The coverage inventory (generated 2026-11-18)

**Done:** `adventure/sources/coverage.yaml`, generated by `adventure/scripts/coverage-inventory.mjs`, shown on the designer build's Coverage inventory page and checked by the validator. It has 352 sections across the 13 documents (the ~1,900 headings grouped under their owning sections); 0 are unclassified. Homes come from names (134), the script's rules (197) and provenance (21). Status: 3 migrated, 66 in progress, the rest not started. Planned pages with no source material, and so needing new writing: Character Progression and Rewards, Geography and Districts, Civic Institutions (both built from the location, faction and Asset entries), and Who's Who (generated). The Seven Components of Identity has only 22 lines of its own.

**As planned:**

The next step, once this structure is approved, is mechanical. It is not reconciliation.
- **Index:** every heading of the 13 source documents gets one row in `adventure/sources/coverage.yaml`. There are about 1,900 headings, across Campaign Outline, Encounters, Creatures, The Veiled, The Burden, Character Briefs and the rest.
- **Each row records:**
  - a prospective home: a Part / page, an entry id, a rule, a designer note, "superseded by …", or "unclassified";
  - its status: not started / in progress / migrated (from the migration map when a concept covers it);
  - its dependencies: the earlier pages that must foreshadow it. For example, the Ledger in Act I (A Life) before its Act III use (The Tangled Web), and The Burden's seven-component structure informing earlier lessons.
- **The designer migration page** shows coverage per document and per Part, and lists the unclassified headings.
- **Generated, not hand-classified.** The inventory is built mechanically. Subheadings are grouped under the section that owns them (The Burden's action, round and threshold headings sit under their phase, not as separate rows to decide). Provisional homes are assigned where the mapping is unambiguous. Each mapping is confirmed only when its chapter is migrated. The inventory is a coverage safety net, not 1,900 separate decisions.
- **The 18 canonical encounters reconcile:** the 16 encounter entries, plus The Confluence and Totality, whose encounter procedures (#11, #12) are carried on their event pages (§3.2, §9).

Reconciliation then happens chapter by chapter, starting with Part I's core rule vocabulary and Act I, as the agreed working method says.

---

## 9. Decisions (settled 2026-11-18)

From the planning agent's review, accepted by the user:

| # | Decision |
|---|---|
| 1 | **Part I:** keep Character Progression and Rewards (needed early, for loot and balance). Keep The Campaign at a Glance (orientation) and GM Truths (spoilers and metaphysics) as separate pages. |
| 2 | **Who's Who:** generated from the NPC entries, with a short authored introduction. |
| 3 | **The Clearing House:** an extended location entry, listed as a resource in Act II; "Access and Terms" instead of "What It Costs". |
| 4 | **The Burden:** an overview and four phase pages, each with its own At the Table and the handoff state between phases. |
| 5 | **New types:** hazard and map. The glossary is generated from rule definitions, with `term` entries only where no rule owns the concept. Maps own artwork, grid, scale and orientation; keyed areas belong to the location or encounter. |
| 6 | **Readiness:** all five measures approved. The build validates prerequisites; `runReady` and `validated` are set by a person. Inventory links are essential or enhancement. |
| 7 | **NPC template:** add What They Know and How They Respond, for major NPCs especially; minor NPCs use only the sections they have content for. |
| 8 | **`reference`:** added as a fifth arrangement. |

**Two review points where the user's rulings of 2026-11-18 stand:**
- **Observer timing.** The review cites the earlier ruling "Confluence → Eclipse → Observer" (Character Briefs). That ruling was replaced the same day (`narrative.observer-timing`, ADVENTURE-BOOK-PLAN.md §13):
  - The Observer ends Act II and holds the whole reveal, in either order.
  - Eclipse opens Act III, with the eclipse already begun on both paths.
  - Campaign Outline and Character Briefs were both edited to match.

  The outline follows the current ruling.
- **The 18 encounters.** The user ruled that The Confluence and Totality are narrative events, not encounters; the two encounter entries the narrative merge had created were removed.
  - The review's concern still holds: their gameplay procedures (Encounters.md #11 Faction Pileup, #12 Race Against the Eclipse) must not be lost.
  - So the two event pages carry those procedures, in the encounter sections of template 3.2, and the coverage inventory reconciles all 18.
  - No new entries are created.

**Other changes from the review:**
- **The Final Reading** is a named section of The Light Remains (§1, Part V), not prose folded into it.
- **The templates** gain Availability / Trigger, NPC Objectives and If the Party Does Not Intervene for encounters, and Possible Next Developments for events. Read-aloud is optional.
- **Baseline versus live state** is explicit (§4).
- **Handouts** get player-only exports (§3.9).
- **The coverage inventory** is generated mechanically (§8).
