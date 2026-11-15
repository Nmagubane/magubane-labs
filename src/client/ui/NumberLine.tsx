/** A solution set on a number line: thick pen segments, open and closed dots, arrows to ±∞. */
import type { IneqInterval } from '../../shared/questions/types.ts';

const val = (r: { n: number; d: number }) => r.n / r.d;
const label = (r: { n: number; d: number }) => (r.d === 1 ? `${r.n}` : `${r.n}/${r.d}`).replace('-', '−');

export function NumberLine({ set, variable = 'x', alt }: { set: IneqInterval[]; variable?: string; alt?: string }) {
  const ends = set.flatMap((iv) => [iv.lo, iv.hi]).filter((e): e is { n: number; d: number } => e !== null);
  const vs = ends.map(val);
  const lo = Math.floor(Math.min(0, ...vs) - 2);
  const hi = Math.ceil(Math.max(0, ...vs) + 2);
  const W = 360;
  const pad = 18;
  const x = (v: number) => pad + ((v - lo) / (hi - lo)) * (W - 2 * pad);
  const y = 26;
  const step = hi - lo > 14 ? Math.ceil((hi - lo) / 10) : 1;
  const ticks: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(t);
  const desc = alt ?? `Number line showing ${variable}`;
  return (
    <svg className="numberline" viewBox={`0 0 ${W} 56`} role="img" aria-label={desc}>
      <line x1={pad - 10} x2={W - pad + 10} y1={y} y2={y} className="nl-axis" />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={y - 4} y2={y + 4} className="nl-tick" />
          <text x={x(t)} y={y + 20} textAnchor="middle" className="nl-label">
            {String(t).replace('-', '−')}
          </text>
        </g>
      ))}
      {set.map((iv, i) => {
        const a = iv.lo ? x(val(iv.lo)) : pad - 8;
        const b = iv.hi ? x(val(iv.hi)) : W - pad + 8;
        return (
          <g key={i}>
            <line x1={a} x2={b} y1={y} y2={y} className="nl-set" />
            {iv.lo === null ? <path d={`M${a + 6},${y - 6} L${a - 2},${y} L${a + 6},${y + 6}`} className="nl-arrow" /> : null}
            {iv.hi === null ? <path d={`M${b - 6},${y - 6} L${b + 2},${y} L${b - 6},${y + 6}`} className="nl-arrow" /> : null}
            {iv.lo ? <circle cx={a} cy={y} r={5.5} className={iv.loIn ? 'nl-dot closed' : 'nl-dot open'} /> : null}
            {iv.hi && !(iv.lo && val(iv.lo) === val(iv.hi)) ? <circle cx={b} cy={y} r={5.5} className={iv.hiIn ? 'nl-dot closed' : 'nl-dot open'} /> : null}
            {iv.lo && !ticks.includes(val(iv.lo)) ? (
              <text x={a} y={y - 10} textAnchor="middle" className="nl-label nl-end">
                {label(iv.lo)}
              </text>
            ) : null}
            {iv.hi && !ticks.includes(val(iv.hi)) && !(iv.lo && val(iv.lo) === val(iv.hi)) ? (
              <text x={b} y={y - 10} textAnchor="middle" className="nl-label nl-end">
                {label(iv.hi)}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
