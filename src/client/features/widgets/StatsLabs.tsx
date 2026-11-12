/** Statistics labs (Grades 10–12): move data and watch the summary statistics, box plot and regression line respond. */
import { useState } from 'react';
import { Plot } from '../../ui/Plot.tsx';
import { Tex } from '../../ui/RichText.tsx';
import { Draggable } from './MathWidgets.tsx';
import { Note } from './NstLabs.tsx';

const t = (v: number, dp = 2) => v.toFixed(dp).replace('.', '{,}');
const mean = (vs: number[]) => vs.reduce((a, b) => a + b, 0) / vs.length;
const sortN = (vs: number[]) => [...vs].sort((a, b) => a - b);
const med = (s: number[]) => (s.length % 2 ? s[(s.length - 1) / 2]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2);

function DotsMode() {
  const [vs, setVs] = useState([12, 15, 18, 19, 21, 22, 24, 27, 41]);
  const s = sortN(vs);
  const n = s.length;
  const lower = s.slice(0, Math.floor(n / 2));
  const upper = s.slice(Math.ceil(n / 2));
  const q1 = med(lower);
  const q3 = med(upper);
  const m = mean(vs);
  const sd = Math.sqrt(vs.reduce((a, v) => a + (v - m) ** 2, 0) / n);
  const md = med(s);
  // Stack equal values so every dot stays visible and draggable.
  const ys = vs.map((v, i) => 1 + vs.slice(0, i).filter((w) => w === v).length);
  return (
    <>
      <div className="widget-readout ag-readout" aria-live="polite">
        <Tex tex={`\\bar{x} = ${t(m)}`} />
        <Tex tex={`\\text{median} = ${t(md, Number.isInteger(md) ? 0 : 1)}`} />
        <Tex tex={`\\sigma = ${t(sd)}`} />
        <Tex tex={`\\text{IQR} = ${t(q3 - q1, Number.isInteger(q3 - q1) ? 0 : 1)}`} />
      </div>
      <Plot xRange={[0, 50]} yRange={[-4, 5]} width={420} height={240} hideY label={`${n} data values from ${s[0]} to ${s[n - 1]}. Mean ${t(m)}, median ${md}, standard deviation ${t(sd)}.`}>
        {(sc) => (
          <>
            {/* Box-and-whisker plot under the dots. */}
            <line x1={sc.x(s[0]!)} x2={sc.x(q1)} y1={sc.y(-2)} y2={sc.y(-2)} className="plot-segment" />
            <line x1={sc.x(q3)} x2={sc.x(s[n - 1]!)} y1={sc.y(-2)} y2={sc.y(-2)} className="plot-segment" />
            <rect x={sc.x(q1)} y={sc.y(-1)} width={sc.x(q3) - sc.x(q1)} height={sc.y(-3) - sc.y(-1)} className="stats-box" />
            <line x1={sc.x(md)} x2={sc.x(md)} y1={sc.y(-1)} y2={sc.y(-3)} className="plot-segment" />
            {/* Mean ± σ band and the mean. */}
            <rect x={sc.x(m - sd)} y={sc.y(4.6)} width={sc.x(m + sd) - sc.x(m - sd)} height={sc.y(0.4) - sc.y(4.6)} className="stats-band" />
            <line x1={sc.x(m)} x2={sc.x(m)} y1={sc.y(4.6)} y2={sc.y(0.4)} className="stats-mean" />
            <text x={sc.x(m)} y={sc.y(4.6) - 4} textAnchor="middle" className="geo-angle">
              mean
            </text>
            {vs.map((v, i) => (
              <Draggable key={i} s={sc} x={v} y={ys[i]!} label="" onMove={(x) => setVs(vs.map((w, j) => (j === i ? Math.max(0, Math.min(50, x)) : w)))} />
            ))}
          </>
        )}
      </Plot>
      <Note ok={null}>
        <p>Drag the value far to the right further out. The mean and σ chase it; the median and IQR hardly move. That is why the median and IQR describe skewed data better. The shaded band is the mean ± σ.</p>
      </Note>
    </>
  );
}

function ScatterMode() {
  const [pts, setPts] = useState<[number, number][]>([
    [1, 2],
    [2, 3],
    [3, 3],
    [4, 5],
    [5, 4],
    [6, 6],
    [7, 7],
  ]);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const mx = mean(xs);
  const my = mean(ys);
  const sxy = pts.reduce((a, [x, y]) => a + (x - mx) * (y - my), 0);
  const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const syy = ys.reduce((a, y) => a + (y - my) ** 2, 0);
  const b = sxx === 0 ? 0 : sxy / sxx;
  const a = my - b * mx;
  const r = sxx === 0 || syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
  const strength = Math.abs(r) >= 0.8 ? 'strong' : Math.abs(r) >= 0.5 ? 'moderate' : Math.abs(r) >= 0.2 ? 'weak' : 'no';
  return (
    <>
      <div className="widget-readout ag-readout" aria-live="polite">
        <Tex tex={`\\hat{y} = ${t(a)} ${b < 0 ? '-' : '+'} ${t(Math.abs(b))}x`} />
        <Tex tex={`r = ${t(r)}`} />
        <span className="muted ag-full">{strength === 'no' ? 'No correlation.' : `${strength[0]!.toUpperCase() + strength.slice(1)} ${r > 0 ? 'positive' : 'negative'} correlation.`}</span>
      </div>
      <Plot xRange={[0, 10]} yRange={[0, 10]} width={400} height={400} label={`Scatter plot of ${pts.length} points. Regression line y = ${t(a)} + ${t(b)}x; r = ${t(r)}.`}>
        {(sc) => (
          <>
            {sxx === 0 ? null : <line x1={sc.x(0)} y1={sc.y(a)} x2={sc.x(10)} y2={sc.y(a + 10 * b)} className="plot-line pen" />}
            {pts.map((p, i) => (
              <Draggable key={i} s={sc} x={p[0]} y={p[1]} label="" onMove={(x, y) => setPts(pts.map((q, j) => (j === i ? [x, y] : q)))} />
            ))}
          </>
        )}
      </Plot>
      <Note ok={null}>
        <p>Drag points away from the line and watch r shrink towards 0. Drag one point far up in a corner: a single outlier can tilt the whole line. The line always passes through the point (mean of x; mean of y).</p>
      </Note>
    </>
  );
}

export function StatsLab({ mode }: { mode: 'dots' | 'scatter' }) {
  return <div className="ag-lab">{mode === 'dots' ? <DotsMode /> : <ScatterMode />}</div>;
}
