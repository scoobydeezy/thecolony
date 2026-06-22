import { Injectable, inject } from '@angular/core';
import { computed } from '@angular/core';
import { AppStore } from '../../store/app.store';
import {
  ColonySnapshot, Session, Faction, Character, RulesConfig,
  effectivePressure, influenceConvictionBonus,
} from '../models/types';
import { scoreRelationship, ScoringActor } from './scoring.service';
import { FactionInfluenceService } from './faction-influence.service';

export type FactionMetric = 'momentum' | 'legitimacy' | 'effectivePower' | 'membership' | 'influence';
export type CharacterMetric = 'pressure' | 'drift' | 'influence';
export type CharacterSelector =
  | { type: 'single'; characterId: string }
  | { type: 'allLeaders' }
  | { type: 'factionMembers'; factionId: string };

export interface AnalysisSeriesDef {
  metric: FactionMetric | CharacterMetric | 'stress';
  entityId?: string;
}

export interface EventMarker {
  sessionIndex: number;
  events: { icon: string; tooltip: string }[];
}

export interface TimelineSeries {
  label: string;
  data: (number | null)[];
  color: string;
}

export interface TimelineDataset {
  labels: string[];
  series: TimelineSeries[];
  eventMarkers: EventMarker[];
}

const FACTION_PALETTE = [
  '#60a5fa', '#f59e0b', '#34d399', '#f87171', '#a78bfa',
  '#fb923c', '#38bdf8', '#4ade80', '#e879f9', '#facc15',
];

const CHARACTER_PALETTE = [
  '#94a3b8', '#cbd5e1', '#64748b', '#475569', '#334155',
  '#7dd3fc', '#86efac', '#fca5a5', '#d8b4fe', '#fed7aa',
];

@Injectable({ providedIn: 'root' })
export class TimelineService {
  private store = inject(AppStore);
  private influenceSvc = inject(FactionInfluenceService);

  // Note: the toggle on the UI is labelled "Show Events" for user familiarity,
  // but markers are derived from effects (character state and faction changes between snapshots),
  // not from event container titles. Events are just containers; effects are the meaningful changes.
  //
  // Icon codepoints are FA7 Solid (font-family "Font Awesome 7 Free", weight 900):
  //   skull  = Dead, circle-question  = Missing, hourglass-start  = Forgotten
  //   shuffle  = faction change
  private static readonly STATE_ICONS: Partial<Record<string, string>> = {
    Dead:      '',
    Missing:   '',
    Forgotten: '',
  };

  private buildEventMarkers(snapshots: ColonySnapshot[]): EventMarker[] {
    const characters = this.store.characters();
    const factions = this.store.factions();

    return snapshots.map((snap, i) => {
      const prev = snapshots[i - 1];
      const events: { icon: string; tooltip: string }[] = [];

      for (const char of characters) {
        const prevState = prev ? (prev.characterStates[char.id] ?? char.state) : char.state;
        const currState = snap.characterStates[char.id] ?? char.state;
        if (currState !== prevState) {
          const icon = TimelineService.STATE_ICONS[currState] ?? '';
          events.push({ icon, tooltip: `${char.name}: ${currState}` });
        }

        const prevFactionId = prev ? (prev.characterFactions[char.id] ?? char.factionId) : char.factionId;
        const currFactionId = snap.characterFactions[char.id] ?? char.factionId;
        if (currFactionId !== prevFactionId) {
          const faction = factions.find(f => f.id === currFactionId);
          if (faction) events.push({ icon: '', tooltip: `${char.name} → ${faction.name}` });
        }
      }

      // Group same-icon effects onto one line: [skull, skull] → one line of "  "
      const grouped: { icon: string; tooltip: string }[] = [];
      const byIcon = new Map<string, { icons: string[]; tooltips: string[] }>();
      for (const e of events) {
        if (!byIcon.has(e.icon)) byIcon.set(e.icon, { icons: [], tooltips: [] });
        const g = byIcon.get(e.icon)!;
        g.icons.push(e.icon);
        g.tooltips.push(e.tooltip);
      }
      for (const [, g] of byIcon) {
        grouped.push({ icon: g.icons.join(' '), tooltip: g.tooltips.join('\n') });
      }

      return { sessionIndex: i, events: grouped };
    }).filter(m => m.events.length > 0);
  }

  private sessionLabels(snapshots: ColonySnapshot[]): string[] {
    const sessions = this.store.sessions();
    return snapshots.map(snap => {
      const session = sessions.find(s => s.id === snap.sessionId);
      return session ? `S${session.number}` : `S${snap.sessionNumber}`;
    });
  }

  stressDataset(): TimelineDataset {
    const snapshots = this.store.colonySnapshots();
    const sessions = this.store.sessions();
    return {
      labels: this.sessionLabels(snapshots),
      series: [{
        label: 'Colony Stress',
        data: snapshots.map(s => s.colonyStress),
        color: '#60a5fa',
      }],
      eventMarkers: this.buildEventMarkers(snapshots),
    };
  }

  factionsDataset(metric: FactionMetric): TimelineDataset {
    const snapshots = this.store.colonySnapshots();
    const sessions = this.store.sessions();
    const factions = this.store.factions().filter(f => f.active && f.type === 'Faction');
    const characters = this.store.characters();
    const rules = this.store.formulas();

    const series: TimelineSeries[] = factions.map((faction, fi) => ({
      label: faction.name,
      color: FACTION_PALETTE[fi % FACTION_PALETTE.length],
      data: snapshots.map(snap => {
        if (snap.factionMomentum[faction.id] === undefined) return null;
        switch (metric) {
          case 'momentum': return snap.factionMomentum[faction.id] ?? null;
          case 'legitimacy': return snap.factionLegitimacy[faction.id] ?? null;
          case 'membership':
            return Object.entries(snap.characterFactions)
              .filter(([, fid]) => fid === faction.id).length;
          case 'influence':
          case 'effectivePower': {
            const factionAtSnap: Faction = {
              ...faction,
              momentum: snap.factionMomentum[faction.id] ?? faction.momentum,
              legitimacy: snap.factionLegitimacy[faction.id] ?? faction.legitimacy,
            };
            const membersAtSnap: Character[] = characters
              .filter(c => (snap.characterFactions[c.id] ?? c.factionId) === faction.id)
              .map(c => ({
                ...c,
                pressure: snap.characterPressure[c.id] ?? c.pressure,
                influence: snap.characterInfluence[c.id] ?? c.influence,
              }));
            if (metric === 'influence') {
              return this.influenceSvc.calculateTotalInfluence(factionAtSnap, membersAtSnap, rules);
            }
            return this.influenceSvc.calculateEffectivePower(factionAtSnap, membersAtSnap, rules);
          }
        }
      }),
    }));

    return {
      labels: this.sessionLabels(snapshots),
      series,
      eventMarkers: this.buildEventMarkers(snapshots),
    };
  }

  relationshipsDataset(sourceFactionId: string): TimelineDataset {
    const snapshots = this.store.colonySnapshots();
    const sessions = this.store.sessions();
    const factions = this.store.factions().filter(f => f.active && f.type === 'Faction');
    const overrides = this.store.overrides();
    const rules = this.store.rules();
    const colonyState = this.store.colonyState();

    if (!rules) {
      return { labels: this.sessionLabels(snapshots), series: [], eventMarkers: [] };
    }

    const partyActor: ScoringActor = {
      id: 'party',
      values: colonyState?.partyValues ?? { a: 1/3, b: 1/3, c: 1/3 },
      beliefc: colonyState?.partyBeliefc,
      beliefa: colonyState?.partyBeliefa,
      beliefb: colonyState?.partyBeliefb,
    };
    const partyLabel = colonyState?.partyName ?? 'Party';

    type Target = { id: string; label: string; actor: ScoringActor };

    let sourceActor: ScoringActor;
    let targets: Target[];

    if (sourceFactionId === 'party') {
      sourceActor = partyActor;
      targets = factions.map(f => ({
        id: f.id,
        label: f.name,
        actor: { id: f.id, values: f.values, beliefc: f.beliefc, beliefa: f.beliefa, beliefb: f.beliefb } as ScoringActor,
      }));
    } else {
      const sourceFaction = factions.find(f => f.id === sourceFactionId);
      if (!sourceFaction) {
        return { labels: this.sessionLabels(snapshots), series: [], eventMarkers: [] };
      }
      sourceActor = {
        id: sourceFaction.id,
        values: sourceFaction.values,
        beliefc: sourceFaction.beliefc,
        beliefa: sourceFaction.beliefa,
        beliefb: sourceFaction.beliefb,
      };
      targets = [
        ...factions
          .filter(f => f.id !== sourceFactionId)
          .map(f => ({
            id: f.id,
            label: f.name,
            actor: { id: f.id, values: f.values, beliefc: f.beliefc, beliefa: f.beliefa, beliefb: f.beliefb } as ScoringActor,
          })),
        { id: 'party', label: partyLabel, actor: partyActor },
      ];
    }

    const series: TimelineSeries[] = targets.map((target, ti) => ({
      label: target.label,
      color: FACTION_PALETTE[ti % FACTION_PALETTE.length],
      data: snapshots.map(snap => {
        const persistentBump = overrides
          .filter(o => o.sourceId === sourceFactionId && o.targetId === target.id)
          .reduce((s, o) => s + o.scoreBump, 0);
        const sessionBump = sourceFactionId === 'party'
          ? (snap.factionPartyBumps[target.id] ?? 0)
          : target.id === 'party'
            ? (snap.factionPartyBumps[sourceFactionId] ?? 0)
            : (snap.factionRelationshipBumps[sourceFactionId]?.[target.id] ?? 0);
        const result = scoreRelationship(sourceActor, target.actor, snap.colonyStress, persistentBump + sessionBump, rules);
        return result.finalScore;
      }),
    }));

    return {
      labels: this.sessionLabels(snapshots),
      series,
      eventMarkers: this.buildEventMarkers(snapshots),
    };
  }

  charactersDataset(selector: CharacterSelector, metric: CharacterMetric): TimelineDataset {
    const snapshots = this.store.colonySnapshots();
    const sessions = this.store.sessions();
    const allCharacters = this.store.characters();
    const scale = this.store.rules()?.influenceConvictionScale ?? 0.5;

    let characters: Character[];
    switch (selector.type) {
      case 'single':
        characters = allCharacters.filter(c => c.id === selector.characterId);
        break;
      case 'allLeaders':
        characters = allCharacters.filter(c => c.characterType === 'FactionLeader');
        break;
      case 'factionMembers':
        characters = allCharacters.filter(c => c.factionId === selector.factionId);
        break;
    }

    const series: TimelineSeries[] = characters.map((char, ci) => ({
      label: char.name,
      color: CHARACTER_PALETTE[ci % CHARACTER_PALETTE.length],
      data: snapshots.map(snap => {
        const state = snap.characterStates[char.id] ?? char.state;
        if (state !== 'Alive') return null;

        const pressure = snap.characterPressure[char.id] ?? char.pressure;
        const influence = snap.characterInfluence[char.id] ?? char.influence;

        switch (metric) {
          case 'pressure': return pressure;
          case 'influence': return influence;
          case 'drift': {
            const factionId = snap.characterFactions[char.id] ?? char.factionId;
            const peers = allCharacters
              .filter(p => p.id !== char.id && (snap.characterFactions[p.id] ?? p.factionId) === factionId)
              .filter(p => (snap.characterStates[p.id] ?? p.state) === 'Alive')
              .map(p => ({ ...p, influence: snap.characterInfluence[p.id] ?? p.influence }));
            const effConv = char.conviction + influenceConvictionBonus(char, peers, scale);
            return effectivePressure({ pressure } as Character, snap.colonyStress) - effConv;
          }
        }
      }),
    }));

    return {
      labels: this.sessionLabels(snapshots),
      series,
      eventMarkers: this.buildEventMarkers(snapshots),
    };
  }

  analysisDataset(seriesDefs: AnalysisSeriesDef[]): TimelineDataset {
    const snapshots = this.store.colonySnapshots();
    const sessions = this.store.sessions();
    if (snapshots.length === 0 || seriesDefs.length === 0) {
      return { labels: this.sessionLabels(snapshots), series: [], eventMarkers: this.buildEventMarkers(snapshots) };
    }

    const allSeries: TimelineSeries[] = [];
    let colorIndex = 0;

    for (const def of seriesDefs) {
      if (def.metric === 'stress') {
        allSeries.push({
          label: 'Colony Stress',
          color: FACTION_PALETTE[colorIndex++ % FACTION_PALETTE.length],
          data: snapshots.map(s => s.colonyStress),
        });
        continue;
      }

      const factionMetrics: FactionMetric[] = ['momentum', 'legitimacy', 'effectivePower', 'membership', 'influence'];
      if ((factionMetrics as string[]).includes(def.metric) && def.entityId) {
        const faction = this.store.factions().find(f => f.id === def.entityId);
        if (!faction) continue;
        const sub = this.factionsDataset(def.metric as FactionMetric);
        const match = sub.series.find(s => s.label === faction.name);
        if (match) {
          allSeries.push({ ...match, color: FACTION_PALETTE[colorIndex++ % FACTION_PALETTE.length] });
        }
        continue;
      }

      const charMetrics: CharacterMetric[] = ['pressure', 'drift', 'influence'];
      if ((charMetrics as string[]).includes(def.metric) && def.entityId) {
        const sub = this.charactersDataset({ type: 'single', characterId: def.entityId }, def.metric as CharacterMetric);
        if (sub.series.length > 0) {
          allSeries.push({ ...sub.series[0], color: FACTION_PALETTE[colorIndex++ % FACTION_PALETTE.length] });
        }
      }
    }

    return {
      labels: this.sessionLabels(snapshots),
      series: allSeries,
      eventMarkers: this.buildEventMarkers(snapshots),
    };
  }
}
