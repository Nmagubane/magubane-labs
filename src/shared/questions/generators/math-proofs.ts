/**
 * Euclidean proofs, Grades 11–12 (CAPS Paper 2). The learner completes a written proof: a statement–reason table
 * with blanks, each filled from a short list. That is how Paper 2 marks geometry (a statement earns its mark only
 * with the right reason), and it teaches the shape of a proof before learners write one from scratch.
 *
 * Levels: 1 reasons blank · 2 statements blank · 3 both · 4 a harder rider · 5 a CAPS examinable theorem proof.
 * Every statement (right or wrong) is a claim about the diagram; proofs.test.ts measures the diagram to check
 * that each right statement is true and each wrong one is false.
 */
import type { GeometryFigure, GeneratedQuestion, ProofCell, QuestionTemplate, Difficulty } from '../types.ts';
import type { Rng } from '../rng.ts';

type Pt = GeometryFigure['points'][number];
type Seg = NonNullable<GeometryFigure['segments']>[number];
type Ang = NonNullable<GeometryFigure['angles']>[number];
const rad = (d: number) => (d * Math.PI) / 180;
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const P = (id: string, x: number, y: number, extra: Partial<Pt> = {}): Pt => ({ id, x: r3(x), y: r3(y), ...extra });
const onC = (id: string, deg: number): Pt => P(id, Math.cos(rad(deg)), Math.sin(rad(deg)));
const CENTRE = () => P('O', 0, 0, { dot: true });
const HIDDEN_CENTRE = () => P('O', 0, 0, { label: '' });
const CIRCLE: GeometryFigure['circles'] = [{ c: 'O', r: 1 }];
const segs = (...pairs: string[]): Seg[] => pairs.map((p) => ({ a: p[0]!, b: p[1]! }));
const fig = (alt: string, points: Pt[], segments: Seg[], angles: Ang[] = [], circles: GeometryFigure['circles'] = CIRCLE): GeometryFigure => ({ kind: 'geometry', alt, points, segments, angles, ...(circles && circles.length ? { circles } : {}) });
/** A whole number from one of several ranges: keeps a drawing away from values where a wrong option would come out true. */
const from = (rng: Rng, ranges: [number, number][]) => {
  const [lo, hi] = rng.pick(ranges);
  return rng.int(lo, hi);
};

// ---------------------------------------------------------------------------
// A proof is a list of steps. A step can be blanked only where it lists wrong options:
// `sWrong` for its statement, `rWrong` for its reason. The last statement is what is being proved, so it is never blank.
interface Step {
  s: string;
  r: string;
  sWrong?: string[];
  rWrong?: string[];
}
interface Proof {
  prompt: string;
  figure: GeometryFigure;
  steps: Step[];
  hints: string[];
}

/** Reasons that may appear as the right answer, in the wording CAPS markers accept. The test checks against this list. */
export const PROOF_REASONS = [
  'radii', '∠s opp equal sides', 'sides opp equal ∠s', 'sum of ∠s in Δ', 'ext ∠ of Δ', 'vert opp ∠s',
  '∠ at centre = 2 × ∠ at circumference', '∠s in the same seg', '∠ in semi-circle', 'converse: opp ∠s of cyclic quad',
  'tan ⊥ radius', 'tans from common pt', 'tan chord theorem', 'line from centre ⊥ to chord', 'common', 'given', 'RHS', '≡Δs',
  '∠∠∠', '|||Δs', 'line divides two sides of Δ in prop', 'same height', 'same base DE, same height (DE ∥ BC)',
  'alt ∠s; TA ∥ BC', 'corresp ∠s; OD ∥ BC', 'corresp ∠s; DE ∥ BC', '∠s round a pt', 'SAS', 'corresp ∠s =', 'line ∥ one side of Δ',
] as const;

// ---------------------------------------------------------------------------
// Relabelling: the same rider with different letters is a different question to read, the way exam papers vary.
// Only whole capital-letter names made entirely of the rider's points are renamed, so RHS, SAS and TeX stay intact.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I (looks like 1) and no O (always the centre)

function relabel(rng: Rng, p: Proof): Proof {
  const names = p.figure.points.map((q) => q.id).filter((id) => id !== 'O');
  const start = rng.int(0, ALPHABET.length - names.length);
  const map = new Map<string, string>([['O', 'O'], ...names.map((n, i): [string, string] => [n, ALPHABET[start + i]!])]);
  const t = (s: string) => s.replace(/(?<![A-Za-z\\])[A-Z]+(?![A-Za-z])/g, (run) => ([...run].every((c) => map.has(c)) ? [...run].map((c) => map.get(c)).join('') : run));
  const f = p.figure;
  return {
    prompt: t(p.prompt),
    hints: p.hints.map(t),
    steps: p.steps.map((st) => ({ s: t(st.s), r: t(st.r), ...(st.sWrong ? { sWrong: st.sWrong.map(t) } : {}), ...(st.rWrong ? { rWrong: st.rWrong.map(t) } : {}) })),
    figure: {
      ...f,
      alt: t(f.alt),
      points: f.points.map((q) => ({ ...q, id: t(q.id) })),
      ...(f.segments ? { segments: f.segments.map((s) => ({ ...s, a: t(s.a), b: t(s.b) })) } : {}),
      ...(f.angles ? { angles: f.angles.map((a) => ({ ...a, at: t(a.at), from: t(a.from), to: t(a.to) })) } : {}),
      ...(f.circles ? { circles: f.circles.map((c) => ({ ...c, c: t(c.c) })) } : {}),
    },
  };
}

type Blank = { row: number; part: 'statement' | 'reason' };
const pickSome = <T,>(rng: Rng, items: readonly T[], n: number) => rng.shuffle(items).slice(0, n);

/** Which cells are blanks. Never a statement and its own reason together: each is the clue to the other. */
function chooseBlanks(rng: Rng, steps: Step[], level: Difficulty): Blank[] {
  const rows = steps.map((_, i) => i);
  const canS = rows.filter((i) => i < steps.length - 1 && (steps[i]!.sWrong?.length ?? 0) >= 3);
  const canR = rows.filter((i) => (steps[i]!.rWrong?.length ?? 0) >= 3);
  const [nS, nR] = level === 1 ? [0, 3] : level === 2 ? [2, 0] : level === 3 ? [1, 2] : [2, 2];
  const sRows = pickSome(rng, canS, nS);
  const rRows = pickSome(rng, canR.filter((i) => !sRows.includes(i)), nR);
  const blanks: Blank[] = [...sRows.map((row) => ({ row, part: 'statement' as const })), ...rRows.map((row) => ({ row, part: 'reason' as const }))];
  return blanks.sort((a, b) => a.row - b.row || (a.part === 'statement' ? -1 : 1));
}

function build(rng: Rng, p: Proof, level: Difficulty): GeneratedQuestion {
  const blanks = chooseBlanks(rng, p.steps, level);
  const rows: { s: ProofCell; r: ProofCell }[] = p.steps.map((st) => ({ s: { text: st.s }, r: { text: st.r } }));
  const ids: string[] = [];
  blanks.forEach((b, k) => {
    const st = p.steps[b.row]!;
    const right = b.part === 'statement' ? st.s : st.r;
    const wrong = pickSome(rng, (b.part === 'statement' ? st.sWrong : st.rWrong) ?? [], 3);
    const options = rng.shuffle([right, ...wrong]).map((text, j) => ({ id: `b${k}-${j}`, text }));
    ids.push(options.find((o) => o.text === right)!.id);
    rows[b.row]![b.part === 'statement' ? 's' : 'r'] = { blank: k, options };
  });
  const shown = [...new Set(blanks.map((b) => b.row))];
  return {
    prompt: `${p.prompt} Complete the proof.`,
    figure: p.figure,
    input: { kind: 'proof', rows },
    answer: { kind: 'proof', ids, at: blanks },
    answerDisplay: shown.map((i) => `Step ${i + 1}: ${p.steps[i]!.s} (${p.steps[i]!.r})`).join(' · '),
    hints: p.hints,
    solution: p.steps.map((st) => `${st.s} — *${st.r}*`),
    misconceptions: [],
  };
}

// ---------------------------------------------------------------------------
// Shared distractor lists
const TRI_SUM_WRONG = ['ext ∠ of Δ', '∠s on a str line', '∠s round a pt', 'opp ∠s of cyclic quad'];
const ISO_WRONG = ['sides opp equal ∠s', 'radii', '∠s in the same seg', 'alt ∠s'];
const RADII_WRONG = ['given', 'tans from common pt', 'sides opp equal ∠s', 'line from centre ⊥ to chord'];
const SIM_WRONG = ['|||Δs', 'SAS', 'RHS', 'line ∥ one side of Δ'];
const RATIO_WRONG = ['∠∠∠', 'line ∥ one side of Δ', 'given', 'common'];
const TAN_RADIUS_WRONG = ['tan chord theorem', 'tans from common pt', '∠ in semi-circle', 'radii'];

/** Two tangents from P touch the unit circle at A and B, with ∠APB = y. */
function tangentPair(y: number) {
  const d = 1 / Math.sin(rad(y / 2));
  return { Pp: P('P', 0, -d), A: onC('A', 180 + y / 2), B: onC('B', 360 - y / 2) };
}

// ---------------------------------------------------------------------------
// Grade 11: circle-geometry riders

function riderCentre(rng: Rng): Proof {
  const d = from(rng, [[35, 40], [50, 57]]);
  const j = rng.signed(8, 30);
  return {
    prompt: 'O is the centre of the circle and A, B and C lie on the circle. $\\angle ACB = x$. Prove that $\\angle OAB = 90^\\circ - x$.',
    figure: fig('Circle with centre O. A, B and C are on the circle; OA, OB, AB, CA and CB are drawn. Angle ACB is x.', [CENTRE(), onC('A', -90 - d), onC('B', -90 + d), onC('C', 90 + j)], segs('OA', 'OB', 'AB', 'CA', 'CB'), [{ at: 'C', from: 'A', to: 'B', text: 'x' }]),
    steps: [
      { s: '∠AOB = 2x', sWrong: ['∠AOB = x', '∠AOB = ½x', '∠AOB = 180° − x'], r: '∠ at centre = 2 × ∠ at circumference', rWrong: ['∠s in the same seg', '∠ in semi-circle', 'opp ∠s of cyclic quad', 'tan chord theorem'] },
      { s: 'OA = OB', sWrong: ['OA = AB', 'OA = AC', 'OB = BC'], r: 'radii', rWrong: RADII_WRONG },
      { s: '∠OAB = ∠OBA', sWrong: ['∠OAB = ∠AOB', '∠OAB = ∠ACB', '∠OBA = ∠AOB'], r: '∠s opp equal sides', rWrong: ISO_WRONG },
      { s: '∠OAB = ½(180° − 2x) = 90° − x', r: 'sum of ∠s in Δ', rWrong: TRI_SUM_WRONG },
    ],
    hints: ['Angle ACB stands on chord AB at the circle. What does that tell you about the angle AB makes at the centre?', 'OA and OB are both radii, so triangle OAB is isosceles.'],
  };
}

function riderTangents(rng: Rng): Proof {
  const y = from(rng, [[46, 53], [68, 84]]);
  const { Pp, A, B } = tangentPair(y);
  return {
    prompt: 'PA and PB are tangents to the circle at A and B, and C lies on the circle as shown. $\\angle APB = y$. Prove that $\\angle ACB = 90^\\circ - \\tfrac{1}{2}y$.',
    figure: fig('A circle with tangents PA and PB from the point P. C is on the far side of the circle; AB, CA and CB are drawn. Angle APB is y.', [HIDDEN_CENTRE(), Pp, A, B, onC('C', 90 + rng.signed(10, 35))], segs('PA', 'PB', 'AB', 'CA', 'CB'), [{ at: 'P', from: 'A', to: 'B', text: 'y' }]),
    steps: [
      { s: 'PA = PB', sWrong: ['PA = AB', 'PB = AB', 'AC = BC'], r: 'tans from common pt', rWrong: ['radii', 'tan ⊥ radius', 'tan chord theorem', 'sides opp equal ∠s'] },
      { s: '∠PAB = ∠PBA', sWrong: ['∠PAB = ∠APB', '∠PBA = ∠APB', '∠PAB = ½∠APB'], r: '∠s opp equal sides', rWrong: ['sides opp equal ∠s', 'tans from common pt', 'tan chord theorem', '∠s in the same seg'] },
      { s: '∠PAB = ½(180° − y) = 90° − ½y', sWrong: ['∠PAB = 180° − y', '∠PAB = 90° − y', '∠PAB = ½y'], r: 'sum of ∠s in Δ', rWrong: ['ext ∠ of Δ', '∠s on a str line', 'tan chord theorem', 'opp ∠s of cyclic quad'] },
      { s: '∠ACB = ∠PAB = 90° − ½y', r: 'tan chord theorem', rWrong: ['∠s in the same seg', 'alt ∠s', '∠ at centre = 2 × ∠ at circumference', 'tans from common pt'] },
    ],
    hints: ['Two tangents from the same point: what kind of triangle is PAB?', 'Angle ACB stands on chord AB. Which theorem links it to the angle between the tangent PA and the chord AB?'],
  };
}

function riderTangentParallel(rng: Rng): Proof {
  const e = from(rng, [[10, 22], [38, 50]]);
  return {
    prompt: 'TA is a tangent to the circle at A, and the chord BC is parallel to TA. Prove that $AB = AC$.',
    figure: fig('A circle with a tangent TA at A. Chord BC is parallel to TA; AB and AC are drawn.', [HIDDEN_CENTRE(), P('T', -1.5, 1), P('A', 0, 1), onC('B', 180 + e), onC('C', -e)], [{ a: 'T', b: 'A', arrows: 1 }, { a: 'B', b: 'C', arrows: 1 }, ...segs('AB', 'AC')]),
    steps: [
      { s: '∠TAB = ∠ACB', sWrong: ['∠TAB = ∠BAC', '∠TAB = 90°', '∠TAB = 2∠ACB'], r: 'tan chord theorem', rWrong: ['alt ∠s; TA ∥ BC', '∠s in the same seg', 'tan ⊥ radius', 'corresp ∠s; TA ∥ BC'] },
      { s: '∠TAB = ∠ABC', sWrong: ['∠TAB = ∠BAC', '∠TAB = ∠ACB + ∠ABC', '∠TAB + ∠ABC = 90°'], r: 'alt ∠s; TA ∥ BC', rWrong: ['corresp ∠s; TA ∥ BC', 'co-int ∠s; TA ∥ BC', 'tan chord theorem', '∠s in the same seg'] },
      { s: '∠ABC = ∠ACB', sWrong: ['∠ABC = ∠BAC', '∠BAC = ∠ACB', '∠ABC = 90°'], r: 'both equal ∠TAB' },
      { s: 'AB = AC', r: 'sides opp equal ∠s', rWrong: ['∠s opp equal sides', 'tans from common pt', 'radii', 'line from centre ⊥ to chord'] },
    ],
    hints: ['Angle TAB lies between a tangent and a chord. Which theorem is about exactly that?', 'TA ∥ BC, and AB cuts across both lines: look for a Z shape.'],
  };
}

function riderCyclicKite(rng: Rng): Proof {
  const y = from(rng, [[46, 53], [68, 84]]);
  const { Pp, A, B } = tangentPair(y);
  return {
    prompt: 'O is the centre of the circle. PA and PB are tangents to the circle at A and B. Prove that PAOB is a cyclic quadrilateral.',
    figure: fig('A circle with centre O and tangents PA and PB from the point P. OA and OB are drawn.', [CENTRE(), Pp, A, B], segs('PA', 'PB', 'OA', 'OB')),
    steps: [
      { s: '∠OAP = 90°', sWrong: ['∠OAP = ∠APB', '∠OAP = ∠AOB', '∠OAP = 180°'], r: 'tan ⊥ radius', rWrong: TAN_RADIUS_WRONG },
      { s: '∠OBP = 90°', sWrong: ['∠OBP = ∠APB', '∠OBP = ∠AOB', '∠OBP = 180°'], r: 'tan ⊥ radius', rWrong: TAN_RADIUS_WRONG },
      { s: '∠OAP + ∠OBP = 180°', sWrong: ['∠OAP + ∠APB = 180°', '∠AOB + ∠APB = 90°', '∠OAP + ∠OBP = 90°'], r: 'from steps 1 and 2' },
      { s: 'PAOB is a cyclic quad', r: 'converse: opp ∠s of cyclic quad', rWrong: ['opp ∠s of cyclic quad', 'ext ∠ of cyclic quad', 'converse: ∠s in the same seg', 'tans from common pt'] },
    ],
    hints: ['What angle does a tangent make with the radius at the point of contact?', 'A quadrilateral is cyclic if a pair of opposite angles adds up to 180°. That is the converse of a theorem, and the reason must say so.'],
  };
}

function riderDiameterParallel(rng: Rng): Proof {
  const c = from(rng, [[35, 75], [105, 145]]);
  const C = onC('C', c);
  return {
    prompt: 'AB is a diameter of the circle with centre O, and C lies on the circle. D is on AC with OD ∥ BC. Prove that $AD = DC$.',
    figure: fig('Circle with centre O and diameter AB. C is on the circle; D is on AC, and OD is parallel to BC.', [CENTRE(), P('A', -1, 0), P('B', 1, 0), C, P('D', (C.x - 1) / 2, C.y / 2)], [...segs('AB', 'AC'), { a: 'B', b: 'C', arrows: 1 }, { a: 'O', b: 'D', arrows: 1 }]),
    steps: [
      { s: '∠ACB = 90°', sWrong: ['∠ABC = 90°', '∠CAB = 90°', '∠ACB = ∠ABC'], r: '∠ in semi-circle', rWrong: ['∠ at centre = 2 × ∠ at circumference', 'tan ⊥ radius', '∠s in the same seg', 'opp ∠s of cyclic quad'] },
      { s: '∠ADO = ∠ACB = 90°', sWrong: ['∠AOD = ∠ACB = 90°', '∠ADO = ∠ABC', '∠DOB = 90°'], r: 'corresp ∠s; OD ∥ BC', rWrong: ['alt ∠s; OD ∥ BC', 'co-int ∠s; OD ∥ BC', '∠ in semi-circle', 'vert opp ∠s'] },
      { s: 'AD = DC', r: 'line from centre ⊥ to chord', rWrong: ['radii', 'sides opp equal ∠s', 'tan ⊥ radius', '∠s opp equal sides'] },
    ],
    hints: ['AB is a diameter. What is the angle at C?', 'Once OD ⊥ AC, use what a perpendicular from the centre does to a chord.'],
  };
}

/** Theorem: the angle at the centre is twice the angle at the circumference. */
function theoremCentre(rng: Rng): Proof {
  const a = rng.int(35, 55);
  const j = rng.signed(8, 22);
  return {
    prompt: 'Theorem: O is the centre of the circle and A, B and C lie on the circle. Prove that $\\angle AOB = 2\\angle ACB$. Construction: join CO and produce it to D on the circle.',
    figure: fig('Circle with centre O. A, B and C are on the circle. CO is produced to D on the circle; OA, OB, CA and CB are drawn.', [CENTRE(), onC('A', -90 - a), onC('B', -90 + a), onC('C', 90 + j), onC('D', -90 + j)], [...segs('CA', 'CB', 'OA', 'OB'), { a: 'C', b: 'D', dashed: true }]),
    steps: [
      { s: 'OA = OC', sWrong: ['OA = AC', 'OC = AC', 'OA = AB'], r: 'radii', rWrong: RADII_WRONG },
      { s: '∠OCA = ∠OAC', sWrong: ['∠OCA = ∠AOC', '∠OAC = ∠AOD', '∠OCA = ∠OCB'], r: '∠s opp equal sides', rWrong: ISO_WRONG },
      { s: '∠AOD = ∠OCA + ∠OAC = 2∠OCA', sWrong: ['∠AOD = ∠OCA', '∠AOD = 180° − 2∠OCA', '∠AOD = ½∠OCA'], r: 'ext ∠ of Δ', rWrong: ['sum of ∠s in Δ', '∠s on a str line', '∠ at centre = 2 × ∠ at circumference', 'vert opp ∠s'] },
      { s: '∠BOD = 2∠OCB', sWrong: ['∠BOD = ∠OCB', '∠BOD = ½∠OCB', '∠BOD = 2∠OCA'], r: 'similarly, in ΔOBC' },
      { s: '∠AOB = 2(∠OCA + ∠OCB) = 2∠ACB', r: 'from steps 3 and 4' },
    ],
    hints: ['OA and OC are radii, so triangle OAC is isosceles.', 'Angle AOD is an exterior angle of triangle OAC. You may not use the theorem you are proving as a reason.'],
  };
}

/** Theorem: the line from the centre perpendicular to a chord bisects the chord. */
function theoremPerpendicular(rng: Rng): Proof {
  const a = rng.int(52, 70);
  const tilt = rng.int(-25, 25);
  const A = onC('A', -90 - a + tilt);
  const B = onC('B', -90 + a + tilt);
  return {
    prompt: 'Theorem: O is the centre of the circle, and M lies on the chord AB with OM ⊥ AB. Prove that $AM = MB$.',
    figure: fig('Circle with centre O and chord AB. M is on AB and OM is perpendicular to AB; OA and OB are drawn.', [CENTRE(), A, B, P('M', (A.x + B.x) / 2, (A.y + B.y) / 2)], segs('AB', 'OA', 'OB', 'OM'), [{ at: 'M', from: 'B', to: 'O', text: '', right: true }]),
    steps: [
      { s: 'OA = OB', sWrong: ['OA = AB', 'OM = MA', 'OM = AB'], r: 'radii', rWrong: ['given', 'line from centre ⊥ to chord', 'common', 'sides opp equal ∠s'] },
      { s: '∠OMA = ∠OMB = 90°', sWrong: ['∠OAM = ∠OBM = 90°', '∠AOM = ∠BOM = 90°', '∠OMA = ∠OAM'], r: 'given', rWrong: ['tan ⊥ radius', '∠ in semi-circle', 'radii', 'common'] },
      { s: 'OM = OM', r: 'common', rWrong: ['given', 'radii', 'line from centre ⊥ to chord', 'sides opp equal ∠s'] },
      { s: 'ΔOMA ≡ ΔOMB', sWrong: ['ΔOMA ≡ ΔMOB', 'ΔOAB ≡ ΔOMB', 'ΔOMA ≡ ΔOAB'], r: 'RHS', rWrong: ['SAS', 'AAS', 'SSS', '∠∠∠'] },
      { s: 'AM = MB', r: '≡Δs' },
    ],
    hints: ['Look for two triangles that share the side OM.', 'Each has a right angle, an equal hypotenuse and a common side. Which congruence test is that?'],
  };
}

// ---------------------------------------------------------------------------
// Grade 12: similarity riders

function parallelTriangle(rng: Rng, t = rng.pick([0.35, 0.4, 0.6, 0.65])) {
  const A = P('A', rng.pick([0.45, 0.5, 0.55]), 2);
  const B = P('B', 0, 0);
  const C = P('C', rng.pick([2.6, 2.7, 2.8]), 0);
  const at = (id: string, Q: Pt) => P(id, A.x + (Q.x - A.x) * t, A.y + (Q.y - A.y) * t);
  return [A, B, C, at('D', B), at('E', C)];
}

function riderSimilarParallel(rng: Rng): Proof {
  return {
    prompt: 'In $\\triangle ABC$, D lies on AB and E lies on AC, with DE ∥ BC. Prove that $\\triangle ADE \\,|||\\, \\triangle ABC$, and hence that $\\frac{AD}{AB} = \\frac{DE}{BC}$.',
    figure: fig('Triangle ABC with D on AB and E on AC; DE is parallel to BC.', parallelTriangle(rng), [...segs('AB', 'AC'), { a: 'B', b: 'C', arrows: 1 }, { a: 'D', b: 'E', arrows: 1 }], [], []),
    steps: [
      { s: '∠DAE = ∠BAC', sWrong: ['∠ADE = ∠ACB', '∠DAE = ∠ABC', '∠AED = ∠ABC'], r: 'common', rWrong: ['given', 'vert opp ∠s', 'corresp ∠s; DE ∥ BC', 'alt ∠s; DE ∥ BC'] },
      { s: '∠ADE = ∠ABC', sWrong: ['∠ADE = ∠ACB', '∠ADE = ∠BAC', '∠ADE + ∠ABC = 180°'], r: 'corresp ∠s; DE ∥ BC', rWrong: ['alt ∠s; DE ∥ BC', 'co-int ∠s; DE ∥ BC', 'common', 'ext ∠ of Δ'] },
      { s: '∠AED = ∠ACB', sWrong: ['∠AED = ∠ABC', '∠AED = ∠ADE', '∠AED + ∠ACB = 180°'], r: 'corresp ∠s; DE ∥ BC', rWrong: ['alt ∠s; DE ∥ BC', 'co-int ∠s; DE ∥ BC', 'common', 'ext ∠ of Δ'] },
      { s: 'ΔADE ||| ΔABC', sWrong: ['ΔADE ||| ΔACB', 'ΔADE ≡ ΔABC', 'ΔDAE ||| ΔABC'], r: '∠∠∠', rWrong: ['SAS', 'RHS', 'line ∥ one side of Δ', '|||Δs'] },
      { s: 'AD/AB = DE/BC', r: '|||Δs', rWrong: ['line ∥ one side of Δ', '∠∠∠', 'midpt theorem', 'given'] },
    ],
    hints: ['Two triangles are similar when all three pairs of angles are equal. Angle A is in both.', 'DE ∥ BC, and AB cuts across both: look for an F shape.'],
  };
}

function rightTriangle(rng: Rng) {
  const bd = rng.pick([1, 1.2, 1.5]);
  const dc = rng.pick([2.5, 3, 3.5]);
  return [P('B', 0, 0), P('C', bd + dc, 0), P('A', bd, Math.sqrt(bd * dc)), P('D', bd, 0)];
}
const RIGHT_MARKS: Ang[] = [{ at: 'A', from: 'B', to: 'C', text: '', right: true }, { at: 'D', from: 'C', to: 'A', text: '', right: true }];
const SIM_ABD: Step = { s: 'ΔABD ||| ΔCBA', sWrong: ['ΔABD ||| ΔABC', 'ΔABD ||| ΔACD', 'ΔABD ≡ ΔCBA'], r: '∠∠∠', rWrong: SIM_WRONG };

function riderRightSquare(rng: Rng): Proof {
  return {
    prompt: 'In $\\triangle ABC$, $\\angle BAC = 90^\\circ$ and AD ⊥ BC, with D on BC. Prove that $AB^2 = BD \\cdot BC$.',
    figure: fig('Right-angled triangle ABC with the right angle at A. AD is perpendicular to BC, with D on BC.', rightTriangle(rng), [...segs('AB', 'BC', 'CA'), { a: 'A', b: 'D' }], RIGHT_MARKS, []),
    steps: [
      { s: '∠ABD = ∠CBA', sWrong: ['∠ABD = ∠ACB', '∠ABD = ∠BAD', '∠BAD = ∠CBA'], r: 'common', rWrong: ['given', 'vert opp ∠s', 'alt ∠s', '∠s opp equal sides'] },
      { s: '∠ADB = ∠CAB = 90°', sWrong: ['∠ADB = ∠ABC', '∠BAD = ∠CAB = 90°', '∠ADB = ∠ACB'], r: 'given', rWrong: ['∠ in semi-circle', 'tan ⊥ radius', 'vert opp ∠s', 'common'] },
      SIM_ABD,
      { s: 'AB/CB = BD/BA', sWrong: ['AB/CB = AD/BA', 'AB/BD = CB/AC', 'AB/CB = BA/BD'], r: '|||Δs', rWrong: RATIO_WRONG },
      { s: 'AB² = BD·BC', r: 'from step 4' },
    ],
    hints: ['Which two triangles have AB, BD and BC as sides? Triangles ABD and CBA.', 'Write the vertices in matching order (the order of the equal angles) before writing the ratio.'],
  };
}

function riderConverse(rng: Rng): Proof {
  const [p, q] = rng.pick([[2, 3], [3, 2], [3, 4], [4, 3], [2, 5], [5, 2], [3, 5], [5, 3], [1, 2], [2, 1]] as const);
  const [k1, k2] = rng.shuffle([1, 2, 3, 4]) as [number, number];
  const AD = p * k1, DB = q * k1, AE = p * k2, EC = q * k2;
  const r = (a: number, b: number) => `${a}/${b}`;
  return {
    prompt: `In $\\triangle ABC$, D lies on AB and E lies on AC. $AD = ${AD}$, $DB = ${DB}$, $AE = ${AE}$ and $EC = ${EC}$. Prove that DE ∥ BC.`,
    figure: fig(`Triangle ABC with D on AB and E on AC. AD is ${AD}, DB is ${DB}, AE is ${AE} and EC is ${EC}.`, parallelTriangle(rng, p / (p + q)), [...segs('AB', 'AC', 'BC'), { a: 'D', b: 'E', dashed: true }], [], []),
    steps: [
      { s: `AD/DB = ${r(p, q)}`, sWrong: [`AD/DB = ${r(q, p)}`, `AD/DB = ${r(p, p + q)}`, `AD/DB = ${r(p + q, q)}`], r: 'given', rWrong: ['line ∥ one side of Δ', '|||Δs', 'corresp ∠s'] },
      { s: `AE/EC = ${r(p, q)}`, sWrong: [`AE/EC = ${r(q, p)}`, `AE/EC = ${r(p, p + q)}`, `AE/EC = ${r(p + q, q)}`], r: 'given', rWrong: ['line ∥ one side of Δ', '|||Δs', 'corresp ∠s'] },
      { s: 'AD/DB = AE/EC', sWrong: ['AD/DB = EC/AE', 'AD/DB = DE/BC', 'AD/AE = DB/BC'], r: 'from steps 1 and 2' },
      { s: 'DE ∥ BC', r: 'line divides two sides of Δ in prop', rWrong: ['line ∥ one side of Δ', 'midpt theorem', 'corresp ∠s', '|||Δs'] },
    ],
    hints: ['Simplify AD : DB and AE : EC. Are they the same ratio?', 'You are proving the lines parallel, so you need the converse of the proportion theorem, not the theorem itself (which assumes they are parallel).'],
  };
}

const intersect = (a: Pt, b: Pt, c: Pt, d: Pt) => {
  const den = (a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x);
  const t = ((a.x - c.x) * (c.y - d.y) - (a.y - c.y) * (c.x - d.x)) / den;
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
};

function riderChords(rng: Rng): Proof {
  // Chords that cross at nearly 90° would make the angles at P all look (and be) equal: redraw until they don't.
  let A: Pt, B: Pt, C: Pt, D: Pt;
  do {
    A = onC('A', 150 + rng.int(-8, 8));
    C = onC('C', 80 + rng.int(-8, 8));
    B = onC('B', -20 + rng.int(-8, 8));
    D = onC('D', 230 + rng.int(-8, 8));
  } while (Math.abs((B.x - A.x) * (D.x - C.x) + (B.y - A.y) * (D.y - C.y)) / (Math.hypot(B.x - A.x, B.y - A.y) * Math.hypot(D.x - C.x, D.y - C.y)) < 0.1);
  const X = intersect(A, B, C, D);
  return {
    prompt: 'Chords AB and CD of the circle intersect at P. Prove that $AP \\cdot PB = CP \\cdot PD$.',
    figure: fig('A circle with chords AB and CD crossing at P. AC and DB are drawn.', [HIDDEN_CENTRE(), A, B, C, D, P('P', X.x, X.y)], segs('AB', 'CD', 'AC', 'DB')),
    steps: [
      { s: '∠APC = ∠DPB', sWrong: ['∠APC = ∠APD', '∠APC = ∠CPB', '∠APC = ∠PBD'], r: 'vert opp ∠s', rWrong: ['∠s on a str line', '∠s in the same seg', 'alt ∠s', 'common'] },
      { s: '∠CAP = ∠BDP', sWrong: ['∠CAP = ∠DBP', '∠CAP = ∠ACP', '∠CAP = ∠APC'], r: '∠s in the same seg', rWrong: ['∠ at centre = 2 × ∠ at circumference', 'opp ∠s of cyclic quad', 'alt ∠s', 'tan chord theorem'] },
      { s: 'ΔAPC ||| ΔDPB', sWrong: ['ΔAPC ||| ΔBPD', 'ΔAPC ≡ ΔDPB', 'ΔAPC ||| ΔPDB'], r: '∠∠∠', rWrong: SIM_WRONG },
      { s: 'AP/DP = PC/PB', sWrong: ['AP/PB = PC/DP', 'AP/DP = PB/PC', 'AP/PC = PB/DP'], r: '|||Δs', rWrong: RATIO_WRONG },
      { s: 'AP·PB = CP·PD', r: 'from step 4' },
    ],
    hints: ['Look at triangles APC and DPB. The angles at P are vertically opposite.', 'Angles CAB and CDB both stand on chord CB.'],
  };
}

function riderTangentSecant(rng: Rng): Proof {
  const phi = rng.int(-20, 20);
  const dist = rng.pick([1.9, 2.1, 2.3]);
  const Pp = P('P', dist * Math.cos(rad(phi)), dist * Math.sin(rad(phi)));
  const T = onC('T', phi + (Math.acos(1 / dist) * 180) / Math.PI);
  const B = onC('B', phi + 180 + rng.int(25, 45));
  const len = Math.hypot(B.x - Pp.x, B.y - Pp.y);
  const [vx, vy] = [(B.x - Pp.x) / len, (B.y - Pp.y) / len];
  const b = Pp.x * vx + Pp.y * vy;
  const tNear = -b - Math.sqrt(b * b - (Pp.x ** 2 + Pp.y ** 2 - 1));
  const A = P('A', Pp.x + tNear * vx, Pp.y + tNear * vy);
  return {
    prompt: 'PT is a tangent to the circle at T, and PAB is a straight line that cuts the circle at A and B. Prove that $PT^2 = PA \\cdot PB$.',
    figure: fig('A circle with a tangent PT at T. The line PAB cuts the circle at A and B; TA and TB are drawn.', [HIDDEN_CENTRE(), Pp, T, A, B], segs('PT', 'PB', 'TA', 'TB')),
    steps: [
      { s: '∠PTA = ∠TBA', sWrong: ['∠PTA = ∠TAB', '∠PTA = ∠PAT', '∠PTA = 90°'], r: 'tan chord theorem', rWrong: ['tan ⊥ radius', '∠s in the same seg', 'alt ∠s', 'ext ∠ of Δ'] },
      { s: '∠TPA = ∠BPT', sWrong: ['∠TPA = ∠PTB', '∠TPA = ∠PAT', '∠TPA = ∠TAB'], r: 'common', rWrong: ['given', 'vert opp ∠s', 'tans from common pt', 'alt ∠s'] },
      { s: 'ΔPTA ||| ΔPBT', sWrong: ['ΔPTA ||| ΔPTB', 'ΔPTA ||| ΔBPT', 'ΔPTA ≡ ΔPBT'], r: '∠∠∠', rWrong: ['|||Δs', 'SAS', 'tan chord theorem', 'RHS'] },
      { s: 'PT/PB = PA/PT', sWrong: ['PT/PA = PA/PB', 'PT/PB = PT/PA', 'PA/PT = PB/TA'], r: '|||Δs', rWrong: ['∠∠∠', 'tans from common pt', 'line ∥ one side of Δ', 'given'] },
      { s: 'PT² = PA·PB', r: 'from step 4' },
    ],
    hints: ['Look at triangles PTA and PBT. Angle P is in both.', 'Angle PTA lies between the tangent and the chord TA: which theorem gives you an equal angle in the other segment?'],
  };
}

/** Theorem (Pythagoras, by similar triangles). */
function theoremPythagoras(rng: Rng): Proof {
  return {
    prompt: 'Theorem (Pythagoras): In $\\triangle ABC$, $\\angle BAC = 90^\\circ$. Prove that $AB^2 + AC^2 = BC^2$. Construction: draw AD ⊥ BC, with D on BC.',
    figure: fig('Right-angled triangle ABC with the right angle at A. AD is drawn perpendicular to BC.', rightTriangle(rng), [...segs('AB', 'BC', 'CA'), { a: 'A', b: 'D', dashed: true }], RIGHT_MARKS, []),
    steps: [
      SIM_ABD,
      { s: 'AB² = BD·BC', sWrong: ['AB² = AD·BC', 'AB² = BD·DC', 'AB² = AD·DC'], r: '|||Δs', rWrong: RATIO_WRONG },
      { s: 'ΔACD ||| ΔBCA', sWrong: ['ΔACD ||| ΔABC', 'ΔACD ||| ΔABD', 'ΔACD ≡ ΔBCA'], r: '∠∠∠', rWrong: SIM_WRONG },
      { s: 'AC² = DC·BC', sWrong: ['AC² = BD·BC', 'AC² = AD·BC', 'AC² = BD·DC'], r: '|||Δs', rWrong: RATIO_WRONG },
      { s: 'AB² + AC² = BC(BD + DC)', sWrong: ['AB² + AC² = BC(DC − BD)', 'AB² + AC² = BD·DC', 'AB² + AC² = 2BD·DC'], r: 'from steps 2 and 4' },
      { s: 'AB² + AC² = BC²', r: 'BD + DC = BC' },
    ],
    hints: ['The perpendicular AD splits triangle ABC into two triangles, each similar to ABC.', 'Add the two results, then notice that BD + DC is the whole of BC.'],
  };
}

/** Theorem: a line parallel to one side of a triangle divides the other two sides proportionally (the area proof). */
function theoremProportion(rng: Rng): Proof {
  return {
    prompt: 'Theorem: In $\\triangle ABC$, D lies on AB and E lies on AC, with DE ∥ BC. Prove that $\\frac{AD}{DB} = \\frac{AE}{EC}$. Construction: join BE and CD.',
    figure: fig('Triangle ABC with DE parallel to BC. BE and CD are joined.', parallelTriangle(rng), [...segs('AB', 'AC'), { a: 'B', b: 'C', arrows: 1 }, { a: 'D', b: 'E', arrows: 1 }, { a: 'B', b: 'E', dashed: true }, { a: 'C', b: 'D', dashed: true }], [], []),
    steps: [
      { s: 'area ΔADE / area ΔBDE = AD/DB', sWrong: ['area ΔADE / area ΔBDE = DB/AD', 'area ΔADE / area ΔBDE = DE/BC', 'area ΔADE / area ΔBDE = AD/AB'], r: 'same height', rWrong: ['same base', '|||Δs', 'line ∥ one side of Δ', '∠∠∠'] },
      { s: 'area ΔADE / area ΔCED = AE/EC', sWrong: ['area ΔADE / area ΔCED = EC/AE', 'area ΔADE / area ΔCED = DE/BC', 'area ΔADE / area ΔCED = AE/AC'], r: 'same height', rWrong: ['same base', '|||Δs', 'line ∥ one side of Δ', '∠∠∠'] },
      { s: 'area ΔBDE = area ΔCED', sWrong: ['area ΔBDE = area ΔADE', 'area ΔBDE = area ΔABC', 'area ΔADE = area ΔCED'], r: 'same base DE, same height (DE ∥ BC)', rWrong: ['line ∥ one side of Δ', '≡Δs', '|||Δs', 'vert opp ∠s'] },
      { s: 'AD/DB = AE/EC', r: 'from steps 1, 2 and 3' },
    ],
    hints: ['Triangles with the same height have areas in the ratio of their bases.', 'Triangles BDE and CED sit on the same base DE, between the same parallel lines. You may not use the theorem you are proving.'],
  };
}

/** Theorem: opposite angles of a cyclic quadrilateral are supplementary. */
function theoremCyclicQuad(rng: Rng): Proof {
  const b = from(rng, [[15, 25], [34, 40]]);
  return {
    prompt: 'Theorem: ABCD is a cyclic quadrilateral in the circle with centre O. Prove that $\\angle BAD + \\angle BCD = 180^\\circ$. Construction: join OB and OD.',
    figure: fig('Cyclic quadrilateral ABCD in a circle with centre O. OB and OD are joined.', [CENTRE(), onC('A', 90 + rng.int(-25, 25)), onC('B', 180 + b), onC('C', -90 + rng.int(-25, 25)), onC('D', -b)], [...segs('AB', 'BC', 'CD', 'DA'), { a: 'O', b: 'B', dashed: true }, { a: 'O', b: 'D', dashed: true }]),
    steps: [
      { s: '∠BOD = 2∠BAD', sWrong: ['∠BOD = ∠BAD', '∠BOD = 2∠BCD', '∠BOD = ½∠BAD'], r: '∠ at centre = 2 × ∠ at circumference', rWrong: ['∠s in the same seg', 'opp ∠s of cyclic quad', '∠ in semi-circle', 'radii'] },
      { s: 'reflex ∠BOD = 2∠BCD', sWrong: ['reflex ∠BOD = 2∠BAD', 'reflex ∠BOD = ∠BCD', 'reflex ∠BOD = 180° − ∠BCD'], r: '∠ at centre = 2 × ∠ at circumference', rWrong: ['∠s in the same seg', 'opp ∠s of cyclic quad', 'ext ∠ of cyclic quad', 'radii'] },
      { s: '∠BOD + reflex ∠BOD = 360°', sWrong: ['∠BOD + reflex ∠BOD = 180°', '∠BOD = reflex ∠BOD', '∠BOD + ∠BAD = 180°'], r: '∠s round a pt', rWrong: ['∠s on a str line', 'sum of ∠s in Δ', 'opp ∠s of cyclic quad', 'vert opp ∠s'] },
      { s: '2∠BAD + 2∠BCD = 360°', sWrong: ['2∠BAD + 2∠BCD = 180°', '∠BAD + 2∠BCD = 360°', '2∠BAD = 2∠BCD'], r: 'from steps 1, 2 and 3' },
      { s: '∠BAD + ∠BCD = 180°', r: 'divide by 2' },
    ],
    hints: ['Angles BAD and BCD stand on the two arcs BD. Each arc makes an angle at the centre.', 'The two angles at O go all the way round, so they add up to 360°. You may not use the theorem you are proving.'],
  };
}

/** Theorem: the angle between a tangent and a chord equals the angle in the alternate segment. */
function theoremTanChord(rng: Rng): Proof {
  const beta = rng.int(10, 40);
  return {
    prompt: 'Theorem: TA is a tangent at A to the circle with centre O, and AB is a chord. C lies on the circle in the segment opposite T. Prove that $\\angle TAB = \\angle ACB$. Construction: draw the diameter AD and join DB.',
    figure: fig('Circle with centre O and a tangent TA at A. AB is a chord and C is on the circle; AD is a diameter and DB is joined.', [CENTRE(), P('T', 1.5, -1), P('A', 0, -1), onC('B', beta), onC('C', 185 + rng.int(0, 30)), P('D', 0, 1)], [...segs('TA', 'AB', 'AC', 'CB'), { a: 'A', b: 'D', dashed: true }, { a: 'D', b: 'B', dashed: true }]),
    steps: [
      { s: '∠DAT = 90°', sWrong: ['∠DAT = ∠DAB', '∠DAT = 180°', '∠DAT = ∠ADB'], r: 'tan ⊥ radius', rWrong: TAN_RADIUS_WRONG },
      { s: '∠ABD = 90°', sWrong: ['∠ABD = ∠ADB', '∠ADB = 90°', '∠ABD = ∠TAB'], r: '∠ in semi-circle', rWrong: ['∠ at centre = 2 × ∠ at circumference', 'tan ⊥ radius', '∠s in the same seg', 'opp ∠s of cyclic quad'] },
      { s: '∠TAB = 90° − ∠DAB', sWrong: ['∠TAB = 180° − ∠DAB', '∠TAB = ∠DAB', '∠TAB = 90° + ∠DAB'], r: 'from step 1' },
      { s: '∠ADB = 90° − ∠DAB', sWrong: ['∠ADB = 180° − ∠DAB', '∠ADB = ∠DAB', '∠ADB = 90° + ∠DAB'], r: 'sum of ∠s in Δ', rWrong: TRI_SUM_WRONG },
      { s: '∠TAB = ∠ADB', sWrong: ['∠TAB = ∠ABD', '∠TAB = ∠DAB', '∠TAB = 90°'], r: 'from steps 3 and 4' },
      { s: '∠ADB = ∠ACB', sWrong: ['∠ADB = ∠ABC', '∠ADB = ∠CAB', '∠ADB = 2∠ACB'], r: '∠s in the same seg', rWrong: ['tan chord theorem', '∠ at centre = 2 × ∠ at circumference', 'alt ∠s', 'opp ∠s of cyclic quad'] },
      { s: '∠TAB = ∠ACB', r: 'from steps 5 and 6' },
    ],
    hints: ['The diameter AD makes two right angles: one with the tangent, one at B.', 'Both ∠TAB and ∠ADB are 90° minus ∠DAB. Then move from D to C along the same segment. You may not use the theorem you are proving.'],
  };
}

/** Theorem: equiangular triangles have their sides in proportion. */
function theoremEquiangular(rng: Rng): Proof {
  const k = rng.pick([0.45, 0.5, 0.55, 0.7]);
  const A = P('A', rng.pick([0.5, 0.6]), 2);
  const B = P('B', 0, 0);
  const C = P('C', rng.pick([2.6, 2.8]), 0);
  const along = (id: string, Q: Pt, dx = 0) => P(id, A.x + (Q.x - A.x) * k + dx, A.y + (Q.y - A.y) * k);
  const dx = 3.4;
  return {
    prompt: 'Theorem: In $\\triangle ABC$ and $\\triangle DEF$, $\\hat{A} = \\hat{D}$, $\\hat{B} = \\hat{E}$ and $\\hat{C} = \\hat{F}$. Prove that $\\frac{AB}{DE} = \\frac{AC}{DF}$. Construction: mark P on AB and Q on AC with AP = DE and AQ = DF, and join PQ.',
    figure: fig('Triangle ABC with P on AB and Q on AC, and PQ joined. A smaller triangle DEF has the same angles.', [A, B, C, along('P', B), along('Q', C), P('D', A.x + dx, A.y), along('E', B, dx), along('F', C, dx)], [...segs('AB', 'BC', 'CA', 'DE', 'EF', 'FD'), { a: 'P', b: 'Q', dashed: true }], [], []),
    steps: [
      { s: 'AP = DE', r: 'construction' },
      { s: 'ΔAPQ ≡ ΔDEF', sWrong: ['ΔAPQ ≡ ΔDFE', 'ΔAPQ ≡ ΔABC', 'ΔAPQ ||| ΔDFE'], r: 'SAS', rWrong: ['RHS', 'SSS', 'AAS', '∠∠∠'] },
      { s: '∠APQ = ∠ABC', sWrong: ['∠APQ = ∠ACB', '∠APQ = ∠BAC', '∠APQ + ∠ABC = 180°'], r: '≡Δs, and ∠E = ∠B' },
      { s: 'PQ ∥ BC', sWrong: ['PQ ∥ AC', 'PQ ∥ AB', 'AQ ∥ BC'], r: 'corresp ∠s =', rWrong: ['line divides two sides of Δ in prop', 'line ∥ one side of Δ', '|||Δs', 'alt ∠s'] },
      { s: 'AB/AP = AC/AQ', sWrong: ['AB/AP = AQ/AC', 'AB/AP = BC/AQ', 'AP/PB = AC/AQ'], r: 'line ∥ one side of Δ', rWrong: ['line divides two sides of Δ in prop', '|||Δs', 'midpt theorem', '∠∠∠'] },
      { s: 'AB/DE = AC/DF', r: 'AP = DE and AQ = DF' },
    ],
    hints: ['The construction copies triangle DEF into the corner of triangle ABC. Why are they congruent?', 'Equal corresponding angles make PQ parallel to BC. Then use the proportion theorem. You may not use the theorem you are proving.'],
  };
}

// ---------------------------------------------------------------------------
type Rider = (rng: Rng) => Proof;
const proofTemplate = (id: string, pools: [Rider[], Rider[], Rider[]]): QuestionTemplate => ({
  id,
  skillId: id,
  generate(rng, level) {
    const pool = level <= 3 ? pools[0] : level === 4 ? pools[1] : pools[2];
    return build(rng, relabel(rng, rng.pick(pool)(rng)), level);
  },
});

export const circleProofs = proofTemplate('circle-proofs', [[riderCentre, riderTangents, riderTangentParallel], [riderCyclicKite, riderDiameterParallel], [theoremCentre, theoremPerpendicular, theoremCyclicQuad, theoremTanChord]]);
export const similarityProofs = proofTemplate('similarity-proofs', [[riderSimilarParallel, riderRightSquare, riderConverse], [riderChords, riderTangentSecant], [theoremPythagoras, theoremProportion, theoremEquiangular]]);
