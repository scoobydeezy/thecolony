"""
One-at-a-time sensitivity sweeps around the Rev 3 configuration (shape of response curves, not targets).
Usage: python3 -I sensitivity.py <syn_dir> <real_dir> [runs]     (default 400 runs per configuration and world)
Worlds: the real Colony fixture plus synthetic base, contested and low_conv (+ incompatible for Defection sweeps).
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import world, scenario_cfg, run

syn, real = sys.argv[1], sys.argv[2]; RUNS = int(sys.argv[3]) if len(sys.argv) > 3 else 400
WORLDS = {'real': world(real), 'base': world(os.path.join(syn, 'base')),
          'contested': world(os.path.join(syn, 'contested')), 'low_conv': world(os.path.join(syn, 'low_conv')),
          'incompatible': world(os.path.join(syn, 'incompatible'))}

def fac_row(r):
    h = r['slot_hist']
    return (f"P1/P2/P3 {h[1]:.2f}/{h[2]:.2f}/{h[3]:.2f}  pool/b {r['pool_beat']:5.1f}  adv {r['adv']:5.1f}  acc {r['acc']:4.2f}  "
            f"ready {r['ready']:4.2f}  coll {r['collisions']:4.2f}")
def chr_row(r):
    return (f"comp {r['comp']:4.2f}  crisis {r['crisis']:4.2f}  defect {r['defect']:4.2f}  P0 {r['p0']:4.2f}  P>=4 {r['p4']:4.2f}  "
            f"cbpool {r['cb_pool']:4.1f}  P(chr) {r['p_char_drawn']:4.2f}")

def sweep(title, points, worlds, kind, runs=RUNS):
    print(f"\n== {title}  ({runs} runs/point)")
    for wn in worlds:
        D, compat, meta = WORLDS[wn]
        print(f"  [{wn}]")
        for lab, kw in points:
            r = run(D, compat, scenario_cfg(D, meta, syn, **kw), runs)
            line = fac_row(r) if kind == 'f' else chr_row(r) if kind == 'c' else fac_row(r) + ' | ' + chr_row(r)
            print(f"    {lab:<16} {line}")

ALL = ['real', 'base', 'contested', 'low_conv']
C = (68, 62, 45)
for i, ch in enumerate(['T_People', 'T_Holdings', 'T_Mandate']):
    pts = []
    for d in (-10, -5, 0, 5, 10):
        th = list(C); th[i] += d; pts.append((f"{ch[2:]} {th[i]}", dict(channels=tuple(th))))
    sweep(f"Channel threshold {ch} ±10 (others at 68/62/45)", pts, ALL, 'f')

grid = [(f"{p}/{h}/{m}", dict(channels=(p, h, m))) for p in (58, 68, 78) for h in (52, 62, 72) for m in (35, 45, 55)]
sweep("Coarse threshold grid P/H/M", grid, ['real', 'base'], 'f', runs=max(100, RUNS // 2))

def tiers(D, v): return {f['id']: v for f in D['factions'] if f['type'] == 'Faction'}
print("\n== Starting Momentum tier (all factions set to the same tier)  (%d runs/point)" % RUNS)
for wn in ALL:
    D, compat, meta = WORLDS[wn]; print(f"  [{wn}]")
    for v in (-2, -1, 0, 1, 2):
        r = run(D, compat, scenario_cfg(D, meta, syn, start_tiers=tiers(D, v)), RUNS)
        print(f"    tier {v:+d}          {fac_row(r)}")

sweep("Character Beat draw schedule", [('fixed 2', dict(draws_by_stress=False, char_slots=2)), ('fixed 3', dict(draws_by_stress=False, char_slots=3)),
                                       ('fixed 4', dict(draws_by_stress=False, char_slots=4)), ('stress-scaled', {})], ALL, 'c')
sweep("Stress coefficient k", [(f"k={k}", dict(stress_k=k)) for k in (3, 5, 7, 10)], ALL, 'c')
sweep("Drift Roll target", [(f"target {t}", dict(drift_target=t)) for t in (7, 8, 9)], ALL, 'c')
sweep("Defection Check target", [(f"target {t}", dict(defect_target=t)) for t in (7, 8, 9)], ALL + ['incompatible'], 'c')
sweep("Label modifier scale", [(f"x{s}", dict(label_scale=s)) for s in (0.5, 1, 2)], ALL + ['incompatible'], 'c')
sweep("Faction Beat roll target (context)", [(f"target {t}", dict(fb_target=t)) for t in (7, 8, 9)], ['real', 'base'], 'f')
