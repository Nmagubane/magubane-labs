/**
 * Equations and inequalities labs (Grades 10–11):
 * - lines: two straight lines and where they cross: one solution, none (parallel) or infinitely many (the same line);
 * - flip: multiply both sides of a true inequality by k and see the order of the two numbers reverse when k < 0;
 * - quadratic: a parabola through two roots and an inequality sign; the solution is marked on the x-axis.
 * (Conditions on k use the existing discriminant lab.)
 */
import { useState } from 'react';
import { Plot, type Scale } from '../../ui/Plot.tsx';
import { Tex, Rich } from '../../ui/RichText.tsx';
import { Slider } from './MathWidgets.tsx';
import { Note } from './NstLabs.tsx';
import { sample } from '../../../shared/questions/generators/math-graphs.ts';
import { rat, ratTex } from '../../../shared/questions/rational.ts';
import { sum } from '../../../shared/questions/tex.ts';
import { setTex, setText, type Interval } from '../../../shared/questions/inequality.ts';

/** Number for TeX and plain text, with a decimal comma. */
const n = (v: number, dp = 2) => {
  const r = Math.round(v * 10 ** dp) / 10 ** dp;
  return (Object.is(r, -0) ? 0 : r).toString().replace('.', '{,}');
};
const t = (v: number, dp = 2) => n(v, dp).replace('{,}', ',');

function Curve({ s, f, xr, yr, className }: { s: Scale; f: (x: number) => number; xr: [number, number]; yr: [number, number]; className: string }) {
  return (
    <>
      {sample(f, xr[0], xr[1], yr, 240).map((pts, i) => (
        <polyline key={i} points={pts.map(([x, y]) => `${s.x(x)},${s.y(y)}`).join(' ')} className={`plot-curve ${className}`} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------

function LinesMode() {
  const [m1, setM1] = useState(2);
  const [c1, setC1] = useState(-1);
  const [m2, setM2] = useState(-1);
  const [c2, setC2] = useState(5);
  const xr: [number, number] = [-8, 8];
  const yr: [number, number] = [-8, 8];
  const parallel = m1 === m2;
  const same = parallel && c1 === c2;
  const x = parallel ? null : rat(c2 - c1, m1 - m2);
  const y = x ? rat(m1 * x.n + c1 * x.d, x.d) : null;
  const xv = x ? x.n / x.d : 0;
  const yv = y ? y.n / y.d : 0;
  const line = (m: number, c: number) => `y = ${sum([[m, 'x'], [c, '']])}`;
  return (
    <>
      <div className="widget-readout ag-readout" aria-live="polite">
        <Tex tex={`${line(m1, c1)} \\quad\\text{and}\\quad ${line(m2, c2)}`} />
        {x && y ? (
          <Tex tex={`${sum([[m1, 'x'], [c1, '']])} = ${sum([[m2, 'x'], [c2, '']])} \\;\\Rightarrow\\; x = ${ratTex(x)},\\; y = ${ratTex(y)}`} />
        ) : (
          <Tex tex={same ? '\\text{The same line: every point on it is a solution}' : `\\text{Same gradient, different } c\\text{: the lines never meet}`} />
        )}
      </div>
      <Plot xRange={xr} yRange={yr} width={400} height={360} label={x && y ? `Two lines crossing at x = ${t(xv)}, y = ${t(yv)}.` : same ? 'Two lines on top of each other.' : 'Two parallel lines.'}>
        {(s) => (
          <>
            <Curve s={s} f={(v) => m1 * v + c1} xr={xr} yr={yr} className="plot-line" />
            <Curve s={s} f={(v) => m2 * v + c2} xr={xr} yr={yr} className={`plot-line pen${same ? ' dashed' : ''}`} />
            {x && y && Math.abs(xv) <= 8 && Math.abs(yv) <= 8 ? <circle cx={s.x(xv)} cy={s.y(yv)} r={6} className="plot-point pen" /> : null}
          </>
        )}
      </Plot>
      <div className="widget-controls">
        <Slider label="Gradient of the black line" tex="m_1" value={m1} min={-3} max={3} onChange={setM1} />
        <Slider label="y-intercept of the black line" tex="c_1" value={c1} min={-6} max={6} onChange={setC1} />
        <Slider label="Gradient of the blue line" tex="m_2" value={m2} min={-3} max={3} onChange={setM2} />
        <Slider label="y-intercept of the blue line" tex="c_2" value={c2} min={-6} max={6} onChange={setC2} />
      </div>
      <Note ok={parallel ? false : null}>
        <Rich
          as="p"
          text={
            parallel
              ? same
                ? 'Two equations for the same line: infinitely many solutions. The second equation tells you nothing new.'
                : 'Parallel lines: no point is on both, so the equations have **no solution**. Elimination ends in something false, like $0 = 4$.'
              : 'The solution of two equations is the point on **both** lines. Setting the right-hand sides equal is substitution: both equal $y$.'
          }
        />
      </Note>
    </>
  );
}

// ---------------------------------------------------------------------------

function FlipMode() {
  const [a, setA] = useState(2);
  const [b, setB] = useState(5);
  const [k, setK] = useState(-2);
  const ka = k * a;
  const kb = k * b;
  const sign = (p: number, q: number) => (p < q ? '<' : p > q ? '>' : '=');
  return (
    <>
      <div className="widget-readout ag-readout" aria-live="polite">
        <Tex tex={`\\text{Before: } ${a} ${sign(a, b)} ${b}`} />
        <Tex tex={`\\text{After } \\times (${k})\\text{: } ${ka} ${sign(ka, kb)} ${kb}`} />
      </div>
      <Plot xRange={[-18, 18]} yRange={[-1, 1]} width={400} height={110} hideY label={`On a number line: ${a} and ${b}, and after multiplying by ${k}: ${ka} and ${kb}.`}>
        {(s) => (
          <>
            {[
              [a, 'a', 'plot-point', -14],
              [b, 'b', 'plot-point', -14],
              [ka, 'ka', 'plot-point pen', 24],
              [kb, 'kb', 'plot-point pen', 24],
            ].map(([v, name, cls, dy]) => (
              <g key={name as string}>
                <circle cx={s.x(v as number)} cy={s.y(0)} r={6} className={cls as string} />
                <text x={s.x(v as number)} y={s.y(0) + (dy as number)} textAnchor="middle" className="plot-point-label">
                  {name as string}
                </text>
              </g>
            ))}
          </>
        )}
      </Plot>
      <div className="widget-controls">
        <Slider label="a" tex="a" value={a} min={-8} max={8} onChange={setA} />
        <Slider label="b" tex="b" value={b} min={-8} max={8} onChange={setB} />
        <Slider label="Multiply both sides by k" tex="k" value={k} min={-2} max={2} onChange={setK} />
      </div>
      <Note ok={a === b || k === 0 ? null : k < 0}>
        <Rich
          as="p"
          text={
            a === b
              ? 'Pick two different numbers.'
              : k === 0
                ? 'Multiplying by 0 makes both sides 0: you lose the inequality completely, so never multiply or divide an inequality by 0.'
                : k > 0
                  ? 'Multiplying by a positive number stretches the number line: the order stays the same, so the sign stays.'
                  : 'Multiplying by a negative number **reflects** the number line through 0: the smaller number becomes the bigger one, so the sign **reverses**.'
          }
        />
      </Note>
    </>
  );
}

// ---------------------------------------------------------------------------

type Op = '<' | '>' | '≤' | '≥';
const OPTS: Op[] = ['<', '≤', '>', '≥'];
const OPTEX: Record<Op, string> = { '<': '<', '>': '>', '≤': '\\le', '≥': '\\ge' };
const FLIP: Record<Op, Op> = { '<': '>', '>': '<', '≤': '≥', '≥': '≤' };

/** The solution of s(x - p)(x - q) op 0. Empty array: no solution. */
function solve(p: number, q: number, s: 1 | -1, op: Op): Interval[] {
  const o = s > 0 ? op : FLIP[op];
  const lo = rat(Math.min(p, q));
  const hi = rat(Math.max(p, q));
  const below = o === '<' || o === '≤';
  const incl = o === '≤' || o === '≥';
  if (p === q) {
    if (o === '<') return [];
    if (o === '≤') return [{ lo, hi: lo, loIn: true, hiIn: true }];
    if (o === '>') return [{ lo: null, hi: lo, loIn: false, hiIn: false }, { lo, hi: null, loIn: false, hiIn: false }];
    return [{ lo: null, hi: null, loIn: false, hiIn: false }];
  }
  return below ? [{ lo, hi, loIn: incl, hiIn: incl }] : [{ lo: null, hi: lo, loIn: false, hiIn: incl }, { lo: hi, hi: null, loIn: incl, hiIn: false }];
}

function QuadraticMode() {
  const [p, setP] = useState(-2);
  const [q, setQ] = useState(3);
  const [s, setS] = useState<1 | -1>(1);
  const [op, setOp] = useState<Op>('<');
  const f = (x: number) => s * (x - p) * (x - q);
  const xr: [number, number] = [-7, 7];
  const yr: [number, number] = [-12, 12];
  const set = solve(p, q, s, op);
  const fTex = `${s < 0 ? '-' : ''}${p === 0 ? 'x' : `(${sum([[1, 'x'], [-p, '']])})`}${q === 0 ? 'x' : `(${sum([[1, 'x'], [-q, '']])})`}`;
  const clip = (v: number | null, d: number) => (v === null ? d : Math.max(xr[0], Math.min(xr[1], v)));
  return (
    <>
      <div className="widget-readout ag-readout" aria-live="polite">
        <Tex tex={`${fTex} ${OPTEX[op]} 0`} />
        <Tex tex={set.length ? `\\Rightarrow\\; ${set.length === 1 && set[0]!.lo === null && set[0]!.hi === null ? 'x \\in \\mathbb{R}' : setTex(set)}` : '\\Rightarrow\\; \\text{no real } x'} />
      </div>
      <Plot xRange={xr} yRange={yr} width={400} height={340} label={`The parabola y = ${fTex.replace(/[{}]/g, '')}. The solution of the inequality, ${set.length ? setText(set) : 'no real x'}, is marked on the x-axis.`}>
        {(sc) => (
          <>
            <Curve s={sc} f={f} xr={xr} yr={yr} className="plot-line" />
            {set.map((iv, i) => {
              const x1 = clip(iv.lo ? iv.lo.n : null, xr[0]);
              const x2 = clip(iv.hi ? iv.hi.n : null, xr[1]);
              return (
                <g key={i}>
                  <line x1={sc.x(x1)} x2={sc.x(x2)} y1={sc.y(0)} y2={sc.y(0)} className="nl-set" />
                  {iv.lo ? <circle cx={sc.x(iv.lo.n)} cy={sc.y(0)} r={5.5} className={`nl-dot ${iv.loIn ? 'closed' : 'open'}`} /> : null}
                  {iv.hi && !(iv.lo && iv.lo.n === iv.hi.n) ? <circle cx={sc.x(iv.hi.n)} cy={sc.y(0)} r={5.5} className={`nl-dot ${iv.hiIn ? 'closed' : 'open'}`} /> : null}
                </g>
              );
            })}
            {p === q && op === (s > 0 ? '>' : '<') ? <circle cx={sc.x(p)} cy={sc.y(0)} r={5.5} className="nl-dot open" /> : null}
          </>
        )}
      </Plot>
      <div className="widget-controls">
        <Slider label="First root" tex="p" value={p} min={-5} max={5} onChange={setP} />
        <Slider label="Second root" tex="q" value={q} min={-5} max={5} onChange={setQ} />
        <label className="field compact">
          <span>Sign</span>
          <select value={op} onChange={(e) => setOp(e.target.value as Op)}>
            {OPTS.map((o) => (
              <option key={o} value={o}>
                {o} 0
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setS(s > 0 ? -1 : 1)} aria-pressed={s < 0}>
          {s > 0 ? 'Turn it upside down' : 'Turn it the right way up'}
        </button>
      </div>
      <Note ok={null}>
        <Rich
          as="p"
          text={
            p === q
              ? 'Equal roots: the parabola only touches the axis. A square is never negative, so the answers are "one value", "all but one value", "every $x$" or "no $x$".'
              : `The graph is ${s > 0 ? 'below' : 'above'} the axis **between** the roots and ${s > 0 ? 'above' : 'below'} it **outside** them. ${op === '<' || op === '>' ? 'A strict sign leaves the roots out (open dots).' : 'With ≤ or ≥ the roots are included (closed dots).'}`
          }
        />
      </Note>
    </>
  );
}

export function EquationLab({ mode }: { mode: 'lines' | 'flip' | 'quadratic' }) {
  return mode === 'lines' ? <LinesMode /> : mode === 'flip' ? <FlipMode /> : <QuadraticMode />;
}
