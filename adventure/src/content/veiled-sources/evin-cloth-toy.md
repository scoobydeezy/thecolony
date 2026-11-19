---
id: source.evin-cloth-toy
slug: evin-cloth-toy
name: Evin's Cloth Toy
summary: >-
  The unresolved Weight first encountered in a worn cloth toy; its vessel can change without resetting its statistics or
  progress.
status: draft
class: 2
sourceLevel: 15
provenance:
  - doc: Creatures
    heading: Cloth Toy — Source 15
  - doc: Creatures
    heading: Gressa Peakwalker — Living Source 15
  - doc: The Veiled
    heading: Minimal Worked Example — Bad Maps
design: >-
  One Source record follows this Weight through the Bad Maps transfer, rather than keeping a second copy of its
  statistics on Gressa. The id is permanent even when the vessel changes. Source Level 15 is explicit in Creatures, not
  a new balance choice. A Life's alternate trigger is retained as a dependency; the fragment Sources and Caretaker
  mechanics now have their own reference entries. Open: ordinary cloth-vessel durability, dead-Gressa transfer behavior,
  and the interaction of a Scar transfer with an already active Baby. Do not infer new concrete mechanics from the
  existing prose.
---

## Source Statistics

| Statistic | Value |
|---|---|
| Class | :stat{#source.evin-cloth-toy key=class} |
| Source Level | :stat{#source.evin-cloth-toy key=source-level} |
| Source DC / Ward AC | :stat{#source.evin-cloth-toy key=source-dc} |
| Ward HP | :stat{#source.evin-cloth-toy key=ward-hp} |
| Mnemonic Backlash | :stat{#source.evin-cloth-toy key=backlash} |
| Minimum active Bulk | :stat{#source.evin-cloth-toy key=active-bulk-minimum} |
| Stability Threshold | :stat{#source.evin-cloth-toy key=stability-threshold} |
| Rupture / Spill radius | :stat{#source.evin-cloth-toy key=rupture-radius} |

Ward, Backlash and Mnemonic Weight follow :ref[Active Sources]{#rule.active-sources}. They are absent during :ref[Dispersal]{#rule.dispersal}. Source Level measures this Weight, not the mundane cloth object's level.

## Bad Maps Profile

**Vessel:** a Tiny cloth toy. **Resonance:** Relationship. **Reconstruction:** :ref[Baby]{#creature.evin-baby}, an Echo.

**First Incursion Trigger:** Gressa physically holds the toy. Proximity alone does not trigger the first manifestation.

**Reconstruction Condition:** after the first manifestation, Gressa is within 30 feet of the current Source vessel. Her unconsciousness or death does not, by itself, break that relationship.

Breaking the condition prevents a future reconstruction; it does not remove an active Baby. Baby's Tantrum governs its response while manifested. After Dispersal, use :ref[The Stabilization Window]{#rule.stabilization-window} if the condition holds; otherwise the unresolved Source is dormant.

## Transfer into Gressa

Use :ref[Source Destruction]{#rule.source-destruction} when the toy Ruptures. If Gressa is within the Spill radius, her relationship is the strongest compatible Recognition. The full Weight transfers to her and the toy ceases to be a Source. If there is no compatible recipient, the Weight becomes a Scar under that rule.

With living Gressa as vessel, the Baby profile's Reconstruction Condition becomes internal and self-sustaining: moving her away from the destroyed toy cannot break it. Her death as a living Source causes another Rupture.

Transfer preserves Class, Source Level, current Pressure, restored Identity and the active Incursion. It does not refresh a collapsed Ward or create one during a Window. The Order's object-rated field vessel cannot contain living Gressa; EGRESS can suppress the known Baby signature using a powered, tuned field lattice.

## Later Profiles

At :ref[A Life]{#encounter.a-life}, placing the intact toy within 5 feet of the carved hobby horse triggers **Infant Evin**, a different reconstruction. Its Reconstruction Condition is at least one other unresolved Evin fragment Source within 30 feet. Use that encounter's Infant profile, not the Giant Baby block.

At :ref[Containment]{#encounter.containment}, scheduled medication given to Gressa before her assigned orderly administers it first triggers a **Caretaker / Pattern** reconstruction. Its condition is continued care substantially reproducing Evin's recurring caretaker Patterns. The existing Relationship suppression does not suppress this new Pattern profile. These routes develop the missing truth; recognizing mother and child alone cannot Restore the whole life during Bad Maps.

## Routed into the EGRESS Cell

The cell is a new vessel for this same Weight, not another Source. It is fixed, has Capacity II, and uses an engineered care-loop scaffold. After routing, the Caretaker’s Reconstruction Condition is that the scaffold remains powered and active. Transfer preserves the Source’s statistics and current state.

While the facility functions, its boundary prevents the Incursion from crossing, being forced across, or targeting beyond the cell. Failure of that boundary leaves ordinary Veiled rules in force; it neither destroys nor resolves Weight. Pattern Restoration before routing permits a Stabilized, Unanchored state. Classification alone leaves an unresolved Nurse and Bed continuing their routine.

Use :ref[Tuned Suppression]{#rule.tuned-suppression} and :ref[Controlled Routing]{#rule.controlled-routing}; the reconstruction profiles are :ref[Infant]{#creature.evin-infant} and :ref[Caretaker]{#creature.evin-caretaker} with :ref[the Bed]{#creature.caretaker-bed}.
