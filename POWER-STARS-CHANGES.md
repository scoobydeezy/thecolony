# Power from members and Asset stars (BOARD-GAME-REVIEW §18.7)

**Status:** uncommitted on `main`. This is architecture only; no faction, member count or Asset was changed to fit the thresholds.

## Step 1: unnamed members (done first, as requested)
- **Bug: factions CSV.** The export had no `AdditionalMemberCount` column, and the import reset the value to 0 when the column was missing, so every export → import round trip erased unnamed membership. This is the likely cause of the Order's lost 13 (O-2).
  - The export now includes the column.
  - An import without the column keeps the current value.
- **Missing capability: Live campaigns.** Unnamed membership was locked in Live with no Effect to change it.
  - There is now a faction Effect, **Unnamed Members** (`additionalMembers`, ±n), folded by replay into `factionAdditionalMembers`, never below 0.
  - It is projected onto the faction, so Power and every view use the count at that point in history.
  - Test: deltas fold, and the count is clamped at 0.

## Step 2: the Power model
**`core/sim/power.ts`** (still the single implementation) computes:
- **People** = named members (living characters of the faction, or of the social class) + leader bonus (5, only while the leader is alive and a member) + ⌊unnamed ÷ 20⌋. Threshold 10.
- **Holdings** = stars of controlled Operational, Strategic and Covert Assets. Threshold 15.
- **Mandate** = stars of controlled Symbolic and Mandate Assets. Threshold 5.
- **Power** = the number of channels that qualify.

`assetStars`: a Destroyed Asset counts 0; otherwise its tier. `ASSET_ROLE_CHANNEL` maps each Role to its channel.

**Settings:** the new keys are `peoplePoints`, `leaderBonus`, `unnamedPerPoint`, `holdingsPoints`, `mandatePoints`. The old keys, `peopleThreshold: 73` and the rest, are kept only so stored configs still parse; nothing reads them. The server's default rules for new campaigns use the new keys.

**Removed:** the top-three Influence score, the headcount threshold, the role weights, the status multipliers, the ÷25×100 normalisation and the Legitimacy blend. `computeAssetInfluence` and `computeAssetLegitimacy` are deleted.

**Legitimacy retired (ruling):**
- **Model:** `Faction.BaseLegitimacy` is removed, with migration `Power_Stars_RetireLegitimacy`, which drops the column. The faction field, its Effect, its editor field and its perception display are gone.
- **Replay and history:** `factionBaseLegitimacy` is removed from snapshots, and the timeline loses its Legitimacy metric.
- **Dashboard:** the Legitimacy column is gone, and the "Lowest Legitimacy" alert is replaced by **No Power** (factions with Power 0).
- **CSV:** the factions CSV no longer has a `BaseLegitimacy` column; a file that has one is ignored on that column.
- **Cascade rules:** they can no longer target a faction property. Your two stored "Momentum Streak ×2/×3" rules, which targeted Legitimacy, were already inert (streak rules retired in M3). They are left in place and flagged.

**The values removed (for the record):**

| Faction | Base Legitimacy |
|---|---|
| Aspis | 35 |
| Cult | 20 |
| EGRESS | 70 |
| Shattered | 30 |
| Dawn | 65 |
| Order | 80 |
| Witnesses | 85 |
| Burdened | 75 |
| Civilians | 90 |
| Fractured | 25 |
| Heirs | 55 |

**UI:**
- **Faction header:** the People / Holdings / Mandate rows show "score / threshold". People also shows its parts in words ("5 named · leader +5 · 40 unnamed +2"). Holdings and Mandate list their Assets and stars in the tooltip.
- **Assets section:** "N★ Holdings / M★ Mandate".
- **Unnamed members** are labelled "unnamed", with their People points in the tooltip.
- **Assets page:** role hints state the channel each Role feeds.
- **Power Rules settings tab:** rewritten around the five point values.
- **Timeline:** "Power (0–3)" and "People points".

**Simulator:** a `power='stars'` option in `colony_sim.py` (with `star_thresholds`). `experiments12.py` now uses it, and keeps the score models as reference rows. `export.py` tolerates the dropped column.

## Change history
- **Saved turns are untouched.** Each saved Faction Phase stores the Power it used (frozen inputs, verified at the time), and replay re-applies recorded changes, never Power. The server needed no change.
- **Views of past sessions recompute Power under the new rules.** That is fine in Design mode, which is your campaign's mode.
- **Snapshot golden fixture:** the only change is the removed `factionBaseLegitimacy`. Cascade results are unchanged.
- **Power golden fixture:** recalculated under the new rules (a Design fixture). At baseline:

  | Faction | Old Power | New Power |
  |---|---|---|
  | Aspis | 2 | 2 |
  | Cult | 0 | 2 |
  | EGRESS | 3 | 2 |
  | Order | 2 | 1 |
  | Dawn | 2 | 2 |
  | Shattered | 1 | 2 |
  | Witnesses | 1 | 1 |

  The social classes drop (Burdened 1, Civilians 1, Fractured 0, Heirs 0); they never run Faction Phases.

## Verification

| Check | Result |
|---|---|
| vitest | 202/202 |
| `ng test` | 204/204 |
| tsc | clean |
| Development build | succeeds |
| `server.Tests` | 21/21 |
| e2e, fresh copy of the live DB (all migrations, the column dropped, no `baseLegitimacy` in the API) | 60/60 |

**`power.spec.ts`** (27 tests):
- **People:** nobody; 3 named with a leader; plus 40 unnamed; groups 19 / 20 / 39 / 40 / 59 / 60 / 100; qualifying through unnamed members alone; the leader killed, transferred, removed or replaced, an outsider as leader, and the bonus counted once; who counts as a named member; an unnamed member becoming named; monotone over 200 random rosters.
- **Assets:** each Role → its channel; Type is ignored; the brief's 16 → 13 example; the Holdings 14/15/16 and Mandate 4/5/6 boundaries; a transfer; Destroyed, Damaged, then restored.
- **Power:** all eight channel combinations; Influence, Momentum and the Power Modifier are not inputs.
- **Events:** a leader killed, 120 recruits and an Asset taken each change the next Faction Phase's Power (1 → 0 → 1 → 2), with no Power Effect anywhere.

The rule-check, cascade and momentum specs were moved off Legitimacy.

**e2e:** the Earliest Act assertion now accepts the I/II/III data you imported.

**Production build:** still fails only on budgets that were already failing. `faction-detail.component.scss` grew by about 0.9 kB this week.

## Simulation (`experiments12.py`, 1000 runs, the starting roster)
- **Stars model, every goal at Act II:** Power share 0/1/2/3 = 0/34/66/0%. About 11.7 Power is spent per turn in Act II and 10.4 in Act III. 2.7 goals are Accomplished.
- **Score model (§18.6) for comparison:** 17/25/43/14% and 10.8 / 7.9.
- **Unchanged:** Momentum moves on 6% of boundaries, and character outcomes are the same.

These are mechanical results on the unbalanced roster, not targets.
