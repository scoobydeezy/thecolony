---
# yaml-language-server: $schema=../../../schemas/event.schema.json
id: event.eclipse
slug: eclipse
name: Eclipse
summary: The eclipse returns because the Reading's closed inheritance has reopened.
function: Begin Act III
synopsis: "The eclipse begins again through a branch-specific mechanism: either Vara resumes the interrupted Reading or the reconstruction of the forgotten Keeper reestablishes a living relationship with the Book. In either case, the returning shadow proves that the problem Darkwing thought it resolved in Act I is active again."
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
    synopsis: No new Keeper begins a Reading. Instead, the pieces of Vara preserved across the Party's, records, objects, and other anchors have become coherent enough to reestablish a living relationship with the Book's supposedly closed inheritance. While the Party is occupied with the Observer, the eclipse begins again. The returning shadow is the first undeniable sign that reconstructing the forgotten Keeper has reopened a transfer the Colony believed complete.
  - key: stopped
    when:
      - path.the-reading-is-stopped
    summary: Vara disappears, and the returning eclipse reveals that the Reading has begun again.
    synopsis: "In the aftermath of the Confluence, Vara disappears. Depending on the Colony state and her relationship with the Party, she may return willingly to the Book, be persuaded, manipulated, pressured, or taken. The Party does not initially know what happened. The returning eclipse provides the answer: Vara is once again reading names in the Ritual Chamber, and the interrupted transfer has resumed."
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
---

