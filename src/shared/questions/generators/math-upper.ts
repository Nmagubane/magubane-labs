/** Mathematics, Grades 10–12: exponents, the quadratic formula, sequences, trigonometry, finance, derivatives. */
import type { QuestionTemplate, AnswerSpec, Misconception } from '../types.ts';
import { rat } from '../rational.ts';
import { fmt, sum, sumPlain } from '../tex.ts';
import { choice, num, exact, keepNum, type Opt } from './kit.ts';

const abs = (v: number, tol: number): AnswerSpec => ({ kind: 'numeric', value: v, tolerance: tol });
const r2 = (v: number) => Math.round(v * 100) / 100;
const rands = (v: number) => `R${Math.round(v * 100) / 100 >= 1000 ? (Math.round(v * 100) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : (Math.round(v * 100) / 100).toFixed(2)}`.replace('.', ',');
const deg = (d: number) => (d * Math.PI) / 180;

// ---------------------------------------------------------------------------
export const exponents: QuestionTemplate = {
  id: 'exponents',
  skillId: 'exponents',
  generate(rng, level) {
    if (level === 1) {
      const kind = rng.pick(['pos', 'zero', 'negbase', 'neg-sq'] as const);
      if (kind === 'zero') {
        const b = rng.pick([2, 3, 5, 7, 12, 100]);
        return {
          prompt: `Evaluate $${b}^0$.`,
          input: { kind: 'numeric' },
          answer: exact(1),
          answerDisplay: '1',
          hints: ['Look at the pattern: $2^3 = 8$, $2^2 = 4$, $2^1 = 2$, $2^0 = \\,?$ Each step divides by 2.'],
          solution: [`Any non-zero number to the power 0 is 1, so $${b}^0 = 1$.`],
          misconceptions: [{ code: 'negative-exponent', answer: exact(0), feedback: 'Following the pattern (divide by the base each step), $b^1 = b$ gives $b^0 = 1$, not 0.' }],
        };
      }
      if (kind === 'neg-sq') {
        const b = rng.int(2, 9);
        const brackets = rng.chance(0.5);
        const v = brackets ? b * b : -b * b;
        return {
          prompt: brackets ? `Evaluate $(-${b})^2$.` : `Evaluate $-${b}^2$.`,
          input: { kind: 'numeric' },
          answer: exact(v),
          answerDisplay: String(v).replace('-', '−'),
          hints: [brackets ? 'The bracket means the whole of −' + b + ' is squared.' : 'Without brackets, only the ' + b + ' is squared. The minus is applied afterwards.'],
          solution: [brackets ? `$(-${b})^2 = (-${b})(-${b}) = ${b * b}$.` : `$-${b}^2 = -(${b} \\times ${b}) = -${b * b}$.`],
          misconceptions: [{ code: 'sign-error', answer: exact(-v), feedback: brackets ? 'Negative times negative is positive.' : `Without a bracket, the exponent applies only to the ${b}: $-${b}^2 = -${b * b}$.` }],
        };
      }
      const b = kind === 'negbase' ? -rng.int(2, 4) : rng.int(2, 6);
      const e = kind === 'negbase' ? rng.pick([3, 4, 5]) : rng.int(3, 5);
      const v = b ** e;
      return {
        prompt: `Evaluate $${b < 0 ? `(${b})` : b}^${e}$.`,
        input: { kind: 'numeric' },
        answer: exact(v),
        answerDisplay: String(v).replace('-', '−'),
        hints: [`Multiply ${b < 0 ? `(${b})` : b} by itself ${e} times.`],
        solution: [`$${Array.from({ length: e }, () => (b < 0 ? `(${b})` : b)).join(' \\times ')} = ${v}$.`],
        misconceptions: keepNum(
          [
            { code: 'exponent-laws', answer: exact(b * e), feedback: `$${b}^${e}$ means ${b} multiplied by itself ${e} times, not ${b} × ${e}.` },
            ...(b < 0 ? [{ code: 'sign-error' as const, answer: exact(-v), feedback: e % 2 === 0 ? 'An even number of negative factors gives a positive answer.' : 'An odd number of negative factors gives a negative answer.' }] : []),
          ],
          v,
        ),
      };
    }
    if (level === 2) {
      const b = rng.int(2, 5);
      const e = rng.int(1, b === 2 ? 5 : 3);
      const r = rat(1, b ** e);
      return {
        prompt: `Write $${b}^{-${e}}$ as a fraction.`,
        input: { kind: 'fraction' },
        answer: { kind: 'fraction', n: r.n, d: r.d, requireSimplest: false },
        answerDisplay: `$\\tfrac{1}{${b ** e}}$`,
        hints: ['A negative exponent means "one over": $a^{-n} = \\dfrac{1}{a^n}$.'],
        solution: [`$${b}^{-${e}} = \\dfrac{1}{${b}^${e}} = \\dfrac{1}{${b ** e}}$.`],
        misconceptions: [
          { code: 'negative-exponent', answer: { kind: 'fraction', n: -(b ** e), d: 1, requireSimplest: false }, feedback: 'A negative exponent doesn\'t make the number negative. It means one over the positive power.' },
          { code: 'negative-exponent', answer: { kind: 'fraction', n: -b * e, d: 1, requireSimplest: false }, feedback: `That is ${b} × (−${e}). A negative exponent means $\\dfrac{1}{${b}^${e}}$.` },
        ],
      };
    }
    if (level === 3) {
      const m = rng.int(2, 9);
      const n = rng.int(2, 6);
      const v = rng.pick(['a', 'x', 'y', 'p']);
      const law = rng.pick(['mult', 'div', 'pow'] as const);
      const [prompt, ans, wrong, why] =
        law === 'mult'
          ? [`$${v}^{${m}} \\times ${v}^{${n}} = ${v}^{\\,?}$`, m + n, m * n, 'When you multiply powers of the same base, **add** the exponents.']
          : law === 'div'
            ? [`$${v}^{${m + n}} \\div ${v}^{${n}} = ${v}^{\\,?}$`, m, (m + n) / n, 'When you divide powers of the same base, **subtract** the exponents.']
            : [`$(${v}^{${m}})^{${n}} = ${v}^{\\,?}$`, m * n, m + n, 'A power of a power **multiplies** the exponents.'];
      return {
        prompt: `${prompt} What is the missing exponent?`,
        input: { kind: 'numeric' },
        answer: exact(ans),
        answerDisplay: `$${v}^{${ans}}$`,
        hints: [why.replace(/\*\*/g, '')],
        solution: [why, `The exponent is ${ans}.`],
        misconceptions: keepNum([{ code: 'exponent-laws', answer: exact(wrong), feedback: why }], ans),
      };
    }
    if (level === 4) {
      const c = rng.int(2, 5);
      const p = rng.int(2, 4);
      const k = rng.int(2, 3);
      const ans = `${c ** k}x^${p * k}`;
      return {
        prompt: `Simplify $(${c}x^{${p}})^{${k}}$.`,
        input: { kind: 'expression', variables: ['x'] },
        answer: { kind: 'expression', expr: ans },
        answerDisplay: `$${c ** k}x^{${p * k}}$`,
        hints: [`Everything inside the bracket is raised to the power ${k}: the ${c} as well as the $x^{${p}}$.`],
        solution: [`$(${c}x^{${p}})^{${k}} = ${c}^{${k}} \\cdot x^{${p} \\times ${k}} = ${c ** k}x^{${p * k}}$.`],
        misconceptions: [
          { code: 'exponent-laws', answer: { kind: 'expression', expr: `${c}x^${p * k}` }, feedback: `The ${c} is inside the bracket too, so it is also raised to the power ${k}: $${c}^{${k}} = ${c ** k}$.` },
          { code: 'exponent-laws', answer: { kind: 'expression', expr: `${c ** k}x^${p + k}` }, feedback: 'A power of a power multiplies the exponents, not adds them.' },
        ],
      };
    }
    const t = rng.pick([
      { b: 2, rhs: '32', x: 5, latex: '2^x = 32', wrong: 16, why: '32 ÷ 2 = 16, but the question is which power of 2 gives 32.' },
      { b: 3, rhs: '81', x: 4, latex: '3^x = 81', wrong: 27, why: 'Write 81 as a power of 3.' },
      { b: 5, rhs: '125', x: 3, latex: '5^x = 125', wrong: 25, why: 'Write 125 as a power of 5.' },
      { b: 2, rhs: '\\tfrac{1}{8}', x: -3, latex: '2^x = \\tfrac{1}{8}', wrong: 3, why: '$\\tfrac{1}{8} = \\tfrac{1}{2^3} = 2^{-3}$, so the exponent is negative.' },
      { b: 4, rhs: '\\tfrac{1}{16}', x: -2, latex: '4^x = \\tfrac{1}{16}', wrong: 2, why: '$\\tfrac{1}{16} = 4^{-2}$, so the exponent is negative.' },
      { b: 3, rhs: '81', x: 3, latex: '3^{x+1} = 81', wrong: 4, why: '$81 = 3^4$, so $x + 1 = 4$.' },
      { b: 2, rhs: '64', x: 2, latex: '2^{3x} = 64', wrong: 6, why: '$64 = 2^6$, so $3x = 6$.' },
      { b: 10, rhs: '0{,}001', x: -3, latex: '10^x = 0{,}001', wrong: 3, why: '$0{,}001 = \\tfrac{1}{1000} = 10^{-3}$.' },
      { b: 9, rhs: '3', x: 0.5, latex: '9^x = 3', wrong: 3, why: '$3 = \\sqrt{9} = 9^{1/2}$.' },
      { b: 2, rhs: '1', x: 0, latex: '2^{x} = 1', wrong: 1, why: 'Any non-zero number to the power 0 is 1.' },
    ]);
    return {
      prompt: `Solve for $x$: $${t.latex}$`,
      input: { kind: 'numeric', prefix: 'x =' },
      answer: num(t.x, 0.001),
      answerDisplay: `$x = ${String(t.x).replace('.', '{,}')}$`,
      hints: ['Write both sides as powers of the same base.', 'Then the exponents must be equal.'],
      solution: [`Write the right side as a power of ${t.b}: ${t.why}`, `$x = ${String(t.x).replace('.', '{,}')}$.`],
      misconceptions: keepNum([{ code: t.x < 0 ? 'negative-exponent' : 'exponent-laws', answer: num(t.wrong, 0.001), feedback: t.why }], t.x),
    };
  },
};

// ---------------------------------------------------------------------------
function quad(a: number, b: number, c: number): string {
  return sum([
    [a, 'x^2'],
    [b, 'x'],
    [c, ''],
  ]);
}

export const quadraticFormula: QuestionTemplate = {
  id: 'quadratic-formula',
  skillId: 'quadratic-formula',
  generate(rng, level) {
    if (level === 1) {
      const a = rng.pick([1, 2, 3, -1, 2]);
      const b = rng.signed(1, 9);
      const c = rng.signed(1, 9);
      const D = b * b - 4 * a * c;
      return {
        prompt: `Calculate the discriminant of $${quad(a, b, c)} = 0$.`,
        input: { kind: 'numeric', prefix: '\\Delta =' },
        answer: exact(D),
        answerDisplay: `$\\Delta = ${D}$`,
        hints: ['$\\Delta = b^2 - 4ac$.', `Here $a = ${a}$, $b = ${b}$, $c = ${c}$. Keep the signs.`],
        solution: [`$\\Delta = (${b})^2 - 4(${a})(${c}) = ${b * b} - (${4 * a * c}) = ${D}$.`],
        misconceptions: keepNum(
          [
            { code: 'sign-error', answer: exact(b * b + 4 * a * c), feedback: `Careful with the sign: $-4ac = -4(${a})(${c}) = ${-4 * a * c}$.` },
            { code: 'discriminant', answer: exact(-(b * b) - 4 * a * c), feedback: `$b^2$ is always positive: $(${b})^2 = ${b * b}$.` },
          ],
          D,
        ),
      };
    }
    if (level === 2) {
      const kind = rng.pick(['rational', 'irrational', 'equal', 'none'] as const);
      let a = 1, b = 0, c = 0;
      if (kind === 'rational') {
        const p = rng.signed(1, 6), q = rng.intExcept(-6, 6, [p, 0]);
        a = rng.pick([1, 2]);
        b = -a * (p + q);
        c = a * p * q;
      } else if (kind === 'equal') {
        const p = rng.signed(1, 6);
        a = rng.pick([1, 4, 9]);
        const s = Math.sqrt(a);
        b = -2 * s * p;
        c = p * p;
      } else if (kind === 'irrational') {
        for (;;) {
          a = rng.pick([1, 2, 3]);
          b = rng.signed(1, 9);
          c = rng.signed(1, 9);
          const D = b * b - 4 * a * c;
          if (D > 0 && !Number.isInteger(Math.sqrt(D))) break;
        }
      } else {
        for (;;) {
          a = rng.pick([1, 2, 3]);
          b = rng.signed(1, 6);
          c = rng.int(2, 9);
          if (b * b - 4 * a * c < 0) break;
        }
      }
      const D = b * b - 4 * a * c;
      const opts: Opt[] = [
        { id: 'rational', text: 'Two real, unequal, rational roots' },
        { id: 'irrational', text: 'Two real, unequal, irrational roots' },
        { id: 'equal', text: 'Two equal real roots (one repeated root)' },
        { id: 'none', text: 'No real roots' },
      ];
      return choice(rng, {
        prompt: `Describe the nature of the roots of $${quad(a, b, c)} = 0$.`,
        correct: opts.find((o) => o.id === kind)!,
        distractors: opts.filter((o) => o.id !== kind).map((o) => ({ ...o, feedback: `Here $\\Delta = ${D}$. ${D < 0 ? 'Δ < 0 means no real roots.' : D === 0 ? 'Δ = 0 means two equal roots.' : Number.isInteger(Math.sqrt(D)) ? 'Δ > 0 and a perfect square means two rational roots.' : 'Δ > 0 but not a perfect square means two irrational roots.'}` })),
        keepOrder: opts,
        code: 'discriminant',
        hints: ['Find $\\Delta = b^2 - 4ac$ first.', 'Is Δ negative, zero, a perfect square, or positive but not a perfect square?'],
        solution: [`$\\Delta = (${b})^2 - 4(${a})(${c}) = ${D}$.`, D < 0 ? 'Δ < 0: no real roots.' : D === 0 ? 'Δ = 0: two equal real roots.' : Number.isInteger(Math.sqrt(D)) ? `Δ > 0 and $\\sqrt{${D}} = ${Math.sqrt(D)}$: two real, unequal, rational roots.` : 'Δ > 0 but not a perfect square: two real, unequal, irrational roots.'],
      });
    }
    if (level === 3) {
      const a = rng.pick([2, 3, 2, 4]);
      const p = rng.signed(1, 5);
      let qn = rng.signed(1, 7);
      while (qn === a * p) qn = rng.signed(1, 7); // distinct roots
      // a x^2 + b x + c with roots p and qn/a
      const b = -(a * p + qn);
      const c = p * qn;
      const r1 = rat(p, 1), r2 = rat(qn, a);
      const wrong1 = rat(-p, 1), wrong2 = rat(-qn, a);
      return {
        prompt: `Use the quadratic formula to solve $${quad(a, b, c)} = 0$.`,
        input: { kind: 'roots', count: 2, variable: 'x' },
        answer: { kind: 'roots', values: [r1, r2] },
        answerDisplay: `$x = ${p}$ or $x = ${r2.d === 1 ? r2.n : `${r2.n < 0 ? '-' : ''}\\tfrac{${Math.abs(r2.n)}}{${r2.d}}`}$`,
        hints: [`$a = ${a}$, $b = ${b}$, $c = ${c}$.`, '$x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$. Divide the **whole** top by $2a$.'],
        solution: [`$\\Delta = (${b})^2 - 4(${a})(${c}) = ${b * b - 4 * a * c}$, so $\\sqrt{\\Delta} = ${Math.sqrt(b * b - 4 * a * c)}$.`, `$x = \\dfrac{${-b} \\pm ${Math.sqrt(b * b - 4 * a * c)}}{${2 * a}}$.`, `$x = ${p}$ or $x = ${r2.d === 1 ? r2.n : `\\tfrac{${r2.n}}{${r2.d}}`}$.`],
        misconceptions: [{ code: 'quadratic-formula-use', answer: { kind: 'roots', values: [wrong1, wrong2] }, feedback: 'Both signs are flipped. The formula starts with $-b$: if $b$ is negative, $-b$ is positive.' }],
      };
    }
    // levels 4–5: irrational roots to 2 decimal places
    let a = 1, b = 0, c = 0, setup = '';
    for (;;) {
      a = rng.pick([1, 2, 3]);
      b = rng.signed(1, 9);
      c = rng.signed(1, 9);
      const D = b * b - 4 * a * c;
      if (D > 0 && !Number.isInteger(Math.sqrt(D))) break;
    }
    if (level === 5) {
      // present it unarranged: a x^2 + b x = -c  (or  a x^2 = -b x - c)
      setup = rng.chance(0.5) ? `${sum([[a, 'x^2'], [b, 'x']])} = ${-c}` : `${sum([[a, 'x^2']])} = ${sum([[-b, 'x'], [-c, '']])}`;
    }
    const D = b * b - 4 * a * c;
    const big = (-b + Math.sqrt(D)) / (2 * a);
    const wrongSign = (b + Math.sqrt(D)) / (2 * a);
    const halfDiv = -b + Math.sqrt(D) / (2 * a);
    const ms: Misconception[] = [
      { code: 'quadratic-formula-use', answer: abs(r2(wrongSign), 0.006), feedback: 'The formula starts with $-b$. Check the sign of $b$.' },
      { code: 'quadratic-formula-use', answer: abs(r2(halfDiv), 0.006), feedback: 'Divide the **whole** numerator $-b \\pm \\sqrt{\\Delta}$ by $2a$, not just the square root.' },
    ];
    if (level === 5) {
      const Dw = b * b + 4 * a * c;
      if (Dw > 0) ms.push({ code: 'quadratic-formula-use', answer: abs(r2((-b + Math.sqrt(Dw)) / (2 * a)), 0.006), feedback: 'First rearrange so one side is 0. Moving a term across changes its sign.' });
    }
    return {
      prompt: `Solve $${level === 5 ? setup : `${quad(a, b, c)} = 0`}$. Give the **larger** root correct to two decimal places.`,
      input: { kind: 'numeric', prefix: 'x =' },
      answer: abs(r2(big), 0.006),
      answerDisplay: `$x \\approx ${String(r2(big)).replace('.', '{,}')}$`,
      hints: [...(level === 5 ? ['First write it as $ax^2 + bx + c = 0$.'] : []), `$a = ${a}$, $b = ${b}$, $c = ${c}$.`, 'The larger root uses $+\\sqrt{\\Delta}$ (because $a > 0$).'],
      solution: [...(level === 5 ? [`Standard form: $${quad(a, b, c)} = 0$.`] : []), `$\\Delta = ${D}$.`, `$x = \\dfrac{${-b} + \\sqrt{${D}}}{${2 * a}} \\approx ${fmt(big, 2).replace('.', '{,}')}$.`],
      misconceptions: keepNum(ms, r2(big)),
    };
  },
};

// ---------------------------------------------------------------------------
const seqList = (xs: number[]) => xs.map((v) => String(v).replace('-', '−')).join('; ');

export const sequences: QuestionTemplate = {
  id: 'sequences',
  skillId: 'sequences',
  generate(rng, level) {
    const a = rng.int(-6, 12);
    const d = rng.intExcept(-7, 9, [0]);
    const terms = (n: number) => Array.from({ length: n }, (_, i) => a + i * d);
    if (level === 1) {
      const n = rng.int(10, 40);
      const Tn = a + (n - 1) * d;
      return {
        prompt: `Find $T_{${n}}$ of the sequence ${seqList(terms(4))}; …`,
        input: { kind: 'numeric' },
        answer: exact(Tn),
        answerDisplay: String(Tn).replace('-', '−'),
        hints: ['Find the common difference $d$.', '$T_n = a + (n - 1)d$.'],
        solution: [`$a = ${a}$, $d = ${d}$.`, `$T_{${n}} = ${a} + (${n} - 1)(${d}) = ${Tn}$.`],
        misconceptions: keepNum([{ code: 'nth-term', answer: exact(a + n * d), feedback: 'You used $n$ instead of $n - 1$. The first term has no differences added.' }], Tn),
      };
    }
    if (level === 2) {
      const dd = Math.abs(d);
      const n = rng.int(12, 40);
      const Tn = a + (n - 1) * dd;
      return {
        prompt: `Which term of the sequence ${seqList(Array.from({ length: 4 }, (_, i) => a + i * dd))}; … is equal to ${Tn}?`,
        input: { kind: 'numeric', prefix: 'n =' },
        answer: exact(n),
        answerDisplay: `$T_{${n}}$`,
        hints: ['Set $T_n = a + (n - 1)d$ equal to the value and solve for $n$.'],
        solution: [`$${a} + (n - 1)(${dd}) = ${Tn}$`, `$n - 1 = ${(Tn - a) / dd}$, so $n = ${n}$.`],
        misconceptions: keepNum([{ code: 'nth-term', answer: exact(n - 1), feedback: `You found $n - 1$. Add 1: $n = ${n}$.` }], n),
      };
    }
    if (level === 3) {
      const g = rng.int(1, 5);
      const r = rng.pick([2, 3, -2, 2, 3]);
      const n = rng.int(5, 8);
      const Tn = g * r ** (n - 1);
      const t = Array.from({ length: 4 }, (_, i) => g * r ** i);
      return {
        prompt: `Find $T_{${n}}$ of the geometric sequence ${seqList(t)}; …`,
        input: { kind: 'numeric' },
        answer: exact(Tn),
        answerDisplay: String(Tn).replace('-', '−'),
        hints: ['Find the common ratio $r$ by dividing a term by the one before it.', '$T_n = ar^{n-1}$.'],
        solution: [`$a = ${g}$, $r = ${r}$.`, `$T_{${n}} = ${g}(${r})^{${n - 1}} = ${Tn}$.`],
        misconceptions: keepNum(
          [
            { code: 'nth-term', answer: exact(g * r ** n), feedback: 'Use $r^{n-1}$, not $r^n$.' },
            { code: 'sequence-type', answer: exact(t[0]! + (n - 1) * (t[1]! - t[0]!)), feedback: 'This sequence multiplies by the same number each time, so it is geometric, not arithmetic.' },
          ],
          Tn,
        ),
      };
    }
    if (level === 4) {
      const n = rng.int(10, 30);
      const S = (n / 2) * (2 * a + (n - 1) * d);
      return {
        prompt: `Find the sum of the first ${n} terms of ${seqList(terms(4))}; …`,
        input: { kind: 'numeric', prefix: `S_{${n}} =` },
        answer: exact(S),
        answerDisplay: String(S).replace('-', '−'),
        hints: ['$S_n = \\dfrac{n}{2}[2a + (n - 1)d]$.'],
        solution: [`$S_{${n}} = \\dfrac{${n}}{2}[2(${a}) + (${n} - 1)(${d})] = ${S}$.`],
        misconceptions: keepNum(
          [
            { code: 'nth-term', answer: exact(a + (n - 1) * d), feedback: `That is the ${n}th term. The question asks for the sum of the first ${n} terms.` },
            { code: 'nth-term', answer: exact(n * (2 * a + (n - 1) * d)), feedback: 'You left out the $\\tfrac{1}{2}$ in $S_n = \\tfrac{n}{2}[2a + (n-1)d]$.' },
          ],
          S,
        ),
      };
    }
    const g = rng.int(1, 6);
    const r = rng.pick([2, 3]);
    const n = rng.int(5, 10);
    const S = (g * (r ** n - 1)) / (r - 1);
    return {
      prompt: `Find the sum of the first ${n} terms of the geometric series ${Array.from({ length: 3 }, (_, i) => g * r ** i).join(' + ')} + …`,
      input: { kind: 'numeric', prefix: `S_{${n}} =` },
      answer: exact(S),
      answerDisplay: String(S).replace('-', '−'),
      hints: ['$S_n = \\dfrac{a(r^n - 1)}{r - 1}$.'],
      solution: [`$S_{${n}} = \\dfrac{${g}(${r}^{${n}} - 1)}{${r} - 1} = ${S}$.`],
      misconceptions: keepNum(
        [
          { code: 'nth-term', answer: exact(g * r ** (n - 1)), feedback: `That is $T_{${n}}$, the last term. Add up all ${n} terms.` },
          { code: 'nth-term', answer: exact((g * (r ** (n - 1) - 1)) / (r - 1)), feedback: 'Use $r^n$ in the sum formula, not $r^{n-1}$.' },
        ],
        S,
      ),
    };
  },
};

// ---------------------------------------------------------------------------
const TRIPLES: [number, number, number][] = [
  [3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [7, 24, 25], [9, 12, 15], [12, 16, 20], [20, 21, 29],
];

export const trigRatios: QuestionTemplate = {
  id: 'trig-ratios',
  skillId: 'trig-ratios',
  generate(rng, level) {
    if (level === 1) {
      const [p, q, h] = rng.pick(TRIPLES);
      const fn = rng.pick(['sin', 'cos', 'tan'] as const);
      // Triangle ABC, right angle at B: AB = p (adjacent to A), BC = q (opposite A), AC = h.
      const val = fn === 'sin' ? q / h : fn === 'cos' ? p / h : q / p;
      const others = { sin: q / h, cos: p / h, tan: q / p };
      return {
        prompt: `In $\\triangle ABC$, $\\hat{B} = 90°$, $AB = ${p}$, $BC = ${q}$ and $AC = ${h}$. Find $\\${fn} A$ as a fraction or a decimal.`,
        input: { kind: 'numeric' },
        answer: abs(val, 0.0051),
        answerDisplay: `$\\${fn} A = \\dfrac{${fn === 'sin' ? q : fn === 'cos' ? p : q}}{${fn === 'tan' ? p : h}}$`,
        hints: ['From angle $A$: $BC$ is opposite, $AB$ is adjacent, $AC$ is the hypotenuse.', 'SOH CAH TOA.'],
        solution: [`Opposite $A$: $BC = ${q}$. Adjacent: $AB = ${p}$. Hypotenuse: $AC = ${h}$.`, `$\\${fn} A = ${fn === 'sin' ? `\\dfrac{${q}}{${h}}` : fn === 'cos' ? `\\dfrac{${p}}{${h}}` : `\\dfrac{${q}}{${p}}`}$.`],
        misconceptions: keepNum(
          (Object.keys(others) as (keyof typeof others)[]).filter((k) => k !== fn).map((k) => ({ code: 'trig-ratio-choice' as const, answer: abs(others[k], 0.0051), feedback: `That is $\\${k} A$. ${fn === 'sin' ? 'Sin is opposite over hypotenuse.' : fn === 'cos' ? 'Cos is adjacent over hypotenuse.' : 'Tan is opposite over adjacent.'}` })),
          val,
        ),
      };
    }
    const theta = rng.int(15, 70);
    if (level === 2 || level === 3) {
      const known = rng.int(4, 30);
      if (level === 2) {
        const opp = known * Math.sin(deg(theta));
        return {
          prompt: `A ladder ${known} m long leans against a wall and makes an angle of ${theta}° with the ground. How high up the wall does it reach? Round to two decimal places.`,
          input: { kind: 'numeric', unit: 'm' },
          answer: abs(r2(opp), 0.011),
          answerDisplay: `${String(r2(opp)).replace('.', ',')} m`,
          hints: ['The ladder is the hypotenuse. The height is opposite the angle.', 'Which ratio links opposite and hypotenuse?'],
          solution: [`$\\sin ${theta}° = \\dfrac{h}{${known}}$`, `$h = ${known} \\sin ${theta}° \\approx ${fmt(opp, 2).replace('.', '{,}')}$ m.`],
          misconceptions: keepNum(
            [
              { code: 'trig-ratio-choice', answer: abs(r2(known * Math.cos(deg(theta))), 0.011), feedback: 'Cos gives the adjacent side (along the ground). The height is opposite the angle: use sin.' },
              { code: 'trig-ratio-choice', answer: abs(r2(known * Math.sin(theta)), 0.011), feedback: 'Your calculator is in radians. Switch it to degrees (DEG).' },
            ],
            r2(opp),
          ),
        };
      }
      const adj = known / Math.tan(deg(theta));
      return {
        prompt: `In a right-angled triangle, the side opposite an angle of ${theta}° is ${known} cm. How long is the side adjacent to that angle? Round to two decimal places.`,
        input: { kind: 'numeric', unit: 'cm' },
        answer: abs(r2(adj), 0.011),
        answerDisplay: `${String(r2(adj)).replace('.', ',')} cm`,
        hints: ['Opposite and adjacent: that is tan.', '$\\tan\\theta = \\dfrac{\\text{opp}}{\\text{adj}}$, so $\\text{adj} = \\dfrac{\\text{opp}}{\\tan\\theta}$.'],
        solution: [`$\\tan ${theta}° = \\dfrac{${known}}{x}$`, `$x = \\dfrac{${known}}{\\tan ${theta}°} \\approx ${fmt(adj, 2).replace('.', '{,}')}$ cm.`],
        misconceptions: keepNum([{ code: 'formula-rearranged-wrongly', answer: abs(r2(known * Math.tan(deg(theta))), 0.011), feedback: 'The unknown is on the bottom of the fraction. Rearrange: adj = opp ÷ tan θ.' }], r2(adj)),
      };
    }
    if (level === 4) {
      const o = rng.int(3, 15);
      const ad = rng.intExcept(3, 15, [o]);
      const ang = (Math.atan(o / ad) * 180) / Math.PI;
      return {
        prompt: `A ramp rises ${o} dm over a horizontal distance of ${ad} dm. At what angle to the ground is it? Round to one decimal place.`,
        input: { kind: 'numeric', unit: '°' },
        answer: abs(Math.round(ang * 10) / 10, 0.06),
        answerDisplay: `${String(Math.round(ang * 10) / 10).replace('.', ',')}°`,
        hints: ['Rise is opposite the angle; the horizontal distance is adjacent.', 'Use $\\tan^{-1}$ (shift tan) to get the angle.'],
        solution: [`$\\tan\\theta = \\dfrac{${o}}{${ad}}$`, `$\\theta = \\tan^{-1}\\left(\\dfrac{${o}}{${ad}}\\right) \\approx ${fmt(ang, 1).replace('.', '{,}')}°$.`],
        misconceptions: keepNum(
          [
            { code: 'trig-ratio-choice', answer: abs(Math.round((o / ad) * 1000) / 1000, 0.002), feedback: 'That is the value of tan θ. Use $\\tan^{-1}$ to turn it into an angle.' },
            ...(o < ad ? [{ code: 'trig-ratio-choice' as const, answer: abs(Math.round(((Math.asin(o / ad) * 180) / Math.PI) * 10) / 10, 0.06), feedback: 'Sin uses the hypotenuse, which isn\'t given here. Opposite and adjacent mean tan.' }] : []),
          ],
          Math.round(ang * 10) / 10,
        ),
      };
    }
    const dist = rng.int(15, 80);
    const h = dist * Math.tan(deg(theta));
    return {
      prompt: `From a point ${dist} m from the foot of a cellphone tower, the angle of elevation to the top is ${theta}°. How tall is the tower? Round to one decimal place.`,
      input: { kind: 'numeric', unit: 'm' },
      answer: abs(Math.round(h * 10) / 10, 0.06),
      answerDisplay: `${String(Math.round(h * 10) / 10).replace('.', ',')} m`,
      hints: ['Draw it: the ground distance is adjacent to the angle, and the tower is opposite.', 'Opposite and adjacent: tan.'],
      solution: [`$\\tan ${theta}° = \\dfrac{h}{${dist}}$`, `$h = ${dist}\\tan ${theta}° \\approx ${fmt(h, 1).replace('.', '{,}')}$ m.`],
      misconceptions: keepNum(
        [
          { code: 'trig-ratio-choice', answer: abs(Math.round(dist * Math.sin(deg(theta)) * 10) / 10, 0.06), feedback: `The ${dist} m is along the ground (adjacent), not the hypotenuse. Use tan.` },
          { code: 'formula-rearranged-wrongly', answer: abs(Math.round((dist / Math.tan(deg(theta))) * 10) / 10, 0.06), feedback: 'The height is on top: $h = d \\times \\tan\\theta$.' },
        ],
        Math.round(h * 10) / 10,
      ),
    };
  },
};

// ---------------------------------------------------------------------------
export const finance: QuestionTemplate = {
  id: 'finance',
  skillId: 'finance',
  generate(rng, level) {
    const P = rng.pick([2000, 5000, 8000, 10000, 12000, 15000, 20000, 25000]);
    const rate = rng.pick([4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 13, 14]);
    const i = rate / 100;
    const n = rng.int(2, 10);
    const rel = (v: number): AnswerSpec => ({ kind: 'numeric', value: Math.round(v * 100) / 100, tolerance: 0.005 + v * 0.0002 });
    if (level === 1) {
      const A = P * (1 + i * n);
      return {
        prompt: `Thandi invests ${rands(P)} at ${String(rate).replace('.', ',')}% per year **simple** interest for ${n} years. How much will she have at the end?`,
        input: { kind: 'numeric', prefix: 'R' },
        answer: rel(A),
        answerDisplay: rands(A),
        hints: ['Simple interest: $A = P(1 + in)$.', `Write ${String(rate).replace('.', ',')}% as a decimal: $i = ${String(i).replace('.', '{,}')}$.`],
        solution: [`$A = ${P}(1 + ${String(i).replace('.', '{,}')} \\times ${n}) = ${fmt(A, 2).replace('.', '{,}')}$`],
        misconceptions: keepNum(
          [
            { code: 'simple-vs-compound', answer: rel(P * i * n), feedback: 'That is only the interest. The question asks how much she will have: add the original amount.' },
            { code: 'simple-vs-compound', answer: rel(P * (1 + i) ** n), feedback: 'That is compound interest. Simple interest is only ever calculated on the original amount.' },
          ],
          Math.round(A * 100) / 100,
        ),
      };
    }
    if (level === 2) {
      const A = P * (1 + i) ** n;
      return {
        prompt: `${rands(P)} is invested at ${String(rate).replace('.', ',')}% per year, compounded annually, for ${n} years. What is it worth at the end? Round to the nearest cent.`,
        input: { kind: 'numeric', prefix: 'R' },
        answer: rel(A),
        answerDisplay: rands(A),
        hints: ['Compound interest: $A = P(1 + i)^n$.'],
        solution: [`$A = ${P}(1 + ${String(i).replace('.', '{,}')})^{${n}} \\approx ${fmt(A, 2).replace('.', '{,}')}$`],
        misconceptions: keepNum(
          [
            { code: 'simple-vs-compound', answer: rel(P * (1 + i * n)), feedback: 'That is simple interest. Compound interest earns interest on the interest: $A = P(1 + i)^n$.' },
            { code: 'rate-period', answer: rel(P * (1 + rate) ** n), feedback: `Write the percentage as a decimal first: ${String(rate).replace('.', ',')}% = ${String(i).replace('.', ',')}.` },
          ],
          Math.round(A * 100) / 100,
        ),
      };
    }
    if (level === 3) {
      const yrs = rng.int(2, 6);
      const A = P * (1 + i / 12) ** (12 * yrs);
      return {
        prompt: `A savings account pays ${String(rate).replace('.', ',')}% per year, compounded **monthly**. How much will ${rands(P)} grow to in ${yrs} years? Round to the nearest cent.`,
        input: { kind: 'numeric', prefix: 'R' },
        answer: rel(A),
        answerDisplay: rands(A),
        hints: ['Monthly: the rate per month is $\\dfrac{i}{12}$ and there are $12 \\times$ years periods.'],
        solution: [`$A = ${P}\\left(1 + \\dfrac{${String(i).replace('.', '{,}')}}{12}\\right)^{12 \\times ${yrs}} \\approx ${fmt(A, 2).replace('.', '{,}')}$`],
        misconceptions: keepNum(
          [
            { code: 'rate-period', answer: rel(P * (1 + i) ** yrs), feedback: 'That is compounded yearly. Monthly means $i \\div 12$ and $n \\times 12$.' },
            { code: 'rate-period', answer: rel(P * (1 + i / 12) ** yrs), feedback: 'You divided the rate by 12 but didn\'t multiply the number of periods by 12.' },
          ],
          Math.round(A * 100) / 100,
        ),
      };
    }
    if (level === 4) {
      const cost = rng.pick([180000, 220000, 250000, 320000, 450000]);
      const dep = rng.pick([10, 12, 15, 18, 20]);
      const yrs = rng.int(2, 6);
      const A = cost * (1 - dep / 100) ** yrs;
      return {
        prompt: `A taxi costs ${rands(cost)} new. It loses value at ${dep}% per year on the **reducing balance**. What is it worth after ${yrs} years?`,
        input: { kind: 'numeric', prefix: 'R' },
        answer: rel(A),
        answerDisplay: rands(A),
        hints: ['Reducing-balance depreciation: $A = P(1 - i)^n$.'],
        solution: [`$A = ${cost}(1 - ${dep / 100})^{${yrs}} \\approx ${fmt(A, 2).replace('.', '{,}')}$`.replace(/(\d)\.(\d)/g, '$1{,}$2')],
        misconceptions: keepNum(
          [
            { code: 'simple-vs-compound', answer: rel(cost * (1 - (dep / 100) * yrs)), feedback: 'That is straight-line depreciation. On the reducing balance, each year\'s loss is a percentage of the **current** value: $A = P(1 - i)^n$.' },
            { code: 'sign-error', answer: rel(cost * (1 + dep / 100) ** yrs), feedback: 'Depreciation makes the value go **down**: use $(1 - i)$.' },
          ],
          Math.round(A * 100) / 100,
        ),
      };
    }
    const years = Math.log(2) / Math.log(1 + i);
    return {
      prompt: `How many years will it take for an investment to **double** at ${String(rate).replace('.', ',')}% per year, compounded annually? Round to two decimal places.`,
      input: { kind: 'numeric', unit: 'years' },
      answer: abs(r2(years), 0.011),
      answerDisplay: `${String(r2(years)).replace('.', ',')} years`,
      hints: ['Doubling: $2P = P(1 + i)^n$, so $(1 + i)^n = 2$.', 'Use logs: $n = \\dfrac{\\log 2}{\\log(1 + i)}$.'],
      solution: [`$(1 + ${String(i).replace('.', '{,}')})^n = 2$`, `$n = \\dfrac{\\log 2}{\\log ${String(1 + i).replace('.', '{,}')}} \\approx ${fmt(years, 2).replace('.', '{,}')}$ years.`],
      misconceptions: keepNum([{ code: 'simple-vs-compound', answer: abs(r2(100 / rate), 0.011), feedback: 'That would be true with simple interest. Compound interest grows faster, so it doubles sooner.' }], r2(years)),
    };
  },
};

// ---------------------------------------------------------------------------
type Poly = [number, number][]; // [coef, power]
const polyTex = (p: Poly) => sum(p.map(([c, e]) => [c, e === 0 ? '' : e === 1 ? 'x' : `x^{${e}}`] as [number, string]));
const polyPlain = (p: Poly) => sumPlain(p.map(([c, e]) => [c, e === 0 ? '' : e === 1 ? 'x' : `x^{${e}}`] as [number, string])) || '0';
const deriv = (p: Poly): Poly => p.filter(([, e]) => e > 0).map(([c, e]) => [c * e, e - 1] as [number, number]);

export const derivatives: QuestionTemplate = {
  id: 'derivatives',
  skillId: 'derivatives',
  generate(rng, level) {
    if (level === 1) {
      const c = rng.int(2, 9) * (rng.chance(0.2) ? -1 : 1);
      const e = rng.int(2, 6);
      const d = deriv([[c, e]]);
      return {
        prompt: `If $f(x) = ${polyTex([[c, e]])}$, find $f'(x)$.`,
        input: { kind: 'expression', prefix: "f'(x) =", variables: ['x'] },
        answer: { kind: 'expression', expr: polyPlain(d) },
        answerDisplay: `$f'(x) = ${polyTex(d)}$`,
        hints: ['Power rule: multiply by the power, then lower the power by 1.'],
        solution: [`$f'(x) = ${e} \\times ${c}x^{${e} - 1} = ${polyTex(d)}$.`],
        misconceptions: [
          { code: 'power-rule', answer: { kind: 'expression', expr: polyPlain([[c, e - 1]]) }, feedback: `You lowered the power but forgot to multiply by it: ${e} × ${c} = ${e * c}.` },
          { code: 'power-rule', answer: { kind: 'expression', expr: polyPlain([[c * e, e]]) }, feedback: 'You multiplied by the power but forgot to lower it by 1.' },
        ],
      };
    }
    if (level === 2) {
      const p: Poly = [
        [rng.signed(1, 6), rng.int(3, 5)],
        [rng.signed(1, 9), 2],
        [rng.signed(1, 9), 1],
        [rng.signed(1, 12), 0],
      ];
      const d = deriv(p);
      return {
        prompt: `Differentiate $f(x) = ${polyTex(p)}$.`,
        input: { kind: 'expression', prefix: "f'(x) =", variables: ['x'] },
        answer: { kind: 'expression', expr: polyPlain(d) },
        answerDisplay: `$f'(x) = ${polyTex(d)}$`,
        hints: ['Differentiate term by term.', 'The derivative of a constant is 0; the derivative of $ax$ is $a$.'],
        solution: [`$f'(x) = ${polyTex(d)}$`],
        misconceptions: [{ code: 'power-rule', answer: { kind: 'expression', expr: `${polyPlain(d)}${p[3]![0] >= 0 ? '+' : ''}${p[3]![0]}` }, feedback: `A constant doesn't change, so its derivative is 0: the ${p[3]![0]} disappears.` }],
      };
    }
    if (level === 3) {
      const a = rng.signed(1, 3);
      const b = rng.signed(1, 6);
      const c = rng.signed(1, 9);
      const x0 = rng.signed(1, 4);
      const p: Poly = [[a, 3], [b, 1], [c, 0]];
      const g = 3 * a * x0 * x0 + b;
      const fx = a * x0 ** 3 + b * x0 + c;
      return {
        prompt: `Find the gradient of the tangent to $f(x) = ${polyTex(p)}$ at $x = ${x0}$.`,
        input: { kind: 'numeric', prefix: 'm =' },
        answer: exact(g),
        answerDisplay: `$m = f'(${x0}) = ${g}$`,
        hints: ['The gradient of the tangent is $f\'(x)$ at that point.', `Find $f'(x)$, then substitute $x = ${x0}$.`],
        solution: [`$f'(x) = ${polyTex(deriv(p))}$`, `$f'(${x0}) = ${3 * a}(${x0})^2 + ${b} = ${g}$`],
        misconceptions: keepNum([{ code: 'power-rule', answer: exact(fx), feedback: `That is $f(${x0})$, the y-value of the point. The gradient is $f'(${x0})$.` }], g),
      };
    }
    if (level === 4) {
      const m = rng.int(2, 5);
      const k = rng.signed(1, 7);
      // f(x) = (mx + k)^2 = m²x² + 2mkx + k²  →  f'(x) = 2m²x + 2mk
      const d: Poly = [[2 * m * m, 1], [2 * m * k, 0]];
      return {
        prompt: `Differentiate $f(x) = (${m}x ${k < 0 ? '-' : '+'} ${Math.abs(k)})^2$.`,
        input: { kind: 'expression', prefix: "f'(x) =", variables: ['x'] },
        answer: { kind: 'expression', expr: polyPlain(d) },
        answerDisplay: `$f'(x) = ${polyTex(d)}$`,
        hints: ['Expand the bracket first. Then differentiate term by term.'],
        solution: [`$f(x) = ${polyTex([[m * m, 2], [2 * m * k, 1], [k * k, 0]])}$`, `$f'(x) = ${polyTex(d)}$`],
        misconceptions: [{ code: 'power-rule', answer: { kind: 'expression', expr: polyPlain([[2 * m, 1], [2 * k, 0]]) }, feedback: 'You can\'t apply the power rule to a bracket directly. Expand $(mx + k)^2$ first.' }],
      };
    }
    // Stationary points of a cubic: f'(x) = 3a(x - p)(x - q)
    const p = rng.signed(1, 5);
    const q = rng.intExcept(-5, 5, [p, 0]);
    const a = rng.pick([1, 1, 2, -1]);
    // f(x) = a x³ - (3a/2)(p+q) x² + 3a p q x + c ; need integer coefficients → require p+q even or a even
    const s = p + q;
    const A = a * 2;
    const coefs: Poly = [
      [A, 3],
      [-3 * a * s, 2],
      [6 * a * p * q, 1],
      [rng.signed(1, 9), 0],
    ];
    return {
      prompt: `Find the $x$-values of the stationary points of $f(x) = ${polyTex(coefs)}$.`,
      input: { kind: 'roots', count: 2, variable: 'x' },
      answer: { kind: 'roots', values: [rat(p, 1), rat(q, 1)] },
      answerDisplay: `$x = ${p}$ or $x = ${q}$`,
      hints: ['At a stationary point the gradient is 0: solve $f\'(x) = 0$.', 'Take out a common factor, then factorise the quadratic.'],
      solution: [`$f'(x) = ${polyTex(deriv(coefs))} = ${6 * a}(x ${p < 0 ? '+' : '-'} ${Math.abs(p)})(x ${q < 0 ? '+' : '-'} ${Math.abs(q)})$`, `$f'(x) = 0 \\Rightarrow x = ${p}$ or $x = ${q}$.`],
      misconceptions: [{ code: 'root-sign', answer: { kind: 'roots', values: [rat(-p, 1), rat(-q, 1)] }, feedback: `If $(x ${p < 0 ? '+' : '-'} ${Math.abs(p)}) = 0$ then $x = ${p}$: the root has the opposite sign to the number in the bracket.` }],
    };
  },
};
