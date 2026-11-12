/**
 * Calculus labs (Grade 12):
 * - secant: a secant through (a; f(a)) and (a + h; f(a + h)) turns into the tangent as h shrinks (first principles);
 * - cubic: change a, b, c and d and watch f and f′ together: turning points where f′ = 0, inflection where f′ turns;
 * - box: cut squares from a sheet and watch the volume rise and fall (optimisation).
 */
import { useState } from 'react';
import { Plot, type Scale } from '../../ui/Plot.tsx';
import { Tex, Rich } from '../../ui/RichText.tsx';
import { Slider } from './MathWidgets.tsx';
import { Note } from './NstLabs.tsx';
import { sample } from '../../../shared/questions/generators/math-graphs.ts';
import { boxVolume } from '../../../shared/questions/generators/math-calculus.ts';

/** Number for TeX: 2, -1,5 */
const n = (v: number, dp = 2) => {
  const r = Math.round(v * 10 ** dp) / 10 ** dp;
  return (Object.is(r, -0) ? 0 : r).toString().replace('.', '{,}');
};
/** Number for plain text: 2, -1,5 */
const t = (v: number, dp = 2) => n(v, dp).replace('{,}', ',');
/** Polynomial TeX from [coefficient, power] pairs, highest power first. */
function poly(terms: [number, number][]): string {
  let out = '';
  for (const [c, e] of terms) {
    if (c === 0) continue;
    const abs = Math.abs(c);
    const v = e === 0 ? '' : e === 1 ? 'x' : `x^{${e}}`;
    const body = e !== 0 && abs === 1 ? v : `${n(abs)}${v}`;
    out += out === '' ? (c < 0 ? `-${body}` : body) : c < 0 ? ` - ${body}` : ` + ${body}`;
  }
  return out || '0';
}
function Curve({ s, f, xr, yr, className }: { s: Scale; f: (x: number) => number; xr: [number, number]; yr: [number, number]; className: string }) {
  return (
    <>
      {sample(f, xr[0], xr[1], yr, 320).map((pts, i) => (
        <polyline key={i} points={pts.map(([x, y]) => `${s.x(x)},${s.y(y)}`).join(' ')} className={`plot-curve ${className}`} />
      ))}
    </>
  );
}

function SecantMode() {
  const [a, setA] = useState(1);
  const [h, setH] = useState(2);
  const f = (x: number) => x * x;
  const xr: [number, number] = [-4, 4];
  const yr: [number, number] = [-2, 12];
  const m = (f(a + h) - f(a)) / h;
  const c = f(a) - m * a;
  return (
    <>
      <div className="widget-readout ag-readout" aria-live="polite">
        <Tex tex={`f(x) = x^2`} />
        <Tex tex={`\\dfrac{f(${n(a, 1)} + h) - f(${n(a, 1)})}{h} = ${n(2 * a, 1)} + h = ${n(m)}`} />
      </div>
      <Plot xRange={xr} yRange={yr} width={400} height={360} label={`Parabola y = x squared with a secant from x = ${t(a, 1)} to x = ${t(a + h)}. Its gradient is ${t(m)}.`}>
        {(s) => (
          <>
            <Curve s={s} f={f} xr={xr} yr={yr} className="plot-line" />
            <Curve s={s} f={(x) => m * x + c} xr={xr} yr={yr} className="plot-line pen" />
            <circle cx={s.x(a)} cy={s.y(f(a))} r={6} className="plot-point" />
            <circle cx={s.x(a + h)} cy={s.y(f(a + h))} r={5} className="plot-point pen" />
          </>
        )}
      </Plot>
      <div className="widget-controls">
        <Slider label="a" tex="a" value={a} min={-2} max={2} step={0.5} onChange={setA} format={(v) => t(v, 1)} />
        <Slider label="h" tex="h" value={h} min={0.01} max={3} step={0.01} onChange={setH} format={(v) => t(v)} />
      </div>
      <Note ok={h <= 0.05 ? true : null}>
        <Rich as="p" text={`The secant joins two points on the curve, a distance $h$ apart. Its gradient is $${n(2 * a, 1)} + h$. As $h \\to 0$ the second point slides onto the first, the secant becomes the tangent, and its gradient becomes $${n(2 * a, 1)}$: that is $f'(${n(a, 1)})$.`} />
      </Note>
    </>
  );
}

function CubicMode() {
  const [a, setA] = useState(1);
  const [b, setB] = useState(-3);
  const [c, setC] = useState(-1);
  const [d, setD] = useState(3);
  const f = (x: number) => a * x ** 3 + b * x * x + c * x + d;
  const fd = (x: number) => 3 * a * x * x + 2 * b * x + c;
  const disc = 4 * b * b - 12 * a * c;
  const turns = disc > 0 ? [(-2 * b - Math.sqrt(disc)) / (6 * a), (-2 * b + Math.sqrt(disc)) / (6 * a)].sort((u, v) => u - v) : [];
  const xi = -b / (3 * a);
  const xr: [number, number] = [-5, 5];
  const yr: [number, number] = [-15, 15];
  const kind = (x: number) => (6 * a * x + 2 * b < 0 ? 'max' : 'min');
  return (
    <>
      <div className="widget-readout ag-readout" aria-live="polite">
        <Tex tex={`f(x) = ${poly([[a, 3], [b, 2], [c, 1], [d, 0]])}`} />
        <Tex tex={`f'(x) = ${poly([[3 * a, 2], [2 * b, 1], [c, 0]])}`} />
        <Tex
          tex={
            turns.length
              ? `\\text{Turning points } ${turns.map((x) => `(${n(x)};\\, ${n(f(x))})\\ \\text{${kind(x)}}`).join(',\\ ')}`
              : `\\text{No turning points: } f'(x) = 0 \\text{ has ${disc === 0 ? 'one (repeated)' : 'no real'} root${disc === 0 ? '' : 's'}}`
          }
        />
        <Tex tex={`\\text{Point of inflection } x = -\\tfrac{b}{3a} = ${n(xi)}`} />
      </div>
      <Plot xRange={xr} yRange={yr} width={400} height={400} label={`Cubic f and its derivative f prime. ${turns.length ? `Turning points at x = ${turns.map((x) => t(x)).join(' and ')}.` : 'No turning points.'}`}>
        {(s) => (
          <>
            <Curve s={s} f={fd} xr={xr} yr={yr} className="plot-line pen deriv" />
            <Curve s={s} f={f} xr={xr} yr={yr} className="plot-line" />
            {turns.map((x) => (
              <g key={x}>
                <line x1={s.x(x)} x2={s.x(x)} y1={s.y(f(x))} y2={s.y(0)} className="plot-segment dashed" />
                <circle cx={s.x(x)} cy={s.y(f(x))} r={5} className="plot-point" />
                <circle cx={s.x(x)} cy={s.y(0)} r={4} className="plot-point pen" />
              </g>
            ))}
            {f(xi) >= yr[0] && f(xi) <= yr[1] ? <circle cx={s.x(xi)} cy={s.y(f(xi))} r={5} className="plot-hollow" /> : null}
          </>
        )}
      </Plot>
      <p className="lab-legend">
        <span className="key-f">f(x)</span> <span className="key-d">f′(x), dashed</span> <span className="key-i">○ point of inflection</span>
      </p>
      <div className="widget-controls">
        <Slider label="a" tex="a" value={a} min={-2} max={2} step={0.5} onChange={(v) => setA(v === 0 ? 0.5 : v)} format={(v) => t(v, 1)} />
        <Slider label="b" tex="b" value={b} min={-6} max={6} onChange={setB} />
        <Slider label="c" tex="c" value={c} min={-9} max={9} onChange={setC} />
        <Slider label="d" tex="d" value={d} min={-9} max={9} onChange={setD} />
      </div>
      <Note ok={null}>
        <Rich as="p" text="Where $f$ has a turning point, the dashed graph of $f'$ crosses the x-axis. Where $f$ is going up, $f'$ is above the axis. The point of inflection is exactly where $f'$ turns, halfway between the turning points. Change $c$ until the turning points disappear: then $f'(x) = 0$ has no real roots." />
      </Note>
    </>
  );
}

const L = 16;
const W = 10;
function BoxMode() {
  const [x, setX] = useState(1);
  const V = boxVolume(L, W, x);
  const best = 2;
  const near = Math.abs(x - best) < 0.05;
  // The y-axis sits a little in from the left so its three-digit labels fit.
  const xr: [number, number] = [-0.8, 5];
  const yr: [number, number] = [0, 160];
  const k = 12; // drawing units per cm
  return (
    <>
      <div className="widget-readout ag-readout" aria-live="polite">
        <Tex tex={`V(x) = x(${L} - 2x)(${W} - 2x)`} />
        <Tex tex={`V(${n(x, 1)}) = ${n(x, 1)} \\times ${n(L - 2 * x, 1)} \\times ${n(W - 2 * x, 1)} = ${n(V, 1)}\\ \\text{cm}^3`} />
      </div>
      <div className="calc-box">
        <svg viewBox={`-4 -4 ${L * k + 8} ${W * k + 8}`} className="box-net" role="img" aria-label={`A ${L} by ${W} centimetre sheet with a ${t(x, 1)} centimetre square cut from each corner.`}>
          <rect x={0} y={0} width={L * k} height={W * k} className="box-sheet" />
          {[
            [0, 0],
            [L - x, 0],
            [0, W - x],
            [L - x, W - x],
          ].map(([cx, cy]) => (
            <rect key={`${cx}-${cy}`} x={cx! * k} y={cy! * k} width={x * k} height={x * k} className="box-cut" />
          ))}
          <rect x={x * k} y={x * k} width={(L - 2 * x) * k} height={(W - 2 * x) * k} className="box-fold" />
          <text x={(L * k) / 2} y={(W * k) / 2} className="box-text" textAnchor="middle" dominantBaseline="middle">
            base {t(L - 2 * x, 1)} × {t(W - 2 * x, 1)}
          </text>
        </svg>
        <Plot xRange={xr} yRange={yr} width={320} height={260} label={`Volume against x. At x = ${t(x, 1)} the volume is ${t(V, 1)} cubic centimetres.`}>
          {(s) => (
            <>
              <Curve s={s} f={(u) => boxVolume(L, W, u)} xr={[0, 5]} yr={yr} className="plot-line" />
              <circle cx={s.x(x)} cy={s.y(V)} r={6} className="plot-point pen" />
            </>
          )}
        </Plot>
      </div>
      <div className="widget-controls">
        <Slider label="Cut x (cm)" value={x} min={0} max={5} step={0.1} onChange={setX} format={(v) => `${t(v, 1)} cm`} />
      </div>
      <Note ok={near ? true : null}>
        <p>
          {near
            ? `Largest volume: ${t(boxVolume(L, W, best), 1)} cm³ at x = ${best} cm. Here the graph is flat: V′(x) = 0.`
            : 'Small cuts make a shallow box; big cuts leave almost no base. Somewhere in between the volume is largest, and there the graph has a flat tangent.'}
        </p>
      </Note>
    </>
  );
}

export function CalculusLab({ mode }: { mode: 'secant' | 'cubic' | 'box' }) {
  return mode === 'secant' ? <SecantMode /> : mode === 'cubic' ? <CubicMode /> : <BoxMode />;
}
