import type { MomentumResolution, MomentumSignal } from '../sim/momentum';

export type BeliefPosition = 'positive' | 'neutral' | 'negative';
export type CoreValue = 'A' | 'B' | 'C';

// ── Campaign ───────────────────────────────────────────────────────────────

export type CampaignMode = 'Design' | 'Live';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  // M1 lifecycle (server-controlled): Live locks baseline simulation fields; activation is one-way.
  mode?: CampaignMode;
  activatedAt?: string;
  historyVersion?: number;
}

export interface RulesVersion {
  id: string;
  campaignId: string;
  version: number;
  rulesJson: string;
  engineVersion: string;
  effectiveFromEventId?: string;
  createdAt: string;
}

export type ColonyTurnStatus = 'Draft' | 'Committed' | 'Voided';
export type ColonyTurnPhaseKind = 'Opening' | 'FactionPhase' | 'CharacterPhase' | 'Publish';

export interface ColonyTurnPhase {
  id: string;
  colonyTurnId: string;
  ordinal: number;
  kind: ColonyTurnPhaseKind;
  status: ColonyTurnStatus;
  frozenInputsJson: string;
  frozenInputsHash: string;
  resultsJson: string;
  historyVersion: number;
  committedAt: string;
}

export interface ColonyTurn {
  id: string;
  campaignId: string;
  sessionId: string;
  eventId: string;
  seed: number;
  status: ColonyTurnStatus;
  rulesVersionId?: string;
  engineVersion: string;
  createdAt: string;
  committedAt?: string;
  phases: ColonyTurnPhase[];
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

// A single unified shape for every belief axis. Every axis has three positions (scoring audit): `type` is kept for
// stored JSON compatibility but no longer changes derivation, scoring or the options offered.
export interface BeliefAxisConfig {
  axisName: string;
  /** @deprecated every axis is three-position; 'boolean' is ignored */ type: 'opinion' | 'boolean';
  positiveAligns: boolean;  // true → 'positive' aligns with this value (e.g. Revealed=Truth); false → 'negative' aligns (e.g. No Change=Stability)
  positive: string;
  neutral: string;               // the middle position (a position in its own right, not an absence of opinion)
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
  b: { axisName: 'Change',    type: 'opinion', positiveAligns: false, positive: 'Yes',      neutral: 'Neutral',    negative: 'No'     },
  c: { axisName: 'Ritual',    type: 'opinion', positiveAligns: false, positive: 'Good',     neutral: 'Neutral',    negative: 'Bad'    },
};

// Returns the engine positions available for an axis: always all three.
export function beliefAxisOptions(_cfg: BeliefAxisConfig): BeliefPosition[] {
  return ['positive', 'neutral', 'negative'];
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

// ── Value geometry for relationship scoring (SCORING-AUDIT.md) ──────────────
// The former alignment/conflict pair reduced to one dot product, which scores a zealot above an identical twin.
// These measure position on the ternary instead.

/** Normalized Manhattan distance on the ternary: 0 for identical positions … 1 for opposite corners. */
export function valueDistance(s: ValueVector, t: ValueVector): number {
  return (Math.abs(s.a - t.a) + Math.abs(s.b - t.b) + Math.abs(s.c - t.c)) / 2;
}

/** Symmetric similarity, 1 − 2·distance: +1 for identical positions anywhere (including the centre) … −1. */
export function valueSimilarity(s: ValueVector, t: ValueVector): number {
  return 1 - 2 * valueDistance(s, t);
}

/** Directional opposition: how much of what the SOURCE cares about the target lacks, Σ sᵢ·max(0, sᵢ − tᵢ), 0 … 1.
 *  Asymmetric by design: a purist is more put off by a moderate than the moderate is by the purist. */
export function valueOpposition(s: ValueVector, t: ValueVector): number {
  return s.a * Math.max(0, s.a - t.a) + s.b * Math.max(0, s.b - t.b) + s.c * Math.max(0, s.c - t.c);
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

export type BannerShape =
  | 'centered-triangle'
  | 'left-triangle'
  | 'right-triangle'
  | 'inverted-triangle'
  | 'rectangle'
  | 'semi-circle'
  | 'pennant';

export interface Faction {
  /** ADVENTURE-BOOK-PLAN.md §9–12: the entity's canonical file. Set by the server. */
  canonId?: string;
  canonVersion?: string;
  /** True when the canonical file is missing or unreadable: shown flagged, and can't be saved until restored. */
  canonMissing?: boolean;
  id: string;
  name: string;
  represents: string;
  type: GroupType;
  coreTenet: string;
  focus?: string;
  certainOf: string;
  rightAbout: string;
  afraidOf: string;
  wrongAbout: string;
  response?: string;
  summary?: string;
  motto?: string;
  origin?: string;
  foundedAs?: string;
  became?: string;
  publicFace?: string;
  selfImage?: string;
  history?: string;
  glyphPath?: string;
  iconPath?: string;
  primaryColor?: string;
  secondaryColor?: string;
  bannerShape?: BannerShape;
  beliefc?: BeliefPosition;
  beliefa?: BeliefPosition;
  beliefb?: BeliefPosition;
  values: ValueVector;
  active: boolean;
  notes?: string;
  sortOrder: number;
  momentum: number;               // legacy raw Momentum (pre-M3): archived for audit, ignored by the engine
  momentumTier?: number;          // M3: starting Momentum tier, −2..+2 (GM-set baseline; projected to the snapshot tier)
  powerModifier: number;          // retired (M2): stored, never read
  factionSize: number;            // §18.8: total membership, recorded explicitly (not counted from Characters): ⌊÷ 20⌋ People points; changed in play by `factionSize` Effects
  leaderId?: string;
  introducedAtEventId?: string;   // M1: absent from replay before this Event (Live campaigns)
}

export interface ColonyState {
  id: string;
  partyName: string;
  act: number;
  week: number;
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
  // ── Power: capacity channels in plain points (§18.7). Each channel at its threshold is one Power (0–3). ──
  peoplePoints: number;                 // default 10: People = leader bonus + ⌊Faction Size ÷ membersPerPoint⌋ (§18.8)
  leaderBonus: number;                  // default 5: a capable leader (alive, in the faction)
  membersPerPoint: number;              // default 20: Faction Size per People point (whole groups only)
  holdingsPoints: number;               // default 15: Holdings = stars of controlled Operational, Strategic and Covert Assets
  mandatePoints: number;                // default 5: Mandate = stars of controlled Symbolic and Mandate Assets
  // Belief derivation: value axis must exceed this to assign a non-neutral position
  beliefDerivationThreshold: number;    // default 0.5
  operationTarget?: number;             // §18.12 Faction Phase DC: 2d6 + Priority + Momentum ≥ this + the best guard's Priority (10)
  // M6 Character Phase (provisional): effective Pressure = Pressure + Stress × coefficient; Drift Risk bands; roll targets
  stressPressureCoefficient?: number;   // ×5 (was ×10)
  driftWaveringAt?: number;             // Drift Risk ≥ this is Wavering (default 15); > 0 Strained; ≤ 0 Steady
  driftBreakingAt?: number;             // Drift Risk ≥ this is Breaking (default 30)
  driftRollTarget?: number;             // 2d6 + band modifier ≥ this advances one state (default 8)
  defectionTarget?: number;             // 2d6 + label modifier ≥ this defects (default 8)
  // ── Retired by M2 (kept so older stored configs still parse; no longer read by the engine) ──
  /** @deprecated M2 */ memberAvgWeight?: number;
  /** @deprecated M2 */ memberMaxWeight?: number;
  /** @deprecated M2 */ charInfluenceWeight?: number;
  /** @deprecated M2 */ assetInfluenceWeight?: number;
  /** @deprecated M2: Momentum is not a Power input */ momentumInfluenceWeight?: number;
  /** @deprecated M2 */ legitimacyBase?: number;
  /** @deprecated M2 */ legitimacyScale?: number;
  /** @deprecated M2: no leaderless multiplier */ leaderlessPowerMultiplier?: number;
  // ── Retired by §18.7 (stars and members replace scores; Legitimacy retired) ──
  /** @deprecated §18.8 (named members no longer count) */ unnamedPerPoint?: number;
  /** @deprecated §18.7 */ peopleThreshold?: number;
  /** @deprecated §18.7 */ headcountThreshold?: number;
  /** @deprecated §18.7 */ holdingsThreshold?: number;
  /** @deprecated §18.7 */ mandateThreshold?: number;
  /** @deprecated §18.7 */ assetInfluenceScale?: number;
  /** @deprecated §18.7 */ assetLegitimacyScale?: number;
  /** @deprecated §18.7 */ baseLegitimacyWeight?: number;
  /** @deprecated §18.7 */ assetLegitimacyWeight?: number;
}

export const DEFAULT_FORMULAS: FormulasConfig = {
  peoplePoints:               10,    // §18.7 rule definitions (not fitted to the current roster)
  leaderBonus:                5,
  membersPerPoint:            20,
  holdingsPoints:             15,
  mandatePoints:              5,
  beliefDerivationThreshold:  0.5,   // 2026-10-15: a pole only when that Value outweighs the other two combined
  operationTarget:            10,    // 2026-10-22 (§18.12: with the Priority bonus; was 9)
  stressPressureCoefficient:  5,     // M6 (§3.2): ×10 → ×5, provisional
  driftWaveringAt:            15,
  driftBreakingAt:            30,
  driftRollTarget:            8,
  defectionTarget:            8,
};

// ── Session Effect Descriptors (single source of truth) ───────────────────
// Used by the session event editor.
// inputType 'delta'           → numeric stepper (delta field)
// inputType 'select'          → string value dropdown (value field, options provided)
// inputType 'none'            → no value input (e.g. factionChange uses a separate target select)
// inputType 'faction-select'  → faction dropdown stored in value
// inputType 'location-select' → location dropdown stored in value
// inputType 'signal'          → Momentum Signal: +1 / −1 (delta) with a required reason (value)
// inputType 'character-select' → character dropdown stored in value ('' = none)
// inputType 'flag'            → no input: the effect's presence is the fact

export interface EffectPropDescriptor {
  property: string;
  label: string;
  inputType: 'delta' | 'select' | 'none' | 'faction-select' | 'participate' | 'location-select' | 'signal' | 'character-select' | 'flag';
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
  { value: '',           label: 'Any' },
  { value: 'NPC',        label: 'NPC' },
  { value: 'PartyMember', label: 'Party Member' },
];

export const FACTION_EFFECT_PROPS: EffectPropDescriptor[] = [
  // M3: a Momentum Signal (delta ±1, reason in `value`, optional root-cause Effect id in `secondaryTargetId`),
  // resolved at the next Opening. Legacy raw `momentum` effects still replay into the archived raw value only.
  { property: 'momentumSignal',        label: 'Momentum Signal',       inputType: 'signal' },
  { property: 'relationshipBump',      label: 'Relationship Bump',     inputType: 'delta', needsSecondaryTarget: true },
  { property: 'partyRelationshipBump', label: 'Party Rel. Bump',       inputType: 'delta' },
  { property: 'leaderChange',          label: 'Leader Change',         inputType: 'character-select' },   // M4; '' = leaderless
  { property: 'factionSize',           label: 'Faction Size',          inputType: 'delta' },   // §18.8: members gained (+) or lost (−)
];

export const INSTABILITY_OPTIONS: { value: CharacterInstability; label: string }[] = [
  { value: 'Stable', label: 'Stable' }, { value: 'Conflicted', label: 'Conflicted' }, { value: 'Compromised', label: 'Compromised (crisis)' },
];

export const CHARACTER_EFFECT_PROPS: EffectPropDescriptor[] = [
  { property: 'pressure',    label: 'Pressure',    inputType: 'delta' },
  { property: 'influence',   label: 'Influence',   inputType: 'delta' },
  { property: 'state',       label: 'State',       inputType: 'select', selectOptions: CHARACTER_STATE_OPTIONS },
  { property: 'factionChange', label: 'Faction Change', inputType: 'none' },
  { property: 'locationChange', label: 'Location Change', inputType: 'location-select' },
  { property: 'instability', label: 'Instability', inputType: 'select', selectOptions: INSTABILITY_OPTIONS },   // M6: crises in play
];


export interface RulesConfig {
  id: string;
  beliefMatch: number;               // same position
  beliefConflict: number;            // opposite poles
  beliefAdjacent: number;            // middle vs a pole: disagreement, milder than opposite poles
  beliefWeightBlend: number;         // belief weight per axis = blend·(source Value on the axis) + (1 − blend)/3
  valueSimilarityScale: number;      // × valueSimilarity (−1 … +1)
  valueOppositionScale: number;      // × valueOpposition (0 … 1), subtracted
  /** @deprecated pre-audit dot-product scale; unused */ valueAlignmentScale?: number;
  /** @deprecated pre-audit dot-product scale; unused */ valueConflictScale?: number;
  stressPositiveMultiplierPerPoint: number;
  stressNegativeMultiplierPerPoint: number;
  positiveEnabled: boolean;
  negativeEnabled: boolean;
  thresholdsJson: string;
  influenceConvictionScale: number; // caps max conviction bonus from faction peers (default 0.5)

  // Display labels — stored as JSON strings in the DB, decoded by the store
  valueLabelsJson: string;
  beliefAxisLabelsJson: string;

  /** @deprecated §18.10: Cascade Rules are retired; the stored JSON is kept for reference and never executed. */
  cascadeRulesJson: string;

  // Formula weights — stored as JSON; empty string = use client defaults
  formulasJson: string;

  // Stress-weight composition
  stressWeightEnabled: boolean;
  stressWeightCurve: StressWeightCurve;
  stressWeightIntensity: number;

  /** @deprecated §18.10: Stress Triggers are retired; the stored JSON is kept for reference and never executed. */
  stressTriggersJson: string;
}

export type StressWeightCurve = 'Linear' | 'Quadratic' | 'Cubic' | 'Exponential';

export interface RelationshipContributions {
  beliefc: number;
  beliefa: number;
  beliefb: number;
  valueSimilarity: number;    // valueSimilarityScale × similarity (signed)
  valueOpposition: number;    // −valueOppositionScale × opposition (≤ 0)
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
  actorFactionId?: string;        // asset status changes: faction responsible for the change
  // M1 provenance and explicit order within the Event
  origin?: EffectOrigin;
  ordinal?: number;
  phaseId?: string;
}

export type EffectOrigin = 'Manual' | 'Opening' | 'FactionPhase' | 'CharacterPhase' | 'GoalGenerator' | 'MomentumResolution' | 'Consequence' | 'Correction';
export type EventKind = 'Play' | 'ColonyTurn' | 'Correction' | 'MapEdits';

export interface CampaignEvent {
  id: string;
  sessionId: string;
  title: string;
  description?: string;
  sortOrder: number;
  isSynthetic?: boolean;
  kind?: EventKind;
  effects: EventEffect[];
}

/** §18.10: one World Condition's share of Colony Stress, with where it came from. */
export interface StressPart { conditionId: string; title: string; stress: number; origin: string }

// Computed from session events against baseline world state
export interface ColonySnapshot {
  sessionId: string;
  sessionNumber: number;
  colonyStress: number;
  factionMomentum: Record<string, number>;          // factionId → legacy raw momentum (archived; not an engine input since M3)
  factionMomentumTier: Record<string, number>;      // M3: factionId → Momentum tier (−2..+2) in force for this session's play
  momentumResolutions: MomentumResolution[];        // M3: the resolution at the start of this session (the interim Opening)
  pendingMomentumSignals: MomentumSignal[];         // M3: signals recorded this session, resolved at the next Opening
  goalChampions: Record<string, string | null>;    // M4: goalId → champion; null = unassigned (championChange; cleared on defection or retirement)
  factionLeaders: Record<string, string | null>;   // M4: factionId → leader; null = leaderless (leaderChange; cleared when the leader defects)
  goalReady: Record<string, GoalReady>;               // M4: goals with the Ready to Resolve overlay
  goalAccomplishedBy: Record<string, string | null>;  // §18.3: who brought each completion about (attribution only)
  conditionStates: Record<string, ConditionEstablishment>;   // §18.6: World Conditions established or ended by Events
  stressFromConditions: StressPart[];   // §18.10: the in-force contributions; colonyStress = clamp(Σ, 0, 10)
  characterInstability: Record<string, CharacterInstability>;  // M6
  characterReaffirmed: Record<string, string | null>;          // M6: characterId → faction it is Reaffirmed for
  characterRecoveredAt: Record<string, number>;                // M6: session number of the last Conflicted → Stable
  lastCharacterPhaseSession: number | null;                    // M6: the session whose Colony Turn last ran a Character Phase
  factionPowerModifier: Record<string, number>;     // factionId → powerModifier
  factionSize: Record<string, number>;              // §18.8: factionId → total membership (Faction Size, changed by Effects)
  characterPressure: Record<string, number>;   // characterId → pressure
  characterInfluence: Record<string, number>;  // characterId → influence
  characterStates: Record<string, CharacterState>;   // characterId → state at this point
  characterFactions: Record<string, string | undefined>; // characterId → factionId at this point
  // cumulative relationship bumps added via session effects (compound per session pair)
  factionRelationshipBumps: Record<string, Record<string, number>>; // sourceId → targetId → bump
  factionPartyBumps: Record<string, number>;   // factionId → cumulative party bump
  // Assets — cumulative control, status, and status-actor state
  assetControl: Record<string, string | undefined>;        // assetId → factionId
  assetStatuses: Record<string, AssetStatus>;              // assetId → status
  assetStatusActors: Record<string, string | undefined>;   // assetId → actorFactionId
  // Goals — cumulative status and participants
  goalStatuses: Record<string, GoalStatus>;
  goalParticipants: Record<string, Array<{ actorId: string; actorType: string; role: string; delta: number; sessionId: string }>>;
  // Locations — cumulative state and entity placements
  locationStates: Record<string, LocationState>;           // locationId → state
  characterLocations: Record<string, string | undefined>;  // characterId → locationId
  assetLocations: Record<string, string | undefined>;      // assetId → locationId
  // Map geometry overrides — entityId → { mapId, geometryType, geometryData } or 'removed'
  placementOverrides: Record<string, { mapId: string; geometryType: GeometryType; geometryData: string } | 'removed'>;
}

export interface ColonyImpact {
  momentumChanges: { factionId: string; delta: number }[];
  powerModifierChanges: { factionId: string; delta: number }[];
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

// ── Locations ──────────────────────────────────────────────────────────────

/** §18.9: a transient condition of the place (usable in World Condition requirements), not a permanent attribute. */
export type LocationState = 'Stable' | 'ActiveIncursion' | 'Unstable';
export type GeometryType = 'Point' | 'Polygon' | 'MultiPoint';
export type PlacementSubjectType = 'Location' | 'Character' | 'Asset';

export const LOCATION_STATE_OPTIONS: { value: LocationState; label: string }[] = [
  { value: 'Stable',          label: 'Stable' },
  { value: 'ActiveIncursion', label: 'Active Incursion' },
  { value: 'Unstable',        label: 'Unstable' },
];

export const locationStateLabel = (s: LocationState | string | undefined) => LOCATION_STATE_OPTIONS.find(o => o.value === s)?.label ?? s ?? '';

export type LocationType = 'Point' | 'Zone' | 'Distributed';

export const LOCATION_TYPE_OPTIONS: { value: LocationType; label: string }[] = [
  { value: 'Point',       label: 'Point of Interest' },
  { value: 'Zone',        label: 'Zone' },
  { value: 'Distributed', label: 'Distributed' },
];

export interface Location {
  /** ADVENTURE-BOOK-PLAN.md §9–12: the entity's canonical file. Set by the server. */
  canonId?: string;
  canonVersion?: string;
  /** True when the canonical file is missing or unreadable: shown flagged, and can't be saved until restored. */
  canonMissing?: boolean;
  id: string;
  campaignId: string;
  name: string;
  description?: string;
  parentLocationId?: string;
  state: LocationState;
  linkedAssetId?: string;
  locationType?: LocationType;
  markerColor?: string;
  introducedAtEventId?: string;   // M1: absent from replay before this Event (Live campaigns)
}

export interface ColonyMap {
  id: string;
  campaignId: string;
  name: string;
  locationId?: string;
  imagePath?: string;
  imageWidth: number;
  imageHeight: number;
  isHero: boolean;
}

export interface MapPlacement {
  id: string;
  mapId: string;
  subjectType: PlacementSubjectType;
  subjectId: string;
  geometryType: GeometryType;
  geometryData: string; // JSON: [x,y] for Point, [[x,y],...] for Polygon — normalized 0–1
  isHidden: boolean;
}

export const LOCATION_EFFECT_PROPS: EffectPropDescriptor[] = [
  { property: 'state', label: 'State', inputType: 'select', selectOptions: LOCATION_STATE_OPTIONS },
];

// ── Assets ─────────────────────────────────────────────────────────────────

export type AssetType   = 'Infrastructure' | 'Artifact' | 'Resource' | 'Intelligence';
export type AssetRole   = 'Operational' | 'Strategic' | 'Symbolic' | 'Covert' | 'Mandate';
export type AssetStatus = 'Stable' | 'Contested' | 'Damaged' | 'Destroyed';

export const ASSET_TYPE_OPTIONS: { value: AssetType; label: string }[] = [
  { value: 'Infrastructure', label: 'Infrastructure' },
  { value: 'Artifact',       label: 'Artifact' },
  { value: 'Resource',       label: 'Resource' },
  { value: 'Intelligence',   label: 'Intelligence' },
];

export const ASSET_ROLE_OPTIONS: { value: AssetRole; label: string }[] = [
  { value: 'Operational', label: 'Operational' },
  { value: 'Strategic',   label: 'Strategic' },
  { value: 'Symbolic',    label: 'Symbolic' },
  { value: 'Covert',      label: 'Covert' },
  { value: 'Mandate',     label: 'Mandate' },
];

export const ASSET_TIER_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
];

export const ASSET_STATUS_OPTIONS: { value: AssetStatus; label: string }[] = [
  { value: 'Stable',    label: 'Stable' },
  { value: 'Contested', label: 'Contested' },
  { value: 'Damaged',   label: 'Damaged' },
  { value: 'Destroyed', label: 'Destroyed' },
];

/** §18.7: the capacity channel an Asset's stars count toward, by Role (its institutional purpose; Type is descriptive). */
export type AssetChannel = 'holdings' | 'mandate';
export const ASSET_ROLE_CHANNEL: Record<AssetRole, AssetChannel> = {
  Operational: 'holdings', Strategic: 'holdings', Covert: 'holdings',
  Symbolic: 'mandate', Mandate: 'mandate',
};

export interface Asset {
  /** ADVENTURE-BOOK-PLAN.md §9–12: the entity's canonical file. Set by the server. */
  canonId?: string;
  canonVersion?: string;
  /** True when the canonical file is missing or unreadable: shown flagged, and can't be saved until restored. */
  canonMissing?: boolean;
  id: string;
  campaignId: string;
  name: string;
  description?: string;
  type: AssetType;
  role: AssetRole;
  tier: number;
  keystone: boolean;
  controllingFactionId?: string;
  locationId?: string;
  status: AssetStatus;
  statusActorFactionId?: string;
  introducedAtEventId?: string;   // M1: absent from replay before this Event (Live campaigns)
}

/** §18.7: an Asset's capacity contribution: its stars (tier), toward its Role's channel. A Destroyed Asset contributes
 *  nothing; Damaged and Contested Assets count in full (a specific impairment is a World Condition). */
export function assetStars(asset: Pick<Asset, 'tier' | 'status'>): number {
  return asset.status === 'Destroyed' ? 0 : asset.tier;
}

// ── Faction Goals ──────────────────────────────────────────────────────────

export type GoalStatus = 'Plotting' | 'Progressing' | 'Stalled' | 'Accomplished' | 'Failed' | 'Retired';   // Stalled: legacy, not offered
/** M4: terminal statuses. Retired = the goal became impossible or obsolete and was set aside (no Momentum signal). */
export const TERMINAL_GOAL_STATUSES: readonly GoalStatus[] = ['Accomplished', 'Failed', 'Retired'];
export type GoalOutcomeMode = 'Automatic' | 'Adjudicated';
export type GoalConditionType = 'Achieve' | 'Maintain';
export type GoalPriority = 'Critical' | 'Major' | 'Minor';
export type GoalVisibility = 'Open' | 'Known' | 'Secret';

export const GOAL_STATUS_OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: 'Plotting',     label: 'Plotting' },
  { value: 'Progressing',  label: 'Progressing' },
  { value: 'Accomplished', label: 'Accomplished' },
  { value: 'Failed',       label: 'Failed' },
  { value: 'Retired',      label: 'Retired' },
];

export const GOAL_PRIORITY_OPTIONS: { value: GoalPriority; label: string }[] = [
  { value: 'Critical', label: 'Critical' },
  { value: 'Major',    label: 'Major' },
  { value: 'Minor',    label: 'Minor' },
];

export const GOAL_VISIBILITY_OPTIONS: { value: GoalVisibility; label: string }[] = [
  { value: 'Open',   label: 'Open' },
  { value: 'Known',  label: 'Known' },
  { value: 'Secret', label: 'Secret' },
];

export const ASSET_EFFECT_PROPS: EffectPropDescriptor[] = [
  { property: 'controllingFactionId', label: 'Controlling Faction', inputType: 'faction-select' },
  { property: 'status',               label: 'Status',              inputType: 'select', selectOptions: ASSET_STATUS_OPTIONS },
  { property: 'locationChange',       label: 'Location Change',     inputType: 'location-select' },
];

// M4: the GM resolution task (Ready to Resolve). 'Ready' is written by the Faction Phase when a goal that does not
// Auto-Resolve succeeds; the GM resolves it (Accomplished / Failed) or clears it (it remains Progressing).
export const GOAL_READY_OPTIONS: { value: string; label: string }[] = [
  { value: 'Ready',   label: 'Ready to Resolve' },
  { value: 'Cleared', label: 'Remains Progressing (task cleared)' },
];

export const GOAL_EFFECT_PROPS: EffectPropDescriptor[] = [
  { property: 'status',         label: 'Status',           inputType: 'select', selectOptions: GOAL_STATUS_OPTIONS },
  { property: 'participate',    label: 'Participation',    inputType: 'participate' },
  { property: 'championChange', label: 'Champion Change',  inputType: 'character-select' },   // M4; '' = unassigned
  { property: 'readyToResolve', label: 'Ready to Resolve', inputType: 'select', selectOptions: GOAL_READY_OPTIONS },
];

export type GoalTargetEntityType = 'Faction' | 'Character' | 'Asset';

// ── World Conditions (§18.6) ─────────────────────────────────────────────────
/** A persistent rule or circumstance the party can encounter. The app tracks whether it is in force, and why; it never
 *  executes it. In force ⇔ established (from the start, or by an Event, until one ends it) ∧ its dependency holds. */
export interface WorldCondition {
  id: string;
  campaignId: string;
  title: string;
  rule: string;
  ruleOtherwise?: string | null;    // optional: what holds at the table while it is NOT in force (shown dimmed while in force)
  variesByJson?: string | null;     // 2026-10-26: ConditionVariesBy (conditions.ts): one entity's property, a row per state; replaces rule/requirements
  activeAtStart: boolean;
  requirementsJson: string;         // §18.9: ConditionRequirement[] (core/sim/conditions.ts), all must hold
  stressContribution: number;       // §18.9: added to Colony Stress while in force (may be negative)
  sortOrder: number;
  canonId?: string;        // the condition's file (condition.<slug>), ADVENTURE-BOOK-PLAN.md §15
  canonVersion?: string;
  canonMissing?: boolean;
}
/** The latest Event that established or ended a condition (replay). */
export interface ConditionEstablishment { active: boolean; session: number; eventId: string; eventTitle: string }
export const CONDITION_STATE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Active', label: 'Established (in force while its dependency holds)' },
  { value: 'Ended',  label: 'Ended' },
];
export const CONDITION_EFFECT_PROPS: EffectPropDescriptor[] = [
  { property: 'state', label: 'State', inputType: 'select', selectOptions: CONDITION_STATE_OPTIONS },
];
export type GoalTargetOperator   = 'gte' | 'lte' | 'eq';

// States available per target entity type
export const CHARACTER_TARGET_STATES = ['Alive', 'Dead', 'Missing', 'Forgotten'] as const;
export const ASSET_TARGET_STATES     = ['Stable', 'Contested', 'Damaged', 'Destroyed'] as const;
export const FACTION_TARGET_PROPS    = ['influence', 'power', 'momentum'] as const;

export interface FactionGoal {
  /** ADVENTURE-BOOK-PLAN.md §9–12: the entity's canonical file. Set by the server. */
  canonId?: string;
  canonVersion?: string;
  /** True when the canonical file is missing or unreadable: shown flagged, and can't be saved until restored. */
  canonMissing?: boolean;
  id: string;
  campaignId: string;
  factionId: string;
  title: string;
  status: GoalStatus;
  conditionType: GoalConditionType;
  priority: GoalPriority;
  visibility: GoalVisibility;
  // Structured target
  targetEntityType?: GoalTargetEntityType;
  targetEntityId?: string;
  // Character / Asset: discrete state match
  targetState?: string;
  // Asset: ownership — which faction must control the asset
  targetOwnerFactionId?: string;
  // Champion: primary character stakeholder
  championId?: string;
  // Faction: numeric threshold
  targetProperty?: string;
  targetOperator?: GoalTargetOperator;
  targetThreshold?: number;
  introducedAtEventId?: string;   // M1: absent from replay before this Event (Live campaigns)
  // M4 (simplified 2026-10-15), Achieve goals only. Auto-Resolve = 'Automatic': the second success writes the target and
  // Accomplishes the goal; 'Adjudicated': it raises a GM resolution task (Ready to Resolve) instead.
  outcomeMode?: GoalOutcomeMode;
  progressingEffectsJson?: string;   // §18.11: AdvanceEffect[] written by the Faction Phase at Planning → Progressing
  accomplishedEffectsJson?: string;  // §18.11: AdvanceEffect[] written at Accomplished, after the target
  earliestAct?: number;             // §18.6: first Act of Faction Phase eligibility (1–3); a Maintain assignment is in force from it
  /** Projection only (never stored): the Ready to Resolve overlay at the viewed snapshot. */
  ready?: GoalReady;
  /** Projection only: who brought an Accomplished goal about (faction id, 'party', a participant; null = not recorded). */
  accomplishedBy?: string | null;
}

/** M4: a goal's Ready to Resolve overlay: a GM resolution task, open since the session whose Turn raised it. */
export interface GoalReady {
  sinceSession: number;
}

// ── Narrative System ───────────────────────────────────────────────────────

export type NarrativeTier = 'Major' | 'Supporting' | 'Minor' | 'Background';
export type NarrativeVisibility = 'Public' | 'GMOnly' | 'Revealed';
export type RelationshipState = 'Active' | 'Estranged' | 'Severed' | 'Unknown';

export const NARRATIVE_TIER_OPTIONS: { value: NarrativeTier; label: string }[] = [
  { value: 'Major',      label: 'Major' },
  { value: 'Supporting', label: 'Supporting' },
  { value: 'Minor',      label: 'Minor' },
  { value: 'Background', label: 'Background' },
];

export const NARRATIVE_VISIBILITY_OPTIONS: { value: NarrativeVisibility; label: string }[] = [
  { value: 'GMOnly',   label: 'GM Only' },
  { value: 'Revealed', label: 'Revealed' },
  { value: 'Public',   label: 'Public' },
];

export const RELATIONSHIP_STATE_OPTIONS: { value: RelationshipState; label: string }[] = [
  { value: 'Active',    label: 'Active' },
  { value: 'Estranged', label: 'Estranged' },
  { value: 'Severed',   label: 'Severed' },
  { value: 'Unknown',   label: 'Unknown' },
];

export interface CharacterNarrativeProfile {
  characterId: string;
  overview?: string;
  personality?: string;
  motivation?: string;
  primaryProtection?: string;
  fears?: string;
  blindSpot?: string;
  narrativeRole?: string;
  performanceInspiration?: string;
  portrayalNotes?: string;
  pressureResponse?: string;
  signatureQuote?: string;
  signatureObject?: string;
  notes?: string;
}

export interface CharacterDetail {
  id: string;
  characterId: string;
  key: string;
  heading: string;
  body?: string;
  sortOrder: number;
  visibility: NarrativeVisibility;
}

export interface CharacterRelationship {
  id: string;
  sourceCharacterId: string;
  targetCharacterId?: string;
  relationshipType: string;
  summary?: string;
  state: RelationshipState;
  visibility: NarrativeVisibility;
  sortOrder: number;
}

// ── Character System ───────────────────────────────────────────────────────

export type CharacterType = 'NPC' | 'PartyMember';
// Primary: doubt pulls toward a vertex (a, b, c)
// Secondary: doubt pulls toward an edge — away from the opposite vertex (ab, ac, bc)
export type DoubtDirection = 'a' | 'b' | 'c' | 'ab' | 'ac' | 'bc';
export type CharacterState = 'Alive' | 'Dead' | 'Missing' | 'Forgotten';
export type CharacterInstability = 'Stable' | 'Conflicted' | 'Compromised';

export interface Character {
  /** ADVENTURE-BOOK-PLAN.md §9–12: the entity's canonical file. Set by the server. */
  canonId?: string;
  canonVersion?: string;
  /** True when the canonical file is missing or unreadable: shown flagged, and can't be saved until restored. */
  canonMissing?: boolean;
  id: string;
  name: string;
  characterType: CharacterType;
  narrativeTier?: NarrativeTier;

  // Pathfinder (optional)
  ancestry?: string;
  heritage?: string;
  class?: string;
  background?: string;
  level?: number;

  // Demographics
  gender?: string;
  pronouns?: string;
  age?: number;
  occupation?: string;
  aliases?: string;

  // Narrative
  summary?: string;

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

  // Portrait image
  portraitPath?: string;

  // Narrative state
  state: CharacterState;

  // Spatial location
  locationId?: string;
  introducedAtEventId?: string;   // M1: absent from replay before this Event (Live campaigns)
  instability?: CharacterInstability;   // M6: Stable → Conflicted → Compromised (a visible crisis); changes only by Effects
  reaffirmedFactionId?: string;         // M6: survived a crisis without defecting; not nominated again for this faction
}

/**
 * Derives belief positions from a value vector using per-axis thresholds.
 *   knowledge ← A axis: A dominant → positive, C dominant → negative, else neutral
 *   change    ← B axis: B dominant → negative, C dominant → positive, else neutral
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

  // beliefb ← B axis: B dominant → negative (status quo); C dominant → positive (change); else neutral.
  // Every axis is three-position (scoring audit), so the axis `type` no longer matters here.
  void axisLabels;
  const beliefb: BeliefPosition =
    values.b >= threshold ? 'negative' :
    values.c >= threshold ? 'positive' : 'neutral';

  return { beliefc, beliefa, beliefb };
}

/** Returns the character's effective beliefs: overrides where set, derived elsewhere. */
export function effectiveBeliefs(
  character: Character,
  threshold = 0.4,
  axisLabels: BeliefAxisLabels = DEFAULT_BELIEF_AXIS_LABELS
): { beliefc: BeliefPosition; beliefa: BeliefPosition; beliefb: BeliefPosition } {
  // D12: callers pass the configured derivation threshold and axis labels (store.formulas / store.beliefAxisLabels).
  const derived = deriveBeliefs(character.values, threshold, axisLabels);
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
 * Effective pressure = base pressure + colonyStress × coefficient (M6: ×5 by default, configurable).
 * Stress is a percentage-point contribution: stress 5 → +25 at ×5.
 * Can exceed 100; callers display values above 100 as "MAX".
 */
export function effectivePressure(character: Pick<Character, 'pressure'>, colonyStress: number, coefficient: number = DEFAULT_FORMULAS.stressPressureCoefficient ?? 5): number {
  return character.pressure + colonyStress * coefficient;   // M6: coefficient ×5 by default (formulas.stressPressureCoefficient)
}

/** Drift score using the effective (stress-adjusted) pressure. */
export function effectiveDriftScore(character: Character, colonyStress: number, coefficient?: number): number {
  return effectivePressure(character, colonyStress, coefficient) - character.conviction;
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
  scale: number,
  coefficient?: number
): number {
  return effectivePressure(character, colonyStress, coefficient) - effectiveConviction(character, factionPeers, scale);
}

/**
 * Computes the drift target in barycentric space.
 *
 * Primary directions (a, b, c): pull toward the named vertex — target is that pure corner.
 * Secondary directions (ab, ac, bc): pull toward the named edge — zeros the opposite vertex
 * and renormalizes, preserving the character's existing lean between the two edge values.
 */
export function computeDriftTarget(values: ValueVector, doubtDirection: DoubtDirection): ValueVector {
  switch (doubtDirection) {
    case 'a':  return { a: 1, b: 0, c: 0 };
    case 'b':  return { a: 0, b: 1, c: 0 };
    case 'c':  return { a: 0, b: 0, c: 1 };
    case 'bc': { const s = values.b + values.c || 1; return { a: 0, b: values.b / s, c: values.c / s }; }
    case 'ac': { const s = values.a + values.c || 1; return { a: values.a / s, b: 0, c: values.c / s }; }
    case 'ab': { const s = values.a + values.b || 1; return { a: values.a / s, b: values.b / s, c: 0 }; }
  }
}

// Compatibility and most-aligned/opposed lists moved to core/services/scoring.service.ts (one relationship formula).

// ── Narrative Planning System ───────────────────────────────────────────────

export type NarrativeThreadState  = 'Open' | 'Resolved';
export type NarrativeEventStatus  = 'Planned' | 'Available' | 'Occurred' | 'Bypassed' | 'Obsolete';
export type NarrativeOwnerType    = 'Thread' | 'Event';
export type NarrativeEntityLinkType = 'Faction' | 'Character' | 'Asset' | 'Location' | 'Session' | 'SessionEvent';

export interface PathSet {
  id: string;
  campaignId: string;
  name: string;
  originEventId?: string;
  convergenceEventId?: string;
  canonId?: string;      // the branch file (branch.<slug>)
  canonVersion?: string;
  canonMissing?: boolean;
}

export interface NarrativePath {
  id: string;
  pathSetId: string;
  name: string;
  sortOrder: number;
}

export interface PathSetContext {
  pathSetId: string;
  requiredPathId: string;
}

export interface PathEventScope {
  pathId: string;
  narrativeEventId: string;
}

// Explicit record that this event may resolve differently across paths of a PathSet.
// Separate from PathEventScope (scope) and NarrativeEventOverride (concrete patch).
export interface NarrativeEventVariantParticipation {
  narrativeEventId: string;
  pathSetId: string;
}

export interface NarrativeEventOverride {
  id: string;
  narrativeEventId: string;
  key?: string;   // the version's key in the event's file (ADVENTURE-BOOK-PLAN.md §14); the id is derived from it
  overridesSummary: boolean;
  summary?: string;
  overridesDescription: boolean;
  description?: string;
  overridesConnections: boolean;
  overridesAssets: boolean;
}

export interface EventOverridePath {
  eventOverrideId: string;
  pathId: string;
}

export interface EventOverrideConnection {
  id: string;
  eventOverrideId: string;
  targetNarrativeEventId: string;
  threadId: string;
  visibility: NarrativeVisibility;
}

export interface EventOverrideEntityLink {
  id: string;
  eventOverrideId: string;
  entityType: NarrativeEntityLinkType;
  entityId: string;
  role?: string;
  isPrimary: boolean;
  visibility: NarrativeVisibility;
}

export interface EffectiveNarrativeEvent extends NarrativeEvent {
  effectiveSummary?: string;
  effectiveDescription?: string;
  overrideId?: string;
}

export interface NarrativeThread {
  id: string;
  campaignId: string;
  title: string;
  summary?: string;
  state: NarrativeThreadState;
  color?: string;
  // ADVENTURE-BOOK-PLAN.md §13: the thread's canonical file (thread.<slug>).
  canonId?: string;
  canonVersion?: string;
  canonMissing?: boolean;
}

// An event is a narrative container; an encounter a complex scenario (maps, stat blocks, clocks).
// Each is its own canonical file (event.<slug> / encounter.<slug>); the kind is chosen at creation.
export type NarrativeKind = 'Event' | 'Encounter';
export const NARRATIVE_KIND_OPTIONS: { value: NarrativeKind; label: string }[] = [
  { value: 'Event', label: 'Event' },
  { value: 'Encounter', label: 'Encounter' },
];

export interface NarrativeEvent {
  id: string;
  campaignId: string;
  title: string;
  summary?: string;
  description?: string;
  narrativeFunction?: string;
  status: NarrativeEventStatus;
  visibility: NarrativeVisibility;
  sortOrder: number;
  kind?: NarrativeKind;          // absent means Event
  parentEventId?: string | null; // an encounter's event, if it belongs to one
  canonId?: string;
  canonVersion?: string;
  canonMissing?: boolean;
}

export interface NarrativeEventConnection {
  id: string;
  campaignId: string;
  sourceNarrativeEventId: string;
  targetNarrativeEventId: string;
  threadId: string;
  visibility: NarrativeVisibility;
}

export interface NarrativeEntityLink {
  id: string;
  campaignId: string;
  ownerType: NarrativeOwnerType;
  ownerId: string;
  entityType: NarrativeEntityLinkType;
  entityId: string;
  role?: string;
  notes?: string;
  isPrimary: boolean;
  visibility: NarrativeVisibility;
}

export interface NarrativeEventRealization {
  id: string;
  narrativeEventId: string;
  sessionEventId: string;
  notes?: string;
}

export interface NarrativeEventPlacement {
  narrativeEventId: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export const NARRATIVE_THREAD_STATE_OPTIONS: { value: NarrativeThreadState; label: string }[] = [
  { value: 'Open',     label: 'Open' },
  { value: 'Resolved', label: 'Resolved' },
];

export const NARRATIVE_EVENT_STATUS_OPTIONS: { value: NarrativeEventStatus; label: string }[] = [
  { value: 'Planned',   label: 'Planned' },
  { value: 'Available', label: 'Available' },
  { value: 'Occurred',  label: 'Occurred' },
  { value: 'Bypassed',  label: 'Bypassed' },
  { value: 'Obsolete',  label: 'Obsolete' },
];


export const NARRATIVE_ENTITY_LINK_TYPE_OPTIONS: { value: NarrativeEntityLinkType; label: string }[] = [
  { value: 'Faction',      label: 'Faction' },
  { value: 'Character',    label: 'Character' },
  { value: 'Asset',        label: 'Asset' },
  { value: 'Location',     label: 'Location' },
  { value: 'Session',      label: 'Session' },
  { value: 'SessionEvent', label: 'Session Event' },
];
