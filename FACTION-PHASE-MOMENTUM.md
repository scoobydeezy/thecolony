# Faction Phase brief: Momentum candidates under Power allocation (2026-10-15)

**This is mechanical validation, not balancing.** No constant was tuned to the roster. The Faction Phase implementation is unchanged; this is simulation only.

**Reproduce:** `tools/beat-sim/experiments10.py <real workdir> <synthetic dir>`.
- The simulator gains `mom_model`, `mom_map`, `mom_fail_w`, `mom_center`, `mom_center_spares`, `mom_smooth`, `event_points` and `event_cap`.
- The five-card and signal paths are verified identical: 0 of 200 campaigns differ.

**Setup:**
- Allocation 3/2/1, one advance per goal per Turn, frozen inputs, target **9+** unless stated otherwise.
- Rev 7 + D7-1; 8 Faction Phases; 400 campaigns per cell.
- Real campaign with your GM-set starting tiers (Order +1, Dawn +2, Shattered −1).
- Synthetic worlds from `robustness/fixtures.py`.

## 1. Side-by-side comparison (real campaign, 9+)

The **modifier** is the Momentum bonus a faction rolls with at each Faction Phase.

| Model | Changes per Turn | Time at +2 | Time at −2 | +2 holds next Turn | −2 back to ≥ 0 within 2 Turns | r(Power, modifier) | Mean | Critical-heavy vs Minor-heavy* |
|---|---|---|---|---|---|---|---|---|
| Baseline (capped signals) | 15% | 26% | 8% | **93%** | **0%** | **+0.69** | +0.45 | +0.26 / +0.41 |
| A: leaderboard (as specified) | **63%** | 19% | 14% | 40% | 34% | +0.44 | +0.04 | **−1.15 / +0.83** |
| A: equal failure penalties | 62% | 19% | 5% | 42% | 50% | +0.30 | +0.04 | −0.13 / +0.07 |
| **B: track (as specified)** | 44% | 4% | 10% | 20% | 37% | −0.04 | **−0.38** | **−1.28 / +0.07** |
| Bn: B ÷ Power | 48% | 7% | 38% | 27% | 19% | +0.36 | −0.79 | −1.29 / −0.44 |
| B, failures weighted 0.4 | 35% | 6% | **0% (unreachable)** | 24% | 91% | +0.25 | +0.17 | +0.19 / +0.06 |
| B centered, no memory | 51% | 10% | 1% | 12% | 100% | +0.10 | +0.21 | +0.13 / +0.10 |
| **B centered + memory, map 2/4 (recommended)** | 37% | 10% | 2% | 44% (about 2 Turns) | 52% (58% on a neutral world) | +0.27 | +0.14† | −0.10 / +0.13 |
| B centered + memory, map 3/6 | 26% | 5% | 0% | 30% | 60% | +0.29 | +0.14† | +0.07 / +0.07 |

\* Equal Power 2; Aspis and Cult made all-Critical, EGRESS and the Order all-Minor; mean modifier.

† The positive mean comes from your positive starting tiers decaying. On a neutral synthetic world the mean is −0.03.

The centered rows use neutral spares (§2) and one consistent ×2 track scale. *A first pass mixed scales, which made Order's +1 start act as +2; it was re-run.*

### What the numbers mean

**Baseline: runaway.** +2 is nearly permanent (93%) and −2 never recovers, because operation failures send no signals. Momentum tracks Power (+0.69).

**Candidate A: no runaway, but volatile and relative.**
- The modifier changes almost every Turn, and 7% of Turns are big reversals (a jump of 3 or more).
- Somebody is always at +2 even when everyone fails.
- As specified, the priority-weighted failure penalties make **Critical-heavy factions sink**: they sit at −2 62% of the time.
- Equal penalties remove that bias.

**Candidate B as specified: a downward ratchet.** At 9+, a single roll succeeds 28% of the time. With symmetric ±weight scoring, the expected score per roll is **−0.44 × weight**.
- Factions drift negative, lowering their own success odds. At −2, the chance per roll is only 8%.
- **More Power means a worse modifier:** Power-3 factions spend 40% of Faction Phases at −2.
- **Critical goals are a liability:** Critical-heavy factions spend 68% of Faction Phases at −2.
- Your starting tiers last one Faction Phase.

Symmetric B is neutral only when a roll succeeds about half the time. At 8+ (42%) its mean is −0.04, but it still favours Minor-heavy factions (−0.72 vs +0.09).

**Weighting failures at the neutral 0.4** fixes the drift, but the score can then never fall below −3.6. **−2 becomes unreachable.**

**Centering** scores each attempt against its own chance, so the expected score is exactly zero. It fixes the drift and the Priority bias.
- **Without memory**, though, the modifier is pure noise: it changes 51% of Turns, with autocorrelation 0.
- **One Turn of memory** gives persistence.

## 2. Recommended Momentum: Candidate B, centered, with one Turn of memory

**Rule:**

```text
Each attempt moves the marker by   2 × Priority weight × (result − its chance)      weight: Critical 3, Major 2, Minor 1
   result = 1 success, 0 failure; chance = P(success) at the frozen modifier and defense, shown on the card
   an attempt left unused after an earlier success is a spare and scores 0 (it is never a failure)
New track = round(½ × previous track + ½ × this Turn's sum), clamped to −9..+9
```

**How it reads:** success when you were unlikely to succeed gains a lot; failure when you were favoured loses a lot. Below are the per-attempt values at weight 3 (Critical), 9+ target, on the displayed (×2) track.

| Modifier | Chance per roll | Success | Failure |
|---|---|---|---|
| 0 | 28% | +4.3 | −1.7 |
| +2 | 58% | +2.5 | −3.5 |
| −2 | 8% | +5.5 | −0.5 |

**Properties measured (map 2/4, neutral spares):**
- **Neutral by construction:** the mean on a neutral world is −0.03, with zero expected change per attempt at every modifier.
- **No runaway:** +2 holds about 2 Turns (44% chance to hold each Turn).
- **Big reversals** (a jump of 3 or more): under 1% of Turns.
- **Priority bias is small:** Critical-heavy −0.10 vs Minor-heavy +0.13.
- **Your starting tiers persist** for 2–3 Faction Phases before fading. A +2 start goes +2.0, +1.5, +0.7, +0.4, …
- **The target sets pace, not Momentum:** at 8+, 9+ and 10+ the dynamics are nearly identical.

**The inherent tradeoff.** One Turn's performance is noisy.
- **Memory buys persistence** (autocorrelation +0.6) **at the cost of range.**
- **Centering** makes the negative tail reachable mainly by **favoured factions failing**. Failing a long shot costs little. "Embarrassing failure" means failing when expected to succeed. Treat this as a modeling claim to accept or reject.

**Power still sets the range, as the brief intends.** A Power-1 faction's modifier stays near 0: it changes in 17% of Turns and never reached ±2 in testing. **Small factions' fortunes come mainly from material events** (§5). Normalizing by Power (Bn) produced a negative bias and worse dynamics.

**Spares:** neutral spares (score 0) are recommended. Counting them as successes, as the brief does, adds a small positive bias (+0.07 on a neutral world) and nothing else. Scoring them 0 already avoids penalizing early success.

## 3. Recommended modifier mapping

| Displayed track | −9 to −4 | −3 to −2 | −1 to +1 | +2 to +3 | +4 to +9 |
|---|---|---|---|---|---|
| **Roll modifier** | −2 | −1 | 0 | +1 | +2 |

**Evidence, on the recommended model:**

| Map | ±2 reachable through operations | +2 holds | Changes per Turn |
|---|---|---|---|
| **2/4** | 3–10% (+2) and 1–2% (−2) of Faction Phases | 44% | 37–42% |
| 3/6 (the brief's table) | 0–5% | 30% | 19–26% |
| 2/5 | in between | — | — |

- With 3/6, ±2 is left almost entirely to events and starting tiers.
- **Capping the modifier at ±1** flattens Momentum to near irrelevance.
- **Keep ±2.** It is self-correcting under centering. At 9+, ±2 spans an 8% to 58% chance per roll.
- **If you want ±2 to be rare, mostly event-driven states,** use 3/6 instead. That is a legitimate choice.

## 4. Preparation burden and goal exhaustion (allocation, 9+, recommended Momentum)

| Measure | Real campaign |
|---|---|
| Rolls per Turn | 12.8 (the app should roll) |
| **Distinct goals advanced per Turn** | **3.4** (p90 6, max 11) |
| ├ Progress milestones | 1.97 |
| ├ Automatic accomplishments | 0.85 |
| └ Ready to Resolve scenes | 0.60 |
| By priority per Turn | Critical 0.39 · Major 2.01 · Minor 1.03 (your goals are mostly Major) |
| P(advance) with 1 / 2 / 3 attempts | 0.28 / 0.44 / 0.64 |
| Goal stock finished by S12 | 44% |
| Act II faction-turns with no eligible goals | 0% |
| Factions out of goals at the last Act II phase | 2% (15–23% in the half-goals world) |

**Preparation (judgment, not measured):**
- Milestones are pre-authored, so the GM mostly presents them.
- The decisive scenes, about 0.6 per Turn (roughly one every other session), are the real scene-preparation load.
- Exhaustion before Act III is rare with your current inventory. It becomes material only with about half as many goals.

**Pace by target, same Momentum:**

| Target | Developments per Turn | p90 | Goal stock finished |
|---|---|---|---|
| 8+ | 4.1 | 8 | 58% |
| 9+ | 3.4 | 6 | 44% |
| 10+ | 2.4 | 4 | 28% |

## 5. Material player-driven events (minimal proposal)

**What counts.** A material event is an existing recorded Effect of one of these kinds:
- Keystone lost or Destroyed;
- leader incapable or leaves;
- GM-declared major success or setback (with a reason);
- a decisive scene resolved in play, or its unattended outcome;
- a goal Accomplished by play.

**How it applies:**
- Each deduplicated root cause is worth **±3 track points**: one modifier step from neutral under the 2/4 map.
- The net is **capped at ±3 per Opening**.
- It is applied at the Opening, **after** the Faction Phase score and memory.

**What doesn't count:** operation results. They are already in the performance score, so an operation never counts twice.

**Act I.** The track starts at the GM-set value: your seven tiers, mapped to a track inside each tier's band (−2 → −7, −1 → −2, 0 → 0, +1 → +2, +2 → +7 under 2/4). It **carries unchanged through Act I** (no Faction Phase, no memory update). Act I events move it. The first Act II Faction Phase therefore rolls with the GM-set tier plus Act I consequences.
- *Tested:* "the Reading was stopped" moves the Order's first Act II modifier from +1 to 0. It then dips to about −0.4 for three Faction Phases. Dawn starts Act II at +2 and fades over about four Faction Phases (+2.0, +1.7, +1.4, +1.0, +0.7, …).

This replaces the old signal and cascade system for Momentum. The only bookkeeping left is the deduplicated event list per Opening, which exists already.

## 6. Degeneracies found

1. **Symmetric B ratchets downward** at any target with less than about 50% success per roll.
2. **Priority weighting creates an authoring incentive.** Under symmetric B and under A as specified, the GM is rewarded for marking goals Minor. Centering, or equal penalties in A, removes it.
3. **Baseline signals run away:** +2 is permanent and −2 is a trap.
4. **A is relative.** "Best of a bad Turn" earns +2, and its Turn-to-Turn noise is high.
5. **Memoryless scoring is noise:** there is no persistence without a memory term.
6. **Power-1 Momentum is nearly static** under any range-by-Power model. This is accepted by design; events supply small factions' swings.
7. **Gaming token allocation:** none found. Allocation is seeded and not chosen per Turn. With centered Momentum, Priority carries little Momentum advantage, only reliability (more attempts).

## 7. Revised Faction Phase procedure (no new resources)

```text
OPENING
  1. Defection Checks for still-Compromised characters (unchanged)
  2. Momentum: track ← round(½·track + ½·last Faction Phase score) (skipped in Act I); then + material events
     (±3 per deduplicated root, net cap ±3); clamp −9..+9; modifier from the table in §3 (map 2/4)
FACTION PHASE (Acts II–III)
  3. Freeze: Power (channels), modifier, defenses, eligible Achieve goals (not Dormant, Ready, Satisfied, obsolete, retired)
  4. Allocate: per faction, a seeded shuffle of its goals' tokens (Critical 3, Major 2, Minor 1); draw Power-many
  5. Resolve: per goal, in draw order, roll 2d6 + modifier − defense ≥ 9, up to its allocation, stopping at the first success;
     record every attempt with its chance
  6. Collisions (same-target completions): margin, then draw order (unchanged)
  7. Commit: first success → the declared Progress milestone (Effects plus discoverability); second success → Accomplished
     (Automatic) or Ready to Resolve (Adjudicated); this Turn's Momentum score = Σ 2·weight·(result − chance), spares 0
CHARACTER PHASE and PUBLISH (unchanged)
```

## Decisions for you
1. **Momentum model:** centered Candidate B with memory, as recommended? Or B as specified at 8+ (near-neutral but Priority-biased), or A with equal penalties (neutral but volatile)?
2. **Mapping:** 2/4 (±2 reachable through operations) or 3/6 (±2 mostly from events and starting tiers).
3. **The centering claim:** failure is costly mainly when a faction was favoured. Accept it, or not.
4. **Spares:** neutral (recommended) or counted as successes.
5. **Target:** 9+ gives about 3.4 developments per Turn, including about 0.6 decisive scenes.
6. **Material events:** ±3 points per root, cap ±3 per Opening, as proposed.
7. **Power-1 factions:** accept nearly static operational Momentum (events drive them), or not.
