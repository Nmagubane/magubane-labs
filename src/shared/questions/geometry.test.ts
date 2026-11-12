import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion } from './registry.ts';
import { DIFFICULTIES, type GeometryFigure } from './types.ts';

const IDS = ['quadrilaterals', 'midpoint-theorem', 'circle-theorems', 'cyclic-tangents', 'proportionality'];

/** The angle at `at` between rays to `from` and `to`, in degrees (0–180). */
function angleAt(f: GeometryFigure, at: string, from: string, to: string): number {
  const p = (id: string) => f.points.find((q) => q.id === id)!;
  const v = p(at);
  const a = p(from);
  const b = p(to);
  const u = [a.x - v.x, a.y - v.y];
  const w = [b.x - v.x, b.y - v.y];
  const cos = (u[0]! * w[0]! + u[1]! * w[1]!) / (Math.hypot(u[0]!, u[1]!) * Math.hypot(w[0]!, w[1]!));
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

test('geometry diagrams are drawn to scale: every marked angle matches the drawing', () => {
  for (const id of IDS) {
    for (const level of DIFFICULTIES) {
      for (let seed = 1; seed <= 150; seed++) {
        const q = generateQuestion(id, seed, level);
        const f = q.figure as GeometryFigure | undefined;
        assert.ok(f && f.kind === 'geometry', `${id} L${level}: every question has a diagram`);
        assert.ok(f.alt.length > 10, `${id} L${level}: diagram has alt text`);
        const ids = new Set(f.points.map((p) => p.id));
        for (const s of f.segments ?? []) assert.ok(ids.has(s.a) && ids.has(s.b), `${id} L${level}: segment ${s.a}${s.b} uses known points`);
        for (const g of f.angles ?? []) {
          const actual = angleAt(f, g.at, g.from, g.to);
          if (g.right) assert.ok(Math.abs(actual - 90) < 1, `${id} L${level} seed ${seed}: right-angle mark at ${g.at} is ${actual.toFixed(1)}°`);
          const m = g.text.match(/^(\d+(?:\.\d+)?)°$/);
          if (m) assert.ok(Math.abs(actual - Number(m[1])) < 1.5, `${id} L${level} seed ${seed}: ${g.at} marked ${g.text} but drawn ${actual.toFixed(1)}°`);
        }
        // The marked unknown x must equal the answer in the drawing too, for angle questions.
        const xMark = (f.angles ?? []).find((g) => g.text === 'x');
        if (xMark && q.answer.kind === 'numeric' && q.input.kind === 'numeric' && q.input.unit === '°') {
          const actual = angleAt(f, xMark.at, xMark.from, xMark.to);
          assert.ok(Math.abs(actual - q.answer.value) < 1.5, `${id} L${level} seed ${seed}: x drawn as ${actual.toFixed(1)}° but the answer is ${q.answer.value}°`);
        }
      }
    }
  }
});
