/**
 * Finance: every answer is recomputed from the numbers in the prompt by simulating the money period by period: a
 * savings balance gets its interest and then the payment each month, a loan gets its interest and then the repayment,
 * an asset loses its depreciation each year. Unknowns (a payment, a loan, a rate, a cost) are found by bisection on
 * the simulation. Nothing here uses the annuity, depreciation or effective-rate formulas that the generators use.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion } from './registry.ts';
import { DIFFICULTIES, type GeneratedQuestion } from './types.ts';

const SEEDS = 300;

// ---------------------------------------------------------------------------
// Reading the prompt

const num = (s: string) => Number(s.replace(/ /g, '').replace(',', '.'));
/** Every rand amount in order: R12 500, R4 906,43. Exchange rates ("= R18,40") are skipped. */
const rands = (p: string) => [...p.matchAll(/(?<!= )R(\d{1,3}(?: \d{3})*(?:,\d+)?)/g)].map((m) => num(m[1]!));
const pcts = (p: string) => [...p.matchAll(/(\d+(?:,\d+)?)%/g)].map((m) => num(m[1]!) / 100);
const PER: Record<string, number> = { annually: 1, 'half-yearly': 2, quarterly: 4, monthly: 12 };
/** Every "r% per year, compounded …" in order. */
const rates = (p: string) => [...p.matchAll(/(\d+(?:,\d+)?)% per year,? compounded ([a-z-]+)/g)].map((m) => ({ r: num(m[1]!) / 100, m: PER[m[2]!]! }));
const ints = (p: string, re: RegExp) => [...p.matchAll(re)].map((m) => Number(m[1]));
const one = (p: string, re: RegExp) => {
  const m = re.exec(p);
  assert.ok(m, `no ${re} in ${p}`);
  return num(m[1]!);
};
const exRates = (p: string) => [...p.matchAll(/(?:\\\$|€|£)1 = R(\d+,\d{2})/g)].map((m) => num(m[1]!));

// ---------------------------------------------------------------------------
// Simulations

const grow = (P: number, rate: number, periods: number) => {
  let v = P;
  for (let t = 0; t < periods; t++) v += v * rate;
  return v;
};
/** Savings: interest, then the payment, every period. */
const save = (x: number, rate: number, periods: number, start = 0) => {
  let v = start;
  for (let t = 0; t < periods; t++) v = v + v * rate + x;
  return v;
};
/** A loan's balance after `periods` repayments (interest first, then the repayment). */
const owe = (P: number, x: number, rate: number, periods: number) => {
  let v = P;
  for (let t = 0; t < periods; t++) v = v + v * rate - x;
  return v;
};
/** Bisection for an increasing (or decreasing) f with f(x) = target on [lo, hi]. */
function solve(f: (v: number) => number, target: number, lo: number, hi: number): number {
  const up = f(hi) > f(lo);
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < target === up) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
const value = (q: GeneratedQuestion) => {
  assert.equal(q.answer.kind, 'numeric');
  return (q.answer as { value: number }).value;
};
/** Answers are rounded to 2 decimals (cents or hundredths of a percent). */
const near = (q: GeneratedQuestion, want: number, label: string, tol = 0.006) => assert.ok(Math.abs(value(q) - want) <= tol, `${label}: answer ${value(q)}, simulated ${want} — ${q.prompt}`);

function each(id: string, check: (q: GeneratedQuestion, level: number, label: string) => void) {
  for (const level of DIFFICULTIES) for (let seed = 0; seed < SEEDS; seed++) check(generateQuestion(id, seed, level), level, `L${level} seed ${seed}`);
}

// ---------------------------------------------------------------------------

test('hire purchase, inflation, population and exchange rates match a direct calculation', () => {
  each('finance-applications', (q, level, label) => {
    const p = q.prompt;
    if (level === 1) {
      const [ex] = exRates(p);
      if (/changes R/.test(p)) near(q, rands(p)[0]! / ex!, label);
      else near(q, one(p, /for (?:\\\$|€|£)(\d+)/) * ex!, label);
      return;
    }
    if (level === 2 || /hire purchase: /.test(p)) {
      const C = rands(p)[0]!;
      const [dep, rate] = pcts(p);
      if (level === 5) {
        // The rate the shop charges: interest per year as a fraction of the amount owed.
        const owed = C * (1 - dep!);
        const n = one(p, /then (\d+) monthly instalments/);
        const x = rands(p)[1]!;
        const interestPerYear = (n * x - owed) / (n / 12);
        near(q, (interestPerYear / owed) * 100, label);
        return;
      }
      const y = one(p, /over (\d+) years?/);
      const owed = C * (1 - dep!);
      let total = owed;
      for (let t = 0; t < y; t++) total += owed * rate!;
      near(q, /altogether/.test(p) ? C * dep! + total : total / (12 * y), label);
      return;
    }
    if (level === 3) {
      const now = rands(p)[0]!;
      const r = pcts(p)[0]!;
      const n = one(p, /(?:in|last) (\d+) years/);
      if (/what will it cost/.test(p)) near(q, grow(now, r, n), label);
      else near(q, solve((P) => grow(P, r, n), now, 0, now), label);
      return;
    }
    if (level === 4) {
      const flat = p.replace(/(\d) (?=\d{3}\b)/g, '$1');
      const n = one(flat, /(\d+) years/);
      if (/growth rate/.test(p)) {
        const P = one(flat, /from (\d+) to/);
        const A = one(flat, /to (\d+) (?:people|elephants)/);
        near(q, solve((x) => grow(P, x, n), A, 0, 1) * 100, label);
      } else near(q, Math.round(grow(one(flat, /has (\d+) (?:people|elephants)/), pcts(p)[0]!, n)), label, 0.5);
      return;
    }
    const ex = exRates(p);
    if (/A year ago/.test(p)) near(q, one(p, /costs (?:\\\$|€|£)(\d+)/) * (ex[1]! - ex[0]!), label, 0.01);
    else {
      const R = rands(p)[0]!;
      const spent = one(p, /spends (?:\\\$|€|£)(\d+)/);
      near(q, (R / ex[0]! - spent) * ex[1]!, label);
    }
  });
});

test('depreciation: book values year by year', () => {
  each('depreciation', (q, level, label) => {
    const p = q.prompt;
    const straight = /straight-line method/.test(p) && !/reducing-balance method than/.test(p);
    const yearly = (P: number, d: number, n: number, sl: boolean) => {
      let v = P;
      for (let t = 0; t < n; t++) v -= sl ? P * d : v * d;
      return v;
    };
    const n = level === 4 && /After how many/.test(p) ? 0 : one(p, /(\d+) years/);
    if (level === 1) return near(q, yearly(rands(p)[0]!, pcts(p)[0]!, n, straight), label);
    if (level === 2) return near(q, solve((P) => yearly(P, pcts(p)[0]!, n, straight), rands(p)[0]!, 0, 1e8), label);
    if (level === 3) {
      const [P, A] = rands(p);
      return near(q, solve((d) => yearly(P!, d, n, straight), A!, 0, 0.99) * 100, label);
    }
    if (level === 4) {
      const P = rands(p)[0]!;
      const d = pcts(p)[0]!;
      if (/how much more/.test(p)) return near(q, yearly(P, d, n, false) - yearly(P, d, n, true), label);
      const scrap = rands(p)[1]!;
      let years = 0;
      while (yearly(P, d, years, true) > scrap + 1e-6) years++;
      return assert.equal(value(q), years, label);
    }
    const P = rands(p)[0]!;
    const [d, g] = pcts(p);
    near(q, grow(P, g!, n) - yearly(P, d!, n, false), label);
  });
});

test('nominal and effective rates, and timelines', () => {
  each('nominal-effective', (q, level, label) => {
    const p = q.prompt;
    const effective = (r: number, m: number) => grow(1, r / m, m) - 1;
    if (level === 1) {
      const [{ r, m }] = rates(p) as [{ r: number; m: number }];
      return near(q, effective(r, m) * 100, label);
    }
    if (level === 2) {
      const e = pcts(p)[0]!;
      const m = PER[/compounded ([a-z-]+)/.exec(p)![1]!]!;
      return near(q, solve((r) => effective(r, m), e, 0, 1) * 100, label);
    }
    if (level === 3) {
      assert.equal(q.input.kind, 'choice');
      if (q.input.kind !== 'choice' || q.answer.kind !== 'choice') return;
      const effs = q.input.options.map((o) => {
        const [{ r, m }] = rates(o.text) as [{ r: number; m: number }];
        return effective(r, m);
      });
      const best = q.input.options[effs[0]! > effs[1]! ? 0 : 1]!.id;
      assert.equal(q.answer.id, best, `${label}: ${JSON.stringify(q.input.options)}`);
      return assert.ok(Math.abs(effs[0]! - effs[1]!) > 0.0002, `${label}: too close to call`);
    }
    if (level === 4) {
      const P = rands(p)[0]!;
      const [a, b] = ints(p, /(?:first|next) (\d+) years/g);
      const [r1, r2] = rates(p);
      return near(q, grow(grow(P, r1!.r / r1!.m, r1!.m * a!), r2!.r / r2!.m, r2!.m * b!), label);
    }
    // Deposits and a withdrawal: period by period, with each amount moving at its own time.
    const [P, Q, W] = rands(p);
    const [{ r, m }] = rates(p) as [{ r: number; m: number }];
    const ta = /One year later/.test(p) ? 1 : one(p, /(\d+) years later/);
    const tb = one(p, /and (\d+) years after the first deposit/);
    const n = one(p, /(\d+) years after the first deposit\?/);
    let v = P!;
    for (let t = 1; t <= m * n; t++) {
      v += (v * r) / m;
      if (t === m * ta) v += Q!;
      if (t === m * tb) v -= W!;
    }
    near(q, v, label);
  });
});

test('future value annuities: month-by-month savings', () => {
  each('future-value-annuities', (q, level, label) => {
    const p = q.prompt;
    const [{ r, m }] = rates(p) as [{ r: number; m: number }];
    assert.equal(m, 12, label);
    const i = r / 12;
    if (level === 1) return near(q, save(rands(p)[0]!, i, 12 * one(p, /for (\d+) years/)), label);
    if (level === 2) {
      const goal = rands(p)[0]!;
      const n = 12 * one(p, /in (\d+) years' time/);
      return near(q, solve((x) => save(x, i, n), goal, 0, goal), label);
    }
    if (level === 3) {
      const C = rands(p)[0]!;
      const y = one(p, /replaced in (\d+) years/);
      const [g, d] = pcts(p);
      let newCost = C;
      let old = C;
      for (let t = 0; t < y; t++) {
        newCost += newCost * g!;
        old -= old * d!;
      }
      return near(q, solve((x) => save(x, i, 12 * y), newCost - old, 0, newCost), label);
    }
    if (level === 4) {
      const x = rands(p)[0]!;
      if (/starting today/.test(p)) {
        const y = one(p, /exactly (\d+) years from today/);
        return near(q, save(x, i, 12 * y, x), label);
      }
      const y = one(p, /for (\d+) years at/);
      const k = /another year/.test(p) ? 1 : one(p, /another (\d+) years/);
      return near(q, grow(save(x, i, 12 * y), i, 12 * k), label);
    }
    const [x, goal] = rands(p);
    let months = 0;
    let v = 0;
    while (v < goal!) {
      v = v + v * i + x!;
      months++;
    }
    assert.equal(value(q), months, `${label}: ${p}`);
  });
});

test('present value annuities: month-by-month loans', () => {
  each('present-value-annuities', (q, level, label) => {
    const p = q.prompt;
    const [{ r, m }] = rates(p) as [{ r: number; m: number }];
    assert.equal(m, 12, label);
    const i = r / 12;
    if (level === 1) {
      const x = rands(p)[0]!;
      const n = 12 * one(p, /for (\d+) years/);
      return near(q, solve((P) => -owe(P, x, i, n), 0, 0, x * n), label);
    }
    if (level === 2) {
      const n = 12 * one(p, /over (\d+) years/);
      if (/interest will/.test(p)) {
        const P = rands(p)[0]!;
        const x = solve((x) => -owe(P, x, i, n), 0, 0, P);
        return near(q, n * x - P, label, 0.01);
      }
      const price = rands(p)[0]!;
      const dep = /deposit/.test(p) ? pcts(p)[0]! : 0;
      const P = price * (1 - dep);
      return near(q, solve((x) => -owe(P, x, i, n), 0, 0, P), label);
    }
    if (level === 3) {
      const [P, x] = rands(p);
      const k = one(p, /after the (\d+)th payment/);
      const n = one(p, /with (\d+) monthly payments/);
      // The exam method: the balance is what the remaining payments are worth. Running the loan with these payments
      // from the value they repay gives exactly that.
      const repaid = solve((L) => owe(L, x!, i, n), 0, 0, x! * n);
      near(q, owe(repaid, x!, i, k), label);
      // A learner who instead runs the stated loan forward month by month must also be marked right (the payment
      // was rounded to the cent, so the two differ slightly).
      const forward = owe(P!, x!, i, k);
      const tol = (q.answer as { tolerance: number }).tolerance;
      return assert.ok(Math.abs(forward - value(q)) <= tol, `${label}: forward method ${forward} vs ${value(q)} ± ${tol}`);
    }
    const [P, x] = rands(p);
    if (level === 4) {
      let v = P!;
      let full = 0;
      for (;;) {
        v += v * i;
        if (v <= x! + 1e-9) break;
        v -= x!;
        full++;
      }
      return assert.equal(value(q), /full payments/.test(p) ? full : full + 1, `${label}: ${p}`);
    }
    if (/smaller final payment/.test(p)) {
      const f = one(p, /After (\d+) full payments/);
      return near(q, grow(owe(P!, x!, i, f), i, 1), label);
    }
    // First repayment k months after the loan: interest only until then.
    const k = one(p, /made (\d+) months after/);
    const n = one(p, /there are (\d+) equal/);
    const run = (pay: number) => {
      let v = P!;
      for (let t = 1; t < k; t++) v += v * i;
      return owe(v, pay, i, n);
    };
    near(q, solve((pay) => -run(pay), 0, 0, P!), label);
  });
});
