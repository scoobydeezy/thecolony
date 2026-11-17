// faction-goals.csv: one row per goal, in the simplified goal model (BOARD-GAME-REVIEW §18.2–18.3).
// Import is by header name (case-insensitive), so column order does not matter. A column missing from the file keeps
// the existing goal's value, so older exports (before Auto-Resolve) can be re-imported safely. An older file's
// ProgressingWorldState / CompletedWorldState columns are ignored (2026-10-26): that text lives in World Conditions.
import { FactionGoal, GoalPriority, GoalStatus, GoalVisibility, GOAL_PRIORITY_OPTIONS, GOAL_STATUS_OPTIONS, GOAL_VISIBILITY_OPTIONS } from '../models/types';
import { parseAdvanceEffects, normalizeAdvanceEffect } from '../sim/advance-effects';
import { oneOf } from './validation';

export const GOAL_CSV_HEADER = [
  'Id', 'FactionId', 'FactionName', 'Title',
  'ConditionType', 'AutoResolve', 'EarliestAct', 'Status', 'Priority', 'Visibility',
  'ChampionId', 'ChampionName',
  'TargetEntityType', 'TargetEntityId', 'TargetEntityName', 'TargetState', 'TargetOwnerFactionId',
  'TargetProperty', 'TargetOperator', 'TargetThreshold',
  'ProgressingEffects', 'AccomplishedEffects',
];

export interface GoalCsvNames {
  faction(id: string): string;
  character(id: string): string;
  entity(type: string | undefined, id: string): string;
}

/** Names columns (FactionName, ChampionName, TargetEntityName) are for reading only; import ignores them. */
export function goalToCsvRow(g: FactionGoal, names: GoalCsvNames): unknown[] {
  const achieve = g.conditionType === 'Achieve';
  return [
    g.id, g.factionId, names.faction(g.factionId), g.title,
    g.conditionType, achieve ? (g.outcomeMode === 'Adjudicated' ? 'No' : 'Yes') : '', ['', 'I', 'II', 'III'][g.earliestAct ?? 2],
    g.status, g.priority, g.visibility,
    g.championId ?? '', g.championId ? names.character(g.championId) : '',
    g.targetEntityType ?? '', g.targetEntityId ?? '', g.targetEntityId ? names.entity(g.targetEntityType, g.targetEntityId) : '',
    g.targetState ?? '', g.targetOwnerFactionId ?? '',
    g.targetProperty ?? '', g.targetOperator ?? '', g.targetThreshold ?? '',
    achieve ? effectsCell(g.progressingEffectsJson) : '', achieve ? effectsCell(g.accomplishedEffectsJson) : '',
  ];
}

/** An Effects cell: the JSON list, or blank for none. */
function effectsCell(json: string | undefined): string {
  const list = parseAdvanceEffects(json);
  return list.length ? JSON.stringify(list) : '';
}
/** A cell back to normalized JSON; rows that are not valid advance Effects are dropped. */
function effectsFromCell(cell: string): string {
  return JSON.stringify(parseAdvanceEffects(cell.trim() || '[]').map(normalizeAdvanceEffect).filter(e => e !== null));
}
/** An older file's ProgressingState (§18.9: one status/state for the goal's own target) sets or replaces only that
 *  Effect; the goal's other Progressing Effects (Faction Size, conditions, …) are kept, and a blank cell changes nothing. */
function mergeLegacyProgressingState(existingJson: string | undefined, type: string, id: string, state: string): string {
  const kept = parseAdvanceEffects(existingJson ?? '[]');
  state = state.trim();
  if (!state || !id || (type !== 'Asset' && type !== 'Character')) return JSON.stringify(kept);
  const targetType = type === 'Asset' ? 'asset' : 'character', property = type === 'Asset' ? 'status' : 'state';
  const others = kept.filter(e => !(e.targetType === targetType && e.targetId === id && e.property === property));
  return effectsFromCell(JSON.stringify([{ targetType, targetId: id, property, delta: 0, value: state }, ...others]));
}

const AUTO_RESOLVE_YES = ['yes', 'true', 'y', '1', 'automatic'];
const AUTO_RESOLVE_NO  = ['no', 'false', 'n', '0', 'adjudicated'];

/**
 * A goal from one CSV row. `get(col)` reads a lower-case column ('' when absent or empty); `has(col)` says whether the
 * file has the column at all. Rules mirror the goal editor: Status accepts "Planning" for Plotting; Auto-Resolve accepts
 * Yes/No (or true/false, Automatic/Adjudicated); a Maintain assignment has no Auto-Resolve and no World States.
 */
export function goalFromCsvRow(get: (col: string) => string, has: (col: string) => boolean,
                               existing: FactionGoal | undefined, campaignId: string): FactionGoal {
  const statusRaw = get('status').trim();
  const status = oneOf(statusRaw === 'Planning' ? 'Plotting' : statusRaw, GOAL_STATUS_OPTIONS.map(o => o.value) as GoalStatus[])
    ?? existing?.status ?? 'Plotting';
  const conditionType = oneOf(get('conditiontype'), ['Achieve', 'Maintain'] as const) ?? existing?.conditionType ?? 'Achieve';
  const auto = get('autoresolve').trim().toLowerCase();
  const outcomeMode = AUTO_RESOLVE_YES.includes(auto) ? 'Automatic' : AUTO_RESOLVE_NO.includes(auto) ? 'Adjudicated'
    : existing?.outcomeMode ?? 'Automatic';
  const threshold = get('targetthreshold').trim();
  const actRaw = get('earliestact').trim().toUpperCase().replace(/^ACT\s*/, '');
  const earliestAct = ({ I: 1, II: 2, III: 3, '1': 1, '2': 2, '3': 3 } as Record<string, number>)[actRaw] ?? existing?.earliestAct ?? 2;
  const achieve = conditionType === 'Achieve';
  return {
    ...existing,   // fields the file does not carry (e.g. introducedAtEventId) are kept
    id:                   get('id') || existing?.id || crypto.randomUUID(),
    campaignId,
    factionId:            get('factionid'),
    title:                get('title'),
    status, conditionType,
    priority:             oneOf(get('priority'), GOAL_PRIORITY_OPTIONS.map(o => o.value) as GoalPriority[]) ?? existing?.priority ?? 'Major',
    visibility:           oneOf(get('visibility'), GOAL_VISIBILITY_OPTIONS.map(o => o.value) as GoalVisibility[]) ?? existing?.visibility ?? 'Open',
    championId:           get('championid') || undefined,
    targetEntityType:     oneOf(get('targetentitytype'), ['Character', 'Asset', 'Faction'] as const),
    targetEntityId:       get('targetentityid') || undefined,
    targetState:          get('targetstate') || undefined,
    targetOwnerFactionId: get('targetownerfactionid') || undefined,
    targetProperty:       get('targetproperty') || undefined,
    targetOperator:       oneOf(get('targetoperator'), ['gte', 'lte', 'eq'] as const),
    targetThreshold:      threshold !== '' && Number.isFinite(+threshold) ? +threshold : undefined,
    outcomeMode:           achieve ? outcomeMode : 'Automatic',
    earliestAct,           // Achieve and Maintain alike (2026-10-22)
    // §18.11 advance Effects (JSON lists). A file without the columns keeps the goal's Effects; an older file's
    // ProgressingState (§18.9: a status/state for the goal's own target) becomes its one Progressing Effect.
    progressingEffectsJson: !achieve ? '[]'
      : has('progressingeffects') ? effectsFromCell(get('progressingeffects'))
      : has('progressingstate') ? mergeLegacyProgressingState(existing?.progressingEffectsJson, get('targetentitytype'), get('targetentityid'), get('progressingstate'))
      : existing?.progressingEffectsJson ?? '[]',
    accomplishedEffectsJson: !achieve ? '[]'
      : has('accomplishedeffects') ? effectsFromCell(get('accomplishedeffects')) : existing?.accomplishedEffectsJson ?? '[]',
  };
}
