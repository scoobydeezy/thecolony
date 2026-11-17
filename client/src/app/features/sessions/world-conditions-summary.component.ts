import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppStore } from '../../store/app.store';
import { conditionWorldAt, evaluateConditions } from '../../core/sim/conditions';

/** The Sessions page's one-line World Conditions summary at the viewed point; managed on the World Conditions page. */
@Component({
  selector: 'app-world-conditions-summary',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="wcs card">
      <i class="fa-solid fa-scroll wcs-icon"></i>
      <span class="wcs-title">World Conditions</span>
      <span class="wcs-meta">{{ inForce().length }} in force {{ when() }}@if (stress()) { · {{ stress() > 0 ? '+' : '' }}{{ stress() }} Stress }</span>
      @if (inForce().length) { <span class="wcs-list" [title]="inForce().join('\\n')">{{ inForce().join(' · ') }}</span> }
      <a class="wcs-link" routerLink="/world-conditions">Manage <i class="fa-solid fa-arrow-right"></i></a>
    </div>
  `,
  styles: `
    :host { display: block; margin-bottom: 1rem; }
    .wcs { display: flex; align-items: center; gap: 0.6rem; padding: 0.55rem 1rem; min-width: 0; }
    .wcs-icon { color: var(--color-warn, #fbbf24); }
    .wcs-title { font-weight: 600; white-space: nowrap; }
    .wcs-meta { font-size: var(--text-size-label); color: var(--text-muted); white-space: nowrap; }
    .wcs-list { flex: 1; min-width: 0; font-size: var(--text-size-label); color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .wcs-link { margin-left: auto; white-space: nowrap; color: var(--accent); text-decoration: none; font-size: var(--text-size-label); &:hover { text-decoration: underline; } }
  `,
})
export class WorldConditionsSummaryComponent {
  private readonly store = inject(AppStore);
  private readonly snap = computed(() => this.store.activeSnapshot() ?? this.store.colonySnapshots().at(-1) ?? null);
  private readonly statuses = computed(() => [...evaluateConditions(this.store.worldConditions(),
    conditionWorldAt(this.snap(), { assets: this.store.assets(), characters: this.store.characters(), factions: this.store.factions(), locations: this.store.locations(), goals: this.store.factionGoals() }),
    { asset: id => id, faction: id => id }).values()]);
  readonly inForce = computed(() => this.statuses().filter(s => s.inForce).map(s => s.condition.title));
  readonly stress = computed(() => this.statuses().reduce((t, s) => t + s.stress, 0));
  readonly when = computed(() => { const s = this.snap(); return s ? `after Session ${s.sessionNumber}` : 'at the start'; });
}
