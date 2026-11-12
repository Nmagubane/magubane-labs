/** Trigonometry labs (Grades 10–12): the ratios on the Cartesian plane, and the sine and cosine rules. */
import { useState } from 'react';
import { Plot } from '../../ui/Plot.tsx';
import { Tex } from '../../ui/RichText.tsx';
import { Slider } from './MathWidgets.tsx';
import { Note } from './NstLabs.tsx';

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const c = (v: number, dp = 2) => (Math.abs(v) < 5e-4 ? '0' : v.toFixed(dp).replace('.', ','));
const t = (v: number, dp = 2) => c(v, dp).replace(',', '{,}');

function CircleMode() {
  const [th, setTh] = useState(150);
  const r = 5;
  const x = r * Math.cos(rad(th));
  const y = r * Math.sin(rad(th));
  const q = th % 90 === 0 ? 0 : Math.floor(th / 90) + 1;
  const ref = th <= 90 ? th : th <= 180 ? 180 - th : th <= 270 ? th - 180 : 360 - th;
  const refFrom = th <= 90 || th >= 270 ? 0 : 180;
  const tanUndef = Math.abs(Math.cos(rad(th))) < 1e-9;
  const LET = [
    { q: 1, l: 'A', tip: 'All', x: 3.6, y: 4.3 },
    { q: 2, l: 'S', tip: 'Sin', x: -4.4, y: 4.3 },
    { q: 3, l: 'T', tip: 'Tan', x: -4.4, y: -4.9 },
    { q: 4, l: 'C', tip: 'Cos', x: 3.6, y: -4.9 },
  ];
  return (
    <>
      <div className="widget-readout ag-readout" aria-live="polite">
        <Tex tex={`\\sin ${th}^\\circ = \\tfrac{y}{r} = ${t(y / r, 3)}`} />
        <Tex tex={`\\cos ${th}^\\circ = \\tfrac{x}{r} = ${t(x / r, 3)}`} />
        <Tex tex={`\\tan ${th}^\\circ = ${tanUndef ? '\\text{undefined}' : `\\tfrac{y}{x} = ${t(y / x, 3)}`}`} />
        <span className="muted ag-full">

          {q === 0 ? 'On an axis.' : `Quadrant ${q}, reference angle ${ref}°: each ratio is ± the ratio of ${ref}°, with the sign from x and y.`}
        </span>
      </div>
      <Plot xRange={[-6, 6]} yRange={[-6, 6]} width={400} height={400} label={`Angle ${th} degrees. P is at (${c(x, 1)}, ${c(y, 1)}) with r = 5. ${q === 0 ? '' : `Quadrant ${q}; reference angle ${ref} degrees.`}`}>
        {(s) => {
          const ox = s.x(0);
          const oy = s.y(0);
          const k = s.x(1) - s.x(0);
          const arc = (from: number, to: number, rr: number, cls: string) => {
            const a1 = rad(from);
            const a2 = rad(to);
            const large = Math.abs(to - from) > 180 ? 1 : 0;
            const sweep = to > from ? 0 : 1;
            return <path d={`M ${ox + rr * Math.cos(a1)} ${oy - rr * Math.sin(a1)} A ${rr} ${rr} 0 ${large} ${sweep} ${ox + rr * Math.cos(a2)} ${oy - rr * Math.sin(a2)}`} className={cls} />;
          };
          return (
            <>
              {LET.map((L) => (
                <text key={L.l} x={s.x(L.x)} y={s.y(L.y)} className={`trig-cast${q === L.q ? ' on' : ''}`}>
                  {L.l} <tspan className="trig-cast-tip">{L.tip}</tspan>
                </text>
              ))}
              <ellipse cx={ox} cy={oy} rx={5 * k} ry={5 * k} className="trig-unit" />
              <line x1={s.x(x)} y1={s.y(y)} x2={s.x(x)} y2={oy} className="plot-segment dashed" />
              <line x1={ox} y1={oy} x2={s.x(x)} y2={s.y(y)} className="plot-line pen" />
              {th > 0 ? arc(0, th, 22, 'geo-arc') : null}
              {q > 1 ? arc(refFrom === 0 ? 360 : 180, th, 42, 'trig-ref') : null}
              <circle cx={s.x(x)} cy={s.y(y)} r={6} className="plot-point pen" />
              <text x={Math.max(48, Math.min(352, s.x(x)))} y={s.y(y) + (y >= 0 ? -14 : 22)} textAnchor="middle" className="plot-point-label">
                P({c(x, 1)}; {c(y, 1)})
              </text>
              <text x={ox + 28} y={oy - 8} className="geo-angle">
                θ
              </text>
            </>
          );
        }}
      </Plot>
      <div className="widget-controls">
        <Slider label="Angle θ" value={th} min={0} max={360} onChange={setTh} format={(v) => `${v}°`} />
      </div>
      <Note ok={null}>
        <p>r is always 5 here, so the signs come only from x and y. The dashed arc is the reference angle to the x-axis: the ratio has the same size as for that acute angle. CAST says which ratios are positive in each quadrant.</p>
      </Note>
    </>
  );
}

function TriangleMode() {
  const [b, setB] = useState(7);
  const [cc, setC] = useState(9);
  const [A, setA] = useState(55);
  const a = Math.sqrt(b * b + cc * cc - 2 * b * cc * Math.cos(rad(A)));
  const B = deg(Math.acos((a * a + cc * cc - b * b) / (2 * a * cc)));
  const C = 180 - A - B;
  const area = 0.5 * b * cc * Math.sin(rad(A));
  const pts = { A: [0, 0], B: [cc, 0], C: [b * Math.cos(rad(A)), b * Math.sin(rad(A))] } as const;
  const xs = [0, cc, pts.C[0]];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const W = 360;
  const H = 230;
  const k = Math.min((W - 60) / (maxX - minX), (H - 60) / Math.max(1, pts.C[1]));
  const P = (p: readonly [number, number]) => [30 + (p[0] - minX) * k, H - 30 - p[1] * k] as const;
  const [PA, PB, PC] = [P(pts.A), P(pts.B), P(pts.C)];
  return (
    <>
      <div className="widget-readout ag-readout" aria-live="polite">
        <Tex tex={`\\tfrac{a}{\\sin A} = ${t(a / Math.sin(rad(A)))}`} />
        <Tex tex={`\\tfrac{b}{\\sin B} = ${t(b / Math.sin(rad(B)))}`} />
        <Tex tex={`\\tfrac{c}{\\sin C} = ${t(cc / Math.sin(rad(C)))}`} />
        <Tex tex={`a^2 = b^2 + c^2 - 2bc\\cos A = ${t(a * a)}`} />
        <Tex tex={`\\text{Area} = \\tfrac{1}{2}bc\\sin A = ${t(area)}`} />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="geo" role="img" aria-label={`Triangle with b = ${b}, c = ${cc} and angle A = ${A} degrees. a is ${c(a)}, angle B is ${c(B, 1)} degrees, angle C is ${c(C, 1)} degrees.`}>
        <polygon points={[PA, PB, PC].map((p) => p.join(',')).join(' ')} className="geo-fill" />
        <text x={PA[0] - 8} y={PA[1] + 16} className="geo-label">A</text>
        <text x={PB[0] + 4} y={PB[1] + 16} className="geo-label">B</text>
        <text x={PC[0]} y={PC[1] - 8} textAnchor="middle" className="geo-label">C</text>
        <text x={(PA[0] + PB[0]) / 2} y={PA[1] + 18} textAnchor="middle" className="geo-side">c = {cc}</text>
        <text x={(PA[0] + PC[0]) / 2 - 10} y={(PA[1] + PC[1]) / 2} textAnchor="end" className="geo-side">b = {b}</text>
        <text x={(PB[0] + PC[0]) / 2 + 10} y={(PB[1] + PC[1]) / 2} className="geo-side">a = {c(a)}</text>
        <text x={PA[0] + 30} y={PA[1] - 8} className="geo-angle">{A}°</text>
        <text x={PB[0] - 44} y={PB[1] - 8} className="geo-angle">{c(B, 1)}°</text>
      </svg>
      <div className="widget-controls">
        <Slider label="Side b" value={b} min={3} max={12} onChange={setB} />
        <Slider label="Side c" value={cc} min={3} max={12} onChange={setC} />
        <Slider label="Angle A" value={A} min={15} max={160} onChange={setA} format={(v) => `${v}°`} />
      </div>
      <Note ok={null}>
        <p>However you change the triangle, the three ratios side ÷ sine of the opposite angle stay equal: that is the sine rule. Make A = 90° and the cosine rule becomes Pythagoras, because cos 90° = 0.</p>
      </Note>
    </>
  );
}

export function TrigLab({ mode }: { mode: 'circle' | 'triangle' }) {
  return <div className="ag-lab">{mode === 'circle' ? <CircleMode /> : <TriangleMode />}</div>;
}
