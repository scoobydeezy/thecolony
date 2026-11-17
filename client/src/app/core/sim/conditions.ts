// World Conditions (§18.6, §18.9). Pure: whether each condition is in force at a point in history, why, and what it adds to
// Colony Stress.
//   in force ⇔ established ∧ every requirement holds
//   established: from the start (activeAtStart) unless an Event's condition effect says otherwise; the latest one wins
//   requirements (AND; a list of states within one is OR), over RECORDED entity state only:
//     Asset controller · Asset status · Character state · Character faction · faction leader capable · Location state ·
//     another condition in force (or not)
// Never over a value that depends on Colony Stress (Pressure, Drift Risk, instability, relationships, Power): conditions
// ARE Colony Stress (§18.10: Stress = clamp(Σ in-force contributions)), so the calculation stays acyclic
// (entities + Events → conditions → Stress → derived values).
// Nothing here changes the world: a condition contributes Stress and declares a table rule the GM applies; it never
// writes an Effect. One-time changes are explicit Event Effects.
import { AssetStatus, CharacterState, ColonySnapshot, LocationState, WorldCondition, Asset, Character, Faction, Location, FactionGoal, GoalStatus,
         ConditionEstablishment, StressPart, locationStateLabel } from '../models/types';

export type ConditionRequirement =
  | { kind: 'assetController'; assetId: string; factionId: string }        // factionId '' = controlled by no one
  | { kind: 'assetStatus'; assetId: string; statuses: AssetStatus[] }
  | { kind: 'characterState'; characterId: string; states: CharacterState[] }
  | { kind: 'characterFaction'; characterId: string; factionId: string }   // factionId '' = belongs to no faction
  | { kind: 'leaderCapable'; factionId: string; capable: boolean }         // the leader is alive and still a member
  | { kind: 'locationState'; locationId: string; states: LocationState[] }
  | { kind: 'condition'; conditionId: string; inForce: boolean }
  | { kind: 'goalStage'; goalId: string; stages: GoalStage[] };              // 2026-10-26: a goal can drive a condition

/** A goal's progress as World Conditions read it: its stored status, with Ready to Resolve as a stage of its own. */
export type GoalStage = 'Planning' | 'Progressing' | 'Ready' | 'Accomplished' | 'Failed' | 'Retired';
export const GOAL_STAGE_OPTIONS: { value: GoalStage; label: string }[] = [
  { value: 'Planning', label: 'Planning' }, { value: 'Progressing', label: 'Progressing' }, { value: 'Ready', label: 'Ready to Resolve' },
  { value: 'Accomplished', label: 'Accomplished' }, { value: 'Failed', label: 'Failed' }, { value: 'Retired', label: 'Retired' },
];
export function goalStageOf(status: GoalStatus | undefined, ready: boolean): GoalStage | undefined {
  if (!status) return undefined;
  if (status === 'Accomplished' || status === 'Failed' || status === 'Retired') return status;
  if (ready) return 'Ready';
  return status === 'Plotting' ? 'Planning' : 'Progressing';   // legacy Stalled reads as Progressing
}

export const REQUIREMENT_KINDS: { value: ConditionRequirement['kind']; label: string }[] = [
  { value: 'assetController',  label: 'Asset controlled by' },
  { value: 'assetStatus',      label: 'Asset status is' },
  { value: 'characterState',   label: 'Character state is' },
  { value: 'characterFaction', label: 'Character belongs to' },
  { value: 'leaderCapable',    label: 'Faction leader' },
  { value: 'locationState',    label: 'Location state is' },
  { value: 'condition',        label: 'Condition' },
  { value: 'goalStage',        label: 'Goal stage is' },
];

/** 2026-10-26 "varies by": a condition whose table rule depends on one entity's property, with a row per state (its text
 *  and Stress). In force ⇔ established ∧ the current state's row has text. A blank row means "not in force in that state". */
export type VariesByKind = 'assetStatus' | 'assetController' | 'characterState' | 'characterFaction' | 'locationState' | 'goalStage';
export interface ConditionVariesBy { subject: { kind: VariesByKind; id: string }; rows: { state: string; text: string; stress: number }[] }
export const VARIES_BY_KINDS = ['assetStatus', 'assetController', 'characterState', 'characterFaction', 'locationState', 'goalStage'] as const;

export function variesByOf(c: Pick<WorldCondition, 'variesByJson'>): ConditionVariesBy | null {
  if (!c.variesByJson) return null;
  try {
    const v = JSON.parse(c.variesByJson);
    return v && v.subject && (VARIES_BY_KINDS as readonly string[]).includes(v.subject.kind) && Array.isArray(v.rows) ? v : null;
  } catch { return null; }
}

export function requirementsOf(c: Pick<WorldCondition, 'requirementsJson'>): ConditionRequirement[] {
  try { const r = JSON.parse(c.requirementsJson || '[]'); return Array.isArray(r) ? r : []; } catch { return []; }
}

/** The conditions a goal drives (2026-10-26): those that vary by its stage, or require a stage of it. */
export function conditionsDrivenBy(conditions: WorldCondition[], goalId: string): WorldCondition[] {
  return conditions.filter(c => {
    const vb = variesByOf(c);
    return vb ? vb.subject.kind === 'goalStage' && vb.subject.id === goalId
              : requirementsOf(c).some(r => r.kind === 'goalStage' && r.goalId === goalId);
  });
}
/** What becomes true at a goal's stage, by the conditions it drives: each varying condition's row for that stage, and
 *  the rule of each condition requiring that stage (whatever else it requires). The goal's "world results". */
export function goalStageTexts(conditions: WorldCondition[], goalId: string, stage: GoalStage): string[] {
  return conditionsDrivenBy(conditions, goalId).map(c => {
    const vb = variesByOf(c);
    if (vb) return vb.rows.find(r => r.state === stage)?.text ?? '';
    return requirementsOf(c).some(r => r.kind === 'goalStage' && r.goalId === goalId && r.stages.includes(stage)) ? c.rule : '';
  }).map(t => t.trim()).filter(Boolean);
}

/** The recorded state a condition may read. */
export interface ConditionWorld {
  assetOwner(id: string): string | undefined;
  assetStatus(id: string): AssetStatus | undefined;
  characterState(id: string): CharacterState | undefined;
  characterFaction(id: string): string | undefined;
  leaderCapable(factionId: string): boolean;
  locationState(id: string): LocationState | undefined;
  goalStage(goalId: string): GoalStage | undefined;
  established(conditionId: string): ConditionEstablishment | undefined;
}

export interface ConditionNames {
  asset(id: string): string; faction(id: string): string;
  character?(id: string): string; location?(id: string): string; goal?(id: string): string;
}

export interface ConditionStatus {
  condition: WorldCondition;
  established: boolean;
  dependencyHolds: boolean;
  inForce: boolean;
  stress: number;              // its Stress contribution while in force (0 otherwise)
  row?: string;                // "varies by": the subject's current state ('' = no one / no faction)
  rowText?: string;            // and that row's text
  holds: boolean[];            // whether each requirement holds, in requirementsOf order
  origin: string;              // how it was established or ended: 'from the start', 'established in Session 4 (title)', …
  /** Why, in words: how it was established (or ended), and each requirement with whether it holds. */
  reason: string;
}

/** The world at a snapshot (null = baseline) for condition evaluation, from the snapshot's maps or the base entities. */
export function conditionWorldAt(snap: ColonySnapshot | null,
                                 base: { assets: Asset[]; characters: Character[]; factions: Faction[]; locations: Location[]; goals?: FactionGoal[] }): ConditionWorld {
  const asset = new Map(base.assets.map(a => [a.id, a])), ch = new Map(base.characters.map(c => [c.id, c]));
  const fac = new Map(base.factions.map(f => [f.id, f])), loc = new Map(base.locations.map(l => [l.id, l]));
  const charState = (id: string) => snap?.characterStates?.[id] ?? ch.get(id)?.state;
  const charFaction = (id: string) => snap && id in (snap.characterFactions ?? {}) ? snap.characterFactions[id] : ch.get(id)?.factionId;
  const leaderOf = (f: string) => snap?.factionLeaders && f in snap.factionLeaders ? snap.factionLeaders[f] ?? undefined : fac.get(f)?.leaderId;
  return {
    assetOwner: id => snap && id in (snap.assetControl ?? {}) ? snap.assetControl[id] : asset.get(id)?.controllingFactionId,
    assetStatus: id => snap?.assetStatuses?.[id] ?? asset.get(id)?.status,
    characterState: charState,
    characterFaction: charFaction,
    leaderCapable: f => { const l = leaderOf(f); return !!l && charState(l) === 'Alive' && charFaction(l) === f; },
    locationState: id => snap?.locationStates?.[id] ?? loc.get(id)?.state,
    goalStage: id => {
      const g = base.goals?.find(x => x.id === id);
      return goalStageOf(snap?.goalStatuses?.[id] ?? g?.status, snap ? !!snap.goalReady?.[id] : !!g?.ready);
    },
    established: id => snap?.conditionStates?.[id],
  };
}

/** Every condition's status in `world`. */
export function evaluateConditions(conditions: WorldCondition[], world: ConditionWorld, names: ConditionNames): Map<string, ConditionStatus> {
  const byId = new Map(conditions.map(c => [c.id, c]));
  const out = new Map<string, ConditionStatus>();
  const visiting = new Set<string>();
  const nm = { character: (id: string) => names.character?.(id) ?? id, location: (id: string) => names.location?.(id) ?? id,
               goal: (id: string) => names.goal?.(id) ?? id };
  const stageLabel = (s: string) => GOAL_STAGE_OPTIONS.find(o => o.value === s)?.label ?? s;

  const evaluate = (c: WorldCondition): ConditionStatus => {
    const done = out.get(c.id);
    if (done) return done;
    visiting.add(c.id);
    const est = world.established(c.id);
    const established = est ? est.active : c.activeAtStart;
    const origin = est
      ? `${est.active ? 'established' : 'ended'} in Session ${est.session} (${est.eventTitle})`
      : c.activeAtStart ? 'from the start' : 'not yet established';
    const vb = variesByOf(c);
    if (vb) {
      const { state, label } = subjectState(vb.subject);
      const row = vb.rows.find(r => r.state === state);
      const has = !!row?.text?.trim();
      visiting.delete(c.id);
      const inForce = established && has;
      const status: ConditionStatus = { condition: c, established, dependencyHolds: has, inForce, origin, holds: [], row: state, rowText: row?.text,
        stress: inForce ? (row?.stress ?? 0) : 0, reason: `${origin}; ${label}${has ? '' : ' (no rule for this state)'}` };
      out.set(c.id, status);
      return status;
    }
    let holds = true;
    const each: boolean[] = [];
    const parts = requirementsOf(c).map(r => {
      const [ok, text] = check(r);
      holds &&= ok; each.push(ok);
      return `${text} (${ok ? 'holds' : 'does not hold'})`;
    });
    visiting.delete(c.id);
    const inForce = established && holds;
    const status: ConditionStatus = { condition: c, established, dependencyHolds: holds, inForce, origin, holds: each,
      stress: inForce ? (c.stressContribution ?? 0) : 0, reason: [origin, ...parts].join('; ') };
    out.set(c.id, status);
    return status;
  };

  /** The "varies by" subject's current state, and it in words. */
  const subjectState = (s: ConditionVariesBy['subject']): { state: string; label: string } => {
    switch (s.kind) {
      case 'assetStatus': { const v = world.assetStatus(s.id) ?? ''; return { state: v, label: `${names.asset(s.id)} is ${v || 'absent'}` }; }
      case 'assetController': { const v = world.assetOwner(s.id) ?? ''; return { state: v, label: `${names.asset(s.id)} held by ${v ? names.faction(v) : 'no one'}` }; }
      case 'characterState': { const v = world.characterState(s.id) ?? ''; return { state: v, label: `${nm.character(s.id)} is ${v || 'absent'}` }; }
      case 'characterFaction': { const v = world.characterFaction(s.id) ?? ''; return { state: v, label: `${nm.character(s.id)} in ${v ? names.faction(v) : 'no faction'}` }; }
      case 'locationState': { const v = world.locationState(s.id) ?? ''; return { state: v, label: `${nm.location(s.id)} is ${locationStateLabel(v) || 'absent'}` }; }
      case 'goalStage': { const v = world.goalStage(s.id) ?? ''; return { state: v, label: `${nm.goal(s.id)} is ${v ? stageLabel(v) : 'not in play'}` }; }
    }
  };

  const check = (r: ConditionRequirement): [boolean, string] => {
    switch (r.kind) {
      case 'assetController': {
        const o = world.assetOwner(r.assetId) ?? '';
        return [o === (r.factionId ?? ''), r.factionId ? `${names.faction(r.factionId)} controls ${names.asset(r.assetId)}` : `no one controls ${names.asset(r.assetId)}`];
      }
      case 'assetStatus': {
        const s = world.assetStatus(r.assetId);
        return [!!s && r.statuses.includes(s), `${names.asset(r.assetId)} is ${r.statuses.join(' or ')}`];
      }
      case 'characterState': {
        const s = world.characterState(r.characterId);
        return [!!s && r.states.includes(s), `${nm.character(r.characterId)} is ${r.states.join(' or ')}`];
      }
      case 'characterFaction': {
        const f = world.characterFaction(r.characterId) ?? '';
        return [f === (r.factionId ?? ''), r.factionId ? `${nm.character(r.characterId)} belongs to ${names.faction(r.factionId)}` : `${nm.character(r.characterId)} belongs to no faction`];
      }
      case 'leaderCapable': {
        const ok = world.leaderCapable(r.factionId) === r.capable;
        return [ok, `${names.faction(r.factionId)} ${r.capable ? 'has' : 'lacks'} a capable leader`];
      }
      case 'locationState': {
        const s = world.locationState(r.locationId);
        return [!!s && r.states.includes(s), `${nm.location(r.locationId)} is ${r.states.map(locationStateLabel).join(' or ')}`];
      }
      case 'goalStage': {
        const st = world.goalStage(r.goalId);
        return [!!st && r.stages.includes(st), `${nm.goal(r.goalId)} is ${r.stages.map(stageLabel).join(' or ')}`];
      }
      case 'condition': {
        const dep = byId.get(r.conditionId);
        // a cycle never counts as in force (and cannot loop); a removed condition is never in force
        const inForce = !!dep && !visiting.has(dep.id) && evaluate(dep).inForce;
        return [inForce === r.inForce, `“${dep?.title ?? 'a removed condition'}” is ${r.inForce ? '' : 'not '}in force`];
      }
    }
  };

  for (const c of conditions) evaluate(c);
  return out;
}

/** §18.10 Colony Stress: the sum of in-force contributions (unclamped; the caller clamps to 0–10), with each part's origin. */
export function conditionStress(statuses: Map<string, ConditionStatus>): { total: number; parts: StressPart[] } {
  const parts = [...statuses.values()].filter(s => s.inForce && s.stress !== 0)
    .map(s => ({ conditionId: s.condition.id, title: s.condition.title, stress: s.stress, origin: s.origin }));
  return { total: parts.reduce((t, p) => t + p.stress, 0), parts };
}

/** Conditions that came into force, or stopped being in force, between two points in history. */
export function conditionChanges(before: Map<string, ConditionStatus>, after: Map<string, ConditionStatus>)
    : { started: ConditionStatus[]; ended: ConditionStatus[]; changed: ConditionStatus[] } {
  const started: ConditionStatus[] = [], ended: ConditionStatus[] = [], changed: ConditionStatus[] = [];
  for (const [id, a] of after) {
    const b = before.get(id);
    if (a.inForce && !b?.inForce) started.push(a);
    else if (!a.inForce && b?.inForce) ended.push(a);
    else if (a.inForce && b?.inForce && a.row !== undefined && a.row !== b.row) changed.push(a);   // a "varies by" row change
  }
  return { started, ended, changed };
}
