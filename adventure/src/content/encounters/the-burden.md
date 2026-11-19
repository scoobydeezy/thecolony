---
# yaml-language-server: $schema=../../../schemas/encounter.schema.json
id: encounter.the-burden
slug: the-burden
name: The Burden
summary: The accumulated weight of the Colony's past has nowhere left to go.
function: Final Boss
synopsis: >-
  The Party confronts the final Veiled manifestation: centuries of Keepers, ritual imagery, institutional doctrine, and forgotten history reconstructed around the missing shape of the First Keeper. The encounter forces the Party to use every component of Identity it has learned—Name, Relationship, Form, Context, Pattern, Choice, and Memory—while the five front results, Perrik's access to the Claims Registry, Kelda, and each faction's relationship with the Party determine which help arrives and whether it assists or interferes. Each successful stabilization strips away another false reconstruction, forcing the manifestation to become smaller, more specific, and more human. When the final Name is restored, the black silhouette resolves into a recognizable woman. The Veiled manifestation is gone. Aletheia remains.
part: part.act-3
chapter: finale
order: 1
leadsTo:
  - to: event.aletheia
    thread: thread.the-reading
status: draft
readiness:
  status: compiled
provenance:
  - doc: Encounters
    heading: 18. The Burden — First Keeper Reconstruction
  - doc: Campaign Outline
    heading: Session 11 — The Burden
  - doc: The Burden — Final Veiled Encounter
    heading: 4. Governing Encounter Rules
  - doc: The Burden — Final Veiled Encounter
    heading: 15. Damaged Front — Half Capability
---

## At the Table

**One Source, four reconstructions:** Wound → Composite → Echo → Chorus. The fight becomes smaller, more specific and more human as Darkwing restores Identity. Every phase contains its own evidence; optional investigations supply mastery and support, never permission locks.

| Phase | Encounter problem | Identity recovered |
|---|---|---|
| [I — The Monument](/docs/act-3/the-burden-phase-1/) | Dismantle inherited ritual architecture | Context and Pattern |
| [II — The Borrowed First Keeper](/docs/act-3/the-burden-phase-2/) | Remove borrowed Forms | Form and Relationship |
| [III — Through Her Eyes](/docs/act-3/the-burden-phase-3/) | Follow the Memories to the original choice | Memory and Choice |
| [IV — The Succession](/docs/act-3/the-burden-phase-4/) | Restore individual Keeper boundaries | Name |

## Entry and Persistent State

Use :ref[Act III Front Outcomes]{#rule.act-three-fronts}: the finale starts after the current scene once the threshold is met, or from terminal collapse if deadlines fail first. Pending fronts provide no retroactive aid. Record the five established front results, stance, actual personnel, Perrik’s Registry access and Kelda’s independent choice.

The final boss is **not Aletheia**.

It is the accumulated false reconstruction created by more than two centuries of:

- Keepers;
- ritual repetition;
- civic myth;
- institutional doctrine;
- monuments and frescoes;
- inherited imagery;
- forgotten history;
- memories attached to the Book;
- the Colony’s repeated answer to a question it no longer remembers.

> **The final boss is the answer that forgot its question.**

The final encounter is not a different supernatural system. It is the largest expression of the Veiled system the Party has already learned.

> **Fight → Break → Make one truth permanent → Next phase.**

The fight should feel like:

> **Everything has been leading you here.**

## Governing Procedures

These principles govern all four phases.

1. **Four major phases.**
2. **Each phase must be worth attacking.**
3. **Damage must always help.**
4. **0 HP guarantees a Restoration opening unless a phase has a clearer earlier truth-trigger.**
5. **Do not punish misunderstanding with full-health resets or repeated puzzle loops.**
6. **Each phase has one encounter problem, not one separate puzzle for every Identity component.**
7. **Prior Act II routes create shortcuts, mastery advantages, and faction help.**
8. **Skipped routes never create missing required knowledge or permission locks.**
9. **Local evidence must always be sufficient to learn what the Party needs under boss pressure.**
10. **Faction state modifies difficulty and battlefield behavior; factions do not solve phases for the Party.**
11. **Restoration becomes deterministic once the relevant truth has actually been earned.**
12. **No redundant final truth-check roll.**
13. **If players do not understand, the encounter telegraphs harder rather than resetting.**
14. **Failure costs should be damage, conditions, lost actions, faction complications, additional adds, or stronger later pressure—not repeating the same phase from scratch.**
15. **A player who has forgotten campaign terminology must still be able to contribute by playing PF2E well.**
16. **Normal PF2E actions matter: attacks, movement, Grapple, Trip, Shove, debuffs, healing, positioning, battlefield control.**
17. **The fight becomes simpler and more human as Darkwing succeeds.**
18. **The finale ends on Name.**
19. **The final Aletheia resolution uses the same Named Boundary procedure as every other Keeper. Aletheia does not receive a mechanically privileged final ritual.**

Use :ref[the Book’s Source profile]{#source.book-of-names}, :ref[Keeper-bound Handling]{#rule.book.keeper-bound-handling}, :ref[active Source and Backlash rules]{#rule.active-sources}, and :ref[Identity Restoration]{#rule.identity-and-stabilization}. A meaningful truth already earned does not require another roll.

## Contribution Strength

A **Damaged** front is already the associated Asset's **Damaged** status and **+1 Finale Pressure** result. It halves the associated faction's finale capability; no second Asset check is made.

When the capability is a count:

> **halve it and round up**

When the capability is continuous or recurring:

> **use it half as often or at half scope**

Specific mappings are authoritative below.

---

## Shattered — Sunny Front / Dead Drop Network

### Stable — Assist
Destroy **2 ray emitters** before Phase I begins.

### Damaged — Assist
Destroy **1 ray emitter** before Phase I begins.

### Stable — Interfere
Phase I begins with **3 Processional Graspers**.

### Damaged — Interfere
Phase I begins with **2 Processional Graspers**.

### Lost / unavailable
No organized Shattered intervention.

---

## Aspis — Perrik (No Front Score)

Perrik is an **administrative relationship-led ally**, not a sixth front. His contribution does not increase or decrease Finale Pressure.

### Perrik remains, helps, and has Registry access — Full Forecast
A player selects **every** Eightfold Pattern card.

### Perrik remains and helps without effective Registry access — Limited Forecast
A player selects **every other** Eightfold Pattern card, beginning with the first. Other Patterns are determined normally.

### Perrik leaves, refuses, or is unavailable — No Forecast
No Pattern intervention. Perrik need not become a combatant or an enemy to withhold assistance.

## Cult — Open Door Front / Pilgrim's Rest

### Stable — Assist
Darkwing chooses **one entire Form family** in Phase II.

Both Forms in that family are unavailable.

### Damaged — Assist
Darkwing chooses **one Form** from any family.

Only that single relic is unavailable; its paired Form remains.

### Stable — Interfere
The Composite has **4 actions every turn**.

### Damaged — Interfere
The Composite gains a **fourth action on alternating rounds**, beginning on round 1.

### Lost / unavailable
No Cult intervention.

---

## Witnesses — Tangled Web Front / Ledger

### Stable — Assist
Once each round, Darkwing may make **one attached Form Dormant** without an attack roll.

### Damaged — Assist
This free removal is available on **alternating rounds**, beginning on round 1.

### Stable — Interfere
Every individual Form piece gains **Preserved Once**.

The first time it would become Dormant, it returns at full Form HP.

### Damaged — Interfere
Only the **Primary Form** in each of the six families gains Preserved Once.

The six Secondary Forms do not.

### Lost / unavailable
No Witness intervention.

---

## EGRESS — Breach Front / Engram Vault

### Stable
**2 Memory Frames** participate in Phase III.

Their behavior is determined by EGRESS stance:

- Assist → protect Darkwing
- Interfere → protect the Echo

### Damaged
**1 Memory Frame** participates.

### Lost / unavailable
No Frames participate.

---

## Dawn — Milltown Front / Assembly Hall

### Stable
Dawn can mobilize **3 operatives**.

If assisting:

- all three secure the Ritual Chamber side of the route;
- outside faction complications do not follow Darkwing into Phase III.

If interfering:

- Julian Arrett + two loyalists enter the Memory and become recurring victims.

### Damaged
Dawn can mobilize **2 operatives**.

If interfering:

- Julian Arrett is always one of them;
- the second may be a named Dawn NPC or a nameless loyalist.

If assisting:

- the reduced team still secures the narrow tunnel entrance, but Dawn has no additional manpower available elsewhere during this beat.

### Lost / unavailable
No organized Dawn intervention.

---

## Order — Kelda (No Front Score)

Kelda is the Order's principal finale intervention. **Her relationship with Darkwing, her own decision, and her ability to reach Crescent Island** determine whether she Assists, Interferes, or is Absent. The Hall of the Keepers is not a sixth-front Asset gate; its physical state can still affect the fiction and her actual route.

### Kelda available at the start
She participates from the **start of Phase IV**, on the side she has chosen. She can help Darkwing dismantle the Institutional Ward or defend Serevan using the same creature chassis and reaction rules.

### Kelda delayed by established events
If actual campaign events delay her arrival, preserve the existing delayed-entry option: she arrives **after Company II resolves**, at the start of Company III. Do **not** derive this delay merely by labeling the Hall "Damaged."

### Kelda absent or unable to reach the fight
No organized Kelda intervention. Her absence requires a real campaign cause, not a failed invented Asset-status check.

**Serevan / Bearer of the Last Secret remains a separate story invariant required for the final Name reveal.**

## After the Host Resolves

The final Named Boundary does not make Aletheia disappear.

It does the opposite.

When Darkwing truthfully identifies:

> **Aletheia**

the black Veiled surface resolves.

At the same moment, the entire previously Named Host completes the same transition.

The roughly two hundred Keepers become:

> **fully corporeal Forgotten people**

They are no longer hostile mechanics or Chorus scenery.

Darkwing can:

- speak with them;
- touch them;
- recognize them;
- ask questions;
- reunite people whose relationships survived outside conscious memory.

The battlefield becomes a gathering of people rather than a supernatural combat state.

## Vara / Marek Beat

If Vara is present among the Forgotten Host and Marek is present:

> **Vara runs to her father.**

If the campaign branch or immediate emotional state makes Darkwing the more urgent relationship:

> **she may run to the Party first.**

Do not force one version regardless of play.

The point is that the final boss has ended by restoring the relationships the institution erased.

---

## Aletheia and the Weight

Naming Aletheia ends **The Burden**; it does **not** end Totality. :ref[Aletheia]{#event.aletheia} owns her explanation, which restores the question rather than supplying the answer, and the choice of where the Weight should rest. :ref[The Light Remains]{#event.the-light-remains} owns the Final Reading and how Totality ends.

## Exceptional Continuity

The authored Phase IV assumes Serevan can arrive as Bearer of the Last Secret. Do not undo a death or decisive earlier removal merely to restage him. Preserve the final Name through already established testimony or records, and let the surviving Keeper history supply its rightful boundary. Do not add a secret replacement villain. This exceptional route requires a scene-specific adaptation recorded from the actual campaign state.

:::design
## Book / Table Prop Structure

### Phase I — Pattern Ring
Prepare:

- eight physical triangular ray markers;
- four state glyphs:
  - **▲ Air Only**
  - **△ Whole Sector**
  - **▼ Ground Only**
  - **▽ Disabled**
- eight circular Pattern cards oriented to Founder’s Way;
- broken-ray markers;
- Procession lane template;
- Eclipsefall template.

Do not number the battlefield for the players.

Reading orientation is part of the Pattern problem.

### Phase II — Form Board
Prepare:

- six family slots:
  - Assault
  - Control
  - Mobility
  - Guard
  - Influence
  - Sustain
- twelve relic cards;
- material profile icons;
- Dormant markers;
- Preserved Once markers;
- Cult-disabled marker.

### Phase III — Memory Chase
Prepare:

- one scrolling chase strip;
- three Memory cards:
  - Chelish oppression
  - Duskwood invasion
  - River Foam flood
- three Dawn-operative markers if needed;
- two EGRESS Frame markers;
- crowded memorial pages in the physical Book prop;
- one final blank page for Aletheia.

### Phase IV — Succession
Prepare:

- four quarter-moon Host pieces;
- four Captain minis / markers;
- Institutional Ward HP tracker;
- Chorus Pressure tracker;
- single-name Keeper pages after Aletheia's page;
- Aletheia page that becomes legible only after the Last Secret.

---

## Narrative Placeholders

Exact dialogue remains deliberately unfinished.

The following placeholders preserve the required beats without locking performance prose too early.

### Serevan Takes the Book

The emotional sequence is:

1. recognition of Aletheia;
2. compassion;
3. taking the Book gently;
4. stepping physically between her and Darkwing;
5. institutional certainty hardening into opposition.

Placeholder thesis:

> “You have mistaken survival for cruelty because you arrived late enough to see only the cost.”

> “I have buried people when these protections failed.”

> “You have pulled apart what you did not have to rebuild afterward.”

> “You will do no more damage to my Colony.”

### Serevan's Last Secret

He does not need to repent.

Placeholder:

> “I knew her name.”

> “I thought knowing why she chose was the same as knowing why everyone after her must choose.”

> “Her name was Aletheia.”

### Aletheia After Naming

She should speak as a person, not an oracle.

Placeholder:

> “I chose once.”

> “They chose after me.”

> “The weight is still here.”

> “You know what it is now.”

> “What happens to it next is not mine to decide for you.”

---

## Remaining Work

The encounter's design is structurally complete.

Remaining work is table preparation and refinement:

- numerical balance adjustment through play;
- exact battlemap / template dimensions;
- physical prop production;
- exact Memory Cascade images;
- final dialogue / performance writing;
- exact choice of any additional named Dawn loyalists if play supplies them;
- backfill any historical Keeper details that later story development makes useful.

No additional final-boss phase or mechanical subsystem is currently missing.
The Serevan-unavailable fallback protects against a narrative softlock; it is not a new assertion about who else the Book recognizes as a Keeper.
:::
