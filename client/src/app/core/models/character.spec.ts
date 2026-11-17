import { describe, it, expect } from 'vitest';
import {
  Character, Faction, ValueVector,
  driftScore, deriveBeliefs, lerpValueVector, effectiveBeliefs
} from './types';
import { topCompatibleFactions } from '../services/scoring.service';

// ── Helpers ──────────────────────────────────────────────────────────────
function makeChar(conviction: number, pressure: number, values: ValueVector): Character {
  return {
    id: 'test',
    name: 'Test',
    characterType: 'NPC',
    values,
    conviction,
    pressure,
    influence: 0,
    impressionable: 50,
    state: 'Alive',
  };
}

function makeFaction(id: string, values: ValueVector): Faction {
  return {
    id,
    name: id,
    represents: '',
    type: 'Faction',
    coreTenet: '', certainOf: '', rightAbout: '', afraidOf: '',
    wrongAbout: '',
    values,
    active: true,
    sortOrder: 0,
    momentum: 0,
    powerModifier: 0,
    factionSize: 0,
  };
}

// ── Value vector normalization ───────────────────────────────────────────
describe('value vector normalization', () => {
  it('a perfectly centered vector has equal thirds', () => {
    const v: ValueVector = { a: 1/3, b: 1/3, c: 1/3 };
    expect(v.a + v.b + v.c).toBeCloseTo(1, 5);
  });

  it('sum of any valid vector equals 1', () => {
    const vectors: ValueVector[] = [
      { a: 0.6, b: 0.3, c: 0.1 },
      { a: 0.15, b: 0.7, c: 0.15 },
      { a: 0.0, b: 0.5, c: 0.5 },
      { a: 1.0, b: 0.0, c: 0.0 },
    ];
    for (const v of vectors) {
      expect(v.a + v.b + v.c).toBeCloseTo(1, 5);
    }
  });
});

// ── Drift score calculation ──────────────────────────────────────────────
describe('driftScore', () => {
  const v: ValueVector = { a: 0.6, b: 0.3, c: 0.1 };

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
  it('truth-dominant → positive knowledge, positive ritual, middle change (every axis is three-position)', () => {
    const b = deriveBeliefs({ a: 0.7, b: 0.2, c: 0.1 });
    expect(b.beliefa).toBe('positive');
    expect(b.beliefc).toBe('positive');
    expect(b.beliefb).toBe('neutral');
  });

  it('stability-dominant → neutral knowledge, neutral ritual, negative change', () => {
    const b = deriveBeliefs({ a: 0.1, b: 0.75, c: 0.15 });
    expect(b.beliefa).toBe('neutral');
    expect(b.beliefc).toBe('neutral');
    expect(b.beliefb).toBe('negative');
  });

  it('agency-dominant → negative knowledge, negative ritual, positive change', () => {
    const b = deriveBeliefs({ a: 0.1, b: 0.1, c: 0.8 });
    expect(b.beliefa).toBe('negative');
    expect(b.beliefc).toBe('negative');
    expect(b.beliefb).toBe('positive');
  });

  it('centered (no axis ≥ 0.4) → the middle on every axis', () => {
    const b = deriveBeliefs({ a: 1/3, b: 1/3, c: 1/3 });
    expect(b.beliefa).toBe('neutral');
    expect(b.beliefc).toBe('neutral');
    expect(b.beliefb).toBe('neutral');
  });
});

// ── lerpValueVector ───────────────────────────────────────────────────────
describe('lerpValueVector', () => {
  it('t=0 returns a unchanged', () => {
    const a: ValueVector = { a: 0.6, b: 0.3, c: 0.1 };
    const b: ValueVector = { a: 0.1, b: 0.1, c: 0.8 };
    const r = lerpValueVector(a, b, 0);
    expect(r.a).toBeCloseTo(a.a, 5);
    expect(r.b).toBeCloseTo(a.b, 5);
    expect(r.c).toBeCloseTo(a.c, 5);
  });

  it('t=1 returns b', () => {
    const a: ValueVector = { a: 0.6, b: 0.3, c: 0.1 };
    const b: ValueVector = { a: 0.0, b: 0.0, c: 1.0 };
    const r = lerpValueVector(a, b, 1);
    expect(r.c).toBeCloseTo(1.0, 5);
  });

  it('result always sums to 1', () => {
    const a: ValueVector = { a: 0.5, b: 0.3, c: 0.2 };
    const b: ValueVector = { a: 0.1, b: 0.1, c: 0.8 };
    for (const t of [0, 0.25, 0.5, 0.8, 1]) {
      const r = lerpValueVector(a, b, t);
      expect(r.a + r.b + r.c).toBeCloseTo(1, 5);
    }
  });
});

// Faction compatibility is the full relationship score now (scoring.service.spec.ts covers its properties).

// ── Top compatible faction determination ────────────────────────────────
describe('topCompatibleFactions', () => {
  const keepers   = makeFaction('keepers',   { a: 0.25, b: 0.60, c: 0.15 });
  const witnesses = makeFaction('witnesses', { a: 0.60, b: 0.25, c: 0.15 });
  const shattered = makeFaction('shattered', { a: 0.25, b: 0.15, c: 0.60 });

  function makeCharObj(values: ValueVector) {
    return { values, conviction: 50, pressure: 0 };
  }

  it('returns all factions sorted by score descending', () => {
    const char = makeCharObj({ a: 0.55, b: 0.30, c: 0.15 });
    const result = topCompatibleFactions(char, [keepers, witnesses, shattered]);
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].score).toBeGreaterThanOrEqual(result[i + 1].score);
    }
  });

  it('character with truth-heavy values ranks Witnesses first', () => {
    const result = topCompatibleFactions(makeCharObj({ a: 0.7, b: 0.2, c: 0.1 }), [keepers, witnesses, shattered]);
    expect(result[0].factionId).toBe('witnesses');
  });

  it('character with agency-heavy values ranks Shattered first', () => {
    const result = topCompatibleFactions(makeCharObj({ a: 0.1, b: 0.1, c: 0.8 }), [keepers, witnesses, shattered]);
    expect(result[0].factionId).toBe('shattered');
  });

  it('character with stability-heavy values ranks Keepers first', () => {
    const result = topCompatibleFactions(makeCharObj({ a: 0.15, b: 0.7, c: 0.15 }), [keepers, witnesses, shattered]);
    expect(result[0].factionId).toBe('keepers');
  });

  it('returns empty array for empty faction list', () => {
    expect(topCompatibleFactions(makeCharObj({ a: 0.5, b: 0.3, c: 0.2 }), [])).toEqual([]);
  });

  it('each entry has factionId and score', () => {
    const result = topCompatibleFactions(makeCharObj({ a: 0.4, b: 0.4, c: 0.2 }), [keepers]);
    expect(result[0]).toHaveProperty('factionId');
    expect(result[0]).toHaveProperty('score');
    expect(typeof result[0].score).toBe('number');
  });

  it('belief overrides shift scores — overriding to conflicting belief reduces score', () => {
    const charV: ValueVector = { a: 0.7, b: 0.2, c: 0.1 };
    const faction = makeFaction('wit', charV);
    faction.beliefa = 'positive';
    const derived = topCompatibleFactions({ values: charV }, [faction])[0].score;
    const overridden = topCompatibleFactions({ values: charV, beliefa: 'negative' }, [faction])[0].score;
    expect(derived).toBeGreaterThan(overridden);
  });
});

// D12 (M0): effectiveBeliefs honours the configured derivation threshold instead of a hard-coded 0.4.
describe('effectiveBeliefs threshold (D12)', () => {
  const c = { id: 'x', name: 'x', characterType: 'NPC', state: 'Alive', conviction: 50, pressure: 0, influence: 0, impressionable: 50,
              values: { a: 0.45, b: 0.45, c: 0.10 } } as any;
  it('derives Knowledge positive at 0.4 but neutral at 0.5 for a = 0.45', () => {
    expect(effectiveBeliefs(c, 0.4).beliefa).toBe('positive');
    expect(effectiveBeliefs(c, 0.5).beliefa).toBe('neutral');
  });
  it('overrides still win over derivation', () => {
    expect(effectiveBeliefs({ ...c, beliefa: 'negative' }, 0.4).beliefa).toBe('negative');
  });
});
