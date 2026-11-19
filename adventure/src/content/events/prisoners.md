---
# yaml-language-server: $schema=../../../schemas/event.schema.json
id: event.prisoners
slug: prisoners
name: Prisoners
summary: The Order detains the Party and offers two ways to explain what happened.
function: Introduce The Order
synopsis: After the emergency, the Order detains the Party to establish responsibility. Vara's visit introduces her inexplicable compass before Serevan asks about unexplained possessions, testing whether Darkwing deliberately keeps her confidence. Serevan defends the Colony's protective procedures. The surviving toy opens the Witnesses' investigation, living Gressa as Source opens EGRESS's, and the Party can instead test the official explanation in the Duskwood. Before departure, Vara asks to participate again.
part: part.act-1
chapter: arrival-and-the-first-incursion
order: 4
leadsTo:
  - to: encounter.a-life
    thread: thread.the-cloth-toy
  - to: encounter.duskwood
    thread: thread.the-official-duskwood-story
  - to: encounter.containment
    thread: thread.egress
links:
  - npc.kelda-varruk
  - npc.serevan-ilvar
  - asset.hall-of-the-keepers
  - npc.vara-cairn
  - npc.uldren-harthwright
  - npc.gressa-peakwalker
  - npc.celia-harthwright
  - location.hall-of-remembrance
  - location.egress-institute
status: draft
readiness:
  status: compiled
provenance:
  - doc: Campaign Outline
    heading: Session 2 — Bad Maps
  - doc: Campaign Outline
    heading: Session 3 — Dusk
---

:::design
Opening-chapter reconciliation, 2026-11-18. Campaign Outline owns the detention, compass confidence, route availability and second invitation. Exact dialogue and scene ordering below stage those decisions without creating new legal procedures or a mechanical interrogation contest. The visit precedes Serevan's question so keeping confidence can be deliberate. No automatic penalties for reporting the compass, and no forced reset of prior Trust, have been invented.

This page assumes the ordinary aftermath of Bad Maps. Escape, prevented manifestation, a Scar, or Gressa's death require the GM to follow actual events. The Order's physical detention arrangements, release terms and response to exceptional outcomes remain to be designed. The arrival hook remains the recorded UFO mission order; optional PC family hooks from General Campaign Discussion remain deferred, not canon.
:::

## Opening State

The immediate danger in :ref[Bad Maps]{#encounter.bad-maps} has been brought under control. :ref[Kelda]{#npc.kelda-varruk} and the Order detain the armed newcomers found at its center while :ref[Serevan]{#npc.serevan-ilvar} establishes what happened.

Bring the actual aftermath into this scene: the current vessel, Gressa's condition, civilian losses, the Party's help, and any evidence of Kivren's involvement. Serevan's suspicion is not proof of guilt. Kelda's competent rescue does not make the detention harmless or voluntary.

If the Party did not submit to custody, stage the same information through a negotiation or later contact where plausible. Do not narrate an arrest that the players prevented.

## Who Is Here

- **Kelda** knows what the Guard witnessed. Preserve that distinction from what Serevan suspects.
- **Serevan**, His Prominence, treats the incident as evidence that the Colony's handling precautions are necessary.
- **Vara and Uldren** can visit before the formal questioning. Their visit supplies a personal moment amid institutional scrutiny.

## Vara's Visit

Give Vara time to speak with the Party before Serevan asks about other objects. She shows them the professional cartographer's compass she carries everywhere. Asked where it came from, she answers sincerely that she has always had it.

The important evidence is the mismatch: an instrument with a professional purpose, carried with complete familiarity, whose provenance she cannot explain. She is not offering a theory about a missing person or confessing a secret she understands.

:::secret
The compass belongs to the surviving traces of Marek Cairn in :ref[Vara's character entry]{#npc.vara-cairn}. Preserve the absent father's thread. Do not name him for the players or explain the object on Vara's behalf.
:::

If Darkwing refused her first invitation, this interaction can still matter to her; the Act I Trust lock is not lifted by a later visit.

## Serevan's Questions

Serevan asks what the Party saw, who handled the object, and what changed during the manifestation. Let evidence of Kivren's actions affect the account. Do not require the Party to remain falsely accused in order to reach the next investigation.

His argument rests on an observable truth: the danger was real, and the Order's procedures protected people. He presents the Witnesses' careful handling as evidence of the need for those precautions. If Gressa became the vessel, the need for EGRESS expertise is equally concrete.

Then he asks whether Darkwing has encountered other possessions with unexplained provenance—especially objects whose owners insist they have always had them.

The question must be recognizable without telling the players that a Trust test is occurring. Let them decide whether it applies to Vara's compass and what to reveal.

## Trust 2: Keeping Confidence

| The Party's choice | Record |
|---|---|
| Recognizes the implication and deliberately keeps Vara's confidence | Earn Trust 2 if the Trust spine remains open; Vara can learn afterward that they protected what she shared |
| Does not connect the question to the compass | No Trust gained; this is not a betrayal |
| Reveals the compass | Record what was disclosed and to whom; no confidence point is earned |

Use the [Act I Trust spine](/docs/act-1/#varas-trust) for the continuing relationship state. Refusing the first invitation still locks direct Trust at 0 through Act I. Disclosure awards no confidence point; it does not automatically subtract earned Trust or confiscate the compass. Follow the resulting conversation and preserve the distinction between protecting Vara and overruling her.

## The Investigation Opens

The next step is to test an explanation. The Order's ability to secure a dangerous Source does not settle what it remembers or where the Veiled come from.

| Route | What makes it available | Question it can answer |
|---|---|---|
| :ref[A Life]{#encounter.a-life} | The cloth toy remains the intact Source | What else did the child become? |
| :ref[Containment]{#encounter.containment} | The toy Ruptured and living Gressa carries its Weight | What responsibilities survive when a person is forgotten? |
| :ref[Duskwood]{#encounter.duskwood} | Available regardless of the two ordinary Source outcomes | Do the Veiled actually come from the forest? |

These are alternative investigations, not three successive required stops. Offer the available evidence and leads; record what the Party chooses. If Bad Maps left a different vessel or averted the manifestation, adapt the lead rather than silently restoring the expected state.

## Trust 3: Come With You Again

Before departure, Vara asks to accompany the Party again. Now everyone knows mnemonic phenomena can kill. The choice tests whether her earlier inclusion survives real danger.

- **Include her:** earn Trust 3 if the Trust spine remains open. Uldren accompanies her in his established caretaker role.
- **Refuse:** the investigation proceeds without her; existing Trust remains, but no point is earned.

Do not confuse this with the later **Agency Stance** conversation. That happens in :ref[An Opportunity]{#event.an-opportunity} while Vara is absent and adds no Trust point.

## Outcomes and Possible Next Developments

Carry forward the Source's condition and custodian, the Party's relationship with the Order, knowledge of the compass, whether its confidence was deliberately kept, and whether Vara is joining the investigation.

The chapter ends with a practical question and a chosen lead: **what actually caused the manifestation, and what do these objects remember?** The Order has shown that it knows a method. The following investigation tests the limits of its explanation.
