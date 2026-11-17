"""Revision 5: bounded Character Beat strategies (statistical AND operational scaling) and goal starvation.
Usage: python3 -I experiments6.py <real workdir (live.json with narrativeTier + calib.json)> <synthetic dir>"""
import sys, os, copy, dataclasses, statistics as st, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from colony_sim import Config, Colony, load, batch

D0, C0 = load(sys.argv[1]); SYN = sys.argv[2]
FX = ['aspis', 'cult', 'institute', 'keepers', 'seekers', 'shattered', 'witnesses']
TIERS = {f: 0 for f in FX} | {'keepers': -2}
REV3 = Config(power='channels', channels=(68, 62, 45), rev3_order=True, delayed_check=True, ready_to_resolve=True,
              draws_by_stress=True, stress_k=5, settle=True, start_tiers=TIERS, rtr_collide=False,
              unattended_turns=1, detector=True)
R = lambda **kw: dataclasses.replace(REV3, **kw)

def cloned(k):
    D = copy.deepcopy(D0); compat = dict(C0)
    for c in D0['characters']:
        if c['characterType'] == 'NPC' and c['state'] == 'Alive' and c['factionId']:
            for j in range(1, k):
                cl = dict(c, id=f"{c['id']}~{j}", name=f"{c['name']}~{j}"); D['characters'].append(cl)
                if c['id'] in C0: compat[cl['id']] = C0[c['id']]
    return D, compat

def cb_metrics(D, outs):
    L = [o[1]['log'] for o in outs]; n = len(outs)
    g = lambda k: sum(l.get(k, 0) for l in L)
    beats = g('cb_beats') or 1
    npcs = sum(1 for c in D['characters'] if c['characterType'] == 'NPC' and c['state'] == 'Alive' and c['factionId'])
    d = [o[1]['defected'] for o in outs]
    tier_of = {c['id']: c.get('narrativeTier') for c in D['characters']}
    bg = sum(1 for o in outs for (_, nm, _) in o[2] if tier_of.get(next((c['id'] for c in D['characters'] if c['name'] == nm), None)) == 'Background')
    return dict(draws=g('cb_drawn') / beats, draws_max=max(l.get('cb_max_draws', 0) for l in L), atrisk=g('cb_atrisk') / beats,
                p_drawn=g('cb_drawn') / (g('cb_atrisk') or 1), defect=st.mean(d), def10=st.mean(d) / npcs * 10,
                crisis=g('sessions_with_crisis') / n, p4=sum(x >= 4 for x in d) / n, bg_share=bg / (sum(d) or 1),
                capped=g('crisis_capped') / n)

# record the maximum draw count per Beat (operational footprint)
_orig = Colony.n_draws
def n_draws(self, stress, pool_size=None):
    n = _orig(self, stress, pool_size)
    self.log['cb_max_draws'] = max(self.log.get('cb_max_draws', 0), n)
    return n
Colony.n_draws = n_draws

print("== A. Character Beat strategies. draws = rolls the GM makes per Colony Turn (mean / max); P(drawn) = P(an at-risk NPC is rolled for)")
print("   def/10 = defections per 10 NPCs; crisis = sessions (of 11) opening with a Compromised NPC; bg = share of defections from Background-tier NPCs\n")
S = [('S0 fixed 2-5 by Stress (Rev 3)', {}),
     ('S1 1 per 5/4/3 at-risk, uncapped', dict(draw_rule='pool_tier')),
     ('S2 1 per 5/4/3 at-risk, max 5', dict(draw_rule='pool_tier', draw_cap=5)),
     ('S3 1 per 5/4/3 at-risk, max 6', dict(draw_rule='pool_tier', draw_cap=6)),
     ('S4 faction nominates 1, draw 2-5', dict(cb_nominate=1)),
     ('S5 faction nominates 2, draw 2-5', dict(cb_nominate=2)),
     ('S6 named cast only, draw 2-5', dict(cb_tiers=('Major', 'Supporting'))),
     ('S7 named cast only, 1 per 5/4/3, max 5', dict(cb_tiers=('Major', 'Supporting'), draw_rule='pool_tier', draw_cap=5))]
for label, kw in S:
    print(f"-- {label}")
    for k in (1, 3, 6):
        D, cp = cloned(k)
        profs = ['calm', 'arc', 'rising'] if k == 1 else ['arc']
        for prof in profs:
            m = cb_metrics(D, batch(D, cp, R(stress=prof, **kw), 600 if k > 1 else 1000))
            print(f"   x{k} {prof:<6} draws {m['draws']:4.1f}/{m['draws_max']:<3} at-risk {m['atrisk']:5.1f} P(drawn) {m['p_drawn']:.2f} | "
                  f"defect {m['defect']:4.2f} def/10 {m['def10']:.2f} crisis {m['crisis']:4.1f} P>=4 {m['p4']:.2f} bg {m['bg_share']:.2f}")

print("\n== B. Crisis cap semantics: cap 2 on S1. 'skip' = capped success ignored (Rev 4 sim); 'queue' = success honored, enters Compromised next Beat")
for k in (1, 6):
    D, cp = cloned(k)
    for q in (False, True):
        m = cb_metrics(D, batch(D, cp, R(draw_rule='pool_tier', crisis_cap=2, crisis_queue=q), 600))
        print(f"   x{k} {'queue' if q else 'skip ':<5} defect {m['defect']:4.2f} def/10 {m['def10']:.2f} crisis {m['crisis']:4.1f} P>=4 {m['p4']:.2f} capped/run {m['capped']:.2f}")

# ---------------- C. Goal starvation ----------------
def starvation(D, cp, kw, runs=1000):
    outs = batch(D, cp, R(faction_beats_act3=False, turns=7, **kw), runs)
    L = [o[0]['log'] for o in outs]
    g = lambda k: sum(l.get(k, 0) for l in L)
    achieve = [x for x in D['goals'] if x['conditionType'] == 'Achieve']
    beats = 4 * len(outs)
    never = [x for x in achieve if sum(l.get(f"nomd_{x['id']}", 0) for l in L) == 0]
    minor = [x for x in achieve if x['priority'] == 'Minor']
    adv = {p: 0 for p in ('Critical', 'Major', 'Minor')}
    return dict(zero_share=g('zero_prob_goals') / (g('elig_goals') or 1), never=len(never), achieve=len(achieve),
                minor_nom=sum(sum(l.get(f"nomd_{x['id']}", 0) for l in L) for x in minor) / (len(minor) * beats or 1),
                adv=g('advances') / len(outs), ready=g('ready_created') / len(outs), never_titles=[x['title'] for x in never][:6])

print("\n== C. Goal starvation over four Act II Beats. zero = share of eligible goal-Beats with ZERO nomination probability;")
print("   never = Achieve goals never nominated in any run; minor nom = P(a Minor goal is nominated per Beat)")
worlds = [('real', D0, C0)]
for name in ('goals_2.0x', 'goals_4.0x'):
    Ds, Cs = load(os.path.join(SYN, name)); worlds.append((name, Ds, Cs))
for wname, D, cp in worlds:
    for wl in (None, 'faction', 'colony'):
        m = starvation(D, cp, dict(wildcard=wl) if wl else {})
        print(f"   {wname:<11} wildcard={str(wl):<8} zero {m['zero_share']:.2f}  never {m['never']}/{m['achieve']}  minor nom {m['minor_nom']:.3f}  "
              f"advances {m['adv']:5.2f}  ready {m['ready']:.2f}" + (f"  never: {m['never_titles']}" if wl is None and wname == 'real' else ''))
