import { Component, computed, input } from '@angular/core';
import { Character } from '../../core/models/types';

/** M6: a character's instability (Conflicted / Compromised crisis) and the Reaffirmed marker. Nothing for a plain Stable. */
@Component({
  selector: 'app-instability-badge',
  standalone: true,
  template: `
    @if (c().instability === 'Compromised') {
      <span class="ib ib--crisis" title="Compromised: a visible crisis. The next Colony Turn's Character Phase makes a Defection Check unless play resolves it.">Crisis</span>
    } @else if (c().instability === 'Conflicted') {
      <span class="ib ib--conflicted" title="Conflicted: one Drift Roll away from a crisis">Conflicted</span>
    }
    @if (reaffirmed()) {
      <span class="ib ib--reaffirmed" title="Reaffirmed: survived a crisis without leaving; not nominated again for this faction">Reaffirmed</span>
    }
  `,
  styles: [`
    :host { display: inline-flex; gap: 0.25rem; }
    .ib { font-size: var(--text-size-badge); font-weight: 600; padding: 0.05rem 0.4rem; border-radius: 99px; white-space: nowrap; }
    .ib--crisis { color: #f87171; background: color-mix(in srgb, #ef4444 15%, transparent); }
    .ib--conflicted { color: #fbbf24; background: color-mix(in srgb, #f59e0b 15%, transparent); }
    .ib--reaffirmed { color: #34d399; background: color-mix(in srgb, #10b981 12%, transparent); }
  `],
})
export class InstabilityBadgeComponent {
  c = input.required<Pick<Character, 'instability' | 'reaffirmedFactionId' | 'factionId'>>({ alias: 'character' });
  readonly reaffirmed = computed(() => !!this.c().reaffirmedFactionId && this.c().reaffirmedFactionId === this.c().factionId);
}
