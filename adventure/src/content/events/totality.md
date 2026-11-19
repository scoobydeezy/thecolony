---
# yaml-language-server: $schema=../../../schemas/event.schema.json
id: event.totality
slug: totality
name: Totality
summary: The old Reading can no longer gather memory now spread across the Colony.
function: Break The Old Solution
synopsis: >-
  The eclipse reaches Totality and stops. On either path, five simultaneous fronts now open in the Colony actually established by play.
part: part.act-3
chapter: catastrophe
order: 2
leadsTo:
  - to: encounter.sunny
    thread: thread.the-reckoning-is-coming
  - to: encounter.the-breach
    thread: thread.egress
  - to: encounter.milltown
    thread: thread.faction-conflict
  - to: encounter.the-tangled-web
    thread: thread.faction-conflict
  - to: encounter.the-open-door
    thread: thread.faction-conflict
links:
  - asset.book-of-names
variesBy:
  - branch.the-reading
variants:
  - key: succeeds
    when:
      - path.the-reading-succeeds
    summary: The Party's distributed reconstruction of Vara has reopened the closed inheritance.
    synopsis: >-
      The eclipse reaches Totality and stops. The Party's distributed reconstruction has reopened the closed inheritance, and five simultaneous fronts now open in the Colony actually established by play.
  - key: stopped
    when:
      - path.the-reading-is-stopped
    summary: The Book has rejected Vara's second Reading; she is not Forgotten.
    synopsis: >-
      The eclipse reaches Totality and stops. The Book has rejected Vara's resumed attempt; she is not Forgotten. Five simultaneous fronts now open in the Colony actually established by play.
status: draft
readiness:
  status: compiled
provenance:
  - doc: Campaign Outline
    heading: Session 9 — Totality
  - doc: Campaign Outline
    heading: Session 9 — Totality > Shared Totality
---

## Opening State

The eclipse stops moving. Let a moment of uncanny silence precede the alarms; the catastrophe is occurring in the Colony the Party actually changed.

:::branch{when=path.the-reading-is-stopped}
The Book has rejected Vara’s resumed attempt. She is not Forgotten, and the old closed transfer cannot gather memory that has already attached elsewhere.
:::

:::branch{when=path.the-reading-succeeds}
The Party’s distributed reconstruction of Vara has reopened the closed inheritance. Too many relationships have been restored for the old closed chain to remain sealed.
:::

## At the Table

**Objective:** coordinate responses to simultaneous emergencies. **Board:** the whole Colony. **Clocks:** actual operations and each encounter’s stated progression. **State:** five fronts, each with one outcome; Aspis and Kelda are independent relationship-led contributions.

## The First Alarms

At Totality, the old status quo becomes mechanically unrecoverable. Memory has attached to living relationships, Fractured Objects, civic records, historical places, engineered systems, institutions, and the Book itself. The eclipse remains fixed.

The first alarms are not a neat choice of two adventures. The **Broken Bell rings without being struck**, EGRESS issues a containment emergency, and the living Milltown Floodwarden's warning becomes the impossible flood. Citizens recognize strangers they cannot remember, old roadways intersect active streets, objects ignite into Incursions, and civic records insist on missing people. These are the faces of the five fronts and the texture of a city coming apart, not a separate board of conditions.

The Pilgrim Quarter produces **no comparable alarm**. As ordinary residents and Veiled enter Pilgrim's Rest to witness the apparent fulfillment of Cult devotion, none desires to leave. Allow roughly one other encounter's worth of time before the growing silence becomes conspicuous; by default the quarter is empty when Darkwing arrives. If the Party looks sooner, honor the earlier state. The Hall's crisis can also emerge from quiet institutional work already underway: Celia has assembled twelve plausible candidates and four Witness defenders are holding a colossal Spider in apparent check.

The Party may follow any of these leads, but a lead is not the objective. It discovers what people are attempting amid the conditions: who is moving an Asset, evacuating a household, reopening a route, seizing authority, protecting evidence, or imposing a form of containment. Faction operations provide the deadlines. **Totality is the board; the factions are the clocks.**

## Five Leads

- :ref[Sunny]{#encounter.sunny}: the Broken Bell and black reconstruction of Old Town; Shattered response and Dead Drop Network capacity.
- :ref[The Breach]{#encounter.the-breach}: EGRESS containment failure; protect Engram Vault capability while responders handle containment.
- :ref[Milltown]{#encounter.milltown}: a Floodwarden swept away by invisible water; civilian evacuation and Dawn’s capacity.
- :ref[The Tangled Web]{#encounter.the-tangled-web}: Witnesses apparently holding a vast Spider in check; the Ledger and an organized response.
- :ref[The Open Door]{#encounter.the-open-door}: missing returns and a silent quarter; the Cult’s ability to send help out of the Rest.

## Running Concurrent Time

Use :ref[Act III Front Outcomes]{#rule.act-three-fronts}. Offer information sufficient to choose a response or capable delegate. Do not create an extra crisis board, a second integrity roll, or hidden point losses merely because the Party investigates. Direct attendance is not automatic success.

At scene transitions, state what ongoing operations visibly changed and whether a deadline has become imminent. Encounter rounds stay local; a tactical fight does not silently consume invented city turns. Where the source leaves an external deadline unspecified, announce a concrete fictional threshold before it expires—for example, the last available evacuation team departing. Record that threshold in campaign state.

## Entering The Burden

Once Finale Pressure reaches 5, finish the current scene and begin :ref[The Burden]{#encounter.the-burden}. If catastrophic deadlines force collapse first, use that established state. Pending fronts supply no retroactive aid.

:::design
Citywide deadline lengths are not settled. Announced fictional thresholds are the policy, not a synchronized numerical clock.
:::

## Possible Next Developments

Darkwing can respond, delegate, negotiate or pursue another materially relevant action. The five fronts are concrete adventures, not a mandatory completion list.
