// Goal advance Effects (§18.11, Faction Phase fp-4). Pure.
// A goal may list explicit Effects written by the Faction Phase when it advances: at Planning → Progressing, and at
// Accomplished (after its target, if any). They are ordinary Effects from the existing vocabulary, attributed to the
// goal's faction (origin GoalGenerator), and printed on the goal card, so the rule stays a board-game card:
// "On the first success: the Fund becomes Contested. On the second: EGRESS takes it; it becomes Stable."
// (2026-10-26) An advance never establishes or ends a World Condition: a condition that follows a goal is driven by the
// goal's stage instead (conditions.ts, goalStage), so the text lives in one place and cannot drift from the goal.
// They are not cascades: nothing is inferred; only what the goal names is written, and only by its own advance (a goal
// Accomplished by another source, §18.3, writes none of them).
import { ASSET_STATUS_OPTIONS, CHARACTER_STATE_OPTIONS, LOCATION_STATE_OPTIONS, locationStateLabel, EventEffect } from '../models/types';

export type AdvanceTargetType = 'asset' | 'character' | 'faction' | 'location';
export interface AdvanceEffect { targetType: AdvanceTargetType; targetId: string; property: string; delta: number; value?: string }

/** The vocabulary: what an advance may change. `kind` says whether it writes a value or a delta. */
export const ADVANCE_PROPERTIES: Record<AdvanceTargetType, { property: string; label: string; kind: 'value' | 'delta'; options?: { value: string; label: string }[] }[]> = {
  asset: [
    { property: 'status', label: 'Status', kind: 'value', options: ASSET_STATUS_OPTIONS },
    { property: 'controllingFactionId', label: 'Controller', kind: 'value' },   // a faction id; '' = no one
    { property: 'locationChange', label: 'Location', kind: 'value' },           // a Location id
  ],
  character: [{ property: 'state', label: 'State', kind: 'value', options: CHARACTER_STATE_OPTIONS }],
  faction: [{ property: 'factionSize', label: 'Faction Size', kind: 'delta' }],
  location: [{ property: 'state', label: 'State', kind: 'value', options: LOCATION_STATE_OPTIONS }],
};

export const ADVANCE_TARGET_TYPES: { value: AdvanceTargetType; label: string }[] = [
  { value: 'asset', label: 'Asset' }, { value: 'character', label: 'Character' }, { value: 'faction', label: 'Faction' },
  { value: 'location', label: 'Location' },
];

export function parseAdvanceEffects(json: string | undefined | null): AdvanceEffect[] {
  if (!json) return [];
  try { const r = JSON.parse(json); return Array.isArray(r) ? r : []; } catch { return []; }
}

/** Why an Effect cannot be written as it stands, or null. */
export function advanceEffectIssue(e: AdvanceEffect): string | null {
  const prop = ADVANCE_PROPERTIES[e.targetType]?.find(p => p.property === e.property);
  if (!prop) return `${e.targetType} ${e.property} is not an advance Effect`;
  if (!e.targetId) return 'choose what it changes';
  if (prop.kind === 'delta') return Number.isInteger(e.delta) && e.delta !== 0 ? null : 'enter a non-zero whole number';
  if (prop.options && !prop.options.some(o => o.value === e.value)) return 'choose a value';
  if (e.property === 'locationChange' && !e.value) return 'choose a Location';
  return null;
}

/** A tidy, valid copy (value Effects carry delta 0; delta Effects carry no value), or null if it is not valid. */
export function normalizeAdvanceEffect(e: AdvanceEffect): AdvanceEffect | null {
  if (advanceEffectIssue(e)) return null;
  const prop = ADVANCE_PROPERTIES[e.targetType].find(p => p.property === e.property)!;
  return prop.kind === 'delta'
    ? { targetType: e.targetType, targetId: e.targetId, property: e.property, delta: e.delta }
    : { targetType: e.targetType, targetId: e.targetId, property: e.property, delta: 0, value: e.value ?? '' };
}

export interface AdvanceNames { asset(id: string): string; character(id: string): string; faction(id: string): string; location(id: string): string }

/** In words, for the goal card: "Civic Improvement Fund → Contested", "Dawn Assembly −30 members". */
export function describeAdvanceEffect(e: AdvanceEffect, n: AdvanceNames): string {
  switch (e.targetType) {
    case 'asset':
      if (e.property === 'controllingFactionId') return `${n.asset(e.targetId)} → ${e.value ? `controlled by ${n.faction(e.value)}` : 'controlled by no one'}`;
      if (e.property === 'locationChange') return `${n.asset(e.targetId)} moves to ${n.location(e.value ?? '')}`;
      return `${n.asset(e.targetId)} → ${e.value}`;
    case 'character': return `${n.character(e.targetId)} → ${e.value}`;
    case 'faction': return `${n.faction(e.targetId)} ${e.delta > 0 ? '+' : '−'}${Math.abs(e.delta)} members`;
    case 'location': return `${n.location(e.targetId)} → ${locationStateLabel(e.value)}`;
  }
}

/** The Effect as the Faction Phase writes it: credited to the goal's faction, origin GoalGenerator. */
export function advanceEffectToEffect(e: AdvanceEffect, factionId: string): Omit<EventEffect, 'id' | 'eventId'> {
  return { targetType: e.targetType, targetId: e.targetId, property: e.property, delta: e.delta, value: e.value,
           actorFactionId: factionId, origin: 'GoalGenerator' };
}
