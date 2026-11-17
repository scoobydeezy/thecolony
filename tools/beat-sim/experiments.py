"""Calibration experiments for the revised review. Usage: python3 experiments.py <workdir with live.json, calib.json>"""
import sys, os, statistics as st, collections, dataclasses
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from colony_sim import Config, load, batch

D, compat = load(sys.argv[1])
FX = ['aspis', 'cult', 'institute', 'keepers', 'seekers', 'shattered', 'witnesses']
NAME = {f['id']: f['name'] for f in D['factions']}
pct = lambda xs, p: sorted(xs)[int(p * (len(xs) - 1))]

def faction_table(cfg, runs, which):
    outs = batch(D, compat, cfg, runs)
    snaps = [o[0] if which == 'act2' else o[1] for o in outs]
    print(f"   {'faction':<20} {'adv':>5} {'acc':>5} {'P(acc>=1)':>9} {'tier0':>5} {'tier':>6} {'slots0':>6} {'slots':>6}")
    from colony_sim import Colony; import random
    c0 = Colony(D, compat, cfg, random.Random(0))
    for f in FX:
        adv = st.mean(s['log'].get(f'adv_{f}', 0) for s in snaps); acc = [s['log'].get(f'acc_{f}', 0) for s in snaps]
        print(f"   {NAME[f]:<20} {adv:5.2f} {st.mean(acc):5.2f} {sum(a > 0 for a in acc) / len(acc):9.2f} {c0.tier[f]:>5} {st.mean(s['tier'][f] for s in snaps):6.2f} {c0.slots(f):>6} {st.mean(s['slots'][f] for s in snaps):6.2f}")
    L = lambda k: st.mean(s['log'].get(k, 0) for s in snaps)
    print(f"   per run: attempts {L('fb_attempts'):.1f}, pool/beat {L('fb_pool') / max(1, L('fb_attempts') / 5):.1f}, accomplished {L('accomplished'):.2f}, "
          f"collisions {L('collisions'):.3f}, momentum-capped {L('momentum_capped'):.2f}, adjudication-pending {L('adjudication_pending'):.2f}, obsoleted {L('obsoleted'):.2f}")
    return outs

print("== A. FACTION BEATS, Act II horizon (4 Beats), stress arc, k=5 ==")
for p in ['mult', 'pub', 'channels']:
    print(f"-- Power = {p}")
    faction_table(Config(power=p, faction_beats_act3=False, turns=7), 2000, 'act2')
print("\n== A2. Long stress test: 8 Faction Beats (Acts II+III), Power = pub ==")
faction_table(Config(power='pub'), 2000, 'end')

print("\n== B. CHARACTER BEATS across 11 Colony Turns (Act I-III), 3 draws, Power = pub ==")
print(f"   {'k':>3} {'stress':<7} {'defect mean':>11} {'P(0)':>5} {'P(>=4)':>6} {'p90':>4} {'Conf end':>8} {'Comp end':>8} {'pool/beat':>9} {'comp entries':>12}")
for k in [10, 7, 5, 3]:
    for prof in ['calm', 'arc', 'rising']:
        outs = batch(D, compat, Config(stress_k=k, stress=prof), 1000)
        d = [o[1]['defected'] for o in outs]
        print(f"   {k:>3} {prof:<7} {st.mean(d):11.2f} {sum(x == 0 for x in d) / len(d):5.2f} {sum(x >= 4 for x in d) / len(d):6.2f} {pct(d, .9):>4} "
              f"{st.mean(o[1]['conflicted'] for o in outs):8.2f} {st.mean(o[1]['compromised'] for o in outs):8.2f} "
              f"{st.mean(o[1]['log'].get('cb_pool', 0) for o in outs) / 11:9.1f} {st.mean(o[1]['log'].get('compromised_entries', 0) for o in outs):12.2f}")

print("\n== C. Slot count sensitivity (k=5, arc) ==")
for n in [2, 3, 4]:
    outs = batch(D, compat, Config(char_slots=n), 1000); d = [o[1]['defected'] for o in outs]
    print(f"   slots {n}: defections mean {st.mean(d):.2f}  P(0) {sum(x == 0 for x in d) / len(d):.2f}  P(>=4) {sum(x >= 4 for x in d) / len(d):.2f}  compromised entries {st.mean(o[1]['log'].get('compromised_entries', 0) for o in outs):.2f}")

print("\n== D. Recovery rule (k=5, arc): stranded = unstable characters with Steady drift, summed over Beats ==")
for s in [False, True]:
    outs = batch(D, compat, Config(settle=s), 1000)
    print(f"   settle={s}: stranded-character-beats/run {st.mean(o[1]['log'].get('stranded', 0) for o in outs):.2f}  defections {st.mean(o[1]['defected'] for o in outs):.2f}  settled {st.mean(o[1]['log'].get('settled', 0) for o in outs):.2f}")

print("\n== E. Faction -> Pressure interaction (k=5, arc) ==")
for pr in [False, True]:
    outs = batch(D, compat, Config(pressure_rules=pr), 1000)
    print(f"   pressure_rules={pr}: defections {st.mean(o[1]['defected'] for o in outs):.2f}  goals orphaned {st.mean(o[1]['log'].get('goals_orphaned', 0) for o in outs):.2f}  leaders defected {st.mean(o[1]['log'].get('leader_defected', 0) for o in outs):.3f}")

print("\n== F. Who defects (k=5, arc, 2000 runs): P(defects during campaign) ==")
outs = batch(D, compat, Config(), 2000)
cnt = collections.Counter(n for o in outs for (_, n, _) in o[2])
for n, c in cnt.most_common(12):
    cid = next(x for x in D['characters'] if x['name'] == n)['id']
    print(f"   {n:<26} {c / 2000:5.2f}   compat {compat[cid]['own']['label']}")
for n in ['Jorren Vale', 'Damaris Holt', 'Sister Marra']:
    print(f"   {n:<26} {cnt.get(n, 0) / 2000:5.2f}")
turns = [t for o in outs for (t, _, _) in o[2]]
print("   defection turn histogram (turn 0 = before S2):", dict(sorted(collections.Counter(turns).items())))
