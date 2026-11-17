# World Conditions audit (2026-10-26)

**Scope:** all 70 World Conditions after the `GoalDrivenConditions` migration (copy of the live database). Each is checked against every other condition, and against what the goals already record (their target, and their advance Effects).

**Status:** accepted and applied the same day by migration `WorldConditionsAudit` (see `GOAL-ADVANCE-EFFECTS-CHANGES.md` §12). Rulings: the D conditions are deleted; Order Excluded depends only on Dawn holding Assembly Hall; titles cover every state. Abide had already been merged by hand (*The Cult Abides*).

## Proposed principles

1. **One subject, one condition.** Everything one goal brings about lives in one table, with a row per stage. Today a goal's stages are often split across two or three conditions (Secure the Procession and Procession Secured).
2. **Entity state before goal stage.** If what is true follows from a recorded state (an Asset's holder or status), the condition reads that state, not the goal. It then holds whoever caused it, and it ends if the state is undone. Examples: the Bell Destroyed, the Cult holding the Clearing House.
3. **A goal stage drives only what nothing else records.** Examples: checkpoints, crowds, posters, routes, a planted charge.
4. **A condition is a table rule, not narration.** "Aspis takes the Book of Names" restates the goal's target, which the Asset already records; it gives the table nothing to use. "Aspis is preparing to…" is a goal card's business, not a rule. Text that only does that is not a condition.
5. **Prefer the hand-written wording.** When two texts say the same thing, keep the one written as a rule ("cannot carry traffic; travelers must find another crossing").

## A. The same goal split across conditions: merge into one table (13 → 6)

| Goal | Conditions now | Proposal |
|---|---|---|
| Secure the Procession | *Secure the Procession* (Progressing), *Procession Secured* (Accomplished) | One condition, **"Procession Route: Order Control"**. Progressing: checkpoints restrict access. Accomplished: armed guards control approaches |
| Blockade the Procession | *Blockade the Procession* (P), *Procession Blockade* (A) | One condition, **"Procession Route: Blockade"**. P: demonstrators gather. A: the route cannot be used without negotiation, dispersal or alternate approach |
| Gain Momentum | *Gain Momentum* (P), *Dawn Poster Campaign* (A) | One condition, **"Dawn Poster Campaign"** (P: Assembly district; A: across the Colony) |
| Twilight the Dawn | *Twilight the Dawn* (P), *The Record Corrected* (A) | One condition, **"The Record Corrected"**. P is narration ("authenticate records…"); the A row only, unless you want P as a hook |
| Sunset the Order | *Sunset the Order* (P), *Order Excluded* (A **and** Dawn holds Assembly Hall) | One condition, **"Order Authority at Assembly Hall"**. P: hearing scheduled. A: Order officials excluded. **Decision needed:** a table varies by one thing only, so the Assembly Hall requirement would go (see Q2) |
| Abide | *Cult Procession Access* (P, Ready, A), *House Custody Dispute* (Ready, A) | One condition, **"Abide"**. P: attendants may accompany the Procession. Ready: the same, plus custody of the House demanded and contested in play. A: attendants may accompany the Procession (the House's transfer is recorded on the Asset, so the "demand" text is moot) |

## B. A hand-written Event condition duplicating a goal's Accomplished text (26 → 13)

Each Event condition becomes its goal's Accomplished row (its own, rule-worded text). The goal's Progressing text stays as the Progressing row where it is a situation the table uses, and is dropped where it is only a "preparing" step. Every one of these can still be set by an Event, by setting the goal's status.

| Goal | Event condition (kept wording for A) | Progressing row |
|---|---|---|
| Secure the Crossings | Aspis-Controlled Crossings | keep: guarded routes through the usable crossings |
| Divest | Aspis Credit Withdrawn | keep: capital leaving; new local credit suspended |
| Receive the Pilgrims | Cult Reception Rite | drop (preparing) |
| Contain the Breach | Emergency Mnemonic Routing | drop (the same routing, begun) |
| Disable Corrupted Frames | Corrupted Frames Disabled | keep: unstable Proxies being shut down |
| Gather Data | EGRESS Totality Survey | keep (a hook): field instruments at accessible sites |
| Contain Milltown Flooding | Milltown Safe Passage | keep: guarded dry routes between blocks |
| Quarantine Old Town | Old Town Quarantine | keep: checkpoints along the remaining routes |
| Rescue Civilians | Order Evacuation Route | keep (a hook): assembly points, one escort under way |
| Raid the Armory | Dawn Armory Weapons | keep (a hook): weapons staged for removal |
| Blow Up Founder's Bridge | Founder's Bridge Destroyed | keep (a hook): charges planted |
| Establish Field Archives | Witness Field Archives | keep (a hook): Recovery Wagons collecting |
| Stabilize the Hall | Hall Secured Wing | keep: entry to unstable wings restricted |

## C. Recorded Asset state already covers the Accomplished text: the condition reads the Asset

| Goal | Today | Proposal |
|---|---|---|
| Clear the Clearing House | goal condition (P, A) + *Cult Clearing House* (Cult holds it) | Keep *Cult Clearing House*. The goal condition keeps only P, renamed **"Clearing House Occupied"** (new claims suspended) |
| Connect | goal condition (P, A) + *Cult Registry Pattern* (Cult holds the Registry: +1 Class) | Keep *Cult Registry Pattern*. The goal keeps only P (Pilgrim's Rest can trace surrendered possessions); its A row repeats the +1 Class rule |
| Open the Book of Names | goal condition (P, A) + *Public Access to the Book* (Dawn holds it) | Keep *Public Access to the Book*; drop the goal condition (P is preparing, A restates the target) |
| Recover the Unclaimed Object | goal condition (P, A) + *Witness Specimen* (Witnesses hold it) | Keep *Witness Specimen*, made an Entity condition (it is an Event condition with a requirement, from before the type toggle). The goal keeps only P (recovery notices offer a reward). *Witness Specimen* still points at the Unclaimed Object's planned id, which is still missing (the re-import is outstanding) |
| Silence the Bell | goal condition (P: Damaged, A: Destroyed) + *Civic Alarm Lost* (Bell Destroyed, +1 Stress) | *Civic Alarm Lost* **varies by the Bell's status**: Damaged = ringing unreliable; Destroyed = civic alarm lost, +1 Stress. Drop the goal condition |
| Break the Lectern | goal condition (P: Damaged, A: Destroyed) | Replace it with **"The Empty Lectern"**, varying by the Lectern's status: Damaged = unsafe for ceremonies; Destroyed = ceremonies need another site |
| Break the Shattered | goal condition (P: Contested, A: Damaged, loot on 6) | Drop it: *Hidden Caches* already varies by the Dead Drop Network's status |
| Steal the Offering Chest | goal condition (P: Contested, A: gifts cease) | Drop it: *Maelyn's Boon* already ends when the Cult loses the Chest or it is not Stable |
| Freeze the Civic Improvement Fund / Empty the Reform Treasury | two goal conditions | Replace both with **"Civic Improvement Fund"**, varying by its holder: Dawn = blank (works funded); EGRESS = Dawn-funded work halted until refinanced; Witnesses = resources redirected to preservation; no one = halted |

## D. Narration only: restates the target or Effects (Q1)

These 10 goal conditions say nothing the Asset or Faction record doesn't already, apart from "preparing to" flavour:
- Acquire the Book of Names, Recover the Registry (tentative), Reveal, Understand;
- Requisition the Specimen, Seize the Stockpiles;
- Steal the Ledger, Steal the Unclaimed Object, Secure the Hall of Keepers;
- Sunset the Dawn, which restates its Faction Size Effects.

The goal card already shows each goal's target and advance Effects (ON FIRST SUCCESS / ON COMPLETION), so the proposal is to **delete** them. The Colony Turn board would then show "Now Progressing." / "Accomplished." for these goals.

## E. Keep, with fixes

| Condition | Note |
|---|---|
| Evacuate Slums (goal) | No duplicate; keep both rows |
| Take out the Keeper (goal) | **Bug from the migration:** its Accomplished row repeats the Ready text ("Tavia attempts to assassinate Vara"), which is wrong once Vara is Dead. Keep P (shadowing) and Ready; clear Accomplished |
| Maelyn's Boon, Registry Arrangement, Cult Ledger Relationships, Cult Registry Pattern, Public Access to the Book, Hidden Caches, Cult Clearing House | Entity conditions, no duplicate. The two Class conditions stay separate cards (each +1, they stack), which suits a board game. Their "stacks with …" cross-references could be shortened to "stacks" |

## Content issues found along the way (not duplication)

- **Raid the Armory:** its target is "Order Watch Garrison held by Dawn", but both its texts say *the Order retains the Garrison* (only the weapons are taken). Accomplishing it would transfer the Garrison. The target probably should be none (narrative, Auto-Resolve) or a status change.
- **Recover the Registry (tentative):** the title still says tentative.
- **Connect:** its Accomplished text and *Cult Registry Pattern* state the same +1 Class rule (resolved by C).

## Result if everything is accepted

About **35 conditions instead of 70**:
- 19 merged tables (A + B);
- 12 entity-driven (C), including 3 new or converted Asset tables;
- 2 goal-only (Evacuate Slums, Take out the Keeper);
- the other entity conditions.

No text is lost except the D narration and the dropped "preparing" rows. Each dropped text would be listed in the change log.
