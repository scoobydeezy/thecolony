# Goal architecture audit: implementation (BOARD-GAME-REVIEW §18.6)

**Status:** uncommitted on `main`. Brief and rulings: the planning agent's audit request and its response (2026-10-17).

## 1. Power 0–3 (AU-1, AU-2)
- **Formula:** `power.ts` Power = qualifying channels; type `0 | 1 | 2 | 3`.
- **Power 0:** the Faction Phase allocates no tokens (allocation already drew `max(0, Power)` tokens; the verifier is unchanged).
- **Tooltip:** the faction detail tooltip now says "Power = qualifying channels = Priority tokens drawn".
- **People** was already monotone (top-three average, missing members = 0). A new test adds members one by one to a roster of fewer than three.
- **Power golden fixture (`colony-2026-10-14.power.golden.json`):** only `power` changes, by −1 for every faction and snapshot. The exception is EGRESS in the early snapshots, where it qualifies on all three channels (the old cap at 3 had hidden that), so it stays at 3.
- **Real campaign, after Session 7:**

  | Faction | Old Power | New Power |
  |---|---|---|
  | Aspis | 3 | 2 |
  | Cult | 1 | 0 |
  | EGRESS | 3 | 2 |
  | Order | 3 | 2 |
  | Dawn | 3 | 2 |
  | Shattered | 2 | 1 |
  | Witnesses | 2 | 1 |

  17 Power becomes 11.

## 2. Auto-Resolve without a structured target (AU-3)
- **Eligibility:** the eligibility gap "needs a target the app can apply" (§18.2) is removed (`contractGaps` is gone).
- **Engine (fp-2):** it already wrote only the Accomplished status for an Accomplished goal without a machine target, so it is unchanged.
- **What returns to the pool:** *Sunset the Dawn*, *Gain Momentum* and *Twilight the Dawn*, until their targets are revised (section 7).

## 3. Earliest Act (AU-4)
- **Data:** `FactionGoal.EarliestAct` (int, default 2); migration `M4_EarliestAct` is additive and gives existing rows 2.
- **Eligibility:** `assessGoal(g, w, currentAct)` adds "Not yet eligible (from Act N)". The Faction Phase builder passes the session's Act; views pass the viewed (or latest) session's Act.
- **What it does not affect:** the detector, Session Events and GM resolutions.
- **UI:** an Earliest Act select in the goal editor (Achieve goals), and a "From Act N" badge on the goal card.
- **CSV:** an `EarliestAct` column (I/II/III; reads I/II/III, 1/2/3 or "Act II").

## 4. A Faction Phase in every Act (AU-5)
- **Server:** the Act I ban is removed. The Character Phase now follows the Faction Phase in every Act.
- **Client:** the card always prepares a Faction Phase. With no eligible goals it says so.
- **Saved Act I turns** (Sessions 1–2) are untouched.

## 5. World Conditions (AU-6)
- **Server:** the `WorldCondition` model and table (migration `M6_WorldConditions`, additive), `api/world-conditions` CRUD (campaign-scoped, deleted with the campaign), and an Effect with `targetType 'condition'`, property `state`, value `Active`/`Ended`.
- **Client:**
  - replay records `conditionStates` (the latest Event to establish or end each condition);
  - `core/sim/conditions.ts` evaluates in force ⇔ established ∧ dependency (Asset controller and/or statuses; another condition, cycle-safe) and gives the reason;
  - the Sessions page has a **World Conditions** panel (in force at the viewed point, with reasons, and an editor);
  - each session card has a "Now in force / No longer in force" bar;
  - "Condition" is an effect target;
  - the Colony Turn Review and saved-turn results list the conditions the turn switched.
- **Snapshot golden fixture:** the only difference is the new `conditionStates: {}`.
- **Results component:** the results board moved into `colony-turn-results.component` (the card's styles exceeded the production budget). The card is now 7.4 kB, a warning only.

## 6. Verification

| Check | Result |
|---|---|
| vitest | 186/186 |
| `ng test` | 188/188 |
| tsc | clean |
| Development build | succeeds |
| `server.Tests` | 21/21 |
| e2e, fresh copy of the live DB, migrations applied | 60/60 |

- **New tests:**
  - Power 0, and each channel +1;
  - People monotone;
  - Power 0 allocates nothing;
  - a transfer recalculates both factions, with no Power Effect;
  - narrative-only Auto-Resolve;
  - Earliest Act gating, and that it never restricts the world;
  - Damaged and Contested targets still defended;
  - World Conditions: the Dead Drop loot chain by status, the two Cult modifiers by control (and both together), the Chest → gifts dependency, Event establish and end with provenance, a dependency that fails, cycles, determinism;
  - the CSV Earliest Act column.
- **e2e:**
  - an Act I turn with a Faction Phase is accepted;
  - only Act I goals are eligible in Act I;
  - Power is 0–3 (Cult 0);
  - Power 0 allocates nothing;
  - World Condition CRUD;
  - a Registry transfer switches a condition on;
  - an Event-established condition carries its provenance.

## 7. Simulation (`tools/beat-sim/experiments12.py`, 1000 runs each)

**Setup:** new `colony_sim.py` options (`power_base`, `power_min`, `earliest`, `use_outcome_mode`, `accept_ready`, `checks_in_cp`); the defaults reproduce every earlier report. `export.py` carries `outcomeMode` and `earliestAct`.

| Real campaign | Power share 0/1/2/3 | Power spent per turn, Acts I / II / III | Developments per turn | GM tasks per turn | Accomplished by the end | Momentum changes | Act I developments (Reading goals) |
|---|---|---|---|---|---|---|---|
| Legacy (1 + channels, Faction Phase in Acts II–III) | –/19/24/57% | 0 / 15.9 / 10.4 | 0 / 4.4 / 2.4 | 0 / 1.2 / 0.8 | 4.1 | 9% | 0 |
| **New, every goal Act II (the migration default)** | 17/25/43/14% | 0 / 10.8 / 7.9 | 0 / 3.2 / 2.2 | 0 / 0.8 / 0.8 | 3.2 | 5% | 0 |
| New + Abide in Act I | same | same | same | same | 3.3 | 5% | **0** (the Cult has Power 0) |
| New, every goal from Act I (upper bound) | 21/22/43/14% | 10.9 / 8.9 / 5.1 | 3.3 / 2.5 / 1.2 | 0.8 / 0.8 / 0.5 | 4.1 | 6% | 9.8 (**1.9**) |
| New, GM accepts every Ready goal | 17/25/41/17% | 0 / 10.8 / 8.0 | 0 / 3.2 / 2.2 | 0 | 9.9 | 5% | 0 |

**Findings:**
- **No unexpected volatility.** With fewer attempts, Momentum moves less: changes on 5–6% of turn boundaries, against 9%. The share of factions at ±2 by the end is unchanged at about 19%. Character results are unchanged: about 5.7 sessions with a crisis, about 1.6 defections.
- **Act I is empty under the Act II default.** Even with the example assignment, *Abide* cannot run while the Cult has Power 0 (rebalancing will decide).
- **Act I with everything allowed:** about 3 developments per turn. The Reading's three goals (*Complete the Ritual*, *Stop the Ritual*, *Take out the Keeper*) develop about 1.9 times before Session 4.
  - All three are Auto-Resolve No, so this means milestones and Ready tasks, never a resolved Reading.
  - Pre-emption therefore only happens if you assign those goals to Act I.
- **Preparation burden:** about 3 developments and 0.8 new resolution tasks per turn in Act II, and about 2.2 and 0.8 in Act III. Every GM task waits for you (there is no unattended outcome). Accepting them all during the turn raises Accomplishments from 3.2 to 9.9 per campaign.
- **Goal exhaustion:** low. About 13–17% of open Achieve goals are Accomplished by the end; idle faction-turns are 44% under the Act II default (Act I plus the Power-0 factions).

**Synthetic worlds** (new rules; Earliest Act II, then Act I; full table in the run output):
- **weakened:** every faction has Power 0 and nothing happens (correct).
- **equal:** every faction has Power 1.
- **dominant:** one faction has Power 3 and the rest 0.
- **factions_12:** about 20 Power per turn, linear in the number of factions.
- **Momentum** changes on 4–8% of boundaries in every world.
- **Synthetic goals** have no Auto-Resolve setting, so all are Automatic and raise no GM tasks.

## 8. Not done (owner review)
- **Data proposals:** the five numeric-target goals and the Fractured Objects goals (see the report to the user).
- **Live DB:** it is unmigrated. `M4_SimplifiedGoals`, `M4_EarliestAct` and `M6_WorldConditions` apply at the next server start. No World Conditions exist until you add them.

## Addendum: CSV byte-order mark (found while checking a goals file)

**Bug:** files saved by spreadsheet apps begin with a UTF-8 byte-order mark, so the first header read `\uFEFFId`. The Id column was never found, and every row would have been imported as a **new** goal (duplicates) instead of updating its goal.

**Fix:** `csvHeaderMap` now strips the mark and trims headers. The function is shared, so the goals, factions, characters and assets imports are all fixed.

**Test:** a spreadsheet-saved file still matches goals by Id.
