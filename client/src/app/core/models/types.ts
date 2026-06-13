export type RitualPosition = 'Good' | 'Neutral' | 'Bad';
export type KnowledgePosition = 'Hidden' | 'Controlled' | 'Revealed';
export type ChangePosition = 'Yes' | 'No';
export type CoreValue = 'Stability' | 'Agency' | 'Truth';
export type RelationshipLabel = 'Aligned' | 'Cooperative' | 'Friendly' | 'Tolerated' | 'Strained' | 'Opposed' | 'Hostile';
export type GroupType = 'Faction' | 'SocialClass';

export interface ValueVector {
  truth: number;     // 0–1, sum with stability + agency = 1
  stability: number;
  agency: number;
}

export function dot(a: ValueVector, b: ValueVector): number {
  return a.truth * b.truth + a.stability * b.stability + a.agency * b.agency;
}

export function inverseVector(v: ValueVector): ValueVector {
  return { truth: 1 - v.truth, stability: 1 - v.stability, agency: 1 - v.agency };
}

export function primaryValue(v: ValueVector): CoreValue {
  if (v.truth >= v.stability && v.truth >= v.agency) return 'Truth';
  if (v.stability >= v.agency) return 'Stability';
  return 'Agency';
}

export function secondaryValue(v: ValueVector): CoreValue {
  const sorted = (['truth', 'stability', 'agency'] as const)
    .map(k => ({ key: k, val: v[k] }))
    .sort((a, b) => b.val - a.val);
  const key = sorted[1].key;
  if (key === 'truth') return 'Truth';
  if (key === 'stability') return 'Stability';
  return 'Agency';
}

export function sacrificedValue(v: ValueVector): CoreValue {
  if (v.truth <= v.stability && v.truth <= v.agency) return 'Truth';
  if (v.stability <= v.agency) return 'Stability';
  return 'Agency';
}

// Each value's "aligned" belief and the position that represents alignment vs conflict.
// Truth cares about Knowledge (Revealed = aligned, Hidden = conflict).
// Stability cares about Change (No = aligned, Yes = conflict).
// Agency cares about Ritual (Bad = aligned, Good = conflict).
export const BELIEF_VALUE_ALIGNMENT = {
  truth:     { axis: 'knowledge' as const, aligned: 'Revealed' as KnowledgePosition, conflicting: 'Hidden' as KnowledgePosition },
  stability: { axis: 'change'    as const, aligned: 'No'       as ChangePosition,    conflicting: 'Yes'    as ChangePosition    },
  agency:    { axis: 'ritual'    as const, aligned: 'Bad'      as RitualPosition,    conflicting: 'Good'   as RitualPosition    },
};

export interface BeliefConflicts {
  ritual:    boolean;
  knowledge: boolean;
  change:    boolean;
  any:       boolean;
}

export function beliefConflicts(
  values: ValueVector,
  ritual: RitualPosition | undefined,
  knowledge: KnowledgePosition | undefined,
  change: ChangePosition | undefined
): BeliefConflicts {
  const primary = primaryValue(values);
  const map = BELIEF_VALUE_ALIGNMENT[primary.toLowerCase() as keyof typeof BELIEF_VALUE_ALIGNMENT];
  const knowledgeConflict = primary === 'Truth'     && knowledge === map.conflicting;
  const changeConflict    = primary === 'Stability' && change    === map.conflicting;
  const ritualConflict    = primary === 'Agency'    && ritual    === map.conflicting;
  return {
    ritual:    ritualConflict,
    knowledge: knowledgeConflict,
    change:    changeConflict,
    any:       ritualConflict || knowledgeConflict || changeConflict,
  };
}

export interface Faction {
  id: string;
  name: string;
  represents: string;
  type: GroupType;
  coreTenet: string;
  certainOf: string;
  rightAbout: string;
  afraidOf: string;
  wrongAbout: string;
  singleSentence: string;
  ritual?: RitualPosition;
  knowledge?: KnowledgePosition;
  change?: ChangePosition;
  values: ValueVector;
  active: boolean;
  notes?: string;
  sortOrder: number;
}

export interface ColonyState {
  id: string;
  partyName: string;
  act: number;
  week: number;
  colonyStress: number;
  darkwingRitual: RitualPosition;
  darkwingKnowledge: KnowledgePosition;
  darkwingChange: ChangePosition;
  darkwingValues: ValueVector;
  sessionSummary?: string;
  dominantFactions?: string;
  influenceNotes?: string;
  majorConsequences?: string;
}

export interface RelationshipOverride {
  id: string;
  sourceId: string;
  targetId: string;
  scoreBump: number;
  notes?: string;
}

export interface RulesConfig {
  id: string;
  beliefMatch: number;
  beliefConflict: number;
  valueAlignmentScale: number;
  valueConflictScale: number;
  stressPositiveMultiplierPerPoint: number;
  stressNegativeMultiplierPerPoint: number;
  positiveEnabled: boolean;
  negativeEnabled: boolean;
  thresholdsJson: string;
  influenceConvictionScale: number; // caps max conviction bonus from faction peers (default 0.5)
}

export interface RelationshipContributions {
  ritual: number;
  knowledge: number;
  change: number;
  valueAlignment: number;
  valueConflict: number;
}

export interface RelationshipBreakdown {
  sourceId: string;
  targetId: string;
  baseScore: number;
  stressedScore: number;
  manualBump: number;
  finalScore: number;
  label: RelationshipLabel;
  contributions: RelationshipContributions;
}

export interface SessionLogEntry {
  id: string;
  date: string;
  act: number;
  week: number;
  summary?: string;
  darkwingActions?: string;
  factionChanges?: string;
  colonyStressChange: number;
  relationshipBumps?: string;
  futureConsequences?: string;
}

export interface RelationshipThreshold {
  label: RelationshipLabel;
  minScore: number;
}

// ── Character System ───────────────────────────────────────────────────────

export type CharacterType = 'NPC' | 'PartyMember' | 'FactionLeader';
export type DoubtDirection = 'Truth' | 'Stability' | 'Agency';

export interface Character {
  id: string;
  name: string;
  characterType: CharacterType;

  // Pathfinder (optional)
  ancestry?: string;
  heritage?: string;
  class?: string;
  background?: string;
  level?: number;

  // Demographics
  gender?: string;
  age?: number;
  occupation?: string;

  // Narrative
  summary?: string;
  goals?: string;
  fears?: string;
  notes?: string;

  // Membership
  factionId?: string;
  socialClassId?: string;

  // Personal value vector (sum = 1)
  values: ValueVector;

  // Belief overrides — when set, these take precedence over derived beliefs
  ritual?: RitualPosition;
  knowledge?: KnowledgePosition;
  change?: ChangePosition;

  // Doubt system
  doubtDirection?: DoubtDirection;
  conviction: number;   // 0–100
  pressure: number;     // 0–100

  // Influence system
  influence: number;      // 0–100: stabilizing effect this character exerts on faction-mates
  impressionable: number; // 0–100: how strongly this character is affected by faction peers' influence
}

/**
 * Derives belief positions from a value vector using per-axis thresholds.
 * Each belief axis maps to the value that most strongly "cares" about it:
 *   knowledge ← truth (Revealed if truth dominant, Hidden if agency dominant, else Controlled)
 *   change    ← stability (No if stability dominant, Yes if agency dominant — no neutral)
 *   ritual    ← agency (Bad if agency dominant, Good if truth dominant, else Neutral)
 * Characters near the center (no axis > 0.4) get all neutral/buffer positions,
 * falling back to pure value alignment in scoring.
 */
export function deriveBeliefs(values: ValueVector): { ritual: RitualPosition; knowledge: KnowledgePosition; change: ChangePosition } {
  const THRESHOLD = 0.4;
  const knowledge: KnowledgePosition =
    values.truth   >= THRESHOLD ? 'Revealed'   :
    values.agency  >= THRESHOLD ? 'Hidden'      : 'Controlled';
  const ritual: RitualPosition =
    values.agency  >= THRESHOLD ? 'Bad'         :
    values.truth   >= THRESHOLD ? 'Good'        : 'Neutral';
  const change: ChangePosition =
    values.stability >= THRESHOLD ? 'No' : 'Yes';
  return { ritual, knowledge, change };
}

/** Returns the character's effective beliefs: overrides where set, derived elsewhere. */
export function effectiveBeliefs(character: Character): { ritual: RitualPosition; knowledge: KnowledgePosition; change: ChangePosition } {
  const derived = deriveBeliefs(character.values);
  return {
    ritual:    character.ritual    ?? derived.ritual,
    knowledge: character.knowledge ?? derived.knowledge,
    change:    character.change    ?? derived.change,
  };
}

/** Linearly interpolates between two normalized ValueVectors and renormalizes. */
export function lerpValueVector(a: ValueVector, b: ValueVector, t: number): ValueVector {
  const raw = {
    truth:     a.truth     + (b.truth     - a.truth)     * t,
    stability: a.stability + (b.stability - a.stability) * t,
    agency:    a.agency    + (b.agency    - a.agency)    * t,
  };
  const sum = raw.truth + raw.stability + raw.agency || 1;
  return { truth: raw.truth / sum, stability: raw.stability / sum, agency: raw.agency / sum };
}

/** Base pressure stored on the character, adjusted manually by the user (0–100). */
export function basePressure(character: Character): number {
  return character.pressure;
}

/**
 * Effective pressure = base pressure + (colonyStress * 10).
 * Colony stress is treated as a percentage contribution: stress 5 → +50.
 * Can exceed 100; callers display values above 100 as "MAX".
 */
export function effectivePressure(character: Character, colonyStress: number): number {
  return character.pressure + colonyStress * 10;
}

/** Drift score using the effective (stress-adjusted) pressure. */
export function effectiveDriftScore(character: Character, colonyStress: number): number {
  return effectivePressure(character, colonyStress) - character.conviction;
}

/** Legacy drift score (ignores colony stress). */
export function driftScore(character: Character): number {
  return character.pressure - character.conviction;
}

/**
 * Conviction bonus granted to `character` by the influence of their faction peers.
 * factionPeers: all characters in the same faction except `character` itself.
 * bonus = mean(peer.influence) × (character.impressionable / 100) × scale
 */
export function influenceConvictionBonus(
  character: Character,
  factionPeers: Character[],
  scale: number
): number {
  if (factionPeers.length === 0) return 0;
  const avgInfluence = factionPeers.reduce((s, p) => s + p.influence, 0) / factionPeers.length;
  return avgInfluence * (character.impressionable / 100) * scale;
}

/**
 * Effective conviction after accounting for faction peer influence.
 * The bonus is additive; no hard cap — a very influential faction can push
 * effective conviction above 100, which simply makes drift score more negative.
 */
export function effectiveConviction(
  character: Character,
  factionPeers: Character[],
  scale: number
): number {
  return character.conviction + influenceConvictionBonus(character, factionPeers, scale);
}

/**
 * Drift score with influence applied to conviction.
 * Use this instead of effectiveDriftScore when you have faction peer data.
 */
export function effectiveDriftScoreWithInfluence(
  character: Character,
  colonyStress: number,
  factionPeers: Character[],
  scale: number
): number {
  return effectivePressure(character, colonyStress) - effectiveConviction(character, factionPeers, scale);
}

/**
 * Computes the drift target in barycentric space: the point on the opposite edge
 * of the triangle where the doubted component reaches zero, preserving the ratio
 * of the other two components. This is the furthest the character could drift.
 */
export function computeDriftTarget(values: ValueVector, doubtDirection: DoubtDirection): ValueVector {
  const key = doubtDirection.toLowerCase() as keyof ValueVector;
  const zeroed: ValueVector = { ...values, [key]: 0 };
  const sum = zeroed.truth + zeroed.stability + zeroed.agency || 1;
  return { truth: zeroed.truth / sum, stability: zeroed.stability / sum, agency: zeroed.agency / sum };
}

export interface FactionCompatibility {
  factionId: string;
  score: number;
}

/**
 * Scores character-to-faction compatibility using the same relationship formula
 * as faction-to-faction scoring (scales 5/3). Belief contributions are derived
 * from the character's value vector unless overrides are set on the character.
 */
export function scoreFactionCompatibility(
  characterValues: ValueVector,
  characterBeliefs: { ritual: RitualPosition; knowledge: KnowledgePosition; change: ChangePosition },
  faction: Faction
): number {
  const sv = characterValues;

  const ritualScore    = scoreBelief(characterBeliefs.ritual,    faction.ritual,    r => r === 'Neutral',    2.5, -1.0) * sv.agency;
  const knowledgeScore = scoreBelief(characterBeliefs.knowledge, faction.knowledge, k => k === 'Controlled', 2.5, -1.0) * sv.truth;
  const changeScore    = scoreBelief(characterBeliefs.change,    faction.change,    () => false,             2.5, -1.0) * sv.stability;

  const alignment = dot(sv, faction.values)             * 5;
  const conflict  = dot(sv, inverseVector(faction.values)) * 3;

  return Math.round((ritualScore + knowledgeScore + changeScore + alignment - conflict) * 10) / 10;
}

function scoreBelief<T>(
  a: T | undefined, b: T | undefined,
  isBuffer: (v: T) => boolean,
  matchScore: number, conflictScore: number
): number {
  if (a == null || b == null) return 0;
  if (isBuffer(a) || isBuffer(b)) return 0;
  return a === b ? matchScore : conflictScore;
}

export function topCompatibleFactions(
  character: { values: ValueVector; ritual?: RitualPosition; knowledge?: KnowledgePosition; change?: ChangePosition },
  factions: Faction[]
): FactionCompatibility[] {
  const beliefs = {
    ritual:    character.ritual    ?? deriveBeliefs(character.values).ritual,
    knowledge: character.knowledge ?? deriveBeliefs(character.values).knowledge,
    change:    character.change    ?? deriveBeliefs(character.values).change,
  };
  return factions
    .map(f => ({ factionId: f.id, score: scoreFactionCompatibility(character.values, beliefs, f) }))
    .sort((a, b) => b.score - a.score);
}

// Returns the top N active factions (excluding self, Factions only) sorted by highest dot product —
// shared desires and shared sacrifices signal natural alignment.
export function mostAlignedFactions(faction: Faction, others: Faction[], n = 3): Faction[] {
  return others
    .filter(f => f.id !== faction.id && f.active && f.type === 'Faction')
    .sort((a, b) => dot(faction.values, b.values) - dot(faction.values, a.values))
    .slice(0, n);
}

// Returns the top N active factions (excluding self, Factions only) sorted by lowest dot product —
// one faction desires what the other sacrifices, producing natural opposition.
export function mostOpposedFactions(faction: Faction, others: Faction[], n = 3): Faction[] {
  return others
    .filter(f => f.id !== faction.id && f.active && f.type === 'Faction')
    .sort((a, b) => dot(faction.values, a.values) - dot(faction.values, b.values))
    .slice(0, n);
}
