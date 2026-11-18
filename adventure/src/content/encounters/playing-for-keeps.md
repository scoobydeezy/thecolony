---
# yaml-language-server: $schema=../../../schemas/encounter.schema.json
id: encounter.playing-for-keeps
slug: playing-for-keeps
name: Playing for Keeps
summary: A corrupted Engram recorded from a Veiled becomes a Source. The recording is accurate; the subject was not.
function: "Identity: Memory"
synopsis: "EGRESS loads one of five corrupted OCC Engrams, recorded from a Veiled Incursion rather than a verified person, into the Vault's comparison Core. At full strength, identity comparison supplies Recognition: the record that remembers being someone becomes a Source and reconstructs its Occlusion physically in the Core as the Vault locks down. Trapped and stalked, Darkwing tests authentic candidate Engrams one life at a time, reading each destructive response to deduce whose experience the corrupted record falsely claims. Restoring the correct authentic Memory makes the false experiential model untenable."
part: part.act-2
chapter: the-manor-routes
order: 6
event: event.the-institute
leadsTo:
  - to: encounter.the-breach
    thread: thread.egress
links:
  - npc.orlombuthalde-nix
  - asset.occlusion-containment
  - asset.engram-vault
variesBy:
  - branch.the-reading
variants:
  - key: succeeds
    when:
      - path.the-reading-succeeds
    summary: Vara's pre-Reading Engram is among the candidates, and the Party reacts to it without knowing why.
    synopsis: "EGRESS still holds Vara's pre-Reading Engram under her recorded identity, though no one consciously remembers her, and it sits in the comparison set as an ordinary candidate. The Party's possessions, habits, and unexplained reactions respond to it and to her compass, but those reactions do not replace the deterministic comparison: Darkwing must still deduce the corrupted record's subject from evidence."
    links:
      - npc.vara-cairn
      - npc.orlombuthalde-nix
  - key: stopped
    when:
      - path.the-reading-is-stopped
    summary: Vara meets her own Engram and her father's among the candidates.
    synopsis: Living Vara can encounter both her own pre-Reading Engram and Marek's archived record as ordinary candidates inside the comparison set. Their presence makes the route intensely personal without either being the hidden subject; the danger is letting recognition and grief stand in for the comparison the Core demands.
    links:
      - npc.marek-cairn
      - npc.vara-cairn
      - npc.orlombuthalde-nix
status: draft
provenance:
  - doc: Campaign Outline
    heading: Manor Route 3 — EGRESS Institute
  - doc: Encounters
    heading: 8. Playing for Keeps — EGRESS Engram Vault
---

