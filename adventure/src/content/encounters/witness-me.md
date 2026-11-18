---
# yaml-language-server: $schema=../../../schemas/encounter.schema.json
id: encounter.witness-me
slug: witness-me
name: Witness Me
summary: The house proves that objects lose meaning when stripped from their place.
function: "Identity: Context"
synopsis: Darkwing applies the Hall of Remembrance lesson by identifying which possessions belong together, but the Veiled House demonstrates that those relationships remain incomplete without context. Removing the one object still where it belongs ruptures the house into an impossible but fixed maze of repeated Hearths. Resolution requires restoring not only which things were connected, but where and how those relationships existed.
part: part.act-2
chapter: the-manor-routes
order: 10
event: event.the-veiled-house
leadsTo:
  - to: encounter.the-burden
    thread: thread.the-first-witnesses
links:
  - npc.celia-harthwright
  - asset.ledger
variesBy:
  - branch.the-reading
variants:
  - key: succeeds
    when:
      - path.the-reading-succeeds
    summary: The house tries to fill a different Keeper-shaped absence.
    synopsis: The Party initially applies the lesson learned at the Hall of Remembrance, identifying which possessions belong together, but moving or isolating those objects makes the manifestation worse. Rooms overlap and domestic routines begin assigning false roles as the house attempts to use the Party's surviving Vara-shaped residues to fill the missing center of an entirely different historical household. The Party must restore relationships between objects, rooms, routines, and people while distinguishing two different Keepers from the single institutional role they shared. The encounter demonstrates that correct fragments placed in the wrong context can still produce a false identity.
  - key: stopped
    when:
      - path.the-reading-is-stopped
    summary: The house recognizes Vara as “the Keeper” and tries to make her part of another life.
    synopsis: The Party initially applies the lesson learned at the Hall of Remembrance, identifying which possessions belong together. But removing the Greater Insistent Door Knocker, the last object still in its historically correct place, ruptures the house once into an impossible but fixed labyrinth of repeated Hearths. The house's hostile manifestation is always the same forgotten Order Keeper who lived there, an overzealous custodian rather than a killer, and every wrong arrangement of its Context objects calls it up again. The Party must map the maze and restore not only which things were connected, but where and how those relationships existed. The encounter demonstrates that correct fragments placed in the wrong context can still produce a false identity.
status: draft
provenance:
  - doc: Campaign Outline
    heading: Manor Route 5 — Witnesses
  - doc: Encounters
    heading: 10. Witness Me — Veiled House
---

