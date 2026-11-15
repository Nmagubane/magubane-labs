/**
 * Finance, growth and decay, Grades 10–12 (CAPS Paper 1, about 15 marks), after the Grade 10 `finance` skill
 * (simple and compound interest):
 * - Grade 10: exchange rates, hire purchase, inflation and population growth;
 * - Grade 11: straight-line and reducing-balance depreciation; nominal and effective rates; timelines with changing
 *   rates, deposits and withdrawals;
 * - Grade 12: future value annuities (savings, sinking funds) and present value annuities (loans, outstanding
 *   balances, the number of payments, delayed first payments and the final payment).
 * finance.test.ts reads the numbers back out of each prompt and recomputes the answer by simulating the money month by
 * month (or year by year), never with the annuity formulas the generators use.
 */
import type { QuestionTemplate, Misconception, AnswerSpec, GeneratedQuestion } from '../types.ts';
import type { Rng } from '../rng.ts';
import type { MistakeCode } from '../mistakes.ts';
import { choice } from './kit.ts';

// ---------------------------------------------------------------------------
// Numbers and money

const r2 = (v: number) => Math.round(v * 100) / 100;
const group = (digits: string, sep: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
/** "R12 500,00" for prompts and displays. */
export const rands = (v: number) => {
  const [a, b] = Math.abs(r2(v)).toFixed(2).split('.');
  return `${v < 0 ? '−' : ''}R${group(a!, ' ')},${b}`;
};
/** "R12 500" for whole-rand prices in prompts. */
const randsW = (v: number) => `R${group(String(Math.round(v)), ' ')}`;
/** \text{R}\,12\,500{,}00 in TeX: the rand sign upright, not as a variable. */
const texR = (v: number) => {
  const [a, b] = Math.abs(r2(v)).toFixed(2).split('.');
  return `${v < 0 ? '-' : ''}\\text{R}${group(a!, '\\,')}{,}${b}`;
};
/** A number in TeX with a decimal comma and up to `dp` decimals. */
const tn = (v: number, dp = 4) => String(Math.round(v * 10 ** dp) / 10 ** dp).replace('.', '{,}');
/** A percentage in text: 8,5%. */
const pc = (p: number) => `${String(r2(p)).replace('.', ',')}%`;
/** A whole number with South African grouping: 31 200. */
const whole = (v: number) => group(String(Math.round(v)), ' ');

const money = (v: number): AnswerSpec => ({ kind: 'numeric', value: r2(v), tolerance: 0.005 + Math.abs(v) * 0.0002 });
const pct = (v: number): AnswerSpec => ({ kind: 'numeric', value: r2(v), tolerance: 0.011 });
const count = (v: number): AnswerSpec => ({ kind: 'numeric', value: v, tolerance: 0 });

/** Keep wrong answers that are finite and clearly different (more than 1%, or a different whole number) from the answer and each other. */
function keep(ms: { code: MistakeCode; value: number; feedback: string; as?: 'money' | 'pct' | 'count' }[], answer: number): Misconception[] {
  const seen = [answer];
  const out: Misconception[] = [];
  for (const m of ms) {
    // Whole-number answers (months, people) differ by 1 and still mean a different answer.
    const near = (s: number) => (m.as === 'count' ? Math.abs(s - m.value) < 0.5 : Math.abs(s - m.value) <= Math.abs(s) * 0.01 + 0.02);
    if (!Number.isFinite(m.value) || seen.some(near)) continue;
    seen.push(m.value);
    out.push({ code: m.code, answer: m.as === 'pct' ? pct(m.value) : m.as === 'count' ? count(m.value) : money(m.value), feedback: m.feedback });
  }
  return out;
}

const COMP: Record<number, string> = { 1: 'annually', 2: 'half-yearly', 4: 'quarterly', 12: 'monthly' };
const PER: Record<number, string> = { 1: 'year', 2: 'half-year', 4: 'quarter', 12: 'month' };
const NAMES = ['Thandi', 'Sipho', 'Lerato', 'Ayanda', 'Kagiso', 'Nomsa', 'Pieter', 'Fatima', 'Bongani', 'Zanele', 'Johan', 'Naledi'];

/** A rate in percent with at most one decimal, e.g. 7,5. */
const rateIn = (rng: Rng, lo: number, hi: number) => rng.int(lo * 2, hi * 2) / 2;

// ---------------------------------------------------------------------------
// Grade 10: exchange rates, hire purchase, inflation, population growth

const CURRENCIES = [
  { sym: '\\$', name: 'US dollars', lo: 1650, hi: 1950 },
  { sym: '€', name: 'euros', lo: 1850, hi: 2150 },
  { sym: '£', name: 'British pounds', lo: 2150, hi: 2500 },
];
const GOODS = ['a laptop', 'a fridge', 'a lounge suite', 'a washing machine', 'a bed and mattress', 'a television', 'a stove'];

export const financeApplications: QuestionTemplate = {
  id: 'finance-applications',
  skillId: 'finance-applications',
  generate(rng, level) {
    const name = rng.pick(NAMES);
    if (level === 1) {
      const c = rng.pick(CURRENCIES);
      const ex = rng.int(c.lo, c.hi) / 100;
      if (rng.chance(0.5)) {
        const R = rng.int(10, 160) * 100;
        const ans = R / ex;
        return {
          prompt: `Suppose ${c.sym}1 = R${String(ex.toFixed(2)).replace('.', ',')}. ${name} changes ${randsW(R)} into ${c.name} for a trip. How many ${c.name} does ${name} get? Round to the nearest cent.`,
          input: { kind: 'numeric', prefix: c.sym },
          answer: money(ans),
          answerDisplay: `${c.sym}${r2(ans).toFixed(2).replace('.', ',')}`,
          hints: [`Each ${c.sym}1 costs R${String(ex.toFixed(2)).replace('.', ',')}. How many lots of that fit into ${randsW(R)}?`, 'Rand to foreign currency: divide by the exchange rate.'],
          solution: [`$${R} \\div ${tn(ex, 2)} \\approx ${tn(ans, 2)}$`],
          misconceptions: keep([{ code: 'exchange-rate', value: R * ex, feedback: `You multiplied. One ${c.sym} costs more than R1, so you get far fewer ${c.name} than rand: divide by ${String(ex.toFixed(2)).replace('.', ',')}.` }], ans),
        };
      }
      const F = rng.int(20, 1500);
      const ans = F * ex;
      return {
        prompt: `Suppose ${c.sym}1 = R${String(ex.toFixed(2)).replace('.', ',')}. ${name} sees ${rng.pick(GOODS)} online for ${c.sym}${F}. What is that in rand?`,
        input: { kind: 'numeric', prefix: 'R' },
        answer: money(ans),
        answerDisplay: rands(ans),
        hints: [`Each ${c.sym}1 is R${String(ex.toFixed(2)).replace('.', ',')}.`, 'Foreign currency to rand: multiply by the exchange rate.'],
        solution: [`$${F} \\times ${tn(ex, 2)} = ${texR(ans)}$`],
        misconceptions: keep([{ code: 'exchange-rate', value: F / ex, feedback: `You divided. Each ${c.sym}1 is worth R${String(ex.toFixed(2)).replace('.', ',')}, so the rand price is bigger: multiply.` }], ans),
      };
    }
    if (level === 2) {
      // Hire purchase: simple interest on the amount owed after the deposit, paid off in equal monthly instalments.
      const C = rng.int(40, 300) * 100;
      const dep = rng.pick([10, 15, 20, 25]);
      const r = rateIn(rng, 12, 24);
      const y = rng.pick([1, 2, 3]);
      const owed = C * (1 - dep / 100);
      const A = owed * (1 + (r / 100) * y);
      const item = rng.pick(GOODS);
      const askTotal = rng.chance(0.35);
      const lead = `${name} buys ${item} for ${randsW(C)} on hire purchase. The deposit is ${dep}%, and the rest is paid off over ${y === 1 ? '1 year' : `${y} years`} in equal monthly instalments, at ${pc(r)} per year simple interest.`;
      if (askTotal) {
        const total = C * (dep / 100) + A;
        return {
          prompt: `${lead} How much does ${name} pay altogether, deposit included?`,
          input: { kind: 'numeric', prefix: 'R' },
          answer: money(total),
          answerDisplay: rands(total),
          hints: ['Interest is charged only on the amount still owed after the deposit.', `Owed: $${C} - ${dep}\\% = ${tn(owed, 2)}$. Then $A = P(1 + in)$, and add the deposit back.`],
          solution: [`Deposit: $${tn(C * dep / 100, 2)}$. Owed: $${tn(owed, 2)}$.`, `$A = ${tn(owed, 2)}(1 + ${tn(r / 100)} \\times ${y}) = ${texR(A)}$`, `Total: $${texR(total)}$`],
          misconceptions: keep([
            { code: 'hire-purchase', value: C * (1 + (r / 100) * y), feedback: 'You charged interest on the full price. The deposit is paid at the start, so interest is only on what is still owed.' },
            { code: 'hire-purchase', value: A, feedback: 'That is the instalments only. Add the deposit to get everything paid.' },
          ], total),
        };
      }
      const x = A / (12 * y);
      return {
        prompt: `${lead} Find the monthly instalment.`,
        input: { kind: 'numeric', prefix: 'R' },
        answer: money(x),
        answerDisplay: rands(x),
        hints: ['Interest is charged only on the amount still owed after the deposit.', `Find $A = P(1 + in)$ for what is owed, then share it over $${12 * y}$ months.`],
        solution: [`Owed: $${C} \\times ${tn(1 - dep / 100, 2)} = ${tn(owed, 2)}$`, `$A = ${tn(owed, 2)}(1 + ${tn(r / 100)} \\times ${y}) = ${texR(A)}$`, `Instalment: $${texR(A)} \\div ${12 * y} = ${texR(x)}$`],
        misconceptions: keep([
          { code: 'hire-purchase', value: (C * (1 + (r / 100) * y)) / (12 * y), feedback: 'You charged interest on the full price. Take off the deposit first.' },
          { code: 'rate-period', value: A / y, feedback: `That is the payment per year. Monthly: divide by ${12 * y} months.` },
          { code: 'simple-vs-compound', value: (owed * (1 + r / 100) ** y) / (12 * y), feedback: 'Hire purchase uses simple interest: $A = P(1 + in)$.' },
        ], x),
      };
    }
    if (level === 3) {
      // Inflation, forwards or backwards.
      const r = rng.int(30, 75) / 10;
      const n = rng.int(3, 12);
      const things = [
        { what: 'A loaf of bread', lo: 1600, hi: 2400, cents: true },
        { what: 'A litre of petrol', lo: 2000, hi: 2500, cents: true },
        { what: 'A taxi fare', lo: 1500, hi: 3000, cents: true },
        { what: 'A small car', lo: 2400, hi: 3200, cents: false },
        { what: 'A school uniform', lo: 800, hi: 1600, cents: false },
      ];
      const t = rng.pick(things);
      const now = t.cents ? rng.int(t.lo, t.hi) / 100 : rng.int(t.lo, t.hi) * (t.what === 'A small car' ? 100 : 1);
      const nowText = t.cents ? rands(now) : randsW(now);
      if (rng.chance(0.5)) {
        const A = now * (1 + r / 100) ** n;
        return {
          prompt: `${t.what} costs ${nowText} today. If inflation averages ${pc(r)} per year, what will it cost in ${n} years' time?`,
          input: { kind: 'numeric', prefix: 'R' },
          answer: money(A),
          answerDisplay: rands(A),
          hints: ['Inflation compounds: each year prices rise by a percentage of the previous year\'s price.', '$A = P(1 + i)^n$'],
          solution: [`$A = ${tn(now, 2)}(1 + ${tn(r / 100, 3)})^{${n}} \\approx ${texR(A)}$`],
          misconceptions: keep([{ code: 'simple-vs-compound', value: now * (1 + (r / 100) * n), feedback: 'Inflation compounds: use $A = P(1 + i)^n$, not simple interest.' }], A),
        };
      }
      const P = now / (1 + r / 100) ** n;
      return {
        prompt: `${t.what} costs ${nowText} today. Inflation averaged ${pc(r)} per year over the last ${n} years. What did it cost ${n} years ago?`,
        input: { kind: 'numeric', prefix: 'R' },
        answer: money(P),
        answerDisplay: rands(P),
        hints: [`Today's price is the old price grown for ${n} years: $${tn(now, 2)} = P(1 + i)^{${n}}$.`, 'Solve for $P$: divide by $(1 + i)^n$.'],
        solution: [`$${tn(now, 2)} = P(1 + ${tn(r / 100, 3)})^{${n}}$`, `$P = ${tn(now, 2)} \\div ${tn(1 + r / 100, 3)}^{${n}} \\approx ${texR(P)}$`],
        misconceptions: keep([
          { code: 'timeline', value: now * (1 + r / 100) ** n, feedback: 'That moves the price forward in time. Going back, divide by $(1 + i)^n$.' },
          { code: 'timeline', value: now * (1 - r / 100) ** n, feedback: 'Close, but not the same. Today = old price $\\times (1 + i)^n$, so old price = today $\\div (1 + i)^n$, which is not today $\\times (1 - i)^n$.' },
        ], P),
      };
    }
    if (level === 4) {
      // Population growth: forwards, or the average growth rate.
      const places = ['A town', 'A township', 'A game reserve\'s elephant herd', 'A city suburb'];
      const where = rng.pick(places);
      const P = rng.int(80, 600) * (where.includes('elephant') ? 1 : 100);
      const n = rng.int(4, 12);
      if (rng.chance(0.5)) {
        const r = rng.int(12, 45) / 10;
        const A = P * (1 + r / 100) ** n;
        return {
          prompt: `${where} has ${whole(P)} ${where.includes('elephant') ? 'elephants' : 'people'}. It grows at ${pc(r)} per year. How many will there be after ${n} years? Give the answer to the nearest whole number.`,
          input: { kind: 'numeric' },
          answer: { kind: 'numeric', value: Math.round(A), tolerance: 1 },
          answerDisplay: whole(A),
          hints: ['Growth by a percentage each year compounds.', '$A = P(1 + i)^n$'],
          solution: [`$A = ${P}(1 + ${tn(r / 100, 3)})^{${n}} \\approx ${Math.round(A)}$`],
          misconceptions: keep([{ code: 'simple-vs-compound', value: Math.round(P * (1 + (r / 100) * n)), feedback: 'Each year\'s growth is a percentage of the **current** size, so it compounds: $A = P(1 + i)^n$.', as: 'count' }], Math.round(A)),
        };
      }
      const r = rng.int(12, 45) / 10;
      const A = Math.round(P * (1 + r / 100) ** n);
      const ans = ((A / P) ** (1 / n) - 1) * 100;
      return {
        prompt: `${where} grew from ${whole(P)} to ${whole(A)} ${where.includes('elephant') ? 'elephants' : 'people'} in ${n} years. Find the average yearly growth rate (compound growth), as a percentage correct to two decimal places.`,
        input: { kind: 'numeric', unit: '%' },
        answer: pct(ans),
        answerDisplay: pc(ans),
        hints: [`$${A} = ${P}(1 + i)^{${n}}$`, `Divide by ${P}, then take the ${n}th root of both sides: $1 + i = \\sqrt[${n}]{\\dfrac{${A}}{${P}}}$.`],
        solution: [`$(1 + i)^{${n}} = \\dfrac{${A}}{${P}}$`, `$1 + i = \\left(\\dfrac{${A}}{${P}}\\right)^{\\frac{1}{${n}}}$, so $i \\approx ${tn(ans / 100, 4)}$, that is $${tn(ans, 2)}\\%$.`],
        misconceptions: keep([{ code: 'simple-vs-compound', value: ((A / P - 1) / n) * 100, feedback: 'Dividing the total growth by the number of years assumes simple growth. Solve $(1 + i)^n = \\frac{A}{P}$ with a root.', as: 'pct' }], ans),
      };
    }
    // Level 5: a change in exchange rate, or a hire purchase interest rate.
    const kind = rng.pick(['trip', 'weaker', 'rate'] as const);
    if (kind === 'rate') {
      const C = rng.int(40, 250) * 100;
      const dep = rng.pick([10, 15, 20]);
      const y = rng.pick([2, 3]);
      const rTrue = rateIn(rng, 12, 24);
      const owed = C * (1 - dep / 100);
      const x = r2((owed * (1 + (rTrue / 100) * y)) / (12 * y));
      const ans = (((12 * y * x) / owed - 1) / y) * 100;
      return {
        prompt: `A shop sells ${rng.pick(GOODS)} for ${randsW(C)} on hire purchase: ${dep}% deposit, then ${12 * y} monthly instalments of ${rands(x)}. What simple interest rate per year is the shop charging? Give the percentage correct to two decimal places.`,
        input: { kind: 'numeric', unit: '%' },
        answer: pct(ans),
        answerDisplay: pc(ans),
        hints: ['Find the total of the instalments, and the amount owed after the deposit.', '$A = P(1 + in)$: solve for $i$.'],
        solution: [`Owed: $${tn(owed, 2)}$. Paid back: $${12 * y} \\times ${tn(x, 2)} = ${tn(12 * y * x, 2)}$.`, `$${tn(12 * y * x, 2)} = ${tn(owed, 2)}(1 + ${y}i)$`, `$i \\approx ${tn(ans / 100, 4)}$, that is $${tn(ans, 2)}\\%$.`],
        misconceptions: keep([
          { code: 'hire-purchase', value: (((12 * y * x) / C - 1) / y) * 100, feedback: 'Interest is on the amount owed after the deposit, not on the full price.', as: 'pct' },
          { code: 'hire-purchase', value: ((12 * y * x) / owed - 1) * 100, feedback: `That is the interest over all ${y} years. Divide by ${y} for the rate per year.`, as: 'pct' },
        ], ans),
      };
    }
    const c = rng.pick(CURRENCIES);
    if (kind === 'weaker') {
      const e1 = rng.int(c.lo, c.hi - 100) / 100;
      const e2 = r2(e1 + rng.int(40, 220) / 100);
      const F = rng.int(150, 2500);
      const ans = F * (e2 - e1);
      return {
        prompt: `A ${rng.pick(['phone', 'textbook bundle', 'pair of running shoes', 'gaming console', 'camera'])} costs ${c.sym}${F}. A year ago ${c.sym}1 = R${String(e1.toFixed(2)).replace('.', ',')}; now ${c.sym}1 = R${String(e2.toFixed(2)).replace('.', ',')}. How much more does it cost in rand now?`,
        input: { kind: 'numeric', prefix: 'R' },
        answer: money(ans),
        answerDisplay: rands(ans),
        hints: ['Work out the rand price at each exchange rate.', 'Then subtract.'],
        solution: [`Then: $${F} \\times ${tn(e1, 2)} = ${texR(F * e1)}$. Now: $${F} \\times ${tn(e2, 2)} = ${texR(F * e2)}$.`, `Difference: $${texR(ans)}$. The rand is weaker, so imports cost more.`],
        misconceptions: keep([{ code: 'exchange-rate', value: Math.abs(F / e1 - F / e2), feedback: 'You divided by the exchange rates. A foreign price becomes rand by multiplying.' }], ans),
      };
    }
    const ex1 = rng.int(c.lo, c.hi) / 100;
    const ex2 = r2(ex1 - rng.int(30, 120) / 100);
    const R = rng.int(80, 300) * 100;
    const spent = Math.floor((R / ex1) * rng.int(40, 85) / 100);
    const back = (R / ex1 - spent) * ex2;
    return {
      prompt: `${name} changes ${randsW(R)} into ${c.name} at ${c.sym}1 = R${String(ex1.toFixed(2)).replace('.', ',')}, spends ${c.sym}${spent} on the trip, and changes the rest back at ${c.sym}1 = R${String(ex2.toFixed(2)).replace('.', ',')}. How many rand does ${name} get back? (Don't round until the end.)`,
      input: { kind: 'numeric', prefix: 'R' },
      answer: money(back),
      answerDisplay: rands(back),
      hints: [`Rand to ${c.name}: divide by ${String(ex1.toFixed(2)).replace('.', ',')}.`, `Take off what was spent, then ${c.name} to rand: multiply by the new rate.`],
      solution: [`$${R} \\div ${tn(ex1, 2)} \\approx ${tn(R / ex1, 2)}$`, `Left: $${tn(R / ex1 - spent, 2)}$`, `Back in rand: $\\times ${tn(ex2, 2)} \\approx ${texR(back)}$`],
      misconceptions: keep([
        { code: 'exchange-rate', value: (R / ex1 - spent) * ex1, feedback: 'You changed back at the old rate. The rand price of each unit has changed.' },
        { code: 'exchange-rate', value: R - spent * ex2, feedback: 'The trip money was bought at the first rate, so the left-over amount must be found in the foreign currency first.' },
      ], back),
    };
  },
};

// ---------------------------------------------------------------------------
// Grade 11: depreciation

const ASSETS = [
  { what: 'a minibus taxi', lo: 380, hi: 620 },
  { what: 'a tractor', lo: 450, hi: 900 },
  { what: 'a delivery bakkie', lo: 280, hi: 480 },
  { what: 'a printing machine', lo: 90, hi: 260 },
  { what: 'a set of sewing machines', lo: 40, hi: 120 },
  { what: 'a photocopier', lo: 30, hi: 90 },
  { what: 'school computers', lo: 120, hi: 350 },
];
const sl = (P: number, i: number, n: number) => P * (1 - i * n);
const rb = (P: number, i: number, n: number) => P * (1 - i) ** n;

export const depreciation: QuestionTemplate = {
  id: 'depreciation',
  skillId: 'depreciation',
  generate(rng, level) {
    const a = rng.pick(ASSETS);
    const P = rng.int(a.lo, a.hi) * 1000;
    const d = rng.pick([8, 10, 12, 12.5, 15, 18, 20]);
    const i = d / 100;
    const n = rng.int(2, Math.min(7, Math.floor(0.9 / i)));
    const method = rng.chance(0.5) ? 'straight' : 'reducing';
    const mName = method === 'straight' ? 'the straight-line method' : 'the reducing-balance method';
    if (level === 1) {
      const A = method === 'straight' ? sl(P, i, n) : rb(P, i, n);
      return {
        prompt: `A business buys ${a.what} for ${randsW(P)}. It depreciates at ${pc(d)} per year using ${mName}. Find its book value after ${n} years.`,
        input: { kind: 'numeric', prefix: 'R' },
        answer: money(A),
        answerDisplay: rands(A),
        hints: [method === 'straight' ? 'Straight-line: it loses the same amount (a percentage of the **original** cost) every year.' : 'Reducing balance: each year it loses a percentage of its **current** value.', method === 'straight' ? '$A = P(1 - in)$' : '$A = P(1 - i)^n$'],
        solution: [method === 'straight' ? `$A = ${P}(1 - ${tn(i, 3)} \\times ${n}) = ${texR(A)}$` : `$A = ${P}(1 - ${tn(i, 3)})^{${n}} \\approx ${texR(A)}$`],
        misconceptions: keep([
          { code: 'depreciation-method', value: method === 'straight' ? rb(P, i, n) : sl(P, i, n), feedback: method === 'straight' ? 'That is the reducing-balance value. Straight-line takes the same amount off every year: $A = P(1 - in)$.' : 'That is the straight-line value. On the reducing balance, each year\'s loss is a percentage of the value left: $A = P(1 - i)^n$.' },
          { code: 'depreciation-method', value: P - (method === 'straight' ? sl(P, i, n) : rb(P, i, n)), feedback: 'That is how much value it has lost. The book value is what it is still worth.' },
          { code: 'sign-error', value: method === 'straight' ? P * (1 + i * n) : P * (1 + i) ** n, feedback: 'Depreciation makes the value go **down**: use a minus.' },
        ], A),
      };
    }
    if (level === 2) {
      // Find the cost from the book value.
      const A = r2(method === 'straight' ? sl(P, i, n) : rb(P, i, n));
      const ans = method === 'straight' ? A / (1 - i * n) : A / (1 - i) ** n;
      return {
        prompt: `After ${n} years, ${a.what} has a book value of ${rands(A)}. It depreciated at ${pc(d)} per year using ${mName}. What did it cost new?`,
        input: { kind: 'numeric', prefix: 'R' },
        answer: money(ans),
        answerDisplay: rands(ans),
        hints: [`Write the formula with $P$ unknown: ${method === 'straight' ? `$${tn(A, 2)} = P(1 - ${tn(i, 3)} \\times ${n})$` : `$${tn(A, 2)} = P(1 - ${tn(i, 3)})^{${n}}$`}.`, 'Divide to find $P$.'],
        solution: [method === 'straight' ? `$P = ${tn(A, 2)} \\div ${tn(1 - i * n, 3)} \\approx ${texR(ans)}$` : `$P = ${tn(A, 2)} \\div ${tn(1 - i, 3)}^{${n}} \\approx ${texR(ans)}$`],
        misconceptions: keep([
          { code: 'depreciation-method', value: method === 'straight' ? A * (1 + i * n) : A * (1 + i) ** n, feedback: 'Adding the percentage back does not undo taking it off, because the percentage was of a different amount. Divide by the factor instead.' },
          { code: 'depreciation-method', value: method === 'straight' ? A / (1 - i) ** n : A / (1 - i * n), feedback: `Use the ${method === 'straight' ? 'straight-line' : 'reducing-balance'} formula, as the question says.` },
        ], ans),
      };
    }
    if (level === 3) {
      // Find the rate.
      const A = r2(method === 'straight' ? sl(P, i, n) : rb(P, i, n));
      const ans = (method === 'straight' ? (1 - A / P) / n : 1 - (A / P) ** (1 / n)) * 100;
      return {
        prompt: `${a.what[0]!.toUpperCase()}${a.what.slice(1)} cost ${randsW(P)} and has a book value of ${rands(A)} after ${n} years. Find the yearly rate of depreciation using ${mName}, as a percentage correct to two decimal places.`,
        input: { kind: 'numeric', unit: '%' },
        answer: pct(ans),
        answerDisplay: pc(ans),
        hints: [method === 'straight' ? `$${tn(A, 2)} = ${P}(1 - ${n}i)$` : `$${tn(A, 2)} = ${P}(1 - i)^{${n}}$`, method === 'straight' ? 'Divide by the cost, then solve the linear equation.' : `Divide by the cost, then take the ${n}th root.`],
        solution: method === 'straight' ? [`$1 - ${n}i = \\dfrac{${tn(A, 2)}}{${P}}$`, `$i \\approx ${tn(ans / 100, 4)}$: $${tn(ans, 2)}\\%$`] : [`$(1 - i)^{${n}} = \\dfrac{${tn(A, 2)}}{${P}}$`, `$1 - i = \\left(\\dfrac{${tn(A, 2)}}{${P}}\\right)^{\\frac{1}{${n}}}$, so $i \\approx ${tn(ans / 100, 4)}$: $${tn(ans, 2)}\\%$`],
        misconceptions: keep([
          { code: 'depreciation-method', value: (method === 'straight' ? 1 - (A / P) ** (1 / n) : (1 - A / P) / n) * 100, feedback: `That is the rate for the other method. Use ${mName}.`, as: 'pct' },
          { code: 'depreciation-method', value: (1 - A / P) * 100, feedback: `That is the total percentage lost over all ${n} years.`, as: 'pct' },
        ], ans),
      };
    }
    if (level === 4) {
      if (rng.chance(0.5)) {
        // Difference between the two methods.
        const s = sl(P, i, n);
        const b = rb(P, i, n);
        const ans = b - s;
        return {
          prompt: `${a.what[0]!.toUpperCase()}${a.what.slice(1)} costs ${randsW(P)} and depreciates at ${pc(d)} per year. After ${n} years, how much more is it worth using the reducing-balance method than using the straight-line method?`,
          input: { kind: 'numeric', prefix: 'R' },
          answer: money(ans),
          answerDisplay: rands(ans),
          hints: ['Work out both book values.', 'The reducing balance loses less each year, because it takes a percentage of a shrinking value.'],
          solution: [`Straight-line: $${P}(1 - ${tn(i, 3)} \\times ${n}) = ${texR(s)}$`, `Reducing balance: $${P}(1 - ${tn(i, 3)})^{${n}} \\approx ${texR(b)}$`, `Difference: $${texR(ans)}$`],
          misconceptions: keep([{ code: 'depreciation-method', value: P * i * n - P * i, feedback: 'Work out each book value with its own formula, then subtract.' }], ans),
        };
      }
      // When does straight-line reach a scrap value?
      const years = rng.int(4, 12);
      const dd = rng.pick([5, 6, 8, 10]);
      const scrap = P * (1 - (dd / 100) * years);
      if (scrap <= 0) return depreciation.generate(rng, 4);
      return {
        prompt: `${a.what[0]!.toUpperCase()}${a.what.slice(1)} costs ${randsW(P)} and depreciates at ${dd}% per year using the straight-line method. After how many years will its book value be ${randsW(scrap)}?`,
        input: { kind: 'numeric', unit: 'years' },
        answer: count(years),
        answerDisplay: `${years} years`,
        hints: [`$${Math.round(scrap)} = ${P}(1 - ${tn(dd / 100, 2)}n)$`, 'Solve the linear equation for $n$.'],
        solution: [`$1 - ${tn(dd / 100, 2)}n = \\dfrac{${Math.round(scrap)}}{${P}} = ${tn(scrap / P, 4)}$`, `$n = ${years}$`],
        misconceptions: keep([{ code: 'depreciation-method', value: Math.round(Math.log(scrap / P) / Math.log(1 - dd / 100)), feedback: 'That uses the reducing-balance formula. Straight-line: $A = P(1 - in)$.', as: 'count' }], years),
      };
    }
    // Level 5: saving for a replacement: new price grows with inflation; the old machine is sold at its book value.
    const g = rng.int(40, 80) / 10;
    const y = rng.int(4, 8);
    const newCost = P * (1 + g / 100) ** y;
    const scrapRb = rb(P, i, y);
    const ans = newCost - scrapRb;
    return {
      prompt: `A business buys ${a.what} for ${randsW(P)}. It depreciates at ${pc(d)} per year on the reducing balance, and will be sold at its book value after ${y} years. A new one will then cost more: prices rise at ${pc(g)} per year. How much extra money will the business need to buy the new one?`,
      input: { kind: 'numeric', prefix: 'R' },
      answer: money(ans),
      answerDisplay: rands(ans),
      hints: ['Two calculations: the price of a new one in the future (growth), and what the old one is worth then (depreciation).', 'The money needed is the difference.'],
      solution: [`New one: $${P}(1 + ${tn(g / 100, 3)})^{${y}} \\approx ${texR(newCost)}$`, `Old one: $${P}(1 - ${tn(i, 3)})^{${y}} \\approx ${texR(scrapRb)}$`, `Needed: $${texR(ans)}$`],
      misconceptions: keep([
        { code: 'depreciation-method', value: newCost, feedback: 'The old one is sold, so its book value goes towards the new one. Subtract it.' },
        { code: 'depreciation-method', value: newCost - sl(P, i, y), feedback: 'The old one depreciates on the reducing balance, not straight-line.' },
        { code: 'timeline', value: P - scrapRb, feedback: 'The new one will cost more than the old one did: grow today\'s price with inflation.' },
      ], ans),
    };
  },
};

// ---------------------------------------------------------------------------
// Grade 11: nominal and effective rates; timelines

const eff = (r: number, m: number) => ((1 + r / 100 / m) ** m - 1) * 100;

export const nominalEffective: QuestionTemplate = {
  id: 'nominal-effective',
  skillId: 'nominal-effective',
  generate(rng, level) {
    const name = rng.pick(NAMES);
    if (level === 1) {
      const r = rateIn(rng, 5, 18);
      const m = rng.pick([2, 4, 12, 12]);
      const ans = eff(r, m);
      return {
        prompt: `A bank offers ${pc(r)} per year, compounded ${COMP[m]}. Find the effective annual interest rate, as a percentage correct to two decimal places.`,
        input: { kind: 'numeric', unit: '%' },
        answer: pct(ans),
        answerDisplay: pc(ans),
        hints: [`Compounded ${COMP[m]}: the rate per ${PER[m]} is $\\dfrac{${tn(r / 100, 4)}}{${m}}$, applied ${m} times a year.`, `$1 + i_{\\text{eff}} = \\left(1 + \\dfrac{i}{m}\\right)^m$`],
        solution: [`$1 + i_{\\text{eff}} = \\left(1 + \\dfrac{${tn(r / 100, 4)}}{${m}}\\right)^{${m}} \\approx ${tn(1 + ans / 100, 6)}$`, `$i_{\\text{eff}} \\approx ${tn(ans, 2)}\\%$`],
        misconceptions: keep([
          { code: 'nominal-effective', value: r, feedback: 'That is the nominal rate. Compounding more than once a year earns interest on interest within the year, so the effective rate is higher.', as: 'pct' },
          { code: 'nominal-effective', value: ((1 + r / 100) ** m - 1) * 100, feedback: `Divide the yearly rate by ${m} before compounding ${m} times.`, as: 'pct' },
          { code: 'nominal-effective', value: r / m, feedback: `That is the rate per ${PER[m]}. Compound it ${m} times to get the yearly effective rate.`, as: 'pct' },
        ], ans),
      };
    }
    if (level === 2) {
      const e = rng.int(60, 180) / 10;
      const m = rng.pick([2, 4, 12]);
      const ans = m * ((1 + e / 100) ** (1 / m) - 1) * 100;
      return {
        prompt: `An investment has an effective rate of ${pc(e)} per year. Find the equivalent nominal rate per year, compounded ${COMP[m]}, as a percentage correct to two decimal places.`,
        input: { kind: 'numeric', unit: '%' },
        answer: pct(ans),
        answerDisplay: pc(ans),
        hints: [`$\\left(1 + \\dfrac{i}{${m}}\\right)^{${m}} = 1 + ${tn(e / 100, 4)}$`, `Take the ${m}th root, subtract 1, then multiply by ${m}.`],
        solution: [`$1 + \\dfrac{i}{${m}} = ${tn(1 + e / 100, 4)}^{\\frac{1}{${m}}}$`, `$i = ${m}\\left(${tn(1 + e / 100, 4)}^{\\frac{1}{${m}}} - 1\\right) \\approx ${tn(ans / 100, 6)}$: $${tn(ans, 2)}\\%$`],
        misconceptions: keep([
          { code: 'nominal-effective', value: ((1 + e / 100) ** (1 / m) - 1) * 100, feedback: `That is the rate per ${PER[m]}. Multiply by ${m} for the nominal rate per year.`, as: 'pct' },
          { code: 'nominal-effective', value: e, feedback: 'The nominal rate is lower than the effective rate when interest compounds more than once a year.', as: 'pct' },
          { code: 'nominal-effective', value: eff(e, m), feedback: 'That converts the other way (nominal to effective). Here the effective rate is given.', as: 'pct' },
        ], ans),
      };
    }
    if (level === 3) {
      // Compare two offers.
      for (;;) {
        const m1 = rng.pick([1, 2, 4, 12]);
        let m2 = rng.pick([1, 2, 4, 12]);
        if (m2 === m1) m2 = m1 === 12 ? 2 : 12;
        const r1 = rateIn(rng, 6, 14);
        const r2_ = r1 + rng.pick([-0.5, 0.5, 0.25, -0.25, 0]);
        const e1 = eff(r1, m1);
        const e2 = eff(r2_, m2);
        if (Math.abs(e1 - e2) < 0.03) continue;
        const best = e1 > e2 ? 'a' : 'b';
        const bankA = rng.pick(['Bank A', 'Ubuntu Bank', 'Ithemba Bank']);
        const bankB = rng.pick(['Bank B', 'Sizwe Savings', 'Karoo Mutual']);
        const opts = { a: { id: 'a', text: `${bankA}: ${pc(r1)} per year, compounded ${COMP[m1]}` }, b: { id: 'b', text: `${bankB}: ${pc(r2_)} per year, compounded ${COMP[m2]}` } };
        const why = `Effective rates: ${bankA} $${tn(e1, 2)}\\%$, ${bankB} $${tn(e2, 2)}\\%$.`;
        return choice(rng, {
          prompt: `${name} wants to invest for a year. Which offer earns more?`,
          correct: opts[best],
          distractors: [{ ...opts[best === 'a' ? 'b' : 'a'], feedback: `Compare effective rates, not nominal rates. ${why}` }],
          keepOrder: [opts.a, opts.b],
          code: 'nominal-effective',
          hints: ['Rates compounded differently can\'t be compared directly. Convert both to effective annual rates.', '$i_{\\text{eff}} = \\left(1 + \\dfrac{i}{m}\\right)^m - 1$'],
          solution: [why, `So ${best === 'a' ? bankA : bankB} earns more.`],
        });
      }
    }
    const P = rng.int(20, 300) * 500;
    if (level === 4) {
      // The rate changes part-way.
      const a = rng.int(2, 5);
      const b = rng.int(2, 5);
      const ra = rateIn(rng, 6, 12);
      const rb_ = rateIn(rng, 6, 12);
      const ma = rng.pick([12, 4]);
      const mb = rng.pick([12, 4, 2]);
      const A = P * (1 + ra / 100 / ma) ** (ma * a) * (1 + rb_ / 100 / mb) ** (mb * b);
      return {
        prompt: `${name} invests ${randsW(P)}. For the first ${a} years it earns ${pc(ra)} per year compounded ${COMP[ma]}; for the next ${b} years the rate changes to ${pc(rb_)} per year compounded ${COMP[mb]}. How much is the investment worth at the end of the ${a + b} years?`,
        input: { kind: 'numeric', prefix: 'R' },
        answer: money(A),
        answerDisplay: rands(A),
        hints: ['Draw a timeline. Grow the money to the end of the first period, then use that amount for the second period.', `$A = ${P}\\left(1 + \\dfrac{${tn(ra / 100, 4)}}{${ma}}\\right)^{${ma * a}}\\left(1 + \\dfrac{${tn(rb_ / 100, 4)}}{${mb}}\\right)^{${mb * b}}$`],
        solution: [`After ${a} years: $${P}\\left(1 + \\dfrac{${tn(ra / 100, 4)}}{${ma}}\\right)^{${ma * a}} \\approx ${texR(P * (1 + ra / 100 / ma) ** (ma * a))}$`, `After ${a + b} years: $\\times \\left(1 + \\dfrac{${tn(rb_ / 100, 4)}}{${mb}}\\right)^{${mb * b}} \\approx ${texR(A)}$`],
        misconceptions: keep([
          { code: 'timeline', value: P * (1 + ra / 100 / ma) ** (ma * (a + b)), feedback: `The rate changes after ${a} years. Use the second rate for the last ${b} years.` },
          { code: 'rate-period', value: P * (1 + ra / 100) ** a * (1 + rb_ / 100) ** b, feedback: 'Each rate compounds more than once a year: divide by $m$ and multiply the years by $m$.' },
          { code: 'timeline', value: P * (1 + ra / 100 / ma) ** (ma * a) + P * (1 + rb_ / 100 / mb) ** (mb * b), feedback: 'The second period starts with the money at the end of the first period, not with a fresh investment.' },
        ], A),
      };
    }
    // Level 5: deposits and a withdrawal on one timeline.
    const m = rng.pick([12, 4]);
    const r = rateIn(rng, 6, 12);
    const j = r / 100 / m;
    const n = rng.int(5, 8);
    const ta = rng.int(1, n - 3);
    const tb = rng.int(ta + 1, n - 1);
    const Q = rng.int(10, 120) * 500;
    const W = rng.int(4, 60) * 500;
    const grow = (t: number) => (1 + j) ** (m * (n - t));
    const A = P * grow(0) + Q * grow(ta) - W * grow(tb);
    if (A <= 0) return nominalEffective.generate(rng, 5);
    return {
      prompt: `${name} deposits ${randsW(P)} into an account paying ${pc(r)} per year, compounded ${COMP[m]}. ${ta === 1 ? 'One year' : `${ta} years`} later ${name} deposits another ${randsW(Q)}, and ${tb} years after the first deposit withdraws ${randsW(W)}. How much is in the account ${n} years after the first deposit?`,
      input: { kind: 'numeric', prefix: 'R' },
      answer: money(A),
      answerDisplay: rands(A),
      hints: [`Draw a timeline from 0 to ${n} years. Move each amount to year ${n} separately.`, `Each amount grows for the time it is in the account: the deposit at year ${ta} for ${n - ta} years, and the withdrawal at year ${tb} loses ${n - tb} years of growth.`],
      solution: [
        `$${P}(1 + ${tn(j, 6)})^{${m * n}} + ${Q}(1 + ${tn(j, 6)})^{${m * (n - ta)}} - ${W}(1 + ${tn(j, 6)})^{${m * (n - tb)}}$`,
        `$\\approx ${texR(P * grow(0))} + ${texR(Q * grow(ta))} - ${texR(W * grow(tb))} = ${texR(A)}$`,
      ],
      misconceptions: keep([
        { code: 'timeline', value: P * grow(0) + Q * grow(ta) - W, feedback: `The ${randsW(W)} would have earned interest for ${n - tb} more years. Grow the withdrawal to year ${n} too before subtracting it.` },
        { code: 'timeline', value: (P + Q) * grow(0) - W * grow(0), feedback: 'Each amount only grows from the time it goes in (or comes out). Use its own number of periods.' },
        { code: 'sign-error', value: P * grow(0) + Q * grow(ta) + W * grow(tb), feedback: 'A withdrawal takes money out: subtract it.' },
      ], A),
    };
  },
};

// ---------------------------------------------------------------------------
// Grade 12: annuities

/** Future value of n payments of x at rate i per period: x[(1 + i)^n − 1]/i. */
const fv = (x: number, i: number, n: number) => (x * ((1 + i) ** n - 1)) / i;
/** Present value of n payments of x: x[1 − (1 + i)^−n]/i. */
const pv = (x: number, i: number, n: number) => (x * (1 - (1 + i) ** -n)) / i;
/** The rate per month in TeX, kept exact: \tfrac{0{,}085}{12}. */
const iTex = (i: number) => `\\tfrac{${tn(i * 12, 5)}}{12}`;
const fvTex = (x: string, i: number, n: number | string) => `${x}\\left[\\dfrac{(1 + ${iTex(i)})^{${n}} - 1}{${iTex(i)}}\\right]`;
const pvTex = (x: string, i: number, n: number | string) => `${x}\\left[\\dfrac{1 - (1 + ${iTex(i)})^{-${n}}}{${iTex(i)}}\\right]`;
/** "8,5% per year, compounded monthly" and the rate per month. */
function monthly(rng: Rng, lo = 6, hi = 13) {
  const r = rateIn(rng, lo, hi);
  return { r, i: r / 100 / 12, text: `${pc(r)} per year, compounded monthly`, itex: `\\dfrac{${tn(r / 100, 4)}}{12}` };
}

export const futureValueAnnuities: QuestionTemplate = {
  id: 'future-value-annuities',
  skillId: 'future-value-annuities',
  generate(rng, level) {
    const name = rng.pick(NAMES);
    const { r, i, text } = monthly(rng);
    if (level === 1) {
      const x = rng.int(4, 60) * 50;
      const y = rng.int(3, 20);
      const n = 12 * y;
      const F = fv(x, i, n);
      return {
        prompt: `${name} saves ${randsW(x)} at the end of every month for ${y} years, in an account paying ${text}. The first payment is made one month from now. How much will be in the account straight after the last payment?`,
        input: { kind: 'numeric', prefix: 'R' },
        answer: money(F),
        answerDisplay: rands(F),
        hints: [`A future value annuity: $F = x\\left[\\dfrac{(1 + i)^n - 1}{i}\\right]$`, `Monthly: $i = \\dfrac{${tn(r / 100, 4)}}{12}$ and $n = ${y} \\times 12 = ${n}$ payments.`],
        solution: [`$F = ${fvTex(String(x), i, n)}$`, `$F \\approx ${texR(F)}$`],
        misconceptions: keep([
          { code: 'annuity-formula', value: x * n, feedback: 'That is only the payments added up. Each one also earns interest until the end.' },
          { code: 'annuity-formula', value: pv(x, i, n), feedback: 'That is the present value formula (for loans). Savings that build up use the future value formula.' },
          { code: 'rate-period', value: fv(x, r / 100, n), feedback: 'Use the rate per month, $i = \\frac{r}{12}$, to match monthly payments.' },
        ], F),
      };
    }
    if (level === 2) {
      const goal = rng.int(20, 400) * 1000;
      const y = rng.int(2, 15);
      const n = 12 * y;
      const x = (goal * i) / ((1 + i) ** n - 1);
      const goals = [`a deposit on a house of ${randsW(goal)}`, `${randsW(goal)} for university fees`, `${randsW(goal)} to start a small business`, `${randsW(goal)} for a car`];
      return {
        prompt: `${name} wants ${rng.pick(goals)} in ${y} years' time. How much must be saved at the end of each month, in an account paying ${text}, starting one month from now?`,
        input: { kind: 'numeric', prefix: 'R' },
        answer: money(x),
        answerDisplay: rands(x),
        hints: [`The savings must have a future value of ${randsW(goal)}: $${goal} = x\\left[\\dfrac{(1 + i)^n - 1}{i}\\right]$`, `$n = ${n}$ monthly payments. Solve for $x$.`],
        solution: [`$${goal} = ${fvTex('x', i, n)}$`, `$x \\approx ${texR(x)}$`],
        misconceptions: keep([
          { code: 'annuity-formula', value: goal / n, feedback: 'That ignores interest. The payments grow, so you need to pay in less than that.' },
          { code: 'annuity-formula', value: (goal * i) / (1 - (1 + i) ** -n), feedback: 'That uses the present value formula, as for a loan. A savings goal in the future uses the future value formula.' },
        ], x),
      };
    }
    if (level === 3) {
      // Sinking fund.
      const a = rng.pick(ASSETS);
      const C = rng.int(a.lo, a.hi) * 1000;
      const d = rng.pick([10, 12, 15, 18, 20]);
      const g = rng.int(40, 80) / 10;
      const y = rng.int(4, 8);
      const n = 12 * y;
      const newCost = C * (1 + g / 100) ** y;
      const scrap = C * (1 - d / 100) ** y;
      const need = newCost - scrap;
      const x = (need * i) / ((1 + i) ** n - 1);
      return {
        prompt: `A company buys ${a.what} for ${randsW(C)}. It will be replaced in ${y} years. The price of a new one rises at ${pc(g)} per year, and the old one depreciates at ${pc(d)} per year on the reducing balance and will be traded in at its book value. The company sets up a sinking fund paying ${text}, with equal payments at the end of each month starting one month from now. Find the monthly payment.`,
        input: { kind: 'numeric', prefix: 'R' },
        answer: money(x),
        answerDisplay: rands(x),
        hints: ['First find what the fund must hold: the future price of a new one minus the trade-in value.', 'Then find the monthly payment with the future value formula.'],
        solution: [
          `New one: $${C}(1 + ${tn(g / 100, 3)})^{${y}} \\approx ${texR(newCost)}$. Trade-in: $${C}(1 - ${tn(d / 100, 3)})^{${y}} \\approx ${texR(scrap)}$.`,
          `Sinking fund: $${texR(need)}$`,
          `$${tn(need, 2)} = ${fvTex('x', i, n)}$, so $x \\approx ${texR(x)}$`,
        ],
        misconceptions: keep([
          { code: 'annuity-formula', value: (newCost * i) / ((1 + i) ** n - 1), feedback: 'The old one is traded in. Subtract its book value from the new price first.' },
          { code: 'timeline', value: ((C - scrap) * i) / ((1 + i) ** n - 1), feedback: 'The new one will cost more than today\'s price: grow it with inflation first.' },
          { code: 'annuity-formula', value: need / n, feedback: 'That ignores the interest the fund earns. Use the future value formula.' },
        ], x),
      };
    }
    if (level === 4) {
      const x = rng.int(4, 60) * 50;
      const y = rng.int(3, 12);
      const n = 12 * y;
      if (rng.chance(0.5)) {
        // First payment today, last at the end: one extra payment.
        const F = fv(x, i, n + 1);
        return {
          prompt: `${name} pays ${randsW(x)} into a savings account every month, starting today, at ${text}. The last payment is made exactly ${y} years from today. How much is in the account straight after the last payment?`,
          input: { kind: 'numeric', prefix: 'R' },
          answer: money(F),
          answerDisplay: rands(F),
          hints: [`Count the payments on a timeline: one today (month 0), then one at the end of every month up to month ${n}.`, `That is ${n} + 1 = ${n + 1} payments.`],
          solution: [`$n = ${n + 1}$ payments.`, `$F = ${fvTex(String(x), i, n + 1)} \\approx ${texR(F)}$`],
          misconceptions: keep([
            { code: 'annuity-timing', value: fv(x, i, n), feedback: `There are ${n + 1} payments, not ${n}: the one made today counts too.` },
            { code: 'annuity-timing', value: fv(x, i, n) * (1 + i), feedback: 'That moves each of the payments one month later. Count the payments on a timeline instead.' },
          ], F),
        };
      }
      // Payments stop, the money stays in.
      const k = rng.int(1, 5);
      const F = fv(x, i, n) * (1 + i) ** (12 * k);
      return {
        prompt: `${name} saves ${randsW(x)} at the end of every month for ${y} years at ${text}, starting one month from now. Then the payments stop, but the money stays in the account for another ${k === 1 ? 'year' : `${k} years`}. How much is in the account at the end?`,
        input: { kind: 'numeric', prefix: 'R' },
        answer: money(F),
        answerDisplay: rands(F),
        hints: ['Find the future value when the payments stop.', `Then grow that lump sum for another ${12 * k} months: $\\times (1 + i)^{${12 * k}}$.`],
        solution: [`After ${y} years: $${fvTex(String(x), i, n)} \\approx ${texR(fv(x, i, n))}$`, `Then: $\\times (1 + ${iTex(i)})^{${12 * k}} \\approx ${texR(F)}$`],
        misconceptions: keep([
          { code: 'timeline', value: fv(x, i, n), feedback: `The money keeps earning interest for another ${12 * k} months after the payments stop.` },
          { code: 'annuity-timing', value: fv(x, i, n + 12 * k), feedback: 'That keeps paying in during the extra time. After the payments stop, it is a single amount growing: $\\times (1 + i)^n$.' },
        ], F),
      };
    }
    // Level 5: how many payments to reach a goal (logs).
    for (;;) {
      const x = rng.int(10, 80) * 50;
      const goal = rng.int(20, 300) * 1000;
      const nExact = Math.log((goal * i) / x + 1) / Math.log(1 + i);
      const frac = nExact - Math.floor(nExact);
      if (nExact < 18 || nExact > 180 || frac < 0.05 || frac > 0.95) continue;
      const ans = Math.ceil(nExact);
      return {
        prompt: `${name} saves ${randsW(x)} at the end of every month at ${text}, starting one month from now. How many months will it take for the savings to reach at least ${randsW(goal)}?`,
        input: { kind: 'numeric', unit: 'months' },
        answer: count(ans),
        answerDisplay: `${ans} months (the formula gives $n \\approx ${tn(nExact, 2)}$)`,
        hints: [`$${goal} = ${x}\\left[\\dfrac{(1 + i)^n - 1}{i}\\right]$: get $(1 + i)^n$ on its own.`, 'Then use logs: $n = \\dfrac{\\log(\\dots)}{\\log(1 + i)}$. Round up: a whole number of months.'],
        solution: [`$(1 + ${iTex(i)})^n = \\dfrac{${goal} \\times ${iTex(i)}}{${x}} + 1 \\approx ${tn((goal * i) / x + 1, 5)}$`, `$n = \\dfrac{\\log ${tn((goal * i) / x + 1, 5)}}{\\log \\left(1 + ${iTex(i)}\\right)} \\approx ${tn(nExact, 2)}$`, `After ${Math.floor(nExact)} months it is not quite there, so ${ans} months.`],
        misconceptions: keep([
          { code: 'annuity-term', value: Math.floor(nExact), feedback: `After ${Math.floor(nExact)} months the savings are still just short. Round up.`, as: 'count' },
          { code: 'annuity-formula', value: Math.ceil(goal / x), feedback: 'That ignores interest. With interest, you reach the goal sooner.', as: 'count' },
        ], ans),
      };
    }
  },
};

/** `borrow` completes "borrows R… ", `item` is what is bought outright. */
const LOANS = [
  { borrow: 'to buy a house', item: 'a house', lo: 450, hi: 2200, home: true },
  { borrow: 'to buy a car', item: 'a car', lo: 150, hi: 600, home: false },
  { borrow: 'to buy a minibus taxi', item: 'a minibus taxi', lo: 400, hi: 700, home: false },
  { borrow: 'for university fees', item: null, lo: 60, hi: 250, home: false },
  { borrow: 'to expand a small business', item: null, lo: 100, hi: 900, home: false },
];

export const presentValueAnnuities: QuestionTemplate = {
  id: 'present-value-annuities',
  skillId: 'present-value-annuities',
  generate(rng, level) {
    const name = rng.pick(NAMES);
    const { r, i, text } = monthly(rng, 7, 14);
    const L = rng.pick(LOANS);
    if (level === 1) {
      const x = rng.int(20, 300) * 50;
      const y = rng.pick([3, 4, 5, 6, 10, 15, 20]);
      const n = 12 * y;
      const P = pv(x, i, n);
      return {
        prompt: `${name} can afford repayments of ${randsW(x)} at the end of every month for ${y} years. The bank charges ${text}, and the first repayment is one month after the loan is granted. What is the largest loan ${name} can take?`,
        input: { kind: 'numeric', prefix: 'R' },
        answer: money(P),
        answerDisplay: rands(P),
        hints: [`A loan is a present value annuity: $P = x\\left[\\dfrac{1 - (1 + i)^{-n}}{i}\\right]$`, `$i = \\dfrac{${tn(r / 100, 4)}}{12}$ and $n = ${n}$.`],
        solution: [`$P = ${pvTex(String(x), i, n)} \\approx ${texR(P)}$`],
        misconceptions: keep([
          { code: 'annuity-formula', value: x * n, feedback: 'That is the total of the repayments. Most of the later repayments pay interest, so the loan is much smaller.' },
          { code: 'annuity-formula', value: fv(x, i, n), feedback: 'That is the future value formula, for savings. A loan given now is a present value.' },
        ], P),
      };
    }
    if (level === 2) {
      const price = rng.int(L.lo, L.hi) * 1000;
      const dep = rng.pick([0, 10, 10, 15, 20]);
      const y = L.home ? rng.pick([20, 25, 30]) : rng.pick([3, 4, 5, 6]);
      const n = 12 * y;
      const P = price * (1 - dep / 100);
      const x = (P * i) / (1 - (1 + i) ** -n);
      if (rng.chance(0.3)) {
        const interest = n * x - P;
        return {
          prompt: `${name} borrows ${randsW(P)} ${L.borrow} at ${text}, repaid over ${y} years with equal payments at the end of each month. How much interest will ${name} pay over the whole loan?`,
          input: { kind: 'numeric', prefix: 'R' },
          answer: money(interest),
          answerDisplay: rands(interest),
          hints: ['First find the monthly repayment with the present value formula.', 'Total paid $= n \\times x$. Interest $=$ total paid $-$ amount borrowed.'],
          solution: [`$${P} = ${pvTex('x', i, n)}$, so $x \\approx ${texR(x)}$`, `Total paid: $${n} \\times ${tn(x, 2)} \\approx ${texR(n * x)}$`, `Interest: $${texR(interest)}$`],
          misconceptions: keep([
            { code: 'annuity-formula', value: n * x, feedback: 'That is everything paid back. Subtract the amount borrowed to get the interest.' },
            { code: 'simple-vs-compound', value: P * (r / 100) * y, feedback: 'The interest is on the balance still owed, which shrinks as you repay. Find the repayment, then total paid minus the loan.' },
          ], interest),
        };
      }
      return {
        prompt: `${name} buys ${L.item ?? 'a delivery bakkie'} for ${randsW(price)}${dep ? ` and pays a ${dep}% deposit` : ''}. The ${dep ? 'rest' : 'full amount'} is borrowed at ${text}, and repaid over ${y} years with equal payments at the end of each month, starting one month after the loan is granted. Find the monthly repayment.`,
        input: { kind: 'numeric', prefix: 'R' },
        answer: money(x),
        answerDisplay: rands(x),
        hints: [dep ? `The loan is the price less the deposit: $${price} \\times ${tn(1 - dep / 100, 2)} = ${P}$.` : `The loan is ${randsW(P)}.`, `$${P} = x\\left[\\dfrac{1 - (1 + i)^{-${n}}}{i}\\right]$: solve for $x$.`],
        solution: [...(dep ? [`Loan: $${P}$`] : []), `$${P} = ${pvTex('x', i, n)}$`, `$x \\approx ${texR(x)}$`],
        misconceptions: keep([
          ...(dep ? [{ code: 'hire-purchase' as MistakeCode, value: (price * i) / (1 - (1 + i) ** -n), feedback: 'Take off the deposit first: only the rest is borrowed.' }] : []),
          { code: 'annuity-formula', value: (P * i) / ((1 + i) ** n - 1), feedback: 'That uses the future value formula. A loan received now is a present value.' },
          { code: 'annuity-formula', value: (P * (1 + (r / 100) * y)) / n, feedback: 'Loans charge compound interest on the balance still owed: use the present value formula.' },
        ], x),
      };
    }
    if (level === 3) {
      // Outstanding balance after k payments.
      const P = rng.int(L.lo, L.hi) * 1000;
      const y = L.home ? rng.pick([20, 25]) : rng.pick([4, 5, 6]);
      const n = 12 * y;
      const x = r2((P * i) / (1 - (1 + i) ** -n));
      const k = rng.int(Math.round(n * 0.2), Math.round(n * 0.8));
      const bal = pv(x, i, n - k);
      return {
        prompt: `${name} borrowed ${randsW(P)} ${L.borrow} at ${text}. It is repaid with ${n} monthly payments of ${rands(x)}, the first one month after the loan was granted. How much is still owed straight after the ${k}th payment?`,
        input: { kind: 'numeric', prefix: 'R' },
        answer: money(bal),
        answerDisplay: rands(bal),
        hints: [`The amount still owed is the present value of the payments still to come: ${n} − ${k} = ${n - k} payments.`, `$\\text{Balance} = ${rands(x)}\\left[\\dfrac{1 - (1 + i)^{-${n - k}}}{i}\\right]$`],
        solution: [`Payments left: $${n - k}$`, `$\\text{Balance} = ${pvTex(tn(x, 2), i, n - k)} \\approx ${texR(bal)}$`],
        misconceptions: keep([
          { code: 'outstanding-balance', value: P - k * x, feedback: 'Much of each payment goes to interest, not to the loan. Find the present value of the payments still to come.' },
          { code: 'outstanding-balance', value: pv(x, i, k), feedback: `That is the present value of the ${k} payments already made. The balance is the value of the ${n - k} still to come.` },
          { code: 'outstanding-balance', value: n * x - k * x, feedback: 'That adds up the remaining payments without discounting them. Use the present value formula.' },
        ], bal),
      };
    }
    if (level === 4) {
      // Number of payments (logs).
      for (;;) {
        const P = rng.int(L.lo, L.hi) * 1000;
        const x = Math.round((P * i * rng.int(120, 250)) / 100 / 50) * 50;
        if (x <= P * i) continue;
        const nExact = -Math.log(1 - (P * i) / x) / Math.log(1 + i);
        const frac = nExact - Math.floor(nExact);
        if (nExact < 12 || nExact > 400 || frac < 0.05 || frac > 0.95) continue;
        const full = rng.chance(0.5);
        const ans = full ? Math.floor(nExact) : Math.ceil(nExact);
        return {
          prompt: `${name} borrows ${randsW(P)} ${L.borrow} at ${text}, and repays ${randsW(x)} at the end of every month, starting one month after the loan is granted. ${full ? `How many full payments of ${randsW(x)} will be made? (A smaller final payment then settles the loan.)` : 'How many monthly payments will it take to settle the loan? (The last payment will be smaller than the others.)'}`,
          input: { kind: 'numeric', unit: 'payments' },
          answer: count(ans),
          answerDisplay: `${ans} (the formula gives $n \\approx ${tn(nExact, 2)}$)`,
          hints: [`$${P} = ${x}\\left[\\dfrac{1 - (1 + i)^{-n}}{i}\\right]$: get $(1 + i)^{-n}$ on its own.`, `Then use logs. ${full ? 'Round down for the number of full payments.' : 'Round up: the part-payment still counts as a payment.'}`],
          solution: [`$(1 + ${iTex(i)})^{-n} = 1 - \\dfrac{${P} \\times ${iTex(i)}}{${x}} \\approx ${tn(1 - (P * i) / x, 5)}$`, `$n = \\dfrac{-\\log ${tn(1 - (P * i) / x, 5)}}{\\log \\left(1 + ${iTex(i)}\\right)} \\approx ${tn(nExact, 2)}$`, full ? `So ${ans} full payments, then a smaller one.` : `So ${ans} payments, the last one smaller.`],
          misconceptions: keep([
            { code: 'annuity-term', value: full ? Math.ceil(nExact) : Math.floor(nExact), feedback: full ? 'That counts the smaller final payment too. The question asks for full payments: round down.' : 'That leaves part of the loan unpaid. The smaller final payment is also a payment: round up.', as: 'count' },
            { code: 'annuity-formula', value: Math.ceil(P / x), feedback: 'That ignores interest. Interest keeps being added, so it takes longer.', as: 'count' },
          ], ans),
        };
      }
    }
    // Level 5: a delayed first payment, or the final payment.
    const P = rng.int(L.lo, L.hi) * 1000;
    if (rng.chance(0.5)) {
      const y = L.home ? rng.pick([20, 25]) : rng.pick([3, 4, 5]);
      const n = 12 * y;
      const k = rng.pick([3, 4, 6, 6, 12]);
      const grown = P * (1 + i) ** (k - 1);
      const x = (grown * i) / (1 - (1 + i) ** -n);
      return {
        prompt: `${name} borrows ${randsW(P)} ${L.borrow} at ${text}. The first repayment is made ${k} months after the loan is granted, and there are ${n} equal monthly repayments. Find the monthly repayment.`,
        input: { kind: 'numeric', prefix: 'R' },
        answer: money(x),
        answerDisplay: rands(x),
        hints: [`Draw a timeline. A normal loan's first payment is 1 month after the loan; this one starts at month ${k}, so the loan first grows for ${k - 1} months.`, `At month ${k - 1}: $${P}(1 + i)^{${k - 1}}$. That amount is the present value of the ${n} payments.`],
        solution: [`At month ${k - 1}: $${P}(1 + ${iTex(i)})^{${k - 1}} \\approx ${texR(grown)}$`, `$${tn(grown, 2)} = ${pvTex('x', i, n)}$`, `$x \\approx ${texR(x)}$`],
        misconceptions: keep([
          { code: 'annuity-timing', value: (P * (1 + i) ** k * i) / (1 - (1 + i) ** -n), feedback: `Grow the loan for ${k - 1} months, not ${k}: the present value formula already puts the loan one month before the first payment.` },
          { code: 'annuity-timing', value: (P * i) / (1 - (1 + i) ** -n), feedback: `Interest is charged during the ${k - 1} months before the payments start. Grow the loan first.` },
        ], x),
      };
    }
    for (;;) {
      const x = Math.round((P * i * rng.int(120, 250)) / 100 / 50) * 50;
      if (x <= P * i) continue;
      const nExact = -Math.log(1 - (P * i) / x) / Math.log(1 + i);
      const f = Math.floor(nExact);
      if (nExact < 12 || nExact > 300 || nExact - f < 0.1 || nExact - f > 0.9) continue;
      const balance = P * (1 + i) ** f - fv(x, i, f);
      const last = balance * (1 + i);
      return {
        prompt: `${name} borrows ${randsW(P)} ${L.borrow} at ${text}, and repays ${randsW(x)} at the end of every month, starting one month after the loan is granted. After ${f} full payments, a smaller final payment one month later settles the loan. Find the final payment.`,
        input: { kind: 'numeric', prefix: 'R' },
        answer: money(last),
        answerDisplay: rands(last),
        hints: [`Find the balance straight after payment ${f}: what the loan has grown to, minus what the payments have grown to.`, 'The final payment is one month later, so the balance earns one more month of interest.'],
        solution: [
          `Balance after ${f} payments: $${P}(1 + ${iTex(i)})^{${f}} - ${fvTex(String(x), i, f)} \\approx ${texR(balance)}$`,
          `Final payment: $${tn(balance, 2)} \\times \\left(1 + ${iTex(i)}\\right) \\approx ${texR(last)}$`,
        ],
        misconceptions: keep([
          { code: 'annuity-timing', value: balance, feedback: 'That is the balance straight after the last full payment. It earns one more month of interest before the final payment.' },
          { code: 'outstanding-balance', value: P - f * x, feedback: 'Interest is added every month, so you can\'t just subtract the payments from the loan.' },
        ], last),
      };
    }
  },
};

/** Exposed for the lab. */
export { fv, pv, eff };
