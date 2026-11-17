// Middle-belief agreement comparison (review O-4). Uses the app's real scoreRelationship, then applies an exact
// adjustment to the belief sub-score for the variant rules, recomputing base → stress → label with the app's
// own composition (stress weight from the result, applyStress from scoring.service).
//
//   V0  current: middle ("neutral") on Knowledge/Ritual is a buffer: always 0.
//   V1  ordinal: matching middles AGREE (+beliefMatch); middle vs pole stays 0; opposite poles conflict (as now).
//   V2  nominal: the middle is an ordinary position: equal → agree, any difference → conflict.
// The Change axis (B) already behaves like V2 in the current code (its isBuffer is () => false).
import * as fs from 'fs';
import * as T from 'CLIENT/src/app/core/models/types';
import { scoreRelationship, applyStress } from 'CLIENT/src/app/core/services/scoring.service';

const D = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const rules = D.rules;
const F = { ...T.DEFAULT_FORMULAS, ...JSON.parse(rules.formulasJson || '{}') };
const axis = (() => { try { const p = JSON.parse(rules.beliefAxisLabelsJson || ''); return { a: { ...T.DEFAULT_BELIEF_AXIS_LABELS.a, ...p.a }, b: { ...T.DEFAULT_BELIEF_AXIS_LABELS.b, ...p.b }, c: { ...T.DEFAULT_BELIEF_AXIS_LABELS.c, ...p.c } }; } catch { return T.DEFAULT_BELIEF_AXIS_LABELS; } })();
const thresholds = JSON.parse(rules.thresholdsJson).sort((x: any, y: any) => y.minScore - x.minScore);
const label = (s: number) => (thresholds.find((t: any) => s >= t.minScore)?.label) ?? 'Hostile';
const r1 = (n: number) => Math.round(n * 10) / 10;
const factions = D.factions.filter((f: any) => f.type === 'Faction');
const fA = (f: any) => ({ id: f.id, values: f.values, beliefa: f.beliefa ?? undefined, beliefb: f.beliefb ?? undefined, beliefc: f.beliefc ?? undefined });
const cA = (c: any) => { const d = T.deriveBeliefs(c.values, F.beliefDerivationThreshold, axis);
  return { id: c.id, values: c.values, beliefa: c.beliefa ?? d.beliefa, beliefb: c.beliefb ?? d.beliefb, beliefc: c.beliefc ?? d.beliefc }; };
const cs = D.colonyState;
const party = { id: 'party', values: cs.partyValues ?? { a: 1/3, b: 1/3, c: 1/3 }, beliefa: cs.partyBeliefa, beliefb: cs.partyBeliefb, beliefc: cs.partyBeliefc };

function extra(src: any, tgt: any, variant: 'V0' | 'V1' | 'V2'): number {
  if (variant === 'V0') return 0;
  let e = 0;
  for (const ax of ['a', 'c'] as const) {
    const s = src['belief' + ax], t = tgt['belief' + ax];
    if (s == null || t == null) continue;
    const sm = s === 'neutral', tm = t === 'neutral';
    if (sm && tm) e += rules.beliefMatch * src.values[ax];                              // both hold the middle
    else if (variant === 'V2' && (sm !== tm)) e += rules.beliefConflict * src.values[ax]; // middle vs pole
  }
  return e;
}

function score(src: any, tgt: any, stress: number, variant: 'V0' | 'V1' | 'V2') {
  // Exact: shift the app's own base score by the variant's extra belief contribution (scaled like beliefs),
  // then re-apply the app's stress tilt. V0 is the app's result untouched.
  const r = scoreRelationship(src, tgt, stress, 0, rules);
  if (variant === 'V0') return { score: r.finalScore, label: r.label };
  const sw = r.contributions.stressWeight;
  const beliefScale = rules.stressWeightEnabled ? 1 - sw : 1;
  const base = r1(r.baseScore + extra(src, tgt, variant) * beliefScale);
  const fin = r1(applyStress(base, stress, rules));
  return { score: fin, label: label(fin) };
}

const out: any = { factionPairs: [], party: [], characters: [] };
for (const stress of [0, 5]) {
  for (const s of factions) for (const t of factions) if (s.id !== t.id)
    out.factionPairs.push({ stress, src: s.name, tgt: t.name, V0: score(fA(s), fA(t), stress, 'V0'), V1: score(fA(s), fA(t), stress, 'V1'), V2: score(fA(s), fA(t), stress, 'V2') });
  for (const f of factions)
    out.party.push({ stress, src: f.name, V0: score(fA(f), party, stress, 'V0'), V1: score(fA(f), party, stress, 'V1'), V2: score(fA(f), party, stress, 'V2') });
}
for (const c of D.characters.filter((c: any) => c.characterType === 'NPC' && factions.some((f: any) => f.id === c.factionId))) {
  const f = factions.find((x: any) => x.id === c.factionId);
  out.characters.push({ name: c.name, faction: f.name, V0: score(cA(c), fA(f), 0, 'V0'), V1: score(cA(c), fA(f), 0, 'V1'), V2: score(cA(c), fA(f), 0, 'V2') });
}
out.factionBeliefs = factions.map((f: any) => ({ name: f.name, a: f.beliefa, b: f.beliefb, c: f.beliefc }));
out.axisLabels = axis;
console.log(JSON.stringify(out));
