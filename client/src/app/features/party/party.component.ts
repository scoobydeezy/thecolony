import { Component, inject, signal, effect, computed } from '@angular/core';
import { AppStore } from '../../store/app.store';
import { ColonyState, BeliefPosition, ValueVector, primaryValue, secondaryValue, sacrificedValue, beliefAxisOptions, beliefPositionLabel } from '../../core/models/types';
import { FormField, form } from '@angular/forms/signals';
import { downloadCsv } from '../../core/utils/csv-export';
import { TernaryPlotComponent } from '../../shared/ternary-plot/ternary-plot.component';

interface PartyFormModel {
  partyName: string;
  partyBeliefc: string;
  partyBeliefa: string;
  partyBeliefb: string;
}

const toFormModel = (cs: ColonyState): PartyFormModel => ({
  partyName:    cs.partyName,
  partyBeliefc: cs.partyBeliefc,
  partyBeliefa: cs.partyBeliefa,
  partyBeliefb: cs.partyBeliefb,
});

@Component({
  selector: 'app-party',
  standalone: true,
  imports: [FormField, TernaryPlotComponent],
  templateUrl: './party.component.html',
  styleUrl: './party.component.scss'
})
export class PartyComponent {
  store = inject(AppStore);

  readonly editForm = signal<PartyFormModel>({
    partyName: '', partyBeliefc: '', partyBeliefa: '', partyBeliefb: ''
  });
  readonly editValues = signal<ValueVector>({ a: 1/3, b: 1/3, c: 1/3 });
  readonly f = form(this.editForm);

  saved = signal(false);

  readonly beliefcOptions = computed(() => beliefAxisOptions(this.store.beliefAxisLabels().c));
  readonly beliefaOptions = computed(() => beliefAxisOptions(this.store.beliefAxisLabels().a));
  readonly beliefbOptions = computed(() => beliefAxisOptions(this.store.beliefAxisLabels().b));

  beliefLabel(axis: 'a' | 'b' | 'c', pos: BeliefPosition): string {
    return beliefPositionLabel(pos, this.store.beliefAxisLabels()[axis]);
  }

  axisName(axis: 'a' | 'b' | 'c'): string {
    return this.store.beliefAxisLabels()[axis].axisName;
  }

  constructor() {
    effect(() => {
      const cs = this.store.colonyState();
      if (cs) {
        this.editForm.set(toFormModel(cs));
        this.editValues.set({ ...cs.partyValues });
      }
    });
  }

  updateValues(v: ValueVector): void {
    this.editValues.set(v);
  }

  exportCsv(): void {
    const cs = this.store.colonyState();
    if (!cs) return;
    const f = this.editForm();
    const v = this.editValues();
    const header = [
      'Party Name', 'Act', 'Week', 'Colony Stress',
      'BeliefC', 'BeliefA', 'BeliefB',
      'Primary Value', 'Secondary Value', 'Sacrificed Value',
      'ValueA', 'ValueB', 'ValueC',
      'Session Summary', 'Dominant Factions', 'Influence Notes', 'Major Consequences'
    ];
    const row = [
      f.partyName, cs.act ?? '', cs.week ?? '', cs.colonyStress ?? '',
      f.partyBeliefc, f.partyBeliefa, f.partyBeliefb,
      primaryValue(v), secondaryValue(v), sacrificedValue(v),
      v.a.toFixed(3), v.b.toFixed(3), v.c.toFixed(3),
      cs.sessionSummary ?? '', cs.dominantFactions ?? '', cs.influenceNotes ?? '', cs.majorConsequences ?? ''
    ];
    downloadCsv([header, row], 'party.csv');
  }

  save(): void {
    const cs = this.store.colonyState();
    if (!cs) return;
    const f = this.editForm();
    this.store.saveColonyState({
      ...cs,
      partyName:    f.partyName,
      partyBeliefc: f.partyBeliefc as BeliefPosition,
      partyBeliefa: f.partyBeliefa as BeliefPosition,
      partyBeliefb: f.partyBeliefb as BeliefPosition,
      partyValues:  this.editValues(),
    });
    this.saved.set(true);
    setTimeout(() => {
      this.saved.set(false);
      this.store.loadRelationships(undefined);
    }, 1500);
  }
}
