// The results of a Colony Turn as faction cards (the Review step and a completed turn's card): for each faction, the new
// world states its Faction Phase and Character Phase produced, and the Momentum the turn will cost or earn it.
// Pure: built from a turn's phase inputs and results (a draft's, or a committed turn's recorded ones).
import { FactionPhaseInputs, FactionPhaseResults } from '../../core/sim/faction-phase';
import { CharacterPhaseInputs, CharacterPhaseResults, CpCheckResult } from '../../core/sim/character-phase';
import { byOrdinal } from '../../core/sim/prng';

export interface ReviewItem {
  kind: 'goal' | 'character'; title: string; text: string; tone: 'good' | 'warn' | 'bad';
  dots?: 1 | 2 | 3;              // a character's state after the Turn: Stable ●○○ · Conflicted ●●○ · Compromised ●●● (none if they left)
}
export interface ReviewFaction {
  id: string; name: string;
  momentum: -1 | 0 | 1;          // the net the turn's signals will apply at the next Opening (capped ±1)
  momentumReasons: string[];
  items: ReviewItem[];
}
export interface ReviewNames {
  faction(id: string): string;
  goal(id: string): string;
  character(id: string): string;
  /** What becomes true at the goal's new stage: the text of the World Conditions it drives (2026-10-26). */
  worldResult(goalId: string, stage: 'Progressing' | 'Accomplished'): string | undefined;
}
export interface ReviewSource {
  fpInputs?: FactionPhaseInputs; fpResults?: FactionPhaseResults;
  cpInputs?: CharacterPhaseInputs; cpResults?: CharacterPhaseResults;
  /** Defection Checks an older Opening (op-2/op-3) recorded; their leader departures were resolved in that Opening. */
  legacyChecks?: CpCheckResult[];
}

export function reviewBoard(src: ReviewSource, names: ReviewNames): ReviewFaction[] {
  const items = new Map<string, ReviewItem[]>(), signals = new Map<string, { sign: number; reason: string }[]>();
  const item = (fid: string, x: ReviewItem) => { if (!items.has(fid)) items.set(fid, []); items.get(fid)!.push(x); };
  const signal = (fid: string, sign: number, reason: string) => { if (!signals.has(fid)) signals.set(fid, []); signals.get(fid)!.push({ sign, reason }); };

  // Faction Phase: goals that advanced (a deferred Ready goal has no world result yet), and critical dice
  const { fpInputs: fi, fpResults: fr } = src;
  if (fi && fr) {
    for (const g of fr.goals) {
      if (g.outcome === 'None' || g.preempted) continue;
      const accepted = (fr.accepted ?? []).includes(g.goalId);
      if (g.outcome === 'ReadyToResolve' && !accepted) continue;
      const progressing = g.outcome === 'Progressing';
      const text = names.worldResult(g.goalId, progressing ? 'Progressing' : 'Accomplished');
      item(g.factionId, { kind: 'goal', title: names.goal(g.goalId), tone: 'good',
                          text: text?.trim() || (progressing ? 'Now Progressing.' : 'Accomplished.') });
    }
    for (const a of fr.attempts)
      if (a.signal) signal(a.factionId, a.signal, `${a.signal > 0 ? 'Critical Success' : 'Critical Failure'} on ${names.goal(a.goalId)}`);
  }

  // Character Phase: departures, those who stayed after a crisis, and new crises
  const checked = (c: CpCheckResult, leader: boolean, legacy: boolean) => {
    const who = names.character(c.characterId), from = names.faction(c.factionId);
    if (c.left) {
      item(c.factionId, { kind: 'character', title: who, tone: 'bad', text: `${who}${leader ? ', its leader,' : ''} left ${from}.` });
      if (leader && !legacy) signal(c.factionId, -1, `${who}, its leader, left`);
    } else {
      item(c.factionId, { kind: 'character', title: who, tone: 'warn', text: `${who} stayed with ${from}, conflicted.`, dots: 2 });
    }
  };
  for (const c of src.legacyChecks ?? []) checked(c, false, true);
  const { cpInputs: ci, cpResults: cr } = src;
  if (cr) {
    for (const c of cr.checks ?? []) checked(c, !!ci?.checks.find(k => k.characterId === c.characterId)?.isLeader, false);
    for (const r of cr.rolls)
      if (r.to === 'Compromised' && r.from !== 'Compromised')
        item(r.factionId, { kind: 'character', title: names.character(r.characterId), tone: 'bad', dots: 3,
                            text: `${names.character(r.characterId)} is in crisis: play has one session to act.` });
  }

  const ids = [...new Set([...items.keys(), ...signals.keys()])].sort(byOrdinal);
  return ids.map(id => {
    const sig = signals.get(id) ?? [], net = sig.reduce((s, x) => s + x.sign, 0);
    return { id, name: names.faction(id), momentum: Math.max(-1, Math.min(1, net)) as -1 | 0 | 1,
             momentumReasons: sig.map(x => `${x.sign > 0 ? '+1' : '−1'} ${x.reason}`), items: items.get(id) ?? [] };
  }).filter(f => f.items.length || f.momentum !== 0);
}
