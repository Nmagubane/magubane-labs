/**
 * Derivatives with negative and fractional powers: the function is read from the prompt and differentiated
 * numerically (central differences), never with the power rule. Every answer must match that derivative at several
 * points, and every predicted mistake must differ from it. Tangents must touch the curve with the right gradient;
 * turning points must have f′ = 0, f′ changing sign, and the y-value from f.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion } from './registry.ts';
import { DIFFICULTIES } from './types.ts';
import { parseFormula, evaluate } from './formula.ts';

const SEEDS = 300;

function plain(tex: string): string {
  let s = tex.replace(/\\left|\\right|\\,|\\;/g, '');
  for (let i = 0; i < 6; i++)
    s = s
      .replace(/\^\{([^{}]*)\}/g, '^($1)')
      .replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))')
      .replace(/\\sqrt\[(\d+)\]\{([^{}]*)\}/g, '(($2)^(1/$1))')
      .replace(/\\sqrt\{([^{}]*)\}/g, '√($1)');
  return s.replace(/\{/g, '(').replace(/\}/g, ')');
}
const fOf = (prompt: string) => {
  const m = /(?:f\(x\)|y) = ([^$]+)\$/.exec(prompt);
  assert.ok(m, `no function in ${prompt}`);
  const f = parseFormula(plain(m[1]!));
  return (x: number) => evaluate(f, { x });
};
const slope = (f: (x: number) => number, x: number) => {
  const h = 1e-5;
  return (f(x + h) - f(x - h)) / (2 * h);
};
const near = (a: number, b: number) => Math.abs(a - b) <= 1e-5 * Math.max(1, Math.abs(a), Math.abs(b));
const XS = [0.7, 1.3, 2.1, 3.4, 5.9];

test('derivatives of negative and fractional powers match numerical differentiation', () => {
  for (const level of DIFFICULTIES)
    for (let seed = 0; seed < SEEDS; seed++) {
      const q = generateQuestion('derivative-powers', seed, level);
      const label = `L${level} seed ${seed}: ${q.prompt}`;
      const f = fOf(q.prompt);
      const a = q.answer;
      if (a.kind === 'formula') {
        const g = parseFormula(a.expr);
        for (const x of XS) assert.ok(near(evaluate(g, { x }), slope(f, x)), `${label} at x = ${x}: ${a.expr}`);
        for (const m of q.misconceptions) {
          if (m.answer.kind !== 'formula') continue;
          const w = parseFormula(m.answer.expr);
          assert.ok(XS.some((x) => !near(evaluate(w, { x }), slope(f, x))), `${label}: mistake ${m.answer.expr} is right`);
        }
      } else if (a.kind === 'fraction') {
        const x = Number(/at \$x = (\d+)\$/.exec(q.prompt)![1]);
        assert.ok(near(a.n / a.d, slope(f, x)), label);
      } else if (a.kind === 'equation') {
        const x0 = Number(/where \$x = (-?\d+)\$/.exec(q.prompt)![1]);
        const [l, r] = a.expr.split('=');
        assert.equal(l, 'y');
        const line = parseFormula(r!);
        const y = (x: number) => evaluate(line, { x });
        assert.ok(near(y(x0), f(x0)), `${label}: the tangent misses the curve`);
        assert.ok(near(y(x0 + 1) - y(x0), slope(f, x0)), `${label}: wrong gradient`);
      } else if (a.kind === 'point') {
        const x = a.x.n / a.x.d;
        const yv = a.y.n / a.y.d;
        assert.ok(Math.abs(slope(f, x)) < 1e-5, `${label}: f'(${x}) = ${slope(f, x)}`);
        assert.ok(near(f(x), yv), `${label}: f(${x}) = ${f(x)}, not ${yv}`);
        const d = Math.max(0.01, Math.abs(x) * 0.01);
        assert.ok(Math.sign(slope(f, x - d)) !== Math.sign(slope(f, x + d)), `${label}: f' does not change sign`);
      } else assert.fail(`${label}: unexpected answer ${a.kind}`);
    }
});
