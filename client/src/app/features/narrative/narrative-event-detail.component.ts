import { Component, inject, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppStore } from '../../store/app.store';
import {
  NarrativeEvent, NarrativeEventOverride, NarrativeEntityLink, NarrativeEntityLinkType,
  NarrativeEventConnection, NarrativeThreadEvent, EventOverrideEntityLink, EventOverrideConnection,
  NARRATIVE_ENTITY_LINK_TYPE_OPTIONS, NARRATIVE_VISIBILITY_OPTIONS, NARRATIVE_EVENT_STATUS_OPTIONS,
} from '../../core/models/types';

@Component({
  selector: 'app-narrative-event-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './narrative-event-detail.component.html',
  styleUrl: './narrative-event-detail.component.scss',
})
export class NarrativeEventDetailComponent {
  store = inject(AppStore);

  event        = input.required<NarrativeEvent>();
  /** When true the component renders as a horizontal scroll card (no close/path strip) */
  cardMode     = input<boolean>(false);
  /** Active path driven from parent (used in cardMode; ignored in panel mode) */
  activePathId = input<string | null>(null);

  edit  = output<void>();
  close = output<void>();

  readonly entityTypeOptions = NARRATIVE_ENTITY_LINK_TYPE_OPTIONS;
  readonly visibilityOptions = NARRATIVE_VISIBILITY_OPTIONS;
  readonly statusOptions     = NARRATIVE_EVENT_STATUS_OPTIONS;

  // ── Path context ──────────────────────────────────────────────────────────
  // In panel mode this is driven by the in-card path strip.
  // In card mode this mirrors the parent activePathId input.

  readonly _internalPathId = signal<string | null>(null);

  readonly currentPathId = computed(() =>
    this.cardMode() ? this.activePathId() : this._internalPathId()
  );

  private activePathIds = computed<ReadonlySet<string>>(() => {
    const pid = this.currentPathId();
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

  // ── Override editor ────────────────────────────────────────────────────────

  overrideDraft    = signal<Partial<NarrativeEventOverride>>({});
  showOverrideModal = signal(false);

  openOverrideEdit(): void {
    const o = this.activeOverride();
    this.overrideDraft.set(o ? { ...o } : { narrativeEventId: this.event().id });
    this.showOverrideModal.set(true);
  }

  closeOverrideModal(): void { this.showOverrideModal.set(false); }

  async saveOverride(): Promise<void> {
    const pathId = this.currentPathId();
    if (!pathId) return;
    const draft = this.overrideDraft();
    const override: NarrativeEventOverride = {
      id:                   draft.id ?? '',
      narrativeEventId:     this.event().id,
      overridesSummary:     draft.overridesSummary     ?? false,
      summary:              draft.summary?.trim()      || undefined,
      overridesDescription: draft.overridesDescription ?? false,
      description:          draft.description?.trim()  || undefined,
      overridesConnections: draft.overridesConnections ?? false,
      overridesThreads:     draft.overridesThreads     ?? false,
      overridesAssets:      draft.overridesAssets      ?? false,
    };
    const saved = await this.store.saveEventOverride(override);
    if (!draft.id) {
      await this.store.saveEventOverridePath({ eventOverrideId: saved.id, pathId });
    }
    this.showOverrideModal.set(false);
  }

  async revertOverride(): Promise<void> {
    const o = this.activeOverride();
    if (!o) return;
    await this.store.deleteEventOverride(o.id);
    this.showOverrideModal.set(false);
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  connections  = computed(() => this.store.effectiveConnectionsForEvent()(this.event().id, this.activePathIds()));
  realizations = computed(() => this.store.realizationsForEvent()(this.event().id));

  threads = computed(() => {
    const threadIds = new Set(
      this.store.effectiveThreadIdsForEvent()(this.event().id, this.activePathIds())
    );
    return this.store.narrativeThreads().filter(t => threadIds.has(t.id));
  });

  effectiveLinks = computed(() =>
    this.store.effectiveEntityLinksForEvent()(this.event().id, this.activePathIds())
  );

  characterLinks = computed(() => this.effectiveLinks().filter(l => l.entityType === 'Character'));
  assetLinks     = computed(() => this.effectiveLinks().filter(l => l.entityType === 'Asset'));
  otherLinks     = computed(() => this.effectiveLinks().filter(l => l.entityType !== 'Character' && l.entityType !== 'Asset'));

  incomingConns = computed(() => this.connections().filter(c => c.targetNarrativeEventId === this.event().id));
  outgoingConns = computed(() => this.connections().filter(c => c.sourceNarrativeEventId === this.event().id));

  // ── Ensure override record exists for the current path ───────────────────
  // Returns the override id, creating one if needed.

  private async ensureOverride(): Promise<string> {
    const pathId = this.currentPathId()!;
    let override = this.activeOverride();
    if (!override) {
      const saved = await this.store.saveEventOverride({
        id: '', narrativeEventId: this.event().id,
        overridesSummary: false, overridesDescription: false,
        overridesConnections: false, overridesThreads: false, overridesAssets: false,
      });
      await this.store.saveEventOverridePath({ eventOverrideId: saved.id, pathId });
      return saved.id;
    }
    return override.id;
  }

  // ── Add link ──────────────────────────────────────────────────────────────

  showLinkForm    = signal(false);
  newLinkType     = signal<NarrativeEntityLinkType>('Faction');
  newLinkEntityId = signal('');
  newLinkRole     = signal('');

  linkEntityOptions = computed(() => {
    const type = this.newLinkType();
    if (type === 'Faction')   return this.store.factions().map(f => ({ id: f.id, name: f.name }));
    if (type === 'Character') return this.store.characters().map(c => ({ id: c.id, name: c.name }));
    if (type === 'Asset')     return this.store.assets().map(a => ({ id: a.id, name: a.name }));
    if (type === 'Location')  return this.store.locations().map(l => ({ id: l.id, name: l.name }));
    if (type === 'Session')   return this.store.sessions().map(s => ({ id: s.id, name: `Session ${s.number}: ${s.title}` }));
    return [];
  });

  async addLink(): Promise<void> {
    const entityId = this.newLinkEntityId();
    if (!entityId) return;
    const pathId = this.currentPathId();

    if (pathId) {
      const overrideId = await this.ensureOverride();
      // Mark the override as owning assets/characters
      const override = this.activeOverride() ?? this.store.narrativeEventOverrides().find(o => o.id === overrideId)!;
      await this.store.saveEventOverride({ ...override, id: overrideId, overridesAssets: true });
      const link: EventOverrideEntityLink = {
        id: '', eventOverrideId: overrideId,
        entityType: this.newLinkType(), entityId,
        role: this.newLinkRole().trim() || undefined,
        isPrimary: false, visibility: 'GMOnly',
      };
      await this.store.saveOverrideEntityLink(link);
    } else {
      const link: NarrativeEntityLink = {
        id: '', campaignId: '', ownerType: 'Event', ownerId: this.event().id,
        entityType: this.newLinkType(), entityId,
        role: this.newLinkRole().trim() || undefined,
        isPrimary: false, visibility: 'GMOnly',
      };
      await this.store.saveEntityLink(link);
    }

    this.showLinkForm.set(false);
    this.newLinkEntityId.set('');
    this.newLinkRole.set('');
  }

  async removeLink(id: string): Promise<void> {
    const pathId = this.currentPathId();
    if (pathId) {
      await this.store.deleteOverrideEntityLink(id);
    } else {
      await this.store.deleteEntityLink(id);
    }
  }

  // ── Add thread ────────────────────────────────────────────────────────────

  showThreadForm = signal(false);
  newThreadId    = signal('');

  availableThreads = computed(() => {
    const linked = new Set(this.threads().map(t => t.id));
    return this.store.narrativeThreads().filter(t => !linked.has(t.id));
  });

  async addThread(): Promise<void> {
    const threadId = this.newThreadId();
    if (!threadId) return;
    const pathId = this.currentPathId();

    if (pathId) {
      const overrideId = await this.ensureOverride();
      const override = this.activeOverride() ?? this.store.narrativeEventOverrides().find(o => o.id === overrideId)!;
      await this.store.saveEventOverride({ ...override, id: overrideId, overridesThreads: true });
      await this.store.saveOverrideThread({ eventOverrideId: overrideId, narrativeThreadId: threadId, isPrimary: false });
    } else {
      const te: NarrativeThreadEvent = {
        narrativeThreadId: threadId,
        narrativeEventId:  this.event().id,
        isPrimary: false,
      };
      await this.store.saveThreadEvent(te);
    }

    this.showThreadForm.set(false);
    this.newThreadId.set('');
  }

  async removeThread(threadId: string): Promise<void> {
    const pathId = this.currentPathId();
    if (pathId) {
      const override = this.activeOverride();
      if (!override) return;
      await this.store.deleteOverrideThread(override.id, threadId);
    } else {
      await this.store.deleteThreadEvent(threadId, this.event().id);
    }
  }

  pathHasOverride(eventId: string, pathId: string): boolean {
    return this.store.overrideForEvent()(eventId, new Set([pathId])) !== undefined;
  }

  // ── Add connection ────────────────────────────────────────────────────────

  showConnectionForm = signal(false);
  newConnDirection   = signal<'from' | 'to'>('to');
  newConnTargetId    = signal('');
  newConnLabel       = signal('');

  connectionTargetOptions = computed(() => {
    const ev = this.event();
    const existingIds = new Set(this.connections().map(c =>
      c.sourceNarrativeEventId === ev.id ? c.targetNarrativeEventId : c.sourceNarrativeEventId,
    ));
    return this.store.narrativeEvents().filter(e => e.id !== ev.id && !existingIds.has(e.id));
  });

  async addConnection(): Promise<void> {
    const targetId = this.newConnTargetId();
    if (!targetId) return;
    const ev = this.event();
    const pathId = this.currentPathId();

    if (pathId && this.newConnDirection() === 'to') {
      const overrideId = await this.ensureOverride();
      const override = this.activeOverride() ?? this.store.narrativeEventOverrides().find(o => o.id === overrideId)!;
      await this.store.saveEventOverride({ ...override, id: overrideId, overridesConnections: true });
      const conn: EventOverrideConnection = {
        id: '', eventOverrideId: overrideId,
        targetNarrativeEventId: targetId,
        label: this.newConnLabel().trim() || undefined,
        visibility: 'GMOnly',
      };
      await this.store.saveOverrideConnection(conn);
    } else {
      const conn: NarrativeEventConnection = {
        id: '', campaignId: '',
        sourceNarrativeEventId: this.newConnDirection() === 'from' ? targetId : ev.id,
        targetNarrativeEventId: this.newConnDirection() === 'from' ? ev.id    : targetId,
        label: this.newConnLabel().trim() || undefined,
        visibility: 'GMOnly',
      };
      await this.store.saveConnection(conn);
    }

    this.showConnectionForm.set(false);
    this.newConnTargetId.set('');
    this.newConnLabel.set('');
  }

  async removeConnection(id: string): Promise<void> {
    const pathId = this.currentPathId();
    const isOverrideConn = pathId &&
      this.store.eventOverrideConnections().some(c => c.id === id);
    if (isOverrideConn) {
      await this.store.deleteOverrideConnection(id);
    } else {
      await this.store.deleteConnection(id);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  entityName(link: { entityType: NarrativeEntityLinkType; entityId: string }): string {
    const { entityType: t, entityId: id } = link;
    if (t === 'Faction')   return this.store.factions().find(f => f.id === id)?.name ?? id;
    if (t === 'Character') return this.store.characters().find(c => c.id === id)?.name ?? id;
    if (t === 'Asset')     return this.store.assets().find(a => a.id === id)?.name ?? id;
    if (t === 'Location')  return this.store.locations().find(l => l.id === id)?.name ?? id;
    if (t === 'Session') {
      const s = this.store.sessions().find(s => s.id === id);
      return s ? `Session ${s.number}: ${s.title}` : id;
    }
    return id;
  }

  characterInitials(link: { entityType: NarrativeEntityLinkType; entityId: string }): string {
    const name = this.entityName(link);
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  connEventTitle(conn: NarrativeEventConnection): string {
    const ev = this.event();
    const otherId = conn.sourceNarrativeEventId === ev.id
      ? conn.targetNarrativeEventId : conn.sourceNarrativeEventId;
    return this.store.narrativeEvents().find(e => e.id === otherId)?.title ?? otherId;
  }

  realizationLabel(r: { sessionEventId: string }): string {
    for (const session of this.store.sessions()) {
      const ev = session.events?.find(e => e.id === r.sessionEventId);
      if (ev) return `${ev.title} (Session ${session.number})`;
    }
    return r.sessionEventId;
  }
}
