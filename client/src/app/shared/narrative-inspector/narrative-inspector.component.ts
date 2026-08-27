import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { AppStore } from '../../store/app.store';
import {
  NarrativeThread, NarrativeEvent, NarrativeEntityLink, NarrativeEntityLinkType,
  NarrativeThreadState,
  NARRATIVE_THREAD_STATE_OPTIONS,
} from '../../core/models/types';
import { NarrativeThreadSummaryService } from '../../features/narrative/services/narrative-thread-summary.service';

type QuickAddMode = 'thread' | 'event' | null;

@Component({
  selector: 'app-narrative-inspector',
  standalone: true,
  imports: [],
  templateUrl: './narrative-inspector.component.html',
  styleUrl: './narrative-inspector.component.scss',
})
export class NarrativeInspectorComponent {
  store      = inject(AppStore);
  router     = inject(Router);
  threadSummary = inject(NarrativeThreadSummaryService);

  readonly stateOptions = NARRATIVE_THREAD_STATE_OPTIONS;

  // ── Focused entity context ────────────────────────────────────────────────

  focus = computed(() => this.store.narrativeFocusEntity());

  threads = computed(() => {
    const f = this.focus();
    if (!f) return this.store.narrativeThreads();

    const summaries = this.threadSummary.summaries();

    if (f.type === 'Character') {
      return this.store.narrativeThreads().filter(t =>
        summaries.get(t.id)?.characterIds.includes(f.id)
      );
    }
    if (f.type === 'Asset') {
      return this.store.narrativeThreads().filter(t =>
        summaries.get(t.id)?.assetIds.includes(f.id)
      );
    }

    // Fallback for Faction / Location / Session: direct thread entity-link lookup
    const linkedOwnerIds = new Set(
      this.store.narrativeEntityLinks()
        .filter(l => l.ownerType === 'Thread' && l.entityType === f.type && l.entityId === f.id)
        .map(l => l.ownerId)
    );
    return this.store.narrativeThreads().filter(t => linkedOwnerIds.has(t.id));
  });

  events = computed(() => {
    const f = this.focus();
    if (!f) return this.store.narrativeEvents();
    const linkedOwnerIds = new Set(
      this.store.narrativeEntityLinks()
        .filter(l => l.ownerType === 'Event' && l.entityType === f.type && l.entityId === f.id)
        .map(l => l.ownerId)
    );
    return this.store.narrativeEvents().filter(e => linkedOwnerIds.has(e.id));
  });

  // ── Expand / collapse thread rows ─────────────────────────────────────────

  expandedThreadIds = signal<Set<string>>(new Set());
  expandedEventIds  = signal<Set<string>>(new Set());

  toggleThread(id: string): void {
    this.expandedThreadIds.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  toggleEvent(id: string): void {
    this.expandedEventIds.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  isThreadExpanded(id: string): boolean { return this.expandedThreadIds().has(id); }
  isEventExpanded(id: string):  boolean { return this.expandedEventIds().has(id); }

  // ── Connected entities for a thread ──────────────────────────────────────

  threadLinks(threadId: string): NarrativeEntityLink[] {
    return this.store.narrativeEntityLinks().filter(l => l.ownerType === 'Thread' && l.ownerId === threadId);
  }

  eventLinks(eventId: string): NarrativeEntityLink[] {
    return this.store.narrativeEntityLinks().filter(l => l.ownerType === 'Event' && l.ownerId === eventId);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  navigateToEntity(link: NarrativeEntityLink): void {
    const { entityType: t, entityId: id } = link;
    const routes: Partial<Record<NarrativeEntityLinkType, string>> = {
      Faction: `/factions/${id}`,
      Character: `/characters/${id}`,
      Asset: '/assets',
      Location: '/locations',
      Session: '/sessions',
    };
    const route = routes[t];
    if (route) {
      if (t === 'Faction' || t === 'Character') {
        this.store.setNarrativeFocus({ type: t, id, name: this.entityName(link) });
      }
      this.router.navigateByUrl(route);
    }
  }

  navigateToNarrative(): void {
    this.router.navigate(['/narrative']);
  }

  // ── Quick-add ─────────────────────────────────────────────────────────────

  quickAddMode = signal<QuickAddMode>(null);
  newTitle     = signal('');
  newState     = signal<NarrativeThreadState>('Open');

  openQuickAdd(mode: QuickAddMode): void {
    this.newTitle.set('');
    this.newState.set('Open');
    this.quickAddMode.set(mode);
  }

  async confirmQuickAdd(): Promise<void> {
    const title = this.newTitle().trim();
    if (!title) return;
    const focus = this.focus();

    if (this.quickAddMode() === 'thread') {
      const thread: NarrativeThread = {
        id: '', campaignId: '', title,
        state: this.newState(),
      };
      const saved = await this.store.saveThread(thread);
      if (focus && saved) {
        await this.store.saveEntityLink({
          id: '', campaignId: '', ownerType: 'Thread', ownerId: saved.id,
          entityType: focus.type, entityId: focus.id, isPrimary: false, visibility: 'GMOnly',
        });
      }
    } else {
      const ev: NarrativeEvent = {
        id: '', campaignId: '', title,
        status: 'Planned', visibility: 'GMOnly',
        sortOrder: 0,
      };
      const saved = await this.store.saveNarrativeEvent(ev);
      if (focus && saved) {
        await this.store.saveEntityLink({
          id: '', campaignId: '', ownerType: 'Event', ownerId: saved.id,
          entityType: focus.type, entityId: focus.id, isPrimary: false, visibility: 'GMOnly',
        });
      }
    }
    this.quickAddMode.set(null);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  entityName(link: NarrativeEntityLink): string {
    const { entityType: t, entityId: id } = link;
    if (t === 'Faction')   return this.store.factions().find(f => f.id === id)?.name ?? id;
    if (t === 'Character') return this.store.characters().find(c => c.id === id)?.name ?? id;
    if (t === 'Asset')     return this.store.assets().find(a => a.id === id)?.name ?? id;
    if (t === 'Location')  return this.store.locations().find(l => l.id === id)?.name ?? id;
    if (t === 'Session') {
      const s = this.store.sessions().find(s => s.id === id);
      return s ? `Session ${s.number}` : id;
    }
    return id;
  }

  stateClass(state: NarrativeThreadState): string {
    return state === 'Resolved' ? 'state-resolved' : 'state-open';
  }

  close(): void {
    this.store.toggleNarrativeInspector();
  }

  clearFocus(): void {
    this.store.setNarrativeFocus(null);
  }
}
