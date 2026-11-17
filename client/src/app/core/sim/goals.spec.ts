// M4: goals (BOARD-GAME-REVIEW §6, §14.5, §14.6, §15.4) and the 2026-10-15 rulings.
import { buildColonySnapshots, projectGoals, projectCharacters, projectAssets } from './replay';
import { assessGoal, worldOf, goalConditionMet, declaredResolutionEffects, hasMachineTarget, championOptions, championLoads, occupiesChampion, championVacancies } from './goals';
import { ColonySnapshot, FactionGoal } from '../models/types';

const vals = { a: 1 / 3, b: 1 / 3, c: 1 / 3 };
const fac = (id: string, extra: object = {}) => ({ id, name: id, type: 'Faction', active: true, momentum: 0, momentumTier: 0,
  baseLegitimacy: 50, powerModifier: 0, factionSize: 0, values: vals, ...extra }) as any;
const chr = (id: string, factionId: string, extra: object = {}) => ({ id, name: id, characterType: 'NPC', state: 'Alive', factionId,
  values: vals, conviction: 50, pressure: 0, influence: 50, impressionable: 50, ...extra }) as any;
const asset = (id: string, owner: string, extra: object = {}) => ({ id, name: id, type: 'Archive', role: 'Knowledge', tier: 3,
  keystone: false, status: 'Stable', controllingFactionId: owner, ...extra }) as any;
const goal = (id: string, factionId: string, extra: Partial<FactionGoal> = {}): FactionGoal =>
  ({ id, campaignId: '', factionId, title: id, status: 'Progressing', conditionType: 'Achieve', priority: 'Major',
     visibility: 'Known', outcomeMode: 'Automatic', ...extra }) as FactionGoal;
let n = 0;
const fx = (targetType: string, targetId: string, property: string, value?: string, extra: object = {}) =>
  ({ id: `e${++n}`, eventId: 'ev', targetType, targetId, property, delta: 0, value, ...extra });
const sess = (num: number, effects: any[] = []) =>
  ({ id: `s${num}`, number: num, title: `S${num}`, act: 2, week: num, events: [{ id: `ev${num}`, sessionId: `s${num}`, title: 'x', sortOrder: 0, effects }] }) as any;
const rules = { cascadeRulesJson: '[]', stressTriggersJson: '[]', formulasJson: '' } as any;

interface World { factions: any[]; chars: any[]; assets: any[]; goals: FactionGoal[] }
const replay = (w: World, sessions: any[]) =>
  buildColonySnapshots({ colonyStress: 0 } as any, w.factions, w.chars, sessions, rules, w.assets, w.goals, []);
/** The assessment the Board shows for goal `id` at snapshot `snap` (null = baseline). */
const assess = (w: World, snap: ColonySnapshot | null, id: string) => {
  const g = projectGoals(w.goals, snap).find(x => x.id === id)!;
  return { g, a: assessGoal(g, worldOf(projectCharacters(w.chars, snap), projectAssets(w.assets, snap))) };
};

describe('target shapes (§6.2): condition, contract, declared effects', () => {
  const w = worldOf([chr('vara', 'keepers', { state: 'Forgotten' })], [asset('ddn', 'shattered', { status: 'Damaged' })]);
  const cases: [string, Partial<FactionGoal>, boolean | null, number, string][] = [
    ['Asset owner', { targetEntityType: 'Asset', targetEntityId: 'ddn', targetOwnerFactionId: 'shattered' }, true, 0, 'controllingFactionId'],
    ['Asset state', { targetEntityType: 'Asset', targetEntityId: 'ddn', targetState: 'Destroyed' }, false, 0, 'status'],
    ['Character state', { targetEntityType: 'Character', targetEntityId: 'vara', targetState: 'Forgotten' }, true, 0, 'state'],
    ['Character, no state', { targetEntityType: 'Character', targetEntityId: 'vara' }, null, 1, ''],
    ['legacy faction threshold', { targetEntityType: 'Faction', targetEntityId: 'keepers', targetProperty: 'power', targetOperator: 'gte', targetThreshold: 60 }, null, 1, ''],
    ['no target', {}, null, 1, ''],
  ];
  for (const [label, t, met, gaps, writes] of cases) {
    it(`${label}: condition ${met}, machine-readable ${!gaps}, writes ${writes || 'nothing but the status'}`, () => {
      const g = goal('g', 'shattered', t);
      expect(goalConditionMet(g, w)).toBe(met);
      expect(hasMachineTarget(g)).toBe(!gaps);
      const eff = declaredResolutionEffects(g);
      expect(eff.at(-1)).toMatchObject({ targetType: 'goal', property: 'status', value: 'Accomplished' });
      if (writes) expect(eff[0]).toMatchObject({ property: writes, actorFactionId: 'shattered' });
      else expect(eff).toHaveLength(1);
    });
  }
  it('§18.6: no goal needs a structured target or any text to be eligible, Auto-Resolve or not (narrative-only resolution)', () => {
    const wb = worldOf([chr('vara', 'keepers')], []);
    for (const x of [{ outcomeMode: 'Adjudicated' as const }, { outcomeMode: 'Automatic' as const }, { outcomeMode: 'Automatic' as const, status: 'Plotting' as const }])
      expect(assessGoal(goal('r', 'shattered', { championId: undefined, ...x }), wb).ineligibleReasons).toEqual(['Dormant: No champion']);
    expect(assessGoal(goal('r', 'shattered', { championId: 'vara', factionId: 'keepers', outcomeMode: 'Automatic' }), wb).eligible).toBe(true);
  });
});

describe('completion by any source (§18.3): the world is authoritative, attribution is separate', () => {
  const base = (status: FactionGoal['status'] = 'Progressing', ddnStatus = 'Stable'): World => ({
    factions: [fac('keepers'), fac('shattered')], chars: [chr('jorren', 'keepers')],
    assets: [asset('ddn', 'shattered', { status: ddnStatus })],
    goals: [goal('break', 'keepers', { status, targetEntityType: 'Asset', targetEntityId: 'ddn', targetState: 'Damaged', championId: 'jorren' })] });
  const by = (s: ColonySnapshot) => s.goalAccomplishedBy['break'];
  it('the faction\'s own Effect Accomplishes it, attributed to the faction (no Momentum signal)', () => {
    const [s1] = replay(base(), [sess(1, [fx('asset', 'ddn', 'status', 'Damaged', { actorFactionId: 'keepers' })])]);
    expect(s1.goalStatuses['break']).toBe('Accomplished');
    expect(by(s1)).toBe('keepers');
    expect(s1.pendingMomentumSignals).toEqual([]);
  });
  it('Darkwing doing it Accomplishes it too, attributed to the party', () => {
    const [s1] = replay(base(), [sess(1, [fx('asset', 'ddn', 'status', 'Damaged', { actorFactionId: 'party' })])]);
    expect(s1.goalStatuses['break']).toBe('Accomplished');
    expect(by(s1)).toBe('party');
  });
  it('a Helping participation names the participant\'s faction', () => {
    const [s1] = replay(base(), [sess(1, [fx('asset', 'ddn', 'status', 'Damaged'),
                                          fx('goal', 'break', 'participate', 'Helping', { secondaryTargetId: 'jorren', delta: 1 })])]);
    expect(by(s1)).toBe('keepers');
  });
  it('with no actor recorded it is still Accomplished; the attribution is simply not recorded', () => {
    const [s1] = replay(base(), [sess(1, [fx('asset', 'ddn', 'status', 'Damaged')])]);
    expect(s1.goalStatuses['break']).toBe('Accomplished');
    expect(by(s1)).toBeNull();
  });
  it('a Planning goal goes straight to Accomplished (no Progressing step, no milestone invented)', () => {
    const [s1] = replay(base('Plotting'), [sess(1, [fx('asset', 'ddn', 'status', 'Damaged', { actorFactionId: 'party' })])]);
    expect(s1.goalStatuses['break']).toBe('Accomplished');
  });
  it('completion is permanent: reversing the condition later does not undo it', () => {
    const snaps = replay(base(), [sess(1, [fx('asset', 'ddn', 'status', 'Damaged')]), sess(2, [fx('asset', 'ddn', 'status', 'Stable')])]);
    expect(snaps.map(s => s.goalStatuses['break'])).toEqual(['Accomplished', 'Accomplished']);
  });
  it('needs a real transition: a target that already holds, touched by an unrelated change, completes nothing (flagged)', () => {
    const w = base('Progressing', 'Damaged');
    const [s1] = replay(w, [sess(1, [fx('asset', 'ddn', 'stress', undefined, { delta: 1 }), fx('asset', 'ddn', 'controllingFactionId', 'aspis')])]);
    expect(s1.goalStatuses['break']).toBe('Progressing');
    expect(assess(w, s1, 'break').a).toMatchObject({ alreadyHolds: true, eligible: false });
  });
  it('...and once it stops holding, bringing it about again does complete it', () => {
    const w = base('Progressing', 'Damaged');
    const [s1, s2] = replay(w, [sess(1, [fx('asset', 'ddn', 'status', 'Stable')]), sess(2, [fx('asset', 'ddn', 'status', 'Damaged', { actorFactionId: 'shattered' })])]);
    expect(s1.goalStatuses['break']).toBe('Progressing');
    expect(assess(w, s1, 'break').a).toMatchObject({ alreadyHolds: false, eligible: true });
    expect(s2.goalStatuses['break']).toBe('Accomplished');
    expect(by(s2)).toBe('shattered');
  });
  it('an operation\'s Auto-Resolve writes one outcome, attributed to the faction; the detector does not re-mark it', () => {
    const [s1] = replay(base(), [sess(1, [fx('asset', 'ddn', 'status', 'Damaged', { actorFactionId: 'keepers', origin: 'GoalGenerator' }),
                                          fx('goal', 'break', 'status', 'Accomplished', { origin: 'GoalGenerator' })])]);
    expect(s1.goalStatuses['break']).toBe('Accomplished');
    expect(by(s1)).toBe('keepers');
  });
  it('the GM resolving a target-less goal (a ritual) records no attribution unless an actor is given', () => {
    const w: World = { ...base(), goals: [goal('ritual', 'keepers', { outcomeMode: 'Adjudicated' })] };
    const [s1, s2] = replay(w, [sess(1, [fx('goal', 'ritual', 'readyToResolve', 'Ready')]), sess(2, [fx('goal', 'ritual', 'status', 'Accomplished')])]);
    expect(s1.goalStatuses['ritual']).toBe('Progressing');
    expect(s2.goalStatuses['ritual']).toBe('Accomplished');
    expect(s2.goalAccomplishedBy['ritual']).toBeNull();
    expect(s2.goalReady['ritual']).toBeUndefined();
  });
});

describe('the Ledger stolen and recovered', () => {
  const w: World = {
    factions: [fac('witnesses'), fac('shattered')], chars: [chr('marra', 'witnesses'), chr('tavia', 'shattered')],
    assets: [asset('ledger', 'witnesses', { keystone: true })],
    goals: [goal('keep', 'witnesses', { conditionType: 'Maintain', targetEntityType: 'Asset', targetEntityId: 'ledger', targetState: 'Stable', championId: 'marra' }),
            goal('steal', 'shattered', { targetEntityType: 'Asset', targetEntityId: 'ledger', targetOwnerFactionId: 'shattered', championId: 'tavia' })],
  };
  const snaps = replay(w, [
    sess(1, [fx('asset', 'ledger', 'controllingFactionId', 'shattered', { actorFactionId: 'shattered' })]),
    sess(2, [fx('asset', 'ledger', 'controllingFactionId', 'witnesses', { actorFactionId: 'witnesses' })]),
  ]);
  it('the assignment defends while held, is Inactive once stolen and reactivates on recovery, never failing', () => {
    expect(assess(w, null, 'keep').a.defense).toMatchObject({ active: true });
    expect(assess(w, snaps[0], 'keep').a.defense).toMatchObject({ active: false, reason: 'ledger is not held' });
    expect(assess(w, snaps[1], 'keep').a.defense).toMatchObject({ active: true });
    expect(snaps.map(s => s.goalStatuses['keep'])).toEqual(['Progressing', 'Progressing']);
  });
  it('the theft Accomplishes the thief\'s goal; recovering the Ledger does not undo it', () => {
    expect(snaps.map(s => s.goalStatuses['steal'])).toEqual(['Accomplished', 'Accomplished']);
    expect(snaps[1].goalAccomplishedBy['steal']).toBe('shattered');
  });
  it('2026-10-22: a Maintain assignment is in force only from its Earliest Act (before it: inactive, "From Act …")', () => {
    const at = (earliestAct: number, act: number) => {
      const g = projectGoals(w.goals, null).find(x => x.id === 'keep')!;
      return assessGoal({ ...g, earliestAct }, worldOf(w.chars, w.assets), act);
    };
    expect(at(2, 1)).toMatchObject({ notYetEligible: 2, defense: { active: false, reason: 'Not in force before Act II' } });
    expect(at(2, 2)).toMatchObject({ notYetEligible: null, defense: { active: true } });
    expect(at(1, 1).defense!.active).toBe(true);
  });
  it('§18.6 ruling: a Damaged or Contested target is still defended; only loss of control, destruction or an incapable champion stop it', () => {
    const at = (status: string, owner = 'witnesses', champ = 'Alive') => assess({ ...w, assets: [asset('ledger', owner, { status })],
      chars: [chr('marra', 'witnesses', { state: champ }), chr('tavia', 'shattered')] }, null, 'keep').a.defense;
    expect(['Stable', 'Contested', 'Damaged'].map(st => at(st)!.active)).toEqual([true, true, true]);
    expect([at('Destroyed')!.active, at('Stable', 'shattered')!.active, at('Stable', 'witnesses', 'Dead')!.active]).toEqual([false, false, false]);
  });
  it('§18.12: while Active and threatened by a known goal, the assignment is a guard in the Faction Phase (faction-phase.spec)', () => {
    expect(assess(w, null, 'keep').a.defense).toMatchObject({ active: true });   // what makes it a candidate guard
  });
});

describe('Ready to Resolve: the GM resolution task (§6.2; simplified 2026-10-15)', () => {
  const adj = { outcomeMode: 'Adjudicated' as const, targetEntityType: 'Character' as const, targetEntityId: 'vara', targetState: 'Dead',
    championId: 'tavia' };
  const w: World = { factions: [fac('keepers'), fac('shattered')], chars: [chr('vara', 'keepers'), chr('tavia', 'shattered')], assets: [],
                     goals: [goal('keeper', 'shattered', adj)] };
  it('a Ready goal is out of the pool until the GM resolves or clears it; it never resolves on its own', () => {
    const [s1, , s3] = replay(w, [sess(1, [fx('goal', 'keeper', 'readyToResolve', 'Ready')]), sess(2), sess(3)]);
    expect(assess(w, null, 'keeper').a.eligible).toBe(true);
    expect(assess(w, s1, 'keeper').a).toMatchObject({ eligible: false, ready: { sinceSession: 1 } });
    expect(s3.goalReady['keeper']).toEqual({ sinceSession: 1 });
    expect(s3.goalStatuses['keeper']).toBe('Progressing');
  });
  it('"remains Progressing" clears the overlay and the goal returns to the pool', () => {
    const [, s2] = replay(w, [sess(1, [fx('goal', 'keeper', 'readyToResolve', 'Ready')]), sess(2, [fx('goal', 'keeper', 'readyToResolve', 'Cleared')])]);
    expect(s2.goalReady['keeper']).toBeUndefined();
    expect(assess(w, s2, 'keeper').a.eligible).toBe(true);
  });
  it('the detector Accomplishes a Ready goal through play and closes the task', () => {
    const [, s2] = replay(w, [sess(1, [fx('goal', 'keeper', 'readyToResolve', 'Ready')]),
                              sess(2, [fx('character', 'vara', 'state', 'Dead', { actorFactionId: 'shattered' })])]);
    expect(s2.goalStatuses['keeper']).toBe('Accomplished');
    expect(s2.goalReady['keeper']).toBeUndefined();
  });
  it('the GM\'s "Accomplished" writes the target (credited) and the status; without a target, only the status', () => {
    expect(declaredResolutionEffects(w.goals[0])).toEqual([
      expect.objectContaining({ targetType: 'character', targetId: 'vara', value: 'Dead', actorFactionId: 'shattered' }),
      expect.objectContaining({ targetType: 'goal', property: 'status', value: 'Accomplished' })]);
    expect(declaredResolutionEffects(goal('ritual', 'shattered', { outcomeMode: 'Adjudicated' }))).toEqual([
      expect.objectContaining({ targetType: 'goal', property: 'status', value: 'Accomplished' })]);
  });
});

describe('rulings (2026-10-15): champions, retirement, leaders', () => {
  const w: World = {
    factions: [fac('institute', { leaderId: 'thorn' }), fac('aspis')],
    chars: [chr('nhalia', 'institute'), chr('thorn', 'institute'), chr('vara', 'institute', { state: 'Forgotten' })],
    assets: [],
    goals: [goal('research', 'institute', { targetEntityType: 'Character', targetEntityId: 'thorn', targetState: 'Alive', championId: 'nhalia' }),
            goal('stale', 'institute', { targetEntityType: 'Character', targetEntityId: 'vara', targetState: 'Dead', championId: 'thorn' })],
  };
  it('a defecting champion does not take the goal: it stays with the faction, loses its champion, and is Dormant', () => {
    const [s1] = replay(w, [sess(1, [fx('character', 'nhalia', 'factionChange', 'aspis')])]);
    const { g, a } = assess(w, s1, 'research');
    expect(g.factionId).toBe('institute');
    expect(g.championId).toBeUndefined();
    expect(a).toMatchObject({ dormant: 'No champion', eligible: false });
  });
  it('a championChange restores it', () => {
    const [, s2] = replay(w, [sess(1, [fx('character', 'nhalia', 'factionChange', 'aspis')]), sess(2, [fx('goal', 'research', 'championChange', 'thorn')])]);
    expect(assess(w, s2, 'research').a.dormant).toBeNull();
  });
  it('an impossible goal is flagged obsolete; retiring it ends it, unassigns the champion and sends no signal', () => {
    expect(assess(w, null, 'stale').a.obsolete).toBe('vara is Forgotten');
    const [s1] = replay(w, [sess(1, [fx('goal', 'stale', 'status', 'Retired')])]);
    expect(s1.goalStatuses['stale']).toBe('Retired');
    expect(s1.goalChampions['stale']).toBeNull();
    expect(s1.pendingMomentumSignals).toEqual([]);
    expect(assess(w, s1, 'stale').a).toMatchObject({ obsolete: null, eligible: false, ineligibleReasons: ['Retired'] });
  });
  it('leaderChange moves leadership; the new leader\'s incapacity is the −1 signal; a defecting leader leaves the faction leaderless', () => {
    const [s1] = replay(w, [sess(1, [fx('faction', 'institute', 'leaderChange', 'nhalia'), fx('character', 'thorn', 'state', 'Dead')])]);
    expect(s1.factionLeaders['institute']).toBe('nhalia');
    expect(s1.pendingMomentumSignals).toEqual([]);   // Thorn was no longer the leader
    const [d1] = replay(w, [sess(1, [fx('character', 'thorn', 'factionChange', 'aspis')])]);
    expect(d1.factionLeaders['institute']).toBeNull();
    expect(d1.pendingMomentumSignals).toMatchObject([{ factionId: 'institute', rule: 'leader-left' }]);
  });
});

describe('character-target defensive assignment (O-7: Uldren protects Vara)', () => {
  const w: World = { factions: [fac('witnesses'), fac('keepers')], chars: [chr('uldren', 'witnesses'), chr('vara', 'keepers')], assets: [],
    goals: [goal('protect', 'witnesses', { conditionType: 'Maintain', targetEntityType: 'Character', targetEntityId: 'vara', championId: 'uldren' })] };
  it('is Active while Vara lives and the champion is capable; Inactive (not Failed) otherwise', () => {
    expect(assess(w, null, 'protect').a.defense).toMatchObject({ active: true, reason: 'Protecting vara' });
    const [s1] = replay(w, [sess(1, [fx('character', 'uldren', 'state', 'Missing')])]);
    expect(assess(w, s1, 'protect').a.defense).toMatchObject({ active: false });
    const [d1] = replay(w, [sess(1, [fx('character', 'vara', 'state', 'Dead')])]);
    expect(assess(w, d1, 'protect').a).toMatchObject({ defense: { active: false }, obsolete: 'vara is Dead' });
    expect(d1.goalStatuses['protect']).toBe('Progressing');
  });
});

describe('World States and setbacks (2026-10-15)', () => {
  it('Earliest Act (§18.6) gates only Faction Phase eligibility: an Act III goal is ineligible in Acts I and II, and is not retired', () => {
    const wb = worldOf([chr('c', 'egress')], []);
    const hall = goal('hall', 'egress', { championId: 'c', earliestAct: 3, status: 'Plotting' });
    expect([1, 2, 3].map(act => assessGoal(hall, wb, act).eligible)).toEqual([false, false, true]);
    expect(assessGoal(hall, wb, 2)).toMatchObject({ notYetEligible: 3, ineligibleReasons: ['Not yet eligible (from Act III)'] });
    expect(assessGoal(goal('d', 'egress', { championId: 'c' }), wb, 1).notYetEligible).toBe(2);   // the default is Act II
    expect(assessGoal(hall, wb).eligible).toBe(true);   // no Act given: not gated (views without a turn context)
  });
  it('...and never restricts the world: an Act III goal is still Accomplished by a Session Event in Act I', () => {
    const w: World = { factions: [fac('egress'), fac('witnesses')], chars: [chr('c', 'egress')], assets: [asset('hall', 'witnesses')],
      goals: [goal('take', 'egress', { earliestAct: 3, targetEntityType: 'Asset', targetEntityId: 'hall', targetOwnerFactionId: 'egress' })] };
    const [s1] = replay(w, [sess(1, [fx('asset', 'hall', 'controllingFactionId', 'egress', { actorFactionId: 'party' })])]);
    expect(s1.goalStatuses['take']).toBe('Accomplished');
  });
  it('a setback (status back to Plotting) returns a Ready goal to Planning and clears the overlay', () => {
    const w: World = { factions: [fac('shattered')], chars: [chr('tavia', 'shattered')], assets: [],
      goals: [goal('k', 'shattered', { championId: 'tavia', targetEntityType: 'Character', targetEntityId: 'tavia', targetState: 'Dead' })] };
    const [, s2] = replay(w, [sess(1, [fx('goal', 'k', 'readyToResolve', 'Ready')]), sess(2, [fx('goal', 'k', 'status', 'Plotting')])]);
    expect(s2.goalStatuses['k']).toBe('Plotting');
    expect(s2.goalReady['k']).toBeUndefined();
  });
});

describe('§18.8 champions: one active assignment per character', () => {
  const chars = [chr('julian', 'seekers'), chr('asha', 'seekers'), chr('tobin', 'seekers'), chr('dead', 'seekers', { state: 'Dead' }),
                 chr('vara', 'keepers')];
  const goals = [goal('order', 'seekers', { championId: 'julian' }), goal('ritual', 'seekers', { championId: 'julian', status: 'Plotting' }),  // legacy duplicate
                 goal('funds', 'seekers', { championId: 'asha', conditionType: 'Maintain' }),
                 goal('won', 'seekers', { championId: 'tobin', status: 'Accomplished' }),
                 goal('new', 'seekers', { championId: undefined, status: 'Plotting' })];
  const ids = (g: FactionGoal) => championOptions(g, chars, goals).map(c => c.id).sort();
  it('a character championing an active Achieve goal or Maintain assignment is absent from other dropdowns', () => {
    expect(ids(goals[4])).toEqual(['tobin']);   // julian (Achieve) and asha (Maintain) are taken; the dead and other factions are not offered
  });
  it('the current champion stays selectable while editing their own goal, even when legacy data duplicates them', () => {
    expect(ids(goals[0])).toEqual(['julian', 'tobin']);
    expect(ids(goals[2])).toEqual(['asha', 'tobin']);
  });
  it('a terminal goal releases its champion; clearing an assignment frees the character', () => {
    expect(occupiesChampion(goals[3])).toBe(false);
    const cleared = goals.map(g => g.id === 'funds' ? { ...g, championId: undefined } : g);
    expect(championOptions(goals[4], chars, cleared).map(c => c.id).sort()).toEqual(['asha', 'tobin']);
    const retired = goals.map(g => g.id === 'funds' ? { ...g, status: 'Retired' as const } : g);
    expect(championOptions(goals[4], chars, retired).map(c => c.id)).toContain('asha');
  });
  it('a Dormant or Ready assignment still occupies its champion (incapacity frees no one); Stalled (legacy) counts as active', () => {
    const w = worldOf([chr('julian', 'seekers', { state: 'Dead' })], []);
    expect(assessGoal(goals[0], w).dormant).toMatch(/Dead/);
    expect(occupiesChampion(goals[0])).toBe(true);
    expect(occupiesChampion({ ...goals[0], status: 'Stalled' })).toBe(true);
  });
  it('legacy duplicates are reported, not corrected', () => {
    expect(championLoads(goals).get('julian')!.map(g => g.id)).toEqual(['order', 'ritual']);
  });
  it('an unassigned goal stays valid: Dormant ("No champion"), out of the pool, never failed', () => {
    expect(assessGoal(goals[4], worldOf(chars, []), 2)).toMatchObject({ eligible: false, dormant: 'No champion' });
    expect(goals[4].status).toBe('Plotting');
  });
});

describe('Faction Goals.md §I: champions available for manual reassignment', () => {
  const chars = [chr('julian', 'seekers'), chr('tobin', 'seekers'), chr('dead', 'seekers', { state: 'Dead' }),
                 chr('vara', 'keepers'), chr('drifter', undefined as any)];
  const goals = [goal('order', 'seekers', { championId: 'julian' }),
                 goal('won', 'seekers', { championId: 'tobin', status: 'Accomplished' }),
                 goal('open', 'seekers', { championId: undefined, status: 'Plotting' }),
                 goal('gone', 'seekers', { championId: undefined, status: 'Retired' }),
                 goal('guard', 'keepers', { championId: 'vara', conditionType: 'Maintain' })];
  it('lists living faction members whose goals are finished, with the faction\'s active unchampioned goals', () => {
    const v = championVacancies(chars, goals);
    expect(v.map(x => [x.factionId, x.available.map(c => c.id), x.unassigned.map(g => g.id)])).toEqual([['seekers', ['tobin'], ['open']]]);
  });
  it('lists no one when every living member holds an active goal or assignment', () => {
    expect(championVacancies(chars, goals.map(g => g.id === 'won' ? { ...g, status: 'Progressing' as const } : g))).toEqual([]);
  });
});
