---
# yaml-language-server: $schema=../../../schemas/encounter.schema.json
id: encounter.bad-maps
slug: bad-maps
name: Bad Maps
summary: A visit to the slums sets the Party at the center of a Veiled incursion.
function: Introduce The Veiled
synopsis: The Party checks the bad map against Abiding Way, with Vara and Uldren if it accepted her request. Kivren returns a cloth toy to Gressa, whose surviving relationship reconstructs her forgotten child's infancy as an enormous Veiled. The Order responds competently, protects civilians, helps secure the Source, and then detains the outsiders at the center of the incident. The surviving vessel determines whether the next investigation follows the toy to the Witnesses or Gressa to EGRESS; Duskwood remains another choice.
part: part.act-1
chapter: arrival-and-the-first-incursion
order: 3
leadsTo:
  - to: event.prisoners
    thread: thread.the-cloth-toy
links:
  - npc.evin-peakwalker
  - npc.gressa-peakwalker
  - npc.vara-cairn
  - npc.kivren-quozot
  - npc.uldren-harthwright
  - npc.kelda-varruk
  - location.abiding-way
  - creature.evin-baby
  - source.evin-cloth-toy
  - rule.active-sources
  - rule.dispersal
  - rule.stabilization-window
  - rule.source-destruction
  - rule.containment
status: draft
readiness:
  status: compiled
provenance:
  - doc: Campaign Outline
    heading: Session 2 — Bad Maps
  - doc: Encounters
    heading: 1. Bad Maps — Evin Peakwalker Baby Reconstruction
  - doc: The Veiled
    heading: Minimal Worked Example — Bad Maps
---

:::design
Opening-chapter reconciliation, 2026-11-18. The encounter flow follows Encounters; the concrete Baby and Source profiles come from Creatures; The Veiled owns the reusable procedures. The existing Part I rule drafts are reused. The map arrangement and read-aloud below are editorial staging, not new geographical canon.

This is compiled, not playtested or closed. Outstanding preparation: battle map; timing and combat roster for the Order; ordinary cloth-vessel durability; the dead-Gressa and Scar edge cases; the unresolved universal Window restart question. Do not add guessed timings, HP, or DCs as settled rules. Keep the finale payoff for Evin visible even if A Life is skipped. See sources/opening-reconciliation.yaml.
:::

## At the Table

| Keep in view | Run it this way |
|---|---|
| Objective | Protect Gressa and the street; create enough safety to secure the Source |
| Moving parts | Gressa, the cloth toy, Baby, civilians, and the Order's response |
| First manifestation | Gressa must hold the toy; proximity alone is insufficient |
| Combat evidence | Baby seeks its mother and attacks obstacles; let that behavior be observable |
| The critical distinction | Breaking Resonance prevents reconstruction, but leaves the active Baby present and triggers its Tantrum |
| After Dispersal | Keep initiative; use the Source profile and the embedded Window procedure below |
| Handoff | Intact toy → Witnesses; living Gressa as Source → EGRESS; the Duskwood investigation remains available |

## Availability and Opening State

The Party comes from :ref[The House of Abiding]{#event.the-house-of-abiding} to check the inaccurate map of :ref[Abiding Way]{#location.abiding-way}. If it invited Vara, she leads the corrections and Uldren accompanies her. If it refused, the same map investigation brings the Party here without either of them. Do not force Vara into the scene to make the attack work.

:ref[Gressa]{#npc.gressa-peakwalker} lives in the slums and remembers her missing child only as an infant. :ref[Kivren]{#npc.kivren-quozot} returns the worn toy to her without openly presenting the act as an attack. They expect danger but do not know exactly what shape it will take or who will be hurt. The Party's presence supplies misdirection; it is not the operation's actual target.

Until Gressa physically takes the toy, the first Incursion has not been triggered. Honor an intervention that prevents that contact. Kivren's attempted return and the dangerous object remain leads even if no monster appears.

## Setup and Map

Use an Abiding Way street with space for a Huge creature. Mark Gressa and the toy separately from Baby: the vessel is not the monster's body. Provide routes for civilians to leave, room for the Party to move either end of the relationship, and an approach for the Guard. Ordinary street clutter can obstruct movement without becoming an additional bespoke hazard.

Keep the Source's distance from Gressa visible once the Party starts testing it. A token for each and a measured separation are enough; the scene does not require a finished illustrated map.

:::read-aloud
The old woman folds both hands around the worn toy. Her expression changes before anything else does: a startled tenderness, as though someone she loves has just come through the door.

Then something enormous reaches for her.

Its proportions are an infant's. Its hand is large enough to close around a person. It turns toward the woman, bewildered and desperate, and the street between them becomes an obstacle.
:::

## Objective and NPC Objectives

The immediate task is safety, not discovering Evin's entire biography. A successful response can leave the Weight unresolved.

- **Baby** tries to reach Gressa. It is dangerous without being malicious.
- **Gressa** is the person in danger, not an enemy or a disposable solution to the puzzle.
- **Kivren** wants concealed suffering made impossible to ignore. Their skittishness and willingness to flee follow their character entry; capture and exposure are possible, not predetermined.
- **Vara**, when present, is a participant whose observations matter. Her relationship with Darkwing continues through the danger; this encounter grants no extra automatic Trust point.
- **Uldren**, when present, alerts the Guard and protects Vara. Without him, the disturbance still gives the Order reason to respond; its arrival does not depend on her attendance.
- **Kelda and the Order** protect civilians, fight alongside the Party, and secure the Source. They investigate responsibility after immediate danger is controlled.

## The Opposition

::embed{#creature.evin-baby}

### Encounter Tactics

Show the relationship through movement. Baby uses Scramble to Mother when obstructed, grabs or throws people in its way, and threatens several blockers with Flail. Its attention returns to Gressa rather than following an arbitrary target-priority chart.

If the Party breaks the Reconstruction Condition while Baby is active, apply Tantrum. Make the change visible: its desperation escalates. Separating the Source is still strategically useful, but the Party must survive the current manifestation.

## The Source

::embed{#source.evin-cloth-toy}

## Player Leverage

- **Protect and move people.** Evacuate the street and keep Gressa out of the creature's reach without treating her death as the answer.
- **Follow the behavior.** The toy, the mother and the creature's attempts to reach her are evidence available through play; no single successful knowledge check is required to notice the connection.
- **Separate the relationship.** Moving the vessel away from Gressa can break the external condition while the toy remains the vessel. Use the active Source's Bulk and handling rules, not its apparent weight as a toy.
- **Disperse the body.** Damage creates an opportunity to handle the exposed Source; it does not destroy the Weight.
- **Use the exposed interval.** Moving or containing the toy can make reconstruction impossible before the Window closes.
- **Attack the vessel.** This is possible under the Ward and Rupture rules, but turns an object problem into another Source topology. Do not quietly equate destruction with resolution.

The Party can recognize a real mother-child relationship here. It cannot yet supply the missing life that would make the infant conclusion untenable. Preserve those later revelations for the Peakwalker investigations.

## Dispersal and the Window

::embed{#rule.dispersal}

::embed{#rule.stabilization-window}

The Source's threshold is :stat{#source.evin-cloth-toy key=stability-threshold}. Track Pressure openly once the Window begins. Let the Party see that useful actions consume time while ordinary movement can change the relationship without doing so. Resolve an action's effect before its Pressure.

For direct attacks, handling and movement of a manifested Source, use :ref[Active Sources]{#rule.active-sources}. For a destroyed vessel, use :ref[Source Destruction]{#rule.source-destruction}; breaking the toy is never a shortcut around that procedure.

## The Order Arrives

The Order calls the event **“Class Two Echo. Source unsecured.”** It does not need Evin's full Identity to recognize an emergency.

Kelda and the Guard clear civilians, coordinate with the Party and help create a safe interval. If the Party already secured the scene, acknowledge that success. If it needs help, the Order's practical response establishes why people trust the institution. Do not erase player achievements to demonstrate Order competence.

::embed{#rule.containment}

An intact toy can be secured and transferred to the Hall of Remembrance. Living Gressa requires EGRESS's suppression and containment infrastructure; the Order can protect and quarantine her while arranging that response.

## Resolution and Handoff

| State left behind | Carry into Prisoners |
|---|---|
| Toy intact and contained or dormant | Its location, custodian and relation to Gressa; A Life is the supported investigation |
| Weight transferred into living Gressa | Her condition and the Baby suppression arrangements; Containment is the supported investigation |
| A Scar or another recipient | Record the actual vessel and consequences; do not claim the toy or living-Gressa branch occurred |
| First contact prevented | Record the averted Incursion and what evidence remains; the written detention sequence may need adaptation |

Also record injuries, civilian harm, who saw Kivren, whether the Party exposed them, and what the Order actually witnessed. None of these outcomes awards an automatic new Trust point.

Once the immediate emergency is under control, continue to :ref[Prisoners]{#event.prisoners}. The Order's help and its suspicion are both real. If the Party refuses detention or escapes, keep the consequences of that choice rather than making arrest an unavoidable cutscene.

## If the Party Does Not Intervene

The Order responds to the emergency. Its objective remains protection and containment, and the surviving vessel still determines what follows. Gressa's survival and the street's losses are not predetermined. Resolve them from the established situation; do not invent an automatic casualty result or assume the Party earned trust merely by being present.

The unresolved relationship remains a campaign promise. If the Party never follows A Life, Evin's adult life and the cloth-toy child's later fate still need a deliberate payoff.
