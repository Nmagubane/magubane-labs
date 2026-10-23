import type { QuestionTemplate, Misconception, AnswerSpec } from '../types.ts';
import { sum, sumPlain, binomial, frac, fmt } from '../tex.ts';
import { rat, ratTex, eq as req, type Rational } from '../rational.ts';
import { expressionsEquivalent } from '../expr.ts';

const exprAns = (expr: string, form?: 'expanded' | 'factorised'): AnswerSpec => (form ? { kind: 'expression', expr, form } : { kind: 'expression', expr });

/** Keep expression misconceptions that are genuinely different from the answer and each other. */
function keepExpr(ms: Misconception[], correct: string): Misconception[] {
  const out: Misconception[] = [];
  for (const m of ms) {
    if (m.answer.kind !== 'expression') continue;
    const candidate = m.answer.expr;
    if (expressionsEquivalent(candidate, correct)) continue;
    if (out.some((o) => o.answer.kind === 'expression' && expressionsEquivalent(o.answer.expr, candidate))) continue;
    out.push(m);
  }
  return out;
}

const plain = (terms: [number, string][]) => sumPlain(terms);

// ---------------------------------------------------------------------------
export const likeTerms: QuestionTemplate = {
  id: 'like-terms',
  skillId: 'like-terms',
  generate(rng, level) {
    const hints = ['Like terms have exactly the same letters and powers. Group them first.'];
    if (level <= 2) {
      const a = rng.int(2, 9);
      const b = rng.signed(1, 9);
      const c = rng.int(1, 9);
      const d = level === 2 ? rng.signed(1, 9) : 0;
      const terms: [number, string][] = level === 1 ? [[a, 'x'], [c, ''], [b, 'x']] : [[a, 'x'], [c, 'y'], [b, 'x'], [d, 'y']];
      const result: [number, string][] = level === 1 ? [[a + b, 'x'], [c, '']] : [[a + b, 'x'], [c + d, 'y']];
      const wrongSign: [number, string][] = level === 1 ? [[a - b, 'x'], [c, '']] : [[a - b, 'x'], [c - d, 'y']];
      return {
        prompt: `Simplify $${sum(terms)}$.`,
        input: { kind: 'expression', variables: level === 1 ? ['x'] : ['x', 'y'] },
        answer: exprAns(plain(result), 'expanded'),
        answerDisplay: `$${sum(result)}$`,
        hints: [...hints, level === 1 ? 'Combine the $x$ terms. The number on its own stays as it is.' : 'Combine the $x$ terms, then combine the $y$ terms.'],
        solution: [
          `Group like terms: $${sum([[a, 'x'], [b, 'x']])}$${level === 2 ? ` and $${sum([[c, 'y'], [d, 'y']])}$` : ''}.`,
          `Result: $${sum(result)}$.`,
        ],
        misconceptions: keepExpr(
          [
            { code: 'sign-error', answer: exprAns(plain(wrongSign)), feedback: 'Check the sign in front of each term. The sign belongs to the term after it.' },
            ...(level === 1 ? [{ code: 'like-terms' as const, answer: exprAns(`${a + b + c}x`), feedback: `The ${c} has no $x$, so it can't be combined with the $x$ terms.` }] : []),
          ],
          plain(result),
        ),
      };
    }
    if (level <= 4) {
      const a = rng.int(2, 7);
      const b = rng.signed(1, 9);
      const c = -rng.int(1, a + 3);
      const d = rng.signed(1, 12);
      const e = level === 4 ? rng.signed(1, 6) : 0;
      const terms: [number, string][] = [[a, 'x^2'], [b, 'x'], [c, 'x^2'], [d, ''], [e, 'x']];
      const result: [number, string][] = [[a + c, 'x^2'], [b + e, 'x'], [d, '']];
      const wrong: [number, string][] = [[a + c + b + e, 'x^2'], [d, '']];
      return {
        prompt: `Simplify $${sum(terms)}$.`,
        input: { kind: 'expression', variables: ['x'] },
        answer: exprAns(plain(result), 'expanded'),
        answerDisplay: `$${sum(result)}$`,
        hints: [...hints, '$x^2$ and $x$ are **not** like terms. Keep them separate.'],
        solution: [`$x^2$ terms: $${sum([[a, 'x^2'], [c, 'x^2']])} = ${sum([[a + c, 'x^2']])}$.`, `$x$ terms: $${sum([[b, 'x'], [e, 'x']])} = ${sum([[b + e, 'x']])}$.`, `Result: $${sum(result)}$.`],
        misconceptions: keepExpr(
          [
            { code: 'like-terms', answer: exprAns(plain(wrong)), feedback: 'You combined $x^2$ terms with $x$ terms. They are different, like apples and boxes of apples.' },
            { code: 'sign-error', answer: exprAns(plain([[a - c, 'x^2'], [b + e, 'x'], [d, '']])), feedback: `Check the sign of the $${sum([[c, 'x^2']])}$ term.` },
          ],
          plain(result),
        ),
      };
    }
    const a = rng.int(2, 6);
    const b = rng.signed(1, 6);
    const c = rng.signed(1, 5);
    const d = rng.signed(1, 6);
    const e = rng.signed(1, 5);
    const terms: [number, string][] = [[a, 'xy'], [b, 'x'], [c, 'yx'], [d, 'y'], [e, 'x']];
    const result: [number, string][] = [[a + c, 'xy'], [b + e, 'x'], [d, 'y']];
    return {
      prompt: `Simplify $${sum(terms)}$.`,
      input: { kind: 'expression', variables: ['x', 'y'] },
      answer: exprAns(plain(result), 'expanded'),
      answerDisplay: `$${sum(result)}$`,
      hints: [...hints, '$xy$ and $yx$ are the same term, because multiplication can be done in any order.'],
      solution: [`$xy$ terms: $${sum([[a, 'xy'], [c, 'xy']])} = ${sum([[a + c, 'xy']])}$.`, `$x$ terms: $${sum([[b, 'x'], [e, 'x']])} = ${sum([[b + e, 'x']])}$.`, `Result: $${sum(result)}$.`],
      misconceptions: keepExpr(
        [
          { code: 'like-terms', answer: exprAns(plain([[a + c + b + e, 'xy'], [d, 'y']])), feedback: '$xy$ and $x$ are different terms, so they cannot be combined.' },
          { code: 'sign-error', answer: exprAns(plain([[a + c, 'xy'], [b - e, 'x'], [d, 'y']])), feedback: `Check the sign of the $${sum([[e, 'x']])}$ term.` },
        ],
        plain(result),
      ),
    };
  },
};

// ---------------------------------------------------------------------------
export const expandBrackets: QuestionTemplate = {
  id: 'expand-brackets',
  skillId: 'expand-brackets',
  generate(rng, level) {
    if (level <= 2) {
      const a = level === 1 ? rng.int(2, 9) : -rng.int(2, 9);
      const b = rng.int(1, 6);
      const c = level === 1 ? rng.signed(1, 9) : -rng.int(1, 9);
      const result: [number, string][] = [[a * b, 'x'], [a * c, '']];
      const lhs = `${a === -1 ? '-' : fmt(a)}(${sum([[b, 'x'], [c, '']])})`;
      return {
        prompt: `Expand and simplify $${lhs}$.`,
        input: { kind: 'expression', variables: ['x'] },
        answer: exprAns(plain(result), 'expanded'),
        answerDisplay: `$${sum(result)}$`,
        hints: ['The number outside multiplies **every** term inside the bracket.', ...(a < 0 ? ['A negative times a negative is positive.'] : [])],
        solution: [`$${fmt(a)} \\times ${b}x = ${sum([[a * b, 'x']])}$.`, `$${fmt(a)} \\times ${c < 0 ? `(${c})` : c} = ${a * c}$.`, `Result: $${sum(result)}$.`],
        misconceptions: keepExpr(
          [
            { code: 'distribute-first-only', answer: exprAns(plain([[a * b, 'x'], [c, '']])), feedback: `You multiplied only the first term. The ${a} multiplies the ${c} too.` },
            { code: 'sign-error', answer: exprAns(plain([[a * b, 'x'], [-a * c, '']])), feedback: 'Check the sign of the second term: negative × negative is positive.' },
          ],
          plain(result),
        ),
      };
    }
    if (level === 3) {
      const p = rng.signed(1, 9);
      const q = rng.signed(1, 9);
      const result: [number, string][] = [[1, 'x^2'], [p + q, 'x'], [p * q, '']];
      return {
        prompt: `Expand and simplify $${binomial(1, 'x', p)}${binomial(1, 'x', q)}$.`,
        input: { kind: 'expression', variables: ['x'] },
        answer: exprAns(plain(result), 'expanded'),
        answerDisplay: `$${sum(result)}$`,
        hints: ['Multiply every term in the first bracket by every term in the second bracket: four products in total.', 'Then collect the two $x$ terms.'],
        solution: [
          `$x \\cdot x = x^2$, $x \\cdot ${q < 0 ? `(${q})` : q} = ${sum([[q, 'x']])}$, $${p} \\cdot x = ${sum([[p, 'x']])}$, $${p} \\cdot ${q < 0 ? `(${q})` : q} = ${p * q}$.`,
          `Collect: $${sum(result)}$.`,
        ],
        misconceptions: keepExpr(
          [
            { code: 'missing-middle-term', answer: exprAns(plain([[1, 'x^2'], [p * q, '']])), feedback: 'You multiplied first × first and last × last only. The two "outer" and "inner" products give the middle term.' },
            { code: 'sign-error', answer: exprAns(plain([[1, 'x^2'], [p + q, 'x'], [-p * q, '']])), feedback: `Check the sign of the constant: $${p} \\times ${q < 0 ? `(${q})` : q}$.` },
          ],
          plain(result),
        ),
      };
    }
    if (level === 4) {
      const a = rng.int(2, 4);
      const b = rng.int(1, 3);
      const p = rng.signed(1, 7);
      const q = rng.signed(1, 7);
      const result: [number, string][] = [[a * b, 'x^2'], [a * q + b * p, 'x'], [p * q, '']];
      return {
        prompt: `Expand and simplify $${binomial(a, 'x', p)}${binomial(b, 'x', q)}$.`,
        input: { kind: 'expression', variables: ['x'] },
        answer: exprAns(plain(result), 'expanded'),
        answerDisplay: `$${sum(result)}$`,
        hints: ['Four products: first × first, outer, inner, last × last.', `The $x$ terms come from $${a}x \\times ${q < 0 ? `(${q})` : q}$ and $${p} \\times ${b === 1 ? '' : b}x$.`],
        solution: [`First: $${a}x \\cdot ${b === 1 ? '' : b}x = ${sum([[a * b, 'x^2']])}$.`, `Outer + inner: $${sum([[a * q, 'x'], [b * p, 'x']])} = ${sum([[a * q + b * p, 'x']])}$.`, `Last: $${p * q}$.`, `Result: $${sum(result)}$.`],
        misconceptions: keepExpr([{ code: 'missing-middle-term', answer: exprAns(plain([[a * b, 'x^2'], [p * q, '']])), feedback: 'The middle term is missing. Multiply the outer and inner pairs too.' }], plain(result)),
      };
    }
    const p = rng.signed(1, 9);
    const result: [number, string][] = [[1, 'x^2'], [2 * p, 'x'], [p * p, '']];
    return {
      prompt: `Expand and simplify $${binomial(1, 'x', p)}^2$.`,
      input: { kind: 'expression', variables: ['x'] },
      answer: exprAns(plain(result), 'expanded'),
      answerDisplay: `$${sum(result)}$`,
      hints: [`Write it out in full: $${binomial(1, 'x', p)}${binomial(1, 'x', p)}$.`, 'Now multiply every term by every term.'],
      solution: [`$${binomial(1, 'x', p)}^2 = ${binomial(1, 'x', p)}${binomial(1, 'x', p)}$.`, `$= x^2 ${sum([[p, 'x'], [p, 'x']]).startsWith('-') ? '' : '+'} ${sum([[p, 'x'], [p, 'x']])} + ${p * p}$.`, `$= ${sum(result)}$.`],
      misconceptions: keepExpr([{ code: 'missing-middle-term', answer: exprAns(plain([[1, 'x^2'], [p * p, '']])), feedback: `$(x ${p < 0 ? '-' : '+'} ${Math.abs(p)})^2$ is not $x^2 + ${p * p}$. Squaring a bracket gives a middle term of $${sum([[2 * p, 'x']])}$.` }], plain(result)),
    };
  },
};

// ---------------------------------------------------------------------------
export const factoriseTrinomial: QuestionTemplate = {
  id: 'factorise-trinomial',
  skillId: 'factorise-trinomial',
  generate(rng, level) {
    let k = 1;
    let a = 1;
    let p: number;
    let q: number;
    if (level === 1) {
      p = rng.int(1, 7);
      q = rng.int(1, 7);
    } else if (level === 2) {
      p = rng.int(1, 9);
      q = -rng.intExcept(1, 9, [p]);
    } else if (level === 3) {
      p = -rng.int(1, 9);
      q = -rng.int(1, 9);
    } else if (level === 4) {
      k = rng.int(2, 5);
      p = rng.signed(1, 6);
      q = rng.signed(1, 6);
    } else {
      a = rng.pick([2, 3, 5]);
      p = rng.signed(1, 7);
      q = rng.signed(1, 5);
      if (p % a === 0) p += p > 0 ? 1 : -1;
    }
    // expression = k (a x + p)(x + q)
    const A = k * a;
    const B = k * (a * q + p);
    const C = k * p * q;
    const expanded: [number, string][] = [[A, 'x^2'], [B, 'x'], [C, '']];
    const factorTex = `${k > 1 ? k : ''}${binomial(a, 'x', p)}${binomial(1, 'x', q)}`;
    const factorPlain = factorTex.replace(/\s+/g, '');
    const wrongSigns = `${k > 1 ? k : ''}${binomial(a, 'x', -p)}${binomial(1, 'x', -q)}`.replace(/\s+/g, '');
    const hints =
      level === 4
        ? [`All three terms share a common factor. Take out ${k} first.`, `Then factorise $${sum([[a, 'x^2'], [a * q + p, 'x'], [p * q, '']])}$.`]
        : level === 5
          ? [`Look for two numbers that multiply to $${A} \\times ${C} = ${A * C}$ and add to $${B}$.`, 'Split the middle term using those numbers, then group in pairs.']
          : [`Find two numbers that multiply to ${C} and add to ${B}.`, C < 0 ? 'The constant is negative, so the two numbers have opposite signs.' : B < 0 ? 'Both numbers must be negative.' : 'Both numbers are positive.'];
    return {
      prompt: `Factorise fully: $${sum(expanded)}$`,
      input: { kind: 'expression', variables: ['x'] },
      answer: exprAns(factorPlain, 'factorised'),
      answerDisplay: `$${factorTex}$`,
      hints,
      solution: [
        ...(k > 1 ? [`Common factor: $${sum(expanded)} = ${k}(${sum([[a, 'x^2'], [a * q + p, 'x'], [p * q, '']])})$.`] : []),
        level === 5
          ? `Numbers that multiply to ${A * C} and add to ${B}: ${a * q} and ${p}. So $${sum([[A, 'x^2'], [k * a * q, 'x'], [k * p, 'x'], [C, '']])}$.`
          : `The two numbers are ${p} and ${q}: $${p} \\times ${q < 0 ? `(${q})` : q} = ${p * q}$ and $${p} ${q < 0 ? '-' : '+'} ${Math.abs(q)} = ${p + q}$.`,
        `$${factorTex}$`,
        'Check by expanding: you should get back the original expression.',
      ],
      misconceptions: keepExpr([{ code: 'factor-signs', answer: exprAns(wrongSigns), feedback: 'Your factors multiply to give the right constant, but the middle term comes out with the wrong sign.' }], factorPlain),
    };
  },
};

// ---------------------------------------------------------------------------
const fracAnswer = (r: Rational): AnswerSpec => ({ kind: 'fraction', n: r.n, d: r.d, requireSimplest: false });

function keepRat(ms: { code: Misconception['code']; value: Rational | null; feedback: string }[], correct: Rational): Misconception[] {
  const out: Misconception[] = [];
  const seen: Rational[] = [correct];
  for (const m of ms) {
    if (!m.value) continue;
    if (seen.some((s) => req(s, m.value as Rational))) continue;
    seen.push(m.value);
    out.push({ code: m.code, answer: fracAnswer(m.value), feedback: m.feedback });
  }
  return out;
}

const safeRat = (n: number, d: number): Rational | null => (d === 0 || !Number.isInteger(n) || !Number.isInteger(d) ? null : rat(n, d));

export const linearEquations: QuestionTemplate = {
  id: 'linear-equations',
  skillId: 'linear-equations',
  generate(rng, level) {
    const input = { kind: 'fraction' as const, prefix: 'x =' };
    if (level === 1) {
      const x = rng.signed(1, 12);
      const a = rng.int(2, 9);
      const c = a * x;
      return {
        prompt: `Solve for $x$: $${a}x = ${c}$`,
        input,
        answer: fracAnswer(rat(x)),
        answerDisplay: `$x = ${x}$`,
        hints: [`$${a}x$ means $${a} \\times x$. What undoes multiplying by ${a}?`],
        solution: [`Divide both sides by ${a}: $x = \\dfrac{${c}}{${a}} = ${x}$.`],
        misconceptions: keepRat([{ code: 'inverse-operation', value: rat(c - a), feedback: `You subtracted ${a}, but $${a}x$ means ${a} **times** $x$. Divide instead.` }], rat(x)),
      };
    }
    if (level === 2) {
      const x = rng.signed(1, 10);
      const a = rng.int(2, 9);
      const b = rng.signed(1, 15);
      const c = a * x + b;
      return {
        prompt: `Solve for $x$: $${sum([[a, 'x'], [b, '']])} = ${c}$`,
        input,
        answer: fracAnswer(rat(x)),
        answerDisplay: `$x = ${x}$`,
        hints: ['Undo the operations in reverse order. Deal with the constant first.', `${b > 0 ? `Subtract ${b} from` : `Add ${-b} to`} both sides.`],
        solution: [`${b > 0 ? `Subtract ${b} from` : `Add ${-b} to`} both sides: $${a}x = ${c - b}$.`, `Divide both sides by ${a}: $x = ${x}$.`],
        misconceptions: keepRat(
          [
            { code: 'inverse-operation', value: safeRat(c + b, a), feedback: `To remove $${b > 0 ? '+' : '-'}${Math.abs(b)}$ you need the opposite operation: ${b > 0 ? 'subtract' : 'add'} ${Math.abs(b)}.` },
            { code: 'one-side-only', value: safeRat(c - a * b, a), feedback: `When you divided by ${a}, you divided ${c} but not the ${Math.abs(b)}. Every term must be divided.` },
          ],
          rat(x),
        ),
      };
    }
    if (level === 3) {
      const x = rng.signed(1, 9);
      const a = rng.int(2, 6);
      const b = rng.signed(1, 9);
      const c = a * (x + b);
      return {
        prompt: `Solve for $x$: $${a}(${sum([[1, 'x'], [b, '']])}) = ${c}$`,
        input,
        answer: fracAnswer(rat(x)),
        answerDisplay: `$x = ${x}$`,
        hints: [`You can divide both sides by ${a} first, or expand the bracket.`, `Dividing by ${a} gives $${sum([[1, 'x'], [b, '']])} = ${c / a}$.`],
        solution: [`Divide both sides by ${a}: $${sum([[1, 'x'], [b, '']])} = ${c / a}$.`, `${b > 0 ? `Subtract ${b}` : `Add ${-b}`}: $x = ${x}$.`],
        misconceptions: keepRat([{ code: 'distribute-first-only', value: safeRat(c - b, a), feedback: `If you expand, the ${a} multiplies the ${b} too: $${a}x ${a * b < 0 ? '-' : '+'} ${Math.abs(a * b)}$.` }], rat(x)),
      };
    }
    if (level === 4) {
      const x = rng.signed(1, 8);
      const a = rng.int(3, 9);
      const c = rng.intExcept(1, a + 4, [a]);
      const b = rng.signed(1, 12);
      const d = (a - c) * x + b;
      return {
        prompt: `Solve for $x$: $${sum([[a, 'x'], [b, '']])} = ${sum([[c, 'x'], [d, '']])}$`,
        input,
        answer: fracAnswer(rat(x)),
        answerDisplay: `$x = ${x}$`,
        hints: ['Get all the $x$ terms on one side and the numbers on the other.', `Subtract $${c}x$ from both sides first.`],
        solution: [`Subtract $${c}x$ from both sides: $${sum([[a - c, 'x'], [b, '']])} = ${d}$.`, `${b > 0 ? `Subtract ${b}` : `Add ${-b}`}: $${sum([[a - c, 'x']])} = ${d - b}$.`, `Divide by ${a - c}: $x = ${x}$.`],
        misconceptions: keepRat(
          [
            { code: 'sign-error', value: safeRat(d - b, a + c), feedback: `Moving $${c}x$ to the left means subtracting it: $${a}x - ${c}x$, not $${a}x + ${c}x$.` },
            { code: 'inverse-operation', value: safeRat(d + b, a - c), feedback: `To move the ${b} you need to ${b > 0 ? 'subtract' : 'add'} it on both sides.` },
          ],
          rat(x),
        ),
      };
    }
    // level 5: fractional answer, or x/a + b = c
    if (rng.chance(0.5)) {
      const a = rng.int(2, 9);
      const b = rng.signed(1, 9);
      let num = rng.signed(1, 20);
      while (num % a === 0) num = rng.signed(1, 20);
      const cc = num + b;
      const sol = rat(num, a);
      return {
        prompt: `Solve for $x$: $${sum([[a, 'x'], [b, '']])} = ${cc}$. Give your answer as a fraction.`,
        input,
        answer: fracAnswer(sol),
        answerDisplay: `$x = ${ratTex(sol)}$`,
        hints: ['Same steps as always. The answer just won\'t be a whole number.', `After ${b > 0 ? 'subtracting' : 'adding'} ${Math.abs(b)}, you get $${a}x = ${cc - b}$.`],
        solution: [`$${a}x = ${cc - b}$.`, `$x = \\dfrac{${cc - b}}{${a}}${sol.d !== a ? ` = ${ratTex(sol)}` : ''}$.`],
        misconceptions: keepRat([{ code: 'inverse-operation', value: safeRat(cc + b, a), feedback: `To remove $${b > 0 ? '+' : '-'}${Math.abs(b)}$, ${b > 0 ? 'subtract' : 'add'} it on both sides.` }], sol),
      };
    }
    const a = rng.int(2, 6);
    const x = a * rng.signed(1, 6);
    const b = rng.signed(1, 9);
    const c = x / a + b;
    return {
      prompt: `Solve for $x$: $\\dfrac{x}{${a}} ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${c}$`,
      input,
      answer: fracAnswer(rat(x)),
      answerDisplay: `$x = ${x}$`,
      hints: [`Deal with the ${Math.abs(b)} first, then undo dividing by ${a}.`],
      solution: [`${b > 0 ? `Subtract ${b}` : `Add ${-b}`}: $\\dfrac{x}{${a}} = ${c - b}$.`, `Multiply both sides by ${a}: $x = ${x}$.`],
      misconceptions: keepRat([{ code: 'inverse-operation', value: safeRat(c - b, a), feedback: `$\\frac{x}{${a}}$ is $x$ divided by ${a}. Undo it by **multiplying** by ${a}.` }], rat(x)),
    };
  },
};

// ---------------------------------------------------------------------------
export const quadraticEquations: QuestionTemplate = {
  id: 'quadratic-equations',
  skillId: 'quadratic-equations',
  generate(rng, level) {
    const rootsAns = (vals: Rational[]): AnswerSpec => ({ kind: 'roots', values: vals.map((v) => ({ n: v.n, d: v.d })) });
    const rootsTex = (vals: Rational[]) => vals.map((v) => `x = ${ratTex(v)}`).join(' \\text{ or } ');
    const negated = (vals: Rational[]) => vals.map((v) => rat(-v.n, v.d));
    const signMs = (vals: Rational[]): Misconception[] =>
      vals.every((v) => v.n === 0) ? [] : [{ code: 'root-sign', answer: rootsAns(negated(vals)), feedback: 'Your roots have the wrong signs. Set each bracket equal to zero and solve it: if $x + 3 = 0$ then $x = -3$.' }];

    if (level === 1) {
      const p = rng.signed(1, 9);
      const q = rng.intExcept(-9, 9, [0, p]);
      const roots = [rat(-p), rat(-q)];
      return {
        prompt: `Solve for $x$: $${binomial(1, 'x', p)}${binomial(1, 'x', q)} = 0$`,
        input: { kind: 'roots', count: 2, variable: 'x' },
        answer: rootsAns(roots),
        answerDisplay: `$${rootsTex(roots)}$`,
        hints: ['If two things multiply to give 0, at least one of them must be 0.', 'Set each bracket equal to zero.'],
        solution: [`$${sum([[1, 'x'], [p, '']])} = 0$ or $${sum([[1, 'x'], [q, '']])} = 0$.`, `$${rootsTex(roots)}$.`],
        misconceptions: signMs(roots),
      };
    }
    if (level === 4) {
      const b = rng.signed(1, 9);
      const roots = [rat(0), rat(-b)];
      return {
        prompt: `Solve for $x$: $${sum([[1, 'x^2'], [b, 'x']])} = 0$`,
        input: { kind: 'roots', count: 2, variable: 'x' },
        answer: rootsAns(roots),
        answerDisplay: `$${rootsTex(roots)}$`,
        hints: ['Both terms contain $x$. Take out the common factor.', `$x(${sum([[1, 'x'], [b, '']])}) = 0$. Now use the zero-product rule.`],
        solution: [`Common factor: $x(${sum([[1, 'x'], [b, '']])}) = 0$.`, `$x = 0$ or $${sum([[1, 'x'], [b, '']])} = 0$.`, `$${rootsTex(roots)}$.`],
        misconceptions: [
          ...signMs(roots),
          { code: 'not-fully-factorised', answer: rootsAns([rat(-b)]), feedback: 'Dividing both sides by $x$ loses a solution. $x = 0$ is a solution too. Factorise instead.' },
        ],
      };
    }
    if (level === 5) {
      const a = 2;
      const p = rng.pick([1, 3, 5, -1, -3, -5]);
      const q = rng.signed(1, 6);
      // (2x + p)(x + q) = 0
      const A = a;
      const B = a * q + p;
      const C = p * q;
      const roots = [rat(-p, a), rat(-q)];
      return {
        prompt: `Solve for $x$: $${sum([[A, 'x^2'], [B, 'x'], [C, '']])} = 0$`,
        input: { kind: 'roots', count: 2, variable: 'x' },
        answer: rootsAns(roots),
        answerDisplay: `$${rootsTex(roots)}$`,
        hints: [`Factorise: look for two numbers that multiply to $${A} \\times ${C} = ${A * C}$ and add to ${B}.`, 'One root will be a fraction.'],
        solution: [`$${binomial(a, 'x', p)}${binomial(1, 'x', q)} = 0$.`, `$${sum([[2, 'x'], [p, '']])} = 0 \\Rightarrow x = ${frac(-p, a)}$, or $x = ${-q}$.`],
        misconceptions: signMs(roots),
      };
    }
    let p: number;
    let q: number;
    if (level === 2) {
      p = rng.int(1, 8);
      q = rng.intExcept(1, 8, [p]);
    } else {
      p = rng.int(1, 9);
      q = -rng.intExcept(1, 9, [p]);
    }
    const roots = [rat(-p), rat(-q)];
    return {
      prompt: `Solve for $x$: $${sum([[1, 'x^2'], [p + q, 'x'], [p * q, '']])} = 0$`,
      input: { kind: 'roots', count: 2, variable: 'x' },
      answer: rootsAns(roots),
      answerDisplay: `$${rootsTex(roots)}$`,
      hints: [`Factorise first: two numbers that multiply to ${p * q} and add to ${p + q}.`, 'Then set each bracket equal to zero.'],
      solution: [`$${binomial(1, 'x', p)}${binomial(1, 'x', q)} = 0$.`, `$${rootsTex(roots)}$.`],
      misconceptions: signMs(roots),
    };
  },
};
