/** Interactive maths widgets: number line, fraction bars, area model, gradient, line explorer, parabola roots. */
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Tex } from '../../ui/RichText.tsx';
import { Plot, lineSegment, type Scale } from '../../ui/Plot.tsx';
import { lcm, rat, ratTex } from '../../../shared/questions/rational.ts';
import { sum, binomial } from '../../../shared/questions/tex.ts';

// ---------------------------------------------------------------------------
function Slider({ label, value, min, max, step = 1, onChange, format, tex }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string; tex?: string }) {
  const shown = format ? format(value) : String(value);
  return (
    <label className="slider">
      <span className="slider-label">
        {tex ? <Tex tex={tex} /> : label}
        <output className="num">{shown}</output>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} aria-label={label} aria-valuetext={`${label} ${shown}`} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <span className="stepper-label">{label}</span>
      <button type="button" className="key" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </button>
      <output className="num" aria-live="polite">
        {value}
      </output>
      <button type="button" className="key" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}

export { Slider, Stepper };

// ---------------------------------------------------------------------------
export function NumberLine({ start: s0, change: c0 }: { start: number; change: number }) {
  const [start, setStart] = useState(s0);
  const [op, setOp] = useState<'+' | '-'>('+');
  const [amount, setAmount] = useState(c0);
  const move = op === '+' ? amount : -amount;
  const end = start + move;
  const W = 640;
  const H = 120;
  const min = -20;
  const max = 20;
  const x = (v: number) => 20 + ((v - min) / (max - min)) * (W - 40);
  const amountTex = amount < 0 ? `(${amount})` : String(amount);
  const sentence =
    op === '+'
      ? amount < 0
        ? `Adding a negative moves left by ${-amount}.`
        : `Adding ${amount} moves right by ${amount}.`
      : amount < 0
        ? `Subtracting a negative moves right by ${-amount}.`
        : `Subtracting ${amount} moves left by ${amount}.`;
  return (
    <div className="nl">
      <p className="widget-readout" aria-live="polite">
        <Tex tex={`${start} ${op === '+' ? '+' : '-'} ${amountTex} = ${end}`} />
        <span className="muted">{amount === 0 ? 'No movement.' : sentence}</span>
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="nl-svg" role="img" aria-label={`Number line: start at ${start}, move ${move > 0 ? 'right' : 'left'} ${Math.abs(move)}, land on ${end}`}>
        <line x1={x(min)} x2={x(max)} y1={78} y2={78} className="plot-axis" />
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((v) => (
          <g key={v}>
            <line x1={x(v)} x2={x(v)} y1={v % 5 === 0 ? 70 : 74} y2={v % 5 === 0 ? 86 : 82} className="plot-axis" />
            {v % 5 === 0 ? (
              <text x={x(v)} y={104} className="plot-tick" textAnchor="middle">
                {v}
              </text>
            ) : null}
          </g>
        ))}
        {move !== 0 && Math.abs(end) <= 20 ? (
          <path d={`M${x(start)} 70 Q ${(x(start) + x(end)) / 2} ${70 - Math.min(52, 12 + Math.abs(move) * 4)} ${x(end)} 70`} className="nl-jump" markerEnd="url(#nl-arrow)" />
        ) : null}
        <defs>
          <marker id="nl-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" className="nl-arrowhead" />
          </marker>
        </defs>
        <circle cx={x(start)} cy={78} r={6} className="nl-start" />
        {Math.abs(end) <= 20 ? <circle cx={x(end)} cy={78} r={7} className="nl-end" /> : null}
      </svg>
      <div className="widget-controls">
        <Slider label="Start" value={start} min={-10} max={10} onChange={setStart} />
        <div className="eqb-ops" role="radiogroup" aria-label="Operation">
          {(['+', '-'] as const).map((o) => (
            <button key={o} type="button" role="radio" aria-checked={op === o} className={`key${op === o ? ' on' : ''}`} onClick={() => setOp(o)} aria-label={o === '+' ? 'add' : 'subtract'}>
              {o === '-' ? '−' : '+'}
            </button>
          ))}
        </div>
        <Slider label="Number" value={amount} min={-10} max={10} onChange={setAmount} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function Bar({ n, d, pieces, label }: { n: number; d: number; pieces: number; label: string }) {
  const filled = (n / d) * pieces;
  return (
    <div className="fbar" role="img" aria-label={label}>
      {Array.from({ length: pieces }, (_, i) => (
        <span key={i} className={`fbar-piece${i < Math.round(filled) ? ' on' : ''}`} style={{ width: `${100 / pieces}%` }} />
      ))}
    </div>
  );
}

export function FractionBars({ a, b }: { a: [number, number]; b: [number, number] }) {
  const [an, setAn] = useState(a[0]);
  const [ad, setAd] = useState(a[1]);
  const [bn, setBn] = useState(b[0]);
  const [bd, setBd] = useState(b[1]);
  const [common, setCommon] = useState(false);
  const L = lcm(ad, bd);
  const same = an * bd === bn * ad;
  const total = rat(an * (L / ad) + bn * (L / bd), L);
  return (
    <div className="fbars">
      <div className="fbars-row">
        <div className="fbars-label">
          <Tex tex={common && L !== ad ? `\\tfrac{${an}}{${ad}} = \\tfrac{${an * (L / ad)}}{${L}}` : `\\tfrac{${an}}{${ad}}`} />
        </div>
        <Bar n={an} d={ad} pieces={common ? L : ad} label={`${an} out of ${ad}`} />
      </div>
      <div className="fbars-row">
        <div className="fbars-label">
          <Tex tex={common && L !== bd ? `\\tfrac{${bn}}{${bd}} = \\tfrac{${bn * (L / bd)}}{${L}}` : `\\tfrac{${bn}}{${bd}}`} />
        </div>
        <Bar n={bn} d={bd} pieces={common ? L : bd} label={`${bn} out of ${bd}`} />
      </div>
      <p className="widget-readout" aria-live="polite">
        {same ? <strong>Same length: these fractions are equivalent.</strong> : <span>{an / ad > bn / bd ? 'The top fraction is bigger.' : 'The bottom fraction is bigger.'}</span>}{' '}
        {common ? (
          <span>
            Together: <Tex tex={`\\tfrac{${an * (L / ad)}}{${L}} + \\tfrac{${bn * (L / bd)}}{${L}} = \\tfrac{${an * (L / ad) + bn * (L / bd)}}{${L}}${total.d !== L ? ` = ${ratTex(total)}` : ''}`} />
          </span>
        ) : null}
      </p>
      <div className="widget-controls">
        <Stepper label="Top: numerator" value={an} min={0} max={ad} onChange={setAn} />
        <Stepper label="denominator" value={ad} min={1} max={12} onChange={(v) => (setAd(v), setAn(Math.min(an, v)))} />
        <Stepper label="Bottom: numerator" value={bn} min={0} max={bd} onChange={setBn} />
        <Stepper label="denominator" value={bd} min={1} max={12} onChange={(v) => (setBd(v), setBn(Math.min(bn, v)))} />
        <label className="toggle">
          <input type="checkbox" checked={common} onChange={(e) => setCommon(e.target.checked)} /> Cut into a common denominator ({L} pieces)
        </label>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function AreaModel({ p: p0, q: q0, target }: { p: number; q: number; target?: [number, number] }) {
  const [p, setP] = useState(p0);
  const [q, setQ] = useState(q0);
  const X = 150; // visual size of x
  const u = 18; // visual size of 1
  const W = X + q * u;
  const H = X + p * u;
  const matched = target && p + q === target[0] && p * q === target[1];
  const expanded = sum([
    [1, 'x^2'],
    [p + q, 'x'],
    [p * q, ''],
  ]);
  return (
    <div className="area">
      <p className="widget-readout" aria-live="polite">
        <Tex tex={`${binomial(1, 'x', p)}${binomial(1, 'x', q)} = ${sum([[1, 'x^2'], [q, 'x'], [p, 'x'], [p * q, '']])} = ${expanded}`} />
      </p>
      {target ? (
        <p className={`area-target${matched ? ' hit' : ''}`} role="status">
          {matched ? (
            <>
              That&apos;s it: <Tex tex={`x^2 + ${target[0]}x + ${target[1]} = ${binomial(1, 'x', p)}${binomial(1, 'x', q)}`} />
            </>
          ) : (
            <>
              Target: <Tex tex={`x^2 + ${target[0]}x + ${target[1]}`} />. Your numbers multiply to {p * q} and add to {p + q}.
            </>
          )}
        </p>
      ) : null}
      <svg viewBox={`-30 -30 ${W + 40} ${H + 40}`} className="area-svg" role="img" aria-label={`Rectangle x plus ${p} by x plus ${q}, split into x squared, ${q}x, ${p}x and ${p * q}`}>
        <rect x={0} y={0} width={X} height={X} className="area-x2" />
        <rect x={X} y={0} width={q * u} height={X} className="area-x" />
        <rect x={0} y={X} width={X} height={p * u} className="area-x" />
        <rect x={X} y={X} width={q * u} height={p * u} className="area-c" />
        <text x={X / 2} y={X / 2 + 6} textAnchor="middle" className="area-text">
          x²
        </text>
        <text x={X + (q * u) / 2} y={X / 2 + 5} textAnchor="middle" className="area-text-sm">
          {q === 1 ? '' : q}x
        </text>
        <text x={X / 2} y={X + (p * u) / 2 + 5} textAnchor="middle" className="area-text-sm">
          {p === 1 ? '' : p}x
        </text>
        <text x={X + (q * u) / 2} y={X + (p * u) / 2 + 5} textAnchor="middle" className="area-text-sm">
          {p * q}
        </text>
        <text x={X / 2} y={-10} textAnchor="middle" className="area-dim">
          x
        </text>
        <text x={X + (q * u) / 2} y={-10} textAnchor="middle" className="area-dim">
          {q}
        </text>
        <text x={-12} y={X / 2} textAnchor="middle" className="area-dim">
          x
        </text>
        <text x={-12} y={X + (p * u) / 2 + 4} textAnchor="middle" className="area-dim">
          {p}
        </text>
      </svg>
      <div className="widget-controls">
        <Stepper label="First number" value={p} min={1} max={9} onChange={setP} />
        <Stepper label="Second number" value={q} min={1} max={9} onChange={setQ} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function Draggable({ s, x, y, label, onMove }: { s: Scale; x: number; y: number; label: string; onMove: (x: number, y: number) => void }) {
  const dragging = useRef(false);
  const toData = (e: PointerEvent<SVGGElement>) => {
    const svg = (e.currentTarget.ownerSVGElement as SVGSVGElement) ?? null;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    const clamp = (v: number, [a, b]: [number, number]) => Math.max(a, Math.min(b, Math.round(v)));
    return [clamp(s.ix(p.x), s.xRange), clamp(s.iy(p.y), s.yRange)] as const;
  };
  const onKey = (e: KeyboardEvent<SVGGElement>) => {
    const d: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    const m = d[e.key];
    if (!m) return;
    e.preventDefault();
    const nx = Math.max(s.xRange[0], Math.min(s.xRange[1], x + m[0]));
    const ny = Math.max(s.yRange[0], Math.min(s.yRange[1], y + m[1]));
    onMove(nx, ny);
  };
  return (
    <g
      className="drag-point"
      tabIndex={0}
      role="slider"
      aria-label={`${label}: (${x}, ${y}). Use the arrow keys to move it.`}
      aria-valuetext={`(${x}, ${y})`}
      onKeyDown={onKey}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        const p = toData(e);
        if (p && (p[0] !== x || p[1] !== y)) onMove(p[0], p[1]);
      }}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <circle cx={s.x(x)} cy={s.y(y)} r={18} className="drag-hit" />
      <circle cx={s.x(x)} cy={s.y(y)} r={7} className="drag-dot" />
      <text x={s.x(x) + 11} y={s.y(y) - 11} className="plot-point-label">
        {label}({x}; {y})
      </text>
    </g>
  );
}

export function TwoPointGradient({ a, b }: { a: [number, number]; b: [number, number] }) {
  const [A, setA] = useState(a);
  const [B, setB] = useState(b);
  const rise = B[1] - A[1];
  const run = B[0] - A[0];
  const m = run === 0 ? null : rat(rise, run);
  const desc = m === null ? 'The line is vertical: the gradient is undefined (you cannot divide by zero).' : m.n === 0 ? 'Horizontal line: gradient 0.' : m.n > 0 ? 'Uphill from left to right: positive gradient.' : 'Downhill from left to right: negative gradient.';
  return (
    <div className="tpg">
      <p className="widget-readout" aria-live="polite">
        <Tex tex={`m = \\dfrac{${B[1]} - ${A[1] < 0 ? `(${A[1]})` : A[1]}}{${B[0]} - ${A[0] < 0 ? `(${A[0]})` : A[0]}} = ${run === 0 ? '\\text{undefined}' : `\\dfrac{${rise}}{${run}}${m && (m.d !== run || m.n !== rise) ? ` = ${ratTex(m)}` : ''}`}`} />
        <span className="muted">{desc}</span>
      </p>
      <Plot xRange={[-6, 8]} yRange={[-5, 9]} width={420} height={400} label="Grid with two movable points A and B and the line through them">
        {(s) => (
          <>
            {m !== null ? (
              (() => {
                const mm = rise / run;
                const c = A[1] - mm * A[0];
                const [x1, y1, x2, y2] = lineSegment(mm, c, s);
                return <line x1={x1} y1={y1} x2={x2} y2={y2} className="plot-line plot-line-soft" />;
              })()
            ) : (
              <line x1={s.x(A[0])} x2={s.x(A[0])} y1={s.y(s.yRange[0])} y2={s.y(s.yRange[1])} className="plot-line plot-line-soft" />
            )}
            <line x1={s.x(A[0])} y1={s.y(A[1])} x2={s.x(B[0])} y2={s.y(A[1])} className="tri-run" />
            <line x1={s.x(B[0])} y1={s.y(A[1])} x2={s.x(B[0])} y2={s.y(B[1])} className="tri-rise" />
            <text x={(s.x(A[0]) + s.x(B[0])) / 2} y={s.y(A[1]) + (rise >= 0 ? 18 : -8)} textAnchor="middle" className="tri-label">
              run {run}
            </text>
            <text x={s.x(B[0]) + (run >= 0 ? 8 : -8)} y={(s.y(A[1]) + s.y(B[1])) / 2} textAnchor={run >= 0 ? 'start' : 'end'} className="tri-label">
              rise {rise}
            </text>
            <Draggable s={s} x={A[0]} y={A[1]} label="A" onMove={(x, y) => setA([x, y])} />
            <Draggable s={s} x={B[0]} y={B[1]} label="B" onMove={(x, y) => setB([x, y])} />
          </>
        )}
      </Plot>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function LineExplorer({ m: m0, c: c0 }: { m: number; c: number }) {
  const [m, setM] = useState(m0);
  const [c, setC] = useState(c0);
  const mTex = Number.isInteger(m) ? (m === 1 ? '' : m === -1 ? '-' : String(m)) : `${m < 0 ? '-' : ''}\\tfrac{${Math.abs(m * 2)}}{2}`;
  const eqTex = m === 0 ? `y = ${c}` : `y = ${mTex}x${c === 0 ? '' : c > 0 ? ` + ${c}` : ` - ${-c}`}`;
  const xInt = m === 0 ? null : -c / m;
  return (
    <div className="lex">
      <p className="widget-readout" aria-live="polite">
        <Tex tex={eqTex} />
        <span className="muted">
          Crosses the y-axis at {c}
          {xInt !== null ? ` and the x-axis at ${Math.round(xInt * 100) / 100}` : '. It is parallel to the x-axis'}.
        </span>
      </p>
      <Plot xRange={[-8, 8]} yRange={[-8, 8]} width={400} height={400} label={`Graph of ${eqTex.replace(/\\tfrac\{(\d+)\}\{(\d+)\}/g, '$1/$2')}`}>
        {(s) => {
          const [x1, y1, x2, y2] = lineSegment(m, c, s);
          return (
            <>
              <line x1={x1} y1={y1} x2={x2} y2={y2} className="plot-line" />
              {Math.abs(c) <= 8 ? <circle cx={s.x(0)} cy={s.y(c)} r={5} className="plot-point" /> : null}
              {Math.abs(c) <= 7 && Math.abs(c + m) <= 8 ? (
                <>
                  <line x1={s.x(0)} y1={s.y(c)} x2={s.x(1)} y2={s.y(c)} className="tri-run" />
                  <line x1={s.x(1)} y1={s.y(c)} x2={s.x(1)} y2={s.y(c + m)} className="tri-rise" />
                  <text x={s.x(1) + 6} y={(s.y(c) + s.y(c + m)) / 2 + 4} className="tri-label">
                    {m}
                  </text>
                </>
              ) : null}
            </>
          );
        }}
      </Plot>
      <div className="widget-controls">
        <Slider label="Gradient m" tex="m" value={m} min={-5} max={5} step={0.5} onChange={setM} />
        <Slider label="Intercept c" tex="c" value={c} min={-8} max={8} onChange={setC} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function ParabolaRoots({ p: p0, q: q0 }: { p: number; q: number }) {
  const [p, setP] = useState(p0);
  const [q, setQ] = useState(q0);
  const f = (x: number) => (x - p) * (x - q);
  const path = (s: Scale) => {
    const pts: string[] = [];
    for (let x = -8; x <= 8.001; x += 0.1) {
      const y = f(x);
      if (y > 12 || y < -14) continue;
      pts.push(`${pts.length ? 'L' : 'M'}${s.x(x).toFixed(1)} ${s.y(y).toFixed(1)}`);
    }
    return pts.join(' ');
  };
  const factorTex = `${binomial(1, 'x', -p)}${binomial(1, 'x', -q)}`;
  const expanded = sum([
    [1, 'x^2'],
    [-(p + q), 'x'],
    [p * q, ''],
  ]);
  return (
    <div className="pr">
      <p className="widget-readout" aria-live="polite">
        <Tex tex={`${factorTex} = 0 \\;\\Leftrightarrow\\; ${expanded} = 0`} />
        <span className="muted">
          Roots: <Tex tex={p === q ? `x = ${p}` : `x = ${p}\\text{ or }x = ${q}`} />, the values that make a bracket zero.
        </span>
      </p>
      <Plot xRange={[-8, 8]} yRange={[-14, 12]} width={400} height={400} label={`Parabola y = ${expanded} crossing the x-axis at ${p} and ${q}`}>
        {(s) => (
          <>
            <path d={path(s)} className="plot-line" fill="none" />
            <circle cx={s.x(p)} cy={s.y(0)} r={6} className="plot-point root-point" />
            <circle cx={s.x(q)} cy={s.y(0)} r={6} className="plot-point root-point" />
          </>
        )}
      </Plot>
      <div className="widget-controls">
        <Slider label="First root" value={p} min={-6} max={6} onChange={setP} />
        <Slider label="Second root" value={q} min={-6} max={6} onChange={setQ} />
      </div>
    </div>
  );
}

