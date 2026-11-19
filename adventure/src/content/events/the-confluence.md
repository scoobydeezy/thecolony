---
id: event.the-confluence
slug: the-confluence
name: The Confluence
summary: Darkwing runs out of time as the factions' partial answers collide.
function: Act II Climax
synopsis: >-
  Darkwing has time to deeply pursue only some of the Manor's leads. The factions it does not visit continue acting
  anyway. Their goals advance, rivalries harden, and partial solutions move from theory into action until investigation
  is overtaken by a crisis shaped by the Colony state Darkwing has created.
part: part.act-2
chapter: convergence
order: 1
leadsTo:
  - to: event.the-observer
    thread: thread.the-observer
variesBy:
  - branch.the-reading
variants:
  - key: succeeds
    when:
      - path.the-reading-succeeds
    summary: Vara's surviving pieces become coherent enough that the Order moves to separate them.
    synopsis: >-
      The Party has had time to deeply pursue only some of the Manor's leads while every unvisited faction continued
      advancing its own goals. The Order has been watching the Party and understands the danger of what recreating Vara
      might do. His Prominence recognizes the Party as a second distributed anchor for the forgotten Keeper. The Order
      launches an emergency Closure intended to separate people, evidence, objects, and mnemonic resources before the
      reconstruction becomes complete. Other factions intervene according to the goals the Party has helped or hindered,
      turning the operation into a collision of partial solutions.
    links:
      - npc.serevan-ilvar
      - npc.kelda-varruk
  - key: stopped
    when:
      - path.the-reading-is-stopped
    summary: Every faction has an answer for Vara, and several try to impose theirs at once.
    synopsis: >-
      The Party has had time to deeply pursue only some of the Manor's leads while every unvisited faction continued
      advancing its own goals. Vara remains both a political symbol and the living focal point of an interrupted ritual
      whose burden has not been resolved. The Order, Dawn, EGRESS, Witnesses, Shattered, and others act on incompatible
      ideas about what should happen to her and to the Colony. Their operations collide according to the goals the Party
      has helped or hindered, while Vara pursues her own priorities rather than waiting to become someone else's
      solution.
status: draft
provenance:
  - doc: Campaign Outline
    heading: Session 8 — The Confluence
readiness:
  status: compiled
---

## Opening State

Faction projects have become actions. Choose the person or Asset under greatest actual pressure, drawing participants from progressed goals and direct play.

## At the Table

**Objective:** preserve people and meaningful evidence while incompatible institutional answers collide. **Preparation:** give each present actor a concrete objective, method and red line. **Trigger:** Darkwing knows enough to recognize the conflict, several factions are implementing partial answers, and branch pressure makes collision unavoidable. Two completed routes are a pacing expectation, never a gate.

## Stage the Collision

Use :ref[the Colony Turn]{#rule.colony-turn} and actual campaign state. Show the operation in motion—custody, seizure, relocation, Closure or an attempted Reading—rather than convening seven speakers for a debate. Allies can act independently. Central NPCs retain choices the Party did not authorize.

:::branch{when=path.the-reading-is-stopped}
Vara is a living person whom the factions have begun treating as proof. She may return to the Book willingly, be persuaded, manipulated, or taken; none is mandatory. The resumed Reading’s eclipse begins during the Confluence, before the Observer’s full reveal. If she completes the reading and writes her name, **the Book rejects the attempt**: she is not Forgotten and the eclipse does not move. Do not replay the Act I transfer to force branch convergence.

A normal threshold can open into the Manor, with Silas waiting. Treat this as the authored transition, not evidence that Silas secretly caused every phenomenon. If Darkwing prevents the resumed rite entirely, preserve that outcome and build the ongoing eclipse from the distributed transfer already established in play; record the exceptional cause.
:::

:::branch{when=path.the-reading-succeeds}
Darkwing’s reconstruction carries Vara as a distributed second anchor. Serevan initiates Closure: separate people from one another and from objects, engrams or records that sustain the reconstruction. Kelda’s role follows her actual relationship and availability. The diagnosis can be correct while the coercive remedy repeats the original injustice. Preserve enough of Vara’s pattern for the surviving anchors to converge at the Manor. The eclipse begins **after** the Observer reveal and the Party’s truthful acknowledgment of the relationship.
:::

## Resolution

Record who has custody of people, evidence and Keystones; which goals changed; what Vara actually chose; and the state of any threatened Asset. Do not award a universal faction reconciliation simply because Darkwing survived the collision.

:::design
The stopped-path rejected Reading follows the latest explicit user ruling recovered from Campaign Narrative Outline. It overrides the older export’s suggestion that the Book accepts a portion. The exceptional no-resumed-rite fallback is provisional and must preserve player success.
:::

## Possible Next Developments

:ref[The Observer]{#event.the-observer} holds the complete reveal and ends Act II on both paths.
