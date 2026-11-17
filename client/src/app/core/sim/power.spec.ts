// §18.7: Power from capacity channels in plain points. Rule definitions under test: People ≥ 10 (named + leader 5 +
// ⌊unnamed ÷ 20⌋), Holdings ≥ 15 (stars of Operational, Strategic, Covert), Mandate ≥ 5 (stars of Symbolic, Mandate).
import { computePowerBreakdown, powerMembers, leaderCapable, peopleChannel } from './power';
import { buildColonySnapshots, projectAssets, projectCharacters, projectFactions } from './replay';
import { buildFactionPhaseInputs } from './colony-turn';
import { Asset, AssetRole, AssetStatus, Character, DEFAULT_FORMULAS, Faction, ASSET_ROLE_CHANNEL, assetStars } from '../models/types';
import fixtureJson from './__fixtures__/colony-2026-10-14.json';

const F = DEFAULT_FORMULAS;
const faction = (x: Partial<Faction> = {}): Faction => ({
  id: 'f', name: 'F', represents: '', type: 'Faction', coreTenet: '', certainOf: '', rightAbout: '', afraidOf: '', wrongAbout: '',
  values: { a: 1 / 3, b: 1 / 3, c: 1 / 3 }, active: true, sortOrder: 0, momentum: 0, powerModifier: 0, factionSize: 0, ...x,
});
const ch = (id: string, x: Partial<Character> = {}): Character => ({
  id, name: id, characterType: 'NPC', state: 'Alive', factionId: 'f', values: { a: 1 / 3, b: 1 / 3, c: 1 / 3 },
  conviction: 50, pressure: 0, influence: 50, impressionable: 50, ...x,
});
const named = (n: number, x: Partial<Character> = {}) => Array.from({ length: n }, (_, i) => ch(`m${i}`, x));
let k = 0;
const asset = (role: AssetRole, tier: number, x: Partial<Asset> = {}): Asset =>
  ({ id: `a${++k}`, campaignId: '', name: `A${k}`, type: 'Resource', role, tier, keystone: false, status: 'Stable', controllingFactionId: 'f', ...x });
const P = (fac: Faction, chars: Character[] = [], assets: Asset[] = []) => computePowerBreakdown(fac, chars, assets, F);

describe('People = capable leader 5 + ⌊Faction Size ÷ 20⌋ (threshold 10; §18.8)', () => {
  it('nobody: 0 points', () => {
    expect(P(faction()).people).toMatchObject({ score: 0, leaderBonus: 0, size: 0, sizePoints: 0, qualifies: false });
  });
  it('named characters add nothing individually: 3 or 12 named, no leader, size 0 → 0', () => {
    expect(P(faction(), named(3)).people.score).toBe(0);
    expect(P(faction(), named(12)).people.score).toBe(0);
  });
  it('the brief\'s example: three named members including the leader, Faction Size 40 → 5 + 2 = 7 (size is 40, not 43)', () => {
    expect(P(faction({ leaderId: 'm0', factionSize: 40 }), named(3)).people).toMatchObject({ score: 7, leaderBonus: 5, size: 40, sizePoints: 2, qualifies: false });
  });
  it('only whole groups of 20 count: 0–19 → 0, 20–39 → 1, 40 → 2, 60 → 3, 80 → 4, 100 → 5, 219 → 10', () => {
    expect([0, 19, 20, 39, 40, 59, 60, 80, 99, 100, 119, 200, 219].map(n => P(faction({ factionSize: n })).people.sizePoints))
      .toEqual([0, 0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 10, 10]);
  });
  it('qualifies with very few named characters: a leader and 100 members (5 + 5), or 200 members alone', () => {
    expect(P(faction({ leaderId: 'm0', factionSize: 100 }), named(1)).people).toMatchObject({ score: 10, qualifies: true });
    expect(P(faction({ factionSize: 200 })).people).toMatchObject({ score: 10, qualifies: true });
  });
  it('the leader bonus: exactly 5, only while the leader is alive and a member; a capable replacement restores it', () => {
    const fac = faction({ leaderId: 'm0', factionSize: 100 }), m = named(4);
    expect(P(fac, m).people.score).toBe(10);
    expect(P(fac, m.map(c => c.id === 'm0' ? { ...c, state: 'Dead' } : c)).people).toMatchObject({ score: 5, leaderBonus: 0 });       // killed
    expect(P(fac, m.map(c => c.id === 'm0' ? { ...c, state: 'Missing' } : c)).people.leaderBonus).toBe(0);                             // incapable
    expect(P(fac, m.map(c => c.id === 'm0' ? { ...c, factionId: 'other' } : c)).people.leaderBonus).toBe(0);                          // departed
    expect(P(faction({ factionSize: 100 }), m).people.score).toBe(5);                                                                 // no leader
    expect(P(faction({ leaderId: 'm3', factionSize: 100 }), m).people.score).toBe(10);                                                // replaced
    expect(P(faction({ leaderId: 'x', factionSize: 100 }), [...m, ch('x', { factionId: 'other' })]).people.leaderBonus).toBe(0);     // an outsider
  });
  it('adding or removing named characters never changes People (only Faction Size or leadership does)', () => {
    const fac = faction({ leaderId: 'm0', factionSize: 60 });
    expect([1, 2, 5, 9].map(n => P(fac, named(n)).people.score)).toEqual([8, 8, 8, 8]);
  });
  it('monotone in Faction Size', () => {
    for (let n = 0; n < 300; n++) expect(P(faction({ factionSize: n + 1 })).people.score).toBeGreaterThanOrEqual(P(faction({ factionSize: n })).people.score);
  });
  it('Faction Size changes through Events replay (Design edits the field; Live records ±n)', () => {
    const fx = (id: string, delta: number) => ({ id, eventId: 'e', targetType: 'faction', targetId: 'f', property: 'factionSize', delta });
    const sess = (n: number, d: number) => ({ id: `s${n}`, number: n, act: 2, events: [{ id: `e${n}`, sessionId: `s${n}`, title: 'x', sortOrder: 0, effects: [fx(`x${n}`, d)] }] });
    const snaps = buildColonySnapshots({ colonyStress: 0 } as any, [faction({ factionSize: 150 })], [], [sess(1, 50), sess(2, -500)] as any,
      { cascadeRulesJson: '[]', stressTriggersJson: '[]', formulasJson: '' } as any, [], [], []);
    expect(snaps.map(s => s.factionSize['f'])).toEqual([200, 0]);
    expect(P(projectFactions([faction({ factionSize: 150 })], snaps[0])[0]).people.score).toBe(10);
  });
});

describe('Holdings and Mandate = stars of controlled Assets, by Role', () => {
  it('each Role counts toward one channel: Operational, Strategic, Covert → Holdings; Symbolic, Mandate → Mandate', () => {
    expect(ASSET_ROLE_CHANNEL).toEqual({ Operational: 'holdings', Strategic: 'holdings', Covert: 'holdings', Symbolic: 'mandate', Mandate: 'mandate' });
    for (const role of ['Operational', 'Strategic', 'Covert', 'Symbolic', 'Mandate'] as AssetRole[]) {
      const b = P(faction(), [], [asset(role, 4)]);
      expect([b.holdings.score, b.mandate.score]).toEqual(ASSET_ROLE_CHANNEL[role] === 'holdings' ? [4, 0] : [0, 4]);
    }
  });
  it('the channel comes from Role, never from the descriptive Type', () => {
    for (const type of ['Infrastructure', 'Artifact', 'Resource', 'Intelligence'] as const)
      expect(P(faction(), [], [asset('Symbolic', 5, { type })]).mandate.score).toBe(5);
  });
  it('the brief\'s example: 4 + 4 + 3 + 5 = 16 qualifies; losing the 3-star Asset (13) does not, and Power drops by one', () => {
    const a = [asset('Operational', 4), asset('Operational', 4), asset('Operational', 3), asset('Operational', 5)];
    const before = P(faction(), [], a), after = P(faction(), [], a.filter(x => x.tier !== 3));
    expect([before.holdings.score, before.holdings.qualifies, before.power]).toEqual([16, true, 1]);
    expect([after.holdings.score, after.holdings.qualifies, after.power]).toEqual([13, false, 0]);
  });
  it('boundaries: Holdings 14 / 15 / 16 and Mandate 4 / 5 / 6', () => {
    expect([14, 15, 16].map(n => P(faction(), [], [asset('Covert', 5), asset('Strategic', 5), asset('Operational', n - 10)]).holdings.qualifies)).toEqual([false, true, true]);
    expect([4, 5, 6].map(n => P(faction(), [], n > 5 ? [asset('Mandate', 5), asset('Symbolic', 1)] : [asset('Mandate', n)]).mandate.qualifies)).toEqual([false, true, true]);
    expect(P(faction(), [], [asset('Symbolic', 3), asset('Mandate', 2)]).mandate.qualifies).toBe(true);   // the brief's examples
    expect(P(faction(), [], [asset('Symbolic', 4)]).mandate.qualifies).toBe(false);
  });
  it('only controlled Assets count; a transfer moves the stars from one faction to the other', () => {
    const a = asset('Strategic', 5), other = faction({ id: 'g' });
    expect([P(faction(), [], [a]).holdings.score, P(other, [], [a]).holdings.score]).toEqual([5, 0]);
    const moved = { ...a, controllingFactionId: 'g' };
    expect([P(faction(), [], [moved]).holdings.score, P(other, [], [moved]).holdings.score]).toEqual([0, 5]);
  });
  it('status (ruling): a Destroyed Asset counts nothing; Damaged and Contested count in full; restoring Destroyed restores the stars', () => {
    expect((['Stable', 'Contested', 'Damaged', 'Destroyed'] as AssetStatus[]).map(status => assetStars({ tier: 4, status }))).toEqual([4, 4, 4, 0]);
    const a = asset('Mandate', 5);
    expect([a, { ...a, status: 'Damaged' as AssetStatus }, { ...a, status: 'Destroyed' as AssetStatus }, a].map(x => P(faction(), [], [x]).mandate.qualifies))
      .toEqual([true, true, false, true]);
  });
});

describe('Power = qualifying channels, 0–3', () => {
  const holdings = [asset('Operational', 5), asset('Operational', 5), asset('Operational', 5)], mandate = [asset('Mandate', 5)];
  const cases: [boolean, boolean, boolean, number][] = [
    [false, false, false, 0], [true, false, false, 1], [false, true, false, 1], [false, false, true, 1],
    [true, true, false, 2], [true, false, true, 2], [false, true, true, 2], [true, true, true, 3]];
  for (const [p, h, m, power] of cases)
    it(`People ${p ? 'yes' : 'no'}, Holdings ${h ? 'yes' : 'no'}, Mandate ${m ? 'yes' : 'no'} → ${power}`, () => {
      const b = P(faction(p ? { factionSize: 200 } : {}), named(3), [...(h ? holdings : []), ...(m ? mandate : [])]);
      expect([b.people.qualifies, b.holdings.qualifies, b.mandate.qualifies, b.power]).toEqual([p, h, m, power]);
    });
  it('Influence, Momentum and the retired Power Modifier are not inputs', () => {
    const m = named(10);
    expect(P(faction({ momentum: 140, momentumTier: 2, powerModifier: 50, factionSize: 200 }), m.map(c => ({ ...c, influence: 0 }))).power)
      .toBe(P(faction({ momentum: -140, momentumTier: -2, factionSize: 200 }), m.map(c => ({ ...c, influence: 100 }))).power);
  });
  it('leaderCapable: alive and still a member', () => {
    expect(leaderCapable(faction({ leaderId: 'm0' }), named(2))).toBe(true);
    expect(leaderCapable(faction({ leaderId: 'gone' }), named(2))).toBe(false);
  });
});

describe('Power follows Events into the next Faction Phase (no Power Effect anywhere)', () => {
  it('a leader killed, unnamed members recruited, and an Asset taken: each Faction Phase uses the recalculated Power', () => {
    const fac = faction({ leaderId: 'm0', factionSize: 100 });
    const fx = (id: string, targetType: string, targetId: string, property: string, x: object) => ({ id, eventId: 'e', targetType, targetId, property, delta: 0, ...x });
    const sess = (n: number, effects: any[]) => ({ id: `s${n}`, number: n, act: 2, events: [{ id: `e${n}`, sessionId: `s${n}`, title: 'x', sortOrder: 0, effects }] });
    const sessions = [sess(1, [fx('k', 'character', 'm0', 'state', { value: 'Dead' })]),                    // People 5 + 5 = 10 → 5
                      sess(2, [fx('r', 'faction', 'f', 'factionSize', { delta: 100 })]),                     // size 100 → 200: 10
                      sess(3, [fx('t', 'asset', 'vault', 'controllingFactionId', { value: 'f' })]),         // Mandate 0 → 5
                      sess(4, [])] as any;
    const w = { colonyState: { colonyStress: 0 } as any, rules: { cascadeRulesJson: '[]', stressTriggersJson: '[]', formulasJson: '' } as any,
      locations: [], goals: [], factions: [fac, faction({ id: 'g', name: 'G' })], characters: named(5),
      assets: [asset('Mandate', 5, { id: 'vault', controllingFactionId: 'g' })], sessions };
    const power = (sid: string) => buildFactionPhaseInputs(w, sid, 1).inputs.factions.find(f => f.id === 'f')!.power;
    expect(['s1', 's2', 's3', 's4'].map(power)).toEqual([1, 0, 1, 2]);
  });
});

describe('the 2026-10-14 fixture under §18.7 (Design-mode fixture, recalculated; not a balancing target)', () => {
  const fx: any = fixtureJson;
  it('replays and gives every operating faction a Power from 0 to 3', () => {
    const snaps = buildColonySnapshots(fx.colonyState, fx.factions, fx.characters, fx.sessions, fx.rules, fx.assets, fx.goals ?? [], fx.locations ?? []);
    const snap = snaps.at(-1)!;
    for (const f of projectFactions(fx.factions.filter((x: Faction) => x.type === 'Faction'), snap))
      expect([0, 1, 2, 3]).toContain(computePowerBreakdown(f, projectCharacters(fx.characters, snap), projectAssets(fx.assets, snap), F).power);
  });
});
