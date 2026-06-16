import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import { computed } from '@angular/core';
import {
  Faction, ColonyState, RelationshipBreakdown, RelationshipOverride,
  RulesConfig, SessionLogEntry, RelationshipLabel, Character, driftScore, effectivePressure,
  topCompatibleFactions, influenceConvictionBonus
} from '../core/models/types';
import { ApiService } from '../core/services/api.service';

interface AppState {
  factions: Faction[];
  colonyState: ColonyState | null;
  relationships: RelationshipBreakdown[];
  overrides: RelationshipOverride[];
  rules: RulesConfig | null;
  sessionLog: SessionLogEntry[];
  characters: Character[];
  loading: boolean;
  error: string | null;
}

const initialState: AppState = {
  factions: [],
  colonyState: null,
  relationships: [],
  overrides: [],
  rules: null,
  sessionLog: [],
  characters: [],
  loading: false,
  error: null,
};

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
    mostHostile: computed(() =>
      [...store.relationships()]
        .filter(r => r.targetId !== 'party')
        .sort((a, b) => a.finalScore - b.finalScore)
        .slice(0, 5)
    ),
    strongestAlliances: computed(() =>
      [...store.relationships()]
        .filter(r => r.targetId !== 'party')
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, 5)
    ),
    partyRelationships: computed(() =>
      store.relationships().filter(r => r.targetId === 'party')
    ),
    factionRelationships: computed(() =>
      store.relationships().filter(r => r.targetId !== 'party')
    ),

    // Characters sorted by effective drift score descending (most at-risk first)
    // Drift = effectivePressure - effectiveConviction (conviction + influence bonus from faction peers)
    mostAtRisk: computed(() => {
      const stress = store.colonyState()?.colonyStress ?? 0;
      const scale  = store.rules()?.influenceConvictionScale ?? 0.5;
      const all    = store.characters();
      const driftOf = (c: Character) => {
        const peers  = all.filter(p => p.factionId && p.factionId === c.factionId && p.id !== c.id);
        const effConv = c.conviction + influenceConvictionBonus(c, peers, scale);
        return effectivePressure(c, stress) - effConv;
      };
      return [...all].sort((a, b) => driftOf(b) - driftOf(a)).slice(0, 5);
    }),

    // Characters whose best compatible faction is not their current faction
    potentialDefections: computed(() => {
      const activeFactions = store.factions().filter(f => f.active && f.type === 'Faction');
      return store.characters()
        .filter(c => c.factionId)
        .filter(c => {
          const top = topCompatibleFactions(c, activeFactions);
          return top.length > 0 && top[0].factionId !== c.factionId;
        });
    }),
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
