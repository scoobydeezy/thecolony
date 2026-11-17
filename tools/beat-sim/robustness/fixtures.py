"""
Synthetic live.json-shaped worlds for robustness testing (audit tool, not app code).

  python3 -I fixtures.py <outdir> <real live.json>

Writes <outdir>/<scenario>/live.json and <outdir>/<scenario>/scenario.json (question + Config overrides).
The real live.json supplies only `rules` (thresholds, belief axes, formulas) and the empirical
(pressure, conviction, impressionable) triples that synthetic NPCs are sampled from.
Compatibility labels are NOT computed here: run calib.ts on each live.json (run_all.sh does it).
"""
import json, os, random, sys, copy

AXES = 'abc'
# Twelve value archetypes (a, b, c) with belief stances. Faction i uses ARCH[i % 12].
ARCH = [
    ((0.00, 0.50, 0.50), ('negative', 'negative', 'neutral')),
    ((0.49, 0.11, 0.40), ('neutral', 'positive', 'negative')),
    ((0.44, 0.34, 0.22), ('neutral', 'negative', 'neutral')),
    ((0.12, 0.88, 0.00), ('negative', 'negative', 'positive')),
    ((0.27, 0.29, 0.44), ('neutral', 'positive', 'negative')),
    ((0.23, 0.00, 0.77), ('positive', 'positive', 'negative')),
    ((0.75, 0.25, 0.00), ('positive', 'negative', 'positive')),
    ((0.60, 0.00, 0.40), ('positive', 'positive', 'neutral')),
    ((0.10, 0.30, 0.60), ('negative', 'neutral', 'negative')),
    ((0.33, 0.33, 0.34), ('neutral', 'neutral', 'neutral')),
    ((0.00, 0.20, 0.80), ('negative', 'positive', 'negative')),
    ((0.80, 0.10, 0.10), ('positive', 'negative', 'positive')),
]
FLIP = {'positive': 'negative', 'negative': 'positive', 'neutral': 'positive'}
PRIOS = ['Critical', 'Major', 'Minor']

# Faction "levels" (named presets for channel inputs). Channel thresholds (68, 62, 45):
#   member influences -> char strength (avg*.6 + max*.4);  assets -> influence score;  baseLegitimacy -> Mandate
STRENGTH = {'hi': [92, 80, 75, 70, 66], 'mid': [80, 62, 55, 50, 45], 'lo': [50, 40, 30, 25, 20]}
# cs: hi 0.6*76.6+0.4*92 = 82.8 (People on); mid 0.6*58.4+32 = 67.0 (off, -1); lo 0.6*33+20 = 39.8 (off)
HOLD = {'hi': [('Operational', 5), ('Strategic', 4), ('Operational', 4), ('Operational', 3)],   # aI 68 (on)
        'mid': [('Operational', 4), ('Strategic', 3), ('Symbolic', 3), ('Covert', 2)],         # aI 42 (off)
        'lo': [('Symbolic', 3), ('Operational', 2), ('Mandate', 3), ('Symbolic', 2)]}          # aI 13 (off)
# Legitimacy = round(base*.7 + assetLeg*.3): hi base 80 -> ~66-72 (on); lo base 20 -> ~25-30 (off)
LEG = {'hi': 80, 'mid': 55, 'lo': 20}


def ai_score(assets):
    w = {'Operational': 1.0, 'Strategic': 1.25, 'Symbolic': .25, 'Covert': 1.0, 'Mandate': 0.0}
    return min(100, sum(w[r] * t for r, t in assets) / 25 * 100)


class World:
    def __init__(self, real, seed=1):
        self.rules = real['rules']; self.rng = random.Random(seed); self.vrng = random.Random(seed + 1000)   # values only: keeps pressure/conviction draws identical across compat modes
        self.triples = [(c['pressure'], c['conviction'], c['impressionable']) for c in real['characters']
                        if c['characterType'] == 'NPC' and c['state'] == 'Alive' and c['factionId']]
        self.factions, self.chars, self.assets, self.goals = [], [], [], []
        self.n = 0

    def uid(self, p):
        self.n += 1; return f'{p}{self.n:04d}'

    # ---------- builders ----------
    def faction(self, i, strength='mid', hold='mid', leg='mid', members=None, amc=0, compat='mixed',
                conv_shift=0, pres_shift=0, infl=None, assets=None):
        vals, bel = ARCH[i % len(ARCH)]
        fid = f'f{i:02d}'
        infl = list(infl if infl is not None else STRENGTH[strength])
        if members is not None:   # resample influences from the preset to the requested count (keeps the shape)
            base = STRENGTH[strength]; infl = [base[k % len(base)] - 3 * (k // len(base)) for k in range(members)]
        f = dict(id=fid, name=f'Faction {i}', type='Faction', active=True, momentum=0,
                 baseLegitimacy=LEG[leg] if isinstance(leg, str) else leg, powerModifier=0,
                 additionalMemberCount=amc, leaderId=None, values=dict(zip(AXES, vals)),
                 beliefa=bel[0], beliefb=bel[1], beliefc=bel[2])
        self.factions.append(f)
        ids = []
        for k, inf in enumerate(infl):
            p, cv, imp = self.rng.choice(self.triples)
            cid = self.uid('c')
            mode = compat(k) if callable(compat) else compat
            v, b = self.member_values(vals, bel, mode)
            self.chars.append(dict(id=cid, name=f'{fid}-m{k}', characterType='NPC', factionId=fid, socialClassId=None,
                                   state='Alive', pressure=max(0, min(100, p + pres_shift)),
                                   conviction=max(0, min(100, cv + conv_shift)), influence=max(0, min(100, inf)),
                                   impressionable=imp, doubtDirection='a', values=v, locationId=None,
                                   beliefa=b[0], beliefb=b[1], beliefc=b[2]))
            ids.append(cid)
        f['leaderId'] = ids[0] if ids else None      # strongest member leads
        for role, tier in (assets if assets is not None else HOLD[hold if isinstance(hold, str) else 'mid']):
            self.asset(fid, role, tier)
        return fid

    def member_values(self, fv, fb, mode):
        r = self.vrng
        if mode == 'aligned':
            return dict(zip(AXES, fv)), fb
        if mode == 'opposed':     # mass on the faction's weakest axes, explicit opposite beliefs
            inv = [1 - x for x in fv]; s = sum(inv); v = [x / s for x in inv]
            lo = min(range(3), key=lambda j: fv[j]); v = [0.15 * x for x in v]; v[lo] += 0.85
            return dict(zip(AXES, [round(x, 4) for x in v])), tuple(FLIP[x] for x in fb)
        # mixed: faction values blended with a random vector; beliefs derived by the app (None)
        w = [r.random() for _ in range(3)]; s = sum(w); w = [x / s for x in w]
        mix = r.uniform(0.3, 0.8)
        v = [mix * a + (1 - mix) * b for a, b in zip(fv, w)]
        return dict(zip(AXES, [round(x, 4) for x in v])), (None, None, None)

    def asset(self, fid, role, tier, keystone=False):
        aid = self.uid('a')
        self.assets.append(dict(id=aid, name=f'{fid}-{role}{tier}', type='Place', role=role, tier=tier, keystone=keystone,
                                status='Stable', controllingFactionId=fid, locationId=None, statusActorFactionId=None))
        return aid

    def goal(self, fid, kind, champ, prio, target=None, owner=None, state=None, adjud=False, status='Plotting'):
        g = dict(id=self.uid('g'), factionId=fid, title=f'{fid} {kind}', status=status, conditionType=kind, priority=prio,
                 visibility='Known', targetEntityType='Asset' if target else 'Faction', targetEntityId=target,
                 targetState=state, targetOwnerFactionId=owner, championId=champ, targetProperty=None,
                 targetOperator=None, targetThreshold=None)
        if adjud:
            g.update(targetEntityType='Faction', targetEntityId=None, targetProperty='influence', targetOperator='lte',
                     targetThreshold=35)
        self.goals.append(g); return g

    def standard_goals(self, achieve=3, maintain=1, adjud=1, progressing=1, rng_seed=7):
        """Per faction: `achieve` automatic Asset goals against other factions' assets (owner capture, every 3rd a
        Destroy), `adjud` Adjudicated goals, `maintain` Maintain assignments on own assets (champion != leader if possible).
        Target choice is round-robin so contention is balanced; `progressing` Achieve goals start Progressing."""
        r = random.Random(rng_seed)
        fids = [f['id'] for f in self.factions]
        mem = {f: [c['id'] for c in self.chars if c['factionId'] == f] for f in fids}
        own = {f: [a['id'] for a in self.assets if a['controllingFactionId'] == f] for f in fids}
        for i, f in enumerate(fids):
            if not mem[f]: continue
            others = [a for g in fids if g != f for a in own[g]]
            if not others: continue
            ch = mem[f]
            n = 0
            for k in range(achieve):
                t = others[(i * 7 + k * 5) % len(others)] if k < len(others) else r.choice(others)
                destroy = (k % 3 == 2)
                self.goal(f, 'Achieve', ch[(1 + n) % len(ch)], PRIOS[k % 3], target=t,
                          owner=None if destroy else f, state='Destroyed' if destroy else None,
                          status='Progressing' if k < progressing else 'Plotting'); n += 1
            for k in range(adjud):
                self.goal(f, 'Achieve', ch[(1 + n) % len(ch)], 'Minor', adjud=True); n += 1
            for k in range(min(maintain, len(own[f]))):
                self.goal(f, 'Maintain', ch[(1 + n) % len(ch)], 'Major', target=own[f][k], state='Stable',
                          status='Progressing'); n += 1
        for f in fids:      # one keystone per faction (its first asset)
            if own[f]:
                next(a for a in self.assets if a['id'] == own[f][0])['keystone'] = True

    def dump(self):
        return dict(factions=self.factions, characters=self.chars, assets=self.assets, goals=self.goals,
                    locations=[], sessions=[], rules=self.rules, colonyState=dict(colonyStress=0))


# ---------------------------------------------------------------- scenarios
def mixed_levels(i):
    """Default spread so a 'base' world has Power 1/2/3 mix like the live campaign (3,1,3,3,3,2,2)."""
    P = [('hi', 'hi', 'lo'), ('lo', 'lo', 'lo'), ('hi', 'hi', 'hi'), ('hi', 'lo', 'hi'),
         ('hi', 'lo', 'hi'), ('mid', 'hi', 'lo'), ('mid', 'mid', 'hi')]
    return P[i % len(P)]


def build(real, name, n_f=7, goals_x=1.0, members=None, levels=mixed_levels, compat='mixed', conv=0, pres=0,
          extra=None, seed=1, **fk):
    W = World(real, seed)
    for i in range(n_f):
        s, h, l = levels(i)
        W.faction(i, s, h, l, members=members, compat=compat, conv_shift=conv, pres_shift=pres, **fk)
    # goals/faction (Achieve auto + Achieve adjudicated + Maintain): 0.5x 2+0+1, 1x 3+1+1, 2x 6+2+2, 4x 12+4+4
    a, ad, ma, pr = {0.5: (2, 0, 1, 1), 1.0: (3, 1, 1, 1), 2.0: (6, 2, 2, 2), 4.0: (12, 4, 4, 4)}[goals_x]
    W.standard_goals(achieve=a, maintain=ma, adjud=ad, progressing=pr)
    if extra: extra(W)
    return W


def scenarios(real):
    S = {}
    def add(name, question, W, cfg=None, group='scenario'):
        S[name] = (W.dump(), dict(question=question, cfg=cfg or {}, group=group))

    add('base', 'Reference synthetic world: 7 factions, live-like Power mix, 5 NPCs each, 5 goals each.', build(real, 'base'))
    add('equal', 'Equal factions: identical inputs -> identical slots, symmetric advances?',
        build(real, 'equal', levels=lambda i: ('hi', 'mid', 'lo')))
    add('dominant', 'One dominant faction (Power 3, Momentum +2) vs six Power-1 factions: share of the board?',
        build(real, 'dominant', levels=lambda i: ('hi', 'hi', 'hi') if i == 0 else ('lo', 'lo', 'lo')),
        cfg=dict(start_tiers={'f00': 2}))
    add('weakened', 'All factions weakened (Power 1, Momentum -1): does the board still move?',
        build(real, 'weakened', levels=lambda i: ('lo', 'lo', 'lo')), cfg=dict(start_tiers={f'f{i:02d}': -1 for i in range(7)}))
    add('high_power', 'Five Power-3 factions compete with two Power-1 factions: crowding of the weak?',
        build(real, 'high_power', levels=lambda i: ('hi', 'hi', 'hi') if i < 5 else ('lo', 'lo', 'lo')))

    def covert(W):   # small covert faction: 3 strong members, all Covert assets, low legitimacy
        i = len(W.factions)
        W.faction(i, infl=[95, 90, 85], assets=[('Covert', 5), ('Covert', 5), ('Covert', 4), ('Covert', 4)], leg=10)
        f = W.factions[-1]['id']; mem = [c['id'] for c in W.chars if c['factionId'] == f]
        tg = [a['id'] for a in W.assets if a['controllingFactionId'] != f][:3]
        for k, t in enumerate(tg): W.goal(f, 'Achieve', mem[(k + 1) % 3], PRIOS[k], target=t, owner=f)
    add('covert', 'Small covert faction (3 strong members, all Covert assets, legitimacy 10): People+Holdings, no Mandate -> Power 3?',
        build(real, 'covert', n_f=6, extra=covert))

    def mass(W):   # large low-competence faction
        i = len(W.factions)
        W.faction(i, infl=[30, 25, 20, 20, 15, 10], amc=30, hold='mid', leg='lo')
        f = W.factions[-1]['id']; mem = [c['id'] for c in W.chars if c['factionId'] == f]
        tg = [a['id'] for a in W.assets if a['controllingFactionId'] != f][::5][:3]
        for k, t in enumerate(tg): W.goal(f, 'Achieve', mem[(k + 1) % len(mem)], PRIOS[k], target=t, owner=f)
    add('mass', 'Large low-competence faction (6 weak named + 30 unrepresented): People via headcount only (N=12 vs none)',
        build(real, 'mass', n_f=6, extra=mass))

    def leaderless(W):
        f = W.factions[0]; lid = f['leaderId']
        next(c for c in W.chars if c['id'] == lid)['state'] = 'Dead'
    add('leader_loss', 'Faction f00 (Power 3 via exactly 3 channels) loses its leader before play: strength x0.75, -1 signal at first Opening',
        build(real, 'leader_loss', extra=leaderless), cfg=dict(start_signals={'f00': [-1]}))

    def contested(W):
        fids = [f['id'] for f in W.factions]
        hot = [next(a['id'] for a in W.assets if a['controllingFactionId'] == fids[k]) for k in (0, 2, 3)]
        for j, t in enumerate(hot):
            owner = next(a['controllingFactionId'] for a in W.assets if a['id'] == t)
            atk = [f for f in fids if f != owner][j:j + 4]
            for k, f in enumerate(atk):
                mem = [c['id'] for c in W.chars if c['factionId'] == f]
                W.goal(f, 'Achieve', mem[(k + 2) % len(mem)], 'Critical', target=t, owner=f)
            mem = [c['id'] for c in W.chars if c['factionId'] == owner]
            W.goal(owner, 'Maintain', mem[-1], 'Critical', target=t, state='Stable', status='Progressing')
    add('contested', 'Three keystones each targeted by 4 factions (Critical) + Maintain defenders: collisions, obsolescence?',
        build(real, 'contested', extra=contested))
    add('high_conv', 'High-Conviction cast (+30): Character Beat quiet?', build(real, 'high_conv', conv=30))
    add('low_conv', 'Low-Conviction cast (-30): Character Beat saturates?', build(real, 'low_conv', conv=-30))
    add('incompatible', 'Members opposed to their faction (values inverted, beliefs flipped): labels Strained..Hostile, defections up?',
        build(real, 'incompatible', compat='opposed'))
    add('aligned', 'Members identical to faction values+beliefs: labels Aligned/Cooperative, defections down?',
        build(real, 'aligned', compat='aligned'))
    add('mixed_inst', 'Mixed instability at start (30% Conflicted, 10% Compromised): first Opening crisis wave?',
        build(real, 'mixed_inst'), cfg=dict(start_inst='__mixed__'))
    # ---- scaling ----
    for x, m in [('0.3x', 2), ('3x', 15), ('6x', 30)]:
        add(f'npc_{x}', f'Character pool {x} ({m} NPCs/faction); Power held at base values via power_override',
            build(real, f'npc_{x}', members=m), cfg=dict(power_override='__base__'), group='scale_npc')
    for x in [0.5, 2.0, 4.0]:
        add(f'goals_{x}x', f'Goal count {x}x', build(real, f'goals_{x}x', goals_x=x), group='scale_goals')
    for n in [3, 12]:
        add(f'factions_{n}', f'{n} factions (base is 7)', build(real, f'factions_{n}', n_f=n), group='scale_factions')
    return S


def resolve_cfg(meta, D, base_power=None):
    """Turn scenario.json placeholders into concrete Config overrides."""
    cfg = dict(meta['cfg'])
    if cfg.get('start_inst') == '__mixed__':
        r = random.Random(11); si = {}
        for c in D['characters']:
            if c['characterType'] == 'NPC' and c['factionId']:
                u = r.random(); si[c['id']] = 2 if u < .10 else 1 if u < .40 else 0
        cfg['start_inst'] = si
    if cfg.get('power_override') == '__base__':
        cfg['power_override'] = base_power
    if 'start_tiers' in cfg: cfg['start_tiers'] = dict(cfg['start_tiers'])
    return cfg


if __name__ == '__main__':
    out, real_path = sys.argv[1], sys.argv[2]
    real = json.load(open(real_path))
    for name, (D, meta) in scenarios(real).items():
        d = os.path.join(out, name); os.makedirs(d, exist_ok=True)
        json.dump(D, open(os.path.join(d, 'live.json'), 'w'), indent=1)
        json.dump(meta, open(os.path.join(d, 'scenario.json'), 'w'), indent=1)
        print(f"{name:<14} factions {len(D['factions']):>2}  NPCs {len(D['characters']):>3}  assets {len(D['assets']):>3}  goals {len(D['goals']):>3}")
