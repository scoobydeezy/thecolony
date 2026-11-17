import {
  RulesConfig, RelationshipBreakdown,
  RelationshipLabel, RelationshipThreshold,
  ValueVector, valueSimilarity, valueOpposition,
  BeliefPosition, StressWeightCurve, BeliefAxisLabels, DEFAULT_BELIEF_AXIS_LABELS,
  Faction, deriveBeliefs,
} from '../models/types';

// Relationship scoring (SCORING-AUDIT.md, 2026-10-15). One formula for faction↔faction, faction↔party and
// character→faction (compatibility and the Defection Check):
//
//   value  = valueSimilarityScale · similarity(s, t)  −  valueOppositionScale · opposition(s → t)
//   belief = Σ axes  weight(axis) · agreement(source position, target position)
//            agreement: same → beliefMatch · middle vs pole → beliefAdjacent · opposite poles → beliefConflict
//            weight(axis) = blend · source.values[axis] + (1 − blend) / 3        (weights sum to 1)
//   then the stress composition and tilt, then the manual bump (unchanged).
//
// Every axis has three positions; declared (GM override) and derived beliefs score identically.
// Constants are PROVISIONAL (anchored to synthetic pairs, see SCORING-AUDIT.md) until the balancing pass.
export const DEFAULT_RULES: RulesConfig = {
  id: 'singleton',
  beliefMatch: 3.0,
  beliefConflict: -2.0,
  beliefAdjacent: -1.0,
  beliefWeightBlend: 0.5,
  valueSimilarityScale: 3.5,
  valueOppositionScale: 3.0,
  stressPositiveMultiplierPerPoint: 0.25,
  stressNegativeMultiplierPerPoint: 0.2,
  positiveEnabled: true,
  negativeEnabled: true,
  influenceConvictionScale: 0.5,
  thresholdsJson: JSON.stringify([
    { label: 'Aligned',      minScore: 6  },
    { label: 'Cooperative',  minScore: 4  },
    { label: 'Friendly',     minScore: 2  },
    { label: 'Tolerated',    minScore: -1 },
    { label: 'Strained',     minScore: -3 },
    { label: 'Opposed',      minScore: -6 },
  ]),
  valueLabelsJson: '',
  beliefAxisLabelsJson: '',
  cascadeRulesJson: '',
  formulasJson: '',
  stressWeightEnabled: true,
  stressWeightCurve: 'Cubic',
  stressWeightIntensity: 0.7,
  stressTriggersJson: '[]',
};

const RANK: Record<BeliefPosition, number> = { negative: 0, neutral: 1, positive: 2 };

/** Agreement between two positions on one axis: same, adjacent (middle vs pole) or opposite. 0 if either is unset. */
export function beliefAgreement(a: BeliefPosition | undefined, b: BeliefPosition | undefined, rules: RulesConfig): number {
  if (a == null || b == null) return 0;
  const gap = Math.abs(RANK[a] - RANK[b]);
  return gap === 0 ? rules.beliefMatch : gap === 1 ? (rules.beliefAdjacent ?? DEFAULT_RULES.beliefAdjacent) : rules.beliefConflict;
}

/** Per-axis belief weights: a blend of the source's own Value on the axis and equal weighting. Always sums to 1. */
export function beliefWeights(v: ValueVector, blend: number): ValueVector {
  const k = Math.max(0, Math.min(1, blend)), e = (1 - k) / 3;
  return { a: k * v.a + e, b: k * v.b + e, c: k * v.c + e };
}

export function applyCurve(t: number, curve: StressWeightCurve): number {
  switch (curve) {
    case 'Quadratic':   return t * t;
    case 'Cubic':       return t * t * t;
    case 'Exponential': return (Math.exp(t) - 1) / (Math.E - 1);
    default:            return t; // Linear
  }
}

export function applyStress(score: number, colonyStress: number, rules: RulesConfig): number {
  const t = Math.min(colonyStress / 10, 1);
  if (score > 0) return score * (1 + colonyStress * rules.stressPositiveMultiplierPerPoint * (1 - t));
  if (score < 0) return score * (1 + colonyStress * rules.stressNegativeMultiplierPerPoint * t);
  return 0;
}

function getLabel(score: number, rules: RulesConfig): RelationshipLabel {
  const thresholds: RelationshipThreshold[] = JSON.parse(rules.thresholdsJson);
  const sorted = [...thresholds].sort((a, b) => b.minScore - a.minScore);
  for (const t of sorted) {
    if (score >= t.minScore) return t.label;
  }
  return 'Hostile';
}

export interface ScoringActor {
  id: string;
  values: ValueVector;
  beliefc?: BeliefPosition;
  beliefa?: BeliefPosition;
  beliefb?: BeliefPosition;
}

export function scoreRelationship(
  source: ScoringActor,
  target: ScoringActor,
  colonyStress: number,
  manualBump: number,
  rules: RulesConfig = DEFAULT_RULES
): RelationshipBreakdown {
  // Treat undefined as enabled — only an explicit false disables. A disabled sign drops every contribution of that sign.
  const posEnabled = rules.positiveEnabled !== false;
  const negEnabled = rules.negativeEnabled !== false;
  const gate = (x: number) => (x > 0 && !posEnabled) || (x < 0 && !negEnabled) ? 0 : x;
  const r: RulesConfig = {
    ...rules,
    stressPositiveMultiplierPerPoint: posEnabled ? rules.stressPositiveMultiplierPerPoint : 0,
    stressNegativeMultiplierPerPoint: negEnabled ? rules.stressNegativeMultiplierPerPoint : 0,
  };

  const w = beliefWeights(source.values, rules.beliefWeightBlend ?? DEFAULT_RULES.beliefWeightBlend);
  const beliefcContrib = gate(beliefAgreement(source.beliefc, target.beliefc, r) * w.c);
  const beliefaContrib = gate(beliefAgreement(source.beliefa, target.beliefa, r) * w.a);
  const beliefbContrib = gate(beliefAgreement(source.beliefb, target.beliefb, r) * w.b);

  const similarityContrib = gate(valueSimilarity(source.values, target.values) * (rules.valueSimilarityScale ?? DEFAULT_RULES.valueSimilarityScale));
  const oppositionContrib = gate(-valueOpposition(source.values, target.values) * (rules.valueOppositionScale ?? DEFAULT_RULES.valueOppositionScale));

  const beliefSubScore = beliefcContrib + beliefaContrib + beliefbContrib;
  const valueSubScore  = similarityContrib + oppositionContrib;

  let beliefScale  = 1.0;
  let valueScale   = 1.0;
  let stressWeight = 0.0;

  if (r.stressWeightEnabled) {
    const t = Math.min(colonyStress / 10, 1);
    stressWeight = applyCurve(t, r.stressWeightCurve) * r.stressWeightIntensity;
    beliefScale  = 1.0 - stressWeight;
    valueScale   = 1.0 + stressWeight;
  }

  const baseScore     = round1(beliefSubScore * beliefScale + valueSubScore * valueScale);
  const stressedScore = round1(applyStress(baseScore, colonyStress, r));
  const finalScore    = round1(stressedScore + manualBump);

  return {
    sourceId: source.id,
    targetId: target.id,
    baseScore,
    stressedScore,
    manualBump,
    finalScore,
    label: getLabel(finalScore, r),
    contributions: {
      beliefc:         round1(beliefcContrib),
      beliefa:         round1(beliefaContrib),
      beliefb:         round1(beliefbContrib),
      valueSimilarity: round1(similarityContrib),
      valueOpposition: round1(oppositionContrib),
      beliefSubScore:  round1(beliefSubScore),
      valueSubScore:   round1(valueSubScore),
      stressWeight:    Math.round(stressWeight * 1000) / 1000,
    }
  };
}

/** The directional Value score alone (no beliefs, no stress): used to rank most-aligned / most-opposed factions. */
export function valueScore(source: ValueVector, target: ValueVector, rules: RulesConfig = DEFAULT_RULES): number {
  return (rules.valueSimilarityScale ?? DEFAULT_RULES.valueSimilarityScale) * valueSimilarity(source, target)
       - (rules.valueOppositionScale ?? DEFAULT_RULES.valueOppositionScale) * valueOpposition(source, target);
}

export interface FactionCompatibility {
  factionId: string;
  score: number;
}

/**
 * A character's compatibility with each faction: the full relationship score at stress 0 with no bump, using
 * effective beliefs (overrides where set, derived elsewhere). The same formula as the Defection Check. Best first.
 */
export function topCompatibleFactions(
  character: { id?: string; values: ValueVector; beliefc?: BeliefPosition; beliefa?: BeliefPosition; beliefb?: BeliefPosition },
  factions: Faction[],
  beliefThreshold = 0.4,
  axisLabels: BeliefAxisLabels = DEFAULT_BELIEF_AXIS_LABELS,
  rules: RulesConfig = DEFAULT_RULES
): FactionCompatibility[] {
  const d = deriveBeliefs(character.values, beliefThreshold, axisLabels);
  const source: ScoringActor = { id: character.id ?? 'character', values: character.values,
    beliefa: character.beliefa ?? d.beliefa, beliefb: character.beliefb ?? d.beliefb, beliefc: character.beliefc ?? d.beliefc };
  return factions
    .map(f => ({ factionId: f.id, score: scoreRelationship(source, f, 0, 0, rules).baseScore }))
    .sort((a, b) => b.score - a.score);
}

// The top N active factions (excluding self, Factions only) by the directional Value score, best first.
export function mostAlignedFactions(faction: Faction, others: Faction[], n = 3, rules: RulesConfig = DEFAULT_RULES): Faction[] {
  return others
    .filter(f => f.id !== faction.id && f.active && f.type === 'Faction')
    .sort((a, b) => valueScore(faction.values, b.values, rules) - valueScore(faction.values, a.values, rules))
    .slice(0, n);
}

// The bottom N active factions (excluding self, Factions only) by the directional Value score, worst first.
export function mostOpposedFactions(faction: Faction, others: Faction[], n = 3, rules: RulesConfig = DEFAULT_RULES): Faction[] {
  return others
    .filter(f => f.id !== faction.id && f.active && f.type === 'Faction')
    .sort((a, b) => valueScore(faction.values, a.values, rules) - valueScore(faction.values, b.values, rules))
    .slice(0, n);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
