import { Injectable, signal, computed, inject } from '@angular/core';
import { AppStore } from '../../../store/app.store';

export type FilterMatchMode = 'any' | 'all';
export type FilterViewMode  = 'focus' | 'condense';

@Injectable({ providedIn: 'root' })
export class NarrativeFilterService {
  private store = inject(AppStore);

  readonly matchMode  = signal<FilterMatchMode>('any');
  readonly viewMode   = signal<FilterViewMode>('focus');

  readonly threadIds    = signal<string[]>([]);
  readonly characterIds = signal<string[]>([]);
  readonly assetIds     = signal<string[]>([]);

  readonly isActive = computed(() =>
    this.threadIds().length > 0 ||
    this.characterIds().length > 0 ||
    this.assetIds().length > 0
  );

  reset(): void {
    this.threadIds.set([]);
    this.characterIds.set([]);
    this.assetIds.set([]);
    this.matchMode.set('any');
    this.viewMode.set('focus');
  }

  toggleMatchMode(): void {
    this.matchMode.update(m => m === 'any' ? 'all' : 'any');
  }

  toggleViewMode(): void {
    this.viewMode.update(m => m === 'focus' ? 'condense' : 'focus');
  }

  // Returns the set of event IDs that pass the current filter criteria.
  readonly matchedEventIds = computed<Set<string>>(() => {
    const links    = this.store.narrativeEntityLinks();
    const tIds     = this.threadIds();
    const cIds     = this.characterIds();
    const aIds     = this.assetIds();
    const mode     = this.matchMode();

    if (!this.isActive()) {
      return new Set(this.store.narrativeEvents().map(e => e.id));
    }

    return new Set(
      this.store.narrativeEvents()
        .filter(ev => {
          const evLinks = links.filter(l => l.ownerType === 'Event' && l.ownerId === ev.id);

          const checks: boolean[] = [];

          if (tIds.length > 0) {
            const evThreadIds = this.store.narrativeConnections()
              .filter(c => c.sourceNarrativeEventId === ev.id || c.targetNarrativeEventId === ev.id)
              .map(c => c.threadId);
            checks.push(tIds.some(id => evThreadIds.includes(id)));
          }
          if (cIds.length > 0) {
            const evCharIds = evLinks.filter(l => l.entityType === 'Character').map(l => l.entityId);
            checks.push(cIds.some(id => evCharIds.includes(id)));
          }
          if (aIds.length > 0) {
            const evAssetIds = evLinks.filter(l => l.entityType === 'Asset').map(l => l.entityId);
            checks.push(aIds.some(id => evAssetIds.includes(id)));
          }

          return mode === 'any' ? checks.some(Boolean) : checks.every(Boolean);
        })
        .map(ev => ev.id)
    );
  });

  readonly DIM_OPACITY  = 0.2;
  readonly FULL_OPACITY = 1.0;

  readonly opacityFn = computed<(eventId: string) => number>(() => {
    if (!this.isActive()) return () => this.FULL_OPACITY;
    const matched = this.matchedEventIds();
    return (eventId: string) =>
      matched.has(eventId) ? this.FULL_OPACITY : this.DIM_OPACITY;
  });
}
