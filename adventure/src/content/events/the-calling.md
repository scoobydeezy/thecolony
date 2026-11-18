---
# yaml-language-server: $schema=../../../schemas/event.schema.json
id: event.the-calling
slug: the-calling
name: The Calling
summary: The Party investigates why Aspis has been investing resources into a Colony in the middle of nowhere.
function: Invert Expectations
synopsis: The Aspis Administrator walks the Party through debts without debtors, homes without remembered owners, and recurring accounting discontinuities he cannot explain. Before he can follow the pattern to its next lead, bells and commotion outside announce that a new Keeper has just been recognized. The House of Abiding is nearby, and the Administrator—approaching his first Reading—is as curious as the Party.
part: part.act-1
chapter: arrival-and-the-first-incursion
order: 1
leadsTo:
  - to: event.the-house-of-abiding
    thread: thread.the-keeper
  - to: event.the-morning-after
    thread: thread.pepe-sylvya
links:
  - npc.perrik-tallow
  - asset.clearing-house
  - asset.claims-registry
  - npc.pepe-sylvya
  - npc.vara-cairn
  - npc.uldren-harthwright
  - location.house-of-abiding
status: draft
readiness:
  status: compiled
provenance:
  - doc: Campaign Outline
    heading: Session 1 — The Calling
  - doc: Character Briefs
    heading: Aspis Administrator - Perrik Tallow
---

:::design
**First draft, 2026-11-18 (narrative scene, template 3.2).** From :cite[Campaign Outline — Session 1]{doc=campaign-outline anchor=session-1--the-calling}, :cite[Character Briefs — Perrik Tallow]{doc=character-briefs anchor=aspis-administrator---perrik-tallow}, :cite[Foundational Truths — The Ritual]{doc=the-colony--foundational-truths anchor=the-ritual} and :cite[Traditions and Empty Spaces]{doc=the-colony--foundational-truths anchor=traditions-and-empty-spaces}. Vara's meeting and Trust 1 moved to :ref[The House of Abiding]{#event.the-house-of-abiding} (one fact, one place).

**Rulings (user, 2026-11-18):**
1. **The arrival:** Darkwing comes under a **UFO mission order**, as the Synopsis says. What the order is will be expanded later.
2. **Perrik's timeline:** he has been in the Colony **less than eighteen months**, arriving between Marek Cairn's Reading and Vara's Calling. So the eclipse gaps he shows are in the Registry's historical records, and this Calling is the first he has seen.
3. **No Lord-Mayor line:** tying the unrecognised signatures to the forgotten Lord-Mayor was too on the nose. The contracts stay anonymous.

**Applied from canon, for review:** the Calling is announced with the Colony's bells, the **resting stroke** left unfilled (the bells are in the Outline; the resting stroke is a canon tradition). The Clearing House is in the Keeper District, and the House of Abiding in Abiding Way, the next district over.
:::

:::gm-note
This scene introduces the Colony, overturns the Party's expectations of Aspis, and points Perrik's impossible-records investigation straight at the moment Vara is Called. It ends the moment the bells ring: the Party should leave curious about the Keeper, not yet understanding what a Keeper is.

**Faction spotlight:** Aspis Consortium. **Question entering:** *Why is Aspis investing so heavily in this apparently ordinary frontier Colony?*
:::

## Opening State

Darkwing arrives in the Colony under a **UFO mission order**. Its initial intelligence points at Aspis influence, suspicious disappearances, cult activity, and an unusually secretive Keeper order.

Its first appointment is at the :ref[Clearing House]{#location.clearing-house}, the Aspis offices that reconcile the Colony's debts. The Party expects what outsiders expect of Aspis: leverage, a contract with a hook in it, a man who wants something.

It finds :ref[Perrik Tallow]{#npc.perrik-tallow}, the Consortium's senior representative, who greets the Party with overwhelming relief. He has been here less than a year and a half himself, long enough to inherit the Registry and to find that it doesn't add up. At last, someone from outside might look at his evidence without already having decided which parts are impossible.

It is an ordinary working day. Outside, the city is going about its business; nothing yet suggests a celebration.

:::read-aloud
The Clearing House smells of ink, candle-smoke and paper left too long in the sun. Every surface holds ledgers: open, stacked, wedged under the legs of a table to level it. String runs from pin to pin across one wall, red and blue and an alarming quantity of green, connecting scraps of paper to other scraps of paper. Two clerks step around a pile on the floor with the care of people who have learned what happens when it is moved.

A small goblin in an ink-stained coat surfaces from behind the largest stack. He has clearly not slept. He looks at you the way a drowning man looks at a rope.

"Oh, *thank* the gods. Outsiders. Sit — no, not there, that's Lower Bank — sit anywhere. I need you to look at something before anyone tells you it's nothing."
:::

## The Scene: Accounting That Cannot Be Reconciled

Perrik walks the Party through records that cannot be reconciled. He talks too fast, interrupts himself, and produces each piece of evidence from a pile that seems unrelated to the last. **The comedy is in the presentation, never in incompetence:** every pile has a reason, and every reason holds.

He has spent years trying to prove that the errors are connected. He is right. He is simply terrible at explaining why.

**What he shows, in whatever order he grabs it:**

| The record | What it is | What Perrik says |
|---|---|---|
| Debts without debtors | Loans on the books, money plainly borrowed and spent, owed by no one anyone can name | "Somebody borrowed it. Somebody spent it. *Nobody owes it.* That isn't fraud. Fraud has a *beneficiary*." |
| Houses without remembered owners | Properties still taxed and kept up, whose owners no one can name | "Who orders the firewood? Somebody orders the firewood." |
| Unsupported dependents | Children and elders on household rolls with no one recorded as providing for them, though somebody plainly once did | "They're fed. Nobody remembers agreeing to feed them." |
| Signatures no one recognizes | Contracts signed in a confident hand by a party no one can identify. Both sides honoured them for years | "Somebody agreed to this. Everybody kept to it. *Who?*" |
| Discontinuities around the eclipses | The Registry's older records, reconciled back across generations: gaps that open around past eclipses, at irregular intervals | "I know the numbers are wrong. The problem is that they are wrong *consistently*." |

:::gm-note
Let the players reach the connection first if they can: the gaps line up with the eclipses, and the eclipses line up with something the Colony celebrates. Perrik knows the Colony forgets, and that its forgetting breaks the systems he keeps; he wants to know where people, property and responsibility go when identity disappears. He has documented the shape of the problem without solving it. He can map where every consequence went without understanding what those consequences mean.

He is honest and generous: he will share any record, lend clerks, and offer the Party the run of the Clearing House. He wants a second pair of eyes, not a hired hand.
:::

## Clues and Revelations

- **The pattern is real.** The discontinuities recur around past eclipses, at irregular intervals: sometimes six months apart, sometimes eighteen, occasionally years. The records show only absences; none names who is missing.
- **The Colony smooths over absence.** If the Party asks about the empty chair at every table, the second portion at every meal, or why an ownerless object is said to be "in passage", the clerks answer cheerfully: hospitality, generosity, manners. Each is a custom that makes an absence look intentional (Part II: Everyday Life and Traditions).

## Player Choices

The Party decides how seriously to take Perrik, and whether to accept his help. He offers it either way.

## A New Keeper

Before the inquiry can reach its next conclusion, the city's bells begin to ring.

:::read-aloud
Somewhere across the river a bell starts, and then another, and then all of them: a slow, joyful peal that rolls over the rooftops. In the street below, a door bangs open; someone is laughing; someone else is calling a name you don't catch. The bells carry their pattern to the end of the measure, and then, where the last stroke should fall, they all stop together, and the silence holds for exactly one beat before they begin again.

Perrik has gone very still, a ledger half-closed in his hands.

"That's a Calling," he says. "They've found the new Keeper." He looks, for the first time, like a man who has stopped calculating. "I've never seen one. Not from the start." Then, recovering: "The House of Abiding. It's just over in Abiding Way. Shall we?"
:::

:::gm-note
The Colony is celebrating: a Calling is a sacred honour, and the city will tell the Party so with real joy. Perrik is approaching his first Reading and is almost as curious as the Party. Let the scene end in motion, the crowd drawing everyone toward the House of Abiding.
:::

## Outcomes

:::secret
**The answer to this scene's question:** Aspis is not causing the mystery. It is documenting absences no one else has treated as a systems problem.
:::

## Possible Next Developments

- **The House of Abiding**, where the new Keeper is being moved in: the usual next step, and the crowd is heading there.
- **Perrik's records** stay open as a lead. If the Reading succeeds, The Morning After is when fresh discontinuities appear in records Perrik personally understood the day before.
