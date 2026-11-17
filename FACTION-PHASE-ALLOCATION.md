# Faction Phase: Power as an allocation budget vs the five-card draw (2026-10-15)

**Question:** the planning agent's proposal.
- Each faction draws Power-many tokens from its eligible goals' priority tokens (Critical 3, Major 2, Minor 1).
- A goal rolls up to its allocation, stops at its first success, and advances at most once per Turn.
- There is no Colony-wide five-card board.

**This is mechanical validation, not balancing.** No constant was tuned to an outcome. The operation target is shown at 8 (current), 9 and 10 only as a **pace lever**.

**Reproduce:** `tools/beat-sim/experiments9.py <real workdir> <synthetic dir>`.
- The simulator gains `fp_mode='alloc'` and `alloc_tokens`.
- The default path is verified identical: 0 of 300 campaigns differ.

**Setup:**
- Rev 7 + D7-1 (decided); 8 Faction Phases (Acts II–III); 600 campaigns per cell.
- **Real** = current DB copy (26 Achieve goals: 3 Critical, 17 Major, 6 Minor).
- **Synthetic** = `robustness/fixtures.py` worlds at 0.5× / 1× / 2× / 4× goals.

## Results (real world)

A **development** is a goal that advanced this turn: a milestone (Planning → Progressing), an Accomplishment, or a decisive scene (Ready to Resolve). It is the GM's preparation unit.

| Model | Rolls / turn | Developments / turn: mean | p90 | max | Goal stock finished by S12 | P(advance \| eligible) | End tier +2 |
|---|---|---|---|---|---|---|---|
| draw5 (Rev 7) | 5.0 | **1.74** | 3 | 5 | 24% | 0.07 | 8% |
| draw5 + Power wildcard | 5.0 | 1.71 | 3 | 5 | 22% | 0.07 | — |
| **alloc, target 8** | 11.7 | **4.23** | 7 | 12 | **78%** | 0.21 | **31%** |
| alloc, target 9 | 14.0 | 3.22 | 5 | 12 | 54% | 0.15 | — |
| alloc, target 10 | 15.8 | 2.04 | 4 | 7 | 27% | 0.09 | 13% |

**Developments per Faction Phase, by session (alloc, target 8):**

| Session | S5 | S6 | S7 | S8 | S9 | S10 | S11 | S12 |
|---|---|---|---|---|---|---|---|---|
| Developments | 5.2 | 5.3 | 5.2 | 5.1 | 4.6 | 3.7 | 2.8 | 2.1 |

They fall as the goal stock runs out. Under draw5 they are flat at about 1.7.

## Findings

**1. Structurally sound.** Every eligible goal is live, factions act independently, and nothing is shut out by rank.
- Goals never attempted in Act II: 21% (draw5) → 11% (alloc) on the real data.
- The per-Turn load is bounded by **total Power** (≤ 21 rolls) instead of by a board of 5. A goal advances at most once per Turn in both models, so the narrative window is unchanged.
- D4-6′ (the wildcard) becomes moot under allocation.

**2. Pace roughly 2.4× at the current target.**
- On the real data: 4.2 developments per turn vs 1.7, and 78% of all Achieve goals finished by S12 vs 24%.
- The p90 turn has 7 developments; the worst has 12. The five-card draw had a hard ceiling of 5; allocation has none below total Power.
- **Pace is one dial:** the operation target, or equivalently the token counts.
  - Target 10 restores today's pace (2.0 / turn, 27% of stock), but with about 16 rolls per turn, which the app should roll.
  - Target 9 sits between (3.2 / turn).

**3. Goal stock depletes.** At target 8:
- the real factions finish most of their goals by Act III;
- Power goes **unused** (no tokens left to draw) in 24% of cases, and 53% in the half-goals world;
- sustaining the model needs roughly 1.5–2 newly authored goals per turn, each with its milestone and outcome contract.

That is the true preparation burden, together with the developments per turn.

**4. Priority softens; it does not vanish.**

| First Faction Phase, P(advance) | Critical | Major | Minor | Critical ÷ Minor |
|---|---|---|---|---|
| draw5 (base world) | 0.11 | 0.10 | 0.03 | 3.7× |
| alloc (base world) | 0.31 | 0.25 | 0.14 | 2.2× |

- On the real data almost every goal is Major (17 of 26), so Priority barely differentiates anything: alloc gives 0.22 / 0.20 / 0.19.
- A faction does not *choose* to concentrate. Concentration is a token draw: a Critical goal receives Power about 1.3× as often as a Major.

**5. Momentum compounds.**
- More Accomplishments mean more +1 signals. At target 8, **31% of faction-ends sit at +2** (vs 8%).
- Momentum adds to every attempt: a +2 faction with 3 attempts succeeds 98% of the time (2d6 + 2 ≥ 8 → 0.72 per roll).
- The ±1-per-Opening cap slows this but does not stop it. At target 10 the +2 share is 13%.

**6. Defense is weaker under concentration.**
- −1 on each attempt takes one roll from 0.42 to 0.28, but three attempts only from 0.80 to 0.63.
- Defensive assignments matter relatively less against Critical goals.

**7. Wasted Power is small:** 2–8% of Power is spent on attempts after a success.

**8. Dilution exists, as the agent predicted, but stays bounded.**
- Per-goal advance chance falls 0.31 → 0.17 → 0.07 at 1× → 2× → 4× goals.
- Developments per turn plateau near the total-Power bound: 5.1 → 7.2 → 6.5.
- At 4× goals, 55% of goals still go untried in Act II (80% under draw5).

## On milestones (§4–5 of the proposal)

**Strongly recommended, under either model.** It makes every first success a playable fact. It maps directly onto M4.

**New goal fields:**
- `progressMilestone` (text);
- `progressDiscovery` (what reveals it);
- optional **declared milestone Effects**: e.g. introduce an insider character, set a Location state, add a Faction relationship bump. They are written on the first success, Origin = FactionPhase, exactly as Automatic outcomes write the final target.

**Invalidation (the arrested insider).** No new state is needed: an explicit Event sets the goal back to Planning (`status → Plotting`, and Ready clears), with a reason.
- If the milestone has a machine-readable condition (e.g. "insider Alive and in the faction"), the Board can flag **"milestone undone"** as a derived warning, the way obsolescence is flagged now. The GM confirms the setback; nothing regresses automatically.
- A goal that is Ready to Resolve whose milestone is undone is resolved by the GM as Failed or set back to Planning.

**Cost:** 26 milestones plus their discovery leads now. Under allocation at the current pace, also the new goals that replace finished ones.

## Decisions this raises
1. **Adopt allocation?** It is mechanically sound and replaces D4-6′.
2. **Pace:** how many developments per session do you want to prepare? About 2 (target 10), about 3 (target 9), or about 4–5 (target 8; more goals finish, so more goals to author). Or keep the five-card draw at about 1.7.
3. **Momentum compounding** at fast paces: accept it, or revisit the tier modifier's size together with the pace.
4. **Milestone fields and the invalidation rule:** adopt as above (independent of 1–3).
5. **Physical dice:** at 12–16 rolls per turn, in-app rolling should be the default; physical dice stay an option per roll.
