/** Deterministic, seedable PRNG (mulberry32). Same seed → same question, always. */
export interface Rng {
  /** float in [0, 1) */
  next(): number;
  /** integer in [min, max] inclusive */
  int(min: number, max: number): number;
  /** integer in [min, max] excluding the given values */
  intExcept(min: number, max: number, except: readonly number[]): number;
  /** non-zero integer in [-max, -min] ∪ [min, max] */
  signed(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  chance(p: number): boolean;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));
  const rng: Rng = {
    next,
    int,
    intExcept(min, max, except) {
      for (let i = 0; i < 200; i++) {
        const v = int(min, max);
        if (!except.includes(v)) return v;
      }
      throw new Error(`intExcept: no value in [${min}, ${max}] outside ${except.join(',')}`);
    },
    signed(min, max) {
      const v = int(min, max);
      return next() < 0.5 ? -v : v;
    },
    pick(items) {
      if (items.length === 0) throw new Error('pick: empty list');
      return items[Math.floor(next() * items.length)] as (typeof items)[number];
    },
    shuffle(items) {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j] as (typeof out)[number], out[i] as (typeof out)[number]];
      }
      return out;
    },
    chance(p) {
      return next() < p;
    },
  };
  return rng;
}
