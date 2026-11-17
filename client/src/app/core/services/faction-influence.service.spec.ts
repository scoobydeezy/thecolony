import { describe, it, expect } from 'vitest';
import { FactionInfluenceService } from './faction-influence.service';
import { computePowerBreakdown } from '../sim/power';
import { Character, Faction, DEFAULT_FORMULAS } from '../models/types';

// M2: the service is a thin wrapper; the Power rules themselves are tested in core/sim/power.spec.ts.
const svc = new FactionInfluenceService();
const ch = (id: string, influence: number): Character => ({
  id, name: id, characterType: 'NPC', state: 'Alive', factionId: 'f', values: { a: 1/3, b: 1/3, c: 1/3 },
  conviction: 50, pressure: 0, influence, impressionable: 50,
});
const faction: Faction = {
  id: 'f', name: 'F', represents: '', type: 'Faction', coreTenet: '', certainOf: '', rightAbout: '', afraidOf: '', wrongAbout: '',
  values: { a: 1/3, b: 1/3, c: 1/3 }, active: true, sortOrder: 0, momentum: 0, powerModifier: 0, factionSize: 0,
};

describe('FactionInfluenceService', () => {
  it('breakdown() delegates to the single Power implementation', () => {
    const members = [ch('a', 90), ch('b', 70), ch('c', 40)];
    expect(svc.breakdown(faction, members, [], DEFAULT_FORMULAS)).toEqual(computePowerBreakdown(faction, members, [], DEFAULT_FORMULAS));
  });

  it('topMembers returns the most influential first', () => {
    expect(svc.topMembers([ch('a', 10), ch('b', 90), ch('c', 50)], 2).map(c => c.id)).toEqual(['b', 'c']);
  });
});
