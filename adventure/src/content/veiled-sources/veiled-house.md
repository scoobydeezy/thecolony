---
id: source.veiled-house
slug: veiled-house
name: Veiled House
status: draft
class: 5
sourceLevel: 9
provenance:
  - doc: Creatures
    heading: Veiled House — Source 9
---

## Source Statistics

| Statistic | Value |
|---|---|
| Class | :stat{#source.veiled-house key=class} |
| Source Level | :stat{#source.veiled-house key=source-level} |
| Source DC / Ward AC | :stat{#source.veiled-house key=source-dc} |
| Ward HP | :stat{#source.veiled-house key=ward-hp} |
| Mnemonic Backlash | :stat{#source.veiled-house key=backlash} |
| Minimum active Bulk | :stat{#source.veiled-house key=active-bulk-minimum} |
| Stability Threshold | :stat{#source.veiled-house key=stability-threshold} |
| Rupture radius | :stat{#source.veiled-house key=rupture-radius} |

Use :ref[Active Sources]{#rule.active-sources}, :ref[Dispersal]{#rule.dispersal}, and :ref[The Stabilization Window]{#rule.stabilization-window}.

**Vessel:** the whole house. **Resonance:** Pattern. **Reconstruction:** a Wound resolved through Context, manifesting :ref[the House Keeper]{#creature.house-keeper}. The table above gives the opening Class V state.

## Variable Class

After a failed Set the Hearth submission, reclassify this **same Source** to the number of wrong scored relationships (1–5). Source Level remains 9. The values below follow from Class and Source Level under :ref[Class]{#rule.class}; the Keeper’s creature statistics do not change.

| Wrong scored Context relationships | Source Class | Source DC | Ward HP | Backlash | Stability Threshold | Rupture radius |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | I | 27 | 100 | 1d4 mental | 14 | 10 feet |
| 2 | II | 28 | 110 | 2d6 mental | 12 | 20 feet |
| 3 | III | 29 | 120 | 3d8 mental | 10 | 30 feet |
| 4 | IV | 30 | 130 | 4d10 mental | 8 | 40 feet |
| 5 | V | 31 | 140 | 5d12 mental | 6 | 50 feet |

This is a reclassification of the same Source between manifestations, not a Source Transfer. A correct arrangement Restores Context rather than creating a Class 0 Source. The reclassification happens between manifestations, not during an existing one.

### First Incursion Trigger
Darkwing removes the **Greater Insistent Door Knocker** from the Hearth threshold historically associated with the Parlor.

The house's topology ripples into the maze described in the owning encounter and the first House Keeper manifestation appears at **Class V**.

Returning the Knocker does not end that active Incursion and does not reverse the already-established maze.

### Reconstruction Condition
The initial theft is sufficient only for the first manifestation.

After any House Keeper is Dispersed, the rejected false arrangement no longer supplies a Reconstruction Condition. The House Keeper does **not** automatically rebuild through ordinary Reconstruction Pressure merely because time passes.

A later deliberate affirmative **Set the Hearth** creates the next reconstruction event.

If that submitted Context is false, the House Keeper manifests at the Class equal to the number of wrong scored relationships.

If the submitted Context is true, the Wound is Restored instead.

### Location Ward and Chalk-Slate Focus
The entire house is the Source, but its Ward has two encounter-specific expressions:

- the **exterior shell of the house**;
- the **chalk slate on the central Hearth table** while the House Keeper is active.

These are two visible expressions of **one Ward** and share a single Ward HP pool and Breached state.

While the House Keeper is active:

- directly touching, writing on, deliberately erasing, or physically attacking the slate counts as direct contact with the Warded Source;
- touching or attacking the exterior shell from outside the house interacts with the same Ward;
- ordinary contact with interior floors, walls, ceilings, fixtures, doors, furniture, and Context objects is **not** direct Source contact and does not trigger Mnemonic Backlash.

If the shared Ward is Breached, the physical slate or exterior structure can be affected normally.

Breaching the Ward does **not** make the slate accept another Context submission while the House Keeper is active.

If Darkwing physically destroys the slate, its writing migrates to the central tabletop or another nearby flat household surface. Destroying the interface cannot resolve the Source.

### Slate States
**Quiescent:** No House Keeper is active. The slate can display household fragments and can eventually ask:

> **IS EVERYTHING WHERE IT BELONGS?**

**Rejecting:** A hostile House Keeper is active. The slate refuses Darkwing's writing and repeatedly overwrites the surface with:

> **STOP STOP STOP STOP STOP**

Dispersing the House Keeper returns the slate to a quiescent state.
