# The Colony — Simulation Architecture

This document describes the simulation model used by The Colony Campaign Tracker.

It is the authoritative source of truth for future design decisions.

---

## Core Principle

The application does not model objective morality.

The application models:

> Perceived ideological compatibility under pressure.

The simulation exists to answer:

- How do people react to stress?
- How do institutions respond to instability?
- How do beliefs change when consequences become real?

---

## World vs Campaign

This distinction is foundational.

**World** defines what exists: factions, characters, relationships. World state is the baseline — it changes slowly and deliberately.

**Campaign** defines what changes: sessions, events, effects, colony state. Campaign state is the accumulated record of everything that has happened.

Current State is derived from World + Campaign history.

---

## The Value System

The simulation is built around three abstract value axes — A, B, and C — which together define a ternary space.

Every faction, character, and special actor occupies a position in this space. All positions normalize to:

```text
A + B + C = 1.0
```

The three axis names, the three edge labels, and the three belief axis names are all user-configurable. The engine operates on position alone — the labels describe what the axes mean for a given campaign, not what the engine requires.

The default configuration for this campaign:

| Axis | Name      | Meaning                                       |
| ---- | --------- | --------------------------------------------- |
| A    | Truth     | Knowledge, remembrance, transparency          |
| B    | Stability | Continuity, survival, order                   |
| C    | Agency    | Choice, consent, self-determination           |

### Emergent Values

Certain concepts emerge from the intersections between value axes. These are positions within the ternary space, not stored fields — they label the edges of the triangle.

| Edge | Default Name   |
| ---- | -------------- |
| A–C  | Justice        |
| A–B  | Accountability |
| B–C  | Prosperity     |

These edge labels are also configurable.

### Alignment and Opposition

Two actors are **aligned** when they weight the axes similarly — they want the same things and sacrifice the same things.

Two actors are **opposed** when one wants what the other explicitly does not want. This is not simply the absence of alignment. Alignment and opposition are distinct calculations.

---

## Beliefs

Beliefs emerge from values.

Values answer: *What matters?*

Beliefs answer: *What should we do about it?*

There are three belief axes, each corresponding to one value axis:

| Belief Axis | Corresponds To | Default Question                           |
| ----------- | -------------- | ------------------------------------------ |
| Knowledge   | A (Truth)      | Should the truth be concealed or revealed? |
| Change      | B (Stability)  | Should the current system be preserved?    |
| Ritual      | C (Agency)     | Is the ritual justified?                   |

Each belief axis has three positions: positive, neutral, negative. Which position counts as "aligned" with its value axis is itself configurable per axis.

### Derivation

Beliefs are not derived from a single axis in isolation — they respond to the overall value position.

Default derivation logic:

- **Knowledge (A axis):** positive if A is dominant (≥ 0.4); negative if C is dominant; otherwise neutral.
- **Change (B axis):** negative if B is dominant; positive if C is dominant; otherwise neutral.
- **Ritual (C axis):** negative if C is dominant; positive if A is dominant; otherwise neutral.

The key implication: two actors with very different value positions can hold the same belief for different reasons. The underlying values still differ, and the relationship engine will reflect that difference.

### Overrides

Beliefs may be manually overridden. Overrides should be rare.

Overrides exist to model exceptions: hypocrites, extremists, reformers, pragmatists, conflicted individuals.

Values should remain the primary source of ideological identity.

### Values and Beliefs Under Stress

Two factions may hold identical beliefs for entirely different reasons.

Example: both the Keepers and Witnesses may believe the ritual should continue — the Keepers because Stability is paramount, the Witnesses because Truth requires remembering its cost. Because the underlying values differ, the factions may still strongly disagree despite reaching similar conclusions.

Which layer of ideology drives relationships depends on Colony Stress.

**Low stress** — belief positions are the dominant signal. Factions focus on methods and positions: Should the ritual continue? Should knowledge be revealed? Should the system change?

**High stress** — core values become the dominant signal. Survival pressure exposes what factions truly prioritize: What are they willing to sacrifice? What are they protecting? What matters most?

This shift is configurable. When stress-weight composition is disabled, the engine uses fixed relative weights with values carrying more emphasis. When enabled, the ratio shifts dynamically with Colony Stress according to a configurable curve and intensity.

---

## Factions

Factions represent ideological responses to the colony's central compromise.

Every faction occupies a unique position in value space and maintains directional relationships toward every other faction and toward the Party.

Every faction is correct about something. Every faction is blind to something.

---

## Social Classes

Social classes represent lived experience, not ideology.

Social classes answer: *What happened to you?*

Members of any social class may belong to any faction. Social classes carry default values but do not have derived beliefs — circumstance is not ideology.

The tension between a character's faction and their class is often the most important narrative information.

---

## Characters

Characters are individual agents within the simulation.

A character may be an NPC, a party member, or a faction leader.

Characters possess: values, beliefs (emergent or overridden), faction alignment, social class, influence, impressionable, conviction, pressure, doubt direction, and a narrative state (Alive, Dead, Missing, Forgotten).

Unlike factions, characters are not defined solely by ideology. The most interesting characters exist in tension with their faction, their class, or their own values.

---

## Relationship Scoring

Relationships are directional.

Faction A's opinion of Faction B may differ from B's opinion of A.

The source's own values govern how much each component of the score matters. A faction that barely values Agency will barely react to a Ritual belief disagreement. This is what makes asymmetry real rather than merely possible.

### Formula

**Belief contributions** — one per axis, each weighted by the source's investment in that axis:

```text
beliefContrib(axis) = scoreBelief(source.belief[axis], target.belief[axis]) × source.values[axis]
```

Where `scoreBelief` returns:

- `+beliefMatch` (default 2.5) if both positions agree and neither is neutral
- `+beliefConflict` (default −1.0) if positions conflict and neither is neutral
- `0` if either position is neutral

**Value terms** — two separate calculations:

```text
alignmentContrib = dot(source.values, target.values) × valueAlignmentScale
conflictContrib  = dot(source.values, inverse(target.values)) × valueConflictScale
```

*Alignment* measures how much the two actors want the same things.
*Conflict* measures how much of what the source prioritizes, the target explicitly deprioritizes.
These are not inverses. Both can be high simultaneously.

**Sub-scores:**

```text
beliefSubScore = beliefContrib(A) + beliefContrib(B) + beliefContrib(C)
valueSubScore  = alignmentContrib − conflictContrib
```

**Stress-weight composition** (optional) — shifts the ratio of beliefs to values as stress rises:

```text
t            = min(colonyStress / 10, 1)
stressWeight = curve(t) × intensity
beliefScale  = 1 − stressWeight
valueScale   = 1 + stressWeight

baseScore = beliefSubScore × beliefScale + valueSubScore × valueScale
```

When disabled, both scales are 1.0 and the formula reduces to:

```text
baseScore = beliefSubScore + valueSubScore
```

The curve controls how quickly the shift accelerates (Linear, Quadratic, Cubic, Exponential). Intensity controls how dramatic the shift becomes at peak stress — at intensity 1.0 and stress 10, beliefs contribute 0× and values contribute 2×.

**Stress modifier** — asymmetric by sign, runs after composition:

```text
t = min(colonyStress / 10, 1)
if baseScore > 0: stressedScore = baseScore × (1 + stress × positiveMultiplier × (1 − t))
if baseScore < 0: stressedScore = baseScore × (1 + stress × negativeMultiplier × t)
```

Positive relationships receive a diminishing boost as stress increases — at peak stress the bonus fades entirely.
Negative relationships receive an accelerating penalty as stress increases.
Conflict escalates faster than cooperation under pressure.

Because stress-weight composition runs first, the stress modifier amplifies a score whose ingredients have already shifted. At high stress with value conflict, values dominate the base score and the modifier then amplifies that negative — producing intense, visible antagonism rooted in incompatible priorities.

**Final score:**

```text
finalScore = stressedScore + manualBump
```

### Labels

The final score maps to a relationship label via configurable thresholds. Defaults:

| Label       | Minimum Score |
| ----------- | ------------- |
| Aligned     | 6             |
| Cooperative | 4             |
| Friendly    | 2             |
| Tolerated   | −1            |
| Strained    | −4            |
| Opposed     | −10           |
| Hostile     | −∞            |

---

## Influence

Influence represents a faction's capacity to act.

For factions, influence is composed of three parts, each weighted separately:

**Base Influence** — structural authority: wealth, infrastructure, ritual authority, expertise, logistics. (Weight: 0.45)

**Character Influence** — derived from faction members. Blends the average member influence and the maximum member influence. (Weight: 0.35)

**Momentum** — short-term public energy. Stored as a raw value and normalized before entering the formula. (Weight: 0.20)

### Influence Formula

```text
characterInfluence = (avg(member.influence) × memberAvgWeight) + (max(member.influence) × memberMaxWeight)
normalizedMomentum = 50 + (momentum / 2)
totalInfluence = (baseInfluence × 0.45) + (characterInfluence × 0.35) + (normalizedMomentum × 0.20)
```

All weights are configurable.

---

## Legitimacy

Legitimacy represents perceived moral authority.

Legitimacy answers: *Do people believe this faction deserves power?*

Legitimacy is intentionally separate from Influence. A faction may have high influence and low legitimacy, or the reverse.

---

## Effective Power

Effective Power represents practical capability.

Effective Power answers: *How much can this faction actually accomplish right now?*

### Effective Power Formula

```text
legitimacyModifier = legitimacyBase + (legitimacy / legitimacyScale)
effectivePower = totalInfluence × legitimacyModifier × leaderlessMultiplier
```

If a faction has no living faction leader, `leaderlessMultiplier` applies a penalty (default 0.75). All weights are configurable.

---

## Conviction

Conviction represents a character's intrinsic resistance to change.

High conviction: stable beliefs, low drift.
Low conviction: vulnerable to pressure, greater drift.

### Peer Influence Bonus

Characters are not isolated. Belonging to a faction with influential members provides a conviction bonus — faction cohesion stabilizes individuals.

```text
convictionBonus = mean(peer.influence) × (character.impressionable / 100) × scale
effectiveConviction = conviction + convictionBonus
```

`impressionable` governs how strongly a character responds to their peers. A character with high impressionable and influential faction-mates is meaningfully more stable than their base conviction suggests.

Range: `0–100` (effective conviction can exceed 100 due to the bonus, which only makes drift more negative)

---

## Pressure

Pressure represents external stress placed upon a character.

Pressure is the primary driver of character change.

Sources may include: faction conflict, personal loss, leadership collapse, major events, and colony stress itself.

Range: `0–100` (stored value; effective pressure may exceed 100)

---

## Colony Stress

Colony Stress represents overall societal strain.

Stress answers: *How much tension is the colony under?*

Range: `0–10`

Stress is not only a modifier on relationship scores — it directly inflates the effective pressure of every character simultaneously:

```text
effectivePressure = character.pressure + (colonyStress × 10)
```

Stress 5 adds 50 pressure to every character in the colony, regardless of their faction or circumstance. Rising stress is rising instability for everyone.

Low stress: compromise is easier, factions tolerate disagreement.
High stress: alliances harden, ideological differences are magnified, the entire population is under strain.

Stress is expected to increase throughout the campaign.

---

## Doubt

Every character possesses a Doubt Direction — the value axis they gravitate toward when their existing worldview begins to fail.

Doubt creates narrative tension. It does not represent certainty. It represents vulnerability.

---

## Drift

Characters do not automatically change factions.

Pressure causes gradual value drift. A character under sufficient pressure drifts toward their doubt direction.

### Drift Score

```text
effectiveDrift = effectivePressure − effectiveConviction
```

A positive drift score indicates ideological instability. High positive values signal likely defection, faction crisis, or personal breakdown.

### Drift Target

The doubt direction defines a geometric endpoint in the ternary space. When a character drifts, the doubted value component trends toward zero. The character's position moves along the graph toward the opposite edge — the edge that excludes their doubted value entirely.

This is the furthest a character could drift, not an immediate destination.

---

## The Party

The Party is modeled as a special actor within the colony.

The Party has values, beliefs, and faction relationships. All factions calculate directional relationships toward the Party using the same scoring rules used everywhere else in the simulation.

---

## Sessions

Sessions are the primary unit of historical progression.

A session represents one snapshot of campaign play. Sessions contain Events.

---

## Events

Events are narrative containers. They describe what happened.

Events themselves contain no simulation logic.

Example: "Darkwing exposes Keeper records."

---

## Effects

Effects are the source of simulation change.

Effects modify colony state, factions, characters, and relationships. One event may contain multiple effects. Effects are explicit — they represent direct, stated consequences.

Effectful properties:

| Target    | Properties                                                       |
| --------- | ---------------------------------------------------------------- |
| Colony    | Stress                                                           |
| Faction   | Momentum, Legitimacy, Relationship Bump, Party Relationship Bump |
| Character | Pressure, Influence, State, Faction Change                       |

---

## Cascades

Cascades represent automatic reactions that fire within a session when a trigger condition is met.

There are three trigger types:

**Streak** — fires when a property has moved in the same direction (positive, negative, or either) for a minimum number of consecutive sessions.
Example: momentum has been negative for 3 consecutive sessions → legitimacy decreases.

**Threshold** — fires when a property's current value crosses a fixed boundary.
Example: legitimacy falls below 20 → additional momentum penalty.

**Event** — fires when a specific effect occurs in the current session, optionally filtered by entity subtype or specific value.
Example: a FactionLeader's state is set to Dead → faction momentum decreases.

All cascade rules are configurable and can be added, removed, or modified in Settings.

---

## Trends

Trends represent patterns detected across the historical record, distinct from within-session cascades.

Where cascades fire in response to a single session's events, trends emerge from examining multiple sessions together.

Example:

```text
Negative Momentum for 3 consecutive sessions
  → Legitimacy decreases
```

---

## Snapshots

Snapshots preserve the historical state of the colony.

A snapshot represents the full state of the colony immediately after a session completes: faction momentum and legitimacy, character pressure, influence, state, and faction membership, cumulative relationship bumps, and all derived cascade effects for that session.

Current State is simply the most recent snapshot. Snapshots enable historical analysis and trend detection.

---

## Configuration

All scoring weights, formula coefficients, relationship thresholds, belief axis definitions, value axis labels, edge labels, and cascade rules are user-configurable through the application's Settings panel.

The values documented above (2.5 belief match, 0.45 base influence weight, etc.) are defaults. They represent the calibrated starting point for this campaign, not fixed constraints of the system.

When a design decision depends on a specific weight or threshold, that dependency should be made explicit — because any of these values can change.

---

## Campaign Truths

These assumptions are foundational and should not change without deliberate intent.

- Every faction is correct about something.
- Every faction is blind to something.
- No faction possesses the full answer.
- Relationships are directional.
- Low stress reveals positions. High stress reveals priorities.
- Stress accelerates conflict.
- Influence and Legitimacy are different concepts.
- The colony is the primary antagonist.
- The campaign has no predetermined solution.
- The purpose of the simulation is not to determine who is right. It is to understand how people respond to pressure.
