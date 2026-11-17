# Goal advance Effects; import ids; World Conditions file (BOARD-GAME-REVIEW §18.11)

**Status:** uncommitted on `main`.

**Rulings this implements (2026-10-20):**
1. Fix the import id bug, then re-import the Assets file.
2. Goal advance Effects (fp-4).
3. Reset to Stable when a goal takes an Asset.
4. witness_specimen requires the controller only.
5. Abide and Take out the Keeper keep Auto-Resolve off.

## 1. Import ids (the Unclaimed Object bug)
- **The bug:** every create endpoint replaced the supplied id with a new GUID. The new Asset therefore became `4432a639…`, while the four Unclaimed Object goals target `90c84272…`.
- **The fix:** `Services/EntityIds.cs` keeps a supplied id that is non-blank, trimmed, at most 64 characters and not already in use. It is used by the Assets, Goals, Factions, Characters, Locations and World Conditions endpoints. A blank id (UI-created records) or a taken one gets a fresh GUID.

## 2. Goal advance Effects (Faction Phase fp-4)
- **Model:** `FactionGoal.ProgressingEffectsJson` and `AccomplishedEffectsJson` (JSON lists, default `[]`).
- **Migration `GoalAdvanceEffects`:**
  - Converts the 8 milestone states into Progressing Effects on the goal's own target (Chest, Fund ×2, Stockpiles, Hall, Dead Drop Network, Lectern, Bell).
  - Then drops `ProgressingTargetState`.
  - Raises no EF warning. It runs on the live database the next time you start the app.
- **Vocabulary:**
  - Defined in `core/sim/advance-effects.ts` and checked on save by `Services/GoalAdvanceRules.cs` (400 for anything else).
  - Allowed: an Asset's status, controller or Location; a Character's state; Faction Size ±n; a Location's state; a World Condition established or ended.
- **Engine:**
  - Progressing writes the goal's Effects first, then the status (only when the goal is frozen from Planning).
  - Accomplished writes the target, then the goal's Effects, then the status; this includes accepted resolutions.
  - Each Effect is credited to the faction, with origin GoalGenerator.
  - The C# port is `FpGoal.OnProgressing` and `OnAccomplished`, written by `Advance()`. Version `fp-4`.
  - The frozen inputs omit empty lists.
- **UI:**
  - The goal editor has an "Advance Effects" section with two lists. A new row starts on the goal's own target. Save is blocked while any row is incomplete.
  - The goal card shows "ON FIRST SUCCESS" (while Planning) and "ON COMPLETION".
- **Goal CSV:**
  - `ProgressingEffects` and `AccomplishedEffects` (JSON) replace `ProgressingState`.
  - An older file's `ProgressingState` still imports, as one Progressing Effect on the target.
  - A file without the columns keeps the stored Effects.

## 3. World Conditions file
- Export and Import buttons for `world-conditions.csv` (now on the World Conditions page, §7), via `core/utils/condition-csv.ts`.
- **Import:** updates by Id and adds new conditions with their Id. Rows without a title, with malformed or unknown requirement kinds, or that require themselves are skipped and listed. A toast confirms the counts.
- `saveWorldCondition` now returns a promise of success.

## 4. Import files for the 2026-10-20 balancing plan (`imports/2026-10-20-balancing/`)
Generated from the app's real records (ids by name) with the client's own CSV code.

**Order** (with the viewing selector on Baseline; every page is read-only otherwise):
1. Assets page: delete the stray "The Unclaimed Object", then import `assets_with_unclaimed_object_import.csv`.
2. World Conditions page: import `world-conditions.csv`.
3. Goals page: import `faction-goals.csv`.

That order was rehearsed on a database copy through the API, and every step passed:
- 23/23 conditions and 36/36 goals imported.
- Every Asset target exists.
- In force at the start: Cache Looting, Pilgrims Gifts and Public Works Funded, with Stress 0.
- A played Bell destruction plus a Ledger theft gives Stress 1, with Civic Alarm Lost, Bell Unreliable and Cult Ledger Relationships in force.

**world-conditions.csv:** 22 conditions from the spec (Key → Id) plus one helper.

| Condition | How it was authored |
|---|---|
| witness_specimen | The Witnesses control the Object (controller only, ruling 4) |
| pilgrims_rest_incursion | Pilgrim's Rest is in Active Incursion; resolving it sets the Location back to Stable |
| public_works_disrupted | An OR across requirements, expressed with the helper **public_works_funded** (Dawn controls the Fund ∧ Stable or Damaged), required *not* in force. It is therefore also disrupted when the Fund is Destroyed under Dawn, which the spec's literal rule missed |
| registry_arrangement | "Operational" is read as **not Destroyed** for both Assets, matching Power, where Damaged and Contested count in full |
| order_excluded_from_assembly | Established by Sunset the Order, and in force only while Dawn controls the Assembly Hall |
| civic_alarm_lost | +1 Stress while the Bell is Destroyed: the only Stress in this pass |
| The other event-established conditions (checkpoints, secured, blockade, posters, procession access, house custody, record corrected) | Not in force at the start, with no requirements |

**faction-goals.csv:** the current 36 goals with the manifest's Effects added to 15 of them.

| Goal | At Progressing | At Accomplished |
|---|---|---|
| Secure the Procession | Establish Procession Checkpoints | End Checkpoints; establish Procession Secured |
| Blockade the Procession | | Establish Procession Blockade |
| Gain Momentum | | Establish Dawn Poster Campaign |
| Abide | Establish Cult Procession Access | |
| Recover the Unclaimed Object | | The Object moves to the Hall of Remembrance |
| Reveal | | The Object moves to Pilgrim's Rest; Pilgrim's Rest → Active Incursion |
| Requisition the Specimen | | The Object moves to Occlusion Containment |
| Freeze the Fund; Empty the Reform Treasury; Steal the Offering Chest; Secure the Hall of Keepers; Seize the Stockpiles | (the existing Contested) | Target → Stable |
| Sunset the Order | | Establish Order Excluded |
| Sunset the Dawn | Dawn −30 members | Dawn −40 members |
| Twilight the Dawn | | Establish The Record Corrected |

## 5. Not automated, deliberately
- **House Custody Dispute** starts when Abide reaches Ready to Resolve, and that has no Effect hook. The GM establishes it with an Event. Accomplished would be wrong: Abide is never Accepted.
- **Steal the Unclaimed Object:** no Object move, since "Shattered custody" matches no Location.
- **The manifest's NarrativeEvent and Scene rows** are World State text, as before.
- **Procession conditions after the Procession:** "ends after the Procession" is an Event ending them.

## 6. Tests

| Suite | Result | Notes |
|---|---|---|
| vitest | **216 pass** | fp-4 Effects order and attribution; freezing (Planning only, valid only, empty omitted); goal CSV round trip, invalid Effects dropped, legacy ProgressingState; conditions CSV round trip and rejections |
| `ng test` | **218 pass** | |
| `server.Tests` | **33 pass** | Includes 8 new `GoalAdvanceRulesTests`. The 60 regenerated fp-4 vectors (53 Faction Size, Location and condition Effects, and an uncontrolled `''` controller) are all reproduced |
| e2e, on a migrated copy | **77/77** | New checks: a goal stores advance Effects; an Effect outside the vocabulary is refused (400); a committed advance Effect is verified by the server; an imported id is kept, and a duplicate gets a fresh one |

Two conditional e2e checks didn't run because the data no longer offers the case: the legacy duplicate champion is gone, and no goal reached Ready to Resolve this run.

## 7. Goals and World Conditions pages (same day)
Both now have their own page in the **World** section of the sidebar: Goals after Factions, World Conditions after Locations.

**Goals page (`/goals`)**
- Every faction's goals and assignments at the viewed point in history.
- **Filters:** Active, Resolved or All; faction; Achieve or Maintain; Earliest Act; title search. The header counts what is Planning, Progressing, Ready to Resolve, Dormant, Maintain and resolved.
- **Grouping:**
  - **By faction:** each header links to the faction.
  - **By target:** goals from several factions on one Asset or Character are marked **Contested**, with who currently holds the Asset. Goals without a target are grouped at the end.
- **Editing:** Add, plus the goal editor. A new goal picks its faction unless the faction filter is set.
- **Import / Export:** moved here from the Factions page. The Factions page now exports and imports `factions.csv` only, and points a goals file to the Goals page.
- **Links:** `?faction=<id>` (the faction page's "Manage" link) and `?group=target`.

**Shared pieces**
- `features/goals/goal-card.component` and `goal-editor.component` were extracted from the faction page, keeping its markup, rules and styles.
- The goal assessments (Dormant, Ready, Not yet eligible, Obsolete, defense) are now one store value, `viewGoalAssessments`, alongside `viewAct`.
- Display change: a Planning goal's status pill reads PLANNING instead of PLOTTING, matching the editor.

**Faction page:** Goals is now a read-only summary, like Assets. It has compact cards and a header count ("4 Planning · 1 Progressing · 1 Maintain") with a **Manage →** link to the Goals page filtered to the faction. Editing happens on the Goals page.

**World Conditions page (`/world-conditions`)**
- The former Sessions panel, full page: All, In force or Not in force at the viewed point; Import, Export and Add; the requirements editor.
- **New:** for each condition, the goals whose advance Effects **establish** or **end** it (and at which advance), and the conditions that **require** it.

**Sessions page:** a one-line summary ("3 in force at the start · Pilgrims Gifts · …") with **Manage →**. The per-session "now in force / no longer in force" chips are unchanged.

**Verified**
- vitest 216, `ng test` 218, and a clean build.
- Screenshots in headless Chrome, against a database copy with the imported conditions and goals: the Goals page by faction and by target, the World Conditions page with its cross-references, the Dawn Assembly's summary, and the Sessions summary.
- The editor modal wasn't opened in the screenshots. It is the original template plus the faction choice, and the build type-checks it.

## 8. Planning grid (2026-10-21)
A third Goals view, **Planning grid**, alongside By faction and By target. It is also reachable as `?group=grid`, optionally with `&faction=<id>`. It was adapted from the planning agent's mock-up.

- **Layout:** per faction, its **Achieve** goals by **Earliest Act** (columns I–III) × **Priority** (rows Critical, Major, Minor), one slot each.
- **Counts:** each cell shows "n/1". A cell holding more than one goal is flagged red (goals competing for one planning lane), and the faction header counts the slots that are over.
- **Open slots** are opportunities, not requirements. In Baseline, clicking one opens the goal editor preset to that faction, priority and Earliest Act (a new `preset` input on the editor). Clicking a goal opens it.
- **Scope:** Maintain assignments are not shown, since they have no Act or slot. Resolved goals stay in their slot, struck through and dimmed. The Active/Resolved tabs and the type and Act filters don't apply in this view; the faction filter and search do.
- **Faction filter:** "All factions" stacks one grid per faction, which makes lopsided spreads easy to compare. With the imported plan, for example, the Shattered have 0 goals in Act I, 5 in Act II (four of them in Major) and 0 in Act III.

**Verified:** a clean build, and headless-Chrome screenshots of all factions and of the Shattered alone, against a database copy with the imported plan. The grid matches the planning agent's mock-up, e.g. Order of Theia's Act II Minor at 2/1.

**Refinements (2026-10-21, from the GM's mockup)**
- **Show Maintain goals:** a switch in the grid's filter row, **on by default** since 2026-10-22 (`?maintain=0` opens the grid with it off). Maintain assignments then appear in **Act I**, since they have no Earliest Act and are in force from the start. They sit in their priority's row, in blue with a shield, and **never fill a slot**: the count stays "0/1" and "Open slot" still shows.
- **Card header:**
  - The faction's banner hangs from the card's top-left edge, drawn as on the Assets page (secondary colour, banner shape, icon in the primary colour).
  - Then the faction name and its **Power** in green, at the viewed point in history. It uses the same `computePowerBreakdown` as the faction page, and its tooltip lists the channels.
  - On the right, the **number of visible goals**: Achieve only, or Achieve plus Maintain when the switch is on.
  - The per-Act breakdown and the "slots over" alert were removed from the header; red cells still flag over-full slots.
- **Act headings** are left-aligned, as in the mockup.

**Refinement (2026-10-22, after fp-5):** Maintain assignments now share Power with goals (§18.12), so the planning grid treats them as goals.
- **No switch:** the "Show Maintain goals" switch and `?maintain=` are removed. Assignments always show, in Act I, blue with a shield.
- **They fill their slot:** a cell with one assignment is "1/1" and no longer an open slot, and a cell holding more than one goal or assignment is flagged red.
- **Header count:** the goal count in each card header counts both.

## 9. World Conditions as cards (2026-10-26)
The World Conditions page shows one **card** per condition, in a grid, from the GM's mockup.
- **Card:** the title (and a Stress chip, if any), then two state lines.
  - The **rule while in force**.
  - The new optional **"When not in force"** text.
  - The line that is true now is bright, with a green check; the other is dimmed. A condition without the second text shows its rule, dimmed when not in force.
  - In Baseline, clicking a card opens its editor.
- **Caption,** right-aligned under the card: what the condition depends on, in short words. For example "The Offering Chest held by Cult of the Unknown · The Offering Chest → Stable", or "Established by Secure the Procession (completion)".
  - Requirements that don't currently hold are dimmer.
  - A list of every state but one reads "not Destroyed".
  - Its tooltip has the full reason, and which goals end it or which conditions require it.
- **Model:** `WorldCondition.RuleOtherwise` (nullable; migration `WorldConditionRuleOtherwise`). It's in the editor ("When not in force (optional)") and the CSV (`RuleOtherwise` column; a file without the column keeps the stored text).
- The evaluator now also reports each requirement's state (`ConditionStatus.holds`).

**World Condition editor (2026-10-26, from the GM's layout).** The editor now reads, in order: Title; Condition Type; Requirements (Entity type only); While In Force (Text, Colony Stress); While Not In Force (Text, optional).

- **Condition Type** is a single switch, "Event Requirement (switch) Entity Requirement", with the unchosen side dimmed. It replaces the "In force from the start" checkbox and is stored the same way (`activeAtStart`), so existing conditions open on the right side.
  - *Event:* off until an Event or a goal's advance establishes it. An Event condition keeps no requirements.
  - *Entity:* in force while every requirement holds.
- **Mixed data:** a condition from before the switch that is Event-established *and* has requirements (in the current data, *Order Excluded*) opens as Event with a warning naming the requirements that saving will remove.
- **Requirement rows** read [Entity Type] [Entity] [Verb] [Object], e.g. Asset · The Offering Chest · Controlled by · Cult of the Unknown.

  | Entity Type | Verbs | Object |
  |---|---|---|
  | Asset | Controlled by | Faction or no one |
  | | Status is | Statuses, on the line below |
  | Character | State is | States |
  | | Belongs to | Faction |
  | Faction | Has a capable leader / Is leaderless | — |
  | Location | State is | States |
  | World Condition | Is in force / Is not in force | — |

  Each (type, verb) is one stored requirement kind, so the data format is unchanged. Changing the verb keeps the entity.

## 10. "Varies by" World Conditions (2026-10-26)
A World Condition can vary by **one entity's property**, with one row per state, each with its own text and Stress. It's the shape of a printed reference table with a marker on the current row. The two-line switch is the same idea with two rows ("holds" and "does not").

**Rule**
- **In force:** established ∧ the current state's row has text. A blank row means "not in force in that state".
- **Stress:** the row's Stress counts toward Colony Stress while it's in force.
- A requirement "condition X is in force" reads it the same way.

**Subjects:** an Asset's status or controller (each faction, or no one), a Character's state or faction, or a Location's state. These are the recorded properties requirements already read; nothing that depends on Stress.

**Model:** `WorldCondition.VariesByJson` holds `{ subject: { kind, id }, rows: [{ state, text, stress }] }` (migration `WorldConditionVariesBy`). The evaluator reports the current `row` and `rowText`.

**UI**
- **Card:** every row, with the current one bright and checked, plus each row's Stress. The caption reads "Varies by Dead Drop Network · Status".
- **Editor:** under Entity Requirement, a choice between "When requirements hold" and "Varies by an entity's state". The second picks [Entity Type] [Entity] [Property], and the table fills with every state. In this mode the In Force / Not In Force sections are hidden.
- **Sessions:** a row change while in force shows as "Now: Cache Looting: … loot on 6 only". Started chips show the condition's actual Stress.
- **CSV:** a `VariesBy` column (JSON). It's validated on import, and a file without the column keeps the stored table.

**Data:** the migration converts the campaign's **Cache Looting** into one condition varying by the Dead Drop Network's status, with four rows from its rule text. It only does this if the condition is still in its original form and the Asset exists. Verified on a copy of the live database. The two Bell conditions and Remembrance Disrupted, which were candidates for merging, no longer exist in the live data, so nothing else changed. *Civic Alarm Lost* (one state) stays a switch.

**Also fixed:** the condition editor's Save had stopped rounding Colony Stress. A code comment from the previous change had swallowed that line.

**Tests:** vitest 223 (new: evaluation, row Stress in replay, a blank row, dependent conditions, row changes, CSV round trip), `ng test` 225, `server.Tests` 34.

## 11. Goal-driven World Conditions; goal World States retired (2026-10-26)
Ruling (BOARD-GAME-REVIEW §18.13): goals are an optional driver of World Conditions, and the text lives only in the conditions.

**Rule**
- **New subject and requirement:** *Goal · Stage*. The stages are Planning, Progressing, Ready to Resolve, Accomplished, Failed and Retired.
  - **Varies by:** a row per stage, each with its own text and Stress.
  - **Requirement:** "Stage is" with stage checkboxes, combined with any other requirements.
- **Where the stage comes from:** the replayed goal status, with Ready to Resolve from the GM-task overlay (`goalStageOf`). The baseline uses the stored goal.
- **No condition targets in advance Effects:** an advance no longer establishes or ends a condition. The client vocabulary and the server's `GoalAdvanceRules` both refuse it. Session Events still can.

**Removed:** `FactionGoal.ProgressingWorldState` and `CompletedWorldState`.
- Removed from the model, the goal editor ("World Info"), the goal card, the CSV and the Faction Phase inputs (`milestone`; the server's `FpGoal` record). A stored turn's old `milestone` is ignored.
- An older goals file's World State columns are **ignored** on import.

**Where the text shows now** (`goalStageTexts`, the conditions the goal drives at a stage):
- **Goal card:** WHEN PROGRESSING / NOW TRUE / WHEN COMPLETE.
- **Goal editor:** a read-only "World Conditions" list (each driven condition and its stages).
- **Colony Turn board, Review and the resolution task's "If accomplished".**
- **World Conditions cards:** a goal's table shows only the stages written for; the caption reads "Varies by Abide (Cult of the Unknown) · Stage".

**Migration `GoalDrivenConditions`** (data first, each step guarded; then the columns are dropped). Verified on a copy of the live database:

| Condition | Now |
|---|---|
| Procession Secured, Procession Blockade, Dawn Poster Campaign, The Record Corrected | vary by Secure the Procession / Blockade the Procession / Gain Momentum / Twilight the Dawn: their rule at **Accomplished** |
| Cult Procession Access | varies by Abide: Progressing, Ready to Resolve, Accomplished |
| House Custody Dispute | varies by Abide: Ready to Resolve, Accomplished |
| Order Excluded | requires Sunset the Order **Accomplished** and Assembly Hall held by Dawn |
| 40 new conditions `goal_<goal id>` (SortOrder 1001–1040), titled after their goal | the goal's Progressing text at Progressing; its Completed text at Accomplished (and at Ready to Resolve for an Adjudicated goal). A stage another condition covers is left blank; Abide is fully covered, so it has none |

The established-by-advance Effects (Secure the Procession, Blockade, Gain Momentum, Sunset the Order, Twilight the Dawn) are removed from the goals. A stage row applies while the goal is at that stage. So the old pattern "establish at Progressing, end at Accomplished" (the deleted Procession Checkpoints) is now simply a Progressing row.

**For audit:** the Event conditions added by hand stay as they were (Aspis-Controlled Crossings, Old Town Quarantine, Founder's Bridge Destroyed, and others). Many say the same as a generated goal condition (e.g. *Quarantine Old Town*), so one of each pair can go, or the Event condition can be converted to vary by the goal.

**Tests:**
- vitest 224 (new: goal-stage evaluation through replay, row Stress, a stage requirement, `goalStageTexts`).
- `ng test` 226, `server.Tests` 35 (a condition advance Effect is refused).
- e2e 79/79: the advance-Effect marker is now a Location state, and a new check confirms that a condition advance Effect is refused.

**World Conditions file (same day):** the format already carried goal-driven conditions: a goal-stage requirement in `Requirements` and a goal-stage table in `VariesBy`, both validated against the evaluator's lists, with the goal named by id. Two gaps are fixed:
- **A missing Requirements column** now keeps the stored requirements, like every other column. It used to clear them.
- **A row that would leave a "varies by" table on an Event condition** (ActiveAtStart No) is refused. Without this, re-importing `imports/2026-10-20-balancing/world-conditions.csv` (no VariesBy column, ActiveAtStart No) would quietly switch off the migrated goal-driven tables.

That balancing file predates the migration and should not be re-imported. Its goals file is also out of date: its World State columns are now ignored, and its condition advance Effects are dropped on import.

Tests: vitest 226 (new: goal-stage round trip; the missing column keeps the stored value; an Event row with a table is refused). In the migrated copy no condition has a table with ActiveAtStart No, so a fresh export re-imports cleanly.

## 12. World Conditions audit applied (2026-10-26)
The user accepted `WORLD-CONDITIONS-AUDIT.md`, with these rulings:
- delete the narration-only conditions;
- Order Excluded depends *only* on Dawn holding Assembly Hall;
- the five principles;
- titles that cover every state of a condition (like *Maelyn's Boon* and *Hidden Caches*).

**Migration `WorldConditionsAudit`:** 62 guarded statements, generated from the audited data. Each acts only if the condition still has its audited Id and Title; a merge's deletions act only if the merge happened.
- **Result:** 69 conditions become 36. Verified on a copy of the live database.
- **Abide:** the user had already merged it by hand (*The Cult Abides*; *House Custody Dispute* deleted), so the migration leaves it alone.

| Condition (Id) | Was | Now | Why |
|---|---|---|---|
| `procession_secured` | Procession Secured | Procession Watch | merged with Secure the Procession |
| `procession_blockade` | Procession Blockade | Procession Protest | merged with Blockade the Procession |
| `dawn_poster_campaign` | Dawn Poster Campaign | Dawn Posters | merged with Gain Momentum |
| `dawn_history_corrected` | The Record Corrected | Witness Broadsides | merged with Twilight the Dawn |
| `goal_2976ada1…` | Sunset the Order | Assembly Hearing | Progressing only |
| `order_excluded_from_assembly` | Order Excluded | Assembly Hall Authority | requires only Dawn holding Assembly Hall |
| `aspis_controlled_crossings` | Aspis-Controlled Crossings | River Crossings | merged with Secure the Crossings |
| `aspis_credit_withdrawn` | Aspis Credit Withdrawn | Aspis Credit | merged with Divest |
| `cult_reception_rite` | Cult Reception Rite | Reception Rite | merged with Receive the Pilgrims |
| `emergency_mnemonic_routing` | Emergency Mnemonic Routing | Emergency Mnemonic Routing | merged with Contain the Breach |
| `corrupted_frames_disabled` | Corrupted Frames Disabled | Corrupted Frames | merged with Disable Corrupted Frames |
| `egress_totality_survey` | EGRESS Totality Survey | EGRESS Totality Survey | merged with Gather Data |
| `milltown_safe_passage` | Milltown Safe Passage | Milltown Passage | merged with Contain Milltown Flooding |
| `old_town_quarantine` | Old Town Quarantine | Old Town Quarantine | merged with Quarantine Old Town |
| `order_evacuation_route` | Order Evacuation Route | Order Evacuations | merged with Rescue Civilians |
| `dawn_armory_weapons` | Dawn Armory Weapons | Garrison Armory | merged with Raid the Armory |
| `founders_bridge_destroyed` | Founder’s Bridge Destroyed | Founder’s Bridge | merged with Blow Up Founder's Bridge |
| `witness_field_archives` | Witness Field Archives | Witness Field Archives | merged with Establish Field Archives |
| `hall_secured_wing` | Hall Secured Wing | Hall Containment | merged with Stabilize the Hall |
| `goal_ca629b3d…` | Clear the Clearing House | Clearing House Occupation | Progressing only (an entity condition covers Accomplished) |
| `goal_0cf3f25e…` | Connect | Registry Tracing | Progressing only (an entity condition covers Accomplished) |
| `goal_9ae89441…` | Recover the Unclaimed Object | Recovery Notices | Progressing only (an entity condition covers Accomplished) |
| `witness_specimen` | Witness Specimen | Witness Specimen | Entity condition |
| `civic_alarm_lost` | Civic Alarm Lost | Bell of the Sun | varies by the Bell's status |
| `empty_lectern` | — | The Empty Lectern | new: varies by the Lectern's status |
| `civic_fund` | — | Civic Improvement Fund | new: varies by the Fund's holder |
| `goal_7aa79d6e…` | Open the Book of Names | (deleted) | covered by Public Access to the Book |
| `goal_cbfba392…` | Break the Shattered | (deleted) | covered by Hidden Caches |
| `goal_8ec2638b…` | Steal the Offering Chest | (deleted) | covered by Maelyn's Boon |
| `goal_5e6312a0…` | Acquire the Book of Names | (deleted) | narration only |
| `goal_514d9423…` | Recover the Registry (tentative) | (deleted) | narration only |
| `goal_f55c28b3…` | Reveal | (deleted) | narration only |
| `goal_f7b1c7a6…` | Understand | (deleted) | narration only |
| `goal_927aa7b6…` | Requisition the Specimen | (deleted) | narration only |
| `goal_65d6e10e…` | Seize the Stockpiles | (deleted) | narration only |
| `goal_5a3c3c08…` | Steal the Ledger | (deleted) | narration only |
| `goal_783de804…` | Steal the Unclaimed Object | (deleted) | narration only |
| `goal_5d3026c0…` | Secure the Hall of Keepers | (deleted) | narration only |
| `goal_2c16e93c…` | Sunset the Dawn | (deleted) | narration only |
| `goal_6c8fbe28…` | Take out the Keeper | Tavia's Hunt | Accomplished row cleared |
| `goal_cd6cc308…` | Evacuate Slums | Slum Evacuation | renamed |

**New text, reworded to state form** (everything else is kept verbatim):
- *Bell of the Sun* Damaged: "The Bell of the Sun is Damaged; its ringing is unreliable."
- *The Empty Lectern*: Damaged "The Empty Lectern is unsafe for remembrance ceremonies."; Destroyed "Remembrance ceremonies require another site or lectern."
- *Civic Improvement Fund*:
  - EGRESS: "Dawn-funded work remains halted until refinanced."
  - Witnesses: "The Fund's resources go toward preservation; Dawn-funded work is halted."
  - no one: "Dawn-funded work is halted until the Fund is refinanced."

**Texts no longer in any condition** (for reference):
- *Acquire the Book of Names*: Aspis obtains a means of entering the Book of Names' current holding site.
- *Acquire the Book of Names*: Aspis takes the Book of Names from its current custodian.
- *Divest*: Aspis withdraws Consortium-backed credit and active trade services from the River Exchange; its remaining Asset ownership does not change without explicit transfers.
- *Recover the Registry (tentative)*: Aspis locates the Claims Registry in its current custodian's possession and prepares a retrieval.
- *Recover the Registry (tentative)*: Aspis takes back the Claims Registry and restores authorized access to its commercial records.
- *Secure the Crossings*: The Consortium establishes a controlled network of authorized crossings and emergency supply routes.
- *Steal the Offering Chest*: Offerings go missing from the Chest inventory and its custody becomes Contested.
- *Steal the Offering Chest*: Aspis takes the Offering Chest from its current holder; its gifts cease to be available at Pilgrim's Rest.
- *Clear the Clearing House*: The Cult takes control of the Clearing House and opens its offices to pilgrims while normal contract-settlement services remain suspended.
- *Connect*: Cult controls the Claims Registry; new Cult-related Veiled incursions gain +1 Class.
- *Receive the Pilgrims*: Cult attendants prepare Pilgrim's Rest to receive people and existing manifestations under guided rites of welcome.
- *Receive the Pilgrims*: Pilgrim's Rest opens a supervised reception rite to existing Veiled and their human witnesses; the welcome supplies Form but creates no new mnemonic Source.
- *Reveal*: Pilgrim's Rest prepares an exhibition around reports of the missing resonant object.
- *Reveal*: The Cult takes the Unclaimed Object from its current holder and exhibits it at Pilgrim's Rest; a Veiled incursion begins around the genuine source.
- *Understand*: Cult agents prepare to take the Ledger from its current custodian.
- *Understand*: The Cult takes the Ledger from its current holder and brings it to Pilgrim's Rest.
- *Contain the Breach*: EGRESS isolates sections of its damaged containment network and activates emergency mnemonic routing.
- *Contain the Breach*: Emergency routing begins diverting escaping mnemonic burdens into surviving containment and storage systems.
- *Disable Corrupted Frames*: The identified corrupted Frames are powered down and secured; EGRESS loses their automated labor while the machines remain offline.
- *Freeze the Civic Improvement Fund*: The Civic Improvement Fund becomes Contested as EGRESS places payments under review; Dawn-funded construction is interrupted.
- *Freeze the Civic Improvement Fund*: EGRESS takes control of the Civic Improvement Fund and Dawn-funded work remains halted until refinanced.
- *Gather Data*: An EGRESS survey of measured Sources and unstable routes is compiled for consultation; measurements do not establish anyone's identity.
- *Requisition the Specimen*: EGRESS identifies the Unclaimed Object's current holder and issues a scientific containment requisition.
- *Requisition the Specimen*: EGRESS takes the Unclaimed Object from its current holder and secures it in Occlusion Containment.
- *Seize the Stockpiles*: EGRESS locates the Shattered Hidden Stockpiles and begins confiscating them; the network becomes Contested.
- *Seize the Stockpiles*: EGRESS seizes the Hidden Stockpiles from their current controller.
- *Break the Shattered*: The Dead Drop Network becomes Contested as Order patrols identify and loot hidden caches.
- *Break the Shattered*: The Dead Drop Network becomes Damaged; new caches contain loot only on 6 (d6).
- *Contain Milltown Flooding*: An Order cordon keeps an evacuation passage open through Milltown; the historical flooding persists beyond the secured route.
- *Quarantine Old Town*: Old Town is placed under armed quarantine, restricting passage into and out of the district.
- *Rescue Civilians*: An Order evacuation convoy reaches safety with the stranded group; its marked route remains available for further escorted rescues.
- *Sunset the Dawn*: A citizen campaign prompts thirty Dawn members to resign (Faction Size −30).
- *Sunset the Dawn*: A further forty Dawn members resign (additional Faction Size −40).
- *Open the Book of Names*: Dawn agents prepare to take the Book of Names from its current custodian.
- *Open the Book of Names*: Dawn takes the Book of Names and makes it available for public inspection.
- *Raid the Armory*: Dawn raiders escape with weapons from the Garrison; the Order retains the Garrison, but its armory stores are depleted.
- *Secure the Hall of Keepers*: During Totality, Dawn stewards establish a Contested presence in the Hall of Keepers.
- *Secure the Hall of Keepers*: Dawn takes control of the Hall of Keepers, displacing Order administration.
- *Blow Up Founder's Bridge*: The load-bearing span of Founder's Bridge collapses; that crossing is impassable until repaired or bypassed.
- *Break the Lectern*: The Empty Lectern becomes Damaged and is unsafe for remembrance ceremonies.
- *Break the Lectern*: The Empty Lectern is Destroyed; remembrance ceremonies require another site or lectern.
- *Silence the Bell*: The Bell of the Sun becomes Damaged and its ringing is unreliable.
- *Silence the Bell*: The Bell of the Sun is Destroyed; the Order loses its civic alarm.
- *Steal the Ledger*: Shattered operatives obtain access to the Ledger's current holding site.
- *Steal the Ledger*: The Shattered take the Ledger from its current custodian.
- *Steal the Unclaimed Object*: Shattered operatives trace the Unclaimed Object to its current holder and prepare a covert theft.
- *Steal the Unclaimed Object*: The Shattered steal the Unclaimed Object from its current holder.
- *Empty the Reform Treasury*: The Civic Improvement Fund becomes Contested as Witnesses divert a grant toward preservation.
- *Empty the Reform Treasury*: Witnesses take control of the Civic Improvement Fund and redirect its resources toward preservation.
- *Establish Field Archives*: Mobile archives operate throughout the Colony, preserving recovered objects and contextual records outside the Hall of Remembrance.
- *Recover the Unclaimed Object*: Witnesses take the Unclaimed Object from its current holder and catalog it at the Hall of Remembrance.
- *Stabilize the Hall*: One secured wing of the Hall remains usable for supervised recovery and Context research; the rest of the Hall is not automatically stabilized.
- *Twilight the Dawn*: Witnesses authenticate Assembly records that contradict a claim in Dawn campaign literature.

**Cards (same day):** a table by holder or faction now shows only its written rows, as goal-stage tables already did. Status and state tables still show every row.

**Tests:** vitest 226, `server.Tests` 35, e2e 79/79 on a copy of the live database with both migrations applied.

**Not changed (content, for the user):**
- *Raid the Armory*'s target transfers the Garrison to Dawn, but its texts say the Order keeps it.
- *Recover the Registry (tentative)* still has "tentative" in its title.
- *Witness Specimen* still points at the Unclaimed Object's planned id, which is missing until the Asset re-import.
