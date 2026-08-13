import { Component, inject, input, output, signal, computed } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { AppStore } from '../../store/app.store';
import {
  NarrativeEvent, NarrativeEventOverride, NarrativeEntityLink, NarrativeEntityLinkType,
  NARRATIVE_VISIBILITY_OPTIONS, NARRATIVE_EVENT_STATUS_OPTIONS,
} from '../../core/models/types';

@Component({
  selector: 'app-narrative-event-card',
  standalone: true,
  imports: [LowerCasePipe],
  templateUrl: './narrative-event-card.component.html',
  styleUrl: './narrative-event-card.component.scss',
})
export class NarrativeEventCardComponent {
  store = inject(AppStore);

  event        = input.required<NarrativeEvent>();
  activePathId = input<string | null>(null);

  edit     = output<void>();
  scrollTo = output<string>();  // emits eventId to scroll to

  readonly visibilityOptions = NARRATIVE_VISIBILITY_OPTIONS;
  readonly statusOptions     = NARRATIVE_EVENT_STATUS_OPTIONS;

  // ── Effective event (base merged with path variant) ───────────────────────

  private activePathIds = computed<ReadonlySet<string>>(() => {
    const pid = this.activePathId();
    return pid ? new Set([pid]) : new Set<string>();
  });

  effectiveEvent = computed(() =>
    this.store.effectiveEvent()(this.event(), this.activePathIds())
  );

  activeOverride = computed<NarrativeEventOverride | undefined>(() =>
    this.store.overrideForEvent()(this.event().id, this.activePathIds())
  );

  overrideHasChanges = computed(() => {
    const o = this.activeOverride();
    if (!o) return false;
    return o.overridesSummary || o.overridesDescription || o.overridesConnections || o.overridesThreads || o.overridesAssets;
  });

  readonly isVariant = computed(() => this.activePathId() !== null && this.overrideHasChanges());

  // ── Derived data ──────────────────────────────────────────────────────────

  threads = computed(() => {
    const threadIds = new Set(
      this.store.effectiveThreadIdsForEvent()(this.event().id, this.activePathIds())
    );
    return this.store.narrativeThreads().filter(t => threadIds.has(t.id));
  });

  effectiveLinks = computed(() =>
    this.store.effectiveEntityLinksForEvent()(this.event().id, this.activePathIds())
  );

  realizations = computed(() => this.store.realizationsForEvent()(this.event().id));

  characterLinks = computed(() => this.effectiveLinks().filter(l => l.entityType === 'Character'));
  assetLinks     = computed(() => this.effectiveLinks().filter(l => l.entityType === 'Asset'));

  effectiveConns = computed(() =>
    this.store.effectiveConnectionsForEvent()(this.event().id, this.activePathIds())
  );

  incomingConns = computed(() =>
    this.effectiveConns().filter(c => c.targetNarrativeEventId === this.event().id)
  );
  outgoingConns = computed(() =>
    this.effectiveConns().filter(c => c.sourceNarrativeEventId === this.event().id)
  );

  // ── Hover state (for inline + buttons) ───────────────────────────────────

  hovered = signal(false);

  // ── Helpers ───────────────────────────────────────────────────────────────

  entityName(link: { entityType: NarrativeEntityLinkType; entityId: string }): string {
    const { entityType: t, entityId: id } = link;
    if (t === 'Character') return this.store.characters().find(c => c.id === id)?.name ?? id;
    if (t === 'Asset')     return this.store.assets().find(a => a.id === id)?.name ?? id;
    return id;
  }

  characterInitials(link: { entityType: NarrativeEntityLinkType; entityId: string }): string {
    return this.entityName(link).split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
  }

  connEventTitle(connId: string, otherId: string): string {
    return this.store.narrativeEvents().find(e => e.id === otherId)?.title ?? otherId;
  }
}
