---
id: event.the-institute
slug: the-institute
name: The Institute
summary: A damaged OCC reference on the Manor map leads to five corrupted Engrams in the Engram Vault.
function: Investigate Memory
synopsis: >-
  Near the Engram Vault, the Manor map preserves a partially obscured EGRESS reference, #-9.#3/#-OCC/R#22-3, and the
  Observer's question: WHO DID THIS REMEMBER BEING? EGRESS stores Engrams, technical records of lived experience,
  including a pre-Reading baseline from every Keeper. It has also made a more dangerous category: corrupted Engrams
  recorded from Veiled Incursions. Five quarantined records match the damaged reference. The route asks whether genuine
  remembered experience is enough to reconstruct a person.
part: part.act-2
chapter: the-manor-routes
order: 5
route: EGRESS
links:
  - npc.veyra-kess
  - asset.egress-institute
  - asset.engram-vault
variesBy:
  - branch.the-reading
variants:
  - key: succeeds
    when:
      - path.the-reading-succeeds
    summary: An unidentified Keeper engram reacts to pieces of someone the Party cannot remember.
    synopsis: >-
      A mark on the Manor map leads the Party to EGRESS and the Engram Vault, where the Institute routinely stores
      pre-Reading cognitive baselines from Keepers. The most recent Keeper's engram remains in the archive, but neither
      EGRESS nor the Party can coherently identify its subject. The Party's unexplained possessions, habits, and
      emotional responses begin producing measurable reactions around the recording. EGRESS sees an unprecedented
      opportunity to compare a preserved pre-Reading mind with the relational fragments left behind after a completed
      Reading.
    leadsTo:
      - to: encounter.playing-for-keeps
        thread: thread.the-keeper
  - key: stopped
    when:
      - path.the-reading-is-stopped
    summary: Vara realizes EGRESS may hold memories of both herself and her forgotten father.
    synopsis: >-
      Vara recognizes the EGRESS notation on the Manor map because an Institute technician recorded her pre-Reading
      engram at the House of Abiding. She wants to know whether her familiarity with the map existed before she opened
      the Book. If she reached her father's memories during the interrupted Reading, the implication becomes more
      urgent: EGRESS should also possess a pre-Reading baseline from the previous Keeper. The Institute now has Vara's
      baseline, her father's archived engram, and living Vara after an interrupted Reading—an unprecedented comparison
      that EGRESS is eager to study.
    leadsTo:
      - to: encounter.playing-for-keeps
        thread: thread.the-missing-father
      - to: encounter.playing-for-keeps
        thread: thread.egress
status: draft
provenance:
  - doc: Campaign Outline
    heading: Manor Route 3 — EGRESS Institute > The Institute → Playing for Keeps > Manor Hook — The Damaged OCC Reference
readiness:
  status: compiled
---

## Opening State

The damaged OCC notation leads to EGRESS. Use the established relationship if Darkwing already visited with Gressa; do not repeat first-contact hostility as though Containment never happened.

## Arrival and Demonstration

On a first visit, Frames enforce access literally until Orlo authorizes entry. He can intervene before violence causes irreversible harm; the purpose is to establish classification and literal procedure. Show an authentic Engram loaded into a Frame, creating a Proxy. It expresses Memory without becoming the original person. Veyra’s personal Proxy makes that distinction relationally painful.

## The Damaged Reference

### Manor Hook — The Damaged OCC Reference
The Observer's Manor map does not merely circle EGRESS. Near the **Engram Vault** it preserves a partially obscured internal reference:

> **`#-9.#3/#-OCC/R#22-3`**

The `#` marks unreadable characters on the physical notation, not EGRESS wildcard syntax.

The surviving reference is enough to establish several things before Darkwing understands their significance:

- the record belongs to **archival group 9**;
- the subject/specimen number ends in **3**;
- the individual Engram letter is unreadable;
- the **OCC** suffix is intact;
- the transcription batch ends in **22-3**;
- the Vault sector and the hundreds place of the Reading number are lost.

The notation is a question, not an instruction. A nearby Observer annotation can read:

> **WHO DID THIS REMEMBER BEING?**

When EGRESS searches its archive against the surviving characters, exactly five quarantined corrupted Engrams match:

| Full Record | Sector Memory Domain | Safe Catalog Description |
|---|---|---|
| **A-9.13/b-OCC/R122-3** | Autobiographical | Persistent first-person identity assertion; domestic recollection |
| **B-9.43/d-OCC/R122-3** | Procedural | Repeated task sequence; strong completion imperative |
| **C-9.63/a-OCC/R022-3** | Spatial | Persistent route-seeking behavior; recurring inaccessible destination |
| **E-9.73/c-OCC/R122-3** | Interpersonal | Repeated recognition of an unidentified second party |
| **F-9.93/e-OCC/R022-3** | Affective | Severe attachment/grief response; identity assertion under distress |

The damaged reference genuinely does not determine which of the five the Observer meant. Darkwing must decide which thread to pull.

## A Deliberate Experiment

Orlo recognizes the OCC suffix. The proposed full-power comparison is intentional, not a filing error. Explain that these records were safely inspected at lower strength but have never been used in this topology. EGRESS offers voluntary baseline recordings to willing characters without promising resurrection.

Darkwing chooses among five genuine matches. The institution believes the Core observes data; the encounter reveals that its comparison can itself supply Recognition.

## Possible Next Developments

:ref[Playing for Keeps]{#encounter.playing-for-keeps} owns the Vault experiment, roster, deduction and emergency. Declining the experiment leaves other routes available and does not trigger it secretly behind the Party’s backs.
