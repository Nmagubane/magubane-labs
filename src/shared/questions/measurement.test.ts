/**
 * Independent check for surface area and volume: every answer is recomputed from the numbers in the prompt
 * and the shape in the figure, with its own formulas.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from './rng.ts';
import { surfaceAreaVolume } from './generators/math-measurement.ts';
import type { Difficulty } from './types.ts';

const PI = Math.PI;
/** Every "12 cm" / "12,5 cm" in the prompt, in order. */
const lengths = (p: string) => [...p.matchAll(/(\d+(?:,\d+)?) cm\b/g)].map((m) => Number((m[1] as string).replace(',', '.')));
/** A TeX number such as 1\,234{,}56 */
const texNumber = (t: string) => Number(t.replace(/\\,/g, '').replace('{,}', '.'));

function expected(prompt: string, shape: string | undefined): number {
  const L = lengths(prompt);
  const vol = /volume/.test(prompt) && !/factor/.test(prompt);
  const radius = (i: number) => (/diameter/.test(prompt) ? (L[i] as number) / 2 : (L[i] as number));
  switch (shape) {
    case 'cuboid': {
      const [l, w, h] = L as [number, number, number];
      return vol ? l * w * h : 2 * (l * w + l * h + w * h);
    }
    case 'triangular-prism': {
      const [a, b, c, l] = L as [number, number, number, number];
      return vol ? (a * b * l) / 2 : a * b + (a + b + c) * l;
    }
    case 'cylinder': {
      const r = radius(0);
      if (/holds/.test(prompt)) {
        const V = texNumber(/\$([\d\\,{}]+)\\ \\text\{cm\}\^3\$/.exec(prompt)?.[1] as string);
        return V / (PI * r * r);
      }
      const h = L[1] as number;
      return vol ? PI * r * r * h : 2 * PI * r * r + 2 * PI * r * h;
    }
    case 'sphere':
    case 'hemisphere': {
      const r = L[0] as number;
      const half = shape === 'hemisphere';
      return vol ? ((half ? 2 : 4) / 3) * PI * r ** 3 : half ? 3 * PI * r * r : 4 * PI * r * r;
    }
    case 'cone': {
      const r = L[0] as number;
      const slantGiven = /slant height/.test(prompt);
      const h = slantGiven ? Math.sqrt((L[1] as number) ** 2 - r * r) : (L[1] as number);
      const s = Math.hypot(r, h);
      return vol ? (PI * r * r * h) / 3 : PI * r * r + PI * r * s;
    }
    case 'square-pyramid': {
      const [a, h] = L as [number, number];
      return vol ? (a * a * h) / 3 : a * a + 4 * 0.5 * a * Math.hypot(h, a / 2);
    }
    case 'triangular-pyramid': {
      const [a, x] = L as [number, number];
      const base = 0.5 * a * a * Math.sin(PI / 3);
      return vol ? (base * x) / 3 : base + 3 * 0.5 * a * x;
    }
    case 'cylinder-hemisphere': {
      const [r, h] = L as [number, number];
      return vol ? PI * r * r * h + (2 / 3) * PI * r ** 3 : PI * r * r + 2 * PI * r * h + 2 * PI * r * r;
    }
    case 'cone-hemisphere': {
      const [r, h] = L as [number, number];
      return vol ? (PI * r * r * h) / 3 + (2 / 3) * PI * r ** 3 : PI * r * Math.hypot(r, h) + 2 * PI * r * r;
    }
    case 'cylinder-cone': {
      const [r, h1, h2] = L as [number, number, number];
      return vol ? PI * r * r * h1 + (PI * r * r * h2) / 3 : PI * r * r + 2 * PI * r * h1 + PI * r * Math.hypot(r, h2);
    }
    default: {
      // scaling: no figure
      const k = /halved/.test(prompt) ? 0.5 : /doubled/.test(prompt) ? 2 : /tripled/.test(prompt) ? 3 : Number(/multiplied by (\d+)/.exec(prompt)?.[1]);
      if (/has a volume of (\d+) cm³/.test(prompt)) return Number(/has a volume of (\d+) cm³/.exec(prompt)?.[1]) * k ** 3;
      if (/radius of a cylinder is/.test(prompt)) return k * k;
      if (/height of a cylinder is/.test(prompt)) return k;
      return /surface area/.test(prompt) ? k * k : k ** 3;
    }
  }
}

test('surface area and volume: every answer matches the solid in the prompt and figure', () => {
  for (let level = 1; level <= 5; level++) {
    for (let seed = 1; seed <= 400; seed++) {
      const q = surfaceAreaVolume.generate(createRng(seed * 7727 + level), level as Difficulty);
      const where = `L${level} seed ${seed}: ${q.prompt}`;
      assert.equal(q.answer.kind, 'numeric', where);
      if (q.answer.kind !== 'numeric') continue;
      const shape = q.figure?.kind === 'solid' ? q.figure.shape : undefined;
      if (level !== 4) assert.ok(shape, `${where}: no figure`);
      const want = expected(q.prompt, shape);
      assert.ok(Math.abs(q.answer.value - want) <= Math.max(0.006, Math.abs(want) * 1e-9), `${where}: ${q.answer.value} ≠ ${want}`);
      for (const m of q.misconceptions) {
        assert.ok(m.answer.kind === 'numeric' && Math.abs(m.answer.value - want) > Math.abs(want) * 0.005, `${where}: mistake ${m.code} is the right answer`);
      }
      // Pyramid bases are squares or equilateral triangles only (CAPS clarification).
      if (shape && /pyramid/.test(shape)) assert.ok(/square base|equilateral triangle/.test(q.prompt), where);
    }
  }
});
