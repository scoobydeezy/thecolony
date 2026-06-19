import { Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppStore } from '../../store/app.store';
import { FormulasConfig, DEFAULT_FORMULAS } from '../../core/models/types';

@Component({
  selector: 'app-formulas-tab',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './formulas-tab.component.html',
  styleUrl: './formulas-tab.component.scss'
})
export class FormulasTabComponent {
  store = inject(AppStore);
  form = signal<FormulasConfig>({ ...DEFAULT_FORMULAS });

  get beliefDerivationExample(): string {
    const axis = this.store.beliefAxisLabels().a;
    const vals = this.store.valueLabels();
    const posVal = axis.positiveAligns ? vals.a : vals.c;
    const negVal = axis.positiveAligns ? vals.c : vals.a;
    const n = axis.axisName.toLowerCase();
    return `${n} = ${posVal.toLowerCase()} ≥ threshold ? ${axis.positive} : ${negVal.toLowerCase()} ≥ threshold ? ${axis.negative} : ${axis.neutral}`;
  }
  saved = signal(false);

  constructor() {
    effect(() => {
      this.form.set({ ...this.store.formulas() });
    });
  }

  floatField(key: keyof FormulasConfig, value: string): void {
    this.form.update(f => ({ ...f, [key]: parseFloat(value) }));
  }

  save(): void {
    const current = this.store.rules();
    if (!current) return;
    this.store.saveRules({ ...current, formulasJson: JSON.stringify(this.form()) });
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 1500);
  }

  reset(): void {
    if (!confirm('Reset formulas to default values?')) return;
    this.form.set({ ...DEFAULT_FORMULAS });
  }
}
