---
# yaml-language-server: $schema=../../../schemas/npc.schema.json
id: npc.tomlin-cobb
slug: tomlin-cobb
name: Tomlin Cobb
role: Old Town Cemetery Groundskeeper
ancestry: Human
class: Animist
background: Groundskeeper
level: 8
gender: Male
age: 82
aliases:
  - Old Tom
summary: Fractured survivor who tends Old Town’s cemetery and calls everyone Sunny after one half-remembered name.
narrativeTier: Major
status: draft
origin: prepared
start:
  socialClass: faction.fractured
  location: location.old-cemetery
  state: Alive
  instability: Stable
  values:
    truth: 0.55
    stability: 0.35
    agency: 0.1
  beliefs: {}
  doubt: A
  conviction: 85
  pressure: 80
  influence: 45
  impressionable: 15
relationships:
  - to: npc.kivren-quozot
    type: Adversarial Familiarity
    summary: |-
      The Instigator regards the Groundskeeper as living proof that the Colony’s buried history remains active.
      They bring recruits to the cemetery, quote the Groundskeeper out of context, and invoke their suffering as justification for further exposure.
      The Groundskeeper understands the difference between revealing a grave and tending it.
      “You keep opening graves and acting surprised to find people inside, Sunny.”
      They do not deny the Instigator’s accusations. They object to the habit of leaving others to carry the consequences.
  - to: npc.vara-cairn
    type: Kindred Recognition
    summary: |-
      The Keeper’s presence affects the Groundskeeper differently from most people.
      Her Calling makes her identity unusually coherent against their fracture. They may hesitate before calling her Sunny, recognize her father’s mapmaking habits, or understand that another name is beginning to gather around her.
      She is fascinated rather than frightened by them and takes their knowledge of Old Town seriously.
      The Groundskeeper may be one of the first people to recognize that her bad maps are not merely a hobby. Both of them understand that incorrect information can still reveal the shape of what is missing.
  - to: npc.sundara-cobb
    type: Unknown
    summary: The name of the person whom the Groundskeeper can't quite remember.
provenance:
  - doc: Character Briefs
    heading: Groundskeeper - Tomlin Cobb
---

## Overview

The Groundskeeper is the original caretaker of Old Town’s cemetery and one of the few people who survived the mnemonic catastrophe that destroyed much of the district and shattered the old wall.
They remain in the cemetery long after its official abandonment, tending broken graves, clearing paths through the ruins, and caring for the dead the Colony no longer remembers.
They are profoundly Fractured. They call nearly everyone **Sunny**.

## Personality

Gentle, stubborn, and matter-of-fact about things others find impossible.
They distinguish people perfectly well by appearance, behavior, history, and relationship. They remember who returned, who helped, who lied, and who should not be trusted near a particular grave.
They simply cannot retain personal names.
Instead, every person occupies the same damaged place in their memory:
*Sunny.*
“Not you, Sunny. The other Sunny. The one with the hat.”
They rarely seem embarrassed by this and become irritated when others assume they are confused about anything besides the names.

## Motivation

Tend Old Town’s dead and living so that every person, grave, object, and home continues to belong somewhere specific.

## Primary Protection

**The right of the forgotten dead—and the living beside them—to belong somewhere specific.**
They resist any attempt to reduce Old Town to an incident, data set, political symbol, or cautionary story.
Every grave stood somewhere. Every object belonged to someone. Every life occupied a particular place in another person’s world.
Even when the Groundskeeper cannot recover the correct name, they insist the distinction still matters.

## Fears

That Old Town will be erased again and its people, graves, homes, and relationships will be treated as interchangeable fragments.

## Blind Spot

Tom's care for the dead is genuine, and his mistrust of destroying or removing grave objects is **historically warranted**: the Colony once burned the Sources, causing Scars rather than Rest. He can become rigid about leaving each memorial in place, but this is **not** the mechanical key to Sunny. He does not need to deliver a speech about relinquishing custody.

His deepest unresolved wound is **knowing there is someone he must remember but being unable to retrieve her Name**. Tom identifies other people through Context and Relationship even when their personal names all become “Sunny.” During Totality that reaching can dangerously supply one repeated identity answer. Restoring one genuine Name can relieve the current crisis without curing Tom's Fracturing or fully resolving Old Town's Wound. The grave/whistle/Chorus procedures belong to the Act III *Encounters.md* entry.

## Narrative Role

Tom is both the **living legacy of the original source-burning disaster** and the dominant present Recognition focus of its Wound. He is not a convenient one-man answer to hundreds of separate original lives. In Act II *Sunny*, Darkwing helps **six actual, distinct forgotten lives** find their own Named Boundaries while Tom's personal Name-loss remains unresolved. That encounter must **not** reveal Sundara's particular grave or the object hidden there.

In Act III *Sunny*, the wider history's zombie Form returns, but through Tom's one missing Relationship: the resulting mass Chorus consists of **hundreds of false Sundaras**. The Party finds the correct grave by observing Resonance from Dispersed individual zombies; the associated **swallow whistle** freezes the mass and leads Tom to the damaged `SUNDA—` inscription. Tom speaks **Sundara**; the false mass reconstruction Stabilizes. His Fracturing and the district Wound remain. This is a **physical Name/Relationship mechanic**, not a mandatory persuasion scene or a cure for all of Old Town.

## Portrayal Notes

Gentle, stubborn, and matter-of-fact. They are not confused except about names, and irritation appears whenever others mistake fracture for incompetence. “Sunny” should sound natural and specific each time, as though the distinction is perfectly obvious to them.

## Pressure Response

They become intensely specific about places, objects, and movements. Names remain Sunny, but every other distinction sharpens into exact instruction.

## Signature Quote

*“You’re not the same Sunny. I know that. Names aren’t the only way to know a person.”*

## Signature Object

A battered cemetery keyring containing keys to gates, sheds, and paths that no longer appear on current maps.

## Performance Inspiration

Jim Broadbent (Prof. Slughorn)

## Notes

Current display name remains occupational. “Sunny” is not their name; it is the fragment they apply to everyone else.

## The Name — GM Truth, Hidden Until Sunny

Tom's repeated **Sunny** is a damaged, sincere echo of the personal Name **Sundara**, the Name of his wife, **Sundara Cobb**. His Fracturing preserves remarkably precise social and spatial memories while he cannot retrieve individual personal Names. He knows one particular person is missing, but he cannot say who; that effort to remember becomes a powerful and dangerous Recognition under Totality.

The exact grave location, the `SUNDA—` fragment, the associated whistle, and the grave-testing procedure are **encounter evidence** reserved for the Act III cemetery crisis. Do not disclose them during the earlier six-life Chorus. They are recorded in *Encounters.md* and *Creatures.md*; this brief retains the emotional truth that Tom is trying to remember one woman.

## Relationship to the Old Town Catastrophe

Tom survived the Colony's disastrous effort to burn away the apparent dead. His grief, long caretaking of the cemetery, and persistent connection to Sundara have made him the dominant **living Recognition focus** of a much larger unresolved Wound, not the sole Source of all the original lives. This history makes his opposition to casual Source destruction and removal well founded, although it cannot tell Darkwing how to solve every problem in Old Town. The original outbreak, Rupture and Scars, and later mass-Sundara reconstruction are durable campaign history in *Campaign Outline.md*; their tactical expression is in *Encounters.md*.

## Life in Old Town

The Groundskeeper continues to:
* Maintain paths through the cemetery and ruins.
* Repair damaged markers.
* Leave flowers at unidentified graves.
* Recover objects before they are removed or weaponized.
* Guide residents around unstable mnemonic sites.
* Bury Old Town’s present dead among those the Colony forgot.
* Refuse every proposal to relocate them.

They know when a street is beginning to remember an older route, which stones should not be moved, and when the Broken Bell is likely to ring.
Old Town residents trust their practical knowledge even when their condition unsettles outsiders.

## Relationship to the Shattered Instigator

The Instigator regards the Groundskeeper as living proof that the Colony’s buried history remains active.
They bring recruits to the cemetery, quote the Groundskeeper out of context, and invoke their suffering as justification for further exposure.
The Groundskeeper understands the difference between revealing a grave and tending it.
“You keep opening graves and acting surprised to find people inside, Sunny.”
They do not deny the Instigator’s accusations. They object to the habit of leaving others to carry the consequences.

## Relationship to Dawn

Dawn has repeatedly promised repairs, recognition, funding, and reintegration for Old Town.
The liaison may have worked personally with the Groundskeeper and earned genuine affection. The Groundskeeper believes in their sincerity but no longer treats sincerity as evidence that anything will change.
The Dawn leader refers to Old Town as proof of institutional failure. The Groundskeeper refers to him as another Sunny who visits when people are watching.

## Relationship to EGRESS

EGRESS considers the Groundskeeper an unusually stable long-term Fractured subject and a valuable source of information about the original catastrophe.
The Groundskeeper refuses formal study.
They believe EGRESS notices patterns without noticing the people trapped inside them. Researchers ask why every name becomes Sunny. The Groundskeeper asks whether they have repaired any of the graves they measured.

## Relationship to the Keeper

The Keeper’s presence affects the Groundskeeper differently from most people.
Her Calling makes her identity unusually coherent against their fracture. They may hesitate before calling her Sunny, recognize her father’s mapmaking habits, or understand that another name is beginning to gather around her.
She is fascinated rather than frightened by them and takes their knowledge of Old Town seriously.
The Groundskeeper may be one of the first people to recognize that her bad maps are not merely a hobby. Both of them understand that incorrect information can still reveal the shape of what is missing.

## Relationship to the Party

The Groundskeeper becomes the Party’s living guide to Old Town.
They do not provide a clean historical account. Their knowledge is spatial, relational, and fractured:
* Which home belongs near which grave.
* Which object is searching for a particular place.
* Which manifestation has combined people who do not belong together.
* Where the present district ends and the remembered one begins.
* Which supposedly empty spaces feel occupied.

They judge the Party less by what it discovers than by what it does after discovering it.
Anyone can uncover a grave.
The Groundskeeper respects those who remain to help carry what was inside.

## The Original Catastrophe

Before Old Town was destroyed, the Groundskeeper noticed that the cemetery contained more relationships than its records could explain.
Unmarked graves received flowers. Paths curved around plots listed as empty. Objects returned after being removed. Mourners arrived without knowing whom they grieved.
The Groundskeeper attempted to restore dignity and order to these absences. Their connection to Sundara’s broken stone—and to an associated Fractured Object—became the point around which the cemetery’s accumulated mnemonic pressure cohered.
The resulting manifestation attempted to reconstruct forgotten people and relationships without enough names to distinguish them.
The cemetery expanded into the surrounding district. Graves overlapped homes and streets. Living people were assigned forgotten identities. The old wall failed as remembered and present structures attempted to occupy the same ground.
The Groundskeeper did not create the burden.
Their act of care gave generations of abandoned memory a shape it could follow, but no viable destination in which it could rest.
