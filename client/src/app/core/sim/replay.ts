// Snapshot replay engine: pure functions, no Angular dependencies.
// Moved verbatim from store/app.store.ts (M0). Behaviour is locked by replay.golden.spec.ts.
import {
  Faction, ColonyState, Character, CharacterState, Session, ColonySnapshot,
  BeliefAxisLabels, BeliefAxisConfig, DEFAULT_BELIEF_AXIS_LABELS,
  FormulasConfig, DEFAULT_FORMULAS,
  FACTION_EFFECT_PROPS, CHARACTER_EFFECT_PROPS, RulesConfig,
  Asset, AssetStatus, FactionGoal, GoalStatus, GoalReady, CharacterInstability, TERMINAL_GOAL_STATUSES, EventEffect, CampaignEvent, ConditionEstablishment, WorldCondition,
  Location, LocationState, GeometryType,
} from '../models/types';
import { MomentumSignal, MomentumRule, clampTier, resolveMomentum } from './momentum';
import { GoalWorld, goalConditionMet, attributionOf } from './goals';
import { ConditionWorld, evaluateConditions, conditionStress, goalStageOf } from './conditions';

// ── M1: introductions (Live campaigns) ──────────────────────────────────────────
/** eventId → number of the session it belongs to. */
export function eventSessionNumbers(sessions: Session[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of sessions) for (const ev of s.events ?? []) m.set(ev.id, s.number);
  return m;
}

/** Is an entity part of the world at this snapshot? Baseline (snap = null) holds only entities never introduced later. */
export function presentAt(entity: { introducedAtEventId?: string }, snap: ColonySnapshot | null, eventSessions: Map<string, number>): boolean {
  if (!entity.introducedAtEventId) return true;
  const n = eventSessions.get(entity.introducedAtEventId);
  return snap != null && n != null && n <= snap.sessionNumber;
}

/** Effects in their explicit order (M1 Ordinal); pre-M1 data without ordinals keeps its stored order. */
export function orderedEffects<T extends { ordinal?: number }>(effects: T[]): T[] {
  return effects.map((ef, i) => ({ ef, i })).sort((a, b) => ((a.ef.ordinal ?? a.i) - (b.ef.ordinal ?? b.i)) || (a.i - b.i)).map(x => x.ef);
}

// ── Snapshot projections: the single place a snapshot is overlaid on baseline entities ──
export function projectFactions(factions: Faction[], snap: ColonySnapshot | null): Faction[] {
  if (!snap) return factions;
  return factions.map(f => ({
    ...f,
    momentum:       snap.factionMomentum[f.id]       ?? f.momentum,
    momentumTier:   snap.factionMomentumTier?.[f.id] ?? f.momentumTier ?? 0,
    leaderId:       snap.factionLeaders && f.id in snap.factionLeaders ? (snap.factionLeaders[f.id] ?? undefined) : f.leaderId,
    powerModifier:  snap.factionPowerModifier[f.id]  ?? f.powerModifier,
    factionSize: snap.factionSize?.[f.id] ?? f.factionSize,
  }));
}

export function projectCharacters(characters: Character[], snap: ColonySnapshot | null): Character[] {
  if (!snap) return characters;
  return characters.map(c => ({
    ...c,
    pressure:  snap.characterPressure[c.id]  ?? c.pressure,
    influence: snap.characterInfluence[c.id] ?? c.influence,
    state:     snap.characterStates[c.id]    ?? c.state,
    factionId: snap.characterFactions[c.id] !== undefined ? (snap.characterFactions[c.id] ?? undefined) : c.factionId,
    instability: snap.characterInstability?.[c.id] ?? c.instability ?? 'Stable',
    reaffirmedFactionId: snap.characterReaffirmed && c.id in snap.characterReaffirmed ? (snap.characterReaffirmed[c.id] ?? undefined) : c.reaffirmedFactionId,
  }));
}

export function projectAssets(assets: Asset[], snap: ColonySnapshot | null): Asset[] {
  if (!snap) return assets;
  return assets.map(a => ({
    ...a,
    controllingFactionId: snap.assetControl[a.id] !== undefined ? (snap.assetControl[a.id] ?? undefined) : a.controllingFactionId,
    status: snap.assetStatuses[a.id] ?? a.status,
    statusActorFactionId: snap.assetStatusActors[a.id] !== undefined ? snap.assetStatusActors[a.id] : a.statusActorFactionId,
  }));
}

/** M4: goal status, champion, the Ready to Resolve overlay and (§18.3) completion attribution at the snapshot. */
export function projectGoals(goals: FactionGoal[], snap: ColonySnapshot | null): FactionGoal[] {
  if (!snap) return goals;
  return goals.map(g => ({
    ...g,
    status:     snap.goalStatuses[g.id] ?? g.status,
    championId: snap.goalChampions && g.id in snap.goalChampions ? (snap.goalChampions[g.id] ?? undefined) : g.championId,
    ready:      snap.goalReady?.[g.id],
    accomplishedBy: snap.goalAccomplishedBy?.[g.id],
  }));
}

export function parseBeliefAxisLabels(json: string | undefined): BeliefAxisLabels {
  if (!json) return DEFAULT_BELIEF_AXIS_LABELS;
  try {
    const parsed = JSON.parse(json);
    return {
      a: { ...DEFAULT_BELIEF_AXIS_LABELS.a, ...(parsed.a ?? {}) } as BeliefAxisConfig,
      b: { ...DEFAULT_BELIEF_AXIS_LABELS.b, ...(parsed.b ?? {}) } as BeliefAxisConfig,
      c: { ...DEFAULT_BELIEF_AXIS_LABELS.c, ...(parsed.c ?? {}) } as BeliefAxisConfig,
    };
  } catch { return DEFAULT_BELIEF_AXIS_LABELS; }
}

export function parseFormulas(json: string | undefined): FormulasConfig {
  if (!json) return DEFAULT_FORMULAS;
  try { return { ...DEFAULT_FORMULAS, ...JSON.parse(json) }; }
  catch { return DEFAULT_FORMULAS; }
}

/** 2026-10-15: Keystone losses written by the Faction Phase are ordinary operation results, already felt through Power
 *  (Holdings); they send no Momentum signal. Only a loss recorded from play does. */
const OPERATION_ORIGINS = new Set<string>(['FactionPhase', 'GoalGenerator', 'Opening']);   // Opening: unattended outcomes (op-2 records, before the goal simplification)

export function buildColonySnapshots(
  baseline: ColonyState | null,
  factions: Faction[],
  characters: Character[],
  sessions: Session[],
  rules: RulesConfig | null,
  assets: Asset[] = [],
  factionGoals: FactionGoal[] = [],
  locations: Location[] = [],
  conditions: WorldCondition[] = []   // §18.9: in-force conditions add their Stress contribution to each snapshot
): ColonySnapshot[] {
  if (!baseline || sessions.length === 0) return [];

  const momentum: Record<string, number> = {};
  const powerModifier: Record<string, number> = {};
  const pressure: Record<string, number> = {};
  const influence: Record<string, number> = {};
  const states: Record<string, CharacterState> = {};
  const factionIds: Record<string, string | undefined> = {};
  const relBumps: Record<string, Record<string, number>> = {};
  const partyBumps: Record<string, number> = {};
  // Asset state — control, status, and status-actor, mutable across sessions
  const assetControl: Record<string, string | undefined> = {};
  const assetStatuses: Record<string, AssetStatus> = {};
  const assetStatusActors: Record<string, string | undefined> = {};
  // Goal state — status, mutable across sessions
  const goalStatuses: Record<string, GoalStatus> = {};
  const goalParticipants: Record<string, Array<{ actorId: string; actorType: string; role: string; delta: number; sessionId: string }>> = {};
  // Stress trigger oneShot tracking — carries across sessions
  // Location state — mutable across sessions
  const locationStates: Record<string, LocationState> = {};
  const characterLocations: Record<string, string | undefined> = {};
  const assetLocations: Record<string, string | undefined> = {};
  // Map geometry overrides — accumulated from synthetic mapPlacement effects
  const placementOverrides: Record<string, { mapId: string; geometryType: GeometryType; geometryData: string } | 'removed'> = {};
  // M3: Momentum tiers and the signals awaiting the next resolution (the Opening; see momentum.ts)
  let tiers: Record<string, number> = {};
  let pending: MomentumSignal[] = [];
  const keystones = new Set(assets.filter(a => a.keystone).map(a => a.id));
  // M4: leaders and champions change through Effects (leaderChange / championChange) and defections.
  const factionLeaders: Record<string, string | null> = Object.fromEntries(factions.map(f => [f.id, f.leaderId ?? null]));
  const goalChampions: Record<string, string | null> = Object.fromEntries(factionGoals.map(g => [g.id, g.championId ?? null]));
  // §18.8 Faction Size: the recorded total membership, changed by `factionSize` Effects (never below 0)
  const factionSize: Record<string, number> = Object.fromEntries(factions.map(f => [f.id, f.factionSize ?? 0]));
  const goalReady: Record<string, GoalReady> = {};
  // §18.3: who brought each Accomplished goal about (faction id, 'party', a participant, or null = not recorded)
  const goalAccomplishedBy: Record<string, string | null> = {};
  // §18.6: World Conditions established or ended by Events (whether one is in force is derived: core/sim/conditions.ts)
  const conditionStates: Record<string, ConditionEstablishment> = {};
  // M6: instability (Effects only), Reaffirmation (derived: a crisis that ends Stable without a defection), recoveries
  // (Conflicted → Stable, for the one-phase exemption) and the session of the last committed Character Phase.
  const instability: Record<string, CharacterInstability> = Object.fromEntries(characters.map(c => [c.id, c.instability ?? 'Stable']));
  const reaffirmed: Record<string, string | null> = Object.fromEntries(characters.map(c => [c.id, c.reaffirmedFactionId ?? null]));
  const recoveredAt: Record<string, number> = {};
  const crisisOpen = new Set(characters.filter(c => c.instability === 'Compromised').map(c => c.id));
  let lastCharacterPhase: number | null = null;
  const world: GoalWorld = {
    characterState: id => states[id], characterFaction: id => factionIds[id], characterName: id => charName.get(id) ?? id,
    assetOwner: id => assetControl[id], assetStatus: id => assetStatuses[id], assetName: id => assetName.get(id) ?? id,
  };
  const charName = new Map(characters.map(c => [c.id, c.name]));
  const assetName = new Map(assets.map(a => [a.id, a.name]));

  for (const a of assets) {
    assetControl[a.id] = a.controllingFactionId;
    assetStatuses[a.id] = a.status;
    assetStatusActors[a.id] = a.statusActorFactionId;
    assetLocations[a.id] = a.locationId;
  }
  for (const l of locations) {
    locationStates[l.id] = l.state;
  }
  for (const c of characters) {
    characterLocations[c.id] = c.locationId;
  }
  for (const g of factionGoals) {
    goalStatuses[g.id] = g.status;
  }
  for (const f of factions) {
    momentum[f.id] = f.momentum;
    powerModifier[f.id] = f.powerModifier;
    tiers[f.id] = clampTier(f.momentumTier ?? 0);
  }
  for (const c of characters) {
    pressure[c.id] = c.pressure;
    influence[c.id] = c.influence;
    states[c.id] = c.state;
    factionIds[c.id] = c.factionId;
  }
  // §18.3: whether each Achieve goal's target condition held at the last detection, so completion needs a real
  // false → true transition (a condition that already holds, or a touch that changes nothing relevant, completes nothing)
  const conditionHeld: Record<string, boolean> = Object.fromEntries(factionGoals.map(g => [g.id, goalConditionMet(g, world) === true]));

  const introAt = eventSessionNumbers(sessions);   // M1: introduced entities join the world at their Event's session
  const formulas = parseFormulas(rules?.formulasJson);

  return sessions.map(session => {
    // M3 interim Opening: until Colony Turns exist (M5), the previous session's signals resolve at the start of this
    // session, so everything played in this session sees the new tier.
    // M5: a committed Colony Turn Opening (its `opening` marker) materializes the resolution as momentumTier Effects,
    // which are folded below; the derived resolution is then kept for display only and never applied.
    const hasOpening = (session.events ?? []).some(e => e.kind === 'ColonyTurn'
      && e.effects.some(ef => ef.targetType === 'colony' && ef.property === 'opening'));
    const resolved = resolveMomentum(tiers, pending);
    if (!hasOpening) tiers = resolved.tiers;
    pending = [];
    const signals: MomentumSignal[] = [];
    const signal = (factionId: string | undefined, sign: 1 | -1, rule: MomentumRule, rootCauseId: string, reason: string): void => {
      if (factionId) signals.push({ factionId, sign, rule, rootCauseId, sourceSessionId: session.id, reason });
    };
    const lastTouch: Record<string, string> = {};   // character/asset → the last Effect that changed it (detector root cause)
    const touchEffect: Record<string, { ef: EventEffect; ev: CampaignEvent }> = {};   // same, with the Effect (M4 credit)


    // Apply manual effects from this session's events
    for (const ev of [...(session.events ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)) {
      for (const ef of orderedEffects(ev.effects)) {
        if (ef.targetType === 'colony' && ef.property === 'characterPhase') {
          lastCharacterPhase = session.number;   // M6 marker: a committed Character Phase
        // §18.10: a recorded Stress Effect (colony or asset 'stress') is inert: Stress is derived from World Conditions only
        } else if (ef.targetType === 'faction') {
          if (ef.property === 'momentumTier') {
            tiers = { ...tiers, [ef.targetId]: clampTier((tiers[ef.targetId] ?? 0) + ef.delta) };   // M5 Opening resolution
          } else if (ef.property === 'leaderChange') {
            factionLeaders[ef.targetId] = ef.value || null;
          } else if (ef.property === 'momentumSignal') {
            if (ef.delta !== 0) {
              const critical = ef.origin === 'FactionPhase';   // M5: a natural 12 / natural 2 on an operation attempt
              signal(ef.targetId, ef.delta > 0 ? 1 : -1, critical ? (ef.delta > 0 ? 'critical-success' : 'critical-failure') : 'gm-declared',
                     ef.secondaryTargetId || ef.id, ef.value || 'GM-declared');
            }
          } else if (ef.property === 'momentum') {
            momentum[ef.targetId] = (momentum[ef.targetId] ?? 0) + ef.delta;   // legacy raw value (archived)
          } else if (ef.property === 'powerModifier') {
            powerModifier[ef.targetId] = (powerModifier[ef.targetId] ?? 0) + ef.delta;
          } else if (ef.property === 'factionSize' || ef.property === 'additionalMembers') {   // 'additionalMembers': the name for one day (§18.7)
            factionSize[ef.targetId] = Math.max(0, (factionSize[ef.targetId] ?? 0) + Math.round(ef.delta));
          } else if (ef.property === 'relationshipBump' && ef.secondaryTargetId) {
            if (!relBumps[ef.targetId]) relBumps[ef.targetId] = {};
            relBumps[ef.targetId][ef.secondaryTargetId] = (relBumps[ef.targetId][ef.secondaryTargetId] ?? 0) + ef.delta;
          } else if (ef.property === 'partyRelationshipBump') {
            partyBumps[ef.targetId] = (partyBumps[ef.targetId] ?? 0) + ef.delta;
          }
        } else if (ef.targetType === 'character') {
          if (ef.property === 'pressure') {
            pressure[ef.targetId] = (pressure[ef.targetId] ?? 0) + ef.delta;
          } else if (ef.property === 'influence') {
            influence[ef.targetId] = (influence[ef.targetId] ?? 0) + ef.delta;
          } else if (ef.property === 'state' && ef.value) {
            const fid = factionIds[ef.targetId];
            if (states[ef.targetId] === 'Alive' && ef.value !== 'Alive' && fid && factionLeaders[fid] === ef.targetId)
              signal(fid, -1, 'leader-incapable', ef.id, `Leader ${charName.get(ef.targetId) ?? ef.targetId} ${ef.value}`);
            states[ef.targetId] = ef.value as CharacterState;
            lastTouch[ef.targetId] = ef.id; touchEffect[ef.targetId] = { ef, ev };
          } else if (ef.property === 'instability' && ef.value) {
            const prev = instability[ef.targetId] ?? 'Stable', next = ef.value as CharacterInstability;
            if (next === 'Compromised') crisisOpen.add(ef.targetId);
            if (next === 'Stable' && prev === 'Conflicted') recoveredAt[ef.targetId] = session.number;   // a recovery
            if (next === 'Stable' && crisisOpen.has(ef.targetId)) {   // survived the crisis without leaving: Reaffirmed
              crisisOpen.delete(ef.targetId);
              reaffirmed[ef.targetId] = factionIds[ef.targetId] ?? null;
            }
            instability[ef.targetId] = next;
          } else if (ef.property === 'factionChange') {
            const from = factionIds[ef.targetId], to = ef.value || undefined;
            if (from && from !== to) crisisOpen.delete(ef.targetId);   // a defection ends the crisis without Reaffirmation
            // M6: a defection decided by an Opening Defection Check (op-2/op-3 records) was resolved in that same Opening.
            // §18.4: one decided by a Character Phase check signals here, like any play defection: the next Opening.
            if (from && from !== to && states[ef.targetId] === 'Alive' && factionLeaders[from] === ef.targetId && ef.origin !== 'Opening')
              signal(from, -1, 'leader-left', ef.id, `Leader ${charName.get(ef.targetId) ?? ef.targetId} left the faction`);
            if (from && from !== to) {
              // M4: a defector takes neither the leadership nor any goal with them; those goals lose their champion.
              if (factionLeaders[from] === ef.targetId) factionLeaders[from] = null;
              for (const g of factionGoals)
                if (g.factionId === from && goalChampions[g.id] === ef.targetId) goalChampions[g.id] = null;
            }
            factionIds[ef.targetId] = to;
            lastTouch[ef.targetId] = ef.id; touchEffect[ef.targetId] = { ef, ev };
          } else if (ef.property === 'locationChange') {
            characterLocations[ef.targetId] = ef.value || undefined;
          } else if (ef.property === 'mapPlacement') {
            if (ef.value) {
              try { placementOverrides[ef.targetId] = JSON.parse(ef.value); } catch { /* ignore */ }
            } else {
              placementOverrides[ef.targetId] = 'removed';
            }
          }
        } else if (ef.targetType === 'asset') {
          if (ef.property === 'controllingFactionId') {
            const from = assetControl[ef.targetId], to = ef.value || undefined;
            if (keystones.has(ef.targetId) && from && from !== to && !OPERATION_ORIGINS.has(ef.origin ?? 'Manual'))
              signal(from, -1, 'keystone-lost', ef.id, `Lost control of Keystone ${assetName.get(ef.targetId) ?? ef.targetId}`);
            assetControl[ef.targetId] = to;
            lastTouch[ef.targetId] = ef.id; touchEffect[ef.targetId] = { ef, ev };
          } else if (ef.property === 'status' && ef.value) {
            if (keystones.has(ef.targetId) && ef.value === 'Destroyed' && assetStatuses[ef.targetId] !== 'Destroyed' && !OPERATION_ORIGINS.has(ef.origin ?? 'Manual'))
              signal(assetControl[ef.targetId], -1, 'keystone-lost', ef.id, `Keystone ${assetName.get(ef.targetId) ?? ef.targetId} Destroyed`);
            assetStatuses[ef.targetId] = ef.value as AssetStatus;
            assetStatusActors[ef.targetId] = ef.actorFactionId || undefined;
            lastTouch[ef.targetId] = ef.id; touchEffect[ef.targetId] = { ef, ev };
          } else if (ef.property === 'locationChange') {
            assetLocations[ef.targetId] = ef.value || undefined;
          } else if (ef.property === 'mapPlacement') {
            if (ef.value) {
              try { placementOverrides[ef.targetId] = JSON.parse(ef.value); } catch { /* ignore */ }
            } else {
              placementOverrides[ef.targetId] = 'removed';
            }
          }
        } else if (ef.targetType === 'location') {
          if (ef.property === 'state' && ef.value) {
            if (['Stable', 'ActiveIncursion', 'Unstable'].includes(ef.value)) locationStates[ef.targetId] = ef.value as LocationState;   // §18.9 values only
          }
        } else if (ef.targetType === 'condition') {
          if (ef.property === 'state' && ef.value)
            conditionStates[ef.targetId] = { active: ef.value === 'Active', session: session.number, eventId: ev.id, eventTitle: ev.title };
        } else if (ef.targetType === 'goal') {
          if (ef.property === 'status' && ef.value) {
            if (ef.value === 'Accomplished' && goalStatuses[ef.targetId] !== 'Accomplished') {
              // an explicit resolution: attributed to its actor, else the Effect that changed the target in this Event,
              // else (an operation's own resolution) the goal's faction; otherwise not recorded (GM-declared)
              const g = factionGoals.find(x => x.id === ef.targetId);
              const touch = g?.targetEntityId ? touchEffect[g.targetEntityId] : undefined;
              goalAccomplishedBy[ef.targetId] = ef.actorFactionId
                ?? (touch?.ev === ev ? attributionOf({ id: ef.targetId }, touch.ef, ev, id => factionIds[id]) : null)
                ?? (OPERATION_ORIGINS.has(ef.origin ?? 'Manual') ? g?.factionId ?? null : attributionOf({ id: ef.targetId }, undefined, ev, id => factionIds[id]));
            } else if (ef.value !== 'Accomplished') delete goalAccomplishedBy[ef.targetId];   // a GM correction
            goalStatuses[ef.targetId] = ef.value as GoalStatus;
            if (TERMINAL_GOAL_STATUSES.includes(ef.value as GoalStatus)) delete goalReady[ef.targetId];   // resolved: leaves play
            if (ef.value === 'Plotting') delete goalReady[ef.targetId];   // setback: the milestone was undone; back to Planning
            if (ef.value === 'Retired') goalChampions[ef.targetId] = null;                               // ruling: champion unassigned
          } else if (ef.property === 'championChange') {
            goalChampions[ef.targetId] = ef.value || null;
          } else if (ef.property === 'readyToResolve' && ef.value) {
            if (ef.value === 'Ready') {
              if (!TERMINAL_GOAL_STATUSES.includes(goalStatuses[ef.targetId]))
                goalReady[ef.targetId] = { sinceSession: session.number };
            } else if (ef.value === 'Cleared') {
              delete goalReady[ef.targetId];   // remains Progressing: back to the pool
            }
          } else if (ef.property === 'participate' && ef.secondaryTargetId) {
            const actorId = ef.secondaryTargetId;
            const role = ef.value ?? 'Helping';
            // Resolve actorType: check characters first, then factions, then 'party' literal
            const actorChar = characters.find(c => c.id === actorId);
            const actorType = actorId === 'party' ? 'party' : actorChar ? 'character' : 'faction';
            if (!goalParticipants[ef.targetId]) goalParticipants[ef.targetId] = [];
            goalParticipants[ef.targetId].push({ actorId, actorType, role, delta: ef.delta, sessionId: session.id });
            // Derive relationship bump: Helping → positive, Hindering → negative
            const bumpSign = role === 'Helping' ? 1 : -1;
            const bumpMag = Math.abs(ef.delta) * bumpSign;
            if (actorType === 'party') {
              // Party participation bumps the goal's owning faction toward party
              const goalFactionId = factionGoals.find(g => g.id === ef.targetId)?.factionId;
              if (goalFactionId && bumpMag !== 0) {
                partyBumps[goalFactionId] = (partyBumps[goalFactionId] ?? 0) + bumpMag;
              }
            } else if (actorType === 'character') {
              // Character participation bumps their faction → goal's faction
              const charFactionId = factionIds[actorId];
              const goalFactionId = factionGoals.find(g => g.id === ef.targetId)?.factionId;
              if (charFactionId && goalFactionId && charFactionId !== goalFactionId && bumpMag !== 0) {
                if (!relBumps[charFactionId]) relBumps[charFactionId] = {};
                relBumps[charFactionId][goalFactionId] = (relBumps[charFactionId][goalFactionId] ?? 0) + bumpMag;
              }
            } else if (actorType === 'faction') {
              // Faction participation bumps actor faction → goal's faction
              const goalFactionId = factionGoals.find(g => g.id === ef.targetId)?.factionId;
              if (goalFactionId && actorId !== goalFactionId && bumpMag !== 0) {
                if (!relBumps[actorId]) relBumps[actorId] = {};
                relBumps[actorId][goalFactionId] = (relBumps[actorId][goalFactionId] ?? 0) + bumpMag;
              }
            }
          }
        }
      }
    }

    // Goal condition pass (detector, §18.3): the world is authoritative. An Achieve goal whose target condition goes
    // from false to true is Accomplished, whoever caused it (the faction, Darkwing, another faction), from Planning or
    // Progressing alike; the cause is recorded as attribution only. Ready to Resolve goals are detected too (the task
    // closes). Accomplished is permanent. Maintain goals are defensive assignments (§6.5): never written here.
    // D6 (M0): runs once, after all of the session's Effects (no derived pass can change the world afterwards).
    const detectGoals = (): void => {
      for (const g of factionGoals) {
        if (g.conditionType !== 'Achieve') continue;
        const met = goalConditionMet(g, world) === true, was = conditionHeld[g.id];
        conditionHeld[g.id] = met;
        if (!met || was || TERMINAL_GOAL_STATUSES.includes(goalStatuses[g.id])) continue;
        if (g.introducedAtEventId && (introAt.get(g.introducedAtEventId) ?? Infinity) > session.number) continue;   // not in the world yet
        const cause = g.targetEntityId ? touchEffect[g.targetEntityId] : undefined;
        goalStatuses[g.id] = 'Accomplished';
        goalAccomplishedBy[g.id] = attributionOf(g, cause?.ef, cause?.ev, id => factionIds[id]);
        delete goalReady[g.id];
      }
    };
    detectGoals();

    // 2026-10-15 Momentum decision: an Accomplishment sends no automatic signal (it fed an upward ratchet under Power
    // allocation). Operations move Momentum only through critical dice (M5); play through explicit, justified signals.
    pending = signals;

    // §18.10: Colony Stress is derived, never accumulated: the sum of the Stress contributions of the World Conditions in
    // force at the end of the session, clamped 0–10. It falls as soon as a condition stops holding.
    const condWorld: ConditionWorld = {
      assetOwner: id => assetControl[id], assetStatus: id => assetStatuses[id],
      characterState: id => states[id], characterFaction: id => factionIds[id],
      leaderCapable: f => { const l = factionLeaders[f]; return !!l && states[l] === 'Alive' && factionIds[l] === f; },
      locationState: id => locationStates[id], established: id => conditionStates[id],
      goalStage: id => goalStageOf(goalStatuses[id], !!goalReady[id]),
    };
    const fromConditions = conditions.length
      ? conditionStress(evaluateConditions(conditions, condWorld, { asset: id => assetName.get(id) ?? id, faction: id => id }))
      : { total: 0, parts: [] };

    return {
      sessionId: session.id,
      sessionNumber: session.number,
      colonyStress: Math.max(0, Math.min(10, fromConditions.total)),
      stressFromConditions: fromConditions.parts,
      factionMomentum: { ...momentum },
      factionMomentumTier: { ...tiers },
      momentumResolutions: resolved.resolutions,
      pendingMomentumSignals: [...signals],
      goalChampions: { ...goalChampions },
      factionLeaders: { ...factionLeaders },
      goalReady: Object.fromEntries(Object.entries(goalReady).map(([k, v]) => [k, { ...v }])),
      goalAccomplishedBy: { ...goalAccomplishedBy },
      conditionStates: Object.fromEntries(Object.entries(conditionStates).map(([k, v]) => [k, { ...v }])),
      characterInstability: { ...instability },
      characterReaffirmed: { ...reaffirmed },
      characterRecoveredAt: { ...recoveredAt },
      lastCharacterPhaseSession: lastCharacterPhase,
      factionPowerModifier: { ...powerModifier },
      factionSize: { ...factionSize },
      characterPressure: { ...pressure },
      characterInfluence: { ...influence },
      characterStates: { ...states },
      characterFactions: { ...factionIds },
      factionRelationshipBumps: Object.fromEntries(
        Object.entries(relBumps).map(([src, targets]) => [src, { ...targets }])
      ),
      factionPartyBumps: { ...partyBumps },
      assetControl: { ...assetControl },
      assetStatuses: { ...assetStatuses },
      assetStatusActors: { ...assetStatusActors },
      goalStatuses: { ...goalStatuses },
      goalParticipants: Object.fromEntries(
        Object.entries(goalParticipants).map(([k, v]) => [k, [...v]])
      ),
      locationStates: { ...locationStates },
      characterLocations: { ...characterLocations },
      assetLocations: { ...assetLocations },
      placementOverrides: { ...placementOverrides },
    };
  });
}
