"""2026-10-17 audit rulings (BOARD-GAME-REVIEW §18.6): Power 0-3 (no minimum), a Faction Phase in every Act, Earliest Act,
narrative-only Auto-Resolve, Ready to Resolve as a GM task (no unattended outcome), Defection Checks in the Character Phase.
Mechanical validation, not balancing: the roster is unbalanced on purpose and no constant is tuned to an outcome.
Usage: python3 -I experiments12.py <real workdir (live.json + calib.json)> <synthetic dir> [runs]"""
import sys, os, dataclasses, statistics as st, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from colony_sim import Config, load, batch, ACT_OF_TURN

REAL, SYN = sys.argv[1], sys.argv[2]
RUNS = int(sys.argv[3]) if len(sys.argv) > 3 else 1000
GM_TIERS = {'keepers': 1, 'seekers': 2, 'shattered': -1}
READING = ('Complete the Ritual', 'Stop the Ritual', 'Take out the Keeper')   # the Session 4 Reading and its rivals
ACTS = {1: [t for t, a in enumerate(ACT_OF_TURN) if a == 1], 2: [t for t, a in enumerate(ACT_OF_TURN) if a == 2],
        3: [t for t, a in enumerate(ACT_OF_TURN) if a == 3]}

# The app today: thresholds from the campaign's formulas (People = top-three average 73 -> top-three sum 219; Holdings 62;
# Mandate 45; headcount 12); allocation by Priority tokens; target 9; critical-dice Momentum, cap 1; Character Phase as built.
# §18.7 Power: stars and members (was: score channels (73, 62, 45), top-three influence, headcount 12)
NEW = Config(power='stars', power_base=0, power_min=0, faction_beat_turns=tuple(range(11)), earliest='data', use_outcome_mode=True,
             rev3_order=True, checks_in_cp=True, delayed_check=True, ready_to_resolve=True, rtr_collide=False, unattended_turns=None,
             detector=True, draws_by_stress=True, stress_k=5, settle=True, per_faction=True, conflicted_first=False,
             failed_check_to=1, recovery_exempt=True, reaffirmation=True, fp_mode='alloc', fb_target=9, mom_model='crit',
             ops_keystone='none', mom_cap=1, start_tiers={f: 0 for f in ['aspis', 'cult', 'institute', 'keepers', 'seekers', 'shattered', 'witnesses']} | GM_TIERS)
R = lambda base=NEW, **kw: dataclasses.replace(base, **kw)
LEGACY = R(power='channels', people_metric='top3', people_top3_t=219, channels=(73, 62, 45), headcount_n=12,
           power_base=1, power_min=1, faction_beat_turns=None, earliest=None)   # 1 + score channels, Acts II-III only, no Act gate
SCORES = R(power='channels', people_metric='top3', people_top3_t=219, channels=(73, 62, 45), headcount_n=12)   # §18.6 scores, 0-3

def mean(xs): return st.mean(xs) if xs else 0.0

def metrics(outs, D, cfg):
    logs = [o[1]['log'] for o in outs]; facs = [f['id'] for f in D['factions'] if f['type'] == 'Faction' and f['active']]
    achieve = [g for g in D['goals'] if g['conditionType'] == 'Achieve' and g['status'] in ('Plotting', 'Progressing')]
    pw = collections.Counter(); mv = n = at2 = 0
    for L in logs:
        for f in facs:
            ser = [L.get(f'mod_{f}_t{t}', 0) for t in range(11) if f'mod_{f}_t{t}' in L]
            for t in range(11):
                if f'pow_{f}_t{t}' in L: pw[L[f'pow_{f}_t{t}']] += 1
            n += max(0, len(ser) - 1); mv += sum(ser[i + 1] != ser[i] for i in range(len(ser) - 1))
            at2 += bool(ser) and abs(ser[-1]) == 2
    per_act = lambda key: {a: mean([sum(L.get(f'{key}_t{t}', 0) for t in ts) / len(ts) for L in logs]) for a, ts in ACTS.items()}
    reading_act1 = mean([sum(L.get(f'act1_adv_{t}', 0) for t in READING) for L in logs])
    act1_any = mean([sum(v for k, v in L.items() if k.startswith('act1_adv_')) for L in logs])
    pwt = sum(pw.values()) or 1
    return dict(
        power={k: round(100 * v / pwt) for k, v in sorted(pw.items())},
        att=per_act('att'), dev=per_act('dev'), ready=per_act('ready'),
        acc=mean([L.get('accomplished', 0) for L in logs]), narrative=mean([L.get('narrative_auto', 0) for L in logs]),
        tasks=mean([L.get('ready_created', 0) for L in logs]),
        exhausted=round(100 * mean([L.get('accomplished', 0) for L in logs]) / max(1, len(achieve))),
        idle=round(100 * mean([sum(L.get(f'exh_{f}_t{t}', 0) for f in facs for t in range(11)) / (len(facs) * 11) for L in logs])),
        mom_move=round(100 * mv / max(1, n)), mom_at2=round(100 * at2 / max(1, len(logs) * len(facs))),
        crises=mean([L.get('sessions_with_crisis', 0) for L in logs]), defect=mean([o[1]['defected'] for o in outs]),
        reading_act1=reading_act1, act1_dev=act1_any)

def show(name, m):
    a = lambda d: ' / '.join(f'{d[k]:.1f}' for k in (1, 2, 3))
    print(f"\n{name}\n  Power share 0/1/2/3 (faction-turns): {m['power']}"
          f"\n  Power spent per turn, Act I / II / III: {a(m['att'])}    developments per turn: {a(m['dev'])}    new GM tasks per turn: {a(m['ready'])}"
          f"\n  goals Accomplished by the end {m['acc']:.1f} ({m['exhausted']}% of open Achieve goals; {m['narrative']:.1f} narrative-only)"
          f" · GM resolution tasks raised {m['tasks']:.1f} · factions idle (no operation) {m['idle']}% of faction-turns"
          f"\n  Momentum: changes on {m['mom_move']}% of turn boundaries; at ±2 at the end {m['mom_at2']}%"
          f"    Character: sessions with a crisis {m['crises']:.1f}, defections {m['defect']:.1f}"
          f"\n  Act I: developments {m['act1_dev']:.2f}, of which the Reading's goals (Ritual, Keeper) {m['reading_act1']:.2f}")

def run(D, C, cfg, seed0=0): return metrics(batch(D, C, cfg, RUNS, seed0), D, cfg)

D0, C0 = load(REAL)
titles = {g['title'] for g in D0['goals']}
EXAMPLES = {'Abide': 1, 'Audit the Offering Chest': 2}   # the brief's examples present in the data (no EGRESS Hall goal exists yet)
ALL1 = {t: 1 for t in titles}
print(f'real campaign: {RUNS} runs each; Colony Turns before Sessions 2-12 (Acts {ACT_OF_TURN})')
for name, cfg in [('LEGACY reference: 1 + channels (cap 3), Faction Phase Acts II-III only', LEGACY),
                  ('§18.6 scores (0-3, every Act; superseded by §18.7 stars)', SCORES),
                  ('NEW, Earliest Act II for every goal (the migration default)', NEW),
                  ('NEW + the brief\'s example assignments (Abide: Act I)', R(earliest_act=EXAMPLES)),
                  ('NEW, every goal from Act I (upper bound on Act I activity)', R(earliest_act=ALL1)),
                  ('NEW, Act II default, GM accepts every Ready goal during the Turn', R(accept_ready=True))]:
    show(name, run(D0, C0, cfg))

print('\n== synthetic worlds (NEW rules; goals default to Act II, and to Act I in the second line) ==')
for w in ['base', 'equal', 'contested', 'weakened', 'high_power', 'dominant', 'factions_12', 'goals_0.5x', 'goals_2.0x']:
    p = os.path.join(SYN, w)
    if not os.path.isdir(p): continue
    D, C = load(p)
    facs = [f['id'] for f in D['factions'] if f['type'] == 'Faction']
    for ea in (2, 1):
        m = run(D, C, R(start_tiers={f: 0 for f in facs}, earliest_default=ea), seed0=10_000)
        print(f"  {w:12} EA{ea}  Power {m['power']}  spent/turn {m['att'][1]:.1f}/{m['att'][2]:.1f}/{m['att'][3]:.1f}"
              f"  dev/turn {m['dev'][1]:.1f}/{m['dev'][2]:.1f}/{m['dev'][3]:.1f}  acc {m['acc']:.1f} ({m['exhausted']}%)"
              f"  idle {m['idle']}%  mom moves {m['mom_move']}% ±2 {m['mom_at2']}%  tasks {m['tasks']:.1f}")
