---
# yaml-language-server: $schema=../../../schemas/event.schema.json
id: event.the-house-of-abiding
slug: the-house-of-abiding
name: The House of Abiding
summary: The Party meets Vara while she moves into the House of Abiding.
function: Introduce The Keeper
synopsis: Vara is being moved into the House of Abiding under Uldren's care. She is delighted by her own room, fascinated by the Party's travels, and much more interested in their maps than in explaining what a Keeper is. She notices that an official map of the neighboring slums is badly outdated and asks to come with the Party when they go to check it against the people and places actually there; Uldren has reasonable objections.
part: part.act-1
chapter: arrival-and-the-first-incursion
order: 2
leadsTo:
  - to: encounter.bad-maps
    thread: thread.bad-maps
  - to: encounter.bad-maps
    thread: thread.the-keeper
links:
  - npc.vara-cairn
  - asset.house-of-abiding
  - npc.uldren-harthwright
status: draft
readiness:
  status: compiled
provenance:
  - doc: Campaign Outline
    heading: Session 1 — The Calling
---

:::design
**First draft, 2026-11-18 (narrative scene, template 3.2).** From :cite[Campaign Outline — Session 1]{doc=campaign-outline anchor=session-1--the-calling} (Vara, the map, Trust 1), :cite[Campaign Outline — Vara Trust Spine]{doc=campaign-outline anchor=vara-trust-spine}, and the briefs for :cite[Vara]{doc=character-briefs anchor=the-keeper---varenya-vara-cairn} and :cite[Uldren]{doc=character-briefs anchor=steward-of-the-house-of-abiding---uldren-harthwright}.

**For review: not in the sources, added in this draft.**
1. **What Vara has noticed.** Her Calling symptoms are applied from :cite[The Ritual]{doc=the-colony--foundational-truths anchor=the-ritual}: dreams of unfamiliar lives, recognising places she has never been. She describes them as exciting, not frightening.
2. **The map** (ruling, user, 2026-11-18): the slums are in **Abiding Way**, the same district as the House of Abiding. The bad map is of the streets right outside.
:::

:::gm-note
This scene introduces Vara as a person before she is a symbol. The Party should leave liking her, and having made the act's first real choice about her: whether she comes with them.

**Trust 1 (Inclusion) happens here.** See the Act I overview for the whole Trust spine.
:::

## Opening State

The bells are still ringing when the Party reaches the :ref[House of Abiding]{#location.house-of-abiding}. A crowd fills the street, cheerful and loud; neighbours have brought flowers, bread and ribbons. Inside, the new Keeper is being moved into the rooms that will be hers until the Reading.

She is fifteen, and she is not where she is supposed to be.

:::read-aloud
The House of Abiding is quieter than the street, all polished wood and patient light. Somewhere above, furniture is being moved with great care. A tall, grey-haired man in an immaculate coat is directing it, a satchel over one shoulder and a list in his hand, and he is very obviously looking for someone.

The someone is sitting on the stairs below him, out of his line of sight, with a stack of folded maps in her lap. She looks up at you, takes in the dust on your boots and the weapons on your belts, and her whole face lights up.

"You're not from here," she says. "Where have you *been*?"
:::

## Who Is Here

- :ref[Vara Cairn]{#npc.vara-cairn}, the newly Called Keeper, an apparent orphan: curious, meddlesome, socially fearless, and more interested in the Party's travels than in explaining what a Keeper is.
- :ref[Uldren Harthwright]{#npc.uldren-harthwright}, Steward of the House: patient, capable, impossible to fluster. Vara calls him **Hats**, because he wears all of them. He objects to the nickname, and answers to it immediately.
- Well-wishers, Order functionaries and Witness attendants coming and going. The House stands in :ref[Abiding Way]{#location.abiding-way}, the district the Witnesses maintain; its slums begin a few streets away.

## The Scene

**Vara wants to talk about everything except being the Keeper.** She asks where the Party has travelled, what the roads are like, whether the maps they carry are any good. She gives nicknames to people she likes. She dislikes being discussed while she is standing in the room, and says so.

If asked about the Calling, she is honest and slightly thrilled: she has been dreaming lives that are not hers, and walking into places she has never seen and knowing where the stairs are. Everyone tells her it is a wonderful honour. Nobody has explained what happens next very clearly.

:::gm-note
Let the Party meet her before the title of Keeper consumes her. She is drawn to them because they speak to her without already knowing what she is supposed to become. Her trust depends less on whether they agree with her than on whether they tell her the truth and let her act on it.

Play Uldren as a courteous obstacle who controls access to Vara and notices everything around her. He is not hostile; he is responsible.
:::

## The Bad Map

Vara collects inaccurate, outdated and contradictory maps; she believes a bad map still shows what its maker noticed, assumed or needed. Among her papers is the **official map of the slums of Abiding Way**, the streets just beyond the House's doors, and it is badly wrong: streets that aren't there, buildings missing, a well marked where she is sure there is a bakery.

She wants to check it against the people and places actually there. Today.

## Player Choices: Come With You

Vara asks the new adventurers, directly, whether she can go with them.

:::read-aloud
"You're going out there anyway," she says. "You have that look. Take me with you. Somebody has to check which bits of this are wrong, and I'm *going* to be very important soon, so I should probably see the city first." She glances up the stairs. "Hats will say no. He'll come round."
:::

Uldren has reasonable objections: Vara has just been Called, the Order is reorganising her life around an unknown danger, and the Party are strangers.

:::gm-note
**Uldren does not argue for long.** If the Party is willing and Vara is set on it, he asks for ten minutes, and comes back with food, medicine, authorisations and several contingency plans. *"I cannot prevent her from going without treating her as a prisoner. Therefore, I am going with her."*

The decision belongs to the Party, and it should feel like one. Don't steer it.
:::

## Outcomes

:::branch[The Party says yes]
Vara and Uldren accompany the Party into the slums, and **Trust 1 (Inclusion)** is earned: her Trust spine stays open. Vara leads, map in hand, correcting it as she goes.
:::

:::branch[The Party says no]
Vara does not come. Bad Maps still happens, without her. Her direct **Trust is locked at 0 for the rest of Act I**: later kindness or rescue can matter to her emotionally, but she will not stake the Colony on Darkwing's judgment. If the refusal is "for her own protection", she does not hide that it stings: nothing angers her faster.
:::

:::gm-note
Record which way it went: it is the first of the three choices that set Vara's Trust before :ref[The Reading]{#encounter.the-reading}.
:::

## Possible Next Developments

- **Bad Maps:** the excursion into the slums, with Vara or without her. Either way, the bad map leads there.
- **The question this leaves:** *Why does the Colony need Vara, and what happens to a Keeper?*

:::gm-note
**What must change in this first session:** Vara becomes either a person the Party has begun treating as a participant, or a Keeper it has already begun protecting from her own involvement.
:::
