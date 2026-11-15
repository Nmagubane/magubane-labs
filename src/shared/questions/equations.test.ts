/**
 * Equations and inequalities: every answer is checked against the question as the learner sees it.
 * Equations are read back out of the prompt (TeX → a formula) and answers substituted into them. Inequality answers
 * are checked value by value: at every boundary, just either side of it, and at whole numbers from -30 to 30, a value is
 * in the answer set exactly when it makes the original inequality true. Conditions on k are checked by working out the
 * discriminant at each test value of k. Nothing reuses the generators' algebra.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion } from './registry.ts';
import { DIFFICULTIES, type GeneratedQuestion, type IneqInterval } from './types.ts';
import { parseFormula, evaluate, formulasEquivalent } from './formula.ts';
import { parseInequality, fromWire, contains, sameSet, type Interval } from './inequality.ts';
import { gradeResponse } from './answer.ts';

const SEEDS = 300;
const EPS = 1e-9;

/** TeX (as the generators write it) → plain text the formula parser reads. */
function plain(tex: string): string {
  let s = tex.replace(/\\left|\\right|\\,|\\;/g, '').replace(/\\cdot/g, '*').replace(/\\pi/g, 'π').replace(/\\times/g, '*');
  for (let i = 0; i < 6; i++) s = s.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))').replace(/\\sqrt\{([^{}]*)\}/g, '√($1)');
  return s.replace(/\{/g, '(').replace(/\}/g, ')');
}
const ev = (tex: string, env: Record<string, number>) => evaluate(parseFormula(plain(tex)), env);
/** The $…$ pieces of a prompt. */
const maths = (prompt: string) => [...prompt.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]!);
const set = (q: GeneratedQuestion): Interval[] => {
  assert.equal(q.answer.kind, 'inequality');
  return fromWire((q.answer as { set: IneqInterval[] }).set);
};
const ends = (s: Interval[]) => s.flatMap((iv) => [iv.lo, iv.hi]).filter((e) => e !== null).map((e) => e.n / e.d);
/** Test values: whole numbers, every boundary and values just either side of it. */
const testPoints = (s: Interval[], extra: number[] = []) => {
  const pts = new Set<number>();
  for (let i = -30; i <= 30; i++) pts.add(i);
  for (const e of [...ends(s), ...extra]) for (const d of [0, 0.01, -0.01, 0.5, -0.5]) pts.add(e + d);
  return [...pts];
};

const OPS: Record<string, (a: number, b: number) => boolean> = {
  '\\le': (a, b) => a <= b + EPS,
  '\\ge': (a, b) => a >= b - EPS,
  '<': (a, b) => a < b - EPS,
  '>': (a, b) => a > b + EPS,
  '=': (a, b) => Math.abs(a - b) < EPS,
};
/** Is a chain such as "3 < 2x + 1 \le 9" true at x? */
function chainHolds(tex: string, env: Record<string, number>): boolean {
  const parts = tex.split(/(\\le|\\ge|<|>)/).map((p) => p.trim());
  for (let i = 1; i < parts.length; i += 2) if (!OPS[parts[i]!]!(ev(parts[i - 1]!, env), ev(parts[i + 1]!, env))) return false;
  return true;
}
const isIneq = (t: string) => /\\le|\\ge|<|>/.test(t);

function checkSetAgainst(q: GeneratedQuestion, holds: (x: number) => boolean, label: string, v = 'x') {
  const s = set(q);
  for (const x of testPoints(s)) assert.equal(contains(s, x), holds(x), `${label}: ${v} = ${x} (${q.prompt} → ${q.answerDisplay})`);
}

// ---------------------------------------------------------------------------

test('simultaneous equations: the answer satisfies both equations', () => {
  for (const level of DIFFICULTIES)
    for (let seed = 0; seed < SEEDS; seed++) {
      const q = generateQuestion('simultaneous-equations', seed, level);
      const label = `L${level} seed ${seed}`;
      const eqs = maths(q.prompt).filter((t) => t.includes('=') && /x|y/.test(t) && !/^\(x; y\)$/.test(t));
      if (q.answer.kind === 'point') {
        const env = { x: q.answer.x.n / q.answer.x.d, y: q.answer.y.n / q.answer.y.d };
        assert.equal(eqs.length, 2, label);
        for (const e of eqs) {
          const [l, r] = e.split('=');
          assert.ok(Math.abs(ev(l!, env) - ev(r!, env)) < EPS, `${label}: ${e} at (${env.x}; ${env.y})`);
        }
        // A unique solution: the two lines are not parallel.
        const grad = (e: string) => {
          const [l, r] = e.split('=');
          const g = (x: number, y: number) => ev(l!, { x, y }) - ev(r!, { x, y });
          return [g(1, 0) - g(0, 0), g(0, 1) - g(0, 0)];
        };
        const [[a1, b1], [a2, b2]] = [grad(eqs[0]!), grad(eqs[1]!)];
        assert.ok(Math.abs(a1! * b2! - a2! * b1!) > EPS, `${label}: parallel lines`);
      } else if (q.answer.kind === 'roots') {
        assert.equal(eqs.length, 2, label);
        const [line, other] = eqs[0]!.startsWith('y =') && !eqs[0]!.includes('x^') ? [eqs[0]!, eqs[1]!] : [eqs[1]!, eqs[0]!];
        const yOf = (x: number) => ev(line.split('=')[1]!, { x });
        const g = (x: number) => {
          const [l, r] = other.split('=');
          return ev(l!, { x, y: yOf(x) }) - ev(r!, { x, y: yOf(x) });
        };
        const xs = q.answer.values.map((r) => r.n / r.d);
        assert.equal(new Set(xs).size, 2, `${label}: two different x-values`);
        for (const x of xs) assert.ok(Math.abs(g(x)) < EPS, `${label}: x = ${x} in ${q.prompt}`);
        // g is a quadratic in x that is not identically zero, so it has no other roots.
        assert.ok([0.5, 7.3, -6.1].some((x) => Math.abs(g(x)) > EPS), `${label}: identity`);
      } else {
        // Word problem: the hint's two equations come from the story; check the story's numbers satisfy them.
        assert.equal(q.answer.kind, 'numeric');
        const h = /\$a \+ b = (\d+)\$ and \$(\d+)a \+ (\d+)b = (\d+)\$/.exec(q.hints[1]!);
        assert.ok(h, label);
        const [N, pa, pb, T] = h.slice(1).map(Number) as [number, number, number, number];
        for (const n of [N, T, pa, pb]) assert.ok(q.prompt.includes(String(n)), `${label}: ${n} not in the story`);
        const ans = q.answer.value;
        const asksA = q.input.kind === 'numeric' && /How many (adult|large|R5|three|minibus)/.test(q.prompt);
        const a = asksA ? ans : N - ans;
        assert.equal(pa * a + pb * (N - a), T, `${label}: ${q.prompt}`);
      }
    }
});

test('changing the subject: the answer turns the formula into an identity; the wrong answers do not', () => {
  for (const level of DIFFICULTIES)
    for (let seed = 0; seed < SEEDS; seed++) {
      const q = generateQuestion('literal-equations', seed, level);
      const label = `L${level} seed ${seed}`;
      assert.equal(q.answer.kind, 'formula');
      if (q.answer.kind !== 'formula') continue;
      const formula = maths(q.prompt)[0]!;
      const subject = maths(q.prompt)[1]!;
      const [lhs, rhs] = formula.split('=');
      const vars = q.answer.variables;
      const residual = (expr: string, env: Record<string, number>) => {
        const full = { ...env, [subject]: evaluate(parseFormula(expr), env) };
        return ev(lhs!, full) - ev(rhs!, full);
      };
      const envs = [0, 1, 2, 3, 4].map((i) => Object.fromEntries(vars.map((v, j) => [v, 1.3 + 0.37 * ((i * 3 + j * 5) % 7) + 0.11 * j])));
      for (const env of envs) {
        const r = residual(q.answer.expr, env);
        assert.ok(Number.isFinite(r) && Math.abs(r) < 1e-7, `${label}: ${q.answer.expr} in ${formula} at ${JSON.stringify(env)}`);
      }
      for (const m of q.misconceptions) {
        if (m.answer.kind !== 'formula') continue;
        const expr = m.answer.expr;
        assert.ok(envs.some((env) => Math.abs(residual(expr, env)) > 1e-6), `${label}: misconception ${expr} also works`);
      }
    }
});

test('linear inequalities: a value is in the answer exactly when it satisfies the inequality', () => {
  for (const level of DIFFICULTIES)
    for (let seed = 0; seed < SEEDS; seed++) {
      const q = generateQuestion('linear-inequalities', seed, level);
      const label = `L${level} seed ${seed}`;
      if (q.figure?.kind === 'numberline') {
        assert.ok(sameSet(fromWire(q.figure.set), set(q)), `${label}: number line and answer differ`);
        continue;
      }
      const tex = maths(q.prompt).find(isIneq)!;
      assert.ok(tex, label);
      const holds = (x: number) => chainHolds(tex, { x });
      if (q.answer.kind === 'numeric') {
        const sols = [];
        for (let x = -200; x <= 200; x++) if (holds(x)) sols.push(x);
        const want = /How many/.test(q.prompt) ? sols.length : /largest/.test(q.prompt) ? Math.max(...sols) : Math.min(...sols);
        assert.equal(q.answer.value, want, `${label}: ${q.prompt}`);
        continue;
      }
      checkSetAgainst(q, holds, label);
    }
});

test('quadratic inequalities: a value is in the answer exactly when it satisfies the inequality (or the graph)', () => {
  for (const level of DIFFICULTIES)
    for (let seed = 0; seed < SEEDS; seed++) {
      const q = generateQuestion('quadratic-inequalities', seed, level);
      const label = `L${level} seed ${seed}`;
      if (q.figure?.kind === 'graph') {
        // Read the inequality off the curve itself: compare each sampled point with the axis or the line.
        const f = q.figure;
        const op = /is \$f\(x\) (\\le|\\ge|<|>) (0|g\(x\))\$/.exec(q.prompt);
        assert.ok(op, label);
        const s = set(q);
        const crit = (f.points ?? []).map((p) => p.x);
        // The line g is the curve labelled g: read its gradient and intercept from two of its points.
        const gPts = (f.curves ?? []).find((c) => c.label === 'g')?.pts;
        const gm = gPts ? (gPts.at(-1)![1] - gPts[0]![1]) / (gPts.at(-1)![0] - gPts[0]![0]) : 0;
        const g = (x: number) => (gPts ? gPts[0]![1] + gm * (x - gPts[0]![0]) : 0);
        assert.equal(op[2] === '0', !gPts, `${label}: the line is drawn exactly when the question asks about g`);
        for (const c of (f.curves ?? []).filter((cv) => cv.label !== 'g' && !(gPts && cv.pts.every(([x, y]) => Math.abs(y - g(x)) < 0.01))))
          for (const [x, y] of c.pts) {
            if (crit.some((r) => Math.abs(x - r) < 0.08)) continue;
            const other: number = g(x);
            assert.equal(contains(s, x), OPS[op[1]!]!(y, other), `${label}: x = ${x}`);
          }
        // At the critical values, f equals the other side, so they are in the set exactly when the sign allows equality.
        for (const r of crit) assert.equal(contains(s, r), op[1] === '\\le' || op[1] === '\\ge', `${label}: critical value ${r}`);
        continue;
      }
      const tex = maths(q.prompt).find(isIneq)!;
      checkSetAgainst(q, (x) => chainHolds(tex, { x }), label);
    }
});

test('roots with a parameter: the answer is exactly the k-values that give the stated roots', () => {
  for (const level of DIFFICULTIES)
    for (let seed = 0; seed < SEEDS; seed++) {
      const q = generateQuestion('roots-parameter', seed, level);
      const label = `L${level} seed ${seed}`;
      const eq = maths(q.prompt).find((t) => t.includes('k') && t.includes('='))!;
      assert.ok(eq, label);
      const [l, r] = eq.split('=');
      const p = (x: number, k: number) => ev(l!, { x, k }) - ev(r!, { x, k });
      /** a, b and c of the quadratic in x for this k (p is a polynomial of degree at most 2 in x). */
      const abc = (k: number) => {
        const c = p(0, k);
        const a = (p(1, k) + p(-1, k)) / 2 - c;
        const b = (p(1, k) - p(-1, k)) / 2;
        return { a, b, c, D: b * b - 4 * a * c };
      };
      if (level === 1) {
        const root = Number(/^\$x = (-?\d+)\$/.exec(q.prompt)![1]);
        assert.equal(q.answer.kind, 'numeric');
        if (q.answer.kind === 'numeric') assert.ok(Math.abs(p(root, q.answer.value)) < EPS, `${label}: ${q.prompt}`);
        continue;
      }
      if (q.answer.kind === 'roots') {
        for (const v of q.answer.values) {
          const { a, D } = abc(v.n / v.d);
          assert.ok(Math.abs(a) > EPS && Math.abs(D) < 1e-7, `${label}: k = ${v.n}/${v.d} gives Δ = ${D}`);
        }
        // Δ is a polynomial of degree ≤ 2 in k, so if it has the stated number of zeros there are no others.
        const ks = q.answer.values.map((v) => v.n / v.d);
        const others = [-20.3, -7.7, 0.37, 5.1, 13.9].filter((k) => !ks.includes(k));
        assert.ok(others.every((k) => Math.abs(abc(k).D) > EPS), `${label}: another k gives equal roots`);
        continue;
      }
      const cond = /non-real/.test(q.prompt) ? 'nonreal' : /real and unequal/.test(q.prompt) ? 'unequal' : 'real';
      const quadratic = /quadratic equation/.test(q.prompt);
      checkSetAgainst(
        q,
        (k) => {
          const { a, D } = abc(k);
          if (quadratic && Math.abs(a) < EPS) return false;
          return cond === 'real' ? D >= -1e-9 : cond === 'unequal' ? D > 1e-9 : D < -1e-9;
        },
        label,
        'k',
      );
      // k = 0 is tested too when it matters.
      if (quadratic) assert.equal(contains(set(q), 0), false, `${label}: k = 0 is not quadratic`);
    }
});

// ---------------------------------------------------------------------------
// The answer checkers themselves

test('inequality answers are read in the forms learners write them', () => {
  const same = (a: string, b: string, v = 'x') => sameSet(parseInequality(a, v), parseInequality(b, v));
  assert.ok(same('x < -2 or x > 3', 'x>3 or x<-2'));
  assert.ok(same('x ≤ 4 and x > -1', '-1 < x <= 4'));
  assert.ok(same('4 >= x > -1', '-1 < x ≤ 4'));
  assert.ok(same('x ∈ (-∞; 2]', 'x <= 2'));
  assert.ok(same('(-1; 4]', '-1 < x ≤ 4'));
  assert.ok(same('x ≠ 3', 'x < 3 or x > 3'));
  assert.ok(same('all real', 'x ≥ 0 or x < 0'));
  assert.ok(same('x < 1/2', 'x < 0,5'));
  assert.ok(same('k < 0 or 0 < k ≤ 9/4', 'k ≠ 0 and k <= 2,25', 'k'));
  assert.ok(!same('x < 3', 'x ≤ 3'));
  assert.throws(() => parseInequality('k < 3', 'x'));
  assert.throws(() => parseInequality('x < < 3'));
  const ans = { kind: 'inequality' as const, variable: 'x', set: [{ lo: null, hi: { n: 2, d: 1 }, loIn: false, hiIn: true }] };
  assert.equal(gradeResponse(ans, 'x ≤ 2').correct, true);
  assert.equal(gradeResponse(ans, 'x < 2').mistake, 'inequality-endpoint');
  assert.equal(gradeResponse(ans, 'x > 2').mistake, 'inequality-direction');
  assert.ok(gradeResponse(ans, 'x =< 2').correct);
  assert.ok(gradeResponse(ans, 'x ≤ 2').correct);
  assert.ok('parseError' in gradeResponse(ans, 'two'));
});

test('formula answers are checked by value, not by form', () => {
  const vs = ['v', 'u', 't'];
  assert.ok(formulasEquivalent('(v - u)/t', 'v/t - u/t', vs));
  assert.ok(formulasEquivalent('(v-u)/t', '(-u + v) / t', vs));
  assert.ok(!formulasEquivalent('(v - u)/t', 'v - u/t', vs));
  assert.ok(formulasEquivalent('√(A/π)', 'sqrt(A)/sqrt(pi)', ['A']));
  assert.ok(formulasEquivalent('2pi r', '2πr', ['r']), 'pi straight after a number');
  assert.ok(formulasEquivalent('3sqrt(x)', '3√x', ['x']), 'sqrt straight after a number');
  assert.ok(formulasEquivalent('2(s - ut)/t²', '(2s - 2ut)/t^2', ['s', 'u', 't']));
  assert.ok(!formulasEquivalent('(A - P)/(Pi)', '(A - P)/(π)', ['A', 'P', 'i']), 'capital P then i is not π');
  assert.ok(!formulasEquivalent('F/m', 'F/a', ['F', 'm']), 'a letter that is not in the formula');
  const ans = { kind: 'formula' as const, expr: 'A/(1 + rt)', variables: ['A', 'r', 't'] };
  assert.ok(gradeResponse(ans, 'P = A/(1+rt)').correct);
  assert.ok(gradeResponse(ans, 'A / (rt + 1)').correct);
  assert.equal(gradeResponse(ans, 'A - Prt').mistake, 'change-subject');
  assert.ok('parseError' in gradeResponse(ans, 'A/(1 + rt'));
});
