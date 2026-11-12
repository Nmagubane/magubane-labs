import type { QuestionTemplate, Misconception, Figure, AnswerSpec } from '../types.ts';
import type { Rng } from '../rng.ts';
import type { MistakeCode } from '../mistakes.ts';
import { choice } from './kit.ts';

/**
 * Statistics, Grades 10–12 (CAPS Paper 2). Quartile questions use n = 4k + 3 values, where the two common
 * school methods (median of each half, and position (n + 1)/4) give the same answer, so no learner is marked
 * wrong for the method their teacher taught. Standard deviation is the population σ (divide by n), as in CAPS.
 */

const tc = (v: number, dp = 2) => v.toFixed(dp).replace('.', '{,}');
const pc = (v: number, dp = 2) => (Number.isInteger(v) ? String(v) : v.toFixed(dp).replace('.', ','));
const r2 = (v: number) => Math.round(v * 100) / 100;
const list = (vs: number[]) => vs.map((v) => pc(v)).join('; ');
const sum = (vs: number[]) => vs.reduce((a, b) => a + b, 0);
const mean = (vs: number[]) => sum(vs) / vs.length;
const sorted = (vs: number[]) => [...vs].sort((a, b) => a - b);
function median(vs: number[]): number {
  const s = sorted(vs);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2]! : (s[n / 2 - 1]! + s[n / 2]!) / 2;
}
/** Five-number summary for n = 4k + 3 values. */
export function fiveNumber(vs: number[]) {
  const s = sorted(vs);
  const k = (s.length - 3) / 4;
  return { min: s[0]!, q1: s[k]!, med: s[2 * k + 1]!, q3: s[3 * k + 2]!, max: s[s.length - 1]! };
}
export const sigma = (vs: number[]) => {
  const m = mean(vs);
  return Math.sqrt(sum(vs.map((v) => (v - m) ** 2)) / vs.length);
};

function keep(ms: { code: MistakeCode; value: number | null; feedback: string }[], correct: number, tol: number): Misconception[] {
  const seen = [correct];
  const out: Misconception[] = [];
  for (const m of ms) {
    if (m.value === null || !Number.isFinite(m.value) || seen.some((s) => Math.abs(s - m.value!) <= 2 * tol + 1e-9)) continue;
    seen.push(m.value);
    out.push({ code: m.code, answer: { kind: 'numeric', value: m.value, tolerance: tol }, feedback: m.feedback });
  }
  return out;
}
const num = (v: number, tol: number): AnswerSpec => ({ kind: 'numeric', value: v, tolerance: tol });

const CONTEXTS = [
  { what: 'the marks (out of 50) that learners scored in a class test', unit: 'marks', lo: 12, hi: 50 },
  { what: 'the number of minutes taxis waited at a rank before leaving full', unit: 'minutes', lo: 4, hi: 45 },
  { what: 'the heights, in cm, of bean seedlings after three weeks', unit: 'cm', lo: 6, hi: 30 },
  { what: 'the number of push-ups learners did in one minute', unit: 'push-ups', lo: 8, hi: 52 },
  { what: 'the daily rainfall, in mm, in Pietermaritzburg on rainy days in January', unit: 'mm', lo: 2, hi: 40 },
  { what: 'the number of litres of water a household used in an hour', unit: 'litres', lo: 10, hi: 60 },
] as const;
type Ctx = (typeof CONTEXTS)[number];

function data(rng: Rng, n: number, c: Ctx, distinct = false): number[] {
  const out: number[] = [];
  while (out.length < n) {
    const v = rng.int(c.lo, c.hi);
    if (distinct && out.includes(v)) continue;
    out.push(v);
  }
  return out;
}

function boxFigure(f: ReturnType<typeof fiveNumber>, title: string): Figure {
  const y0 = 1;
  const y1 = 3;
  const ym = 2;
  const pad = Math.max(2, Math.round((f.max - f.min) * 0.1));
  return {
    kind: 'graph',
    hideY: true,
    xTitle: title,
    xRange: [Math.floor((f.min - pad) / 5) * 5, Math.ceil((f.max + pad) / 5) * 5],
    yRange: [0, 4],
    segments: [
      { x1: f.min, y1: ym, x2: f.q1, y2: ym },
      { x1: f.q3, y1: ym, x2: f.max, y2: ym },
      { x1: f.q1, y1: y0, x2: f.q3, y2: y0 },
      { x1: f.q1, y1: y1, x2: f.q3, y2: y1 },
      { x1: f.q1, y1: y0, x2: f.q1, y2: y1 },
      { x1: f.q3, y1: y0, x2: f.q3, y2: y1 },
      { x1: f.med, y1: y0, x2: f.med, y2: y1 },
      { x1: f.min, y1: ym - 0.5, x2: f.min, y2: ym + 0.5 },
      { x1: f.max, y1: ym - 0.5, x2: f.max, y2: ym + 0.5 },
    ],
  };
}

// ---------------------------------------------------------------------------
export const statsSummary: QuestionTemplate = {
  id: 'stats-summary',
  skillId: 'stats-summary',
  generate(rng, level) {
    const c = rng.pick(CONTEXTS);
    if (level === 1) {
      const n = rng.int(7, 11);
      const vs = data(rng, n, c);
      const m = mean(vs);
      return {
        prompt: `The data shows ${c.what}: ${list(vs)}. Find the mean. Round to two decimal places if necessary.`,
        input: { kind: 'numeric', prefix: '\\bar{x} =', unit: c.unit },
        answer: num(r2(m), 0.011),
        answerDisplay: `$\\bar{x} = ${tc(r2(m))}$ ${c.unit}`,
        hints: ['Add all the values, then divide by how many values there are.', `There are ${n} values.`],
        solution: [`$\\Sigma x = ${sum(vs)}$ and $n = ${n}$.`, `$\\bar{x} = \\dfrac{${sum(vs)}}{${n}} = ${tc(r2(m))}$`],
        misconceptions: keep(
          [
            { code: 'mean-median', value: r2(median(vs)), feedback: 'That is the median (the middle value). The mean is the total divided by the number of values.' },
            { code: 'mean-median', value: r2(sum(vs) / (n - 1)), feedback: `Divide by the number of values, ${n}.` },
          ],
          r2(m),
          0.011,
        ),
      };
    }
    if (level === 2) {
      const n = rng.int(8, 12);
      let vs: number[];
      do vs = data(rng, n, c);
      while (median(vs) === vs[Math.floor((n - 1) / 2)] && median(vs) === vs[Math.floor(n / 2)]);
      const md = median(vs);
      const naive = n % 2 ? vs[(n - 1) / 2]! : (vs[n / 2 - 1]! + vs[n / 2]!) / 2;
      const s = sorted(vs);
      return {
        prompt: `The data shows ${c.what}: ${list(vs)}. Find the median.`,
        input: { kind: 'numeric', prefix: '\\text{Median} =', unit: c.unit },
        answer: num(md, 0.001),
        answerDisplay: `Median $= ${tc(md, Number.isInteger(md) ? 0 : 1)}$ ${c.unit}`,
        hints: ['Write the data in order first.', n % 2 ? `There are ${n} values, so the median is value number ${(n + 1) / 2}.` : `There are ${n} values (even), so the median is halfway between values ${n / 2} and ${n / 2 + 1}.`],
        solution: [`In order: ${list(s)}`, n % 2 ? `The middle (value ${(n + 1) / 2}) is $${md}$.` : `The middle two are $${s[n / 2 - 1]}$ and $${s[n / 2]}$, so the median is $${tc(md, 1)}$.`],
        misconceptions: keep(
          [
            { code: 'data-order', value: naive, feedback: 'That is the middle of the list as given. Put the data in order first.' },
            { code: 'mean-median', value: r2(mean(vs)), feedback: 'That is the mean. The median is the middle value of the ordered data.' },
          ],
          md,
          0.001,
        ),
      };
    }
    if (level === 3 || level === 4) {
      const n = rng.pick([7, 11, 15]);
      let vs: number[];
      let f: ReturnType<typeof fiveNumber>;
      do {
        vs = data(rng, n, c);
        f = fiveNumber(vs);
      } while (f.q1 === f.q3 || f.q3 - f.q1 === f.max - f.min);
      if (level === 3) {
        const ask = rng.pick(['q1', 'q3', 'iqr'] as const);
        const v = ask === 'q1' ? f.q1 : ask === 'q3' ? f.q3 : f.q3 - f.q1;
        const name = ask === 'iqr' ? 'the interquartile range (IQR)' : ask === 'q1' ? 'the lower quartile $Q_1$' : 'the upper quartile $Q_3$';
        const k = (n - 3) / 4;
        return {
          prompt: `The data shows ${c.what}: ${list(vs)}. Find ${name}.`,
          input: { kind: 'numeric', prefix: ask === 'iqr' ? '\\text{IQR} =' : ask === 'q1' ? 'Q_1 =' : 'Q_3 =' },
          answer: num(v, 0.001),
          answerDisplay: `$${ask === 'iqr' ? `\\text{IQR} = ${f.q3} - ${f.q1} = ${v}` : `${ask === 'q1' ? 'Q_1' : 'Q_3'} = ${v}`}$`,
          hints: ['Order the data and find the median first. It splits the data into a lower half and an upper half.', `$Q_1$ is the median of the lower ${2 * k + 1} values; $Q_3$ is the median of the upper ${2 * k + 1}.`],
          solution: [`In order: ${list(sorted(vs))}`, `Median = $${f.med}$ (value ${2 * k + 2}). $Q_1 = ${f.q1}$ (value ${k + 1}), $Q_3 = ${f.q3}$ (value ${3 * k + 3}).`, ...(ask === 'iqr' ? [`$\\text{IQR} = Q_3 - Q_1 = ${f.q3} - ${f.q1} = ${v}$`] : [])],
          misconceptions: keep(
            ask === 'iqr'
              ? [
                  { code: 'quartile', value: f.max - f.min, feedback: 'That is the range (max − min). The IQR is $Q_3 - Q_1$.' },
                  { code: 'quartile', value: f.q3 - f.med, feedback: 'The IQR runs from $Q_1$ to $Q_3$, not from the median.' },
                ]
              : [
                  { code: 'quartile', value: ask === 'q1' ? f.q3 : f.q1, feedback: `That is the ${ask === 'q1' ? 'upper' : 'lower'} quartile. $Q_1$ is in the lower half, $Q_3$ in the upper half.` },
                  { code: 'data-order', value: ask === 'q1' ? vs[k]! : vs[3 * k + 2]!, feedback: 'Put the data in order first.' },
                ],
            v,
            0.001,
          ),
        };
      }
      // Level 4: read the box-and-whisker plot.
      const ask = rng.pick(['iqr', 'range', 'pctAboveQ1', 'pctMedQ3', 'pctBelowQ3'] as const);
      const v = ask === 'iqr' ? f.q3 - f.q1 : ask === 'range' ? f.max - f.min : ask === 'pctAboveQ1' ? 75 : ask === 'pctMedQ3' ? 25 : 75;
      const q = ask === 'iqr' ? 'What is the interquartile range?' : ask === 'range' ? 'What is the range?' : ask === 'pctAboveQ1' ? `What percentage of the data is more than ${f.q1}?` : ask === 'pctMedQ3' ? `What percentage of the data lies between ${f.med} and ${f.q3}?` : `What percentage of the data is less than ${f.q3}?`;
      return {
        prompt: `The box-and-whisker plot shows ${c.what}. The five-number summary is (${f.min}; ${f.q1}; ${f.med}; ${f.q3}; ${f.max}). ${q}`,
        figure: boxFigure(f, c.unit[0]!.toUpperCase() + c.unit.slice(1)),
        input: { kind: 'numeric', unit: ask.startsWith('pct') ? '%' : undefined },
        answer: num(v, 0.001),
        answerDisplay: ask.startsWith('pct') ? `$${v}\\%$` : `$${v}$`,
        hints: ['The five numbers are: minimum, $Q_1$, median, $Q_3$, maximum.', 'Each of the four sections of the plot holds 25% of the data.'],
        solution: [ask === 'iqr' ? `$\\text{IQR} = Q_3 - Q_1 = ${f.q3} - ${f.q1} = ${v}$` : ask === 'range' ? `Range $= ${f.max} - ${f.min} = ${v}$` : `Each section holds 25%, so the answer is $${v}\\%$.`],
        misconceptions: keep(
          ask === 'iqr'
            ? [{ code: 'quartile', value: f.max - f.min, feedback: 'That is the range. IQR = $Q_3 - Q_1$.' }]
            : ask === 'range'
              ? [{ code: 'quartile', value: f.q3 - f.q1, feedback: 'That is the IQR. The range is max − min.' }]
              : [{ code: 'quartile', value: 100 - v, feedback: 'Count the sections: each is a quarter of the data.' }, { code: 'quartile', value: 50, feedback: 'Each section of the box plot is 25%, whatever its width.' }],
          v,
          0.001,
        ),
      };
    }
    // Level 5: estimated mean of grouped data.
    const w = rng.pick([5, 10, 10, 20]);
    const k = rng.int(4, 6);
    const start = w === 5 ? rng.pick([0, 10, 20]) : rng.pick([0, 0, 20, 40]);
    const classes = Array.from({ length: k }, (_, i) => ({ lo: start + i * w, hi: start + (i + 1) * w, f: rng.int(2, 14) }));
    const total = sum(classes.map((cl) => cl.f));
    const fx = sum(classes.map((cl) => cl.f * (cl.lo + cl.hi) / 2));
    const m = fx / total;
    const tbl = classes.map((cl) => `$${cl.lo} \\le x < ${cl.hi}$: ${cl.f}`).join('; ');
    return {
      prompt: `The frequency table shows ${c.what}, in classes. ${tbl}. Estimate the mean. Round to two decimal places.`,
      input: { kind: 'numeric', prefix: '\\bar{x} \\approx' },
      answer: num(r2(m), 0.011),
      answerDisplay: `$\\bar{x} \\approx ${tc(r2(m))}$`,
      hints: ['You don\'t know the exact values, so use the midpoint of each class.', '$\\bar{x} \\approx \\dfrac{\\Sigma f \\times \\text{midpoint}}{\\Sigma f}$'],
      solution: [`Midpoints: ${classes.map((cl) => pc((cl.lo + cl.hi) / 2)).join('; ')}.`, `$\\Sigma f \\times \\text{midpoint} = ${tc(fx, Number.isInteger(fx) ? 0 : 1)}$ and $\\Sigma f = ${total}$.`, `$\\bar{x} \\approx \\dfrac{${tc(fx, Number.isInteger(fx) ? 0 : 1)}}{${total}} = ${tc(r2(m))}$`],
      misconceptions: keep(
        [
          { code: 'grouped-mean', value: r2(sum(classes.map((cl) => cl.f * cl.lo)) / total), feedback: 'Use the midpoint of each class, not its lower boundary.' },
          { code: 'grouped-mean', value: r2(fx / k), feedback: `Divide by the total frequency (${total}), not by the number of classes.` },
        ],
        r2(m),
        0.011,
      ),
    };
  },
};
