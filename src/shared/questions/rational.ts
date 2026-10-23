/** Exact rational arithmetic for answers that must be exact (fractions, equation roots). */
export interface Rational {
  readonly n: number;
  readonly d: number;
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

export function rat(n: number, d = 1): Rational {
  if (d === 0) throw new Error('rational: zero denominator');
  if (!Number.isInteger(n) || !Number.isInteger(d)) throw new Error('rational: non-integer parts');
  const g = gcd(n, d);
  const sign = d < 0 ? -1 : 1;
  return { n: (sign * n) / g || 0, d: (sign * d) / g };
}

export const add = (a: Rational, b: Rational): Rational => rat(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a: Rational, b: Rational): Rational => rat(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a: Rational, b: Rational): Rational => rat(a.n * b.n, a.d * b.d);
export const div = (a: Rational, b: Rational): Rational => {
  if (b.n === 0) throw new Error('rational: divide by zero');
  return rat(a.n * b.d, a.d * b.n);
};
export const neg = (a: Rational): Rational => rat(-a.n, a.d);
export const eq = (a: Rational, b: Rational): boolean => a.n === b.n && a.d === b.d;
export const isZero = (a: Rational): boolean => a.n === 0;
export const toNumber = (a: Rational): number => a.n / a.d;
export const isInt = (a: Rational): boolean => a.d === 1;

/** Plain text, e.g. "-3/4" or "5". */
export function ratText(a: Rational): string {
  return a.d === 1 ? String(a.n) : `${a.n}/${a.d}`;
}

/** TeX, e.g. "-\frac{3}{4}". */
export function ratTex(a: Rational): string {
  if (a.d === 1) return String(a.n);
  const sign = a.n < 0 ? '-' : '';
  return `${sign}\\frac{${Math.abs(a.n)}}{${a.d}}`;
}

/** Convert a finite decimal number to an exact rational (for parsing "2.5"). */
export function ratFromDecimal(x: number): Rational | null {
  if (!Number.isFinite(x)) return null;
  for (let d = 1; d <= 1e6; d *= 10) {
    const n = x * d;
    if (Math.abs(n - Math.round(n)) < 1e-9) return rat(Math.round(n), d);
  }
  return null;
}
