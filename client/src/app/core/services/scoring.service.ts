import {
  RulesConfig, RelationshipBreakdown,
  RelationshipLabel, RelationshipThreshold,
  ValueVector, dot, inverseVector,
  RitualPosition, KnowledgePosition, ChangePosition
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
  ])
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
  ritual?: RitualPosition;
  knowledge?: KnowledgePosition;
  change?: ChangePosition;
}

export function scoreRelationship(
  source: ScoringActor,
  target: ScoringActor,
  colonyStress: number,
  manualBump: number,
  rules: RulesConfig = DEFAULT_RULES
): RelationshipBreakdown {
  const sv = source.values;

  const ritualContrib    = scoreBelief(source.ritual,    target.ritual,    r => r === 'Neutral',    rules) * sv.agency;
  const knowledgeContrib = scoreBelief(source.knowledge, target.knowledge, k => k === 'Controlled', rules) * sv.truth;
  const changeContrib    = scoreBelief(source.change,    target.change,    () => false,             rules) * sv.stability;

  const alignmentContrib = dot(sv, target.values)            * rules.valueAlignmentScale;
  const conflictContrib  = dot(sv, inverseVector(target.values)) * rules.valueConflictScale;

  const baseScore = round1(
    ritualContrib + knowledgeContrib + changeContrib + alignmentContrib - conflictContrib
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
      ritual:         round1(ritualContrib),
      knowledge:      round1(knowledgeContrib),
      change:         round1(changeContrib),
      valueAlignment: round1(alignmentContrib),
      valueConflict:  round1(-conflictContrib),
    }
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
