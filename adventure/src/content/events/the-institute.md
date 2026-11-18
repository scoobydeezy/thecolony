---
# yaml-language-server: $schema=../../../schemas/event.schema.json
id: event.the-institute
slug: the-institute
name: The Institute
summary: A damaged OCC reference on the Manor map leads to five corrupted Engrams in the Engram Vault.
function: Investigate Memory
synopsis: "Near the Engram Vault, the Manor map preserves a partially obscured EGRESS reference, #-9.#3/#-OCC/R#22-3, and the Observer's question: WHO DID THIS REMEMBER BEING? EGRESS stores Engrams, technical records of lived experience, including a pre-Reading baseline from every Keeper. It has also made a more dangerous category: corrupted Engrams recorded from Veiled Incursions. Five quarantined records match the damaged reference. The route asks whether genuine remembered experience is enough to reconstruct a person."
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
    synopsis: A mark on the Manor map leads the Party to EGRESS and the Engram Vault, where the Institute routinely stores pre-Reading cognitive baselines from Keepers. The most recent Keeper's engram remains in the archive, but neither EGRESS nor the Party can coherently identify its subject. The Party's unexplained possessions, habits, and emotional responses begin producing measurable reactions around the recording. EGRESS sees an unprecedented opportunity to compare a preserved pre-Reading mind with the relational fragments left behind after a completed Reading.
    leadsTo:
      - to: encounter.playing-for-keeps
        thread: thread.the-keeper
  - key: stopped
    when:
      - path.the-reading-is-stopped
    summary: Vara realizes EGRESS may hold memories of both herself and her forgotten father.
    synopsis: "Vara recognizes the EGRESS notation on the Manor map because an Institute technician recorded her pre-Reading engram at the House of Abiding. She wants to know whether her familiarity with the map existed before she opened the Book. If she reached her father's memories during the interrupted Reading, the implication becomes more urgent: EGRESS should also possess a pre-Reading baseline from the previous Keeper. The Institute now has Vara's baseline, her father's archived engram, and living Vara after an interrupted Reading—an unprecedented comparison that EGRESS is eager to study."
    leadsTo:
      - to: encounter.playing-for-keeps
        thread: thread.the-missing-father
      - to: encounter.playing-for-keeps
        thread: thread.egress
status: draft
provenance:
  - doc: Campaign Outline
    heading: Manor Route 3 — EGRESS Institute > The Institute → Playing for Keeps > Manor Hook — The Damaged OCC Reference
---

