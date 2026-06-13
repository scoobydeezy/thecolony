import { Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppStore } from '../../store/app.store';
import { ColonyState } from '../../core/models/types';

@Component({
  selector: 'app-colony-state',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './colony-state.component.html',
  styleUrl: './colony-state.component.scss'
})
export class ColonyStateComponent {
  store = inject(AppStore);

  form = signal<ColonyState | null>(null);
  saved = signal(false);

  constructor() {
    effect(() => {
      const cs = this.store.colonyState();
      if (cs && !this.form()) {
        this.form.set({ ...cs });
      }
    });
  }

  save(): void {
    const f = this.form();
    if (!f) return;
    f.colonyStress = Math.min(10, Math.max(0, f.colonyStress));
    this.store.saveColonyState(f);
    this.saved.set(true);
    setTimeout(() => {
      this.saved.set(false);
      this.store.loadRelationships(undefined);
    }, 1500);
  }

  stressBarWidth(): string {
    return `${(this.form()?.colonyStress ?? 0) * 10}%`;
  }

  stressClass(): string {
    const s = this.form()?.colonyStress ?? 0;
    if (s <= 3) return 'stress-low';
    if (s <= 6) return 'stress-mid';
    return 'stress-high';
  }
}
