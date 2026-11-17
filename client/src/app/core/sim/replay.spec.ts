// Focused replay-engine tests for M0 fixes (the golden spec covers the real campaign fixture).
import { buildColonySnapshots } from './replay';

const faction = { id: 'keepers', name: 'Order', type: 'Faction', active: true, momentum: 0, baseLegitimacy: 50, powerModifier: 0,
  factionSize: 0, values: { a: 1/3, b: 1/3, c: 1/3 } } as any;
const asset = { id: 'ddn', name: 'Dead Drop Network', type: 'Intelligence', role: 'Covert', tier: 3, keystone: false,
  status: 'Stable', controllingFactionId: 'shattered' } as any;
const goal = { id: 'break', factionId: 'keepers', title: 'Break the Shattered', status: 'Progressing', conditionType: 'Achieve',
  priority: 'Minor', visibility: 'Open', targetEntityType: 'Asset', targetEntityId: 'ddn', targetState: 'Damaged' } as any;
const session = { id: 's1', number: 1, title: 'S1', act: 2, week: 1, events: [{ id: 'e1', sessionId: 's1', title: 'Raid', sortOrder: 0,
  // M4: the raid is credited to the goal's faction (actorFactionId), so the detector Accomplishes the goal (§15.4)
  effects: [{ id: 'f1', eventId: 'e1', targetType: 'asset', targetId: 'ddn', property: 'status', delta: 0, value: 'Damaged', actorFactionId: 'keepers' }] }] } as any;
const rules = (cascade: unknown[], triggers: unknown[] = []) => ({ cascadeRulesJson: JSON.stringify(cascade), stressTriggersJson: JSON.stringify(triggers), formulasJson: '' }) as any;
const goalRule = { id: 'won', label: 'Goal won', triggerType: 'event', sourceEntityType: 'goal', sourceProperty: 'status',
  sourcePropertyValue: ['Accomplished'], effectType: 'flat', flatDelta: 10, targetEntityType: 'faction', targetProperty: 'momentum' };

describe('replay: retired derived systems (§18.10)', () => {
  // the test campaign's stored configuration: a goal-event cascade, a threshold cascade and a Stress Trigger
  const threshold = { id: 'hi', label: 'hi', triggerType: 'threshold', sourceEntityType: 'character', sourceProperty: 'pressure',
    thresholdOperator: 'gt', thresholdValue: -1, effectType: 'flat', flatDelta: 5, targetEntityType: 'character', targetProperty: 'pressure' };
  const trigger = { id: 't', label: 'Goal done', sourceEntityType: 'goal', sourceProperty: 'status', sourcePropertyValue: ['Accomplished'], flatDelta: 1, oneShot: true };
  const char = { id: 'c', name: 'c', characterType: 'NPC', state: 'Alive', factionId: 'keepers', values: { a: 1/3, b: 1/3, c: 1/3 },
    conviction: 50, pressure: 0, influence: 50, impressionable: 50 } as any;

  it('stored Cascade Rules and Stress Triggers are never executed; the goal is still Accomplished by the world', () => {
    const run = (r: any) => buildColonySnapshots({} as any, [faction], [char], [session], r, [asset], [goal], []);
    const [withRules] = run(rules([goalRule, threshold], [trigger])), [without] = run(rules([], []));
    expect(withRules).toEqual(without);
    expect(withRules.goalStatuses['break']).toBe('Accomplished');
    expect([withRules.factionMomentum['keepers'], withRules.characterPressure['c'], withRules.colonyStress]).toEqual([0, 0, 0]);
  });

  it('a recorded Stress Effect (colony or asset) is inert: Stress comes from World Conditions only', () => {
    const s = { ...session, events: [{ ...session.events[0], effects: [
      { id: 'x1', eventId: 'e1', targetType: 'colony', targetId: 'colony', property: 'stress', delta: 3 },
      { id: 'x2', eventId: 'e1', targetType: 'asset', targetId: 'ddn', property: 'stress', delta: 2 }] }] };
    const [snap] = buildColonySnapshots({} as any, [faction], [], [s], rules([]), [asset], [], []);
    expect([snap.colonyStress, snap.stressFromConditions]).toEqual([0, []]);
  });
});

// ── M1: introductions and explicit effect order ─────────────────────────────
import { eventSessionNumbers, presentAt, orderedEffects } from './replay';

describe('replay: introductions (M1)', () => {
  const sessions = [{ ...session, events: [{ ...session.events[0], id: 'intro-ev' }] }, { ...session, id: 's2', number: 2, events: [] }] as any;
  const es = eventSessionNumbers(sessions);
  const newcomer = { introducedAtEventId: 'intro-ev' };
  const snap = (n: number) => ({ sessionNumber: n }) as any;

  it('an entity without an introduction is always present', () => {
    expect(presentAt({}, null, es)).toBe(true);
    expect(presentAt({}, snap(1), es)).toBe(true);
  });
  it('an introduced entity is absent from the baseline and present from its session on', () => {
    expect(presentAt(newcomer, null, es)).toBe(false);
    expect(presentAt(newcomer, snap(1), es)).toBe(true);
    expect(presentAt(newcomer, snap(2), es)).toBe(true);
  });
  it('an introduction pointing at an unknown event is never present', () => {
    expect(presentAt({ introducedAtEventId: 'missing' }, snap(2), es)).toBe(false);
  });
});

describe('replay: effect order (M1)', () => {
  it('sorts by Ordinal; pre-M1 effects without ordinals keep stored order', () => {
    expect(orderedEffects([{ id: 'b', ordinal: 1 }, { id: 'a', ordinal: 0 }]).map(e => e.id)).toEqual(['a', 'b']);
    expect(orderedEffects([{ id: 'x' }, { id: 'y' }, { id: 'z' }] as any[]).map(e => e.id)).toEqual(['x', 'y', 'z']);
  });
  it('applies effects in Ordinal order even when stored out of order', () => {
    const ev = { id: 'e1', sessionId: 's1', title: 'x', sortOrder: 0, effects: [
      { id: 'f2', eventId: 'e1', targetType: 'character', targetId: 'c', property: 'state', delta: 0, value: 'Alive', ordinal: 1 },
      { id: 'f1', eventId: 'e1', targetType: 'character', targetId: 'c', property: 'state', delta: 0, value: 'Dead', ordinal: 0 },
    ] };
    const c = { id: 'c', name: 'c', characterType: 'NPC', state: 'Alive', values: { a: 1/3, b: 1/3, c: 1/3 }, conviction: 50, pressure: 0, influence: 0, impressionable: 50 };
    const [snap] = buildColonySnapshots({ colonyState: 0 } as any, [], [c as any], [{ ...session, events: [ev] } as any], rules([]), [], [], []);
    expect(snap.characterStates['c']).toBe('Alive');   // Dead (ordinal 0) then Alive (ordinal 1)
  });
});
