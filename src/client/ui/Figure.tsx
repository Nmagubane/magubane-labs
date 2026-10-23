import type { Figure as FigureSpec } from '../../shared/questions/types.ts';
import { Plot, lineSegment } from './Plot.tsx';

export function Figure({ figure }: { figure: FigureSpec }) {
  if (figure.kind === 'graph') return <GraphFigure f={figure} />;
  if (figure.kind === 'circuit') return <CircuitFigure f={figure} />;
  return <PunnettFigure f={figure} />;
}

function GraphFigure({ f }: { f: Extract<FigureSpec, { kind: 'graph' }> }) {
  const desc = [
    ...(f.points ?? []).map((p) => `point ${p.label ?? ''} at (${p.x}, ${p.y})`),
    ...(f.lines ?? []).map(() => 'a straight line'),
  ].join(', ');
  return (
    <figure className="q-figure">
      <Plot xRange={f.xRange} yRange={f.yRange} width={340} height={300} label={`Graph showing ${desc}`}>
        {(s) => (
          <>
            {(f.lines ?? []).map((l, i) => {
              const [x1, y1, x2, y2] = lineSegment(l.m, l.c, s);
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="plot-line" />;
            })}
            {(f.points ?? []).map((p, i) => (
              <g key={i}>
                <circle cx={s.x(p.x)} cy={s.y(p.y)} r={4.5} className="plot-point" />
                <text x={s.x(p.x) + 8} y={s.y(p.y) - 8} className="plot-point-label">
                  {p.label ? `${p.label}(${p.x}; ${p.y})` : `(${p.x}; ${p.y})`}
                </text>
              </g>
            ))}
          </>
        )}
      </Plot>
    </figure>
  );
}

/** Schematic series circuit: battery, ammeter, resistors. */
export function CircuitFigure({ f }: { f: { voltage: number | null; resistors: (number | null)[]; current: number | null } }) {
  const n = f.resistors.length;
  const w = 320;
  const h = 170;
  const top = 34;
  const bottom = 136;
  const left = 30;
  const right = w - 30;
  const span = (right - left) / (n + 1);
  const label = `Series circuit: battery ${f.voltage ?? 'unknown'} volts, ${f.resistors.map((r) => (r === null ? 'unknown resistance' : `${r} ohms`)).join(' and ')}, current ${f.current ?? 'unknown'} amps`;
  return (
    <figure className="q-figure">
      <svg viewBox={`0 0 ${w} ${h}`} className="circuit" role="img" aria-label={label}>
        <path d={`M${left} ${top} H${right} V${bottom} H${left} Z`} className="wire" />
        {f.resistors.map((r, i) => {
          const cx = left + span * (i + 1);
          return (
            <g key={i}>
              <rect x={cx - 24} y={top - 9} width={48} height={18} className="resistor" />
              <text x={cx} y={top - 15} textAnchor="middle" className="circuit-label">
                {r === null ? 'R = ?' : `${r} Ω`}
              </text>
            </g>
          );
        })}
        {/* battery */}
        <g transform={`translate(${(left + right) / 2} ${bottom})`}>
          <rect x={-14} y={-14} width={28} height={28} fill="var(--paper)" stroke="none" />
          <line x1={-5} x2={-5} y1={-13} y2={13} className="cell-long" />
          <line x1={5} x2={5} y1={-7} y2={7} className="cell-short" />
          <text y={30} textAnchor="middle" className="circuit-label">
            {f.voltage === null ? 'V = ?' : `${f.voltage} V`}
          </text>
        </g>
        {/* ammeter */}
        <g transform={`translate(${right} ${(top + bottom) / 2})`}>
          <circle r={14} className="meter" />
          <text y={5} textAnchor="middle" className="circuit-meter">
            A
          </text>
          <text x={-20} y={5} textAnchor="end" className="circuit-label">
            {f.current === null ? 'I = ?' : `${f.current} A`}
          </text>
        </g>
      </svg>
    </figure>
  );
}

function PunnettFigure({ f }: { f: Extract<FigureSpec, { kind: 'punnett' }> }) {
  const a = [f.parentA[0], f.parentA[1]] as string[];
  const b = [f.parentB[0], f.parentB[1]] as string[];
  const combine = (x: string, y: string) => (x === x.toUpperCase() ? x + y : y === y.toUpperCase() ? y + x : x + y);
  return (
    <figure className="q-figure">
      <table className="punnett-table">
        <caption className="sr-only">
          Punnett square for {f.parentA} crossed with {f.parentB}
        </caption>
        <thead>
          <tr>
            <th scope="col" aria-label="Alleles" />
            {a.map((x, i) => (
              <th key={i} scope="col">
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {b.map((y, r) => (
            <tr key={r}>
              <th scope="row">{y}</th>
              {a.map((x, c) => (
                <td key={c}>{f.reveal ? combine(x, y) : <span className="punnett-blank">?</span>}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <figcaption>
        {f.parentA} × {f.parentB}
      </figcaption>
    </figure>
  );
}
