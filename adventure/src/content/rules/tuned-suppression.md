---
id: rule.tuned-suppression
slug: tuned-suppression
name: Tuned Suppression
status: draft
summary: An EGRESS lattice calibrated to a known Incursion signature stops that signature reconstructing and its Reconstruction Pressure accumulating while it stays powered; it removes no Weight and is not Stabilization or Resolution.
appliesTo:
  - encounter.containment
provenance:
  - doc: Creatures
    heading: EGRESS Tuned Suppression Lattice
version: 1
---

## Definition

A **tuned suppression lattice** is an EGRESS device calibrated to a **known Incursion signature**. It is EGRESS's implementation of the suppression described in :ref[Containment]{#rule.containment}. It suppresses reconstruction; it does not Stabilize, Anchor, or remove mnemonic Weight.

## Procedure

1. **Calibrate.** The lattice can be calibrated only after EGRESS has observed enough of a specific Incursion to identify the reconstruction/resonance signature it is suppressing.
2. **Apply.** It is normally applied while that Incursion is **Dispersed**.
3. **Hold.** While the Source remains inside a powered, correctly tuned lattice, the specified Incursion does not reconstruct and **Reconstruction Pressure does not accumulate** for that suppressed signature.
4. **Release.** Ending suppression while the relevant Reconstruction Condition is true begins a normal :ref[Stabilization Window]{#rule.stabilization-window} at 0 Pressure.

## Interactions

* Suppression is **signature-specific**. A different Incursion produced by the same Source—especially one using a different Resonance profile—is not automatically suppressed.
* Suppression never changes Source Level, Class, restored Identity, Capacity requirements, or the ultimate need for Resolution.
* The Order's field containment severs Resonance instead, and actions spent during its Window still add Pressure normally (see :ref[Containment]{#rule.containment}). Moving the Weight into another destination is :ref[Controlled Routing]{#rule.controlled-routing}.

See :ref[Containment]{#encounter.containment} for the portable lattice’s particular signature and its limitations in that scene.
