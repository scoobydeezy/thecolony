import { describe, it, expect, beforeEach } from 'vitest';
import { FactionInfluenceService } from './faction-influence.service';
import { Character, Faction } from '../models/types';

const svc = new FactionInfluenceService();

function makeChar(influence: number): Character {
  return {
    id: crypto.randomUUID(), name: 'Test', characterType: 'NPC',
    values: { truth: 1/3, stability: 1/3, agency: 1/3 },
    conviction: 50, pressure: 0, influence, impressionable: 50
  };
}

function makeFaction(baseInfluence: number, momentum: number): Faction {
  return {
    id: 'f1', name: 'Test Faction', represents: '', type: 'Faction',
    coreTenet: '', certainOf: '', rightAbout: '', afraidOf: '', wrongAbout: '',
    singleSentence: '', values: { truth: 1/3, stability: 1/3, agency: 1/3 },
    active: true, sortOrder: 0, baseInfluence, momentum
  };
}

describe('FactionInfluenceService', () => {

  describe('calculateCharacterInfluence', () => {
    it('returns 0 for empty member list', () => {
      expect(svc.calculateCharacterInfluence([])).toBe(0);
    });

    it('single member: avg and max are the same', () => {
      const result = svc.calculateCharacterInfluence([makeChar(80)]);
      expect(result).toBeCloseTo(80 * 0.6 + 80 * 0.4);
    });

    it('avg=20, max=100 scenario from spec', () => {
      // Four members at 0 influence + one at 100 → avg=20
      const members = [makeChar(0), makeChar(0), makeChar(0), makeChar(0), makeChar(100)];
      const avg = 20, max = 100;
      expect(svc.calculateCharacterInfluence(members)).toBeCloseTo(avg * 0.6 + max * 0.4);
    });

    it('avg=60, max=60 scenario from spec', () => {
      const members = [makeChar(60), makeChar(60), makeChar(60)];
      expect(svc.calculateCharacterInfluence(members)).toBeCloseTo(60 * 0.6 + 60 * 0.4);
    });
  });

  describe('calculateNormalizedMomentum', () => {
    it('-100 → 0', () => expect(svc.calculateNormalizedMomentum(-100)).toBe(0));
    it('0 → 50',   () => expect(svc.calculateNormalizedMomentum(0)).toBe(50));
    it('+100 → 100', () => expect(svc.calculateNormalizedMomentum(100)).toBe(100));
  });

  describe('calculateTotalInfluence', () => {
    it('known values produce correct rounded total', () => {
      // baseInfluence=80, charInfluence=68, momentum=+20 → normalizedMomentum=60
      // 80*0.45 + 68*0.35 + 60*0.20 = 36 + 23.8 + 12 = 71.8 → 72
      const faction = makeFaction(80, 20);
      const members = [makeChar(68), makeChar(68)]; // avg=68, max=68 → charInfluence=68
      expect(svc.calculateTotalInfluence(faction, members)).toBe(72);
    });

    it('zero members uses only baseInfluence and momentum', () => {
      const faction = makeFaction(60, 0);
      // charInfluence=0, normalizedMomentum=50
      // 60*0.45 + 0*0.35 + 50*0.20 = 27 + 0 + 10 = 37
      expect(svc.calculateTotalInfluence(faction, [])).toBe(37);
    });

    it('result is clamped to 0-100', () => {
      const faction = makeFaction(100, 100);
      const members = [makeChar(100)];
      expect(svc.calculateTotalInfluence(faction, members)).toBeLessThanOrEqual(100);
    });
  });

  describe('topMembers', () => {
    it('returns top 5 by influence descending', () => {
      const members = [20, 90, 55, 10, 100, 75, 30].map(makeChar);
      const top = svc.topMembers(members, 5);
      expect(top.map(c => c.influence)).toEqual([100, 90, 75, 55, 30]);
    });

    it('returns fewer than count when list is shorter', () => {
      const members = [makeChar(50), makeChar(80)];
      expect(svc.topMembers(members, 5)).toHaveLength(2);
    });
  });
});
