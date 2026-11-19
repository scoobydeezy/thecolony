---
id: encounter.milltown
slug: milltown
name: Milltown
summary: Under Totality, Milltown remembers its floods without water.
function: Dawn Front
synopsis: >-
  Generations of River Foam floods have replaced Milltown's houses and street plans, leaving only a handful of shelters.
  Under Totality the district's Wound recalls several historical floods at once without producing visible water:
  residents are dragged by currents no one can see, and the living Floodwarden's modern ward cannot stop a remembered
  flood. A black Veiled Floodwarden follows incomplete historical instructions that protect one street and endanger
  another. Darkwing coordinates a cooperative rescue of six endangered civilians through limited shelter and routes; the
  true problem is Pattern and Context under historical pressure, not a monster to defeat. Milltown is the Dawn front:
  the number rescued sets the Assembly Hall's finale capability and its Finale Pressure.
part: part.act-3
chapter: the-five-fronts
order: 3
event: event.totality
route: Dawn
leadsTo:
  - to: encounter.the-burden
    thread: thread.the-dusk-of-the-dawn
links:
  - faction.dawn-assembly
  - location.milltown
  - asset.assembly-hall
status: draft
provenance:
  - doc: Campaign Outline
    heading: Session 10 — Shattered > Milltown — The Flood Without Water / Dawn Civilian Crisis
  - doc: Encounters
    heading: 15. Milltown — The Flood Without Water
  - doc: Encounters
    heading: 15. Milltown — The Flood Without Water
readiness:
  status: compiled
---

## At the Table

**Objective:** rescue six civilians from remembered floods and changing streets. **Board:** sixteen tiles, four fixed shelters, eighteen-card deck, three debris pieces and three autonomous barriers. **Turn order:** PCs, Floodwarden, Flood. **Score:** 5–6 rescued Stable; 3–4 Damaged; 0–2 Lost. **Escalation:** each rescued or lost civilian increases cards and triggers erosion.

## Mechanical References

Use :ref[Flood Without Water]{#hazard.milltown-flood} for provisional checks and physical damage, and :ref[Floodwarden Barrier Routine]{#hazard.milltown-floodwarden} for the autonomous actor. The exact map, cards, token procedures and rescue score below remain authoritative for the board.

### Narrative Container and Design Intent
Milltown lies along the **northern shore of the River Foam**, in a floodplain. Generations of floods have washed away and replaced most of its houses and streets. Only a few substantial buildings remain from one flood to the next. Historically, a designated **Floodwarden** maintains the Colony's magical protection against real river flooding. The **present-day ward is still working**. Under Totality, the district's environmental Wound recalls **multiple historical floods and obsolete street plans at once**, producing violent flooding **without visible water**. The remembered currents harm and carry Milltown residents; Darkwing, having no historical connection to those floods, is not itself carried or drowned by that remembered water. Real debris and physical structures can still hit PCs.

**Opening beat:** the living Floodwarden reaches Darkwing, urgently asks for help, and is swept away mid-sentence by a current nobody can see. His fate is not immediately confirmed. His dropped focus/staff and the history of the office provide recognizable Pattern and Context. A pure-black **Veiled Floodwarden** appears and resumes the historical duty. It is not necessarily the living warden's ghost or any one predecessor. It is a reconstruction of the obligation to protect Milltown. It follows **its own deterministic instructions**; sometimes its barriers protect civilians, sometimes they route flood toward them. It is **not a required fight, persuasion puzzle, or controllable helper**.

**Play identity:** a cooperative rescue board game using Pathfinder's normal three-action turns on a dynamically changing battlefield. Darkwing cannot rotate street tiles or command the Floodwarden as a special minigame action. The party's agency comes from **placement, movement, coordination, transport, timing, preparation, and ordinary PF2e abilities**. The battlefield is the opponent. This section is the **tabletop encounter procedure**, included here in detail so the physical version can be recreated; creature stat blocks and level-dependent PF2e numerical tuning remain in the mechanical reference entries linked on this page.

### At-a-Glance Materials and Rules

| Component | Working authored configuration |
|---|---|
| Board | **4 × 4** numbered tiles; **25 ft × 25 ft** each (5 × 5 standard 5-foot squares); north is top, River Foam / loss boundary is south |
| Fixed terrain | **Four permanent shelter tiles: 2, 8, 9, 15**; no rotation or flip |
| Mutable terrain | **Twelve** double-sided tiles, each rotatable; once turned to its washed-away face, stays washed away |
| Civilians | **Six** two-sided tokens **A–F**, Floating / Submerged; all begin Floating |
| Debris | **Three** pieces: Wagon, Timber Wall, Mill Wheel; reappear in their fixed northern lanes |
| Floodwarden | Three distinct movable magical barriers: **Straight**, **L / Corner**, **U / Horseshoe**; autonomous placement instruction, not PC-controlled |
| Flood Deck | **18 cards**, one shuffled deck: 8 Historical Memories, 6 Surges, 4 Crises; resolve cards **sequentially** |
| Flood escalation | **1 + Rescued + Lost** cards on the Flood's next turn, up to six while one civilian remains |
| Erosion | **One 2d4 paired-coordinate roll** each time a civilian is Rescued or Lost; flip both eligible coordinates immediately |
| Initiative | PCs act normally; Floodwarden then Flood hazard act late in round as separate initiative participants |
| Win condition | All six civilian tokens leave the board as **Rescued** or **Lost**; 5–6 saved = Stable, 3–4 = Damaged, 0–2 = Lost **Dawn front / evacuation operation** |

**Vocabulary:** A **card** is one fully resolved historical instruction; a **Flood turn** is the environmental hazard's one initiative turn containing all its cards; a **Push** is one card instruction moving eligible tokens up to its printed number of **tile transitions**. There is **no consolidation of pushes** across cards. A **shelter** comprises the fixed building's secure interior and an adjacent, exposed street/entrance; merely passing through a shelter tile is **not** rescue. A **route** is a sequence of legal open street exits for remembered flow; it is not the PC's movement allowance.

### Exact Authored Tile Map — North at Top, South at River

Row-major numbering is fixed. **Front / intact** connections are shown as cardinal directions (`N E S W`). **Back / washed-away** is a more open T (one closed edge) or crossroads (`N E S W`). `T closed E` means open `N, S, W`. A tile's rotation applies to the entire printed street design, including the back face: turning over a previously rotated tile **preserves that rotation**, and subsequent rotations remain legal. At setup all tiles are front-up in the orientations below. Permanent shelter tiles act as permanent crossroads for remembered routes; their **interiors** remain physically sheltered even when their street connection is part of a flow.

| Row | Col 1 (west) | Col 2 | Col 3 | Col 4 (east) |
|---|---|---|---|---|
| **1 — North** | **1 Weaver's Row** — E,S; back T closed E | **2 Old Mill** — permanent shelter / crossroads | **3 Millrace North** — N,S; back crossroads | **4 Granary Lane** — S,W; back T closed S |
| **2** | **5 Chandler's Cut** — N,S; back crossroads | **6 High Street** — E,W; back T closed E | **7 Millrace Middle** — N,S; back T closed N | **8 Floodwarden's Tower** — permanent shelter / crossroads |
| **3** | **9 Guildhall** — permanent shelter / crossroads | **10 Market Square** — N,W; back crossroads | **11 Millrace South** — N,S; back crossroads | **12 Lock Yard** — N,W; back T closed W |
| **4 — River** | **13 Tannery Walk** — N,E; back T closed N | **14 Ferry Steps** — S,W; back crossroads | **15 Boathouse** — permanent shelter / crossroads | **16 Boatwright's Slip** — N,S; back T closed N |

**Physical tile contract:** print the tile number and name in a fixed-reference corner; mark **north** on both faces; show actual road openings and blocked edges at the tile perimeter; identify the shelter doorway and secure interior on fixed tiles. Rotating changes open edges and obstacles **but does not rotate miniatures or give anyone free movement**. If the newly presented wall overlaps a miniature, move it to the closest legal space within its current tile (tie-break north, east, south, west) without granting progress toward a destination. This is an encounter-specific physical-mapping convention, not a new PF2e movement action.

**Baseline miniature placement:** for the large-scale flood-routing game, put each uncarried civilian and debris token on its current tile's central street square, shifting within that tile to a legal street square when geometry changes. PCs use ordinary positions on the printed 5-foot grid. Each eligible token's **one tile transition** represents 25 feet of hazard-forced movement to the next tile, not an action or Stride. Secure building interiors are excluded from the remembered route and debris collision zone; shelter door and streets are not.

### Initial Civilians and Debris

| Token | Begins on tile | Initial anticipated route / dramatic function |
|---|---|---|
| **A** | **7** Millrace Middle | 11 → 15 → river; visibly urgent, passes the Boathouse |
| **B** | **13** Tannery Walk | 14 → river; visibly urgent, beside Guildhall's area |
| **C** | **1** Weaver's Row | 5 → 9 → 13 → 14 → river; long drift past Guildhall |
| **D** | **10** Market Square | 9 → 13 → 14 → river; apparently manageable until routes change |
| **E** | **6** High Street | Initially walled in; an apparently safe position that becomes dangerous when opened |
| **F** | **12** Lock Yard | Initially walled in near Floodwarden's Tower; genuinely sheltered until terrain changes |

These initial paths describe **intent and starting geography**, not unalterable rails. On every Push, use the **current** tile rotations, flipped sides, and Floodwarden barriers.

| Debris | Fixed re-entry lane | Characteristic initial route |
|---|---|---|
| **Wagon** | **1** | 5 → 9 → 13 → 14 → river, through Guildhall's street |
| **Timber Wall** | **3** | 7 → 11 → 15 → river, down the Millrace |
| **Mill Wheel** | **4** | 8 → 12, often lodges near Lock Yard before fading and returning |

**PC arrival:** narrative default is entry from the Guildhall approach (**tile 9**), but respect actual party location, reconnaissance, and what the party did before initiative. Simulation benchmarks also tested **one PC at each of the four shelters**; do not give that advantageous deployment for free if the fiction doesn't support it. An established pre-positioned party legitimately starts staged. The apparent safety of D and E versus A and B is **intentional**; don't equalize civilian starting danger.

### Current Presence and Routing — Locally Remembered Flow (Model B)

**The northern edge is the remembered upstream direction and debris re-entry side; the southern edge is the only loss exit.** However, this is **not** a physical water-volume simulation and **does not require continuous connectivity to a north-edge source**. Each street and inhabited segment may independently remember flooding. A token on an exposed street can be moved whenever a valid downstream/lateral route opens, even if its tile is not connected to the top row. This rule supersedes the earlier north-source-only and branching-source prototypes, which left much of Milltown inert.

For each individual **one-tile push step**, determine a token's next legal exit from its current street tile using this deterministic priority:

1. **South**, if currently open and not blocked by a magical barrier, and the destination can receive the flow (or it is a south-edge exit).
2. Otherwise **continue in the same lateral direction** (east or west) if already moving laterally and still legal.
3. Otherwise choose **east before west** among legal lateral exits.
4. **Never flow north**; do not immediately reverse east↔west, re-enter the same tile in the same Push instruction, or loop. If no eligible exit exists, the token stops until later geography changes.

A normal street connection is legal only if **both touching edges** are open. East and west edges of the whole board are impermeable; tokens never leave via those sides. The southern edge is the only boundary a moving civilian/debris can leave through. A Floodwarden spillway can create a **remembered-water-only** connection across otherwise blocked geometry as specified below. The routing preference is evaluated **again after every tile transition**, so changed geometry takes effect immediately; a card cannot push a token more steps than its printed limit.

**Expose vs move:** street portions of a tile with remembered flood are exposed whether or not the water is visibly represented. A token cannot *travel* until it has a legal outlet under the above priority. Civilians already secured inside a shelter are not exposed. Civilians being carried/secured by a PC travel with the PC rather than separately along the current; their grip can nevertheless be threatened by specified hazards. PC bodies are not shoved or drowned by the remembered current alone, even when standing on an exposed street.

**Push N:** apply up to `N` successive tile transitions to **every eligible free civilian and debris token**, tracing its own route. **Debris Push N** affects debris alone. **Push N, civilians only** affects uncarried civilians alone. Process simultaneous tokens consistently by token ID (civilian A–F, then Wagon, Timber Wall, Mill Wheel) for bookkeeping; routes are read from the board as it stands at the start of that Push instruction, except immediately triggered state changes, collisions, or removals. No token gets extra movement simply because another token crossed its tile. A card can contain multiple separate Push instructions; **resolve each printed instruction in order**.

### Civilian Tokens — Floating, Submerged, Rescued, Lost

A civilian begins **Floating** (front side) unless specified otherwise. The reverse is **Submerged**. Both can travel through remembered routes and both can be rescued. A token changes state physically by flipping it; no extra counter is required.

- **Floating reaches a southward loss exit:** if its **next movement step would carry it off the southern edge**, stop on the edge tile instead, flip to **Submerged**, and cancel the remainder of **that Push instruction** for this token. Its next card or distinct Push instruction can move it again. Merely arriving at the bottom row does **not** flip it until it would actually leave.
- **Submerged reaches a southward loss exit:** when its next movement step would cross the southern edge, immediately remove it as **Lost**. A second card in the same Flood turn can kill a token the preceding card just Submerged. **Cascades are deliberate; do not pool cards into one consolidated flood event.**
- **Crisis submersion:** specific effects can flip a Floating token to Submerged anywhere, including in an otherwise sheltered-looking historical pocket. Submerged does **not** automatically reset to Floating and does not automatically die while still on the board.
- **Rescue:** a civilian must reach a **shelter doorway / secure entrance** on tile **2, 8, 9, or 15**, and a PC must spend **one ordinary Interact action** to admit or physically secure the civilian there. Only then remove it as **Rescued**. A token washed naturally onto a shelter tile remains at risk until a PC Interacts; it cannot rescue itself. A civilian can be brought there by legal ordinary movement/transport, or by the flood.

**Moving and holding civilians:** use Pathfinder's existing Stride/Step/Leap, Interact, Athletics, Aid, and spell/equipment options, not a bespoke tile-movement action. For the working physical prototype, an adjacent PC can use **Interact** to take hold of one willing/unresisting civilian token, then carry/escort it along with the PC's ordinary position and movement; apply normal encumbrance, size, and magic limitations when material rather than granting free tile hops. A held token is not separately pushed by remembered water until dropped. A meaningful rope, harness, or secured shelter point can prevent a loose drop or change the consequence of a failed check if established with ordinary actions before the hazard. If the carry/escort case falls outside an existing PF2e action, use a consistent table adjudication, **not an additional universal minigame action**. Restrictive or unwilling NPC behavior can require appropriate ordinary checks.

**Debris-caused drop:** on a collision failure, place the formerly held civilian in the collision tile on the open street, **preserving its current Floating/Submerged side**. The same collision does not separately submerge the just-dropped civilian; subsequent instructions can move or submerge it. This matters when a failed save occurs during a cascade.

### Erosion — Paired Coordinates Immediately on Every Civilian Removal

Each time **any** civilian token becomes **Rescued or Lost**, including during a PC turn or mid-card:

1. Remove the civilian and record `Rescued` or `Lost`.
2. Roll **2d4** (`a`, `b`), corresponding to the 4-row/4-column board.
3. Target **both** tiles at `(row a, column b)` **and** `(row b, column a)`; e.g., 2 and 3 targets `(2,3) = tile 7` and `(3,2) = tile 10`.
4. **Immediately flip** each target if it is mutable and still front-up. If both dice match, target only one tile. Ignore permanent shelters and already-flipped tiles. **Never reroll** invalid or already-eroded targets.
5. The tile keeps its **current rotation** and now uses its T/crossroads reverse. New routes apply to all **subsequent steps and cards immediately**.

Exactly **one 2d4 pair per removed civilian**—no escalating number of erosion rolls. This means success and failure **both** erode Milltown. Civilian removal also increases the **next Flood turn's** card allotment, not the number of cards already drawn for the current turn.

### Debris — Physical Harm That Outsiders Can Suffer

Three debris pieces travel under **Push** or **Debris Push**, using the same local routing priorities as civilians. There are never additional permanent debris pieces. A debris piece may lodge when its path has no legal exit.

**When moving debris first enters a tile occupied by one or more PCs on exposed streets**, each such PC makes **one Reflex save per debris piece per card** (not one save per 5-foot square or each transition of a long Push). An unprotected Floating civilian occupying that tile is flipped Submerged if struck by loose debris; already-Submerged remains Submerged. This loose-civilian submersion is distinct from a PC dropping someone on a failed save.

| Debris collision result | Mechanical consequence |
|---|---|
| **Critical success** | No damage, no loss of grip, no displacement |
| **Success** | Minor bludgeoning damage (working basis: **half** full damage); retain civilian |
| **Failure** | Full bludgeoning damage **and drop a carried civilian**, if any |
| **Critical failure** | Full bludgeoning damage, **drop a carried civilian**, and the PC is physically swept **one tile** along the debris's viable route if a legal destination exists |

A critical failure moves the PC because **a real wagon / timber wall / wheel hit them**, not because the invisible water has gained authority over outsiders. If the one-tile destination is blocked, the PC doesn't move farther; resolve the collision damage and drop normally. Standard reactions, saves, and pre-positioned safety measures remain meaningful. **Debris movement is forced movement imposed by the hazard, not a PC Stride.** Each moving debris token can trigger at most one Reflex save against a given PC **per card**.

**Re-entry / fade (adopted baseline):** if debris crosses the southern boundary, remove it until **the beginning of the next Flood turn**. If debris has moved **zero tile transitions during the entire Flood turn**, it fades at the end of that turn and likewise re-enters **at the beginning of the next Flood turn**. Re-enter it in its **fixed northern lane**: Wagon tile 1, Timber Wall tile 3, Mill Wheel tile 4. The re-entry placement itself is not a collision; subsequent movement can cause one. Pieces that moved at least once but are now blocked remain on board until a later Flood turn in which they move zero times. This fixes the earlier problem where debris remained wedged indefinitely and almost never hit PCs.

**Special card override:** *The Mill Comes Apart* returns **all three** debris pieces to their lanes **immediately**, wherever those pieces currently are, without multiplying them; then it performs Debris Push 1. Pieces not moved by that push can still fade under the ordinary end-of-turn rule.

**Numerical implementation not yet final:** the simulation tested a **DC 22** Reflex check against an illustrative **+11** save; that is a simulation assumption, **not a level-appropriate permanent PF2e hazard DC for the eventual party**. Full damage dice and level-based DC must be finalized in the mechanical reference entries linked on this page when the encounter's party level and capability are known; minor damage remains half full damage. The agreed result categories and drop/displacement behavior **are** fixed design decisions. Do not silently substitute the simulation's low-level numbers into an advanced campaign.

### Veiled Floodwarden — Independent Spillway Program

The living Floodwarden's current river barrier is still protecting the real Colony. The Veiled Floodwarden's three **separate physical pieces** are mnemonic ward reconstructions that affect remembered flood routes, **not** portals the PCs can walk through. They occupy tile **street geometry** independently of whether a tile is front/back or currently rotated. His decisions do not optimize for the Party; instructions determine the result entirely. The Warden is generally protective in aggregate, but his specific moves can help or hinder a rescue.

- **Straight:** blocks **one specified side** of its assigned tile. **Spillway:** remembered current can depart by any other unblocked side even where an intact tile's physical street normally has no such outlet.
- **Corner / L:** blocks **two adjacent specified sides**. Remaining sides operate as spillway outlets, potentially sending remembered flow through otherwise solid historical walls.
- **Horseshoe / U:** encloses a **protected pocket** with one specified opening. The pocket itself shelters civilians from ordinary flood Push and protects a route's occupants; current approaching blocked edges is redirected according to normal routing. The U is chiefly protective, unlike Straight and L.

**Important overlay rule:** for water/debris/civilian **hazard routing only**, a legal spillway outlet can override an otherwise blocked street edge and create a remembered passage across its neighbor's matching wall. The barrier affects the Wound's **flood connectivity**, not ordinary physical terrain: PCs cannot Stride through a real wall because a spillway exists. Print blocked and spillway edges visibly on each Floodwarden piece. If an outlet is redirected, apply the same **south → maintain lateral → east before west → stop** priority. The U's sheltered interior remains outside ordinary Push until changed by a later Warden instruction.

**Floodwarden turn:** keep all three physical shapes in play; on the Warden's initiative **draw exactly one Floodwarden instruction**, which must specify **(a) which of the three shapes moves, (b) destination tile, and (c) blocked/open orientation**. Relocate that one shape, remove its former placement, and apply routing immediately. Treat that as the Veiled's ordinary special ability on its own PF2e turn, not an extra action for a PC. Do not reinterpret a card to help or punish a player.

**Provisional physical prototype:** the source specifies the 18-card Flood Deck but omits the separate Warden instructions and starting barriers used in its simulations. The following newly authored sequence fills that component gap for a tabletop trial. It has not reproduced or validated those simulations. Keep it visible and deterministic; do not change an instruction in response to a player’s plan.

At setup, place **Straight on tile 6, blocking S**; **L on tile 11, blocking S and E**; and **U on tile 10, opening N**. Orientations are compass directions, independent of tile rotation. A U blocks its other three sides; its protected pocket occupies the tile’s central street area. Tokens there are sheltered from ordinary Push while the U remains. This is temporary protection, not a permanent shelter or a scored rescue.

On each Warden turn take the next row, move only the named piece, and apply its orientation. After row 9 return to row 1. Do not shuffle. Keep the other two pieces where they are. Tile flips and rotations do not rotate these overlays. The sequence never puts two barriers on the same tile.

| Turn in cycle | Piece | Destination tile | Orientation |
|---|---|---|---|
| 1 | Straight | 7 | Block S |
| 2 | L | 12 | Block S and E |
| 3 | U | 14 | Open N |
| 4 | Straight | 3 | Block E |
| 5 | L | 5 | Block N and W |
| 6 | U | 6 | Open W |
| 7 | Straight | 7 | Block W |
| 8 | L | 11 | Block N and E |
| 9 | U | 10 | Open N |

When the U leaves, occupants remain on their tile and become exposed to subsequent instructions; moving the barrier itself does not carry, rescue, or submerge them. Place the next instruction beside the board so players can plan around it. Review this sequence for dead ends, rescue rates, and difficulty with the actual party before treating it as final.

### Flood Deck — Authored Eighteen Cards (v1 + Three Accepted Edits)

**One shuffled 18-card deck**, 8 Historical Memories, 6 Surges, 4 Crises. Use each card exactly once per pass through the deck; when the draw pile is exhausted, reshuffle the discard pile and continue. If the same card comes up again, its rotations still work; repeat **flip** instructions do nothing to already-washed-away tiles. Years are **placeholders in Milltown's local historical reckoning**, not verified Golarion calendar dates.

**Printed instructions are normative.** A plain **Push N** advances loose civilian **and** debris tokens along valid remembered routes by up to N tile transitions. **Debris Push N** affects only debris. **Push N (civilians only)** affects only loose civilians. Resolve **each phrase in printed order**, including separate pushes on the same card. Card geography effects take place before later effects on that card. The accepted revisions to the source deck are already applied here: #5 changes tile 4 to **tile 5**; #17 adds the **Push 1 fallback**; #18 becomes **The Mill Comes Apart** and resets **all three debris pieces** before its push.

| # | Historical card | Year | Type | **Exact printed instructions** |
|---:|---|---:|---|---|
| **1** | The Long Spring | 412 | Memory | **Rotate 1, 5, 12 clockwise 90°. Flip 13, 16. Push 2.** |
| **2** | The Millrace Breach | 377 | Memory | **Flip 7, 11. Debris Push 3.** |
| **3** | The Ice-Dam Winter | 390 | Memory | **Rotate 4, 12 counter-clockwise 90°. Rotate 16 clockwise 90°.** |
| **4** | The Cooper's Flood | 431 | Memory | **Rotate 5, 6, 7 clockwise 90°. Push 1.** |
| **5** | The Night of Bells | 402 | Memory | **Flip 3, 5, 11, 14.** *(Accepted revision: tile 5 replaces tile 4.)* |
| **6** | The Wardens' Folly | 418 | Memory | **Rotate 10, 11 by 180°. Push 2.** |
| **7** | The Tannery Rise | 365 | Memory | **Rotate 13, 14 clockwise 90°. Flip 1. Push 1.** |
| **8** | The Ninefold Rain | 444 | Memory | **Rotate 3, 4, 7, 12 clockwise 90°. Debris Push 2.** |
| **9** | The Patient Flood | 398 | Surge | **Push 1 (civilians only).** Deliberate low-pressure / breather card; no added effect. |
| **10** | Freshet of the Sowing | 426 | Surge | **Push 1.** |
| **11** | The Fuller's Surge | 409 | Surge | **Push 2.** |
| **12** | The Weir Gives Way | 437 | Surge | **Push 2.** |
| **13** | The Great Foam | 356 | Surge | **Push 3.** One copy in deck. |
| **14** | The Mill Wheel Runs | 381 | Surge | **Debris Push 2. Then Push 1.** Two distinct pushes; debris can move during both. |
| **15** | Undertow | — | Crisis | **Each PC carrying a civilian through an exposed remembered-current street attempts the grip check; on failure, drop the civilian (preserve their current face). Then Push 1.** PCs entirely within sheltered interiors are not targeted. |
| **16** | Sudden Crest | — | Crisis | **Push 1. Then Debris Push 1.** Two distinct pushes; debris can move during both. |
| **17** | Beneath the Surface | — | Crisis | **The southernmost Floating civilian not currently being held (ties: easternmost) flips Submerged, even if its street looks sheltered. If no civilian qualifies, Push 1.** *(Accepted revision.)* |
| **18** | The Mill Comes Apart | — | Crisis | **Return all three debris pieces to their designated northern lanes, regardless of current positions. Debris Push 1.** *(Replaces Collapsing Wall; accepted revision.)* |

**Undertow grip check:** use the same level-calibrated Reflex / grip difficulty established for physically holding a civilian against sudden force; do not add a new non-PF2e action. A failure drops the civilian in the PC's street tile, preserving Floating/Submerged. A success retains the civilian. When the printed card has no eligible carrier, go directly to its Push 1. This restriction to exposed carriers prevents an invisible flood from grabbing civilians safely inside a fully sheltered building without any recognizable contact.

**Card designer intent:** some Memory cards deliberately rotate or erode streets **without moving anybody**. This is not an error; the new route threatens later pushes. The Patient Flood is a deliberate occasional breather. Only the three specific edits noted above are applied to the uploaded v1 card list; do not silently revise the other fifteen cards while printing.

### Turn Order — The Flood Is One Complex Hazard

Use normal PF2e encounter rounds and each PC's **ordinary three actions and reaction**. The Warden is an independent creature with its own turn; the flood has **one complex-hazard initiative position**. For the agreed starting prototype, arrange the Warden and Flood **late**, with the Warden acting immediately before the Flood, so the party ordinarily plans and acts **before** the board's catastrophic response. This is a deliberate encounter initiative placement, not a claim that all PF2e hazards universally act last. Normal Delay, Ready, reactions, and other standard initiative consequences remain in effect.

1. **PCs:** take normal turns, moving through actual 5-foot grid space, rescuing via Interact, securing civilians, casting spells, improvising. Any rescue completed during a PC turn immediately triggers its **erosion roll**. Keep the current geography for subsequent turns.
2. **Veiled Floodwarden:** draw **one** pre-authored Warden instruction and relocate exactly the indicated barrier with its listed facing. New flow connections apply immediately.
3. **Flood begins:** return any debris pieces scheduled to re-enter in their fixed northern lanes. Snapshot **card count = 1 + Rescued + Lost** (no cards once all six are resolved). Draw that many Flood cards.
4. **Resolve card 1 completely:** rotations, flips, separate pushes, collisions, grip checks, token removals, erosion on every removal, each in printed order. Continue card 2, card 3, etc. **Never pool all pushes into a single movement event.** Cascades can submerge and then remove a civilian during one Flood turn, with no new PC turns in between.
5. **After the last card:** debris pieces that made **zero tile transitions in the whole Flood turn** fade for next-turn re-entry. Update the displayed **next turn's card count** from the new resolved total. Proceed to the next PF2e round unless all six civilians are resolved.
6. **Finish:** the moment the sixth civilian becomes Rescued/Lost, stop resolving this encounter's flood scoring, record the final operation condition, and apply the faction/state handoff below. If that happens during a card, no further cards are necessary. Do not run a postscript erosion after the encounter ends for any tactical purpose, though its roll may be made to preserve the board's final visible state if desired.

**Cadence example:** after two civilians have already been rescued, the Flood's next turn draws **three** cards. Card 1 pushes a Floating civilian toward the southern exit, forcing it to stop and flip Submerged. Card 2 pushes it out: **Lost**, recorded immediately; a 2d4 erosion roll flips eligible tiles before Card 3. Card 3 uses the **new** board. The Flood does not draw a fourth card mid-turn; the next Flood turn would draw four if another civilian remains.

### Player Leverage Within Ordinary Pathfinder Rules

- **Positioning:** assign PCs to shelter entrances, threatened civilians, and downstream interception points; a spread party rescues more reliably than everyone chasing the closest person.
- **Travel:** PCs use normal Stride/Step/Leap/Fly/teleportation and difficult terrain where the actual layout demands. **No one gets one free tile of movement per action.** A 25-foot-Speed PC can ordinarily cross roughly one 25-foot tile with a Stride only if a legal path actually connects those squares.
- **Handling:** use Interact for picking up/securing a willing civilian and another Interact to admit them at a shelter; Reposition, Aid, carrying, rope, prepared harness, and magic can change outcomes as their actual PF2e effects allow. A carried token travels with its PC; it is not a separate flood pawn until dislodged.
- **Planning around escalation:** a completed rescue and a loss **both** increase next-turn cards; the party may deliberately stage people near safe entrances, but unsaved tokens remain vulnerable. This is intended strategic tension, not an exploit to forbid.
- **Debris:** Reflex results produce damage and can separate a PC from a civilian or throw the PC one tile. Reaction windows and ordinary protective abilities still apply.
- **The Floodwarden:** not a route-control console. His three shapes are autonomous environmental modifiers. Altering his personal imperative, physically ending an Incursion, or taking up the living staff would be a **separate fiction-driven Veiled intervention**, not a default minigame control or mandatory solution.
- **Outsider immunity:** remembered currents cannot directly carry the PCs. This does **not** confer immunity to collapsing masonry, debris Strikes, or other material collisions; it also does not extend automatically to local residents a PC is trying to protect.

### Evaluation and Operation → Finale Handoff

When all six civilian tokens have been resolved, grade **the Milltown evacuation operation**:

| Civilians **Rescued** | Evacuation outcome | What it signifies |
|---:|---|---|
| **5–6** | **Stable** | Most present-day residents represented by the six tokens reached durable safety; rescuers preserve broadly effective response capacity |
| **3–4** | **Damaged** | Some evacuation succeeds but casualties and disruptions strain the response |
| **0–2** | **Lost** | Evacuation fails at scale; personnel and capability tied to this operation are effectively lost |

**The civilian-rescue score is the single Dawn-front outcome.** **Stable** (5–6 rescued) = **+2 Finale Pressure** and **full Dawn/Assembly Hall finale capability**; **Damaged** (3–4) = **+1** and **half capability**; **Lost** (0–2) = **+0** and **no Dawn contribution**. These are the same state, not three rolls or records. The result measures Dawn's effective organized response, not the physical destruction of the Assembly Hall building. *The Burden* specifies the full/half effects.

**Direct intervention** uses the actual rescue result and recorded player actions. **Delegation or omission** resolves the same Dawn-front condition using a concrete champion, committed resources, and the prepared deadline; mere attendance or delegation does not guarantee a tier. Record any additional consequences for people or other factions as world facts, **not** as independent adjustments to Dawn's front/Asset/Finale Pressure value. :ref[the faction rules]{#rule.faction-goals} owns the simultaneous-front and clock rules.

The present River Foam's protective ward may still work after the encounter; the historical environmental Wound does **not** automatically resolve when six citizens have been evacuated. Rescuing people and ending the emergency response are not the same as Restoring all the district's historical Context or permanently Anchoring its Weight. A surviving Veiled Floodwarden can remain a dangerous but often protective unresolved Reconstruction.

### Prototype Evidence, Reproducibility, and Open Print Decisions

**Source of authored board and cards:** *Milltown Flood Deck v1* (November 6, 2026), with the three explicit card revisions accepted immediately afterward. The v1 agent reported **2,000 Monte Carlo games per scenario** on its original card list: staged PCs 54% Stable / 45% Damaged / ~0% Destroyed, together-start PCs 31% Stable / 67% Damaged / 2% Destroyed; perfect rescues 16% versus 7%. The reported results **predate** the three accepted card edits, so they are **not new validation numbers** for the revised print deck. These figures describe a greedy agent, not real Pathfinder players.

**Validated design observations from the agent's prior analysis:** staging matters; early losses are rare; two apparently safer civilians (D Market Square and E High Street) account for disproportionate losses; debris drop-on-failure gives meaningful rescue disruption; cascading card resolution is intentional; the Warden's autonomous moves sometimes help and sometimes hurt. Preserve these patterns during physical testing rather than equalizing all six starting risks.

**Still to print or tune (do not treat as settled):**

1. **The Floodwarden instruction deck** and the exact initial three barrier placements/orientations. Each card must print **shape, destination numbered tile, blocked edge(s) or U opening**. Choose and freeze a full list before the physical playtest; its mix must be tested against the published results.
2. **Exact 5-foot-grid art**, street widths, shelter door squares, and collision footprint of large debris / moved barriers. The 25-foot tile extent and route openings are locked, but art geometry must preserve those openings.
3. **PF2e party-level DCs and damage dice**, carry/grip adjudication for differing PC sizes/abilities, and any numerically statted Veiled Floodwarden. The v1 sim's illustrative check isn't a final stat block.
4. **Hands-on workload:** time to resolve up to six fully sequential cards; visibility of flipped/rotated streets, legal flow connectors, debris/held tokens, and sheltered doorways. An unresolved overloaded turn calls for physical layout / printing improvements first, not automatically abolishing cascades.

**Systems Exercised:** environmental **Wound / Context**, overlapping historical flood Events, autonomously reconstructed civic Pattern, inherited magical ward, shifting topology, remembered force versus genuine physical collision, existing PF2e actions under an environmental complex hazard, cooperative triage, intervention-to-faction-state handoff.

## Front Handoff

Use :ref[Act III Front Outcomes]{#rule.act-three-fronts} to apply prior Asset damage and record one Dawn front result. The living Floodwarden’s fate follows actual rescue and evidence; his disappearance does not automatically prove death.

:::design
The source deliberately left level-specific hazard values and a combat-capable Warden profile open. Numerical debris rules are provisional; the Warden remains an autonomous routine with no invented combat objective. This limitation remains in the review ledger.
:::
