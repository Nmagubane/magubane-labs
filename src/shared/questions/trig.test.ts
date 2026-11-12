import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion } from './registry.ts';
import { exactTrig } from './generators/math-trig.ts';
import { toNumber } from './rational.ts';
import type { AnswerSpec, GeneratedQuestion } from './types.ts';

const SEEDS = 150;
const LEVELS = [1, 2, 3, 4, 5] as const;
const r = (d: number) => (d * Math.PI) / 180;
const F = { sin: (d: number) => Math.sin(r(d)), cos: (d: number) => Math.cos(r(d)), tan: (d: number) => Math.tan(r(d)) };

/** Turn the TeX the generators write into JavaScript, so each question can be checked numerically. */
function texToJs(tex: string): string {
  let s = tex.replace(/\\left|\\right|\\,|\\ |\\;/g, ' ').replace(/\^\\circ/g, '');
  for (let i = 0; i < 3; i++) s = s.replace(/\\[dt]?frac\{([^{}]+)\}\{([^{}]+)\}/g, '(($1)/($2))');
  s = s.replace(/\\(sin|cos|tan)(?:\^(\d))?\s*(\(([^()]*)\)|(-?\d+(?:\.\d+)?)?\s*x|-?\d+(?:\.\d+)?)/g, (_m, fn: string, pow: string | undefined, arg: string) => {
    let a = arg.trim();
    if (a.startsWith('(')) a = a.slice(1, -1);
    else if (a.endsWith('x')) a = a.length > 1 ? `${a.slice(0, -1).trim()}*x` : 'x';
    return `(F.${fn}(${a}))${pow ? `**${pow}` : ''}`;
  });
  s = s.replace(/\\times|\\cdot/g, '*').replace(/\{,\}/g, '.').replace(/\{|\}/g, '');
  s = s.replace(/(\d|\))\s*(\(|F\.)/g, '$1*$2').replace(/\^/g, '**');
  return s;
}
const evalTex = (tex: string, x = 0, p = 0): number => new Function('F', 'x', 'p', `return ${texToJs(tex)};`)(F, x, p) as number;
const lastMath = (prompt: string) => {
  const m = [...prompt.matchAll(/\$([^$]+)\$/g)];
  return m[m.length - 1]![1]!.replace(/^\\ /, '');
};
const ansNum = (a: AnswerSpec): number => (a.kind === 'fraction' ? a.n / a.d : a.kind === 'numeric' ? a.value : NaN);

test('exact values agree with the calculator for every multiple of 15°', () => {
  for (let a = -720; a <= 720; a += 15) for (const fn of ['sin', 'cos', 'tan'] as const) {
    const v = exactTrig(fn, a);
    if (v) assert.ok(Math.abs(toNumber(v) - F[fn](a)) < 1e-9, `${fn} ${a}`);
  }
});

test('evaluate-questions: the stored answer is the value of the expression', () => {
  const cases: [string, number[]][] = [['trig-special', [1]], ['trig-reduction', [1, 2]], ['compound-angles', [1, 2]]];
  for (const [id, levels] of cases) for (const level of levels) for (let seed = 1; seed <= SEEDS; seed++) {
    const q = generateQuestion(id, seed, level as 1);
    const v = evalTex(lastMath(q.prompt));
    assert.ok(Math.abs(v - ansNum(q.answer)) < 1e-9, `${id} L${level} s${seed}: ${lastMath(q.prompt)} = ${v}, answer ${ansNum(q.answer)}`);
  }
  for (let seed = 1; seed <= SEEDS; seed++) {
    const q = generateQuestion('trig-reduction', seed, 3);
    const m = /\\(sin|cos) (\d+)\^\\circ = p/.exec(q.prompt)!;
    const p = F[m[1] as 'sin' | 'cos'](Number(m[2]));
    const expr = /write \$(.+)\$ in terms/.exec(q.prompt)![1]!;
    assert.ok(q.answer.kind === 'expression');
    const coef = Number(q.answer.expr.replace(/p$/, '').replace(/^-$/, '-1').replace(/^$/, '1'));
    assert.ok(Math.abs(evalTex(expr) - coef * p) < 1e-9, `reduction L3 s${seed}`);
  }
});

function checkRoots(q: GeneratedQuestion, label: string) {
  const eq = lastMath(q.prompt);
  const [l, rr] = eq.split('=') as [string, string];
  const f = (x: number) => evalTex(l, x) - evalTex(rr, x);
  const iv = /\$(-?\d+)\^\\circ \\le x \\le (\d+)\^\\circ\$/.exec(q.prompt)!;
  const lo = Number(iv[1]);
  const hi = Number(iv[2]);
  assert.ok(q.answer.kind === 'roots');
  const xs = q.answer.values.map((v) => v.n / v.d);
  for (const x of xs) {
    assert.ok(x >= lo && x <= hi, `${label}: ${x} outside [${lo}; ${hi}]`);
    assert.ok(Math.abs(f(x)) < 0.02 * (1 + Math.abs(evalTex(l, x))), `${label}: f(${x}) = ${f(x)} for ${eq}`);
  }
  // Nothing missing: every exact zero on a 0,5° grid is in the answer (exact equations land on that grid).
  for (let x = lo; x <= hi; x += 0.5) if (Math.abs(f(x)) < 1e-9) assert.ok(xs.some((s) => Math.abs(s - x) < 1e-6), `${label}: ${x} solves ${eq} but is missing`);
}

test('equations: every root solves the equation, and none is missing', () => {
  for (let seed = 1; seed <= SEEDS; seed++) for (const level of [1, 2, 4, 5] as const) checkRoots(generateQuestion('trig-equations', seed, level), `equations L${level} s${seed}`);
});

test('triangle rules: answers match the triangle that is drawn', () => {
  for (let seed = 1; seed <= SEEDS; seed++) for (const level of LEVELS) {
    const q = generateQuestion('triangle-rules', seed, level);
    const g = q.figure!;
    assert.equal(g.kind, 'geometry');
    if (g.kind !== 'geometry') continue;
    const P = Object.fromEntries(g.points.map((p) => [p.id, p]));
    const d = (u: string, v: string) => Math.hypot(P[u]!.x - P[v]!.x, P[u]!.y - P[v]!.y);
    const ang = (v: string, a: string, b: string) => (Math.acos(((P[a]!.x - P[v]!.x) * (P[b]!.x - P[v]!.x) + (P[a]!.y - P[v]!.y) * (P[b]!.y - P[v]!.y)) / (d(v, a) * d(v, b))) * 180) / Math.PI;
    const want = level === 1 ? 0.5 * d('A', 'B') * d('A', 'C') * Math.sin(r(ang('A', 'B', 'C'))) : level === 2 ? d('A', 'C') : level === 3 ? ang('B', 'A', 'C') : level === 4 ? d('B', 'C') : ang('A', 'B', 'C');
    assert.ok(Math.abs(ansNum(q.answer) - want) < 0.06, `triangle L${level} s${seed}: answer ${ansNum(q.answer)}, drawn ${want}`);
    for (const m of g.angles ?? []) if (/^\d+°$/.test(m.text)) assert.ok(Math.abs(ang(m.at, m.from, m.to) - Number(m.text.slice(0, -1))) < 0.05, `triangle L${level} s${seed}: angle ${m.at}`);
  }
});
