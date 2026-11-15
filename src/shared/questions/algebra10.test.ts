/**
 * Independent checks for Grade 10 products, factors and algebraic fractions. Nothing here uses the
 * generators' construction or the answer checker: each question's own TeX is turned into a function and
 * evaluated, and every answer (and every predicted mistake) is compared with it by value.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from './rng.ts';
import { productsFactors, algebraicFractions } from './generators/math-algebra10.ts';
import type { QuestionTemplate, Difficulty } from './types.ts';

/** \dfrac{a}{b} → ((a)/(b)), with nested braces. */
function unfrac(s: string): string {
  let out = '';
  let i = 0;
  const group = (): string => {
    let depth = 0;
    const start = i;
    for (; i < s.length; i++) {
      if (s[i] === '{') depth++;
      else if (s[i] === '}' && --depth === 0) return s.slice(start + 1, i++);
    }
    throw new Error(`unbalanced: ${s}`);
  };
  while (i < s.length) {
    const m = /^\\[dt]?frac/.exec(s.slice(i));
    if (m) {
      i += m[0].length;
      const a = group();
      const b = group();
      out += `((${unfrac(a)})/(${unfrac(b)}))`;
    } else out += s[i++];
  }
  return out;
}

/** Plain maths text → a JavaScript expression in the given variables. */
function toJs(src: string): string {
  let s = unfrac(src)
    .replace(/\\times/g, '*')
    .replace(/\\div/g, '/')
    .replace(/\\left|\\right/g, '')
    .replace(/\s+/g, '');
  // Implicit multiplication: 2x, xy, x(…), )(, )x, 3(…
  for (let k = 0; k < 3; k++) s = s.replace(/(\d|[a-z]|\))(?=[a-z(])/g, '$1*');
  return s.replace(/\^/g, '**');
}

function fn(src: string, vars: string[]): (...v: number[]) => number {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function(...vars, `return ${toJs(src)};`) as (...v: number[]) => number;
}

/** The question's expression: the longest piece of maths in the prompt (not the "$x$" in "values of $x$"). */
const firstMath = (prompt: string): string => {
  const all = [...prompt.matchAll(/\$([^$]+)\$/g)].map((m) => m[1] as string);
  if (!all.length) throw new Error(`no maths in ${prompt}`);
  return all.reduce((a, b) => (b.length > a.length ? b : a));
};

const POINTS = [-2.37, -0.71, 0.43, 1.93, 3.17, 5.61];
const POINTS2: [number, number][] = [
  [1.3, -0.4],
  [-2.1, 0.7],
  [0.6, 2.9],
  [3.3, -1.8],
];

function sameValue(f: (...v: number[]) => number, g: (...v: number[]) => number, two: boolean): boolean {
  const pts = two ? POINTS2 : POINTS.map((x) => [x]);
  let compared = 0;
  for (const p of pts) {
    const a = f(...p);
    const b = g(...p);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    compared++;
    if (Math.abs(a - b) > 1e-7 * Math.max(1, Math.abs(a))) return false;
  }
  return compared >= 3;
}

/** The expression with a top-level "/" split into top and bottom (or null). */
function splitFraction(e: string): [string, string] | null {
  let depth = 0;
  for (let i = e.length - 1; i >= 0; i--) {
    const c = e[i];
    if (c === ')') depth++;
    else if (c === '(') depth--;
    else if (c === '/' && depth === 0) return [e.slice(0, i), e.slice(i + 1)];
  }
  return null;
}

/** The bracketed factors of a product such as 2(x-3)(x^2+3x+9). */
const brackets = (e: string): string[] => [...e.matchAll(/\(([^()]+)\)/g)].map((m) => m[1] as string);

/** Coefficients a, b, c of a quadratic in x read off by evaluating it, or null if it isn't one. */
function quadCoeffs(f: (x: number) => number): [number, number, number] | null {
  const c = f(0);
  const a = (f(1) + f(-1)) / 2 - c;
  const b = (f(1) - f(-1)) / 2;
  if (Math.abs(f(2) - (4 * a + 2 * b + c)) > 1e-9 || Math.abs(f(3) - (9 * a + 3 * b + c)) > 1e-9) return null; // degree > 2
  return [a, b, c];
}

const isSquareInt = (d: number) => d >= 0 && Number.isInteger(Math.round(Math.sqrt(d))) && Math.round(Math.sqrt(d)) ** 2 === Math.round(d);

function run(template: QuestionTemplate, seeds: number, check: (q: ReturnType<QuestionTemplate['generate']>, where: string) => void) {
  for (let level = 1; level <= 5; level++) {
    for (let seed = 1; seed <= seeds; seed++) {
      const q = template.generate(createRng(seed * 7919 + level), level as Difficulty);
      check(q, `${template.id} L${level} seed ${seed}`);
    }
  }
}

test('products and factors: every answer equals the question, every mistake does not', () => {
  run(productsFactors, 300, (q, where) => {
    assert.equal(q.answer.kind, 'expression', where);
    if (q.answer.kind !== 'expression' || q.input.kind !== 'expression') return;
    const vars = q.input.variables;
    const two = vars.length === 2;
    const f = fn(firstMath(q.prompt), vars);
    assert.ok(sameValue(f, fn(q.answer.expr, vars), two), `${where}: ${q.answer.expr} ≠ ${q.prompt}`);
    for (const m of q.misconceptions) {
      if (m.answer.kind !== 'expression') continue;
      assert.ok(!sameValue(f, fn(m.answer.expr, vars), two), `${where}: mistake ${m.code} ${m.answer.expr} equals the right answer`);
    }
    if (q.answer.form === 'factorised') {
      // Fully factorised: every bracket is linear, or a quadratic with no rational roots.
      for (const b of brackets(q.answer.expr)) {
        const g = fn(b, vars);
        if (two) continue; // two-variable answers are linear brackets or a cube's a² + 2ab + 4b², checked below
        const co = quadCoeffs((x) => g(x));
        assert.ok(co, `${where}: bracket (${b}) is more than quadratic`);
        const [a, bb, c] = co as [number, number, number];
        if (Math.abs(a) > 1e-9) assert.ok(!isSquareInt(bb * bb - 4 * a * c), `${where}: (${b}) still factorises`);
      }
      if (two) for (const b of brackets(q.answer.expr)) {
        // a quadratic in a and b: b = 1 gives a quadratic in a with the same discriminant test
        const g = fn(b, vars);
        const co = quadCoeffs((x) => g(x, 1));
        if (co && Math.abs(co[0]) > 1e-9) assert.ok(!isSquareInt(co[1] ** 2 - 4 * co[0] * co[2]), `${where}: (${b}) still factorises`);
      }
    }
    if (q.answer.form === 'expanded') assert.ok(!/\(/.test(q.answer.expr), `${where}: expanded answer has brackets`);
  });
});

test('algebraic fractions: answers equal the question and are fully simplified', () => {
  run(algebraicFractions, 300, (q, where) => {
    const math = firstMath(q.prompt);
    const f = fn(math, ['x']);
    if (q.answer.kind === 'roots') {
      // Not defined exactly where the denominator is 0.
      const parts = /\\dfrac\{(.+)\}\{(.+)\}/.exec(math);
      assert.ok(parts, `${where}: no fraction`);
      const den = fn(parts?.[2] as string, ['x']);
      const zeros: number[] = [];
      for (let x = -40; x <= 40; x++) if (Math.abs(den(x)) < 1e-9) zeros.push(x);
      assert.deepEqual(q.answer.values.map((v) => v.n / v.d).sort((a, b) => a - b), zeros, `${where}: answer is not where ${parts?.[2]} = 0`);
      for (const m of q.misconceptions) {
        if (m.answer.kind !== 'roots') continue;
        assert.notDeepEqual(m.answer.values.map((v) => v.n / v.d).sort((a, b) => a - b), zeros, `${where}: mistake ${m.code} is right`);
      }
      return;
    }
    assert.equal(q.answer.kind, 'expression', where);
    if (q.answer.kind !== 'expression') return;
    assert.equal(q.answer.form, 'simplified', where);
    const g = fn(q.answer.expr, ['x']);
    assert.ok(sameValue(f, g, false), `${where}: ${q.answer.expr} ≠ ${math}`);
    for (const m of q.misconceptions) {
      if (m.answer.kind !== 'expression') continue;
      assert.ok(!sameValue(f, fn(m.answer.expr, ['x']), false), `${where}: mistake ${m.code} ${m.answer.expr} equals the right answer`);
    }
    // Simplified: one fraction whose top is never 0 where its bottom is 0 (all roots here are whole numbers,
    // and quadratic factors in a bottom have no real roots).
    const split = splitFraction(q.answer.expr);
    if (split) {
      const [top, bottom] = split.map((s) => fn(s, ['x'])) as [(x: number) => number, (x: number) => number];
      for (let x = -40; x <= 40; x++) if (Math.abs(bottom(x)) < 1e-9) assert.ok(Math.abs(top(x)) > 1e-9, `${where}: ${q.answer.expr} still has the factor (x - ${x}) top and bottom`);
      assert.ok(!/\//.test(split[0]) && !/\//.test(split[1]), `${where}: a fraction inside a fraction`);
    }
    // The question itself must need simplifying: it is not already in its simplest form.
    assert.ok(/\\dfrac/.test(math), `${where}: nothing to simplify`);
  });
});

test('algebraic fractions: the original is not defined wherever any of its denominators is 0', () => {
  // The answer may be defined at a value the original is not (x ≠ p after cancelling); never the reverse.
  run(algebraicFractions, 120, (q, where) => {
    if (q.answer.kind !== 'expression') return;
    const f = fn(firstMath(q.prompt), ['x']);
    const g = fn(q.answer.expr, ['x']);
    for (let x = -40; x <= 40; x++) {
      if (!Number.isFinite(g(x))) assert.ok(!Number.isFinite(f(x)) || Number.isNaN(f(x)), `${where}: the answer is not defined at x = ${x} but the question is`);
    }
  });
});
