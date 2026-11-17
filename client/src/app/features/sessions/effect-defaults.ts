// Default value/delta for a freshly chosen effect property (D10, M0).
// The select shows its first option, so the stored value must be that option too — never undefined.
import { EffectPropDescriptor } from '../../core/models/types';

export function defaultEffectValue(d: EffectPropDescriptor | undefined): string | undefined {
  switch (d?.inputType) {
    case 'select':          return d.selectOptions?.[0]?.value ?? '';
    case 'faction-select':
    case 'location-select': return '';
    case 'participate':     return 'Helping';
    case 'signal':          return '';   // the reason, required before saving
    case 'character-select': return '';  // M4: '' = no champion / leaderless
    default:                return undefined;
  }
}

/** Delta for a freshly chosen property: a Momentum Signal starts at +1 (it is always ±1). */
export function defaultEffectDelta(d: EffectPropDescriptor | undefined, current = 0): number {
  if (d?.inputType === 'signal') return current < 0 ? -1 : 1;
  return usesDelta(d) ? current : 0;
}

export function usesDelta(d: EffectPropDescriptor | undefined): boolean {
  return !(d?.inputType === 'select' || d?.inputType === 'none' || d?.inputType === 'faction-select' || d?.inputType === 'location-select'
           || d?.inputType === 'character-select' || d?.inputType === 'flag');
}
