import { Component, inject, signal, effect, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppStore } from '../../store/app.store';
import { ColonyState, BeliefPosition, ValueVector, primaryValue, secondaryValue, sacrificedValue, beliefAxisOptions, beliefPositionLabel, deriveBeliefs, beliefConflicts as computeBeliefConflicts } from '../../core/models/types';
import { FormField, form } from '@angular/forms/signals';
import { downloadCsv } from '../../core/utils/csv-export';
import { TernaryPlotComponent } from '../../shared/ternary-plot/ternary-plot.component';

interface PartyFormModel {
  partyName: string;
  partyBeliefc: string;
  partyBeliefa: string;
  partyBeliefb: string;
}

// '' means "use derived" — set to '' when stored belief matches derived to avoid showing spurious overrides
const toFormModel = (cs: ColonyState): PartyFormModel => {
  const derived = deriveBeliefs(cs.partyValues);
  return {
    partyName:    cs.partyName,
    partyBeliefc: cs.partyBeliefc === derived.beliefc ? '' : cs.partyBeliefc,
    partyBeliefa: cs.partyBeliefa === derived.beliefa ? '' : cs.partyBeliefa,
    partyBeliefb: cs.partyBeliefb === derived.beliefb ? '' : cs.partyBeliefb,
  };
};

@Component({
  selector: 'app-party',
  standalone: true,
  imports: [FormField, TernaryPlotComponent, RouterLink],
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

  readonly partyMembers = computed(() =>
    this.store.viewCharacters().filter(c => c.characterType === 'PartyMember')
  );

  readonly beliefcOptions = computed(() => beliefAxisOptions(this.store.beliefAxisLabels().c));
  readonly beliefaOptions = computed(() => beliefAxisOptions(this.store.beliefAxisLabels().a));
  readonly beliefbOptions = computed(() => beliefAxisOptions(this.store.beliefAxisLabels().b));

  readonly derivedBeliefs = computed(() => deriveBeliefs(this.editValues(), undefined, this.store.beliefAxisLabels()));

  readonly beliefConflicts = computed(() => {
    const f = this.editForm();
    return computeBeliefConflicts(
      this.editValues(),
      f.partyBeliefc as BeliefPosition || undefined,
      f.partyBeliefa as BeliefPosition || undefined,
      f.partyBeliefb as BeliefPosition || undefined,
      this.store.beliefAxisLabels()
    );
  });

  factionName(id: string | undefined): string {
    if (!id) return '—';
    return this.store.viewFactions().find(f => f.id === id)?.name ?? id;
  }

  labelClass(label: string): string {
    return `badge badge-${label.toLowerCase()}`;
  }

  scoreClass(score: number): string {
    if (score >= 4) return 'score pos-high';
    if (score >= 2) return 'score pos-mid';
    if (score >= 0) return 'score neutral';
    if (score >= -3) return 'score neg-mid';
    return 'score neg-high';
  }

  conflictHint(): string {
    const primary = primaryValue(this.editValues());
    const axisKey = primary.toLowerCase() as 'a' | 'b' | 'c';
    const cfg = this.store.beliefAxisLabels()[axisKey];
    const alignedPos: BeliefPosition = cfg.positiveAligns ? 'positive' : 'negative';
    const valueLabel = this.store.valueLabels()[axisKey];
    return `High ${valueLabel} expects ${cfg[alignedPos]} on ${cfg.axisName}`;
  }

  derivedBeliefLabel(axis: 'a' | 'b' | 'c'): string {
    const derived = this.derivedBeliefs();
    const beliefKey = axis === 'a' ? 'beliefa' : axis === 'b' ? 'beliefb' : 'beliefc';
    return beliefPositionLabel(derived[beliefKey], this.store.beliefAxisLabels()[axis]);
  }

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
    const derived = this.derivedBeliefs();
    this.store.saveColonyState({
      ...cs,
      partyName:    f.partyName,
      partyBeliefc: (f.partyBeliefc as BeliefPosition) || derived.beliefc,
      partyBeliefa: (f.partyBeliefa as BeliefPosition) || derived.beliefa,
      partyBeliefb: (f.partyBeliefb as BeliefPosition) || derived.beliefb,
      partyValues:  this.editValues(),
    });
    this.saved.set(true);
    setTimeout(() => {
      this.saved.set(false);
      this.store.loadRelationships(undefined);
    }, 1500);
  }
}
