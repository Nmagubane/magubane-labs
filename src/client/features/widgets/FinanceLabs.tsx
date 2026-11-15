/**
 * Finance labs (Grades 11–12):
 * - depreciation: straight-line against reducing balance on the same machine;
 * - effective: one nominal rate compounded more and more often, and the effective rate it gives;
 * - savings: monthly savings, split into what you paid in and the interest it earned;
 * - loan: a loan's balance month by month, and what happens when the repayment barely covers the interest.
 * Values are simulated period by period here (not with the formulas), so the lab shows where the formulas come from.
 */
import { useState } from 'react';
import { Plot } from '../../ui/Plot.tsx';
import { Tex, Rich } from '../../ui/RichText.tsx';
import { Slider } from './MathWidgets.tsx';
import { Note } from './NstLabs.tsx';
import { rands } from '../../../shared/questions/generators/math-finance.ts';

const pc = (v: number, dp = 2) => `${(Math.round(v * 10 ** dp) / 10 ** dp).toString().replace('.', ',')}%`;
const k = (v: number) => `R${Math.round(v / 1000).toLocaleString('en-ZA').replace(/,/g, ' ')}k`;
const line = (pts: [number, number][], s: { x: (v: number) => number; y: (v: number) => number }) => pts.map(([x, y]) => `${s.x(x)},${s.y(y)}`).join(' ');
/** A y-range in thousands of rand with a little headroom. */
const top = (v: number) => Math.max(10, Math.ceil((v / 1000) * 1.08 / 10) * 10);

function DepreciationMode() {
  const P = 200000;
  const [d, setD] = useState(15);
  const [n, setN] = useState(5);
  const i = d / 100;
  const years = 12;
  const slv = (t: number) => Math.max(0, P * (1 - i * t));
  const rbv = (t: number) => P * (1 - i) ** t;
  const pts = (f: (t: number) => number) => Array.from({ length: years * 4 + 1 }, (_, j): [number, number] => [j / 4, f(j / 4) / 1000]);
  const zero = 1 / i;
  return (
    <>
      <div className="widget-readout ag-readout" aria-live="polite">
        <Tex tex={`\\text{Straight-line: } ${200}\\,000(1 - ${(i).toString().replace('.', '{,}')} \\times ${n}) = \\text{${rands(slv(n))}}`} />
        <Tex tex={`\\text{Reducing balance: } ${200}\\,000(1 - ${(i).toString().replace('.', '{,}')})^{${n}} = \\text{${rands(rbv(n))}}`} />
      </div>
      <Plot padLeft={36} xRange={[0, years]} yRange={[0, 200]} width={400} height={300} label={`A R200 000 machine at ${d}% a year. After ${n} years: straight-line ${rands(slv(n))}, reducing balance ${rands(rbv(n))}.`}>
        {(s) => (
          <>
            <polyline points={line(pts(slv), s)} className="plot-line plot-curve" />
            <polyline points={line(pts(rbv), s)} className="plot-line plot-curve pen" />
            <line x1={s.x(n)} x2={s.x(n)} y1={s.y(0)} y2={s.y(200)} className="plot-segment dashed" />
            <circle cx={s.x(n)} cy={s.y(slv(n) / 1000)} r={5} className="plot-point" />
            <circle cx={s.x(n)} cy={s.y(rbv(n) / 1000)} r={5} className="plot-point pen" />
          </>
        )}
      </Plot>
      <p className="small">Value in thousands of rand against years. Black: straight-line. Blue: reducing balance.</p>
      <div className="widget-controls">
        <Slider label="Rate of depreciation" value={d} min={5} max={30} onChange={setD} format={(v) => `${v}%`} />
        <Slider label="Years" value={n} min={1} max={years} onChange={setN} />
      </div>
      <Note ok={null}>
        <Rich
          as="p"
          text={`Straight-line takes the same ${rands(P * i)} off every year, so it is a straight line and reaches zero after $\\frac{1}{i} = ${String(Math.round(zero * 10) / 10).replace('.', '{,}')}$ years. Reducing balance takes ${d}% of **what is left**, so each year's loss is smaller, and the value never quite reaches zero.`}
        />
      </Note>
    </>
  );
}

const PERIODS = [
  { m: 1, name: 'annually' },
  { m: 2, name: 'half-yearly' },
  { m: 4, name: 'quarterly' },
  { m: 12, name: 'monthly' },
  { m: 365, name: 'daily' },
];

function EffectiveMode() {
  const [r, setR] = useState(12);
  const [pick, setPick] = useState(12);
  const rows = PERIODS.map((p) => {
    let v = 1;
    for (let t = 0; t < p.m; t++) v += v * (r / 100 / p.m);
    return { ...p, eff: (v - 1) * 100 };
  });
  const max = rows[rows.length - 1]!.eff;
  const chosen = rows.find((x) => x.m === pick)!;
  return (
    <>
      <div className="widget-readout ag-readout" aria-live="polite">
        <Tex tex={`1 + i_{\\text{eff}} = \\left(1 + \\dfrac{${(r / 100).toString().replace('.', '{,}')}}{${pick}}\\right)^{${pick}} \\Rightarrow i_{\\text{eff}} = ${pc(chosen.eff).replace('%', '\\%').replace(',', '{,}')}`} />
      </div>
      <ul className="fin-bars" aria-label={`Effective rates for ${pc(r, 1)} per year`}>
        {rows.map((x) => (
          <li key={x.m}>
            <button type="button" className={`fin-bar${x.m === pick ? ' on' : ''}`} aria-pressed={x.m === pick} onClick={() => setPick(x.m)}>
              <span className="fin-bar-name">{x.name}</span>
              <span className="fin-bar-track">
                <span className="fin-bar-fill" style={{ width: `${(x.eff / max) * 100}%` }} />
              </span>
              <span className="fin-bar-value num">{pc(x.eff)}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="widget-controls">
        <Slider label="Nominal rate per year" value={r} min={1} max={24} step={0.5} onChange={setR} format={(v) => pc(v, 1)} />
      </div>
      <Note ok={null}>
        <Rich
          as="p"
          text={`The same ${pc(r, 1)} per year earns more the more often it compounds, because interest starts earning interest sooner. The quoted (nominal) rate only equals the effective rate when it compounds once a year. Going from monthly to daily adds very little: ${pc(rows[4]!.eff - rows[3]!.eff, 3)}.`}
        />
      </Note>
    </>
  );
}

function SavingsMode() {
  const [x, setX] = useState(1500);
  const [r, setR] = useState(9);
  const [y, setY] = useState(10);
  const i = r / 100 / 12;
  const bal: [number, number][] = [[0, 0]];
  const paid: [number, number][] = [[0, 0]];
  let v = 0;
  for (let t = 1; t <= 12 * y; t++) {
    v = v + v * i + x;
    bal.push([t / 12, v / 1000]);
    paid.push([t / 12, (x * t) / 1000]);
  }
  const F = v;
  const P = x * 12 * y;
  const yMax = top(F);
  return (
    <>
      <div className="widget-readout ag-readout" aria-live="polite">
        <span>
          Saved: <strong className="num">{rands(F)}</strong>
        </span>
        <span>
          Paid in: <strong className="num">{rands(P)}</strong>
        </span>
        <span>
          Interest: <strong className="num">{rands(F - P)}</strong>
        </span>
      </div>
      <Plot padLeft={36} xRange={[0, y]} yRange={[0, yMax]} width={400} height={300} label={`${rands(x)} a month for ${y} years at ${pc(r, 1)} compounded monthly grows to ${rands(F)}; ${rands(P)} of that was paid in.`}>
        {(s) => (
          <>
            <polygon points={`${line(bal, s)} ${s.x(y)},${s.y(0)} ${s.x(0)},${s.y(0)}`} className="fin-area interest" />
            <polygon points={`${line(paid, s)} ${s.x(y)},${s.y(0)} ${s.x(0)},${s.y(0)}`} className="fin-area paid" />
            <polyline points={line(bal, s)} className="plot-line plot-curve pen" />
          </>
        )}
      </Plot>
      <p className="small">Thousands of rand against years. Grey: what you paid in. Blue above it: interest.</p>
      <div className="widget-controls">
        <Slider label="Monthly saving" value={x} min={200} max={5000} step={100} onChange={setX} format={rands} />
        <Slider label="Interest rate per year" value={r} min={1} max={15} step={0.5} onChange={setR} format={(v) => pc(v, 1)} />
        <Slider label="Years" value={y} min={1} max={30} onChange={setY} />
      </div>
      <Note ok={null}>
        <Rich
          as="p"
          text={`Each payment earns interest for as long as it is in the account: the first for ${12 * y - 1} months, the last for none. Adding them all up gives $F = x\\left[\\dfrac{(1 + i)^n - 1}{i}\\right]$. Over long periods, interest becomes ${F - P > P ? '**more than** everything you paid in' : 'a bigger and bigger share'}.`}
        />
      </Note>
    </>
  );
}

function LoanMode() {
  const [P, setP] = useState(400000);
  const [r, setR] = useState(11);
  const [x, setX] = useState(5000);
  const i = r / 100 / 12;
  const interest1 = P * i;
  const cap = 40 * 12;
  const pts: [number, number][] = [[0, P / 1000]];
  let v = P;
  let t = 0;
  let paidTotal = 0;
  while (v > 0 && t < cap) {
    t++;
    v += v * i;
    const pay = Math.min(x, v);
    v -= pay;
    paidTotal += pay;
    pts.push([t / 12, v / 1000]);
  }
  const done = v <= 0.005;
  const yMax = top(Math.max(...pts.map(([, b]) => b * 1000)));
  return (
    <>
      <div className="widget-readout ag-readout" aria-live="polite">
        <span>First month's interest: <strong className="num">{rands(interest1)}</strong></span>
        {done ? (
          <>
            <span>
              Paid off in <strong className="num">{t}</strong> months ({(t / 12).toFixed(1).replace('.', ',')} years)
            </span>
            <span>
              Total interest: <strong className="num">{rands(paidTotal - P)}</strong>
            </span>
          </>
        ) : (
          <span>Not paid off in 40 years</span>
        )}
      </div>
      <Plot padLeft={36} xRange={[0, Math.max(5, Math.ceil(t / 12))]} yRange={[0, yMax]} width={400} height={300} label={done ? `A loan of ${rands(P)} at ${pc(r, 1)} with ${rands(x)} a month is paid off after ${t} months.` : `A loan of ${rands(P)} at ${pc(r, 1)} with ${rands(x)} a month is never paid off.`}>
        {(s) => <polyline points={line(pts, s)} className="plot-line plot-curve pen" />}
      </Plot>
      <p className="small">Balance owed, in thousands of rand, against years.</p>
      <div className="widget-controls">
        <Slider label="Loan" value={P} min={50000} max={1500000} step={50000} onChange={setP} format={k} />
        <Slider label="Interest rate per year" value={r} min={5} max={18} step={0.5} onChange={setR} format={(v) => pc(v, 1)} />
        <Slider label="Monthly repayment" value={x} min={500} max={25000} step={250} onChange={setX} format={rands} />
      </div>
      <Note ok={x <= interest1 ? false : null}>
        <Rich
          as="p"
          text={
            x <= interest1
              ? `The repayment doesn't even cover the first month's interest (${rands(interest1)}), so the balance never goes down. A loan only shrinks when you pay more than the interest.`
              : `At first most of each repayment is interest, so the balance falls slowly; later it falls faster. Try adding R500 to the repayment and see how many months it saves.`
          }
        />
      </Note>
    </>
  );
}

export function FinanceLab({ mode }: { mode: 'depreciation' | 'effective' | 'savings' | 'loan' }) {
  return mode === 'depreciation' ? <DepreciationMode /> : mode === 'effective' ? <EffectiveMode /> : mode === 'savings' ? <SavingsMode /> : <LoanMode />;
}
