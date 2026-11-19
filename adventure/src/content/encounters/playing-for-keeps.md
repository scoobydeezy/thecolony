---
# yaml-language-server: $schema=../../../schemas/encounter.schema.json
id: encounter.playing-for-keeps
slug: playing-for-keeps
name: Playing for Keeps
summary: A corrupted Engram recorded from a Veiled becomes a Source. The recording is accurate; the subject was not.
function: "Identity: Memory"
synopsis: >-
  EGRESS loads one of five corrupted OCC Engrams, recorded from a Veiled Incursion rather than a verified person, into the Vault's comparison Core. At full strength, identity comparison supplies Recognition: the record that remembers being someone becomes a Source and reconstructs its Occlusion physically in the Core as the Vault locks down. Trapped and stalked, Darkwing tests authentic candidate Engrams one life at a time, reading each destructive response to deduce whose experience the corrupted record falsely claims. Restoring the correct authentic Memory makes the false experiential model untenable.
part: part.act-2
chapter: the-manor-routes
order: 6
event: event.the-institute
leadsTo:
  - to: encounter.the-breach
    thread: thread.egress
links:
  - npc.orlombuthalde-nix
  - asset.occlusion-containment
  - asset.engram-vault
variesBy:
  - branch.the-reading
variants:
  - key: succeeds
    when:
      - path.the-reading-succeeds
    summary: Vara's pre-Reading Engram is among the candidates, and the Party reacts to it without knowing why.
    synopsis: >-
      EGRESS still holds Vara's pre-Reading Engram under her recorded identity, though no one consciously remembers her, and it sits in the comparison set as an ordinary candidate. The Party's possessions, habits, and unexplained reactions respond to it and to her compass, but those reactions do not replace the deterministic comparison: Darkwing must still deduce the corrupted record's subject from evidence.
    links:
      - npc.vara-cairn
      - npc.orlombuthalde-nix
  - key: stopped
    when:
      - path.the-reading-is-stopped
    summary: Vara meets her own Engram and her father's among the candidates.
    synopsis: >-
      Living Vara can encounter both her own pre-Reading Engram and Marek's archived record as ordinary candidates inside the comparison set. Their presence makes the route intensely personal without either being the hidden subject; the danger is letting recognition and grief stand in for the comparison the Core demands.
    links:
      - npc.marek-cairn
      - npc.vara-cairn
      - npc.orlombuthalde-nix
status: draft
readiness:
  status: compiled
provenance:
  - doc: Campaign Outline
    heading: Manor Route 3 — EGRESS Institute
  - doc: Encounters
    heading: 8. Playing for Keeps — EGRESS Engram Vault
  - doc: Encounters
    heading: 8. Playing for Keeps — EGRESS Engram Vault
---

## At the Table

**Objective:** identify the subject by exact comparison results, Disperse the stalker, and reintegrate authentic Memory through the Core. **Board:** six sectors and one Core; eighteen candidate Engrams; one of five OCC records selected by the Party. **Track:** open routes, Closure Capacity, loaded/validated candidate, hidden stalker position, and Source Pressure during Dispersal.

## Reference at the Table

Use :ref[the corrupted Engram]{#source.corrupted-engram} and :ref[the stalking Occlusion]{#creature.corrupted-engram-occlusion}. The boards, candidate table and comparison procedure belong here.

### Narrative Container
Darkwing follows a damaged EGRESS reference on the Observer's Manor map:

> **`#-9.#3/#-OCC/R#22-3`**

EGRESS can read enough of the notation to identify the filing grammar but not enough to identify one record. `OCC` marks an Engram transcribed from an EGRESS **Occlusion**—a Veiled Incursion—rather than directly from a verified person.

The archive search returns exactly five quarantined corrupted Engrams matching the surviving reference:

| Record | Sector Domain | Safe Catalog Description |
|---|---|---|
| **A-9.13/b-OCC/R122-3** | Autobiographical | Persistent first-person identity assertion; domestic recollection |
| **B-9.43/d-OCC/R122-3** | Procedural | Repeated task sequence; strong completion imperative |
| **C-9.63/a-OCC/R022-3** | Spatial | Persistent route-seeking behavior; recurring inaccessible destination |
| **E-9.73/c-OCC/R122-3** | Interpersonal | Repeated recognition of an unidentified second party |
| **F-9.93/e-OCC/R022-3** | Affective | Severe attachment/grief response; identity assertion under distress |

The damaged notation genuinely does not distinguish them. Darkwing chooses which record to investigate.

The encounter identity is:

> **A cross between Guess Who and Mastermind while trapped and being stalked by a monster.**

### Institutional Arrival — Frames and Proxies
If this is Darkwing's first visit to EGRESS, automaton **Frames** guard the entrance and enforce access literally. Without recognized credentials they deny entry, escalating with perfect procedural calm until initiative is about to begin—or has just been rolled.

Orlo then arrives, invokes the appropriate authorization, and orders the Frames to stand down. The beat establishes EGRESS as advanced, competent, literal, and deeply dependent on classification.

Inside, EGRESS can demonstrate Engram technology safely before the Vault experiment. Orlo loads an authentic Engram into a Frame; the loaded automaton becomes a **Proxy** and begins expressing first-person Memory from the record.

The demonstration should establish the crucial limitation explicitly:

> **A Proxy expresses an Engram's Memory. It does not thereby become the person or acquire the rest of that person's Identity.**

Veyra's personal Proxy can make that distinction emotionally concrete. It carries Memory from someone records prove was once important to her, while Veyra no longer consciously possesses the Relationship that connected them.

EGRESS is also interested in Darkwing as a research opportunity. The Party has survived multiple Occlusions, handled Sources, and entered the Ritual Chamber. Veyra can offer voluntary baseline Engrams to any willing Party member while explaining that a preserved Memory creates future options without promising resurrection.

### Why EGRESS Loads an OCC Record
EGRESS has safely inspected corrupted Engrams at low intensity, but it has **never loaded one into the full Engram Core identity-comparison lattice**.

Orlo notices the `-OCC` suffix. The experiment is intentional, not a filing mistake.

EGRESS agrees to try because:

- the selected record has remained inert under lower-strength study;
- the Core is containment-rated above the measured pressure;
- authentic Engrams are compared there routinely;
- Darkwing's map clue gives a concrete reason to identify this unknown subject;
- EGRESS assumes the comparison apparatus observes mnemonic data rather than participating in it.

Darkwing chooses one of the five matching OCC records. Orlo loads that record into the Core for the first full-power comparison.

### Why the Experiment Fails
A corrupted Engram contains real first-person Memory from a false reconstruction. Its internal self-model says, in effect:

> **I was someone.**

The Core is designed to compare an unknown Engram against authentic candidates and ask:

> **Which someone?**

At full comparison strength, that question becomes **Recognition**.

The Core therefore does more than read the corrupted record. It creates a mnemonic topology linking an unresolved self-model to a finite set of authentic possible identities. Reality attempts to answer the same question EGRESS is asking and reconstructs the Occlusion physically in the Core.

The resulting Occlusion is **twice removed from the original life**: its Source is an authentic recording of a *false* first-person reconstruction, not an Engram taken directly from the actual subject. It has genuine remembered experience but no dependable bodily template. Its baseline appearance is an almost-human black silhouette whose proportions, limbs, and posture refuse to settle. It manufactures a hand, reach, or face-like boundary only as needed, then loses it. The instability is Form-like presentation of a corrupted **Echo / Pattern** phenomenon; it does **not** change its Reconstruction or Resonance type into Composite or Form.

This failure does **not** depend on Darkwing carrying a particular Relationship and therefore works on both Reading branches. Darkwing's unusual mnemonic state can make EGRESS more interested in them without being the causal trigger.

### The Vault Board
The EGRESS emblem is a stylized top-down schematic of the Engram Vault. Use the emblem itself, or a simplified copy preserving the same topology, as the player board.

The Vault contains:

- one **central Core**;
- six surrounding sectors, **A–F**;
- one fixed comparison terminal in each sector;
- five possible routes associated with each sector.

Each outer sector has one spoke to the Core, two edge corridors shared with adjacent sectors, and two secondary corridors shared with next-over sectors. A shared corridor is CLOSED only when **both participating sectors request CLOSED**. If either endpoint requests OPEN, the corridor remains OPEN. A Core spoke follows only its outer sector's state.

Corridor numbers proceed **counter-clockwise** around each sector. Emergency Egress later teaches the same counter-clockwise reading convention in play.

### Sector Memory Domains
Sector letter classifies the **dominant kind of Memory in the Engram**, not the subject. This is deliberately separate from the Mastermind traits.

| Sector | Memory Domain | Typical Contents |
|---|---|---|
| **A** | **Autobiographical** | routines, self-narrative, habits, domestic recollection |
| **B** | **Procedural** | practiced skills, work, craft, repeated duties |
| **C** | **Spatial** | navigation, routes, layouts, environmental recall |
| **D** | **Somatic** | pain, fatigue, illness, bodily sensation |
| **E** | **Interpersonal** | conversations, encounters, remembered behavior of others |
| **F** | **Affective** | fear, grief, attachment, anger, joy, emotional peaks |

A sector therefore gives no direct information about Age, Role, or Provenance.

### Sector Closure Capacity
Every sector begins with **Closure Capacity 5** and can initially request CLOSED on all five of its routes.

A sector with reduced Capacity can request CLOSED on only that many routes; a character using its terminal chooses which routes receive the available containment power.

Because shared corridors require agreement from both ends, one damaged or Overloaded sector can reopen a corridor another sector still wants closed.

### The Eighteen Candidate Engrams
EGRESS's ordinary analysis reduces the selected OCC record to eighteen plausible authentic subjects, distributed **three per sector**.

Exactly one candidate occupies every combination of:

- **Subject Age:** Child / Adult
- **Subject Role:** Civilian / Keeper / Order
- **Engram Provenance:** Short-Term / Long-Term / Archive

That produces the complete `2 × 3 × 3 = 18` comparison space. The sector Memory Domain is independent of these fields.

Only three candidates are previously important campaign names. The other fifteen are ordinary recorded Colony lives.

| Sector | Authentic Engram | Subject | Age | Role | Provenance |
|---|---|---|---|---|---|
| **A — Autobiographical** | **A-2.11/a/R124-1** | **Varenya “Vara” Cairn** | Child | Keeper | Short-Term |
|  | **A-7.03/c/R124-2** | **Hessa Wren** | Child | Civilian | Archive |
|  | **A-4.31/b/R123-8** | **Cordan Rell** | Adult | Order | Short-Term |
| **B — Procedural** | **B-5.24/b/R123-4** | **Pépé Sylvya** | Adult | Keeper | Archive |
|  | **B-6.12/a/R121-7** | **Calder Rook** | Child | Keeper | Long-Term |
|  | **B-8.05/c/R124-2** | **Olan Pryce** | Child | Order | Archive |
| **C — Spatial** | **C-3.18/b/R123-2** | **Marek Cairn** | Adult | Keeper | Short-Term |
|  | **C-5.33/a/R120-5** | **Brisa Kett** | Adult | Civilian | Long-Term |
|  | **C-8.57/b/R119-4** | **Garrin Thale** | Adult | Order | Archive |
| **D — Somatic** | **D-2.16/a/R124-6** | **Nessa Dall** | Child | Civilian | Short-Term |
|  | **D-6.21/a/R124-3** | **Dessa Mire** | Child | Keeper | Archive |
|  | **D-4.29/b/R120-3** | **Fara Noll** | Child | Order | Long-Term |
| **E — Interpersonal** | **E-5.11/b/R122-10** | **Liora Senn** | Child | Civilian | Long-Term |
|  | **E-1.52/a/R121-2** | **Alwen Marr** | Adult | Keeper | Long-Term |
|  | **E-8.67/c/R118-8** | **Rhea Dorn** | Adult | Order | Long-Term |
| **F — Affective** | **F-2.38/b/R124-5** | **Jessa Mor** | Adult | Civilian | Short-Term |
|  | **F-7.44/c/R123-1** | **Iven Quill** | Adult | Civilian | Archive |
|  | **F-9.14/c/R124-1** | **Tovin Arl** | Child | Order | Short-Term |

The batch suffix dates transcription/archive handling rather than the remembered experience itself and therefore does not provide a fourth deduction trait.

### GM Key — The Five OCC Records
Each of the five damaged-reference matches is a real corrupted record with one fixed hidden authentic subject. Use this mapping unless campaign state gives a compelling reason to substitute another roster member before play:

| OCC Record | Hidden Authentic Subject | Hidden Profile |
|---|---|---|
| **A-9.13/b-OCC/R122-3** | **Pépé Sylvya** | Adult / Keeper / Archive |
| **B-9.43/d-OCC/R122-3** | **Marek Cairn** | Adult / Keeper / Short-Term |
| **C-9.63/a-OCC/R022-3** | **Garrin Thale** | Adult / Order / Archive |
| **E-9.73/c-OCC/R122-3** | **Varenya “Vara” Cairn** | Child / Keeper / Short-Term |
| **F-9.93/e-OCC/R022-3** | **Liora Senn** | Child / Civilian / Long-Term |

Darkwing's choice among the five records therefore authors which mystery becomes the encounter without knowing the answer in advance.

### Opening State — Before Lockdown
Before activation, the Vault is operating normally and the corridors are open.

EGRESS has six comparison terminals available. Darkwing can choose to distribute among them, send only some members outward, or remain together at the Core. EGRESS does not force the Party to split.

The selected corrupted Engram is physically loaded into the **central Core** and enters full comparison mode.

### Manifestation → Emergency Egress → Lockdown
The OCC Engram becomes a Source and an Occlusion manifests in the Core.

Every creature sharing the Core with it immediately resolves **Emergency Egress** before lockdown begins. The forced reaction uses a random cardinal starting bearing, scans counter-clockwise to the first open corridor, and uses a Reflex save to determine whether the character gets clear cleanly, flees frightened, or critically fails and remains trapped with the Occlusion. Exact action text belongs in the mechanical reference entries linked on this page.

Resolve the scatter completely.

Then **Orlo triggers Vault Lockdown**.

- The Core seals around the corrupted Engram Source and Incursion.
- Each outer sector begins at Closure Capacity 5 and requests CLOSED on all five routes.
- Darkwing is trapped wherever the opening scatter or its own pre-positioning left it.
- The Source is mechanically locked into the Core housing.

The initial post-lockdown state is safe but useless:

> **The stalker is locked in the middle. Darkwing is isolated around it. Progress requires deliberately opening containment.**

After triggering lockdown, Orlo must not become the encounter's answer key. He may be separated, cut off, incapacitated, or killed by the Occlusion. The puzzle remains fully solvable without an EGRESS expert explaining it.

### One Comparison Channel
Only **one outer terminal can be active at a time**.

The Vault has one high-energy comparison channel capable of projecting one authentic Engram strongly enough for the corrupted Source to recognize it.

### Loading a Candidate — Progress Opens the Vault
A character at a sector terminal selects one of that sector's three candidate Engrams and loads it.

Normal loading is reliable but slower. **Hot-Load** is faster and risky. Exact action costs and DCs belong in the mechanical reference entries linked on this page.

Beginning either load causes that sector to **Overload**:

- all five of its routes become OPEN from that sector's side;
- its Core spoke opens;
- shared corridors involving that sector remain OPEN regardless of the neighboring request;
- Reconfigure Containment is unavailable there until the load/test cycle ends.

The active candidate becomes the strongest artificial Recognition in the Vault. The Core begins imposing **that candidate's apparent identity** upon the formless Occlusion. If a PC actually sees it during the comparison cycle, its silhouette briefly adopts the loaded candidate's *known* posture and outward life impression: a smaller frame for a child record, a disciplined stance for an Order record, or habits that EGRESS associates with that particular Engram. Details may be evocative but must never disclose an unknown trait or an unearned truth about the hidden subject.

This is **not a new diagnostic channel**. The transformation always follows the candidate the party selected, regardless of how many traits match. It does not disclose or visually grade which traits are correct, change the creature's statistics, or grant remote knowledge of its location when it is offscreen.

Progress therefore requires Darkwing to deliberately create a path for the thing hunting them.

### Hidden Stalker
The GM keeps the Occlusion's location on a separate Vault board whenever no PC can perceive it.

When a comparison terminal is active, the Occlusion routes toward that terminal.

When no comparison terminal is active and no Validated Engram exists, its pursuit is deliberately **non-diagnostic**: it seeks the nearest reachable living creature by open-corridor distance. It does not reveal Age, Role, Provenance, or subject-specific relationships through target selection before the puzzle is solved.

Its **Stalk** movement advances up to **two corridor sections** along a shortest open route. PCs use ordinary Pathfinder movement on the physical map; only the Occlusion's Stalk abstracts distance into route-links.

The Vault provides no continuous automatic telemetry. Darkwing infers position from known movement rules, corridor state, direct sightings, ordinary senses, and the consequences of contact.

### Sharing a Sector Is the Emergency
Whenever the Occlusion **enters** a sector occupied by a living creature—or first manifests in one—**Emergency Egress** triggers for that creature.

Emergency Egress is **not Mnemonic Backlash** and deals no damage. It is a Reflex-based involuntary escape response.

The intended lesson is immediate:

> **You do not want to remain in the same sector with this thing.**

A failure still gets the character out but applies **frightened 1**. A critical failure applies **frightened 2** and leaves the character in the sector. Once trapped, the Occlusion uses ordinary PF2e attacks and reactions; escaping on the character's own turn can therefore be much more dangerous than succeeding at Emergency Egress.

A character who deliberately enters the Occlusion's sector does **not** trigger Emergency Egress merely for approaching it. Darkwing can still choose to converge and fight when Dispersal is worth the risk.

### The Occlusion's Condition Pressure
The stalker remains a deterministic pursuer rather than a clever adversary choosing the "right" corridor to sabotage. When creatures are trapped with it, however, the nearly formless Echo becomes a sensory and mental threat rather than merely a powerful attacker:

- **Get Away From Me!** induces **frightened** and potentially **fleeing** in a nearby group. Under ordinary PF2e fleeing rules, victims must escape as expediently as their real routes allow. This can make someone open a door to get away, inadvertently undoing containment, but the condition does not grant free terminal access or magical movement.
- **You Don't Recognize Me** makes a near-familiar silhouette difficult to perceive, applying **dazzled** and sometimes **off-guard**.
- **That's Not What Happened** inflicts mental damage and **stupefied** by projecting the corrupted Engram's internally convincing, historically false Memory.
- **Hold Still** briefly gives the Occlusion enough hands to **grab** one target, without changing its underlying formlessness.

Use these abilities when the Occlusion has actions left **after obeying Stalk and Compare Engram priorities**. They create pressure on positioning, defenses, and terminal work; none may change Smash counts, identity clues, corridor rules, or hidden pursuit. The precise actions, saves, durations, and recovery are in the mechanical reference entries linked on this page.

### Testing an Engram — The Smash Is the Clue
If the Occlusion reaches the active terminal, it compares that candidate against its corrupted self-model.

As the comparison resolves, the creature briefly reaches toward the loaded candidate's apparent Form. For **each incorrect trait**, it performs one destructive **Smash**. An incorrect comparison tears that imposed appearance apart; afterward it settles back into its unstable almost-person outline. All nonzero mismatch counts can be described with similarly violent distortion: only the **number of Smashes** reveals the numerical result.

| Candidate Match | Smashes | Meaning |
|---:|---:|---|
| **3 / 3** | **0** | Exact subject — candidate validated |
| **2 / 3** | **1** | One indexed trait is wrong |
| **1 / 3** | **2** | Two indexed traits are wrong |
| **0 / 3** | **3** | All three indexed traits are wrong |

The Smash count is exact. The system does not reveal which individual traits matched.

Each Smash has two consequences:

1. **Permanent degradation:** that sector's Closure Capacity falls by 1.
2. **Immediate chaos:** when Overload ends, one randomly selected route that had been requesting CLOSED fails OPEN on the immediate reseal.

The failed route is not permanently broken. A later **Reconfigure Containment** can put closure power back onto it, but reduced Capacity means another route may need to be left open instead.

This produces the desired scramble: the door behind the monster may fail to close, but someone can still race to the terminal and put that closure back at the cost of something else.

### Deduction, Not Investigation Rolls
PF2e checks do **not** reveal hidden Age, Role, or Provenance and never distort the Smash count.

Character statistics matter around the deterministic information:

- Reflex during Emergency Egress;
- terminal operation and Hot-Load;
- fighting or Dispersing the Occlusion;
- emergency infrastructure work;
- ordinary movement, positioning, healing, and support.

Darkwing earns identity information by committing to a dangerous comparison. The players perform the deduction themselves.

### Emergency Power Reroute — GM Safety Valve
If containment attrition collapses faster than the encounter remains playable, a badly damaged terminal can expose an auxiliary maintenance mode.

A character can attempt to **Hot-Wire / Emergency Power Reroute** the sector, temporarily Overloading it in exchange for a chance to restore some Closure Capacity. Exact action text belongs in the mechanical reference entries linked on this page.

This option is not announced initially and is not part of optimal expected play. It exists so the GM can reveal deeper emergency controls if, for example, a sector reaches **1 / 5 Capacity** unusually early.

### Normal Veiled Dispersal Still Applies
The stalker remains a Veiled Incursion.

Darkwing can attack and **Disperse** it normally. Damage does not reveal traits or reduce Smash count.

Dispersal creates breathing room and the normal Stabilization Window. The corrupted Engram remains unresolved in the Core and can reconstruct while its Reconstruction Condition remains true.

### Exact Match — Identity Found
A **3 / 3** test causes no Smash and marks that authentic Engram **Validated**. For the first time, the imposed candidate Form holds together instead of immediately collapsing. It remains visibly *that candidate's* apparent Form while the Occlusion persists, but this does not make it the authentic person, remove its hostility, or Restore Memory. Its combat statistics and Recognition Priority remain unchanged.

The validated terminal remains a low-strength Recognition point after the comparison cycle ends. The Occlusion now recognizes the authentic record strongly enough to fixate on it without keeping the whole sector Overloaded. This gives Darkwing a predictable place to confront and Disperse the stalker after solving the deduction puzzle.

Validation answers:

> **Who is this thing trying to be?**

It does not yet Restore Memory to the Source.

### Final Return to the Core
Full Memory reintegration must occur through the **central Core**.

After validation, Darkwing can use the authentic Engram's low-strength signal as a lure, converge on the Occlusion, and Disperse it normally.

During the resulting Stabilization Window, someone must reach the Core and use its reintegration controls. The Core routes the Validated authentic Engram at full strength into the corrupted Source. No final truth-check roll is required once Darkwing has earned the correct identity and created the opening.

The route therefore reverses its own opening geometry:

> **escape the center → survive the perimeter → identify the life → Disperse the stalker → return to the center.**

### Resolution
Authentic Memory makes the corrupted self-model untenable. The Source Stabilizes and the hostile Occlusion cannot reconstruct in the same false way.

The corrupted Engram is not erased. It remains an accurate record that an Occlusion once experienced itself as that person.

Containment damage also remains real. Solving the identity puzzle does not magically repair the Vault.

### Persistent Reward
Darkwing gains meaningful access to EGRESS's **Engram Vault** and its Memory-recovery method. EGRESS can configure a portable **Frame** for field work; loading one decoded Engram turns that Frame into the corresponding **Proxy**.

EGRESS may also offer voluntary baseline recordings to Darkwing. A later Proxy created from a dead character's Engram can create a resurrection-like continuity problem without establishing that Memory alone restores the original person.

More importantly, Darkwing now understands the Vault's logo-topology, comparison channels, corridor isolation, and corrupted-Engram failure mode. That knowledge can matter directly during **The Breach**.

### Systems Established
**Memory, authentic Engrams, corrupted Engrams, Frames and Proxies, Engrams as Sources, comparison as possible Recognition, non-diagnostic candidate-imposed Forms, hidden movement, EGRESS-logo routing topology, Memory-domain sectors, cooperative corridor closure, sector Overload, degrading Closure Capacity, deterministic Mastermind clues, fleeing / frightened / dazzled / off-guard / stupefied / grabbed condition pressure, normal Veiled Dispersal inside an objective encounter.**

## Vault Actions and State

## Vault DC
Unless another rule specifies otherwise, technical emergency checks against the Engram Vault use **DC 32**.

This DC is intentionally lower than the Occlusion's Ability DC. The Vault is difficult equipment being operated under emergency conditions, not an offensive ability of the Creature 14 Incursion.

## PC Movement
Darkwing uses **ordinary Pathfinder movement** through the mapped Vault. There is no special player-facing Traverse Corridor action.

The route-link abstraction belongs only to **Stalk**, allowing the hidden Occlusion to move predictably on the GM topology board while PC Speed, Stride, Step, difficult terrain, mobility abilities, and positioning continue to function normally.

## Corridor State
Every outer sector has five numbered routes and begins with **Closure Capacity 5**.

A sector can request CLOSED on a number of routes up to its current Closure Capacity. All other routes are requested OPEN.

- A **shared corridor** is physically CLOSED only when **both participating sectors request CLOSED**.
- If either participating sector requests OPEN, the corridor is OPEN.
- A sector's **Core spoke** follows that sector's request alone.
- Closure Capacity cannot fall below 0 or rise above 5.

At the beginning of Vault Lockdown, every sector has Capacity 5 and requests CLOSED on all five routes.

## Reconfigure Containment ◆
**CONCENTRATE, MANIPULATE**

**Requirement:** You are adjacent to and able to operate the terminal in your current outer sector; that sector is not currently Overloaded by an active comparison cycle.

Choose up to a number of that sector's five routes equal to its current **Closure Capacity**. The sector requests CLOSED on those routes and OPEN on every other route.

Resolve shared-corridor AND gates immediately.

No check is required.

## Sector Overload
Whenever a character begins either **Load Engram** or **Hot-Load Engram**, that sector immediately becomes **Overloaded**.

While Overloaded:

- the sector contributes OPEN to all five routes;
- its Core spoke is OPEN;
- every shared corridor involving that sector is OPEN regardless of the neighboring sector's request;
- **Reconfigure Containment** cannot be used at that terminal.

On a successful load, Overload persists until **Compare Engram** resolves.

A failed Hot-Load specifies its own Overload duration.

The sector remembers its pre-Overload closure configuration. When Overload ends, it attempts to restore that configuration subject to current Closure Capacity and any immediate Smash failures.

## Load Engram ◆◆
**CONCENTRATE, MANIPULATE**

**Requirements:** You are adjacent to a sector terminal; no comparison terminal is currently active; choose one of that sector's three candidate Engrams.

The sector immediately **Overloads** when this activity begins.

At the end of the activity, the chosen candidate becomes the Vault's sole **active comparison Engram**. The load is automatic and requires no check.

The candidate cannot be voluntarily unloaded or replaced until the comparison cycle ends.

## Hot-Load Engram ◆
**CONCENTRATE, MANIPULATE**

**Requirements:** As **Load Engram**.

The sector immediately **Overloads**, then you attempt **Crafting, Occultism, or Thievery against DC 32**.

- **Critical Success:** The candidate loads successfully. Reduce your **frightened** condition by 1.
- **Success:** The candidate loads successfully.
- **Failure:** The candidate does not load. The sector remains Overloaded until the **start of your next turn**, then automatically recovers.
- **Critical Failure:** The candidate does not load. The sector remains Overloaded until the **end of your next turn**, and that terminal cannot begin another Engram load until the Overload ends.

A failed Hot-Load does **not** occupy the Vault's global comparison channel. Another sector can attempt to load a candidate while the failed sector remains Overloaded.

## Emergency Egress ↻
**FORCED, MOVE**

**Trigger:** The Corrupted Engram Occlusion **enters your Vault sector** or **first manifests in your sector**.

**Requirement:** You have a reaction available.

You must use this reaction if able.

1. Roll **1d4** for a starting bearing: **1 North, 2 West, 3 South, 4 East**.
2. Beginning from that bearing, scan **counter-clockwise** around the sector and identify the first currently OPEN corridor.
3. Attempt a **DC 32 Reflex save**.

- **Critical Success:** Immediately Stride by the selected open route and leave the Occlusion's sector if possible.
- **Success:** As critical success.
- **Failure:** As success, and you become **frightened 1**.
- **Critical Failure:** You become **frightened 2** and do **not** move.

If no OPEN route exists, you cannot move regardless of the save result. Apply frightened normally on a failure or critical failure.

Movement granted by Emergency Egress does **not** trigger reactions.

Emergency Egress itself deals **no damage** and is **not Mnemonic Backlash**. Its purpose is to determine whether the character escapes before the Occlusion can turn ordinary PF2e attacks against them.

A creature without a reaction available does not attempt Emergency Egress and remains in the sector.

A creature that deliberately enters a sector already occupied by the Occlusion does **not** trigger Emergency Egress merely for approaching it.

## Smash
A **Smash** is both an exact comparison clue and physical damage to the sector's redundant containment infrastructure.

For each Smash:

1. reduce that sector's **Closure Capacity by 1**, minimum 0;
2. after the comparison cycle ends, one of that sector's routes that was requesting CLOSED before Overload can fail to reseal immediately.

To determine immediate failures, randomly select among the routes that were requesting CLOSED before the sector Overloaded. Select one route per Smash, without selecting the same route twice. If there are fewer such routes than Smashes, the remaining Smashes still reduce Capacity but create no additional immediate route failure.

A selected route's request becomes OPEN for the immediate reseal. The corridor itself is **not permanently destroyed**.

A later **Reconfigure Containment** can assign the sector's surviving Closure Capacity to that route again, but doing so may require opening another route because the sector can no longer sustain as many simultaneous closures.

The simplest randomization is to use five numbered corridor tokens and draw from the eligible set. If using dice, any fair method that selects among the currently eligible routes is sufficient.

## Correct Comparison — Validated Engram
A **3 / 3** comparison produces **0 Smashes** and marks that authentic candidate Engram **Validated**.

Validation means Darkwing has **Recovered** the authentic Memory belonging to the subject underneath the corrupted reconstruction. It does not yet Restore that Memory to the Source.

When validation occurs:

- the active comparison cycle ends;
- the tested sector's Overload ends normally;
- the global high-energy comparison channel disengages;
- the authentic Engram remains mounted at that terminal as a **low-strength Recognition point** that no longer Overloads the sector;
- the Core records that specific Engram as the authorized reintegration record;
- **Reintegrate Memory** becomes available at the Core.

This creates a predictable post-solution lure without leaking identity information beforehand.

## Reintegrate Memory ◆◆
**CONCENTRATE, MANIPULATE**

**Requirements:**

- you are at the central Core's reintegration controls;
- one authentic candidate Engram has been **Validated**;
- the Corrupted Engram remains mounted in the Core;
- the Corrupted Engram Occlusion is currently **Dispersed**.

You route the Validated authentic Engram through the Core at full comparison strength and write its first-person Memory into the active corrupted record as contradictory experiential evidence.

No check is required.

The action **Restores Memory** before Reconstruction Pressure from this two-action activity is added. The corrupted self-model can no longer sustain the same false Echo, the Source becomes **Stabilized**, and the Corrupted Engram Occlusion cannot reconstruct.

The corrupted recording is not erased. It remains an accurate record that an Occlusion once experienced itself as the subject. What changes is EGRESS's ability to mistake that recorded experience for the subject's complete identity.

## Core Lockdown
Vault Lockdown secures the Corrupted Engram's physical housing but does not make the Core inaccessible forever.

Outer-sector corridor controls still determine whether a sector's spoke into the Core is OPEN. Characters can therefore return physically to the Core by ordinary Pathfinder movement once they create a route.

The Source vessel itself remains mechanically locked into its housing until the encounter ends or the housing is deliberately disabled or destroyed. Bypassing that restraint while the Source remains active does not destroy Weight and can create ordinary Ward, Rupture, or Spill consequences.

---

## GM Safety Valve — Emergency Power Reroute ◆◆
**CONCENTRATE, MANIPULATE**

This action is **not part of the initial player-facing procedure**. Introduce it only if containment attrition is making the Vault collapse faster than the encounter remains playable, most naturally when a sector reaches **Closure Capacity 1**.

**Requirements:** You are adjacent to that sector's terminal; the sector has lost at least 1 Closure Capacity; that sector has not previously benefited from Emergency Power Reroute during this encounter.

The sector immediately becomes **Overloaded** for the duration of the activity. Attempt **Crafting or Thievery against DC 32**.

- **Critical Success:** Restore **2 Closure Capacity**, to a maximum of 5.
- **Success:** Restore **1 Closure Capacity**, to a maximum of 5.
- **Failure:** Restore no Capacity.
- **Critical Failure:** Restore no Capacity, and the sector remains Overloaded until the end of your next turn.

After the activity resolves, Overload ends unless a critical failure extended it. Reconfigure the sector normally.

A sector can benefit from Emergency Power Reroute only **once per encounter**.

The action represents rerouting auxiliary power and bypassing damaged redundancy, not repairing the smashed infrastructure. It exists as a GM-facing pacing valve rather than an expected part of optimal play.

---

## Playing for Keeps — Running Notes

- **Hook:** Darkwing's Manor map contains **`#-9.#3/#-OCC/R#22-3`**; EGRESS finds five matching corrupted records, and Darkwing chooses which one to test.
- **Novel experiment:** EGRESS has not previously loaded an OCC Engram into the full Core comparison lattice. Orlo knows the suffix and proceeds deliberately because the Institute believes the containment and measurement are sufficient.
- **Trigger:** full-power identity comparison becomes Recognition; the OCC Engram becomes the Source and reconstructs physically.
- **Opening:** anyone sharing the Core resolves Emergency Egress; Orlo then triggers Vault Lockdown.
- **Initial containment:** all six sectors begin at Closure Capacity 5 and can fully isolate the Core.
- **Progress:** Darkwing must Load an Engram, deliberately Overloading one sector and opening routes from it.
- **One channel:** only one high-energy comparison terminal can be active at a time.
- **Hidden movement:** use the GM board; the Occlusion Stalks up to two corridor sections toward the active terminal, then toward the Validated Engram after a 3/3 result, otherwise toward the nearest reachable living creature.
- **PC movement:** PCs use ordinary Pathfinder movement; there is no special corridor-traversal action.
- **Contact:** Emergency Egress is the first defense. Critical failure leaves the character frightened 2 and trapped in the sector with the Occlusion.
- **Combat:** the Occlusion can be fought and Dispersed normally. When contact occurs, it uses **Hold Still (grabbed)**, **You Don't Recognize Me (dazzled / off-guard)**, **That's Not What Happened (stupefied)**, and **Get Away From Me! (frightened / fleeing)** according to the post-Stalk / Compare preference. Do not convert damage or conditions into clue progress.
- **Form:** baseline silhouette is formless; candidate loads impose that candidate's Form only. Incorrect comparisons shed it; 3/3 retains it until Dispersal. No appearance changes reveal hidden matching traits.
- **Comparison:** every wrong Age / Role / Provenance field produces exactly one Smash.
- **Degradation:** Smash lowers Closure Capacity permanently; immediate random reseal failures create the scramble, but individual corridors can be reassigned later.
- **Correct answer:** 3/3 validates the authentic Engram but does not end the encounter; its terminal becomes a low-strength lure.
- **Finale:** Disperse the Occlusion, reopen a route to the Core, and use Reintegrate Memory during the normal Stabilization Window.
- **No false clues:** Recall Knowledge cannot reveal comparison traits, and the Smash count is never distorted.
- **No special anti-combat rule:** if Darkwing needs breathing room, killing the current reconstruction is exactly what Dispersal is for.
- **Orlo is not required:** after Lockdown, the encounter must remain solvable without an EGRESS expert explaining the rules. Orlo may survive, become separated, be incapacitated, or die without creating a mechanical softlock.

## If the Party Leaves or Refuses the Experiment

No full-power comparison means no authored Incursion. EGRESS can still discuss its research and the damaged reference. If the Party escapes after activation, preserve damage, the selected record and any validated evidence; staff can contain the emergency without being awarded Memory Restoration offscreen. Access to the Vault remains a matter of actual relationships and resources.

:::design
## First-Pass Tuning Notes

The Occlusion is intentionally built as a **Creature 14** rather than Creature 15. For a six-character level-12 Darkwing party (the expected level is 12 or 13, possibly higher), the Vault's isolation and objective pressure already increase the danger of individual contact. The creature should strongly threaten one isolated PC while remaining practical for several PCs to Disperse when they successfully converge on it.

First-pass tuning targets:

- **AC 35:** moderate for level 14; Darkwing can hit it when members converge.
- **315 HP:** low end of high HP; enough to survive brief isolated contact without making coordinated Dispersal a full boss-length damage race.
- **Occluded Hand +29:** high attack; frightened from a failed Emergency Egress materially increases the danger of being caught.
- **Ability DC 34:** high level-14 ability DC.
- **Vault DC 32:** difficult but deliberately below the Incursion's offensive DC.
- **Class II:** the danger comes primarily from false Memory plus engineered topology rather than an enormous quantity of mnemonic Weight.
- **Condition vocabulary:** DC 34 Will for dazzled / off-guard, stupefied, frightened / fleeing; **Hold Still** uses the existing +29 Strike and Athletics DC 38. The encounter already taxes actions through Vault routing and Emergency Egress; these additional conditions are intentionally oppressive, but each has a clear ending and uses ordinary PF2e recovery/escape rules.
- **Panic cooldown:** Get Away From Me! recharges on a 1d4-turn clock. If repeated fleeing overwhelms the objective game in playtesting, increase this cooldown rather than altering the underlying Mastermind or pursuit rules.

If playtesting shows that six level-12 PCs can converge and erase the Occlusion so quickly that Dispersal becomes trivial, increase HP before raising AC or attack bonus. If isolated contact proves too lethal, reduce Strike damage before weakening Emergency Egress or hidden movement.
:::
