import {
  Component, inject, input, output, computed, signal, effect,
  ChangeDetectionStrategy, OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppStore } from '../../store/app.store';
import { PathContextService } from './services/path-context.service';
import {
  NarrativeEvent, NarrativeEventStatus, NarrativeVisibility,
  NarrativeEventOverride, EventOverridePath, PathSet, NarrativePath,
  NarrativeEventVariantParticipation, NarrativeEntityLink, NarrativeEntityLinkType,
  EventOverrideEntityLink,
  NARRATIVE_EVENT_STATUS_OPTIONS, NARRATIVE_VISIBILITY_OPTIONS,
} from '../../core/models/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type EditorTab = 'event' | 'variants' | 'links' | 'paths';

interface OverrideDraft {
  overridesSummary: boolean;
  summary: string;
  overridesDescription: boolean;
  description: string;
}

interface PendingPathSet {
  name: string;
  paths: PendingPath[];
  convergenceEventId: string;
}
interface PendingPath {
  tempId: string;
  name: string;
  sortOrder: number;
}

function emptyPendingPathSet(): PendingPathSet {
  return {
    name: '',
    convergenceEventId: '',
    paths: [
      { tempId: 'a', name: '', sortOrder: 0 },
      { tempId: 'b', name: '', sortOrder: 1 },
    ],
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Tabbed event editor modal.
 *
 * Tabs:
 *   Event   — always shown; edits base fields + overridable fields per active path context
 *   Variants — shown when the event is in scope of any upstream PathSet
 *   Paths    — shown when the event originates (or is pending to originate) a PathSet
 *
 * Path context is NOT duplicated inside this modal. The external breadcrumb is
 * the authoritative indicator of which timeline is being edited.
 *
 * Dirty-lock: while this modal has unsaved changes, PathContextService.editingLocked
 * is set to true, preventing Crown/Breadcrumb path switches.
 */
@Component({
  selector: 'app-narrative-event-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './narrative-event-editor.component.html',
  styleUrl: './narrative-event-editor.component.scss'
})
export class NarrativeEventEditorComponent implements OnDestroy {
  readonly store    = inject(AppStore);
  readonly pathCtx  = inject(PathContextService);

  // ── Inputs / Outputs ────────────────────────────────────────────────────
  event  = input.required<NarrativeEvent>();
  closed = output<void>();

  readonly statusOptions     = NARRATIVE_EVENT_STATUS_OPTIONS;
  readonly visibilityOptions = NARRATIVE_VISIBILITY_OPTIONS;

  // ── Active tab ──────────────────────────────────────────────────────────
  activeTab = signal<EditorTab>('event');

  // ── Dirty tracking ──────────────────────────────────────────────────────
  private isDirty = signal(false);

  markDirty(): void {
    if (!this.isDirty()) {
      this.isDirty.set(true);
      this.pathCtx.editingLocked.set(true);
    }
  }

  private clearDirty(): void {
    this.isDirty.set(false);
    this.pathCtx.editingLocked.set(false);
  }

  ngOnDestroy(): void {
    this.pathCtx.editingLocked.set(false);
  }

  // ── Base (invariant) field drafts ────────────────────────────────────────
  readonly baseTitle             = signal('');
  readonly baseStatus            = signal<string>('Planned');
  readonly baseVisibility        = signal<string>('GMOnly');
  readonly baseNarrativeFunction = signal('');
  readonly baseSummary           = signal('');
  readonly baseDescription       = signal('');

  // ── Override draft (for overridable fields in variant context) ───────────
  readonly overrideDraft = signal<OverrideDraft>({
    overridesSummary: false, summary: '',
    overridesDescription: false, description: '',
  });

  // ── Path source drafts ───────────────────────────────────────────────────
  readonly pathSourceEnabled   = signal(false);
  readonly pendingPathSource   = signal<PendingPathSet | null>(null);
  readonly pathSetName         = signal('');
  readonly pathSetConvergenceId = signal('');
  readonly editablePaths       = signal<(NarrativePath & { tempId?: string })[]>([]);

  // ── Computed from event input ────────────────────────────────────────────

  readonly existingPathSet = computed(() =>
    this.store.pathSets().find(ps => ps.originEventId === this.event().id) ?? null
  );

  readonly pathsForExistingSet = computed<NarrativePath[]>(() => {
    const ps = this.existingPathSet();
    if (!ps) return [];
    return this.pathCtx.pathsForSet(ps.id);
  });

  readonly convergenceEventTitle = computed<string>(() => {
    const ps = this.existingPathSet();
    if (!ps?.convergenceEventId) return '';
    return this.store.narrativeEvents().find(e => e.id === ps.convergenceEventId)?.title ?? '';
  });

  // PathSets whose scope includes this event (derived via BFS in the store)
  readonly applicablePathSets = computed<PathSet[]>(() =>
    this.store.applicablePathSetsForEvent()(this.event().id)
  );

  readonly currentParticipations = computed<NarrativeEventVariantParticipation[]>(() =>
    this.store.variantParticipationsForEvent()(this.event().id)
  );

  participatesIn(pathSetId: string): boolean {
    return this.currentParticipations().some(p => p.pathSetId === pathSetId);
  }

  pathsForSet(pathSetId: string): NarrativePath[] {
    return this.pathCtx.pathsForSet(pathSetId);
  }

  // The editing context: which PathSets actually contribute to the current override
  readonly editingContextPaths = computed<{ pathSetId: string; pathId: string }[]>(() => {
    const participatingSetIds = new Set(
      this.currentParticipations().map(p => p.pathSetId)
    );
    return this.pathCtx.getEditingContext(this.event().id, participatingSetIds);
  });

  // Has any variant context at all?
  readonly hasVariantContext = computed(() => this.editingContextPaths().length > 0);

  // The best-matching existing override for this event + current context
  readonly activeOverride = computed<NarrativeEventOverride | undefined>(() => {
    if (!this.hasVariantContext()) return undefined;
    const activePathIds = new Set(this.editingContextPaths().map(e => e.pathId));
    return this.store.overrideForEvent()(this.event().id, activePathIds);
  });

  // Inherited values (base event values, since we only override summary/description)
  readonly inheritedSummary     = computed(() => this.event().summary ?? '');
  readonly inheritedDescription = computed(() => this.event().description ?? '');

  // ── Tab visibility ───────────────────────────────────────────────────────
  readonly showVariantsTab = computed(() => this.applicablePathSets().length > 0);
  readonly showPathsTab    = computed(() =>
    this.pathSourceEnabled() || !!this.existingPathSet()
  );

  // ── Validation ───────────────────────────────────────────────────────────
  readonly canSave = computed(() => this.baseTitle().trim().length > 0);

  readonly canSavePathsTab = computed(() => {
    const n = this.pathSetName().trim();
    if (!n) return false;
    const paths = this.editablePaths().filter(p => p.name.trim());
    return paths.length >= 2;
  });

  // ── Init: populate drafts from current event + active override ────────────

  constructor() {
    // Re-populate whenever the event or active override changes.
    effect(() => {
      const ev = this.event();
      const override = this.activeOverride();
      const ps = this.existingPathSet();

      // Base fields
      this.baseTitle.set(ev.title);
      this.baseStatus.set(ev.status);
      this.baseVisibility.set(ev.visibility);
      this.baseNarrativeFunction.set(ev.narrativeFunction ?? '');
      this.baseSummary.set(ev.summary ?? '');
      this.baseDescription.set(ev.description ?? '');

      // Override draft
      this.overrideDraft.set({
        overridesSummary:     override?.overridesSummary     ?? false,
        summary:              override?.summary              ?? '',
        overridesDescription: override?.overridesDescription ?? false,
        description:          override?.description          ?? '',
      });

      // Path source
      this.pathSourceEnabled.set(!!ps);
      if (ps) {
        this.pathSetName.set(ps.name);
        this.pathSetConvergenceId.set(ps.convergenceEventId ?? '');
        this.editablePaths.set(
          this.pathCtx.pathsForSet(ps.id).map(p => ({ ...p }))
        );
      } else {
        this.pendingPathSource.set(null);
      }

      // Clear dirty on new event load
      this.clearDirty();
    }, { allowSignalWrites: true });
  }

  // ── Variant context label (e.g. "Path A · Path B") ──────────────────────

  readonly variantContextLabel = computed(() => {
    const ctx = this.editingContextPaths();
    if (!ctx.length) return '';
    return ctx.map(c => {
      const ps   = this.store.pathSets().find(p => p.id === c.pathSetId);
      const path = this.store.narrativePaths().find(p => p.id === c.pathId);
      return path?.name ?? ps?.name ?? c.pathId;
    }).join(' · ');
  });

  // ── Current display values for variant fields ────────────────────────────
  // When overridden: show the override draft value.
  // When inherited: show empty string so the placeholder shows the base value.

  readonly variantSummaryValue = computed(() =>
    this.hasVariantContext() && this.overrideDraft().overridesSummary
      ? this.overrideDraft().summary
      : this.hasVariantContext() ? '' : this.baseSummary()
  );

  readonly variantDescriptionValue = computed(() =>
    this.hasVariantContext() && this.overrideDraft().overridesDescription
      ? this.overrideDraft().description
      : this.hasVariantContext() ? '' : this.baseDescription()
  );

  // ── Implicit override creation on edit ───────────────────────────────────

  onVariantSummaryChange(value: string): void {
    if (this.hasVariantContext()) {
      this.overrideDraft.update(d => ({ ...d, overridesSummary: true, summary: value }));
    } else {
      this.baseSummary.set(value);
    }
    this.markDirty();
  }

  onVariantDescriptionChange(value: string): void {
    if (this.hasVariantContext()) {
      this.overrideDraft.update(d => ({ ...d, overridesDescription: true, description: value }));
    } else {
      this.baseDescription.set(value);
    }
    this.markDirty();
  }

  revertVariantField(field: 'summary' | 'description'): void {
    this.overrideDraft.update(d => ({
      ...d,
      overridesSummary:     field === 'summary'     ? false : d.overridesSummary,
      summary:              field === 'summary'     ? ''    : d.summary,
      overridesDescription: field === 'description' ? false : d.overridesDescription,
      description:          field === 'description' ? ''    : d.description,
    }));
    this.markDirty();
  }

  // ── Toggle handlers ───────────────────────────────────────────────────────

  onPathSourceToggle(enabled: boolean): void {
    const ps = this.existingPathSet();
    if (!enabled && ps) {
      const pathCount = this.pathsForExistingSet().length;
      if (pathCount > 0) {
        const msg = `Remove Path Set?\n\n"${ps.name}" currently contains ${pathCount} Paths.\n\n`
          + `Removing this Path Set will remove the Path context and associated Variant data.`;
        if (!confirm(msg)) return;
      }

      this.store.deletePathSet(ps.id);
      this.pathSourceEnabled.set(false);
      this.pendingPathSource.set(null);
      return;
    }

    if (enabled && !ps) {
      this.pathSourceEnabled.set(true);
      const pending = emptyPendingPathSet();
      this.pendingPathSource.set(pending);
      this.pathSetName.set('');
      this.pathSetConvergenceId.set('');
      this.editablePaths.set(
        pending.paths.map(p => ({ id: '', pathSetId: '', ...p }))
      );
      // Show Paths tab
      this.activeTab.set('paths');
    }
  }

  async onVariantParticipationToggle(pathSetId: string, enabled: boolean): Promise<void> {
    if (enabled) {
      await this.store.saveVariantParticipation(this.event().id, pathSetId);
    } else {
      // Check for existing overrides under this PathSet before removing
      const pathIds = this.pathCtx.pathsForSet(pathSetId).map(p => p.id);
      const overridePaths = this.store.eventOverridePaths();
      const overrides = this.store.narrativeEventOverrides()
        .filter(o => o.narrativeEventId === this.event().id);
      const affectedOverrides = overrides.filter(o =>
        overridePaths.some(op => op.eventOverrideId === o.id && pathIds.includes(op.pathId))
      );

      if (affectedOverrides.length > 0) {
        const ps = this.store.pathSets().find(s => s.id === pathSetId);
        const msg = `Stop varying by "${ps?.name}"?\n\n`
          + `This Event contains Variant data on ${affectedOverrides.length} path(s).\n`
          + `Removing this Variant relationship will discard those changes.`;
        if (!confirm(msg)) return;
        for (const o of affectedOverrides) {
          await this.store.deleteEventOverride(o.id);
        }
      }

      await this.store.deleteVariantParticipation(this.event().id, pathSetId);
    }
  }

  // ── Paths tab editing ─────────────────────────────────────────────────────

  addPath(): void {
    const current = this.editablePaths();
    const nextOrder = current.length;
    const newPath = { id: '', pathSetId: '', tempId: `new_${Date.now()}`, name: '', sortOrder: nextOrder };
    this.editablePaths.set([...current, newPath]);
    this.markDirty();
  }

  updatePathName(idOrTempId: string, name: string): void {
    this.editablePaths.update(paths =>
      paths.map(p => (p.id === idOrTempId || p.tempId === idOrTempId) ? { ...p, name } : p)
    );
  }

  movePathUp(index: number): void {
    if (index === 0) return;
    const paths = [...this.editablePaths()];
    [paths[index - 1], paths[index]] = [paths[index], paths[index - 1]];
    this.editablePaths.set(paths.map((p, i) => ({ ...p, sortOrder: i })));
    this.markDirty();
  }

  movePathDown(index: number): void {
    const paths = [...this.editablePaths()];
    if (index >= paths.length - 1) return;
    [paths[index], paths[index + 1]] = [paths[index + 1], paths[index]];
    this.editablePaths.set(paths.map((p, i) => ({ ...p, sortOrder: i })));
    this.markDirty();
  }

  removePath(idOrTempId: string): void {
    this.editablePaths.update(paths =>
      paths
        .filter(p => p.id !== idOrTempId && p.tempId !== idOrTempId)
        .map((p, i) => ({ ...p, sortOrder: i }))
    );
    this.markDirty();
  }

  // ── Links tab ────────────────────────────────────────────────────────────

  readonly showAddActor  = signal(false);
  readonly showAddAsset  = signal(false);
  readonly newActorId    = signal('');
  readonly newAssetId    = signal('');

  // Path IDs for text/field override resolution (requires variant participation)
  private readonly activePathIdsForEditor = computed<ReadonlySet<string>>(() =>
    new Set(this.editingContextPaths().map(c => c.pathId))
  );

  // Path IDs for connection/thread/link resolution — use the raw canvas context,
  // not the participation-gated one, so path-specific connections show correctly.
  private readonly activePathIdsForDisplay = computed<ReadonlySet<string>>(() =>
    this.pathCtx.activePathIds()
  );

  readonly linkedThreads = computed(() => {
    const threadIds = new Set(
      this.store.effectiveThreadIdsForEvent()(this.event().id, this.activePathIdsForDisplay())
    );
    return this.store.narrativeThreads().filter(t => threadIds.has(t.id));
  });

  readonly effectiveLinks = computed(() =>
    this.store.effectiveEntityLinksForEvent()(this.event().id, this.activePathIdsForDisplay())
  );

  readonly characterLinks = computed(() =>
    this.effectiveLinks().filter(l => l.entityType === 'Character')
  );

  readonly assetLinks = computed(() =>
    this.effectiveLinks().filter(l => l.entityType === 'Asset')
  );

  readonly availableActors = computed(() => {
    const linked = new Set(this.characterLinks().map(l => l.entityId));
    return this.store.characters().filter(c => !linked.has(c.id));
  });

  readonly availableAssets = computed(() => {
    const linked = new Set(this.assetLinks().map(l => l.entityId));
    return this.store.assets().filter(a => !linked.has(a.id));
  });

  entityName(link: NarrativeEntityLink | EventOverrideEntityLink): string {
    const { entityType: t, entityId: id } = link;
    if (t === 'Character') return this.store.characters().find(c => c.id === id)?.name ?? id;
    if (t === 'Asset')     return this.store.assets().find(a => a.id === id)?.name ?? id;
    return id;
  }

  private async ensureEditorOverride(): Promise<string> {
    const existing = this.activeOverride();
    if (existing) return existing.id;
    const ctxPaths = this.editingContextPaths();
    const saved = await this.store.saveEventOverride({
      id: '', narrativeEventId: this.event().id,
      overridesSummary: false, overridesDescription: false,
      overridesConnections: false, overridesAssets: false,
    });
    for (const ctx of ctxPaths) {
      await this.store.saveEventOverridePath({ eventOverrideId: saved.id, pathId: ctx.pathId });
    }
    return saved.id;
  }

  async addActor(): Promise<void> {
    const entityId = this.newActorId();
    if (!entityId) return;

    if (this.hasVariantContext()) {
      const overrideId = await this.ensureEditorOverride();
      const override = this.activeOverride() ?? this.store.narrativeEventOverrides().find(o => o.id === overrideId)!;
      await this.store.saveEventOverride({ ...override, id: overrideId, overridesAssets: true });
      const link: EventOverrideEntityLink = {
        id: '', eventOverrideId: overrideId,
        entityType: 'Character', entityId, isPrimary: false, visibility: 'GMOnly',
      };
      await this.store.saveOverrideEntityLink(link);
    } else {
      const link: NarrativeEntityLink = {
        id: '', campaignId: '', ownerType: 'Event', ownerId: this.event().id,
        entityType: 'Character', entityId, isPrimary: false, visibility: 'GMOnly',
      };
      await this.store.saveEntityLink(link);
    }

    this.showAddActor.set(false);
    this.newActorId.set('');
  }

  async addAsset(): Promise<void> {
    const entityId = this.newAssetId();
    if (!entityId) return;

    if (this.hasVariantContext()) {
      const overrideId = await this.ensureEditorOverride();
      const override = this.activeOverride() ?? this.store.narrativeEventOverrides().find(o => o.id === overrideId)!;
      await this.store.saveEventOverride({ ...override, id: overrideId, overridesAssets: true });
      const link: EventOverrideEntityLink = {
        id: '', eventOverrideId: overrideId,
        entityType: 'Asset', entityId, isPrimary: false, visibility: 'GMOnly',
      };
      await this.store.saveOverrideEntityLink(link);
    } else {
      const link: NarrativeEntityLink = {
        id: '', campaignId: '', ownerType: 'Event', ownerId: this.event().id,
        entityType: 'Asset', entityId, isPrimary: false, visibility: 'GMOnly',
      };
      await this.store.saveEntityLink(link);
    }

    this.showAddAsset.set(false);
    this.newAssetId.set('');
  }

  async removeLink(id: string): Promise<void> {
    if (this.hasVariantContext()) {
      await this.store.deleteOverrideEntityLink(id);
    } else {
      await this.store.deleteEntityLink(id);
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async save(): Promise<void> {
    if (!this.canSave()) return;
    const ev = this.event();

    // 1. Save base event (invariant fields + base values when no variant context)
    const updated: NarrativeEvent = {
      ...ev,
      title:             this.baseTitle().trim(),
      status:            this.baseStatus() as NarrativeEventStatus,
      visibility:        this.baseVisibility() as NarrativeVisibility,
      narrativeFunction: this.baseNarrativeFunction().trim() || undefined,
      // Only write base summary/description when there is no variant context
      summary:     !this.hasVariantContext() ? (this.baseSummary().trim() || undefined) : ev.summary,
      description: !this.hasVariantContext() ? (this.baseDescription().trim() || undefined) : ev.description,
    };
    await this.store.saveNarrativeEvent(updated);

    // 2. If variant context, persist the override draft
    if (this.hasVariantContext()) {
      const draft    = this.overrideDraft();
      const existing = this.activeOverride();
      const ctxPaths = this.editingContextPaths();
      const hasTextOverride = draft.overridesSummary || draft.overridesDescription;
      const hasCollectionOverride = (existing?.overridesAssets ?? false) || (existing?.overridesConnections ?? false);
      const hasAnyOverride = hasTextOverride || hasCollectionOverride;

      if (hasAnyOverride) {
        const overridePayload: NarrativeEventOverride = {
          id:                   existing?.id ?? '',
          narrativeEventId:     ev.id,
          overridesSummary:     draft.overridesSummary,
          summary:              draft.overridesSummary ? (draft.summary || undefined) : undefined,
          overridesDescription: draft.overridesDescription,
          description:          draft.overridesDescription ? (draft.description || undefined) : undefined,
          overridesConnections: existing?.overridesConnections ?? false,
          overridesAssets:      existing?.overridesAssets ?? false,
        };

        const saved = await this.store.saveEventOverride(overridePayload);

        // Wire override to path context (only when newly created)
        if (!existing && saved && ctxPaths.length > 0) {
          for (const ctx of ctxPaths) {
            await this.store.saveEventOverridePath({ eventOverrideId: saved.id, pathId: ctx.pathId });
          }
        }
      } else if (existing) {
        // All text overrides cleared and no collection overrides — remove the override record
        await this.store.deleteEventOverride(existing.id);
      }
    }

    this.clearDirty();
    this.closed.emit();
  }

  async savePathsTab(): Promise<void> {
    if (!this.canSavePathsTab()) return;
    const ev = this.event();
    const existingPs = this.existingPathSet();
    const psData: PathSet = {
      id: existingPs?.id ?? '',
      campaignId: ev.campaignId,
      name: this.pathSetName().trim(),
      originEventId: ev.id,
      convergenceEventId: this.pathSetConvergenceId() || undefined,
    };

    const savedPs = await this.store.savePathSet(psData);

    // Sync paths: save each editable path
    const editPaths = this.editablePaths().filter(p => p.name.trim());
    for (const p of editPaths) {
      const pathData: NarrativePath = {
        id: p.id || '',
        pathSetId: savedPs.id,
        name: p.name.trim(),
        sortOrder: p.sortOrder,
      };
      await this.store.saveNarrativePath(pathData);
    }

    // Remove deleted existing paths
    if (existingPs) {
      const existingPathIds = this.pathsForExistingSet().map(p => p.id);
      const keptIds = new Set(editPaths.filter(p => p.id).map(p => p.id));
      for (const id of existingPathIds) {
        if (!keptIds.has(id)) {
          await this.store.deleteNarrativePath(id);
        }
      }
    }

    this.clearDirty();
    this.activeTab.set('event');
  }

  // ── Delete event ──────────────────────────────────────────────────────────

  async deleteEvent(): Promise<void> {
    if (!confirm(`Delete "${this.event().title}"? This cannot be undone.`)) return;
    await this.store.deleteNarrativeEvent(this.event().id);
    this.clearDirty();
    this.closed.emit();
  }

  // ── Close ─────────────────────────────────────────────────────────────────

  close(): void {
    if (this.isDirty()) {
      if (!confirm('Discard unsaved changes?')) return;
    }
    this.clearDirty();
    this.closed.emit();
  }

  onBackdropClick(): void {
    this.close();
  }
}
