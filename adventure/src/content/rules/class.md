---
id: rule.class
slug: class
name: Class
version: 1
status: draft
summary: Class I–V measures how much mnemonic pressure a Source carries; with Source Level it derives every generic Veiled value, and it is separate from Pathfinder level.
provenance:
  - doc: The Veiled
    heading: Class > EGRESS Classification
  - doc: The Veiled
    heading: Class > Class I–V
  - doc: The Veiled
    heading: Class > Source Level and Source DC
  - doc: The Veiled
    heading: Class > Class Is Conserved Through Topology Changes
  - doc: The Veiled
    heading: Class > Class and Pathfinder Level Are Separate
  - doc: The Veiled
    heading: Anchoring and Resolution > A Valid Anchor Requires Connection, Capacity, and Consent > Capacity
design: >-
  The Veiled's Class table names the threshold "Stability Threshold" while its Stabilization Window section and the
  Bad Maps worked example call it "Reconstruction Threshold"; ruled Stability Threshold (user, 2026-11-17). The
  Class table writes Ward HP as "10 + (Level * 10)" etc.; that is the same value as the formula 10 × (Source Level + C)
  used here and in veiled.mjs.
---

## Definition

**Class** is EGRESS's five-band operational measure of mnemonic pressure, later adopted by the Order of Theia as field terminology ("Class Two Echo. One unsecured Source."). Class measures **how much** mnemonic pressure is present. It does not describe the Veiled's Form, its Resonance, the moral importance of the forgotten life, or the manifestation's creature level.

Let **C** be the Source's Class, from 1 (Class I) to 5 (Class V).

**Source Level.** Every Source has a Source Level, normally equal to the level of the Incursion it creates unless the encounter explicitly assigns a different level.

**Source DC.** The Source DC is the PF2e level-based DC for the Source Level, plus Class:

> **Source DC = level-based DC for the Source Level + C**

Use the Source DC for generic mnemonic interactions that need a difficulty, including the basic Will save against Mnemonic Backlash, Athletics checks to Reposition an active object Source, and checks to force, redirect or otherwise manipulate mnemonic Weight when no more specific DC applies. The Ward's AC is the Source DC unless the encounter says otherwise.

## Procedure

1. Record the Source's **Class** (C) and **Source Level**.
2. Find the Source DC: level-based DC for the Source Level, plus C.
3. Derive the remaining values from C (and Source Level, for Ward HP):

| Value | Formula | I | II | III | IV | V |
|---|---|---:|---:|---:|---:|---:|
| **Stability Threshold** | 16 − 2C | 14 | 12 | 10 | 8 | 6 |
| **Ward HP** | 10 × (Source Level + C) | 10 × (SL + 1) | 10 × (SL + 2) | 10 × (SL + 3) | 10 × (SL + 4) | 10 × (SL + 5) |
| **Ward AC** | Source DC | | | | | |
| **Mnemonic Backlash** | C d(2C + 2) mental, basic Will vs. Source DC | 1d4 | 2d6 | 3d8 | 4d10 | 5d12 |
| **Active Bulk minimum** | 10 × C Bulk | 10 | 20 | 30 | 40 | 50 |
| **Rupture radius** | 10 × C feet | 10 ft. | 20 ft. | 30 ft. | 40 ft. | 50 ft. |

4. Build the Incursion itself with ordinary PF2e encounter-building and creature statistics for its level. Class does not set its AC, attack bonus, Hit Points or other combat statistics.

Where a Source has its own entry, the book computes these values from its Class and Source Level; never type them by hand.

## Examples

The cloth toy in :ref[Bad Maps]{#encounter.bad-maps} is a Class II Source. Its Stability Threshold is 16 − 2 × 2; its Ward has 10 × (Source Level + 2) HP and uses the Source DC as AC; its Backlash is 2d6 mental; while active it weighs at least 20 Bulk; and if it is destroyed it Ruptures in a 20-foot radius. Its Source DC is the level-based DC for its Source Level, plus 2.

## Interactions

- **Class and Pathfinder level are separate.** Level decides whether the fight is fair for this party. Class decides the magnitude and behaviour of the mnemonic pressure, and adds only a flat modifier to the Source DC.
- **Class is conserved through topology changes.** Moving Weight does not change its Class: a Class II burden stays Class II through Source → containment vessel → Spill → Scar → new Source. Class changes only when the amount of Weight changes, for example when two concentrations combine, a larger inheritance enters the Source, EGRESS partitions the Weight, or part of it is successfully Anchored.
- **Capacity** (of a containment vessel, receiver or Anchor) is rated on the same I–V scale (see :ref[Containment]{#rule.containment}). Capacity may be combined when an encounter explicitly permits distributed Anchoring; distributed Capacity is additive by default unless the encounter establishes a reason the Weight cannot be partitioned safely.
