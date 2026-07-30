import { describe, it, expect } from 'vitest';
import { FactionInfluenceService } from './faction-influence.service';
import { Character, Faction, DEFAULT_FORMULAS } from '../models/types';

const svc = new FactionInfluenceService();

function makeChar(influence: number): Character {
  return {
    id: crypto.randomUUID(), name: 'Test', characterType: 'NPC',
    values: { a: 1/3, b: 1/3, c: 1/3 },
    conviction: 50, pressure: 0, influence, impressionable: 50
  };
}

function makeFaction(momentum: number, baseLegitimacy = 50, powerModifier = 0, leaderId?: string): Faction {
  return {
    id: 'f1', name: 'Test Faction', represents: '', type: 'Faction',
    coreTenet: '', certainOf: '', rightAbout: '', afraidOf: '', wrongAbout: '',
    values: { a: 1/3, b: 1/3, c: 1/3 },
    active: true, sortOrder: 0, momentum, baseLegitimacy, powerModifier, leaderId
  };
}

describe('FactionInfluenceService', () => {

  describe('calculateCharacterStrength', () => {
    it('returns 0 for empty member list', () => {
      expect(svc.calculateCharacterStrength([])).toBe(0);
    });

    it('single member without leader: leaderless penalty applied', () => {
      const member = makeChar(80);
      const result = svc.calculateCharacterStrength([member]);
      // No leaderId → leaderless penalty (×0.75)
      expect(result).toBeCloseTo((80 * 0.6 + 80 * 0.4) * 0.75);
    });

    it('single member with leaderId matching: no penalty', () => {
      const leader = makeChar(80);
      const result = svc.calculateCharacterStrength([leader], DEFAULT_FORMULAS, 0, leader.id);
      expect(result).toBeCloseTo(80 * 0.6 + 80 * 0.4);
    });

    it('avg=20, max=100 with leader', () => {
      const leader = makeChar(100);
      const members = [makeChar(0), makeChar(0), makeChar(0), makeChar(0), leader];
      const avg = 20, max = 100;
      expect(svc.calculateCharacterStrength(members, DEFAULT_FORMULAS, 0, leader.id)).toBeCloseTo(avg * 0.6 + max * 0.4);
    });
  });

  describe('calculateCharacterInfluence (backwards-compat wrapper)', () => {
    it('returns 0 for empty member list', () => {
      expect(svc.calculateCharacterInfluence([])).toBe(0);
    });
  });

  describe('calculateNormalizedMomentum', () => {
    it('-100 → 0',   () => expect(svc.calculateNormalizedMomentum(-100)).toBe(0));
    it('0 → 50',     () => expect(svc.calculateNormalizedMomentum(0)).toBe(50));
    it('+100 → 100', () => expect(svc.calculateNormalizedMomentum(100)).toBe(100));
  });

  describe('calculateOrganization (via calculateTotalInfluence)', () => {
    it('no assets, leader present — charStrength×0.40 + momentum×0.20', () => {
      // charStrength: avg=68, max=68, leader present → no penalty → 68
      // normalizedMomentum(20) = 60
      // 68×0.40 + 0×0.40 + 60×0.20 = 27.2 + 0 + 12 = 39.2 → 39
      const leader = makeChar(68);
      const members = [leader, makeChar(68)];
      const faction = makeFaction(20, 50, 0, leader.id);
      expect(svc.calculateTotalInfluence(faction, members)).toBe(39);
    });

    it('zero members uses only momentum (charStrength=0)', () => {
      // normalizedMomentum(0) = 50; 0×0.40 + 0×0.40 + 50×0.20 = 10
      const faction = makeFaction(0);
      expect(svc.calculateTotalInfluence(faction, [])).toBe(10);
    });

    it('result is clamped to 0-100', () => {
      const leader = makeChar(100);
      const faction = makeFaction(100, 50, 0, leader.id);
      expect(svc.calculateTotalInfluence(faction, [leader])).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateEffectivePower', () => {
    it('powerModifier is added to final result', () => {
      const faction = makeFaction(0, 50, 10);
      const base = svc.calculateEffectivePower({ ...faction, powerModifier: 0 }, [], DEFAULT_FORMULAS);
      const withMod = svc.calculateEffectivePower(faction, [], DEFAULT_FORMULAS);
      expect(withMod).toBe(base + 10);
    });
  });

  describe('topMembers', () => {
    it('returns top 5 by influence descending', () => {
      const members = [20, 90, 55, 10, 100, 75, 30].map(i => makeChar(i));
      const top = svc.topMembers(members, 5);
      expect(top.map(c => c.influence)).toEqual([100, 90, 75, 55, 30]);
    });

    it('returns fewer than count when list is shorter', () => {
      const members = [makeChar(50), makeChar(80)];
      expect(svc.topMembers(members, 5)).toHaveLength(2);
    });
  });
});
