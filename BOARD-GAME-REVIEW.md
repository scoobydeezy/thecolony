# Board-Game Architecture Review — Revision 7

**Status:**
- **Architecture approved** (2026-10-14).
- **M0 implemented:** see `M0-CHANGES.md`. It is uncommitted on `main`.
- M1–M3 may proceed.
- M4–M6 incorporate the Revision 4 findings in **§14**, which are pending your decisions.
- Campaign balancing is **out of scope**.

**Date:** 2026-10-14 (Revisions 1 → 7). **§17 is the consolidated Colony Turn** and supersedes §7, §8 and §16.3 (§15 still governs attribution and notice details).

**What's new in Revision 4:** §14 covers mechanical validation, the Reading branches, middle-belief scoring, unattended resolution, goal satisfaction vs credited accomplishment, transaction safety, and plan changes. Sections 1–13 are Revision 3, unchanged except where §14 supersedes them.

**Rules authority:** `Faction Goals.md` v1.0. Rules adopted here are written into it when M9 lands. They are never only recorded here.

> ⚠️ **`Faction Goals.md` is only in the macOS Trash** (`~/.Trash/Faction Goals.md`). Restore it.

**How to read this revision**
- **[Decided]** marks rules settled in the 2026-10-14 decision responses.
- **[Proposed]** marks a recommendation that still needs a yes.
- **Open** items are collected in §13. Most are data or GM tasks, not architecture questions.

**Evidence**
- `tools/beat-sim/` runs the calibration.
  - `calib.ts` calls the app's own `scoreRelationship`, `deriveBeliefs` and `FactionInfluenceService`.
  - `colony_sim.py` simulates full-campaign Colony Turns.
  - `experiments4.py` is the Revision 3 configuration.
- Calibration starts from the **baseline world**, because the 7 recorded sessions are placeholder tests.
- The horizon is the 12-session plan in `Campaign Outline.md`:
  - Act I is S1–4, Act II S5–8, Act III S9–12.
  - That gives 11 Colony Turns.
  - Four of them are Act II Faction Beats, the primary horizon.

---

## Contents

1. [Principle and operational measures](#1-principle-and-operational-measures)
2. [Revision log](#2-revision-log)
3. [Defects and findings](#3-defects-and-findings)
4. [Power: capacity channels](#4-power-capacity-channels)
5. [Momentum](#5-momentum)
6. [Goals: outcome modes, overlays, defensive assignments](#6-goals-outcome-modes-overlays-defensive-assignments)
7. [Character Beats and Defection](#7-character-beats-and-defection)
8. [The Colony Turn](#8-the-colony-turn)
9. [Campaign lifecycle: Design vs Live](#9-campaign-lifecycle-design-vs-live)
10. [Sessions, Moves, time, and Act III](#10-sessions-moves-time-and-act-iii)
11. [Calibration](#11-calibration)
12. [Implementation plan](#12-implementation-plan)
13. [Open items](#13-open-items)
14. [Revision 4: mechanical validation and goal resolution](#14-revision-4-mechanical-validation-and-goal-resolution)

---

## 1. Principle and operational measures

> **[Decided] The measure reflects the function.**
> - An operational statistic expresses its mechanical purpose directly.
> - Continuous mathematics stays where it produces valuable derived analysis.
> - There are never two competing operational representations of one concept.

| Measure | Values | Its function | Comes from |
|---|---|---|---|
| **Power** | 1 / 2 / 3 | Number of goal cards nominated | Capacity channels, frozen at the Faction Beat (§4) |
| **Momentum** | −2 … +2 | Operation-roll modifier | Capped resolution at the start of each Colony Turn (§5) |
| **Pending signals** | tokens beside the Momentum track | What the next resolution will apply | Recorded consequences (§5) |
| **Goal state** | Planning → Progressing → Accomplished (+ Failed) | Progress pips | Beat results, direct play |
| **Goal overlays** | Dormant · Ready to Resolve · Active Operation | Why a goal is not in the pool | Derived, or set by the Beat (§6) |
| **Defensive assignment** | Active / Inactive | −1 to directly opposed operations | Derived (§6.5) |
| **Instability** | Stable → Conflicted → Compromised | Proximity to a Defection Check; Compromised = a visible crisis | Character Beats, play (§7) |
| **Drift band** | Steady / Strained / Wavering / Breaking | Character Beat eligibility and Drift Roll modifier | Existing Pressure/Conviction math |
| **Compatibility label** | Aligned … Hostile | Defection Check modifier | Existing `scoreRelationship` (§7.4) |
| **Colony Stress** | 0 … 10 | **Number of Character Beat draws** (2–5) | Effects |
| **Character / Asset state** | as today | What exists and who holds it | Effects |

**Kept as derived analysis, unchanged:**
- Ternary Values and Beliefs, including overrides.
- Relationship scoring, alignment and opposition.
- Stress-weighted composition.
- Effective Pressure and Conviction.
- **The Drift vector, drift target and visualization** [Decided].
- The People / Holdings / Mandate scores behind Power.
- Trend charts.

Colony Stress has two complementary jobs:
- Through effective Pressure, it decides **who** is vulnerable. This is the existing derived math.
- Through the draw count, it decides **how widely** instability expresses itself. This is the operational job.

---

## 2. Revision log

| Topic | Revision 2 | **Revision 3** |
|---|---|---|
| Power derivation | Channels recommended | **Channels adopted** [Decided]; thresholds recalibrated to the widest gaps (§4.2) [Proposed] |
| Headcount | Feed People or drop | **Keep, with a positive capacity function** [Decided]; never an influence average (§4.3) |
| Power Modifier | Retire or convert | **Retired** [Decided] |
| Momentum timing | Resolve at Faction Beat commit | **Resolve at the start of each Colony Turn**, before the Faction Beat freeze [Decided] |
| Momentum cutover | Rounding legacy values | **GM sets seven starting tiers explicitly**; legacy raw values archived [Decided] |
| Character draws | Fixed 3 or stress-scaled | **Stress-scaled 2–5** [Decided] |
| Defection timing | Immediate or delayed | **Delayed: Compromised persists one session; the check opens the next Colony Turn, before the Faction Beat** [Decided] |
| Compatibility basis | Full relationship score | **Full `scoreRelationship`, including belief overrides** [Decided, by you] |
| Adjudicated goals | Accomplished + Outcome Due gate | **Ready to Resolve overlay; the goal stays Progressing until a played or adjudicated result** [Decided] |
| Act III | Clocks govern active operations | **A goal is in the pool or in play, never both** [Decided principle]; clock details deferred |
| Stress coefficient | Open | **×5 provisional default, configurable** [Decided] |
| Leaders | Open | **Eligible for Character Beats; no protected characters** [Decided] |
| Activation | Recommended clean start | **Archive the test history; activate from a clean baseline** [Decided] |

---

## 3. Defects and findings

### 3.1 Independent bug fixes (may proceed now)

Each fix lands as a separate change, with an annotated golden-replay diff.

| # | Defect | Fix |
|---|---|---|
| **D9** | **Character detail saves snapshot-projected values into baseline** (`character-detail.component.ts:514`, `:141`) | Re-read the baseline record on save; add a regression test. **First.** |
| D4 | Five divergent Power computations | One function, today's formula; the model change follows in M2 |
| D3 | Leaderless check tests `leaderId != null` | Test that the leader is alive and still a member |
| D12 | Belief derivation threshold: 0.4 hard-coded vs 0.5 configured | Use the configured value everywhere. *Which value is right is a separate question (O-4).* |
| D2 | "Leaderless" cascade can never match | Mark it inert; it is superseded by Momentum signals |
| D6 | Goal detector runs after cascades | Run the detector first |
| D10 | Select-type effects saved with `value: undefined` | Initialize to the first option |
| D11 | Relationships endpoint scoped by `"singleton"` | Scope by campaign |
| D14 | `app.spec.ts` asserts a title that is never rendered | Fix the test |
| D15 | Campaign delete orphans rows; import drops `LeaderId` and `AdditionalMemberCount` | Complete the mapping |
| D16 | `AdditionalMemberCount` was lost (the Order had 13 on 2026-07-12; 0 since the 08-13 squash) | Restore the values by hand (O-2) |

### 3.2 Model changes (only inside their milestone)

| Change | Milestone |
|---|---|
| Streak rules removed (D1) | M3 |
| Threshold rules become transition-only (D8) | M3 |
| Momentum: raw → tier, removed from Power (D5) | M2 / M3 |
| Maintain → defensive assignment (D7) | M4 |
| Instability track and Character Beats | M6 |
| Stress coefficient ×10 → ×5 | M6 |

### 3.3 Calibration findings

| # | Finding |
|---|---|
| F1 | The Order's +20 Power Modifier offset its Momentum drag. Without Momentum, the Order's Power needs no modifier. **→ Retired.** |
| F2 | `AdditionalMemberCount` *lowered* Power, because generic members at influence 30 were averaged in. **→ Replaced by a headcount threshold** (§4.3). |
| F3 | No NPC scores below *Tolerated* toward their own faction. Defection modifiers span −3…0 on today's roster. |
| F5 | With an immediate check, Compromised was never a resting state. **→ Delayed check adopted.** |
| F6 | With a fixed draw count, higher stress produced fewer defections (pool dilution). **→ Stress-scaled draws adopted.** |
| F7 | Both currently-Progressing Achieve goals are non-automatic. **→ With Ready to Resolve, they become decisive scenes** (§11.1). |
| **F8 (new)** | **The middle belief positions carry substantive labels, but the engine treats them as no-opinion buffers.** Knowledge's middle is "Controlled"; Ritual's is "Necessary". Two actors who both hold "Controlled" score 0, not agreement. EGRESS holds both middle positions, so its members can agree with it on only one axis. Its near-centre Values also give a value term ≈ 0. So all five members are *Tolerated* at either belief threshold (0.4 or 0.5). This is a scoring-semantics question (O-4), not data cleanup. |
| **F9 (new)** | **No defensive assignment targets a character.** *Take out the Keeper* (Vara) has no possible defender in the current data (O-7). |
| **F10 (new)** | Under widest-gap thresholds, **Shattered is the faction most likely to change Power** (0.12 times per Act II). Jorren damaging the Dead Drop Network alone takes Holdings 64 → 55, so Power drops 2 → 1. |

---

## 4. Power: capacity channels

### 4.1 Rule [Decided]

```text
Power = 1 + People + Holdings + Mandate      (each 0 or 1), capped at 3

People   = character strength ≥ T_P   OR   headcount ≥ N        (§4.3)
Holdings = asset influence score ≥ T_H
Mandate  = Legitimacy ≥ T_M
```

- **Inputs:** each channel's input is an existing continuous calculation.
- **Momentum:** not an input.
- **When it is read:** Power is evaluated at each Faction Beat freeze and stored in the Beat record.
- **On the Board:** each faction mat shows its three channel scores against their thresholds, for example "Holdings 64 / 62". The GM therefore sees which factions sit near a boundary, and why a card was gained or lost.
- **Power Modifier:** retired [Decided].

### 4.2 Thresholds [Proposed: widest-gap placement]

Place each threshold in the widest gap of the current distribution, so that small noise doesn't flip a faction:

| Channel | Current scores (sorted) | Revision 2 | **Proposed** |
|---|---|---|---|
| People | 59 61 65 ‖ 72 74 74 77 | 70 | **68** |
| Holdings | 40 52 56 59 ‖ 64 72 76 | 60 | **62** |
| Mandate | 21 33 33 ‖ 54 59 66 70 | 55 | **45** |

**Margins at the proposed thresholds:**

| Faction | People | Holdings | Mandate | Power | Nearest boundary | What flips it |
|---|---|---|---|---|---|---|
| Aspis | **+9** | **+14** | −12 | 3 | People +9 | Perrik incapable or defects: strength 77 → 58, Power 3 → 2 |
| Cult | −7 | −22 | −12 | 1 | People −7 | Strong recruits |
| EGRESS | **+6** | **+10** | **+9** | 3 (capped) | People +6 | Survives the loss of any one channel |
| Order | **+4** | −10 | **+21** | 3 | People +4 | Serevan incapable: strength 72 → 54, Power 3 → 2 |
| Dawn | **+6** | −6 | **+14** | 3 | People +6 | Julian incapable or defects: strength 74 → 56, Power 3 → 2 |
| Shattered | −3 | **+2** | −24 | 2 | Holdings +2 | Dead Drop Network Damaged: Power 2 → 1 |
| Witnesses | −9 | −3 | **+25** | 2 | Holdings −3 | Any Asset gain: Power 2 → 3 |

- These thresholds give the same Power as Revision 2 today: 3/1/3/3/3/2/2.
- The Order gains margin (+2 → +4), and EGRESS stops sitting on its Mandate line (−1 → +9).
- **Measured:** 0.22 Power changes per Act II across all factions. Almost all of them are Shattered (0.12) and Witnesses (0.07), and every one has a one-line cause.

### 4.3 Headcount [Decided: positive capacity function]

- Unrepresented members no longer enter the influence average. That was the inversion found in F2.
- Instead, `headcount = alive named members + AdditionalMemberCount`, and the People channel also qualifies at `headcount ≥ N`.
- **Reads as:** "The Order nominates through People because it is large, even without strong leaders."
- **Open O-2:** choose N, and restore the lost `AdditionalMemberCount` values. Every faction is at 0 today. Named alive membership is 5–6 per faction, so N ≈ 12 means mass is noticeable only for genuinely large institutions.

---

## 5. Momentum

### 5.1 Rule [Decided]

```text
At the start of each Colony Turn (every act), before any Faction Beat freeze:
  signals  = unconsumed Momentum Signals, deduplicated per faction by root cause
  change   = clamp(sum(signals), −1, +1)
  Momentum = clamp(Momentum + change, −2, +2)
```

- **What the next Beat's rolls see:** the previous session's play, the previous Faction Beat's results, and any defections resolved in this turn's opening all apply. All five rolls use the **new** Momentum, frozen.
- **What waits a turn:** a goal accomplished *in this turn's Beat* raises Momentum only at the next turn. Momentum measures accumulated political energy, not instantaneous success [Decided tradeoff].
- **On the Board:** pending signals sit beside the Momentum track as tokens. The GM sees what the next resolution will apply, and why.
- **One resolution per turn.** Act I uses the same rule; the Faction Beat step is simply skipped. This resolves Revision 2's D-E.

### 5.2 Signals [Decided]

| Sign | Rule | Root cause (dedup key) |
|---|---|---|
| +1 | One of the faction's Achieve goals becomes **Accomplished** (automatic outcome, resolved scene, or direct play) | The BeatAttempt, or the resolving Event's Effect |
| −1 | The faction loses control of a Keystone, or its Keystone is Destroyed | The Effect that changed the Asset |
| −1 | The faction's leader becomes incapable or leaves the faction | The state or faction Effect |
| ±1 | GM-declared major success or setback, with a reason | The declaring Event |

- No signal comes from: a failed roll, Planning → Progressing, **Ready to Resolve**, or a defensive assignment becoming Inactive.
- **Deduplication:** within one faction, signals sharing a root cause count once.
  - *Example:* when the Ledger is stolen, Witnesses get one −1 even though the Ledger was both defended and a Keystone. Shattered gets one +1.

```text
MomentumSignal { id, factionId, sign, rootCauseId, ruleId, rulesVersionId, sourceEventId, reason, resolutionId? }
Resolution Effect: Origin = MomentumResolution, property momentumTier, delta ∈ {−1,0,+1},
                   payload {signalIds, net, applied, capped}
```

### 5.3 Starting tiers [Decided]

- The GM sets the seven starting tiers explicitly in Design mode, as baseline values.
- Activation then starts from a clean history, so **no cutover Event is needed**.
- Raw `Faction.Momentum` is archived for audit and ignored by the engine.
- **Open O-3:** the seven values. The simulation used Order −2 and every other faction 0 as a stand-in.

---

## 6. Goals: outcome modes, overlays, defensive assignments

### 6.1 States and overlays

```text
Planning ──success──► Progressing ──success──► Accomplished   (terminal)
                                     │
                                     └─(Adjudicated goal)──► Progressing + READY TO RESOLVE
Any unfinished ── explicit Event ──► Failed (terminal)
```

The **stored states** stay Planning (enum: Plotting), Progressing, Accomplished and Failed. Stalled is legacy and has no rows.

**Overlays** say why a goal is not in the pool. They are never extra progress states:

| Overlay | Meaning | Set / cleared by |
|---|---|---|
| **Dormant** | Champion incapable, or not in the goal's faction | Derived; cleared by a `championChange` Effect |
| **Ready to Resolve** | An Adjudicated operation has reached its decisive moment | Set by the Beat (Effect, Origin BeatResult); cleared by the resolving Event |
| **Active Operation** | A live Act III clock is attached | Set when the clock is attached; cleared by its outcome Event (§10.3) |

> **[Decided] A goal is in exactly one arena:** the offscreen pool, or play (Ready to Resolve / Active Operation). Never both.

### 6.2 Outcome Mode [Decided]

| Mode | Second success (from Progressing) | Declared at goal definition |
|---|---|---|
| **Automatic** | Goal → Accomplished. The generator writes the declared target Effect in the same transaction. Signal +1. | A complete machine-readable Asset state or owner target |
| **Adjudicated** | Goal stays **Progressing + Ready to Resolve**. No signal. Out of the pool. A **Decisive Scene** card shows the declared `outcomeText`. | `outcomeText` and the stakes, written **before** any roll |

**Resolving a Ready to Resolve goal.** This is an explicit Event, played or adjudicated, in any later session:
- **Accomplished:** the GM records the actual consequences, or uses "resolve as declared", which writes the declared Effects. Signal +1.
- **Failed:** the operation was stopped.
- **Remains Progressing:** circumstances changed; the overlay clears and the goal returns to the pool.

This is **not** a gate on the next Colony Turn. A decisive scene may take more than one session to reach. The Board keeps it visible until it is resolved.

**Defaults and data work (O-5):**
- **Automatic:** the 18 Achieve goals with Asset state or owner targets.
- **Adjudicated:** *Take out the Keeper*, *Complete the Ritual*, *Stop the Ritual*, and the 5 faction-threshold goals. For each, author `outcomeText`, or retarget it to a concrete outcome.

### 6.3 Detector [kept]

When play makes a goal's target condition true, the goal becomes Accomplished, with provenance, signal +1, and no roll. This applies whether or not the goal is Ready to Resolve.

### 6.4 Collisions [Decided]

Incompatible same-Beat Accomplishments on one target are resolved by:
1. the highest margin;
2. then the earlier draw position.

Losers stay Progressing and are marked "pre-empted". Ready to Resolve outcomes are not Accomplishments, so they never collide; a later resolution may make them obsolete.

### 6.5 Defensive assignments [Decided]

```text
Active ⇔ champion capable ∧ champion in the assignment's faction ∧ protection condition
Asset target:     controlled by the assignment's faction and not Destroyed          [Decided]
Character target: protected character Alive (not Dead/Missing/Forgotten)           [Proposed, O-7]
Defense −1 against Achieve operations on the same target from another faction while Active.
```

- No status is written by the detector.
- Inactive ↔ Active is derived, and the assignment reactivates when its conditions are restored.
- The 10 existing Maintain rows are unchanged.
- *Note (F9):* there are no character-target assignments in the data today.

---

## 7. Character Beats and Defection

### 7.1 Scope [Decided]

- **Added:** `Character.Instability ∈ {Stable, Conflicted, Compromised}`. It changes only through Character Beats, Settling, the Defection Check, or an explicit Event in play.
- **Untouched:** Values, Beliefs, Pressure, Conviction, the Drift vector, the drift target, and the visualization. A Drift Roll never moves Values.

### 7.2 Procedure

```text
CHARACTER BEAT  (every Colony Turn, after the Faction Beat if any)
0  Freeze drift bands (existing math; Stress coefficient ×5 provisional)
1  Settle:  Conflicted characters whose band is Steady retreat to Stable           [Proposed rule]
2  Pool:    alive NPCs in a faction, band ≠ Steady, not Compromised (crisis pending)
3  Draw:    by Colony Stress — 0–2: 2 · 3–5: 3 · 6–8: 4 · 9–10: 5                    [Decided]
4  Drift Roll 2d6 + band modifier ≥ 8   (Strained −1 · Wavering 0 · Breaking +1)    [provisional]
     success → advance one state     failure → retreat one state (floor Stable)
5  Entering Compromised → crisis pending; Defection Check opens the NEXT Colony Turn [Decided]
```

### 7.3 The Compromised crisis [Decided]

- A character who enters Compromised **stays Compromised through the next session**. That is a visible crisis Darkwing can discover and act on.
- **Before the next session's play:** the GM prepares how the crisis shows (a refused order, a private approach, someone asking Darkwing for help). The simulation decides *that* there is a crisis; the GM decides *how it looks*.
- **During the session:** play may resolve it with an explicit Event. There is no mini Character Beat.
  - Talked down or recommitted → Conflicted.
  - Leaves now → `factionChange` (none) and Stable.
- **At the start of the next Colony Turn,** before the Momentum resolution and the Faction Beat:
  - every still-Compromised character makes the Defection Check;
  - so a defection can change the very next goal pool.
- **[Proposed]** The check happens even if the character's drift band has since fallen to Steady. The crisis was already in motion, and only play resolves it early.

### 7.4 Defection Check [Decided]

```text
2d6 + modifier(label) ≥ 8
label = scoreRelationship(character → current faction, stress = 0, bump = 0).label
        full relationship score: Values + Beliefs, INCLUDING manual belief overrides       [Decided]
```

| Label | Aligned | Cooperative | Friendly | Tolerated | Strained | Opposed | Hostile |
|---|---|---|---|---|---|---|---|
| Modifier [provisional] | −3 | −2 | −1 | 0 | +1 | +2 | +3 |
| P(leave) | 8% | 17% | 28% | 42% | 58% | 72% | 83% |
| Live NPCs | 1 | 6 | 16 | 16 | 0 | 0 | 0 |

- **Stress is not double counted.** Stress is 0 in the compatibility score, and Pressure is not an input.
- **Overrides count.** Belief overrides (today: Serevan and Maelyn among faction members) now intentionally affect departure odds. A hypocrite or zealot override changes how hard it is to leave.

**Success:**
- The character leaves the faction and their Instability resets to Stable.
- No automatic new membership. Plausible affiliations are listed as information only.
- Their champion goals go **Dormant**.
- If they were the leader, the faction is leaderless and a −1 signal is created. That signal is resolved in the **same turn's** Momentum step, because the check runs first.

**Failure:** the character returns to **Conflicted**.

**Leaders** stay eligible [Decided].

---

## 8. The Colony Turn

### 8.1 Order [Decided]

```text
COLONY TURN before Session N (GM preparation)
  0  Record Session N−1 play as Events (incl. any crisis or Ready-to-Resolve resolutions)
  1  OPENING    a. Defection Checks for every still-Compromised character
                b. Momentum Resolution (previous Beat + play + 1a), capped ±1
  2  FACTION BEAT (Acts II–III)  freeze → nominate (Power) → draw 5 → roll → collide → commit
                                 (signals recorded, consumed at the next Opening)
  3  derived Pressure / drift bands recompute
  4  CHARACTER BEAT              freeze → settle → draw (by Stress) → roll → new crises pending
  5  Publish Session N's starting state
Act I: steps 0, 1, 3, 4, 5.
```

### 8.2 Records and transactions

```text
Session N
 ├─ Event 0  Kind = TurnOpening     DefectionCheck rows · factionChange/instability Effects · MomentumResolution Effects
 ├─ Event 1  Kind = FactionBeat     BeatAttempt ×≤5 · goal / generator / ReadyToResolve Effects · MomentumSignals
 ├─ Event 2  Kind = CharacterBeat   CharacterAttempt ×N · instability / settling Effects
 └─ Event 3… Kind = Play
```

- **One transaction per step.** Each step freezes the state produced by the previous step's commit.
- **Every Beat Event records:** seed, frozen-input JSON with its hash, `rulesVersionId`, `engineVersion`, and status (Draft → Committed → Voided).
- **Correction rules** [Decided: these ship with the Beat]:
  - **Inspect:** every die, modifier source, nomination reason and draw.
  - **Correct:** void and re-run with the same seed, or void and re-record corrected physical dice. No in-place edits. **Voiding a step voids the later steps of the same turn**, because they froze its output, and they are re-run.
  - **Replay:** authoritative replay folds stored results. Re-running a stored seed against its stored inputs reproduces the draw (asserted).

---

## 9. Campaign lifecycle: Design vs Live

Unchanged from Revision 2 in substance [Decided]:

| | Design | Live |
|---|---|---|
| Baseline simulation fields | Editable | Locked; changed only by Effects or Correction Events |
| Descriptive fields | Editable | Editable |
| Rules | Editable; history recomputes | `RulesVersion` n+1, effective from a named Event |
| History | Resettable | Append-only; corrections audited |
| New entities | Baseline | `introducedAtEventId`; retired by Effect, never deleted |

- **Two replay modes:**
  - **Authoritative:** fold stored Effects only. Every rule-derived operational change is materialized at commit.
  - **Analytical reinterpretation:** a sandbox that re-derives consequences under other rules and shows a diff. It never writes.
- **Activation** [Decided]:
  - Archive (export) the 7 placeholder sessions.
  - Confirm the baseline, including the seven Momentum tiers and the restored headcounts.
  - Activate. This writes RulesVersion 1, and is one-way; to revert, fork the campaign.
- **Engine:** one pure TypeScript module (extracted in M0). The client computes each step's payload, and the server stores it in one transaction.

---

## 10. Sessions, Moves, time, and Act III

- **Events are the Moves; Sessions organize them** [Decided].
  - Order: `(Session.Number, Event.SortOrder, Effect.Ordinal)`.
  - Wall-clock time is never used for ordering.
- **No Beats during play,** in any act [Decided].
  - Direct play is recorded immediately.
  - Its Momentum signals wait for the next Opening.
  - Its crisis resolutions apply immediately.

### 10.3 Act III: one arena per goal [Decided principle; details deferred]

1. Between-session Faction Beats establish and advance preparations, Planning → Progressing, as in Act II.
2. When an operation reaches an actionable crisis, a **Clock card** is attached and the goal gets the **Active Operation** overlay. From then on it is not in the pool.
   - Clock card contents: deadline, unattended outcome, intervention conditions.
   - The natural trigger is Ready to Resolve: the operation's decisive moment *is* its crisis.
3. During play, only consequential outcomes are recorded as Events: succeeded, stopped, or expired → unattended outcome applied.
4. The next Colony Turn's Opening reconciles them: their signals resolve with the rest.

**Still to be designed** before M8 (`Faction Goals.md` Open Decision 8):
- clock lengths;
- which goals receive clocks at Totality;
- how Progressing maps to starting segments.

---

## 11. Calibration

**Configuration:** the Revision 3 rules throughout.
- Channels at 68/62/45; starting tiers Order −2, others 0 (stand-in).
- Opening order; delayed checks; Ready to Resolve.
- Stress-scaled draws; ×5; Settling.
- 2000 runs. *Arc* stress profile unless noted: 1 2 3 3 4 4 5 7 8 7 5.

### 11.1 Act II: four Faction Beats

| Rules | Advances | Accomplished (automatic) | Ready to Resolve (decisive scenes) | Power changes |
|---|---|---|---|---|
| Revision 2 (resolve at commit, no overlay) | 6.6 | 1.48 | — | 0.23 |
| **Revision 3** | 6.5 | **0.63** | **0.83** | 0.22 |

**Per faction** (accomplished automatically / advances / Power changes):

| Faction | Accomplished | Advances | Power changes |
|---|---|---|---|
| Aspis | 0.13 | 0.82 | 0.03 |
| Cult | 0.05 | 0.40 | 0 |
| EGRESS | 0.12 | 1.35 | 0 |
| Order | 0.02 | 0.63 | 0 |
| Dawn | 0.08 | 1.48 | 0 |
| Shattered | 0.10 | 0.87 | 0.12 |
| Witnesses | 0.14 | 0.92 | 0.07 |

**What Act II produces:**
- ≈ 6.5 visible developments: Planning → Progressing, or a goal reaching Ready to Resolve.
- ≈ 0.6 offscreen completions.
- ≈ 0.8 **decisive scenes** handed to play.
- Most of the Order's and Dawn's progress lands as scenes, because their furthest-along operations (*Complete the Ritual*, *Sunset the Order*) are adjudicated.
- *Readings:*
  - The Act's biggest outcomes are played, not rolled. That is the intended separation between creating an opportunity and achieving it.
  - The Act II pace is accepted provisionally [Decided]. Tune it after real Beats.

**Momentum timing:** the cap never binds offscreen, because signals spread across turns. Collisions occur in 0.6% of runs.

### 11.2 Campaign: 11 Colony Turns

| Stress profile | Defections (mean) | P(none) | P(≥ 4) | Sessions opening with a Compromised NPC | Crises ending without defection | Leader defections |
|---|---|---|---|---|---|---|
| calm | 0.83 | 0.40 | 0.00 | 2.6 | 1.7 | 0.06 |
| arc | 0.88 | 0.39 | 0.01 | 2.8 | 1.9 | 0.09 |
| rising | 0.93 | 0.38 | 0.01 | 3.1 | 2.0 | 0.13 |

- **A typical campaign:** about three sessions open with a visible allegiance crisis. About one of those ends in a departure; the others return to Conflicted, through a failed check or through play.
- **Stress response:** monotone in stress, as intended. Never a wave.
- **Who:** Tobin Marsh 0.22 · Nim-of-Many 0.17 · Asha Weaver 0.15 · Fenwick Bristlethorn 0.09 · Perrik Tallow (Aspis leader) 0.08 · Elias Thorn 0.05. Jorren, Damaris and Marra are ≈ 0 at ×5.
- **Belief threshold sensitivity** (O-4):

  | Threshold | Defections | Cooperative | Friendly | Tolerated | Aligned |
  |---|---|---|---|---|---|
  | 0.5 (configured) | 0.88 | 6 | 16 | 16 | 1 |
  | 0.4 | 0.76 | 7 | 23 | 8 | 1 |

  EGRESS stays Tolerated at both thresholds (F8).

### 11.3 Earlier results that still hold

- Settling eliminates stranded unstable characters.
- Asset-loss and threat Pressure barely move defections offscreen. **The faction → character loop runs mainly on Pressure recorded from play.**
- The stress coefficient mostly sets how many characters are visibly Conflicted:

  | Coefficient | Conflicted at end of arc profile |
  |---|---|
  | ×10 | ≈ 8 |
  | ×5 | ≈ 4 |
  | ×3 | ≈ 2.5 |

---

## 12. Implementation plan

```text
M0 Safety net + bug fixes ─► M1 Lifecycle & rule versioning ─► M5 Colony Turn: Opening + Faction Beat ─► M6 Character Beat
        ├─► M2 Power channels ───────────────────────────────────┤                                          │
        ├─► M3 Momentum signals & Opening resolution ────────────┤                                          ▼
        └─► M4 Goals: outcome modes, overlays, assignments ──────┘                  M7 History & reinterpretation
                                                                                     M8 Act III clocks (design first) · M9 Docs
```

**M0 — Safety net and bug fixes** *(may proceed now, on your go-ahead)*
- Extract the engine into `core/sim/`.
- Golden replay test.
- **D9 first,** with a regression test.
- Then D4, D3, D12, D6, D10, D11, D14, D15, each with an annotated diff.

**M1 — Lifecycle and versioning**
- `Campaign.Mode`, locked fields, `RulesVersion`, `introducedAtEventId`.
- `Event.Kind` (TurnOpening, FactionBeat, CharacterBeat, Play, Correction, MapEdits), `Effect.Origin`, `Effect.Ordinal`.
- A single-transaction step-commit endpoint.

**M2 — Power channels**
- Single `computePower()` returning `{power, channels: {people, holdings, mandate}, scores, margins}`.
- Headcount threshold; Power Modifier retired; mat UI with margins.
- **Tests:** the §4.2 margin table as fixtures; "Dead Drop Damaged → Shattered 2 → 1"; "Serevan incapable → Order 3 → 2".

**M3 — Momentum**
- `momentumTier` as a baseline field (GM-set); the MomentumSignal table and rules.
- Opening resolution, materialized; pending-signal tokens.
- Remove the streak rules and threshold re-fire.
- **Tests:** Ledger dedup, cap, net zero, a defection in the Opening affecting the same turn, clamp.

**M4 — Goals**
- Outcome Mode and `outcomeText` with validation; generator.
- **Ready to Resolve** and resolution Events (as declared / Failed / remains Progressing).
- Dormant overlay; the **one-arena rule** enforced in the pool builder.
- `championChange` / `leaderChange`; defensive assignments; obsolescence flags.
- **Tests:** a table per target shape; Ledger stolen and recovered; a Ready goal excluded from the pool; the detector Accomplishes a Ready goal through play.
- **Data (O-5):** outcomes for the adjudicated goals.

**M5 — Colony Turn: Opening and Faction Beat**
- Opening step (Defection Checks arrive with M6; Momentum resolution now).
- Beat records; freeze, nominate, draw, roll (in-app or physical dice), collide.
- Commit; Board and Beat panel.
- **Correction and replay guarantees,** including voiding later steps of the turn.

**M6 — Character Beat**
- `Instability`; Settling; stress-scaled draws; Drift Roll.
- Pending crisis and Decisive Crisis card; Defection Check in the Opening.
- In-play crisis resolution Effects.
- **Non-change test:** Drift vector, target and Values byte-identical across Character Beats.

**M7 — History browsing and analytical reinterpretation.**

**M8 — Act III Clock cards,** after the clock rules are written into `Faction Goals.md`. The Active Operation overlay already exists from M4.

**M9 — Documentation:** `ARCHITECTURE.md` rewritten; `Faction Goals.md` gains every adopted rule.

---

## 13. Open items

The architecture questions are closed. What remains is listed below. **Items marked ★ must be settled before activation**; none block M0–M2 work in Design mode.

| # | Item | Owner | Recommendation |
|---|---|---|---|
| O-1 | Channel thresholds | You | 68 / 62 / 45, the widest gaps (§4.2) |
| O-2 ★ | Headcount N; restore `AdditionalMemberCount` values | You | N ≈ 12; re-enter the Order's 13 and any others from your notes |
| O-3 ★ | Seven starting Momentum tiers | You | Your call; the simulation used Order −2 and the rest 0 |
| O-4 | Should matching middle positions ("Controlled", "Necessary") score as agreement? Also, the derivation threshold value (0.4 / 0.5) | You | Decide before the final Defection calibration; it shifts EGRESS and about 8 characters' labels |
| O-5 ★ | `outcomeText` for *Take out the Keeper*, *Complete/Stop the Ritual*; retarget or describe the 5 faction-threshold goals | You (data) | Write the stakes before the first Beat |
| O-6 ★ | Nhalia Lumina's goal (champion now in Aspis) | You (ruling) | Reassign, transfer, or retire |
| O-7 | Character-target assignment semantics; should anyone defend Vara? | You | The proposed condition is "Alive"; whether to add a defender is your call |
| O-8 | Drift Roll modifiers, the 8+ targets, label → modifier mapping | Tune later | Keep provisional; revisit after real Beats |
| O-9 | Act III clock rules | `Faction Goals.md` | Before M8 |
| O-10 | Settling and "check even if Steady" | You | Both proposed as stated in §7 |

---

## 14. Revision 4: mechanical validation and goal resolution

This section responds to the 2026-10-14 approval of Revision 3.

**Mechanical validation ≠ campaign balancing** [Decided].
- Every number in this section describes how the rules respond to their inputs.
- §11's results are **observations about one provisional starting world, not targets.** No constant here was tuned to reproduce them.
- The full robustness report is `tools/beat-sim/robustness/REPORT.md`. The Revision 4 candidates are in `tools/beat-sim/experiments5.py`.

### 14.1 Robustness summary

| Question | Answer |
|---|---|
| Do the local mechanics behave predictably? | **Yes.** All 9 required monotonicity properties hold under exact paired replays: Power, Momentum, defense, Conviction, Pressure, compatibility, channel scores, Stress → draws. The only violation found is in the **People measure** (§14.2). |
| Is the five-slot board the global pacing constraint? | **Yes, for 7+ factions.** The board is full in 100% of Beats; advances per Beat stay ≈ 2.2 at every goal and faction count; a 7-slot probe scales advances by ≈ 7/5. (It binds only partly with 3 factions or half the goals.) |
| Do Power thresholds change the Colony's pace? | **No.** Across a 27-point threshold grid, total advances stay within ±3%. Thresholds decide *who* gets cards, not *how fast* the Colony moves. That makes them safe to set during balancing. |
| Which constants are strong levers? | Momentum (≈ ±40% advances per tier), the Faction Beat target, the Drift Roll target, and the Character draw rule. Balancing must set **starting Momentum** deliberately: it dominates faction pacing. |
| Does the system scale with NPC count? | **Not under the Revision 3 draw table.** Adding NPCs makes the Colony *more* stable: absolute defections fall 0.90 → 0.43 → 0.26 with the cast at ×1/×3/×6. Fixed by §14.3. |
| Do dominant factions run away? | **No.** Goal supply caps them: a Power 3, Momentum +2 faction holds 33% of Power but takes 23% of draws. |

**Threshold placement.** The widest-gap thresholds (68/62/45) were an exploratory heuristic fitted to an unbalanced roster [Decided].
- They remain **provisional placeholders**.
- After balancing, place them by the behavior you want: for example, "a faction needs two of three strong capacities for three cards".
- The Board's channel margins (§4.1) show who sits near a line.

### 14.2 Proposed: People = the faction's three most influential living members

| | Current (avg × 0.6 + max × 0.4, × 0.75 if leaderless) | **Proposed: sum of the top three influences ≥ T, or headcount ≥ N** |
|---|---|---|
| Local monotonicity | **Violated:** losing a weak member can *raise* Power, and a weak recruit can lower it (3 of 65 checks) | 0 of 65 violations |
| Today's allocation | 3/1/3/3/3/2/2 | Identical at T = 220 (scores 197–208 below the line, 233–270 above it) |
| Losing a leader | The leaderless × 0.75 penalty, **plus** the −1 Momentum signal (compounding: −57% advances) | The leader's actual influence leaves the top three, **plus** the −1 Momentum signal. Capacity follows the real person; morale lives in Momentum. |
| Reads as | "Weighted blend of average and maximum influence" | "Serevan, Edrion and Kelda" |

**Examples at T = 220:**
- **Serevan incapable:** the Order's top three falls 270 → 210, so Power 3 → 2.
- **Julian incapable:** Dawn falls 242 → 200, so Power 3 → 2.
- **Perrik incapable:** Aspis falls 240 → 220, **exactly at the line**, so it keeps 3. That case is knife-edge.

**Headcount** remains an independent route into People [Decided]. With the Order's 13 members restored, losing Serevan may not cost it a card, which you accepted.

**Recommendation:** adopt this for M2.

### 14.3 Proposed: Character Beat draws scale with the at-risk pool

**The dilution finding:**
- Reaching Compromised needs the same character drawn twice, so a fixed draw count makes per-character risk scale as roughly 1/pool².
- So a bigger cast means fewer crises in total. That is not a flaw of the Revision 3 numbers; it is structural.

**Proposed rule:**

> **Draw one character card for every N at-risk characters, rounding up.**
> - N = 5 at Colony Stress 0–3, 4 at Stress 4–6, 3 at Stress 7–10.
> - **At most 2 new Compromised crises per Colony Turn.** Further successful rolls leave the character Conflicted.

| Rule | Defections per 10 NPCs: ×1 calm / arc / rising | ×3 arc | ×6 arc |
|---|---|---|---|
| Revision 3 (2–5 draws by Stress) | .23 / .24 / .25 | .04 | .01 |
| **Proposed (1 per 5/4/3, cap 2)** | **.12 / .26 / .34** | **.22** | **.15** |
| Proposed, uncapped | .12 / .27 / .37 | .27 | .25 |

- **Per-capita risk is now (nearly) independent of cast size.** You can add NPCs without recalibrating.
- **Stress keeps a legible operational function:** "at Stress 7, every three people at risk produce a card".
- **It is more stress-responsive than Revision 3:** calm .12 vs rising .34.
- **The cap is a table-usability limit,** not a model claim. It only binds in very large casts. At today's size it changes nothing.
- **This supersedes the decided 2–5 table,** so it needs your yes (**D4-1**).

### 14.4 Representative runs: both Reading branches

**Setup**
- Act I Character Beats run from the baseline.
- At the Colony Turn before Session 5, the Session 4 outcome is applied: the Ritual goals are reconciled, Vara's state is set, and the explicit Momentum signals are added.
- Then four Act II Colony Turns run.
- Rules: Revision 3 plus the proposals in §14.5 (unattended, N = 1) and §14.6 (detector). 2000 runs.

**How Session 4 was reconciled in each branch** (stand-ins for what you'd record):

| | Reading Stopped | Reading Completed |
|---|---|---|
| Vara | Alive | Forgotten |
| *Stop the Ritual* (Dawn) | Accomplished, credited → Dawn +1 | Failed; GM-declared setback → Dawn −1 |
| *Complete the Ritual* (Order) | Failed; GM-declared setback → Order −1 | Accomplished, credited → Order +1 |
| *Take out the Keeper* (Shattered) | Still live (Adjudicated) | **Needs ruling:** target must become Dead, but she is Forgotten (obsolescence) |

**Results through Session 8:**

| Faction | Stopped: accomplished / advances / end tier | Completed: accomplished / advances / end tier |
|---|---|---|
| Dawn | **0.72 / 2.08 / +1.53** | 0.29 / 0.97 / −0.73 |
| Order | 0.04 / 0.59 / **−1.98** | 0.10 / 1.03 / −0.95 |
| EGRESS | 0.18 / 1.42 / +0.10 | 0.17 / 1.40 / +0.11 |
| Others | 0.05–0.12 / 0.43–0.89 / ≈ 0 | 0.06–0.14 / 0.43–0.90 / ≈ 0 |
| **Colony totals** | 7.1 advances; 1.35 accomplished; 0.72 decisive scenes; 0.46 defections | 6.5 advances; 1.03 accomplished; 0.44 decisive scenes; 0.46 defections |

**The engine handles the branch correctly:**
- The reconciled goals leave the pool.
- The obsoleted goal is flagged rather than silently withheld.
- Momentum moves by exactly the capped ±1.
- The branch's political consequences propagate through Power and Momentum, not through special cases.

*Take out the Keeper* reached an unattended **offscreen** resolution in 1.3% of Stopped runs. That is only possible because its declared unattended outcome is "succeeds", which is the stand-in used here; see §14.5 for why it should be declared deliberately.

### 14.5 Unattended resolution for Ready to Resolve goals [Proposed]

**The requirement** [Decided]: a decisive opportunity must not freeze a faction just because Darkwing goes elsewhere. Its unattended result must be **declared before the opportunity arises**, not improvised.

**The contract.** These fields are on each Adjudicated goal, required before the goal can be nominated:

| Field | Example: *Take out the Keeper* (Tavia Rusk) |
|---|---|
| **Attempt:** what the champion is doing | Tavia arranges Vara's death before the Reading can be performed |
| **Opportunity:** what creates the decisive moment | Vara leaves the House of Abiding under light escort |
| **Discovery:** what Darkwing can learn or intervene in | Shattered couriers watching the Abiding Way; a hired blade asking about escort rotations |
| **Unattended outcome** | Your choice, declared now. *Succeeds:* Vara Dead. *Partial:* Vara wounded and hidden, goal → Failed, Witnesses alerted. *Fails:* goal returns to Progressing. |
| **Deadline** | Colony Turns after Ready (default **1**: one session to engage) |

**Rule:**
- At the Colony Turn Opening, a Ready to Resolve goal whose deadline has passed **without a resolving Event** applies its declared unattended outcome.
- That application is a recorded Effect with the provenance "unattended outcome, declared on ⟨date⟩".
- If play *engages* the operation (any Event linked to it), the deadline is suspended until play resolves it.
- The Momentum signal follows the actual outcome.

**Why this is enough:**
- It is a one-step clock attached only to decisive moments. It mirrors the Compromised crisis window: one session to act, then the Colony moves.
- It is not a universal clock system. Act III clocks (§10.3) remain a separate, later design.

**Measured** (Act II, real fixture):

| Deadline | Completions | Decisive scenes resolved unattended | Unattended character outcomes |
|---|---|---|---|
| none (Revision 3) | 0.63 | 0 (they stayed frozen) | — |
| **N = 1** | **1.28** | 0.63 | 0.013 per Act |
| N = 2 | 1.05 | 0.40 | 0.004 per Act |

### 14.6 Goal satisfied vs goal accomplished [Proposed: the smallest implementation]

**Distinction:** a target condition can become true without the faction bringing it about. For example, Darkwing wrecks the Dead Drop Network on their own.

**Rule:**

| | Satisfied | Accomplished |
|---|---|---|
| Means | The desired condition is true now; nobody credited the goal's faction | The goal's faction brought it about or is credited with it |
| Stored as | **Nothing.** A derived overlay, like Dormant | Status `Accomplished` (terminal) |
| Pool | Out of the pool while satisfied. **If the condition reverts, the goal returns to the pool** at its stored state. | Out of the pool permanently |
| Momentum | **No signal** | +1 |

**Credit comes from attribution on the Effect that made the condition true:**
1. **Beat-generated Effects** are credited to the goal's faction automatically.
2. **Play Effects** use the existing `EventEffect.actorFactionId`. Today it is used only for Asset status changes; extend it to the effect types goals target (Asset control or status, character state). Credit applies when the actor is the goal's faction.
3. **"Meaningfully benefited"** with no actor role: the GM records the existing GM-declared ±1 signal, with a reason.

**Why it's minimal:**
- No new progress state, no new table.
- It reuses a column that already exists.
- It is consistent with the one-arena overlay set: Dormant, Ready to Resolve, Active Operation, **Satisfied**.
- The default is conservative: an Effect with no actor credits nobody. The simulator now models this (`detector=True`).

### 14.7 Middle-belief agreement [Recommended: ordinal scoring, configurable per axis]

**Finding.** The scorer is already inconsistent across axes:
- Knowledge (A) and Ritual (C) treat the middle position as a buffer that always scores 0.
- Change (B) is hard-coded with **no** buffer: middle vs middle agrees, and middle vs pole conflicts.
- The behavior is tied to the axis *letter* in code, not to the axis configuration. The server's `ScoringEngine` mirrors it.

**Three variants, scored with the app's real `scoreRelationship`** (the variant applied as an exact delta on its own base score):

| Variant | Rule | Faction pairs changed (stress 0 / 5) | Party | Character → own faction |
|---|---|---|---|---|
| V0 (current) | middle = buffer on A and C | — | — | — |
| **V1 ordinal** | same position **agrees** (including middle–middle); middle vs pole = 0; opposite poles conflict | 2 / 5 of 42 | 2 of 7 | 2 change, both toward agreement |
| V2 nominal | the middle is an ordinary position; any difference conflicts | 13 / 22 of 42 | 4–5 of 7 | 7 change, 3 fall to Strained |

**Recommendation: V1, as a per-axis setting.**
- **Semantics.** The opinion axes are ordered ("Revealed – Controlled – Hidden", "Good – Necessary – Bad"). Under an ordinal reading, holding the *same* stance is agreement, adjacent stances partly overlap, and only opposite poles conflict.
  - V0 breaks "same stance = agreement" for the middle alone, which is wrong whenever the middle is labeled as a stance.
  - V2 overstates disagreement: it scores "Controlled vs Revealed" as harshly as "Hidden vs Revealed".
- **Minimal disruption.** V1 changes 2 of 42 faction-pair labels at rest.
- **Configurability preserved.** Add `middleScoring: 'buffer' | 'agreement'` to each belief axis.
  - Default `agreement` for opinion axes whose middle is a substantive label (here, Knowledge "Controlled" and Ritual "Necessary").
  - Derive buffer behavior from that config instead of from the axis letter. That also resolves the Change-axis inconsistency.
- **Scope.** The client and server scorers change together (with D11's consolidation, in M6). The 7 stale `scoring.service.spec.ts` tests are rewritten against the chosen semantics at the same time.
- **Not a loyalty fix.** EGRESS members rise ≈ +1.7 (−0.7 → +1.0) but stay Tolerated. Their distance comes from the Change-axis conflict and from near-centre Values, which is a balancing matter.

### 14.8 Historical integrity and transaction safety [Decided requirements → design]

**1. Stale-state protection**
- Add a monotonically increasing `Campaign.HistoryVersion`.
- It is incremented by every write that can affect simulation state: Events, Effects, Beats, and baseline edits in Design mode.
- Every Beat or Turn-step payload carries the `HistoryVersion` it was computed from.
- The server rejects the commit (409) if the version has moved, so the client must recompute.
- This makes "valid payload against stale state" impossible without running the engine on the server.

**2. Server verification of Beat arithmetic**
- In C#, at commit: dice in range; totals = dice + frozen modifiers; outcomes match the target; draws ⊆ the nominated pool; nominations ⊆ eligible goals listed in the frozen inputs; frozen-input hash recomputed from the stored JSON.
- This is cheap, and needs no simulation engine on the server.

**3. Calculation semantics, not just configuration**
- `engineVersion` names an **immutable** engine module (`core/sim/v1`, `v2`, …).
- A module is never edited after any Live campaign has committed against it. Fixes ship as a new version.
- Each version keeps its own golden fixtures (M0's harness is the template), so its semantics are tested forever.
- Authoritative replay folds stored Effects (§9.2), so it needs no engine at all. The versioned engine is used to *inspect* derived views faithfully, and for analytical reinterpretation.

### 14.9 Plan changes

| Milestone | Change |
|---|---|
| **M0** | **Done.** See `M0-CHANGES.md`: engine extracted, golden replay, D9 (plus 2 related save bugs), D4, D3, D12, D6, D2, D10, D11, D14, D15. |
| M1 | Add `Campaign.HistoryVersion` and the stale-state 409 (§14.8). Engine versioning layout (`core/sim/vN`). |
| M2 | People = top-three sum (if D4-2 is adopted). Thresholds stay explicitly provisional until balancing. |
| M3 | Unchanged. |
| M4 | Add the **unattended-resolution contract** (fields, validation, the Opening step) and the **Satisfied overlay with credit** via `actorFactionId`. Port the scenario-matrix goal cases to TypeScript tests. |
| M5 | Server Beat verifier (§14.8.2). |
| M6 | The cast-scaled draw rule and crisis cap (if D4-1 is adopted); per-axis `middleScoring` (if D4-3 is adopted); client/server scoring consolidation; the stale scoring tests rewritten. |
| **Test fixtures** | The robustness suite is the engine's mechanical acceptance test. As each milestone lands, its monotonicity properties are ported to vitest over synthetic fixtures, so they guard the real engine, not only the Python model. The real Colony stays a regression fixture, not a target. |

### 14.10 Decisions requested

| # | Decision | Recommendation |
|---|---|---|
| D4-1 | Character Beat draws: replace the 2–5 Stress table with "one card per 5/4/3 at-risk by Stress, at most 2 new crises per turn" | **Adopt** (§14.3) |
| D4-2 | People = sum of the three most influential living members (T provisional), or headcount; drop the leaderless multiplier | **Adopt** (§14.2) |
| D4-3 | Middle-belief scoring: per-axis `middleScoring`, default `agreement` for substantive middles | **Adopt V1** (§14.7) |
| D4-4 | Unattended-resolution contract with a default 1-turn deadline; declared outcome may be succeed / partial / fail | **Adopt** (§14.5); author the outcomes during goal data cleanup (O-5) |
| D4-5 | Satisfied overlay; credit via effect attribution | **Adopt** (§14.6) |
| D4-6 | Priority starvation: low-priority goals are rarely nominated as goal counts grow (Ready-to-Resolve creations → 0 at 4× goals) | **Keep strict priority** (it's authored intent), and show "not nominated in N Beats" on goal cards so the GM can see it. A rule change (priority aging) only if you want it. |

---

## 15. Revision 5: bounded Character Beats, starvation, attribution, notice

This section responds to the review of Revision 4.
- **Approved:** D4-2 (with normalization and roster-edge tests), D4-3 (with fixtures for both middle meanings), D4-4 (with a notice safeguard), and D4-5 (with cooperative attribution).
- **Still open:** D4-1 and D4-6.
- **Evidence:** `tools/beat-sim/robustness/REPORT.md` §6 and `experiments6.py`. The report now labels each property as **exact invariant**, **checked invariant**, or **statistical evidence**.

### 15.1 Character Beat: statistical vs operational scaling (D4-1, revised)

**Statistical scaling** asks whether an NPC keeps a comparable chance of meaningful change as the population grows. **Operational scaling** asks whether the procedure stays practical at the table.

Revision 4's rule (S1) solved the first and failed the second: up to **52 rolls** in one turn with a 6× cast.

**Recommendation: S2.**

> **Character Beat:**
> - Draw one card per 5 / 4 / 3 at-risk characters (Colony Stress 0–3 / 4–6 / 7–10), rounding up, **to a maximum of 5 cards**.
> - Every drawn character rolls.
> - **Every success advances one state.** There is no crisis cap.

| | S0 (Revision 3) | **S2** |
|---|---|---|
| GM rolls per turn: ×1 cast / ×6 cast | ≤ 4 / ≤ 4 | **≤ 5 / ≤ 5** |
| Absolute defections, ×1 / ×3 / ×6 | 0.89 / 0.41 / 0.26 (the cast's growth suppresses drama) | **0.75 / 0.97 / 0.65 (roughly constant)** |
| Sessions opening with a crisis, ×1 / ×6 | 2.7 / 0.9 | **2.5 / 2.2** |
| Per-character odds in a huge cast | fall | fall (the spotlight is shared) |

**Why S2:**
- It has the Faction Beat's shape: a bounded board (≤ 5) with population-scaled demand.
- The number of allegiance crises the GM must run stays roughly constant however large the cast grows.
- Stress keeps a legible job: the number of at-risk characters each card represents, and so how quickly the board fills.

**The crisis cap question is answered by removing the cap.** A bounded draw count bounds crises (at most 5, and observed P(≥ 4) ≤ 0.01), so no successful roll is ever suppressed. If a cap is ever wanted, the queue semantic honors the success: the character enters Compromised at the next Beat. It was measured in REPORT §6.

**The alternative: S4, the exact Faction Beat mirror.**
- Each faction nominates its most at-risk member, then 2–5 cards are drawn from the nominees.
- It is just as bounded, and more concentrated: 1.36 defections at ×1. Crises fall on each faction's visibly most troubled person.
- Choose it if you prefer legible concentration ("the Order's most troubled member") over even spread.

### 15.2 Who is eligible for allegiance crises (new, D5-1)

**Finding: 72–92% of all defections come from Background-tier NPCs** (19 of the 37 living faction NPCs).

| Eligibility | Defections at ×1 cast, *arc* |
|---|---|
| All tiers (as today) | 0.89 |
| Major + Supporting only | 0.62 |

**Options:**
- Keep all tiers. Background NPCs then drive most departures.
- Restrict Character Beats to tiers you choose.

**Recommendation:** make eligibility a configurable set of narrative tiers, default **all tiers**, and decide during balancing. This is a statement about which people can create campaign-changing crises, not a mechanical correction.

### 15.3 Priority starvation, measured (D4-6)

| World | Share of eligible goal-Beats with **zero** chance of nomination | Goals never nominated in Act II |
|---|---|---|
| Real Colony | 0.12 | 0 of 26 |
| 2× goals | 0.68 | 9 of 56 |
| 4× goals | 0.84 | 62 of 112 |

- Today, starvation is "unlikely to move", not "unable to move".
- It becomes structural as goals multiply.

**Option: the colony wildcard.**

> After nomination, draw one extra card at random from all eligible goals that weren't nominated, and add it to the pool before shuffling.

- It removes every zero-probability case in every world.
- Pacing is unchanged (the board stays at 5).
- Priority intent is barely diluted: P(a Minor goal is nominated) .52 → .57 on the real data.

The stronger variant (each faction's last slot random) moves low-priority goals much more (.52 → .67).

**Recommendation:** the colony wildcard. Strict priority with an explicit "embrace starvation" is also defensible. Either way, the choice is now a conscious one.

### 15.4 Cooperative attribution (D4-5, refined)

**Credit uses the existing `participate` goal effect** (actor + role Helping/Hindering, already in the Effect model and UI). No new table is needed.

A goal whose target condition becomes true through Effect *E* in Event *X* is **Accomplished, and credited to its faction**, if:
1. *E*'s `actorFactionId` is the goal's faction; **or**
2. Event *X* also records a `participate` effect on that goal with role **Helping**, by the goal's faction, its champion, or a member of the faction.

Otherwise the goal is **Satisfied**: no signal, out of the pool while true.

*Example:* Darkwing helps Jorren wreck the Dead Drop Network. The GM records the Asset change (actor: Party) plus "Jorren: Helping" on *Break the Shattered*. The Order is credited.

Several factions can be credited for their *own* goals by the same Event.

### 15.5 Notice safeguard for unattended deadlines (D4-4, refined)

**Rule:**
- When a goal becomes Ready to Resolve, its declared **Discovery** leads go onto the next session's "signs to present" list (the `Faction Goals.md` Step 5 mechanism).
- **The deadline counts only sessions in which a lead was actually available to Darkwing.** The GM confirms this with one checkbox on the Decisive Scene card at session end.
- A Ready goal whose lead hasn't been presented shows as a prep warning on the Board.
- Darkwing need not notice or respond; the opportunity just has to be real.
- Hidden *advancement* (Planning → Progressing) is unaffected.

### 15.6 Housekeeping before M1

- **Commit:** M0 is uncommitted on `main` by your instruction. You'll commit it.
- **Known failures, documented in `M0-CHANGES.md`:**
  - the 7 stale scoring tests, which will be rewritten with D4-3;
  - the production style budgets, which predate M0.
- **Dependency review** (read-only; nothing changed):

| Area | Advisory | Likely fix |
|---|---|---|
| Server | Microsoft.OpenApi 2.0.0 (high), transitive | Microsoft.AspNetCore.OpenApi 10.0.3 → 10.0.13 |
| Server | SQLitePCLRaw.lib.e_sqlite3 2.1.11 (high), transitive | EF Core Sqlite/Design 10.0.9 → 10.0.13 |
| Client | 7 advisories (3 high): Angular common/router/core/compiler/forms/platform-browser, including an HttpTransferCache cache-key issue and a sanitization bypass; plus transitive `source-map-js` | All fixable by patch updates (`npm audit fix`) |

  None of the likely fixes is verified. Treat this as its own change, with a full test and build pass.

### 15.7 Decisions

| # | Decision | Recommendation |
|---|---|---|
| D4-1′ | Character Beat draws | **S2:** one card per 5/4/3 at-risk by Stress, max 5, no crisis cap. Alternative: S4, the faction-nomination mirror. |
| D5-1 | Allegiance-crisis eligibility by narrative tier | Configurable; default all tiers; decide in balancing |
| D4-6′ | Priority starvation | **Colony wildcard card.** Alternative: strict priority, accepted deliberately. |
| D4-2/3/4/5 | Approved | With the conditions in §15.4–15.5 and the required test fixtures (People normalization: 0–100 = top-three sum ÷ 3; rosters of 0, 1 and 2; both middle-belief meanings) |

---

## 16. Revision 6: the per-faction Character Phase

**Proposal** (yours, refined by the planning agent):
- Each faction surfaces its most at-risk member, who always rolls.
- Character instability becomes a property of the institutions, bounded by the number of factions.
- Evidence: `tools/beat-sim/robustness/REPORT.md` §7 and `experiments7.py`.

### 16.1 Results

**It does what you intended:**
- Defections rise substantially: **0.87 → 2.48 per campaign** (*arc*; 1.67 calm, 2.89 rising).
- The GM's work is **bounded at 7 resolutions per turn** (about 6 in practice).
- It is the only strategy tested whose drama doesn't collapse as factions grow. With factions of ~5 / ~20 / ~100 members, S8 gives 2.43 / 3.25 / 3.58 defections at 6–7 rolls per turn; Revision 3 gives 0.89 / 0.34 / 0.07.

**It stays bounded where it should:**
- No faction lost 3 or more members in any run.
- Crises spread across all seven factions (0.6–2.1 per faction).
- Leaders are not disproportionately selected.
- Faction pace is unchanged (13.7 vs 13.9 advances per campaign): champion losses reshape **who** acts, because the board still caps **how much** happens.

**Downstream:**
- Champion goals going Dormant rise from 0.85 to about 2.4 per campaign.
- Leader defections rise from 0.09 to about 0.3 per campaign.
- That is the intended loop: factions lose people, and people take ambitions with them.

### 16.2 Two refinements the data calls for

**1. The revolving crisis.**
- The nominee is almost always the same person: the top nominee takes 92% of its faction's rolls, and the typical streak is the whole campaign.
- With "failed check → Conflicted", one success puts that person straight back into crisis. **In 54% of campaigns someone goes through 3+ crises in 11 sessions.**
- That is a continuing arc, but also the same scene again.

| After a failed Defection Check | Defections (*arc*) | Someone with ≥ 3 crises |
|---|---|---|
| → Conflicted (as decided) | 2.48 | 54% |
| **→ Stable** | **2.16** | **21%** |
| → Stable, plus sits out the next nomination | 2.06 | 4% (adds per-character state) |

**Recommendation: a failed Defection Check returns the character to *Stable*.**
- Narratively, they have recommitted. They remain the faction's fault line, since they're still its most at-risk member, but a renewed crisis needs two more successes.
- It changes one decided rule. It adds no state.
- The "sits out" variant nearly eliminates repetition, but it needs a per-character cooldown, which is bookkeeping the board doesn't need.

**2. Conflicted-first has no measurable effect.**
- 2.49 vs 2.45 defections, even with ±5 Pressure noise per turn standing in for play.
- Only the nominee ever becomes Conflicted, so the rule almost never changes the choice.
- **Recommendation:** nominate purely by highest Drift Risk (ties by a stable key). That is one rule fewer, with the same behavior. Revisit if recorded play shows nominees flipping between near-equal members.

### 16.3 The rule as recommended

> **Character Phase (every Colony Turn, all acts; after the Faction Phase when there is one)**
> 1. **Settle:** any Conflicted character whose band is Steady returns to Stable.
> 2. **Per faction:** if a member made a Defection Check in this turn's Opening, the faction's opportunity is used. Otherwise its eligible member (alive, drift > 0, not Compromised) with the **highest Drift Risk** rolls. Ties go to the earlier name.
> 3. **Drift Roll** 2d6 + band modifier ≥ 8. Success advances one state; failure retreats one.
> 4. **Compromised** is a visible crisis for one session. Its Defection Check opens the next Colony Turn. Success: the character leaves. Failure: **Stable**.

**Colony Turn:**
- **Opening:** pending Defection Checks, then Momentum.
- **Faction Phase:** five goal operations (Acts II–III).
- **Character Phase:** one resolution per faction.
- **Publish.**

**What this retires:** the stress-scaled draw table, the pool-scaled draw rules, the crisis cap, and the Character Beat shuffle. Stress still acts through effective Pressure, deciding *who* is eligible and their band modifier, but it no longer creates rolls.

**Unchanged:**
- Anyone can leave, with no narrative-tier protection [Decided]. The Background-heavy defection share is a balancing input.
- Compatibility-based Defection difficulty.
- The Drift vector and Values are untouched.

### 16.4 Decisions

| # | Decision | Recommendation |
|---|---|---|
| D6-1 | Adopt the per-faction Character Phase (replaces D4-1′) | **Adopt** |
| D6-2 | A failed Defection Check returns the character to Stable (changes the earlier "→ Conflicted") | **Adopt** |
| D6-3 | Nominate by highest Drift Risk only (drop Conflicted-first) | **Adopt**; revisit with real play data |
| D5-1 | Narrative-tier eligibility | **Closed:** no tier restriction (planning agent and §16.3) |

---

## 17. Revision 7: the Colony Turn, consolidated

**Supersedes** §8 (Colony Turn), §7 (Character Beats) and §16.3. It incorporates the 2026-10-14 Revision 6 response.

**Evidence:** `tools/beat-sim/robustness/REPORT.md` §8 and `experiments8.py`.

### 17.1 Terminology [Decided]

| Rules and UI term | Meaning | Replaces |
|---|---|---|
| **Colony Turn** | The complete simulation between two sessions; one inspectable record | "Colony Turn" plus separate Beats |
| **Opening** | Pending Defection Checks and their consequences, then Momentum resolution | "Turn Opening" |
| **Faction Phase** | Acts II–III: Power-limited nomination, the wildcard, draw five, resolve against frozen inputs, commit | "Faction Beat" |
| **Character Phase** | Acts I–III: one psychological resolution per faction | "Character Beat" |
| **Publish** | Commit the state; present developments, active crises and opportunities to the GM | — |

Internal identifiers may keep "Beat" names during migration. Rules text and the UI use these terms.

### 17.2 The Colony Turn

```text
COLONY TURN before Session N
 OPENING
   1. Every character who entered Compromised in the previous Character Phase makes a Defection Check
      (unless play already resolved the crisis). Consequences apply: membership, champions → Dormant,
      leader signal. Each such check CONSUMES its faction's psychological opportunity for this Turn.
   2. Momentum Resolution: all unconsumed signals, deduplicated by root cause; change clamp(net, ±1);
      Momentum clamp(−2..+2).
 FACTION PHASE  (Acts II–III)
   3. Freeze. Power per faction (capacity channels). Eligible Achieve goals (not Dormant, Ready, Active,
      Satisfied, or obsolete).
   4. Nominate: each faction its Power-many eligible goals (Progressing first, then Priority, random ties).
   5. Wildcard: draw one Power token (each faction holds one per point of Power; only factions with an
      eligible un-nominated goal take part); that faction adds one of its un-nominated eligible goals at random.
   6. Shuffle the pool; draw five. Roll 2d6 + Momentum − active defense ≥ 8. Collisions: margin, then draw order.
   7. Commit: progress, Automatic outcomes, Ready to Resolve overlays, Momentum signals (for the next Opening).
 CHARACTER PHASE  (Acts I–III)
   8. Settle: Conflicted characters whose band is Steady → Stable (a recovery).
   9. Per faction whose opportunity wasn't consumed in step 1: its eligible member with the highest Drift Risk
      (deterministic tie-break) makes a Drift Roll: 2d6 + band modifier ≥ 8; success advances one state,
      failure retreats one. Entering Compromised opens a visible crisis for one session.
 PUBLISH
  10. Commit; present developments, active crises (Compromised characters), Decisive Scenes with their
      Discovery leads, and next session's starting state.
```

**At most 7 psychological resolutions per Turn**, Opening checks included, with today's seven factions. **Exactly 5 faction operations.**

### 17.3 Character Phase eligibility and stabilization [D6-1 and D6-3 Decided; stabilization per your design]

**Eligible** members:
- are alive and in the faction;
- have Drift Risk > 0 (not Steady);
- are not Compromised;
- are not **exempt**;
- are not **Reaffirmed** for this faction.

If no member is eligible, the faction makes no roll.

**Recovery:** any Conflicted → Stable move, whether from a failed Drift Roll, Settling, or an explicit play Event.

**Exemption:**
- A recovered character is skipped in the **first Character Phase after the recovery**, and is eligible again afterward if their Drift Risk is positive.
- A failed roll by an already-Stable character is not a recovery.

**Reaffirmed:**
- A character who has entered Compromised and later returns to Stable without defecting becomes Reaffirmed **for their current faction**. A play Event resolving Compromised straight to Stable also counts.
- **What it is:** a lasting eligibility marker on a Stable character, not a fourth instability state.
- **What doesn't affect it:** it is not cancelled by ordinary Pressure increases.
- **What it doesn't prevent:**
  - player intervention;
  - explicit instability, Value, Pressure or Conviction Effects;
  - departure by Event.
- **Changing faction:** it does not carry over to a new faction.

**A failed Defection Check returns the character to Conflicted** [Decided; D6-2 rejected].

**Measured** (current cast, *arc*; full tables in REPORT §8):

| | Revision 6 | + exemption | **+ exemption + Reaffirmation** |
|---|---|---|---|
| Crises per campaign | 8.8 | 7.8 | **7.6** |
| Defections | 2.48 | 2.18 | **2.16** |
| Campaigns with someone at ≥ 3 crises | 54% | 44% | **33%** |
| Crises per crisis character | 1.56 | 1.48 | **1.36** |
| Reaffirmed characters per campaign | — | — | **2.1** |
| Distinct nominees per faction | 1.3 | 1.7 | **1.7** |
| Factions with no eligible nominee, per turn | 0.9 | 1.2 | **1.3** |
| Rolls per turn | 6.1 | 5.8 | **5.7** |

- The stabilization rules cut the repeat-crisis rate by about 40% and spread nominations wider, at a small cost in defections.
- Reaffirmation produces your third outcome about twice per campaign.
- Growth behaves the same way: with ~100 members per faction, V3 gives 3.45 defections, 2.3 distinct nominees per faction, 2.9 Reaffirmed, and still ≤ 7 rolls.

**The edge case you asked about** [reported, not changed]:
- **About a quarter of all crises (25–29%) are re-crises that never pass through Stable:** Compromised → failed check → Conflicted → re-nominated → Compromised.
- That is 2.0 per campaign under *arc* with V3.
- Neither rule affects this path. Under V3 it is now **the dominant source of the remaining repeat crises**: every character with 3+ crises got there through it.
- No rule change is proposed. Whether repeated unresolved crises are acceptable is your call, made after seeing this.

### 17.4 Wildcard and Power (D4-6′)

**How it interacts with Power:**
- The wildcard is an **extra card outside the Power allowances**. Power still decides each faction's regular nominations.
- It reaches the board about 0.3 times per Faction Phase.
- A goal-uniform wildcard favors goal-rich, low-Power factions: it raises a Power-1 faction's draws by up to 28%, and narrows the Power-3 : Power-1 ratio from 3.06 to 2.33.

**Recommendation: the Power-weighted wildcard** (step 5).
- It eliminates every never-nominated goal in every tested world.
- It leaves pacing unchanged.
- It **preserves Power's proportions** (ratio 2.59 vs 2.60 on the real data; 2.85 vs 3.06 in the extreme high-Power world).
- Priority still shapes *probability*; nothing is *impossible*.

### 17.5 Records and persistence

**One inspectable record per Colony Turn** [Decided]:

```text
Event (Kind = ColonyTurn, Session N, SortOrder 0)
 └─ ColonyTurn { seed, status Draft→Committed→Voided, historyVersion, rulesVersionId, engineVersion }
     ├─ Phase 1 Opening          { frozenInputs, hash, DefectionChecks[], MomentumResolution[] }
     ├─ Phase 2 FactionPhase     { frozenInputs, hash, Nominations[] (incl. wildcard + Power tokens), Operations[] }
     ├─ Phase 3 CharacterPhase   { frozenInputs, hash, Settlings[], PsychChecks[] (nominee, Drift Risk, band, dice, from→to) }
     └─ Phase 4 Publish          { summary of developments, crises, decisive scenes, leads to present }
   Effects (Origin = Opening | FactionPhase | CharacterPhase, PhaseId) — one stream, ordered by Ordinal
```

- **Commits:** each phase commits in its own transaction, in order, and freezes the previous phase's output. The Turn is Committed when Publish commits.
- **Voiding:** voiding a phase voids the later phases of the same Turn, which are then re-run.

**Persisted character state:**

| State | Stored as | Set by |
|---|---|---|
| Instability | `Character.Instability` (Stable / Conflicted / Compromised) | Effects |
| Reaffirmed | `Character.ReaffirmedFactionId` (null or a faction) | An Effect on the recovery that completes a crisis. It is **verifiable from the instability Effect history** (Compromised, then Stable, with no defection in between). |
| Exemption | **Not stored.** Derived: the character's most recent instability Effect is Conflicted → Stable, recorded after the previous Character Phase committed | — |

### 17.6 Approved and carried forward

- **Approved:**
  - D4-2 (People = top-three sum, normalized, with roster-edge tests).
  - D4-3 (per-axis middle-belief semantics, with fixtures for "undecided" and "substantive" middles).
  - D4-4 (unattended resolution with the Discovery-lead availability rule).
  - D4-5 (Satisfied vs credited Accomplishment, with cooperative credit via the `participate` effect).
  - D6-1, D6-3.
- **No narrative-tier restriction** on Character Phase eligibility.
- **Dependency patches** are a separate change with a full regression pass. The 7 stale scoring tests and the production budget failures stay visible as known, pre-existing failures (`M0-CHANGES.md`).

### 17.7 Implementation plan changes

| Milestone | Change |
|---|---|
| M0 | Done; you commit it. |
| M1 | `Event.Kind = ColonyTurn`; `ColonyTurn` and `ColonyTurnPhase` records (§17.5); `HistoryVersion` stale-state guard; the engine-version layout. |
| M2 | Capacity channels with top-three People (normalized 0–100 = sum ÷ 3), plus headcount. |
| M3 | Momentum signals, resolved in the Opening. |
| M4 | Outcome Modes, Ready to Resolve with the unattended contract and the Discovery-lead availability checkbox, Satisfied and credit, defensive assignments. |
| M5 | Faction Phase, including the **Power-weighted wildcard** (if D4-6′ is confirmed) and the server verifier. |
| M6 | Character Phase per §17.3: `Instability`, `ReaffirmedFactionId`, derived exemption, Settling, per-faction nomination, the Opening's Defection Checks consuming the faction's opportunity. Middle-belief config. Scoring consolidation and the rewritten scoring tests. |
| M7–M9 | Unchanged. M9 writes the Colony Turn rules into `Faction Goals.md`, using the §17.1 terminology. |

### 17.8 Decisions

| # | Decision | Recommendation |
|---|---|---|
| D7-1 | Adopt the stabilization rules (exemption + Reaffirmation) for M6 | **Adopt (V3).** 54% → 33% repeat-crisis campaigns; your third loyalty outcome about twice per campaign |
| D7-2 | Repeated re-crises without stabilization (≈ 27% of crises) | Your call. Accept as unresolved crises, or revisit later with play data. Nothing changed. |
| D4-6′ | Wildcard | **Power-weighted wildcard** (§17.4) |

---

## 18. Decisions log (2026-10-15)

| # | Decision | Outcome |
|---|---|---|
| D7-1 | Stabilization rules (one-phase exemption after recovery + Reaffirmation) | **Adopted** for M6 |
| D7-2 | Repeated re-crises without stabilization (≈ 27% of crises) | **Accepted** as unresolved crises; no rule added |
| D4-6′ | Wildcard | **Pending.** You asked for a reminder; it is needed by M5 |
| O-2 | Headcount N; restore `AdditionalMemberCount` | **Deferred** to the broader balance tuning pass |
| O-3 | Starting Momentum tiers | **Set** by you in the app |
| O-4 | Middle-belief semantics | **Resolved** by the scoring rewrite (`SCORING-AUDIT.md`): every middle is a position |
| O-4b | Belief derivation threshold | **0.5**: a pole only when that Value outweighs the other two combined. At 0.4, 13% of positions (9 NPCs) reach the threshold on two Values, and the poles they derive then depend on evaluation order. 0.5 is the live value and is now the default |
| O-5 (part) | Impossible goals | **Retired** status, champion unassigned; obsolescence is flagged, never applied automatically (M4) |
| O-6 | A defecting champion's goal | **Stays with the faction and loses its champion** (Dormant until reassigned) (M4) |
| O-7 | Character-target assignments; a defender for Vara | Condition "Alive" adopted; **you add Uldren's goal to protect Vara** |
| — | Change axis middle label | "Neutral" is kept |
| — | Scoring model (D4-3) | Similarity − directional opposition; three-position beliefs; declared ≡ derived; a blended belief weight; the Change axis has a middle (`SCORING-AUDIT.md`) |

### 18.1 Faction Phase and Momentum decisions (2026-10-15, later)

Evidence: `FACTION-PHASE-ALLOCATION.md`, `FACTION-PHASE-MOMENTUM.md`, `FACTION-PHASE-CRITICALS.md`.

| # | Decision | Outcome |
|---|---|---|
| FP-1 | Faction Phase | **Power allocation** replaces the five-card draw. Tokens per goal: Critical 3, Major 2, Minor 1. A faction draws Power-many tokens; each token is one attempt. D4-6′ (wildcard) is moot |
| FP-2 | Advancement | **At most one state per goal per Colony Turn.** Attempts stop at the first success; unrolled attempts are consumed and send nothing |
| FP-3 | Operation target | **9+ (provisional)**; revisit in the balancing pass |
| FP-4 | Progressing | **A declared, tangible milestone**: milestone, world consequence and discoverability, required before a Planning goal can be nominated. Setback = an explicit status effect back to Plotting (it also clears Ready to Resolve) |
| MO-1 | Momentum | **Persistent integer −2…+2.** A natural 12 = Critical Success (always succeeds, +1 signal); a natural 2 = Critical Failure (always fails, −1 signal). Priority does not affect Momentum. Each rolled attempt is its own root |
| MO-2 | Opening resolution | Deduplicate, net, **cap ±1**, clamp ±2 (unchanged M3 procedure) |
| MO-3 | Accomplishments | **No automatic signal** |
| MO-4 | Keystones | **A Keystone lost to an operation sends no signal** (it is felt through Power); a Keystone lost or Destroyed in play still sends −1. One occurrence must not produce both an automatic and a GM-declared signal |
| MO-5 | Other play events | The leader incapable or leaving (−1); GM-declared major success or setback (±1, with a reason) |
| MO-6 | Inactivity | A faction that rolls nothing **keeps its Momentum** (no decay) |
| MO-7 | Critical band | **Natural 12 / 2 only.** Matched doubles (5–5/6–6, 1–1/2–2) is the fallback if play shows Momentum too static |
| O-3′ | Starting tiers | They persist for most of the campaign, so **review all seven in the balancing pass** |

### 18.2 Goal model simplification (2026-10-15, later)

**Principle:** a Goal defines a desired world change. A Colony Turn determines whether progress occurs. An Event records what actually happened. The Goal no longer defines the encounter, the clue structure, the deadline or the fallback narrative.

| # | Decision | Outcome |
|---|---|---|
| GS-1 | Goal fields | **Achieve:** Type, Auto-Resolve, Title, Champion, Priority, Visibility, Status, Target (type / entity / state), Progressing World State, Completed World State. **Maintain:** Type, Title, Champion, Priority, Visibility, protected Target |
| GS-2 | Removed | Attempt, Opportunity, Discovery, unattended outcome and its text, deadline, the milestone's consequence and discoverability. **Supersedes FP-4's required fields and §14.5's unattended contract** |
| GS-3 | Auto-Resolve | Yes = the second success writes the target and Accomplishes the goal. No = it creates a **GM resolution task** (Ready to Resolve) |
| GS-4 | Resolution task | Nothing resolves on its own: no deadline, no unattended outcome, no Opening step. The GM resolves the task through play, an explicit Event, or the session's buttons (Accomplished / Failed / Remains Progressing). Only that goal waits; the faction's other goals keep rolling |
| GS-5 | Eligibility | **No description is required.** The only authoring requirement: an Auto-Resolve goal needs a target the app can apply (a Character state, or an Asset state or controller). Nonstandard objectives (a ritual, reducing a faction's Power) are goals that do not Auto-Resolve, with a descriptive World State |
| GS-6 | Status | Shown as a progress control (Planning → Progressing → Accomplished; Failed and Retired as administrative ends). Stalled is no longer offered. Dormant and Ready to Resolve remain derived |
| GS-7 | Maintain | A defensive assignment: champion and protected target only. Active / Inactive and the −1 defense are derived |
| GS-8 | Determinism | Neither World State is an input to resolution. The Progressing World State is carried in the Faction Phase's frozen inputs for display only. Optional mechanical changes are ordinary Event Effects. **No dependency required adding fields back** |

### 18.3 Goal completion by any source (2026-10-15, later)

**Principle:** goals are both observable conditions and actionable ambitions. The world can fulfill a goal, and so can a faction; both produce the same historical fact.

| # | Decision | Outcome |
|---|---|---|
| GC-1 | World → Goal | When an Effect makes an Achieve goal's machine-readable target condition true, the detector marks the goal Accomplished, **whoever caused it**: the faction, the party or another faction. **Supersedes D4-5** (credit as a condition for completion, and the Satisfied overlay) |
| GC-2 | Transitions | Completion needs a real **false → true** change of the condition. A condition that already holds, or a touch that changes nothing relevant, completes nothing. A goal whose target already holds without ever being brought about is flagged "Target already holds" so the GM can retire or edit it; it stays out of the pool while it holds |
| GC-3 | Goal → World | On a faction's final success, Auto-Resolve decides: apply the target Effect (Yes) or create a GM resolution task (No). Auto-Resolve governs only what an operation may do, not whether completion is recognized |
| GC-4 | One outcome | An operation's Auto-Resolve writes the target Effect and Accomplished together; the detector never marks a goal a second time |
| GC-5 | Milestones | Completion can skip Progressing: Planning → Accomplished directly. The Progressing World State is never invented retroactively |
| GC-6 | Permanence | **Accomplished is permanent, whatever the source.** Later Events that reverse the condition do not undo it; a faction may adopt a new goal instead |
| GC-7 | Attribution | Who caused each completion is recorded separately: the faction, the party, a participant, or "not recorded". It carries no credit and no Momentum |
| GC-8 | Goals without a machine-readable target | e.g. Stop the Ritual. Completed by an explicit Event: a status Effect, or the resolution-task buttons |

### 18.4 Defection Checks move to the Character Phase (2026-10-15, later)

**Why:** the user did not want a Turn's character actions split across two screens. The Colony Turn is now presented as Faction Phase → Character Phase → Review.

| # | Decision | Outcome |
|---|---|---|
| DC-1 | Order | **Opening** (Momentum resolution only) → **Faction Phase** (Acts II–III) → **Character Phase**: Defection Checks first, then Settling, then Drift Rolls. **Supersedes** §17.2's Defection Checks at the Opening and M6's "a leader's −1 joins this Opening's resolution" |
| DC-2 | Impact timing | A defection's impact on its faction applies **at the next Colony Turn**. A leader leaving is a −1 signal resolved at the next Opening, like a critical. The faction's operations this Turn roll with its Momentum before the defection |
| DC-3 | Goals | A defecting champion's goals still roll in this Turn's Faction Phase (it precedes the check). They lose their champion, and so go Dormant, from then on |
| DC-4 | Consumption | Unchanged: a faction with a Defection Check uses its Drift Roll for the Turn, whatever the check's outcome |
| DC-5 | Dice | Defection Checks keep their own seeded stream (the former Opening stream), so they never shift the Drift Rolls' dice. Table dice are allowed per roll |
| DC-6 | Old records | Openings committed earlier (op-2/op-3) keep their checks and Effects; replay still does not re-signal a leader defection with Origin Opening |

### 18.5 The Factions board: Accept / Defer, re-rolls, display (2026-10-16)

| # | Decision | Outcome |
|---|---|---|
| FB-1 | Accept / Defer | A goal that does not Auto-Resolve and reaches Ready to Resolve in the Faction Phase shows **Accept** or **Defer**. **Accept** resolves it immediately, as if it Auto-Resolved: its target (when the app can apply one) and Accomplished, written by the Turn when confirmed. **Defer**, the default, leaves it a resolution task for the session |
| FB-2 | Re-rolls | There is no physical dice entry on the board. Clicking a die re-rolls it (date-time + seed), and the attempt and every later attempt of that goal follow from the new result. Re-rolled dice are recorded as `reroll`: valid faces, not reproducible from the seed |
| FB-3 | Momentum shown | The Momentum each faction begins the Turn with, the value its rolls use. Positive: green trend-up; negative: red trend-down; zero is not shown |
| FB-4 | Changes during a Turn | Momentum changes caused during a Turn (criticals, departures) do not resolve or appear until the Turn is complete |
| FB-5 | Progress dots | ●○○ Planning · ●●○ Progressing · ●●● Accomplished, showing the state after the Turn's results apply |
| FB-6 | Visibility | Factions with no operations are hidden. Ineligible goals are not listed |
| FB-7 | Characters board | The same design (2026-10-16): faction cards with character activity only; each row a Defection Check, Drift Roll or Settling, with a Stable ●○○ · Conflicted ●●○ · Compromised ●●● track (after), clickable re-roll dice, and the full roll in the tooltip |
| FB-8 | Defer | A Ready goal starts **undecided** (Pending World Results shown). **Accept** shows World Results. **Defer** shows "Deferred: … a resolution task in Session N" and **no world result**. Undecided goals are saved as deferred. Clicking the chosen option again returns the goal to undecided |
| FB-9 | Results board | Review and completed turns show faction cards. Each card lists the faction's **new world states**: from the Faction Phase (a Progressing World State on a first success, the Completed World State on an Accomplishment or acceptance) and from the Character Phase (departures, staying after a crisis, new crises). The header shows Momentum **gained (↗ +1) or lost (↘ −1)**: the turn's own signals, netted and capped, which apply at the next Colony Turn. Factions with nothing new are hidden. A **Details** accordion opens the full text summary |

### 18.6 Architecture audit rulings (2026-10-17)

**Principle:** tangible world-state changes produce derived consequences; goals never carry hard-coded numerical outcomes. Evidence: `GOAL-AUDIT-CHANGES.md`.

| # | Decision | Outcome |
|---|---|---|
| AU-1 | Power | **Power = People + Holdings + Mandate**, each 0 or 1: 0–3, no guaranteed minimum. Power 0 makes no operations; the faction keeps its characters, Assets, relationships and defensive assignments, and recovers Power when its capacity changes. No special modifiers or threshold changes to preserve today's rankings |
| AU-2 | People | The top-three average with missing members counted as 0 (already the implementation): monotone, so a recruit never lowers it |
| AU-3 | Auto-Resolve | Keeps applying a structured target when the goal has one. **A goal without a structured target may also Auto-Resolve** (narrative only: Accomplished, with its Completed World State as the development). Default True; False when the culmination needs a played scene, Party intervention or GM adjudication. The detector only observes |
| AU-4 | Earliest Act | New field on Achieve goals (I/II/III), **Faction Phase eligibility only**. Existing goals default to **Act II**; assignments are reviewed deliberately. A goal waiting for its Act is "Not yet eligible", never Failed or Retired |
| AU-5 | Faction Phase cadence | **A Faction Phase in every Act**: up to 11 per campaign (before Sessions 2–12). Turns already saved keep their records |
| AU-6 | World Conditions | A minimal entity: title, rule, in force from the start or not, an optional dependency (an Asset's controller and/or status; another condition). Events establish or end it. In force ⇔ established ∧ dependency holds, derived by replay, with its reason. The app records and shows the rule, never executes it. The Cult's Registry and Ledger modifiers stack, up to Class V, and apply when a new incursion is generated |
| AU-7 | Retirement | Flag and confirm (unchanged). Retirement, Not yet eligible, Dormant and detector fulfilment stay distinct |
| AU-8 | Maintain | Defends while the champion is capable, the faction controls the target, and it is not Destroyed: Damaged or Contested targets are still defended (unchanged) |
| AU-9 | Data | The five numeric-target goals and the Fractured Objects goals: changes proposed for review, not applied |

### 18.7 Power from members and Asset stars (2026-10-18)

**Principle:** the rules come first, the starting pieces second. These are rule definitions, not fitted to the current roster.

| # | Decision | Outcome |
|---|---|---|
| PW-1 | Power | Power = (People ≥ 10) + (Holdings ≥ 15) + (Mandate ≥ 5): 0–3, no baseline, minimum or modifiers |
| PW-2 | People | Named members (1 each) + 5 for a capable leader (alive and in the faction, once) + ⌊unnamed members ÷ 20⌋. A named member is **any living character who belongs to the faction** (NPC or Party, crisis or not). Influence is no longer an input |
| PW-3 | Holdings | Stars (tier) of controlled Operational, Strategic and Covert Assets |
| PW-4 | Mandate | Stars of controlled Symbolic and Mandate Assets. The channel comes from Asset **Role**; Type is descriptive |
| PW-5 | Status | **A Destroyed Asset counts nothing; Damaged and Contested count in full.** A specific impairment is a World Condition |
| PW-6 | Legitimacy | **Retired.** Mandate is the only authority measure. Base Legitimacy, its Effect, the 0–100 blend and the Legitimacy timeline metric are removed; cascade rules can no longer target a faction property |
| PW-7 | Unnamed members | Exported and imported with the factions CSV (a missing column keeps the value), and changed in play by an **Unnamed Members ±n** Effect |
| PW-8 | Balancing | Separate and later: decide each faction's intended Power, then author members and Assets to produce it |

### 18.8 People from Faction Size; one assignment per champion (2026-10-18)

**Principle:** Power determines how much an institution can attempt; champions determine what it can attempt.

| # | Decision | Outcome |
|---|---|---|
| PC-1 | People | People = 5 for a capable leader + ⌊**Faction Size** ÷ 20⌋, qualifying at 10. **Named characters add nothing individually.** Power and Asset scoring are unchanged |
| PC-2 | Faction Size | An explicitly recorded **total** membership, named and unnamed, never counted from Characters. It is editable in Design, and changed in play by a **Faction Size ±n** Effect |
| PC-3 | One assignment | A character champions **at most one active** Achieve goal or Maintain assignment in the campaign. Active means not Accomplished, Failed or Retired: Planning, Progressing and the legacy Stalled count, including while Dormant, Not yet eligible or Ready to Resolve. Incapacity frees no one; the existing M4 rule still unassigns a champion who defects or whose goal is Retired |
| PC-4 | Unassigned goals | Valid. They stay Dormant ("No champion"): out of the Power pool for Achieve goals, providing no defense for Maintain. Never Failed or Retired for it |
| PC-5 | Legacy duplicates | Preserved (one exists: Julian Arrett). Shown as "Champion shared". Unrelated edits are allowed; any new duplicate is refused by the client dropdown and the server |

### 18.9 World Conditions: requirements, Stress, Location states, milestone state (2026-10-19)

**Principle:** a World Condition is a table rule tied to recorded world state. It may raise Colony Stress, so it never reads anything that depends on Stress. The calculation stays acyclic: entities and Events → conditions → Stress → derived values. Evidence: `WORLD-CONDITIONS-CHANGES.md`.

| # | Decision | Outcome |
|---|---|---|
| WC-1 | Requirements | A list of typed predicates, **all of which must hold** (a list of states within one predicate is OR). The predicate kinds: Asset controller (a faction or no one) · Asset status · Character state · Character faction · faction leader capable (or not) · Location state · **another condition in force (or not)**. No Event predicates. In force ⇔ established ∧ every requirement holds |
| WC-2 | No Stress-dependent predicates | A condition never reads Pressure, Drift Risk, instability, relationships or Power. Character instability is not a predicate |
| WC-3 | Conditions on conditions | Allowed. A condition with no requirements is decided by its establishment alone, e.g. **Totality**, set manually by an Event. A cycle never holds and never loops; a requirement on a deleted condition never holds; a condition cannot require itself (refused by the server) |
| WC-4 | Stress | **Additive:** Colony Stress = recorded (baseline + Effects + triggers) + Σ the Stress contributions of the conditions in force at the end of the session, clamped 0–10. The recorded accumulator is kept separately, so contributions never compound across sessions. The snapshot carries `stressRecorded` and `stressFromConditions`; the baseline view includes the conditions in force at the start |
| WC-5 | Relationships | Re-scored on the client at the viewed Stress in every view, the Baseline included, so the server's stored scores never disagree with condition Stress |
| WC-6 | Scope | No scope field until one is needed |
| WC-7 | Location state | A **transient state**, not an attribute: **Stable** (default) · **Active Incursion** · **Unstable**. Every existing Location was reset to Stable (ruling: the test campaign's history need not be preserved) |
| WC-8 | Milestone state | An Achieve goal with an Asset or Character target may name an optional **state change at Progressing** (`ProgressingTargetState`): an Asset status or Character state, different from the final target state, written to the target (attributed to the faction, GoalGenerator) when the Faction Phase advances the goal Planning → Progressing. Faction Phase **fp-3**. The goal alters the target earlier; World Conditions still read only the target |

### 18.10 Cascade Rules and Stress Triggers retired; Stress derived only from World Conditions (2026-10-19)

**Principle:** Events record what changes. World Conditions describe what remains true, and Colony Stress is the sum of their contributions. No third system generates hidden changes. Evidence: `CASCADE-RETIREMENT-CHANGES.md`.

| # | Decision | Outcome |
|---|---|---|
| CR-1 | Cascade Rules | **Retired.** The engine pass, the Settings tab and editor, the snapshot's derived effects and the Sessions bar are removed. The stored JSON is kept for reference and never executed. Their former responsibilities are covered elsewhere: the leader-left Momentum signal, the People leader bonus, World Conditions, explicit Event Effects and the Character Phase |
| CR-2 | Stress Triggers | **Retired**, in the same way. A lasting consequence is a World Condition that is in force while something stays true. It is either derived from state (e.g. "Registry Destroyed") or established and ended by Events |
| CR-3 | Stress | **Derived, never accumulated:** Colony Stress = clamp(Σ in-force condition contributions, 0–10). It falls as soon as a condition stops holding. This supersedes the additive rule in WC-4 (§18.9) |
| CR-4 | Stored Stress | Removed: the baseline Colony Stress, the Stress Effect (colony and asset) and the Session Log's Stress change. Recorded Stress Effects are inert |
| CR-5 | Stress simulation | The Relationships page has a **Stress Simulation** slider. It previews that page's scores at another Stress and saves nothing. Every other view uses the actual Stress |
| CR-6 | Source of state | The source of a state change does not matter. A Faction Phase result that changes an entity's state brings any condition requiring that state into force, exactly as a session Event would |
| CR-7 | What a condition does | It contributes Stress and declares a table rule. It never writes an Effect; one-time changes stay explicit Event Effects. It never reads a Stress-dependent value (WC-2) |
| CR-8 | Provenance | Each Stress part carries its condition's origin ("from the start", or "established in Session N (Event)"). The header tooltip lists the parts, and the Sessions page shows each condition's Stress as it starts or ends |
| CR-9 | History | The test campaign's play history is cleared (Sessions, Events, Effects, Colony Turns), including its Map Edits. Entities, goals, conditions, rules, the map and the narrative plan are kept |

### 18.11 Goal advance Effects; import ids; World Conditions file (2026-10-20)

**Principle:** a goal names everything its own advances change, on its card. The app writes exactly that, attributed, and infers nothing. Evidence: `GOAL-ADVANCE-EFFECTS-CHANGES.md`.

| # | Decision | Outcome |
|---|---|---|
| GA-1 | Advance Effects | An Achieve goal may list Effects **at Progressing** (from Planning only) and **at Accomplished** (after its target). Each is an ordinary Effect: an Asset's status, controller or Location; a Character's state; Faction Size ±n; a Location's state; or a World Condition established or ended. The Faction Phase (**fp-4**) writes them, credited to the faction (GoalGenerator) and verified by the server. This replaces the single milestone state (§18.9 WC-8), which is migrated into a Progressing Effect |
| GA-2 | Scope | Only the goal's own advances write them. A goal Accomplished by another source (§18.3) writes none, and an accepted resolution writes its Accomplished Effects |
| GA-3 | Stable after a taking | An ownership goal may reset its target to Stable at Accomplished (the 2026-10-20 balancing plan does this for the Fund, the Chest, the Hall of the Keepers and the Stockpiles) |
| GA-4 | Import ids | Creating a record keeps a supplied id when it is free, so an import's rows can reference each other (e.g. a new Asset and the goals that target it). A taken or blank id gets a fresh GUID |
| GA-5 | World Conditions file | `world-conditions.csv` export and import (Id, Title, Rule, ActiveAtStart, StressContribution, SortOrder, Requirements as JSON) |
| GA-6 | witness_specimen | It requires only the controller (ruling): the Witnesses control the Unclaimed Object. Location is narration |
| GA-7 | Abide; Take out the Keeper | Auto-Resolve stays off. Accepting either would apply its target (transfer the House; Vara Dead), so the GM Defers them and resolves them in play |

### 18.12 Faction Phase fp-5: Priority as a roll bonus; Power shared with threatened assignments (2026-10-22)

**Principle:** one consistent rule. Power is spent on every goal that needs it, and Priority sets the modifiers. Evidence: `tools/beat-sim/fp5/REPORT.md` (1,000 campaigns per rule, on the real engine). Change log: `FACTION-PHASE-FP5-CHANGES.md`.

| # | Decision | Outcome |
|---|---|---|
| FP5-1 | Priority | **A roll bonus only:** Critical +3, Major +2, Minor +1. It no longer weights the draw (the 3/2/1 tokens are retired), so each drawn goal rolls **once** |
| FP5-2 | The roll | **2d6 + Priority + Momentum ≥ DC + guard.** A natural 12 always succeeds (+1 signal) and a natural 2 always fails (−1) |
| FP5-3 | DC | **10** (was 9). It keeps about today's pace (simulated: 30 advances and 12 Accomplishments per campaign, against 26.7 and 10.9) |
| FP5-4 | Guards | A Maintain assignment that is active (champion capable and in the faction; Asset held and not Destroyed, or Character Alive) and **threatened** competes for Power. It puts **one token in the faction's bag**, like a goal. Threatened means another faction has an eligible goal on its target this Turn |
| FP5-5 | Secret goals | A **Secret** goal is unknown to the defender, so it does not threaten its target. A guard posted for another, known threat still defends against it |
| FP5-6 | Defence | A **drawn** guard of another faction adds its Priority to the DC of every roll against its target. Only the best one counts (highest Priority, then id), and a faction never guards against itself. The flat −1 is retired |
| FP5-7 | Rejected | Power for every assignment every Turn (B): about half of all Power was spent guarding unattacked targets, and a third of turns had no attempt. Passive Maintain (A) was rejected for consistency. The reactive version (defend after seeing attacks) was declined |
| FP5-8 | Maintain Earliest Act | (2026-10-22) A Maintain assignment has an **Earliest Act** too, and is **in force from it**. Before then it neither defends nor guards, and it shows "From Act …". Existing assignments were set to **Act I** (until now they were in force from the start), so nothing changed; new goals of either type default to Act II |

### 18.13 Goal-driven World Conditions; the goal World States retired (2026-10-26)

**Principle:** what becomes true lives in one place. A goal decides *whether* the world changes; a World Condition says *what is then true at the table*. A goal no longer carries its own text, so the two cannot drift apart. Change log: `GOAL-ADVANCE-EFFECTS-CHANGES.md` §11.

| # | Decision | Outcome |
|---|---|---|
| GD-1 | Goal stage | A condition may **vary by a goal's stage** (a row per stage: Planning · Progressing · Ready to Resolve · Accomplished · Failed · Retired, each with text and Stress), or **require** one ("Goal · Abide · Stage is · Ready to Resolve or Accomplished"). Stages come from replay: the goal's status, with Ready to Resolve from the GM-task overlay |
| GD-2 | World States retired | `ProgressingWorldState` and `CompletedWorldState` are removed from the goal (editor, card, CSV, model). The goal card, the Colony Turn board, the Review and the resolution task show the text of the conditions the goal drives at that stage instead |
| GD-3 | Advance Effects | An advance **no longer establishes or ends a World Condition** (removed from the vocabulary of GA-1; refused by the server). Session Events still can |
| GD-4 | Stress | Each stage row has its own Stress, like any "varies by" row |
| GD-5 | Data | The six Event conditions the goals established now vary by their goal's stage; Order Excluded requires Sunset the Order Accomplished *and* Dawn holding Assembly Hall; every other goal World State text became a goal-driven condition titled after the goal (40), so no text was lost. An Adjudicated goal's completed text applies from Ready to Resolve (it describes what play then resolves) |
