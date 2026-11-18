---
# yaml-language-server: $schema=../../../schemas/npc.schema.json
id: npc.boruk-stonehand
slug: boruk-stonehand
name: Boruk Stonehand
role: Caretaker
ancestry: Dwarf
heritage: Rock
class: Druid
background: Warden
level: 5
gender: Male
age: 122
summary: Oversees ritual grounds.
narrativeTier: Minor
status: draft
origin: prepared
start:
  faction: faction.order-of-theia
  socialClass: faction.burdened
  location: location.ritual-chamber
  state: Alive
  instability: Stable
  values:
    truth: 0.15
    stability: 0.75
    agency: 0.1
  beliefs: {}
  doubt: A
  conviction: 88
  pressure: 10
  influence: 35
  impressionable: 15
relationships:
  - to: npc.kelda-varruk
    type: Spouse
    visibility: Public
---

