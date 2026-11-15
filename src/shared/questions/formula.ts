/**
 * Formulas checked by value, not by form: "make a the subject" answers such as (v - u)/t, √(A/π) or 2(s - ut)/t².
 * The polynomial engine in expr.ts can't hold division by a variable or roots, so a formula is parsed into a
 * small tree, evaluated at fixed sample points, and two formulas match when they agree everywhere they are defined.
 */
export class FormulaError extends Error {}

type F =
  | { t: 'num'; v: number }
  | { t: 'var'; name: string }
  | { t: 'pi' }
  | { t: 'bin'; op: '+' | '-' | '*' | '/' | '^'; a: F; b: F }
  | { t: 'neg'; a: F }
  | { t: 'sqrt'; a: F };

type Tok = { k: 'num'; v: number; text: string } | { k: 'var'; name: string } | { k: 'pi' } | { k: 'sqrt' } | { k: 'op'; v: '+' | '-' | '*' | '/' | '^' } | { k: 'lp' } | { k: 'rp' };

function tokenize(raw: string): Tok[] {
  const s = raw
    .replace(/[−–—]/g, '-')
    .replace(/[×·∙]/g, '*')
    .replace(/÷/g, '/')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/\*\*/g, '^')
    .replace(/\bsqrt\b/gi, '√')
    .replace(/\bpi\b/g, 'π');
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i]!;
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9.,]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.,]/.test(s[j]!)) j++;
      const text = s.slice(i, j);
      const v = Number(text.replace(',', '.'));
      if (!Number.isFinite(v) || (text.match(/[.,]/g) ?? []).length > 1) throw new FormulaError(`Can't read the number "${text}"`);
      out.push({ k: 'num', v, text });
      i = j;
      continue;
    }
    if (c === 'π') out.push({ k: 'pi' });
    else if (c === '√') out.push({ k: 'sqrt' });
    else if (/[a-zA-Z]/.test(c)) out.push({ k: 'var', name: c });
    else if (c === '(' || c === '[') out.push({ k: 'lp' });
    else if (c === ')' || c === ']') out.push({ k: 'rp' });
    else if ('+-*/^'.includes(c)) out.push({ k: 'op', v: c as '+' });
    else throw new FormulaError(`Unexpected "${c}"`);
    i++;
  }
  return out;
}

/** + − (lowest), then × ÷ and implicit multiplication, then unary minus, then ^ (right to left), then atoms. */
export function parseFormula(src: string): F {
  const toks = tokenize(src);
  if (!toks.length) throw new FormulaError('Empty answer');
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => {
    const t = peek();
    return t?.k === 'op' && t.v === v;
  };
  const startsAtom = (t: Tok | undefined) => !!t && (t.k === 'num' || t.k === 'var' || t.k === 'pi' || t.k === 'sqrt' || t.k === 'lp');
  const expr = (): F => {
    let left = term();
    while (isOp('+') || isOp('-')) {
      const op = (toks[p++] as { v: '+' | '-' }).v;
      left = { t: 'bin', op, a: left, b: term() };
    }
    return left;
  };
  const term = (): F => {
    let left = unary();
    for (;;) {
      if (isOp('*') || isOp('/')) {
        const op = (toks[p++] as { v: '*' | '/' }).v;
        left = { t: 'bin', op, a: left, b: unary() };
      } else if (startsAtom(peek())) left = { t: 'bin', op: '*', a: left, b: power() };
      else break;
    }
    return left;
  };
  const unary = (): F => {
    if (isOp('-')) {
      p++;
      return { t: 'neg', a: unary() };
    }
    if (isOp('+')) {
      p++;
      return unary();
    }
    return power();
  };
  const power = (): F => {
    const base = atom();
    if (isOp('^')) {
      p++;
      return { t: 'bin', op: '^', a: base, b: unary() };
    }
    return base;
  };
  const atom = (): F => {
    const t = toks[p++];
    if (!t) throw new FormulaError('Answer ends too early');
    if (t.k === 'num') return { t: 'num', v: t.v };
    if (t.k === 'var') return { t: 'var', name: t.name };
    if (t.k === 'pi') return { t: 'pi' };
    if (t.k === 'sqrt') return { t: 'sqrt', a: power() };
    if (t.k === 'lp') {
      const inner = expr();
      if (toks[p]?.k !== 'rp') throw new FormulaError('A bracket is not closed');
      p++;
      return inner;
    }
    throw new FormulaError('Unexpected symbol');
  };
  const f = expr();
  if (p !== toks.length) throw new FormulaError('Could not read the whole answer');
  return f;
}

export function evaluate(f: F, env: Record<string, number>): number {
  switch (f.t) {
    case 'num':
      return f.v;
    case 'pi':
      return Math.PI;
    case 'var': {
      const v = env[f.name];
      if (v === undefined) throw new FormulaError(`"${f.name}" isn't in this formula`);
      return v;
    }
    case 'neg':
      return -evaluate(f.a, env);
    case 'sqrt':
      return Math.sqrt(evaluate(f.a, env));
    case 'bin': {
      const a = evaluate(f.a, env);
      const b = evaluate(f.b, env);
      return f.op === '+' ? a + b : f.op === '-' ? a - b : f.op === '*' ? a * b : f.op === '/' ? a / b : a ** b;
    }
  }
}

export function variablesOf(f: F, out = new Set<string>()): Set<string> {
  if (f.t === 'var') out.add(f.name);
  if (f.t === 'neg' || f.t === 'sqrt') variablesOf(f.a, out);
  if (f.t === 'bin') (variablesOf(f.a, out), variablesOf(f.b, out));
  return out;
}

const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 4 } as const;
const precOf = (f: F) => (f.t === 'bin' ? PREC[f.op] : f.t === 'neg' ? 3 : 5);
/** TeX for the "reads as" preview. */
export function formulaTex(f: F): string {
  const wrap = (g: F, min: number) => (precOf(g) < min ? `\\left(${formulaTex(g)}\\right)` : formulaTex(g));
  switch (f.t) {
    case 'num':
      return String(f.v).replace('.', '{,}');
    case 'var':
      return f.name;
    case 'pi':
      return '\\pi';
    case 'neg':
      return `-${wrap(f.a, 3)}`;
    case 'sqrt':
      return `\\sqrt{${formulaTex(f.a)}}`;
    case 'bin':
      if (f.op === '/') return `\\dfrac{${formulaTex(f.a)}}{${formulaTex(f.b)}}`;
      if (f.op === '^') return `${wrap(f.a, 5)}^{${formulaTex(f.b)}}`;
      if (f.op === '*') {
        const r = wrap(f.b, 2);
        const needsDot = f.b.t === 'num' || (f.b.t === 'bin' && f.b.op === '^' && f.b.a.t === 'num');
        return `${wrap(f.a, 2)}${needsDot ? ' \\times ' : ' '}${r}`;
      }
      return `${formulaTex(f.a)} ${f.op} ${wrap(f.b, f.op === '-' ? 2 : 1)}`;
  }
}

/** Fixed, spread-out sample values (no randomness, so grading never flickers). */
const SAMPLES = [1.37, 2.91, 0.73, 3.58, 1.94, 4.26, 2.43, 0.88, 3.11, 1.62, 2.07, 3.83];

/**
 * Do two formulas agree at every sample where both are defined? Variables are given sample values from `domain`
 * (positive by default, so square roots and denominators behave, as they would for lengths and times).
 */
export function formulasEquivalent(a: string, b: string, vars: string[], domain: [number, number] = [0.5, 4.5]): boolean {
  let fa: F, fb: F;
  try {
    fa = parseFormula(a);
    fb = parseFormula(b);
  } catch {
    return false;
  }
  for (const v of [...variablesOf(fa), ...variablesOf(fb)]) if (!vars.includes(v)) return false;
  let compared = 0;
  for (let i = 0; i < SAMPLES.length * 2; i++) {
    const env: Record<string, number> = {};
    vars.forEach((v, j) => {
      const s = SAMPLES[(i + 5 * j) % SAMPLES.length]! / 4.5;
      env[v] = domain[0] + (domain[1] - domain[0]) * s + 0.013 * j;
    });
    const x = evaluate(fa, env);
    const y = evaluate(fb, env);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    compared++;
    if (Math.abs(x - y) > 1e-7 * Math.max(1, Math.abs(x), Math.abs(y))) return false;
  }
  return compared >= 6;
}
