"""2026-10-15: Power as a per-Turn allocation budget vs the five-card Faction Phase.
Usage: python3 -I experiments9.py <real workdir (live.json + calib.json)> <synthetic dir> [runs]"""
import sys, os, dataclasses, statistics as st, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from colony_sim import Config, load, batch, PRIO

REAL, SYN = sys.argv[1], sys.argv[2]
RUNS = int(sys.argv[3]) if len(sys.argv) > 3 else 1000
FX = ['aspis', 'cult', 'institute', 'keepers', 'seekers', 'shattered', 'witnesses']
BASE = Config(power='channels', channels=(68, 62, 45), rev3_order=True, delayed_check=True, ready_to_resolve=True,
              draws_by_stress=True, stress_k=5, settle=True, start_tiers={f: 0 for f in FX} | {'keepers': -2},
              rtr_collide=False, unattended_turns=1, detector=True, per_faction=True, conflicted_first=False,
              failed_check_to=1, recovery_exempt=True, reaffirmation=True)          # Rev 7 + D7-1 (decided)
R = lambda **kw: dataclasses.replace(BASE, **kw)
FP_TURNS = [t for t in range(11) if t >= 3]    # Colony Turns with a Faction Phase (Acts II-III)
ACT2 = [3, 4, 5, 6]
P = ('Critical', 'Major', 'Minor')

def metrics(D, outs):
    n = len(outs); L = [o[1]['log'] for o in outs]; L2 = [o[0]['log'] for o in outs]
    g = lambda k, LL=L: sum(l.get(k, 0) for l in LL) / len(LL)
    beats = g('fb_beats') or 1
    achieve = [x for x in D['goals'] if x['conditionType'] == 'Achieve']
    dev = [l.get(f'dev_t{t}', 0) for l in L for t in FP_TURNS]
    out = dict(
        rolls=g('fb_rolls') / beats, adv=g('advances') / beats, mile=g('milestones') / beats,
        done=(g('advances') - g('milestones')) / beats,     # second successes: Accomplished (Automatic) or Ready to Resolve
        dev_mean=st.mean(dev), dev_p90=sorted(dev)[int(.9 * len(dev))], dev_max=max(dev),
        p_adv={p: g(f'adv_prio_{p}') / (g(f'elig_prio_{p}') or 1) for p in P},
        wasted=g('power_wasted') / (g('power_total') or 1), unused=g('power_unused') / (g('power_total') or 1),
        never_tried_act2=st.mean(sum(1 for x in achieve if l.get(f"nomd_{x['id']}", 0) == 0) for l in L2) / len(achieve),
        stock_done=(g('accomplished') + g('ready_created')) / len(achieve),          # share of Achieve goals finished
        acc_campaign=g('accomplished'), ready_campaign=g('ready_created'), adv_campaign=g('advances'),
        defect=st.mean(o[1]['defected'] for o in outs),
        tier_abs=st.mean(st.mean(abs(v) for v in o[1]['tier'].values()) for o in outs),
    )
    return out

def line(name, m):
    pa = ' '.join(f"{p[:3]} {m['p_adv'][p]:.2f}" for p in P)
    return (f"  {name:<30} rolls {m['rolls']:4.1f} | developments/turn {m['dev_mean']:4.2f} (p90 {m['dev_p90']}, max {m['dev_max']}) "
            f"= milestones {m['mile']:4.2f} + finished {m['done']:4.2f} | P(advance|eligible) {pa} | "
            f"power wasted {m['wasted']:.2f} unused {m['unused']:.2f} | never tried in Act II {m['never_tried_act2']:.2f} | "
            f"goal stock finished {m['stock_done']:.2f} (acc {m['acc_campaign']:.1f}, ready {m['ready_campaign']:.1f}) | "
            f"defections {m['defect']:.2f} | mean |tier| {m['tier_abs']:.2f}")

VARIANTS = [
    ('draw5 (Rev 7)', {}),
    ('draw5 + Power wildcard (D4-6\')', dict(wildcard='colony_power')),
    ('alloc 3/2/1, target 8', dict(fp_mode='alloc')),
    ('alloc 3/2/1, target 9  [lever]', dict(fp_mode='alloc', fb_target=9)),
    ('alloc 3/2/1, target 10 [lever]', dict(fp_mode='alloc', fb_target=10)),
]
worlds = [('real (current DB)', *load(REAL))] + [(nm, *load(os.path.join(SYN, nm))) for nm in ('goals_0.5x', 'base', 'goals_2.0x', 'goals_4.0x')]
print(f"Faction Phase comparison, {RUNS} campaigns per cell, 8 Faction Phases (Acts II-III), Rev 7 + D7-1 configuration.")
print("developments = goals that advanced this turn (each is a milestone, an Accomplishment, or a decisive scene to prepare)\n")
for wname, D, cp in worlds:
    ach = sum(1 for x in D['goals'] if x['conditionType'] == 'Achieve')
    pr = collections.Counter(x['priority'] for x in D['goals'] if x['conditionType'] == 'Achieve')
    print(f"== {wname}: {ach} Achieve goals ({dict(pr)})")
    for name, kw in VARIANTS:
        print(line(name, metrics(D, batch(D, cp, R(**kw), RUNS))))
    print()

# Per-turn trajectory on the real world: developments and remaining eligible goals by Faction Phase
print("== real: developments per Faction Phase, by turn (mean over campaigns)")
D, cp = load(REAL)
for name, kw in VARIANTS[:3]:
    outs = batch(D, cp, R(**kw), RUNS)
    traj = [st.mean(o[1]['log'].get(f'dev_t{t}', 0) for o in outs) for t in FP_TURNS]
    print(f"  {name:<30} " + ' '.join(f"S{t + 2}:{v:4.2f}" for t, v in zip(FP_TURNS, traj)))
