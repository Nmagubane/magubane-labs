/**
 * Equations and inequalities, Grades 10–11 (CAPS Paper 1):
 * - Grade 10: simultaneous linear equations, changing the subject of a formula, linear inequalities;
 * - Grade 11: simultaneous linear–quadratic equations, quadratic inequalities, conditions on k from the discriminant.
 * Answers are built backwards from the solution (the point, the roots, the boundary values), so they are exact.
 * equations.test.ts reads every equation back out of the prompt and checks the answer by substitution and by
 * testing values on both sides of every boundary.
 */
import type { QuestionTemplate, Misconception, AnswerSpec, Figure, GeneratedQuestion } from '../types.ts';
import type { Rng } from '../rng.ts';
import type { MistakeCode } from '../mistakes.ts';
import { rat, ratTex, type Rational } from '../rational.ts';
import { sum, term } from '../tex.ts';
import { exact, keepNum } from './kit.ts';
import { sample } from './math-graphs.ts';
import { normalise, toWire, sameSet, setTex, toggledEnds, complement, contains, type Interval } from '../inequality.ts';
import { formulasEquivalent } from '../formula.ts';

// ---------------------------------------------------------------------------
// Shared helpers

type Op = '<' | '>' | '≤' | '≥';
const OPS: Op[] = ['<', '>', '≤', '≥'];
const opTex: Record<Op, string> = { '<': '<', '>': '>', '≤': '\\le', '≥': '\\ge' };
const flipOp: Record<Op, Op> = { '<': '>', '>': '<', '≤': '≥', '≥': '≤' };
const strict = (o: Op) => o === '<' || o === '>';
const R = (n: number, d = 1) => rat(n, d);

/** The set {x : x op b}. */
const ray = (op: Op, b: Rational): Interval => (op === '<' || op === '≤' ? { lo: null, hi: b, loIn: false, hiIn: op === '≤' } : { lo: b, hi: null, loIn: op === '≥', hiIn: false });
const between = (a: Rational, b: Rational, aIn: boolean, bIn: boolean): Interval => ({ lo: a, hi: b, loIn: aIn, hiIn: bIn });
const point = (a: Rational): Interval => ({ lo: a, hi: a, loIn: true, hiIn: true });
const ALL: Interval = { lo: null, hi: null, loIn: false, hiIn: false };
const outside = (a: Rational, b: Rational, incl: boolean): Interval[] => [ray(incl ? '≤' : '<', a), ray(incl ? '≥' : '>', b)];

const ineqAns = (set: Interval[], v = 'x'): AnswerSpec => ({ kind: 'inequality', variable: v, set: toWire(normalise(set)) });
const showSet = (set: Interval[], v = 'x') => (normalise(set).length === 1 && normalise(set)[0]!.lo === null && normalise(set)[0]!.hi === null ? `all real values of $${v}$` : `$${setTex(set, v)}$`);

/** Wrong sets that are genuinely different from the answer and from the two mistakes answer.ts diagnoses on its own. */
function keepSets(ms: { code: MistakeCode; set: Interval[]; feedback: string }[], answer: Interval[], v = 'x'): Misconception[] {
  const seen = [answer, toggledEnds(normalise(answer)), complement(normalise(answer))];
  const out: Misconception[] = [];
  for (const m of ms) {
    const s = normalise(m.set);
    if (!s.length || seen.some((x) => sameSet(normalise(x), s))) continue;
    seen.push(s);
    out.push({ code: m.code, answer: ineqAns(s, v), feedback: m.feedback });
  }
  return out;
}

const rootsAns = (rs: Rational[]): AnswerSpec => ({ kind: 'roots', values: rs.map((r) => ({ n: r.n, d: r.d })) });
const sameRoots = (a: Rational[], b: Rational[]) => a.length === b.length && [...a].map((r) => r.n / r.d).sort().join() === [...b].map((r) => r.n / r.d).sort().join();
function keepRoots(ms: { code: MistakeCode; values: Rational[]; feedback: string }[], answer: Rational[]): Misconception[] {
  const seen = [answer];
  const out: Misconception[] = [];
  for (const m of ms) {
    if (seen.some((s) => sameRoots(s, m.values))) continue;
    seen.push(m.values);
    out.push({ code: m.code, answer: rootsAns(m.values), feedback: m.feedback });
  }
  return out;
}

const pointAns = (x: number, y: number): AnswerSpec => ({ kind: 'point', x: { n: x, d: 1 }, y: { n: y, d: 1 } });

/** a·x + b·y written in TeX, e.g. "3x - 2y". */
const lin2 = (a: number, b: number, v = ['x', 'y']) => sum([[a, v[0]!], [b, v[1]!]]);
/** A polynomial in x from coefficients, highest power first, e.g. [1, -3, 2] → x^2 - 3x + 2. */
const poly = (cs: number[], v = 'x') => sum(cs.map((c, i): [number, string] => [c, cs.length - 1 - i === 0 ? '' : cs.length - 1 - i === 1 ? v : `${v}^{${cs.length - 1 - i}}`]));
/** (x - a) in TeX, as a factor. */
const fac = (a: number, v = 'x') => (a === 0 ? v : `(${sum([[1, v], [-a, '']])})`);

// ---------------------------------------------------------------------------
// Simultaneous equations

export const simultaneousEquations: QuestionTemplate = {
  id: 'simultaneous-equations',
  skillId: 'simultaneous-equations',
  generate(rng, level) {
    if (level <= 2) {
      const x = rng.signed(1, 6);
      const y = rng.signed(1, 6);
      if (level === 1) {
        // Elimination: the y-coefficients are equal or opposite, or one equation needs scaling.
        let a1 = 0, b1 = 0, a2 = 0, b2 = 0, k = 1;
        do {
          a1 = rng.signed(1, 5);
          b1 = rng.signed(1, 4);
          k = rng.pick([1, -1, 2, -2, 3]);
          a2 = rng.signed(1, 5);
          b2 = b1 * k;
        } while (a1 * b2 - a2 * b1 === 0 || (a1 === a2 && b1 === b2));
        const c1 = a1 * x + b1 * y;
        const c2 = a2 * x + b2 * y;
        return {
          prompt: `Solve simultaneously: $${lin2(a1, b1)} = ${c1}$ and $${lin2(a2, b2)} = ${c2}$. Give the solution as $(x; y)$.`,
          input: { kind: 'point', name: '' },
          answer: pointAns(x, y),
          answerDisplay: `$x = ${x}$ and $y = ${y}$, so $(${x};\\, ${y})$`,
          hints: ['Make the $y$-coefficients the same size (multiply one equation if you need to), then add or subtract the equations so $y$ disappears.', 'Solve for $x$, then substitute it into either equation to find $y$.'],
          solution: [
            ...(k === 1
              ? [`Subtract the second equation from the first: $${sum([[a1 - a2, 'x']])} = ${c1 - c2}$, so $x = ${x}$.`]
              : k === -1
                ? [`Add the equations: $${sum([[a1 + a2, 'x']])} = ${c1 + c2}$, so $x = ${x}$.`]
                : [`Multiply the first equation by $${k}$: $${lin2(a1 * k, b2)} = ${c1 * k}$.`, `Subtract the second equation: $${sum([[a1 * k - a2, 'x']])} = ${c1 * k - c2}$, so $x = ${x}$.`]),
            `Substitute: $${a1 === 1 ? '' : a1 === -1 ? '-' : a1}(${x}) + ${b1 < 0 ? `(${b1})` : b1}y = ${c1}$, so $y = ${y}$.`,
            `Check in the second equation: $${a2 === 1 ? '' : a2 === -1 ? '-' : a2}(${x}) + ${b2 < 0 ? `(${b2})` : b2}(${y}) = ${c2}$ ✓`,
          ],
          misconceptions: keepPoints([
            { code: 'simultaneous', x: y, y: x, feedback: 'You have $x$ and $y$ the wrong way round. Write the $x$-value first.' },
            { code: 'simultaneous', x, y: -y, feedback: `Your $x$ is right but $y$ has the wrong sign. Substitute $x = ${x}$ back carefully and check both equations.` },
          ], x, y),
        };
      }
      // Substitution: one equation already gives y in terms of x.
      let m = 0, c = 0, a = 0, b = 0;
      do {
        m = rng.signed(1, 4);
        c = y - m * x;
        a = rng.signed(1, 5);
        b = rng.signed(1, 4);
      } while (a + b * m === 0 || Math.abs(c) > 15);
      const d = a * x + b * y;
      return {
        prompt: `Solve simultaneously: $y = ${sum([[m, 'x'], [c, '']])}$ and $${lin2(a, b)} = ${d}$. Give the solution as $(x; y)$.`,
        input: { kind: 'point', name: '' },
        answer: pointAns(x, y),
        answerDisplay: `$(${x};\\, ${y})$`,
        hints: ['The first equation tells you what $y$ is. Replace $y$ in the second equation with that expression, in brackets.', 'Solve the equation in $x$, then use $y = …$ to find $y$.'],
        solution: [
          `$${a}x + ${b < 0 ? `(${b})` : b}(${sum([[m, 'x'], [c, '']])}) = ${d}$`,
          `$${a + b * m}x ${term(b * c, '', false)} = ${d}$, so $x = ${x}$.`,
          `$y = ${m}(${x}) ${term(c, '', false)} = ${y}$`,
        ],
        misconceptions: keepPoints([
          { code: 'simultaneous', x: y, y: x, feedback: 'You have $x$ and $y$ the wrong way round. Write the $x$-value first.' },
          ...(Number.isInteger((d + b * c) / (a + b * m)) ? [{ code: 'sign-error' as MistakeCode, x: (d + b * c) / (a + b * m), y: m * ((d + b * c) / (a + b * m)) + c, feedback: `Check the sign when you move $${b * c}$ across: it changes sign.` }] : []),
        ], x, y),
      };
    }
    if (level === 3) return wordProblem(rng);
    if (level === 4) {
      // Line and parabola: y = x² + bx + c and y = mx + k meet where x² + (b - m)x + (c - k) = 0.
      let r1 = 0, r2 = 0, m = 0, k = 0, b = 0, c = 0;
      do {
        r1 = rng.signed(1, 5);
        r2 = rng.intExcept(-5, 5, [r1]);
        m = rng.signed(1, 4);
        k = rng.int(-8, 8);
        b = m - (r1 + r2);
        c = k + r1 * r2;
      } while (b === 0 || Math.abs(c) > 20 || b === m);
      const roots = [R(r1), R(r2)];
      const ys = [m * r1 + k, m * r2 + k];
      return {
        prompt: `Solve simultaneously: $y = ${poly([1, b, c])}$ and $y = ${sum([[m, 'x'], [k, '']])}$. Give the $x$-values of the solutions.`,
        input: { kind: 'roots', variable: 'x' },
        answer: rootsAns(roots),
        answerDisplay: `$x = ${r1}$ or $x = ${r2}$: the points $(${r1};\\, ${ys[0]})$ and $(${r2};\\, ${ys[1]})$`,
        hints: ['Both equations equal $y$, so set the right-hand sides equal to each other.', 'Get 0 on one side, factorise the quadratic and solve. Find $y$ from the straight line.'],
        solution: [
          `$${poly([1, b, c])} = ${sum([[m, 'x'], [k, '']])}$`,
          `$${poly([1, b - m, c - k])} = 0$`,
          `$${fac(r1)}${fac(r2)} = 0$, so $x = ${r1}$ or $x = ${r2}$.`,
          `$y = ${ys[0]}$ or $y = ${ys[1]}$`,
        ],
        misconceptions: keepRoots([
          { code: 'root-sign', values: [R(-r1), R(-r2)], feedback: 'The signs are flipped: $(x - a) = 0$ gives $x = a$.' },
          { code: 'simultaneous', values: [R(ys[0]!), R(ys[1]!)], feedback: 'Those are the $y$-values. The question asks for the $x$-values.' },
        ], roots),
      };
    }
    // Level 5: a straight line and a quadratic in x and y, e.g. y = 2x - 1 and x² + xy - y² = 5.
    for (;;) {
      const m = rng.pick([1, -1, 2, -2, 3]);
      const c = rng.signed(1, 4);
      const p = rng.pick([1, -1, 2, 0]);
      const q = rng.pick([1, -1, 2, -2]);
      const r1 = rng.signed(1, 4);
      const A = 1 + p * m + q * m * m;
      const B = p * c + 2 * q * m * c;
      if (A === 0) continue;
      const r2 = -B / A - r1;
      if (!Number.isInteger(r2) || r2 === r1 || Math.abs(r2) > 6) continue;
      const K = q * c * c - A * r1 * r2;
      const lhs = sum([[1, 'x^{2}'], [p, 'xy'], [q, 'y^{2}']]);
      const roots = [R(r1), R(r2)];
      const ys = [m * r1 + c, m * r2 + c];
      return {
        prompt: `Solve simultaneously: $y = ${sum([[m, 'x'], [c, '']])}$ and $${lhs} = ${K}$. Give the $x$-values of the solutions.`,
        input: { kind: 'roots', variable: 'x' },
        answer: rootsAns(roots),
        answerDisplay: `$x = ${r1}$ or $x = ${r2}$: the solutions $(${r1};\\, ${ys[0]})$ and $(${r2};\\, ${ys[1]})$`,
        hints: ['Substitute the straight line into the second equation: replace every $y$ with the expression in brackets.', 'Expand carefully (square the bracket as a binomial), get 0 on one side and solve the quadratic.'],
        solution: [
          `Substitute: $x^{2}${p === 0 ? '' : ` ${p < 0 ? '-' : '+'} ${Math.abs(p) === 1 ? '' : Math.abs(p)}x(${sum([[m, 'x'], [c, '']])})`} ${q < 0 ? '-' : '+'} ${Math.abs(q) === 1 ? '' : Math.abs(q)}(${sum([[m, 'x'], [c, '']])})^{2} = ${K}$`,
          `$${poly([A, B, q * c * c - K])} = 0$`,
          `$${A === 1 ? '' : A === -1 ? '-' : A}${fac(r1)}${fac(r2)} = 0$, so $x = ${r1}$ or $x = ${r2}$.`,
          `From the line: $y = ${ys[0]}$ or $y = ${ys[1]}$.`,
        ],
        misconceptions: keepRoots([
          { code: 'root-sign', values: [R(-r1), R(-r2)], feedback: 'The signs are flipped: $(x - a) = 0$ gives $x = a$.' },
          { code: 'simultaneous', values: [R(ys[0]!), R(ys[1]!)], feedback: 'Those are the $y$-values. The question asks for the $x$-values.' },
        ], roots),
      };
    }
  },
};

function keepPoints(ms: { code: MistakeCode; x: number; y: number; feedback: string }[], x: number, y: number): Misconception[] {
  const seen: [number, number][] = [[x, y]];
  const out: Misconception[] = [];
  for (const m of ms) {
    if (!Number.isInteger(m.x) || !Number.isInteger(m.y) || seen.some(([a, b]) => a === m.x && b === m.y)) continue;
    seen.push([m.x, m.y]);
    out.push({ code: m.code, answer: pointAns(m.x, m.y), feedback: m.feedback });
  }
  return out;
}

/** Two unknown quantities: a total count and a total value. `a` is counted by a, `b` by b. */
interface Word {
  a: string;
  b: string;
  pa: number[];
  pb: number[];
  story: (N: number, pa: number, pb: number, T: number) => string;
  /** "R60" or "3 points": the value of n items at `per` each. */
  worth: (n: number) => string;
}
const rand = (n: number) => `R${n}`;
const WORD: Word[] = [
  { a: 'adult tickets', b: 'child tickets', pa: [60, 85, 95, 120], pb: [30, 40, 45, 55], worth: rand, story: (N, pa, pb, T) => `A school play sold ${N} tickets. Adult tickets cost R${pa} and child tickets cost R${pb}, and the takings were R${T}.` },
  { a: 'large pizzas', b: 'small pizzas', pa: [110, 125, 140], pb: [60, 70, 75], worth: rand, story: (N, pa, pb, T) => `A class fundraiser sold ${N} pizzas for R${T} altogether. A large pizza costs R${pa} and a small one R${pb}.` },
  { a: 'R5 coins', b: 'R2 coins', pa: [5], pb: [2], worth: rand, story: (N, _pa, _pb, T) => `A money box holds ${N} coins, all R5 and R2 coins. Together they are worth R${T}.` },
  { a: 'three-point questions', b: 'two-point questions', pa: [3], pb: [2], worth: (n) => `${n} points`, story: (N, _pa, _pb, T) => `In a quiz, Lerato answered ${N} questions correctly and scored ${T} points. Each question was worth either 3 points or 2 points.` },
  { a: 'minibus taxis', b: 'cars', pa: [15, 16], pb: [4, 5], worth: (n) => `${n} passengers`, story: (N, pa, pb, T) => `A car park holds ${N} vehicles: minibus taxis and cars. A taxi carries ${pa} passengers and a car ${pb}. When all are full they carry ${T} passengers.` },
];

function wordProblem(rng: Rng): GeneratedQuestion {
  const w = rng.pick(WORD);
  const pa = rng.pick(w.pa);
  const pb = rng.pick(w.pb);
  const A = rng.int(4, 30);
  const B = rng.intExcept(4, 30, [A]);
  const N = A + B;
  const T = pa * A + pb * B;
  const askA = rng.chance(0.5);
  const ans = askA ? A : B;
  return {
    prompt: `${w.story(N, pa, pb, T)} How many ${askA ? w.a : w.b} were there?`,
    input: { kind: 'numeric' },
    answer: exact(ans),
    answerDisplay: `$${ans}$ ${askA ? w.a : w.b}`,
    hints: [`Let $a$ be the number of ${w.a} and $b$ the number of ${w.b}. Write one equation for how many there are and one for the total.`, `$a + b = ${N}$ and $${pa}a + ${pb}b = ${T}$. Substitute $b = ${N} - a$ into the second.`],
    solution: [
      `$a + b = ${N}$ and $${pa}a + ${pb}b = ${T}$`,
      `$${pa}a + ${pb}(${N} - a) = ${T}$, so $${sum([[pa - pb, 'a']])} = ${T - pb * N}$ and $a = ${A}$.`,
      `$b = ${N} - ${A} = ${B}$. Check: ${w.worth(pa * A)} + ${w.worth(pb * B)} = ${w.worth(T)} ✓`,
    ],
    misconceptions: keepNum([{ code: 'simultaneous', answer: exact(askA ? B : A), feedback: `That is the number of ${askA ? w.b : w.a}. Read which quantity the question asks for.` }], ans),
  };
}

// ---------------------------------------------------------------------------
// Changing the subject of a formula

interface Literal {
  /** The formula in TeX. */
  tex: string;
  subject: string;
  /** The answer in plain text for the checker, and in TeX for display. */
  ans: string;
  ansTex: string;
  /** The other letters in the formula. */
  vars: string[];
  steps: string[];
  wrong: [string, string][];
  what?: string;
}

const L = (tex: string, subject: string, vars: string[], ans: string, ansTex: string, steps: string[], wrong: [string, string][] = [], what?: string): Literal => ({ tex, subject, vars, ans, ansTex, steps, wrong, what });
const UPSIDE = 'That is upside down. Check by putting your answer back into the formula.';
const BRACKETS = 'Keep the whole top in brackets: you must divide everything on that side, not just the last term.';

const LITERALS: Literal[][] = [
  // Level 1: one operation to undo.
  [
    L('F = ma', 'a', ['F', 'm'], 'F/m', '\\dfrac{F}{m}', ['Divide both sides by $m$.'], [['F - m', 'You subtracted $m$, but $m$ multiplies $a$. Undo a multiplication by dividing.'], ['Fm', 'Dividing both sides by $m$ gives $\\frac{F}{m}$, not $Fm$.']], "Newton's second law"),
    L('F = ma', 'm', ['F', 'a'], 'F/a', '\\dfrac{F}{a}', ['Divide both sides by $a$.'], [['F - a', 'You subtracted, but $a$ multiplies $m$. Divide instead.']], "Newton's second law"),
    L('V = IR', 'I', ['V', 'R'], 'V/R', '\\dfrac{V}{R}', ['Divide both sides by $R$.'], [['V - R', 'You subtracted, but $R$ multiplies $I$. Divide instead.']], "Ohm's law"),
    L('V = IR', 'R', ['V', 'I'], 'V/I', '\\dfrac{V}{I}', ['Divide both sides by $I$.'], [['VI', 'Dividing both sides by $I$ gives $\\frac{V}{I}$, not $VI$.']], "Ohm's law"),
    L('W = Fs', 's', ['W', 'F'], 'W/F', '\\dfrac{W}{F}', ['Divide both sides by $F$.'], [['W - F', 'You subtracted, but $F$ multiplies $s$. Divide instead.']], 'work done by a force'),
    L('C = 2\\pi r', 'r', ['C'], 'C/(2π)', '\\dfrac{C}{2\\pi}', ['Divide both sides by $2\\pi$.'], [['2πC', 'Dividing both sides by $2\\pi$ gives $\\frac{C}{2\\pi}$.'], ['C/2', 'Divide by the whole $2\\pi$, not just the 2.']], 'the circumference of a circle'),
    L('d = \\dfrac{m}{V}', 'm', ['d', 'V'], 'dV', 'dV', ['Multiply both sides by $V$.'], [['d/V', 'Undo a division by multiplying: $m = dV$.']], 'density'),
    L('d = \\dfrac{m}{V}', 'V', ['d', 'm'], 'm/d', '\\dfrac{m}{d}', ['Multiply both sides by $V$: $dV = m$.', 'Divide both sides by $d$.'], [['dm', 'From $dV = m$, divide by $d$: $V = \\frac{m}{d}$.']], 'density'),
    L('p = mv', 'v', ['p', 'm'], 'p/m', '\\dfrac{p}{m}', ['Divide both sides by $m$.'], [['p - m', 'You subtracted, but $m$ multiplies $v$. Divide instead.']], 'momentum'),
    L('P = \\dfrac{W}{t}', 'W', ['P', 't'], 'Pt', 'Pt', ['Multiply both sides by $t$.'], [['P/t', 'Undo a division by multiplying: $W = Pt$.']], 'power'),
    L('P = \\dfrac{W}{t}', 't', ['P', 'W'], 'W/P', '\\dfrac{W}{P}', ['Multiply both sides by $t$: $Pt = W$.', 'Divide both sides by $P$.'], [['PW', 'From $Pt = W$, divide by $P$: $t = \\frac{W}{P}$.']], 'power'),
    L('Q = It', 't', ['Q', 'I'], 'Q/I', '\\dfrac{Q}{I}', ['Divide both sides by $I$.'], [['Q - I', 'You subtracted, but $I$ multiplies $t$. Divide instead.']], 'electric charge'),
  ],
  // Level 2: two operations.
  [
    L('v = u + at', 'a', ['v', 'u', 't'], '(v - u)/t', '\\dfrac{v - u}{t}', ['Subtract $u$: $v - u = at$.', 'Divide by $t$.'], [['v - u/t', BRACKETS], ['(v + u)/t', 'Moving $u$ to the other side changes its sign: $v - u = at$.']], 'motion with constant acceleration'),
    L('v = u + at', 't', ['v', 'u', 'a'], '(v - u)/a', '\\dfrac{v - u}{a}', ['Subtract $u$: $v - u = at$.', 'Divide by $a$.'], [['v - u/a', BRACKETS], ['(v + u)/a', 'Moving $u$ changes its sign: $v - u = at$.']], 'motion with constant acceleration'),
    L('v = u + at', 'u', ['v', 'a', 't'], 'v - at', 'v - at', ['Subtract $at$ from both sides.'], [['v + at', 'Moving $at$ to the other side changes its sign.']], 'motion with constant acceleration'),
    L('y = mx + c', 'x', ['y', 'm', 'c'], '(y - c)/m', '\\dfrac{y - c}{m}', ['Subtract $c$: $y - c = mx$.', 'Divide by $m$.'], [['y - c/m', BRACKETS], ['(y + c)/m', 'Moving $c$ changes its sign: $y - c = mx$.']]),
    L('y = mx + c', 'm', ['y', 'x', 'c'], '(y - c)/x', '\\dfrac{y - c}{x}', ['Subtract $c$: $y - c = mx$.', 'Divide by $x$.'], [['y/x - c', 'Subtract $c$ first, then divide the whole of $y - c$ by $x$.']]),
    L('P = 2(l + b)', 'l', ['P', 'b'], 'P/2 - b', '\\dfrac{P}{2} - b', ['Divide by 2: $\\frac{P}{2} = l + b$.', 'Subtract $b$.'], [['(P - b)/2', 'Divide by 2 first (the 2 multiplies the whole bracket), then subtract $b$.'], ['P - 2b', 'Dividing $P$ by 2 too: $l = \\frac{P}{2} - b$.']], 'the perimeter of a rectangle'),
    L('P = 2(l + b)', 'b', ['P', 'l'], 'P/2 - l', '\\dfrac{P}{2} - l', ['Divide by 2: $\\frac{P}{2} = l + b$.', 'Subtract $l$.'], [['(P - l)/2', 'Divide by 2 first (the 2 multiplies the whole bracket), then subtract $l$.']], 'the perimeter of a rectangle'),
    L('F = \\dfrac{9C}{5} + 32', 'C', ['F'], '5(F - 32)/9', '\\dfrac{5(F - 32)}{9}', ['Subtract 32: $F - 32 = \\frac{9C}{5}$.', 'Multiply by 5 and divide by 9.'], [['5F/9 - 32', 'Undo in reverse order: subtract 32 first, then multiply by $\\frac{5}{9}$.'], ['9(F - 32)/5', 'Multiply by $\\frac{5}{9}$, the reciprocal of $\\frac{9}{5}$.']], 'converting between Celsius and Fahrenheit'),
    L('C = \\dfrac{5(F - 32)}{9}', 'F', ['C'], '9C/5 + 32', '\\dfrac{9C}{5} + 32', ['Multiply by 9 and divide by 5: $\\frac{9C}{5} = F - 32$.', 'Add 32.'], [['9(C + 32)/5', 'Undo in reverse order: multiply by $\\frac{9}{5}$ first, then add 32.']], 'converting between Celsius and Fahrenheit'),
    L('A = \\tfrac{1}{2}bh', 'h', ['A', 'b'], '2A/b', '\\dfrac{2A}{b}', ['Multiply by 2: $2A = bh$.', 'Divide by $b$.'], [['A/(2b)', 'Multiply by 2 to undo the half: $2A = bh$.']], 'the area of a triangle'),
    L('A = \\tfrac{1}{2}bh', 'b', ['A', 'h'], '2A/h', '\\dfrac{2A}{h}', ['Multiply by 2: $2A = bh$.', 'Divide by $h$.'], [['A/(2h)', 'Multiply by 2 to undo the half: $2A = bh$.']], 'the area of a triangle'),
    L('E = mgh', 'h', ['E', 'm', 'g'], 'E/(mg)', '\\dfrac{E}{mg}', ['Divide both sides by $mg$.'], [['Emg', 'Divide by $mg$; do not multiply.'], ['E/m - g', 'Both $m$ and $g$ multiply $h$, so divide by both.']], 'gravitational potential energy'),
  ],
  // Level 3: squares and square roots.
  [
    L('A = \\pi r^2', 'r', ['A'], '√(A/π)', '\\sqrt{\\dfrac{A}{\\pi}}', ['Divide by $\\pi$: $r^2 = \\frac{A}{\\pi}$.', 'Take the square root (a length is positive).'], [['A/π', 'That is $r^2$. Take the square root to get $r$.'], ['√A/π', 'Take the square root of the whole of $\\frac{A}{\\pi}$.']], 'the area of a circle'),
    L('E = \\tfrac{1}{2}mv^2', 'v', ['E', 'm'], '√(2E/m)', '\\sqrt{\\dfrac{2E}{m}}', ['Multiply by 2 and divide by $m$: $v^2 = \\frac{2E}{m}$.', 'Take the square root.'], [['√(E/(2m))', 'Multiply by 2 to undo the half: $2E = mv^2$.'], ['2E/m', 'That is $v^2$. Take the square root to get $v$.']], 'kinetic energy'),
    L('E = \\tfrac{1}{2}mv^2', 'm', ['E', 'v'], '2E/v^2', '\\dfrac{2E}{v^2}', ['Multiply by 2: $2E = mv^2$.', 'Divide by $v^2$.'], [['E/(2v^2)', 'Multiply by 2 to undo the half: $2E = mv^2$.'], ['2E/v', 'Divide by $v^2$, not $v$.']], 'kinetic energy'),
    L('V = \\pi r^2 h', 'h', ['V', 'r'], 'V/(πr^2)', '\\dfrac{V}{\\pi r^2}', ['Divide both sides by $\\pi r^2$.'], [['V/(πr)', 'Divide by $\\pi r^2$: $r$ is squared.']], 'the volume of a cylinder'),
    L('V = \\pi r^2 h', 'r', ['V', 'h'], '√(V/(πh))', '\\sqrt{\\dfrac{V}{\\pi h}}', ['Divide by $\\pi h$: $r^2 = \\frac{V}{\\pi h}$.', 'Take the square root.'], [['V/(πh)', 'That is $r^2$. Take the square root to get $r$.']], 'the volume of a cylinder'),
    L('y = ax^2', 'x', ['y', 'a'], '√(y/a)', '\\sqrt{\\dfrac{y}{a}}', ['Divide by $a$: $x^2 = \\frac{y}{a}$.', 'Take the (positive) square root.'], [['y/a', 'That is $x^2$. Take the square root to get $x$.'], ['√y/a', 'Take the square root of the whole of $\\frac{y}{a}$.']]),
    L('y = ax^2', 'a', ['y', 'x'], 'y/x^2', '\\dfrac{y}{x^2}', ['Divide both sides by $x^2$.'], [['y/x', 'Divide by $x^2$, not $x$.'], ['√(y/x)', '$a$ is not squared, so no square root is needed: divide by $x^2$.']]),
    L('A = 4\\pi r^2', 'r', ['A'], '√(A/(4π))', '\\sqrt{\\dfrac{A}{4\\pi}}', ['Divide by $4\\pi$: $r^2 = \\frac{A}{4\\pi}$.', 'Take the square root.'], [['A/(4π)', 'That is $r^2$. Take the square root to get $r$.'], ['√(4πA)', 'Divide by $4\\pi$, not multiply.']], 'the surface area of a sphere'),
    L('V = \\tfrac{1}{3}\\pi r^2 h', 'h', ['V', 'r'], '3V/(πr^2)', '\\dfrac{3V}{\\pi r^2}', ['Multiply by 3: $3V = \\pi r^2 h$.', 'Divide by $\\pi r^2$.'], [['V/(3πr^2)', 'Multiply by 3 to undo the third.']], 'the volume of a cone'),
    L('V = \\tfrac{1}{3}\\pi r^2 h', 'r', ['V', 'h'], '√(3V/(πh))', '\\sqrt{\\dfrac{3V}{\\pi h}}', ['Multiply by 3 and divide by $\\pi h$: $r^2 = \\frac{3V}{\\pi h}$.', 'Take the square root.'], [['3V/(πh)', 'That is $r^2$. Take the square root to get $r$.'], ['√(V/(3πh))', 'Multiply by 3 to undo the third.']], 'the volume of a cone'),
    L('P = I^2 R', 'I', ['P', 'R'], '√(P/R)', '\\sqrt{\\dfrac{P}{R}}', ['Divide by $R$: $I^2 = \\frac{P}{R}$.', 'Take the square root.'], [['P/R', 'That is $I^2$. Take the square root to get $I$.']], 'electrical power'),
    L('P = I^2 R', 'R', ['P', 'I'], 'P/I^2', '\\dfrac{P}{I^2}', ['Divide both sides by $I^2$.'], [['P/I', 'Divide by $I^2$, not $I$.']], 'electrical power'),
  ],
  // Level 4: several steps.
  [
    L('s = ut + \\tfrac{1}{2}at^2', 'a', ['s', 'u', 't'], '2(s - ut)/t^2', '\\dfrac{2(s - ut)}{t^2}', ['Subtract $ut$: $s - ut = \\frac{1}{2}at^2$.', 'Multiply by 2 and divide by $t^2$.'], [['(s - ut)/(2t^2)', 'Multiply by 2 to undo the half.'], ['2s - ut/t^2', BRACKETS]], 'motion with constant acceleration'),
    L('s = ut + \\tfrac{1}{2}at^2', 'u', ['s', 'a', 't'], '(s - at^2/2)/t', '\\dfrac{s - \\frac{1}{2}at^2}{t}', ['Subtract $\\frac{1}{2}at^2$: $s - \\frac{1}{2}at^2 = ut$.', 'Divide by $t$.'], [['s/t - at^2/2', 'Divide the whole of $s - \\frac{1}{2}at^2$ by $t$: $\\frac{s}{t} - \\frac{1}{2}at$.']], 'motion with constant acceleration'),
    L('A = P(1 + in)', 'i', ['A', 'P', 'n'], '(A - P)/(Pn)', '\\dfrac{A - P}{Pn}', ['Divide by $P$: $\\frac{A}{P} = 1 + in$.', 'Subtract 1, then divide by $n$: $i = \\frac{A/P - 1}{n} = \\frac{A - P}{Pn}$.'], [['(A - 1)/(Pn)', 'Divide by $P$ before you subtract 1: $\\frac{A}{P} - 1$, not $A - 1$.'], ['A/(Pn) - 1', 'Subtract 1 before you divide by $n$.']], 'simple interest'),
    L('A = P(1 + in)', 'n', ['A', 'P', 'i'], '(A - P)/(Pi)', '\\dfrac{A - P}{Pi}', ['Divide by $P$: $\\frac{A}{P} = 1 + in$.', 'Subtract 1, then divide by $i$.'], [['(A - 1)/(Pi)', 'Divide by $P$ before you subtract 1.'], ['A/(Pi) - 1', 'Subtract 1 before you divide by $i$.']], 'simple interest'),
    L('A = P(1 + in)', 'P', ['A', 'i', 'n'], 'A/(1 + in)', '\\dfrac{A}{1 + in}', ['Divide both sides by $(1 + in)$.'], [['A/(1 + i)n', 'Divide by the whole bracket $(1 + in)$.'], ['A - in', '$P$ multiplies the bracket, so divide by it.']], 'simple interest'),
    L('T = 2\\pi\\sqrt{\\dfrac{l}{g}}', 'l', ['T', 'g'], 'gT^2/(4π^2)', '\\dfrac{gT^2}{4\\pi^2}', ['Divide by $2\\pi$: $\\frac{T}{2\\pi} = \\sqrt{\\frac{l}{g}}$.', 'Square both sides: $\\frac{T^2}{4\\pi^2} = \\frac{l}{g}$, then multiply by $g$.'], [['gT^2/(2π)', 'When you square $\\frac{T}{2\\pi}$, the $2\\pi$ is squared too: $4\\pi^2$.'], ['gT/(2π)', 'Square both sides to remove the root.']], 'the period of a pendulum'),
    L('T = 2\\pi\\sqrt{\\dfrac{l}{g}}', 'g', ['T', 'l'], '4π^2 l/T^2', '\\dfrac{4\\pi^2 l}{T^2}', ['Square both sides: $T^2 = \\frac{4\\pi^2 l}{g}$.', 'Multiply by $g$ and divide by $T^2$.'], [['T^2/(4π^2 l)', UPSIDE], ['2πl/T^2', 'When you square $2\\pi\\sqrt{\\ }$, the $2\\pi$ is squared too: $4\\pi^2$.']], 'the period of a pendulum'),
    L('v^2 = u^2 + 2as', 'a', ['v', 'u', 's'], '(v^2 - u^2)/(2s)', '\\dfrac{v^2 - u^2}{2s}', ['Subtract $u^2$: $v^2 - u^2 = 2as$.', 'Divide by $2s$.'], [['(v - u)^2/(2s)', '$v^2 - u^2$ is not $(v - u)^2$. Keep the squares as they are.'], ['v^2 - u^2/(2s)', BRACKETS]], 'motion with constant acceleration'),
    L('v^2 = u^2 + 2as', 's', ['v', 'u', 'a'], '(v^2 - u^2)/(2a)', '\\dfrac{v^2 - u^2}{2a}', ['Subtract $u^2$: $v^2 - u^2 = 2as$.', 'Divide by $2a$.'], [['(v - u)^2/(2a)', '$v^2 - u^2$ is not $(v - u)^2$.'], ['(v^2 + u^2)/(2a)', 'Moving $u^2$ changes its sign.']], 'motion with constant acceleration'),
    L('S = \\dfrac{n(a + l)}{2}', 'l', ['S', 'n', 'a'], '2S/n - a', '\\dfrac{2S}{n} - a', ['Multiply by 2 and divide by $n$: $\\frac{2S}{n} = a + l$.', 'Subtract $a$.'], [['(2S - a)/n', 'Divide by $n$ before subtracting $a$: $\\frac{2S}{n} - a$.'], ['S/(2n) - a', 'Multiply by 2 to undo the half.']], 'the sum of an arithmetic series'),
    L('S = \\dfrac{n(a + l)}{2}', 'n', ['S', 'a', 'l'], '2S/(a + l)', '\\dfrac{2S}{a + l}', ['Multiply by 2: $2S = n(a + l)$.', 'Divide by $(a + l)$.'], [['2S/a + l', 'Divide by the whole bracket $(a + l)$.'], ['S/(2(a + l))', 'Multiply by 2 to undo the half.']], 'the sum of an arithmetic series'),
    L('S = \\dfrac{n(a + l)}{2}', 'a', ['S', 'n', 'l'], '2S/n - l', '\\dfrac{2S}{n} - l', ['Multiply by 2 and divide by $n$: $\\frac{2S}{n} = a + l$.', 'Subtract $l$.'], [['(2S - l)/n', 'Divide by $n$ before subtracting $l$.']], 'the sum of an arithmetic series'),
  ],
  // Level 5: the subject appears twice, so collect its terms and factorise.
  [
    L('A = P + Prt', 'P', ['A', 'r', 't'], 'A/(1 + rt)', '\\dfrac{A}{1 + rt}', ['Factorise the right-hand side: $A = P(1 + rt)$.', 'Divide by $(1 + rt)$.'], [['A/(rt)', 'Factorising $P + Prt$ gives $P(1 + rt)$: keep the 1.']], 'simple interest'),
    L('ax + b = cx + d', 'x', ['a', 'b', 'c', 'd'], '(d - b)/(a - c)', '\\dfrac{d - b}{a - c}', ['Collect the $x$-terms on one side: $ax - cx = d - b$.', 'Factorise: $x(a - c) = d - b$, then divide by $(a - c)$.'], [['(d + b)/(a - c)', 'Moving $b$ changes its sign: $d - b$.'], ['(d - b)/(a + c)', 'Moving $cx$ changes its sign: $ax - cx$.']]),
    L('y = \\dfrac{x + a}{x - b}', 'x', ['y', 'a', 'b'], '(by + a)/(y - 1)', '\\dfrac{by + a}{y - 1}', ['Multiply by $(x - b)$: $xy - by = x + a$.', 'Collect $x$-terms: $xy - x = by + a$.', 'Factorise and divide: $x(y - 1) = by + a$.'], [['(by - a)/(y - 1)', 'Check the sign when you move $a$ across.'], ['(by + a)/(y + 1)', 'Moving $x$ to the left gives $xy - x = x(y - 1)$.']]),
    L('ax = bx + c', 'x', ['a', 'b', 'c'], 'c/(a - b)', '\\dfrac{c}{a - b}', ['Collect the $x$-terms: $ax - bx = c$.', 'Factorise: $x(a - b) = c$, then divide.'], [['c/(a + b)', 'Moving $bx$ changes its sign: $ax - bx$.'], ['(a - b)/c', UPSIDE]]),
    L('p = \\dfrac{q + r}{q}', 'q', ['p', 'r'], 'r/(p - 1)', '\\dfrac{r}{p - 1}', ['Multiply by $q$: $pq = q + r$.', 'Collect $q$-terms: $pq - q = r$, so $q(p - 1) = r$.'], [['r/p - 1', 'Divide by the whole bracket $(p - 1)$.'], ['r/(p + 1)', 'Moving $q$ changes its sign: $pq - q$.']]),
    L('T = \\dfrac{a + b}{a - b}', 'a', ['T', 'b'], 'b(T + 1)/(T - 1)', '\\dfrac{b(T + 1)}{T - 1}', ['Multiply by $(a - b)$: $Ta - Tb = a + b$.', 'Collect $a$-terms: $Ta - a = Tb + b$.', 'Factorise: $a(T - 1) = b(T + 1)$, then divide.'], [['b(T - 1)/(T + 1)', UPSIDE], ['(Tb + b)/T', 'Collect all the $a$-terms: $Ta - a$, then factorise.']]),
    L('\\dfrac{1}{f} = \\dfrac{1}{u} + \\dfrac{1}{v}', 'f', ['u', 'v'], 'uv/(u + v)', '\\dfrac{uv}{u + v}', ['Add the fractions: $\\frac{1}{f} = \\frac{v + u}{uv}$.', 'Flip both sides.'], [['u + v', 'The reciprocal of $\\frac{1}{u} + \\frac{1}{v}$ is not $u + v$. Add the fractions first, then flip.'], ['(u + v)/(uv)', 'That is $\\frac{1}{f}$. Flip it to get $f$.']], 'a thin lens'),
    L('\\dfrac{1}{f} = \\dfrac{1}{u} + \\dfrac{1}{v}', 'v', ['f', 'u'], 'uf/(u - f)', '\\dfrac{uf}{u - f}', ['Subtract: $\\frac{1}{v} = \\frac{1}{f} - \\frac{1}{u} = \\frac{u - f}{uf}$.', 'Flip both sides.'], [['f - u', 'You can not flip each term separately. Combine $\\frac{1}{f} - \\frac{1}{u}$ into one fraction first.'], ['(u - f)/(uf)', 'That is $\\frac{1}{v}$. Flip it to get $v$.']], 'a thin lens'),
    L('S = \\dfrac{a}{1 - r}', 'r', ['S', 'a'], '(S - a)/S', '\\dfrac{S - a}{S}', ['Multiply by $(1 - r)$: $S - Sr = a$.', 'Then $Sr = S - a$; divide by $S$.'], [['(a - S)/S', 'From $S - Sr = a$: $Sr = S - a$. Check the signs.'], ['1 - S/a', 'From $S(1 - r) = a$, divide by $S$, not $a$: $1 - r = \\frac{a}{S}$.']], 'the sum to infinity of a geometric series'),
    L('m(x - a) = n(x + b)', 'x', ['m', 'n', 'a', 'b'], '(ma + nb)/(m - n)', '\\dfrac{ma + nb}{m - n}', ['Expand: $mx - ma = nx + nb$.', 'Collect $x$-terms: $mx - nx = ma + nb$.', 'Factorise and divide: $x(m - n) = ma + nb$.'], [['(ma - nb)/(m - n)', 'Check the sign of $nb$ when you collect the terms.'], ['(ma + nb)/(m + n)', 'Moving $nx$ changes its sign: $mx - nx$.']]),
    L('y = \\dfrac{ax}{x + b}', 'x', ['y', 'a', 'b'], 'by/(a - y)', '\\dfrac{by}{a - y}', ['Multiply by $(x + b)$: $xy + by = ax$.', 'Collect $x$-terms: $by = ax - xy = x(a - y)$.', 'Divide by $(a - y)$.'], [['by/(y - a)', 'Check the signs when you collect the $x$-terms: $by = x(a - y)$.'], ['(a - y)/(by)', UPSIDE]]),
  ],
];

export const literalEquations: QuestionTemplate = {
  id: 'literal-equations',
  skillId: 'literal-equations',
  generate(rng, level) {
    const f = rng.pick(LITERALS[level - 1]!);
    const recip = `1/(${f.ans})`;
    const wrong: [string, string][] = [...f.wrong, [recip, UPSIDE]];
    const seen = [f.ans];
    const misconceptions: Misconception[] = [];
    for (const [expr, feedback] of wrong) {
      if (seen.some((s) => formulasEquivalent(s, expr, f.vars))) continue;
      seen.push(expr);
      misconceptions.push({ code: 'change-subject', answer: { kind: 'formula', expr, variables: f.vars }, feedback });
    }
    return {
      prompt: `${f.what ? `The formula for ${f.what} is` : 'Given'} $${f.tex}$. Make $${f.subject}$ the subject of the formula.`,
      input: { kind: 'formula', prefix: `${f.subject} =`, variables: f.vars },
      answer: { kind: 'formula', expr: f.ans, variables: f.vars },
      answerDisplay: `$${f.subject} = ${f.ansTex}$`,
      hints: [`Undo what is done to $${f.subject}$, in reverse order, doing the same to both sides.`, f.steps[0]!],
      solution: [`$${f.tex}$`, ...f.steps, `$${f.subject} = ${f.ansTex}$`],
      misconceptions,
    };
  },
};
export { LITERALS };

// ---------------------------------------------------------------------------
// Linear inequalities

const PLAIN_OP: Record<Op, string> = { '<': 'less than', '>': 'greater than', '≤': 'at most', '≥': 'at least' };

export const linearInequalities: QuestionTemplate = {
  id: 'linear-inequalities',
  skillId: 'linear-inequalities',
  generate(rng, level) {
    if (level === 1) {
      const op = rng.pick(OPS);
      const k = rng.int(-8, 8);
      if (rng.chance(0.3)) {
        // Read the solution off a number line.
        const set = [ray(op, R(k))];
        return {
          prompt: `Write down the inequality shown on the number line.`,
          figure: { kind: 'numberline', alt: `A number line with a ${strict(op) ? 'open' : 'closed'} dot at ${k} and a thick line going to the ${op === '<' || op === '≤' ? 'left' : 'right'}.`, set: toWire(set) },
          input: { kind: 'inequality', variable: 'x' },
          answer: ineqAns(set),
          answerDisplay: `$${setTex(set)}$`,
          hints: ['An open dot means the value is left out (< or >). A closed dot means it is included (≤ or ≥).', 'The thick line shows every value of $x$ in the solution: which way does it go?'],
          solution: [`The dot at $${k}$ is ${strict(op) ? 'open, so the inequality is strict' : 'closed, so $' + k + '$ is included'}.`, `The line goes to the ${op === '<' || op === '≤' ? 'left (smaller numbers)' : 'right (bigger numbers)'}: $${setTex(set)}$.`],
          misconceptions: [],
        };
      }
      const a = rng.int(2, 6);
      const b = rng.intExcept(-9, 9, [0]);
      const c = a * k + b;
      const set = [ray(op, R(k))];
      const wrongK = rat(c + b, a);
      const flipSide = rng.chance(0.4);
      const shown = flipSide ? `${c} ${opTex[flipOp[op]]} ${sum([[a, 'x'], [b, '']])}` : `${sum([[a, 'x'], [b, '']])} ${opTex[op]} ${c}`;
      return {
        prompt: `Solve for $x$: $${shown}$.`,
        input: { kind: 'inequality', variable: 'x' },
        answer: ineqAns(set),
        answerDisplay: `$${setTex(set)}$`,
        hints: ['Solve it like an equation, keeping the inequality sign.', `${b > 0 ? `Subtract ${b}` : `Add ${-b}`} on both sides, then divide by ${a}. Dividing by a positive number keeps the sign.`],
        solution: [`$${a}x ${opTex[op]} ${c - b}$`, `$${setTex(set)}$`],
        misconceptions: keepSets([{ code: 'inverse-operation', set: [ray(op, wrongK)], feedback: `Undo $${term(b, '', true)}$ by doing the opposite: ${b > 0 ? 'subtract' : 'add'} ${Math.abs(b)} on both sides.` }], set),
      };
    }
    if (level === 2) {
      // The x-coefficient ends up negative, so the sign must be reversed.
      const op = rng.pick(OPS);
      const k = rng.int(-8, 8);
      const a = rng.int(2, 6);
      const set = [ray(flipOp[op], R(k))];
      const noFlip = [ray(op, R(k))];
      if (rng.chance(0.5)) {
        const b = rng.intExcept(-9, 9, [0]);
        const c = b - a * k;
        return {
          prompt: `Solve for $x$: $${sum([[b, ''], [-a, 'x']])} ${opTex[op]} ${c}$.`,
          input: { kind: 'inequality', variable: 'x' },
          answer: ineqAns(set),
          answerDisplay: `$${setTex(set)}$`,
          hints: [`${b > 0 ? `Subtract ${b}` : `Add ${-b}`} on both sides to get $-${a}x$ on its own.`, `Divide by $-${a}$. Dividing by a negative number reverses the inequality sign.`],
          solution: [`$-${a}x ${opTex[op]} ${c - b}$`, `Divide by $-${a}$ and reverse the sign: $${setTex(set)}$`],
          misconceptions: keepSets([{ code: 'inequality-flip', set: noFlip, feedback: `You divided by $-${a}$ but kept the sign. Dividing by a negative reverses it: test $x = ${k + (op === '<' || op === '≤' ? -1 : 1)}$ in the original.` }], set),
        };
      }
      // x on both sides: px + q op rx + s with p < r.
      const p = rng.int(-4, 4);
      const r = p + a;
      const q = rng.int(-9, 9);
      const s = q - a * k;
      return {
        prompt: `Solve for $x$: $${sum([[p, 'x'], [q, '']]) || '0'} ${opTex[op]} ${sum([[r, 'x'], [s, '']])}$.`,
        input: { kind: 'inequality', variable: 'x' },
        answer: ineqAns(set),
        answerDisplay: `$${setTex(set)}$`,
        hints: ['Get the $x$-terms on the left and the numbers on the right.', 'If the $x$-coefficient is negative, dividing by it reverses the sign. (Or collect $x$ on the right instead, so it stays positive.)'],
        solution: [`$${sum([[p - r, 'x']])} ${opTex[op]} ${s - q}$`, `Divide by $${p - r}$ and reverse the sign: $${setTex(set)}$`],
        misconceptions: keepSets([{ code: 'inequality-flip', set: noFlip, feedback: `You divided by $${p - r}$ but kept the sign. Dividing by a negative reverses it.` }], set),
      };
    }
    if (level === 3) {
      // Double inequality with a positive coefficient.
      const k1 = rng.int(-7, 4);
      const k2 = rng.int(k1 + 2, k1 + 8);
      const a = rng.int(2, 5);
      const b = rng.int(-9, 9);
      const lIn = rng.chance(0.5);
      const rIn = rng.chance(0.5);
      const set = [between(R(k1), R(k2), lIn, rIn)];
      const shown = `${a * k1 + b} ${lIn ? '\\le' : '<'} ${sum([[a, 'x'], [b, '']])} ${rIn ? '\\le' : '<'} ${a * k2 + b}`;
      if (rng.chance(0.4)) {
        const count = k2 - k1 + 1 - (lIn ? 0 : 1) - (rIn ? 0 : 1);
        return {
          prompt: `How many integers $x$ satisfy $${shown}$?`,
          input: { kind: 'numeric', prefix: 'number =' },
          answer: exact(count),
          answerDisplay: `$${count}$: the integers from $${lIn ? k1 : k1 + 1}$ to $${rIn ? k2 : k2 - 1}$`,
          hints: ['Solve the double inequality first: do the same to all three parts.', 'Then list the integers in the interval. Check whether each end is included.'],
          solution: [`$${a * k1} ${lIn ? '\\le' : '<'} ${a}x ${rIn ? '\\le' : '<'} ${a * k2}$`, `$${setTex(set)}$`, `The integers are $${lIn ? k1 : k1 + 1}$ to $${rIn ? k2 : k2 - 1}$: $${count}$ of them.`],
          misconceptions: keepNum([
            { code: 'inequality-endpoint', answer: exact(k2 - k1 + 1), feedback: 'Check the ends: < leaves the end value out.' },
            { code: 'inequality-endpoint', answer: exact(k2 - k1 - 1), feedback: 'Check the ends: ≤ includes the end value.' },
            { code: 'inequality-endpoint', answer: exact(k2 - k1), feedback: 'Counting from one integer to another, include both ends: from 3 to 7 is 5 integers, not 4.' },
          ], count),
        };
      }
      return {
        prompt: `Solve for $x$: $${shown}$.`,
        input: { kind: 'inequality', variable: 'x' },
        answer: ineqAns(set),
        answerDisplay: `$${setTex(set)}$`,
        hints: ['Do the same thing to all three parts of a double inequality.', `${b >= 0 ? `Subtract ${b}` : `Add ${-b}`}, then divide all three parts by ${a}.`],
        solution: [`$${a * k1} ${lIn ? '\\le' : '<'} ${a}x ${rIn ? '\\le' : '<'} ${a * k2}$`, `$${setTex(set)}$`],
        misconceptions: keepSets([{ code: 'inverse-operation', set: [between(rat(a * k1 + 2 * b, a), rat(a * k2 + 2 * b, a), lIn, rIn)], feedback: `Undo $${term(b, '', true)}$ with the opposite operation in all three parts.` }], set),
      };
    }
    if (level === 4) {
      if (rng.chance(0.5)) {
        // Double inequality with a negative coefficient: both signs reverse.
        const k1 = rng.int(-6, 3);
        const k2 = rng.int(k1 + 1, k1 + 6);
        const a = rng.int(2, 4);
        const b = rng.int(-8, 8);
        const lIn = rng.chance(0.5);
        const rIn = rng.chance(0.5);
        // b - a·x runs from b - a·k2 (at x = k2) up to b - a·k1 (at x = k1).
        const set = [between(R(k1), R(k2), lIn, rIn)];
        const shown = `${b - a * k2} ${rIn ? '\\le' : '<'} ${sum([[b, ''], [-a, 'x']])} ${lIn ? '\\le' : '<'} ${b - a * k1}`;
        return {
          prompt: `Solve for $x$: $${shown}$.`,
          input: { kind: 'inequality', variable: 'x' },
          answer: ineqAns(set),
          answerDisplay: `$${setTex(set)}$`,
          hints: [`${b >= 0 ? `Subtract ${b}` : `Add ${-b}`} in all three parts.`, `Divide all three parts by $-${a}$: both signs reverse. Then rewrite it with the smaller number on the left.`],
          solution: [`$${-a * k2} ${rIn ? '\\le' : '<'} -${a}x ${lIn ? '\\le' : '<'} ${-a * k1}$`, `Divide by $-${a}$ (reverse both signs): $${k2} ${rIn ? '\\ge' : '>'} x ${lIn ? '\\ge' : '>'} ${k1}$`, `$${setTex(set)}$`],
          misconceptions: [],
        };
      }
      // Brackets: p(x - q) - r(x + s) op t, coefficient p - r may be negative.
      const p = rng.int(2, 6);
      const rr = rng.intExcept(1, 7, [p]);
      const q = rng.signed(1, 5);
      const s = rng.signed(1, 5);
      const t = rng.int(-12, 12);
      const op = rng.pick(OPS);
      const A = p - rr;
      const C = t + p * q + rr * s;
      const bound = rat(C, A);
      const finalOp = A < 0 ? flipOp[op] : op;
      const set = [ray(finalOp, bound)];
      return {
        prompt: `Solve for $x$: $${p}(${sum([[1, 'x'], [-q, '']])}) - ${rr}(${sum([[1, 'x'], [s, '']])}) ${opTex[op]} ${t}$.`,
        input: { kind: 'inequality', variable: 'x' },
        answer: ineqAns(set),
        answerDisplay: `$${setTex(set)}$`,
        hints: ['Expand both brackets. Watch the minus in front of the second bracket: it multiplies both terms.', A < 0 ? 'The $x$-coefficient is negative: dividing by it reverses the sign.' : 'Collect like terms and divide by the $x$-coefficient.'],
        solution: [
          `$${sum([[p, 'x'], [-p * q, ''], [-rr, 'x'], [-rr * s, '']])} ${opTex[op]} ${t}$`,
          ...(A === 1 ? [] : [`$${sum([[A, 'x']])} ${opTex[op]} ${C}$`]),
          `$${setTex(set)}$${A < 0 ? ' (sign reversed: divided by a negative)' : ''}`,
        ],
        misconceptions: keepSets([
          ...(A < 0 ? [{ code: 'inequality-flip' as MistakeCode, set: [ray(op, bound)], feedback: `You divided by $${A}$ but kept the sign. Dividing by a negative reverses it.` }] : []),
          { code: 'sign-error', set: [ray(A < 0 ? flipOp[op] : op, rat(t + p * q - rr * s, A))], feedback: `$-${rr}(x ${s < 0 ? '-' : '+'} ${Math.abs(s)})$: the minus multiplies both terms in the bracket.` },
        ], set),
      };
    }
    // Level 5: fractions. (px + q)/m - (rx + s)/n op k.
    let m = 0, n = 0, p = 0, r = 0, q = 0, s = 0, k = 0, A = 0;
    do {
      m = rng.pick([2, 3, 4, 5]);
      n = rng.intExcept(2, 6, [m]);
      p = rng.int(1, 4);
      r = rng.int(1, 4);
      q = rng.int(-6, 6);
      s = rng.int(-6, 6);
      k = rng.int(-3, 3);
      A = n * p - m * r;
    } while (A === 0 || Math.abs((k * m * n - n * q + m * s) / A) > 15);
    const op = rng.pick(OPS);
    const C = k * m * n - n * q + m * s;
    const bound = rat(C, A);
    const set = [ray(A < 0 ? flipOp[op] : op, bound)];
    const lhs = `\\dfrac{${sum([[p, 'x'], [q, '']])}}{${m}} - \\dfrac{${sum([[r, 'x'], [s, '']])}}{${n}}`;
    if (rng.chance(0.35)) {
      // Largest or smallest integer in the solution.
      const finalOp = A < 0 ? flipOp[op] : op;
      const upper = finalOp === '<' || finalOp === '≤';
      const b = bound.n / bound.d;
      // + 0 turns -0 into 0.
      const best = (upper ? (finalOp === '≤' ? Math.floor(b) : Math.ceil(b) - 1) : finalOp === '≥' ? Math.ceil(b) : Math.floor(b) + 1) + 0;
      return {
        prompt: `Find the ${upper ? 'largest' : 'smallest'} integer $x$ that satisfies $${lhs} ${opTex[op]} ${k}$.`,
        input: { kind: 'numeric', prefix: 'x =' },
        answer: exact(best),
        answerDisplay: `$${best}$ (the solution is $${setTex(set)}$)`,
        hints: [`Multiply every term by $${m * n}$ to clear the fractions. Put brackets around each numerator.`, 'Solve the linear inequality, then find the integer at the edge of the solution.'],
        solution: [`$${n}(${sum([[p, 'x'], [q, '']])}) - ${m}(${sum([[r, 'x'], [s, '']])}) ${opTex[op]} ${k * m * n}$ (×${m * n})`, `$${sum([[A, 'x']])} ${opTex[op]} ${C}$`, `$${setTex(set)}$, so the ${upper ? 'largest' : 'smallest'} integer is $${best}$.`],
        misconceptions: keepNum([
          { code: 'inequality-endpoint', answer: exact(upper ? best + 1 : best - 1), feedback: `Check that value in the inequality: ${upper ? 'it is just too big' : 'it is just too small'}. Mind whether the boundary is included.` },
        ], best),
      };
    }
    return {
      prompt: `Solve for $x$: $${lhs} ${opTex[op]} ${k}$.`,
      input: { kind: 'inequality', variable: 'x' },
      answer: ineqAns(set),
      answerDisplay: `$${setTex(set)}$`,
      hints: [`Multiply every term (including $${k}$) by $${m * n}$ to clear the fractions. Keep each numerator in brackets.`, 'Expand, collect like terms, and divide. Reverse the sign if you divide by a negative.'],
      solution: [`$${n}(${sum([[p, 'x'], [q, '']])}) - ${m}(${sum([[r, 'x'], [s, '']])}) ${opTex[op]} ${k * m * n}$`, `$${sum([[A, 'x']])} ${opTex[op]} ${C}$`, `$${setTex(set)}$`],
      misconceptions: keepSets([
        ...(A < 0 ? [{ code: 'inequality-flip' as MistakeCode, set: [ray(op, bound)], feedback: `You divided by $${A}$ but kept the sign. Dividing by a negative reverses it.` }] : []),
        { code: 'sign-error', set: [ray(A < 0 ? flipOp[op] : op, rat(k * m * n - n * q - m * s, A))], feedback: `$-${m}(${sum([[r, 'x'], [s, '']])})$: the minus multiplies every term in the second numerator.` },
        ...(k !== 0 ? [{ code: 'inverse-operation' as MistakeCode, set: [ray(A < 0 ? flipOp[op] : op, rat(k - n * q + m * s, A))], feedback: `Multiply every term by $${m * n}$, including the $${k}$ on the right.` }] : []),
      ], set),
    };
  },
};


// ---------------------------------------------------------------------------
// Quadratic inequalities

/** The solution of (x - a)(x - b) op 0 for a < b, with leading coefficient positive. */
const quadSet = (a: Rational, b: Rational, op: Op): Interval[] => (op === '<' || op === '≤' ? [between(a, b, op === '≤', op === '≤')] : outside(a, b, op === '≥'));
/** The classic slip: treat each factor like a linear inequality, "x op a or x op b". */
const perFactor = (a: Rational, b: Rational, op: Op): Interval[] => [ray(op, a), ray(op, b)];
const linTex = (d: number, n: number) => sum([[d, 'x'], [-n, '']]);

export const quadraticInequalities: QuestionTemplate = {
  id: 'quadratic-inequalities',
  skillId: 'quadratic-inequalities',
  generate(rng, level) {
    const op = rng.pick(OPS);
    if (level === 1 || level === 2) {
      const a = rng.int(-7, 5);
      const b = rng.int(a + 1, a + 8);
      const set = quadSet(R(a), R(b), op);
      const expanded = poly([1, -(a + b), a * b]);
      const shown = level === 1 ? `${fac(a)}${fac(b)}` : expanded;
      return {
        prompt: `Solve for $x$: $${shown} ${opTex[op]} 0$.`,
        input: { kind: 'inequality', variable: 'x' },
        answer: ineqAns(set),
        answerDisplay: showSet(set),
        hints: [level === 1 ? 'The critical values are where each factor is zero.' : 'Factorise first to find the critical values.', `The parabola $y = ${expanded}$ opens upwards: it is below the $x$-axis between its roots and above it outside them.`],
        solution: [
          ...(level === 2 ? [`$${fac(a)}${fac(b)} ${opTex[op]} 0$`] : []),
          `Critical values: $x = ${a}$ and $x = ${b}$.`,
          `The graph is ${op === '<' || op === '≤' ? 'below' : 'above'} the $x$-axis ${op === '<' || op === '≤' ? 'between' : 'outside'} the roots: ${showSet(set)}.`,
        ],
        misconceptions: keepSets([
          { code: 'quadratic-inequality', set: perFactor(R(a), R(b), op), feedback: 'You cannot solve each factor like a linear inequality. A product is negative when the factors have opposite signs: sketch the parabola and read off where it is above or below the axis.' },
          { code: 'quadratic-inequality', set: [point(R(a)), point(R(b))], feedback: 'Those are the critical values, where the expression equals 0. The inequality asks where it is above or below 0.' },
        ], set),
      };
    }
    if (level === 3) {
      const kind = rng.pick(['negative', 'rearrange', 'nonmonic'] as const);
      if (kind === 'nonmonic') {
        // (dx - n)(x - b) with a fractional root n/d.
        const d = rng.pick([2, 3]);
        let n = 0, b = 0;
        do {
          n = rng.signed(1, 7);
          b = rng.int(-5, 5);
        } while (n % d === 0 || n / d === b);
        const r1 = rat(n, d);
        const [lo, hi] = n / d < b ? [r1, R(b)] : [R(b), r1];
        const set = quadSet(lo, hi, op);
        return {
          prompt: `Solve for $x$: $${poly([d, -(n + d * b), n * b])} ${opTex[op]} 0$.`,
          input: { kind: 'inequality', variable: 'x' },
          answer: ineqAns(set),
          answerDisplay: showSet(set),
          hints: ['Factorise the trinomial to find the critical values.', 'The leading coefficient is positive, so the parabola opens upwards.'],
          solution: [`$(${linTex(d, n)})${fac(b)} ${opTex[op]} 0$`, `Critical values: $x = ${ratTex(r1)}$ and $x = ${b}$.`, showSet(set)],
          misconceptions: keepSets([
            { code: 'root-sign', set: quadSet(...sortR(rat(-n, d), R(-b)), op), feedback: '$(dx - n) = 0$ gives $x = \\frac{n}{d}$: check the signs of your critical values.' },
            { code: 'quadratic-inequality', set: [point(lo), point(hi)], feedback: 'Those are the critical values. The inequality asks where the expression is above or below 0.' },
          ], set),
        };
      }
      const a = rng.int(-6, 4);
      const b = rng.int(a + 1, a + 7);
      if (kind === 'negative') {
        // -(x - a)(x - b) op 0 ⇔ (x - a)(x - b) flip(op) 0.
        const set = quadSet(R(a), R(b), flipOp[op]);
        return {
          prompt: `Solve for $x$: $${poly([-1, a + b, -a * b])} ${opTex[op]} 0$.`,
          input: { kind: 'inequality', variable: 'x' },
          answer: ineqAns(set),
          answerDisplay: showSet(set),
          hints: ['Multiply both sides by $-1$ to make the $x^2$-coefficient positive. That reverses the inequality sign.', 'Then factorise and sketch.'],
          solution: [`Multiply by $-1$ and reverse the sign: $${poly([1, -(a + b), a * b])} ${opTex[flipOp[op]]} 0$`, `$${fac(a)}${fac(b)} ${opTex[flipOp[op]]} 0$`, showSet(set)],
          misconceptions: keepSets([
            { code: 'inequality-flip', set: quadSet(R(a), R(b), op), feedback: 'Multiplying by $-1$ reverses the inequality sign. (Or: this parabola opens downwards, so it is above the axis between its roots.)' },
            { code: 'quadratic-inequality', set: [point(R(a)), point(R(b))], feedback: 'Those are the critical values. The inequality asks where the expression is above or below 0.' },
          ], set),
        };
      }
      // Rearrange: x² op px + q, where x² - px - q = (x - a)(x - b).
      const set = quadSet(R(a), R(b), op);
      const p = a + b;
      const q = -a * b;
      return {
        prompt: `Solve for $x$: $x^{2} ${opTex[op]} ${sum([[p, 'x'], [q, '']]) || '0'}$.`,
        input: { kind: 'inequality', variable: 'x' },
        answer: ineqAns(set),
        answerDisplay: showSet(set),
        hints: ['Get 0 on one side first: you cannot factorise until one side is 0.', 'Then factorise, find the critical values and sketch.'],
        solution: [`$${poly([1, -p, -q])} ${opTex[op]} 0$`, `$${fac(a)}${fac(b)} ${opTex[op]} 0$`, showSet(set)],
        misconceptions: keepSets([
          { code: 'quadratic-inequality', set: [point(R(a)), point(R(b))], feedback: 'Those are the critical values. The inequality asks where the expression is above or below 0.' },
          { code: 'quadratic-inequality', set: perFactor(R(a), R(b), op), feedback: 'A product is not solved factor by factor. Sketch the parabola and read off where it is above or below the axis.' },
        ], set),
      };
    }
    if (level === 4) return graphReading(rng, op);
    // Level 5: perfect squares, positive definite quadratics, and the difference of two squares.
    const kind = rng.pick(['square', 'square', 'positive', 'dots'] as const);
    if (kind === 'square') {
      const a = rng.signed(1, 6);
      const set: Interval[] = op === '>' ? [ray('<', R(a)), ray('>', R(a))] : op === '≥' ? [ALL] : op === '≤' ? [point(R(a))] : [];
      if (!set.length) return quadraticInequalities.generate(rng, 5);
      const shown = rng.chance(0.5) ? `${fac(a)}^{2}` : poly([1, -2 * a, a * a]);
      return {
        prompt: `Solve for $x$: $${shown} ${opTex[op]} 0$.`,
        input: { kind: 'inequality', variable: 'x' },
        answer: ineqAns(set),
        answerDisplay: showSet(set),
        hints: [`$${poly([1, -2 * a, a * a])} = ${fac(a)}^{2}$: a square is never negative.`, `It is 0 only at $x = ${a}$ and positive everywhere else.`],
        solution: [`$${fac(a)}^{2} ${opTex[op]} 0$`, `A square is positive except at $x = ${a}$, where it is 0.`, `So ${showSet(set)}.`],
        misconceptions: keepSets([
          { code: 'quadratic-inequality', set: op === '>' ? [ray('>', R(a))] : op === '≥' ? [ray('≥', R(a))] : [ray('≤', R(a))], feedback: `$${fac(a)}^{2}$ is not a linear expression: it is a square, so it is never negative. Check a value on the other side of $${a}$.` },
        ], set),
      };
    }
    if (kind === 'positive') {
      // x² + bx + c with negative discriminant: always positive.
      let b = 0, c = 0;
      do {
        b = rng.int(-6, 6);
        c = rng.int(1, 12);
      } while (b * b - 4 * c >= 0);
      const always = op === '>' || op === '≥';
      if (!always) return quadraticInequalities.generate(rng, 5);
      const set = [ALL];
      return {
        prompt: `Solve for $x$: $${poly([1, b, c])} ${opTex[op]} 0$.`,
        input: { kind: 'inequality', variable: 'x' },
        answer: ineqAns(set),
        answerDisplay: showSet(set),
        hints: ['Try to find the critical values: work out the discriminant first.', `$\\Delta = ${b}^2 - 4(${c}) < 0$: the parabola never touches the $x$-axis. Which side of the axis is it on?`],
        solution: [`$\\Delta = ${b * b} - ${4 * c} = ${b * b - 4 * c} < 0$, so there are no critical values.`, 'The parabola opens upwards and never touches the $x$-axis, so it is always positive.', 'All real values of $x$ satisfy the inequality. Type: all real.'],
        misconceptions: [],
      };
    }
    // Difference of two squares: x² op k².
    const k = rng.int(1, 9);
    const set = quadSet(R(-k), R(k), op);
    return {
      prompt: `Solve for $x$: $x^{2} ${opTex[op]} ${k * k}$.`,
      input: { kind: 'inequality', variable: 'x' },
      answer: ineqAns(set),
      answerDisplay: showSet(set),
      hints: [`Get 0 on one side: $x^2 - ${k * k} ${opTex[op]} 0$, and factorise as a difference of squares.`, `Taking the square root of both sides loses the negative root: $x^2 = ${k * k}$ has two solutions.`],
      solution: [`$(x + ${k})(x - ${k}) ${opTex[op]} 0$`, `Critical values $x = -${k}$ and $x = ${k}$.`, showSet(set)],
      misconceptions: keepSets([
        { code: 'quadratic-inequality', set: [ray(op, R(k))], feedback: `Square-rooting both sides loses the negative solution. $x^2 = ${k * k}$ when $x = ${k}$ or $x = -${k}$.` },
      ], set),
    };
  },
};

/** The overlap of two intervals, or null when they don't overlap. */
function intersectIv(a: Interval, b: Interval): Interval | null {
  const v = (r: Rational) => r.n / r.d;
  const lo = a.lo === null ? b.lo : b.lo === null ? a.lo : v(a.lo) >= v(b.lo) ? a.lo : b.lo;
  const loIn = lo === null ? false : (a.lo === null || v(a.lo) !== v(lo) || a.loIn) && (b.lo === null || v(b.lo) !== v(lo) || b.loIn);
  const hi = a.hi === null ? b.hi : b.hi === null ? a.hi : v(a.hi) <= v(b.hi) ? a.hi : b.hi;
  const hiIn = hi === null ? false : (a.hi === null || v(a.hi) !== v(hi) || a.hiIn) && (b.hi === null || v(b.hi) !== v(hi) || b.hiIn);
  if (lo && hi && (v(lo) > v(hi) || (v(lo) === v(hi) && !(loIn && hiIn)))) return null;
  return { lo, hi, loIn, hiIn };
}

const sortR = (a: Rational, b: Rational): [Rational, Rational] => (a.n / a.d <= b.n / b.d ? [a, b] : [b, a]);

function graphReading(rng: Rng, op: Op): GeneratedQuestion {
  // f(x) = a(x - r1)(x - r2), possibly compared with a line g through the same two x-values.
  const r1 = rng.int(-5, 1);
  const r2 = rng.int(r1 + 2, Math.min(r1 + 7, 6));
  const a = rng.pick([1, -1, 1, -1, 2, -2]) / (r2 - r1 > 5 ? 2 : 1);
  const withLine = rng.chance(0.45);
  // With a line: g(x) = mx + c meets f at x = r1 and x = r2, so f - g = a(x - r1)(x - r2).
  const m = withLine ? rng.signed(1, 3) : 0;
  const c = withLine ? rng.int(-3, 3) : 0;
  const f = (x: number) => a * (x - r1) * (x - r2) + m * x + c;
  const xr: [number, number] = [r1 - 2.5, r2 + 2.5];
  const ys: number[] = [0];
  for (let x = r1 - 1; x <= r2 + 1; x += 0.25) ys.push(f(x));
  const clip: [number, number] = [Math.floor(Math.min(...ys) - 1), Math.ceil(Math.max(...ys) + 1)];
  const pts = withLine ? [{ x: r1, y: f(r1) }, { x: r2, y: f(r2) }] : [{ x: r1, y: 0 }, { x: r2, y: 0 }];
  const figure: Figure = {
    kind: 'graph',
    xRange: xr,
    yRange: clip,
    curves: [
      ...sample(f, xr[0], xr[1], clip).map((p, i) => ({ pts: p, label: i === 0 ? 'f' : '' })),
      ...(withLine ? sample((x) => m * x + c, xr[0], xr[1], clip).map((p, i) => ({ pts: p, label: i === 0 ? 'g' : '' })) : []),
    ],
    points: pts,
  };
  // f op g  ⇔  a(x - r1)(x - r2) op 0.
  const effOp = a > 0 ? op : flipOp[op];
  const set = quadSet(R(r1), R(r2), effOp);
  const ask = withLine ? `f(x) ${opTex[op]} g(x)` : `f(x) ${opTex[op]} 0`;
  return {
    prompt: withLine
      ? `The graph shows the parabola $f$ and the straight line $g$, which meet at the two points shown. For which values of $x$ is $${ask}$?`
      : `The graph shows the parabola $f$, which cuts the $x$-axis at the two points shown. For which values of $x$ is $${ask}$?`,
    figure,
    input: { kind: 'inequality', variable: 'x' },
    answer: ineqAns(set),
    answerDisplay: showSet(set),
    hints: [withLine ? 'Find where the graphs meet: those $x$-values are the critical values.' : 'The critical values are the $x$-intercepts of $f$.', withLine ? `$${ask}$ where the graph of $f$ is ${op === '<' || op === '≤' ? 'below' : 'above'} the line${strict(op) ? '' : ' (or touching it)'}.` : `$${ask}$ where the graph is ${op === '<' || op === '≤' ? 'below' : 'above'} the $x$-axis${strict(op) ? '' : ' (or on it)'}.`],
    solution: [
      withLine ? `The graphs meet at $x = ${r1}$ and $x = ${r2}$.` : `The $x$-intercepts are $x = ${r1}$ and $x = ${r2}$.`,
      `The parabola opens ${a > 0 ? 'upwards' : 'downwards'}, so it is ${(effOp === '<' || effOp === '≤') ? 'below' : 'above'} ${withLine ? 'the line' : 'the axis'} ${effOp === '<' || effOp === '≤' ? 'between' : 'outside'} those values.`,
      showSet(set),
    ],
    misconceptions: keepSets([
      { code: 'quadratic-inequality', set: quadSet(R(r1), R(r2), a > 0 ? flipOp[op] : op), feedback: `Look at the graph: between $x = ${r1}$ and $x = ${r2}$ the parabola is ${a > 0 ? 'below' : 'above'} ${withLine ? 'the line' : 'the axis'}.` },
    ], set),
  };
}

// ---------------------------------------------------------------------------
// Nature of roots: finding k

export const rootsParameter: QuestionTemplate = {
  id: 'roots-parameter',
  skillId: 'roots-parameter',
  generate(rng, level) {
    if (level === 1) {
      // A given root fixes k.
      const r = rng.signed(1, 5);
      const where = rng.pick(['b', 'c', 'a'] as const);
      let k = 0, eqTex = '', solve: string[] = [], wrong: number | null = null;
      if (where === 'b') {
        k = rng.signed(1, 9);
        const c = -r * r - k * r;
        eqTex = `x^{2} + kx ${term(c, '', false)} = 0`;
        solve = [`$(${r})^2 + k(${r}) ${term(c, '', false)} = 0$`, `$${r * r + c} ${r < 0 ? '-' : '+'} ${Math.abs(r) === 1 ? '' : Math.abs(r)}k = 0$, so $k = ${k}$.`];
        wrong = -((r * r + c) / -r);
      } else if (where === 'c') {
        const b = rng.signed(1, 9);
        k = -r * r - b * r;
        eqTex = `x^{2} ${term(b, 'x', false)} + k = 0`;
        solve = [`$(${r})^2 + ${b < 0 ? `(${b})` : b}(${r}) + k = 0$`, `$${r * r + b * r} + k = 0$, so $k = ${k}$.`];
        wrong = -(r * r - b * r);
      } else {
        // kx² + bx + c = 0: k = -(br + c)/r².
        const b = rng.signed(1, 9);
        k = rng.signed(1, 4);
        const c = -k * r * r - b * r;
        eqTex = `kx^{2} ${term(b, 'x', false)} ${term(c, '', false)} = 0`;
        solve = [`$k(${r})^2 + ${b < 0 ? `(${b})` : b}(${r}) ${term(c, '', false)} = 0$`, `$${r * r}k ${term(b * r + c, '', false)} = 0$, so $k = ${k}$.`];
        const w = -(-b * r + c) / (r * r);
        wrong = Number.isInteger(w) ? w : null;
      }
      return {
        prompt: `$x = ${r}$ is a root of $${eqTex}$. Find $k$.`,
        input: { kind: 'numeric', prefix: 'k =' },
        answer: exact(k),
        answerDisplay: `$k = ${k}$`,
        hints: ['A root makes the equation true.', `Substitute $x = ${r}$ and solve the equation for $k$.`],
        solution: solve,
        misconceptions: keepNum(wrong !== null && Number.isInteger(wrong) ? [{ code: 'root-sign', answer: exact(wrong), feedback: `You substituted $x = ${-r}$. The root is $x = ${r}$: put brackets around a negative when you substitute.` }] : [], k),
      };
    }
    if (level === 2) {
      // Equal roots: Δ = 0.
      const kind = rng.pick(['middle', 'shifted', 'lead', 'const'] as const);
      if (kind === 'middle' || kind === 'shifted') {
        const c = rng.int(1, 7);
        const p = kind === 'shifted' ? rng.signed(1, 4) : 0;
        // (k + p)² = 4c² → k = -p ± 2c.
        const roots = [R(-p - 2 * c), R(-p + 2 * c)];
        const kb = p === 0 ? 'k' : `k${term(p, '', false)}`;
        const coef = p === 0 ? 'kx' : `(${kb})x`;
        return {
          prompt: `For which value(s) of $k$ does $x^{2} + ${coef} + ${c * c} = 0$ have equal roots?`,
          input: { kind: 'roots', variable: 'k' },
          answer: rootsAns(roots),
          answerDisplay: `$k = ${ratTex(roots[0]!)}$ or $k = ${ratTex(roots[1]!)}$`,
          hints: ['Equal roots: the discriminant $\\Delta = b^2 - 4ac$ is 0.', `$b = ${kb}$, $a = 1$, $c = ${c * c}$. Remember: a square root gives two values.`],
          solution: [`$\\Delta = (${kb})^2 - 4(1)(${c * c}) = 0$`, `$(${kb})^2 = ${4 * c * c}$, so $${kb} = \\pm ${2 * c}$`, `$k = ${ratTex(roots[0]!)}$ or $k = ${ratTex(roots[1]!)}$`],
          misconceptions: keepRoots([
            { code: 'discriminant-condition', values: [roots[1]!], feedback: 'A square equal to a positive number gives two values: $\\pm$. You found only one.' },
            { code: 'discriminant-condition', values: [R(-p - c), R(-p + c)], feedback: `$\\Delta = b^2 - 4ac$: don't forget the 4. $(…)^2 = ${4 * c * c}$, not $${c * c}$.` },
          ], roots),
        };
      }
      if (kind === 'lead') {
        // kx² + bx + c = 0 with equal roots: k = b²/(4c).
        let b = 0, c = 0;
        do {
          b = rng.signed(1, 8);
          c = rng.signed(1, 6);
        } while ((b * b) % (4 * c) !== 0 && rng.chance(0.6));
        const k = rat(b * b, 4 * c);
        return {
          prompt: `For which value of $k$ does $kx^{2} ${term(b, 'x', false)} ${term(c, '', false)} = 0$ have equal roots?`,
          input: { kind: 'roots', variable: 'k' },
          answer: rootsAns([k]),
          answerDisplay: `$k = ${ratTex(k)}$`,
          hints: ['Equal roots: $\\Delta = b^2 - 4ac = 0$.', `Here $a = k$, $b = ${b}$ and $c = ${c}$.`],
          solution: [`$\\Delta = (${b})^2 - 4(k)(${c}) = ${b * b} ${term(-4 * c, 'k', false)} = 0$`, `$k = ${ratTex(k)}$`],
          misconceptions: keepRoots([{ code: 'discriminant-condition', values: [rat(-b * b, 4 * c)], feedback: `Check the sign: $${b * b} ${term(-4 * c, 'k', false)} = 0$ gives $k = ${ratTex(k)}$.` }], [k]),
        };
      }
      // x² + bx + k = 0: k = b²/4.
      const b = rng.signed(1, 9);
      const k = rat(b * b, 4);
      return {
        prompt: `For which value of $k$ does $x^{2} ${term(b, 'x', false)} + k = 0$ have equal roots?`,
        input: { kind: 'roots', variable: 'k' },
        answer: rootsAns([k]),
        answerDisplay: `$k = ${ratTex(k)}$`,
        hints: ['Equal roots: $\\Delta = b^2 - 4ac = 0$.', `Here $a = 1$, $b = ${b}$ and $c = k$.`],
        solution: [`$\\Delta = ${b * b} - 4k = 0$`, `$k = ${ratTex(k)}$`],
        misconceptions: keepRoots([{ code: 'discriminant-condition', values: [rat(b * b, 2)], feedback: '$\\Delta = b^2 - 4ac$: it is $4ac$, so divide by 4.' }], [k]),
      };
    }
    if (level === 3) {
      // k in the constant term: one boundary.
      const cond = rng.pick(['real', 'nonreal', 'unequal'] as const);
      const word = { real: 'real roots', nonreal: 'non-real roots', unequal: 'real and unequal roots' }[cond];
      if (rng.chance(0.5)) {
        // x² + bx + k = 0: Δ = b² - 4k.
        const b = rng.signed(1, 9);
        const bound = rat(b * b, 4);
        const op: Op = cond === 'real' ? '≤' : cond === 'nonreal' ? '>' : '<';
        const set = [ray(op, bound)];
        return {
          prompt: `For which values of $k$ does $x^{2} ${term(b, 'x', false)} + k = 0$ have ${word}?`,
          input: { kind: 'inequality', variable: 'k' },
          answer: ineqAns(set, 'k'),
          answerDisplay: `$${setTex(set, 'k')}$`,
          hints: [`${cond === 'real' ? 'Real roots: $\\Delta \\ge 0$.' : cond === 'nonreal' ? 'Non-real roots: $\\Delta < 0$.' : 'Real and unequal roots: $\\Delta > 0$.'}`, `$\\Delta = (${b})^2 - 4(1)(k) = ${b * b} - 4k$. Solve the inequality for $k$; dividing by $-4$ reverses the sign.`],
          solution: [`$\\Delta = ${b * b} - 4k$`, `$${b * b} - 4k ${cond === 'real' ? '\\ge' : cond === 'nonreal' ? '<' : '>'} 0$`, `$${setTex(set, 'k')}$`],
          misconceptions: keepSets([
            { code: 'inequality-flip', set: [ray(flipOp[op], bound)].map((iv) => ({ ...iv, loIn: iv.lo !== null && !strict(op), hiIn: iv.hi !== null && !strict(op) })), feedback: 'You divided by $-4$ but kept the sign. Dividing by a negative reverses it.' },
            { code: 'discriminant-condition', set: [ray(op === '≤' ? '≥' : op === '>' ? '<' : '>', rat(-b * b, 4))], feedback: `$\\Delta = b^2 - 4ac = ${b * b} - 4k$: check the signs.` },
          ], set, 'k'),
        };
      }
      // (x - p)(x - q) = k: Δ = (p - q)² + 4k.
      const p = rng.int(-6, 6);
      const q = rng.intExcept(-6, 6, [p]);
      const bound = rat(-((p - q) ** 2), 4);
      const op: Op = cond === 'real' ? '≥' : cond === 'nonreal' ? '<' : '>';
      const set = [ray(op, bound)];
      return {
        prompt: `For which values of $k$ does $${fac(p)}${fac(q)} = k$ have ${word}?`,
        input: { kind: 'inequality', variable: 'k' },
        answer: ineqAns(set, 'k'),
        answerDisplay: `$${setTex(set, 'k')}$`,
        hints: ['Expand and get 0 on one side, so you can read off $a$, $b$ and $c$. Here $c$ includes $-k$.', `${cond === 'real' ? 'Real roots: $\\Delta \\ge 0$.' : cond === 'nonreal' ? 'Non-real roots: $\\Delta < 0$.' : 'Real and unequal roots: $\\Delta > 0$.'}`],
        solution: [`$${poly([1, -(p + q), p * q])} - k = 0$`, `$\\Delta = (${-(p + q)})^2 - 4(1)(${p * q} - k) = ${(p - q) ** 2} + 4k$`, `$${(p - q) ** 2} + 4k ${cond === 'real' ? '\\ge' : cond === 'nonreal' ? '<' : '>'} 0$, so $${setTex(set, 'k')}$`],
        misconceptions: keepSets([
          { code: 'discriminant-condition', set: [ray(op === '≥' ? '≤' : op === '<' ? '>' : '<', rat((p - q) ** 2, 4))], feedback: 'With $c = pq - k$, the term $-4ac$ gives $+4k$. Check the sign of $k$.' },
        ], set, 'k'),
      };
    }
    if (level === 4) {
      // k in the middle coefficient: x² + kx + c² = 0, Δ = k² - 4c².
      const c = rng.int(1, 7);
      const cond = rng.pick(['real', 'nonreal', 'unequal'] as const);
      const word = { real: 'real roots', nonreal: 'non-real roots', unequal: 'real and unequal roots' }[cond];
      const lead = rng.pick([1, 1, 4]);
      const C = (c * c) / lead;
      if (!Number.isInteger(C)) return rootsParameter.generate(rng, 4);
      // Δ = k² - 4·lead·C = k² - 4c².
      const set = cond === 'nonreal' ? [between(R(-2 * c), R(2 * c), false, false)] : outside(R(-2 * c), R(2 * c), cond === 'real');
      return {
        prompt: `For which values of $k$ does $${lead === 1 ? '' : lead}x^{2} + kx + ${C} = 0$ have ${word}?`,
        input: { kind: 'inequality', variable: 'k' },
        answer: ineqAns(set, 'k'),
        answerDisplay: `$${setTex(set, 'k')}$`,
        hints: [`$\\Delta = k^2 - 4(${lead})(${C}) = k^2 - ${4 * c * c}$.`, 'This is a quadratic inequality in $k$: factorise $k^2 - ' + 4 * c * c + '$ and sketch it.'],
        solution: [`$\\Delta = k^2 - ${4 * c * c} = (k + ${2 * c})(k - ${2 * c})$`, `$(k + ${2 * c})(k - ${2 * c}) ${cond === 'real' ? '\\ge' : cond === 'nonreal' ? '<' : '>'} 0$`, `$${setTex(set, 'k')}$`],
        misconceptions: keepSets([
          { code: 'discriminant-condition', set: cond === 'nonreal' ? [ray('<', R(2 * c))] : [ray(cond === 'real' ? '≥' : '>', R(2 * c))], feedback: `$k^2 ${cond === 'nonreal' ? '<' : '>'} ${4 * c * c}$ has two boundaries, $k = \\pm ${2 * c}$. Square-rooting loses the negative one.` },
        ], set, 'k'),
      };
    }
    // Level 5: k as the leading coefficient, so k ≠ 0 for a quadratic.
    const b = rng.signed(1, 8);
    const c = rng.signed(1, 6);
    const cond = rng.pick(['real', 'nonreal'] as const);
    const bound = rat(b * b, 4 * c);
    // Δ = b² - 4kc. Real: -4c·k ≥ -b².
    const op: Op = cond === 'real' ? (c > 0 ? '≤' : '≥') : c > 0 ? '>' : '<';
    const before = [ray(op, bound)];
    // Real roots always include k = 0 here (Δ = b² > 0 there), which is not a quadratic: take it out.
    const containsZero = contains(before, 0);
    const set = containsZero ? [ray('<', R(0)), ray('>', R(0))].flatMap((half) => before.map((iv) => intersectIv(iv, half))).filter((iv): iv is Interval => iv !== null) : before;
    return {
      prompt: `The quadratic equation $kx^{2} ${term(b, 'x', false)} ${term(c, '', false)} = 0$ has ${cond === 'real' ? 'real' : 'non-real'} roots. Find the possible values of $k$.`,
      input: { kind: 'inequality', variable: 'k' },
      answer: ineqAns(set, 'k'),
      answerDisplay: `$${setTex(set, 'k')}$`,
      hints: [`$\\Delta = (${b})^2 - 4(k)(${c}) = ${b * b} ${term(-4 * c, 'k', false)}$. ${cond === 'real' ? 'Real roots: $\\Delta \\ge 0$.' : 'Non-real roots: $\\Delta < 0$.'}`, `Dividing by $${-4 * c}$${c > 0 ? ' (negative) reverses the sign' : ''}.${containsZero ? ' And it is a quadratic equation, so $k \\ne 0$.' : ''}`],
      solution: [
        `$${b * b} ${term(-4 * c, 'k', false)} ${cond === 'real' ? '\\ge' : '<'} 0$`,
        `$${setTex(before, 'k')}$`,
        ...(containsZero ? [`$k \\ne 0$, or the $x^2$-term disappears: $${setTex(set, 'k')}$`] : []),
      ],
      misconceptions: keepSets([
        ...(containsZero ? [{ code: 'discriminant-condition' as MistakeCode, set: before, feedback: 'If $k = 0$ the equation is not quadratic any more (it becomes linear), so exclude $k = 0$.' }] : []),
        { code: 'inequality-flip', set: [ray(flipOp[op], bound)].map((iv) => ({ ...iv, loIn: iv.lo !== null && !strict(op), hiIn: iv.hi !== null && !strict(op) })), feedback: `Dividing by $${-4 * c}$${c > 0 ? ', a negative number, reverses the sign' : ''}. Check the direction.` },
      ], set, 'k'),
    };
  },
};

