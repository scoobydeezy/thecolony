---
id: creature.evin-child
slug: evin-child
name: Evin Peakwalker Reconstruction (Child)
status: draft
level: 11
rarity: unique
size: Small
traits:
  - ABERRATION
  - VEILED
  - ECHO
  - RELATIONSHIP RESONANCE
perception: 24
senses:
  - darkvision
  - resonance sense (Evin fragment Sources, imprecise) 30 feet
languages:
  - Goblin
skills:
  Acrobatics: 23
  Stealth: 26
  Thievery: 23
ac: 30
hp: 145
saves:
  fort: 18
  ref: 24
  will: 21
immunities:
  - bleed
  - disease
  - poison
  - death effects
speed: 30 feet
abilityDC: 30
strikes: []
provenance:
  - doc: Creatures
    heading: Evin Peakwalker Reconstruction (Child) — Creature 11
---

**Shoulder Check** +22 to hit, 2d8+10 bludgeoning damage

### Goblin-Horse
The Child's missing Identity makes the remembered hobby-horse game literal: a goblin torso atop an absurd, equine lower body. It plays, gallops, giggles, knocks things over, and expects everyone to join in. The physical **E.P.**-marked hobby horse is still the Source; the creature is its false interpretation, not the object transformed into a body.

### Hide and Seek — Game State
The Child has exactly two game states, **Child Hides** and **Child Counts**. Start in **Child Hides**. Only one state runs at a time. Becoming Dispersed interrupts its current game; on reconstruction, begin again in Child Hides unless the fourth Source has already produced full Coherence.

### Ready or Not! ◆◆ *(auditory, mental, concentrate)*
**Requirement:** The game state is **Child Hides** and the Child is not already hidden for the current game.  
**Effect:** The Child giggles and hides in ordinary battlefield clutter. For this ability, it may attempt to Hide even when the GM is not tracking a specific hiding square or cover object. Roll **1d20 + Stealth +26** openly; **the total is the child's rolled Stealth DC for this Hide phase**. This is the encounter's one explicit procedural departure from PF2e's normal Stealth DC calculation. PCs use ordinary Seek actions and Perception checks against the rolled DC. A successful Seek finds the Child; do not require guessing a special preselected hiding place.

On the **first** Ready or Not! of the encounter, creatures that can hear the giggling become **fascinated** with the Child, following the condition's normal ending rules (including ending upon hostile action against themselves or their allies). Later uses do not automatically reapply fascinated. The giggling gives the party a cue that the Child is hiding; it does not waive the Seek check.

If **no PC finds the Child before the start of its next turn**, resolve **Nobody Found Me!** at that turn start. The Child may then start a new Hide phase or otherwise act normally. **Provisional pacing:** it cannot stack multiple unresolved Hide phases at once.

### Nobody Found Me! *(mental)*
**Trigger:** The Child begins its turn still unfound after Ready or Not!  
**Area:** all PCs who are participating in the encounter and not beyond the Hall encounter space.  
**Save:** **DC 30 Will**.

- **Critical Success:** Unaffected.
- **Success:** Sickened 1.
- **Failure:** Sickened 1 and slowed 1 until the end of the creature's next turn.
- **Critical Failure:** Sickened 2 and stunned 1; if already stunned, use the normal PF2e rules for application of the condition.

The Child's game-state effect is supernatural and need not share line of sight with the victims. The effects of sickened follow ordinary rules for reducing that condition. **Provisional:** assess whether applying Sickened even on Success is too harsh only after testing against the party's actual saves.

### Found You! *(free action; no separate roll)*
**Trigger:** A PC succeeds at Seek to find the Child during Child Hides.  
**Effect:** The Hide phase ends immediately. The Child excitedly bounds into the next phase, **Child Counts**. The current hide's missed-search consequence is canceled.

**First discovery only:** In its burst of movement, the Child disturbs and brings the archived **E.P. bow** within 5 feet of the active fragment Source network. That real bow's **Incursion Trigger** is satisfied; **Adult Evin manifests immediately, hostile**. The matching E.P. marks on hobby horse and bow are materially discoverable evidence. This event is not optional flavor and does not require the GM to move a random item on a later turn.

### Your Turn to Hide! *(free action; auditory, mental)*
**Trigger:** Found You! completes.  
**Effect:** The Child vanishes from ordinary view and announces the game: **“TEN! NINE!”** Set a visible **Count 10** marker. On the Child's subsequent turns it can use Count Down. While counting, the Child is not an ordinary attack target unless it is somehow located by a specifically applicable ability; the actual objective is for Darkwing to become Hidden or Concealed. The Child may still be Dispersed by an appropriately legal effect; the GM does not owe it invulnerability outside its stated visibility state.

### Count Down ◆ *(concentrate, auditory)*
**Requirement:** Game state **Child Counts**.  
**Effect:** Reduce the Count by **2**. It must spend **five of its own actions** to count from 10 to 0 (possibly across multiple turns). It can spend up to its available actions per turn counting; do not count the party's actions. On reaching 0, immediately resolve **I See You!** and return the game state to **Child Hides**. Announce each count clearly so the remaining clock is visible.

### I See You! *(mental)*
**Trigger:** Child Counts reaches 0.  
**Effect:** Every PC in the Hall encounter area who is neither **hidden nor concealed** relative to the Child at that instant takes **6d6 mental damage** (**provisional**, no save). Having either condition is sufficient to avoid this damage. Resolve any ordinary effects of the damage, including ending fascinated where PF2e's condition rules call for it. Do not invent special hiding-spot tracking; use the battlefield's actual cover, concealment, spells, and ordinary visibility state.

### Little Menace ◆
Child Evin snatches, kicks, tips, or throws one unattended object of 1 Bulk or less within 10 feet, moving it up to 20 feet.

Alternatively, it can knock over an unsecured furnishing or similar object, creating a 5-foot square of difficult terrain where appropriate.

**Little Menace can move a dormant Source** if that Source's ordinary Bulk is within this limit. Once a Source becomes active, Mnemonic Weight applies normally. The first bow discovery during Found You! is the authored Incursion Trigger and does not require an extra Little Menace action.
