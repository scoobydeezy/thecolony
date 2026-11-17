"""
Colony Turn simulator (audit/calibration only; not app code). Implements the revised design
from the 2026-10-14 decision response:

  Colony Turn (between sessions)
    Act I        : Character Beat
    Acts II, III : Faction Beat (5 slots, frozen inputs) -> commit (capped Momentum aggregation)
                   -> recompute derived Pressure/Drift -> Character Beat (3 slots)

Every unsettled value is a parameter in Config. Inputs: live.json (export.py) and calib.json (calib.ts),
the latter supplying character->faction compatibility labels computed by the app's own scoreRelationship.
"""
import json, random, sys, statistics, collections, math
from dataclasses import dataclass, field

ROLE_W = {'Operational': (1.0, 1.0), 'Strategic': (1.25, .25), 'Symbolic': (.25, 1.25), 'Covert': (1.0, 0.0), 'Mandate': (0.0, 1.0)}
STATUS_M = {'Stable': 1.0, 'Contested': .5, 'Damaged': .25, 'Destroyed': 0.0}
PRIO = {'Critical': 0, 'Major': 1, 'Minor': 2}
LABEL_MOD = {'Aligned': -3, 'Cooperative': -2, 'Friendly': -1, 'Tolerated': 0, 'Strained': 1, 'Opposed': 2, 'Hostile': 3}
BAND_MOD = {'Strained': -1, 'Wavering': 0, 'Breaking': 1}          # Steady = ineligible
STRESS = {
    'calm':   [1, 1, 2, 2, 2, 3, 3, 3, 3, 2, 2],
    'arc':    [1, 2, 3, 3, 4, 4, 5, 7, 8, 7, 5],   # Totality spike at S9, partial recovery
    'rising': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10],
}
# Colony Turn t (0..10) prepares Session t+2. Faction Beats before S5..S8 (Act II) and S9..S12 (Act III).
ACT_OF_TURN = [1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3]


@dataclass
class Config:
    power: str = 'pub'            # 'mult' (current form) | 'pub' (legitimacy weighted by public holdings) | 'channels'
    bands: tuple = (50, 70)       # Power score -> slots: <b0 =1, <b1 =2, else 3
    stress_k: float = 5           # effective pressure = pressure + stress*k
    stress: str = 'arc'
    char_slots: int = 3
    drift_target: int = 8
    defect_target: int = 8
    settle: bool = True           # unstable + Steady => retreat one state automatically at each Character Beat
    pressure_rules: bool = True   # losses of Assets add Pressure (explicit consequence rule, hypothesis)
    faction_beats_act3: bool = True
    turns: int = 11
    outcome_auto_char: bool = False   # character-target goals are Adjudicated (never auto-mutate)
    tickets: bool = False         # draw weight by drift band (Strained 1, Wavering 2, Breaking 3 cards)
    band_mods: bool = True        # Drift Roll modifier by band
    delayed_check: bool = False   # Compromised persists; Defection Check is automatic at the NEXT Character Beat
    loss_pressure: int = 5        # Pressure added to members of a faction that loses an Asset (Maintain champion gets 2x)
    tier_round: str = 'round'     # cutover: 'round' or 'trunc' (toward zero) of raw/25
    draws_by_stress: bool = False # Character Beat draws = 2 + stress//3 (stress 0-2:2, 3-5:3, 6-8:4, 9-10:5)
    threat_pressure: int = 0      # Pressure on a defending champion when an operation against their target advances
    channels: tuple = (70, 60, 55)  # People, Holdings, Mandate thresholds
    rev3_order: bool = False      # Colony Turn = [pending Defection Checks] -> [Momentum Resolution] -> Faction Beat -> Character Beat
    ready_to_resolve: bool = False  # Adjudicated success from Progressing -> stays Progressing + Ready overlay (no signal, out of pool)
    start_tiers: dict = None      # explicit GM-set starting Momentum tiers (overrides legacy rounding)
    # ---- robustness hooks (defaults reproduce the behavior above exactly) ----
    headcount_n: int = None       # channels: People also qualifies at (alive named members + additionalMemberCount) >= N (§4.3)
    n_slots: int = 5              # Faction Beat board size
    faction_beat_turns: tuple = None  # explicit Colony Turn indices with a Faction Beat (overrides act logic)
    fixed_stress: float = None    # constant Colony Stress for every turn (overrides `stress` profile)
    fb_target: int = 8            # Faction Beat roll target
    label_scale: float = 1.0      # multiplier on the Defection Check label modifier
    power_override: dict = None   # factionId -> Power (bypasses channel derivation)
    start_inst: dict = None       # characterId -> starting instability 0 Stable / 1 Conflicted / 2 Compromised
    start_signals: dict = None    # factionId -> list of signs pending at the first Opening (e.g. leader lost before play)
    draw_scale: float = None      # exploratory: Character Beat draws multiplied by this factor (rounded, min 1)
    rtr_collide: bool = True      # legacy: Ready-to-Resolve outcomes enter collisions. False = §6.4 (only Automatic completions collide)
    trace: bool = False           # per-character counters: up_<id> (Drift Roll advances), cmp_<id> (Compromised entries)
    # ---- Revision 4 candidates (defaults reproduce the behavior above exactly) ----
    people_metric: str = 'avgmax' # 'top3': People = sum of the 3 highest living member influences (monotone; no leaderless multiplier)
    people_top3_t: int = 220      # threshold for people_metric='top3'
    draw_rule: str = None         # None: draws_by_stress/char_slots. 'pool': ceil(pool/draw_per). 'pool_stress': ceil(pool*(0.10+0.025*stress))
    draw_per: int = 4
    crisis_cap: int = None        # max NEW Compromised per Character Beat; further successes stay Conflicted
    unattended_turns: int = None  # Ready to Resolve goals resolve as declared at the Opening this many turns after becoming Ready
    detector: bool = False        # goals whose target is already true (and not credited) are Satisfied: out of the pool, no signal
    turn_hook: object = None      # callable(colony, turn) run at the start of each turn, before the Opening
    # ---- Revision 5 candidates (defaults reproduce the behavior above exactly) ----
    draw_cap: int = None          # maximum Character Beat draws for any draw_rule (bounded GM footprint)
    cb_nominate: int = None       # Character Beat mirrors the Faction Beat: each faction nominates its N highest-drift
                                  # eligible members; then draw n_draws(stress) from the nominees
    cb_tiers: tuple = None        # only characters whose narrativeTier is in this tuple are eligible (named-cast filter)
    crisis_queue: bool = False    # with crisis_cap: a capped success still advances, entering Compromised at the next Beat
    per_faction: bool = False     # Character Phase: each faction's most at-risk eligible member always rolls (no draw)
    conflicted_first: bool = True # per_faction: Conflicted members outrank Stable ones; within a class, highest drift
    failed_check_to: int = 1      # instability after a failed Defection Check: 1 Conflicted (decided) or 0 Stable
    recommit_rest: bool = False   # per_faction: a member who failed a Defection Check is not nominated in that faction's next Character Phase
    recovery_exempt: bool = False # Conflicted -> Stable (failed roll, Settling) exempts the character from the NEXT Character Phase
    reaffirmation: bool = False   # a character who reached Compromised and later returns to Stable without defecting is
                                  # permanently excluded from nomination for that faction (Reaffirmed)
    # ---- 2026-10-15 candidate: Power as a per-Turn allocation budget (defaults reproduce the behavior above exactly) ----
    fp_mode: str = 'draw5'        # 'draw5': nominate by Power, draw n_slots. 'alloc': each faction draws Power-many tokens from a
                                  # pool of its eligible goals' priority tokens; a goal rolls up to its allocation, stops at its
                                  # first success, and advances at most once per Turn. No Colony-wide draw.
    alloc_tokens: tuple = (3, 2, 1)   # tokens per goal (= its attempt cap) for Critical, Major, Minor
    # ---- 2026-10-15 Momentum candidates (alloc only; default 'signals' = the M3 capped-signal tier) ----
    mom_cap: int = 1              # signals/crit: |net change| per Opening (the decided cap is 1)
    ops_keystone: str = 'loss'    # crit: Keystone lost to an OPERATION -> 'loss' (owner -1, as before), 'none' (operations move
                                  # Momentum only through criticals), 'transfer' (owner -1 and the acting faction +1, same root)
    crit_band: int = 0            # crit: 0 = natural 12 / 2 only; 1 = also natural 11 / 3 (diagnostic)
    mom_model: str = 'signals'    # 'crit' (2026-10-15 proposal): persistent tier; natural 12 -> +1 signal (always succeeds),
                                  # natural 2 -> -1 signal (always fails); operation and unattended accomplishments send no signal.
                                  # 'rank' (A: normalized efficiency leaderboard -> tier), 'track' (B: priority-weighted
                                  # score -9..+9 replaced each Faction Phase), 'track_norm' (B / allocated Power, x3 to the same scale)
    mom_map: tuple = (3, 6)       # track -> modifier: |track| >= m[0] -> 1, >= m[1] -> 2 (sign kept). (99, 99) = never
    mom_fail_a: tuple = (1.0, 0.6, 0.3)   # candidate A failure penalty per Critical, Major, Minor attempt
    event_points: int = 3         # track models: one material event (deduplicated root) = this many track points
    # ---- 2026-10-17 audit (§18.6); defaults reproduce every earlier report ----
    power_base: int = 1           # channels: Power = power_base + qualifying channels (0 = the corrected formula)
    power_min: int = 1            # channels: floor on Power (0 = no guaranteed minimum)
    earliest: str = None          # None: no Act gate. 'data': each goal's earliestAct (fallback earliest_default)
    earliest_default: int = 2     # Earliest Act when a goal has none (synthetic worlds)
    earliest_act: dict = None     # title -> Earliest Act overrides (scenario assignments)
    use_outcome_mode: bool = False  # Auto-Resolve from the goal's outcomeMode; Automatic without a structured target = narrative
    accept_ready: bool = False    # the GM accepts every Ready to Resolve goal during the Turn (resolves as Auto-Resolve)
    checks_in_cp: bool = False    # rev3_order: Defection Checks at the Character Phase (after operations, §18.4), not the Opening
    star_thresholds: tuple = (10, 15, 5)   # power='stars' (§18.7): People, Holdings, Mandate points
    event_cap: int = 3            # track models: |net event points| per Opening is capped here (rank: events are +/-1 tier, capped 1)
    start_track: dict = None      # factionId -> starting track (track models); default derives from the starting tier
    mom_fail_w: float = 1.0       # track models: a failed attempt scores -w * this (1.0 = the brief's symmetric scoring)
    mom_center: bool = False      # track models: score each attempt 2 * w * (outcome - its success chance at the frozen modifier)
                                  # (performance against expectation; spares count as successes)
    mom_center_spares: bool = True   # centered: spares score like successes (True) or neutrally (False)
    mom_smooth: float = 0.0       # track models: new track = round(smooth * previous + (1 - smooth) * this Turn's score)
    wildcard: str = None          # Faction Beat nomination: 'colony' = +1 card drawn uniformly from all eligible-but-unnominated
                                  # goals; 'faction' = each faction's last slot (Power >= 2) is uniform over its remaining goals


def load(base):
    D = json.load(open(base + '/live.json')); C = json.load(open(base + '/calib.json'))
    return D, {c['id']: c for c in C['compat']}


class Colony:
    def __init__(self, D, compat, cfg, rng):
        self.cfg, self.rng = cfg, rng
        self.F = {f['id']: dict(f) for f in D['factions'] if f['type'] == 'Faction'}
        raw = {f: self.F[f]['momentum'] for f in self.F}
        self.tier = {f: max(-2, min(2, (round(raw[f] / 25) if cfg.tier_round == 'round' else int(raw[f] / 25)))) for f in self.F}     # PROVISIONAL cutover suggestion
        if cfg.start_tiers: self.tier.update(cfg.start_tiers)
        self.prev_slots = None
        lo, hi = cfg.mom_map                                       # GM-set starting tier -> a track value inside its band
        b1 = lo if lo < 99 else 1; b2 = (min(hi, 9) + 9 + 1) // 2 if hi < 99 else b1
        TIER_TRACK = {-2: -int(b2), -1: -int(round(b1 + .49)), 0: 0, 1: int(round(b1 + .49)), 2: int(b2)}
        self.track = {f: (cfg.start_track or {}).get(f, TIER_TRACK[self.tier[f]]) for f in self.F}
        self.fp_score = None                                     # last Faction Phase's per-faction score (track/rank models)
        if cfg.mom_model in ('track', 'track_norm'): self.tier = {f: self.mom_mod(self.track[f]) for f in self.F}
        self.ch = {c['id']: dict(c, inst=0, defected=False) for c in D['characters']}
        if cfg.start_inst:
            for cid, v in cfg.start_inst.items():
                if cid in self.ch: self.ch[cid]['inst'] = v
        self.assets = {a['id']: dict(a) for a in D['assets']}
        self.goals = {g['id']: dict(g, obsolete=False, pending=False) for g in D['goals']}
        self.compat = compat
        self.log = collections.Counter(); self.events = []
        self.pending = collections.defaultdict(list)       # factionId -> [(root, sign, why)]
        for f, signs in (cfg.start_signals or {}).items():
            for i, sg in enumerate(signs): self.pending[f].append((('start', f, i), sg, 'pre-campaign'))

    # ---------- derived ----------
    def mom_mod(self, track):
        a, b = self.cfg.mom_map; m = 2 if abs(track) >= b else 1 if abs(track) >= a else 0
        return m if track > 0 else -m

    def capable(self, cid): return cid is not None and self.ch.get(cid, {}).get('state') == 'Alive'
    def members(self, f): return [c for c in self.ch.values() if c['factionId'] == f and c['state'] == 'Alive']

    def power_score(self, f):
        if self.cfg.power_override and f in self.cfg.power_override: return self.cfg.power_override[f]
        if self.cfg.power == 'stars':   # §18.8: People = leader 5 + ⌊Faction Size/20⌋ ≥ 10; Holdings/Mandate = Asset stars ≥ 15 / 5
            fac = self.F[f]; mem = self.members(f)
            lead = 5 if any(c['id'] == fac['leaderId'] for c in mem) else 0
            people = lead + (fac.get('factionSize') or 0) // 20   # §18.8: named characters add nothing
            own = [a for a in self.assets.values() if a['controllingFactionId'] == f and a['status'] != 'Destroyed']
            hold = sum(a['tier'] for a in own if a['role'] in ('Operational', 'Strategic', 'Covert'))
            mand = sum(a['tier'] for a in own if a['role'] in ('Symbolic', 'Mandate'))
            pp, hp, mp = self.cfg.star_thresholds
            return (people >= pp) + (hold >= hp) + (mand >= mp)
        fac = self.F[f]; mem = self.members(f)
        if not mem: return 0
        avg = sum(c['influence'] for c in mem) / len(mem); mx = max(c['influence'] for c in mem)
        leader_ok = any(c['id'] == fac['leaderId'] for c in mem)
        cs = (avg * .6 + mx * .4) * (1 if leader_ok else .75)
        own = [a for a in self.assets.values() if a['controllingFactionId'] == f]
        aI = min(100, sum(ROLE_W[a['role']][0] * a['tier'] * STATUS_M[a['status']] for a in own) / 25 * 100)
        aL = min(100, sum(ROLE_W[a['role']][1] * a['tier'] * STATUS_M[a['status']] for a in own) / 25 * 100)
        leg = max(0, min(100, round(fac['baseLegitimacy'] * .7 + aL * .3)))
        org = min(100, round(cs * .5 + aI * .5))          # Momentum removed, weights re-normalized
        if self.cfg.power == 'mult': return org * (.5 + leg / 100)
        if self.cfg.power == 'channels':
            tp, th, tm = self.cfg.channels
            if self.cfg.people_metric == 'top3':
                top3 = sum(sorted((c['influence'] for c in mem), reverse=True)[:3])
                people = top3 >= self.cfg.people_top3_t or (self.cfg.headcount_n is not None
                         and len(mem) + (fac.get('additionalMemberCount') or 0) >= self.cfg.headcount_n)
                return self.cfg.power_base + people + (aI >= th) + (leg >= tm)
            # cs uses NAMED alive members only; unrepresented members count only through headcount (§4.3)
            people = cs >= tp or (self.cfg.headcount_n is not None
                                  and len(mem) + (fac.get('additionalMemberCount') or 0) >= self.cfg.headcount_n)
            return self.cfg.power_base + people + (aI >= th) + (leg >= tm)
        tot = sum(a['tier'] for a in own) or 1
        pub = sum(a['tier'] for a in own if a['role'] != 'Covert') / tot
        return org * (1 + pub * (leg - 50) / 100)

    def slots(self, f):
        s = self.power_score(f)
        if self.cfg.power in ('channels', 'stars'): return max(self.cfg.power_min, min(3, int(s)))
        b0, b1 = self.cfg.bands
        return 1 if s < b0 else 2 if s < b1 else 3

    def defense(self, g):
        """Active defensive assignments against Achieve goal g (Maintain = assignment, active/inactive)."""
        t = g['targetEntityId']
        if not t: return []
        out = []
        for m in self.goals.values():
            if m['conditionType'] != 'Maintain' or m['targetEntityId'] != t or m['factionId'] == g['factionId']: continue
            champ = self.ch.get(m['championId'])
            a = self.assets.get(t)
            protects = a is None or (a['controllingFactionId'] == m['factionId'] and a['status'] != 'Destroyed')
            if champ and champ['state'] == 'Alive' and champ['factionId'] == m['factionId'] and protects:
                out.append(m['id'])
        return out

    def earliest_of(self, g):
        if self.cfg.earliest_act and g['title'] in self.cfg.earliest_act: return self.cfg.earliest_act[g['title']]
        return g.get('earliestAct') or self.cfg.earliest_default

    def eligible(self, g):
        if self.cfg.earliest is not None and getattr(self, 'act', 3) < self.earliest_of(g): return False   # §18.6 Earliest Act
        c = self.ch.get(g['championId'])
        return (g['conditionType'] == 'Achieve' and g['status'] in ('Plotting', 'Progressing') and not g['obsolete'] and not g.get('ready')
                and c is not None and c['state'] == 'Alive' and c['factionId'] == g['factionId']
                and not (self.cfg.detector and self.satisfied(g)))

    def satisfied(self, g):
        """Target condition already true (derived overlay; uncredited, so no Momentum signal)."""
        t = g['targetEntityId']
        if g['targetEntityType'] == 'Asset' and t in self.assets:
            a = self.assets[t]
            if g['targetOwnerFactionId']: return a['controllingFactionId'] == g['targetOwnerFactionId']
            if g['targetState']: return a['status'] == g['targetState']
        if g['targetEntityType'] == 'Character' and t in self.ch and g['targetState']:
            return self.ch[t]['state'] == g['targetState']
        return False

    def drift(self, c, stress, mem=None):
        if mem is None: mem = self.members(c['factionId']) if c['factionId'] else []
        peers = [p for p in mem if p['id'] != c['id']] if c['factionId'] else []
        bonus = (sum(p['influence'] for p in peers) / len(peers)) * c['impressionable'] / 100 * .5 if peers else 0
        return c['pressure'] + stress * self.cfg.stress_k - (c['conviction'] + bonus)

    @staticmethod
    def band(d): return 'Steady' if d <= 0 else 'Strained' if d < 15 else 'Wavering' if d < 30 else 'Breaking'

    # ---------- Faction Beat ----------
    def alloc_attempts(self, turn, frozen_tier, frozen_slots):
        """Power-allocation Faction Phase: per faction, draw Power tokens from its goals' priority tokens (without replacement,
        so a goal receives at most its token count); each goal rolls up to its allocation and stops at its first success."""
        rng = self.rng; attempts = []; pos = 0
        for f in sorted(self.F):
            el = sorted([g for g in self.goals.values() if g['factionId'] == f and self.eligible(g)], key=lambda g: g['id'])
            self.log['elig_goals'] += len(el); self.log['fb_eligible'] += len(el); self.log[f'elig_{f}'] += len(el)
            self.log[f'slots_{f}'] += frozen_slots[f]; self.log[f'slotv_{frozen_slots[f]}'] += 1
            for g in el: self.log[f"elig_prio_{g['priority']}"] += 1
            tokens = [g for g in el for _ in range(self.cfg.alloc_tokens[PRIO[g['priority']]])]
            rng.shuffle(tokens)
            drawn = tokens[:frozen_slots[f]]
            self.log['power_total'] += frozen_slots[f]; self.log['power_unused'] += frozen_slots[f] - len(drawn)
            alloc = collections.Counter(g['id'] for g in drawn)
            order = []
            for g in drawn:                      # attempt order = token draw order (recorded)
                if g['id'] not in order: order.append(g['id'])
            perf = dict(succ=0, fail=0, spare=0, wsum=0.0, afail=0.0, alloc=0, csum=0.0)
            for gid in order:
                g = self.goals[gid]; k = alloc[gid]; w = 3 - PRIO[g['priority']]   # Critical 3, Major 2, Minor 1
                self.log[f'nomd_{gid}'] += 1; self.log[f"alloc_prio_{g['priority']}"] += k; self.log[f"recv_prio_{g['priority']}"] += 1
                self.log[f'drawn_{f}'] += 1; self.log[f'nom_{f}'] += 1
                dm = min(1, len(self.defense(g)))
                need = self.cfg.fb_target - frozen_tier[f] + dm
                p_ok = sum(1 for a in range(1, 7) for b in range(1, 7) if a + b >= need) / 36
                ok = False; total = 0
                for i in range(k):
                    d1, d2 = rng.randint(1, 6), rng.randint(1, 6); total = d1 + d2 + frozen_tier[f] - dm
                    self.log['fb_rolls'] += 1; nat = d1 + d2
                    crit = 0
                    if self.cfg.mom_model == 'crit':
                        cb = self.cfg.crit_band
                        crit = 1 if nat >= 12 - cb else -1 if nat <= 2 + cb else 0
                        if crit:
                            self.pending[f].append((('crit', turn, gid, i), crit, 'critical success' if crit > 0 else 'critical failure'))
                            self.log['crit_pos' if crit > 0 else 'crit_neg'] += 1; self.log[f'crit_{f}'] += 1
                            self.log[f'crit_k{k}'] += 1
                    if (crit > 0) or (crit == 0 and total >= self.cfg.fb_target):
                        ok = True; self.log['power_wasted'] += k - i - 1
                        perf['succ'] += 1; perf['spare'] += k - i - 1; perf['wsum'] += w * (k - i)
                        perf['csum'] += w * (k - i if self.cfg.mom_center_spares else 1) * (1 - p_ok)
                        break
                    perf['csum'] -= w * p_ok
                    perf['fail'] += 1; perf['wsum'] -= w * self.cfg.mom_fail_w; perf['afail'] += self.cfg.mom_fail_a[PRIO[g['priority']]]
                perf['alloc'] += k
                self.log[f'conc_k{k}'] += 1; self.log[f'conc_k{k}_ok'] += ok
                attempts.append(dict(goal=gid, faction=f, pos=pos, total=total, ok=ok,
                                     frm=g['status'], to=('Progressing' if g['status'] == 'Plotting' else 'Accomplished'),
                                     margin=total - self.cfg.fb_target, defended=dm, alloc=k))
                pos += 1
            self.turn_perf[f] = perf
        return attempts

    def faction_beat(self, turn):
        rng = self.rng
        frozen_tier = dict(self.tier); frozen_slots = {f: self.slots(f) for f in self.F}
        if self.prev_slots:
            for f in self.F:
                if frozen_slots[f] != self.prev_slots[f]: self.log['slot_flips'] += 1; self.log[f'flip_{f}'] += 1
        self.prev_slots = dict(frozen_slots)
        if self.cfg.fp_mode == 'alloc':
            self.turn_perf = {}
            for f in self.F:
                self.log[f'mod_{f}_t{turn}'] = frozen_tier[f]; self.log[f'pow_{f}_t{turn}'] = frozen_slots[f]
            attempts = self.alloc_attempts(turn, frozen_tier, frozen_slots)
            self.log[f'att_t{turn}'] += sum(a['alloc'] for a in attempts)   # Power spent on operations this turn
            for f in self.F:
                self.log[f'exh_{f}_t{turn}'] = int(f not in self.turn_perf or self.turn_perf[f]['alloc'] == 0)
            self.fp_score = self.score_turn()
            self.log['fb_beats'] += 1; self.log['fb_attempts'] += len(attempts)
            return self.commit_attempts(turn, attempts)
        pool = []
        for f in sorted(self.F):
            el = [g for g in self.goals.values() if g['factionId'] == f and self.eligible(g)]
            el.sort(key=lambda g: (g['status'] != 'Progressing', PRIO[g['priority']], rng.random(), g['id']))
            # starvation metric: goals ranked strictly below the last nominated rank can never be nominated this Beat
            k = frozen_slots[f]
            if len(el) > k:
                cut = (el[k - 1]['status'] != 'Progressing', PRIO[el[k - 1]['priority']])
                zero = [g for g in el if (g['status'] != 'Progressing', PRIO[g['priority']]) > cut]
                if self.cfg.wildcard is None:
                    self.log['zero_prob_goals'] += len(zero)
                for g in zero: self.log[f"zero_{g['id']}"] += 1
            self.log['elig_goals'] += len(el)
            for g in el: self.log[f"elig_prio_{g['priority']}"] += 1
            if self.cfg.wildcard == 'faction' and k >= 2 and len(el) > k:
                rest = el[k - 1:]; pick = rest[int(rng.random() * len(rest))]
                el = el[:k - 1] + [pick] + [g for g in rest if g is not pick]
            pool += el[:frozen_slots[f]]
            self.log['fb_eligible'] += len(el); self.log[f'elig_{f}'] += len(el)
            self.log[f'slots_{f}'] += frozen_slots[f]; self.log[f'slotv_{frozen_slots[f]}'] += 1; self.log[f'nom_{f}'] += min(len(el), frozen_slots[f])
        if self.cfg.wildcard in ('colony', 'colony_faction', 'colony_power'):
            nominated = {g['id'] for g in pool}
            rest = sorted([g for g in self.goals.values() if self.eligible(g) and g['id'] not in nominated], key=lambda g: g['id'])
            for g in rest: self.log[f"wc_avail_{g['factionId']}"] += 1
            if rest:
                if self.cfg.wildcard == 'colony':
                    pick = rest[int(rng.random() * len(rest))]
                elif self.cfg.wildcard == 'colony_power':   # faction chosen with probability proportional to its frozen Power
                    fs = sorted({g['factionId'] for g in rest}); w = [frozen_slots[x] for x in fs]
                    r = rng.random() * sum(w); acc = 0
                    for f, wt in zip(fs, w):
                        acc += wt
                        if r < acc: break
                else:   # choose a faction uniformly among those with unnominated goals, then one of its goals
                    fs = sorted({g['factionId'] for g in rest}); f = fs[int(rng.random() * len(fs))]
                if self.cfg.wildcard != 'colony':
                    mine = [g for g in rest if g['factionId'] == f]; pick = mine[int(rng.random() * len(mine))]
                pool.append(pick); self.log['wildcards'] += 1; self.log[f"wc_pick_{pick['factionId']}"] += 1
                self.wild_id = pick['id']
        else:
            self.wild_id = None
        for g in pool: self.log[f"nomd_{g['id']}"] += 1
        pool.sort(key=lambda g: g['id']); rng.shuffle(pool)
        drawn = pool[:self.cfg.n_slots]
        self.log['fb_beats'] += 1; self.log['fb_saturated'] += len(pool) > self.cfg.n_slots
        for g in drawn: self.log[f"drawn_{g['factionId']}"] += 1
        if getattr(self, 'wild_id', None) and any(g['id'] == self.wild_id for g in drawn): self.log['wc_drawn'] += 1
        attempts = []
        for pos, g in enumerate(drawn):
            d1, d2 = rng.randint(1, 6), rng.randint(1, 6)
            dm = min(1, len(self.defense(g)))
            total = d1 + d2 + frozen_tier[g['factionId']] - dm
            attempts.append(dict(goal=g['id'], faction=g['factionId'], pos=pos, total=total, ok=total >= self.cfg.fb_target,
                                 frm=g['status'], to=('Progressing' if g['status'] == 'Plotting' else 'Accomplished'),
                                 margin=total - self.cfg.fb_target, defended=dm))
        self.log['fb_attempts'] += len(attempts); self.log['fb_pool'] += len(pool); self.log['fb_rolls'] += len(attempts)
        return self.commit_attempts(turn, attempts)

    def commit_attempts(self, turn, attempts):
        # collisions: incompatible same-target completions -> margin, then draw position
        done = [a for a in attempts if a['ok'] and a['to'] == 'Accomplished'
                and (self.cfg.rtr_collide or not self.cfg.ready_to_resolve or self.is_automatic(self.goals[a['goal']]))]
        by_t = collections.defaultdict(list)
        for a in done:
            t = self.goals[a['goal']]['targetEntityId']
            if t: by_t[t].append(a)
        for t, lst in by_t.items():
            if len(lst) > 1:
                lst.sort(key=lambda a: (-a['margin'], a['pos']))
                for loser in lst[1:]: loser['ok'] = False; loser['preempted'] = True
                self.log['collisions'] += 1
        # commit
        for a in attempts:
            if not a['ok']: continue
            g = self.goals[a['goal']]
            if self.cfg.ready_to_resolve and a['to'] == 'Accomplished' and not self.is_automatic(g):
                g['ready'] = True; g['ready_turn'] = turn; self.log['ready_created'] += 1; self.log['advances'] += 1; self.log[f"adv_{a['faction']}"] += 1
                self.log[f'ready_t{turn}'] += 1; self.log[f"act{getattr(self, 'act', 0)}_adv_{g['title']}"] += 1
                self.log[f"adv_prio_{g['priority']}"] += 1; self.log[f'dev_t{turn}'] += 1
                continue
            g['status'] = a['to']
            if a['to'] == 'Progressing': self.log['milestones'] += 1; self.log[f"mile_prio_{g['priority']}"] += 1
            self.log[f"adv_prio_{g['priority']}"] += 1
            if self.cfg.threat_pressure and a['to'] == 'Progressing':
                for mid in self.defense(g):
                    mc = self.ch[self.goals[mid]['championId']]; mc['pressure'] = min(100, mc['pressure'] + self.cfg.threat_pressure)
                    self.log['threat_pressure_applied'] += 1
            self.log['advances'] += 1; self.log[f"adv_{a['faction']}"] += 1; self.log[f'dev_t{turn}'] += 1
            self.log[f"act{getattr(self, 'act', 0)}_adv_{g['title']}"] += 1
            if a['to'] != 'Accomplished': continue
            self.log['accomplished'] += 1; self.log[f"acc_{a['faction']}"] += 1
            root = ('attempt', turn, a['pos'])
            if self.cfg.mom_model != 'crit': self.pending[g['factionId']].append((root, +1, 'goal accomplished'))
            self.generate(g, root)
        if not self.cfg.rev3_order: self.resolve_momentum()

    def is_automatic(self, g):
        if self.cfg.use_outcome_mode: return self.cfg.accept_ready or g.get('outcomeMode', 'Automatic') == 'Automatic'
        return g['targetEntityType'] == 'Asset' and g['targetEntityId'] in self.assets and bool(g['targetOwnerFactionId'] or g['targetState'])

    def generate(self, g, root):
        """Declared outcome -> Effects, only for Automatic outcome goals."""
        t = g['targetEntityId']; tt = g['targetEntityType']
        if tt == 'Asset' and t in self.assets:
            a = self.assets[t]; prev_owner, prev_status = a['controllingFactionId'], a['status']
            if g['targetOwnerFactionId']: a['controllingFactionId'] = g['targetOwnerFactionId']
            if g['targetState']: a['status'] = g['targetState']
            lost = prev_owner and (a['controllingFactionId'] != prev_owner or STATUS_M[a['status']] < STATUS_M[prev_status])
            if lost and prev_owner in self.F:
                if a['keystone']:
                    mode = self.cfg.ops_keystone if self.cfg.mom_model == 'crit' else 'loss'
                    if mode != 'none': self.pending[prev_owner].append((root, -1, 'keystone lost'))   # deduped by root
                    if mode == 'transfer' and g['factionId'] != prev_owner:
                        self.pending[g['factionId']].append((root, +1, 'keystone taken'))
                if self.cfg.pressure_rules:
                    for c in self.members(prev_owner): c['pressure'] = min(100, c['pressure'] + self.cfg.loss_pressure)
                    for m in self.goals.values():
                        if m['conditionType'] == 'Maintain' and m['targetEntityId'] == t and m['championId'] in self.ch:
                            mc = self.ch[m['championId']]; mc['pressure'] = min(100, mc['pressure'] + self.cfg.loss_pressure)  # 2x total
            if a['status'] == 'Destroyed':
                for o in self.goals.values():
                    if o['targetEntityId'] == t and o['status'] in ('Plotting', 'Progressing') and o is not g:
                        o['obsolete'] = True; self.log['obsoleted'] += 1
        elif tt == 'Character' and t and (self.cfg.outcome_auto_char or (self.cfg.use_outcome_mode and g.get('targetState'))):
            self.ch[t]['state'] = g['targetState']
        elif self.cfg.use_outcome_mode:
            self.log['narrative_auto'] += 1   # §18.6: Auto-Resolve without a structured target: its Completed World State
        else:
            g['pending'] = True; self.log['adjudication_pending'] += 1

    def resolve_unattended(self, g, t):
        """Unattended resolution contract: the declared outcome applies; credited to the goal's faction."""
        g['ready'] = False; g['status'] = 'Accomplished'
        self.log['unattended_resolved'] += 1; self.log['accomplished'] += 1; self.log[f"acc_{g['factionId']}"] += 1
        root = ('unattended', g['id'])
        if self.cfg.mom_model != 'crit': self.pending[g['factionId']].append((root, +1, 'declared outcome, unattended'))
        tt, tid = g['targetEntityType'], g['targetEntityId']
        if tt == 'Character' and tid in self.ch and g['targetState']:
            self.ch[tid]['state'] = g['targetState']; self.log['unattended_character_outcome'] += 1

    def score_turn(self):
        """Candidate A/B score for each faction from this Faction Phase (applied at the next Opening)."""
        out = {}
        for f in self.F:
            p = self.turn_perf.get(f)
            if not p or p['alloc'] == 0: out[f] = None; continue        # allocated nothing: no performance
            if self.cfg.mom_model == 'rank':
                out[f] = (p['succ'] + p['spare'] - p['afail']) / p['alloc']
            elif self.cfg.mom_model == 'track':
                out[f] = 2 * p['csum'] if self.cfg.mom_center else p['wsum']   # centered: displayed x2 (thresholds 3/6)
            elif self.cfg.mom_model == 'track_norm':
                out[f] = 3 * p['wsum'] / p['alloc']
        return out

    def material_events(self):
        """Deduplicated material events pending for the Opening (operation accomplishments excluded: performance has them)."""
        net = {}
        for f, sigs in self.pending.items():
            dedup = {}
            for root, sign, why in sigs:
                if root[0] == 'attempt' and why == 'goal accomplished': continue
                dedup[(root, sign)] = sign
            net[f] = sum(dedup.values())
        self.pending.clear()
        return net

    def resolve_momentum(self):
        if self.cfg.mom_model not in ('signals', 'crit'): return self.resolve_momentum_candidate()
        self._resolve_signals()

    def resolve_momentum_candidate(self):
        ev = self.material_events(); sc = self.fp_score; self.fp_score = None
        if self.cfg.mom_model == 'rank':
            if sc:
                acted = sorted((v, f) for f, v in sc.items() if v is not None)
                n = len(acted); new = {f: 0 for f in self.F}
                if n > 1 and acted[0][0] != acted[-1][0]:
                    vals = [v for v, _ in acted]
                    for v, f in acted:   # average rank among equals (1 = worst); equal scores share a tier
                        lo = vals.index(v); hi = n - 1 - vals[::-1].index(v); r = (lo + hi) / 2
                        new[f] = round(-2 + 4 * r / (n - 1))
                self.tier = new
            for f, e in ev.items():
                if e: self.tier[f] = max(-2, min(2, self.tier[f] + max(-1, min(1, e)))); self.log['mom_events'] += 1
            return
        if sc:   # a Faction Phase happened: the track is replaced by its score (no performance -> 0)
            a = self.cfg.mom_smooth
            self.track = {f: max(-9, min(9, round(a * self.track[f] + (1 - a) * (sc[f] if sc[f] is not None else 0)))) for f in self.F}
        for f, e in ev.items():   # Act I (no Faction Phase): the track carries, and only events move it
            if e:
                pts = max(-self.cfg.event_cap, min(self.cfg.event_cap, e * self.cfg.event_points))
                self.track[f] = max(-9, min(9, self.track[f] + pts)); self.log['mom_events'] += 1
        self.tier = {f: self.mom_mod(self.track[f]) for f in self.F}

    def _resolve_signals(self):
        for f, sigs in self.pending.items():
            dedup = {}
            for root, sign, why in sigs: dedup[(root, sign)] = sign       # same root+direction counts once
            net = sum(dedup.values()); c = self.cfg.mom_cap
            ch = max(-c, min(c, net))
            if net != ch: self.log['momentum_capped'] += 1
            if dedup:
                self.log['res_with_signals'] += 1; self.log['res_multi'] += len(dedup) > 1
                self.log['res_pos' if net > 0 else 'res_neg' if net < 0 else 'res_cancel'] += 1
                before = self.tier[f]
                self.tier[f] = max(-2, min(2, self.tier[f] + ch))
                self.log['res_clamped'] += self.tier[f] - before != ch
            else:
                self.tier[f] = max(-2, min(2, self.tier[f] + ch))
        self.pending.clear()

    # ---------- Character Beat ----------
    def character_beat(self, turn, stress):
        rng = self.rng
        cands = [c for c in self.ch.values() if c['characterType'] == 'NPC' and c['state'] == 'Alive' and c['factionId']]
        if self.cfg.cb_tiers is not None:
            cands = [c for c in cands if c.get('narrativeTier') in self.cfg.cb_tiers]
        if self.cfg.crisis_queue:                       # queued successes from last Beat enter Compromised now
            for c in cands:
                if c.get('queued'): c['queued'] = False; c['inst'] = 2; self.log['compromised_entries'] += 1; self.log['queued_entered'] += 1
        mem = collections.defaultdict(list)          # members per faction, computed once (same result as members())
        for c in self.ch.values():
            if c['state'] == 'Alive' and c['factionId']: mem[c['factionId']].append(c)
        bands = {c['id']: self.band(self.drift(c, stress, mem[c['factionId']])) for c in cands}
        if self.cfg.settle:
            for c in cands:
                if bands[c['id']] == 'Steady' and c['inst'] > 0:
                    c['inst'] -= 1; self.log['settled'] += 1
                    if c['inst'] == 0: self.recovered(c, turn, 'settling')
        if self.cfg.delayed_check and not self.cfg.rev3_order:
            for c in cands:
                if c['inst'] == 2: self.defection_check(c, turn)
        pool = sorted([c for c in cands if bands[c['id']] != 'Steady' and c['inst'] < 2 and c['factionId']], key=lambda c: c['id'])
        self.log['cb_atrisk'] += len(pool)
        if self.cfg.per_faction:
            return self.per_faction_phase(turn, stress, pool, mem, bands)
        if self.cfg.cb_nominate:
            drift = {c['id']: self.drift(c, stress, mem[c['factionId']]) for c in pool}
            byf = collections.defaultdict(list)
            for c in pool: byf[c['factionId']].append(c)
            nominees = []
            for f in sorted(byf):
                byf[f].sort(key=lambda c: (-drift[c['id']], rng.random(), c['id']))
                nominees += byf[f][:self.cfg.cb_nominate]
            for c in pool: self.log[f"cbnom_{c['id']}"] += c in nominees
            pool = sorted(nominees, key=lambda c: c['id'])
        self.log['cb_pool'] += len(pool)
        if self.cfg.tickets:
            deck = [c for c in pool for _ in range({'Strained': 1, 'Wavering': 2, 'Breaking': 3}[bands[c['id']]])]
            rng.shuffle(deck); drawn, seen = [], set()
            n_draw = self.n_draws(stress, len(pool))
            for c in deck:
                if c['id'] not in seen: seen.add(c['id']); drawn.append(c)
                if len(drawn) == n_draw: break
        else:
            rng.shuffle(pool); drawn = pool[:self.n_draws(stress, len(pool))]
        self.log['cb_drawn'] += len(drawn); self.log['cb_beats'] += 1
        new_crises = 0
        for c in drawn:
            mod = BAND_MOD[bands[c['id']]] if self.cfg.band_mods else 0
            roll = rng.randint(1, 6) + rng.randint(1, 6) + mod
            if roll >= self.cfg.drift_target:
                if c['inst'] == 1 and self.cfg.crisis_cap is not None and new_crises >= self.cfg.crisis_cap:
                    self.log['crisis_capped'] += 1
                    if self.cfg.crisis_queue: c['queued'] = True        # success honored: enters Compromised next Beat
                    continue
                c['inst'] += 1
                if c['inst'] == 2: new_crises += 1
                if self.cfg.trace:
                    self.log[f"up_{c['id']}"] += 1
                    if c['inst'] == 2: self.log[f"cmp_{c['id']}"] += 1
                if c['inst'] == 2:
                    self.log['compromised_entries'] += 1
                    if not self.cfg.delayed_check: self.defection_check(c, turn)
            else:
                c['inst'] = max(0, c['inst'] - 1)
        stranded = [c for c in cands if c['inst'] > 0 and bands[c['id']] == 'Steady' and c['factionId']]
        self.log['stranded'] += len(stranded)

    def recovered(self, c, turn, cause):
        """Conflicted -> Stable. Exempt from the next Character Phase; Reaffirmed if this closes a full crisis."""
        self.log['recoveries'] += 1
        if self.cfg.recovery_exempt: c['exempt_turn'] = turn + 1
        if c.get('crisis_open'):
            c['crisis_open'] = False
            if self.cfg.reaffirmation and c.get('factionId'):
                c['reaffirmed_for'] = c['factionId']; self.log['reaffirmed'] += 1

    def per_faction_phase(self, turn, stress, pool, mem, bands):
        """One psychological resolution per faction per Colony Turn. A faction whose member made a Defection Check in this
        turn's Opening has used its opportunity. Otherwise its most at-risk eligible member rolls: Conflicted before Stable
        (if conflicted_first), then highest drift, ties by id. No random selection."""
        rng = self.rng; L = self.log
        drift = {c['id']: self.drift(c, stress, mem[c['factionId']]) for c in pool}
        byf = collections.defaultdict(list)
        for c in pool:
            if self.cfg.recommit_rest and c.get('recommitted_turn') is not None and turn - c['recommitted_turn'] <= 1: continue
            if self.cfg.recovery_exempt and c.get('exempt_turn') == turn: self.log['cb_exempt_skips'] += 1; continue
            if self.cfg.reaffirmation and c.get('reaffirmed_for') == c['factionId']: self.log['cb_reaffirmed_skips'] += 1; continue
            if c['factionId'] in self.F: byf[c['factionId']].append(c)
        for f in self.F:
            if f in getattr(self, 'checked_factions', set()): L['cb_slot_occupied'] += 1; continue
            el = byf.get(f)
            if not el: L['cb_slot_empty'] += 1; continue
            key = (lambda c: (-(c['inst'] == 1), -drift[c['id']], c['id'])) if self.cfg.conflicted_first else (lambda c: (-drift[c['id']], c['id']))
            c = min(el, key=key)
            # nomination statistics
            L['cb_rolls'] += 1; L['cb_drawn'] += 1; L[f'cbnomf_{f}'] += 1; L[f"cbnomc_{c['id']}"] += 1
            if c['id'] == self.F[f].get('leaderId'): L['cb_nom_leader'] += 1
            L['cb_elig_leader'] += any(x['id'] == self.F[f].get('leaderId') for x in el); L['cb_elig_faction'] += 1
            if c['inst'] == 1: L['cb_nom_conflicted'] += 1
            last = getattr(self, 'last_nom', {}); streak = getattr(self, 'nom_streak', {})
            streak[f] = streak.get(f, 0) + 1 if last.get(f) == c['id'] else 1; last[f] = c['id']
            self.last_nom, self.nom_streak = last, streak
            L['cb_max_streak'] = max(L.get('cb_max_streak', 0), streak[f])
            roll = rng.randint(1, 6) + rng.randint(1, 6) + (BAND_MOD[bands[c['id']]] if self.cfg.band_mods else 0)
            if roll >= self.cfg.drift_target:
                c['inst'] += 1
                if c['inst'] == 2:
                    L['compromised_entries'] += 1; L[f'crisis_{f}'] += 1; L[f"cmp_{c['id']}"] += 1
                    if c.get('crisis_open'): L['recrisis_unstabilized'] += 1   # re-entered Compromised without reaching Stable
                    c['crisis_open'] = True
            else:
                was = c['inst']; c['inst'] = max(0, c['inst'] - 1)
                if was == 1 and c['inst'] == 0: self.recovered(c, turn, 'failed roll')
        for f in self.F:                               # factions with no eligible member this turn break any streak
            if f not in byf and hasattr(self, 'nom_streak'): self.nom_streak[f] = 0; self.last_nom.pop(f, None)

    def n_draws(self, stress, pool_size=None):
        if self.cfg.draw_rule in ('pool', 'pool_stress', 'pool_tier') and pool_size is not None:
            return self._cap(self._pool_draws(stress, pool_size))
        return self._cap(self._n_draws(stress, pool_size))

    def _pool_draws(self, stress, pool_size):
        if self.cfg.draw_rule == 'pool':
            return math.ceil(pool_size / self.cfg.draw_per)
        if self.cfg.draw_rule == 'pool_tier' and pool_size is not None:   # one card per N at-risk; N = 5 / 4 / 3 by Stress
            per = 5 if stress <= 3 else 4 if stress <= 6 else 3
            return math.ceil(pool_size / per)
        if self.cfg.draw_rule == 'pool_stress' and pool_size is not None:
            return math.ceil(pool_size * (0.10 + 0.025 * stress))
        return self._cap(self._n_draws(stress, pool_size))

    def _cap(self, n):
        return n if self.cfg.draw_cap is None else min(n, self.cfg.draw_cap)

    def _n_draws(self, stress, pool_size):
        n = min(5, 2 + int(stress) // 3) if self.cfg.draws_by_stress else self.cfg.char_slots
        return n if self.cfg.draw_scale is None else max(1, round(n * self.cfg.draw_scale))

    def defection_check(self, c, turn):
        lab = self.compat[c['id']]['own']['label'] if c['id'] in self.compat else 'Tolerated'
        if self.rng.randint(1, 6) + self.rng.randint(1, 6) + LABEL_MOD[lab] * self.cfg.label_scale >= self.cfg.defect_target:
            self.defect(c, turn)
        else:
            c['inst'] = self.cfg.failed_check_to; self.log['defection_failed'] += 1
            c['recommitted_turn'] = turn

    def defect(self, c, turn):
        f = c['factionId']; c['factionId'] = None; c['inst'] = 0; c['defected'] = True; c['crisis_open'] = False
        self.log[f'defect_{f}'] += 1
        self.log['defections'] += 1; self.events.append((turn, c['name'], f))
        for g in self.goals.values():
            if g['championId'] == c['id'] and g['status'] in ('Plotting', 'Progressing'): self.log['goals_orphaned'] += 1
        if self.F[f]['leaderId'] == c['id']: self.pending[f].append((('defect', c['id']), -1, 'leader left')); self.log['leader_defected'] += 1

    # ---------- campaign ----------
    def run(self):
        S = [self.cfg.fixed_stress] * self.cfg.turns if self.cfg.fixed_stress is not None else STRESS[self.cfg.stress]
        fbt = self.cfg.faction_beat_turns
        for t in range(self.cfg.turns):
            act = ACT_OF_TURN[t]; self.act = act   # the real Act (Earliest Act); `act` below may be overridden for scheduling
            if fbt is not None: act = 2 if t in fbt else 1
            if self.cfg.turn_hook: self.cfg.turn_hook(self, t)
            if self.cfg.rev3_order:
                if self.cfg.unattended_turns is not None:   # 0. declared unattended outcomes fall due (offscreen, last session)
                    for g in self.goals.values():
                        if g.get('ready') and t - g['ready_turn'] >= self.cfg.unattended_turns:
                            self.resolve_unattended(g, t)
                self.checked_factions = set()
                def checks():
                    for c in list(self.ch.values()):      # pending Defection Checks from last turn's Compromised
                        if c['inst'] == 2 and c['state'] == 'Alive' and c['factionId']:
                            self.checked_factions.add(c['factionId']); self.log['cb_rolls'] += 1
                            self.defection_check(c, t)
                if not self.cfg.checks_in_cp: checks()     # 1. (Opening, before §18.4)
                self.resolve_momentum()                    # 2. capped Momentum: previous Beat + play + checks resolved
                if act == 2 or (act == 3 and self.cfg.faction_beats_act3): self.faction_beat(t)   # 3. frozen inputs
                if self.cfg.checks_in_cp: checks()         # §18.4: first step of the Character Phase; signals wait a turn
                self.character_beat(t, S[t])               # 4. new Compromised wait for next turn
                if any(c['inst'] == 2 for c in self.ch.values()): self.log['sessions_with_crisis'] += 1
                if t == 6: self.snap_act2 = self.snapshot()
                continue
            if act == 2 or (act == 3 and self.cfg.faction_beats_act3): self.faction_beat(t)
            else: self.resolve_momentum()           # Colony Turn is the Momentum boundary in every act
            self.character_beat(t, S[t])
            if t == 6: self.snap_act2 = self.snapshot()
        return self

    def snapshot(self):
        npcs = [c for c in self.ch.values() if c['characterType'] == 'NPC' and c['state'] == 'Alive']
        return dict(tier=dict(self.tier), slots={f: self.slots(f) for f in self.F},
                    conflicted=sum(c['inst'] == 1 for c in npcs), compromised=sum(c['inst'] == 2 for c in npcs),
                    defected=sum(c['defected'] for c in npcs), log=dict(self.log))


def batch(D, compat, cfg, runs=2000, seed0=0):
    outs = []
    for r in range(runs):
        col = Colony(D, compat, cfg, random.Random(seed0 + r)).run()
        outs.append((col.snap_act2, col.snapshot(), col.events))
    return outs
