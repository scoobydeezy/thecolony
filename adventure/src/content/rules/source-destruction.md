---
id: rule.source-destruction
slug: source-destruction
name: Source Destruction
version: 1
status: draft
summary: Destroying a Source Vessel does not destroy its Weight; the Source Ruptures in a Pulse of Backlash, then Spills into the strongest compatible Recognition, or into the environment as a Scar.
provenance:
  - doc: The Veiled
    heading: Source Destruction and Mnemonic Spill
  - doc: The Veiled
    heading: Source Destruction and Mnemonic Spill > Mnemonic Rupture
  - doc: The Veiled
    heading: Source Destruction and Mnemonic Spill > Mnemonic Rupture > Rupture Pulse
  - doc: The Veiled
    heading: Source Destruction and Mnemonic Spill > Mnemonic Rupture > Uncontrolled Spill
  - doc: The Veiled
    heading: Source Destruction and Mnemonic Spill > Mnemonic Rupture > State Preserved Through Transfer
  - doc: The Veiled
    heading: Source Destruction and Mnemonic Spill > Scars
  - doc: The Veiled
    heading: Source Destruction and Mnemonic Spill > Scars > The Three Regions of a Scar
  - doc: The Veiled
    heading: Source Destruction and Mnemonic Spill > Scars > How Other Incursions Interact with a Scar
  - doc: The Veiled
    heading: Source Destruction and Mnemonic Spill > Scars > Keyed Recognition — Turning Repulsion into Attraction
  - doc: The Veiled
    heading: Source Destruction and Mnemonic Spill > Scars > Uncontrolled Recognition and Incorporation
  - doc: The Veiled
    heading: Numerical Tuning Still To Finalize
  - doc: The Veiled
    heading: Source Destruction and Mnemonic Spill > Why Source Destruction Should Feel Bad
  - doc: The Veiled
    heading: Minimal Worked Example — Bad Maps > If the Toy Is Destroyed
design: >-
  The Veiled says the Spill seeks Recognition "within the Spill radius" but never defines a Spill radius; the Bad
  Maps example uses "inside the Rupture area", so the Spill radius is the Rupture radius. The Pulse save is
  written as "a Will save" with half damage on a success (basic-save degrees plus stupefied); the Bad Maps example
  abbreviates it as damage "on a failure". The full degrees from Rupture Pulse are used. A raw Scar has no
  Reconstruction Condition (The Mnemonic Cycle > Recognition), so a Scar formed during a Window cannot reconstruct
  the Incursion from that Pressure; this follows from the two passages together rather than being stated. Left open: what happens to an already-manifested Incursion when its Weight Spills into the environment and becomes a Scar (Changing Source vessel does not Disperse an active Incursion, but a Scar has no Reconstruction Condition).
---

## Definition

Destroying a Source does not destroy its mnemonic Weight. It destroys the Vessel currently carrying it.

**Rupture.** When a Source Vessel is destroyed, killed, or made incapable of carrying unresolved Weight, the Source **Ruptures**. Rupture resolves in two stages: the **Pulse**, which hurts, and the **Spill**, which is the real danger.

**Pulse.** An emanation of mnemonic pressure from the failing Vessel, radius **10 × C feet** (see :ref[Class]{#rule.class}).

**Spill.** The full unresolved Weight seeking a new Vessel. Uncontrolled Spill follows Recognition, not safety.

**Scar.** An environmental Source formed when no compatible recipient accepts the Spill. The location carries the Weight but supplies no answer to what the Weight belongs to: *it knows where the Weight is, not what it is.* A Scar is not a Veiled Incursion or a Wound. It has no body, imperative, Identity path or standard Dispersal condition, and no Incursion Trigger or Reconstruction Condition until a specific topology develops.

## Procedure

1. **Rupture.** The Vessel is destroyed, killed or made unable to carry the Weight (by damage while Breached or during a Window, by reflected Backlash, or otherwise).
2. **Pulse.** Every creature within 10 × C feet, other than the associated Incursion, attempts a Will save against the Source DC. Damage is the Source's Mnemonic Backlash damage, C d(2C + 2) mental.
   - **Critical Success:** no damage or condition.
   - **Success:** half damage.
   - **Failure:** full damage and stupefied ⌈C ÷ 2⌉ until the end of the creature's next turn.
   - **Critical Failure:** double damage and stupefied C until the end of the creature's next turn.
3. **Spill.** Immediately after the Pulse, the full Weight seeks the **strongest compatible Recognition** within the same radius:
   - compatibility beats proximity; Recognition beats Capacity; Recognition beats Consent;
   - Weight is **not** divided by default; if several candidates seem comparable, choose the most specific or strongest actual Recognition in the fiction. Only an encounter that defines special topology partitions Weight.
4. **Recipient found:** the full Weight transfers to it, and it becomes the new Source Vessel (a living or dead creature can be the recipient). Apply the state-preservation rules of :ref[Source Transfer]{#rule.source-transfer}: Source Level, Class, Pressure, Restored Identity and any active Incursion carry over; the Ward is not refreshed.
5. **No recipient:** the local environment carries the Weight and becomes a **Scar** with the same Source Level and Class.
6. **During a Window:** resolve Pulse and Spill first. The action, reaction or free action that caused the Rupture then adds Reconstruction Pressure normally, and the Incursion can reconstruct from its new Vessel if Pressure exceeds the Stability Threshold and the new Reconstruction Condition is true.

## Examples

In :ref[Bad Maps]{#encounter.bad-maps}, destroying the Class II cloth toy causes a 20-foot Pulse: everyone in it but the baby attempts a Will save against the Source DC: no damage on a critical success, half of 2d6 mental on a success, full damage and stupefied 1 on a failure, double damage and stupefied 2 on a critical failure. If :ref[Gressa Peakwalker]{#npc.gressa-peakwalker}, alive or dead, is in the area, her relationship as the forgotten child's mother dominates the topology and the Weight Spills into her; she becomes the Class II Source. If no compatible destination is in the area, the street becomes a Class II Scar.

## Interactions

- **Why it should feel bad.** Rupture takes Weight from a known topology into a less controlled one: it can contaminate a living person, turn an object problem into a place problem, destroy provenance needed to recover Identity, create a Scar, move the Source without ending the active Incursion, or make the Reconstruction Condition harder to break. *Do not destroy the Vessel unless you know where the Weight is going.*
- **Scar regions.** A developed Scar has three nested regions: **Influence** (unstable coherence; traversable, not automatically damaging), **Boundary** (repulsive interference against coherent reconstructions) and **Horizon** (incorporation). This model and the incorporation outcome are universal. Region sizes, Boundary effects, keying costs and other numbers are site-specific; each Scar's encounter defines them. Do not give a Scar its own HP track or creature statistics.
- **Default interaction is repulsion.** An unkeyed Boundary interferes with an Incursion's coherent Form, so Incursions tend to resist approaching it. If Boundary interference Disperses an Incursion, normal Source rules still apply: its own Source stays where its Vessel is, its Reconstruction Condition and Window still govern whether it returns, and the Dispersal does **not** transfer its Source into the Scar.
- **Keyed Recognition.** Supplying a genuine compatible Recognition at the Boundary can locally reverse repulsion and draw a particular Incursion toward a controlled interface. It does not move that Incursion's Source or grant control of its Weight. There is no universal one-action "reverse Scar" ability.
- **Incorporation at the Horizon.** A living creature that fully crosses the Horizon is incorporated: its presence and experience become part of the unresolved Weight. Once crossing is complete there is no default save, Escape action or routine reach-in-and-pull-them-out procedure; any recovery needs a separately established method and is never guaranteed. The Horizon must be legible, with rescue or prevention possible, before forced movement can carry anyone across. An **Incursion's manifested body alone** reaching the Horizon is treated as Dispersed, unless the encounter establishes a real transfer of its Source; do not duplicate its Weight. A **Source Vessel** crossing the Horizon is a combination of Source topology, not a way to discard the Source: track the contributing Weight and Restored Identity, and reassess the resulting Class explicitly.
- **Scars persist.** A Scar has no expiry. Over time it may recognize nearby people, places, routines and objects, accumulate false Context and mature into a Wound.
- A Scar ceases to be a Scar only if its Weight is genuinely transferred, truthfully Stabilized and Anchored, or transformed into another defined topology; silencing or dispersing a nearby manifestation does not do it.
