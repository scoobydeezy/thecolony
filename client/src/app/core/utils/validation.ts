import { ValueVector } from '../models/types';

// Priority weights assigned when a value vector must be reconstructed from ordering alone.
const PRIORITY_WEIGHTS = [0.5, 0.3, 0.2] as const;

/**
 * Returns `value` if it is a member of `valid`, otherwise `undefined`.
 * Use this to guard any field whose valid values are a known set of strings.
 */
export function oneOf<T extends string>(value: string, valid: readonly T[]): T | undefined {
  return (valid as readonly string[]).includes(value) ? (value as T) : undefined;
}

/**
 * Parses `raw` as an integer and clamps it to [min, max].
 * Returns `fallback` if the input is not a finite number.
 */
export function clampedInt(raw: string, min: number, max: number, fallback: number): number {
  const n = Number(raw);
  if (!isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/**
 * Validates a value vector: all components must be in [0, 1] and sum to ~1 (±0.001).
 * If the vector is invalid, the three raw values are ranked by magnitude and assigned
 * weights [0.5, 0.3, 0.2] in that order so the result at least respects the original
 * value priority. NaN / out-of-range inputs are treated as 0 for ranking purposes.
 */
export function sanitizeValueVector(va: number, vb: number, vc: number): ValueVector {
  const inRange = (v: number) => isFinite(v) && v >= 0 && v <= 1;
  if (inRange(va) && inRange(vb) && inRange(vc) && Math.abs(va + vb + vc - 1) < 0.001) {
    return { a: va, b: vb, c: vc };
  }

  const entries: Array<[keyof ValueVector, number]> = [
    ['a', inRange(va) ? va : 0],
    ['b', inRange(vb) ? vb : 0],
    ['c', inRange(vc) ? vc : 0],
  ];
  entries.sort((x, y) => y[1] - x[1]);

  const result: ValueVector = { a: 0, b: 0, c: 0 };
  entries.forEach(([key], i) => { result[key] = PRIORITY_WEIGHTS[i]; });
  return result;
}
