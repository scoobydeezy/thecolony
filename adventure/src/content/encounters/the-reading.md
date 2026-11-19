---
id: encounter.the-reading
slug: the-reading
name: The Reading
summary: Vara enters the Ritual Chamber and begins reading the Book of Names.
function: Act I Climax
synopsis: >-
  The eclipse advances with the Reading. The Party must decide whether to interrupt a willing sacrifice or allow the
  inherited system to work. If stopped, Vara survives and the eclipse recoils; if completed, Vara is forgotten and the
  Party becomes shaped by a relationship it no longer consciously remembers.
part: part.act-1
chapter: act-i-climax
order: 2
leadsTo:
  - to: event.the-morning-after
    thread: thread.the-reading
links:
  - npc.vara-cairn
  - npc.uldren-harthwright
  - npc.kelda-varruk
  - npc.serevan-ilvar
  - asset.book-of-names
  - asset.ritual-chamber
  - rule.book.keeper-bound-handling
  - source.book-of-names
  - creature.kelda-varruk
  - location.ritual-chamber
status: draft
readiness:
  status: compiled
inventory:
  - id: inventory.book-of-names-prop
    note: The countdown. Turn one page per Read a Name-Page.
provenance:
  - doc: Campaign Outline
    heading: Session 4 — Eclipse
  - doc: Encounters
    heading: 5. The Reading — Ritual Chamber
---

:::design
Representative section for the vertical slice, compiled from :cite[Encounters §5]{doc=encounters anchor=5-the-reading--ritual-chamber} and the Vara Trust, Appeal and Book Clock material in :cite[Creatures]{doc=creatures anchor=vara-trust-and-appeal}. Kelda's Tactical Priority and nonlethal default moved here from her stat block (ruling 2026-11-17). Not yet written as finished prose.
:::

:::gm-note
The Reading is the climax of Act I's relationship with :ref[Vara]{#npc.vara-cairn}. The Order's resistance matters, but defeating Serevan or Kelda is not the objective. The question is:

> **Can the Party give Vara a reason to trust its judgment strongly enough to reconsider the Reading before the Book ends?**

The Order does not need to defeat the Party. It needs the Reading to finish.
:::

## The Ritual Chamber

The :ref[Ritual Chamber]{#location.ritual-chamber} lies directly beneath the Monument of the First Keeper, reached through the Memorial Building and down a spiral stair.

A long nave opens into a cross-shaped sanctuary. Rows of pews create lanes and cover. A circular dais stands beneath a domed ceiling at the far end, with the Book at its centre. The Order's symbol is inlaid at enormous scale into the floor around the dais and repeated on the underside of the dome. Small apertures matching the symbol's rays admit shafts of daylight from the Monument above; as the eclipse deepens, the pattern of light visibly shifts around Vara.

:::secret
A sealed wall behind the dais conceals the passage that eventually leads toward Crescent Island.
:::

The room's tactical grammar:

- **Main aisle:** the fastest path to Vara, and the line Kelda prefers to hold.
- **Pews and side aisles:** slower approaches with cover.
- **Cross arms:** room for guards, flanking, and Serevan's control position.
- **Dais:** Vara, Uldren, the Book, and the ritual's fixed Keeper position.

:::design
Open design: final visual dressing and exact opening placements can still move during map production. The topology must stay: the Party approaches from the nave; Kelda makes the direct route costly; side aisles and pews give alternate access; Serevan works behind the front line; Uldren stays close to Vara; the Book and dais remain the focus.
:::

## Opening State

If the Reading has begun:

- **Vara** stands before the Book on the dais and intends to complete the ritual.
- :ref[Serevan]{#npc.serevan-ilvar} stays near the ritual space, preserving procedure and directing the defenders.
- :ref[Kelda]{#npc.kelda-varruk} controls the most direct approach.
- :ref[Uldren]{#npc.uldren-harthwright} stays near Vara and supports the choice she is currently making.
- **Two Order Chamber Guards** cover the secondary approaches.
- The Party enters from the nave and spiral-stair side of the room.

## Before Initiative: Trust and the Appeal DC

Resolve the relationship history from earlier in Act I before rolling initiative.

**Vara Trust (0–3)** is earned through three choices. Add 1 for each that happened:

1. The Party allowed Vara to accompany the first investigation after meeting her.
2. The Party recognized that her unexplained compass might matter, and deliberately kept her confidence when Serevan asked about suspicious objects.
3. The Party again allowed Vara to accompany the Session 3 investigation after the danger was known.

If the Party refused Vara's first request to accompany them, **Trust is locked at 0** for this encounter.

**Agency Stance** comes from Darkwing's Dawn conversation while Vara was absent:

- **Agency-supportive:** −2 to the Appeal DC.
- **Unresolved or procedural:** no modifier.
- **Agency-denying:** +2 to the Appeal DC.

> **Appeal DC = 40 − (2 × Trust) + Agency Stance**

| Trust | Supportive | Neutral | Denying |
|---:|---:|---:|---:|
| 0 | 38 | 40 | 42 |
| 1 | 36 | 38 | 40 |
| 2 | 34 | 36 | 38 |
| 3 | **32** | 34 | 36 |

## Vara's Resolve

> **Starting Resolve = max(2, ⌈P ÷ 2⌉)**, where P is the number of participating PCs.

At a six-PC table Vara begins at **Resolve 3**. Resolve can never exceed its starting value.

Each point of Resolve is a distinct reason Vara believes she must continue, not generic stubbornness. Prepare one reason per point. First-pass reasons:

- **Responsibility:** if she stops, the Colony may be endangered.
- **Commitment:** she understood enough to knowingly undertake the Reading.
- **Burden:** refusing does not make the accumulated Weight disappear; someone must face the consequence.

When Resolve drops, narrate which reason the argument has shaken.

## The Book Clock

::clock[Book of Names: ritual pages]{segments=12 note="Vara normally reads three pages a round, about four rounds in all. She can never advance more than four pages between the start of one of her turns and the start of her next."}

Use the physical :ref[Book of Names prop]{#inventory.book-of-names-prop}. Each time Vara successfully reads a Name-Page, turn one page. Pages already read never come back.

The twelfth page ends the inherited names and holds the space where Vara writes **Varenya Cairn**. Completing it ends the Reading immediately.

The four-page ceiling exists mainly for the free page a critically failed Appeal can cause.

## Handling the Book

The Book is fixed at the lectern during this encounter.

::embed{#rule.book.keeper-bound-handling}

Short of handling the Book, Darkwing can still interfere with the Reading by:

- obscuring the visible page without touching or manipulating the Book;
- blocking Vara's physical or visual access;
- occupying the ritual approach;
- applying ordinary conditions that interrupt her reading, speech, actions, or manipulate actions;
- recruiting a creature the Book recognizes to handle or close it, if the fiction genuinely supports that choice.

If Vara still intends to continue once access is restored, she resumes from the current page.

## Keeper's Ward

Once Vara begins the Reading, mnemonic pressure fixes her to the Keeper's ritual position. The Ward doesn't make her invulnerable; it exists so that nobody else decides where the Keeper stands. While she willingly continues:

- she cannot be forcibly moved, teleported, or carried without her consent;
- the Order cannot drag her back if she chooses to leave;
- Darkwing cannot solve the encounter by teleporting her out.

She can still be grabbed, restrained, silenced, blinded, stunned, knocked unconscious, or otherwise kept from reading. If she voluntarily stops or leaves the ritual position, the Ward ends at once.

## Appeal to Vara ◆◆

**Auditory, Concentrate, Emotion, Linguistic, Mental**

**Frequency** normally once per character during this encounter. A materially new revelation may allow another attempt, at the GM's discretion.

The character makes a meaningful argument directly to Vara: a **Diplomacy** check against the Appeal DC. Concrete, relevant evidence that genuinely strengthens the argument grants a +1 or +2 circumstance bonus.

- **Critical Success** Reduce Vara's Resolve by 2.
- **Success** Reduce Vara's Resolve by 1.
- **Failure** No change.
- **Critical Failure** No change to Resolve. If Vara has read fewer than four pages since the start of her current round, she immediately reads a Name-Page as a free action.

When Resolve reaches 0, Vara chooses to stop the Reading.

## Player Leverage

The Party can attack the encounter three ways at once:

- **Relationship:** spend actions appealing to Vara to reduce her Resolve.
- **Clock:** interrupt individual Reading actions to buy pages and rounds.
- **Formation:** break enough of the Order's control that the first two become possible.

> Attack Kelda, interrupt Vara, interfere with the Book, or spend two actions trying to reach her?

## The Order's Tactics

- **Serevan protects procedure.** He cannot be persuaded to let the Reading stop. He spends his actions restoring ritual access and redirecting defenders.
- **Kelda protects space.** She holds the main aisle and pushes intruders away from the dais. She controls the shortest route between Darkwing and the dais, and won't abandon that line to chase isolated enemies unless she must to stop an immediate interruption. She uses nonlethal attacks freely whenever doing so does not materially endanger the Reading.
- **Uldren protects Vara's choice.** While she chooses to read, he helps her continue. The instant she chooses to stop, he changes sides without a check.
- **The guards** protect the secondary approaches. They exist to cost the Party movement and actions, not to act as minibosses.

::embed{#creature.kelda-varruk}

## Resolution

:::branch[Vara chooses to stop]{when=path.the-reading-is-stopped}
When Resolve reaches 0, Vara voluntarily ends the Reading.

- Keeper's Ward ends, and the Book clock stops permanently.
- Uldren immediately supports Vara and anyone defending her choice.
- Serevan does not accept that the Reading can simply be abandoned, so the confrontation may continue as a fight to protect Vara and control the chamber.

This is the strongest branch for Vara's agency.
:::

:::branch[The Party stops the Reading against Vara's choice]{when=path.the-reading-is-stopped}
The Party can still prevent completion through sustained restraint, unconsciousness, ritual denial, or another successful tactic. Record it separately:

> **Reading stopped; Vara did not choose to stop.**

Vara survives, but the campaign does not pretend the Party preserved her agency merely because it preserved her life.
:::

::::branch{when=path.the-reading-succeeds}
When Vara completes the final page and writes **Varenya Cairn**, the ritual succeeds immediately and the eclipse releases.

:::secret
Vara is forgotten by the Colony and by the Party's characters. The players remember her.
:::
::::

## Supporting Combat Profiles

- :ref[Vara at the Reading]{#creature.vara-reading}
- :ref[Serevan at the Reading]{#creature.serevan-reading}
- :ref[Uldren at the Reading]{#creature.uldren-reading}
- :ref[Order Chamber Guard]{#creature.order-chamber-guard} (two)

The chapter owns Trust, Appeal, and the Book clock. These profiles own individual actions and reactions. Keep any successfully completed pages when the rite is interrupted; do not restart the clock to prolong the encounter.
