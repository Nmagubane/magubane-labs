/** Maths labs for Grades 10–12: exponents, the discriminant, sequences, trig ratios, compound growth, tangents. */
import { useState } from 'react';
import { Segmented } from '../../ui/primitives.tsx';
import { Tex } from '../../ui/RichText.tsx';
import { Plot, makeScale, type Scale } from '../../ui/Plot.tsx';
import { Slider } from './MathWidgets.tsx';
import { sum } from '../../../shared/questions/tex.ts';
import { Note } from './NstLabs.tsx';

const tc = (v: number, dp = 2) => {
  const r = Math.round(v * 10 ** dp) / 10 ** dp;
  return `${r < 0 ? '-' : ''}${String(Math.abs(r)).replace('.', '{,}')}`;
};
const plain = (v: number, dp = 2) => {
  const r = Math.round(v * 10 ** dp) / 10 ** dp;
  return `${r < 0 ? '−' : ''}${String(Math.abs(r)).replace('.', ',')}`;
};
const f3 = (v: number) => v.toFixed(3).replace('.', '{,}');
const rands = (v: number) => `R${Math.round(v).toLocaleString('en-US').replace(/,/g, ' ')}`;
const niceStep = (span: number, n = 5) => {
  const raw = span / n;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
};

// ---------------------------------------------------------------------------
export function ExponentLadder() {
  const [b, setB] = useState(2);
  const [n, setN] = useState(-2);
  const rungs = [4, 3, 2, 1, 0, -1, -2, -3];
  const val = (e: number) => (e >= 0 ? `${b ** e}` : `\\tfrac{1}{${b ** -e}}`);
  return (
    <div className="ladder">
      <p className="widget-readout" aria-live="polite">
        <Tex tex={n >= 0 ? `${b}^{${n}} = ${b ** n}` : `${b}^{${n}} = \\dfrac{1}{${b}^{${-n}}} = \\dfrac{1}{${b ** -n}}`} />
      </p>
      <ol className="ladder-rungs">
        {rungs.map((e, i) => (
          <li key={e} className={e === n ? 'on' : ''}>
            <button type="button" onClick={() => setN(e)} aria-pressed={e === n}>
              <Tex tex={`${b}^{${e}} = ${val(e)}`} />
            </button>
            {i < rungs.length - 1 ? (
              <span className="ladder-step" aria-hidden="true">
                ÷ {b}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      <div className="widget-controls">
        <Segmented label="Base" value={String(b)} onChange={(v) => setB(Number(v))} options={['2', '3', '5', '10'].map((v) => ({ value: v, label: `Base ${v}` }))} />
      </div>
      <Note ok={null}>
        <p>
          Each step down the ladder divides by {b}. Keep going past <Tex tex={`${b}^1 = ${b}`} /> and you get <Tex tex={`${b}^0 = 1`} />, then fractions. A negative exponent means "one over", never a negative number.
        </p>
      </Note>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function DiscriminantLab() {
  const [a, setA] = useState(1);
  const [b, setB] = useState(-2);
  const [c, setC] = useState(-3);
  const A = a === 0 ? 1 : a;
  const D = b * b - 4 * A * c;
  const f = (x: number) => A * x * x + b * x + c;
  const roots = D > 0 ? [(-b - Math.sqrt(D)) / (2 * A), (-b + Math.sqrt(D)) / (2 * A)] : D === 0 ? [-b / (2 * A)] : [];
  const sq = Math.sqrt(D);
  const nature = D < 0 ? 'No real roots: the parabola never touches the x-axis.' : D === 0 ? 'Two equal real roots: the turning point sits on the x-axis.' : Number.isInteger(sq) ? 'Two real, unequal, rational roots.' : 'Two real, unequal, irrational roots.';
  const path = (s: Scale) => {
    let d = '';
    let pen = false;
    for (let x = -6; x <= 6.001; x += 0.05) {
      const y = f(x);
      if (y > 10.5 || y < -10.5) {
        pen = false;
        continue;
      }
      d += `${pen ? 'L' : 'M'}${s.x(x).toFixed(1)} ${s.y(y).toFixed(1)} `;
      pen = true;
    }
    return d;
  };
  return (
    <div className="disc">
      <p className="widget-readout" aria-live="polite">
        <Tex tex={`${sum([[A, 'x^2'], [b, 'x'], [c, '']])} = 0`} />
        <Tex tex={`\\Delta = b^2 - 4ac = (${b})^2 - 4(${A})(${c}) = ${D}`} />
      </p>
      <Plot xRange={[-6, 6]} yRange={[-10, 10]} width={400} height={340} label={`Parabola with discriminant ${D}. ${nature}`}>
        {(s) => (
          <>
            <path d={path(s)} className="plot-line" fill="none" />
            {roots.map((r) => (
              <circle key={r} cx={s.x(r)} cy={s.y(0)} r={6} className="plot-point root-point" />
            ))}
          </>
        )}
      </Plot>
      <div className="widget-controls">
        <Slider label="a" tex="a" value={A} min={-3} max={3} onChange={(v) => setA(v === 0 ? (a > 0 ? -1 : 1) : v)} />
        <Slider label="b" tex="b" value={b} min={-6} max={6} onChange={setB} />
        <Slider label="c" tex="c" value={c} min={-6} max={6} onChange={setC} />
      </div>
      <Note ok={null}>
        <p>
          {nature}{' '}
          {D >= 0 ? <Tex tex={`x = \\dfrac{${-b} \\pm \\sqrt{${D}}}{${2 * A}}${roots.length === 2 ? ` \\Rightarrow x ${roots.every((r) => Number.isInteger(Math.round(r * 1e9) / 1e9)) ? '=' : '\\approx'} ${tc(roots[0]!)} \\text{ or } ${tc(roots[1]!)}` : ` = ${tc(roots[0]!)}`}`} /> : 'You can\'t take the square root of a negative number in the real numbers.'}
        </p>
      </Note>
    </div>
  );
}

// ---------------------------------------------------------------------------
function MiniChart({ points, label, line, yName }: { points: { x: number; y: number; cls?: string }[][]; label: string; line?: boolean; yName?: (v: number) => string }) {
  const all = points.flat();
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y).concat(0);
  let y0 = Math.min(...ys);
  let y1 = Math.max(...ys);
  if (y0 === y1) y1 = y0 + 1;
  const step = niceStep(y1 - y0);
  y0 = Math.floor(y0 / step) * step;
  y1 = Math.ceil(y1 / step) * step;
  const W = 420;
  const H = 280;
  const s = makeScale([Math.min(...xs) - 0.5, Math.max(...xs) + 0.5], [y0, y1], W, H, 36);
  const ticks: number[] = [];
  for (let v = y0; v <= y1 + 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="plot" role="img" aria-label={label}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={s.x(s.xRange[0])} x2={s.x(s.xRange[1])} y1={s.y(v)} y2={s.y(v)} className={v === 0 ? 'plot-axis' : 'plot-grid'} />
          <text x={s.x(s.xRange[0]) - 4} y={s.y(v) + 4} className="plot-tick" textAnchor="end">
            {yName ? yName(v) : plain(v, 1)}
          </text>
        </g>
      ))}
      {[...new Set(xs)].map((x) => (
        <text key={x} x={s.x(x)} y={H - 12} className="plot-tick" textAnchor="middle">
          {x}
        </text>
      ))}
      {points.map((series, si) => (
        <g key={si}>
          {line ? <path d={series.map((p, i) => `${i ? 'L' : 'M'}${s.x(p.x).toFixed(1)} ${s.y(p.y).toFixed(1)}`).join(' ')} className={`plot-line ${series[0]?.cls ?? ''}`} fill="none" /> : null}
          {series.map((p) => (
            <circle key={p.x} cx={s.x(p.x)} cy={s.y(p.y)} r={line ? 3.5 : 6} className={`plot-point ${p.cls ?? ''}`} />
          ))}
        </g>
      ))}
    </svg>
  );
}

export function SequencePlotter() {
  const [kind, setKind] = useState<'arith' | 'geo'>('arith');
  const [a, setA] = useState(3);
  const [d, setD] = useState(4);
  const [r, setR] = useState(2);
  const N = 8;
  const T = (n: number) => (kind === 'arith' ? a + (n - 1) * d : a * r ** (n - 1));
  const terms = Array.from({ length: N }, (_, i) => ({ x: i + 1, y: T(i + 1) }));
  const S = terms.reduce((s, t) => s + t.y, 0);
  const formula = kind === 'arith' ? `T_n = ${a} + (n - 1)(${d})` : `T_n = ${a}\\cdot(${tc(r, 1)})^{n-1}`;
  return (
    <div className="seq">
      <div className="widget-controls first">
        <Segmented label="Type" value={kind} onChange={setKind} options={[{ value: 'arith', label: 'Arithmetic (+ d)' }, { value: 'geo', label: 'Geometric (× r)' }]} />
      </div>
      <p className="widget-readout" aria-live="polite">
        <Tex tex={formula} />
        <span className="num">{terms.map((t) => plain(t.y, 2)).join('; ')}; …</span>
      </p>
      <MiniChart points={[terms]} label={`The first ${N} terms of ${kind === 'arith' ? 'an arithmetic' : 'a geometric'} sequence`} />
      <div className="widget-controls">
        <Slider label="First term a" value={a} min={-5} max={10} onChange={setA} />
        {kind === 'arith' ? <Slider label="Common difference d" value={d} min={-5} max={5} onChange={setD} /> : <Slider label="Common ratio r" value={r} min={-2} max={3} step={0.5} onChange={setR} format={(v) => plain(v, 1)} />}
      </div>
      <Note ok={null}>
        <p>
          {kind === 'arith' ? 'Adding the same amount each time gives points on a straight line.' : r === 1 ? 'r = 1: every term is the same.' : r < 0 ? 'A negative ratio flips the sign every term: the points zigzag.' : Math.abs(r) < 1 ? 'A ratio between −1 and 1 shrinks the terms towards zero.' : 'Multiplying each time makes the terms grow faster and faster: a curve, not a line.'}{' '}
          <Tex tex={`S_{${N}} = ${tc(S)}`} />
        </p>
      </Note>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function TriangleTrig() {
  const [deg, setDeg] = useState(35);
  const [hyp, setHyp] = useState(10);
  const t = (deg * Math.PI) / 180;
  const opp = hyp * Math.sin(t);
  const adj = hyp * Math.cos(t);
  const scale = 26;
  const ox = 40;
  const oy = 300;
  const Bx = ox + adj * scale;
  const Cy = oy - opp * scale;
  return (
    <div className="trig">
      <p className="widget-readout" aria-live="polite">
        <Tex tex={`\\sin ${deg}^\\circ = \\dfrac{\\text{opp}}{\\text{hyp}} = \\dfrac{${tc(opp)}}{${hyp}} \\approx ${f3(Math.sin(t))}`} />
        <Tex tex={`\\cos ${deg}^\\circ \\approx ${f3(Math.cos(t))}`} />
        <Tex tex={`\\tan ${deg}^\\circ \\approx ${f3(Math.tan(t))}`} />
      </p>
      <svg viewBox="0 0 380 320" className="trig-svg" role="img" aria-label={`Right triangle with angle ${deg} degrees, hypotenuse ${hyp}, opposite ${plain(opp)}, adjacent ${plain(adj)}`}>
        <path d={`M ${ox} ${oy} L ${Bx} ${oy}`} className="trig-adj" />
        <path d={`M ${Bx} ${oy} L ${Bx} ${Cy}`} className="trig-opp" />
        <path d={`M ${ox} ${oy} L ${Bx} ${Cy}`} className="trig-hyp" />
        <path d={`M ${Bx - 12} ${oy} V ${oy - 12} H ${Bx}`} className="trig-right" />
        <path d={`M ${ox + 34} ${oy} A 34 34 0 0 0 ${ox + 34 * Math.cos(t)} ${oy - 34 * Math.sin(t)}`} className="trig-angle" />
        <text x={ox + 44} y={oy - 8} className="trig-label">{deg}°</text>
        <text x={(ox + Bx) / 2} y={oy + 20} textAnchor="middle" className="trig-label adj">adjacent {plain(adj)}</text>
        <text x={Bx + 8} y={(oy + Cy) / 2} className="trig-label opp">opposite {plain(opp)}</text>
        <text x={(ox + Bx) / 2 - 14} y={(oy + Cy) / 2 - 8} textAnchor="end" className="trig-label hyp">hypotenuse {hyp}</text>
      </svg>
      <div className="widget-controls">
        <Slider label="Angle" value={deg} min={10} max={80} onChange={setDeg} format={(v) => `${v}°`} />
        <Slider label="Hypotenuse" value={hyp} min={5} max={12} onChange={setHyp} />
      </div>
      <Note ok={null}>
        <p>Change the hypotenuse: the triangle grows, but the ratios stay exactly the same. That is why sin, cos and tan depend only on the angle. Opposite and adjacent are named from the angle you are using.</p>
      </Note>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function SavingsGrowth() {
  const [P, setP] = useState(10000);
  const [rate, setRate] = useState(9);
  const [years, setYears] = useState(15);
  const i = rate / 100;
  const ys = Array.from({ length: years + 1 }, (_, n) => n);
  const simple = ys.map((n) => ({ x: n, y: P * (1 + i * n), cls: 'plot-soft' }));
  const comp = ys.map((n) => ({ x: n, y: P * (1 + i) ** n, cls: 'pen' }));
  const A = comp[comp.length - 1]!.y;
  const Sm = simple[simple.length - 1]!.y;
  const every = years > 15 ? 5 : years > 8 ? 2 : 1;
  return (
    <div className="save">
      <p className="widget-readout" aria-live="polite">
        <span>
          Compound: <strong className="num">{rands(A)}</strong>
        </span>
        <span>
          Simple: <strong className="num">{rands(Sm)}</strong>
        </span>
        <span className="muted">Difference {rands(A - Sm)}</span>
      </p>
      <MiniChart
        line
        points={[simple.filter((p) => p.x % every === 0 || p.x === years), comp.filter((p) => p.x % every === 0 || p.x === years)]}
        label={`R${P} at ${rate}% for ${years} years: compound grows to ${rands(A)}, simple to ${rands(Sm)}`}
        yName={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
      />
      <p className="small">
        <span className="legend-swatch soft" /> simple interest <span className="legend-swatch" /> compound interest (years along the bottom)
      </p>
      <div className="widget-controls">
        <Slider label="Amount invested" value={P} min={1000} max={50000} step={1000} onChange={setP} format={rands} />
        <Slider label="Interest rate" value={rate} min={1} max={15} onChange={setRate} format={(v) => `${v}%`} />
        <Slider label="Years" value={years} min={1} max={30} onChange={setYears} />
      </div>
      <Note ok={null}>
        <p>
          <Tex tex={`A = P(1 + i)^n = ${P}(1 + ${tc(i, 2)})^{${years}}`} />. Simple interest adds the same amount every year (a straight line). Compound interest earns interest on the interest, so the gap keeps widening.
        </p>
      </Note>
    </div>
  );
}

// ---------------------------------------------------------------------------
const FUNCS = {
  sq: { label: 'x²', tex: 'f(x) = x^2', dtex: "f'(x) = 2x", f: (x: number) => x * x, d: (x: number) => 2 * x, y: [-3, 10] as [number, number] },
  cubic: { label: 'x³ − 3x', tex: 'f(x) = x^3 - 3x', dtex: "f'(x) = 3x^2 - 3", f: (x: number) => x ** 3 - 3 * x, d: (x: number) => 3 * x * x - 3, y: [-6, 6] as [number, number] },
  hill: { label: '−x² + 4x', tex: 'f(x) = -x^2 + 4x', dtex: "f'(x) = -2x + 4", f: (x: number) => -x * x + 4 * x, d: (x: number) => -2 * x + 4, y: [-6, 6] as [number, number] },
};
type FKey = keyof typeof FUNCS;

export function TangentLab() {
  const [fk, setFk] = useState<FKey>('cubic');
  const [x0, setX0] = useState(1.5);
  const F = FUNCS[fk];
  const y0 = F.f(x0);
  const m = F.d(x0);
  const c = y0 - m * x0;
  return (
    <div className="tan">
      <div className="widget-controls first">
        <Segmented label="Function" value={fk} onChange={(v) => (setFk(v), setX0(v === 'hill' ? 1 : 1.5))} options={(Object.keys(FUNCS) as FKey[]).map((k) => ({ value: k, label: FUNCS[k].label }))} />
      </div>
      <p className="widget-readout" aria-live="polite">
        <Tex tex={`${F.tex},\\; ${F.dtex}`} />
        <Tex tex={`m = f'(${tc(x0, 1)}) = ${tc(m)}`} />
      </p>
      <Plot xRange={[-4, 4]} yRange={F.y} width={400} height={340} label={`Tangent to ${F.label} at x = ${plain(x0, 1)} with gradient ${plain(m)}`}>
        {(s) => {
          let d = '';
          let pen = false;
          for (let x = -4; x <= 4.001; x += 0.04) {
            const y = F.f(x);
            if (y < F.y[0] || y > F.y[1]) {
              pen = false;
              continue;
            }
            d += `${pen ? 'L' : 'M'}${s.x(x).toFixed(1)} ${s.y(y).toFixed(1)} `;
            pen = true;
          }
          // Clip y = mx + c to the visible rectangle.
          const [lo, hi] = F.y;
          const ends = [-4, 4].map((x) => {
            const y = m * x + c;
            if (y > hi) return [(hi - c) / m, hi] as const;
            if (y < lo) return [(lo - c) / m, lo] as const;
            return [x, y] as const;
          });
          const [[ax, ay], [bx, by]] = ends as [readonly [number, number], readonly [number, number]];
          return (
            <>
              <path d={d} className="plot-line" fill="none" />
              <path d={`M ${s.x(ax)} ${s.y(ay)} L ${s.x(bx)} ${s.y(by)}`} className="plot-line-soft tangent-line" />
              <circle cx={s.x(x0)} cy={s.y(y0)} r={6} className="plot-point" />
            </>
          );
        }}
      </Plot>
      <div className="widget-controls">
        <Slider label="x" tex="x" value={x0} min={-3} max={3} step={0.1} onChange={setX0} format={(v) => plain(v, 1)} />
      </div>
      <Note ok={Math.abs(m) < 0.05 ? true : null}>
        <p>
          {Math.abs(m) < 0.05
            ? 'Gradient 0: the tangent is flat. This is a stationary (turning) point.'
            : m > 0
              ? 'Positive gradient: the curve is going up here.'
              : 'Negative gradient: the curve is going down here.'}{' '}
          The derivative gives the gradient of the tangent at every point. Find where it is zero to find the turning points.
        </p>
      </Note>
    </div>
  );
}
