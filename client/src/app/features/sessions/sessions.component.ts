import { downloadBlob } from '../../core/utils/csv-export';
import { Component, inject, signal, computed } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { AppStore } from '../../store/app.store';
import { ToastService, ImportTally } from '../../core/services/toast.service';
import {
  Session, CampaignEvent, EventEffect, ColonyImpact, CharacterState, ColonySnapshot,
  FactionGoal, GoalReady, GoalStatus, TERMINAL_GOAL_STATUSES,
  FACTION_EFFECT_PROPS, CHARACTER_EFFECT_PROPS,
  ASSET_EFFECT_PROPS, GOAL_EFFECT_PROPS, LOCATION_EFFECT_PROPS, CONDITION_EFFECT_PROPS, EffectPropDescriptor,
} from '../../core/models/types';

// ── Session form model ────────────────────────────────────────────────────────
interface SessionFormModel {
  id: string; number: string; title: string;
  act: string; week: string; date: string; summary: string;
}

const emptySessionForm = (number = 1, act = 1, week = 1): SessionFormModel =>
  ({ id: '', number: number.toString(), title: '', act: act.toString(), week: week.toString(), date: '', summary: '' });

const toSessionFormModel = (s: Session): SessionFormModel =>
  ({ id: s.id, number: s.number.toString(), title: s.title ?? '', act: s.act.toString(), week: s.week.toString(), date: s.date ?? '', summary: s.summary ?? '' });

const fromSessionFormModel = (fm: SessionFormModel): Session =>
  ({ id: fm.id, number: parseInt(fm.number, 10) || 1, title: fm.title, act: parseInt(fm.act, 10) || 1, week: parseInt(fm.week, 10) || 1, date: fm.date || undefined, summary: fm.summary, events: [] });

// ── Event form model ──────────────────────────────────────────────────────────
interface EventFormModel {
  id: string; sessionId: string; title: string; description: string; sortOrder: string;
}

const emptyEventForm = (sessionId: string, sortOrder: number): EventFormModel =>
  ({ id: '', sessionId, title: '', description: '', sortOrder: sortOrder.toString() });

const toEventFormModel = (ev: CampaignEvent): EventFormModel =>
  ({ id: ev.id, sessionId: ev.sessionId, title: ev.title ?? '', description: ev.description ?? '', sortOrder: ev.sortOrder.toString() });

function emptyEvent(sessionId: string, sortOrder: number): Omit<CampaignEvent, 'id'> {
  return { sessionId, title: '', description: '', sortOrder, effects: [] };
}

function computeImpact(events: CampaignEvent[]): ColonyImpact {
  const impact: ColonyImpact = {
    momentumChanges: [],
    powerModifierChanges: [],
    characterDeaths: [],
    defections: [],
    factionRelationshipChanges: [],
    partyRelationshipChanges: [],
    characterStateChanges: [],
    characterFactionChanges: [],
  };
  for (const ev of events) {
    for (const ef of ev.effects) {
      if (ef.targetType === 'faction') {
        if (ef.property === 'momentum') {
          const entry = impact.momentumChanges.find(m => m.factionId === ef.targetId);
          if (entry) entry.delta += ef.delta;
          else impact.momentumChanges.push({ factionId: ef.targetId, delta: ef.delta });
        } else if (ef.property === 'powerModifier') {
          const entry = impact.powerModifierChanges.find(m => m.factionId === ef.targetId);
          if (entry) entry.delta += ef.delta;
          else impact.powerModifierChanges.push({ factionId: ef.targetId, delta: ef.delta });
        } else if (ef.property === 'relationshipBump' && ef.secondaryTargetId) {
          const entry = impact.factionRelationshipChanges.find(r => r.sourceId === ef.targetId && r.targetId === ef.secondaryTargetId);
          if (entry) entry.delta += ef.delta;
          else impact.factionRelationshipChanges.push({ sourceId: ef.targetId, targetId: ef.secondaryTargetId, delta: ef.delta });
        } else if (ef.property === 'partyRelationshipBump') {
          const entry = impact.partyRelationshipChanges.find(r => r.factionId === ef.targetId);
          if (entry) entry.delta += ef.delta;
          else impact.partyRelationshipChanges.push({ factionId: ef.targetId, delta: ef.delta });
        }
      } else if (ef.targetType === 'character') {
        if (ef.property === 'state' && ef.value) {
          const state = ef.value as CharacterState;
          if (state === 'Dead') impact.characterDeaths.push(ef.targetId);
          // replace any prior state change for the same character this session
          const idx = impact.characterStateChanges.findIndex(s => s.characterId === ef.targetId);
          if (idx >= 0) impact.characterStateChanges[idx] = { characterId: ef.targetId, state };
          else impact.characterStateChanges.push({ characterId: ef.targetId, state });
        } else if (ef.property === 'factionChange' && ef.value !== undefined) {
          const idx = impact.characterFactionChanges.findIndex(f => f.characterId === ef.targetId);
          if (idx >= 0) impact.characterFactionChanges[idx] = { characterId: ef.targetId, newFactionId: ef.value };
          else impact.characterFactionChanges.push({ characterId: ef.targetId, newFactionId: ef.value });
        }
      }
    }
  }
  return impact;
}

import { defaultEffectValue, defaultEffectDelta, usesDelta } from './effect-defaults';
import { MomentumResolution } from '../../core/sim/momentum';
import { ColonyTurnCardComponent } from './colony-turn-card.component';
import { WorldConditionsSummaryComponent } from './world-conditions-summary.component';
import { evaluateConditions, conditionWorldAt, conditionChanges as diffConditions, ConditionStatus, goalStageTexts } from '../../core/sim/conditions';
import { projectGoals, projectCharacters } from '../../core/sim/replay';
import { stateAfterTurnEvent } from '../../core/sim/colony-turn';
import { declaredResolutionEffects, championOptions } from '../../core/sim/goals';

const DECISIVE_EVENT_TITLE = 'Resolutions';
@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [FormField, ColonyTurnCardComponent, WorldConditionsSummaryComponent],
  templateUrl: './sessions.component.html',
  styleUrl: './sessions.component.scss'
})
export class SessionsComponent {
  store = inject(AppStore);
  private readonly toast = inject(ToastService);

  // ── Session modal ────────────────────────────────────────────────────────
  showSessionModal = signal(false);
  readonly editingSession = signal<SessionFormModel>(emptySessionForm());
  readonly fs = form(this.editingSession);

  openAddSession(): void {
    const cs = this.store.colonyState();
    const sessions = this.store.sortedSessions();
    const lastSession = sessions.length > 0 ? sessions[0] : null;
    const nextNumber = lastSession ? lastSession.number + 1 : 1;
    const nextAct    = lastSession ? lastSession.act  : (cs?.act  ?? 1);
    const nextWeek   = lastSession ? lastSession.week + 1 : (cs?.week ?? 1);
    this.editingSession.set(emptySessionForm(nextNumber, nextAct, nextWeek));
    this.showSessionModal.set(true);
  }

  openEditSession(session: Session): void {
    this.editingSession.set(toSessionFormModel(session));
    this.showSessionModal.set(true);
  }

  closeSessionModal(): void { this.showSessionModal.set(false); }

  saveSession(): void {
    const fm = this.editingSession();
    if (!fm.title.trim()) return;
    // preserve existing events when editing
    const existing = this.store.sessions().find(s => s.id === fm.id);
    const toSave = { ...fromSessionFormModel(fm), events: existing?.events ?? [] };
    this.store.saveSession(toSave);
    this.showSessionModal.set(false);
  }

  deleteSession(id: string): void {
    this.store.deleteSession(id);
  }

  // ── Event modal ──────────────────────────────────────────────────────────
  showEventModal = signal(false);
  readonly editingEvent = signal<EventFormModel>(emptyEventForm('', 0));
  readonly fe = form(this.editingEvent);

  openAddEvent(sessionId: string): void {
    const session = this.store.sessions().find(s => s.id === sessionId);
    const nextOrder = session?.events?.length ?? 0;
    const ev: CampaignEvent = {
      id: '',
      sessionId,
      title: 'New Event',
      description: undefined,
      sortOrder: nextOrder,
      effects: [],
    };
    this.store.saveEvent(ev);
  }

  openEditEvent(ev: CampaignEvent): void {
    this.editingEvent.set(toEventFormModel(ev));
    this.showEventModal.set(true);
  }

  closeEventModal(): void { this.showEventModal.set(false); }

  saveEvent(): void {
    const fm = this.editingEvent();
    if (!fm.title.trim()) return;
    const existingEffects = fm.id
      ? (this.store.sessions().flatMap(s => s.events ?? []).find(e => e.id === fm.id)?.effects ?? [])
      : [];
    const toSave: CampaignEvent = {
      id: fm.id,
      sessionId: fm.sessionId,
      title: fm.title,
      description: fm.description || undefined,
      sortOrder: parseInt(fm.sortOrder, 10) || 0,
      effects: existingEffects,
    };
    this.store.saveEvent(toSave);
    this.showEventModal.set(false);
  }

  deleteEvent(sessionId: string, eventId: string): void {
    this.store.deleteEvent(sessionId, eventId);
  }

  // ── Inline effect editing ────────────────────────────────────────────────
  inlineEffects = signal<Record<string, Partial<EventEffect>[]>>({});

  descriptorsFor(targetType: string): EffectPropDescriptor[] {
    if (targetType === 'colony') return [];   // §18.10: no Colony Effect is authored (Stress is derived from World Conditions)
    if (targetType === 'character') return CHARACTER_EFFECT_PROPS;
    if (targetType === 'asset') return ASSET_EFFECT_PROPS;
    if (targetType === 'goal') return GOAL_EFFECT_PROPS;
    if (targetType === 'location') return LOCATION_EFFECT_PROPS;
    if (targetType === 'condition') return CONDITION_EFFECT_PROPS;
    return FACTION_EFFECT_PROPS;
  }

  descriptor(targetType: string, property: string | undefined): EffectPropDescriptor | undefined {
    return this.descriptorsFor(targetType).find(d => d.property === property);
  }

  isStringProperty(targetType: string, property: string | undefined): boolean {
    const d = this.descriptor(targetType, property);
    return d?.inputType === 'select' || d?.inputType === 'none'
        || d?.inputType === 'faction-select' || d?.inputType === 'participate'
        || d?.inputType === 'location-select';
  }

  needsSecondaryTarget(property: string | undefined): boolean {
    return FACTION_EFFECT_PROPS.find(d => d.property === property)?.needsSecondaryTarget ?? false;
  }

  addInlineEffect(eventId: string): void {
    this.inlineEffects.update(map => ({
      ...map,
      [eventId]: [...(map[eventId] ?? []), { targetType: 'faction', targetId: '', property: 'momentumSignal', delta: 1, value: '' }]
    }));
  }

  updateInlineEffect(eventId: string, index: number, field: string, value: string | number): void {
    this.inlineEffects.update(map => {
      const effects = [...(map[eventId] ?? [])];
      effects[index] = { ...effects[index], [field]: value };
      if (field === 'targetType') {
        const descs = this.descriptorsFor(value as string);
        const firstProp = descs[0]?.property ?? 'momentumSignal';
        effects[index] = {
          ...effects[index],
          property: firstProp,
          targetId: value === 'colony' ? 'colony' : '',
          secondaryTargetId: undefined,
          actorFactionId: undefined,
          value: defaultEffectValue(descs[0]),   // D10: match what the select displays
          delta: defaultEffectDelta(descs[0]),
        };
      }
      if (field === 'property') {
        const d = this.descriptor(effects[index].targetType ?? 'faction', value as string);
        effects[index] = {
          ...effects[index],
          secondaryTargetId: undefined,
          actorFactionId: undefined,
          value: defaultEffectValue(d),
          delta: defaultEffectDelta(d, effects[index].delta ?? 0),
        };
      }
      return { ...map, [eventId]: effects };
    });
  }

  removeInlineEffect(eventId: string, index: number): void {
    this.inlineEffects.update(map => ({
      ...map,
      [eventId]: (map[eventId] ?? []).filter((_, i) => i !== index)
    }));
  }

  saveInlineEffect(eventId: string, index: number): void {
    const draft = (this.inlineEffects()[eventId] ?? [])[index];
    const noTargetTypes = ['colony'];
    if (!draft || (!noTargetTypes.includes(draft.targetType ?? '') && !draft.targetId)) return;
    if (this.needsSecondaryTarget(draft.property) && !draft.secondaryTargetId) return;
    // participate requires secondaryTargetId (actor) and value (role)
    if (draft.property === 'participate' && (!draft.secondaryTargetId || !draft.value)) return;
    // M3: a Momentum Signal needs a reason; its delta is the sign
    if (draft.property === 'momentumSignal' && (!draft.value?.trim() || !draft.delta)) return;

    const session = this.store.sessions().find(s => s.events?.some(e => e.id === eventId));
    const ev = session?.events?.find(e => e.id === eventId);
    if (!ev) return;

    const d = this.descriptor(draft.targetType ?? 'faction', draft.property);
    const newEffect: EventEffect = {
      id: '',
      eventId,
      targetType: draft.targetType ?? 'faction',
      targetId: draft.targetId ?? '',
      property: draft.property ?? 'momentumSignal',
      delta: d?.inputType === 'signal' ? Math.sign(Number(draft.delta)) : !usesDelta(d) ? 0 : Number(draft.delta ?? 0),
      value: d?.inputType === 'signal' ? draft.value?.trim() : draft.value,
      secondaryTargetId: draft.secondaryTargetId,
      actorFactionId: draft.actorFactionId,
    };

    const updated: CampaignEvent = { ...ev, effects: [...ev.effects, newEffect] };
    this.store.saveEvent(updated);
    this.removeInlineEffect(eventId, index);
  }

  deleteEffect(ev: CampaignEvent, effectId: string): void {
    const updated: CampaignEvent = { ...ev, effects: ev.effects.filter(ef => ef.id !== effectId) };
    this.store.saveEvent(updated);
  }

  deltaStep(draft: Partial<EventEffect>): number {
    return draft.property === 'stress' ? 1 : 10;
  }

  effectLabel(ef: EventEffect): string {
    if (ef.property === 'state') return `→ ${ef.value ?? '?'}`;
    if (ef.property === 'factionChange') {
      return ef.value ? `→ ${this.factionName(ef.value)}` : '→ None';
    }
    if (ef.property === 'locationChange') {
      return ef.value ? `→ ${this.locationName(ef.value)}` : '→ None';
    }
    if (ef.property === 'controllingFactionId') {
      return ef.value ? `→ ${this.factionName(ef.value)}` : '→ Uncontrolled';
    }
    if (ef.targetType === 'asset' && ef.property === 'status') {
      const actor = ef.actorFactionId ? ` by ${this.actorName(ef.actorFactionId)}` : '';
      return `→ ${ef.value ?? '?'}${actor}`;
    }
    if (ef.property === 'relationshipBump') {
      return `↔ ${this.factionName(ef.secondaryTargetId ?? '')} ${ef.delta > 0 ? '+' : ''}${ef.delta}`;
    }
    if (ef.property === 'partyRelationshipBump') {
      return `↔ Party ${ef.delta > 0 ? '+' : ''}${ef.delta}`;
    }
    if (ef.property === 'championChange') return ef.value ? `champion → ${this.characterName(ef.value)}` : 'champion unassigned';
    if (ef.property === 'leaderChange') return ef.value ? `leader → ${this.characterName(ef.value)}` : 'leaderless';
    if (ef.property === 'readyToResolve') return ef.value === 'Ready' ? 'Ready to Resolve' : 'remains Progressing';
    if (ef.property === 'momentumSignal') return `${ef.delta > 0 ? '+1' : '−1'} · ${ef.value ?? ''}`;
    if (ef.property === 'momentum') return `raw ${ef.delta > 0 ? '+' : ''}${ef.delta} (archived)`;   // legacy, pre-M3
    if (ef.property === 'participate') {
      const actor = this.actorName(ef.secondaryTargetId ?? '');
      return `${actor} ${ef.value ?? '?'} (${ef.delta > 0 ? '+' : ''}${ef.delta})`;
    }
    return `${ef.property} ${ef.delta > 0 ? '+' : ''}${ef.delta}`;
  }

  // ── Drag-and-drop reordering ─────────────────────────────────────────────
  dragSessionId = signal<string | null>(null);
  dragEventId = signal<string | null>(null);

  onDragStart(sessionId: string, eventId: string, event: DragEvent): void {
    this.dragSessionId.set(sessionId);
    this.dragEventId.set(eventId);
    event.dataTransfer?.setData('text/plain', eventId);
    (event.target as HTMLElement).classList.add('dragging');
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
  }

  onDrop(sessionId: string, targetEventId: string, event: DragEvent): void {
    event.preventDefault();
    const srcId = this.dragEventId();
    if (!srcId || srcId === targetEventId || this.dragSessionId() !== sessionId) return;

    const session = this.store.sessions().find(s => s.id === sessionId);
    if (!session) return;

    const sorted = [...(session.events ?? [])]
      .filter(e => !e.isSynthetic)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const srcIdx = sorted.findIndex(e => e.id === srcId);
    const tgtIdx = sorted.findIndex(e => e.id === targetEventId);
    if (srcIdx === -1 || tgtIdx === -1) return;

    const reordered = [...sorted];
    const [moved] = reordered.splice(srcIdx, 1);
    reordered.splice(tgtIdx, 0, moved);

    this.store.reorderEvents(sessionId, reordered.map(e => e.id));
    this.dragEventId.set(null);
    this.dragSessionId.set(null);
  }

  onDragEnd(event: DragEvent): void {
    (event.target as HTMLElement).classList.remove('dragging');
    this.dragEventId.set(null);
    this.dragSessionId.set(null);
  }

  // ── Computed helpers ─────────────────────────────────────────────────────
  sortedEvents(session: Session): CampaignEvent[] {
    return [...(session.events ?? [])]
      .filter(e => !e.isSynthetic && e.kind !== 'ColonyTurn')   // M5: the Colony Turn card owns its Event
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  sessionImpact(session: Session): ColonyImpact {
    return computeImpact((session.events ?? []).filter(e => !e.isSynthetic));
  }

  momentumGained(impact: ColonyImpact): number {
    return impact.momentumChanges.filter(m => m.delta > 0).reduce((s, m) => s + m.delta, 0);
  }

  momentumLost(impact: ColonyImpact): number {
    return impact.momentumChanges.filter(m => m.delta < 0).reduce((s, m) => s + m.delta, 0);
  }

  factionName(id: string): string {
    if (!id) return '—';
    return this.store.factions().find(f => f.id === id)?.name ?? id;
  }

  characterName(id: string): string {
    if (!id) return '—';
    return this.store.characters().find(c => c.id === id)?.name ?? id;
  }

  targetName(ef: EventEffect): string {
    if (ef.targetType === 'colony') return 'Colony';
    if (ef.targetType === 'faction') return this.factionName(ef.targetId);
    if (ef.targetType === 'character') return this.characterName(ef.targetId);
    if (ef.targetType === 'asset') return this.assetName(ef.targetId);
    if (ef.targetType === 'goal') return this.goalName(ef.targetId);
    if (ef.targetType === 'location') return this.locationName(ef.targetId);
    if (ef.targetType === 'condition') return this.store.worldConditions().find(c => c.id === ef.targetId)?.title ?? ef.targetId;
    return ef.targetId;
  }

  assetName(id: string): string {
    if (!id) return '—';
    return this.store.assets().find(a => a.id === id)?.name ?? id;
  }

  goalName(id: string): string {
    if (!id) return '—';
    return this.store.factionGoals().find(g => g.id === id)?.title ?? id;
  }

  locationName(id: string): string {
    if (!id) return '—';
    return this.store.locations().find(l => l.id === id)?.name ?? id;
  }

  actorName(id: string): string {
    if (!id) return '—';
    if (id === 'party') return 'Party';
    const ch = this.store.characters().find(c => c.id === id);
    if (ch) return ch.name;
    return this.store.factions().find(f => f.id === id)?.name ?? id;
  }

  deltaClass(delta: number): string {
    if (delta > 0) return 'delta pos';
    if (delta < 0) return 'delta neg';
    return 'delta neutral';
  }

  hasImpact(impact: ColonyImpact): boolean {
    return impact.momentumChanges.length > 0 ||
      impact.powerModifierChanges.length > 0 || impact.characterDeaths.length > 0 ||
      impact.defections.length > 0 || impact.partyRelationshipChanges.length > 0 ||
      impact.factionRelationshipChanges.length > 0 || impact.characterStateChanges.length > 0 ||
      impact.characterFactionChanges.length > 0;
  }

  // ── M4 resolution tasks ──────────────────────────────────────────────────
  /** Goals Ready to Resolve when this session's play begins (after its Colony Turn): GM resolution tasks. The GM
   *  resolves each through play, an explicit Event, or one of these buttons; nothing resolves on its own. */
  resolutionTasks(session: Session): { goal: FactionGoal; ready: GoalReady; resolvedHere: boolean }[] {
    return this.tasksBySession().get(session.id) ?? [];
  }
  private readonly tasksBySession = computed(() => {
    const out = new Map<string, { goal: FactionGoal; ready: GoalReady; resolvedHere: boolean }[]>();
    for (const [sessionId, snap] of this.startOfPlay()) {
      const session = this.store.sessions().find(s => s.id === sessionId)!;
      const played = (session.events ?? []).filter(e => e.kind !== 'ColonyTurn').flatMap(e => e.effects);
      out.set(sessionId, projectGoals(this.store.factionGoals(), snap)
        .filter(g => g.ready && !TERMINAL_GOAL_STATUSES.includes(g.status))
        .map(g => ({ goal: g, ready: g.ready!,
                     resolvedHere: played.some(ef => ef.targetType === 'goal' && ef.targetId === g.id && (ef.property === 'status' || ef.property === 'readyToResolve')) })));
    }
    return out;
  });

  readyEffect(goalId: string, value: 'Cleared'): Omit<EventEffect, 'id' | 'eventId'> {
    return { targetType: 'goal', targetId: goalId, property: 'readyToResolve', delta: 0, value };
  }
  statusEffect(goalId: string, value: GoalStatus): Omit<EventEffect, 'id' | 'eventId'> {
    return { targetType: 'goal', targetId: goalId, property: 'status', delta: 0, value };
  }
  resolveAsDeclared(session: Session, goal: FactionGoal): void { this.addSceneEffects(session, declaredResolutionEffects(goal)); }

  private sceneEvent(session: Session): CampaignEvent | undefined {
    return (session.events ?? []).find(e => e.title === DECISIVE_EVENT_TITLE && !e.isSynthetic);
  }

  /** Appends Effects to this session's "Resolutions" Event, creating it (before play events) if needed. */
  addSceneEffects(session: Session, effects: Omit<EventEffect, 'id' | 'eventId'>[]): void {
    const ev = this.sceneEvent(session);
    const mk = (e: Omit<EventEffect, 'id' | 'eventId'>): EventEffect => ({ ...e, id: '', eventId: ev?.id ?? '' });
    if (ev) this.store.saveEvent({ ...ev, effects: [...ev.effects, ...effects.map(mk)] });
    else this.store.saveEvent({ id: '', sessionId: session.id, title: DECISIVE_EVENT_TITLE,
      description: 'Resolution tasks and crises resolved by the GM', sortOrder: -500, effects: effects.map(mk) });
  }

  // ── M6 crises: characters Compromised once this session's Colony Turn has run ─────────────────────────
  /** A crisis is visible for one session; play may resolve it here, otherwise the next Colony Turn's Character Phase makes a Defection Check. */
  /** Each session's state when play begins: the end of the previous session plus this session's Colony Turn. */
  private readonly startOfPlay = computed(() => {
    const w = { colonyState: this.store.colonyState()!, factions: this.store.factions(), characters: this.store.characters(),
                assets: this.store.assets(), goals: this.store.factionGoals(), locations: this.store.locations(),
                sessions: this.store.sessions(), rules: this.store.rules(), conditions: this.store.worldConditions() };
    const out = new Map<string, ReturnType<typeof stateAfterTurnEvent>>();
    if (!w.colonyState) return out;
    for (const session of w.sessions) out.set(session.id, stateAfterTurnEvent(w, session.id));
    return out;
  });

  private readonly crisesBySession = computed(() => {
    const out = new Map<string, { id: string; name: string; factionId?: string; resolvedHere: boolean }[]>();
    for (const session of this.store.sessions()) out.set(session.id, this.crisesIn(session, this.startOfPlay().get(session.id) ?? null));
    return out;
  });
  crises(session: Session) { return this.crisesBySession().get(session.id) ?? []; }

  private crisesIn(session: Session, snap: ReturnType<typeof stateAfterTurnEvent>): { id: string; name: string; factionId?: string; resolvedHere: boolean }[] {
    const played = (session.events ?? []).filter(e => e.kind !== 'ColonyTurn').flatMap(e => e.effects);
    return projectCharacters(this.store.characters(), snap)
      .filter(c => c.state === 'Alive' && c.instability === 'Compromised')
      .map(c => ({ id: c.id, name: c.name, factionId: c.factionId,
                   resolvedHere: played.some(ef => ef.targetType === 'character' && ef.targetId === c.id && (ef.property === 'instability' || ef.property === 'factionChange')) }));
  }

  resolveCrisis(session: Session, characterId: string, how: 'talkedDown' | 'recommitted' | 'leaves'): void {
    const fx: Omit<EventEffect, 'id' | 'eventId'>[] = how === 'leaves'
      ? [{ targetType: 'character', targetId: characterId, property: 'factionChange', delta: 0, value: '' },
         { targetType: 'character', targetId: characterId, property: 'instability', delta: 0, value: 'Stable' }]
      : [{ targetType: 'character', targetId: characterId, property: 'instability', delta: 0, value: how === 'talkedDown' ? 'Conflicted' : 'Stable' }];
    this.addSceneEffects(session, fx);
  }

  // ── §18.6 World Conditions ───────────────────────────────────────────────
  /** A resolution task's preview: what accomplishing the goal brings, from the World Conditions it drives. */
  worldIfAccomplished(goalId: string): string { return goalStageTexts(this.store.worldConditions(), goalId, 'Accomplished').join(' '); }
  private readonly conditionsBySession = computed(() => {
    const out = new Map<string, { started: ConditionStatus[]; ended: ConditionStatus[]; changed: ConditionStatus[] }>();
    const conds = this.store.worldConditions();
    if (!conds.length) return out;
    const names = { asset: (id: string) => this.assetName(id), faction: (id: string) => this.factionName(id),
                    goal: (id: string) => this.store.factionGoals().find(g => g.id === id)?.title ?? id };
    const base = { assets: this.store.assets(), characters: this.store.characters(), factions: this.store.factions(), locations: this.store.locations(),
                   goals: this.store.factionGoals() };
    const at = (snap: ColonySnapshot | null) => evaluateConditions(conds, conditionWorldAt(snap, base), names);
    let prev = at(null);
    for (const snap of this.store.colonySnapshots()) {
      const now = at(snap);
      out.set(snap.sessionId, diffConditions(prev, now));
      prev = now;
    }
    return out;
  });
  conditionChanges(session: Session) { return this.conditionsBySession().get(session.id) ?? { started: [], ended: [], changed: [] }; }

  sessionSnapshot(session: Session): ColonySnapshot | undefined {
    return this.store.colonySnapshots().find(s => s.sessionId === session.id);
  }

  tierLabel(t: number): string { return t > 0 ? `+${t}` : `${t}`; }

  resolutionTitle(r: MomentumResolution): string {
    return r.signals.map(x => `${x.sign > 0 ? '+1' : '−1'} ${x.reason}`).join('\n');
  }


  // Returns true if the same faction+property+sign appeared in the immediately prior session
  isRepeatedEffect(session: Session, ef: EventEffect): boolean {
    if (ef.targetType !== 'faction' || ef.property !== 'momentum') return false;
    const sorted = this.store.sortedSessions();
    const idx = sorted.findIndex(s => s.id === session.id);
    // sortedSessions is newest-first, so the prior session is at idx + 1
    if (idx < 0 || idx >= sorted.length - 1) return false;
    const prev = sorted[idx + 1];
    return (prev.events ?? []).some(ev =>
      ev.effects.some(e =>
        e.targetType === 'faction' &&
        e.targetId === ef.targetId &&
        e.property === ef.property &&
        Math.sign(e.delta) === Math.sign(ef.delta)
      )
    );
  }

  get activeFactions() { return this.store.factions().filter(f => f.active && f.type === 'Faction'); }

  /** M4 champion / leader choices: members of the goal's (or the faction's) faction first, then everyone alive. */
  characterChoices(draft: Partial<EventEffect>): { id: string; name: string }[] {
    if (draft.targetType === 'goal' && draft.property === 'championChange') {
      // §18.8: only characters free of another active assignment (as of the viewed point), plus the current champion
      const goal = this.store.viewGoals().find(g => g.id === draft.targetId);
      if (goal) return championOptions(goal, this.store.viewCharacters(), this.store.viewGoals()).map(c => ({ id: c.id, name: c.name }));
    }
    const fid = draft.targetType === 'goal' ? this.store.factionGoals().find(g => g.id === draft.targetId)?.factionId : draft.targetId;
    const chars = this.store.viewCharacters().filter(c => c.state === 'Alive');
    return [...chars.filter(c => c.factionId === fid), ...chars.filter(c => c.factionId !== fid)].map(c => ({ id: c.id, name: c.name }));
  }
  get allCharacters() { return this.store.characters(); }
  get allAssets() { return this.store.assets(); }
  get allGoals() { return this.store.factionGoals(); }
  get allLocations() { return this.store.locations(); }
  get allActors() {
    return [
      { id: 'party', name: 'Party' },
      ...this.store.characters().map(c => ({ id: c.id, name: c.name })),
      ...this.store.factions().filter(f => f.active).map(f => ({ id: f.id, name: f.name })),
    ];
  }

  participateRoles = ['Helping', 'Hindering'] as const;

  // ── Export / Import ──────────────────────────────────────────────────────
  showImportConfirm = signal(false);
  importError = signal<string | null>(null);
  pendingImport = signal<Session[] | null>(null);

  exportSessions(): void {
    const data = JSON.stringify(this.store.sessions(), null, 2);
    downloadBlob(new Blob([data], { type: 'application/json' }), 'sessions-backup.json');
  }

  onImportFile(event: Event): void {
    this.importError.set(null);
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!Array.isArray(parsed)) throw new Error('Expected a JSON array of sessions.');
        this.pendingImport.set(parsed as Session[]);
        this.showImportConfirm.set(true);
      } catch (e: any) {
        this.importError.set(e.message ?? 'Invalid JSON file.');
      }
      (event.target as HTMLInputElement).value = '';
    };
    reader.readAsText(file);
  }

  confirmImport(): void {
    const sessions = this.pendingImport();
    if (!sessions) return;
    this.store.importSessions(sessions).then(r => {
      // sessions already in the campaign are skipped by the server, never replaced
      if (r) this.toast.imported('Sessions', { added: r.imported, skipped: r.skipped });
    });
    this.showImportConfirm.set(false);
    this.pendingImport.set(null);
  }

  cancelImport(): void {
    this.showImportConfirm.set(false);
    this.pendingImport.set(null);
  }
}
