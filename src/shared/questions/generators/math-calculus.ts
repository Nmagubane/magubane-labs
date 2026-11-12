/**
 * Differential calculus and cubic polynomials, Grade 12 (CAPS Paper 1, about 35 marks, plus cubics under Functions):
 * the factor and remainder theorems, limits and first principles, tangents, cubic graphs, and optimisation and rates
 * of change. The power rule itself is the existing `derivatives` skill (math-upper.ts).
 *
 * Every function is built backwards from the answer (roots, turning points, the x that maximises), so answers are
 * exact. calculus.test.ts reads each function back out of the prompt and checks the answer numerically.
 */
import type { QuestionTemplate, Misconception, AnswerSpec, Figure, InputSpec } from '../types.ts';
import type { Rng } from '../rng.ts';
import type { MistakeCode } from '../mistakes.ts';
import { rat, ratTex, eq as req, type Rational } from '../rational.ts';
import { equationsEquivalent, expressionsEquivalent } from '../expr.ts';
import { sum, sumPlain, term } from '../tex.ts';
import { exact, keepNum } from './kit.ts';
import { sample } from './math-graphs.ts';

// ---------------------------------------------------------------------------
// Polynomials as coefficient lists, lowest power first: [d, c, b, a] is ax³ + bx² + cx + d.
type P = number[];
const ev = (p: P, x: number) => p.reduce((s, c, i) => s + c * x ** i, 0);
const dP = (p: P): P => (p.length <= 1 ? [0] : p.slice(1).map((c, i) => c * (i + 1)));
const mulP = (a: P, b: P): P => {
  const out = Array<number>(a.length + b.length - 1).fill(0);
  a.forEach((x, i) => b.forEach((y, j) => (out[i + j]! += x * y)));
  return out;
};
/** lead · Π(dx − n) for each [d, n]: the factor (dx − n) has root n/d. */
const fromFactors = (lead: number, fs: [number, number][]): P => fs.reduce((p, [d, n]) => mulP(p, [-n, d]), [lead]);
const terms = (p: P, v: string): [number, string][] => p.map((c, i): [number, string] => [c, i === 0 ? '' : i === 1 ? v : `${v}^{${i}}`]).reverse();
const pTex = (p: P, v = 'x') => sum(terms(p, v));
const pPlain = (p: P, v = 'x') => sumPlain(terms(p, v));
/** "x - 3", "2x + 1" (no brackets). */
const lin = (d: number, n: number, v = 'x') => sum([[d, v], [-n, '']]);
/** f(3) written out: 2(3)^{3} - (3)^{2} + 5 */
const subTex = (p: P, x: number) => sum(p.map((c, i): [number, string] => [c, i === 0 ? '' : `(${x})${i === 1 ? '' : `^{${i}}`}`]).reverse());
const pt = (x: number | Rational, y: number | Rational) => `(${typeof x === 'number' ? x : ratTex(x)};\\, ${typeof y === 'number' ? y : ratTex(y)})`;
const dec = (v: number) => String(Math.round(v * 1000) / 1000).replace('.', '{,}');

const pointAns = (x: Rational, y: Rational): AnswerSpec => ({ kind: 'point', x: { n: x.n, d: x.d }, y: { n: y.n, d: y.d } });
const eqAns = (expr: string): AnswerSpec => ({ kind: 'equation', expr });
const fracAns = (r: Rational): AnswerSpec => ({ kind: 'fraction', n: r.n, d: r.d, requireSimplest: false });
const rootsAns = (rs: Rational[]): AnswerSpec => ({ kind: 'roots', values: rs.map((r) => ({ n: r.n, d: r.d })) });
const EQ: InputSpec = { kind: 'equation', variables: ['x', 'y'] };
const line = (m: number, c: number) => `y=${pPlain([c, m])}`;
const lineTex = (m: number, c: number) => `y = ${pTex([c, m])}`;

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
function keepExprs(ms: { code: MistakeCode; expr: string; feedback: string }[], answer: string): Misconception[] {
  const seen = [answer];
  const out: Misconception[] = [];
  for (const m of ms) {
    if (seen.some((s) => expressionsEquivalent(s, m.expr))) continue;
    seen.push(m.expr);
    out.push({ code: m.code, answer: { kind: 'expression', expr: m.expr }, feedback: m.feedback });
  }
  return out;
}
function keepPoints(ms: { code: MistakeCode; x: Rational; y: Rational; feedback: string }[], ax: Rational, ay: Rational): Misconception[] {
  const seen: [Rational, Rational][] = [[ax, ay]];
  const out: Misconception[] = [];
  for (const m of ms) {
    if (seen.some(([x, y]) => req(x, m.x) && req(y, m.y))) continue;
    seen.push([m.x, m.y]);
    out.push({ code: m.code, answer: pointAns(m.x, m.y), feedback: m.feedback });
  }
  return out;
}
function keepFracs(ms: { code: MistakeCode; value: Rational; feedback: string }[], correct: Rational): Misconception[] {
  const seen = [correct];
  const out: Misconception[] = [];
  for (const m of ms) {
    if (seen.some((s) => req(s, m.value))) continue;
    seen.push(m.value);
    out.push({ code: m.code, answer: fracAns(m.value), feedback: m.feedback });
  }
  return out;
}
function keepRoots(ms: { code: MistakeCode; values: Rational[]; feedback: string }[], correct: Rational[]): Misconception[] {
  const key = (rs: Rational[]) => rs.map((r) => `${r.n}/${r.d}`).sort().join(',');
  const seen = [key(correct)];
  const out: Misconception[] = [];
  for (const m of ms) {
    if (seen.includes(key(m.values))) continue;
    seen.push(key(m.values));
    out.push({ code: m.code, answer: rootsAns(m.values), feedback: m.feedback });
  }
  return out;
}

/** Distinct non-zero integers in [-max, max]. */
function distinct(rng: Rng, count: number, max: number, avoid: number[] = []): number[] {
  const out: number[] = [];
  while (out.length < count) {
    const v = rng.signed(1, max);
    if (!out.includes(v) && !avoid.includes(v)) out.push(v);
  }
  return out;
}

const two = (rng: Rng, max: number) => distinct(rng, 2, max) as [number, number];

/** A graph of f with its y-range fitted to the curve over xr. */
function curveFigure(f: (x: number) => number, xr: [number, number], points: { x: number; y: number; text?: string; label?: string }[], extra: Partial<Extract<Figure, { kind: 'graph' }>> = {}): Figure {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i <= 200; i++) {
    const y = f(xr[0] + ((xr[1] - xr[0]) * i) / 200);
    lo = Math.min(lo, y);
    hi = Math.max(hi, y);
  }
  for (const p of points) {
    lo = Math.min(lo, p.y);
    hi = Math.max(hi, p.y);
  }
  const pad = Math.max(1, (hi - lo) * 0.12);
  const yr: [number, number] = [Math.floor(Math.min(lo - pad, -1)), Math.ceil(Math.max(hi + pad, 1))];
  return { kind: 'graph', xRange: xr, yRange: yr, curves: sample(f, xr[0], xr[1], yr, 240).map((pts) => ({ pts })), points, ...extra };
}

// ---------------------------------------------------------------------------
// Factor and remainder theorems (Grade 12 algebra)

/** A cubic with three rational roots: lead 1, −1 or 2 (then one root is n/2). */
function rootedCubic(rng: Rng) {
  const lead = rng.pick([1, 1, -1, 2]);
  const ints = distinct(rng, lead === 2 ? 2 : 3, 4);
  const fs: [number, number][] = ints.map((r) => [1, r]);
  if (lead === 2) fs.push([2, rng.pick([-3, -1, 1, 3])]);
  const p = fromFactors(lead === 2 ? 1 : lead, fs);
  const roots = fs.map(([d, n]) => rat(n, d));
  const factorText = (flip = false) => `${lead === -1 ? '-' : ''}${fs.map(([d, n]) => `(${sumPlain([[d, 'x'], [flip ? n : -n, '']])})`).join('')}`;
  const factorTex = `${lead === -1 ? '-' : ''}${fs.map(([d, n]) => `(${lin(d, n)})`).join('')}`;
  return { p, roots, fs, lead, factorText, factorTex };
}

export const factorTheorem: QuestionTemplate = {
  id: 'factor-theorem',
  skillId: 'factor-theorem',
  generate(rng, level) {
    if (level === 1) {
      const p = [rng.signed(1, 9), rng.signed(1, 6), rng.signed(1, 5), rng.pick([1, 1, 2, -1])];
      const a = rng.signed(1, 3);
      const R = ev(p, a);
      return {
        prompt: `Find the remainder when $f(x) = ${pTex(p)}$ is divided by $(${lin(1, a)})$.`,
        input: { kind: 'numeric', prefix: 'R =' },
        answer: exact(R),
        answerDisplay: `$R = f(${a}) = ${R}$`,
        hints: ['Remainder theorem: when $f(x)$ is divided by $(x - a)$, the remainder is $f(a)$.', `$${lin(1, a)} = 0$ when $x = ${a}$, so work out $f(${a})$.`],
        solution: [`$${lin(1, a)} = 0 \\Rightarrow x = ${a}$.`, `$R = f(${a}) = ${subTex(p, a)} = ${R}$`],
        misconceptions: keepNum([
          { code: 'remainder-theorem', answer: exact(ev(p, -a)), feedback: `That is $f(${-a})$. Dividing by $(${lin(1, a)})$ gives $f(${a})$: use the value of $x$ that makes the divisor zero.` },
          { code: 'remainder-theorem', answer: exact(p[0]!), feedback: 'That is just the constant term. Substitute the value of $x$ that makes the divisor zero into the whole of $f(x)$.' },
        ], R),
      };
    }
    if (level === 2) {
      let a = 0, b = 0, k = 0, d = 0;
      do {
        a = rng.pick([1, -1, 2, -2]);
        b = rng.signed(1, 6);
        k = rng.signed(1, 12);
        d = -(a ** 3 + b * a * a + k * a);
      } while (d === 0);
      const wrongK = (-((-a) ** 3) - b * a * a - d) / -a;
      return {
        prompt: `$(${lin(1, a)})$ is a factor of $f(x) = x^{3}${term(b, 'x^{2}', false)} + kx${term(d, '', false)}$. Find $k$.`,
        input: { kind: 'numeric', prefix: 'k =' },
        answer: exact(k),
        answerDisplay: `$k = ${k}$`,
        hints: ['If $(x - a)$ is a factor, then $f(a) = 0$.', `Substitute $x = ${a}$, set it equal to 0 and solve for $k$.`],
        solution: [`$f(${a}) = 0$: $(${a})^{3} + ${b < 0 ? `(${b})` : b}(${a})^{2} + k(${a}) + ${d < 0 ? `(${d})` : d} = 0$`, `$${a ** 3 + b * a * a + d} + ${a < 0 ? `(${a})` : a}k = 0$, so $k = ${k}$.`],
        misconceptions: Number.isInteger(wrongK) ? keepNum([{ code: 'remainder-theorem', answer: exact(wrongK), feedback: `You used $f(${-a}) = 0$. The factor $(${lin(1, a)})$ is zero when $x = ${a}$.` }], k) : [],
      };
    }
    if (level === 3) {
      const c = rootedCubic(rng);
      const given = c.fs[0]!;
      return {
        prompt: `Given that $(${lin(given[0], given[1])})$ is a factor of $f(x) = ${pTex(c.p)}$, factorise $f(x)$ fully.`,
        input: { kind: 'expression', prefix: 'f(x) =', variables: ['x'] },
        answer: { kind: 'expression', expr: c.factorText(), form: 'factorised' },
        answerDisplay: `$f(x) = ${c.factorTex}$`,
        hints: [`Divide $f(x)$ by $(${lin(given[0], given[1])})$ (long division, synthetic division or by inspection) to get a quadratic.`, 'Then factorise the quadratic.'],
        solution: [`$f(x) = (${lin(given[0], given[1])})(${pTex(fromFactors(c.lead === 2 ? 1 : c.lead, c.fs.slice(1)))})$`, `$f(x) = ${c.factorTex}$`],
        misconceptions: keepExprs([{ code: 'root-sign', expr: c.factorText(true), feedback: 'Check the signs: expand one bracket and compare it with $f(x)$. A factor $(x - a)$ gives the root $x = a$.' }], c.factorText()),
      };
    }
    if (level === 4) {
      const c = rootedCubic(rng);
      return {
        prompt: `Solve for $x$: $${pTex(c.p)} = 0$.`,
        input: { kind: 'roots', variable: 'x' },
        answer: rootsAns(c.roots),
        answerDisplay: `$x = ${c.roots.map(ratTex).join('$ or $x = ')}$`,
        hints: ['Find one root by trying factors of the constant term: $f(1)$, $f(-1)$, $f(2)$, …', 'When $f(a) = 0$, $(x - a)$ is a factor. Divide it out and solve the quadratic that is left.'],
        solution: [`$${pTex(c.p)} = ${c.factorTex}$`, `$x = ${c.roots.map(ratTex).join('$, $x = ')}$`],
        misconceptions: keepRoots([{ code: 'root-sign', values: c.roots.map((r) => rat(-r.n, r.d)), feedback: 'The signs are flipped: $(x - a) = 0$ gives $x = a$.' }], c.roots),
      };
    }
    // Level 5: two unknown coefficients, one factor and one remainder.
    let r = 0, s = 0, p = 0, q = 0, c0 = 0;
    do {
      [r, s] = two(rng, 3);
      p = rng.signed(1, 6);
      q = rng.signed(1, 9);
      c0 = -(r ** 3 + p * r * r + q * r);
    } while (c0 === 0 || Math.abs(c0) > 30);
    const f = [c0, q, p, 1];
    const R = ev(f, s);
    return {
      prompt: `$f(x) = x^{3} + px^{2} + qx ${c0 < 0 ? '-' : '+'} ${Math.abs(c0)}$. $(${lin(1, r)})$ is a factor of $f(x)$, and when $f(x)$ is divided by $(${lin(1, s)})$ the remainder is $${R}$. Find $p$.`,
      input: { kind: 'numeric', prefix: 'p =' },
      answer: exact(p),
      answerDisplay: `$p = ${p}$ (and $q = ${q}$)`,
      hints: [`Write two equations: $f(${r}) = 0$ and $f(${s}) = ${R}$.`, 'Solve them simultaneously for $p$ and $q$.'],
      solution: [
        `$f(${r}) = 0$: $${r * r}p + ${r < 0 ? `(${r})` : r}q = ${-(r ** 3) - c0}$`,
        `$f(${s}) = ${R}$: $${s * s}p + ${s < 0 ? `(${s})` : s}q = ${R - s ** 3 - c0}$`,
        `Solving: $p = ${p}$ and $q = ${q}$.`,
      ],
      misconceptions: keepNum([{ code: 'remainder-theorem', answer: exact(q), feedback: `That is $q$. The question asks for $p$, the coefficient of $x^2$.` }], p),
    };
  },
};

// ---------------------------------------------------------------------------
// Limits and first principles

export const firstPrinciples: QuestionTemplate = {
  id: 'first-principles',
  skillId: 'first-principles',
  generate(rng, level) {
    if (level === 1) {
      const [r, s] = two(rng, 6);
      const cube = rng.chance(0.3);
      const num = cube ? [-(r ** 3), 0, 0, 1] : fromFactors(1, [[1, r], [1, s]]);
      const ans = cube ? 3 * r * r : r - s;
      return {
        prompt: `Evaluate $\\displaystyle\\lim_{x \\to ${r}} \\frac{${pTex(num)}}{${lin(1, r)}}$.`,
        input: { kind: 'numeric' },
        answer: exact(ans),
        answerDisplay: `$${ans}$`,
        hints: [`Substituting $x = ${r}$ gives $\\frac{0}{0}$, which has no value. Factorise the top first.`, `The factor $(${lin(1, r)})$ cancels. Then substitute.`],
        solution: cube
          ? [`$x^{3} - ${r < 0 ? `(${r})` : r}^{3} = (${lin(1, r)})(x^{2} ${r < 0 ? '-' : '+'} ${Math.abs(r)}x + ${r * r})$`, `$\\displaystyle\\lim_{x \\to ${r}} (x^{2} ${r < 0 ? '-' : '+'} ${Math.abs(r)}x + ${r * r}) = ${ans}$`]
          : [`$\\dfrac{(${lin(1, r)})(${lin(1, s)})}{${lin(1, r)}} = ${lin(1, s)}$ for $x \\ne ${r}$`, `$\\displaystyle\\lim_{x \\to ${r}} (${lin(1, s)}) = ${ans}$`],
        misconceptions: keepNum([
          { code: 'limits', answer: exact(0), feedback: '$\\frac{0}{0}$ is not 0: it has no value. Factorise, cancel the common factor, then substitute.' },
          ...(cube ? [{ code: 'limits' as const, answer: exact(r * r), feedback: `After cancelling, three terms are left: $x^2 + ${r}x + ${r * r}$. Substitute into all of them.` }] : [{ code: 'root-sign' as const, answer: exact(r + s), feedback: `The other factor is $(${lin(1, s)})$, so substitute into $x ${s < 0 ? '+' : '-'} ${Math.abs(s)}$.` }]),
        ], ans),
      };
    }
    if (level === 2) {
      const a = rng.signed(1, 4);
      const cube = rng.chance(0.3);
      const b = cube ? 0 : rng.int(-6, 6);
      const f = cube ? [0, 0, 0, 1] : [0, b, 1];
      const ans = cube ? 3 * a * a : 2 * a + b;
      return {
        prompt: `$f(x) = ${pTex(f)}$. Evaluate $\\displaystyle\\lim_{h \\to 0} \\frac{f(${a} + h) - f(${a})}{h}$.`,
        input: { kind: 'numeric' },
        answer: exact(ans),
        answerDisplay: `$${ans}$`,
        hints: [`Work out $f(${a} + h)$ and $f(${a})$, subtract, then divide every term by $h$.`, 'Only then let $h \\to 0$.'],
        solution: cube
          ? [`$f(${a} + h) - f(${a}) = ${3 * a * a}h + ${3 * a < 0 ? `(${3 * a})` : 3 * a}h^{2} + h^{3}$`, `Divide by $h$: $${3 * a * a} + ${3 * a < 0 ? `(${3 * a})` : 3 * a}h + h^{2} \\to ${ans}$`]
          : [`$f(${a} + h) - f(${a}) = ${pTex([0, 2 * a + b, 1], 'h')}$`, `Divide by $h$: $${pTex([2 * a + b, 1], 'h')} \\to ${ans}$ as $h \\to 0$`],
        misconceptions: keepNum([
          { code: 'limits', answer: exact(0), feedback: 'Putting $h = 0$ straight in gives $\\frac{0}{0}$. Divide by $h$ first.' },
          { code: 'first-principles', answer: exact(ev(f, a)), feedback: `That is $f(${a})$, the y-value. The limit is the gradient of the tangent at $x = ${a}$.` },
        ], ans),
      };
    }
    if (level === 3) {
      const a = rng.signed(1, 4);
      const b = rng.signed(1, 7);
      const c = rng.int(-9, 9);
      const f = [c, b, a];
      const ans = sumPlain([[2 * a, 'xh'], [a, 'h^2'], [b, 'h']]);
      return {
        prompt: `$f(x) = ${pTex(f)}$. Find $f(x + h) - f(x)$ in its simplest form.`,
        input: { kind: 'expression', prefix: 'f(x + h) - f(x) =', variables: ['x', 'h'] },
        answer: { kind: 'expression', expr: ans },
        answerDisplay: `$${sum([[2 * a, 'xh'], [a, 'h^{2}'], [b, 'h']])}$`,
        hints: ['Replace every $x$ in $f(x)$ with $(x + h)$ and expand $(x + h)^2 = x^2 + 2xh + h^2$.', 'Subtract $f(x)$: every term without an $h$ cancels.'],
        solution: [`$f(x + h) = ${a === 1 ? '' : a === -1 ? '-' : a}(x + h)^{2} ${b < 0 ? '-' : '+'} ${Math.abs(b)}(x + h)${c === 0 ? '' : ` ${c < 0 ? '-' : '+'} ${Math.abs(c)}`}$`, `$= ${sum([[a, 'x^{2}'], [2 * a, 'xh'], [a, 'h^{2}'], [b, 'x'], [b, 'h'], [c, '']])}$`, `$f(x + h) - f(x) = ${sum([[2 * a, 'xh'], [a, 'h^{2}'], [b, 'h']])}$`],
        misconceptions: keepExprs([
          { code: 'first-principles', expr: sumPlain([[a, 'h^2'], [b, 'h']]), feedback: '$(x + h)^2$ is not $x^2 + h^2$: it is $x^2 + 2xh + h^2$. The middle term matters.' },
          { code: 'first-principles', expr: sumPlain([[a, 'x^2'], [2 * a, 'xh'], [a, 'h^2'], [b, 'x'], [b, 'h'], [c, '']]), feedback: 'That is $f(x + h)$. Now subtract $f(x)$.' },
        ], ans),
      };
    }
    if (level === 4) {
      const cube = rng.chance(0.3);
      const a = rng.signed(1, 5);
      const b = cube ? 0 : rng.signed(1, 9);
      const c = rng.int(-9, 9);
      const f = cube ? [c, 0, 0, a] : [c, b, a];
      const d = dP(f);
      const ans = pPlain(d);
      return {
        prompt: `Use first principles to find $f'(x)$ if $f(x) = ${pTex(f)}$.`,
        input: { kind: 'expression', prefix: "f'(x) =", variables: ['x'] },
        answer: { kind: 'expression', expr: ans },
        answerDisplay: `$f'(x) = ${pTex(d)}$`,
        hints: ["$f'(x) = \\displaystyle\\lim_{h \\to 0} \\frac{f(x + h) - f(x)}{h}$", 'Expand $f(x + h)$, subtract $f(x)$, divide every term by $h$, then let $h \\to 0$.'],
        solution: cube
          ? [`$f(x + h) - f(x) = ${a === 1 ? '' : a === -1 ? '-' : a}(3x^{2}h + 3xh^{2} + h^{3})$`, `$\\dfrac{f(x + h) - f(x)}{h} = ${a === 1 ? '' : a === -1 ? '-' : a}(3x^{2} + 3xh + h^{2})$`, `$f'(x) = \\displaystyle\\lim_{h \\to 0} ${a === 1 ? '' : a === -1 ? '-' : a}(3x^{2} + 3xh + h^{2}) = ${pTex(d)}$`]
          : [`$f(x + h) - f(x) = ${sum([[2 * a, 'xh'], [a, 'h^{2}'], [b, 'h']])}$`, `$\\dfrac{f(x + h) - f(x)}{h} = ${sum([[2 * a, 'x'], [a, 'h'], [b, '']])}$`, `$f'(x) = \\displaystyle\\lim_{h \\to 0} (${sum([[2 * a, 'x'], [a, 'h'], [b, '']])}) = ${pTex(d)}$`],
        misconceptions: keepExprs([
          ...(c !== 0 ? [{ code: 'power-rule' as const, expr: pPlain([c, ...d]), feedback: `The constant ${c} cancels when you subtract $f(x)$, so it is not in $f'(x)$.` }] : []),
          { code: 'first-principles', expr: pPlain(cube ? [0, 0, a] : [b, a]), feedback: cube ? 'Expand $(x + h)^3$ fully: $x^3 + 3x^2h + 3xh^2 + h^3$.' : '$(x + h)^2 = x^2 + 2xh + h^2$: the $2xh$ term is where the derivative comes from.' },
        ], ans),
      };
    }
    // Level 5: f(x) = k/x, or a quadratic, at a point.
    if (rng.chance(0.6)) {
      const k = rng.signed(1, 9);
      const a = rng.signed(1, 4);
      const ans = rat(-k, a * a);
      return {
        prompt: `$f(x) = \\dfrac{${k}}{x}$. Use first principles to find $f'(x)$, and then find $f'(${a})$.`,
        input: { kind: 'fraction', prefix: `f'(${a}) =` },
        answer: fracAns(ans),
        answerDisplay: `$f'(x) = -\\dfrac{${k}}{x^{2}}$, so $f'(${a}) = ${ratTex(ans)}$`,
        hints: [`$f(x + h) - f(x) = \\dfrac{${k}}{x + h} - \\dfrac{${k}}{x}$: put it over the common denominator $x(x + h)$.`, `The top becomes $${-k}h$. Divide by $h$, then let $h \\to 0$.`],
        solution: [`$f(x + h) - f(x) = \\dfrac{${k}x - ${k}(x + h)}{x(x + h)} = \\dfrac{${-k}h}{x(x + h)}$`, `$f'(x) = \\displaystyle\\lim_{h \\to 0} \\frac{${-k}}{x(x + h)} = -\\dfrac{${k}}{x^{2}}$`, `$f'(${a}) = -\\dfrac{${k}}{${a * a}} = ${ratTex(ans)}$`],
        misconceptions: keepFracs([
          { code: 'first-principles', value: rat(k, a * a), feedback: 'Check the sign: $\\dfrac{k}{x + h} - \\dfrac{k}{x}$ has numerator $kx - k(x + h) = -kh$.' },
          { code: 'first-principles', value: rat(-k, a), feedback: `The denominator is $x(x + h)$, which tends to $x^2$: square ${a}.` },
        ], ans),
      };
    }
    const a = rng.signed(1, 4);
    const b = rng.signed(1, 9);
    const x0 = rng.signed(1, 4);
    const f = [rng.int(-9, 9), b, a];
    const ans = rat(2 * a * x0 + b);
    return {
      prompt: `$f(x) = ${pTex(f)}$. Use first principles to find $f'(x)$, and then find $f'(${x0})$.`,
      input: { kind: 'fraction', prefix: `f'(${x0}) =` },
      answer: fracAns(ans),
      answerDisplay: `$f'(x) = ${pTex([b, 2 * a])}$, so $f'(${x0}) = ${2 * a * x0 + b}$`,
      hints: ["$f'(x) = \\displaystyle\\lim_{h \\to 0} \\frac{f(x + h) - f(x)}{h}$", `Find $f'(x)$ first, then substitute $x = ${x0}$.`],
      solution: [`$f(x + h) - f(x) = ${sum([[2 * a, 'xh'], [a, 'h^{2}'], [b, 'h']])}$`, `$f'(x) = \\displaystyle\\lim_{h \\to 0} (${sum([[2 * a, 'x'], [a, 'h'], [b, '']])}) = ${pTex([b, 2 * a])}$`, `$f'(${x0}) = ${2 * a * x0 + b}$`],
      misconceptions: keepFracs([{ code: 'first-principles', value: rat(ev(f, x0)), feedback: `That is $f(${x0})$. The question asks for the gradient $f'(${x0})$.` }], ans),
    };
  },
};

// ---------------------------------------------------------------------------
// Tangents to curves

function tangentQuestion(f: P, x0: number, extra: { prompt: string; hints?: string[] }) {
  const m = ev(dP(f), x0);
  const y0 = ev(f, x0);
  const c = y0 - m * x0;
  const ans = line(m, c);
  return {
    prompt: extra.prompt,
    input: EQ,
    answer: eqAns(ans),
    answerDisplay: `$${lineTex(m, c)}$`,
    hints: extra.hints ?? [`The gradient of the tangent is $f'(${x0})$; the point of contact is $(${x0};\\, f(${x0}))$.`, 'Then use $y - y_1 = m(x - x_1)$.'],
    solution: [`$f'(x) = ${pTex(dP(f))}$, so $m = f'(${x0}) = ${m}$`, `$f(${x0}) = ${y0}$, so the point of contact is $${pt(x0, y0)}$`, `$y - ${y0 < 0 ? `(${y0})` : y0} = ${m}(x - ${x0 < 0 ? `(${x0})` : x0})$, so $${lineTex(m, c)}$`],
    misconceptions: keepEqs([
      { code: 'tangent-line', expr: line(y0, y0 - y0 * x0), feedback: `You used $f(${x0}) = ${y0}$ as the gradient. The gradient is $f'(${x0}) = ${m}$.` },
      { code: 'sign-error', expr: line(m, y0 + m * x0), feedback: `Check the sign in $y - y_1 = m(x - x_1)$: it is $x - (${x0})$.` },
    ], ans),
  };
}

export const tangentLines: QuestionTemplate = {
  id: 'tangent-lines',
  skillId: 'tangent-lines',
  generate(rng, level) {
    if (level === 1 || level === 2) {
      const f = level === 1 ? [rng.int(-8, 8), rng.int(-6, 6), rng.signed(1, 3)] : [rng.int(-8, 8), rng.int(-6, 6), rng.int(-4, 4), rng.pick([1, 1, -1, 2])];
      const x0 = rng.signed(1, 3);
      return tangentQuestion(f, x0, { prompt: `Find the equation of the tangent to $f(x) = ${pTex(f)}$ at the point where $x = ${x0}$.` });
    }
    if (level === 3) {
      const a = rng.signed(1, 3);
      const x0 = rng.signed(1, 4);
      const m = rng.signed(1, 9);
      const b = m - 2 * a * x0;
      const f = [rng.int(-8, 8), b, a];
      const y0 = ev(f, x0);
      return {
        prompt: `Find the coordinates of the point on the graph of $f(x) = ${pTex(f)}$ where the gradient of the tangent is $${m}$.`,
        input: { kind: 'point', name: '' },
        answer: pointAns(rat(x0), rat(y0)),
        answerDisplay: `$${pt(x0, y0)}$`,
        hints: [`The gradient of the tangent is $f'(x)$. Solve $f'(x) = ${m}$.`, 'Then substitute that $x$ into $f(x)$ (not $f\'(x)$) for the y-coordinate.'],
        solution: [`$f'(x) = ${pTex([b, 2 * a])} = ${m}$, so $x = ${x0}$`, `$f(${x0}) = ${y0}$, so the point is $${pt(x0, y0)}$`],
        misconceptions: keepPoints([{ code: 'tangent-line', x: rat(x0), y: rat(m), feedback: "The y-coordinate comes from $f(x)$, not from $f'(x)$." }], rat(x0), rat(y0)),
      };
    }
    if (level === 4) {
      const a = rng.signed(1, 3);
      const x0 = rng.signed(1, 3);
      const m = rng.signed(1, 4);
      const b = m - 2 * a * x0;
      const f = [rng.int(-8, 8), b, a];
      const perp = rng.chance(0.5);
      const k = rng.int(-9, 9);
      const given = perp ? `$x ${m < 0 ? '-' : '+'} ${Math.abs(m) === 1 ? '' : Math.abs(m)}y = ${k}$` : `$${lineTex(m, k)}$`;
      return tangentQuestion(f, x0, {
        prompt: `A tangent to $f(x) = ${pTex(f)}$ is ${perp ? 'perpendicular' : 'parallel'} to the line ${given}. Find the equation of the tangent.`,
        hints: perp
          ? [`Write the line as $y = \\dots$: its gradient is $${ratTex(rat(-1, m))}$. Perpendicular gradients multiply to $-1$, so the tangent's gradient is $${m}$.`, `Solve $f'(x) = ${m}$ for the point of contact, then use $y - y_1 = m(x - x_1)$.`]
          : [`Parallel lines have the same gradient, so the tangent's gradient is $${m}$.`, `Solve $f'(x) = ${m}$ for the point of contact, then use $y - y_1 = m(x - x_1)$.`],
      });
    }
    // Level 5: points on a cubic where the tangent is parallel to a given line.
    const a = rng.pick([1, 2, -1, -2]);
    let r1 = 0, r2 = 0;
    do [r1, r2] = two(rng, 4); while ((a * (r1 + r2)) % 2 !== 0);
    const m = rng.signed(1, 9);
    const b = (-3 * a * (r1 + r2)) / 2;
    const c = 3 * a * r1 * r2 + m;
    const f = [rng.int(-9, 9), c, b, a];
    const roots = [rat(r1), rat(r2)];
    return {
      prompt: `At which values of $x$ is the tangent to $f(x) = ${pTex(f)}$ parallel to the line $${lineTex(m, rng.int(-5, 5))}$?`,
      input: { kind: 'roots', variable: 'x' },
      answer: rootsAns(roots),
      answerDisplay: `$x = ${r1}$ or $x = ${r2}$`,
      hints: [`Parallel means the same gradient: solve $f'(x) = ${m}$.`, 'That is a quadratic equation, so expect up to two answers.'],
      solution: [`$f'(x) = ${pTex(dP(f))} = ${m}$`, `$${pTex([c - m, 2 * b, 3 * a])} = 0$, so $${3 * a}(${lin(1, r1)})(${lin(1, r2)}) = 0$`, `$x = ${r1}$ or $x = ${r2}$`],
      misconceptions: keepRoots([{ code: 'root-sign', values: roots.map((r) => rat(-r.n, r.d)), feedback: 'The signs are flipped: $(x - a) = 0$ gives $x = a$.' }], roots),
    };
  },
};

// ---------------------------------------------------------------------------
// Cubic graphs

/** f(x) = ax³ − (3a/2)(p + q)x² + 3apqx + d, so f'(x) = 3a(x − p)(x − q). */
function stationaryCubic(rng: Rng) {
  const a = rng.pick([1, -1, 2, -2]);
  let p = 0, q = 0;
  do {
    p = rng.int(-3, 2);
    q = rng.int(p + 1, 4);
  } while ((a * (p + q)) % 2 !== 0);
  const d = rng.int(-6, 6);
  const f = [d, 3 * a * p * q, (-3 * a * (p + q)) / 2, a];
  return { a, p, q, f, fp: ev(f, p), fq: ev(f, q) };
}

export const cubicGraphs: QuestionTemplate = {
  id: 'cubic-graphs',
  skillId: 'cubic-graphs',
  generate(rng, level) {
    if (level === 1) {
      const a = rng.pick([1, -1, 2, -2, 3]);
      const b = rng.signed(1, 9);
      const f = [rng.int(-9, 9), rng.int(-9, 9), b, a];
      const ans = rat(-b, 3 * a);
      const concave = rng.chance(0.5);
      return {
        prompt: concave
          ? `$f(x) = ${pTex(f)}$ is concave ${a > 0 ? 'up' : 'down'} for $x > c$. Find $c$.`
          : `Find the x-coordinate of the point of inflection of $f(x) = ${pTex(f)}$.`,
        input: { kind: 'fraction', prefix: concave ? 'c =' : 'x =' },
        answer: fracAns(ans),
        answerDisplay: `$${concave ? 'c' : 'x'} = ${ratTex(ans)}$`,
        hints: ["The point of inflection is where $f''(x) = 0$: there the graph changes from concave down to concave up (or back).", `$f''(x) = ${pTex([2 * b, 6 * a])}$`],
        solution: [`$f'(x) = ${pTex(dP(f))}$`, `$f''(x) = ${pTex([2 * b, 6 * a])} = 0$, so $x = ${ratTex(ans)}$`, ...(concave ? [`For $x > ${ratTex(ans)}$, $f''(x) ${a > 0 ? '> 0' : '< 0'}$, so $f$ is concave ${a > 0 ? 'up' : 'down'}.`] : [])],
        misconceptions: keepFracs([
          { code: 'inflection', value: rat(-b, 2 * a), feedback: "$-\\frac{b}{2a}$ is the axis of a parabola. For a cubic, solve $f''(x) = 0$: $x = -\\frac{b}{3a}$." },
          { code: 'inflection', value: rat(b, 3 * a), feedback: "Check the sign: $6ax + 2b = 0$ gives $x = -\\frac{b}{3a}$." },
        ], ans),
      };
    }
    if (level === 2) {
      const c = stationaryCubic(rng);
      const askMax = rng.chance(0.5);
      // a > 0: maximum at the smaller x (p); a < 0: maximum at q.
      const atMax = c.a > 0 ? c.p : c.q;
      const x = askMax ? atMax : atMax === c.p ? c.q : c.p;
      const other = x === c.p ? c.q : c.p;
      const y = ev(c.f, x);
      return {
        prompt: `Find the coordinates of the local ${askMax ? 'maximum' : 'minimum'} of $f(x) = ${pTex(c.f)}$.`,
        input: { kind: 'point', name: '' },
        answer: pointAns(rat(x), rat(y)),
        answerDisplay: `$${pt(x, y)}$`,
        hints: ["Solve $f'(x) = 0$ to find the x-values of both turning points.", `Decide which is the ${askMax ? 'maximum' : 'minimum'}: use the sign of $a$ or of $f''(x)$. Then find $y$ from $f(x)$.`],
        solution: [`$f'(x) = ${pTex(dP(c.f))} = ${3 * c.a}(${lin(1, c.p)})(${lin(1, c.q)})$`, `$f'(x) = 0$ at $x = ${c.p}$ and $x = ${c.q}$`, `$f''(${x}) = ${ev([2 * c.f[2]!, 6 * c.a], x)}$ ${ev([2 * c.f[2]!, 6 * c.a], x) < 0 ? '< 0, so a maximum' : '> 0, so a minimum'}`, `$f(${x}) = ${y}$: the local ${askMax ? 'maximum' : 'minimum'} is $${pt(x, y)}$`],
        misconceptions: keepPoints([
          { code: 'stationary-points', x: rat(other), y: rat(ev(c.f, other)), feedback: `That is the other turning point. With $a ${c.a > 0 ? '> 0' : '< 0'}$ the graph ${c.a > 0 ? 'rises, falls, then rises' : 'falls, rises, then falls'}, so the ${askMax ? 'maximum' : 'minimum'} is at $x = ${x}$.` },
          { code: 'stationary-points', x: rat(x), y: rat(0), feedback: "$f'(x) = 0$ there, but the y-coordinate comes from $f(x)$." },
        ], rat(x), rat(y)),
      };
    }
    if (level === 3) {
      const a = rng.pick([1, -1, 2, -2]);
      // Roots at least 2 apart, so their labels don't run into each other.
      let roots: number[] = [];
      do roots = distinct(rng, 3, 4).sort((u, v) => u - v);
      while (roots[1]! - roots[0]! < 2 || roots[2]! - roots[1]! < 2);
      const f = fromFactors(a, roots.map((r): [number, number] => [1, r]));
      const g = (x: number) => ev(f, x);
      const y0 = f[0]!;
      const xr: [number, number] = [roots[0]! - 1, roots[2]! + 1];
      return {
        prompt: `The sketch shows $f(x) = a${roots.map((r) => `(${lin(1, r)})`).join('')}$. It cuts the y-axis at $(0;\\, ${y0})$. Find $a$.`,
        // Intercepts are dots on whole-number ticks; their values are in the prompt, so no labels to collide.
        figure: curveFigure(g, xr, [...roots.map((r) => ({ x: r, y: 0, text: '' })), { x: 0, y: y0, text: '' }], { xStep: 1 }),
        input: { kind: 'numeric', prefix: 'a =' },
        answer: exact(a),
        answerDisplay: `$a = ${a}$`,
        hints: [`Substitute the point $(0;\\, ${y0})$ into the equation.`, `$f(0) = a${roots.map((r) => `(${-r})`).join('')} = ${y0}$`],
        solution: [`$f(0) = a${roots.map((r) => `(${-r})`).join('')} = ${-roots[0]! * -roots[1]! * -roots[2]!}a$`, `$${-roots[0]! * -roots[1]! * -roots[2]!}a = ${y0}$, so $a = ${a}$`],
        misconceptions: keepNum([{ code: 'sign-error', answer: exact(-a), feedback: 'Check the sign. Also check the sketch: for large positive $x$ the graph goes ' + (a > 0 ? 'up, so $a > 0$.' : 'down, so $a < 0$.') }], a),
      };
    }
    if (level === 4) {
      let c = stationaryCubic(rng);
      while (c.q - c.p < 2) c = stationaryCubic(rng);
      const fp = dP(c.f); // 3a(x − p)(x − q)
      const g = (x: number) => ev(fp, x);
      const xr: [number, number] = [c.p - 2, c.q + 2];
      const figure = curveFigure(g, xr, [{ x: c.p, y: 0, text: `(${c.p}; 0)` }, { x: c.q, y: 0, text: `(${c.q}; 0)` }], { xStep: 1, yTitle: "f'(x)" });
      if (rng.chance(0.6)) {
        const askMax = rng.chance(0.5);
        const atMax = c.a > 0 ? c.p : c.q;
        const ans = askMax ? atMax : atMax === c.p ? c.q : c.p;
        return {
          prompt: `The sketch shows the graph of $f'(x)$, the derivative of a cubic function $f$. For which value of $x$ does $f$ have a local ${askMax ? 'maximum' : 'minimum'}?`,
          figure,
          input: { kind: 'numeric', prefix: 'x =' },
          answer: exact(ans),
          answerDisplay: `$x = ${ans}$`,
          hints: ["$f$ has a turning point where $f'(x) = 0$: where this graph cuts the x-axis.", `At a maximum, $f'$ changes from positive (above the axis) to negative. At a minimum, from negative to positive.`],
          solution: [`$f'(x) = 0$ at $x = ${c.p}$ and $x = ${c.q}$.`, `At $x = ${ans}$, $f'$ changes from ${askMax ? 'positive to negative, so $f$ has a local maximum' : 'negative to positive, so $f$ has a local minimum'}.`],
          misconceptions: keepNum([
            { code: 'stationary-points', answer: exact(ans === c.p ? c.q : c.p), feedback: `At $x = ${ans === c.p ? c.q : c.p}$, $f'$ changes from ${askMax ? 'negative to positive: that is a minimum' : 'positive to negative: that is a maximum'}.` },
            { code: 'inflection', answer: exact((c.p + c.q) / 2), feedback: "The turning point of the graph of $f'$ is where $f$ has its point of inflection, not a maximum or minimum." },
          ], ans),
        };
      }
      const mid = (c.p + c.q) / 2;
      return {
        prompt: `The sketch shows the graph of $f'(x)$, the derivative of a cubic function $f$. $f$ is concave down for $x ${c.a > 0 ? '<' : '>'} k$. Find $k$.`,
        figure,
        input: { kind: 'numeric', prefix: 'k =' },
        answer: exact(mid),
        answerDisplay: `$k = ${dec(mid)}$`,
        hints: ["$f$ is concave down where $f''(x) < 0$: where the graph of $f'$ is going down.", "The graph of $f'$ turns halfway between its x-intercepts."],
        solution: [`$f'$ has its turning point at $x = \\frac{${c.p} + ${c.q < 0 ? `(${c.q})` : c.q}}{2} = ${dec(mid)}$.`, `$f'$ ${c.a > 0 ? 'decreases to the left' : 'decreases to the right'} of it, so $f''(x) < 0$ and $f$ is concave down for $x ${c.a > 0 ? '<' : '>'} ${dec(mid)}$.`],
        misconceptions: keepNum([{ code: 'inflection', answer: exact(c.a > 0 ? c.p : c.q), feedback: "That is where $f'(x) = 0$: a turning point of $f$. Concavity changes where $f'$ itself turns." }], mid),
      };
    }
    // Level 5: how many integer k give f(x) = k three distinct real roots.
    let c = stationaryCubic(rng);
    while (Math.abs(c.fp - c.fq) < 3) c = stationaryCubic(rng);
    const lo = Math.min(c.fp, c.fq);
    const hi = Math.max(c.fp, c.fq);
    const ans = hi - lo - 1;
    return {
      prompt: `$f(x) = ${pTex(c.f)}$. For how many integer values of $k$ does $f(x) = k$ have three distinct real roots?`,
      input: { kind: 'numeric' },
      answer: exact(ans),
      answerDisplay: `$${ans}$ values: $${lo} < k < ${hi}$`,
      hints: ['$f(x) = k$ has three roots when the horizontal line $y = k$ cuts the graph three times.', 'That happens for $k$ strictly between the y-values of the two turning points.'],
      solution: [`$f'(x) = ${3 * c.a}(${lin(1, c.p)})(${lin(1, c.q)}) = 0$ at $x = ${c.p}$ and $x = ${c.q}$`, `$f(${c.p}) = ${c.fp}$ and $f(${c.q}) = ${c.fq}$`, `Three distinct roots for $${lo} < k < ${hi}$: that is $${ans}$ integers.`],
      misconceptions: keepNum([
        { code: 'stationary-points', answer: exact(hi - lo + 1), feedback: `At $k = ${lo}$ or $k = ${hi}$ the line touches a turning point, so two of the roots are equal. Leave those out.` },
        { code: 'stationary-points', answer: exact(hi - lo), feedback: `Count the integers strictly between ${lo} and ${hi}.` },
      ], ans),
    };
  },
};

// ---------------------------------------------------------------------------
// Optimisation and rates of change

/** Open boxes from an L × W sheet where the best cut x is a whole number (V'(x) = 12x² − 4(L + W)x + LW). */
const BOXES: { L: number; W: number; x: number }[] = (() => {
  const out: { L: number; W: number; x: number }[] = [];
  for (let W = 6; W <= 40; W++)
    for (let L = W; L <= 60; L++) {
      const D = L * L - L * W + W * W;
      const r = Math.round(Math.sqrt(D));
      if (r * r !== D || (L + W - r) % 6 !== 0) continue;
      const x = (L + W - r) / 6;
      if (x > 0 && x < W / 2) out.push({ L, W, x });
    }
  return out;
})();
export const boxVolume = (L: number, W: number, x: number) => x * (L - 2 * x) * (W - 2 * x);

export const optimisation: QuestionTemplate = {
  id: 'optimisation',
  skillId: 'optimisation',
  generate(rng, level) {
    if (level === 1) {
      if (rng.chance(0.5)) {
        const u = rng.pick([15, 20, 25, 30, 35, 40]);
        const h0 = rng.pick([0, 2, 5, 10, 20]);
        const T = rng.int(1, 4);
        const h = [h0, u, -5];
        const v = u - 10 * T;
        return {
          prompt: `A ball is thrown upwards. Its height after $t$ seconds is $h(t) = ${pTex(h, 't')}$ metres. Find its velocity, in m/s, after ${T} s.`,
          input: { kind: 'numeric', unit: 'm/s' },
          answer: exact(v),
          answerDisplay: `$h'(${T}) = ${v}$ m/s`,
          hints: ["Velocity is the rate of change of height: $v(t) = h'(t)$.", `Find $h'(t)$, then substitute $t = ${T}$.`],
          solution: [`$h'(t) = ${pTex([u, -10], 't')}$`, `$h'(${T}) = ${v}$ m/s${v < 0 ? ' (negative: the ball is coming down)' : ''}`],
          misconceptions: keepNum([{ code: 'rate-of-change', answer: exact(ev(h, T)), feedback: `That is the height after ${T} s. Velocity is how fast the height changes: $h'(${T})$.` }], v),
        };
      }
      const V = [rng.int(20, 200), 0, rng.int(1, 6), rng.pick([1, 2])];
      const T = rng.int(1, 5);
      const r = ev(dP(V), T);
      return {
        prompt: `Water flows into a tank. After $t$ minutes the tank holds $V(t) = ${pTex(V, 't')}$ litres. At what rate, in litres per minute, is the volume changing when $t = ${T}$?`,
        input: { kind: 'numeric', unit: 'L/min' },
        answer: exact(r),
        answerDisplay: `$V'(${T}) = ${r}$ L/min`,
        hints: ["The rate of change is the derivative: $V'(t)$.", `Find $V'(t)$, then substitute $t = ${T}$.`],
        solution: [`$V'(t) = ${pTex(dP(V), 't')}$`, `$V'(${T}) = ${r}$ L/min`],
        misconceptions: keepNum([{ code: 'rate-of-change', answer: exact(ev(V, T)), feedback: `That is how much water is in the tank, $V(${T})$. The rate is $V'(${T})$.` }], r),
      };
    }
    if (level === 2) {
      const u = rng.pick([10, 15, 20, 25, 30, 40]);
      const h0 = rng.pick([0, 1, 2, 5, 10, 15]);
      const h = [h0, u, -5];
      const t = u / 10;
      const H = h0 + (u * u) / 20;
      return {
        prompt: `A stone is thrown upwards. Its height after $t$ seconds is $h(t) = ${pTex(h, 't')}$ metres. Find its maximum height.`,
        input: { kind: 'numeric', unit: 'm' },
        answer: exact(H),
        answerDisplay: `$${dec(H)}$ m`,
        hints: ["At the highest point the stone stops rising: $h'(t) = 0$.", 'Solve for $t$, then substitute that $t$ into $h(t)$.'],
        solution: [`$h'(t) = ${pTex([u, -10], 't')} = 0$, so $t = ${dec(t)}$ s`, `$h(${dec(t)}) = ${dec(H)}$ m`],
        misconceptions: keepNum([{ code: 'optimisation', answer: exact(t), feedback: `$t = ${dec(t)}$ is when the stone is highest. Substitute it into $h(t)$ for the height.` }], H),
      };
    }
    if (level === 3) {
      let p = 0, q = 0;
      do {
        p = rng.int(1, 4);
        q = rng.int(p + 1, 7);
      } while ((p + q) % 2 !== 0);
      const s0 = rng.int(0, 9);
      const s = [s0, 3 * p * q, (-3 * (p + q)) / 2, 1];
      if (rng.chance(0.5)) {
        const roots = [rat(p), rat(q)];
        return {
          prompt: `A particle moves along a line. Its displacement after $t$ seconds is $s(t) = ${pTex(s, 't')}$ metres. At what times is it at rest?`,
          input: { kind: 'roots', variable: 't' },
          answer: rootsAns(roots),
          answerDisplay: `$t = ${p}$ s and $t = ${q}$ s`,
          hints: ["At rest means velocity zero: $v(t) = s'(t) = 0$.", 'Factorise the quadratic.'],
          solution: [`$v(t) = s'(t) = ${pTex(dP(s), 't')} = 3(${lin(1, p, 't')})(${lin(1, q, 't')})$`, `$v(t) = 0$ at $t = ${p}$ s and $t = ${q}$ s`],
          misconceptions: keepRoots([{ code: 'root-sign', values: roots.map((r) => rat(-r.n, r.d)), feedback: 'Time is positive here. $(t - a) = 0$ gives $t = a$.' }], roots),
        };
      }
      const T = rng.int(1, 6);
      const acc = 6 * T - 3 * (p + q);
      return {
        prompt: `A particle moves along a line. Its displacement after $t$ seconds is $s(t) = ${pTex(s, 't')}$ metres. Find its acceleration, in m/s², when $t = ${T}$.`,
        input: { kind: 'numeric', unit: 'm/s²' },
        answer: exact(acc),
        answerDisplay: `$a(${T}) = ${acc}$ m/s²`,
        hints: ["Velocity is $s'(t)$ and acceleration is the rate of change of velocity: $a(t) = s''(t)$.", `Differentiate twice, then substitute $t = ${T}$.`],
        solution: [`$v(t) = s'(t) = ${pTex(dP(s), 't')}$`, `$a(t) = v'(t) = ${pTex(dP(dP(s)), 't')}$`, `$a(${T}) = ${acc}$ m/s²`],
        misconceptions: keepNum([{ code: 'rate-of-change', answer: exact(ev(dP(s), T)), feedback: `That is the velocity $s'(${T})$. Acceleration is $s''(${T})$: differentiate again.` }], acc),
      };
    }
    if (level === 4) {
      const b = rng.pick(BOXES.filter((x) => x.L <= 40));
      const V = boxVolume(b.L, b.W, b.x);
      const askVolume = rng.chance(0.5);
      const Vp = [b.L * b.W, -4 * (b.L + b.W), 12];
      const other = (b.L + b.W + Math.sqrt(b.L * b.L - b.L * b.W + b.W * b.W)) / 6;
      return {
        prompt: `An open box is made from a ${b.L} cm by ${b.W} cm sheet of cardboard by cutting a square of side $x$ cm from each corner and folding up the sides. ${askVolume ? 'Find the largest possible volume of the box.' : 'Find the value of $x$ that gives the largest volume.'}`,
        input: { kind: 'numeric', unit: askVolume ? 'cm³' : 'cm' },
        answer: exact(askVolume ? V : b.x),
        answerDisplay: askVolume ? `$${V}$ cm³ (when $x = ${b.x}$ cm)` : `$x = ${b.x}$ cm`,
        hints: [`The base is $(${b.L} - 2x)$ by $(${b.W} - 2x)$ and the height is $x$, so $V(x) = x(${b.L} - 2x)(${b.W} - 2x)$.`, "Expand, then solve $V'(x) = 0$. Only one solution fits: $x$ must be less than half of the short side."],
        solution: [
          `$V(x) = x(${b.L} - 2x)(${b.W} - 2x) = ${pTex([0, b.L * b.W, -2 * (b.L + b.W), 4])}$`,
          `$V'(x) = ${pTex(Vp)} = 0$, so $x = ${b.x}$ or $x = ${dec(other)}$`,
          `$x = ${dec(other)}$ is impossible (it is more than half of ${b.W}), so $x = ${b.x}$ cm`,
          ...(askVolume ? [`$V(${b.x}) = ${b.x} \\times ${b.L - 2 * b.x} \\times ${b.W - 2 * b.x} = ${V}$ cm³`] : []),
        ],
        misconceptions: keepNum(askVolume ? [{ code: 'optimisation', answer: exact(b.x), feedback: `$x = ${b.x}$ gives the largest volume. Substitute it into $V(x)$.` }] : [{ code: 'optimisation', answer: exact(V), feedback: `That is the largest volume. The question asks for $x$.` }], askVolume ? V : b.x),
      };
    }
    if (rng.chance(0.5)) {
      const P = rng.int(10, 60) * 4;
      const A = (P * P) / 8;
      return {
        prompt: `A farmer has ${P} m of fencing to make a rectangular camp along a straight river. The river side needs no fence. Find the largest area the camp can have.`,
        input: { kind: 'numeric', unit: 'm²' },
        answer: exact(A),
        answerDisplay: `$${A}$ m²`,
        hints: [`Let the two sides at right angles to the river be $x$. Then the side along the river is $${P} - 2x$, and $A(x) = x(${P} - 2x)$.`, "Solve $A'(x) = 0$, then substitute back into $A(x)$."],
        solution: [`$A(x) = ${pTex([0, P, -2])}$`, `$A'(x) = ${pTex([P, -4])} = 0$, so $x = ${P / 4}$ m`, `$A(${P / 4}) = ${P / 4} \\times ${P / 2} = ${A}$ m²`],
        misconceptions: keepNum([
          { code: 'optimisation', answer: exact((P * P) / 16), feedback: 'That is a square with fence on all four sides. The river side needs no fence, so the best shape is twice as long as it is wide.' },
          { code: 'optimisation', answer: exact(P / 4), feedback: `$x = ${P / 4}$ m gives the largest area. Substitute it into $A(x)$.` },
        ], A),
      };
    }
    // Profit: P'(x) = −3(x − m)(x + n), so the maximum (x ≥ 0) is at x = m.
    let m = 0, n = 0;
    do {
      m = rng.int(2, 8);
      n = rng.int(1, 9);
    } while ((n - m) % 2 !== 0);
    const profit = [0, 3 * m * n, (-3 * (n - m)) / 2, -1];
    profit[0] = -rng.int(1, Math.max(1, Math.floor(ev(profit, m) / 2)));
    const best = ev(profit, m);
    const askX = rng.chance(0.5);
    return {
      prompt: `A factory's profit, in thousands of rand, from making $x$ hundred items is $P(x) = ${pTex(profit)}$, for $x \\ge 0$. ${askX ? 'How many hundred items should it make for the greatest profit?' : 'Find the greatest profit, in thousands of rand.'}`,
      input: { kind: 'numeric', unit: askX ? 'hundred items' : 'thousand rand' },
      answer: exact(askX ? m : best),
      answerDisplay: askX ? `$x = ${m}$ (hundred items)` : `$P(${m}) = ${best}$ thousand rand`,
      hints: ["The greatest profit is at a turning point: solve $P'(x) = 0$.", 'Only the positive solution makes sense here, because $x \\ge 0$.'],
      solution: [`$P'(x) = ${pTex(dP(profit))} = -3(${lin(1, m)})(${lin(1, -n)})$`, `$P'(x) = 0$ at $x = ${m}$ or $x = ${-n}$; only $x = ${m}$ is possible`, `$P(${m}) = ${best}$ thousand rand`],
      misconceptions: keepNum(askX ? [{ code: 'optimisation', answer: exact(best), feedback: 'That is the greatest profit. The question asks how many items.' }] : [{ code: 'optimisation', answer: exact(m), feedback: `$x = ${m}$ is how many items give the most profit. Substitute it into $P(x)$.` }], askX ? m : best),
    };
  },
};
