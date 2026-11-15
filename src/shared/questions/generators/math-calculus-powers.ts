/**
 * Differentiation with negative and fractional powers (Grade 12, CAPS Paper 1): rewrite 1/x², √x and x√x as powers
 * of x, apply the power rule, and use the derivative for gradients, tangents and turning points.
 * Derivatives are `formula` answers, checked by value at sample points, so −12/x⁴, -12x^(-4) and -12/(x^4) are all
 * right. calculus-powers.test.ts differentiates every prompt numerically and compares.
 */
import type { QuestionTemplate, Misconception, AnswerSpec } from '../types.ts';
import type { Rng } from '../rng.ts';
import type { MistakeCode } from '../mistakes.ts';
import { rat, ratTex, mul, sub, add, type Rational } from '../rational.ts';
import { formulasEquivalent } from '../formula.ts';

/** c·x^p */
interface Term {
  c: Rational;
  p: Rational;
}
const T = (c: number | Rational, p: number | Rational): Term => ({ c: typeof c === 'number' ? rat(c) : c, p: typeof p === 'number' ? rat(p) : p });
const d = (t: Term): Term | null => (t.p.n === 0 ? null : { c: mul(t.c, t.p), p: sub(t.p, rat(1)) });
const deriv = (ts: Term[]) => ts.map(d).filter((t): t is Term => t !== null);

/** Plain text the formula checker reads: (3/2)*x^(1/2) - 4*x^(-2). */
function text(ts: Term[]): string {
  if (!ts.length) return '0';
  return ts
    .map((t, i) => {
      const abs = rat(Math.abs(t.c.n), t.c.d);
      const c = abs.d === 1 ? `${abs.n}` : `(${abs.n}/${abs.d})`;
      const body = t.p.n === 0 ? c : `${c}*x^(${t.p.d === 1 ? t.p.n : `${t.p.n}/${t.p.d}`})`;
      return i === 0 ? (t.c.n < 0 ? `-${body}` : body) : t.c.n < 0 ? ` - ${body}` : ` + ${body}`;
    })
    .join('');
}

/** How a power of x is written in a question: 1/x², √x, x√x, ∛x, or as a power. */
type Style = 'power' | 'natural';
function powTex(p: Rational, style: Style): { num: string; den: string } {
  const key = `${p.n}/${p.d}`;
  if (style === 'natural') {
    const nat: Record<string, { num: string; den: string }> = {
      '1/2': { num: '\\sqrt{x}', den: '' },
      '-1/2': { num: '', den: '\\sqrt{x}' },
      '3/2': { num: 'x\\sqrt{x}', den: '' },
      '-3/2': { num: '', den: 'x\\sqrt{x}' },
      '1/3': { num: '\\sqrt[3]{x}', den: '' },
      '2/3': { num: '\\sqrt[3]{x^{2}}', den: '' },
      '-1/3': { num: '', den: '\\sqrt[3]{x}' },
    };
    if (nat[key]) return nat[key]!;
    if (p.d === 1 && p.n < 0) return { num: '', den: p.n === -1 ? 'x' : `x^{${-p.n}}` };
  }
  if (p.n === 0) return { num: '', den: '' };
  if (p.d === 1 && p.n === 1) return { num: 'x', den: '' };
  return { num: `x^{${pTex(p)}}`, den: '' };
}
/** A term in TeX: 3x^{2}, -\dfrac{4}{x^{2}}, \dfrac{3}{2}\sqrt{x}. */
function termTex(t: Term, style: Style, first: boolean): string {
  const neg = t.c.n < 0;
  const abs = rat(Math.abs(t.c.n), t.c.d);
  const { num, den } = powTex(t.p, style);
  let body: string;
  if (den) {
    const top = abs.d === 1 ? `${abs.n}` : `${abs.n}`;
    const bottom = abs.d === 1 ? den : `${abs.d}${den}`;
    body = `\\dfrac{${top}}{${bottom}}`;
  } else {
    const coef = abs.n === abs.d && num ? '' : abs.d === 1 ? `${abs.n}` : `\\dfrac{${abs.n}}{${abs.d}}`;
    body = `${coef}${num}`;
  }
  return first ? `${neg ? '-' : ''}${body}` : ` ${neg ? '-' : '+'} ${body}`;
}
const tex = (ts: Term[], style: Style = 'natural') => (ts.length ? ts.map((t, i) => termTex(t, style, i === 0)).join('') : '0');

const formulaAns = (ts: Term[]): AnswerSpec => ({ kind: 'formula', expr: text(ts), variables: ['x'] });
function keepDerivs(ms: { code: MistakeCode; ts: Term[]; feedback: string }[], ans: Term[]): Misconception[] {
  const seen = [text(ans)];
  const out: Misconception[] = [];
  for (const m of ms) {
    const t = text(m.ts);
    if (seen.some((s) => formulasEquivalent(s, t, ['x']))) continue;
    seen.push(t);
    out.push({ code: m.code, answer: formulaAns(m.ts), feedback: m.feedback });
  }
  return out;
}
const DERIV = { kind: 'formula' as const, prefix: "f'(x) =", variables: ['x'] };
const DYDX = { kind: 'formula' as const, prefix: '\\dfrac{dy}{dx} =', variables: ['x'] };
/** A power in TeX, with the sign outside the fraction: -\frac{1}{2}. */
function pTex(p: Rational): string {
  return p.d === 1 ? `${p.n}` : `${p.n < 0 ? '-' : ''}\\frac{${Math.abs(p.n)}}{${p.d}}`;
}

/** Powers used in single terms, each with how often it is written naturally. */
const POWERS: Rational[] = [rat(-1), rat(-2), rat(-3), rat(-4), rat(1, 2), rat(-1, 2), rat(3, 2), rat(1, 3), rat(2, 3), rat(-1, 3), rat(-3, 2)];
function coefFor(rng: Rng, p: Rational): number {
  // Keep c·p a whole number or a simple fraction.
  const base = rng.int(1, 6) * (rng.chance(0.25) ? -1 : 1);
  return p.d === 2 ? base * 2 : p.d === 3 ? base * 3 : base;
}

export const derivativePowers: QuestionTemplate = {
  id: 'derivative-powers',
  skillId: 'derivative-powers',
  generate(rng, level) {
    if (level === 1) {
      const p = rng.pick(POWERS);
      const f = [T(coefFor(rng, p), p)];
      const ans = deriv(f);
      const t = f[0]!;
      return {
        prompt: `Find $f'(x)$ if $f(x) = ${tex(f)}$.`,
        input: DERIV,
        answer: formulaAns(ans),
        answerDisplay: `$f'(x) = ${tex(ans, 'natural')}$`,
        hints: [`Write it as a power of $x$ first: $f(x) = ${tex(f, 'power')}$.`, 'Power rule: multiply by the power, then subtract 1 from the power.'],
        solution: [`$f(x) = ${tex(f, 'power')}$`, `$f'(x) = ${pTex(t.p)} \\times ${ratTex(t.c)}x^{${pTex(t.p)} - 1} = ${tex(ans, 'power')}$`, ...(tex(ans, 'power') !== tex(ans, 'natural') ? [`$= ${tex(ans, 'natural')}$`] : [])],
        misconceptions: keepDerivs(
          [
            { code: 'negative-exponent', ts: [{ c: mul(t.c, t.p), p: add(t.p, rat(1)) }], feedback: `Subtract 1 from the power: $${pTex(t.p)} - 1 = ${pTex(sub(t.p, rat(1)))}$.${t.p.n < 0 ? ' With a negative power, subtracting 1 makes it more negative.' : ''}` },
            { code: 'power-rule', ts: [{ c: t.c, p: sub(t.p, rat(1)) }], feedback: `You lowered the power but forgot to multiply by it, $${pTex(t.p)}$.` },
            ...(t.p.n < 0 && t.p.d === 1 ? [{ code: 'negative-exponent' as MistakeCode, ts: [{ c: rat(t.c.n, -t.p.n * t.c.d), p: add(t.p, rat(1)) }], feedback: 'You can\'t differentiate the denominator on its own. Rewrite the term as a negative power of $x$ first.' }] : []),
          ],
          ans,
        ),
      };
    }
    if (level === 2) {
      // A positive power, a negative power and a root.
      const pos = T(rng.signed(1, 5), rng.int(2, 4));
      const negP = rat(-rng.int(1, 3));
      const neg = T(rng.signed(1, 9), negP);
      const rootP = rng.pick([rat(1, 2), rat(-1, 2), rat(3, 2)]);
      const root = T(coefFor(rng, rootP), rootP);
      const k = rng.int(-9, 9);
      const f = [pos, neg, root, ...(k ? [T(k, 0)] : [])];
      const ans = deriv(f);
      const y = rng.chance(0.4);
      return {
        prompt: y ? `Determine $\\dfrac{dy}{dx}$ if $y = ${tex(f)}$.` : `Find $f'(x)$ if $f(x) = ${tex(f)}$.`,
        input: y ? DYDX : DERIV,
        answer: formulaAns(ans),
        answerDisplay: `$${y ? '\\dfrac{dy}{dx}' : "f'(x)"} = ${tex(ans)}$`,
        hints: [`Rewrite every term as a power of $x$: $${tex(f, 'power')}$.`, 'Differentiate term by term. A constant disappears.'],
        solution: [`$${y ? 'y' : 'f(x)'} = ${tex(f, 'power')}$`, `$${y ? '\\dfrac{dy}{dx}' : "f'(x)"} = ${tex(ans, 'power')} = ${tex(ans)}$`],
        misconceptions: keepDerivs(
          [
            { code: 'negative-exponent', ts: deriv([pos, root]).concat([{ c: mul(neg.c, rat(-negP.n)), p: add(negP, rat(1)) }]), feedback: `Rewrite $${termTex(neg, 'natural', true)}$ as $${termTex(neg, 'power', true)}$: the power goes down to $${pTex(sub(negP, rat(1)))}$, and the sign changes.` },
            { code: 'power-rule', ts: deriv([pos, neg, root]).concat(k ? [T(k, 0)] : []), feedback: 'The derivative of a constant is 0.' },
          ],
          ans,
        ),
      };
    }
    if (level === 3) {
      const kind = rng.pick(['quotient', 'quotient', 'square', 'product'] as const);
      if (kind === 'quotient') {
        // (a x^3 + b x^2 + c)/x^k, k = 1 or 2, or (a x + b)/√x.
        if (rng.chance(0.65)) {
          const k = rng.pick([1, 2]);
          const a = rng.signed(1, 5);
          const b = rng.int(-6, 6);
          const c = rng.signed(1, 9);
          const numTex = `${a === 1 ? '' : a === -1 ? '-' : a}x^{3}${b ? ` ${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}x^{2}` : ''} ${c < 0 ? '-' : '+'} ${Math.abs(c)}`;
          const f = [T(a, 3 - k), ...(b ? [T(b, 2 - k)] : []), T(c, -k)];
          const ans = deriv(f);
          const naive = [T(3 * a, 2), ...(b ? [T(2 * b, 1)] : [])].map((t) => ({ c: rat(t.c.n, k === 1 ? 1 : 2), p: k === 1 ? t.p : sub(t.p, rat(1)) }));
          return {
            prompt: `Find $f'(x)$ if $f(x) = \\dfrac{${numTex}}{${k === 1 ? 'x' : 'x^{2}'}}$.`,
            input: DERIV,
            answer: formulaAns(ans),
            answerDisplay: `$f'(x) = ${tex(ans)}$`,
            hints: [`Divide every term on top by $${k === 1 ? 'x' : 'x^{2}'}$ first.`, `$f(x) = ${tex(f, 'power')}$. Then differentiate term by term.`],
            solution: [`$f(x) = ${tex(f, 'power')}$`, `$f'(x) = ${tex(ans, 'power')} = ${tex(ans)}$`],
            misconceptions: keepDerivs([{ code: 'rewrite-first', ts: naive, feedback: 'You can\'t differentiate the top and the bottom separately. Divide each term by the denominator first, then differentiate.' }], ans),
          };
        }
        const a = rng.signed(1, 6);
        const b = rng.signed(1, 9);
        const f = [T(a, rat(1, 2)), T(b, rat(-1, 2))];
        const ans = deriv(f);
        return {
          prompt: `Find $f'(x)$ if $f(x) = \\dfrac{${a === 1 ? '' : a === -1 ? '-' : a}x ${b < 0 ? '-' : '+'} ${Math.abs(b)}}{\\sqrt{x}}$.`,
          input: DERIV,
          answer: formulaAns(ans),
          answerDisplay: `$f'(x) = ${tex(ans)}$`,
          hints: ['Divide each term on top by $x^{\\frac{1}{2}}$.', `$f(x) = ${tex(f, 'power')}$`],
          solution: [`$f(x) = ${tex(f, 'power')}$`, `$f'(x) = ${tex(ans, 'power')} = ${tex(ans)}$`],
          misconceptions: keepDerivs([{ code: 'rewrite-first', ts: [{ c: rat(2 * a), p: rat(1, 2) }], feedback: 'Differentiating the top and bottom separately doesn\'t work. Split the fraction into powers of $x$ first.' }], ans),
        };
      }
      if (kind === 'square') {
        const c = rng.signed(1, 5);
        // (√x + c)² = x + 2c√x + c²
        const f = [T(1, 1), T(2 * c, rat(1, 2)), T(c * c, 0)];
        const ans = deriv(f);
        return {
          prompt: `Find $f'(x)$ if $f(x) = (\\sqrt{x} ${c < 0 ? '-' : '+'} ${Math.abs(c)})^{2}$.`,
          input: DERIV,
          answer: formulaAns(ans),
          answerDisplay: `$f'(x) = ${tex(ans)}$`,
          hints: ['Expand the square first: $(a + b)^2 = a^2 + 2ab + b^2$.', `$f(x) = x ${2 * c < 0 ? '-' : '+'} ${Math.abs(2 * c)}x^{\\frac{1}{2}} + ${c * c}$`],
          solution: [`$f(x) = x ${2 * c < 0 ? '-' : '+'} ${Math.abs(2 * c)}x^{\\frac{1}{2}} + ${c * c}$`, `$f'(x) = ${tex(ans, 'power')} = ${tex(ans)}$`],
          misconceptions: keepDerivs([{ code: 'rewrite-first', ts: [T(2, rat(1, 2)), T(2 * c, 0)], feedback: 'Bringing the power down in front only works with the chain rule, which you don\'t need here. Expand the bracket first, then differentiate each term.' }], ans),
        };
      }
      // √x (x − c) = x^{3/2} − c x^{1/2}
      const c = rng.signed(1, 8);
      const f = [T(1, rat(3, 2)), T(-c, rat(1, 2))];
      const ans = deriv(f);
      return {
        prompt: `Find $f'(x)$ if $f(x) = \\sqrt{x}(x ${c < 0 ? '+' : '-'} ${Math.abs(c)})$.`,
        input: DERIV,
        answer: formulaAns(ans),
        answerDisplay: `$f'(x) = ${tex(ans)}$`,
        hints: ['Multiply out first: $\\sqrt{x} \\times x = x^{\\frac{3}{2}}$.', `$f(x) = ${tex(f, 'power')}$`],
        solution: [`$f(x) = ${tex(f, 'power')}$`, `$f'(x) = ${tex(ans, 'power')} = ${tex(ans)}$`],
        misconceptions: keepDerivs([{ code: 'rewrite-first', ts: [T(rat(1, 2), rat(-1, 2))], feedback: 'The derivative of a product is not the product of the derivatives. Multiply out first, then differentiate.' }], ans),
      };
    }
    if (level === 4) {
      // Gradient at a point, or the equation of the tangent to y = k/x (+ q).
      if (rng.chance(0.55)) {
        const a = rng.pick([1, 4, 9, 16]);
        const c = rng.signed(1, 8);
        const n = rng.int(1, 3);
        const e = rng.signed(1, 6) * 2;
        const f = [T(c, -n), T(e, rat(1, 2))];
        const df = deriv(f);
        const val = df.reduce((s, t) => add(s, mul(t.c, powR(a, t.p))), rat(0));
        return {
          prompt: `Find the gradient of the curve $f(x) = ${tex(f)}$ at $x = ${a}$.`,
          input: { kind: 'fraction', prefix: "f'(" + a + ') =' },
          answer: { kind: 'fraction', n: val.n, d: val.d, requireSimplest: false },
          answerDisplay: `$f'(${a}) = ${ratTex(val)}$`,
          hints: [`Differentiate first: $f'(x) = ${tex(df)}$.`, `Then substitute $x = ${a}$ (and $\\sqrt{${a}} = ${Math.sqrt(a)}$).`],
          solution: [`$f'(x) = ${tex(df)}$`, `$f'(${a}) = ${ratTex(val)}$`],
          misconceptions: (() => {
            const fv = f.reduce((s, t) => add(s, mul(t.c, powR(a, t.p))), rat(0));
            return fv.n === val.n && fv.d === val.d ? [] : [{ code: 'tangent-line' as MistakeCode, answer: { kind: 'fraction', n: fv.n, d: fv.d, requireSimplest: false }, feedback: 'That is $f(' + a + ')$, the height of the curve. The gradient is $f\'(' + a + ')$: differentiate first.' }];
          })(),
        };
      }
      const k = rng.signed(1, 12);
      const a = rng.pick([1, 2, 3, -1, -2, 4]);
      const q = rng.int(-4, 4);
      const m = rat(-k, a * a);
      const y0 = add(rat(k, a), rat(q));
      const cIntercept = sub(y0, mul(m, rat(a)));
      const lineText = `y=${m.d === 1 ? m.n : `(${m.n}/${m.d})`}x+${cIntercept.d === 1 ? cIntercept.n : `(${cIntercept.n}/${cIntercept.d})`}`.replace('+-', '-');
      const lineTex = `y = ${ratTex(m) === '1' ? '' : ratTex(m) === '-1' ? '-' : ratTex(m)}x ${cIntercept.n < 0 ? '-' : '+'} ${ratTex(rat(Math.abs(cIntercept.n), cIntercept.d))}`;
      return {
        prompt: `Find the equation of the tangent to $f(x) = ${k < 0 ? '-' : ''}\\dfrac{${Math.abs(k)}}{x}${q ? ` ${q < 0 ? '-' : '+'} ${Math.abs(q)}` : ''}$ at the point where $x = ${a}$.`,
        input: { kind: 'equation', variables: ['x', 'y'], placeholder: 'e.g. y = -2x + 5' },
        answer: { kind: 'equation', expr: lineText },
        answerDisplay: `$${lineTex}$`,
        hints: [`$f(x) = ${k}x^{-1}${q ? ` ${q < 0 ? '-' : '+'} ${Math.abs(q)}` : ''}$, so $f'(x) = ${-k < 0 ? '-' : ''}\\dfrac{${Math.abs(k)}}{x^2}$. The gradient is $f'(${a})$.`, `The point of contact is $(${a};\\, f(${a}))$. Use $y - y_1 = m(x - x_1)$.`],
        solution: [`$m = f'(${a}) = ${ratTex(m)}$`, `Point: $(${a};\\, ${ratTex(y0)})$`, `$${lineTex}$`],
        misconceptions: [],
      };
    }
    // Level 5: turning points of f(x) = a x² + b/x, or of a√x − b x.
    if (rng.chance(0.5)) {
      const a = rng.int(1, 3);
      const t = rng.signed(1, 3);
      const b = 2 * a * t ** 3;
      const y = rat(a * t * t * t + b, t);
      return {
        prompt: `Find the turning point of $f(x) = ${a === 1 ? '' : a}x^{2} ${b < 0 ? '-' : '+'} \\dfrac{${Math.abs(b)}}{x}$.`,
        input: { kind: 'point', name: '' },
        answer: { kind: 'point', x: { n: t, d: 1 }, y: { n: y.n, d: y.d } },
        answerDisplay: `$(${t};\\, ${ratTex(y)})$`,
        hints: [`$f'(x) = ${2 * a}x ${b < 0 ? '+' : '-'} \\dfrac{${Math.abs(b)}}{x^{2}}$. Set it equal to 0.`, `Multiply by $x^2$: $${2 * a}x^3 = ${b}$. Then find $y$ from $f$, not $f'$.`],
        solution: [`$f'(x) = ${2 * a}x - ${b < 0 ? `(${b})` : b}x^{-2} = 0$`, `$x^3 = ${b / (2 * a)}$, so $x = ${t}$`, `$f(${t}) = ${ratTex(y)}$: the turning point is $(${t};\\, ${ratTex(y)})$.`],
        misconceptions: [
          { code: 'stationary-points', answer: { kind: 'point', x: { n: t, d: 1 }, y: { n: 0, d: 1 } }, feedback: "That uses $f'(x) = 0$ for the $y$-value. Substitute the $x$-value into $f$ to find $y$." },
        ],
      };
    }
    for (;;) {
      const b = rng.int(1, 4);
      const s = rng.int(1, 6);
      const a = 2 * b * s; // f'(x) = a/(2√x) − b = 0 → √x = a/(2b) = s
      const x = s * s;
      const y = a * s - b * x;
      if (y === 0) continue;
      return {
        prompt: `Find the coordinates of the turning point of $f(x) = ${a}\\sqrt{x} - ${b === 1 ? '' : b}x$.`,
        input: { kind: 'point', name: '' },
        answer: { kind: 'point', x: { n: x, d: 1 }, y: { n: y, d: 1 } },
        answerDisplay: `$(${x};\\, ${y})$`,
        hints: [`$f(x) = ${a}x^{\\frac{1}{2}} - ${b === 1 ? '' : b}x$, so $f'(x) = \\dfrac{${a / 2}}{\\sqrt{x}} - ${b}$.`, `Set $f'(x) = 0$: $\\sqrt{x} = ${s}$.`],
        solution: [`$f'(x) = ${a / 2}x^{-\\frac{1}{2}} - ${b} = 0$`, `$\\sqrt{x} = ${s}$, so $x = ${x}$`, `$f(${x}) = ${a}(${s}) - ${b === 1 ? '' : b}${b === 1 ? x : `(${x})`} = ${y}$`],
        misconceptions: [
          { code: 'stationary-points', answer: { kind: 'point', x: { n: s, d: 1 }, y: { n: a * Math.sqrt(s) - b * s, d: 1 } }, feedback: `$\\sqrt{x} = ${s}$ means $x = ${s}^2 = ${x}$.` },
        ].filter((m) => Number.isInteger(m.answer.y.n) && s !== x) as Misconception[],
      };
    }
  },
};

/** a^p exactly, for whole-number roots: 4^(1/2) = 2, 9^(-1) = 1/9. */
function powR(a: number, p: Rational): Rational {
  const root = Math.round(a ** (1 / p.d));
  if (root ** p.d !== a) throw new Error(`no exact root of ${a}`);
  return p.n >= 0 ? rat(root ** p.n) : rat(1, root ** -p.n);
}
