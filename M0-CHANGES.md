# M0 — Safety net and independent bug fixes

**Scope:** BOARD-GAME-REVIEW.md §3.1 and §12 (M0).

**Status:** everything here sits uncommitted on `main`, to be committed as one change.

**What this file is:** the per-fix provenance that separate commits would have carried. For each fix it records what changed, why, and its exact effect on history (golden diffs).

**This is not a model change.** Every item restores evidently intended behavior. The redesign milestones (M1+) are not started.

## Verification summary

| Check | Result |
|---|---|
| `npx vitest run` | 81 passed, **7 failed (pre-existing, see "Not fixed")** |
| `npx ng test --watch=false` | 81 passed, the same 7 pre-existing failures. **This runner did not compile on `main` before M0**: 4 stale spec type errors, fixed below. |
| `npx tsc -p tsconfig.app.json --noEmit` | clean |
| `npx ng build --configuration development` | succeeds |
| `npx ng build` (production) | **fails on pre-existing style/bundle budgets only**. Example: `character-detail.component.scss` is 20 kB against an 8 kB error budget, in files M0 did not touch. No code errors. |
| `dotnet build` (server) | succeeds. The only warnings are pre-existing NuGet advisories: Microsoft.OpenApi 2.0.0 and SQLitePCLRaw.lib.e_sqlite3 2.1.11 have known high-severity vulnerabilities. |
| Server D11/D15 exercised against a **copy** of `colony-data/colony.db` | Steps: create campaign → import all → relationships → add owned rows (incl. a narrative graph) → delete. **Every table's row count afterwards was identical to before.** |
| Snapshot golden (`core/sim/__fixtures__/colony-2026-10-14.golden.json`) | **No diff from any M0 fix.** The live campaign's recorded history replays byte-identically. |

---

## 0. Safety net (no behavior change)

### Engine extraction

`buildColonySnapshots` and its helpers moved **verbatim** from `store/app.store.ts` (lines 105–795) to `core/sim/replay.ts`. They are exported, and the store imports them.

### Golden replay tests (`core/sim/replay.golden.spec.ts`)

- **Fixture:** `__fixtures__/colony-2026-10-14.json`, an export of the live DB via `tools/beat-sim/export.py`.
- **Snapshot golden:** generated from the extracted engine *before* any fix. It matches the pre-M0 audit harness, which ran the original store code: Order Momentum −140 at S7, and the inert streak effects in S2.
- **Power golden:** the canonical Power breakdown per faction, at baseline and after every session. Added with D4 so that every later Power change is a visible diff.
- **Regenerating:** `UPDATE_GOLDEN=1 npx vitest run src/app/core/sim/replay.golden.spec.ts`. Regeneration is verified byte-identical. Any golden change must be explained here or in a later change log.
- **Runs under both runners.** It uses JSON imports; `fs` is loaded only in update mode. `tsconfig.spec.json` gains `resolveJsonModule`.

---

## D9 — Snapshot-projected values saved into baseline (data integrity)

**Defect**
- `CharacterDetailComponent` captured `viewCharacters()` once, in `ngOnInit`, so it held projected pressure, influence, state and faction.
- It saved from that copy. Opening a character in Current/Session view, then switching to Baseline and editing any card, wrote the projected values into the baseline record.
- **The same bug was in the portrait upload.**

**Fix**
- New `features/characters/character-card-edit.ts` contains the pure `applyCardEdit(baseline, card, form, values)` and `baselineForSave()`.
- Saves (card edits and the portrait upload) start from `store.characters()`, the baseline record.
- `character` is now a `computed` over the viewing context, so the page also follows context switches. Previously it was a stale signal.

**Hardened in the same pass: `FactionDetailComponent`**
- Its `faction()` merges local cache-busted image URLs (`…?v=<timestamp>`) into the projected faction.
- Uploading an icon after a glyph therefore **persisted the glyph's cache-busting URL into the baseline**.
- All faction-detail saves now start from `store.factions()`: card saves, the leader, member count, and both uploads.
- Card forms open from the baseline record.

**Tests:** `character-card-edit.spec.ts` (5).

**History diff:** none. This prevents future corruption.

---

## D4 — Five divergent Power computations → one

**Defect**

| View | What it computed differently |
|---|---|
| Faction page | Alive members (faction or social class), projected Assets |
| Faction list | Same as the faction page |
| Dashboard rankings | Counted dead members; used **baseline** Assets |
| Timeline | Counted dead members; **omitted Assets entirely**, which roughly halved Power |
| Goal evaluation in replay | Baseline membership, baseline influence, baseline Asset status |

**Fix**
- New `core/sim/power.ts` with `computePowerBreakdown()`. It is the single implementation: **today's formula, unchanged**.
- It filters membership (alive; faction or social-class member) and Asset control itself, so callers can't diverge.
- `FactionInfluenceService` delegates to it, and exposes `breakdown()`.
- Duplicate `computeFactionInfluence` / `computeFactionPower` were removed from `types.ts`.
- New shared snapshot projections in `replay.ts` (`projectFactions` / `projectCharacters` / `projectAssets`) are used by the store views, the timeline, and the Power golden.

**Display effect**
- The faction page's numbers are canonical and **unchanged**. The Power golden at S7 equals the pre-M0 faction page: Aspis 56, Cult 38, EGRESS 67, Order 64, Dawn 68, Shattered 42, Witnesses 66.
- The dashboard, timeline and goal evaluation now show the same numbers. For example, timeline Aspis S7: 29 → 56.
- The faction page's **"character influence"** stat previously ignored the leader and the configured formulas, and always applied the 0.75 leaderless penalty. It now shows the same character strength that Power uses.

**History diff:** none. Goal evaluation changed internally, but no faction-threshold goal flips status in this fixture.

---

## D3 — Leaderless penalty ignored whether the leader was alive

**Fix:** `leaderCapable()` requires the leader to be alive **and** still a member.

**Tests:** `core/sim/power.spec.ts` (dead leader, defected leader, no leader).

**History diff:** none (no leader dies in the fixture). Power golden: no diff.

---

## D12 — Belief derivation threshold: hard-coded 0.4 vs configured 0.5

**Fix**
- `effectiveBeliefs()` now takes the threshold and axis labels.
- The character page (3 sites), the party page (2 sites), and character `topCompatibleFactions` now pass `store.formulas().beliefDerivationThreshold` and `store.beliefAxisLabels()`.
- Defection and compatibility scoring already used the configured value.

**Display effect:** **15 of 47 characters now show different derived beliefs**, at the configured 0.5 rather than 0.4. Examples: Lysa Trent, Asha Weaver, Elias Thorn, Tobin Marsh, Velka Runebinder, Talen Voss, Nhalia Lumina, Maelyn, Tarn, Miriel Stoutfoot, Veyra Kess. Their pages now agree with how they were already being scored. *Which threshold is right is still open: review O-4.*

**Tests:** `character.spec.ts` (+2).

**History diff:** none (display only).

---

## D6 — Goal detector ran after cascades and stress triggers

**Defect:** auto-Accomplished/Failed transitions could never fire goal-event cascade rules or goal stress triggers, because by the next session the transition had already happened.

**Fix**
- The detector (`detectGoals()`, unchanged logic) now runs **before** the cascade passes, and again at the end. It is idempotent, and the second run catches conditions created by cascade-derived changes.
- Goal stress triggers now see detector transitions as well as explicit goal-status effects, deduplicated per goal and value.

**Tests:** `core/sim/replay.spec.ts` (3). Mutation-checked: all three fail with the fix removed, and pass with it.

**History diff:** none. The live config has no goal-event cascades or goal stress triggers.

---

## D2 — Cascade rules that can never take effect looked effective

**Defect.** All three live rules are inert:
- The two "Momentum Streak" rules target `legitimacy`, which the engine never applies. They display "Computed" chips that change nothing.
- "Leaderless" filters on subtype `FactionLeader`, which never matches NPC/PartyMember.

**Also found:** the editor offers character targets `conviction` and `impressionable`, which the engine never applies.

**Fix**
- New `core/sim/rule-checks.ts` with `inertRuleReason()`.
- The cascade rule editor shows "⚠ This rule can never take effect …" with the specific reason.
- **No engine behavior change.** Making those rules effective would rewrite history. Their replacement is Momentum signals (M3).

**Tests:** `core/sim/rule-checks.spec.ts`. All three live rules are flagged for their real reasons.

**History diff:** none.

---

## D10 — Select-type effects saved with an undefined value

**Defect**
- Changing an effect's target type reset `value` to undefined, even when the first property is a select. The cases are Goal → Status and Location → State.
- The dropdown showed "Plotting" or "Active", but the saved effect carried no value, so the engine ignored it.

**Fix:** `features/sessions/effect-defaults.ts` (`defaultEffectValue`, `usesDelta`), used for both target-type and property changes.

**Tests:** `effect-defaults.spec.ts` (3).

**Same file, minor:** the "repeated from last session" marker tested `'legitimacy'`, but the property is `'baseLegitimacy'`, so the marker only ever lit for Momentum. Fixed.

---

## D11 — Relationships endpoint ignored the active campaign

**Defect:** it read the `"singleton"` ColonyState and RulesConfig rows, plus every campaign's factions and overrides.

**Fix:** it is scoped by `ICampaignContext`, like every other controller.

**Verified on a DB copy:** with a second campaign active, `/api/relationships` returns 49 rows, every source in the active campaign.

---

## D15 — Campaign delete orphaned data; import dropped fields

**Delete**
- Assets, goals, locations, maps and placements, character narrative rows, and the entire narrative planning graph are now deleted. Previously they were left behind.
- Order is children before parents, in **one transaction**. Previously each bulk delete committed independently.

**Import**
- Now carries `AdditionalMemberCount`, colors, banner shape, `NarrativeTier`, pronouns, aliases and portrait.
- **Remaps `LeaderId`** to the imported character, and **`SocialClassId`** to the imported class. Previously both were dropped or nulled.

**Verified on a DB copy:**
- 7 of 7 imported leaders point at imported characters.
- 45 of 45 social classes were remapped.
- After deleting campaigns containing every owned row type, **all table counts were identical to before**.

---

## D14 — App spec

- `app.spec.ts` asserted "Hello, colony-tracker-ui". It now expects the sidebar title ("The Colony") and provides HTTP and router testing providers.
- It runs only under `ng test`; `vitest.config.ts` excludes it.
- **Unblocking `ng test` also required fixing 4 pre-existing stale spec factories** (`character.spec.ts`, `faction-influence.service.spec.ts`), which were missing fields the models had since gained.

---

## Not fixed (pre-existing, reported)

**7 failing tests in `core/services/scoring.service.spec.ts`.** They failed on `main` before M0. Example: "keepers → witnesses base score" expects −1.7, and the code gives 1.5.
- The expectations appear to have been written against older scoring constants.
- They are left failing rather than rewritten to match the code. Deciding whether the code or the test is right is a scoring-semantics question, closely related to review O-4.

**D16 — `AdditionalMemberCount` lost.** This is a data restoration task for you (O-2), not a code fix.

**Production build budgets:** pre-existing; see the table above.
