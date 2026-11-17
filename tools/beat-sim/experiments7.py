"""Revision 6: the per-faction Character Phase (each faction's most at-risk member always rolls), compared with the
earlier strategies. Usage: python3 -I experiments7.py <real workdir (live.json + calib.json)>"""
import sys, os, copy, random, dataclasses, statistics as st, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from colony_sim import Config, load, batch

D0, C0 = load(sys.argv[1])
FX = ['aspis', 'cult', 'institute', 'keepers', 'seekers', 'shattered', 'witnesses']
NAME = {f['id']: f['name'] for f in D0['factions']}
TIERS = {f: 0 for f in FX} | {'keepers': -2}
REV3 = Config(power='channels', channels=(68, 62, 45), rev3_order=True, delayed_check=True, ready_to_resolve=True,
              draws_by_stress=True, stress_k=5, settle=True, start_tiers=TIERS, rtr_collide=False,
              unattended_turns=1, detector=True)
R = lambda **kw: dataclasses.replace(REV3, **kw)

def grow(k, seed=1):
    """Each faction NPC gets k-1 jittered copies (pressure/conviction/influence ±10; values and label unchanged)."""
    if k == 1: return D0, C0
    rng = random.Random(seed); D = copy.deepcopy(D0); compat = dict(C0)
    j = lambda v: max(0, min(100, v + rng.randint(-10, 10)))
    for c in D0['characters']:
        if c['characterType'] == 'NPC' and c['state'] == 'Alive' and c['factionId'] in FX:
            for i in range(1, k):
                cl = dict(c, id=f"{c['id']}~{i}", name=f"{c['name']}~{i}", pressure=j(c['pressure']),
                          conviction=j(c['conviction']), influence=j(c['influence']))
                D['characters'].append(cl)
                if c['id'] in C0: compat[cl['id']] = C0[c['id']]
    return D, compat

PF = [False]
def metrics(D, outs):
    n = len(outs); L = [o[1]['log'] for o in outs]
    g = lambda k: sum(l.get(k, 0) for l in L)
    fac_of = {c['id']: c['factionId'] for c in D['characters']}
    d = [o[1]['defected'] for o in outs]
    # nomination concentration per faction: share of a faction's nominations taken by its single most-nominated member
    top_share, distinct = [], []
    for l in L:
        per = collections.defaultdict(collections.Counter)
        for k, v in l.items():
            if k.startswith('cbnomc_'): per[fac_of[k[7:]]][k[7:]] += v
        for f, cnt in per.items():
            tot = sum(cnt.values()); top_share.append(max(cnt.values()) / tot); distinct.append(len(cnt))
    per_f_crisis = {f: g(f'crisis_{f}') / n for f in FX}
    per_f_def = {f: g(f'defect_{f}') / n for f in FX}
    lead_nom = g('cb_nom_leader') / (g('cb_drawn') or 1)
    lead_elig = g('cb_elig_leader') / (g('cb_elig_faction') or 1)
    worst = [max(sum(1 for (_, _, ff) in o[2] if ff == f) for f in FX) for o in outs]
    return dict(defect=st.mean(d), p0=sum(x == 0 for x in d) / n, p4=sum(x >= 4 for x in d) / n,
                comp=g('compromised_entries') / n, crisis=g('sessions_with_crisis') / n,
                # rolls = Drift Rolls (cb_drawn) + Defection Checks. per_faction logs both into cb_rolls; other modes log only checks there.
                rolls=(g('cb_drawn') + (g('cb_rolls') - g('cb_drawn') if PF[0] else g('cb_rolls'))) / (11 * n), occupied=g('cb_slot_occupied') / n,
                repeat=st.mean(max([v for k, v in l.items() if k.startswith('cmp_')] or [0]) for l in L),
                repeat3=sum(1 for l in L if max([v for k, v in l.items() if k.startswith('cmp_')] or [0]) >= 3) / n,
                conf_share=g('cb_nom_conflicted') / (g('cb_drawn') or 1),
                top_share=st.mean(top_share) if top_share else 0, distinct=st.mean(distinct) if distinct else 0,
                streak=st.mean(l.get('cb_max_streak', 0) for l in L), streak_max=max(l.get('cb_max_streak', 0) for l in L),
                lead_nom=lead_nom, lead_elig=lead_elig, per_f_crisis=per_f_crisis, per_f_def=per_f_def,
                fac_loses3=sum(w >= 3 for w in worst) / n)

def run(D, cp, cfg, runs):
    PF[0] = cfg.per_faction
    return metrics(D, batch(D, cp, cfg, runs))

def line(m):
    return (f"defect {m['defect']:4.2f} P0 {m['p0']:.2f} P>=4 {m['p4']:.2f} | Compromised {m['comp']:4.2f} crisis-sessions {m['crisis']:4.1f} "
            f"| rolls/turn {m['rolls']:4.1f}")

print("== A. Strategies on the current cast (11 Colony Turns). rolls/turn = Drift Rolls + Defection Checks per turn\n")
STRATS = [('S0 fixed 2-5 by Stress (Rev 3)', {}),
          ('S2 1 per 5/4/3 at-risk, max 5', dict(draw_rule='pool_tier', draw_cap=5)),
          ('S4 faction nominates 1, draw 2-5', dict(cb_nominate=1)),
          ('S8 per faction, Conflicted first', dict(per_faction=True)),
          ('S8b per faction, highest drift only', dict(per_faction=True, conflicted_first=False))]
for label, kw in STRATS:
    print(f"-- {label}")
    for prof in ('calm', 'arc', 'rising'):
        print(f"   {prof:<6} " + line(run(D0, C0, R(stress=prof, **kw), 1500)))

print("\n== B. S8 / S8b detail (arc): selection behavior")
for label, kw in STRATS[3:]:
    m = run(D0, C0, R(**kw), 2000)
    print(f"-- {label}")
    print(f"   nominee is already Conflicted {m['conf_share']:.2f} of rolls | top nominee's share of its faction's rolls {m['top_share']:.2f} | "
          f"distinct nominees per faction per campaign {m['distinct']:.1f}")
    print(f"   longest same-nominee streak: mean {m['streak']:.1f}, max {m['streak_max']} turns | slots occupied by a pending check {m['occupied']:.2f}/run")
    print(f"   most crises for one character in a campaign: mean {m['repeat']:.2f}; campaigns where someone hits >=3 crises {m['repeat3']:.2f}")
    print(f"   leaders: {m['lead_nom']:.3f} of nominations vs leader eligible in {m['lead_elig']:.3f} of faction-turns | any faction loses >=3 members: {m['fac_loses3']:.3f}")
    print("   crises per faction:", {NAME[f][:9]: round(v, 2) for f, v in m['per_f_crisis'].items()})
    print("   defections per faction:", {NAME[f][:9]: round(v, 2) for f, v in m['per_f_def'].items()})

print("\n== C. Faction growth (jittered members): ~5 -> ~20 -> ~100 members per faction, arc")
for label, kw in [STRATS[0], STRATS[1], STRATS[3], STRATS[4]]:
    for k, runs in ((1, 1000), (4, 400), (20, 120)):
        D, cp = grow(k)
        m = run(D, cp, R(**kw), runs)
        print(f"   {label:<38} x{k:<2} {line(m)} | top share {m['top_share']:.2f} streak max {m['streak_max']}")

print("\n== D. With play-like Pressure movement (each turn every NPC's Pressure moves by a random -5..+5 step), arc")
def noise(col, t):
    for c in col.ch.values():
        if c['characterType'] == 'NPC' and c['state'] == 'Alive': c['pressure'] = max(0, min(100, c['pressure'] + col.rng.choice((-5, 0, 5))))
for label, kw in [STRATS[0], STRATS[3], STRATS[4]]:
    m = run(D0, C0, R(turn_hook=noise, **kw), 1500)
    print(f"-- {label}: " + line(m))
    if kw.get('per_faction'):
        print(f"   Conflicted share of rolls {m['conf_share']:.2f} | top nominee share {m['top_share']:.2f} | distinct nominees/faction {m['distinct']:.1f} | "
              f"streak mean {m['streak']:.1f} | max crises one character {m['repeat']:.2f} (>=3 in {m['repeat3']:.2f} of campaigns)")

print("\n== E. Revolving-crisis loop: what happens after a failed Defection Check (S8, arc)")
for label, kw in [('failed check -> Conflicted (decided)', {}),
                  ('failed check -> Stable', dict(failed_check_to=0)),
                  ('-> Conflicted, sits out the next nomination', dict(recommit_rest=True)),
                  ('-> Stable, sits out the next nomination', dict(failed_check_to=0, recommit_rest=True))]:
    for prof in ('calm', 'arc', 'rising'):
        m = run(D0, C0, R(per_faction=True, stress=prof, **kw), 1500)
        print(f"   {label:<44} {prof:<6} {line(m)} | max crises one char {m['repeat']:.2f} (>=3: {m['repeat3']:.2f}) top share {m['top_share']:.2f}")
