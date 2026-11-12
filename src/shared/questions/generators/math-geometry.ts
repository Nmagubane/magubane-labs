/**
 * Euclidean geometry, Grades 10–12 (CAPS Paper 2). Every question has a diagram, and one level of each skill asks
 * for the reason, because Paper 2 marks a statement only with its reason.
 * Theorems follow the CAPS clarification column; reasons use the wording teachers and markers accept.
 */
import type { GeometryFigure, QuestionTemplate } from '../types.ts';
import type { Rng } from '../rng.ts';
import { exact, keepNum, choice } from './kit.ts';
import type { MistakeCode } from '../mistakes.ts';

type Pt = GeometryFigure['points'][number];
type Seg = NonNullable<GeometryFigure['segments']>[number];
type Ang = NonNullable<GeometryFigure['angles']>[number];
const rad = (d: number) => (d * Math.PI) / 180;
const r2 = (v: number) => Math.round(v * 1000) / 1000;
const P = (id: string, x: number, y: number, extra: Partial<Pt> = {}): Pt => ({ id, x: r2(x), y: r2(y), ...extra });
/** A point on a circle of radius r centred at (cx, cy), at `deg` degrees. */
const onC = (id: string, deg: number, r = 1, cx = 0, cy = 0): Pt => P(id, cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg)));
const fig = (alt: string, points: Pt[], segments: Seg[], angles: Ang[] = [], circles: GeometryFigure['circles'] = []): GeometryFigure => ({ kind: 'geometry', alt, points, segments, angles, ...(circles.length ? { circles } : {}) });
const poly = (ids: string[], extra: Partial<Seg>[] = []): Seg[] => ids.map((a, i) => ({ a, b: ids[(i + 1) % ids.length]!, ...(extra[i] ?? {}) }));
const deg = (n: number) => `${n}°`;
const pickExcept = (rng: Rng, lo: number, hi: number, bad: number[]) => {
  let v = rng.int(lo, hi);
  while (bad.includes(v)) v = rng.int(lo, hi);
  return v;
};

// ---------------------------------------------------------------------------
// Reasons, in the form markers accept, with what each one actually says.
export const REASONS = {
  oppParm: { text: 'opp ∠s of ∥m', says: 'Opposite angles of a parallelogram are equal.' },
  coint: { text: 'co-int ∠s; lines ∥', says: 'Co-interior angles between parallel lines add up to 180°.' },
  alt: { text: 'alt ∠s; lines ∥', says: 'Alternate angles between parallel lines are equal.' },
  corresp: { text: 'corresp ∠s; lines ∥', says: 'Corresponding angles between parallel lines are equal.' },
  diagsBisect: { text: 'diags of ∥m bisect', says: 'The diagonals of a parallelogram bisect each other.' },
  rhombusPerp: { text: 'diags of rhombus ⊥', says: 'The diagonals of a rhombus meet at right angles.' },
  rectDiags: { text: 'diags of rect =', says: 'The diagonals of a rectangle are equal in length.' },
  oppSides: { text: 'opp sides of ∥m', says: 'Opposite sides of a parallelogram are equal.' },
  midpt: { text: 'midpt theorem', says: 'The line joining the midpoints of two sides of a triangle is parallel to the third side and half as long.' },
  midptConv: { text: 'line through midpt ∥ 2nd side', says: 'A line through the midpoint of one side, parallel to a second side, bisects the third side.' },
  perpChord: { text: 'line from centre ⊥ to chord', says: 'A line from the centre perpendicular to a chord bisects the chord.' },
  centre: { text: '∠ at centre = 2 × ∠ at circumference', says: 'The angle an arc subtends at the centre is double the angle it subtends at the circle.' },
  semi: { text: '∠ in semi-circle', says: 'An angle in a semicircle (subtended by a diameter) is 90°.' },
  sameSeg: { text: '∠s in the same seg', says: 'Angles subtended by the same chord, on the same side of it, are equal.' },
  oppCyclic: { text: 'opp ∠s of cyclic quad', says: 'Opposite angles of a cyclic quadrilateral add up to 180°.' },
  extCyclic: { text: 'ext ∠ of cyclic quad', says: 'The exterior angle of a cyclic quadrilateral equals the interior opposite angle.' },
  tanRadius: { text: 'tan ⊥ radius', says: 'A tangent is perpendicular to the radius at the point of contact.' },
  tansCommon: { text: 'tans from common pt', says: 'Two tangents from the same point outside a circle are equal in length.' },
  tanChord: { text: 'tan chord theorem', says: 'The angle between a tangent and a chord equals the angle in the alternate segment.' },
  propThm: { text: 'line ∥ one side of Δ', says: 'A line parallel to one side of a triangle divides the other two sides in the same ratio.' },
  equiangular: { text: '∠∠∠', says: 'Triangles with three equal angles (equiangular) are similar.' },
  similar: { text: '|||Δs', says: 'Corresponding sides of similar triangles are in the same ratio.' },
} as const;
export type ReasonId = keyof typeof REASONS;

function reasonQuestion(rng: Rng, q: { prompt: string; figure: GeometryFigure; correct: ReasonId; pool: ReasonId[]; why: string }) {
  const wrong = rng.shuffle(q.pool.filter((r) => r !== q.correct)).slice(0, 3);
  return {
    ...choice(rng, {
      prompt: q.prompt,
      correct: { id: q.correct, text: REASONS[q.correct].text },
      distractors: wrong.map((r) => ({ id: r, text: REASONS[r].text, feedback: `That reason says: ${REASONS[r].says} It doesn't prove this statement.` })),
      code: 'geometry-reason',
      hints: ['Ask what the statement is about: parallel lines, a special quadrilateral, a circle, a tangent or a ratio? Then find the theorem that says exactly that.'],
      solution: [q.why, `Reason: **${REASONS[q.correct].text}**. ${REASONS[q.correct].says}`],
    }),
    figure: q.figure,
  };
}

function numericAngle(q: { prompt: string; figure: GeometryFigure; answer: number; working: string[]; hints: string[]; wrong: { n: number; code: MistakeCode; feedback: string }[] }) {
  return {
    prompt: q.prompt,
    figure: q.figure,
    input: { kind: 'numeric' as const, unit: '°' },
    answer: exact(q.answer),
    answerDisplay: `${q.answer}°`,
    hints: q.hints,
    solution: q.working,
    misconceptions: keepNum(q.wrong.map((w) => ({ code: w.code, answer: exact(w.n), feedback: w.feedback })), q.answer),
  };
}

// ---------------------------------------------------------------------------
// Grade 10: special quadrilaterals
function parallelogram(a: number, w = 1.6, side = 1) {
  const sx = side * Math.cos(rad(a));
  const sy = side * Math.sin(rad(a));
  return [P('A', 0, 0), P('B', w, 0), P('C', w + sx, sy), P('D', sx, sy)];
}
const PARM_SIDES: Partial<Seg>[] = [{ arrows: 1 }, { arrows: 2 }, { arrows: 1 }, { arrows: 2 }];

export const quadrilaterals: QuestionTemplate = {
  id: 'quadrilaterals',
  skillId: 'quadrilaterals',
  generate(rng, level) {
    if (level === 1) {
      const a = rng.chance(0.5) ? rng.int(50, 80) : rng.int(100, 130);
      const askOpp = rng.chance(0.5);
      const at = askOpp ? 'C' : 'B';
      const answer = askOpp ? a : 180 - a;
      const pts = parallelogram(a);
      const figure = fig(`Parallelogram ABCD with AB parallel to DC and AD parallel to BC. Angle DAB is ${a} degrees. Angle ${askOpp ? 'BCD' : 'ABC'} is x.`, pts, poly(['A', 'B', 'C', 'D'], PARM_SIDES), [
        { at: 'A', from: 'B', to: 'D', text: deg(a) },
        askOpp ? { at: 'C', from: 'D', to: 'B', text: 'x' } : { at: 'B', from: 'C', to: 'A', text: 'x' },
      ]);
      return numericAngle({
        prompt: `ABCD is a parallelogram with $\\hat{A} = ${a}^\\circ$. Find $x$.`,
        figure,
        answer,
        hints: [askOpp ? 'C is opposite A.' : 'B is next to A, between the parallel lines AD and BC.', askOpp ? 'Opposite angles of a parallelogram are equal.' : 'Co-interior angles add up to 180°.'],
        working: askOpp ? [`$x = \\hat{A} = ${a}^\\circ$ (opp ∠s of ∥m).`] : [`$x + ${a}^\\circ = 180^\\circ$ (co-int ∠s; AD ∥ BC).`, `$x = ${180 - a}^\\circ$.`],
        wrong: askOpp
          ? [{ n: 180 - a, code: 'parallel-angles', feedback: 'C is **opposite** A, so the angles are equal. Co-interior angles are next to each other.' }]
          : [{ n: a, code: 'parallel-angles', feedback: 'B is **next to** A, not opposite it. Adjacent angles of a parallelogram are co-interior: they add up to 180°.' }],
      });
    }
    if (level === 2) {
      const al = pickExcept(rng, 20, 70, [45]);
      const q = Math.tan(rad(al));
      const pts = [P('A', -1, 0), P('B', 0, -q), P('C', 1, 0), P('D', 0, q), P('M', 0, 0, { label: 'M' })];
      const v = rng.chance(0.5);
      const figure = fig(`Rhombus ABCD with diagonals AC and BD meeting at M. Angle MAB is ${al} degrees. ${v ? 'Angle MBA' : 'Angle DAB'} is x.`, pts, [...poly(['A', 'B', 'C', 'D'], [{ ticks: 1 }, { ticks: 1 }, { ticks: 1 }, { ticks: 1 }]), { a: 'A', b: 'C' }, { a: 'B', b: 'D' }], [
        { at: 'A', from: 'M', to: 'B', text: deg(al) },
        v ? { at: 'B', from: 'A', to: 'M', text: 'x' } : { at: 'A', from: 'B', to: 'D', text: 'x' },
      ]);
      return numericAngle({
        prompt: v ? `ABCD is a rhombus. Its diagonals meet at M, and $\\angle MAB = ${al}^\\circ$. Find $x = \\angle MBA$.` : `ABCD is a rhombus. Its diagonals meet at M, and $\\angle MAB = ${al}^\\circ$. Find $x = \\angle DAB$.`,
        figure,
        answer: v ? 90 - al : 2 * al,
        hints: v ? ['The diagonals of a rhombus meet at right angles.', 'Use the angles of triangle AMB.'] : ['In a rhombus, a diagonal bisects the angles at its ends.', 'Triangles AMB and AMD are congruent.'],
        working: v ? [`$\\angle AMB = 90^\\circ$ (diags of rhombus ⊥).`, `$x = 180^\\circ - 90^\\circ - ${al}^\\circ = ${90 - al}^\\circ$ (∠s of Δ).`] : [`AC bisects $\\hat{A}$ in a rhombus, so $\\angle MAD = ${al}^\\circ$ too.`, `$x = 2 \\times ${al}^\\circ = ${2 * al}^\\circ$.`],
        wrong: v
          ? [{ n: al, code: 'parallel-angles', feedback: 'These angles are not equal. The diagonals meet at 90°, so the two acute angles of triangle AMB add up to 90°.' }, { n: 180 - al, code: 'probable-slip', feedback: 'Triangle AMB has a right angle at M, so subtract from 90°, not 180°.' }]
          : [{ n: al, code: 'parallel-angles', feedback: 'That is only half of angle A. The diagonal bisects it, so double it.' }, { n: 90 - al, code: 'probable-slip', feedback: 'That is angle MBA. The question asks for the whole of angle A.' }],
      });
    }
    if (level === 3) {
      const a = pickExcept(rng, 55, 80, []);
      const kind = rng.pick(['opp', 'coint', 'diag', 'rhombus', 'rect'] as const);
      if (kind === 'rhombus') {
        const al = pickExcept(rng, 25, 65, [45]);
        const q = Math.tan(rad(al));
        const pts = [P('A', -1, 0), P('B', 0, -q), P('C', 1, 0), P('D', 0, q), P('M', 0, 0)];
        return reasonQuestion(rng, { prompt: 'ABCD is a rhombus with diagonals meeting at M. Which reason proves that $\\angle AMB = 90^\\circ$?', figure: fig('Rhombus ABCD with diagonals meeting at M.', pts, [...poly(['A', 'B', 'C', 'D'], [{ ticks: 1 }, { ticks: 1 }, { ticks: 1 }, { ticks: 1 }]), { a: 'A', b: 'C' }, { a: 'B', b: 'D' }]), correct: 'rhombusPerp', pool: ['rhombusPerp', 'diagsBisect', 'rectDiags', 'oppParm', 'coint'], why: 'ABCD is a rhombus, so its diagonals are perpendicular.' });
      }
      if (kind === 'rect') {
        const w = 1.2 + rng.int(0, 8) / 10;
        const pts = [P('A', 0, 0), P('B', w, 0), P('C', w, 1), P('D', 0, 1)];
        return reasonQuestion(rng, { prompt: 'ABCD is a rectangle. Which reason proves that $AC = BD$?', figure: fig('Rectangle ABCD with diagonals AC and BD.', pts, [...poly(['A', 'B', 'C', 'D']), { a: 'A', b: 'C' }, { a: 'B', b: 'D' }], [{ at: 'A', from: 'B', to: 'D', text: '', right: true }]), correct: 'rectDiags', pool: ['rectDiags', 'diagsBisect', 'oppSides', 'rhombusPerp', 'oppParm'], why: 'ABCD is a rectangle, so its diagonals are equal.' });
      }
      const pts = parallelogram(a);
      if (kind === 'diag') pts.push(P('M', (pts[0]!.x + pts[2]!.x) / 2, (pts[0]!.y + pts[2]!.y) / 2));
      const segs = [...poly(['A', 'B', 'C', 'D'], PARM_SIDES), ...(kind === 'diag' ? [{ a: 'A', b: 'C' }, { a: 'B', b: 'D' }] : [])];
      const stmt = kind === 'opp' ? '$\\hat{C} = \\hat{A}$' : kind === 'coint' ? '$\\hat{A} + \\hat{B} = 180^\\circ$' : '$AM = MC$';
      const correct: ReasonId = kind === 'opp' ? 'oppParm' : kind === 'coint' ? 'coint' : 'diagsBisect';
      return reasonQuestion(rng, {
        prompt: `ABCD is a parallelogram${kind === 'diag' ? ' with diagonals meeting at M' : ''}. Which reason proves that ${stmt}?`,
        figure: fig(`Parallelogram ABCD${kind === 'diag' ? ' with diagonals meeting at M' : ''}. Angle A is ${a} degrees.`, pts, segs, kind === 'diag' ? [] : [{ at: 'A', from: 'B', to: 'D', text: deg(a) }]),
        correct,
        pool: ['oppParm', 'coint', 'alt', 'diagsBisect', 'oppSides', 'rhombusPerp'],
        why: kind === 'opp' ? 'A and C are opposite angles of the parallelogram.' : kind === 'coint' ? 'A and B lie between the parallel lines AD and BC, on the same side of AB.' : 'M is where the diagonals of the parallelogram cross.',
      });
    }
    if (level === 4) {
      const x = rng.int(2, 9);
      const p = rng.int(2, 7);
      let r = rng.int(1, 6);
      while (r === p) r = rng.int(1, 6);
      const q = rng.int(1, 12);
      const t = p * x + q - r * x;
      const ex = (k: number, c: number) => `${k === 1 ? '' : k}x ${c < 0 ? '-' : '+'} ${Math.abs(c)}`;
      const pts = parallelogram(rng.int(55, 75));
      const wrongX = (t + q) / (p - r);
      return {
        prompt: `ABCD is a parallelogram with $AB = (${ex(p, q)})$ cm and $DC = (${ex(r, t)})$ cm. Find $x$.`,
        figure: fig(`Parallelogram ABCD. AB is ${ex(p, q)} centimetres and DC is ${ex(r, t)} centimetres.`, pts, poly(['A', 'B', 'C', 'D'], PARM_SIDES)),
        input: { kind: 'numeric', unit: '' },
        answer: exact(x),
        answerDisplay: `x = ${x}`,
        hints: ['Opposite sides of a parallelogram are equal, so AB = DC.', 'Write the equation and solve for x.'],
        solution: [`$${ex(p, q)} = ${ex(r, t)}$ (opp sides of ∥m).`, `$${p - r}x = ${t - q}$, so $x = ${x}$.`],
        misconceptions: keepNum([{ code: 'probable-slip', answer: exact(Math.round(wrongX * 100) / 100), feedback: 'Check the signs when you move terms across the equals sign.' }], x),
      };
    }
    const a = pickExcept(rng, 20, 70, [45]);
    const h = Math.tan(rad(a));
    const pts = [P('A', 0, 0), P('B', 1, 0), P('C', 1, h), P('D', 0, h), P('M', 0.5, h / 2)];
    return numericAngle({
      prompt: `ABCD is a rectangle. Its diagonals meet at M, and $\\angle MAB = ${a}^\\circ$. Find $x = \\angle AMB$.`,
      figure: fig(`Rectangle ABCD with diagonals meeting at M. Angle MAB is ${a} degrees. Angle AMB is x.`, pts, [...poly(['A', 'B', 'C', 'D']), { a: 'A', b: 'C' }, { a: 'B', b: 'D' }], [
        { at: 'A', from: 'B', to: 'M', text: deg(a) },
        { at: 'M', from: 'A', to: 'B', text: 'x' },
      ]),
      answer: 180 - 2 * a,
      hints: ['The diagonals of a rectangle are equal and bisect each other, so MA = MB.', 'Triangle AMB is isosceles.'],
      working: [`$MA = MB$ (diags of rect = and bisect), so $\\angle MBA = ${a}^\\circ$ (∠s opp = sides).`, `$x = 180^\\circ - 2 \\times ${a}^\\circ = ${180 - 2 * a}^\\circ$ (∠s of Δ).`],
      wrong: [
        { n: 180 - a, code: 'parallel-angles', feedback: 'Triangle AMB is isosceles (MA = MB), so angle MBA is also ' + a + '°. Subtract both.' },
        { n: 90 - a, code: 'probable-slip', feedback: 'That is angle MAD. Angle AMB is at the centre, between the diagonals.' },
      ],
    });
  },
};

// ---------------------------------------------------------------------------
// Grade 10: the midpoint theorem
/** Triangle ABC with BC on the x-axis; when `b` is given, the angle at B is drawn as exactly b degrees. */
function midTriangle(rng: Rng, b?: number) {
  const len = 1.6 + rng.int(0, 4) / 10;
  const ax = b === undefined ? 0.3 + rng.int(0, 10) / 10 : len * Math.cos(rad(b));
  const ay = b === undefined ? 1.4 + rng.int(0, 6) / 10 : len * Math.sin(rad(b));
  const c = 2.4;
  return [P('A', ax, ay), P('B', 0, 0), P('C', c, 0), P('D', ax / 2, ay / 2), P('E', (ax + c) / 2, ay / 2)];
}
const MID_SEGS: Seg[] = [{ a: 'A', b: 'D', ticks: 1 }, { a: 'D', b: 'B', ticks: 1 }, { a: 'A', b: 'E', ticks: 2 }, { a: 'E', b: 'C', ticks: 2 }, { a: 'B', b: 'C' }, { a: 'D', b: 'E' }];

export const midpointTheorem: QuestionTemplate = {
  id: 'midpoint-theorem',
  skillId: 'midpoint-theorem',
  generate(rng, level) {
    const bAngle = level === 2 ? rng.int(40, 80) : undefined;
    const pts = midTriangle(rng, bAngle);
    const alt = 'Triangle ABC. D is the midpoint of AB and E is the midpoint of AC. DE is drawn.';
    if (level === 1) {
      const toDE = rng.chance(0.5);
      const n = rng.int(3, 30) * (toDE ? 2 : 1);
      const ans = toDE ? n / 2 : n * 2;
      return {
        prompt: toDE ? `In $\\triangle ABC$, D and E are the midpoints of AB and AC. $BC = ${n}$ cm. Find DE.` : `In $\\triangle ABC$, D and E are the midpoints of AB and AC. $DE = ${n}$ cm. Find BC.`,
        figure: fig(`${alt} ${toDE ? `BC is ${n} centimetres.` : `DE is ${n} centimetres.`}`, pts, MID_SEGS),
        input: { kind: 'numeric', unit: 'cm' },
        answer: exact(ans),
        answerDisplay: `${ans} cm`,
        hints: ['The line joining the midpoints of two sides is half the third side.'],
        solution: [toDE ? `$DE = \\tfrac{1}{2}BC = \\tfrac{1}{2}(${n}) = ${ans}$ cm (midpt theorem).` : `$BC = 2DE = 2(${n}) = ${ans}$ cm (midpt theorem).`],
        misconceptions: keepNum([{ code: 'midpoint-ratio', answer: exact(toDE ? n * 2 : n / 2), feedback: toDE ? 'DE is the **shorter** line: it is half of BC.' : 'BC is the **longer** line: it is double DE.' }], ans),
      };
    }
    if (level === 2) {
      const b = bAngle!;
      return numericAngle({
        prompt: `In $\\triangle ABC$, D and E are the midpoints of AB and AC, and $\\hat{B} = ${b}^\\circ$. Find $x = \\angle ADE$.`,
        figure: fig(`${alt} Angle ABC is ${b} degrees. Angle ADE is x.`, pts, MID_SEGS, [{ at: 'B', from: 'C', to: 'A', text: deg(b) }, { at: 'D', from: 'E', to: 'A', text: 'x' }]),
        answer: b,
        hints: ['First: what does the midpoint theorem tell you about DE and BC?', 'DE ∥ BC, so look for corresponding angles.'],
        working: ['DE ∥ BC (midpt theorem).', `$x = \\hat{B} = ${b}^\\circ$ (corresp ∠s; DE ∥ BC).`],
        wrong: [{ n: 180 - b, code: 'parallel-angles', feedback: 'Angles ADE and ABC are corresponding angles, so they are equal, not supplementary.' }, { n: Math.round(b / 2), code: 'midpoint-ratio', feedback: 'The midpoint theorem halves the **length** of DE, not the angles.' }],
      });
    }
    if (level === 3) {
      const conv = rng.chance(0.4);
      return reasonQuestion(rng, {
        prompt: conv ? 'In $\\triangle ABC$, D is the midpoint of AB and DE ∥ BC, with E on AC. Which reason proves that $AE = EC$?' : `In $\\triangle ABC$, D and E are the midpoints of AB and AC. Which reason proves that ${rng.chance(0.5) ? '$DE \\parallel BC$' : '$DE = \\tfrac{1}{2}BC$'}?`,
        figure: fig(alt, pts, conv ? [{ a: 'A', b: 'D', ticks: 1 }, { a: 'D', b: 'B', ticks: 1 }, { a: 'A', b: 'C' }, { a: 'B', b: 'C', arrows: 1 }, { a: 'D', b: 'E', arrows: 1 }] : MID_SEGS),
        correct: conv ? 'midptConv' : 'midpt',
        pool: ['midpt', 'midptConv', 'propThm', 'corresp', 'oppSides', 'diagsBisect'],
        why: conv ? 'D is a midpoint and DE is parallel to BC, so DE bisects AC.' : 'D and E are the midpoints of two sides of the triangle.',
      });
    }
    if (level === 4) {
      const x = rng.int(2, 9);
      const p = rng.int(1, 5);
      let r = rng.int(1, 9);
      while (r === 2 * p) r = rng.int(1, 9);
      const q = rng.int(1, 9);
      const t = 2 * (p * x + q) - r * x;
      const ex = (k: number, c: number) => `${k === 1 ? '' : k}x ${c < 0 ? '-' : '+'} ${Math.abs(c)}`;
      return {
        prompt: `In $\\triangle ABC$, D and E are the midpoints of AB and AC. $DE = ${ex(p, q)}$ and $BC = ${ex(r, t)}$. Find $x$.`,
        figure: fig(`${alt} DE is ${ex(p, q)} and BC is ${ex(r, t)}.`, pts, MID_SEGS),
        input: { kind: 'numeric', unit: '' },
        answer: exact(x),
        answerDisplay: `x = ${x}`,
        hints: ['BC = 2 × DE (midpt theorem).', `So $${ex(r, t)} = 2(${ex(p, q)})$.`],
        solution: [`$BC = 2DE$ (midpt theorem): $${ex(r, t)} = ${ex(2 * p, 2 * q)}$.`, `$${r - 2 * p}x = ${2 * q - t}$, so $x = ${x}$.`],
        misconceptions: keepNum([{ code: 'midpoint-ratio', answer: exact(Math.round(((q - t) / (r - p)) * 100) / 100), feedback: 'DE and BC are not equal: BC is **double** DE.' }], x),
      };
    }
    const [a, b, c] = rng.pick([[6, 8, 10], [5, 12, 13], [7, 9, 12], [8, 10, 14], [9, 12, 15], [10, 14, 18], [6, 10, 12], [11, 13, 16]] as const);
    const per = (a + b + c) / 2;
    return {
      prompt: `$\\triangle ABC$ has sides $AB = ${a}$ cm, $BC = ${b}$ cm and $AC = ${c}$ cm. D, E and F are the midpoints of AB, AC and BC. Find the perimeter of $\\triangle DEF$.`,
      figure: fig(`Triangle ABC with sides ${a}, ${b} and ${c} centimetres. D, E and F are the midpoints of AB, AC and BC, joined to form triangle DEF.`, [...pts, P('F', 1.2, 0)], [...MID_SEGS, { a: 'D', b: 'F' }, { a: 'E', b: 'F' }]),
      input: { kind: 'numeric', unit: 'cm' },
      answer: exact(per),
      answerDisplay: `${per} cm`,
      hints: ['Each side of triangle DEF joins two midpoints, so it is half of one side of triangle ABC.'],
      solution: [`$DE = \\tfrac{1}{2}BC$, $DF = \\tfrac{1}{2}AC$, $EF = \\tfrac{1}{2}AB$ (midpt theorem).`, `Perimeter $= \\tfrac{1}{2}(${a} + ${b} + ${c}) = ${per}$ cm.`],
      misconceptions: keepNum([{ code: 'midpoint-ratio', answer: exact(a + b + c), feedback: 'Each side of DEF is **half** a side of ABC, so the perimeter is half too.' }], per),
    };
  },
};

// ---------------------------------------------------------------------------
// Grade 11: circle theorems 1–4 (centre, chords, same segment, semicircle)
const O = () => P('O', 0, 0, { dot: true });
const CIRCLE = [{ c: 'O', r: 1 }];
const TRIPLES = [[5, 3, 4], [10, 6, 8], [13, 5, 12], [17, 8, 15], [25, 7, 24], [15, 9, 12], [26, 10, 24], [20, 12, 16], [29, 20, 21], [41, 9, 40]] as const;

export const circleTheorems: QuestionTemplate = {
  id: 'circle-theorems',
  skillId: 'circle-theorems',
  generate(rng, level) {
    if (level === 1) {
      const a = rng.int(25, 80);
      const base = rng.int(-120, -60);
      const A = onC('A', base - a);
      const B = onC('B', base + a);
      const C = onC('C', base + 180 + rng.int(-30, 30));
      const askC = rng.chance(0.5);
      return numericAngle({
        prompt: askC ? `O is the centre of the circle and $\\angle AOB = ${2 * a}^\\circ$. Find $x = \\angle ACB$.` : `O is the centre of the circle and $\\angle ACB = ${a}^\\circ$. Find $x = \\angle AOB$.`,
        figure: fig(`Circle with centre O. A, B and C are on the circle. Angle AOB ${askC ? `is ${2 * a} degrees` : 'is x'}; angle ACB ${askC ? 'is x' : `is ${a} degrees`}.`, [O(), A, B, C], [{ a: 'O', b: 'A' }, { a: 'O', b: 'B' }, { a: 'C', b: 'A' }, { a: 'C', b: 'B' }], [{ at: 'O', from: 'A', to: 'B', text: askC ? deg(2 * a) : 'x' }, { at: 'C', from: 'A', to: 'B', text: askC ? 'x' : deg(a) }], CIRCLE),
        answer: askC ? a : 2 * a,
        hints: ['Both angles stand on the same arc AB.', 'The angle at the centre is double the angle at the circumference.'],
        working: [askC ? `$x = \\tfrac{1}{2} \\times ${2 * a}^\\circ = ${a}^\\circ$ (∠ at centre = 2 × ∠ at circumference).` : `$x = 2 \\times ${a}^\\circ = ${2 * a}^\\circ$ (∠ at centre = 2 × ∠ at circumference).`],
        wrong: askC
          ? [{ n: 4 * a, code: 'circle-theorem', feedback: 'The centre angle is the **bigger** one: halve it to get the angle at the circle.' }, { n: 2 * a, code: 'circle-theorem', feedback: 'These angles are not equal. The angle at the circle is half the angle at the centre.' }]
          : [{ n: a / 2, code: 'circle-theorem', feedback: 'The angle at the centre is **double** the angle at the circle, not half.' }, { n: a, code: 'circle-theorem', feedback: 'These angles are not equal. The centre angle is double.' }],
      });
    }
    if (level === 2) {
      const a = pickExcept(rng, 20, 70, [45]);
      const A = onC('A', 180);
      const B = onC('B', 0);
      const C = onC('C', 2 * a);
      return numericAngle({
        prompt: `AB is a diameter of the circle with centre O, and C is on the circle. $\\angle CAB = ${a}^\\circ$. Find $x = \\angle CBA$.`,
        figure: fig(`Circle with centre O. AB is a diameter. C is on the circle. Angle CAB is ${a} degrees and angle CBA is x.`, [O(), A, B, C], [{ a: 'A', b: 'B' }, { a: 'A', b: 'C' }, { a: 'B', b: 'C' }], [{ at: 'A', from: 'B', to: 'C', text: deg(a) }, { at: 'B', from: 'C', to: 'A', text: 'x' }], CIRCLE),
        answer: 90 - a,
        hints: ['What is the angle at C?', 'An angle in a semicircle is 90°.'],
        working: [`$\\hat{C} = 90^\\circ$ (∠ in semi-circle).`, `$x = 180^\\circ - 90^\\circ - ${a}^\\circ = ${90 - a}^\\circ$ (∠s of Δ).`],
        wrong: [{ n: 180 - a, code: 'circle-theorem', feedback: 'Angle C is 90° because AB is a diameter. Subtract it too.' }, { n: a, code: 'circle-theorem', feedback: 'The two acute angles add up to 90°, so they are equal only when both are 45°.' }],
      });
    }
    if (level === 3) {
      const a = rng.int(25, 75);
      const base = rng.int(-120, -60);
      const A = onC('A', base - a);
      const B = onC('B', base + a);
      const sp = rng.int(25, 45);
      const C = onC('C', base + 180 - sp);
      const D = onC('D', base + 180 + sp);
      const fromCentre = rng.chance(0.4);
      const pts = fromCentre ? [O(), A, B, D] : [A, B, C, D];
      const segs: Seg[] = fromCentre ? [{ a: 'O', b: 'A' }, { a: 'O', b: 'B' }, { a: 'D', b: 'A' }, { a: 'D', b: 'B' }] : [{ a: 'C', b: 'A' }, { a: 'C', b: 'B' }, { a: 'D', b: 'A' }, { a: 'D', b: 'B' }, { a: 'A', b: 'B' }];
      return numericAngle({
        prompt: fromCentre ? `O is the centre and $\\angle AOB = ${2 * a}^\\circ$. D is on the major arc. Find $x = \\angle ADB$.` : `A, B, C and D lie on the circle, with C and D on the same side of AB. $\\angle ACB = ${a}^\\circ$. Find $x = \\angle ADB$.`,
        figure: fig(fromCentre ? `Circle with centre O. Angle AOB is ${2 * a} degrees. D is on the major arc; angle ADB is x.` : `A, B, C and D on a circle; C and D on the same side of chord AB. Angle ACB is ${a} degrees; angle ADB is x.`, [...(fromCentre ? [] : [P('O', 0, 0, { label: '' })]), ...pts], segs, [fromCentre ? { at: 'O', from: 'A', to: 'B', text: deg(2 * a) } : { at: 'C', from: 'A', to: 'B', text: deg(a) }, { at: 'D', from: 'A', to: 'B', text: 'x' }], CIRCLE),
        answer: a,
        hints: fromCentre ? ['Angle ADB is at the circumference, on the same arc as the centre angle.'] : ['Both angles stand on chord AB, on the same side of it.'],
        working: [fromCentre ? `$x = \\tfrac{1}{2} \\times ${2 * a}^\\circ = ${a}^\\circ$ (∠ at centre = 2 × ∠ at circumference).` : `$x = \\angle ACB = ${a}^\\circ$ (∠s in the same seg).`],
        wrong: [{ n: 2 * a, code: 'circle-theorem', feedback: fromCentre ? 'Halve the centre angle to get the angle at the circle.' : 'Angles in the same segment are **equal**.' }, { n: 180 - a, code: 'circle-theorem', feedback: 'C and D are on the same side of AB, so the angles are equal. Supplementary angles come from a cyclic quadrilateral.' }],
      });
    }
    if (level === 4) {
      const [r, d, h] = rng.pick(TRIPLES);
      const askChord = rng.chance(0.6);
      const k = 1 / r;
      const pts = [O(), P('A', -h * k, -d * k), P('B', h * k, -d * k), P('M', 0, -d * k)];
      return {
        prompt: askChord ? `O is the centre of a circle with radius ${r} cm. OM ⊥ AB with M on chord AB, and $OM = ${d}$ cm. Find the length of AB.` : `O is the centre of a circle with radius ${r} cm. The chord $AB = ${2 * h}$ cm and OM ⊥ AB with M on AB. Find OM.`,
        figure: fig(`Circle with centre O and radius ${r} centimetres. Chord AB with M on it; OM is perpendicular to AB. ${askChord ? `OM is ${d} centimetres.` : `AB is ${2 * h} centimetres.`}`, pts, [{ a: 'A', b: 'B' }, { a: 'O', b: 'M' }, { a: 'O', b: 'A' }], [{ at: 'M', from: 'O', to: 'B', text: '', right: true }], [{ c: 'O', r: 1 }]),
        input: { kind: 'numeric', unit: 'cm' },
        answer: exact(askChord ? 2 * h : d),
        answerDisplay: `${askChord ? 2 * h : d} cm`,
        hints: ['A line from the centre perpendicular to a chord bisects it, so AM = MB.', 'Use Pythagoras in triangle OMA: OA is the radius.'],
        solution: askChord
          ? [`$AM^2 = OA^2 - OM^2 = ${r}^2 - ${d}^2 = ${h * h}$, so $AM = ${h}$ (Pythagoras).`, `$AB = 2AM = ${2 * h}$ cm (line from centre ⊥ to chord).`]
          : [`$AM = \\tfrac{1}{2}AB = ${h}$ cm (line from centre ⊥ to chord).`, `$OM^2 = ${r}^2 - ${h}^2 = ${d * d}$, so $OM = ${d}$ cm (Pythagoras).`],
        misconceptions: keepNum(askChord ? [{ code: 'circle-theorem', answer: exact(h), feedback: 'That is AM, half the chord. OM bisects AB, so double it.' }, { code: 'probable-slip', answer: exact(r - d), feedback: 'Lengths in a right-angled triangle need Pythagoras, not subtraction.' }] : [{ code: 'probable-slip', answer: exact(r - h), feedback: 'Use Pythagoras in triangle OMA, with half the chord: OM bisects AB.' }, { code: 'circle-theorem', answer: exact(2 * h), feedback: 'That is the chord. OM is the distance from the centre to the chord.' }], askChord ? 2 * h : d),
      };
    }
    const kind = rng.pick(['centre', 'semi', 'sameSeg', 'perpChord'] as const);
    const t = rng.int(-20, 20);
    if (kind === 'perpChord') {
      const pts = [O(), onC('A', 210 + t), onC('B', 330 + t)];
      pts.push(P('M', (pts[1]!.x + pts[2]!.x) / 2, (pts[1]!.y + pts[2]!.y) / 2));
      return reasonQuestion(rng, { prompt: 'O is the centre and OM ⊥ AB. Which reason proves that $AM = MB$?', figure: fig('Circle with centre O, chord AB, and OM perpendicular to AB at M.', pts, [{ a: 'A', b: 'B' }, { a: 'O', b: 'M' }], [{ at: 'M', from: 'O', to: 'B', text: '', right: true }], CIRCLE), correct: 'perpChord', pool: ['perpChord', 'centre', 'semi', 'sameSeg', 'tanRadius', 'midpt'], why: 'OM is drawn from the centre, perpendicular to the chord AB.' });
    }
    if (kind === 'semi') {
      const pts = [O(), onC('A', 180), onC('B', 0), onC('C', 70 + t)];
      return reasonQuestion(rng, { prompt: 'AB is a diameter of the circle with centre O. Which reason proves that $\\angle ACB = 90^\\circ$?', figure: fig('Circle with centre O. AB is a diameter and C is on the circle.', pts, [{ a: 'A', b: 'B' }, { a: 'A', b: 'C' }, { a: 'B', b: 'C' }], [], CIRCLE), correct: 'semi', pool: ['semi', 'centre', 'sameSeg', 'tanRadius', 'oppCyclic'], why: 'AB is a diameter, so the angle it subtends at the circle is a right angle.' });
    }
    const A = onC('A', -150 + t);
    const B = onC('B', -30 + t);
    if (kind === 'centre') {
      return reasonQuestion(rng, { prompt: 'O is the centre of the circle. Which reason proves that $\\angle AOB = 2\\angle ACB$?', figure: fig('Circle with centre O. A, B and C are on the circle; OA, OB, CA and CB are drawn.', [O(), A, B, onC('C', 90 + t)], [{ a: 'O', b: 'A' }, { a: 'O', b: 'B' }, { a: 'C', b: 'A' }, { a: 'C', b: 'B' }], [], CIRCLE), correct: 'centre', pool: ['centre', 'sameSeg', 'semi', 'oppCyclic', 'tanChord'], why: 'Both angles stand on arc AB: one at the centre, one at the circle.' });
    }
    return reasonQuestion(rng, { prompt: 'C and D lie on the circle on the same side of AB. Which reason proves that $\\angle ACB = \\angle ADB$?', figure: fig('A, B, C and D on a circle; C and D on the same side of chord AB.', [P('O', 0, 0, { label: '' }), A, B, onC('C', 65 + t), onC('D', 120 + t)], [{ a: 'C', b: 'A' }, { a: 'C', b: 'B' }, { a: 'D', b: 'A' }, { a: 'D', b: 'B' }], [], CIRCLE), correct: 'sameSeg', pool: ['sameSeg', 'centre', 'oppCyclic', 'extCyclic', 'tanChord'], why: 'Both angles stand on chord AB, on the same side of it.' });
  },
};

// ---------------------------------------------------------------------------
// Grade 11: cyclic quadrilaterals and tangents (theorems 5–7, tan ⊥ radius)
export const cyclicTangents: QuestionTemplate = {
  id: 'cyclic-tangents',
  skillId: 'cyclic-tangents',
  generate(rng, level) {
    if (level === 1 || level === 2) {
      // Positions in degrees around the circle; the angle at A is half the arc BCD it stands on, so keep that arc even.
      const pB = rng.int(285, 325);
      let pD = rng.int(100, 170);
      if ((pD - pB) % 2 !== 0) pD += 1;
      const pC = rng.int(20, pD - 40);
      const pA = rng.int(pD + 40, pB - 40);
      const [A, B, C, D] = [onC('A', pA), onC('B', pB), onC('C', pC), onC('D', pD)];
      const a = (pD - pB + 360) / 2;
      const ext = level === 2;
      const E = P('E', C.x + (C.x - B.x) * 0.55, C.y + (C.y - B.y) * 0.55);
      return numericAngle({
        prompt: ext ? `ABCD is a cyclic quadrilateral and BC is extended to E. $\\hat{A} = ${a}^\\circ$. Find $x = \\angle DCE$.` : `ABCD is a cyclic quadrilateral with $\\hat{A} = ${a}^\\circ$. Find $x = \\angle BCD$.`,
        figure: fig(`Cyclic quadrilateral ABCD. Angle A is ${a} degrees. ${ext ? 'BC is extended to E; angle DCE is x.' : 'Angle BCD is x.'}`, [P('O', 0, 0, { label: '' }), A, B, C, D, ...(ext ? [E] : [])], [...poly(['A', 'B', 'C', 'D']), ...(ext ? [{ a: 'C', b: 'E' }] : [])], [{ at: 'A', from: 'B', to: 'D', text: deg(a) }, ext ? { at: 'C', from: 'D', to: 'E', text: 'x' } : { at: 'C', from: 'D', to: 'B', text: 'x' }], CIRCLE),
        answer: ext ? a : 180 - a,
        hints: ext ? ['Angle DCE is outside the quadrilateral, next to angle BCD.', 'The exterior angle of a cyclic quad equals the interior opposite angle.'] : ['A and C are opposite angles of a cyclic quadrilateral.'],
        working: ext ? [`$x = \\hat{A} = ${a}^\\circ$ (ext ∠ of cyclic quad).`] : [`$x = 180^\\circ - ${a}^\\circ = ${180 - a}^\\circ$ (opp ∠s of cyclic quad).`],
        wrong: ext
          ? [{ n: 180 - a, code: 'circle-theorem', feedback: `That is angle BCD inside the quad. Angle DCE is next to it on the straight line, so it equals ${a}°.` }]
          : [{ n: a, code: 'circle-theorem', feedback: 'Opposite angles of a cyclic quadrilateral are **supplementary** (add to 180°), not equal. Equal opposite angles belong to a parallelogram.' }, { n: 360 - a, code: 'probable-slip', feedback: 'Opposite angles add up to 180°, not 360°.' }],
      });
    }
    if (level === 3) {
      // 40°–80°: P stays far enough from the circle for the diagram to read clearly.
      const p = 2 * rng.int(20, 40);
      const half = (180 - p) / 2;
      const th = 90 - p / 2;
      const d = 1 / Math.cos(rad(th));
      const askBase = rng.chance(0.6);
      const pts = [askBase ? P('O', 0, 0, { label: '' }) : O(), P('P', d, 0), onC('A', th), onC('B', -th)];
      return numericAngle({
        prompt: askBase ? `PA and PB are tangents to the circle at A and B, and $\\angle APB = ${p}^\\circ$. Find $x = \\angle PAB$.` : `PA and PB are tangents to the circle with centre O, touching it at A and B. $\\angle APB = ${p}^\\circ$. Find $x = \\angle AOB$.`,
        figure: fig(`Circle${askBase ? '' : ' with centre O'}. PA and PB are tangents from P. Angle APB is ${p} degrees. ${askBase ? 'AB is drawn; angle PAB is x.' : 'OA and OB are drawn; angle AOB is x.'}`, pts, [{ a: 'P', b: 'A' }, { a: 'P', b: 'B' }, ...(askBase ? [{ a: 'A', b: 'B' }] : [{ a: 'O', b: 'A' }, { a: 'O', b: 'B' }])], [{ at: 'P', from: 'A', to: 'B', text: deg(p) }, askBase ? { at: 'A', from: 'P', to: 'B', text: 'x' } : { at: 'O', from: 'A', to: 'B', text: 'x' }], CIRCLE),
        answer: askBase ? half : 180 - p,
        hints: askBase ? ['Tangents from the same point are equal: PA = PB.', 'So triangle PAB is isosceles.'] : ['Each tangent is perpendicular to its radius.', 'The angles of quadrilateral OAPB add up to 360°.'],
        working: askBase ? [`PA = PB (tans from common pt), so $\\angle PAB = \\angle PBA$ (∠s opp = sides).`, `$x = \\tfrac{1}{2}(180^\\circ - ${p}^\\circ) = ${half}^\\circ$ (∠s of Δ).`] : [`$\\angle OAP = \\angle OBP = 90^\\circ$ (tan ⊥ radius).`, `$x = 360^\\circ - 90^\\circ - 90^\\circ - ${p}^\\circ = ${180 - p}^\\circ$ (∠s of quad).`],
        wrong: askBase
          ? [{ n: 180 - p, code: 'circle-theorem', feedback: 'Triangle PAB has two equal base angles. Share the remaining angle between them.' }, { n: p, code: 'circle-theorem', feedback: 'The base angles are equal to each other, not to the angle at P.' }]
          : [{ n: p, code: 'circle-theorem', feedback: 'The radius meets each tangent at 90°, so in OAPB, the angles at O and P add up to 180°.' }, { n: 360 - p, code: 'circle-theorem', feedback: 'Remember the two right angles at A and B.' }],
      });
    }
    if (level === 4) {
      const t = pickExcept(rng, 25, 80, [45]);
      const pts = [P('O', 0, 0, { label: '' }), onC('A', 270), onC('B', 2 * t - 90), onC('C', t + 90 + rng.int(-15, 15)), P('S', -1.1, -1), P('T', 1.1, -1)];
      return numericAngle({
        prompt: `ST is a tangent to the circle at A. AB is a chord, and C is on the circle. $\\angle TAB = ${t}^\\circ$. Find $x = \\angle ACB$.`,
        figure: fig(`Circle with tangent ST touching it at A. Chord AB makes an angle of ${t} degrees with AT. C is on the circle on the other side of AB; angle ACB is x.`, pts, [{ a: 'S', b: 'T' }, { a: 'A', b: 'B' }, { a: 'C', b: 'A' }, { a: 'C', b: 'B' }], [{ at: 'A', from: 'T', to: 'B', text: deg(t) }, { at: 'C', from: 'A', to: 'B', text: 'x' }], CIRCLE),
        answer: t,
        hints: ['Look for the angle between a tangent and a chord.', 'It equals the angle in the alternate segment: on the other side of the chord.'],
        working: [`$x = \\angle TAB = ${t}^\\circ$ (tan chord theorem).`],
        wrong: [{ n: 90 - t, code: 'circle-theorem', feedback: "The tangent–chord angle equals the angle in the alternate segment. You don't need the radius here." }, { n: 2 * t, code: 'circle-theorem', feedback: 'Nothing doubles here: that only happens at the centre.' }, { n: 180 - t, code: 'circle-theorem', feedback: 'The angles are equal, not supplementary.' }],
      });
    }
    const kind = rng.pick(['opp', 'ext', 'tans', 'tanChord', 'tanRad'] as const);
    const t = rng.int(-15, 15);
    if (kind === 'opp' || kind === 'ext') {
      const pts = [P('O', 0, 0, { label: '' }), onC('A', 215 + t), onC('B', 310 + t), onC('C', 40 + t), onC('D', 130 + t)];
      if (kind === 'ext') pts.push(P('E', pts[3]!.x + (pts[3]!.x - pts[2]!.x) * 0.5, pts[3]!.y + (pts[3]!.y - pts[2]!.y) * 0.5));
      return reasonQuestion(rng, { prompt: kind === 'opp' ? 'ABCD is a cyclic quadrilateral. Which reason proves that $\\hat{A} + \\hat{C} = 180^\\circ$?' : 'ABCD is a cyclic quadrilateral and BC is extended to E. Which reason proves that $\\angle DCE = \\hat{A}$?', figure: fig(`Cyclic quadrilateral ABCD${kind === 'ext' ? ' with BC extended to E' : ''}.`, pts, [...poly(['A', 'B', 'C', 'D']), ...(kind === 'ext' ? [{ a: 'C', b: 'E' }] : [])], [], CIRCLE), correct: kind === 'opp' ? 'oppCyclic' : 'extCyclic', pool: ['oppCyclic', 'extCyclic', 'sameSeg', 'oppParm', 'centre', 'coint'], why: kind === 'opp' ? 'A and C are opposite angles of a quadrilateral whose vertices all lie on the circle.' : 'Angle DCE is the exterior angle at C; A is the interior opposite angle.' });
    }
    if (kind === 'tans' || kind === 'tanRad') {
      const th = 50 + t;
      const d = 1 / Math.cos(rad(th));
      const pts = [O(), P('P', d, 0), onC('A', th), onC('B', -th)];
      return reasonQuestion(rng, { prompt: kind === 'tans' ? 'PA and PB are tangents to the circle at A and B. Which reason proves that $PA = PB$?' : 'PA is a tangent to the circle with centre O at A. Which reason proves that $\\angle OAP = 90^\\circ$?', figure: fig('Circle with centre O. Tangents from P touch the circle at A and B.', pts, [{ a: 'P', b: 'A' }, { a: 'P', b: 'B' }, { a: 'O', b: 'A' }, ...(kind === 'tans' ? [{ a: 'O', b: 'B' }] : [])], [], CIRCLE), correct: kind === 'tans' ? 'tansCommon' : 'tanRadius', pool: ['tansCommon', 'tanRadius', 'tanChord', 'perpChord', 'semi'], why: kind === 'tans' ? 'Both lines are tangents drawn from the same point P.' : 'OA is a radius and PA is the tangent at A.' });
    }
    const tt = 55 + t;
    return reasonQuestion(rng, { prompt: 'ST is a tangent to the circle at A, and C is on the circle. Which reason proves that $\\angle TAB = \\angle ACB$?', figure: fig('Circle with tangent ST at A, chord AB, and C on the circle.', [P('O', 0, 0, { label: '' }), onC('A', 270), onC('B', 2 * tt - 90), onC('C', tt + 90), P('S', -1.1, -1), P('T', 1.1, -1)], [{ a: 'S', b: 'T' }, { a: 'A', b: 'B' }, { a: 'C', b: 'A' }, { a: 'C', b: 'B' }], [], CIRCLE), correct: 'tanChord', pool: ['tanChord', 'sameSeg', 'tanRadius', 'centre', 'alt'], why: 'Angle TAB is between the tangent and the chord AB; angle ACB is in the alternate segment.' });
  },
};

// ---------------------------------------------------------------------------
// Grade 12: proportionality and similarity
function propTriangle(t: number) {
  const A = P('A', 0.9, 2);
  const B = P('B', 0, 0);
  const C = P('C', 2.6, 0);
  return [A, B, C, P('D', A.x + (B.x - A.x) * t, A.y + (B.y - A.y) * t), P('E', A.x + (C.x - A.x) * t, A.y + (C.y - A.y) * t)];
}
const PROP_SEGS: Seg[] = [{ a: 'A', b: 'B' }, { a: 'A', b: 'C' }, { a: 'B', b: 'C', arrows: 1 }, { a: 'D', b: 'E', arrows: 1 }];
const fr = (v: number) => String(v).replace('.', ',');
const tfr = (v: number) => String(v).replace('.', '{,}');

export const proportionality: QuestionTemplate = {
  id: 'proportionality',
  skillId: 'proportionality',
  generate(rng, level) {
    if (level === 1) {
      const [a, b] = rng.pick([[2, 3], [3, 2], [3, 4], [4, 5], [2, 5], [5, 3], [4, 3], [3, 5], [5, 2], [1, 2]] as const);
      const s = rng.pick([1, 1.5, 2, 3, 2.5]);
      const AE = a * s;
      const EC = b * s;
      return {
        prompt: `In $\\triangle ABC$, DE ∥ BC with D on AB and E on AC. $AD = ${a}$ cm, $DB = ${b}$ cm and $AE = ${fr(AE)}$ cm. Find EC.`,
        figure: fig(`Triangle ABC with DE parallel to BC. AD is ${a}, DB is ${b} and AE is ${fr(AE)} centimetres.`, propTriangle(a / (a + b)), PROP_SEGS),
        input: { kind: 'numeric', unit: 'cm' },
        answer: exact(EC),
        answerDisplay: `${fr(EC)} cm`,
        hints: ['DE ∥ BC, so it divides AB and AC in the same ratio.', '$\\frac{AD}{DB} = \\frac{AE}{EC}$'],
        solution: [`$\\frac{AD}{DB} = \\frac{AE}{EC}$ (line ∥ one side of Δ).`, `$\\frac{${a}}{${b}} = \\frac{${tfr(AE)}}{EC}$, so $EC = ${tfr(EC)}$ cm.`],
        misconceptions: keepNum([
          { code: 'proportion-ratio', answer: exact(Math.round(((AE * a) / b) * 100) / 100), feedback: 'The ratio is upside down. Match AD with AE (the top parts) and DB with EC (the bottom parts).' },
          { code: 'proportion-ratio', answer: exact(AE + (b - a)), feedback: "Ratios multiply, they don't add. Use AD : DB = AE : EC." },
        ], EC),
      };
    }
    if (level === 2) {
      const [m, n] = rng.pick([[1, 2], [2, 3], [3, 2], [1, 3], [3, 4], [2, 5], [4, 1], [3, 5]] as const);
      const L = (m + n) * rng.int(2, 6);
      const AE = (L * m) / (m + n);
      return {
        prompt: `In $\\triangle ABC$, DE ∥ BC with D on AB and E on AC. $AD : DB = ${m} : ${n}$ and $AC = ${L}$ cm. Find AE.`,
        figure: fig(`Triangle ABC with DE parallel to BC. AD to DB is ${m} to ${n}. AC is ${L} centimetres.`, propTriangle(m / (m + n)), PROP_SEGS),
        input: { kind: 'numeric', unit: 'cm' },
        answer: exact(AE),
        answerDisplay: `${AE} cm`,
        hints: [`AE : EC = ${m} : ${n} too, so AC is ${m + n} equal parts.`],
        solution: [`AE : EC = AD : DB = ${m} : ${n} (line ∥ one side of Δ).`, `$AE = \\frac{${m}}{${m + n}} \\times ${L} = ${AE}$ cm.`],
        misconceptions: keepNum([
          { code: 'proportion-ratio', answer: exact(Math.round(((L * m) / n) * 100) / 100), feedback: `AC is the whole side: ${m} + ${n} = ${m + n} parts, not ${n}.` },
          { code: 'proportion-ratio', answer: exact((L * n) / (m + n)), feedback: 'That is EC. AE is the part next to A.' },
        ], AE),
      };
    }
    if (level === 3) {
      const k = rng.pick([1.5, 2, 2.5, 3, 0.5]);
      const [p, q] = rng.pick([[4, 6], [6, 8], [4, 10], [8, 12], [6, 10], [10, 14], [12, 16], [8, 6]] as const);
      const r = p * k;
      const ans = q * k;
      const g = 0.45 + 0.35 * Math.min(k, 2);
      const tri = [P('A', 0.6, 1.4), P('B', 0, 0), P('C', 2, 0), P('E', 3.5 + 0.6 * g, 1.4 * g), P('D', 3.5, 0), P('F', 3.5 + 2 * g, 0)];
      return {
        prompt: `$\\triangle ABC ||| \\triangle EDF$, with $\\hat{A} = \\hat{E}$, $\\hat{B} = \\hat{D}$ and $\\hat{C} = \\hat{F}$. $AB = ${p}$, $BC = ${q}$ and $ED = ${fr(r)}$. Find DF.`,
        figure: fig(`Two similar triangles ABC and EDF, with angle A equal to angle E, B to D, and C to F. AB is ${p}, BC is ${q}, ED is ${fr(r)}.`, tri, [...poly(['A', 'B', 'C']), ...poly(['E', 'D', 'F'])]),
        input: { kind: 'numeric', unit: '' },
        answer: exact(ans),
        answerDisplay: fr(ans),
        hints: ['Match corresponding sides: AB ↔ ED and BC ↔ DF.', '$\\frac{DF}{BC} = \\frac{ED}{AB}$'],
        solution: [`$\\frac{DF}{BC} = \\frac{ED}{AB}$ (|||Δs).`, `$DF = ${q} \\times \\frac{${tfr(r)}}{${p}} = ${tfr(ans)}$.`],
        misconceptions: keepNum([
          { code: 'proportion-ratio', answer: exact(Math.round(((q * p) / r) * 100) / 100), feedback: 'The scale factor is upside down: ED matches AB, so multiply BC by ED/AB.' },
          { code: 'proportion-ratio', answer: exact(q + (r - p)), feedback: "Similar triangles are enlargements: multiply by the scale factor, don't add the difference." },
        ], ans),
      };
    }
    if (level === 4) {
      const kind = rng.pick(['prop', 'equi', 'sides', 'mid'] as const);
      const t = 0.3 + rng.int(0, 4) / 10;
      const stmt = kind === 'prop' ? '$\\frac{AD}{DB} = \\frac{AE}{EC}$' : kind === 'equi' ? '$\\triangle ADE ||| \\triangle ABC$' : kind === 'sides' ? '$\\frac{DE}{BC} = \\frac{AD}{AB}$, given that $\\triangle ADE ||| \\triangle ABC$' : '$DE = \\tfrac{1}{2}BC$, given that D and E are the midpoints of AB and AC';
      const correct: ReasonId = kind === 'prop' ? 'propThm' : kind === 'equi' ? 'equiangular' : kind === 'sides' ? 'similar' : 'midpt';
      return reasonQuestion(rng, {
        prompt: `In $\\triangle ABC$, DE ∥ BC. Which reason proves that ${stmt}?`,
        figure: fig('Triangle ABC with D on AB and E on AC, and DE parallel to BC.', propTriangle(kind === 'mid' ? 0.5 : t), PROP_SEGS),
        correct,
        pool: ['propThm', 'equiangular', 'similar', 'midpt', 'corresp', 'oppSides'],
        why: kind === 'prop' ? 'DE is parallel to the side BC, so it cuts the other two sides in the same ratio.' : kind === 'equi' ? 'The triangles share angle A, and the angles at D and B (and at E and C) are corresponding angles, so they are equal.' : kind === 'sides' ? 'The triangles are similar, so their corresponding sides are in proportion.' : 'D and E are the midpoints of two sides of the triangle.',
      });
    }
    const [bd, dc] = rng.pick([[4, 9], [2, 8], [1, 16], [9, 16], [4, 16], [3, 12], [5, 20], [2, 18], [1, 9], [8, 18]] as const);
    const ad = Math.sqrt(bd * dc);
    return {
      prompt: `In $\\triangle ABC$, $\\hat{A} = 90^\\circ$ and AD ⊥ BC with D on BC. $BD = ${bd}$ and $DC = ${dc}$. Find AD.`,
      figure: fig(`Right-angled triangle ABC with the right angle at A. AD is perpendicular to BC. BD is ${bd} and DC is ${dc}.`, [P('B', 0, 0), P('C', bd + dc, 0), P('A', bd, ad), P('D', bd, 0)], [...poly(['A', 'B', 'C']), { a: 'A', b: 'D' }], [{ at: 'A', from: 'B', to: 'C', text: '', right: true }, { at: 'D', from: 'C', to: 'A', text: '', right: true }]),
      input: { kind: 'numeric', unit: '' },
      answer: exact(ad),
      answerDisplay: `${ad}`,
      hints: ['$\\triangle ABD ||| \\triangle CAD$: both have a right angle, and $\\hat{B} = \\angle CAD$.', 'So $\\frac{AD}{BD} = \\frac{DC}{AD}$, which gives $AD^2 = BD \\times DC$.'],
      solution: [`$\\triangle ABD ||| \\triangle CAD$ (∠∠∠), so $\\frac{AD}{BD} = \\frac{DC}{AD}$ (|||Δs).`, `$AD^2 = ${bd} \\times ${dc} = ${bd * dc}$, so $AD = ${ad}$.`],
      misconceptions: keepNum([
        { code: 'proportion-ratio', answer: exact(bd * dc), feedback: 'That is $AD^2$. Take the square root.' },
        { code: 'proportion-ratio', answer: exact((bd + dc) / 2), feedback: 'AD is not the average of BD and DC. From the similar triangles, $AD^2 = BD \\times DC$.' },
      ], ad),
    };
  },
};
