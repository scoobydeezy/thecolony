---
id: rule.colony-turn
slug: colony-turn
name: The Colony Turn
version: 1
status: draft
summary: Resolve Momentum, draw and resolve faction operations against a frozen state, resolve character changes, then publish the next session's starting world.
provenance:
  - { doc: Faction Goals, heading: II. The Colony Turn }
  - { doc: Faction Goals, heading: III. Direct Play and the App }
---

A Colony Turn runs during preparation before every session from Session 2 onward, after recording the previous session's direct outcomes. General faction draws do not occur during live play. The resulting state starts the next session; play can then change it normally.

## Opening

Momentum persists from **−2 to +2** per faction. Gather signals since the last Opening, deduplicate by root cause, net them, cap the change at **±1**, and clamp the new value to the range. Each rolled attempt is its own root.

| Signal | Change before netting |
|---|---:|
| Natural 12 on an operation roll | +1 |
| Natural 2 on an operation roll | −1 |
| A Keystone lost or Destroyed in play | −1 |
| Leader becomes incapable or leaves the faction | −1 |
| GM-declared major success or setback, with a recorded reason | ±1 |

Accomplishment alone sends no signal. A Keystone lost to another faction's operation sends none; its effect is already felt through Power. An occurrence never earns both an automatic and a GM-declared signal. Inactivity does not decay Momentum. Signals generated during this Turn wait until the next Opening.

## Faction Phase

**Freeze** one snapshot of Power, Momentum, goals, champions, and Assets. All rolls use it; an early success does not change a later roll's inputs.

**Power** is 0–3: one point for each qualifying channel.

| Channel | Qualifies at | Measurement |
|---|---:|---|
| People | 10 | 5 for a capable leader + floor(Faction Size ÷ 20) |
| Holdings | 15 | Total tiers of controlled Operational, Strategic, and Covert Assets |
| Mandate | 5 | Total tiers of controlled Symbolic and Mandate Assets |

Destroyed Assets contribute nothing. Damaged and Contested Assets count in full. Power 0 produces no operations; the faction retains its people, holdings, relationships, and defensive assignments.

**Build a bag** for each faction with one token per eligible Achieve goal and one per threatened active Maintain assignment. A threat is another faction's eligible, non-Secret Achieve goal on the same target. Use :ref[Faction Goals and Champions]{#rule.faction-goals} for eligibility.

**Draw Power-many tokens.** A drawn Achieve goal rolls once; a drawn guard defends its target for this Phase. An undrawn guard does not defend. If fewer tokens are available, draw those available.

**Roll:**

> **2d6 + Priority + Momentum ≥ 10 + the best drawn guard's Priority**

Priority is Critical **+3**, Major **+2**, Minor **+1**. Only the highest-Priority drawn guard counts, with stable id order breaking ties. A faction does not guard against itself. A guard drawn for a known threat also defends against a Secret attempt on that target.

A natural **12 always succeeds** and signals +1; a natural **2 always fails** and signals −1. Success advances one stage at most; failure leaves the goal unchanged.

**Resolve collisions.** If automatic Accomplishments would write incompatible outcomes to the same target, the higher margin wins, then the earlier attempt. Pre-empted goals remain Progressing.

**Commit together.** Apply advances, their explicit Effects, automatic completions, and Ready to Resolve tasks. Record critical signals for the next Opening. Accept or Defer resolution tasks; defer those whose outcome must be played.

## Character Phase

Resolve **Defection Checks first**, then **Settling**, then **Drift Rolls**. Use the campaign app's current psychological scores, roll targets, and band settings.

- A character who entered Compromised faces the check unless play already resolved the crisis. A faction with a Defection Check consumes its Drift opportunity regardless of the result. A failed Defection Check returns the character to Conflicted.
- Settle Conflicted characters whose Drift band is Steady to Stable.
- Each remaining faction nominates its eligible member with the highest Drift Risk, using the app's stable tie-breaking. Members must be alive, in the faction, above Steady, not Compromised, not exempt, and not Reaffirmed for that faction.
- A Drift success advances Stable → Conflicted or Conflicted → Compromised. Failure returns the nominee to Stable. Entering Compromised opens a visible crisis for play.

A recovery to Stable grants exemption from the first Character Phase after recovery. A failed roll by someone already Stable is not recovery. A character who has been Compromised and returns to Stable without defecting becomes **Reaffirmed** for that faction. This prevents ordinary nomination, not player intervention or explicit changes; it does not carry into a new faction.

A defection's impact on faction operations and Momentum applies at the next Turn. Goals lose their champion; they are not automatically reassigned. Values, beliefs, Pressure, Conviction, and Drift Risk shape character behavior, not the operation-roll modifier.

## Publish

Commit the Turn and inspect its resulting conditions, crises, and resolution tasks. Present what the Party can encounter: a guarded archive, a changed patrol, missing supplies, a public announcement, or agents preparing an operation. Showing an established change requires no separate visibility roll.

The app derives Power, Momentum, goal overlays, relationships, and Colony Stress from recorded facts. Stress is the sum of in-force World Condition contributions, clamped to **0–10**. It is not a hidden accumulation track. Do not infer unrecorded rumors, allegiance changes, or political reactions merely because a goal advanced.

:::design
Faction Goals' November 16 consolidation and BOARD-GAME-REVIEW.md §§18.4, 18.10, 18.12–18.13 govern this draft. The old five-card draw, wildcard, weighted Priority tokens, DC 9, passive defense, Opening defections, and cumulative Stress are retired. Character score formulas and configurable numerical targets remain in the app; this is the workflow contract, not a new scoring implementation. Operation DC and Priority remain subject to the source's balancing pass.
:::
