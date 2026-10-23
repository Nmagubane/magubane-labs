import type { QuestionTemplate, Misconception, AnswerSpec } from '../types.ts';
import { sum, sumPlain } from '../tex.ts';
import { rat, ratTex, eq as req, type Rational } from '../rational.ts';
import { expressionsEquivalent } from '../expr.ts';

const fracAnswer = (r: Rational): AnswerSpec => ({ kind: 'fraction', n: r.n, d: r.d, requireSimplest: false });
const pt = (x: number, y: number) => `(${x};\\, ${y})`;

function keepRat(ms: { code: Misconception['code']; value: Rational | null; feedback: string }[], correct: Rational): Misconception[] {
  const out: Misconception[] = [];
  const seen: Rational[] = [correct];
  for (const m of ms) {
    if (!m.value || seen.some((s) => req(s, m.value as Rational))) continue;
    seen.push(m.value);
    out.push({ code: m.code, answer: fracAnswer(m.value), feedback: m.feedback });
  }
  return out;
}

const safe = (n: number, d: number) => (d === 0 ? null : rat(n, d));

// ---------------------------------------------------------------------------
export const gradient: QuestionTemplate = {
  id: 'gradient',
  skillId: 'gradient',
  generate(rng, level) {
    const hints = ['Gradient = change in $y$ ÷ change in $x$: $m = \\dfrac{y_2 - y_1}{x_2 - x_1}$.'];
    if (level === 5) {
      const m = rng.signed(1, 4);
      const x1 = rng.int(-4, 3);
      const y1 = rng.int(-5, 5);
      const dx = rng.int(1, 4);
      const x2 = x1 + dx;
      const k = y1 + m * dx;
      return {
        prompt: `The line through $A${pt(x1, y1)}$ and $B(${x2};\\, k)$ has a gradient of $${m}$. Find $k$.`,
        input: { kind: 'fraction', prefix: 'k =' },
        answer: fracAnswer(rat(k)),
        answerDisplay: `$k = ${k}$`,
        hints: [...hints, `Substitute: $${m} = \\dfrac{k - ${y1 < 0 ? `(${y1})` : y1}}{${x2} - ${x1 < 0 ? `(${x1})` : x1}}$, then solve for $k$.`],
        solution: [`$${m} = \\dfrac{k - ${y1 < 0 ? `(${y1})` : y1}}{${dx}}$.`, `$k - ${y1 < 0 ? `(${y1})` : y1} = ${m * dx}$.`, `$k = ${k}$.`],
        misconceptions: keepRat([{ code: 'gradient-inverted', value: safe(y1 * m + dx, m), feedback: 'It looks like you used run ÷ rise. Gradient is rise ÷ run.' }], rat(k)),
      };
    }
    let x1: number, y1: number, x2: number, y2: number;
    for (;;) {
      const span = level >= 4 ? 6 : 5;
      x1 = rng.int(level >= 4 ? -span : 0, span);
      x2 = rng.intExcept(level >= 4 ? -span : 0, span + 2, [x1]);
      y1 = rng.int(level >= 4 ? -span : 0, span);
      y2 = rng.int(level >= 4 ? -span : 0, span + 2);
      const m = rat(y2 - y1, x2 - x1);
      if (y2 === y1) continue;
      if (level === 1 && !(m.d === 1 && m.n > 0)) continue;
      if (level === 2 && !(m.d === 1 && m.n < 0)) continue;
      if (level === 3 && m.d === 1) continue;
      break;
    }
    const m = rat(y2 - y1, x2 - x1);
    const showGraph = level <= 3;
    return {
      prompt: `Find the gradient of the line through $A${pt(x1, y1)}$ and $B${pt(x2, y2)}$.`,
      figure: showGraph
        ? {
            kind: 'graph',
            xRange: [Math.min(-1, x1 - 1, x2 - 1), Math.max(8, x1 + 1, x2 + 1)],
            yRange: [Math.min(-1, y1 - 1, y2 - 1), Math.max(8, y1 + 1, y2 + 1)],
            points: [
              { x: x1, y: y1, label: 'A' },
              { x: x2, y: y2, label: 'B' },
            ],
          }
        : undefined,
      input: { kind: 'fraction', prefix: 'm =' },
      answer: fracAnswer(m),
      answerDisplay: `$m = ${ratTex(m)}$`,
      hints: [...hints, `Change in $y$: $${y2} - ${y1 < 0 ? `(${y1})` : y1} = ${y2 - y1}$. Now find the change in $x$.`],
      solution: [
        `$m = \\dfrac{${y2} - ${y1 < 0 ? `(${y1})` : y1}}{${x2} - ${x1 < 0 ? `(${x1})` : x1}} = \\dfrac{${y2 - y1}}{${x2 - x1}}$.`,
        `$m = ${ratTex(m)}$.${m.n < 0 ? ' The line goes down from left to right, so a negative gradient makes sense.' : ''}`,
      ],
      misconceptions: keepRat(
        [
          { code: 'gradient-inverted', value: safe(x2 - x1, y2 - y1), feedback: 'You calculated run ÷ rise. Gradient is the change in $y$ over the change in $x$.' },
          { code: 'gradient-order', value: safe(y2 - y1, x1 - x2), feedback: 'You subtracted the $x$-values in the opposite order to the $y$-values. Keep the same order on top and bottom.' },
        ],
        m,
      ),
    };
  },
};

// ---------------------------------------------------------------------------
export const straightLine: QuestionTemplate = {
  id: 'straight-line',
  skillId: 'straight-line',
  generate(rng, level) {
    const m = rng.signed(1, 5);
    const c = rng.intExcept(-8, 8, [0, m]);
    const eqTex = `y = ${sum([[m, 'x'], [c, '']])}`;
    if (level === 1) {
      return {
        prompt: `Where does the line $${eqTex}$ cross the $y$-axis? Give the $y$-value.`,
        input: { kind: 'numeric', prefix: 'y =' },
        answer: { kind: 'numeric', value: c, tolerance: 0 },
        answerDisplay: `$y = ${c}$, at the point $(0;\\, ${c})$`,
        hints: ['On the $y$-axis, $x = 0$.', 'Substitute $x = 0$ into the equation.'],
        solution: [`At the $y$-axis $x = 0$: $y = ${m}(0) ${c < 0 ? '-' : '+'} ${Math.abs(c)} = ${c}$.`, 'In $y = mx + c$, the $c$ is always the $y$-intercept.'],
        misconceptions: [{ code: 'intercept-confusion', answer: { kind: 'numeric', value: m, tolerance: 0 }, feedback: `${m} is the gradient $m$. The $y$-intercept is the constant term $c$.` }],
      };
    }
    if (level === 2) {
      const xi = rat(-c, m);
      return {
        prompt: `Where does the line $${eqTex}$ cross the $x$-axis? Give the $x$-value.`,
        input: { kind: 'fraction', prefix: 'x =' },
        answer: fracAnswer(xi),
        answerDisplay: `$x = ${ratTex(xi)}$`,
        hints: ['On the $x$-axis, $y = 0$.', `Solve $0 = ${sum([[m, 'x'], [c, '']])}$.`],
        solution: [`Set $y = 0$: $0 = ${sum([[m, 'x'], [c, '']])}$.`, `$${sum([[m, 'x']])} = ${-c}$, so $x = ${ratTex(xi)}$.`],
        misconceptions: keepRat(
          [
            { code: 'sign-error', value: rat(c, m), feedback: `When you move ${c} across, its sign changes: $${sum([[m, 'x']])} = ${-c}$.` },
            { code: 'intercept-confusion', value: rat(c), feedback: `${c} is the $y$-intercept. For the $x$-intercept, set $y = 0$ and solve.` },
          ],
          xi,
        ),
      };
    }
    if (level === 3) {
      const k = rng.int(2, 4);
      const mk = m * k;
      const ck = c * k;
      return {
        prompt: `What is the gradient of the line $${k}y = ${sum([[mk, 'x'], [ck, '']])}$?`,
        input: { kind: 'fraction', prefix: 'm =' },
        answer: fracAnswer(rat(m)),
        answerDisplay: `$m = ${m}$`,
        hints: ['Write the equation in the form $y = mx + c$ first.', `Divide **every** term by ${k}.`],
        solution: [`Divide every term by ${k}: $${eqTex}$.`, `The gradient is the coefficient of $x$: $m = ${m}$.`],
        misconceptions: keepRat([{ code: 'one-side-only', value: rat(mk), feedback: `The equation has $${k}y$ on the left. Divide every term by ${k} to get $y$ on its own first.` }], rat(m)),
      };
    }
    // levels 4–5: find the equation
    const x1 = rng.int(-3, 2);
    const x2 = x1 + rng.int(1, 3);
    const y1 = m * x1 + c;
    const y2 = m * x2 + c;
    const answerPlain = sumPlain([
      [m, 'x'],
      [c, ''],
    ]);
    const swapped = sumPlain([
      [c, 'x'],
      [m, ''],
    ]);
    const prompt =
      level === 4
        ? `Find the equation of the straight line through $${pt(x1, y1)}$ and $${pt(x2, y2)}$.`
        : 'The graph shows a straight line through two marked points. Find its equation.';
    return {
      prompt,
      figure:
        level === 5
          ? {
              kind: 'graph',
              xRange: [Math.min(-5, x1 - 1), Math.max(5, x2 + 1)],
              yRange: [Math.min(-8, y1 - 1, y2 - 1, c - 1), Math.max(8, y1 + 1, y2 + 1, c + 1)],
              lines: [{ m, c }],
              points: [
                { x: x1, y: y1 },
                { x: x2, y: y2 },
              ],
            }
          : undefined,
      input: { kind: 'expression', prefix: 'y =', variables: ['x'] },
      answer: { kind: 'expression', expr: answerPlain },
      answerDisplay: `$${eqTex}$`,
      hints: ['First find the gradient $m$ from the two points.', `Then substitute one point into $y = ${m}x + c$ to find $c$.`],
      solution: [
        `$m = \\dfrac{${y2} - ${y1 < 0 ? `(${y1})` : y1}}{${x2} - ${x1 < 0 ? `(${x1})` : x1}} = \\dfrac{${y2 - y1}}{${x2 - x1}} = ${m}$.`,
        `Substitute $${pt(x1, y1)}$: $${y1} = ${m}(${x1}) + c$, so $c = ${c}$.`,
        `$${eqTex}$.`,
      ],
      misconceptions: expressionsEquivalent(swapped, answerPlain)
        ? []
        : [{ code: 'intercept-confusion', answer: { kind: 'expression', expr: swapped }, feedback: 'You swapped the gradient and the intercept. The gradient multiplies $x$.' }],
    };
  },
};

