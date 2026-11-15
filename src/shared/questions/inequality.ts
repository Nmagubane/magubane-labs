/**
 * Solution sets of inequalities, as learners write them: "x < -2 or x > 3", "-1 ≤ x < 4", "x ≥ 5/2", "x ≠ 2",
 * "x = 3", and interval notation "x ∈ (-∞; 2] ∪ [3; ∞)". Sets are unions of intervals with exact (rational)
 * endpoints, normalised so that equal sets compare equal however they were written.
 */
import { rat, eq as req, toNumber, type Rational } from './rational.ts';
import type { IneqInterval } from './types.ts';

export class InequalityError extends Error {}

export interface Interval {
  lo: Rational | null; // null = −∞
  hi: Rational | null; // null = +∞
  loIn: boolean;
  hiIn: boolean;
}

const cmp = (a: Rational, b: Rational) => a.n * b.d - b.n * a.d;

function parseNum(raw: string): Rational {
  const s = raw.replace(/[−–—]/g, '-').replace(/\s+/g, '').replace(',', '.');
  let m = /^(-?)(\d+)\/(\d+)$/.exec(s);
  if (m) return rat((m[1] ? -1 : 1) * Number(m[2]), Number(m[3]));
  m = /^(-?)(\d*)\.?(\d*)$/.exec(s);
  if (m && (m[2] || m[3])) {
    const d = 10 ** (m[3]?.length ?? 0);
    return rat((m[1] ? -1 : 1) * (Number(m[2] || '0') * d + Number(m[3] || '0')), d);
  }
  throw new InequalityError(`Can't read the number "${raw.trim()}"`);
}

const ALL: Interval = { lo: null, hi: null, loIn: false, hiIn: false };

/** Sort, drop empty intervals, merge overlapping or touching ones. */
export function normalise(set: Interval[]): Interval[] {
  const ok = set.filter((iv) => !(iv.lo && iv.hi && (cmp(iv.lo, iv.hi) > 0 || (cmp(iv.lo, iv.hi) === 0 && !(iv.loIn && iv.hiIn)))));
  ok.sort((a, b) => (a.lo === null ? -1 : b.lo === null ? 1 : cmp(a.lo, b.lo) || (a.loIn === b.loIn ? 0 : a.loIn ? -1 : 1)));
  const out: Interval[] = [];
  for (const iv of ok) {
    const last = out[out.length - 1];
    if (last && (last.hi === null || (iv.lo !== null && (cmp(iv.lo, last.hi) < 0 || (cmp(iv.lo, last.hi) === 0 && (last.hiIn || iv.loIn)))))) {
      if (last.hi === null) continue;
      if (iv.hi === null || cmp(iv.hi, last.hi) > 0) {
        last.hi = iv.hi;
        last.hiIn = iv.hiIn;
      } else if (cmp(iv.hi, last.hi) === 0) last.hiIn = last.hiIn || iv.hiIn;
    } else out.push({ ...iv });
  }
  return out;
}

function intersect(a: Interval, b: Interval): Interval {
  const lo = a.lo === null ? b.lo : b.lo === null ? a.lo : cmp(a.lo, b.lo) >= 0 ? a.lo : b.lo;
  const loIn = lo === null ? false : (a.lo === null || cmp(a.lo, lo) !== 0 || a.loIn) && (b.lo === null || cmp(b.lo, lo) !== 0 || b.loIn);
  const hi = a.hi === null ? b.hi : b.hi === null ? a.hi : cmp(a.hi, b.hi) <= 0 ? a.hi : b.hi;
  const hiIn = hi === null ? false : (a.hi === null || cmp(a.hi, hi) !== 0 || a.hiIn) && (b.hi === null || cmp(b.hi, hi) !== 0 || b.hiIn);
  return { lo, hi, loIn, hiIn };
}

/** One condition: "x < 3", "3 > x", "-1 <= x < 4", "x ≠ 2", "x = 5". */
function parseCondition(raw: string, v: string): Interval[] {
  const s = raw.replace(/≤|=<|<=/g, '≤').replace(/≥|=>|>=/g, '≥').replace(/!=|≠|=\/=/g, '≠');
  const parts = s.split(/(≤|≥|≠|<|>|=)/).map((x) => x.trim());
  if (parts.length < 3 || parts.length % 2 === 0) throw new InequalityError(`Write each part like ${v} < 3 or -1 ≤ ${v} < 4.`);
  const at = parts.findIndex((x, i) => i % 2 === 0 && x === v);
  if (at < 0) throw new InequalityError(`Write the inequality in terms of ${v}.`);
  let out: Interval[] = [ALL];
  for (let i = 1; i < parts.length; i += 2) {
    const [l, op, r] = [parts[i - 1]!, parts[i]!, parts[i + 1]!];
    if (l !== v && r !== v) throw new InequalityError(`Each comparison needs ${v} on one side.`);
    const num = parseNum(l === v ? r : l);
    // Turn "num op x" into "x op' num".
    const flip: Record<string, string> = { '<': '>', '>': '<', '≤': '≥', '≥': '≤', '=': '=', '≠': '≠' };
    const o = l === v ? op : flip[op]!;
    const piece: Interval[] =
      o === '<' ? [{ lo: null, hi: num, loIn: false, hiIn: false }]
      : o === '≤' ? [{ lo: null, hi: num, loIn: false, hiIn: true }]
      : o === '>' ? [{ lo: num, hi: null, loIn: false, hiIn: false }]
      : o === '≥' ? [{ lo: num, hi: null, loIn: true, hiIn: false }]
      : o === '=' ? [{ lo: num, hi: num, loIn: true, hiIn: true }]
      : [{ lo: null, hi: num, loIn: false, hiIn: false }, { lo: num, hi: null, loIn: false, hiIn: false }];
    out = out.flatMap((a) => piece.map((b) => intersect(a, b)));
  }
  return normalise(out);
}

/** Interval notation: (-∞; 2] or [−1; 4) — semicolons, because the comma is the decimal comma. */
function parseIntervalNotation(raw: string): Interval {
  const m = /^([([])\s*([^;]+?)\s*;\s*([^;]+?)\s*([)\]])$/.exec(raw.trim());
  if (!m) throw new InequalityError('Write intervals like (-2; 3] with a semicolon between the ends.');
  const inf = (x: string) => /^[+-]?(∞|inf(inity)?)$/i.test(x.replace(/[−–—]/g, '-'));
  return { lo: inf(m[2]!) ? null : parseNum(m[2]!), hi: inf(m[3]!) ? null : parseNum(m[3]!), loIn: m[1] === '[' && !inf(m[2]!), hiIn: m[4] === ']' && !inf(m[3]!) };
}

export function parseInequality(raw: string, v = 'x'): Interval[] {
  let s = raw.replace(/[−–—]/g, '-').trim();
  if (!s) throw new InequalityError('Enter the solution.');
  if (/^all real/i.test(s) || new RegExp(`^(${v}\\s*∈\\s*)?ℝ$`).test(s)) return [ALL];
  s = s.replace(new RegExp(`^${v}\\s*(∈|in)\\s*`, 'i'), '');
  // Interval notation, possibly a union.
  if (/^[([]/.test(s)) return normalise(s.split(/∪|\bU\b|\bor\b/).map((p) => parseIntervalNotation(p)));
  // "x < -2 or x > 3"; "and" joins conditions on one interval.
  const ors = s.split(/\s*(?:\bor\b|∪|;)\s*/i).filter(Boolean);
  const sets = ors.map((o) =>
    o
      .split(/\s*(?:\band\b|&)\s*/i)
      .map((c) => parseCondition(c, v))
      .reduce((acc, next) => normalise(acc.flatMap((a) => next.map((b) => intersect(a, b))))),
  );
  return normalise(sets.flat());
}

export const toWire = (set: Interval[]): IneqInterval[] => set.map((iv) => ({ lo: iv.lo && { n: iv.lo.n, d: iv.lo.d }, hi: iv.hi && { n: iv.hi.n, d: iv.hi.d }, loIn: iv.loIn, hiIn: iv.hiIn }));
export const fromWire = (set: IneqInterval[]): Interval[] => set.map((iv) => ({ lo: iv.lo && rat(iv.lo.n, iv.lo.d), hi: iv.hi && rat(iv.hi.n, iv.hi.d), loIn: iv.loIn, hiIn: iv.hiIn }));

export function sameSet(a: Interval[], b: Interval[]): boolean {
  const x = normalise(a);
  const y = normalise(b);
  const same = (p: Rational | null, q: Rational | null) => (p === null ? q === null : q !== null && req(p, q));
  return x.length === y.length && x.every((iv, i) => same(iv.lo, y[i]!.lo) && same(iv.hi, y[i]!.hi) && (iv.lo === null || iv.loIn === y[i]!.loIn) && (iv.hi === null || iv.hiIn === y[i]!.hiIn));
}

/** The same intervals with every endpoint's inclusion switched: ≤ for <, and back. */
export const toggledEnds = (set: Interval[]): Interval[] => set.map((iv) => ({ ...iv, loIn: iv.lo !== null && !iv.loIn, hiIn: iv.hi !== null && !iv.hiIn }));

/** Everything not in the set. */
export function complement(set: Interval[]): Interval[] {
  const out: Interval[] = [];
  let lo: Rational | null = null;
  let loIn = false;
  for (const iv of normalise(set)) {
    if (iv.lo !== null) out.push({ lo, hi: iv.lo, loIn, hiIn: !iv.loIn });
    if (iv.hi === null) return normalise(out);
    lo = iv.hi;
    loIn = !iv.hiIn;
  }
  out.push({ lo, hi: null, loIn, hiIn: false });
  return normalise(out);
}

const num = (r: Rational) => (r.d === 1 ? `${r.n}` : `${r.n}/${r.d}`);
const tex = (r: Rational) => (r.d === 1 ? `${r.n}` : `${r.n < 0 ? '-' : ''}\\tfrac{${Math.abs(r.n)}}{${r.d}}`);

/** "x < -2 or x > 3", "-1 <= x < 4": what a learner would type (also re-parsed by the tests). */
export function setText(set: Interval[], v = 'x'): string {
  return normalise(set)
    .map((iv) => {
      if (iv.lo && iv.hi && req(iv.lo, iv.hi)) return `${v} = ${num(iv.lo)}`;
      if (iv.lo === null && iv.hi === null) return 'all real';
      if (iv.lo === null) return `${v} ${iv.hiIn ? '<=' : '<'} ${num(iv.hi!)}`;
      if (iv.hi === null) return `${v} ${iv.loIn ? '>=' : '>'} ${num(iv.lo)}`;
      return `${num(iv.lo)} ${iv.loIn ? '<=' : '<'} ${v} ${iv.hiIn ? '<=' : '<'} ${num(iv.hi)}`;
    })
    .join(' or ');
}

export function setTex(set: Interval[], v = 'x'): string {
  const s = normalise(set);
  if (s.length === 2 && s[0]!.lo === null && s[1]!.hi === null && s[0]!.hi && s[1]!.lo && req(s[0]!.hi, s[1]!.lo) && !s[0]!.hiIn && !s[1]!.loIn) return `${v} \\ne ${tex(s[0]!.hi)}`;
  return s
    .map((iv) => {
      if (iv.lo && iv.hi && req(iv.lo, iv.hi)) return `${v} = ${tex(iv.lo)}`;
      if (iv.lo === null && iv.hi === null) return `${v} \\in \\mathbb{R}`;
      if (iv.lo === null) return `${v} ${iv.hiIn ? '\\le' : '<'} ${tex(iv.hi!)}`;
      if (iv.hi === null) return `${v} ${iv.loIn ? '\\ge' : '>'} ${tex(iv.lo)}`;
      return `${tex(iv.lo)} ${iv.loIn ? '\\le' : '<'} ${v} ${iv.hiIn ? '\\le' : '<'} ${tex(iv.hi)}`;
    })
    .join(' \\text{ or } ');
}

/** Is a number in the set? */
export function contains(set: Interval[], x: number): boolean {
  return set.some((iv) => (iv.lo === null || x > toNumber(iv.lo) || (iv.loIn && x === toNumber(iv.lo))) && (iv.hi === null || x < toNumber(iv.hi) || (iv.hiIn && x === toNumber(iv.hi))));
}
