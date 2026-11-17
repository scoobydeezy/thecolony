# Mechanical Robustness Report (Revision 3 rules, plus Revision 4 candidates)

**Purpose:** mechanical validation, **not** campaign balancing.
- Every number below describes how the *rules* respond to their inputs.
- The real Colony fixture is used as one representative scenario and as a regression fixture. It is not a target.

**Scripts**
- `run_all.sh [workdir] [realdir]`: scenarios, monotonicity, sensitivity, scaling.
- `../experiments5.py`: the Revision 4 candidates.

**Run counts**
- Scenarios: 2000 runs per configuration.
- Sensitivity: 500 per point (250 on the threshold grid).
- Scaling: 1000 per row (500 for the large casts).
- Monotonicity: exact common-random-number replays. For each state, the Colony is deep-copied, one input is changed, and the same Beat is replayed.

**Synthetic worlds:** `fixtures.py` builds 22 worlds. Compatibility labels for each come from the app's real `scoreRelationship`, via `calib.ts`.

---

## 1. Local monotonicity

Each property's evidence is labeled by kind:
- **Invariant (exact):** proved by exact probability arithmetic, or by exhaustively enumerating the function's input space. It holds for *all* inputs.
- **Invariant (checked):** a deterministic per-state property. It is verified exactly on every sampled state, and every one of the many sampled states passed, but not all possible states are enumerated.
- **Evidence (statistical):** outcome-level behavior measured over paired simulation runs. It shows no significant violation in the tested worlds. It is **not** a proof: through pool composition and peer effects, a change to one character can in principle move long-run outcomes either way.

| Property | Kind | Result |
|---|---|---|
| More Momentum never lowers P(success) | Invariant (exact) | .167 / .278 / .417 / .583 / .722 for tiers −2…+2 |
| An Active defense never raises the opposed operation's chance | Invariant (exact) | Exact 2d6 check; stacking capped at −1 |
| A worse compatibility label never makes the Defection Check harder | Invariant (exact) | Exact at label scales ×0.5 / ×1 / ×2 and targets 7 / 8 / 9 |
| A higher channel score never lowers Power | Invariant (exact) | Exhaustive grid over channel scores |
| Higher Stress never reduces Character Beat draws | Invariant (exact) | Table: 2 2 2 3 3 3 4 4 4 5 5 |
| Power 3 ≥ 2 ≥ 1 nominations | Invariant (checked) | 0 of 10,500 exact per-state comparisons violated |
| Raising Momentum never removes a faction's same-Beat advance | Invariant (checked) | 0 of 21,000 paired replays violated |
| Removing a member never raises Power; a recruit never lowers it | Invariant (checked) | Current avg/max People: **3 violations in 65**. **Top-three sum: 0 in 65.** It is exact for top-k sums in general: removing an element never raises the sum of the k largest. |
| More Conviction never makes *that* character more likely to reach Compromised or defect | **Evidence (statistical)** | 0 significant violations across 72 characters (+20 Conviction, 300 paired seeds each) |
| More Pressure never makes *that* character less likely to become unstable | **Evidence (statistical)** | 0 significant violations across 72 characters |
| A worse label raises campaign-level defection | **Evidence (statistical)** | Monotone for the 5 highest-risk NPCs × 7 labels |

**Systemic non-monotonicity.** This is allowed and observed:
- Power 2 → 3 slightly lowers completions per Beat (.158 → .146). The third card is usually a Planning goal, which dilutes the faction's own Progressing card.
- Compromised entries move in a sawtooth with Stress under the Revision 3 draw table. They fall within each draw tier and jump where the tier changes.

## 2. Scenario matrix

| Scenario | Question | Result | Verdict |
|---|---|---|---|
| Equal factions | Equal capability → equal opportunity? | Cards drawn per faction 5.66–5.79 (symmetric). Advances range 2.06–2.89 because targets and defenders differ. | Holds |
| One dominant faction (Power 3, Momentum +2) | Reinforcing but bounded? | It holds 33% of Power but only 25% of nominations and 23% of draws. **Goal supply caps a dominant faction.** | Holds; bounded |
| All factions weakened (Power 1, Momentum −1) | Still meaningful movement? | The pool is 7 and the board still fills. Advances fall to 11.7, driven by Momentum, not Power. | Holds |
| High-Power factions competing | Is the board the pacing constraint? | Board full in 100% of Beats. Each Power 1 faction draws 2.5 cards per campaign against ≈ 7.0 for each Power 3 faction. | Holds |
| Small covert faction | Capacity without Mandate? | Power 3 through People + Holdings, with no Legitimacy | Holds |
| Large low-competence faction | Headcount gives capacity without absurdity? | Power 1 without headcount, 2 with N = 12 (advances 0.94 → 1.90); never 3 from mass alone | Holds (inversion fixed) |
| Faction loses its leader | Degrades without collapse? | Power 3 → 2 *and* a −1 Momentum signal; advances −57%. The two penalties compound. | **Concern → see Revision 4** |
| Multiple contested Assets | Defenses, collisions and ownership consistent? | Collisions stay rare (0.17). Ready-to-Resolve creations fall 1.08 → 0.20: Critical goals crowd Minor Adjudicated goals out of nomination. | Consistent; **priority starvation noted** |
| High / base / low Conviction cast | Resistance survives stress? | Defections .18 / .42 / .71 | Holds |
| Strongly incompatible members | Defection for ideological reasons? | Labels: 25 Opposed, 5 Strained, 5 Tolerated. Defections .79 against .30 for aligned members. Compromised entries are unchanged: labels act only at the check, as designed. | Holds |
| Highly aligned members | Conflicted yet loyal? | Yes. Note: a perfect clone of a faction with balanced values scores only Tolerated. **Achievable alignment depends on how concentrated the faction's values are.** | Holds; observation |
| Mixed instability at start | States interact correctly? | Front-loaded: 2.87 defections, P(≥ 4) .32 | Correct; a balancing consideration |

## 3. Scaling

**The five-slot board is the global pacing constraint.** It holds for 7 or more factions at 1× goals or more.
- The pool is 15–30 cards, and the board is always full.
- Advances per Beat stay at ≈ 2.2 at every size.
- A 7-slot probe raises advances by ×1.44–1.49, close to the 7/5 = 1.40 expected when the board binds.
- It does not bind at 3 factions (pool 5.1), and binds only partly at 0.5× goals.

**Per-goal pace:**
- P(a given eligible goal is drawn) scales as 1/goals: .20 / .10 / .05 at 1× / 2× / 4×.
- Ready-to-Resolve creations fall to .17 at 2× goals and to 0 at 4×. This is **priority starvation** of Minor goals.

**Character Beats under the Revision 3 draw table: dilution is excessive.**
- P(an at-risk NPC is drawn) falls .69 → .33 → .10 → .05 from 0.3× to 6× NPCs.
- **Absolute** defections also fall as the cast grows (real NPCs cloned ×1/×3/×6: 0.90 → 0.43 → 0.26), because reaching Compromised needs two draws (∝ P²).
- Adding NPCs therefore makes the Colony *more* stable, which is backwards.

**Revision 4 draw rules** (real NPCs cloned; *arc* stress; defections per 10 NPCs; "sessions opening with a crisis" out of 11):

| Rule | ×1 calm / arc / rising | ×3 arc | ×6 arc | P(≥ 4) at ×6 |
|---|---|---|---|---|
| Revision 3: 2–5 draws by Stress | .23 / .24 / .25 | .04 (crisis 1.4) | .01 (0.9) | .00 |
| One card per 4 at-risk | .18 / .26 / .30 | .23 (5.8) | .22 (7.5) | .74 |
| **One card per 5 / 4 / 3 at-risk (Stress 0–3 / 4–6 / 7–10)** | **.12 / .27 / .37** | **.27 (5.7)** | **.25 (7.3)** | .83 |
| … plus a cap of 2 new crises per Colony Turn | .12 / .26 / .34 | .22 | .15 | .46 |

- The tiered rule is **per-capita invariant** and the most stress-responsive.
- The crisis cap is a deliberate table-usability limit. It bounds GM load in very large casts, at the cost of per-capita invariance there. At the current cast size it changes nothing.

## 4. Sensitivity: robust vs fragile constants

**Fragile.** These are strong levers; balancing must set them deliberately.
- **Momentum.** All-faction tiers −2 … +2 move advances 5.7 → 26.2 on the real fixture: about ±40% per tier, and accomplishments ×12. This is by design (the roll modifier), but **starting tiers dominate faction pacing.**
- **Faction Beat target.** 7 / 8 / 9 gives 19.1 / 13.1 / 8.2 advances.
- **Drift Roll target.** 7 / 8 / 9 gives Compromised entries 5.48 / 3.10 / 1.49; P(no defection) runs .18 → .63.
- **Character draw count** under the Revision 3 table (fixed 2 → 4 gives defections .46 → 1.30), and it doesn't scale with the cast. This is fixed by the Revision 4 rule.
- **Stress coefficient k.** The direction of its effect depended on the world under the Revision 3 draw table, because of dilution.
- **People and Holdings thresholds.** These affect allocation only: People ±5 moves the Power-3 share by .12–.14, and Holdings 62 sits 2 points from Shattered's 64.

**Robust**
- **Global pacing vs channel thresholds.** Across a 27-point threshold grid, total advances stay within ±3%. *Thresholds decide who gets cards, not how fast the Colony moves.*
- **Mandate 45** (it sits in a ~20-point gap), **defense −1**, and the **Defection target** (smooth, ≈ ±35% per step).
- **Label modifiers** are monotone at every scale but weak on the current cast. Avoid ×0.5: with 2d6 it degenerates, because −0.5 behaves like −1.

## 5. Simulator issues found (all in the harness, not the app)

1. Ready-to-Resolve outcomes entered collisions, contradicting review §6.4. **Fixed** by `rtr_collide=False`; the measured effect is ~0.
2. `power_score` in channel mode is uncapped (only `slots()` caps it). Harmless.
3. A faction with no named members always gets Power 1, so headcount can't apply. Harmless today (no champions).
4. The simulator generated no "leader incapable" signal from play. Scenarios inject it.
5. The detector was not modeled. **Added** (`detector=True`): satisfied goals leave the pool without a signal.

## 6. Revision 5: bounded Character Beats and goal starvation (`../experiments6.py`)

**Reproduce:** `experiments6.py <real dir> <synthetic dir>`. The real NPCs are cloned ×k; the profile is *arc* unless noted. **Draws** = rolls the GM makes per Colony Turn.

| Strategy | Draws per turn, ×1 (mean / max) | Draws at ×6 (mean / max) | Defections ×1 / ×3 / ×6 (absolute) | Crisis sessions ×1 / ×3 / ×6 |
|---|---|---|---|---|
| S0: fixed 2–5 by Stress (Revision 3) | 3.1 / 4 | 3.1 / 4 | 0.89 / 0.41 / 0.26 | 2.7 / 1.4 / 0.9 |
| S1: 1 per 5/4/3 at-risk, uncapped | 3.7 / 9 | **21.2 / 52** | 1.01 / 2.98 / 5.63 | 3.0 / 5.7 / 7.3 |
| **S2: 1 per 5/4/3 at-risk, max 5** | **3.1 / 5** | **5.0 / 5** | **0.75 / 0.97 / 0.65** | **2.5 / 2.9 / 2.2** |
| S3: 1 per 5/4/3 at-risk, max 6 | 3.3 / 6 | 6.0 / 6 | 0.89 / 1.16 / 0.84 | 2.8 / 3.5 / 2.7 |
| S4: each faction nominates its most at-risk member, draw 2–5 | 3.1 / 4 | 3.1 / 4 | 1.36 / 0.89 / 0.55 * | 4.0 / 2.9 / 1.9 |
| S5: each faction nominates 2, draw 2–5 | 3.1 / 4 | 3.1 / 4 | 1.12 / 0.93 / 0.60 * | 3.3 / 2.8 / 2.0 |
| S6: named cast only (Major + Supporting), draw 2–5 | 2.7 / 4 | 3.1 / 4 | 0.62 / 0.48 / 0.31 | 2.4 / 2.0 / 1.4 |

\* For S4 and S5, cloning creates exact ties in drift within a faction, so "most at-risk" rotates among clones. That **understates** how well S4 and S5 hold up for a genuinely larger cast.

**Readings**
- **Uncapped scaling (S1) fails operationally:** up to 52 rolls in one turn at ×6.
- **The bounded rule (S2) keeps the GM's workload at ≤ 5 rolls**, like the five-slot board. It also keeps the *absolute* number of allegiance crises roughly constant as the cast grows (2.5 → 2.9 → 2.2), instead of collapsing (S0: 2.7 → 0.9). The cost: each character's individual odds fall in a very large cast, so the spotlight is shared. At today's cast size S2 ≈ S0.
- **Who defects:** **72–92% of all defections come from Background-tier NPCs** under every strategy that includes them. S6 removes them by eligibility.
- **Crisis-cap semantics** (S1 + cap 2): "skip" ignores a capped success; "queue" honors it, and the character enters Compromised at the next Beat.
  - At ×1 the two are identical (0.95 / 0.96).
  - At ×6, queueing restores most of the suppressed defections (3.43 → 4.82).
  - **A bounded draw count makes the cap unnecessary.**

**Goal starvation** (four Act II Beats). "Zero" = share of eligible goal-Beats with **zero** nomination probability.

| World | Wildcard | Zero | Goals never nominated | P(Minor goal nominated per Beat) | Advances |
|---|---|---|---|---|---|
| Real Colony | none | 0.12 | 0 / 26 | .52 | 6.64 |
| Real Colony | colony (+1 random card from unnominated goals) | 0 | 0 / 26 | .57 | 6.67 |
| Real Colony | faction (last slot random) | 0 | 0 / 26 | .67 | 6.84 |
| 2× goals | none | **0.68** | **9 / 56** | .005 | 7.68 |
| 2× goals | colony | 0 | 0 / 56 | .034 | 7.53 |
| 2× goals | faction | 0 | 5 / 56 | .143 | 7.77 |
| 4× goals | none | **0.84** | **62 / 112** | .020 | 6.39 |
| 4× goals | colony | 0 | 0 / 112 | .030 | 6.40 |

- On today's data, starvation is mild: no goal is unreachable for the whole of Act II.
- With more goals it becomes structural: "mathematically unable to move" rather than "unlikely".
- **A single colony-wide wildcard card removes every zero-probability case without changing pacing** (the board stays at 5), and barely dilutes priority.

## 7. Revision 6: the per-faction Character Phase (`../experiments7.py`)

**The rule (S8):**
- Each faction's most at-risk eligible member always rolls. There is no random draw.
- Eligible means alive, a faction member, drift > 0 (not Steady), and not Compromised.
- A faction whose member made a Defection Check in this turn's Opening has used its opportunity.
- So there are at most 7 psychological resolutions per turn, including checks.
- **S8b** is the same rule without the Conflicted-first preference.

**Current cast, 11 Colony Turns.** Rolls = Drift Rolls + Defection Checks.

| Strategy | Defections calm / arc / rising | P(no defection), arc | P(≥ 4), arc | Crisis sessions, arc | Rolls per turn, arc |
|---|---|---|---|---|---|
| S0: fixed 2–5 (Revision 3) | 0.82 / 0.87 / 0.91 | .39 | .01 | 2.7 | 3.3 |
| S2: 1 per 5/4/3, max 5 | 0.43 / 0.77 / 0.83 | .44 | .00 | 2.6 | 3.3 |
| S4: faction nominee, draw 2–5 | 0.92 / 1.36 / 1.86 | .22 | .02 | 4.0 | 3.5 |
| **S8: per faction** | **1.67 / 2.48 / 2.89** | **.04** | **.21** | **6.1** | **6.1 (max 7)** |
| S8b: per faction, drift only | identical to S8 | | | | |

**Selection behavior (S8, arc)**
- **Persistence:** the nominee is the same character most of the time. The top nominee takes 92% of its faction's rolls; there are 1.3 distinct nominees per faction per campaign; the typical streak is the whole campaign.
- **Conflicted-first adds nothing measurable,** even with play-like Pressure noise (±5 per turn): 2.49 vs 2.45 defections. The most at-risk member leads the next one by more than the noise.
- **Leaders are not over-selected.** They take 16.5% of nominations while being eligible in 37% of faction-turns.
- **Departures spread across factions.** No faction loses 3 or more members in any run. Crises per faction range 0.6 (Order) to 2.1 (Cult).
- **Revolving-crisis loop:** with "failed check → Conflicted", the same character reaches 3+ crises in **54%** of campaigns.

**Faction growth** (jittered members; *arc*):

| Members per faction | S0 defections | S2 defections | **S8 defections** | S8 rolls per turn |
|---|---|---|---|---|
| ~5 | 0.89 | 0.75 | 2.43 | 6.1 |
| ~20 | 0.34 | 0.81 | 3.25 | 6.6 |
| ~100 | 0.07 | 0.23 | 3.58 | 7.0 |

- **S8 is the only strategy whose workload is bounded *and* whose drama does not collapse as factions grow.**
- Defections rise mildly with faction size and saturate. That is an extreme-value effect: a larger faction's most troubled member is more troubled.

**After a failed Defection Check** (S8):

| Rule | Defections calm / arc / rising | Someone with ≥ 3 crises, arc |
|---|---|---|
| → Conflicted (decided) | 1.67 / 2.48 / 2.89 | 54% |
| **→ Stable** | **1.41 / 2.16 / 2.43** | **21%** |
| → Conflicted + sits out the next nomination | 1.55 / 2.37 / 2.67 | 32% |
| → Stable + sits out the next nomination | 1.41 / 2.06 / 2.33 | 4% |

**Downstream effect (arc):**

| | S0 | S8 → Conflicted | S8 → Stable |
|---|---|---|---|
| Champion goals orphaned per campaign | 0.85 | 2.39 | 2.07 |
| Leader defections per campaign | 0.09 | 0.33 | 0.29 |
| Faction advances per campaign | 13.9 | 13.7 | 13.8 |

The board still binds, so losing champions reshapes **who** moves, not **how much** the Colony moves.

## 8. Revision 7: Character Phase stabilization and the wildcard's effect on Power (`../experiments8.py`)

**Setup**
- The approved Revision 6 Character Phase: per faction, highest Drift Risk, deterministic ties.
- A failed Defection Check → **Conflicted** in all variants.
- Members are jittered when factions grow. 1500 / 500 / 150 runs at ×1 / ×4 / ×20.

**Variants**
- **V1:** Revision 6 as it stands.
- **V2:** plus a one-phase exemption after Conflicted → Stable.
- **V3:** plus permanent Reaffirmation (Compromised, later Stable, without defecting).

**Current cast** (×1), calm / arc / rising:

| Measure | V1 | V2 | **V3** |
|---|---|---|---|
| Crises per campaign | 5.5 / 8.8 / 10.5 | 5.0 / 7.8 / 9.5 | **4.7 / 7.6 / 9.4** |
| Defections | 1.67 / 2.48 / 2.89 | 1.46 / 2.18 / 2.60 | **1.43 / 2.16 / 2.56** |
| Distinct characters reaching Compromised | 3.6 / 5.7 / 6.7 | 3.4 / 5.3 / 6.3 | **3.5 / 5.7 / 6.8** |
| Crises per crisis character | 1.55 / 1.56 / 1.60 | 1.48 / 1.48 / 1.51 | **1.35 / 1.36 / 1.39** |
| Most crises for one character | 2.33 / 2.66 / 2.81 | 2.16 / 2.46 / 2.63 | **1.91 / 2.24 / 2.47** |
| Campaigns with someone at ≥ 3 crises | .39 / .54 / .63 | .31 / .44 / .51 | **.22 / .33 / .42** |
| Reaffirmed per campaign | — | — | **1.5 / 2.1 / 2.0** |
| Distinct nominees per faction | 1.1 / 1.3 / 1.3 | 1.2 / 1.7 / 1.9 | **1.3 / 1.7 / 2.0** |
| Factions with no eligible nominee, per turn | 2.4 / 0.9 / 0.7 | 2.8 / 1.2 / 0.8 | **3.0 / 1.3 / 0.9** |
| Rolls per turn | 4.6 / 6.1 / 6.3 | 4.2 / 5.8 / 6.2 | **4.0 / 5.7 / 6.2** |
| **Re-crises without reaching Stable** (share of all crises) | 1.4 / 2.3 / 2.9 (.25–.28) | 1.2 / 2.0 / 2.6 (.24–.27) | **1.2 / 2.0 / 2.6 (.25–.27)** |

**Growth** (*arc*), V1 → V3:

| Members per faction | Defections | ≥ 3 crises | Distinct nominees | Reaffirmed |
|---|---|---|---|---|
| ~20 | 3.18 → 2.99 | .60 → .42 | 1.4 → 2.2 | 2.5 |
| ~100 | 3.52 → 3.45 | .73 → .55 | 1.4 → 2.3 | 2.9 |

Rolls stay ≤ 7 at every size. Empty factions fall to 0 as factions grow.

**The edge case, stated explicitly.** About a quarter of all crises (25–29%) are **re-crises that never pass through Stable**: Compromised → failed check → Conflicted → re-nominated → Compromised.
- The stabilization rules cannot touch this path, by design.
- Under V3, every character with 3+ crises got there through at least one such re-crisis, because any return to Stable after a crisis Reaffirms.
- It is now **the dominant remaining source of repeat crises.** No rule change is proposed.

**Wildcard and Power.** Draws per Beat for the highest-Power factions ÷ draws for the lowest-Power factions:

| World | No wildcard | Uniform over goals | Uniform over factions | **Power-weighted faction** |
|---|---|---|---|---|
| Real Colony | 2.60 | 2.17 | 2.30 | **2.59** |
| 2× goals | 2.93 | 2.71 | 2.72 | **2.97** |
| Dominant faction | 2.91 | 2.58 | 2.65 | **2.84** |
| High-Power factions | 3.06 | 2.33 | 2.57 | **2.85** |

- **Every variant** eliminates never-nominated goals and leaves pacing unchanged.
- **The wildcard reaches the board** about 0.3 times per Beat (0.5 in small pools).
- **The uniform-over-goals wildcard favors goal-rich, low-Power factions:** +28% draws for a Power-1 faction in the high-Power world.
- **The Power-weighted wildcard preserves Power's proportions.**
