import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppStore } from '../../store/app.store';
import { topCompatibleFactions, DEFAULT_RULES } from '../../core/services/scoring.service';
import { BeliefPosition, primaryValue, secondaryValue, sacrificedValue, beliefPositionLabel, effectiveDriftScoreWithInfluence } from '../../core/models/types';
import type { Faction, RelationshipBreakdown } from '../../core/models/types';
import { FactionInfluenceService } from '../../core/services/faction-influence.service';
import { TimelineStressTabComponent } from './timeline-stress-tab.component';
import { TimelineFactionsTabComponent } from './timeline-factions-tab.component';
import { TimelineRelationshipsTabComponent } from './timeline-relationships-tab.component';
import { TimelineCharactersTabComponent } from './timeline-characters-tab.component';
import { TimelineAnalysisTabComponent } from './timeline-analysis-tab.component';

interface ConsolidatedRel {
  sourceId: string;
  targetId: string;
  label: string;
  finalScore: number;
  bidirectional: boolean;
}

type TimelineTab = 'stress' | 'factions' | 'relationships' | 'characters' | 'analysis';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    TimelineStressTabComponent,
    TimelineFactionsTabComponent,
    TimelineRelationshipsTabComponent,
    TimelineCharactersTabComponent,
    TimelineAnalysisTabComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  store = inject(AppStore);
  private influenceSvc = inject(FactionInfluenceService);

  activeTab = signal<TimelineTab>('stress');
  showEvents = signal(true);

  readonly timelineTabs: { value: TimelineTab; label: string }[] = [
    { value: 'stress', label: 'Global Stress' },
    { value: 'factions', label: 'Factions' },
    { value: 'relationships', label: 'Relationships' },
    { value: 'characters', label: 'Characters' },
    { value: 'analysis', label: 'Analysis' },
  ];

  primaryValue   = primaryValue;
  secondaryValue = secondaryValue;
  sacrificedValue = sacrificedValue;

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
    const top = topCompatibleFactions(c, factions, this.store.formulas().beliefDerivationThreshold, this.store.beliefAxisLabels(), this.store.rules() ?? DEFAULT_RULES)[0];
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
  readonly factionRankings = computed(() => {
    const factions = this.store.viewFactions().filter(f => f.active && f.type === 'Faction');
    const members  = this.store.viewCharacters();
    const formulas = this.store.formulas();
    const assets   = this.store.viewAssets();   // D4: projected assets, same as every other Power view
    return [...factions]
      .map(f => ({
        faction:    f,
        momentum:   f.momentumTier ?? 0,   // M3: the −2..+2 tier (raw Momentum is archived)
        power:      this.influenceSvc.breakdown(f, members, assets, formulas).power,
      }))
      .sort((a, b) => b.momentum - a.momentum || b.power - a.power || a.faction.name.localeCompare(b.faction.name));
  });

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
      const base = f.momentumTier ?? 0;
      const now = curr.factionMomentumTier?.[f.id] ?? base;
      const delta = now - (prev.factionMomentumTier?.[f.id] ?? base);
      if (delta > bestDelta) { bestDelta = delta; best = { faction: f, momentum: now }; }
    }
    return bestDelta > 0 ? best : null;   // M3: only a faction whose tier actually rose this session
  }

  /** §18.7: factions with Power 0 make no Faction Phase operations until their capacity changes. */
  get powerless(): Faction[] { return this.factionRankings().filter(r => r.power === 0).map(r => r.faction); }

  viewDriftOf(characterId: string): number {
    const stress = this.store.viewColonyStress();
    const scale  = this.store.rules()?.influenceConvictionScale ?? 0.5;
    const alive  = this.store.viewCharacters().filter(c => c.state === 'Alive');
    const c = alive.find(x => x.id === characterId);
    if (!c) return 0;
    const peers = alive.filter(p => p.factionId && p.factionId === c.factionId && p.id !== c.id);
    return Math.round(effectiveDriftScoreWithInfluence(c, stress, peers, scale, this.store.formulas().stressPressureCoefficient));
  }

  get highestDefectionRisk(): { name: string; driftScore: number } | null {
    const at = this.store.viewMostAtRisk();
    if (at.length === 0) return null;
    const c = at[0];
    return { name: c.name, driftScore: this.viewDriftOf(c.id) };
  }

  get isViewingBaseline(): boolean {
    return this.store.viewingContext() === 'baseline';
  }

  private consolidate(sorted: RelationshipBreakdown[], limit: number): ConsolidatedRel[] {
    // Only consider a pair bidirectional if both directions appear in the candidate pool.
    // Pool is 2× the limit so a merged pair doesn't silently eat a slot without a replacement.
    const pool = sorted.slice(0, limit * 2);
    const seen = new Set<string>();
    const result: ConsolidatedRel[] = [];
    for (const r of pool) {
      if (result.length >= limit) break;
      const key = [r.sourceId, r.targetId].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const reverse = pool.find(x => x.sourceId === r.targetId && x.targetId === r.sourceId);
      const bidirectional = !!reverse;
      const finalScore = bidirectional && Math.abs(reverse!.finalScore) > Math.abs(r.finalScore)
        ? reverse!.finalScore
        : r.finalScore;
      const source = bidirectional && Math.abs(reverse!.finalScore) > Math.abs(r.finalScore) ? reverse! : r;
      result.push({ sourceId: source.sourceId, targetId: source.targetId, label: source.label, finalScore, bidirectional });
    }
    return result;
  }

  readonly mostHostileConsolidated = computed((): ConsolidatedRel[] => {
    const raw = [...this.store.factionRelationships()]
      .sort((a, b) => a.finalScore - b.finalScore);
    return this.consolidate(raw, 5);
  });

  readonly strongestAlliancesConsolidated = computed((): ConsolidatedRel[] => {
    const raw = [...this.store.factionRelationships()]
      .sort((a, b) => b.finalScore - a.finalScore);
    return this.consolidate(raw, 5);
  });
}
