// Goals (M4, BOARD-GAME-REVIEW §6, §14.5, §14.6, §15.4). Pure functions shared by the replay engine and the views.
//
// A Goal defines a desired world change; a Colony Turn determines whether progress occurs; an Event records what
// actually happened (simplified 2026-10-15: no authored encounter, deadline or unattended outcome on the goal).
// Stored statuses: Plotting (Planning), Progressing, Accomplished, Failed, Retired (Stalled is legacy). Overlays say why a
// goal is out of the Faction Phase pool and are always derived, never extra progress states:
//   Dormant          champion missing, incapable, or no longer in the goal's faction (a defector does not take the goal)
//   Ready to Resolve a goal that does not Auto-Resolve succeeded: a GM resolution task (a replayed overlay, see replay.ts)
//   Active Operation a live Act III clock (M8; never set yet)
//   Already holds    the target condition is true but was never brought about (e.g. the goal was written after the
//                    fact): a flag for the GM to retire or edit the goal; out of the pool while it holds
// Completion (§18.3): the world is authoritative. Any Effect that makes the target condition true (false → true)
// Accomplishes the goal, whoever caused it; who caused it is recorded separately (attribution, no credit or Momentum).
// Accomplished is permanent: later Events that reverse the condition do not undo it.
// A goal is in exactly one arena: the pool, or play.
import {
  Asset, AssetStatus, Character, CharacterState, CampaignEvent, EventEffect, FactionGoal, GoalReady, TERMINAL_GOAL_STATUSES,
} from '../models/types';

/** The facts a goal reads. Built from projected entities (views) or from the replay's working maps. */
export interface GoalWorld {
  characterState(id: string): CharacterState | undefined;
  characterFaction(id: string): string | undefined;
  characterName(id: string): string;
  assetOwner(id: string): string | undefined;
  assetStatus(id: string): AssetStatus | undefined;
  assetName(id: string): string;
}

export function worldOf(characters: Character[], assets: Asset[]): GoalWorld {
  const c = new Map(characters.map(x => [x.id, x])), a = new Map(assets.map(x => [x.id, x]));
  return {
    characterState: id => c.get(id)?.state,
    characterFaction: id => c.get(id)?.factionId,
    characterName: id => c.get(id)?.name ?? id,
    assetOwner: id => a.get(id)?.controllingFactionId,
    assetStatus: id => a.get(id)?.status,
    assetName: id => a.get(id)?.name ?? id,
  };
}

export const isTerminal = (g: Pick<FactionGoal, 'status'>) => TERMINAL_GOAL_STATUSES.includes(g.status);

/** Does the goal have a machine-readable target the engine can test and write? */
export function hasMachineTarget(g: FactionGoal): boolean {
  if (!g.targetEntityId) return false;
  if (g.targetEntityType === 'Character') return !!g.targetState;
  if (g.targetEntityType === 'Asset') return !!(g.targetOwnerFactionId || g.targetState);
  return false;   // Faction targets (legacy derived-value thresholds) are not machine-readable since M2
}

/** Is the goal's declared target condition true? null when the goal has no machine-readable target. */
export function goalConditionMet(g: FactionGoal, w: GoalWorld): boolean | null {
  if (!hasMachineTarget(g)) return null;
  const id = g.targetEntityId!;
  if (g.targetEntityType === 'Character') return w.characterState(id) === g.targetState;
  if (g.targetOwnerFactionId) return w.assetOwner(id) === g.targetOwnerFactionId;
  return w.assetStatus(id) === g.targetState;
}

const IRREVERSIBLE: CharacterState[] = ['Dead', 'Forgotten'];

/** Why the goal can no longer happen as written, or null. A flag for the GM, who retires it; never applied automatically. */
export function obsolescence(g: FactionGoal, w: GoalWorld): string | null {
  if (isTerminal(g) || !g.targetEntityId) return null;
  if (g.targetEntityType === 'Character') {
    const st = w.characterState(g.targetEntityId);
    const wanted: CharacterState = g.conditionType === 'Maintain' ? 'Alive' : (g.targetState as CharacterState);
    if (st && IRREVERSIBLE.includes(st) && st !== wanted) return `${w.characterName(g.targetEntityId)} is ${st}`;
  }
  if (g.targetEntityType === 'Asset' && w.assetStatus(g.targetEntityId) === 'Destroyed'
      && !(g.conditionType === 'Achieve' && !g.targetOwnerFactionId && g.targetState === 'Destroyed'))
    return `${w.assetName(g.targetEntityId)} is Destroyed`;
  return null;
}

/** Dormant reason (champion missing, incapable, or outside the goal's faction), or null. */
export function dormancy(g: FactionGoal, w: GoalWorld): string | null {
  if (!g.championId) return 'No champion';
  const st = w.characterState(g.championId), name = w.characterName(g.championId);
  if (st !== 'Alive') return `Champion ${name} is ${st ?? 'absent'}`;
  if (w.characterFaction(g.championId) !== g.factionId) return `Champion ${name} left the faction`;
  return null;
}

/** §6.5 defensive assignment (a Maintain goal). Active ⇔ champion capable ∧ in the faction ∧ protection condition. */
export function defenseState(g: FactionGoal, w: GoalWorld): { active: boolean; reason: string } {
  const d = dormancy(g, w);
  if (d) return { active: false, reason: d };
  if (!g.targetEntityId) return { active: false, reason: 'No protected target' };
  if (g.targetEntityType === 'Asset') {
    if (w.assetOwner(g.targetEntityId) !== g.factionId) return { active: false, reason: `${w.assetName(g.targetEntityId)} is not held` };
    if (w.assetStatus(g.targetEntityId) === 'Destroyed') return { active: false, reason: `${w.assetName(g.targetEntityId)} is Destroyed` };
    return { active: true, reason: `Defending ${w.assetName(g.targetEntityId)}` };
  }
  if (g.targetEntityType === 'Character') {
    const st = w.characterState(g.targetEntityId);
    return st === 'Alive' ? { active: true, reason: `Protecting ${w.characterName(g.targetEntityId)}` }
                          : { active: false, reason: `${w.characterName(g.targetEntityId)} is ${st ?? 'absent'}` };
  }
  return { active: false, reason: 'Assignments protect an Asset or a Character' };
}

const ROMAN = ['', 'I', 'II', 'III'];
export const actLabel = (act: number) => `Act ${ROMAN[act] ?? act}`;

/** §18.6: the Act from which the faction may pursue the goal in the Faction Phase (default II). */
export const earliestActOf = (g: Pick<FactionGoal, 'earliestAct'>) => Math.min(3, Math.max(1, g.earliestAct ?? 2));

export interface GoalAssessment {
  dormant: string | null;
  ready: GoalReady | undefined;
  alreadyHolds: boolean;
  obsolete: string | null;
  notYetEligible: number | null;   // §18.6: the goal's Earliest Act, while the current Act is before it (else null)
  defense: { active: boolean; reason: string } | null;   // Maintain only
  eligible: boolean;                // may be nominated in the Faction Phase
  ineligibleReasons: string[];
}

/** Everything the Board and the Faction Phase need about one goal, at the viewed point in history.
 *  `g` should be projected (status, champion, ready); `w` built from the projected world. `currentAct` is the Act the
 *  Faction Phase runs in (omit it to ignore Earliest Act). No authored text or structured target is ever required:
 *  an Auto-Resolve goal without one resolves narratively (its Completed World State). */
export function assessGoal(g: FactionGoal, w: GoalWorld, currentAct?: number): GoalAssessment {
  const achieve = g.conditionType === 'Achieve';
  const dormant = dormancy(g, w);
  const ready = g.ready;
  const alreadyHolds = achieve && !isTerminal(g) && goalConditionMet(g, w) === true;
  const obsolete = obsolescence(g, w);
  // §18.6 / 2026-10-22: Achieve goals and Maintain assignments alike wait for their Earliest Act
  const notYet = !isTerminal(g) && currentAct !== undefined && currentAct < earliestActOf(g) ? earliestActOf(g) : null;
  const reasons: string[] = [];
  if (!achieve) reasons.push('Defensive assignment');
  else if (isTerminal(g)) reasons.push(g.status);
  else {
    if (dormant) reasons.push(`Dormant: ${dormant}`);
    if (ready) reasons.push('Ready to Resolve (awaiting the GM)');
    if (alreadyHolds) reasons.push('Target already holds (retire or edit the goal)');
    if (obsolete) reasons.push(`Obsolete: ${obsolete}`);
    if (notYet) reasons.push(`Not yet eligible (from ${actLabel(notYet)})`);
  }
  return {
    dormant: achieve || g.conditionType === 'Maintain' ? dormant : null,
    ready, alreadyHolds, obsolete, notYetEligible: notYet,
    // a Maintain assignment is not in force before its Earliest Act: it neither defends nor guards
    defense: achieve ? null : notYet ? { active: false, reason: `Not in force before ${actLabel(notYet)}` } : defenseState(g, w),
    eligible: reasons.length === 0,
    ineligibleReasons: reasons,
  };
}

/** Who brought a goal's completion about (§18.3), for the record only: the causing Effect's actor, else a Helping
 *  `participate` on the goal in the same Event (the participant's faction, or the participant itself, e.g. 'party').
 *  Null when nobody is recorded (a GM-declared or derived change). Never a condition for completion. */
export function attributionOf(g: Pick<FactionGoal, 'id'>, cause: EventEffect | undefined, event: CampaignEvent | undefined,
                              factionOf: (id: string) => string | undefined): string | null {
  if (cause?.actorFactionId) return cause.actorFactionId;
  const help = (event?.effects ?? []).find(ef => ef.targetType === 'goal' && ef.targetId === g.id && ef.property === 'participate'
    && (ef.value ?? 'Helping') === 'Helping' && !!ef.secondaryTargetId);
  return help ? factionOf(help.secondaryTargetId!) ?? help.secondaryTargetId! : null;
}

/** The Effects "resolve as declared" writes for a goal: its target (attributed to the goal's faction) and Accomplished. */
export function declaredResolutionEffects(g: FactionGoal): Omit<EventEffect, 'id' | 'eventId'>[] {
  const out: Omit<EventEffect, 'id' | 'eventId'>[] = [];
  if (hasMachineTarget(g)) {
    const base = { targetId: g.targetEntityId!, delta: 0, actorFactionId: g.factionId };
    if (g.targetEntityType === 'Character') out.push({ ...base, targetType: 'character', property: 'state', value: g.targetState });
    else if (g.targetOwnerFactionId) out.push({ ...base, targetType: 'asset', property: 'controllingFactionId', value: g.targetOwnerFactionId });
    else out.push({ ...base, targetType: 'asset', property: 'status', value: g.targetState });
  }
  out.push({ targetType: 'goal', targetId: g.id, property: 'status', delta: 0, value: 'Accomplished' });
  return out;
}

// ── §18.8 champions: one active assignment per character ────────────────────
/** A goal occupies its champion while it is active: not Accomplished, Failed or Retired (Planning, Progressing and the
 *  legacy Stalled count, including while Dormant, Not yet eligible or Ready to Resolve; incapacity frees no one). */
export const occupiesChampion = (g: Pick<FactionGoal, 'status' | 'championId'>) => !!g.championId && !isTerminal(g);

/** Character id → the active goals and assignments it champions (more than one only in legacy data). */
export function championLoads(goals: FactionGoal[]): Map<string, FactionGoal[]> {
  const out = new Map<string, FactionGoal[]>();
  for (const g of goals) if (occupiesChampion(g)) out.set(g.championId!, [...(out.get(g.championId!) ?? []), g]);
  return out;
}

/** Faction Goals.md §I: champions are reassigned by hand as their goals finish. Per faction, the living members who champion
 *  no active goal or assignment (available for reassignment), and the faction's active goals with no champion. Only factions
 *  with someone available are listed. Pass characters and goals projected to the moment of interest. */
export function championVacancies(characters: Character[], goals: FactionGoal[]): { factionId: string; available: Character[]; unassigned: FactionGoal[] }[] {
  const busy = new Set(goals.filter(occupiesChampion).map(g => g.championId!));
  const out = new Map<string, Character[]>();
  for (const c of characters)
    if (c.factionId && c.state === 'Alive' && !busy.has(c.id)) out.set(c.factionId, [...(out.get(c.factionId) ?? []), c]);
  return [...out].map(([factionId, available]) => ({
    factionId, available,
    unassigned: goals.filter(g => g.factionId === factionId && !g.championId && !isTerminal(g)),
  }));
}

/** The champions a goal may take: living members of its faction who champion no OTHER active goal or assignment, plus
 *  its current champion (always kept, even when legacy data assigns them elsewhere too). */
export function championOptions(goal: Pick<FactionGoal, 'id' | 'factionId' | 'championId'>, characters: Character[], goals: FactionGoal[]): Character[] {
  const busy = new Set(goals.filter(g => g.id !== goal.id && occupiesChampion(g)).map(g => g.championId!));
  return characters.filter(c => c.id === goal.championId
    || (c.factionId === goal.factionId && c.state === 'Alive' && !busy.has(c.id)));
}
