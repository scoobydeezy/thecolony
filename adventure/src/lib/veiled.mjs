// Generic Veiled Source physics, derived from Class (C) and Source Level.
// Canon: The Veiled — "Class I–V" and "Source Level and Source DC".
// Values here are never typed into prose; prose uses :stat{#source.x key=...}.
import { levelDC } from './pf2e.mjs';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

export function veiledDerived({ class: C, sourceLevel: L }) {
  const sourceDC = levelDC(L) + C;
  const backlashDamage = `${C}d${2 * C + 2} mental`;
  return {
    classLabel: `Class ${ROMAN[C]}`,
    sourceLevel: L,
    sourceDC,
    backlashDamage,
    backlash: `DC ${sourceDC} basic Will, ${backlashDamage}`,
    stabilityThreshold: 16 - 2 * C,
    wardHP: 10 * (L + C),
    activeBulkMinimum: `${10 * C} Bulk`,
    ruptureRadius: `${10 * C} feet`,
  };
}

const KEYS = {
  class: 'classLabel',
  'source-level': 'sourceLevel',
  'source-dc': 'sourceDC',
  backlash: 'backlash',
  'backlash-damage': 'backlashDamage',
  'stability-threshold': 'stabilityThreshold',
  'ward-hp': 'wardHP',
  'active-bulk-minimum': 'activeBulkMinimum',
  'rupture-radius': 'ruptureRadius',
};

export const STAT_KEYS = Object.keys(KEYS);

export function statText(sourceData, key) {
  const field = KEYS[key];
  if (!field) throw new Error(`Unknown Veiled stat key "${key}" (expected one of ${STAT_KEYS.join(', ')})`);
  return String(veiledDerived(sourceData)[field]);
}
