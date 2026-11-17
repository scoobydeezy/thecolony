// M5: Colony Turn engine (Opening, Faction Phase), its seeded randomness, and replay of committed turns.
import { mulberry32, rerollDie } from './prng';
import { allocate, resolveFactionPhase, factionPhaseEffects, canonicalJson, FactionPhaseInputs, FpGoal, FpGuard, PRIORITY_BONUS } from './faction-phase';
import { resolveOpening, openingEffects, OpeningInputs } from './opening';
import { buildColonySnapshots, projectFactions } from './replay';
import { buildFactionPhaseInputs } from './colony-turn';

describe('seeded randomness (shared with the server verifier)', () => {
  it('mulberry32 reproduces the reference vector', () => {
    const next = mulberry32(12345);
    expect([next(), next(), next(), next(), next()]).toEqual([4207900869, 1317490944, 2079646450, 3513001552, 2187978186]);
  });
});

const goal = (id: string, factionId: string, x: Partial<FpGoal> = {}): FpGoal =>
  ({ id, factionId, title: id, priority: 'Major', status: 'Plotting', outcomeMode: 'Automatic', ...x });
const guard = (id: string, factionId: string, targetEntityId: string, priority: FpGuard['priority'] = 'Major'): FpGuard =>
  ({ id, factionId, title: id, priority, targetEntityId });
const inputs = (x: Partial<FactionPhaseInputs> = {}): FactionPhaseInputs => ({
  version: 'fp-5', seed: 7, target: 10, priorityBonus: { ...PRIORITY_BONUS }, guards: [],
  factions: [{ id: 'a', name: 'A', power: 3, momentum: 0 }, { id: 'b', name: 'B', power: 1, momentum: 0 }],
  goals: [goal('a1', 'a', { priority: 'Critical' }), goal('a2', 'a', { priority: 'Minor' }), goal('b1', 'b')], ...x });

describe('allocation (§18.12 fp-5)', () => {
  it('one token per eligible goal and per guard; Power-many drawn; each drawn goal rolls once; deterministic by seed', () => {
    const g = [guard('gb', 'b', 'x')];
    for (let seed = 0; seed < 200; seed++) {
      const inp = inputs({ seed, guards: g }); const al = allocate(inp);
      expect(al).toEqual(allocate(inp));
      for (const f of inp.factions) {
        const bag = inp.goals.filter(x => x.factionId === f.id).length + g.filter(x => x.factionId === f.id).length;
        const drawn = al.allocations.filter(x => x.factionId === f.id).length + al.guarding.filter(id => g.find(x => x.id === id)!.factionId === f.id).length;
        expect(drawn).toBe(Math.min(f.power, bag));
      }
      expect(al.allocations.every(x => x.attempts === 1)).toBe(true);
    }
  });
  it('Priority no longer weights the draw: a Critical and a Minor goal are drawn equally often', () => {
    const inp = (seed: number) => inputs({ seed, factions: [{ id: 'a', name: 'A', power: 1, momentum: 0 }],
      goals: [goal('a1', 'a', { priority: 'Critical' }), goal('a2', 'a', { priority: 'Minor' })] });
    const crit = Array.from({ length: 2000 }, (_, s) => allocate(inp(s)).allocations[0].goalId === 'a1').filter(Boolean).length;
    expect(crit / 2000).toBeGreaterThan(0.45); expect(crit / 2000).toBeLessThan(0.55);
  });
  it('a faction with no eligible goal and no guard draws nothing', () => {
    const al = allocate(inputs({ goals: [goal('a1', 'a')] }));
    expect([al.allocations.filter(x => x.factionId === 'b'), al.guarding]).toEqual([[], []]);
  });
  it('a guard drawn instead of a goal spends that Power: the goal does not roll', () => {
    const inp = inputs({ factions: [{ id: 'b', name: 'B', power: 1, momentum: 0 }], goals: [goal('b1', 'b')], guards: [guard('gb', 'b', 'x')] });
    for (let seed = 0; seed < 50; seed++) {
      const al = allocate({ ...inp, seed });
      expect(al.allocations.length + al.guarding.length).toBe(1);
    }
  });
});

describe('resolution (§18.12 fp-5)', () => {
  // physical dice let each case pin its rolls
  const only = (g: FpGoal, power = 3, momentum = 0) => inputs({ factions: [{ id: 'a', name: 'A', power, momentum }], goals: [g] });
  it('2d6 + Priority + Momentum vs the DC: Critical +3, Major +2, Minor +1; margin is total − DC', () => {
    const r = (priority: FpGoal['priority'], dice: [number, number], momentum = 0) =>
      resolveFactionPhase(only(goal('a1', 'a', { priority }), 1, momentum), { 'a1#0': dice });
    expect(r('Critical', [3, 4]).attempts[0]).toMatchObject({ natural: 7, priority: 3, modifier: 0, total: 10, dc: 10, degree: 'Success' });
    expect(r('Critical', [3, 4]).goals[0]).toMatchObject({ allocated: 1, rolled: 1, outcome: 'Progressing', margin: 0 });
    expect(r('Major', [3, 4]).attempts[0]).toMatchObject({ total: 9, degree: 'Failure' });
    expect(r('Minor', [4, 4], 1).attempts[0]).toMatchObject({ priority: 1, modifier: 1, total: 10, degree: 'Success' });
  });
  it('a natural 12 always succeeds (+1); a natural 2 always fails (−1)', () => {
    const hard = only(goal('a1', 'a', { priority: 'Minor' }), 3, -2);          // 12 + 1 − 2 = 11 < 14
    const r = resolveFactionPhase({ ...hard, target: 14 }, { 'a1#0': [6, 6] });
    expect(r.attempts[0]).toMatchObject({ degree: 'CriticalSuccess', signal: 1, total: 11 });
    expect(r.goals[0].outcome).toBe('Progressing');
    const easy = only(goal('a1', 'a', { priority: 'Critical' }), 3, 2);
    const f = resolveFactionPhase({ ...easy, target: 2 }, { 'a1#0': [1, 1] });
    expect(f.attempts[0]).toMatchObject({ degree: 'CriticalFailure', signal: -1 });
    expect(f.goals[0].outcome).toBe('None');
    expect(factionPhaseEffects(easy, f).filter(e => e.property === 'momentumSignal'))
      .toEqual([expect.objectContaining({ delta: -1, secondaryTargetId: 'a1#0', origin: 'FactionPhase' })]);
  });
  it('a posted guard of another faction adds its Priority to the DC; the best guard counts; own guards never defend', () => {
    const base = (guards: FpGuard[]) => inputs({ seed: 3, factions: [{ id: 'a', name: 'A', power: 2, momentum: 0 }, { id: 'b', name: 'B', power: 3, momentum: 0 }],
      goals: [goal('a1', 'a', { priority: 'Major', targetEntityId: 'x' })], guards });
    const roll = (guards: FpGuard[]) => resolveFactionPhase(base(guards), { 'a1#0': [5, 5] }).attempts[0];
    expect(roll([guard('gb1', 'b', 'x', 'Minor'), guard('gb2', 'b', 'x', 'Critical')])).toMatchObject({ total: 12, defense: 3, guardId: 'gb2', dc: 13, degree: 'Failure' });
    expect(roll([guard('ga', 'a', 'x', 'Critical')]).defense).toBe(0);         // the attacker's own assignment
    expect(roll([guard('gb', 'b', 'elsewhere', 'Critical')]).defense).toBe(0); // another target
  });
  it('a guard defends only if drawn: with Power 0 the defender posts no guard', () => {
    const inp = inputs({ factions: [{ id: 'a', name: 'A', power: 1, momentum: 0 }, { id: 'b', name: 'B', power: 0, momentum: 0 }],
      goals: [goal('a1', 'a', { targetEntityId: 'x' })], guards: [guard('gb', 'b', 'x', 'Critical')] });
    const r = resolveFactionPhase(inp, { 'a1#0': [4, 4] });
    expect([r.guarding, r.attempts[0].defense, r.attempts[0].degree]).toEqual([[], 0, 'Success']);
  });
  it('physical dice for one roll leave every other roll unchanged', () => {
    const inp = inputs({ seed: 99 }); const app = resolveFactionPhase(inp); const first = app.attempts[0];
    const forced = resolveFactionPhase(inp, { [first.id]: [first.d1 === 6 ? 5 : 6, first.d2] });
    expect(forced.diceSource).toBe('mixed');
    for (const a of forced.attempts.slice(1)) {
      const same = app.attempts.find(x => x.id === a.id);
      if (same) expect([a.d1, a.d2]).toEqual([same.d1, same.d2]);
    }
  });
});

describe('outcomes, Effects and collisions', () => {
  const two = (ga: Partial<FpGoal>, gb: Partial<FpGoal>) => inputs({
    factions: [{ id: 'a', name: 'A', power: 1, momentum: 0 }, { id: 'b', name: 'B', power: 1, momentum: 0 }],
    goals: [goal('a1', 'a', { status: 'Progressing', ...ga }), goal('b1', 'b', { status: 'Progressing', ...gb })] });
  it('second success: Automatic writes the target (credited, GoalGenerator) and Accomplished; Adjudicated becomes Ready', () => {
    const inp = two({ targetEntityType: 'Asset', targetEntityId: 'x', targetOwnerFactionId: 'a' }, { outcomeMode: 'Adjudicated' });
    const r = resolveFactionPhase(inp, { 'a1#0': [5, 5], 'b1#0': [5, 5] });
    expect(r.goals.map(g => g.outcome)).toEqual(['Accomplished', 'ReadyToResolve']);
    expect(factionPhaseEffects(inp, r)).toEqual([
      expect.objectContaining({ targetType: 'asset', targetId: 'x', property: 'controllingFactionId', value: 'a', actorFactionId: 'a', origin: 'GoalGenerator' }),
      expect.objectContaining({ targetType: 'goal', targetId: 'a1', property: 'status', value: 'Accomplished', origin: 'FactionPhase' }),
      expect.objectContaining({ targetType: 'goal', targetId: 'b1', property: 'readyToResolve', value: 'Ready', origin: 'FactionPhase' }),
    ]);
  });
  it('fp-4 advance Effects: written before Progressing; after the target at Accomplished; credited, GoalGenerator', () => {
    const fund = { targetType: 'asset' as const, targetId: 'x', property: 'status', delta: 0, value: 'Contested' };
    const shrink = { targetType: 'faction' as const, targetId: 'b', property: 'factionSize', delta: -30 };
    const reset = { targetType: 'asset' as const, targetId: 'x', property: 'status', delta: 0, value: 'Stable' };
    const est = { targetType: 'location' as const, targetId: 'rest', property: 'state', delta: 0, value: 'Unstable' };
    const inp = inputs({ factions: [{ id: 'a', name: 'A', power: 3, momentum: 0 }], goals: [
      goal('a1', 'a', { priority: 'Minor', targetEntityType: 'Asset', targetEntityId: 'x', targetOwnerFactionId: 'a', onProgressing: [fund, shrink] }),
      goal('a2', 'a', { priority: 'Minor', status: 'Progressing', targetEntityType: 'Asset', targetEntityId: 'x', targetOwnerFactionId: 'a', onAccomplished: [reset, est] }),
      goal('a3', 'a', { priority: 'Minor', onAccomplished: [est] })] });   // a failed roll writes nothing
    const r = resolveFactionPhase(inp, { 'a1#0': [5, 5], 'a2#0': [5, 5], 'a3#0': [1, 1] });
    expect(r.goals.map(g => [g.goalId, g.outcome])).toEqual(expect.arrayContaining([['a1', 'Progressing'], ['a2', 'Accomplished'], ['a3', 'None']]));
    const fx = factionPhaseEffects(inp, r).filter(e => e.property !== 'momentumSignal')
      .map(e => [e.targetType, e.targetId, e.property, e.value ?? e.delta, e.origin, e.actorFactionId ?? null]);
    const block = (id: string) => { const end = fx.findIndex(e => e[0] === 'goal' && e[1] === id); return fx.slice(end - (id === 'a1' ? 2 : 3), end + 1); };
    expect(block('a1')).toEqual([['asset', 'x', 'status', 'Contested', 'GoalGenerator', 'a'], ['faction', 'b', 'factionSize', -30, 'GoalGenerator', 'a'],
                                 ['goal', 'a1', 'status', 'Progressing', 'FactionPhase', null]]);
    expect(block('a2')).toEqual([['asset', 'x', 'controllingFactionId', 'a', 'GoalGenerator', 'a'], ['asset', 'x', 'status', 'Stable', 'GoalGenerator', 'a'],
                                 ['location', 'rest', 'state', 'Unstable', 'GoalGenerator', 'a'], ['goal', 'a2', 'status', 'Accomplished', 'FactionPhase', null]]);
    expect(fx.some(e => e[1] === 'a3')).toBe(false);
  });
  it('incompatible Accomplishments on one target: the higher margin wins; the loser stays Progressing (pre-empted)', () => {
    const inp = two({ targetEntityType: 'Asset', targetEntityId: 'x', targetOwnerFactionId: 'a' },
                    { targetEntityType: 'Asset', targetEntityId: 'x', targetOwnerFactionId: 'b' });
    const r = resolveFactionPhase(inp, { 'a1#0': [4, 5], 'b1#0': [5, 6] });
    expect(r.goals.map(g => [g.goalId, g.outcome, g.preempted])).toEqual([['a1', 'None', true], ['b1', 'Accomplished', false]]);
  });
  it('compatible Accomplishments (the same end state) both stand', () => {
    const inp = two({ targetEntityType: 'Asset', targetEntityId: 'x', targetState: 'Destroyed' }, { targetEntityType: 'Asset', targetEntityId: 'x', targetState: 'Destroyed' });
    const r = resolveFactionPhase(inp, { 'a1#0': [4, 5], 'b1#0': [5, 6] });
    expect(r.goals.map(g => g.outcome)).toEqual(['Accomplished', 'Accomplished']);
  });
  it('canonical JSON is key-order independent', () => {
    expect(canonicalJson({ b: 1, a: [{ d: 2, c: 3 }] })).toBe(canonicalJson({ a: [{ c: 3, d: 2 }], b: 1 }));
  });
});

describe('Power follows the world (§18.6, acceptance 4, 10 and scenario F)', () => {
  const vals = { a: 1 / 3, b: 1 / 3, c: 1 / 3 };
  const fac = (id: string) => ({ id, name: id, type: 'Faction', active: true, momentum: 0, momentumTier: 0, baseLegitimacy: 20, powerModifier: 0,
    factionSize: 0, values: vals }) as any;
  const vault = (id: string) => ({ id, name: id, type: 't', role: 'Strategic', tier: 5, status: 'Stable', keystone: false, controllingFactionId: 'b' }) as any;
  it('an Asset transfer recalculates both factions\' Holdings and Power for the next Faction Phase; no Power Effect is written', () => {
    const sessions = [{ id: 's1', number: 1, act: 1, events: [{ id: 'e1', sessionId: 's1', title: 'Heist', sortOrder: 0, effects: [
                         { id: 'x1', eventId: 'e1', targetType: 'asset', targetId: 'v1', property: 'controllingFactionId', delta: 0, value: 'a', actorFactionId: 'party' },
                         { id: 'x2', eventId: 'e1', targetType: 'asset', targetId: 'v2', property: 'controllingFactionId', delta: 0, value: 'a', actorFactionId: 'party' },
                         { id: 'x3', eventId: 'e1', targetType: 'asset', targetId: 'v3', property: 'controllingFactionId', delta: 0, value: 'a', actorFactionId: 'party' }] }] },
                      { id: 's2', number: 2, act: 1, events: [] }] as any;
    const w = { colonyState: { colonyStress: 0 } as any, rules: { cascadeRulesJson: '[]', stressTriggersJson: '[]', formulasJson: '' } as any,
      locations: [], characters: [], goals: [], factions: [fac('a'), fac('b')], assets: [vault('v1'), vault('v2'), vault('v3')], sessions };
    const before = buildFactionPhaseInputs(w, 's1', 1).inputs.factions, after = buildFactionPhaseInputs(w, 's2', 1).inputs.factions;
    expect(before.map(f => [f.id, f.power])).toEqual([['a', 0], ['b', 1]]);   // b: Holdings 75 (3 Strategic T5); a: nothing — Power 0
    expect(after.map(f => [f.id, f.power])).toEqual([['a', 1], ['b', 0]]);    // a recovers Power 1; b drops below Holdings
    expect(sessions[0].events[0].effects.every((e: any) => e.targetType === 'asset')).toBe(true);
  });
});

describe('Faction Size changes through Effects (recorded, replayed, never below 0)', () => {
  it('factionSize deltas fold into the snapshot and the projected faction (legacy additionalMembers still replays)', () => {
    const f = { id: 'a', name: 'A', type: 'Faction', active: true, momentum: 0, momentumTier: 0, baseLegitimacy: 50, powerModifier: 0,
      factionSize: 13, values: { a: 1 / 3, b: 1 / 3, c: 1 / 3 } } as any;
    const ev = (n: number, d: number) => ({ id: `s${n}`, number: n, act: 1, events: [{ id: `e${n}`, sessionId: `s${n}`, title: 'x', sortOrder: 0,
      effects: [{ id: `x${n}`, eventId: `e${n}`, targetType: 'faction', targetId: 'a', property: n === 1 ? 'additionalMembers' : 'factionSize', delta: d }] }] });
    const snaps = buildColonySnapshots({ colonyStress: 0 } as any, [f], [], [ev(1, 7), ev(2, -30)] as any,
      { cascadeRulesJson: '[]', stressTriggersJson: '[]', formulasJson: '' } as any, [], [], []);
    expect(snaps.map(s => s.factionSize['a'])).toEqual([20, 0]);
    expect(projectFactions([f], snaps[0])[0].factionSize).toBe(20);
  });
});

describe('narrative-only Auto-Resolve (§18.6)', () => {
  it('an Auto-Resolve goal without a structured target is Accomplished by its culminating success, writing only its status', () => {
    const inp = inputs({ factions: [{ id: 'a', name: 'A', power: 1, momentum: 0 }], goals: [goal('n', 'a', { status: 'Progressing' })] });
    const r = resolveFactionPhase(inp, { 'n#0': [5, 5] });
    expect(r.goals[0].outcome).toBe('Accomplished');
    expect(factionPhaseEffects(inp, r)).toEqual([expect.objectContaining({ targetType: 'goal', targetId: 'n', property: 'status', value: 'Accomplished' })]);
  });
});

describe('Power 0 (§18.6)', () => {
  it('a faction with Power 0 allocates no tokens and makes no rolls; the others are unaffected', () => {
    const inp = inputs({ factions: [{ id: 'a', name: 'A', power: 0, momentum: 2 }, { id: 'b', name: 'B', power: 1, momentum: 0 }] });
    const r = resolveFactionPhase(inp);
    expect(r.allocations.filter(a => a.factionId === 'a')).toEqual([]);
    expect(r.attempts.filter(a => a.factionId === 'a')).toEqual([]);
    expect(r.allocations.filter(a => a.factionId === 'b').reduce((s, a) => s + a.attempts, 0)).toBe(1);
  });
});

describe('Accept / Defer and re-rolls (§18.5)', () => {
  const ready = (x: Partial<FpGoal> = {}) => inputs({ factions: [{ id: 'a', name: 'A', power: 1, momentum: 0 }],
    goals: [goal('k', 'a', { status: 'Progressing', outcomeMode: 'Adjudicated', ...x })] });
  it('Defer (the default): a resolution task for the session', () => {
    const inp = ready({ targetEntityType: 'Character', targetEntityId: 'vara', targetState: 'Dead' });
    const r = resolveFactionPhase(inp, { 'k#0': [5, 5] });
    expect(r.accepted).toEqual([]);
    expect(factionPhaseEffects(inp, r).map(e => e.property)).toEqual(['readyToResolve']);
  });
  it('Accept: resolved now, as if it Auto-Resolved: its target (attributed, GoalGenerator) and Accomplished; no task', () => {
    const inp = ready({ targetEntityType: 'Character', targetEntityId: 'vara', targetState: 'Dead' });
    const r = resolveFactionPhase(inp, { 'k#0': [5, 5] }, { accepted: ['k'] });
    expect(r.goals[0].outcome).toBe('ReadyToResolve');   // the dice result is unchanged; the GM decision is recorded beside it
    expect(r.accepted).toEqual(['k']);
    expect(factionPhaseEffects(inp, r)).toEqual([
      expect.objectContaining({ targetType: 'character', targetId: 'vara', property: 'state', value: 'Dead', actorFactionId: 'a', origin: 'GoalGenerator' }),
      expect.objectContaining({ targetType: 'goal', targetId: 'k', property: 'status', value: 'Accomplished', origin: 'FactionPhase' })]);
  });
  it('Accept without a target the app can apply (a ritual): only the status', () => {
    const inp = ready();
    const r = resolveFactionPhase(inp, { 'k#0': [5, 5] }, { accepted: ['k'] });
    expect(factionPhaseEffects(inp, r)).toEqual([expect.objectContaining({ property: 'status', value: 'Accomplished' })]);
  });
  it('only a goal the dice made Ready can be accepted', () => {
    const inp = ready();
    expect(resolveFactionPhase(inp, { 'k#0': [1, 3] }, { accepted: ['k', 'nope'] }).accepted).toEqual([]);
  });
  it('re-rolled dice are recorded as such; a die is 1–6 and varies with the time', () => {
    const r = resolveFactionPhase(ready(), { 'k#0': [5, 5] }, { overrideSource: 'reroll' });
    expect(r.attempts[0].source).toBe('reroll');
    const faces = new Set(Array.from({ length: 60 }, (_, i) => rerollDie(7, 'k#0/0', 1_760_000_000_000 + i)));
    expect([...faces].every(f => f >= 1 && f <= 6)).toBe(true);
    expect(faces.size).toBeGreaterThan(3);
  });
});

describe('Opening', () => {
  const inp: OpeningInputs = { version: 'op-4', seed: 1, tiers: { a: 0, b: 2 },
    pending: [{ factionId: 'a', sign: 1, rule: 'critical-success', rootCauseId: 'g#0', sourceSessionId: 's1', reason: 'r' },
              { factionId: 'a', sign: 1, rule: 'critical-success', rootCauseId: 'g#1', sourceSessionId: 's1', reason: 'r' },
              { factionId: 'b', sign: 1, rule: 'gm-declared', rootCauseId: 'e', sourceSessionId: 's1', reason: 'r' }] };
  it('resolves with the cap and the clamp, and writes the marker plus one momentumTier delta per changed tier', () => {
    const res = resolveOpening(inp);
    expect(res.tiers).toEqual({ a: 1, b: 2 });
    const fx = openingEffects(inp, res);
    expect(fx[0]).toMatchObject({ targetType: 'colony', property: 'opening', origin: 'Opening' });
    expect(fx.slice(1)).toEqual([expect.objectContaining({ targetType: 'faction', targetId: 'a', property: 'momentumTier', delta: 1, origin: 'MomentumResolution' })]);
  });
  it('writes no goal Effects: a Ready to Resolve goal is the GM\'s task, never resolved by the Opening', () => {
    expect(openingEffects(inp, resolveOpening(inp)).some(e => e.targetType === 'goal')).toBe(false);
  });
});

describe('replay of a committed Colony Turn', () => {
  const fac = (id: string, momentumTier = 0) => ({ id, name: id, type: 'Faction', active: true, momentum: 0, momentumTier, baseLegitimacy: 50,
    powerModifier: 0, factionSize: 0, values: { a: 1 / 3, b: 1 / 3, c: 1 / 3 } }) as any;
  const turnEvent = (sid: string, effects: any[]) => ({ id: `ct-${sid}`, sessionId: sid, title: 'Colony Turn', kind: 'ColonyTurn', sortOrder: -1000,
    effects: effects.map((e, i) => ({ id: `${sid}-${i}`, eventId: `ct-${sid}`, delta: 0, ...e })) });
  const rules = { cascadeRulesJson: '[]', stressTriggersJson: '[]', formulasJson: '' } as any;
  it('folds the committed resolution (not a derived one) and turns criticals into pending signals', () => {
    const s1 = { id: 's1', number: 1, act: 2, events: [turnEvent('s1', [
      { targetType: 'colony', targetId: 'colony', property: 'opening', value: 'resolved', origin: 'Opening' },
      { targetType: 'faction', targetId: 'a', property: 'momentumSignal', delta: 1, value: 'Critical Success', secondaryTargetId: 'g#0', origin: 'FactionPhase' }])] };
    const s2 = { id: 's2', number: 2, act: 2, events: [turnEvent('s2', [
      { targetType: 'colony', targetId: 'colony', property: 'opening', value: 'resolved', origin: 'Opening' },
      { targetType: 'faction', targetId: 'a', property: 'momentumTier', delta: 1, origin: 'MomentumResolution' }])] };
    const [x1, x2] = buildColonySnapshots({ colonyStress: 0 } as any, [fac('a')], [], [s1, s2] as any, rules, [], [], []);
    expect(x1.pendingMomentumSignals).toMatchObject([{ factionId: 'a', sign: 1, rule: 'critical-success', rootCauseId: 'g#0' }]);
    expect(x2.factionMomentumTier['a']).toBe(1);
    // a session with an Opening marker but no momentumTier effect keeps the tier, even though a signal was pending
    const s2b = { ...s2, events: [turnEvent('s2', [{ targetType: 'colony', targetId: 'colony', property: 'opening', value: 'resolved', origin: 'Opening' }])] };
    expect(buildColonySnapshots({ colonyStress: 0 } as any, [fac('a')], [], [s1, s2b] as any, rules, [], [], [])[1].factionMomentumTier['a']).toBe(0);
  });
});

describe('Faction Phase inputs from history', () => {
  const vals = { a: 1 / 3, b: 1 / 3, c: 1 / 3 };
  const world = (goals: any[]) => ({
    colonyState: { colonyStress: 0 } as any, rules: { cascadeRulesJson: '[]', stressTriggersJson: '[]', formulasJson: '' } as any, locations: [],
    factions: [{ id: 'a', name: 'A', type: 'Faction', active: true, momentum: 0, momentumTier: 1, baseLegitimacy: 50, powerModifier: 0, factionSize: 0, values: vals }] as any,
    characters: [{ id: 'c', name: 'C', characterType: 'NPC', state: 'Alive', factionId: 'a', values: vals, conviction: 50, pressure: 0, influence: 50, impressionable: 50 }] as any,
    assets: [{ id: 'x', name: 'X', type: 't', role: 'Operational', tier: 1, keystone: false, status: 'Stable', controllingFactionId: 'b' }] as any,
    goals, sessions: [{ id: 's1', number: 1, act: 2, events: [] }] as any });
  it('§18.12 guards: an active assignment threatened by a known goal; a Secret goal is unknown to the defender', () => {
    const two = (goals: any[], champ = 'Alive') => ({ ...world(goals),
      factions: ['a', 'b'].map(id => ({ id, name: id.toUpperCase(), type: 'Faction', active: true, momentum: 0, momentumTier: 0, baseLegitimacy: 50,
        powerModifier: 0, factionSize: 0, values: vals })) as any,
      characters: [['ca', 'a', 'Alive'], ['cb', 'b', champ]].map(([id, f, state]) => ({ id, name: id, characterType: 'NPC', state, factionId: f, values: vals,
        conviction: 50, pressure: 0, influence: 50, impressionable: 50 })) as any });
    const attack = (visibility: string) => ({ id: 'g1', factionId: 'a', title: 'Take X', status: 'Plotting', conditionType: 'Achieve', priority: 'Major',
      championId: 'ca', visibility, outcomeMode: 'Automatic', targetEntityType: 'Asset', targetEntityId: 'x', targetOwnerFactionId: 'a' });
    const keep = { id: 'm1', factionId: 'b', title: 'Keep X', status: 'Progressing', conditionType: 'Maintain', priority: 'Critical', championId: 'cb',
      visibility: 'Known', targetEntityType: 'Asset', targetEntityId: 'x' };
    const guards = (goals: any[], champ?: string) => buildFactionPhaseInputs(two(goals, champ), 's1', 5).inputs.guards;
    expect(guards([attack('Known'), keep])).toEqual([{ id: 'm1', factionId: 'b', title: 'Keep X', priority: 'Critical', targetEntityId: 'x' }]);
    expect(guards([attack('Open'), keep]).length).toBe(1);
    expect(guards([attack('Secret'), keep])).toEqual([]);          // the defender does not know of it
    expect(guards([keep])).toEqual([]);                            // nothing threatens X
    expect(guards([attack('Known'), keep], 'Dead')).toEqual([]);  // an inactive assignment (champion incapable)
    expect(guards([attack('Known'), { ...keep, earliestAct: 3 }])).toEqual([]);   // not in force before its Earliest Act (this is Act II)
    expect(guards([attack('Known'), { ...keep, earliestAct: 2 }]).length).toBe(1);
    expect(buildFactionPhaseInputs(two([attack('Known'), keep]), 's1', 5).inputs).toMatchObject({ version: 'fp-5', target: 10, priorityBonus: { Critical: 3, Major: 2, Minor: 1 } });
  });
  it('freezes Power, Momentum and eligible goals; ineligible ones are listed with their reasons', () => {
    const ready = { id: 'g1', factionId: 'a', title: 'Take X', status: 'Plotting', conditionType: 'Achieve', priority: 'Major', championId: 'c',
      outcomeMode: 'Automatic', targetEntityType: 'Asset', targetEntityId: 'x', targetOwnerFactionId: 'a' };
    const bare = { ...ready, id: 'g2', title: 'Take X again' };                                        // a second eligible goal
    const noTarget = { ...ready, id: 'g3', targetEntityType: undefined, targetEntityId: undefined };   // Auto-Resolve, narrative only (§18.6)
    const gmTask = { ...noTarget, id: 'g4', outcomeMode: 'Adjudicated' };                                // the GM resolves it
    const later = { ...ready, id: 'g5', earliestAct: 3 };                                                 // not before Act III
    const b = buildFactionPhaseInputs(world([ready, bare, noTarget, gmTask, later]), 's1', 5);
    expect(b.inputs.factions).toMatchObject([{ id: 'a', power: 0, momentum: 1 }]);   // no channel qualifies: Power 0 (§18.6)
    expect(b.inputs.goals.map(g => g.id)).toEqual(['g1', 'g2', 'g3', 'g4']);
    expect(b.inputs.goals[0]).not.toHaveProperty('milestone');   // 2026-10-26: world results come from World Conditions
    expect(b.ineligible).toMatchObject([{ goalId: 'g5', reasons: ['Not yet eligible (from Act III)'] }]);
  });
  it('fp-4: advance Effects are frozen valid-only; Progressing Effects only from Planning; none are omitted from the inputs', () => {
    const ok = { targetType: 'asset', targetId: 'x', property: 'status', delta: 0, value: 'Contested' };
    const bad = { targetType: 'asset', targetId: 'x', property: 'tier', delta: 1 };
    const base = { id: 'g1', factionId: 'a', title: 'Take X', status: 'Plotting', conditionType: 'Achieve', priority: 'Major', championId: 'c',
      outcomeMode: 'Automatic', targetEntityType: 'Asset', targetEntityId: 'x', targetOwnerFactionId: 'a',
      progressingEffectsJson: JSON.stringify([ok, bad]), accomplishedEffectsJson: JSON.stringify([ok]) };
    const b = buildFactionPhaseInputs(world([base, { ...base, id: 'g2', status: 'Progressing' }, { ...base, id: 'g3', progressingEffectsJson: '[]', accomplishedEffectsJson: '[]' }]), 's1', 5);
    const [g1, g2, g3] = b.inputs.goals;
    expect([g1.onProgressing, g1.onAccomplished]).toEqual([[ok], [ok]]);
    expect([g2.onProgressing, g2.onAccomplished]).toEqual([undefined, [ok]]);   // already Progressing: its first-success Effects are past
    expect('onProgressing' in g3 || 'onAccomplished' in g3).toBe(false);
  });
});
