"""Revision 3 configuration. Usage: python3 experiments4.py <workdir> [<workdir with threshold-0.4 calib.json>]"""
import sys, os, statistics as st, collections, dataclasses
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from colony_sim import Config, load, batch
D, compat = load(sys.argv[1])
NAME = {f['id']: f['name'] for f in D['factions']}
FX = ['aspis', 'cult', 'institute', 'keepers', 'seekers', 'shattered', 'witnesses']
TIERS = {f: 0 for f in FX} | {'keepers': -2}            # stand-in for GM-assigned starting tiers (D-C)
REV3 = Config(power='channels', channels=(68, 62, 45), rev3_order=True, delayed_check=True, ready_to_resolve=True,
              draws_by_stress=True, stress_k=5, settle=True, start_tiers=TIERS)
M = lambda outs, k, i=1: st.mean(o[i]['log'].get(k, 0) for o in outs)

def faction(label, cfg, runs=2000):
    outs = batch(D, compat, cfg, runs)
    print(f"-- {label}")
    print(f"   advances {M(outs,'advances',0):.2f}  accomplished(auto) {M(outs,'accomplished',0):.2f}  ready-to-resolve {M(outs,'ready_created',0):.2f}  "
          f"slot flips/run {M(outs,'slot_flips',0):.2f}  capped {M(outs,'momentum_capped',0):.2f}  collisions {M(outs,'collisions',0):.3f}")
    print("   per faction acc / ready-ish adv / flips:", {NAME[f][:9]: (round(M(outs, f'acc_{f}', 0), 2), round(M(outs, f'adv_{f}', 0), 2), round(M(outs, f'flip_{f}', 0), 2)) for f in FX})
    return outs

print("== Act II (4 Faction Beats) ==")
from colony_sim import Colony; import random
for th in [(70, 60, 55), (68, 62, 45)]:
    c = Colony(D, compat, dataclasses.replace(REV3, channels=th), random.Random(0))
    print(f"   thresholds {th}: slots", {NAME[f][:9]: c.slots(f) for f in FX})
faction("Rev2 channels (70,60,55), resolution at Beat commit, no Ready overlay",
        dataclasses.replace(REV3, channels=(70, 60, 55), rev3_order=False, delayed_check=False, ready_to_resolve=False))
faction("Rev3 thresholds (70,60,55)", dataclasses.replace(REV3, channels=(70, 60, 55)))
faction("Rev3 thresholds (68,62,45)  [proposed]", REV3)

print("\n== Campaign (11 Colony Turns), Rev3 ==")
def chars(label, cfg, cmp=compat, runs=2000):
    outs = batch(D, cmp, cfg, runs); d = [o[1]['defected'] for o in outs]
    print(f"   {label:<40} defections {st.mean(d):.2f}  P0 {sum(x==0 for x in d)/len(d):.2f}  P>=4 {sum(x>=4 for x in d)/len(d):.2f}  "
          f"sessions opening with a Compromised NPC {M(outs,'sessions_with_crisis'):.2f}  checks failed {M(outs,'defection_failed'):.2f}  leader defections {M(outs,'leader_defected'):.3f}")
    return outs
for prof in ['calm', 'arc', 'rising']:
    outs = chars(f"stress {prof}", dataclasses.replace(REV3, stress=prof))
outs = chars("arc (repeat, for names)", REV3)
cnt = collections.Counter(n for o in outs for (_, n, _) in o[2])
print("   top defectors:", [(n, round(c / 2000, 2)) for n, c in cnt.most_common(8)])
if len(sys.argv) > 2:
    D4, compat4 = load(sys.argv[2])
    o4 = chars("arc, belief threshold 0.4 (D-N)", REV3, compat4)
    c4 = collections.Counter(n for o in o4 for (_, n, _) in o[2])
    lab = lambda cm: collections.Counter(v['own']['label'] for v in cm.values())
    print("   own-faction labels @0.5:", dict(lab(compat)), " @0.4:", dict(lab(compat4)))
    eg = [c['name'] for c in D['characters'] if c['factionId'] == 'institute']
    print("   EGRESS labels @0.5 → @0.4:", {n: (next(v['own']['label'] for v in compat.values() if v['name'] == n), next(v['own']['label'] for v in compat4.values() if v['name'] == n)) for n in eg})
    print("   top defectors @0.4:", [(n, round(c / 2000, 2)) for n, c in c4.most_common(8)])
