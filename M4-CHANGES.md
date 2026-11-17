# M4: Goals

**Scope:** BOARD-GAME-REVIEW.md §17.7 M4, with §6 (states, overlays, outcome modes, defensive assignments), §14.5 (unattended contract), §14.6 and §15.4 (Satisfied vs credited), §15.5 (lead availability), and the 2026-10-15 rulings.

**Status:** uncommitted on `main`, on top of M0–M3 and the scoring rewrite.

## Rulings implemented (2026-10-15)

| Ruling | Implementation |
|---|---|
| A goal that becomes impossible is set aside as **Retired**, and its champion is unassigned | `GoalStatus.Retired` (terminal, no Momentum signal). A Retired status Effect clears the champion in replay; saving Retired in the goal editor clears it in the baseline. Impossible goals are **flagged** "Obsolete", never retired automatically. |
| A defecting champion does not take the goal: it stays with the faction and loses its champion | The replay clears the champion of every goal of the faction the character leaves. The goal is then Dormant ("No champion") until a `championChange`. A defecting **leader** likewise leaves the faction leaderless. |
| Uldren protects Vara (O-7) | Character-target defensive assignments are supported: Active while the protected character is Alive. **The goal itself is yours to add.** |

## Model changes

### Data (server migration `M4_GoalOutcomes`, additive; tested on a DB copy)

| Field | Purpose |
|---|---|
| `OutcomeMode` | Automatic / Adjudicated |
| `OutcomeText` | The declared stakes |
| `Attempt`, `Opportunity`, `Discovery` | The unattended contract (§14.5) |
| `UnattendedOutcome` | Unset / Succeeds / Partial / Fails |
| `UnattendedText` | What the unattended outcome looks like |
| `DeadlineTurns` | Default 1 |

`GoalStatus.Retired` is appended as 5, so no existing value moves.

**Backfill (§6.2 defaults):**
- **Automatic (18):** the Achieve goals with an Asset state or owner target.
- **Adjudicated (8):**
  - *Take out the Keeper*, *Complete the Ritual*, *Stop the Ritual*;
  - the 5 legacy faction-threshold goals: *Sunset the Order*, *Sunset the Dawn*, *Twilight the Dawn*, *Gain Momentum*, *Stop the Reckoning*.

**Live locks:**
- **Locked:** `OutcomeMode`, `UnattendedOutcome`, `DeadlineTurns`.
- **Editable (descriptive):** the texts.

**The live DB:**
- It already has M1 and M3, applied when you started the app.
- **ScoringGeometry and M4 will apply automatically at your next server start.**

### Engine (`core/sim/goals.ts`, new; `replay.ts`)

**New Effects:**
- goal `championChange` (character or none);
- goal `readyToResolve`: Ready / Engaged / Cleared;
- goal `leadAvailable` (counted once per session);
- faction `leaderChange` (character or none).

**New snapshot fields:**
- `goalChampions` and `factionLeaders` (null = none);
- `goalReady` (`sinceSession`, `leadSessions`, `engaged`).

`projectGoals` and `projectFactions` project them, so Power's "leader capable" and the Momentum leader signals follow the current leader, not the baseline one.

**Detector (D4-5).** An Achieve goal whose target becomes true is **Accomplished only if credited**:
- the causing Effect's `actorFactionId` is the goal's faction; or
- the same Event has a Helping `participate` on the goal by the faction, its champion or a member.

Otherwise it is **Satisfied**: a derived overlay with no status change and no signal. It is out of the pool while the condition holds and returns if the condition reverts. Ready goals are detected too, and the overlay clears.

**Maintain goals are defensive assignments (§6.5).** The detector **no longer fails them**. They are Defending / Inactive, derived as follows:

| Target | Active while |
|---|---|
| Asset | the champion is capable and in the faction, and the Asset is held and not Destroyed |
| Character | the champion is capable and in the faction, and the protected character is Alive |

`activeDefense()` gives the −1 that M5's Faction Phase applies against other factions.

**`assessGoal()`** returns, for one goal at the viewed snapshot:
- the overlays: Dormant (with the reason), Ready to Resolve (leads n/N, engaged, deadline due), Satisfied;
- the obsolescence flag, if any;
- the contract gaps;
- for assignments, the defense state;
- **eligibility for the Faction Phase pool**, which M5 will use.

**Contract validation.** An Adjudicated goal needs all of: outcome text, attempt, opportunity, discovery and an unattended outcome. An Automatic goal needs a machine-readable target. Until then the goal is not eligible. It shows a "Needs …" badge, but saving is never blocked.

**Declared effects:**
- `declaredResolutionEffects()` writes the target, credited to the faction, plus Accomplished.
- `unattendedEffects()`:
  - Succeeds = as declared;
  - Partial = Failed;
  - Fails = back to the pool.

### UI

**Goal editor:**
- an Outcome Mode setting;
- for Adjudicated goals, the outcome text and the full contract (attempt, opportunity, discovery, if unattended, deadline, unattended description);
- a live "not yet eligible, needs …" hint;
- an explanation of how defensive assignments work;
- a Retired status, with a note that saving unassigns the champion.

**Goal cards:**
- overlay badges: Dormant, Ready to Resolve with leads, Unattended outcome due, Satisfied, Needs …, Obsolete;
- an Automatic / Adjudicated tag;
- Maintain cards show a **DEFENDING / INACTIVE** pill with its reason in the tooltip;
- Retired goals are listed under Resolved with an archive icon.

**Sessions, Decisive Scenes panel.** It lists the goals that are Ready to Resolve at the start of each session, with their stakes and leads. Actions:
- Lead available (a checkbox);
- Engaged;
- Resolve as declared;
- Failed;
- Remains Progressing;
- Apply unattended outcome, when the deadline is due.

Each action writes ordinary Effects into that session's "Decisive scenes" Event, which sorts before play and is visible and editable like any Event.

**Sessions, effect editor:**
- Champion Change and Leader Change, as a character list with the faction's members first;
- Ready to Resolve;
- Lead Available;
- Retired in the goal status options;
- the **actor faction** selector, which used to appear only on asset status, now also appears on asset control and character state, so play can credit a faction.

### Other
- **Belief derivation threshold:** the default is now **0.5** for new campaigns (client `DEFAULT_FORMULAS` and server defaults). The live campaign is already at 0.5.
- **`tools/beat-sim/export.py`:** maps `Retired`.

## Tests

**`goals.spec.ts` (23 tests):**
- a table per target shape: condition, contract gaps, declared effects;
- the Adjudicated contract;
- credit by actor and by Helping participation;
- Satisfied: no signal, out of the pool, and back when it reverts;
- **the Ledger stolen and recovered**: the assignment goes Inactive and then reactivates without ever failing; the thief's goal is Accomplished; −1 defense only against other factions;
- **Ready goal excluded from the pool**, lead counting, the deadline coming due, engagement suspending the deadline, "remains Progressing";
- **the detector Accomplishes a Ready goal through credited play**;
- the unattended outcomes;
- the rulings: a defecting champion makes the goal Dormant and leaves it with the faction; a `championChange` restores it; obsolescence; Retired clears the champion with no signal; `leaderChange`; a defecting leader leaves the faction leaderless;
- Uldren-protects-Vara assignment states.

**Updated tests:** the D6 detector tests (`replay.spec.ts`) and the M3 Ledger test now credit the causing Effect (`actorFactionId`), as D4-5 requires.

**`server.Tests`:** Live locks the outcome mode but not the outcome text. 13/13 pass.

**Results:**

| Check | Result |
|---|---|
| vitest | 117/117 |
| `ng test` | 119/119 |
| tsc (app and spec) | clean |
| Development build | succeeds |
| Production build | only the pre-existing budget errors |
| DB-copy smoke test | the migration backfill is correct; a PUT round-trips every new field and `Retired` |

## Snapshot golden diff (regenerated)
- **S4–S7:** Nhalia's EGRESS goal (`65d6e10e…`) has champion `null` after her S4 defection (ruling 2). It is Dormant from S4.
- **S7:** the Order's Maintain goal `615abbae…` was **Failed** in S7 when its asset became Contested. It is now **Progressing**: a defensive assignment that is never failed by the detector (§6.5).
- New fields on every snapshot: `goalChampions`, `factionLeaders`, `goalReady` (empty).
- Every other field is unchanged. The Power golden is unchanged.

## Deviations and deferrals
1. **"Ready" is set by an Effect for now.** The Faction Phase (M5) writes it on a second success of an Adjudicated goal. Until then the GM can set it with the effect editor.
2. **The unattended outcome is applied by the GM** with "Apply unattended outcome" in the session's Decisive Scenes panel. M5 materializes it in the Colony Turn Opening, with provenance.
3. **Derived consequences are computed in replay, not stored as Effects:** champion and leader clearing on defection, and the Retired champion clearing. They are deterministic, but authoritative replay requires materialized Effects. M5 writes them when the Opening or a phase commits.
4. **"Pre-empted" collision marks (§6.4) and Active Operation (M8)** arrive with the phases that create them. The overlay type is ready.
5. **Defense is −1 if any other faction's assignment on the target is Active,** not −1 per assignment. That is the reading of §6.5; say if you want stacking.


## Addendum (2026-10-15, later): Momentum decision and Progress milestones (BOARD-GAME-REVIEW §18.1)

**M3 engine revision (model change):**
- **Accomplishments no longer send an automatic +1 Momentum signal.** This covers explicit status effects, the detector and unattended outcomes.
- **A Keystone lost or Destroyed by an Effect with `Origin` FactionPhase or GoalGenerator** sends no signal. One recorded from play (Manual) still sends −1.
- `MomentumRule` drops `goal-accomplished` and gains `critical-success` / `critical-failure`. M5 writes those per attempt, from natural 12 / natural 2.
- **Tests updated:**
  - the Ledger theft in play is −1 for the Witnesses and nothing for the thief;
  - an Accomplishment sends no signal;
  - new: an operation-origin Keystone loss sends no signal, and the same loss in play does.
- **Snapshot golden: no diff.** The fixture has no such signals.

**Progress milestones (approved in principle, now implemented):**
- **Fields:** `FactionGoal.ProgressMilestone`, `ProgressConsequence` and `ProgressDiscovery`, added by migration `M4_ProgressMilestones` (additive, nullable). The whole migration chain was tested on a fresh copy of the live DB; all 36 goals are preserved.
- **Contract:** a **Planning** goal needs a milestone and its discoverability before it can be nominated. A Progressing goal has already passed its milestone.
- **Editor:** a milestone section (milestone, world consequence, discoverability), plus the setback note.
- **Card:** "MILESTONE: …", or "ACHIEVED: …" once Progressing, with the consequence and discoverability in the tooltip.
- **Setback:** a goal status effect back to Plotting returns the goal to Planning and clears Ready to Resolve (replay). No new state.
- **Data work for you:** all Planning goals now show "Needs progress milestone, milestone discoverability" until authored.

**Results:**

| Check | Result |
|---|---|
| vitest | 120/120 |
| `ng test` | 122/122 |
| `server.Tests` | 13/13 |
| Development build | succeeds |

## Addendum (2026-10-15, latest): the Goal model simplified (BOARD-GAME-REVIEW §18.2)

**Why:** goal authoring had become encounter writing. A goal now says what the faction wants, what progress looks like and what success looks like; everything else lives in Colony Turns, Events and play.

**Data (migration `M4_SimplifiedGoals`, tested on a copy of the live DB):**
- **Renamed, data kept:**
  - `ProgressMilestone` → `ProgressingWorldState`;
  - `OutcomeText` → `CompletedWorldState`.
- **Dropped:** `Attempt`, `Opportunity`, `Discovery`, `UnattendedOutcome`, `UnattendedText`, `DeadlineTurns`, `ProgressConsequence`, `ProgressDiscovery`.
  - All eight were empty on all 36 goals in the live DB, so nothing is lost.
  - On the test copy, text placed in the two renamed columns survived the migration.
- **Kept:**
  - `OutcomeMode`, shown as **Auto-Resolve** (Automatic = Yes). It stays an enum so the Faction Phase's frozen inputs (`fp-1`) and the verifier are unchanged.
  - `GoalStatus.Stalled`, kept as a legacy value so the stored integers do not shift. It is no longer offered.
- `GoalUnattendedOutcome` was deleted.

**Rules:**
- **Eligibility:** no description is required. An Auto-Resolve goal needs a target the app can apply; that is the only requirement.
- **Ready to Resolve is a GM task.**
  - Removed: lead counting, the `Engaged` state, the `leadAvailable` effect, deadlines, `deadlineDue` and `unattendedEffects`.
  - `GoalReady` is now `{ sinceSession }`.
- **Opening `op-3`:** the unattended-outcome step was removed from the client engine and the C# verifier. Opening records committed earlier (`op-2`) keep their Effects; replay folds Effects, not inputs.
- **Determinism (the planning agent's question):** yes, the World States are plain descriptions.
  - Resolution reads status, priority, Auto-Resolve, target, defense, Power, Momentum, seed and dice. It never reads text.
  - The Progressing World State is frozen into the Faction Phase inputs only so the card can show "Now true: …".

**UI:**
- **Goal editor** (`faction-detail`), in sections:
  - Goal Type: Type, plus an Auto-Resolve on/off switch for Achieve goals (no description).
  - General Info: Title, Champion, Priority, Visibility, and Status as a progress control.
  - Goal Info: the target.
  - World Info: Progressing and Completed World State, for Achieve goals only.
- **Maintain goals:** the editor shows only the protected target (Character or Asset, no state or controller), and the status is just "In force" or the end states.
- **Goal card:** "WHEN PROGRESSING / NOW TRUE", "WHEN COMPLETE / NOW TRUE", "Ready to Resolve", and an "Auto-Resolve" or "GM resolves" badge.
- **Sessions:** the Decisive Scenes bar is now **Resolution tasks**: Accomplished / Failed / Remains Progressing, with the Completed World State shown.
  - It lists the goals that are Ready **when play begins**, that is, after the session's own Colony Turn. Before, it used the end of the previous session, which missed tasks raised by this session's Turn.
  - The GM's effects go to a "Resolutions" Event.
- **Colony Turn card:** no unattended section. A goal reaching Progressing shows "Now true: <Progressing World State>".

**Verification:**

| Check | Result |
|---|---|
| e2e, fresh copy of the live DB | 45/45 |
| vitest | 147/147 |
| `ng test` | 149/149 |
| tsc | clean, app and specs |
| Development build | succeeds |
| `server.Tests` | 20/20, vectors regenerated: 40 Openings at `op-3` |
| Snapshot golden | unchanged |

- **e2e:**
  - it no longer authors milestones;
  - with no goal text at all, 19 goals are eligible and 7 are not;
  - the Defection Check assertion now tolerates crises already present in the copied campaign.
- **Tests replaced:** the unattended-contract, deadline, lead, engaged and unattended-Opening tests. They now check that:
  - a goal that does not Auto-Resolve needs nothing;
  - Auto-Resolve without an applicable target is ineligible;
  - a Ready goal waits indefinitely;
  - the Opening writes no goal Effects;
  - "Accomplished" writes the target when there is one.
- **Production build:** it still fails on the same budget errors as before this change. `faction-detail.component.scss` grew by about 0.8 kB.

The live DB was not touched. It is still at M6, and `M4_SimplifiedGoals` applies when you next start the server.

## Addendum (2026-10-15, latest+1): goal completion by any source (BOARD-GAME-REVIEW §18.3)

**User ruling:** completion by any source is permanent. This supersedes D4-5: credit is no longer a condition, and the Satisfied overlay is gone.

**Engine (`replay.ts`, `goals.ts`):**
- **Detector:** an Achieve goal is Accomplished when its target condition goes **false → true**, whoever caused it.
  - `conditionHeld` records whether each goal's condition held at the last detection; it is seeded from the baseline.
  - Goals not yet introduced are skipped (pre-existing gap, fixed here).
  - Accomplished stays terminal: reversing the condition later does not undo it.
- **Removed:** `isCredited` and the `satisfied` assessment.
- **Added:** `attributionOf`, and the snapshot field `goalAccomplishedBy` (faction id, `'party'`, a participant, or null), projected onto goals as `accomplishedBy`.
- **Attribution sources:**
  - **From the detector:** the actor of the causing Effect, else a Helping participation in the same Event.
  - **From an explicit Accomplished status Effect:**
    1. the Effect's own actor;
    2. else the Effect that changed the target in the same Event;
    3. else, for an operation-origin Effect, the goal's faction;
    4. else a Helping participation;
    5. else null.
- **Correction:** a status Effect away from Accomplished clears the attribution.
- **"Target already holds"** replaces Satisfied: the condition is true without a transition. It is an ineligible reason, flagged for the GM to retire or edit the goal.

**UI:**
- **Goal card:** "Target already holds" replaces the Satisfied badge. Resolved goals show "ACCOMPLISHED BY: <faction / Party / not recorded>".
- **Effect editor:** the actor picker is now "caused by". It adds a **Party** option, so the party can be recorded as the cause. Its tooltip no longer mentions credit. Effect descriptions name the party correctly.

**Verification:**

| Check | Result |
|---|---|
| vitest | 154/154 |
| `ng test` | 156/156 |
| e2e, fresh copy of the live DB | 45/45 |
| `server.Tests` | 20/20 |
| tsc | clean |
| Development build | succeeds |

- **Tests:** the credit tests were rewritten as ten "completion by any source" tests covering:
  - the faction, the party, a Helping participant, and no actor;
  - Planning → Accomplished;
  - permanence;
  - no completion without a transition (flagged), and completion once the condition is brought about again;
  - an operation's single outcome;
  - a GM-resolved goal without a target.
- **Ledger test:** it now also checks the thief's attribution.
- **Snapshot golden, regenerated:** the only difference is the new `goalAccomplishedBy` field, `{}` in all seven snapshots. No goal status or any other value changed.
- **The server is unaffected:** detection is client replay only.

## Addendum: faction-goals.csv in the simplified model

**Problem:**
- The export had no Auto-Resolve or World State columns.
- The import rebuilt each goal from the row alone. Re-importing a goal therefore reset Auto-Resolve to Yes, erased both World States, and dropped any field the file does not carry, such as `introducedAtEventId`.

**Change:** the mapping now lives in `core/utils/goal-csv.ts`, which `factions.component.ts` uses for both directions.

**Columns:**

```text
Id, FactionId, FactionName, Title, ConditionType, AutoResolve, Status, Priority, Visibility,
ChampionId, ChampionName, TargetEntityType, TargetEntityId, TargetEntityName, TargetState,
TargetOwnerFactionId, TargetProperty, TargetOperator, TargetThreshold,
ProgressingWorldState, CompletedWorldState
```

- `AutoResolve` is Yes/No. It is blank on Maintain rows.
- The name columns are for reading only. `ChampionName` is new.
- There are no removed-field columns.

**Import rules:**
- **Matching:** by header name, so column order does not matter.
- **Missing columns:** a column missing from the file keeps the existing goal's value. Older exports re-import without loss; a new goal from an old file defaults to Auto-Resolve Yes.
- **Status** accepts "Planning" for Plotting.
- **Auto-Resolve** accepts Yes/No, true/false, y/n, 1/0 and Automatic/Adjudicated.
- **Editor rules applied:**
  - A Maintain row drops Auto-Resolve and the World States.
  - A Retired goal's champion is unassigned.
- **Fixed:** a `TargetThreshold` of 0 is no longer treated as empty.

**Verification:**

| Check | Result |
|---|---|
| `goal-csv.spec.ts` | 6 tests |
| vitest | 160/160 |
| `ng test` | 162/162 |
| Development build | succeeds |

The six tests cover:
- the export shape;
- a full round trip with commas, quotes and line breaks in the World States;
- an older export keeping existing values;
- the accepted words;
- a Maintain row dropping Achieve-only fields;
- a threshold of 0.
