// Calibration inputs computed with the app's own code (scoring.service, types). Since the scoring audit (2026-10-15) this
// emits only the character→faction compatibility the simulator consumes; Power is computed in colony_sim.py.
// Baseline world only (no session effects). Bundled by run.sh with esbuild; CLIENT path is injected.
import * as fs from 'fs';
import * as T from 'CLIENT/src/app/core/models/types';
import { scoreRelationship } from 'CLIENT/src/app/core/services/scoring.service';

const D = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const rules = D.rules;
const F = { ...T.DEFAULT_FORMULAS, ...JSON.parse(rules.formulasJson || '{}') };
if (process.argv[3]) F.beliefDerivationThreshold = Number(process.argv[3]);   // sensitivity runs only
const axis = (() => { try { const p = JSON.parse(rules.beliefAxisLabelsJson || ''); return { a: { ...T.DEFAULT_BELIEF_AXIS_LABELS.a, ...p.a }, b: { ...T.DEFAULT_BELIEF_AXIS_LABELS.b, ...p.b }, c: { ...T.DEFAULT_BELIEF_AXIS_LABELS.c, ...p.c } }; } catch { return T.DEFAULT_BELIEF_AXIS_LABELS; } })();
const factions = D.factions.filter((f: any) => f.type === 'Faction');
const actor = (x: any, beliefs: any) => ({ id: x.id, values: x.values, ...beliefs });
const fBel = (f: any) => ({ beliefa: f.beliefa ?? undefined, beliefb: f.beliefb ?? undefined, beliefc: f.beliefc ?? undefined });
const cBel = (c: any) => {
  const d = T.deriveBeliefs(c.values, F.beliefDerivationThreshold, axis);   // configured threshold (fixes D12)
  return { beliefa: c.beliefa ?? d.beliefa, beliefb: c.beliefb ?? d.beliefb, beliefc: c.beliefc ?? d.beliefc };
};

// ---- Character -> faction compatibility, stress-free (stress 0, no bump) ----
const compat = D.characters
  .filter((c: any) => c.characterType === 'NPC' && c.factionId && factions.some((f: any) => f.id === c.factionId))
  .map((c: any) => {
    const scores = factions.map((f: any) => {
      const r = scoreRelationship(actor(c, cBel(c)) as any, actor(f, fBel(f)) as any, 0, 0, rules);
      return { factionId: f.id, score: r.baseScore, label: r.label, belief: r.contributions.beliefSubScore, value: r.contributions.valueSubScore };
    });
    const own = scores.find((s: any) => s.factionId === c.factionId)!;
    const best = [...scores].filter((s: any) => s.factionId !== c.factionId).sort((a: any, b: any) => b.score - a.score)[0];
    return { id: c.id, name: c.name, factionId: c.factionId, state: c.state, own, bestOther: best };
  });

console.log(JSON.stringify({ compat, formulas: F, thresholds: JSON.parse(rules.thresholdsJson) }, null, 1));
