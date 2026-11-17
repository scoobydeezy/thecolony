// M6: Character Phase (§17.2 steps 7–9, §17.3, §18.4): Defection Checks, Settling, Drift Rolls, and their replay.
import { resolveCharacterPhase, characterPhaseEffects, bandOf, CharacterPhaseInputs, CpCharacter, CpCheck, BAND_MODIFIERS, DEFECTION_MODIFIERS } from './character-phase';
import { resolveOpening, openingEffects } from './opening';
import { buildColonySnapshots } from './replay';
import { buildCharacterPhaseInputs, buildOpeningInputs } from './colony-turn';

const ch = (id: string, factionId: string, drift: number, x: Partial<CpCharacter> = {}): CpCharacter =>
  ({ id, name: id, factionId, instability: 'Stable', drift, exempt: false, reaffirmed: false, ...x });
const cp = (characters: CpCharacter[], x: Partial<CharacterPhaseInputs> = {}): CharacterPhaseInputs => ({
  version: 'cp-2', seed: 3, target: 8, waveringAt: 15, breakingAt: 30, bandModifiers: { ...BAND_MODIFIERS },
  defectionTarget: 8, checks: [], factions: ['a', 'b'], characters, ...x });
const chk = (characterId: string, factionId: string, label: CpCheck['label'], isLeader = false): CpCheck =>
  ({ characterId, name: characterId.toUpperCase(), factionId, label, modifier: DEFECTION_MODIFIERS[label], isLeader });

describe('drift bands', () => {
  it('Steady ≤ 0 < Strained < 15 ≤ Wavering < 30 ≤ Breaking', () => {
    expect([0, 0.01, 14.99, 15, 29.99, 30].map(d => bandOf(d, 15, 30))).toEqual(['Steady', 'Strained', 'Strained', 'Wavering', 'Wavering', 'Breaking']);
  });
});

describe('Character Phase', () => {
  it('one roll per faction: its eligible member with the highest Drift Risk (ties: earlier name)', () => {
    const r = resolveCharacterPhase(cp([ch('a1', 'a', 10), ch('a2', 'a', 25), ch('b2', 'b', 5), ch('b1', 'b', 5)]));
    expect(r.rolls.map(x => [x.factionId, x.characterId, x.band, x.modifier])).toEqual([['a', 'a2', 'Wavering', 0], ['b', 'b1', 'Strained', -1]]);
  });
  it('ineligible: Steady, Compromised, exempt, Reaffirmed; a faction with nobody eligible makes no roll', () => {
    const r = resolveCharacterPhase(cp([ch('a1', 'a', 0), ch('a2', 'a', 40, { instability: 'Compromised' }), ch('a3', 'a', 35, { exempt: true }),
                                        ch('a4', 'a', 30, { reaffirmed: true }), ch('b1', 'b', 12)]));
    expect(r.rolls.map(x => x.characterId)).toEqual(['b1']);
    expect(r.skipped).toEqual([{ factionId: 'a', reason: 'no eligible member' }]);
  });
  it('a faction whose member made a Defection Check this Turn has used its roll (whatever the check\'s outcome)', () => {
    const r = resolveCharacterPhase(cp([ch('a1', 'a', 20), ch('a9', 'a', 40, { instability: 'Compromised' }), ch('b1', 'b', 20)],
                                       { checks: [chk('a9', 'a', 'Aligned')] }));
    expect(r.rolls.map(x => x.factionId)).toEqual(['b']);
    expect(r.skipped).toEqual([{ factionId: 'a', reason: 'consumed' }]);
  });
  it('Settling: Conflicted and Steady → Stable (a recovery); success advances one state; failure retreats one', () => {
    const r = resolveCharacterPhase(cp([ch('a1', 'a', -5, { instability: 'Conflicted' }), ch('a2', 'a', 31, { instability: 'Conflicted' }),
                                        ch('b1', 'b', 20, { instability: 'Conflicted' })]), { 'a2': [4, 3], 'b1': [2, 3] } as any);
    expect(r.settled).toEqual(['a1']);
    expect(r.rolls.map(x => [x.characterId, x.total, x.from, x.to])).toEqual([['a2', 8, 'Conflicted', 'Compromised'], ['b1', 5, 'Conflicted', 'Stable']]);
  });
  it('a failed roll by a Stable character changes nothing', () => {
    const r = resolveCharacterPhase(cp([ch('a1', 'a', 5)], { factions: ['a'] }), { a1: [1, 2] });
    expect(r.rolls[0]).toMatchObject({ from: 'Stable', to: 'Stable', success: false });
    expect(characterPhaseEffects(r)).toEqual([expect.objectContaining({ property: 'characterPhase' })]);
  });
  it('non-change: the phase writes only instability (and its marker); Values, Pressure, Conviction and the Drift vector are untouched', () => {
    for (let seed = 0; seed < 50; seed++) {
      const r = resolveCharacterPhase(cp([ch('a1', 'a', 20, { instability: 'Conflicted' }), ch('b1', 'b', 31), ch('b2', 'b', -1, { instability: 'Conflicted' })], { seed }));
      for (const e of characterPhaseEffects(r)) expect(['characterPhase', 'instability']).toContain(e.property);
    }
  });
});

describe('Defection Checks (Character Phase, §18.4)', () => {
  it('success: leaves the faction and returns to Stable; failure: back to Conflicted; recorded first, before any roll', () => {
    const inp = cp([ch('x', 'a', 40, { instability: 'Compromised' }), ch('y', 'a', 40, { instability: 'Compromised' }), ch('b1', 'b', 20)],
                   { checks: [chk('x', 'a', 'Strained'), chk('y', 'a', 'Aligned')] });
    const r = resolveCharacterPhase(inp, { x: [4, 3], y: [6, 4], b1: [6, 6] });
    expect(r.checks.map(c => [c.characterId, c.total, c.left, c.source])).toEqual([['x', 8, true, 'physical'], ['y', 7, false, 'physical']]);
    const fx = characterPhaseEffects(r).map(e => [e.targetId, e.property, e.value]);
    expect(fx).toEqual([['colony', 'characterPhase', 'resolved'],
      ['x', 'defectionCheck', 'left'], ['x', 'factionChange', ''], ['x', 'instability', 'Stable'],
      ['y', 'defectionCheck', 'stayed'], ['y', 'instability', 'Conflicted'],
      ['b1', 'instability', 'Conflicted']]);
    expect(characterPhaseEffects(r).every(e => e.origin === 'CharacterPhase')).toBe(true);
  });
  it('checks have their own dice stream: adding a check never changes the Drift Rolls\' app dice', () => {
    const chars = [ch('a1', 'a', 20), ch('b1', 'b', 20), ch('c9', 'c', 40, { instability: 'Compromised' })];
    const without = resolveCharacterPhase(cp(chars, { factions: ['a', 'b', 'c'] }));
    const withCheck = resolveCharacterPhase(cp(chars, { factions: ['a', 'b', 'c'], checks: [chk('c9', 'c', 'Tolerated')] }));
    expect(withCheck.rolls.map(x => [x.characterId, x.d1, x.d2])).toEqual(without.rolls.map(x => [x.characterId, x.d1, x.d2]));
  });
  it('re-rolled dice (checks and rolls) are recorded as re-rolls', () => {
    const inp = cp([ch('x', 'a', 40, { instability: 'Compromised' }), ch('b1', 'b', 20)], { checks: [chk('x', 'a', 'Tolerated')] });
    const r = resolveCharacterPhase(inp, { x: [3, 3], b1: [4, 4] }, { overrideSource: 'reroll' });
    expect([r.checks[0].source, r.rolls[0].source]).toEqual(['reroll', 'reroll']);
  });
  it('the Opening makes no checks any more: it only resolves Momentum', () => {
    const inp = { version: 'op-4', seed: 1, tiers: { a: 1 }, pending: [] };
    expect(openingEffects(inp, resolveOpening(inp))).toEqual([expect.objectContaining({ property: 'opening' })]);
  });
});

describe('replay and builders', () => {
  const vals = { a: 1 / 3, b: 1 / 3, c: 1 / 3 };
  const fac = (id: string, x: object = {}) => ({ id, name: id, type: 'Faction', active: true, momentum: 0, momentumTier: 0, baseLegitimacy: 50,
    powerModifier: 0, factionSize: 0, values: vals, ...x }) as any;
  const npc = (id: string, factionId: string, x: object = {}) => ({ id, name: id, characterType: 'NPC', state: 'Alive', factionId, values: vals,
    conviction: 50, pressure: 0, influence: 50, impressionable: 0, ...x }) as any;
  const ev = (sid: string, effects: any[], kind = 'Play') => ({ id: `${kind}-${sid}`, sessionId: sid, title: kind, kind, sortOrder: kind === 'ColonyTurn' ? -1000 : 0,
    effects: effects.map((e, i) => ({ id: `${sid}-${kind}-${i}`, eventId: `${kind}-${sid}`, delta: 0, ...e })) });
  const rules = { cascadeRulesJson: '[]', stressTriggersJson: '[]', formulasJson: '' } as any;
  const world = (sessions: any[], chars: any[], factions = [fac('a', { leaderId: 'boss' })]) => ({
    colonyState: { colonyStress: 0 } as any, rules, locations: [], assets: [], goals: [], factions, characters: chars, sessions });
  const inst = (cid: string, value: string, origin = 'CharacterPhase') => ({ targetType: 'character', targetId: cid, property: 'instability', value, origin });

  it('Reaffirmed: Compromised → (failed check) Conflicted → Stable without leaving; not when the character defects', () => {
    const s = [{ id: 's1', number: 1, events: [ev('s1', [inst('x', 'Conflicted'), inst('x', 'Compromised')], 'ColonyTurn')] },
               { id: 's2', number: 2, events: [ev('s2', [inst('x', 'Conflicted', 'Opening'), inst('x', 'Stable')], 'ColonyTurn')] }];
    const snaps = buildColonySnapshots({ colonyStress: 0 } as any, [fac('a')], [npc('x', 'a')], s as any, rules, [], [], []);
    expect(snaps[1].characterReaffirmed['x']).toBe('a');
    expect(snaps[1].characterRecoveredAt['x']).toBe(2);
    const d = [s[0], { id: 's2', number: 2, events: [ev('s2', [{ targetType: 'character', targetId: 'x', property: 'factionChange', value: '', origin: 'Opening' }, inst('x', 'Stable', 'Opening')], 'ColonyTurn')] }];
    expect(buildColonySnapshots({ colonyStress: 0 } as any, [fac('a')], [npc('x', 'a')], d as any, rules, [], [], [])[1].characterReaffirmed['x']).toBeNull();
  });
  it('a leader leaving in the Character Phase costs the faction −1 at the NEXT Opening, not this Turn', () => {
    const s = [{ id: 's1', number: 1, events: [ev('s1', [{ targetType: 'character', targetId: 'boss', property: 'factionChange', value: '', origin: 'CharacterPhase' }], 'ColonyTurn')] },
               { id: 's2', number: 2, events: [] }];
    const w = world(s, [npc('boss', 'a')]);
    const [x1] = buildColonySnapshots({ colonyStress: 0 } as any, w.factions, w.characters, s as any, rules, [], [], []);
    expect(x1.factionMomentumTier['a']).toBe(0);
    expect(x1.pendingMomentumSignals).toMatchObject([{ factionId: 'a', sign: -1, rule: 'leader-left' }]);
    expect(x1.factionLeaders['a']).toBeNull();
    const o2 = buildOpeningInputs(w as any, 's2', 1);
    expect(resolveOpening(o2).tiers['a']).toBe(-1);
  });
  it('an Opening defection by the leader (op-2 records) is not signalled again by replay (it was resolved in that Opening)', () => {
    const s = [{ id: 's1', number: 1, events: [ev('s1', [{ targetType: 'character', targetId: 'boss', property: 'factionChange', value: '', origin: 'Opening' }], 'ColonyTurn')] }];
    const [x1] = buildColonySnapshots({ colonyStress: 0 } as any, [fac('a', { leaderId: 'boss' })], [npc('boss', 'a')], s as any, rules, [], [], []);
    expect(x1.pendingMomentumSignals).toEqual([]);
    expect(x1.factionLeaders['a']).toBeNull();
  });
  it('builder: exempt once after a recovery; a Compromised character at the end of a session faces a Defection Check', () => {
    const chars = [npc('x', 'a', { pressure: 80 }), npc('y', 'a', { pressure: 70 })];
    const s = [{ id: 's1', number: 1, act: 1, events: [ev('s1', [{ targetType: 'colony', targetId: 'colony', property: 'characterPhase', origin: 'CharacterPhase' },
                                                                  inst('x', 'Conflicted'), inst('y', 'Conflicted'), inst('y', 'Compromised', 'Manual')], 'ColonyTurn')] },
               { id: 's2', number: 2, act: 1, events: [ev('s2', [inst('x', 'Stable', 'Manual')])] },   // x recovers in play
               { id: 's3', number: 3, act: 1, events: [] }];
    const w = world(s, chars);
    const c3 = buildCharacterPhaseInputs(w as any, 's3', 1);
    expect(c3.checks.map(c => [c.characterId, c.isLeader])).toEqual([['y', false]]);
    expect(c3.characters.find(c => c.id === 'x')).toMatchObject({ exempt: true, instability: 'Stable', drift: 30 });
  });
});
