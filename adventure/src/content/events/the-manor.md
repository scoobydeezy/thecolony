---
# yaml-language-server: $schema=../../../schemas/event.schema.json
id: event.the-manor
slug: the-manor
name: The Manor
summary: An ownerless Manor contains an annotated map of the Colony.
function: Open Act II
synopsis: Darkwing reaches an apparently ownerless Manor through a branch-specific lead and discovers subtle signs that someone still maintains and uses it. Inside is a detailed annotated map of the Colony, its factions, institutional questions, and several actionable leads. The map opens Act II without dictating which investigations Darkwing must pursue.
part: part.act-2
chapter: opening
order: 2
leadsTo:
  - to: event.the-broken-bell
    thread: thread.the-reckoning-is-coming
  - to: event.the-institute
    thread: thread.egress
  - to: event.the-way-out
    thread: thread.crescent-island
  - to: event.the-veiled-house
    thread: thread.crescent-island
  - to: event.the-thin-place
    thread: thread.the-face-of-the-unknown
  - to: event.the-confluence
    thread: thread.faction-conflict
links:
  - npc.pepe-sylvya
  - npc.silas-venn
variesBy:
  - branch.the-reading
onPaths:
  - path.the-reading-succeeds
  - path.the-reading-is-stopped
variants:
  - key: succeeds
    when:
      - path.the-reading-succeeds
    summary: Pépé Sylvya finally makes sense, and the records point to an ownerless Manor.
    synopsis: "The Aspis Administrator resumes the impossible-records investigation that was interrupted. Having now witnessed his first Reading and watched new discontinuities appear in records he personally understands, he can reinterpret the older anomalies. One property stands out: a large Manor that remains maintained and supplied despite having no coherent remembered owner. The Party investigates and finds unmistakable signs of current occupation alongside a detailed annotated map of the Colony, its factions, and several actionable leads."
  - key: stopped
    when:
      - path.the-reading-is-stopped
    summary: An apparently empty Manor becomes Vara's refuge—and turns out not to be empty.
    synopsis: Uldren needs somewhere outside the Order's immediate control where Vara will not become Dawn's political centerpiece. Witness records identify a large Manor from which possessions were once recovered after its owner could no longer be established; the house is believed to be empty. The Party brings Vara there as an improvised safe house and finds subtle evidence that someone still maintains and uses the property. Inside is a detailed annotated map of the Colony, its factions, and several actionable leads.
    leadsTo:
      - to: event.the-observer
        thread: thread.the-observer
      - to: event.the-broken-bell
        thread: thread.the-reckoning-is-coming
      - to: event.the-thin-place
        thread: thread.the-face-of-the-unknown
      - to: event.the-institute
        thread: thread.the-missing-father
      - to: event.the-way-out
        thread: thread.the-dusk-of-the-dawn
      - to: event.the-veiled-house
        thread: thread.the-first-witnesses
      - to: event.the-way-out
        thread: thread.crescent-island
      - to: event.the-veiled-house
        thread: thread.crescent-island
      - to: event.the-institute
        thread: thread.egress
    links:
      - npc.vara-cairn
      - npc.silas-venn
      - npc.pepe-sylvya
      - npc.uldren-harthwright
status: draft
provenance:
  - doc: Campaign Outline
    heading: Session 5 — Dawn / The Morning After
  - doc: Campaign Outline
    heading: The Manor Investigation Model
  - doc: Character Briefs
    heading: The Observer - Silas Venn > The Manor
---

