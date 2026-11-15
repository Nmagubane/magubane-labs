/**
 * Surds and patterns (CAPS Paper 1):
 * - Grade 11 surds and rational exponents: simplifying, adding, expanding, rationalising, surd equations;
 * - Grade 10 linear patterns and Grade 11 quadratic patterns: general terms, term values, term numbers, contexts;
 * - Grade 12 series: sigma notation, sums to infinity and convergence, the number of terms, S_n − S_{n−1}.
 * Surd answers use the `surd` answer kind, so 6√2 is right and √72 or 2√18 is "right value, not simplest form".
 * surds-patterns.test.ts checks every answer numerically against the prompt.
 */
import type { QuestionTemplate, Misconception, AnswerSpec } from '../types.ts';
import type { Rng } from '../rng.ts';
import type { MistakeCode } from '../mistakes.ts';
import { rat, ratTex, ratText, mul, add, sub, div, type Rational } from '../rational.ts';
import { exact, keepNum, choice } from './kit.ts';
import { surd, toTerms, surdTex, sameSurd, surdPlus, surdTimes, surdReciprocal, extract, type Surd } from '../surd.ts';
import { sum } from '../tex.ts';

// ---------------------------------------------------------------------------
// Surds

const surdAns = (v: Surd): AnswerSpec => ({ kind: 'surd', terms: toTerms(v), requireSimplest: true });
function keepSurds(ms: { code: MistakeCode; value: Surd; feedback: string }[], answer: Surd): Misconception[] {
  const seen = [answer];
  const out: Misconception[] = [];
  for (const m of ms) {
    if (seen.some((s) => sameSurd(s, m.value))) continue;
    seen.push(m.value);
    out.push({ code: m.code, answer: surdAns(m.value), feedback: m.feedback });
  }
  return out;
}
const SQUAREFREE = [2, 3, 5, 6, 7, 10, 11, 13];
/** c√r in TeX, written as given (not simplified). */
const rootTex = (c: number, r: number) => `${c === 1 ? '' : c === -1 ? '-' : c}\\sqrt{${r}}`;
const SURD_INPUT = { kind: 'surd' as const };

export const surds: QuestionTemplate = {
  id: 'surds',
  skillId: 'surds',
  generate(rng, level) {
    if (level === 1) {
      const kind = rng.pick(['simplify', 'simplify', 'coefficient', 'between'] as const);
      if (kind === 'between') {
        let n = 0;
        do n = rng.int(5, 150);
        while (Number.isInteger(Math.sqrt(n)));
        const lo = Math.floor(Math.sqrt(n));
        const opt = (a: number) => ({ id: `p${a}`, text: `$${a}$ and $${a + 1}$` });
        const options = [lo - 1, lo, lo + 1].filter((a) => a >= 1);
        return choice(rng, {
          prompt: `Between which two consecutive whole numbers does $\\sqrt{${n}}$ lie?`,
          correct: opt(lo),
          distractors: options.filter((a) => a !== lo).map((a) => ({ ...opt(a), feedback: `$${a}^2 = ${a * a}$ and $${a + 1}^2 = ${(a + 1) ** 2}$, so $\\sqrt{${n}}$ is not between them. Find the squares on either side of ${n}.` })),
          keepOrder: options.map(opt),
          code: 'surd-simplify',
          hints: ['Find the perfect squares just below and just above the number under the root.'],
          solution: [`$${lo}^2 = ${lo * lo} < ${n} < ${(lo + 1) ** 2} = ${lo + 1}^2$`, `So $${lo} < \\sqrt{${n}} < ${lo + 1}$.`],
        });
      }
      const s = rng.pick(SQUAREFREE);
      const k = rng.int(2, 10);
      const c = kind === 'coefficient' ? rng.int(2, 5) : 1;
      const n = k * k * s;
      const ans = surd([s, c * k]);
      const partial = (() => {
        for (let f = 2; f < k; f++) if (k % f === 0) return { out: f, inside: (k / f) ** 2 * s };
        return null;
      })();
      return {
        prompt: `Simplify $${rootTex(c, n)}$.`,
        input: SURD_INPUT,
        answer: surdAns(ans),
        answerDisplay: `$${surdTex(ans)}$`,
        hints: [`Find the largest perfect square that divides ${n}.`, `$${n} = ${k * k} \\times ${s}$, and $\\sqrt{${k * k}} = ${k}$.`],
        solution: [c === 1 ? `$\\sqrt{${n}} = \\sqrt{${k * k} \\times ${s}} = ${surdTex(ans)}$` : `$${rootTex(c, n)} = ${c}\\sqrt{${k * k} \\times ${s}} = ${c} \\times ${k}\\sqrt{${s}} = ${surdTex(ans)}$`],
        misconceptions: keepSurds(
          [
            { code: 'surd-simplify', value: surd([s, c * k * k]), feedback: `You took out ${k * k}, but $\\sqrt{${k * k}} = ${k}$: take out the square root of the square factor.` },
            ...(partial ? [{ code: 'surd-simplify' as MistakeCode, value: surd([s, c * partial.out * 2]), feedback: `Check: $${n} = ${k * k} \\times ${s}$. Use the largest square factor.` }] : []),
          ],
          ans,
        ),
      };
    }
    if (level === 2) {
      // Add and subtract surds that simplify to the same radicand.
      for (;;) {
        const s = rng.pick([2, 3, 5, 6, 7]);
        const ks = [rng.int(1, 6), rng.int(2, 6), rng.int(1, 5)];
        const cs = [rng.pick([1, 1, 2, 3]), rng.pick([1, 2, 3, 4]), rng.pick([1, 1, 2])];
        const signs = [1, rng.pick([1, -1]), -1];
        const total = ks.reduce((acc, k, j) => acc + signs[j]! * cs[j]! * k, 0);
        if (total === 0 || new Set(ks).size < 2) continue;
        const parts = ks.map((k, j) => ({ c: cs[j]!, n: k * k * s, sign: signs[j]! }));
        const shown = parts.map((p, j) => `${j === 0 ? '' : p.sign < 0 ? ' - ' : ' + '}${rootTex(p.c, p.n)}`).join('');
        const ans = surd([s, total]);
        const lumped = parts.reduce((acc, p) => acc + p.sign * p.n, 0);
        return {
          prompt: `Simplify $${shown}$.`,
          input: SURD_INPUT,
          answer: surdAns(ans),
          answerDisplay: `$${surdTex(ans)}$`,
          hints: ['Simplify each surd first: take out its largest square factor.', `They all become multiples of $\\sqrt{${s}}$: like surds, which you can add like like terms.`],
          solution: [`$= ${parts.map((p, j) => `${j === 0 ? '' : p.sign < 0 ? ' - ' : ' + '}${p.c * ks[j]! === 1 ? '' : p.c * ks[j]!}\\sqrt{${s}}`).join('')}$`, `$= ${surdTex(ans)}$`],
          misconceptions: keepSurds(
            lumped > 0 && parts.every((p) => p.c === 1) ? [{ code: 'surd-add', value: surd([lumped, 1]), feedback: '$\\sqrt{a} + \\sqrt{b} \\ne \\sqrt{a + b}$. Simplify each surd, then add the like surds.' }] : [],
            ans,
          ),
        };
      }
    }
    if (level === 3) {
      const kind = rng.pick(['product', 'square', 'conjugate', 'exponent'] as const);
      if (kind === 'exponent') {
        // Rational exponents: b^(p/q) with b a perfect q-th power.
        const q = rng.pick([2, 3, 4]);
        const root = rng.int(2, q === 4 ? 3 : q === 3 ? 5 : 9);
        const b = root ** q;
        const p = rng.pick([1, 2, 3, -1, -2, -3].filter((x) => Math.abs(x) % q !== 0));
        const val = p > 0 ? rat(root ** p) : rat(1, root ** -p);
        const ans = surd([1, val]);
        return {
          prompt: `Evaluate $${b}^{\\frac{${p}}{${q}}}$ without a calculator.`,
          input: SURD_INPUT,
          answer: surdAns(ans),
          answerDisplay: `$${ratTex(val)}$`,
          hints: [`$${b} = ${root}^{${q}}$, so $${b}^{\\frac{1}{${q}}} = ${root}$.`, p < 0 ? 'A negative exponent means one over: $a^{-n} = \\dfrac{1}{a^n}$.' : `Then raise ${root} to the power ${p}.`],
          solution: [`$${b}^{\\frac{${p}}{${q}}} = (${root}^{${q}})^{\\frac{${p}}{${q}}} = ${root}^{${p}} = ${ratTex(val)}$`],
          misconceptions: keepSurds(
            [
              ...(p < 0 ? [{ code: 'negative-exponent' as MistakeCode, value: surd([1, -(root ** -p)]), feedback: 'A negative exponent does not make the answer negative: $a^{-n} = \\dfrac{1}{a^n}$.' }] : []),
              { code: 'exponent-laws', value: surd([1, rat(b * p, q)]), feedback: `$${b}^{\\frac{${p}}{${q}}}$ is not $${b} \\times \\frac{${p}}{${q}}$. Take the ${q === 2 ? 'square' : q === 3 ? 'cube' : 'fourth'} root, then the power.` },
            ],
            ans,
          ),
        };
      }
      if (kind === 'square') {
        const [a, b] = rng.shuffle(SQUAREFREE.slice(0, 6)).slice(0, 2) as [number, number];
        const sign = rng.pick([1, -1]);
        const ans = surdPlus(surd([1, a + b]), surd([a * b, 2 * sign]));
        return {
          prompt: `Expand and simplify $(\\sqrt{${a}} ${sign < 0 ? '-' : '+'} \\sqrt{${b}})^2$.`,
          input: SURD_INPUT,
          answer: surdAns(ans),
          answerDisplay: `$${surdTex(ans)}$`,
          hints: ['$(x + y)^2 = x^2 + 2xy + y^2$: there is a middle term.', `$(\\sqrt{${a}})^2 = ${a}$ and $\\sqrt{${a}} \\times \\sqrt{${b}} = \\sqrt{${a * b}}$.`],
          solution: [`$= ${a} ${sign < 0 ? '-' : '+'} 2\\sqrt{${a * b}} + ${b} = ${surdTex(ans)}$`],
          misconceptions: keepSurds([{ code: 'surd-expand', value: surd([1, a + b]), feedback: '$(x + y)^2 \\ne x^2 + y^2$. You missed the middle term $2xy$.' }], ans),
        };
      }
      const s = rng.pick([2, 3, 5, 7]);
      const p = rng.signed(1, 6);
      const q = rng.signed(1, 4);
      if (kind === 'conjugate') {
        const ans = surd([1, p * p - q * q * s]);
        return {
          prompt: `Simplify $(${p} + ${rootTex(Math.abs(q), s)})(${p} - ${rootTex(Math.abs(q), s)})$.`.replace('+ -', '- '),
          input: SURD_INPUT,
          answer: surdAns(ans),
          answerDisplay: `$${surdTex(ans)}$`,
          hints: ['This is a difference of two squares: $(a + b)(a - b) = a^2 - b^2$.', `$(${rootTex(Math.abs(q), s)})^2 = ${q * q} \\times ${s} = ${q * q * s}$.`],
          solution: [`$= ${p < 0 ? `(${p})` : p}^2 - (${rootTex(Math.abs(q), s)})^2 = ${p * p} - ${q * q * s} = ${p * p - q * q * s}$`],
          misconceptions: keepSurds([
            { code: 'surd-expand', value: surd([1, p * p - Math.abs(q) * s]), feedback: `Square the whole of $${rootTex(Math.abs(q), s)}$: $(${rootTex(Math.abs(q), s)})^2 = ${q * q * s}$.` },
            { code: 'surd-expand', value: surd([1, p * p + q * q * s]), feedback: 'Difference of two squares: the middle terms cancel, and the last term is subtracted.' },
          ], ans),
        };
      }
      const u = rng.signed(1, 6);
      const v = rng.signed(1, 4);
      const ans = surdPlus(surd([1, p * u + q * v * s]), surd([s, p * v + q * u]));
      if (ans.size < 2) return surds.generate(rng, 3);
      const bin = (a: number, b: number) => `(${a} ${b < 0 ? '-' : '+'} ${rootTex(Math.abs(b), s)})`;
      return {
        prompt: `Expand and simplify $${bin(p, q)}${bin(u, v)}$.`,
        input: SURD_INPUT,
        answer: surdAns(ans),
        answerDisplay: `$${surdTex(ans)}$`,
        hints: ['Multiply every term in the first bracket by every term in the second.', `$\\sqrt{${s}} \\times \\sqrt{${s}} = ${s}$.`],
        solution: [`$= ${p * u} ${sum([[p * v, `\\sqrt{${s}}`], [q * u, `\\sqrt{${s}}`]]).replace(/^(?!-)/, '+ ')} ${q * v * s < 0 ? '-' : '+'} ${Math.abs(q * v * s)}$`, `$= ${surdTex(ans)}$`],
        misconceptions: keepSurds([
          { code: 'surd-expand', value: surdPlus(surd([1, p * u + q * v]), surd([s, p * v + q * u])), feedback: `$\\sqrt{${s}} \\times \\sqrt{${s}} = ${s}$, not 1.` },
          { code: 'surd-expand', value: surd([1, p * u], [s, q * v]), feedback: 'Multiply every term by every term: you have missed the two middle products.' },
        ], ans),
      };
    }
    if (level === 4) {
      // Rationalise the denominator.
      if (rng.chance(0.4)) {
        const s = rng.pick(SQUAREFREE);
        const a = rng.int(1, 12) * (rng.chance(0.5) ? s : 1);
        const k = rng.pick([1, 1, 2, 3]);
        const ans = surdTimes(surd([1, a]), surdReciprocal(surd([s, k])));
        return {
          prompt: `Rationalise the denominator and simplify: $\\dfrac{${a}}{${rootTex(k, s)}}$.`,
          input: SURD_INPUT,
          answer: surdAns(ans),
          answerDisplay: `$${surdTex(ans)}$`,
          hints: [`Multiply the top and the bottom by $\\sqrt{${s}}$.`, `$\\sqrt{${s}} \\times \\sqrt{${s}} = ${s}$. Then cancel if you can.`],
          solution: [`$\\dfrac{${a}}{${rootTex(k, s)}} \\times \\dfrac{\\sqrt{${s}}}{\\sqrt{${s}}} = \\dfrac{${a}\\sqrt{${s}}}{${k * s}} = ${surdTex(ans)}$`],
          misconceptions: keepSurds([
            { code: 'rationalise', value: surd([s, rat(a, k)]), feedback: `Multiplying the top by $\\sqrt{${s}}$ means multiplying the bottom by it too: the bottom becomes $${k * s}$.` },
            { code: 'rationalise', value: surd([s, rat(a, k * k * s)]), feedback: `$${rootTex(k, s)} \\times \\sqrt{${s}} = ${k * s}$, not $${k * k * s}$.` },
          ], ans),
        };
      }
      for (;;) {
        const s = rng.pick([2, 3, 5, 6, 7]);
        const p = rng.int(1, 6);
        const q = rng.pick([1, -1]);
        if (p * p === s) continue;
        const top = rng.chance(0.5) ? surd([1, rng.int(1, 12)]) : surd([1, rng.int(1, 6)], [s, rng.pick([1, -1])]);
        const den = surd([1, p], [s, q]);
        const ans = surdTimes(top, surdReciprocal(den));
        const topTex = surdTex(top);
        const denTex = `${p} ${q < 0 ? '-' : '+'} \\sqrt{${s}}`;
        const conjTex = `${p} ${q < 0 ? '+' : '-'} \\sqrt{${s}}`;
        const wrongDen = surdTimes(top, surdTimes(surd([1, p], [s, -q]), surdReciprocal(surd([1, p * p + s]))));
        return {
          prompt: `Rationalise the denominator and simplify: $\\dfrac{${topTex}}{${denTex}}$.`,
          input: SURD_INPUT,
          answer: surdAns(ans),
          answerDisplay: `$${surdTex(ans)}$`,
          hints: [`Multiply the top and the bottom by the conjugate $${conjTex}$.`, `The bottom becomes $${p}^2 - (\\sqrt{${s}})^2 = ${p * p - s}$.`],
          solution: [`$\\dfrac{${topTex}}{${denTex}} \\times \\dfrac{${conjTex}}{${conjTex}}$`, `Bottom: $${p * p} - ${s} = ${p * p - s}$`, `$= ${surdTex(ans)}$`],
          misconceptions: keepSurds([{ code: 'rationalise', value: wrongDen, feedback: `$(${denTex})(${conjTex}) = ${p * p} - ${s}$: the product of conjugates is a difference of squares, so subtract.` }], ans),
        };
      }
    }
    // Level 5: equations.
    if (rng.chance(0.3)) {
      // x^(p/q) = k with p odd.
      // An odd numerator, so there is one real solution.
      const q = rng.pick([2, 3]);
      const p = rng.pick(q === 2 ? [1, 3] : [1, 5]);
      const x = rng.int(2, q === 2 ? 9 : p === 5 ? 3 : 6) ** q;
      const k = Math.round(x ** (p / q));
      const c = rng.pick([1, 1, 2, 3]);
      const ans = rat(x);
      return {
        prompt: `Solve for $x$: $${c === 1 ? '' : c}x^{\\frac{${p}}{${q}}} = ${c * k}$.`,
        input: { kind: 'roots', variable: 'x' },
        answer: { kind: 'roots', values: [{ n: ans.n, d: 1 }] },
        answerDisplay: `$x = ${x}$`,
        hints: [c === 1 ? 'Raise both sides to the reciprocal power to undo the exponent.' : `Divide by ${c} first.`, `$\\left(x^{\\frac{${p}}{${q}}}\\right)^{\\frac{${q}}{${p}}} = x$`],
        solution: [...(c === 1 ? [] : [`$x^{\\frac{${p}}{${q}}} = ${k}$`]), `$x = ${k}^{\\frac{${q}}{${p}}} = ${x}$`],
        misconceptions: keepNumRoots([{ code: 'rational-exponent', value: Math.round(k ** (p / q) * 1000) / 1000, feedback: `Raise both sides to $\\frac{${q}}{${p}}$, the reciprocal of $\\frac{${p}}{${q}}$, not to $\\frac{${p}}{${q}}$ again.` }], x),
      };
    }
    // √(ax + b) = x + c, with one root that doesn't check.
    for (;;) {
      const c = rng.int(-4, 4);
      const r1 = rng.int(-c + 1, -c + 8);
      const r2 = rng.int(-c - 8, -c - 1);
      const a = 2 * c + r1 + r2;
      const b = c * c - r1 * r2;
      if (a === 0) continue;
      const inside = sum([[a, 'x'], [b, '']]);
      const right = sum([[1, 'x'], [c, '']]);
      return {
        prompt: `Solve for $x$: $\\sqrt{${inside}} = ${right}$.`,
        input: { kind: 'roots', variable: 'x' },
        answer: { kind: 'roots', values: [{ n: r1, d: 1 }] },
        answerDisplay: `$x = ${r1}$ ($x = ${r2}$ does not check)`,
        hints: ['Square both sides, then solve the quadratic.', 'Squaring can create a false root. Check every answer in the original equation: a square root is never negative.'],
        solution: [`$${inside} = (${right})^2 = ${sum([[1, 'x^2'], [2 * c, 'x'], [c * c, '']])}$`, `$${sum([[1, 'x^2'], [2 * c - a, 'x'], [c * c - b, '']])} = 0$, so $x = ${r1}$ or $x = ${r2}$.`, `Check $x = ${r2}$: the right side is $${r2 + c} < 0$, but a square root can't be negative. So $x = ${r1}$ only.`],
        misconceptions: [{ code: 'extraneous-root', answer: { kind: 'roots', values: [{ n: r1, d: 1 }, { n: r2, d: 1 }] }, feedback: `Check $x = ${r2}$ in the original: $${r2} ${c < 0 ? '-' : '+'} ${Math.abs(c)} = ${r2 + c}$ is negative, and a square root can't be. Squaring added a false root.` }],
      };
    }
  },
};

function keepNumRoots(ms: { code: MistakeCode; value: number; feedback: string }[], ans: number): Misconception[] {
  return ms.filter((m) => Number.isInteger(m.value) && m.value !== ans).map((m) => ({ code: m.code, answer: { kind: 'roots', values: [{ n: m.value, d: 1 }] }, feedback: m.feedback }));
}

// ---------------------------------------------------------------------------
// Patterns

/** "3;\ 7;\ 11;\ 15;\ \dots" for TeX. */
const seq = (ts: number[]) => `${ts.join(';\\ ')};\\ \\dots`;
/** A polynomial in n, highest power first, as text the expression checker reads: (1/2)n^2 + (3/2)n + 1. */
function polyText(cs: Rational[]): string {
  const deg = cs.length - 1;
  let out = '';
  cs.forEach((c, i) => {
    if (c.n === 0) return;
    const p = deg - i;
    const v = p === 0 ? '' : p === 1 ? 'n' : `n^${p}`;
    const abs = rat(Math.abs(c.n), c.d);
    const coef = p > 0 && abs.n === 1 && abs.d === 1 ? '' : abs.d === 1 ? String(abs.n) : p === 0 ? `${abs.n}/${abs.d}` : `(${abs.n}/${abs.d})`;
    out += out === '' ? `${c.n < 0 ? '-' : ''}${coef}${v}` : ` ${c.n < 0 ? '-' : '+'} ${coef}${v}`;
  });
  return out || '0';
}
function polyTex(cs: Rational[]): string {
  const deg = cs.length - 1;
  let out = '';
  cs.forEach((c, i) => {
    if (c.n === 0) return;
    const p = deg - i;
    const v = p === 0 ? '' : p === 1 ? 'n' : `n^{${p}}`;
    const abs = rat(Math.abs(c.n), c.d);
    const coef = p > 0 && abs.n === 1 && abs.d === 1 ? '' : ratTex(abs);
    out += out === '' ? `${c.n < 0 ? '-' : ''}${coef}${v}` : ` ${c.n < 0 ? '-' : '+'} ${coef}${v}`;
  });
  return out || '0';
}
const exprAns = (cs: Rational[]): AnswerSpec => ({ kind: 'expression', expr: polyText(cs) });
function keepExprs(ms: { code: MistakeCode; cs: Rational[]; feedback: string }[], ans: Rational[]): Misconception[] {
  const key = (cs: Rational[]) => cs.map(ratText).join(',');
  const seen = new Set([key(ans)]);
  const out: Misconception[] = [];
  for (const m of ms) {
    if (seen.has(key(m.cs))) continue;
    seen.add(key(m.cs));
    out.push({ code: m.code, answer: exprAns(m.cs), feedback: m.feedback });
  }
  return out;
}
const TN = { kind: 'expression' as const, prefix: 'T_n =', variables: ['n'] };
/** A negative number in brackets, for substituting. */
const br = (v: number) => (v < 0 ? `(${v})` : `${v}`);

const LINEAR_CONTEXTS = [
  { story: 'Tables are pushed together in a row. One table seats', unit: 'people', thing: 'tables', d: 4, a: 6 },
  { story: 'A row of squares is made from matchsticks. One square uses', unit: 'matchsticks', thing: 'squares', d: 3, a: 4 },
  { story: 'A row of triangles is made from matchsticks. One triangle uses', unit: 'matchsticks', thing: 'triangles', d: 2, a: 3 },
  { story: 'Hexagonal tiles are laid in a row. One tile has a perimeter of', unit: 'cm', thing: 'tiles', d: 8, a: 12 },
  { story: 'A row of houses is built from matchsticks. One house uses', unit: 'matchsticks', thing: 'houses', d: 5, a: 6 },
];

export const linearPatterns: QuestionTemplate = {
  id: 'linear-patterns',
  skillId: 'linear-patterns',
  generate(rng, level) {
    const a = rng.int(-12, 20);
    const d = rng.signed(2, 9);
    const T = (n: number) => a + (n - 1) * d;
    const shown = seq([1, 2, 3, 4].map(T));
    if (level === 1) {
      const cs = [rat(d), rat(a - d)];
      return {
        prompt: `Find the general term $T_n$ of the linear pattern $${shown}$.`,
        input: TN,
        answer: exprAns(cs),
        answerDisplay: `$T_n = ${polyTex(cs)}$`,
        hints: [`The constant difference is $${T(2)} - ${T(1) < 0 ? `(${T(1)})` : T(1)} = ${d}$, so $T_n = ${d}n + c$.`, `Use $T_1 = ${a}$: $${d}(1) + c = ${a}$.`],
        solution: [`$d = ${d}$, so $T_n = ${d}n + c$.`, `$T_1 = ${a}$: $c = ${a - d}$.`, `$T_n = ${polyTex(cs)}$`],
        misconceptions: keepExprs(
          [
            { code: 'nth-term', cs: [rat(d), rat(a)], feedback: `Check $n = 1$: that gives $${d + a}$, not $${a}$. The constant is $T_1 - d$.` },
            { code: 'nth-term', cs: [rat(a), rat(d)], feedback: 'The difference multiplies $n$; the first term does not.' },
          ],
          cs,
        ),
      };
    }
    if (level === 2) {
      const k = rng.int(20, 150);
      return {
        prompt: `Find $T_{${k}}$ of the linear pattern $${shown}$.`,
        input: { kind: 'numeric', prefix: `T_{${k}} =` },
        answer: exact(T(k)),
        answerDisplay: `$T_{${k}} = ${T(k)}$`,
        hints: ['Find the general term first: $T_n = dn + c$.', `Then substitute $n = ${k}$.`],
        solution: [`$T_n = ${polyTex([rat(d), rat(a - d)])}$`, `$T_{${k}} = ${d}(${k}) ${a - d < 0 ? '-' : '+'} ${Math.abs(a - d)} = ${T(k)}$`],
        misconceptions: keepNum([
          { code: 'nth-term', answer: exact(a + k * d), feedback: `That is one term too far: there are only ${k - 1} differences between $T_1$ and $T_{${k}}$.` },
          { code: 'nth-term', answer: exact(k * d), feedback: `Check with $n = 1$: $${d} \\times 1 \\ne ${a}$. You need the constant term too.` },
        ], T(k)),
      };
    }
    if (level === 3) {
      const k = rng.int(12, 120);
      return {
        prompt: `Which term of the linear pattern $${shown}$ is equal to $${T(k)}$?`,
        input: { kind: 'numeric', prefix: 'n =' },
        answer: exact(k),
        answerDisplay: `$T_{${k}} = ${T(k)}$, so $n = ${k}$`,
        hints: ['Find the general term $T_n$.', `Set $T_n = ${T(k)}$ and solve for $n$.`],
        solution: [`$T_n = ${polyTex([rat(d), rat(a - d)])}$`, `$${polyTex([rat(d), rat(a - d)])} = ${T(k)}$, so $n = ${k}$`],
        misconceptions: keepNum([{ code: 'term-number', answer: exact(k - 1), feedback: `That counts the differences. The term number is one more: check $T_{${k - 1}}$.` }], k),
      };
    }
    if (level === 4) {
      const c = rng.pick(LINEAR_CONTEXTS);
      const P = (n: number) => c.a + (n - 1) * c.d;
      const table = `${c.story} ${c.a} ${c.unit}, 2 ${c.thing} ${c.unit === 'cm' ? 'have' : 'use'} ${P(2)}, and 3 ${c.thing} ${c.unit === 'cm' ? 'have' : 'use'} ${P(3)}.`.replace('One table seats', 'One table seats').replace('2 tables use', '2 tables seat').replace('3 tables use', '3 tables seat');
      if (rng.chance(0.5)) {
        const k = rng.int(15, 80);
        return {
          prompt: `${table} How many ${c.unit} for ${k} ${c.thing}?`,
          input: { kind: 'numeric', unit: c.unit },
          answer: exact(P(k)),
          answerDisplay: `${P(k)} ${c.unit}`,
          hints: [`The pattern goes up by ${c.d} each time: $T_n = ${c.d}n + ${c.a - c.d}$.`, `Substitute $n = ${k}$.`],
          solution: [`$T_n = ${c.d}n + ${c.a - c.d}$`, `$T_{${k}} = ${c.d}(${k}) + ${c.a - c.d} = ${P(k)}$`],
          misconceptions: keepNum([
            { code: 'nth-term', answer: exact(c.a * k), feedback: `Shapes in a row share sides, so ${k} of them need fewer than ${k} × ${c.a}. Use the pattern's constant difference.` },
            { code: 'nth-term', answer: exact(c.a + k * c.d), feedback: 'That is one step too far: the first shape is already counted.' },
          ], P(k)),
        };
      }
      const k = rng.int(15, 80);
      const limit = P(k) - rng.int(1, c.d - 1 || 1);
      // The smallest number of shapes that needs more than `limit`.
      let n = 1;
      while (P(n) <= limit) n++;
      return {
        prompt: `${table} What is the smallest number of ${c.thing} that ${c.unit === 'people' ? 'seats' : c.unit === 'cm' ? 'has' : 'uses'} more than ${limit} ${c.unit}?`,
        input: { kind: 'numeric', unit: c.thing },
        answer: exact(n),
        answerDisplay: `${n} ${c.thing}`,
        hints: [`$T_n = ${c.d}n + ${c.a - c.d}$. Solve $T_n > ${limit}$.`, 'Round up to the next whole number of shapes.'],
        solution: [`$${c.d}n + ${c.a - c.d} > ${limit}$, so $n > ${String(Math.round(((limit - c.a + c.d) / c.d) * 100) / 100).replace('.', '{,}')}$`, `The smallest whole number is $${n}$.`],
        misconceptions: keepNum([{ code: 'term-number', answer: exact(n - 1), feedback: `Check $T_{${n - 1}} = ${P(n - 1)}$: that is not more than ${limit}. Round up.` }], n),
      };
    }
    // Level 5: an unknown in a linear pattern, or the general term from two terms.
    if (rng.chance(0.5)) {
      for (;;) {
        // p1 x + q1; p2 x + q2; p3 x + q3 with equal differences.
        const x = rng.int(-6, 9);
        const p = [rng.int(1, 4), rng.int(1, 5), rng.int(1, 6)];
        const vals = [rng.int(-5, 15)];
        const dd = rng.signed(2, 9);
        vals.push(vals[0]! + dd, vals[0]! + 2 * dd);
        const q = vals.map((v, j) => v - p[j]! * x);
        // The equation (t2 - t1) = (t3 - t2) must have x as its only solution.
        if (p[1]! - p[0]! === p[2]! - p[1]!) continue;
        const term = (j: number) => sum([[p[j]!, 'x'], [q[j]!, '']]);
        return {
          prompt: `$${term(0)};\\ ${term(1)};\\ ${term(2)};\\ \\dots$ is a linear pattern. Find $x$.`,
          input: { kind: 'numeric', prefix: 'x =' },
          answer: exact(x),
          answerDisplay: `$x = ${x}$ (the pattern is $${vals.join(';\\ ')};\\ \\dots$)`,
          hints: ['In a linear pattern the differences are equal: $T_2 - T_1 = T_3 - T_2$.', 'Write that as an equation in $x$ and solve.'],
          solution: [`$(${term(1)}) - (${term(0)}) = (${term(2)}) - (${term(1)})$`, `$${sum([[p[1]! - p[0]!, 'x'], [q[1]! - q[0]!, '']])} = ${sum([[p[2]! - p[1]!, 'x'], [q[2]! - q[1]!, '']])}$, so $x = ${x}$`],
          misconceptions: [],
        };
      }
    }
    const [i, j] = [rng.int(2, 6), rng.int(8, 20)];
    const cs = [rat(d), rat(a - d)];
    return {
      prompt: `In a linear pattern, $T_{${i}} = ${T(i)}$ and $T_{${j}} = ${T(j)}$. Find the general term.`,
      input: TN,
      answer: exprAns(cs),
      answerDisplay: `$T_n = ${polyTex(cs)}$`,
      hints: [`From $T_{${i}}$ to $T_{${j}}$ there are ${j - i} differences.`, `$d = \\dfrac{${T(j)} - ${T(i) < 0 ? `(${T(i)})` : T(i)}}{${j - i}}$; then use $T_{${i}}$ to find the constant.`],
      solution: [`$d = \\dfrac{${T(j) - T(i)}}{${j - i}} = ${d}$`, `$${d}(${i}) + c = ${T(i)}$, so $c = ${a - d}$`, `$T_n = ${polyTex(cs)}$`],
      misconceptions: keepExprs([{ code: 'nth-term', cs: [rat(T(j) - T(i), j - i + 1), rat(0)], feedback: `Between $T_{${i}}$ and $T_{${j}}$ there are ${j - i} differences, not ${j - i + 1}.` }], cs),
    };
  },
};

// ---------------------------------------------------------------------------
// Quadratic patterns

/** A quadratic pattern from T_1, the first first difference and the second difference: all integer terms. */
function quad(rng: Rng, D?: number) {
  const D2 = D ?? rng.pick([1, 2, 3, 4, 5, 6, -2, -4, 2, 4]);
  const t1 = rng.int(-6, 12);
  const f1 = rng.int(-8, 10);
  const a = rat(D2, 2);
  const b = sub(rat(f1), mul(a, rat(3)));
  const c = sub(sub(rat(t1), a), b);
  const T = (n: number) => t1 + f1 * (n - 1) + (D2 * (n - 1) * (n - 2)) / 2;
  return { D2, t1, f1, a, b, c, T, cs: [a, b, c] };
}

const QUAD_CONTEXTS = [
  { rows: ['Number of people', 'Handshakes'], first: 2, T: (n: number) => (n * (n - 1)) / 2, ask: (k: number) => `If everyone in a group of ${k} people shakes hands with everyone else once, how many handshakes are there?` },
  { rows: ['Number of points on a circle', 'Lines joining them'], first: 2, T: (n: number) => (n * (n - 1)) / 2, ask: (k: number) => `How many lines join ${k} points on a circle, every point to every other?` },
  { rows: ['Number of teams', 'Matches (each pair plays twice)'], first: 2, T: (n: number) => n * (n - 1), ask: (k: number) => `How many matches are played by ${k} teams if each pair of teams plays twice?` },
  { rows: ['Rows in the triangle of dots', 'Dots'], first: 1, T: (n: number) => (n * (n + 1)) / 2, ask: (k: number) => `How many dots are in a triangle with ${k} rows?` },
];

export const quadraticPatterns: QuestionTemplate = {
  id: 'quadratic-patterns',
  skillId: 'quadratic-patterns',
  generate(rng, level) {
    const q = quad(rng);
    const shown = seq([1, 2, 3, 4].map(q.T));
    if (level === 1) {
      const next = q.T(5);
      const lastDiff = q.T(4) - q.T(3);
      return {
        prompt: `Find the next term of the quadratic pattern $${shown}$.`,
        input: { kind: 'numeric', prefix: 'T_5 =' },
        answer: exact(next),
        answerDisplay: `$T_5 = ${next}$`,
        hints: ['Write down the first differences, then the second differences.', `The second difference is constant: $${q.D2}$. Add it to the last first difference.`],
        solution: [`First differences: $${[1, 2, 3].map((n) => q.T(n + 1) - q.T(n)).join(';\\ ')}$. Second difference: $${q.D2}$.`, `Next first difference: $${lastDiff} ${q.D2 < 0 ? '-' : '+'} ${Math.abs(q.D2)} = ${lastDiff + q.D2}$, so $T_5 = ${q.T(4)} ${lastDiff + q.D2 < 0 ? '-' : '+'} ${Math.abs(lastDiff + q.D2)} = ${next}$`],
        misconceptions: keepNum([{ code: 'second-difference', answer: exact(q.T(4) + lastDiff), feedback: 'The first differences are not constant in a quadratic pattern: they change by the second difference each time.' }], next),
      };
    }
    if (level === 2) {
      return {
        prompt: `Find the general term $T_n = an^2 + bn + c$ of the quadratic pattern $${shown}$.`,
        input: TN,
        answer: exprAns(q.cs),
        answerDisplay: `$T_n = ${polyTex(q.cs)}$`,
        hints: [`The second difference is $${q.D2}$, and it equals $2a$.`, '$3a + b = T_2 - T_1$ and $a + b + c = T_1$.'],
        solution: [`$2a = ${q.D2}$, so $a = ${ratTex(q.a)}$`, `$3a + b = ${q.f1}$, so $b = ${ratTex(q.b)}$`, `$a + b + c = ${q.t1}$, so $c = ${ratTex(q.c)}$`, `$T_n = ${polyTex(q.cs)}$`],
        misconceptions: keepExprs(
          (() => {
            const a = rat(q.D2);
            const b = sub(rat(q.f1), mul(a, rat(3)));
            const c = sub(sub(rat(q.t1), a), b);
            return [{ code: 'second-difference' as MistakeCode, cs: [a, b, c], feedback: `The second difference is $2a$, so $a = \\frac{${q.D2}}{2}$, not $${q.D2}$.` }];
          })(),
          q.cs,
        ),
      };
    }
    if (level === 3) {
      if (rng.chance(0.5)) {
        const k = rng.int(15, 50);
        return {
          prompt: `Find $T_{${k}}$ of the quadratic pattern $${shown}$.`,
          input: { kind: 'numeric', prefix: `T_{${k}} =` },
          answer: exact(q.T(k)),
          answerDisplay: `$T_{${k}} = ${q.T(k)}$`,
          hints: ['Find the general term $T_n = an^2 + bn + c$ first.', `Then substitute $n = ${k}$.`],
          solution: [`$T_n = ${polyTex(q.cs)}$`, `$T_{${k}} = ${q.T(k)}$`],
          misconceptions: keepNum([{ code: 'second-difference', answer: exact(q.t1 + (k - 1) * q.f1), feedback: 'That treats the pattern as linear. The differences grow, so find $T_n = an^2 + bn + c$.' }], q.T(k)),
        };
      }
      // Which term has a given value? Choose a pattern that keeps growing after n = 1.
      for (;;) {
        const p = quad(rng, rng.pick([2, 4, 6, 1, 3]));
        if (p.f1 <= 0) continue;
        const k = rng.int(8, 30);
        const val = p.T(k);
        // Make sure no other positive whole n gives the same value.
        if ([...Array(200).keys()].some((n) => n + 1 !== k && p.T(n + 1) === val)) continue;
        return {
          prompt: `Which term of the quadratic pattern $${seq([1, 2, 3, 4].map(p.T))}$ is equal to $${val}$?`,
          input: { kind: 'numeric', prefix: 'n =' },
          answer: exact(k),
          answerDisplay: `$n = ${k}$`,
          hints: ['Find the general term, then set it equal to the value.', 'Solve the quadratic equation. $n$ must be a positive whole number.'],
          solution: [`$T_n = ${polyTex(p.cs)}$`, `$${polyTex(p.cs)} = ${val}$`, `The positive whole-number solution is $n = ${k}$.`],
          misconceptions: keepNum([{ code: 'term-number', answer: exact(k - 1), feedback: `Check by substituting: $T_{${k - 1}} = ${p.T(k - 1)}$.` }], k),
        };
      }
    }
    if (level === 4) {
      const ctx = rng.pick(QUAD_CONTEXTS);
      const k = rng.int(12, 60);
      const ns = [0, 1, 2, 3].map((j) => ctx.first + j);
      return {
        prompt: `${ctx.rows[0]}: ${ns.join(', ')}. ${ctx.rows[1]}: ${ns.map(ctx.T).join(', ')}. ${ctx.ask(k)}`,
        input: { kind: 'numeric' },
        answer: exact(ctx.T(k)),
        answerDisplay: `${ctx.T(k)}`,
        hints: ['Check the differences: the second differences are constant, so the pattern is quadratic.', 'Find the general term and substitute. Be careful which term number goes with which row.'],
        solution: [`First differences: ${ns.slice(1).map((n, j) => ctx.T(n) - ctx.T(ns[j]!)).join(', ')}; second difference constant.`, `The answer for ${k}: $${ctx.T(k)}$.`],
        misconceptions: keepNum([
          { code: 'nth-term', answer: exact(ctx.T(k - 1)), feedback: `Match the term number to the row: the pattern starts at ${ctx.first}, not 1.` },
          { code: 'nth-term', answer: exact(ctx.T(k + 1)), feedback: `Match the term number to the row: the pattern starts at ${ctx.first}, not 1.` },
          { code: 'second-difference', answer: exact(ctx.T(ns[0]!) + (k - ns[0]!) * (ctx.T(ns[1]!) - ctx.T(ns[0]!))), feedback: 'The differences grow, so the pattern is quadratic, not linear.' },
        ], ctx.T(k)),
      };
    }
    // Level 5: a missing term, or the smallest term.
    if (rng.chance(0.5)) {
      const hide = rng.int(2, 3);
      const terms = [1, 2, 3, 4].map(q.T);
      const shownTex = terms.map((t, j) => (j + 1 === hide ? 'p' : String(t))).join(';\\ ');
      return {
        prompt: `$${shownTex};\\ \\dots$ is a quadratic pattern (its second difference is constant). Find $p$.`,
        input: { kind: 'numeric', prefix: 'p =' },
        answer: exact(q.T(hide)),
        answerDisplay: `$p = ${q.T(hide)}$`,
        hints: ['Write the first differences in terms of $p$.', 'Then the two second differences must be equal: solve for $p$.'],
        solution:
          hide === 2
            ? [`First differences: $p - ${br(terms[0]!)}$, $${terms[2]} - p$, $${terms[3]} - ${br(terms[2]!)} = ${terms[3]! - terms[2]!}$`, `Equal second differences: $(${terms[2]} - p) - (p - ${br(terms[0]!)}) = ${terms[3]! - terms[2]!} - (${terms[2]} - p)$`, `$${terms[2]! + terms[0]!} - 2p = ${terms[3]! - 2 * terms[2]!} + p$, so $3p = ${3 * q.T(2)}$ and $p = ${q.T(2)}$`]
            : [`First differences: $${terms[1]! - terms[0]!}$, $p - ${br(terms[1]!)}$, $${terms[3]} - p$`, `Equal second differences: $(p - ${br(terms[1]!)}) - ${br(terms[1]! - terms[0]!)} = (${terms[3]} - p) - (p - ${br(terms[1]!)})$`, `$p ${-2 * terms[1]! + terms[0]! < 0 ? '-' : '+'} ${Math.abs(-2 * terms[1]! + terms[0]!)} = ${terms[3]! + terms[1]!} - 2p$, so $3p = ${3 * q.T(3)}$ and $p = ${q.T(3)}$`],
        misconceptions: keepNum([{ code: 'second-difference', answer: exact(Math.round((terms[hide - 2]! + terms[hide]!) / 2)), feedback: 'Halfway between the neighbours would make the pattern linear. Use equal second differences.' }], q.T(hide)),
      };
    }
    for (;;) {
      const p = quad(rng, rng.pick([2, 4, 6]));
      // A pattern that falls and then rises, with one smallest term.
      const vals = Array.from({ length: 40 }, (_, j) => p.T(j + 1));
      const min = Math.min(...vals);
      const at = vals.indexOf(min) + 1;
      if (at < 4 || at > 25 || vals.filter((v) => v === min).length > 1) continue;
      return {
        prompt: `The quadratic pattern $${seq([1, 2, 3, 4].map(p.T))}$ decreases and then increases. Which term has the smallest value?`,
        input: { kind: 'numeric', prefix: 'n =' },
        answer: exact(at),
        answerDisplay: `$T_{${at}} = ${min}$ is the smallest, so $n = ${at}$`,
        hints: ['Find $T_n = an^2 + bn + c$. Its graph is a parabola opening upwards.', 'The turning point is at $n = -\\dfrac{b}{2a}$: take the nearest whole number.'],
        solution: [`$T_n = ${polyTex(p.cs)}$`, `$n = -\\dfrac{b}{2a} = ${String(Math.round((-(p.b.n / p.b.d) / (2 * (p.a.n / p.a.d))) * 100) / 100).replace('.', '{,}')}$`, `The smallest term is $T_{${at}} = ${min}$.`],
        misconceptions: keepNum([{ code: 'term-number', answer: exact(min), feedback: `That is the smallest value. The question asks which term it is: $n = ${at}$.` }], at),
      };
    }
  },
};

// ---------------------------------------------------------------------------
// Series

const fracAns = (r: Rational): AnswerSpec => ({ kind: 'fraction', n: r.n, d: r.d, requireSimplest: false });
const RATIOS = [rat(1, 2), rat(1, 3), rat(2, 3), rat(1, 4), rat(3, 4), rat(-1, 2), rat(-1, 3), rat(2, 5), rat(-2, 3), rat(3, 5)];
const termTex = (r: Rational) => (r.d === 1 ? `${r.n}` : `${r.n < 0 ? '-' : ''}\\frac{${Math.abs(r.n)}}{${r.d}}`);

export const series: QuestionTemplate = {
  id: 'series',
  skillId: 'series',
  generate(rng, level) {
    if (level === 1) {
      if (rng.chance(0.3)) {
        const lo = rng.int(0, 6);
        const hi = rng.int(lo + 8, lo + 40);
        return {
          prompt: `How many terms are there in $\\displaystyle\\sum_{k=${lo}}^{${hi}} (${sum([[rng.signed(2, 5), 'k'], [rng.signed(1, 9), '']])})$?`,
          input: { kind: 'numeric' },
          answer: exact(hi - lo + 1),
          answerDisplay: `$${hi} - ${lo} + 1 = ${hi - lo + 1}$`,
          hints: ['Count from the bottom value of $k$ to the top value, including both ends.'],
          solution: [`$k = ${lo}, ${lo + 1}, \\dots, ${hi}$: that is $${hi} - ${lo} + 1 = ${hi - lo + 1}$ terms.`],
          misconceptions: keepNum([{ code: 'sigma-notation', answer: exact(hi - lo), feedback: `From ${lo} to ${hi} inclusive is one more than ${hi} − ${lo}.` }], hi - lo + 1),
        };
      }
      const p = rng.signed(2, 6);
      const c = rng.int(-9, 9);
      const n = rng.int(10, 40);
      let S = 0;
      for (let k = 1; k <= n; k++) S += p * k + c;
      return {
        prompt: `Evaluate $\\displaystyle\\sum_{k=1}^{${n}} (${sum([[p, 'k'], [c, '']])})$.`,
        input: { kind: 'numeric' },
        answer: exact(S),
        answerDisplay: `$${S}$`,
        hints: [`Write out the first terms: $k = 1$ gives $${p + c}$, $k = 2$ gives $${2 * p + c}$: an arithmetic series with $d = ${p}$.`, `$S_n = \\dfrac{n}{2}(a + l)$ with $n = ${n}$, $a = ${p + c}$ and $l = ${p * n + c}$.`],
        solution: [`$a = ${p + c}$, $d = ${p}$, $n = ${n}$, last term $${p * n + c}$`, `$S_{${n}} = \\dfrac{${n}}{2}(${p + c} + ${br(p * n + c)}) = ${S}$`],
        misconceptions: keepNum([
          { code: 'sigma-notation', answer: exact(p * n + c), feedback: 'That is only the last term. $\\sum$ means add all the terms.' },
          { code: 'sigma-notation', answer: exact(S - (p * n + c)), feedback: `There are ${n} terms: $k$ runs from 1 to ${n}, inclusive.` },
        ], S),
      };
    }
    if (level === 2) {
      const r = rng.pick(RATIOS);
      const a = rng.signed(2, 12) * r.d * r.d;
      const ans = div(rat(a), sub(rat(1), r));
      const t = (j: number) => mul(rat(a), rat(r.n ** j, r.d ** j));
      return {
        prompt: `Find the sum to infinity of $${termTex(t(0))} ${[1, 2].map((j) => `${t(j).n < 0 ? '-' : '+'} ${termTex(rat(Math.abs(t(j).n), t(j).d))}`).join(' ')} + \\dots$`.replace('+ -', '- '),
        input: { kind: 'fraction', prefix: 'S_\\infty =' },
        answer: fracAns(ans),
        answerDisplay: `$S_\\infty = ${ratTex(ans)}$`,
        hints: [`It is geometric: $r = ${ratTex(r)}$, and $-1 < r < 1$, so it converges.`, '$S_\\infty = \\dfrac{a}{1 - r}$'],
        solution: [`$a = ${a}$, $r = ${ratTex(r)}$`, `$S_\\infty = \\dfrac{${a}}{1 - (${ratTex(r)})} = ${ratTex(ans)}$`],
        misconceptions: (() => {
          const ms: Misconception[] = [];
          const seen = [ans];
          const addM = (v: Rational, code: MistakeCode, feedback: string) => {
            if (v.d === 0 || seen.some((s) => s.n === v.n && s.d === v.d)) return;
            seen.push(v);
            ms.push({ code, answer: fracAns(v), feedback });
          };
          addM(div(rat(a), add(rat(1), r)), 'sum-to-infinity', '$S_\\infty = \\dfrac{a}{1 - r}$: subtract $r$ (and watch the sign when $r$ is negative).');
          addM(div(rat(a), sub(r, rat(1))), 'sum-to-infinity', 'That is $\\dfrac{a}{r - 1}$, which is negative for a converging positive series. Use $\\dfrac{a}{1 - r}$.');
          return ms;
        })(),
      };
    }
    if (level === 3) {
      if (rng.chance(0.35)) {
        // Find r from S∞ and a.
        const r = rng.pick(RATIOS);
        const a = rng.int(2, 12) * r.d;
        const S = div(rat(a), sub(rat(1), r));
        return {
          prompt: `A converging geometric series has first term $${a}$ and sum to infinity $${ratTex(S)}$. Find the common ratio.`,
          input: { kind: 'fraction', prefix: 'r =' },
          answer: fracAns(r),
          answerDisplay: `$r = ${ratTex(r)}$`,
          hints: ['$S_\\infty = \\dfrac{a}{1 - r}$', `$${ratTex(S)} = \\dfrac{${a}}{1 - r}$: solve for $r$.`],
          solution: [`$1 - r = \\dfrac{${a}}{${ratTex(S)}} = ${ratTex(sub(rat(1), r))}$`, `$r = ${ratTex(r)}$`],
          misconceptions: (() => {
            const w = sub(rat(1), r);
            return w.n === r.n && w.d === r.d ? [] : [{ code: 'sum-to-infinity' as MistakeCode, answer: fracAns(w), feedback: 'That is $1 - r$. Subtract it from 1 to get $r$.' }];
          })(),
        };
      }
      // For which x does Σ (base)^k converge? -1 < base < 1.
      const p = rng.int(-5, 6);
      const q = rng.int(2, 5);
      const form = rng.pick(['frac', 'lin'] as const);
      let lo: Rational, hi: Rational, baseTex: string;
      if (form === 'frac') {
        lo = rat(p - q);
        hi = rat(p + q);
        baseTex = `\\dfrac{${sum([[1, 'x'], [-p, '']])}}{${q}}`;
      } else {
        lo = rat(-1 - p, q);
        hi = rat(1 - p, q);
        baseTex = sum([[q, 'x'], [p, '']]);
      }
      const set = [{ lo: { n: lo.n, d: lo.d }, hi: { n: hi.n, d: hi.d }, loIn: false, hiIn: false }];
      return {
        prompt: `For which values of $x$ does $\\displaystyle\\sum_{k=1}^{\\infty} \\left(${baseTex}\\right)^{k}$ converge?`,
        input: { kind: 'inequality', variable: 'x' },
        answer: { kind: 'inequality', variable: 'x', set },
        answerDisplay: `$${ratTex(lo)} < x < ${ratTex(hi)}$`,
        hints: [`It is geometric with $r = ${baseTex}$.`, 'A geometric series converges when $-1 < r < 1$: solve the double inequality.'],
        solution: [`$-1 < ${baseTex} < 1$`, `$${ratTex(lo)} < x < ${ratTex(hi)}$`],
        misconceptions: [{ code: 'convergence', answer: { kind: 'inequality', variable: 'x', set: [{ lo: null, hi: { n: hi.n, d: hi.d }, loIn: false, hiIn: false }] }, feedback: 'Convergence needs $-1 < r < 1$, both sides: $r < 1$ alone is not enough.' }],
      };
    }
    if (level === 4) {
      if (rng.chance(0.5)) {
        // Arithmetic: S_n = X, find n.
        for (;;) {
          const a = rng.int(-10, 15);
          const d = rng.int(2, 7);
          const n = rng.int(8, 40);
          const S = (n * (2 * a + (n - 1) * d)) / 2;
          // Only one positive whole n gives this sum.
          let hits = 0;
          for (let m = 1; m <= 200; m++) if ((m * (2 * a + (m - 1) * d)) / 2 === S) hits++;
          if (hits !== 1) continue;
          return {
            prompt: `How many terms of the arithmetic series $${a} ${a + d < 0 ? '-' : '+'} ${Math.abs(a + d)} ${a + 2 * d < 0 ? '-' : '+'} ${Math.abs(a + 2 * d)} + \\dots$ add up to $${S}$?`.replace(/^\$-/, '$-'),
            input: { kind: 'numeric', prefix: 'n =' },
            answer: exact(n),
            answerDisplay: `$n = ${n}$`,
            hints: ['$S_n = \\dfrac{n}{2}[2a + (n - 1)d]$', `Set it equal to ${S}: you get a quadratic in $n$. Keep the positive whole-number solution.`],
            solution: [`$\\dfrac{n}{2}[2(${a}) + (n - 1)(${d})] = ${S}$`, `$${d}n^2 + ${2 * a - d}n - ${2 * S} = 0$`.replace('+ -', '- '), `$n = ${n}$`],
            misconceptions: Number.isInteger((S - a) / d + 1) ? keepNum([{ code: 'nth-term', answer: exact((S - a) / d + 1), feedback: 'That finds the term equal to the sum. Use the formula for $S_n$.' }], n) : [],
          };
        }
      }
      const r = rng.pick([2, 3]);
      const a = rng.int(1, 9);
      const n = rng.int(5, r === 2 ? 14 : 9);
      const S = (a * (r ** n - 1)) / (r - 1);
      return {
        prompt: `How many terms of the geometric series $${a} + ${a * r} + ${a * r * r} + \\dots$ add up to $${S}$?`,
        input: { kind: 'numeric', prefix: 'n =' },
        answer: exact(n),
        answerDisplay: `$n = ${n}$`,
        hints: ['$S_n = \\dfrac{a(r^n - 1)}{r - 1}$', `Get $${r}^n$ on its own, then use logs (or recognise the power).`],
        solution: [`$\\dfrac{${a}(${r}^n - 1)}{${r - 1}} = ${S}$`, `$${r}^n = ${r ** n}$, so $n = ${n}$`],
        misconceptions: keepNum([{ code: 'nth-term', answer: exact(n + 1), feedback: `Check: $S_{${n + 1}}$ is more than ${S}.` }], n),
      };
    }
    // Level 5: T_k from a formula for S_n.
    const p = rng.signed(1, 4);
    const q = rng.int(-6, 8);
    const k = rng.int(5, 30);
    const Sn = (n: number) => p * n * n + q * n;
    const Tk = Sn(k) - Sn(k - 1);
    return {
      prompt: `The sum of the first $n$ terms of a series is $S_n = ${sum([[p, 'n^2'], [q, 'n']])}$. Find $T_{${k}}$.`,
      input: { kind: 'numeric', prefix: `T_{${k}} =` },
      answer: exact(Tk),
      answerDisplay: `$T_{${k}} = ${Tk}$`,
      hints: [`The ${k}th term is what $S_{${k}}$ adds to $S_{${k - 1}}$.`, `$T_{${k}} = S_{${k}} - S_{${k - 1}}$`],
      solution: [`$S_{${k}} = ${Sn(k)}$ and $S_{${k - 1}} = ${Sn(k - 1)}$`, `$T_{${k}} = ${Sn(k)} - ${Sn(k - 1) < 0 ? `(${Sn(k - 1)})` : Sn(k - 1)} = ${Tk}$`],
      misconceptions: keepNum([
        { code: 'sigma-notation', answer: exact(Sn(k)), feedback: `That is the sum of the first ${k} terms. The ${k}th term alone is $S_{${k}} - S_{${k - 1}}$.` },
        { code: 'sigma-notation', answer: exact(Sn(k + 1) - Sn(k)), feedback: `That is $T_{${k + 1}}$: $T_{${k}} = S_{${k}} - S_{${k - 1}}$.` },
      ], Tk),
    };
  },
};

/** Exposed for the lab: √m = k√s. */
export { extract };
