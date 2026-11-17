// Faction Phase (M5; BOARD-GAME-REVIEW §18.1, revised §18.12 fp-5). Pure: frozen inputs + dice → results → Effects.
// The server (Services/ColonyTurnEngine.cs) re-derives allocation, outcomes and Effects from the same inputs and the
// recorded dice, and rejects a commit that does not match.
//
//   Bag       per faction: one token per eligible Achieve goal, and one per GUARD (an active Maintain assignment whose
//             target another faction's eligible, non-Secret goal names this Turn: a Secret goal is unknown to the
//             defender, §18.12). Ordinal id order.
//   Draw      seeded shuffle; draw Power-many. A drawn Achieve goal rolls once; a drawn guard defends its target.
//   Resolve   per drawn goal, in draw order: 2d6 + Priority + Momentum ≥ DC + the Priority of the best drawn guard on its
//             target (another faction's). Priority: Critical +3 / Major +2 / Minor +1. Natural 12 = Critical Success
//             (always succeeds, +1 signal); natural 2 = Critical Failure (always fails, −1 signal).
//   Collide   incompatible Automatic Accomplishments on one target: highest margin, then earlier attempt; losers stay
//             Progressing (pre-empted).
//   Effects   Planning → Progressing (its advance Effects first, §18.11) · Progressing → Accomplished (Automatic: target written, credited) or
//             Ready to Resolve (Adjudicated) · critical signals (momentumSignal, root = the attempt).
import { EventEffect, GoalOutcomeMode, GoalPriority, GoalTargetEntityType } from '../models/types';
import { allocationStream, diceStream, randInt, shuffle, byOrdinal } from './prng';
import { AdvanceEffect, advanceEffectToEffect } from './advance-effects';

export const FACTION_PHASE_VERSION = 'fp-5';   // fp-2: GM-accepted resolutions (§18.5). fp-3: milestone state (§18.9). fp-4: advance Effects (§18.11). fp-5: Priority as a roll bonus; guards share Power (§18.12)
/** §18.12: Priority as a roll bonus, and as a guard's bonus to the DC. */
export const PRIORITY_BONUS: Record<GoalPriority, number> = { Critical: 3, Major: 2, Minor: 1 };

export interface FpFaction { id: string; name: string; power: number; momentum: number }
export interface FpGoal {
  id: string; factionId: string; title: string; priority: GoalPriority;
  status: 'Plotting' | 'Progressing'; outcomeMode: GoalOutcomeMode;
  targetEntityType?: GoalTargetEntityType; targetEntityId?: string; targetState?: string; targetOwnerFactionId?: string;
  onProgressing?: AdvanceEffect[];   // §18.11: written at Planning → Progressing (frozen only while the goal is Planning)
  onAccomplished?: AdvanceEffect[];  // §18.11: written at Accomplished, after the target (Automatic, or an accepted resolution)
}
/** §18.12: an active Maintain assignment whose target is threatened by a known goal this Turn: it competes for Power. */
export interface FpGuard { id: string; factionId: string; title: string; priority: GoalPriority; targetEntityId: string }
export interface FactionPhaseInputs {
  version: string; seed: number;
  target: number;             // the DC (formulas.operationTarget)
  priorityBonus: Record<GoalPriority, number>;
  factions: FpFaction[];      // ordinal id order
  goals: FpGoal[];            // eligible Achieve goals only, ordinal id order
  guards: FpGuard[];          // ordinal id order
}

export type Degree = 'CriticalFailure' | 'Failure' | 'Success' | 'CriticalSuccess';
/** app: the seeded stream · physical: table dice · reroll: re-rolled in the app (date-time + seed), recorded as rolled */
export type DiceSource = 'app' | 'physical' | 'reroll';
export interface FpAttempt {
  id: string;                 // `${goalId}#0`: the root cause of any signal
  factionId: string; goalId: string; index: number;
  d1: number; d2: number; natural: number;
  priority: number;           // the goal's Priority bonus
  modifier: number;           // Momentum
  defense: number;            // the best drawn guard's Priority bonus (added to the DC), 0 if unguarded
  guardId: string | null;     // that guard
  total: number;              // natural + priority + modifier
  dc: number;                 // target + defense
  degree: Degree; signal: -1 | 0 | 1;
  source: DiceSource;         // app dice must equal the seeded dice stream (verified by the server)
}
export type FpOutcome = 'Progressing' | 'Accomplished' | 'ReadyToResolve' | 'None';
export interface FpGoalResult {
  goalId: string; factionId: string; allocated: number; rolled: number; succeeded: boolean;
  outcome: FpOutcome;         // what the goal became ('None' = no advance)
  margin: number | null;      // total − DC of the deciding success
  preempted: boolean;
}
export interface FactionPhaseResults {
  version: string; diceSource: 'app' | 'physical' | 'mixed';
  allocations: { factionId: string; goalId: string; attempts: number }[];   // drawn Achieve goals, in attempt order (1 each)
  guarding: string[];         // drawn guards, ordinal order
  attempts: FpAttempt[]; goals: FpGoalResult[];
  /** §18.5: Ready to Resolve goals the GM accepted during the Turn (ordinal order): they resolve immediately, as if
   *  they Auto-Resolved. The others are deferred: they stay resolution tasks for the session. */
  accepted: string[];
}

/** Seeded draw: the Achieve goals that roll (in draw order, per faction in ordinal order) and the guards posted. */
export function allocate(inp: FactionPhaseInputs): Pick<FactionPhaseResults, 'allocations' | 'guarding'> {
  const next = allocationStream(inp.seed);
  const allocations: FactionPhaseResults['allocations'] = [], guarding: string[] = [];
  const guardIds = new Set(inp.guards.map(g => g.id));
  for (const f of [...inp.factions].sort((a, b) => byOrdinal(a.id, b.id))) {
    const bag = [...inp.goals.filter(g => g.factionId === f.id).map(g => g.id), ...inp.guards.filter(g => g.factionId === f.id).map(g => g.id)]
      .sort(byOrdinal);
    shuffle(bag, next);
    for (const id of bag.slice(0, Math.max(0, f.power))) {
      if (guardIds.has(id)) guarding.push(id); else allocations.push({ factionId: f.id, goalId: id, attempts: 1 });
    }
  }
  return { allocations, guarding: guarding.sort(byOrdinal) };
}

/** The best drawn guard of another faction on the goal's target (highest Priority, then ordinal id), or null. */
export function guardAgainst(inp: FactionPhaseInputs, guarding: string[], g: FpGoal): FpGuard | null {
  if (!g.targetEntityId) return null;
  const posted = new Set(guarding);
  const on = inp.guards.filter(x => posted.has(x.id) && x.factionId !== g.factionId && x.targetEntityId === g.targetEntityId)
    .sort((a, b) => (inp.priorityBonus[b.priority] - inp.priorityBonus[a.priority]) || byOrdinal(a.id, b.id));
  return on[0] ?? null;
}

export function degreeOf(natural: number, total: number, target: number): Degree {
  if (natural === 12) return 'CriticalSuccess';
  if (natural === 2) return 'CriticalFailure';
  return total >= target ? 'Success' : 'Failure';
}

/** Dice for each actual roll: overridden dice where given (keyed by attempt id), otherwise the seeded dice stream. */
export type DiceOverride = Record<string, [number, number]>;
export interface FpOptions {
  overrideSource?: Exclude<DiceSource, 'app'>;   // what the overridden dice are (default: physical table dice)
  accepted?: string[];                          // Ready to Resolve goals the GM accepts
}

export function resolveFactionPhase(inp: FactionPhaseInputs, physical: DiceOverride = {}, opts: FpOptions = {}): FactionPhaseResults {
  const overrideSource = opts.overrideSource ?? 'physical';
  const { allocations, guarding } = allocate(inp);
  const dice = diceStream(inp.seed);
  const fac = new Map(inp.factions.map(f => [f.id, f])), goal = new Map(inp.goals.map(g => [g.id, g]));
  const attempts: FpAttempt[] = []; const goals: FpGoalResult[] = [];
  let usedApp = false, usedPhysical = false;
  for (const a of allocations) {
    const g = goal.get(a.goalId)!, f = fac.get(a.factionId)!;
    const id = `${g.id}#0`;
    // the app stream is always advanced, so entering physical dice for one roll never changes another roll
    const appDie = [1 + randInt(dice, 6), 1 + randInt(dice, 6)] as [number, number];
    const [d1, d2] = physical[id] ?? appDie;
    if (physical[id]) usedPhysical = true; else usedApp = true;
    const guard = guardAgainst(inp, guarding, g);
    const priority = inp.priorityBonus[g.priority] ?? 0, defense = guard ? inp.priorityBonus[guard.priority] ?? 0 : 0;
    const natural = d1 + d2, total = natural + priority + f.momentum, dc = inp.target + defense;
    const degree = degreeOf(natural, total, dc);
    const ok = degree === 'Success' || degree === 'CriticalSuccess';
    attempts.push({ id, factionId: f.id, goalId: g.id, index: 0, d1, d2, natural, priority, modifier: f.momentum, defense,
                    guardId: guard?.id ?? null, total, dc, degree,
                    signal: degree === 'CriticalSuccess' ? 1 : degree === 'CriticalFailure' ? -1 : 0, source: physical[id] ? overrideSource : 'app' });
    const outcome: FpOutcome = !ok ? 'None' : g.status === 'Plotting' ? 'Progressing'
      : g.outcomeMode === 'Adjudicated' ? 'ReadyToResolve' : 'Accomplished';
    goals.push({ goalId: g.id, factionId: f.id, allocated: 1, rolled: 1, succeeded: ok, outcome, margin: ok ? total - dc : null, preempted: false });
  }
  collide(inp, goals, attempts);
  const ready = new Set(goals.filter(g => g.outcome === 'ReadyToResolve').map(g => g.goalId));
  const accepted = [...new Set(opts.accepted ?? [])].filter(id => ready.has(id)).sort(byOrdinal);
  return { version: FACTION_PHASE_VERSION, diceSource: usedPhysical ? (usedApp ? 'mixed' : 'physical') : 'app', allocations, guarding, attempts, goals, accepted };
}

/** §6.4: incompatible same-target Automatic Accomplishments: highest margin, then the earlier attempt. */
function collide(inp: FactionPhaseInputs, goals: FpGoalResult[], attempts: FpAttempt[]): void {
  const goal = new Map(inp.goals.map(g => [g.id, g]));
  const firstAttempt = (gid: string) => attempts.findIndex(a => a.goalId === gid);
  const byTarget = new Map<string, FpGoalResult[]>();
  for (const r of goals) {
    const g = goal.get(r.goalId)!;
    if (r.outcome !== 'Accomplished' || !g.targetEntityId) continue;
    if (!byTarget.has(g.targetEntityId)) byTarget.set(g.targetEntityId, []);
    byTarget.get(g.targetEntityId)!.push(r);
  }
  for (const list of byTarget.values()) {
    const wants = (r: FpGoalResult) => { const g = goal.get(r.goalId)!; return `${g.targetOwnerFactionId ?? ''}|${g.targetState ?? ''}`; };
    if (new Set(list.map(wants)).size < 2) continue;   // everyone wants the same end state: compatible
    list.sort((a, b) => (b.margin! - a.margin!) || (firstAttempt(a.goalId) - firstAttempt(b.goalId)));
    const winner = wants(list[0]);
    for (const r of list.slice(1)) if (wants(r) !== winner) { r.outcome = 'None'; r.preempted = true; }
  }
}

type NewEffect = Omit<EventEffect, 'id' | 'eventId'>;

/** A target the app can write (same rule as goals.ts hasMachineTarget, on the frozen goal). */
const machineTarget = (g: FpGoal) => !!g.targetEntityId
  && (g.targetEntityType === 'Character' ? !!g.targetState : g.targetEntityType === 'Asset' && !!(g.targetOwnerFactionId || g.targetState));

/** The Effects a Faction Phase writes, in order: per goal (attempt order) its advance; then the critical signals. */
export function factionPhaseEffects(inp: FactionPhaseInputs, res: FactionPhaseResults): NewEffect[] {
  const goal = new Map(inp.goals.map(g => [g.id, g]));
  const out: NewEffect[] = [];
  for (const r of res.goals) {
    const g = goal.get(r.goalId)!;
    if (r.outcome === 'Progressing') {
      for (const e of g.onProgressing ?? []) out.push(advanceEffectToEffect(e, g.factionId));
      out.push({ targetType: 'goal', targetId: g.id, property: 'status', delta: 0, value: 'Progressing', origin: 'FactionPhase' });
    }
    const accepted = r.outcome === 'ReadyToResolve' && res.accepted.includes(g.id);
    if (r.outcome === 'ReadyToResolve' && !accepted)
      out.push({ targetType: 'goal', targetId: g.id, property: 'readyToResolve', delta: 0, value: 'Ready', origin: 'FactionPhase' });
    if (r.outcome === 'Accomplished' || accepted) {
      // the target, when the app can apply it (an accepted goal may have none, e.g. a ritual), its advance Effects, then the status
      const base = { targetId: g.targetEntityId!, delta: 0, actorFactionId: g.factionId, origin: 'GoalGenerator' as const };
      if (machineTarget(g)) {
        if (g.targetEntityType === 'Character') out.push({ ...base, targetType: 'character', property: 'state', value: g.targetState });
        else if (g.targetOwnerFactionId) out.push({ ...base, targetType: 'asset', property: 'controllingFactionId', value: g.targetOwnerFactionId });
        else out.push({ ...base, targetType: 'asset', property: 'status', value: g.targetState });
      }
      for (const e of g.onAccomplished ?? []) out.push(advanceEffectToEffect(e, g.factionId));
      out.push({ targetType: 'goal', targetId: g.id, property: 'status', delta: 0, value: 'Accomplished', origin: 'FactionPhase' });
    }
  }
  for (const a of res.attempts) {
    if (!a.signal) continue;
    const g = goal.get(a.goalId)!;
    out.push({ targetType: 'faction', targetId: a.factionId, property: 'momentumSignal', delta: a.signal, origin: 'FactionPhase',
               value: `${a.signal > 0 ? 'Critical Success' : 'Critical Failure'} (${a.d1}+${a.d2}) on ${g.title}`, secondaryTargetId: a.id });
  }
  return out;
}

/** Canonical JSON (sorted keys) for hashing frozen inputs: the same object always yields the same string. */
export function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).filter(k => o[k] !== undefined).sort(byOrdinal).map(k => `${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
