/**
 * Probability, Grades 10–12 (CAPS Paper 1, about 15 marks):
 * - Grade 10: Venn diagrams, the addition rule, mutually exclusive and complementary events, two dice, relative frequency;
 * - Grade 11: independent events, tree diagrams (with and without replacement), two-way tables, three-set Venn diagrams;
 * - Grade 12: the fundamental counting principle, factorials, arrangements with restrictions and identical items,
 *   and probability by counting.
 * probability.test.ts recomputes every answer from what the question shows, mostly by listing every outcome.
 */
import type { QuestionTemplate, Misconception, AnswerSpec, Figure, TreeBranch, GeneratedQuestion } from '../types.ts';
import type { Rng } from '../rng.ts';
import type { MistakeCode } from '../mistakes.ts';
import { rat, ratTex, eq as req, type Rational } from '../rational.ts';
import { exact, keepNum, choice } from './kit.ts';

const fracAns = (r: Rational): AnswerSpec => ({ kind: 'fraction', n: r.n, d: r.d, requireSimplest: false });
/** A decimal in TeX with a decimal comma. */
const dt = (v: number) => String(Math.round(v * 1e6) / 1e6).replace('.', '{,}');
const r6 = (v: number) => Math.round(v * 1e6) / 1e6;
/** \frac{n}{d}, simplified only when it changes, e.g. "\frac{12}{40} = \frac{3}{10}". */
const show = (n: number, d: number) => {
  const s = rat(n, d);
  return s.d === d || n === 0 ? `\\frac{${n}}{${d}}` : `\\frac{${n}}{${d}} = ${ratTex(s)}`;
};

function keepFracs(ms: { code: MistakeCode; value: Rational | null; feedback: string }[], correct: Rational): Misconception[] {
  const seen = [correct];
  const out: Misconception[] = [];
  for (const m of ms) {
    if (!m.value || m.value.n < 0 || m.value.n > m.value.d || seen.some((s) => req(s, m.value!))) continue;
    seen.push(m.value);
    out.push({ code: m.code, answer: fracAns(m.value), feedback: m.feedback });
  }
  return out;
}
interface FracQ {
  prompt: string;
  figure?: Figure;
  n: number;
  d: number;
  hints: string[];
  solution: string[];
  wrong: { code: MistakeCode; n: number; d: number; feedback: string }[];
}
const fracQ = (q: FracQ): GeneratedQuestion => ({
  prompt: q.prompt,
  ...(q.figure ? { figure: q.figure } : {}),
  input: { kind: 'fraction', prefix: 'P =' },
  answer: fracAns(rat(q.n, q.d)),
  answerDisplay: `$${show(q.n, q.d)}$`,
  hints: q.hints,
  solution: q.solution,
  misconceptions: keepFracs(q.wrong.map((w) => ({ code: w.code, value: w.d > 0 ? rat(w.n, w.d) : null, feedback: w.feedback })), rat(q.n, q.d)),
});
const decQ = (q: { prompt: string; value: number; hints: string[]; solution: string[]; wrong: { code: MistakeCode; value: number; feedback: string }[]; prefix?: string }): GeneratedQuestion => ({
  prompt: q.prompt,
  input: { kind: 'numeric', prefix: q.prefix ?? 'P =' },
  answer: exact(r6(q.value)),
  answerDisplay: `$${dt(q.value)}$`,
  hints: q.hints,
  solution: q.solution,
  misconceptions: keepNum(q.wrong.filter((w) => w.value >= 0 && w.value <= 1).map((w) => ({ code: w.code, answer: exact(r6(w.value)), feedback: w.feedback })), r6(q.value)),
});

// ---------------------------------------------------------------------------
// Venn diagrams. Regions are keyed by the sets they are inside: '0', '1', '01', '' (outside both).

/** Everyday sets: "the learner {plays} {soccer}". */
const CONTEXTS = [
  { group: 'learners in a Grade 10 class', who: 'learner', verb: ['plays', 'play'], sets: [['soccer', 'S'], ['netball', 'N'], ['chess', 'C']] },
  { group: 'learners at a school', who: 'learner', verb: ['takes', 'take'], sets: [['Physical Sciences', 'P'], ['Life Sciences', 'L'], ['Geography', 'G']] },
  { group: 'people at a taxi rank', who: 'person', verb: ['owns', 'own'], sets: [['a smartphone', 'S'], ['a bank card', 'B'], ['a car', 'C']] },
  { group: 'learners in a hostel', who: 'learner', verb: ['likes', 'like'], sets: [['pap', 'P'], ['rice', 'R'], ['samp', 'S']] },
  { group: 'workers in an office', who: 'worker', verb: ['drinks', 'drink'], sets: [['tea', 'T'], ['coffee', 'C'], ['rooibos', 'R']] },
  { group: 'learners in a Grade 11 class', who: 'learner', verb: ['speaks', 'speak'], sets: [['isiZulu', 'Z'], ['Sesotho', 'S'], ['Afrikaans', 'A']] },
] as const;
type Ctx = (typeof CONTEXTS)[number];

/** Two-set events, phrased after "the {who}", with the regions they cover. probability.test.ts reads the phrase itself. */
function events2(c: Ctx) {
  const [v] = c.verb;
  const [a, b] = [c.sets[0][0], c.sets[1][0]];
  return [
    { phrase: `${v} ${a} but not ${b}`, regions: ['0'], miss: { regions: ['0', '01'], why: `"${a} but not ${b}" leaves out the overlap: only the part of the circle outside the other one.` } },
    { phrase: `${v} both ${a} and ${b}`, regions: ['01'], miss: { regions: ['0', '1', '01'], why: '"Both" is only the overlap, where the circles share.' } },
    { phrase: `${v} ${a} or ${b} (or both)`, regions: ['0', '1', '01'], miss: { regions: ['0', '01', '1', '01'], why: 'Adding the two circles counts the overlap twice. Add the three regions inside the circles once each.' } },
    { phrase: `${v} neither ${a} nor ${b}`, regions: [''], miss: { regions: ['0', '1', '01'], why: '"Neither" is outside both circles.' } },
    { phrase: `${v} exactly one of ${a} and ${b}`, regions: ['0', '1'], miss: { regions: ['0', '1', '01'], why: '"Exactly one" leaves out the overlap, where both are true.' } },
    { phrase: `does not ${c.verb[1]} ${b}`, regions: ['0', ''], miss: { regions: ['1', '01'], why: `That is the probability that they do ${c.verb[1]} ${b}. Use the complement: everything outside the ${c.sets[1][1]} circle.` } },
  ] as const;
}
const venn = (sets: string[], n: number, regions: Record<string, number | string>, alt: string): Figure => ({ kind: 'venn', alt, sets, universe: `S\\ (${n})`, regions: Object.fromEntries(Object.entries(regions).map(([k, v]) => [k, String(v)])) });

// ---------------------------------------------------------------------------
// Grade 10: probability rules

export const probabilityRules: QuestionTemplate = {
  id: 'probability-rules',
  skillId: 'probability-rules',
  generate(rng, level) {
    if (level === 1) {
      const c = rng.pick(CONTEXTS);
      const r: Record<string, number> = { '0': rng.int(3, 15), '1': rng.int(3, 15), '01': rng.int(2, 9), '': rng.int(1, 8) };
      const n = r['0']! + r['1']! + r['01']! + r['']!;
      const ev = rng.pick(events2(c));
      const k = ev.regions.reduce((s, g) => s + r[g]!, 0);
      const miss = ev.miss.regions.reduce((s, g) => s + r[g]!, 0);
      const [A, B] = [c.sets[0], c.sets[1]];
      return fracQ({
        prompt: `The Venn diagram shows ${n} ${c.group}. ${A[1]}: ${c.verb[0]} ${A[0]}; ${B[1]}: ${c.verb[0]} ${B[0]}. One ${c.who} is chosen at random. Find the probability that the ${c.who} ${ev.phrase}.`,
        figure: venn([A[1], B[1]], n, r, `Venn diagram of ${n} ${c.group}. ${r['0']} only ${A[1]}, ${r['01']} both, ${r['1']} only ${B[1]}, ${r['']} neither.`),
        n: k,
        d: n,
        hints: ['Find the region (or regions) of the diagram that match the event, and add their numbers.', `Divide by the total, ${n}.`],
        solution: [`The regions add up to ${k}.`, `$P = ${show(k, n)}$`],
        wrong: [{ code: 'venn-regions', n: miss, d: n, feedback: ev.miss.why }],
      });
    }
    if (level === 2) {
      // P(A), P(B), P(A and B) in steps of 0,05.
      let a = 0, b = 0, c = 0;
      do {
        a = rng.int(4, 14) * 0.05;
        b = rng.int(4, 14) * 0.05;
        c = rng.int(1, 6) * 0.05;
      } while (c >= Math.min(a, b) || a + b - c > 0.95);
      const u = r6(a + b - c);
      if (rng.chance(0.5)) {
        return decQ({
          prompt: `$P(A) = ${dt(a)}$, $P(B) = ${dt(b)}$ and $P(A \\text{ and } B) = ${dt(c)}$. Find $P(A \\text{ or } B)$.`,
          value: u,
          hints: ['Addition rule: $P(A \\text{ or } B) = P(A) + P(B) - P(A \\text{ and } B)$.', 'Adding $P(A)$ and $P(B)$ counts the overlap twice, so subtract it once.'],
          solution: [`$P(A \\text{ or } B) = ${dt(a)} + ${dt(b)} - ${dt(c)} = ${dt(u)}$`],
          wrong: [{ code: 'addition-rule', value: a + b, feedback: 'Adding $P(A)$ and $P(B)$ counts the overlap twice. Subtract $P(A \\text{ and } B)$ once.' }, { code: 'addition-rule', value: a + b + c, feedback: 'Subtract the overlap, don\'t add it.' }],
        });
      }
      return decQ({
        prompt: `$P(A) = ${dt(a)}$, $P(B) = ${dt(b)}$ and $P(A \\text{ or } B) = ${dt(u)}$. Find $P(A \\text{ and } B)$.`,
        value: c,
        hints: ['Use the addition rule and solve for the overlap: $P(A \\text{ or } B) = P(A) + P(B) - P(A \\text{ and } B)$.'],
        solution: [`$${dt(u)} = ${dt(a)} + ${dt(b)} - P(A \\text{ and } B)$`, `$P(A \\text{ and } B) = ${dt(c)}$`],
        wrong: [{ code: 'addition-rule', value: a * b, feedback: '$P(A) \\times P(B)$ gives $P(A \\text{ and } B)$ only for independent events. Use the addition rule.' }, { code: 'complement', value: 1 - u, feedback: 'That is $P(\\text{not } (A \\text{ or } B))$. Use the addition rule.' }],
      });
    }
    if (level === 3) {
      let a = 0, b = 0;
      do {
        a = rng.int(2, 12) * 0.05;
        b = rng.int(2, 12) * 0.05;
      } while (a + b > 0.9);
      const v = rng.int(0, 2);
      if (v === 0)
        return decQ({
          prompt: `$A$ and $B$ are mutually exclusive events with $P(A) = ${dt(a)}$ and $P(B) = ${dt(b)}$. Find $P(A \\text{ or } B)$.`,
          value: a + b,
          hints: ['Mutually exclusive events can\'t happen together, so $P(A \\text{ and } B) = 0$.', 'The addition rule becomes $P(A \\text{ or } B) = P(A) + P(B)$.'],
          solution: [`$P(A \\text{ and } B) = 0$`, `$P(A \\text{ or } B) = ${dt(a)} + ${dt(b)} = ${dt(a + b)}$`],
          wrong: [{ code: 'addition-rule', value: a + b - a * b, feedback: 'Mutually exclusive events have no overlap: $P(A \\text{ and } B) = 0$, not $P(A) \\times P(B)$.' }, { code: 'addition-rule', value: a * b, feedback: '"Or" means either can happen: add the probabilities.' }],
        });
      if (v === 1)
        return decQ({
          prompt: `$A$ and $B$ are mutually exclusive events with $P(A) = ${dt(a)}$ and $P(B) = ${dt(b)}$. Find the probability that neither $A$ nor $B$ happens.`,
          value: 1 - a - b,
          hints: ['First find $P(A \\text{ or } B)$. Mutually exclusive means there is no overlap.', '"Neither" is the complement of "$A$ or $B$".'],
          solution: [`$P(A \\text{ or } B) = ${dt(a)} + ${dt(b)} = ${dt(a + b)}$`, `$P(\\text{neither}) = 1 - ${dt(a + b)} = ${dt(1 - a - b)}$`],
          wrong: [{ code: 'complement', value: a + b, feedback: 'That is $P(A \\text{ or } B)$. "Neither" is everything else: subtract it from 1.' }, { code: 'complement', value: (1 - a) * (1 - b), feedback: 'Multiplying the complements works only for independent events. These are mutually exclusive: use $1 - P(A \\text{ or } B)$.' }],
        });
      const s = rng.int(6, 18) * 0.05;
      return decQ({
        prompt: `$A$ and $B$ are complementary events. $P(A) = ${dt(s)}$. Find $P(B)$.`,
        value: 1 - s,
        hints: ['Complementary events are mutually exclusive and together cover every outcome.', 'So $P(A) + P(B) = 1$.'],
        solution: [`$P(B) = 1 - ${dt(s)} = ${dt(1 - s)}$`],
        wrong: [{ code: 'complement', value: s, feedback: 'Complementary events don\'t have equal probabilities; they add up to 1.' }],
      });
    }
    if (level === 4) {
      // Survey with the overlap unknown: x = a + b + c − n.
      const c0 = rng.pick(CONTEXTS);
      let n = 0, a = 0, b = 0, c = 0, x = 0;
      do {
        x = rng.int(2, 10);
        a = x + rng.int(3, 14);
        b = x + rng.int(3, 14);
        c = rng.int(1, 9);
        n = a + b + c - x;
      } while (n > 60);
      const [A, B] = [c0.sets[0], c0.sets[1]];
      const ask = rng.int(0, 2);
      const k = ask === 0 ? x : ask === 1 ? a + b - 2 * x : a - x;
      const phrase = ask === 0 ? `${c0.verb[0]} both ${A[0]} and ${B[0]}` : ask === 1 ? `${c0.verb[0]} exactly one of ${A[0]} and ${B[0]}` : `${c0.verb[0]} ${A[0]} but not ${B[0]}`;
      return fracQ({
        prompt: `Of ${n} ${c0.group}, ${a} ${c0.verb[1]} ${A[0]} (${A[1]}), ${b} ${c0.verb[1]} ${B[0]} (${B[1]}) and ${c} ${c0.verb[1]} neither. One is chosen at random. Find the probability that the ${c0.who} ${phrase}.`,
        figure: venn([A[1], B[1]], n, { '0': `${a} - x`, '1': `${b} - x`, '01': 'x', '': c }, `Venn diagram: ${a} minus x only ${A[1]}, x in both, ${b} minus x only ${B[1]}, ${c} in neither.`),
        n: k,
        d: n,
        hints: [`Let $x$ be the number in both. Then the regions are $${a} - x$, $x$, $${b} - x$ and $${c}$, and they add up to ${n}.`, 'Solve for $x$ first, then fill in every region.'],
        solution: [`$(${a} - x) + x + (${b} - x) + ${c} = ${n}$, so $x = ${x}$`, `Regions: ${A[1]} only $${a - x}$, both $${x}$, ${B[1]} only $${b - x}$`, `$P = ${show(k, n)}$`],
        wrong: [
          ask === 0 ? { code: 'venn-regions', n: a + b - n, d: n, feedback: `$${a} + ${b} - ${n}$ forgets the ${c} who ${c0.verb[1]} neither. Include them: the four regions add up to ${n}.` } : { code: 'venn-regions', n: ask === 1 ? a + b : a, d: n, feedback: ask === 1 ? '"Exactly one" leaves out the overlap.' : `${a} ${c0.verb[1]} ${A[0]} altogether; "but not ${B[0]}" leaves out the overlap.` },
        ],
      });
    }
    // Level 5: two dice, or relative frequency.
    if (rng.chance(0.6)) {
      const kind = rng.int(0, 4);
      const k = kind === 0 ? rng.int(3, 11) : kind === 1 ? rng.int(5, 10) : 0;
      const phrase = ['the sum is ' + k, 'the sum is more than ' + k, 'a double is rolled (both dice show the same number)', 'at least one die shows a 6', 'the product of the two numbers is even'][kind]!;
      let fav = 0;
      for (let i = 1; i <= 6; i++)
        for (let j = 1; j <= 6; j++) {
          const hit = kind === 0 ? i + j === k : kind === 1 ? i + j > k : kind === 2 ? i === j : kind === 3 ? i === 6 || j === 6 : (i * j) % 2 === 0;
          if (hit) fav++;
        }
      return fracQ({
        prompt: `Two fair dice are rolled. Find the probability that ${phrase}.`,
        n: fav,
        d: 36,
        hints: ['There are $6 \\times 6 = 36$ equally likely outcomes. A table of all 36 helps.', 'Count the outcomes in the event.'],
        solution: [`${fav} of the 36 outcomes are in the event.`, `$P = ${show(fav, 36)}$`],
        wrong: [
          ...(kind === 0 ? [{ code: 'sample-space' as const, n: 1, d: 11, feedback: 'The 11 possible sums are not equally likely: a sum of 7 can happen 6 ways, a sum of 2 only one way. Use the 36 outcomes.' }] : []),
          ...(kind === 3 ? [{ code: 'sample-space' as const, n: 12, d: 36, feedback: '(6; 6) is counted twice if you add 6 + 6. There are 11 outcomes with at least one 6.' }] : []),
        ],
      });
    }
    if (rng.chance(0.5)) {
      const N = rng.pick([40, 50, 60, 80, 100, 120]);
      const R = rng.int(Math.round(N * 0.15), Math.round(N * 0.6));
      const M = rng.pick([N * 5, N * 10, N * 2]);
      const colour = rng.pick(['red', 'blue', 'green', 'yellow']);
      return {
        prompt: `A spinner was spun ${N} times and landed on ${colour} ${R} times. Using the relative frequency, how many times would you expect it to land on ${colour} in ${M} spins?`,
        input: { kind: 'numeric' },
        answer: exact(r6((R / N) * M)),
        answerDisplay: `$${dt((R / N) * M)}$`,
        hints: [`Relative frequency $= \\frac{\\text{times it happened}}{\\text{trials}} = \\frac{${R}}{${N}}$.`, 'Expected number $=$ probability $\\times$ number of trials.'],
        solution: [`Relative frequency $= ${show(R, N)}$`, `Expected $= ${show(R, N).split(' = ').pop()} \\times ${M} = ${dt((R / N) * M)}$`],
        misconceptions: keepNum([{ code: 'sample-space', answer: exact(r6(R / N)), feedback: 'That is the relative frequency. Multiply it by the number of spins.' }], r6((R / N) * M)),
      };
    }
    const sides = rng.pick([6, 8, 10, 12]);
    const T = sides * rng.int(5, 30);
    return {
      prompt: `A fair ${sides}-sided die, numbered 1 to ${sides}, is rolled ${T} times. How many times would you expect it to show a ${rng.int(1, sides)}?`,
      input: { kind: 'numeric' },
      answer: exact(T / sides),
      answerDisplay: `$${T / sides}$`,
      hints: [`Each number has probability $\\frac{1}{${sides}}$.`, 'Expected number $=$ probability $\\times$ number of trials.'],
      solution: [`$\\frac{1}{${sides}} \\times ${T} = ${T / sides}$`],
      misconceptions: keepNum([{ code: 'sample-space', answer: exact(T / 6), feedback: `This die has ${sides} sides, so each number has probability $\\frac{1}{${sides}}$.` }], T / sides),
    };
  },
};

// ---------------------------------------------------------------------------
// Grade 11: independent events, trees, tables

const BAGS = [
  { what: 'sweets', where: 'a packet', a: ['red', 'R'], b: ['green', 'G'] },
  { what: 'balls', where: 'a bag', a: ['blue', 'B'], b: ['yellow', 'Y'] },
  { what: 'marbles', where: 'a box', a: ['white', 'W'], b: ['black', 'K'] },
  { what: 'counters', where: 'a tin', a: ['red', 'R'], b: ['blue', 'B'] },
] as const;

/** Two draws from x of the first colour and y of the second. */
function drawTree(x: number, y: number, replace: boolean, A: string, B: string): TreeBranch[] {
  const n = x + y;
  const m = replace ? n : n - 1;
  const second = (fx: number, fy: number, first: string): TreeBranch[] => [
    { label: A, p: `\\frac{${fx}}{${m}}`, outcome: `${first}${A}` },
    { label: B, p: `\\frac{${fy}}{${m}}`, outcome: `${first}${B}` },
  ];
  return [
    { label: A, p: `\\frac{${x}}{${n}}`, children: second(replace ? x : x - 1, y, A) },
    { label: B, p: `\\frac{${y}}{${n}}`, children: second(x, replace ? y : y - 1, B) },
  ];
}

const TABLES: { rows: [string, string]; cols: [string, string]; r: string; c: string }[] = [
  { rows: ['Boys', 'Girls'], cols: ['Walk to school', 'Taxi'], r: 'is a boy', c: 'walks to school' },
  { rows: ['Grade 11', 'Grade 12'], cols: ['Wears glasses', 'No glasses'], r: 'is in Grade 11', c: 'wears glasses' },
  { rows: ['Urban', 'Rural'], cols: ['Has Wi-Fi', 'No Wi-Fi'], r: 'lives in an urban area', c: 'has Wi-Fi' },
  { rows: ['Under 25', '25 or older'], cols: ['Prefers SMS', 'Prefers calls'], r: 'is under 25', c: 'prefers SMS' },
];

export const independentEvents: QuestionTemplate = {
  id: 'independent-events',
  skillId: 'independent-events',
  generate(rng, level) {
    if (level === 1) {
      const a = rng.int(1, 9) / 10;
      const b = rng.int(1, 9) / 10;
      if (rng.chance(0.5))
        return decQ({
          prompt: `$A$ and $B$ are independent events with $P(A) = ${dt(a)}$ and $P(B) = ${dt(b)}$. Find $P(A \\text{ and } B)$.`,
          value: a * b,
          hints: ['For independent events, $P(A \\text{ and } B) = P(A) \\times P(B)$.'],
          solution: [`$P(A \\text{ and } B) = ${dt(a)} \\times ${dt(b)} = ${dt(a * b)}$`],
          wrong: [{ code: 'independence', value: a + b, feedback: '"And" for independent events means multiply, not add.' }],
        });
      return decQ({
        prompt: `$A$ and $B$ are independent events with $P(A) = ${dt(a)}$ and $P(B) = ${dt(b)}$. Find $P(A \\text{ or } B)$.`,
        value: a + b - a * b,
        hints: ['Addition rule: $P(A \\text{ or } B) = P(A) + P(B) - P(A \\text{ and } B)$.', 'Independent, so $P(A \\text{ and } B) = P(A) \\times P(B)$.'],
        solution: [`$P(A \\text{ and } B) = ${dt(a)} \\times ${dt(b)} = ${dt(a * b)}$`, `$P(A \\text{ or } B) = ${dt(a)} + ${dt(b)} - ${dt(a * b)} = ${dt(a + b - a * b)}$`],
        wrong: [{ code: 'addition-rule', value: a + b, feedback: 'Independent events can happen together, so subtract the overlap $P(A) \\times P(B)$.' }, { code: 'independence', value: a * b, feedback: 'That is $P(A \\text{ and } B)$. "Or" uses the addition rule.' }],
      });
    }
    if (level === 2) {
      const a = rng.int(1, 9) / 10;
      const b = rng.int(1, 9) / 10;
      if (rng.chance(0.5)) {
        const deltas = [-0.02, -0.01, 0.01, 0.02, 0.03].filter((d) => a * b + d > 0 && a * b + d < Math.min(a, b));
        const indep = deltas.length === 0 || rng.chance(0.5);
        const both = indep ? r6(a * b) : r6(a * b + rng.pick(deltas));
        const q = choice(rng, {
          prompt: `$P(A) = ${dt(a)}$, $P(B) = ${dt(b)}$ and $P(A \\text{ and } B) = ${dt(both)}$. Are $A$ and $B$ independent?`,
          correct: indep ? { id: 'yes', text: 'Yes, they are independent' } : { id: 'no', text: 'No, they are not independent' },
          distractors: [indep ? { id: 'no', text: 'No, they are not independent', feedback: `$P(A) \\times P(B) = ${dt(a * b)}$, which equals $P(A \\text{ and } B)$: that is exactly the test for independence.` } : { id: 'yes', text: 'Yes, they are independent', feedback: `$P(A) \\times P(B) = ${dt(a * b)}$, but $P(A \\text{ and } B) = ${dt(both)}$. They are not equal.` }],
          code: 'independence',
          hints: ['$A$ and $B$ are independent exactly when $P(A \\text{ and } B) = P(A) \\times P(B)$.', `Work out $${dt(a)} \\times ${dt(b)}$ and compare.`],
          solution: [`$P(A) \\times P(B) = ${dt(a)} \\times ${dt(b)} = ${dt(a * b)}$`, indep ? `This equals $P(A \\text{ and } B)$, so $A$ and $B$ are independent.` : `This is not $${dt(both)}$, so $A$ and $B$ are not independent.`],
          keepOrder: [{ id: 'yes', text: 'Yes, they are independent' }, { id: 'no', text: 'No, they are not independent' }],
        });
        return q;
      }
      return decQ({
        prompt: `$A$ and $B$ are independent. $P(A) = ${dt(a)}$ and $P(A \\text{ and } B) = ${dt(a * b)}$. Find $P(B)$.`,
        value: b,
        hints: ['Independent: $P(A \\text{ and } B) = P(A) \\times P(B)$.', 'Divide.'],
        solution: [`$${dt(a * b)} = ${dt(a)} \\times P(B)$`, `$P(B) = ${dt(a * b)} \\div ${dt(a)} = ${dt(b)}$`],
        wrong: [{ code: 'independence', value: a * b - a, feedback: 'For independent events the probabilities multiply, so divide to undo it.' }],
      });
    }
    if (level === 3 || level === 4) {
      const bag = rng.pick(BAGS);
      const x = rng.int(2, 7);
      const y = rng.int(2, 7);
      const n = x + y;
      const replace = level === 3;
      const m = replace ? n : n - 1;
      const [A, B] = [bag.a, bag.b];
      const ask = rng.int(0, 3);
      const AA = x * (replace ? x : x - 1);
      const BB = y * (replace ? y : y - 1);
      const AB = x * y;
      const fav = ask === 0 ? AA : ask === 1 ? AA + BB : ask === 2 ? 2 * AB : AA + 2 * AB;
      const event = [`both are ${A[0]}`, 'both are the same colour', 'one of each colour is chosen', `at least one is ${A[0]}`][ask]!;
      const wrongReplace = ask === 0 ? x * x : ask === 1 ? x * x + y * y : ask === 2 ? 2 * x * y : x * x + 2 * x * y;
      return fracQ({
        prompt: `${bag.where[0]!.toUpperCase()}${bag.where.slice(1)} holds ${x} ${A[0]} and ${y} ${B[0]} ${bag.what}. Two are taken out one after the other, ${replace ? 'and the first is put back before the second is taken' : 'without putting the first one back'}. Find the probability that ${event}.`,
        ...(replace ? { figure: { kind: 'tree' as const, alt: `Tree diagram for two draws with replacement: first draw ${A[1]} with probability ${x} over ${n} or ${B[1]} with ${y} over ${n}; the second draw has the same probabilities.`, branches: drawTree(x, y, true, A[1], B[1]) } } : {}),
        n: fav,
        d: n * m,
        hints: [replace ? 'Each draw has the same probabilities, because the first one is put back.' : `After the first is taken there are ${n - 1} left, and one fewer of the colour that was taken. Draw a tree.`, ask === 2 ? `"One of each" can happen two ways: ${A[1]} then ${B[1]}, or ${B[1]} then ${A[1]}. Add them.` : 'Multiply along each branch, then add the branches that fit the event.'],
        solution: [
          `$P(${A[1]}${A[1]}) = \\frac{${x}}{${n}} \\times \\frac{${replace ? x : x - 1}}{${m}} = \\frac{${AA}}{${n * m}}$`,
          `$P(${A[1]}${B[1]}) = P(${B[1]}${A[1]}) = \\frac{${x}}{${n}} \\times \\frac{${y}}{${m}} = \\frac{${AB}}{${n * m}}$`,
          `$P(${B[1]}${B[1]}) = \\frac{${y}}{${n}} \\times \\frac{${replace ? y : y - 1}}{${m}} = \\frac{${BB}}{${n * m}}$`,
          `$P(\\text{${event}}) = ${show(fav, n * m)}$`,
        ],
        wrong: [
          ...(ask === 2 ? [{ code: 'tree-branches' as const, n: AB, d: n * m, feedback: `That is only ${A[1]} then ${B[1]}. ${B[1]} then ${A[1]} also gives one of each: add both branches.` }] : []),
          ...(!replace ? [{ code: 'with-replacement' as const, n: wrongReplace, d: n * n, feedback: `Without replacement, the second draw is from ${n - 1} ${bag.what}, not ${n}.` }] : []),
        ],
      });
    }
    // Level 5: a two-way table, or a three-set Venn diagram.
    const kind = rng.int(0, 2);
    if (kind < 2) {
      const ctx = rng.pick(TABLES);
      const N = rng.pick([100, 200, 400]);
      const R1 = (N / 10) * rng.int(3, 7);
      const C1 = (N / 10) * rng.int(2, 8);
      let a = (R1 * C1) / N;
      const indep = kind === 0 ? rng.chance(0.5) : rng.chance(0.3);
      // Off by 2–4 hundredths of N: never negative, and never accidentally independent.
      if (!indep) a += rng.pick([-1, 1]) * rng.int(2, 4) * (N / 100);
      const b = R1 - a;
      const c = C1 - a;
      const d = N - R1 - C1 + a;
      const table: Figure = {
        kind: 'table',
        alt: `Two-way table of ${N} people.`,
        rows: [['', ctx.cols[0], ctx.cols[1], 'Total'], [ctx.rows[0], `${a}`, `${b}`, `${R1}`], [ctx.rows[1], `${c}`, `${d}`, `${N - R1}`], ['Total', `${C1}`, `${N - C1}`, `${N}`]],
      };
      if (kind === 0) {
        const q = choice(rng, {
          prompt: `The table shows ${N} people. One is chosen at random. Are the events "${ctx.r}" and "${ctx.c}" independent?`,
          correct: indep ? { id: 'yes', text: 'Yes, they are independent' } : { id: 'no', text: 'No, they are not independent' },
          distractors: [indep ? { id: 'no', text: 'No, they are not independent', feedback: `$P(\\text{both}) = \\frac{${a}}{${N}}$ and $\\frac{${R1}}{${N}} \\times \\frac{${C1}}{${N}}$ give the same value, so they are independent.` } : { id: 'yes', text: 'Yes, they are independent', feedback: `$\\frac{${R1}}{${N}} \\times \\frac{${C1}}{${N}} = ${dt((R1 * C1) / (N * N))}$, but $P(\\text{both}) = \\frac{${a}}{${N}} = ${dt(a / N)}$. Not equal.` }],
          code: 'independence',
          hints: ['Find $P(\\text{first})$, $P(\\text{second})$ and $P(\\text{both})$ from the totals.', 'Independent exactly when $P(\\text{both}) = P(\\text{first}) \\times P(\\text{second})$.'],
          solution: [`$P(\\text{${ctx.r}}) = \\frac{${R1}}{${N}}$, $P(\\text{${ctx.c}}) = \\frac{${C1}}{${N}}$`, `Product: $${dt((R1 * C1) / (N * N))}$; $P(\\text{both}) = \\frac{${a}}{${N}} = ${dt(a / N)}$`, indep ? 'Equal, so the events are independent.' : 'Not equal, so the events are not independent.'],
          keepOrder: [{ id: 'yes', text: 'Yes, they are independent' }, { id: 'no', text: 'No, they are not independent' }],
        });
        return { ...q, figure: table };
      }
      const fav = R1 + C1 - a;
      return fracQ({
        prompt: `The table shows ${N} people. One is chosen at random. Find the probability that the person ${ctx.r} or ${ctx.c} (or both).`,
        figure: table,
        n: fav,
        d: N,
        hints: ['Addition rule: $P(A \\text{ or } B) = P(A) + P(B) - P(A \\text{ and } B)$.', 'Read $P(A)$ and $P(B)$ from the totals and $P(A \\text{ and } B)$ from the cell where they meet.'],
        solution: [`$P = \\frac{${R1}}{${N}} + \\frac{${C1}}{${N}} - \\frac{${a}}{${N}} = ${show(fav, N)}$`],
        wrong: [{ code: 'addition-rule', n: R1 + C1, d: N, feedback: `The ${a} in both groups are counted twice. Subtract them once.` }],
      });
    }
    // Three-set Venn diagram.
    const c = rng.pick(CONTEXTS);
    const keys = ['0', '1', '2', '01', '02', '12', '012', ''] as const;
    const r: Record<string, number> = Object.fromEntries(keys.map((k) => [k, rng.int(k.length === 3 ? 1 : 2, k.length >= 2 ? 6 : 12)]));
    const n = keys.reduce((s, k) => s + r[k]!, 0);
    const [A, B, C] = c.sets;
    const asks = [
      { phrase: `${c.verb[0]} exactly one of ${A[0]}, ${B[0]} and ${C[0]}`, keys: ['0', '1', '2'] },
      { phrase: `${c.verb[0]} at least two of ${A[0]}, ${B[0]} and ${C[0]}`, keys: ['01', '02', '12', '012'] },
      { phrase: `${c.verb[0]} ${A[0]} and ${B[0]} but not ${C[0]}`, keys: ['01'] },
      { phrase: `${c.verb[0]} none of ${A[0]}, ${B[0]} and ${C[0]}`, keys: [''] },
      { phrase: `${c.verb[0]} ${A[0]} or ${B[0]} (or both)`, keys: ['0', '1', '01', '02', '12', '012'] },
    ];
    const ask = rng.pick(asks);
    const fav = ask.keys.reduce((s, k) => s + r[k]!, 0);
    return fracQ({
      prompt: `The Venn diagram shows ${n} ${c.group}. ${A[1]}: ${c.verb[0]} ${A[0]}; ${B[1]}: ${c.verb[0]} ${B[0]}; ${C[1]}: ${c.verb[0]} ${C[0]}. One is chosen at random. Find the probability that the ${c.who} ${ask.phrase}.`,
      figure: venn([A[1], B[1], C[1]], n, r, `Three-set Venn diagram of ${n} ${c.group}.`),
      n: fav,
      d: n,
      hints: ['Shade the regions that match the event before you add.', `Divide by the total, ${n}.`],
      solution: [`The matching regions add up to ${fav}.`, `$P = ${show(fav, n)}$`],
      wrong: [],
    });
  },
};

// ---------------------------------------------------------------------------
// Grade 12: counting

const FACT = (k: number): number => (k <= 1 ? 1 : k * FACT(k - 1));
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);
/** Words with no repeated letters. */
const DISTINCT_WORDS = ['MATHS', 'NUMBER', 'DURBAN', 'MZANSI', 'TSHWANE', 'NUMBERS', 'FACTORS', 'PRIMES', 'FRIDAY', 'DOMAIN', 'GRAPHS', 'LIMIT'] as const;
/** Words with repeated letters (n ≤ 9, so the test can list every arrangement). */
const REPEAT_WORDS = ['BANANA', 'LETTER', 'PEPPER', 'SOWETO', 'KAROO', 'GAUTENG', 'ALGEBRA', 'LIMPOPO', 'MAMELODI', 'COMMITTEE', 'PRETORIA', 'BOTSWANA', 'EXCELLENT'] as const;
/** 500000 → "500 000" */
const group = (v: number) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const NAMES = [['Thabo', 'Lerato'], ['Sipho', 'Ayanda'], ['Kagiso', 'Naledi'], ['Lwazi', 'Zinhle'], ['Pieter', 'Anele']] as const;

export const countingPrinciple: QuestionTemplate = {
  id: 'counting-principle',
  skillId: 'counting-principle',
  generate(rng, level) {
    if (level === 1) {
      const v = rng.int(0, 2);
      if (v === 0) {
        const [s, p, h] = [rng.int(3, 8), rng.int(2, 6), rng.int(2, 5)];
        return {
          prompt: `Nomsa has ${s} shirts, ${p} pairs of trousers and ${h} pairs of shoes. How many different outfits of one shirt, one pair of trousers and one pair of shoes can she make?`,
          input: { kind: 'numeric' },
          answer: exact(s * p * h),
          answerDisplay: `$${s * p * h}$`,
          hints: ['Fundamental counting principle: if one choice can be made in $a$ ways and the next in $b$ ways, together they can be made in $a \\times b$ ways.'],
          solution: [`$${s} \\times ${p} \\times ${h} = ${s * p * h}$`],
          misconceptions: keepNum([{ code: 'counting-principle', answer: exact(s + p + h), feedback: 'Each shirt goes with every pair of trousers, and each of those with every pair of shoes: multiply, don\'t add.' }], s * p * h),
        };
      }
      const len = rng.int(3, 5);
      const rep = rng.chance(0.5);
      const digits = v === 1;
      const pool = digits ? 10 : 26;
      const ans = rep ? pool ** len : FACT(pool) / FACT(pool - len);
      return {
        prompt: digits ? `How many ${len}-digit codes can be made from the digits 0 to 9 if digits ${rep ? 'may' : 'may not'} be repeated? (A code may start with 0.)` : `How many ${len}-letter codes can be made from the 26 letters of the alphabet if letters ${rep ? 'may' : 'may not'} be repeated?`,
        input: { kind: 'numeric' },
        answer: exact(ans),
        answerDisplay: `$${String(ans).replace(/\B(?=(\d{3})+(?!\d))/g, '\\ ')}$`,
        hints: [`Draw ${len} boxes, one per position, and write in each how many choices there are.`, rep ? `Repetition is allowed, so every box has ${pool} choices.` : 'No repetition: each box has one choice fewer than the box before.'],
        solution: [rep ? `$${Array(len).fill(pool).join(' \\times ')} = ${ans}$` : `$${Array.from({ length: len }, (_, i) => pool - i).join(' \\times ')} = ${ans}$`],
        misconceptions: keepNum([rep ? { code: 'counting-principle', answer: exact(FACT(pool) / FACT(pool - len)), feedback: 'Repetition is allowed, so the choices don\'t go down: every position has all of them.' } : { code: 'counting-principle', answer: exact(pool ** len), feedback: 'No repetition: once a symbol is used it can\'t be used again, so each position has one choice fewer.' }], ans),
      };
    }
    if (level === 2) {
      const n = rng.int(4, 9);
      const items = rng.pick([`${n} different books`, `${n} different trophies`, `${n} learners`, `${n} different photos`]);
      const where = items.includes('learners') ? 'stand in a row' : 'be arranged in a row on a shelf';
      return {
        prompt: `In how many ways can ${items} ${where}?`,
        input: { kind: 'numeric' },
        answer: exact(FACT(n)),
        answerDisplay: `$${n}! = ${FACT(n)}$`,
        hints: [`The first place can be filled in ${n} ways, the second in ${n - 1}, and so on.`, `That is $${n}! = ${n} \\times ${n - 1} \\times \\dots \\times 1$.`],
        solution: [`$${n}! = ${Array.from({ length: n }, (_, i) => n - i).join(' \\times ')} = ${FACT(n)}$`],
        misconceptions: keepNum([
          { code: 'counting-principle', answer: exact(n * n), feedback: 'Once an item is placed it can\'t be used again, so the choices go down: $n \\times (n - 1) \\times \\dots \\times 1$.' },
          { code: 'counting-principle', answer: exact((n * (n + 1)) / 2), feedback: 'Multiply the choices for each place; don\'t add them.' },
        ], FACT(n)),
      };
    }
    if (level === 3) {
      const v = rng.int(0, 3);
      if (v < 3) {
        const n = rng.int(5, 8);
        const [p, q] = rng.pick(NAMES);
        const ans = v === 0 ? 2 * FACT(n - 1) : v === 1 ? FACT(n) - 2 * FACT(n - 1) : 2 * FACT(n - 1);
        const rule = v === 0 ? `${p} and ${q} must stand next to each other` : v === 1 ? `${p} and ${q} may not stand next to each other` : `${p} must stand at one of the two ends of the row`;
        return {
          prompt: `${n} friends, including ${p} and ${q}, stand in a row for a photo. In how many ways can they stand if ${rule}?`,
          input: { kind: 'numeric' },
          answer: exact(ans),
          answerDisplay: `$${ans}$`,
          hints:
            v === 2
              ? [`${p} has 2 choices of end. Then arrange the others.`]
              : [`Glue ${p} and ${q} together as one block: then there are ${n - 1} "items" to arrange, and the two inside the block can swap.`, ...(v === 1 ? [`"Not together" $=$ all arrangements $-$ the arrangements where they are together.`] : [])],
          solution:
            v === 2
              ? [`$2 \\times ${n - 1}! = 2 \\times ${FACT(n - 1)} = ${ans}$`]
              : [`Together: $${n - 1}! \\times 2 = ${2 * FACT(n - 1)}$`, ...(v === 1 ? [`Not together: $${n}! - ${2 * FACT(n - 1)} = ${FACT(n)} - ${2 * FACT(n - 1)} = ${ans}$`] : [])],
          misconceptions: keepNum(
            v === 0
              ? [{ code: 'arrangement-restriction', answer: exact(FACT(n - 1)), feedback: `Inside the block, ${p} and ${q} can stand two ways round. Multiply by 2.` }]
              : v === 1
                ? [{ code: 'arrangement-restriction', answer: exact(2 * FACT(n - 1)), feedback: 'That is the number of ways they *are* together. Subtract it from all the arrangements.' }, { code: 'arrangement-restriction', answer: exact(FACT(n) - FACT(n - 1)), feedback: 'Together counts both orders inside the block: subtract $2 \\times (n - 1)!$.' }]
                : [{ code: 'arrangement-restriction', answer: exact(FACT(n - 1)), feedback: 'There are two ends to choose from.' }],
            ans,
          ),
        };
      }
      const word = rng.pick(DISTINCT_WORDS);
      const n = word.length;
      const vow = [...word].filter((ch) => VOWELS.has(ch)).length;
      const startV = rng.chance(0.5) || n - vow < 2;
      const ans = startV ? vow * FACT(n - 1) : (n - vow) * (n - vow - 1) * FACT(n - 2);
      return {
        prompt: `How many different arrangements of the letters of the word ${word} ${startV ? 'begin with a vowel' : 'begin and end with a consonant'}? (The vowels are A, E, I, O and U.)`,
        input: { kind: 'numeric' },
        answer: exact(ans),
        answerDisplay: `$${ans}$`,
        hints: [`Fill the restricted ${startV ? 'place' : 'places'} first.`, `${word} has ${vow} vowel${vow === 1 ? '' : 's'} and ${n - vow} consonants.`],
        solution: startV ? [`First letter: ${vow} choices. The other ${n - 1} letters: $${n - 1}!$.`, `$${vow} \\times ${FACT(n - 1)} = ${ans}$`] : [`First: ${n - vow} consonants; last: ${n - vow - 1}; the middle ${n - 2} letters: $${n - 2}!$.`, `$${n - vow} \\times ${n - vow - 1} \\times ${FACT(n - 2)} = ${ans}$`],
        misconceptions: keepNum([{ code: 'arrangement-restriction', answer: exact(FACT(n)), feedback: 'That is every arrangement. Fill the restricted places first, then arrange the rest.' }], ans),
      };
    }
    if (level === 4) {
      const word = rng.pick(REPEAT_WORDS);
      const counts = new Map<string, number>();
      for (const ch of word) counts.set(ch, (counts.get(ch) ?? 0) + 1);
      const reps = [...counts.entries()].filter(([, k]) => k > 1);
      const ans = reps.reduce((v, [, k]) => v / FACT(k), FACT(word.length));
      return {
        prompt: `How many different arrangements can be made of all the letters of the word ${word}?`,
        input: { kind: 'numeric' },
        answer: exact(ans),
        answerDisplay: `$${ans}$`,
        hints: [`${word} has ${word.length} letters, but some are the same: ${reps.map(([ch, k]) => `${k} ${ch}s`).join(', ')}.`, 'Swapping two identical letters makes no new arrangement, so divide by the factorial of each repeat count.'],
        solution: [`$\\dfrac{${word.length}!}{${reps.map(([, k]) => `${k}!`).join(' \\times ')}} = \\dfrac{${FACT(word.length)}}{${reps.reduce((v, [, k]) => v * FACT(k), 1)}} = ${ans}$`],
        misconceptions: keepNum([{ code: 'identical-items', answer: exact(FACT(word.length)), feedback: 'Some letters are the same, so many of those arrangements look identical. Divide by the factorial of each repeat count.' }], ans),
      };
    }
    // Level 5: probability by counting.
    const v = rng.int(0, 3);
    if (v === 0) {
      const word = rng.pick(DISTINCT_WORDS);
      const vow = [...word].filter((ch) => VOWELS.has(ch)).length;
      return fracQ({
        prompt: `The letters of the word ${word} are arranged in a random order. Find the probability that the arrangement begins with a vowel. (The vowels are A, E, I, O and U.)`,
        n: vow * FACT(word.length - 1),
        d: FACT(word.length),
        hints: ['$P = \\dfrac{\\text{arrangements that begin with a vowel}}{\\text{all arrangements}}$', `All arrangements: $${word.length}!$. Beginning with a vowel: ${vow} choices for the first letter, then $${word.length - 1}!$.`],
        solution: [`$P = \\dfrac{${vow} \\times ${word.length - 1}!}{${word.length}!} = ${show(vow, word.length)}$`],
        wrong: [{ code: 'arrangement-restriction', n: vow, d: 5, feedback: `Count the vowels in ${word}, not the five vowels of the alphabet: the first letter is one of the ${word.length} letters.` }],
      });
    }
    if (v === 1) {
      const n = rng.int(5, 8);
      const [p, q] = rng.pick(NAMES);
      return fracQ({
        prompt: `${n} friends, including ${p} and ${q}, stand in a row in a random order. Find the probability that ${p} and ${q} stand next to each other.`,
        n: 2 * FACT(n - 1),
        d: FACT(n),
        hints: [`All arrangements: $${n}!$.`, `Together: glue them into one block, $${n - 1}! \\times 2$.`],
        solution: [`$P = \\dfrac{2 \\times ${n - 1}!}{${n}!} = \\dfrac{2}{${n}}${n % 2 === 0 ? ` = ${ratTex(rat(2, n))}` : ''}$`],
        wrong: [{ code: 'arrangement-restriction', n: 1, d: n, feedback: 'The pair can stand two ways round inside the block: multiply by 2.' }],
      });
    }
    const n = rng.int(5, 7);
    const evens = Math.floor(n / 2);
    if (v === 2)
      return fracQ({
        prompt: `The digits 1 to ${n} are each used once, in a random order, to make a ${n}-digit number. Find the probability that the number is even.`,
        n: evens * FACT(n - 1),
        d: FACT(n),
        hints: ['A number is even when its last digit is even.', `There are ${evens} even digits from 1 to ${n}.`],
        solution: [`Last digit: ${evens} choices; the other ${n - 1} digits: $${n - 1}!$.`, `$P = \\dfrac{${evens} \\times ${n - 1}!}{${n}!} = ${show(evens, n)}$`],
        wrong: [{ code: 'arrangement-restriction', n: 1, d: 2, feedback: `Half of all whole numbers are even, but here the last digit is one of 1 to ${n}, and only ${evens} of those are even.` }],
      });
    const big = rng.int(Math.ceil(n / 2) + 1, n - 1);
    const fav = (n - big + 1) * FACT(n - 1);
    return fracQ({
      prompt: `The digits 1 to ${n} are each used once, in a random order, to make a ${n}-digit number. Find the probability that the number is greater than ${group(big * 10 ** (n - 1))}.`,
      n: fav,
      d: FACT(n),
      hints: [`The number is greater than ${group(big * 10 ** (n - 1))} when its first digit is ${big} or more.`, `That leaves ${n - big + 1} choices for the first digit.`],
      solution: [`First digit: ${n - big + 1} choices (${Array.from({ length: n - big + 1 }, (_, i) => big + i).join(', ')}); then $${n - 1}!$.`, `$P = \\dfrac{${n - big + 1} \\times ${n - 1}!}{${n}!} = ${show(n - big + 1, n)}$`],
      wrong: [{ code: 'arrangement-restriction', n: n - big, d: n, feedback: `${big} itself works as a first digit: with the other digits after it, the number is more than ${group(big * 10 ** (n - 1))}.` }],
    });
  },
};
