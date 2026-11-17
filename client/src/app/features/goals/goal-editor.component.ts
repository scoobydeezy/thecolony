import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { AppStore } from '../../store/app.store';
import {
  FactionGoal, GoalStatus, GoalConditionType, GoalPriority, GoalVisibility, GoalTargetEntityType, GoalTargetOperator, GoalOutcomeMode,
  TERMINAL_GOAL_STATUSES, GOAL_PRIORITY_OPTIONS, GOAL_VISIBILITY_OPTIONS, CHARACTER_TARGET_STATES, ASSET_TARGET_STATES, FACTION_TARGET_PROPS,
} from '../../core/models/types';
import { championOptions } from '../../core/sim/goals';
import { AdvanceEffectsEditorComponent } from '../../shared/advance-effects-editor/advance-effects-editor.component';
import { GOAL_STAGE_OPTIONS, conditionsDrivenBy, requirementsOf, variesByOf } from '../../core/sim/conditions';
import { AdvanceEffect, AdvanceTargetType, parseAdvanceEffects, normalizeAdvanceEffect, advanceEffectIssue } from '../../core/sim/advance-effects';

const normalizedEffectsJson = (json: string): string =>
  JSON.stringify(parseAdvanceEffects(json).map(normalizeAdvanceEffect).filter(e => e !== null));

interface GoalFormModel {
  id: string;
  factionId: string;
  title: string;
  status: GoalStatus;
  conditionType: GoalConditionType;
  priority: GoalPriority;
  visibility: GoalVisibility;
  targetEntityType: GoalTargetEntityType | '';
  targetEntityId: string;
  targetState: string;
  targetOwnerFactionId: string;
  championId: string;
  targetProperty: string;
  targetOperator: GoalTargetOperator | '';
  targetThreshold: string;
  // M4 (simplified): Auto-Resolve (Achieve only). What becomes true lives in the World Conditions the goal drives.
  outcomeMode: GoalOutcomeMode;
  progressingEffectsJson: string;    // §18.11: AdvanceEffect[] (JSON) written at Planning → Progressing
  accomplishedEffectsJson: string;   // §18.11: AdvanceEffect[] (JSON) written at Accomplished
  earliestAct: string;   // §18.6: '1' | '2' | '3'
}

const emptyGoalForm = (factionId = ''): GoalFormModel => ({
  id: '', factionId, title: '',
  status: 'Plotting', conditionType: 'Achieve', priority: 'Major', visibility: 'Known',
  targetEntityType: '', targetEntityId: '',
  targetState: '', targetOwnerFactionId: '', championId: '', targetProperty: '', targetOperator: '', targetThreshold: '',
  outcomeMode: 'Automatic', progressingEffectsJson: '[]', accomplishedEffectsJson: '[]', earliestAct: '2',
});

const toGoalFormModel = (g: FactionGoal): GoalFormModel => ({
  id: g.id, factionId: g.factionId, title: g.title,
  status: g.status,
  conditionType: g.conditionType ?? 'Achieve',
  priority: g.priority, visibility: g.visibility,
  targetEntityType: g.targetEntityType ?? '',
  targetEntityId: g.targetEntityId ?? '',
  targetState: g.targetState ?? '',
  targetOwnerFactionId: g.targetOwnerFactionId ?? '',
  championId: g.championId ?? '',
  targetProperty: g.targetProperty ?? '',
  targetOperator: g.targetOperator ?? '',
  targetThreshold: g.targetThreshold != null ? g.targetThreshold.toString() : '',
  outcomeMode: g.outcomeMode ?? 'Automatic',
  progressingEffectsJson: g.progressingEffectsJson || '[]', accomplishedEffectsJson: g.accomplishedEffectsJson || '[]',
  earliestAct: String(g.earliestAct ?? 2),
});

const fromGoalFormModel = (fm: GoalFormModel): FactionGoal => ({
  id: fm.id, campaignId: '', factionId: fm.factionId,
  title: fm.title.trim(),
  status: fm.status, conditionType: fm.conditionType, priority: fm.priority, visibility: fm.visibility,
  targetEntityType: fm.targetEntityType || undefined,
  targetEntityId: fm.targetEntityId || undefined,
  targetState: (fm.targetEntityType === 'Character' || (fm.targetEntityType === 'Asset' && !fm.targetOwnerFactionId)) && fm.targetState ? fm.targetState : undefined,
  targetOwnerFactionId: fm.targetEntityType === 'Asset' && fm.targetOwnerFactionId ? fm.targetOwnerFactionId : undefined,
  championId: fm.championId || undefined,
  targetProperty: fm.targetEntityType === 'Faction' && fm.targetProperty ? fm.targetProperty : undefined,
  targetOperator: fm.targetEntityType === 'Faction' && fm.targetOperator ? fm.targetOperator as GoalTargetOperator : undefined,
  targetThreshold: fm.targetEntityType === 'Faction' && fm.targetThreshold ? parseInt(fm.targetThreshold, 10) : undefined,
  // Maintain assignments have no Auto-Resolve
  outcomeMode: fm.conditionType === 'Achieve' ? fm.outcomeMode : 'Automatic',
  // §18.11: Achieve goals only; saved as normalized Effects (the editor blocks Save while any row is incomplete)
  progressingEffectsJson: fm.conditionType === 'Achieve' ? normalizedEffectsJson(fm.progressingEffectsJson) : '[]',
  accomplishedEffectsJson: fm.conditionType === 'Achieve' ? normalizedEffectsJson(fm.accomplishedEffectsJson) : '[]',
  earliestAct: Math.min(3, Math.max(1, parseInt(fm.earliestAct, 10) || 2)),
});

/**
 * The goal editor (moved from the faction page; used by the Goals page and the faction page). Create it when opening:
 * `goal` = the goal to edit, or null for a new one; `factionId` presets a new goal's faction (else the GM chooses).
 */
@Component({
  selector: 'app-goal-editor',
  standalone: true,
  imports: [FormField, AdvanceEffectsEditorComponent],
  templateUrl: './goal-editor.component.html',
  styleUrl: './goal-editor.component.scss',
})
export class GoalEditorComponent implements OnInit {
  readonly store = inject(AppStore);
  readonly goal = input<FactionGoal | null>(null);
  readonly factionId = input<string | null>(null);
  /** A new goal's starting slot (from the planning grid): its priority and Earliest Act. */
  readonly preset = input<{ priority?: GoalPriority; earliestAct?: number } | null>(null);
  readonly closed = output<void>();

  readonly goalModel = signal<GoalFormModel>(emptyGoalForm());
  /** 2026-10-26: the World Conditions this goal drives (by its stage), each with the stages it is written for. */
  readonly drivenConditions = computed(() => {
    const id = this.goalModel().id;
    return id ? conditionsDrivenBy(this.store.worldConditions(), id).map(c => {
      const vb = variesByOf(c);
      const stages = vb ? vb.rows.filter(r => r.text.trim()).map(r => r.state)
        : requirementsOf(c).flatMap(r => r.kind === 'goalStage' && r.goalId === id ? r.stages : []);
      return { title: c.title, stages: stages.map(s => GOAL_STAGE_OPTIONS.find(o => o.value === s)?.label ?? s).join(', ') };
    }) : [];
  });
  readonly goalForm = form(this.goalModel);

  ngOnInit(): void {
    const g = this.goal();
    const p = this.preset();
    this.goalModel.set(g ? toGoalFormModel(g) : { ...emptyGoalForm(this.factionId() ?? ''),
      ...(p?.priority ? { priority: p.priority } : {}), ...(p?.earliestAct ? { earliestAct: String(p.earliestAct) } : {}) });
  }

  readonly factionChoices = computed(() => this.store.factions().filter(f => f.active && f.type === 'Faction'));
  setFaction(id: string): void { this.goalModel.update(f => ({ ...f, factionId: id, championId: '' })); }
  setEarliestAct(v: string): void { this.goalModel.update(f => ({ ...f, earliestAct: v })); }

  /** Status as a progress control: Achieve goals move Planning → Progressing → Accomplished; a Maintain assignment
   *  is simply in force (its Active / Inactive is derived). Failed and Retired are administrative ends. */
  readonly goalProgressSteps = computed<{ value: GoalStatus; label: string }[]>(() =>
    this.goalModel().conditionType === 'Maintain'
      ? [{ value: this.goalModel().status === 'Plotting' ? 'Plotting' : 'Progressing', label: 'In force' }]
      : [{ value: 'Plotting', label: 'Planning' }, { value: 'Progressing', label: 'Progressing' }, { value: 'Accomplished', label: 'Accomplished' }]);
  readonly goalEndSteps: { value: GoalStatus; label: string }[] = [{ value: 'Failed', label: 'Failed' }, { value: 'Retired', label: 'Retired' }];

  // ── §18.8 champions: one active assignment per character ────────────────
  /** The champion dropdown: living faction members who champion no other active goal or assignment, plus the goal's
   *  current champion (kept even if legacy data assigns them elsewhere too). Updates as assignments change. */
  readonly championChoices = computed(() => {
    const m = this.goalModel();
    if (!m.factionId) return [];
    const stored = this.store.factionGoals().find(g => g.id === m.id);
    const keep = new Set([stored?.championId, m.championId].filter(Boolean) as string[]);
    const opts = championOptions({ id: m.id, factionId: m.factionId, championId: stored?.championId }, this.store.characters(), this.store.factionGoals());
    return [...opts, ...this.store.characters().filter(c => keep.has(c.id) && !opts.includes(c))];
  });

  setGoalStatus(status: GoalStatus): void { this.goalModel.update(f => ({ ...f, status })); }
  setAutoResolve(on: boolean): void { this.goalModel.update(f => ({ ...f, outcomeMode: on ? 'Automatic' : 'Adjudicated' })); }
  onConditionTypeChange(conditionType: GoalConditionType): void {
    // a Maintain assignment has no progression; an Achieve goal starts in Planning
    this.goalModel.update(f => ({ ...f, conditionType }));
    this.goalModel.update(f => ({ ...f, status: TERMINAL_GOAL_STATUSES.includes(f.status) ? f.status : f.conditionType === 'Maintain' ? 'Progressing' : 'Plotting',
                                  targetState: '', targetOwnerFactionId: '', targetProperty: '', targetOperator: '', targetThreshold: '',
                                  targetEntityType: f.conditionType === 'Maintain' && f.targetEntityType === 'Faction' ? '' : f.targetEntityType,
                                  targetEntityId: f.conditionType === 'Maintain' && f.targetEntityType === 'Faction' ? '' : f.targetEntityId }));
  }

  readonly priorityOptions  = GOAL_PRIORITY_OPTIONS;
  readonly visibilityOptions = GOAL_VISIBILITY_OPTIONS;
  readonly conditionTypeOptions: { value: GoalConditionType; label: string }[] = [
    { value: 'Achieve',  label: 'Achieve'  },
    { value: 'Maintain', label: 'Maintain' },
  ];
  readonly factionTargetProps = [...FACTION_TARGET_PROPS];

  readonly goalTargetStateOptions = computed<string[]>(() => {
    const t = this.goalModel().targetEntityType;
    if (t === 'Character') return [...CHARACTER_TARGET_STATES];
    if (t === 'Asset')     return [...ASSET_TARGET_STATES];
    return [];
  });

  readonly goalTargetEntityOptions = computed<{ id: string; name: string }[]>(() => {
    const t = this.goalModel().targetEntityType;
    if (t === 'Character') return this.store.characters().map(c => ({ id: c.id, name: c.name }));
    if (t === 'Asset')     return this.store.assets().map(a => ({ id: a.id, name: a.name }));
    if (t === 'Faction')   return this.store.factions().filter(f => f.active).map(f => ({ id: f.id, name: f.name }));
    return [];
  });

  resetTargetFields(): void {
    this.goalModel.update(f => ({
      ...f, targetEntityId: '', targetState: '', targetOwnerFactionId: '',
      targetProperty: '', targetOperator: '', targetThreshold: '',
    }));
  }

  onAssetConditionModeChange(mode: 'status' | 'ownership'): void {
    if (mode === 'ownership') {
      this.goalModel.update(f => ({ ...f, targetState: '', targetOwnerFactionId: f.factionId }));
    } else {
      this.goalModel.update(f => ({ ...f, targetOwnerFactionId: '', targetState: '' }));
    }
  }

  // ── §18.11 advance Effects ──────────────────────────────────────────────
  readonly goalProgressingEffects = computed(() => parseAdvanceEffects(this.goalModel().progressingEffectsJson));
  readonly goalAccomplishedEffects = computed(() => parseAdvanceEffects(this.goalModel().accomplishedEffectsJson));
  /** The goal's own target, as the default for a new Effect row. */
  readonly goalEffectDefaultTarget = computed((): { type: AdvanceTargetType; id: string } | null => {
    const m = this.goalModel();
    return m.targetEntityId && (m.targetEntityType === 'Asset' || m.targetEntityType === 'Character')
      ? { type: m.targetEntityType === 'Asset' ? 'asset' : 'character', id: m.targetEntityId } : null;
  });
  readonly goalEffectsIncomplete = computed(() => this.goalModel().conditionType === 'Achieve'
    && [...this.goalProgressingEffects(), ...this.goalAccomplishedEffects()].some(e => advanceEffectIssue(e) !== null));
  setGoalEffects(which: 'progressing' | 'accomplished', list: AdvanceEffect[]): void {
    const json = JSON.stringify(list);
    this.goalModel.update(f => which === 'progressing' ? { ...f, progressingEffectsJson: json } : { ...f, accomplishedEffectsJson: json });
  }

  close(): void { this.closed.emit(); }

  saveGoal(): void {
    const fm = this.goalModel();
    if (!fm.title.trim() || !fm.factionId || this.goalEffectsIncomplete()) return;
    const goal = fromGoalFormModel(fm);
    if (goal.status === 'Retired') goal.championId = undefined;   // ruling: a retired goal's champion is unassigned
    this.store.saveFactionGoal(goal);
    this.close();
  }

  remove(): void {
    const id = this.goalModel().id;
    if (!id || !confirm('Delete this goal?')) return;
    this.store.deleteFactionGoal(id);
    this.close();
  }
}
