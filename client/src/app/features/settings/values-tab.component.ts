import { Component, inject, signal, effect, computed } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { AppStore } from '../../store/app.store';
import {
  ValueLabels, BeliefAxisLabels, BeliefAxisConfig,
  DEFAULT_VALUE_LABELS, DEFAULT_BELIEF_AXIS_LABELS, DEFAULT_FORMULAS,
} from '../../core/models/types';

interface ValuesFormModel {
  // Core value labels
  a: string; b: string; c: string;
  edgeAC: string; edgeAB: string; edgeBC: string;
  // Belief axis labels (nested)
  axisA: BeliefAxisConfig;
  axisB: BeliefAxisConfig;
  axisC: BeliefAxisConfig;
  // Belief derivation threshold
  beliefDerivationThreshold: number;
}

function defaultModel(): ValuesFormModel {
  return {
    ...DEFAULT_VALUE_LABELS,
    axisA: { ...DEFAULT_BELIEF_AXIS_LABELS.a },
    axisB: { ...DEFAULT_BELIEF_AXIS_LABELS.b },
    axisC: { ...DEFAULT_BELIEF_AXIS_LABELS.c },
    beliefDerivationThreshold: DEFAULT_FORMULAS.beliefDerivationThreshold,
  };
}

@Component({
  selector: 'app-values-tab',
  standalone: true,
  imports: [FormField],
  templateUrl: './values-tab.component.html',
  styleUrl: './values-tab.component.scss'
})
export class ValuesTabComponent {
  store = inject(AppStore);
  saved = signal(false);

  readonly valuesModel = signal<ValuesFormModel>(defaultModel());
  readonly valuesForm  = form(this.valuesModel);

  constructor() {
    effect(() => {
      const vl  = this.store.valueLabels();
      const bal = this.store.beliefAxisLabels();
      const threshold = this.store.formulas().beliefDerivationThreshold;
      this.valuesModel.set({
        a: vl.a, b: vl.b, c: vl.c,
        edgeAC: vl.edgeAC, edgeAB: vl.edgeAB, edgeBC: vl.edgeBC,
        axisA: { ...bal.a },
        axisB: { ...bal.b },
        axisC: { ...bal.c },
        beliefDerivationThreshold: threshold,
      });
    });
  }

  readonly beliefDerivationExample = computed(() => {
    const m = this.valuesModel();
    const axis = m.axisA;
    const posVal = axis.positiveAligns ? m.a : m.c;
    const negVal = axis.positiveAligns ? m.c : m.a;
    const n = axis.axisName.toLowerCase();
    return `${n} = ${posVal.toLowerCase()} ≥ threshold ? ${axis.positive} : ${negVal.toLowerCase()} ≥ threshold ? ${axis.negative} : ${axis.neutral}`;
  });

  toggleAxisType(axis: 'axisA' | 'axisB' | 'axisC'): void {
    this.valuesModel.update(m => ({
      ...m,
      [axis]: { ...m[axis], type: m[axis].type === 'opinion' ? 'boolean' : 'opinion' },
    }));
  }

  togglePositiveAligns(axis: 'axisA' | 'axisB' | 'axisC'): void {
    this.valuesModel.update(m => ({
      ...m,
      [axis]: { ...m[axis], positiveAligns: !m[axis].positiveAligns },
    }));
  }

  save(): void {
    const rules = this.store.rules();
    if (!rules) return;
    const m = this.valuesModel();
    const valueLabels: ValueLabels = { a: m.a, b: m.b, c: m.c, edgeAC: m.edgeAC, edgeAB: m.edgeAB, edgeBC: m.edgeBC };
    const beliefAxisLabels: BeliefAxisLabels = { a: { ...m.axisA }, b: { ...m.axisB }, c: { ...m.axisC } };
    const formulas = { ...this.store.formulas(), beliefDerivationThreshold: m.beliefDerivationThreshold };
    this.store.saveRules({
      ...rules,
      valueLabelsJson: JSON.stringify(valueLabels),
      beliefAxisLabelsJson: JSON.stringify(beliefAxisLabels),
      formulasJson: JSON.stringify(formulas),
    });
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 1500);
  }

  resetToDefaults(): void {
    if (!confirm('Reset all labels to defaults?')) return;
    this.valuesModel.set(defaultModel());
    this.save();
  }
}
