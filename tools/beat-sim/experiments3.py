"""Stress-scaled draws and threat pressure. Usage: python3 experiments3.py <workdir>"""
import sys, os, statistics as st, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from colony_sim import Config, load, batch
D, compat = load(sys.argv[1])
def row(label, cfg, runs=1000):
    outs = batch(D, compat, cfg, runs); d = [o[1]['defected'] for o in outs]
    L = lambda k: st.mean(o[1]['log'].get(k, 0) for o in outs)
    print(f"   {label:<48} defect {st.mean(d):4.2f} P0 {sum(x==0 for x in d)/len(d):4.2f} P>=4 {sum(x>=4 for x in d)/len(d):4.2f} p90 {sorted(d)[int(.9*(len(d)-1))]} | Conf@end {st.mean(o[1]['conflicted'] for o in outs):4.1f} Comp@end {st.mean(o[1]['compromised'] for o in outs):4.2f} threatP {L('threat_pressure_applied'):4.2f}")
    return outs
print("== K. Colony Stress sets the number of Character Beat draws ==")
for k in [10, 5, 3]:
    for prof in ['calm', 'arc', 'rising']:
        row(f"k={k:<2} {prof:<6} draws=2+stress//3", Config(stress_k=k, stress=prof, draws_by_stress=True))
        row(f"k={k:<2} {prof:<6} draws=2+stress//3, delayed check", Config(stress_k=k, stress=prof, draws_by_stress=True, delayed_check=True))
print("\n== L. Threat pressure on defenders (k=5, arc, draws by stress) ==")
for tp in [0, 5, 10]:
    outs = row(f"threat pressure +{tp}", Config(draws_by_stress=True, threat_pressure=tp))
cnt = collections.Counter(n for o in batch(D, compat, Config(draws_by_stress=True, threat_pressure=10), 2000) for (_, n, _) in o[2])
print("   top defectors (threat +10):", [(n, round(c/2000, 2)) for n, c in cnt.most_common(8)])
print("   Marra / Damaris / Jorren:", [round(cnt.get(n, 0)/2000, 3) for n in ['Sister Marra', 'Damaris Holt', 'Jorren Vale']])
