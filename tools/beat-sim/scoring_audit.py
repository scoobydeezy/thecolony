"""Relationship-scoring audit, threshold-free checks (SCORING-AUDIT.md). Usage: python3 -I scoring_audit.py <live.json from export.py>
Compares the current Value term (alignment − conflict, which reduces to (α+β)·dot − β) with a geometric similarity
1 − 2D (D = normalized Manhattan distance on the ternary) and a candidate directional term opp(s→t) = Σ sᵢ·max(0, sᵢ − tᵢ)."""
import sys, json
D = json.load(open(sys.argv[1])); R = D['rules']
al, cf = R['valueAlignmentScale'], R['valueConflictScale']
F = [f for f in D['factions'] if f['type'] == 'Faction']
dot = lambda s, t: sum(s[k] * t[k] for k in 'abc')
val = lambda s, t: (al + cf) * dot(s, t) - cf
dist = lambda s, t: sum(abs(s[k] - t[k]) for k in 'abc') / 2
sim = lambda s, t: 1 - 2 * dist(s, t)
npcs = [c for c in D['characters'] if c['characterType'] == 'NPC' and any(f['id'] == c['factionId'] for f in F)]
print(f"valueSub = {al + cf}*dot - {cf}  (conflict = 1 - dot, so it is not an independent term)")
for name, fn in (('current value term', val), ('geometric similarity', sim)):
    own = sum(max(F, key=lambda f: fn(c['values'], f['values']))['id'] == c['factionId'] for c in npcs)
    print(f"{name}: own faction is the best Value match for {own}/{len(npcs)} NPCs")
print("\nGrid (step 0.1): twin-is-best / closer-target-scores-lower / max asymmetry")
pts = [(i / 10, j / 10, (10 - i - j) / 10) for i in range(11) for j in range(11 - i)]
Dg = lambda s, t: sum(abs(x - y) for x, y in zip(s, t)) / 2
cand = {'current': lambda s, t: (al + cf) * sum(x * y for x, y in zip(s, t)) - cf,
        'sim': lambda s, t: 1 - 2 * Dg(s, t),
        'sim - opp': lambda s, t: 1 - 2 * Dg(s, t) - sum(x * max(0, x - y) for x, y in zip(s, t))}
for name, f in cand.items():
    best = sum(all(f(s, s) >= f(s, t) - 1e-9 for t in pts) for s in pts)
    v = p = 0
    for s in pts:
        for t1 in pts:
            for t2 in pts:
                if Dg(s, t1) < Dg(s, t2) - 1e-9: p += 1; v += f(s, t1) < f(s, t2) - 1e-9
    print(f"  {name:<10} {best}/66  {100 * v / p:.1f}%  {max(abs(f(s, t) - f(t, s)) for s in pts for t in pts):.2f}")
