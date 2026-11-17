"""
Scaling: goals, characters, factions above/below the current campaign. Absolute AND per-entity rates.
Usage: python3 -I scaling.py <syn_dir> <real_dir> [runs]      (default 600)
"""
import sys, os, copy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import world, scenario_cfg, run, base_power

syn, real = sys.argv[1], sys.argv[2]; RUNS = int(sys.argv[3]) if len(sys.argv) > 3 else 600
BP = base_power(syn)
H = ("NPCs fac goals | adv/beat acc   ready | pool/b drawn/b full P(goal drawn) | comp crisis defect def/10 P0   P>=4 | "
     "cbpool P(chr) draws/CB")
def row(lab, r, D):
    goals = sum(1 for g in D['goals'] if g['conditionType'] == 'Achieve')
    return (f"  {lab:<22}{r['npcs']:>4} {r['factions']:>3} {goals:>5} | {r['adv_beat']:6.2f} {r['acc']:5.2f} {r['ready']:5.2f} | "
            f"{r['pool_beat']:5.1f} {r['drawn_beat']:5.2f} {r['board_full']:4.2f}   {r['p_goal_drawn']:5.3f}     | "
            f"{r['comp']:4.2f} {r['crisis']:5.2f} {r['defect']:5.2f} {r['def10']:5.2f} {r['p0']:4.2f} {r['p4']:4.2f} | "
            f"{r['cb_pool']:5.1f} {r['p_char_drawn']:5.3f} {r['cb_pool'] * r['p_char_drawn']:5.2f}")

def one(lab, name, **kw):
    D, compat, meta = world(os.path.join(syn, name)) if name != 'real' else world(real)
    r = run(D, compat, scenario_cfg(D, meta, syn, **kw), RUNS); print(row(lab, r, D)); return r

print(f"Columns: adv/beat = advances per Faction Beat; P(goal drawn) = P(a given ELIGIBLE goal is drawn in a Beat); full = share of Beats")
print(f"with nominated pool > 5; def/10 = defections per 10 NPCs; P(chr) = P(an at-risk NPC is drawn in a Character Beat).  {RUNS} runs/row.\n")
print("== Characters (synthetic, Power held at base values; 5 goals/faction)\n  " + " " * 22 + H)
for lab, name in [('0.3x (2/faction)', 'npc_0.3x'), ('1x (5/faction)', 'base'), ('3x (15/faction)', 'npc_3x'), ('6x (30/faction)', 'npc_6x')]:
    one(lab, name, power_override=BP)
print("  -- same pools, draws scaled with pool size (exploratory recalibration: draws x NPCs/35)")
for lab, name, x in [('3x, draws x3', 'npc_3x', 3), ('6x, draws x6', 'npc_6x', 6)]:
    one(lab, name, power_override=BP, draw_scale=x)

print("\n== Characters (REAL fixture with every NPC cloned k times; clones copy values/stats/labels, no goals; Power unchanged)\n  " + " " * 22 + H)
D0, c0, m0 = world(real)
for k in (1, 3, 6):
    D = copy.deepcopy(D0); compat = dict(c0)
    for c in D0['characters']:
        if c['characterType'] == 'NPC' and c['state'] == 'Alive' and c['factionId']:
            for j in range(1, k):
                cl = dict(c, id=f"{c['id']}~{j}", name=f"{c['name']}~{j}"); D['characters'].append(cl)
                if c['id'] in c0: compat[cl['id']] = c0[c['id']]
    r = run(D, compat, scenario_cfg(D, m0, syn), RUNS); print(row(f'real x{k}', r, D))
    if k > 1:
        r = run(D, compat, scenario_cfg(D, m0, syn, draw_scale=k), RUNS); print(row(f'real x{k}, draws x{k}', r, D))

print("\n== Goals (synthetic, 7 factions)\n  " + " " * 22 + H)
for lab, name in [('0.5x', 'goals_0.5x'), ('1x', 'base'), ('2x', 'goals_2.0x'), ('4x', 'goals_4.0x')]:
    one(lab, name)
print("  -- board size probe: same worlds with 7 slots (if the board binds, advances rise ~7/5)")
for lab, name in [('0.5x, 7 slots', 'goals_0.5x'), ('1x, 7 slots', 'base'), ('4x, 7 slots', 'goals_4.0x')]:
    one(lab, name, n_slots=7)

print("\n== Factions (synthetic, 5 NPCs and 5 goals per faction)\n  " + " " * 22 + H)
for lab, name in [('3 factions', 'factions_3'), ('7 factions', 'base'), ('12 factions', 'factions_12')]:
    one(lab, name)
print("  -- board size probe")
for lab, name in [('3 factions, 7 slots', 'factions_3'), ('12 factions, 7 slots', 'factions_12')]:
    one(lab, name, n_slots=7)
