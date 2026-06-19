import {
  RulesConfig, RelationshipBreakdown,
  RelationshipLabel, RelationshipThreshold,
  ValueVector, dot, inverseVector,
  BeliefPosition
} from '../models/types';

export const DEFAULT_RULES: RulesConfig = {
  id: 'singleton',
  beliefMatch: 2.5,
  beliefConflict: -1.0,
  valueAlignmentScale: 5,
  valueConflictScale: 3,
  stressPositiveMultiplierPerPoint: 0.25,
  stressNegativeMultiplierPerPoint: 0.35,
  positiveEnabled: true,
  negativeEnabled: true,
  influenceConvictionScale: 0.5,
  thresholdsJson: JSON.stringify([
    { label: 'Aligned',      minScore: 6   },
    { label: 'Cooperative',  minScore: 4   },
    { label: 'Friendly',     minScore: 2   },
    { label: 'Tolerated', minScore: -1  },
    { label: 'Strained',  minScore: -4  },
    { label: 'Opposed',   minScore: -10 },
    { label: 'Hostile',   minScore: -999 }
  ]),
  valueLabelsJson: '',
  beliefAxisLabelsJson: '',
  cascadeRulesJson: '',
  formulasJson: '',
};

function scoreBelief<T>(a: T | undefined, b: T | undefined, isBuffer: (v: T) => boolean, rules: RulesConfig): number {
  if (a == null || b == null) return 0;
  if (isBuffer(a) || isBuffer(b)) return 0;
  return a === b ? rules.beliefMatch : rules.beliefConflict;
}

function applyStress(score: number, colonyStress: number, rules: RulesConfig): number {
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
  const sv = source.values;

  const beliefcContrib = scoreBelief(source.beliefc, target.beliefc, r => r === 'neutral', rules) * sv.c;
  const beliefaContrib = scoreBelief(source.beliefa, target.beliefa, k => k === 'neutral', rules) * sv.a;
  const beliefbContrib = scoreBelief(source.beliefb, target.beliefb, () => false,          rules) * sv.b;

  const alignmentContrib = dot(sv, target.values)            * rules.valueAlignmentScale;
  const conflictContrib  = dot(sv, inverseVector(target.values)) * rules.valueConflictScale;

  const baseScore = round1(
    beliefcContrib + beliefaContrib + beliefbContrib + alignmentContrib - conflictContrib
  );

  const stressedScore = round1(applyStress(baseScore, colonyStress, rules));
  const finalScore    = round1(stressedScore + manualBump);

  return {
    sourceId: source.id,
    targetId: target.id,
    baseScore,
    stressedScore,
    manualBump,
    finalScore,
    label: getLabel(finalScore, rules),
    contributions: {
      beliefc:        round1(beliefcContrib),
      beliefa:        round1(beliefaContrib),
      beliefb:        round1(beliefbContrib),
      valueAlignment: round1(alignmentContrib),
      valueConflict:  round1(-conflictContrib),
    }
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
