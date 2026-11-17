// Colony Turn Opening (M5). Pure: frozen inputs → results → Effects, re-derived by the server verifier.
//   Momentum resolution: the pending signals (the previous session's play, its Faction Phase criticals and its Character
//   Phase defections) deduplicated per (faction, root, sign), net, capped ±1, clamped ±2.
// Effects: an `opening` marker; one `momentumTier` delta per faction whose tier changed.
// op-4 (2026-10-15): Defection Checks moved to the Character Phase (§18.4), so a defection's impact on its faction
// (a leader leaving: −1) is resolved at the NEXT Opening. op-3 removed the unattended-outcome step.
import { EventEffect } from '../models/types';
import { MomentumSignal, MomentumResolution, resolveMomentum } from './momentum';

export const OPENING_VERSION = 'op-4';

export interface OpeningInputs {
  version: string; seed: number;
  tiers: Record<string, number>;          // Momentum in force before this Opening
  pending: MomentumSignal[];              // unconsumed signals (the previous session's play, Faction and Character Phases)
}
export interface OpeningResults {
  version: string; resolutions: MomentumResolution[]; tiers: Record<string, number>;
}

export function resolveOpening(inp: OpeningInputs): OpeningResults {
  const { tiers, resolutions } = resolveMomentum(inp.tiers, inp.pending);
  return { version: OPENING_VERSION, resolutions, tiers };
}

type NewEffect = Omit<EventEffect, 'id' | 'eventId'>;

export function openingEffects(_inp: OpeningInputs, res: OpeningResults): NewEffect[] {
  const out: NewEffect[] = [{ targetType: 'colony', targetId: 'colony', property: 'opening', delta: 0, value: 'resolved', origin: 'Opening' }];
  for (const r of res.resolutions) {
    if (r.to === r.from) continue;
    out.push({ targetType: 'faction', targetId: r.factionId, property: 'momentumTier', delta: r.to - r.from, origin: 'MomentumResolution',
               value: r.signals.map(s => `${s.sign > 0 ? '+1' : '−1'} ${s.reason}`).join('; ') });
  }
  return out;
}
