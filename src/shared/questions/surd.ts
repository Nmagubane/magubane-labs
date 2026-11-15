/**
 * Surd answers such as 6√2, 3 − 2√5 or (3 + √6)/2.
 * An answer is reduced exactly to a sum of terms c·√r (c rational, r a square-free whole number, r = 1 for the
 * rational part), so any correct value can be recognised. Separately, "simplest form" is checked on what the learner
 * actually wrote: square factors taken out, no surd in a denominator, no powers, like surds collected, brackets
 * expanded and fractions cancelled. A right value in the wrong form is diagnosed as unsimplified.
 */
import { parseFormula, FormulaError, type Formula } from './formula.ts';
import { rat, add, mul, div, gcd, ratFromDecimal, type Rational } from './rational.ts';

export class SurdError extends Error {}

/** radicand → coefficient. Radicand 1 is the rational part. Zero coefficients are never stored. */
export type Surd = Map<number, Rational>;
export interface SurdTerm {
  r: number;
  n: number;
  d: number;
}

/** √m = k√s with s square-free. */
export function extract(m: number): { k: number; s: number } {
  if (!Number.isInteger(m) || m < 0) throw new SurdError('Can only take the square root of a whole number here');
  if (m === 0) return { k: 0, s: 1 };
  let k = 1;
  let s = m;
  for (let p = 2; p * p <= s; p++) while (s % (p * p) === 0) (s /= p * p), (k *= p);
  return { k, s };
}
export const squareFree = (m: number) => Number.isInteger(m) && m >= 2 && extract(m).k === 1;

function put(v: Surd, r: number, c: Rational) {
  const next = add(v.get(r) ?? rat(0), c);
  if (next.n === 0) v.delete(r);
  else v.set(r, next);
}
const constant = (c: Rational): Surd => {
  const v: Surd = new Map();
  if (c.n !== 0) v.set(1, c);
  return v;
};
function plus(a: Surd, b: Surd, sign = 1): Surd {
  const v: Surd = new Map(a);
  for (const [r, c] of b) put(v, r, mul(c, rat(sign)));
  return v;
}
function times(a: Surd, b: Surd): Surd {
  const v: Surd = new Map();
  for (const [r1, c1] of a)
    for (const [r2, c2] of b) {
      const { k, s } = extract(r1 * r2);
      put(v, s, mul(mul(c1, c2), rat(k)));
    }
  return v;
}
const scale = (a: Surd, c: Rational): Surd => times(a, constant(c));
const rationalOf = (a: Surd): Rational | null => (a.size === 0 ? rat(0) : a.size === 1 && a.has(1) ? a.get(1)! : null);

/** 1/d for a single surd term or a binomial a + b√s (multiply by the conjugate). */
function reciprocal(d: Surd): Surd {
  if (d.size === 0) throw new SurdError('Division by zero');
  if (d.size === 1) {
    const [r, c] = [...d][0]!;
    // 1/(c√r) = √r/(c·r)
    const v: Surd = new Map();
    put(v, r, div(rat(1), mul(c, rat(r))));
    return v;
  }
  const keys = [...d.keys()];
  if (d.size === 2 && keys.includes(1)) {
    const s = keys.find((k) => k !== 1)!;
    const a = d.get(1)!;
    const b = d.get(s)!;
    const den = add(mul(a, a), mul(mul(b, b), rat(-s)));
    const conj: Surd = new Map([[1, a]]);
    put(conj, s, mul(b, rat(-1)));
    return scale(conj, div(rat(1), den));
  }
  throw new SurdError('That denominator is too complicated');
}

function power(base: Surd, e: Rational): Surd {
  if (e.d === 1 && Math.abs(e.n) <= 12) {
    let v = constant(rat(1));
    for (let i = 0; i < Math.abs(e.n); i++) v = times(v, base);
    return e.n < 0 ? reciprocal(v) : v;
  }
  // A rational base to a fractional power, e.g. 8^(2/3) or 2^(1/2).
  const b = rationalOf(base);
  if (b && b.n > 0) {
    const root = (x: number, q: number) => {
      const r = Math.round(x ** (1 / q));
      return r ** q === x ? r : null;
    };
    const rn = root(b.n, e.d);
    const rd = root(b.d, e.d);
    if (rn !== null && rd !== null) return power(constant(rat(rn, rd)), rat(e.n));
    if (e.d === 2) return power(sqrtOf(constant(b)), rat(e.n));
  }
  throw new SurdError('Can\'t work with that power here');
}

function sqrtOf(a: Surd): Surd {
  const q = rationalOf(a);
  if (!q || q.n < 0) throw new SurdError('Take square roots of positive numbers only');
  // √(n/d) = √(nd)/d
  const { k, s } = extract(q.n * q.d);
  const v: Surd = new Map();
  put(v, s, rat(k, q.d));
  return v;
}

/** The exact value of a formula with numbers and square roots only. */
export function surdOf(f: Formula): Surd {
  switch (f.t) {
    case 'num': {
      const r = ratFromDecimal(f.v);
      if (!r) throw new SurdError('Can\'t read that number');
      return constant(r);
    }
    case 'var':
      throw new SurdError(`Your answer should be a number, without "${f.name}"`);
    case 'pi':
      throw new SurdError('π is not a surd');
    case 'neg':
      return scale(surdOf(f.a), rat(-1));
    case 'sqrt':
      return sqrtOf(surdOf(f.a));
    case 'bin': {
      const a = surdOf(f.a);
      const b = surdOf(f.b);
      if (f.op === '+') return plus(a, b);
      if (f.op === '-') return plus(a, b, -1);
      if (f.op === '*') return times(a, b);
      if (f.op === '/') return times(a, reciprocal(b));
      const e = rationalOf(b);
      if (!e) throw new SurdError('Can\'t raise to a surd power');
      return power(a, e);
    }
  }
}

// ---------------------------------------------------------------------------
// Simplest form

/** The top-level terms of a sum, with their signs. */
function terms(f: Formula, sign = 1, out: { f: Formula; sign: number }[] = []) {
  if (f.t === 'bin' && (f.op === '+' || f.op === '-')) {
    terms(f.a, sign, out);
    terms(f.b, f.op === '-' ? -sign : sign, out);
  } else if (f.t === 'neg') terms(f.a, -sign, out);
  else out.push({ f, sign });
  return out;
}
function walk(f: Formula, visit: (g: Formula, inDenominator: boolean) => void, inDen = false) {
  visit(f, inDen);
  if (f.t === 'neg' || f.t === 'sqrt') walk(f.a, visit, inDen);
  if (f.t === 'bin') {
    walk(f.a, visit, inDen);
    walk(f.b, visit, inDen || f.op === '/');
  }
}
const isInt = (f: Formula) => f.t === 'num' && Number.isInteger(f.v);

/** Is the learner's answer written in simplest surd form? Returns the first problem found, or null. */
export function simplestProblem(f: Formula): string | null {
  let problem: string | null = null;
  walk(f, (g, inDen) => {
    if (problem) return;
    if (g.t === 'sqrt') {
      if (inDen) problem = 'Rationalise the denominator: no surd should be left in the bottom of a fraction';
      else if (!isInt(g.a)) problem = 'Write each surd as the root of a whole number';
      else if (g.a.t === 'num' && !squareFree(g.a.v)) problem = g.a.v < 2 || extract(g.a.v).s === 1 ? 'That root is a whole number: work it out' : `Take the square factors out of √${g.a.v}`;
    }
    if (g.t === 'bin' && g.op === '^') problem = 'Work out the powers';
  });
  if (problem) return problem;
  // The numerator of a single fraction, or the whole answer, must be a sum of single terms with different surds.
  const top = f.t === 'bin' && f.op === '/' ? f.a : f;
  const seen = new Set<number>();
  for (const t of terms(top)) {
    const v = surdOf(t.f);
    if (v.size > 1) return 'Expand the brackets';
    for (const r of v.keys()) {
      if (seen.has(r)) return r === 1 ? 'Add the whole numbers together' : 'Collect the like surds';
      seen.add(r);
    }
  }
  // A fraction must be cancelled: (6 + 2√3)/4 → (3 + √3)/2.
  const fracs: Formula[] = [];
  walk(f, (g) => {
    if (g.t === 'bin' && g.op === '/') fracs.push(g);
  });
  for (const g of fracs) {
    if (g.t !== 'bin' || !isInt(g.b)) continue;
    const d = (g.b as { v: number }).v;
    const coeffs = [...surdOf(g.a).values()];
    if (coeffs.every((c) => c.d === 1) && coeffs.reduce((acc, c) => gcd(acc, c.n), d) > 1) return 'Cancel the fraction';
  }
  return null;
}

// ---------------------------------------------------------------------------

export function parseSurd(src: string): { value: Surd; problem: string | null } {
  let f: Formula;
  try {
    f = parseFormula(src);
  } catch (e) {
    throw new SurdError(e instanceof FormulaError ? e.message : 'Check your answer');
  }
  return { value: surdOf(f), problem: simplestProblem(f) };
}

export function sameSurd(a: Surd, b: Surd): boolean {
  if (a.size !== b.size) return false;
  for (const [r, c] of a) {
    const o = b.get(r);
    if (!o || o.n !== c.n || o.d !== c.d) return false;
  }
  return true;
}

export const toTerms = (v: Surd): SurdTerm[] => [...v].sort(([a], [b]) => a - b).map(([r, c]) => ({ r, n: c.n, d: c.d }));
export function fromTerms(ts: SurdTerm[]): Surd {
  const v: Surd = new Map();
  for (const t of ts) put(v, t.r, rat(t.n, t.d));
  return v;
}
export const surdValue = (v: Surd) => [...v].reduce((s, [r, c]) => s + (c.n / c.d) * Math.sqrt(r), 0);

/** Over one common denominator: integer coefficients and the denominator. */
function common(v: Surd) {
  const ts = toTerms(v);
  const L = ts.reduce((acc, t) => (acc * t.d) / gcd(acc, t.d), 1);
  return { L, nums: ts.map((t) => ({ r: t.r, k: (t.n * L) / t.d })) };
}

/** Plain text a learner could type: 3 - 2√5, (3 + √6)/2, -√2/4. */
export function surdText(v: Surd): string {
  if (v.size === 0) return '0';
  const { L, nums } = common(v);
  const body = nums
    .map(({ r, k }, i) => {
      const abs = Math.abs(k);
      const t = r === 1 ? `${abs}` : `${abs === 1 ? '' : abs}√${r}`;
      return i === 0 ? (k < 0 ? `-${t}` : t) : k < 0 ? ` - ${t}` : ` + ${t}`;
    })
    .join('');
  if (L === 1) return body;
  return nums.length > 1 ? `(${body})/${L}` : `${body}/${L}`;
}

/** TeX: 3 - 2\sqrt{5}, \dfrac{3 + \sqrt{6}}{2}. */
export function surdTex(v: Surd): string {
  if (v.size === 0) return '0';
  const { L, nums } = common(v);
  const body = nums
    .map(({ r, k }, i) => {
      const abs = Math.abs(k);
      const t = r === 1 ? `${abs}` : `${abs === 1 ? '' : abs}\\sqrt{${r}}`;
      return i === 0 ? (k < 0 ? `-${t}` : t) : k < 0 ? ` - ${t}` : ` + ${t}`;
    })
    .join('');
  if (L === 1) return body;
  if (nums.length === 1 && nums[0]!.k < 0) return `-\\dfrac{${body.slice(1)}}{${L}}`;
  return `\\dfrac{${body}}{${L}}`;
}

/** Build a surd from [radicand, coefficient] pairs (radicands are simplified here). */
export function surd(...parts: [number, Rational | number][]): Surd {
  let v: Surd = new Map();
  for (const [r, c] of parts) v = plus(v, times(sqrtOf(constant(rat(r))), constant(typeof c === 'number' ? rat(c) : c)));
  return v;
}
export { plus as surdPlus, times as surdTimes, reciprocal as surdReciprocal };
