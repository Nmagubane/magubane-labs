/**
 * 30-day trend as two aligned small multiples (never a dual axis):
 * average mastery (line) above questions answered per day (bars). One shared hover column.
 */
import { useState } from 'react';
import { shortDate } from '../../lib/format.ts';

interface Point {
  day: string;
  mastery: number | null;
  questions: number;
}

export function TrendChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H1 = 150;
  const H2 = 72;
  const padL = 34;
  const padR = 10;
  const n = data.length;
  const step = (W - padL - padR) / n;
  const cx = (i: number) => padL + step * (i + 0.5);
  const vals = data.map((d) => d.mastery).filter((v): v is number => v !== null);
  const lo = Math.max(0, Math.floor((Math.min(...vals, 50) - 10) / 10) * 10);
  const hi = Math.min(100, Math.ceil((Math.max(...vals, 50) + 5) / 10) * 10);
  const y1 = (v: number) => 10 + (1 - (v - lo) / (hi - lo)) * (H1 - 28);
  const maxQ = Math.max(4, ...data.map((d) => d.questions));
  const y2 = (q: number) => H2 - 22 - (q / maxQ) * (H2 - 30);

  let path = '';
  data.forEach((d, i) => {
    if (d.mastery === null) return;
    path += `${path ? 'L' : 'M'}${cx(i).toFixed(1)} ${y1(d.mastery).toFixed(1)}`;
  });
  const h = hover !== null ? data[hover] : null;
  const tickStep = hi - lo > 50 ? 20 : 10;
  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += tickStep) ticks.push(t);

  return (
    <figure className="trend">
      <div className="trend-plot" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H1 + H2}`} role="img" aria-label="Average mastery and questions answered over the last 30 days. A table with the same data follows.">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y1(t)} y2={y1(t)} className="chart-grid" />
              <text x={padL - 6} y={y1(t) + 4} textAnchor="end" className="chart-tick">
                {t}%
              </text>
            </g>
          ))}
          {hover !== null ? <line x1={cx(hover)} x2={cx(hover)} y1={6} y2={H1 + H2 - 12} className="chart-crosshair" /> : null}
          <path d={path} className="chart-line" fill="none" />
          {data.map((d, i) =>
            d.mastery !== null && (i === n - 1 || i === hover) ? <circle key={`m${i}`} cx={cx(i)} cy={y1(d.mastery)} r={4.5} className="chart-dot" /> : null,
          )}
          {data.at(-1)?.mastery != null ? (
            <text x={cx(n - 1) - 8} y={y1(data.at(-1)!.mastery!) - 10} textAnchor="end" className="chart-label">
              {data.at(-1)!.mastery}%
            </text>
          ) : null}
          <g transform={`translate(0 ${H1})`}>
            <line x1={padL} x2={W - padR} y1={H2 - 22} y2={H2 - 22} className="chart-axis" />
            {data.map((d, i) =>
              d.questions > 0 ? <rect key={`q${i}`} x={cx(i) - Math.max(1.5, step / 2 - 2)} width={Math.max(3, step - 4)} y={y2(d.questions)} height={H2 - 22 - y2(d.questions)} rx={2} className="chart-bar" /> : null,
            )}
            <text x={padL - 6} y={y2(maxQ) + 8} textAnchor="end" className="chart-tick">
              {maxQ}
            </text>
            <text x={padL} y={H2 - 6} className="chart-tick">
              {shortDate(data[0]!.day)}
            </text>
            <text x={W - padR} y={H2 - 6} textAnchor="end" className="chart-tick">
              Today
            </text>
          </g>
          {data.map((_, i) => (
            <rect key={`hit${i}`} x={padL + step * i} y={0} width={step} height={H1 + H2} fill="transparent" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
          ))}
        </svg>
        {h ? (
          <div className="chart-tip" style={{ left: `${(cx(hover!) / W) * 100}%` }} role="status">
            <strong>{shortDate(h.day)}</strong>
            <span>Mastery: {h.mastery === null ? '–' : `${h.mastery}%`}</span>
            <span>
              {h.questions} question{h.questions === 1 ? '' : 's'}
            </span>
          </div>
        ) : null}
      </div>
      <figcaption className="trend-legend">
        <span>
          <i className="lg-line" /> Average mastery of skills you&apos;ve started
        </span>
        <span>
          <i className="lg-bar" /> Questions answered per day
        </span>
      </figcaption>
      <details className="table-view">
        <summary>Show as a table</summary>
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col" className="num">
                Mastery
              </th>
              <th scope="col" className="num">
                Questions
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.day}>
                <th scope="row">{shortDate(d.day)}</th>
                <td className="num">{d.mastery === null ? '–' : `${d.mastery}%`}</td>
                <td className="num">{d.questions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
