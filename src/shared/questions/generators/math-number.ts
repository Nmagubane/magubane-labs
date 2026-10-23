import type { QuestionTemplate, Misconception, Difficulty } from '../types.ts';
import type { Rng } from '../rng.ts';
import { fmt, paren, frac } from '../tex.ts';
import { rat, gcd, lcm } from '../rational.ts';

const exact = (value: number) => ({ kind: 'numeric' as const, value, tolerance: 0 });

function keep(ms: Misconception[], correct: number): Misconception[] {
  const seen = new Set<number>([correct]);
  return ms.filter((m) => {
    if (m.answer.kind !== 'numeric' || !Number.isFinite(m.answer.value)) return false;
    if (seen.has(m.answer.value)) return false;
    seen.add(m.answer.value);
    return true;
  });
}

// ---------------------------------------------------------------------------
export const integers: QuestionTemplate = {
  id: 'integers',
  skillId: 'integers',
  generate(rng: Rng, level: Difficulty) {
    if (level === 1) {
      const a = rng.signed(2, 12);
      const b = -rng.int(2, 12);
      const ans = a + b;
      return {
        prompt: `Calculate $${fmt(a)} + ${paren(b)}$.`,
        input: { kind: 'numeric' },
        answer: exact(ans),
        answerDisplay: `$${ans}$`,
        hints: ['Adding a negative number is the same as subtracting its size.', `Rewrite it as $${fmt(a)} - ${Math.abs(b)}$ and picture moving left on a number line.`],
        solution: [`Adding a negative is subtracting: $${fmt(a)} + ${paren(b)} = ${fmt(a)} - ${Math.abs(b)}$.`, `$${fmt(a)} - ${Math.abs(b)} = ${ans}$.`],
        misconceptions: keep(
          [{ code: 'integer-rules', answer: exact(a - b), feedback: `You moved right instead of left. Adding $${b}$ moves you **left** by ${Math.abs(b)}.` }],
          ans,
        ),
      };
    }
    if (level === 2) {
      const a = rng.signed(2, 15);
      const b = -rng.int(2, 15);
      const ans = a - b;
      return {
        prompt: `Calculate $${fmt(a)} - ${paren(b)}$.`,
        input: { kind: 'numeric' },
        answer: exact(ans),
        answerDisplay: `$${ans}$`,
        hints: ['Subtracting a negative number is the same as adding its positive.', `$-${paren(b)} = +${Math.abs(b)}$.`],
        solution: [`Two negatives next to each other make a positive: $${fmt(a)} - ${paren(b)} = ${fmt(a)} + ${Math.abs(b)}$.`, `$${fmt(a)} + ${Math.abs(b)} = ${ans}$.`],
        misconceptions: keep(
          [{ code: 'integer-rules', answer: exact(a + b), feedback: `Subtracting a negative means adding: $-${paren(b)}$ becomes $+${Math.abs(b)}$.` }],
          ans,
        ),
      };
    }
    if (level === 3) {
      const a = rng.signed(2, 12);
      const b = rng.signed(2, 12);
      const divide = rng.chance(0.5);
      if (divide) {
        const product = a * b;
        return {
          prompt: `Calculate $${fmt(product)} \\div ${paren(b)}$.`,
          input: { kind: 'numeric' },
          answer: exact(a),
          answerDisplay: `$${a}$`,
          hints: ['Divide the sizes first, then decide the sign.', 'Same signs give a positive answer. Different signs give a negative answer.'],
          solution: [`Sizes: $${Math.abs(product)} \\div ${Math.abs(b)} = ${Math.abs(a)}$.`, `Signs: ${product < 0 === b < 0 ? 'same signs, so positive' : 'different signs, so negative'}. Answer: $${a}$.`],
          misconceptions: keep([{ code: 'sign-error', answer: exact(-a), feedback: 'The size is right, but the sign is wrong. Same signs give +, different signs give −.' }], a),
        };
      }
      const ans = a * b;
      return {
        prompt: `Calculate $${paren(a)} \\times ${paren(b)}$.`,
        input: { kind: 'numeric' },
        answer: exact(ans),
        answerDisplay: `$${ans}$`,
        hints: ['Multiply the sizes first, then decide the sign.', 'Same signs give a positive answer. Different signs give a negative answer.'],
        solution: [`Sizes: $${Math.abs(a)} \\times ${Math.abs(b)} = ${Math.abs(ans)}$.`, `Signs: ${a < 0 === b < 0 ? 'same signs, so positive' : 'different signs, so negative'}. Answer: $${ans}$.`],
        misconceptions: keep([{ code: 'sign-error', answer: exact(-ans), feedback: 'The size is right, but the sign is wrong. Same signs give +, different signs give −.' }], ans),
      };
    }
    if (level === 4) {
      const a = rng.signed(3, 20);
      const b = -rng.int(2, 15);
      const c = rng.signed(2, 15);
      const ans = a - b + c;
      return {
        prompt: `Calculate $${fmt(a)} - ${paren(b)} + ${paren(c)}$.`,
        input: { kind: 'numeric' },
        answer: exact(ans),
        answerDisplay: `$${ans}$`,
        hints: ['Rewrite each double sign first: $-(-n) = +n$ and $+(-n) = -n$.', 'Then work from left to right.'],
        solution: [
          `Remove the double signs: $${fmt(a)} + ${Math.abs(b)} ${c < 0 ? `- ${Math.abs(c)}` : `+ ${c}`}$.`,
          `$${fmt(a)} + ${Math.abs(b)} = ${a - b}$, then $${a - b} ${c < 0 ? `- ${Math.abs(c)}` : `+ ${c}`} = ${ans}$.`,
        ],
        misconceptions: keep([{ code: 'integer-rules', answer: exact(a + b + c), feedback: `$-${paren(b)}$ should become $+${Math.abs(b)}$.` }], ans),
      };
    }
    // level 5: product of three, with subtraction
    const a = rng.signed(2, 6);
    const b = rng.signed(2, 6);
    const c = rng.signed(2, 9);
    const ans = a * b - c;
    return {
      prompt: `Calculate $${paren(a)} \\times ${paren(b)} - ${paren(c)}$.`,
      input: { kind: 'numeric' },
      answer: exact(ans),
      answerDisplay: `$${ans}$`,
      hints: ['Multiplication comes before subtraction.', `Work out $${paren(a)} \\times ${paren(b)}$ first, then deal with $- ${paren(c)}$.`],
      solution: [`$${paren(a)} \\times ${paren(b)} = ${a * b}$.`, `$${a * b} - ${paren(c)} = ${a * b} ${c < 0 ? `+ ${-c}` : `- ${c}`} = ${ans}$.`],
      misconceptions: keep(
        [
          { code: 'sign-error', answer: exact(-a * b - c), feedback: `Check the sign of $${paren(a)} \\times ${paren(b)}$.` },
          { code: 'integer-rules', answer: exact(a * b + c), feedback: `Subtracting $${paren(c)}$ is not the same as adding it.` },
        ],
        ans,
      ),
    };
  },
};

// ---------------------------------------------------------------------------
export const orderOfOperations: QuestionTemplate = {
  id: 'order-of-operations',
  skillId: 'order-of-operations',
  generate(rng, level) {
    const hints = ['Brackets first, then powers, then × and ÷ (left to right), then + and − (left to right).'];
    if (level === 1) {
      const a = rng.int(2, 15);
      const b = rng.int(2, 9);
      const c = rng.int(2, 9);
      const ans = a + b * c;
      return {
        prompt: `Calculate $${a} + ${b} \\times ${c}$.`,
        input: { kind: 'numeric' },
        answer: exact(ans),
        answerDisplay: `$${ans}$`,
        hints: [...hints, `Which comes first here, the $+$ or the $\\times$?`],
        solution: [`Multiply first: $${b} \\times ${c} = ${b * c}$.`, `Then add: $${a} + ${b * c} = ${ans}$.`],
        misconceptions: keep([{ code: 'left-to-right', answer: exact((a + b) * c), feedback: `You added first. Multiplication comes before addition: $${b} \\times ${c}$ first.` }], ans),
      };
    }
    if (level === 2) {
      const c = rng.int(2, 6);
      const q = rng.int(2, 9);
      const b = c * q;
      const a = rng.int(b + 1, b + 30);
      const ans = a - b / c;
      return {
        prompt: `Calculate $${a} - ${b} \\div ${c}$.`,
        input: { kind: 'numeric' },
        answer: exact(ans),
        answerDisplay: `$${ans}$`,
        hints: [...hints, 'Division happens before subtraction.'],
        solution: [`Divide first: $${b} \\div ${c} = ${q}$.`, `Then subtract: $${a} - ${q} = ${ans}$.`],
        misconceptions: keep([{ code: 'left-to-right', answer: exact((a - b) / c), feedback: 'You subtracted first. Division comes before subtraction.' }], ans),
      };
    }
    if (level === 3) {
      const a = rng.int(2, 6);
      const b = rng.int(2, 9);
      const c = rng.int(2, 9);
      const d = rng.int(1, 12);
      const ans = a * (b + c) - d;
      return {
        prompt: `Calculate $${a}(${b} + ${c}) - ${d}$.`,
        input: { kind: 'numeric' },
        answer: exact(ans),
        answerDisplay: `$${ans}$`,
        hints: [...hints, 'A number written next to a bracket means multiply.'],
        solution: [`Bracket first: $${b} + ${c} = ${b + c}$.`, `Multiply: $${a} \\times ${b + c} = ${a * (b + c)}$.`, `Subtract: $${a * (b + c)} - ${d} = ${ans}$.`],
        misconceptions: keep([{ code: 'left-to-right', answer: exact(a * b + c - d), feedback: `The ${a} multiplies the whole bracket, not just the ${b}.` }], ans),
      };
    }
    if (level === 4) {
      const a = rng.int(2, 20);
      const b = rng.int(2, 5);
      const c = rng.int(2, 5);
      const ans = a + b * c * c;
      return {
        prompt: `Calculate $${a} + ${b} \\times ${c}^2$.`,
        input: { kind: 'numeric' },
        answer: exact(ans),
        answerDisplay: `$${ans}$`,
        hints: [...hints, `The power belongs to the ${c} only.`],
        solution: [`Power first: $${c}^2 = ${c * c}$.`, `Multiply: $${b} \\times ${c * c} = ${b * c * c}$.`, `Add: $${a} + ${b * c * c} = ${ans}$.`],
        misconceptions: keep(
          [
            { code: 'left-to-right', answer: exact(a + (b * c) ** 2), feedback: `The square applies to the ${c} only, not to $${b} \\times ${c}$.` },
            { code: 'left-to-right', answer: exact((a + b) * c * c), feedback: 'You added before multiplying.' },
          ],
          ans,
        ),
      };
    }
    const a = rng.int(5, 12);
    const b = rng.int(1, a - 2);
    const diff = a - b;
    const sq = diff * diff;
    const divisors = [2, 3, 4, 5, 6, 7, 8, 9].filter((k) => sq % k === 0 && k !== sq);
    const c = divisors.length ? rng.pick(divisors) : 1;
    const d = rng.int(2, 6);
    const e = rng.int(2, 6);
    const ans = sq / c + d * e;
    return {
      prompt: `Calculate $(${a} - ${b})^2 \\div ${c} + ${d} \\times ${e}$.`,
      input: { kind: 'numeric' },
      answer: exact(ans),
      answerDisplay: `$${ans}$`,
      hints: [...hints, 'Write each stage on a new line: bracket, then power, then ÷ and ×, then +.'],
      solution: [
        `Bracket: $${a} - ${b} = ${diff}$.`,
        `Power: $${diff}^2 = ${sq}$.`,
        `Divide and multiply: $${sq} \\div ${c} = ${fmt(sq / c)}$ and $${d} \\times ${e} = ${d * e}$.`,
        `Add: $${fmt(sq / c)} + ${d * e} = ${fmt(ans)}$.`,
      ],
      misconceptions: keep([{ code: 'left-to-right', answer: exact((sq / c + d) * e), feedback: 'You added before multiplying. × comes before +.' }], ans),
    };
  },
};

// ---------------------------------------------------------------------------
const fracAns = (n: number, d: number, requireSimplest: boolean) => {
  const r = rat(n, d);
  return { kind: 'fraction' as const, n: r.n, d: r.d, requireSimplest };
};

export const fractionSimplify: QuestionTemplate = {
  id: 'fraction-simplify',
  skillId: 'fraction-simplify',
  generate(rng, level) {
    if (level === 4) {
      const d0 = rng.int(3, 9);
      const n0 = rng.int(1, d0 - 1);
      const r = rat(n0, d0);
      const k = rng.int(3, 9);
      return {
        prompt: `Find the missing number: $${frac(r.n, r.d)} = \\dfrac{?}{${r.d * k}}$`,
        input: { kind: 'numeric', prefix: '?' },
        answer: exact(r.n * k),
        answerDisplay: `$${r.n * k}$`,
        hints: ['Equivalent fractions: multiply the numerator and the denominator by the same number.', `What do you multiply ${r.d} by to get ${r.d * k}?`],
        solution: [`$${r.d} \\times ${k} = ${r.d * k}$, so multiply the numerator by ${k} too.`, `$${r.n} \\times ${k} = ${r.n * k}$.`],
        misconceptions: keep([{ code: 'unsimplified', answer: exact(r.n + (r.d * k - r.d)), feedback: `You added ${r.d * k - r.d}. Equivalent fractions come from multiplying, not adding.` }], r.n * k),
      };
    }
    const ranges: Record<number, [number, number, number, number]> = {
      1: [2, 5, 2, 3],
      2: [3, 9, 2, 6],
      3: [3, 12, 4, 9],
      5: [5, 15, 6, 14],
    };
    const [dMin, dMax, kMin, kMax] = ranges[level] ?? [3, 9, 2, 6];
    let d0 = rng.int(dMin, dMax);
    let n0 = rng.int(1, d0 - 1);
    while (gcd(n0, d0) !== 1) {
      d0 = rng.int(dMin, dMax);
      n0 = rng.int(1, d0 - 1);
    }
    const k = rng.int(kMin, kMax);
    const n = n0 * k;
    const d = d0 * k;
    return {
      prompt: `Write $\\dfrac{${n}}{${d}}$ in simplest form.`,
      input: { kind: 'fraction' },
      answer: fracAns(n0, d0, true),
      answerDisplay: `$${frac(n0, d0)}$`,
      hints: ['Find the highest common factor (HCF) of the numerator and the denominator.', `Both ${n} and ${d} can be divided by ${k}. Is there anything larger?`],
      solution: [`HCF of ${n} and ${d} is ${k}.`, `$\\dfrac{${n} \\div ${k}}{${d} \\div ${k}} = ${frac(n0, d0)}$.`],
      misconceptions: [],
    };
  },
};

// ---------------------------------------------------------------------------
export const fractionAdd: QuestionTemplate = {
  id: 'fraction-add',
  skillId: 'fraction-add',
  generate(rng, level) {
    let b: number;
    let d: number;
    if (level === 1) {
      b = d = rng.int(5, 12);
    } else if (level === 2) {
      b = rng.int(2, 6);
      d = b * rng.int(2, 3);
    } else {
      b = rng.int(2, 7);
      d = rng.intExcept(2, 9, [b]);
      if (level >= 3 && gcd(b, d) !== 1 && rng.chance(0.6)) d = rng.pick([3, 5, 7].filter((x) => x !== b));
    }
    const a = rng.int(1, b - 1 || 1);
    const c = rng.int(1, d - 1 || 1);
    const subtract = level >= 4;
    const sign = subtract ? -1 : 1;
    const common = lcm(b, d);
    const top = a * (common / b) + sign * c * (common / d);
    const r = rat(top, common);
    const op = subtract ? '-' : '+';
    const whole = level === 5 ? rng.int(1, 3) : 0;
    const total = rat(top + whole * common, common);
    const lhs = level === 5 ? `${whole}\\tfrac{${a}}{${b}} ${op} \\tfrac{${c}}{${d}}` : `\\dfrac{${a}}{${b}} ${op} \\dfrac{${c}}{${d}}`;
    const final = level === 5 ? total : r;
    const wrongTop = level === 5 ? a + whole * b + sign * c : a + sign * c;
    const ms: Misconception[] = [];
    if (b !== d) {
      ms.push({
        code: 'add-denominators',
        answer: fracAns(wrongTop, b + d, false),
        feedback: `You ${subtract ? 'subtracted' : 'added'} the denominators. Rewrite both fractions with denominator ${common} first.`,
      });
    }
    return {
      prompt: `Calculate $${lhs}$. Give your answer in simplest form${level === 5 ? ' (an improper fraction is fine)' : ''}.`,
      input: { kind: 'fraction' },
      answer: fracAns(final.n, final.d, true),
      answerDisplay: `$${frac(final.n, final.d)}$`,
      hints:
        b === d
          ? ['The denominators are already the same, so the pieces are the same size.', `${subtract ? 'Subtract' : 'Add'} the numerators and keep the denominator.`]
          : [
              'You can only add or subtract pieces of the same size. Find a common denominator.',
              `The lowest common multiple of ${b} and ${d} is ${common}.`,
              ...(level === 5 ? [`Convert $${whole}\\tfrac{${a}}{${b}}$ to an improper fraction first.`] : []),
            ],
      solution: [
        ...(level === 5 ? [`$${whole}\\tfrac{${a}}{${b}} = \\tfrac{${whole * b + a}}{${b}}$.`] : []),
        ...(b === d ? [] : [`Common denominator: ${common}.`, `$\\dfrac{${level === 5 ? whole * b + a : a}}{${b}} = \\dfrac{${(level === 5 ? whole * b + a : a) * (common / b)}}{${common}}$ and $\\dfrac{${c}}{${d}} = \\dfrac{${c * (common / d)}}{${common}}$.`]),
        `$\\dfrac{${top + whole * common}}{${common}}$${final.d !== common ? ` simplifies to $${frac(final.n, final.d)}$` : ''}.`,
      ],
      misconceptions: ms,
    };
  },
};

// ---------------------------------------------------------------------------
export const fractionMultiply: QuestionTemplate = {
  id: 'fraction-multiply',
  skillId: 'fraction-multiply',
  generate(rng, level) {
    const b = rng.int(2, 9);
    const d = rng.int(2, 9);
    const a = rng.int(1, b - 1 || 1);
    const c = rng.int(1, d - 1 || 1);
    if (level <= 2) {
      const r = rat(a * c, b * d);
      return {
        prompt: `Calculate $\\dfrac{${a}}{${b}} \\times \\dfrac{${c}}{${d}}$ in simplest form.`,
        input: { kind: 'fraction' },
        answer: fracAns(r.n, r.d, true),
        answerDisplay: `$${frac(r.n, r.d)}$`,
        hints: ['Multiply the numerators together and the denominators together.', 'Then simplify. You can also cancel common factors before multiplying.'],
        solution: [`$\\dfrac{${a} \\times ${c}}{${b} \\times ${d}} = \\dfrac{${a * c}}{${b * d}}$.`, ...(r.d !== b * d ? [`Simplify: $${frac(r.n, r.d)}$.`] : [])],
        misconceptions: [],
      };
    }
    if (level === 5) {
      const w = rng.int(2, 6);
      const r = rat(w * d, c);
      return {
        prompt: `A recipe needs $\\tfrac{${c}}{${d}}$ of a cup of flour per batch. How many batches can you make with ${w} cups? Give your answer as a fraction in simplest form.`,
        input: { kind: 'fraction' },
        answer: fracAns(r.n, r.d, true),
        answerDisplay: `$${frac(r.n, r.d)}$ batches`,
        hints: ['"How many lots of ... fit into ..." is a division.', `Work out $${w} \\div \\tfrac{${c}}{${d}}$. Dividing by a fraction means multiplying by its reciprocal.`],
        solution: [`$${w} \\div \\dfrac{${c}}{${d}} = ${w} \\times \\dfrac{${d}}{${c}}$.`, `$= \\dfrac{${w * d}}{${c}}${r.d !== c ? ` = ${frac(r.n, r.d)}` : ''}$.`],
        misconceptions: [{ code: 'not-inverted', answer: fracAns(w * c, d, false), feedback: 'You multiplied by the fraction instead of dividing by it.' }].filter((m) => !(m.answer.n === r.n && m.answer.d === r.d)) as Misconception[],
      };
    }
    const r = rat(a * d, b * c);
    const wrong = rat(a * c, b * d);
    return {
      prompt: `Calculate $\\dfrac{${a}}{${b}} \\div \\dfrac{${c}}{${d}}$ in simplest form.`,
      input: { kind: 'fraction' },
      answer: fracAns(r.n, r.d, true),
      answerDisplay: `$${frac(r.n, r.d)}$`,
      hints: ['To divide by a fraction, multiply by its reciprocal.', `The reciprocal of $\\tfrac{${c}}{${d}}$ is $\\tfrac{${d}}{${c}}$.`],
      solution: [`$\\dfrac{${a}}{${b}} \\div \\dfrac{${c}}{${d}} = \\dfrac{${a}}{${b}} \\times \\dfrac{${d}}{${c}}$.`, `$= \\dfrac{${a * d}}{${b * c}}${r.d !== b * c ? ` = ${frac(r.n, r.d)}` : ''}$.`],
      misconceptions:
        wrong.n === r.n && wrong.d === r.d
          ? []
          : [
              { code: 'not-inverted', answer: fracAns(wrong.n, wrong.d, false), feedback: 'You multiplied straight across. Flip the second fraction first, then multiply.' },
              ...(rat(b * c, a * d).n !== r.n || rat(b * c, a * d).d !== r.d
                ? [{ code: 'not-inverted' as const, answer: fracAns(b * c, a * d, false), feedback: 'You flipped the first fraction. Flip the one you are dividing **by**, which is the second.' }]
                : []),
            ],
    };
  },
};
