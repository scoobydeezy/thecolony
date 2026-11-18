---
# yaml-language-server: $schema=../../../schemas/npc.schema.json
id: npc.pip-quickstep
slug: pip-quickstep
name: Pip Quickstep
role: Baker
ancestry: Halfling
heritage: Shire
class: Rogue
background: Baker
level: 1
gender: Male
age: 24
summary: Popular baker organizing ordinary citizens who fear Dawn’s reforms will destabilize the Colony.
narrativeTier: Background
status: draft
origin: prepared
start:
  faction: faction.order-of-theia
  socialClass: faction.civilians
  location: location.keeper-district
  state: Alive
  instability: Stable
  values:
    truth: 0.25
    stability: 0.55
    agency: 0.2
  beliefs: {}
  doubt: B
  conviction: 20
  pressure: 20
  influence: 5
  impressionable: 95
---

