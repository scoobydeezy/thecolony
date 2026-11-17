import { describe, it, expect } from 'vitest';
import { scoreRelationship, ScoringActor, DEFAULT_RULES, beliefAgreement, beliefWeights, valueScore,
         topCompatibleFactions, mostAlignedFactions, mostOpposedFactions } from './scoring.service';
import { ValueVector, valueDistance, valueSimilarity, valueOpposition, deriveBeliefs, BeliefPosition, Faction } from '../models/types';

// D4-3 rewrite (SCORING-AUDIT.md). The scorer is tested by structural properties over the whole ternary, not by
// the scores of particular factions, so the constants can be calibrated without rewriting these tests.

const grid: ValueVector[] = [];
for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10 - i; j++) grid.push({ a: i / 10, b: j / 10, c: (10 - i - j) / 10 });
const actor = (values: ValueVector, b: Partial<ScoringActor> = {}): ScoringActor => ({ id: 'x', values, ...b });
const noBeliefs = (s: ValueVector, t: ValueVector, stress = 0, rules = DEFAULT_RULES) =>
  scoreRelationship(actor(s), actor(t), stress, 0, rules);
const EPS = 1e-9;

describe('value geometry', () => {
  it('distance is 0 for identical positions and 1 for opposite corners', () => {
    expect(valueDistance({ a: 0.2, b: 0.3, c: 0.5 }, { a: 0.2, b: 0.3, c: 0.5 })).toBe(0);
    expect(valueDistance({ a: 1, b: 0, c: 0 }, { a: 0, b: 1, c: 0 })).toBe(1);
  });
  it('similarity is +1 for every identical position, including the centre', () => {
    for (const p of grid) expect(valueSimilarity(p, p)).toBeCloseTo(1, 12);
  });
  it('opposition is 0 against an identical position and asymmetric otherwise', () => {
    const zealot = { a: 1, b: 0, c: 0 }, centre = { a: 1 / 3, b: 1 / 3, c: 1 / 3 };
    for (const p of grid) expect(valueOpposition(p, p)).toBe(0);
    expect(valueOpposition(zealot, centre)).toBeCloseTo(2 / 3, 9);   // purists resent the lukewarm…
    expect(valueOpposition(centre, zealot)).toBeCloseTo(2 / 9, 9);   // …more than the reverse
  });
});

describe('value score: structural properties on the 0.1 ternary grid', () => {
  it('every position\'s best Value match is its identical twin (the old dot product failed this at 60 of 66)', () => {
    for (const s of grid) {
      const self = valueScore(s, s);
      for (const t of grid) expect(valueScore(s, t)).toBeLessThanOrEqual(self + EPS);
    }
  });
  it('a closer target never scores lower than a farther one (the old formula failed 10% of pairs)', () => {
    let violations = 0;
    for (const s of grid) for (const t1 of grid) for (const t2 of grid)
      if (valueDistance(s, t1) < valueDistance(s, t2) - EPS && valueScore(s, t1) < valueScore(s, t2) - EPS) violations++;
    expect(violations).toBe(0);
  });
  it('directionality is bounded by the opposition scale', () => {
    let max = 0;
    for (const s of grid) for (const t of grid) max = Math.max(max, Math.abs(valueScore(s, t) - valueScore(t, s)));
    expect(max).toBeGreaterThan(0);
    expect(max).toBeLessThanOrEqual(DEFAULT_RULES.valueOppositionScale + EPS);
  });
  it('the value sub-score in a breakdown matches valueScore', () => {
    const s = { a: 0.6, b: 0.3, c: 0.1 }, t = { a: 0.2, b: 0.2, c: 0.6 };
    const r = noBeliefs(s, t);
    expect(r.contributions.valueSubScore).toBeCloseTo(Math.round(valueScore(s, t) * 10) / 10, 9);
    expect(r.contributions.valueOpposition).toBeLessThanOrEqual(0);
  });
});

describe('beliefs', () => {
  const P: BeliefPosition[] = ['negative', 'neutral', 'positive'];
  it('three-position agreement: same > adjacent (middle vs pole) > opposite poles', () => {
    const m = DEFAULT_RULES;
    expect(beliefAgreement('neutral', 'neutral', m)).toBe(m.beliefMatch);       // a middle is a position
    expect(beliefAgreement('positive', 'positive', m)).toBe(m.beliefMatch);
    expect(beliefAgreement('neutral', 'positive', m)).toBe(m.beliefAdjacent);
    expect(beliefAgreement('negative', 'neutral', m)).toBe(m.beliefAdjacent);
    expect(beliefAgreement('negative', 'positive', m)).toBe(m.beliefConflict);
    expect(m.beliefMatch).toBeGreaterThan(0);
    expect(m.beliefAdjacent).toBeLessThan(0);
    expect(m.beliefConflict).toBeLessThan(m.beliefAdjacent);
    for (const a of P) for (const b of P) expect(beliefAgreement(a, b, m)).toBe(beliefAgreement(b, a, m));
  });
  it('an unset position contributes nothing', () => {
    expect(beliefAgreement(undefined, 'positive', DEFAULT_RULES)).toBe(0);
  });
  it('weights blend the source Value with equal weighting and always sum to 1', () => {
    for (const p of grid) for (const k of [0, 0.25, 0.5, 1]) {
      const w = beliefWeights(p, k);
      expect(w.a + w.b + w.c).toBeCloseTo(1, 12);
      expect(Math.min(w.a, w.b, w.c)).toBeGreaterThanOrEqual((1 - k) / 3 - EPS);   // the floor that keeps every belief live
    }
    expect(beliefWeights({ a: 0.9, b: 0.1, c: 0 }, 0)).toEqual({ a: 1 / 3, b: 1 / 3, c: 1 / 3 });
    expect(beliefWeights({ a: 0.9, b: 0.1, c: 0 }, 1)).toEqual({ a: 0.9, b: 0.1, c: 0 });
  });
  it('declared and derived positions score identically', () => {
    const v = { a: 0.45, b: 0.45, c: 0.1 };
    const d = deriveBeliefs(v, 0.5);
    const target = actor(v, { beliefa: 'neutral', beliefb: 'neutral', beliefc: 'neutral' });
    expect(scoreRelationship(actor(v, d), target, 0, 0).baseScore)
      .toBe(scoreRelationship(actor(v, { beliefa: 'neutral', beliefb: 'neutral', beliefc: 'neutral' }), target, 0, 0).baseScore);
  });
  it('the Change axis derives a middle like the other axes', () => {
    expect(deriveBeliefs({ a: 0.45, b: 0.45, c: 0.1 }, 0.5).beliefb).toBe('neutral');
    expect(deriveBeliefs({ a: 0.1, b: 0.6, c: 0.3 }, 0.5).beliefb).toBe('negative');
    expect(deriveBeliefs({ a: 0.1, b: 0.3, c: 0.6 }, 0.5).beliefb).toBe('positive');
  });
});

describe('full score: anchors (stress 0, derived beliefs)', () => {
  const th = 0.5;
  const full = (v: ValueVector) => actor(v, deriveBeliefs(v, th));
  const at = (s: ValueVector, t: ValueVector) => scoreRelationship(full(s), full(t), 0, 0);
  it('an identical twin is Aligned everywhere on the triangle', () => {
    for (const p of grid) expect(at(p, p).label).toBe('Aligned');
  });
  it('a purist views a moderate more harshly than the moderate views the purist', () => {
    const zealot = { a: 1, b: 0, c: 0 }, centre = { a: 0.34, b: 0.33, c: 0.33 };
    expect(at(zealot, centre).baseScore).toBeLessThan(at(centre, zealot).baseScore);
  });
  it('opposite corners are Hostile', () => {
    expect(at({ a: 1, b: 0, c: 0 }, { a: 0, b: 1, c: 0 }).label).toBe('Hostile');
  });
});

describe('composition, stress, bumps, sign switches', () => {
  const twin = actor({ a: 0.7, b: 0.2, c: 0.1 }, { beliefa: 'positive', beliefb: 'neutral', beliefc: 'positive' });
  const foe  = actor({ a: 0.1, b: 0.8, c: 0.1 }, { beliefa: 'negative', beliefb: 'negative', beliefc: 'negative' });
  it('positive scores grow and negative scores intensify under stress', () => {
    expect(scoreRelationship(twin, twin, 5, 0).stressedScore).toBeGreaterThan(scoreRelationship(twin, twin, 0, 0).stressedScore);
    expect(scoreRelationship(twin, foe, 5, 0).stressedScore).toBeLessThan(scoreRelationship(twin, foe, 0, 0).stressedScore);
  });
  it('a manual bump moves only the final score', () => {
    const r = scoreRelationship(twin, foe, 0, 3);
    expect(r.finalScore).toBeCloseTo(r.stressedScore + 3, 9);
    expect(r.stressedScore).toBe(scoreRelationship(twin, foe, 0, 0).stressedScore);
    expect(scoreRelationship(twin, foe, 0, -20).label).toBe('Hostile');
  });
  it('disabling a sign drops every contribution of that sign', () => {
    const pos = scoreRelationship(twin, foe, 0, 0, { ...DEFAULT_RULES, positiveEnabled: false }).contributions;
    const neg = scoreRelationship(twin, foe, 0, 0, { ...DEFAULT_RULES, negativeEnabled: false }).contributions;
    for (const v of [pos.beliefa, pos.beliefb, pos.beliefc, pos.valueSimilarity, pos.valueOpposition]) expect(v).toBeLessThanOrEqual(0);
    for (const v of [neg.beliefa, neg.beliefb, neg.beliefc, neg.valueSimilarity, neg.valueOpposition]) expect(v).toBeGreaterThanOrEqual(0);
  });
  it('sourceId and targetId are carried through', () => {
    const r = scoreRelationship({ ...twin, id: 's' }, { ...foe, id: 't' }, 0, 0);
    expect([r.sourceId, r.targetId]).toEqual(['s', 't']);
  });
});

describe('compatibility and aligned/opposed lists use the same formula', () => {
  const f = (id: string, values: ValueVector, b: Partial<Faction> = {}) =>
    ({ id, name: id, type: 'Faction', active: true, values, ...b }) as Faction;
  const order = f('order', { a: 0.12, b: 0.88, c: 0 }, { beliefa: 'negative', beliefb: 'negative', beliefc: 'positive' });
  const egress = f('egress', { a: 0.44, b: 0.34, c: 0.22 }, { beliefa: 'neutral', beliefb: 'negative', beliefc: 'neutral' });
  const shattered = f('shattered', { a: 0.23, b: 0, c: 0.77 }, { beliefa: 'positive', beliefb: 'positive', beliefc: 'negative' });
  it('a character close to a moderate faction ranks it first (the old dot product preferred the extremes)', () => {
    const r = topCompatibleFactions({ values: { a: 0.48, b: 0.42, c: 0.1 } }, [order, egress, shattered], 0.5);
    expect(r[0].factionId).toBe('egress');
    for (let i = 1; i < r.length; i++) expect(r[i - 1].score).toBeGreaterThanOrEqual(r[i].score);
  });
  it('compatibility equals the stress-0 relationship score', () => {
    const v = { a: 0.2, b: 0.7, c: 0.1 };
    const top = topCompatibleFactions({ values: v }, [order], 0.5)[0];
    expect(top.score).toBe(scoreRelationship(actor(v, deriveBeliefs(v, 0.5)), order, 0, 0).baseScore);
  });
  it('an override changes compatibility exactly as it changes the relationship score', () => {
    const v = { a: 0.2, b: 0.7, c: 0.1 };
    expect(topCompatibleFactions({ values: v, beliefc: 'negative' }, [order], 0.5)[0].score)
      .toBeLessThan(topCompatibleFactions({ values: v }, [order], 0.5)[0].score);
  });
  it('most aligned / most opposed rank by the directional Value score', () => {
    expect(mostAlignedFactions(egress, [order, egress, shattered], 1)[0].id).toBe(valueScore(egress.values, order.values) > valueScore(egress.values, shattered.values) ? 'order' : 'shattered');
    expect(mostOpposedFactions(order, [order, egress, shattered], 1)[0].id).toBe('shattered');
  });
});
