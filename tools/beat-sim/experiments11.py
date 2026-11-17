"""2026-10-15 brief: persistent Momentum -2..+2 moved by natural-12 / natural-2 critical signals (cap 1 per Opening),
under Power allocation. Usage: python3 -I experiments11.py <real workdir (live.json + calib.json)> <synthetic dir> [runs]"""
import sys, os, copy, dataclasses, statistics as st, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from colony_sim import Config, load, batch

REAL, SYN = sys.argv[1], sys.argv[2]
RUNS = int(sys.argv[3]) if len(sys.argv) > 3 else 500
FX = ['aspis', 'cult', 'institute', 'keepers', 'seekers', 'shattered', 'witnesses']
GM_TIERS = {f: 0 for f in FX} | {'keepers': 1, 'seekers': 2, 'shattered': -1}
BASE = Config(power='channels', channels=(68, 62, 45), rev3_order=True, delayed_check=True, ready_to_resolve=True,
              draws_by_stress=True, stress_k=5, settle=True, start_tiers=GM_TIERS, rtr_collide=False, unattended_turns=1,
              detector=True, per_faction=True, conflicted_first=False, failed_check_to=1, recovery_exempt=True,
              reaffirmation=True, fp_mode='alloc', fb_target=9, mom_model='crit')
R = lambda **kw: dataclasses.replace(BASE, **kw)
FP = list(range(3, 11)); ACT2 = [3, 4, 5, 6]
CRIT = ('Critical 12/2, cap 1 (candidate)', {})
COMPARE = [CRIT,
           ('Critical 12/2, no cap', dict(mom_cap=2)),
           ('Critical 11-12 / 2-3 (diagnostic)', dict(crit_band=1)),
           ('Baseline signals (M3)', dict(mom_model='signals')),
           ('B as specified (symmetric)', dict(mom_model='track')),
           ('B centered + memory, map 2/4', dict(mom_model='track', mom_center=True, mom_smooth=0.5, mom_center_spares=False, mom_map=(2, 4))),
           ('A equal penalties', dict(mom_model='rank', mom_fail_a=(1.0, 1.0, 1.0)))]

def series(o, f): return [o[1]['log'].get(f'mod_{f}_t{t}', 0) for t in FP]

def dyn(outs, facs):
    dist = collections.Counter(); ch = n = 0; up_hi = dn_hi = hi = 0; rec = fromneg = 0; runs = {2: [], -2: []}
    for o in outs:
        for f in facs:
            s = series(o, f); dist.update(s)
            for i in range(len(s) - 1):
                n += 1; ch += s[i + 1] != s[i]
                if s[i] >= 1: hi += 1; up_hi += s[i + 1] > s[i]; dn_hi += s[i + 1] < s[i]
                if s[i] <= -1 and i + 2 < len(s): fromneg += 1; rec += max(s[i + 1], s[i + 2]) >= 0
            for lvl in (2, -2):
                r = 0
                for v in s + [None]:
                    if v == lvl: r += 1
                    elif r: runs[lvl].append(r); r = 0
    tot = sum(dist.values())
    return dict(dist={k: dist[k] / tot for k in (-2, -1, 0, 1, 2)}, change=ch / n, mean=sum(k * v for k, v in dist.items()) / tot,
                run2=st.mean(runs[2]) if runs[2] else 0, runm2=st.mean(runs[-2]) if runs[-2] else 0,
                rec=rec / fromneg if fromneg else float('nan'), up_hi=up_hi / hi if hi else float('nan'), dn_hi=dn_hi / hi if hi else float('nan'))

def res(outs):
    L = [o[1]['log'] for o in outs]; g = lambda k: st.mean(l.get(k, 0) for l in L)
    w = g('res_with_signals') or 1
    return dict(pos=g('res_pos'), neg=g('res_neg'), cancel=g('res_cancel'), capped=g('momentum_capped') / w, multi=g('res_multi') / w,
                clamped=g('res_clamped') / w, crits=(g('crit_pos') + g('crit_neg')) / 8)

def pace(D, outs, facs):
    L = [o[1]['log'] for o in outs]; g = lambda k: sum(l.get(k, 0) for l in L) / len(L); beats = g('fb_beats') or 1
    dev = [l.get(f'dev_t{t}', 0) for l in L for t in FP]
    return dict(dev=st.mean(dev), p90=sorted(dev)[int(.9 * len(dev))], mile=g('milestones') / beats,
                acc=(g('advances') - g('milestones') - g('ready_created')) / beats, ready=g('ready_created') / beats,
                rolls=g('fb_rolls') / beats,
                exh=st.mean(int(l.get(f'exh_{f}_t6', 0) == 1) for l in L for f in facs),
                stock=(g('advances') - g('milestones')) / max(1, sum(1 for x in D['goals'] if x['conditionType'] == 'Achieve')))

def fmt_d(d): return ' '.join(f"{k:+d}:{v:.2f}" for k, v in d['dist'].items())
def line(name, d, r=None, p=None):
    s = (f"  {name:<36} dist {fmt_d(d)} | mean {d['mean']:+.2f} | changes {d['change']:.2f} of FP-to-FP | run at +2 {d['run2']:.1f}, at -2 {d['runm2']:.1f} | "
         f"from <=-1 back to >=0 within 2 FPs {d['rec']:.2f} | from >=+1: up {d['up_hi']:.2f} down {d['dn_hi']:.2f}")
    if r: s += (f"\n  {'':<36} Openings with signals: +{r['pos']:.1f} / -{r['neg']:.1f} / cancelled {r['cancel']:.1f} per campaign | "
                f"capped {r['capped']:.2f}, multi-signal {r['multi']:.2f}, absorbed at ±2 {r['clamped']:.2f} | criticals per Faction Phase {r['crits']:.2f}")
    if p: s += (f"\n  {'':<36} developments/turn {p['dev']:.2f} (p90 {p['p90']}) = milestones {p['mile']:.2f} + automatic {p['acc']:.2f} + ready {p['ready']:.2f} | "
                f"rolls {p['rolls']:.1f} | factions out of goals at the last Act II phase {p['exh']:.2f} | stock finished {p['stock']:.2f}")
    return s

def cell(D, cp, cfg, facs=FX):
    outs = batch(D, cp, cfg, RUNS); return outs, dyn(outs, facs), res(outs), pace(D, outs, facs)

D0, C0 = load(REAL)
print(f"Persistent Momentum with critical signals, Power allocation, {RUNS} campaigns per cell, Rev 7 + D7-1.")
print("Modifier = the Momentum each faction rolls with at each of the 8 Faction Phases (S5-S12).\n")

print("== 1. Real campaign, 9+ (GM starting tiers: Order +1, Dawn +2, Shattered -1)")
for name, kw in COMPARE:
    outs, d, r, p = cell(D0, C0, R(**kw)); print(line(name, d, r, p))
outs, _, _, _ = cell(D0, C0, R())
traj = [st.mean(o[1]['log'].get(f'mod_{f}_t{t}', 0) for o in outs for f in FX) for t in FP]
print("  candidate: mean modifier by Faction Phase " + ' '.join(f"{v:+.2f}" for v in traj))

print("\n== 2. Operation target 8+ / 9+ / 10+ (candidate; real campaign)")
for t in (8, 9, 10):
    outs, d, r, p = cell(D0, C0, R(fb_target=t)); print(line(f'target {t}+', d, r, p))

print("\n== 3. Power: mixed roster 1-1-2-2-3-3-3 (neutral starts) and uniform rosters")
mixed = dict(zip(FX, [1, 1, 2, 2, 3, 3, 3]))
for name, kw in (CRIT, ('Critical, no cap', dict(mom_cap=2))):
    outs = batch(D0, C0, R(power_override=mixed, start_tiers={f: 0 for f in FX}, **kw), RUNS)
    for pw in (1, 2, 3):
        fs = [f for f in FX if mixed[f] == pw]; d = dyn(outs, fs)
        crit = st.mean(sum(o[1]['log'].get(f'crit_{f}', 0) for f in fs) / len(fs) for o in outs) / 8
        print(line(f'{name}: Power {pw}', d) + f" | criticals per faction per FP {crit:.3f}")
for pw in (1, 3):
    outs, d, r, p = cell(D0, C0, R(power_override={f: pw for f in FX}, start_tiers={f: 0 for f in FX}))
    print(line(f'all Power {pw}', d, r))

print("\n== 4. Concentration vs distribution: criticals per allocated Power, by attempts allocated to the goal (early success stops rolling)")
outs = batch(D0, C0, R(), RUNS); L = [o[1]['log'] for o in outs]
for k in (1, 2, 3):
    alloc = sum(l.get(f'conc_k{k}', 0) for l in L) * k; crits = sum(l.get(f'crit_k{k}', 0) for l in L)
    print(f"  {k} attempt(s) allocated: criticals per allocated Power {crits / alloc:.4f} (per actual roll 2/36 = {2 / 36:.4f})")

print("\n== 5. Starting conditions (candidate)")
for label, tiers in (('all neutral', {f: 0 for f in FX}), ('split +2 x3 / -2 x4', dict(zip(FX, [2, 2, 2, -2, -2, -2, -2]))),
                     ('all +2', {f: 2 for f in FX}), ('all -2', {f: -2 for f in FX})):
    outs, d, r, p = cell(D0, C0, R(start_tiers=tiers))
    traj = [st.mean(o[1]['log'].get(f'mod_{f}_t{t}', 0) for o in outs for f in FX) for t in FP]
    print(line(label, d) + "\n  " + ' ' * 37 + "mean by FP " + ' '.join(f"{v:+.2f}" for v in traj))

def priority_world(D, crit, minor):
    D = copy.deepcopy(D)
    for g in D['goals']:
        if g['conditionType'] != 'Achieve': continue
        if g['factionId'] in crit: g['priority'] = 'Critical'
        if g['factionId'] in minor: g['priority'] = 'Minor'
    return D
print("\n== 6. Priority portfolios (Aspis, Cult all-Critical; EGRESS, Order all-Minor; Power 2 everywhere; neutral)")
PW = priority_world(D0, {'aspis', 'cult'}, {'institute', 'keepers'})
outs = batch(PW, C0, R(power_override={f: 2 for f in FX}, start_tiers={f: 0 for f in FX}), RUNS)
for grp, fs in (('Critical-heavy', ['aspis', 'cult']), ('Minor-heavy', ['institute', 'keepers']), ('as authored', ['seekers', 'shattered', 'witnesses'])):
    crit = st.mean(sum(o[1]['log'].get(f'crit_{f}', 0) for f in fs) / len(fs) for o in outs) / 8
    print(line(grp, dyn(outs, fs)) + f" | criticals per faction per FP {crit:.3f}")

print("\n== 7. Goal inventories (synthetic, neutral)")
for wname in ('goals_0.5x', 'base', 'goals_2.0x', 'contested'):
    D, cp = load(os.path.join(SYN, wname)); facs = [f['id'] for f in D['factions'] if f['type'] == 'Faction']
    outs, d, r, p = cell(D, cp, R(start_tiers={f: 0 for f in facs}), facs)
    print(line(wname, d, r, p))

print("\n== 8. Reading branches (Session 4 outcome at the first Act II Opening; GM-declared setback/success signals)")
gid = lambda pre: next(g['id'] for g in D0['goals'] if g['id'].startswith(pre))
CR, SR, KEEPER = gid('67fe02c3'), gid('8bd0a0cb'), gid('6c8fbe28')
VARA = next(c['id'] for c in D0['characters'] if 'Vara' in c['name'])
def branch(kind):
    def hook(col, t):
        if t != 3: return
        g = col.goals
        if kind == 'stopped':
            col.ch[VARA]['state'] = 'Alive'; g[CR]['status'] = 'Failed'; g[SR]['status'] = 'Accomplished'
            col.pending['seekers'].append((('reading', 'stopped'), +1, 'major success: the Reading was stopped'))
            col.pending['keepers'].append((('reading', 'stopped-o'), -1, 'GM-declared setback: the Reading was stopped'))
        else:
            col.ch[VARA]['state'] = 'Forgotten'; g[CR]['status'] = 'Accomplished'; g[SR]['status'] = 'Failed'
            col.pending['keepers'].append((('reading', 'completed'), +1, 'major success: the Reading was completed'))
            col.pending['seekers'].append((('reading', 'completed-d'), -1, 'GM-declared setback: the Reading was not stopped'))
            g[KEEPER]['obsolete'] = True
    return hook
for kind in ('stopped', 'completed'):
    outs = batch(D0, C0, R(turn_hook=branch(kind)), RUNS)
    for f in ('keepers', 'seekers'):
        s = [st.mean(o[1]['log'].get(f'mod_{f}_t{t}', 0) for o in outs) for t in FP]
        print(f"  Reading {kind:<9} {f:<8} mean modifier by FP " + ' '.join(f"{v:+.2f}" for v in s))

print("\n== 9. The negative drift: Keystones lost to OPERATIONS send the owner -1 with no positive counterpart (2.5 per campaign)")
print("   'loss' = as proposed; 'none' = operations move Momentum only through criticals; 'transfer' = owner -1, acting faction +1 (same root)")
for mode in ('loss', 'none', 'transfer'):
    print(f"-- ops_keystone = {mode}")
    outs, d, r, p = cell(D0, C0, R(ops_keystone=mode)); print(line('real campaign (GM starts)', d, r))
    outs, d, r, p = cell(D0, C0, R(ops_keystone=mode, start_tiers={f: 0 for f in FX}))
    traj = [st.mean(o[1]['log'].get(f'mod_{f}_t{t}', 0) for o in outs for f in FX) for t in FP]
    print(line('real roster, neutral starts', d, r) + "\n  " + ' ' * 37 + "mean by FP " + ' '.join(f"{v:+.2f}" for v in traj))
    outs = batch(D0, C0, R(ops_keystone=mode, power_override=mixed, start_tiers={f: 0 for f in FX}), RUNS)
    print('  mixed Power: ' + ' | '.join(f"Power {pw}: mean {dyn(outs, [f for f in FX if mixed[f] == pw])['mean']:+.2f} changes {dyn(outs, [f for f in FX if mixed[f] == pw])['change']:.2f}" for pw in (1, 2, 3)))
    D, cp = load(os.path.join(SYN, 'contested')); facs = [f['id'] for f in D['factions'] if f['type'] == 'Faction']
    outs, d, r, p = cell(D, cp, R(ops_keystone=mode, start_tiers={f: 0 for f in facs}), facs); print(line('synthetic contested', d, r))
    for kind in ('stopped',):
        o2 = batch(D0, C0, R(ops_keystone=mode, turn_hook=branch(kind)), RUNS)
        for f in ('keepers', 'seekers'):
            print(f"  Reading {kind} {f:<8} mean modifier by FP " + ' '.join(f"{st.mean(o[1]['log'].get(f'mod_{f}_t{t}', 0) for o in o2):+.2f}" for t in FP))
