import type { QuestionTemplate, Misconception, AnswerSpec, Figure, InputSpec } from '../types.ts';
import type { Rng } from '../rng.ts';
import { rat, ratTex, eq as req, add, sub, mul, div, neg as rneg, toNumber, type Rational } from '../rational.ts';
import { equationsEquivalent } from '../expr.ts';

/**
 * Analytical geometry, Grades 10–12 (CAPS Paper 2): distance, midpoint and gradient (10); equations of lines and
 * inclination (11); circles and tangents (12). Coordinates are written (x; y), as in South African textbooks.
 */

const R = (n: number, d = 1) => rat(n, d);
const pt = (x: number, y: number) => `(${x};\\, ${y})`;
const ptR = (x: Rational, y: Rational) => `(${ratTex(x)};\\, ${ratTex(y)})`;
const par = (v: number) => (v < 0 ? `(${v})` : `${v}`);
const plain = (r: Rational) => (r.d === 1 ? `(${r.n})` : `(${r.n}/${r.d})`);
const fracAns = (r: Rational): AnswerSpec => ({ kind: 'fraction', n: r.n, d: r.d, requireSimplest: false });
const pointAns = (x: Rational, y: Rational): AnswerSpec => ({ kind: 'point', x: { n: x.n, d: x.d }, y: { n: y.n, d: y.d } });
const eqAns = (expr: string): AnswerSpec => ({ kind: 'equation', expr });
const EQ_INPUT: InputSpec = { kind: 'equation', variables: ['x', 'y'] };
const deg = (r: number) => (r * 180) / Math.PI;
const round1 = (v: number) => Math.round(v * 10) / 10;
/** One decimal place with a decimal comma, for use inside TeX. */
const dp1 = (v: number) => round1(v).toFixed(1).replace('.', '{,}');

/** y = mx + c, set as TeX. */
function lineTex(m: Rational, c: Rational): string {
  const mx = m.n === 0 ? '' : req(m, R(1)) ? 'x' : req(m, R(-1)) ? '-x' : `${ratTex(m)}x`;
  if (c.n === 0) return `y = ${mx || '0'}`;
  if (!mx) return `y = ${ratTex(c)}`;
  return `y = ${mx} ${c.n < 0 ? '-' : '+'} ${ratTex(R(Math.abs(c.n), c.d))}`;
}
const linePlain = (m: Rational, c: Rational) => `y = ${plain(m)}*x + ${plain(c)}`;

/** (x − a)², set as TeX. */
function sqTex(v: string, a: number): string {
  if (a === 0) return `${v}^2`;
  return a > 0 ? `(${v} - ${a})^2` : `(${v} + ${-a})^2`;
}
const circleTex = (a: number, b: number, r2: number) => `${sqTex('x', a)} + ${sqTex('y', b)} = ${r2}`;
const circlePlain = (a: number, b: number, r2: number) => `(x - (${a}))^2 + (y - (${b}))^2 = ${r2}`;

function span(vals: number[]): [number, number] {
  return [Math.min(-1, ...vals) - 2, Math.max(1, ...vals) + 2];
}

function keepPts(ms: { code: Misconception['code']; x: Rational; y: Rational; feedback: string }[], cx: Rational, cy: Rational): Misconception[] {
  const seen: [Rational, Rational][] = [[cx, cy]];
  const out: Misconception[] = [];
  for (const m of ms) {
    if (seen.some(([a, b]) => req(a, m.x) && req(b, m.y))) continue;
    seen.push([m.x, m.y]);
    out.push({ code: m.code, answer: pointAns(m.x, m.y), feedback: m.feedback });
  }
  return out;
}

function keepEqs(ms: { code: Misconception['code']; expr: string; feedback: string }[], answer: string): Misconception[] {
  const seen = [answer];
  const out: Misconception[] = [];
  for (const m of ms) {
    if (seen.some((s) => equationsEquivalent(s, m.expr))) continue;
    seen.push(m.expr);
    out.push({ code: m.code, answer: eqAns(m.expr), feedback: m.feedback });
  }
  return out;
}

function keepNums(ms: { code: Misconception['code']; value: number | null; feedback: string }[], correct: number, tol: number): Misconception[] {
  const seen = [correct];
  const out: Misconception[] = [];
  for (const m of ms) {
    if (m.value === null || !Number.isFinite(m.value) || seen.some((s) => Math.abs(s - m.value!) <= 2 * tol)) continue;
    seen.push(m.value);
    out.push({ code: m.code, answer: { kind: 'numeric', value: m.value, tolerance: tol }, feedback: m.feedback });
  }
  return out;
}

function keepFracs(ms: { code: Misconception['code']; value: Rational | null; feedback: string }[], correct: Rational): Misconception[] {
  const seen = [correct];
  const out: Misconception[] = [];
  for (const m of ms) {
    if (!m.value || seen.some((s) => req(s, m.value!))) continue;
    seen.push(m.value);
    out.push({ code: m.code, answer: fracAns(m.value), feedback: m.feedback });
  }
  return out;
}

const TRIPLES: readonly [number, number][] = [
  [3, 4],
  [4, 3],
  [6, 8],
  [8, 6],
  [5, 12],
  [12, 5],
  [9, 12],
  [8, 15],
];

/** A and B with a whole-number distance between them. */
function triplePoints(rng: Rng) {
  const [u, v] = rng.pick(TRIPLES);
  const dx = rng.chance(0.5) ? u : -u;
  const dy = rng.chance(0.5) ? v : -v;
  const x1 = rng.int(-6, 6);
  const y1 = rng.int(-6, 6);
  return { x1, y1, x2: x1 + dx, y2: y1 + dy, dx, dy, d: Math.hypot(u, v) };
}

/** Inclination of a line with gradient m, in degrees, 0 ≤ θ < 180. */
const inclination = (m: number) => {
  const t = deg(Math.atan(m));
  return t < 0 ? t + 180 : t;
};

// ---------------------------------------------------------------------------
export const coordinateGeometry: QuestionTemplate = {
  id: 'coordinate-geometry',
  skillId: 'coordinate-geometry',
  generate(rng, level) {
    if (level === 1) {
      const { x1, y1, x2, y2, dx, dy, d } = triplePoints(rng);
      const fig: Figure = {
        kind: 'graph',
        xRange: span([x1, x2]),
        yRange: span([y1, y2]),
        segments: [
          { x1, y1, x2, y2 },
          { x1, y1, x2, y2: y1, dashed: true },
          { x1: x2, y1, x2, y2, dashed: true },
        ],
        points: [
          { x: x1, y: y1, label: 'A' },
          { x: x2, y: y2, label: 'B' },
        ],
      };
      return {
        prompt: `Find the length of $AB$, where $A${pt(x1, y1)}$ and $B${pt(x2, y2)}$.`,
        figure: fig,
        input: { kind: 'numeric', prefix: 'AB =', unit: 'units' },
        answer: { kind: 'numeric', value: d, tolerance: 0.01 },
        answerDisplay: `$AB = ${d}$ units`,
        hints: ['The dashed lines make a right-angled triangle with $AB$ as the hypotenuse.', `$AB = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$. Here the change in $x$ is $${dx}$.`],
        solution: [
          `$AB = \\sqrt{(${x2} - ${par(x1)})^2 + (${y2} - ${par(y1)})^2}$`,
          `$= \\sqrt{(${dx})^2 + (${dy})^2} = \\sqrt{${dx * dx} + ${dy * dy}} = \\sqrt{${d * d}}$`,
          `$AB = ${d}$ units.`,
        ],
        misconceptions: keepNums(
          [
            { code: 'distance-formula', value: Math.abs(dx) + Math.abs(dy), feedback: 'You added the changes in $x$ and $y$. $AB$ is the hypotenuse, so square them, add, and take the square root.' },
            { code: 'distance-formula', value: d * d, feedback: `${d * d} is $AB^2$. Take the square root for the length.` },
          ],
          d,
          0.01,
        ),
      };
    }
    if (level === 2) {
      let x1: number, y1: number, x2: number, y2: number;
      do {
        x1 = rng.int(-7, 7);
        y1 = rng.int(-7, 7);
        x2 = rng.int(-7, 7);
        y2 = rng.int(-7, 7);
      } while (x1 === x2 || y1 === y2 || Math.abs(x2 - x1) < 2);
      const mx = R(x1 + x2, 2);
      const my = R(y1 + y2, 2);
      return {
        prompt: `Find the midpoint $M$ of $AB$, where $A${pt(x1, y1)}$ and $B${pt(x2, y2)}$.`,
        figure: { kind: 'graph', xRange: span([x1, x2]), yRange: span([y1, y2]), segments: [{ x1, y1, x2, y2 }], points: [{ x: x1, y: y1, label: 'A' }, { x: x2, y: y2, label: 'B' }] },
        input: { kind: 'point', name: 'M' },
        answer: pointAns(mx, my),
        answerDisplay: `$M${ptR(mx, my)}$`,
        hints: ['The midpoint is halfway between the endpoints: average the $x$-values and average the $y$-values.', `$x_M = \\dfrac{${x1} + ${par(x2)}}{2}$`],
        solution: [`$x_M = \\dfrac{${x1} + ${par(x2)}}{2} = ${ratTex(mx)}$`, `$y_M = \\dfrac{${y1} + ${par(y2)}}{2} = ${ratTex(my)}$`, `$M${ptR(mx, my)}$`],
        misconceptions: keepPts(
          [
            { code: 'midpoint-formula', x: R(x2 - x1, 2), y: R(y2 - y1, 2), feedback: 'You subtracted. The midpoint is the **average**: add the coordinates, then halve.' },
            { code: 'midpoint-formula', x: R(x1 + x2), y: R(y1 + y2), feedback: 'You added the coordinates but did not halve them.' },
          ],
          mx,
          my,
        ),
      };
    }
    if (level === 3) {
      let ax: number, ay: number, mx: number, my: number;
      do {
        ax = rng.int(-6, 6);
        ay = rng.int(-6, 6);
        mx = rng.int(-5, 5);
        my = rng.int(-5, 5);
      } while (ax === mx || ay === my);
      const bx = 2 * mx - ax;
      const by = 2 * my - ay;
      return {
        prompt: `$M${pt(mx, my)}$ is the midpoint of $AB$, and $A${pt(ax, ay)}$. Find the coordinates of $B$.`,
        figure: { kind: 'graph', xRange: span([ax, mx, bx]), yRange: span([ay, my, by]), points: [{ x: ax, y: ay, label: 'A' }, { x: mx, y: my, label: 'M' }] },
        input: { kind: 'point', name: 'B' },
        answer: pointAns(R(bx), R(by)),
        answerDisplay: `$B${pt(bx, by)}$`,
        hints: ['$M$ is halfway, so $B$ is as far beyond $M$ as $A$ is before it.', `From $A$ to $M$, $x$ changes by $${mx - ax}$. Do that again from $M$.`],
        solution: [`$\\dfrac{${ax} + x_B}{2} = ${mx}$, so $x_B = ${2 * mx} - ${par(ax)} = ${bx}$.`, `$\\dfrac{${ay} + y_B}{2} = ${my}$, so $y_B = ${2 * my} - ${par(ay)} = ${by}$.`, `$B${pt(bx, by)}$`],
        misconceptions: keepPts(
          [
            { code: 'midpoint-formula', x: R(ax + mx, 2), y: R(ay + my, 2), feedback: 'That is the midpoint of $A$ and $M$. $M$ is the middle of $AB$, so $B$ lies beyond $M$.' },
            { code: 'midpoint-formula', x: R(mx - ax), y: R(my - ay), feedback: 'That is how far $A$ is from $M$. Add that step to $M$ to reach $B$.' },
          ],
          R(bx),
          R(by),
        ),
      };
    }
    if (level === 4) {
      if (rng.chance(0.5)) {
        // AB ⊥ a line of gradient m1.
        const m1 = rng.pick([2, 3, 4, -2, -3, -4, 1, -1]);
        const x1 = rng.int(-5, 4);
        const y1 = rng.int(-5, 5);
        const dx = Math.abs(m1) * rng.int(1, 2);
        const x2 = x1 + dx;
        const mAB = R(-1, m1);
        const k = add(R(y1), mul(mAB, R(dx)));
        return {
          prompt: `$A${pt(x1, y1)}$ and $B(${x2};\\, k)$. Line $AB$ is perpendicular to a line with gradient $${m1}$. Find $k$.`,
          input: { kind: 'fraction', prefix: 'k =' },
          answer: fracAns(k),
          answerDisplay: `$k = ${ratTex(k)}$`,
          hints: ['Perpendicular gradients multiply to $-1$.', `So $m_{AB} = ${ratTex(mAB)}$. Now use $m_{AB} = \\dfrac{k - ${par(y1)}}{${x2} - ${par(x1)}}$.`],
          solution: [`$m_{AB} \\times ${par(m1)} = -1$, so $m_{AB} = ${ratTex(mAB)}$.`, `$\\dfrac{k - ${par(y1)}}{${dx}} = ${ratTex(mAB)}$`, `$k = ${ratTex(k)}$`],
          misconceptions: keepFracs(
            [
              { code: 'perpendicular-gradient', value: add(R(y1), mul(R(m1), R(dx))), feedback: 'You used the same gradient, which gives a **parallel** line. Perpendicular gradients multiply to $-1$.' },
              { code: 'perpendicular-gradient', value: add(R(y1), mul(R(1, m1), R(dx))), feedback: 'You flipped the gradient but kept its sign. A perpendicular gradient is the negative reciprocal.' },
            ],
            k,
          ),
        };
      }
      // Collinear: A, B, C(k; y3).
      const m = rng.pick([R(2), R(-2), R(3), R(-1), R(1, 2), R(-1, 2), R(3, 2)]);
      const x1 = rng.int(-4, 2);
      const y1 = rng.int(-4, 4);
      const x2 = x1 + 2 * rng.int(1, 2);
      const y2 = toNumber(add(R(y1), mul(m, R(x2 - x1))));
      const y3 = y2 + rng.signed(2, 6);
      const k = add(R(x1), div(R(y3 - y1), m));
      return {
        prompt: `$A${pt(x1, y1)}$, $B${pt(x2, y2)}$ and $C(k;\\, ${y3})$ lie on one straight line. Find $k$.`,
        input: { kind: 'fraction', prefix: 'k =' },
        answer: fracAns(k),
        answerDisplay: `$k = ${ratTex(k)}$`,
        hints: ['Points on one line all give the same gradient: $m_{AC} = m_{AB}$.', `$m_{AB} = ${ratTex(m)}$.`],
        solution: [`$m_{AB} = \\dfrac{${y2} - ${par(y1)}}{${x2} - ${par(x1)}} = ${ratTex(m)}$.`, `$m_{AC} = m_{AB}$: $\\dfrac{${y3} - ${par(y1)}}{k - ${par(x1)}} = ${ratTex(m)}$.`, `$k - ${par(x1)} = ${ratTex(div(R(y3 - y1), m))}$, so $k = ${ratTex(k)}$.`],
        misconceptions: keepFracs(
          [
            { code: 'gradient-inverted', value: add(R(x1), mul(R(y3 - y1), m)), feedback: 'You multiplied by the gradient instead of dividing. Cross-multiply carefully: $k - x_1 = \\dfrac{y_3 - y_1}{m}$.' },
            { code: 'sign-error', value: sub(R(x1), div(R(y3 - y1), m)), feedback: 'Check the sign when you move $x_1$ across.' },
          ],
          k,
        ),
      };
    }
    // Level 5: unknown coordinate from a distance (two candidates; the condition picks one).
    const [u, v] = rng.pick(TRIPLES);
    const d = Math.hypot(u, v);
    const x1 = rng.int(-u + 1, u - 1);
    const y1 = rng.int(-5, 5);
    const y2 = y1 + (rng.chance(0.5) ? v : -v);
    const k = x1 + u;
    return {
      prompt: `$A${pt(x1, y1)}$ and $B(k;\\, ${y2})$, with $k > 0$. The length of $AB$ is $${d}$ units. Find $k$.`,
      input: { kind: 'fraction', prefix: 'k =' },
      answer: fracAns(R(k)),
      answerDisplay: `$k = ${k}$`,
      hints: ['Write the distance formula with $k$ in it and square both sides.', `$(k - ${par(x1)})^2 + (${y2 - y1})^2 = ${d * d}$`],
      solution: [
        `$(k - ${par(x1)})^2 + (${y2} - ${par(y1)})^2 = ${d}^2$`,
        `$(k - ${par(x1)})^2 = ${d * d} - ${v * v} = ${u * u}$`,
        `$k - ${par(x1)} = \\pm ${u}$, so $k = ${x1 + u}$ or $k = ${x1 - u}$.`,
        `$k > 0$, so $k = ${k}$.`,
      ],
      misconceptions: keepFracs(
        [
          { code: 'distance-formula', value: R(x1 - u), feedback: 'That is the other solution of the equation, but it is not positive. Check the condition $k > 0$.' },
          { code: 'distance-formula', value: R(x1 + d), feedback: `${d} is the length of $AB$, not the change in $x$. Use the distance formula: $(k - x_1)^2 + (y_2 - y_1)^2 = ${d}^2$.` },
        ],
        R(k),
      ),
    };
  },
};

// ---------------------------------------------------------------------------
const NICE_M: readonly Rational[] = [R(2), R(-2), R(3), R(-3), R(1, 2), R(-1, 2), R(2, 3), R(-2, 3), R(3, 2), R(-3, 2), R(1, 3), R(-1, 3)];

export const lineEquations: QuestionTemplate = {
  id: 'line-equations',
  skillId: 'line-equations',
  generate(rng, level) {
    const x1 = rng.intExcept(-5, 5, [0]);
    const y1 = rng.int(-6, 6);
    const P = `P${pt(x1, y1)}`;
    if (level <= 3) {
      let m: Rational;
      let given = '';
      let why = '';
      let wrong: { code: Misconception['code']; m: Rational; feedback: string }[] = [];
      if (level === 1) {
        m = R(rng.signed(1, 4));
        given = `has a gradient of $${ratTex(m)}$`;
      } else if (level === 2) {
        const m0 = rng.signed(1, 4);
        const c0 = rng.intExcept(-6, 6, [y1 - m0 * x1]);
        const k = rng.pick([1, 1, 2, 3]);
        m = R(m0);
        given = `is parallel to the line $${k === 1 ? lineTex(R(m0), R(c0)) : `${k}y = ${lineTex(R(k * m0), R(k * c0)).slice(4)}`}$`;
        why = k === 1 ? '' : ` Divide by ${k} first: the given line is $${lineTex(R(m0), R(c0))}$.`;
        wrong = [
          { code: 'perpendicular-gradient', m: R(-1, m0), feedback: 'That line is perpendicular. **Parallel** lines have equal gradients.' },
          ...(k > 1 ? [{ code: 'line-through-point' as const, m: R(k * m0), feedback: `Divide every term by ${k} before reading off the gradient.` }] : []),
        ];
      } else {
        const m1 = rng.pick(NICE_M.concat([R(1), R(-1)]));
        m = div(R(-1), m1);
        given = `is perpendicular to the line $${lineTex(m1, R(rng.intExcept(-5, 5, [0])))}$`;
        wrong = [
          { code: 'perpendicular-gradient', m: m1, feedback: 'You used the same gradient, which gives a **parallel** line.' },
          { code: 'perpendicular-gradient', m: div(R(1), m1), feedback: 'Flip **and** change the sign: the gradients must multiply to $-1$.' },
        ];
      }
      const c = sub(R(y1), mul(m, R(x1)));
      const answer = linePlain(m, c);
      const mis = keepEqs(
        [
          ...wrong.map((w) => ({ code: w.code, expr: linePlain(w.m, sub(R(y1), mul(w.m, R(x1)))), feedback: w.feedback })),
          { code: 'sign-error', expr: linePlain(m, add(R(y1), mul(m, R(x1)))), feedback: `Substitute carefully: $${y1} = ${ratTex(m)}(${x1}) + c$, so $c = ${y1} - ${par(toNumber(mul(m, R(x1))))}$.` },
          { code: 'intercept-confusion', expr: `y = ${plain(R(y1))}*x + ${plain(m)}`, feedback: 'The gradient multiplies $x$; $c$ is the constant you find by substituting the point.' },
        ],
        answer,
      );
      return {
        prompt: `Find the equation of the straight line that passes through $${P}$ and ${given}.`,
        input: EQ_INPUT,
        answer: eqAns(answer),
        answerDisplay: `$${lineTex(m, c)}$`,
        hints: [level === 1 ? 'Start with $y = mx + c$ and put in the gradient.' : level === 2 ? `Parallel lines have equal gradients.${why}` : 'Perpendicular gradients multiply to $-1$: flip the fraction and change its sign.', `With $m = ${ratTex(m)}$, substitute $x = ${x1}$ and $y = ${y1}$ to find $c$.`],
        solution: [
          ...(level === 1 ? [] : [`The gradient you need is $m = ${ratTex(m)}$.${level === 3 ? ' (Check: the product of the gradients is $-1$.)' : ''}`]),
          `$y = ${ratTex(m)}x + c$. Substitute $${pt(x1, y1)}$: $${y1} = ${ratTex(mul(m, R(x1)))} + c$.`,
          `$c = ${ratTex(c)}$, so $${lineTex(m, c)}$.`,
        ],
        misconceptions: mis,
      };
    }
    if (level === 4) {
      if (rng.chance(0.4)) {
        const theta = rng.pick([45, 135]);
        const m = R(theta === 45 ? 1 : -1);
        const c = sub(R(y1), mul(m, R(x1)));
        const answer = linePlain(m, c);
        return {
          prompt: `A straight line has an angle of inclination of $${theta}^\\circ$ and passes through $${P}$. Find its equation.`,
          input: EQ_INPUT,
          answer: eqAns(answer),
          answerDisplay: `$${lineTex(m, c)}$`,
          hints: ['The gradient is $m = \\tan\\theta$.', `$\\tan ${theta}^\\circ = ${m.n}$. Now substitute the point to find $c$.`],
          solution: [`$m = \\tan ${theta}^\\circ = ${m.n}$.`, `$${y1} = ${m.n}(${x1}) + c$, so $c = ${ratTex(c)}$.`, `$${lineTex(m, c)}$`],
          misconceptions: keepEqs([{ code: 'inclination-quadrant', expr: linePlain(rneg(m), add(R(y1), mul(m, R(x1)))), feedback: `$\\tan ${theta}^\\circ = ${m.n}$. An angle ${theta === 45 ? 'under' : 'over'} $90^\\circ$ gives a ${theta === 45 ? 'positive' : 'negative'} gradient.` }], answer),
        };
      }
      const m = rng.pick(NICE_M);
      const mv = toNumber(m);
      const th = inclination(mv);
      const raw = deg(Math.atan(mv));
      const byPoints = rng.chance(0.5);
      const x2 = x1 + m.d * rng.int(1, 2);
      const y2 = toNumber(add(R(y1), mul(m, R(x2 - x1))));
      return {
        prompt: byPoints
          ? `Find the angle of inclination $\\theta$ of the line through $A${pt(x1, y1)}$ and $B${pt(x2, y2)}$. Round to one decimal place.`
          : `Find the angle of inclination $\\theta$ of the line $${lineTex(m, R(rng.int(-5, 5)))}$. Round to one decimal place.`,
        input: { kind: 'numeric', prefix: '\\theta =', unit: '°' },
        answer: { kind: 'numeric', value: round1(th), tolerance: 0.06 },
        answerDisplay: `$\\theta = ${dp1(th)}^\\circ$`,
        hints: ['$\\tan\\theta = m$, where $\\theta$ is measured anticlockwise from the positive $x$-axis.', mv < 0 ? 'The gradient is negative, so the line slopes down and $\\theta$ is obtuse.' : 'Use $\\tan^{-1}$ on your calculator.'],
        solution: [
          ...(byPoints ? [`$m_{AB} = \\dfrac{${y2} - ${par(y1)}}{${x2} - ${par(x1)}} = ${ratTex(m)}$`] : [`$m = ${ratTex(m)}$`]),
          `$\\tan\\theta = ${ratTex(m)}$, so the reference angle is $${dp1(Math.abs(raw))}^\\circ$.`,
          mv < 0 ? `$m < 0$, so $\\theta$ is obtuse: $\\theta = 180^\\circ - ${dp1(Math.abs(raw))}^\\circ = ${dp1(th)}^\\circ$.` : `$\\theta = ${dp1(th)}^\\circ$.`,
        ],
        misconceptions: keepNums(
          [
            { code: 'inclination-quadrant', value: round1(raw), feedback: 'The calculator gives a negative angle. An inclination is between $0^\\circ$ and $180^\\circ$: add $180^\\circ$.' },
            { code: 'inclination-quadrant', value: round1(Math.abs(raw)), feedback: 'That is the acute reference angle. The line slopes down, so its inclination is obtuse: $180^\\circ$ minus that.' },
            { code: 'gradient-inverted', value: round1(inclination(1 / mv)), feedback: 'You used run ÷ rise. The gradient is the change in $y$ over the change in $x$.' },
          ],
          round1(th),
          0.06,
        ),
      };
    }
    // Level 5: acute angle between two lines.
    let m1: number, m2: number;
    do {
      m1 = toNumber(rng.pick(NICE_M.concat([R(1), R(-1), R(4), R(-4)])));
      m2 = toNumber(rng.pick(NICE_M.concat([R(1), R(-1), R(4), R(-4)])));
    } while (Math.abs(m1 - m2) < 0.2 || Math.abs(m1 * m2 + 1) < 1e-9);
    const c1 = rng.int(-3, 3);
    const c2 = rng.intExcept(-3, 3, [c1]);
    const t1 = inclination(m1);
    const t2 = inclination(m2);
    let between = Math.abs(t1 - t2);
    const obtuse = between > 90 ? between : 180 - between;
    if (between > 90) between = 180 - between;
    const L1 = lineTex(R(Math.round(m1 * 6), 6), R(c1));
    const L2 = lineTex(R(Math.round(m2 * 6), 6), R(c2));
    return {
      prompt: `Find the acute angle between the lines $${L1}$ and $${L2}$. Round to one decimal place.`,
      figure: { kind: 'graph', xRange: [-6, 6], yRange: [-6, 6], lines: [{ m: m1, c: c1 }, { m: m2, c: c2 }] },
      input: { kind: 'numeric', unit: '°' },
      answer: { kind: 'numeric', value: round1(between), tolerance: 0.11 },
      answerDisplay: `$${dp1(between)}^\\circ$`,
      hints: ['Find the inclination of each line ($\\tan\\theta = m$, between $0^\\circ$ and $180^\\circ$).', 'The angle between the lines is the difference of the inclinations. If that is more than $90^\\circ$, take $180^\\circ$ minus it.'],
      solution: [`Inclinations: $\\theta_1 = ${dp1(t1)}^\\circ$ and $\\theta_2 = ${dp1(t2)}^\\circ$.`, `Difference: $${dp1(Math.abs(t1 - t2))}^\\circ$.`, Math.abs(t1 - t2) > 90 ? `That is obtuse, so the acute angle is $180^\\circ - ${dp1(Math.abs(t1 - t2))}^\\circ = ${dp1(between)}^\\circ$.` : `The acute angle is $${dp1(between)}^\\circ$.`],
      misconceptions: keepNums(
        [
          { code: 'inclination-quadrant', value: round1(Math.abs(deg(Math.atan(m1)) - deg(Math.atan(m2))) > 90 ? 180 - Math.abs(deg(Math.atan(m1)) - deg(Math.atan(m2))) : Math.abs(deg(Math.atan(m1)) - deg(Math.atan(m2)))) === round1(between) ? null : round1(Math.abs(deg(Math.atan(m1)) - deg(Math.atan(m2)))), feedback: 'Use inclinations between $0^\\circ$ and $180^\\circ$: add $180^\\circ$ to a negative calculator angle first.' },
          { code: 'inclination-quadrant', value: round1(obtuse), feedback: 'That is the obtuse angle between the lines. The acute angle is $180^\\circ$ minus it.' },
          { code: 'inclination-quadrant', value: round1(t1 + t2 > 180 ? t1 + t2 - 180 : t1 + t2), feedback: 'Subtract the inclinations; don\'t add them.' },
        ],
        round1(between),
        0.11,
      ),
    };
  },
};

// ---------------------------------------------------------------------------
const OFFSETS: readonly [number, number][] = [
  [3, 4],
  [4, 3],
  [-3, 4],
  [4, -3],
  [-4, -3],
  [5, 0],
  [0, 5],
  [1, 2],
  [2, -1],
  [-2, 1],
  [1, 3],
  [3, -1],
  [2, 2],
];

function centre(rng: Rng, allowOrigin = false) {
  let a: number, b: number;
  do {
    a = rng.int(-5, 5);
    b = rng.int(-5, 5);
  } while (!allowOrigin && a === 0 && b === 0);
  return { a, b };
}

export const circleEquations: QuestionTemplate = {
  id: 'circle-equations',
  skillId: 'circle-equations',
  generate(rng, level) {
    if (level === 1) {
      const { a, b } = centre(rng);
      const r = rng.int(2, 7);
      const tex = circleTex(a, b, r * r);
      if (rng.chance(0.6)) {
        return {
          prompt: `Write down the centre of the circle $${tex}$.`,
          input: { kind: 'point', name: 'C' },
          answer: pointAns(R(a), R(b)),
          answerDisplay: `$C${pt(a, b)}$`,
          hints: ['Compare with $(x - a)^2 + (y - b)^2 = r^2$: the centre is $(a;\\, b)$.', `$${sqTex('x', a)}$ means $(x - ${par(a)})^2$.`],
          solution: [`Compare with $(x - a)^2 + (y - b)^2 = r^2$, where the centre is $(a;\\, b)$.`, ...[['x', a] as const, ['y', b] as const].filter(([, v]) => v < 0).map(([n, v]) => `$${sqTex(n, v)} = (${n} - (${v}))^2$, so the ${n}-coordinate is $${v}$, not $${-v}$.`), `The centre is $C${pt(a, b)}$.`],
          misconceptions: keepPts([{ code: 'circle-sign', x: R(-a), y: R(-b), feedback: 'The signs in the brackets are the opposite of the centre: $(x - a)^2$ has centre $x = a$.' }], R(a), R(b)),
        };
      }
      return {
        prompt: `Find the radius of the circle $${tex}$.`,
        input: { kind: 'numeric', prefix: 'r =', unit: 'units' },
        answer: { kind: 'numeric', value: r, tolerance: 0.01 },
        answerDisplay: `$r = ${r}$ units`,
        hints: ['The right-hand side is $r^2$, not $r$.', `$r^2 = ${r * r}$.`],
        solution: [`$r^2 = ${r * r}$, so $r = \\sqrt{${r * r}} = ${r}$.`],
        misconceptions: keepNums([{ code: 'radius-squared', value: r * r, feedback: `${r * r} is $r^2$. Take the square root to get the radius.` }], r, 0.01),
      };
    }
    if (level === 2) {
      const { a, b } = centre(rng);
      const [u, v] = rng.pick(OFFSETS);
      const r2 = u * u + v * v;
      const throughPoint = rng.chance(0.5);
      const answer = circlePlain(a, b, r2);
      return {
        prompt: throughPoint
          ? `A circle has centre $C${pt(a, b)}$ and passes through $P${pt(a + u, b + v)}$. Find its equation.`
          : `Find the equation of the circle with centre $${pt(a, b)}$ and radius $${Number.isInteger(Math.sqrt(r2)) ? Math.sqrt(r2) : `\\sqrt{${r2}}`}$.`,
        figure: throughPoint ? { kind: 'graph', xRange: span([a - 6, a + 6]), yRange: span([b - 6, b + 6]), circles: [{ cx: a, cy: b, r: Math.sqrt(r2) }], segments: [{ x1: a, y1: b, x2: a + u, y2: b + v }], points: [{ x: a, y: b, label: 'C' }, { x: a + u, y: b + v, label: 'P' }] } : undefined,
        input: EQ_INPUT,
        answer: eqAns(answer),
        answerDisplay: `$${circleTex(a, b, r2)}$`,
        hints: ['$(x - a)^2 + (y - b)^2 = r^2$, with centre $(a;\\, b)$.', throughPoint ? `$r^2 = CP^2 = (${u})^2 + (${v})^2$.` : 'Square the radius for the right-hand side.'],
        solution: [...(throughPoint ? [`$r^2 = CP^2 = (${a + u} - ${par(a)})^2 + (${b + v} - ${par(b)})^2 = ${r2}$.`] : [`$r^2 = ${r2}$.`]), `$${circleTex(a, b, r2)}$`],
        misconceptions: keepEqs(
          [
            { code: 'radius-squared', expr: circlePlain(a, b, Math.sqrt(r2)), feedback: 'The right-hand side is $r^2$. Square the radius.' },
            { code: 'circle-sign', expr: circlePlain(-a, -b, r2), feedback: 'The centre $(a;\\, b)$ goes into the brackets with the opposite sign: $(x - a)^2 + (y - b)^2$.' },
          ],
          answer,
        ),
      };
    }
    if (level === 3) {
      const { a, b } = centre(rng);
      const r = rng.int(2, 7);
      const D = -2 * a;
      const E = -2 * b;
      const F = a * a + b * b - r * r;
      const terms = `x^2 + y^2 ${D === 0 ? '' : `${D < 0 ? '-' : '+'} ${Math.abs(D)}x `}${E === 0 ? '' : `${E < 0 ? '-' : '+'} ${Math.abs(E)}y `}${F === 0 ? '' : `${F < 0 ? '-' : '+'} ${Math.abs(F)} `}= 0`;
      const steps = [
        `Group and complete the square: $(x^2 ${D < 0 ? '-' : '+'} ${Math.abs(D)}x + ${a * a}) + (y^2 ${E < 0 ? '-' : '+'} ${Math.abs(E)}y + ${b * b}) = ${-F} + ${a * a} + ${b * b}$`,
        `$${circleTex(a, b, r * r)}$`,
      ];
      if (rng.chance(0.5)) {
        return {
          prompt: `Find the centre of the circle $${terms}$.`,
          input: { kind: 'point', name: 'C' },
          answer: pointAns(R(a), R(b)),
          answerDisplay: `$C${pt(a, b)}$`,
          hints: ['Complete the square for the $x$-terms and for the $y$-terms.', `Halve the coefficient of $x$: $\\tfrac{1}{2}(${D}) = ${-a}$.`],
          solution: [...steps, `Centre $C${pt(a, b)}$.`],
          misconceptions: keepPts(
            [
              { code: 'circle-sign', x: R(-a), y: R(-b), feedback: 'Watch the signs: $x^2 ' + `${D < 0 ? '-' : '+'} ${Math.abs(D)}x` + '$ becomes $' + sqTex('x', a) + '$, so the centre has $x = ' + a + '$.' },
              { code: 'complete-square', x: R(-D), y: R(-E), feedback: 'Halve the coefficients of $x$ and $y$ when you complete the square.' },
            ],
            R(a),
            R(b),
          ),
        };
      }
      return {
        prompt: `Find the radius of the circle $${terms}$.`,
        input: { kind: 'numeric', prefix: 'r =', unit: 'units' },
        answer: { kind: 'numeric', value: r, tolerance: 0.01 },
        answerDisplay: `$r = ${r}$ units`,
        hints: ['Complete the square for both $x$ and $y$, and add the same numbers to the right-hand side.', `You should get $(\\dots)^2 + (\\dots)^2 = ${r * r}$.`],
        solution: [...steps, `$r = \\sqrt{${r * r}} = ${r}$.`],
        misconceptions: keepNums(
          [
            { code: 'radius-squared', value: r * r, feedback: `${r * r} is $r^2$. Take the square root.` },
            { code: 'complete-square', value: F < 0 ? Math.sqrt(-F) : null, feedback: 'Completing the square adds numbers to the right-hand side too. Add them before you take the square root.' },
          ],
          r,
          0.01,
        ),
      };
    }
    if (level === 4) {
      const { a, b } = centre(rng, true);
      let u: number, v: number;
      do [u, v] = rng.pick(OFFSETS);
      while (u === 0 || v === 0);
      const px = a + u;
      const py = b + v;
      const mr = R(v, u);
      const mt = R(-u, v);
      const c = sub(R(py), mul(mt, R(px)));
      const answer = linePlain(mt, c);
      const r2 = u * u + v * v;
      return {
        prompt: `$P${pt(px, py)}$ lies on the circle $${circleTex(a, b, r2)}$. Find the equation of the tangent to the circle at $P$.`,
        figure: { kind: 'graph', xRange: span([a - 6, a + 6]), yRange: span([b - 6, b + 6]), circles: [{ cx: a, cy: b, r: Math.sqrt(r2) }], segments: [{ x1: a, y1: b, x2: px, y2: py, dashed: true }], points: [{ x: a, y: b, label: 'C' }, { x: px, y: py, label: 'P' }] },
        input: EQ_INPUT,
        answer: eqAns(answer),
        answerDisplay: `$${lineTex(mt, c)}$`,
        hints: ['The tangent is perpendicular to the radius $CP$ (tan ⊥ radius).', `$m_{CP} = ${ratTex(mr)}$, so $m_{\\text{tangent}} = ${ratTex(mt)}$.`],
        solution: [`Centre $C${pt(a, b)}$. $m_{CP} = \\dfrac{${py} - ${par(b)}}{${px} - ${par(a)}} = ${ratTex(mr)}$.`, `Tangent ⊥ radius, so $m = ${ratTex(mt)}$.`, `Substitute $P$: $${py} = ${ratTex(mt)}(${px}) + c$, so $c = ${ratTex(c)}$.`, `$${lineTex(mt, c)}$`],
        misconceptions: keepEqs(
          [
            { code: 'tangent-gradient', expr: linePlain(mr, sub(R(py), mul(mr, R(px)))), feedback: 'That line has the gradient of the radius, so it passes through the centre. The tangent is **perpendicular** to the radius.' },
            { code: 'perpendicular-gradient', expr: linePlain(R(u, v), sub(R(py), mul(R(u, v), R(px)))), feedback: 'Flip **and** change the sign: $m_{\\text{tangent}} \\times m_{CP} = -1$.' },
          ],
          answer,
        ),
      };
    }
    // Level 5: circle on a diameter AB.
    const { a, b } = centre(rng, true);
    const [u, v] = rng.pick(OFFSETS);
    const r2 = u * u + v * v;
    const answer = circlePlain(a, b, r2);
    return {
      prompt: `$A${pt(a - u, b - v)}$ and $B${pt(a + u, b + v)}$ are the endpoints of a diameter of a circle. Find the equation of the circle.`,
      input: EQ_INPUT,
      answer: eqAns(answer),
      answerDisplay: `$${circleTex(a, b, r2)}$`,
      hints: ['The centre is the midpoint of the diameter.', 'The radius is half of $AB$, so $r^2$ is a quarter of $AB^2$.'],
      solution: [`Centre = midpoint of $AB$ = $${pt(a, b)}$.`, `$r^2 = (${a + u} - ${par(a)})^2 + (${b + v} - ${par(b)})^2 = ${r2}$.`, `$${circleTex(a, b, r2)}$`],
      misconceptions: keepEqs(
        [
          { code: 'radius-squared', expr: circlePlain(a, b, 4 * r2), feedback: 'You used the length of the diameter. The radius is half of $AB$.' },
          { code: 'midpoint-formula', expr: circlePlain(a - u, b - v, 4 * r2), feedback: 'The centre is the midpoint of $AB$, not an endpoint.' },
          { code: 'circle-sign', expr: circlePlain(-a, -b, r2), feedback: 'The centre goes into the brackets with the opposite sign.' },
        ],
        answer,
      ),
    };
  },
};
