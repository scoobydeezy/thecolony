---
id: encounter.witness-me
slug: witness-me
name: Witness Me
summary: The house proves that objects lose meaning when stripped from their place.
function: "Identity: Context"
synopsis: >-
  Darkwing applies the Hall of Remembrance lesson by identifying which possessions belong together, but the Veiled House
  demonstrates that those relationships remain incomplete without context. Removing the one object still where it
  belongs ruptures the house into an impossible but fixed maze of repeated Hearths. Resolution requires restoring not
  only which things were connected, but where and how those relationships existed.
part: part.act-2
chapter: the-manor-routes
order: 10
event: event.the-veiled-house
leadsTo:
  - to: encounter.the-burden
    thread: thread.the-first-witnesses
links:
  - npc.celia-harthwright
  - asset.ledger
variesBy:
  - branch.the-reading
variants:
  - key: succeeds
    when:
      - path.the-reading-succeeds
    summary: The house tries to fill a different Keeper-shaped absence.
    synopsis: >-
      The Party initially applies the lesson learned at the Hall of Remembrance, identifying which possessions belong
      together, but moving or isolating those objects makes the manifestation worse. Rooms overlap and domestic routines
      begin assigning false roles as the house attempts to use the Party's surviving Vara-shaped residues to fill the
      missing center of an entirely different historical household. The Party must restore relationships between
      objects, rooms, routines, and people while distinguishing two different Keepers from the single institutional role
      they shared. The encounter demonstrates that correct fragments placed in the wrong context can still produce a
      false identity.
  - key: stopped
    when:
      - path.the-reading-is-stopped
    summary: The house recognizes Vara as “the Keeper” and tries to make her part of another life.
    synopsis: >-
      The Party initially applies the lesson learned at the Hall of Remembrance, identifying which possessions belong
      together. But removing the Greater Insistent Door Knocker, the last object still in its historically correct
      place, ruptures the house once into an impossible but fixed labyrinth of repeated Hearths. The house's hostile
      manifestation is always the same forgotten Order Keeper who lived there, an overzealous custodian rather than a
      killer, and every wrong arrangement of its Context objects calls it up again. The Party must map the maze and
      restore not only which things were connected, but where and how those relationships existed. The encounter
      demonstrates that correct fragments placed in the wrong context can still produce a false identity.
status: draft
provenance:
  - doc: Campaign Outline
    heading: Manor Route 5 — Witnesses
  - doc: Encounters
    heading: 10. Witness Me — Veiled House
  - doc: Encounters
    heading: 10. Witness Me — Veiled House
readiness:
  status: compiled
---

## At the Table

**Objective:** reconstruct the house’s last correct Context, then submit the whole arrangement at the Hearth. **Board:** repeated Hearth thresholds, waypoint rooms and six Context slots. **Track:** tested arrangement, five scored relationships, slate state and whether the Keeper is manifested. **Finish:** a correct submission restores the Wound; an incorrect submission sets the next manifestation’s Class.

## Reference at the Table

Use :ref[the Veiled House Source]{#source.veiled-house} and :ref[the House Keeper]{#creature.house-keeper}. Context is recovered locally; there is no Context Keystone.

### Encounter Identity
**The impossible haunted-house maze.**

The Veiled House contains one repeatedly reconstructed central Hearth Room, six unique waypoint rooms, and a physically real topology that becomes fixed as Darkwing discovers it.

The encounter should feel like a cross between a Zork-style mapping problem, a Lost Woods disorientation puzzle, and an Escher-like haunted house.

The critical constraint is:

> **The maze never changes after the rupture. The GM may discover its topology procedurally, but every connection becomes permanent truth the first time it is established.**

There are no wrong doors that secretly reset the Party and no room-shuffling punishment for failed guesses.

If a corridor connects Hearth A North to Hearth F Down, that connection remains reciprocal for the rest of the encounter.

### Opening State
Darkwing enters the real **Parlor** from outside, then passes from the Parlor into the central **Hearth Room**.

The Hearth has:

- North, East, South, and West wall doors;
- an **Up** staircase ending at a trapdoor-like ceiling hatch;
- a paired **Down** stair / floor threshold;
- a large table at the center;
- a chalk slate on the table.

### The True Hearth — Domestic Baseline
Before the rupture, the Hearth is the refined central living and receiving room of a prosperous Catfolk household. Its former owner held a senior position in the Order of Theia, but the room feels domestic rather than ceremonial: warm, well-kept, tasteful, and quietly affluent. A stone fireplace and mantel anchor a conversation area with two upholstered armchairs, a settee, a central low table, a woven rug, and a sideboard with a tea service. Curtained windows, framed paintings (including a landscape and intimate household scenes), carved wood, brass lampwork, and regional Golarion textiles complete the room. A cushioned sunlit window bench, accessible high perches, and subtle wear on the furnishings quietly suggest Catfolk habitation without turning the home into a cat-themed novelty.

The true room gives every reconstructed Hearth its shared visual vocabulary. Across all sixteen copies, preserve the same **six usable thresholds, fireplace, central table, and chalk slate** in their established functional positions; decorative furnishings and the apparent character of the room may be spectacularly wrong without changing its traversable topology or the Context placement interfaces.

The Party therefore personally witnesses one historical relationship before anything goes wrong:

> **Parlor ↔ South Hearth threshold**

A **Greater Insistent Door Knocker** is mounted on that threshold.

The other five Context objects have long since been displaced into the waypoint rooms with which custodians correctly associated them.

The Knocker is the last household object still occupying its historically correct Hearth-side Context.

### The Slate
Before the rupture, the chalk slate already changes when no one is looking.

Its messages are ordinary enough to be dismissed at first:

- *Bread is in the cupboard.*
- *Back before supper.*
- *Please shut the door behind you.*

The slate is the Wound's voice.

It is also the encounter interface through which Darkwing later commits a proposed Context arrangement.

### Trigger — Take the Knocker
Removing the Greater Insistent Door Knocker destroys the final surviving Context relationship.

The house immediately ruptures at **Class V**.

The topology ripples outward from the original Hearth exactly once.

The real Parlor remains in the house and its front door still opens outside, but it is no longer connected to the Hearth threshold through which Darkwing entered.

Returning the Knocker immediately does not undo the maze or end the active Incursion.

The original Hearth has become the mnemonic center of the labyrinth, not the solution to it.

### Fixed Procedural Topology
Use a **22-card topology deck**:

- **16 unique Hearth cards**
- **6 unique waypoint cards**
  - Parlor
  - Kitchen
  - Study
  - Garden Room
  - Bedroom
  - Storage

The original starting Hearth is one of those sixteen. Its card enters the deck when the rupture occurs, so later corridors can genuinely reconnect to the room where the encounter began.

Every Hearth card represents one persistent copy of the same remembered Hearth Room.

Every Hearth has the same six local thresholds:

1. North
2. East
3. South
4. West
5. Up
6. Down

The directions are local room coordinates, not reliable global compass directions.

A corridor can leave North and return through East, Down, Up, or any other legal destination threshold.

Its physical path bends, climbs, rotates, or corkscrews as necessary.

### Establishing a New Connection
Whenever any creature first crosses a Hearth threshold whose destination has not yet been established:

1. Draw one card from the topology deck.
2. The drawn card determines the destination room.
3. Roll **1d6** for the destination orientation: **1 North, 2 East, 3 South, 4 West, 5 Up, 6 Down**.
4. If the destination is a **Hearth**, that roll selects the destination Hearth threshold. Reroll any threshold already assigned on that Hearth.
5. If the drawn Hearth is the same Hearth the creature is leaving, the destination threshold must be different from the source threshold.
6. If the destination is a **waypoint**, the roll determines the orientation of the room's single current maze entrance. That generated entrance is part of the Wound's present topology and does **not** replace or identify the waypoint's separate historical Hearth-facing evidence.
7. Record the connection in both directions. It is now permanent.
8. Return a destination Hearth card to the deck only if that Hearth still has at least one unresolved threshold.
9. If either the destination Hearth or the source Hearth now has all six thresholds fixed, remove that Hearth's card from the deck.
10. Remove a waypoint card from the deck permanently as soon as that room is discovered.

The first attempt to resolve the original Hearth's former Parlor/South edge cannot reconnect directly to the Parlor; redraw Parlor if necessary. The rupture has explicitly severed that original adjacency.

Multiple distinct corridors may connect the same two Hearths.

A Hearth may even connect to itself through two different thresholds.

Only a threshold connecting directly to itself is invalid.

### Sixteen Distinct Hearths
Every Hearth card depicts one persistent, recognizably distorted version of the same true living room. Each has **one dominant, memorable visual modifier** rather than a tiny hidden marker. The Party can identify and map rooms by phrases such as “the Tall Hearth” or “the Feline Hearth.” Assign the sixteen variants permanently to the sixteen Hearth cards; a room never changes when revisited.

| Hearth card | Room name | Stable distinguishing feature |
|---|---|---|
| **H1** | **The Tall Hearth** | Furniture, paintings, and cabinetry stretch impossibly upward beneath a soaring ceiling. |
| **H2** | **The Windowed Hearth** | Decorative walls are crowded with windows looking onto other rooms, impossible landscapes, or this same room from unfamiliar angles. |
| **H3** | **The Inverted Hearth** | Armchairs, settees, rugs, and most decorative furniture hang upside down from the ceiling. |
| **H4** | **The Crowded Hearth** | Dozens of extra armchairs and settees pack the room as though an enormous family gathering is expected. |
| **H5** | **The Tiny Hearth** | The decorative furniture is doll-sized, though the room and its functional central table remain normal-sized. |
| **H6** | **The Gilded Hearth** | Furnishings and trim are extravagantly covered in gold, jewels, and elaborate ornamentation. |
| **H7** | **The Cushioned Hearth** | Nearly every decorative surface is upholstered, from shelves and walls to the fireplace surround. |
| **H8** | **The Framed Hearth** | Empty picture frames crowd the walls, and paintings occupy decorative spaces where windows would ordinarily be. |
| **H9** | **The Stacked Hearth** | Chairs, cabinets, side tables, and settees form precarious-looking towers of furniture. |
| **H10** | **The Curtained Hearth** | Heavy curtains and draperies cover walls, divide empty space, and enclose otherwise ordinary furnishings. |
| **H11** | **The Worn Hearth** | Every furnishing looks ancient and threadbare, with faded upholstery, worn wood, and nearly colorless paintings. |
| **H12** | **The Mirrored Hearth** | Individual objects are reflected across arbitrary axes: backward chairs, reversed cabinets, and inverted decorative details coexist without symmetry. |
| **H13** | **The Candlelit Hearth** | Hundreds of candles and oil lamps cover every available ledge, mantel, and ornamental surface. |
| **H14** | **The Feline Hearth** | The refined Catfolk furnishings have become literal cat beds, scratching posts, toys, and litter boxes, with a few utterly ordinary cats lounging about. |
| **H15** | **The Festive Hearth** | Garlands, ribbons, flowers, and colorful bunting cover nearly every furnishing as if for an extravagant celebration. |
| **H16** | **The Bare Hearth** | Almost all optional furnishings and decoration are absent, leaving the shared fireplace, central table, slate, thresholds, and a few isolated pieces. |

**These differences are landmarks, not clues or objectives.** They are stable, harmless false interpretations of the household, not additional Context relationships. No variant hides a needed item, alters an exit, changes the true six-slot evidence, confers a mechanical bonus, or demands that the players rearrange or “correct” its decoration. Even where furnishings are enormous, miniature, inverted, crowded, or apparently precarious, the six thresholds, Context placement sites, central table, and slate remain accessible and work identically. The Feline Hearth's cats are ordinary background color, not guides or puzzle agents.

The **six waypoint rooms** remain comparatively ordinary and retain their reliable historical evidence. Their contrast with the incorrect Hearth copies helps Darkwing separate actual Context from the house's decorative guesses.

### The Six Context Slots
Every Hearth threshold contains a visible placement area where each of six household items appears to have once belonged.

The house has duplicated the **trace** of every Context object beside every threshold because it remembers the relationship category but not the correct placement.

Every threshold therefore reproduces all six of these ghosts:

- **Greater Insistent Door Knocker:** mounting holes and circular iron wear on the door itself;
- **Bedroom slippers:** paired toe-and-heel floor wear;
- **Garden hat stand:** circular/scuffed foot marks;
- **Study picture frame:** faded rectangular outline and hanging marks;
- **Kitchen service bell:** small mounting holes and brass staining;
- **Storage key board:** rectangular shadow and hook pattern.

Some false placements are plainly absurd.

The Up threshold can reproduce a picture-frame outline on the ceiling itself.

That is intentional.

The slots should make the interaction grammar obvious:

> **Six real objects belong in six repeated placement sites. The problem is deciding which object belongs beside which threshold.**

### The Historical Arrangement
The fixed historical answer is:

| Hearth Threshold | Historical Room | Context Object |
|---|---|---|
| **South** | **Parlor / Entrance** | **Greater Insistent Door Knocker** |
| **North** | **Kitchen** | **Service bell** |
| **East** | **Study** | **Framed picture** |
| **West** | **Garden Room** | **Hat stand** |
| **Up** | **Bedroom** | **Pair of slippers** |
| **Down** | **Storage** | **Household key board** |

The Parlor relationship is a given because Darkwing witnessed it before rupture.

The other five are the scored puzzle.

### Waypoint Clues
Each puzzle waypoint contains its Context object and enough ordinary architectural evidence to establish the historical Hearth relationship.

The object itself does **not** identify the correct Hearth threshold.

### Kitchen
**Object:** service bell.

**Reliable evidence:** the historical Kitchen doorway carries door-swing scrape marks that match the warped arcs at the **North** Hearth threshold.

**Red herring:** a cellar hatch makes **Down** feel natural.

### Study
**Object:** framed picture.

**Reliable evidence:** the **East** Hearth doorway sits unusually far to the right of its wall, while the Study's historical entrance sits correspondingly far to the left of the matching wall.

**Red herring:** a tall window and elevated view make **Up** plausible.

The Study also contains the surviving writings that reveal the forgotten Keeper's hostility toward the early Witness movement and the Order reports showing that removal of household objects worsened the site.

### Garden Room
**Object:** freestanding hat stand.

**Reliable evidence:** a dark-wood repair in the historical doorway jamb matches the repaired **West** Hearth jamb in material, height, and nail pattern.

**Red herring:** the room's sunken floor and drainage channel suggest **Down**.

### Bedroom
**Object:** pair of slippers.

**Reliable evidence:** a balcony and visible exterior roofline establish that the room historically sat above the principal floor, supporting **Up**.

**Red herring:** a descending service route elsewhere in the room can make **Down** superficially plausible.

### Storage
**Object:** household key board.

**Reliable evidence:** no windows, rough foundation stone, cool damp air, and unfinished joists establish a below-grade room, supporting **Down**.

**Red herring:** trunks, seasonal blankets, rolled carpets, and old furniture make the contents feel attic-like.

### Parlor
The actual Parlor is the maze's exit waypoint.

Its front door always opens normally to the outside.

Finding it does not solve Context.

Darkwing may leave the house if it wants.

The route remains unresolved until the Wound is Stabilized.

### Secret Storage Cache
The Storage room contains evidence of a physically bricked-up chamber behind one wall.

This chamber is **not** represented in the topology deck.

It is not required for Context and contains no puzzle object.

The Greater Insistent Door Knocker can create access through the masonry if used within the item's normal limitations.

The room contains ordinary treasure appropriate to the Party: coin, consumables, household valuables, and similar rewards.

Nothing supernatural is required inside it.

### Set the Hearth
Darkwing can use **any Hearth copy** as its reconstruction workspace.

The Party places the Knocker in the witnessed Parlor slot and arranges the five recovered puzzle objects among the remaining five Context slots.

Object placement itself produces no supernatural confirmation.

When no House Keeper Incursion is active, the slate eventually asks:

> **IS EVERYTHING WHERE IT BELONGS?**

Writing an affirmative answer commits the complete arrangement.

Use the exact **Set the Hearth** procedure in the mechanical reference entries linked on this page.

At a high level:

- missing puzzle objects count as wrong;
- each wrong puzzle relationship becomes one Class;
- Class I–V therefore reports only the **number** of wrong relationships;
- the manifestation never identifies which placements failed;
- zero wrong Restores Context.

### Failed Arrangement
On a failed Set the Hearth, the slate violently rejects the answer.

Its surface fills with:

> **STOP STOP STOP STOP STOP**

The same forgotten House Keeper manifests again at the calculated Class.

The Keeper's creature statistics do not change with Class.

An active Incursion prevents another submission.

The slate will not accept Darkwing's writing while the House Keeper remains manifested.

The Party must Disperse the Incursion before revising and trying again.

This makes brute force possible but costly:

> Every false claim about the household creates another manifestation proportional to how much Context Darkwing asserted incorrectly.

### House Keeper Behavior
The House Keeper is the forgotten former Order Keeper who lived here.

It is not initially murderous.

It behaves like an overzealous custodian:

- anything movable can become **evidence**;
- evidence should be secured;
- people should stop touching things;
- doors should be shut;
- the site should be brought under procedural control.

It does not make ordinary attacks merely because living creatures are present.

Its confiscation attempts, object-protection reaction, and control of the Hearth thresholds make provocation extremely likely.

Exact statistics and actions live in the mechanical reference entries linked on this page.

### Restoration
When the five unknown relationships are correct, the slate accepts Darkwing's affirmative answer.

The house becomes coherent.

The impossible topology resolves back toward an ordinary domestic floor plan.

The hostile House Keeper stabilizes into the actual forgotten Keeper rather than disappearing.

The Keeper can speak calmly and understand the evidence left by what happened after their Reading.

They were once an Order institutionalist who believed the Witnesses' methods endangered the Colony.

Their own house became the evidence that forced the Order to grant the Witnesses bounded custodial authority.

The Keeper need not instantly agree with every Witness doctrine.

They are simply coherent enough to reconsider.

The Greater Insistent Door Knocker no longer needs to remain in place as the sole surviving carrier of the Parlor relationship.

The stabilized Keeper may offer it to Darkwing as thanks.

### Systems Established
**Context restoration, fixed procedural topology, local direction versus historical adjacency, location-Sources, Ward focus, true evidence reproduced in false placement, holistic reconstruction testing, Class as wrong-Context count, and institutional preservation learning from controlled opposition.**

## Set the Hearth

Darkwing can make a Context submission in **any Hearth copy**.

The procedure cannot be completed while a House Keeper Incursion is active.

### Requirements
- the **Greater Insistent Door Knocker** is placed in the witnessed Parlor / South Context slot;
- Darkwing has arranged any recovered puzzle objects among the other five Context slots in that same Hearth;
- the slate is quiescent and has asked whether everything is where it belongs.

If the Knocker is not in its known Parlor slot, the slate does not score the arrangement. It writes a direct refusal such as:

> **PUT IT BACK**

The Parlor relationship is a given, not one of the five scored unknowns.

### Commit the Arrangement
A creature writes a deliberate affirmative response on the slate: *yes*, *it is*, *everything is in place*, or equivalent.

No skill check is required.

The slate evaluates the five unknown historical relationships:

- **North → Kitchen → service bell**
- **East → Study → framed picture**
- **West → Garden Room → hat stand**
- **Up → Bedroom → slippers**
- **Down → Storage → household key board**

An absent object counts as incorrect.

An object in the wrong Context slot counts as incorrect.

### Failed Submission
Count the five incorrect relationships.

If the result is **1–5**:

1. set the Veiled House's Class equal to that number;
2. form a fresh Ward at full HP for that Class;
3. erase Darkwing's affirmative response;
4. fill the slate with **STOP STOP STOP STOP STOP**;
5. manifest the **House Keeper Reconstruction** adjacent to the slate or in the nearest legal space.

The Incursion does not identify which relationships were wrong.

While it remains active, the slate rejects all further submissions.

After the House Keeper is Dispersed, the rejected Context claim no longer satisfies the Reconstruction Condition. The slate clears and Darkwing may revise the arrangement before trying again.

### Correct Submission
If all five scored relationships are correct, Context is Restored.

No hostile Incursion manifests.

Instead:

- the impossible house topology settles back toward the coherent historical house;
- the repeated Hearth copies cease to function as separate maze nodes;
- separated creatures are returned safely into the corresponding real household spaces;
- the forgotten Keeper manifests coherently beside the Hearth table.

The stabilized Keeper is no longer a combatant and does not require a creature stat block.

The Greater Insistent Door Knocker is now safe to remove without reopening the Wound because the Parlor relationship is no longer carried only by that object's physical placement.

## Stabilized House Keeper
When Context is Restored, the same Wound resolves into the coherent forgotten Keeper who once lived in the house.

They were a committed Order of Theia institutionalist who believed the early Witness movement threatened the Colony's ability to contain mnemonic danger.

Their own forgotten house became the evidence that changed the relationship between the institutions.

The stabilized Keeper can speak calmly, read the surviving Study notes, and understand what happened after their Reading.

They need not instantly agree with every Witness position.

The important difference is that they can now reconsider rather than compulsively enforce an incomplete institutional answer.

The Keeper may offer Darkwing the **Greater Insistent Door Knocker**:

> **You know where it belongs now.**

The hidden room behind Storage is ordinary physical space and does not require an additional creature or Source profile.

## If the Party Does Not Intervene

Leaving the last correct Context object untouched prevents the first authored manifestation. After Dispersal, time alone does not reconstruct the Keeper: a new false affirmative submission is required. Keep discovered rooms and records available on return. Do not use an unseen reset to punish taking a break.
