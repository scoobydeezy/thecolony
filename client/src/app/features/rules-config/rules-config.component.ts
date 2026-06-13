import { Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppStore } from '../../store/app.store';
import { RulesConfig } from '../../core/models/types';

@Component({
  selector: 'app-rules-config',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './rules-config.component.html',
  styleUrl: './rules-config.component.scss'
})
export class RulesConfigComponent {
  store = inject(AppStore);
  form = signal<RulesConfig | null>(null);
  saved = signal(false);

  constructor() {
    effect(() => {
      const rules = this.store.rules();
      if (rules && !this.form()) {
        this.form.set({ ...rules });
      }
    });
  }

  save(): void {
    const f = this.form();
    if (!f) return;
    this.store.saveRules(f);
    this.saved.set(true);
    setTimeout(() => {
      this.saved.set(false);
      this.store.loadRelationships(undefined);
    }, 1500);
  }

  reset(): void {
    if (!confirm('Reset all rules to default values?')) return;
    const defaults: Partial<RulesConfig> = {
      beliefMatch: 0.8,
      beliefConflict: -0.5,
      valueAlignmentScale: 6,
      valueConflictScale: 6,
      stressPositiveMultiplierPerPoint: 0.12,
      stressNegativeMultiplierPerPoint: 0.25,
    };
    this.form.update(f => f ? { ...f, ...defaults } : f);
  }

  numField(key: keyof RulesConfig, value: string): void {
    this.form.update(f => f ? { ...f, [key]: +value } : f);
  }

  floatField(key: keyof RulesConfig, value: string): void {
    this.form.update(f => f ? { ...f, [key]: parseFloat(value) } : f);
  }
}
