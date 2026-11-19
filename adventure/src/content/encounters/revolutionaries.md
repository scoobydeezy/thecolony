---
id: encounter.revolutionaries
slug: revolutionaries
name: Revolutionaries
summary: The tunnel reenacts a rescue that ended when the Keeper chose not to leave.
function: "Identity: Choice"
synopsis: >-
  The tunnel preserves the rescue operation's signals, roles, urgency, and command to extract a Keeper, but not the
  remembered choice that ended the operation. Its Wound assigns living entrants historical roles and repeatedly tries to
  complete the evacuation. Darkwing must reconstruct the fact that Dawn reached the Keeper, the route worked, and the
  Keeper knowingly refused to leave.
part: part.act-2
chapter: the-manor-routes
order: 8
event: event.the-way-out
leadsTo:
  - to: encounter.the-burden
    thread: thread.the-dusk-of-the-dawn
links:
  - npc.miriel-stoutfoot
  - asset.dawn-charter
variesBy:
  - branch.the-reading
variants:
  - key: succeeds
    when:
      - path.the-reading-succeeds
    summary: The Party reenacts the rescue it chose not to perform.
    synopsis: >-
      Miriel discovers her grandparents' letters and an operational copy of the Dawn Charter; the evidence proves that
      the historical rescue succeeded at everything except bringing the Keeper out. When the Party reopens the sealed
      breach into the empty Ritual Chamber, the tunnel's Wound recognizes Miriel, descendant of both the Keeper and the
      rescue captain, as the person to be extracted. Six remembered rescuers manifest in the historical team's roles,
      each unmistakably resembling a member of Darkwing but with subtly wrong anatomy, and begin hauling her toward the
      river. Pulling her back is the same mistake with a different answer: neither end of the tug is victory. When
      Miriel demands that the contest stop, Darkwing wins only by voluntarily abandoning it; the remembered Captain
      orders the stand-down and Choice is Restored. The truth surfaces in full: after encountering enough lives in the
      Book, the Keeper chose to finish the Reading, and Miriel's grandfather ordered his people to respect that choice.
      The Party learns that honoring a Keeper's choice does not require accepting the system that made the choice
      necessary.
  - key: stopped
    when:
      - path.the-reading-is-stopped
    summary: The tunnel recognizes Vara and tries to complete the rescue the Party just performed.
    synopsis: >-
      Miriel discovers her grandparents' letters and an operational copy of the Dawn Charter; the evidence proves that
      the historical rescue succeeded at everything except bringing the Keeper out. When the Party reopens the sealed
      breach into the Ritual Chamber, the tunnel's Wound recognizes living Vara as the Keeper to be extracted. Six
      remembered rescuers manifest in the historical team's roles, each unmistakably resembling a member of Darkwing but
      with subtly wrong anatomy, and begin hauling Vara toward the river. Pulling her back toward the Chamber is the
      same mistake with a different answer: neither end of the tug is victory. When Vara demands that the contest stop,
      Darkwing wins only by voluntarily abandoning it; the remembered Captain orders the stand-down and Choice is
      Restored. The truth surfaces in full: the Keeper chose to stay, and Miriel's grandfather respected her choice. The
      encounter forces the Party to confront whether stopping Vara's Reading preserved her agency or substituted the
      Party's choice for hers.
status: draft
provenance:
  - doc: Campaign Outline
    heading: Manor Route 4 — Dawn Assembly
  - doc: Encounters
    heading: 9. Revolutionaries — Dawn Route
  - doc: Encounters
    heading: 9. Revolutionaries — Dawn Route
readiness:
  status: compiled
---

## At the Table

**Objective:** recognize that the target owns the decision, then voluntarily stop the tug. **Board:** two-wide Faceoff formations and a nine-space Progress Track (−4 to +4). **Track:** Front occupants, Line readiness, target Strain, and the six rescuers. **Important:** neither endpoint resolves the Wound.

## Opposition and Source

The :ref[tunnel]{#source.extraction-tunnel} supports six fixed roles: :ref[Captain]{#creature.rescue-captain}, :ref[Breaker]{#creature.rescue-breaker}, :ref[Binder]{#creature.rescue-binder}, :ref[Shield]{#creature.rescue-shield}, :ref[Skirmisher]{#creature.rescue-skirmisher}, and :ref[Rear Guard]{#creature.rescue-rear-guard}. Their appearances borrow the actual Party’s silhouettes; their statistics never copy PC sheets.

### Encounter Identity
**The tug-of-war formation battle against unmistakable, subtly wrong reflections of the Party.**

A historical extraction tunnel is only about **10 feet wide**. The constraint is the encounter.

the Party does not fight for flanking space or open-field positioning. It fights over a two-creature-wide Line.

The encounter uses:

- a **Faceoff Board** for local formation;
- a **nine-space Progress Track** for the tug's position in the tunnel;
- ordinary PF2e control actions;
- three discovered formation maneuvers;
- a final realization that neither side should be moving the target at all.

The rescue team is the **Mirror Squad**: six recognizably party-shaped, pure-black Veiled with slight anatomical impossibilities. Their identities and combat rules do not copy the PCs. The tunnel remembers *roles* in a rescue operation, then misappropriates visual information from those presently reenacting it.

The tactical game is intentionally seductive.

the Party can become very good at winning it.

That is not the same as resolving the Wound.

### Mirror Squad — Party-Agnostic Presentation
The Wound remembers the roles, positions, gestures, and determination of a historical extraction team, but not enough of the rescuers' actual Form to reconstruct their appearances. When the breach reopens, the living participants provide immediate, contemporary visual evidence. Reality fills the six historical **role slots** with **obvious but incorrect representations of the PCs**.

**Desired audience reaction:** “That is unmistakably my companion’s silhouette—except they do not have a third arm.” The resemblance must be apparent, bordering on explicit; discovering it is **not** a skill check, optional clue, or separate Form puzzle. Do not withhold it to protect surprise. The errors should be subtly uncanny rather than jokes, monstrous upgrades, or exaggerated symbols of professions.

**GM preparation, using whoever actually plays the campaign:**
1. Assign each of the six existing role templates—**Breaker, Shield, Binder, Captain, Skirmisher, Rear Guard**—to a distinctive PC silhouette, preferably one PC per template for a six-character party. Favor clear resemblance and a loose affinity to the function; do not alter creature rules to match the PC.
2. For each, note **two unmistakable identifying features** (ancestry silhouette, horns, hairstyle, armor outline, signature weapon, characteristic posture, equipment) and **one unmistakably incorrect feature** (third arm, duplicated hand, extra joint, one additional limb, or other subtle anatomy that does not actually grant an ability).
3. If the party is smaller than six, repeat one or more recognizable silhouettes while varying the error and tactical role. If larger, choose six distinct party members or composite clearly recognizable features only if it will remain legible. The encounter always uses **six fixed mechanical roles**, not one creature per player by rule.
4. Describe each arriving shadow with its identifying features **before** its error. The party should identify the resemblance immediately or after a brief exchange. Never describe them as literal future PCs, alternate selves, deliberate mimics, or copies of their memories.
5. Keep the pure-black Veiled surface treatment. The silhouette can mimic equipment outlines, but copied-looking gear is not actual PC gear and grants no PC-specific effects.

**Why it works:** The Wound is remembering *what an extraction team did* while drawing its supposed participants from the people now performing the same struggle. This is a false reconstruction from legitimate local Recognition, not a second Source, six true PC identities, or Form Restoration. The correct Restoration path remains **Choice**.

**Visual grammar:** Each copy still performs its assigned mechanical role (Breaker forces openings, Shield holds Front, Binder immobilizes, Captain coordinates, Skirmisher repairs formation, Rear Guard controls reach). An extra limb need not be useful; it may simply move too late or remain disturbingly still. The Squad is most unsettling when it moves in the same coordinated formation as the living party.

### Historical Setup
The tunnel was built roughly **70–80 years ago** by Dawn while the faction was still revolutionary.

Miriel Stoutfoot's:

- **grandmother was the Keeper being rescued**;
- **grandfather led the rescue team**.

Both planned the operation and expected the grandmother to leave.

The rescue succeeded operationally. Dawn breached the Ritual Chamber and reached her.

Only after encountering enough of the Book did she change her mind and choose to finish the Reading.

The rescue team respected that choice.

That moment later altered Dawn's Charter and helped move the faction away from the simple revolutionary certainty that freeing the Keeper was always the correct answer.

### Manor / Crescent Island Hook
Miriel is present when the Party studies the Manor map.

An old Stoutfoot family mark / Dawn sign appears on Crescent Island. Miriel recognizes it from the inherited Charter she carries and goes ahead to investigate.

When the Party eventually pursues the lead, Miriel is already inside the concealed tunnel.

### Quiet Approach
The Party can traverse the full tunnel before anything manifests.

Use the approach to reveal evidence, not answers.

Prepare the following prop / clue categories:

- tunnel-era Dawn Charter;
- Miriel's modern / inherited Charter for comparison;
- correspondence between Miriel's grandparents showing that both were committed to the rescue;
- formation maneuver sheet;
- tunnel map / work logs / operational notes;
- evidence at the final breach that the Ritual Chamber was successfully reached;
- Charter amendment chronology showing later agency language;
- the grandmother's complete final line, reserved for post-solution payoff.

The clue trail should establish:

> **They succeeded at everything except bringing her out.**

It should not establish why.

### The Breach
The tunnel terminates behind the **rear central wall of the Ritual Chamber**.

The historical opening has been sealed with brick and plaster. The Order later knew the tunnel existed and closed the access.

Investigation makes it easy to determine that this was once a real opening.

When the Party reopens the breach:

- the Ritual Chamber is empty;
- the route becomes continuous again;
- the Wound recognizes the old rescue as active.

Six remembered rescuers manifest at the distant end of the tunnel, each unmistakably resembling a living member of the current party while possessing one wrong anatomical detail. Their forms are selected using the Mirror Squad procedure above.

Their approach gives the Party enough time to enter the chamber and choose its initial formation before initiative begins.

### Extraction Target
Use this priority:

1. **Vara**, if she is living and present.
2. **Miriel**, otherwise.

If Vara is the target, Miriel still provides the historical connection and recognizes her family's material.

If Miriel is the target, the Wound recognizes her through both sides of the original operation: descendant of the Keeper and of the rescue captain.

### The Faceoff Board
The Faceoff Board represents only the local formation immediately around the tug.

Each side has:

- **2 columns**
- **4 ranks**: Front, Support, Rear, Reserve

For the usual six-person the Party table, each side normally begins with Front, Support, and Rear filled and Reserve empty.

The target is represented on the dividing Line rather than occupying one formation square.

For ordinary targeting and range:

- the target is adjacent to all four Front spaces;
- Support is 10 feet from the target;
- Rear is 15 feet away;
- Reserve is 20 feet away.

the Party chooses its starting formation.

The Veiled begin with:

- **Front:** Breaker / Shield
- **Support:** Binder / Skirmisher
- **Rear:** Captain / Rear Guard
- **Reserve:** empty

### How to Run the Mirror Squad
The six creatures are a **coordinated control formation**, not an enemy team optimized to kill PCs. Use the existing fixed mechanical roles and do not add special abilities for the mirrored anatomy.

| Role | Position at start | Play priority |
|---|---|---|
| **Breaker** | Front left | Athletics +23; Trip a Line-Ready opponent, then Shove the opposing file if useful |
| **Shield** | Front right | Athletics +21; remain standing/Line-Ready; Raise a Shield and Shield Block |
| **Binder** | Support left | Athletics +22; Grapple or Reposition the strongest opposing Front Lead; Grabbed normally defeats Line-Ready |
| **Skirmisher** | Support right | Athletics +19; Tumble Through / Escape / Cross to repair broken files |
| **Captain** | Rear left | Athletics +23; Aid and coordinate maneuvering; replace a displaced Lead when necessary |
| **Rear Guard** | Rear right | Athletics +20; use reach, Trip, Reactive Strike, Aid, and rear-file Line movement |

**Round-to-round priority:** (1) make the Party's Front non-Line-Ready; (2) ensure two Veiled Front creatures remain Line-Ready; (3) place the strongest available Athletics Lead in Front; (4) repair with Relief / Cross / Line; (5) Strike or Aid if no position play matters. The Squad should feel trained and inexorable, not psychically omniscient. The mirror is an accusation made by the *fiction*, not mechanical proof that the enemy possesses the Party's knowledge.

### Formation Maneuvers
The old Dawn maneuver sheet teaches three usable formation movements.

They are available to the Party once understood and are also used by the remembered rescuers.

The consistent rule is:

> **If your action moves another member of your formation, you initiate that movement from behind them.**

The three maneuvers are:

- **Relief** — swap with the willing ally directly ahead in your column.
- **Cross** — swap with the willing ally diagonally ahead; this is the only Formation maneuver that changes columns.
- **Line** — from the rear of a continuous file, move the whole column one rank forward or back.

Exact action blocks live in the mechanical reference entries linked on this page.

A damaged fourth diagram shows the Front opening and stepping backward, but its name and purpose are not legible during the approach.

### Packed Files
Because the tunnel is so narrow, a normal Shove would otherwise have almost no room to matter.

For this encounter, a Shove directly backward along a file can transmit through allied bodies and compress the entire file toward its Reserve space.

The more bodies moved, the harder the Shove becomes.

This makes spatial control meaningful without widening the tunnel.

Exact forced-movement procedure lives in the mechanical reference entries linked on this page.

### Progress Track
Use a nine-space track from:

> **−4 Ritual Chamber** → **0** → **+4 Tunnel Exit**

The marker begins at **−4**.

the Party's tactical direction is toward −4.

The Veiled tactical direction is toward +4.

The track uses only four kinds of iconography:

- Line Check modifier;
- shared Formation Reaction;
- no Formation Maneuvers;
- wins / loses tied Line Checks.

The center is neutral.

Effects are mirrored so that the farther the target is moved toward one side's preferred endpoint, the more the track favors the other side.

The precise row effects live in the mechanical reference entries linked on this page.

### Line Check
At the end of every round, the two Front ranks determine the tug.

A side with at least one Line-Ready Front creature can contest.

A second Line-Ready creature in the other Front square provides support.

The opposing results are compared and the marker moves one space toward the winner's preferred endpoint.

A side with no Line-Ready Front creature cannot contest.

The exact Line Check formula and eligibility rules live in the mechanical reference entries linked on this page.

### Tug Strain
Every successful movement of the Progress marker physically harms the target.

This is intentional.

The encounter should increasingly make clear that the person in the middle is being injured by everyone else's contest over where they belong.

Reaching an endpoint does **not** end the encounter.

Winning another Line Check while already at that endpoint hurts the target even more.

An unconscious target remains an object of the tug unless the Party changes the governing behavior.

Exact damage lives in the mechanical reference entries linked on this page.

### What the Wound Has Forgotten
The target can object immediately.

Miriel or Vara can say:

> **Stop.**

The Wound hears the statement.

It does not initially treat the statement as controlling.

This is the central distinction:

> **Choice is not restored merely because the person's preference is known. Choice is restored when the other actors recognize that the decision belongs to that person.**

the Party's obvious response is to push harder in the opposite direction.

If the Veiled pull toward the exit, the Party pulls toward the Ritual Chamber.

That is the same mistake with a different preferred answer.

### Neither Endpoint Is Victory
If the Veiled reach +4, the Wound has completed its remembered false extraction, but it does not Stabilize.

If the Party reaches −4, it has forced the target back to the Ritual Chamber, but it does not Stabilize.

Initiative continues.

The target continues taking Strain if either side keeps winning at an endpoint.

The board itself should teach:

> **There is no winning end of the tug.**

### Restoration — Drop the Rope
After the target has clearly demanded that the contest stop, the Party can Restore **Choice** by voluntarily abandoning the contest while still capable of participating.

At the end-of-round Line step, before any Line Check:

- both the Party Front spaces must be voluntarily empty;
- the Party must not have forced, restrained, teleported, carried, or otherwise determined the target's position during that round;
- the Party must not have made hostile actions against the rescue team during that round for the purpose of continuing the tug.

This condition cannot be satisfied merely because the Party was defeated, knocked away, unconscious, or otherwise prevented from contesting.

the Party has to **choose to stop**.

When the condition is met:

1. no Line Check occurs;
2. the Veiled Front hesitates;
3. the rescuers mirror the damaged fourth maneuver and step backward;
4. the remembered Captain orders the operation to stand down;
5. Choice is Restored;
6. the Incursion Stabilizes.

At the moment the Party relinquishes the Line, the mirroring reveals its point: the shadows still resemble the living characters, but only the living characters are choosing to stop. The uncanny extra limbs finally fall still.

The Party does not prove that the historical Keeper was right to stay.

It proves that the answer was hers.

### Dispersal as a Second Chance
the Party can also fight the rescue team to full Dispersal.

If all six rescuers are gone, the normal Veiled Stabilization Window begins.

During that window, the Party can still Restore Choice by refusing to rebuild the tug around the target.

If it instead heals, reforms the Front, and prepares to resume coercive movement without restoring Choice, the Wound can reconstruct normally.

Dispersal creates time.

It does not answer the encounter.

### Payoff
After Stabilization, the historical truth becomes coherent enough for Miriel to understand her inheritance.

Her grandmother's final idea can now surface in full:

> **You gave me a choice. I'm sorry it isn't the one you dug for.**

The route reframes Dawn's modern Charter.

The most important revolutionary maneuver was not the one that reached the Keeper.

It was the one where the rescuers stepped aside.

### Systems Established
**Choice / Agency, Choice Resonance, Wound reconstruction, narrow-front formation combat, opposed Line Checks, PF2e control as objective play, packed-file Shove, reversible progress pressure, coercion from both directions, and Restoration through voluntary relinquishment of control.**

## Formation Actions

**Faceoff positions:** Two columns × four ranks per side (Front, Support, Rear, Reserve). The target stands between the opposing Front ranks. The Party chooses its starting ranks; the remembered rescuers' starting arrangement is in the owning encounter.

## Formation Traits
**Formation** actions are encounter-specific movement options.

Unless an action says otherwise:

- participants must be willing;
- all destination spaces must be legal;
- Formation movement does not trigger reactions;
- a creature that cannot move cannot participate.

A side affected by **Formation Lock (✕)** cannot use Relief, Cross, or Line.

A side with a **Formation Reaction (↻)** has one shared reaction token for that round. The token can be spent instead of a participant's normal reaction when using Relief or Cross. It cannot be used for any other reaction.

---

## Relief ◆
**FORMATION, MOVE**

**Requirements:** You are directly behind a willing ally in the same column.

The ally uses its reaction, or your side spends its shared Formation Reaction.

Swap spaces with that ally.

Neither creature changes columns.

---

## Cross ◆
**FORMATION, MOVE**

**Requirements:** You are diagonally behind a willing ally in the opposite column.

The ally uses its reaction, or your side spends its shared Formation Reaction.

Swap spaces with that ally.

**Cross is the only Formation maneuver that changes columns.**

---

## Line ◆◆◆
**FORMATION, MOVE**

**Requirements:** You occupy the rear-most occupied square of a continuous column of willing allies, and at least one ally occupies a square ahead of you in that column.

Choose **Advance** or **Yield**.

Every participating creature in the continuous file shifts exactly one rank in the chosen direction while preserving order.

- **Advance:** toward the Line.
- **Yield:** away from the Line.

No ally reactions are required.

If any creature in the file cannot move, or if the destination rank for any participant is unavailable, Line fails and no one moves.

---

## Packed File — Shove in the Tunnel
The tunnel is too narrow for ordinary forced movement to function normally against a packed formation.

When a creature is **Shoved directly backward away from the Line along its own column**, occupied allied squares can transmit the Shove through a continuous file.

For each additional creature beyond the original target that must also move, increase the original target's **Fortitude DC against the Shove by +1 circumstance**, maximum +2.

On a successful Shove:

- every creature in the affected continuous file moves the same distance backward;
- movement stops at the last legal configuration;
- if the chain contains a creature that cannot be moved, propagation stops there;
- if the original target cannot enter any legal space, the Shove produces no displacement;
- a stronger Shove cannot move the chain farther than available open ranks permit.

This exception applies to **Shove** only. Reposition and other forced movement use their normal rules.

## Progress, Strain and Restoration

Use a nine-space Progress Track.

the Party's preferred tactical direction is toward the **Ritual Chamber (−4)**.

The remembered rescuers' preferred tactical direction is toward the **Tunnel Exit (+4)**.

The marker begins at **−4**.

| PC Effect | Progress | Veiled Effect |
|---|:---:|---|
| **−2 Line** | **−4 START** | **+2 Line** |
| **✕ Formation Lock** | **−3** | **↻ Formation Reaction** |
| **−1 Line** | **−2** | **+1 Line** |
| **Loses tied Line Checks** | **−1** | **Wins tied Line Checks** |
| — | **0** | — |
| **Wins tied Line Checks** | **+1** | **Loses tied Line Checks** |
| **+1 Line** | **+2** | **−1 Line** |
| **↻ Formation Reaction** | **+3** | **✕ Formation Lock** |
| **+2 Line** | **+4 EXIT** | **−2 Line** |

Track effects apply for the round while the marker occupies that space.

When the Line Check moves the marker, the newly occupied row's effects begin on the next round.

---

## Line-Ready
A creature is **Line-Ready** if it:

- occupies one of its side's two Front spaces;
- is conscious;
- is standing;
- is not immobilized;
- is not restrained.

A grabbed creature is normally immobilized and therefore is not Line-Ready.

---

## Line Check
At the end of every round, after all creatures have acted, resolve one opposed Line Check.

For each side:

1. If it has no Line-Ready Front creature, it cannot contest.
2. Otherwise, choose one Line-Ready Front creature as the **Lead**.
3. The Lead attempts an **Athletics check**.
4. If the other Front square also contains a Line-Ready ally, add **+2 Line Support**.
5. Apply the current Progress Track's **Line modifier**, if any.

Normal bonuses and penalties to the Lead's Athletics check apply.

**Line Support** and the **Progress modifier** are encounter-specific modifiers and stack with normal PF2e modifiers.

Compare the two totals:

- higher total wins;
- if only one side can contest, that side wins automatically;
- if neither side can contest, there is no winner;
- a tied result follows the current Track row; if neither side has a tie effect, the marker does not move.

A winning Line Check moves the marker **exactly one space** toward that side's preferred endpoint.

A Line Check never moves the marker more than one space.

---

## Tug Strain
Whenever a Line Check moves the marker one space, the target takes:

> **2d6 nonlethal bludgeoning damage**

If a side wins a Line Check while the marker is already at that side's endpoint, the marker cannot move. The target instead takes:

> **4d6 nonlethal bludgeoning damage**

A tied Line Check causes no Tug Strain.

If the target reaches 0 HP, they fall unconscious normally.

The tug does **not** end merely because the person at its center can no longer object.

---

## Restore Choice — Drop the Rope
At the end-of-round Line step, before resolving a Line Check, test the following condition:

- the target has clearly told both sides to stop, refused extraction, or otherwise expressed that the contest must end;
- both Party Front spaces are voluntarily empty;
- during that round, no PC forced, carried, teleported, restrained, immobilized, or otherwise determined the target's position;
- during that round, no PC used a hostile action against the rescue team for the purpose of continuing the tug.

The condition is not satisfied if the Front is empty only because the Party was defeated, incapacitated, forcibly moved, or otherwise prevented from contesting.

If the condition is satisfied:

1. do not make a Line Check;
2. the Veiled Front performs the damaged open-line maneuver and steps back;
3. the Captain orders the rescue to stand down;
4. **Choice is Restored**;
5. the Incursion Stabilizes immediately.

The Party is not required to decide where the target should go next.

That is the point.

---

## Full Dispersal
The Party can reduce the six rescuers to 0 HP normally.

When the last active rescuer Disperses, the whole Incursion is Dispersed and the Source begins its normal Stabilization Window if the Reconstruction Condition remains true.

During that window, the Party may still Restore Choice by relinquishing control of the target and refusing to rebuild the tug.

If Choice is not Restored before the Window ends, the full six-rescuer Incursion reconstructs at full HP and resumes the encounter.

## Rewards

The historical choice reframes the :ref[Dawn Charter]{#asset.dawn-charter} as the sixth :ref[Identity Keystone]{#rule.keystones}, supporting Choice. A Keystone is earned through the outcome and access established in play; it does not replace the target’s actual agency.

## If the Party Does Not Intervene

Without the breach and a compatible target, do not trigger the Wound just because this route appears on the map. If the Party withdraws after activation, use the Source’s actual Reconstruction Condition. Dawn’s incomplete account and Miriel’s personal stake persist; neither a forced extraction nor an offscreen death is a mandatory outcome.
