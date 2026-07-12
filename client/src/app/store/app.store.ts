import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import { computed } from '@angular/core';
import {
  Faction, ColonyState, RelationshipBreakdown, RelationshipOverride,
  RulesConfig, SessionLogEntry, RelationshipLabel, Character, CharacterState, driftScore, effectivePressure,
  topCompatibleFactions, influenceConvictionBonus, Session, CampaignEvent, ColonySnapshot, DerivedEffect,
  ValueLabels, BeliefAxisLabels, BeliefAxisConfig, DEFAULT_VALUE_LABELS, DEFAULT_BELIEF_AXIS_LABELS,
  CascadeRule, DEFAULT_CASCADE_RULES,
  FormulasConfig, DEFAULT_FORMULAS,
  FACTION_EFFECT_PROPS, CHARACTER_EFFECT_PROPS,
  Campaign, AppSettings,
  Asset, AssetStatus, FactionGoal, GoalStatus, computeFactionInfluence, computeFactionPower,
  StressTrigger,
} from '../core/models/types';
import { ApiService } from '../core/services/api.service';
import { scoreRelationship, ScoringActor } from '../core/services/scoring.service';

interface AppState {
  factions: Faction[];
  colonyState: ColonyState | null;
  relationships: RelationshipBreakdown[];
  overrides: RelationshipOverride[];
  rules: RulesConfig | null;
  sessionLog: SessionLogEntry[];
  characters: Character[];
  sessions: Session[];
  assets: Asset[];
  factionGoals: FactionGoal[];
  loading: boolean;
  error: string | null;
  // 'baseline' | 'current' | sessionId
  viewingContext: string;
  campaigns: Campaign[];
  activeCampaign: Campaign | null;
}

const initialState: AppState = {
  factions: [],
  colonyState: null,
  relationships: [],
  overrides: [],
  rules: null,
  sessionLog: [],
  characters: [],
  sessions: [],
  assets: [],
  factionGoals: [],
  loading: false,
  error: null,
  viewingContext: 'current',
  campaigns: [],
  activeCampaign: null,
};

function parseBeliefAxisLabels(json: string | undefined): BeliefAxisLabels {
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

function parseFormulas(json: string | undefined): FormulasConfig {
  if (!json) return DEFAULT_FORMULAS;
  try { return { ...DEFAULT_FORMULAS, ...JSON.parse(json) }; }
  catch { return DEFAULT_FORMULAS; }
}

function parseCascadeRules(json: string | undefined): CascadeRule[] {
  if (!json) return DEFAULT_CASCADE_RULES;
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : DEFAULT_CASCADE_RULES;
  } catch { return DEFAULT_CASCADE_RULES; }
}

function parseStressTriggers(json: string | undefined): StressTrigger[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function applyCharacterDelta(
  cid: string, prop: string, delta: number,
  pressure: Record<string, number>, influence: Record<string, number>
): void {
  if (prop === 'pressure') pressure[cid] = (pressure[cid] ?? 0) + delta;
  else if (prop === 'influence') influence[cid] = (influence[cid] ?? 0) + delta;
}

// Applies a derived (cascade-rule) faction property delta and records it for streak chaining.
function applyFactionDelta(
  fid: string, prop: string, delta: number,
  momentum: Record<string, number>,
  baseLegitimacy: Record<string, number>,
  powerModifier: Record<string, number>,
  derivedDelta: Record<string, Record<string, number>>
): void {
  if (prop === 'momentum') momentum[fid] = (momentum[fid] ?? 0) + delta;
  else if (prop === 'baseLegitimacy') baseLegitimacy[fid] = (baseLegitimacy[fid] ?? 0) + delta;
  else if (prop === 'powerModifier') powerModifier[fid] = (powerModifier[fid] ?? 0) + delta;
  if (!derivedDelta[fid]) derivedDelta[fid] = {};
  derivedDelta[fid][prop] = (derivedDelta[fid][prop] ?? 0) + delta;
}

function buildColonySnapshots(
  baseline: ColonyState | null,
  factions: Faction[],
  characters: Character[],
  sessions: Session[],
  rules: RulesConfig | null,
  assets: Asset[] = [],
  factionGoals: FactionGoal[] = []
): ColonySnapshot[] {
  if (!baseline || sessions.length === 0) return [];

  let stress = baseline.colonyStress;
  const momentum: Record<string, number> = {};
  const baseLegitimacy: Record<string, number> = {};
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
  const firedStressTriggers: string[] = [];
  // Consecutive streak counters: factionId → property → count
  const consecutiveNeg: Record<string, Record<string, number>> = {};
  const consecutivePos: Record<string, Record<string, number>> = {};

  for (const a of assets) {
    assetControl[a.id] = a.controllingFactionId;
    assetStatuses[a.id] = a.status;
    assetStatusActors[a.id] = a.statusActorFactionId;
  }
  for (const g of factionGoals) {
    goalStatuses[g.id] = g.status;
  }
  for (const f of factions) {
    momentum[f.id] = f.momentum;
    baseLegitimacy[f.id] = f.baseLegitimacy;
    powerModifier[f.id] = f.powerModifier;
    consecutiveNeg[f.id] = {};
    consecutivePos[f.id] = {};
  }
  for (const c of characters) {
    pressure[c.id] = c.pressure;
    influence[c.id] = c.influence;
    states[c.id] = c.state;
    factionIds[c.id] = c.factionId;
  }

  const cascadeRules = parseCascadeRules(rules?.cascadeRulesJson);
  const stressTriggers = parseStressTriggers(rules?.stressTriggersJson);
  const formulas = parseFormulas(rules?.formulasJson);

  return sessions.map(session => {
    // Manual-only deltas this session, keyed factionId → property.
    // Used as the multiplier basis for streak rules so only intentional
    // session effects scale the multiplier, not cascades.
    const manualDelta: Record<string, Record<string, number>> = {};
    // Derived-only deltas accumulated while cascade rules run.
    const derivedDelta: Record<string, Record<string, number>> = {};

    // Capture goal statuses before this session's effects + achievement pass so
    // cascade rules can detect status transitions (prev ∉ target, new ∈ target).
    const preSessionGoalStatuses: Record<string, GoalStatus> = { ...goalStatuses };

    // Apply manual effects from this session's events
    for (const ev of [...(session.events ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)) {
      for (const ef of ev.effects) {
        if (ef.targetType === 'colony' && ef.property === 'stress') {
          stress = Math.max(0, Math.min(10, stress + ef.delta));
        } else if (ef.targetType === 'faction') {
          if (ef.property === 'momentum') {
            momentum[ef.targetId] = (momentum[ef.targetId] ?? 0) + ef.delta;
          } else if (ef.property === 'baseLegitimacy') {
            baseLegitimacy[ef.targetId] = (baseLegitimacy[ef.targetId] ?? 0) + ef.delta;
          } else if (ef.property === 'powerModifier') {
            powerModifier[ef.targetId] = (powerModifier[ef.targetId] ?? 0) + ef.delta;
          } else if (ef.property === 'relationshipBump' && ef.secondaryTargetId) {
            if (!relBumps[ef.targetId]) relBumps[ef.targetId] = {};
            relBumps[ef.targetId][ef.secondaryTargetId] = (relBumps[ef.targetId][ef.secondaryTargetId] ?? 0) + ef.delta;
          } else if (ef.property === 'partyRelationshipBump') {
            partyBumps[ef.targetId] = (partyBumps[ef.targetId] ?? 0) + ef.delta;
          }
          // Track manual delta for streak-eligible numeric properties
          if (ef.property === 'momentum' || ef.property === 'baseLegitimacy') {
            if (!manualDelta[ef.targetId]) manualDelta[ef.targetId] = {};
            manualDelta[ef.targetId][ef.property] = (manualDelta[ef.targetId][ef.property] ?? 0) + ef.delta;
          }
        } else if (ef.targetType === 'character') {
          if (ef.property === 'pressure') {
            pressure[ef.targetId] = (pressure[ef.targetId] ?? 0) + ef.delta;
          } else if (ef.property === 'influence') {
            influence[ef.targetId] = (influence[ef.targetId] ?? 0) + ef.delta;
          } else if (ef.property === 'state' && ef.value) {
            states[ef.targetId] = ef.value as CharacterState;
          } else if (ef.property === 'factionChange') {
            factionIds[ef.targetId] = ef.value || undefined;
          }
        } else if (ef.targetType === 'asset') {
          if (ef.property === 'controllingFactionId') {
            assetControl[ef.targetId] = ef.value || undefined;
          } else if (ef.property === 'status' && ef.value) {
            assetStatuses[ef.targetId] = ef.value as AssetStatus;
            assetStatusActors[ef.targetId] = ef.actorFactionId || undefined;
          } else if (ef.property === 'stress') {
            stress = Math.max(0, Math.min(10, stress + ef.delta));
          }
        } else if (ef.targetType === 'goal') {
          if (ef.property === 'status' && ef.value) {
            goalStatuses[ef.targetId] = ef.value as GoalStatus;
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

    // Snapshot counters before this session so the post-cascade pass can
    // rebase from the same starting point (avoids double-incrementing).
    const preSessionNeg: Record<string, Record<string, number>> = {};
    const preSessionPos: Record<string, Record<string, number>> = {};
    for (const fid of Object.keys(momentum)) {
      preSessionNeg[fid] = { ...(consecutiveNeg[fid] ?? {}) };
      preSessionPos[fid] = { ...(consecutivePos[fid] ?? {}) };
    }

    // Update streak counters from manual deltas so cascade rules see the
    // correct current-session streak when they fire below.
    // Only update when there is a definite manual signal — do NOT reset on
    // delta=0 because the session may still produce a derived delta (e.g.
    // a leaderless event rule). The pass-2 refresh using total delta handles
    // the reset if the session genuinely had no net movement.
    for (const fid of Object.keys(momentum)) {
      for (const prop of ['momentum', 'baseLegitimacy']) {
        const delta = manualDelta[fid]?.[prop] ?? 0;
        if (!consecutiveNeg[fid]) consecutiveNeg[fid] = {};
        if (!consecutivePos[fid]) consecutivePos[fid] = {};
        if (delta < 0) {
          consecutiveNeg[fid][prop] = (preSessionNeg[fid]?.[prop] ?? 0) + 1;
          consecutivePos[fid][prop] = 0;
        } else if (delta > 0) {
          consecutivePos[fid][prop] = (preSessionPos[fid]?.[prop] ?? 0) + 1;
          consecutiveNeg[fid][prop] = 0;
        }
        // delta === 0: leave counters unchanged; pass-2 refresh will reset
        // them if total (manual + derived) also ends up 0.
      }
    }

    // Apply cascade rules — two passes so a pass-1 derived effect can push a
    // value over a threshold and trigger a different rule in pass 2.
    // firedSet prevents any (rule, entity) pair from firing more than once.
    const derivedEffects: DerivedEffect[] = [];
    const firedSet = new Set<string>();
    for (let pass = 0; pass < 2; pass++) {
    // Before pass 2, refresh streak counters to include derived deltas from
    // pass 1 so chained derived effects (e.g. leaderless → momentum loss →
    // streak rule) can fire in the same session.
    if (pass === 1) {
      for (const fid of Object.keys(momentum)) {
        for (const prop of ['momentum', 'baseLegitimacy']) {
          const total = (manualDelta[fid]?.[prop] ?? 0) + (derivedDelta[fid]?.[prop] ?? 0);
          if (!consecutiveNeg[fid]) consecutiveNeg[fid] = {};
          if (!consecutivePos[fid]) consecutivePos[fid] = {};
          if (total < 0) {
            consecutiveNeg[fid][prop] = (preSessionNeg[fid]?.[prop] ?? 0) + 1;
            consecutivePos[fid][prop] = 0;
          } else if (total > 0) {
            consecutivePos[fid][prop] = (preSessionPos[fid]?.[prop] ?? 0) + 1;
            consecutiveNeg[fid][prop] = 0;
          } else {
            consecutiveNeg[fid][prop] = 0;
            consecutivePos[fid][prop] = 0;
          }
        }
      }
    }
    for (const rule of cascadeRules) {
      if (rule.triggerType === 'streak') {
        if (rule.sourceEntityType !== 'faction') continue;
        const prop = rule.sourceProperty;
        const dir = rule.direction ?? 'either';
        const minWeeks = rule.minConsecutiveWeeks ?? 1;
        const dirsToCheck: Array<'negative' | 'positive'> = dir === 'either' ? ['negative', 'positive'] : [dir];
        for (const factionId of Object.keys(momentum)) {
          for (const d of dirsToCheck) {
            const fireKey = `${rule.id}::${factionId}::${d}`;
            if (firedSet.has(fireKey)) continue;
            const streak = d === 'negative'
              ? (consecutiveNeg[factionId]?.[prop] ?? 0)
              : (consecutivePos[factionId]?.[prop] ?? 0);
            if (streak < minWeeks) continue;
            // Only fire the highest-threshold matching rule per (faction, property, direction)
            const competing = cascadeRules.filter(cr =>
              cr.triggerType === 'streak' &&
              cr.sourceEntityType === 'faction' &&
              cr.sourceProperty === prop &&
              (cr.direction === d || cr.direction === 'either') &&
              (cr.minConsecutiveWeeks ?? 1) <= streak
            ).sort((a, b) => (b.minConsecutiveWeeks ?? 1) - (a.minConsecutiveWeeks ?? 1));
            if (competing[0]?.id !== rule.id) continue;

            const sourceDelta = (manualDelta[factionId]?.[prop] ?? 0) + (derivedDelta[factionId]?.[prop] ?? 0);
            let change: number;
            if (rule.effectType === 'multiplier') {
              const sign = d === 'negative' ? -1 : 1;
              change = sign * Math.abs(sourceDelta) * (rule.multiplier ?? 1);
            } else {
              change = rule.flatDelta ?? 0;
            }
            if (change === 0) continue;

            if (rule.targetEntityType === 'faction') {
              applyFactionDelta(factionId, rule.targetProperty, change, momentum, baseLegitimacy, powerModifier, derivedDelta);
            } else if (rule.targetEntityType === 'character') {
              for (const cid of Object.keys(factionIds)) {
                if (factionIds[cid] !== factionId) continue;
                applyCharacterDelta(cid, rule.targetProperty as string, change, pressure, influence);
              }
            }
            firedSet.add(fireKey);
            derivedEffects.push({
              ruleId: rule.id, ruleLabel: rule.label,
              sourceEntityType: 'faction', sourceEntityId: factionId, sourceProperty: prop,
              triggerType: 'streak', consecutiveWeeks: streak, direction: d,
              targetEntityType: rule.targetEntityType, targetEntityId: factionId, targetProperty: rule.targetProperty,
              delta: change,
              factionId, legitimacyChange: change,
            });
          }
        }
      } else if (rule.triggerType === 'threshold') {
        const op = rule.thresholdOperator ?? 'gt';
        const tv = rule.thresholdValue ?? 0;
        if (rule.sourceEntityType === 'faction') {
          for (const factionId of Object.keys(momentum)) {
            const fireKey = `${rule.id}::${factionId}`;
            if (firedSet.has(fireKey)) continue;
            const val = rule.sourceProperty === 'momentum' ? momentum[factionId] : baseLegitimacy[factionId];
            if (val === undefined) continue;
            if (op === 'gt' ? val <= tv : val >= tv) continue;
            const change = rule.effectType === 'flat' ? (rule.flatDelta ?? 0) : 0;
            if (change === 0) continue;
            if (rule.targetEntityType === 'faction') {
              applyFactionDelta(factionId, rule.targetProperty, change, momentum, baseLegitimacy, powerModifier, derivedDelta);
            } else if (rule.targetEntityType === 'character') {
              for (const cid of Object.keys(factionIds)) {
                if (factionIds[cid] !== factionId) continue;
                applyCharacterDelta(cid, rule.targetProperty as string, change, pressure, influence);
              }
            }
            firedSet.add(fireKey);
            derivedEffects.push({
              ruleId: rule.id, ruleLabel: rule.label,
              sourceEntityType: 'faction', sourceEntityId: factionId, sourceProperty: rule.sourceProperty,
              triggerType: 'threshold', thresholdValue: tv,
              targetEntityType: rule.targetEntityType, targetEntityId: factionId, targetProperty: rule.targetProperty,
              delta: change,
              factionId, legitimacyChange: change,
            });
          }
        } else if (rule.sourceEntityType === 'character') {
          for (const cid of Object.keys(pressure)) {
            const fireKey = `${rule.id}::${cid}`;
            if (firedSet.has(fireKey)) continue;
            const val = rule.sourceProperty === 'pressure' ? pressure[cid]
                      : rule.sourceProperty === 'influence' ? influence[cid]
                      : undefined;
            if (val === undefined) continue;
            if (op === 'gt' ? val <= tv : val >= tv) continue;
            const change = rule.effectType === 'flat' ? (rule.flatDelta ?? 0) : 0;
            if (change === 0) continue;
            const targetFactionId = factionIds[cid];
            if (rule.targetEntityType === 'faction' && targetFactionId) {
              applyFactionDelta(targetFactionId, rule.targetProperty, change, momentum, baseLegitimacy, powerModifier, derivedDelta);
            } else if (rule.targetEntityType === 'character') {
              applyCharacterDelta(cid, rule.targetProperty as string, change, pressure, influence);
            }
            firedSet.add(fireKey);
            derivedEffects.push({
              ruleId: rule.id, ruleLabel: rule.label,
              sourceEntityType: 'character', sourceEntityId: cid, sourceProperty: rule.sourceProperty,
              triggerType: 'threshold', thresholdValue: tv,
              targetEntityType: rule.targetEntityType, targetEntityId: rule.targetEntityType === 'faction' ? (targetFactionId ?? cid) : cid, targetProperty: rule.targetProperty,
              delta: change,
              factionId: targetFactionId, legitimacyChange: change,
            });
          }
        }
      } else if (rule.triggerType === 'event') {
        const allEffects = (session.events ?? []).flatMap(ev => ev.effects);

        if (rule.sourceEntityType === 'faction') {
          const propDesc = FACTION_EFFECT_PROPS.find(d => d.property === rule.sourceProperty);
          if (!propDesc) continue;
          for (const ef of allEffects) {
            const fireKey = `${rule.id}::${ef.targetId}`;
            if (firedSet.has(fireKey)) continue;
            if (ef.targetType !== 'faction' || ef.property !== rule.sourceProperty) continue;
            if (rule.sourceEntitySubtype) {
              const faction = factions.find(f => f.id === ef.targetId);
              if (!faction) continue;
              if (rule.sourceEntitySubtype === 'Faction' && faction.type !== 'Faction') continue;
              if (rule.sourceEntitySubtype === 'SocialClass' && faction.type !== 'SocialClass') continue;
            }
            if (propDesc.inputType === 'select' && rule.sourcePropertyValue?.length && !rule.sourcePropertyValue.includes(ef.value ?? '')) continue;
            const change = rule.effectType === 'flat' ? (rule.flatDelta ?? 0) : 0;
            if (change === 0) continue;
            const targetFactionId = ef.targetId;
            if (rule.targetEntityType === 'faction') {
              applyFactionDelta(targetFactionId, rule.targetProperty, change, momentum, baseLegitimacy, powerModifier, derivedDelta);
            } else if (rule.targetEntityType === 'character') {
              for (const cid of Object.keys(factionIds)) {
                if (factionIds[cid] !== targetFactionId) continue;
                applyCharacterDelta(cid, rule.targetProperty as string, change, pressure, influence);
              }
            }
            firedSet.add(fireKey);
            derivedEffects.push({
              ruleId: rule.id, ruleLabel: rule.label,
              sourceEntityType: 'faction', sourceEntityId: ef.targetId, sourceProperty: rule.sourceProperty,
              triggerType: 'event', eventCharacterType: rule.sourceEntitySubtype, eventStateValue: rule.sourcePropertyValue?.join(' | '),
              targetEntityType: rule.targetEntityType, targetEntityId: targetFactionId,
              targetProperty: rule.targetProperty,
              delta: change,
              factionId: targetFactionId, legitimacyChange: change,
            });
          }
        } else if (rule.sourceEntityType === 'character') {
          const propDesc = CHARACTER_EFFECT_PROPS.find(d => d.property === rule.sourceProperty);
          if (!propDesc) continue;
          for (const ef of allEffects) {
            const fireKey = `${rule.id}::${ef.targetId}`;
            if (firedSet.has(fireKey)) continue;
            if (ef.targetType !== 'character' || ef.property !== rule.sourceProperty) continue;
            const char = characters.find(c => c.id === ef.targetId);
            if (!char) continue;
            if (rule.sourceEntitySubtype && char.characterType !== rule.sourceEntitySubtype) continue;
            if (propDesc.inputType === 'select' && rule.sourcePropertyValue?.length && !rule.sourcePropertyValue.includes(ef.value ?? '')) continue;
            const change = rule.effectType === 'flat' ? (rule.flatDelta ?? 0) : 0;
            if (change === 0) continue;
            const targetFactionId = factionIds[ef.targetId];
            if (rule.targetEntityType === 'faction' && targetFactionId) {
              applyFactionDelta(targetFactionId, rule.targetProperty, change, momentum, baseLegitimacy, powerModifier, derivedDelta);
            } else if (rule.targetEntityType === 'character') {
              applyCharacterDelta(ef.targetId, rule.targetProperty as string, change, pressure, influence);
            }
            firedSet.add(fireKey);
            derivedEffects.push({
              ruleId: rule.id, ruleLabel: rule.label,
              sourceEntityType: 'character', sourceEntityId: ef.targetId, sourceProperty: rule.sourceProperty,
              triggerType: 'event', eventCharacterType: char.characterType, eventStateValue: ef.value,
              targetEntityType: rule.targetEntityType,
              targetEntityId: rule.targetEntityType === 'faction' ? (targetFactionId ?? ef.targetId) : ef.targetId,
              targetProperty: rule.targetProperty,
              delta: change,
              factionId: targetFactionId, legitimacyChange: change,
            });
          }
        } else if (rule.sourceEntityType === 'goal') {
          // Fires when a goal's status *transitions into* one of the watched values this session.
          // "Transition" = was not in the target set before this session, is now.
          // Effect targets the owning faction (or its characters).
          if (!rule.sourcePropertyValue?.length) continue;
          const change = rule.flatDelta ?? 0;
          if (change === 0) continue;
          for (const goal of factionGoals) {
            if (rule.sourceEntityId && rule.sourceEntityId !== goal.id) continue;
            if (rule.sourceEntitySubtype && rule.sourceEntitySubtype !== goal.priority) continue;
            // If a faction override is set, only fire for goals owned by that faction
            if (rule.targetEntityId && rule.targetEntityId !== goal.factionId) continue;
            const prevStatus = preSessionGoalStatuses[goal.id];
            const newStatus  = goalStatuses[goal.id];
            if (!newStatus) continue;
            // Only fire on a genuine transition into the target set
            if (rule.sourcePropertyValue.includes(prevStatus)) continue;
            if (!rule.sourcePropertyValue.includes(newStatus)) continue;
            const fireKey = `${rule.id}::${goal.id}`;
            if (firedSet.has(fireKey)) continue;
            // Use faction override if set, otherwise use the goal's owning faction
            const ownerFactionId = rule.targetEntityId || goal.factionId;
            if (rule.targetEntityType === 'faction') {
              applyFactionDelta(ownerFactionId, rule.targetProperty, change, momentum, baseLegitimacy, powerModifier, derivedDelta);
            } else if (rule.targetEntityType === 'character') {
              for (const cid of Object.keys(factionIds)) {
                if (factionIds[cid] !== ownerFactionId) continue;
                applyCharacterDelta(cid, rule.targetProperty as string, change, pressure, influence);
              }
            }
            firedSet.add(fireKey);
            derivedEffects.push({
              ruleId: rule.id, ruleLabel: rule.label,
              sourceEntityType: 'faction', sourceEntityId: ownerFactionId, sourceProperty: 'status',
              triggerType: 'event', eventStateValue: newStatus,
              targetEntityType: rule.targetEntityType, targetEntityId: ownerFactionId,
              targetProperty: rule.targetProperty,
              delta: change,
              factionId: ownerFactionId, legitimacyChange: change,
            });
          }
        }
      }
    }
    } // end pass loop

    // Evaluate stress triggers — fire when an entity's property matches a listed value this session
    for (const trigger of stressTriggers) {
      const allEffects = (session.events ?? []).flatMap(ev => ev.effects);
      if (trigger.sourceEntityType === 'asset') {
        const relevantEffects = allEffects.filter(ef =>
          ef.targetType === 'asset' && ef.property === trigger.sourceProperty
          && trigger.sourcePropertyValue.includes(ef.value ?? '')
        );
        for (const ef of relevantEffects) {
          if (trigger.sourceEntityId && ef.targetId !== trigger.sourceEntityId) continue;
          const key = `${trigger.id}::${ef.targetId}`;
          if (trigger.oneShot && firedStressTriggers.includes(key)) continue;
          stress = Math.max(0, Math.min(10, stress + trigger.flatDelta));
          if (trigger.oneShot) firedStressTriggers.push(key);
        }
      } else if (trigger.sourceEntityType === 'goal') {
        const relevantEffects = allEffects.filter(ef =>
          ef.targetType === 'goal' && ef.property === trigger.sourceProperty
          && trigger.sourcePropertyValue.includes(ef.value ?? '')
        );
        for (const ef of relevantEffects) {
          if (trigger.sourceEntityId && ef.targetId !== trigger.sourceEntityId) continue;
          const key = `${trigger.id}::${ef.targetId}`;
          if (trigger.oneShot && firedStressTriggers.includes(key)) continue;
          stress = Math.max(0, Math.min(10, stress + trigger.flatDelta));
          if (trigger.oneShot) firedStressTriggers.push(key);
        }
      } else if (trigger.sourceEntityType === 'character') {
        const relevantEffects = allEffects.filter(ef =>
          ef.targetType === 'character' && ef.property === trigger.sourceProperty
          && trigger.sourcePropertyValue.includes(ef.value ?? '')
        );
        for (const ef of relevantEffects) {
          if (trigger.sourceEntityId && ef.targetId !== trigger.sourceEntityId) continue;
          if (trigger.sourceEntitySubtype) {
            const char = characters.find(c => c.id === ef.targetId);
            if (!char || char.characterType !== trigger.sourceEntitySubtype) continue;
          }
          const key = `${trigger.id}::${ef.targetId}`;
          if (trigger.oneShot && firedStressTriggers.includes(key)) continue;
          stress = Math.max(0, Math.min(10, stress + trigger.flatDelta));
          if (trigger.oneShot) firedStressTriggers.push(key);
        }
      } else if (trigger.sourceEntityType === 'faction') {
        const relevantEffects = allEffects.filter(ef =>
          ef.targetType === 'faction' && ef.property === trigger.sourceProperty
          && trigger.sourcePropertyValue.includes(ef.value ?? '')
        );
        for (const ef of relevantEffects) {
          if (trigger.sourceEntityId && ef.targetId !== trigger.sourceEntityId) continue;
          const key = `${trigger.id}::${ef.targetId}`;
          if (trigger.oneShot && firedStressTriggers.includes(key)) continue;
          stress = Math.max(0, Math.min(10, stress + trigger.flatDelta));
          if (trigger.oneShot) firedStressTriggers.push(key);
        }
      }
    }

    // Re-compute streak counters from pre-session baseline using total delta
    // (manual + derived) so derived changes chain into streak detection for
    // subsequent sessions.
    for (const fid of Object.keys(momentum)) {
      for (const prop of ['momentum', 'baseLegitimacy']) {
        const total = (manualDelta[fid]?.[prop] ?? 0) + (derivedDelta[fid]?.[prop] ?? 0);
        if (!consecutiveNeg[fid]) consecutiveNeg[fid] = {};
        if (!consecutivePos[fid]) consecutivePos[fid] = {};
        if (total < 0) {
          consecutiveNeg[fid][prop] = (preSessionNeg[fid]?.[prop] ?? 0) + 1;
          consecutivePos[fid][prop] = 0;
        } else if (total > 0) {
          consecutivePos[fid][prop] = (preSessionPos[fid]?.[prop] ?? 0) + 1;
          consecutiveNeg[fid][prop] = 0;
        } else {
          consecutiveNeg[fid][prop] = 0;
          consecutivePos[fid][prop] = 0;
        }
      }
    }

    // Goal condition pass: auto-resolve goals whose structured target condition is evaluated.
    // 'achieve': promotes active → Accomplished when condition met; never overrides manual Failed.
    // 'maintain': fails active → Failed when condition is NOT met; never overrides manual Accomplished.
    for (const g of factionGoals) {
      const current = goalStatuses[g.id];
      const isMaintain = g.conditionType === 'Maintain';
      if (current === 'Accomplished' || current === 'Failed') continue;
      if (!g.targetEntityType || !g.targetEntityId) continue;
      let conditionMet = false;
      if (g.targetEntityType === 'Character' && g.targetState) {
        conditionMet = states[g.targetEntityId] === g.targetState;
      } else if (g.targetEntityType === 'Asset') {
        if (g.targetOwnerFactionId) {
          conditionMet = assetControl[g.targetEntityId] === g.targetOwnerFactionId;
        } else if (g.targetState) {
          conditionMet = assetStatuses[g.targetEntityId] === g.targetState;
        }
      } else if (g.targetEntityType === 'Faction' && g.targetProperty && g.targetOperator && g.targetThreshold != null) {
        const prop = g.targetProperty as 'influence' | 'power' | 'momentum';
        const targetFaction = factions.find(f => f.id === g.targetEntityId);
        let val: number | undefined;
        if (targetFaction) {
          const factionWithSnap: typeof targetFaction = {
            ...targetFaction,
            momentum:      momentum[g.targetEntityId]      ?? targetFaction.momentum,
            baseLegitimacy: baseLegitimacy[g.targetEntityId] ?? targetFaction.baseLegitimacy,
            powerModifier:  powerModifier[g.targetEntityId]  ?? targetFaction.powerModifier,
          };
          const factionMembers = characters.filter(c => c.factionId === g.targetEntityId && states[c.id] === 'Alive');
          const factionAssets  = assets.filter(a => assetControl[a.id] === g.targetEntityId);
          if (prop === 'momentum')  val = factionWithSnap.momentum;
          else if (prop === 'influence') val = computeFactionInfluence(factionWithSnap, factionMembers, factionAssets, formulas);
          else if (prop === 'power')     val = computeFactionPower(factionWithSnap, factionMembers, factionAssets, formulas);
        }
        if (val != null) {
          conditionMet = g.targetOperator === 'gte' ? val >= g.targetThreshold
                       : g.targetOperator === 'lte' ? val <= g.targetThreshold
                       : val === g.targetThreshold;
        }
      }
      if (isMaintain) {
        if (!conditionMet) goalStatuses[g.id] = 'Failed';
      } else {
        if (conditionMet) goalStatuses[g.id] = 'Accomplished';
      }
    }

    return {
      sessionId: session.id,
      sessionNumber: session.number,
      colonyStress: stress,
      factionMomentum: { ...momentum },
      factionBaseLegitimacy: { ...baseLegitimacy },
      factionPowerModifier: { ...powerModifier },
      characterPressure: { ...pressure },
      characterInfluence: { ...influence },
      characterStates: { ...states },
      characterFactions: { ...factionIds },
      factionRelationshipBumps: Object.fromEntries(
        Object.entries(relBumps).map(([src, targets]) => [src, { ...targets }])
      ),
      factionPartyBumps: { ...partyBumps },
      derivedEffects,
      assetControl: { ...assetControl },
      assetStatuses: { ...assetStatuses },
      assetStatusActors: { ...assetStatusActors },
      goalStatuses: { ...goalStatuses },
      goalParticipants: Object.fromEntries(
        Object.entries(goalParticipants).map(([k, v]) => [k, [...v]])
      ),
      firedStressTriggers: [...firedStressTriggers],
    };
  });
}

export const AppStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed((store) => ({
    activeFactions: computed(() =>
      store.factions().filter(f => f.active && f.type === 'Faction')
    ),
    allActiveFactions: computed(() =>
      store.factions().filter(f => f.active)
    ),
    // Characters sorted by effective drift score descending (most at-risk first)
    // Drift = effectivePressure - effectiveConviction (conviction + influence bonus from faction peers)
    // Only Alive characters are at risk; only Alive peers contribute influence
    mostAtRisk: computed(() => {
      const stress = store.colonyState()?.colonyStress ?? 0;
      const scale  = store.rules()?.influenceConvictionScale ?? 0.5;
      const alive  = store.characters().filter(c => c.state === 'Alive');
      const driftOf = (c: Character) => {
        const peers  = alive.filter(p => p.factionId && p.factionId === c.factionId && p.id !== c.id);
        const effConv = c.conviction + influenceConvictionBonus(c, peers, scale);
        return effectivePressure(c, stress) - effConv;
      };
      return [...alive].sort((a, b) => driftOf(b) - driftOf(a)).slice(0, 5);
    }),

    // Characters whose best compatible faction is not their current faction
    // Only Alive characters can defect; only Alive peers contribute influence
    potentialDefections: computed(() => {
      const activeFactions = store.factions().filter(f => f.active && f.type === 'Faction');
      const threshold = parseFormulas(store.rules()?.formulasJson).beliefDerivationThreshold;
      const axisLabels = parseBeliefAxisLabels(store.rules()?.beliefAxisLabelsJson);
      return store.characters()
        .filter(c => c.state === 'Alive' && c.factionId)
        .filter(c => {
          const top = topCompatibleFactions(c, activeFactions, threshold, axisLabels);
          return top.length > 0 && top[0].factionId !== c.factionId;
        });
    }),

    // Sessions sorted newest-first so new sessions appear at the top
    sortedSessions: computed(() =>
      [...store.sessions()].sort((a, b) => b.number - a.number)
    ),

    // Single shared snapshot computation — all view projections derive from this.
    // Sorted ascending by session number so time-travel accumulation is correct.
    colonySnapshots: computed((): ColonySnapshot[] =>
      buildColonySnapshots(
        store.colonyState(),
        store.factions(),
        store.characters(),
        [...store.sessions()].sort((a, b) => a.number - b.number),
        store.rules(),
        store.assets(),
        store.factionGoals()
      )
    ),

    // ── View-context helpers ───────────────────────────────────────────────
    isViewingSnapshot: computed(() => store.viewingContext() !== 'baseline'),

  })),

  // Block 2: activeSnapshot depends on colonySnapshots from block 1.
  withComputed((store) => ({
    activeSnapshot: computed((): ColonySnapshot | null => {
      const ctx = store.viewingContext();
      if (ctx === 'baseline') return null;
      const snaps = store.colonySnapshots();
      if (snaps.length === 0) return null;
      if (ctx === 'current') return snaps[snaps.length - 1];
      return snaps.find((s: ColonySnapshot) => s.sessionId === ctx) ?? snaps[snaps.length - 1];
    }),
  })),

  // Block 3: view projections depend on activeSnapshot from block 2.
  withComputed((store) => ({

    // Factions with momentum/baseLegitimacy/powerModifier projected to the active snapshot
    viewFactions: computed((): Faction[] => {
      const snap = store.activeSnapshot();
      if (!snap) return store.factions();
      return store.factions().map(f => ({
        ...f,
        momentum:        snap.factionMomentum[f.id]        ?? f.momentum,
        baseLegitimacy:  snap.factionBaseLegitimacy[f.id]  ?? f.baseLegitimacy,
        powerModifier:   snap.factionPowerModifier[f.id]   ?? f.powerModifier,
      }));
    }),

    // Characters with pressure/influence/state/faction projected to the active snapshot
    viewCharacters: computed((): Character[] => {
      const snap = store.activeSnapshot();
      if (!snap) return store.characters();
      return store.characters().map(c => ({
        ...c,
        pressure:  snap.characterPressure[c.id]  ?? c.pressure,
        influence: snap.characterInfluence[c.id] ?? c.influence,
        state:     snap.characterStates[c.id]    ?? c.state,
        factionId: snap.characterFactions[c.id]  !== undefined
          ? (snap.characterFactions[c.id] ?? undefined)
          : c.factionId,
      }));
    }),

    // Assets with controllingFactionId, status, and statusActorFactionId projected to the active snapshot
    viewAssets: computed((): Asset[] => {
      const snap = store.activeSnapshot();
      if (!snap) return store.assets();
      return store.assets().map(a => ({
        ...a,
        controllingFactionId: snap.assetControl[a.id] !== undefined
          ? (snap.assetControl[a.id] ?? undefined)
          : a.controllingFactionId,
        status: snap.assetStatuses[a.id] ?? a.status,
        statusActorFactionId: snap.assetStatusActors[a.id] !== undefined
          ? snap.assetStatusActors[a.id]
          : a.statusActorFactionId,
      }));
    }),

    // Goals with status projected to the active snapshot (auto-resolved statuses visible)
    viewGoals: computed((): FactionGoal[] => {
      const snap = store.activeSnapshot();
      if (!snap) return store.factionGoals();
      return store.factionGoals().map(g => ({
        ...g,
        status: snap.goalStatuses[g.id] ?? g.status,
      }));
    }),

    // Colony stress projected to the active snapshot
    viewColonyStress: computed((): number => {
      const ctx = store.viewingContext();
      if (ctx === 'baseline') return store.colonyState()?.colonyStress ?? 0;
      const snap = store.activeSnapshot();
      if (!snap) return store.colonyState()?.colonyStress ?? 0;
      return snap.colonyStress;
    }),

    // Label shown in the top-bar selector button
    viewingLabel: computed((): string => {
      const ctx = store.viewingContext();
      if (ctx === 'baseline') return 'Baseline';
      if (ctx === 'current') return 'Current State';
      const session = store.sessions().find(s => s.id === ctx);
      return session ? `Session ${session.number}: ${session.title}` : 'Current State';
    }),

  })),

  withComputed((store) => ({
    // Full recompute of all relationships at the viewed stress level + snapshot bumps.
    // Mirrors the relationships page logic so counts and tables are always consistent.
    viewRelationships: computed((): RelationshipBreakdown[] => {
      if (!store.isViewingSnapshot()) return store.relationships();
      const snap = store.activeSnapshot();
      const stress = store.viewColonyStress();
      const rules = store.rules();
      if (!rules) return store.relationships();

      const factionMap = new Map(store.viewFactions().map(f => [f.id, f]));
      const overrides = store.overrides();
      const cs = store.colonyState();
      const partyActor: ScoringActor = {
        id: 'party',
        values: cs?.partyValues ?? { a: 1/3, b: 1/3, c: 1/3 },
        beliefc: cs?.partyBeliefc,
        beliefa: cs?.partyBeliefa,
        beliefb: cs?.partyBeliefb,
      };
      return store.relationships().map(r => {
        const source = factionMap.get(r.sourceId);
        if (!source) return r;
        const target: ScoringActor = r.targetId === 'party'
          ? partyActor
          : (factionMap.get(r.targetId) ?? { id: r.targetId, values: { a: 1/3, b: 1/3, c: 1/3 } });
        const persistentBump = overrides
          .filter(o => o.sourceId === r.sourceId && o.targetId === r.targetId)
          .reduce((s, o) => s + o.scoreBump, 0);
        const sessionBump = snap
          ? (r.targetId === 'party'
              ? (snap.factionPartyBumps[r.sourceId] ?? 0)
              : (snap.factionRelationshipBumps[r.sourceId]?.[r.targetId] ?? 0))
          : 0;
        return scoreRelationship(source, target, stress, persistentBump + sessionBump, rules);
      });
    }),
  })),

  withComputed((store) => ({
    // View-aware versions of at-risk / defection lists for the dashboard
    viewMostAtRisk: computed(() => {
      const stress = store.viewColonyStress();
      const scale  = store.rules()?.influenceConvictionScale ?? 0.5;
      const chars  = store.viewCharacters();
      const alive  = chars.filter(c => c.state === 'Alive');
      const driftOf = (c: Character) => {
        const peers  = alive.filter(p => p.factionId && p.factionId === c.factionId && p.id !== c.id);
        const effConv = c.conviction + influenceConvictionBonus(c, peers, scale);
        return effectivePressure(c, stress) - effConv;
      };
      return [...alive].sort((a, b) => driftOf(b) - driftOf(a)).slice(0, 5);
    }),
    viewPotentialDefections: computed(() => {
      const activeFactions = store.viewFactions().filter(f => f.active && f.type === 'Faction');
      const threshold = parseFormulas(store.rules()?.formulasJson).beliefDerivationThreshold;
      const axisLabels = parseBeliefAxisLabels(store.rules()?.beliefAxisLabelsJson);
      return store.viewCharacters()
        .filter(c => c.state === 'Alive' && c.factionId)
        .filter(c => {
          const top = topCompatibleFactions(c, activeFactions, threshold, axisLabels);
          return top.length > 0 && top[0].factionId !== c.factionId;
        });
    }),

    cascadeRules: computed((): CascadeRule[] =>
      parseCascadeRules(store.rules()?.cascadeRulesJson)
    ),

    formulas: computed((): FormulasConfig => {
      const json = store.rules()?.formulasJson;
      if (!json) return DEFAULT_FORMULAS;
      try { return { ...DEFAULT_FORMULAS, ...JSON.parse(json) }; }
      catch { return DEFAULT_FORMULAS; }
    }),

    valueLabels: computed((): ValueLabels => {
      const json = store.rules()?.valueLabelsJson;
      if (!json) return DEFAULT_VALUE_LABELS;
      try { return { ...DEFAULT_VALUE_LABELS, ...JSON.parse(json) }; }
      catch { return DEFAULT_VALUE_LABELS; }
    }),

    beliefAxisLabels: computed((): BeliefAxisLabels =>
      parseBeliefAxisLabels(store.rules()?.beliefAxisLabelsJson)
    ),

    // View-aware relationship selectors — snapshot bumps applied
    mostHostile: computed(() =>
      [...store.viewRelationships()]
        .filter(r => r.targetId !== 'party')
        .sort((a, b) => a.finalScore - b.finalScore)
        .slice(0, 5)
    ),
    strongestAlliances: computed(() =>
      [...store.viewRelationships()]
        .filter(r => r.targetId !== 'party')
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, 5)
    ),
    partyRelationships: computed(() =>
      store.viewRelationships().filter(r => r.targetId === 'party')
    ),
    factionRelationships: computed(() =>
      store.viewRelationships().filter(r => r.targetId !== 'party')
    ),
  })),

  withMethods((store, api = inject(ApiService)) => ({
    loadAll: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() =>
          api.getFactions().pipe(
            tapResponse({
              next: (factions: Faction[]) => patchState(store, { factions }),
              error: (err: Error) => patchState(store, { error: err.message })
            })
          )
        )
      )
    ),

    loadFactions: rxMethod<void>(
      pipe(
        switchMap(() =>
          api.getFactions().pipe(
            tapResponse({
              next: (factions: Faction[]) => patchState(store, { factions }),
              error: (err: Error) => patchState(store, { error: err.message })
            })
          )
        )
      )
    ),

    loadColonyState: rxMethod<void>(
      pipe(
        switchMap(() =>
          api.getColonyState().pipe(
            tapResponse({
              next: (colonyState: ColonyState) => patchState(store, { colonyState }),
              error: (err: Error) => patchState(store, { error: err.message })
            })
          )
        )
      )
    ),

    loadRelationships: rxMethod<void>(
      pipe(
        switchMap(() =>
          api.getRelationships().pipe(
            tapResponse({
              next: (relationships: RelationshipBreakdown[]) => patchState(store, { relationships }),
              error: (err: Error) => patchState(store, { error: err.message })
            })
          )
        )
      )
    ),

    loadOverrides: rxMethod<void>(
      pipe(
        switchMap(() =>
          api.getOverrides().pipe(
            tapResponse({
              next: (overrides: RelationshipOverride[]) => patchState(store, { overrides }),
              error: (err: Error) => patchState(store, { error: err.message })
            })
          )
        )
      )
    ),

    loadRules: rxMethod<void>(
      pipe(
        switchMap(() =>
          api.getRules().pipe(
            tapResponse({
              next: (rules: RulesConfig) => patchState(store, { rules }),
              error: (err: Error) => patchState(store, { error: err.message })
            })
          )
        )
      )
    ),

    loadSessionLog: rxMethod<void>(
      pipe(
        switchMap(() =>
          api.getSessionLog().pipe(
            tapResponse({
              next: (sessionLog: SessionLogEntry[]) => patchState(store, { sessionLog }),
              error: (err: Error) => patchState(store, { error: err.message })
            })
          )
        )
      )
    ),

    loadCharacters: rxMethod<void>(
      pipe(
        switchMap(() =>
          api.getCharacters().pipe(
            tapResponse({
              next: (characters: Character[]) => patchState(store, { characters }),
              error: (err: Error) => patchState(store, { error: err.message })
            })
          )
        )
      )
    ),

    saveCharacter(character: Character): void {
      const existing = store.characters().find(c => c.id === character.id);
      const obs$ = existing ? api.updateCharacter(character) : api.createCharacter(character);
      obs$.subscribe({
        next: (saved) => {
          const updated = existing
            ? store.characters().map(c => c.id === saved.id ? saved : c)
            : [...store.characters(), saved];
          patchState(store, { characters: updated });
        },
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    deleteCharacter(id: string): void {
      api.deleteCharacter(id).subscribe({
        next: () => patchState(store, { characters: store.characters().filter(c => c.id !== id) }),
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    saveFaction(faction: Faction): void {
      const existing = store.factions().find(f => f.id === faction.id);
      const obs$ = existing ? api.updateFaction(faction) : api.createFaction(faction);
      obs$.subscribe({
        next: (saved) => {
          const updated = existing
            ? store.factions().map(f => f.id === saved.id ? saved : f)
            : [...store.factions(), saved];
          patchState(store, { factions: updated });
        },
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    deleteFaction(id: string): void {
      api.deleteFaction(id).subscribe({
        next: () => patchState(store, { factions: store.factions().filter(f => f.id !== id) }),
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    reorderFactions(orderedIds: string[]): void {
      // Apply optimistically: update sortOrder in local state immediately.
      const updated = [...store.factions()].sort((a, b) => {
        const ai = orderedIds.indexOf(a.id);
        const bi = orderedIds.indexOf(b.id);
        const aOrder = ai === -1 ? Infinity : ai;
        const bOrder = bi === -1 ? Infinity : bi;
        return aOrder - bOrder;
      }).map((f, i) => ({ ...f, sortOrder: i }));
      patchState(store, { factions: updated });
      api.reorderFactions(orderedIds).subscribe({
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    saveColonyState(state: ColonyState): void {
      api.updateColonyState(state).subscribe({
        next: (saved) => {
          patchState(store, { colonyState: saved });
          api.getRelationships().subscribe({ next: (relationships) => patchState(store, { relationships }) });
        },
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    saveRules(rules: RulesConfig): void {
      api.updateRules(rules).subscribe({
        next: (saved) => {
          patchState(store, { rules: saved });
          api.getRelationships().subscribe({ next: (relationships) => patchState(store, { relationships }) });
        },
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    saveOverride(override_: RelationshipOverride): void {
      const existing = store.overrides().find(o => o.id === override_.id);
      const obs$ = existing ? api.updateOverride(override_) : api.createOverride(override_);
      obs$.subscribe({
        next: (saved) => {
          const updated = existing
            ? store.overrides().map(o => o.id === saved.id ? saved : o)
            : [...store.overrides(), saved];
          patchState(store, { overrides: updated });
          api.getRelationships().subscribe({ next: (relationships) => patchState(store, { relationships }) });
        },
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    deleteOverride(id: string): void {
      api.deleteOverride(id).subscribe({
        next: () => {
          patchState(store, { overrides: store.overrides().filter(o => o.id !== id) });
          api.getRelationships().subscribe({ next: (relationships) => patchState(store, { relationships }) });
        },
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    saveSessionEntry(entry: SessionLogEntry): void {
      const existing = store.sessionLog().find(s => s.id === entry.id);
      const obs$ = existing ? api.updateSessionEntry(entry) : api.createSessionEntry(entry);
      obs$.subscribe({
        next: (saved) => {
          const updated = existing
            ? store.sessionLog().map(s => s.id === saved.id ? saved : s)
            : [saved, ...store.sessionLog()];
          patchState(store, { sessionLog: updated });
        },
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    deleteSessionEntry(id: string): void {
      api.deleteSessionEntry(id).subscribe({
        next: () => patchState(store, { sessionLog: store.sessionLog().filter(s => s.id !== id) }),
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    loadSessions: rxMethod<void>(
      pipe(
        switchMap(() =>
          api.getSessions().pipe(
            tapResponse({
              next: (sessions: Session[]) => patchState(store, { sessions }),
              error: (err: Error) => patchState(store, { error: err.message })
            })
          )
        )
      )
    ),

    saveSession(session: Omit<Session, 'events'> & { events?: Session['events'] }): void {
      const full = { ...session, events: session.events ?? [] } as Session;
      const existing = store.sessions().find(s => s.id === full.id);
      const obs$ = existing ? api.updateSession(full) : api.createSession(session);
      obs$.subscribe({
        next: (saved) => {
          const updated = existing
            ? store.sessions().map(s => s.id === saved.id ? { ...saved, events: store.sessions().find(x => x.id === saved.id)?.events ?? [] } : s)
            : [...store.sessions(), { ...saved, events: [] }];
          patchState(store, { sessions: updated });
        },
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    deleteSession(id: string): void {
      api.deleteSession(id).subscribe({
        next: () => patchState(store, { sessions: store.sessions().filter(s => s.id !== id) }),
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    importSessions(sessions: Session[]): void {
      api.importSessions(sessions).subscribe({
        next: () => {
          api.getSessions().subscribe({
            next: (all: Session[]) => patchState(store, { sessions: all }),
            error: (err: Error) => patchState(store, { error: err.message })
          });
        },
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    saveEvent(ev: CampaignEvent): void {
      const existing = store.sessions()
        .flatMap(s => s.events ?? [])
        .find(e => e.id === ev.id);
      const obs$ = existing ? api.updateEvent(ev) : api.createEvent(ev);
      obs$.subscribe({
        next: (saved) => {
          const sessions = store.sessions().map(s => {
            if (s.id !== saved.sessionId) return s;
            const events = existing
              ? (s.events ?? []).map(e => e.id === saved.id ? saved : e)
              : [...(s.events ?? []), saved];
            return { ...s, events };
          });
          patchState(store, { sessions });
        },
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    deleteEvent(sessionId: string, eventId: string): void {
      api.deleteEvent(eventId).subscribe({
        next: () => {
          const sessions = store.sessions().map(s => {
            if (s.id !== sessionId) return s;
            return { ...s, events: (s.events ?? []).filter(e => e.id !== eventId) };
          });
          patchState(store, { sessions });
        },
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    setViewingContext(ctx: string): void {
      patchState(store, { viewingContext: ctx });
    },

    // ── Campaign management ────────────────────────────────────────────────

    loadSettings: rxMethod<void>(
      pipe(
        switchMap(() =>
          api.getSettings().pipe(
            tapResponse({
              next: (settings: AppSettings) =>
                patchState(store, { activeCampaign: settings.activeCampaign ?? null }),
              error: (err: Error) => patchState(store, { error: err.message })
            })
          )
        )
      )
    ),

    loadCampaigns: rxMethod<void>(
      pipe(
        switchMap(() =>
          api.getCampaigns().pipe(
            tapResponse({
              next: (campaigns: Campaign[]) => patchState(store, { campaigns }),
              error: (err: Error) => patchState(store, { error: err.message })
            })
          )
        )
      )
    ),

    switchCampaign(campaignId: string): void {
      api.setActiveCampaign(campaignId).subscribe({
        next: (settings: AppSettings) => {
          patchState(store, {
            activeCampaign: settings.activeCampaign ?? null,
            viewingContext: 'current',
          });
          // Reload all campaign-scoped data for the new active campaign
          api.getFactions().subscribe({ next: (factions) => patchState(store, { factions }) });
          api.getCharacters().subscribe({ next: (characters) => patchState(store, { characters }) });
          api.getColonyState().subscribe({ next: (colonyState) => patchState(store, { colonyState }) });
          api.getRules().subscribe({ next: (rules) => patchState(store, { rules }) });
          api.getSessions().subscribe({ next: (sessions) => patchState(store, { sessions }) });
          api.getOverrides().subscribe({ next: (overrides) => patchState(store, { overrides }) });
          api.getRelationships().subscribe({ next: (relationships) => patchState(store, { relationships }) });
          api.getSessionLog().subscribe({ next: (sessionLog) => patchState(store, { sessionLog }) });
          api.getAssets().subscribe({ next: (assets) => patchState(store, { assets }) });
          api.getFactionGoals().subscribe({ next: (factionGoals) => patchState(store, { factionGoals }) });
        },
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    createCampaign(name: string, description?: string): void {
      api.createCampaign({ name, description }).subscribe({
        next: (campaign: Campaign) =>
          patchState(store, { campaigns: [...store.campaigns(), campaign] }),
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    updateCampaign(campaign: Campaign): void {
      api.updateCampaign(campaign).subscribe({
        next: (saved: Campaign) =>
          patchState(store, { campaigns: store.campaigns().map(c => c.id === saved.id ? saved : c),
            activeCampaign: store.activeCampaign()?.id === saved.id ? saved : store.activeCampaign() }),
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    deleteCampaign(id: string): void {
      api.deleteCampaign(id).subscribe({
        next: () =>
          patchState(store, { campaigns: store.campaigns().filter(c => c.id !== id) }),
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    loadAssets: rxMethod<void>(
      pipe(
        switchMap(() =>
          api.getAssets().pipe(
            tapResponse({
              next: (assets: Asset[]) => patchState(store, { assets }),
              error: (err: Error) => patchState(store, { error: err.message })
            })
          )
        )
      )
    ),

    saveAsset(asset: Asset): void {
      const existing = store.assets().find(a => a.id === asset.id);
      const obs$ = existing ? api.updateAsset(asset) : api.createAsset(asset);
      obs$.subscribe({
        next: (saved) => {
          const updated = existing
            ? store.assets().map(a => a.id === saved.id ? saved : a)
            : [...store.assets(), saved];
          patchState(store, { assets: updated });
        },
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    deleteAsset(id: string): void {
      api.deleteAsset(id).subscribe({
        next: () => patchState(store, { assets: store.assets().filter(a => a.id !== id) }),
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    loadFactionGoals: rxMethod<void>(
      pipe(
        switchMap(() =>
          api.getFactionGoals().pipe(
            tapResponse({
              next: (factionGoals: FactionGoal[]) => patchState(store, { factionGoals }),
              error: (err: Error) => patchState(store, { error: err.message })
            })
          )
        )
      )
    ),

    saveFactionGoal(goal: FactionGoal): void {
      const existing = store.factionGoals().find(g => g.id === goal.id);
      const obs$ = existing ? api.updateFactionGoal(goal) : api.createFactionGoal(goal);
      obs$.subscribe({
        next: (saved) => {
          const updated = existing
            ? store.factionGoals().map(g => g.id === saved.id ? saved : g)
            : [...store.factionGoals(), saved];
          patchState(store, { factionGoals: updated });
        },
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    deleteFactionGoal(id: string): void {
      api.deleteFactionGoal(id).subscribe({
        next: () => patchState(store, { factionGoals: store.factionGoals().filter(g => g.id !== id) }),
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    importEntities(sourceCampaignId: string, entityTypes: string[], importAll: boolean): void {
      api.importEntities(sourceCampaignId, entityTypes, importAll).subscribe({
        next: () => {
          // Reload affected entity sets into active campaign context
          api.getFactions().subscribe({ next: (factions) => patchState(store, { factions }) });
          api.getCharacters().subscribe({ next: (characters) => patchState(store, { characters }) });
        },
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    reorderEvents(sessionId: string, orderedIds: string[]): void {
      api.reorderEvents(orderedIds).subscribe({
        next: () => {
          const sessions = store.sessions().map(s => {
            if (s.id !== sessionId) return s;
            const eventMap = new Map((s.events ?? []).map(e => [e.id, e]));
            const events = orderedIds
              .map((id, i) => {
                const e = eventMap.get(id);
                return e ? { ...e, sortOrder: i } : null;
              })
              .filter((e): e is CampaignEvent => e !== null);
            return { ...s, events };
          });
          patchState(store, { sessions });
        },
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },
  }))
);

export function labelColor(label: RelationshipLabel): string {
  switch (label) {
    case 'Aligned':  return '#22c55e';
    case 'Friendly': return '#86efac';
    case 'Tolerated': return '#e2e8f0';
    case 'Strained': return '#fbbf24';
    case 'Opposed':  return '#f97316';
    case 'Hostile':  return '#ef4444';
    default: return '#e2e8f0';
  }
}

export function labelTextColor(label: RelationshipLabel): string {
  switch (label) {
    case 'Aligned':
    case 'Hostile':
    case 'Opposed':
      return '#ffffff';
    default:
      return '#1e293b';
  }
}
