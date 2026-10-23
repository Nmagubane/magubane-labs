/**
 * Small algebra engine for free-response answers.
 * Parses what a learner actually types ("2x(x-3)", "x²+5x+6", "3a − 2b") into an AST,
 * converts to an exact polynomial for equivalence, and checks the *form* of an answer
 * (expanded vs factorised) — because "is it equal?" is not the same as "did you factorise?".
 */
import { add as radd, mul as rmul, div as rdiv, rat, isZero, eq as req, gcd, type Rational } from './rational.ts';

export type Node =
  | { t: 'num'; v: Rational }
  | { t: 'var'; name: string }
  | { t: 'add'; terms: Node[] }
  | { t: 'mul'; factors: Node[] }
  | { t: 'div'; num: Node; den: Node }
  | { t: 'pow'; base: Node; exp: number }
  | { t: 'neg'; arg: Node };

type Tok =
  | { k: 'num'; v: Rational }
  | { k: 'var'; name: string }
  | { k: 'op'; v: '+' | '-' | '*' | '/' | '^' }
  | { k: 'lp' }
  | { k: 'rp' };

const SUPERSCRIPTS: Record<string, string> = { '²': '^2', '³': '^3', '⁴': '^4' };

export class ParseError extends Error {}

export function normaliseInput(raw: string): string {
  return raw
    .replace(/[−–—]/g, '-')
    .replace(/[×·∙]/g, '*')
    .replace(/÷/g, '/')
    .replace(/[²³⁴]/g, (m) => SUPERSCRIPTS[m] ?? m)
    .replace(/\*\*/g, '^')
    .trim();
}

function tokenize(src: string): Tok[] {
  const s = normaliseInput(src);
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i] as string;
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9.,]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.,]/.test(s[j] as string)) j++;
      const text = s.slice(i, j).replace(',', '.');
      if (!/^\d*\.?\d+$|^\d+\.$/.test(text)) throw new ParseError(`Can't read the number "${s.slice(i, j)}"`);
      const [whole = '0', frac = ''] = text.split('.');
      const d = 10 ** frac.length;
      out.push({ k: 'num', v: rat(Number(whole || '0') * d + Number(frac || '0'), d) });
      i = j;
      continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      out.push({ k: 'var', name: c.toLowerCase() });
      i++;
      continue;
    }
    if (c === '(' || c === '[') {
      out.push({ k: 'lp' });
      i++;
      continue;
    }
    if (c === ')' || c === ']') {
      out.push({ k: 'rp' });
      i++;
      continue;
    }
    if ('+-*/^'.includes(c)) {
      out.push({ k: 'op', v: c as '+' | '-' | '*' | '/' | '^' });
      i++;
      continue;
    }
    throw new ParseError(`Unexpected "${c}"`);
  }
  return out;
}

export function parseExpression(src: string): Node {
  const toks = tokenize(src);
  if (toks.length === 0) throw new ParseError('Empty answer');
  let p = 0;
  const peek = (): Tok | undefined => toks[p];
  const isOp = (v: string): boolean => {
    const t = peek();
    return t?.k === 'op' && t.v === v;
  };

  const parseExpr = (): Node => {
    const terms: Node[] = [parseTerm()];
    while (isOp('+') || isOp('-')) {
      const op = (toks[p++] as { v: string }).v;
      const term = parseTerm();
      terms.push(op === '-' ? { t: 'neg', arg: term } : term);
    }
    return terms.length === 1 ? (terms[0] as Node) : { t: 'add', terms };
  };

  const startsAtom = (t: Tok | undefined): boolean => t?.k === 'var' || t?.k === 'lp';

  const parseTerm = (): Node => {
    let left = parseUnary();
    for (;;) {
      if (isOp('*')) {
        p++;
        left = mulOf(left, parseUnary());
      } else if (isOp('/')) {
        p++;
        left = { t: 'div', num: left, den: parseUnary() };
      } else if (startsAtom(peek()) || (peek()?.k === 'num' && toks[p - 1]?.k === 'rp')) {
        left = mulOf(left, parsePower());
      } else break;
    }
    return left;
  };

  const parseUnary = (): Node => {
    if (isOp('-')) {
      p++;
      return { t: 'neg', arg: parseUnary() };
    }
    if (isOp('+')) {
      p++;
      return parseUnary();
    }
    return parsePower();
  };

  const parsePower = (): Node => {
    const base = parseAtom();
    if (isOp('^')) {
      p++;
      const t = peek();
      let sign = 1;
      if (t?.k === 'op' && t.v === '-') throw new ParseError('Negative powers are not supported here');
      const e = toks[p++];
      if (!e || e.k !== 'num' || e.v.d !== 1) throw new ParseError('Powers must be whole numbers');
      const exp = sign * e.v.n;
      if (exp > 12) throw new ParseError('That power is too large');
      return { t: 'pow', base, exp };
    }
    return base;
  };

  const parseAtom = (): Node => {
    const t = toks[p++];
    if (!t) throw new ParseError('Answer ends too early');
    if (t.k === 'num') return { t: 'num', v: t.v };
    if (t.k === 'var') return { t: 'var', name: t.name };
    if (t.k === 'lp') {
      const inner = parseExpr();
      if (toks[p]?.k !== 'rp') throw new ParseError('A bracket is not closed');
      p++;
      return inner;
    }
    throw new ParseError('Unexpected symbol');
  };

  const node = parseExpr();
  if (p !== toks.length) throw new ParseError('Could not read the whole answer');
  return node;
}

function mulOf(a: Node, b: Node): Node {
  const fa = a.t === 'mul' ? a.factors : [a];
  const fb = b.t === 'mul' ? b.factors : [b];
  return { t: 'mul', factors: [...fa, ...fb] };
}

// ---------- Polynomials (multivariate, exact) ----------

/** Monomial key: "x^2*y" (sorted), "" = constant. */
export type Poly = Map<string, Rational>;

function monoKey(powers: Record<string, number>): string {
  return Object.keys(powers)
    .filter((v) => (powers[v] ?? 0) > 0)
    .sort()
    .map((v) => (powers[v] === 1 ? v : `${v}^${powers[v]}`))
    .join('*');
}

function parseKey(key: string): Record<string, number> {
  const out: Record<string, number> = {};
  if (!key) return out;
  for (const part of key.split('*')) {
    const [v, e] = part.split('^');
    out[v as string] = e ? Number(e) : 1;
  }
  return out;
}

function polyAdd(a: Poly, b: Poly): Poly {
  const out: Poly = new Map(a);
  for (const [k, c] of b) {
    const next = radd(out.get(k) ?? rat(0), c);
    if (isZero(next)) out.delete(k);
    else out.set(k, next);
  }
  return out;
}

function polyMul(a: Poly, b: Poly): Poly {
  let out: Poly = new Map();
  for (const [ka, ca] of a) {
    for (const [kb, cb] of b) {
      const pa = parseKey(ka);
      const pb = parseKey(kb);
      for (const [v, e] of Object.entries(pb)) pa[v] = (pa[v] ?? 0) + e;
      out = polyAdd(out, new Map([[monoKey(pa), rmul(ca, cb)]]));
    }
  }
  return out;
}

const constPoly = (r: Rational): Poly => (isZero(r) ? new Map() : new Map([['', r]]));

/** Exact polynomial, or null if the expression isn't a polynomial (e.g. divides by x). */
export function toPoly(node: Node): Poly | null {
  switch (node.t) {
    case 'num':
      return constPoly(node.v);
    case 'var':
      return new Map([[node.name, rat(1)]]);
    case 'neg': {
      const a = toPoly(node.arg);
      return a && polyMul(a, constPoly(rat(-1)));
    }
    case 'add': {
      let acc: Poly = new Map();
      for (const term of node.terms) {
        const p = toPoly(term);
        if (!p) return null;
        acc = polyAdd(acc, p);
      }
      return acc;
    }
    case 'mul': {
      let acc: Poly = constPoly(rat(1));
      for (const f of node.factors) {
        const p = toPoly(f);
        if (!p) return null;
        acc = polyMul(acc, p);
      }
      return acc;
    }
    case 'div': {
      const n = toPoly(node.num);
      const d = toPoly(node.den);
      if (!n || !d) return null;
      const keys = [...d.keys()];
      if (keys.length !== 1 || keys[0] !== '') return null;
      const c = d.get('') as Rational;
      return polyMul(n, constPoly(rdiv(rat(1), c)));
    }
    case 'pow': {
      const b = toPoly(node.base);
      if (!b) return null;
      let acc: Poly = constPoly(rat(1));
      for (let i = 0; i < node.exp; i++) acc = polyMul(acc, b);
      return acc;
    }
  }
}

export function polyEqual(a: Poly, b: Poly): boolean {
  if (a.size !== b.size) return false;
  for (const [k, c] of a) {
    const o = b.get(k);
    if (!o || !req(o, c)) return false;
  }
  return true;
}

export function polyDegree(p: Poly): number {
  let deg = 0;
  for (const k of p.keys()) {
    const total = Object.values(parseKey(k)).reduce((s, e) => s + e, 0);
    deg = Math.max(deg, total);
  }
  return deg;
}

// ---------- Form checks ----------

function topTerms(node: Node): Node[] {
  if (node.t === 'add') return node.terms.flatMap(topTerms);
  if (node.t === 'neg') return topTerms(node.arg).map((t) => ({ t: 'neg', arg: t }) as Node);
  return [node];
}

function containsSum(node: Node): boolean {
  switch (node.t) {
    case 'add':
      return node.terms.length > 1;
    case 'neg':
      return containsSum(node.arg);
    case 'mul':
      return node.factors.some(containsSum);
    case 'pow':
      return containsSum(node.base);
    case 'div':
      return containsSum(node.num) || containsSum(node.den);
    default:
      return false;
  }
}

/** Expanded and simplified: a flat sum of monomials with like terms collected. */
export function isExpandedForm(node: Node): boolean {
  const terms = topTerms(node);
  if (terms.some(containsSum)) return false;
  const poly = toPoly(node);
  if (!poly) return false;
  return terms.length === Math.max(1, poly.size);
}

function stripNeg(node: Node): Node {
  return node.t === 'neg' ? stripNeg(node.arg) : node;
}

function factorList(node: Node): Node[] {
  const n = stripNeg(node);
  if (n.t === 'mul') return n.factors.flatMap(factorList);
  if (n.t === 'pow') return Array.from({ length: n.exp }, () => n.base).flatMap(factorList);
  return [n];
}

/**
 * Fully factorised over the integers into linear factors (what school factorisation means):
 * a product with no factor of degree > 1, and no linear factor with a common factor left inside it.
 */
export function isFactorisedForm(node: Node): boolean {
  const factors = factorList(node);
  const nonConstant = factors.filter((f) => {
    const p = toPoly(f);
    return p !== null && polyDegree(p) > 0;
  });
  if (nonConstant.length === 0) return false;
  if (nonConstant.length === 1 && factors.length === 1) return polyDegree(toPoly(nonConstant[0] as Node) ?? new Map()) <= 1;
  for (const f of nonConstant) {
    const p = toPoly(f);
    if (!p || polyDegree(p) > 1) return false;
    const coeffs = [...p.values()].map((c) => c);
    if (coeffs.some((c) => c.d !== 1)) continue;
    const g = coeffs.reduce((acc, c) => gcd(acc, c.n), 0);
    if (g > 1) return false;
  }
  return true;
}

export function expressionsEquivalent(a: string, b: string): boolean {
  try {
    const pa = toPoly(parseExpression(a));
    const pb = toPoly(parseExpression(b));
    return pa !== null && pb !== null && polyEqual(pa, pb);
  } catch {
    return false;
  }
}

// ---------- Display ----------

function prec(n: Node): number {
  switch (n.t) {
    case 'add':
      return 1;
    case 'neg':
      return 2;
    case 'mul':
    case 'div':
      return 3;
    case 'pow':
      return 4;
    default:
      return 5;
  }
}

/** TeX for a parsed expression — used to show learners how their typed answer was read. */
export function toTex(n: Node): string {
  const wrap = (child: Node, min: number) => (prec(child) < min ? `\\left(${toTex(child)}\\right)` : toTex(child));
  switch (n.t) {
    case 'num':
      return n.v.d === 1 ? String(n.v.n) : `\\tfrac{${n.v.n}}{${n.v.d}}`;
    case 'var':
      return n.name;
    case 'neg':
      return `-${wrap(n.arg, 3)}`;
    case 'add':
      return n.terms
        .map((t, i) => {
          if (i === 0) return toTex(t);
          if (t.t === 'neg') return ` - ${wrap(t.arg, 2)}`;
          return ` + ${toTex(t)}`;
        })
        .join('');
    case 'mul': {
      let out = '';
      n.factors.forEach((f, i) => {
        const s = wrap(f, 4);
        if (i === 0) out = f.t === 'neg' ? `-${wrap(f.arg, 4)}` : s;
        else {
          const needsDot = f.t === 'num';
          out += needsDot ? ` \\cdot ${s}` : f.t === 'neg' ? `\\left(${toTex(f)}\\right)` : s;
        }
      });
      return out;
    }
    case 'div':
      return `\\frac{${toTex(n.num)}}{${toTex(n.den)}}`;
    case 'pow':
      return `${wrap(n.base, 5)}^{${n.exp}}`;
  }
}
