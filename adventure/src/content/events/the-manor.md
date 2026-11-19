---
id: event.the-manor
slug: the-manor
name: The Manor
summary: An ownerless Manor contains an annotated map of the Colony.
function: Open Act II
synopsis: >-
  Darkwing reaches an apparently ownerless Manor through a branch-specific lead and discovers subtle signs that someone
  still maintains and uses it. Inside is a detailed annotated map of the Colony, its factions, institutional questions,
  and several actionable leads. The map opens Act II without dictating which investigations Darkwing must pursue.
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
    synopsis: >-
      The Aspis Administrator resumes the impossible-records investigation that was interrupted. Having now witnessed
      his first Reading and watched new discontinuities appear in records he personally understands, he can reinterpret
      the older anomalies. One property stands out: a large Manor that remains maintained and supplied despite having no
      coherent remembered owner. The Party investigates and finds unmistakable signs of current occupation alongside a
      detailed annotated map of the Colony, its factions, and several actionable leads.
  - key: stopped
    when:
      - path.the-reading-is-stopped
    summary: An apparently empty Manor becomes Vara's refuge—and turns out not to be empty.
    synopsis: >-
      Uldren needs somewhere outside the Order's immediate control where Vara will not become Dawn's political
      centerpiece. Witness records identify a large Manor from which possessions were once recovered after its owner
      could no longer be established; the house is believed to be empty. The Party brings Vara there as an improvised
      safe house and finds subtle evidence that someone still maintains and uses the property. Inside is a detailed
      annotated map of the Colony, its factions, and several actionable leads.
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
readiness:
  status: compiled
---

## Opening State

The Party reaches a maintained house whose owner cannot be coherently established. Use Uldren’s refuge lead on the stopped path, Perrik’s property anomaly on the successful path.

## Evidence of Occupation

The house is not an abandoned treasure cache. Show small signs of recent use before the map: maintained rooms, supplies, and a workspace someone returns to. Do not reveal Silas’s whole explanation here. The map’s cartographic corrections can feel familiar to Vara or to the Party’s surviving residues without immediately naming Marek.

## The Map’s Leads

The Observer's map circles or annotates at least the following:

- **The Broken Bell** — annotation: **THE RECKONING IS COMING**
- **Pilgrim's Rest / the Face of the Unknown**
- **EGRESS Institute / Engram Vault**
- **Crescent Island / the Dawn route**
- **Crescent Island / the Veiled House**
- **The Clearing House / Claims Registry**

The map provides several genuine leads and no prescribed order.

The EGRESS annotation includes the damaged reference **`#-9.#3/#-OCC/R#22-3`**, with **WHO DID THIS REMEMBER BEING?** nearby. The marks are unreadable characters, not archive wildcard syntax. It poses a question; it does not instruct the Party to energize a corrupted record.

Miriel, if present as Dawn’s liaison, recognizes an old family sign on Crescent Island and goes ahead to investigate. If she is unavailable, preserve the mark as a lead that her family or Dawn records can explain.

## Choosing Investigations

## The Routes Are Self-Contained Lessons

Each route is a complete adventure demonstrating a different failure mode in reconstructing Identity.

One route does not mechanically unlock another.

There is no canonical Route A → Route B sequence.

The Party may pursue whatever seems most urgent, personal, useful, or interesting.

## The Expected Pace Is Two Routes, Not the Rule

Two substantial routes are a useful planning expectation because they give the Party enough firsthand vocabulary for the Confluence without turning Act II into a completion checklist.

But the Party may pursue more.

If the Party starts a third route, the Colony does not prevent it.

The cost is that faction activity continues accelerating while they are inside it.

## The Confluence Begins When Investigation Becomes Implementation

Do not trigger the Confluence because the Party has accumulated exactly two route completions.

Trigger it when the state of the Colony satisfies three conditions:

1. **The Party understands enough to recognize incompatible partial answers.**
2. **Multiple factions have learned enough—or believe they have learned enough—to start acting rather than merely investigating.**
3. **The Reading-path pressure creates an unavoidable collision around Vara, the Party's reconstruction, or a contested Asset.**

The between-session **Colony Turn** advances eligible champion-led operations according to *:ref[the faction rules]{#rule.faction-goals}*. Its results supply the changing political situation; the Confluence is the narrative collision of consequential goals and direct player choices, **not** a fixed number of rolls, session boundaries, or completed routes.

A third investigation can begin while the Confluence is already starting around the Party.

## The Soft Clock Is Behavioral

The Colony should signal escalation through action rather than a visible countdown.

Examples:

- EGRESS seals a lower wing.
- Dawn calls an emergency Assembly.
- The Order recalls patrols.
- Kivren empties a cache.
- Witnesses relocate an Asset.
- Vara leaves to pursue something the Party did not prioritize.
- Kelda receives orders she dislikes.

The desired player realization is:

> **We can still investigate, but the Colony is no longer waiting for us.**

The map can become the table’s evolving record of factions and evidence. It is not a mandatory final puzzle. Revisit Perrik’s earlier evidence board here if the successful Reading makes its missing connections meaningful; it should not have displaced the Keeper’s Calling.

## Possible Next Developments

Follow any of the five Manor routes, revisit :ref[the Clearing House]{#location.clearing-house}, or act on another concrete lead. :ref[The Confluence]{#event.the-confluence} begins when faction investigation becomes implementation.
