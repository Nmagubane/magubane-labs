/** Cartesian plane drawn as SVG on graph paper. Shared by figures and widgets. */
import type { ReactNode, SVGProps } from 'react';

export interface Scale {
  x: (v: number) => number;
  y: (v: number) => number;
  /** inverse: SVG coords → data coords */
  ix: (px: number) => number;
  iy: (py: number) => number;
  xRange: [number, number];
  yRange: [number, number];
  width: number;
  height: number;
}

export function makeScale(xRange: [number, number], yRange: [number, number], width: number, height: number, pad = 18): Scale {
  const [x0, x1] = xRange;
  const [y0, y1] = yRange;
  const sx = (width - 2 * pad) / (x1 - x0);
  const sy = (height - 2 * pad) / (y1 - y0);
  return {
    x: (v) => pad + (v - x0) * sx,
    y: (v) => height - pad - (v - y0) * sy,
    ix: (px) => x0 + (px - pad) / sx,
    iy: (py) => y0 + (height - pad - py) / sy,
    xRange,
    yRange,
    width,
    height,
  };
}

function ticks(a: number, b: number): number[] {
  const span = b - a;
  const step = span > 24 ? 5 : span > 12 ? 2 : 1;
  const out: number[] = [];
  for (let v = Math.ceil(a / step) * step; v <= b; v += step) out.push(v);
  return out;
}

export function Plot({ xRange, yRange, width = 360, height = 300, children, label, svgProps }: { xRange: [number, number]; yRange: [number, number]; width?: number; height?: number; children?: (s: Scale) => ReactNode; label: string; svgProps?: SVGProps<SVGSVGElement> }) {
  const s = makeScale(xRange, yRange, width, height);
  const xs = ticks(xRange[0], xRange[1]);
  const ys = ticks(yRange[0], yRange[1]);
  return (
    <svg className="plot" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} {...svgProps}>
      {xs.map((v) => (
        <line key={`gx${v}`} x1={s.x(v)} x2={s.x(v)} y1={s.y(yRange[0])} y2={s.y(yRange[1])} className="plot-grid" />
      ))}
      {ys.map((v) => (
        <line key={`gy${v}`} y1={s.y(v)} y2={s.y(v)} x1={s.x(xRange[0])} x2={s.x(xRange[1])} className="plot-grid" />
      ))}
      {yRange[0] <= 0 && yRange[1] >= 0 ? <line x1={s.x(xRange[0])} x2={s.x(xRange[1])} y1={s.y(0)} y2={s.y(0)} className="plot-axis" /> : null}
      {xRange[0] <= 0 && xRange[1] >= 0 ? <line y1={s.y(yRange[0])} y2={s.y(yRange[1])} x1={s.x(0)} x2={s.x(0)} className="plot-axis" /> : null}
      {xs
        .filter((v) => v !== 0)
        .map((v) => (
          <text key={`tx${v}`} x={s.x(v)} y={Math.min(s.y(yRange[0]) + 14, Math.max(s.y(0) + 13, 12))} className="plot-tick" textAnchor="middle">
            {v}
          </text>
        ))}
      {ys
        .filter((v) => v !== 0)
        .map((v) => (
          <text key={`ty${v}`} x={Math.max(s.x(xRange[0]) - 4, Math.min(s.x(0) - 5, width - 4))} y={s.y(v) + 4} className="plot-tick" textAnchor="end">
            {v}
          </text>
        ))}
      {xRange[1] > 0 ? (
        <text x={s.x(xRange[1]) - 2} y={yRange[0] <= 0 && yRange[1] >= 0 ? s.y(0) - 6 : s.y(yRange[0]) - 6} className="plot-axis-label" textAnchor="end">
          x
        </text>
      ) : null}
      {yRange[1] > 0 ? (
        <text x={xRange[0] <= 0 && xRange[1] >= 0 ? s.x(0) + 7 : s.x(xRange[0]) + 7} y={s.y(yRange[1]) + 10} className="plot-axis-label">
          y
        </text>
      ) : null}
      {children?.(s)}
    </svg>
  );
}

/** Clip a line y = mx + c to the plot's rectangle. */
export function lineSegment(m: number, c: number, s: Scale): [number, number, number, number] {
  const [x0, x1] = s.xRange;
  return [s.x(x0), s.y(m * x0 + c), s.x(x1), s.y(m * x1 + c)];
}
