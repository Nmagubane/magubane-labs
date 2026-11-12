import type { QuestionTemplate, Misconception, AnswerSpec, GeometryFigure } from '../types.ts';
import type { Rng } from '../rng.ts';
import type { MistakeCode } from '../mistakes.ts';
import { rat, ratTex, eq as req, add, sub, mul, div, neg as rneg, toNumber, type Rational } from '../rational.ts';
import { expressionsEquivalent } from '../expr.ts';
import { choice, type Opt } from './kit.ts';

/**
 * Trigonometry, Grades 10–12 (CAPS Paper 2). Exam trigonometry is mostly done without a calculator, so most
 * questions are built to have exact rational answers (special angles, reduction, compound angles); the
 * sine, cosine and area rules and the calculator equations use rounded answers.
 */

const R = (n: number, d = 1) => rat(n, d);
const D = (a: number) => `${a}^\\circ`;
const fracAns = (r: Rational): AnswerSpec => ({ kind: 'fraction', n: r.n, d: r.d, requireSimplest: false });
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;
const tc = (v: number, dp: number) => v.toFixed(dp).replace('.', '{,}');
type Fn = 'sin' | 'cos' | 'tan';

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

const rootsAns = (vals: number[]): AnswerSpec => ({ kind: 'roots', values: vals.map((v) => { const r = rat(Math.round(v * 10), 10); return { n: r.n, d: r.d }; }) });
const sameSet = (a: number[], b: number[]) => a.length === b.length && [...a].sort((x, y) => x - y).every((v, i) => Math.abs(v - [...b].sort((x, y) => x - y)[i]!) < 1e-6);
function keepRoots(ms: { code: MistakeCode; vals: number[]; feedback: string }[], correct: number[]): Misconception[] {
  const seen = [correct];
  const out: Misconception[] = [];
  for (const m of ms) {
    if (m.vals.length === 0 || seen.some((s) => sameSet(s, m.vals))) continue;
    seen.push(m.vals);
    out.push({ code: m.code, answer: rootsAns(m.vals), feedback: m.feedback });
  }
  return out;
}

/** Exact value of a trig function at a multiple of 15°, when it is rational; null otherwise. */
export function exactTrig(fn: Fn, a: number): Rational | null {
  const t = ((a % 360) + 360) % 360;
  const S: Record<number, Rational> = { 0: R(0), 30: R(1, 2), 90: R(1), 150: R(1, 2), 180: R(0), 210: R(-1, 2), 270: R(-1), 330: R(-1, 2) };
  const C: Record<number, Rational> = { 0: R(1), 60: R(1, 2), 90: R(0), 120: R(-1, 2), 180: R(-1), 240: R(-1, 2), 270: R(0), 300: R(1, 2) };
  const T: Record<number, Rational> = { 0: R(0), 45: R(1), 135: R(-1), 180: R(0), 225: R(1), 315: R(-1) };
  return (fn === 'sin' ? S : fn === 'cos' ? C : T)[t] ?? null;
}
const trig = (fn: Fn, a: number) => (fn === 'sin' ? Math.sin(rad(a)) : fn === 'cos' ? Math.cos(rad(a)) : Math.tan(rad(a)));

/** Quadrant 1–4 of a direction (x; y). */
const quadrant = (x: number, y: number) => (x > 0 ? (y > 0 ? 1 : 4) : y > 0 ? 2 : 3);
const QNAME = ['', 'first', 'second', 'third', 'fourth'];

const TRIPLES: readonly [number, number, number][] = [
  [3, 4, 5],
  [4, 3, 5],
  [5, 12, 13],
  [12, 5, 13],
  [8, 15, 17],
  [15, 8, 17],
  [7, 24, 25],
  [24, 7, 25],
];

// ---------------------------------------------------------------------------
/** Products and powers of special angles whose value is rational. `swap` is what a sin ↔ cos mix-up gives. */
const SPECIAL_TERMS: readonly { tex: string; v: Rational; swap: Rational; work: string }[] = [
  { tex: '\\sin 30^\\circ', v: R(1, 2), swap: R(1, 2), work: '\\tfrac{1}{2}' },
  { tex: '\\cos 60^\\circ', v: R(1, 2), swap: R(1, 2), work: '\\tfrac{1}{2}' },
  { tex: '\\tan 45^\\circ', v: R(1), swap: R(1), work: '1' },
  { tex: '\\sin^2 60^\\circ', v: R(3, 4), swap: R(1, 4), work: '\\left(\\tfrac{\\sqrt{3}}{2}\\right)^2' },
  { tex: '\\cos^2 30^\\circ', v: R(3, 4), swap: R(1, 4), work: '\\left(\\tfrac{\\sqrt{3}}{2}\\right)^2' },
  { tex: '\\cos^2 60^\\circ', v: R(1, 4), swap: R(3, 4), work: '\\left(\\tfrac{1}{2}\\right)^2' },
  { tex: '\\sin^2 45^\\circ', v: R(1, 2), swap: R(1, 2), work: '\\left(\\tfrac{\\sqrt{2}}{2}\\right)^2' },
  { tex: '\\tan^2 60^\\circ', v: R(3), swap: R(1, 3), work: '(\\sqrt{3})^2' },
  { tex: '\\tan^2 30^\\circ', v: R(1, 3), swap: R(3), work: '\\left(\\tfrac{1}{\\sqrt{3}}\\right)^2' },
  { tex: '\\sin 90^\\circ', v: R(1), swap: R(0), work: '1' },
  { tex: '\\cos 0^\\circ', v: R(1), swap: R(0), work: '1' },
  { tex: '\\tan 60^\\circ \\cdot \\tan 30^\\circ', v: R(1), swap: R(1), work: '\\sqrt{3} \\cdot \\tfrac{1}{\\sqrt{3}}' },
  { tex: '\\sin 60^\\circ \\cdot \\tan 30^\\circ', v: R(1, 2), swap: R(1, 2), work: '\\tfrac{\\sqrt{3}}{2} \\cdot \\tfrac{1}{\\sqrt{3}}' },
  { tex: '\\cos 30^\\circ \\cdot \\tan 60^\\circ', v: R(3, 2), swap: R(1, 6), work: '\\tfrac{\\sqrt{3}}{2} \\cdot \\sqrt{3}' },
];

export const trigSpecial: QuestionTemplate = {
  id: 'trig-special',
  skillId: 'trig-special',
  generate(rng, level) {
    if (level === 1) {
      const [A, B] = rng.shuffle(SPECIAL_TERMS).slice(0, 2) as [(typeof SPECIAL_TERMS)[number], (typeof SPECIAL_TERMS)[number]];
      const k = rng.pick([1, 2, 3, 4]);
      const op = rng.pick(['+', '-', '\\times'] as const);
      const f = (a: Rational, b: Rational) => (op === '+' ? add(mul(R(k), a), b) : op === '-' ? sub(mul(R(k), a), b) : mul(mul(R(k), a), b));
      const v = f(A.v, B.v);
      const kt = k === 1 ? '' : `${k}`;
      return {
        prompt: `Without a calculator, find the value of $${kt}${A.tex} ${op} ${B.tex}$.`,
        input: { kind: 'fraction' },
        answer: fracAns(v),
        answerDisplay: `$${ratTex(v)}$`,
        hints: ['Replace each ratio with its exact value from the special triangles.', '$\\sin^2 60^\\circ$ means $(\\sin 60^\\circ)^2$.'],
        solution: [`$= ${kt}${k === 1 ? '' : '\\cdot '}${A.work} ${op} ${B.work}$`, `$= ${kt}${k === 1 ? '' : '\\cdot '}${ratTex(A.v)} ${op} ${ratTex(B.v)} = ${ratTex(v)}$`],
        misconceptions: keepFracs([{ code: 'special-angles', value: f(A.swap, B.swap), feedback: 'It looks like sin and cos values were swapped. $\\sin 30^\\circ = \\tfrac{1}{2}$ but $\\sin 60^\\circ = \\tfrac{\\sqrt{3}}{2}$.' }], v),
      };
    }
    if (level === 2 || level === 3) {
      const [u, v, r] = rng.pick(TRIPLES);
      const x = rng.chance(0.5) ? u : -u;
      const y = rng.chance(0.5) ? v : -v;
      const q = quadrant(x, y);
      const val = { sin: R(y, r), cos: R(x, r), tan: R(y, x) };
      const abs = { sin: R(v, r), cos: R(u, r), tan: R(v, u) };
      const fnTex = (f: Fn) => `\\${f}\\theta`;
      if (level === 2) {
        const fn = rng.pick(['sin', 'cos', 'tan'] as const);
        return {
          prompt: `$P(${x};\\, ${y})$ is a point on the terminal arm of angle $\\theta$. Find $${fnTex(fn)}$.`,
          figure: { kind: 'graph', xRange: [Math.min(-2, x) - 2, Math.max(2, x) + 2], yRange: [Math.min(-2, y) - 2, Math.max(2, y) + 2], segments: [{ x1: 0, y1: 0, x2: x, y2: y }, { x1: x, y1: y, x2: x, y2: 0, dashed: true }], points: [{ x, y, label: 'P' }] },
          input: { kind: 'fraction', prefix: `${fnTex(fn)} =` },
          answer: fracAns(val[fn]),
          answerDisplay: `$${fnTex(fn)} = ${ratTex(val[fn])}$`,
          hints: ['$r = \\sqrt{x^2 + y^2}$, and r is always positive.', '$\\sin\\theta = \\dfrac{y}{r}$, $\\cos\\theta = \\dfrac{x}{r}$, $\\tan\\theta = \\dfrac{y}{x}$.'],
          solution: [`$r = \\sqrt{(${x})^2 + (${y})^2} = \\sqrt{${r * r}} = ${r}$`, `$${fnTex(fn)} = ${fn === 'sin' ? `\\dfrac{y}{r} = \\dfrac{${y}}{${r}}` : fn === 'cos' ? `\\dfrac{x}{r} = \\dfrac{${x}}{${r}}` : `\\dfrac{y}{x} = \\dfrac{${y}}{${x}}`} = ${ratTex(val[fn])}$`],
          misconceptions: keepFracs(
            [
              { code: 'cast-sign', value: abs[fn], feedback: `P is in the ${QNAME[q]} quadrant, so use the signs of x and y. Only r is always positive.` },
              { code: 'cast-sign', value: rneg(val[fn]), feedback: 'Check the sign: it comes from the signs of x and y.' },
              { code: 'special-angles', value: fn === 'sin' ? val.cos : fn === 'cos' ? val.sin : R(x, y), feedback: '$\\sin\\theta = \\dfrac{y}{r}$ and $\\cos\\theta = \\dfrac{x}{r}$: the y-value goes with sin.' },
            ],
            val[fn],
          ),
        };
      }
      // Level 3: one ratio and a sign condition → another ratio (or a combination).
      const givenFn = rng.pick(['sin', 'cos', 'tan'] as const);
      const other: Fn = givenFn === 'tan' ? rng.pick(['sin', 'cos'] as const) : rng.pick(givenFn === 'sin' ? (['cos', 'tan'] as const) : (['sin', 'tan'] as const));
      const condFn: Fn = givenFn === 'sin' ? 'cos' : givenFn === 'cos' ? 'sin' : rng.pick(['sin', 'cos'] as const);
      const condPos = (condFn === 'sin' ? y : x) > 0;
      const combo = rng.chance(0.4);
      const k1 = r;
      const target = combo ? add(mul(R(k1), val[other]), R(0)) : val[other];
      return {
        prompt: `$${fnTex(givenFn)} = ${ratTex(val[givenFn])}$ and $${fnTex(condFn)} ${condPos ? '> 0' : '< 0'}$. Without a calculator, find ${combo ? `$${k1}${fnTex(other)}$` : `$${fnTex(other)}$`}.`,
        input: { kind: 'fraction' },
        answer: fracAns(target),
        answerDisplay: `$${ratTex(target)}$`,
        hints: [`Use the signs to find the quadrant, then draw a sketch with $x$, $y$ and $r$.`, `${givenFn === 'tan' ? `$\\tan\\theta = \\dfrac{y}{x}$` : givenFn === 'sin' ? `$\\sin\\theta = \\dfrac{y}{r}$` : `$\\cos\\theta = \\dfrac{x}{r}$`}, and $x^2 + y^2 = r^2$.`],
        solution: [`$${fnTex(givenFn)} ${val[givenFn].n < 0 ? '< 0' : '> 0'}$ and $${fnTex(condFn)} ${condPos ? '> 0' : '< 0'}$, so $\\theta$ is in the ${QNAME[q]} quadrant.`, `$x = ${x}$, $y = ${y}$, $r = ${r}$ (Pythagoras: $${u}^2 + ${v}^2 = ${r}^2$).`, `$${fnTex(other)} = ${ratTex(val[other])}$${combo ? `, so $${k1}${fnTex(other)} = ${ratTex(target)}$` : ''}.`],
        misconceptions: keepFracs([{ code: 'cast-sign', value: combo ? mul(R(k1), abs[other]) : abs[other], feedback: `Work out the quadrant first: θ is in the ${QNAME[q]} quadrant, so check the sign of each of x and y.` }, { code: 'cast-sign', value: rneg(target), feedback: 'The size is right but the sign is wrong. Use CAST for the quadrant.' }], target),
      };
    }
    if (level === 4) {
      if (rng.chance(0.3)) {
        const [fn, lhs, x] = rng.pick([['sin', '2\\sin x = 1', 30], ['cos', '2\\cos x = 1', 60], ['tan', '\\tan x = 1', 45], ['sin', '\\sin x = 1', 90], ['cos', '2\\cos x - 1 = 0', 60], ['sin', '4\\sin x = 2', 30], ['tan', '3\\tan x - 3 = 0', 45]] as const);
        return {
          prompt: `Solve for $x$ without a calculator, if $0^\\circ \\le x \\le 90^\\circ$: $\\ ${lhs}$`,
          input: { kind: 'numeric', prefix: 'x =', unit: '°' },
          answer: { kind: 'numeric', value: x, tolerance: 0.01 },
          answerDisplay: `$x = ${D(x)}$`,
          hints: [`Get $\\${fn} x$ on its own.`, 'Which special angle has that value?'],
          solution: [`$\\${fn} x = ${ratTex(exactTrig(fn, x)!)}$`, `$x = ${D(x)}$`],
          misconceptions: keepNums([{ code: 'special-angles', value: 90 - x, feedback: `Close: that is the angle for $\\${fn === 'sin' ? 'cos' : 'sin'}$. $\\${fn} ${D(90 - x)}$ is not $${ratTex(exactTrig(fn, x)!)}$.` }], x, 0.01),
        };
      }
      const fn = rng.pick(['sin', 'cos', 'tan'] as const);
      let a: number, b: number, x: number;
      do {
        a = rng.int(2, 9);
        b = rng.int(1, fn === 'tan' ? 15 : a - 1);
        x = deg(fn === 'sin' ? Math.asin(b / a) : fn === 'cos' ? Math.acos(b / a) : Math.atan(b / a));
      } while (Math.abs(((x * 10) % 1) - 0.5) < 0.1 || exactTrig(fn, Math.round(x)) !== null);
      return {
        prompt: `Solve for $x$, if $0^\\circ \\le x \\le 90^\\circ$: $\\ ${a}\\${fn} x = ${b}$. Round to one decimal place.`,
        input: { kind: 'numeric', prefix: 'x =', unit: '°' },
        answer: { kind: 'numeric', value: round1(x), tolerance: 0.06 },
        answerDisplay: `$x = ${tc(x, 1)}^\\circ$`,
        hints: [`Divide by ${a}: $\\${fn} x = \\dfrac{${b}}{${a}}$.`, `Then use $\\${fn}^{-1}$ on your calculator (in degree mode).`],
        solution: [`$\\${fn} x = \\dfrac{${b}}{${a}}$`, `$x = \\${fn}^{-1}\\left(\\dfrac{${b}}{${a}}\\right) = ${tc(x, 1)}^\\circ$`],
        misconceptions: keepNums(
          [
            { code: 'trig-equation', value: fn === 'tan' ? round1(deg(Math.atan(a / b))) : null, feedback: 'Divide by the coefficient: $\\tan x = \\dfrac{b}{a}$, not $\\dfrac{a}{b}$.' },
            { code: 'special-angles', value: fn === 'tan' ? null : round1(90 - x), feedback: `That is the answer for $\\${fn === 'sin' ? 'cos' : 'sin'}$. Use $\\${fn}^{-1}$.` },
          ],
          round1(x),
          0.06,
        ),
      };
    }
    // Level 5: the angle is 2x, 3x, x + c or x − c.
    const fn = rng.pick(['sin', 'cos', 'tan'] as const);
    const special = rng.chance(0.5);
    let theta: number;
    let valTex: string;
    if (special) {
      theta = fn === 'sin' ? rng.pick([30, 90]) : fn === 'cos' ? rng.pick([60, 0]) : 45;
      valTex = ratTex(exactTrig(fn, theta)!);
    } else {
      theta = rng.int(20, 70);
      valTex = tc(trig(fn, theta), 4);
    }
    const form = rng.pick(['mul', 'shift'] as const);
    let argTex: string;
    let x: number;
    let wrong: number;
    if (form === 'mul') {
      const k = rng.pick([2, 3]);
      argTex = `${k}x`;
      x = theta / k;
      wrong = theta;
    } else {
      const c = rng.signed(5, 30);
      argTex = `x ${c > 0 ? '+' : '-'} ${D(Math.abs(c))}`;
      x = theta - c;
      wrong = theta;
      if (x < 0 || x > 90) {
        x = theta + Math.abs(c);
        argTex = `x - ${D(Math.abs(c))}`;
      }
    }
    return {
      prompt: `Solve for $x$, if $0^\\circ \\le x \\le 90^\\circ$: $\\ \\${fn}(${argTex}) = ${valTex}$.${special ? '' : ' Round to one decimal place.'}`,
      input: { kind: 'numeric', prefix: 'x =', unit: '°' },
      answer: { kind: 'numeric', value: round1(x), tolerance: special ? 0.01 : 0.11 },
      answerDisplay: `$x = ${tc(x, special && Number.isInteger(x) ? 0 : 1)}^\\circ$`,
      hints: [`Solve for the whole angle $(${argTex})$ first.`, `$${argTex} = ${special ? D(theta) : `\\${fn}^{-1}(${valTex})`}$, then work back to $x$.`],
      solution: [`$${argTex} = ${D(theta)}$`, `$x = ${tc(x, special && Number.isInteger(x) ? 0 : 1)}^\\circ$`],
      misconceptions: keepNums([{ code: 'trig-equation', value: round1(wrong), feedback: `That is the value of the whole angle $${argTex}$. Now solve for $x$.` }], round1(x), special ? 0.01 : 0.11),
    };
  },
};

// ---------------------------------------------------------------------------
/** Angles with a rational value for each function, for reduction practice (non-acute, negative or over 360°). */
const RED_ANGLES: Record<Fn, number[]> = {
  sin: [150, 210, 330, 270, 180, -30, -150, 390, 510, 570, -210],
  cos: [120, 240, 300, 180, 360, -60, -120, 420, 480, -240, 660],
  tan: [135, 225, 315, 180, -45, -135, 405, 495, 585, -225],
};
const fnTex = (fn: Fn, a: number) => `\\${fn}${a < 0 ? `(${D(a)})` : ` ${D(a)}`}`;

/** f(k·90° ± x) written in terms of x: the result function and its sign. */
type RedFactor = { tex: string; fn: Fn; sign: 1 | -1 };
const RED_FACTORS: Record<Fn, RedFactor[]> = {
  sin: [
    { tex: '\\sin(180^\\circ - x)', fn: 'sin', sign: 1 },
    { tex: '\\sin(180^\\circ + x)', fn: 'sin', sign: -1 },
    { tex: '\\sin(360^\\circ - x)', fn: 'sin', sign: -1 },
    { tex: '\\sin(-x)', fn: 'sin', sign: -1 },
    { tex: '\\cos(90^\\circ - x)', fn: 'sin', sign: 1 },
    { tex: '\\cos(90^\\circ + x)', fn: 'sin', sign: -1 },
  ],
  cos: [
    { tex: '\\cos(180^\\circ - x)', fn: 'cos', sign: -1 },
    { tex: '\\cos(180^\\circ + x)', fn: 'cos', sign: -1 },
    { tex: '\\cos(360^\\circ - x)', fn: 'cos', sign: 1 },
    { tex: '\\cos(-x)', fn: 'cos', sign: 1 },
    { tex: '\\sin(90^\\circ - x)', fn: 'cos', sign: 1 },
    { tex: '\\sin(90^\\circ + x)', fn: 'cos', sign: 1 },
  ],
  tan: [
    { tex: '\\tan(180^\\circ - x)', fn: 'tan', sign: -1 },
    { tex: '\\tan(180^\\circ + x)', fn: 'tan', sign: 1 },
    { tex: '\\tan(360^\\circ - x)', fn: 'tan', sign: -1 },
    { tex: '\\tan(-x)', fn: 'tan', sign: -1 },
  ],
};
const signed = (sign: number, t: string) => (sign < 0 ? `-${t}` : t);

/** Identities to simplify, with safe-looking wrong answers. */
const IDENTITIES: readonly { q: (s: string, c: string) => string; a: string; wrong: string[] }[] = [
  { q: (s, c) => `\\dfrac{1 - ${c}^2}{${s} \\cdot ${c}}`, a: '\\tan x', wrong: ['1', '\\sin x', '\\dfrac{1}{\\tan x}'] },
  { q: (s) => `\\dfrac{${s}}{\\tan x}`, a: '\\cos x', wrong: ['\\sin x', '1', '\\sin^2 x'] },
  { q: (_s, c) => `\\tan x \\cdot ${c}`, a: '\\sin x', wrong: ['1', '\\cos^2 x', '\\tan x'] },
  { q: (s) => `\\dfrac{${s}^2 - 1}{\\cos x}`, a: '-\\cos x', wrong: ['\\cos x', '\\sin x', '-1'] },
  { q: (s, c) => `\\dfrac{\\tan x \\cdot ${c}}{${s}}`, a: '1', wrong: ['\\tan x', '\\cos x', '-1'] },
  { q: (s, c) => `(${s} + ${c})^2 - 2${s}${c}`, a: '1', wrong: ['0', '-1', '2\\sin x \\cos x'] },
  { q: (_s, c) => `${c}^2 \\tan^2 x + \\cos^2 x`, a: '1', wrong: ['\\sin^2 x', '\\tan^2 x', '2\\cos^2 x'] },
  { q: (s, c) => `\\dfrac{${s}}{1 - ${c}^2}`, a: '\\dfrac{1}{\\sin x}', wrong: ['\\sin x', '\\dfrac{1}{\\cos x}', '1'] },
  { q: (s, c) => `${s}^4 - ${c}^4`, a: '\\sin^2 x - \\cos^2 x', wrong: ['1', '0', '\\sin^2 x + \\cos^2 x'] },
  { q: (s) => `(1 - ${s})(1 + ${s})`, a: '\\cos^2 x', wrong: ['\\sin^2 x', '-\\cos^2 x', '1 - \\sin^2 x \\cos^2 x'] },
];

export const trigReduction: QuestionTemplate = {
  id: 'trig-reduction',
  skillId: 'trig-reduction',
  generate(rng, level) {
    if (level <= 2) {
      const pickTerm = () => {
        const fn = rng.pick(['sin', 'cos', 'tan'] as const);
        const a = rng.pick(RED_ANGLES[fn]);
        return { fn, a, v: exactTrig(fn, a)! };
      };
      const terms = level === 1 ? [pickTerm()] : [pickTerm(), pickTerm()];
      while (terms.length === 2 && terms[0]!.fn === terms[1]!.fn && terms[0]!.a === terms[1]!.a) terms[1] = pickTerm();
      const ks = terms.map(() => (level === 1 ? 1 : rng.pick([1, 2, 3])));
      const op = level === 1 ? '+' : rng.pick(['+', '-', '\\times'] as const);
      const combine = (vals: Rational[]) => (vals.length === 1 ? mul(R(ks[0]!), vals[0]!) : op === '+' ? add(mul(R(ks[0]!), vals[0]!), mul(R(ks[1]!), vals[1]!)) : op === '-' ? sub(mul(R(ks[0]!), vals[0]!), mul(R(ks[1]!), vals[1]!)) : mul(mul(R(ks[0]!), vals[0]!), mul(R(ks[1]!), vals[1]!)));
      const v = combine(terms.map((t) => t.v));
      const absV = combine(terms.map((t) => R(Math.abs(t.v.n), t.v.d)));
      const exprTex = terms.map((t, i) => `${ks[i] === 1 ? '' : ks[i]}${fnTex(t.fn, t.a)}`).join(` ${op} `);
      const ref = (t: { fn: Fn; a: number; v: Rational }) => {
        const r = ((t.a % 360) + 360) % 360;
        const refA = r <= 90 ? r : r <= 180 ? 180 - r : r <= 270 ? r - 180 : 360 - r;
        return `$${fnTex(t.fn, t.a)} = ${t.v.n < 0 ? '-' : ''}\\${t.fn} ${D(refA)} = ${ratTex(t.v)}$ (${r === t.a ? '' : `same as $${D(r)}$, `}${r > 0 && r < 90 ? 'first' : r > 90 && r < 180 ? 'second' : r > 180 && r < 270 ? 'third' : r > 270 && r < 360 ? 'fourth' : 'on an axis'}${r % 90 === 0 ? '' : ' quadrant'})`;
      };
      return {
        prompt: `Without a calculator, find the value of $${exprTex}$.`,
        input: { kind: 'fraction' },
        answer: fracAns(v),
        answerDisplay: `$${ratTex(v)}$`,
        hints: ['Reduce each angle to an acute reference angle, and use CAST for the sign.', 'Negative angles turn clockwise; angles over 360° go round again (subtract 360°).'],
        solution: [...terms.map(ref), `$${exprTex} = ${ratTex(v)}$`],
        misconceptions: keepFracs([{ code: 'cast-sign', value: absV, feedback: 'Every value came out positive. Check the quadrant of each angle with CAST.' }, { code: 'cast-sign', value: rneg(v), feedback: 'The size is right, but a sign is wrong. Check the quadrant of each angle.' }], v),
      };
    }
    if (level === 3) {
      const base = rng.pick(['sin', 'cos'] as const);
      let t: number;
      do t = rng.int(11, 79);
      while (t % 15 === 0);
      const items: { tex: string; sign: number }[] =
        base === 'sin'
          ? [
              { tex: `\\sin ${D(180 - t)}`, sign: 1 },
              { tex: `\\sin ${D(180 + t)}`, sign: -1 },
              { tex: `\\sin ${D(360 - t)}`, sign: -1 },
              { tex: `\\sin(${D(-t)})`, sign: -1 },
              { tex: `\\cos ${D(90 - t)}`, sign: 1 },
              { tex: `\\cos ${D(90 + t)}`, sign: -1 },
              { tex: `\\sin ${D(360 + t)}`, sign: 1 },
            ]
          : [
              { tex: `\\cos ${D(180 - t)}`, sign: -1 },
              { tex: `\\cos ${D(180 + t)}`, sign: -1 },
              { tex: `\\cos ${D(360 - t)}`, sign: 1 },
              { tex: `\\cos(${D(-t)})`, sign: 1 },
              { tex: `\\sin ${D(90 - t)}`, sign: 1 },
              { tex: `\\sin ${D(90 + t)}`, sign: 1 },
              { tex: `\\cos ${D(360 + t)}`, sign: 1 },
            ];
      let A: (typeof items)[number], B: (typeof items)[number], k1: number, k2: number;
      do {
        [A, B] = rng.shuffle(items).slice(0, 2) as [(typeof items)[number], (typeof items)[number]];
        k1 = rng.pick([1, 2, 3]);
        k2 = rng.pick([1, 2, 3]);
      } while (k1 * A.sign + k2 * B.sign === 0);
      const coef = k1 * A.sign + k2 * B.sign;
      const expr = coef === 1 ? 'p' : coef === -1 ? '-p' : `${coef}p`;
      const wrongCoef = k1 + k2;
      return {
        prompt: `If $\\${base} ${D(t)} = p$, write $${k1 === 1 ? '' : k1}${A.tex} + ${k2 === 1 ? '' : k2}${B.tex}$ in terms of $p$.`,
        input: { kind: 'expression', variables: ['p'] },
        answer: { kind: 'expression', expr },
        answerDisplay: `$${expr}$`,
        hints: [`Write each one as $\\pm\\${base} ${D(t)}$ using a reduction formula.`, 'For $90^\\circ \\pm$ an angle, sin and cos swap. Then CAST gives the sign.'],
        solution: [`$${A.tex} = ${A.sign < 0 ? '-' : ''}p$ and $${B.tex} = ${B.sign < 0 ? '-' : ''}p$`, `$${k1 === 1 ? '' : k1}(${A.sign < 0 ? '-' : ''}p) + ${k2 === 1 ? '' : k2}(${B.sign < 0 ? '-' : ''}p) = ${expr}$`],
        misconceptions: wrongCoef === coef || expressionsEquivalent(`${wrongCoef}*p`, expr) ? [] : [{ code: 'reduction-formula', answer: { kind: 'expression', expr: `${wrongCoef}p` }, feedback: 'Not every one is positive: use CAST to find the sign of each.' }],
      };
    }
    if (level === 4) {
      // Products and quotients of reduction factors that simplify to ±1, ±cos x or ±tan x.
      const shape = rng.pick(['one', 'cos', 'tan', 'one2'] as const);
      const f = (fn: Fn) => rng.pick(RED_FACTORS[fn]);
      const parts =
        shape === 'one' ? { top: [f('sin')], bottom: [f('cos'), f('tan')], res: '1' } : shape === 'cos' ? { top: [f('sin'), f('cos')], bottom: [f('tan'), f('cos')], res: '\\cos x' } : shape === 'tan' ? { top: [f('sin'), f('cos')], bottom: [f('cos'), f('cos')], res: '\\tan x' } : { top: [f('tan'), f('cos')], bottom: [f('sin')], res: '1' };
      const sign = [...parts.top, ...parts.bottom].reduce((s, p) => s * p.sign, 1);
      const correct = signed(sign, parts.res);
      const flipped = signed(-sign, parts.res);
      const other = parts.res === '1' ? signed(sign, '\\tan x') : signed(sign, '1');
      const third = parts.res === '\\cos x' ? signed(sign, '\\sin x') : signed(-sign, parts.res === '1' ? '\\tan x' : '1');
      const tex = `\\dfrac{${parts.top.map((p) => p.tex).join(' \\cdot ')}}{${parts.bottom.map((p) => p.tex).join(' \\cdot ')}}`;
      return choice(rng, {
        prompt: `Simplify $${tex}$.`,
        correct: { id: 'a', text: `$${correct}$` },
        distractors: [
          { id: 'b', text: `$${flipped}$`, feedback: 'Right functions, wrong sign. Use CAST on each factor separately, then multiply the signs.' },
          { id: 'c', text: `$${other}$`, feedback: 'Write tan as sin ÷ cos and cancel carefully.' },
          { id: 'd', text: `$${third}$`, feedback: 'Reduce each factor first, then cancel.' },
        ].filter((o, i, all) => o.text !== `$${correct}$` && all.findIndex((x) => x.text === o.text) === i),
        code: 'reduction-formula',
        hints: ['Reduce each factor to $\\pm\\sin x$, $\\pm\\cos x$ or $\\pm\\tan x$.', 'Then write $\\tan x = \\dfrac{\\sin x}{\\cos x}$ and cancel.'],
        solution: [`$= \\dfrac{${parts.top.map((p) => signed(p.sign, `\\${p.fn} x`)).join(' \\cdot ')}}{${parts.bottom.map((p) => signed(p.sign, `\\${p.fn} x`)).join(' \\cdot ')}}$`, `$= ${correct}$`],
      });
    }
    // Level 5: identities, with reduction-formula disguises.
    const id = rng.pick(IDENTITIES);
    const s = rng.pick(['\\sin x', '\\sin(180^\\circ - x)', '\\cos(90^\\circ - x)']);
    const c = rng.pick(['\\cos x', '\\cos(360^\\circ - x)', '\\cos(-x)', '\\sin(90^\\circ - x)']);
    const qTex = id.q(s, c);
    return choice(rng, {
      prompt: `Simplify $${qTex}$.`,
      correct: { id: 'a', text: `$${id.a}$` },
      distractors: id.wrong.map((w, i) => ({ id: `w${i}`, text: `$${w}$`, feedback: 'Write everything in terms of $\\sin x$ and $\\cos x$ (reduce any angles first), then use $\\sin^2 x + \\cos^2 x = 1$.' })),
      code: 'trig-identity',
      hints: [s === '\\sin x' && c === '\\cos x' ? 'Use $\\tan x = \\dfrac{\\sin x}{\\cos x}$ and $\\sin^2 x + \\cos^2 x = 1$.' : `First reduce: $${s} = \\sin x$ and $${c} = \\cos x$.`, 'Look for $1 - \\cos^2 x = \\sin^2 x$ or $1 - \\sin^2 x = \\cos^2 x$.'],
      solution: [...(s === '\\sin x' && c === '\\cos x' ? [] : [`$${s} = \\sin x$ and $${c} = \\cos x$.`]), `$${id.q('\\sin x', '\\cos x')} = ${id.a}$`],
    });
  },
};

// ---------------------------------------------------------------------------
/** All x in [lo; hi] with fn(x) = v, given the reference angle (0 ≤ ref ≤ 90) and the sign of v. */
function solveIn(fn: Fn, ref: number, sign: number, lo: number, hi: number): number[] {
  let base: number[];
  if (sign === 0) base = fn === 'cos' ? [90, 270] : [0, 180];
  else if (fn === 'sin') base = sign > 0 ? [ref, 180 - ref] : [180 + ref, 360 - ref];
  else if (fn === 'cos') base = sign > 0 ? [ref, 360 - ref] : [180 - ref, 180 + ref];
  else base = sign > 0 ? [ref, 180 + ref] : [180 - ref, 360 - ref];
  const out = new Set<number>();
  for (const b of base) for (let k = -3; k <= 3; k++) {
    const x = Math.round((b + 360 * k) * 1e6) / 1e6;
    if (x >= lo - 1e-9 && x <= hi + 1e-9) out.add(x);
  }
  return [...out].sort((a, b) => a - b);
}
/** The common wrong placement: using another function's quadrant pattern. */
function wrongQuadrants(fn: Fn, ref: number, sign: number): number[] {
  const other: Fn = fn === 'sin' ? 'cos' : 'sin';
  return solveIn(other, ref, sign, 0, 360);
}
const rootsTex = (xs: number[], dp = 0) => xs.map((x) => `x = ${tc(x, Number.isInteger(x) ? 0 : dp)}^\\circ`).join(' \\text{ or } ');
const ROUND = (xs: number[]) => xs.map(round1);

const SPECIAL_EQS: readonly { fn: Fn; v: Rational; ref: number; forms: string[] }[] = [
  { fn: 'sin', v: R(1, 2), ref: 30, forms: ['2\\sin x = 1', '2\\sin x - 1 = 0', '4\\sin x = 2'] },
  { fn: 'sin', v: R(-1, 2), ref: 30, forms: ['2\\sin x = -1', '2\\sin x + 1 = 0', '1 + 2\\sin x = 0'] },
  { fn: 'cos', v: R(1, 2), ref: 60, forms: ['2\\cos x = 1', '2\\cos x - 1 = 0', '6\\cos x = 3'] },
  { fn: 'cos', v: R(-1, 2), ref: 60, forms: ['2\\cos x = -1', '2\\cos x + 1 = 0', '1 + 2\\cos x = 0'] },
  { fn: 'tan', v: R(1), ref: 45, forms: ['\\tan x = 1', '\\tan x - 1 = 0', '3\\tan x = 3'] },
  { fn: 'tan', v: R(-1), ref: 45, forms: ['\\tan x = -1', '\\tan x + 1 = 0', '2\\tan x = -2'] },
];

export const trigEquations: QuestionTemplate = {
  id: 'trig-equations',
  skillId: 'trig-equations',
  generate(rng, level) {
    const hintsBase = ['Find the reference angle first (ignore the sign).', 'Then use CAST to decide which quadrants the solutions are in.'];
    if (level === 1 || level === 3) {
      const e = rng.pick(SPECIAL_EQS);
      const form = rng.pick(e.forms);
      const sign = e.v.n > 0 ? 1 : -1;
      if (level === 1) {
        const xs = solveIn(e.fn, e.ref, sign, 0, 360);
        return {
          prompt: `Solve for $x$ without a calculator, if $0^\\circ \\le x \\le 360^\\circ$: $\\ ${form}$`,
          input: { kind: 'roots', count: xs.length, variable: 'x' },
          answer: rootsAns(xs),
          answerDisplay: `$${rootsTex(xs)}$`,
          hints: hintsBase,
          solution: [`$\\${e.fn} x = ${ratTex(e.v)}$, so the reference angle is $${D(e.ref)}$.`, `$\\${e.fn}$ is ${sign > 0 ? 'positive' : 'negative'} in quadrants ${solveIn(e.fn, 45, sign, 0, 360).map((x) => Math.floor(x / 90) + 1).join(' and ')}.`, `$${rootsTex(xs)}$`],
          misconceptions: keepRoots(
            [
              { code: 'general-solution', vals: wrongQuadrants(e.fn, e.ref, sign), feedback: `Those are the right quadrants for ${e.fn === 'sin' ? 'cos' : 'sin'}, not ${e.fn}. Check CAST.` },
              { code: 'general-solution', vals: solveIn(e.fn, e.ref, -sign, 0, 360), feedback: `Those solve $\\${e.fn} x = ${ratTex(rneg(e.v))}$. Check the sign.` },
            ],
            xs,
          ),
        };
      }
      // Level 3: the general solution, as a choice.
      const per = e.fn === 'tan' ? 180 : 360;
      const xs = solveIn(e.fn, e.ref, sign, 0, per - 1e-6);
      const fam = (vals: number[], p: number) => vals.map((x) => `x = ${D(x)} + k \\cdot ${D(p)}`).join(' \\text{ or } ');
      const correct = e.fn === 'cos' ? `x = \\pm ${D(xs[0]!)} + k \\cdot 360^\\circ` : fam(xs, per);
      const wrongs = e.fn === 'tan'
        ? [{ t: fam(xs, 360), f: 'tan repeats every $180^\\circ$, so $k \\cdot 360^\\circ$ misses half the solutions.' }, { t: fam(solveIn('sin', e.ref, sign, 0, 360), 360), f: 'That is the pattern for sin. tan has one solution every $180^\\circ$.' }, { t: fam([xs[0]! + (sign > 0 ? 90 : -90)], 180), f: 'Check the reference angle and the quadrant.' }]
        : e.fn === 'sin'
          ? [{ t: fam(xs, 180), f: 'sin repeats every $360^\\circ$, not $180^\\circ$.' }, { t: fam([xs[0]!], 360), f: 'There are two solutions in each turn: $x$ and $180^\\circ - x$. You have only one family.' }, { t: `x = \\pm ${D(xs[0]!)} + k \\cdot 360^\\circ`, f: 'The $\\pm$ form is for cos. For sin, use $x$ and $180^\\circ - x$.' }]
          : [{ t: `x = \\pm ${D(xs[0]!)} + k \\cdot 180^\\circ`, f: 'cos repeats every $360^\\circ$, not $180^\\circ$.' }, { t: fam([xs[0]!, 180 - xs[0]!], 360), f: 'For cos the second solution is $360^\\circ - x$ (that is, $-x$), not $180^\\circ - x$.' }, { t: fam([xs[0]!], 360), f: 'You need both families: $x = \\pm$ the angle.' }];
      return choice(rng, {
        prompt: `Which is the general solution of $${form}$? ($k \\in \\mathbb{Z}$)`,
        correct: { id: 'a', text: `$${correct}$` },
        distractors: wrongs.filter((w) => w.t !== correct).map((w, i) => ({ id: `w${i}`, text: `$${w.t}$`, feedback: w.f })),
        code: 'general-solution',
        hints: [...hintsBase, `${e.fn === 'tan' ? 'tan repeats every $180^\\circ$.' : `${e.fn} repeats every $360^\\circ$.`}`],
        solution: [`$\\${e.fn} x = ${ratTex(e.v)}$, reference angle $${D(e.ref)}$.`, `$${correct}$`],
      });
    }
    if (level === 2) {
      const fn = rng.pick(['sin', 'cos', 'tan'] as const);
      let a: number, b: number, ref: number;
      let xs: number[];
      do {
        a = rng.int(2, 9);
        b = rng.signed(1, fn === 'tan' ? 12 : a - 1);
        ref = deg(fn === 'sin' ? Math.asin(Math.abs(b) / a) : fn === 'cos' ? Math.acos(Math.abs(b) / a) : Math.atan(Math.abs(b) / a));
        xs = solveIn(fn, ref, Math.sign(b), 0, 360);
      } while (xs.some((x) => Math.abs(((x * 10) % 1) - 0.5) < 0.12) || Math.abs(((ref * 10) % 1) - 0.5) < 0.12);
      const sign = Math.sign(b);
      return {
        prompt: `Solve for $x$, if $0^\\circ \\le x \\le 360^\\circ$: $\\ ${a}\\${fn} x = ${b}$. Round to one decimal place.`,
        input: { kind: 'roots', count: xs.length, variable: 'x' },
        answer: rootsAns(ROUND(xs)),
        answerDisplay: `$${rootsTex(ROUND(xs), 1)}$`,
        hints: [`$\\${fn} x = \\dfrac{${b}}{${a}}$. Use the positive value to find the reference angle.`, ...hintsBase.slice(1)],
        solution: [`$\\${fn} x = \\dfrac{${b}}{${a}}$; reference angle $= \\${fn}^{-1}\\left(\\dfrac{${Math.abs(b)}}{${a}}\\right) = ${tc(ref, 1)}^\\circ$.`, `$\\${fn}$ is ${sign > 0 ? 'positive' : 'negative'} in quadrants ${solveIn(fn, 45, sign, 0, 360).map((x) => Math.floor(x / 90) + 1).join(' and ')}.`, `$${rootsTex(ROUND(xs), 1)}$`],
        misconceptions: keepRoots(
          [
            { code: 'general-solution', vals: ROUND(fn === 'tan' ? solveIn('sin', ref, sign, 0, 360) : wrongQuadrants(fn, ref, sign)), feedback: `Check CAST: those quadrants are right for ${fn === 'cos' ? 'sin' : 'cos'}, not ${fn}.` },
            { code: 'general-solution', vals: ROUND(solveIn(fn, ref, -sign, 0, 360)), feedback: 'Those solve the equation with the opposite sign.' },
          ],
          ROUND(xs),
        ),
      };
    }
    if (level === 4) {
      const e = rng.pick(SPECIAL_EQS);
      const sign = e.v.n > 0 ? 1 : -1;
      if (rng.chance(0.5)) {
        const c = rng.pick([10, 15, 20, 25, 30, 40, -10, -20, -30]);
        const lo = 0;
        const hi = 360;
        const thetas = solveIn(e.fn, e.ref, sign, lo + c, hi + c);
        const xs = thetas.map((t) => t - c).filter((x) => x >= lo && x <= hi);
        const arg = `x ${c > 0 ? '+' : '-'} ${D(Math.abs(c))}`;
        return {
          prompt: `Solve for $x$ without a calculator, if $0^\\circ \\le x \\le 360^\\circ$: $\\ \\${e.fn}(${arg}) = ${ratTex(e.v)}$`,
          input: { kind: 'roots', count: xs.length, variable: 'x' },
          answer: rootsAns(xs),
          answerDisplay: `$${rootsTex(xs)}$`,
          hints: [`Let $\\theta = ${arg}$ and solve $\\${e.fn}\\theta = ${ratTex(e.v)}$ first.`, `Then $x = \\theta ${c > 0 ? '-' : '+'} ${D(Math.abs(c))}$. Keep only the values from $0^\\circ$ to $360^\\circ$.`],
          solution: [`$${arg} = ${thetas.map(D).join(' \\text{ or } ')}$`, `$${rootsTex(xs)}$`],
          misconceptions: keepRoots([{ code: 'trig-equation', vals: solveIn(e.fn, e.ref, sign, 0, 360), feedback: `Those are the values of $${arg}$. Subtract to get $x$.` }], xs),
        };
      }
      const k = 2;
      const thetas = solveIn(e.fn, e.ref, sign, 0, 360);
      const xs = thetas.map((t) => t / k);
      return {
        prompt: `Solve for $x$ without a calculator, if $0^\\circ \\le x \\le 180^\\circ$: $\\ \\${e.fn} 2x = ${ratTex(e.v)}$`,
        input: { kind: 'roots', count: xs.length, variable: 'x' },
        answer: rootsAns(xs),
        answerDisplay: `$${rootsTex(xs, 1)}$`,
        hints: ['If $0^\\circ \\le x \\le 180^\\circ$, then $0^\\circ \\le 2x \\le 360^\\circ$.', 'Solve for $2x$ in that interval, then halve.'],
        solution: [`$2x = ${thetas.map(D).join(' \\text{ or } ')}$`, `$${rootsTex(xs, 1)}$`],
        misconceptions: keepRoots([{ code: 'trig-equation', vals: thetas.filter((t) => t <= 180), feedback: 'Those are values of $2x$. Halve them to get $x$.' }], xs),
      };
    }
    // Level 5: equations that factorise, or that become tan x = k.
    if (rng.chance(0.35)) {
      const k = rng.signed(2, 9);
      const d = rng.int(1, 3);
      const ref = deg(Math.atan(Math.abs(k) / d));
      const xs = ROUND(solveIn('tan', ref, Math.sign(k), 0, 360));
      return {
        prompt: `Solve for $x$, if $0^\\circ \\le x \\le 360^\\circ$: $\\ ${d === 1 ? '' : d}\\sin x = ${k}\\cos x$. Round to one decimal place.`,
        input: { kind: 'roots', count: xs.length, variable: 'x' },
        answer: rootsAns(xs),
        answerDisplay: `$${rootsTex(xs, 1)}$`,
        hints: ['Divide both sides by $\\cos x$.', '$\\dfrac{\\sin x}{\\cos x} = \\tan x$.'],
        solution: [`$\\tan x = ${ratTex(R(k, d))}$`, `Reference angle $${tc(ref, 1)}^\\circ$; tan is ${k > 0 ? 'positive in quadrants 1 and 3' : 'negative in quadrants 2 and 4'}.`, `$${rootsTex(xs, 1)}$`],
        misconceptions: keepRoots([{ code: 'trig-identity', vals: ROUND(solveIn('tan', deg(Math.atan(d / Math.abs(k))), Math.sign(k), 0, 360)), feedback: 'Divide by $\\cos x$: $\\tan x = \\dfrac{\\sin x}{\\cos x}$, so the number multiplying cos goes on top.' }], xs),
      };
    }
    const Q = rng.pick([
      { fn: 'sin' as Fn, tex: ['2\\sin^2 x - \\sin x - 1 = 0', '2\\sin^2 x = \\sin x + 1'], fac: '(2\\sin x + 1)(\\sin x - 1) = 0', r1: R(-1, 2), r2: R(1) },
      { fn: 'sin' as Fn, tex: ['2\\sin^2 x + \\sin x - 1 = 0', '2\\sin^2 x = 1 - \\sin x'], fac: '(2\\sin x - 1)(\\sin x + 1) = 0', r1: R(1, 2), r2: R(-1) },
      { fn: 'cos' as Fn, tex: ['2\\cos^2 x + \\cos x - 1 = 0', '2\\cos^2 x = 1 - \\cos x'], fac: '(2\\cos x - 1)(\\cos x + 1) = 0', r1: R(1, 2), r2: R(-1) },
      { fn: 'cos' as Fn, tex: ['2\\cos^2 x - \\cos x - 1 = 0', '2\\cos^2 x = \\cos x + 1'], fac: '(2\\cos x + 1)(\\cos x - 1) = 0', r1: R(-1, 2), r2: R(1) },
      { fn: 'sin' as Fn, tex: ['2\\sin^2 x - 3\\sin x + 1 = 0', '2\\sin^2 x + 1 = 3\\sin x'], fac: '(2\\sin x - 1)(\\sin x - 1) = 0', r1: R(1, 2), r2: R(1) },
      { fn: 'cos' as Fn, tex: ['2\\cos^2 x + 3\\cos x + 1 = 0', '2\\cos^2 x + 1 = -3\\cos x'], fac: '(2\\cos x + 1)(\\cos x + 1) = 0', r1: R(-1, 2), r2: R(-1) },
    ]);
    const lo = 0;
    const hi = rng.pick([360, 180]);
    const sols = (v: Rational) => {
      const vv = toNumber(v);
      const ref = Math.abs(vv) === 1 ? 90 : Math.abs(vv) === 0.5 ? (Q.fn === 'sin' ? 30 : 60) : 0;
      if (Math.abs(vv) === 1) return Q.fn === 'sin' ? solveIn('sin', 90, Math.sign(vv), lo, hi) : vv > 0 ? [0, 360].filter((x) => x <= hi) : [180].filter((x) => x <= hi);
      return solveIn(Q.fn, ref, Math.sign(vv), lo, hi);
    };
    const s1 = sols(Q.r1);
    const s2 = sols(Q.r2);
    const xs = [...new Set([...s1, ...s2])].sort((a, b) => a - b);
    if (xs.length === 0) return trigEquations.generate(rng, 5);
    return {
      prompt: `Solve for $x$ without a calculator, if $${D(lo)} \\le x \\le ${D(hi)}$: $\\ ${rng.pick(Q.tex)}$`,
      input: { kind: 'roots', count: xs.length, variable: 'x' },
      answer: rootsAns(xs),
      answerDisplay: `$${rootsTex(xs)}$`,
      hints: [`Treat it as a quadratic in $\\${Q.fn} x$ and factorise.`, `$${Q.fac}$`],
      solution: [`$${Q.fac}$`, `$\\${Q.fn} x = ${ratTex(Q.r1)}$ or $\\${Q.fn} x = ${ratTex(Q.r2)}$`, `$${rootsTex(xs)}$`],
      misconceptions: keepRoots(
        [
          { code: 'trig-equation', vals: s1, feedback: `That solves only $\\${Q.fn} x = ${ratTex(Q.r1)}$. The other factor gives more solutions.` },
          { code: 'trig-equation', vals: s2, feedback: `That solves only $\\${Q.fn} x = ${ratTex(Q.r2)}$. The other factor gives more solutions.` },
        ],
        xs,
      ),
    };
  },
};

// ---------------------------------------------------------------------------
/** Triangle ABC drawn to scale from its sides: a = BC, b = AC, c = AB. */
function triFigure(a: number, b: number, c: number, sides: Partial<Record<'a' | 'b' | 'c', string>>, angles: Partial<Record<'A' | 'B' | 'C', string>>, alt: string): GeometryFigure {
  const cosA = (b * b + c * c - a * a) / (2 * b * c);
  const A = { id: 'A', x: 0, y: 0 };
  const B = { id: 'B', x: c, y: 0 };
  const C = { id: 'C', x: b * cosA, y: b * Math.sqrt(Math.max(0, 1 - cosA * cosA)) };
  const marks: GeometryFigure['angles'] = [];
  if (angles.A) marks.push({ at: 'A', from: 'B', to: 'C', text: angles.A });
  if (angles.B) marks.push({ at: 'B', from: 'C', to: 'A', text: angles.B });
  if (angles.C) marks.push({ at: 'C', from: 'A', to: 'B', text: angles.C });
  return {
    kind: 'geometry',
    alt,
    points: [A, B, C].map((p) => ({ ...p, x: Math.round(p.x * 1000) / 1000, y: Math.round(p.y * 1000) / 1000 })),
    segments: [
      { a: 'B', b: 'C', text: sides.a },
      { a: 'A', b: 'C', text: sides.b },
      { a: 'A', b: 'B', text: sides.c },
    ],
    angles: marks,
  };
}
const sinD = (a: number) => Math.sin(rad(a));
const cosD = (a: number) => Math.cos(rad(a));
const n2 = (v: number) => tc(v, 2);
const n1 = (v: number) => tc(v, 1);

export const triangleRules: QuestionTemplate = {
  id: 'triangle-rules',
  skillId: 'triangle-rules',
  generate(rng, level) {
    if (level === 1) {
      const b = rng.int(4, 15);
      const c = rng.int(4, 15);
      const A = rng.int(25, 140);
      const a = Math.sqrt(b * b + c * c - 2 * b * c * cosD(A));
      const area = 0.5 * b * c * sinD(A);
      return {
        prompt: `In $\\triangle ABC$, $b = ${b}$ cm, $c = ${c}$ cm and $\\hat{A} = ${D(A)}$. Find the area of the triangle. Round to two decimal places.`,
        figure: triFigure(a, b, c, { b: `${b} cm`, c: `${c} cm` }, { A: `${A}°` }, `Triangle ABC with AC = ${b} cm, AB = ${c} cm and angle A = ${A} degrees.`),
        input: { kind: 'numeric', prefix: '\\text{Area} =', unit: 'cm²' },
        answer: { kind: 'numeric', value: round2(area), tolerance: 0.011 },
        answerDisplay: `$${n2(area)}\\text{ cm}^2$`,
        hints: ['Two sides and the angle between them: use the area rule.', '$\\text{Area} = \\tfrac{1}{2}bc\\sin A$'],
        solution: [`$\\text{Area} = \\tfrac{1}{2}(${b})(${c})\\sin ${D(A)}$`, `$= ${n2(area)}\\text{ cm}^2$`],
        misconceptions: keepNums(
          [
            { code: 'area-rule', value: round2(2 * area), feedback: 'Remember the $\\tfrac{1}{2}$: Area $= \\tfrac{1}{2}bc\\sin A$.' },
            { code: 'area-rule', value: round2(0.5 * b * c * Math.abs(cosD(A))), feedback: 'The area rule uses $\\sin A$, not $\\cos A$.' },
            { code: 'area-rule', value: round2(0.5 * b * c), feedback: 'That would only be right for a right angle at A. Multiply by $\\sin A$.' },
          ],
          round2(area),
          0.011,
        ),
      };
    }
    if (level === 2) {
      let A: number, B: number;
      do {
        A = rng.int(30, 110);
        B = rng.int(25, 100);
      } while (A + B > 160);
      const C = 180 - A - B;
      const a = rng.int(5, 18);
      const k = a / sinD(A);
      const b = k * sinD(B);
      const c = k * sinD(C);
      return {
        prompt: `In $\\triangle ABC$, $\\hat{A} = ${D(A)}$, $\\hat{B} = ${D(B)}$ and $a = ${a}$ m. Find $b$. Round to two decimal places.`,
        figure: triFigure(a, b, c, { a: `${a} m`, b: 'b' }, { A: `${A}°`, B: `${B}°` }, `Triangle ABC with BC = ${a} m, angle A = ${A} degrees and angle B = ${B} degrees. Side b = AC is unknown.`),
        input: { kind: 'numeric', prefix: 'b =', unit: 'm' },
        answer: { kind: 'numeric', value: round2(b), tolerance: 0.011 },
        answerDisplay: `$b = ${n2(b)}$ m`,
        hints: ['You know a side and its opposite angle, and the angle opposite $b$: use the sine rule.', '$\\dfrac{b}{\\sin B} = \\dfrac{a}{\\sin A}$, so $b = \\dfrac{a \\sin B}{\\sin A}$.'],
        solution: [`$\\dfrac{b}{\\sin ${D(B)}} = \\dfrac{${a}}{\\sin ${D(A)}}$`, `$b = \\dfrac{${a}\\sin ${D(B)}}{\\sin ${D(A)}} = ${n2(b)}$ m`],
        misconceptions: keepNums([{ code: 'sine-rule', value: round2((a * sinD(A)) / sinD(B)), feedback: 'The ratio is upside down. Put the unknown side on top: $b = \\dfrac{a\\sin B}{\\sin A}$.' }, { code: 'sine-rule', value: round2(c), feedback: 'That is side $c$. Side $b$ is opposite angle B.' }], round2(b), 0.011),
      };
    }
    if (level === 3) {
      // Unambiguous: the given angle is opposite the longer given side.
      let A: number, a: number, b: number, B: number;
      do {
        A = rng.int(35, 120);
        a = rng.int(8, 20);
        b = rng.int(4, a - 1);
        B = deg(Math.asin((b * sinD(A)) / a));
      } while (A + B >= 175 || Math.abs(((B * 10) % 1) - 0.5) < 0.12);
      const C = 180 - A - B;
      const c = (a * sinD(C)) / sinD(A);
      return {
        prompt: `In $\\triangle ABC$, $a = ${a}$ cm, $b = ${b}$ cm and $\\hat{A} = ${D(A)}$. Find $\\hat{B}$. Round to one decimal place.`,
        figure: triFigure(a, b, c, { a: `${a} cm`, b: `${b} cm` }, { A: `${A}°`, B: '?' }, `Triangle ABC with BC = ${a} cm, AC = ${b} cm and angle A = ${A} degrees. Angle B is unknown.`),
        input: { kind: 'numeric', prefix: '\\hat{B} =', unit: '°' },
        answer: { kind: 'numeric', value: round1(B), tolerance: 0.06 },
        answerDisplay: `$\\hat{B} = ${n1(B)}^\\circ$`,
        hints: ['Use the sine rule with the angles on top: $\\dfrac{\\sin B}{b} = \\dfrac{\\sin A}{a}$.', `$\\sin B = \\dfrac{${b}\\sin ${D(A)}}{${a}}$, then use $\\sin^{-1}$.`],
        solution: [`$\\dfrac{\\sin B}{${b}} = \\dfrac{\\sin ${D(A)}}{${a}}$`, `$\\sin B = \\dfrac{${b}\\sin ${D(A)}}{${a}} = ${tc((b * sinD(A)) / a, 4)}$`, `$\\hat{B} = ${n1(B)}^\\circ$ (B is acute: it is opposite the shorter side).`],
        misconceptions: keepNums([{ code: 'sine-rule', value: (a * sinD(A)) / b <= 1 ? round1(deg(Math.asin((a * sinD(A)) / b))) : null, feedback: 'The sides are swapped: $\\sin B = \\dfrac{b\\sin A}{a}$.' }, { code: 'sine-rule', value: round1(180 - B), feedback: 'That is the obtuse angle with the same sine. B is opposite the shorter side, so it must be acute.' }], round1(B), 0.06),
      };
    }
    if (level === 4) {
      const b = rng.int(4, 16);
      const c = rng.int(4, 16);
      const A = rng.int(20, 150);
      const a = Math.sqrt(b * b + c * c - 2 * b * c * cosD(A));
      return {
        prompt: `In $\\triangle ABC$, $b = ${b}$ m, $c = ${c}$ m and $\\hat{A} = ${D(A)}$. Find $a$. Round to two decimal places.`,
        figure: triFigure(a, b, c, { a: 'a', b: `${b} m`, c: `${c} m` }, { A: `${A}°` }, `Triangle ABC with AC = ${b} m, AB = ${c} m and angle A = ${A} degrees between them. Side a = BC is unknown.`),
        input: { kind: 'numeric', prefix: 'a =', unit: 'm' },
        answer: { kind: 'numeric', value: round2(a), tolerance: 0.011 },
        answerDisplay: `$a = ${n2(a)}$ m`,
        hints: ['Two sides and the angle between them: use the cosine rule.', '$a^2 = b^2 + c^2 - 2bc\\cos A$'],
        solution: [`$a^2 = ${b}^2 + ${c}^2 - 2(${b})(${c})\\cos ${D(A)}$`, `$a^2 = ${n2(a * a)}$`, `$a = ${n2(a)}$ m`],
        misconceptions: keepNums(
          [
            { code: 'cosine-rule', value: round2(a * a), feedback: 'That is $a^2$. Take the square root.' },
            { code: 'cosine-rule', value: round2(Math.sqrt(b * b + c * c + 2 * b * c * cosD(A))), feedback: 'The sign is wrong: $a^2 = b^2 + c^2 \\mathbf{-} 2bc\\cos A$.' },
            { code: 'cosine-rule', value: round2(Math.sqrt(Math.abs(b * b + c * c - 2 * b * c))), feedback: 'Multiply by $\\cos A$ before subtracting.' },
          ],
          round2(a),
          0.011,
        ),
      };
    }
    // Level 5: an angle from three sides.
    let a: number, b: number, c: number, A: number;
    do {
      b = rng.int(4, 14);
      c = rng.int(4, 14);
      a = rng.int(Math.abs(b - c) + 2, b + c - 2);
      A = deg(Math.acos((b * b + c * c - a * a) / (2 * b * c)));
    } while (Math.abs(((A * 10) % 1) - 0.5) < 0.12 || Math.abs(A - 90) < 1);
    const cosA = (b * b + c * c - a * a) / (2 * b * c);
    return {
      prompt: `In $\\triangle ABC$, $a = ${a}$ cm, $b = ${b}$ cm and $c = ${c}$ cm. Find $\\hat{A}$. Round to one decimal place.`,
      figure: triFigure(a, b, c, { a: `${a} cm`, b: `${b} cm`, c: `${c} cm` }, { A: '?' }, `Triangle ABC with sides BC = ${a} cm, AC = ${b} cm and AB = ${c} cm. Angle A is unknown.`),
      input: { kind: 'numeric', prefix: '\\hat{A} =', unit: '°' },
      answer: { kind: 'numeric', value: round1(A), tolerance: 0.06 },
      answerDisplay: `$\\hat{A} = ${n1(A)}^\\circ$`,
      hints: ['Three sides: use the cosine rule and make $\\cos A$ the subject.', '$\\cos A = \\dfrac{b^2 + c^2 - a^2}{2bc}$'],
      solution: [`$\\cos A = \\dfrac{${b}^2 + ${c}^2 - ${a}^2}{2(${b})(${c})} = ${ratTex(R(b * b + c * c - a * a, 2 * b * c))}$`, `$\\hat{A} = ${n1(A)}^\\circ$${cosA < 0 ? ' (cos A is negative, so A is obtuse)' : ''}`],
      misconceptions: keepNums(
        [
          { code: 'cosine-rule', value: Math.abs((a * a + b * b - c * c) / (2 * a * b)) <= 1 ? round1(deg(Math.acos((a * a + b * b - c * c) / (2 * a * b)))) : null, feedback: 'That is angle C. Angle A is opposite side $a$: $\\cos A = \\dfrac{b^2 + c^2 - a^2}{2bc}$.' },
          { code: 'cosine-rule', value: round1(180 - A), feedback: 'Check the sign of $\\cos A$: subtract $a^2$, the side opposite A.' },
        ],
        round1(A),
        0.06,
      ),
    };
  },
};

// ---------------------------------------------------------------------------
const COMPOUND_FORMS = [
  { fn: 'sin' as Fn, op: '+', tex: (a: string, b: string) => `\\sin ${a}\\cos ${b} + \\cos ${a}\\sin ${b}`, res: (a: number, b: number) => a + b, name: '\\sin(A + B)' },
  { fn: 'sin' as Fn, op: '-', tex: (a: string, b: string) => `\\sin ${a}\\cos ${b} - \\cos ${a}\\sin ${b}`, res: (a: number, b: number) => a - b, name: '\\sin(A - B)' },
  { fn: 'cos' as Fn, op: '+', tex: (a: string, b: string) => `\\cos ${a}\\cos ${b} - \\sin ${a}\\sin ${b}`, res: (a: number, b: number) => a + b, name: '\\cos(A + B)' },
  { fn: 'cos' as Fn, op: '-', tex: (a: string, b: string) => `\\cos ${a}\\cos ${b} + \\sin ${a}\\sin ${b}`, res: (a: number, b: number) => a - b, name: '\\cos(A - B)' },
] as const;

/** A ratio of an angle in a known quadrant, built from a Pythagorean triple: sin, cos as exact fractions. */
function quadAngle(rng: Rng) {
  const [u, v, r] = rng.pick(TRIPLES);
  const x = rng.chance(0.6) ? u : -u;
  const y = rng.chance(0.7) ? v : -v;
  return { sin: R(y, r), cos: R(x, r), tan: R(y, x), q: quadrant(x, y), x, y, r };
}
function describe(name: string, a: ReturnType<typeof quadAngle>): string {
  const given = rng3(a);
  return `$\\${given.fn} ${name} = ${ratTex(given.v)}$ with $${name}$ in the ${QNAME[a.q]} quadrant`;
}
/** Which ratio to give for an angle (deterministic from its numbers, so the prompt and solution agree). */
function rng3(a: ReturnType<typeof quadAngle>): { fn: Fn; v: Rational } {
  const k = (Math.abs(a.x) + Math.abs(a.y)) % 3;
  return k === 0 ? { fn: 'sin', v: a.sin } : k === 1 ? { fn: 'cos', v: a.cos } : { fn: 'tan', v: a.tan };
}

const DOUBLE_IDS: readonly { q: string; a: string; wrong: string[] }[] = [
  { q: '\\dfrac{\\sin 2x}{1 + \\cos 2x}', a: '\\tan x', wrong: ['\\sin x', '1', '\\dfrac{1}{\\tan x}'] },
  { q: '\\dfrac{1 - \\cos 2x}{\\sin 2x}', a: '\\tan x', wrong: ['\\dfrac{1}{\\tan x}', '\\sin x', '2\\tan x'] },
  { q: '\\dfrac{\\sin 2x}{2\\sin x}', a: '\\cos x', wrong: ['\\sin x', '1', '2\\cos x'] },
  { q: '\\dfrac{1 + \\cos 2x}{2\\cos x}', a: '\\cos x', wrong: ['1', '\\sin x', '\\cos 2x'] },
  { q: '\\dfrac{\\cos 2x}{\\cos x - \\sin x}', a: '\\cos x + \\sin x', wrong: ['\\cos x - \\sin x', '1', '\\cos x'] },
  { q: '\\dfrac{\\cos 2x}{\\cos x + \\sin x}', a: '\\cos x - \\sin x', wrong: ['\\cos x + \\sin x', '1', '-\\sin x'] },
  { q: '\\dfrac{\\sin 2x}{1 - \\cos 2x}', a: '\\dfrac{1}{\\tan x}', wrong: ['\\tan x', '\\cos x', '1'] },
  { q: '\\cos 2x + 2\\sin^2 x', a: '1', wrong: ['\\cos^2 x', '\\cos 2x', '0'] },
  { q: '\\dfrac{1 - \\cos 2x}{2}', a: '\\sin^2 x', wrong: ['\\cos^2 x', '\\sin x', '1 - \\sin^2 x'] },
  { q: '(\\sin x + \\cos x)^2 - \\sin 2x', a: '1', wrong: ['0', '\\cos 2x', '2'] },
  { q: '\\cos^4 x - \\sin^4 x', a: '\\cos 2x', wrong: ['1', '\\sin 2x', '\\cos^2 x'] },
];

export const compoundAngles: QuestionTemplate = {
  id: 'compound-angles',
  skillId: 'compound-angles',
  generate(rng, level) {
    if (level === 1) {
      const form = rng.pick(COMPOUND_FORMS);
      const targets = form.fn === 'sin' ? [30, 90, 150, 180, 210] : [60, 90, 120, 180, 0];
      let A: number, B: number, T: number;
      do {
        T = rng.pick(targets);
        if (form.op === '+') {
          A = rng.int(5, Math.max(6, T - 5));
          B = T - A;
        } else {
          B = rng.int(5, 80);
          A = T + B;
        }
      } while (A <= 0 || B <= 0 || A % 15 === 0 || B % 15 === 0 || A === B);
      const v = exactTrig(form.fn, T)!;
      const wrongT = form.op === '+' ? A - B : A + B;
      return {
        prompt: `Without a calculator, find the value of $${form.tex(D(A), D(B))}$.`,
        input: { kind: 'fraction' },
        answer: fracAns(v),
        answerDisplay: `$${ratTex(v)}$`,
        hints: ['Match the pattern to a compound-angle formula.', `This is the expansion of $${form.name}$.`],
        solution: [`$= \\${form.fn}(${D(A)} ${form.op} ${D(B)}) = \\${form.fn} ${D(T)}$`, `$= ${ratTex(v)}$`],
        misconceptions: keepFracs([{ code: 'compound-formula', value: exactTrig(form.fn, wrongT), feedback: form.fn === 'cos' ? 'For cos the sign flips: $\\cos(A + B) = \\cos A\\cos B \\mathbf{-} \\sin A\\sin B$.' : 'Check the sign: $\\sin(A - B) = \\sin A\\cos B - \\cos A\\sin B$.' }, { code: 'compound-formula', value: rneg(v), feedback: 'The size is right, but check the sign of the final value.' }], v),
      };
    }
    if (level === 2) {
      const pick = rng.pick([
        { tex: (a: string) => `2\\sin ${a}\\cos ${a}`, fn: 'sin' as Fn, k: R(1), as: [15, 75, 105, 165, 45, 135] },
        { tex: (a: string) => `\\sin ${a}\\cos ${a}`, fn: 'sin' as Fn, k: R(1, 2), as: [15, 75, 105, 165, 45] },
        { tex: (a: string) => `\\cos^2 ${a} - \\sin^2 ${a}`, fn: 'cos' as Fn, k: R(1), as: [30, 60, 120, 150, 45, 90] },
        { tex: (a: string) => `1 - 2\\sin^2 ${a}`, fn: 'cos' as Fn, k: R(1), as: [30, 60, 120, 150, 45] },
        { tex: (a: string) => `2\\cos^2 ${a} - 1`, fn: 'cos' as Fn, k: R(1), as: [30, 60, 120, 150, 45] },
      ]);
      const a = rng.pick(pick.as);
      const v = mul(pick.k, exactTrig(pick.fn, 2 * a)!);
      return {
        prompt: `Without a calculator, find the value of $${pick.tex(D(a))}$.`,
        input: { kind: 'fraction' },
        answer: fracAns(v),
        answerDisplay: `$${ratTex(v)}$`,
        hints: ['Match it to a double-angle formula.', pick.fn === 'sin' ? '$2\\sin A\\cos A = \\sin 2A$' : '$\\cos^2 A - \\sin^2 A = 1 - 2\\sin^2 A = 2\\cos^2 A - 1 = \\cos 2A$'],
        solution: [`$= ${pick.k.d === 2 ? '\\tfrac{1}{2}' : ''}\\${pick.fn} ${D(2 * a)}$`, `$= ${ratTex(v)}$`],
        misconceptions: keepFracs([{ code: 'double-angle', value: pick.k.d === 2 ? exactTrig(pick.fn, 2 * a) : mul(R(1, 2), exactTrig(pick.fn, 2 * a)!), feedback: '$\\sin A\\cos A = \\tfrac{1}{2}\\sin 2A$: watch the factor 2.' }, { code: 'double-angle', value: rneg(v), feedback: `Check the sign of $\\${pick.fn} ${D(2 * a)}$ with CAST.` }], v),
      };
    }
    if (level === 3) {
      let a = quadAngle(rng);
      let b = quadAngle(rng);
      while (a.r === b.r && a.x === b.x) b = quadAngle(rng);
      const which = rng.pick(['sin+', 'sin-', 'cos+', 'cos-'] as const);
      const v = which === 'sin+' ? add(mul(a.sin, b.cos), mul(a.cos, b.sin)) : which === 'sin-' ? sub(mul(a.sin, b.cos), mul(a.cos, b.sin)) : which === 'cos+' ? sub(mul(a.cos, b.cos), mul(a.sin, b.sin)) : add(mul(a.cos, b.cos), mul(a.sin, b.sin));
      const wrongSign = which === 'cos+' ? add(mul(a.cos, b.cos), mul(a.sin, b.sin)) : which === 'cos-' ? sub(mul(a.cos, b.cos), mul(a.sin, b.sin)) : which === 'sin+' ? sub(mul(a.sin, b.cos), mul(a.cos, b.sin)) : add(mul(a.sin, b.cos), mul(a.cos, b.sin));
      const abs = (r: Rational) => R(Math.abs(r.n), r.d);
      const allPos = which.startsWith('sin') ? (which === 'sin+' ? add(mul(abs(a.sin), abs(b.cos)), mul(abs(a.cos), abs(b.sin))) : sub(mul(abs(a.sin), abs(b.cos)), mul(abs(a.cos), abs(b.sin)))) : which === 'cos+' ? sub(mul(abs(a.cos), abs(b.cos)), mul(abs(a.sin), abs(b.sin))) : add(mul(abs(a.cos), abs(b.cos)), mul(abs(a.sin), abs(b.sin)));
      const target = `\\${which.slice(0, 3)}(\\alpha ${which[3]} \\beta)`;
      return {
        prompt: `${describe('\\alpha', a)}, and ${describe('\\beta', b)}. Without a calculator, find $${target}$.`,
        input: { kind: 'fraction' },
        answer: fracAns(v),
        answerDisplay: `$${target} = ${ratTex(v)}$`,
        hints: ['Sketch each angle in its quadrant and use Pythagoras to find the missing side.', which.startsWith('sin') ? `$\\sin(\\alpha \\pm \\beta) = \\sin\\alpha\\cos\\beta \\pm \\cos\\alpha\\sin\\beta$` : `$\\cos(\\alpha \\pm \\beta) = \\cos\\alpha\\cos\\beta \\mp \\sin\\alpha\\sin\\beta$`],
        solution: [
          `$\\sin\\alpha = ${ratTex(a.sin)}$, $\\cos\\alpha = ${ratTex(a.cos)}$ (x = ${a.x}, y = ${a.y}, r = ${a.r}).`,
          `$\\sin\\beta = ${ratTex(b.sin)}$, $\\cos\\beta = ${ratTex(b.cos)}$ (x = ${b.x}, y = ${b.y}, r = ${b.r}).`,
          `$${target} = ${ratTex(v)}$`,
        ],
        misconceptions: keepFracs([{ code: 'compound-formula', value: wrongSign, feedback: which.startsWith('cos') ? 'For cos, the sign in the middle is the opposite of the one in the bracket.' : 'For sin, the sign in the middle matches the one in the bracket.' }, { code: 'cast-sign', value: allPos, feedback: 'Some of these ratios are negative in their quadrants. Check the signs of x and y.' }], v),
      };
    }
    if (level === 4) {
      const a = quadAngle(rng);
      const which = rng.pick(['sin', 'cos', 'cos', 'sin'] as const);
      const v = which === 'sin' ? mul(R(2), mul(a.sin, a.cos)) : sub(mul(a.cos, a.cos), mul(a.sin, a.sin));
      return {
        prompt: `${describe('\\alpha', a)}. Without a calculator, find $\\${which} 2\\alpha$.`,
        input: { kind: 'fraction' },
        answer: fracAns(v),
        answerDisplay: `$\\${which} 2\\alpha = ${ratTex(v)}$`,
        hints: ['Sketch α in its quadrant to get $\\sin\\alpha$ and $\\cos\\alpha$ with the right signs.', which === 'sin' ? '$\\sin 2\\alpha = 2\\sin\\alpha\\cos\\alpha$' : '$\\cos 2\\alpha = \\cos^2\\alpha - \\sin^2\\alpha$'],
        solution: [`$\\sin\\alpha = ${ratTex(a.sin)}$ and $\\cos\\alpha = ${ratTex(a.cos)}$ (x = ${a.x}, y = ${a.y}, r = ${a.r}).`, which === 'sin' ? `$\\sin 2\\alpha = 2\\left(${ratTex(a.sin)}\\right)\\left(${ratTex(a.cos)}\\right) = ${ratTex(v)}$` : `$\\cos 2\\alpha = \\left(${ratTex(a.cos)}\\right)^2 - \\left(${ratTex(a.sin)}\\right)^2 = ${ratTex(v)}$`],
        misconceptions: keepFracs([{ code: 'double-angle', value: which === 'sin' ? mul(R(2), a.sin) : mul(R(2), a.cos), feedback: `$\\${which} 2\\alpha$ is not $2\\${which}\\alpha$. Use the double-angle formula.` }, { code: 'cast-sign', value: rneg(v), feedback: 'Check the signs of $\\sin\\alpha$ and $\\cos\\alpha$ in the quadrant.' }], v),
      };
    }
    const id = rng.pick(DOUBLE_IDS);
    return choice(rng, {
      prompt: `Simplify $${id.q}$.`,
      correct: { id: 'a', text: `$${id.a}$` },
      distractors: id.wrong.map((w, i) => ({ id: `w${i}`, text: `$${w}$`, feedback: 'Replace each double angle with a formula that cancels: $1 + \\cos 2x = 2\\cos^2 x$, $1 - \\cos 2x = 2\\sin^2 x$, $\\sin 2x = 2\\sin x\\cos x$, $\\cos 2x = (\\cos x - \\sin x)(\\cos x + \\sin x)$.' })),
      code: 'double-angle',
      hints: ['Choose the form of $\\cos 2x$ that cancels the 1: $1 + \\cos 2x = 2\\cos^2 x$ and $1 - \\cos 2x = 2\\sin^2 x$.', '$\\sin 2x = 2\\sin x\\cos x$'],
      solution: [`$${id.q} = ${id.a}$`],
    });
  },
};
