import json, random, sys, statistics, collections
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from beat_sim import Goal, World, run_beat
D = json.load(open(sys.argv[1] + '/live.json'))
H = json.load(open(sys.argv[1] + '/harness_out.json'))
FX = [f for f in D['factions'] if f['type'] == 'Faction']
NAME = {f['id']: f['name'] for f in D['factions']}
CH = {c['id']: c for c in D['characters']}
# current champion state: replay state/faction effects in session order
state = {c['id']: c['state'] for c in D['characters']}
for s in D['sessions']:
    for e in sorted(s['events'], key=lambda e: e['sortOrder']):
        for f in e['effects']:
            if f['targetType'] == 'character' and f['property'] == 'state' and f['value']: state[f['targetId']] = f['value']
last_mom = H['sessions'][-1]['momentum']
def tier(raw):  # PROVISIONAL: band raw momentum into -2..+2 at 25-point steps
    return max(-2, min(2, round(raw / 25)))
power = {k: v['detail'] for k, v in ((f['id'], H['powerVariants'][f['name']]) for f in FX)}
def slots(p):   # PROVISIONAL: Low (<45)=1, Medium (45-59)=2, High (60+)=3
    return 1 if p < 45 else 2 if p < 60 else 3
goals = {g['id']: Goal(g['id'], g['factionId'], g['title'], g['status'], g['conditionType'], g['priority'], g['championId'],
                       g['targetEntityType'], g['targetEntityId'], g['targetState'], g['targetOwnerFactionId']) for g in D['goals']}
W0 = World(goals, state, {f['id']: tier(last_mom[f['id']]) for f in FX}, power,
           {a['id']: a['status'] for a in D['assets']}, {a['id']: a['controllingFactionId'] for a in D['assets']})
print("== Starting board ==")
for f in FX:
    el = [g for g in goals.values() if g.faction == f['id'] and g.kind == 'Achieve' and g.status in ('Plotting', 'Progressing')]
    cap = [g for g in el if state.get(g.champion) == 'Alive']
    print(f"{f['name']:<22} rawMom {last_mom[f['id']]:>5} tier {W0.momentum_tier[f['id']]:+d}  power {power[f['id']]:>3} slots {slots(power[f['id']])}  achieve {len(el)} eligible {len(cap)}")
dormant = [(g.title, CH[g.champion]['name'], state[g.champion]) for g in goals.values() if g.kind=='Achieve' and state.get(g.champion)!='Alive']
print("Dormant (champion incapable):", dormant)
maint_dead = [(g.title, CH[g.champion]['name'], state[g.champion]) for g in goals.values() if g.kind=='Maintain' and state.get(g.champion)!='Alive']
print("Maintain defenses lost:", maint_dead)

# ---- one fully traced beat ----
w1, rec = run_beat(W0, seed=7, slots_for_power=slots)
print("\n== Traced Beat (seed 7) ==  pool size", len(rec['pool']))
for a in rec['attempts']:
    d = f" defense {a['defense']} ({', '.join(goals[x].title for x in a['defenders'])})" if a['defenders'] else ""
    print(f"  {NAME[a['faction']]:<20} {a['title']:<32} {a['dice']} {a['momentum']:+d}{d} = {a['total']:>2} -> {'ADVANCE '+a['from']+'->'+a['to'] if a['success'] else 'no change'}")
# reproducibility
_, rec2 = run_beat(W0, seed=7, slots_for_power=slots)
print("Replay identical:", rec == rec2)

# ---- multi-beat campaign, policies ----
def campaign(policy, beats=8, seeds=2000, w=W0):
    acc = collections.Counter(); adv = collections.Counter(); draws = collections.Counter(); conflicts = 0
    tiers = collections.defaultdict(list); jorren = 0; ledger = 0
    for sd in range(seeds):
        cur = w
        for b in range(beats):
            cur, r = run_beat(cur, seed=sd * 1000 + b, slots_for_power=slots, momentum_policy=policy)
            conflicts += len(r['conflicts'])
            for a in r['attempts']:
                draws[a['faction']] += 1
                if a['success']: adv[a['faction']] += 1
                if a['success'] and a['to'] == 'Accomplished': acc[a['faction']] += 1
        for f in FX: tiers[f['id']].append(cur.momentum_tier[f['id']])
        if cur.goals[[k for k in goals if k.startswith('cbfba392')][0]].status == 'Accomplished': jorren += 1
        if cur.goals[[k for k in goals if k.startswith('5a3c3c08')][0]].status == 'Accomplished': ledger += 1
    return {NAME[f['id']]: dict(draws=round(draws[f['id']]/seeds,2), advances=round(adv[f['id']]/seeds,2), accomplished=round(acc[f['id']]/seeds,2), end_tier=round(statistics.mean(tiers[f['id']]),2)) for f in FX}, conflicts/seeds, jorren/seeds, ledger/seeds
for pol in ['none', 'accomplish', 'advance', 'advance_and_fail']:
    res, conf, j, l = campaign(pol)
    print(f"\n== 8 Beats x 2000 runs, momentum policy = {pol} ==  same-target completion conflicts/run {conf:.3f}  P(Jorren accomplished) {j:.2f}  P(Damaris steals Ledger) {l:.2f}")
    for k, v in res.items(): print(f"  {k:<22} {v}")

# ---- targeted cases ----
def p_accomplish(goal_prefix, w, beats=8, seeds=4000):
    gid = [k for k in goals if k.startswith(goal_prefix)][0]; n = 0
    for sd in range(seeds):
        cur = w
        for b in range(beats): cur, _ = run_beat(cur, seed=sd*1000+b, slots_for_power=slots)
        n += cur.goals[gid].status == 'Accomplished'
    return n / seeds
marra = 'ba38bcd2-f397-477e-b490-cedf4b6eb54f'
wm = World(dict(W0.goals), {**W0.champion_state, marra: 'Dead'}, dict(W0.momentum_tier), dict(W0.power))
print("\nLedger: P(Damaris accomplishes in 8 Beats) with Marra defending:", p_accomplish('5a3c3c08', W0), " Marra incapable:", p_accomplish('5a3c3c08', wm))
wj = World(dict(W0.goals), dict(W0.champion_state), {**W0.momentum_tier, 'keepers': 0}, dict(W0.power))
print("Jorren: P(accomplish in 8 Beats) at Order tier -2:", p_accomplish('cbfba392', W0), " at tier 0:", p_accomplish('cbfba392', wj))
julian = [c for c in CH if CH[c]['name'] == 'Julian Arrett'][0]
wl = World(dict(W0.goals), {**W0.champion_state, julian: 'Dead'}, dict(W0.momentum_tier), dict(W0.power))
el = lambda w: len([g for g in w.goals.values() if g.faction=='seekers' and g.kind=='Achieve' and g.status in ('Plotting','Progressing') and w.champion_state.get(g.champion)=='Alive'])
print("Champion loss (Julian Arrett dies): Dawn eligible goals", el(W0), "->", el(wl), "; Sunset the Order (Progressing) goes dormant, not deleted")
