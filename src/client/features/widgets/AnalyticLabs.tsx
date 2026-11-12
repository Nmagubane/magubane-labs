/** Analytical geometry labs (Grades 10–12): drag points on the Cartesian plane and watch the formulas respond. */
import { useState } from 'react';
import { Plot, type Scale } from '../../ui/Plot.tsx';
import { Tex } from '../../ui/RichText.tsx';
import { Segmented } from '../../ui/primitives.tsx';
import { rat, ratTex } from '../../../shared/questions/rational.ts';
import { Draggable, Slider } from './MathWidgets.tsx';
import { Note } from './NstLabs.tsx';

type Pt = [number, number];
const par = (v: number) => (v < 0 ? `(${v})` : `${v}`);
const c1 = (v: number, dp = 1) => v.toFixed(dp).replace('.', ',').replace(/,0+$/, '');
/** The same number for TeX: {,} keeps a decimal comma from turning into punctuation spacing. */
const t1 = (v: number, dp = 1) => c1(v, dp).replace(',', '{,}');
const deg = (r: number) => (r * 180) / Math.PI;
const incl = (m: number) => {
  const t = deg(Math.atan(m));
  return t < 0 ? t + 180 : t;
};
const gradTex = (rise: number, run: number) => (run === 0 ? '\\text{undefined}' : ratTex(rat(rise, run)));

/** A full-width line through (x0; y0) with gradient m (null = vertical). */
function FullLine({ s, x0, y0, m, className }: { s: Scale; x0: number; y0: number; m: number | null; className: string }) {
  if (m === null) return <line x1={s.x(x0)} x2={s.x(x0)} y1={s.y(s.yRange[0])} y2={s.y(s.yRange[1])} className={className} />;
  const [a, b] = s.xRange;
  return <line x1={s.x(a)} y1={s.y(y0 + m * (a - x0))} x2={s.x(b)} y2={s.y(y0 + m * (b - x0))} className={className} />;
}

function PointsMode() {
  const [A, setA] = useState<Pt>([-3, -2]);
  const [B, setB] = useState<Pt>([5, 4]);
  const dx = B[0] - A[0];
  const dy = B[1] - A[1];
  const d2 = dx * dx + dy * dy;
  const d = Math.sqrt(d2);
  const M = rat(A[0] + B[0], 2);
  const N = rat(A[1] + B[1], 2);
  return (
    <>
      <div className="widget-readout ag-readout" aria-live="polite">
        <Tex tex={`AB = \\sqrt{(${dx})^2 + (${dy})^2} = \\sqrt{${d2}}${Number.isInteger(d) ? ` = ${d}` : ` \\approx ${t1(d, 2)}`}`} />
        <Tex tex={`M\\left(${ratTex(M)};\\, ${ratTex(N)}\\right) \\qquad m_{AB} = ${gradTex(dy, dx)}`} />
      </div>
      <Plot xRange={[-6, 8]} yRange={[-5, 9]} width={420} height={400} label={`A at (${A[0]}, ${A[1]}), B at (${B[0]}, ${B[1]}). AB is about ${c1(d, 2)} units; the midpoint M is at (${c1(M.n / M.d)}, ${c1(N.n / N.d)}).`}>
        {(s) => (
          <>
            <line x1={s.x(A[0])} y1={s.y(A[1])} x2={s.x(B[0])} y2={s.y(A[1])} className="plot-segment dashed" />
            <line x1={s.x(B[0])} y1={s.y(A[1])} x2={s.x(B[0])} y2={s.y(B[1])} className="plot-segment dashed" />
            <text x={(s.x(A[0]) + s.x(B[0])) / 2} y={s.y(A[1]) + (dy >= 0 ? 16 : -8)} textAnchor="middle" className="ag-run">
              {dx}
            </text>
            <text x={s.x(B[0]) + (dx >= 0 ? 8 : -8)} y={(s.y(A[1]) + s.y(B[1])) / 2} textAnchor={dx >= 0 ? 'start' : 'end'} className="ag-run">
              {dy}
            </text>
            <line x1={s.x(A[0])} y1={s.y(A[1])} x2={s.x(B[0])} y2={s.y(B[1])} className="plot-segment" />
            <circle cx={s.x(M.n / M.d)} cy={s.y(N.n / N.d)} r={5} className="plot-point pen" />
            <text x={s.x(M.n / M.d) - 10} y={s.y(N.n / N.d) + 4} textAnchor="end" className="plot-point-label">
              M
            </text>
            <Draggable s={s} x={A[0]} y={A[1]} label="A" onMove={(x, y) => setA([x, y])} />
            <Draggable s={s} x={B[0]} y={B[1]} label="B" onMove={(x, y) => setB([x, y])} />
          </>
        )}
      </Plot>
      <Note ok={null}>
        <p>The dashed sides are the changes in x and y. AB is the hypotenuse, so AB² = (change in x)² + (change in y)². M averages the coordinates of A and B.</p>
      </Note>
    </>
  );
}

function LinesMode() {
  const [A, setA] = useState<Pt>([-4, -3]);
  const [B, setB] = useState<Pt>([2, 1]);
  const [P, setP] = useState<Pt>([3, 6]);
  const [rel, setRel] = useState<'par' | 'perp'>('perp');
  const run = B[0] - A[0];
  const rise = B[1] - A[1];
  const m1 = run === 0 ? null : rise / run;
  const m2 = rel === 'par' ? m1 : m1 === null ? 0 : m1 === 0 ? null : -1 / m1;
  const m1Tex = gradTex(rise, run);
  const m2Tex = rel === 'par' ? m1Tex : run === 0 ? '0' : rise === 0 ? '\\text{undefined}' : ratTex(rat(-run, rise));
  const th1 = m1 === null ? 90 : incl(m1);
  return (
    <>
      <div className="widget-readout ag-readout" aria-live="polite">
        <Tex tex={`m_1 = ${m1Tex} \\qquad m_2 = ${m2Tex}${rel === 'perp' && m1 !== null && m1 !== 0 ? ` \\qquad m_1 \\times m_2 = -1` : ''}`} />
        <Tex tex={`\\theta_1 = ${t1(th1)}^\\circ \\quad (\\tan\\theta = m)`} />
      </div>
      <Plot xRange={[-7, 7]} yRange={[-6, 8]} width={420} height={420} label={`Line 1 through A and B has gradient ${m1 === null ? 'undefined' : c1(m1, 2)} and inclination ${c1(th1)} degrees. Line 2 through P is ${rel === 'par' ? 'parallel' : 'perpendicular'} to it.`}>
        {(s) => {
          const xCross = m1 === null ? A[0] : m1 === 0 ? null : A[0] - A[1] / m1;
          const showArc = xCross !== null && xCross > s.xRange[0] + 1 && xCross < s.xRange[1] - 1;
          const r = 26;
          const ang = (th1 * Math.PI) / 180;
          return (
            <>
              <FullLine s={s} x0={A[0]} y0={A[1]} m={m1} className="plot-line" />
              <FullLine s={s} x0={P[0]} y0={P[1]} m={m2} className="plot-line pen" />
              {showArc && xCross !== null ? (
                <g>
                  <path d={`M ${s.x(xCross) + r} ${s.y(0)} A ${r} ${r} 0 ${th1 > 180 ? 1 : 0} 0 ${s.x(xCross) + r * Math.cos(ang)} ${s.y(0) - r * Math.sin(ang)}`} className="geo-arc" />
                  <text x={s.x(xCross) + (r + 12) * Math.cos(ang / 2)} y={s.y(0) - (r + 12) * Math.sin(ang / 2) + 4} className="geo-angle">
                    θ
                  </text>
                </g>
              ) : null}
              <Draggable s={s} x={A[0]} y={A[1]} label="A" onMove={(x, y) => setA([x, y])} />
              <Draggable s={s} x={B[0]} y={B[1]} label="B" onMove={(x, y) => setB([x, y])} />
              <Draggable s={s} x={P[0]} y={P[1]} label="P" onMove={(x, y) => setP([x, y])} />
            </>
          );
        }}
      </Plot>
      <div className="widget-controls first">
        <Segmented label="Line through P" value={rel} onChange={setRel} options={[{ value: 'par', label: 'Parallel' }, { value: 'perp', label: 'Perpendicular' }]} />
      </div>
      <Note ok={null}>
        <p>{rel === 'par' ? 'Parallel lines have equal gradients, so they also have equal inclinations.' : 'Turn a line through 90° and its gradient flips and changes sign: m₁ × m₂ = −1.'} θ is measured anticlockwise from the positive x-axis, so a negative gradient gives an obtuse θ.</p>
      </Note>
    </>
  );
}

function CircleMode() {
  const [C, setC] = useState<Pt>([1, 1]);
  const [r, setR] = useState(5);
  const [t, setT] = useState(53);
  const [u, v] = [r * Math.cos((t * Math.PI) / 180), r * Math.sin((t * Math.PI) / 180)];
  const px = C[0] + u;
  const py = C[1] + v;
  const mr = Math.abs(u) < 1e-9 ? null : v / u;
  const mt = Math.abs(v) < 1e-9 ? null : -u / v;
  const sq = (n: string, a: number) => (a === 0 ? `${n}^2` : `(${n} ${a > 0 ? '-' : '+'} ${Math.abs(a)})^2`);
  return (
    <>
      <div className="widget-readout ag-readout" aria-live="polite">
        <Tex tex={`${sq('x', C[0])} + ${sq('y', C[1])} = ${r * r}`} />
        <Tex tex={`m_{CP} = ${mr === null ? '\\text{undefined}' : t1(mr, 2)} \\qquad m_{\\text{tangent}} = ${mt === null ? '\\text{undefined}' : t1(mt, 2)}`} />
      </div>
      <Plot xRange={[-9, 9]} yRange={[-9, 9]} width={420} height={420} label={`Circle with centre (${C[0]}, ${C[1]}) and radius ${r}. P is on the circle; the tangent at P is perpendicular to the radius CP.`}>
        {(s) => (
          <>
            <ellipse cx={s.x(C[0])} cy={s.y(C[1])} rx={s.x(C[0] + r) - s.x(C[0])} ry={s.y(C[1]) - s.y(C[1] + r)} className="plot-circle" />
            <line x1={s.x(C[0])} y1={s.y(C[1])} x2={s.x(px)} y2={s.y(py)} className="plot-segment dashed" />
            <FullLine s={s} x0={px} y0={py} m={mt} className="plot-line pen" />
            <circle cx={s.x(px)} cy={s.y(py)} r={5} className="plot-point pen" />
            <text x={s.x(px) + (u >= 0 ? 10 : -10)} y={s.y(py) - 8} textAnchor={u >= 0 ? 'start' : 'end'} className="plot-point-label">
              P
            </text>
            <Draggable s={s} x={C[0]} y={C[1]} label="C" onMove={(x, y) => setC([x, y])} />
          </>
        )}
      </Plot>
      <div className="widget-controls">
        <Slider label="Radius" value={r} min={1} max={6} onChange={setR} />
        <Slider label="Move P round the circle" value={t} min={0} max={359} onChange={setT} format={(x) => `${x}°`} />
      </div>
      <Note ok={null}>
        <p>Drag the centre C: the numbers in the brackets change sign from the centre's coordinates. The tangent at P is always perpendicular to the radius CP, so their gradients multiply to −1.</p>
      </Note>
    </>
  );
}

export function CoordLab({ mode }: { mode: 'points' | 'lines' | 'circle' }) {
  return <div className="ag-lab">{mode === 'points' ? <PointsMode /> : mode === 'lines' ? <LinesMode /> : <CircleMode />}</div>;
}
