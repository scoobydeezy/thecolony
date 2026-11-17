# Narrative Reconciliation Plan — Docs ↔ App (2026-11-16)

**Status:** Decided and implemented on 2026-11-16. The rulings and every change are in `NARRATIVE-RECONCILIATION-CHANGES.md`, which supersedes the recommendations below where they differ: no Front record, the nine conditions retired, and the Dawn Charter kept as a Keystone.
**Sources of truth:**
- The campaign `.md` files in the parent folder, as revised on Nov 15.
- `Faction Goals.md` is the exception: it is partly stale and is itself reconciled here (§3).
- The rules decided in `BOARD-GAME-REVIEW.md` §17–§18 govern the Colony Turn.

**App data examined:** a copy of `colony-data/colony.db` (16 Nov 10:13):
- 11 factions
- 53 goals
- 36 World Conditions
- 30 Narrative Events and 16 branch overrides
- 17 threads
- 31 Assets
- 47 characters

Citation keys: **CO** = Campaign Outline.md · **EN** = Encounters.md · **FG** = Faction Goals.md · **BU** = The Burden — Final Veiled Encounter.md. Numbers are line numbers.

---

## 1. The model change in one page

| | Old model (what the app data and FG §II still assume) | Current docs |
|---|---|---|
| Between sessions | **Faction Beat**: five-card draw, roll still listed as "open" | **Colony Turn**: Opening → Faction Phase → Character Phase → Publish, with fp-5 rules (BOARD-GAME-REVIEW §17, §18.12) |
| Act III structure | Two crises (Old Town *or* EGRESS) plus nine Totality "escalations" | **Five faction fronts**: Sunny/Shattered, The Breach/EGRESS, Milltown/Dawn, The Tangled Web/Witnesses, The Open Door/Cult (CO 2207, FG 358–368) |
| Nine Totality conditions | The escalation track | **Still exist, as background world state** ("Totality is the board; the factions are the clocks", CO 2299). They are not quests, not scored, and have no track (EN 1747, BU 4835) |
| What feeds the finale | Faction Asset states, Keystones, Operational Integrity | **One result per front**: Stable / Damaged / Lost. That result is *at the same time* the front Asset's finale state, its +2/+1/+0 Finale Pressure, and the faction's full/half/no capability in The Burden. Finale Pressure ≥ 5 starts The Burden (FG 370–388, BU 4637–4663) |
| Assist or Interfere | — | Decided by the faction's **Insight + Relationship** (Committed / Cooperative / Strained / Hostile, CO 2389) |
| Aspis and the Order | — | **Not fronts.** Their contribution is led by relationship: Perrik plus Claims Registry access, and Kelda (CO 2376, BU 4696–4815) |

> **Correction to the brief:** the nine conditions were *not* replaced. The docs keep them alongside the five fronts. What was replaced is (a) the two-crisis choice and (b) Asset status as a separate input to the finale. Decision **D1** below asks whether to keep the nine.

### The five fronts as data

| Front | Faction | Front Asset (app) | Front Asset id | Result rule | Finale use |
|---|---|---|---|---|---|
| Sunny | Shattered | Dead Drop Network | `d789ddfd…` | Organized response to the mass-Sundara crisis (FG 420) | Phase I: ray emitters (Assist) or Graspers (Interfere) |
| The Breach | EGRESS | Engram Vault | `64f51360…` | Direct = Stable, Delegated = Damaged, Unattended = Lost baseline (FG 402) | Phase III: 2 / 1 / 0 Memory Frames |
| Milltown | Dawn | Assembly Hall | `ced96c5d…` | Civilians rescued: 5–6 / 3–4 / 0–2 (FG 418) | Phase III: 3 / 2 / 0 operatives |
| The Tangled Web | Witnesses | The Ledger | `92220b6d…` | Direct / Delegated / Ignored baseline (FG 410) | Phase II: Form Dormant (Assist) or Preserved Once (Interfere) |
| The Open Door | Cult | Pilgrim's Rest | `2d1a8b50…` | Sanctuary restored, impaired, or unavailable (FG 422) | Phase II: deny a Form family, or 4 actions |

---

## 2. Decisions needed from you

These come first; most of the work below depends on them. My recommendation is listed first in each.

| # | Decision | Options | Recommendation and why |
|---|---|---|---|
| **D1** | **Keep the nine Totality conditions?** | (a) Keep as background state, matching the docs. (b) Retire them; the five fronts are the whole of Act III. | **Your call; this is a narrative decision.** The docs currently say (a) in four places (FG 312, CO 2205/2295/2374, EN 1747, BU 4835). If you choose (b), those passages need editing; that is part of the §3 work. If (a), add them to the app per §6.2. |
| **D2** | **How does the app record a front result?** | (a) A small **Front** record per front: Pending / Stable / Damaged / Lost, plus route Direct / Delegated / Unattended. Finale Pressure is the computed sum, flagged at ≥ 5. (b) No feature: the front Asset's Status *is* the result, with Destroyed standing for Lost. (c) Track it on paper. | **(a).** Option (b) fails twice. Act II goals already damage front Assets (Break the Shattered → Dead Drop Network; Steal the Ledger), and the docs say that damage must *not* pre-score the front (FG 382, CO 2374). And "Pending" and "functionally Lost while standing" (FG 422) have no Asset-status equivalent. |
| **D3** | **Does damage to a front Asset in Act II carry into its front?** | (a) No; it stays an ordinary world fact (FG 382, BU 4663). (b) Yes; it lowers the baseline ("subject to… existing damage", FG 406; "Destroying the Ledger can override", EN 2398). | **The docs contradict each other; pick one and I'll fix all three files.** I lean towards (a), with a single exception: if the Asset is *Destroyed or no longer controlled by the front faction* when Totality begins, the front starts at Lost. That keeps Act II meaningful without a second scoring track. |
| **D4** | **Record faction stance in the app?** Stance is Relationship tier (Committed / Cooperative / Strained / Hostile), Insight, and Assist / Interfere / Absent. | (a) Add it to the Front feature (D2a), plus one stance field each for Aspis/Perrik and Order/Kelda. (b) Paper. | **(a)** if you choose D2a; it is the other half of the finale handoff line (BU 4847). Optional fields only, in line with your "resist mandatory fields" principle. |
| **D5** | **Act III champions.** Every named faction member already holds exactly one assignment (only Marek and Evin are free). So **16 goals have no champion and can never be drawn.** 14 of them are Act III. | (a) Add an Act III Opening step: the GM reassigns champions from finished or obsolete goals (Secure the Procession, Blockade the Procession and the like finish at S4). (b) Add new named NPCs. (c) Retire most of the unchampioned Act III goals. | **(a) + (c).** Keep one **front-operation goal** per front faction (§5) and champion it, then retire the leftovers. This is also what the docs ask for: a delegated front needs "a concrete champion" (EN 2261). |
| **D6** | **Does the Faction Phase run in Act III?** S9 → S10 → S11 allows at most two Turns. | (a) Yes, unchanged. (b) Yes, but front-operation goals are resolved by the encounters, not rolled. (c) No Faction Phase after Totality. | **(b).** FG 348 and FG 486 leave this open. Front goals get **Auto-Resolve off**, so an encounter result completes them by any source (§18.3). Other factions' Act III goals still roll, and those rolls are what "the factions keep moving" means. |
| **D7** | **Unclaimed Object.** It appears in no doc; four goals and a World Condition use it. | (a) Keep as an app-only Fractured Object. (b) Rebind it to the cloth toy (CO 491, 499). (c) Retire it. | **Your call.** Whatever you choose, its broken id (§4.1) must be fixed. |
| **D8** | **20 champions appear in no `.md`**, for example Edrion Vykas, Pip Quickstep, Boruk Stonehand, Nim-of-Many and Hadrik Sorn. | (a) Add brief entries to Character Briefs.md. (b) Accept them as app-only. | **(b) for now.** FG's contract makes the app authoritative for champion assignments, but Character Briefs owns motivations. Add briefs only for champions who end up running a front. |

---

## 3. Rewrite `Faction Goals.md`

Its contract stays: FG owns *procedure*; the app holds live records. But FG still describes the pre-October procedure, and it flags as "open" rules that have since been decided.

**Keep as is:** the Document Contract, the Core Principles, §IV's five-front model and the intervention-triage tables, and §IV "What Act II Carries Forward".

**Rewrite:**

| Section | Change |
|---|---|
| Title and subtitle | Use "Faction Movement, the Colony Turn, and Act III Fronts". Drop "Faction Beats" and "Totality Operations". |
| Status line | Remove "Faction Beat dice/Power revisions intentionally open". |
| §I Goal Model, field table | Remove `AutoResolve` as a CSV Yes/No, `ProgressingWorldState`, `CompletedWorldState` and `ProgressingState` (retired in §18.13). Describe instead: Auto-Resolve; **goal-driven World Conditions** (the text lives in the condition, keyed to goal stage); advance Effects at Progressing and Accomplished (§18.11); Earliest Act for Maintain goals too (FP5-8); Visibility, where Secret goals do not threaten (FP5-5). |
| §I state names | Planning / Progressing / Ready to Resolve / Accomplished / Failed / Retired. Note that Plotting is the stored enum. Add **completion by any source**, which is permanent and attributed but carries no credit (§18.3). Add **Retired** for impossible goals (this closes Open Decision 6). |
| §I champions | Add one active assignment per champion (§18.8). A defector leaves its goals with the faction, unchampioned. Add the Act III reassignment step (D5). |
| **§II → "The Colony Turn"** | Replace Steps 0–5 with the adopted sequence: Opening (Momentum, op-4), Faction Phase (fp-5), Character Phase (cp-2: Defection Checks first, highest-Drift-Risk member, Conflicted, Reaffirmed), Publish. The fp-5 rules, to quote exactly from §18.12 when drafting: Power as 0–3 channels; one token per goal; threatened Maintain guards compete for Power; 2d6 + Priority (+3/+2/+1) + Momentum ≥ DC 10 + the best drawn guard's Priority; natural 12 / natural 2; one advance per goal per Turn; Accept or Defer for Ready to Resolve. **Check the draw count and how Power converts to draws against §17.2 before drafting; don't assume five slots.** |
| §II Momentum table | Replace the Oct-10 8+ probabilities with the persistent −2..+2 rule (natural 12 → +1, natural 2 → −1, at most ±1 per Opening, Keystone-lost signal). Recompute any probability table for DC 10. |
| §III Direct Play | Mostly keep. Change "Faction Beat" to "Colony Turn". Point "What the App Should Calculate" at what is actually built: World Condition Stress, replay-derived Power and Momentum, no cascades (§18.10). |
| §IV Totality board | Rewrite to match D1. Under (a), say plainly that the board is background state with no track and no score, and list which conditions carry a table rule in the app (§6.2). |
| §IV Act III clocks | Answer the questions FG 348 leaves open, using D5 and D6: what a front-operation goal is, how its Act II stage sets the encounter's opening, and that front goals resolve by encounter. Leave clock *lengths* in EN. |
| §IV new paragraph | State the D3 rule for prior front-Asset damage once. Then fix EN 2398 and FG 406 to match. |
| §IV, Aspis and the Order | Keep. Add Perrik's Registry access (full or limited Forecast) and Kelda's availability as recorded stance, per D4. |
| §V Worked examples | Rerun **Jorren → Dead Drop Network** and **Damaris vs Marra** with fp-5 numbers. Marra guards only if she is threatened, so she draws Power; she then adds her Priority to the DC. Add one **Act III front example**: Milltown with Dawn's front goal, direct versus delegated. |
| §VI Open decisions | Close items 1–4 and 6 (decided in §18.1, §18.3, §18.12; the Momentum conversion is done). Keep items 5 and 8, plus D4-6′ (wildcard) and D7-2. |
| GM Quick Reference | Regenerate from the new §II and §IV. |
| Small fixes | The Shattered capability is "ray intervention" at FG 364 but "Processional" at BU 4653. Name both: the emitters (Assist) and the Graspers (Interfere). |

**Other source-doc inconsistencies found.** These are small; fix them in the same pass.
- EN 1853: "parties that completed **Sunny**" should say **Old Town**.
- EN 2257: Milltown 0–2 is "Destroyed"; elsewhere it is "Lost".
- CO 3108 and CO 3132: Session 3 lists "Hall or Duskwood" and omits the **Containment** route (CO 573).
- Faction methods differ between CO 2894–2900 and Foundational Truths ≈246–254. For example, the Cult "Receive" versus "Embrace", and the Shattered "Expose" versus "Destroy". Pick one wording.
- CO 2376 says "Hall of Keepers"; the app Asset is "Hall of the Keepers".
- CO 3037 still says "run the **Faction Beat**". Change it to Colony Turn.

---

## 4. App data: corrections that need no decision

### 4.1 Broken references (certain)
The Unclaimed Object's real id is `4432a639-df72-4a36-b7a7-32d26f46b725`. Four records point to a **non-existent** `90c84272-604f-55b0-8701-67091727c4fc`:
- World Condition `witness_specimen` (requirement `assetController`). The condition can never be in force.
- The advance Effects of **Recover the Unclaimed Object**, **Requisition the Specimen** and **Reveal** (`locationChange`). These moves go nowhere.

Fix: repoint all four, unless D7 retires the object.

### 4.2 Keystone flags (certain; CO 174–184)
CO 184: "Keystone denotes one of the five reusable Identity-tool capabilities… **The campaign app should use this documentary definition.**"

| Asset | Now | Should be |
|---|---|---|
| Book of Names | ✔ | ✔ |
| The Ledger | ✔ | ✔ |
| Engram Vault | ✔ | ✔ |
| Face of the Unknown | ✔ | ✔ |
| **Claims Registry** | ✘ | **✔** |
| **Dawn Charter** | ✔ | **✘** |
| **River Exchange** | ✔ | **✘** |

⚠ **Mechanical side effect:** Keystone loss in play emits a −1 Momentum signal (`client/src/app/core/sim/replay.ts:295`). Two things change:
- Aspis's sensitive Asset moves from the River Exchange to the Claims Registry, which the Cult's **Connect** and Aspis's own **Recover the Registry** target.
- **Dawn will have no Keystone.** That matches the docs: Choice has none.

### 4.3 Narrative Events: renames and summaries (certain unless marked)

| # | App now | Change | Basis |
|---|---|---|---|
| 12 | **Sunny** (Act II, "Identity: Name") | Rename to **Old Town**. **Remove "SUNDA—" and the grave-marker reveal from the summary.** | CO 960 forbids the Act II route from locating Sundara's grave or SUNDA—; that is the Act III payoff. |
| 25 | **The Reckoning** ("Old Town Crisis") | Rename to **Sunny**. Rewrite: hundreds of false Sundaras, the whistle, the six Anchored graves as calibration, the Shattered front / Dead Drop Network. | CO 2325–2332, EN 1771–1911. "The Reckoning" is the title of Act III (CO 2199). |
| 26 | The Breach | Rewrite: the Dragon escapes with its mobile Source; the Sheep; restoring the mother–brood circuit; the Scar persists; the EGRESS front, where the Engram Vault sets Memory Frames. | CO 2337–2341, EN 1923–2051 |
| 24 | Totality | Remove "Old Town and EGRESS become simultaneous concentrations". Replace with: the board of conditions (per D1), the first alarms (the Bell, EGRESS, the Floodwarden), the silent Pilgrim Quarter, five fronts in motion. Add **two branch overrides** (Stopped: Vara reading again; Succeeded: the Party's reconstruction reconnects, and the Order severs anchors). | CO 2249–2299 |
| 27 | The Burden | Replace the "factions, Keystones, Assets… determine which methods" sentence with: the four phases (Monument → Ritual Chamber → Dawn tunnel → Crescent Island); the five front results; Perrik and Kelda. | CO 2444–2470, BU |
| 14 | Playing for Keeps | Base summary: the Source is a **corrupted Engram recorded from a Veiled**: "The recording is accurate. The subject was not." The overrides look fine. | CO 1349–1355 |
| 13 | The Institute | The base hook is the damaged OCC reference to the corrupted Engrams. Pre-Reading baselines are branch texture and are already in the overrides. *Inference; check against CO 1270–1297.* | CO 1270–1297 |
| 22 | The Observer | Change "steps into his own experiment". He did *not* manufacture the crisis. | CO 274, CO 2178 |
| 20 | The Shape of Someone | *Inference:* "incomplete memory" should become "Forms supplied by observers; no single Forgotten person beneath". | CO 1084, CO 1118 |
| 3 | Prisoners | *Optional:* the docs fold detention into Bad Maps (the Compass beat, Serevan's question). Keep it as a scene, but align its summary. | CO 497–507 |
| 16 | Revolutionaries | "Identity: Agency" → "Identity: Choice" (the component name). | CO 182 |

### 4.4 Narrative Events to add (certain)
Place these between Totality (24) and The Burden (27):
- **Milltown**: Dawn front, a cooperative rescue of six civilians; the living Floodwarden and the Veiled Floodwarden. (CO 2343, EN 2055)
- **The Tangled Web**: Witnesses front; Celia's twelve heirlooms; the Counterfeit Weaver and her fourth object; the Ledger is at stake. (CO 2352, EN 2282)
- **The Open Door**: Cult front; the silent quarter; the Rest as a location-Source; Maelyn's Offering Chest contradiction. (CO 2361, EN 2412)

The five fronts are siblings, not a sequence. Connect each from Totality to The Burden.

### 4.5 Branch content not yet in the app (certain)
- The Confluence, Succeeded: **Serevan's Closure**, with Kelda as field lead (CO 2144–2155). Check that override `b8f53d49` carries it; it seems to.
- The Confluence, Stopped: **Vara disappears**; the resumed Reading (CO 2120–2132). This is currently on the Eclipse override `3cd9342a`. It's fine there if you prefer.

### 4.6 Threads
Missing, for Campaign-Wide Promises and Open Promises (CO 204–310, CO 3074):
- **Sundara / SUNDA—**
- **The Monument and the Order of Theia**
- **The Book Was a Memorial** (Theia → Aletheia)
- **Uldren and Celia Harthwright**
- **The Counterfeit Weaver** (the Witnesses' unfinished record)
- *optional*: **The Light Remains** / **The Colony's Negative Space**

The existing **Old Town** thread can stay as the Act II Name thread.

---

## 5. Goals: per-goal recommendations

Legend: **Keep** · **Fix** (a data correction) · **Revise** (retarget, rename or re-champion) · **Retire** (status Retired, not deleted) · **Add**.

Goals the docs are silent on stay as they are. FG makes the app authoritative for goals, and silence is not contradiction. I flag only conflicts, front interactions, and goals that can never be drawn. *Champion?* = no champion today (D5).

**Front-operation goals (new concept, D5 + D6):** one Achieve goal per front faction, Act III, Auto-Resolve **off**. The encounter or the GM completes it by any source. Its champion is the faction's capable delegate, and its Act II stage seeds the encounter's opening. It **does not** score the front (D2).

### Order of Theia
| Goal | Rec | Note |
|---|---|---|
| Quarantine Old Town (A3, Critical, Boruk) | Keep | A local Order operation during Sunny (EN 1787 allows this). |
| Sunset the Dawn (A2, Pip) | Keep | Its target, the Dawn Charter, loses Keystone status (§4.2). |
| Contain Anomalies (M, Kelda) | Keep | |
| Maintain the Book of Names (M, Edrion) | Keep | |
| Secure the Procession (A1, Serevan) | Keep | It finishes at S4, which frees **Serevan** for D5. |
| Rescue Civilians (A3, *champion?*) | Retire or champion | Evacuation is an Order method (CO 2894), but rescue is Dawn's front. |
| Break the Shattered (A2, Jorren) | Keep | Damages a front Asset. Behaviour follows D3. |
| Contain Milltown Flooding (A3, *champion?*) | **Retire** | Milltown is the Dawn front. The **Milltown Passage** condition goes with it (§6). |
| **Add: Closure** (A2, Serevan or Kelda) | Add, Succeeded branch | CO 2144. Retire it in the Stopped branch. |
| **Add: Sever the Anchors** (A3) | *Optional* | CO 2275, Succeeded branch. It might just be Closure carried forward. |

### Witnesses
| Goal | Rec | Note |
|---|---|---|
| Twilight the Dawn (A2) · Empty the Reform Treasury (A2) | Keep | Docs silent. |
| Stabilize the Hall (A3, *champion?*, target Hall of Remembrance) | **Revise → front goal "Preserve the Ledger"** | The front is measured on the **Ledger**, not the Hall (EN 2290, EN 2398). The **Hall Containment** condition becomes its stage text. Champion: Celia, after the Unclaimed Object goal, or one of the four defenders. |
| Recover the Unclaimed Object (A1, Celia) | **Fix** | Broken id (§4.1); see D7. |
| Evacuate Slums (A3, *champion?*) | Retire or champion | No front role. |
| Protect the Ledger (M, Marra) | Keep | It guards the front Asset. |
| Prepare the Chosen (M, Uldren) | Keep | |
| Establish Field Archives (A3, Orrister) | Keep | Check Orrister's faction: the Character Briefs (799) call him the Memorial Building's Master of Ceremonies. |
| **Add: Custody of Vara's estate** (A2) | *Optional* | CO 828, Succeeded branch. |

### Dawn Assembly
| Goal | Rec | Note |
|---|---|---|
| Raid the Armory (A3, *champion?*, Secret) | Retire *(inference)* | Sits uneasily with Dawn's reform doctrine (CO 1573); unchampioned. |
| Sunset the Order (A2, *champion?*) | **Revise: champion it** (Julian, after S4) | CO 803 and CO 906 (an emergency Assembly) support it. |
| Manage Reform Funds (M, Miriel) | Keep | |
| Secure the Hall of Keepers (A3, Tobin) · Open the Book of Names (A3, Talen) | Keep | The Hall of Keepers is not a gate on Kelda (CO 2376). |
| Blockade the Procession (A1, Julian) · Gain Momentum (A1, Asha) | Keep | S4 protest (CO 635). |
| Fortify the Assembly Hall (M, *champion?*) | **Champion it** | It guards the front Asset and is inert without a champion. |
| **Add: front goal "Evacuate Milltown"** (A3) | **Add** | The Dawn front (CO 2350). Its champion is the Dawn delegate. Its stage drives the reworded **Milltown Passage** condition. |

### Shattered
| Goal | Rec | Note |
|---|---|---|
| Steal the Ledger (A2, Damaris) | Keep | Front interaction, per D3. |
| Break the Lectern (A3) · Silence the Bell (A3) | Keep | Docs silent. Note that the "Broken Bell" ringing in Sunny is the watchtower bell (EN 1783), not **Bell of the Sun**. |
| Take out the Keeper (A1, Tavia, Secret) | **Revise** | Earliest Act → **II**: Tavia appears in Act II (CO 938). Retire it in the Succeeded branch. |
| Steal the Unclaimed Object (A2, Kivren) | Keep | Per D7. |
| Blow Up Founder's Bridge (A3, *champion?*) | Retire or champion | Docs silent; the docs road is "Founder's Way" (CO 668). |
| **Add: front goal "Answer the Reckoning"** (A3) | **Add** | The Sunny front: an organized response that exposes and acts on Old Town's history (FG 420). |
| **Add: Expose Old Town** (A2) | *Optional* | CO 938. |

### EGRESS Institute
| Goal | Rec | Note |
|---|---|---|
| Do Science (M, Veyra, Engram Vault) | Keep | It guards the front Asset. |
| Protect Occlusion Containment (M, Orlo) · Freeze the Fund (A2) · Seize the Stockpiles (A1) | Keep | |
| Requisition the Specimen (A2, Elias) | **Fix** | Broken id. |
| Gather Data (A3, *champion?*) | Keep, champion it | It drives **EGRESS Totality Survey**. |
| Disable Corrupted Frames (A3, *champion?*) | Retire, or reword its condition | **Corrupted Frames** switches Frames off. That must not cut the finale's **Memory Frames**, which come only from the front (EN 2041). |
| Contain the Breach (A3, *champion?*, Occlusion Containment) | **Revise → front goal** | Occlusion Containment is the emergency and the **Engram Vault** is the front Asset (EN 2028). Keep **Emergency Mnemonic Routing**; it is one of the documented op types (EN 1933). |

### Cult of the Unknown
| Goal | Rec | Note |
|---|---|---|
| Receive the Pilgrims (A3, *champion?*) | **Revise → front goal "Open the Door"** | In the docs the Rest's unchecked welcome **is** the catastrophe, and Unattended means Lost (EN 2530). Its **Reception Rite** stage text currently reads as a benefit; rewrite it to the docs' Wound. |
| Await the Pilgrims (M, Maelyn) | Keep | It guards the front Asset. |
| Connect (A2) · Understand (A2, targets the Ledger) · Abide (A1) · Reveal (A1, **Fix** id) · Clear the Clearing House (A3) | Keep | Understand is a front interaction (D3). |

### Aspis
| Goal | Rec | Note |
|---|---|---|
| Recover the Registry (tentative) (A3, *champion?*) | **Champion it, drop "(tentative)"** | Registry access is the main input to Perrik's finale role (BU 4700). |
| Divest (A3, *champion?*) | Keep, champion it | If Accomplished, Perrik may have evacuated, so he would be absent in Phase I (BU 818). Note this on the goal-driven condition. |
| Balance the Books (M, Perrik) | Keep | Its target becomes a Keystone. |
| Acquire the Book of Names (A2, Merit) | Keep, with a flag | CO 676: non-Keepers cannot close or remove the Book. Make Accomplished *control*, not use. |
| Steal the Offering Chest (A2, Rinna) | Keep, with a flag | The Chest is the intended lesson in The Open Door (CO 2368, EN 2429 "not a keystone switch"). Note in EN that the encounter still works if Aspis holds it. |
| Facilitate Trade · Patrol the Docks (M) · Secure the Crossings (A3) | Keep | |

---

## 6. World Conditions

### 6.1 Change existing conditions
| Condition | Rec |
|---|---|
| Witness Specimen | **Fix** the asset id (§4.1). |
| Milltown Passage | Rekey it from the Order's "Contain Milltown Flooding" to the Dawn front goal. Rewrite the text to the docs' version: shelters, invisible currents, the Floodwarden. |
| Hall Containment | Moves with Stabilize the Hall → Preserve the Ledger. |
| Reception Rite | Rewrite to the Open Door Wound, or split it: the Act II rite versus the Act III catastrophe. |
| Corrupted Frames | Add "does not affect finale Memory Frames", or retire it with its goal. |
| Order Evacuations, Slum Evacuation, Founder's Bridge, Garrison Armory | Follow their goals' fate in §5. |
| Cult Registry Pattern / Cult Ledger Relationships (+1 Class) | Keep. They are table rules the docs don't contradict. *Check whether they belong to the retired escalation idea.* |
| Bell of the Sun | Keep. Consider adding a separate condition for the Old Town watchtower bell ringing under Totality (CO 2328), so the two bells stay distinct. |

### 6.2 Add conditions (subject to D1 and D2)
- **Totality**: manual, the requirement kind "another condition". Give it a Stress contribution of your choosing; the docs are silent.
- **The nine board conditions**, under D1(a): each requires Totality. Add only those that state a *table rule*, in line with your principle that narration-only conditions are deleted. Likely candidates: **City as Palimpsest** (travel and logistics), **Records Remember the Forgotten**, **Living Anchors Activate**, **Fractured Objects Activate**. The location-specific ones (Old Town, Containment, Milltown, Pilgrim's Rest) are better as their front's stage text.
- **Front finale capability**, one per front, varying by front result once D2a exists. The text is the finale capability (for example, "The Breach — Stable: EGRESS brings 2 Memory Frames to Phase III"). This shows the handoff line at the table.
- *Optional, post-encounter facts:*
  - Old Town Wound persists
  - Veiled Dragon at large
  - Veiled Floodwarden remains
  - Fourth object exists
  - Sundara's whistle recovered

  EN suggests recording each of these if it matters later (EN 1903, EN 2263, EN 2382).

---

## 7. App feature (only if D2a / D4a)

Small and optional, in the style of §18.9:
1. **Front** entity, seeded with five rows (the table in §1). Fields:
   - outcome: Pending / Stable / Damaged / Lost
   - route: Direct / Delegated / Unattended
   - recorded-at Event
   - notes
2. **Finale Pressure** = Σ (Stable 2, Damaged 1, Lost 0). Show it on Colony State, with a "≥ 5: The Burden begins after this scene" flag. Pending contributes 0 and is shown as Pending.
3. A World Condition requirement / varies-by kind **`frontOutcome`**.
4. Per-faction **finale stance**: relationship tier, Insight, Assist / Interfere / Absent. Also Perrik's Registry access and Kelda's availability.
5. A **Finale handoff** panel that prints the BU 4847 line per faction.
6. Front results are set by session Events (by any source). Replay reproduces them, as for every other state.

---

## 8. Order of work

1. **You decide D1–D8.** Some can be answered "later"; D1, D2, D3 and D5 block the most.
2. **Fix the source docs** (§3, small list) and **rewrite Faction Goals.md** (§3). As FG 151 says, rules are decided in FG first and the app follows.
3. **Back up the DB** (`colony.db.bak-2026111x-before-reconciliation`).
4. **Data pass 1, no design needed:** §4.1 ids, §4.2 Keystones, §4.3 events, §4.4 new events, §4.6 threads. Use guarded data migrations that match on current **Id + Title**, because you edit live data by hand.
5. **Data pass 2, goals and conditions:** §5 and §6.1, by CSV import or migration. Use the existing `imports/` pattern (Assets → world-conditions.csv → faction-goals.csv).
6. **Feature** §7, if chosen, then the §6.2 front-capability conditions.
7. **Verify:**
   - the existing test suites (the 7 scoring tests that already failed stay visible);
   - replay of the test campaign, which is a regression fixture, not a target;
   - a dry-run Colony Turn in Act II and Act III on a DB copy (`tools/e2e/colony-turn.e2e.ts`).
8. Log provenance in `NARRATIVE-RECONCILIATION-CHANGES.md`. No commits.

**Not tuned here:** goal Priorities, DCs, Stress values and front clock lengths. Balancing stays a separate pass ("rules first, pieces second").
