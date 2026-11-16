/**
 * Grade 10 measurement (CAPS; Grade 11 revises it): volume and surface area of right prisms, cylinders,
 * spheres, right pyramids (square or equilateral-triangle bases only) and right cones; the effect of
 * multiplying dimensions by k; composites of at most two solids (DBE examination guidelines).
 * Answers are to two decimal places; slant heights come from Pythagorean triples so the given numbers are whole.
 */
import type { QuestionTemplate, Misconception, Figure, SolidShape, GeneratedQuestion } from '../types.ts';
import type { MistakeCode } from '../mistakes.ts';
import type { Rng } from '../rng.ts';
import { keepNum } from './kit.ts';

const PI = Math.PI;
const r2 = (v: number) => Math.round(v * 100) / 100;
/** 1234.5 → "1\,234{,}50" for TeX */
const tx = (v: number, dp = 2) => {
  const [w, f] = r2(v).toFixed(dp).split('.');
  return `${(w as string).replace(/\B(?=(\d{3})+(?!\d))/g, '\\,')}${f ? `{,}${f}` : ''}`;
};
/** Whole numbers stay whole: 7 → "7", 2.5 → "2{,}5" */
const n = (v: number) => (Number.isInteger(v) ? String(v) : String(v).replace('.', '{,}'));
const cm = (v: number) => `${String(v).replace('.', ',')} cm`;

const ans = (value: number) => ({ kind: 'numeric' as const, value: r2(value), tolerance: 0.001, relative: true });

function solid(shape: SolidShape, alt: string, labels: Extract<Figure, { kind: 'solid' }>['labels']): Figure {
  return { kind: 'solid', shape, alt, labels };
}

interface Wrong {
  code: MistakeCode;
  value: number;
  feedback: string;
}
function q(base: Omit<GeneratedQuestion, 'misconceptions' | 'answer' | 'input'> & { value: number; unit?: string; wrong: Wrong[] }): GeneratedQuestion {
  const { value, unit, wrong, ...rest } = base;
  return {
    ...rest,
    input: unit ? { kind: 'numeric', unit } : { kind: 'numeric' },
    answer: ans(value),
    misconceptions: keepNum(
      wrong.map<Misconception>((w) => ({ code: w.code, answer: ans(w.value), feedback: w.feedback })),
      r2(value),
    ),
  };
}

const ROUND = 'Round your answer to two decimal places.';
const TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [5, 12, 13],
  [6, 8, 10],
  [8, 15, 17],
  [9, 12, 15],
  [7, 24, 25],
  [12, 16, 20],
];

function prismsCylinders(rng: Rng): GeneratedQuestion {
  const kind = rng.pick(['cuboid', 'tri', 'cyl', 'cyl', 'cyl-h']);
  if (kind === 'cuboid') {
    const [l, w, h] = [rng.int(4, 15), rng.int(2, 10), rng.int(2, 12)];
    const vol = rng.chance(0.5);
    const V = l * w * h;
    const S = 2 * (l * w + l * h + w * h);
    return q({
      prompt: `A closed box (a rectangular prism) is ${cm(l)} long, ${cm(w)} wide and ${cm(h)} high. Calculate its ${vol ? 'volume' : 'total surface area'}.`,
      figure: solid('cuboid', `A rectangular prism ${l} by ${w} by ${h} centimetres.`, { l: cm(l), w: cm(w), h: cm(h) }),
      value: vol ? V : S,
      unit: vol ? 'cm³' : 'cm²',
      answerDisplay: vol ? `$${V}\\ \\text{cm}^3$` : `$${S}\\ \\text{cm}^2$`,
      hints: vol ? ['Volume of a prism = area of the base × height.'] : ['There are six faces, in three equal pairs: top and bottom, front and back, two ends.'],
      solution: vol ? [`$V = l \\times w \\times h = ${l} \\times ${w} \\times ${h} = ${V}\\ \\text{cm}^3$`] : [`$S = 2(lw + lh + wh) = 2(${l * w} + ${l * h} + ${w * h}) = ${S}\\ \\text{cm}^2$`],
      wrong: vol ? [] : [{ code: 'surface-area', value: l * w + l * h + w * h, feedback: 'That is only three of the six faces. Each face has an equal partner on the opposite side.' }],
    });
  }
  if (kind === 'tri') {
    const [a0, b0, c0] = rng.pick(TRIPLES.slice(0, 4));
    const k = a0 < 6 ? rng.pick([1, 2]) : 1;
    const [a, b, c] = [a0 * k, b0 * k, c0 * k];
    const l = rng.int(5, 20);
    const vol = rng.chance(0.5);
    const tri = (a * b) / 2;
    const V = tri * l;
    const S = 2 * tri + (a + b + c) * l;
    return q({
      prompt: `A right prism has a right-angled triangle as its base, with sides ${cm(a)}, ${cm(b)} and ${cm(c)}. The prism is ${cm(l)} long. Calculate its ${vol ? 'volume' : 'total surface area'}.`,
      figure: solid('triangular-prism', `A triangular prism whose end is a right-angled triangle with sides ${a}, ${b} and ${c} centimetres; length ${l} centimetres.`, { a: cm(a), b: cm(b), slant: cm(c), l: cm(l) }),
      value: vol ? V : S,
      unit: vol ? 'cm³' : 'cm²',
      answerDisplay: `$${tx(vol ? V : S)}\\ \\text{cm}^${vol ? 3 : 2}$`,
      hints: vol ? ['Volume = area of the triangle × length. The right angle is between the two shorter sides.'] : ['Two triangles and three rectangles. Each rectangle is one side of the triangle × the length.'],
      solution: vol
        ? [`Area of the triangle $= \\tfrac{1}{2} \\times ${n(a)} \\times ${n(b)} = ${n(tri)}\\ \\text{cm}^2$`, `$V = ${n(tri)} \\times ${l} = ${tx(V)}\\ \\text{cm}^3$`]
        : [`Two triangles: $2 \\times ${n(tri)} = ${n(2 * tri)}$`, `Three rectangles: $(${n(a)} + ${n(b)} + ${n(c)}) \\times ${l} = ${n((a + b + c) * l)}$`, `$S = ${tx(S)}\\ \\text{cm}^2$`],
      wrong: vol
        ? [{ code: 'surface-area', value: a * b * l, feedback: 'The base is a triangle: its area is ½ × base × height, not base × height.' }]
        : [{ code: 'surface-area', value: tri + (a + b + c) * l, feedback: 'There are two triangular ends, one at each end of the prism.' }],
    });
  }
  const r = rng.int(2, 12);
  const h = rng.int(3, 20);
  const byDiameter = rng.chance(0.4);
  const given = byDiameter ? `a diameter of ${cm(2 * r)}` : `a radius of ${cm(r)}`;
  const labels = byDiameter ? { r: `d = ${cm(2 * r)}`, h: cm(h) } : { r: cm(r), h: cm(h) };
  if (kind === 'cyl-h') {
    // Reverse: the volume is given, find the height.
    const V = PI * r * r * h;
    return q({
      prompt: `A cylindrical tank has ${given} and holds $${tx(V)}\\ \\text{cm}^3$. Calculate its height.`,
      figure: solid('cylinder', `A cylinder with ${byDiameter ? 'diameter' : 'radius'} ${byDiameter ? 2 * r : r} centimetres and an unknown height.`, { r: labels.r, h: 'h' }),
      value: h,
      unit: 'cm',
      answerDisplay: `$${h}\\ \\text{cm}$`,
      hints: ['$V = \\pi r^2 h$. Substitute what you know and solve for $h$.', ...(byDiameter ? ['The radius is half the diameter.'] : [])],
      solution: [`$${tx(V)} = \\pi \\times ${r}^2 \\times h$`, `$h = \\dfrac{${tx(V)}}{\\pi \\times ${r * r}} = ${h}\\ \\text{cm}$`],
      wrong: [
        ...(byDiameter ? [{ code: 'radius-diameter' as const, value: h / 4, feedback: `You used the diameter, ${2 * r} cm, as the radius. The radius is ${r} cm.` }] : []),
        { code: 'surface-area', value: V / (PI * r), feedback: 'The radius is squared in $V = \\pi r^2 h$: divide by $\\pi r^2$.' },
      ],
    });
  }
  const vol = rng.chance(0.5);
  const V = PI * r * r * h;
  const S = 2 * PI * r * r + 2 * PI * r * h;
  return q({
    prompt: `A closed cylinder has ${given} and a height of ${cm(h)}. Calculate its ${vol ? 'volume' : 'total surface area'}. ${ROUND}`,
    figure: solid('cylinder', `A cylinder with ${byDiameter ? 'diameter' : 'radius'} ${byDiameter ? 2 * r : r} centimetres and height ${h} centimetres.`, labels),
    value: vol ? V : S,
    unit: vol ? 'cm³' : 'cm²',
    answerDisplay: `$${tx(vol ? V : S)}\\ \\text{cm}^${vol ? 3 : 2}$`,
    hints: vol ? ['$V = \\pi r^2 h$: the area of the circle times the height.', ...(byDiameter ? ['The radius is half the diameter.'] : [])] : ['Two circles and a curved side. Unrolled, the curved side is a rectangle $2\\pi r$ long and $h$ high.', ...(byDiameter ? ['The radius is half the diameter.'] : [])],
    solution: vol ? [`$V = \\pi r^2 h = \\pi \\times ${r}^2 \\times ${h} = ${tx(V)}\\ \\text{cm}^3$`] : [`$S = 2\\pi r^2 + 2\\pi r h = 2\\pi(${r})^2 + 2\\pi(${r})(${h}) = ${tx(S)}\\ \\text{cm}^2$`],
    wrong: [
      ...(byDiameter ? [{ code: 'radius-diameter' as const, value: vol ? PI * 4 * r * r * h : 2 * PI * 4 * r * r + 2 * PI * 2 * r * h, feedback: `You used the diameter, ${2 * r} cm, as the radius. Halve it first: $r = ${r}$ cm.` }] : []),
      ...(vol ? [] : [{ code: 'surface-area' as const, value: PI * r * r + 2 * PI * r * h, feedback: 'A closed cylinder has two circles, a top and a bottom.' }]),
    ],
  });
}

function spheresCones(rng: Rng): GeneratedQuestion {
  const kind = rng.pick(['sphere', 'hemi', 'cone', 'cone']);
  const vol = rng.chance(0.5);
  if (kind === 'sphere' || kind === 'hemi') {
    const r = rng.int(2, 15);
    const half = kind === 'hemi';
    const V = ((half ? 2 : 4) / 3) * PI * r ** 3;
    const S = half ? 3 * PI * r * r : 4 * PI * r * r;
    return q({
      prompt: `${half ? 'A solid hemisphere' : 'A sphere'} has a radius of ${cm(r)}. Calculate its ${vol ? 'volume' : 'total surface area'}. ${ROUND}`,
      figure: solid(half ? 'hemisphere' : 'sphere', `A ${half ? 'solid hemisphere' : 'sphere'} with radius ${r} centimetres.`, { r: cm(r) }),
      value: vol ? V : S,
      unit: vol ? 'cm³' : 'cm²',
      answerDisplay: `$${tx(vol ? V : S)}\\ \\text{cm}^${vol ? 3 : 2}$`,
      hints: [vol ? `$V_{\\text{sphere}} = \\tfrac{4}{3}\\pi r^3$${half ? ', and a hemisphere is half of it' : ''}.` : `$S_{\\text{sphere}} = 4\\pi r^2$${half ? '. A solid hemisphere has half of that curved surface, plus its flat circle' : ''}.`],
      solution: vol ? [`$V = ${half ? '\\tfrac{1}{2} \\times ' : ''}\\tfrac{4}{3}\\pi (${r})^3 = ${tx(V)}\\ \\text{cm}^3$`] : half ? [`Curved part: $\\tfrac{1}{2} \\times 4\\pi (${r})^2 = 2\\pi(${r})^2$`, `Flat circle: $\\pi (${r})^2$`, `$S = 3\\pi (${r})^2 = ${tx(S)}\\ \\text{cm}^2$`] : [`$S = 4\\pi (${r})^2 = ${tx(S)}\\ \\text{cm}^2$`],
      wrong: vol
        ? [{ code: 'surface-area', value: ((half ? 2 : 4) / 3) * PI * r * r, feedback: 'Volume uses $r^3$ (it is measured in cm³); you used $r^2$.' }]
        : half
          ? [{ code: 'surface-area', value: 2 * PI * r * r, feedback: 'That is only the curved part. A solid hemisphere also has a flat circular face: add $\\pi r^2$.' }]
          : [{ code: 'surface-area', value: PI * r * r, feedback: 'The surface of a sphere is four times the area of its great circle: $4\\pi r^2$.' }],
    });
  }
  // cone: radius, height and slant from a Pythagorean triple
  const [a, b, c] = rng.pick(TRIPLES);
  const [r, h] = rng.chance(0.5) ? [a, b] : [b, a];
  const s = c;
  const V = (1 / 3) * PI * r * r * h;
  const S = PI * r * r + PI * r * s;
  const giveSlant = !vol && rng.chance(0.5);
  return q({
    prompt: vol
      ? `A right cone has a base radius of ${cm(r)} and a perpendicular height of ${cm(h)}. Calculate its volume. ${ROUND}`
      : `A right cone has a base radius of ${cm(r)} and a ${giveSlant ? `slant height of ${cm(s)}` : `perpendicular height of ${cm(h)}`}. Calculate its total surface area. ${ROUND}`,
    figure: solid('cone', `A cone with base radius ${r} centimetres and ${vol || !giveSlant ? `height ${h}` : `slant height ${s}`} centimetres.`, vol || !giveSlant ? { r: cm(r), h: cm(h) } : { r: cm(r), slant: cm(s) }),
    value: vol ? V : S,
    unit: vol ? 'cm³' : 'cm²',
    answerDisplay: `$${tx(vol ? V : S)}\\ \\text{cm}^${vol ? 3 : 2}$`,
    hints: vol ? ['A cone holds a third of the cylinder with the same base and height: $V = \\tfrac{1}{3}\\pi r^2 h$.'] : ['$S = \\pi r^2 + \\pi r s$, where $s$ is the slant height.', ...(giveSlant ? [] : ['Find the slant height first: $s^2 = r^2 + h^2$.'])],
    solution: vol
      ? [`$V = \\tfrac{1}{3}\\pi (${r})^2 (${h}) = ${tx(V)}\\ \\text{cm}^3$`]
      : [...(giveSlant ? [] : [`$s = \\sqrt{${r}^2 + ${h}^2} = ${s}$ cm`]), `$S = \\pi (${r})^2 + \\pi (${r})(${s}) = ${tx(S)}\\ \\text{cm}^2$`],
    wrong: vol
      ? [{ code: 'one-third', value: PI * r * r * h, feedback: 'That is the volume of the cylinder with the same base and height. A cone holds a third of it.' }]
      : [
          ...(giveSlant ? [] : [{ code: 'slant-height' as const, value: PI * r * r + PI * r * h, feedback: `The curved surface uses the slant height $s = ${s}$ cm, not the perpendicular height.` }]),
          { code: 'surface-area', value: PI * r * s, feedback: 'That is only the curved surface. A closed cone also has its circular base: add $\\pi r^2$.' },
        ],
  });
}

function pyramids(rng: Rng): GeneratedQuestion {
  const vol = rng.chance(0.5);
  if (rng.chance(0.6)) {
    // square base: half the side, the height and the slant height form a Pythagorean triple
    const [a, b, c] = rng.pick(TRIPLES.slice(0, 5));
    const [half, h] = rng.chance(0.5) ? [a, b] : [b, a];
    const side = 2 * half;
    const V = (side * side * h) / 3;
    const S = side * side + 2 * side * c;
    return q({
      prompt: vol
        ? `A right pyramid has a square base of side ${cm(side)} and a perpendicular height of ${cm(h)}. Calculate its volume.${Number.isInteger(V) ? '' : ` ${ROUND}`}`
        : `A right pyramid has a square base of side ${cm(side)} and a perpendicular height of ${cm(h)}. Calculate its total surface area.`,
      figure: solid('square-pyramid', `A right pyramid on a square base of side ${side} centimetres, with height ${h} centimetres.`, { side: cm(side), h: cm(h) }),
      value: vol ? V : S,
      unit: vol ? 'cm³' : 'cm²',
      answerDisplay: `$${tx(vol ? V : S, Number.isInteger(vol ? V : S) ? 0 : 2)}\\ \\text{cm}^${vol ? 3 : 2}$`,
      hints: vol ? ['$V = \\tfrac{1}{3} \\times$ area of the base $\\times$ height.'] : ['The base, plus four equal triangles. Each triangle\'s height is the slant height of the pyramid.', `The slant height, the height and half the side make a right-angled triangle: $s^2 = ${h}^2 + ${half}^2$.`],
      solution: vol
        ? [`$V = \\tfrac{1}{3} \\times ${side}^2 \\times ${h} = ${tx(V, Number.isInteger(V) ? 0 : 2)}\\ \\text{cm}^3$`]
        : [`Slant height: $s = \\sqrt{${h}^2 + ${half}^2} = ${c}$ cm`, `Four triangles: $4 \\times \\tfrac{1}{2} \\times ${side} \\times ${c} = ${2 * side * c}$`, `$S = ${side}^2 + ${2 * side * c} = ${S}\\ \\text{cm}^2$`],
      wrong: vol
        ? [{ code: 'one-third', value: side * side * h, feedback: 'That is the volume of the prism with the same base and height. A pyramid holds a third of it.' }]
        : [
            { code: 'slant-height', value: side * side + 2 * side * h, feedback: `Each triangular face is ${c} cm high (the slant height), not ${h} cm (the height of the pyramid).` },
            { code: 'surface-area', value: 2 * side * c, feedback: 'You have the four triangles. Add the square base too.' },
          ],
    });
  }
  // equilateral triangle base: volume from the height; surface area from the given slant height
  const side = rng.pick([4, 6, 8, 10, 12]);
  const baseA = (Math.sqrt(3) / 4) * side * side;
  const h = rng.int(5, 15);
  const s = rng.int(Math.ceil(side / 2) + 3, 18);
  const V = (baseA * h) / 3;
  const S = baseA + 3 * 0.5 * side * s;
  return q({
    prompt: vol
      ? `A right pyramid has an equilateral triangle as its base, with sides of ${cm(side)}, and a perpendicular height of ${cm(h)}. Calculate its volume. ${ROUND}`
      : `A right pyramid has an equilateral triangle as its base, with sides of ${cm(side)}. Each sloping face has a slant height of ${cm(s)}. Calculate its total surface area. ${ROUND}`,
    figure: solid('triangular-pyramid', `A right pyramid on an equilateral triangle of side ${side} centimetres, with ${vol ? `height ${h}` : `slant height ${s}`} centimetres.`, vol ? { side: cm(side), h: cm(h) } : { side: cm(side), slant: cm(s) }),
    value: vol ? V : S,
    unit: vol ? 'cm³' : 'cm²',
    answerDisplay: `$${tx(vol ? V : S)}\\ \\text{cm}^${vol ? 3 : 2}$`,
    hints: [`Area of an equilateral triangle with side $a$: $\\tfrac{\\sqrt{3}}{4}a^2$ (or $\\tfrac{1}{2}a^2 \\sin 60°$).`, vol ? '$V = \\tfrac{1}{3} \\times$ area of the base $\\times$ height.' : 'Add the base and the three sloping triangles: each is $\\tfrac{1}{2} \\times$ side $\\times$ slant height.'],
    solution: vol
      ? [`Base: $\\tfrac{\\sqrt{3}}{4}(${side})^2 = ${tx(baseA)}\\ \\text{cm}^2$`, `$V = \\tfrac{1}{3} \\times ${tx(baseA)} \\times ${h} = ${tx(V)}\\ \\text{cm}^3$`]
      : [`Base: $\\tfrac{\\sqrt{3}}{4}(${side})^2 = ${tx(baseA)}\\ \\text{cm}^2$`, `Three faces: $3 \\times \\tfrac{1}{2} \\times ${side} \\times ${s} = ${n(1.5 * side * s)}\\ \\text{cm}^2$`, `$S = ${tx(S)}\\ \\text{cm}^2$`],
    wrong: vol
      ? [
          { code: 'one-third', value: baseA * h, feedback: 'A pyramid holds a third of the prism with the same base and height.' },
          { code: 'surface-area', value: (side * side * h) / 3, feedback: 'The base is a triangle, not a square: its area is $\\tfrac{\\sqrt{3}}{4}a^2$.' },
        ]
      : [{ code: 'surface-area', value: 3 * 0.5 * side * s, feedback: 'You have the three sloping faces. Add the triangular base too.' }],
  });
}

function scaling(rng: Rng): GeneratedQuestion {
  const k = rng.pick([2, 3, 4, 5, 0.5]);
  const kTex = k === 0.5 ? '\\tfrac{1}{2}' : String(k);
  const kWord = k === 0.5 ? 'halved' : k === 2 ? 'doubled' : k === 3 ? 'tripled' : `multiplied by ${k}`;
  const kind = rng.pick(['all-v', 'all-s', 'radius-v', 'height-v', 'value']);
  const opts = (right: number) => [
    { code: 'scale-factor' as const, value: k, feedback: `Multiplying lengths by $${kTex}$ multiplies ${kind === 'all-s' ? 'areas' : 'volumes'} by more than $${kTex}$. Count how many lengths are multiplied together.` },
    { code: 'scale-factor' as const, value: k * k, feedback: 'That is the factor for an area (two lengths multiplied). Check how many scaled lengths the formula multiplies.' },
    { code: 'scale-factor' as const, value: k ** 3, feedback: 'That would be right if all three dimensions were scaled. Check which lengths actually change.' },
  ].filter((w) => Math.abs(w.value - right) > 1e-9);
  if (kind === 'value') {
    const shape = rng.pick(['sphere', 'cone', 'cylinder']);
    const V0 = rng.int(20, 400);
    const V = V0 * k ** 3;
    return q({
      prompt: `A ${shape} has a volume of ${V0} cm³. Every length of the ${shape} is ${kWord}. What is the new volume?`,
      value: V,
      unit: 'cm³',
      answerDisplay: `$${tx(V, Number.isInteger(V) ? 0 : 2)}\\ \\text{cm}^3$`,
      hints: ['Volume multiplies three lengths together, so it is scaled by $k^3$.'],
      solution: [`$V_{\\text{new}} = (${kTex})^3 \\times ${V0} = ${tx(V, Number.isInteger(V) ? 0 : 2)}\\ \\text{cm}^3$`],
      wrong: opts(k ** 3).map((w) => ({ ...w, value: w.value * V0 })),
    });
  }
  const factor = kind === 'all-v' ? k ** 3 : kind === 'all-s' ? k * k : kind === 'radius-v' ? k * k : k;
  const prompt =
    kind === 'all-v'
      ? `The length, width and height of a rectangular prism are all ${kWord}. By what factor is its volume multiplied?`
      : kind === 'all-s'
        ? `The length, width and height of a rectangular prism are all ${kWord}. By what factor is its surface area multiplied?`
        : kind === 'radius-v'
          ? `The radius of a cylinder is ${kWord} and its height stays the same. By what factor is its volume multiplied?`
          : `The height of a cylinder is ${kWord} and its radius stays the same. By what factor is its volume multiplied?`;
  return q({
    prompt,
    value: factor,
    answerDisplay: `$${factor === 0.125 ? '\\tfrac{1}{8}' : factor === 0.25 ? '\\tfrac{1}{4}' : n(factor)}$`,
    hints: [kind === 'radius-v' ? '$V = \\pi r^2 h$: the radius appears twice (it is squared).' : kind === 'height-v' ? '$V = \\pi r^2 h$: the height appears once.' : kind === 'all-s' ? 'Every face is a length × a length.' : 'Volume is length × width × height.'],
    solution: [
      kind === 'radius-v'
        ? `$\\pi (${kTex}r)^2 h = ${k === 0.5 ? '\\tfrac{1}{4}' : k * k}\\pi r^2 h$`
        : kind === 'height-v'
          ? `$\\pi r^2 (${kTex}h) = ${kTex}\\pi r^2 h$`
          : kind === 'all-s'
            ? `$2(${kTex}l \\cdot ${kTex}w + ${kTex}l \\cdot ${kTex}h + ${kTex}w \\cdot ${kTex}h) = (${kTex})^2 \\times 2(lw + lh + wh)$`
            : `$(${kTex}l)(${kTex}w)(${kTex}h) = (${kTex})^3\\, lwh$`,
      `The factor is $${factor === 0.125 ? '\\tfrac{1}{8}' : factor === 0.25 ? '\\tfrac{1}{4}' : n(factor)}$.`,
    ],
    wrong: opts(factor),
  });
}

function composite(rng: Rng): GeneratedQuestion {
  const kind = rng.pick(['cyl-hemi', 'cone-hemi', 'cyl-cone']);
  const vol = rng.chance(0.5);
  if (kind === 'cone-hemi') {
    const [a, b, c] = rng.pick(TRIPLES.slice(0, 5));
    const [r, h] = a < b ? [a, b] : [b, a];
    const V = (1 / 3) * PI * r * r * h + (2 / 3) * PI * r ** 3;
    const S = PI * r * c + 2 * PI * r * r;
    return q({
      prompt: `An ice-cream is a cone of radius ${cm(r)} and height ${cm(h)}, with a hemisphere of ice-cream of the same radius on top. Calculate the ${vol ? 'total volume' : 'outside surface area'}. ${ROUND}`,
      figure: solid('cone-hemisphere', `A cone pointing down, radius ${r} and height ${h} centimetres, with a hemisphere of radius ${r} on top.`, { r: cm(r), h: cm(h) }),
      value: vol ? V : S,
      unit: vol ? 'cm³' : 'cm²',
      answerDisplay: `$${tx(vol ? V : S)}\\ \\text{cm}^${vol ? 3 : 2}$`,
      hints: vol ? ['Add the volume of the cone and the volume of the hemisphere.'] : ['The outside is the curved part of the cone and the curved part of the hemisphere. The circle where they join is inside.', 'The cone\'s curved surface needs its slant height: $s^2 = r^2 + h^2$.'],
      solution: vol
        ? [`Cone: $\\tfrac{1}{3}\\pi (${r})^2(${h})$; hemisphere: $\\tfrac{2}{3}\\pi (${r})^3$`, `$V = ${tx(V)}\\ \\text{cm}^3$`]
        : [`$s = \\sqrt{${r}^2 + ${h}^2} = ${c}$ cm`, `Cone: $\\pi (${r})(${c})$; hemisphere: $2\\pi (${r})^2$`, `$S = ${tx(S)}\\ \\text{cm}^2$`],
      wrong: vol
        ? [{ code: 'composite-solid', value: (1 / 3) * PI * r * r * h + (4 / 3) * PI * r ** 3, feedback: 'The top is a hemisphere, half a sphere: $\\tfrac{2}{3}\\pi r^3$.' }]
        : [
            { code: 'composite-solid', value: S + 2 * PI * r * r, feedback: 'The circles where the cone and hemisphere join are inside the ice-cream. Leave them out.' },
            { code: 'slant-height', value: PI * r * h + 2 * PI * r * r, feedback: `The cone's curved surface uses the slant height, ${c} cm.` },
          ],
    });
  }
  const r = rng.int(2, 10);
  const h1 = rng.int(4, 20);
  if (kind === 'cyl-hemi') {
    const V = PI * r * r * h1 + (2 / 3) * PI * r ** 3;
    const S = PI * r * r + 2 * PI * r * h1 + 2 * PI * r * r;
    return q({
      prompt: `A silo is a cylinder of radius ${cm(r)} and height ${cm(h1)} with a hemisphere of the same radius on top. It stands on the ground. Calculate its ${vol ? 'volume' : 'outside surface area, including the floor'}. ${ROUND}`,
      figure: solid('cylinder-hemisphere', `A cylinder of radius ${r} and height ${h1} centimetres with a hemispherical top.`, { r: cm(r), h: cm(h1) }),
      value: vol ? V : S,
      unit: vol ? 'cm³' : 'cm²',
      answerDisplay: `$${tx(vol ? V : S)}\\ \\text{cm}^${vol ? 3 : 2}$`,
      hints: vol ? ['Cylinder + hemisphere: $\\pi r^2 h + \\tfrac{2}{3}\\pi r^3$.'] : ['Outside: the floor (one circle), the curved side of the cylinder and the curved hemisphere. The circle where they join is inside.'],
      solution: vol ? [`$V = \\pi (${r})^2(${h1}) + \\tfrac{2}{3}\\pi (${r})^3 = ${tx(V)}\\ \\text{cm}^3$`] : [`$S = \\pi (${r})^2 + 2\\pi (${r})(${h1}) + 2\\pi (${r})^2 = ${tx(S)}\\ \\text{cm}^2$`],
      wrong: vol
        ? [{ code: 'composite-solid', value: PI * r * r * h1 + (4 / 3) * PI * r ** 3, feedback: 'The top is half a sphere: $\\tfrac{2}{3}\\pi r^3$, not $\\tfrac{4}{3}\\pi r^3$.' }]
        : [{ code: 'composite-solid', value: S + PI * r * r, feedback: 'The circle where the cylinder meets the hemisphere is inside the silo. Count only the floor.' }],
    });
  }
  const [a, b, c] = rng.pick(TRIPLES.slice(0, 5));
  const [rr, h2] = a < b ? [a, b] : [b, a];
  const V = PI * rr * rr * h1 + (1 / 3) * PI * rr * rr * h2;
  const S = PI * rr * rr + 2 * PI * rr * h1 + PI * rr * c;
  return q({
    prompt: `A pencil-shaped solid is a cylinder of radius ${cm(rr)} and length ${cm(h1)}, with a cone of the same radius and height ${cm(h2)} at one end. Calculate its ${vol ? 'volume' : 'total surface area'}. ${ROUND}`,
    figure: solid('cylinder-cone', `A cylinder of radius ${rr} and height ${h1} centimetres with a cone of height ${h2} centimetres on top.`, { r: cm(rr), h: cm(h1), h2: cm(h2) }),
    value: vol ? V : S,
    unit: vol ? 'cm³' : 'cm²',
    answerDisplay: `$${tx(vol ? V : S)}\\ \\text{cm}^${vol ? 3 : 2}$`,
    hints: vol ? ['Add the cylinder and the cone: $\\pi r^2 h_1 + \\tfrac{1}{3}\\pi r^2 h_2$.'] : ['Outside: one flat circle at the end, the cylinder\'s curved side and the cone\'s curved side.', 'The cone needs its slant height: $s^2 = r^2 + h^2$.'],
    solution: vol
      ? [`$V = \\pi (${rr})^2(${h1}) + \\tfrac{1}{3}\\pi (${rr})^2(${h2}) = ${tx(V)}\\ \\text{cm}^3$`]
      : [`$s = \\sqrt{${rr}^2 + ${h2}^2} = ${c}$ cm`, `$S = \\pi (${rr})^2 + 2\\pi (${rr})(${h1}) + \\pi (${rr})(${c}) = ${tx(S)}\\ \\text{cm}^2$`],
    wrong: vol
      ? [{ code: 'one-third', value: PI * rr * rr * (h1 + h2), feedback: 'The cone holds a third of a cylinder with the same base and height.' }]
      : [
          { code: 'composite-solid', value: S + PI * rr * rr, feedback: 'The circle where the cone meets the cylinder is inside. Count only the flat end.' },
          { code: 'slant-height', value: PI * rr * rr + 2 * PI * rr * h1 + PI * rr * h2, feedback: `The cone's curved surface uses the slant height, ${c} cm, not its height.` },
        ],
  });
}

export const surfaceAreaVolume: QuestionTemplate = {
  id: 'surface-area-volume',
  skillId: 'surface-area-volume',
  generate(rng, level) {
    if (level === 1) return prismsCylinders(rng);
    if (level === 2) return spheresCones(rng);
    if (level === 3) return pyramids(rng);
    if (level === 4) return scaling(rng);
    return composite(rng);
  },
};
