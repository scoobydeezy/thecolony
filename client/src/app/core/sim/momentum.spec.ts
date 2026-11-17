// M3: Momentum tiers, signals and resolution (BOARD-GAME-REVIEW §5).
import { buildColonySnapshots } from './replay';
import { MomentumSignal, dedupeSignals, resolveMomentum } from './momentum';

const vals = { a: 1/3, b: 1/3, c: 1/3 };
const fac = (id: string, extra: object = {}) => ({ id, name: id, type: 'Faction', active: true, momentum: 0, momentumTier: 0,
  baseLegitimacy: 50, powerModifier: 0, factionSize: 0, values: vals, ...extra }) as any;
const chr = (id: string, factionId: string) => ({ id, name: id, characterType: 'NPC', state: 'Alive', factionId, values: vals,
  conviction: 50, pressure: 0, influence: 50, impressionable: 50 }) as any;
const ledger = { id: 'ledger', name: 'The Ledger', type: 'Archive', role: 'Knowledge', tier: 3, keystone: true,
  status: 'Stable', controllingFactionId: 'witnesses' } as any;
const fx = (id: string, targetType: string, targetId: string, property: string, delta = 0, value?: string, secondaryTargetId?: string) =>
  ({ id, eventId: 'ev', targetType, targetId, property, delta, value, secondaryTargetId });
const sess = (n: number, effects: any[] = []) =>
  ({ id: `s${n}`, number: n, title: `S${n}`, act: 2, week: n, events: [{ id: `ev${n}`, sessionId: `s${n}`, title: 'x', sortOrder: 0, effects }] }) as any;
const rules = { cascadeRulesJson: '[]', stressTriggersJson: '[]', formulasJson: '' } as any;
const run = (factions: any[], sessions: any[], o: { chars?: any[]; assets?: any[]; goals?: any[] } = {}) =>
  buildColonySnapshots({} as any, factions, o.chars ?? [], sessions, rules, o.assets ?? [], o.goals ?? [], []);
const sig = (factionId: string, sign: 1 | -1, rootCauseId: string): MomentumSignal =>
  ({ factionId, sign, rule: 'gm-declared', rootCauseId, sourceSessionId: 's1', reason: 'r' });

describe('Momentum resolution (M3)', () => {
  it('signals sharing a faction, root cause and sign count once', () => {
    expect(dedupeSignals([sig('w', -1, 'E'), sig('w', -1, 'E'), sig('w', 1, 'E'), sig('s', -1, 'E')])).toHaveLength(3);
  });
  it('caps the change at one step', () => {
    const { tiers, resolutions } = resolveMomentum({ w: 0 }, [sig('w', -1, 'a'), sig('w', -1, 'b'), sig('w', -1, 'c')]);
    expect(tiers['w']).toBe(-1);
    expect(resolutions[0]).toMatchObject({ net: -3, applied: -1, capped: true, from: 0, to: -1 });
  });
  it('opposite signals net to zero', () => {
    const { tiers, resolutions } = resolveMomentum({ w: 1 }, [sig('w', 1, 'a'), sig('w', -1, 'b')]);
    expect(tiers['w']).toBe(1);
    expect(resolutions[0]).toMatchObject({ net: 0, applied: 0, capped: false });
  });
  it('clamps the tier to −2..+2', () => {
    expect(resolveMomentum({ w: -2 }, [sig('w', -1, 'a')]).tiers['w']).toBe(-2);
    expect(resolveMomentum({ w: 2 }, [sig('w', 1, 'a')]).tiers['w']).toBe(2);
  });
});

describe('Momentum in the replay (M3)', () => {
  it('starts from the GM-set baseline tier (clamped) and ignores legacy raw Momentum', () => {
    const [s1] = run([fac('a', { momentumTier: -2, momentum: 90 }), fac('b', { momentumTier: 5 })], [sess(1, [fx('m', 'faction', 'a', 'momentum', 50)])]);
    expect(s1.factionMomentumTier).toEqual({ a: -2, b: 2 });
    expect(s1.factionMomentum['a']).toBe(140);   // archived raw value still accumulates
    expect(s1.pendingMomentumSignals).toEqual([]);
  });

  it('a GM-declared signal waits for the next Opening, then moves one step', () => {
    const [s1, s2, s3] = run([fac('a')], [sess(1, [fx('g', 'faction', 'a', 'momentumSignal', 1, 'Won the vote')]), sess(2), sess(3)]);
    expect(s1.factionMomentumTier['a']).toBe(0);
    expect(s1.pendingMomentumSignals).toMatchObject([{ factionId: 'a', sign: 1, rule: 'gm-declared', rootCauseId: 'g', reason: 'Won the vote' }]);
    expect(s2.factionMomentumTier['a']).toBe(1);
    expect(s2.momentumResolutions).toMatchObject([{ factionId: 'a', applied: 1, from: 0, to: 1 }]);
    expect(s3.factionMomentumTier['a']).toBe(1);    // consumed: no second application
    expect(s3.momentumResolutions).toEqual([]);
  });

  it('the Ledger stolen in play: one −1 for Witnesses (deduplicated); the thief\'s Accomplishment sends nothing (2026-10-15)', () => {
    const steal = goal('take', 'shattered', { targetEntityType: 'Asset', targetEntityId: 'ledger', targetOwnerFactionId: 'shattered' });
    const [s1, s2] = run([fac('witnesses'), fac('shattered')], [sess(1, [
      { ...fx('theft', 'asset', 'ledger', 'controllingFactionId', 0, 'shattered'), actorFactionId: 'shattered' },   // M4: credited
      fx('decl', 'faction', 'witnesses', 'momentumSignal', -1, 'The Ledger is gone', 'theft'),   // same root cause
    ]), sess(2)], { assets: [ledger], goals: [steal] });
    const w = s1.pendingMomentumSignals.filter(s => s.factionId === 'witnesses');
    expect(w.map(s => s.rootCauseId)).toEqual(['theft', 'theft']);
    expect(s1.goalStatuses['take']).toBe('Accomplished');
    expect(s1.pendingMomentumSignals.find(s => s.factionId === 'shattered')).toBeUndefined();
    const rw = s2.momentumResolutions.find(r => r.factionId === 'witnesses')!;
    expect(rw.signals).toHaveLength(1);
    expect(rw).toMatchObject({ net: -1, applied: -1, capped: false });
    expect(s2.factionMomentumTier).toEqual({ witnesses: -1, shattered: 0 });
  });

  it('a Keystone lost to a Faction Phase operation sends no signal (felt through Power); the same loss in play does', () => {
    const op = { ...fx('o1', 'asset', 'ledger', 'controllingFactionId', 0, 'shattered'), origin: 'FactionPhase' };
    const [s1] = run([fac('witnesses'), fac('shattered')], [sess(1, [op])], { assets: [ledger] });
    expect(s1.pendingMomentumSignals).toEqual([]);
    const [p1] = run([fac('witnesses'), fac('shattered')], [sess(1, [{ ...op, origin: 'Manual' }])], { assets: [ledger] });
    expect(p1.pendingMomentumSignals).toMatchObject([{ factionId: 'witnesses', sign: -1, rule: 'keystone-lost' }]);
  });

  it('a Keystone Destroyed costs its owner; a non-Keystone does not', () => {
    const shed = { ...ledger, id: 'shed', name: 'Shed', keystone: false };
    const [s1] = run([fac('witnesses')], [sess(1, [fx('d1', 'asset', 'ledger', 'status', 0, 'Destroyed'), fx('d2', 'asset', 'shed', 'status', 0, 'Destroyed')])],
      { assets: [ledger, shed] });
    expect(s1.pendingMomentumSignals).toMatchObject([{ factionId: 'witnesses', sign: -1, rule: 'keystone-lost', rootCauseId: 'd1' }]);
  });

  it('the leader becoming incapable or leaving is −1; an ordinary member is not', () => {
    const f = [fac('a', { leaderId: 'boss' }), fac('b', { leaderId: 'chief' })];
    const chars = [chr('boss', 'a'), chr('grunt', 'a'), chr('chief', 'b')];
    const [s1] = run(f, [sess(1, [
      fx('k1', 'character', 'boss', 'state', 0, 'Missing'),
      fx('k2', 'character', 'grunt', 'state', 0, 'Dead'),
      fx('k3', 'character', 'chief', 'factionChange', 0, 'a'),
    ])], { chars });
    expect(s1.pendingMomentumSignals.map(s => [s.factionId, s.sign, s.rule, s.rootCauseId])).toEqual([
      ['a', -1, 'leader-incapable', 'k1'], ['b', -1, 'leader-left', 'k3']]);
  });

  it('a leader already incapable does not signal again on leaving', () => {
    const [s1] = run([fac('a', { leaderId: 'boss' })], [sess(1, [
      fx('k1', 'character', 'boss', 'state', 0, 'Dead'), fx('k2', 'character', 'boss', 'factionChange', 0, '')])], { chars: [chr('boss', 'a')] });
    expect(s1.pendingMomentumSignals.map(s => s.rootCauseId)).toEqual(['k1']);
  });

  it('an Accomplishment sends no automatic signal (2026-10-15); a GM-declared success is the way to reward it', () => {
    const g1 = goal('g1', 'a'), g2 = goal('g2', 'a', { conditionType: 'Maintain' });
    const [s1, s2] = run([fac('a')], [sess(1, [fx('w1', 'goal', 'g1', 'status', 0, 'Accomplished'), fx('w2', 'goal', 'g2', 'status', 0, 'Accomplished')]), sess(2)],
      { goals: [g1, g2] });
    expect(s1.goalStatuses['g1']).toBe('Accomplished');
    expect(s1.pendingMomentumSignals).toEqual([]);
    expect(s2.pendingMomentumSignals).toEqual([]);
  });
});

function goal(id: string, factionId: string, extra: object = {}) {
  return { id, factionId, title: id, status: 'Progressing', conditionType: 'Achieve', priority: 'Minor', visibility: 'Open', ...extra } as any;
}
