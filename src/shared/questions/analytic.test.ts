import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion } from './registry.ts';
import { equationsEquivalent } from './expr.ts';
import { gradeResponse, canonicalResponse } from './answer.ts';
import type { AnswerSpec } from './types.ts';

const SEEDS = 150;
const LEVELS = [1, 2, 3, 4, 5] as const;

test('equations are graded as equations: any rearrangement, never a different line', () => {
  assert.ok(equationsEquivalent('y = -1/2x + 3', 'x + 2y - 6 = 0'));
  assert.ok(equationsEquivalent('2y = -x + 6', 'y = -0.5x + 3'));
  assert.ok(equationsEquivalent('(x-2)^2+(y+3)^2=25', 'x^2 + y^2 - 4x + 6y - 12 = 0'));
  assert.ok(equationsEquivalent('y = 3,5x + 1', 'y = 7/2*x + 1'));
  assert.ok(!equationsEquivalent('y = 2x + 3', 'y = 2x - 3'));
  assert.ok(!equationsEquivalent('(x-2)^2+(y+3)^2=25', '(x-2)^2+(y+3)^2=5'));
  assert.ok(!equationsEquivalent('y = 2x', 'y = 2x = 3'));
  assert.ok(!equationsEquivalent('y + 2x', 'y = -2x'));
});

test('points are graded exactly, in any written form', () => {
  const spec: AnswerSpec = { kind: 'point', x: { n: 7, d: 2 }, y: { n: -3, d: 1 } };
  assert.equal(gradeResponse(spec, ['3,5', '-3']).correct, true);
  assert.equal(gradeResponse(spec, ['7/2', '−3']).correct, true);
  assert.equal(gradeResponse(spec, '(3.5; -3)').correct, true);
  assert.equal(gradeResponse(spec, ['-3', '3,5']).correct, false);
});

const num = (s: string) => Number(s.replace('−', '-'));
const pts = (prompt: string) => [...prompt.matchAll(/([A-Z])\((-?\d+);\\, (-?\d+)\)/g)].map((m) => ({ id: m[1]!, x: num(m[2]!), y: num(m[3]!) }));

test('analytical geometry answers are mathematically right (checked independently)', () => {
  for (let seed = 1; seed <= SEEDS; seed++) {
    for (const level of LEVELS) {
      const q = generateQuestion('circle-equations', seed, level);
      if (level === 4) {
        // The answer is the line through P perpendicular to CP.
        const g = q.figure!;
        assert.equal(g.kind, 'graph');
        const [C, P] = g.kind === 'graph' ? g.points! : [];
        const u = P!.x - C!.x;
        const v = P!.y - C!.y;
        const mine = `(y - (${P!.y}))*(${v}) = (${-u})*(x - (${P!.x}))`;
        assert.ok(q.answer.kind === 'equation' && equationsEquivalent(q.answer.expr, mine), `circle L4 seed ${seed}`);
      }
      if (level === 2 || level === 5) {
        // The circle passes through every named point on it, and its centre is right.
        const ps = pts(q.prompt).filter((p) => p.id !== 'C');
        assert.ok(q.answer.kind === 'equation');
        const [l, r] = q.answer.expr.split('=');
        for (const p of ps) {
          const f = new Function('x', 'y', `return (${l!.replace(/\^/g, '**')}) - (${r})`);
          assert.ok(Math.abs(f(p.x, p.y)) < 1e-9, `circle L${level} seed ${seed}: ${p.id} not on circle`);
        }
      }
    }
    for (const level of [1, 2, 3] as const) {
      const q = generateQuestion('line-equations', seed, level);
      const P = pts(q.prompt).find((p) => p.id === 'P')!;
      assert.ok(q.answer.kind === 'equation');
      const [l, r] = q.answer.expr.split('=');
      const f = new Function('x', 'y', `return (${l}) - (${r})`);
      assert.ok(Math.abs(f(P.x, P.y)) < 1e-9, `line L${level} seed ${seed}: P not on line`);
    }
    {
      const q = generateQuestion('coordinate-geometry', seed, 1);
      const [A, B] = pts(q.prompt);
      assert.ok(q.answer.kind === 'numeric');
      assert.ok(Math.abs(q.answer.value - Math.hypot(B!.x - A!.x, B!.y - A!.y)) < 1e-9);
    }
  }
});

test('every analytical geometry question is answerable and its predicted mistakes are diagnosed', () => {
  for (const id of ['coordinate-geometry', 'line-equations', 'circle-equations']) {
    for (const level of LEVELS) {
      const prompts = new Set<string>();
      for (let seed = 1; seed <= SEEDS; seed++) {
        const q = generateQuestion(id, seed, level);
        prompts.add(q.prompt);
        assert.equal(gradeResponse(q.answer, canonicalResponse(q.answer), q.misconceptions).correct, true, `${id} L${level} seed ${seed}: canonical answer not accepted`);
        for (const m of q.misconceptions) {
          const r = gradeResponse(q.answer, canonicalResponse(m.answer), q.misconceptions);
          assert.equal(r.correct, false, `${id} L${level} seed ${seed}: a misconception is marked correct`);
          assert.equal(r.mistake, m.code, `${id} L${level} seed ${seed}: misconception ${m.code} not diagnosed`);
        }
      }
      assert.ok(prompts.size >= 10, `${id} L${level}: only ${prompts.size} distinct prompts`);
    }
  }
});
