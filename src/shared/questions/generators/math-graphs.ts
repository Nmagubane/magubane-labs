import type { QuestionTemplate, Misconception, AnswerSpec, Figure, InputSpec } from '../types.ts';
import type { Rng } from '../rng.ts';
import type { MistakeCode } from '../mistakes.ts';
import { rat, ratTex, eq as req, add, sub, mul, div, toNumber, type Rational } from '../rational.ts';
import { equationsEquivalent } from '../expr.ts';
import { choice } from './kit.ts';

/**
 * Functions and graphs, Grades 10–12 (CAPS Paper 1): parabola, hyperbola and exponential (10), with horizontal
 * shifts and average gradient (11), trig graphs (10–11), inverses and logarithms (12). Graphs are sampled here
 * and drawn by the client; equations are graded as equations, so any correct rearrangement counts.
 */

const R = (n: number, d = 1) => rat(n, d);
const plain = (r: Rational) => (r.d === 1 ? `(${r.n})` : `(${r.n}/${r.d})`);
const fracAns = (r: Rational): AnswerSpec => ({ kind: 'fraction', n: r.n, d: r.d, requireSimplest: false });
const eqAns = (expr: string): AnswerSpec => ({ kind: 'equation', expr });
const pointAns = (x: Rational, y: Rational): AnswerSpec => ({ kind: 'point', x: { n: x.n, d: x.d }, y: { n: y.n, d: y.d } });
const EQ: InputSpec = { kind: 'equation', variables: ['x', 'y'] };
const tc = (v: number, dp = 2) => v.toFixed(dp).replace('.', '{,}');
const r2 = (v: number) => Math.round(v * 100) / 100;
const pt = (x: number | Rational, y: number | Rational) => `(${typeof x === 'number' ? x : ratTex(x)};\\, ${typeof y === 'number' ? y : ratTex(y)})`;
/** "+ 3", "- 3" or "" for a constant term. */
const cst = (v: number) => (v === 0 ? '' : v > 0 ? ` + ${v}` : ` - ${-v}`);
/** "2", "-", "" for a coefficient in front of a term. */
const coef = (v: number) => (v === 1 ? '' : v === -1 ? '-' : `${v}`);
/** (x + p) or x. */
const shift = (p: number) => (p === 0 ? 'x' : `(x ${p > 0 ? '+' : '-'} ${Math.abs(p)})`);

function keepEqs(ms: { code: MistakeCode; expr: string; feedback: string }[], answer: string): Misconception[] {
  const seen = [answer];
  const out: Misconception[] = [];
  for (const m of ms) {
    if (seen.some((s) => equationsEquivalent(s, m.expr))) continue;
    seen.push(m.expr);
    out.push({ code: m.code, answer: eqAns(m.expr), feedback: m.feedback });
  }
  return out;
}
function keepFracs(ms: { code: MistakeCode; value: Rational | null; feedback: string }[], correct: Rational): Misconception[] {
  const seen = [correct];
  const out: Misconception[] = [];
  for (const m of ms) {
    if (!m.value || seen.some((s) => req(s, m.value!))) continue;
    seen.push(m.value);
    out.push({ code: m.code, answer: fracAns(m.value), feedback: m.feedback });
  }
  return out;
}
function keepNums(ms: { code: MistakeCode; value: number | null; feedback: string }[], correct: number, tol: number): Misconception[] {
  const seen = [correct];
  const out: Misconception[] = [];
  for (const m of ms) {
    if (m.value === null || !Number.isFinite(m.value) || seen.some((s) => Math.abs(s - m.value!) <= 2 * tol + 1e-9)) continue;
    seen.push(m.value);
    out.push({ code: m.code, answer: { kind: 'numeric', value: m.value, tolerance: tol }, feedback: m.feedback });
  }
  return out;
}

/** Sample f on [x0; x1], splitting into branches wherever f leaves the visible y-range or is undefined. */
export function sample(f: (x: number) => number, x0: number, x1: number, yr: [number, number], steps = 160): [number, number][][] {
  const out: [number, number][][] = [];
  let cur: [number, number][] = [];
  const lo = yr[0] - (yr[1] - yr[0]) * 0.05;
  const hi = yr[1] + (yr[1] - yr[0]) * 0.05;
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    const y = f(x);
    if (!Number.isFinite(y) || y < lo || y > hi) {
      if (cur.length > 1) out.push(cur);
      cur = [];
      continue;
    }
    cur.push([Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]);
  }
  if (cur.length > 1) out.push(cur);
  return out;
}
function graph(fs: { f: (x: number) => number; label?: string }[], xr: [number, number], yr: [number, number], extra: Partial<Extract<Figure, { kind: 'graph' }>> = {}): Figure {
  return {
    kind: 'graph',
    xRange: xr,
    yRange: yr,
    curves: fs.flatMap(({ f, label }) => sample(f, xr[0], xr[1], yr).map((pts, i, all) => ({ pts, label: i === all.length - 1 ? label : undefined }))),
    ...extra,
  };
}
const hAsym = (y: number, xr: [number, number]) => ({ x1: xr[0], y1: y, x2: xr[1], y2: y, dashed: true });
const vAsym = (x: number, yr: [number, number]) => ({ x1: x, y1: yr[0], x2: x, y2: yr[1], dashed: true });

type Family = 'parabola' | 'hyperbola' | 'exponential';
const fam = (rng: Rng): Family => rng.pick(['parabola', 'hyperbola', 'exponential'] as const);
const BASES: readonly Rational[] = [R(2), R(3), R(1, 2), R(1, 3)];
const powR = (b: Rational, n: number): Rational => (n >= 0 ? R(b.n ** n, b.d ** n) : R(b.d ** -n, b.n ** -n));
const baseTex = (b: Rational) => (b.d === 1 ? `${b.n}` : `\\left(${ratTex(b)}\\right)`);

// ---------------------------------------------------------------------------
export const graphsBasic: QuestionTemplate = {
  id: 'graphs-basic',
  skillId: 'graphs-basic',
  generate(rng, level) {
    const a = rng.pick([1, 2, 3, -1, -2, 4, -3, 0.5].filter((v) => v !== 0.5));
    const q = rng.intExcept(-6, 6, [0]);
    const b = rng.pick(BASES);
    const F = fam(rng);
    const tex = F === 'parabola' ? `y = ${coef(a)}x^2${cst(q)}` : F === 'hyperbola' ? `y = \\dfrac{${a}}{x}${cst(q)}` : `y = ${coef(a)}${a === 1 || a === -1 ? '' : '\\cdot '}${baseTex(b)}^x${cst(q)}`;
    const name = F === 'parabola' ? 'the parabola' : F === 'hyperbola' ? 'the hyperbola' : 'the exponential graph';
    if (level === 1) {
      if (F === 'hyperbola') {
        return {
          prompt: `Write down the equation of the horizontal asymptote of ${name} $${tex}$.`,
          input: EQ,
          answer: eqAns(`y = ${q}`),
          answerDisplay: `$y = ${q}$`,
          hints: ['As $x$ gets very large, $\\dfrac{a}{x}$ gets closer and closer to 0.', 'So $y$ gets closer to $q$.'],
          solution: [`$\\dfrac{${a}}{x} \\to 0$, so $y \\to ${q}$.`, `Horizontal asymptote: $y = ${q}$. (The vertical asymptote is $x = 0$.)`],
          misconceptions: keepEqs([{ code: 'graph-features', expr: 'x = 0', feedback: '$x = 0$ is the vertical asymptote. The horizontal one is $y = q$.' }, { code: 'graph-features', expr: `y = ${-q}`, feedback: `Check the sign: the asymptote is $y = ${q}$.` }], `y = ${q}`),
        };
      }
      const yInt = F === 'parabola' ? R(q) : add(R(a), R(q));
      return {
        prompt: `Find the $y$-intercept of ${name} $${tex}$.`,
        input: { kind: 'fraction', prefix: 'y =' },
        answer: fracAns(yInt),
        answerDisplay: `$y = ${ratTex(yInt)}$, at $${pt(0, yInt)}$`,
        hints: ['On the $y$-axis, $x = 0$.', F === 'exponential' ? 'Any base to the power 0 is 1.' : 'Substitute $x = 0$.'],
        solution: [F === 'parabola' ? `$y = ${coef(a)}(0)^2${cst(q)} = ${q}$` : `$y = ${a}\\cdot ${baseTex(b)}^0${cst(q)} = ${a}(1)${cst(q)} = ${ratTex(yInt)}$`],
        misconceptions: keepFracs([{ code: 'graph-features', value: F === 'exponential' ? R(q) : R(a + q), feedback: F === 'exponential' ? `$${baseTex(b)}^0 = 1$, not 0: the $y$-intercept is $a + q$.` : 'Substitute $x = 0$: the $x^2$ term becomes 0.' }], yInt),
      };
    }
    if (level === 2) {
      // x-intercepts that work out exactly.
      if (F === 'parabola') {
        const r = rng.int(1, 4);
        const aa = rng.pick([1, 2, -1, -2, 3]);
        const qq = -aa * r * r;
        const t = `y = ${coef(aa)}x^2${cst(qq)}`;
        return {
          prompt: `Find the $x$-intercepts of $${t}$.`,
          input: { kind: 'roots', variable: 'x' },
          answer: { kind: 'roots', values: [{ n: -r, d: 1 }, { n: r, d: 1 }] },
          answerDisplay: `$x = -${r}$ or $x = ${r}$`,
          hints: ['On the $x$-axis, $y = 0$.', `$${coef(aa)}x^2 = ${-qq}$, so $x^2 = ${r * r}$.`],
          solution: [`$0 = ${coef(aa)}x^2${cst(qq)}$`, `$x^2 = ${r * r}$, so $x = \\pm ${r}$.`],
          misconceptions: [{ code: 'missing-solutions', answer: { kind: 'roots', values: [{ n: r, d: 1 }] }, feedback: `$x^2 = ${r * r}$ has two solutions: $x = ${r}$ and $x = -${r}$.` }],
        };
      }
      if (F === 'hyperbola') {
        const x = div(R(-a), R(q));
        return {
          prompt: `Find the $x$-intercept of $${tex}$.`,
          input: { kind: 'fraction', prefix: 'x =' },
          answer: fracAns(x),
          answerDisplay: `$x = ${ratTex(x)}$`,
          hints: ['Set $y = 0$.', `$\\dfrac{${a}}{x} = ${-q}$, so multiply both sides by $x$.`],
          solution: [`$0 = \\dfrac{${a}}{x}${cst(q)}$`, `$\\dfrac{${a}}{x} = ${-q}$, so $x = \\dfrac{${a}}{${-q}} = ${ratTex(x)}$`],
          misconceptions: keepFracs([{ code: 'sign-error', value: div(R(a), R(q)), feedback: 'Watch the sign when $q$ moves to the other side.' }, { code: 'gradient-inverted', value: div(R(-q), R(a)), feedback: `From $\\dfrac{${a}}{x} = ${-q}$, $x = \\dfrac{${a}}{${-q}}$, not the other way up.` }], x),
        };
      }
      const n = rng.int(1, 3);
      const bb = rng.pick([R(2), R(3)]);
      const aa = rng.pick([1, 2, 3]);
      const qq = -aa * bb.n ** n;
      const t = `y = ${coef(aa)}${aa === 1 ? '' : '\\cdot '}${bb.n}^x${cst(qq)}`;
      return {
        prompt: `Find the $x$-intercept of $${t}$.`,
        input: { kind: 'fraction', prefix: 'x =' },
        answer: fracAns(R(n)),
        answerDisplay: `$x = ${n}$`,
        hints: ['Set $y = 0$ and get the power on its own.', `$${bb.n}^x = ${bb.n ** n}$: write ${bb.n ** n} as a power of ${bb.n}.`],
        solution: [`$${coef(aa)}${aa === 1 ? '' : '\\cdot '}${bb.n}^x = ${-qq}$`, `$${bb.n}^x = ${bb.n ** n} = ${bb.n}^{${n}}$, so $x = ${n}$.`],
        misconceptions: keepFracs([{ code: 'graph-features', value: R(-qq, aa), feedback: `That is the value of $${bb.n}^x$. Write it as a power of ${bb.n} to find $x$.` }], R(n)),
      };
    }
    if (level === 3) {
      const up = a > 0;
      const opts = F === 'parabola'
        ? { c: up ? `y \\ge ${q}` : `y \\le ${q}`, w: [up ? `y \\le ${q}` : `y \\ge ${q}`, `y > ${q}`, `x \\ge ${q}`] }
        : F === 'hyperbola'
          ? { c: `y \\in \\mathbb{R},\\ y \\ne ${q}`, w: [`y > ${q}`, `y \\in \\mathbb{R},\\ y \\ne 0`, `x \\in \\mathbb{R},\\ x \\ne ${q}`] }
          : { c: up ? `y > ${q}` : `y < ${q}`, w: [up ? `y \\ge ${q}` : `y \\le ${q}`, up ? `y < ${q}` : `y > ${q}`, `y > 0`] };
      return choice(rng, {
        prompt: `What is the range of $${tex}$?`,
        correct: { id: 'a', text: `$${opts.c}$` },
        distractors: opts.w.map((w, i) => ({ id: `w${i}`, text: `$${w}$`, feedback: F === 'exponential' ? 'An exponential graph gets close to its asymptote but never touches it, so the inequality is strict. $a$ decides whether it is above or below.' : F === 'hyperbola' ? 'The hyperbola never touches its horizontal asymptote $y = q$, but takes every other $y$-value.' : 'The range is the set of $y$-values. $a > 0$: the turning point is the lowest point; $a < 0$: the highest.' })),
        code: 'graph-features',
        hints: ['The range is every $y$-value the graph reaches.', F === 'parabola' ? `The turning point is $${pt(0, q)}$. Does the graph open up or down?` : `The horizontal asymptote is $y = ${q}$.`],
        solution: [`Range: $${opts.c}$`],
      });
    }
    if (level === 4) {
      // Equation from a sketch.
      const xr: [number, number] = [-6, 6];
      if (F === 'parabola') {
        const x1 = rng.pick([1, 2, -2, -1, 3]);
        const y1 = a * x1 * x1 + q;
        const yr: [number, number] = [Math.min(-2, q - 2, y1 - 2), Math.max(2, q + 2, y1 + 2)];
        const ans = `y = ${a}*x^2 + ${plain(R(q))}`;
        return {
          prompt: `The sketch shows a parabola $y = ax^2 + q$ with turning point $${pt(0, q)}$, passing through $${pt(x1, y1)}$. Find its equation.`,
          figure: graph([{ f: (x) => a * x * x + q }], xr, yr, { points: [{ x: 0, y: q }, { x: x1, y: y1 }] }),
          input: EQ,
          answer: eqAns(ans),
          answerDisplay: `$y = ${coef(a)}x^2${cst(q)}$`,
          hints: [`The turning point gives $q = ${q}$.`, `Substitute $${pt(x1, y1)}$ into $y = ax^2${cst(q)}$ to find $a$.`],
          solution: [`$q = ${q}$`, `$${y1} = a(${x1})^2${cst(q)}$, so $a = ${a}$.`, `$y = ${coef(a)}x^2${cst(q)}$`],
          misconceptions: keepEqs([{ code: 'graph-features', expr: `y = ${-a}*x^2 + ${plain(R(q))}`, feedback: `Check the shape: the parabola opens ${a > 0 ? 'upward, so $a > 0$' : 'downward, so $a < 0$'}.` }, { code: 'graph-features', expr: `y = ${y1}*x^2 + ${plain(R(q))}`, feedback: `Substitute the point: ${y1} is $y$, not $a$. $a = \\dfrac{${y1} - (${q})}{${x1 * x1}}$.` }], ans),
        };
      }
      if (F === 'hyperbola') {
        const x1 = rng.pick([1, 2, -1, -2]);
        const y1 = add(div(R(a), R(x1)), R(q));
        const yr: [number, number] = [q - 8, q + 8];
        return {
          prompt: `The sketch shows a hyperbola $y = \\dfrac{a}{x} + q$ with horizontal asymptote $y = ${q}$, passing through $${pt(x1, y1)}$. Find $a$.`,
          figure: graph([{ f: (x) => a / x + q }], xr, yr, { segments: [hAsym(q, xr)], points: [{ x: x1, y: toNumber(y1), text: `(${x1}; ${ratTex(y1).replace(/\\frac\{(-?\d+)\}\{(\d+)\}/, '$1/$2')})` }] }),
          input: { kind: 'fraction', prefix: 'a =' },
          answer: fracAns(R(a)),
          answerDisplay: `$a = ${a}$, so $y = \\dfrac{${a}}{x}${cst(q)}$`,
          hints: [`The asymptote gives $q = ${q}$.`, `Substitute $${pt(x1, y1)}$: $${ratTex(y1)} = \\dfrac{a}{${x1}}${cst(q)}$.`],
          solution: [`$q = ${q}$`, `$${ratTex(y1)} = \\dfrac{a}{${x1}}${cst(q)}$, so $\\dfrac{a}{${x1}} = ${ratTex(sub(y1, R(q)))}$ and $a = ${a}$.`, `$y = \\dfrac{${a}}{x}${cst(q)}$`],
          misconceptions: keepFracs([{ code: 'graph-features', value: mul(y1, R(x1)), feedback: `Subtract $q$ first: $\\dfrac{a}{${x1}} = ${ratTex(y1)} - (${q})$.` }, { code: 'graph-features', value: div(sub(y1, R(q)), R(x1)), feedback: `Multiply by ${x1}, don't divide: $a = ${x1} \\times ${ratTex(sub(y1, R(q)))}$.` }], R(a)),
        };
      }
      const bb = rng.pick([R(2), R(3), R(1, 2)]);
      const q2 = rng.intExcept(-4, 3, [0]);
      const yr: [number, number] = [q2 - 2, q2 + 10];
      const x1 = bb.d === 1 ? rng.pick([1, 2]) : rng.pick([-1, -2]);
      const y1 = toNumber(powR(bb, x1)) + q2;
      return choice(rng, {
        prompt: `The sketch shows $y = b^x + q$, with asymptote $y = ${q2}$, passing through $${pt(x1, y1)}$. Which is its equation?`,
        correct: { id: 'a', text: `$y = ${baseTex(bb)}^x${cst(q2)}$` },
        distractors: [
          { id: 'b', text: `$y = ${baseTex(bb)}^x${cst(-q2)}$`, feedback: `The asymptote is $y = q$, so $q = ${q2}$.` },
          { id: 'c', text: `$y = ${baseTex(R(bb.d, bb.n))}^x${cst(q2)}$`, feedback: 'Check the direction: an increasing graph has $b > 1$; a decreasing one has $0 < b < 1$.' },
          { id: 'd', text: `$y = ${y1}^x${cst(q2)}$`, feedback: `Substitute: $${y1} = b^{${x1}}${cst(q2)}$, so $b^{${x1}} = ${y1 - q2}$.` },
        ].filter((o) => o.text !== `$y = ${baseTex(bb)}^x${cst(q2)}$`),
        code: 'graph-features',
        hints: [`The asymptote gives $q = ${q2}$.`, `Then $${y1} = b^{${x1}}${cst(q2)}$.`],
        solution: [`$q = ${q2}$; $b^{${x1}} = ${y1 - q2}$, so $b = ${ratTex(bb)}$.`, `$y = ${baseTex(bb)}^x${cst(q2)}$`],
        answerDisplay: `$y = ${baseTex(bb)}^x${cst(q2)}$`,
      });
    }
    // Level 5: where a parabola meets a line.
    const aa = rng.pick([1, -1, 2]);
    let r1: number, r2v: number;
    do {
      r1 = rng.int(-4, 3);
      r2v = rng.int(-3, 4);
    } while (r1 === r2v);
    const qq = rng.int(-4, 4);
    const m = aa * (r1 + r2v);
    const c = qq - aa * r1 * r2v;
    const gTex = m === 0 ? `${c}` : `${coef(m)}x${cst(c)}`;
    return {
      prompt: `$f(x) = ${coef(aa)}x^2${cst(qq)}$ and $g(x) = ${gTex}$. Find the $x$-values where the graphs intersect.`,
      figure: graph([{ f: (x) => aa * x * x + qq, label: 'f' }, { f: (x) => m * x + c, label: 'g' }], [-6, 6], [-12, 12]),
      input: { kind: 'roots', variable: 'x' },
      answer: { kind: 'roots', values: [{ n: r1, d: 1 }, { n: r2v, d: 1 }] },
      answerDisplay: `$x = ${r1}$ or $x = ${r2v}$`,
      hints: ['At an intersection, $f(x) = g(x)$.', 'Move everything to one side and factorise.'],
      solution: [`$${coef(aa)}x^2${cst(qq)} = ${gTex}$`, `$${coef(aa)}(x ${r1 > 0 ? '-' : '+'} ${Math.abs(r1)})(x ${r2v > 0 ? '-' : '+'} ${Math.abs(r2v)}) = 0$`, `$x = ${r1}$ or $x = ${r2v}$`],
      misconceptions: [{ code: 'sign-error', answer: { kind: 'roots', values: [{ n: -r1, d: 1 }, { n: -r2v, d: 1 }] }, feedback: 'Check the signs: from $(x - r) = 0$, $x = r$.' }],
    };
  },
};

// ---------------------------------------------------------------------------
export const graphsShifted: QuestionTemplate = {
  id: 'graphs-shifted',
  skillId: 'graphs-shifted',
  generate(rng, level) {
    const a = rng.pick([1, 2, -1, -2, 3, -3]);
    const p = rng.intExcept(-4, 4, [0]);
    const q = rng.intExcept(-5, 5, [0]);
    if (level === 1) {
      const F = fam(rng);
      if (F === 'exponential') {
        const b = rng.pick([2, 3]);
        const t = `y = ${coef(a)}${a === 1 || a === -1 ? '' : '\\cdot '}${b}^{x ${p > 0 ? '+' : '-'} ${Math.abs(p)}}${cst(q)}`;
        return {
          prompt: `Write down the equation of the asymptote of $${t}$.`,
          input: EQ,
          answer: eqAns(`y = ${q}`),
          answerDisplay: `$y = ${q}$`,
          hints: ['A horizontal shift does not move a horizontal asymptote.', 'The asymptote is $y = q$.'],
          solution: [`$${b}^{x ${p > 0 ? '+' : '-'} ${Math.abs(p)}}$ gets close to 0 but never reaches it, so $y$ gets close to $${q}$.`, `Asymptote: $y = ${q}$`],
          misconceptions: keepEqs([{ code: 'graph-features', expr: `x = ${-p}`, feedback: 'An exponential graph has only a horizontal asymptote, $y = q$.' }, { code: 'graph-features', expr: `y = ${-q}`, feedback: `Check the sign: $y = ${q}$.` }], `y = ${q}`),
        };
      }
      const t = F === 'parabola' ? `y = ${coef(a)}${shift(p)}^2${cst(q)}` : `y = \\dfrac{${a}}{${p > 0 ? `x + ${p}` : `x - ${-p}`}}${cst(q)}`;
      return {
        prompt: F === 'parabola' ? `Write down the turning point of $${t}$.` : `The asymptotes of $${t}$ cross at a point. Write down that point.`,
        input: { kind: 'point', name: F === 'parabola' ? 'T' : 'P' },
        answer: pointAns(R(-p), R(q)),
        answerDisplay: `$${pt(-p, q)}$`,
        hints: [F === 'parabola' ? 'In $y = a(x + p)^2 + q$, the turning point is $(-p;\\, q)$.' : 'The asymptotes are $x = -p$ and $y = q$.', `What value of $x$ makes $${shift(p)}$ zero?`],
        solution: [`$${shift(p)} = 0$ when $x = ${-p}$.`, F === 'parabola' ? `Turning point $${pt(-p, q)}$` : `Asymptotes $x = ${-p}$ and $y = ${q}$, crossing at $${pt(-p, q)}$.`],
        misconceptions: (() => {
          const out: Misconception[] = [{ code: 'horizontal-shift', answer: pointAns(R(p), R(q)), feedback: `$${shift(p)}$ is zero when $x = ${-p}$: the graph moves ${p > 0 ? 'left' : 'right'}.` }];
          if (-q !== q) out.push({ code: 'graph-features', answer: pointAns(R(-p), R(-q)), feedback: `$q = ${q}$ moves the graph ${q > 0 ? 'up' : 'down'}.` });
          return out;
        })(),
      };
    }
    if (level === 2) {
      // y = ax² + bx + c: turning point from x = −b/2a.
      const tp = R(rng.intExcept(-4, 4, [0]), rng.pick([1, 1, 2]));
      const aa = rng.pick([1, 2, -1, -2]);
      const qq = rng.int(-6, 6);
      // a(x − h)² + k  →  a x² − 2ah x + (a h² + k)
      const bb = mul(R(-2 * aa), tp);
      const cc = add(mul(R(aa), mul(tp, tp)), R(qq));
      if (bb.d !== 1 || cc.d !== 1) return graphsShifted.generate(rng, 2);
      const t = `y = ${coef(aa)}x^2${bb.n === 0 ? '' : ` ${bb.n > 0 ? '+' : '-'} ${Math.abs(bb.n) === 1 ? '' : Math.abs(bb.n)}x`}${cst(cc.n)}`;
      return {
        prompt: `Find the coordinates of the turning point of $${t}$.`,
        input: { kind: 'point', name: 'T' },
        answer: pointAns(tp, R(qq)),
        answerDisplay: `$T${pt(tp, qq)}$`,
        hints: ['The axis of symmetry is $x = -\\dfrac{b}{2a}$.', 'Substitute that $x$-value into the equation to find $y$.'],
        solution: [`$x = -\\dfrac{${bb.n}}{2(${aa})} = ${ratTex(tp)}$`, `$y = ${qq}$`, `$T${pt(tp, qq)}$`],
        misconceptions: [{ code: 'horizontal-shift', answer: pointAns(mul(R(-1), tp), R(qq)), feedback: 'The formula is $x = -\\dfrac{b}{2a}$: watch the minus sign.' }],
      };
    }
    if (level === 3) {
      // Parabola from its turning point and one more point.
      const x1 = -p + rng.pick([1, 2, -1, -2]);
      const y1 = a * (x1 + p) ** 2 + q;
      const ans = `y = ${a}*(x + ${plain(R(p))})^2 + ${plain(R(q))}`;
      return {
        prompt: `A parabola has turning point $${pt(-p, q)}$ and passes through $${pt(x1, y1)}$. Find its equation.`,
        figure: graph([{ f: (x) => a * (x + p) ** 2 + q }], [-8, 8], [Math.min(-3, q - 3, y1 - 3), Math.max(3, q + 3, y1 + 3)], { points: [{ x: -p, y: q }, { x: x1, y: y1 }] }),
        input: EQ,
        answer: eqAns(ans),
        answerDisplay: `$y = ${coef(a)}${shift(p)}^2${cst(q)}$`,
        hints: [`Start with $y = a${shift(p)}^2${cst(q)}$.`, `Substitute $${pt(x1, y1)}$ to find $a$.`],
        solution: [`$y = a${shift(p)}^2${cst(q)}$`, `$${y1} = a(${x1 + p})^2${cst(q)}$, so $a = ${a}$.`, `$y = ${coef(a)}${shift(p)}^2${cst(q)}$`],
        misconceptions: keepEqs([{ code: 'horizontal-shift', expr: `y = ${a}*(x - ${plain(R(p))})^2 + ${plain(R(q))}`, feedback: `A turning point at $x = ${-p}$ means $${shift(p)}$ in the equation.` }, { code: 'graph-features', expr: `y = ${-a}*(x + ${plain(R(p))})^2 + ${plain(R(q))}`, feedback: 'Check the sign of $a$ against the shape of the graph.' }], ans),
      };
    }
    if (level === 4) {
      // Average gradient of a curve between two x-values.
      const F = rng.pick(['parabola', 'exponential'] as const);
      const x1 = rng.int(-3, 1);
      const x2 = x1 + rng.int(1, 3);
      const f = F === 'parabola' ? (x: number) => R(a * x * x + q) : (x: number) => add(mul(R(a), powR(R(2), x)), R(q));
      const t = F === 'parabola' ? `f(x) = ${coef(a)}x^2${cst(q)}` : `f(x) = ${coef(a)}${a === 1 || a === -1 ? '' : '\\cdot '}2^x${cst(q)}`;
      const avg = div(sub(f(x2), f(x1)), R(x2 - x1));
      return {
        prompt: `Find the average gradient of $${t}$ between $x = ${x1}$ and $x = ${x2}$.`,
        input: { kind: 'fraction' },
        answer: fracAns(avg),
        answerDisplay: `$${ratTex(avg)}$`,
        hints: ['Average gradient $= \\dfrac{f(x_2) - f(x_1)}{x_2 - x_1}$.', `Find $f(${x2})$ and $f(${x1})$ first.`],
        solution: [`$f(${x2}) = ${ratTex(f(x2))}$ and $f(${x1}) = ${ratTex(f(x1))}$`, `$\\dfrac{${ratTex(f(x2))} - (${ratTex(f(x1))})}{${x2} - (${x1})} = ${ratTex(avg)}$`],
        misconceptions: keepFracs(
          [
            { code: 'average-gradient', value: sub(f(x2), f(x1)), feedback: `Divide by the change in $x$, $${x2 - x1}$.` },
            { code: 'average-gradient', value: req(sub(f(x2), f(x1)), R(0)) ? null : div(R(x2 - x1), sub(f(x2), f(x1))), feedback: 'Change in $y$ goes on top.' },
          ],
          avg,
        ),
      };
    }
    // Level 5: axis of symmetry of a hyperbola (positive gradient: y = x + p + q).
    const t = `y = \\dfrac{${a}}{${p > 0 ? `x + ${p}` : `x - ${-p}`}}${cst(q)}`;
    const posGrad = rng.chance(0.6);
    const c = posGrad ? p + q : q - p;
    const ans = posGrad ? `y = x + ${plain(R(c))}` : `y = -x + ${plain(R(c))}`;
    return {
      prompt: `Find the equation of the axis of symmetry of $${t}$ that has a ${posGrad ? 'positive' : 'negative'} gradient.`,
      figure: graph([{ f: (x) => a / (x + p) + q }], [-p - 7, -p + 7], [q - 7, q + 7], { segments: [hAsym(q, [-p - 7, -p + 7]), vAsym(-p, [q - 7, q + 7])] }),
      input: EQ,
      answer: eqAns(ans),
      answerDisplay: `$y = ${posGrad ? '' : '-'}x${cst(c)}$`,
      hints: [`The axes of symmetry pass through the point where the asymptotes cross, $${pt(-p, q)}$.`, `They have gradients $1$ and $-1$: $y = ${posGrad ? '' : '-'}x + c$. Substitute the point.`],
      solution: [`Asymptotes: $x = ${-p}$ and $y = ${q}$; they cross at $${pt(-p, q)}$.`, `$y = ${posGrad ? '' : '-'}x + c$: $${q} = ${posGrad ? '' : '-'}(${-p}) + c$, so $c = ${c}$.`, `$y = ${posGrad ? '' : '-'}x${cst(c)}$`],
      misconceptions: keepEqs([{ code: 'horizontal-shift', expr: posGrad ? `y = x + ${plain(R(q - p))}` : `y = -x + ${plain(R(q + p))}`, feedback: `The asymptotes cross at $x = ${-p}$, not $x = ${p}$.` }, { code: 'graph-features', expr: posGrad ? `y = -x + ${plain(R(q - p))}` : `y = x + ${plain(R(p + q))}`, feedback: 'That is the other axis of symmetry. Check the gradient.' }], ans),
    };
  },
};

// ---------------------------------------------------------------------------
type TFn = 'sin' | 'cos' | 'tan';
const trigF = (fn: TFn) => (d: number) => (fn === 'sin' ? Math.sin((d * Math.PI) / 180) : fn === 'cos' ? Math.cos((d * Math.PI) / 180) : Math.tan((d * Math.PI) / 180));
/** y = a fn(k(x + p)) + q as TeX. */
function trigTex(fn: TFn, a: number, k: number, p: number, q: number): string {
  const inner = p === 0 ? `${k === 1 ? '' : k}x` : `${k === 1 ? '' : k}(x ${p > 0 ? '+' : '-'} ${Math.abs(p)}^\\circ)`;
  return `y = ${coef(a)}\\${fn} ${p !== 0 && k === 1 ? `(x ${p > 0 ? '+' : '-'} ${Math.abs(p)}^\\circ)` : inner}${cst(q)}`;
}
function trigFigure(fn: TFn, a: number, k: number, p: number, q: number, extra: { fn: TFn; a: number; k: number; p: number; q: number; label: string }[] = []): Figure {
  const yr: [number, number] = fn === 'tan' ? [q - 5, q + 5] : [Math.min(-1.5, q - Math.abs(a) - 1), Math.max(1.5, q + Math.abs(a) + 1)];
  const f = (A: number, K: number, P: number, Q: number, F: TFn) => (x: number) => {
    const ang = K * (x + P);
    if (F === 'tan' && Math.abs(((ang % 180) + 180) % 180 - 90) < 1.5) return NaN;
    return A * trigF(F)(ang) + Q;
  };
  return graph([{ f: f(a, k, p, q, fn), label: extra.length ? 'f' : undefined }, ...extra.map((e) => ({ f: f(e.a, e.k, e.p, e.q, e.fn), label: e.label }))], [0, 360], yr, { xTitle: 'x (degrees)', xStep: 90 });
}

export const trigGraphs: QuestionTemplate = {
  id: 'trig-graphs',
  skillId: 'trig-graphs',
  generate(rng, level) {
    const fn = rng.pick(['sin', 'cos'] as const);
    const a = rng.pick([1, 2, 3, -1, -2]);
    const q = rng.int(-2, 2);
    if (level === 1) {
      const ask = rng.pick(['max', 'min', 'amp'] as const);
      const v = ask === 'max' ? q + Math.abs(a) : ask === 'min' ? q - Math.abs(a) : Math.abs(a);
      return {
        prompt: `For $${trigTex(fn, a, 1, 0, q)}$, what is the ${ask === 'max' ? 'maximum value of $y$' : ask === 'min' ? 'minimum value of $y$' : 'amplitude'}?`,
        input: { kind: 'numeric' },
        answer: { kind: 'numeric', value: v, tolerance: 0 },
        answerDisplay: `$${v}$`,
        hints: [`$\\${fn} x$ goes from $-1$ to $1$.`, `Multiply by $${a}$, then add $${q}$.`],
        solution: [`$${coef(a)}\\${fn} x$ goes from $${-Math.abs(a)}$ to $${Math.abs(a)}$ (amplitude $${Math.abs(a)}$).`, `Adding $${q}$: $y$ goes from $${q - Math.abs(a)}$ to $${q + Math.abs(a)}$.`],
        misconceptions: keepNums([{ code: 'trig-graph', value: ask === 'amp' ? Math.abs(a) * 2 : ask === 'max' ? Math.abs(a) : -Math.abs(a), feedback: ask === 'amp' ? 'The amplitude is half the distance from the minimum to the maximum.' : `Don't forget $q = ${q}$: it moves the whole graph.` }, { code: 'trig-graph', value: ask === 'max' ? a + q : ask === 'min' ? -a + q : null, feedback: 'A negative $a$ flips the graph; the maximum is still $q + |a|$.' }], v, 0),
      };
    }
    if (level === 2) {
      const f2 = rng.pick(['sin', 'cos', 'tan'] as const);
      const k = rng.pick([2, 3, 4, 0.5]);
      const per = (f2 === 'tan' ? 180 : 360) / k;
      const kt = k === 0.5 ? '\\tfrac{1}{2}' : `${k}`;
      return {
        prompt: `What is the period of $y = \\${f2} ${kt}x$?`,
        input: { kind: 'numeric', unit: '°' },
        answer: { kind: 'numeric', value: per, tolerance: 0 },
        answerDisplay: `$${per}^\\circ$`,
        hints: [`The period of $y = \\${f2} x$ is $${f2 === 'tan' ? 180 : 360}^\\circ$.`, `$y = \\${f2} kx$ repeats $k$ times as fast: divide by $k$.`],
        solution: [`Period $= \\dfrac{${f2 === 'tan' ? 180 : 360}^\\circ}{${kt}} = ${per}^\\circ$`],
        misconceptions: keepNums([{ code: 'trig-graph', value: (f2 === 'tan' ? 180 : 360) * k, feedback: 'A bigger $k$ squashes the graph: divide by $k$, don\'t multiply.' }, { code: 'trig-graph', value: f2 === 'tan' ? 360 / k : null, feedback: 'The basic period of tan is $180^\\circ$, not $360^\\circ$.' }], per, 0),
      };
    }
    if (level === 3 || level === 4) {
      // Identify the equation from the graph: level 3 a and q; level 4 k or p.
      const k = level === 4 && rng.chance(0.5) ? rng.pick([2, 3]) : 1;
      const p = level === 4 && k === 1 ? rng.pick([30, 45, 60, -30, -45, -60]) : 0;
      const correct = trigTex(fn, a, k, p, q);
      const other: TFn = fn === 'sin' ? 'cos' : 'sin';
      const wrongs = [
        { t: trigTex(other, a, k, p, q), f: `Check $x = 0$: $\\sin 0^\\circ = 0$ but $\\cos 0^\\circ = 1$.` },
        { t: trigTex(fn, -a, k, p, q), f: 'Check the sign of $a$: does the graph start by going up or down?' },
        level === 3 ? { t: trigTex(fn, a, k, p, -q === q ? q + 1 : -q), f: 'Check $q$: it is the middle line the graph moves around.' } : k !== 1 ? { t: trigTex(fn, a, k === 2 ? 3 : 2, 0, q), f: `Count how many full waves fit into $360^\\circ$: that is $k$.` } : { t: trigTex(fn, a, 1, -p, q), f: `$(x + p)$ moves the graph $p$ to the **left**. This graph has moved ${p > 0 ? 'left' : 'right'}.` },
      ].filter((w, i, all) => w.t !== correct && all.findIndex((x) => x.t === w.t) === i);
      const q2 = choice(rng, {
        prompt: 'Which equation matches the graph?',
        correct: { id: 'a', text: `$${correct}$` },
        distractors: wrongs.map((w, i) => ({ id: `w${i}`, text: `$${w.t}$`, feedback: w.f })),
        code: 'trig-graph',
        hints: ['Look at $x = 0$: does the graph start at the middle line (sin) or at a maximum or minimum (cos)?', level === 3 ? 'The middle line is $y = q$; the distance from it to the top is $|a|$.' : 'Count the waves in $360^\\circ$ for $k$; for $p$, see how far the start has moved.'],
        solution: [`$${correct}$`],
      });
      return { ...q2, figure: trigFigure(fn, a, k, p, q) };
    }
    // Level 5: where a graph reaches its maximum or minimum, or where two graphs meet.
    if (rng.chance(0.7)) {
      const wantMax = rng.chance(0.5);
      // a fn x + q is largest where fn x is 1 (a > 0) or −1 (a < 0).
      const target = (wantMax ? 1 : -1) * Math.sign(a);
      const xs = fn === 'sin' ? (target > 0 ? [90] : [270]) : target > 0 ? [0, 360] : [180];
      const wrong = fn === 'sin' ? (target > 0 ? [270] : [90]) : target > 0 ? [180] : [0, 360];
      return {
        prompt: `For $0^\\circ \\le x \\le 360^\\circ$, at which $x$-value(s) does $${trigTex(fn, a, 1, 0, q)}$ reach its ${wantMax ? 'maximum' : 'minimum'}?`,
        figure: trigFigure(fn, a, 1, 0, q),
        input: { kind: 'roots', variable: 'x' },
        answer: { kind: 'roots', values: xs.map((n) => ({ n, d: 1 })) },
        answerDisplay: `$${xs.map((x) => `x = ${x}^\\circ`).join(' \\text{ or } ')}$`,
        hints: [`$\\${fn} x$ is $1$ at $x = ${fn === 'sin' ? '90^\\circ' : '0^\\circ \\text{ and } 360^\\circ'}$ and $-1$ at $x = ${fn === 'sin' ? '270^\\circ' : '180^\\circ'}$.`, a < 0 ? 'A negative $a$ flips the graph: the maximum of $y$ is where $\\' + fn + ' x$ is smallest.' : '$q$ moves the graph up or down but not left or right.'],
        solution: [`$y$ is ${wantMax ? 'largest' : 'smallest'} where $\\${fn} x = ${target}$.`, `$${xs.map((x) => `x = ${x}^\\circ`).join(' \\text{ or } ')}$`],
        misconceptions: [{ code: 'trig-graph', answer: { kind: 'roots', values: wrong.map((n) => ({ n, d: 1 })) }, feedback: a < 0 ? 'With $a < 0$ the graph is flipped: its maximum is where $\\' + fn + ' x = -1$.' : 'That is where the ' + (wantMax ? 'minimum' : 'maximum') + ' is.' }],
      };
    }
    // Level 5: where two trig graphs meet, read as an equation.
    const pick = rng.pick([
      { f: 'sin' as TFn, g: 'cos' as TFn, xs: [45, 225] },
      { f: 'sin' as TFn, g: 'cos' as TFn, xs: [45, 225] },
      { f: 'tan' as TFn, g: 'sin' as TFn, xs: [0, 180, 360] },
    ]);
    if (pick.f === 'tan') {
      return {
        prompt: 'For $0^\\circ \\le x \\le 360^\\circ$, find the $x$-values where the graphs of $f(x) = \\tan x$ and $g(x) = \\sin x$ intersect.',
        figure: trigFigure('tan', 1, 1, 0, 0, [{ fn: 'sin', a: 1, k: 1, p: 0, q: 0, label: 'g' }]),
        input: { kind: 'roots', variable: 'x' },
        answer: { kind: 'roots', values: [{ n: 0, d: 1 }, { n: 180, d: 1 }, { n: 360, d: 1 }] },
        answerDisplay: '$x = 0^\\circ$, $180^\\circ$ or $360^\\circ$',
        hints: ['Solve $\\tan x = \\sin x$: write $\\tan x = \\dfrac{\\sin x}{\\cos x}$.', '$\\sin x\\left(\\dfrac{1}{\\cos x} - 1\\right) = 0$, so $\\sin x = 0$ or $\\cos x = 1$.'],
        solution: ['$\\dfrac{\\sin x}{\\cos x} = \\sin x$', '$\\sin x = 0$ or $\\cos x = 1$', '$x = 0^\\circ$, $180^\\circ$ or $360^\\circ$'],
        misconceptions: [{ code: 'missing-solutions', answer: { kind: 'roots', values: [{ n: 0, d: 1 }, { n: 360, d: 1 }] }, feedback: 'Read the graph: they also meet at $x = 180^\\circ$, where both are 0.' }],
      };
    }
    return {
      prompt: 'For $0^\\circ \\le x \\le 360^\\circ$, find the $x$-values where the graphs of $f(x) = \\sin x$ and $g(x) = \\cos x$ intersect.',
      figure: trigFigure('sin', 1, 1, 0, 0, [{ fn: 'cos', a: 1, k: 1, p: 0, q: 0, label: 'g' }]),
      input: { kind: 'roots', variable: 'x' },
      answer: { kind: 'roots', values: [{ n: 45, d: 1 }, { n: 225, d: 1 }] },
      answerDisplay: '$x = 45^\\circ$ or $x = 225^\\circ$',
      hints: ['Solve $\\sin x = \\cos x$: divide both sides by $\\cos x$.', '$\\tan x = 1$'],
      solution: ['$\\sin x = \\cos x$, so $\\tan x = 1$.', 'tan is positive in quadrants 1 and 3: $x = 45^\\circ$ or $225^\\circ$.'],
      misconceptions: [{ code: 'missing-solutions', answer: { kind: 'roots', values: [{ n: 45, d: 1 }] }, feedback: 'The graphs cross twice: tan is positive in quadrants 1 and 3.' }],
    };
  },
};

// ---------------------------------------------------------------------------
export const inverseLog: QuestionTemplate = {
  id: 'inverse-log',
  skillId: 'inverse-log',
  generate(rng, level) {
    if (level === 1) {
      const m = rng.pick([2, 3, 4, -2, 5, -3]);
      const c = rng.intExcept(-6, 6, [0]);
      const ans = `y = (x - ${plain(R(c))})/${m}`;
      return {
        prompt: `$f(x) = ${coef(m)}x${cst(c)}$. Find $f^{-1}(x)$ in the form $y = \\dots$`,
        input: EQ,
        answer: eqAns(`y = ${plain(R(1, m))}*x + ${plain(R(-c, m))}`),
        answerDisplay: `$f^{-1}: y = \\dfrac{x ${c > 0 ? '-' : '+'} ${Math.abs(c)}}{${m}}$`,
        hints: ['Swap $x$ and $y$: $x = ' + `${coef(m)}y${cst(c)}` + '$.', 'Now make $y$ the subject.'],
        solution: [`$y = ${coef(m)}x${cst(c)}$. Swap: $x = ${coef(m)}y${cst(c)}$.`, `$y = \\dfrac{x ${c > 0 ? '-' : '+'} ${Math.abs(c)}}{${m}}$`],
        misconceptions: keepEqs([{ code: 'inverse-function', expr: `y = ${plain(R(-1, m))}*x + ${plain(R(c, m))}`, feedback: 'Swap $x$ and $y$, then solve for $y$ step by step: subtract first, then divide.' }, { code: 'inverse-function', expr: `y = ${plain(R(1, m))}*x - ${plain(R(c))}`, feedback: `Divide the whole of $(x ${c > 0 ? '-' : '+'} ${Math.abs(c)})$ by ${m}.` }], ans),
      };
    }
    if (level === 2) {
      const aa = rng.pick([2, 3, 4, 5]);
      const r = rng.int(1, 5);
      const y = aa * r * r;
      return {
        prompt: `$f(x) = ${aa}x^2$ for $x \\ge 0$. Find $f^{-1}(${y})$.`,
        input: { kind: 'numeric' },
        answer: { kind: 'numeric', value: r, tolerance: 0 },
        answerDisplay: `$f^{-1}(${y}) = ${r}$`,
        hints: [`$f^{-1}(${y})$ is the $x$-value where $f(x) = ${y}$.`, `Solve $${aa}x^2 = ${y}$ with $x \\ge 0$.`],
        solution: [`$${aa}x^2 = ${y}$, so $x^2 = ${r * r}$.`, `$x \\ge 0$, so $x = ${r}$. Therefore $f^{-1}(${y}) = ${r}$.`],
        misconceptions: keepNums([{ code: 'inverse-function', value: aa * y * y, feedback: '$f^{-1}$ undoes $f$: you need the input that gives an output of ' + y + ', not $f(' + y + ')$.' }, { code: 'inverse-function', value: -r, feedback: 'The domain is $x \\ge 0$, so take the positive root.' }], r, 0),
      };
    }
    if (level === 3) {
      const b = rng.pick([2, 3, 5, 10]);
      const n = rng.int(-3, b === 10 ? 4 : 5);
      const v = powR(R(b), n);
      const arg = v.d === 1 ? `${v.n}` : `\\tfrac{1}{${v.d}}`;
      return {
        prompt: `Without a calculator, find $\\log_{${b}} ${arg}$.`,
        input: { kind: 'fraction' },
        answer: fracAns(R(n)),
        answerDisplay: `$${n}$`,
        hints: [`$\\log_{${b}} ${arg}$ asks: ${b} to what power gives ${v.d === 1 ? v.n : `1/${v.d}`}?`, 'A fraction like $\\tfrac{1}{8}$ is a negative power.'],
        solution: [`$${arg} = ${b}^{${n}}$`, `So $\\log_{${b}} ${arg} = ${n}$.`],
        misconceptions: keepFracs([{ code: 'log-laws', value: R(-n), feedback: `Check the sign: $${b}^{${-n}} = ${ratTex(powR(R(b), -n))}$, not ${arg}.` }, { code: 'log-laws', value: n > 0 ? div(R(v.n), R(b)) : null, feedback: 'A logarithm is a power, not a quotient.' }], R(n)),
      };
    }
    if (level === 4) {
      const forms = [
        () => { const b = rng.pick([2, 3, 5]); const n = rng.int(2, 4); const m = rng.pick([2, 3, 4, 5].filter((x) => x !== b)); return { tex: `\\log_{${b}} ${m * b ** n} - \\log_{${b}} ${m}`, v: R(n), wrong: R(n + 1), why: '$\\log a - \\log b = \\log \\dfrac{a}{b}$.' }; },
        () => { const pairs = [[25, 4], [50, 2], [20, 5], [125, 8], [250, 4]] as const; const [x, y] = rng.pick(pairs); return { tex: `\\log ${x} + \\log ${y}`, v: R(Math.round(Math.log10(x * y))), wrong: R(x + y), why: '$\\log a + \\log b = \\log ab$, and $\\log 100 = 2$.' }; },
        () => { const b = rng.pick([2, 3]); const n = rng.int(2, 4); return { tex: `${n}\\log_{${b}} ${b} + \\log_{${b}} 1`, v: R(n), wrong: R(n + 1), why: '$\\log_b b = 1$ and $\\log_b 1 = 0$.' }; },
        () => { const b = rng.pick([2, 3]); const k = rng.int(2, 3); const n = rng.int(2, 3); return { tex: `\\dfrac{\\log ${b ** (k * n)}}{\\log ${b ** k}}`, v: R(n), wrong: R(b ** (k * n) / b ** k), why: '$\\dfrac{\\log b^{kn}}{\\log b^k} = \\dfrac{kn\\log b}{k\\log b}$: you can\'t cancel inside logs.' }; },
      ];
      const f = rng.pick(forms)();
      return {
        prompt: `Without a calculator, find the value of $${f.tex}$.`,
        input: { kind: 'fraction' },
        answer: fracAns(f.v),
        answerDisplay: `$${ratTex(f.v)}$`,
        hints: ['Use the log laws to combine into one log.', f.why],
        solution: [f.why, `$= ${ratTex(f.v)}$`],
        misconceptions: keepFracs([{ code: 'log-laws', value: f.wrong, feedback: f.why }], f.v),
      };
    }
    // Level 5: solve an exponential equation with logs.
    const b = rng.pick([2, 3, 5, 7]);
    const k = rng.pick([1, 2, 3]);
    let c: number;
    do c = rng.int(5, 90);
    while (Number.isInteger(Math.log(c) / Math.log(b)));
    const x = Math.log(c / k) / Math.log(b);
    if (c / k <= 1) return inverseLog.generate(rng, 5);
    return {
      prompt: `Solve for $x$: $\\ ${k === 1 ? '' : `${k}\\cdot `}${b}^x = ${c}$. Round to two decimal places.`,
      input: { kind: 'numeric', prefix: 'x =' },
      answer: { kind: 'numeric', value: r2(x), tolerance: 0.011 },
      answerDisplay: `$x = ${tc(r2(x))}$`,
      hints: [k === 1 ? 'Take the log of both sides.' : `Divide by ${k} first: $${b}^x = ${tc(c / k)}$.`, `$x = \\log_{${b}} ${k === 1 ? c : tc(c / k)} = \\dfrac{\\log ${k === 1 ? c : tc(c / k)}}{\\log ${b}}$`],
      solution: [...(k === 1 ? [] : [`$${b}^x = \\dfrac{${c}}{${k}}$`]), `$x = \\dfrac{\\log ${k === 1 ? c : `(${c}/${k})`}}{\\log ${b}} = ${tc(r2(x))}$`],
      misconceptions: keepNums([{ code: 'log-laws', value: r2(Math.log10(c / k) - Math.log10(b)), feedback: '$\\dfrac{\\log A}{\\log B}$ is not $\\log A - \\log B$.' }, { code: 'log-laws', value: k === 1 ? null : r2(Math.log(c) / Math.log(b)), feedback: `Divide by ${k} before taking logs.` }], r2(x), 0.011),
    };
  },
};
