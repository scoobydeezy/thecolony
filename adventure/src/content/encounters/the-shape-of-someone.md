---
id: encounter.the-shape-of-someone
slug: the-shape-of-someone
name: The Shape of Someone
summary: The Face gives accumulated projection a visible shape, but not a truthful one.
function: "Identity: Form"
synopsis: >-
  The Party participates in the Cult's ritual by selecting artworks from its archive and describing what each image
  reveals. Their interpretations supply Forms to the Face of the Unknown, which has become a Source through generations
  of accumulated projections. A Composite manifestation assembles itself from those interpretations, taking Forms from
  stations around the battlefield. Darkwing contests the stations, removes Form Totems, and suppresses the Face's Ward
  by controlling two stations at once. Returning a Totem to the Face and relinquishing the assumption that it describes
  an external being permanently Releases that Form. After three Releases, the remaining projected Forms collapse. The
  Formless Shape reveals that the underlying Weight belongs to generations of people imagining the Unknown, not to a
  hidden person. Darkwing guides that Weight back into the Face; the Source becomes a truthful Anchor, and Maelyn can
  entrust it to Darkwing as a reusable Form Keystone. Exceptional early recognition can prevent the hostile Composite
  from forming.
part: part.act-2
chapter: the-manor-routes
order: 4
event: event.the-thin-place
leadsTo:
  - to: encounter.the-burden
    thread: thread.the-face-of-the-unknown
  - to: encounter.the-open-door
    thread: thread.the-face-of-the-unknown
links:
  - npc.maelyn
  - asset.pilgrim-s-rest
  - asset.face-of-the-unknown
status: draft
provenance:
  - doc: Campaign Outline
    heading: Manor Route 2 — Cult of the Unknown
  - doc: Encounters
    heading: 7. The Shape of Someone — Cult Route
  - doc: Encounters
    heading: 7. The Shape of Someone — Cult Route
readiness:
  status: compiled
---

## At the Table

**Objective:** relinquish projections, then receive the Weight they actually created. **Board:** six selected art stations and Totems, central Face, PC Capture Strength, and active Form Claims. **Threshold:** three Releases flip all projections; the second phase is guided return, not another kill phase.

## Reference at the Table

Use :ref[the Shape and twelve Form packages]{#creature.shape-of-someone} and :ref[the Face’s Source profile]{#source.face-of-the-unknown}.

### Narrative Container
Pilgrim's Rest surrounds the smooth **Face of the Unknown** with generations of mutually contradictory devotional art. The Cult sincerely believes the Unknown possesses many Forms and that each witness receives only one partial truth.

The Face began as a mundane contemplative mask. Generations of repeated ritual attention gradually supplied mnemonic Weight to it until the mask itself became a Source. It now carries the accumulated memory of being imagined: hopes, fears, desires, expectations, and projected Forms repeatedly directed toward the same blank vessel.

Darkwing is invited to perform the Cult's rite.

The central inversion is deliberate:

> **In most Veiled encounters, player authorship helps resolve the Incursion. In this encounter, player authorship creates it.**

### Opening State
- The **Face of the Unknown** occupies the central zone and is the active Source.
- Six or more small artworks / illustrated cards are available as ritual prompts.
- Each participating PC selects one image and answers a prompt such as **“What stands out to you?”** or **“What does this Form reveal?”**
- Each selected interpretation becomes one **Form Station** around the battlefield and one physical **Form Totem** associated with that station.
- The Cult believes these are partial revelations of one external being.
- The Shape initially manifests as a **Composite / Form Resonance** assembled from the Party's projections.
- Each PC begins with **Capture Strength 1**.
- The Shape's Capture Strength is **ceil(P / 2)**, where P is the number of participating PCs.

The exact PF2e statistics, Form packages, card-specific abilities, and Source numbers belong in *the mechanical reference entries linked on this page*.

### Battlefield Grammar
The encounter is deliberately reducible to visible raid state.

**Outer Form Stations**
- Each selected projection has one outer zone and one matching Totem.
- A station with its Totem present is **Available**.
- A Totem being carried is **Carried**.
- A successfully relinquished Totem is **Released** and cannot return.

**Capture Strength**
- A PC contributes their current Capture Strength while physically inside an outer zone.
- A PC starts at **1**.
- After that PC successfully Releases a Form at the Face, their Capture Strength permanently becomes **2** for the rest of the encounter.
- An outer zone without the Shape present is controlled by Darkwing when PCs inside it have combined Capture Strength **2 or greater**.
- If the Shape is present, Darkwing must equal or exceed the Shape's Capture Strength to prevent it from controlling that zone.

No per-round attunement or individual control timer is tracked. Position plus current Capture Strength is the state.

### The Face's Mnemonic Ward
The central Source begins inside a mnemonic Ward that functions as the encounter's raid gate.

While Darkwing controls fewer than **two outer Form Stations simultaneously**:
- the central Face zone is effectively inaccessible;
- attacking the mask accomplishes nothing useful;
- entering or directly interacting with the Warded zone triggers the Face's mnemonic Backlash / rejection effect according to the creature implementation.

While Darkwing simultaneously controls **two or more outer Stations**:
- the central Ward is **suppressed**;
- the Face zone becomes safely accessible;
- a carried Form Totem can be brought to the Source and Released.

The Ward therefore has a simple visible condition:

> **Hold two hills → the center opens.**

### Phase One — The Shape of Someone
The Shape moves between outer Stations and attempts to acquire the Forms Darkwing projected into the rite.

When the Shape controls an Available Station, it can **Assume** that Station's Form. Place the corresponding Form token or physical marker on the creature. The Shape has a limited number of active Form slots; exact capacity and abilities belong in *the mechanical reference entries linked on this page*.

The feature should visibly match the player's earlier interpretation.

A player who said the wings meant freedom sees literal wings appear.
A player who focused on antlers sees horns become a charge weapon.
A player who read open arms as protection sees the Composite gain a protective ability.

This correspondence is the encounter's core evidence.

### Player Leverage — Take the Form
When Darkwing controls an Available outer Station, a PC there can take its physical Totem.

Once the Totem leaves the Station:
- that Station no longer supplies its Form;
- the Shape immediately loses that Form if currently expressed;
- the Form cannot be reacquired unless the Totem returns to the Station;
- the Totem itself becomes the raid objective the carrier must bring to the center.

Taking a Form is **not** Restoration.

It interrupts the projection.

### Boss Counterplay
The Shape's priorities are visible and objective-driven rather than arbitrary:

1. Stop a Totem carrier approaching an open Face.
2. Break control of one of the two Stations suppressing the Ward.
3. Recover a dropped Totem and return it to its Station.
4. Capture an Available Station whose Form improves its current configuration.
5. Attack convenient threats when no raid objective is more urgent.

This should make the encounter read like a raid rather than an ordinary damage race.

### Release the Form
A carried Totem can be Released only at the central Face while its Ward is suppressed.

The carrier physically returns the projection to the Source and consciously relinquishes the claim that this interpretation describes an external Someone.

The player states the distinction in their own words, for example:

> **“The wings were something I saw.”**

> **“We decided those hands meant protection.”**

> **“That meaning came from us.”**

> **“I don't know what you are.”**

The exact PF2e action cost belongs in *the mechanical reference entries linked on this page*, but once the raid conditions are satisfied the Release should not require a redundant final truth-check roll. Reaching the Source with the Totem while maintaining the battlefield condition is the practical task that earns the Restoration.

On a successful Release:
- the Totem becomes permanently **Released**;
- its Form can never return during this encounter;
- the releasing PC's Capture Strength becomes **2**.

The encounter therefore becomes progressively easier to coordinate as Darkwing understands it. Players who have relinquished projection become better at holding the ritual topology without being defined by it.

### Revelation
The required insight should emerge during play rather than be taught by Cult doctrine.

Darkwing can observe:
- features appearing only after they were described or emphasized;
- the Shape gaining exactly the qualities associated with specific artworks;
- removing a Totem removing the corresponding Form;
- no stable underlying appearance remaining as projections are withdrawn.

The discovery is:

> **The artwork is not depicting the creature. The artwork is building it.**

The Cult initially interprets every change as the Unknown revealing another authentic aspect of itself. They do not possess the answer in advance.

### Phase Transition — Three Releases
After **three Forms have been Released**, the Party has established enough truthful Form information that reality can no longer defend the assumption that any of the six ritual projections intrinsically belongs to one external being.

The result should be dramatically physical:

- flip **all six** projection cards / artworks to their blank reverse sides;
- remove every remaining Form Totem from the outer Stations;
- remove every active Form token from the Shape;
- the Composite loses its asserted anatomy and becomes the **Formless Shape**.

This is a real phase transition but a fake-out as a second conventional boss phase.

Darkwing appears to have uncovered the monster's “true form.”

They have actually proven there was no hidden true creature underneath the projections.

### Phase Two — The Formless Shape
The Formless Shape represents the accumulated Weight that remains after the false referent has been removed.

It is not a Forgotten person.

It is thousands of genuine acts of human reaching stripped of the claim that they describe one Someone.

> **The projections were false. The projecting was real.**

The Formless Shape should have no normal tactical identity built from the previous Forms. Its phase-two behavior is deterministic and follows Recognition rather than intent.

It moves toward the **strongest concentration of Capture Strength** available to it. Exact movement, tie-breaking, and Backlash implementation belong in *the mechanical reference entries linked on this page*, but the table-facing rule should remain predictable enough that Darkwing can deliberately lure it.

Capture Strength therefore changes meaning without changing rules:

- Phase One: it lets Darkwing contest the Shape's projected Forms.
- Phase Two: it represents how strongly the remaining Weight recognizes and follows Darkwing's attention.

### Returning the Weight
The six outer Stations remain as **blank zones** after the cards flip.

Darkwing must again control at least **two** of them to suppress the Face's Ward.

While those zones are held, the rest of the Party uses its Capture Strength and positioning to draw the Formless Shape into the central Face zone.

Once:
- two blank outer zones are controlled;
- the Face's Ward is suppressed;
- the Formless Shape has been guided into the central zone;

Darkwing can complete the encounter by **Receiving the Unknown**: recognizing that the Weight belongs to generations of people imagining, hoping, fearing, and reaching toward the unknown rather than to one external being supposedly revealed by those projections.

The Weight returns to the Face.

No separate “kill phase” is required.

### Resolution — Source Becomes Anchor
The Face remains the correct vessel.

What changes is its meaning.

Before the encounter:

> **These accumulated Forms are evidence of an external Unknown.**

Afterward:

> **These accumulated Forms are evidence of generations of people imagining and reaching toward the unknown.**

The same object that produced the Incursion can therefore become the truthful **Anchor** for its own stabilized Weight.

Maelyn can entrust the Face to Darkwing as the campaign's reusable Form Keystone.

### Benign / No-Fight Mastery Path
The full raid is the expected and desired path, not a punishment for failing a ritual roll.

However, the opening ritual should expose enough causal information that exceptional play can solve the governing truth before initiative.

Critical observations or unusually strong checks may reveal that a feature appears **after** a participant describes it rather than before.

If Darkwing independently infers that their interpretations are supplying Form and begins relinquishing those projections before the singular Composite coheres, each successfully released projection can begin the encounter already resolved, with that PC already at Capture Strength 2.

If enough projections are relinquished before coherence—normally the same threshold of three—the full Shape never forms. The rite instead produces a benign, unstable manifestation that never mistakes the Party's Forms for one singular person.

This is a mastery reward, not a hidden “correct” pre-combat sequence.

### Systems Established
**Form, Composite reconstruction, Form Resonance, projection as battlefield state, Capture Strength, Source Ward as raid gate, Source → Anchor, supplied mnemonic Weight, Incursions without a singular Forgotten person beneath them, player authorship as both danger and Restoration.**

The exact Face Source block, Shape statistics, Form-slot abilities, card packages, Capture actions, dropped-Totem handling, Formless movement algorithm, and phase-two Backlash belong in *the mechanical reference entries linked on this page*.

## Station and Totem Procedures

## Encounter Board State

Place the **Face of the Unknown** in a central zone and six selected **Form Stations** around the battlefield. Each Form Station is represented by one artwork card and one matching **Form Totem**.

Each selected artwork has one fixed **Representation** and two mechanical **Claims** from different Claim families. The player's interpretation during the ritual does **not** remove either Claim. Instead, it marks one of the two as **Resonant**: the meaning that participant supplied most strongly to the representation.

If the player's interpretation clearly supports one Claim, mark that Claim Resonant. If either interpretation fits equally well, choose the option that improves encounter balance and mechanical variety.

Only the six selected artwork cards participate in a given encounter, even though twelve are available in the gallery.

### Capture Strength

Let **P** equal the number of participating PCs.

**The Shape's Capture Strength:** `ceil(P / 2)`.

Each PC begins with **Capture Strength 1**. A PC who successfully **Releases a Form** at the Face permanently increases to **Capture Strength 2** for the remainder of the encounter.

For the usual six-player table:

* The Shape has **Capture Strength 3**.
* Each PC begins at **Capture Strength 1**.
* An outer Form Station without the Shape present is controlled by Darkwing when PCs inside it have a combined **Capture Strength of at least 2**.
* If the Shape is inside the Station, Darkwing must have combined Capture Strength **equal to or greater than the Shape's Capture Strength** to contest it and prevent the Shape from controlling it.
* If Darkwing's total is lower than the Shape's Capture Strength, the Shape controls the Station.

A Station whose Totem is being carried or has been Released is not **Available** and cannot be controlled or used to suppress the Face's Ward during Phase One.

### Form Totems

Each Available Form Station contains one matching **Form Totem**.

**Take Form ◆**  
**Requirement:** Darkwing controls the Station containing the Totem.  
A creature in the Station Interacts to pick up its Form Totem.

When a Totem is taken:

* its Station becomes unavailable;
* that Station no longer contributes to suppressing the Face's Ward;
* the Shape immediately loses the corresponding active **Form**, including both of that Form's Claims;
* the Shape cannot Assume that Form while the Totem is carried.

A carried Totem is a held object for encounter purposes. If its carrier drops it, the Totem remains in that square until picked up or reclaimed.

The Projected Ward and Backlash belong to :ref[the Face]{#source.face-of-the-unknown}.

### Release Form ◆◆

**Requirements:** You are carrying an unreleased Form Totem; you are inside the Face's central zone; the Projected Ward is suppressed.

You relinquish the projection's claim to describe the Unknown and return the accumulated Form to the Face as acknowledged projection rather than revelation.

* The Totem is **Released** and removed from play.
* Its artwork is flipped face-down or otherwise visibly marked as Released.
* The Shape immediately loses that Form, including both Claims, if it somehow still possesses it.
* That Form can never be Assumed again during the encounter.
* Your Capture Strength permanently increases from **1 to 2** for the remainder of the encounter.

No check is required. Reaching the Face with the Totem while maintaining the raid state is the mechanical test.

## Running the Formless Transition

# Phase Transition — Three Released Forms

Immediately after the **third Form Totem is Released**:

1. End the Shape's current action or activity after it resolves.
2. Flip **all six active artwork cards** face-down, including Forms that were not individually Released.
3. All remaining Form Totems become inert and are removed from play.
4. Remove every active Form token from the Shape.
5. The Shape does **not** Disperse normally.
6. Replace it with the **Formless Shape**.

The first three Releases establish the governing truth strongly enough that reality can no longer justify any of the projected Forms, not merely the three individually returned to the Face.

---

## Formless Shape — Phase Two

The Formless Shape is not a second damage boss. It is the accumulated Weight remaining after the asserted external Form has been disproven.

It has **no AC, HP, Strikes, or Claim abilities** and cannot be damaged or Dispersed by attacks.

**Speed** 30 feet  
**Capture Strength** none; it no longer contests Form Stations

### Blank Stations

After the phase transition, all six outer Stations become **Blank Stations**. They no longer contain Totems or Claims, but they can still be controlled using the same Capture Strength rules.

Darkwing must control at least **two Blank Stations** simultaneously to suppress the Face's Projected Ward during Phase Two.

### Seek Recognition

At the **end of each round**, determine the strongest concentration of Darkwing Recognition:

1. For each PC, total the Capture Strength of all PCs within 10 feet of that PC, including that PC.
2. Identify the PC whose local total is highest.
3. Ties go to the tied PC nearest the Formless Shape.
4. If still tied, use the tied PC nearest the Face.

The Formless Shape then Strides up to its Speed by the shortest legal route toward that PC.

It is not choosing tactically. It follows the strongest available concentration of Recognition.

### Raw Weight

A creature that enters the Formless Shape's space or begins its turn adjacent to it is subjected to the Face's encounter-specific Mnemonic Backlash. A creature can be affected by Raw Weight only once per turn.

The exact damage/DC should match the Face's finalized Source profile.

### Receive the Unknown ◆◆

**Requirements:**

* the Face's Projected Ward is suppressed by control of at least two Blank Stations;
* the Formless Shape is inside the Face's central zone;
* you have Capture Strength 2.

You acknowledge the remaining Weight as generations of projection, attention, hope, fear, and interpretation rather than evidence of one external person.

No check is required.

The Formless Shape collapses into the Face. The encounter ends. The Face becomes a **Stabilized Anchor for its own Weight** rather than an unresolved Source reconstructing an imagined Someone.

## If the Party Does Not Intervene

The Cult continues its ordinary rites. Do not count an unperformed rite as a failed raid or award control of the Face. Their unresolved belief in receiving an external Someone carries into The Open Door; that later encounter must supply its own necessary evidence.

:::design
# Shape of Someone — Tuning Notes

* The Shape is intentionally **durable rather than maximally accurate or damaging**. Increase HP before increasing AC if six level-12 PCs can burn through it too easily.
* **390 HP** is the first-pass target. A likely first tuning increase is **430 HP** if Projected Reconstruction is occurring too often or too cheaply.
* The base chassis is deliberately plain. Most tactical identity should come from the current **three-Form build**, which grants six available Claims and three Resonant emphases.
* Claim combinations are not expected to be uniformly balanced. Some combinations should be exceptionally strong, while others can be situational or absurd. The encounter is balanced as a whole through objective pressure, not by making every authored Shape equally optimized.
* The Face's **Source Level, Class, and exact Backlash** should be finalized after the raid loop is playtested. Do not derive them automatically from Creature 16.
The Face’s missing Source values have been supplied provisionally in its owning entry.
:::
