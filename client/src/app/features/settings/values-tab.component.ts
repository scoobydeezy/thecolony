import { Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppStore } from '../../store/app.store';
import { ValueLabels, BeliefAxisLabels, BeliefAxisConfig, DEFAULT_VALUE_LABELS, DEFAULT_BELIEF_AXIS_LABELS, DEFAULT_FORMULAS } from '../../core/models/types';

@Component({
  selector: 'app-values-tab',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './values-tab.component.html',
  styleUrl: './values-tab.component.scss'
})
export class ValuesTabComponent {
  store = inject(AppStore);

  valueLabels = signal<ValueLabels>({ ...DEFAULT_VALUE_LABELS });
  beliefAxisLabels = signal<BeliefAxisLabels>({
    a: { ...DEFAULT_BELIEF_AXIS_LABELS.a },
    b: { ...DEFAULT_BELIEF_AXIS_LABELS.b },
    c: { ...DEFAULT_BELIEF_AXIS_LABELS.c },
  });
  beliefDerivationThreshold = signal<number>(DEFAULT_FORMULAS.beliefDerivationThreshold);

  saved = signal(false);

  get beliefDerivationExample(): string {
    const axis = this.beliefAxisLabels().a;
    const vals = this.valueLabels();
    const posVal = axis.positiveAligns ? vals.a : vals.c;
    const negVal = axis.positiveAligns ? vals.c : vals.a;
    const n = axis.axisName.toLowerCase();
    return `${n} = ${posVal.toLowerCase()} ≥ threshold ? ${axis.positive} : ${negVal.toLowerCase()} ≥ threshold ? ${axis.negative} : ${axis.neutral}`;
  }

  constructor() {
    effect(() => {
      this.valueLabels.set({ ...this.store.valueLabels() });
      const bal = this.store.beliefAxisLabels();
      this.beliefAxisLabels.set({
        a: { ...bal.a },
        b: { ...bal.b },
        c: { ...bal.c },
      });
      this.beliefDerivationThreshold.set(this.store.formulas().beliefDerivationThreshold);
    });
  }

  setValueLabel(key: keyof ValueLabels, value: string): void {
    this.valueLabels.update(v => ({ ...v, [key]: value }));
  }

  setAxisLabel(axis: 'a' | 'b' | 'c', key: keyof BeliefAxisConfig, value: string | boolean): void {
    this.beliefAxisLabels.update(b => ({ ...b, [axis]: { ...b[axis], [key]: value } }));
  }

  toggleAxisType(axis: 'a' | 'b' | 'c'): void {
    this.beliefAxisLabels.update(b => ({
      ...b,
      [axis]: { ...b[axis], type: b[axis].type === 'opinion' ? 'boolean' : 'opinion' },
    }));
  }

  togglePositiveAligns(axis: 'a' | 'b' | 'c'): void {
    this.beliefAxisLabels.update(b => ({
      ...b,
      [axis]: { ...b[axis], positiveAligns: !b[axis].positiveAligns },
    }));
  }

  save(): void {
    const rules = this.store.rules();
    if (!rules) return;
    const formulas = { ...this.store.formulas(), beliefDerivationThreshold: this.beliefDerivationThreshold() };
    this.store.saveRules({
      ...rules,
      valueLabelsJson: JSON.stringify(this.valueLabels()),
      beliefAxisLabelsJson: JSON.stringify(this.beliefAxisLabels()),
      formulasJson: JSON.stringify(formulas),
    });
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 1500);
  }

  resetToDefaults(): void {
    if (!confirm('Reset all labels to defaults?')) return;
    this.valueLabels.set({ ...DEFAULT_VALUE_LABELS });
    this.beliefAxisLabels.set({
      a: { ...DEFAULT_BELIEF_AXIS_LABELS.a },
      b: { ...DEFAULT_BELIEF_AXIS_LABELS.b },
      c: { ...DEFAULT_BELIEF_AXIS_LABELS.c },
    });
    this.beliefDerivationThreshold.set(DEFAULT_FORMULAS.beliefDerivationThreshold);
    this.save();
  }
}
