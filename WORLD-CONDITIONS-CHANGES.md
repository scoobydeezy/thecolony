# World Conditions: requirements, Stress, Location states, milestone state (BOARD-GAME-REVIEW §18.9)

**Status:** uncommitted on `main`. No faction, character, champion, goal or constant was changed to fit an outcome.

**Rulings this implements (2026-10-19):**
- typed requirements, including another condition; no Event predicates;
- no Stress-dependent predicates;
- no scope field;
- Location state as a transient state;
- additive Stress;
- relationship Stress fixed now;
- an optional milestone state on goals;
- the test campaign's history need not be preserved.

## 1. Model and migration (`WorldConditions_Requirements_LocationStates`)
- **`WorldCondition`:**
  - `RequiresAssetId`, `RequiresOwnerFactionId`, `RequiresAssetStatuses` and `RequiresConditionId` are dropped.
  - `RequirementsJson` (a JSON list, default `[]`) and `StressContribution` (int, default 0) are added.
  - Existing conditions lose their old dependency, per the history ruling.
- **`FactionGoal.ProgressingTargetState`** (nullable) is added.
- **`LocationState`** is now `Stable | ActiveIncursion | Unstable`.
  - The migration first sets every Location to Stable: the old numbers (Active, Abandoned, Ruined, Unknown) would otherwise map onto the wrong meanings.
  - The `UPDATE` runs before the WorldConditions table rebuild, so EF raises no warning.
- **Controller:** `WorldConditionsController` refuses (400) a condition whose requirements name itself.
- **Verified on a copy of `colony.db`:** all 37 Locations are Stable, and the new columns are present.

## 2. Evaluation (`core/sim/conditions.ts`, rewritten)
- **Requirement kinds:**

  | `kind` | Fields |
  |---|---|
  | `assetController` | `assetId`, `factionId` (`''` = no one) |
  | `assetStatus` | `assetId`, `statuses[]` |
  | `characterState` | `characterId`, `states[]` |
  | `characterFaction` | `characterId`, `factionId` |
  | `leaderCapable` | `factionId`, `capable` |
  | `locationState` | `locationId`, `states[]` |
  | `condition` | `conditionId`, `inForce` |

- **Logic:** requirements are ANDed; a state list within one requirement is OR.
- **`conditionWorldAt(snapshot | null, base)`:** reads the snapshot's maps, or the base entities at the baseline. It reads recorded state only.
- **`evaluateConditions(conditions, world, names)`:**
  - It returns, per condition: whether it is established, whether its requirements hold, whether it is in force, its Stress, and a reason that lists each requirement with "holds" or "does not hold".
  - It is cycle-safe.
- **`conditionStress()`** sums the in-force contributions.

## 3. Colony Stress
- **Replay** (`buildColonySnapshots(..., locations, conditions)`) evaluates the conditions at the end of each session, then sets:
  - `colonyStress = clamp(recorded + Σ)`;
  - `stressRecorded` = the recorded value;
  - `stressFromConditions` = the parts.

  The recorded accumulator is separate, so contributions never compound.
- **Store:** `viewStressBreakdown`, plus `viewColonyStress` derived from it. The baseline includes the conditions in force at the start.
- **Relationships** are re-scored on the client in every view, the Baseline included.
- **Header badge:** it now shows the viewed Stress (both its value and its colour band). Its tooltip lists the recorded value, each condition's contribution, and whether the total was clamped.
- **Colony Turn inputs** (`CampaignWorld.conditions`, fetched by the service) use the same Stress.

## 4. UI
- **World Conditions panel (Sessions):**
  - a requirements editor: add or remove a requirement, choose its kind, then its entity and states or its toggle;
  - a Stress contribution field;
  - each row shows "+N Stress"; the header shows the total.
  - Save is disabled until every requirement is complete.
  - A condition cannot require itself: it is not offered in its own condition list.
- **Locations:** the new state badges and labels ("Active Incursion"). Location state Effects accept only the new values.
- **Goal editor:**
  - "At Progressing, set target status/state (optional)" appears for Achieve goals with a chosen Asset or Character target.
  - It omits the final target state, and the value is dropped on save if it equals that state.
- **Goal CSV:** a `ProgressingState` column. A file without the column keeps the stored value.

## 5. Faction Phase fp-3
- **Input:** `FpGoal.progressingState`, frozen only while the goal is Planning.
- **Effect:** on a Progressing outcome with an Asset or Character target, the target status/state Effect (attributed to the faction, GoalGenerator) is written immediately before the goal's Progressing status.
- **C#:** `ColonyTurnEngine.cs` adds `FpGoal.ProgressingState` and the same Effect, and bumps the version to `fp-3`. Saved fp-2 turns keep their records, but a new commit must be fp-3.
- **Vectors:** regenerated. 60 Faction Phases; 157 goals carry a milestone state, producing 20 milestone Effects. The C# verifier reproduces all of them.

## 6. Tests

| Suite | Result | Notes |
|---|---|---|
| vitest | **216 pass** | `conditions.spec.ts` rewritten: every kind, AND/OR, negation, Totality, Location Active Incursion, cycles, a removed condition, and Stress with its clamp and no compounding. Also a fp-3 milestone test and a CSV round trip |
| `ng test` | **218 pass** | |
| `server.Tests` | **25 pass** | |
| e2e, on a DB copy | **74/74** | New checks: creation with requirements and Stress; a condition requiring itself is refused; Totality plus a Location in Active Incursion; Stress = recorded + 3; a requirement on a deleted condition; the milestone state is stored |

- **Golden fixture regenerated.** The only difference is the two new snapshot fields: `stressRecorded` equals `colonyStress` in every snapshot, and `stressFromConditions` is empty because the fixture has no conditions.
- `effect-defaults.spec` now expects the Location default `Stable`.
