"""
Local monotonicity checks (mechanical properties, not campaign outcomes).
Usage: python3 -I monotonicity.py <syn_dir> <real_dir> [scale]   (scale multiplies sample counts; default 1)

Method
  * Exact 2d6 arithmetic wherever the property is a property of a single roll.
  * Beat-level common random numbers: play a campaign to a random Faction Beat, deep-copy the Colony (its RNG state
    included), change exactly one input in the copy, and run the same Beat in both copies. RNG consumption in a
    Faction Beat does not depend on Power/Momentum/defense, so the two copies see identical shuffles and dice.
  * Campaign-level CRN for per-character properties: identical seeds, one character's Conviction/Pressure/label
    changed; probabilities compared with paired standard errors.
"""
import sys, os, copy, random, dataclasses, statistics as st, itertools
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import world, scenario_cfg, Colony, batch
from colony_sim import ACT_OF_TURN, STRESS, LABEL_MOD, BAND_MOD

syn, real = sys.argv[1], sys.argv[2]; SCALE = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
P2 = {s: sum(1 for a in range(1, 7) for b in range(1, 7) if a + b == s) / 36 for s in range(2, 13)}
def p_ge(t): return sum(p for s, p in P2.items() if s >= t)          # P(2d6 >= t), real-valued t ok
RESULTS = []
def verdict(name, ok, detail):
    RESULTS.append((name, ok, detail)); print(f"[{'PASS' if ok else 'FAIL'}] {name}: {detail}")

WORLDS = [('real', real)] + [(n, os.path.join(syn, n)) for n in ('base', 'contested', 'dominant', 'goals_2.0x')]
LOADED = {n: world(p) for n, p in WORLDS}
def cfg_for(n, **kw): D, c, m = LOADED[n]; return scenario_cfg(D, m, syn, **kw)


def step(col, t, S):
    """One Rev 3 Colony Turn (mirrors Colony.run's rev3 branch)."""
    for c in list(col.ch.values()):
        if c['inst'] == 2 and c['state'] == 'Alive' and c['factionId']: col.defection_check(c, t)
    col.resolve_momentum()
    if ACT_OF_TURN[t] == 2 or (ACT_OF_TURN[t] == 3 and col.cfg.faction_beats_act3): col.faction_beat(t)
    col.character_beat(t, S[t])


def beat_states(n, k, seed0=0):
    """Yield k Colonies frozen just before a Faction Beat freeze (after that turn's Opening)."""
    D, compat, meta = LOADED[n]; cfg = cfg_for(n); S = STRESS[cfg.stress]; r = random.Random(seed0)
    for i in range(k):
        col = Colony(D, compat, cfg, random.Random(seed0 * 100003 + i)); T = r.randint(3, 10)
        for t in range(T): step(col, t, S)
        for c in list(col.ch.values()):
            if c['inst'] == 2 and c['state'] == 'Alive' and c['factionId']: col.defection_check(c, T)
        col.resolve_momentum()
        yield col, T


def run_beat(col, T, mutate):
    x = copy.deepcopy(col); mutate(x)
    before = {g: (x.goals[g]['status'], bool(x.goals[g].get('ready'))) for g in x.goals}
    L0 = dict(x.log); x.faction_beat(T)
    adv = {g for g in x.goals if (x.goals[g]['status'], bool(x.goals[g].get('ready'))) != before[g]}
    d = lambda k: x.log.get(k, 0) - L0.get(k, 0)
    return x, adv, d


def faction_of(x, gid): return x.goals[gid]['factionId']
def done(x, gid): return x.goals[gid]['status'] == 'Accomplished' or bool(x.goals[gid].get('ready'))


# ------------------------------------------------------------------ 1. Power -> nominations
print("== 1. Power vs nominations (beat-level CRN)")
K = int(150 * SCALE); viol = 0; checks = 0; agg = {p: [0, 0, 0, 0] for p in (1, 2, 3)}; nst = 0
for n, _ in WORLDS:
    for col, T in beat_states(n, K, seed0=1):
        for f in sorted(col.F):
            res = {}
            for p in (1, 2, 3):
                def mut(x, p=p, f=f): x.cfg = dataclasses.replace(x.cfg, power_override={f: p})
                x, adv, d = run_beat(col, T, mut)
                res[p] = (d(f'nom_{f}'), d(f'drawn_{f}'), sum(1 for g in adv if faction_of(x, g) == f),
                          sum(1 for g in adv if faction_of(x, g) == f and done(x, g)))
                for j in range(4): agg[p][j] += res[p][j]
            checks += 2; viol += (res[3][0] < res[2][0]) + (res[2][0] < res[1][0]); nst += 1
verdict("Power 3 >= Power 2 >= Power 1 nominations (per state, exact CRN)", viol == 0,
        f"{checks} comparisons over {nst} faction-states in 5 worlds, {viol} violations")
m = {p: [v / nst for v in agg[p]] for p in agg}
print("   mean per faction-Beat:   p  nominated  drawn  advances  completions(Accomplished or Ready)")
for p in (1, 2, 3): print(f"                            {p}   {m[p][0]:.3f}    {m[p][1]:.3f}   {m[p][2]:.3f}     {m[p][3]:.4f}")
verdict("Expected drawn cards and advances non-decreasing in Power", all(m[p + 1][j] >= m[p][j] for p in (1, 2) for j in (1, 2)),
        f"drawn {m[1][1]:.3f}/{m[2][1]:.3f}/{m[3][1]:.3f}, advances {m[1][2]:.3f}/{m[2][2]:.3f}/{m[3][2]:.3f}")
print(f"   observation: completions {m[1][3]:.4f}/{m[2][3]:.4f}/{m[3][3]:.4f} — extra cards are lower-priority Planning goals;"
      " the faction's Progressing card is diluted 5/N -> 5/(N+1).")

# exact dilution: a faction with one Progressing card and k-1 Plotting cards in a pool of N (N>=5)
print("   exact: P(Progressing card drawn) with pool N (other factions' cards fixed at N0): Power p adds p-1 Plotting cards")
for N0 in (6, 10, 14):
    vals = [min(1, 5 / (N0 + p)) for p in (1, 2, 3)]
    print(f"     N0={N0:>2}: P = {vals[0]:.3f} / {vals[1]:.3f} / {vals[2]:.3f}   E[own cards drawn] = "
          + " / ".join(f"{min(N0 + p, 5) * p / (N0 + p):.3f}" for p in (1, 2, 3)))

# ------------------------------------------------------------------ 2. Momentum
print("\n== 2. Momentum")
tab = {m_: p_ge(8 - m_) for m_ in range(-2, 3)}
verdict("P(success) strictly increasing in Momentum (exact 2d6)", all(tab[m_ + 1] > tab[m_] for m_ in range(-2, 2)),
        ' '.join(f"{m_:+d}:{v:.3f}" for m_, v in tab.items()))
K = int(150 * SCALE); viol = vc = 0; nst = 0; ea = {m_: 0 for m_ in range(-2, 3)}; ec = dict(ea)
for n, _ in WORLDS:
    for col, T in beat_states(n, K, seed0=2):
        for f in sorted(col.F):
            prev = None
            for m_ in range(-2, 3):
                def mut(x, m_=m_, f=f): x.tier[f] = m_
                x, adv, d = run_beat(col, T, mut)
                own = {g for g in adv if faction_of(x, g) == f}; comp = {g for g in own if done(x, g)}
                ea[m_] += len(own); ec[m_] += len(comp)
                if prev is not None:
                    vc += 1; viol += not (prev[0] <= own)        # every advance at m-1 is still an advance at m
                prev = (own, comp)
            nst += 1
verdict("Raising Momentum never removes an advance of that faction in the same Beat (exact CRN, set inclusion)", viol == 0,
        f"{vc} comparisons, {viol} violations; mean advances/faction-Beat " + ' '.join(f"{m_:+d}:{ea[m_] / nst:.3f}" for m_ in ea))

# ------------------------------------------------------------------ 3. Defensive assignment
print("\n== 3. Defensive assignments")
verdict("Active defense never raises P(success) (exact)", all(p_ge(8 - m_ + 1) <= p_ge(8 - m_) for m_ in range(-2, 3)),
        ' '.join(f"m{m_:+d}: {p_ge(8 - m_):.3f}->{p_ge(9 - m_):.3f}" for m_ in range(-2, 3)) + "  (stacking capped at -1)")
K = int(400 * SCALE); viol = vc = 0; gain = loss = 0
for n in ('real', 'contested'):
    for col, T in beat_states(n, K, seed0=3):
        defended = {g for g, v in col.goals.items() if v['conditionType'] == 'Achieve' and col.eligible(v) and col.defense(v)}
        if not defended: continue
        def strip(x): [x.goals.pop(g) for g in [g for g, v in x.goals.items() if v['conditionType'] == 'Maintain']]
        xa, adv_a, _ = run_beat(col, T, lambda x: None); xb, adv_b, _ = run_beat(col, T, strip)
        for g in defended:
            vc += 1; viol += (g in adv_a and g not in adv_b)
        gain += len((adv_b - adv_a) & defended); loss += len((adv_a - adv_b) - defended)
verdict("Removing all Maintain assignments never turns a defended goal's advance into a failure (CRN)", viol == 0,
        f"{vc} defended goal-Beats (real + contested worlds), {viol} violations; defense removed {gain} advances; "
        f"{loss} undefended goals lost an advance (collision re-ordering — allowed)")

# ------------------------------------------------------------------ 4/5. Conviction and Pressure (campaign CRN)
def per_char(n, field, delta, runs):
    D, compat, meta = LOADED[n]; cfg = cfg_for(n, trace=True)
    ids = [c['id'] for c in D['characters'] if c['characterType'] == 'NPC' and c['state'] == 'Alive' and c['factionId']]
    name = {c['id']: c['name'] for c in D['characters']}
    def flags(outs, cid):
        return ([o[1]['log'].get(f'cmp_{cid}', 0) > 0 for o in outs], [o[1]['log'].get(f'up_{cid}', 0) > 0 for o in outs],
                [any(nm == name[cid] for (_, nm, _) in o[2]) for o in outs])
    base = batch(D, compat, cfg, runs, 5000)
    rows = []
    for cid in ids:
        D2 = copy.deepcopy(D); c = next(x for x in D2['characters'] if x['id'] == cid)
        c[field] = max(0, min(100, c[field] + delta))
        var = batch(D2, compat, cfg, runs, 5000)
        b, v = flags(base, cid), flags(var, cid)
        out = []
        for j in range(3):
            dif = [int(x) - int(y) for x, y in zip(v[j], b[j])]
            out.append((st.mean(dif), (st.pstdev(dif) / len(dif) ** .5) if len(dif) > 1 else 0, st.mean(b[j])))
        rows.append((name[cid], out))
    return rows

RUNS = int(300 * SCALE)
for field, delta, sign, what in [('conviction', 20, +1, 'Compromised / defect'), ('pressure', 20, -1, 'ever unstable')]:
    print(f"\n== {'4' if field == 'conviction' else '5'}. {field} +{delta} (campaign CRN, {RUNS} paired seeds per character)")
    worst = []; nv = 0; nt = 0
    for n in ('real', 'base'):
        for nm, out in per_char(n, field, delta, RUNS):
            idx = (0, 2) if field == 'conviction' else (1,)
            for j in idx:
                mu, se, b0 = out[j]; nt += 1
                bad = (mu > 0 and mu > 2 * se) if sign > 0 else (mu < 0 and -mu > 2 * se)
                nv += bad; worst.append((mu * sign, n, nm, ['P(Compromised)', 'P(unstable)', 'P(defect)'][j], mu, se, b0))
    worst.sort(reverse=True)
    verdict(f"Raising {field} never moves THAT character the wrong way ({what}), significance 2 SE", nv == 0,
            f"{nt} character-metrics in real + base worlds, {nv} significant violations; largest wrong-way deltas: " +
            "; ".join(f"{w[1]}/{w[2]} {w[3]} {w[4]:+.3f}±{w[5]:.3f} (base {w[6]:.2f})" for w in worst[:3]))
    right = sorted(worst)[:3]
    print("   largest right-way effects: " + "; ".join(f"{w[1]}/{w[2]} {w[3]} {w[4]:+.3f} (base {w[6]:.2f})" for w in right))

# exact local version: one Character Beat, P(advance) for the character as a function of drift band
print("   exact local check: P(advance | in pool, drawn) by band = " + ', '.join(f"{b}:{p_ge(8 - m_):.3f}" for b, m_ in BAND_MOD.items())
      + "; Steady -> not in pool, settles. Monotone in drift.")

# ------------------------------------------------------------------ 6. Labels
print("\n== 6. Defection Check vs compatibility label")
order = list(LABEL_MOD)
ok = True; lines = []
for sc in (0.5, 1, 2):
    for tg in (7, 8, 9):
        ps = [p_ge(tg - LABEL_MOD[l] * sc) for l in order]
        ok &= all(b >= a for a, b in zip(ps, ps[1:]))
        if tg == 8: lines.append(f"x{sc}: " + ' '.join(f"{l[:4]}:{p:.2f}" for l, p in zip(order, ps)))
verdict("Worse label never lowers P(leave) (exact, scales x0.5/x1/x2, targets 7/8/9)", ok, ' | '.join(lines))
print("   note x0.5 uses half-point modifiers (2d6 + 1.5 >= 8 == 2d6 >= 7): Friendly/Tolerated and Strained/Tolerated pairs"
      " collapse to equal probabilities -> monotone but not strictly.")
D, compat, meta = LOADED['real']; cfg = cfg_for('real')
outs = batch(D, compat, cfg, int(400 * SCALE), 7000)
import collections
risk = collections.Counter(nm for o in outs for (_, nm, _) in o[2])
top = [nm for nm, _ in risk.most_common(5)]; idof = {c['name']: c['id'] for c in D['characters']}
viol = 0; lines = []
for nm in top:
    ps = []
    for lab in order:
        c2 = copy.deepcopy(compat); c2[idof[nm]]['own']['label'] = lab
        o2 = batch(D, c2, cfg, int(400 * SCALE), 7000)
        ps.append(sum(any(x == nm for (_, x, _) in o[2]) for o in o2) / len(o2))
    viol += sum(b + 0.02 < a for a, b in zip(ps, ps[1:]))       # tolerance for MC noise across label steps
    lines.append(f"{nm}: " + ' '.join(f"{p:.2f}" for p in ps))
verdict("Campaign P(defect) of a character non-decreasing as their label worsens (CRN, Aligned..Hostile)", viol == 0,
        f"{len(top)} highest-risk real NPCs, {viol} drops >0.02; " + ' | '.join(lines))

# ------------------------------------------------------------------ 7. Power inputs
print("\n== 7. Power vs its inputs (random perturbations of real + synthetic factions)")
rng = random.Random(9); nv = 0; nt = 0; probes = collections.Counter(); probe_n = collections.Counter()
for n, _ in WORLDS:
    D, compat, meta = LOADED[n]
    for hn in (None, 12):
        cfg = cfg_for(n, headcount_n=hn); col0 = Colony(D, compat, cfg, random.Random(0))
        for _ in range(int(40 * SCALE)):
            for f in col0.F:
                x = copy.deepcopy(col0); mem = x.members(f); own = [a for a in x.assets.values() if a['controllingFactionId'] == f]
                p0 = x.power_score(f); kind = rng.choice(['infl', 'tier', 'status', 'asset', 'leg', 'amc'])
                if kind == 'infl' and mem: c = rng.choice(mem); c['influence'] = min(100, c['influence'] + rng.randint(1, 30))
                elif kind == 'tier' and own: a = rng.choice(own); a['tier'] = min(5, a['tier'] + 1)
                elif kind == 'status' and own:
                    a = rng.choice(own); a['status'] = {'Destroyed': 'Damaged', 'Damaged': 'Contested', 'Contested': 'Stable'}.get(a['status'], 'Stable')
                elif kind == 'asset': x.assets['new'] = dict(id='new', role=rng.choice(list(x.assets.values()))['role'], tier=rng.randint(1, 5),
                                                             status='Stable', controllingFactionId=f, keystone=False)
                elif kind == 'leg': x.F[f]['baseLegitimacy'] = min(100, x.F[f]['baseLegitimacy'] + rng.randint(1, 30))
                elif kind == 'amc': x.F[f]['additionalMemberCount'] = (x.F[f].get('additionalMemberCount') or 0) + rng.randint(1, 20)
                nt += 1; nv += x.power_score(f) < p0
        for f in col0.F:      # probes that are NOT "more score": adding a weak named recruit, losing the weakest member
            ym = col0.members(f)
            if not ym: continue
            for inf in (0, 10, 20, 30):
                y = copy.deepcopy(col0); y.ch['recruit'] = dict(ym[0], id='recruit', name='recruit', influence=inf, inst=0, defected=False)
                probe_n[f'add recruit influence {inf}'] += 1; probes[f'add recruit influence {inf}'] += y.slots(f) < col0.slots(f)
            z = copy.deepcopy(col0); w = min(z.members(f), key=lambda c: c['influence'])
            if w['id'] != z.F[f]['leaderId'] and len(z.members(f)) > 1:
                w['state'] = 'Dead'; probe_n['lose weakest member'] += 1; probes['lose weakest member'] += z.slots(f) > col0.slots(f)
verdict("Raising member influence / asset tier / asset status / assets / baseLegitimacy / headcount never lowers Power", nv == 0,
        f"{nt} perturbations, {nv} decreases")
grid_ok = all(1 + (a >= 68) + (b >= 62) + (c >= 45) <= 1 + (a2 >= 68) + (b2 >= 62) + (c2 >= 45)
              for a, b, c in itertools.product(range(0, 101, 5), repeat=3) for a2, b2, c2 in [(a + 5, b, c), (a, b + 5, c), (a, b, c + 5)])
verdict("Power non-decreasing in each channel score (exhaustive 5-pt grid)", grid_ok, "21^3 points x 3 directions")
print("   probes (not required to be monotone; slots = capped Power):")
for k in probe_n: print(f"     {k:<28} changed slots the 'wrong' way in {probes[k]}/{probe_n[k]} faction-states (avg term of character strength)")

# ------------------------------------------------------------------ 8. Stress
print("\n== 8. Colony Stress vs Character Beat draws")
col = Colony(*LOADED['real'][:2], cfg_for('real'), random.Random(0))
dr = [col.n_draws(s) for s in range(11)]
verdict("Draws non-decreasing in Stress", all(b >= a for a, b in zip(dr, dr[1:])), f"stress 0..10 -> {dr}")
print("   per-character selection at fixed Stress (real fixture, 11 turns, %d runs each):" % int(300 * SCALE))
print("   stress draws  pool/CB  P(at-risk NPC drawn)  Compromised  defections  crisis-sessions")
D, compat, meta = LOADED['real']
from common import metrics
for s in range(0, 11):
    cfg = cfg_for('real', fixed_stress=s); r = metrics(batch(D, compat, cfg, int(300 * SCALE), 0), D, cfg)
    print(f"   {s:>5} {dr[s]:>5}  {r['cb_pool']:6.1f}   {r['p_char_drawn']:8.2f}          {r['comp']:5.2f}       {r['defect']:5.2f}       {r['crisis']:5.2f}")

print("\n== Summary")
for name, ok, _ in RESULTS: print(f"   {'PASS' if ok else 'FAIL'}  {name}")
