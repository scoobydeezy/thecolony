---
# yaml-language-server: $schema=../../../schemas/creature.schema.json
id: creature.evin-baby
slug: evin-baby
name: Evin Peakwalker Reconstruction (Baby)
summary: An enormous infant-shaped Echo that seeks Gressa, reconstructing one true relationship as an entire life.
status: draft
level: 15
rarity: unique
size: Huge
traits: [Aberration, Veiled, Echo, Relationship Resonance]
perception: 26
senses: [darkvision, resonance sense (imprecise) 30 feet]
languages: []
ac: 32
saves: { fort: 32, ref: 20, will: 26 }
hp: 344
immunities: [bleed, disease, poison, death effects]
speed: 30 feet
abilityDC: 36
strikes:
  - name: Hand
    type: melee
    bonus: 28
    damage: 3d12+17 bludgeoning
    traits: [reach 15 feet, Improved Grab]
provenance:
  - doc: Creatures
    heading: Evin Peakwalker Reconstruction (Baby) — Creature 15
  - doc: The Veiled
    heading: Minimal Worked Example — Bad Maps > False Reconstruction
design: >-
  Transferred without balance changes from the current Creatures export. This is a false reconstruction,
  not an NPC stat block for Evin himself; do not derive its identity, level or ancestry from npc.evin-peakwalker.
  The creature's Ability DC and the Source DC are separate statistics even though both currently equal 36.
  Tantrum belongs here as an ability; encounter tactics belong in Bad Maps. Balance and ordinary-object
  damage remain review items, not implied approvals from successful content validation.
---

## The False Conclusion

The bond between :ref[Gressa]{#npc.gressa-peakwalker} and :ref[Evin]{#npc.evin-peakwalker} is real. The Echo treats her surviving infant memories as the whole of his life. It is neither Evin returned nor a malicious impostor: it is a dangerous incomplete reconstruction seeking its mother.

## Abilities

### Scramble to Mother ◆◆

Baby Strides up to twice; each movement must bring it closer to Gressa if possible. Mundane difficult terrain does not reduce its Speed during this movement. At any point during the movement, it can make one Hand Strike against a creature obstructing its path.

### Squeeze ◆

**Requirement:** Baby has a creature grabbed or restrained in its Hand.

The creature takes 3d12 bludgeoning damage with a DC 36 basic Fortitude save. On a failure, it also cannot use reactions until the start of its next turn.

### Throw ◆

**Requirement:** Baby has a Large or smaller creature grabbed in its Hand.

Baby releases the creature and throws it up to 30 feet into an unoccupied space. The creature takes bludgeoning damage equal to half the distance thrown and lands prone.

### Flail ◆◆

Baby makes a Hand Strike against up to three different creatures within reach. These attacks count toward its multiple attack penalty, but the penalty does not increase until all attacks are made.

### Scream ◆◆

**Requirement:** Tantrum is active. **Frequency:** once per Tantrum.

Baby cries in a 30-foot emanation. Each creature in the area attempts a DC 36 Fortitude save.

| Result | Effect |
|---|---|
| Critical success | Unaffected |
| Success | Pushed 10 feet away from Baby |
| Failure | Pushed 20 feet and deafened until the end of its next turn |
| Critical failure | Pushed 30 feet, knocked prone, and deafened until the end of its next turn |

### Resonance Break: Tantrum

The first time during this Incursion that its :ref[Source's Reconstruction Condition]{#source.evin-cloth-toy} is broken, Baby enters a Tantrum until Dispersed. Restoring the condition does not end the Tantrum.

- AC becomes 30.
- Speed becomes 40 feet.
- Melee Strikes deal an additional 1d12 damage.
- Scream becomes available.

Use :ref[Dispersal]{#rule.dispersal} at 0 HP and the Source's current profile to determine whether reconstruction is possible. A new reconstruction uses the base statistics until Tantrum is triggered again.
