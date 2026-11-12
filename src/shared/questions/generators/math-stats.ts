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
  { what: 'the marks (out of 50) that learners scored in a class test', unit: 'marks', axis: 'Mark (out of 50)', lo: 12, hi: 50 },
  { what: 'the number of minutes taxis waited at a rank before leaving full', unit: 'minutes', axis: 'Waiting time (minutes)', lo: 4, hi: 45 },
  { what: 'the heights, in cm, of bean seedlings after three weeks', unit: 'cm', axis: 'Height (cm)', lo: 6, hi: 30 },
  { what: 'the number of push-ups learners did in one minute', unit: 'push-ups', axis: 'Push-ups in one minute', lo: 8, hi: 52 },
  { what: 'the daily rainfall, in mm, in Pietermaritzburg on rainy days in January', unit: 'mm', axis: 'Rainfall (mm)', lo: 2, hi: 40 },
  { what: 'the number of litres of water a household used in an hour', unit: 'litres', axis: 'Water used (litres)', lo: 10, hi: 60 },
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
    xRange: [Math.max(f.min >= 0 ? 0 : -Infinity, Math.floor((f.min - pad) / 5) * 5), Math.ceil((f.max + pad) / 5) * 5],
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
        figure: boxFigure(f, c.axis),
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

// ---------------------------------------------------------------------------
export const statsSpread: QuestionTemplate = {
  id: 'stats-spread',
  skillId: 'stats-spread',
  generate(rng, level) {
    const c = rng.pick(CONTEXTS);
    if (level === 1) {
      const n = rng.int(5, 8);
      const vs = data(rng, n, c);
      const m = mean(vs);
      const s = sigma(vs);
      const v = s * s;
      return {
        prompt: `The data shows ${c.what}: ${list(vs)}. Find the standard deviation. Round to two decimal places.`,
        input: { kind: 'numeric', prefix: '\\sigma =' },
        answer: num(r2(s), 0.011),
        answerDisplay: `$\\sigma = ${tc(r2(s))}$`,
        hints: ['Find the mean first, then how far each value is from it.', '$\\sigma = \\sqrt{\\dfrac{\\Sigma(x - \\bar{x})^2}{n}}$, or use STAT mode on your calculator.'],
        solution: [`$\\bar{x} = ${tc(r2(m))}$`, `$\\Sigma(x - \\bar{x})^2 = ${tc(r2(v * n))}$, so the variance is $\\dfrac{${tc(r2(v * n))}}{${n}} = ${tc(r2(v))}$.`, `$\\sigma = \\sqrt{${tc(r2(v))}} = ${tc(r2(s))}$`],
        misconceptions: keep(
          [
            { code: 'std-dev', value: r2(Math.sqrt((v * n) / (n - 1))), feedback: 'You divided by $n - 1$ (the sample formula, $s$). CAPS uses $\\sigma$: divide by $n$. On a calculator, choose $\\sigma x$, not $sx$.' },
            { code: 'std-dev', value: r2(v), feedback: 'That is the variance. The standard deviation is its square root.' },
          ],
          r2(s),
          0.011,
        ),
      };
    }
    if (level === 2) {
      let vs: number[];
      let m: number;
      let s: number;
      do {
        vs = data(rng, rng.int(8, 12), c);
        m = mean(vs);
        s = sigma(vs);
      } while (vs.some((x) => Math.abs(Math.abs(x - m) - s) < 0.15 || Math.abs(Math.abs(x - m) - 2 * s) < 0.15));
      const inside = vs.filter((x) => Math.abs(x - m) < s).length;
      const in2 = vs.filter((x) => Math.abs(x - m) < 2 * s).length;
      return {
        prompt: `The data shows ${c.what}: ${list(vs)}. The mean is $${tc(r2(m))}$ and the standard deviation is $${tc(r2(s))}$. How many of the values lie within one standard deviation of the mean?`,
        input: { kind: 'numeric', unit: 'values' },
        answer: num(inside, 0.001),
        answerDisplay: `$${inside}$ values`,
        hints: ['Within one standard deviation means between $\\bar{x} - \\sigma$ and $\\bar{x} + \\sigma$.', `That is from $${tc(r2(m - s))}$ to $${tc(r2(m + s))}$.`],
        solution: [`$\\bar{x} - \\sigma = ${tc(r2(m - s))}$ and $\\bar{x} + \\sigma = ${tc(r2(m + s))}$.`, `Values in that interval: ${list(sorted(vs).filter((x) => Math.abs(x - m) < s))}.`, `That is $${inside}$ values.`],
        misconceptions: keep(
          [
            { code: 'std-dev', value: in2, feedback: 'That counts values within **two** standard deviations. Use $\\bar{x} \\pm \\sigma$.' },
            { code: 'std-dev', value: vs.length - inside, feedback: 'That counts the values **outside** the interval.' },
          ],
          inside,
          0.001,
        ),
      };
    }
    if (level === 3 || level === 4) {
      const w = rng.pick([10, 10, 20]);
      const k = rng.int(5, 6);
      const start = w === 20 ? 0 : rng.pick([0, 20, 30]);
      const fs = Array.from({ length: k }, (_, i) => rng.int(i === 0 || i === k - 1 ? 2 : 5, i === 0 || i === k - 1 ? 8 : 18));
      const cum: number[] = [];
      fs.reduce((a, f) => (cum.push(a + f), a + f), 0);
      const n = cum[cum.length - 1]!;
      const bounds = Array.from({ length: k + 1 }, (_, i) => start + i * w);
      const pts = [{ x: bounds[0]!, y: 0 }, ...cum.map((cf, i) => ({ x: bounds[i + 1]!, y: cf }))];
      const yTop = Math.ceil(n / 10) * 10 + 5;
      const fig: Figure = {
        kind: 'graph',
        xTitle: c.axis,
        yTitle: 'Cumulative frequency',
        xRange: [bounds[0]!, bounds[k]! + w / 2],
        yRange: [0, yTop],
        segments: pts.slice(1).map((p, i) => ({ x1: pts[i]!.x, y1: pts[i]!.y, x2: p.x, y2: p.y })),
        points: pts.map((p) => ({ x: p.x, y: p.y, text: `(${p.x}; ${p.y})` })),
      };
      const tbl = bounds.slice(0, k).map((b, i) => `$${b} \\le x < ${b + w}$: ${fs[i]}`).join('; ');
      if (level === 3) {
        const i = rng.int(1, k - 1);
        const B = bounds[i]!;
        const v = cum[i - 1]!;
        return {
          prompt: `The ogive (cumulative frequency graph) shows ${c.what}, for ${n} cases. How many were less than ${B}?`,
          figure: fig,
          input: { kind: 'numeric' },
          answer: num(v, 0.001),
          answerDisplay: `$${v}$`,
          hints: ['An ogive is plotted at the **upper** boundary of each class, with the running total.', `Find ${B} on the horizontal axis and read the cumulative frequency.`],
          solution: [`At $x = ${B}$ the cumulative frequency is $${v}$.`, `So ${v} were less than ${B}.`],
          misconceptions: keep(
            [
              { code: 'ogive', value: fs[i - 1]!, feedback: 'That is only the frequency of one class. The ogive gives the running total: everything below that value.' },
              { code: 'ogive', value: n - v, feedback: `That is how many were **${B} or more**. Read the cumulative frequency straight off the graph.` },
            ],
            v,
            0.001,
          ),
        };
      }
      // Level 4: estimate the median from the ogive.
      const half = n / 2;
      const j = cum.findIndex((cf) => cf >= half);
      const prev = j === 0 ? 0 : cum[j - 1]!;
      const md = bounds[j]! + ((half - prev) / (cum[j]! - prev)) * w;
      return {
        prompt: `The ogive shows ${c.what}, for ${n} cases (${tbl}). Use it to estimate the median.`,
        figure: fig,
        input: { kind: 'numeric', prefix: '\\text{Median} \\approx' },
        answer: { kind: 'numeric', value: r2(md), tolerance: w / 8 },
        answerDisplay: `Median $\\approx ${tc(r2(md), 1)}$`,
        hints: [`The median is the value with half the data below it: cumulative frequency $\\dfrac{${n}}{2} = ${pc(half)}$.`, 'Go across from that height to the curve, then down to the horizontal axis.'],
        solution: [`Half of ${n} is $${pc(half)}$.`, `That height is reached between $${bounds[j]}$ and $${bounds[j + 1]}$; reading down gives about $${tc(r2(md), 1)}$.`],
        misconceptions: keep([{ code: 'ogive', value: half, feedback: `${pc(half)} is how many values are below the median: a height on the vertical axis. The median is the value you read **down** on the horizontal axis.` }, { code: 'ogive', value: (bounds[j]! + bounds[j + 1]!) / 2, feedback: 'Read the graph at the right height rather than taking the middle of the class.' }], r2(md), w / 8),
      };
    }
    // Level 5: outliers.
    const n = rng.pick([11, 15]);
    let vs: number[];
    let f: ReturnType<typeof fiveNumber>;
    let outlier: number;
    const high = rng.chance(0.6);
    do {
      vs = data(rng, n - 1, { ...c, lo: c.lo + 4, hi: c.hi - 6 } as Ctx);
      const tmp = sorted(vs);
      const iqrGuess = tmp[Math.floor((3 * (n - 1)) / 4)]! - tmp[Math.floor((n - 1) / 4)]!;
      outlier = high ? tmp[tmp.length - 1]! + Math.max(3, Math.round(iqrGuess * 2)) : Math.max(0, tmp[0]! - Math.max(3, Math.round(iqrGuess * 2)));
      vs = rng.shuffle([...vs, outlier]);
      f = fiveNumber(vs);
    } while (f.q3 === f.q1 || (high ? outlier <= f.q3 + 1.5 * (f.q3 - f.q1) + 0.5 : outlier >= f.q1 - 1.5 * (f.q3 - f.q1) - 0.5) || sorted(vs).filter((x) => x > f.q3 + 1.5 * (f.q3 - f.q1) || x < f.q1 - 1.5 * (f.q3 - f.q1)).length !== 1);
    const iqr = f.q3 - f.q1;
    const s = sorted(vs);
    const other = high ? s[0]! : s[s.length - 1]!;
    return {
      prompt: `The data shows ${c.what}: ${list(vs)}. One value is an outlier. Which value is it?`,
      input: { kind: 'numeric' },
      answer: num(outlier, 0.001),
      answerDisplay: `$${outlier}$`,
      hints: ['Find $Q_1$, $Q_3$ and the IQR.', 'An outlier is below $Q_1 - 1{,}5 \\times \\text{IQR}$ or above $Q_3 + 1{,}5 \\times \\text{IQR}$.'],
      solution: [`In order: ${list(s)}`, `$Q_1 = ${f.q1}$, $Q_3 = ${f.q3}$, IQR $= ${iqr}$.`, `Fences: $${f.q1} - 1{,}5(${iqr}) = ${tc(f.q1 - 1.5 * iqr, 1)}$ and $${f.q3} + 1{,}5(${iqr}) = ${tc(f.q3 + 1.5 * iqr, 1)}$.`, `Only $${outlier}$ is outside the fences.`],
      misconceptions: keep([{ code: 'outlier', value: other, feedback: `${other} is the ${high ? 'smallest' : 'largest'} value, but it is inside the fence. An outlier must be beyond $Q_1 - 1{,}5\\,\\text{IQR}$ or $Q_3 + 1{,}5\\,\\text{IQR}$.` }], outlier, 0.001),
    };
  },
};

// ---------------------------------------------------------------------------
const PAIRS = [
  { x: 'hours studied', y: 'test mark (%)', xs: [1, 10], a: 30, b: 5 },
  { x: 'temperature (°C)', y: 'cold drinks sold', xs: [14, 34], a: -20, b: 4 },
  { x: 'distance (km)', y: 'taxi fare (R)', xs: [5, 40], a: 10, b: 1.5 },
  { x: 'age of a car (years)', y: 'value (R thousand)', xs: [1, 12], a: 320, b: -22 },
  { x: 'minutes on a phone per day', y: 'hours of sleep', xs: [30, 240], a: 9, b: -0.012 },
] as const;

export function regression(xs: number[], ys: number[]) {
  const n = xs.length;
  const mx = mean(xs);
  const my = mean(ys);
  const sxy = sum(xs.map((x, i) => (x - mx) * (ys[i]! - my)));
  const sxx = sum(xs.map((x) => (x - mx) ** 2));
  const syy = sum(ys.map((y) => (y - my) ** 2));
  const b = sxy / sxx;
  return { n, mx, my, b, a: my - b * mx, r: sxy / Math.sqrt(sxx * syy), bxy: sxy / syy };
}

function pairData(rng: Rng, p: (typeof PAIRS)[number], noise: number, flip = false) {
  const n = rng.int(6, 9);
  const xs: number[] = [];
  while (xs.length < n) {
    const x = rng.int(p.xs[0], p.xs[1]);
    if (!xs.includes(x)) xs.push(x);
  }
  xs.sort((a, b) => a - b);
  const span = Math.abs(p.b) * (p.xs[1] - p.xs[0]);
  const ys = xs.map((x) => {
    const base = p.a + (flip ? -p.b : p.b) * x + (flip ? 2 * p.b * (p.xs[0] + p.xs[1]) / 2 : 0);
    const y = base + (rng.next() - 0.5) * 2 * noise * span;
    return Math.abs(p.b) < 0.05 ? Math.round(y * 10) / 10 : Math.round(y);
  });
  return { xs, ys };
}

function scatter(p: (typeof PAIRS)[number], xs: number[], ys: number[], line?: { a: number; b: number }): Figure {
  const ylo = Math.min(...ys);
  const yhi = Math.max(...ys);
  const ypad = Math.max(1, (yhi - ylo) * 0.15);
  const xpad = Math.max(1, (p.xs[1] - p.xs[0]) * 0.1);
  return {
    kind: 'graph',
    xTitle: p.x[0]!.toUpperCase() + p.x.slice(1),
    yTitle: p.y[0]!.toUpperCase() + p.y.slice(1),
    xRange: [Math.floor(p.xs[0] - xpad), Math.ceil(p.xs[1] + xpad)],
    yRange: [Math.floor(ylo - ypad), Math.ceil(yhi + ypad)],
    points: xs.map((x, i) => ({ x, y: ys[i]!, text: '' })),
    lines: line ? [{ m: line.b, c: line.a }] : undefined,
  };
}
const tableText = (p: (typeof PAIRS)[number], xs: number[], ys: number[]) => `${p.x[0]!.toUpperCase() + p.x.slice(1)}: ${list(xs)}. ${p.y[0]!.toUpperCase() + p.y.slice(1)}: ${list(ys)}.`;

export const statsRegression: QuestionTemplate = {
  id: 'stats-regression',
  skillId: 'stats-regression',
  generate(rng, level) {
    const p = rng.pick(PAIRS);
    if (level === 1) {
      const band = rng.pick(['strong+', 'strong-', 'weak+', 'weak-', 'none'] as const);
      let d: { xs: number[]; ys: number[] };
      let r: number;
      do {
        const noise = band.startsWith('strong') ? 0.06 : band.startsWith('weak') ? 0.45 : 2;
        d = pairData(rng, p, noise, (band.endsWith('-') && p.b > 0) || (band.endsWith('+') && p.b < 0));
        r = regression(d.xs, d.ys).r;
      } while (band.startsWith('strong') ? Math.abs(r) < 0.9 || Math.sign(r) !== (band.endsWith('+') ? 1 : -1) : band.startsWith('weak') ? Math.abs(r) < 0.35 || Math.abs(r) > 0.6 || Math.sign(r) !== (band.endsWith('+') ? 1 : -1) : Math.abs(r) > 0.15);
      const label = { 'strong+': 'Strong positive correlation', 'strong-': 'Strong negative correlation', 'weak+': 'Weak positive correlation', 'weak-': 'Weak negative correlation', none: 'No correlation' } as const;
      const wrong = (Object.keys(label) as (keyof typeof label)[]).filter((k) => k !== band);
      const picks = rng.shuffle(wrong).slice(0, 3);
      const q = choice(rng, {
        prompt: `The scatter plot shows ${p.y} against ${p.x}. Which best describes the correlation?`,
        correct: { id: band, text: label[band] },
        distractors: picks.map((k) => ({ id: k, text: label[k], feedback: k === 'none' ? 'The points do follow a trend.' : k.endsWith(band.slice(-1)) ? 'Right direction; look at how close the points are to a straight line.' : 'Check the direction: as x increases, does y go up (positive) or down (negative)?' })),
        code: 'correlation',
        hints: ['Direction: do the points go up or down from left to right?', 'Strength: how close are they to a straight line?'],
        solution: [`${label[band]} ($r \\approx ${tc(r)}$).`],
      });
      return { ...q, figure: scatter(p, d.xs, d.ys) };
    }
    let d: { xs: number[]; ys: number[] };
    let R: ReturnType<typeof regression>;
    do {
      d = pairData(rng, p, 0.12);
      R = regression(d.xs, d.ys);
    } while (Math.abs(R.r) < 0.75);
    const intro = `The table gives ${p.x} ($x$) and ${p.y} ($y$). ${tableText(p, d.xs, d.ys)}`;
    const dpB = Math.abs(R.b) < 0.1 ? 4 : 2;
    const roundB = (v: number) => Math.round(v * 10 ** dpB) / 10 ** dpB;
    if (level === 2 || level === 3) {
      const isB = level === 2;
      const v = isB ? roundB(R.b) : r2(R.a);
      const tol = isB ? (dpB === 4 ? 0.00011 : 0.011) : Math.max(0.011, Math.abs(R.mx) * 0.01);
      return {
        prompt: `${intro} Find ${isB ? `$b$, the gradient` : `$a$, the $y$-intercept`} of the least squares regression line $\\hat{y} = a + bx$. Round to ${isB ? (dpB === 4 ? 'four' : 'two') : 'two'} decimal places.`,
        figure: scatter(p, d.xs, d.ys),
        input: { kind: 'numeric', prefix: isB ? 'b =' : 'a =' },
        answer: num(v, tol),
        answerDisplay: `$${isB ? 'b' : 'a'} = ${tc(v, isB ? dpB : 2)}$`,
        hints: ['Use your calculator in STAT mode (A + BX). Enter $x$ in the first column and $y$ in the second.', isB ? '$b$ is the gradient: how much $y$ changes for each 1 that $x$ increases.' : '$a$ is the value of $\\hat{y}$ when $x = 0$.'],
        solution: [`$\\bar{x} = ${tc(R.mx)}$, $\\bar{y} = ${tc(R.my)}$`, `$b = ${tc(R.b, dpB)}$ and $a = \\bar{y} - b\\bar{x} = ${tc(R.a)}$`, `$\\hat{y} = ${tc(R.a)} ${R.b < 0 ? '-' : '+'} ${tc(Math.abs(R.b), dpB)}x$`],
        misconceptions: keep(
          isB
            ? [{ code: 'regression', value: roundB(R.bxy), feedback: 'It looks like x and y were swapped on the calculator. x is the first variable.' }, { code: 'regression', value: r2(R.a), feedback: 'That is $a$, the intercept. $b$ is the gradient.' }]
            : [{ code: 'regression', value: roundB(R.b), feedback: 'That is $b$, the gradient. $a$ is the intercept.' }, { code: 'regression', value: r2(R.my + R.b * R.mx), feedback: 'Check the sign: $a = \\bar{y} - b\\bar{x}$.' }],
          v,
          tol,
        ),
      };
    }
    if (level === 4) {
      const v = r2(R.r);
      return {
        prompt: `${intro} Find the correlation coefficient $r$. Round to two decimal places.`,
        figure: scatter(p, d.xs, d.ys),
        input: { kind: 'numeric', prefix: 'r =' },
        answer: num(v, 0.011),
        answerDisplay: `$r = ${tc(v)}$`,
        hints: ['Use the calculator in STAT mode (A + BX); $r$ is in the regression menu.', 'Check the sign against the scatter plot: points going down give a negative $r$.'],
        solution: [`$r = ${tc(v)}$`, `This is a ${Math.abs(v) >= 0.8 ? 'strong' : 'moderate'} ${v > 0 ? 'positive' : 'negative'} correlation.`],
        misconceptions: keep([{ code: 'correlation', value: r2(R.r * R.r), feedback: 'That is $r^2$. Use $r$.' }, { code: 'correlation', value: -v, feedback: 'Check the sign: does $y$ go up or down as $x$ increases?' }], v, 0.011),
      };
    }
    // Level 5: use the line to predict.
    const a = r2(R.a);
    const b = roundB(R.b);
    const x0 = Math.round((p.xs[0] + p.xs[1]) / 2 + (rng.next() - 0.5) * (p.xs[1] - p.xs[0]) * 0.6);
    const yhat = a + b * x0;
    return {
      prompt: `For ${p.x} ($x$) and ${p.y} ($y$), the least squares regression line is $\\hat{y} = ${tc(a)} ${b < 0 ? '-' : '+'} ${tc(Math.abs(b), dpB)}x$. Predict $y$ when $x = ${x0}$. Round to two decimal places.`,
      figure: scatter(p, d.xs, d.ys, { a, b }),
      input: { kind: 'numeric', prefix: '\\hat{y} =' },
      answer: num(r2(yhat), 0.011),
      answerDisplay: `$\\hat{y} = ${tc(r2(yhat))}$`,
      hints: [`Substitute $x = ${x0}$ into the equation.`, `$\\hat{y} = ${tc(a)} ${b < 0 ? '-' : '+'} ${tc(Math.abs(b), dpB)}(${x0})$`],
      solution: [`$\\hat{y} = ${tc(a)} ${b < 0 ? '-' : '+'} ${tc(Math.abs(b), dpB)}(${x0}) = ${tc(r2(yhat))}$`, `${x0} is inside the range of the data, so the prediction is reasonable (interpolation).`],
      misconceptions: keep([{ code: 'regression', value: r2(b + a * x0), feedback: 'In $\\hat{y} = a + bx$, $b$ multiplies $x$. $a$ is the constant.' }], r2(yhat), 0.011),
    };
  },
};
