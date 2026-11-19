---
id: creature.evin-infant
slug: evin-infant
name: Evin Peakwalker Reconstruction (Infant)
status: draft
level: 10
rarity: unique
size: Tiny
traits:
  - ABERRATION
  - VEILED
  - ECHO
  - RELATIONSHIP RESONANCE
perception: 19
senses:
  - darkvision
  - resonance sense (Evin fragment Sources, imprecise) 30 feet
languages: []
skills: {}
ac: 27
hp: 40
saves:
  fort: 16
  ref: 14
  will: 19
immunities:
  - bleed
  - disease
  - poison
  - death effects
speed: 20 feet
abilityDC: 29
strikes:
  - name: Hand
    type: melee
    bonus: 21
    damage: 2d6+10 mental
    traits: []
provenance:
  - doc: Creatures
    heading: Evin Peakwalker Reconstruction (Infant) — Creature 10
---

### Same Baby, Smaller Body
The infant has the same iconic posture, gestures, proportions, and desperate dependency as the Giant Baby from *Bad Maps*, now reconstructed at Tiny size. Do not give it exaggerated arms or a distinct new body concept. It is obviously the same infant-shaped false conclusion at a different scale.

### Reaching Hands
Infant Evin does not deliberately attack. It crawls toward nearby creatures, reaches to be held, grabs at legs, and otherwise attempts ordinary infant contact. Its Hand Strike represents mnemonic pain caused when the incomplete reconstruction overlaps a living creature rather than a deliberate blow.

### Inconsolable Scream ◆◆ *(auditory, mental)*
**Requirement:** The Infant is not currently soothed by Comfort Baby.  
**Area:** 30-foot emanation; creatures that can hear the Infant.

The Infant cries with impossible, piercing volume. Each eligible creature attempts a **DC 29 Fortitude save**.

- **Critical Success:** Unaffected.
- **Success:** Deafened until the start of the Infant's next turn.
- **Failure:** Deafened and stupefied 1 until the start of the Infant's next turn.
- **Critical Failure:** Deafened for 1 minute and stupefied 2 until the start of the Infant's next turn.

This is a fresh save each time the action occurs; conditions of the same type do not stack. Scream is not used while its Comfort suppression remains active. **Tuning:** if successful saves producing Deafened is too punitive in playtest, move that effect to Failure while retaining Stupefied as the additional severity.

### Carrying the Baby
An adjacent creature with a free hand can **Interact ◆** to pick up the Infant, or an adjacent creature already holding it can **Interact ◆** to pass it to a willing adjacent creature with a free hand. The Infant does not resist being held. No special skill check or new carrying minigame is required.

While a creature carries the Infant, it is **clumsy 1, off-guard, and encumbered**, regardless of normal Bulk calculation. These effects end immediately when it is no longer carrying the Infant. Normal rules for held objects, movement, and available hands otherwise apply. Merely holding or transferring the Infant does **not** suppress Scream.

### Comfort Baby ◆ *(manipulate)*
**Requirements:** You are carrying Infant Evin; you do not have **You're Not Mommy**.  
**Effect:** You soothe the Infant. The current cry immediately stops, and the Infant cannot use Inconsolable Scream **until the start of its next turn**. You immediately gain **You're Not Mommy** for **1 minute**. This action always succeeds if its requirements are met. The suppression does not follow the carrier and does not require continuous carrying afterward; once the Infant's next turn begins it can cry again unless Comforted anew.

**GM note:** the whole point is passing the baby among the Party while choosing who accepts the three carrier penalties. The condition token communicates the one-minute cooldown without requiring the GM to announce it as a detached rule before it matters.

### Fleeting Dispersal
Infant Evin does not use the normal Class-based Stabilization Window. If it is Dispersed while its Reconstruction Condition remains true, it reconstructs at the **end of the next participant's turn**. If the Reconstruction Condition is broken before then, it does not reconstruct. Any carried Infant ceases to occupy the carrier's hands when Dispersed, and carrier penalties end.

## You’re Not Mommy

**YOU'RE NOT MOMMY** *(custom condition; duration 1 minute)*

A creature gains **You're Not Mommy** immediately after it successfully uses **Comfort Baby**. While it has this condition, it cannot use Comfort Baby again. It may still carry, pass, or otherwise interact with Infant Evin. The condition ends automatically after 1 minute; no saving throw or extra removal procedure is necessary. Give the player a physical named condition token and say the creature has learned this particular person's consolation is no longer enough. This is a cooldown indicator, not an additional numerical penalty.
