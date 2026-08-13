import { Injectable, signal, computed, inject } from '@angular/core';
import { AppStore } from '../../../store/app.store';

export type FocusMode = 'normal' | 'isolate';

/**
 * Manages the focus/isolate mode state for the narrative flow canvas.
 *
 * - normal:  all nodes at full opacity
 * - isolate: a specific entity (thread, faction, character) is highlighted;
 *            unrelated nodes fade to dim opacity
 */
@Injectable({ providedIn: 'root' })
export class NarrativeFocusService {
  private store = inject(AppStore);

  readonly mode            = signal<FocusMode>('normal');
  readonly focusedEntityId = signal<string | null>(null);

  readonly DIM_OPACITY  = 0.25;
  readonly FULL_OPACITY = 1.0;

  enterIsolate(entityId: string): void {
    this.focusedEntityId.set(entityId);
    this.mode.set('isolate');
  }

  exitFocus(): void {
    this.mode.set('normal');
    this.focusedEntityId.set(null);
  }

  readonly opacityFn = computed<(eventId: string) => number>(() => {
    const mode     = this.mode();
    const entityId = this.focusedEntityId();

    if (mode === 'normal') return () => this.FULL_OPACITY;

    if (mode === 'isolate' && entityId) {
      const links = this.store.narrativeEntityLinks();
      const focusedEventIds = new Set(
        links
          .filter(l => l.entityId === entityId)
          .map(l => l.ownerId)
      );
      return (eventId: string) =>
        focusedEventIds.has(eventId) ? this.FULL_OPACITY : this.DIM_OPACITY;
    }

    return () => this.FULL_OPACITY;
  });
}
