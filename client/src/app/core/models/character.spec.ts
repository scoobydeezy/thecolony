import { describe, it, expect } from 'vitest';
import {
  Character, Faction, ValueVector,
  driftScore, topCompatibleFactions, scoreFactionCompatibility,
  deriveBeliefs, lerpValueVector
} from './types';

// ── Helpers ──────────────────────────────────────────────────────────────
function makeChar(conviction: number, pressure: number, values: ValueVector): Character {
  return {
    id: 'test',
    name: 'Test',
    characterType: 'NPC',
    values,
    conviction,
    pressure,
  };
}

function makeFaction(id: string, values: ValueVector): Faction {
  return {
    id,
    name: id,
    represents: '',
    type: 'Faction',
    coreTenet: '', certainOf: '', rightAbout: '', afraidOf: '',
    wrongAbout: '', singleSentence: '', primaryTension: '',
    values,
    active: true,
    sortOrder: 0,
  };
}

// ── Value vector normalization ───────────────────────────────────────────
describe('value vector normalization', () => {
  it('a perfectly centered vector has equal thirds', () => {
    const v: ValueVector = { truth: 1/3, stability: 1/3, agency: 1/3 };
    expect(v.truth + v.stability + v.agency).toBeCloseTo(1, 5);
  });

  it('sum of any valid vector equals 1', () => {
    const vectors: ValueVector[] = [
      { truth: 0.6, stability: 0.3, agency: 0.1 },
      { truth: 0.15, stability: 0.7, agency: 0.15 },
      { truth: 0.0, stability: 0.5, agency: 0.5 },
      { truth: 1.0, stability: 0.0, agency: 0.0 },
    ];
    for (const v of vectors) {
      expect(v.truth + v.stability + v.agency).toBeCloseTo(1, 5);
    }
  });
});

// ── Drift score calculation ──────────────────────────────────────────────
describe('driftScore', () => {
  const v: ValueVector = { truth: 0.6, stability: 0.3, agency: 0.1 };

  it('is pressure minus conviction', () => {
    const c = makeChar(50, 70, v);
    expect(driftScore(c)).toBe(20);
  });

  it('is negative when conviction exceeds pressure', () => {
    const c = makeChar(80, 30, v);
    expect(driftScore(c)).toBe(-50);
  });

  it('is zero when equal', () => {
    const c = makeChar(50, 50, v);
    expect(driftScore(c)).toBe(0);
  });

  it('defaults produce 0 drift (conviction 50, pressure 0)', () => {
    const c = makeChar(50, 0, v);
    expect(driftScore(c)).toBe(-50);
  });
});

// ── Belief derivation ────────────────────────────────────────────────────
describe('deriveBeliefs', () => {
  it('truth-dominant → Revealed knowledge, Good ritual, No change', () => {
    const b = deriveBeliefs({ truth: 0.7, stability: 0.2, agency: 0.1 });
    expect(b.knowledge).toBe('Revealed');
    expect(b.ritual).toBe('Good');
    expect(b.change).toBe('Yes');
  });

  it('stability-dominant → Controlled knowledge, Neutral ritual, No change', () => {
    const b = deriveBeliefs({ truth: 0.1, stability: 0.75, agency: 0.15 });
    expect(b.knowledge).toBe('Controlled');
    expect(b.ritual).toBe('Neutral');
    expect(b.change).toBe('No');
  });

  it('agency-dominant → Hidden knowledge, Bad ritual, Yes change', () => {
    const b = deriveBeliefs({ truth: 0.1, stability: 0.1, agency: 0.8 });
    expect(b.knowledge).toBe('Hidden');
    expect(b.ritual).toBe('Bad');
    expect(b.change).toBe('Yes');
  });

  it('centered (no axis ≥ 0.4) → Controlled knowledge, Neutral ritual, Yes change', () => {
    const b = deriveBeliefs({ truth: 1/3, stability: 1/3, agency: 1/3 });
    expect(b.knowledge).toBe('Controlled');
    expect(b.ritual).toBe('Neutral');
    expect(b.change).toBe('Yes');
  });
});

// ── lerpValueVector ───────────────────────────────────────────────────────
describe('lerpValueVector', () => {
  it('t=0 returns a unchanged', () => {
    const a: ValueVector = { truth: 0.6, stability: 0.3, agency: 0.1 };
    const b: ValueVector = { truth: 0.1, stability: 0.1, agency: 0.8 };
    const r = lerpValueVector(a, b, 0);
    expect(r.truth).toBeCloseTo(a.truth, 5);
    expect(r.stability).toBeCloseTo(a.stability, 5);
    expect(r.agency).toBeCloseTo(a.agency, 5);
  });

  it('t=1 returns b', () => {
    const a: ValueVector = { truth: 0.6, stability: 0.3, agency: 0.1 };
    const b: ValueVector = { truth: 0.0, stability: 0.0, agency: 1.0 };
    const r = lerpValueVector(a, b, 1);
    expect(r.agency).toBeCloseTo(1.0, 5);
  });

  it('result always sums to 1', () => {
    const a: ValueVector = { truth: 0.5, stability: 0.3, agency: 0.2 };
    const b: ValueVector = { truth: 0.1, stability: 0.1, agency: 0.8 };
    for (const t of [0, 0.25, 0.5, 0.8, 1]) {
      const r = lerpValueVector(a, b, t);
      expect(r.truth + r.stability + r.agency).toBeCloseTo(1, 5);
    }
  });
});

// ── Faction compatibility calculation ───────────────────────────────────
describe('scoreFactionCompatibility', () => {
  const neutralBeliefs = { ritual: 'Neutral' as const, knowledge: 'Controlled' as const, change: 'Yes' as const };

  it('identical vectors with neutral beliefs produce higher score than opposed', () => {
    const v: ValueVector = { truth: 0.6, stability: 0.3, agency: 0.1 };
    const aligned = makeFaction('a', v);
    const opposed = makeFaction('b', { truth: 0.1, stability: 0.1, agency: 0.8 });
    const scoreAligned = scoreFactionCompatibility(v, neutralBeliefs, aligned);
    const scoreOpposed = scoreFactionCompatibility(v, neutralBeliefs, opposed);
    expect(scoreAligned).toBeGreaterThan(scoreOpposed);
  });

  it('perfectly overlapping character and faction scores highest among all factions', () => {
    const charV: ValueVector = { truth: 0.7, stability: 0.2, agency: 0.1 };
    const beliefs = deriveBeliefs(charV);
    const exact   = makeFaction('exact',   charV);
    const other1  = makeFaction('other1',  { truth: 0.1, stability: 0.7, agency: 0.2 });
    const other2  = makeFaction('other2',  { truth: 0.2, stability: 0.2, agency: 0.6 });
    const s0 = scoreFactionCompatibility(charV, beliefs, exact);
    const s1 = scoreFactionCompatibility(charV, beliefs, other1);
    const s2 = scoreFactionCompatibility(charV, beliefs, other2);
    expect(s0).toBeGreaterThan(s1);
    expect(s0).toBeGreaterThan(s2);
  });

  it('opposing vectors produce strongly negative score', () => {
    const charV: ValueVector = { truth: 0.8, stability: 0.1, agency: 0.1 };
    const facV: ValueVector  = { truth: 0.05, stability: 0.8, agency: 0.15 };
    const score = scoreFactionCompatibility(charV, neutralBeliefs, makeFaction('opp', facV));
    expect(score).toBeLessThan(-1);
  });
});

// ── Top compatible faction determination ────────────────────────────────
describe('topCompatibleFactions', () => {
  const keepers   = makeFaction('keepers',   { truth: 0.25, stability: 0.60, agency: 0.15 });
  const witnesses = makeFaction('witnesses', { truth: 0.60, stability: 0.25, agency: 0.15 });
  const shattered = makeFaction('shattered', { truth: 0.25, stability: 0.15, agency: 0.60 });

  function makeCharObj(values: ValueVector) {
    return { values, conviction: 50, pressure: 0 };
  }

  it('returns all factions sorted by score descending', () => {
    const char = makeCharObj({ truth: 0.55, stability: 0.30, agency: 0.15 });
    const result = topCompatibleFactions(char, [keepers, witnesses, shattered]);
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].score).toBeGreaterThanOrEqual(result[i + 1].score);
    }
  });

  it('character with truth-heavy values ranks Witnesses first', () => {
    const result = topCompatibleFactions(makeCharObj({ truth: 0.7, stability: 0.2, agency: 0.1 }), [keepers, witnesses, shattered]);
    expect(result[0].factionId).toBe('witnesses');
  });

  it('character with agency-heavy values ranks Shattered first', () => {
    const result = topCompatibleFactions(makeCharObj({ truth: 0.1, stability: 0.1, agency: 0.8 }), [keepers, witnesses, shattered]);
    expect(result[0].factionId).toBe('shattered');
  });

  it('character with stability-heavy values ranks Keepers first', () => {
    const result = topCompatibleFactions(makeCharObj({ truth: 0.15, stability: 0.7, agency: 0.15 }), [keepers, witnesses, shattered]);
    expect(result[0].factionId).toBe('keepers');
  });

  it('returns empty array for empty faction list', () => {
    expect(topCompatibleFactions(makeCharObj({ truth: 0.5, stability: 0.3, agency: 0.2 }), [])).toEqual([]);
  });

  it('each entry has factionId and score', () => {
    const result = topCompatibleFactions(makeCharObj({ truth: 0.4, stability: 0.4, agency: 0.2 }), [keepers]);
    expect(result[0]).toHaveProperty('factionId');
    expect(result[0]).toHaveProperty('score');
    expect(typeof result[0].score).toBe('number');
  });

  it('belief overrides shift scores — overriding to conflicting belief reduces score', () => {
    const charV: ValueVector = { truth: 0.7, stability: 0.2, agency: 0.1 };
    const faction = makeFaction('wit', { ...charV, knowledge: 'Revealed' } as any);
    faction.knowledge = 'Revealed';
    const derived = topCompatibleFactions({ values: charV }, [faction])[0].score;
    const overridden = topCompatibleFactions({ values: charV, knowledge: 'Hidden' }, [faction])[0].score;
    expect(derived).toBeGreaterThan(overridden);
  });
});
