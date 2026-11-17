# M1–M3: Lifecycle and versioning, Power channels, Momentum

**Scope:** BOARD-GAME-REVIEW.md §17.7 milestones M1, M2 and M3 (with §4, §5 and §17 for the rules).

**Status:** uncommitted on `main`, on top of the uncommitted M0 work (`M0-CHANGES.md`). Meant to be committed with it as one change.

**What this file is:** the per-item provenance that separate commits would have carried. Each item is labeled as either:
- a **model change** (the redesign: history *should* change), or
- a **bug fix** (restores evidently intended behavior).

Every golden diff is listed and explained.

**Not balancing.** All new thresholds are the provisional placeholders from the review (People 73, Holdings 62, Mandate 45, headcount 12). No constant was tuned to the real roster.

## Verification summary

| Check | Result |
|---|---|
| `npx vitest run` | 98 passed, **7 failed**: the pre-existing `scoring.service.spec.ts` failures (unchanged, left for D4-3) |
| `npx ng test --watch=false` | 100 passed, the same 7 pre-existing failures |
| `npx tsc -p tsconfig.app.json --noEmit` / `tsconfig.spec.json` | clean |
| `npx ng build --configuration development` | succeeds |
| `npx ng build` (production) | fails on the **pre-existing** initial-bundle budget only (1.37 MB against 1 MB). The style-budget warnings are pre-existing too, with the same files as M0. |
| `dotnet build ColonyTracker.slnx` | succeeds. Only the pre-existing NuGet advisory warnings. |
| `dotnet test server.Tests` (new project) | **8 passed** |
| Migrations | Applied to **copies** of `colony-data/colony.db` only. Every row is preserved. Backfills were checked (below). The live DB is untouched. |
| Endpoint smoke tests (DB copy) | See M1 and M3 below. All passed. |
| Snapshot golden | **M1:** no diff. **M2:** no diff. **M3:** streak records removed in S2/S3, plus new Momentum fields (below). |
| Power golden | **M2:** regenerated (capacity channels; diff below). **M1/M3:** no diff. |

---

## M1 — Lifecycle, versioning, history guard (model change; infrastructure)

### Server model (migration `20261015020322_M1_LifecycleAndHistory`, additive)

**Campaign**
- `Mode`: `Design` (default) or `Live`.
- `ActivatedAt`.
- `HistoryVersion` (long).

**Event and EventEffect**
- `Event.Kind`: `Play` (default), `ColonyTurn`, `Correction` or `MapEdits`.
- `EventEffect.Origin`: `Manual` (default), `Opening`, `FactionPhase`, `CharacterPhase`, `GoalGenerator`, `MomentumResolution`, `Consequence` or `Correction`.
- `EventEffect.Ordinal`: an explicit order within the Event.
- `EventEffect.PhaseId`.

**Introductions.** `IntroducedAtEventId` on Character, Faction, Asset, FactionGoal and Location.

**New tables**
- `RulesVersions`: version n, with the rules JSON, the engine version and `EffectiveFromEventId`.
- `ColonyTurns`: seed, status `Draft` / `Committed` / `Voided`, rules version and engine version.
- `ColonyTurnPhases`: ordinal, kind, frozen inputs plus their SHA-256 hash, results, and the history version at commit.

**Backfills** (verified on a copy)
- Synthetic events become `Kind = MapEdits`.
- Each Event's effects get `Ordinal` = their stored order (rowid). This makes the pre-M1 implicit order explicit, so replay is unchanged.

### Server rules

**`AppDbContext.SaveChangesAsync`**
- Every save that touches simulation-relevant entities bumps the owning campaign's `HistoryVersion`.
- The owner is resolved through Event → Session, Effect → Event, and Phase → Turn.

**`Services/SimulationGuard.cs`**
- In a **Live** campaign, these return 409 `live-locked`:
  - changes to locked baseline fields (values, beliefs, pressure, influence, state, membership, Momentum tier, asset control/status/tier, goal targeting and status, and so on);
  - deletes;
  - additions without `IntroducedAtEventId`;
  - relationship overrides;
  - direct rules edits;
  - any change to a committed Colony Turn.
- Descriptive fields (name, summary, art, …) stay editable.
- PUT-style detached updates are compared against the database values.

**Middleware.** A non-GET request carrying `If-History-Version` gets 409 `stale` (with the current version) if the version has moved.

**Controllers**
- `POST /api/campaigns/{id}/activate`: writes RulesVersion 1 and goes Live, in one transaction.
- `GET /api/campaigns/{id}/rules-versions`.
- `PUT /api/rules?effectiveFromEventId=&engineVersion=`: in Live, this creates RulesVersion n+1 instead of editing in place.
- `ColonyTurnsController`:
  - creates a turn (its Event has `Kind = ColonyTurn` and `SortOrder −1000`);
  - commits phases one transaction each;
  - requires `If-History-Version` (400 if missing, 409 if stale);
  - enforces phase order Opening → Faction → Character → Publish (409);
  - verifies the frozen-input hash (422);
  - restricts effect origins per phase;
  - marks the turn Committed on Publish.
- Events and Sessions controllers:
  - force `Origin = Manual` and `Ordinal` = list index on manual edits;
  - refuse to create or edit ColonyTurn events;
  - never reorder them;
  - return effects ordered by `Ordinal`.
- `CampaignsController.Update` edits only the name and description.

### Client
- New types: `CampaignMode`, `RulesVersion`, `ColonyTurn`, `ColonyTurnPhase`, `EffectOrigin`, `EventKind`, and the new fields.
- `core/sim/engine-version.ts` (`v1-dev`).
- Replay (`core/sim/replay.ts`):
  - applies effects in `Ordinal` order (`orderedEffects`; pre-M1 data keeps stored order);
  - adds introduced entities to the world at their Event's session (`presentAt`, `eventSessionNumbers`). The goal detector ignores entities not yet in the world.
- Store: `isLive`; view projections filter by `presentAt`; `activateCampaign()`; in Live, rules saves pass the latest event as `effectiveFrom`.
- UI:
  - Design/Live chips and a **Go Live** confirmation in the campaign manager (you type the campaign name);
  - a Live badge;
  - the locked editors are hidden or disabled in Live (character Society/Beliefs, faction Beliefs/Perception/goals/leader/member count, relationship overrides and the stress slider, party, add/import/delete on the lists).
- **Bug fix found on the way:** API errors were never shown. The new `api-error.interceptor.ts` and an app error banner surface them, which Live locks depend on.

### Tests and smoke results
- `replay.spec.ts`: introductions, effect order.
- `server.Tests/SimulationGuardTests.cs`, on in-memory SQLite: version bumps (including effects via their session), Design allows edits, Live rejects locked PUT-style changes, Live allows descriptive edits, delete rejected, unintroduced add rejected, and committed-turn immutability.
- DB-copy smoke test, all as expected:
  - stale header → 409;
  - missing header → 400;
  - out-of-order phase → 409;
  - bad hash → 422;
  - activation creates RulesVersion 1;
  - locked edit → 409, descriptive edit → 200, delete → 409;
  - Live rules save → RulesVersion 2.

### Golden: **no diff** (ordinals reproduce the stored order; the fixture has no introductions).

---

## M2 — Power capacity channels (model change)

**Rule** (`core/sim/power.ts`, rewritten; the single implementation):

```text
Power    = 1 + People + Holdings + Mandate (each 0/1), capped at 3
People   = (top-three living member influence) ÷ 3 ≥ peopleThreshold (73), OR headcount ≥ headcountThreshold (12)
Holdings = asset influence score ≥ holdingsThreshold (62)
Mandate  = Legitimacy ≥ mandateThreshold (45)
```

**Retired**
- Momentum is no longer a Power input.
- The leaderless multiplier is gone.
- The Power Modifier is gone: no longer an effect property or a form input. Stored values are left untouched.
- Server `FactionInfluenceService.cs` is deleted (it was unused after D4).
- `FormulasConfig` keeps the old fields as deprecated optionals, so stored JSON still parses.

**UI**
- Faction header: Power, with one reason per card (e.g. "People (Serevan, Edrion, Kelda)"), and a channels panel showing score / threshold.
- Faction list: a reasons tooltip.
- Timeline: "Power (cards)" and "People score".
- Settings: a "Capacity Channels" section replaces the retired sections.

**Detector (model change, flagged for M4).** Goals targeting faction-level derived values (influence / power / momentum thresholds) no longer auto-resolve. Their scales changed, so the old thresholds are meaningless. The goal editor shows `⚠ legacy target: not auto-detected`.

**Tests:** `power.spec.ts`, rewritten:
- the fixture allocation 3/1/3/3/3/2/2;
- "Dead Drop Damaged → Shattered 2 → 1";
- "Serevan Dead → Order 3 → 2";
- headcount 13 keeps the Order at 3;
- Momentum is not an input;
- rosters of size 0/1/2;
- the cap;
- monotonicity.

### Power golden diff (regenerated; previous copy kept outside the repo)

The old values were the 0–100 effective-power scores; the new ones are Power (cards).

| at S7 | Aspis | Cult | EGRESS | Order | Dawn | Shattered | Witnesses |
|---|---|---|---|---|---|---|---|
| old score | 56 | 38 | 67 | 64 | 68 | 42 | 66 |
| **new Power** | 3 | 1 | 3 | 3 | 3 | 2 | 2 |

Only one Power change happens across the recorded history: **Aspis is at 2 in S3 and back at 3 in S4.**
- In S3, Lysa Trent (influence 92) dies, which drops People below its threshold.
- In S4, Nhalia Lumina defects to Aspis, which restores it.

### Snapshot golden: **no diff** (Power is not stored in snapshots).

---

## M3 — Momentum as a tier with signals (model change)

### Rule (`core/sim/momentum.ts`, new)

```text
At each Opening:  signals = pending, deduplicated per faction by (root cause, sign)
                  change  = clamp(Σ signals, −1, +1);   tier = clamp(tier + change, −2, +2)
```

**Signals** (derived in the replay; each has a stable root cause):

| Sign | Rule | Root cause |
|---|---|---|
| +1 | An Achieve goal becomes Accomplished (explicit effect or the detector) | The resolving Effect. For the detector, it is the last Effect that changed the goal's target; otherwise `goal:<id>`. |
| −1 | A Keystone's control passes away from its owner, or it becomes Destroyed | The Asset Effect |
| −1 | The leader (alive) becomes Dead/Missing/Forgotten, or leaves the faction | The state or faction Effect |
| ±1 | GM-declared: new effect property **`momentumSignal`** (delta ±1, reason required, optional root-cause Effect id in `secondaryTargetId`) | That Effect, or the named root |

Example: a Keystone theft that accomplishes the thief's goal is one −1 for the owner and one +1 for the thief, and a GM signal naming the theft as its root deduplicates with it (the Ledger case).

### Data
- **Server** (migration `20261015021510_M3_MomentumTier`, additive): `Factions.MomentumTier` INTEGER, default 0. Create and Update reject values outside −2..+2 (400). The field is Live-locked.
- **Raw `Faction.Momentum` is archived.**
  - It is kept and still accumulated by the replay (`factionMomentum`) for audit, but nothing reads it.
  - Legacy `momentum` effects stay in history and display as "raw … (archived)".
- The migration was applied to a copy: all tiers start at 0, and raw values are unchanged (Order −90, …). **O-3, the seven starting tiers, is still the GM's call.** Set them in each faction's Perception card ("Starting Momentum tier").

### Engine (`replay.ts`)
- New snapshot fields:
  - `factionMomentumTier`: the tier in force for that session's play;
  - `momentumResolutions`: the resolution at that session's Opening (signals, net, applied, capped, from → to);
  - `pendingMomentumSignals`: recorded this session, resolved next.
- `projectFactions` projects `momentumTier`.
- **Streak rules are retired.** Stored streak rules are skipped, and their counter machinery is removed.
- **Threshold rules fire on the crossing only.** They fire in the session the value goes from outside to inside the condition, compared with its pre-session value. Previously they re-fired every session the value stayed past the threshold.
- `rule-checks.ts` flags as inert:
  - streak rules ("retired");
  - rules targeting raw `momentum` ("archived").
- `DEFAULT_CASCADE_RULES` is now empty, because the old defaults were the four Momentum streak rules.

### UI
- **Faction detail:**
  - the Momentum arrow, one icon per tier (−2 double down, −1 down, 0 level, +1 up, +2 double up), red/green by sign;
  - pending signals shown as tokens (with reason tooltips) at the viewed snapshot;
  - a "Starting Momentum tier" select in Perception, with the legacy raw value shown read-only.
- **Sessions:**
  - the default faction effect is now a Momentum Signal (a +1 / −1 toggle plus a reason, which is required to save);
  - a Momentum bar per session shows the Opening's resolutions (from → to, capped/at-limit notes) and the pending signals.
- **Dashboard:**
  - rankings sort by tier, then Power, then Legitimacy;
  - "Fastest Rising" uses the tier, and now appears **only if a tier actually rose**. Before, it always named some faction, even when none rose.
- **Timeline:** the momentum metric is the tier.
- **Cascade editor:**
  - Streak is no longer offered, though a stored streak rule shows as "Streak (retired)";
  - raw Momentum is no longer a target;
  - a new rule defaults to a threshold rule;
  - the help text is updated.
- **Factions CSV:** gains a `MomentumTier` column (clamped on import).

### Tests
- `momentum.spec.ts` (14 tests):
  - dedup;
  - the cap (net −3 → −1, flagged as capped);
  - net zero;
  - the clamp at ±2;
  - the starting tier (clamped; raw ignored);
  - deferral to the next Opening, with no re-application;
  - **the Ledger theft**;
  - a Keystone Destroyed vs a non-Keystone;
  - the leader incapable or leaving, vs an ordinary member;
  - a leader who is already incapable and then leaves doesn't signal again;
  - an Achieve goal Accomplished gives +1 once, and a Maintain goal gives nothing;
  - streak rules don't fire;
  - threshold on the crossing only, and again after leaving and re-entering;
  - a baseline already past a threshold doesn't fire.
- `rule-checks.spec.ts` and `effect-defaults.spec.ts`: updated for the retirements and the new first faction property.
- `server.Tests`: the Momentum tier is editable in Design and locked in Live.
- DB-copy smoke test: tier 3 → 400; tier −2 → 200 and stored, with raw −90 untouched.

### Snapshot golden diff (regenerated)
- **S2:** three `neg-2` streak `derivedEffects` records removed (institute −15, keepers −30, shattered +15).
- **S3:** one `neg-3` record removed (keepers −20).
- These rules targeted `legitimacy`, which the engine never applied (D2). So **no value changes**: only the records disappear.
- New fields on every snapshot: all tiers 0, no resolutions, no pending signals.
- **The recorded campaign produces no Momentum signal.** I checked by hand:
  - none of the dead or Forgotten characters (Elias Thorn, Fenwick, Lysa Trent, Sarith, Brother Kesh, Velka) is a faction leader;
  - Nhalia Lumina's defection is not a leader's;
  - the only Keystone change is S7 → Contested, which is not a loss;
  - no goal reaches Accomplished.
- The fixture's legacy `momentum` effects only move the archived raw value, as before.
- **Every other field is identical.**

---

## Deviations from the §17.7 plan (deliberate, for review)

1. **Interim Opening.** Colony Turns are not run until M5. Until then, the replay resolves Momentum at the **start of each session**, where the Opening before Session N sits. M5 replaces this with the materialized Opening phase.
2. **No `MomentumSignal` table yet.** Signals are derived in the replay with stable root-cause ids, so M5 can store them unchanged when an Opening commits. The resolution effect (`Origin = MomentumResolution`) is also an M5 deliverable.
3. **"A defection in the Opening affects the same turn"**: deferred to M5, since it needs the Opening phase itself.
4. **Rules versions:** they are recorded with an effective Event, but the replay still uses the current rules for all of history. Per-checkpoint rule selection and forks come later. Play-event correction rules are M7.
5. **Legacy data stays.** Raw-`momentum` effects and threshold rules on raw `momentum` remain in history and are flagged, not migrated. Converting old deltas into signals would invent history on a different scale.
6. **Leader identity** is the baseline `leaderId`. Leader changes become events in M4 (`leaderChange`).

## Not fixed (pre-existing, reported)
- The 7 `scoring.service.spec.ts` failures (to be rewritten with D4-3).
- The production bundle and style budgets.
- The NuGet advisories: Microsoft.OpenApi 2.0.0 and SQLitePCLRaw 2.1.11. Dependency patches are a separate change.
