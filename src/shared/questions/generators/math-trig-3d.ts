import type { QuestionTemplate, Misconception, GeometryFigure, AnswerSpec } from '../types.ts';
import type { MistakeCode } from '../mistakes.ts';

/**
 * Trigonometry problems in two and three dimensions (CAPS Grade 11 2D, Grade 12 2D and 3D): two triangles
 * linked by a shared side, solved one after the other. Figures are to scale; 3D figures use an oblique
 * projection, like the diagrams in exam papers.
 */

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const sin = (d: number) => Math.sin(rad(d));
const cos = (d: number) => Math.cos(rad(d));
const tan = (d: number) => Math.tan(rad(d));
const D = (a: number) => `${a}^\\circ`;
const n2 = (v: number) => v.toFixed(2).replace('.', '{,}');
const n1 = (v: number) => v.toFixed(1).replace('.', '{,}');
const r2 = (v: number) => Math.round(v * 100) / 100;
const r1 = (v: number) => Math.round(v * 10) / 10;
/** Learners round the first answer before using it, so allow 0,3%. */
const ans = (v: number): AnswerSpec => ({ kind: 'numeric', value: r2(v), tolerance: 0.003, relative: true });

function keep(ms: { code: MistakeCode; value: number | null; feedback: string }[], correct: number): Misconception[] {
  const seen = [correct];
  const out: Misconception[] = [];
  for (const m of ms) {
    if (m.value === null || !Number.isFinite(m.value) || m.value <= 0 || seen.some((s) => Math.abs(s - m.value!) <= Math.abs(s) * 0.01)) continue;
    seen.push(m.value);
    out.push({ code: m.code, answer: { kind: 'numeric', value: r2(m.value), tolerance: 0.003, relative: true }, feedback: m.feedback });
  }
  return out;
}

type P3 = { x: number; y: number; z: number };
/** Oblique projection: depth (y) goes up and to the right at 40°, shortened to 0,6. */
const proj = (p: P3) => ({ x: p.x + 0.6 * p.y * cos(40), y: p.z + 0.6 * p.y * sin(40) });

function fig3d(pts: Record<string, P3>, segs: GeometryFigure['segments'], angles: GeometryFigure['angles'], alt: string): GeometryFigure {
  return {
    kind: 'geometry',
    alt,
    points: Object.entries(pts).map(([id, p]) => {
      const q = proj(p);
      return { id, x: Math.round(q.x * 1000) / 1000, y: Math.round(q.y * 1000) / 1000 };
    }),
    segments: segs,
    angles,
  };
}

export const trig2d3d: QuestionTemplate = {
  id: 'trig-2d-3d',
  skillId: 'trig-2d-3d',
  generate(rng, level) {
    if (level === 1) {
      // Quadrilateral ABCD with diagonal BD: cosine rule in ABD, then sine rule in BCD.
      const p = rng.int(5, 14);
      const q = rng.int(5, 14);
      const A = rng.int(50, 120);
      const B2 = rng.int(35, 70);
      const C = rng.int(40, 80);
      const BD = Math.sqrt(p * p + q * q - 2 * p * q * cos(A));
      const BDC = 180 - B2 - C;
      const BC = (BD * sin(BDC)) / sin(C);
      // Coordinates: A at the origin, AB along the x-axis, C on the far side of BD.
      const Pa = { x: 0, y: 0 };
      const Pb = { x: p, y: 0 };
      const Pd = { x: q * cos(A), y: q * sin(A) };
      const ux = (Pd.x - Pb.x) / BD;
      const uy = (Pd.y - Pb.y) / BD;
      const side = Math.sign(ux * (Pa.y - Pb.y) - uy * (Pa.x - Pb.x)) || 1;
      const t = rad(-side * B2);
      const BCdir = { x: ux * Math.cos(t) - uy * Math.sin(t), y: ux * Math.sin(t) + uy * Math.cos(t) };
      const Pc = { x: Pb.x + BC * BCdir.x, y: Pb.y + BC * BCdir.y };
      return {
        prompt: `In quadrilateral $ABCD$, $AB = ${p}$ m, $AD = ${q}$ m, $\\hat{A} = ${D(A)}$, $D\\hat{B}C = ${D(B2)}$ and $\\hat{C} = ${D(C)}$. Find $BC$. Round to two decimal places.`,
        figure: {
          kind: 'geometry',
          alt: `Quadrilateral ABCD with diagonal BD. AB = ${p} m, AD = ${q} m, angle A = ${A} degrees, angle DBC = ${B2} degrees, angle C = ${C} degrees. BC is unknown.`,
          points: [
            { id: 'A', ...Pa },
            { id: 'B', ...Pb },
            { id: 'C', x: Math.round(Pc.x * 1000) / 1000, y: Math.round(Pc.y * 1000) / 1000 },
            { id: 'D', x: Math.round(Pd.x * 1000) / 1000, y: Math.round(Pd.y * 1000) / 1000 },
          ],
          segments: [
            { a: 'A', b: 'B', text: `${p} m` },
            { a: 'A', b: 'D', text: `${q} m` },
            { a: 'B', b: 'C', text: '?' },
            { a: 'C', b: 'D' },
            { a: 'B', b: 'D', dashed: true },
          ],
          angles: [
            { at: 'A', from: 'B', to: 'D', text: `${A}°` },
            { at: 'B', from: 'D', to: 'C', text: `${B2}°` },
            { at: 'C', from: 'B', to: 'D', text: `${C}°` },
          ],
        },
        input: { kind: 'numeric', prefix: 'BC =', unit: 'm' },
        answer: ans(BC),
        answerDisplay: `$BC = ${n2(BC)}$ m`,
        hints: ['Work in two triangles. BD is shared: find it first in triangle ABD.', `In triangle ABD use the cosine rule. Then in triangle BCD, $B\\hat{D}C = 180^\\circ - ${D(B2)} - ${D(C)}$, and use the sine rule.`],
        solution: [
          `In $\\triangle ABD$: $BD^2 = ${p}^2 + ${q}^2 - 2(${p})(${q})\\cos ${D(A)}$, so $BD = ${n2(BD)}$ m.`,
          `In $\\triangle BCD$: $B\\hat{D}C = 180^\\circ - ${D(B2)} - ${D(C)} = ${D(BDC)}$.`,
          `$\\dfrac{BC}{\\sin ${D(BDC)}} = \\dfrac{BD}{\\sin ${D(C)}}$, so $BC = \\dfrac{${n2(BD)}\\sin ${D(BDC)}}{\\sin ${D(C)}} = ${n2(BC)}$ m.`,
        ],
        misconceptions: keep(
          [
            { code: 'sine-rule', value: (BD * sin(B2)) / sin(C), feedback: `Pair BC with the angle **opposite** it in triangle BCD: that is $B\\hat{D}C = ${D(BDC)}$, not $${D(B2)}$.` },
            { code: 'cosine-rule', value: Math.sqrt(p * p + q * q + 2 * p * q * cos(A)) * sin(BDC) / sin(C), feedback: 'Check BD first: $BD^2 = AB^2 + AD^2 \\mathbf{-} 2(AB)(AD)\\cos A$.' },
            { code: 'sine-rule', value: (BD * sin(C)) / sin(BDC), feedback: 'The sine rule is upside down: $BC = \\dfrac{BD\\sin B\\hat{D}C}{\\sin C}$.' },
          ],
          r2(BC),
        ),
      };
    }
    if (level === 2) {
      // Angles of elevation from two points in line with the foot of a tower.
      let a: number, b: number;
      do {
        a = rng.int(18, 40);
        b = rng.int(a + 10, 70);
      } while (b - a > 40);
      const d = rng.int(20, 90);
      const BT = (d * sin(a)) / sin(b - a);
      const h = BT * sin(b);
      const F = h / tan(b);
      const pts = { A: { x: -(F + d), y: 0 }, B: { x: -F, y: 0 }, F: { x: 0, y: 0 }, T: { x: 0, y: h } };
      return {
        prompt: `A and B are ${d} m apart on level ground, in line with the foot F of a tower FT, with B nearer the tower. The angles of elevation of the top T are $${D(a)}$ from A and $${D(b)}$ from B. Find the height of the tower. Round to two decimal places.`,
        figure: {
          kind: 'geometry',
          alt: `Tower FT, vertical, with A and B on level ground in line with F. AB = ${d} m. Angle of elevation of T from A is ${a} degrees, from B is ${b} degrees.`,
          points: Object.entries(pts).map(([id, p]) => ({ id, x: Math.round(p.x * 1000) / 1000, y: Math.round(p.y * 1000) / 1000 })),
          segments: [{ a: 'A', b: 'B', text: `${d} m` }, { a: 'B', b: 'F' }, { a: 'F', b: 'T', text: 'h' }, { a: 'A', b: 'T' }, { a: 'B', b: 'T' }],
          angles: [
            { at: 'A', from: 'F', to: 'T', text: `${a}°` },
            { at: 'B', from: 'F', to: 'T', text: `${b}°` },
            { at: 'F', from: 'B', to: 'T', text: '', right: true },
          ],
        },
        input: { kind: 'numeric', prefix: 'h =', unit: 'm' },
        answer: ans(h),
        answerDisplay: `$h = ${n2(h)}$ m`,
        hints: ['In triangle ABT you know AB and can find every angle: $A\\hat{B}T = 180^\\circ - ' + D(b) + '$ and $A\\hat{T}B = ' + D(b) + ' - ' + D(a) + '$.', 'Find BT with the sine rule, then use the right-angled triangle BFT: $h = BT\\sin ' + D(b) + '$.'],
        solution: [
          `$A\\hat{B}T = 180^\\circ - ${D(b)} = ${D(180 - b)}$ and $A\\hat{T}B = ${D(b)} - ${D(a)} = ${D(b - a)}$ (ext ∠ of △).`,
          `$\\dfrac{BT}{\\sin ${D(a)}} = \\dfrac{${d}}{\\sin ${D(b - a)}}$, so $BT = ${n2(BT)}$ m.`,
          `$h = BT\\sin ${D(b)} = ${n2(h)}$ m.`,
        ],
        misconceptions: keep(
          [
            { code: 'sine-rule', value: ((d * sin(a)) / sin(b)) * sin(b), feedback: `The angle opposite AB in triangle ABT is $A\\hat{T}B = ${D(b - a)}$, not $${D(b)}$.` },
            { code: 'trig-equation', value: BT * cos(b), feedback: 'That is BF. The height is opposite the angle at B: use sin, not cos.' },
            { code: 'sine-rule', value: d * tan(a), feedback: 'A right-angled triangle needs the right angle at F, so tan only works with AF, not AB. Find BT first.' },
          ],
          r2(h),
        ),
      };
    }
    // 3D: vertical tower PQ (Q on the ground), R and S on the horizontal plane.
    if (level === 3) {
      const x = rng.int(35, 80);
      const y = rng.int(35, 80);
      const th = rng.int(20, 50);
      const d = rng.int(30, 120);
      const RQS = 180 - x - y;
      if (RQS < 20) return trig2d3d.generate(rng, 3);
      const QR = (d * sin(y)) / sin(RQS);
      const h = QR * tan(th);
      const R = { x: 0, y: 0, z: 0 };
      const S = { x: d, y: 0, z: 0 };
      const Q = { x: QR * cos(x), y: QR * sin(x), z: 0 };
      const P = { ...Q, z: h };
      return {
        prompt: `PQ is a vertical tower. Q, R and S are on the same horizontal plane. $RS = ${d}$ m, $Q\\hat{R}S = ${D(x)}$, $Q\\hat{S}R = ${D(y)}$, and the angle of elevation of P from R is $${D(th)}$. Find the height of the tower. Round to two decimal places.`,
        figure: fig3d(
          { P, Q, R, S },
          [{ a: 'P', b: 'Q', text: 'h' }, { a: 'Q', b: 'R' }, { a: 'Q', b: 'S' }, { a: 'R', b: 'S', text: `${d} m` }, { a: 'P', b: 'R' }],
          [{ at: 'R', from: 'S', to: 'Q', text: `${x}°`, r: 2.2 }, { at: 'S', from: 'Q', to: 'R', text: `${y}°` }, { at: 'R', from: 'Q', to: 'P', text: `${th}°` }],
          `3D sketch: vertical tower PQ with Q on a horizontal plane with R and S. RS = ${d} m, angle QRS = ${x} degrees, angle QSR = ${y} degrees, angle of elevation of P from R = ${th} degrees.`,
        ),
        input: { kind: 'numeric', prefix: 'PQ =', unit: 'm' },
        answer: ans(h),
        answerDisplay: `$PQ = ${n2(h)}$ m`,
        hints: ['The tower is vertical, so triangle PQR has a right angle at Q.', `First find QR in the horizontal triangle QRS: $R\\hat{Q}S = 180^\\circ - ${D(x)} - ${D(y)}$, then the sine rule.`],
        solution: [
          `$R\\hat{Q}S = 180^\\circ - ${D(x)} - ${D(y)} = ${D(RQS)}$.`,
          `$\\dfrac{QR}{\\sin ${D(y)}} = \\dfrac{${d}}{\\sin ${D(RQS)}}$, so $QR = ${n2(QR)}$ m.`,
          `In right-angled $\\triangle PQR$: $PQ = QR\\tan ${D(th)} = ${n2(h)}$ m.`,
        ],
        misconceptions: keep(
          [
            { code: 'sine-rule', value: ((d * sin(x)) / sin(RQS)) * tan(th), feedback: 'That is QS. QR is opposite the angle at S, so pair it with $\\sin Q\\hat{S}R$.' },
            { code: 'trig-equation', value: QR * sin(th), feedback: 'In triangle PQR the right angle is at Q, so QR is adjacent to the angle of elevation: $PQ = QR\\tan\\theta$.' },
            { code: 'sine-rule', value: d * tan(th), feedback: 'RS is not in the right-angled triangle. Find QR first.' },
          ],
          r2(h),
        ),
      };
    }
    // Levels 4–5: the height and two angles of elevation give QR and QS.
    const h = rng.int(15, 80);
    const a = rng.int(20, 60);
    const b = rng.int(20, 60);
    const g = rng.int(40, 140);
    const QR = h / tan(a);
    const QS = h / tan(b);
    const RS = Math.sqrt(QR * QR + QS * QS - 2 * QR * QS * cos(g));
    const Q = { x: 0, y: 0, z: 0 };
    // The ground triangle opens towards the viewer: R to the left, S to the right, both in front of Q.
    const R2 = { x: -QR * sin(g / 2), y: -QR * cos(g / 2), z: 0 };
    const S2 = { x: QS * sin(g / 2), y: -QS * cos(g / 2), z: 0 };
    const P = { x: 0, y: 0, z: h };
    const pts = { P, Q, R: R2, S: S2 };
    const segs: GeometryFigure['segments'] = [{ a: 'P', b: 'Q', text: `${h} m` }, { a: 'Q', b: 'R' }, { a: 'Q', b: 'S' }, { a: 'R', b: 'S' }, { a: 'P', b: 'R' }, { a: 'P', b: 'S' }];
    const givens = `PQ is a vertical pole of height $${h}$ m, with Q on the same horizontal plane as R and S. The angles of elevation of P from R and S are $${D(a)}$ and $${D(b)}$`;
    if (level === 4) {
      return {
        prompt: `${givens}, and $R\\hat{Q}S = ${D(g)}$. Find the distance $RS$. Round to two decimal places.`,
        figure: fig3d(pts, segs, [{ at: 'R', from: 'Q', to: 'P', text: `${a}°` }, { at: 'S', from: 'Q', to: 'P', text: `${b}°` }, { at: 'Q', from: 'R', to: 'S', text: `${g}°` }], `3D sketch: vertical pole PQ of height ${h} m. R and S on the horizontal plane through Q. Elevation of P from R is ${a} degrees, from S is ${b} degrees; angle RQS is ${g} degrees.`),
        input: { kind: 'numeric', prefix: 'RS =', unit: 'm' },
        answer: ans(RS),
        answerDisplay: `$RS = ${n2(RS)}$ m`,
        hints: ['Triangles PQR and PQS are right-angled at Q. Use them to find QR and QS.', `$QR = \\dfrac{${h}}{\\tan ${D(a)}}$. Then use the cosine rule in triangle QRS.`],
        solution: [
          `$QR = \\dfrac{${h}}{\\tan ${D(a)}} = ${n2(QR)}$ m and $QS = \\dfrac{${h}}{\\tan ${D(b)}} = ${n2(QS)}$ m.`,
          `$RS^2 = QR^2 + QS^2 - 2(QR)(QS)\\cos ${D(g)}$`,
          `$RS = ${n2(RS)}$ m.`,
        ],
        misconceptions: keep(
          [
            { code: 'trig-equation', value: Math.sqrt((h * tan(a)) ** 2 + (h * tan(b)) ** 2 - 2 * h * h * tan(a) * tan(b) * cos(g)), feedback: 'QR is adjacent to the angle of elevation and PQ is opposite: $QR = \\dfrac{PQ}{\\tan\\theta}$, not $PQ\\tan\\theta$.' },
            { code: 'cosine-rule', value: Math.sqrt(QR * QR + QS * QS + 2 * QR * QS * cos(g)), feedback: 'Cosine rule: $RS^2 = QR^2 + QS^2 \\mathbf{-} 2(QR)(QS)\\cos Q$.' },
            { code: 'cosine-rule', value: RS * RS, feedback: 'That is $RS^2$. Take the square root.' },
          ],
          r2(RS),
        ),
      };
    }
    // Level 5: the angle on the ground from three lengths, or the area of the ground triangle.
    const askArea = rng.chance(0.5);
    const rsGiven = r1(RS);
    const gCalc = deg(Math.acos((QR * QR + QS * QS - rsGiven * rsGiven) / (2 * QR * QS)));
    if (!askArea) {
      return {
        prompt: `${givens}. $RS = ${n1(rsGiven)}$ m. Find $R\\hat{Q}S$. Round to one decimal place.`,
        figure: fig3d(pts, [...segs.slice(0, 3), { a: 'R', b: 'S', text: `${n1(rsGiven).replace('{,}', ',')} m` }, ...segs.slice(4)], [{ at: 'R', from: 'Q', to: 'P', text: `${a}°` }, { at: 'S', from: 'Q', to: 'P', text: `${b}°` }, { at: 'Q', from: 'R', to: 'S', text: '?' }], `3D sketch: vertical pole PQ of height ${h} m. R and S on the horizontal plane through Q; RS = ${rsGiven} m. Elevation of P from R is ${a} degrees, from S is ${b} degrees. Angle RQS is unknown.`),
        input: { kind: 'numeric', prefix: 'R\\hat{Q}S =', unit: '°' },
        answer: { kind: 'numeric', value: r1(gCalc), tolerance: 0.3 },
        answerDisplay: `$R\\hat{Q}S = ${n1(gCalc)}^\\circ$`,
        hints: ['Find QR and QS from the right-angled triangles at Q.', 'Then the cosine rule with all three sides of triangle QRS: make $\\cos Q$ the subject.'],
        solution: [`$QR = \\dfrac{${h}}{\\tan ${D(a)}} = ${n2(QR)}$ m, $QS = \\dfrac{${h}}{\\tan ${D(b)}} = ${n2(QS)}$ m.`, `$\\cos R\\hat{Q}S = \\dfrac{QR^2 + QS^2 - RS^2}{2(QR)(QS)}$`, `$R\\hat{Q}S = ${n1(gCalc)}^\\circ$`],
        misconceptions: keep([{ code: 'cosine-rule', value: r1(180 - gCalc), feedback: 'Check the sign: subtract $RS^2$, the side opposite the angle you want.' }], r1(gCalc)).map((m) => ({ ...m, answer: { kind: 'numeric', value: m.answer.kind === 'numeric' ? m.answer.value : 0, tolerance: 0.3 } })),
      };
    }
    const area = 0.5 * QR * QS * sin(g);
    return {
      prompt: `${givens}, and $R\\hat{Q}S = ${D(g)}$. Find the area of triangle $QRS$ on the ground. Round to two decimal places.`,
      figure: fig3d(pts, segs, [{ at: 'R', from: 'Q', to: 'P', text: `${a}°` }, { at: 'S', from: 'Q', to: 'P', text: `${b}°` }, { at: 'Q', from: 'R', to: 'S', text: `${g}°` }], `3D sketch: vertical pole PQ of height ${h} m. R and S on the horizontal plane through Q. Elevation of P from R is ${a} degrees, from S is ${b} degrees; angle RQS is ${g} degrees.`),
      input: { kind: 'numeric', prefix: '\\text{Area} =', unit: 'm²' },
      answer: ans(area),
      answerDisplay: `$${n2(area)}\\text{ m}^2$`,
      hints: ['Find QR and QS from the right-angled triangles at Q.', 'Area of QRS $= \\tfrac{1}{2}(QR)(QS)\\sin R\\hat{Q}S$.'],
      solution: [`$QR = ${n2(QR)}$ m and $QS = ${n2(QS)}$ m.`, `$\\text{Area} = \\tfrac{1}{2}(${n2(QR)})(${n2(QS)})\\sin ${D(g)} = ${n2(area)}\\text{ m}^2$`],
      misconceptions: keep(
        [
          { code: 'area-rule', value: 2 * area, feedback: 'Remember the $\\tfrac{1}{2}$ in the area rule.' },
          { code: 'trig-equation', value: 0.5 * h * h * tan(a) * tan(b) * sin(g), feedback: '$QR = \\dfrac{PQ}{\\tan\\theta}$: divide by tan, don\'t multiply.' },
        ],
        r2(area),
      ),
    };
  },
};
