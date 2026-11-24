/**
 * Exponents, Grades 7–9 (CAPS Mathematics Senior Phase: 1.2 Exponents, p. 15; 2.4 Algebraic equations, p. 25).
 *
 * powersRoots (Grade 7): what an exponent means, squares to 12² and cubes to 6³ and their roots, calculations that
 * mix powers and roots, comparing powers, and problems in context.
 * exponentLaws (Grades 8–9): levels 1–3 are Grade 8 (the laws for whole-number exponents, a⁰ = 1, powers of negative
 * numbers, scientific notation with positive exponents); levels 4–5 are Grade 9 (integer exponents, small numbers in
 * scientific notation, mixed simplification, simple exponential equations).
 *
 * Simplified answers are graded in power form (expr.ts powerFormProblem): a⁵ × a³ typed for a⁸ is equal in value, but
 * applying the law is the skill, so it is "not simplified yet". Prompts follow fixed patterns ("Calculate $…$.",
 * "Simplify $…$.", "Write $…$ in scientific notation.") so exponents.test.ts can work each answer out again from the
 * prompt alone.
 */
import type { AnswerSpec, GeneratedQuestion, Misconception, QuestionTemplate } from '../types.ts';
import type { Rng } from '../rng.ts';
import type { MistakeCode } from '../mistakes.ts';
import { choice, exact, keepNum } from './kit.ts';
import { parseExpression, toRatFn, ratFnEqual, type RatFn } from '../expr.ts';
import { scientificKey } from '../answer.ts';
import { gcd } from '../rational.ts';

const LETTERS = ['a', 'b', 'x', 'y', 'm', 'p', 'k', 't'] as const;
const times = (b: number | string, n: number) => Array.from({ length: n }, () => String(b)).join(' \\times ');

// ---------- Numbers ----------

/** Plain decimal text for 0.d₁d₂… × 10^point: ('456', 8) → '45600000', ('42', -3) → '0.00042'. */
export function decimal(digits: string, point: number): string {
  if (point <= 0) return `0.${'0'.repeat(-point)}${digits}`;
  if (point >= digits.length) return digits + '0'.repeat(point - digits.length);
  return `${digits.slice(0, point)}.${digits.slice(point)}`;
}

/** TeX for a plain decimal: thin spaces between groups of three digits, and a decimal comma. */
export function texNum(s: string): string {
  const neg = s.startsWith('-');
  const [i = '0', f = ''] = s.replace('-', '').split('.');
  const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, '\\,');
  const frac = f.replace(/(\d{3})(?=\d)/g, '$1\\,');
  return `${neg ? '-' : ''}${int}${f ? `{,}${frac}` : ''}`;
}
const texInt = (n: number) => texNum(String(n));

/** n significant digits, no trailing zero: '4', '45', '307'. */
function sigDigits(rng: Rng, n: number): string {
  let d = String(rng.int(1, 9));
  for (let i = 1; i < n; i++) d += String(i === n - 1 ? rng.int(1, 9) : rng.int(0, 9));
  return d;
}

/** a × 10^e from significant digits: a = d₁,d₂d₃… */
function sci(digits: string, e: number) {
  const d = digits.replace(/0+$/, '') || '0';
  const a = Number(d.length > 1 ? `${d[0]}.${d.slice(1)}` : d);
  const aTex = d.length > 1 ? `${d[0]}{,}${d.slice(1)}` : d;
  return { a, e, digits: d, aTex, tex: `${aTex} \\times 10^{${e}}`, plain: decimal(d, e + 1) };
}
type Sci = ReturnType<typeof sci>;
const sciAnswer = (s: Sci): AnswerSpec => ({ kind: 'scientific', a: s.a, e: s.e });
const sciWrong = (code: MistakeCode, a: number, e: number, feedback: string): Misconception => ({ code, answer: { kind: 'scientific', a, e }, feedback });

function keepSci(ms: Misconception[], answer: AnswerSpec): Misconception[] {
  if (answer.kind !== 'scientific') return [];
  const seen = [scientificKey(String(answer.a), answer.e)];
  return ms.filter((m) => {
    if (m.answer.kind !== 'scientific') return false;
    const k = scientificKey(String(m.answer.a), m.answer.e);
    if (!k || seen.includes(k)) return false;
    seen.push(k);
    return true;
  });
}

// ---------- Algebra ----------

type Powers = [string, number][];

/**
 * One term in simplest power form, as [text the answer checker reads, TeX]. Letters with a negative exponent go to
 * the bottom of a fraction: (3, 1, [x, -4]) → 3/(x^4), $\dfrac{3}{x^{4}}$. Exponent 0 drops the letter.
 */
export function term(top: number, bottom: number, powers: Powers): { plain: string; tex: string } {
  const g = gcd(Math.abs(top), Math.abs(bottom));
  const [cn, cd] = [top / g, bottom / g];
  const part = (c: number, ps: Powers, braces: boolean) => {
    const letters = ps.map(([v, e]) => (e === 1 ? v : braces ? `${v}^{${e}}` : `${v}^${e}`)).join('');
    const coef = !letters ? String(c) : c === 1 ? '' : c === -1 ? '-' : String(c);
    return coef + letters;
  };
  const up = powers.filter(([, e]) => e > 0);
  const down = powers.filter(([, e]) => e < 0).map(([v, e]) => [v, -e] as [string, number]);
  if (!down.length && cd === 1) return { plain: part(cn, up, false), tex: part(cn, up, true) };
  const neg = cn < 0 ? '-' : '';
  return {
    plain: `${neg}${part(Math.abs(cn), up, false)}/(${part(cd, down, false)})`,
    tex: `${neg}\\dfrac{${part(Math.abs(cn), up, true)}}{${part(cd, down, true)}}`,
  };
}
type Term = ReturnType<typeof term>;
const one = (v: string, e: number) => term(1, 1, [[v, e]]).tex;
const mis = (code: MistakeCode, t: Term, feedback: string): Misconception => ({ code, answer: { kind: 'expression', expr: t.plain }, feedback });

/** Keep expression misconceptions that the checker can read and that differ in value from the answer and each other. */
function keepExpr(ms: Misconception[], answer: string): Misconception[] {
  const value = (s: string): RatFn | null => {
    try {
      return toRatFn(parseExpression(s));
    } catch {
      return null; // e.g. a power above 12, which the answer box refuses anyway
    }
  };
  const seen = [value(answer)].filter((v): v is RatFn => v !== null);
  return ms.filter((m) => {
    if (m.answer.kind !== 'expression') return false;
    const v = value(m.answer.expr);
    if (!v || seen.some((s) => ratFnEqual(s, v))) return false;
    seen.push(v);
    return true;
  });
}

function letters(rng: Rng): [string, string] {
  const [v, w] = rng.shuffle(LETTERS);
  return [v!, w!].sort() as [string, string];
}

function numeric(prompt: string, value: number, display: string, hints: string[], solution: string[], ms: Misconception[], positive = true): GeneratedQuestion {
  return {
    prompt,
    input: positive ? { kind: 'numeric', positive: true } : { kind: 'numeric' },
    answer: exact(value),
    answerDisplay: display,
    hints,
    solution,
    misconceptions: keepNum(ms, value),
  };
}
const wrongNum = (code: MistakeCode, value: number, feedback: string): Misconception => ({ code, answer: exact(value), feedback });

// ===========================================================================
// Grade 7: exponents, squares, cubes and roots
// ===========================================================================

function powerValue(rng: Rng): GeneratedQuestion {
  const b = rng.int(2, 9);
  const top = Math.min(5, Math.floor(Math.log(100000) / Math.log(b)));
  const e = rng.int(2, top);
  const v = b ** e;
  return numeric(
    `Calculate $${b}^{${e}}$.`,
    v,
    `$${texInt(v)}$`,
    [`The exponent ${e} says how many ${b}s to multiply.`, `Write it out: $${times(b, e)}$.`],
    [`$${b}^{${e}}$ means ${e} factors of ${b}: $${times(b, e)} = ${texInt(v)}$.`],
    [
      wrongNum('power-meaning', b * e, `That is $${b} \\times ${e}$. The exponent counts the factors: $${b}^{${e}} = ${times(b, e)}$.`),
      wrongNum('power-meaning', e ** b, `That is $${e}^{${b}}$: the base and the exponent swapped. $${b}^{${e}}$ multiplies ${e} factors of ${b}.`),
    ],
  );
}

function powerForm(rng: Rng): GeneratedQuestion {
  const b = rng.int(2, 9);
  // 2⁴ = 4², so that pair would make the swapped option right too.
  const e = rng.intExcept(3, 7, b === 2 ? [2, 4] : [b]);
  return choice(rng, {
    prompt: `Write $${times(b, e)}$ in exponential form.`,
    correct: { id: 'c', text: `$${b}^{${e}}$` },
    distractors: [
      { id: 'swap', text: `$${e}^{${b}}$`, feedback: `The base is the number being multiplied (${b}); the exponent counts how many times (${e}). So it is $${b}^{${e}}$.` },
      { id: 'times', text: `$${b} \\times ${e}$`, feedback: `$${b} \\times ${e}$ is ${b * e}. Multiplying ${e} factors of ${b} gives $${b}^{${e}}$, which is much bigger.` },
    ],
    code: 'power-meaning',
    hints: ['Which number is being multiplied? How many times?'],
    solution: [`There are ${e} factors of ${b}: the base is ${b} and the exponent is ${e}, so $${times(b, e)} = ${b}^{${e}}$.`],
  });
}

function powerOfTen(rng: Rng): GeneratedQuestion {
  const n = rng.int(2, 7);
  const v = texInt(10 ** n);
  return {
    prompt: `Write $${v}$ as a power of 10: $${v} = 10^{\\,?}$. What is the exponent?`,
    input: { kind: 'numeric', positive: true },
    answer: exact(n),
    answerDisplay: `$${v} = 10^{${n}}$`,
    hints: ['How many 10s do you multiply to get it?', 'Count the zeros.'],
    solution: [`$${v} = ${times(10, n)} = 10^{${n}}$: ${n} factors of 10, one for each zero.`],
    misconceptions: keepNum([wrongNum('power-meaning', n + 1, `Count the zeros, not all the digits: $${v}$ has ${n} zeros, so it is $10^{${n}}$.`)], n),
  };
}

function squaresRoots(rng: Rng): GeneratedQuestion {
  const kind = rng.pick(['square', 'cube', 'root', 'cuberoot'] as const);
  if (kind === 'square' || kind === 'root') {
    const n = rng.int(2, 12);
    const sq = n * n;
    if (kind === 'square') {
      return numeric(
        `Calculate $${n}^{2}$.`,
        sq,
        `$${sq}$`,
        [`$${n}^2 = ${n} \\times ${n}$.`],
        [`$${n}^{2} = ${n} \\times ${n} = ${sq}$.`],
        [wrongNum('power-meaning', 2 * n, `That is $${n} \\times 2$. Squaring multiplies the number by itself: $${n} \\times ${n} = ${sq}$.`)],
      );
    }
    return numeric(
      `Calculate $\\sqrt{${sq}}$.`,
      n,
      `$${n}$`,
      ['Which number, multiplied by itself, gives it?', `Try a few: $${n - 1} \\times ${n - 1}$, $${n + 1} \\times ${n + 1}$…`],
      [`$${n} \\times ${n} = ${sq}$, so $\\sqrt{${sq}} = ${n}$.`],
      [wrongNum('square-root', sq / 2, `A square root isn't half the number. Find the number that times itself gives ${sq}: it is ${n}, because $${n} \\times ${n} = ${sq}$.`)],
    );
  }
  const n = rng.int(2, 6);
  const cb = n ** 3;
  if (kind === 'cube') {
    return numeric(
      `Calculate $${n}^{3}$.`,
      cb,
      `$${cb}$`,
      [`$${n}^3 = ${n} \\times ${n} \\times ${n}$.`],
      [`$${n}^{3} = ${n} \\times ${n} \\times ${n} = ${n * n} \\times ${n} = ${cb}$.`],
      [wrongNum('power-meaning', 3 * n, `That is $${n} \\times 3$. Cubing multiplies three ${n}s: $${n} \\times ${n} \\times ${n} = ${cb}$.`)],
    );
  }
  return numeric(
    `Calculate $\\sqrt[3]{${cb}}$.`,
    n,
    `$${n}$`,
    ['Which number, used three times in a multiplication, gives it?'],
    [`$${n} \\times ${n} \\times ${n} = ${cb}$, so $\\sqrt[3]{${cb}} = ${n}$.`],
    [
      wrongNum('square-root', n * n, `$${n * n} \\times ${n} = ${cb}$, but a cube root is one number used three times: $${n} \\times ${n} \\times ${n} = ${cb}$, so $\\sqrt[3]{${cb}} = ${n}$.`),
      ...(cb % 3 === 0 ? [wrongNum('square-root', cb / 3, `A cube root isn't a third of the number. Find the number that, used three times, multiplies to ${cb}: $${n} \\times ${n} \\times ${n} = ${cb}$.`)] : []),
    ],
  );
}

function mixedCalc(rng: Rng): GeneratedQuestion {
  const kind = rng.pick(['plus', 'rootsum', 'bracket', 'cube', 'double'] as const);
  if (kind === 'plus') {
    const [a, b, c] = [rng.int(2, 9), rng.int(2, 6), rng.int(2, 5)];
    const v = a + b * b * c;
    return numeric(
      `Calculate $${a} + ${b}^{2} \\times ${c}$.`,
      v,
      `$${v}$`,
      ['Powers come before × and ÷, and those come before + and −.'],
      [`Power first: $${b}^{2} = ${b * b}$.`, `Then multiply: $${b * b} \\times ${c} = ${b * b * c}$.`, `Then add: $${a} + ${b * b * c} = ${v}$.`],
      [
        wrongNum('left-to-right', (a + b * b) * c, `That adds before it multiplies. Powers first, then ×, then +: $${a} + ${b * b} \\times ${c} = ${a} + ${b * b * c}$.`),
        wrongNum('power-meaning', a + 2 * b * c, `$${b}^{2}$ is $${b} \\times ${b} = ${b * b}$, not $${b} \\times 2$.`),
      ],
    );
  }
  if (kind === 'rootsum') {
    const [p, q, r] = rng.pick([
      [3, 4, 5],
      [6, 8, 10],
      [5, 12, 13],
      [8, 15, 17],
      [9, 12, 15],
      [12, 16, 20],
      [7, 24, 25],
    ] as const);
    const [x, y] = rng.chance(0.5) ? [p, q] : [q, p];
    return numeric(
      `Calculate $\\sqrt{${x * x} + ${y * y}}$.`,
      r,
      `$${r}$`,
      ['The root sign covers the whole sum. Add first, then take the root.'],
      [`Add under the root sign first: $${x * x} + ${y * y} = ${r * r}$.`, `$\\sqrt{${r * r}} = ${r}$, because $${r} \\times ${r} = ${r * r}$.`],
      [wrongNum('root-of-sum', x + y, `You can't take the root of each part: $\\sqrt{${x * x}} + \\sqrt{${y * y}} = ${x + y}$, but $\\sqrt{${x * x} + ${y * y}} = \\sqrt{${r * r}} = ${r}$. Add first.`)],
    );
  }
  if (kind === 'bracket') {
    const [a, b] = [rng.int(2, 9), rng.int(2, 9)];
    const v = (a + b) ** 2;
    return numeric(
      `Calculate $(${a} + ${b})^{2}$.`,
      v,
      `$${v}$`,
      ['Brackets first, then the power.'],
      [`Brackets first: $${a} + ${b} = ${a + b}$.`, `$${a + b}^{2} = ${a + b} \\times ${a + b} = ${v}$.`],
      [
        wrongNum('root-of-sum', a * a + b * b, `Squaring each part gives $${a * a} + ${b * b} = ${a * a + b * b}$, but the square is on the whole bracket: $${a + b}^{2} = ${v}$.`),
        wrongNum('power-meaning', 2 * (a + b), `$${a + b}^{2}$ is $${a + b} \\times ${a + b}$, not $${a + b} \\times 2$.`),
      ],
    );
  }
  if (kind === 'cube') {
    const k = rng.int(2, 5);
    const s = rng.int(2, Math.min(12, k ** 3 - 1));
    const v = k ** 3 - s;
    return numeric(
      `Calculate $${k}^{3} - \\sqrt{${s * s}}$.`,
      v,
      `$${v}$`,
      ['Work out the power and the root first, then subtract.'],
      [`$${k}^{3} = ${times(k, 3)} = ${k ** 3}$ and $\\sqrt{${s * s}} = ${s}$.`, `$${k ** 3} - ${s} = ${v}$.`],
      [wrongNum('power-meaning', 3 * k - s, `$${k}^{3}$ is $${times(k, 3)} = ${k ** 3}$, not $${k} \\times 3$.`)],
      false,
    );
  }
  const n = rng.int(3, 12);
  const v = 2 * n * n;
  return numeric(
    `Calculate $2 \\times ${n}^{2}$.`,
    v,
    `$${v}$`,
    [`The square is only on the ${n}. Square first, then multiply.`],
    [`Power first: $${n}^{2} = ${n * n}$.`, `$2 \\times ${n * n} = ${v}$.`],
    [wrongNum('left-to-right', 4 * n * n, `That squares $2 \\times ${n}$. The square is only on the ${n}: $2 \\times ${n * n} = ${v}$.`)],
  );
}

function comparePowers(rng: Rng): GeneratedQuestion {
  let X: string, Y: string, vx: number, vy: number, code: MistakeCode, why: string, hint: string;
  if (rng.chance(0.6)) {
    const [a, b] = rng.pick([
      [2, 3],
      [2, 4],
      [2, 5],
      [2, 6],
      [3, 4],
      [3, 5],
      [4, 5],
      [2, 7],
      [3, 6],
    ] as const);
    const swap = rng.chance(0.5);
    [X, Y] = swap ? [`${b}^{${a}}`, `${a}^{${b}}`] : [`${a}^{${b}}`, `${b}^{${a}}`];
    [vx, vy] = swap ? [b ** a, a ** b] : [a ** b, b ** a];
    code = 'power-meaning';
    why = `Work both out: $${X} = ${texInt(vx)}$ and $${Y} = ${texInt(vy)}$.`;
    hint = 'Work out each power. Swapping the base and the exponent changes the value.';
  } else {
    const k = rng.int(3, 9);
    const n = k * k + rng.pick([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]);
    const swap = rng.chance(0.5);
    [X, Y] = swap ? [String(k), `\\sqrt{${n}}`] : [`\\sqrt{${n}}`, String(k)];
    [vx, vy] = swap ? [k, Math.sqrt(n)] : [Math.sqrt(n), k];
    code = 'square-root';
    why = `Compare squares: $${k} = \\sqrt{${k * k}}$, and ${n} is ${n > k * k ? 'more' : 'less'} than ${k * k}, so $\\sqrt{${n}}$ is ${n > k * k ? 'bigger' : 'smaller'} than ${k}.`;
    hint = `Write ${k} as a square root too: $${k} = \\sqrt{?}$.`;
  }
  const opts = [
    { id: 'first', text: `$${X}$ is bigger` },
    { id: 'second', text: `$${Y}$ is bigger` },
    { id: 'equal', text: 'They are equal' },
  ];
  const right = vx === vy ? 'equal' : vx > vy ? 'first' : 'second';
  return choice(rng, {
    prompt: `Which is bigger, $${X}$ or $${Y}$?`,
    correct: opts.find((o) => o.id === right)!,
    distractors: opts.filter((o) => o.id !== right).map((o) => ({ ...o, feedback: why })),
    keepOrder: opts,
    code,
    hints: [hint],
    solution: [why],
  });
}

function powerContext(rng: Rng): GeneratedQuestion {
  const kind = rng.pick(['garden', 'box', 'bacteria', 'fold', 'chain'] as const);
  if (kind === 'garden') {
    const s = rng.int(4, 15);
    const A = s * s;
    return {
      ...numeric(
        `A square vegetable garden has an area of $${A}$ m². How long is each side?`,
        s,
        `$${s}$ m`,
        ['The area of a square is side × side.', `Which number times itself is ${A}?`],
        [`Area $= s^2 = ${A}$, so $s = \\sqrt{${A}} = ${s}$ m, because $${s} \\times ${s} = ${A}$.`],
        [
          wrongNum('square-root', A / 2, `Half the area isn't the side. The side times itself must give the area: $s = \\sqrt{${A}} = ${s}$ m.`),
          wrongNum('square-root', A / 4, `Dividing by 4 shares the area between four sides, but area isn't made of sides. $s \\times s = ${A}$, so $s = \\sqrt{${A}} = ${s}$ m.`),
        ],
      ),
      input: { kind: 'numeric', unit: 'm', positive: true },
    };
  }
  if (kind === 'box') {
    const s = rng.int(2, 10);
    const V = s ** 3;
    return {
      ...numeric(
        `A cube-shaped box has a volume of $${texInt(V)}$ cm³. How long is each edge?`,
        s,
        `$${s}$ cm`,
        ['The volume of a cube is edge × edge × edge.', `Which number, used three times, multiplies to ${V}?`],
        [`Volume $= s^3 = ${texInt(V)}$, so $s = \\sqrt[3]{${V}} = ${s}$ cm, because $${times(s, 3)} = ${texInt(V)}$.`],
        [
          wrongNum('square-root', s * s, `$${s * s} \\times ${s} = ${V}$, but the edge is one number used three times: $${times(s, 3)} = ${texInt(V)}$, so $s = ${s}$ cm.`),
          ...(V % 3 === 0 ? [wrongNum('square-root', V / 3, `A cube root isn't a third of the number: $s \\times s \\times s = ${V}$, so $s = \\sqrt[3]{${V}} = ${s}$ cm.`)] : []),
        ],
      ),
      input: { kind: 'numeric', unit: 'cm', positive: true },
    };
  }
  if (kind === 'bacteria' || kind === 'fold') {
    const n = kind === 'bacteria' ? rng.int(4, 10) : rng.int(3, 8);
    const v = 2 ** n;
    const prompt =
      kind === 'bacteria'
        ? `A bacterium splits in two every hour, so the number of bacteria doubles every hour. Start with 1 bacterium. How many are there after ${n} hours?`
        : `Fold a sheet of paper in half, then in half again, ${n} times altogether. How many layers thick is it now?`;
    return numeric(
      prompt,
      v,
      `$2^{${n}} = ${texInt(v)}$`,
      ['Each step doubles the number: × 2 every time.', `After 1 step: 2. After 2 steps: 2 × 2 = 4. After ${n} steps?`],
      [`Each step multiplies by 2, so after ${n} steps there are $2^{${n}} = ${times(2, n)} = ${texInt(v)}$.`],
      [wrongNum('power-meaning', 2 * n, `That adds 2 each step. Doubling multiplies by 2 each step: $2^{${n}} = ${texInt(v)}$.`)],
    );
  }
  const n = rng.int(2, 6);
  const v = 3 ** n;
  return numeric(
    `You send a message to 3 friends. Each of them sends it on to 3 new people, and it carries on like that. Your 3 friends are round 1. How many new people get the message in round ${n}?`,
    v,
    `$3^{${n}} = ${texInt(v)}$`,
    ['Round 1: 3 people. Round 2: each of those 3 sends to 3, so 3 × 3.', 'Each round multiplies by 3.'],
    [`Round 1: $3$. Round 2: $3 \\times 3 = 3^{2}$. Each round multiplies by 3, so round ${n} reaches $3^{${n}} = ${texInt(v)}$ people.`],
    [wrongNum('power-meaning', 3 * n, `That adds 3 each round. Each person sends to 3, so each round multiplies by 3: $3^{${n}} = ${texInt(v)}$.`)],
  );
}

export const powersRoots: QuestionTemplate = {
  id: 'powers-roots',
  skillId: 'powers-roots',
  generate(rng, level) {
    if (level === 1) return rng.pick([powerValue, powerValue, powerForm, powerOfTen])(rng);
    if (level === 2) return squaresRoots(rng);
    if (level === 3) return mixedCalc(rng);
    if (level === 4) return comparePowers(rng);
    return powerContext(rng);
  },
};

// ===========================================================================
// Grades 8–9: the laws of exponents and scientific notation
// ===========================================================================

function simplify(tex: string, answer: Term, hints: string[], solution: string[], ms: Misconception[], positive = false): GeneratedQuestion {
  return {
    prompt: `Simplify $${tex}$.${positive ? ' Write your answer with positive exponents.' : ''}`,
    input: { kind: 'expression', variables: [...new Set(answer.plain.replace(/[^a-z]/g, ''))].sort(), ...(positive ? { fraction: true } : {}) },
    answer: { kind: 'expression', expr: answer.plain, form: 'power' },
    answerDisplay: `$${answer.tex}$`,
    hints,
    solution,
    misconceptions: keepExpr(ms, answer.plain),
  };
}

function productLaw(rng: Rng): GeneratedQuestion {
  const [v, w] = letters(rng);
  const two = rng.chance(0.4);
  const [c1, c2] = [rng.int(2, 7), rng.int(2, 6)];
  const m = rng.int(2, 6);
  const n = rng.int(2, Math.min(6, 12 - m));
  const [p, q] = two ? [rng.int(1, 4), rng.int(1, 4)] : [0, 0];
  const A = term(c1, 1, [[v, m], [w, p]]);
  const B = term(c2, 1, [[v, n], [w, q]]);
  const ans = term(c1 * c2, 1, [[v, m + n], [w, p + q]]);
  return simplify(
    `${A.tex} \\times ${B.tex}`,
    ans,
    ['Multiply the numbers in front. Then deal with each letter on its own.', `Same base: add the exponents. $${v}^{${m}} \\times ${v}^{${n}} = ${v}^{${m} + ${n}}$.`],
    [
      `Numbers: $${c1} \\times ${c2} = ${c1 * c2}$.`,
      `$${v}^{${m}} \\times ${v}^{${n}} = ${v}^{${m + n}}$: add the exponents, because there are ${m} + ${n} factors of $${v}$ altogether.`,
      ...(two ? [`$${one(w, p)} \\times ${one(w, q)} = ${one(w, p + q)}$.`] : []),
      `So the answer is $${ans.tex}$.`,
    ],
    [
      mis('exponent-laws', term(c1 * c2, 1, [[v, m * n], [w, p * q]]), `When you multiply powers of the same base, add the exponents: $${v}^{${m}} \\times ${v}^{${n}} = ${v}^{${m + n}}$, not $${v}^{${m * n}}$.`),
      mis('power-coefficient', term(c1 + c2, 1, [[v, m + n], [w, p + q]]), `Multiply the numbers in front: $${c1} \\times ${c2} = ${c1 * c2}$. Only the exponents are added.`),
    ],
  );
}

function quotientLaw(rng: Rng): GeneratedQuestion {
  const [v, w] = letters(rng);
  const two = rng.chance(0.4);
  const [c2, q] = [rng.int(2, 6), rng.int(2, 6)];
  const n = rng.int(1, 5);
  const m = rng.int(1, Math.min(7, 12 - n));
  const [s, r] = two ? [rng.int(1, 3), rng.int(1, 3)] : [0, 0];
  const top = term(c2 * q, 1, [[v, m + n], [w, r + s]]);
  const bottom = term(c2, 1, [[v, n], [w, s]]);
  const ans = term(q, 1, [[v, m], [w, r]]);
  return simplify(
    `\\dfrac{${top.tex}}{${bottom.tex}}`,
    ans,
    ['Divide the numbers. Then deal with each letter on its own.', `Same base: subtract the exponents. $${one(v, m + n)} \\div ${one(v, n)} = ${v}^{${m + n} - ${n}}$.`],
    [
      `Numbers: $${c2 * q} \\div ${c2} = ${q}$.`,
      `$${one(v, m + n)} \\div ${one(v, n)} = ${one(v, m)}$: subtract the exponents, because ${n} of the factors cancel.`,
      ...(two ? [`$${one(w, r + s)} \\div ${one(w, s)} = ${one(w, r)}$.`] : []),
      `So the answer is $${ans.tex}$.`,
    ],
    [
      ...((m + n) % n === 0 && n > 1 ? [mis('exponent-laws', term(q, 1, [[v, (m + n) / n], [w, r]]), `When you divide powers of the same base, subtract the exponents: $${one(v, m + n)} \\div ${one(v, n)} = ${one(v, m)}$. You divided them.`)] : []),
      mis('exponent-laws', term(q, 1, [[v, m + 2 * n], [w, r + 2 * s]]), `Dividing subtracts the exponents; adding is for multiplying. $${one(v, m + n)} \\div ${one(v, n)} = ${one(v, m)}$.`),
      mis('power-coefficient', term(c2 * q - c2, 1, [[v, m], [w, r]]), `Divide the numbers in front: $${c2 * q} \\div ${c2} = ${q}$. Only the exponents are subtracted.`),
    ],
  );
}

function powerOfPower(rng: Rng): GeneratedQuestion {
  const [v, w] = letters(rng);
  const two = rng.chance(0.4);
  const k = rng.int(2, 3);
  const c = rng.int(2, k === 3 ? 5 : 6);
  const p = rng.int(1, Math.floor(12 / k));
  const q = two ? rng.int(1, Math.floor(9 / k)) : 0;
  const inside = term(c, 1, [[v, p], [w, q]]);
  const ans = term(c ** k, 1, [[v, p * k], [w, q * k]]);
  const raised = (x: string, e: number) => (e === 1 ? x : `(${x}^{${e}})`);
  return simplify(
    `(${inside.tex})^{${k}}`,
    ans,
    [`Everything in the bracket is raised to the power ${k}: the ${c} as well as each letter.`, 'A power of a power: multiply the exponents.'],
    [
      `$(${inside.tex})^{${k}} = ${c}^{${k}} \\times ${raised(v, p)}^{${k}}${two ? ` \\times ${raised(w, q)}^{${k}}` : ''}$.`,
      `$${c}^{${k}} = ${c ** k}$, and the exponents multiply: $${p} \\times ${k} = ${p * k}$${two ? ` and $${q} \\times ${k} = ${q * k}$` : ''}.`,
      `So the answer is $${ans.tex}$.`,
    ],
    [
      mis('power-coefficient', term(c, 1, [[v, p * k], [w, q * k]]), `The ${c} is inside the bracket too, so it is raised to the power ${k}: $${c}^{${k}} = ${c ** k}$.`),
      mis('power-coefficient', term(c * k, 1, [[v, p * k], [w, q * k]]), `$${c}^{${k}}$ is $${times(c, k)} = ${c ** k}$, not $${c} \\times ${k}$.`),
      mis('exponent-laws', term(c ** k, 1, [[v, p + k], [w, two ? q + k : 0]]), `A power of a power multiplies the exponents: $(${one(v, p)})^{${k}} = ${one(v, p * k)}$, not $${one(v, p + k)}$.`),
    ],
  );
}

function mixedLaw(rng: Rng): GeneratedQuestion {
  const [v] = letters(rng);
  const c = rng.int(2, 6);
  const k = rng.int(2, 3);
  const p = rng.int(2, k === 3 ? 3 : 4);
  const m = rng.int(1, 12 - p * k);
  const ans = term(c, 1, [[v, m + p * k]]);
  const first = term(c, 1, [[v, m]]).tex;
  return simplify(
    `${first} \\times (${v}^{${p}})^{${k}}`,
    ans,
    ['Do the power of a power first: multiply those exponents.', 'Then multiply powers of the same base: add the exponents.'],
    [`$(${v}^{${p}})^{${k}} = ${v}^{${p * k}}$.`, `$${first} \\times ${v}^{${p * k}} = ${ans.tex}$, because $${m} + ${p * k} = ${m + p * k}$.`],
    [
      mis('exponent-laws', term(c, 1, [[v, m + p + k]]), `$(${v}^{${p}})^{${k}}$ is ${k} factors of $${v}^{${p}}$, so it is $${v}^{${p * k}}$: multiply ${p} by ${k}, don't add them.`),
      mis('power-coefficient', term(c ** k, 1, [[v, m + p * k]]), `The ${c} is outside the bracket, so the power ${k} doesn't apply to it.`),
    ],
  );
}

function zeroAndSign(rng: Rng): GeneratedQuestion {
  const kind = rng.pick(['coef', 'bracket', 'sum', 'square', 'cube'] as const);
  const v = rng.pick(LETTERS);
  if (kind === 'coef' || kind === 'bracket') {
    const c = rng.int(2, 9);
    const inBracket = kind === 'bracket';
    const value = inBracket ? 1 : c;
    return numeric(
      `Calculate $${inBracket ? `(${c}${v})^{0}` : `${c}${v}^{0}`}$, where $${v} \\neq 0$.`,
      value,
      `$${value}$`,
      ['Anything (except 0) to the power 0 is 1.', inBracket ? 'The power 0 is on the whole bracket.' : `The power 0 is only on the $${v}$.`],
      inBracket ? [`The whole bracket is raised to the power 0, so $(${c}${v})^{0} = 1$.`] : [`Only $${v}$ is raised to the power 0: $${c}${v}^{0} = ${c} \\times 1 = ${c}$.`],
      [
        inBracket
          ? wrongNum('power-coefficient', c, `The power 0 is on the whole bracket, the ${c} too, so the answer is 1.`)
          : wrongNum('negative-exponent', 1, `Only the $${v}$ has the power 0. The ${c} stays: $${c} \\times ${v}^{0} = ${c} \\times 1 = ${c}$.`),
        wrongNum('negative-exponent', 0, 'A power of 0 gives 1, not 0. Look at the pattern: $2^2 = 4$, $2^1 = 2$, $2^0 = 1$; each step divides by 2.'),
      ],
    );
  }
  if (kind === 'sum') {
    const [a, b] = [rng.int(2, 9), rng.int(2, 9)];
    const mult = rng.chance(0.5);
    const value = mult ? b * b : 2;
    return numeric(
      `Calculate $${mult ? `${a}^{0} \\times ${b}^{2}` : `${a}^{0} + ${b}^{0}`}$.`,
      value,
      `$${value}$`,
      ['Anything (except 0) to the power 0 is 1.'],
      [mult ? `$${a}^{0} = 1$, so the answer is $1 \\times ${b * b} = ${b * b}$.` : `$${a}^{0} = 1$ and $${b}^{0} = 1$, so the answer is $1 + 1 = 2$.`],
      [
        wrongNum('negative-exponent', 0, 'A power of 0 gives 1, not 0. $2^1 = 2$, and dividing by 2 once more gives $2^0 = 1$.'),
        wrongNum('negative-exponent', mult ? a * b * b : a + b, "The power 0 changes the number to 1: it doesn't leave it as it was."),
      ],
    );
  }
  const cube = kind === 'cube';
  const a = rng.int(2, cube ? 6 : 12);
  const bracket = cube || rng.chance(0.5);
  const value = cube ? -(a ** 3) : bracket ? a * a : -(a * a);
  const tex = cube ? (rng.chance(0.5) ? `(-${a})^{3}` : `-${a}^{3}`) : bracket ? `(-${a})^{2}` : `-${a}^{2}`;
  const inBracket = tex.startsWith('(');
  return numeric(
    `Calculate $${tex}$.`,
    value,
    `$${value}$`,
    [inBracket ? 'The power is on the whole bracket, the minus sign too.' : `The power is only on the ${a}; the minus sign is applied after.`, 'Two negatives multiply to a positive; three multiply to a negative.'],
    [inBracket ? `$${tex} = ${times(`(-${a})`, cube ? 3 : 2)} = ${value}$.` : `$${tex} = -(${times(a, cube ? 3 : 2)}) = ${value}$.`],
    [
      wrongNum(
        'sign-error',
        -value,
        inBracket
          ? `Count the negative signs: ${cube ? 'three negatives multiply to a negative' : 'two negatives multiply to a positive'}, so $${tex} = ${value}$.`
          : `Only the ${a} is raised to the power; the minus sign stays in front: $${tex} = ${value}$.${cube ? '' : ` It is $(-${a})^{2}$ that is positive.`}`,
      ),
    ],
    false,
  );
}

interface Fact {
  text: (x: string) => string;
  digits: string;
  e: number;
}
const BIG_FACTS: Fact[] = [
  { text: (x) => `The Sun is about $${x}$ km from the Earth. Write this distance in scientific notation.`, digits: '15', e: 8 },
  { text: (x) => `Light travels about $${x}$ km in one second. Write this distance in scientific notation.`, digits: '3', e: 5 },
  { text: (x) => `The Moon is about $${x}$ km from the Earth. Write this distance in scientific notation.`, digits: '384', e: 5 },
  { text: (x) => `About $${x}$ people live on Earth. Write this number in scientific notation.`, digits: '8', e: 9 },
  { text: (x) => `About $${x}$ people live in South Africa. Write this number in scientific notation.`, digits: '63', e: 7 },
  { text: (x) => `The Earth is about $${x}$ km across. Write this distance in scientific notation.`, digits: '127', e: 4 },
];
const SMALL_FACTS: Fact[] = [
  { text: (x) => `A red blood cell is about $${x}$ m across. Write this length in scientific notation.`, digits: '8', e: -6 },
  { text: (x) => `A human hair is about $${x}$ m thick. Write this length in scientific notation.`, digits: '7', e: -5 },
  { text: (x) => `A sheet of paper is about $${x}$ m thick. Write this length in scientific notation.`, digits: '1', e: -4 },
  { text: (x) => `A grain of pollen is about $${x}$ m across. Write this length in scientific notation.`, digits: '25', e: -6 },
];

function toScientific(rng: Rng, small: boolean): GeneratedQuestion {
  const fact = rng.chance(0.3) ? rng.pick(small ? SMALL_FACTS : BIG_FACTS) : null;
  const s = fact ? sci(fact.digits, fact.e) : sci(sigDigits(rng, rng.int(1, 3)), small ? -rng.int(1, 6) : rng.int(3, 9));
  const shown = texNum(s.plain);
  const answer = sciAnswer(s);
  const zeros = small ? /^0*/.exec(s.plain.split('.')[1] ?? '')![0].length : /0*$/.exec(s.plain)![0].length;
  const moves = Math.abs(s.e);
  const plainA = s.aTex.replace('{,}', ',');
  return {
    prompt: fact ? fact.text(shown) : `Write $${shown}$ in scientific notation.`,
    input: { kind: 'scientific' },
    answer,
    answerDisplay: `$${s.tex}$`,
    hints: [
      `Scientific notation is $a \\times 10^{n}$, with $a$ at least 1 and less than 10. Here $a = ${s.aTex}$.`,
      small ? `How many places must the decimal point move to the right to give ${plainA}? Moving it right means a negative power.` : `How many places must the decimal point move to the left to give ${plainA}?`,
    ],
    solution: [
      `Put the decimal point after the first non-zero digit: $a = ${s.aTex}$.`,
      small ? `The point moves ${moves} places to the right, so the number was divided by $10^{${moves}}$: the power is $-${moves}$.` : `The point moves ${moves} places to the left, so the power is $${moves}$.`,
      `$${shown} = ${s.tex}$.`,
    ],
    misconceptions: keepSci(
      small
        ? [
            sciWrong('scientific-notation', s.a, -s.e, `A number smaller than 1 has a negative power of 10: $${s.tex}$.`),
            sciWrong('scientific-notation', s.a, -zeros, `Don't count the zeros: count how many places the point moves to land just after the first non-zero digit. That is ${moves} places, so the power is $-${moves}$.`),
          ]
        : [
            sciWrong('scientific-notation', s.a, zeros, `Don't count the zeros: count how many places the point moves to give $${s.aTex}$. That is ${moves} places, so the power is ${moves}.`),
            sciWrong('scientific-notation', s.a, s.e + 1, `The point moves one place fewer than the number of digits before it: ${moves} places, so the power is ${moves}.`),
          ],
      answer,
    ),
  };
}

function fromScientific(rng: Rng, small: boolean): GeneratedQuestion {
  // Down to 10⁻⁵: an answer (or a predicted wrong answer one place further) below 10⁻⁶ is too long to type reliably.
  const s = sci(sigDigits(rng, rng.int(2, 3)), small ? -rng.int(2, 5) : rng.int(3, 7));
  const value = Number(s.plain);
  const moves = Math.abs(s.e);
  const wrong = (v: string, feedback: string): Misconception => ({ code: 'scientific-notation', answer: { kind: 'numeric', value: Number(v), tolerance: 1e-12 }, feedback });
  return {
    prompt: `Write $${s.tex}$ as an ordinary number.`,
    input: { kind: 'numeric', positive: true },
    answer: { kind: 'numeric', value, tolerance: 1e-12 },
    answerDisplay: `$${texNum(s.plain)}$`,
    hints: [small ? `$10^{-${moves}}$ means divide by $10^{${moves}}$: move the decimal point ${moves} places to the left.` : `Multiplying by $10^{${moves}}$ moves the decimal point ${moves} places to the right.`, 'Fill any empty places with zeros.'],
    solution: [`Move the decimal point in $${s.aTex}$ ${moves} places to the ${small ? 'left' : 'right'}: $${s.tex} = ${texNum(s.plain)}$.`],
    misconceptions: keepNum(
      small
        ? [
            wrong(decimal(s.digits, moves + 1), `The power is negative, so the number is small: move the point ${moves} places to the left, not the right.`),
            wrong(decimal(s.digits, s.e), `Count the places carefully: the point moves ${moves} places, which gives $${texNum(s.plain)}$.`),
          ]
        : [wrong(s.digits + '0'.repeat(moves), `Don't just add ${moves} zeros: the digits after the comma already fill ${s.digits.length - 1} of the ${moves} places. Move the point ${moves} places to the right.`)],
      value,
    ),
  };
}

const ten = (e: number) => `10^{${e}}`;
const bracketed = (e: number) => (e < 0 ? `(${e})` : String(e));

function multiplyScientific(rng: Rng, renormalise: boolean): GeneratedQuestion {
  // a₁ = t₁/10 has two significant digits; a₂ is a whole number 2–9.
  let t1 = 0;
  let t2 = 0;
  do {
    t1 = rng.intExcept(11, 95, [20, 30, 40, 50, 60, 70, 80, 90]);
    t2 = rng.int(2, 9);
  } while (renormalise ? t1 * t2 < 100 : t1 * t2 >= 100);
  const [m, n] = renormalise ? [rng.signed(2, 8), rng.signed(2, 8)] : [rng.int(2, 8), rng.int(2, 8)];
  const P = t1 * t2;
  const ans = sci(String(P), renormalise ? m + n + 1 : m + n);
  const a1 = sci(String(t1), m);
  const answer = sciAnswer(ans);
  const rawTex = texNum(String(P / 10));
  return {
    prompt: `Calculate $(${a1.tex}) \\times (${t2} \\times ${ten(n)})$. Give your answer in scientific notation.`,
    input: { kind: 'scientific' },
    answer,
    answerDisplay: `$${ans.tex}$`,
    hints: ['Multiply the numbers in front. Multiply the powers of 10 by adding their exponents.', ...(renormalise ? ['If the number in front is 10 or more, rewrite it, and adjust the power of 10.'] : [])],
    solution: [
      `Numbers: $${a1.aTex} \\times ${t2} = ${rawTex}$.`,
      `Powers of 10: $${ten(m)} \\times ${ten(n)} = 10^{${m} + ${bracketed(n)}} = ${ten(m + n)}$.`,
      renormalise
        ? `$${rawTex}$ is not less than 10: $${rawTex} = ${ans.aTex} \\times 10^{1}$, so the power goes up by 1: $${rawTex} \\times ${ten(m + n)} = ${ans.tex}$.`
        : `So the answer is $${ans.tex}$.`,
    ],
    misconceptions: keepSci(
      [
        sciWrong('exponent-laws', ans.a, m * n + (renormalise ? 1 : 0), `Multiplying powers of 10 adds the exponents: $${ten(m)} \\times ${ten(n)} = ${ten(m + n)}$.`),
        ...(renormalise ? [sciWrong('scientific-notation', ans.a, m + n, `Changing $${rawTex}$ to $${ans.aTex}$ divides it by 10, so the power of 10 must go up by 1 to keep the value: $${ans.tex}$.`)] : []),
        ...(!renormalise && t1 + 10 * t2 < 100 ? [sciWrong('power-coefficient', (t1 + 10 * t2) / 10, m + n, `Multiply the numbers in front: $${a1.aTex} \\times ${t2} = ${rawTex}$. Only the exponents are added.`)] : []),
      ],
      answer,
    ),
  };
}

function divideScientific(rng: Rng): GeneratedQuestion {
  const B = rng.int(2, 4);
  const q10 = rng.intExcept(11, Math.floor(99 / B), [20, 30, 40]);
  const [m, n] = [rng.signed(2, 8), rng.signed(2, 8)];
  const A = sci(String(q10 * B), m);
  const ans = sci(String(q10), m - n);
  const answer = sciAnswer(ans);
  return {
    prompt: `Calculate $\\dfrac{${A.tex}}{${B} \\times ${ten(n)}}$. Give your answer in scientific notation.`,
    input: { kind: 'scientific' },
    answer,
    answerDisplay: `$${ans.tex}$`,
    hints: ['Divide the numbers in front. Divide the powers of 10 by subtracting their exponents.'],
    solution: [`Numbers: $${A.aTex} \\div ${B} = ${ans.aTex}$.`, `Powers of 10: $${ten(m)} \\div ${ten(n)} = 10^{${m} - ${bracketed(n)}} = ${ten(m - n)}$.`, `So the answer is $${ans.tex}$.`],
    misconceptions: keepSci(
      [
        sciWrong('exponent-laws', ans.a, m + n, `Dividing powers of 10 subtracts the exponents: $${m} - ${bracketed(n)} = ${m - n}$.`),
        sciWrong('sign-error', ans.a, n - m, `Subtract the bottom exponent from the top one: $${m} - ${bracketed(n)} = ${m - n}$.`),
      ],
      answer,
    ),
  };
}

function negativeValue(rng: Rng): GeneratedQuestion {
  const b = rng.int(2, 10);
  const e = rng.int(1, b <= 3 ? 4 : b <= 5 ? 3 : 2);
  const p = b ** e;
  const c = rng.chance(0.4) ? rng.intExcept(2, 9, [b]) : 1;
  const tex = c === 1 ? `${b}^{-${e}}` : `${c} \\times ${b}^{-${e}}`;
  const g = gcd(c, p);
  const frac = g === 1 ? `\\dfrac{${c}}{${p}}` : `\\dfrac{${c}}{${p}} = \\dfrac{${c / g}}{${p / g}}`;
  return {
    prompt: `Write $${tex}$ as a fraction.`,
    input: { kind: 'fraction' },
    answer: { kind: 'fraction', n: c / g, d: p / g, requireSimplest: false },
    answerDisplay: `$\\tfrac{${c / g}}{${p / g}}$`,
    hints: ['A negative exponent means "one over": $a^{-n} = \\dfrac{1}{a^{n}}$.', ...(c === 1 ? [] : [`Only the ${b} has the negative exponent.`])],
    solution: [`$${tex} = ${c === 1 ? '' : `${c} \\times `}\\dfrac{1}{${b}^{${e}}} = ${frac}$.`],
    misconceptions: [
      { code: 'negative-exponent', answer: { kind: 'fraction', n: -c * p, d: 1, requireSimplest: false }, feedback: "A negative exponent doesn't make the number negative. It means one over the positive power." },
      { code: 'negative-exponent', answer: { kind: 'fraction', n: -c * b * e, d: 1, requireSimplest: false }, feedback: `That multiplies ${b} by $-${e}$. A negative exponent means one over: $${b}^{-${e}} = \\dfrac{1}{${p}}$.` },
      ...(c === 1 ? [] : [{ code: 'negative-exponent' as MistakeCode, answer: { kind: 'fraction', n: 1, d: c * p, requireSimplest: false } as AnswerSpec, feedback: `Only $${b}^{-${e}}$ goes to the bottom; the ${c} stays on top.` }]),
    ],
  };
}

function negativeSimplify(rng: Rng): GeneratedQuestion {
  const [v, w] = letters(rng);
  const kind = rng.pick(['times', 'over', 'coef', 'two'] as const);
  if (kind === 'times') {
    const m = rng.int(1, 6);
    const n = rng.intExcept(1, 9, [m]);
    const ans = term(1, 1, [[v, m - n]]);
    return simplify(
      `${one(v, m)} \\times ${v}^{-${n}}`,
      ans,
      ['Same base: add the exponents, negative ones too.', '$a^{-n} = \\dfrac{1}{a^{n}}$.'],
      [`Add the exponents: $${m} + (-${n}) = ${m - n}$, so the answer is $${v}^{${m - n}}${m - n < 0 ? ` = ${ans.tex}` : ''}$.`],
      [
        mis('negative-exponent', term(1, 1, [[v, m + n]]), `The exponent $-${n}$ is negative: $${m} + (-${n}) = ${m - n}$.`),
        ...(m - n < 0 ? [mis('negative-exponent', term(1, 1, [[v, n - m]]), `$${m} - ${n} = ${m - n}$ is negative, so the power goes to the bottom: $${v}^{${m - n}} = ${ans.tex}$.`)] : []),
      ],
      true,
    );
  }
  if (kind === 'over') {
    const m = rng.int(1, 6);
    const n = rng.int(m + 1, 10);
    const c = rng.chance(0.5) ? rng.int(2, 9) : 1;
    const ans = term(c, 1, [[v, m - n]]);
    return simplify(
      `\\dfrac{${term(c, 1, [[v, m]]).tex}}{${v}^{${n}}}`,
      ans,
      ['Same base: subtract the exponents, top minus bottom.', 'If the exponent comes out negative, that power belongs on the bottom.'],
      [`$${one(v, m)} \\div ${v}^{${n}} = ${v}^{${m} - ${n}} = ${v}^{${m - n}}$.`, `$${v}^{${m - n}} = \\dfrac{1}{${v}^{${n - m}}}$, so the answer is $${ans.tex}$.`],
      [mis('negative-exponent', term(c, 1, [[v, n - m]]), `There are more factors of $${v}$ on the bottom, so ${n - m} of them are left on the bottom: $${ans.tex}$.`)],
      true,
    );
  }
  if (kind === 'coef') {
    const c = rng.int(2, 9);
    const n = rng.int(1, 6);
    const ans = term(c, 1, [[v, -n]]);
    return simplify(
      `${c}${v}^{-${n}}`,
      ans,
      [`Only the $${v}$ has the negative exponent.`, '$a^{-n} = \\dfrac{1}{a^{n}}$.'],
      [`$${c}${v}^{-${n}} = ${c} \\times \\dfrac{1}{${one(v, n)}} = ${ans.tex}$. The ${c} stays on top.`],
      [
        mis('negative-exponent', term(1, c, [[v, -n]]), `The exponent $-${n}$ belongs to $${v}$ only, so only $${one(v, n)}$ goes to the bottom. The ${c} stays on top: $${ans.tex}$.`),
        mis('negative-exponent', term(-c, 1, [[v, n]]), "A negative exponent doesn't make the term negative. It moves the power to the bottom of a fraction."),
      ],
      true,
    );
  }
  const m = rng.int(1, 6);
  const n = rng.int(1, 6);
  const ans = term(1, 1, [[w, n], [v, -m]]);
  return simplify(
    `${v}^{-${m}}${one(w, n)}`,
    ans,
    ['Only the power with the negative exponent moves to the bottom.'],
    [`$${v}^{-${m}} = \\dfrac{1}{${one(v, m)}}$, so $${v}^{-${m}}${one(w, n)} = ${ans.tex}$.`],
    [mis('negative-exponent', term(1, 1, [[v, -m], [w, -n]]), `Only $${v}$ has a negative exponent; $${one(w, n)}$ stays on top: $${ans.tex}$.`)],
    true,
  );
}

function mixedSimplify(rng: Rng): GeneratedQuestion {
  const [v] = letters(rng);
  const c1 = rng.int(2, 4);
  const c2 = rng.int(1, 5);
  const N = c1 * c1 * c2;
  const divisors = Array.from({ length: N }, (_, i) => i + 1).filter((d) => N % d === 0 && d > 1 && d < N);
  const c3 = rng.pick(divisors);
  const p = rng.int(1, 4);
  const q = rng.int(1, 4);
  const r = rng.intExcept(1, 2 * p + q + 4, [2 * p + q]);
  const E = 2 * p + q - r;
  const ans = term(N / c3, 1, [[v, E]]);
  const inner = term(c1, 1, [[v, p]]).tex;
  const squared = term(c1 * c1, 1, [[v, 2 * p]]).tex;
  const second = term(c2, 1, [[v, q]]).tex;
  return simplify(
    `\\dfrac{(${inner})^{2} \\times ${second}}{${term(c3, 1, [[v, r]]).tex}}`,
    ans,
    ['Work in order: the bracket, then the top, then divide.', `$(${inner})^{2} = ${squared}$.`],
    [
      `Bracket: $(${inner})^{2} = ${squared}$.`,
      `Top: $${squared} \\times ${second} = ${term(N, 1, [[v, 2 * p + q]]).tex}$.`,
      `Divide: $${N} \\div ${c3} = ${N / c3}$, and $${v}^{${2 * p + q} - ${r}} = ${v}^{${E}}$.`,
      `So the answer is $${ans.tex}$.`,
    ],
    [
      mis('power-coefficient', term(c1 * c2, c3, [[v, E]]), `The ${c1} is inside the bracket, so it is squared too: $${c1}^{2} = ${c1 * c1}$.`),
      mis('exponent-laws', term(N, c3, [[v, p + 2 + q - r]]), `$(${one(v, p)})^{2} = ${v}^{${2 * p}}$: a power of a power multiplies the exponents.`),
    ],
    true,
  );
}

function expEquation(rng: Rng): GeneratedQuestion {
  const b = rng.pick([2, 2, 3, 5, 10]);
  const range: Record<number, [number, number]> = { 2: [-4, 7], 3: [-3, 5], 5: [-2, 4], 10: [-3, 5] };
  const [lo, hi] = range[b]!;
  const t = rng.int(lo, hi);
  const s = rng.pick([0, 0, 1, -1, 2]);
  const x = t - s;
  const expo = s === 0 ? 'x' : `x ${s > 0 ? '+' : '-'} ${Math.abs(s)}`;
  const rhs = t >= 0 ? texInt(b ** t) : b === 10 ? texNum(decimal('1', t + 1)) : `\\dfrac{1}{${b ** -t}}`;
  const rhsAsPower = t < 0 && b !== 10 ? `\\dfrac{1}{${b ** -t}} = \\dfrac{1}{${b}^{${-t}}} = ${b}^{${t}}` : `${rhs} = ${b}^{${t}}`;
  const wrong: Misconception[] = [];
  if (s !== 0) wrong.push(wrongNum('exponent-laws', t, `$${b}^{${t}}$ makes the exponent ${t}, so $${expo} = ${t}$. Now solve that for $x$.`));
  if (t > 1) wrong.push(wrongNum('exponent-laws', b ** t / b - s, `Dividing by ${b} doesn't find the exponent. Write $${rhs}$ as a power of ${b}: $${b}^{${t}}$.`));
  if (t < 0) wrong.push(wrongNum('negative-exponent', -t - s, `$${rhsAsPower}$: one over a power has a negative exponent.`));
  return {
    prompt: `Solve for $x$: $${b}^{${expo}} = ${rhs}$.`,
    input: { kind: 'numeric', prefix: 'x =' },
    answer: exact(x),
    answerDisplay: `$x = ${x}$`,
    hints: [`Write $${rhs}$ as a power of ${b}.`, 'Same base on both sides, so the exponents are equal.'],
    solution: [`$${rhsAsPower}$.`, `So $${b}^{${expo}} = ${b}^{${t}}$, and the exponents are equal: $${expo} = ${t}$.`, `$x = ${x}$.`],
    misconceptions: keepNum(wrong, x),
  };
}

export const exponentLaws: QuestionTemplate = {
  id: 'exponent-laws',
  skillId: 'exponent-laws',
  generate(rng, level) {
    if (level === 1) return rng.pick([productLaw, quotientLaw])(rng);
    if (level === 2) return rng.pick([powerOfPower, powerOfPower, mixedLaw, zeroAndSign])(rng);
    if (level === 3) return rng.pick([(r: Rng) => toScientific(r, false), (r: Rng) => fromScientific(r, false), (r: Rng) => multiplyScientific(r, false)])(rng);
    if (level === 4) return rng.pick([negativeValue, negativeSimplify, negativeSimplify, (r: Rng) => toScientific(r, true), (r: Rng) => fromScientific(r, true)])(rng);
    return rng.pick([mixedSimplify, mixedSimplify, expEquation, expEquation, (r: Rng) => multiplyScientific(r, true), divideScientific])(rng);
  },
};
