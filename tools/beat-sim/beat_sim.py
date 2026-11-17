"""
Faction Beat proof-of-concept simulator (audit only; not app code).

Implements the Faction Goals.md v1.0 Act II procedure against a frozen snapshot:
  eligibility (unfinished Achieve + capable champion) -> Power-based nomination
  (Progressing first, then Priority, random ties) -> shuffle -> draw 5 ->
  2d6 + Momentum tier - Maintain defense >= 8 -> advance one state -> commit.

Open decisions are parameters, not hard-coded rules:
  slots_for_power(power)      Power -> nomination allowance
  momentum_policy             'none' (Faction Goals.md as written),
                              'accomplish' (+1 on Accomplished only),
                              'advance' (+1 on any advance),
                              'advance_and_fail' (+1 advance / -1 on failed roll)
  defense_policy              'single' (-1 if any qualifying Maintain), 'stack'
"""
import json, random, sqlite3, sys, itertools, statistics
from dataclasses import dataclass, field, replace

PRIORITY_RANK = {"Critical": 0, "Major": 1, "Minor": 2}
NEXT_STATE = {"Plotting": "Progressing", "Progressing": "Accomplished"}
CAPABLE_STATES = {"Alive"}


@dataclass(frozen=True)
class Goal:
    id: str
    faction: str
    title: str
    status: str
    kind: str          # Achieve | Maintain
    priority: str
    champion: str | None
    target_type: str | None
    target_id: str | None
    target_state: str | None
    target_owner: str | None


@dataclass
class World:
    goals: dict                     # id -> Goal
    champion_state: dict            # characterId -> state
    momentum_tier: dict             # factionId -> -2..+2
    power: dict                     # factionId -> number (whatever scale)
    asset_status: dict = field(default_factory=dict)
    asset_owner: dict = field(default_factory=dict)


def capable(world, char_id):
    return char_id is not None and world.champion_state.get(char_id) in CAPABLE_STATES


def defenses_for(world, g):
    """Maintain goals with a capable champion on the SAME target, other faction."""
    if not g.target_id:
        return []
    return [m for m in world.goals.values()
            if m.kind == "Maintain" and m.status not in ("Failed",)
            and m.target_id == g.target_id and m.faction != g.faction
            and capable(world, m.champion)]


def nominate(world, slots_for_power, rng):
    pool, trace = [], {}
    by_faction = {}
    for g in world.goals.values():
        if g.kind == "Achieve" and g.status in NEXT_STATE and capable(world, g.champion):
            by_faction.setdefault(g.faction, []).append(g)
    for fid, goals in sorted(by_faction.items()):
        n = slots_for_power(world.power.get(fid, 0))
        # random tie-break key drawn up front so the order is reproducible
        keyed = [(0 if g.status == "Progressing" else 1, PRIORITY_RANK[g.priority], rng.random(), g.id, g) for g in goals]
        keyed.sort(key=lambda k: k[:4])
        chosen = [k[-1] for k in keyed[:n]]
        trace[fid] = {"allowance": n, "eligible": len(goals), "nominated": [g.id for g in chosen]}
        pool.extend(chosen)
    return pool, trace


def run_beat(world, seed, slots_for_power, momentum_policy="none", defense_policy="single", slots=5, threshold=8):
    rng = random.Random(seed)
    frozen = World(dict(world.goals), dict(world.champion_state), dict(world.momentum_tier),
                   dict(world.power), dict(world.asset_status), dict(world.asset_owner))
    pool, nom_trace = nominate(frozen, slots_for_power, rng)
    pool.sort(key=lambda g: g.id)        # canonical order before shuffle => seed-reproducible
    rng.shuffle(pool)
    drawn = pool[:slots]
    attempts = []
    for g in drawn:                      # every roll reads ONLY the frozen snapshot
        d1, d2 = rng.randint(1, 6), rng.randint(1, 6)
        defs = defenses_for(frozen, g)
        dmod = (len(defs) if defense_policy == "stack" else min(1, len(defs)))
        mom = frozen.momentum_tier.get(g.faction, 0)
        total = d1 + d2 + mom - dmod
        ok = total >= threshold
        attempts.append({"goal": g.id, "faction": g.faction, "title": g.title, "from": g.status,
                         "to": NEXT_STATE[g.status] if ok else g.status, "dice": [d1, d2],
                         "momentum": mom, "defense": -dmod, "defenders": [m.id for m in defs],
                         "total": total, "success": ok})
    # ---- commit phase: apply all results together ----
    new = World(dict(world.goals), dict(world.champion_state), dict(world.momentum_tier),
                dict(world.power), dict(world.asset_status), dict(world.asset_owner))
    conflicts = []
    accomplished = [a for a in attempts if a["success"] and a["to"] == "Accomplished"]
    by_target = {}
    for a in accomplished:
        t = world.goals[a["goal"]].target_id
        if t:
            by_target.setdefault(t, []).append(a)
    for t, lst in by_target.items():
        if len(lst) > 1:
            conflicts.append({"target": t, "goals": [a["goal"] for a in lst]})
    for a in attempts:
        g = new.goals[a["goal"]]
        if a["success"]:
            new.goals[g.id] = replace(g, status=a["to"])
            if a["to"] == "Accomplished" and g.target_type == "Asset":
                if g.target_state:
                    new.asset_status[g.target_id] = g.target_state
                if g.target_owner:
                    new.asset_owner[g.target_id] = g.target_owner
        f = a["faction"]
        delta = 0
        if momentum_policy == "accomplish" and a["success"] and a["to"] == "Accomplished": delta = 1
        if momentum_policy == "advance" and a["success"]: delta = 1
        if momentum_policy == "advance_and_fail": delta = 1 if a["success"] else -1
        if delta:
            new.momentum_tier[f] = max(-2, min(2, new.momentum_tier.get(f, 0) + delta))
    return new, {"seed": seed, "nomination": nom_trace, "pool": [g.id for g in pool],
                 "attempts": attempts, "conflicts": conflicts}


def load_world(db_path, power_fn, tier_fn):
    con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    cols = {r[1] for r in con.execute("PRAGMA table_info(FactionGoals)")}
    goals = {}
    for r in con.execute("SELECT * FROM FactionGoals"):
        r = dict(r)
        goals[r["Id"]] = Goal(r["Id"], r["FactionId"], r["Title"], r["Status"], r["ConditionType"],
                              r["Priority"], r.get("ChampionId"), r.get("TargetEntityType"), r.get("TargetEntityId"),
                              r.get("TargetState"), r.get("TargetOwnerFactionId"))
    chars = {r["Id"]: r["State"] for r in con.execute("SELECT Id, State FROM Characters")}
    factions = [dict(r) for r in con.execute("SELECT * FROM Factions")]
    return World(goals, chars, {f["Id"]: tier_fn(f) for f in factions}, {f["Id"]: power_fn(f) for f in factions}), con


if __name__ == "__main__":
    print("library module; see driver")
