# Faction Phase brief: persistent Momentum with critical dice signals (2026-10-15)

**This is mechanical validation, not balancing.** The Faction Phase implementation is unchanged.

**Reproduce:** `tools/beat-sim/experiments11.py <real workdir> <synthetic dir>`.
- The simulator gains `mom_model='crit'`, `mom_cap`, `crit_band` and `ops_keystone`.
- All earlier paths are verified identical: 0 of 200 campaigns differ.

**Setup:**
- Power allocation 3/2/1, one advance per goal per Turn, target **9+**.
- Rev 7 + D7-1; 8 Faction Phases (S5–S12); 500 campaigns per cell.
- Your GM-set starting tiers (Order +1, Dawn +2, Shattered −1) unless stated otherwise.

**Candidate as specified:**
- Persistent −2…+2 track.
- A natural 12 always succeeds (+1 signal); a natural 2 always fails (−1 signal). Every actual roll is its own root cause; unused rolls send nothing.
- Signals are deduplicated, netted, capped ±1 per Opening, and clamped ±2.
- Accomplishments by operations or unattended outcomes send no signal.
- Keystone losses, leader loss and GM-declared successes or setbacks still signal.

## Headline

The candidate works. It is persistent, bounded, and independent of Priority, the target and Momentum itself, with one exception that needs a ruling.

**The exception: as specified, it drifts negative.** On a neutral roster the mean falls from 0 to −0.36 by S12 (−0.16 on average).

**Cause:** criticals are symmetric (+2.86 / −2.88 per campaign), but **Keystones lost to another faction's operation send the owner −1 (2.5 per campaign) with no positive counterpart.** The old +1 for accomplishment, which used to balance it, is gone.

**Two clean fixes, both tested:**

| Keystone lost to an operation | Neutral-roster mean (average → S12) | Changes per Turn | Power 1 / 2 / 3 changes |
|---|---|---|---|
| Owner −1 (as specified) | −0.16 → −0.36 | 15% | 7% / 13% / 19% |
| **No signal: operations move Momentum only through criticals (recommended)** | **−0.02 → −0.03** | 11% | 7% / 10% / 14% |
| Transfer: owner −1, taker +1 (same root) | −0.03 → −0.06 | 19% | 9% / 18% / 23% |

**Recommendation: "No signal".** It is your stated principle exactly: *operations generate Momentum through exceptional dice; play generates it through exceptional world consequences.*
- A Keystone lost **in play** (Darkwing, or a scene) still sends −1.
- A Keystone lost to a rival's **operation** already costs the owner through **Power** (the Holdings channel), so the consequence is not lost. It is measured where it belongs.
- **"Transfer"** is the alternative if you want offscreen Keystone politics to move Momentum. It is zero-sum, livelier, and makes Power-3 factions more volatile.

All numbers below use the recommended "No signal" variant unless stated otherwise.

## A. Is Momentum active enough?

**Criticals:** 0.69–0.79 per Faction Phase across all factions (your estimate was 0.72), about 6 per campaign.

**After aggregation, a faction's modifier changes in 11% of Turns:** about once every 9 Faction Phases, about 0.9 times per faction per campaign. Across the Colony that is about 0.8 Momentum movements per Turn.

| Measure | Neutral starts | Your starting tiers |
|---|---|---|
| Distribution −2 / −1 / 0 / +1 / +2 | .02 / .14 / .70 / .13 / .01 | .03 / .18 / .45 / .19 / .14 |
| Openings with signals (net + / net − / cancelled, per campaign) | 2.7 / 2.9 / 0.1 | 2.4 / 2.7 / 0.1 |
| Stay at ±2 (mean run) | about 3 Faction Phases | +2: 5.7; −2: 3.8 |
| From −1 or below, back to ≥ 0 within 2 Faction Phases | 12% | 9% |
| Self-reinforcing? | No. Criticals are independent of Momentum; from +1 or above, moves up and down are about equal (the ±2 clamp aside) | same |

**Verdict: persistent, not frozen, but quiet.**
- **Starting tiers dominate.** An all +2 start is still +1.2 at S12; an all −2 start is still −1.7. Your seven starting tiers (O-3) will shape most of the campaign. Given earlier findings (about ±40% advances per tier), set them deliberately.
- **±2 is rare from neutral (1–3%).** It needs two same-sign criticals with no offsetting one.
- **If you want more life,** a diagnostic band (natural 11–12 / 2–3, 1/12 each) doubles the change rate (28%) and the recovery rate (15%). It is a lever, not a recommendation.

## B. Does Power create a volatility imbalance?

| Mixed roster (neutral starts) | Power 1 | Power 2 | Power 3 |
|---|---|---|---|
| Criticals per Faction Phase | 0.056 | 0.103 | 0.152 |
| Modifier changes per Turn | 7% | 10% | 14% |
| Mean modifier | −0.04 | +0.01 | −0.01 |
| Time at 0 | 80% | 69% | 59% |

- **No mean disadvantage** for small factions once the Keystone drift is removed. As specified, Power-3 factions averaged −0.21, because they also lose more Keystones.
- **The difference is volatility only:** Power-3 factions move about twice as often.
- **This is an acceptable expression of institutional activity.** No correction is warranted.
- **Power-1 factions are mostly static** (0 for 80% of Faction Phases). Their swings come from play events.

**Concentration:**
- Early stopping means a concentrated goal rolls less often. Criticals per allocated Power are 0.055 / 0.047 / 0.041 with 1 / 2 / 3 attempts allocated.
- Concentration therefore lowers Momentum exposure by up to 25%.
- **Priority portfolios are unbiased:** Critical-heavy −0.06 vs Minor-heavy −0.12 (as specified; criticals 0.106 vs 0.104 per Faction Phase).

## C. Is the ±1 cap still appropriate?

- The cap binds in **1–3%** of Openings that have signals (6% under "transfer").
- Removing it changes nothing measurable: the distribution, change rate and run lengths are identical to two decimals.
- **Keep it**, as you prefer. It costs nothing and still guards against stacked play events.

## Operation target (choose for pace; Momentum is unaffected)

Momentum's distribution and change rate are the same at 8+, 9+ and 10+. Criticals are independent of the target.

| Target | Developments per Turn (p90) | Milestones + automatic + Ready | Rolls | Goal stock finished by S12 |
|---|---|---|---|---|
| 8+ | 4.0 (8) | 2.20 + 1.06 + 0.77 | 10.4 | 56% |
| **9+** | **3.4 (6)** | **1.91 + 0.83 + 0.64** | 12.6 | 45% |
| 10+ | 2.5 (4) | 1.49 + 0.52 + 0.51 | 14.7 | 32% |

**At 9+:** factions out of goals at the last Act II phase, 1% (16% in the half-goals world). The real scene-preparation load is about 0.6 decisive scenes per Turn.

**"Always succeeds / always fails" matters only at the extremes.**
- At 9+, a natural 2 can never succeed anyway.
- A natural 12 is forced to succeed only when the modifier and defense would otherwise put it below target: at 10+, −2 Momentum with −1 defense.

## Starting conditions and the Reading branches (recommended variant)

**Asymmetric starts persist:** a split of +2 ×3 and −2 ×4 stays split all campaign (as specified, −0.29 throughout).

**Reading stopped:**
- **Order:** the −1 setback takes it from +1 to 0, where it stays (+0.02 at S12).
- **Dawn:** +2 holds (+1.73 at S12).
- As specified, the Order instead sank to −0.82 by S12, through Keystone drift.

**Reading completed:** the mirror image (as specified: Order +2 → +0.96, Dawn +1 → +0.77).

## Comparison with the earlier candidates (real campaign, 9+)

| Model | Changes per Turn | −2 / −1 / 0 / +1 / +2 | From ≤ −1 back to ≥ 0 within 2 | Notes |
|---|---|---|---|---|
| **Criticals, Keystone-by-operation no signal (recommended)** | 9% | .03 / .18 / .45 / .19 / .14 | 9% | Persistent and unbiased. Your starts dominate |
| Criticals, as specified | 14% | .08 / .17 / .46 / .17 / .12 | 6% | Negative drift from Keystone losses |
| Baseline signals (M3) | 15% | .08 / .07 / .42 / .16 / .26 | 2% | Runaway: +2 sticks, −2 traps |
| B as specified | 44% | .10 / .34 / .43 / .08 / .04 | 44% | Downward ratchet; Priority-biased |
| B centered + memory, map 2/4 | 38% | .02 / .15 / .60 / .13 / .10 | 61% | Neutral, but needs probability arithmetic |
| A, equal penalties | 62% | .05 / .36 / .26 / .14 / .19 | 58% | Relative and noisy |

## Implementation notes for M3 and M5
- **Per attempt, record:** the natural dice (d1, d2), the modifier and defense, the total, the degree of success (Critical Failure / Failure / Success / Critical Success), and its signal. The root cause is the attempt id.
- **Keep Priority and criticality distinct in code and UI.** A goal has a `priority`; an attempt has a `degree`. Do not name either "critical" generically.
- **Signal rules at the Opening:**
  - criticals from attempts;
  - Keystone lost or Destroyed **in play**;
  - leader incapable or left;
  - GM-declared major success or setback.
  - **No automatic signal** from an Accomplishment, or from a Keystone lost to an operation (recommended).
- **Resolution:** deduplicate by root and sign, net, cap ±1, clamp ±2. Already implemented in M3, minus the accomplishment trigger.

## Decisions for you
1. **Adopt the critical-signal Momentum model?**
2. **Keystones lost to a rival's operation:** no signal (recommended) or transfer.
3. **Activity:** natural 12/2 only (quiet, persistent) or the wider 11–12 / 2–3 band (twice as lively).
4. **Keep the ±1 cap** (recommended; it rarely binds).
5. **Target 9+** for pace (about 3.4 developments per Turn).
6. **Starting tiers (O-3):** since they persist most of the campaign, a deliberate review of the seven values is worthwhile.
