# Relationship scoring audit (2026-10-15)

**Question:** does `scoreRelationship` measure ideological similarity? This audit covers the mathematical behavior only. It is not campaign balancing.

- **Code audited:** `client/src/app/core/services/scoring.service.ts` and `dot` / `inverseVector` / `deriveBeliefs` in `core/models/types.ts`.
- **Reproduce:**
  - `tools/beat-sim/scoring_audit.ts`: the app's real function over a 0.1 ternary grid.
  - `tools/beat-sim/scoring_audit.py`: the threshold-free checks.
  - Both run on an `export.py` dump of a DB copy.
- **Unchanged:** the Drift vector and the Value representation.

## Current formula

```text
belief  = Σ over axes  agree(source, target) × source.values[axis]       agree ∈ {+3 match, −2 conflict, 0 if either is middle on Knowledge/Ritual}
value   = 5.5·dot(s, t) − 3·dot(s, 1 − t)
score   = belief·(1 − w) + value·(1 + w)        w = stress weight; then the stress tilt; then the manual bump
```

## Findings

### A1. The conflict term is not independent (confirmed algebraically)

`inverseVector(t) = (1 − tₐ, 1 − t_b, 1 − t_c)`, and Values sum to 1. So:
- dot(s, 1 − t) = 1 − dot(s, t);
- **value = 8.5·dot(s, t) − 3**.

"Alignment" and "conflict" are the same measurement under two names. The two scales act as one slope plus one offset. The value term is zero at dot = 0.353.

### A2. The dot product measures shared emphasis, not similarity (confirmed)

For a fixed source, dot(s, t) is linear in t, so it is maximized at the corner of the source's largest Value, not at the source's own position. A twin scores Σsᵢ², which is at most max(sᵢ), with equality only at a corner.

| 0.1 grid (66 positions) | Current |
|---|---|
| Positions whose identical twin is their best Value match | **6 / 66** (the corners and near-corners) |
| (closer, farther) target pairs where the closer one scores lower | **10.2%** |
| Range of the twin score | −0.1 (centre) … 5.5 (corner) |
| Twin score below the Friendly line (2) | 48 / 66 |

How much a source can discriminate depends on how extreme it is:

| Source | Score with its twin | Best match | Spread over all targets |
|---|---|---|---|
| centre ≈ (0.3, 0.3, 0.4) | −0.1 | 0.4 at a corner | 0.8 |
| (0.4, 0.4, 0.2) | 0.1 | 0.4 at (0, 1, 0) | 1.7 |
| (1, 0, 0) | 5.5 | itself | 8.5 |

A moderate source can barely tell anyone apart, and always prefers a zealot to its own twin.

**Roster consequence: real factions' Value score against an identical copy of themselves**

| Faction | Score vs own twin |
|---|---|
| Order | 3.7 |
| Shattered | 2.5 |
| Witnesses | 2.3 |
| Aspis | 1.3 |
| Cult | 0.5 |
| **EGRESS** | **0.0** |
| **Dawn** | **0.0** |

The EGRESS members are geometrically very close to EGRESS (normalized distance 0.09–0.12, similarity 0.76–0.82), yet their current Value scores are 0.1–0.26. This is the root of the EGRESS-Tolerated result. The middle-belief rule only adds to it.

**Threshold-free check: for how many NPCs is their own faction the best Value match?**
- Current: **17 / 39**. Most misses go to the extreme factions: Order ×8, Shattered ×9, Witnesses ×4.
- Geometric similarity: 30 / 39.

This is a diagnostic of what each measure tracks, not a target.

### A3. Belief weights double-count the deriving Value and make one pole inert (confirmed)

Derived beliefs come from the Values, and agreement is then weighted by the source's Value on that axis. Each axis is derived from two Values but weighted by only one. So the pole derived from the *other* Value is nearly weightless:

| Derived belief (threshold 0.5) | n | Weight, mean | Weight, max |
|---|---|---|---|
| Knowledge Revealed (from Truth) | 9 | 0.63 | 0.76 |
| Knowledge Hidden (from Agency) | 10 | 0.31 | 0.45 |
| Knowledge Controlled (middle) | 26 | 0.26 | 0.48 |
| Ritual Bad (from Agency) | 9 | 0.59 | 0.73 |
| **Ritual Good (from Truth)** | 9 | **0.14** | 0.25 |
| Ritual Necessary (middle) | 28 | 0.26 | 0.45 |
| Change No (from Stability) | 12 | 0.67 | 0.90 |
| Change Yes (Stability < 0.5) | 35 | 0.24 | 0.47 |

Two consequences:
- A Truth-driven "Ritual is Good" belief is almost mechanically irrelevant to the person holding it.
- Only 3 of 141 belief slots are explicit overrides. **Nearly every character belief is derived**, so these properties apply to nearly the whole cast.

### A4. Derived middles are absence of conviction, not moderation (confirmed)

- A derived middle on Knowledge or the Ritual means "neither Truth nor Agency ≥ 0.5". It is a fallback, not a declared position.
- The Change axis has no derived middle at all: Stability < 0.5 always derives "Yes".
- **Explicit beliefs (all faction beliefs, and the 3 overrides) can be told apart from derived ones.** So "declared middle = a position; derived middle = no opinion" is implementable without any new data.

### A5. Directionality comes only from beliefs today

- The Value term is symmetric: dot(s, t) = dot(t, s).
- A → B differs from B → A only through the source-weighted belief term.

## A candidate that passes the structural tests (an illustration, not calibrated)

```text
similarity  sim(s, t)  = 1 − 2·D(s, t)          D = ½·Σ|sᵢ − tᵢ|  (0 identical … 1 opposite corners)
opposition  opp(s → t) = Σ sᵢ · max(0, sᵢ − tᵢ)  how much of what the SOURCE cares about the target lacks
value       = α·sim − β·opp
```

| 0.1 grid | Current | sim | sim − opp |
|---|---|---|---|
| Twin is the best match | 6 / 66 | 66 / 66 | 66 / 66 |
| Closer target scores lower | 10.2% | 0% | 0% |
| Max asymmetry, A→B vs B→A | 0 | 0 | 0.50 |

- **Directionality from the opposition term:**
  - a zealot (1, 0, 0) viewing the centre: opp 0.67;
  - the centre viewing the zealot: opp 0.22.
- **Reads as:** "purists resent the lukewarm more than the reverse." That is plausible, but **it is a modeling claim to accept or reject**, not a mathematical necessity.
- **Geometric bound:** the centre is within distance 2/3 of every position, so sim ≥ −1/3 from the centre. A moderate can never be strongly opposed on Values alone; opposition from a moderate has to come through beliefs. That follows from the geometry itself, not from this formula.

## Belief options to decide (not tested on labels yet)

1. **Middle semantics.** A three-position matrix (same +, adjacent −small, opposite −large), applied to:
   - (a) every middle, or
   - (b) only declared middles, with derived middles staying buffers (A4).
2. **Weighting.** Choose one:
   - (a) keep the source-Value weight;
   - (b) weight by the source's *conviction in that belief*: the pole's deriving Value, or 1 for an explicit belief. This removes the A3 inert pole;
   - (c) a floor or a blend.
3. **Change-axis derivation.** Give it a derived middle like the other axes, or keep it boolean.

## Suggested order
1. Decide the modeling questions:
   - opposition directionality;
   - middle semantics 1a or 1b;
   - weighting 2a, 2b or 2c;
   - the Change axis.
2. Implement the scoring changes as pure functions, with the grid properties as tests: twin best, distance-monotone, bounded asymmetry, plus a belief matrix table.
3. **Only then** calibrate α, β, the belief magnitudes and the label thresholds against the mathematical behavior, using the roster as a regression fixture. This replaces the 7 failing scoring tests (D4-3).
4. Re-run the Character Phase robustness matrix. The Defection Check uses this score, so its numbers in `robustness/REPORT.md` will move.

---

# Implementation (D4-3, 2026-10-15): model change, uncommitted on `main`

## Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Directional opposition ("purists resent the lukewarm") | **Adopted** |
| 2 | Middle semantics | **Every middle is a position.** Declared and derived beliefs score identically: an override is bookkeeping, not a different model. |
| 3 | Belief weighting | **Blend** |
| 4 | Change axis | **Three positions**, like the others |

## Formula (client `core/services/scoring.service.ts`, server `Services/ScoringEngine.cs`, kept identical)

```text
value  = valueSimilarityScale·(1 − 2·D(s, t)) − valueOppositionScale·Σ sᵢ·max(0, sᵢ − tᵢ)
belief = Σ axes [blend·s_axis + (1 − blend)/3] · { same: beliefMatch | middle vs pole: beliefAdjacent | opposite: beliefConflict }
```

The stress composition, the stress tilt, the manual bump, the label thresholds and the Drift vector are all unchanged. A disabled sign (Positive/Negative toggles) now drops every contribution of that sign, which is the server's existing behavior.

**Provisional constants**

| Constant | Value |
|---|---|
| similarity | 3.5 |
| opposition | 3.0 |
| match | +3 |
| adjacent | −1 |
| conflict | −2 |
| blend | 0.5 |

These were anchored to synthetic pairs, not the roster, with the label thresholds unchanged. All pairs are at stress 0 with derived beliefs; the scores were checked by running the anchors through the app's scorer.

| Anchor | Score | Label |
|---|---|---|
| Identical twin, anywhere including the centre | 6.5 | Aligned |
| Neighbour at distance 0.1 | 5.6 | Cooperative |
| Same Values, opposite beliefs | 1.8–2.5 | Tolerated/Friendly line |
| Centre → corner | −1.4 | Strained |
| Corner → centre | −3.4 | Opposed |
| Distance 0.4 | −1.0 | Tolerated |
| Opposite corners | −7.5 | Hostile |

The balancing pass may retune all of these.

## What changed
- **Value geometry:** `valueDistance`, `valueSimilarity` and `valueOpposition` in `types.ts`.
- **Scorer:** `beliefAgreement` (three-position matrix) and `beliefWeights` (blend) in `scoring.service.ts`.
- **One formula everywhere (the same D4-style fix as Power).** `topCompatibleFactions` and the most-aligned/most-opposed lists moved to `scoring.service.ts` and use `scoreRelationship` or its Value term. The legacy `scoreFactionCompatibility` is deleted. It had its own hard-coded 5/3/2.5/−1 constants and still treated the middle as a buffer. It drove:
  - the potential-defection lists;
  - the dashboard's "most compatible";
  - character-detail compatibility;
  - the faction member "drift risk" badge.
- **`deriveBeliefs`:** Change derives `neutral` when neither Stability nor Agency reaches the threshold. The axis `type` (opinion/boolean) is deprecated and ignored; the Values tab no longer offers Boolean, and every axis shows its Middle label. **The live campaign's Change axis middle is labeled "Neutral"; you may want a better name.**
- **Data:**
  - Migration `ScoringGeometry` (additive) adds `BeliefAdjacent` −1, `BeliefWeightBlend` 0.5, `ValueSimilarityScale` 3.5 and `ValueOppositionScale` 3.0 to `RulesConfigs`. `ValueAlignmentScale` and `ValueConflictScale` are kept but archived (unused).
  - Tested on a DB copy; the live DB is untouched.
  - **This changes behavior for existing campaigns by design.** It is the model change, not a defaulted no-op.
- **DTO / contributions:** `valueAlignment` / `valueConflict` → `valueSimilarity` / `valueOpposition`. Relationship breakdown labels updated.
- **Settings, Relationship Rules pane:**
  - A "Relationship Formula" card, moved up under the preview. It explains the score, and each input has a hint and its default.
  - New preview archetypes: identical twins, close neighbours, shared values with opposed methods, moderate → purist, purist → moderate, opposed ideologies. They replace five stale pairs: old faction ids, one pair with no beliefs, nothing showing the middle or the asymmetry.
  - Scoring Modes and Thresholds notes updated.
  - The form fills new fields from the defaults if an older payload lacks them.
- **`tools/beat-sim/calib.ts`:** now emits only compatibility, from the app's scorer. Its old Power section called removed M0-era methods.

## Tests
- **`scoring.service.spec.ts`**, rewritten. It replaces the 7 tests that were failing before M0. It now checks properties over the whole 0.1 grid:
  - twin is the best match (66/66);
  - a closer target never scores lower;
  - asymmetry is bounded;
  - the belief matrix (symmetric; same > adjacent > opposite);
  - weights sum to 1 with a (1 − blend)/3 floor;
  - declared ≡ derived;
  - Change has a derived middle;
  - the anchors;
  - stress, bump and sign toggles;
  - compatibility = the stress-0 relationship score.
- **`character.spec.ts`:** derivation expectations updated (Change middle).
- **`server.Tests/ScoringEngineTests.cs`:** the server matches client-computed values exactly (3 pairs, every contribution) and passes the twin/asymmetry properties.
- **Results:**
  - vitest 94/94 and `ng test` 96/96. **There are no failing tests anymore.**
  - `server.Tests` 12/12.
  - The development build succeeds; the production build has only the pre-existing budget errors.
- **Golden:** unaffected (relationships are not part of snapshots or Power).

## Roster regression (current DB copy; a check, not a target)

**Members toward their own faction, stress 0**

| Label | Old | New |
|---|---|---|
| Aligned | 1 | 0 |
| Cooperative | 6 | 14 |
| Friendly | 16 | 20 |
| Tolerated | 16 | 3 |
| Strained | 0 | 2 |

The two Strained members are Evin Peakwalker and Marek Cairn, both already Forgotten. They are centrists in the purist Order.

- **EGRESS members:** −0.8…−0.4 → mostly 3.9–4.2. The exception is Orlombuthalde Nix at 1.5; his Values are closer to Witnesses.
- **Order members cool:** Serevan 6.6 → 5.1; Jorren 4.0 → 2.7; Pip 3.0 → 1.7.
  - Under the dot product, the Order's extremity inflated every score involving it.
- **NPCs whose best match is another faction:** 23 → 13.
- **Structural property to note:** 9 of the remaining 13 now point at EGRESS.
  - A near-centre faction is geometrically close to everyone, so it is the natural second choice of any member who is less extreme than their own faction.
  - This mirrors the old bias toward the extremes. It is the geometry itself, not a tuning artifact.
  - Opposition softens it for purists but does not remove it.
- **Faction pairs:** 23 of 42 labels change. Hostility between distant factions sharpens (Order ↔ Shattered → Hostile; 7 pairs Tolerated → Strained). Pairs near the centre warm (Cult ↔ Dawn → Cooperative; Aspis → EGRESS and Cult → EGRESS → Friendly).
- **Party:**
  - warmer: EGRESS → Cooperative; Aspis and Dawn → Friendly;
  - colder: Order and Witnesses → Strained.

## Character Phase re-run (Rev 7 with D7-1 stabilization, real cast, 1,500 campaigns per profile)

| Stress profile | Defections, old | Defections, new | Crises, old | Crises, new |
|---|---|---|---|---|
| calm | 1.43 | 1.02 | 4.67 | 4.90 |
| arc | 2.16 | 1.59 | 7.64 | 7.95 |
| rising | 2.56 | 1.83 | 9.36 | 9.84 |

- Crises are about unchanged, because they come from Drift Risk, which is untouched.
- Fewer crises end in defection, because more members are now Friendly or Cooperative toward their own faction (Defection Check modifier −1 or −2).
- Per faction, Dawn (0.66 → 0.48 in arc) and the Cult (0.48 → 0.32) drop most. The Order rises slightly (0.08 → 0.12).
- `robustness/REPORT.md` predates this change. Its defection figures are on the old scores, and the synthetic matrix has not been re-run.
