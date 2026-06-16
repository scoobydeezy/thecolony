import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppStore } from '../../store/app.store';
import { SessionLogEntry } from '../../core/models/types';

const emptyEntry = (): SessionLogEntry => ({
  id: '',
  date: new Date().toISOString().split('T')[0],
  act: 1,
  week: 1,
  summary: '',
  partyActions: '',
  factionChanges: '',
  colonyStressChange: 0,
  relationshipBumps: '',
  futureConsequences: ''
});

@Component({
  selector: 'app-session-log',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './session-log.component.html',
  styleUrl: './session-log.component.scss'
})
export class SessionLogComponent {
  store = inject(AppStore);

  showModal = signal(false);
  editingEntry = signal<SessionLogEntry>(emptyEntry());

  openAdd(): void {
    const cs = this.store.colonyState();
    const entry = emptyEntry();
    if (cs) {
      entry.act = cs.act;
      entry.week = cs.week;
    }
    this.editingEntry.set(entry);
    this.showModal.set(true);
  }

  openEdit(entry: SessionLogEntry): void {
    this.editingEntry.set({ ...entry });
    this.showModal.set(true);
  }

  close(): void {
    this.showModal.set(false);
  }

  save(): void {
    this.store.saveSessionEntry(this.editingEntry());
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
