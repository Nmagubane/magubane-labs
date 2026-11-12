import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion } from './registry.ts';
import type { AnswerSpec, GeneratedQuestion } from './types.ts';

const SEEDS = 120;
const rad = (d: number) => (d * Math.PI) / 180;
const F = { sin: (d: number) => Math.sin(rad(d)), cos: (d: number) => Math.cos(rad(d)), tan: (d: number) => Math.tan(rad(d)) };

/** The right-hand side of a "y = …" or "f(x) = …" written in the generators' TeX, as a JavaScript function of x. */
function fnOf(tex: string): (x: number) => number {
  let s = tex.replace(/^.*?=/, '').replace(/\\left|\\right|\\,|\\ /g, '').replace(/\^\\circ/g, '').replace(/\{,\}/g, '.');
  s = s.replace(/\\[dt]?frac\{(-?\d+)\}\{(\d+)\}/g, '($1/$2)');
  for (let i = 0; i < 3; i++) s = s.replace(/\\[dt]?frac\{([^{}]+)\}\{([^{}]+)\}/g, '(($1)/($2))');
  s = s.replace(/\(\((-?\d+\/\d+)\)\)/g, '($1)');
  s = s.replace(/\\(sin|cos|tan)\s*(\(\d+\/\d+\)|\d*)\s*(\([^()]*\)|x)/g, (_m, f: string, k: string, arg: string) => `F.${f}(${k || 1}*${arg})`);
  s = s.replace(/(\d+(?:\.\d+)?|x|\([^()]*\))\^\{([^{}]+)\}/g, 'Math.pow($1,($2))').replace(/(\d+(?:\.\d+)?|x|\([^()]*\))\^(\d+|x)/g, 'Math.pow($1,$2)');
  s = s.replace(/\\cdot/g, '*').replace(/(\d|\)|x)\s*(\(|x|F\.|Math)/g, '$1*$2').replace(/\{|\}/g, '');
  return new Function('F', 'x', `return ${s};`).bind(null, F) as (x: number) => number;
}
/** The which-th maths fragment in a prompt that is an equation (contains =). */
const mathOf = (prompt: string, which = 0) => [...prompt.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]!).filter((m) => m.includes('='))[which]!;
const eqHolds = (eq: string, x: number, y: number) => {
  const [l, r] = eq.split('=') as [string, string];
  const g = (e: string) => new Function('x', 'y', `return ${e.replace(/\^/g, '**').replace(/(\d|\))\s*(x|y|\()/g, '$1*$2')};`)(x, y) as number;
  return Math.abs(g(l) - g(r)) < 1e-6;
};
const num = (a: AnswerSpec) => (a.kind === 'numeric' ? a.value : a.kind === 'fraction' ? a.n / a.d : NaN);

test('basic graphs: intercepts, asymptotes and equations agree with the function', () => {
  for (let seed = 1; seed <= SEEDS; seed++) {
    const q1 = generateQuestion('graphs-basic', seed, 1);
    const f1 = fnOf(mathOf(q1.prompt));
    if (q1.answer.kind === 'equation') assert.ok(Math.abs(f1(1e6) - Number(q1.answer.expr.split('=')[1])) < 1e-3, `L1 s${seed} asymptote`);
    else assert.ok(Math.abs(f1(0) - num(q1.answer)) < 1e-9, `L1 s${seed} y-intercept`);
    const q2 = generateQuestion('graphs-basic', seed, 2);
    const f2 = fnOf(mathOf(q2.prompt));
    const xs = q2.answer.kind === 'roots' ? q2.answer.values.map((v) => v.n / v.d) : [num(q2.answer)];
    for (const x of xs) assert.ok(Math.abs(f2(x)) < 1e-9, `L2 s${seed}: f(${x}) = ${f2(x)} for ${mathOf(q2.prompt)}`);
    const q4 = generateQuestion('graphs-basic', seed, 4);
    if (q4.answer.kind === 'equation') {
      const pts = q4.figure!.kind === 'graph' ? q4.figure!.points! : [];
      for (const p of pts) assert.ok(eqHolds(q4.answer.expr, p.x, p.y), `L4 s${seed}: ${q4.answer.expr} misses (${p.x}; ${p.y})`);
    }
    const q5 = generateQuestion('graphs-basic', seed, 5);
    const [f, g] = [fnOf(mathOf(q5.prompt, 0)), fnOf(mathOf(q5.prompt, 1))];
    assert.ok(q5.answer.kind === 'roots');
    for (const v of q5.answer.values) assert.ok(Math.abs(f(v.n) - g(v.n)) < 1e-9, `L5 s${seed}`);
  }
});

test('shifted graphs: turning points, equations, average gradients and axes of symmetry are right', () => {
  for (let seed = 1; seed <= SEEDS; seed++) {
    for (const level of [1, 2] as const) {
      const q = generateQuestion('graphs-shifted', seed, level);
      if (q.answer.kind !== 'point') continue;
      const f = fnOf(mathOf(q.prompt));
      const x = q.answer.x.n / q.answer.x.d;
      const y = q.answer.y.n / q.answer.y.d;
      if (/turning point/.test(q.prompt)) {
        assert.ok(Math.abs(f(x) - y) < 1e-9 && Math.abs(f(x - 1) - f(x + 1)) < 1e-9, `L${level} s${seed}: turning point`);
      } else {
        assert.ok(!Number.isFinite(f(x)) && Math.abs(f(x + 1e7) - y) < 1e-3, `L${level} s${seed}: asymptotes`);
      }
    }
    const q3 = generateQuestion('graphs-shifted', seed, 3);
    for (const p of q3.figure!.kind === 'graph' ? q3.figure!.points! : []) assert.ok(q3.answer.kind === 'equation' && eqHolds(q3.answer.expr, p.x, p.y), `L3 s${seed}`);
    const q4 = generateQuestion('graphs-shifted', seed, 4);
    const f4 = fnOf(mathOf(q4.prompt));
    const [x1, x2] = [Number(mathOf(q4.prompt, 1).split('=')[1]), Number(mathOf(q4.prompt, 2).split('=')[1])];
    assert.ok(Math.abs(num(q4.answer) - (f4(x2) - f4(x1)) / (x2 - x1)) < 1e-9, `L4 s${seed}`);
    const q5 = generateQuestion('graphs-shifted', seed, 5);
    const segs = q5.figure!.kind === 'graph' ? q5.figure!.segments! : [];
    const cy = segs[0]!.y1;
    const cx = segs[1]!.x1;
    assert.ok(q5.answer.kind === 'equation' && eqHolds(q5.answer.expr, cx, cy) && (eqHolds(q5.answer.expr, cx + 1, cy + 1) || eqHolds(q5.answer.expr, cx + 1, cy - 1)), `L5 s${seed}`);
  }
});

function trigAnswerFn(q: GeneratedQuestion) {
  assert.ok(q.answer.kind === 'choice' && q.input.kind === 'choice');
  const id = q.answer.kind === 'choice' ? q.answer.id : '';
  const opt = q.input.kind === 'choice' ? q.input.options.find((o) => o.id === id)! : null;
  return fnOf(opt!.text.slice(1, -1));
}

test('trig graphs: max, min, period and equations match the curves', () => {
  for (let seed = 1; seed <= SEEDS; seed++) {
    const q1 = generateQuestion('trig-graphs', seed, 1);
    const f1 = fnOf(mathOf(q1.prompt));
    const ys = Array.from({ length: 721 }, (_, i) => f1(i / 2));
    const want = /maximum/.test(q1.prompt) ? Math.max(...ys) : /minimum/.test(q1.prompt) ? Math.min(...ys) : (Math.max(...ys) - Math.min(...ys)) / 2;
    assert.ok(Math.abs(num(q1.answer) - want) < 1e-9, `L1 s${seed}`);
    const q2 = generateQuestion('trig-graphs', seed, 2);
    const f2 = fnOf(mathOf(q2.prompt));
    const P = num(q2.answer);
    for (const x of [10, 37, 61]) assert.ok(Math.abs(f2(x + P) - f2(x)) < 1e-6, `L2 s${seed}: not periodic with ${P}`);
    assert.ok([10, 37, 61].some((x) => Math.abs(f2(x + P / 2) - f2(x)) > 1e-3), `L2 s${seed}: ${P} is not the smallest period`);
    for (const level of [3, 4] as const) {
      const q = generateQuestion('trig-graphs', seed, level);
      const f = trigAnswerFn(q);
      const pts = q.figure!.kind === 'graph' ? q.figure!.curves!.flatMap((c) => c.pts) : [];
      for (const [x, y] of pts.filter((_, i) => i % 9 === 0)) assert.ok(Math.abs(f(x) - y) < 0.01, `L${level} s${seed}: curve does not match the answer`);
    }
    const q5 = generateQuestion('trig-graphs', seed, 5);
    if (/reach/.test(q5.prompt)) {
      const f5 = fnOf(mathOf(q5.prompt, 0));
      const xs = Array.from({ length: 361 }, (_, i) => i);
      const ys5 = xs.map(f5);
      const best = /maximum/.test(q5.prompt) ? Math.max(...ys5) : Math.min(...ys5);
      const where = xs.filter((x) => Math.abs(f5(x) - best) < 1e-9);
      assert.ok(q5.answer.kind === 'roots');
      assert.deepEqual(q5.answer.values.map((v) => v.n), where, `L5 s${seed}`);
    }
  }
});

test('inverses and logs: the inverse undoes f, and every value is right', () => {
  for (let seed = 1; seed <= SEEDS; seed++) {
    const q1 = generateQuestion('inverse-log', seed, 1);
    const f = fnOf(mathOf(q1.prompt));
    assert.ok(q1.answer.kind === 'equation');
    const inv = (x: number) => new Function('x', `return ${(q1.answer.kind === 'equation' ? q1.answer.expr : '').split('=')[1]!.replace(/\^/g, '**')};`)(x) as number;
    for (const x of [-3, 0, 2, 7]) assert.ok(Math.abs(f(inv(x)) - x) < 1e-9, `L1 s${seed}`);
    const q2 = generateQuestion('inverse-log', seed, 2);
    const f2 = fnOf(mathOf(q2.prompt));
    const target = Number(/f\^\{-1\}\((\d+)\)/.exec(q2.prompt)![1]);
    assert.ok(Math.abs(f2(num(q2.answer)) - target) < 1e-9 && num(q2.answer) >= 0, `L2 s${seed}`);
    const q3 = generateQuestion('inverse-log', seed, 3);
    const m3 = /\\log_\{(\d+)\} (\\tfrac\{1\}\{(\d+)\}|\d+)/.exec(q3.prompt)!;
    const arg = m3[3] ? 1 / Number(m3[3]) : Number(m3[2]);
    assert.ok(Math.abs(Math.log(arg) / Math.log(Number(m3[1])) - num(q3.answer)) < 1e-9, `L3 s${seed}`);
    const q4 = generateQuestion('inverse-log', seed, 4);
    const t = /\$([^$]+)\$/.exec(q4.prompt)![1]!.replace(/\\log_\{(\d+)\} (\d+)/g, '(Math.log($2)/Math.log($1))').replace(/\\log (\d+)/g, '(Math.log($1)/Math.LN10)');
    const v4 = fnOf(`y = ${t}`)(0);
    assert.ok(Math.abs(v4 - num(q4.answer)) < 1e-9, `L4 s${seed}: ${mathOf(q4.prompt)} = ${v4}`);
    const q5 = generateQuestion('inverse-log', seed, 5);
    const m5 = /(?:(\d+)\\cdot )?(\d+)\^x = (\d+)/.exec(q5.prompt)!;
    const x5 = Math.log(Number(m5[3]) / Number(m5[1] ?? 1)) / Math.log(Number(m5[2]));
    assert.ok(Math.abs(x5 - num(q5.answer)) < 0.006, `L5 s${seed}`);
  }
});
