# beat-sim: proof-of-concept tools for BOARD-GAME-REVIEW.md

These are audit tools, not app code. They never write to the database.

- `beat_sim.py` implements the Faction Goals.md v1.0 Faction Beat: frozen snapshot, nomination, seeded draw, roll, commit. The open decisions (Power→slots, Momentum policy, defense stacking) are parameters.
- `export.py` converts a copy of `colony-data/colony.db` into the JSON shapes the API serves.
- `harness-tail.ts` is appended to a verbatim copy of `buildColonySnapshots` (`app.store.ts:105–795`). The harness reports snapshots, the five Power variants and drift bands.
- `driver.py` runs the review's scenarios: the traced Beat, the 8-Beat × 2000-run policy comparison, Jorren, the Ledger and champion loss.

Run:

```
./run.sh [workdir]
```

Requires node (with client `node_modules` installed) and python3.

The provisional mappings live at the top of `driver.py`:
- `tier()`: raw Momentum → −2..+2 in 25-point steps
- `slots()`: <45 → 1, 45–59 → 2, ≥60 → 3

Change them there to test alternatives.

## Revision 2 additions

- `calib.ts` computes character→own-faction compatibility (the app's `scoreRelationship` at stress 0, no bump) and Power components (the app's `FactionInfluenceService`) for the **baseline** world.
- `colony_sim.py` runs full-campaign Colony Turns: Faction Beats with capped Momentum aggregation, Power 1–3 from a chosen derivation, defensive assignments, outcome modes and collisions by margin; plus Character Beats with Stable/Conflicted/Compromised, Defection Checks, Settling, and stress-scaled draws. Every open decision is a field on `Config`.
- `experiments.py`, `experiments2.py` and `experiments3.py` produce the tables in BOARD-GAME-REVIEW.md §11.

`./run.sh` runs everything (takes about 3 minutes).

## Revision 3 additions

- `colony_sim.py` `Config` adds:
  - `rev3_order`: Opening (pending Defection Checks, then Momentum resolution), then the Faction Beat, then the Character Beat.
  - `ready_to_resolve`, `channels` thresholds, `start_tiers`.
  - Slot-flip and crisis-session counters.
- `experiments4.py` produces BOARD-GAME-REVIEW.md §11 (Revision 3), including the belief-threshold 0.4 sensitivity run.

## Robustness suite (`robustness/`)

This suite validates the Rev 3 rules mechanically. It does not balance a campaign.

```
robustness/run_all.sh [workdir] [realdir]
```

- Takes about 5 minutes.
- Without `realdir`, the script re-exports the real campaign from `colony.db`, as `run.sh` does.
- Run counts can be overridden with `RUNS_SCEN`, `RUNS_SENS`, `RUNS_SCALE` and `MONO_SCALE`.

Scripts:

- `fixtures.py` builds 22 synthetic `live.json` worlds: scenarios plus scaling of NPC, goal and faction counts. `run_all.sh` then runs `calib.ts` on each world, so the compatibility labels come from the app's `scoreRelationship`.
- `scenarios.py` produces the scenario matrix.
- `monotonicity.py` checks local monotonicity. It uses exact 2d6 math, Beat-level common random numbers (deep-copy the Colony, change one input, replay the same Beat) and paired campaign seeds.
- `sensitivity.py` sweeps one constant at a time.
- `scaling.py` reports absolute and per-entity rates, plus 7-slot and draw-scaling probes.
- `common.py` holds the shared Rev 3 config and metrics.

New `Config` hooks in `colony_sim.py`. All defaults keep the earlier outputs byte-identical.

- `headcount_n`: People also qualifies at named + unrepresented members ≥ N. Character strength stays on named members only.
- `n_slots`, `faction_beat_turns`, `fixed_stress`, `fb_target`, `label_scale`.
- `power_override`, `start_inst`, `start_signals`, `draw_scale`.
- `rtr_collide`: `False` keeps Ready-to-Resolve outcomes out of collisions, per §6.4.
- `trace`: per-character counters.

## Revision 4 additions

- `robustness/REPORT.md` is the mechanical robustness report: monotonicity, scenario matrix, scaling and sensitivity. Regenerate the raw outputs with `robustness/run_all.sh`.
- `colony_sim.py` `Config` adds the Revision 4 candidates. Every default reproduces Revision 3 (verified: `experiments4.py` output is byte-identical).
  - `people_metric='top3'` with `people_top3_t`
  - `draw_rule='pool' | 'pool_stress' | 'pool_tier'`
  - `crisis_cap`
  - `unattended_turns`
  - `detector`
  - `turn_hook`
- `experiments5.py` produces BOARD-GAME-REVIEW.md §14: monotone People, cast-scaled Character draws, unattended resolution, and the two Reading branches.
- `calib_middle.ts` produces the middle-belief scoring comparison in §14.7 (V0 / V1 / V2, exact deltas on the app's own scores).

## Revision 5 additions

- `colony_sim.py` `Config` adds the following. Defaults reproduce Revision 3; `experiments4.py` output is byte-identical.
  - `draw_cap`
  - `cb_nominate`
  - `cb_tiers`
  - `crisis_queue`
  - `wildcard` (`'colony'` / `'faction'`)
  - starvation counters
- `export.py` now exports `narrativeTier` and the party's values and beliefs.
- `experiments6.py <real dir> <synthetic dir>` produces REPORT.md §6 and BOARD-GAME-REVIEW.md §15.

## Revision 6 additions

- `colony_sim.py` `Config` adds the following. Defaults reproduce Revision 3; `experiments4.py` output is byte-identical.
  - `per_faction` and `conflicted_first`: the per-faction Character Phase.
  - `failed_check_to`: 1 = Conflicted, 0 = Stable.
  - `recommit_rest`
  - per-faction and per-character counters.
- `experiments7.py <real dir>` produces REPORT.md §7 and BOARD-GAME-REVIEW.md §16: strategy comparison, selection behavior, faction growth, play-noise test, and the crisis-loop variants.

## Revision 7 additions

- `colony_sim.py` `Config` adds the following. Defaults reproduce Revision 3; `experiments4.py` output is byte-identical.
  - `recovery_exempt`
  - `reaffirmation`
  - `wildcard='colony_faction' | 'colony_power'`
  - re-crisis, recovery and wildcard counters
- `experiments8.py <real dir> <synthetic dir>` produces REPORT.md §8 and BOARD-GAME-REVIEW.md §17: stabilization variants across cast sizes and stress profiles, and wildcard fairness against Power.
