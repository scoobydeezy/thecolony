---
id: rule.act-three-fronts
slug: act-three-fronts
name: Act III Front Outcomes
version: 1
status: draft
summary: Each front has one outcome that determines its Asset condition, Finale Pressure, and available contribution; relationship determines how that contribution is used.
appliesTo:
  - encounter.sunny
  - encounter.the-breach
  - encounter.milltown
  - encounter.the-tangled-web
  - encounter.the-open-door
  - encounter.the-burden
provenance:
  - { doc: Faction Goals, heading: IV. Act III — Totality and the Five Fronts }
  - { doc: Faction Goals, heading: The Five Fronts }
  - { doc: Faction Goals, heading: "One State, Three Effects — Never Three Tracks" }
  - { doc: Campaign Outline, heading: Faction Relationships as Act III Mechanics }
---

## Definition

At Totality the Colony's catastrophe has five faces, the **five fronts**: one per faction that brings an Identity capability to The Burden. They are concurrent crises, not five compulsory stops.

| Front | Faction | Front goal | Front Asset | Maintain guard on the front Asset |
|---|---|---|---|---|
| :ref[Sunny]{#encounter.sunny} | :ref[Shattered]{#faction.shattered} | :ref[Answer the Reckoning]{#goal.answer-the-reckoning} | :ref[Dead Drop Network]{#asset.dead-drop-network} | :ref[Protect the Network]{#goal.protect-the-network} |
| :ref[The Breach]{#encounter.the-breach} | :ref[EGRESS Institute]{#faction.egress-institute} | :ref[Contain the Breach]{#goal.contain-the-breach} | :ref[Engram Vault]{#asset.engram-vault} | :ref[Do Science]{#goal.do-science} |
| :ref[Milltown]{#encounter.milltown} | :ref[Dawn Assembly]{#faction.dawn-assembly} | :ref[Evacuate Milltown]{#goal.evacuate-milltown} | :ref[Assembly Hall]{#asset.assembly-hall} | :ref[Fortify the Assembly Hall]{#goal.fortify-the-assembly-hall} |
| :ref[The Tangled Web]{#encounter.the-tangled-web} | :ref[Witnesses]{#faction.witnesses} | :ref[Preserve the Ledger]{#goal.preserve-the-ledger} | :ref[The Ledger]{#asset.ledger} | :ref[Protect the Ledger]{#goal.protect-the-ledger} |
| :ref[The Open Door]{#encounter.the-open-door} | :ref[Cult of the Unknown]{#faction.cult-of-the-unknown} | :ref[Open the Door]{#goal.open-the-door} | :ref[Pilgrim's Rest]{#asset.pilgrim-s-rest} | :ref[Await the Pilgrims]{#goal.await-the-pilgrims} |

Each front resolves to one state. That state determines the front Asset's finale condition, its contribution to Finale Pressure, and its capability in The Burden. Do not score those three effects separately.

| Outcome | Finale Pressure | Capability |
|---|---:|---|
| Stable | +2 | Full contribution, directed by Insight and Relationship |
| Damaged | +1 | Half contribution, exactly as The Burden defines it |
| Lost | +0 | No contribution from that front |

Aspis and the Order are **not fronts** and contribute no Finale Pressure (see Interactions).

## Procedure

### Before the Front

Front goals are Achieve, Critical, Earliest Act III, **Auto-Resolve Off**. Their target has no automatic target state. A Progressing goal means a response has been staged, which the encounter inherits; it does not mean the emergency is already resolved. Defer a front goal that reaches Ready to Resolve.

Each front Asset has a Maintain guard, which defends it against threatening goals under :ref[The Colony Turn]{#rule.colony-turn}. Act II goals aimed at front Assets, such as :ref[Break the Shattered]{#goal.break-the-shattered} (Dead Drop Network), :ref[Steal the Ledger]{#goal.steal-the-ledger} and :ref[Understand]{#goal.understand} (the Ledger), can damage a front before it opens.

### Resolving a Front

1. **Respond.** Direct intervention, delegation, and no response use the encounter's prepared baselines. A delegate needs real capability, availability, relationship, and resources; the assignment consumes capacity that may be needed elsewhere. Actual play overrides a baseline within the prior-damage limit. Arrival alone does not earn a favorable outcome. A front clock continues while the Party is elsewhere. A general Ready to Resolve task has no invented deadline: the front's deadline comes from its encounter.
2. **Cap by prior damage.** The result cannot exceed the condition of its front Asset when the front resolves: Stable or Contested permits Stable; Damaged caps the result at Damaged; Destroyed makes it Lost. The played encounter establishes the actual result within that limit. Damage to a different Asset does not lower the front.
3. **Record.** The encounter's deadline and outcome govern resolution. Stable or Damaged makes its goal Accomplished; Lost makes it Failed. Record Lost as Destroyed on the Asset, including functional unavailability.

### Entering the Finale

Finale Pressure starts at 0; each resolved front contributes once. At **5 or more**, the Book's central reconstruction starts and The Burden begins **after the current scene ends**. If catastrophic deadlines expire first, terminal collapse triggers the same finale with the worse state actually established. Do not invent points to meet the threshold.

At entry, lock the contributions actually established. An unresolved front is **Pending**: it contributes nothing tactically and is not silently classified as Stable, Damaged, or Lost. Its later outcome changes the Colony without rewriting phases already played. An intervention earned during the fight is a new action, not a backdated score.

## Interactions

### Stance and Independence

Front condition measures whether and how strongly a faction can act. Insight and its relationship with Darkwing determine whether it assists or interferes.

| Relationship | Behavior |
|---|---|
| Committed | Integrates its capability into the Party's plan |
| Cooperative | Helps while retaining control of its operation and Assets |
| Strained | Access requires terms, negotiation, protection, or a battlefield objective |
| Hostile | Pursues an incompatible solution the Party may redirect, seize, circumvent, or oppose |

Record the relationship from actual play, not an extra numerical integrity check. Hostility does not remove the faction from the crisis. A controlled Keystone capability can grant independence from its faction's permission, but required Identity remains locally recoverable without it.

Aspis and the Order are **not fronts** and contribute no Finale Pressure. Perrik's presence, relationship, and access to the Claims Registry determine Aspis aid. Kelda's choices, relationship, and availability determine the Order's; the Hall of the Keepers is not a gate on her contribution.

:::design
The retired nine-condition Totality board is not restored. Specific scene clocks, rescue counts, intervention strengths, and unattended results remain with their encounters and The Burden. Deadline and offscreen-execution tuning remain open in Faction Goals; this entry does not invent them.
:::
