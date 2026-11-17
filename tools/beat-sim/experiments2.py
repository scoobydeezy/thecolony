"""Structural variants for the Character Beat and cutover. Usage: python3 experiments2.py <workdir>"""
import sys, os, statistics as st, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from colony_sim import Config, load, batch
D, compat = load(sys.argv[1])
def row(label, cfg, runs=1000):
    outs = batch(D, compat, cfg, runs); d = [o[1]['defected'] for o in outs]
    L = lambda k: st.mean(o[1]['log'].get(k, 0) for o in outs)
    comp_end = st.mean(o[1]['compromised'] for o in outs)
    print(f"   {label:<44} defect {st.mean(d):4.2f} P0 {sum(x==0 for x in d)/len(d):4.2f} P>=4 {sum(x>=4 for x in d)/len(d):4.2f} | "
          f"Conf@end {st.mean(o[1]['conflicted'] for o in outs):4.1f} Comp@end {comp_end:4.2f} entries {L('compromised_entries'):4.2f} failedChk {L('defection_failed'):4.2f}")
    return outs
print("== G. Draw weighting vs stress (does crisis concentrate?) ==")
for k in [10, 5]:
    for prof in ['calm', 'arc', 'rising']:
        row(f"k={k:<2} {prof:<6} uniform draw, band mods", Config(stress_k=k, stress=prof))
        row(f"k={k:<2} {prof:<6} band tickets, band mods", Config(stress_k=k, stress=prof, tickets=True))
        row(f"k={k:<2} {prof:<6} band tickets, no mods", Config(stress_k=k, stress=prof, tickets=True, band_mods=False))
print("\n== H. Defection timing (k=5, arc) ==")
row("immediate check (as specified)", Config())
row("delayed check (next Character Beat)", Config(delayed_check=True))
row("delayed check + tickets", Config(delayed_check=True, tickets=True))
print("\n== I. Faction->Pressure magnitude (k=5, arc, 7 Faction Beats) ==")
for lp in [0, 5, 10, 20]:
    row(f"loss pressure +{lp} members / +{2*lp} defender", Config(loss_pressure=lp, pressure_rules=lp > 0))
print("\n== J. Momentum cutover rounding, Act II (4 Beats), Power=pub ==")
for tr in ['round', 'trunc']:
    outs = batch(D, compat, Config(tier_round=tr, faction_beats_act3=False, turns=7), 2000)
    s = [o[0] for o in outs]
    print(f"   {tr:<6} Shattered adv {st.mean(x['log'].get('adv_shattered',0) for x in s):.2f} acc {st.mean(x['log'].get('acc_shattered',0) for x in s):.2f} | all acc {st.mean(x['log'].get('accomplished',0) for x in s):.2f} adv {st.mean(x['log'].get('advances',0) for x in s):.2f}")
