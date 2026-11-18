---
# yaml-language-server: $schema=../../../schemas/npc.schema.json
id: npc.evin-peakwalker
slug: evin-peakwalker
name: Evin Peakwalker
role: Forgotten
ancestry: Goblin
gender: Male
pronouns: He/Him
aliases:
  - The Child
  - Former Keeper
summary: Forgotten child remembered only as an infant by his Fractured mother, though he later grew up and completed the Reading as a Keeper.
narrativeTier: Supporting
status: draft
origin: prepared
start:
  faction: faction.order-of-theia
  socialClass: faction.burdened
  state: Forgotten
  instability: Stable
  values:
    truth: 0.3333
    stability: 0.3333
    agency: 0.3334
  beliefs: {}
  conviction: 85
  pressure: 0
  influence: 5
  impressionable: 25
relationships:
  - to: npc.gressa-peakwalker
    type: Mother
    visibility: Public
provenance:
  - doc: Character Briefs
    heading: Evin Peakwalker
---

