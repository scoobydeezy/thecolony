# Faction Phase fp-5: Priority as a roll bonus; Power shared with threatened assignments (BOARD-GAME-REVIEW §18.12)

**Status:** uncommitted on `main`.

**Rulings this implements (2026-10-21 and 22):**
- Priority becomes a roll bonus only.
- The defender's Maintain priority adds to the DC, and only the highest guard counts.
- Power is shared with Maintain assignments only while they are threatened (B2).
- A Secret goal is unknown to the defender.
- The DC is 10.

## Rule
1. **Bag.** Each faction puts one token in its bag for each eligible Achieve goal. It adds one for each **guard**: an active Maintain assignment whose target another faction's eligible, **non-Secret** goal names this Turn.
2. **Draw.** A seeded shuffle, then Power-many tokens. A drawn goal rolls once; a drawn guard defends its target.
3. **Roll.** 2d6 + Priority (Critical +3, Major +2, Minor +1) + Momentum ≥ DC (10) + the Priority of the best drawn guard of another faction on the target. Naturals 12 and 2 are as before.
4. **Collisions, outcomes and advance Effects** are unchanged.

## Code
- **Client `core/sim/faction-phase.ts`** (`fp-5`):
  - `PRIORITY_BONUS`; inputs `{ target, priorityBonus, factions, goals, guards }`.
  - `allocate()` returns `{ allocations, guarding }`; new `guardAgainst()`.
  - Attempts record `priority`, `modifier` (Momentum), `defense`, `guardId`, `total` and `dc`; the margin is total − DC.
  - `PRIORITY_TOKENS` is gone.
- **Builder `core/sim/colony-turn.ts`:** freezes the guards (active, threatened by a known goal) and the DC, `formulas.operationTarget`, now **10** by default. The flat `activeDefense` in `goals.ts` is removed.
- **Server `Services/ColonyTurnEngine.cs`:** the same rule. `FpGuard`, `Allocate` returning the guards, `GuardAgainst`. Verification also checks that the posted guards match the seed.
- **Colony Turn board:**
  - Each faction shows the guards it posted ("Guarding The Ledger, DC +2").
  - Each roll's tooltip reads: "2d6 4+3 · Priority +2 · Momentum +1 = 10 vs DC 10 + 2 (guarded by Protect the Ledger, Major) = 12: Failure".
- **Wording:** the goal editor's Maintain hint and Priority tooltip, the Power Rules text and the faction page's Power tooltip.

## Also fixed
- **Goal CSV:** an older file's `ProgressingState` column erased a goal's other first-success Effects, which is how Abide, Secure the Procession and Sunset the Dawn lost theirs in the live data. It now only sets or replaces the target-status Effect, and a blank cell changes nothing.

## Verified

| Check | Result |
|---|---|
| Simulation cross-check | The shipped engine reproduces the approved B2S DC 10 simulation exactly over the same 1,000 campaigns (`fp5-sim.ts REF` against `B2S:10`): 7.19 rolls per phase, 11% of Power guarding, 21% idle turns, 30.0 advances, 12.0 Accomplished |
| vitest | 219 pass. New tests: allocation (one token each, Power-many, Priority no longer weights the draw, guards spend Power), the roll (Priority bonus, the best guard of another faction, own guards never defend, an undrawn guard doesn't defend), the builder's guards (threatened, Secret excluded, inactive excluded, DC 10) |
| `ng test` | 222 pass |
| `server.Tests` | 34 pass. The 60 regenerated fp-5 vectors (84 posted guards, 42 guarded rolls) all verify, and a forged guard list or an undefended record of a guarded roll is refused |
| e2e, on a copy of the live database | 78/78. The S8 turn's guards were *Maintain the Book of Names* (threatened by Aspis's known goal; Dawn's Secret goal does not count) and *Protect the Ledger*, and the server accepted the commit |

## Maintain Earliest Act (2026-10-22, §18.12 FP5-8)
- **Rule:** a Maintain assignment is in force only from its Earliest Act. Before it, `assessGoal` marks it Not yet eligible, and its defence is inactive with the reason "Not in force before Act II". The Faction Phase builder doesn't offer it as a guard.
- **Migration `MaintainEarliestAct`:** existing Maintain goals go to Act I. They had the column's default of II, which was ignored because assignments were in force from the start. Verified on a copy: all 11 are now Act I, and the e2e posted the same guards (78/78).
- **UI:**
  - The goal editor shows Earliest Act for both types.
  - The goal card shows "From Act …" for both.
  - The planning grid places assignments in their Earliest Act's column, not always Act I.
  - The Goals page's Earliest Act filter covers both types.
- **CSV:** `EarliestAct` is exported and imported for Maintain rows too. A blank cell keeps the stored value.
- **Simulation:** the harness's variant rules use the same check, and the fixture's assignments are at Act I. Results are unchanged (30.0 advances, 12.0 Accomplished), and the shipped engine still matches B2S DC 10.
- **Tests:** vitest 222, with new tests for the assessment, the builder's guards and the CSV.
