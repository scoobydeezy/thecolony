import { Component, input, signal } from '@angular/core';
import { ReviewFaction } from './colony-turn-review';
import { ConditionStatus } from '../../core/sim/conditions';

export interface SummarySection { title: string; items: { text: string; cls: string }[] }

/** A Colony Turn's results (the Review step and a completed turn's card): faction cards with the new world states and the
 *  Momentum gained or lost, the World Conditions the turn switched on or off, and the full summary behind Details. */
@Component({
  selector: 'app-colony-turn-results',
  standalone: true,
  templateUrl: './colony-turn-results.component.html',
  styleUrl: './colony-turn-results.component.scss',
})
export class ColonyTurnResultsComponent {
  readonly cards = input.required<ReviewFaction[]>();
  readonly details = input.required<SummarySection[]>();
  readonly conditions = input<{ started: ConditionStatus[]; ended: ConditionStatus[] } | null>(null);
  readonly showDetails = signal(false);
  instabilityLabel(n: number): string { return n === 3 ? 'Compromised (crisis)' : n === 2 ? 'Conflicted' : n === 1 ? 'Stable' : 'Left the faction'; }
}
