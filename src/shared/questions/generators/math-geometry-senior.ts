/**
 * Space and shape (geometry), Grades 7–9: CAPS Senior Phase "Geometry of straight lines" and "Geometry of 2D shapes".
 *
 * CAPS Mathematics Grades 7–9 (DBE, 2011): Grade 7 names the angle pairs made by perpendicular, intersecting and
 * parallel lines and uses them; Grade 8 adds the properties of triangles and quadrilaterals; Grade 9 adds the exterior
 * angle of a triangle, the diagonals of quadrilaterals, and the minimum conditions for congruent (S,S,S; S,A,S; A,A,S;
 * R,H,S) and similar triangles. Learners "should give reasons and justify their solutions for every written statement"
 * (pp. 136–137), so every skill has a level that asks for the reason, in the wording Senior Phase teachers use.
 *
 * Diagrams are drawn true to their numbers: every marked angle and labelled length matches the drawing, and the unknown
 * (x, or ? for a length) is the answer in the drawing too. geometry-senior.test.ts measures them.
 */
import type { GeneratedQuestion, GeometryFigure, QuestionTemplate } from '../types.ts';
import type { Rng } from '../rng.ts';
import type { MistakeCode } from '../mistakes.ts';
import { exact, keepNum, choice, type Opt } from './kit.ts';
import { REASONS } from './math-geometry.ts';

type Pt = GeometryFigure['points'][number];
type Seg = NonNullable<GeometryFigure['segments']>[number];
type Ang = NonNullable<GeometryFigure['angles']>[number];
type XY = { x: number; y: number };

const rad = (d: number) => (d * Math.PI) / 180;
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const r2 = (v: number) => Math.round(v * 100) / 100;
const P = (id: string, x: number, y: number, extra: Partial<Pt> = {}): Pt => ({ id, x: r3(x), y: r3(y), ...extra });
/** The point at distance d from `from`, in direction `dir` degrees. */
const toward = (id: string, from: XY, dir: number, d: number): Pt => P(id, from.x + d * Math.cos(rad(dir)), from.y + d * Math.sin(rad(dir)));
const fig = (alt: string, points: Pt[], segments: Seg[], angles: Ang[] = []): GeometryFigure => ({ kind: 'geometry', alt, points, segments, angles });
const deg = (v: number) => `${v}°`;
/** A number with a decimal comma, for plain text (labels and alt text). */
const dc = (v: number) => `${r2(v)}`.replace('.', ',');
/** A number with a decimal comma, in TeX. */
const tn = (v: number) => `${r2(v)}`.replace('.', '{,}');
/** "an 8 m shadow", "an 11 m shadow", but "a 12 m shadow". */
const an8 = (num: string) => (/^(8|11|18)(\D|$)/.test(num) ? 'an' : 'a');
/** A value at least `gap` away from 90°, so an angle never looks like a right angle when it isn't one. */
function notRight(rng: Rng, lo: number, hi: number, gap = 10): number {
  let v = rng.int(lo, hi);
  while (Math.abs(v - 90) < gap) v = rng.int(lo, hi);
  return v;
}
/** A wrong value worth predicting: a positive number clearly different from the answer. */
const usable = (w: number, answer: number) => Number.isFinite(w) && w > 0 && Math.abs(w - answer) > 0.05;
interface Exprs {
  x: number;
  ps: number[];
  qs: number[];
}
/**
 * Expressions p·x + q, one for each angle in `values`, at a whole-number x with small constants (−40 ≤ q ≤ 60).
 * The angles come first and x is chosen from the range that keeps every constant small, so this always ends.
 * With two angles the first gets the larger coefficient. Null when this set of angles doesn't work: pick new angles.
 */
function exprsFor(rng: Rng, values: number[], pRange: [number, number], ok: (e: Exprs) => boolean): Exprs | null {
  for (let i = 0; i < 40; i++) {
    const ps = values.map(() => rng.int(pRange[0], pRange[1]));
    if (values.length === 2) {
      if (ps[0] === ps[1]) continue;
      if (ps[0]! < ps[1]!) ps.reverse();
    }
    const lo = Math.max(5, ...values.map((v, j) => Math.ceil((v - 60) / ps[j]!)));
    const hi = Math.min(35, ...values.map((v, j) => Math.floor((v + 40) / ps[j]!)));
    if (lo > hi) continue;
    const x = rng.int(lo, hi);
    const e = { x, ps, qs: values.map((v, j) => v - ps[j]! * x) };
    if (ok(e)) return e;
  }
  return null;
}
const two = (e: Exprs) => ({ x: e.x, p: e.ps[0]!, r: e.ps[1]!, q: e.qs[0]!, s: e.qs[1]! });
/** px + q as an angle label "(3x + 10)°" and as TeX "3x + 10". */
function lin(p: number, q: number) {
  const px = p === 1 ? 'x' : `${p}x`;
  return {
    plain: q === 0 ? `${px}°` : `(${px} ${q < 0 ? '−' : '+'} ${Math.abs(q)})°`,
    tex: q === 0 ? px : `${px} ${q < 0 ? '-' : '+'} ${Math.abs(q)}`,
  };
}

// ---------------------------------------------------------------------------
// Reasons in the short form Senior Phase teachers and textbooks use, with what each one says.
export const SP_REASONS = {
  strLine: { text: '∠s on a str line', says: 'Angles on a straight line add up to 180°.' },
  roundPt: { text: '∠s round a pt', says: 'Angles round a point add up to 360°.' },
  vertOpp: { text: 'vert opp ∠s', says: 'Vertically opposite angles are equal.' },
  corresp: REASONS.corresp,
  alt: REASONS.alt,
  coint: REASONS.coint,
  triSum: { text: '∠s of Δ', says: 'The angles of a triangle add up to 180°.' },
  extAngle: { text: 'ext ∠ of Δ', says: 'An exterior angle of a triangle equals the sum of the two interior opposite angles.' },
  isosAngles: { text: '∠s opp = sides', says: 'In a triangle, the angles opposite equal sides are equal.' },
  quadSum: { text: '∠s of quad', says: 'The angles of a quadrilateral add up to 360°.' },
} as const;
export type SpReasonId = keyof typeof SP_REASONS;

function reasonQuestion(rng: Rng, q: { prompt: string; figure: GeometryFigure; correct: SpReasonId; pool: SpReasonId[]; why: string }): GeneratedQuestion {
  const wrong = rng.shuffle(q.pool.filter((r) => r !== q.correct)).slice(0, 3);
  return {
    ...choice(rng, {
      prompt: q.prompt,
      correct: { id: q.correct, text: SP_REASONS[q.correct].text },
      distractors: wrong.map((r) => ({ id: r, text: SP_REASONS[r].text, feedback: `That reason says: ${SP_REASONS[r].says} It doesn't prove this statement.` })),
      code: 'geometry-reason',
      hints: ['Look at where the two angles are: on one straight line, round one point, opposite each other at a crossing, between parallel lines, or inside a triangle?', 'Choose the reason that says exactly that.'],
      solution: [q.why, `Reason: **${SP_REASONS[q.correct].text}**. ${SP_REASONS[q.correct].says}`],
    }),
    figure: q.figure,
  };
}

interface Wrong {
  n: number;
  code: MistakeCode;
  feedback: string;
}

/** A question whose answer is a number: an angle (default), x, or a length. */
function numberQuestion(q: { prompt: string; figure?: GeometryFigure; answer: number; unit?: string; display?: string; working: string[]; hints: string[]; wrong: Wrong[] }): GeneratedQuestion {
  const unit = q.unit ?? '°';
  return {
    prompt: q.prompt,
    ...(q.figure ? { figure: q.figure } : {}),
    input: { kind: 'numeric', unit, ...(unit ? { positive: true } : {}) },
    answer: exact(q.answer),
    answerDisplay: q.display ?? (unit === '°' ? `${q.answer}°` : `$${tn(q.answer)}$ ${unit}`),
    hints: q.hints,
    solution: q.working,
    misconceptions: keepNum(
      q.wrong.filter((w) => Number.isFinite(w.n) && w.n > 0).map((w) => ({ code: w.code, answer: exact(r2(w.n)), feedback: w.feedback })),
      q.answer,
    ),
  };
}

/** Solve for x: the answer is x itself (no unit). */
const solveX = (q: { prompt: string; figure: GeometryFigure; x: number; working: string[]; hints: string[]; wrong: Wrong[] }) =>
  numberQuestion({ ...q, answer: q.x, unit: '', display: `$x = ${q.x}$` });

// ===========================================================================
// Grade 7: angles on a straight line, round a point and vertically opposite
// ===========================================================================

/** AOB is a straight line; OC makes `a`° with OB. */
function lineFig(a: number) {
  const O = P('O', 0, 0);
  return [P('A', -1.2, 0), O, P('B', 1.2, 0), toward('C', O, a, 1.1)];
}
const LINE_SEGS: Seg[] = [{ a: 'A', b: 'B' }, { a: 'O', b: 'C' }];
/** Straight lines AB and CD cross at O; ∠DOB = a. */
function crossFig(a: number) {
  const O = P('O', 0, 0);
  return [P('A', -1.2, 0), P('B', 1.2, 0), toward('C', O, a + 180, 1.1), toward('D', O, a, 1.1), O];
}
const CROSS_SEGS: Seg[] = [{ a: 'A', b: 'B' }, { a: 'C', b: 'D' }];
/** Three rays from O making a, b and the rest of 360°. */
function roundFig(rng: Rng, a: number, b: number) {
  const O = P('O', 0, 0);
  const s = rng.int(0, 359);
  return [O, toward('A', O, s, 1.1), toward('B', O, s + a, 1.1), toward('C', O, s + a + b, 1.1)];
}
const ROUND_SEGS: Seg[] = [{ a: 'O', b: 'A' }, { a: 'O', b: 'B' }, { a: 'O', b: 'C' }];
function roundAngles(rng: Rng) {
  for (;;) {
    const a = rng.int(70, 160);
    const b = rng.int(70, 160);
    const x = 360 - a - b;
    if (x >= 50 && x <= 160 && Math.abs(a - b) >= 6 && Math.abs(a - x) >= 6 && Math.abs(b - x) >= 6) return { a, b, x };
  }
}

export const straightLineAngles: QuestionTemplate = {
  id: 'straight-line-angles',
  skillId: 'straight-line-angles',
  generate(rng, level) {
    if (level === 1) {
      const a = notRight(rng, 25, 155);
      return numberQuestion({
        prompt: 'AOB is a straight line. Find $x$.',
        figure: fig(`Straight line AOB with a ray OC. Angle COB is ${a} degrees. Angle AOC is x.`, lineFig(a), LINE_SEGS, [
          { at: 'O', from: 'B', to: 'C', text: deg(a) },
          { at: 'O', from: 'C', to: 'A', text: 'x' },
        ]),
        answer: 180 - a,
        hints: [`x and the ${a}° angle sit side by side on the straight line AOB. Together they make a straight angle.`, 'Angles on a straight line add up to 180°.'],
        working: [`$x + ${a}^\\circ = 180^\\circ$ (∠s on a str line)`, `$x = 180^\\circ - ${a}^\\circ = ${180 - a}^\\circ$`],
        wrong: [
          { n: a, code: 'angles-on-line', feedback: 'These two angles are not equal. They sit side by side on a straight line, so together they make 180°.' },
          { n: 360 - a, code: 'angles-on-line', feedback: '360° is for angles all the way round a point. On a straight line the angles add up to 180°.' },
          { n: 90 - a, code: 'angles-on-line', feedback: '90° is a right angle. AOB is a straight line, so the angles add up to 180°.' },
        ],
      });
    }
    if (level === 2) {
      const a = notRight(rng, 30, 150, 12);
      const opp = rng.chance(0.5);
      return numberQuestion({
        prompt: 'AB and CD are straight lines that cross at O. Find $x$.',
        figure: fig(`Straight lines AB and CD cross at O. Angle DOB is ${a} degrees. Angle ${opp ? 'AOC' : 'BOC'} is x.`, crossFig(a), CROSS_SEGS, [
          { at: 'O', from: 'B', to: 'D', text: deg(a) },
          opp ? { at: 'O', from: 'A', to: 'C', text: 'x' } : { at: 'O', from: 'B', to: 'C', text: 'x' },
        ]),
        answer: opp ? a : 180 - a,
        hints: opp
          ? [`x and the ${a}° angle are opposite each other where the lines cross: they make an X.`, 'Vertically opposite angles are equal.']
          : [`x and the ${a}° angle are next to each other on the straight line AB.`, 'Angles on a straight line add up to 180°.'],
        working: opp ? [`$x = ${a}^\\circ$ (vert opp ∠s)`] : [`$x + ${a}^\\circ = 180^\\circ$ (∠s on a str line)`, `$x = ${180 - a}^\\circ$`],
        wrong: opp
          ? [{ n: 180 - a, code: 'vert-opp', feedback: `x is opposite the ${a}° angle, not next to it. Vertically opposite angles are equal.` }]
          : [{ n: a, code: 'vert-opp', feedback: `x is next to the ${a}° angle, on the straight line AB. Only opposite angles are equal; angles side by side on a line add up to 180°.` }],
      });
    }
    if (level === 3) {
      if (rng.chance(0.5)) {
        const { a, b, x } = roundAngles(rng);
        return numberQuestion({
          prompt: 'OA, OB and OC are rays from the point O. Find $x$.',
          figure: fig(`Three rays OA, OB and OC from the point O. Angle AOB is ${a} degrees, angle BOC is ${b} degrees and angle COA is x.`, roundFig(rng, a, b), ROUND_SEGS, [
            { at: 'O', from: 'A', to: 'B', text: deg(a) },
            { at: 'O', from: 'B', to: 'C', text: deg(b) },
            { at: 'O', from: 'C', to: 'A', text: 'x' },
          ]),
          answer: x,
          hints: ['The three angles go all the way round the point O.', 'Angles round a point add up to 360°.'],
          working: [`$x + ${a}^\\circ + ${b}^\\circ = 360^\\circ$ (∠s round a pt)`, `$x = 360^\\circ - ${a + b}^\\circ = ${x}^\\circ$`],
          wrong: [
            { n: a + b - 180, code: 'angles-on-line', feedback: '180° is for angles on a straight line. These angles go all the way round O, so they add up to 360°.' },
            { n: 360 - a, code: 'probable-slip', feedback: `Subtract both known angles from 360°: ${a}° and ${b}°.` },
          ],
        });
      }
      let a = rng.int(15, 75);
      while (Math.abs(a - 45) < 4) a = rng.int(15, 75);
      const x = 90 - a;
      const O = P('O', 0, 0);
      return numberQuestion({
        prompt: '$AO \\perp OB$. Find $x$.',
        figure: fig(`AO is perpendicular to OB. A ray OC lies between them. Angle AOC is ${a} degrees. Angle COB is x.`, [O, P('B', 1.2, 0), P('A', 0, 1.2), toward('C', O, x, 1.1)], ROUND_SEGS, [
          { at: 'O', from: 'B', to: 'A', text: '', right: true, r: 0.6 },
          { at: 'O', from: 'C', to: 'A', text: deg(a) },
          { at: 'O', from: 'B', to: 'C', text: 'x' },
        ]),
        answer: x,
        hints: ['AO ⊥ OB means the angle AOB is a right angle.', `x and the ${a}° angle make up the right angle together.`],
        working: [`$\\angle AOB = 90^\\circ$ (AO ⊥ OB)`, `$x + ${a}^\\circ = 90^\\circ$, so $x = ${x}^\\circ$`],
        wrong: [
          { n: 180 - a, code: 'angles-on-line', feedback: 'AOB is a right angle, not a straight line. The two angles add up to 90°.' },
          { n: a, code: 'angles-on-line', feedback: `x and the ${a}° angle are not equal. Together they make the right angle, 90°.` },
        ],
      });
    }
    if (level === 4) {
      const kind = rng.pick(['line', 'vert', 'point'] as const);
      const pool: SpReasonId[] = ['strLine', 'roundPt', 'vertOpp', 'corresp', 'triSum'];
      if (kind === 'line') {
        const a = notRight(rng, 25, 155);
        return reasonQuestion(rng, {
          prompt: `AOB is a straight line. Which reason proves that $x + ${a}^\\circ = 180^\\circ$?`,
          figure: fig(`Straight line AOB with a ray OC. Angle COB is ${a} degrees. Angle AOC is x.`, lineFig(a), LINE_SEGS, [
            { at: 'O', from: 'B', to: 'C', text: deg(a) },
            { at: 'O', from: 'C', to: 'A', text: 'x' },
          ]),
          correct: 'strLine',
          pool,
          why: `x and the ${a}° angle sit side by side on the straight line AOB.`,
        });
      }
      if (kind === 'vert') {
        const a = notRight(rng, 30, 150, 12);
        return reasonQuestion(rng, {
          prompt: `AB and CD are straight lines that cross at O. Which reason proves that $x = ${a}^\\circ$?`,
          figure: fig(`Straight lines AB and CD cross at O. Angle DOB is ${a} degrees. Angle AOC is x.`, crossFig(a), CROSS_SEGS, [
            { at: 'O', from: 'B', to: 'D', text: deg(a) },
            { at: 'O', from: 'A', to: 'C', text: 'x' },
          ]),
          correct: 'vertOpp',
          pool,
          why: `x and the ${a}° angle are opposite each other where the straight lines AB and CD cross.`,
        });
      }
      const { a, b } = roundAngles(rng);
      return reasonQuestion(rng, {
        prompt: `OA, OB and OC are rays from O. Which reason proves that $x + ${a}^\\circ + ${b}^\\circ = 360^\\circ$?`,
        figure: fig(`Three rays OA, OB and OC from the point O. Angle AOB is ${a} degrees, angle BOC is ${b} degrees and angle COA is x.`, roundFig(rng, a, b), ROUND_SEGS, [
          { at: 'O', from: 'A', to: 'B', text: deg(a) },
          { at: 'O', from: 'B', to: 'C', text: deg(b) },
          { at: 'O', from: 'C', to: 'A', text: 'x' },
        ]),
        correct: 'roundPt',
        pool,
        why: 'The three angles go all the way round the point O.',
      });
    }
    // Level 5: the angles are expressions in x.
    if (rng.chance(0.5)) {
      for (;;) {
        const a1 = notRight(rng, 35, 145);
        const e = exprsFor(rng, [a1, 180 - a1], [1, 5], (t) => usable((t.qs[1]! - t.qs[0]!) / (t.ps[0]! - t.ps[1]!), t.x));
        if (!e) continue;
        const { x, p, q, r, s } = two(e);
        const A = lin(p, q);
        const B = lin(r, s);
        return solveX({
          prompt: 'AOB is a straight line. Find $x$.',
          figure: fig(`Straight line AOB with a ray OC. Angle AOC is ${A.plain} and angle COB is ${B.plain}.`, lineFig(180 - a1), LINE_SEGS, [
            { at: 'O', from: 'C', to: 'A', text: A.plain },
            { at: 'O', from: 'B', to: 'C', text: B.plain },
          ]),
          x,
          hints: ['The two angles sit side by side on the straight line AOB.', 'Write an equation: the two expressions add up to 180°. Then solve it.'],
          working: [
            `$(${A.tex}) + (${B.tex}) = 180$ (∠s on a str line)`,
            `$${lin(p + r, q + s).tex} = 180$`,
            `$${p + r}x = ${180 - q - s}$, so $x = ${x}$`,
            `Check: the angles are $${a1}^\\circ$ and $${180 - a1}^\\circ$, which add up to $180^\\circ$.`,
          ],
          wrong: [
            { n: (s - q) / (p - r), code: 'angles-on-line', feedback: 'These angles are not equal. They sit side by side on a straight line, so they add up to 180°.' },
            { n: (360 - q - s) / (p + r), code: 'angles-on-line', feedback: '360° is for angles round a point. On a straight line the angles add up to 180°.' },
          ],
        });
      }
    }
    for (;;) {
      const a1 = notRight(rng, 30, 150, 12);
      const e = exprsFor(rng, [a1, a1], [1, 6], (t) => usable((180 - t.qs[0]! - t.qs[1]!) / (t.ps[0]! + t.ps[1]!), t.x));
      if (!e) continue;
      const { x, p, q, r, s } = two(e);
      const A = lin(p, q);
      const B = lin(r, s);
      return solveX({
        prompt: 'AB and CD are straight lines that cross at O. Find $x$.',
        figure: fig(`Straight lines AB and CD cross at O. Angle DOB is ${A.plain} and angle AOC is ${B.plain}.`, crossFig(a1), CROSS_SEGS, [
          { at: 'O', from: 'B', to: 'D', text: A.plain },
          { at: 'O', from: 'A', to: 'C', text: B.plain },
        ]),
        x,
        hints: ['The two angles are opposite each other where the lines cross.', 'Vertically opposite angles are equal: set the two expressions equal and solve.'],
        working: [`$${A.tex} = ${B.tex}$ (vert opp ∠s)`, `$${p - r}x = ${s - q}$, so $x = ${x}$`, `Check: both angles are $${a1}^\\circ$.`],
        wrong: [{ n: (180 - q - s) / (p + r), code: 'vert-opp', feedback: 'These angles are opposite each other at the crossing, so they are equal. Angles that add up to 180° sit side by side on a line.' }],
      });
    }
  },
};

// ===========================================================================
// Grade 8: parallel lines cut by a transversal
// ===========================================================================

/**
 * AB ∥ CD (AB on top). The transversal EF crosses AB at G and CD at H, and makes t° with GB.
 * `same`: the angle is t (true) or 180° − t (false). `side`: which side of EF. `inside`: between the parallel lines.
 */
const TANG = {
  EGB: { at: 'G', from: 'E', to: 'B', same: true, side: 'R', inside: false },
  EGA: { at: 'G', from: 'E', to: 'A', same: false, side: 'L', inside: false },
  AGH: { at: 'G', from: 'A', to: 'H', same: true, side: 'L', inside: true },
  BGH: { at: 'G', from: 'B', to: 'H', same: false, side: 'R', inside: true },
  GHD: { at: 'H', from: 'G', to: 'D', same: true, side: 'R', inside: true },
  GHC: { at: 'H', from: 'G', to: 'C', same: false, side: 'L', inside: true },
  CHF: { at: 'H', from: 'C', to: 'F', same: true, side: 'L', inside: false },
  DHF: { at: 'H', from: 'D', to: 'F', same: false, side: 'R', inside: false },
} as const;
type TName = keyof typeof TANG;
const T_NAMES = Object.keys(TANG) as TName[];
const AT_G = T_NAMES.filter((n) => TANG[n].at === 'G');
const AT_H = T_NAMES.filter((n) => TANG[n].at === 'H');
type PairKind = 'corresp' | 'alt' | 'coint' | 'vertOpp';

const above = (n: TName) => (TANG[n].at === 'G' ? !TANG[n].inside : TANG[n].inside);
/** The kind of pair made by an angle at G and an angle at H, if it has a name. */
function pairKind(g: TName, h: TName): Exclude<PairKind, 'vertOpp'> | null {
  const a = TANG[g];
  const b = TANG[h];
  if (a.side === b.side && above(g) === above(h)) return 'corresp';
  if (a.inside && b.inside) return a.side === b.side ? 'coint' : 'alt';
  return null;
}
const PAIRS: [TName, TName, PairKind][] = [
  ...AT_G.flatMap((g) => AT_H.flatMap((h) => {
    const k = pairKind(g, h);
    return k ? [[g, h, k] as [TName, TName, PairKind]] : [];
  })),
  ['EGB', 'AGH', 'vertOpp'],
  ['EGA', 'BGH', 'vertOpp'],
  ['GHD', 'CHF', 'vertOpp'],
  ['GHC', 'DHF', 'vertOpp'],
];
const PAIR_NAME: Record<PairKind, string> = { corresp: 'Corresponding angles', alt: 'Alternate angles', coint: 'Co-interior angles', vertOpp: 'Vertically opposite angles' };
const PAIR_LOOK: Record<PairKind, string> = {
  corresp: 'Corresponding angles are in the same position at the two crossings: on the same side of the transversal and on the same side of their parallel line (an F shape).',
  alt: 'Alternate angles are between the parallel lines, on opposite sides of the transversal (a Z shape).',
  coint: 'Co-interior angles are between the parallel lines, on the same side of the transversal (a U shape).',
  vertOpp: 'Vertically opposite angles are at the same crossing, opposite each other in an X.',
};
const tval = (n: TName, t: number) => (TANG[n].same ? t : 180 - t);
const tmark = (n: TName, text: string): Ang => ({ at: TANG[n].at, from: TANG[n].from, to: TANG[n].to, text });
const an = (n: TName) => `\\angle ${n}`;

function parallelFig(t: number, marks: Ang[], alt: string): GeometryFigure {
  const H = P('H', 0, 0);
  const G = P('G', 1 / Math.tan(rad(t)), 1);
  const lo = Math.min(G.x, H.x) - 1.3;
  const hi = Math.max(G.x, H.x) + 1.3;
  const pts = [P('A', lo, 1), G, P('B', hi, 1), P('C', lo, 0), H, P('D', hi, 0), toward('E', G, t, 0.7), toward('F', H, t + 180, 0.7)];
  return fig(`AB is parallel to CD. The transversal EF crosses AB at G and CD at H. ${alt}`, pts, [{ a: 'A', b: 'B', arrows: 1 }, { a: 'C', b: 'D', arrows: 1 }, { a: 'E', b: 'F' }], marks);
}

export const parallelLines: QuestionTemplate = {
  id: 'parallel-lines',
  skillId: 'parallel-lines',
  generate(rng, level) {
    const t = notRight(rng, 40, 140, 14);
    const ofKind = (kinds: PairKind[]) => rng.pick(PAIRS.filter((p) => kinds.includes(p[2])));
    if (level === 1) {
      const [g, h, kind] = ofKind(rng.chance(0.25) ? ['vertOpp'] : ['corresp', 'alt', 'coint']);
      const [p, q] = rng.chance(0.5) ? [g, h] : [h, g];
      const order: PairKind[] = ['corresp', 'alt', 'coint', 'vertOpp'];
      const opts: Opt[] = order.map((k) => ({ id: k, text: PAIR_NAME[k] }));
      return {
        ...choice(rng, {
          prompt: '$AB \\parallel CD$ and EF is a transversal. What kind of angle pair are $p$ and $q$?',
          correct: opts.find((o) => o.id === kind)!,
          distractors: opts.filter((o) => o.id !== kind).map((o) => ({ ...o, feedback: `${PAIR_LOOK[o.id as PairKind]} Look again at where p and q are.` })),
          keepOrder: opts,
          code: 'angle-pair',
          hints: ['Are p and q at the same crossing (G or H) or at different crossings?', 'Then check: are they between the parallel lines or outside them, and on the same side of EF or on opposite sides?'],
          solution: [`$p$ is $${an(p)}$ and $q$ is $${an(q)}$. ${PAIR_LOOK[kind]}`],
        }),
        figure: parallelFig(t, [tmark(p, 'p'), tmark(q, 'q')], `Angle ${p} is marked p and angle ${q} is marked q.`),
      };
    }
    if (level === 2 || level === 3) {
      const [g, h, kind] = ofKind(level === 2 ? ['corresp', 'alt', 'coint'] : ['corresp', 'alt', 'coint', 'vertOpp']);
      const [given, ask] = rng.chance(0.5) ? [g, h] : [h, g];
      const v = tval(given, t);
      const w = tval(ask, t);
      const reason = SP_REASONS[kind].text;
      if (level === 3) {
        return reasonQuestion(rng, {
          prompt: `$AB \\parallel CD$ and $${an(given)} = ${v}^\\circ$. Which reason proves that $${an(ask)} = ${w}^\\circ$?`,
          figure: parallelFig(t, [tmark(given, deg(v)), tmark(ask, '?')], `Angle ${given} is ${v} degrees. Angle ${ask} is marked with a question mark.`),
          correct: kind,
          pool: ['corresp', 'alt', 'coint', 'vertOpp', 'strLine'],
          why: `$${an(given)}$ and $${an(ask)}$ are ${PAIR_NAME[kind].toLowerCase()}. ${PAIR_LOOK[kind]}`,
        });
      }
      const equal = kind !== 'coint';
      return numberQuestion({
        prompt: '$AB \\parallel CD$. Find $x$.',
        figure: parallelFig(t, [tmark(given, deg(v)), tmark(ask, 'x')], `Angle ${given} is ${v} degrees. Angle ${ask} is x.`),
        answer: w,
        hints: [`Which pair are x and the ${v}° angle: corresponding, alternate or co-interior?`, equal ? `${PAIR_NAME[kind]} between parallel lines are equal.` : 'Co-interior angles between parallel lines add up to 180°.'],
        working: equal ? [`$x = ${v}^\\circ$ (${reason})`] : [`$x + ${v}^\\circ = 180^\\circ$ (${reason})`, `$x = ${w}^\\circ$`],
        wrong: [
          equal
            ? { n: 180 - v, code: 'parallel-angles', feedback: `These are ${PAIR_NAME[kind].toLowerCase()}, which are equal. Only co-interior angles add up to 180°.` }
            : { n: v, code: 'parallel-angles', feedback: 'These are co-interior angles: between the parallel lines, on the same side of EF. They are not equal; they add up to 180°.' },
        ],
      });
    }
    if (level === 4) {
      // Two steps: the given and asked angles are at different crossings and are not a named pair.
      const pairs = AT_G.flatMap((g) => AT_H.filter((h) => TANG[g].same !== TANG[h].same && pairKind(g, h) !== 'coint').map((h) => [g, h] as [TName, TName]));
      const [g, h] = rng.pick(pairs);
      const [given, ask] = rng.chance(0.5) ? [g, h] : [h, g];
      const v = tval(given, t);
      const other = TANG[given].at === 'G' ? AT_H : AT_G;
      const step = other.find((k) => (TANG[given].at === 'G' ? pairKind(given, k) : pairKind(k, given)) === 'corresp')!;
      return numberQuestion({
        prompt: '$AB \\parallel CD$. Find $x$.',
        figure: parallelFig(t, [tmark(given, deg(v)), tmark(ask, 'x')], `Angle ${given} is ${v} degrees. Angle ${ask} is x.`),
        answer: 180 - v,
        hints: [`x and the ${v}° angle are not a corresponding, alternate or co-interior pair. Go in two steps.`, `First find the angle at ${TANG[ask].at} that corresponds to the ${v}° angle. Then use a straight line at ${TANG[ask].at}.`],
        working: [`$${an(step)} = ${v}^\\circ$ (corresp ∠s; AB ∥ CD)`, `$x = 180^\\circ - ${v}^\\circ = ${180 - v}^\\circ$ (∠s on a str line)`],
        wrong: [{ n: v, code: 'parallel-angles', feedback: `x and the ${v}° angle are not a corresponding or alternate pair, so they need not be equal. Find $${an(step)}$ first, then use the straight line.` }],
      });
    }
    // Level 5: expressions in x.
    for (;;) {
      const [g, h, kind] = ofKind(['corresp', 'alt', 'coint']);
      const v1 = tval(g, t);
      const v2 = tval(h, t);
      const equal = kind !== 'coint';
      const e = exprsFor(rng, [v1, v2], [1, 5], (u) => usable(equal ? (180 - u.qs[0]! - u.qs[1]!) / (u.ps[0]! + u.ps[1]!) : (u.qs[1]! - u.qs[0]!) / (u.ps[0]! - u.ps[1]!), u.x));
      if (!e) continue;
      const { x, p, q, r, s } = two(e);
      const A = lin(p, q);
      const B = lin(r, s);
      return solveX({
        prompt: '$AB \\parallel CD$. Find $x$.',
        figure: parallelFig(t, [tmark(g, A.plain), tmark(h, B.plain)], `Angle ${g} is ${A.plain} and angle ${h} is ${B.plain}.`),
        x,
        hints: ['Which pair are the two marked angles: corresponding, alternate or co-interior?', equal ? 'They are equal: set the expressions equal and solve.' : 'They add up to 180°: write that equation and solve.'],
        working: equal
          ? [`$${A.tex} = ${B.tex}$ (${SP_REASONS[kind].text})`, `$${p - r}x = ${s - q}$, so $x = ${x}$`, `Check: both angles are $${v1}^\\circ$.`]
          : [`$(${A.tex}) + (${B.tex}) = 180$ (${SP_REASONS[kind].text})`, `$${p + r}x = ${180 - q - s}$, so $x = ${x}$`, `Check: $${v1}^\\circ + ${v2}^\\circ = 180^\\circ$.`],
        wrong: equal
          ? [{ n: (180 - q - s) / (p + r), code: 'parallel-angles', feedback: `These are ${PAIR_NAME[kind].toLowerCase()}, so they are equal. Only co-interior angles add up to 180°.` }]
          : [{ n: (s - q) / (p - r), code: 'parallel-angles', feedback: 'These are co-interior angles. They are not equal: they add up to 180°.' }],
      });
    }
  },
};

// ===========================================================================
// Grade 8 (exterior angle: Grade 9): angles in triangles
// ===========================================================================

/** △ABC with ∠A = al at A(0, 0) and ∠B = be at B(1, 0); C above AB. */
function tri(al: number, be: number) {
  const k = Math.sin(rad(be)) / Math.sin(rad(al + be));
  return [P('A', 0, 0), P('B', 1, 0), P('C', k * Math.cos(rad(al)), k * Math.sin(rad(al)))];
}
const TRI_SEGS: Seg[] = [{ a: 'A', b: 'B' }, { a: 'B', b: 'C' }, { a: 'C', b: 'A' }];
const mA = (text: string): Ang => ({ at: 'A', from: 'B', to: 'C', text });
const mB = (text: string): Ang => ({ at: 'B', from: 'C', to: 'A', text });
const mC = (text: string): Ang => ({ at: 'C', from: 'A', to: 'B', text });
/** Isosceles △ABC with AB = AC and base angles b: B(−1, 0), C(1, 0), A on top. */
const isosPts = (b: number) => [P('A', 0, Math.tan(rad(b))), P('B', -1, 0), P('C', 1, 0)];
const ISOS_SEGS: Seg[] = [{ a: 'A', b: 'B', ticks: 1 }, { a: 'A', b: 'C', ticks: 1 }, { a: 'B', b: 'C' }];
function threeAngles(rng: Rng, lo = 30, hi = 100) {
  for (;;) {
    const al = rng.int(lo, hi);
    const be = rng.int(lo, hi);
    const ga = 180 - al - be;
    if (ga >= 25 && Math.abs(al - be) >= 5 && Math.abs(al - ga) >= 5 && Math.abs(be - ga) >= 5 && ![al, be, ga].some((v) => Math.abs(v - 90) < 6)) return { al, be, ga };
  }
}

export const triangleAngles: QuestionTemplate = {
  id: 'triangle-angles',
  skillId: 'triangle-angles',
  generate(rng, level) {
    if (level === 1) {
      const { al, be, ga } = threeAngles(rng);
      const u = rng.pick(['A', 'B', 'C'] as const);
      const vals = { A: al, B: be, C: ga };
      const known = (['A', 'B', 'C'] as const).filter((k) => k !== u);
      const k1 = vals[known[0]!];
      const k2 = vals[known[1]!];
      const mark = { A: mA, B: mB, C: mC };
      return numberQuestion({
        prompt: 'Find $x$ in $\\triangle ABC$.',
        figure: fig(`Triangle ABC. Angle ${known[0]} is ${k1} degrees, angle ${known[1]} is ${k2} degrees and angle ${u} is x.`, tri(al, be), TRI_SEGS, [mark[known[0]!](deg(k1)), mark[known[1]!](deg(k2)), mark[u]('x')]),
        answer: vals[u],
        hints: ['The three angles of a triangle add up to 180°.', `Add the two angles you know, then subtract from 180°.`],
        working: [`$x + ${k1}^\\circ + ${k2}^\\circ = 180^\\circ$ (∠s of Δ)`, `$x = 180^\\circ - ${k1 + k2}^\\circ = ${vals[u]}^\\circ$`],
        wrong: [
          { n: 360 - k1 - k2, code: 'triangle-sum', feedback: 'The angles of a triangle add up to 180°, not 360°. 360° is for a quadrilateral or round a point.' },
          { n: k1 + k2, code: 'triangle-sum', feedback: `That is the sum of the two angles you know. Subtract it from 180° to get x.` },
        ],
      });
    }
    if (level === 2) {
      const kind = rng.chance(0.15) ? 'equilateral' : rng.pick(['right', 'isos'] as const);
      if (kind === 'equilateral') {
        const s3 = Math.sqrt(3);
        return numberQuestion({
          prompt: '$\\triangle ABC$ has three equal sides. Find $x$.',
          figure: fig('Triangle ABC with all three sides equal. Angle A is x.', [P('A', 0, s3), P('B', -1, 0), P('C', 1, 0)], [{ a: 'A', b: 'B', ticks: 1 }, { a: 'A', b: 'C', ticks: 1 }, { a: 'B', b: 'C', ticks: 1 }], [{ at: 'A', from: 'B', to: 'C', text: 'x' }]),
          answer: 60,
          hints: ['The triangle is equilateral, so all three angles are equal.', 'Share 180° equally between the three angles.'],
          working: ['All three angles are equal (equilateral Δ), and they add up to $180^\\circ$ (∠s of Δ).', '$x = 180^\\circ \\div 3 = 60^\\circ$'],
          wrong: [{ n: 90, code: 'isosceles-angles', feedback: 'All three sides are equal, so all three angles are equal: share 180° between three angles.' }, { n: 180, code: 'triangle-sum', feedback: '180° is all three angles together. Each one is a third of it.' }],
        });
      }
      if (kind === 'right') {
        let al = rng.int(20, 70);
        while (Math.abs(al - 45) < 4) al = rng.int(20, 70);
        return numberQuestion({
          prompt: 'Find $x$ in the right-angled triangle $ABC$.',
          figure: fig(`Triangle ABC with a right angle at B. Angle A is ${al} degrees. Angle C is x.`, tri(al, 90), TRI_SEGS, [{ ...mB(''), right: true }, mA(deg(al)), mC('x')]),
          answer: 90 - al,
          hints: ['The square mark at B means ∠B = 90°.', 'The three angles still add up to 180°: count the right angle too.'],
          working: [`$x + ${al}^\\circ + 90^\\circ = 180^\\circ$ (∠s of Δ)`, `$x = ${90 - al}^\\circ$`],
          wrong: [
            { n: 180 - al, code: 'triangle-sum', feedback: 'The right angle at B is 90°, and it counts too: subtract it as well.' },
            { n: al, code: 'isosceles-angles', feedback: 'Nothing says the triangle is isosceles, so ∠C need not equal ∠A. Use the angle sum.' },
          ],
        });
      }
      const b = rng.int(30, 75);
      return numberQuestion({
        prompt: 'In $\\triangle ABC$, $AB = AC$. Find $x$.',
        figure: fig(`Isosceles triangle ABC with AB equal to AC. Angle B is ${b} degrees. Angle A is x.`, isosPts(b), ISOS_SEGS, [{ at: 'B', from: 'C', to: 'A', text: deg(b) }, { at: 'A', from: 'B', to: 'C', text: 'x' }]),
        answer: 180 - 2 * b,
        hints: ['AB = AC, so the angles opposite those sides are equal: ∠C = ∠B.', 'Now use the angle sum of the triangle.'],
        working: [`$\\hat{C} = \\hat{B} = ${b}^\\circ$ (∠s opp = sides)`, `$x = 180^\\circ - ${b}^\\circ - ${b}^\\circ = ${180 - 2 * b}^\\circ$ (∠s of Δ)`],
        wrong: [
          { n: 180 - b, code: 'isosceles-angles', feedback: `AB = AC, so ∠C is also ${b}°. Subtract both base angles from 180°.` },
          { n: b, code: 'isosceles-angles', feedback: 'The equal angles are the base angles, B and C, opposite the equal sides. The top angle A is different.' },
        ],
      });
    }
    if (level === 3) {
      if (rng.chance(0.6)) {
        let a = 2 * rng.int(15, 65);
        while (a === 60) a = 2 * rng.int(15, 65);
        const x = (180 - a) / 2;
        return numberQuestion({
          prompt: 'In $\\triangle ABC$, $AB = AC$. Find $x$.',
          figure: fig(`Isosceles triangle ABC with AB equal to AC. Angle A is ${a} degrees. Angle C is x.`, isosPts(x), ISOS_SEGS, [{ at: 'A', from: 'B', to: 'C', text: deg(a) }, { at: 'C', from: 'A', to: 'B', text: 'x' }]),
          answer: x,
          hints: ['AB = AC, so ∠B = ∠C = x.', `The two equal angles share what is left of 180° after ∠A.`],
          working: [`$\\hat{B} = \\hat{C} = x$ (∠s opp = sides)`, `$2x + ${a}^\\circ = 180^\\circ$ (∠s of Δ)`, `$2x = ${180 - a}^\\circ$, so $x = ${x}^\\circ$`],
          wrong: [
            { n: 180 - a, code: 'isosceles-angles', feedback: `That is ∠B and ∠C together. They are equal, so halve it.` },
            { n: a, code: 'isosceles-angles', feedback: 'The equal angles are B and C, opposite the equal sides AC and AB. ∠A is different.' },
          ],
        });
      }
      // Not near 60°: the triangle would be equilateral and every side the answer.
      let b = rng.int(35, 72);
      while (Math.abs(b - 60) < 5) b = rng.int(35, 72);
      const L = rng.int(5, 12);
      const base = 2 * L * Math.cos(rad(b));
      const baseLabel = Math.round(base * 10) / 10;
      const pts = [P('A', 0, L * Math.sin(rad(b))), P('B', -L * Math.cos(rad(b)), 0), P('C', L * Math.cos(rad(b)), 0)];
      return numberQuestion({
        prompt: `In $\\triangle ABC$, $\\hat{B} = \\hat{C} = ${b}^\\circ$ and $AB = ${L}$ cm. Find $AC$.`,
        figure: fig(`Triangle ABC. Angles B and C are both ${b} degrees. AB is ${L} cm and BC is ${dc(baseLabel)} cm. AC is unknown.`, pts, [
          { a: 'A', b: 'B', text: `${L} cm` },
          { a: 'A', b: 'C', text: '?' },
          { a: 'B', b: 'C', text: `${dc(baseLabel)} cm` },
        ], [{ at: 'B', from: 'C', to: 'A', text: deg(b) }, { at: 'C', from: 'A', to: 'B', text: deg(b) }]),
        answer: L,
        unit: 'cm',
        hints: ['∠B = ∠C. Which sides are opposite those two angles?', 'Sides opposite equal angles are equal.'],
        working: [`$\\hat{B} = \\hat{C}$, so the sides opposite them are equal: $AC = AB$ (sides opp = ∠s).`, `$AC = ${L}$ cm`],
        wrong: [{ n: baseLabel, code: 'isosceles-angles', feedback: 'BC is opposite ∠A. AC is opposite ∠B and AB is opposite ∠C: those two angles are equal, so those two sides are equal.' }],
      });
    }
    if (level === 4) {
      const { al, be, ga } = threeAngles(rng, 30, 85);
      const pts = tri(al, be);
      const B = pts[1]!;
      const C = pts[2]!;
      const len = Math.hypot(C.x - B.x, C.y - B.y);
      pts.push(P('D', C.x + ((C.x - B.x) / len) * 0.6, C.y + ((C.y - B.y) / len) * 0.6));
      const segs: Seg[] = [{ a: 'A', b: 'B' }, { a: 'A', b: 'C' }, { a: 'B', b: 'D' }];
      const ext = (text: string): Ang => ({ at: 'C', from: 'A', to: 'D', text });
      const e = al + be;
      if (rng.chance(0.5)) {
        return numberQuestion({
          prompt: 'In $\\triangle ABC$, $BC$ is extended to $D$. Find $x$.',
          figure: fig(`Triangle ABC with BC extended to D. Angle A is ${al} degrees, angle B is ${be} degrees, and the exterior angle ACD is x.`, pts, segs, [mA(deg(al)), mB(deg(be)), ext('x')]),
          answer: e,
          hints: ['x is an exterior angle of the triangle: outside it, on the extended side.', 'An exterior angle equals the sum of the two interior angles opposite it.'],
          working: [`$x = ${al}^\\circ + ${be}^\\circ = ${e}^\\circ$ (ext ∠ of Δ)`, `Or in two steps: $\\angle ACB = 180^\\circ - ${al}^\\circ - ${be}^\\circ = ${ga}^\\circ$ (∠s of Δ), then $x = 180^\\circ - ${ga}^\\circ = ${e}^\\circ$ (∠s on a str line).`],
          wrong: [
            { n: ga, code: 'exterior-angle', feedback: 'That is ∠ACB, inside the triangle. x is outside, between AC and the extended line CD.' },
            { n: 360 - al - be, code: 'triangle-sum', feedback: 'The angles of a triangle add up to 180°, not 360°.' },
          ],
        });
      }
      return numberQuestion({
        prompt: 'In $\\triangle ABC$, $BC$ is extended to $D$. Find $x$.',
        figure: fig(`Triangle ABC with BC extended to D. Angle A is ${al} degrees, the exterior angle ACD is ${e} degrees, and angle B is x.`, pts, segs, [mA(deg(al)), ext(deg(e)), mB('x')]),
        answer: be,
        hints: [`The ${e}° angle is an exterior angle of the triangle.`, `It equals the sum of the two interior opposite angles, ∠A and ∠B.`],
        working: [`$${al}^\\circ + x = ${e}^\\circ$ (ext ∠ of Δ)`, `$x = ${e}^\\circ - ${al}^\\circ = ${be}^\\circ$`],
        wrong: [
          { n: e + al, code: 'exterior-angle', feedback: `The exterior angle is the sum of ∠A and ∠B, so subtract ∠A from ${e}°, don't add it.` },
          { n: 180 - e, code: 'exterior-angle', feedback: `That is ∠ACB, the interior angle at C. The question asks for ∠B.` },
        ],
      });
    }
    // Level 5
    if (rng.chance(0.5)) {
      for (;;) {
        const { al, be, ga } = threeAngles(rng, 30, 100);
        const e = exprsFor(rng, [al, be, ga], [1, 4], (u) => usable((360 - u.qs[0]! - u.qs[1]! - u.qs[2]!) / (u.ps[0]! + u.ps[1]! + u.ps[2]!), u.x));
        if (!e) continue;
        const { x } = e;
        const ps = e.ps as [number, number, number];
        const qs = e.qs as [number, number, number];
        const L = [lin(ps[0], qs[0]), lin(ps[1], qs[1]), lin(ps[2], qs[2])];
        const sp = ps[0] + ps[1] + ps[2];
        const sq = qs[0] + qs[1] + qs[2];
        return solveX({
          prompt: 'Find $x$ in $\\triangle ABC$.',
          figure: fig(`Triangle ABC. Angle A is ${L[0]!.plain}, angle B is ${L[1]!.plain} and angle C is ${L[2]!.plain}.`, tri(al, be), TRI_SEGS, [mA(L[0]!.plain), mB(L[1]!.plain), mC(L[2]!.plain)]),
          x,
          hints: ['The three angles add up to 180°, whatever they are written as.', 'Add the three expressions, set the total equal to 180 and solve.'],
          working: [
            `$(${L[0]!.tex}) + (${L[1]!.tex}) + (${L[2]!.tex}) = 180$ (∠s of Δ)`,
            `$${lin(sp, sq).tex} = 180$`,
            `$${sp}x = ${180 - sq}$, so $x = ${x}$`,
            `Check: $${al}^\\circ + ${be}^\\circ + ${ga}^\\circ = 180^\\circ$.`,
          ],
          wrong: [{ n: (360 - sq) / sp, code: 'triangle-sum', feedback: 'The angles of a triangle add up to 180°, not 360°.' }],
        });
      }
    }
    const b = rng.int(40, 75);
    const e = 180 - b;
    const pts = [...isosPts(b), P('D', 1.8, 0)];
    return numberQuestion({
      prompt: 'In $\\triangle ABC$, $AB = AC$ and $BC$ is extended to $D$. Find $x$.',
      figure: fig(`Isosceles triangle ABC with AB equal to AC. BC is extended to D. The exterior angle ACD is ${e} degrees. Angle A is x.`, pts, [{ a: 'A', b: 'B', ticks: 1 }, { a: 'A', b: 'C', ticks: 1 }, { a: 'B', b: 'D' }], [
        { at: 'C', from: 'A', to: 'D', text: deg(e) },
        { at: 'A', from: 'B', to: 'C', text: 'x' },
      ]),
      answer: 180 - 2 * b,
      hints: ['First find ∠ACB from the straight line BCD.', 'AB = AC, so ∠B = ∠ACB. Then use the angle sum of the triangle.'],
      working: [`$\\angle ACB = 180^\\circ - ${e}^\\circ = ${b}^\\circ$ (∠s on a str line)`, `$\\hat{B} = \\angle ACB = ${b}^\\circ$ (∠s opp = sides)`, `$x = 180^\\circ - 2 \\times ${b}^\\circ = ${180 - 2 * b}^\\circ$ (∠s of Δ)`],
      wrong: [
        { n: b, code: 'isosceles-angles', feedback: `${b}° is ∠ACB (and ∠B). The question asks for the top angle, A.` },
        { n: 2 * b, code: 'isosceles-angles', feedback: `That is ∠B and ∠ACB together. Subtract it from 180° to get ∠A.` },
        { n: 180 - b, code: 'exterior-angle', feedback: `That is the exterior angle itself. x is inside the triangle, at A.` },
      ],
    });
  },
};

// ===========================================================================
// Grade 9: quadrilaterals (definitions, angle sum, diagonals, kites)
// ===========================================================================

type Quad = 'trapezium' | 'kite' | 'parallelogram' | 'rectangle' | 'rhombus' | 'square';
const QNAME: Record<Quad, string> = { trapezium: 'Trapezium', kite: 'Kite', parallelogram: 'Parallelogram', rectangle: 'Rectangle', rhombus: 'Rhombus', square: 'Square' };
const QDEF: Record<Quad, string> = {
  trapezium: 'A trapezium has only one pair of opposite sides parallel.',
  kite: 'A kite has two pairs of equal adjacent sides.',
  parallelogram: 'A parallelogram has both pairs of opposite sides parallel.',
  rectangle: 'A rectangle is a parallelogram with four right angles.',
  rhombus: 'A rhombus is a parallelogram with four equal sides.',
  square: 'A square is a rectangle with four equal sides.',
};
const QDIAG: Record<Quad, string> = {
  trapezium: "A trapezium's diagonals are not equal, perpendicular or bisected in general.",
  kite: "A kite's diagonals are perpendicular, and only one of them is bisected.",
  parallelogram: "A parallelogram's diagonals bisect each other.",
  rectangle: "A rectangle's diagonals are equal and bisect each other.",
  rhombus: "A rhombus's diagonals bisect each other at right angles.",
  square: "A square's diagonals are equal, bisect each other and are perpendicular.",
};
/**
 * Each description fits exactly one of the offered names. Special cases of the answer, and any shape the description
 * names ("it is a parallelogram with…"), are never offered.
 */
const DEFINE: { text: string; ans: Quad; never: Quad[] }[] = [
  { text: 'It has only one pair of opposite sides parallel.', ans: 'trapezium', never: [] },
  { text: 'Exactly one pair of its opposite sides is parallel.', ans: 'trapezium', never: [] },
  { text: 'It has two pairs of equal adjacent sides.', ans: 'kite', never: ['rhombus', 'square'] },
  { text: 'Two pairs of adjacent sides are equal, but its sides are not all equal.', ans: 'kite', never: [] },
  { text: 'Both pairs of opposite sides are parallel.', ans: 'parallelogram', never: ['rectangle', 'rhombus', 'square'] },
  { text: 'Both pairs of opposite sides are parallel, its sides are not all equal and it has no right angles.', ans: 'parallelogram', never: [] },
  { text: 'It is a parallelogram with a right angle.', ans: 'rectangle', never: ['square', 'parallelogram'] },
  { text: 'It has four right angles, but its sides are not all equal.', ans: 'rectangle', never: [] },
  { text: 'It is a parallelogram with all four sides equal.', ans: 'rhombus', never: ['square', 'kite', 'parallelogram'] },
  { text: 'All four sides are equal, but it has no right angles.', ans: 'rhombus', never: [] },
  { text: 'All four sides are equal and all four angles are right angles.', ans: 'square', never: [] },
  { text: 'It is a rhombus with a right angle.', ans: 'square', never: ['rhombus'] },
];
/** Every square is also a rectangle, a rhombus, a parallelogram and a kite, and so on. */
const ALSO: Record<Quad, Quad[]> = { square: ['rectangle', 'rhombus', 'parallelogram', 'kite'], rectangle: ['parallelogram'], rhombus: ['parallelogram', 'kite'], parallelogram: [], kite: [], trapezium: [] };
const MARKS_SHOW: Record<Quad, string> = {
  trapezium: 'The arrows show one pair of opposite sides parallel, and the other pair is not marked parallel.',
  kite: 'The marks show two pairs of equal adjacent sides.',
  parallelogram: 'The arrows show both pairs of opposite sides parallel.',
  rectangle: 'The marks show four right angles.',
  rhombus: 'The marks show four equal sides.',
  square: 'The marks show four equal sides and four right angles.',
};
const DIAG_SHOW: Record<Exclude<Quad, 'trapezium'>, string> = {
  parallelogram: 'The marks show that the diagonals bisect each other (AM = MC and BM = MD). That makes ABCD a parallelogram.',
  rectangle: 'The marks show that the diagonals bisect each other and are equal (all four halves are equal). That makes ABCD a rectangle.',
  rhombus: 'The marks show that the diagonals bisect each other at right angles. That makes ABCD a rhombus.',
  square: 'The marks show that the diagonals are equal and bisect each other at right angles. That makes ABCD a square.',
  kite: 'The marks show that the diagonals are perpendicular and that only BD is bisected (BM = MD, but AM is not equal to MC). That makes ABCD a kite.',
};
const DIAGONALS: { text: string; ans: Quad; offer: Quad[] }[] = [
  { text: 'The diagonals bisect each other at right angles, but they are not equal.', ans: 'rhombus', offer: ['kite', 'rectangle', 'parallelogram'] },
  { text: 'The diagonals are equal and bisect each other, but they are not perpendicular.', ans: 'rectangle', offer: ['square', 'rhombus', 'kite'] },
  { text: 'The diagonals are perpendicular, and only one of them is bisected by the other.', ans: 'kite', offer: ['rhombus', 'square', 'parallelogram'] },
  { text: 'The diagonals are equal, perpendicular and bisect each other.', ans: 'square', offer: ['rectangle', 'rhombus', 'kite'] },
  { text: 'The diagonals bisect each other, but they are neither equal nor perpendicular.', ans: 'parallelogram', offer: ['rectangle', 'rhombus', 'kite'] },
];

/**
 * A convex quadrilateral ABCD (anticlockwise) with interior angles al, be, ga, de (summing to 360°), AB = 1,4.
 * Returns null if the chosen side length gives a degenerate shape.
 */
function quadFromAngles(al: number, be: number, ga: number, u: number): Pt[] | null {
  const B = { x: 1.4, y: 0 };
  const d1 = [Math.cos(rad(180 - be)), Math.sin(rad(180 - be))] as const; // B → C
  const d2 = [Math.cos(rad(al)), Math.sin(rad(al))] as const; // A → D
  const d3 = [Math.cos(rad(360 - be - ga)), Math.sin(rad(360 - be - ga))] as const; // C → D
  const C = { x: B.x + u * d1[0], y: B.y + u * d1[1] };
  // D = v·d2 = C + w·d3  →  v·d2 − w·d3 = C
  const det = d2[0] * -d3[1] - -d3[0] * d2[1];
  if (Math.abs(det) < 1e-6) return null;
  const v = (C.x * -d3[1] - -d3[0] * C.y) / det;
  const w = (d2[0] * C.y - d2[1] * C.x) / det;
  if (v < 0.5 || w < 0.5) return null;
  return [P('A', 0, 0), P('B', B.x, B.y), P('C', C.x, C.y), P('D', v * d2[0], v * d2[1])];
}
const QUAD_SEGS: Seg[] = [{ a: 'A', b: 'B' }, { a: 'B', b: 'C' }, { a: 'C', b: 'D' }, { a: 'D', b: 'A' }];
const QMARK = {
  A: (text: string): Ang => ({ at: 'A', from: 'B', to: 'D', text }),
  B: (text: string): Ang => ({ at: 'B', from: 'C', to: 'A', text }),
  C: (text: string): Ang => ({ at: 'C', from: 'D', to: 'B', text }),
  D: (text: string): Ang => ({ at: 'D', from: 'A', to: 'C', text }),
};
const PARM_SIDES: Seg[] = [{ a: 'A', b: 'B', arrows: 1 }, { a: 'B', b: 'C', arrows: 2 }, { a: 'C', b: 'D', arrows: 1 }, { a: 'D', b: 'A', arrows: 2 }];

const RIGHT_AT_ALL: Ang[] = (['A', 'B', 'C', 'D'] as const).map((v) => ({ ...QMARK[v](''), right: true }));
const slant = (rng: Rng) => (rng.chance(0.5) ? rng.int(55, 74) : rng.int(106, 125));

/** ABCD drawn as the shape, with only the marks on its sides and angles that make it that shape. */
function sideMarked(rng: Rng, q: Quad): GeometryFigure {
  const alt = (marks: string) => `Quadrilateral ABCD. ${marks}`;
  if (q === 'parallelogram' || q === 'rhombus') {
    const al = slant(rng);
    const w = q === 'rhombus' ? 1.2 : 1.6 + rng.int(0, 5) / 10;
    const side = q === 'rhombus' ? 1.2 : 0.9 + rng.int(0, 3) / 10;
    const pts = [P('A', 0, 0), P('B', w, 0), P('C', w + side * Math.cos(rad(al)), side * Math.sin(rad(al))), P('D', side * Math.cos(rad(al)), side * Math.sin(rad(al)))];
    return q === 'rhombus'
      ? fig(alt('All four sides are marked equal.'), pts, QUAD_SEGS.map((g) => ({ ...g, ticks: 1 })))
      : fig(alt('AB is marked parallel to DC and AD is marked parallel to BC.'), pts, PARM_SIDES);
  }
  if (q === 'rectangle' || q === 'square') {
    const w = q === 'square' ? 1.2 : 1.6 + rng.int(0, 6) / 10;
    const h = q === 'square' ? 1.2 : 0.8 + rng.int(0, 4) / 10;
    const pts = [P('A', 0, 0), P('B', w, 0), P('C', w, h), P('D', 0, h)];
    return q === 'square'
      ? fig(alt('All four sides are marked equal and all four angles are marked as right angles.'), pts, QUAD_SEGS.map((g) => ({ ...g, ticks: 1 })), RIGHT_AT_ALL)
      : fig(alt('All four angles are marked as right angles.'), pts, QUAD_SEGS, RIGHT_AT_ALL);
  }
  if (q === 'kite') {
    let al = rng.int(60, 110);
    let ga = rng.int(40, 100);
    while (Math.abs(al - ga) < 20) [al, ga] = [rng.int(60, 110), rng.int(40, 100)];
    const pts = [P('A', 0, 1 / Math.tan(rad(al / 2))), P('B', -1, 0), P('C', 0, -1 / Math.tan(rad(ga / 2))), P('D', 1, 0)];
    return fig(alt('AB is marked equal to AD, and CB is marked equal to CD.'), pts, [
      { a: 'A', b: 'B', ticks: 1 },
      { a: 'B', b: 'C', ticks: 2 },
      { a: 'C', b: 'D', ticks: 2 },
      { a: 'D', b: 'A', ticks: 1 },
    ]);
  }
  let al = rng.int(55, 80);
  let be = rng.int(55, 125);
  while (Math.abs(al - be) < 8 || Math.abs(al + be - 180) < 15) [al, be] = [rng.int(55, 80), rng.int(55, 125)];
  const pts = [P('A', 0, 0), P('B', 2.4, 0), P('C', 2.4 - 1 / Math.tan(rad(be)), 1), P('D', 1 / Math.tan(rad(al)), 1)];
  return fig(alt('AB is marked parallel to DC.'), pts, [{ a: 'A', b: 'B', arrows: 1 }, { a: 'B', b: 'C' }, { a: 'C', b: 'D', arrows: 1 }, { a: 'D', b: 'A' }]);
}

/** ABCD with diagonals meeting at M, marked to show only how the diagonals meet. */
function diagonalMarked(rng: Rng, q: Exclude<Quad, 'trapezium'>): GeometryFigure {
  const perp = q === 'rhombus' || q === 'square' || q === 'kite';
  const phi = perp ? 90 : slant(rng);
  const equal = q === 'rectangle' || q === 'square';
  const am = q === 'kite' ? 0.6 + rng.int(0, 2) / 10 : 1;
  const mc = q === 'kite' ? am * (1.7 + rng.int(0, 5) / 10) : am;
  const half = equal ? 1 : q === 'kite' ? 0.8 : rng.pick([0.55, 0.65, 0.75]);
  const M = P('M', 0, 0);
  const pts = [P('A', -am, 0), toward('B', M, phi + 180, half), P('C', mc, 0), toward('D', M, phi, half), M];
  const acTicks = q === 'kite' ? undefined : 1;
  const bdTicks = q === 'kite' || equal ? 1 : 2;
  const halves: Seg[] = [
    { a: 'A', b: 'M', ...(acTicks ? { ticks: acTicks } : {}) },
    { a: 'M', b: 'C', ...(acTicks ? { ticks: acTicks } : {}) },
    { a: 'B', b: 'M', ticks: bdTicks },
    { a: 'M', b: 'D', ticks: bdTicks },
  ];
  const says = { parallelogram: 'AM equals MC and BM equals MD.', rectangle: 'AM, MC, BM and MD are all marked equal.', rhombus: 'AM equals MC, BM equals MD, and the diagonals meet at right angles.', square: 'AM, MC, BM and MD are all marked equal, and the diagonals meet at right angles.', kite: 'BM equals MD, and the diagonals meet at right angles. AM and MC are not marked equal.' }[q];
  return fig(`Quadrilateral ABCD with diagonals AC and BD meeting at M. ${says}`, pts, [...QUAD_SEGS, ...halves], perp ? [{ at: 'M', from: 'C', to: 'D', text: '', right: true }] : []);
}

/** Name the quadrilateral from its marks: the most specific name. Shapes it also is are wrong because they say less. */
function nameFromMarks(rng: Rng, figure: GeometryFigure, ans: Quad, prompt: string, shows: string): GeneratedQuestion {
  const offer = rng.shuffle((Object.keys(QNAME) as Quad[]).filter((x) => x !== ans)).slice(0, 3);
  const opts = (Object.keys(QNAME) as Quad[]).filter((x) => x === ans || offer.includes(x)).map((x) => ({ id: x, text: QNAME[x] }));
  return {
    ...choice(rng, {
      prompt,
      correct: opts.find((o) => o.id === ans)!,
      distractors: opts
        .filter((o) => o.id !== ans)
        .map((o) => ({
          ...o,
          feedback: ALSO[ans].includes(o.id as Quad)
            ? `Every ${ans} is also a ${o.id}, but the marks show more than a ${o.id} needs. The most specific name is ${ans}.`
            : `${QDEF[o.id as Quad]} The marks don't show that.`,
        })),
      keepOrder: opts,
      code: 'quad-properties',
      hints: ['List exactly what the marks show: parallel arrows, equal-side ticks, right angles.', 'Choose the shape whose definition needs exactly those marks: the most specific name that fits.'],
      solution: [shows, `So ABCD is a **${ans}**.`],
    }),
    figure,
  };
}

function quadChoice(rng: Rng, prompt: string, ans: Quad, offer: Quad[], says: Record<Quad, string>, solution: string): GeneratedQuestion {
  return choice(rng, {
    prompt,
    correct: { id: ans, text: QNAME[ans] },
    distractors: offer.map((d) => ({ id: d, text: QNAME[d], feedback: `${says[d]} Check the description again.` })),
    code: 'quad-properties',
    hints: ['Go through the description one property at a time.', 'For each shape you are not sure of, ask: does it always have every property described, and nothing that contradicts it?'],
    solution: [solution],
  });
}

export const quadrilateralProperties: QuestionTemplate = {
  id: 'quadrilateral-properties',
  skillId: 'quadrilateral-properties',
  generate(rng, level) {
    if (level === 1) {
      if (rng.chance(0.5)) {
        const q = rng.pick(Object.keys(QNAME) as Quad[]);
        return nameFromMarks(rng, sideMarked(rng, q), q, 'Use the marks on the diagram. What is the most specific name for quadrilateral $ABCD$?', MARKS_SHOW[q]);
      }
      const d = rng.pick(DEFINE);
      const others = (Object.keys(QNAME) as Quad[]).filter((q) => q !== d.ans && !d.never.includes(q));
      return quadChoice(rng, `Which quadrilateral is described here? **${d.text}**`, d.ans, rng.shuffle(others).slice(0, 3), QDEF, QDEF[d.ans]);
    }
    if (level === 2) {
      if (rng.chance(0.35)) {
        // Trapezium: co-interior angles between the parallel sides.
        const al = rng.chance(0.5) ? rng.int(50, 78) : rng.int(102, 125);
        let be = rng.chance(0.5) ? rng.int(50, 78) : rng.int(102, 125);
        while (Math.abs(be - al) < 6 || Math.abs(be - (180 - al)) < 6) be = rng.chance(0.5) ? rng.int(50, 78) : rng.int(102, 125);
        const w = 2.4;
        const D = { x: 1 / Math.tan(rad(al)), y: 1 };
        const C = { x: w - 1 / Math.tan(rad(be)), y: 1 };
        const pts = [P('A', 0, 0), P('B', w, 0), P('C', C.x, C.y), P('D', D.x, D.y)];
        return numberQuestion({
          prompt: 'ABCD is a trapezium with $AB \\parallel DC$. Find $x$.',
          figure: fig(`Trapezium ABCD with AB parallel to DC. Angle A is ${al} degrees, angle B is ${be} degrees and angle D is x.`, pts, [{ a: 'A', b: 'B', arrows: 1 }, { a: 'B', b: 'C' }, { a: 'C', b: 'D', arrows: 1 }, { a: 'D', b: 'A' }], [
            QMARK.A(deg(al)),
            QMARK.B(deg(be)),
            QMARK.D('x'),
          ]),
          answer: 180 - al,
          hints: ['AB ∥ DC, and AD crosses both of them.', '∠A and ∠D are between the parallel lines, on the same side of AD: they are co-interior.'],
          working: [`$x + ${al}^\\circ = 180^\\circ$ (co-int ∠s; AB ∥ DC)`, `$x = ${180 - al}^\\circ$`],
          wrong: [
            { n: al, code: 'parallel-angles', feedback: '∠A and ∠D are co-interior angles: they add up to 180°, they are not equal.' },
            { n: 180 - be, code: 'parallel-angles', feedback: '∠B and ∠D are not on the same transversal. Use AD: ∠A and ∠D are the co-interior pair.' },
          ],
        });
      }
      for (;;) {
        const al = rng.int(60, 135);
        const be = rng.int(60, 135);
        const ga = rng.int(60, 135);
        const de = 360 - al - be - ga;
        if (de < 55 || de > 150) continue;
        const angles = { A: al, B: be, C: ga, D: de };
        if (Object.values(angles).some((v) => Math.abs(v - 90) < 6)) continue;
        const pts = quadFromAngles(al, be, ga, 1 + rng.int(0, 4) / 10);
        if (!pts) continue;
        const u = rng.pick(['A', 'B', 'C', 'D'] as const);
        const known = (['A', 'B', 'C', 'D'] as const).filter((k) => k !== u);
        const sum = known.reduce((s, k) => s + angles[k], 0);
        return numberQuestion({
          prompt: 'Find $x$ in quadrilateral $ABCD$.',
          figure: fig(`Quadrilateral ABCD. ${known.map((k) => `Angle ${k} is ${angles[k]} degrees`).join(', ')}. Angle ${u} is x.`, pts, QUAD_SEGS, [...known.map((k) => QMARK[k](deg(angles[k]))), QMARK[u]('x')]),
          answer: angles[u],
          hints: ['The four angles of a quadrilateral add up to 360°.', 'A diagonal cuts it into two triangles: 2 × 180° = 360°.'],
          working: [`$x + ${known.map((k) => `${angles[k]}^\\circ`).join(' + ')} = 360^\\circ$ (∠s of quad)`, `$x = 360^\\circ - ${sum}^\\circ = ${angles[u]}^\\circ$`],
          wrong: [
            { n: sum - 180, code: 'quad-sum', feedback: 'A quadrilateral is not a triangle: its angles add up to 360°, not 180°.' },
            { n: 360 - sum + angles[known[2]!], code: 'probable-slip', feedback: 'Subtract all three known angles from 360°.' },
          ],
        });
      }
    }
    if (level === 3) {
      if (rng.chance(0.5)) {
        const q = rng.pick(['parallelogram', 'rectangle', 'rhombus', 'square', 'kite'] as const);
        return nameFromMarks(rng, diagonalMarked(rng, q), q, 'The diagonals of $ABCD$ meet at $M$. Use the marks on the diagonals: what is the most specific name for $ABCD$?', DIAG_SHOW[q]);
      }
      const d = rng.pick(DIAGONALS);
      return quadChoice(rng, `In which quadrilateral is this always true? **${d.text}**`, d.ans, d.offer, QDIAG, QDIAG[d.ans]);
    }
    if (level === 4) {
      for (;;) {
        const al = rng.int(50, 130);
        const ga = rng.int(40, 120);
        if ((al + ga) % 2 !== 0 || Math.abs(al - ga) < 16) continue;
        const x = (360 - al - ga) / 2;
        if (x < 45 || x > 140 || Math.abs(x - 90) < 5) continue;
        const pts = [P('A', 0, 1 / Math.tan(rad(al / 2))), P('B', -1, 0), P('C', 0, -1 / Math.tan(rad(ga / 2))), P('D', 1, 0)];
        return numberQuestion({
          prompt: 'ABCD is a kite with $AB = AD$ and $CB = CD$. Find $x$.',
          figure: fig(`Kite ABCD with AB equal to AD and CB equal to CD. Angle A is ${al} degrees, angle C is ${ga} degrees and angle B is x.`, pts, [
            { a: 'A', b: 'B', ticks: 1 },
            { a: 'B', b: 'C', ticks: 2 },
            { a: 'C', b: 'D', ticks: 2 },
            { a: 'D', b: 'A', ticks: 1 },
          ], [{ at: 'A', from: 'B', to: 'D', text: deg(al) }, { at: 'C', from: 'D', to: 'B', text: deg(ga) }, { at: 'B', from: 'A', to: 'C', text: 'x' }]),
          answer: x,
          hints: ['In a kite, the two angles between the unequal sides are equal: ∠B = ∠D.', 'The four angles add up to 360°, and ∠B and ∠D share what is left equally.'],
          working: [
            '$\\triangle ABC \\equiv \\triangle ADC$ (S,S,S: $AB = AD$, $CB = CD$, $AC$ common), so $\\hat{B} = \\hat{D} = x$.',
            `$2x + ${al}^\\circ + ${ga}^\\circ = 360^\\circ$ (∠s of quad)`,
            `$2x = ${360 - al - ga}^\\circ$, so $x = ${x}^\\circ$`,
          ],
          wrong: [
            { n: 360 - al - ga, code: 'quad-properties', feedback: 'That is ∠B and ∠D together. In a kite they are equal, so halve it.' },
            { n: 180 - al, code: 'parallel-angles', feedback: 'A kite has no parallel sides, so there are no co-interior angles here. Use the angle sum of the quadrilateral.' },
          ],
        });
      }
    }
    // Level 5: parallelogram angles as expressions.
    for (;;) {
      const al = notRight(rng, 50, 130, 12);
      const pts = [P('A', 0, 0), P('B', 1.6, 0), P('C', 1.6 + Math.cos(rad(al)), Math.sin(rad(al))), P('D', Math.cos(rad(al)), Math.sin(rad(al)))];
      const opp = rng.chance(0.5);
      const v2 = opp ? al : 180 - al;
      const e = exprsFor(rng, [al, v2], [1, 5], (u) => usable(opp ? (180 - u.qs[0]! - u.qs[1]!) / (u.ps[0]! + u.ps[1]!) : (u.qs[1]! - u.qs[0]!) / (u.ps[0]! - u.ps[1]!), u.x));
      if (!e) continue;
      const { x, p, q, r, s } = two(e);
      const A = lin(p, q);
      const B = lin(r, s);
      const other = opp ? 'C' : 'B';
      return solveX({
        prompt: 'ABCD is a parallelogram. Find $x$.',
        figure: fig(`Parallelogram ABCD. Angle A is ${A.plain} and angle ${other} is ${B.plain}.`, pts, PARM_SIDES, [QMARK.A(A.plain), QMARK[other](B.plain)]),
        x,
        hints: [opp ? '∠A and ∠C are opposite angles of the parallelogram.' : '∠A and ∠B are next to each other, between the parallel sides AD and BC.', opp ? 'Opposite angles of a parallelogram are equal.' : 'Co-interior angles add up to 180°.'],
        working: opp
          ? [`$${A.tex} = ${B.tex}$ (opp ∠s of ∥m)`, `$${p - r}x = ${s - q}$, so $x = ${x}$`, `Check: both angles are $${al}^\\circ$.`]
          : [`$(${A.tex}) + (${B.tex}) = 180$ (co-int ∠s; AD ∥ BC)`, `$${p + r}x = ${180 - q - s}$, so $x = ${x}$`, `Check: $${al}^\\circ + ${180 - al}^\\circ = 180^\\circ$.`],
        wrong: opp
          ? [{ n: (180 - q - s) / (p + r), code: 'parallel-angles', feedback: '∠A and ∠C are opposite each other, so they are equal. Angles next to each other add up to 180°.' }]
          : [{ n: (s - q) / (p - r), code: 'parallel-angles', feedback: '∠A and ∠B are next to each other: they are co-interior and add up to 180°, not equal.' }],
      });
    }
  },
};

// ===========================================================================
// Grade 9: congruent and similar triangles
// ===========================================================================

type Tri = [Pt, Pt, Pt];
/** A triangle with sides XY = c, XZ = b, YZ = a (cosine rule), X at the origin. */
function bySides(ids: [string, string, string], a: number, b: number, c: number): Tri {
  const cosX = (b * b + c * c - a * a) / (2 * b * c);
  const X = Math.acos(cosX);
  return [P(ids[0], 0, 0), P(ids[1], c, 0), P(ids[2], b * Math.cos(X), b * Math.sin(X))];
}
const angleOf = (t: Tri, i: number) => {
  const v = t[i]!;
  const p = t[(i + 1) % 3]!;
  const q = t[(i + 2) % 3]!;
  const u = [p.x - v.x, p.y - v.y];
  const w = [q.x - v.x, q.y - v.y];
  return (Math.acos((u[0]! * w[0]! + u[1]! * w[1]!) / (Math.hypot(u[0]!, u[1]!) * Math.hypot(w[0]!, w[1]!))) * 180) / Math.PI;
};
/**
 * A copy of triangle `t` for the second triangle: scaled by k, maybe mirrored, turned through `turn` degrees, and placed
 * to the right of `t`. `ids[i]` is the label of the copy of t[i].
 */
function copyTri(t: Tri, ids: [string, string, string], o: { k?: number; mirror?: boolean; turn?: number }): Tri {
  const k = o.k ?? 1;
  const cx = (t[0].x + t[1].x + t[2].x) / 3;
  const cy = (t[0].y + t[1].y + t[2].y) / 3;
  const c = Math.cos(rad(o.turn ?? 0));
  const s = Math.sin(rad(o.turn ?? 0));
  const moved = t.map((p) => {
    let x = (p.x - cx) * k;
    const y = (p.y - cy) * k;
    if (o.mirror) x = -x;
    return { x: x * c - y * s, y: x * s + y * c };
  });
  const right = Math.max(t[0].x, t[1].x, t[2].x);
  const left = Math.min(...moved.map((p) => p.x));
  const span = right - Math.min(t[0].x, t[1].x, t[2].x);
  const dx = right + span * 0.35 - left;
  return moved.map((p, i) => P(ids[i]!, p.x + dx, p.y + cy)) as Tri;
}
const triSegs = (t: Tri, text: (string | undefined)[] = []): Seg[] =>
  [0, 1, 2].map((i) => ({ a: t[i]!.id, b: t[(i + 1) % 3]!.id, ...(text[i] ? { text: text[i] } : {}) }));
/** The angle mark at vertex i of triangle t. */
const tmarkAt = (t: Tri, i: number, text: string, right = false): Ang => ({ at: t[i]!.id, from: t[(i + 1) % 3]!.id, to: t[(i + 2) % 3]!.id, text, ...(right ? { right: true } : {}) });

type Cond = 'SSS' | 'SAS' | 'AAS' | 'RHS' | 'none';
const CONDS: Record<Cond, { text: string; needs: string }> = {
  SSS: { text: 'S,S,S', needs: 'S,S,S needs all three pairs of sides equal.' },
  SAS: { text: 'S,A,S', needs: 'S,A,S needs two pairs of sides and the angle between them.' },
  AAS: { text: 'A,A,S', needs: 'A,A,S needs two pairs of angles and one pair of corresponding sides.' },
  RHS: { text: 'R,H,S', needs: 'R,H,S needs a right angle, the hypotenuse and one other pair of sides.' },
  none: { text: 'Not necessarily congruent', needs: 'Use this only when no condition fits, for example when only the angles are equal (they could be different sizes).' },
};
const COND_ORDER: Cond[] = ['SSS', 'SAS', 'AAS', 'RHS', 'none'];
const SHOWN: Record<Cond, string> = {
  SSS: 'three pairs of equal sides',
  SAS: 'two pairs of equal sides and the equal angles between them',
  AAS: 'two pairs of equal angles and a pair of equal corresponding sides',
  RHS: 'a right angle in each, equal hypotenuses and another pair of equal sides',
  none: 'only equal angles: the triangles are the same shape but different sizes',
};

/** Two triangles for a condition question, with the marks that show the condition on both. */
function conditionPair(rng: Rng, c: Cond): { first: Tri; second: Tri; segs: Seg[]; angles: Ang[] } {
  const place = (t: Tri, k = 1) => copyTri(t, ['P', 'Q', 'R'], { k, mirror: rng.chance(0.5), turn: rng.int(-35, 35) });
  for (;;) {
    if (c === 'SSS') {
      const a = rng.int(5, 12);
      const b = rng.int(5, 12);
      const cc = rng.int(5, 12);
      if (new Set([a, b, cc]).size < 3 || Math.max(a, b, cc) > a + b + cc - Math.max(a, b, cc) - 2) continue;
      const t = bySides(['A', 'B', 'C'], a, b, cc);
      if ([0, 1, 2].some((i) => Math.abs(angleOf(t, i) - 90) < 8 || angleOf(t, i) < 25)) continue;
      const s = place(t);
      const txt = [`${cc} cm`, `${a} cm`, `${b} cm`];
      return { first: t, second: s, segs: [...triSegs(t, txt), ...triSegs(s, txt)], angles: [] };
    }
    if (c === 'SAS') {
      const ab = rng.int(5, 11);
      const bc = rng.int(5, 11);
      const be = notRight(rng, 35, 125, 10);
      if (ab === bc) continue;
      const t: Tri = [toward('A', { x: 0, y: 0 }, be, ab), P('B', 0, 0), P('C', bc, 0)];
      const s = place(t);
      return { first: t, second: s, segs: [...triSegs(t, [`${ab} cm`, `${bc} cm`]), ...triSegs(s, [`${ab} cm`, `${bc} cm`])], angles: [tmarkAt(t, 1, deg(be)), tmarkAt(s, 1, deg(be))] };
    }
    if (c === 'AAS') {
      const { al, be, ga } = threeAngles(rng, 35, 95);
      const bc = rng.int(5, 11);
      const sAB = (bc * Math.sin(rad(ga))) / Math.sin(rad(al));
      const k = Math.sin(rad(be)) / Math.sin(rad(ga));
      const t: Tri = [P('A', 0, 0), P('B', sAB, 0), P('C', sAB * k * Math.cos(rad(al)), sAB * k * Math.sin(rad(al)))];
      const s = place(t);
      return { first: t, second: s, segs: [...triSegs(t, [undefined, `${bc} cm`]), ...triSegs(s, [undefined, `${bc} cm`])], angles: [tmarkAt(t, 0, deg(al)), tmarkAt(t, 1, deg(be)), tmarkAt(s, 0, deg(al)), tmarkAt(s, 1, deg(be))] };
    }
    if (c === 'RHS') {
      const ab = rng.int(4, 9);
      const ac = ab + rng.int(2, 5);
      const bc = Math.sqrt(ac * ac - ab * ab);
      const t: Tri = [P('A', 0, ab), P('B', 0, 0), P('C', bc, 0)];
      const s = place(t);
      return { first: t, second: s, segs: [...triSegs(t, [`${ab} cm`, undefined, `${ac} cm`]), ...triSegs(s, [`${ab} cm`, undefined, `${ac} cm`])], angles: [tmarkAt(t, 1, '', true), tmarkAt(s, 1, '', true)] };
    }
    const { al, be } = threeAngles(rng, 35, 95);
    const t = tri(al, be).map((p) => P(p.id, p.x * 6, p.y * 6)) as Tri;
    const s = place(t, 1.35 + rng.int(0, 4) / 10);
    return { first: t, second: s, segs: [...triSegs(t), ...triSegs(s)], angles: [tmarkAt(t, 0, deg(al)), tmarkAt(t, 1, deg(be)), tmarkAt(s, 0, deg(al)), tmarkAt(s, 1, deg(be))] };
  }
}

export const congruentSimilar: QuestionTemplate = {
  id: 'congruent-similar',
  skillId: 'congruent-similar',
  generate(rng, level) {
    if (level === 1) {
      const c = rng.pick(COND_ORDER);
      const { first, second, segs, angles } = conditionPair(rng, c);
      // Always offer the answer and "not necessarily congruent", plus other conditions, in a fixed order.
      const others = rng.shuffle(COND_ORDER.filter((d) => d !== c && d !== 'none'));
      const offered: Cond[] = [c, 'none', ...others.slice(0, c === 'none' ? 3 : 2)];
      const opts = COND_ORDER.filter((d) => offered.includes(d)).map((d) => ({ id: d, text: CONDS[d].text }));
      return {
        ...choice(rng, {
          prompt: 'Are $\\triangle ABC$ and $\\triangle PQR$ congruent? Choose the condition that proves it, or say they are not necessarily congruent.',
          correct: opts.find((o) => o.id === c)!,
          distractors: opts.filter((o) => o.id !== c).map((o) => ({ ...o, feedback: `${CONDS[o.id as Cond].needs} The diagram shows ${SHOWN[c]}.` })),
          keepOrder: opts,
          code: 'congruence-condition',
          hints: ['List what is marked equal in both triangles: which sides, which angles, any right angle?', 'For two sides and an angle, check whether the angle is between the two sides.'],
          solution: [`The diagram shows ${SHOWN[c]}.`, c === 'none' ? 'Equal angles (A,A,A) make the triangles similar, not congruent. No condition is met.' : `So $\\triangle ABC \\equiv \\triangle PQR$ (${CONDS[c].text}).`],
        }),
        figure: fig(`Triangles ABC and PQR, marked to show ${SHOWN[c]}.`, [...first, ...second], segs, angles),
      };
    }
    if (level === 2) {
      // The order of the letters says which vertices match.
      const perms: [number, number, number][] = [[0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
      for (;;) {
        const a = rng.int(5, 13);
        const b = rng.int(5, 13);
        const c = rng.int(5, 13);
        if (new Set([a, b, c]).size < 3 || Math.max(a, b, c) > a + b + c - Math.max(a, b, c) - 2) continue;
        const t = bySides(['A', 'B', 'C'], a, b, c);
        if ([0, 1, 2].some((i) => angleOf(t, i) < 25)) continue;
        const perm = rng.pick(perms);
        const img = ['P', 'Q', 'R'] as const;
        const ids = [img[perm[0]], img[perm[1]], img[perm[2]]] as [string, string, string];
        const s = copyTri(t, ids, { mirror: rng.chance(0.5), turn: rng.int(-40, 40) });
        const stmt = ids.join('');
        const len: Record<string, number> = { AB: c, BC: a, AC: b };
        const pre = (L: string) => 'ABC'[ids.indexOf(L)]!;
        const side = (u: string, v: string) => len[[u, v].sort().join('')]!;
        // Ask a side of PQR whose naive match (P→A, Q→B, R→C) is a different side.
        const asks = [['P', 'Q'], ['Q', 'R'], ['P', 'R']].filter(([u, v]) => side(pre(u!), pre(v!)) !== side('ABC'['PQR'.indexOf(u!)]!, 'ABC'['PQR'.indexOf(v!)]!));
        if (!asks.length) continue;
        const [u, v] = rng.pick(asks) as [string, string];
        const answer = side(pre(u), pre(v));
        const naive = side('ABC'['PQR'.indexOf(u)]!, 'ABC'['PQR'.indexOf(v)]!);
        const sSegs: Seg[] = triSegs(s).map((g) => ([g.a, g.b].sort().join('') === [u, v].sort().join('') ? { ...g, text: '?' } : g));
        return numberQuestion({
          prompt: `$\\triangle ABC \\equiv \\triangle ${stmt}$. Find $${u}${v}$.`,
          figure: fig(`Triangle ABC with AB ${c} cm, BC ${a} cm and AC ${b} cm, and a congruent triangle ${stmt}. Side ${u}${v} is unknown.`, [...t, ...s], [...triSegs(t, [`${c} cm`, `${a} cm`, `${b} cm`]), ...sSegs]),
          answer,
          unit: 'cm',
          hints: [`The order of the letters in △ABC ≡ △${stmt} tells you which vertices match: first with first, second with second, third with third.`, `Which vertices of △ABC match ${u} and ${v}?`],
          working: [`In $\\triangle ABC \\equiv \\triangle ${stmt}$: $${pre(u)}$ matches $${u}$ and $${pre(v)}$ matches $${v}$.`, `So $${u}${v} = ${[pre(u), pre(v)].sort().join('')} = ${answer}$ cm.`],
          wrong: [{ n: naive, code: 'congruence-order', feedback: `The order in △ABC ≡ △${stmt} matters: ${u} matches ${pre(u)} and ${v} matches ${pre(v)}, not the letters in alphabetical order.` }],
        });
      }
    }
    if (level === 3) {
      if (rng.chance(0.4)) {
        // Shadows at the same time of day make similar triangles.
        const h = rng.pick([1, 1.5, 2]);
        const s = rng.pick([2, 2.5, 3, 4].filter((v) => v !== h));
        // At most 4 times as big, so the pole stays readable on a phone when both are drawn to one scale.
        const k = rng.pick([2, 3, 4].filter((v) => s * v <= 12));
        const T = s * k;
        const thing = rng.pick([
          { a: 'a tree', the: 'the tree' },
          { a: "the school's flagpole", the: "the school's flagpole" },
          { a: 'a cell-phone tower', the: 'the tower' },
          { a: 'a block of flats', the: 'the block of flats' },
        ]);
        const pole = [P('P', 0, h), P('Q', 0, 0), P('R', s, 0)] as Tri;
        const x0 = s * 1.8 + 0.5;
        const big = [P('X', x0, h * k), P('Y', x0, 0), P('Z', x0 + T, 0)] as Tri;
        return numberQuestion({
          prompt: `At the same time of day, a ${dc(h)} m pole casts a ${dc(s)} m shadow and ${thing.a} casts ${an8(dc(T))} ${dc(T)} m shadow. How tall is ${thing.the}?`,
          figure: fig(`Two right-angled triangles: a pole PQ ${dc(h)} m tall with shadow QR ${dc(s)} m, and XY with shadow YZ ${dc(T)} m. The sun's rays make the same angle θ with the ground in both.`, [...pole, ...big], [
            { a: 'P', b: 'Q', text: `${dc(h)} m` },
            { a: 'Q', b: 'R', text: `${dc(s)} m` },
            { a: 'R', b: 'P', dashed: true },
            { a: 'X', b: 'Y', text: '?' },
            { a: 'Y', b: 'Z', text: `${dc(T)} m` },
            { a: 'Z', b: 'X', dashed: true },
          ], [
            { at: 'Q', from: 'R', to: 'P', text: '', right: true },
            { at: 'Y', from: 'Z', to: 'X', text: '', right: true },
            { at: 'R', from: 'P', to: 'Q', text: 'θ' },
            { at: 'Z', from: 'X', to: 'Y', text: 'θ' },
          ]),
          answer: h * k,
          unit: 'm',
          hints: ['Both triangles have a right angle and the same angle θ, so they are similar.', `The shadow ${dc(T)} m is how many times the shadow ${dc(s)} m? The height is multiplied by the same number.`],
          working: [`The triangles are similar (equal angles: the right angle and θ).`, `Scale factor $= \\dfrac{${tn(T)}}{${tn(s)}} = ${k}$`, `Height $= ${k} \\times ${tn(h)} = ${tn(h * k)}$ m`],
          wrong: [
            { n: h + (T - s), code: 'similar-ratio', feedback: `The shadow is ${k} times as long, not ${dc(T - s)} m longer, so the height is also ${k} times as big. Similar shapes multiply; they don't add.` },
            { n: (T * s) / h, code: 'similar-ratio', feedback: 'The ratio is upside down. Height ÷ shadow is the same in both triangles.' },
          ],
        });
      }
      for (;;) {
        const k = rng.pick([0.5, 1.5, 2, 2.5, 3]);
        const a = rng.int(4, 12);
        const b = rng.int(4, 12);
        const c = rng.int(4, 12);
        if (new Set([a, b, c]).size < 3 || Math.max(a, b, c) > a + b + c - Math.max(a, b, c) - 2) continue;
        if (k === 0.5 && [a, b, c].some((v) => v % 2)) continue;
        if ((k === 1.5 || k === 2.5) && [a, c].some((v) => v % 2)) continue;
        const t = bySides(['A', 'B', 'C'], a, b, c);
        if ([0, 1, 2].some((i) => angleOf(t, i) < 25)) continue;
        const s = copyTri(t, ['D', 'E', 'F'], { k, mirror: rng.chance(0.3) });
        const reverse = rng.chance(0.35);
        const answer = reverse ? a : k * a;
        const tText = [`${c} cm`, reverse ? '?' : `${a} cm`];
        const sText = [`${dc(k * c)} cm`, reverse ? `${dc(k * a)} cm` : '?'];
        const given = reverse ? `EF = ${tn(k * a)}` : `BC = ${a}`;
        const ask = reverse ? 'BC' : 'EF';
        return numberQuestion({
          prompt: `$\\triangle ABC \\,|||\\, \\triangle DEF$. $AB = ${c}$ cm, $DE = ${tn(k * c)}$ cm and $${given}$ cm. Find $${ask}$.`,
          figure: fig(`Similar triangles ABC and DEF. AB is ${c} cm and DE is ${dc(k * c)} cm. ${reverse ? `EF is ${dc(k * a)} cm and BC is unknown.` : `BC is ${a} cm and EF is unknown.`}`, [...t, ...s], [...triSegs(t, tText), ...triSegs(s, sText)]),
          answer,
          unit: 'cm',
          hints: ['AB matches DE, and BC matches EF. Every side of △DEF is the matching side of △ABC times the same scale factor.', `Find the scale factor from AB and DE: $\\dfrac{DE}{AB}$.`],
          working: reverse
            ? [`Scale factor $= \\dfrac{DE}{AB} = \\dfrac{${tn(k * c)}}{${c}} = ${tn(k)}$`, `$BC = \\dfrac{EF}{${tn(k)}} = \\dfrac{${tn(k * a)}}{${tn(k)}} = ${a}$ cm`]
            : [`Scale factor $= \\dfrac{DE}{AB} = \\dfrac{${tn(k * c)}}{${c}} = ${tn(k)}$`, `$EF = ${tn(k)} \\times ${a} = ${tn(k * a)}$ cm`],
          wrong: reverse
            ? [{ n: k * a - (k * c - c), code: 'similar-ratio', feedback: 'Similar triangles multiply every side by the same factor. Subtracting the same amount from each side changes the shape.' }, { n: k * a * k, code: 'similar-ratio', feedback: '△ABC is the other size, so divide EF by the scale factor instead of multiplying.' }]
            : [{ n: a + (k * c - c), code: 'similar-ratio', feedback: 'Similar triangles multiply every side by the same factor. Adding the same amount to each side changes the shape.' }, { n: a / k, code: 'similar-ratio', feedback: 'The ratio is upside down: △DEF is the scaled copy, so multiply BC by DE ÷ AB.' }],
        });
      }
    }
    if (level === 4) {
      // Congruent, similar or neither?
      type Verdict = 'congruent' | 'similar' | 'neither';
      const V: Record<Verdict, string> = { congruent: 'Congruent', similar: 'Similar, but not congruent', neither: 'Neither similar nor congruent' };
      const verdict = rng.pick(['congruent', 'similar', 'similar', 'neither'] as Verdict[]);
      const place = (t: Tri, k: number) => copyTri(t, ['P', 'Q', 'R'], { k, mirror: rng.chance(0.5), turn: rng.int(-30, 30) });
      let figure: GeometryFigure | undefined;
      let shows = '';
      if (verdict === 'congruent') {
        const { first, second, segs, angles } = conditionPair(rng, rng.pick(['SSS', 'SAS', 'AAS', 'RHS'] as Cond[]));
        figure = fig('Triangles ABC and PQR with matching marks.', [...first, ...second], segs, angles);
        shows = 'The marks meet a congruence condition, so the triangles are congruent (and so similar too, with scale factor 1).';
      } else if (verdict === 'similar') {
        if (rng.chance(0.5)) {
          const { first, second, segs, angles } = conditionPair(rng, 'none');
          figure = fig('Triangles ABC and PQR with two pairs of equal angles, different sizes.', [...first, ...second], segs, angles);
          shows = 'Two pairs of angles are equal, so the third pair is equal too (∠s of Δ). Equal angles make the triangles similar. They are different sizes, so not congruent.';
        } else {
          let a = 0;
          let b = 0;
          let c = 0;
          do {
            a = rng.int(3, 7);
            b = rng.int(3, 7);
            c = rng.int(3, 7);
          } while (new Set([a, b, c]).size < 3 || Math.max(a, b, c) > a + b + c - Math.max(a, b, c) - 1);
          const k = rng.pick([2, 3]);
          const t = bySides(['A', 'B', 'C'], a, b, c);
          const s = place(t, k);
          figure = fig(`Triangle ABC with sides ${c}, ${a} and ${b} cm, and triangle PQR with sides ${k * c}, ${k * a} and ${k * b} cm.`, [...t, ...s], [...triSegs(t, [`${c} cm`, `${a} cm`, `${b} cm`]), ...triSegs(s, [`${k * c} cm`, `${k * a} cm`, `${k * b} cm`])]);
          shows = `Every side of △PQR is ${k} times the matching side of △ABC: the sides are in proportion, so the triangles are similar. They are not the same size, so not congruent.`;
        }
      } else {
        for (;;) {
          const { al, be, ga } = threeAngles(rng, 35, 90);
          const be2 = be + (rng.chance(0.5) ? 1 : -1) * rng.int(12, 25);
          const ga2 = 180 - al - be2;
          // The third angles must differ too: if be2 were ga, the triangles would have the same three angles.
          if (ga2 < 25 || be2 < 25 || Math.abs(be2 - ga) < 8) continue;
          const t = tri(al, be).map((p) => P(p.id, p.x * 6, p.y * 6)) as Tri;
          const s = copyTri(tri(al, be2).map((p) => P(p.id, p.x * 6, p.y * 6)) as Tri, ['P', 'Q', 'R'], { k: 1.2, mirror: rng.chance(0.5) });
          figure = fig(`Triangle ABC with angles ${al} and ${be} degrees at A and B, and triangle PQR with angles ${al} and ${be2} degrees at P and Q.`, [...t, ...s], [...triSegs(t), ...triSegs(s)], [tmarkAt(t, 0, deg(al)), tmarkAt(t, 1, deg(be)), tmarkAt(s, 0, deg(al)), tmarkAt(s, 1, deg(be2))]);
          shows = `Work out the third angles (∠s of Δ): △ABC has ${al}°, ${be}° and ${ga}°, and △PQR has ${al}°, ${be2}° and ${ga2}°. Only one angle matches, so the triangles are not the same shape: neither similar nor congruent.`;
          break;
        }
      }
      const order: Verdict[] = ['congruent', 'similar', 'neither'];
      const opts = order.map((v) => ({ id: v, text: V[v] }));
      const why: Record<Verdict, string> = {
        congruent: 'Congruent triangles are the same shape and the same size: a congruence condition must be met.',
        similar: 'Similar triangles have equal angles and sides in proportion, but they need not be the same size.',
        neither: 'Neither means the angles are not all equal and the sides are not in proportion.',
      };
      return {
        ...choice(rng, {
          prompt: 'Are $\\triangle ABC$ and $\\triangle PQR$ congruent, similar but not congruent, or neither?',
          correct: opts.find((o) => o.id === verdict)!,
          distractors: opts.filter((o) => o.id !== verdict).map((o) => ({ ...o, feedback: `${why[o.id as Verdict]} Look again at the marks.` })),
          keepOrder: opts,
          code: 'congruence-condition',
          hints: ['Same shape and same size: congruent. Same shape, different size: similar.', 'Same shape means all three angles equal, or all three sides in the same ratio.'],
          solution: [shows],
        }),
        figure: figure!,
      };
    }
    // Level 5: a line parallel to one side cuts off a similar triangle.
    const m = rng.int(2, 5);
    const n = rng.int(1, 6);
    const w = rng.pick([1, 1.5, 2]);
    const de = m * w;
    const bc = w * (m + n);
    const be = rng.int(55, 75);
    const A = toward('A', { x: 0, y: 0 }, be, m + n);
    const B = P('B', 0, 0);
    const C = P('C', bc, 0);
    const f = m / (m + n);
    const D = P('D', A.x + (B.x - A.x) * f, A.y + (B.y - A.y) * f);
    const E = P('E', A.x + (C.x - A.x) * f, A.y + (C.y - A.y) * f);
    return numberQuestion({
      prompt: `In $\\triangle ABC$, $DE \\parallel BC$ with $D$ on $AB$ and $E$ on $AC$. $AD = ${m}$ cm, $DB = ${n}$ cm and $DE = ${tn(de)}$ cm. Find $BC$.`,
      figure: fig(`Triangle ABC with D on AB and E on AC, DE parallel to BC. AD is ${m} cm, DB is ${n} cm and DE is ${dc(de)} cm. BC is unknown.`, [A, B, C, D, E], [
        { a: 'A', b: 'D', text: `${m} cm` },
        { a: 'D', b: 'B', text: `${n} cm` },
        { a: 'A', b: 'E' },
        { a: 'E', b: 'C' },
        { a: 'D', b: 'E', arrows: 1, text: `${dc(de)} cm` },
        { a: 'B', b: 'C', arrows: 1, text: '?' },
      ]),
      answer: bc,
      unit: 'cm',
      hints: ['DE ∥ BC, so △ADE and △ABC have equal angles: they are similar.', `Match the sides: AD matches AB, which is ${m} + ${n} cm, not ${n} cm.`],
      working: [
        '$\\angle ADE = \\angle ABC$ and $\\angle AED = \\angle ACB$ (corresp ∠s; DE ∥ BC), so $\\triangle ADE \\,|||\\, \\triangle ABC$.',
        `$\\dfrac{BC}{DE} = \\dfrac{AB}{AD} = \\dfrac{${m + n}}{${m}}$`,
        `$BC = ${tn(de)} \\times \\dfrac{${m + n}}{${m}} = ${tn(bc)}$ cm`,
      ],
      wrong: [
        { n: (de * n) / m, code: 'similar-ratio', feedback: 'DB is not a side of either triangle. △ABC has side AB = AD + DB, so use AB ÷ AD.' },
        { n: de + n, code: 'similar-ratio', feedback: 'Similar triangles multiply every side by the same factor; adding a length does not keep the shape.' },
        { n: (de * (m + n)) / n, code: 'similar-ratio', feedback: 'Match AB with AD (both from A), not with DB.' },
      ],
    });
  },
};
