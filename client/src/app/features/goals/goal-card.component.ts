import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppStore } from '../../store/app.store';
import { Character, CharacterState, FactionGoal, GoalStatus, GoalVisibility, TERMINAL_GOAL_STATUSES } from '../../core/models/types';
import { actLabel, championLoads, occupiesChampion, GoalAssessment } from '../../core/sim/goals';
import { parseAdvanceEffects, describeAdvanceEffect } from '../../core/sim/advance-effects';
import { goalStageTexts } from '../../core/sim/conditions';
import { getAncestryImagePath } from '../../core/utils/ancestry-images';
import { PriorityIconComponent } from '../../shared/priority-icon/priority-icon.component';

/**
 * One goal or assignment, at the viewed point in history: priority, title, target, World States, advance Effects,
 * the M4 overlays (Dormant, Ready to Resolve, Not yet eligible, Obsolete…), status and champion.
 * `compact` is the faction page's summary (no World States or Effects); `showFaction` names the owning faction.
 */
@Component({
  selector: 'app-goal-card',
  standalone: true,
  imports: [PriorityIconComponent, RouterLink],
  templateUrl: './goal-card.component.html',
  styleUrl: './goal-card.component.scss',
  host: { style: 'display: block' },
})
export class GoalCardComponent {
  readonly store = inject(AppStore);
  readonly goal = input.required<FactionGoal>();
  readonly editable = input(false);
  readonly compact = input(false);
  readonly showFaction = input(false);
  readonly edit = output<FactionGoal>();
  readonly actLabel = actLabel;

  readonly resolved = computed(() => TERMINAL_GOAL_STATUSES.includes(this.goal().status));
  readonly ga = computed((): GoalAssessment | undefined => this.store.viewGoalAssessments().get(this.goal().id));
  readonly faction = computed(() => this.store.factions().find(f => f.id === this.goal().factionId));
  readonly champion = computed((): Character | undefined => {
    const id = this.goal().championId;
    return id ? this.store.viewCharacters().find(c => c.id === id) : undefined;
  });

  /** Legacy duplicates: the other active goals this goal's champion holds, or null. Informational only. */
  readonly alsoChampions = computed((): string | null => {
    const g = this.goal();
    if (!g.championId) return null;
    const others = (championLoads(this.store.factionGoals()).get(g.championId) ?? []).filter(x => x.id !== g.id);
    return others.length && occupiesChampion(this.store.factionGoals().find(x => x.id === g.id) ?? g)
      ? others.map(x => `"${x.title}"`).join(', ') : null;
  });

  readonly targetLabel = computed((): string => {
    const g = this.goal();
    if (!g.targetEntityType || !g.targetEntityId) return '';
    const name = g.targetEntityType === 'Character' ? (this.store.characters().find(c => c.id === g.targetEntityId)?.name ?? g.targetEntityId)
      : g.targetEntityType === 'Asset' ? (this.store.assets().find(a => a.id === g.targetEntityId)?.name ?? `⚠ missing Asset ${g.targetEntityId}`)
      : this.factionName(g.targetEntityId);
    if (g.targetEntityType === 'Faction' && g.targetProperty && g.targetOperator && g.targetThreshold != null) {
      const op = g.targetOperator === 'gte' ? '≥' : g.targetOperator === 'lte' ? '≤' : '=';
      return `⚠ ${name} ${g.targetProperty} ${op} ${g.targetThreshold} (legacy target: not auto-detected)`;   // M2
    }
    if (g.targetEntityType === 'Asset' && g.targetOwnerFactionId) return `${name} controlled by ${this.factionName(g.targetOwnerFactionId)}`;
    if (g.targetState) return `${name} → ${g.targetState}`;
    return name;
  });

  /** 2026-10-26: what becomes true at Progressing and at Accomplished, from the World Conditions the goal drives. */
  readonly worldWhenProgressing = computed(() => goalStageTexts(this.store.worldConditions(), this.goal().id, 'Progressing'));
  readonly worldWhenComplete = computed(() => goalStageTexts(this.store.worldConditions(), this.goal().id, 'Accomplished'));

  /** §18.11: each advance Effect in words. */
  readonly onProgressing = computed(() => this.effectLines(this.goal().progressingEffectsJson));
  readonly onAccomplished = computed(() => this.effectLines(this.goal().accomplishedEffectsJson));
  private effectLines(json: string | undefined): string[] {
    const n = {
      asset: (id: string) => this.store.assets().find(a => a.id === id)?.name ?? 'an unknown Asset',
      character: (id: string) => this.store.characters().find(c => c.id === id)?.name ?? 'an unknown character',
      faction: (id: string) => this.factionName(id),
      location: (id: string) => this.store.locations().find(l => l.id === id)?.name ?? 'an unknown Location',
    };
    return parseAdvanceEffects(json).map(e => describeAdvanceEffect(e, n));
  }

  factionName(id: string): string { return this.store.factions().find(f => f.id === id)?.name ?? id; }

  /** §18.3 attribution: a faction, the party, a participant, or not recorded. */
  accomplisherName(id: string | null | undefined): string {
    if (!id) return 'not recorded';
    if (id === 'party') return 'Party';
    return this.store.factions().find(f => f.id === id)?.name ?? this.store.characters().find(c => c.id === id)?.name ?? id;
  }

  statusLabel(g: FactionGoal): string {
    if (g.conditionType === 'Maintain') return ({ Progressing: 'Maintaining', Stalled: 'At Risk' } as Partial<Record<GoalStatus, string>>)[g.status] ?? g.status;
    return g.status === 'Plotting' ? 'Planning' : g.status;
  }
  statusIcon(g: FactionGoal): string {
    switch (this.statusLabel(g)) {
      case 'Planning': return 'fa-compass-drafting';
      case 'Stalled': return 'fa-road-barrier';
      case 'At Risk': return 'fa-triangle-exclamation';
      default: return 'fa-ellipsis';
    }
  }
  statusClass(g: FactionGoal): string {
    switch (this.statusLabel(g)) {
      case 'Planning': return 'status-plotting';
      case 'Progressing': case 'Maintaining': return 'status-progressing';
      case 'Stalled': case 'At Risk': return 'status-stalled';
      default: return '';
    }
  }
  visibilityClass(v: GoalVisibility): string { return ({ Open: 'visibility-open', Known: 'visibility-known', Secret: 'visibility-secret' })[v]; }
  isChampionInactive(c: Character): boolean { return c.state === 'Dead' || c.state === 'Forgotten'; }
  championPortrait(c: Character): string { return c.portraitPath ?? getAncestryImagePath(c.ancestry, c.gender); }
  stateIconClass(state: CharacterState): string {
    const icon = ({ Alive: '', Dead: 'fa-solid fa-skull', Missing: 'fa-solid fa-circle-question', Forgotten: 'fa-solid fa-hourglass-start' } as Record<CharacterState, string>)[state];
    return icon ? `state-icon ${icon} state-icon--${state.toLowerCase()}` : '';
  }
}
