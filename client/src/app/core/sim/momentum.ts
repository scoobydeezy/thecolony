// Momentum (M3, BOARD-GAME-REVIEW §5 and §17.2). Operational Momentum is a tier from −2 to +2: the operation-roll modifier.
//
// It changes only at a resolution boundary (the Colony Turn's Opening; until Colony Turns exist (M5) the replay uses the
// start of each session, which is where the Opening before Session N sits):
//   signals  = unconsumed signals, deduplicated per faction by (root cause, sign)
//   change   = clamp(sum(signals), −1, +1)
//   tier     = clamp(tier + change, −2, +2)
// A signal is a recorded fact with a stable root cause (the originating Effect or operation attempt), so M5 can store it
// unchanged when a Colony Turn commits.
//
// Sources (decided 2026-10-15, FACTION-PHASE-CRITICALS.md):
//   operations: only critical dice. A natural 12 is a Critical Success (+1, always succeeds); a natural 2 a Critical
//               Failure (−1, always fails). Each rolled attempt is its own root; unrolled attempts send nothing. (M5)
//   play:       a Keystone lost or Destroyed in play (not by the Faction Phase), the leader incapable or leaving, and
//               GM-declared major successes or setbacks. An Accomplishment sends no automatic signal.
// A faction that rolls nothing keeps its Momentum (no decay).

export type MomentumRule = 'gm-declared' | 'keystone-lost' | 'leader-incapable' | 'leader-left' | 'critical-success' | 'critical-failure';

export interface MomentumSignal {
  factionId: string;
  sign: 1 | -1;
  rule: MomentumRule;
  rootCauseId: string;      // originating Effect id (or `goal:<id>` for a detector transition with no single cause)
  sourceSessionId: string;
  reason: string;           // shown on the Board as a pending token
}

export interface MomentumResolution {
  factionId: string;
  signals: MomentumSignal[];   // after deduplication
  net: number;
  applied: -1 | 0 | 1;
  capped: boolean;             // |net| > 1
  from: number;
  to: number;
}

export const MOMENTUM_MIN = -2;
export const MOMENTUM_MAX = 2;

export const clampTier = (n: number): number => Math.max(MOMENTUM_MIN, Math.min(MOMENTUM_MAX, Math.round(n)));

/** Signals sharing a faction, root cause and sign count once (e.g. the Ledger theft is one −1 for Witnesses). */
export function dedupeSignals(signals: MomentumSignal[]): MomentumSignal[] {
  const seen = new Set<string>(); const out: MomentumSignal[] = [];
  for (const s of signals) {
    const key = `${s.factionId}|${s.rootCauseId}|${s.sign}`;
    if (!seen.has(key)) { seen.add(key); out.push(s); }
  }
  return out;
}

/** Resolves pending signals against the current tiers. Returns the new tiers and one record per faction with signals. */
export function resolveMomentum(tiers: Record<string, number>, pending: MomentumSignal[]): { tiers: Record<string, number>; resolutions: MomentumResolution[] } {
  const next = { ...tiers };
  const byFaction = new Map<string, MomentumSignal[]>();
  for (const s of dedupeSignals(pending)) {
    if (!byFaction.has(s.factionId)) byFaction.set(s.factionId, []);
    byFaction.get(s.factionId)!.push(s);
  }
  const resolutions: MomentumResolution[] = [];
  for (const [factionId, signals] of [...byFaction.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {   // ordinal (= server)
    const net = signals.reduce((s, x) => s + x.sign, 0);
    const applied = Math.max(-1, Math.min(1, net)) as -1 | 0 | 1;
    const from = next[factionId] ?? 0;
    const to = clampTier(from + applied);
    next[factionId] = to;
    resolutions.push({ factionId, signals, net, applied, capped: Math.abs(net) > 1, from, to });
  }
  return { tiers: next, resolutions };
}
