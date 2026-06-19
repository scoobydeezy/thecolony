import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { AppStore } from '../../store/app.store';
import { BeliefPosition, primaryValue, secondaryValue, sacrificedValue, driftScore, topCompatibleFactions, beliefPositionLabel } from '../../core/models/types';
import type { Faction } from '../../core/models/types';

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

  valueLabel(v: string): string {
    const vl = this.store.valueLabels();
    const k = v.toLowerCase() as 'a' | 'b' | 'c';
    return (k === 'a' || k === 'b' || k === 'c') ? vl[k] : v;
  }

  beliefLabel(axis: 'a' | 'b' | 'c', pos: BeliefPosition): string {
    return beliefPositionLabel(pos, this.store.beliefAxisLabels()[axis]);
  }

  beliefClass(axis: 'a' | 'b' | 'c', pos: BeliefPosition): string {
    const cfg = this.store.beliefAxisLabels()[axis];
    if (pos === 'positive') return cfg.positiveAligns ? 'belief-statusquo' : 'belief-dissent';
    if (pos === 'negative') return cfg.positiveAligns ? 'belief-dissent' : 'belief-statusquo';
    return 'belief-neutral';
  }

  factionName(id: string | undefined): string {
    if (!id) return '—';
    if (id === 'party') return 'party';
    return this.store.viewFactions().find(f => f.id === id)?.name ?? id;
  }

  mostCompatibleFactionName(characterId: string): string {
    const c = this.store.viewCharacters().find(x => x.id === characterId);
    if (!c) return '—';
    const factions = this.store.viewFactions().filter(f => f.active && f.type === 'Faction');
    const top = topCompatibleFactions(c, factions, this.store.formulas().beliefDerivationThreshold)[0];
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
    const s = this.store.viewColonyStress();
    if (s <= 3) return 'stress-indicator low';
    if (s <= 6) return 'stress-indicator mid';
    return 'stress-indicator high';
  }

  stressBarWidth(): string {
    return `${this.store.viewColonyStress() * 10}%`;
  }

  // Timeline: SVG stress chart data
  readonly timelineWidth = 560;
  readonly timelineHeight = 80;
  readonly timelinePadX = 28;
  readonly timelinePadY = 10;

  readonly stressPoints = computed(() => {
    const data = this.store.stressTimeline();
    if (data.length === 0) return '';
    const w = this.timelineWidth - this.timelinePadX * 2;
    const h = this.timelineHeight - this.timelinePadY * 2;
    const xStep = data.length > 1 ? w / (data.length - 1) : 0;
    return data.map((d, i) => {
      const x = this.timelinePadX + (data.length === 1 ? w / 2 : i * xStep);
      const y = this.timelinePadY + h - (d.stress / 10) * h;
      return `${x},${y}`;
    }).join(' ');
  });

  readonly stressMarkers = computed(() => {
    const data = this.store.stressTimeline();
    if (data.length === 0) return [];
    const w = this.timelineWidth - this.timelinePadX * 2;
    const h = this.timelineHeight - this.timelinePadY * 2;
    const xStep = data.length > 1 ? w / (data.length - 1) : 0;
    return data.map((d, i) => ({
      x: this.timelinePadX + (data.length === 1 ? w / 2 : i * xStep),
      y: this.timelinePadY + h - (d.stress / 10) * h,
      stress: d.stress,
      label: `S${d.sessionNumber}`,
      title: d.sessionTitle,
    }));
  });


  readonly partyName = computed(() => this.store.colonyState()?.partyName || 'Party');

  readonly viewActWeek = computed(() => {
    const snap = this.store.activeSnapshot();
    if (snap) {
      const session = this.store.sessions().find(s => s.id === snap.sessionId);
      if (session) return { act: session.act, week: session.week };
    }
    return { act: this.store.colonyState()?.act, week: this.store.colonyState()?.week };
  });

  get activeFactionCount(): number {
    return this.store.viewFactions().filter(f => f.active && f.type === 'Faction').length;
  }

  get totalRelationshipCount(): number {
    return this.store.factionRelationships().length;
  }

  get friendlyCount(): number {
    return this.store.factionRelationships().filter(r => r.label === 'Friendly').length;
  }

  get hostileCount(): number {
    return this.store.factionRelationships().filter(r =>
      r.label === 'Hostile' || r.label === 'Opposed').length;
  }

  get alignedCount(): number {
    return this.store.factionRelationships().filter(r =>
      r.label === 'Aligned' || r.label === 'Cooperative').length;
  }

  // Colony Alerts + Faction Rankings (merged from Colony State)
  readonly factionRankings = computed(() =>
    [...this.store.viewFactions().filter(f => f.active && f.type === 'Faction')]
      .map(f => ({ faction: f, momentum: f.momentum, legitimacy: f.legitimacy, influence: f.baseInfluence }))
      .sort((a, b) => b.momentum - a.momentum)
  );

  get mostInfluential(): { faction: Faction; momentum: number } | null {
    const ranks = this.factionRankings();
    return ranks.length > 0 ? ranks[0] : null;
  }

  get fastestRising(): { faction: Faction; momentum: number } | null {
    const snaps = this.store.colonySnapshots();
    if (snaps.length < 2) return null;
    const prev = snaps[snaps.length - 2];
    const curr = snaps[snaps.length - 1];
    const factions = this.store.activeFactions();
    let best: { faction: Faction; momentum: number } | null = null;
    let bestDelta = -Infinity;
    for (const f of factions) {
      const delta = (curr.factionMomentum[f.id] ?? f.momentum) - (prev.factionMomentum[f.id] ?? f.momentum);
      if (delta > bestDelta) { bestDelta = delta; best = { faction: f, momentum: curr.factionMomentum[f.id] ?? f.momentum }; }
    }
    return best;
  }

  get lowestLegitimacy(): { faction: Faction; legitimacy: number } | null {
    const ranks = this.factionRankings();
    if (ranks.length === 0) return null;
    return [...ranks].sort((a, b) => a.legitimacy - b.legitimacy)[0];
  }

  get highestDefectionRisk(): { name: string; driftScore: number } | null {
    const at = this.store.viewMostAtRisk();
    if (at.length === 0) return null;
    const c = at[0];
    const drift = c.pressure + this.store.viewColonyStress() * 10 - c.conviction;
    return { name: c.name, driftScore: Math.round(drift) };
  }

  get isViewingBaseline(): boolean {
    return this.store.viewingContext() === 'baseline';
  }
}
