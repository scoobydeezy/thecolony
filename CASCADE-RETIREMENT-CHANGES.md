# Cascade Rules and Stress Triggers retired; Stress derived from World Conditions (BOARD-GAME-REVIEW §18.10)

**Status:** uncommitted on `main`.

**Rulings this implements (2026-10-19):**
- retire both systems;
- all Stress is impermanent: Stress = clamp(Σ in-force condition contributions);
- remove the baseline Stress, and replace the Relationships Stress slider with a simulation slider;
- clear the test campaign's sessions and Colony Turns;
- the Faction Phase brings conditions into force through the state it changes.

## 1. What was configured, and its effect
| Configuration | Effect on history |
|---|---|
| Cascade Rules "Momentum Streak ×2" and "×3" | Never fired: streak rules were retired in M3, and they target Legitimacy |
| Cascade Rule "Leaderless" | Never fired: it filters on the character type `FactionLeader`, which doesn't exist, and targets raw Momentum, which nothing reads |
| Stress Trigger "Test" (an Asset becomes Destroyed → +1) | Never fired: no Asset was ever Destroyed |

Retiring both systems changes no recorded result. The only interpretation that changes is Stress: the six recorded Stress Effects are now inert.

## 2. Engine (`core/sim/replay.ts`)
- **Removed:**
  - the cascade passes (threshold and event rules, two passes) and the Stress Trigger pass;
  - `parseCascadeRules` and `parseStressTriggers`;
  - their helpers, and the pre-session values they needed.
- **Goal detection** runs once, after the session's Effects. The second call is gone: nothing derived can change the world after it.
- **Stress:**
  - `colonyStress = clamp(Σ in-force contributions)`; nothing accumulates.
  - Colony and asset `stress` Effects are ignored.
  - The snapshot loses `stressRecorded`, `derivedEffects` and `firedStressTriggers`.
  - `stressFromConditions` parts gain an `origin`.
- **`conditions.ts`:** `ConditionStatus.origin`; `conditionStress()` returns `StressPart`s.
- **Colony Turn inputs:** before any session, Stress comes from the conditions in force at the start.

## 3. Client
- **Settings:** the Session Effects (Cascade Rules) and Stress Triggers tabs are removed, along with their editors, `or-value-row` and `rule-checks.ts` and its spec.
- **Store:**
  - `baselineStress` (the conditions in force at the start) and `viewStressBreakdown { total, parts }`.
  - Relationship scoring is factored into `scoreRelationshipsAt`.
  - New `relationshipsAtStress(stress)` for the simulation.
  - `cascadeRules` is removed.
- **Relationships page:** a **Stress Simulation** slider. It is never disabled and never saves.
  - While simulating, the slider's card shows the actual Stress, with a "Reset to actual" button.
  - The breakdown modal says "After Stress (N, simulated)".
  - The CSV export is named `relationships-simulated-stress-N.csv`.
- **Header badge tooltip:** each in-force condition, its Stress and its origin, then the total, marked "(clamped)" when clamped.
- **Sessions page:**
  - The derived-effects bar is removed.
  - World Condition chips show "+N Stress" when a condition comes into force, and "−N Stress" when it ends.
  - The Colony Effect target is removed (its only property was Stress); colony markers still display.
  - Session impact no longer counts Stress.
- **Effects:** the Stress Effect is removed from Colony and Asset Effects.
- **Session Log:** the Stress change field is removed. **Party CSV:** the Colony Stress column is removed.

## 4. Server and migration (`RetireCascades_PureStress_ClearHistory`)
- **Columns dropped:** `ColonyStates.ColonyStress` and `SessionLog.ColonyStressChange`. The Live lock, the seed data and the scoring code are updated.
- **Scoring:** the server scores at `ScoringEngine.ServerStress = 0`. It has no Stress, and the client re-scores every relationship at the derived Stress.
- **Kept:** `RulesConfig.CascadeRulesJson` and `StressTriggersJson` stay as inert data.
- **History cleared** (SQL first, before the table rebuilds):
  - ColonyTurnPhases, ColonyTurns, NarrativeEventRealizations, EventEffects, Events and Sessions;
  - RulesVersions tied to an Event;
  - `IntroducedAtEventId` cleared (it was already null everywhere);
  - `HistoryVersion` incremented.
- **Lost with the history:** the 14 Map Edits Events, i.e. the recorded character moves and map placements. Baseline placements stay.
- **Backup:** `colony-data/colony.db.bak-20261019-before-history-clear` (a copy of the live database, taken before any change).
- **Verified on a copy:** 0 Sessions, Events, Effects and Turns. Kept: 11 Factions, 47 Characters, 30 Assets, 36 goals, 37 Locations, 30 narrative events and 79 map placements. Both retired JSON configs are intact, and EF raised no warning.

**The live database is migrated the next time you start the app.**

## 5. Tests

| Suite | Result | Notes |
|---|---|---|
| vitest | **209 pass** | Retired-behaviour tests removed: 3 cascade tests in `momentum.spec`, 3 cascade and trigger tests in `replay.spec`, and `rule-checks.spec`. Replaced by: the stored rules and triggers never change a snapshot; a recorded Stress Effect is inert; pure Stress with clamp, fall-off and origins |
| `ng test` | **211 pass** | |
| `server.Tests` | **25 pass** | |
| e2e, on a migrated copy with no history | **76/76** | Creates Session 7 when absent. New checks: Stress 0 → 3 from Totality and the breach, with origins; a legacy Stress Effect adds nothing; the retired configuration is kept; no stored Stress |

**Golden fixture regenerated:**
- The fields `derivedEffects`, `firedStressTriggers` and `stressRecorded` are removed.
- `colonyStress` goes from `0,1,1,3,4,5,6` to all zeros: the fixture's six Stress Effects (−1, +1, +2, +1, +1, +1) are inert, and it has no conditions.
- Every other field is identical, and the Power golden is unchanged.

## 6. Noticed, not changed
The character editor shows Pressure as "base + stress × 10 %", but the formula's coefficient is ×5 (`stressPressureCoefficient`). It is a display mismatch that predates this change.
