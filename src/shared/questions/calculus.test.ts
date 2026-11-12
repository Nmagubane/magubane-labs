/**
 * Calculus: every answer is checked against the function in the question, read back out of the prompt (or the
 * figure) and evaluated numerically. Nothing here reuses the generators' construction (roots, turning points):
 * roots are substituted, derivatives are taken by finite differences and maxima are found by search.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion } from './registry.ts';
import { DIFFICULTIES, type GeneratedQuestion } from './types.ts';
import { expressionsEquivalent, isFactorisedForm, parseExpression } from './expr.ts';

type Fn = (x: number) => number;
const SEEDS = 300;
const close = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));

/** Polynomial (or k/x) TeX → a JS function of one variable. */
function texFn(tex: string, v = 'x', extra: string[] = []): (...args: number[]) => number {
  let s = tex
    .replace(/\\dfrac\{([^}]*)\}\{([^}]*)\}/g, '(($1)/($2))')
    .replace(/\s+/g, '')
    .replace(new RegExp(`${v}\\^\\{(\\d+)\\}`, 'g'), `Math.pow(${v},$1)`);
  for (const e of extra) s = s.replace(new RegExp(`${e}(?=${v}|Math)`, 'g'), `${e}*`);
  s = s.replace(/(\d)(?=[A-Za-z(])/g, '$1*').replace(/\)(?=[A-Za-z(\d])/g, ')*');
  return new Function(v, ...extra, `return ${s};`) as (...args: number[]) => number;
}
/** A plain answer expression ("-2xh-h^2+6h", "6x+1") → JS. */
function plainFn(expr: string, vars: string[]): (...args: number[]) => number {
  const one = `[${vars.join('')}]`;
  const s = expr
    .replace(/\s+/g, '')
    .replace(new RegExp(`(${one})(?=${one})`, 'g'), '$1*')
    .replace(new RegExp(`(\\d)(?=${one}|\\()`, 'g'), '$1*')
    .replace(/\)(?=[a-z(\d])/g, ')*')
    .replace(new RegExp(`(${one})\\^(\\d+)`, 'g'), 'Math.pow($1,$2)')
    .replace(/(\d)Math/g, '$1*Math');
  return new Function(...vars, `return ${s};`) as (...args: number[]) => number;
}
/** The first "f(x) = …" (or h(t), V(t), s(t), P(x)) in the prompt. */
function promptFn(q: GeneratedQuestion): { f: Fn; tex: string; v: string } {
  const m = /\$([fhsVP])\(([xt])\) = ([^$]+)\$/.exec(q.prompt);
  assert.ok(m, `no function in "${q.prompt}"`);
  const fn = texFn(m[3]!, m[2]!);
  return { f: (x) => fn(x), tex: m[3]!, v: m[2]! };
}
const d1 = (f: Fn, x: number, h = 1e-5) => (f(x + h) - f(x - h)) / (2 * h);
const d2 = (f: Fn, x: number, h = 1e-3) => (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);
/** Maximum of a unimodal function on [lo, hi] by golden-section search. */
function argmax(f: Fn, lo: number, hi: number): number {
  const g = (Math.sqrt(5) - 1) / 2;
  let a = lo, b = hi;
  for (let i = 0; i < 200; i++) {
    const c = b - g * (b - a);
    const d = a + g * (b - a);
    if (f(c) > f(d)) b = d;
    else a = c;
  }
  return (a + b) / 2;
}
/** Where a smooth function changes sign on [lo, hi]. */
function signChanges(f: Fn, lo: number, hi: number): number[] {
  const out: number[] = [];
  const N = 4000;
  for (let i = 0; i < N; i++) {
    let a = lo + ((hi - lo) * i) / N;
    let b = lo + ((hi - lo) * (i + 1)) / N;
    if (f(a) === 0) {
      out.push(a);
      continue;
    }
    if (f(a) * f(b) >= 0) continue;
    for (let k = 0; k < 80; k++) {
      const m = (a + b) / 2;
      if (f(a) * f(m) <= 0) b = m;
      else a = m;
    }
    out.push((a + b) / 2);
  }
  return out;
}
const num = (q: GeneratedQuestion) => {
  assert.ok(q.answer.kind === 'numeric' || q.answer.kind === 'fraction');
  return q.answer.kind === 'numeric' ? q.answer.value : q.answer.n / q.answer.d;
};
const roots = (q: GeneratedQuestion) => {
  assert.equal(q.answer.kind, 'roots');
  return q.answer.kind === 'roots' ? q.answer.values.map((r) => r.n / r.d) : [];
};
const lineOf = (q: GeneratedQuestion) => {
  assert.equal(q.answer.kind, 'equation');
  const expr = q.answer.kind === 'equation' ? q.answer.expr : '';
  assert.match(expr, /^y=/);
  const g = plainFn(expr.slice(2), ['x']);
  return (x: number) => g(x);
};
const intIn = (re: RegExp, s: string) => {
  const m = re.exec(s);
  assert.ok(m, `${re} not in "${s}"`);
  return Number(m[1]);
};
/** "(x - 2)" → 2, "(x + 3)" → -3 */
const rootOf = (sign: string, n: string) => (sign === '-' ? Number(n) : -Number(n));

function each(id: string, check: (q: GeneratedQuestion, level: number, where: string) => void) {
  test(`${id}: answers checked against the question`, () => {
    for (const level of DIFFICULTIES)
      for (let seed = 1; seed <= SEEDS; seed++) {
        const q = generateQuestion(id, seed * 7907 + level, level);
        check(q, level, `${id} L${level} seed ${seed}: ${q.prompt}`);
      }
  });
}

each('factor-theorem', (q, level, where) => {
  if (level === 2) {
    const m = /f\(x\) = ([^$]+)\$/.exec(q.prompt)!;
    const f = texFn(m[1]!, 'x', ['k']);
    const [, sg, n] = /\$\(x ([+-]) (\d+)\)\$ is a factor/.exec(q.prompt)!;
    assert.ok(close(f(rootOf(sg!, n!), num(q)), 0), where);
    return;
  }
  if (level === 5) {
    const cm = /qx ([+-]) (\d+)\$/.exec(q.prompt)!;
    const c = (cm[1] === '-' ? -1 : 1) * Number(cm[2]);
    const [, s1, n1] = /\$\(x ([+-]) (\d+)\)\$ is a factor/.exec(q.prompt)!;
    const [, s2, n2] = /divided by \$\(x ([+-]) (\d+)\)\$/.exec(q.prompt)!;
    const R = intIn(/remainder is \$(-?\d+)\$/, q.prompt);
    const r = rootOf(s1!, n1!);
    const s = rootOf(s2!, n2!);
    const p = num(q);
    const qq = (-(r ** 3) - p * r * r - c) / r;
    assert.ok(Number.isInteger(Math.round(qq * 1e9) / 1e9), `${where}: q = ${qq} is not a whole number`);
    assert.ok(close(s ** 3 + p * s * s + qq * s + c, R), `${where}: remainder does not match`);
    assert.notEqual(r * r * s - s * s * r, 0, `${where}: p and q are not determined`);
    return;
  }
  if (level === 4) {
    const m = /^Solve for \$x\$: \$([^$]+) = 0\$\.$/.exec(q.prompt);
    assert.ok(m, where);
    const f = texFn(m![1]!);
    const rs = roots(q);
    assert.equal(new Set(rs).size, 3, `${where}: a cubic with three distinct roots needs all three`);
    for (const r of rs) assert.ok(close(f(r), 0, 1e-9), `${where}: f(${r}) ≠ 0`);
    return;
  }
  const { f, tex } = promptFn(q);
  if (level === 1) {
    const [, sg, n] = /divided by \$\(x ([+-]) (\d+)\)\$/.exec(q.prompt)!;
    assert.ok(close(f(rootOf(sg!, n!)), num(q)), where);
  } else if (level === 3) {
    assert.equal(q.answer.kind, 'expression');
    const expr = q.answer.kind === 'expression' ? q.answer.expr : '';
    assert.ok(expressionsEquivalent(expr, tex.replace(/[{}]/g, '')), `${where}: ${expr} does not expand to f(x)`);
    assert.ok(isFactorisedForm(parseExpression(expr)), `${where}: ${expr} is not fully factorised`);
    const [, sg, n] = /\$\(x ([+-]) (\d+)\)\$ is a factor/.exec(q.prompt)!;
    assert.ok(close(f(rootOf(sg!, n!)), 0), `${where}: the given factor is not a factor`);
  }
});

each('first-principles', (q, level, where) => {
  if (level === 1) {
    const m = /\\lim_\{x \\to (-?\d+)\} \\frac\{(.+)\}\{(x [+-] \d+)\}\$/.exec(q.prompt)!;
    const top = texFn(m[2]!);
    const bottom = texFn(m[3]!);
    const r = Number(m[1]);
    for (const e of [1e-6, -1e-6]) assert.ok(close(top(r + e) / bottom(r + e), num(q), 1e-4), where);
    return;
  }
  const { f } = promptFn(q);
  if (level === 2) {
    const a = intIn(/f\((-?\d+) \+ h\)/, q.prompt);
    assert.ok(close((f(a + 1e-7) - f(a)) / 1e-7, num(q), 1e-4), where);
  } else if (level === 3) {
    assert.equal(q.answer.kind, 'expression');
    const g = plainFn(q.answer.kind === 'expression' ? q.answer.expr : '', ['x', 'h']);
    for (const [x, h] of [[1.3, 0.7], [-2.1, 1.9], [0.4, -0.6]] as const) assert.ok(close(g(x, h), f(x + h) - f(x)), where);
  } else if (level === 4) {
    assert.equal(q.answer.kind, 'expression');
    const g = plainFn(q.answer.kind === 'expression' ? q.answer.expr : '', ['x']);
    for (const x of [-2.3, -0.4, 1.7, 3.1]) assert.ok(close(g(x), d1(f, x), 1e-6), where);
  } else {
    const a = intIn(/find \$f'\((-?\d+)\)\$/, q.prompt);
    assert.ok(close(num(q), d1(f, a), 1e-6), where);
  }
});

each('tangent-lines', (q, level, where) => {
  const { f } = promptFn(q);
  if (level === 1 || level === 2) {
    const x0 = intIn(/where \$x = (-?\d+)\$/, q.prompt);
    const l = lineOf(q);
    assert.ok(close(l(x0), f(x0)), `${where}: the tangent misses the point of contact`);
    assert.ok(close(l(1) - l(0), d1(f, x0), 1e-6), `${where}: wrong gradient`);
  } else if (level === 3) {
    const m = intIn(/tangent is \$(-?\d+)\$/, q.prompt);
    assert.equal(q.answer.kind, 'point');
    if (q.answer.kind !== 'point') return;
    const x = q.answer.x.n / q.answer.x.d;
    const y = q.answer.y.n / q.answer.y.d;
    assert.ok(close(f(x), y) && close(d1(f, x), m, 1e-6), where);
  } else if (level === 4) {
    const l = lineOf(q);
    const slope = l(1) - l(0);
    const par = /parallel to the line \$y = ([^$]+)\$/.exec(q.prompt);
    const perp = /perpendicular to the line \$x ([+-]) (\d*)y = (-?\d+)\$/.exec(q.prompt);
    if (par) {
      const g = plainFn(par[1]!.replace(/\s+/g, ''), ['x']);
      assert.ok(close(slope, g(1) - g(0)), `${where}: not parallel`);
    } else {
      assert.ok(perp, where);
      const k = (perp![1] === '-' ? -1 : 1) * (perp![2] ? Number(perp![2]) : 1);
      assert.ok(close(slope * (-1 / k), -1), `${where}: not perpendicular`);
    }
    // The line touches the parabola: f − l has a double root.
    let best = 0;
    for (let x = -12; x <= 12; x += 0.001) if (Math.abs(f(x) - l(x)) < Math.abs(f(best) - l(best))) best = x;
    assert.ok(Math.abs(f(best) - l(best)) < 1e-4 && close(d1(f, best), slope, 1e-3), `${where}: the line is not a tangent`);
  } else {
    const m = /parallel to the line \$y = ([^$]+)\$/.exec(q.prompt)!;
    const g = plainFn(m[1]!.replace(/\s+/g, ''), ['x']);
    const slope = g(1) - g(0);
    const rs = roots(q);
    assert.equal(new Set(rs).size, 2, where);
    for (const r of rs) assert.ok(close(d1(f, r), slope, 1e-6), `${where}: f'(${r}) ≠ ${slope}`);
  }
});

each('cubic-graphs', (q, level, where) => {
  if (level === 3) {
    assert.ok(q.figure?.kind === 'graph', where);
    if (q.figure?.kind !== 'graph') return;
    const pts = q.figure.points ?? [];
    const rs = pts.filter((p) => p.y === 0).map((p) => p.x);
    const yi = pts.find((p) => p.x === 0)!;
    assert.equal(rs.length, 3, where);
    const a = num(q);
    const f = (x: number) => a * rs.reduce((s, r) => s * (x - r), 1);
    assert.ok(close(f(0), yi.y), `${where}: the curve with this a misses the y-intercept`);
    for (const c of q.figure.curves ?? []) for (const [x, y] of c.pts.filter((_, i) => i % 20 === 0)) assert.ok(Math.abs(f(x) - y) <= Math.abs(d1(f, x)) * 6e-4 + 1e-3, `${where}: the drawn curve is not f`);
    return;
  }
  if (level === 4) {
    assert.ok(q.figure?.kind === 'graph', where);
    if (q.figure?.kind !== 'graph') return;
    const [p, r] = (q.figure.points ?? []).map((pt) => pt.x).sort((u, v) => u - v) as [number, number];
    const curve = (q.figure.curves ?? []).flatMap((c) => c.pts);
    const at = (x: number) => {
      const i = curve.findIndex((pt, k) => k > 0 && curve[k - 1]![0] <= x && pt[0] >= x);
      const [x0, y0] = curve[i - 1]!;
      const [x1, y1] = curve[i]!;
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    };
    const between = at((p + r) / 2);
    assert.ok(Math.abs(at(p)) < 0.02 && Math.abs(at(r)) < 0.02, `${where}: the marked intercepts are not on the curve`);
    // f' > 0 outside the roots and < 0 between them (a > 0), or the other way round.
    const maxAt = between < 0 ? p : r;
    const minAt = between < 0 ? r : p;
    if (/local maximum/.test(q.prompt)) assert.equal(num(q), maxAt, where);
    else if (/local minimum/.test(q.prompt)) assert.equal(num(q), minAt, where);
    else {
      // concave down where f' is decreasing; f' turns at its vertex
      const vertex = curve.reduce((b, pt) => ((between < 0 ? pt[1] < b[1] : pt[1] > b[1]) ? pt : b))[0];
      assert.ok(Math.abs(vertex - num(q)) < 0.06, `${where}: f' turns at ${vertex}, not ${num(q)}`);
      const decreasingLeft = between < 0; // opens up: falls to the left of its minimum
      assert.ok(q.prompt.includes(decreasingLeft ? 'x < k' : 'x > k'), `${where}: wrong side`);
    }
    return;
  }
  const { f } = promptFn(q);
  if (level === 1) {
    const c = num(q);
    assert.ok(Math.abs(d2(f, c)) < 1e-3, `${where}: f''(${c}) ≠ 0`);
    if (/concave (up|down) for \$x > c\$/.test(q.prompt)) {
      const up = /concave up/.test(q.prompt);
      assert.ok(up ? d2(f, c + 1) > 0 : d2(f, c + 1) < 0, `${where}: wrong concavity`);
    }
  } else if (level === 2) {
    assert.equal(q.answer.kind, 'point');
    if (q.answer.kind !== 'point') return;
    const x = q.answer.x.n / q.answer.x.d;
    assert.ok(close(f(x), q.answer.y.n / q.answer.y.d) && Math.abs(d1(f, x)) < 1e-6, `${where}: not a turning point`);
    assert.ok(/maximum/.test(q.prompt) ? d2(f, x) < 0 : d2(f, x) > 0, `${where}: wrong kind of turning point`);
  } else {
    const xs = signChanges((x) => d1(f, x), -20, 20);
    assert.equal(xs.length, 2, where);
    const [ya, yb] = xs.map(f).sort((u, v) => u - v) as [number, number];
    let count = 0;
    for (let k = Math.ceil(ya - 1); k <= yb + 1; k++) if (k > ya + 1e-6 && k < yb - 1e-6) count++;
    assert.equal(num(q), count, where);
  }
});

each('optimisation', (q, level, where) => {
  if (level === 4) {
    const [, L, W] = /from a (\d+) cm by (\d+) cm sheet/.exec(q.prompt)!.map(Number) as [number, number, number];
    const V = (x: number) => x * (L - 2 * x) * (W - 2 * x);
    const x = argmax(V, 0, Math.min(L, W) / 2);
    assert.ok(close(num(q), /largest possible volume/.test(q.prompt) ? V(x) : x, 1e-6), where);
    return;
  }
  if (level === 5 && /fencing/.test(q.prompt)) {
    const P = intIn(/has (\d+) m of fencing/, q.prompt);
    const A = (x: number) => x * (P - 2 * x);
    assert.ok(close(num(q), A(argmax(A, 0, P / 2)), 1e-6), where);
    return;
  }
  const { f } = promptFn(q);
  if (level === 1) {
    const T = /after (\d) s/.test(q.prompt) ? intIn(/after (\d) s/, q.prompt) : intIn(/when \$t = (\d+)\$/, q.prompt);
    assert.ok(close(num(q), d1(f, T), 1e-6), where);
  } else if (level === 2) {
    assert.ok(close(num(q), f(argmax(f, 0, 20)), 1e-6), where);
  } else if (level === 3) {
    if (/at rest/.test(q.prompt)) {
      const rs = roots(q);
      assert.equal(new Set(rs).size, 2, where);
      for (const r of rs) assert.ok(r > 0 && Math.abs(d1(f, r)) < 1e-6, `${where}: v(${r}) ≠ 0`);
    } else {
      const T = intIn(/when \$t = (\d+)\$/, q.prompt);
      assert.ok(close(num(q), d2(f, T), 1e-4), where);
    }
  } else {
    const x = argmax(f, 0, 20);
    assert.ok(close(num(q), /How many hundred/.test(q.prompt) ? x : f(x), 1e-6), where);
  }
});
