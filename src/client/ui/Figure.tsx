import type { Figure as FigureSpec } from '../../shared/questions/types.ts';
import { Plot, lineSegment } from './Plot.tsx';

export function Figure({ figure }: { figure: FigureSpec }) {
  if (figure.kind === 'graph') return <GraphFigure f={figure} />;
  if (figure.kind === 'circuit') return <CircuitFigure f={figure} />;
  if (figure.kind === 'geometry') return <GeometryFigure f={figure} />;
  return <PunnettFigure f={figure} />;
}

function GraphFigure({ f }: { f: Extract<FigureSpec, { kind: 'graph' }> }) {
  const desc = [
    ...(f.points ?? []).map((p) => `point ${p.text ?? `${p.label ?? ''} at (${p.x}, ${p.y})`}`),
    ...(f.lines ?? []).map(() => 'a straight line'),
    ...(f.segments ?? []).map((g) => `a line segment from (${g.x1}, ${g.y1}) to (${g.x2}, ${g.y2})`),
    ...(f.circles ?? []).map((c) => `a circle with centre (${c.cx}, ${c.cy})`),
  ].join(', ');
  // Circles must stay round: give both axes the same span and draw on a square.
  const round = (f.circles ?? []).length > 0;
  let { xRange, yRange } = f;
  if (round) {
    const span = Math.max(xRange[1] - xRange[0], yRange[1] - yRange[0]);
    const grow = (r: [number, number]): [number, number] => {
      const extra = (span - (r[1] - r[0])) / 2;
      return [r[0] - Math.floor(extra), r[1] + Math.ceil(extra)];
    };
    xRange = grow(xRange);
    yRange = grow(yRange);
  }
  const W = round ? 320 : 340;
  const H = round ? 320 : 300;
  return (
    <figure className="q-figure">
      {f.yTitle ? <p className="plot-title-y">{f.yTitle}</p> : null}
      <Plot xRange={xRange} yRange={yRange} width={W} height={f.hideY ? 140 : H} hideY={f.hideY} label={`${f.xTitle ? `${f.xTitle}${f.yTitle ? ` against ${f.yTitle}` : ''}. ` : ''}Graph showing ${desc}`}>
        {(s) => (
          <>
            {(f.circles ?? []).map((c, i) => (
              <ellipse key={`c${i}`} cx={s.x(c.cx)} cy={s.y(c.cy)} rx={Math.abs(s.x(c.cx + c.r) - s.x(c.cx))} ry={Math.abs(s.y(c.cy + c.r) - s.y(c.cy))} className="plot-circle" />
            ))}
            {(f.lines ?? []).map((l, i) => {
              const [x1, y1, x2, y2] = lineSegment(l.m, l.c, s);
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="plot-line" />;
            })}
            {(f.segments ?? []).map((g, i) => (
              <line key={`s${i}`} x1={s.x(g.x1)} y1={s.y(g.y1)} x2={s.x(g.x2)} y2={s.y(g.y2)} className={`plot-segment${g.dashed ? ' dashed' : ''}`} />
            ))}
            {(f.points ?? []).map((p, i) => (
              <g key={i}>
                <circle cx={s.x(p.x)} cy={s.y(p.y)} r={4.5} className="plot-point" />
                <text x={s.x(p.x) + (s.x(p.x) > W - 70 ? -8 : 8)} y={s.y(p.y) - 8} className="plot-point-label" textAnchor={s.x(p.x) > W - 70 ? 'end' : 'start'}>
                  {p.text ?? (p.label ? `${p.label}(${p.x}; ${p.y})` : `(${p.x}; ${p.y})`)}
                </text>
              </g>
            ))}
          </>
        )}
      </Plot>
      {f.xTitle ? <p className="plot-title-x">{f.xTitle}</p> : null}
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

/** Euclidean geometry diagram: fitted to the box, y up, each label placed in the widest gap between the lines that meet at its point. */
export function GeometryFigure({ f }: { f: Extract<FigureSpec, { kind: 'geometry' }> }) {
  const W = 320;
  const H = 240;
  const pad = 30;
  const xs = f.points.map((p) => p.x);
  const ys = f.points.map((p) => p.y);
  for (const c of f.circles ?? []) {
    const o = f.points.find((p) => p.id === c.c)!;
    xs.push(o.x - c.r, o.x + c.r);
    ys.push(o.y - c.r, o.y + c.r);
  }
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = Math.min((W - 2 * pad) / (x1 - x0 || 1), (H - 2 * pad) / (y1 - y0 || 1));
  const ox = (W - k * (x1 - x0)) / 2;
  const oy = (H - k * (y1 - y0)) / 2;
  const P = new Map(f.points.map((p) => [p.id, { ...p, sx: ox + k * (p.x - x0), sy: H - (oy + k * (p.y - y0)) }]));
  const cx = [...P.values()].reduce((a, p) => a + p.sx, 0) / P.size;
  const cy = [...P.values()].reduce((a, p) => a + p.sy, 0) / P.size;
  const at = (id: string) => P.get(id)!;
  /** Direction for a point's label: bisector of the widest gap between incident lines, else away from its circle's centre, else away from the centroid. */
  const labelDir = (id: string): [number, number] => {
    const p = at(id);
    const dirs: number[] = [];
    for (const sg of f.segments ?? []) {
      if (sg.a === id) dirs.push(Math.atan2(at(sg.b).sy - p.sy, at(sg.b).sx - p.sx));
      if (sg.b === id) {
        const a = Math.atan2(at(sg.a).sy - p.sy, at(sg.a).sx - p.sx);
        dirs.push(a);
        if (sg.extend) dirs.push(a + Math.PI);
      }
      if (sg.a !== id && sg.b !== id) {
        // A line passing through the point (e.g. where diagonals cross) blocks both directions.
        const A = at(sg.a);
        const B = at(sg.b);
        const len = Math.hypot(B.sx - A.sx, B.sy - A.sy) || 1;
        const off = Math.abs((B.sx - A.sx) * (A.sy - p.sy) - (A.sx - p.sx) * (B.sy - A.sy)) / len;
        const t = ((p.sx - A.sx) * (B.sx - A.sx) + (p.sy - A.sy) * (B.sy - A.sy)) / (len * len);
        if (off < 1.5 && t > 0.01 && t < 0.99) {
          const u = Math.atan2(B.sy - A.sy, B.sx - A.sx);
          dirs.push(u, u + Math.PI);
        }
      }
    }
    // An angle mark occupies its gap, so split that gap and steer the label elsewhere.
    for (const g of f.angles ?? []) {
      if (g.at !== id) continue;
      const u = Math.atan2(at(g.from).sy - p.sy, at(g.from).sx - p.sx);
      let d = Math.atan2(at(g.to).sy - p.sy, at(g.to).sx - p.sx) - u;
      while (d <= -Math.PI) d += 2 * Math.PI;
      while (d > Math.PI) d -= 2 * Math.PI;
      dirs.push(u + d / 2);
    }
    if (dirs.length > 0) {
      const sorted = dirs.map((d) => (d + 2 * Math.PI) % (2 * Math.PI)).sort((x, y) => x - y);
      let best = 0;
      let at0 = 0;
      sorted.forEach((d, i) => {
        const next = i + 1 < sorted.length ? sorted[i + 1]! : sorted[0]! + 2 * Math.PI;
        if (next - d > best) {
          best = next - d;
          at0 = d + (next - d) / 2;
        }
      });
      return [Math.cos(at0), Math.sin(at0)];
    }
    const circ = (f.circles ?? []).find((c) => c.c !== id);
    const from = circ ? at(circ.c) : { sx: cx, sy: cy };
    const n = Math.hypot(p.sx - from.sx, p.sy - from.sy) || 1;
    return [(p.sx - from.sx) / n, (p.sy - from.sy) / n];
  };
  return (
    <figure className="q-figure">
      <svg viewBox={`0 0 ${W} ${H}`} className="geo" role="img" aria-label={f.alt}>
        {(f.circles ?? []).map((c, i) => (
          <circle key={i} cx={at(c.c).sx} cy={at(c.c).sy} r={c.r * k} className="geo-circle" />
        ))}
        {(f.segments ?? []).map((s, i) => {
          const a = at(s.a);
          const b = at(s.b);
          const e = s.extend ?? 0;
          const bx = b.sx + (b.sx - a.sx) * e;
          const by = b.sy + (b.sy - a.sy) * e;
          const mx = (a.sx + b.sx) / 2;
          const my = (a.sy + b.sy) / 2;
          const len = Math.hypot(b.sx - a.sx, b.sy - a.sy) || 1;
          const ux = (b.sx - a.sx) / len;
          const uy = (b.sy - a.sy) / len;
          return (
            <g key={i}>
              <line x1={a.sx} y1={a.sy} x2={bx} y2={by} className={`geo-line${s.dashed ? ' dashed' : ''}`} />
              {s.text
                ? (() => {
                    // Push the side label away from the centre of the figure, perpendicular to the side.
                    let nx = -uy;
                    let ny = ux;
                    if ((mx - cx) * nx + (my - cy) * ny < 0) {
                      nx = -nx;
                      ny = -ny;
                    }
                    return (
                      <text x={mx + nx * 14} y={my + ny * 14 + 4} textAnchor="middle" className="geo-side">
                        {s.text}
                      </text>
                    );
                  })()
                : null}
              {Array.from({ length: s.ticks ?? 0 }, (_, t) => {
                const off = (t - ((s.ticks ?? 1) - 1) / 2) * 5;
                const tx = mx + ux * off;
                const ty = my + uy * off;
                return <line key={`t${t}`} x1={tx - uy * 6} y1={ty + ux * 6} x2={tx + uy * 6} y2={ty - ux * 6} className="geo-mark" />;
              })}
              {Array.from({ length: s.arrows ?? 0 }, (_, t) => {
                const off = (t - ((s.arrows ?? 1) - 1) / 2) * 7;
                const tx = mx + ux * off;
                const ty = my + uy * off;
                return <path key={`a${t}`} d={`M ${tx - ux * 6 - uy * 5} ${ty - uy * 6 + ux * 5} L ${tx} ${ty} L ${tx - ux * 6 + uy * 5} ${ty - uy * 6 - ux * 5}`} className="geo-mark" />;
              })}
            </g>
          );
        })}
        {(f.angles ?? []).map((g, i) => {
          const v = at(g.at);
          const a = at(g.from);
          const b = at(g.to);
          const a1 = Math.atan2(a.sy - v.sy, a.sx - v.sx);
          let a2 = Math.atan2(b.sy - v.sy, b.sx - v.sx);
          let d = a2 - a1;
          while (d <= -Math.PI) d += 2 * Math.PI;
          while (d > Math.PI) d -= 2 * Math.PI;
          a2 = a1 + d;
          const r = 16 * (g.r ?? 1);
          const mid = a1 + d / 2;
          const lx = v.sx + Math.cos(mid) * (r + 13);
          const ly = v.sy + Math.sin(mid) * (r + 13);
          if (g.right) {
            const p1 = [v.sx + Math.cos(a1) * 10, v.sy + Math.sin(a1) * 10];
            const p2 = [v.sx + Math.cos(a2) * 10, v.sy + Math.sin(a2) * 10];
            const p3 = [p1[0]! + Math.cos(a2) * 10, p1[1]! + Math.sin(a2) * 10];
            return <path key={i} d={`M ${p1[0]} ${p1[1]} L ${p3[0]} ${p3[1]} L ${p2[0]} ${p2[1]}`} className="geo-arc" />;
          }
          return (
            <g key={i}>
              <path d={`M ${v.sx + Math.cos(a1) * r} ${v.sy + Math.sin(a1) * r} A ${r} ${r} 0 0 ${d > 0 ? 1 : 0} ${v.sx + Math.cos(a2) * r} ${v.sy + Math.sin(a2) * r}`} className="geo-arc" />
              <text x={lx} y={ly + 4} textAnchor="middle" className="geo-angle">
                {g.text}
              </text>
            </g>
          );
        })}
        {[...P.values()].map((p) => {
          const [dx, dy] = labelDir(p.id);
          return (
            <g key={p.id}>
              {p.dot ? <circle cx={p.sx} cy={p.sy} r={2.5} className="geo-dot" /> : null}
              {p.label === '' ? null : (
                <text x={p.sx + dx * 15} y={p.sy + dy * 15 + 5} textAnchor="middle" className="geo-label">
                  {p.label ?? p.id}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
