/**
 * Probability: every answer is recomputed from what the question shows. Venn and table questions are recounted
 * from the figure; dice and bag questions by listing every outcome; arrangements by listing every permutation
 * (or, for repeated letters, by a recursive count of distinct words). Nothing reuses the generators' formulas.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion } from './registry.ts';
import { DIFFICULTIES, type GeneratedQuestion, type TreeBranch } from './types.ts';

const SEEDS = 300;
const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const value = (q: GeneratedQuestion): number => {
  const a = q.answer;
  if (a.kind === 'numeric') return a.value;
  if (a.kind === 'fraction') return a.n / a.d;
  throw new Error(`unexpected answer ${a.kind}`);
};
const dec = (tex: string) => Number(tex.replace('{,}', '.'));
const prob = (q: GeneratedQuestion, name: string) => {
  const m = new RegExp(`P\\(${name.replace(/[()\\]/g, (c) => `\\${c}`)}\\) = ([\\d{},]+)\\$`).exec(q.prompt);
  assert.ok(m, `no P(${name}) in ${q.prompt}`);
  return dec(m[1]!);
};
const AND = 'A \\text{ and } B';
const OR = 'A \\text{ or } B';

/** Which Venn regions an event phrase covers (two sets: '0', '1', '01', ''; three sets add '2', '02', '12', '012'). */
function regionsFor(phrase: string, keys: string[]): string[] {
  if (/exactly one of .*, .* and /.test(phrase)) return keys.filter((k) => k.length === 1);
  if (/at least two of/.test(phrase)) return keys.filter((k) => k.length >= 2);
  if (/none of/.test(phrase)) return [''];
  if (/^\w+ .+ and .+ but not .+$/.test(phrase) && keys.includes('012')) return ['01'];
  if (/but not/.test(phrase)) return ['0'];
  if (/both .+ and/.test(phrase)) return ['01'];
  if (/\(or both\)/.test(phrase)) return keys.filter((k) => k.includes('0') || k.includes('1'));
  if (/neither/.test(phrase)) return [''];
  if (/exactly one of/.test(phrase)) return ['0', '1'];
  if (/does not/.test(phrase)) return keys.filter((k) => !k.includes('1'));
  throw new Error(`unknown event "${phrase}"`);
}
const eventPhrase = (q: GeneratedQuestion) => /probability that the \w+ (.+)\.$/.exec(q.prompt)![1]!;

function* permutations<T>(items: T[]): Generator<T[]> {
  if (items.length <= 1) {
    yield items.slice();
    return;
  }
  for (let i = 0; i < items.length; i++) {
    const rest = items.slice(0, i).concat(items.slice(i + 1));
    for (const p of permutations(rest)) yield [items[i]!, ...p];
  }
}
const cache = new Map<string, number>();
function countPerms<T>(key: string, items: T[], ok: (p: T[]) => boolean): number {
  const k = `${key}|${items.join(',')}`;
  if (!cache.has(k)) {
    let c = 0;
    for (const p of permutations(items)) if (ok(p)) c++;
    cache.set(k, c);
  }
  return cache.get(k)!;
}
/** Distinct arrangements of a multiset, counted recursively (not by n!/Πk!). */
function distinctWords(word: string): number {
  const memo = new Map<string, number>();
  const go = (counts: number[]): number => {
    const key = counts.join(',');
    if (counts.every((c) => c === 0)) return 1;
    if (memo.has(key)) return memo.get(key)!;
    let total = 0;
    counts.forEach((c, i) => {
      if (c > 0) total += go(counts.map((x, j) => (j === i ? x - 1 : x)));
    });
    memo.set(key, total);
    return total;
  };
  const m = new Map<string, number>();
  for (const ch of word) m.set(ch, (m.get(ch) ?? 0) + 1);
  return go([...m.values()]);
}
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

function each(id: string, check: (q: GeneratedQuestion, level: number, where: string) => void) {
  test(`${id}: answers recomputed from the question`, () => {
    for (const level of DIFFICULTIES)
      for (let seed = 1; seed <= SEEDS; seed++) {
        const q = generateQuestion(id, seed * 6271 + level, level);
        check(q, level, `${id} L${level} seed ${seed}: ${q.prompt}`);
      }
  });
}

each('probability-rules', (q, level, where) => {
  if (level === 1 || level === 4) {
    assert.ok(q.figure?.kind === 'venn', where);
    if (q.figure?.kind !== 'venn') return;
    let regions: Record<string, number>;
    if (level === 1) regions = Object.fromEntries(Object.entries(q.figure.regions).map(([k, v]) => [k, Number(v)]));
    else {
      const [, n, a, b, c] = /^Of (\d+) .*?, (\d+) .*?, (\d+) .*? and (\d+) /.exec(q.prompt)!.map(Number) as number[];
      const x = a! + b! + c! - n!;
      assert.equal(q.figure.regions['0'], `${a} - x`, where);
      assert.equal(q.figure.regions['1'], `${b} - x`, where);
      regions = { '0': a! - x, '1': b! - x, '01': x, '': c! };
      assert.ok(Object.values(regions).every((v) => v >= 1), `${where}: a region is empty or negative`);
    }
    const n = Object.values(regions).reduce((s, v) => s + v, 0);
    assert.ok(q.prompt.includes(`${n} `), `${where}: total ${n} not in the prompt`);
    const k = regionsFor(eventPhrase(q), Object.keys(regions)).reduce((s, r) => s + regions[r]!, 0);
    assert.ok(close(value(q), k / n), `${where}: expected ${k}/${n}`);
    return;
  }
  if (level === 2) {
    const a = prob(q, 'A');
    const b = prob(q, 'B');
    if (q.prompt.includes(`Find $P(${OR})$`)) assert.ok(close(value(q), Math.round((a + b - prob(q, AND)) * 1e6) / 1e6), where);
    else assert.ok(close(Math.round((a + b - value(q)) * 1e6) / 1e6, prob(q, OR)), where);
    return;
  }
  if (level === 3) {
    if (/complementary/.test(q.prompt)) assert.ok(close(value(q), Math.round((1 - prob(q, 'A')) * 1e6) / 1e6), where);
    else {
      const s = Math.round((prob(q, 'A') + prob(q, 'B')) * 1e6) / 1e6;
      assert.ok(close(value(q), /neither/.test(q.prompt) ? Math.round((1 - s) * 1e6) / 1e6 : s), where);
    }
    return;
  }
  if (/Two fair dice/.test(q.prompt)) {
    const ph = /probability that (.+)\.$/.exec(q.prompt)![1]!;
    const k = Number(/(\d+)$/.exec(ph)?.[1]);
    let fav = 0;
    for (let i = 1; i <= 6; i++)
      for (let j = 1; j <= 6; j++) {
        const hit = /^the sum is \d/.test(ph) ? i + j === k : /more than/.test(ph) ? i + j > k : /double/.test(ph) ? i === j : /at least one/.test(ph) ? i === 6 || j === 6 : /product/.test(ph) ? (i * j) % 2 === 0 : null;
        assert.notEqual(hit, null, `${where}: unknown event`);
        if (hit) fav++;
      }
    assert.ok(close(value(q), fav / 36), where);
  } else if (/spinner/.test(q.prompt)) {
    const [, N, R, M] = /spun (\d+) times and landed on \w+ (\d+) times.* in (\d+) spins/.exec(q.prompt)!.map(Number) as number[];
    assert.ok(close(value(q), (R! / N!) * M!), where);
    assert.ok(Number.isInteger(value(q)), `${where}: expected count is not whole`);
  } else {
    const [, sides, T] = /fair (\d+)-sided die.* rolled (\d+) times/.exec(q.prompt)!.map(Number) as number[];
    assert.ok(close(value(q), T! / sides!), where);
  }
});

const fracOf = (tex: string) => {
  const m = /\\frac\{(\d+)\}\{(\d+)\}/.exec(tex)!;
  return Number(m[1]) / Number(m[2]);
};

each('independent-events', (q, level, where) => {
  if (level === 1) {
    const a = prob(q, 'A');
    const b = prob(q, 'B');
    const want = q.prompt.includes(`Find $P(${AND})$`) ? a * b : a + b - a * b;
    assert.ok(close(value(q), Math.round(want * 1e6) / 1e6), where);
    return;
  }
  if (level === 2) {
    const a = prob(q, 'A');
    if (q.answer.kind === 'choice') {
      const indep = Math.abs(prob(q, AND) - a * prob(q, 'B')) < 1e-9;
      assert.equal(q.answer.id, indep ? 'yes' : 'no', where);
    } else assert.ok(close(value(q), Math.round((prob(q, AND) / a) * 1e6) / 1e6), where);
    return;
  }
  if (level === 3 || level === 4) {
    const m = /holds (\d+) (\w+) and (\d+) (\w+) \w+\./.exec(q.prompt)!;
    const [x, A, y] = [Number(m[1]), m[2]!, Number(m[3])];
    const items = [...Array(x).fill(A), ...Array(y).fill('other')] as string[];
    const replace = /put back before/.test(q.prompt);
    let fav = 0;
    let total = 0;
    items.forEach((p, i) =>
      items.forEach((s, j) => {
        if (!replace && i === j) return;
        total++;
        const hit = /both are \w+\.$/.test(q.prompt) && !/same colour/.test(q.prompt) ? p === A && s === A : /same colour/.test(q.prompt) ? p === s : /one of each/.test(q.prompt) ? p !== s : /at least one is/.test(q.prompt) ? p === A || s === A : null;
        assert.notEqual(hit, null, `${where}: unknown event`);
        if (hit) fav++;
      }),
    );
    assert.ok(close(value(q), fav / total), `${where}: expected ${fav}/${total}`);
    if (level === 3) {
      assert.ok(q.figure?.kind === 'tree', where);
      if (q.figure?.kind !== 'tree') return;
      const sum = (bs: TreeBranch[]) => bs.reduce((s, b) => s + fracOf(b.p), 0);
      assert.ok(close(sum(q.figure.branches), 1), `${where}: first branches don't add to 1`);
      for (const b of q.figure.branches) assert.ok(close(sum(b.children ?? []), 1), `${where}: second branches don't add to 1`);
      assert.ok(close(fracOf(q.figure.branches[0]!.p), x / (x + y)), `${where}: first branch is wrong`);
    }
    return;
  }
  if (q.figure?.kind === 'table') {
    const rows = q.figure.rows.slice(1).map((r) => r.slice(1).map(Number));
    const [[a, b, R1], [c, d, R2], [C1, C2, N]] = rows as [[number, number, number], [number, number, number], [number, number, number]];
    assert.ok(a + b === R1 && c + d === R2 && a + c === C1 && b + d === C2 && R1 + R2 === N && C1 + C2 === N, `${where}: totals don't add up`);
    assert.ok(Math.min(a, b, c, d) > 0, `${where}: empty cell`);
    if (q.answer.kind === 'choice') assert.equal(q.answer.id, a * N === R1 * C1 ? 'yes' : 'no', where);
    else assert.ok(close(value(q), (R1 + C1 - a) / N), where);
    return;
  }
  assert.ok(q.figure?.kind === 'venn' && q.figure.sets.length === 3, where);
  if (q.figure?.kind !== 'venn') return;
  const regions = Object.fromEntries(Object.entries(q.figure.regions).map(([k, v]) => [k, Number(v)]));
  const n = Object.values(regions).reduce((s, v) => s + v, 0);
  const k = regionsFor(eventPhrase(q), Object.keys(regions)).reduce((s, r) => s + regions[r]!, 0);
  assert.ok(close(value(q), k / n), `${where}: expected ${k}/${n}`);
});

const numberWord = (q: GeneratedQuestion) => Number(/^(\d+) friends/.exec(q.prompt)![1]);
each('counting-principle', (q, level, where) => {
  const v = value(q);
  if (level === 1) {
    const outfit = /has (\d+) shirts, (\d+) pairs of trousers and (\d+) pairs of shoes/.exec(q.prompt);
    if (outfit) return assert.equal(v, Number(outfit[1]) * Number(outfit[2]) * Number(outfit[3]), where);
    const len = Number(/How many (\d+)-/.exec(q.prompt)![1]);
    const pool = /digits/.test(q.prompt) ? 10 : 26;
    const rep = /may be repeated/.test(q.prompt);
    let count = 1;
    for (let i = 0; i < len; i++) count *= rep ? pool : pool - i;
    return assert.equal(v, count, where);
  }
  if (level === 2) {
    const n = Number(/can (\d+) /.exec(q.prompt)![1]);
    return assert.equal(v, countPerms('all', Array.from({ length: n }, (_, i) => i), () => true), where);
  }
  if (level === 3 || (level === 5 && /friends/.test(q.prompt))) {
    if (/friends/.test(q.prompt)) {
      const n = numberWord(q);
      const people = Array.from({ length: n }, (_, i) => i);
      const near = (p: number[]) => Math.abs(p.indexOf(0) - p.indexOf(1)) === 1;
      const rule = /not stand next/.test(q.prompt) ? 'apart' : /next to each other/.test(q.prompt) ? 'together' : 'end';
      const ok = rule === 'apart' ? (p: number[]) => !near(p) : rule === 'together' ? near : (p: number[]) => p[0] === 0 || p[n - 1] === 0;
      const fav = countPerms(rule, people, ok);
      return assert.ok(close(v, level === 5 ? fav / countPerms('all', people, () => true) : fav), where);
    }
    const word = /the word ([A-Z]+)/.exec(q.prompt)![1]!;
    const letters = [...word];
    const ok = /begin with a vowel/.test(q.prompt) ? (p: string[]) => VOWELS.has(p[0]!) : (p: string[]) => !VOWELS.has(p[0]!) && !VOWELS.has(p[p.length - 1]!);
    return assert.equal(v, countPerms(/begin with a vowel/.test(q.prompt) ? 'vowel-first' : 'consonant-ends', letters, ok), where);
  }
  if (level === 4) {
    const word = /the word ([A-Z]+)/.exec(q.prompt)![1]!;
    return assert.equal(v, distinctWords(word), where);
  }
  if (/the word/.test(q.prompt)) {
    const word = /the word ([A-Z]+)/.exec(q.prompt)![1]!;
    const letters = [...word];
    return assert.ok(close(v, countPerms('vowel-first', letters, (p) => VOWELS.has(p[0]!)) / countPerms('all', letters, () => true)), where);
  }
  const n = Number(/digits 1 to (\d+)/.exec(q.prompt)![1]);
  const digits = Array.from({ length: n }, (_, i) => i + 1);
  const num = (p: number[]) => Number(p.join(''));
  const big = /greater than ([\d ]+)\./.exec(q.prompt);
  const ok = big ? (p: number[]) => num(p) > Number(big[1]!.replace(/ /g, '')) : (p: number[]) => p[n - 1]! % 2 === 0;
  return assert.ok(close(v, countPerms(big ? `big${big[1]}` : 'even', digits, ok) / countPerms('all', digits, () => true)), where);
});
