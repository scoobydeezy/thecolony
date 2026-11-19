---
id: creature.corrupted-engram-occlusion
slug: corrupted-engram-occlusion
name: Corrupted Engram Occlusion
status: draft
level: 14
rarity: unique
size: Medium
traits:
  - ABERRATION
  - VEILED
  - ECHO
  - PATTERN RESONANCE
perception: 28
senses:
  - darkvision
  - vault resonance sense
languages:
  - varies with the hidden subject; speech is sparse and cannot reveal comparison traits
skills:
  Athletics: 28
  Stealth: 30
ac: 35
hp: 315
saves:
  fort: 25
  ref: 28
  will: 30
immunities:
  - bleed
  - disease
  - poison
  - death effects
speed: 30 feet
abilityDC: 34
strikes: []
provenance:
  - doc: Creatures
    heading: Corrupted Engram Occlusion — Creature 14
---

**Occluded Hand** +29, reach 10 feet  
**Damage** 3d10+14 bludgeoning plus 1d6 mental

### Baseline Form — The Almost-Person
The Occlusion is an absolute-black, vaguely humanoid void without a stable face, age, costume, or consistent anatomy. Its arms lengthen, fold inward, or disappear; its head can settle in the wrong place; a hand may exist only for the instant of a Strike or Grapple. This is the visual consequence of a corrupted Engram recording an earlier **false** Veiled self-model rather than the original person's Memory directly. It is still mechanically an **Echo / Pattern**, not a new Composite or Form Resonance.

This instability is **presentation, not a concealment rule**: it does not give the Occlusion free Hide, invisibility, extra reach, a concealed condition, new senses, or a bonus to attacks. Use its listed statistics and ordinary perception rules.

### Candidate-Imposed Form — Non-Diagnostic
When **Load Engram** or a successful **Hot-Load Engram** finishes, the active candidate supplies a temporary appearance to the Occlusion. Describe only the **loaded candidate's** publicly known outward impression or memory habits: for example a child-sized posture, the rigid bearing of an Order recruit, or a domestic routine from a civilian record. The body remains pure black and unstable; these are hints about the **chosen candidate**, not the hidden authentic subject.

- A Form change is witnessed only if the Occlusion is already perceptible to a PC through ordinary senses. It does **not** locate the hidden stalker, create Vault telemetry, or reveal it through walls.
- All candidate loads create an equally plausible imposed Form regardless of whether the candidate matches **0, 1, 2, or 3** indexed traits. No facial likeness, speech, tics, source-based priorities, or anatomical stability may reveal the hidden Age / Role / Provenance or which traits match.
- At **Compare Engram**, each incorrect trait still produces **exactly one Smash**. After a nonzero-Smash comparison, the imposed Form collapses completely back into the formless baseline. The violence or duration of that collapse is **not** a second diagnostic measure.
- At **3 / 3**, no Smash occurs. The candidate Form becomes briefly stable and remains the creature's outward impression until it Disperses; its underlying false self-model remains hostile and **Memory is not yet Restored**. A subsequent reconstruction may again be formless; Validated Memory and Recognition Priority persist as normal.
- Imposed Form has **no effect** on creature statistics, condition abilities, Stalk routing, source topology, comparison math, or Recognition Priority.

### Non-Diagnostic Reconstruction
The Occlusion's visible Form does not reliably reveal the hidden subject's **Age, Role, or Provenance**.

The silhouette may reproduce gestures, posture, speech fragments, or remembered habits, but it remains too incomplete to classify any of the three comparison traits by sight or ordinary Recall Knowledge. Checks can identify it as a Veiled Echo, recognize EGRESS/Occlusion phenomena, or interpret ordinary tactical information; they do **not** reveal the hidden Mastermind profile.

Before a 3/3 comparison, the Occlusion's target selection is also deliberately non-diagnostic. It does not hunt Vara because it is secretly Marek, the compass because it is secretly Vara, or any other subject-specific Recognition that would leak the answer.

### Hidden Position
When no PC can currently observe the Occlusion, remove its token from the player board and track its sector on the GM copy of the Vault diagram.

Reveal its position whenever it enters or occupies a sector containing a PC or otherwise becomes directly perceptible through ordinary Pathfinder senses. Once no PC can perceive it again, return to hidden tracking.

The Vault provides **no automatic continuous route telemetry**. Players infer position from known movement rules, corridor state, visible encounters, ordinary senses, and any fiction that genuinely exposes its passage.

### Recognition Priority
Whenever the Occlusion needs a destination, use the highest reachable priority below:

1. the **active comparison terminal**;
2. after a 3/3 result, the **Validated Engram's terminal** while the authentic Engram remains mounted there;
3. otherwise, the **nearest reachable living creature** by open-corridor distance.

If several living creatures are tied, choose the tied creature whose sector is earliest in **A → B → C → D → E → F** order. If several creatures occupy that sector, choose the nearest by ordinary mapped distance; resolve any remaining tie by a fixed predeclared token order.

If no Recognition target is reachable through OPEN corridors, the Occlusion remains in its current node rather than selecting a tactically convenient substitute.

### Stalk ◆◆
**MOVE**

The Occlusion moves through up to **two currently OPEN corridor sections** toward its current Recognition target.

Stalk uses Vault topology rather than the creature's ordinary Speed. Each traversed connection between two Vault nodes counts as one corridor section regardless of the corridor's literal mapped length.

The Occlusion always follows a shortest legal route.

**Tie-breaking:**
- from an outer sector, if multiple first steps are tied, use the eligible corridor with the **lowest local corridor number**;
- from the Core, if multiple spokes are tied, use **A → B → C → D → E → F** order.

Resolve each corridor section separately.

Whenever the Occlusion **enters** a sector containing one or more living creatures, each such creature immediately resolves **Emergency Egress** before Stalk continues.

If every creature leaves successfully, the Occlusion can continue the remaining portion of Stalk.

If one or more creatures remain in the sector after Emergency Egress resolves, **Stalk ends immediately**. Place the Occlusion in a legal space adjacent to one remaining creature if possible.

### Hold Still ◆
**ATTACK**

The Occlusion assembles a grasping hand long enough to make one **Occluded Hand** Strike against a creature within reach. This Strike counts toward the normal multiple attack penalty.

- **Hit:** In addition to Strike damage, the target becomes **grabbed** until the end of the Occlusion's next turn, until it Escapes, or until it is no longer within the Occlusion's reach, whichever comes first. The **Escape DC is 38** (the Occlusion's Athletics DC). It can maintain up to two creatures grabbed by this ability at a time; making a new grab beyond that limit immediately releases a previously held target of the Occlusion's choice.
- **Miss:** No grab. Resolve the Strike normally.

This is an encounter-specific on-hit grab, not a free extra attack or a change to the listed Occluded Hand Strike. While grabbed, a target remains able to use its own normal PF2e Escape attempts. On **Dispersal**, all grabs end.

### You Don't Recognize Me ◆
**MENTAL, CONCENTRATE, ILLUSION**

**Target:** One creature within 30 feet that can perceive the Occlusion.

The Occlusion briefly resembles someone the target nearly remembers, then becomes visually impossible to reconcile. The target attempts a **DC 34 Will save**.

- **Critical Success / Success:** Unaffected.
- **Failure:** **dazzled** until the end of its next turn.
- **Critical Failure:** **dazzled** and **off-guard** until the end of its next turn.

This presents no truthful subject-specific Memory and cannot reveal the hidden comparison profile.

### That's Not What Happened ◆◆
**MENTAL, CONCENTRATE**

**Target:** One creature within 30 feet.

The Occlusion forces an authentic first-person recollection of its own **false** reconstruction into the target's perceptions. The target attempts a **DC 34 basic Will save** against **6d8 mental damage**, with the following additional effects:

- **Critical Success / Success:** No additional condition beyond the basic-save damage result.
- **Failure:** **stupefied 1** until the end of its next turn.
- **Critical Failure:** **stupefied 2** until the end of its next turn.

### Get Away From Me! ◆◆
**MENTAL, EMOTION, FEAR, CONCENTRATE**

**Frequency:** Once, then recharges after **1d4 of the Occlusion's turns**. Roll this die immediately after use and count the Occlusion's subsequent turns; it can use the ability again on the turn after the stated number of its turns have passed. Reconstruction resets the cooldown.

The formless body blooms into contradictory almost-person silhouettes. All living creatures other than the Occlusion in a **20-foot emanation** attempt a **DC 34 Will save**.

- **Critical Success:** Unaffected.
- **Success:** **frightened 1**.
- **Failure:** **frightened 2** and **fleeing** until the end of the creature's next turn.
- **Critical Failure:** **frightened 3** and **fleeing** until the end of the creature's next turn.

The Occlusion is the source of fleeing. Apply normal PF2e fleeing: a fleeing character uses its available actions to escape the source as expeditiously as possible, using actual OPEN routes or ordinary actions to open usable exits if needed. Fleeing gives no free movement, corridor bypass, automatic terminal operation, special permission, or override of the Vault's AND-gate rules. Normal **frightened** recovery still applies; ending fleeing does not automatically remove frightened.

### Reactive Strike ↻
The Occlusion uses the standard **Reactive Strike** reaction.

Movement granted by **Emergency Egress** does not trigger this reaction.

### Compare Engram ◆
**CONCENTRATE**

**Requirement:** The Occlusion is in the sector containing the active comparison terminal.

Compare the active candidate Engram's three indexed traits against the hidden subject's profile:

- **Subject Age** — Child / Adult
- **Subject Role** — Civilian / Keeper / Order
- **Engram Provenance** — Short-Term / Long-Term / Archive

For each mismatched trait, resolve one **Smash**.

| Candidate Match | Smashes |
|---:|---:|
| **3 / 3** | **0** |
| **2 / 3** | **1** |
| **1 / 3** | **2** |
| **0 / 3** | **3** |

After all Smashes resolve, end that comparison cycle and end the sector's Overload.

On a **3 / 3** result, mark the candidate **Validated**. No Smash occurs. The authentic Engram remains mounted at that terminal as a low-strength Recognition point, and the Core's **Reintegrate Memory** function becomes available for that Engram.

The Smash count is exact information. Do not modify it because of checks, conditions, damage, or GM judgment.

### Tactical Priority
On its turn, the Occlusion normally:

1. determines its current Recognition target;
2. uses **Stalk** if it is not already in that target's sector;
3. uses **Compare Engram** if it reaches the active terminal;
4. otherwise uses remaining actions against creatures it can currently reach or perceive, without abandoning those first three priorities.

**Non-diagnostic combat preference, after Stalk / Compare requirements:**
- If at least two ungrabbed living creatures are in range and **Get Away From Me!** is available, use it to drive off interference.
- If one living creature is available for melee contact, use **Hold Still** to seize it. If it already has a viable grab and can spend two actions, prefer **That's Not What Happened** against an interfering target.
- If it cannot reach a creature for a Strike but can perceive one in range, use **You Don't Recognize Me** to disrupt it.
- Use the ordinary **Occluded Hand** Strike if no listed option is applicable.

These are deterministic operating preferences, not the choices of a tactical mastermind. Conditions, comparisons, fear, and candidate Forms **never** alter which sector the Occlusion Stalks toward or how it chooses a shortest route. It does not delay a comparison to inflict a condition or select a condition to leak hidden traits.

The Occlusion is not tactically omniscient. Its danger comes from deterministic pursuit, the Vault's topology, and the consequences of sharing a sector with it.

### Normal Dispersal
At 0 HP the Occlusion **Disperses** normally.

If the Corrupted Engram's Reconstruction Condition remains true, use the Source's normal Class II Stabilization Window at **Threshold 12**. A later reconstruction returns the Occlusion at full HP and restores the Source's Ward normally.

Damage does not alter the Mastermind profile, Smash count, or Closure Capacity. Combat creates breathing room; it does not identify the subject.
