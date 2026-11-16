/**
 * Measurement labs (Grade 10):
 * - scale: a rectangular prism and the same prism with every length × k; areas grow by k², volumes by k³;
 * - third: pour cones of water into the cylinder with the same base and height — three fill it.
 */
import { useState } from 'react';
import { Tex, Rich } from '../../ui/RichText.tsx';
import { Slider } from './MathWidgets.tsx';
import { Note } from './NstLabs.tsx';

/** An oblique box made of unit cubes: the front face shows its unit squares. */
function Box({ a, b, c, x, y, u }: { a: number; b: number; c: number; x: number; y: number; u: number }) {
  const [w, h, dx, dy] = [a * u, c * u, b * u * 0.5, -b * u * 0.4];
  const lines = [];
  for (let i = 1; i < a; i++) lines.push(<line key={`v${i}`} x1={x + i * u} y1={y} x2={x + i * u} y2={y + h} className="ml-grid" />);
  for (let j = 1; j < c; j++) lines.push(<line key={`h${j}`} x1={x} y1={y + j * u} x2={x + w} y2={y + j * u} className="ml-grid" />);
  return (
    <g>
      <path d={`M ${x} ${y} l ${dx} ${dy} h ${w} l ${-dx} ${-dy} Z`} className="ml-top" />
      <path d={`M ${x + w} ${y} l ${dx} ${dy} v ${h} l ${-dx} ${-dy} Z`} className="ml-side" />
      <rect x={x} y={y} width={w} height={h} className="ml-front" />
      {lines}
    </g>
  );
}

function ScaleMode() {
  const [a, setA] = useState(2);
  const [b, setB] = useState(1);
  const [c, setC] = useState(1);
  const [k, setK] = useState(2);
  const S = 2 * (a * b + a * c + b * c);
  const V = a * b * c;
  const u = 14;
  const height = Math.max(c * k * u + b * k * u * 0.4, 60) + 30;
  return (
    <>
      <div className="widget-readout" aria-live="polite">
        <Tex tex={`\\text{area} \\times ${k * k} = ${k}^2, \\qquad \\text{volume} \\times ${k ** 3} = ${k}^3`} />
      </div>
      <svg className="ml-figure" viewBox={`0 0 340 ${height}`} role="img" aria-label={`A ${a} by ${b} by ${c} box and the same box with every length times ${k}: ${a * k} by ${b * k} by ${c * k}.`}>
        <Box a={a} b={b} c={c} x={10} y={height - 15 - c * u} u={u} />
        <Box a={a * k} b={b * k} c={c * k} x={a * u + b * u * 0.5 + 40} y={height - 15 - c * k * u} u={u} />
      </svg>
      <table className="ml-table">
        <thead>
          <tr>
            <th scope="col" />
            <th scope="col">Original</th>
            <th scope="col">× {k}</th>
            <th scope="col">Multiplied by</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Lengths</th>
            <td>
              {a} × {b} × {c}
            </td>
            <td>
              {a * k} × {b * k} × {c * k}
            </td>
            <td className="num">{k}</td>
          </tr>
          <tr>
            <th scope="row">Surface area</th>
            <td className="num">{S}</td>
            <td className="num">{S * k * k}</td>
            <td className="num ml-hl">{k * k}</td>
          </tr>
          <tr>
            <th scope="row">Volume</th>
            <td className="num">{V}</td>
            <td className="num">{V * k ** 3}</td>
            <td className="num ml-hl">{k ** 3}</td>
          </tr>
        </tbody>
      </table>
      <div className="widget-controls">
        <Slider label="Length" value={a} min={1} max={4} onChange={setA} />
        <Slider label="Depth" value={b} min={1} max={3} onChange={setB} />
        <Slider label="Height" value={c} min={1} max={3} onChange={setC} />
        <Slider label="Scale factor" tex="k" value={k} min={1} max={3} onChange={setK} />
      </div>
      <Note ok={k > 1 ? true : null}>
        <Rich as="p" text={k === 1 ? 'Set $k$ to 2 or 3 and compare the two boxes.' : `Each unit square on a face becomes a $${k} \\times ${k}$ patch of ${k * k} squares, and each unit cube becomes a $${k} \\times ${k} \\times ${k}$ block of ${k ** 3} cubes. That is why area grows by $k^2$ and volume by $k^3$, whatever shape the solid is.`} />
      </Note>
    </>
  );
}

function ThirdMode() {
  const [poured, setPoured] = useState(0);
  const [cx, top, bottom, rx, ry] = [230, 40, 190, 55, 14];
  const level = bottom - ((bottom - top) * poured) / 3;
  return (
    <>
      <div className="widget-readout" aria-live="polite">
        <Tex tex={`${poured} \\text{ cone${poured === 1 ? '' : 's'} poured} \\;\\Rightarrow\\; \\text{the cylinder is } ${poured === 3 ? '\\text{full}' : `\\tfrac{${poured}}{3} \\text{ full}`}`} />
      </div>
      <svg className="ml-figure" viewBox="0 0 320 232" role="img" aria-label={`A cone and a cylinder with the same base and height. ${poured} cones of water have been poured in; the cylinder is ${poured} thirds full.`}>
        <path d={`M ${80 - rx} ${bottom} L 80 ${top} L ${80 + rx} ${bottom}`} className="ml-cone" />
        <ellipse cx={80} cy={bottom} rx={rx} ry={ry} className="ml-cone" />
        <rect x={cx - rx} y={level} width={2 * rx} height={bottom - level} className="ml-water" />
        {poured > 0 ? <ellipse cx={cx} cy={bottom} rx={rx} ry={ry} className="ml-water" /> : null}
        {poured > 0 ? <ellipse cx={cx} cy={level} rx={rx} ry={ry} className="ml-water-top" /> : null}
        <line x1={cx - rx} y1={top} x2={cx - rx} y2={bottom} className="ml-cyl" />
        <line x1={cx + rx} y1={top} x2={cx + rx} y2={bottom} className="ml-cyl" />
        <ellipse cx={cx} cy={top} rx={rx} ry={ry} className="ml-cyl" />
        <path d={`M ${cx - rx} ${bottom} A ${rx} ${ry} 0 0 0 ${cx + rx} ${bottom}`} className="ml-cyl" />
        {[1, 2].map((i) => (
          <line key={i} x1={cx + rx} y1={bottom - ((bottom - top) * i) / 3} x2={cx + rx + 8} y2={bottom - ((bottom - top) * i) / 3} className="ml-cyl" />
        ))}
        <text x={80} y={226} textAnchor="middle" className="plot-point-label">cone</text>
        <text x={cx} y={226} textAnchor="middle" className="plot-point-label">cylinder</text>
      </svg>
      <div className="widget-controls">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPoured((p) => Math.min(3, p + 1))} disabled={poured >= 3}>
          Pour one cone of water in
        </button>
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setPoured(0)} disabled={poured === 0}>
          Empty it
        </button>
      </div>
      <Note ok={poured === 3 ? true : null}>
        <Rich as="p" text={poured === 3 ? 'Three cones fill the cylinder exactly, so a cone holds a third: $V_{\\text{cone}} = \\tfrac{1}{3}\\pi r^2 h$. A pyramid and the prism on the same base share the same ⅓.' : 'The cone and the cylinder have the same circle as base and the same height. How many cones of water will fill the cylinder?'} />
      </Note>
    </>
  );
}

export function MeasureLab({ mode }: { mode: 'scale' | 'third' }) {
  return mode === 'scale' ? <ScaleMode /> : <ThirdMode />;
}
