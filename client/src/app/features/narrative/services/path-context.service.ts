import { Injectable, computed, signal, effect } from '@angular/core';
import { inject } from '@angular/core';
import { AppStore } from '../../../store/app.store';
import { NarrativePath, PathSet } from '../../../core/models/types';

/**
 * Tracks the selected NarrativePath per PathSet.
 *
 * Model: Map<pathSetId, selectedPathId>
 *
 * Rules:
 * - There is no "Base" selection. A PathSet always has one real path selected.
 * - When a PathSet first becomes known, auto-select the lowest-sortOrder path.
 * - Changing a parent path invalidates nested PathSet selections that required
 *   the old parent path (removed from the map, causing re-default).
 * - `activePathIds` is the set of all currently-selected path IDs across all
 *   applicable PathSets — this is what the effective-event resolver consumes.
 */
@Injectable({ providedIn: 'root' })
export class PathContextService {
  private readonly store = inject(AppStore);

  /** pathSetId → selected pathId */
  readonly selectedPaths = signal<Map<string, string>>(new Map());

  /**
   * When true, path switching (Crown + Breadcrumb) is locked because an event
   * editor has unsaved dirty changes. Set by NarrativeEventEditorComponent.
   */
  readonly editingLocked = signal(false);

  constructor() {
    // When PathSets or NarrativePaths load/change, ensure every applicable PathSet
    // has a selection. Run in an effect so it responds to async store loads.
    effect(() => {
      const allSets  = this.store.pathSets();
      const allPaths = this.store.narrativePaths();
      const current  = this.selectedPaths();
      const active   = this.activePathIds();

      let changed = false;
      const next = new Map(current);

      for (const ps of allSets) {
        if (!this.isApplicable(ps, active)) continue;

        if (!next.has(ps.id) || !allPaths.some(p => p.pathSetId === ps.id && p.id === next.get(ps.id))) {
          const first = allPaths
            .filter(p => p.pathSetId === ps.id)
            .sort((a, b) => a.sortOrder - b.sortOrder)[0];
          if (first) { next.set(ps.id, first.id); changed = true; }
        }
      }

      // Remove entries for PathSets that no longer exist
      for (const psId of next.keys()) {
        if (!allSets.some(s => s.id === psId)) { next.delete(psId); changed = true; }
      }

      if (changed) this.selectedPaths.set(next);
    });
  }

  /**
   * The set of all currently-selected path IDs across applicable PathSets.
   * This is the single source of truth consumed by the effective-event resolver.
   */
  readonly activePathIds = computed<ReadonlySet<string>>(() => {
    const sel  = this.selectedPaths();
    const sets = this.store.pathSets();
    const result = new Set<string>();
    const contexts = this.store.pathSetContexts();

    // Top-level PathSets (no required context)
    for (const ps of sets) {
      const required = contexts.filter(c => c.pathSetId === ps.id).map(c => c.requiredPathId);
      if (required.length === 0) {
        const pid = sel.get(ps.id);
        if (pid) result.add(pid);
      }
    }

    // Nested PathSets (require specific ancestor paths)
    for (const ps of sets) {
      const required = contexts.filter(c => c.pathSetId === ps.id).map(c => c.requiredPathId);
      if (required.length > 0 && required.every(id => result.has(id))) {
        const pid = sel.get(ps.id);
        if (pid) result.add(pid);
      }
    }

    return result;
  });

  /**
   * Computes the editing context for a specific event.
   *
   * Algorithm: take the currently active paths, keep only those whose PathSet
   * has explicit variant participation for this event, preserve hierarchy order.
   * This prevents creating unnecessarily specific overrides that include PathSets
   * the event doesn't participate in.
   *
   * Returns an ordered array of { pathSetId, pathId } — the conjunction to use
   * as EventOverridePath records when saving/updating an override.
   */
  getEditingContext(
    eventId: string,
    variantParticipationPathSetIds: ReadonlySet<string>
  ): { pathSetId: string; pathId: string }[] {
    const active   = this.activePathIds();
    const sel      = this.selectedPaths();
    const contexts = this.store.pathSetContexts();
    const sets     = this.store.pathSets();

    // Build ordered list: top-level first, then nested by depth
    const ordered: PathSet[] = [];

    for (const ps of sets) {
      const required = contexts.filter(c => c.pathSetId === ps.id).map(c => c.requiredPathId);
      if (required.length === 0) ordered.push(ps);
    }
    const nested = sets
      .map(ps => ({ ps, required: contexts.filter(c => c.pathSetId === ps.id).map(c => c.requiredPathId) }))
      .filter(({ required }) => required.length > 0 && required.every(id => active.has(id)))
      .sort((a, b) => a.required.length - b.required.length);
    for (const { ps } of nested) ordered.push(ps);

    return ordered
      .filter(ps => variantParticipationPathSetIds.has(ps.id))
      .map(ps => ({ pathSetId: ps.id, pathId: sel.get(ps.id)! }))
      .filter(e => !!e.pathId);
  }

  selectedPathFor(pathSetId: string): NarrativePath | undefined {
    const pathId = this.selectedPaths().get(pathSetId);
    if (!pathId) return undefined;
    return this.store.narrativePaths().find(p => p.id === pathId);
  }

  selectedPathIdFor(pathSetId: string): string | undefined {
    return this.selectedPaths().get(pathSetId);
  }

  /**
   * Select a specific path within a PathSet.
   * No-op if editing is currently locked (dirty editor open).
   * Clears selections for any nested PathSets that required the previously-selected path.
   */
  selectPath(pathSetId: string, pathId: string): void {
    if (this.editingLocked()) return;
    const prev = this.selectedPaths().get(pathSetId);
    if (prev === pathId) return;

    const next = new Map(this.selectedPaths());
    next.set(pathSetId, pathId);

    if (prev) {
      const contexts = this.store.pathSetContexts();
      for (const [psId] of next) {
        const required = contexts.filter(c => c.pathSetId === psId).map(c => c.requiredPathId);
        if (required.includes(prev)) next.delete(psId);
      }
    }

    this.selectedPaths.set(next);
  }

  pathsForSet(pathSetId: string): NarrativePath[] {
    return this.store.narrativePaths()
      .filter(p => p.pathSetId === pathSetId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  pathSetForOriginEvent(eventId: string): PathSet | undefined {
    return this.store.pathSets().find(ps => ps.originEventId === eventId);
  }

  isPathSetOrigin(eventId: string): boolean {
    return this.store.pathSets().some(ps => ps.originEventId === eventId);
  }

  private isApplicable(ps: PathSet, activeIds: ReadonlySet<string>): boolean {
    const required = this.store.pathSetContexts()
      .filter(c => c.pathSetId === ps.id)
      .map(c => c.requiredPathId);
    return required.every(id => activeIds.has(id));
  }

  readonly breadcrumbSegments = computed<{ pathSetName: string; selectedPathName: string; pathSetId: string }[]>(() => {
    const sets     = this.store.pathSets();
    const paths    = this.store.narrativePaths();
    const contexts = this.store.pathSetContexts();
    const sel      = this.selectedPaths();
    const active   = this.activePathIds();
    const result: { pathSetName: string; selectedPathName: string; pathSetId: string }[] = [];

    for (const ps of sets) {
      const required = contexts.filter(c => c.pathSetId === ps.id).map(c => c.requiredPathId);
      if (required.length === 0) {
        const pid  = sel.get(ps.id);
        const path = paths.find(p => p.id === pid);
        if (path) result.push({ pathSetName: ps.name, selectedPathName: path.name, pathSetId: ps.id });
      }
    }

    const nested = sets
      .map(ps => ({ ps, required: contexts.filter(c => c.pathSetId === ps.id).map(c => c.requiredPathId) }))
      .filter(({ required }) => required.length > 0 && required.every(id => active.has(id)))
      .sort((a, b) => a.required.length - b.required.length);

    for (const { ps } of nested) {
      const pid  = sel.get(ps.id);
      const path = paths.find(p => p.id === pid);
      if (path) result.push({ pathSetName: ps.name, selectedPathName: path.name, pathSetId: ps.id });
    }

    return result;
  });
}
