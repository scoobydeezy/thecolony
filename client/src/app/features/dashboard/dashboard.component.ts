import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { AppStore } from '../../store/app.store';
import { primaryValue, secondaryValue, sacrificedValue, driftScore, topCompatibleFactions } from '../../core/models/types';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  store = inject(AppStore);

  primaryValue   = primaryValue;
  secondaryValue = secondaryValue;
  sacrificedValue = sacrificedValue;
  driftScore     = driftScore;

  factionName(id: string | undefined): string {
    if (!id) return '—';
    if (id === 'party') return 'party';
    return this.store.factions().find(f => f.id === id)?.name ?? id;
  }

  mostCompatibleFactionName(characterId: string): string {
    const c = this.store.characters().find(x => x.id === characterId);
    if (!c) return '—';
    const factions = this.store.factions().filter(f => f.active && f.type === 'Faction');
    const top = topCompatibleFactions(c, factions)[0];
    return top ? this.factionName(top.factionId) : '—';
  }

  labelClass(label: string): string {
    return `badge badge-${label.toLowerCase()}`;
  }

  scoreClass(score: number): string {
    if (score >= 4) return 'score pos-high';
    if (score >= 2) return 'score pos-mid';
    if (score >= 0) return 'score neutral';
    if (score >= -3) return 'score neg-mid';
    return 'score neg-high';
  }

  stressClass(): string {
    const s = this.store.colonyState()?.colonyStress ?? 0;
    if (s <= 3) return 'stress-indicator low';
    if (s <= 6) return 'stress-indicator mid';
    return 'stress-indicator high';
  }

  stressBarWidth(): string {
    const s = this.store.colonyState()?.colonyStress ?? 0;
    return `${s * 10}%`;
  }

  get activeFactionCount(): number {
    return this.store.activeFactions().length;
  }

  get totalRelationshipCount(): number {
    return this.store.factionRelationships().length;
  }

  get hostileCount(): number {
    return this.store.factionRelationships().filter(r =>
      r.label === 'Hostile' || r.label === 'Opposed').length;
  }

  get alignedCount(): number {
    return this.store.factionRelationships().filter(r =>
      r.label === 'Aligned' || r.label === 'Friendly').length;
  }
}
