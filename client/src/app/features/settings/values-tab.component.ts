import { Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppStore } from '../../store/app.store';
import { ValueLabels, BeliefAxisLabels, BeliefAxisConfig, DEFAULT_VALUE_LABELS, DEFAULT_BELIEF_AXIS_LABELS } from '../../core/models/types';

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

  saved = signal(false);

  constructor() {
    effect(() => {
      this.valueLabels.set({ ...this.store.valueLabels() });
      const bal = this.store.beliefAxisLabels();
      this.beliefAxisLabels.set({
        a: { ...bal.a },
        b: { ...bal.b },
        c: { ...bal.c },
      });
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
    this.store.saveRules({
      ...rules,
      valueLabelsJson: JSON.stringify(this.valueLabels()),
      beliefAxisLabelsJson: JSON.stringify(this.beliefAxisLabels()),
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
    this.save();
  }
}
