import { Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppStore } from '../../store/app.store';
import { ColonyState, RitualPosition, KnowledgePosition, ChangePosition, ValueVector, primaryValue, secondaryValue, sacrificedValue } from '../../core/models/types';
import { downloadCsv } from '../../core/utils/csv-export';
import { TernaryPlotComponent } from '../../shared/ternary-plot/ternary-plot.component';

@Component({
  selector: 'app-party',
  standalone: true,
  imports: [FormsModule, TernaryPlotComponent],
  templateUrl: './party.component.html',
  styleUrl: './party.component.scss'
})
export class PartyComponent {
  store = inject(AppStore);

  form = signal<ColonyState | null>(null);
  saved = signal(false);

  readonly ritualOptions: RitualPosition[] = ['Good', 'Neutral', 'Bad'];
  readonly knowledgeOptions: KnowledgePosition[] = ['Hidden', 'Controlled', 'Revealed'];
  readonly changeOptions: ChangePosition[] = ['Yes', 'No'];

  constructor() {
    effect(() => {
      const cs = this.store.colonyState();
      if (cs && !this.form()) {
        this.form.set({ ...cs });
      }
    });
  }

  updateValues(v: ValueVector): void {
    this.form.update(s => s ? { ...s, partyValues: v } : s);
  }

  exportCsv(): void {
    const f = this.form();
    if (!f) return;
    const header = [
      'Party Name', 'Act', 'Week', 'Colony Stress',
      'Ritual', 'Knowledge', 'Change',
      'Primary Value', 'Secondary Value', 'Sacrificed Value',
      'Truth', 'Stability', 'Agency',
      'Session Summary', 'Dominant Factions', 'Influence Notes', 'Major Consequences'
    ];
    const row = [
      f.partyName, f.act ?? '', f.week ?? '', f.colonyStress ?? '',
      f.partyRitual, f.partyKnowledge, f.partyChange,
      primaryValue(f.partyValues), secondaryValue(f.partyValues), sacrificedValue(f.partyValues),
      f.partyValues.truth.toFixed(3), f.partyValues.stability.toFixed(3), f.partyValues.agency.toFixed(3),
      f.sessionSummary ?? '', f.dominantFactions ?? '', f.influenceNotes ?? '', f.majorConsequences ?? ''
    ];
    downloadCsv([header, row], 'party.csv');
  }

  save(): void {
    const f = this.form();
    if (!f) return;
    this.store.saveColonyState(f);
    this.saved.set(true);
    setTimeout(() => {
      this.saved.set(false);
      this.store.loadRelationships(undefined);
    }, 1500);
  }
}
