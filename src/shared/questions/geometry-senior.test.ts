/**
 * Grades 7–9 geometry: every diagram is measured, and answers are recomputed from what the learner sees, not from the
 * generators' working.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion } from './registry.ts';
import { DIFFICULTIES, type GeneratedQuestion, type GeometryFigure } from './types.ts';
import { SP_REASONS } from './generators/math-geometry-senior.ts';

const IDS = ['straight-line-angles', 'parallel-lines', 'triangle-angles', 'quadrilateral-properties', 'congruent-similar'];
const SEEDS = Number(process.env.SEEDS ?? 300);

type Pt = GeometryFigure['points'][number];
const pt = (f: GeometryFigure, id: string): Pt => {
  const p = f.points.find((q) => q.id === id);
  assert.ok(p, `point ${id} exists`);
  return p;
};
/** The angle at `at` between rays to `from` and `to`, in degrees (0–180). */
function angleAt(f: GeometryFigure, at: string, from: string, to: string): number {
  const v = pt(f, at);
  const a = pt(f, from);
  const b = pt(f, to);
  const u = [a.x - v.x, a.y - v.y];
  const w = [b.x - v.x, b.y - v.y];
  const cos = (u[0]! * w[0]! + u[1]! * w[1]!) / (Math.hypot(u[0]!, u[1]!) * Math.hypot(w[0]!, w[1]!));
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}
const dist = (f: GeometryFigure, a: string, b: string) => Math.hypot(pt(f, a).x - pt(f, b).x, pt(f, a).y - pt(f, b).y);
/** "(3x + 10)°", "(2x − 15)°", "4x°" or "x°" at a given x. */
function evalLabel(text: string, x: number): number | null {
  const m = text.match(/^\(?(\d*)x(?: ([+−]) (\d+))?\)?°$/);
  if (!m) return null;
  const p = m[1] ? Number(m[1]) : 1;
  const q = m[3] ? Number(m[3]) * (m[2] === '−' ? -1 : 1) : 0;
  return p * x + q;
}
const lengthLabel = (text?: string) => {
  const m = text?.match(/^(\d+(?:,\d+)?) (cm|m)$/);
  return m ? Number(m[1]!.replace(',', '.')) : null;
};

function each(fn: (q: GeneratedQuestion, where: string, id: string, level: number) => void) {
  for (const id of IDS) for (const level of DIFFICULTIES) for (let seed = 1; seed <= SEEDS; seed++) fn(generateQuestion(id, seed, level), `${id} L${level} seed ${seed}`, id, level);
}

test('Grades 7–9 geometry: every marked angle and the unknown match the drawing', () => {
  each((q, where) => {
    const f = q.figure as GeometryFigure | undefined;
    if (!f) return;
    assert.equal(f.kind, 'geometry', where);
    assert.ok(f.alt.length > 20, `${where}: alt text`);
    const ids = new Set(f.points.map((p) => p.id));
    assert.equal(ids.size, f.points.length, `${where}: point ids are unique`);
    for (const s of f.segments ?? []) assert.ok(ids.has(s.a) && ids.has(s.b), `${where}: segment ${s.a}${s.b} uses known points`);
    const solvesX = q.input.kind === 'numeric' && q.input.unit === '' && q.answer.kind === 'numeric';
    for (const g of f.angles ?? []) {
      const actual = angleAt(f, g.at, g.from, g.to);
      if (g.right) assert.ok(Math.abs(actual - 90) < 1, `${where}: right-angle mark at ${g.at} is drawn ${actual.toFixed(1)}°`);
      const n = g.text.match(/^(\d+)°$/);
      if (n) assert.ok(Math.abs(actual - Number(n[1])) < 1.5, `${where}: ${g.at} marked ${g.text} but drawn ${actual.toFixed(1)}°`);
      if (g.text === 'x' && q.input.kind === 'numeric' && q.input.unit === '°' && q.answer.kind === 'numeric') {
        assert.ok(Math.abs(actual - q.answer.value) < 1.5, `${where}: x drawn as ${actual.toFixed(1)}° but the answer is ${q.answer.value}°`);
      }
      if (solvesX && q.answer.kind === 'numeric') {
        const v = evalLabel(g.text, q.answer.value);
        if (v !== null) assert.ok(Math.abs(actual - v) < 1.5, `${where}: ${g.text} at x = ${q.answer.value} is ${v}° but drawn ${actual.toFixed(1)}°`);
      }
    }
    if (solvesX) assert.ok((f.angles ?? []).some((g) => evalLabel(g.text, 1) !== null), `${where}: a solve-for-x question shows its expressions`);
  });
});

test('Grades 7–9 geometry: labelled lengths are to scale, and the unknown length is the answer', () => {
  each((q, where) => {
    const f = q.figure as GeometryFigure | undefined;
    if (!f) return;
    const labelled = (f.segments ?? []).filter((s) => lengthLabel(s.text) !== null);
    if (!labelled.length) return;
    const scales = labelled.map((s) => dist(f, s.a, s.b) / lengthLabel(s.text)!);
    const scale = scales[0]!;
    for (const [i, s] of labelled.entries()) assert.ok(Math.abs(scales[i]! / scale - 1) < 0.02, `${where}: ${s.a}${s.b} labelled ${s.text} is not to scale`);
    const unknown = (f.segments ?? []).find((s) => s.text === '?');
    if (unknown && q.answer.kind === 'numeric') {
      const drawn = dist(f, unknown.a, unknown.b) / scale;
      assert.ok(Math.abs(drawn / q.answer.value - 1) < 0.02, `${where}: ? is drawn ${drawn.toFixed(2)} but the answer is ${q.answer.value}`);
    }
  });
});

test('Grades 7–9 geometry: tick marks mean equal lengths and arrows mean parallel lines', () => {
  each((q, where) => {
    const f = q.figure as GeometryFigure | undefined;
    if (!f) return;
    for (const t of [1, 2] as const) {
      const ticked = (f.segments ?? []).filter((s) => s.ticks === t).map((s) => dist(f, s.a, s.b));
      for (const len of ticked) assert.ok(Math.abs(len / ticked[0]! - 1) < 0.01, `${where}: segments with ${t} tick(s) are not equal`);
      const arrowed = (f.segments ?? []).filter((s) => s.arrows === t).map((s) => Math.atan2(pt(f, s.b).y - pt(f, s.a).y, pt(f, s.b).x - pt(f, s.a).x));
      for (const a of arrowed) {
        const d = Math.abs(Math.sin(a - arrowed[0]!));
        assert.ok(d < 0.005, `${where}: segments with ${t} arrow(s) are not parallel`);
      }
    }
  });
});

test('Grades 7–9 geometry: every question has hints, working and diagnosed mistakes', () => {
  each((q, where) => {
    assert.ok(q.hints.length >= 1, `${where}: hints`);
    assert.ok(q.solution.length >= 1, `${where}: working`);
    assert.ok(q.misconceptions.length >= 1, `${where}: at least one predicted mistake`);
    for (const m of q.misconceptions) {
      assert.ok(m.feedback.length > 20, `${where}: feedback explains the mistake`);
      assert.notDeepEqual(m.answer, q.answer, `${where}: a predicted mistake is not the right answer`);
    }
    if (q.input.kind === 'choice' && q.answer.kind === 'choice') {
      const ids = q.input.options.map((o) => o.id);
      assert.equal(new Set(ids).size, ids.length, `${where}: option ids are unique`);
      assert.ok(ids.includes(q.answer.id), `${where}: the answer is offered`);
      assert.equal(q.misconceptions.length, ids.length - 1, `${where}: every wrong option is diagnosed`);
    }
    if (q.answer.kind === 'numeric') assert.ok(q.answer.value > 0 && Number.isFinite(q.answer.value), `${where}: answer is a positive number`);
  });
});

test('Grades 7–9 geometry: reason questions offer one right reason from the Senior Phase list', () => {
  const texts = new Set<string>(Object.values(SP_REASONS).map((r) => r.text));
  each((q, where) => {
    if (q.input.kind !== 'choice' || q.answer.kind !== 'choice' || !/Which reason/.test(q.prompt)) return;
    for (const o of q.input.options) assert.ok(texts.has(o.text), `${where}: ${o.text} is a known reason`);
  });
});

// ---------------------------------------------------------------------------
// Quadrilaterals: descriptions are checked against a table of properties, and marked drawings are named from the marks.
type Props = { par: number; allSides: boolean; adj: boolean; right: boolean; eq: boolean; perp: boolean; bisectBoth: boolean; bisectOne: boolean };
/** What is true of EVERY shape of each kind. */
const Q: Record<string, Props> = {
  trapezium: { par: 1, allSides: false, adj: false, right: false, eq: false, perp: false, bisectBoth: false, bisectOne: false },
  kite: { par: 0, allSides: false, adj: true, right: false, eq: false, perp: true, bisectBoth: false, bisectOne: true },
  parallelogram: { par: 2, allSides: false, adj: false, right: false, eq: false, perp: false, bisectBoth: true, bisectOne: false },
  rectangle: { par: 2, allSides: false, adj: false, right: true, eq: true, perp: false, bisectBoth: true, bisectOne: false },
  rhombus: { par: 2, allSides: true, adj: true, right: false, eq: false, perp: true, bisectBoth: true, bisectOne: false },
  square: { par: 2, allSides: true, adj: true, right: true, eq: true, perp: true, bisectBoth: true, bisectOne: false },
};
const DESCRIBED: Record<string, (p: Props) => boolean> = {
  'It has only one pair of opposite sides parallel.': (p) => p.par === 1,
  'Exactly one pair of its opposite sides is parallel.': (p) => p.par === 1,
  'It has two pairs of equal adjacent sides.': (p) => p.adj,
  'Two pairs of adjacent sides are equal, but its sides are not all equal.': (p) => p.adj && !p.allSides,
  'Both pairs of opposite sides are parallel.': (p) => p.par === 2,
  'Both pairs of opposite sides are parallel, its sides are not all equal and it has no right angles.': (p) => p.par === 2 && !p.allSides && !p.right,
  'It is a parallelogram with a right angle.': (p) => p.par === 2 && p.right,
  'It has four right angles, but its sides are not all equal.': (p) => p.right && !p.allSides,
  'It is a parallelogram with all four sides equal.': (p) => p.par === 2 && p.allSides,
  'All four sides are equal, but it has no right angles.': (p) => p.allSides && !p.right,
  'All four sides are equal and all four angles are right angles.': (p) => p.allSides && p.right,
  'It is a rhombus with a right angle.': (p) => p.allSides && p.par === 2 && p.right,
  'The diagonals bisect each other at right angles, but they are not equal.': (p) => p.bisectBoth && p.perp && !p.eq,
  'The diagonals are equal and bisect each other, but they are not perpendicular.': (p) => p.eq && p.bisectBoth && !p.perp,
  'The diagonals are perpendicular, and only one of them is bisected by the other.': (p) => p.perp && p.bisectOne && !p.bisectBoth,
  'The diagonals are equal, perpendicular and bisect each other.': (p) => p.eq && p.perp && p.bisectBoth,
  'The diagonals bisect each other, but they are neither equal nor perpendicular.': (p) => p.bisectBoth && !p.eq && !p.perp,
};

/** The most specific name the marks prove, read only from the marks. */
function nameFromMarks(f: GeometryFigure): string {
  const segs = f.segments ?? [];
  const sideIds = ['AB', 'BC', 'CD', 'AD'];
  const sides = segs.filter((s) => sideIds.includes([s.a, s.b].sort().join('')));
  const rightsAtCorners = (f.angles ?? []).filter((g) => g.right && 'ABCD'.includes(g.at)).length;
  const half = (u: string) => segs.find((s) => [s.a, s.b].sort().join('') === [u, 'M'].sort().join(''))?.ticks ?? 0;
  if (f.points.some((p) => p.id === 'M')) {
    const [am, mc, bm, md] = [half('A'), half('C'), half('B'), half('D')];
    const acBisected = am > 0 && am === mc;
    const bdBisected = bm > 0 && bm === md;
    const equal = acBisected && bdBisected && am === bm;
    const perp = (f.angles ?? []).some((g) => g.at === 'M' && g.right);
    if (acBisected && bdBisected) return equal ? (perp ? 'square' : 'rectangle') : perp ? 'rhombus' : 'parallelogram';
    if (perp && (acBisected || bdBisected)) return 'kite';
    throw new Error('diagonal marks name nothing');
  }
  const ticks = sides.map((s) => s.ticks ?? 0);
  const allEqual = ticks.every((t) => t > 0 && t === ticks[0]);
  if (allEqual) return rightsAtCorners ? 'square' : 'rhombus';
  if (rightsAtCorners === 4) return 'rectangle';
  const tick = (id: string) => sides.find((s) => [s.a, s.b].sort().join('') === id)?.ticks ?? 0;
  const adjPairs = (tick('AB') > 0 && tick('AB') === tick('AD') && tick('BC') > 0 && tick('BC') === tick('CD')) || (tick('AB') > 0 && tick('AB') === tick('BC') && tick('CD') > 0 && tick('CD') === tick('AD'));
  if (adjPairs) return 'kite';
  const arrows = sides.filter((s) => s.arrows).length;
  if (arrows === 4) return 'parallelogram';
  if (arrows === 2) return 'trapezium';
  throw new Error('side marks name nothing');
}

test('quadrilaterals: the described shape is the answer, no other offered shape fits, and named shapes are not offered', () => {
  for (const level of [1, 3] as const) {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const q = generateQuestion('quadrilateral-properties', seed, level);
      assert.ok(q.input.kind === 'choice' && q.answer.kind === 'choice');
      if (q.figure) {
        assert.equal(q.answer.id, nameFromMarks(q.figure as GeometryFigure), `L${level} seed ${seed}: named from the marks`);
        continue;
      }
      const desc = q.prompt.match(/\*\*(.+)\*\*/)?.[1] ?? '';
      const rule = DESCRIBED[desc];
      assert.ok(rule, `L${level} seed ${seed}: description is in the property table: ${desc}`);
      const fits = q.input.options.filter((o) => rule(Q[o.id]!)).map((o) => o.id);
      assert.deepEqual(fits, [q.answer.id], `L${level} seed ${seed}: ${desc} fits ${fits.join(', ')}`);
      for (const o of q.input.options) if (o.id !== q.answer.id) assert.ok(!desc.toLowerCase().includes(o.id), `L${level} seed ${seed}: ${o.id} is named in the description`);
    }
  }
});

// ---------------------------------------------------------------------------
// Congruence and similarity: decided from the drawing and the marks.
const sidesOf = (f: GeometryFigure, ids: string[]) => [dist(f, ids[0]!, ids[1]!), dist(f, ids[1]!, ids[2]!), dist(f, ids[2]!, ids[0]!)].sort((a, b) => a - b);
const close = (a: number, b: number) => Math.abs(a / b - 1) < 0.01;

test('congruence conditions are read off the marks, and the triangles really are congruent (or only similar)', () => {
  for (let seed = 1; seed <= SEEDS; seed++) {
    const q = generateQuestion('congruent-similar', seed, 1);
    const f = q.figure as GeometryFigure;
    assert.ok(q.answer.kind === 'choice');
    const first = ['A', 'B', 'C'];
    const sides = (f.segments ?? []).filter((s) => first.includes(s.a) && first.includes(s.b) && lengthLabel(s.text) !== null);
    const angles = (f.angles ?? []).filter((g) => first.includes(g.at) && /^\d+°$/.test(g.text));
    const right = (f.angles ?? []).some((g) => first.includes(g.at) && g.right);
    let expected: string;
    if (right && sides.length === 2) expected = 'RHS';
    else if (sides.length === 3) expected = 'SSS';
    else if (sides.length === 2 && angles.length === 1) {
      const at = angles[0]!.at;
      assert.ok(sides.every((s) => s.a === at || s.b === at), `seed ${seed}: the angle is between the two sides`);
      expected = 'SAS';
    } else if (sides.length === 1 && angles.length === 2) expected = 'AAS';
    else if (sides.length === 0 && angles.length === 2) expected = 'none';
    else throw new Error(`seed ${seed}: unexpected marks`);
    assert.equal(q.answer.id, expected, `seed ${seed}`);
    const a = sidesOf(f, first);
    const b = sidesOf(f, ['P', 'Q', 'R']);
    if (expected === 'none') assert.ok(!close(a[0]!, b[0]!) && close(b[0]! / a[0]!, b[2]! / a[2]!), `seed ${seed}: similar but a different size`);
    else assert.ok(a.every((v, i) => close(v, b[i]!)), `seed ${seed}: the drawn triangles are congruent`);
  }
});

test('congruent, similar or neither: the verdict matches the drawn triangles', () => {
  for (let seed = 1; seed <= SEEDS; seed++) {
    const q = generateQuestion('congruent-similar', seed, 4);
    const f = q.figure as GeometryFigure;
    assert.ok(q.answer.kind === 'choice');
    const a = sidesOf(f, ['A', 'B', 'C']);
    const b = sidesOf(f, ['P', 'Q', 'R']);
    const k = b[0]! / a[0]!;
    const similar = close(b[1]! / a[1]!, k) && close(b[2]! / a[2]!, k);
    const verdict = similar ? (Math.abs(k - 1) < 0.01 ? 'congruent' : 'similar') : 'neither';
    assert.equal(q.answer.id, verdict, `seed ${seed}`);
  }
});

test('matching vertices: the answer follows the order of the letters, and the naive match is a different length', () => {
  for (let seed = 1; seed <= SEEDS; seed++) {
    const q = generateQuestion('congruent-similar', seed, 2);
    const m = q.prompt.match(/\\triangle ABC \\equiv \\triangle ([PQR]{3})\$\. Find \$([PQR])([PQR])\$/);
    assert.ok(m && q.answer.kind === 'numeric', `seed ${seed}: ${q.prompt}`);
    const order = m[1]!;
    const pre = (L: string) => 'ABC'[order.indexOf(L)]!;
    const f = q.figure as GeometryFigure;
    const label = (u: string, v: string) => lengthLabel((f.segments ?? []).find((s) => [s.a, s.b].sort().join('') === [u, v].sort().join(''))?.text);
    assert.equal(q.answer.value, label(pre(m[2]!), pre(m[3]!)), `seed ${seed}`);
    assert.notEqual(label('ABC'['PQR'.indexOf(m[2]!)]!, 'ABC'['PQR'.indexOf(m[3]!)]!), q.answer.value, `seed ${seed}: naive match differs`);
  }
});
