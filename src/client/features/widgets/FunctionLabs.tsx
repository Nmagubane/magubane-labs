/** Function lab (Grades 10–12): change a, p, q (and k) and watch the graph, its asymptotes and its key points move. */
import { useState } from 'react';
import { Plot } from '../../ui/Plot.tsx';
import { Tex } from '../../ui/RichText.tsx';
import { Segmented } from '../../ui/primitives.tsx';
import { Slider } from './MathWidgets.tsx';
import { Note } from './NstLabs.tsx';
import { sample } from '../../../shared/questions/generators/math-graphs.ts';

type Fam = 'parabola' | 'hyperbola' | 'exponential';
type TF = 'sin' | 'cos' | 'tan';
const n = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1).replace('.', '{,}'));
const sh = (p: number, v = 'x') => (p === 0 ? v : `(${v} ${p > 0 ? '+' : '-'} ${n(Math.abs(p))})`);
const cs = (q: number) => (q === 0 ? '' : q > 0 ? ` + ${n(q)}` : ` - ${n(-q)}`);
const co = (a: number) => (a === 1 ? '' : a === -1 ? '-' : n(a));

function AlgebraicMode() {
  const [fam, setFam] = useState<Fam>('parabola');
  const [a, setA] = useState(1);
  const [p, setP] = useState(0);
  const [q, setQ] = useState(0);
  const f = (x: number) => (fam === 'parabola' ? a * (x + p) ** 2 + q : fam === 'hyperbola' ? a / (x + p) + q : a * 2 ** (x + p) + q);
  const tex = fam === 'parabola' ? `y = ${co(a)}${sh(p)}^2${cs(q)}` : fam === 'hyperbola' ? `y = \\dfrac{${n(a)}}{${p === 0 ? 'x' : `x ${p > 0 ? '+' : '-'} ${n(Math.abs(p))}`}}${cs(q)}` : `y = ${co(a)}${a === 1 || a === -1 ? '' : '\\cdot '}2^{${p === 0 ? 'x' : `x ${p > 0 ? '+' : '-'} ${n(Math.abs(p))}`}}${cs(q)}`;
  const facts = fam === 'parabola' ? `\\text{Turning point } (${n(-p)};\\, ${n(q)}),\\quad \\text{range } y ${a > 0 ? '\\ge' : '\\le'} ${n(q)}` : fam === 'hyperbola' ? `\\text{Asymptotes } x = ${n(-p)},\\ y = ${n(q)}` : `\\text{Asymptote } y = ${n(q)},\\quad \\text{range } y ${a > 0 ? '>' : '<'} ${n(q)}`;
  const xr: [number, number] = [-8, 8];
  const yr: [number, number] = [-8, 8];
  return (
    <>
      <div className="widget-readout ag-readout" aria-live="polite">
        <Tex tex={tex} />
        <Tex tex={facts} />
      </div>
      <Plot xRange={xr} yRange={yr} width={400} height={400} label={`Graph of ${fam} with a = ${a}, p = ${p}, q = ${q}.`}>
        {(s) => (
          <>
            {fam !== 'parabola' ? <line x1={s.x(xr[0])} x2={s.x(xr[1])} y1={s.y(q)} y2={s.y(q)} className="plot-segment dashed" /> : null}
            {fam === 'hyperbola' ? <line x1={s.x(-p)} x2={s.x(-p)} y1={s.y(yr[0])} y2={s.y(yr[1])} className="plot-segment dashed" /> : null}
            {sample(f, xr[0], xr[1], yr, 320).map((pts, i) => (
              <polyline key={i} points={pts.map(([x, y]) => `${s.x(x)},${s.y(y)}`).join(' ')} className="plot-line pen plot-curve" />
            ))}
            {fam === 'parabola' ? <circle cx={s.x(-p)} cy={s.y(q)} r={5} className="plot-point" /> : null}
          </>
        )}
      </Plot>
      <div className="widget-controls first">
        <Segmented label="Graph" value={fam} onChange={setFam} options={[{ value: 'parabola', label: 'Parabola' }, { value: 'hyperbola', label: 'Hyperbola' }, { value: 'exponential', label: 'Exponential' }]} />
      </div>
      <div className="widget-controls">
        <Slider label="a" value={a} min={-3} max={3} step={0.5} onChange={(v) => setA(v === 0 ? 0.5 : v)} format={(v) => n(v).replace('{,}', ',')} />
        <Slider label="p (left or right)" value={p} min={-4} max={4} onChange={setP} />
        <Slider label="q (up or down)" value={q} min={-4} max={4} onChange={setQ} />
      </div>
      <Note ok={null}>
        <p>q moves the graph up and down, and the horizontal asymptote with it. p moves it sideways, but the opposite way to its sign: (x + 2) moves the graph 2 to the left. The sign of a flips the graph.</p>
      </Note>
    </>
  );
}

function TrigMode() {
  const [fn, setFn] = useState<TF>('sin');
  const [a, setA] = useState(1);
  const [k, setK] = useState(1);
  const [p, setP] = useState(0);
  const [q, setQ] = useState(0);
  const g = (x: number) => {
    const ang = k * (x + p);
    if (fn === 'tan' && Math.abs((((ang % 180) + 180) % 180) - 90) < 1) return NaN;
    const r = (ang * Math.PI) / 180;
    return a * (fn === 'sin' ? Math.sin(r) : fn === 'cos' ? Math.cos(r) : Math.tan(r)) + q;
  };
  const period = (fn === 'tan' ? 180 : 360) / k;
  const inner = p === 0 ? `${k === 1 ? '' : k}x` : k === 1 ? `(x ${p > 0 ? '+' : '-'} ${Math.abs(p)}^\\circ)` : `${k}(x ${p > 0 ? '+' : '-'} ${Math.abs(p)}^\\circ)`;
  const xr: [number, number] = [-90, 360];
  const yr: [number, number] = [-5, 5];
  return (
    <>
      <div className="widget-readout ag-readout" aria-live="polite">
        <Tex tex={`y = ${co(a)}\\${fn} ${inner}${cs(q)}`} />
        <Tex tex={`\\text{Period } ${n(period)}^\\circ${fn === 'tan' ? '' : `,\\quad \\text{amplitude } ${n(Math.abs(a))}`}`} />
      </div>
      <Plot xRange={xr} yRange={yr} width={420} height={300} xStep={90} label={`Graph of y = ${a} ${fn} ${k}(x + ${p}) + ${q}. Period ${period} degrees.`}>
        {(s) => (
          <>
            <line x1={s.x(xr[0])} x2={s.x(xr[1])} y1={s.y(q)} y2={s.y(q)} className="plot-segment dashed" />
            {sample(g, xr[0], xr[1], yr, 450).map((pts, i) => (
              <polyline key={i} points={pts.map(([x, y]) => `${s.x(x)},${s.y(y)}`).join(' ')} className="plot-line pen plot-curve" />
            ))}
          </>
        )}
      </Plot>
      <div className="widget-controls first">
        <Segmented label="Function" value={fn} onChange={setFn} options={[{ value: 'sin', label: 'sin' }, { value: 'cos', label: 'cos' }, { value: 'tan', label: 'tan' }]} />
      </div>
      <div className="widget-controls">
        <Slider label="a (amplitude)" value={a} min={-3} max={3} onChange={(v) => setA(v === 0 ? 1 : v)} />
        <Slider label="k (how many waves)" value={k} min={1} max={4} onChange={setK} />
        <Slider label="p (shift, degrees)" value={p} min={-90} max={90} step={15} onChange={setP} format={(v) => `${v}°`} />
        <Slider label="q (up or down)" value={q} min={-2} max={2} onChange={setQ} />
      </div>
      <Note ok={null}>
        <p>k squashes the graph: the period becomes 360° ÷ k (180° ÷ k for tan). p shifts it the opposite way to its sign, so sin(x + 30°) moves 30° to the left. The dashed line is y = q, the middle of the wave.</p>
      </Note>
    </>
  );
}

export function FunctionLab({ mode }: { mode: 'algebraic' | 'trig' }) {
  return <div className="ag-lab">{mode === 'algebraic' ? <AlgebraicMode /> : <TrigMode />}</div>;
}
