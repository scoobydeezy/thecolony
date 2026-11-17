// world-conditions.csv (§18.9/§18.10): one row per World Condition. Import is by header name (case-insensitive) and
// updates by Id; an unknown Id adds the condition with that Id. Requirements (the requirement list) and VariesBy (the
// "varies by" table) are JSON, as stored (see core/sim/conditions.ts); a goal-driven condition names its goal by id
// (2026-10-26). A column missing from the file keeps the stored value.
import { WorldCondition } from '../models/types';
import { REQUIREMENT_KINDS, variesByOf } from '../sim/conditions';

export const CONDITION_CSV_HEADER = ['Id', 'Title', 'Rule', 'RuleOtherwise', 'ActiveAtStart', 'StressContribution', 'SortOrder', 'Requirements', 'VariesBy'];

export function conditionToCsvRow(c: WorldCondition): unknown[] {
  const reqs = c.requirementsJson && c.requirementsJson !== '[]' ? c.requirementsJson : '';
  return [c.id, c.title, c.rule, c.ruleOtherwise ?? '', c.activeAtStart ? 'Yes' : 'No', c.stressContribution ?? 0, c.sortOrder ?? 0, reqs, c.variesByJson ?? ''];
}

const KINDS = new Set(REQUIREMENT_KINDS.map(k => k.value as string));

/** A condition from one row, or the reason the row cannot be imported. */
export function conditionFromCsvRow(get: (col: string) => string, existing: WorldCondition | undefined, campaignId: string,
                                    has: (col: string) => boolean = () => true)
    : { condition: WorldCondition } | { error: string } {
  const title = get('title').trim();
  if (!title) return { error: 'no title' };
  let requirementsJson = has('requirements') ? '[]' : existing?.requirementsJson ?? '[]';
  const raw = has('requirements') ? get('requirements').trim() : '';
  if (raw) {
    let list: unknown;
    try { list = JSON.parse(raw); } catch { return { error: `"${title}": Requirements is not valid JSON` }; }
    if (!Array.isArray(list) || list.some(r => !r || typeof r !== 'object' || !KINDS.has((r as { kind?: string }).kind ?? '')))
      return { error: `"${title}": Requirements must be a list of known requirement kinds` };
    requirementsJson = JSON.stringify(list);
  }
  // "varies by" (JSON: { subject: { kind, id }, rows: [{ state, text, stress }] }); a file without the column keeps the stored one
  let variesByJson = existing?.variesByJson ?? null;
  if (has('variesby')) {
    const rawVb = get('variesby').trim();
    if (!rawVb) variesByJson = null;
    else if (!variesByOf({ variesByJson: rawVb })) return { error: `"${title}": VariesBy is not a valid "varies by" table` };
    else variesByJson = JSON.stringify(JSON.parse(rawVb));
  }
  const yes = ['yes', 'true', 'y', '1'];
  const active = get('activeatstart').trim().toLowerCase();
  const activeAtStart = active ? yes.includes(active) : existing?.activeAtStart ?? true;
  // a "varies by" table is an Entity condition (the editor drops it from an Event condition); refusing the mix keeps an
  // older file (no VariesBy column, ActiveAtStart No) from silently switching off a stored table
  if (variesByJson && !activeAtStart)
    return { error: `"${title}": a "varies by" condition is always ActiveAtStart Yes (this row says No${has('variesby') ? '' : ', and the file keeps the stored table'})` };
  const stress = parseInt(get('stresscontribution'), 10), sort = parseInt(get('sortorder'), 10);
  return { condition: {
    ...existing,
    id: get('id').trim() || existing?.id || crypto.randomUUID(),
    campaignId,
    title,
    rule: get('rule').trim(),
    // a file without the column (exported before 2026-10-26) keeps the stored text
    ruleOtherwise: has('ruleotherwise') ? get('ruleotherwise').trim() || null : existing?.ruleOtherwise ?? null,
    activeAtStart,
    stressContribution: Number.isFinite(stress) ? stress : existing?.stressContribution ?? 0,
    sortOrder: Number.isFinite(sort) ? sort : existing?.sortOrder ?? 0,
    requirementsJson,
    variesByJson,
  } };
}
