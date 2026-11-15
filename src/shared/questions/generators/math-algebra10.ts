/**
 * Grade 10 algebraic expressions: binomial × trinomial, factorising by grouping, sums and differences of
 * cubes, and algebraic fractions (simplifying, ×, ÷, +, − and when a fraction is not defined).
 * Every question is built from its answer, so factors are known exactly.
 */
import type { QuestionTemplate, Misconception, AnswerSpec } from '../types.ts';
import type { MistakeCode } from '../mistakes.ts';
import type { Rng } from '../rng.ts';
import { sum, sumPlain } from '../tex.ts';
import { expressionsEquivalent } from '../expr.ts';

// ---- Polynomials in x as coefficient lists, constant first: [6, 5, 1] is x² + 5x + 6 ----
type P = number[];
const pmul = (a: P, b: P): P => {
  const out: P = Array(a.length + b.length - 1).fill(0);
  a.forEach((x, i) => b.forEach((y, j) => (out[i + j] = (out[i + j] as number) + x * y)));
  return out;
};
const padd = (a: P, b: P): P => Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0) + (b[i] ?? 0));
const scale = (a: P, k: number): P => a.map((c) => c * k);
const terms = (p: P, v = 'x'): [number, string][] => p.map((c, k) => [c, k === 0 ? '' : k === 1 ? v : `${v}^${k}`] as [number, string]).reverse();
const tex = (p: P): string => sum(terms(p));
const txt = (p: P): string => sumPlain(terms(p));
/** In brackets, unless it is a single term. */
const br = (p: P): string => (p.filter((c) => c !== 0).length > 1 ? `(${tex(p)})` : tex(p));
const brT = (p: P): string => `(${txt(p)})`;
const lin = (k: number): P => [k, 1]; // x + k

const dfrac = (top: string, bottom: string) => `\\dfrac{${top}}{${bottom}}`;

const expr = (e: string, form?: 'expanded' | 'factorised' | 'simplified'): AnswerSpec => (form ? { kind: 'expression', expr: e, form } : { kind: 'expression', expr: e });
const wrong = (code: MistakeCode, e: string, feedback: string): Misconception => ({ code, answer: expr(e), feedback });

function keepExpr(ms: Misconception[], correct: string): Misconception[] {
  const out: Misconception[] = [];
  for (const m of ms) {
    if (m.answer.kind !== 'expression') continue;
    const e = m.answer.expr;
    if (expressionsEquivalent(e, correct)) continue;
    if (out.some((o) => o.answer.kind === 'expression' && expressionsEquivalent(o.answer.expr, e))) continue;
    out.push(m);
  }
  return out;
}

const rootsAns = (vals: number[]): AnswerSpec => ({ kind: 'roots', values: [...new Set(vals)].sort((a, b) => a - b).map((v) => ({ n: v, d: 1 })) });
const rootsTex = (vals: number[]) => [...new Set(vals)].sort((a, b) => a - b).map((v) => `x = ${v}`).join(' \\text{ or } ');

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

// ---- Sums and differences of cubes ----

/** A monomial's variable part: '' (a number), 'x', 'a'. */
const sq = (v: string) => (v ? `${v}^2` : '');
const cubeV = (v: string) => (v ? `${v}^3` : '');
const prod = (u: string, w: string) => (u && w ? `${u}${w}` : u || w);

interface Cube {
  prompt: [number, string][];
  lin: [[number, string], [number, string]];
  quad: [number, string][];
  /** Same, Opposite, Always Positive broken: the sign of the middle term copied from the bracket. */
  soap: [number, string][];
  /** 2ab in the middle, as if it were a perfect square. */
  twice: [number, string][];
}

/** (c1·U)³ + s(c2·W)³ = (c1U + s·c2W)((c1U)² − s·c1c2UW + (c2W)²). */
function cube(c1: number, U: string, c2: number, W: string, s: 1 | -1): Cube {
  return {
    prompt: [
      [c1 ** 3, cubeV(U)],
      [s * c2 ** 3, cubeV(W)],
    ],
    lin: [
      [c1, U],
      [s * c2, W],
    ],
    quad: [
      [c1 * c1, sq(U)],
      [-s * c1 * c2, prod(U, W)],
      [c2 * c2, sq(W)],
    ],
    soap: [
      [c1 * c1, sq(U)],
      [s * c1 * c2, prod(U, W)],
      [c2 * c2, sq(W)],
    ],
    twice: [
      [c1 * c1, sq(U)],
      [-2 * s * c1 * c2, prod(U, W)],
      [c2 * c2, sq(W)],
    ],
  };
}
const bt = (t: [number, string][]) => `(${sum(t)})`;
const bp = (t: [number, string][]) => `(${sumPlain(t)})`;

const CUBE_HINT = '$a^3 - b^3 = (a - b)(a^2 + ab + b^2)$ and $a^3 + b^3 = (a + b)(a^2 - ab + b^2)$. Signs: **s**ame, **o**pposite, **a**lways **p**ositive.';

function cubeMisconceptions(c: Cube, front: string, correct: string): Misconception[] {
  return keepExpr(
    [
      wrong('cube-factor', `${front}${bp(c.lin)}${bp(c.soap)}`, 'The sign of the middle term in the second bracket is the **opposite** of the sign in the first bracket.'),
      wrong('cube-factor', `${front}${bp(c.lin)}${bp(c.twice)}`, 'The middle term is $ab$, not $2ab$: the second bracket is not a perfect square. Expand your answer and you will see the extra terms.'),
      wrong('cube-factor', `${front}${bp(c.lin)}^3`, '$(a - b)^3$ is not $a^3 - b^3$: expanding it gives two extra middle terms.'),
    ],
    correct,
  );
}

// ---------------------------------------------------------------------------
export const productsFactors: QuestionTemplate = {
  id: 'products-factors',
  skillId: 'products-factors',
  generate(rng, level) {
    if (level <= 2) return expansion(rng, level);
    if (level === 3) return grouping(rng);
    if (level === 4) {
      const kind = rng.pick(['x', 'x', 'x', 'const', 'two']);
      let m = rng.int(1, 5);
      let n = rng.int(1, 6);
      while (gcd(m, n) !== 1 || (m === 1 && n === 1 && rng.chance(0.7))) [m, n] = [rng.int(1, 5), rng.int(1, 6)];
      const s = rng.pick([1, -1] as const);
      const c = kind === 'const' ? cube(n, '', m, 'x', -1) : kind === 'two' ? cube(m, 'a', n, 'b', s) : cube(m, 'x', n, '', s);
      const ans = `${bp(c.lin)}${bp(c.quad)}`;
      const vars = kind === 'two' ? ['a', 'b'] : ['x'];
      const a = sum([[c.lin[0][0], c.lin[0][1]]]);
      const b = sum([[Math.abs(c.lin[1][0]), c.lin[1][1]]]);
      const cb = (t: string) => (/[a-z]/.test(t) ? `(${t})^3` : `${t}^3`);
      const minus = c.lin[1][0] < 0;
      return {
        prompt: `Factorise fully: $${sum(c.prompt)}$`,
        input: { kind: 'expression', variables: vars, cubes: true },
        answer: expr(ans, 'factorised'),
        answerDisplay: `$${bt(c.lin)}${bt(c.quad)}$`,
        hints: [`Write each term as a cube: $${sum(c.prompt)} = ${cb(a)} ${minus ? '-' : '+'} ${cb(b)}$.`, CUBE_HINT],
        solution: [
          `$${sum(c.prompt)} = ${cb(a)} ${minus ? '-' : '+'} ${cb(b)}$, a ${minus ? 'difference' : 'sum'} of two cubes with $a = ${a}$ and $b = ${b}$.`,
          `$a^3 ${minus ? '-' : '+'} b^3 = (a ${minus ? '-' : '+'} b)(a^2 ${minus ? '+' : '-'} ab + b^2)$.`,
          `$= ${bt(c.lin)}${bt(c.quad)}$`,
          `The second bracket does not factorise: its discriminant is negative.`,
        ],
        misconceptions: cubeMisconceptions(c, '', ans),
      };
    }
    return fullFactorisation(rng);
  },
};

function expansion(rng: Rng, level: number) {
  const special = level === 2 && rng.chance(0.4);
  let A: P;
  let B: P;
  if (special) {
    // (mx + sn)(m²x² − smnx + n²) = m³x³ + sn³: the product that sums and differences of cubes come from.
    const m = rng.pick([1, 1, 2, 3]);
    const n = rng.int(1, 5);
    const s = rng.pick([1, -1]);
    A = [s * n, m];
    B = [n * n, -s * m * n, m * m];
  } else {
    const a = level === 1 ? 1 : rng.int(2, 3);
    A = [rng.signed(1, 6), a];
    B = [rng.signed(1, 9), rng.signed(1, 6), level === 1 ? 1 : rng.pick([1, 1, 2])];
  }
  const result = pmul(A, B);
  const [p, a] = A as [number, number];
  const aOnly = pmul([0, a], B);
  const pOnly = scale(B, p);
  const firstOnly = padd(aOnly, [0, 0, p * (B[2] as number)]); // p multiplied only the first term of the trinomial
  const signSlip = padd(result, [-2 * p * (B[0] as number)]); // p × last term with the wrong sign
  return {
    prompt: `Expand and simplify $${br(A)}${br(B)}$.`,
    input: { kind: 'expression' as const, variables: ['x'], cubes: true },
    answer: expr(txt(result), 'expanded'),
    answerDisplay: `$${tex(result)}$`,
    hints: ['Multiply **each** term of the first bracket by **every** term of the second: $2 \\times 3 = 6$ products.', special ? 'Collect like terms. Several of them cancel: look at what is left.' : 'Then collect the like terms: the $x^2$ terms together and the $x$ terms together.'],
    solution: [
      `$${tex([0, a])} \\times ${br(B)} = ${tex(aOnly)}$`,
      `$${p < 0 ? `(${p})` : p} \\times ${br(B)} = ${tex(pOnly)}$`,
      `Add and collect like terms: $${tex(result)}$.${special ? ' The $x^2$ and $x$ terms cancel: this is how a sum or difference of cubes is made.' : ''}`,
    ],
    misconceptions: keepExpr(
      [
        wrong('multiply-every-term', txt(firstOnly), `The ${p} must multiply **every** term of the second bracket, not only the first one.`),
        wrong('sign-error', txt(signSlip), `Check the sign of the last product: $${p} \\times ${(B[0] as number) < 0 ? `(${B[0]})` : B[0]} = ${p * (B[0] as number)}$.`),
      ],
      txt(result),
    ),
  };
}

function grouping(rng: Rng) {
  if (rng.chance(0.6)) {
    // x³ + px² + qx + pq = x²(x + p) + q(x + p) = (x + p)(x² + q), with x² + q not factorisable.
    const p = rng.signed(1, 7);
    const q = rng.pick([1, 2, 3, 4, 5, 6, 7, 8, 9, -2, -3, -5, -6, -7]);
    const whole: [number, string][] = [
      [1, 'x^3'],
      [p, 'x^2'],
      [q, 'x'],
      [p * q, ''],
    ];
    const ans = `${brT(lin(p))}(x^2${q < 0 ? '-' : '+'}${Math.abs(q)})`;
    const sq2 = `(${sum([[1, 'x^2'], [q, '']])})`;
    return {
      prompt: `Factorise fully: $${sum(whole)}$`,
      input: { kind: 'expression' as const, variables: ['x'], cubes: true },
      answer: expr(ans, 'factorised'),
      answerDisplay: `$${br(lin(p))}${sq2}$`,
      hints: ['There is no common factor in all four terms. Group them in pairs.', `Take $x^2$ out of the first pair and ${q < 0 ? `$${q}$ (a negative)` : `$${q}$`} out of the second pair. Both brackets should be the same.`],
      solution: [
        `Group in pairs: $(${sum([[1, 'x^3'], [p, 'x^2']])}) ${q < 0 ? '-' : '+'} (${sum([[Math.abs(q), 'x'], [Math.abs(p * q) * Math.sign(p), '']])})$.`,
        `$= x^2${br(lin(p))} ${q < 0 ? '-' : '+'} ${Math.abs(q)}${br(lin(p))}$`,
        `$= ${br(lin(p))}${sq2}$`,
        q > 0 ? `$x^2 + ${q}$ does not factorise.` : `$x^2 - ${-q}$ does not factorise into whole numbers: ${-q} is not a perfect square.`,
      ],
      misconceptions: keepExpr(
        [
          wrong('grouping', `${brT(lin(p))}(x^2${q < 0 ? '+' : '-'}${Math.abs(q)})`, q < 0 ? `When you take out $${q}$, the signs inside the bracket change: $${sum([[q, 'x'], [p * q, '']])} = ${q}(${sum([[1, 'x'], [p, '']])})$.` : `Check the sign of the second factor: the second pair is $+${q}${br(lin(p))}$.`),
          wrong('grouping', `${brT(lin(-p))}(x^2${q < 0 ? '-' : '+'}${Math.abs(q)})`, 'Check the sign in the common bracket: expand your answer and compare.'),
        ],
        ans,
      ),
    };
  }
  // x² + cxy + kx + kcy = x(x + cy) + k(x + cy) = (x + cy)(x + k)
  const c = rng.signed(1, 5);
  const k = rng.signed(1, 7);
  const order: [number, string][] = rng.chance(0.5)
    ? [
        [1, 'x^2'],
        [c, 'xy'],
        [k, 'x'],
        [k * c, 'y'],
      ]
    : [
        [1, 'x^2'],
        [k, 'x'],
        [c, 'xy'],
        [k * c, 'y'],
      ];
  const f1: [number, string][] = [
    [1, 'x'],
    [c, 'y'],
  ];
  const f2: [number, string][] = [
    [1, 'x'],
    [k, ''],
  ];
  const ans = `${bp(f1)}${bp(f2)}`;
  const swapped = order[1]?.[1] === 'x';
  return {
    prompt: `Factorise fully: $${sum(order)}$`,
    input: { kind: 'expression' as const, variables: ['x', 'y'] },
    answer: expr(ans, 'factorised'),
    answerDisplay: `$${bt(f1)}${bt(f2)}$`,
    hints: ['Group the four terms in pairs that share a factor.', swapped ? 'Try $x^2$ with $' + sum([[c, 'xy']]) + '$, and $' + sum([[k, 'x']]) + '$ with $' + sum([[k * c, 'y']]) + '$. You may rearrange the terms first.' : 'Take $x$ out of the first pair and the common number out of the second pair.'],
    solution: [
      `$x^2 ${c < 0 ? '-' : '+'} ${Math.abs(c) === 1 ? '' : Math.abs(c)}xy ${k < 0 ? '-' : '+'} ${Math.abs(k)}x ${k * c < 0 ? '-' : '+'} ${Math.abs(k * c)}y$${swapped ? ' (rearranged)' : ''}`,
      `$= x${bt(f1)} ${k < 0 ? '-' : '+'} ${Math.abs(k)}${bt(f1)}$`,
      `$= ${bt(f1)}${bt(f2)}$`,
    ],
    misconceptions: keepExpr(
      [
        wrong('grouping', `${bp(f1)}${bp([[1, 'x'], [-k, '']])}`, `The second pair is $${sum([[k, 'x'], [k * c, 'y']])} = ${k}${bt(f1)}$, so the second bracket is $${bt(f2)}$. Check the sign.`),
        wrong('grouping', `${bp([[1, 'x'], [-c, 'y']])}${bp(f2)}`, 'Check the sign of the $y$ term in your first bracket: expand your answer and compare.'),
      ],
      ans,
    ),
  };
}

function fullFactorisation(rng: Rng) {
  if (rng.chance(0.55)) {
    // A common factor first, then a sum or difference of cubes: 2x³ − 54 = 2(x − 3)(x² + 3x + 9).
    const byX = rng.chance(0.3);
    const k = byX ? 0 : rng.pick([2, 3, 4, 5]);
    const m = byX ? 1 : rng.pick([1, 1, 2]);
    let n = rng.int(1, 5);
    while (gcd(m, n) !== 1) n = rng.int(1, 5);
    const s = rng.pick([1, -1] as const);
    const c = cube(m, 'x', n, '', s);
    const whole: [number, string][] = byX
      ? [
          [m ** 3, 'x^4'],
          [s * n ** 3, 'x'],
        ]
      : [
          [k * m ** 3, 'x^3'],
          [k * s * n ** 3, ''],
        ];
    const front = byX ? 'x' : String(k);
    const ans = `${front}${bp(c.lin)}${bp(c.quad)}`;
    return {
      prompt: `Factorise fully: $${sum(whole)}$`,
      input: { kind: 'expression' as const, variables: ['x'], cubes: true },
      answer: expr(ans, 'factorised'),
      answerDisplay: `$${front}${bt(c.lin)}${bt(c.quad)}$`,
      hints: [`Always take out a common factor first: here $${front}$.`, `What is left is a ${s < 0 ? 'difference' : 'sum'} of two cubes. ${CUBE_HINT}`],
      solution: [`Common factor: $${sum(whole)} = ${front}(${sum(c.prompt)})$.`, `$${sum(c.prompt)}$ is a ${s < 0 ? 'difference' : 'sum'} of cubes: $${bt(c.lin)}${bt(c.quad)}$.`, `$${sum(whole)} = ${front}${bt(c.lin)}${bt(c.quad)}$`],
      misconceptions: cubeMisconceptions(c, front, ans),
    };
  }
  // Grouping leaves a difference of squares: x³ + px² − s²x − ps² = (x + p)(x − s)(x + s).
  const s = rng.int(1, 6);
  let p = rng.signed(1, 6);
  while (Math.abs(p) === s) p = rng.signed(1, 6);
  const whole: [number, string][] = [
    [1, 'x^3'],
    [p, 'x^2'],
    [-s * s, 'x'],
    [-p * s * s, ''],
  ];
  const ans = `${brT(lin(p))}${brT(lin(-s))}${brT(lin(s))}`;
  return {
    prompt: `Factorise fully: $${sum(whole)}$`,
    input: { kind: 'expression' as const, variables: ['x'], cubes: true },
    answer: expr(ans, 'factorised'),
    answerDisplay: `$${br(lin(p))}${br(lin(-s))}${br(lin(s))}$`,
    hints: ['Group in pairs and take a common factor out of each pair.', `You should get $${br(lin(p))}(x^2 - ${s * s})$. Can either bracket be factorised further?`],
    solution: [`$= x^2${br(lin(p))} - ${s * s}${br(lin(p))}$`, `$= ${br(lin(p))}(x^2 - ${s * s})$`, `$x^2 - ${s * s}$ is a difference of squares: $= ${br(lin(p))}${br(lin(-s))}${br(lin(s))}$`],
    misconceptions: keepExpr([wrong('grouping', `${brT(lin(p))}(x^2+${s * s})`, `Taking out $-${s * s}$ from $${sum([[-s * s, 'x'], [-p * s * s, '']])}$ leaves $${br(lin(p))}$, so the second factor is $x^2 - ${s * s}$, not $x^2 + ${s * s}$.`)], ans),
  };
}

// ---------------------------------------------------------------------------
export const algebraicFractions: QuestionTemplate = {
  id: 'algebraic-fractions',
  skillId: 'algebraic-fractions',
  generate(rng, level) {
    const input = { kind: 'expression' as const, variables: ['x'], fraction: true, cubes: level === 5 };
    const simplifyHints = ['Factorise the top and the bottom fully first.', 'Then cancel factors that are the same on top and bottom. You can only cancel **factors**, never terms.'];

    if (level === 1) {
      const kind = rng.pick(['squares', 'common', 'undefined']);
      if (kind === 'undefined') {
        const p = rng.int(1, 7);
        const q = rng.intExcept(-7, 7, [0, p, -p]);
        const squares = rng.chance(0.5);
        const top = lin(q);
        const bottom: P = squares ? [-p * p, 0, 1] : [0, p, 1];
        const roots = squares ? [p, -p] : [0, -p];
        return {
          prompt: `For which real values of $x$ is $${dfrac(tex(top), tex(bottom))}$ not defined?`,
          input: { kind: 'roots' as const, variable: 'x' },
          answer: rootsAns(roots),
          answerDisplay: `$${rootsTex(roots)}$`,
          hints: ['A fraction is not defined when its denominator is $0$.', `Factorise $${tex(bottom)}$ and set each factor equal to $0$.`],
          solution: [`Denominator: $${tex(bottom)} = ${squares ? `${br(lin(-p))}${br(lin(p))}` : `x${br(lin(p))}`}$.`, `It is $0$ when $${rootsTex(roots)}$, so the fraction is not defined there.`],
          misconceptions: [{ code: 'undefined-value', answer: rootsAns([-q]), feedback: `$x = ${-q}$ makes the **numerator** $0$, so the fraction is $0$ there, which is a value. Look at the denominator.` }],
        };
      }
      if (kind === 'squares') {
        // (x² − p²)/(x ± p) = x ∓ p
        const p = rng.int(1, 9);
        const sgn = rng.pick([1, -1]);
        const ans: P = lin(-sgn * p);
        return {
          prompt: `Simplify: $${dfrac(tex([-p * p, 0, 1]), tex(lin(sgn * p)))}$`,
          input,
          answer: expr(txt(ans), 'simplified'),
          answerDisplay: `$${tex(ans)}$`,
          hints: simplifyHints,
          solution: [`$x^2 - ${p * p}$ is a difference of squares: $${br(lin(-p))}${br(lin(p))}$.`, `$${dfrac(`${br(lin(-p))}${br(lin(p))}`, tex(lin(sgn * p)))} = ${tex(ans)}$ (cancel $${br(lin(sgn * p))}$; $x \\ne ${-sgn * p}$).`],
          misconceptions: keepExpr([wrong('factor-signs', txt(lin(sgn * p)), `Cancel the factor that matches the bottom, $${br(lin(sgn * p))}$; the other factor is what is left.`)], txt(ans)),
        };
      }
      // (kx + kp)/(x² + px) = k/x
      const k = rng.int(2, 9);
      const p = rng.signed(1, 9);
      const ansT = `${k}/x`;
      return {
        prompt: `Simplify: $${dfrac(tex([k * p, k]), tex([0, p, 1]))}$`,
        input,
        answer: expr(ansT, 'simplified'),
        answerDisplay: `$${dfrac(String(k), 'x')}$`,
        hints: simplifyHints,
        solution: [`Top: $${tex([k * p, k])} = ${k}${br(lin(p))}$. Bottom: $${tex([0, p, 1])} = x${br(lin(p))}$.`, `Cancel $${br(lin(p))}$: $${dfrac(String(k), 'x')}$ (with $x \\ne 0$ and $x \\ne ${-p}$).`],
        misconceptions: keepExpr([wrong('cancel-terms', `${k + k * p}/${brT(lin(p))}`, `It looks as if you cancelled an $x$ from separate **terms**. Only factors cancel: factorise to $${dfrac(`${k}${br(lin(p))}`, `x${br(lin(p))}`)}$ first.`)], ansT),
      };
    }

    if (level === 2) {
      if (rng.chance(0.7)) {
        // (x + q)(x + p) / ((x + r)(x + p)) = (x + q)/(x + r)
        const p = rng.signed(1, 7);
        const q = rng.intExcept(-7, 7, [0, p]);
        const r = rng.intExcept(-7, 7, [0, p, q]);
        const top = pmul(lin(q), lin(p));
        const bottom = pmul(lin(r), lin(p));
        const ans = `${brT(lin(q))}/${brT(lin(r))}`;
        return {
          prompt: `Simplify: $${dfrac(tex(top), tex(bottom))}$`,
          input,
          answer: expr(ans, 'simplified'),
          answerDisplay: `$${dfrac(tex(lin(q)), tex(lin(r)))}$`,
          hints: simplifyHints,
          solution: [`$${dfrac(tex(top), tex(bottom))} = ${dfrac(`${br(lin(q))}${br(lin(p))}`, `${br(lin(r))}${br(lin(p))}`)}$`, `Cancel $${br(lin(p))}$: $${dfrac(tex(lin(q)), tex(lin(r)))}$.`],
          misconceptions: keepExpr([wrong('cancel-terms', `(${p * q})/(${p * r})`, `It looks as if you cancelled the $x^2$ and $x$ **terms** and kept the numbers. Only factors cancel: factorise the top and the bottom first.`)], ans),
        };
      }
      // (x² − p²)/(p − x) = −(x + p): p − x = −(x − p)
      const p = rng.int(1, 9);
      const ans: P = [-p, -1];
      return {
        prompt: `Simplify: $${dfrac(tex([-p * p, 0, 1]), `${p} - x`)}$`,
        input,
        answer: expr(txt(ans), 'simplified'),
        answerDisplay: `$${tex(ans)}$`,
        hints: [...simplifyHints, `$${p} - x$ and $x - ${p}$ are the same apart from the sign: $${p} - x = -(x - ${p})$.`],
        solution: [`$${dfrac(`${br(lin(-p))}${br(lin(p))}`, `-${br(lin(-p))}`)}$`, `$= -${br(lin(p))} = ${tex(ans)}$`],
        misconceptions: keepExpr([wrong('sign-error', txt(lin(p)), `$${p} - x = -(x - ${p})$, so cancelling leaves a minus sign: $-${br(lin(p))}$.`)], txt(ans)),
      };
    }

    if (level === 3) {
      const p = rng.int(1, 7);
      if (rng.chance(0.5)) {
        // (x² − p²)/(x² + qx) × kx/(x + p) = k(x − p)/(x + q)
        const q = rng.intExcept(-7, 7, [0, -p, p]);
        const k = rng.int(2, 5);
        const ans = `${k}${brT(lin(-p))}/${brT(lin(q))}`;
        return {
          prompt: `Simplify: $${dfrac(tex([-p * p, 0, 1]), tex([0, q, 1]))} \\times ${dfrac(`${k}x`, tex(lin(p)))}$`,
          input,
          answer: expr(ans, 'simplified'),
          answerDisplay: `$${dfrac(`${k}${br(lin(-p))}`, tex(lin(q)))}$`,
          hints: ['Factorise every top and bottom first.', 'Then cancel factors that appear on any top and any bottom, and multiply what is left.'],
          solution: [
            `$= ${dfrac(`${br(lin(-p))}${br(lin(p))}`, `x${br(lin(q))}`)} \\times ${dfrac(`${k}x`, tex(lin(p)))}$`,
            `Cancel $x$ and $${br(lin(p))}$: $${dfrac(`${k}${br(lin(-p))}`, tex(lin(q)))}$`,
          ],
          misconceptions: keepExpr([wrong('factor-signs', `${k}${brT(lin(p))}/${brT(lin(q))}`, `$x^2 - ${p * p} = ${br(lin(-p))}${br(lin(p))}$. The $${br(lin(p))}$ cancels, so $${br(lin(-p))}$ is left.`)], ans),
        };
      }
      // (x² − p²)/(kx) ÷ (x + p)/x² = x(x − p)/k
      const k = rng.int(2, 6);
      const ans = `x${brT(lin(-p))}/${k}`;
      return {
        prompt: `Simplify: $${dfrac(tex([-p * p, 0, 1]), `${k}x`)} \\div ${dfrac(tex(lin(p)), 'x^2')}$`,
        input,
        answer: expr(ans, 'simplified'),
        answerDisplay: `$${dfrac(`x${br(lin(-p))}`, String(k))}$`,
        hints: ['To divide by a fraction, multiply by its reciprocal: turn the second fraction upside down.', 'Then factorise and cancel.'],
        solution: [`$= ${dfrac(tex([-p * p, 0, 1]), `${k}x`)} \\times ${dfrac('x^2', tex(lin(p)))}$`, `$= ${dfrac(`${br(lin(-p))}${br(lin(p))}`, `${k}x`)} \\times ${dfrac('x^2', tex(lin(p)))}$`, `Cancel $x$ and $${br(lin(p))}$: $${dfrac(`x${br(lin(-p))}`, String(k))}$`],
        misconceptions: keepExpr([wrong('divide-fraction', `(x^2-${p * p})${brT(lin(p))}/(${k}x^3)`, 'You multiplied by the second fraction. Dividing means multiplying by its **reciprocal**: turn it upside down first.')], ans),
      };
    }

    if (level === 4) {
      if (rng.chance(0.5)) {
        // a/(x + p) ± b/(x + q)
        const a = rng.int(1, 6);
        const b = rng.int(1, 6);
        const p = rng.signed(1, 6);
        const q = rng.intExcept(-6, 6, [0, p]);
        const sg = rng.pick([1, -1]);
        const N = padd(scale(lin(q), a), scale(lin(p), sg * b));
        const D = pmul(lin(p), lin(q));
        const ans = `${brT(N)}/(${brT(lin(p))}${brT(lin(q))})`;
        const op = sg < 0 ? '-' : '+';
        const ms: Misconception[] = [wrong('fraction-lcd', `${a + sg * b}/(2x${p + q < 0 ? '-' : '+'}${Math.abs(p + q)})`, 'You added the tops and added the bottoms. Fractions need a common denominator first: here $' + `${br(lin(p))}${br(lin(q))}` + '$.')];
        if (sg < 0) ms.push(wrong('subtract-numerator', `${brT(padd(scale(lin(q), a), [b * p, -b]))}/(${brT(lin(p))}${brT(lin(q))})`, `The minus sign subtracts the whole of $${b}${br(lin(p))}$: $-${b}${br(lin(p))} = ${tex(scale(lin(p), -b))}$.`));
        return {
          prompt: `Simplify: $${dfrac(String(a), tex(lin(p)))} ${op} ${dfrac(String(b), tex(lin(q)))}$`,
          input,
          answer: expr(ans, 'simplified'),
          answerDisplay: `$${dfrac(tex(N), `${br(lin(p))}${br(lin(q))}`)}$`,
          hints: [`The lowest common denominator is $${br(lin(p))}${br(lin(q))}$.`, 'Multiply each top by the factor its bottom is missing, then add the tops. Keep brackets when you subtract.'],
          solution: [
            `$= ${dfrac(`${a}${br(lin(q))} ${op} ${b}${br(lin(p))}`, `${br(lin(p))}${br(lin(q))}`)}$`,
            `$= ${dfrac(tex(N), `${br(lin(p))}${br(lin(q))}`)}$`,
            `Check: the top has no factor $${br(lin(p))}$ or $${br(lin(q))}$, so this is fully simplified. You may also write the bottom as $${tex(D)}$.`,
          ],
          misconceptions: keepExpr(ms, ans),
        };
      }
      // a/(x − p) + c/(x² − p²): the LCD is (x − p)(x + p)
      const p = rng.int(1, 6);
      const a = rng.int(1, 5);
      const cancels = rng.chance(0.5);
      let c = -2 * a * p;
      if (!cancels) while (c === -2 * a * p || c === 0) c = rng.signed(1, 9);
      const N = padd(scale(lin(p), a), [c]);
      const ans = cancels ? `${a}/${brT(lin(p))}` : `${brT(N)}/(x^2-${p * p})`;
      const display = cancels ? dfrac(String(a), tex(lin(p))) : dfrac(tex(N), `${br(lin(-p))}${br(lin(p))}`);
      return {
        prompt: `Simplify: $${dfrac(String(a), tex(lin(-p)))} ${c < 0 ? '-' : '+'} ${dfrac(String(Math.abs(c)), `x^2 - ${p * p}`)}$`,
        input,
        answer: expr(ans, 'simplified'),
        answerDisplay: `$${display}$`,
        hints: [`Factorise the second denominator: $x^2 - ${p * p} = ${br(lin(-p))}${br(lin(p))}$. That is the LCD.`, 'Multiply the first top by the factor its bottom is missing, add the tops, then check whether anything cancels.'],
        solution: [
          `$= ${dfrac(`${a}${br(lin(p))} ${c < 0 ? '-' : '+'} ${Math.abs(c)}`, `${br(lin(-p))}${br(lin(p))}`)} = ${dfrac(tex(N), `${br(lin(-p))}${br(lin(p))}`)}$`,
          cancels ? `The top is $${a}${br(lin(-p))}$, so cancel $${br(lin(-p))}$: $${display}$.` : `The top has no factor $${br(lin(-p))}$ or $${br(lin(p))}$, so this is fully simplified.`,
        ],
        misconceptions: keepExpr([wrong('fraction-lcd', `${a + c}/(x^2+x-${p * p + p})`, 'You added the tops and added the bottoms. Use the common denominator $' + `${br(lin(-p))}${br(lin(p))}` + '$ instead.')], ans),
      };
    }

    // Level 5: denominators with cubes
    let n = rng.int(1, 6);
    const s = rng.pick([1, -1]); // x³ + s n³
    const cubeDen: P = [s * n ** 3, 0, 0, 1];
    const quad: P = [n * n, -s * n, 1];
    const kind = rng.pick(['one', 'squares', 'undefined']);
    if (kind === 'undefined') {
      const q = rng.intExcept(-7, 7, [0, s * n]);
      return {
        prompt: `For which real values of $x$ is $${dfrac(tex(lin(q)), tex(cubeDen))}$ not defined?`,
        input: { kind: 'roots' as const, variable: 'x' },
        answer: rootsAns([-s * n]),
        answerDisplay: `$x = ${-s * n}$`,
        hints: ['A fraction is not defined when its denominator is $0$.', `Factorise $${tex(cubeDen)}$ as a ${s < 0 ? 'difference' : 'sum'} of cubes. Can the second factor ever be $0$?`],
        solution: [`$${tex(cubeDen)} = ${br(lin(s * n))}${br(quad)}$.`, `$${tex(quad)}$ is never $0$: its discriminant is $${n * n} - ${4 * n * n} < 0$.`, `So the only value is $x = ${-s * n}$.`],
        misconceptions: [
          { code: 'undefined-value', answer: rootsAns([n, -n]), feedback: `Only $x = ${-s * n}$ makes $${tex(cubeDen)} = 0$: a cube has one real cube root. Check $x = ${s * n}$: the denominator is $${2 * s * n ** 3}$.` },
          { code: 'undefined-value', answer: rootsAns([-q]), feedback: `$x = ${-q}$ makes the **numerator** $0$. Look at the denominator.` },
        ],
      };
    }
    if (kind === 'squares') {
      // (x² − n²)/(x³ ∓ n³) = (x ± n)/(x² ± nx + n²) after cancelling (x ∓ n)
      if (n === 1 && rng.chance(0.5)) n = 2;
      const qd: P = [n * n, -s * n, 1];
      const keep = lin(-s * n);
      const ans = `${brT(keep)}/${brT(qd)}`;
      return {
        prompt: `Simplify: $${dfrac(tex([-n * n, 0, 1]), tex([s * n ** 3, 0, 0, 1]))}$`,
        input,
        answer: expr(ans, 'simplified'),
        answerDisplay: `$${dfrac(tex(keep), tex(qd))}$`,
        hints: ['Factorise the top as a difference of squares and the bottom as a ' + (s < 0 ? 'difference' : 'sum') + ' of cubes.', CUBE_HINT],
        solution: [`$= ${dfrac(`${br(lin(-n))}${br(lin(n))}`, `${br(lin(s * n))}${br(qd)}`)}$`, `Cancel $${br(lin(s * n))}$: $${dfrac(tex(keep), tex(qd))}$`],
        misconceptions: keepExpr([wrong('cube-factor', `${brT(keep)}/${brT([n * n, s * n, 1])}`, `Check the sign of the middle term in the second factor of $${tex([s * n ** 3, 0, 0, 1])}$: it is the **opposite** of the sign in the first bracket.`)], ans),
      };
    }
    // (x² − snx + n²)/(x³ + sn³) = 1/(x + sn)
    const ans = `1/${brT(lin(s * n))}`;
    return {
      prompt: `Simplify: $${dfrac(tex(quad), tex(cubeDen))}$`,
      input,
      answer: expr(ans, 'simplified'),
      answerDisplay: `$${dfrac('1', tex(lin(s * n)))}$`,
      hints: [`Factorise the bottom as a ${s < 0 ? 'difference' : 'sum'} of cubes.`, CUBE_HINT],
      solution: [`$${tex(cubeDen)} = ${br(lin(s * n))}${br(quad)}$.`, `$= ${dfrac(tex(quad), `${br(lin(s * n))}${br(quad)}`)} = ${dfrac('1', tex(lin(s * n)))}$`],
      misconceptions: keepExpr([wrong('cube-factor', `1/${brT(lin(-s * n))}`, `$${tex(cubeDen)} = ${br(lin(s * n))}${br(quad)}$: check the sign in the first bracket.`)], ans),
    };
  },
};
