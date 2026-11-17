"""Revision 7: Character Phase stabilization (recovery exemption, Reaffirmation) and wildcard nomination fairness.
Usage: python3 -I experiments8.py <real workdir (live.json + calib.json)> <synthetic dir>"""
import sys, os, copy, random, dataclasses, statistics as st, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from colony_sim import Config, load, batch

D0, C0 = load(sys.argv[1]); SYN = sys.argv[2]
FX = ['aspis', 'cult', 'institute', 'keepers', 'seekers', 'shattered', 'witnesses']
NAME = {f['id']: f['name'] for f in D0['factions']}
BASE = Config(power='channels', channels=(68, 62, 45), rev3_order=True, delayed_check=True, ready_to_resolve=True,
              draws_by_stress=True, stress_k=5, settle=True, start_tiers={f: 0 for f in FX} | {'keepers': -2},
              rtr_collide=False, unattended_turns=1, detector=True,
              per_faction=True, conflicted_first=False, failed_check_to=1)       # Revision 6 as approved (D6-1, D6-3)
R = lambda **kw: dataclasses.replace(BASE, **kw)

def grow(k, seed=1):
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

def stab(D, outs):
    n = len(outs); L = [o[1]['log'] for o in outs]
    g = lambda k: sum(l.get(k, 0) for l in L)
    fac_of = {c['id']: c['factionId'] for c in D['characters']}
    per_char = [[v for k, v in l.items() if k.startswith('cmp_')] for l in L]
    distinct_nom = []
    for l in L:
        per = collections.defaultdict(set)
        for k in l:
            if k.startswith('cbnomc_'): per[fac_of[k[7:]]].add(k[7:])
        distinct_nom += [len(v) for v in per.values()]
    crises = g('compromised_entries') / n
    return dict(crises=crises, defect=st.mean(o[1]['defected'] for o in outs),
                distinct_cmp=st.mean(len(x) for x in per_char),
                per_crisis_char=st.mean([st.mean(x) for x in per_char if x] or [0]),
                max_char=st.mean(max(x or [0]) for x in per_char),
                p3=sum(1 for x in per_char if max(x or [0]) >= 3) / n,
                reaff=g('reaffirmed') / n, distinct_nom=st.mean(distinct_nom or [0]),
                empty=g('cb_slot_empty') / (11 * n), rolls=g('cb_rolls') / (11 * n),
                unstab=g('recrisis_unstabilized') / n, unstab_share=g('recrisis_unstabilized') / (g('compromised_entries') or 1),
                exempt=g('cb_exempt_skips') / n, reaff_skips=g('cb_reaffirmed_skips') / n)

VARIANTS = [('V1 Revision 6 (no recovery rules)', {}),
            ('V2 + one-phase exemption after recovery', dict(recovery_exempt=True)),
            ('V3 + exemption + permanent Reaffirmation', dict(recovery_exempt=True, reaffirmation=True))]

print("== A. Stabilization comparison (failed Defection Check -> Conflicted in all variants)")
print("   crises = Compromised entries/campaign; distinct = characters reaching Compromised; per-char = mean crises per crisis character;")
print("   max = most crises for one character; >=3 = share of campaigns where someone has 3+ crises; reaff = Reaffirmed/campaign;")
print("   unstab = re-crises WITHOUT reaching Stable in between (share of all crises); nominees = distinct nominees per faction;")
print("   empty = factions with no eligible nominee per turn; rolls = psychological resolutions per turn\n")
for label, kw in VARIANTS:
    print(f"-- {label}")
    for k, runs, profs in ((1, 1500, ('calm', 'arc', 'rising')), (4, 500, ('arc',)), (20, 150, ('arc',))):
        D, cp = grow(k)
        for prof in profs:
            m = stab(D, batch(D, cp, R(stress=prof, **kw), runs))
            print(f"   x{k:<2} {prof:<6} crises {m['crises']:5.2f} defect {m['defect']:4.2f} distinct {m['distinct_cmp']:4.2f} per-char {m['per_crisis_char']:4.2f} "
                  f"max {m['max_char']:4.2f} >=3 {m['p3']:.2f} reaff {m['reaff']:4.2f} unstab {m['unstab']:4.2f} ({m['unstab_share']:.2f}) "
                  f"nominees {m['distinct_nom']:3.1f} empty {m['empty']:4.2f} rolls {m['rolls']:3.1f}")

# ---------------- B. Wildcard ----------------
def wc(D, cp, kw, runs=800):
    outs = batch(D, cp, R(faction_beats_act3=False, turns=7, **kw), runs)
    L = [o[0]['log'] for o in outs]; g = lambda k: sum(l.get(k, 0) for l in L)
    F = sorted({x['factionId'] for x in D['goals']} & {f['id'] for f in D['factions'] if f['type'] == 'Faction'})
    beats = 4 * len(outs)
    achieve = [x for x in D['goals'] if x['conditionType'] == 'Achieve']
    never = sum(1 for x in achieve if g(f"nomd_{x['id']}") == 0)
    avail = {f: g(f'wc_avail_{f}') for f in F}; picks = {f: g(f'wc_pick_{f}') for f in F}
    ta, tp = sum(avail.values()) or 1, sum(picks.values()) or 1
    return dict(never=never, achieve=len(achieve), adv=g('advances') / len(outs), wc_drawn=g('wc_drawn') / beats,
                draws={f: g(f'drawn_{f}') / beats for f in F}, slots={f: g(f'slots_{f}') / beats for f in F},
                avail_share={f: avail[f] / ta for f in F}, pick_share={f: picks[f] / tp for f in F})

print("\n== B. Wildcard nomination. The wildcard is an EXTRA card added after Power-limited nomination; the board stays 5.")
worlds = [('real', D0, C0)] + [(nm, *load(os.path.join(SYN, nm))) for nm in ('goals_2.0x', 'dominant', 'high_power')]
for wname, D, cp in worlds:
    base = wc(D, cp, {})
    print(f"-- {wname}: no wildcard: never-nominated {base['never']}/{base['achieve']}, advances {base['adv']:.2f}")
    def ratio(m):   # mean draws/Beat of the highest-Power factions over the lowest-Power factions
        hi = max(round(v) for v in base['slots'].values()); lo = min(round(v) for v in base['slots'].values())
        h = [m['draws'][f] for f in m['draws'] if round(base['slots'][f]) == hi]; l = [m['draws'][f] for f in m['draws'] if round(base['slots'][f]) == lo]
        return (st.mean(h) / st.mean(l)) if hi != lo and l and st.mean(l) else float('nan'), hi, lo
    r0, hi, lo = ratio(base); print(f"   Power {hi} : Power {lo} draw ratio without wildcard {r0:.2f}")
    for mode in ('colony', 'colony_faction', 'colony_power'):
        m = wc(D, cp, dict(wildcard=mode))
        dd = {f: m['draws'][f] - base['draws'][f] for f in m['draws']}
        worst = max(dd, key=lambda f: abs(dd[f]))
        skew = max(m['pick_share'][f] - 1 / len(m['pick_share']) for f in m['pick_share'])
        print(f"   {mode:<15} never {m['never']}/{m['achieve']} advances {m['adv']:.2f} | wildcard drawn {m['wc_drawn']:.2f}/Beat | "
              f"largest change in a faction's draws/Beat {dd[worst]:+.3f} ({NAME.get(worst, worst)[:12]}, Power {base['slots'][worst]:.1f})")
        print(f"      Power {hi} : Power {lo} draw ratio {ratio(m)[0]:.2f} (no wildcard {r0:.2f})")
        print("      wildcard picks vs unnominated-goal share:",
              {NAME.get(f, f)[:9]: (round(m['pick_share'][f], 2), round(m['avail_share'][f], 2)) for f in m['pick_share']})
        print("      draws/Beat with vs without:", {NAME.get(f, f)[:9]: (round(m['draws'][f], 2), round(base['draws'][f], 2), round(base['slots'][f], 1)) for f in m['draws']})
