// The Review / completed-turn results board: new world states per faction, and the Momentum the turn will apply.
import { reviewBoard } from './colony-turn-review';

const names = { faction: (id: string) => id.toUpperCase(), goal: (id: string) => `Goal ${id}`, character: (id: string) => `Char ${id}`,
                worldResult: (id: string, stage: string) => id === 'g2' && stage === 'Accomplished' ? 'The Ledger is stolen.'
                                                          : id === 'g1' && stage === 'Progressing' ? 'An insider is placed.' : undefined };
const att = (id: string, factionId: string, goalId: string, signal: -1 | 0 | 1) => ({ id, factionId, goalId, index: 0, d1: 3, d2: 3, natural: 6,
  modifier: 0, defense: 0, total: 6, degree: 'Failure' as const, signal, source: 'app' as const });
const gr = (goalId: string, factionId: string, outcome: any, preempted = false) =>
  ({ goalId, factionId, allocated: 1, rolled: 1, succeeded: outcome !== 'None', outcome, margin: 0, preempted });
const fpInputs = { version: 'fp-4', seed: 1, target: 9, tokens: { Critical: 3, Major: 2, Minor: 1 }, factions: [],
  goals: [{ id: 'g1', factionId: 'a', title: '', priority: 'Major', status: 'Plotting', outcomeMode: 'Automatic', defense: 0 }] } as any;

describe('Colony Turn results board', () => {
  it('shows each faction\'s new world states; deferred and pre-empted goals have none; accepted ones do', () => {
    const fr = { version: 'fp-4', diceSource: 'app', allocations: [], attempts: [],
      goals: [gr('g1', 'a', 'Progressing'), gr('g2', 'b', 'ReadyToResolve'), gr('g3', 'b', 'ReadyToResolve'), gr('g4', 'c', 'Accomplished', true)],
      accepted: ['g2'] } as any;
    const b = reviewBoard({ fpInputs, fpResults: fr }, names);
    expect(b.map(f => [f.id, f.items.map(i => i.text)])).toEqual([['a', ['An insider is placed.']], ['b', ['The Ledger is stolen.']]]);
  });
  it('Momentum in the header: criticals and a departing leader, netted and capped ±1; factions with only Momentum appear', () => {
    const fr = { version: 'fp-4', diceSource: 'app', allocations: [], goals: [], accepted: [],
      attempts: [att('x#0', 'a', 'g1', 1), att('y#0', 'a', 'g1', 1), att('z#0', 'b', 'g1', -1)] } as any;
    const cr = { version: 'cp-2', settled: [], rolls: [], skipped: [],
      checks: [{ characterId: 'boss', factionId: 'b', d1: 6, d2: 6, total: 12, left: true, source: 'app' }] } as any;
    const ci = { checks: [{ characterId: 'boss', name: 'Boss', factionId: 'b', label: 'Tolerated', modifier: 0, isLeader: true }] } as any;
    const b = reviewBoard({ fpInputs, fpResults: fr, cpInputs: ci, cpResults: cr }, names);
    expect(b.map(f => [f.id, f.momentum, f.items.length])).toEqual([['a', 1, 0], ['b', -1, 1]]);
    expect(b[1].items[0]).toMatchObject({ kind: 'character', tone: 'bad', text: 'Char boss, its leader, left B.' });
    expect(b[1].momentumReasons).toHaveLength(2);
  });
  it('character world states: stayed after a check, and new crises; an older Opening\'s departures cost no Momentum here', () => {
    const cr = { version: 'cp-2', settled: ['s'], skipped: [], checks: [{ characterId: 'm', factionId: 'a', d1: 1, d2: 1, total: 2, left: false, source: 'app' }],
      rolls: [{ characterId: 'r', factionId: 'a', from: 'Conflicted', to: 'Compromised' }, { characterId: 'q', factionId: 'a', from: 'Stable', to: 'Conflicted' }] } as any;
    const b = reviewBoard({ cpResults: cr, legacyChecks: [{ characterId: 'old', factionId: 'c', d1: 6, d2: 6, total: 12, left: true, source: 'app' }] }, names);
    expect(b.map(f => [f.id, f.momentum, f.items.map(i => i.tone)])).toEqual([['a', 0, ['warn', 'bad']], ['c', 0, ['bad']]]);
    expect(b.map(f => f.items.map(i => i.dots))).toEqual([[2, 3], [undefined]]);   // stayed: Conflicted · crisis: Compromised · left: no track
  });
});
