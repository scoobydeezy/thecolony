"""Shared helpers for the robustness suite: Rev 3 config, world loading, batch metrics."""
import os, sys, json, dataclasses, statistics as st, random
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE)); sys.path.insert(0, HERE)
from colony_sim import Config, Colony, load, batch          # noqa: E402
from fixtures import resolve_cfg                              # noqa: E402

REAL_TIERS = {f: 0 for f in ['aspis', 'cult', 'institute', 'keepers', 'seekers', 'shattered', 'witnesses']} | {'keepers': -2}
REV3 = Config(power='channels', channels=(68, 62, 45), rev3_order=True, delayed_check=True, ready_to_resolve=True,
              draws_by_stress=True, stress_k=5, settle=True)


def rev3(**kw): return dataclasses.replace(REV3, **kw)


def world(path):
    """-> (D, compat, meta). meta is {} for the real fixture."""
    D, compat = load(path)
    mp = os.path.join(path, 'scenario.json')
    meta = json.load(open(mp)) if os.path.exists(mp) else {}
    return D, compat, meta


def base_power(syn_dir):
    D, compat, _ = world(os.path.join(syn_dir, 'base'))
    c = Colony(D, compat, REV3, random.Random(0))
    return {f: c.slots(f) for f in c.F}


def scenario_cfg(D, meta, syn_dir, **kw):
    over = resolve_cfg(meta, D, base_power(syn_dir) if meta.get('cfg', {}).get('power_override') == '__base__' else None) if meta else {}
    if not meta: over['start_tiers'] = dict(REAL_TIERS)
    over.update(kw)
    return rev3(**over)


def metrics(outs, D, cfg):
    """Campaign + per-entity metrics over a batch (final snapshot of each run)."""
    L = [o[1]['log'] for o in outs]; n = len(outs)
    g = lambda k: sum(l.get(k, 0) for l in L)
    m = lambda k: g(k) / n
    F = sorted(f['id'] for f in D['factions'] if f['type'] == 'Faction')
    npcs = sum(1 for c in D['characters'] if c['characterType'] == 'NPC' and c['state'] == 'Alive' and c['factionId'])
    d = [o[1]['defected'] for o in outs]
    beats = g('fb_beats') or 1
    out = dict(
        runs=n, npcs=npcs, factions=len(F),
        adv=m('advances'), adv_beat=g('advances') / beats, acc=m('accomplished'), ready=m('ready_created'),
        collisions=m('collisions'), obsoleted=m('obsoleted'),
        pool_beat=g('fb_pool') / beats, elig_beat=g('fb_eligible') / beats, drawn_beat=g('fb_attempts') / beats,
        board_full=g('fb_saturated') / beats,                        # share of Beats where nominated pool > slots
        p_goal_drawn=g('fb_attempts') / (g('fb_eligible') or 1),     # P(a given eligible goal is drawn in a Beat)
        p_nom_drawn=g('fb_attempts') / (g('fb_pool') or 1),          # P(a nominated card is drawn)
        comp=m('compromised_entries'), crisis=m('sessions_with_crisis'), defect=st.mean(d),
        p0=sum(x == 0 for x in d) / n, p4=sum(x >= 4 for x in d) / n,
        def10=st.mean(d) / npcs * 10 if npcs else 0,
        cb_pool=g('cb_pool') / (g('cb_beats') or 1), p_char_drawn=g('cb_drawn') / (g('cb_pool') or 1),
        settled=m('settled'), failed_checks=m('defection_failed'),
        slots={f: g(f'slots_{f}') / beats for f in F}, fadv={f: g(f'adv_{f}') / n for f in F},
        facc={f: g(f'acc_{f}') / n for f in F}, fdrawn={f: g(f'drawn_{f}') / n for f in F},
        fnom={f: g(f'nom_{f}') / beats for f in F},
        slot_hist={k: g(f'slotv_{k}') / (beats * len(F)) for k in (1, 2, 3)},
    )
    return out


def run(D, compat, cfg, runs, seed0=0):
    return metrics(batch(D, compat, cfg, runs, seed0), D, cfg)


HDR = "adv  acc  ready coll | pool/b drawn/b full | comp crisis defect P0   P>=4 def/10 | cbpool P(chr)"
def row(r):
    return (f"{r['adv']:4.1f} {r['acc']:4.2f} {r['ready']:4.2f} {r['collisions']:4.2f} | {r['pool_beat']:5.1f} {r['drawn_beat']:5.2f} "
            f"{r['board_full']:4.2f} | {r['comp']:4.2f} {r['crisis']:5.2f} {r['defect']:5.2f} {r['p0']:4.2f} {r['p4']:4.2f} "
            f"{r['def10']:5.2f} | {r['cb_pool']:5.1f} {r['p_char_drawn']:5.2f}")
