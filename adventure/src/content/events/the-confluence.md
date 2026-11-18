---
# yaml-language-server: $schema=../../../schemas/event.schema.json
id: event.the-confluence
slug: the-confluence
name: The Confluence
summary: Darkwing runs out of time as the factions' partial answers collide.
function: Act II Climax
synopsis: Darkwing has time to deeply pursue only some of the Manor's leads. The factions it does not visit continue acting anyway. Their goals advance, rivalries harden, and partial solutions move from theory into action until investigation is overtaken by a crisis shaped by the Colony state Darkwing has created.
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
    synopsis: The Party has had time to deeply pursue only some of the Manor's leads while every unvisited faction continued advancing its own goals. The Order has been watching the Party and understands the danger of what recreating Vara might do. His Prominence recognizes the Party as a second distributed anchor for the forgotten Keeper. The Order launches an emergency Closure intended to separate people, evidence, objects, and mnemonic resources before the reconstruction becomes complete. Other factions intervene according to the goals the Party has helped or hindered, turning the operation into a collision of partial solutions.
    links:
      - npc.serevan-ilvar
      - npc.kelda-varruk
  - key: stopped
    when:
      - path.the-reading-is-stopped
    summary: Every faction has an answer for Vara, and several try to impose theirs at once.
    synopsis: The Party has had time to deeply pursue only some of the Manor's leads while every unvisited faction continued advancing its own goals. Vara remains both a political symbol and the living focal point of an interrupted ritual whose burden has not been resolved. The Order, Dawn, EGRESS, Witnesses, Shattered, and others act on incompatible ideas about what should happen to her and to the Colony. Their operations collide according to the goals the Party has helped or hindered, while Vara pursues her own priorities rather than waiting to become someone else's solution.
status: draft
provenance:
  - doc: Campaign Outline
    heading: Session 8 — The Confluence
---

