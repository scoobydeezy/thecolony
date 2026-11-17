// Character Phase (M6; BOARD-GAME-REVIEW §17.2 steps 8–9, §17.3, §18.4). Pure: frozen inputs + dice → results →
// Effects, re-derived by the server verifier (Services/ColonyTurnEngine.cs). cp-2: every character action of the Turn.
//   7. Defection Checks (moved here from the Opening, §18.4): every character still Compromised makes 2d6 + label
//      modifier ≥ target, the label being the FULL relationship score toward its faction (stress 0, no bump, belief
//      overrides included). Success: leaves the faction and returns to Stable (its goals lose their champion; a leader
//      leaving is a −1 signal, resolved at the NEXT Opening). Failure: back to Conflicted. Each check consumes its
//      faction's Drift Roll for the Turn.
//   8. Settle: Conflicted characters whose band is Steady → Stable (a recovery).
//   9. Per faction (ordinal id order) whose roll was not consumed by a Defection Check: its eligible
//      member (band ≠ Steady, not Compromised, not exempt, not Reaffirmed for this faction) with the highest Drift Risk
//      (ties: earlier name, then id) makes a Drift Roll 2d6 + band modifier ≥ target. Success advances one state
//      (Stable → Conflicted → Compromised: a visible crisis); failure retreats one (Conflicted → Stable is a recovery).
// Drift Risk itself (effective Pressure − effective Conviction) is computed when the inputs are built and frozen; this
// phase never touches Values, Beliefs, Pressure, Conviction or the Drift vector.
import { CharacterInstability, EventEffect, RelationshipLabel } from '../models/types';
import { mulberry32, randInt, byOrdinal } from './prng';

export const CHARACTER_PHASE_VERSION = 'cp-2';

/** Defection Check modifier by the character's label toward its own faction (provisional, §7.4). */
export const DEFECTION_MODIFIERS: Record<RelationshipLabel, number> =
  { Aligned: -3, Cooperative: -2, Friendly: -1, Tolerated: 0, Strained: 1, Opposed: 2, Hostile: 3 };
export interface CpCheck { characterId: string; name: string; factionId: string; label: RelationshipLabel; modifier: number; isLeader: boolean }
/** app: the seeded stream · physical: table dice · reroll: re-rolled in the app (§18.5), recorded as rolled */
export type CpDiceSource = 'app' | 'physical' | 'reroll';
export interface CpCheckResult { characterId: string; factionId: string; d1: number; d2: number; total: number; left: boolean; source: CpDiceSource }
export type DriftBand = 'Steady' | 'Strained' | 'Wavering' | 'Breaking';
export const BAND_MODIFIERS: Record<Exclude<DriftBand, 'Steady'>, number> = { Strained: -1, Wavering: 0, Breaking: 1 };

export function bandOf(drift: number, waveringAt: number, breakingAt: number): DriftBand {
  return drift <= 0 ? 'Steady' : drift < waveringAt ? 'Strained' : drift < breakingAt ? 'Wavering' : 'Breaking';
}

export interface CpCharacter {
  id: string; name: string; factionId: string; instability: CharacterInstability;
  drift: number;              // Drift Risk, rounded to 0.01 when frozen
  exempt: boolean;            // recovered since the previous Character Phase (skipped once)
  reaffirmed: boolean;        // Reaffirmed for this faction (never nominated again here)
}
export interface CharacterPhaseInputs {
  version: string; seed: number; target: number; waveringAt: number; breakingAt: number;
  bandModifiers: Record<string, number>;
  defectionTarget: number;
  checks: CpCheck[];          // Compromised characters (Defection Checks), ordinal id order
  factions: string[];         // operating factions, ordinal order
  characters: CpCharacter[];  // alive NPC members of those factions, ordinal id order
}
export interface CpRoll {
  characterId: string; factionId: string; drift: number; band: DriftBand; modifier: number;
  d1: number; d2: number; total: number; success: boolean;
  from: CharacterInstability; to: CharacterInstability; source: CpDiceSource;
}
export interface CharacterPhaseResults {
  version: string;
  checks: CpCheckResult[];                                      // Defection Checks, ordinal id order
  settled: string[];                                            // Conflicted → Stable by Settling
  rolls: CpRoll[];
  skipped: { factionId: string; reason: 'consumed' | 'no eligible member' }[];
}

export const characterDiceStream = (seed: number) => mulberry32((seed ^ 0x85EBCA6B) >>> 0);
/** Defection Check dice: their own stream (the former Opening stream), so checks never shift the Drift Rolls' dice. */
export const defectionDiceStream = (seed: number) => mulberry32((seed ^ 0xC2B2AE35) >>> 0);

/** `physical`: table dice by character id, for Defection Checks and Drift Rolls alike (a checked character never
 *  makes a Drift Roll: it is Compromised and its faction's roll is consumed, so the keys never collide). */
export function resolveCharacterPhase(inp: CharacterPhaseInputs, physical: Record<string, [number, number]> = {},
                                      opts: { overrideSource?: Exclude<CpDiceSource, 'app'> } = {}): CharacterPhaseResults {
  const overrideSource = opts.overrideSource ?? 'physical';
  const checkDice = defectionDiceStream(inp.seed);
  const checks: CpCheckResult[] = [];
  for (const c of [...inp.checks].sort((a, b) => byOrdinal(a.characterId, b.characterId))) {
    const app: [number, number] = [1 + randInt(checkDice, 6), 1 + randInt(checkDice, 6)];
    const [d1, d2] = physical[c.characterId] ?? app;
    const total = d1 + d2 + c.modifier;
    checks.push({ characterId: c.characterId, factionId: c.factionId, d1, d2, total, left: total >= inp.defectionTarget,
                  source: physical[c.characterId] ? overrideSource : 'app' });
  }
  const consumed = new Set(checks.map(c => c.factionId));
  const band = (c: CpCharacter) => bandOf(c.drift, inp.waveringAt, inp.breakingAt);
  const chars = [...inp.characters].sort((a, b) => byOrdinal(a.id, b.id));
  const settled = chars.filter(c => c.instability === 'Conflicted' && band(c) === 'Steady').map(c => c.id);
  const settledSet = new Set(settled);
  const state = (c: CpCharacter): CharacterInstability => settledSet.has(c.id) ? 'Stable' : c.instability;
  const dice = characterDiceStream(inp.seed);
  const rolls: CpRoll[] = []; const skipped: CharacterPhaseResults['skipped'] = [];
  for (const f of [...inp.factions].sort(byOrdinal)) {
    if (consumed.has(f)) { skipped.push({ factionId: f, reason: 'consumed' }); continue; }
    const eligible = chars.filter(c => c.factionId === f && band(c) !== 'Steady' && state(c) !== 'Compromised' && !c.exempt && !c.reaffirmed);
    if (!eligible.length) { skipped.push({ factionId: f, reason: 'no eligible member' }); continue; }
    const c = eligible.sort((a, b) => (b.drift - a.drift) || byOrdinal(a.name, b.name) || byOrdinal(a.id, b.id))[0];
    const app: [number, number] = [1 + randInt(dice, 6), 1 + randInt(dice, 6)];   // the stream advances once per roll
    const [d1, d2] = physical[c.id] ?? app;
    const b = band(c), modifier = inp.bandModifiers[b] ?? 0, total = d1 + d2 + modifier, success = total >= inp.target;
    const from = state(c);
    const to: CharacterInstability = success ? (from === 'Stable' ? 'Conflicted' : 'Compromised') : 'Stable';
    rolls.push({ characterId: c.id, factionId: f, drift: c.drift, band: b, modifier, d1, d2, total, success, from, to,
                 source: physical[c.id] ? overrideSource : 'app' });
  }
  return { version: CHARACTER_PHASE_VERSION, checks, settled, rolls, skipped };
}

type NewEffect = Omit<EventEffect, 'id' | 'eventId'>;

/** Effects: a marker (for the exemption bookkeeping); per Defection Check its record and consequences; then Settlings;
 *  then each roll that changed a state. */
export function characterPhaseEffects(res: CharacterPhaseResults): NewEffect[] {
  const out: NewEffect[] = [{ targetType: 'colony', targetId: 'colony', property: 'characterPhase', delta: 0, value: 'resolved', origin: 'CharacterPhase' }];
  for (const r of res.checks) {
    out.push({ targetType: 'character', targetId: r.characterId, property: 'defectionCheck', delta: r.total, value: r.left ? 'left' : 'stayed',
               secondaryTargetId: r.factionId, origin: 'CharacterPhase' });
    if (r.left) out.push({ targetType: 'character', targetId: r.characterId, property: 'factionChange', delta: 0, value: '', origin: 'CharacterPhase' });
    out.push({ targetType: 'character', targetId: r.characterId, property: 'instability', delta: 0, value: r.left ? 'Stable' : 'Conflicted', origin: 'CharacterPhase' });
  }
  for (const id of res.settled) out.push({ targetType: 'character', targetId: id, property: 'instability', delta: 0, value: 'Stable', origin: 'CharacterPhase' });
  for (const r of res.rolls)
    if (r.to !== r.from) out.push({ targetType: 'character', targetId: r.characterId, property: 'instability', delta: 0, value: r.to, origin: 'CharacterPhase' });
  return out;
}
