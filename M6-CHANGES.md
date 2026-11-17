# M6: Character Phase, instability and Defection Checks

**Scope:** BOARD-GAME-REVIEW §17.2 steps 1 and 8–9, §17.3 (eligibility, stabilization), §17.5 (persisted state), §7.3–7.4 (crises, Defection Check). Decisions in force:
- **D6-1:** one roll per faction;
- **D6-3:** the highest Drift Risk is nominated;
- **D7-1:** exemption plus Reaffirmation;
- **D7-2:** re-crises are accepted;
- a failed Defection Check returns the character to Conflicted.

**Status:** uncommitted on `main`, on top of M0–M5.

## The Colony Turn, complete

```text
OPENING      Defection Checks (every still-Compromised character) → unattended outcomes → Momentum resolution
FACTION      (Acts II–III) allocation, operations, criticals
CHARACTER    Settle; then per faction not consumed by a Defection Check: the eligible member with the highest Drift Risk
             rolls 2d6 + band modifier ≥ 8; success advances one state, failure retreats one
PUBLISH      now requires the Character Phase (every act)
```

## Model changes

**Data (migration `M6_CharacterInstability`, additive):**
- `Character.Instability` (Stable / Conflicted / Compromised; every existing row Stable);
- `Character.ReaffirmedFactionId`.

Both are **Live-locked**: they change only through Effects.

**Effects:**
- character `instability`, from the Character Phase, the Opening, or play. It is also in the session effect editor.
- the record `defectionCheck` (value left / stayed, delta = total, secondaryTargetId = faction);
- the colony marker `characterPhase`.

**Replay (derived; nothing extra is stored):**
- **Reaffirmed:** a character who entered Compromised and later reaches Stable without a faction change is Reaffirmed for their faction at that moment. A play Event resolving Compromised straight to Stable counts.
- **Recovery:** any Conflicted → Stable move, recorded as the session it happened in.
- **Exemption:** a character is exempt in a Character Phase if they recovered at or after the previous Character Phase. That is, they are skipped once.
- **A defection decided by an Opening Defection Check** does not re-signal leader loss in replay: that Opening already resolved it.

**Stress coefficient ×10 → ×5 (§3.2, decided; configurable as `formulas.stressPressureCoefficient`):**
- It applies everywhere effective Pressure appears: the character list and detail, faction members, the dashboard, the timeline, the at-risk and defection lists, and the Character Phase.
- **Visible effect:** Drift Risk and effective Pressure readings are lower than before at any Stress above 0.
- The Drift vector, the drift target and their visualization are unchanged.

**Provisional constants (config):**

| Constant | Value |
|---|---|
| Drift bands | Steady ≤ 0 < Strained < 15 ≤ Wavering < 30 ≤ Breaking |
| Band modifiers | Strained −1, Wavering 0, Breaking +1 |
| Drift Roll target | 8 |
| Defection Check target | 8 |
| Defection Check label modifier | Aligned −3 … Hostile +3 |

## Engine (client, pure) and verifier (server)

**`core/sim/character-phase.ts`:**
- **Settling:** Conflicted and Steady → Stable.
- **Per faction, in ordinal order:**
  - skipped if consumed by a Defection Check, or if no member is eligible;
  - eligible means: band not Steady, not Compromised, not exempt, not Reaffirmed here;
  - nominee: the highest Drift Risk; ties go to the earlier name, then id;
  - a seeded Character Phase dice stream, with table dice allowed per roll.
- **Effects:** only `instability` and the marker.

**`core/sim/opening.ts` (now `op-2`):**
- **Defection Checks:** 2d6 + the label modifier, where the label is the full `scoreRelationship` toward the faction at stress 0, with no bump and with belief overrides included. A seeded Opening dice stream; table dice allowed.
- **Success:** `factionChange` to none, plus Stable. The goals lose their champion, through replay. A leader's −1 joins **this** Opening's resolution.
- **Failure:** Conflicted.

**`core/sim/colony-turn.ts`:**
- The Defection Check labels.
- **Character Phase inputs,** frozen after the Opening and Faction Phase: Drift Risk (effective Pressure − effective Conviction, rounded to 0.01), exempt, Reaffirmed, and the consumed factions.

**Server, `ColonyTurnEngine.cs`:**
- ports the Defection Checks and the Character Phase;
- verifies every Opening and Character Phase commit against its inputs and dice;
- an unknown phase is rejected;
- Publish requires the Character Phase.

**`core/services/api-mappers.ts`:** the API ↔ model mapping, extracted from `ApiService` unchanged, so node tooling maps data exactly as the browser does.

## UI
- **Colony Turn panel:**
  - **Opening:** Defection Checks (label, modifier, editable dice, outcome).
  - **Character Phase:** Settlings; per faction, the nominee with Drift Risk, band, modifier, editable dice and from → to; skipped factions and why.
  - **Committed summaries** for both.
- **Sessions, crisis cards:** each Compromised character, for the one session in which play can act on it:
  - **Talked down:** Conflicted;
  - **Recommitted:** Stable and Reaffirmed;
  - **Leaves now:** no faction, Stable.

  An unresolved crisis goes to the next Opening's Defection Check.
- **Instability badges** (Conflicted, Crisis, Reaffirmed) on the character list, character detail and faction member cards: `shared/instability-badge`.

## Verification

| Check | Result |
|---|---|
| vitest | 148/148 (12 new in `character-phase.spec.ts`) |
| `ng test` | 150/150 |
| tsc | clean |
| Development build | succeeds |
| Production build | only the pre-existing budgets |
| `server.Tests` | 20/20 |

**Unit tests cover:**
- bands;
- nomination and ties;
- every ineligibility;
- consumed factions;
- Settling and transitions;
- a failed roll while Stable does nothing;
- the **non-change test** (the phase writes only instability over 50 seeds);
- Defection Check success and failure;
- a leader's −1 inside the same Opening;
- Reaffirmed derivation, and not when the character defects;
- no duplicate leader signal;
- exemption after a play recovery;
- Compromised characters are checked.

**Cross-language vectors** (`server.Tests/Vectors`, regenerated): 60 Faction Phases, 40 Openings with 39 Defection Checks, 60 Character Phases with 94 Drift Rolls and 21 Settlings. All verify in C#. A wrong nominee and forged Defection Check dice are rejected.

**Snapshot golden:** the new fields only (`characterInstability` all Stable, `characterReaffirmed` all null, `characterRecoveredAt` empty, `lastCharacterPhaseSession` null). **No other field changed.**

**End-to-end** (`tools/e2e/colony-turn.e2e.ts`, a real server on a fresh **copy** of the live DB, **38/38 pass**):
- **Setup:** the Order's leader and a Dawn member become Compromised in Session 7's play.
- **Session 8 Opening:** both face Defection Checks (labels Cooperative and Friendly). On table dice, the leader leaves and the member stays.
- **The Order's Momentum goes +1 → 0 within that Opening,** and the Faction Phase rolls with the new value.
- **The Character Phase** skips both checked factions, rolls once per other faction, refuses forged dice and commits.
- **Publish** is refused before the Character Phase.
- **Replay:** the defector has no faction and is Stable; the Order is leaderless; the member is Conflicted; there is no second leader signal.

The live DB was never touched.

## Notes and deferrals
1. **Reaffirmation and exemption are derived from the instability history,** which §17.5 calls "verifiable from the Effect history", rather than written as separate Effects. `ReaffirmedFactionId` on the character is the baseline value.
2. **The M6 list item "Middle-belief config, scoring consolidation and the rewritten scoring tests"** was completed earlier by the scoring rewrite (`SCORING-AUDIT.md`).
3. **An Act I Colony Turn** is now Opening → Character Phase → Publish.
4. **Character Phase eligibility counts NPC members only.** Party members never roll.
5. **The panel and crisis cards were built and type-checked but not viewed in a browser.** Please look them over.

## Addendum: the Colony Turn card (draft, then confirm)

**Request:** Colony Turns as their own cards between session cards, run as a carousel with Next, and nothing committed until the whole turn is confirmed.

**UI (`features/sessions/colony-turn-card.component.*`, replacing `colony-turn-panel`):**
- **Placement:** after each session's card in the newest-first list, so the "Colony Turn before Session N" card sits between Session N and Session N−1.
- **Every session shows a card.** A session without a turn offers "Run Colony Turn". (At first only the newest session did; the user asked for a card between every session.)
- **Carousel:** Opening → Faction Phase (Acts II–III only) → Character Phase → Review.
  - The step pills allow jumping back to any step already reached.
  - Back / Next move between steps; on Review, Next becomes **✓ Confirm turn**. Discard drops the draft, and nothing was saved.
  - Each step is computed when it is first reached, from the earlier steps' results.
  - Table dice can still be entered on every step. Changing dice on a step clears every later step (and its dice), which is recomputed on Next.
- **A complete turn** shows a one-line-per-phase summary.
- **An unfinished turn from the old phase-by-phase flow** shows a Discard button (it voids the turn).

**Client (`colony-turn.service.ts`, `colony-turn.ts`):**
- `begin` reads history and its version once and draws the seed and the Opening.
- `draftFactionPhase` and `draftCharacterPhase` are pure. They build on `withDraftTurnEvent`: the draft world with the earlier phases' Effects on a virtual ColonyTurn Event. That is exactly the history the server verifies against.
- `complete` posts every phase in one request.
- The per-phase `start` / `prepare*` / `commit` / `publish` / `voidPhase` methods were removed from the service.
- A stale-history rejection reads: the campaign changed while the turn was open, nothing was saved, discard and run again.

**Server (`ColonyTurnsController.cs`):**
- **New `POST /api/colony-turns/complete`** (`If-History-Version` required). In one transaction it:
  1. creates the turn (reusing the session's ColonyTurn Event);
  2. checks each phase with the same rules as before (order, act rules, hash, allowed origins, `ColonyTurnEngine.Verify`);
  3. writes each phase's Effects;
  4. adds Publish itself and commits.
- **Any failure writes nothing.**
- The checks were extracted into `CheckPhase` / `AddPhase` and are shared with the per-phase endpoint. That endpoint and the void endpoints remain, for tooling and for old unfinished turns.

**Verification:**

| Check | Result |
|---|---|
| e2e, fresh DB copy | 45/45 |
| vitest | 148/148 |
| `ng test` | 150/150 |
| tsc | clean |
| Production build | only the pre-existing budgets |
| `server.Tests` | 20/20 |

The e2e's Session 9 now runs the card's flow. It checks that:
- a stale version, a forged Faction Phase and a missing Faction Phase are each refused **with nothing written** (not even the valid Opening);
- the client may not send Publish;
- a successful complete records four phases;
- the drafted Faction and Character Phase inputs equal those rebuilt from the committed history;
- effect ordinals run 0…n−1 in phase order.

The live DB was never touched.

**Not yet viewed in a browser.**

## Addendum: Defection Checks in the Character Phase; two-screen Colony Turn (BOARD-GAME-REVIEW §18.4)

**User ruling:** defections happen second, during the Character Phase, so their impact on the faction applies at the next Colony Turn.

**Engine (client and C# verifier):**
- **Opening `op-4`:** Momentum resolution only.
  - Inputs: `{version, seed, tiers, pending}`.
  - Effects: the marker, then `momentumTier`.
- **Character Phase `cp-2`:**
  - Inputs gain `defectionTarget` and `checks` (every character still Compromised, with the label and modifier as before). `consumed` is removed: it is now derived from the checks.
  - Results gain `checks`.
  - Effects, in order: marker; per check its `defectionCheck` record, plus `factionChange` and Stable, or Conflicted (Origin CharacterPhase); Settlings; rolls.
- **Leader departures:** no new rule. A leader's `factionChange` with Origin CharacterPhase falls under replay's existing play-defection rule: one `leader-left` −1, pending for the next Opening.
- **Dice:** Defection Checks use `defectionDiceStream` (`seed ^ 0xC2B2AE35`, the former Opening stream), independent of the Drift Roll stream.
- **Moved code:** `DEFECTION_MODIFIERS` moved to `character-phase.ts`, and the builder now creates checks from the state after the Turn's Opening and Faction Phase.
- **Server:**
  - `ReplayChecks` serves the Character Phase.
  - Forged check dice, or a departure the dice did not produce, are refused.
  - Older committed records are not re-verified.

**UI:**
- **The Colony Turn card has two screens and a Review:**
  - **Faction Phase:** Momentum resolution, then operations. Act I shows "no operations".
  - **Character Phase:** Defection Checks with editable dice, Settlings, Drift Rolls and skipped factions.
- **Summaries:** the Review and completed cards group results the same way. Checks found in older Opening records are shown under the Character Phase.
- **Text:** the crisis badge and the crisis cards now say "the next Colony Turn's Character Phase makes a Defection Check".

**Verification:**

| Check | Result |
|---|---|
| vitest | 162/162 |
| `ng test` | 164/164 |
| e2e, fresh copy of the live DB | 48/48 |
| `server.Tests` | 20/20, vectors regenerated |
| tsc | clean |
| Development build | succeeds |

- **Vectors:** 40 Openings (`op-4`) and 60 Character Phases (`cp-2`) with 76 Defection Checks, 30 of them departures. A forged check and an invented departure are both refused.
- **New and rewritten unit tests:**
  - check outcomes and their effects, recorded before any roll;
  - checks never shift the Drift Rolls' app dice;
  - the Opening makes no checks;
  - a leader leaving in the Character Phase leaves Momentum unchanged this Turn and costs −1 at the next Opening.
- **e2e:**
  - Session 8's Opening makes no checks. Its Character Phase checks both set-up crises: the leader leaves, the member stays.
  - Forged check dice are refused.
  - The Order's Momentum is unchanged in Session 8, with one pending `leader-left`.
  - Session 9's Opening resolves it: keepers 1 → 0.

## Addendum: the Factions board (BOARD-GAME-REVIEW §18.5)

**Engine, Faction Phase `fp-2` (client and C# verifier):**
- **Results gain `accepted`:** the Ready to Resolve goals the GM accepted.
  - An accepted goal writes its target (when machine-readable, attributed to the faction, Origin GoalGenerator) and Accomplished, instead of `readyToResolve` Ready.
  - The dice outcome stays `ReadyToResolve`; the GM's decision is recorded beside it.
  - The verifier refuses an acceptance of a goal the dice did not make Ready, and accepted Effects whose acceptance is not recorded.
- **Dice source `reroll`:** joins `app` and `physical`. The verifier checks only that a non-app die is a valid face.
- `resolveFactionPhase(inputs, dice, { overrideSource, accepted })`.
- `prng.rerollDie(seed, salt, now)`.

**Colony Turn card:**
- **Header:**
  - The dice icon, "Colony Turn", and "Act N · Week N"; the session number and seed are in the title's tooltip.
  - A grey **Reset** next to the title: start over with fresh history, a new seed, and no re-rolls or acceptances. It replaces Discard.
  - On the right: the step label (Factions / Characters / Review) and the ← / → buttons, with → becoming a ✓ Confirm on Review.
  - The step pills and the footer are gone.
- **Factions screen:**
  - **Faction cards:** one per faction with operations, with its Momentum badge (FB-3).
  - **Goals:** green when they advance, with progress dots (after).
  - **Attempts:** pip dice, ✓ / ✕, and a ↗ / ↘ for a critical (green or red dice). Attempts never rolled appear as dimmed blanks with "—".
  - **Dice tooltip:** the 2d6, Momentum, defense, total vs the target, and the degree. Clicking a die re-rolls it.
  - **Accept / Defer** buttons on Ready goals.
  - **World Results** under each goal, inside the card: the Progressing World State, or the Completed World State ("Pending World Results" until accepted).
  - Pre-empted goals are noted.
- **Removed from the screen:** Power, token counts, the criticals count, the ineligible-goals list, and the Opening's Momentum resolution (FB-4). The Characters screen and Review are unchanged.

**Verification:**

| Check | Result |
|---|---|
| vitest | 167/167 |
| `ng test` | 169/169 |
| `server.Tests` | 21/21 |
| e2e, fresh copy of the live DB | 50/50 |
| tsc | clean |
| Development build | succeeds |

- **Unit tests (5 new):** Defer, Accept with and without a target, only Ready goals can be accepted, re-roll recording and faces.
- **Vectors:** 60 Faction Phases at `fp-2`, with 17 acceptances and 10 re-rolled attempts.
- **New C# test:** an acceptance of a goal that is not Ready, and unrecorded acceptance Effects, are both refused.
- **e2e, Session 9:** a re-roll and an acceptance. The accepted goal is Accomplished by the Turn with no task left, and the re-roll is recorded.

**Not yet viewed in a browser.**

## Addendum: the Characters board (BOARD-GAME-REVIEW §18.5, FB-7)

**Characters screen, the same design as the Factions board:**
- **Cards:** masonry faction cards, only for factions with character activity this Turn. Factions skipped for "no eligible member" are hidden.
- **Row order** within a card: Defection Checks, then the Drift Roll, then Settlings.
- **Each row:**
  - the character's name (with a crown for the faction leader);
  - a Stable ●○○ · Conflicted ●●○ · Compromised ●●● track, showing the state after the Turn;
  - pip dice, then the outcome.
- **Outcomes:**

  | Event | Shown as |
  |---|---|
  | Defection Check | "Crisis" tag, then **Leaves** (red) or **Stays** |
  | Drift Roll | **Conflicted** (amber), **Crisis** (red), **Recovers** (green), or — for no change |
  | Settling | **Settles** (green), no dice |

- **Name color** follows the outcome.
- **Tooltip** (the full roll):
  - for a check: the label and modifier, the 2d6, the total vs the target, and the outcome. A departing leader adds "the faction loses its leader: −1 Momentum next Turn".
  - for a roll: the Drift Risk, band and modifier, the 2d6, the total vs the target, and from → to.
- **Re-rolls:** clicking a die re-rolls it (date-time + seed). The number inputs are gone.
- **No critical colors on Drift Rolls:** criticals are not a Character Phase rule.

**Engine:**
- `resolveCharacterPhase(inputs, dice, { overrideSource })`.
- `CpDiceSource` adds `reroll`.
- The format is unchanged (`cp-2`). The verifier already accepts any non-app source with valid faces.

**Verification:**

| Check | Result |
|---|---|
| vitest | 168/168 (new: Character Phase re-rolls are recorded) |
| `ng test` | 170/170 |
| `server.Tests` | 21/21 |
| e2e, fresh DB copy | 50/50 |
| Development build | succeeds |

The Character Phase vectors were regenerated and now include 19 re-rolled dice.

**Not yet viewed in a browser.**

## Addendum: stale data after saving a Colony Turn

**Problem:**
- Saving a turn already reloaded the turn list and the sessions, and every snapshot-derived view recomputes from those.
- Three sources of stale data remained:
  1. **Open drafts in other cards:** they never noticed the history change. They kept showing results built on the old history until Confirm failed at the server.
  2. **The turn list:** it was loaded once per app session and never reloaded on a campaign switch.
  3. **Retroactive saves:** saving a turn for an earlier session gave no sign that later saved turns had been worked out on the old history.

**Changes:**
1. **Out-of-date drafts (`colony-turn-card`):**
   - A draft records a fingerprint of the store's sessions, events and Effects when drawn.
   - Any saved change afterwards marks it out of date: an Event, a session, another turn, or a resolution or crisis button.
   - The card then shows a warning with **Reset**, and Confirm is disabled.
2. **Turn list (`ColonyTurnService`):** it reloads whenever the active campaign changes. The card no longer loads it.
3. **Retroactive saves:** a saved turn whose session comes after one with a later-saved turn shows "Saved before the turn for Session N…".
   - Its recorded Effects still apply in replay, which is what history now contains.
   - Re-deriving them is M7 (reinterpretation).

**Verification:**

| Check | Result |
|---|---|
| vitest | 168/168 |
| `ng test` | 170/170 |
| tsc | clean |
| Development build | succeeds |

**Not viewed in a browser.**

## Addendum: Defer state, and the results board (BOARD-GAME-REVIEW §18.5, FB-8 and FB-9)

**Defer:**
- **Three states:** undecided (the default) → Accept / Defer.
  - **Deferred:** the Defer button lights up blue, a note reads "Deferred: not resolved by this turn. It becomes a resolution task in Session N", and the world result is hidden.
  - **Undecided:** a hint to choose.
  - **Clicking the chosen option again** returns the goal to undecided.
- **Saving:** undecided goals are saved as deferred, the engine default. Nothing changes in `fp-2`.

**Results board (`colony-turn-review.ts`, pure):**
- **Used by** the Review step and the completed-turn card. For completed turns it reads the recorded phase inputs and results; older `fp-1`/`cp-1`/`op-2` records are handled.
- **Faction cards:** only factions with new world states or a Momentum change.
- **Faction Phase world states:**
  - goals reaching Progressing (their Progressing World State);
  - Accomplished or accepted goals (their Completed World State);
  - a plain "Now Progressing." / "Accomplished." when the text is empty.
  - Deferred and pre-empted goals have none.
- **Character Phase world states:**
  - departures ("…, its leader, left X." when it is the leader);
  - staying after a crisis ("stayed with X, conflicted.");
  - new crises.
- **Header Momentum:** ↗ +1 / ↘ −1 is the turn's own signals (criticals and a leader leaving), netted and capped as the next Opening will apply them. The reasons are in the tooltip.
- **Details accordion:** opens the previous text summary.

**Verification:**

| Check | Result |
|---|---|
| vitest | 171/171 (`colony-turn-review.spec.ts`: 3 new) |
| `ng test` | 173/173 |
| tsc | clean |
| Development build | succeeds |

**Not viewed in a browser.**

## Addendum: Details summary

- The "N rolls" counts are removed, from the Faction Phase and the Character Phase alike.
- Each item is on its own line.
- An empty section reads "Nothing changed".
