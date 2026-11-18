---
id: creature.kelda-varruk
slug: kelda-varruk
npc: npc.kelda-varruk
status: draft
size: Medium
traits: [Humanoid]
perception: 26
skills:
  Athletics: 28
  Intimidation: 24
ac: 36
saves: { fort: 28, ref: 23, will: 24 }
hp: 235
speed: 25 feet
abilityDC: 33
strikes:
  - { name: Longsword, bonus: 28, damage: 3d8+13 slashing }
  - { name: Shield Bash, bonus: 28, damage: 3d6+13 bludgeoning, traits: [nonlethal] }
provenance:
  - doc: Creatures
    heading: Captain Kelda Varruk — Creature 13
design: >-
  Encounter-specific text removed per the 2026-11-17 ruling: "Tactical Priority" (holding the route to the dais) and
  "freely uses nonlethal attacks when doing so does not materially endanger the Reading" now live in The Reading.
  Name, ancestry trait and "Dwarf Fighter 13" header come from npc.kelda-varruk (rulings 2026-11-17; the app's
  "Level 11" was replaced by 13). Name and the Dwarf ancestry trait come from npc.kelda-varruk (ownership split, 2026-11-17); the source block
  listed only "Medium Humanoid" and the user confirmed she is a dwarf.
  No One Crosses and Protector of the Keeper name Vara; ruled 2026-11-17 to be, for now, Kelda's general abilities,
  so they stay here as written.
---

**Reactive Strike** ↻ Kelda uses the standard Reactive Strike reaction.

**No One Crosses** ↻ **Trigger** A creature within Kelda's reach uses a move action that would bring it closer to :ref[Vara]{#npc.vara-cairn} or the :ref[Book of Names]{#source.book-of-names}. **Effect** Kelda Steps up to 5 feet, then attempts to Shove or Reposition the triggering creature using Athletics +28.

No One Crosses and Reactive Strike draw from Kelda's normal single reaction each round.

**Orderly Removal** ◆◆ Kelda makes a melee Strike. On a hit, she may immediately attempt to Reposition the target with Athletics +28 without increasing her multiple attack penalty until after the Reposition resolves. On a critical Strike, a successful Reposition can move the target up to **10 feet**.

**Plant the Shield** ◆ Until the start of Kelda's next turn:

- Kelda gains a +1 circumstance bonus to AC;
- allies directly behind her gain lesser cover;
- Kelda gains a +2 circumstance bonus to checks and DCs against forced movement.

**Protector of the Keeper** ↻ **Trigger** Vara is targeted by an attack while Kelda is adjacent to her. **Effect** Vara gains a +2 circumstance bonus to AC against the triggering attack. Protector of the Keeper uses Kelda's reaction for the round.
