// PF2e reference values used by derived canon (GM Core, "DCs by Level").
const LEVEL_DC = [14, 15, 16, 18, 19, 20, 22, 23, 24, 26, 27, 28, 30, 31, 32, 34, 35, 36, 38, 39, 40, 42, 44, 46, 48, 50];

export function levelDC(level) {
  if (!Number.isInteger(level) || level < 0 || level >= LEVEL_DC.length) {
    throw new Error(`No PF2e level-based DC for level ${level}`);
  }
  return LEVEL_DC[level];
}

export const signed = (n) => (n >= 0 ? `+${n}` : `${n}`);
