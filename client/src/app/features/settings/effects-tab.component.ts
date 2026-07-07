import { Component, inject, signal, effect } from '@angular/core';
import { AppStore } from '../../store/app.store';
import { CascadeRule, DEFAULT_CASCADE_RULES } from '../../core/models/types';
import { CascadeRuleEditorComponent } from './cascade-rule-editor.component';

function newRule(): CascadeRule {
  return {
    id: crypto.randomUUID(),
    label: '',
    triggerType: 'streak',
    sourceEntityType: 'faction',
    sourceProperty: 'momentum',
    direction: 'negative',
    minConsecutiveWeeks: 2,
    effectType: 'multiplier',
    targetEntityType: 'faction',
    targetProperty: 'baseLegitimacy',
    multiplier: 2,
  };
}

@Component({
  selector: 'app-effects-tab',
  standalone: true,
  imports: [CascadeRuleEditorComponent],
  templateUrl: './effects-tab.component.html',
  styleUrl: './effects-tab.component.scss'
})
export class EffectsTabComponent {
  store = inject(AppStore);
  rules = signal<CascadeRule[]>([]);
  saved = signal(false);

  constructor() {
    effect(() => { this.rules.set([...this.store.cascadeRules()]); });
  }

  addRule(): void { this.rules.update(rs => [...rs, newRule()]); }

  removeRule(id: string): void { this.rules.update(rs => rs.filter(r => r.id !== id)); }

  updateRule(updated: CascadeRule): void {
    this.rules.update(rs => rs.map(r => r.id === updated.id ? updated : r));
  }

  save(): void {
    const current = this.store.rules();
    if (!current) return;
    this.store.saveRules({ ...current, cascadeRulesJson: JSON.stringify(this.rules()) });
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 1500);
  }

  resetToDefaults(): void {
    if (!confirm('Reset cascade rules to defaults?')) return;
    this.rules.set([...DEFAULT_CASCADE_RULES]);
  }
}
