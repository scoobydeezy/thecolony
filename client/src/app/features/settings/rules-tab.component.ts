import { Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppStore } from '../../store/app.store';
import { RulesConfig, RelationshipThreshold, RelationshipLabel } from '../../core/models/types';

const THRESHOLD_LABELS: RelationshipLabel[] = [
  'Aligned', 'Cooperative', 'Friendly', 'Tolerated', 'Strained', 'Opposed', 'Hostile'
];

const DEFAULT_THRESHOLDS: RelationshipThreshold[] = [
  { label: 'Aligned',     minScore: 80 },
  { label: 'Cooperative', minScore: 50 },
  { label: 'Friendly',    minScore: 20 },
  { label: 'Tolerated',   minScore: -10 },
  { label: 'Strained',    minScore: -30 },
  { label: 'Opposed',     minScore: -60 },
  { label: 'Hostile',     minScore: -100 },
];

@Component({
  selector: 'app-rules-tab',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './rules-tab.component.html',
  styleUrl: './rules-tab.component.scss'
})
export class RulesTabComponent {
  store = inject(AppStore);
  form = signal<RulesConfig | null>(null);
  saved = signal(false);
  thresholdLabels = THRESHOLD_LABELS;

  constructor() {
    effect(() => {
      const rules = this.store.rules();
      if (rules && !this.form()) {
        this.form.set({ ...rules });
      }
    });
  }

  get parsedThresholds(): RelationshipThreshold[] {
    const f = this.form();
    if (!f) return DEFAULT_THRESHOLDS;
    try {
      return JSON.parse(f.thresholdsJson);
    } catch {
      return DEFAULT_THRESHOLDS;
    }
  }

  thresholdMinScore(label: RelationshipLabel): number {
    return this.parsedThresholds.find(t => t.label === label)?.minScore ?? 0;
  }

  setThreshold(label: RelationshipLabel, value: string): void {
    const updated = this.parsedThresholds.map(t =>
      t.label === label ? { ...t, minScore: +value } : t
    );
    this.form.update(f => f ? { ...f, thresholdsJson: JSON.stringify(updated) } : f);
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
      beliefMatch: 2.5,
      beliefConflict: -1.0,
      valueAlignmentScale: 5,
      valueConflictScale: 3,
      stressPositiveMultiplierPerPoint: 0.25,
      stressNegativeMultiplierPerPoint: 0.35,
      influenceConvictionScale: 0.5,
      thresholdsJson: JSON.stringify(DEFAULT_THRESHOLDS),
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
