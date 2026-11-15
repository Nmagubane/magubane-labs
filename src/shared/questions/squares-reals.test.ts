/**
 * Independent checks for completing the square and real numbers. Each answer is recomputed from what the
 * question shows, without the generators' construction.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from './rng.ts';
import { completingSquare, realNumbers } from './generators/math-squares-reals.ts';
import type { Difficulty, GeneratedQuestion } from './types.ts';

function gen(t: typeof completingSquare, level: number, seed: number): GeneratedQuestion {
  return t.generate(createRng(seed * 104729 + level), level as Difficulty);
}
const maths = (prompt: string) => [...prompt.matchAll(/\$([^$]+)\$/g)].map((m) => m[1] as string);
const longest = (prompt: string) => maths(prompt).reduce((a, b) => (b.length > a.length ? b : a));

/** a x² + b x + c read from TeX like "2x^2 - 8x + 3". */
function coeffs(tex: string): [number, number, number] {
  const s = tex.replace(/\s+/g, '').replace(/^(?=[^+-])/, '+');
  let a = 0;
  let b = 0;
  let c = 0;
  for (const m of s.matchAll(/([+-])(\d*)(x\^2|x)?/g)) {
    if (!m[0] || m[0] === '+' || m[0] === '-') continue;
    const k = (m[1] === '-' ? -1 : 1) * (m[2] ? Number(m[2]) : 1);
    if (m[3] === 'x^2') a += k;
    else if (m[3] === 'x') b += k;
    else c += k;
  }
  return [a, b, c];
}
const value = (terms: { r: number; n: number; d: number }[]) => terms.reduce((s, t) => s + (t.n / t.d) * Math.sqrt(t.r), 0);
const squareFree = (r: number) => r === 1 || ![...Array(Math.floor(Math.sqrt(r)) + 1).keys()].slice(2).some((p) => r % (p * p) === 0);

/** Plain text like 2(x-3)^2-13 → a function of x. */
function fx(text: string): (x: number) => number {
  let s = text.replace(/\s+/g, '');
  for (let k = 0; k < 3; k++) s = s.replace(/(\d|x|\))(?=[x(])/g, '$1*');
  s = s.replace(/(\([^()]*\)|x)\^(\d)/g, '(($1)**$2)');
  return new Function('x', `return ${s};`) as (x: number) => number;
}

test('completing the square: forms equal the quadratic, roots solve it, turning points are the minimum', () => {
  for (let level = 1; level <= 5; level++) {
    for (let seed = 1; seed <= 300; seed++) {
      const q = gen(completingSquare, level, seed);
      const where = `L${level} seed ${seed}`;
      const m = maths(q.prompt);
      if (q.answer.kind === 'expression') {
        const [a, b, c] = coeffs(m[0] as string);
        const f = fx(q.answer.expr);
        for (const x of [-3.1, -0.4, 0.7, 2.9]) assert.ok(Math.abs(f(x) - (a * x * x + b * x + c)) < 1e-9, `${where}: ${q.answer.expr} ≠ ${m[0]}`);
        for (const w of q.misconceptions) if (w.answer.kind === 'expression') assert.ok([-3.1, 0.7, 2.9].some((x) => Math.abs(fx((w.answer as { expr: string }).expr)(x) - (a * x * x + b * x + c)) > 1e-6), `${where}: mistake equals the answer`);
      } else if (q.answer.kind === 'roots') {
        const eq = longest(q.prompt);
        const [lhs, rhs] = eq.split('=') as [string, string];
        const [a, b, c0] = coeffs(lhs);
        const c = c0 - Number(rhs.trim());
        const roots = q.answer.surds ? q.answer.surds.map(value) : q.answer.values.map((v) => v.n / v.d);
        assert.equal(roots.length, 2, where);
        assert.ok(Math.abs((roots[0] as number) - (roots[1] as number)) > 1e-9, `${where}: repeated root`);
        for (const r of roots) assert.ok(Math.abs(a * r * r + b * r + c) < 1e-7, `${where}: x = ${r} does not solve ${eq}`);
        for (const t of q.answer.surds?.flat() ?? []) assert.ok(squareFree(t.r), `${where}: √${t.r} is not simplest`);
        for (const w of q.misconceptions) {
          if (w.answer.kind !== 'roots') continue;
          const wr = w.answer.surds ? w.answer.surds.map(value) : w.answer.values.map((v) => v.n / v.d);
          assert.ok(wr.some((r) => Math.abs(a * r * r + b * r + c) > 1e-6), `${where}: mistake ${w.code} also solves it`);
        }
      } else if (q.answer.kind === 'point') {
        const [a, b, c] = coeffs((m[0] as string).replace(/^y=/, '').replace(/^y\s*=\s*/, ''));
        const x = q.answer.x.n / q.answer.x.d;
        const y = q.answer.y.n / q.answer.y.d;
        assert.ok(Math.abs(x + b / (2 * a)) < 1e-9 && Math.abs(y - (a * x * x + b * x + c)) < 1e-9, `${where}: (${x}; ${y}) is not the turning point of ${m[0]}`);
      } else assert.fail(`${where}: unexpected answer kind ${q.answer.kind}`);
    }
  }
});

/** The value of the numbers real-numbers asks about, or null when it is a never-ending pattern. */
function realValue(tex: string): number | null {
  if (/\\ldots/.test(tex)) return null;
  let s = tex.replace(/\s+/g, '');
  // recurring decimals: 0{,}\dot{a}\dot{b}, 0{,}a\dot{b}, w{,}\dot{a}
  const rec = /^(\d+)\{,\}(\d*)((?:\\dot\{\d\})+)$/.exec(s);
  if (rec) {
    const rep = [...(rec[3] as string).matchAll(/\\dot\{(\d)\}/g)].map((m) => m[1]).join('');
    return Number(`${rec[1]}.${rec[2]}${rep.repeat(20)}`);
  }
  s = s
    .replace(/\\dfrac\{(\d+)\}\{(\d+)\}/g, '($1/$2)')
    .replace(/\{,\}/g, '.')
    .replace(/(\d+)\\sqrt\{(\d+)\}/g, '($1*Math.sqrt($2))')
    .replace(/\\sqrt\{(\d+)\}/g, 'Math.sqrt($1)')
    .replace(/(\d+)\\pi/g, '($1*Math.PI)')
    .replace(/\\pi/g, 'Math.PI')
    .replace(/\\times/g, '*');
  return new Function(`return ${s};`)() as number;
}
/** Rational if some denominator up to 10 000 makes it a whole number (all the rationals asked are simple). */
const looksRational = (v: number) => [...Array(10000).keys()].some((q) => q > 0 && Math.abs(v * q - Math.round(v * q)) < 1e-9);

test('real numbers: classification, surds between integers, rounding, rounding to suit, recurring decimals', () => {
  for (let level = 1; level <= 5; level++) {
    for (let seed = 1; seed <= 300; seed++) {
      const q = gen(realNumbers, level, seed);
      const where = `L${level} seed ${seed}`;
      const m = maths(q.prompt);
      if (level === 1) {
        const v = realValue(m[0] as string);
        const rational = v === null ? false : looksRational(v);
        assert.equal(q.answer.kind === 'choice' && q.answer.id, rational ? 'rational' : 'irrational', `${where}: ${m[0]}`);
      } else if (level === 2) {
        const t = m[0] as string;
        const n = Number(/\{(\d+)\}$/.exec(t)?.[1]);
        const v = (t.startsWith('-') ? -1 : 1) * (t.includes('[3]') ? Math.cbrt(n) : Math.sqrt(n));
        const lo = q.answer.kind === 'choice' ? Number(q.answer.id.slice(1)) : NaN;
        assert.ok(lo < v && v < lo + 1, `${where}: ${t} = ${v} is not between ${lo} and ${lo + 1}`);
      } else if (level === 3) {
        const dp = Number(/to (\d) decimal/.exec(q.prompt)?.[1]);
        const v = realValue(m[0] as string) as number;
        const want = Math.round(v * 10 ** dp) / 10 ** dp;
        assert.ok(q.answer.kind === 'numeric' && Math.abs(q.answer.value - want) < 1e-9, `${where}: ${m[0]} to ${dp} dp`);
        for (const w of q.misconceptions) assert.ok(w.answer.kind === 'numeric' && Math.abs(w.answer.value - want) > 1e-9, `${where}: mistake is right`);
      } else if (level === 4) {
        const nums = [...q.prompt.replace(/R(\d)/g, '$1').matchAll(/(\d+(?:,\d+)?)/g)].map((x) => Number((x[1] as string).replace(',', '.')));
        // bigger number ÷ the size of one group
        const [x, y] = nums as [number, number];
        const ratio = q.prompt.includes('can be cut') ? y / x : q.prompt.startsWith('One tin') ? y / x : x / y;
        const up = /needed|must be bought/.test(q.prompt);
        const want = up ? Math.ceil(ratio - 1e-9) : Math.floor(ratio + 1e-9);
        assert.ok(q.answer.kind === 'numeric' && q.answer.value === want, `${where}: ${q.prompt} → ${want}, got ${q.answer.kind === 'numeric' ? q.answer.value : ''}`);
      } else {
        const v = realValue(m[0] as string) as number;
        assert.ok(q.answer.kind === 'fraction', where);
        if (q.answer.kind !== 'fraction') continue;
        const { n, d } = q.answer;
        assert.ok(Math.abs(n / d - v) < 1e-12, `${where}: ${n}/${d} ≠ ${m[0]}`);
        const g = (a: number, b: number): number => (b === 0 ? a : g(b, a % b));
        assert.equal(g(n, d), 1, `${where}: ${n}/${d} is not simplest`);
        for (const w of q.misconceptions) if (w.answer.kind === 'fraction') assert.ok(Math.abs(w.answer.n / w.answer.d - v) > 1e-9, `${where}: mistake is right`);
      }
    }
  }
});
