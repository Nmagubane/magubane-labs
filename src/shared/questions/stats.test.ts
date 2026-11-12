import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion } from './registry.ts';
import type { AnswerSpec } from './types.ts';

const SEEDS = 150;
const val = (a: AnswerSpec) => (a.kind === 'numeric' ? a.value : NaN);
const lists = (s: string) => [...s.matchAll(/: ((?:-?\d+(?:,\d+)?; )+-?\d+(?:,\d+)?)\./g)].map((m) => m[1]!.split('; ').map((x) => Number(x.replace(',', '.'))));
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
const sorted = (v: number[]) => [...v].sort((a, b) => a - b);
const median = (v: number[]) => {
  const s = sorted(v);
  return s.length % 2 ? s[(s.length - 1) / 2]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2;
};

test('summary statistics are right, and both school quartile methods agree on every quartile question', () => {
  for (let seed = 1; seed <= SEEDS; seed++) {
    const q1 = generateQuestion('stats-summary', seed, 1);
    assert.ok(Math.abs(val(q1.answer) - mean(lists(q1.prompt)[0]!)) < 0.006, `L1 s${seed}`);
    const q2 = generateQuestion('stats-summary', seed, 2);
    assert.equal(val(q2.answer), median(lists(q2.prompt)[0]!), `L2 s${seed}`);
    const q3 = generateQuestion('stats-summary', seed, 3);
    const d = sorted(lists(q3.prompt)[0]!);
    const n = d.length;
    // Method A: medians of the halves (median excluded). Method B: positions (n + 1)/4 and 3(n + 1)/4.
    const A = { q1: median(d.slice(0, (n - 1) / 2)), q3: median(d.slice((n + 1) / 2)) };
    const B = { q1: d[(n + 1) / 4 - 1]!, q3: d[(3 * (n + 1)) / 4 - 1]! };
    assert.deepEqual(A, B, `L3 s${seed}: the two methods disagree`);
    const want = /\$Q_1\$/.test(q3.prompt) ? A.q1 : /\$Q_3\$/.test(q3.prompt) ? A.q3 : A.q3 - A.q1;
    assert.equal(val(q3.answer), want, `L3 s${seed}`);
    const q5 = generateQuestion('stats-summary', seed, 5);
    const cls = [...q5.prompt.matchAll(/(\d+) \\le x < (\d+)\$: (\d+)/g)].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])] as const);
    const est = cls.reduce((a, [lo, hi, f]) => a + f * (lo + hi) / 2, 0) / cls.reduce((a, c) => a + c[2], 0);
    assert.ok(Math.abs(val(q5.answer) - est) < 0.006, `L5 s${seed}`);
  }
});

test('spread: σ divides by n, counts and ogive readings match the data, and the outlier is the only one', () => {
  for (let seed = 1; seed <= SEEDS; seed++) {
    const q1 = generateQuestion('stats-spread', seed, 1);
    const v = lists(q1.prompt)[0]!;
    const m = mean(v);
    assert.ok(Math.abs(val(q1.answer) - Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / v.length)) < 0.006, `L1 s${seed}`);
    const q2 = generateQuestion('stats-spread', seed, 2);
    const v2 = lists(q2.prompt)[0]!;
    const m2 = mean(v2);
    const s2 = Math.sqrt(v2.reduce((a, x) => a + (x - m2) ** 2, 0) / v2.length);
    assert.equal(val(q2.answer), v2.filter((x) => Math.abs(x - m2) <= s2).length, `L2 s${seed}`);
    const q3 = generateQuestion('stats-spread', seed, 3);
    const B = Number(/less than (\d+)\?/.exec(q3.prompt)![1]);
    const pts = q3.figure!.kind === 'graph' ? q3.figure!.points! : [];
    assert.equal(val(q3.answer), pts.find((p) => p.x === B)!.y, `L3 s${seed}`);
    const q5 = generateQuestion('stats-spread', seed, 5);
    const d = sorted(lists(q5.prompt)[0]!);
    const n = d.length;
    const Q1 = median(d.slice(0, (n - 1) / 2));
    const Q3 = median(d.slice((n + 1) / 2));
    const out = d.filter((x) => x < Q1 - 1.5 * (Q3 - Q1) || x > Q3 + 1.5 * (Q3 - Q1));
    assert.deepEqual(out, [val(q5.answer)], `L5 s${seed}`);
  }
});

test('regression: a, b and r match an independent calculation; correlation labels match r', () => {
  for (let seed = 1; seed <= SEEDS; seed++) {
    for (const level of [2, 3, 4] as const) {
      const q = generateQuestion('stats-regression', seed, level);
      const [xs, ys] = lists(q.prompt) as [number[], number[]];
      const n = xs.length;
      const Sx = xs.reduce((a, b) => a + b, 0);
      const Sy = ys.reduce((a, b) => a + b, 0);
      const Sxy = xs.reduce((a, x, i) => a + x * ys[i]!, 0);
      const Sxx = xs.reduce((a, x) => a + x * x, 0);
      const Syy = ys.reduce((a, y) => a + y * y, 0);
      const b = (n * Sxy - Sx * Sy) / (n * Sxx - Sx * Sx);
      const a = (Sy - b * Sx) / n;
      const r = (n * Sxy - Sx * Sy) / Math.sqrt((n * Sxx - Sx * Sx) * (n * Syy - Sy * Sy));
      const want = level === 2 ? b : level === 3 ? a : r;
      const tol = q.answer.kind === 'numeric' ? q.answer.tolerance : 0;
      assert.ok(Math.abs(val(q.answer) - want) <= tol, `L${level} s${seed}: ${val(q.answer)} vs ${want}`);
    }
    const q1 = generateQuestion('stats-regression', seed, 1);
    const g = q1.figure!;
    assert.ok(g.kind === 'graph');
    const P = g.kind === 'graph' ? g.points! : [];
    const xs = P.map((p) => p.x);
    const ys = P.map((p) => p.y);
    const mx = mean(xs);
    const my = mean(ys);
    const r = xs.reduce((a, x, i) => a + (x - mx) * (ys[i]! - my), 0) / Math.sqrt(xs.reduce((a, x) => a + (x - mx) ** 2, 0) * ys.reduce((a, y) => a + (y - my) ** 2, 0));
    const id = q1.answer.kind === 'choice' ? q1.answer.id : '';
    const ok = id === 'none' ? Math.abs(r) <= 0.15 : id.startsWith('strong') ? Math.abs(r) >= 0.9 : Math.abs(r) >= 0.35 && Math.abs(r) <= 0.6;
    assert.ok(ok && (id === 'none' || Math.sign(r) === (id.endsWith('+') ? 1 : -1)), `L1 s${seed}: ${id} but r = ${r}`);
  }
});
