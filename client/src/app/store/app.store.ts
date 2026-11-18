import { conditionWorldAt, evaluateConditions, conditionStress } from '../core/sim/conditions';
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { firstValueFrom, pipe, switchMap, tap } from 'rxjs';
import { computed } from '@angular/core';
import {
  Faction, ColonyState, RelationshipBreakdown, RelationshipOverride,
  RulesConfig, SessionLogEntry, RelationshipLabel, Character, CharacterState, driftScore, effectivePressure,
  influenceConvictionBonus, Session, CampaignEvent, ColonySnapshot, StressPart,
  ValueLabels, BeliefAxisLabels, BeliefAxisConfig, DEFAULT_VALUE_LABELS, DEFAULT_BELIEF_AXIS_LABELS,
  FormulasConfig, DEFAULT_FORMULAS,
  FACTION_EFFECT_PROPS, CHARACTER_EFFECT_PROPS,
  Campaign, AppSettings,
  Asset, AssetStatus, FactionGoal, WorldCondition, GoalStatus,
  Location, LocationState, ColonyMap, MapPlacement, GeometryType,
  PathSet, NarrativePath, PathSetContext, NarrativeEventVariantParticipation,
  NarrativeEventOverride, EventOverridePath, EventOverrideConnection,
  EventOverrideEntityLink,
  NarrativeThread, NarrativeEvent, NarrativeEventConnection,
  NarrativeEntityLink, NarrativeEntityLinkType,
  NarrativeEventRealization, NarrativeEventPlacement,
  NarrativeOwnerType,
} from '../core/models/types';
import { ApiService } from '../core/services/api.service';
import { scoreRelationship, ScoringActor, topCompatibleFactions, DEFAULT_RULES } from '../core/services/scoring.service';
import { assessGoal, worldOf, GoalAssessment } from '../core/sim/goals';
import { buildColonySnapshots, parseBeliefAxisLabels, parseFormulas, projectFactions, projectCharacters, projectAssets, projectGoals, eventSessionNumbers, presentAt } from '../core/sim/replay';
import { ENGINE_VERSION } from '../core/sim/engine-version';

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
  worldConditions: WorldCondition[];   // §18.6
  locations: Location[];
  colonyMaps: ColonyMap[];
  mapPlacements: MapPlacement[];
  loading: boolean;
  error: string | null;
  // 'baseline' | 'current' | sessionId
  viewingContext: string;
  campaigns: Campaign[];
  activeCampaign: Campaign | null;
  pathSets: PathSet[];
  narrativePaths: NarrativePath[];
  pathSetContexts: PathSetContext[];
  variantParticipations: NarrativeEventVariantParticipation[];
  narrativeEventOverrides: NarrativeEventOverride[];
  eventOverridePaths: EventOverridePath[];
  eventOverrideConnections: EventOverrideConnection[];
  eventOverrideEntityLinks: EventOverrideEntityLink[];
  narrativeThreads: NarrativeThread[];
  narrativeEvents: NarrativeEvent[];
  narrativeConnections: NarrativeEventConnection[];
  narrativeEntityLinks: NarrativeEntityLink[];
  narrativeRealizations: NarrativeEventRealization[];
  narrativePlacements: NarrativeEventPlacement[];
  narrativeFocusEntity: { type: NarrativeEntityLinkType; id: string; name: string } | null;
  narrativeInspectorOpen: boolean;
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
  worldConditions: [],
  locations: [],
  colonyMaps: [],
  mapPlacements: [],
  loading: false,
  error: null,
  viewingContext: 'current',
  campaigns: [],
  activeCampaign: null,
  pathSets: [],
  narrativePaths: [],
  pathSetContexts: [],
  variantParticipations: [],
  narrativeEventOverrides: [],
  eventOverridePaths: [],
  eventOverrideConnections: [],
  eventOverrideEntityLinks: [],
  narrativeThreads: [],
  narrativeEvents: [],
  narrativeConnections: [],
  narrativeEntityLinks: [],
  narrativeRealizations: [],
  narrativePlacements: [],
  narrativeFocusEntity: null,
  narrativeInspectorOpen: false,
};

// Snapshot engine lives in core/sim/replay.ts

/**
 * Every relationship re-scored at `stress` (with the snapshot's session bumps, if any). The server's list supplies the
 * pairs; scores are always the client's, so they follow Colony Stress derived from World Conditions (§18.9/§18.10).
 */
function scoreRelationshipsAt(store: {
  rules(): RulesConfig | null; relationships(): RelationshipBreakdown[]; viewFactions(): Faction[];
  overrides(): RelationshipOverride[]; colonyState(): ColonyState | null;
}, stress: number, snap: ColonySnapshot | null): RelationshipBreakdown[] {
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
}

export const AppStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed((store) => ({
    /** §18.10 Colony Stress at the start of play: the World Conditions in force at the baseline (no stored Stress). */
    baselineStress: computed((): { total: number; parts: StressPart[] } => {
      const w = conditionWorldAt(null, { assets: store.assets(), characters: store.characters(), factions: store.factions(), locations: store.locations(), goals: store.factionGoals() });
      const { total, parts } = conditionStress(evaluateConditions(store.worldConditions(), w, { asset: id => id, faction: id => id }));
      return { total: Math.max(0, Math.min(10, total)), parts };
    }),
  })),

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
      const stress = store.baselineStress().total;
      const scale  = store.rules()?.influenceConvictionScale ?? 0.5;
      const alive  = store.characters().filter(c => c.state === 'Alive');
      const driftOf = (c: Character) => {
        const peers  = alive.filter(p => p.factionId && p.factionId === c.factionId && p.id !== c.id);
        const effConv = c.conviction + influenceConvictionBonus(c, peers, scale);
        return effectivePressure(c, stress, parseFormulas(store.rules()?.formulasJson).stressPressureCoefficient) - effConv;
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
          const top = topCompatibleFactions(c, activeFactions, threshold, axisLabels, store.rules() ?? DEFAULT_RULES);
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
        store.factionGoals(),
        store.locations(),
        store.worldConditions()
      )
    ),

    // ── View-context helpers ───────────────────────────────────────────────
    isViewingSnapshot: computed(() => store.viewingContext() !== 'baseline'),

    // M1: Live campaigns lock baseline simulation fields (enforced by the server; the UI hides those controls).
    isLive: computed(() => store.activeCampaign()?.mode === 'Live'),
    eventSessions: computed(() => eventSessionNumbers(store.sessions())),

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
    // Entities introduced by a later Event (M1) are hidden until the snapshot that includes their introduction.
    viewFactions: computed((): Faction[] =>
      projectFactions(store.factions(), store.activeSnapshot()).filter(f => presentAt(f, store.activeSnapshot(), store.eventSessions()))),

    // Characters with pressure/influence/state/faction projected to the active snapshot
    viewCharacters: computed((): Character[] =>
      projectCharacters(store.characters(), store.activeSnapshot()).filter(c => presentAt(c, store.activeSnapshot(), store.eventSessions()))),

    // Assets with controllingFactionId, status, and statusActorFactionId projected to the active snapshot
    viewAssets: computed((): Asset[] =>
      projectAssets(store.assets(), store.activeSnapshot()).filter(a => presentAt(a, store.activeSnapshot(), store.eventSessions()))),

    // Goals with status, champion and the Ready to Resolve overlay projected to the active snapshot (M4)
    viewGoals: computed((): FactionGoal[] => {
      const snap = store.activeSnapshot();
      return projectGoals(store.factionGoals().filter(g => presentAt(g, snap, store.eventSessions())), snap);
    }),

    // Locations with state projected to the active snapshot
    viewLocations: computed((): Location[] => {
      const snap = store.activeSnapshot();
      const present = store.locations().filter(l => presentAt(l, snap, store.eventSessions()));
      if (!snap) return present;
      return present.map(l => ({
        ...l,
        state: snap.locationStates[l.id] ?? l.state,
      }));
    }),

    // Colony stress projected to the active snapshot
    /** §18.10 Colony Stress at the viewed point: the in-force World Conditions' contributions, clamped 0–10, with each part. */
    viewStressBreakdown: computed((): { total: number; parts: StressPart[] } => {
      const ctx = store.viewingContext();
      const snap = ctx === 'baseline' ? null : store.activeSnapshot();
      if (snap) return { total: snap.colonyStress, parts: snap.stressFromConditions ?? [] };
      return store.baselineStress();
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
    viewColonyStress: computed((): number => store.viewStressBreakdown().total),
  })),

  withComputed((store) => ({
    /** The Act of the viewed session (or the latest one): what a goal's Earliest Act is compared with. */
    viewAct: computed((): number => {
      const snap = store.activeSnapshot(), ss = store.sessions();
      const s = snap ? ss.find(x => x.number === snap.sessionNumber) : [...ss].sort((a, b) => b.number - a.number)[0];
      return s?.act ?? 1;
    }),
  })),

  withComputed((store) => ({
    /** M4: every viewed goal's overlays, defense, obsolescence and Faction Phase eligibility (core/sim/goals.ts). */
    viewGoalAssessments: computed((): Map<string, GoalAssessment> => {
      const w = worldOf(store.viewCharacters(), store.viewAssets());
      return new Map(store.viewGoals().map(g => [g.id, assessGoal(g, w, store.viewAct())]));
    }),
  })),
  withComputed((store) => ({
    // Full recompute of all relationships at the viewed stress level + snapshot bumps.
    // Mirrors the relationships page logic so counts and tables are always consistent.
    viewRelationships: computed((): RelationshipBreakdown[] =>
      scoreRelationshipsAt(store, store.viewColonyStress(), store.isViewingSnapshot() ? store.activeSnapshot() : null)),
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
        return effectivePressure(c, stress, parseFormulas(store.rules()?.formulasJson).stressPressureCoefficient) - effConv;
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
          const top = topCompatibleFactions(c, activeFactions, threshold, axisLabels, store.rules() ?? DEFAULT_RULES);
          return top.length > 0 && top[0].factionId !== c.factionId;
        });
    }),

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
    /** §18.10 Stress simulation: the viewed relationships as they would score at `stress` (nothing is saved). Reactive
     *  when read inside a computed. */
    relationshipsAtStress: (stress: number): RelationshipBreakdown[] =>
      scoreRelationshipsAt(store, stress, store.isViewingSnapshot() ? store.activeSnapshot() : null),

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

    /** Resolves true once saved, false if the save failed (the error banner shows why). */
    saveCharacter(character: Character): Promise<boolean> {
      const existing = store.characters().find(c => c.id === character.id);
      const obs$ = existing ? api.updateCharacter(character) : api.createCharacter(character);
      return new Promise<boolean>(resolve => obs$.subscribe({
        next: (saved) => {
          const updated = existing
            ? store.characters().map(c => c.id === saved.id ? saved : c)
            : [...store.characters(), saved];
          patchState(store, { characters: updated });
          resolve(true);
        },
        error: (err: Error) => { patchState(store, { error: err.message }); resolve(false); }
      }));
    },

    deleteCharacter(id: string): void {
      api.deleteCharacter(id).subscribe({
        next: () => patchState(store, { characters: store.characters().filter(c => c.id !== id) }),
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    /** Resolves true once saved, false if the save failed (the error banner shows why). */
    saveFaction(faction: Faction): Promise<boolean> {
      const existing = store.factions().find(f => f.id === faction.id);
      const obs$ = existing ? api.updateFaction(faction) : api.createFaction(faction);
      return new Promise<boolean>(resolve => obs$.subscribe({
        next: (saved) => {
          const updated = existing
            ? store.factions().map(f => f.id === saved.id ? saved : f)
            : [...store.factions(), saved];
          patchState(store, { factions: updated });
          resolve(true);
        },
        error: (err: Error) => { patchState(store, { error: err.message }); resolve(false); }
      }));
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

    clearError(): void {
      patchState(store, { error: null });
    },

    // M1: one-way Design → Live. The server writes RulesVersion 1 and locks the baseline.
    activateCampaign(): void {
      const c = store.activeCampaign();
      if (!c) return;
      api.activateCampaign(c.id, ENGINE_VERSION).subscribe({
        next: (saved) => patchState(store, {
          activeCampaign: saved,
          campaigns: store.campaigns().map(x => x.id === saved.id ? saved : x),
        }),
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    saveRules(rules: RulesConfig): void {
      // M1: a Live campaign's rules change only as a new RulesVersion, effective from the latest recorded Event.
      let effectiveFrom: string | undefined;
      if (store.activeCampaign()?.mode === 'Live') {
        const latest = [...store.sessions()].sort((a, b) => b.number - a.number)
          .flatMap(se => [...(se.events ?? [])].sort((a, b) => b.sortOrder - a.sortOrder))[0];
        if (!latest) { patchState(store, { error: 'Live campaign: record at least one Event before changing rules (rules versions take effect from an Event).' }); return; }
        effectiveFrom = latest.id;
      }
      api.updateRules(rules, effectiveFrom, effectiveFrom ? ENGINE_VERSION : undefined).subscribe({
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

    /** Resolves to the server's counts (sessions already present are skipped), or null if the import failed. */
    importSessions(sessions: Session[]): Promise<{ imported: number; skipped: number } | null> {
      return new Promise(resolve => api.importSessions(sessions).subscribe({
        next: (counts) => {
          api.getSessions().subscribe({
            next: (all: Session[]) => patchState(store, { sessions: all }),
            error: (err: Error) => patchState(store, { error: err.message })
          });
          resolve(counts);
        },
        error: (err: Error) => { patchState(store, { error: err.message }); resolve(null); }
      }));
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
          api.getWorldConditions().subscribe({ next: (worldConditions) => patchState(store, { worldConditions }) });
          api.getLocations().subscribe({ next: (locations) => patchState(store, { locations }) });
          api.getColonyMaps().subscribe({ next: (colonyMaps) => patchState(store, { colonyMaps }) });
          api.getMapPlacements().subscribe({ next: (mapPlacements) => patchState(store, { mapPlacements }) });
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

    /** Resolves true once saved, false if the save failed (the error banner shows why). */
    saveAsset(asset: Asset): Promise<boolean> {
      const existing = store.assets().find(a => a.id === asset.id);
      const isLinked = store.locations().some(l => l.linkedAssetId === asset.id);
      const obs$ = existing ? api.updateAsset(asset) : api.createAsset(asset);
      return new Promise<boolean>(resolve => obs$.subscribe({
        next: (saved) => {
          const updated = existing
            ? store.assets().map(a => a.id === saved.id ? saved : a)
            : [...store.assets(), saved];
          patchState(store, { assets: updated });
          if (isLinked) api.getLocations().subscribe({ next: (locations) => patchState(store, { locations }) });
          resolve(true);
        },
        error: (err: Error) => { patchState(store, { error: err.message }); resolve(false); }
      }));
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

    /** Resolves true once saved, false if the save failed (the error banner shows why). */
    saveFactionGoal(goal: FactionGoal): Promise<boolean> {
      const existing = store.factionGoals().find(g => g.id === goal.id);
      const obs$ = existing ? api.updateFactionGoal(goal) : api.createFactionGoal(goal);
      return new Promise<boolean>(resolve => obs$.subscribe({
        next: (saved) => {
          const updated = existing
            ? store.factionGoals().map(g => g.id === saved.id ? saved : g)
            : [...store.factionGoals(), saved];
          patchState(store, { factionGoals: updated });
          resolve(true);
        },
        error: (err: Error) => { patchState(store, { error: err.message }); resolve(false); }
      }));
    },

    deleteFactionGoal(id: string): void {
      api.deleteFactionGoal(id).subscribe({
        next: () => patchState(store, { factionGoals: store.factionGoals().filter(g => g.id !== id) }),
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    loadWorldConditions: rxMethod<void>(
      pipe(
        switchMap(() =>
          api.getWorldConditions().pipe(
            tapResponse({
              next: (worldConditions: WorldCondition[]) => patchState(store, { worldConditions }),
              error: (err: Error) => patchState(store, { error: err.message })
            })
          )
        )
      )
    ),

    /** Resolves true once saved, false if the save failed (the error banner shows why). */
    saveWorldCondition(c: WorldCondition): Promise<boolean> {
      const existing = store.worldConditions().find(x => x.id === c.id);
      const obs$ = existing ? api.updateWorldCondition(c) : api.createWorldCondition(c);
      return new Promise<boolean>(resolve => obs$.subscribe({
        next: (saved) => {
          patchState(store, { worldConditions: existing
            ? store.worldConditions().map(x => x.id === saved.id ? saved : x) : [...store.worldConditions(), saved] });
          resolve(true);
        },
        error: (err: Error) => { patchState(store, { error: err.message }); resolve(false); }
      }));
    },

    deleteWorldCondition(id: string): void {
      api.deleteWorldCondition(id).subscribe({
        next: () => patchState(store, { worldConditions: store.worldConditions().filter(x => x.id !== id) }),
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    loadLocations: rxMethod<void>(
      pipe(
        switchMap(() =>
          api.getLocations().pipe(
            tapResponse({
              next: (locations: Location[]) => patchState(store, { locations }),
              error: (err: Error) => patchState(store, { error: err.message })
            })
          )
        )
      )
    ),

    saveLocation(location: Location): void {
      const existing = store.locations().find(l => l.id === location.id);
      const obs$ = existing ? api.updateLocation(location) : api.createLocation(location);
      obs$.subscribe({
        next: (saved) => {
          const updated = existing
            ? store.locations().map(l => l.id === saved.id ? saved : l)
            : [...store.locations(), saved];
          patchState(store, { locations: updated });
          if (saved.linkedAssetId) api.getAssets().subscribe({ next: (assets) => patchState(store, { assets }) });
        },
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    deleteLocation(id: string): void {
      api.deleteLocation(id).subscribe({
        next: () => patchState(store, { locations: store.locations().filter(l => l.id !== id) }),
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    loadColonyMaps: rxMethod<void>(
      pipe(
        switchMap(() =>
          api.getColonyMaps().pipe(
            tapResponse({
              next: (colonyMaps: ColonyMap[]) => patchState(store, { colonyMaps }),
              error: (err: Error) => patchState(store, { error: err.message })
            })
          )
        )
      )
    ),

    saveColonyMap(map: ColonyMap): void {
      const existing = store.colonyMaps().find(m => m.id === map.id);
      // When setting a map as hero, clear hero on all sibling maps for the same location first
      const mapsToUpdate: ColonyMap[] = [];
      if (map.isHero && map.locationId) {
        store.colonyMaps()
          .filter(m => m.locationId === map.locationId && m.id !== map.id && m.isHero)
          .forEach(m => mapsToUpdate.push({ ...m, isHero: false }));
      }
      const obs$ = existing ? api.updateColonyMap(map) : api.createColonyMap(map);
      obs$.subscribe({
        next: (saved) => {
          let updated = existing
            ? store.colonyMaps().map(m => m.id === saved.id ? saved : m)
            : [...store.colonyMaps(), saved];
          // Apply sibling hero-clear patches to local state
          for (const sibling of mapsToUpdate) {
            updated = updated.map(m => m.id === sibling.id ? sibling : m);
            api.updateColonyMap(sibling).subscribe();
          }
          patchState(store, { colonyMaps: updated });
        },
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    deleteColonyMap(id: string): void {
      api.deleteColonyMap(id).subscribe({
        next: () => patchState(store, { colonyMaps: store.colonyMaps().filter(m => m.id !== id) }),
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    loadMapPlacements: rxMethod<void>(
      pipe(
        switchMap(() =>
          api.getMapPlacements().pipe(
            tapResponse({
              next: (mapPlacements: MapPlacement[]) => patchState(store, { mapPlacements }),
              error: (err: Error) => patchState(store, { error: err.message })
            })
          )
        )
      )
    ),

    saveMapPlacement(placement: MapPlacement): void {
      const existing = store.mapPlacements().find(p => p.id === placement.id);
      const obs$ = existing ? api.updateMapPlacement(placement) : api.createMapPlacement(placement);
      obs$.subscribe({
        next: (saved) => {
          const updated = existing
            ? store.mapPlacements().map(p => p.id === saved.id ? saved : p)
            : [...store.mapPlacements(), saved];
          patchState(store, { mapPlacements: updated });
        },
        error: (err: Error) => patchState(store, { error: err.message })
      });
    },

    deleteMapPlacement(id: string): void {
      api.deleteMapPlacement(id).subscribe({
        next: () => patchState(store, { mapPlacements: store.mapPlacements().filter(p => p.id !== id) }),
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
  })),

  withComputed((store) => ({
    linksForOwner: computed(() => (ownerType: NarrativeOwnerType, ownerId: string) =>
      store.narrativeEntityLinks().filter(l => l.ownerType === ownerType && l.ownerId === ownerId)
    ),
    linksForEntity: computed(() => (entityType: NarrativeEntityLinkType, entityId: string) =>
      store.narrativeEntityLinks().filter(l => l.entityType === entityType && l.entityId === entityId)
    ),
    threadById: computed(() => (id: string) =>
      store.narrativeThreads().find(t => t.id === id)
    ),
    narrativeEventById: computed(() => (id: string) =>
      store.narrativeEvents().find(e => e.id === id)
    ),
    eventsForThread: computed(() => (threadId: string) => {
      const linkedIds = new Set(
        store.narrativeConnections()
          .filter(c => c.threadId === threadId)
          .flatMap(c => [c.sourceNarrativeEventId, c.targetNarrativeEventId])
      );
      return store.narrativeEvents().filter(e => linkedIds.has(e.id));
    }),
    threadsForEvent: computed(() => (eventId: string) => {
      const linkedIds = new Set(
        store.narrativeConnections()
          .filter(c => c.sourceNarrativeEventId === eventId || c.targetNarrativeEventId === eventId)
          .map(c => c.threadId)
      );
      return store.narrativeThreads().filter(t => linkedIds.has(t.id));
    }),
    connectionsForEvent: computed(() => (eventId: string) =>
      store.narrativeConnections().filter(
        c => c.sourceNarrativeEventId === eventId || c.targetNarrativeEventId === eventId
      )
    ),
    realizationsForEvent: computed(() => (eventId: string) =>
      store.narrativeRealizations().filter(r => r.narrativeEventId === eventId)
    ),
    // Returns the event merged with the best-matching NarrativeEventOverride
    // for the given active path IDs (most-specific-wins per property).
    // Only Summary and Description are path-overridable scalars.
    // Explicit OverridesSummary/OverridesDescription flags distinguish
    // "intentionally blank" from "inherit from base".
    effectiveEvent: computed(() => (event: NarrativeEvent, activePathIds: ReadonlySet<string>): NarrativeEvent => {
      if (activePathIds.size === 0) return event;
      const overrides     = store.narrativeEventOverrides().filter(o => o.narrativeEventId === event.id);
      const overridePaths = store.eventOverridePaths();
      const applicable = overrides.filter(o => {
        const required = overridePaths.filter(op => op.eventOverrideId === o.id).map(op => op.pathId);
        return required.length > 0 && required.every(id => activePathIds.has(id));
      });
      if (applicable.length === 0) return event;
      applicable.sort((a, b) =>
        overridePaths.filter(op => op.eventOverrideId === b.id).length -
        overridePaths.filter(op => op.eventOverrideId === a.id).length
      );
      // Resolve each property independently from most- to least-specific override.
      let summary     = event.summary;
      let description = event.description;
      let summaryResolved     = false;
      let descriptionResolved = false;
      for (const o of applicable) {
        if (!summaryResolved     && o.overridesSummary)     { summary     = o.summary;     summaryResolved     = true; }
        if (!descriptionResolved && o.overridesDescription) { description = o.description; descriptionResolved = true; }
        if (summaryResolved && descriptionResolved) break;
      }
      return { ...event, summary, description };
    }),

    overrideForEvent: computed(() => (eventId: string, activePathIds: ReadonlySet<string>) => {
      const overrides     = store.narrativeEventOverrides().filter(o => o.narrativeEventId === eventId);
      const overridePaths = store.eventOverridePaths();
      const applicable = overrides.filter(o => {
        const required = overridePaths.filter(op => op.eventOverrideId === o.id).map(op => op.pathId);
        return required.length > 0 && required.every(id => activePathIds.has(id));
      });
      if (applicable.length === 0) return undefined;
      applicable.sort((a, b) =>
        overridePaths.filter(op => op.eventOverrideId === b.id).length -
        overridePaths.filter(op => op.eventOverrideId === a.id).length
      );
      return applicable[0];
    }),

    // Returns all effective connections across the entire graph for the given path context.
    // For each event whose best applicable override has overridesConnections=true, its outgoing
    // base connections are replaced by override connections; incoming connections are always base.
    effectiveConnectionsForGraph: computed(() => (activePathIds: ReadonlySet<string>): NarrativeEventConnection[] => {
      if (activePathIds.size === 0) return store.narrativeConnections();

      const overrides      = store.narrativeEventOverrides();
      const overridePaths  = store.eventOverridePaths();
      const participations = store.variantParticipations();

      // Build set of path set IDs that are represented in activePathIds
      const activePaths    = store.narrativePaths().filter(p => activePathIds.has(p.id));
      const activePathSetIds = new Set(activePaths.map(p => p.pathSetId));

      // Find events whose best applicable override replaces connections.
      // Guard: only suppress base connections for events that actually participate
      // in one of the active path sets — non-variant events always use base connections.
      const overrideConnSources = new Map<string, string>(); // eventId → overrideId
      for (const ev of store.narrativeEvents()) {
        const participatesInActivePath = participations.some(
          vp => vp.narrativeEventId === ev.id && activePathSetIds.has(vp.pathSetId)
        );
        if (!participatesInActivePath) continue;

        const applicable = overrides.filter(o => {
          if (o.narrativeEventId !== ev.id) return false;
          const required = overridePaths.filter(op => op.eventOverrideId === o.id).map(op => op.pathId);
          return required.length > 0 && required.every(id => activePathIds.has(id));
        });
        if (applicable.length === 0) continue;
        applicable.sort((a, b) =>
          overridePaths.filter(op => op.eventOverrideId === b.id).length -
          overridePaths.filter(op => op.eventOverrideId === a.id).length
        );
        const match = applicable.find(o => o.overridesConnections);
        if (match) overrideConnSources.set(ev.id, match.id);
      }

      if (overrideConnSources.size === 0) return store.narrativeConnections();

      const baseConns = store.narrativeConnections().filter(
        c => !overrideConnSources.has(c.sourceNarrativeEventId)
      );
      const overrideConns: NarrativeEventConnection[] = [];
      for (const [eventId, overrideId] of overrideConnSources) {
        for (const oc of store.eventOverrideConnections().filter(c => c.eventOverrideId === overrideId)) {
          overrideConns.push({
            id: oc.id, campaignId: '',
            sourceNarrativeEventId: eventId,
            targetNarrativeEventId: oc.targetNarrativeEventId,
            threadId: oc.threadId, visibility: oc.visibility,
          });
        }
      }
      return [...baseConns, ...overrideConns];
    }),

    // Returns the effective connections for this event under the given path context.
    // When an override exists and overridesConnections=true, outgoing connections come
    // from the override table; incoming connections always reflect the base graph.
    effectiveConnectionsForEvent: computed(() => (eventId: string, activePathIds: ReadonlySet<string>) => {
      const baseConns = store.narrativeConnections().filter(
        c => c.sourceNarrativeEventId === eventId || c.targetNarrativeEventId === eventId
      );
      if (activePathIds.size > 0) {
        const activePaths      = store.narrativePaths().filter(p => activePathIds.has(p.id));
        const activePathSetIds = new Set(activePaths.map(p => p.pathSetId));
        const participates     = store.variantParticipations().some(
          vp => vp.narrativeEventId === eventId && activePathSetIds.has(vp.pathSetId)
        );
        if (participates) {
          const overrides     = store.narrativeEventOverrides().filter(o => o.narrativeEventId === eventId);
          const overridePaths = store.eventOverridePaths();
          const applicable = overrides.filter(o => {
            const required = overridePaths.filter(op => op.eventOverrideId === o.id).map(op => op.pathId);
            return required.length > 0 && required.every(id => activePathIds.has(id));
          });
          applicable.sort((a, b) =>
            overridePaths.filter(op => op.eventOverrideId === b.id).length -
            overridePaths.filter(op => op.eventOverrideId === a.id).length
          );
          const match = applicable.find(o => o.overridesConnections);
          if (match) {
            const overrideOutgoing = store.eventOverrideConnections()
              .filter(c => c.eventOverrideId === match.id)
              .map(c => ({
                id: c.id, campaignId: '',
                sourceNarrativeEventId: eventId,
                targetNarrativeEventId: c.targetNarrativeEventId,
                threadId: c.threadId, visibility: c.visibility,
              }));
            const baseIncoming = baseConns.filter(c => c.targetNarrativeEventId === eventId);
            return [...baseIncoming, ...overrideOutgoing];
          }
        }
      }
      return baseConns;
    }),

    // Returns the thread IDs for this event under the given path context.
    // Derived from effective connections: any connection incident to this event carries a threadId.
    effectiveThreadIdsForEvent: computed(() => (eventId: string, activePathIds: ReadonlySet<string>): string[] => {
      const baseConns = store.narrativeConnections().filter(
        c => c.sourceNarrativeEventId === eventId || c.targetNarrativeEventId === eventId
      );
      let conns = baseConns;
      if (activePathIds.size > 0) {
        const activePaths      = store.narrativePaths().filter(p => activePathIds.has(p.id));
        const activePathSetIds = new Set(activePaths.map(p => p.pathSetId));
        const participates     = store.variantParticipations().some(
          vp => vp.narrativeEventId === eventId && activePathSetIds.has(vp.pathSetId)
        );
        if (participates) {
          const overrides     = store.narrativeEventOverrides().filter(o => o.narrativeEventId === eventId);
          const overridePaths = store.eventOverridePaths();
          const applicable = overrides.filter(o => {
            const required = overridePaths.filter(op => op.eventOverrideId === o.id).map(op => op.pathId);
            return required.length > 0 && required.every(id => activePathIds.has(id));
          });
          applicable.sort((a, b) =>
            overridePaths.filter(op => op.eventOverrideId === b.id).length -
            overridePaths.filter(op => op.eventOverrideId === a.id).length
          );
          const match = applicable.find(o => o.overridesConnections);
          if (match) {
            const overrideOutgoing = store.eventOverrideConnections()
              .filter(c => c.eventOverrideId === match.id)
              .map(c => ({ threadId: c.threadId } as { threadId: string }));
            const baseIncomingThreadIds = baseConns
              .filter(c => c.targetNarrativeEventId === eventId)
              .map(c => ({ threadId: c.threadId }));
            conns = [...baseIncomingThreadIds, ...overrideOutgoing] as typeof baseConns;
          }
        }
      }
      return [...new Set(conns.map(c => c.threadId).filter((id): id is string => !!id))];
    }),

    // Returns entity links for this event under the given path context.
    // When an override exists and overridesAssets=true, returns override links only.
    // Otherwise falls back to base entity links.
    effectiveEntityLinksForEvent: computed(() => (eventId: string, activePathIds: ReadonlySet<string>): (NarrativeEntityLink | EventOverrideEntityLink & { ownerType: 'Event'; ownerId: string })[] => {
      if (activePathIds.size > 0) {
        const overrides     = store.narrativeEventOverrides().filter(o => o.narrativeEventId === eventId);
        const overridePaths = store.eventOverridePaths();
        const applicable = overrides.filter(o => {
          const required = overridePaths.filter(op => op.eventOverrideId === o.id).map(op => op.pathId);
          return required.length > 0 && required.every(id => activePathIds.has(id));
        });
        applicable.sort((a, b) =>
          overridePaths.filter(op => op.eventOverrideId === b.id).length -
          overridePaths.filter(op => op.eventOverrideId === a.id).length
        );
        const match = applicable.find(o => o.overridesAssets);
        if (match) {
          return store.eventOverrideEntityLinks()
            .filter(l => l.eventOverrideId === match.id) as any[];
        }
      }
      return store.narrativeEntityLinks().filter(l => l.ownerType === 'Event' && l.ownerId === eventId);
    }),

    // PathSets for which this event has explicit variant participation.
    variantParticipationsForEvent: computed(() => (eventId: string): NarrativeEventVariantParticipation[] => {
      return store.variantParticipations().filter(p => p.narrativeEventId === eventId);
    }),

    // PathSets whose scope includes this event, derived via BFS graph traversal.
    // A PathSet's scope is the set of events reachable from its origin event
    // following NarrativeEventConnections, stopping at (and excluding) its
    // Any event may participate in any PathSet — no topological eligibility gate.
    applicablePathSetsForEvent: computed(() => (eventId: string): PathSet[] => {
      return store.pathSets().filter(ps => ps.originEventId !== eventId);
    }),
  })),

  withMethods((store, api = inject(ApiService)) => ({
    setNarrativeFocus: (entity: { type: NarrativeEntityLinkType; id: string; name: string } | null) => {
      patchState(store, { narrativeFocusEntity: entity });
    },

    toggleNarrativeInspector: () => {
      patchState(store, { narrativeInspectorOpen: !store.narrativeInspectorOpen() });
    },

    openNarrativeInspector: () => {
      patchState(store, { narrativeInspectorOpen: true });
    },

    loadNarrative: async () => {
      const [
        pathSets,
        narrativePaths,
        pathSetContexts,
        variantParticipations,
        narrativeEventOverrides,
        eventOverridePaths,
        eventOverrideConnections,
        eventOverrideEntityLinks,
        narrativeThreads,
        narrativeEvents,
        narrativeConnections,
        narrativeEntityLinks,
        narrativeRealizations,
        narrativePlacements,
      ] = await Promise.all([
        api.get<PathSet[]>('narrative/path-sets'),
        api.get<NarrativePath[]>('narrative/paths'),
        api.get<PathSetContext[]>('narrative/path-set-contexts'),
        api.get<NarrativeEventVariantParticipation[]>('narrative/variant-participation'),
        api.get<NarrativeEventOverride[]>('narrative/event-overrides'),
        api.get<EventOverridePath[]>('narrative/event-override-paths'),
        api.get<EventOverrideConnection[]>('narrative/event-override-connections'),
        api.get<EventOverrideEntityLink[]>('narrative/event-override-entity-links'),
        api.get<NarrativeThread[]>('narrative/threads'),
        api.get<NarrativeEvent[]>('narrative/events'),
        api.get<NarrativeEventConnection[]>('narrative/connections'),
        api.get<NarrativeEntityLink[]>('narrative/entity-links'),
        api.get<NarrativeEventRealization[]>('narrative/realizations'),
        api.get<NarrativeEventPlacement[]>('narrative/placements'),
      ]);
      patchState(store, {
        pathSets,
        narrativePaths,
        pathSetContexts,
        variantParticipations,
        narrativeEventOverrides,
        eventOverridePaths,
        eventOverrideConnections,
        eventOverrideEntityLinks,
        narrativeThreads,
        narrativeEvents,
        narrativeConnections,
        narrativeEntityLinks,
        narrativeRealizations,
        narrativePlacements,
      });
    },

    savePathSetContext: async (ctx: PathSetContext) => {
      const exists = store.pathSetContexts().some(
        c => c.pathSetId === ctx.pathSetId && c.requiredPathId === ctx.requiredPathId
      );
      if (!exists) {
        await api.post<PathSetContext>('narrative/path-set-contexts', ctx);
        patchState(store, { pathSetContexts: [...store.pathSetContexts(), ctx] });
      }
    },

    deletePathSetContext: async (pathSetId: string, requiredPathId: string) => {
      await api.delete(`narrative/path-set-contexts?pathSetId=${pathSetId}&requiredPathId=${requiredPathId}`);
      patchState(store, {
        pathSetContexts: store.pathSetContexts().filter(
          c => !(c.pathSetId === pathSetId && c.requiredPathId === requiredPathId)
        ),
      });
    },

    savePathSet: async (ps: PathSet) => {
      const saved = ps.id
        ? await api.put<PathSet>(`narrative/path-sets/${ps.id}`, ps)
        : await api.post<PathSet>('narrative/path-sets', ps);
      patchState(store, {
        pathSets: ps.id
          ? store.pathSets().map(s => s.id === saved.id ? saved : s)
          : [...store.pathSets(), saved],
      });
      return saved;
    },

    deletePathSet: async (id: string) => {
      await api.delete(`narrative/path-sets/${id}`);
      patchState(store, {
        pathSets: store.pathSets().filter(s => s.id !== id),
        narrativePaths: store.narrativePaths().filter(p => p.pathSetId !== id),
        variantParticipations: store.variantParticipations().filter(p => p.pathSetId !== id),
      });
    },

    saveNarrativePath: async (path: NarrativePath) => {
      const saved = path.id
        ? await api.put<NarrativePath>(`narrative/paths/${path.id}`, path)
        : await api.post<NarrativePath>('narrative/paths', path);
      patchState(store, {
        narrativePaths: path.id
          ? store.narrativePaths().map(p => p.id === saved.id ? saved : p)
          : [...store.narrativePaths(), saved],
      });
      return saved;
    },

    deleteNarrativePath: async (id: string) => {
      await api.delete(`narrative/paths/${id}`);
      patchState(store, { narrativePaths: store.narrativePaths().filter(p => p.id !== id) });
    },

    saveThread: async (thread: NarrativeThread) => {
      const saved = thread.id
        ? await api.put<NarrativeThread>(`narrative/threads/${thread.id}`, thread)
        : await api.post<NarrativeThread>('narrative/threads', thread);
      patchState(store, {
        narrativeThreads: thread.id
          ? store.narrativeThreads().map(t => t.id === saved.id ? saved : t)
          : [...store.narrativeThreads(), saved],
      });
      return saved;
    },

    deleteThread: async (id: string) => {
      await api.delete(`narrative/threads/${id}`);
      patchState(store, {
        narrativeThreads: store.narrativeThreads().filter(t => t.id !== id),
        narrativeEntityLinks: store.narrativeEntityLinks().filter(
          l => !(l.ownerType === 'Thread' && l.ownerId === id)
        ),
      });
    },

    saveNarrativeEvent: async (ev: NarrativeEvent) => {
      const payload = ev.id
        ? ev
        : { ...ev, sortOrder: store.narrativeEvents().length };
      const saved = ev.id
        ? await api.put<NarrativeEvent>(`narrative/events/${ev.id}`, payload)
        : await api.post<NarrativeEvent>('narrative/events', payload);
      patchState(store, {
        narrativeEvents: ev.id
          ? store.narrativeEvents().map(e => e.id === saved.id ? saved : e)
          : [...store.narrativeEvents(), saved],
      });
      return saved;
    },

    reorderNarrativeEvents: async (orderedIds: string[]) => {
      const eventMap = new Map(store.narrativeEvents().map(e => [e.id, e]));
      const reordered = orderedIds
        .map((id, i) => {
          const e = eventMap.get(id);
          return e ? { ...e, sortOrder: i } : null;
        })
        .filter((e): e is NarrativeEvent => e !== null);
      patchState(store, { narrativeEvents: reordered });
      await firstValueFrom(api.reorderNarrativeEvents(orderedIds));
    },

    deleteNarrativeEvent: async (id: string) => {
      await api.delete(`narrative/events/${id}`);
      patchState(store, {
        narrativeEvents: store.narrativeEvents().filter(e => e.id !== id),
        narrativeConnections: store.narrativeConnections().filter(
          c => c.sourceNarrativeEventId !== id && c.targetNarrativeEventId !== id
        ),
        narrativeEntityLinks: store.narrativeEntityLinks().filter(
          l => !(l.ownerType === 'Event' && l.ownerId === id)
        ),
        narrativePlacements: store.narrativePlacements().filter(p => p.narrativeEventId !== id),
        narrativeRealizations: store.narrativeRealizations().filter(r => r.narrativeEventId !== id),
        narrativeEventOverrides: store.narrativeEventOverrides().filter(o => o.narrativeEventId !== id),
      });
    },

    saveEventOverride: async (override: NarrativeEventOverride) => {
      const saved = override.id
        ? await api.put<NarrativeEventOverride>(`narrative/event-overrides/${override.id}`, override)
        : await api.post<NarrativeEventOverride>('narrative/event-overrides', override);
      patchState(store, {
        narrativeEventOverrides: override.id
          ? store.narrativeEventOverrides().map(o => o.id === saved.id ? saved : o)
          : [...store.narrativeEventOverrides(), saved],
      });
      return saved;
    },

    deleteEventOverride: async (id: string) => {
      await api.delete(`narrative/event-overrides/${id}`);
      patchState(store, {
        narrativeEventOverrides: store.narrativeEventOverrides().filter(o => o.id !== id),
        eventOverridePaths: store.eventOverridePaths().filter(op => op.eventOverrideId !== id),
        // The version's connections and links were part of it (one entry in the event's file).
        eventOverrideConnections: store.eventOverrideConnections().filter(c => c.eventOverrideId !== id),
        eventOverrideEntityLinks: store.eventOverrideEntityLinks().filter(l => l.eventOverrideId !== id),
      });
    },

    saveVariantParticipation: async (eventId: string, pathSetId: string) => {
      const exists = store.variantParticipations().some(
        p => p.narrativeEventId === eventId && p.pathSetId === pathSetId
      );
      if (!exists) {
        await api.put<NarrativeEventVariantParticipation>(
          `narrative/variant-participation/${eventId}/${pathSetId}`, {}
        );
        patchState(store, {
          variantParticipations: [
            ...store.variantParticipations(),
            { narrativeEventId: eventId, pathSetId },
          ],
        });
      }
    },

    deleteVariantParticipation: async (eventId: string, pathSetId: string) => {
      await api.delete(`narrative/variant-participation/${eventId}/${pathSetId}`);
      patchState(store, {
        variantParticipations: store.variantParticipations().filter(
          p => !(p.narrativeEventId === eventId && p.pathSetId === pathSetId)
        ),
      });
    },

    saveEventOverridePath: async (op: EventOverridePath) => {
      const exists = store.eventOverridePaths().some(
        x => x.eventOverrideId === op.eventOverrideId && x.pathId === op.pathId
      );
      if (!exists) {
        await api.post<EventOverridePath>('narrative/event-override-paths', op);
        patchState(store, { eventOverridePaths: [...store.eventOverridePaths(), op] });
      }
    },

    deleteEventOverridePath: async (eventOverrideId: string, pathId: string) => {
      await api.delete(`narrative/event-override-paths?overrideId=${eventOverrideId}&pathId=${pathId}`);
      patchState(store, {
        eventOverridePaths: store.eventOverridePaths().filter(
          x => !(x.eventOverrideId === eventOverrideId && x.pathId === pathId)
        ),
      });
    },

    saveConnection: async (conn: NarrativeEventConnection) => {
      const saved = conn.id
        ? await api.put<NarrativeEventConnection>(`narrative/connections/${conn.id}`, conn)
        : await api.post<NarrativeEventConnection>('narrative/connections', conn);
      patchState(store, {
        // A connection's id comes from its source, target and thread, so an edit can change it.
        narrativeConnections: conn.id
          ? store.narrativeConnections().map(c => c.id === conn.id ? saved : c)
          : [...store.narrativeConnections(), saved],
      });
      return saved;
    },

    deleteConnection: async (id: string) => {
      await api.delete(`narrative/connections/${id}`);
      patchState(store, { narrativeConnections: store.narrativeConnections().filter(c => c.id !== id) });
    },

    saveEntityLink: async (link: NarrativeEntityLink) => {
      const saved = link.id
        ? await api.put<NarrativeEntityLink>(`narrative/entity-links/${link.id}`, link)
        : await api.post<NarrativeEntityLink>('narrative/entity-links', link);
      patchState(store, {
        narrativeEntityLinks: link.id
          ? store.narrativeEntityLinks().map(l => l.id === saved.id ? saved : l)
          : [...store.narrativeEntityLinks(), saved],
      });
      return saved;
    },

    deleteEntityLink: async (id: string) => {
      await api.delete(`narrative/entity-links/${id}`);
      patchState(store, { narrativeEntityLinks: store.narrativeEntityLinks().filter(l => l.id !== id) });
    },

    saveOverrideConnection: async (conn: EventOverrideConnection) => {
      const saved = conn.id
        ? await api.put<EventOverrideConnection>(`narrative/event-override-connections/${conn.id}`, conn)
        : await api.post<EventOverrideConnection>('narrative/event-override-connections', conn);
      patchState(store, {
        // The id comes from the version, target and thread, so an edit can change it.
        eventOverrideConnections: conn.id
          ? store.eventOverrideConnections().map(c => c.id === conn.id ? saved : c)
          : [...store.eventOverrideConnections(), saved],
      });
      return saved;
    },

    deleteOverrideConnection: async (id: string) => {
      await api.delete(`narrative/event-override-connections/${id}`);
      patchState(store, {
        eventOverrideConnections: store.eventOverrideConnections().filter(c => c.id !== id),
      });
    },

    saveOverrideEntityLink: async (link: EventOverrideEntityLink) => {
      const saved = link.id
        ? await api.put<EventOverrideEntityLink>(`narrative/event-override-entity-links/${link.id}`, link)
        : await api.post<EventOverrideEntityLink>('narrative/event-override-entity-links', link);
      patchState(store, {
        // The id comes from the version and the entity, so an edit can change it.
        eventOverrideEntityLinks: link.id
          ? store.eventOverrideEntityLinks().map(l => l.id === link.id ? saved : l)
          : [...store.eventOverrideEntityLinks(), saved],
      });
      return saved;
    },

    deleteOverrideEntityLink: async (id: string) => {
      await api.delete(`narrative/event-override-entity-links/${id}`);
      patchState(store, {
        eventOverrideEntityLinks: store.eventOverrideEntityLinks().filter(l => l.id !== id),
      });
    },

    saveRealization: async (r: NarrativeEventRealization) => {
      const saved = r.id
        ? await api.put<NarrativeEventRealization>(`narrative/realizations/${r.id}`, r)
        : await api.post<NarrativeEventRealization>('narrative/realizations', r);
      patchState(store, {
        narrativeRealizations: r.id
          ? store.narrativeRealizations().map(x => x.id === saved.id ? saved : x)
          : [...store.narrativeRealizations(), saved],
      });
      return saved;
    },

    deleteRealization: async (id: string) => {
      await api.delete(`narrative/realizations/${id}`);
      patchState(store, { narrativeRealizations: store.narrativeRealizations().filter(r => r.id !== id) });
    },

    savePlacements: async (placements: NarrativeEventPlacement[]) => {
      // Update store immediately so positions survive tab switches while the
      // API call is still in flight.
      const updated = new Map(placements.map(p => [p.narrativeEventId, p]));
      const merged = store.narrativePlacements()
        .map(p => updated.has(p.narrativeEventId) ? updated.get(p.narrativeEventId)! : p);
      const existingIds = new Set(store.narrativePlacements().map(p => p.narrativeEventId));
      placements.forEach(p => { if (!existingIds.has(p.narrativeEventId)) merged.push(p); });
      patchState(store, { narrativePlacements: merged });
      await api.put<void>('narrative/placements', placements);
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
