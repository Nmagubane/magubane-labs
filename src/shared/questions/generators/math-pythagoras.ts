/**
 * The Theorem of Pythagoras (CAPS Mathematics Grades 7–9, Measurement, p. 32).
 * Grade 8: investigate the theorem, decide whether a triangle is right-angled from its three sides, and find a
 * missing side "leaving irrational answers in surd form". Grade 9: unknown lengths in geometric figures that contain
 * right-angled triangles. Answers are exact surds (√41, 4√2) or whole numbers, typed into the surd input, so the input
 * never gives away whether the answer is whole. Diagrams are to scale (geometry-senior.test.ts measures them).
 */
import type { AnswerSpec, GeneratedQuestion, GeometryFigure, Misconception, QuestionTemplate } from '../types.ts';
import type { Rng } from '../rng.ts';
import type { MistakeCode } from '../mistakes.ts';
import { choice } from './kit.ts';
import { extract } from '../surd.ts';

type Pt = GeometryFigure['points'][number];
type Seg = NonNullable<GeometryFigure['segments']>[number];
type Ang = NonNullable<GeometryFigure['angles']>[number];
type XY = { x: number; y: number };

const rad = (d: number) => (d * Math.PI) / 180;
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const P = (id: string, x: number, y: number, extra: Partial<Pt> = {}): Pt => ({ id, x: r3(x), y: r3(y), ...extra });
const fig = (alt: string, points: Pt[], segments: Seg[], angles: Ang[] = []): GeometryFigure => ({ kind: 'geometry', alt, points, segments, angles });
const sq = (v: number) => v * v;
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

const TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
  [9, 40, 41],
];
/** Letters for a triangle, the right angle at the middle one. */
const NAMES: [string, string, string][] = [
  ['A', 'B', 'C'],
  ['P', 'Q', 'R'],
  ['D', 'E', 'F'],
  ['K', 'L', 'M'],
  ['X', 'Y', 'Z'],
];

/** √m, exactly: k√s with s square-free, or a whole number. */
function root(m: number) {
  const { k, s } = extract(m);
  const spec: AnswerSpec = { kind: 'surd', terms: [{ r: s, n: k, d: 1 }], requireSimplest: false };
  const tex = s === 1 ? `${k}` : `${k === 1 ? '' : k}\\sqrt{${s}}`;
  return { spec, tex, value: Math.sqrt(m), whole: s === 1, k, s };
}
/** A wrong value as a surd answer: a whole number, a rational (n/d) or √m. */
const asRational = (n: number, d = 1): AnswerSpec => {
  const g = gcd(n, d) || 1;
  return { kind: 'surd', terms: [{ r: 1, n: n / g, d: d / g }], requireSimplest: false };
};
const asRoot = (m: number): AnswerSpec => root(m).spec;

interface Wrong {
  answer: AnswerSpec;
  value: number;
  code: MistakeCode;
  feedback: string;
}
const wrongWhole = (n: number, code: MistakeCode, feedback: string): Wrong => ({ answer: asRational(n), value: n, code, feedback });
const wrongRoot = (m: number, code: MistakeCode, feedback: string): Wrong => ({ answer: asRoot(m), value: Math.sqrt(m), code, feedback });
/** Rounded decimals of an irrational answer: right size, wrong form. */
function roundedWrongs(m: number): Wrong[] {
  const v = Math.sqrt(m);
  const { tex } = root(m);
  const fb = `That is a rounded decimal. Leave an answer that isn't a whole number in surd form: $${tex}$.`;
  return [
    { answer: asRational(Math.round(v * 10), 10), value: Math.round(v * 10) / 10, code: 'surd-form', feedback: fb },
    { answer: asRational(Math.round(v * 100), 100), value: Math.round(v * 100) / 100, code: 'surd-form', feedback: fb },
  ];
}
/** Keep wrong answers that are positive and clearly different from the answer and from each other. */
function keep(ws: Wrong[], answer: number): Misconception[] {
  const seen = [answer];
  const out: Misconception[] = [];
  for (const w of ws) {
    if (!Number.isFinite(w.value) || w.value <= 0 || seen.some((s) => Math.abs(s - w.value) < 1e-6)) continue;
    seen.push(w.value);
    out.push({ code: w.code, answer: w.answer, feedback: w.feedback });
  }
  return out;
}

function lengthQuestion(q: { prompt: string; figure: GeometryFigure; m: number; unit: string; hints: string[]; working: string[]; wrong: Wrong[] }): GeneratedQuestion {
  const r = root(q.m);
  return {
    prompt: q.prompt,
    figure: q.figure,
    input: { kind: 'surd' },
    answer: r.spec,
    answerDisplay: `$${r.tex}$ ${q.unit}`,
    hints: q.hints,
    solution: q.working,
    misconceptions: keep(r.whole ? q.wrong : [...q.wrong, ...roundedWrongs(q.m)], r.value),
  };
}

/**
 * A right-angled triangle drawn to scale: the right angle at `names[1]`, leg `a` from it to `names[2]` and leg `b` to
 * `names[0]`. Turned to a random position, so the hypotenuse isn't always in the same place.
 */
function rightTriangle(rng: Rng, names: [string, string, string], a: number, b: number) {
  const turn = rng.pick([0, 20, 90, 160, 200, 290]);
  const flip = rng.chance(0.5) ? -1 : 1;
  const at = (x: number, y: number): XY => {
    const c = Math.cos(rad(turn));
    const s = Math.sin(rad(turn));
    return { x: flip * (x * c - y * s), y: x * s + y * c };
  };
  const [A, B, C] = [at(0, b), at(0, 0), at(a, 0)];
  return [P(names[0], A.x, A.y), P(names[1], B.x, B.y), P(names[2], C.x, C.y)];
}
const side = (u: string, v: string) => `${u}${v}`;

function scaledTriple(rng: Rng, max = 60): [number, number, number] {
  for (;;) {
    const t = rng.pick(TRIPLES);
    const k = rng.pick([1, 1, 2, 3]);
    if (t[2] * k <= max) return (rng.chance(0.5) ? [t[0] * k, t[1] * k, t[2] * k] : [t[1] * k, t[0] * k, t[2] * k]) as [number, number, number];
  }
}

const HYP_HINTS = (h: string) => [`The hypotenuse is the longest side, opposite the right angle. Here it is ${h}.`, 'To find the hypotenuse, add the squares of the two shorter sides, then take the square root.'];
const LEG_HINTS = (h: string) => [`The hypotenuse is ${h}, opposite the right angle. You are finding a shorter side.`, 'To find a shorter side, subtract: hypotenuse² − the other side², then take the square root.'];

/** Find the hypotenuse from the two shorter sides. */
function findHypotenuse(rng: Rng, a: number, b: number, unit: string): GeneratedQuestion {
  const n = rng.pick(NAMES);
  const pts = rightTriangle(rng, n, a, b);
  const [X, Y, Z] = n;
  const m = sq(a) + sq(b);
  const r = root(m);
  return lengthQuestion({
    prompt: `In $\\triangle ${X}${Y}${Z}$, $\\hat{${Y}} = 90^\\circ$, $${side(Y, Z)} = ${a}$ ${unit} and $${side(X, Y)} = ${b}$ ${unit}. Find $${side(X, Z)}$.`,
    figure: fig(`Right-angled triangle ${X}${Y}${Z} with the right angle at ${Y}. ${Y}${Z} is ${a} ${unit} and ${X}${Y} is ${b} ${unit}. ${X}${Z} is unknown.`, pts, [
      { a: Y, b: Z, text: `${a} ${unit}` },
      { a: X, b: Y, text: `${b} ${unit}` },
      { a: X, b: Z, text: '?' },
    ], [{ at: Y, from: Z, to: X, text: '', right: true }]),
    m,
    unit,
    hints: HYP_HINTS(`${X}${Z}`),
    working: [
      `$${X}${Z}^2 = ${Y}${Z}^2 + ${X}${Y}^2$ (Pythagoras)`,
      `$${X}${Z}^2 = ${a}^2 + ${b}^2 = ${sq(a)} + ${sq(b)} = ${m}$`,
      `$${X}${Z} = \\sqrt{${m}}${r.whole ? ` = ${r.tex}` : r.k > 1 ? ` = ${r.tex}` : ''}$ ${unit}`,
    ],
    wrong: [
      wrongWhole(a + b, 'pythagoras-root', `Lengths don't simply add. Square them, add the squares, then take the square root.`),
      wrongWhole(m, 'pythagoras-root', `${m} is ${X}${Z}², the area of the square on ${X}${Z}. Take the square root to get the length.`),
      wrongRoot(Math.abs(sq(a) - sq(b)), 'pythagoras-sides', `${X}${Z} is the hypotenuse, so add the squares. Subtract only when you are finding a shorter side.`),
    ],
  });
}

/** Find a shorter side from the hypotenuse and the other shorter side. */
function findLeg(rng: Rng, a: number, b: number, c: number, unit: string): GeneratedQuestion {
  const n = rng.pick(NAMES);
  const pts = rightTriangle(rng, n, a, b);
  const [X, Y, Z] = n;
  const m = sq(c) - sq(b);
  const r = root(m);
  return lengthQuestion({
    prompt: `In $\\triangle ${X}${Y}${Z}$, $\\hat{${Y}} = 90^\\circ$, $${side(X, Z)} = ${c}$ ${unit} and $${side(X, Y)} = ${b}$ ${unit}. Find $${side(Y, Z)}$.`,
    figure: fig(`Right-angled triangle ${X}${Y}${Z} with the right angle at ${Y}. The hypotenuse ${X}${Z} is ${c} ${unit} and ${X}${Y} is ${b} ${unit}. ${Y}${Z} is unknown.`, pts, [
      { a: Y, b: Z, text: '?' },
      { a: X, b: Y, text: `${b} ${unit}` },
      { a: X, b: Z, text: `${c} ${unit}` },
    ], [{ at: Y, from: Z, to: X, text: '', right: true }]),
    m,
    unit,
    hints: LEG_HINTS(`${X}${Z}`),
    working: [
      `$${X}${Z}^2 = ${Y}${Z}^2 + ${X}${Y}^2$ (Pythagoras), so $${Y}${Z}^2 = ${X}${Z}^2 - ${X}${Y}^2$`,
      `$${Y}${Z}^2 = ${c}^2 - ${b}^2 = ${sq(c)} - ${sq(b)} = ${m}$`,
      `$${Y}${Z} = \\sqrt{${m}}${r.whole || r.k > 1 ? ` = ${r.tex}` : ''}$ ${unit}`,
    ],
    wrong: [
      wrongRoot(sq(c) + sq(b), 'pythagoras-sides', `${X}${Z} is the hypotenuse, the longest side. ${Y}${Z} is shorter, so subtract: ${c}² − ${b}².`),
      wrongWhole(c - b, 'pythagoras-root', 'Lengths don\'t simply subtract. Square them, subtract the squares, then take the square root.'),
      wrongWhole(m, 'pythagoras-root', `${m} is ${Y}${Z}². Take the square root to get the length.`),
    ],
  });
}

/** Is a triangle with these three sides right-angled, and if so, where is the right angle? */
function converse(rng: Rng): GeneratedQuestion {
  const right = rng.chance(0.5);
  let sides: [number, number, number];
  for (;;) {
    const [a, b, c] = scaledTriple(rng, 45);
    const c2 = right ? c : c + rng.pick([-2, -1, 1, 2]);
    // Not right-angled: still a triangle, c still the longest side, and not another right triangle by accident.
    if (!right && (c2 <= Math.max(a, b) || sq(a) + sq(b) === sq(c2))) continue;
    sides = [a, b, c2];
    break;
  }
  const [X, Y, Z] = rng.pick(NAMES);
  // Put the longest side opposite a random vertex.
  const opp = rng.pick([X, Y, Z]);
  const others = [X, Y, Z].filter((v) => v !== opp) as [string, string];
  const [s1, s2, longest] = sides;
  // Sides: opposite `opp` is the longest; the other two are between opp and each other vertex.
  const len: Record<string, number> = { [[others[0], others[1]].sort().join('')]: longest, [[opp, others[0]].sort().join('')]: s1, [[opp, others[1]].sort().join('')]: s2 };
  const names = [[X, Y], [Y, Z], [X, Z]].map((p) => p.join(''));
  const L = (u: string) => len[u.split('').sort().join('')]!;
  // Draw it true: vertex opp at the origin, the others at the angle the cosine rule gives.
  const cosO = (sq(s1) + sq(s2) - sq(longest)) / (2 * s1 * s2);
  const ang = Math.acos(cosO);
  const base = rng.int(0, 359);
  const pts = [P(opp, 0, 0), P(others[0], s1 * Math.cos(rad(base)), s1 * Math.sin(rad(base))), P(others[1], s2 * Math.cos(rad(base) + ang), s2 * Math.sin(rad(base) + ang))];
  const lhs = sq(s1) + sq(s2);
  const rhs = sq(longest);
  const longName = [others[0], others[1]].join('');
  const opts = [
    ...[X, Y, Z].map((v) => ({ id: v, text: `Yes, with the right angle at ${v}` })),
    { id: 'no', text: 'No, it is not right-angled' },
  ];
  const correct = right ? opp : 'no';
  const check = `$${s1}^2 + ${s2}^2 = ${lhs}$ and $${longest}^2 = ${rhs}$`;
  return {
    ...choice(rng, {
      prompt: `In $\\triangle ${X}${Y}${Z}$, $${names[0]} = ${L(names[0]!)}$, $${names[1]} = ${L(names[1]!)}$ and $${names[2]} = ${L(names[2]!)}$. Is $\\triangle ${X}${Y}${Z}$ right-angled?`,
      correct: opts.find((o) => o.id === correct)!,
      distractors: opts
        .filter((o) => o.id !== correct)
        .map((o) => ({
          ...o,
          feedback:
            o.id === 'no'
              ? `Check: ${check}. They are equal, so the triangle is right-angled.`
              : !right
                ? `Check: ${check}. They are not equal, so there is no right angle.`
                : `A right angle is always opposite the longest side. ${longName} is the longest side, so the right angle would be at ${opp}.`,
        })),
      keepOrder: opts,
      code: 'pythagoras-converse',
      hints: ['Find the longest side. If the triangle is right-angled, that side is the hypotenuse and the right angle is opposite it.', 'Compare the square of the longest side with the sum of the squares of the other two.'],
      solution: [
        `The longest side is $${longName} = ${longest}$.`,
        `${check}.`,
        right ? `They are equal, so the triangle is right-angled, with the right angle opposite $${longName}$: at $${opp}$ (converse of Pythagoras).` : `${lhs} ≠ ${rhs}, so the triangle is not right-angled.`,
      ],
    }),
    figure: fig(`Triangle ${X}${Y}${Z} with sides ${names.map((nm) => `${nm} ${L(nm)}`).join(', ')}. No angles are marked.`, pts, names.map((nm) => ({ a: nm[0]!, b: nm[1]!, text: `${L(nm)}` }))),
  };
}

// ---------------------------------------------------------------------------
// Grade 9: problems
const CONTEXTS = ['ladder', 'ramp', 'kite', 'gate', 'screen'] as const;

function context(rng: Rng): GeneratedQuestion {
  const kind = rng.pick(CONTEXTS);
  const tri = (a: number, b: number) => [P('B', 0, 0, { label: '' }), P('C', a, 0, { label: '' }), P('A', 0, b, { label: '' })];
  const rt: Ang = { at: 'B', from: 'C', to: 'A', text: '', right: true };
  if (kind === 'ladder' || kind === 'kite') {
    // The hypotenuse is given (the ladder, the string); find the height.
    const [c, foot] = kind === 'ladder' ? [rng.int(4, 9), rng.int(1, 3)] : [rng.int(25, 60), rng.int(10, 24)];
    const m = sq(c) - sq(foot);
    const r = root(m);
    const what = kind === 'ladder' ? { thing: `A ${c} m ladder leans against a wall. Its foot is ${foot} m from the wall.`, ask: 'How high up the wall does the ladder reach?', base: 'the ground', h: 'the wall' } : { thing: `A kite flies on a ${c} m string, pulled tight. The kite is directly above a point ${foot} m from the girl holding the string.`, ask: 'How high is the kite above her hand?', base: 'the ground', h: 'the height' };
    return lengthQuestion({
      prompt: `${what.thing} ${what.ask}`,
      figure: fig(`A right-angled triangle: ${kind === 'ladder' ? 'the ladder' : 'the string'} is the hypotenuse, ${c} m. The base is ${foot} m. The height is unknown.`, tri(foot, r.value), [
        { a: 'B', b: 'C', text: `${foot} m` },
        { a: 'C', b: 'A', text: `${c} m` },
        { a: 'B', b: 'A', text: '?' },
      ], [rt]),
      m,
      unit: 'm',
      hints: [`${kind === 'ladder' ? 'The ladder' : 'The string'} is the hypotenuse: it is opposite the right angle between the ground and the height.`, 'You are finding a shorter side, so subtract the squares.'],
      working: [`height$^2 = ${c}^2 - ${foot}^2 = ${sq(c)} - ${sq(foot)} = ${m}$ (Pythagoras)`, `height $= \\sqrt{${m}}${r.whole || r.k > 1 ? ` = ${r.tex}` : ''}$ m`],
      wrong: [
        wrongRoot(sq(c) + sq(foot), 'pythagoras-sides', `${kind === 'ladder' ? 'The ladder' : 'The string'} is the longest side, the hypotenuse. The height is shorter, so subtract the squares.`),
        wrongWhole(c - foot, 'pythagoras-root', "Lengths don't simply subtract. Square them, subtract the squares, then take the square root."),
      ],
    });
  }
  // The two shorter sides are given; find the hypotenuse.
  const [a, b, label, prompt, h] =
    kind === 'ramp'
      ? (() => {
          const run = rng.int(6, 12);
          const rise = rng.int(1, 2);
          return [run, rise, ['run', 'rise'], `A wheelchair ramp at a school entrance rises ${rise} m over a horizontal distance of ${run} m. How long is the ramp?`, 'The ramp'] as const;
        })()
      : kind === 'gate'
        ? (() => {
            const w = rng.int(3, 5);
            const ht = rng.int(1, 2);
            return [w, ht, ['width', 'height'], `A farm gate is ${w} m wide and ${ht} m high. A diagonal brace runs from one corner to the opposite corner. How long is the brace?`, 'The brace'] as const;
          })()
        : (() => {
            const k = rng.int(4, 8);
            return [16 * k, 9 * k, ['width', 'height'], `A TV screen is ${16 * k} cm wide and ${9 * k} cm high. Screens are measured along the diagonal. How long is this one's diagonal?`, 'The diagonal'] as const;
          })();
  const unit = kind === 'screen' ? 'cm' : 'm';
  const m = sq(a) + sq(b);
  const r = root(m);
  return lengthQuestion({
    prompt,
    figure: fig(`A right-angled triangle with shorter sides ${a} ${unit} (${label[0]}) and ${b} ${unit} (${label[1]}). ${h} is the hypotenuse, unknown.`, tri(a, b), [
      { a: 'B', b: 'C', text: `${a} ${unit}` },
      { a: 'B', b: 'A', text: `${b} ${unit}` },
      { a: 'C', b: 'A', text: '?' },
    ], [rt]),
    m,
    unit,
    hints: [`${h} is opposite the right angle: it is the hypotenuse.`, 'Add the squares of the two shorter sides, then take the square root.'],
    working: [`${h.toLowerCase()}$^2 = ${a}^2 + ${b}^2 = ${sq(a)} + ${sq(b)} = ${m}$ (Pythagoras)`, `${h.toLowerCase()} $= \\sqrt{${m}}${r.whole || r.k > 1 ? ` = ${r.tex}` : ''}$ ${unit}`],
    wrong: [
      wrongWhole(a + b, 'pythagoras-root', "Lengths don't simply add. Square them, add the squares, then take the square root."),
      wrongWhole(m, 'pythagoras-root', `${m} is the square of the length. Take the square root.`),
    ],
  });
}

/** Two right-angled triangles sharing a side: Pythagoras twice. */
const CHAINS: [number, number, number, number, number][] = [
  [3, 4, 5, 12, 13],
  [6, 8, 10, 24, 26],
  [9, 12, 15, 8, 17],
  [12, 16, 20, 15, 25],
  [12, 16, 20, 21, 29],
  [9, 12, 15, 20, 25],
  [8, 6, 10, 24, 26],
];

function twoSteps(rng: Rng): GeneratedQuestion {
  if (rng.chance(0.5)) {
    const [a, b, c, d, e] = rng.pick(CHAINS);
    // B is the right angle of ABC; C is the right angle of ACD, with D on the far side of AC from B.
    const A = { x: 0, y: a };
    const C = { x: b, y: 0 };
    const ux = (A.x - C.x) / c;
    const uy = (A.y - C.y) / c;
    // Perpendicular to CA, pointing away from B.
    let nx = -uy;
    let ny = ux;
    if (nx * (0 - C.x) + ny * (0 - C.y) > 0) (nx = -nx), (ny = -ny);
    const D = { x: C.x + nx * d, y: C.y + ny * d };
    const pts = [P('A', A.x, A.y), P('B', 0, 0), P('C', C.x, C.y), P('D', D.x, D.y)];
    return lengthQuestion({
      prompt: `In the figure, $\\hat{B} = 90^\\circ$ and $\\angle ACD = 90^\\circ$. $AB = ${a}$ cm, $BC = ${b}$ cm and $CD = ${d}$ cm. Find $AD$.`,
      figure: fig(`Two right-angled triangles share the side AC. Triangle ABC has its right angle at B, with AB ${a} cm and BC ${b} cm. Triangle ACD has its right angle at C, with CD ${d} cm. AD is unknown.`, pts, [
        { a: 'A', b: 'B', text: `${a} cm` },
        { a: 'B', b: 'C', text: `${b} cm` },
        { a: 'A', b: 'C' },
        { a: 'C', b: 'D', text: `${d} cm` },
        { a: 'A', b: 'D', text: '?' },
      ], [
        { at: 'B', from: 'C', to: 'A', text: '', right: true },
        { at: 'C', from: 'A', to: 'D', text: '', right: true },
      ]),
      m: sq(e),
      unit: 'cm',
      hints: ['AD is in triangle ACD, but you don\'t know AC yet. Find AC first, from triangle ABC.', 'Then use Pythagoras again in triangle ACD, where AD is the hypotenuse.'],
      working: [`In $\\triangle ABC$: $AC^2 = ${a}^2 + ${b}^2 = ${sq(c)}$, so $AC = ${c}$ cm (Pythagoras)`, `In $\\triangle ACD$: $AD^2 = ${c}^2 + ${d}^2 = ${sq(c)} + ${sq(d)} = ${sq(e)}$ (Pythagoras)`, `$AD = ${e}$ cm`],
      wrong: [
        wrongWhole(c, 'pythagoras-steps', 'That is AC, the first step. AD is in triangle ACD: use Pythagoras again with AC and CD.'),
        wrongRoot(sq(b) + sq(d), 'pythagoras-steps', 'BC and CD are not two sides of one right-angled triangle. Find AC first, then use triangle ACD.'),
        wrongWhole(c + d, 'pythagoras-root', "Lengths don't simply add. In triangle ACD, AD² = AC² + CD²."),
      ],
    });
  }
  // An isosceles triangle: the height from the top meets the base at its midpoint, making two right-angled triangles.
  const [p, h, s] = scaledTriple(rng, 30);
  const askArea = rng.chance(0.5);
  const pts = [P('A', 0, h), P('B', -p, 0), P('C', p, 0), P('M', 0, 0, { dot: true })];
  const segs: Seg[] = [
    { a: 'A', b: 'B', ticks: 1, text: `${s} cm` },
    { a: 'A', b: 'C', ticks: 1 },
    { a: 'B', b: 'C', text: `${2 * p} cm` },
    { a: 'A', b: 'M', dashed: true, ...(askArea ? {} : { text: '?' }) },
  ];
  const figure = fig(`Isosceles triangle ABC with AB and AC both ${s} cm and base BC ${2 * p} cm. AM is the height, perpendicular to BC at its midpoint M.${askArea ? '' : ' AM is unknown.'}`, pts, segs, [{ at: 'M', from: 'C', to: 'A', text: '', right: true }]);
  if (!askArea) {
    return lengthQuestion({
      prompt: `$\\triangle ABC$ is isosceles with $AB = AC = ${s}$ cm and $BC = ${2 * p}$ cm. $AM \\perp BC$. Find the height $AM$.`,
      figure,
      m: sq(h),
      unit: 'cm',
      hints: ['In an isosceles triangle, the height from the top meets the base at its midpoint, so BM is half of BC.', 'Use Pythagoras in triangle ABM, where AB is the hypotenuse.'],
      working: [`$BM = \\tfrac{1}{2}BC = ${p}$ cm`, `In $\\triangle ABM$: $AM^2 = ${s}^2 - ${p}^2 = ${sq(s)} - ${sq(p)} = ${sq(h)}$ (Pythagoras)`, `$AM = ${h}$ cm`],
      wrong: [
        ...(sq(s) > sq(2 * p) ? [wrongRoot(sq(s) - sq(2 * p), 'pythagoras-steps', 'M is the midpoint of BC, so BM is half of BC. Use BM, not BC, in triangle ABM.')] : []),
        wrongRoot(sq(s) + sq(p), 'pythagoras-sides', 'AB is the hypotenuse of triangle ABM, so subtract: AB² − BM².'),
        wrongWhole(s - p, 'pythagoras-root', "Lengths don't simply subtract. AM² = AB² − BM²."),
      ],
    });
  }
  return {
    prompt: `$\\triangle ABC$ is isosceles with $AB = AC = ${s}$ cm and $BC = ${2 * p}$ cm. Find the area of $\\triangle ABC$ in cm².`,
    figure,
    input: { kind: 'surd' },
    answer: asRational(p * h),
    answerDisplay: `$${p * h}$ cm²`,
    hints: ['Area = ½ × base × height. You know the base; find the height AM first.', 'M is the midpoint of BC. Use Pythagoras in triangle ABM to find AM.'],
    solution: [`$AM^2 = ${s}^2 - ${p}^2 = ${sq(h)}$, so $AM = ${h}$ cm (Pythagoras)`, `Area $= \\tfrac{1}{2} \\times ${2 * p} \\times ${h} = ${p * h}$ cm²`],
    misconceptions: keep(
      [
        wrongWhole(p * s, 'pythagoras-steps', 'AB is a sloping side, not the height. The height AM is perpendicular to the base: find it with Pythagoras first.'),
        wrongWhole(2 * p * h, 'probable-slip', 'Area of a triangle is half of base × height.'),
      ],
      p * h,
    ),
  };
}

export const pythagoras: QuestionTemplate = {
  id: 'pythagoras',
  skillId: 'pythagoras',
  generate(rng, level) {
    const unit = rng.pick(['cm', 'cm', 'm', 'mm']);
    if (level === 1) {
      const [a, b] = scaledTriple(rng);
      return findHypotenuse(rng, a, b, unit);
    }
    if (level === 2) {
      const [a, b, c] = scaledTriple(rng);
      return findLeg(rng, a, b, c, unit);
    }
    if (level === 3) {
      if (rng.chance(0.4)) return converse(rng);
      // Not a Pythagorean triple: the answer is a surd.
      for (;;) {
        const a = rng.int(2, 12);
        const b = rng.int(2, 12);
        if (rng.chance(0.5)) {
          if (!root(sq(a) + sq(b)).whole) return findHypotenuse(rng, a, b, unit);
        } else {
          const c = Math.max(a, b) + rng.int(1, 6);
          const leg = Math.min(a, b);
          if (!root(sq(c) - sq(leg)).whole) return findLeg(rng, Math.sqrt(sq(c) - sq(leg)), leg, c, unit);
        }
      }
    }
    if (level === 4) return context(rng);
    return twoSteps(rng);
  },
};
