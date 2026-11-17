"""2026-10-15 Faction Phase brief: Momentum candidates under Power allocation.
Usage: python3 -I experiments10.py <real workdir (live.json + calib.json)> <synthetic dir> [runs]"""
import sys, os, copy, dataclasses, statistics as st, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from colony_sim import Config, load, batch, PRIO

REAL, SYN = sys.argv[1], sys.argv[2]
RUNS = int(sys.argv[3]) if len(sys.argv) > 3 else 600
FX = ['aspis', 'cult', 'institute', 'keepers', 'seekers', 'shattered', 'witnesses']
GM_TIERS = {f: 0 for f in FX} | {'keepers': 1, 'seekers': 2, 'shattered': -1}     # the GM-set starting tiers (live DB, O-3)
BASE = Config(power='channels', channels=(68, 62, 45), rev3_order=True, delayed_check=True, ready_to_resolve=True,
              draws_by_stress=True, stress_k=5, settle=True, start_tiers=GM_TIERS, rtr_collide=False, unattended_turns=1,
              detector=True, per_faction=True, conflicted_first=False, failed_check_to=1, recovery_exempt=True,
              reaffirmation=True, fp_mode='alloc', fb_target=9)
R = lambda base=BASE, **kw: dataclasses.replace(base, **kw)
FP = list(range(3, 11)); ACT2 = [3, 4, 5, 6]

MODELS = [
    ('Baseline: capped signals', dict(mom_model='signals')),
    ('A: efficiency leaderboard', dict(mom_model='rank')),
    ('B: track, map 3/6 (proposed)', dict(mom_model='track', mom_map=(3, 6))),
    ('B: track, map 4/7 (narrower)', dict(mom_model='track', mom_map=(4, 7))),
    ('B: track, map 2/5 (wider)', dict(mom_model='track', mom_map=(2, 5))),
    ('Bn: track / Power, map 3/6', dict(mom_model='track_norm', mom_map=(3, 6))),
]

def pearson(x, y):
    if len(x) < 3: return float('nan')
    mx, my = st.mean(x), st.mean(y); sx = sum((a - mx) ** 2 for a in x) ** .5; sy = sum((b - my) ** 2 for b in y) ** .5
    return sum((a - mx) * (b - my) for a, b in zip(x, y)) / (sx * sy) if sx and sy else float('nan')

def dynamics(outs, facs):
    """Modifier series used at each Faction Phase, per faction (8 values)."""
    ch = rev = n = at2 = atm2 = 0; stay2 = from2 = 0; rec = fromm2 = 0; rec2 = fromm2b = 0
    runs2 = []; pw, md = [], []; m_t, m_t1 = [], []
    for o in outs:
        L = o[1]['log']
        for f in facs:
            s = [L.get(f'mod_{f}_t{t}', 0) for t in FP]; p = [L.get(f'pow_{f}_t{t}', 0) for t in FP]
            pw += p; md += s; run = 0
            for i, v in enumerate(s):
                n += 1; at2 += v == 2; atm2 += v == -2
                run = run + 1 if v == 2 else (runs2.append(run) or 0) if run else 0
                if i + 1 < len(s):
                    w = s[i + 1]; ch += w != v; rev += abs(w - v) >= 3; m_t.append(v); m_t1.append(w)
                    if v == 2: from2 += 1; stay2 += w == 2
                    if v == -2: fromm2 += 1; rec += w >= 0
                if i + 2 < len(s) and v == -2: fromm2b += 1; rec2 += max(s[i + 1], s[i + 2]) >= 0
            if run: runs2.append(run)
    tr = n - len(outs) * len(facs)
    return dict(change=ch / tr, reversal=rev / tr, at2=at2 / n, atm2=atm2 / n, stay2=stay2 / from2 if from2 else float('nan'),
                run2=st.mean(runs2) if runs2 else 0, rec1=rec / fromm2 if fromm2 else float('nan'),
                rec2=rec2 / fromm2b if fromm2b else float('nan'), r_power=pearson(pw, md), autocorr=pearson(m_t, m_t1),
                mean_mod=st.mean(md))

def movement(D, outs, facs):
    L = [o[1]['log'] for o in outs]; g = lambda k: sum(l.get(k, 0) for l in L) / len(L)
    beats = g('fb_beats') or 1
    dev = [l.get(f'dev_t{t}', 0) for l in L for t in FP]
    ops_acc = g('advances') - g('milestones') - g('ready_created')
    exh2 = st.mean(l.get(f'exh_{f}_t{t}', 0) for l in L for f in facs for t in ACT2)
    exh_before3 = st.mean(int(l.get(f'exh_{f}_t6', 0) == 1) for l in L for f in facs)
    conc = {k: g(f'conc_k{k}_ok') / (g(f'conc_k{k}') or 1) for k in (1, 2, 3)}
    return dict(dev=st.mean(dev), p90=sorted(dev)[int(.9 * len(dev))], mx=max(dev), mile=g('milestones') / beats,
                acc=ops_acc / beats, ready=g('ready_created') / beats, rolls=g('fb_rolls') / beats,
                adv_p={p: g(f'adv_prio_{p}') / beats for p in ('Critical', 'Major', 'Minor')},
                exh2=exh2, exh_before3=exh_before3, conc=conc, defect=st.mean(o[1]['defected'] for o in outs),
                stock=(g('advances') - g('milestones')) / max(1, sum(1 for x in D['goals'] if x['conditionType'] == 'Achieve')))

def show(name, d, m=None):
    s = (f"  {name:<30} change {d['change']:.2f} rev(|Δ|>=3) {d['reversal']:.3f} | at +2 {d['at2']:.2f} at -2 {d['atm2']:.2f} | "
         f"+2 stays {d['stay2']:.2f} (run {d['run2']:.1f}) | -2 recovers next {d['rec1']:.2f} within 2 {d['rec2']:.2f} | "
         f"r(Power,mod) {d['r_power']:+.2f} autocorr {d['autocorr']:+.2f} mean {d['mean_mod']:+.2f}")
    if m: s += (f"\n  {'':<30} dev/turn {m['dev']:.2f} (p90 {m['p90']}, max {m['mx']}) = milestones {m['mile']:.2f} + automatic {m['acc']:.2f} "
                f"+ ready {m['ready']:.2f} | rolls {m['rolls']:.1f} | by priority " + ' '.join(f"{p[:3]} {v:.2f}" for p, v in m['adv_p'].items()) +
                f" | no eligible goals: Act II faction-turns {m['exh2']:.2f}, at the last Act II phase {m['exh_before3']:.2f} | "
                f"P(advance|k=1,2,3) {m['conc'][1]:.2f}/{m['conc'][2]:.2f}/{m['conc'][3]:.2f} | stock finished {m['stock']:.2f} | defections {m['defect']:.2f}")
    print(s)

def run(D, cp, cfg, facs=None, mv=True, runs=RUNS):
    outs = batch(D, cp, cfg, runs); facs = facs or sorted({f['id'] for f in D['factions'] if f['type'] == 'Faction'} & set(FX) or
                                                           {f['id'] for f in D['factions'] if f['type'] == 'Faction'})
    return dynamics(outs, facs), (movement(D, outs, facs) if mv else None)

D0, C0 = load(REAL)
print(f"Momentum candidates under Power allocation, operation target 9+, {RUNS} campaigns per cell, Rev 7 + D7-1.")
print("Modifier series = the Momentum modifier each faction rolls with at each of the 8 Faction Phases.\n")

print("== 1. Real campaign (GM-set starting tiers: Order +1, Dawn +2, Shattered -1, others 0)")
for name, kw in MODELS: show(name, *run(D0, C0, R(**kw)))

print("\n== 2. Operation-target sensitivity (real campaign): 8+ and 10+")
for tgt in (8, 10):
    print(f"-- target {tgt}+")
    for name, kw in MODELS[:3] + MODELS[5:]: show(name, *run(D0, C0, R(fb_target=tgt, **kw)))

def priority_world(D, crit, minor):
    D = copy.deepcopy(D)
    for g in D['goals']:
        if g['conditionType'] != 'Achieve': continue
        if g['factionId'] in crit: g['priority'] = 'Critical'
        if g['factionId'] in minor: g['priority'] = 'Minor'
    return D

print("\n== 3. Portfolios: Aspis and Cult all-Critical, EGRESS and Order all-Minor, the rest as authored (real world, equal Power 2)")
PW = priority_world(D0, {'aspis', 'cult'}, {'institute', 'keepers'})
for name, kw in MODELS[:3] + MODELS[5:]:
    outs = batch(PW, C0, R(power_override={f: 2 for f in FX}, start_tiers={f: 0 for f in FX}, **kw), RUNS)
    row = []
    for grp, fs in (('Critical-heavy', ['aspis', 'cult']), ('Minor-heavy', ['institute', 'keepers']), ('mixed', ['seekers', 'shattered', 'witnesses'])):
        d = dynamics(outs, fs)
        adv = st.mean(sum(o[1]['log'].get(f'adv_{f}', 0) for f in fs) / len(fs) for o in outs)
        row.append(f"{grp}: mean mod {d['mean_mod']:+.2f}, at +2 {d['at2']:.2f}, at -2 {d['atm2']:.2f}, change {d['change']:.2f}, advances {adv:.2f}")
    print(f"  {name:<30} " + ' | '.join(row))

print("\n== 4. Power levels (real world, neutral starts): every faction at Power 1 / 2 / 3, and a mixed 1-1-2-2-3-3-3 roster")
for label, pov in (('all Power 1', {f: 1 for f in FX}), ('all Power 2', {f: 2 for f in FX}), ('all Power 3', {f: 3 for f in FX}),
                   ('mixed', dict(zip(FX, [1, 1, 2, 2, 3, 3, 3])))):
    print(f"-- {label}")
    for name, kw in MODELS[:3] + MODELS[5:]:
        d, m = run(D0, C0, R(power_override=pov, start_tiers={f: 0 for f in FX}, **kw))
        extra = ''
        if label == 'mixed':
            outs = batch(D0, C0, R(power_override=pov, start_tiers={f: 0 for f in FX}, **kw), RUNS)
            byp = {p: dynamics(outs, [f for f in FX if pov[f] == p]) for p in (1, 2, 3)}
            extra = ' | by Power: ' + ' '.join(f"P{p} mean {v['mean_mod']:+.2f} change {v['change']:.2f}" for p, v in byp.items())
        print(f"  {name:<30} change {d['change']:.2f} | at +2 {d['at2']:.2f} at -2 {d['atm2']:.2f} | +2 stays {d['stay2']:.2f} | "
              f"-2 recovers {d['rec1']:.2f} | r(Power,mod) {d['r_power']:+.2f} | dev/turn {m['dev']:.2f}{extra}")

print("\n== 5. Starting Momentum (real world): all +2, all -2, and split (+2 x3 / -2 x4)")
for label, tiers in (('all +2', {f: 2 for f in FX}), ('all -2', {f: -2 for f in FX}),
                     ('split', dict(zip(FX, [2, 2, 2, -2, -2, -2, -2])))):
    print(f"-- {label}")
    for name, kw in MODELS[:3] + MODELS[5:]:
        outs = batch(D0, C0, R(start_tiers=tiers, **kw), RUNS)
        first = st.mean(o[1]['log'].get(f'mod_{f}_t3', 0) for o in outs for f in FX)
        late = st.mean(o[1]['log'].get(f'mod_{f}_t{t}', 0) for o in outs for f in FX for t in (8, 9, 10))
        d = dynamics(outs, FX)
        print(f"  {name:<30} mean modifier at the first Faction Phase {first:+.2f} -> Act III {late:+.2f} | at +2 {d['at2']:.2f} at -2 {d['atm2']:.2f}")

print("\n== 6. Goal inventories and opposition (synthetic worlds, neutral starts)")
for wname in ('goals_0.5x', 'base', 'goals_2.0x', 'contested', 'high_power'):
    D, cp = load(os.path.join(SYN, wname)); print(f"-- {wname}")
    facs = [f['id'] for f in D['factions'] if f['type'] == 'Faction']
    for name, kw in MODELS[:3] + MODELS[5:]:
        show(name, *run(D, cp, R(start_tiers={f: 0 for f in facs}, **kw), facs=facs))

print("\n== 7. Post-Reading branches (real world; Session 4 outcome applied at the first Act II Opening)")
gid = lambda pre: next(g['id'] for g in D0['goals'] if g['id'].startswith(pre))
CR, SR, KEEPER = gid('67fe02c3'), gid('8bd0a0cb'), gid('6c8fbe28')
VARA = next(c['id'] for c in D0['characters'] if 'Vara' in c['name'])
def branch(kind):
    def hook(col, t):
        if t != 3: return
        g = col.goals
        if kind == 'stopped':
            col.ch[VARA]['state'] = 'Alive'; g[CR]['status'] = 'Failed'; g[SR]['status'] = 'Accomplished'
            col.pending['seekers'].append((('reading', 'stopped'), +1, 'Stop the Ritual accomplished (credited)'))
            col.pending['keepers'].append((('reading', 'stopped-o'), -1, 'GM-declared setback: the Reading was stopped'))
        else:
            col.ch[VARA]['state'] = 'Forgotten'; g[CR]['status'] = 'Accomplished'; g[SR]['status'] = 'Failed'
            col.pending['keepers'].append((('reading', 'completed'), +1, 'Complete the Ritual accomplished (credited)'))
            col.pending['seekers'].append((('reading', 'completed-d'), -1, 'GM-declared setback: the Reading was not stopped'))
            g[KEEPER]['obsolete'] = True
    return hook
for kind in ('stopped', 'completed'):
    print(f"-- Reading {kind}")
    for name, kw in MODELS[:3]:
        outs = batch(D0, C0, R(turn_hook=branch(kind), **kw), RUNS)
        for f in ('keepers', 'seekers'):
            s = [st.mean(o[1]['log'].get(f'mod_{f}_t{t}', 0) for o in outs) for t in FP]
            print(f"  {name:<30} {f:<8} modifier by Faction Phase " + ' '.join(f"{v:+.2f}" for v in s))

print("\n== 8. Material events on vs off (track model, real world): keystone loss, leader loss, unattended outcomes, branches")
for label, kw in (('events on (3 points, cap 3)', {}), ('events off', dict(event_points=0))):
    outs = batch(D0, C0, R(mom_model='track', turn_hook=branch('stopped'), **kw), RUNS)
    s = [st.mean(o[1]['log'].get(f'mod_keepers_t{t}', 0) for o in outs) for t in FP]
    print(f"  {label:<30} Order modifier by Faction Phase (Reading stopped) " + ' '.join(f"{v:+.2f}" for v in s) +
          f" | events applied per campaign {st.mean(o[1]['log'].get('mom_events', 0) for o in outs):.2f}")

# ---------------- 9. Corrected Candidate B (diagnosis: symmetric scoring is negative-expected at 9+) ----------------
print("\n== 9. Candidate B corrections. E[score per roll] = p - q(1-p); neutral at q = p/(1-p) = 0.38 for 9+ (0.71 for 8+, 0.20 for 10+)")
FIXED = [
    ('A: efficiency leaderboard', dict(mom_model='rank')),
    ('B proposed (q=1)', dict(mom_model='track')),
    ('B q=0.4', dict(mom_model='track', mom_fail_w=0.4)),
    ('B q=0.4 + memory 0.5', dict(mom_model='track', mom_fail_w=0.4, mom_smooth=0.5)),
    ('B q=0.4 + memory 0.5, cap ±1', dict(mom_model='track', mom_fail_w=0.4, mom_smooth=0.5, mom_map=(3, 99))),
]
mixed = dict(zip(FX, [1, 1, 2, 2, 3, 3, 3]))
for name, kw in FIXED:
    print(f"-- {name}")
    show('real campaign', *run(D0, C0, R(**kw)))
    outs = batch(D0, C0, R(power_override=mixed, start_tiers={f: 0 for f in FX}, **kw), RUNS)
    byp = {p: dynamics(outs, [f for f in FX if mixed[f] == p]) for p in (1, 2, 3)}
    print(f"  {'mixed Power roster':<30} " + ' | '.join(f"Power {p}: mean {v['mean_mod']:+.2f} at +2 {v['at2']:.2f} at -2 {v['atm2']:.2f} change {v['change']:.2f}" for p, v in byp.items()))
    outs = batch(PW, C0, R(power_override={f: 2 for f in FX}, start_tiers={f: 0 for f in FX}, **kw), RUNS)
    row = []
    for grp, fs in (('Critical-heavy', ['aspis', 'cult']), ('Minor-heavy', ['institute', 'keepers'])):
        d = dynamics(outs, fs); adv = st.mean(sum(o[1]['log'].get(f'adv_{f}', 0) for f in fs) / len(fs) for o in outs)
        row.append(f"{grp}: mean {d['mean_mod']:+.2f} at -2 {d['atm2']:.2f} at +2 {d['at2']:.2f} advances {adv:.2f}")
    print(f"  {'portfolios (Power 2)':<30} " + ' | '.join(row))
    for label, tiers in (('start all +2', {f: 2 for f in FX}), ('start all -2', {f: -2 for f in FX})):
        o2 = batch(D0, C0, R(start_tiers=tiers, **kw), RUNS)
        traj = [st.mean(o[1]['log'].get(f'mod_{f}_t{t}', 0) for o in o2 for f in FX) for t in FP]
        print(f"  {label:<30} mean modifier by Faction Phase " + ' '.join(f"{v:+.2f}" for v in traj))
    D, cp = load(os.path.join(SYN, 'base')); facs = [f['id'] for f in D['factions'] if f['type'] == 'Faction']
    show('synthetic base (neutral)', *run(D, cp, R(start_tiers={f: 0 for f in facs}, **kw), facs=facs))

print("\n== 10. Best-candidate target sensitivity (real campaign); failure weight set neutral for each target")
for tgt, q in ((8, 0.7), (9, 0.4), (10, 0.2)):
    show(f'B q={q} memory 0.5, {tgt}+', *run(D0, C0, R(mom_model='track', mom_fail_w=q, mom_smooth=0.5, fb_target=tgt)))

# ---------------- 11. Structural alternatives ----------------
print("\n== 11. Structural alternatives: symmetric B at 8+, centered B (performance against expectation), A with equal failure penalties")
ALT = [
    ('B symmetric, 8+', dict(mom_model='track', fb_target=8)),
    ('B symmetric + memory 0.5, 8+', dict(mom_model='track', fb_target=8, mom_smooth=0.5)),
    ('B centered (x2), map 3/6, 9+', dict(mom_model='track', mom_center=True, mom_map=(3, 6))),
    ('B centered (x2) + memory 0.5, map 3/6, 9+', dict(mom_model='track', mom_center=True, mom_map=(3, 6), mom_smooth=0.5)),
    ('A equal penalties, 9+', dict(mom_model='rank', mom_fail_a=(1.0, 1.0, 1.0))),
]
for name, kw in ALT:
    print(f"-- {name}")
    show('real campaign', *run(D0, C0, R(**kw)))
    outs = batch(D0, C0, R(power_override=mixed, start_tiers={f: 0 for f in FX}, **kw), RUNS)
    byp = {p: dynamics(outs, [f for f in FX if mixed[f] == p]) for p in (1, 2, 3)}
    print(f"  {'mixed Power roster':<30} " + ' | '.join(f"Power {p}: mean {v['mean_mod']:+.2f} at +2 {v['at2']:.2f} at -2 {v['atm2']:.2f} change {v['change']:.2f}" for p, v in byp.items()))
    outs = batch(PW, C0, R(power_override={f: 2 for f in FX}, start_tiers={f: 0 for f in FX}, **kw), RUNS)
    row = []
    for grp, fs in (('Critical-heavy', ['aspis', 'cult']), ('Minor-heavy', ['institute', 'keepers'])):
        d = dynamics(outs, fs); adv = st.mean(sum(o[1]['log'].get(f'adv_{f}', 0) for f in fs) / len(fs) for o in outs)
        row.append(f"{grp}: mean {d['mean_mod']:+.2f} at -2 {d['atm2']:.2f} at +2 {d['at2']:.2f} advances {adv:.2f}")
    print(f"  {'portfolios (Power 2)':<30} " + ' | '.join(row))
    for label, tiers in (('start all +2', {f: 2 for f in FX}), ('start all -2', {f: -2 for f in FX})):
        o2 = batch(D0, C0, R(start_tiers=tiers, **kw), RUNS)
        traj = [st.mean(o[1]['log'].get(f'mod_{f}_t{t}', 0) for o in o2 for f in FX) for t in FP]
        print(f"  {label:<30} mean modifier by Faction Phase " + ' '.join(f"{v:+.2f}" for v in traj))
    D, cp = load(os.path.join(SYN, 'contested')); facs = [f['id'] for f in D['factions'] if f['type'] == 'Faction']
    show('synthetic contested (neutral)', *run(D, cp, R(start_tiers={f: 0 for f in facs}, **kw), facs=facs))

# ---------------- 12. Recommended candidate, final form ----------------
print("\n== 12. Recommended: centered B, memory 0.5, displayed x2, map 2/4, spares neutral vs counted, 9+")
for name, kw in (('spares counted', dict(mom_center_spares=True)), ('spares neutral', dict(mom_center_spares=False))):
    base_kw = dict(mom_model='track', mom_center=True, mom_map=(2, 4), mom_smooth=0.5, **kw)
    print(f"-- {name}")
    show('real campaign', *run(D0, C0, R(**base_kw)))
    outs = batch(PW, C0, R(power_override={f: 2 for f in FX}, start_tiers={f: 0 for f in FX}, **base_kw), RUNS)
    print('  portfolios (Power 2)           ' + ' | '.join(
        f"{grp}: mean {dynamics(outs, fs)['mean_mod']:+.2f} at -2 {dynamics(outs, fs)['atm2']:.2f} at +2 {dynamics(outs, fs)['at2']:.2f}"
        for grp, fs in (('Critical-heavy', ['aspis', 'cult']), ('Minor-heavy', ['institute', 'keepers']))))
    D, cp = load(os.path.join(SYN, 'base')); facs = [f['id'] for f in D['factions'] if f['type'] == 'Faction']
    show('synthetic base (neutral)', *run(D, cp, R(start_tiers={f: 0 for f in facs}, **base_kw), facs=facs))
    for t in (8, 10): show(f'real, target {t}+', *run(D0, C0, R(fb_target=t, **base_kw)))
    o2 = batch(D0, C0, R(turn_hook=branch('stopped'), **base_kw), RUNS)
    for f in ('keepers', 'seekers'):
        print(f"  Reading stopped, {f:<8} modifier by Faction Phase " + ' '.join(f"{st.mean(o[1]['log'].get(f'mod_{f}_t{t}', 0) for o in o2):+.2f}" for t in FP))
    for label, tiers in (('start all +2', {f: 2 for f in FX}), ('start all -2', {f: -2 for f in FX})):
        o3 = batch(D0, C0, R(start_tiers=tiers, **base_kw), RUNS)
        print(f"  {label:<30} mean modifier by Faction Phase " + ' '.join(f"{st.mean(o[1]['log'].get(f'mod_{f}_t{t}', 0) for o in o3 for f in FX):+.2f}" for t in FP))
    outs = batch(D0, C0, R(power_override=mixed, start_tiers={f: 0 for f in FX}, **base_kw), RUNS)
    byp = {p: dynamics(outs, [f for f in FX if mixed[f] == p]) for p in (1, 2, 3)}
    print(f"  {'mixed Power roster':<30} " + ' | '.join(f"Power {p}: at +2 {v['at2']:.2f} at -2 {v['atm2']:.2f} change {v['change']:.2f}" for p, v in byp.items()))

# ---------------- 13. Mapping for the recommended candidate (centered x2 + memory 0.5, spares neutral, 9+) ----------------
print("\n== 13. Mapping thresholds for centered B + memory (spares neutral, 9+): occupancy, persistence, recovery, and who reaches -2")
for mp in ((3, 6), (2, 5), (2, 4), (1.5, 3.5)):
    kw = dict(mom_model='track', mom_center=True, mom_smooth=0.5, mom_center_spares=False, mom_map=mp)
    print(f"-- map {mp[0]}/{mp[1]}")
    show('real campaign', *run(D0, C0, R(**kw)))
    D, cp = load(os.path.join(SYN, 'base')); facs = [f['id'] for f in D['factions'] if f['type'] == 'Faction']
    show('synthetic base (neutral)', *run(D, cp, R(start_tiers={f: 0 for f in facs}, **kw), facs=facs))
    outs = batch(D0, C0, R(power_override=mixed, start_tiers={f: 0 for f in FX}, **kw), RUNS)
    byp = {p: dynamics(outs, [f for f in FX if mixed[f] == p]) for p in (1, 2, 3)}
    print(f"  {'mixed Power roster':<30} " + ' | '.join(f"Power {p}: at +2 {v['at2']:.2f} at -2 {v['atm2']:.2f} change {v['change']:.2f}" for p, v in byp.items()))
    outs = batch(PW, C0, R(power_override={f: 2 for f in FX}, start_tiers={f: 0 for f in FX}, **kw), RUNS)
    print('  portfolios (Power 2)           ' + ' | '.join(
        f"{grp}: mean {dynamics(outs, fs)['mean_mod']:+.2f} at -2 {dynamics(outs, fs)['atm2']:.2f} at +2 {dynamics(outs, fs)['at2']:.2f}"
        for grp, fs in (('Critical-heavy', ['aspis', 'cult']), ('Minor-heavy', ['institute', 'keepers']))))
