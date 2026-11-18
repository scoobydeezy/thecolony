---
id: rule.stabilization-window
slug: stabilization-window
name: The Stabilization Window
version: 1
status: draft
summary: After Dispersal, if the Reconstruction Condition holds, every non-movement action adds 1d2 Reconstruction Pressure; when Pressure exceeds the Stability Threshold, the Incursion reconstructs unless reconstruction has been made impossible.
provenance:
  - doc: The Veiled
    heading: The Stabilization Window
  - doc: The Veiled
    heading: The Stabilization Window > Reconstruction Pressure
  - doc: The Veiled
    heading: The Stabilization Window > Movement Exception
  - doc: The Veiled
    heading: The Stabilization Window > What the Window Is For
  - doc: The Veiled
    heading: The Stabilization Window > When the Window Closes
  - doc: The Veiled
    heading: The Stabilization Window > Alternative Openings
  - doc: The Veiled
    heading: Minimal Worked Example — Bad Maps > During Combat
  - doc: Encounters
    heading: 1. Bad Maps — Evin Peakwalker Baby Reconstruction > General Flow
design: >-
  The Veiled's Window section and the Bad Maps worked example call the threshold "Reconstruction Threshold";
  ruled Stability Threshold (user, 2026-11-17). "When the Window Closes" lists only three cases (condition false,
  Stabilized, condition true and unstabilized), but the Pressure procedure says an action that "successfully
  Contains the Source" takes effect before the threshold check, and the worked example says the baby reforms
  only if it "has not been Stabilized or Contained"; Contained is therefore listed as a fourth no-reconstruction
  case. The source does not say whether Pressure keeps rolling if the condition breaks mid-Window; read
  literally, Pressure keeps accumulating and the condition is checked when Pressure exceeds the threshold.
  Open question: When the Window Closes says only that Pressure "stops mattering until the condition becomes true
  again"; it does not say whether a condition restored after the threshold was crossed reconstructs the Incursion
  immediately or opens a fresh Window at Pressure 0 (the Pressure 0 restart is stated only for the Dispersal-time
  case).
---

## Definition

The **Stabilization Window** is the period after :ref[Dispersal]{#rule.dispersal} during which the false reconstruction has lost its grip, and the Source can be investigated, moved, altered, contained, transferred or supplied with contradictory truth. The Window happens **inside normal encounter time**: initiative does not pause.

**Reconstruction Pressure** is the running total that measures reality pushing back toward reconstruction. It starts at 0 when a Window opens.

**Stability Threshold.** Each Source has a Stability Threshold of **16 − 2C** (see :ref[Class]{#rule.class}). The Window closes when Reconstruction Pressure **exceeds** (not equals) the threshold.

**Reconstruction** is the Incursion returning: a new corporeal reconstruction at full HP, not healing.

## Procedure

**Opening.** When the Incursion Disperses and its Reconstruction Condition is true:

1. Set Reconstruction Pressure to 0.
2. The Ward, Backlash and Mnemonic Weight are absent while the Incursion is Dispersed.
3. Continue normal encounter sequencing.

**Adding Pressure.**

4. After **every action, reaction or free action** taken by **any participant** (party, allies, enemies, NPCs), add **1d2** Reconstruction Pressure.
5. **Movement exception:** an action whose *sole* effect is ordinary movement (Stride, Step, Fly, Swim, Climb, Crawl and similar, when nothing else is accomplished) adds no Pressure. An ability that combines movement with an attack, manipulation, spell or other effect is not exempt.
6. A multi-action activity adds one 1d2 per action spent, rolled after the whole activity resolves.
7. Resolve the triggering action **before** adding its Pressure. An action that breaks the Reconstruction Condition, completes Stabilization, successfully Contains the Source, or otherwise makes reconstruction impossible takes effect before the threshold check.
8. Player discussion outside character actions adds no Pressure.

**Closing.** When Pressure exceeds the Stability Threshold, check the current state:

- **Reconstruction Condition is false:** the Incursion does not reconstruct. Pressure stops mattering until the condition becomes true again.
- **The Incursion is Stabilized:** it does not reconstruct; reality now has enough truthful Meaning to prevent that false conclusion.
- **The Source is Contained** (see :ref[Containment]{#rule.containment}): it does not reconstruct.
- **Reconstruction Condition is true and Stabilization is incomplete:** the Incursion reconstructs at full HP unless the encounter says otherwise. The Ward returns at full HP around the current Vessel, Mnemonic Weight resumes, Pressure resets to 0, and all Restored Identity remains permanently true.

## Examples

In :ref[Bad Maps]{#encounter.bad-maps}, the baby is Dispersed with the toy still within 30 feet of Gressa. The Window opens at Pressure 0 against the toy's Class II Stability Threshold (16 − 2 × 2). A fighter Strides to the toy: no Pressure. She picks it up (an Interact): 1d2. She then Strides away with it: no Pressure. Once she is more than 30 feet from Gressa, the Reconstruction Condition is false, so when Pressure exceeds the threshold the baby does not reform. Meanwhile a two-action heal cast by an ally adds 2d2 after it resolves, and any reaction taken by anyone in the scene adds 1d2.

## Interactions

- **What the Window is for:** inspecting or manipulating the exposed Source; moving it while Mnemonic Weight is suppressed; testing Resonance hypotheses; Recovering or Restoring Identity; attaching containment or routing equipment; preparing a receiving vessel or Anchor; deliberately :ref[Transferring]{#rule.source-transfer} Weight; damaging the Vessel, at the risk of :ref[Rupture]{#rule.source-destruction}. Every action costs Pressure except one whose sole effect is ordinary movement, so carrying the exposed Source away by Striding is free while picking it up is not.
- If a Rupture happens during the Window, resolve Pulse and Spill first; the action that caused it then adds Pressure normally, and the Incursion can reconstruct from its new Vessel if the threshold is exceeded and the new Reconstruction Condition is true.
- **Alternative openings.** Major encounters may create other moments when contradictory truth can take hold while the Incursion is still manifested (full Coherence, a partitioned Chorus, a Composite shedding a Form, an interrupted Wound cycle, a protected NPC confronting the reconstruction, a ritual or technical circuit breached). Each such encounter defines its own opening. The shared rule: **the party must create a moment when the false reconstruction cannot prevent contradictory truth from taking hold.**
