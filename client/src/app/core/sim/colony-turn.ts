// Colony Turn input builders (M5). Pure: from the campaign's baseline and recorded history, the frozen inputs of each
// phase. The Opening reads the state at the end of the previous session; the Faction Phase reads the state after this
// Turn's committed Opening (the session's ColonyTurn Event only, before any play).
import {
  Asset, CampaignEvent, Character, ColonyState, WorldCondition, ColonySnapshot, EventEffect, Faction, FactionGoal, FormulasConfig, Location, RulesConfig, Session,
  DEFAULT_FORMULAS, TERMINAL_GOAL_STATUSES,
} from '../models/types';
import { buildColonySnapshots, projectAssets, projectCharacters, projectFactions, projectGoals, eventSessionNumbers, presentAt, parseFormulas } from './replay';
import { computePowerBreakdown } from './power';
import { conditionStress, conditionWorldAt, evaluateConditions } from './conditions';
import { AdvanceEffect, parseAdvanceEffects, normalizeAdvanceEffect } from './advance-effects';

const goalAdvanceEffects = (json: string | undefined): AdvanceEffect[] =>
  parseAdvanceEffects(json).map(normalizeAdvanceEffect).filter((e): e is AdvanceEffect => e !== null);
const nonEmpty = <K extends string>(key: K, list: AdvanceEffect[]) => (list.length ? { [key]: list } : {}) as Partial<Record<K, AdvanceEffect[]>>;
import { assessGoal, worldOf } from './goals';
import { clampTier } from './momentum';
import { FactionPhaseInputs, FACTION_PHASE_VERSION, PRIORITY_BONUS } from './faction-phase';
import { OpeningInputs, OPENING_VERSION } from './opening';
import { CharacterPhaseInputs, CHARACTER_PHASE_VERSION, BAND_MODIFIERS, DEFECTION_MODIFIERS } from './character-phase';
import { scoreRelationship, DEFAULT_RULES } from '../services/scoring.service';
import { deriveBeliefs, effectivePressure, effectiveConviction } from '../models/types';
import { parseBeliefAxisLabels } from './replay';
import { byOrdinal } from './prng';

export interface CampaignWorld {
  colonyState: ColonyState; factions: Faction[]; characters: Character[]; assets: Asset[];
  goals: FactionGoal[]; locations: Location[]; sessions: Session[]; rules: RulesConfig | null;
  conditions?: WorldCondition[];   // §18.9: their Stress contributions are part of each snapshot's Colony Stress
}

export const DRAFT_TURN_EVENT_ID = 'draft-colony-turn';

/**
 * The world as it would be with a Colony Turn's earlier phases written: their Effects on a virtual ColonyTurn Event of
 * the session (replacing the session's own, which is empty until the turn is confirmed). Lets each phase of an
 * uncommitted turn be built exactly as it will be verified after the whole turn is written at once.
 */
export function withDraftTurnEvent(w: CampaignWorld, sessionId: string, effects: Omit<EventEffect, 'id' | 'eventId'>[]): CampaignWorld {
  const ev: CampaignEvent = {
    id: DRAFT_TURN_EVENT_ID, sessionId, title: 'Colony Turn (draft)', sortOrder: -1000, kind: 'ColonyTurn',
    effects: effects.map((e, i) => ({ ...e, id: `${DRAFT_TURN_EVENT_ID}-${i}`, eventId: DRAFT_TURN_EVENT_ID, ordinal: i })),
  };
  return {
    ...w,
    sessions: w.sessions.map(s => s.id !== sessionId ? s : { ...s, events: [ev, ...(s.events ?? []).filter(e => e.kind !== 'ColonyTurn')] }),
  };
}

const sorted = (sessions: Session[]) => [...sessions].sort((a, b) => a.number - b.number);
const replay = (w: CampaignWorld, sessions: Session[]) =>
  buildColonySnapshots(w.colonyState, w.factions, w.characters, sessions, w.rules, w.assets, w.goals, w.locations, w.conditions ?? []);

/** The snapshot at the end of the session before `sessionId` (null = baseline). */
export function stateBefore(w: CampaignWorld, sessionId: string): ColonySnapshot | null {
  const ss = sorted(w.sessions), i = ss.findIndex(s => s.id === sessionId);
  if (i <= 0) return null;
  return replay(w, ss.slice(0, i)).at(-1) ?? null;
}

/** The snapshot after this session's Colony Turn Event (Opening, and any committed phase) but before its play. */
export function stateAfterTurnEvent(w: CampaignWorld, sessionId: string): ColonySnapshot | null {
  const ss = sorted(w.sessions), i = ss.findIndex(s => s.id === sessionId);
  if (i < 0) return null;
  const upto = ss.slice(0, i + 1).map((s, k) => k < i ? s : { ...s, events: (s.events ?? []).filter(e => e.kind === 'ColonyTurn') });
  return replay(w, upto).at(-1) ?? null;
}

const operatingFactions = (w: CampaignWorld) => w.factions.filter(f => f.active && f.type === 'Faction');

export function buildOpeningInputs(w: CampaignWorld, sessionId: string, seed: number): OpeningInputs {
  const prev = stateBefore(w, sessionId);
  const tiers = Object.fromEntries(operatingFactions(w).map(f => [f.id, prev?.factionMomentumTier?.[f.id] ?? clampTier(f.momentumTier ?? 0)]));
  return { version: OPENING_VERSION, seed: seed >>> 0, tiers, pending: prev?.pendingMomentumSignals ?? [] };
}

export interface FactionPhaseBuild {
  inputs: FactionPhaseInputs;
  ineligible: { goalId: string; factionId: string; title: string; reasons: string[] }[];   // shown on the Board, not frozen
}

export function buildFactionPhaseInputs(w: CampaignWorld, sessionId: string, seed: number): FactionPhaseBuild {
  const snap = stateAfterTurnEvent(w, sessionId);
  const es = eventSessionNumbers(w.sessions);
  const present = <T extends { introducedAtEventId?: string }>(xs: T[]) => xs.filter(x => presentAt(x, snap, es));
  const formulas: FormulasConfig = parseFormulas(w.rules?.formulasJson);
  const chars = present(projectCharacters(w.characters, snap)), assets = present(projectAssets(w.assets, snap));
  const goals = present(projectGoals(w.goals, snap));
  const facs = present(projectFactions(operatingFactions(w), snap));
  const world = worldOf(chars, assets);
  const ids = new Set(facs.map(f => f.id));
  const factions = facs.map(f => ({ id: f.id, name: f.name, power: computePowerBreakdown(f, chars, assets, formulas).power,
                                    momentum: f.momentumTier ?? 0 })).sort((a, b) => byOrdinal(a.id, b.id));
  const eligible: FactionPhaseInputs['goals'] = []; const ineligible: FactionPhaseBuild['ineligible'] = [];
  const act = w.sessions.find(s => s.id === sessionId)?.act ?? 1;
  for (const g of goals.filter(x => ids.has(x.factionId) && x.conditionType === 'Achieve').sort((a, b) => byOrdinal(a.id, b.id))) {
    const a = assessGoal(g, world, act);
    if (!a.eligible) { ineligible.push({ goalId: g.id, factionId: g.factionId, title: g.title, reasons: a.ineligibleReasons }); continue; }
    eligible.push({
      id: g.id, factionId: g.factionId, title: g.title, priority: g.priority, status: g.status === 'Plotting' ? 'Plotting' : 'Progressing',
      outcomeMode: g.outcomeMode ?? 'Automatic', targetEntityType: g.targetEntityType, targetEntityId: g.targetEntityId,
      targetState: g.targetState, targetOwnerFactionId: g.targetOwnerFactionId,
      // §18.11: valid advance Effects only; omitted when empty (canonical inputs stay unchanged for goals without any)
      ...nonEmpty('onProgressing', g.status === 'Plotting' ? goalAdvanceEffects(g.progressingEffectsJson) : []),
      ...nonEmpty('onAccomplished', goalAdvanceEffects(g.accomplishedEffectsJson)),
    });
  }
  // §18.12 guards: an active Maintain assignment competes for Power while its target is threatened, i.e. named by another
  // faction's eligible goal that the defender knows of (a Secret goal is unknown to the defender).
  const known = eligible.filter(e => goals.find(g => g.id === e.id)?.visibility !== 'Secret');
  const guards: FactionPhaseInputs['guards'] = goals
    .filter(g => ids.has(g.factionId) && g.conditionType === 'Maintain' && !TERMINAL_GOAL_STATUSES.includes(g.status) && g.targetEntityId
      && assessGoal(g, world, act).defense?.active && known.some(e => e.factionId !== g.factionId && e.targetEntityId === g.targetEntityId))
    .sort((a, b) => byOrdinal(a.id, b.id))
    .map(g => ({ id: g.id, factionId: g.factionId, title: g.title, priority: g.priority, targetEntityId: g.targetEntityId! }));
  return {
    inputs: { version: FACTION_PHASE_VERSION, seed: seed >>> 0, target: formulas.operationTarget ?? DEFAULT_FORMULAS.operationTarget ?? 10,
              priorityBonus: { ...PRIORITY_BONUS }, factions, goals: eligible, guards },
    ineligible,
  };
}

/** M6 Character Phase inputs: the state after this Turn's Opening (and Faction Phase): the Defection Checks, and every
 *  member's Drift Risk, frozen. */
export function buildCharacterPhaseInputs(w: CampaignWorld, sessionId: string, seed: number): CharacterPhaseInputs {
  const snap = stateAfterTurnEvent(w, sessionId);
  const es = eventSessionNumbers(w.sessions);
  const formulas = parseFormulas(w.rules?.formulasJson);
  // §18.10: Stress is derived from World Conditions; before any session, from those in force at the start
  const stress = snap?.colonyStress ?? Math.max(0, Math.min(10, conditionStress(evaluateConditions(w.conditions ?? [],
    conditionWorldAt(null, w), { asset: id => id, faction: id => id })).total));
  const scale = w.rules?.influenceConvictionScale ?? 0.5;
  const factions = operatingFactions(w).map(f => f.id).sort(byOrdinal);
  const ops = new Set(factions);
  const alive = projectCharacters(w.characters, snap).filter(c => presentAt(c, snap, es) && c.state === 'Alive');
  const lastCP = snap?.lastCharacterPhaseSession ?? null;
  const characters = alive
    .filter(c => c.characterType === 'NPC' && c.factionId && ops.has(c.factionId))
    .sort((a, b) => byOrdinal(a.id, b.id))
    .map(c => {
      const peers = alive.filter(p => p.factionId === c.factionId && p.id !== c.id);
      const drift = effectivePressure(c, stress, formulas.stressPressureCoefficient) - effectiveConviction(c, peers, scale);
      const recovered = snap?.characterRecoveredAt?.[c.id];
      return {
        id: c.id, name: c.name, factionId: c.factionId!, instability: c.instability ?? 'Stable',
        drift: Math.round(drift * 100) / 100,
        exempt: recovered !== undefined && (lastCP === null || recovered >= lastCP),
        reaffirmed: !!c.reaffirmedFactionId && c.reaffirmedFactionId === c.factionId,
      };
    });
  // Defection Checks (§18.4): every character still Compromised; the label is the FULL relationship score toward its
  // faction (stress 0, no bump), with belief overrides included.
  const axis = parseBeliefAxisLabels(w.rules?.beliefAxisLabelsJson);
  const fById = new Map(projectFactions(operatingFactions(w), snap).map(f => [f.id, f]));
  const checks = alive
    .filter(c => c.instability === 'Compromised' && c.factionId && fById.has(c.factionId))
    .sort((a, b) => byOrdinal(a.id, b.id))
    .map(c => {
      const f = fById.get(c.factionId!)!;
      const d = deriveBeliefs(c.values, formulas.beliefDerivationThreshold, axis);
      const label = scoreRelationship({ id: c.id, values: c.values, beliefa: c.beliefa ?? d.beliefa, beliefb: c.beliefb ?? d.beliefb, beliefc: c.beliefc ?? d.beliefc },
                                      f, 0, 0, { ...DEFAULT_RULES, ...(w.rules ?? {}) }).label;
      return { characterId: c.id, name: c.name, factionId: f.id, label, modifier: DEFECTION_MODIFIERS[label], isLeader: f.leaderId === c.id };
    });
  return {
    version: CHARACTER_PHASE_VERSION, seed: seed >>> 0, target: formulas.driftRollTarget ?? 8,
    waveringAt: formulas.driftWaveringAt ?? 15, breakingAt: formulas.driftBreakingAt ?? 30, bandModifiers: { ...BAND_MODIFIERS },
    defectionTarget: formulas.defectionTarget ?? 8, checks, factions, characters,
  };
}
