/** Helpers for writing correct, consistently formatted TeX in generators. */

/** Trim floating noise: 2.5000000001 → "2.5"; up to `dp` decimals. */
export function fmt(n: number, dp = 3): string {
  const r = Math.round(n * 10 ** dp) / 10 ** dp;
  return Object.is(r, -0) ? '0' : String(r);
}

/** Round to dp decimals as a number. */
export function round(n: number, dp = 2): number {
  return Math.round(n * 10 ** dp) / 10 ** dp;
}

/** Negative numbers in brackets when used as an operand: (-3). */
export function paren(n: number): string {
  return n < 0 ? `(${fmt(n)})` : fmt(n);
}

/** A term with a variable part, positioned in a sum. coef 1 → "x", -1 → "-x". */
export function term(coef: number, v: string, first: boolean): string {
  if (coef === 0) return '';
  const abs = Math.abs(coef);
  const body = v === '' ? fmt(abs) : abs === 1 ? v : `${fmt(abs)}${v}`;
  if (first) return coef < 0 ? `-${body}` : body;
  return coef < 0 ? ` - ${body}` : ` + ${body}`;
}

/** A sum of [coefficient, variable-part] terms; zeros skipped. Empty → "0". */
export function sum(terms: [number, string][]): string {
  let out = '';
  for (const [c, v] of terms) {
    if (c === 0) continue;
    out += term(c, v, out === '');
  }
  return out || '0';
}

/** Plain-text (answer-checkable) version of a sum, using ^ for powers. */
export function sumPlain(terms: [number, string][]): string {
  return sum(terms).replace(/\^\{?(\d+)\}?/g, '^$1').replace(/\s+/g, '');
}

/** (x + 3), (x - 2), (2x + 1) */
export function binomial(a: number, v: string, b: number): string {
  return `(${sum([
    [a, v],
    [b, ''],
  ])})`;
}

/** Fraction TeX from parts, sign out front. */
export function frac(n: number, d: number): string {
  if (d === 1) return fmt(n);
  const sign = n * d < 0 ? '-' : '';
  return `${sign}\\frac{${Math.abs(n)}}{${Math.abs(d)}}`;
}

/** Chemical formula text → TeX: "Ca(OH)2" → "\text{Ca(OH)}_{2}". */
export function chem(formula: string): string {
  return formula.replace(/([A-Za-z()]+)(\d*)/g, (_m, sym: string, n: string) => `\\text{${sym}}${n ? `_{${n}}` : ''}`);
}

/** Atom counts for a formula, handling brackets: "Al2(SO4)3" → {Al:2, S:3, O:12}. */
export function parseFormula(formula: string): Record<string, number> {
  const stack: Record<string, number>[] = [{}];
  const re = /([A-Z][a-z]?|\(|\))(\d*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(formula))) {
    const [, tok, nStr] = m;
    const n = nStr ? Number(nStr) : 1;
    if (tok === '(') stack.push({});
    else if (tok === ')') {
      const group = stack.pop() as Record<string, number>;
      const top = stack[stack.length - 1] as Record<string, number>;
      for (const [el, c] of Object.entries(group)) top[el] = (top[el] ?? 0) + c * n;
    } else {
      const top = stack[stack.length - 1] as Record<string, number>;
      top[tok as string] = (top[tok as string] ?? 0) + n;
    }
  }
  return stack[0] as Record<string, number>;
}
