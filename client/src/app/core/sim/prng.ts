// Seeded randomness for the Colony Turn (M5). Pure 32-bit integer arithmetic, so the server verifier
// (Services/ColonyTurnEngine.cs) reproduces it exactly. Never use Math.random in the simulation.

/** mulberry32: returns a generator of uint32 values. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a) >>> 0;
    t = ((t + (Math.imul(t ^ (t >>> 7), 61 | t) >>> 0)) >>> 0 ^ t) >>> 0;
    return (t ^ (t >>> 14)) >>> 0;
  };
}

/** Uniform integer in [0, n) (modulo; the bias is below 1e-9 for the n used here). */
export const randInt = (next: () => number, n: number): number => next() % n;

/** Fisher–Yates, in place, descending. */
export function shuffle<T>(items: T[], next: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randInt(next, i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/** Ordinal string order, identical to C# string.CompareOrdinal for the ASCII ids used here. */
export const byOrdinal = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** The two independent streams of a Colony Turn: allocation, and dice (so entering physical dice never moves an allocation). */
export const allocationStream = (seed: number) => mulberry32(seed >>> 0);
export const diceStream = (seed: number) => mulberry32((seed ^ 0x9E3779B9) >>> 0);

/** A fresh seed for a new Colony Turn. */
export function newSeed(): number {
  const b = new Uint32Array(1); crypto.getRandomValues(b); return b[0];
}

/** §18.5: one die re-rolled in the app, from the date-time and the Turn's seed (salted with what is re-rolled, so two
 *  clicks in the same millisecond differ). Not reproducible from the seed alone; the face is recorded as rolled. */
export function rerollDie(seed: number, salt: string, now = Date.now()): number {
  let h = 0x811C9DC5;
  for (const ch of salt) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  return 1 + randInt(mulberry32((seed ^ now ^ h ^ Math.floor(now / 0x100000000)) >>> 0), 6);
}
