import { Component, inject, OnInit, signal, viewChild } from '@angular/core';
import { AppStore } from '../../store/app.store';
import { NarrativeThreadsListComponent } from './narrative-threads-list.component';
import { NarrativeEventsCardsComponent } from './narrative-events-cards.component';
import { NarrativeFlowComponent } from './narrative-flow.component';
import { NarrativeEventEditorComponent } from './narrative-event-editor.component';
import {
  NarrativeEvent, NarrativeEventStatus,
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

  ngOnInit(): void {
    this.store.loadNarrative();
  }
}
