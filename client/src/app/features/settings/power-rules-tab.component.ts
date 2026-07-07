import { Component, inject, signal, effect } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { AppStore } from '../../store/app.store';
import { RulesConfig, FormulasConfig, DEFAULT_FORMULAS } from '../../core/models/types';

const DEFAULT_RULES_STUB: RulesConfig = {
  id: '', beliefMatch: 3, beliefConflict: -2, valueAlignmentScale: 5.5,
  valueConflictScale: 3, stressPositiveMultiplierPerPoint: 0.25,
  stressNegativeMultiplierPerPoint: 0.2, positiveEnabled: true, negativeEnabled: true,
  thresholdsJson: '[]', valueLabelsJson: '{}', beliefAxisLabelsJson: '{}',
  cascadeRulesJson: '[]', formulasJson: '{}', stressWeightEnabled: true,
  stressWeightCurve: 'Cubic', stressWeightIntensity: 0.7,
  influenceConvictionScale: 0.5, stressTriggersJson: '[]',
};

@Component({
  selector: 'app-power-rules-tab',
  standalone: true,
  imports: [FormField],
  templateUrl: './power-rules-tab.component.html',
  styleUrl: './power-rules-tab.component.scss'
})
export class PowerRulesTabComponent {
  store = inject(AppStore);
  saved = signal(false);

  readonly rulesModel  = signal<RulesConfig>({ ...DEFAULT_RULES_STUB });
  readonly rulesForm   = form(this.rulesModel);
  readonly formulasModel = signal<FormulasConfig>({ ...DEFAULT_FORMULAS });
  readonly formulasForm  = form(this.formulasModel);

  constructor() {
    effect(() => {
      const rules = this.store.rules();
      if (rules) this.rulesModel.set({ ...rules });
      this.formulasModel.set({ ...this.store.formulas() });
    });
  }

  save(): void {
    const rules = this.rulesModel();
    if (!rules.id) return;
    const merged: FormulasConfig = { ...this.store.formulas(), ...this.formulasModel() };
    this.store.saveRules({ ...rules, formulasJson: JSON.stringify(merged) });
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 1500);
  }
}
