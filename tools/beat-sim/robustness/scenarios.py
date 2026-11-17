"""Scenario matrix. Usage: python3 -I scenarios.py <syn_dir> <real_dir> [runs]"""
import sys, os, glob, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import world, scenario_cfg, run, HDR, row, Colony, random

syn, real = sys.argv[1], sys.argv[2]; RUNS = int(sys.argv[3]) if len(sys.argv) > 3 else 1000
ORDER = ['base', 'equal', 'dominant', 'weakened', 'high_power', 'covert', 'mass', 'leader_loss', 'contested',
         'high_conv', 'low_conv', 'incompatible', 'aligned', 'mixed_inst']

def labels(compat): return dict(collections.Counter(v['own']['label'] for v in compat.values()))
def power(D, compat, cfg): c = Colony(D, compat, cfg, random.Random(0)); return {f: c.slots(f) for f in sorted(c.F)}
def fmt(d, nd=2): return ' '.join(f"{k[-3:]}:{v:.{nd}f}" for k, v in d.items())

print(f"== Scenario matrix (Rev 3 config, {RUNS} runs each, arc stress, 11 Colony Turns)")
print(f"{'scenario':<14}{HDR}")
D, compat, meta = world(real); cfg = scenario_cfg(D, meta, syn); R = run(D, compat, cfg, RUNS)
print(f"{'REAL colony':<14}{row(R)}")
res = {}
for name in ORDER:
    D, compat, meta = world(os.path.join(syn, name)); cfg = scenario_cfg(D, meta, syn)
    res[name] = (D, compat, meta, cfg, run(D, compat, cfg, RUNS))
    print(f"{name:<14}{row(res[name][4])}")
print("   columns: adv/acc/ready/collisions per campaign; pool/b = nominated cards per Beat; drawn/b = cards drawn per Beat;")
print("   full = share of Beats with pool > 5; comp = Compromised entries; crisis = sessions opening with a Compromised NPC;")
print("   def/10 = defections per 10 NPCs; cbpool = Character Beat pool size; P(chr) = P(an at-risk NPC is drawn per Character Beat)")

print("\n== Per-scenario detail")
for name in ORDER:
    D, compat, meta, cfg, r = res[name]
    print(f"-- {name}: {meta['question']}")
    print(f"   Power {power(D, compat, cfg)}   labels {labels(compat)}")
    print(f"   slots/beat {fmt(r['slots'])}")
    print(f"   advances   {fmt(r['fadv'])}")
    print(f"   accompl.   {fmt(r['facc'])}")
    print(f"   cards drawn/campaign {fmt(r['fdrawn'])}")

# targeted contrasts
print("\n== Targeted contrasts")
D, compat, meta = world(os.path.join(syn, 'mass'))
for hn in (None, 12):
    cfg = scenario_cfg(D, meta, syn, headcount_n=hn); r = run(D, compat, cfg, RUNS)
    print(f"   mass, headcount_n={hn}: Power {power(D, compat, cfg)['f06']} for f06; f06 slots/beat {r['slots']['f06']:.2f} adv {r['fadv']['f06']:.2f}  "
          f"(others mean adv {sum(v for k, v in r['fadv'].items() if k != 'f06') / 6:.2f})")
D, compat, meta = world(os.path.join(syn, 'base'))
D2, compat2, meta2 = world(os.path.join(syn, 'leader_loss'))
for lab, (Dx, cx, mx) in [('base', (D, compat, meta)), ('leader_loss', (D2, compat2, meta2))]:
    cfg = scenario_cfg(Dx, mx, syn); r = run(Dx, cx, cfg, RUNS)
    print(f"   {lab:<12} f00 Power {power(Dx, cx, cfg)['f00']} slots/beat {r['slots']['f00']:.2f} adv {r['fadv']['f00']:.2f} acc {r['facc']['f00']:.2f}")
D, compat, meta = world(os.path.join(syn, 'dominant')); cfg = scenario_cfg(D, meta, syn); r = res['dominant'][4]
tot = sum(r['fdrawn'].values())
print(f"   dominant: f00 holds {r['fdrawn']['f00'] / tot:.0%} of drawn cards, {r['fnom']['f00'] / sum(r['fnom'].values()):.0%} of nominated cards, "
      f"{r['slots']['f00'] / sum(r['slots'].values()):.0%} of Power (nominations/beat f00 {r['fnom']['f00']:.2f} of {sum(r['fnom'].values()):.2f})")
r = res['equal'][4]; v = list(r['fadv'].values())
print(f"   equal: per-faction advances min {min(v):.2f} max {max(v):.2f} (symmetry ratio {max(v) / min(v):.2f})")
