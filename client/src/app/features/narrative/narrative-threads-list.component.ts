import { Component, inject, signal, computed } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { AppStore } from '../../store/app.store';
import {
  NarrativeThread, NarrativeThreadState,
  NARRATIVE_THREAD_STATE_OPTIONS,
} from '../../core/models/types';
import { NarrativeThreadSummaryService } from './services/narrative-thread-summary.service';

interface ThreadFormModel {
  id: string;
  campaignId: string;
  title: string;
  summary: string;
  state: string;
}

const emptyThreadForm = (): ThreadFormModel => ({
  id: '', campaignId: '',
  title: '', summary: '',
  state: 'Open',
});

@Component({
  selector: 'app-narrative-threads-list',
  standalone: true,
  imports: [FormField],
  templateUrl: './narrative-threads-list.component.html',
  styleUrl: './narrative-threads-list.component.scss',
})
export class NarrativeThreadsListComponent {
  store      = inject(AppStore);
  summaryService = inject(NarrativeThreadSummaryService);

  readonly stateOptions = NARRATIVE_THREAD_STATE_OPTIONS;

  // ── Filters ───────────────────────────────────────────────────────────────

  search      = signal('');
  filterState = signal<NarrativeThreadState | 'all'>('all');

  // ── Expanded accordion state ──────────────────────────────────────────────

  expandedSections = signal<Map<string, Set<'events' | 'characters' | 'assets'>>>(new Map());

  isSectionOpen(threadId: string, section: 'events' | 'characters' | 'assets'): boolean {
    return this.expandedSections().get(threadId)?.has(section) ?? false;
  }

  toggleSection(threadId: string, section: 'events' | 'characters' | 'assets'): void {
    this.expandedSections.update(map => {
      const next = new Map(map);
      const set  = new Set(next.get(threadId) ?? []);
      set.has(section) ? set.delete(section) : set.add(section);
      next.set(threadId, set as Set<'events' | 'characters' | 'assets'>);
      return next;
    });
  }

  // ── Filtered list ─────────────────────────────────────────────────────────

  filteredThreads = computed(() => {
    const q  = this.search().toLowerCase();
    const st = this.filterState();
    return this.store.narrativeThreads().filter(t => {
      if (q  && !t.title.toLowerCase().includes(q) && !(t.summary?.toLowerCase().includes(q))) return false;
      if (st !== 'all' && t.state !== st) return false;
      return true;
    });
  });

  // ── Resolved names for summary data ──────────────────────────────────────

  eventTitle(id: string): string {
    return this.store.narrativeEvents().find(e => e.id === id)?.title ?? id;
  }

  characterName(id: string): string {
    return this.store.characters().find(c => c.id === id)?.name ?? id;
  }

  assetName(id: string): string {
    return this.store.assets().find(a => a.id === id)?.name ?? id;
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  showModal = signal(false);

  readonly editModel = signal<ThreadFormModel>(emptyThreadForm());
  readonly f = form(this.editModel, schema => {
    required(schema.title, { message: 'Title is required' });
  });

  openAdd(): void {
    this.editModel.set(emptyThreadForm());
    this.showModal.set(true);
  }

  openEdit(t: NarrativeThread): void {
    this.editModel.set({
      id:        t.id,
      campaignId: t.campaignId,
      title:     t.title,
      summary:   t.summary ?? '',
      state:     t.state,
    });
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); }

  async save(): Promise<void> {
    if (this.f().invalid()) return;
    const m = this.editModel();
    const thread: NarrativeThread = {
      id:        m.id,
      campaignId: m.campaignId,
      title:     m.title.trim(),
      summary:   m.summary.trim() || undefined,
      state:     m.state as NarrativeThreadState,
    };
    await this.store.saveThread(thread);
    this.showModal.set(false);
  }

  async delete(id: string): Promise<void> {
    if (!confirm('Delete this thread?')) return;
    await this.store.deleteThread(id);
  }
}
