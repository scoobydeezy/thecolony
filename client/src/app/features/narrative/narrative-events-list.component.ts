import { Component, inject, signal, computed } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { AppStore } from '../../store/app.store';
import {
  NarrativeEvent, NarrativeEventStatus,
  NARRATIVE_EVENT_STATUS_OPTIONS, NARRATIVE_VISIBILITY_OPTIONS,
} from '../../core/models/types';
import { NarrativeEventDetailComponent } from './narrative-event-detail.component';

interface EventFormModel {
  id: string;
  campaignId: string;
  title: string;
  summary: string;
  description: string;
  narrativeFunction: string;
  status: string;
  visibility: string;
}

const emptyEventForm = (): EventFormModel => ({
  id: '', campaignId: '',
  title: '', summary: '', description: '', narrativeFunction: '',
  status: 'Planned', visibility: 'GMOnly',
});

@Component({
  selector: 'app-narrative-events-list',
  standalone: true,
  imports: [NarrativeEventDetailComponent, FormField],
  templateUrl: './narrative-events-list.component.html',
  styleUrl: './narrative-events-list.component.scss',
})
export class NarrativeEventsListComponent {
  store = inject(AppStore);

  readonly statusOptions     = NARRATIVE_EVENT_STATUS_OPTIONS;
  readonly visibilityOptions = NARRATIVE_VISIBILITY_OPTIONS;

  // ── Filters ───────────────────────────────────────────────────────────────

  search       = signal('');
  filterStatus = signal<NarrativeEventStatus | 'all'>('all');
  filterThread = signal<string>('all');

  // ── Selection ─────────────────────────────────────────────────────────────

  selectedId = signal<string | null>(null);

  selectedEvent = computed(() => {
    const id = this.selectedId();
    return id ? this.store.narrativeEvents().find(e => e.id === id) ?? null : null;
  });

  // ── Filtered list ─────────────────────────────────────────────────────────

  filteredEvents = computed(() => {
    const q  = this.search().toLowerCase();
    const st = this.filterStatus();
    const th = this.filterThread();
    return this.store.narrativeEvents().filter(ev => {
      if (q  && !ev.title.toLowerCase().includes(q)) return false;
      if (st !== 'all' && ev.status !== st) return false;
      if (th !== 'all') {
        const threadIds = this.store.narrativeConnections()
          .filter(c => c.sourceNarrativeEventId === ev.id || c.targetNarrativeEventId === ev.id)
          .map(c => c.threadId);
        if (!threadIds.includes(th)) return false;
      }
      return true;
    });
  });

  // ── Form ──────────────────────────────────────────────────────────────────

  showModal = signal(false);

  readonly editModel = signal<EventFormModel>(emptyEventForm());
  readonly f = form(this.editModel, schema => {
    required(schema.title, { message: 'Title is required' });
  });

  openAdd(): void {
    this.editModel.set(emptyEventForm());
    this.showModal.set(true);
  }

  openEdit(ev: NarrativeEvent): void {
    this.editModel.set({
      id:                   ev.id,
      campaignId:           ev.campaignId,
      title:                ev.title,
      summary:           ev.summary ?? '',
      description:       ev.description ?? '',
      narrativeFunction: ev.narrativeFunction ?? '',
      status:            ev.status,
      visibility:        ev.visibility,
    });
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); }

  async save(): Promise<void> {
    if (this.f().invalid()) return;
    const m = this.editModel();
    const existing = m.id ? this.store.narrativeEvents().find(e => e.id === m.id) : undefined;
    const ev: NarrativeEvent = {
      id:        m.id,
      campaignId: m.campaignId,
      title:     m.title.trim(),
      summary:           m.summary.trim() || undefined,
      description:       m.description.trim() || undefined,
      narrativeFunction: m.narrativeFunction.trim() || undefined,
      status:            m.status as NarrativeEventStatus,
      visibility:           m.visibility as any,
      sortOrder:            existing?.sortOrder ?? 0,
    };
    await this.store.saveNarrativeEvent(ev);
    this.showModal.set(false);
  }

  async delete(id: string): Promise<void> {
    if (!confirm('Delete this narrative event?')) return;
    await this.store.deleteNarrativeEvent(id);
    if (this.selectedId() === id) this.selectedId.set(null);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  select(id: string): void {
    this.selectedId.set(this.selectedId() === id ? null : id);
  }

  pathName(pathId: string | undefined): string {
    if (!pathId) return 'Shared';
    return this.store.narrativePaths().find(p => p.id === pathId)?.name ?? pathId;
  }

  statusClass(status: NarrativeEventStatus): string {
    const map: Record<NarrativeEventStatus, string> = {
      Planned: 'status-planned', Available: 'status-available', Occurred: 'status-occurred',
      Bypassed: 'status-bypassed', Obsolete: 'status-obsolete',
    };
    return map[status];
  }
}
