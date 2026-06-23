export type BeliefPosition = 'positive' | 'neutral' | 'negative';
export type CoreValue = 'A' | 'B' | 'C';

// ── Campaign ───────────────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id: string;
  activeCampaignId: string;
  activeCampaign?: Campaign;
}

// ── Display Labels ─────────────────────────────────────────────────────────

export interface ValueLabels {
  a: string;       // Value A (was: truth)
  b: string;       // Value B (was: stability)
  c: string;       // Value C (was: agency)
  edgeAC: string;  // ternary edge between Value A and Value C vertices
  edgeAB: string;  // ternary edge between Value A and Value B vertices
  edgeBC: string;  // ternary edge between Value B and Value C vertices
}

// A single unified shape for every belief axis.
// type='opinion' uses all three BeliefPosition slots; type='boolean' uses positive/negative only.
export interface BeliefAxisConfig {
  axisName: string;
  type: 'opinion' | 'boolean';
  positiveAligns: boolean;  // true → 'positive' aligns with this value (e.g. Revealed=Truth); false → 'negative' aligns (e.g. No Change=Stability)
  positive: string;
  neutral: string;               // only shown when type='opinion'
  negative: string;
}

export interface BeliefAxisLabels {
  a: BeliefAxisConfig;  // knowledge axis — aligns with Value A
  b: BeliefAxisConfig;  // change axis    — aligns with Value B
  c: BeliefAxisConfig;  // ritual axis    — aligns with Value C
}

export const DEFAULT_VALUE_LABELS: ValueLabels = {
  a: 'Truth',
  b: 'Stability',
  c: 'Agency',
  edgeAC: 'Justice',
  edgeAB: 'Accountability',
  edgeBC: 'Prosperity',
};

export const DEFAULT_BELIEF_AXIS_LABELS: BeliefAxisLabels = {
  a: { axisName: 'Knowledge', type: 'opinion', positiveAligns: true,  positive: 'Revealed', neutral: 'Controlled', negative: 'Hidden' },
  b: { axisName: 'Change',    type: 'boolean', positiveAligns: false, positive: 'Yes',      neutral: 'Neutral',    negative: 'No'     },
  c: { axisName: 'Ritual',    type: 'opinion', positiveAligns: false, positive: 'Good',     neutral: 'Neutral',    negative: 'Bad'    },
};

// Returns the engine positions available for an axis. For 'boolean' type, neutral is omitted.
export function beliefAxisOptions(cfg: BeliefAxisConfig): BeliefPosition[] {
  return cfg.type === 'opinion' ? ['positive', 'neutral', 'negative'] : ['positive', 'negative'];
}

// Returns the display label for a BeliefPosition on an axis.
export function beliefPositionLabel(position: BeliefPosition, cfg: BeliefAxisConfig): string {
  return cfg[position] || position;
}
export type RelationshipLabel = 'Aligned' | 'Cooperative' | 'Friendly' | 'Tolerated' | 'Strained' | 'Opposed' | 'Hostile';
export type GroupType = 'Faction' | 'SocialClass';

export interface ValueVector {
  a: number;  // 0–1, was: truth
  b: number;  // 0–1, was: stability
  c: number;  // 0–1; a + b + c = 1
}

export function dot(a: ValueVector, b: ValueVector): number {
  return a.a * b.a + a.b * b.b + a.c * b.c;
}

export function inverseVector(v: ValueVector): ValueVector {
  return { a: 1 - v.a, b: 1 - v.b, c: 1 - v.c };
}

export function primaryValue(v: ValueVector): CoreValue {
  if (v.a >= v.b && v.a >= v.c) return 'A';
  if (v.b >= v.c) return 'B';
  return 'C';
}

export function secondaryValue(v: ValueVector): CoreValue {
  const sorted = (['a', 'b', 'c'] as const)
    .map(k => ({ key: k, val: v[k] }))
    .sort((a, b) => b.val - a.val);
  return sorted[1].key.toUpperCase() as CoreValue;
}

export function sacrificedValue(v: ValueVector): CoreValue {
  if (v.a <= v.b && v.a <= v.c) return 'A';
  if (v.b <= v.c) return 'B';
  return 'C';
}

export interface BeliefConflicts {
  beliefc:   boolean;
  beliefa:   boolean;
  beliefb:   boolean;
  any:       boolean;
}

// Which BeliefPosition is aligned with a high score on the corresponding value axis?
// positiveAligns=true  → 'positive' is aligned (e.g. Knowledge: Revealed=high Truth)
// positiveAligns=false → 'negative' is aligned (e.g. Change: No=high Stability; Ritual: Bad=high Agency)
function alignedPosition(cfg: BeliefAxisConfig): BeliefPosition {
  return cfg.positiveAligns ? 'positive' : 'negative';
}

export function beliefConflicts(
  values: ValueVector,
  beliefc: BeliefPosition | undefined,
  beliefa: BeliefPosition | undefined,
  beliefb: BeliefPosition | undefined,
  axisLabels: BeliefAxisLabels
): BeliefConflicts {
  const primary = primaryValue(values);
  const beliefaConflict = primary === 'A' && beliefa != null && beliefa !== 'neutral' && beliefa !== alignedPosition(axisLabels.a);
  const beliefbConflict = primary === 'B' && beliefb != null && beliefb !== 'neutral' && beliefb !== alignedPosition(axisLabels.b);
  const beliefcConflict = primary === 'C' && beliefc != null && beliefc !== 'neutral' && beliefc !== alignedPosition(axisLabels.c);
  return {
    beliefc:   beliefcConflict,
    beliefa:   beliefaConflict,
    beliefb:   beliefbConflict,
    any:       beliefcConflict || beliefaConflict || beliefbConflict,
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
  beliefc?: BeliefPosition;
  beliefa?: BeliefPosition;
  beliefb?: BeliefPosition;
  values: ValueVector;
  active: boolean;
  notes?: string;
  sortOrder: number;
  baseInfluence: number;
  momentum: number;
  legitimacy: number;
}

export interface ColonyState {
  id: string;
  partyName: string;
  act: number;
  week: number;
  colonyStress: number;
  partyBeliefc: BeliefPosition;
  partyBeliefa: BeliefPosition;
  partyBeliefb: BeliefPosition;
  partyValues: ValueVector;
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

// ── Formulas Config ────────────────────────────────────────────────────────
// Magic-number weights used in the influence and belief derivation engines.

export interface FormulasConfig {
  // Faction influence blend: characterInfluence = avg * memberAvgWeight + max * memberMaxWeight
  memberAvgWeight: number;           // default 0.6
  memberMaxWeight: number;           // default 0.4
  // Total influence blend: base * baseWeight + charInfluence * charWeight + momentum * momentumWeight
  baseInfluenceWeight: number;       // default 0.45
  charInfluenceWeight: number;       // default 0.35
  momentumInfluenceWeight: number;   // default 0.20
  // Effective power: totalInfluence × (legitimacyBase + legitimacy / legitimacyScale)
  legitimacyBase: number;            // default 0.5
  legitimacyScale: number;           // default 100
  // Leaderless penalty: if no alive FactionLeader exists, multiply effective power by this
  leaderlessPowerMultiplier: number; // default 0.75
  // Belief derivation: value axis must exceed this to assign a non-neutral position
  beliefDerivationThreshold: number; // default 0.4
}

export const DEFAULT_FORMULAS: FormulasConfig = {
  memberAvgWeight:            0.6,
  memberMaxWeight:            0.4,
  baseInfluenceWeight:        0.45,
  charInfluenceWeight:        0.35,
  momentumInfluenceWeight:    0.20,
  legitimacyBase:             0.5,
  legitimacyScale:            100,
  leaderlessPowerMultiplier:  0.75,
  beliefDerivationThreshold:  0.4,
};

// ── Session Effect Descriptors (single source of truth) ───────────────────
// Used by both the session event editor and the cascade event rule trigger.
// inputType 'delta'  → numeric stepper (delta field)
// inputType 'select' → string value dropdown (value field, options provided)
// inputType 'none'   → no value input (e.g. factionChange uses a separate target select)

export interface EffectPropDescriptor {
  property: string;
  label: string;
  inputType: 'delta' | 'select' | 'none';
  selectOptions?: { value: string; label: string }[];
  needsSecondaryTarget?: boolean;  // true for relationshipBump
}

export const CHARACTER_STATE_OPTIONS: { value: CharacterState; label: string }[] = [
  { value: 'Alive',    label: 'Alive' },
  { value: 'Dead',     label: 'Dead' },
  { value: 'Missing',  label: 'Missing' },
  { value: 'Forgotten', label: 'Forgotten' },
];

export const FACTION_SUBTYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '',           label: 'Any' },
  { value: 'Faction',    label: 'Faction' },
  { value: 'SocialClass', label: 'Social Class' },
];

export const CHARACTER_SUBTYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '',             label: 'Any' },
  { value: 'FactionLeader', label: 'Faction Leader' },
  { value: 'NPC',           label: 'NPC' },
  { value: 'PartyMember',   label: 'Party Member' },
];

export const FACTION_EFFECT_PROPS: EffectPropDescriptor[] = [
  { property: 'momentum',              label: 'Momentum',              inputType: 'delta' },
  { property: 'legitimacy',            label: 'Legitimacy',            inputType: 'delta' },
  { property: 'relationshipBump',      label: 'Relationship Bump',     inputType: 'delta', needsSecondaryTarget: true },
  { property: 'partyRelationshipBump', label: 'Party Rel. Bump',       inputType: 'delta' },
];

export const CHARACTER_EFFECT_PROPS: EffectPropDescriptor[] = [
  { property: 'pressure',    label: 'Pressure',    inputType: 'delta' },
  { property: 'influence',   label: 'Influence',   inputType: 'delta' },
  { property: 'state',       label: 'State',       inputType: 'select', selectOptions: CHARACTER_STATE_OPTIONS },
  { property: 'factionChange', label: 'Faction Change', inputType: 'none' },
];

export const COLONY_EFFECT_PROPS: EffectPropDescriptor[] = [
  { property: 'stress', label: 'Stress', inputType: 'delta' },
];

// ── Cascade Rules ──────────────────────────────────────────────────────────
// Rules fire each session when their trigger condition is met.
// triggerType 'streak': source property moved in the same direction for
//   minConsecutiveWeeks sessions.
// triggerType 'threshold': source property's current value is above/below
//   a fixed value.
// triggerType 'event': fires when an entity matching sourceEntitySubtype has
//   its sourceProperty set/changed during this session. For select-type
//   properties (e.g. state), sourcePropertyValue narrows to a specific value.
// effectType 'multiplier': multiplies the change that already happened to
//   the source property by `multiplier` and applies the result to the target.
// effectType 'flat': adds `flatDelta` directly to the target property.

export type FactionSourceProp = 'momentum' | 'legitimacy';
export type CharacterSourceProp = 'pressure' | 'conviction' | 'influence' | 'impressionable';
export type FactionTargetProp = 'momentum' | 'legitimacy';
export type CharacterTargetProp = 'pressure' | 'conviction' | 'influence' | 'impressionable';

export interface CascadeRule {
  id: string;
  label: string;

  // ── Trigger ──
  triggerType: 'streak' | 'threshold' | 'event';
  sourceEntityType: 'faction' | 'character';
  sourceProperty: string;
  // streak trigger
  direction?: 'positive' | 'negative' | 'either';
  minConsecutiveWeeks?: number;
  // threshold trigger
  thresholdOperator?: 'gt' | 'lt';
  thresholdValue?: number;
  // event trigger
  sourceEntitySubtype?: string;     // e.g. 'FactionLeader', 'Faction', 'SocialClass', '' = any
  sourcePropertyValue?: string[];   // for select-type properties; any listed value matches (OR logic)

  // ── Effect ──
  effectType: 'multiplier' | 'flat';
  targetEntityType: 'faction' | 'character';
  targetProperty: FactionTargetProp | CharacterTargetProp;
  // multiplier effect
  multiplier?: number;
  // flat effect
  flatDelta?: number;
}

export const DEFAULT_CASCADE_RULES: CascadeRule[] = [
  { id: 'neg-2', label: '2+ negative weeks',  triggerType: 'streak', sourceEntityType: 'faction', sourceProperty: 'momentum', direction: 'negative', minConsecutiveWeeks: 2, effectType: 'multiplier', targetEntityType: 'faction', targetProperty: 'legitimacy', multiplier: 2 },
  { id: 'neg-3', label: '3+ negative weeks',  triggerType: 'streak', sourceEntityType: 'faction', sourceProperty: 'momentum', direction: 'negative', minConsecutiveWeeks: 3, effectType: 'multiplier', targetEntityType: 'faction', targetProperty: 'legitimacy', multiplier: 3 },
  { id: 'pos-2', label: '2+ positive weeks',  triggerType: 'streak', sourceEntityType: 'faction', sourceProperty: 'momentum', direction: 'positive', minConsecutiveWeeks: 2, effectType: 'multiplier', targetEntityType: 'faction', targetProperty: 'legitimacy', multiplier: 2 },
  { id: 'pos-3', label: '3+ positive weeks',  triggerType: 'streak', sourceEntityType: 'faction', sourceProperty: 'momentum', direction: 'positive', minConsecutiveWeeks: 3, effectType: 'multiplier', targetEntityType: 'faction', targetProperty: 'legitimacy', multiplier: 3 },
];

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

  // Display labels — stored as JSON strings in the DB, decoded by the store
  valueLabelsJson: string;
  beliefAxisLabelsJson: string;

  // Cascade rules — stored as JSON; empty string = use client defaults
  cascadeRulesJson: string;

  // Formula weights — stored as JSON; empty string = use client defaults
  formulasJson: string;

  // Stress-weight composition
  stressWeightEnabled: boolean;
  stressWeightCurve: StressWeightCurve;
  stressWeightIntensity: number;
}

export type StressWeightCurve = 'Linear' | 'Quadratic' | 'Cubic' | 'Exponential';

export interface RelationshipContributions {
  beliefc: number;
  beliefa: number;
  beliefb: number;
  valueAlignment: number;
  valueConflict: number;
  beliefSubScore: number;
  valueSubScore: number;
  stressWeight: number;
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
  partyActions?: string;
  factionChanges?: string;
  colonyStressChange: number;
  relationshipBumps?: string;
  futureConsequences?: string;
}

// ── Sessions & Events ──────────────────────────────────────────────────────

export interface Session {
  id: string;
  number: number;
  title: string;
  act: number;
  week: number;
  date?: string;
  summary?: string;
  events: CampaignEvent[];
}

export interface EventEffect {
  id: string;
  eventId: string;
  targetType: string;   // "colony" | "faction" | "character"
  targetId: string;
  // colony: "stress"
  // faction: "momentum" | "legitimacy" | "relationshipBump" | "partyRelationshipBump"
  // character: "pressure" | "influence" | "state" | "factionChange"
  property: string;
  delta: number;                  // numeric effects
  value?: string;                 // non-numeric effects: CharacterState or factionId
  secondaryTargetId?: string;     // relationship bumps: the other faction id
}

export interface CampaignEvent {
  id: string;
  sessionId: string;
  title: string;
  description?: string;
  sortOrder: number;
  effects: EventEffect[];
}

export interface DerivedEffect {
  ruleId: string;
  ruleLabel: string;
  // source
  sourceEntityType: 'faction' | 'character';
  sourceEntityId: string;
  sourceProperty: string;
  // trigger context
  triggerType: 'streak' | 'threshold' | 'event';
  consecutiveWeeks?: number;       // streak trigger
  direction?: 'positive' | 'negative'; // streak trigger
  thresholdValue?: number;         // threshold trigger
  eventCharacterType?: string;     // event trigger: which character type fired it
  eventStateValue?: string;        // event trigger: which state value was matched
  // effect
  targetEntityType: 'faction' | 'character';
  targetEntityId: string;
  targetProperty: string;
  delta: number;                   // change applied (positive = gain, negative = drain)
  // convenience aliases kept for backward compat with sessions display
  /** @deprecated use sourceEntityId */ factionId?: string;
  /** @deprecated use delta */ legitimacyChange?: number;
}

// Computed from session events against baseline world state
export interface ColonySnapshot {
  sessionId: string;
  sessionNumber: number;
  colonyStress: number;
  factionMomentum: Record<string, number>;     // factionId → momentum
  factionLegitimacy: Record<string, number>;   // factionId → legitimacy
  characterPressure: Record<string, number>;   // characterId → pressure
  characterInfluence: Record<string, number>;  // characterId → influence
  characterStates: Record<string, CharacterState>;   // characterId → state at this point
  characterFactions: Record<string, string | undefined>; // characterId → factionId at this point
  // cumulative relationship bumps added via session effects (compound per session pair)
  factionRelationshipBumps: Record<string, Record<string, number>>; // sourceId → targetId → bump
  factionPartyBumps: Record<string, number>;   // factionId → cumulative party bump
  derivedEffects: DerivedEffect[];             // computed momentum cascade effects this session
}

export interface ColonyImpact {
  stressDelta: number;
  momentumChanges: { factionId: string; delta: number }[];
  legitimacyChanges: { factionId: string; delta: number }[];
  characterDeaths: string[];
  defections: { characterId: string; fromFactionId: string; toFactionId: string }[];
  factionRelationshipChanges: { sourceId: string; targetId: string; delta: number }[];
  partyRelationshipChanges: { factionId: string; delta: number }[];
  characterStateChanges: { characterId: string; state: CharacterState }[];
  characterFactionChanges: { characterId: string; newFactionId: string }[];
}

export interface RelationshipThreshold {
  label: RelationshipLabel;
  minScore: number;
}

// ── Character System ───────────────────────────────────────────────────────

export type CharacterType = 'NPC' | 'PartyMember' | 'FactionLeader';
export type DoubtDirection = 'a' | 'b' | 'c';
export type CharacterState = 'Alive' | 'Dead' | 'Missing' | 'Forgotten';

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
  beliefc?: BeliefPosition;
  beliefa?: BeliefPosition;
  beliefb?: BeliefPosition;

  // Doubt system
  doubtDirection?: DoubtDirection;
  conviction: number;   // 0–100
  pressure: number;     // 0–100

  // Influence system
  influence: number;      // 0–100: stabilizing effect this character exerts on faction-mates
  impressionable: number; // 0–100: how strongly this character is affected by faction peers' influence

  // Narrative state
  state: CharacterState;
}

/**
 * Derives belief positions from a value vector using per-axis thresholds.
 *   knowledge ← A axis: A dominant → positive, C dominant → negative, else neutral
 *   change    ← B axis: B dominant → negative, C dominant → positive, else neutral/positive
 *   ritual    ← C axis: C dominant → negative, A dominant → positive, else neutral
 */
export function deriveBeliefs(
  values: ValueVector,
  threshold = 0.4,
  axisLabels: BeliefAxisLabels = DEFAULT_BELIEF_AXIS_LABELS
): { beliefc: BeliefPosition; beliefa: BeliefPosition; beliefb: BeliefPosition } {
  // beliefa ← A axis: A dominant → positive, C dominant → negative, else neutral
  const beliefa: BeliefPosition =
    values.a >= threshold ? 'positive' :
    values.c >= threshold ? 'negative' : 'neutral';

  // beliefc ← C axis: C dominant → negative, A dominant → positive, else neutral
  const beliefc: BeliefPosition =
    values.c >= threshold ? 'negative' :
    values.a >= threshold ? 'positive' : 'neutral';

  // beliefb ← B axis: B dominant → negative (status quo); C dominant → positive (change); else neutral/positive
  const bIsOpinion = axisLabels.b.type === 'opinion';
  const beliefb: BeliefPosition = bIsOpinion
    ? (values.b >= threshold ? 'negative' : values.c >= threshold ? 'positive' : 'neutral')
    : (values.b >= threshold ? 'negative' : 'positive');

  return { beliefc, beliefa, beliefb };
}

/** Returns the character's effective beliefs: overrides where set, derived elsewhere. */
export function effectiveBeliefs(character: Character): { beliefc: BeliefPosition; beliefa: BeliefPosition; beliefb: BeliefPosition } {
  const derived = deriveBeliefs(character.values);
  return {
    beliefc:   character.beliefc ?? derived.beliefc,
    beliefa:   character.beliefa ?? derived.beliefa,
    beliefb:   character.beliefb ?? derived.beliefb,
  };
}

/** Linearly interpolates between two normalized ValueVectors and renormalizes. */
export function lerpValueVector(a: ValueVector, b: ValueVector, t: number): ValueVector {
  const raw = {
    a: a.a + (b.a - a.a) * t,
    b: a.b + (b.b - a.b) * t,
    c: a.c + (b.c - a.c) * t,
  };
  const sum = raw.a + raw.b + raw.c || 1;
  return { a: raw.a / sum, b: raw.b / sum, c: raw.c / sum };
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
  const sum = zeroed.a + zeroed.b + zeroed.c || 1;
  return { a: zeroed.a / sum, b: zeroed.b / sum, c: zeroed.c / sum };
}

export interface FactionCompatibility {
  factionId: string;
  score: number;
}

/**
 * Scores character-to-faction compatibility using the same relationship formula
 * as faction-to-faction scoring (scales 5/3). BeliefPosition 'neutral' always counts as buffer (score 0).
 */
export function scoreFactionCompatibility(
  characterValues: ValueVector,
  characterBeliefs: { beliefc: BeliefPosition; beliefa: BeliefPosition; beliefb: BeliefPosition },
  faction: Faction
): number {
  const sv = characterValues;

  const beliefcScore = scoreBelief(characterBeliefs.beliefc, faction.beliefc, r => r === 'neutral', 2.5, -1.0) * sv.c;
  const beliefaScore = scoreBelief(characterBeliefs.beliefa, faction.beliefa, k => k === 'neutral', 2.5, -1.0) * sv.a;
  const beliefbScore = scoreBelief(characterBeliefs.beliefb, faction.beliefb, c => c === 'neutral', 2.5, -1.0) * sv.b;

  const alignment = dot(sv, faction.values)             * 5;
  const conflict  = dot(sv, inverseVector(faction.values)) * 3;

  return Math.round((beliefcScore + beliefaScore + beliefbScore + alignment - conflict) * 10) / 10;
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
  character: { values: ValueVector; beliefc?: BeliefPosition; beliefa?: BeliefPosition; beliefb?: BeliefPosition },
  factions: Faction[],
  beliefThreshold = 0.4,
  axisLabels: BeliefAxisLabels = DEFAULT_BELIEF_AXIS_LABELS
): FactionCompatibility[] {
  const derived = deriveBeliefs(character.values, beliefThreshold, axisLabels);  // axisLabels drives beliefb-axis type only
  const beliefs = {
    beliefc:   character.beliefc ?? derived.beliefc,
    beliefa:   character.beliefa ?? derived.beliefa,
    beliefb:   character.beliefb ?? derived.beliefb,
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
