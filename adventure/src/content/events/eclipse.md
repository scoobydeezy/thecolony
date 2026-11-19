---
id: event.eclipse
slug: eclipse
name: Eclipse
summary: The eclipse returns because the Reading's closed inheritance has reopened.
function: Begin Act III
synopsis: >-
  Act III opens with the eclipse already underway: it began at the Confluence on the stopped path, or after the Observer
  reveal on the successful path. The Colony races toward Totality while the consequences for Vara remain distinct.
part: part.act-3
chapter: catastrophe
order: 1
leadsTo:
  - to: event.totality
    thread: thread.the-reading
links:
  - asset.book-of-names
  - asset.ritual-chamber
variesBy:
  - branch.the-reading
variants:
  - key: succeeds
    when:
      - path.the-reading-succeeds
    summary: Remembering Vara reopens a Reading the Colony believed was finished.
    synopsis: >-
      No new Keeper begins a Reading. Instead, the pieces of Vara preserved across the Party's, records, objects, and
      other anchors have become coherent enough to reestablish a living relationship with the Book's supposedly closed
      inheritance. While the Party is occupied with the Observer, the eclipse begins again. The returning shadow is the
      first undeniable sign that reconstructing the forgotten Keeper has reopened a transfer the Colony believed
      complete.
  - key: stopped
    when:
      - path.the-reading-is-stopped
    summary: The resumed Reading has begun during the Confluence; it cannot restore the old closed transfer.
    synopsis: >-
      Vara’s route to the Book follows actual choices and faction actions. A completed second attempt is rejected: Vara
      remains present and the eclipse does not move. The Observer’s full reveal follows that onset before Act III
      begins.
status: draft
provenance:
  - doc: Campaign Outline
    heading: Session 8 — The Confluence > If the Reading Was Stopped
  - doc: Campaign Outline
    heading: Session 8 — The Confluence > If the Reading Succeeded
  - doc: Campaign Outline
    heading: Session 9 — Totality
  - doc: Character Briefs
    heading: The Observer - Silas Venn > The Manor
readiness:
  status: compiled
---

## Opening State

The eclipse is already advancing when Act III opens. On the stopped path it began at the Confluence; on the successful path it followed the Observer’s reveal and renewed Relationship.

## The Race Through the Colony

Show existing faction operations colliding with a physical change everyone can see. Let Darkwing choose whom to protect, what evidence to preserve and where to go. The ritual route remains legible, but the Party’s actual position and priorities determine the journey.

:::branch{when=path.the-reading-is-stopped}
Vara’s resumed attempt cannot repeat the old transfer. If completed, the Book rejects her name; she remains present and the eclipse does not move. If the Party prevents or interrupts it, honor that intervention while the already distributed Weight continues its crisis. Another coerced Reading is not the only way forward.
:::

:::branch{when=path.the-reading-succeeds}
No new Keeper reads. The Party’s living reconstruction reconnects Vara with the closed inheritance. Different characters experience different surviving fragments. The Order may try to sever anchors; actual choices determine what is surrendered, protected or redistributed. Vara can become perceptible enough to testify without returning to ordinary life. She can both value being remembered and resent a burden reopened without a prepared destination.
:::

## What the Eclipse Proves

The old cancellation behavior is gone because memory now has relationships outside the single closed chain. Do not erase those relationships to force the old rules to work one last time.

## Possible Next Developments

:ref[Totality]{#event.totality} fixes the eclipse and opens the simultaneous fronts. Keep the branches’ personal consequences distinct even as their civic emergency converges.
