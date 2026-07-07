import { Component, inject, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { AppStore } from '../../store/app.store';
import { SessionLogEntry } from '../../core/models/types';

interface SessionLogFormModel {
  id: string;
  date: string;
  act: string;
  week: string;
  summary: string;
  partyActions: string;
  factionChanges: string;
  colonyStressChange: string;
  relationshipBumps: string;
  futureConsequences: string;
}

const emptyForm = (act = 1, week = 1): SessionLogFormModel => ({
  id: '',
  date: new Date().toISOString().split('T')[0],
  act: act.toString(),
  week: week.toString(),
  summary: '',
  partyActions: '',
  factionChanges: '',
  colonyStressChange: '0',
  relationshipBumps: '',
  futureConsequences: '',
});

const toFormModel = (e: SessionLogEntry): SessionLogFormModel => ({
  id: e.id,
  date: e.date,
  act: e.act.toString(),
  week: e.week.toString(),
  summary: e.summary ?? '',
  partyActions: e.partyActions ?? '',
  factionChanges: e.factionChanges ?? '',
  colonyStressChange: e.colonyStressChange.toString(),
  relationshipBumps: e.relationshipBumps ?? '',
  futureConsequences: e.futureConsequences ?? '',
});

const fromFormModel = (fm: SessionLogFormModel): SessionLogEntry => ({
  id: fm.id,
  date: fm.date,
  act: parseInt(fm.act, 10) || 1,
  week: parseInt(fm.week, 10) || 1,
  summary: fm.summary,
  partyActions: fm.partyActions,
  factionChanges: fm.factionChanges,
  colonyStressChange: parseInt(fm.colonyStressChange, 10) || 0,
  relationshipBumps: fm.relationshipBumps,
  futureConsequences: fm.futureConsequences,
});

@Component({
  selector: 'app-session-log',
  standalone: true,
  imports: [FormField],
  templateUrl: './session-log.component.html',
  styleUrl: './session-log.component.scss'
})
export class SessionLogComponent {
  store = inject(AppStore);

  showModal = signal(false);
  readonly editingEntry = signal<SessionLogFormModel>(emptyForm());
  readonly f = form(this.editingEntry);

  openAdd(): void {
    const cs = this.store.colonyState();
    this.editingEntry.set(emptyForm(cs?.act ?? 1, cs?.week ?? 1));
    this.showModal.set(true);
  }

  openEdit(entry: SessionLogEntry): void {
    this.editingEntry.set(toFormModel(entry));
    this.showModal.set(true);
  }

  close(): void {
    this.showModal.set(false);
  }

  save(): void {
    this.store.saveSessionEntry(fromFormModel(this.editingEntry()));
    this.showModal.set(false);
  }

  delete(id: string): void {
    if (confirm('Delete this session entry?')) {
      this.store.deleteSessionEntry(id);
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }
}
