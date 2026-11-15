/**
 * Surds, patterns and series, checked against the prompt:
 * - surds: the prompt's expression is evaluated numerically and must equal the answer, which must be in simplest form;
 *   equations are solved by trying every whole number in a wide range (all their solutions are whole numbers);
 * - patterns: the listed terms are read back, their differences checked, and every answer recomputed from them;
 * - series: sums are added up term by term (sums to infinity to 3 000 terms), and convergence is tested value by value.
 * The surd engine itself is also tested directly, including the forms it must refuse as "not simplest".
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion } from './registry.ts';
import { DIFFICULTIES, type GeneratedQuestion, type IneqInterval } from './types.ts';
import { parseFormula, evaluate } from './formula.ts';
import { fromTerms, surdValue, parseSurd, squareFree } from './surd.ts';
import { fromWire, contains } from './inequality.ts';
import { gradeResponse } from './answer.ts';

const SEEDS = 300;
const EPS = 1e-9;

function plain(tex: string): string {
  let s = tex.replace(/\\left|\\right|\\displaystyle|\\,|\\;/g, '').replace(/\\cdot|\\times/g, '*').replace(/\\pi/g, 'π');
  for (let i = 0; i < 6; i++) s = s.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))').replace(/\\sqrt\{([^{}]*)\}/g, '√($1)');
  return s.replace(/\{/g, '(').replace(/\}/g, ')');
}
const ev = (tex: string, env: Record<string, number> = {}) => evaluate(parseFormula(plain(tex)), env);
const maths = (prompt: string) => [...prompt.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]!);
const ints = (s: string) => [...s.matchAll(/-?\d+/g)].map((m) => Number(m[0]));
const value = (q: GeneratedQuestion) => {
  const a = q.answer;
  if (a.kind === 'numeric') return a.value;
  if (a.kind === 'fraction') return a.n / a.d;
  if (a.kind === 'surd') return surdValue(fromTerms(a.terms));
  throw new Error(`unexpected ${a.kind}`);
};
const close = (a: number, b: number, label: string) => assert.ok(Math.abs(a - b) < 1e-7 * Math.max(1, Math.abs(b)), `${label}: ${a} vs ${b}`);
function each(id: string, check: (q: GeneratedQuestion, level: number, label: string) => void) {
  for (const level of DIFFICULTIES) for (let seed = 0; seed < SEEDS; seed++) check(generateQuestion(id, seed, level), level, `${id} L${level} seed ${seed}`);
}
/** The terms listed as "3;\ 7;\ 11;\ \dots". */
const listed = (prompt: string) => {
  const m = maths(prompt).find((t) => t.includes('\\dots') && t.includes(';'));
  assert.ok(m, `no pattern in ${prompt}`);
  return m.split(';').filter((t) => !t.includes('dots')).map((t) => Number(t.replace(/\\ /g, '').trim()));
};

// ---------------------------------------------------------------------------

test('surd engine: values, and what counts as simplest form', () => {
  const simplest = (s: string) => parseSurd(s).problem === null;
  for (const s of ['6√2', '-1 - √3', '√2/2', '(3 + √3)/2', '3/2 + √6/2', '-√2/4', '8 + 2√15', '1/8', '-5']) assert.ok(simplest(s), s);
  for (const s of ['√72', '2√18', '1/√2', '(6 + 2√3)/4', '2√3 + √3', '√16', '27^(1/2)', '2(3 + √5)', '(2 + √3)(1 - √3)', '3/(2 - √3)']) assert.ok(!simplest(s), s);
  // Values are exact: the same number however it is written.
  for (const [a, b] of [['√72', '6√2'], ['3/(2 - √3)', '6 + 3√3'], ['(√5 + √3)^2', '8 + 2√15'], ['8^(2/3)', '4'], ['16^(-3/4)', '1/8'], ['1/√2', '√2/2']]) {
    assert.equal(surdValue(parseSurd(a!).value).toFixed(12), surdValue(parseSurd(b!).value).toFixed(12), `${a} = ${b}`);
  }
  const ans = { kind: 'surd' as const, terms: [{ r: 2, n: 6, d: 1 }], requireSimplest: true };
  assert.ok(gradeResponse(ans, '6√2').correct);
  assert.ok(gradeResponse(ans, '6sqrt(2)').correct);
  assert.equal(gradeResponse(ans, '√72').mistake, 'unsimplified');
  assert.equal(gradeResponse(ans, '2√18').mistake, 'unsimplified');
  assert.ok(!gradeResponse(ans, '36√2').correct);
  assert.ok('parseError' in gradeResponse(ans, '6√x'));
});

test('surds: answers equal the expression in the prompt, in simplest form; equations by trying every whole number', () => {
  each('surds', (q, level, label) => {
    const p = q.prompt;
    if (q.answer.kind === 'choice' && q.input.kind === 'choice') {
      const n = ints(maths(p)[0]!)[0]!;
      const lo = Number(/^p(\d+)$/.exec(q.answer.id)![1]);
      return assert.ok(lo * lo < n && n < (lo + 1) ** 2, label);
    }
    if (q.answer.kind === 'surd') {
      for (const t of q.answer.terms) assert.ok(t.r === 1 || squareFree(t.r), `${label}: radicand ${t.r}`);
      return close(value(q), ev(maths(p)[0]!), `${label}: ${p}`);
    }
    // Equations (level 5).
    assert.equal(q.answer.kind, 'roots', label);
    if (q.answer.kind !== 'roots') return;
    const eq = maths(p).find((t) => t.includes('='))!;
    const [l, r] = eq.split('=');
    const sols: number[] = [];
    for (let x = -200; x <= 4000; x++) {
      const g = ev(l!, { x }) - ev(r!, { x });
      if (Number.isFinite(g) && Math.abs(g) < EPS) sols.push(x);
    }
    assert.deepEqual(q.answer.values.map((v) => v.n / v.d), sols, `${label}: ${eq}`);
  });
});

test('linear patterns: recomputed from the listed terms', () => {
  each('linear-patterns', (q, level, label) => {
    const p = q.prompt;
    if (level <= 3) {
      const t = listed(p);
      const d = t[1]! - t[0]!;
      t.forEach((v, j) => assert.equal(v, t[0]! + j * d, `${label}: not linear`));
      const T = (n: number) => t[0]! + (n - 1) * d;
      if (level === 1) return [1, 2, 3, 7, 50].forEach((n) => close(evaluate(parseFormula((q.answer as { expr: string }).expr), { n }), T(n), label));
      if (level === 2) return assert.equal(value(q), T(Number(/T_\{(\d+)\}/.exec(p)![1])), label);
      const target = ints(maths(p).at(-1)!)[0]!;
      const hits = [...Array(1000).keys()].map((n) => n + 1).filter((n) => T(n) === target);
      return assert.deepEqual([value(q)], hits, label);
    }
    if (level === 4) {
      const ns = ints(p);
      const [t1, , t2, , t3] = ns;
      const d = t2! - t1!;
      assert.equal(t3! - t2!, d, `${label}: context not linear`);
      const T = (n: number) => t1! + (n - 1) * d;
      if (/How many/.test(p)) return assert.equal(value(q), T(ns.at(-1)!), `${label}: ${p}`);
      const limit = ns.at(-1)!;
      let n = 1;
      while (T(n) <= limit) n++;
      return assert.equal(value(q), n, `${label}: ${p}`);
    }
    if (q.answer.kind === 'numeric') {
      const x = q.answer.value;
      const vals = maths(p)[0]!.split(';').slice(0, 3).map((t) => ev(t.replace(/\\ /g, ''), { x }));
      return close(vals[1]! - vals[0]!, vals[2]! - vals[1]!, `${label}: not linear at x = ${x}`);
    }
    const [i, u] = [Number(/T_\{(\d+)\} = (-?\d+)/.exec(p)![1]), Number(/T_\{(\d+)\} = (-?\d+)/.exec(p)![2])];
    const m = [...p.matchAll(/T_\{(\d+)\} = (-?\d+)/g)][1]!;
    const f = (n: number) => evaluate(parseFormula((q.answer as { expr: string }).expr), { n });
    close(f(i), u, label);
    close(f(Number(m[1])), Number(m[2]), label);
    close(f(3) - f(2), f(2) - f(1), `${label}: answer not linear`);
  });
});

test('quadratic patterns: recomputed from the listed terms by differences', () => {
  each('quadratic-patterns', (q, level, label) => {
    const p = q.prompt;
    /** T(n) from four listed terms by Newton's forward differences. */
    const fit = (t: number[]) => {
      const f1 = t[1]! - t[0]!;
      const D = t[2]! - 2 * t[1]! + t[0]!;
      assert.equal(t[3]! - 2 * t[2]! + t[1]!, D, `${label}: second difference not constant`);
      return (n: number) => t[0]! + (n - 1) * f1 + ((n - 1) * (n - 2) * D) / 2;
    };
    if (level === 4) {
      const rows = [...p.matchAll(/: ([-\d, ]+)\./g)].map((m) => ints(m[1]!));
      const [xs, ys] = rows as [number[], number[]];
      const T = fit(ys);
      const k = ints(p).at(-1)!;
      return assert.equal(value(q), T(k - xs[0]! + 1), `${label}: ${p}`);
    }
    if (level === 5 && /Find \$p\$/.test(p)) {
      const parts = maths(p)[0]!.split(';').filter((t) => !t.includes('dots')).map((t) => t.replace(/\\ /g, '').trim());
      const t = parts.map((x) => (x === 'p' ? value(q) : Number(x)));
      fit(t);
      return;
    }
    const T = fit(listed(p));
    if (level === 1) return assert.equal(value(q), T(5), label);
    if (level === 2) return [1, 2, 3, 4, 9, 30].forEach((n) => close(evaluate(parseFormula((q.answer as { expr: string }).expr), { n }), T(n), label));
    if (level === 3) {
      const k = /T_\{(\d+)\}/.exec(p);
      if (k) return assert.equal(value(q), T(Number(k[1])), label);
      const target = ints(maths(p).at(-1)!)[0]!;
      const hits = [...Array(400).keys()].map((n) => n + 1).filter((n) => T(n) === target);
      return assert.deepEqual([value(q)], hits, label);
    }
    // Smallest term.
    const vals = [...Array(300).keys()].map((n) => T(n + 1));
    const min = Math.min(...vals);
    assert.equal(vals.filter((v) => v === min).length, 1, `${label}: smallest term not unique`);
    assert.equal(value(q), vals.indexOf(min) + 1, label);
  });
});

test('series: added up term by term', () => {
  each('series', (q, level, label) => {
    const p = q.prompt;
    if (level === 1) {
      const m = /\\sum_\{k=(-?\d+)\}\^\{(\d+)\} \((.+)\)\$/.exec(p)!;
      const [lo, hi, body] = [Number(m[1]), Number(m[2]), m[3]!];
      if (/How many terms/.test(p)) {
        let c = 0;
        for (let k = lo; k <= hi; k++) c++;
        return assert.equal(value(q), c, label);
      }
      let S = 0;
      for (let k = lo; k <= hi; k++) S += ev(body, { k });
      return close(value(q), S, `${label}: ${p}`);
    }
    if (level === 2) {
      const body = maths(p)[0]!.replace(/\+ \\dots$/, '').trim();
      const terms = [...body.matchAll(/([+-]?)\s*(\\frac\{(\d+)\}\{(\d+)\}|\d+)/g)].map((m) => (m[1] === '-' ? -1 : 1) * (m[3] ? Number(m[3]) / Number(m[4]) : Number(m[2])));
      const r = terms[1]! / terms[0]!;
      close(terms[2]! / terms[1]!, r, `${label}: not geometric`);
      let S = 0;
      let t = terms[0]!;
      for (let k = 0; k < 3000; k++) (S += t), (t *= r);
      return close(value(q), S, `${label}: ${p}`);
    }
    if (level === 3) {
      if (q.answer.kind === 'fraction') {
        const [a] = ints(p);
        const Sm = /sum to infinity \$(-?)\\frac\{(\d+)\}\{(\d+)\}\$|sum to infinity \$(-?\d+)\$/.exec(p)!;
        const Sinf = Sm[4] !== undefined ? Number(Sm[4]) : (Sm[1] ? -1 : 1) * (Number(Sm[2]) / Number(Sm[3]));
        const r = value(q);
        assert.ok(Math.abs(r) < 1, label);
        let S = 0;
        let t = a!;
        for (let k = 0; k < 3000; k++) (S += t), (t *= r);
        return close(S, Sinf, `${label}: ${p}`);
      }
      const base = /\\left\((.+)\\right\)\^\{k\}/.exec(p)![1]!;
      const set = fromWire((q.answer as { set: IneqInterval[] }).set);
      const ends = set.flatMap((iv) => [iv.lo, iv.hi]).filter((e) => e !== null).map((e) => e.n / e.d);
      const xs = [...Array(61).keys()].map((i) => i - 30).concat(ends.flatMap((e) => [e, e - 0.01, e + 0.01]));
      for (const x of xs) assert.equal(contains(set, x), Math.abs(ev(base, { x })) < 1 - EPS, `${label}: x = ${x}`);
      return;
    }
    if (level === 4) {
      const target = ints(maths(p).at(-1)!)[0]!;
      const t = ints(maths(p)[0]!.replace(/ - /g, ' + -')).slice(0, 3);
      const arithmetic = /arithmetic/.test(p);
      const term = (k: number) => (arithmetic ? t[0]! + (k - 1) * (t[1]! - t[0]!) : t[0]! * (t[1]! / t[0]!) ** (k - 1));
      const hits: number[] = [];
      let S = 0;
      for (let k = 1; k <= 500; k++) {
        S += term(k);
        if (Math.abs(S - target) < EPS) hits.push(k);
      }
      return assert.deepEqual([value(q)], hits, `${label}: ${p}`);
    }
    const Sn = maths(p).find((m) => m.startsWith('S_n ='))!.replace('S_n =', '');
    const k = Number(/T_\{(\d+)\}/.exec(p)![1]);
    close(value(q), ev(Sn, { n: k }) - ev(Sn, { n: k - 1 }), label);
  });
});
