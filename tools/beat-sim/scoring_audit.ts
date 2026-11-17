// Relationship-scoring audit (SCORING-AUDIT.md): the app's real scoreRelationship over a 0.1 ternary grid and the roster.
// Bundle like calib_middle.ts: sed "s#CLIENT/#<client>/#g" scoring_audit.ts > x.ts; esbuild x.ts --bundle --platform=node; node x.js live.json
import * as fs from 'fs';
import * as T from 'CLIENT/src/app/core/models/types';
import { scoreRelationship } from 'CLIENT/src/app/core/services/scoring.service';
const D = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); const rules = D.rules;
const pts: any[] = [];
for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10 - i; j++) pts.push({ a: i / 10, b: j / 10, c: (10 - i - j) / 10 });
const val = (s: any, t: any) => scoreRelationship({ id: 's', values: s } as any, { id: 't', values: t } as any, 0, 0, rules).contributions.valueSubScore;
const man = (s: any, t: any) => (Math.abs(s.a - t.a) + Math.abs(s.b - t.b) + Math.abs(s.c - t.c)) / 2;
const k = (p: any) => `(${p.a},${p.b},${p.c})`;
// 1 self-score; 2 does some other target beat the twin?
const rows = pts.map(s => {
  const self = val(s, s); let best = -99, bestT: any = null;
  for (const t of pts) { const v = val(s, t); if (v > best + 1e-9) { best = v; bestT = t; } }
  const spread = Math.max(...pts.map(t => val(s, t))) - Math.min(...pts.map(t => val(s, t)));
  return { s: k(s), self, best, bestT: k(bestT), beaten: best > self + 1e-9, spread };
});
const beaten = rows.filter(r => r.beaten).length;
console.log(`grid points ${pts.length}; points whose identical twin is NOT their best value match: ${beaten}`);
console.log(`self value-score range ${Math.min(...rows.map(r => r.self)).toFixed(2)} .. ${Math.max(...rows.map(r => r.self)).toFixed(2)}; self < 0 at ${rows.filter(r => r.self < 0).length} points; self < Friendly(2) at ${rows.filter(r => r.self < 2).length}`);
for (const p of ['(0.3,0.3,0.4)', '(0.4,0.4,0.2)', '(0.5,0.3,0.2)', '(0.7,0.2,0.1)', '(1,0,0)']) { const r = rows.find(x => x.s === p)!; console.log(`  ${p}: self ${r.self.toFixed(2)} best ${r.best.toFixed(2)} @ ${r.bestT}; range of scores it can give anyone ${r.spread.toFixed(2)}`); }
// 3 monotonicity in distance: for each source, correlation of value score with -distance, and violations (closer target scoring lower)
let viol = 0, pairs = 0;
for (const s of pts) for (const t1 of pts) for (const t2 of pts) { const d1 = man(s, t1), d2 = man(s, t2); if (d1 < d2 - 1e-9) { pairs++; if (val(s, t1) < val(s, t2) - 1e-9) viol++; } }
console.log(`distance monotonicity: of ${pairs} (closer, farther) target pairs, the closer target scores LOWER in ${viol} (${(100 * viol / pairs).toFixed(1)}%)`);
// 4 belief term: weight vs derivation. For grid sources, max belief agreement achievable
const th = { ...T.DEFAULT_FORMULAS, ...JSON.parse(rules.formulasJson || '{}') }.beliefDerivationThreshold;
const axis = JSON.parse(rules.beliefAxisLabelsJson || '{}');
const labels = { a: { ...T.DEFAULT_BELIEF_AXIS_LABELS.a, ...axis.a }, b: { ...T.DEFAULT_BELIEF_AXIS_LABELS.b, ...axis.b }, c: { ...T.DEFAULT_BELIEF_AXIS_LABELS.c, ...axis.c } };
const selfFull = pts.map(s => { const b = T.deriveBeliefs(s, th, labels as any); const r = scoreRelationship({ id: 's', values: s, ...b } as any, { id: 't', values: s, ...b } as any, 0, 0, rules); return { s: k(s), b, belief: r.contributions.beliefSubScore, total: r.baseScore, label: r.label }; });
const cnt: Record<string, number> = {}; selfFull.forEach(r => cnt[r.label] = (cnt[r.label] ?? 0) + 1);
console.log(`derived-belief actor vs its identical twin (threshold ${th}): labels`, cnt);
for (const p of ['(0.3,0.3,0.4)', '(0.4,0.4,0.2)', '(0.5,0.3,0.2)', '(0.7,0.2,0.1)', '(1,0,0)', '(0,1,0)']) { const r = selfFull.find(x => x.s === p)!; console.log(`  ${p}: beliefs a/b/c ${r.b.beliefa}/${r.b.beliefb}/${r.b.beliefc} belief ${r.belief} total ${r.total} ${r.label}`); }
// real factions: self value score
for (const f of D.factions.filter((f: any) => f.type === 'Faction')) console.log(`  ${f.name.padEnd(22)} values ${[f.values.a, f.values.b, f.values.c].map((x: number) => x.toFixed(2))} value-score vs identical twin ${val(f.values, f.values).toFixed(2)}`);
