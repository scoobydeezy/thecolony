---
# yaml-language-server: $schema=../../../schemas/event.schema.json
id: event.the-institute
slug: the-institute
name: The Institute
summary: A damaged OCC reference on the Manor map leads to five corrupted Engrams in the Engram Vault.
function: Investigate Memory
synopsis: >-
  Near the Engram Vault, the Manor map preserves a partially obscured EGRESS reference, #-9.#3/#-OCC/R#22-3, and the Observer's question: WHO DID THIS REMEMBER BEING? EGRESS stores Engrams, technical records of lived experience, including a pre-Reading baseline from every Keeper. It has also made a more dangerous category: corrupted Engrams recorded from Veiled Incursions. Five quarantined records match the damaged reference. The route asks whether genuine remembered experience is enough to reconstruct a person.
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
    summary: EGRESS still holds Vara's pre-Reading Engram under a recorded identity no one remembers.
    synopsis: >-
      EGRESS still possesses Vara's pre-Reading Engram under her recorded identity even though the Colony no longer consciously remembers her. The Party may experience unexplained reactions to the candidate, to her compass, or to other surviving residues, but those reactions do not replace the deterministic comparison procedure.
    leadsTo:
      - to: encounter.playing-for-keeps
        thread: thread.the-keeper
  - key: stopped
    when:
      - path.the-reading-is-stopped
    summary: Vara's own pre-Reading Engram and her father's record can both appear among the candidates.
    synopsis: >-
      Vara can encounter both her own pre-Reading Engram and Marek's record as ordinary candidates inside the comparison set. Their presence can make the route intensely personal without requiring either one to be the hidden subject.
    leadsTo:
      - to: encounter.playing-for-keeps
        thread: thread.the-missing-father
      - to: encounter.playing-for-keeps
        thread: thread.egress
status: draft
readiness:
  status: compiled
provenance:
  - doc: Campaign Outline
    heading: Manor Route 3 — EGRESS Institute > The Institute → Playing for Keeps > Manor Hook — The Damaged OCC Reference
  - doc: Campaign Outline
    heading: Manor Route 3 — EGRESS Institute > The Institute → Playing for Keeps > Branch Texture
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

:::branch{when=path.the-reading-succeeds}
EGRESS still possesses Vara's pre-Reading Engram under her recorded identity even though the Colony no longer consciously remembers her. The Party may experience unexplained reactions to the candidate, to her compass, or to other surviving residues, but those reactions do not replace the deterministic comparison procedure.
:::

:::branch{when=path.the-reading-is-stopped}
Vara can encounter both her own pre-Reading Engram and Marek's record as ordinary candidates inside the comparison set. Their presence can make the route intensely personal without requiring either one to be the hidden subject.
:::

## Possible Next Developments

:ref[Playing for Keeps]{#encounter.playing-for-keeps} owns the Vault experiment, roster, deduction and emergency. Declining the experiment leaves other routes available and does not trigger it secretly behind the Party’s backs.
