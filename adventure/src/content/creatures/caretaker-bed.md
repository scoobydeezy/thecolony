---
id: creature.caretaker-bed
slug: caretaker-bed
name: The Bed
status: draft
level: 10
rarity: unique
size: Large
traits:
  - ABERRATION
  - VEILED
  - SATELLITE
perception: 19
senses: []
languages: []
skills: {}
ac: 28
hp: 100
saves:
  fort: 22
  ref: 16
  will: 19
immunities:
  - bleed
  - disease
  - poison
  - death effects
speed: 0 feet while carried
strikes: []
provenance:
  - doc: Creatures
    heading: The Bed — Creature 10 (Caretaker Satellite)
---

The Bed has no independent turn, movement, or Strike. It shares the Nurse’s space while carried and has its own reaction. It holds one Large or smaller patient. The Nurse gains a +2 circumstance bonus to AC while carrying it. Patient restraint / Escape DC 32; patient safety Reflex DC 29. Area effects affect each distinct creature once. Targeting the Bed does not automatically damage the Nurse.

### Patient Intake ◇
**FREE ACTION**  
**Trigger:** The Nurse deposits one of its grabbed patients into an empty Bed via **Back to Bed**.  
**Effect:** The Bed's frame and restraining rails close around the patient. The creature becomes **restrained** by the Bed (Escape DC 32); the Nurse releases the original hand-held Grapple. The patient remains physically in the Bed as the Nurse moves it. A patient who successfully Escapes leaves the Bed into a legal adjacent space; use ordinary Escape rules (Athletics, Acrobatics, or unarmed attack). The Bed's restraint does not need Sustain or Maintain Care.

### Living Shield ↻
**Trigger:** An attack **hits the Nurse** while she carries the intact Bed.  
**Effect:** The Bed intercepts the **damage of that one hit** instead of the Nurse. Do not reroll the attack against the Bed AC: the attack already hit the Nurse and the Bed deliberately interposes itself. Apply the hit's damage to the Bed, using the attack's original hit or critical-hit result. If the Bed is occupied, **Patient Safety** triggers. This is the Bed's single reaction, so subsequent hits are not automatically intercepted that round. It can react even while occupied.

### Patient Safety
**Trigger:** The occupied Bed **takes damage from a direct attack or Living Shield**.  
**Effect:** First resolve damage actually dealt to the Bed (after its relevant reductions), then the patient attempts a **DC 29 Reflex save**. Based on the result, apply a separate instance of damage to the patient equal to a fraction of **that damage actually dealt to the Bed**, rounded down:

| Reflex result | Damage to patient |
|---|---|
| **Critical Success** | None |
| **Success** | One-quarter (25%) |
| **Failure** | One-half (50%) |
| **Critical Failure** | Full (100%) |

The Bed still takes the full damage dealt to it; this is **additional transferred damage**, not a diversion of Bed damage. Apply the patient's own relevant resistance normally to that separate instance. Patient Safety applies for **every damaging attack against the occupied Bed**, direct or intercepted, not only once per round. Nonattack environmental damage and healing do not trigger Patient Safety unless an encounter rule explicitly says otherwise. Describe the endangered occupant visibly before attacks are declared.

### Destruction and Source Integrity
At **0 HP**, the Bed Disperses, immediately releasing any patient into a legal adjacent space (prone if no other position is possible). The Nurse loses the Bed's +2 AC circumstance bonus and cannot use Living Shield or Patient Intake until the satellite reconstructs. Destroying the Bed **does not** cause Source Rupture, end the Nurse, or create an independent Stabilization Window. The Nurse's own Dispersal makes the Bed Disperse immediately as well. If the unresolved Nurse reconstructs, the Bed returns intact with her; it does not independently reconstruct in the meantime. **Pattern Restoration** ends hostile Nurse and Bed behavior together.

### Playtest / Encounter Budget Note
The Bed's Creature 10 label, HP, saves, DCs, and independent reaction are **provisional custom creature design**. Because the Bed has no ordinary turn or three actions, its level is a reference point, **not an instruction to treat it as an additional fully active Creature 10 for XP without review**. Playtest the combined Nurse/Bed package as one linked encounter. Its free maintenance, once-per-turn repulsion, multi-grabs, sedative, +2 AC, and damage interception are intentionally oppressive. Check actual threat against the six-PC party and adjust declared encounter budget accordingly; do not quietly assume an ordinary Creature 13 budget remains accurate.
