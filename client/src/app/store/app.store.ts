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
  loading: boolean;
  error: string | null;
  // 'baseline' | 'current' | sessionId
  viewingContext: string;
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
  loading: false,
  error: null,
  viewingContext: 'current',
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
  legitimacy: Record<string, number>,
  derivedDelta: Record<string, Record<string, number>>
): void {
  if (prop === 'momentum') momentum[fid] = (momentum[fid] ?? 0) + delta;
  else if (prop === 'legitimacy') legitimacy[fid] = (legitimacy[fid] ?? 0) + delta;
  if (!derivedDelta[fid]) derivedDelta[fid] = {};
  derivedDelta[fid][prop] = (derivedDelta[fid][prop] ?? 0) + delta;
}

function buildColonySnapshots(
  baseline: ColonyState | null,
  factions: Faction[],
  characters: Character[],
  sessions: Session[],
  rules: RulesConfig | null
): ColonySnapshot[] {
  if (!baseline || sessions.length === 0) return [];

  let stress = baseline.colonyStress;
  const momentum: Record<string, number> = {};
  const legitimacy: Record<string, number> = {};
  const pressure: Record<string, number> = {};
  const influence: Record<string, number> = {};
  const states: Record<string, CharacterState> = {};
  const factionIds: Record<string, string | undefined> = {};
  const relBumps: Record<string, Record<string, number>> = {};
  const partyBumps: Record<string, number> = {};
  // Consecutive streak counters: factionId → property → count
  const consecutiveNeg: Record<string, Record<string, number>> = {};
  const consecutivePos: Record<string, Record<string, number>> = {};

  for (const f of factions) {
    momentum[f.id] = f.momentum;
    legitimacy[f.id] = f.legitimacy;
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

  return sessions.map(session => {
    // Manual-only deltas this session, keyed factionId → property.
    // Used as the multiplier basis for streak rules so only intentional
    // session effects scale the multiplier, not cascades.
    const manualDelta: Record<string, Record<string, number>> = {};
    // Derived-only deltas accumulated while cascade rules run.
    const derivedDelta: Record<string, Record<string, number>> = {};

    // Apply manual effects from this session's events
    for (const ev of [...(session.events ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)) {
      for (const ef of ev.effects) {
        if (ef.targetType === 'colony' && ef.property === 'stress') {
          stress = Math.max(0, Math.min(10, stress + ef.delta));
        } else if (ef.targetType === 'faction') {
          if (ef.property === 'momentum') {
            momentum[ef.targetId] = (momentum[ef.targetId] ?? 0) + ef.delta;
          } else if (ef.property === 'legitimacy') {
            legitimacy[ef.targetId] = (legitimacy[ef.targetId] ?? 0) + ef.delta;
          } else if (ef.property === 'relationshipBump' && ef.secondaryTargetId) {
            if (!relBumps[ef.targetId]) relBumps[ef.targetId] = {};
            relBumps[ef.targetId][ef.secondaryTargetId] = (relBumps[ef.targetId][ef.secondaryTargetId] ?? 0) + ef.delta;
          } else if (ef.property === 'partyRelationshipBump') {
            partyBumps[ef.targetId] = (partyBumps[ef.targetId] ?? 0) + ef.delta;
          }
          // Track manual delta for streak-eligible numeric properties
          if (ef.property === 'momentum' || ef.property === 'legitimacy') {
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
      for (const prop of ['momentum', 'legitimacy']) {
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
        for (const prop of ['momentum', 'legitimacy']) {
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
              applyFactionDelta(factionId, rule.targetProperty, change, momentum, legitimacy, derivedDelta);
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
            const val = rule.sourceProperty === 'momentum' ? momentum[factionId] : legitimacy[factionId];
            if (val === undefined) continue;
            if (op === 'gt' ? val <= tv : val >= tv) continue;
            const change = rule.effectType === 'flat' ? (rule.flatDelta ?? 0) : 0;
            if (change === 0) continue;
            if (rule.targetEntityType === 'faction') {
              applyFactionDelta(factionId, rule.targetProperty, change, momentum, legitimacy, derivedDelta);
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
              applyFactionDelta(targetFactionId, rule.targetProperty, change, momentum, legitimacy, derivedDelta);
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
              applyFactionDelta(targetFactionId, rule.targetProperty, change, momentum, legitimacy, derivedDelta);
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
              applyFactionDelta(targetFactionId, rule.targetProperty, change, momentum, legitimacy, derivedDelta);
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
        }
      }
    }
    } // end pass loop

    // Re-compute streak counters from pre-session baseline using total delta
    // (manual + derived) so derived changes chain into streak detection for
    // subsequent sessions.
    for (const fid of Object.keys(momentum)) {
      for (const prop of ['momentum', 'legitimacy']) {
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

    return {
      sessionId: session.id,
      sessionNumber: session.number,
      colonyStress: stress,
      factionMomentum: { ...momentum },
      factionLegitimacy: { ...legitimacy },
      characterPressure: { ...pressure },
      characterInfluence: { ...influence },
      characterStates: { ...states },
      characterFactions: { ...factionIds },
      factionRelationshipBumps: Object.fromEntries(
        Object.entries(relBumps).map(([src, targets]) => [src, { ...targets }])
      ),
      factionPartyBumps: { ...partyBumps },
      derivedEffects,
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

    // Colony snapshots: cumulative state after each session, derived from baseline + events
    colonySnapshots: computed((): ColonySnapshot[] =>
      buildColonySnapshots(
        store.colonyState(),
        store.factions(),
        store.characters(),
        [...store.sessions()].sort((a, b) => a.number - b.number),
        store.rules()
      )
    ),

    // Stress-over-time for the timeline chart
    stressTimeline: computed((): { sessionNumber: number; sessionTitle: string; stress: number }[] => {
      const sessions = [...store.sessions()].sort((a, b) => a.number - b.number);
      const baseline = store.colonyState();
      if (!baseline || sessions.length === 0) return [];
      let stress = baseline.colonyStress;
      return sessions.map(session => {
        for (const ev of [...(session.events ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)) {
          for (const ef of ev.effects) {
            if (ef.targetType === 'colony' && ef.property === 'stress') {
              stress = Math.max(0, Math.min(10, stress + ef.delta));
            }
          }
        }
        return { sessionNumber: session.number, sessionTitle: session.title, stress };
      });
    }),

    // ── View-context helpers ───────────────────────────────────────────────
    isViewingSnapshot: computed(() => store.viewingContext() !== 'baseline'),

    // The snapshot to project onto the world, or null when viewing baseline
    activeSnapshot: computed((): ColonySnapshot | null => {
      const ctx = store.viewingContext();
      if (ctx === 'baseline') return null;
      const snaps = buildColonySnapshots(
        store.colonyState(),
        store.factions(),
        store.characters(),
        [...store.sessions()].sort((a, b) => a.number - b.number),
        store.rules()
      );
      if (snaps.length === 0) return null;
      if (ctx === 'current') return snaps[snaps.length - 1];
      return snaps.find(s => s.sessionId === ctx) ?? snaps[snaps.length - 1];
    }),

    // Factions with momentum/legitimacy projected to the active snapshot
    viewFactions: computed((): Faction[] => {
      const snap = (() => {
        const ctx = store.viewingContext();
        if (ctx === 'baseline') return null;
        const snaps = buildColonySnapshots(
          store.colonyState(),
          store.factions(),
          store.characters(),
          [...store.sessions()].sort((a, b) => a.number - b.number),
          store.rules()
        );
        if (snaps.length === 0) return null;
        if (ctx === 'current') return snaps[snaps.length - 1];
        return snaps.find(s => s.sessionId === ctx) ?? snaps[snaps.length - 1];
      })();
      if (!snap) return store.factions();
      return store.factions().map(f => ({
        ...f,
        momentum:   snap.factionMomentum[f.id]   ?? f.momentum,
        legitimacy: snap.factionLegitimacy[f.id] ?? f.legitimacy,
      }));
    }),

    // Characters with pressure/influence/state/faction projected to the active snapshot
    viewCharacters: computed((): Character[] => {
      const snap = (() => {
        const ctx = store.viewingContext();
        if (ctx === 'baseline') return null;
        const snaps = buildColonySnapshots(
          store.colonyState(),
          store.factions(),
          store.characters(),
          [...store.sessions()].sort((a, b) => a.number - b.number),
          store.rules()
        );
        if (snaps.length === 0) return null;
        if (ctx === 'current') return snaps[snaps.length - 1];
        return snaps.find(s => s.sessionId === ctx) ?? snaps[snaps.length - 1];
      })();
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

    // Colony stress projected to the active snapshot
    viewColonyStress: computed((): number => {
      const ctx = store.viewingContext();
      if (ctx === 'baseline') return store.colonyState()?.colonyStress ?? 0;
      const snaps = buildColonySnapshots(
        store.colonyState(),
        store.factions(),
        store.characters(),
        [...store.sessions()].sort((a, b) => a.number - b.number),
        store.rules()
      );
      if (snaps.length === 0) return store.colonyState()?.colonyStress ?? 0;
      const snap = ctx === 'current'
        ? snaps[snaps.length - 1]
        : (snaps.find(s => s.sessionId === ctx) ?? snaps[snaps.length - 1]);
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
