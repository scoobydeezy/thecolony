import { Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppStore } from '../../store/app.store';
import { RulesConfig, FormulasConfig, DEFAULT_FORMULAS } from '../../core/models/types';

@Component({
  selector: 'app-power-rules-tab',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './power-rules-tab.component.html',
  styleUrl: './power-rules-tab.component.scss'
})
export class PowerRulesTabComponent {
  store = inject(AppStore);
  rulesForm = signal<RulesConfig | null>(null);
  formulasForm = signal<FormulasConfig>({ ...DEFAULT_FORMULAS });
  saved = signal(false);

  constructor() {
    effect(() => {
      const rules = this.store.rules();
      if (rules && !this.rulesForm()) {
        this.rulesForm.set({ ...rules });
      }
      this.formulasForm.set({ ...this.store.formulas() });
    });
  }

  floatRules(key: keyof RulesConfig, value: string): void {
    this.rulesForm.update(f => f ? { ...f, [key]: parseFloat(value) } : f);
  }

  floatFormulas(key: keyof FormulasConfig, value: string): void {
    this.formulasForm.update(f => ({ ...f, [key]: parseFloat(value) }));
  }

  save(): void {
    const rules = this.rulesForm();
    if (!rules) return;
    // Patch formulasJson — preserve beliefDerivationThreshold owned by values-tab
    const merged: FormulasConfig = { ...this.store.formulas(), ...this.formulasForm() };
    this.store.saveRules({ ...rules, formulasJson: JSON.stringify(merged) });
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 1500);
  }
}
