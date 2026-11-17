"""Revision 4 candidates: monotone People, cast-scaled Character draws, unattended resolution, Reading branches.
Usage: python3 -I experiments5.py <workdir with live.json + calib.json>"""
import sys, os, copy, random, dataclasses, statistics as st, collections, itertools
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from colony_sim import Config, Colony, load, batch

D0, C0 = load(sys.argv[1])
FX = ['aspis', 'cult', 'institute', 'keepers', 'seekers', 'shattered', 'witnesses']
NAME = {f['id']: f['name'] for f in D0['factions']}
TIERS = {f: 0 for f in FX} | {'keepers': -2}
REV3 = Config(power='channels', channels=(68, 62, 45), rev3_order=True, delayed_check=True, ready_to_resolve=True,
              draws_by_stress=True, stress_k=5, settle=True, start_tiers=TIERS, rtr_collide=False)
R = lambda **kw: dataclasses.replace(REV3, **kw)
M = lambda outs, k, i=1: st.mean(o[i]['log'].get(k, 0) for o in outs)

# ---------------- A. People: avg/max vs sum of top three ----------------
print("== A. People channel: avg/max blend (current) vs sum of top-3 influences (threshold 220, no leaderless multiplier)")
for metric in ['avgmax', 'top3']:
    cfg = R(people_metric=metric)
    c = Colony(D0, C0, cfg, random.Random(0))
    print(f"   {metric:<7} slots:", {NAME[f][:9]: c.slots(f) for f in FX})
    # local monotonicity: removing any one member must never RAISE Power; adding a member with influence 0..100 must never LOWER it
    up = down = checks = 0
    for f in FX:
        base = c.slots(f)
        for m in [x for x in c.ch.values() if x['factionId'] == f and x['state'] == 'Alive']:
            m['state'] = 'Dead'; checks += 1; up += c.slots(f) > base; m['state'] = 'Alive'
        for infl in (0, 30, 60, 100):
            cid = f'__probe_{f}_{infl}'
            c.ch[cid] = dict(id=cid, name=cid, characterType='NPC', state='Alive', factionId=f, influence=infl, pressure=0,
                             conviction=50, impressionable=50, values={'a': 1/3, 'b': 1/3, 'c': 1/3}, inst=0, defected=False)
            checks += 1; down += c.slots(f) < base; del c.ch[cid]
    print(f"           monotonicity: {up} 'loss raised Power' + {down} 'recruit lowered Power' violations in {checks} checks")
    for f, who in [('keepers', 'Serevan Ilvar'), ('aspis', 'Perrik Tallow'), ('seekers', 'Julian Arrett')]:
        cid = next(x['id'] for x in c.ch.values() if x['name'] == who)
        base = c.slots(f); c.ch[cid]['state'] = 'Dead'; after = c.slots(f); c.ch[cid]['state'] = 'Alive'
        print(f"           {who} incapable: {NAME[f]} Power {base} -> {after}")

# ---------------- B. Character draws scaled to the cast ----------------
def cloned(k):
    D = copy.deepcopy(D0); compat = dict(C0)
    for c in D0['characters']:
        if c['characterType'] == 'NPC' and c['state'] == 'Alive' and c['factionId']:
            for j in range(1, k):
                cl = dict(c, id=f"{c['id']}~{j}", name=f"{c['name']}~{j}"); D['characters'].append(cl)
                if c['id'] in C0: compat[cl['id']] = C0[c['id']]
    return D, compat
npcs = lambda D: sum(1 for c in D['characters'] if c['characterType'] == 'NPC' and c['state'] == 'Alive' and c['factionId'])
print("\n== B. Character draws vs cast size (real NPCs cloned xk). def/10 = defections per 10 NPCs; crisis = sessions opening with a Compromised NPC")
rules = [('stress 2-5 (Rev 3)', {}),
         ('1 per 4 at-risk (pool/4)', dict(draw_rule='pool', draw_per=4)),
         ('pool x (0.10+0.025*Stress)', dict(draw_rule='pool_stress')),
         ('pool/4, crisis cap 2', dict(draw_rule='pool', draw_per=4, crisis_cap=2)),
         ('pool x stress, cap 2', dict(draw_rule='pool_stress', crisis_cap=2)),
         ('1 per 5/4/3 by Stress', dict(draw_rule='pool_tier')),
         ('1 per 5/4/3 by Stress, cap 2', dict(draw_rule='pool_tier', crisis_cap=2))]
for label, kw in rules:
    line = []
    for k in (1, 3, 6):
        D, cp = cloned(k)
        for prof in (['calm', 'arc', 'rising'] if k == 1 else ['arc']):
            outs = batch(D, cp, R(stress=prof, **kw), 500 if k > 1 else 1000)
            d = [o[1]['defected'] for o in outs]
            line.append(f"x{k} {prof}: def/10 {st.mean(d) / npcs(D) * 10:.2f} crisis {M(outs, 'sessions_with_crisis'):.1f} P>=4 {sum(x >= 4 for x in d) / len(d):.2f}")
    print(f"   {label:<28}", " | ".join(line))

# ---------------- C. Unattended resolution ----------------
print("\n== C. Unattended resolution of Ready to Resolve goals (declared outcome applies N turns after Ready, unless play resolved it)")
for n in [None, 1, 2]:
    outs = batch(D0, C0, R(unattended_turns=n, detector=True, faction_beats_act3=False, turns=7), 2000)
    print(f"   N={str(n):<4} Act II: advances {M(outs, 'advances', 0):.2f}  accomplished {M(outs, 'accomplished', 0):.2f}  "
          f"ready {M(outs, 'ready_created', 0):.2f}  resolved unattended {M(outs, 'unattended_resolved', 0):.2f}  "
          f"character outcomes {M(outs, 'unattended_character_outcome', 0):.3f}")

# ---------------- D. Reading branches (post-Session-4) ----------------
gid = lambda pre: next(g['id'] for g in D0['goals'] if g['id'].startswith(pre))
CR, SR, KEEPER = gid('67fe02c3'), gid('8bd0a0cb'), gid('6c8fbe28')
VARA = next(c['id'] for c in D0['characters'] if 'Vara' in c['name'])

def branch(kind):
    def hook(col, t):
        if t != 3: return                                  # the Colony Turn before Session 5 (first Act II turn)
        g = col.goals
        if kind == 'stopped':
            col.ch[VARA]['state'] = 'Alive'
            g[CR]['status'] = 'Failed'; g[SR]['status'] = 'Accomplished'
            col.pending['seekers'].append((('reading', 'stopped'), +1, 'Stop the Ritual accomplished (credited)'))
            col.pending['keepers'].append((('reading', 'stopped-o'), -1, 'GM-declared setback: the Reading was stopped'))
        else:
            col.ch[VARA]['state'] = 'Forgotten'
            g[CR]['status'] = 'Accomplished'; g[SR]['status'] = 'Failed'
            col.pending['keepers'].append((('reading', 'completed'), +1, 'Complete the Ritual accomplished (credited)'))
            col.pending['seekers'].append((('reading', 'completed-d'), -1, 'GM-declared setback: the Reading was not stopped'))
            g[KEEPER]['obsolete'] = True                     # target Vara must become Dead; she is Forgotten -> needs ruling
    return hook

print("\n== D. Reading branches: four Act II Faction Beats from the post-Session-4 state (unattended N=1, detector on)")
for kind in ['stopped', 'completed']:
    outs = batch(D0, C0, R(turn_hook=branch(kind), unattended_turns=1, detector=True, faction_beats_act3=False, turns=7), 2000)
    s = [o[0] for o in outs]
    tier = {f: st.mean(x['tier'][f] for x in s) for f in FX}
    print(f"-- Reading {kind}: advances {M(outs, 'advances', 0):.2f}  accomplished {M(outs, 'accomplished', 0):.2f}  ready {M(outs, 'ready_created', 0):.2f}  "
          f"unattended {M(outs, 'unattended_resolved', 0):.2f}  Vara killed offscreen {M(outs, 'unattended_character_outcome', 0):.3f}  "
          f"defections (through S8) {st.mean(x['defected'] for x in s):.2f}")
    print("   per faction (accomplished / advances / end tier):",
          {NAME[f][:9]: (round(M(outs, f'acc_{f}', 0), 2), round(M(outs, f'adv_{f}', 0), 2), round(tier[f], 2)) for f in FX})
