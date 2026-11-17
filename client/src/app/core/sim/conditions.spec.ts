// §18.6/§18.9 World Conditions: in force ⇔ established ∧ every requirement holds; derived from replayed history; in-force
// conditions add their Stress contribution to the snapshot's Colony Stress.
import { evaluateConditions, conditionChanges, conditionWorldAt, ConditionRequirement, goalStageOf, goalStageTexts, conditionsDrivenBy } from './conditions';
import { buildColonySnapshots } from './replay';
import { WorldCondition } from '../models/types';

const vals = { a: 1 / 3, b: 1 / 3, c: 1 / 3 };
const fac = (id: string, leaderId?: string) => ({ id, name: id, type: 'Faction', active: true, momentum: 0, momentumTier: 0, baseLegitimacy: 50,
  powerModifier: 0, factionSize: 0, values: vals, leaderId }) as any;
const chr = (id: string, factionId: string) => ({ id, name: id, characterType: 'NPC', state: 'Alive', factionId, values: vals,
  conviction: 50, pressure: 0, influence: 50, impressionable: 50 }) as any;
const asset = (id: string, owner: string, status = 'Stable') => ({ id, name: id, type: 't', role: 'Covert', tier: 3, status, keystone: false,
  controllingFactionId: owner }) as any;
const loc = (id: string) => ({ id, name: id, state: 'Stable' }) as any;
const cond = (id: string, reqs: ConditionRequirement[] = [], x: Partial<WorldCondition> = {}): WorldCondition =>
  ({ id, campaignId: '', title: id, rule: `${id} rule`, activeAtStart: true, sortOrder: 0, requirementsJson: JSON.stringify(reqs), stressContribution: 0, ...x });
let n = 0;
const fx = (targetType: string, targetId: string, property: string, value: string, delta = 0) => ({ id: `e${++n}`, eventId: 'ev', targetType, targetId, property, delta, value });
const sess = (num: number, effects: any[] = []) => ({ id: `s${num}`, number: num, title: `S${num}`, act: 2, week: num,
  events: [{ id: `ev${num}`, sessionId: `s${num}`, title: `Event ${num}`, sortOrder: 0, effects }] }) as any;
const rules = { cascadeRulesJson: '[]', stressTriggersJson: '[]', formulasJson: '' } as any;
const names = { asset: (id: string) => id, faction: (id: string) => id, character: (id: string) => id, location: (id: string) => id };
const factions = [fac('aspis', 'vara'), fac('cult', 'maelyn'), fac('shattered'), fac('order')];
const characters = [chr('vara', 'aspis'), chr('maelyn', 'cult')];
const assets = [asset('registry', 'aspis'), asset('ledger', 'witnesses'), asset('chest', 'cult'), asset('ddn', 'shattered')];
const locations = [loc('rift'), loc('harbor')];
const base = { assets, characters, factions, locations };
const replay = (sessions: any[], conds: WorldCondition[] = []) =>
  buildColonySnapshots({} as any, factions, characters, sessions, rules, assets, [], locations, conds);
const at = (conds: WorldCondition[], snap: any) => evaluateConditions(conds, conditionWorldAt(snap, base), names);
const inForce = (conds: WorldCondition[], snap: any) => [...at(conds, snap).values()].filter(s => s.inForce).map(s => s.condition.id).sort();

describe('World Conditions', () => {
  it('Dead Drop Network: loot 4–6 / 5–6 / 6 follows the Asset\'s status, with no cache bookkeeping', () => {
    const conds = [cond('loot46', [{ kind: 'assetStatus', assetId: 'ddn', statuses: ['Stable', 'Contested'] }]),
                   cond('loot56', [{ kind: 'assetStatus', assetId: 'ddn', statuses: ['Damaged'] }]),
                   cond('loot6', [{ kind: 'assetStatus', assetId: 'ddn', statuses: ['Destroyed'] }])];
    const [s1, s2] = replay([sess(1, [fx('asset', 'ddn', 'status', 'Damaged')]), sess(2, [fx('asset', 'ddn', 'status', 'Destroyed')])]);
    expect([inForce(conds, null), inForce(conds, s1), inForce(conds, s2)]).toEqual([['loot46'], ['loot56'], ['loot6']]);
    expect(at(conds, s1).get('loot56')!.reason).toBe('from the start; ddn is Damaged (holds)');
  });
  it('the Cult\'s Registry and Ledger modifiers: each in force only while the Cult controls its Asset; both can be in force', () => {
    const conds = [cond('reg', [{ kind: 'assetController', assetId: 'registry', factionId: 'cult' }]),
                   cond('led', [{ kind: 'assetController', assetId: 'ledger', factionId: 'cult' }])];
    const [s1, s2, s3] = replay([sess(1, [fx('asset', 'registry', 'controllingFactionId', 'cult')]),
                                 sess(2, [fx('asset', 'ledger', 'controllingFactionId', 'cult')]),
                                 sess(3, [fx('asset', 'registry', 'controllingFactionId', 'aspis')])]);
    expect([inForce(conds, null), inForce(conds, s1), inForce(conds, s2), inForce(conds, s3)]).toEqual([[], ['reg'], ['led', 'reg'], ['led']]);
    expect(conditionChanges(at(conds, s2), at(conds, s3))).toMatchObject({ started: [], ended: [{ condition: { id: 'reg' } }] });
  });
  it('requirements are ANDed; a state list within one is OR', () => {
    const conds = [cond('both', [{ kind: 'assetController', assetId: 'chest', factionId: 'cult' },
                                 { kind: 'assetStatus', assetId: 'chest', statuses: ['Stable', 'Contested'] }])];
    const [s1, s2, s3] = replay([sess(1, [fx('asset', 'chest', 'status', 'Contested')]), sess(2, [fx('asset', 'chest', 'status', 'Damaged')]),
                                 sess(3, [fx('asset', 'chest', 'status', 'Stable'), fx('asset', 'chest', 'controllingFactionId', 'aspis')])]);
    expect([inForce(conds, null), inForce(conds, s1), inForce(conds, s2), inForce(conds, s3)]).toEqual([['both'], ['both'], [], []]);
  });
  it('character state, character faction and a capable leader', () => {
    const conds = [cond('varaGone', [{ kind: 'characterState', characterId: 'vara', states: ['Dead', 'Missing'] }]),
                   cond('turncoat', [{ kind: 'characterFaction', characterId: 'maelyn', factionId: 'aspis' }]),
                   cond('cultLeaderless', [{ kind: 'leaderCapable', factionId: 'cult', capable: false }]),
                   cond('aspisLed', [{ kind: 'leaderCapable', factionId: 'aspis', capable: true }])];
    const [s1, s2] = replay([sess(1, [fx('character', 'vara', 'state', 'Missing')]),
                             sess(2, [fx('character', 'maelyn', 'factionChange', 'aspis')])]);
    expect(inForce(conds, null)).toEqual(['aspisLed']);
    expect(inForce(conds, s1)).toEqual(['varaGone']);                                 // ASPIS's leader is Missing: not capable
    expect(inForce(conds, s2)).toEqual(['cultLeaderless', 'turncoat', 'varaGone']);   // the Cult's leader left it
  });
  it('Location state: a transient Active Incursion holds the condition only while it lasts', () => {
    const conds = [cond('breach', [{ kind: 'locationState', locationId: 'rift', states: ['ActiveIncursion'] }])];
    const [s1, s2] = replay([sess(1, [fx('location', 'rift', 'state', 'ActiveIncursion')]), sess(2, [fx('location', 'rift', 'state', 'Unstable')])]);
    expect([inForce(conds, null), inForce(conds, s1), inForce(conds, s2)]).toEqual([[], ['breach'], []]);
    expect(at(conds, s1).get('breach')!.reason).toBe('from the start; rift is Active Incursion (holds)');
  });
  it('a condition on another condition: Totality (set manually) gates its dependents; negation works', () => {
    const conds = [cond('totality', [], { activeAtStart: false }),
                   cond('eclipse', [{ kind: 'condition', conditionId: 'totality', inForce: true }]),
                   cond('daylight', [{ kind: 'condition', conditionId: 'totality', inForce: false }])];
    const [s1, s2] = replay([sess(1, [fx('condition', 'totality', 'state', 'Active')]), sess(2, [fx('condition', 'totality', 'state', 'Ended')])]);
    expect([inForce(conds, null), inForce(conds, s1), inForce(conds, s2)]).toEqual([['daylight'], ['eclipse', 'totality'], ['daylight']]);
  });
  it('Events establish and end a condition; the latest Event wins; its provenance is the reason', () => {
    const conds = [cond('watch', [], { activeAtStart: false })];
    const [s1, s2] = replay([sess(1, [fx('condition', 'watch', 'state', 'Active')]), sess(2, [fx('condition', 'watch', 'state', 'Ended')])]);
    expect([inForce(conds, null), inForce(conds, s1), inForce(conds, s2)]).toEqual([[], ['watch'], []]);
    expect(at(conds, s1).get('watch')!.reason).toBe('established in Session 1 (Event 1)');
    expect(at(conds, s2).get('watch')!.reason).toBe('ended in Session 2 (Event 2)');
  });
  it('established but a requirement fails: not in force, and the reason says which part fails', () => {
    const conds = [cond('perrik', [{ kind: 'assetController', assetId: 'registry', factionId: 'aspis' }], { activeAtStart: false })];
    const [s1, s2] = replay([sess(1, [fx('condition', 'perrik', 'state', 'Active')]), sess(2, [fx('asset', 'registry', 'controllingFactionId', 'cult')])]);
    expect(at(conds, s1).get('perrik')!.inForce).toBe(true);
    expect(at(conds, s2).get('perrik')).toMatchObject({ established: true, dependencyHolds: false, inForce: false,
      reason: 'established in Session 1 (Event 1); aspis controls registry (does not hold)' });
  });
  it('a dependency cycle never holds and never loops; a removed condition is never in force', () => {
    const conds = [cond('a', [{ kind: 'condition', conditionId: 'b', inForce: true }]), cond('b', [{ kind: 'condition', conditionId: 'a', inForce: true }]),
                   cond('orphan', [{ kind: 'condition', conditionId: 'gone', inForce: true }])];
    expect(inForce(conds, null)).toEqual([]);
  });
  it('Stress (§18.10): only the in-force contributions, clamped 0–10; it falls as soon as a condition stops holding', () => {
    const conds = [cond('breach', [{ kind: 'locationState', locationId: 'rift', states: ['ActiveIncursion'] }], { stressContribution: 3 }),
                   cond('crisis', [], { activeAtStart: false, stressContribution: 9 }),
                   cond('calm', [], { stressContribution: -1 })];
    const snaps = replay([sess(1, [fx('location', 'rift', 'state', 'ActiveIncursion')]), sess(2),
                          sess(3, [fx('condition', 'crisis', 'state', 'Active'), fx('colony', 'colony', 'stress', '', 6)]),   // a Stress Effect is inert
                          sess(4, [fx('location', 'rift', 'state', 'Stable')]), sess(5, [fx('condition', 'crisis', 'state', 'Ended')])], conds);
    expect(snaps.map(s => s.colonyStress)).toEqual([2, 2, 10, 8, 0]);   // 3−1 · 3−1 · 3+9−1 = 11 → 10 · 9−1 · −1 → 0
    expect(snaps[2].stressFromConditions).toEqual([
      { conditionId: 'breach', title: 'breach', stress: 3, origin: 'from the start' },
      { conditionId: 'crisis', title: 'crisis', stress: 9, origin: 'established in Session 3 (Event 3)' },
      { conditionId: 'calm', title: 'calm', stress: -1, origin: 'from the start' }]);
  });
  it('2026-10-26 "varies by": a row per state of one entity; the current row decides the text and Stress; a blank row is not in force', () => {
    const vb = { subject: { kind: 'assetStatus', id: 'ddn' }, rows: [
      { state: 'Stable', text: 'loot on 4–6', stress: 0 }, { state: 'Contested', text: 'loot on 5–6', stress: 0 },
      { state: 'Damaged', text: 'loot on 6', stress: 1 }, { state: 'Destroyed', text: '', stress: 5 }] };
    const conds = [cond('cache', [], { variesByJson: JSON.stringify(vb) }),
                   cond('dependent', [{ kind: 'condition', conditionId: 'cache', inForce: true }])];
    const snaps = replay([sess(1, [fx('asset', 'ddn', 'status', 'Damaged')]), sess(2, [fx('asset', 'ddn', 'status', 'Destroyed')])], conds);
    const at0 = at(conds, null).get('cache')!, at1 = at(conds, snaps[0]).get('cache')!, at2 = at(conds, snaps[1]).get('cache')!;
    expect([at0.inForce, at0.row, at0.rowText]).toEqual([true, 'Stable', 'loot on 4–6']);
    expect([at1.inForce, at1.row, at1.stress, snaps[0].colonyStress]).toEqual([true, 'Damaged', 1, 1]);   // the row's Stress is Colony Stress
    expect([at2.inForce, at2.stress, snaps[1].colonyStress]).toEqual([false, 0, 0]);                       // a blank row: not in force, no Stress
    expect(at(conds, snaps[1]).get('dependent')!.inForce).toBe(false);                                     // conditions on it follow
    const { changed } = conditionChanges(at(conds, null), at(conds, snaps[0]));
    expect(changed.map(c => [c.condition.id, c.row])).toEqual([['cache', 'Damaged']]);                     // a row change while in force
  });
  it('2026-10-26 goal-driven: a condition varies by a goal\'s stage, or requires one; the stage\'s text is the goal\'s world result', () => {
    const goal = { id: 'abide', campaignId: '', factionId: 'cult', title: 'Abide', status: 'Plotting', conditionType: 'Achieve', priority: 'Major',
                   visibility: 'Known', outcomeMode: 'Adjudicated', earliestAct: 1 } as any;
    const vb = { subject: { kind: 'goalStage', id: 'abide' }, rows: [
      { state: 'Planning', text: '', stress: 0 }, { state: 'Progressing', text: 'attendants admitted', stress: 1 },
      { state: 'Ready', text: 'a takeover begins', stress: 2 }, { state: 'Accomplished', text: 'the Cult holds the House', stress: 3 },
      { state: 'Failed', text: '', stress: 0 }, { state: 'Retired', text: '', stress: 0 }] };
    const conds = [cond('house', [], { variesByJson: JSON.stringify(vb) }),
                   cond('custody', [{ kind: 'goalStage', goalId: 'abide', stages: ['Ready', 'Accomplished'] }], { rule: 'custody disputed' }),
                   cond('other', [{ kind: 'assetController', assetId: 'registry', factionId: 'aspis' }])];
    const snaps = buildColonySnapshots({} as any, factions, characters, [
      sess(1, [fx('goal', 'abide', 'status', 'Progressing')]), sess(2, [fx('goal', 'abide', 'readyToResolve', 'Ready')]),
      sess(3, [fx('goal', 'abide', 'status', 'Accomplished')])], rules, assets, [goal], locations, conds);
    const ev = (snap: any) => evaluateConditions(conds, conditionWorldAt(snap, { ...base, goals: [goal] }), { ...names, goal: id => id });
    const row = (snap: any) => [ev(snap).get('house')!.inForce, ev(snap).get('house')!.rowText ?? null, ev(snap).get('custody')!.inForce];
    expect([row(null), ...snaps.map(row)]).toEqual([[false, '', false], [true, 'attendants admitted', false], [true, 'a takeover begins', true],
                                                    [true, 'the Cult holds the House', true]]);
    expect(snaps.map(s => s.colonyStress)).toEqual([1, 2, 3]);                     // each stage's row Stress
    expect([goalStageOf('Plotting', false), goalStageOf('Progressing', true), goalStageOf('Failed', true), goalStageOf(undefined, false)])
      .toEqual(['Planning', 'Ready', 'Failed', undefined]);
    expect(conditionsDrivenBy(conds, 'abide').map(c => c.id)).toEqual(['house', 'custody']);
    expect(goalStageTexts(conds, 'abide', 'Ready')).toEqual(['a takeover begins', 'custody disputed']);
    expect(goalStageTexts(conds, 'abide', 'Planning')).toEqual([]);
  });
  it('replays deterministically: the same history gives the same conditions', () => {
    const conds = [cond('reg', [{ kind: 'assetController', assetId: 'registry', factionId: 'cult' }]), cond('w', [], { activeAtStart: false })];
    const h = [sess(1, [fx('asset', 'registry', 'controllingFactionId', 'cult'), fx('condition', 'w', 'state', 'Active')])];
    expect(JSON.stringify([...at(conds, replay(h)[0]).values()])).toBe(JSON.stringify([...at(conds, replay(h)[0]).values()]));
  });
});
