/**
 * Completing the square (Grade 11) and real numbers (Grade 10): rational and irrational numbers, surds
 * between integers, rounding (including rounding that suits a real situation) and recurring decimals as
 * fractions. Every question is built from its answer.
 */
import type { QuestionTemplate, Misconception, AnswerSpec, GeneratedQuestion } from '../types.ts';
import type { MistakeCode } from '../mistakes.ts';
import type { Rng } from '../rng.ts';
import { sum, sumPlain } from '../tex.ts';
import { rat, type Rational } from '../rational.ts';
import { extract } from '../surd.ts';
import { expressionsEquivalent } from '../expr.ts';
import { choice, exact, keepNum } from './kit.ts';

// ---- Completing the square -------------------------------------------------

const quad = (a: number, b: number, c: number): [number, string][] => [
  [a, 'x^2'],
  [b, 'x'],
  [c, ''],
];
const lin = (h: number): [number, string][] => [
  [1, 'x'],
  [h, ''],
];
/** a(x + h)² + q as text a learner could type. */
const squareText = (a: number, h: number, q: number) => `${a === 1 ? '' : a === -1 ? '-' : a}(${sumPlain(lin(h))})^2${q === 0 ? '' : q > 0 ? `+${q}` : q}`;
const squareTex = (a: number, h: number, q: number) => `${a === 1 ? '' : a === -1 ? '-' : a}(${sum(lin(h))})^2${q === 0 ? '' : q > 0 ? ` + ${q}` : ` - ${-q}`}`;

const expr = (e: string, form?: 'completed-square'): AnswerSpec => (form ? { kind: 'expression', expr: e, form } : { kind: 'expression', expr: e });

function keepExpr(ms: Misconception[], correct: string): Misconception[] {
  const out: Misconception[] = [];
  for (const m of ms) {
    if (m.answer.kind !== 'expression') continue;
    if (expressionsEquivalent(m.answer.expr, correct)) continue;
    if (out.some((o) => o.answer.kind === 'expression' && m.answer.kind === 'expression' && expressionsEquivalent(o.answer.expr, m.answer.expr))) continue;
    out.push(m);
  }
  return out;
}

type Term = { r: number; n: number; d: number };
/** The two roots c ± k√s / den, exactly (s = 1 for rational roots). */
function pmRoots(c: Rational, k: number, s: number, den: number): Term[][] {
  const g = (a: number, b: number): number => (b === 0 ? Math.abs(a) : g(b, a % b));
  const part = (sign: number): Term[] => {
    if (s === 1) {
      const v = rat(c.n * den + sign * k * c.d, c.d * den);
      return [{ r: 1, n: v.n, d: v.d }];
    }
    const kk = g(k, den);
    return [...(c.n === 0 ? [] : [{ r: 1, n: c.n, d: c.d }]), { r: s, n: (sign * k) / kk, d: den / kk }];
  };
  return [part(1), part(-1)];
}
const rootsSpec = (roots: Term[][], requireSimplest = true): AnswerSpec => ({ kind: 'roots', values: [], surds: roots, requireSimplest });
const ratRoots = (vals: number[]): AnswerSpec => ({ kind: 'roots', values: vals.map((v) => ({ n: v, d: 1 })) });

/** "−3 ± 2√5", "\dfrac{-3 \pm \sqrt{13}}{2}" */
function pmTex(c: Rational, k: number, s: number, den: number): string {
  const root = s === 1 ? String(k) : `${k === 1 ? '' : k}\\sqrt{${s}}`;
  if (den === 1) return `${c.n === 0 ? '' : `${c.n} `}\\pm ${root}`;
  const top = c.n === 0 ? `\\pm ${root}` : `${(c.n * den) / c.d} \\pm ${root}`;
  return `\\dfrac{${top}}{${den}}`;
}

const NONSQUARE = [2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 23, 24, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 50];

export const completingSquare: QuestionTemplate = {
  id: 'completing-square',
  skillId: 'completing-square',
  generate(rng, level) {
    const hints = ['Halve the coefficient of $x$ and square it.', 'Add and subtract that square, so the first three terms make a perfect square $(x + p)^2$.'];

    if (level === 1) {
      // x² + 2hx + c = (x + h)² + (c − h²)
      const h = rng.signed(1, 7);
      const c = rng.intExcept(-15, 15, [h * h]);
      const q = c - h * h;
      const ans = squareText(1, h, q);
      return {
        prompt: `Write $${sum(quad(1, 2 * h, c))}$ in the form $(x + p)^2 + q$.`,
        input: { kind: 'expression', variables: ['x'], placeholder: 'e.g. 2(x - 4)^2 - 11' },
        answer: expr(ans, 'completed-square'),
        answerDisplay: `$${squareTex(1, h, q)}$`,
        hints,
        solution: [
          `Half of $${2 * h}$ is $${h}$, and $${h < 0 ? `(${h})` : h}^2 = ${h * h}$.`,
          `$${sum(quad(1, 2 * h, 0))} ${c < 0 ? '-' : '+'} ${Math.abs(c)} = (${sum(quad(1, 2 * h, h * h))}) - ${h * h} ${c < 0 ? '-' : '+'} ${Math.abs(c)}$`,
          `$= ${squareTex(1, h, q)}$`,
        ],
        misconceptions: keepExpr(
          [
            { code: 'complete-square', answer: expr(squareText(1, h, c + h * h)), feedback: `You added $${h * h}$ to make the square, so subtract it again: $${c} - ${h * h} = ${q}$.` },
            { code: 'complete-square', answer: expr(squareText(1, 2 * h, c - 4 * h * h)), feedback: `Use **half** the coefficient of $x$: $(x ${h < 0 ? '-' : '+'} ${Math.abs(h)})^2$, not $(x ${h < 0 ? '-' : '+'} ${Math.abs(2 * h)})^2$.` },
            { code: 'complete-square', answer: expr(squareText(1, -h, q)), feedback: `$(x ${h < 0 ? '+' : '-'} ${Math.abs(h)})^2$ expands to $x^2 ${h < 0 ? '+' : '-'} ${Math.abs(2 * h)}x + ${h * h}$. Check the sign in the bracket.` },
          ],
          ans,
        ),
      };
    }

    if (level === 2) {
      // (x + h)² = m², whole-number roots −h ± m
      const h = rng.signed(1, 6);
      const m = rng.int(1, 7);
      const c = h * h - m * m;
      const roots = [-h + m, -h - m];
      const rhs = rng.chance(0.4);
      const lhsTex = rhs ? sum(quad(1, 2 * h, 0)) : sum(quad(1, 2 * h, c));
      const prompt = rhs ? `$${lhsTex} = ${-c}$` : `$${lhsTex} = 0$`;
      return {
        prompt: `Solve by completing the square: ${prompt}`,
        input: { kind: 'roots', variable: 'x' },
        answer: ratRoots(roots),
        answerDisplay: `$x = ${roots[0]}$ or $x = ${roots[1]}$`,
        hints: [...hints, 'Then take the square root of both sides: remember $\\pm$.'],
        solution: [
          `$${sum(quad(1, 2 * h, 0))} = ${-c}$`,
          `Add $${h * h}$ to both sides: $(${sum(lin(h))})^2 = ${-c} + ${h * h} = ${m * m}$`,
          `$${sum(lin(h))} = \\pm ${m}$, so $x = ${-h} \\pm ${m}$`,
          `$x = ${roots[0]}$ or $x = ${roots[1]}$`,
        ],
        misconceptions: [{ code: 'root-sign', answer: ratRoots([h + m, h - m]), feedback: `$${sum(lin(h))} = \\pm ${m}$ gives $x = ${-h} \\pm ${m}$: move the ${h} to the other side and its sign changes.` }],
      };
    }

    if (level === 3) {
      // (x + h)² = k, k not a square: x = −h ± a√s
      const h = rng.signed(1, 7);
      const k = rng.pick(NONSQUARE);
      const c = h * h - k;
      const { k: a, s } = extract(k);
      const roots = pmRoots(rat(-h), a, s, 1);
      const wrongK = h * h + c === k ? null : c + h * h;
      const ms: Misconception[] = [{ code: 'root-sign', answer: rootsSpec(pmRoots(rat(h), a, s, 1), false), feedback: `$${sum(lin(h))} = \\pm\\sqrt{${k}}$, so $x = ${-h} \\pm \\sqrt{${k}}$: the ${h} changes sign when it moves.` }];
      if (wrongK !== null && wrongK > 0 && !Number.isInteger(Math.sqrt(wrongK))) {
        const w = extract(wrongK);
        ms.push({ code: 'complete-square', answer: rootsSpec(pmRoots(rat(-h), w.k, w.s, 1), false), feedback: `Move the constant first: $(${sum(lin(h))})^2 = ${-c} + ${h * h} = ${k}$.` });
      }
      return {
        prompt: `Solve by completing the square, leaving your answers in simplest surd form: $${sum(quad(1, 2 * h, c))} = 0$`,
        input: { kind: 'roots', variable: 'x', surds: true },
        answer: rootsSpec(roots),
        answerDisplay: `$x = ${pmTex(rat(-h), a, s, 1)}$`,
        hints: [...hints, `You should reach $(${sum(lin(h))})^2 = ${k}$. Take the square root of both sides, with $\\pm$.`],
        solution: [
          `$${sum(quad(1, 2 * h, 0))} = ${-c}$`,
          `$(${sum(lin(h))})^2 = ${-c} + ${h * h} = ${k}$`,
          `$${sum(lin(h))} = \\pm\\sqrt{${k}}$${a > 1 ? ` $= \\pm ${a}\\sqrt{${s}}$` : ''}`,
          `$x = ${pmTex(rat(-h), a, s, 1)}$`,
        ],
        misconceptions: ms,
      };
    }

    if (level === 4) {
      if (rng.chance(0.5)) {
        // odd b: (x + b/2)² = D/4, x = (−b ± √D)/2
        let b = 0;
        let c = 0;
        let D = 0;
        do {
          b = rng.pick([-9, -7, -5, -3, -1, 1, 3, 5, 7, 9]);
          c = rng.int(-12, 6);
          D = b * b - 4 * c;
        } while (D <= 0 || Number.isInteger(Math.sqrt(D)) || c === 0);
        const { k: a, s } = extract(D);
        const roots = pmRoots(rat(-b, 2), a, s, 2);
        return {
          prompt: `Solve by completing the square, leaving your answers in simplest surd form: $${sum(quad(1, b, c))} = 0$`,
          input: { kind: 'roots', variable: 'x', surds: true },
          answer: rootsSpec(roots),
          answerDisplay: `$x = ${pmTex(rat(-b, 2), a, s, 2)}$`,
          hints: [...hints, `Half of $${b}$ is $\\tfrac{${b}}{2}$, and its square is $\\tfrac{${b * b}}{4}$. Fractions are fine.`],
          solution: [
            `$x^2 ${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}x = ${-c}$`,
            `$\\left(x ${b < 0 ? '-' : '+'} \\tfrac{${Math.abs(b)}}{2}\\right)^2 = ${-c} + \\tfrac{${b * b}}{4} = \\tfrac{${D}}{4}$`,
            `$x ${b < 0 ? '-' : '+'} \\tfrac{${Math.abs(b)}}{2} = \\pm \\dfrac{\\sqrt{${D}}}{2}$`,
            `$x = ${pmTex(rat(-b, 2), a, s, 2)}$`,
          ],
          misconceptions: [{ code: 'root-sign', answer: rootsSpec(pmRoots(rat(b, 2), a, s, 2), false), feedback: `$x ${b < 0 ? '-' : '+'} \\tfrac{${Math.abs(b)}}{2} = \\pm\\dfrac{\\sqrt{${D}}}{2}$, so $x = ${b < 0 ? '' : '-'}\\tfrac{${Math.abs(b)}}{2} \\pm \\dfrac{\\sqrt{${D}}}{2}$: the sign changes when the number moves across.` }],
        };
      }
      // a(x + h)² = m with a = 2 or 3: x = −h ± √(m/a) = −h ± √(ma)/a
      const A = rng.pick([2, 3]);
      const h = rng.signed(1, 5);
      let m = 0;
      do m = rng.int(1, 12);
      while (Number.isInteger(Math.sqrt(m * A)) || Number.isInteger(Math.sqrt(m)));
      const c = A * h * h - m;
      const { k: a, s } = extract(m * A);
      const roots = pmRoots(rat(-h), a, s, A);
      const w = extract(m);
      return {
        prompt: `Solve by completing the square, leaving your answers in simplest surd form: $${sum(quad(A, 2 * A * h, c))} = 0$`,
        input: { kind: 'roots', variable: 'x', surds: true },
        answer: rootsSpec(roots),
        answerDisplay: `$x = ${pmTex(rat(-h), a, s, A)}$`,
        hints: [`Divide every term by ${A} first, so the coefficient of $x^2$ is 1.`, ...hints],
        solution: [
          `Divide by ${A}: $${sum(quad(1, 2 * h, 0))} = \\dfrac{${-c}}{${A}}$`,
          `$(${sum(lin(h))})^2 = \\dfrac{${-c}}{${A}} + ${h * h} = \\dfrac{${m}}{${A}}$`,
          `$${sum(lin(h))} = \\pm\\sqrt{\\dfrac{${m}}{${A}}} = \\pm\\dfrac{\\sqrt{${m * A}}}{${A}}$ (rationalise)`,
          `$x = ${pmTex(rat(-h), a, s, A)}$`,
        ],
        misconceptions: [{ code: 'complete-square', answer: rootsSpec(pmRoots(rat(-h), w.k, w.s, 1), false), feedback: `You divided the $x$ terms by ${A} but not the constant. Divide **every** term by ${A}: $(${sum(lin(h))})^2 = \\tfrac{${m}}{${A}}$.` }],
      };
    }

    // Level 5: a(x + p)² + q, or the turning point
    if (rng.chance(0.5)) {
      const A = rng.pick([2, 3, -1, -2]);
      const h = rng.signed(1, 5);
      const c = rng.intExcept(-12, 12, [A * h * h]);
      const q = c - A * h * h;
      const ans = squareText(A, h, q);
      return {
        prompt: `Write $${sum(quad(A, 2 * A * h, c))}$ in the form $a(x + p)^2 + q$.`,
        input: { kind: 'expression', variables: ['x'], placeholder: 'e.g. 2(x - 4)^2 - 11' },
        answer: expr(ans, 'completed-square'),
        answerDisplay: `$${squareTex(A, h, q)}$`,
        hints: [`Take out ${A} from the $x$ terms: $${A}(${sum(quad(1, 2 * h, 0))}) ${c < 0 ? '-' : '+'} ${Math.abs(c)}$.`, 'Complete the square inside the bracket. What you subtract inside is multiplied by $a$ when it comes out.'],
        solution: [
          `$= ${A}(${sum(quad(1, 2 * h, 0))}) ${c < 0 ? '-' : '+'} ${Math.abs(c)}$`,
          `$= ${A}\\left[(${sum(lin(h))})^2 - ${h * h}\\right] ${c < 0 ? '-' : '+'} ${Math.abs(c)}$`,
          `$= ${squareTex(A, h, 0)} ${A * h * h < 0 ? '+' : '-'} ${Math.abs(A * h * h)} ${c < 0 ? '-' : '+'} ${Math.abs(c)} = ${squareTex(A, h, q)}$`,
        ],
        misconceptions: keepExpr([{ code: 'complete-square', answer: expr(squareText(A, h, c - h * h)), feedback: `The $${h * h}$ you subtract is inside the bracket, so it comes out multiplied by ${A}: $${A} \\times ${h * h} = ${A * h * h}$.` }], ans),
      };
    }
    const h = rng.signed(1, 6);
    const c = rng.int(-10, 15);
    const q = c - h * h;
    return {
      prompt: `By completing the square, find the turning point of $y = ${sum(quad(1, 2 * h, c))}$.`,
      input: { kind: 'point', name: 'T' },
      answer: { kind: 'point', x: { n: -h, d: 1 }, y: { n: q, d: 1 } },
      answerDisplay: `$T(${-h}; ${q})$`,
      hints: [...hints, '$y = (x + p)^2 + q$ has its turning point at $(-p; q)$.'],
      solution: [`$y = ${squareTex(1, h, q)}$`, `$(${sum(lin(h))})^2 \\ge 0$, and it is $0$ when $x = ${-h}$, so the smallest value of $y$ is $${q}$.`, `Turning point: $(${-h}; ${q})$`],
      misconceptions: [{ code: 'complete-square', answer: { kind: 'point', x: { n: h, d: 1 }, y: { n: q, d: 1 } }, feedback: `$(${sum(lin(h))})^2$ is $0$ when $x = ${-h}$, not $${h}$.` }],
    };
  },
};

// ---- Real numbers ------------------------------------------------------------

interface Classify {
  tex: string;
  rational: boolean;
  why: string;
}

function classifyItem(rng: Rng): Classify {
  const kind = rng.pick(['root', 'root', 'fraction', 'decimal', 'recurring', 'pi', 'product', 'pattern', 'mixed']);
  if (kind === 'root') {
    const sq = rng.chance(0.4);
    const n = sq ? rng.int(2, 15) ** 2 : rng.pick(NONSQUARE);
    return sq
      ? { tex: `\\sqrt{${n}}`, rational: true, why: `$\\sqrt{${n}} = ${Math.sqrt(n)}$, a whole number, so it is rational.` }
      : { tex: `\\sqrt{${n}}`, rational: false, why: `${n} is not a perfect square, so $\\sqrt{${n}}$ is a non-terminating, non-recurring decimal: irrational.` };
  }
  if (kind === 'fraction') {
    const a = rng.int(1, 30);
    const b = rng.intExcept(2, 13, [a]);
    const neg = rng.chance(0.4);
    return { tex: `${neg ? '-' : ''}\\dfrac{${a}}{${b}}`, rational: true, why: 'It is already a fraction of two integers (with a non-zero bottom), so it is rational.' };
  }
  if (kind === 'decimal') {
    const v = rng.pick(['3{,}14', '0{,}125', '2{,}75', '-1{,}6', '4{,}0625', '1{,}414']);
    return { tex: v, rational: true, why: `A decimal that stops can be written as a fraction (for example $${v} = \\dfrac{${v.replace('{,}', '').replace('-', '')}}{${10 ** (v.split('{,}')[1]?.length ?? 0)}}$${v.startsWith('-') ? ' with a minus sign' : ''}), so it is rational. Even $3{,}14$ is rational: it is close to $\\pi$, but it is not $\\pi$.` };
  }
  if (kind === 'recurring') {
    const d = rng.int(1, 9);
    const two = rng.chance(0.5) ? rng.int(1, 9) : null;
    return { tex: two === null ? `0{,}\\dot{${d}}` : `0{,}\\dot{${d}}\\dot{${two}}`, rational: true, why: 'A recurring decimal can always be written as a fraction (for example $0{,}\\dot{3} = \\tfrac{1}{3}$), so it is rational.' };
  }
  if (kind === 'pi') {
    const k = rng.int(1, 5);
    return rng.chance(0.5)
      ? { tex: k === 1 ? '\\pi' : `${k}\\pi`, rational: false, why: '$\\pi$ is irrational, and a non-zero whole number times an irrational number is still irrational.' }
      : { tex: '\\dfrac{22}{7}', rational: true, why: '$\\tfrac{22}{7}$ is only an approximation of $\\pi$. It is a fraction of two integers, so it is rational.' };
  }
  if (kind === 'product') {
    const s = rng.pick([2, 3, 5, 7]);
    const k = rng.int(2, 4);
    return rng.chance(0.6)
      ? { tex: `\\sqrt{${s}} \\times \\sqrt{${s * k * k}}`, rational: true, why: `Simplify first: $\\sqrt{${s}} \\times \\sqrt{${s * k * k}} = \\sqrt{${s * s * k * k}} = ${s * k}$, a whole number.` }
      : { tex: `${k}\\sqrt{${s}}`, rational: false, why: `$\\sqrt{${s}}$ is irrational, and ${k} times an irrational number is irrational.` };
  }
  if (kind === 'pattern') {
    const d = rng.int(1, 9);
    return { tex: `0{,}${d}0${d}00${d}000${d}\\ldots`, rational: false, why: 'The pattern never settles into a block that repeats (the zeros keep growing), so the decimal is non-terminating and non-recurring: irrational.' };
  }
  const a = rng.int(1, 6);
  const s = rng.pick([2, 3, 5]);
  return { tex: `${a} + \\sqrt{${s}}`, rational: false, why: `A rational number plus an irrational number is irrational: $\\sqrt{${s}}$ never ends or repeats.` };
}

/** The lower of the two consecutive integers a root lies between. */
const floorRoot = (n: number, idx: 2 | 3) => Math.floor(idx === 2 ? Math.sqrt(n) : Math.cbrt(n) + 1e-12);

const fmt = (v: number, dp: number) => v.toFixed(dp).replace('.', '{,}');
const plainNum = (v: number, dp: number) => v.toFixed(dp).replace('.', ',');

function q(rng: Rng, base: Omit<GeneratedQuestion, 'misconceptions'> & { wrong?: { code: MistakeCode; value: number; feedback: string }[]; value: number }): GeneratedQuestion {
  const { wrong = [], value, ...rest } = base;
  return { ...rest, misconceptions: keepNum(wrong.map((w) => ({ code: w.code, answer: exact(w.value), feedback: w.feedback })), value) };
}

export const realNumbers: QuestionTemplate = {
  id: 'real-numbers',
  skillId: 'real-numbers',
  generate(rng, level) {
    if (level === 1) {
      const item = classifyItem(rng);
      const opts = [
        { id: 'rational', text: 'Rational' },
        { id: 'irrational', text: 'Irrational' },
      ];
      const right = item.rational ? opts[0]! : opts[1]!;
      const wrongOpt = item.rational ? opts[1]! : opts[0]!;
      return choice(rng, {
        prompt: `Is $${item.tex}$ rational or irrational?`,
        correct: right,
        distractors: [{ ...wrongOpt, feedback: item.why }],
        keepOrder: opts,
        code: 'rational-irrational',
        hints: ['A rational number can be written as $\\tfrac{a}{b}$ with $a$ and $b$ integers ($b \\ne 0$). Its decimal either stops or repeats.', 'Simplify first if you can.'],
        solution: [item.why],
      });
    }

    if (level === 2) {
      const idx: 2 | 3 = rng.chance(0.65) ? 2 : 3;
      let n = 0;
      do n = idx === 2 ? rng.int(5, 200) : rng.int(10, 400);
      while (idx === 2 ? Number.isInteger(Math.sqrt(n)) : Number.isInteger(Math.round(Math.cbrt(n))) && Math.round(Math.cbrt(n)) ** 3 === n);
      const neg = idx === 2 && rng.chance(0.3);
      const lo0 = floorRoot(n, idx);
      const lo = neg ? -(lo0 + 1) : lo0;
      const pow = (a: number) => (idx === 2 ? a * a : a ** 3);
      const tex = `${neg ? '-' : ''}${idx === 2 ? `\\sqrt{${n}}` : `\\sqrt[3]{${n}}`}`;
      const opt = (a: number) => ({ id: `p${a}`, text: `$${a}$ and $${a + 1}$` });
      const options = [lo - 1, lo, lo + 1];
      return choice(rng, {
        prompt: `Between which two consecutive integers does $${tex}$ lie?`,
        correct: opt(lo),
        distractors: options
          .filter((a) => a !== lo)
          .map((a) => ({ ...opt(a), feedback: neg ? `$${tex}$ is negative. First place $${tex.slice(1)}$ between $${lo0}$ and $${lo0 + 1}$, then the minus sign flips it: between $${-(lo0 + 1)}$ and $${-lo0}$.` : `$${a}^${idx} = ${pow(a)}$ and $${a + 1}^${idx} = ${pow(a + 1)}$, so $${tex}$ is not between them.` })),
        keepOrder: options.map(opt),
        code: 'surd-simplify',
        hints: [idx === 2 ? 'Find the perfect squares just below and just above the number under the root.' : 'Find the perfect cubes just below and just above the number under the root.', ...(neg ? ['A minus sign in front reverses the order: $-5 < -4$.'] : [])],
        solution: [`$${lo0}^${idx} = ${pow(lo0)} < ${n} < ${pow(lo0 + 1)} = ${lo0 + 1}^${idx}$, so $${lo0} < ${tex.replace(/^-/, '')} < ${lo0 + 1}$.`, ...(neg ? [`So $${-(lo0 + 1)} < ${tex} < ${-lo0}$.`] : [])],
      });
    }

    if (level === 3) {
      // Round to a number of decimal places, sometimes after a calculator step.
      const dp = rng.int(1, 3);
      const kind = rng.pick(['given', 'root', 'pi']);
      let v: number;
      let tex: string;
      if (kind === 'root') {
        const n = rng.pick(NONSQUARE);
        v = Math.sqrt(n);
        tex = `\\sqrt{${n}}`;
      } else if (kind === 'pi') {
        const k = rng.int(2, 9);
        v = k * Math.PI;
        tex = `${k}\\pi`;
      } else {
        // a given decimal with at least dp + 2 places, chosen so that rounding and cutting off differ about half the time
        const whole = rng.int(0, 40);
        const digits = Array.from({ length: dp + 2 }, () => rng.int(0, 9));
        v = Number(`${whole}.${digits.join('')}`);
        tex = `${whole}{,}${digits.join('')}`;
      }
      const ans = Math.round(v * 10 ** dp) / 10 ** dp;
      const cut = Math.trunc(v * 10 ** dp) / 10 ** dp;
      const other = Math.round(v * 10 ** (dp + 1)) / 10 ** (dp + 1);
      return q(rng, {
        prompt: `${kind === 'given' ? '' : 'Use a calculator. '}Round $${tex}$ to ${dp} decimal place${dp === 1 ? '' : 's'}.`,
        input: { kind: 'numeric' },
        answer: { kind: 'numeric', value: ans, tolerance: 1e-9 },
        value: ans,
        answerDisplay: `$${fmt(ans, dp)}$`,
        hints: [`Look at decimal place ${dp + 1}: if it is 5 or more, round up.`],
        solution: [...(kind === 'given' ? [] : [`$${tex} = ${fmt(v, dp + 3)}\\ldots$`]), `The next digit is ${Math.floor(v * 10 ** (dp + 1)) % 10}, so round ${Math.floor(v * 10 ** (dp + 1)) % 10 >= 5 ? 'up' : 'down'}: $${fmt(ans, dp)}$.`],
        wrong: [
          { code: 'rounding', value: cut, feedback: `You cut the number off after ${dp} place${dp === 1 ? '' : 's'}. Rounding looks at the next digit: here it is ${Math.floor(v * 10 ** (dp + 1)) % 10}, so round up.` },
          { code: 'rounding', value: other, feedback: `That has ${dp + 1} decimal places. Round to ${dp}.` },
        ],
      });
    }

    if (level === 4) {
      // Rounding that suits the situation
      const kind = rng.pick(['bus', 'eggs', 'paint', 'money', 'rope', 'tables']);
      const ceilCase = kind === 'bus' || kind === 'paint' || kind === 'tables';
      let prompt: string;
      let exactV: number;
      let unitWord: string;
      if (kind === 'bus') {
        const cap = rng.pick([14, 22, 35, 60, 65]);
        const n = rng.int(2, 8) * cap + rng.int(1, cap - 1);
        prompt = `A school is taking ${n} learners on a trip. Each bus carries ${cap} learners. How many buses are needed?`;
        exactV = n / cap;
        unitWord = 'buses';
      } else if (kind === 'eggs') {
        const box = rng.pick([6, 12, 30]);
        const n = rng.int(3, 20) * box + rng.int(1, box - 1);
        prompt = `A farmer collects ${n} eggs and packs them in boxes of ${box}. How many **full** boxes can she pack?`;
        exactV = n / box;
        unitWord = 'boxes';
      } else if (kind === 'paint') {
        const cover = rng.pick([8, 10, 12, 15]);
        const area = rng.int(3, 14) * cover + rng.int(1, cover - 1);
        prompt = `One tin of paint covers ${cover} m². How many tins must be bought to paint ${area} m² of wall?`;
        exactV = area / cover;
        unitWord = 'tins';
      } else if (kind === 'money') {
        const price = rng.pick([7, 9, 12, 15, 18]);
        const have = rng.int(4, 20) * price + rng.int(1, price - 1);
        prompt = `Sipho has R${have}. A notebook costs R${price}. How many notebooks can he buy?`;
        exactV = have / price;
        unitWord = 'notebooks';
      } else if (kind === 'rope') {
        const piece = rng.pick([0.3, 0.6, 0.7, 0.8, 1.5]);
        const len = Math.round((rng.int(4, 15) * piece + piece * rng.pick([0.4, 0.6, 0.8])) * 10) / 10;
        prompt = `How many pieces of length ${String(piece).replace('.', ',')} m can be cut from a rope ${String(len).replace('.', ',')} m long?`;
        exactV = len / piece;
        unitWord = 'pieces';
      } else {
        const seats = rng.pick([4, 6, 8, 10]);
        const guests = rng.int(5, 20) * seats + rng.int(1, seats - 1);
        prompt = `${guests} guests are coming to a wedding. Each table seats ${seats}. How many tables are needed?`;
        exactV = guests / seats;
        unitWord = 'tables';
      }
      const ans = ceilCase ? Math.ceil(exactV - 1e-9) : Math.floor(exactV + 1e-9);
      const nearest = Math.round(exactV);
      return q(rng, {
        prompt,
        input: { kind: 'numeric', unit: unitWord },
        answer: exact(ans),
        value: ans,
        answerDisplay: `${ans} ${unitWord}`,
        hints: ['Divide first. Then think: does a part left over need one more, or does it not count?'],
        solution: [`$${plainNum(exactV, 2).replace(',', '{,}')}\\ldots$ ${unitWord}`, ceilCase ? `The part left over still needs one more, so round **up**: ${ans}.` : `Only whole ones count, so round **down**: ${ans}.`],
        wrong: [{ code: 'context-rounding', value: nearest, feedback: ceilCase ? `Ordinary rounding gives ${nearest}, but then some would be left out. Round up: ${ans} ${unitWord}.` : `Ordinary rounding gives ${nearest}, but there isn't enough for that many. Round down: ${ans} ${unitWord}.` }],
      });
    }

    // Level 5: recurring decimals as fractions
    const kind = rng.pick(['one', 'two', 'mixed', 'whole']);
    let tex: string;
    let n: number;
    let d: number;
    let wrongN: number;
    let wrongD: number;
    let steps: string[];
    let repeats = '';
    if (kind === 'one') {
      const a = rng.int(1, 8);
      tex = `0{,}\\dot{${a}}`;
      [n, d] = [a, 9];
      [wrongN, wrongD] = [a, 10];
      steps = [`Let $x = 0{,}${a}${a}${a}\\ldots$`, `$10x = ${a}{,}${a}${a}${a}\\ldots$`, `Subtract: $9x = ${a}$, so $x = \\tfrac{${a}}{9}$.`];
    } else if (kind === 'two') {
      let a = 0;
      let b = 0;
      do [a, b] = [rng.int(0, 9), rng.int(1, 9)];
      while (a === b);
      tex = `0{,}\\dot{${a}}\\dot{${b}}`;
      [n, d] = [10 * a + b, 99];
      [wrongN, wrongD] = [10 * a + b, 100];
      steps = [`Let $x = 0{,}${a}${b}${a}${b}\\ldots$`, `$100x = ${10 * a + b}{,}${a}${b}${a}${b}\\ldots$`, `Subtract: $99x = ${10 * a + b}$, so $x = \\tfrac{${10 * a + b}}{99}$.`];
    } else if (kind === 'mixed') {
      let a = 0;
      let b = 0;
      do [a, b] = [rng.int(1, 9), rng.int(1, 9)];
      while (a === b);
      tex = `0{,}${a}\\dot{${b}}`;
      repeats = String(b);
      [n, d] = [10 * a + b - a, 90];
      [wrongN, wrongD] = [10 * a + b, 99];
      steps = [`Let $x = 0{,}${a}${b}${b}${b}\\ldots$`, `$10x = ${a}{,}${b}${b}${b}\\ldots$ and $100x = ${10 * a + b}{,}${b}${b}${b}\\ldots$`, `Subtract: $90x = ${10 * a + b - a}$, so $x = \\tfrac{${10 * a + b - a}}{90}$.`];
    } else {
      const w = rng.int(1, 5);
      const a = rng.int(1, 8);
      tex = `${w}{,}\\dot{${a}}`;
      [n, d] = [9 * w + a, 9];
      [wrongN, wrongD] = [10 * w + a, 10];
      steps = [`$${w}{,}\\dot{${a}} = ${w} + 0{,}\\dot{${a}}$, and $0{,}\\dot{${a}} = \\tfrac{${a}}{9}$.`, `$${w} + \\tfrac{${a}}{9} = \\tfrac{${9 * w + a}}{9}$.`];
    }
    const r = rat(n, d);
    const wr = rat(wrongN, wrongD);
    return {
      prompt: `Write $${tex}$ as a fraction in its simplest form.`,
      input: { kind: 'fraction' },
      answer: { kind: 'fraction', n: r.n, d: r.d, requireSimplest: true },
      answerDisplay: `$\\dfrac{${r.n}}{${r.d}}$`,
      hints: ['Let $x$ be the decimal. Multiply by 10 or 100 so the repeating part lines up, then subtract.', 'The dots show which digits repeat: $0{,}\\dot{1}\\dot{2} = 0{,}121212\\ldots$'],
      solution: [...steps, ...(r.d !== d ? [`Simplify: $\\tfrac{${n}}{${d}} = \\tfrac{${r.n}}{${r.d}}$.`] : [])],
      misconceptions: r.n * wr.d === wr.n * r.d ? [] : [{ code: 'recurring-decimal', answer: { kind: 'fraction', n: wr.n, d: wr.d, requireSimplest: false }, feedback: kind === 'mixed' ? `Only the ${repeats} repeats, not the first digit. Line up the repeating part with $10x$ and $100x$.` : `That is the decimal that **stops**: $\\tfrac{${wrongN}}{${wrongD}}$ = ${plainNum(wrongN / wrongD, 2)}. The repeating digits go on forever, which gives 9s in the denominator.` }],
    };
  },
};
