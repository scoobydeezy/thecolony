import { Component, inject, signal, effect } from '@angular/core';
import { AppStore } from '../../store/app.store';
import { StressTrigger } from '../../core/models/types';
import { StressTriggerEditorComponent } from './stress-trigger-editor.component';

function newTrigger(): StressTrigger {
  return {
    id: crypto.randomUUID(),
    label: '',
    sourceEntityType: 'asset',
    sourceProperty: 'status',
    sourcePropertyValue: [],
    flatDelta: 1,
    oneShot: false,
  };
}

@Component({
  selector: 'app-stress-triggers-tab',
  standalone: true,
  imports: [StressTriggerEditorComponent],
  templateUrl: './stress-triggers-tab.component.html',
  styleUrl: './stress-triggers-tab.component.scss',
})
export class StressTriggersTabComponent {
  store = inject(AppStore);
  triggers = signal<StressTrigger[]>([]);
  saved = signal(false);

  constructor() {
    effect(() => {
      const raw = this.store.rules()?.stressTriggersJson;
      try {
        const parsed = raw ? JSON.parse(raw) : [];
        this.triggers.set(Array.isArray(parsed) ? parsed : []);
      } catch { this.triggers.set([]); }
    });
  }

  addTrigger(): void { this.triggers.update(ts => [...ts, newTrigger()]); }
  removeTrigger(id: string): void { this.triggers.update(ts => ts.filter(t => t.id !== id)); }
  updateTrigger(updated: StressTrigger): void {
    this.triggers.update(ts => ts.map(t => t.id === updated.id ? updated : t));
  }

  save(): void {
    const current = this.store.rules();
    if (!current) return;
    this.store.saveRules({ ...current, stressTriggersJson: JSON.stringify(this.triggers()) });
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 1500);
  }
}
