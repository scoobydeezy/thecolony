import { Component, inject, OnInit, signal, viewChild } from '@angular/core';
import { AppStore } from '../../store/app.store';
import { NarrativeThreadsListComponent } from './narrative-threads-list.component';
import { NarrativeEventsCardsComponent } from './narrative-events-cards.component';
import { NarrativeFlowComponent } from './narrative-flow.component';
import { NarrativeEventEditorComponent } from './narrative-event-editor.component';
import {
  NarrativeEvent, NarrativeEventStatus, NarrativeThread,
  NarrativeEventConnection, NarrativeEntityLink,
  PathSet, NarrativePath, PathSetContext, NarrativeEventVariantParticipation,
  NarrativeEventOverride, EventOverridePath, EventOverrideConnection,
  NARRATIVE_EVENT_STATUS_OPTIONS,
} from '../../core/models/types';

type Tab = 'threads' | 'events' | 'flow';

@Component({
  selector: 'app-narrative-shell',
  standalone: true,
  imports: [
    NarrativeThreadsListComponent,
    NarrativeEventsCardsComponent,
    NarrativeFlowComponent,
    NarrativeEventEditorComponent,
  ],
  templateUrl: './narrative-shell.component.html',
  styleUrl: './narrative-shell.component.scss'
})
export class NarrativeShellComponent implements OnInit {
  store = inject(AppStore);
  tab = signal<Tab>('flow');

  cardsRef   = viewChild(NarrativeEventsCardsComponent);
  threadsRef = viewChild(NarrativeThreadsListComponent);

  // ── Events tab state ───────────────────────────────────────────────────────

  search        = signal('');
  filterStatus  = signal<NarrativeEventStatus | 'all'>('all');
  filterThread  = signal<string>('all');

  readonly statusOptions = NARRATIVE_EVENT_STATUS_OPTIONS;

  // ── Editor state ──────────────────────────────────────────────────────────

  editingEvent = signal<NarrativeEvent | null>(null);

  addThread(): void {
    this.threadsRef()?.openAdd();
  }

  addEvent(): void {
    const cards = this.cardsRef();
    if (cards) {
      cards.startAdding(new MouseEvent('click'));
    } else {
      this.requestAddAt(0);
    }
  }

  requestAddAt(insertIndex: number | null): void {
    const campaignId = this.store.narrativeEvents()[0]?.campaignId ?? '';
    const newEvent: NarrativeEvent = {
      id: '', campaignId,
      title: '', status: 'Planned', visibility: 'GMOnly', sortOrder: 0,
    };
    this.store.saveNarrativeEvent(newEvent).then(saved => {
      if (insertIndex !== null) {
        const events = this.store.narrativeEvents();
        const withoutNew = events.filter(e => e.id !== saved.id);
        const reordered = [
          ...withoutNew.slice(0, insertIndex),
          saved,
          ...withoutNew.slice(insertIndex),
        ];
        this.store.reorderNarrativeEvents(reordered.map(e => e.id));
      }
      this.editingEvent.set(saved);
    });
  }

  openEdit(ev: NarrativeEvent): void {
    this.editingEvent.set(ev);
  }

  exportJson(): void {
    const campaignId = this.store.activeCampaign()?.id ?? '';
    const payload = {
      exportVersion: 1,
      campaignId,
      threads:              this.store.narrativeThreads(),
      events:               this.store.narrativeEvents(),
      connections:          this.store.narrativeConnections(),
      entityLinks:          this.store.narrativeEntityLinks(),
      pathSets:             this.store.pathSets(),
      paths:                this.store.narrativePaths(),
      pathSetContexts:      this.store.pathSetContexts(),
      variantParticipations: this.store.variantParticipations(),
      eventOverrides:       this.store.narrativeEventOverrides(),
      eventOverridePaths:   this.store.eventOverridePaths(),
      eventOverrideConnections: this.store.eventOverrideConnections(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `narrative-${campaignId}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importJson(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      let payload: any;
      try {
        payload = JSON.parse(reader.result as string);
      } catch (e) {
        alert('Failed to parse import file — not valid JSON.');
        (event.target as HTMLInputElement).value = '';
        return;
      }

      if (payload.exportVersion !== 1) {
        alert('Unrecognized export format.');
        (event.target as HTMLInputElement).value = '';
        return;
      }

      try {
        const campaignId = this.store.activeCampaign()!.id;

        // IDs present in the import file — anything live but NOT in these sets gets deleted.
        const fileIds = {
          threads:   new Set((payload.threads              ?? []).map((x: any) => x.id)),
          events:    new Set((payload.events               ?? []).map((x: any) => x.id)),
          conns:     new Set((payload.connections          ?? []).map((x: any) => x.id)),
          links:     new Set((payload.entityLinks          ?? []).map((x: any) => x.id)),
          pathSets:  new Set((payload.pathSets             ?? []).map((x: any) => x.id)),
          paths:     new Set((payload.paths                ?? []).map((x: any) => x.id)),
          overrides: new Set((payload.eventOverrides       ?? []).map((x: any) => x.id)),
          overConns: new Set((payload.eventOverrideConnections ?? []).map((x: any) => x.id)),
        };

        // ── Delete phase (leaves → roots to respect FK constraints) ─────────

        for (const oc of this.store.eventOverrideConnections())
          if (!fileIds.overConns.has(oc.id)) await this.store.deleteOverrideConnection(oc.id);

        for (const op of this.store.eventOverridePaths()) {
          const stillNeeded = (payload.eventOverridePaths ?? []).some(
            (x: any) => x.eventOverrideId === op.eventOverrideId && x.pathId === op.pathId
          );
          if (!stillNeeded) await this.store.deleteEventOverridePath(op.eventOverrideId, op.pathId);
        }

        for (const o of this.store.narrativeEventOverrides())
          if (!fileIds.overrides.has(o.id)) await this.store.deleteEventOverride(o.id);

        for (const vp of this.store.variantParticipations()) {
          const stillNeeded = (payload.variantParticipations ?? []).some(
            (x: any) => x.narrativeEventId === vp.narrativeEventId && x.pathSetId === vp.pathSetId
          );
          if (!stillNeeded) await this.store.deleteVariantParticipation(vp.narrativeEventId, vp.pathSetId);
        }

        for (const c of this.store.narrativeConnections())
          if (!fileIds.conns.has(c.id)) await this.store.deleteConnection(c.id);

        for (const l of this.store.narrativeEntityLinks())
          if (!fileIds.links.has(l.id)) await this.store.deleteEntityLink(l.id);

        for (const p of this.store.narrativePaths())
          if (!fileIds.paths.has(p.id)) await this.store.deleteNarrativePath(p.id);

        for (const ctx of this.store.pathSetContexts()) {
          const stillNeeded = (payload.pathSetContexts ?? []).some(
            (x: any) => x.pathSetId === ctx.pathSetId && x.requiredPathId === ctx.requiredPathId
          );
          if (!stillNeeded) await this.store.deletePathSetContext(ctx.pathSetId, ctx.requiredPathId);
        }

        for (const ps of this.store.pathSets())
          if (!fileIds.pathSets.has(ps.id)) await this.store.deletePathSet(ps.id);

        for (const e of this.store.narrativeEvents())
          if (!fileIds.events.has(e.id)) await this.store.deleteNarrativeEvent(e.id);

        for (const t of this.store.narrativeThreads())
          if (!fileIds.threads.has(t.id)) await this.store.deleteThread(t.id);

        // Live IDs still in the store after deletions — records whose IDs match are updated (PUT),
        // others are treated as new (POST) and the server assigns a fresh GUID.
        const liveIds = {
          threads:   new Set(this.store.narrativeThreads().map(x => x.id)),
          events:    new Set(this.store.narrativeEvents().map(x => x.id)),
          conns:     new Set(this.store.narrativeConnections().map(x => x.id)),
          links:     new Set(this.store.narrativeEntityLinks().map(x => x.id)),
          pathSets:  new Set(this.store.pathSets().map(x => x.id)),
          paths:     new Set(this.store.narrativePaths().map(x => x.id)),
          overrides: new Set(this.store.narrativeEventOverrides().map(x => x.id)),
          overConns: new Set(this.store.eventOverrideConnections().map(x => x.id)),
        };

        // ID remap tables: old file ID → new server-assigned ID.
        // Only populated for records that were POSTed (new records).
        const idMap = {
          threads:  new Map<string, string>(),
          events:   new Map<string, string>(),
          pathSets: new Map<string, string>(),
          paths:    new Map<string, string>(),
          overrides:new Map<string, string>(),
        };

        // Remaps an ID through a map, falling back to the original if not remapped.
        const remap = (map: Map<string, string>, id: string) => map.get(id) ?? id;

        // Strips JSON null values from optional string fields so they don't
        // fail server-side non-nullable validation.
        const clean = <T extends object>(obj: T): T => {
          const result = { ...obj } as Record<string, unknown>;
          for (const key of Object.keys(result)) {
            if (result[key] === null) result[key] = undefined;
          }
          return result as T;
        };

        // ── 1. Threads ──────────────────────────────────────────────────────
        for (const t of (payload.threads ?? []) as NarrativeThread[]) {
          const isLive = liveIds.threads.has(t.id);
          const saved = await this.store.saveThread(
            clean({ ...t, campaignId, id: isLive ? t.id : '' })
          );
          if (!isLive) idMap.threads.set(t.id, saved.id);
        }

        // ── 2. Events ───────────────────────────────────────────────────────
        for (const e of (payload.events ?? []) as NarrativeEvent[]) {
          const isLive = liveIds.events.has(e.id);
          const saved = await this.store.saveNarrativeEvent(
            clean({ ...e, campaignId, id: isLive ? e.id : '' })
          );
          if (!isLive) idMap.events.set(e.id, saved.id);
        }

        // ── 3. Connections (base) ────────────────────────────────────────────
        for (const c of (payload.connections ?? []) as NarrativeEventConnection[]) {
          const isLive = liveIds.conns.has(c.id);
          await this.store.saveConnection(clean({
            ...c,
            campaignId,
            id: isLive ? c.id : '',
            threadId: remap(idMap.threads, c.threadId),
            sourceNarrativeEventId: remap(idMap.events, c.sourceNarrativeEventId),
            targetNarrativeEventId: remap(idMap.events, c.targetNarrativeEventId),
          }));
        }

        // ── 4. Entity links ──────────────────────────────────────────────────
        for (const l of (payload.entityLinks ?? []) as NarrativeEntityLink[]) {
          if (l.ownerType !== 'Event') continue;
          const isLive = liveIds.links.has(l.id);
          await this.store.saveEntityLink(clean({
            ...l,
            campaignId,
            id: isLive ? l.id : '',
            ownerId: remap(idMap.events, l.ownerId),
          }));
        }

        // ── 5. Path sets ─────────────────────────────────────────────────────
        for (const ps of (payload.pathSets ?? []) as PathSet[]) {
          const isLive = liveIds.pathSets.has(ps.id);
          const saved = await this.store.savePathSet(clean({
            ...ps,
            campaignId,
            id: isLive ? ps.id : '',
            originEventId:      ps.originEventId      ? remap(idMap.events, ps.originEventId)      : undefined,
            convergenceEventId: ps.convergenceEventId ? remap(idMap.events, ps.convergenceEventId) : undefined,
          }));
          if (!isLive) idMap.pathSets.set(ps.id, saved.id);
        }

        // ── 6. Paths ─────────────────────────────────────────────────────────
        for (const p of (payload.paths ?? []) as NarrativePath[]) {
          const isLive = liveIds.paths.has(p.id);
          const saved = await this.store.saveNarrativePath(clean({
            ...p,
            id: isLive ? p.id : '',
            pathSetId: remap(idMap.pathSets, p.pathSetId),
          }));
          if (!isLive) idMap.paths.set(p.id, saved.id);
        }

        // ── 7. Path set contexts (nested path-set dependencies) ──────────────
        for (const ctx of (payload.pathSetContexts ?? []) as PathSetContext[]) {
          await this.store.savePathSetContext({
            pathSetId:      remap(idMap.pathSets, ctx.pathSetId),
            requiredPathId: remap(idMap.paths,    ctx.requiredPathId),
          });
        }

        // ── 8. Variant participations ────────────────────────────────────────
        for (const vp of (payload.variantParticipations ?? []) as NarrativeEventVariantParticipation[]) {
          await this.store.saveVariantParticipation(
            remap(idMap.events,    vp.narrativeEventId),
            remap(idMap.pathSets,  vp.pathSetId),
          );
        }

        // ── 9. Event overrides ────────────────────────────────────────────────
        for (const o of (payload.eventOverrides ?? []) as NarrativeEventOverride[]) {
          const isLive = liveIds.overrides.has(o.id);
          const saved = await this.store.saveEventOverride(clean({
            ...o,
            id: isLive ? o.id : '',
            narrativeEventId: remap(idMap.events, o.narrativeEventId),
          }));
          if (!isLive) idMap.overrides.set(o.id, saved.id);
        }

        // ── 10. Event override paths ──────────────────────────────────────────
        for (const op of (payload.eventOverridePaths ?? []) as EventOverridePath[]) {
          await this.store.saveEventOverridePath({
            eventOverrideId: remap(idMap.overrides, op.eventOverrideId),
            pathId:          remap(idMap.paths,     op.pathId),
          });
        }

        // ── 11. Event override connections ────────────────────────────────────
        for (const oc of (payload.eventOverrideConnections ?? []) as EventOverrideConnection[]) {
          const isLive = liveIds.overConns.has(oc.id);
          await this.store.saveOverrideConnection(clean({
            ...oc,
            id: isLive ? oc.id : '',
            eventOverrideId:         remap(idMap.overrides, oc.eventOverrideId),
            targetNarrativeEventId:  remap(idMap.events,    oc.targetNarrativeEventId),
            threadId:                remap(idMap.threads,   oc.threadId),
          }));
        }

      } catch (e) {
        alert('Import failed. Check the browser console for details.');
        console.error('Import error:', e);
      }
      (event.target as HTMLInputElement).value = '';
    };
    reader.readAsText(file);
  }

  ngOnInit(): void {
    this.store.loadNarrative();
  }
}
