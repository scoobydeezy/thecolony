import { defaultEffectValue, defaultEffectDelta, usesDelta } from './effect-defaults';
import { GOAL_EFFECT_PROPS, LOCATION_EFFECT_PROPS, CHARACTER_EFFECT_PROPS, FACTION_EFFECT_PROPS } from '../../core/models/types';

describe('effect draft defaults (D10)', () => {
  it('select-type first properties default to the option the select displays', () => {
    expect(defaultEffectValue(GOAL_EFFECT_PROPS[0])).toBe('Plotting');      // Goal → Status
    expect(defaultEffectValue(LOCATION_EFFECT_PROPS[0])).toBe('Stable');    // Location → State
  });
  it('delta properties keep undefined value and use delta', () => {
    const legitimacy = FACTION_EFFECT_PROPS.find(d => d.property === 'baseLegitimacy');
    expect(defaultEffectValue(legitimacy)).toBeUndefined();
    expect(usesDelta(legitimacy)).toBe(true);
    expect(defaultEffectDelta(legitimacy, 10)).toBe(10);
  });
  it('a Momentum Signal (M3, the first faction property) starts at +1 with an empty reason', () => {
    const sig = FACTION_EFFECT_PROPS[0];
    expect(sig.property).toBe('momentumSignal');
    expect(defaultEffectValue(sig)).toBe('');
    expect(defaultEffectDelta(sig)).toBe(1);
    expect(defaultEffectDelta(sig, -10)).toBe(-1);
  });
  it('non-delta properties do not use delta', () => {
    const state = CHARACTER_EFFECT_PROPS.find(d => d.property === 'state');
    expect(usesDelta(state)).toBe(false);
    expect(defaultEffectValue(state)).toBe('Alive');
  });
});
