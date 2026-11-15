/**
 * Number labs (Grades 10–12):
 * - surd: a square of area n is cut into k × k small squares of area s, so its side √n is k√s;
 * - differences: a quadratic pattern with its first and second differences, and its graph of dots;
 * - series: partial sums of a geometric series closing in on S∞, or running away when |r| ≥ 1.
 */
import { useState } from 'react';
import { Plot } from '../../ui/Plot.tsx';
import { Tex, Rich } from '../../ui/RichText.tsx';
import { Slider } from './MathWidgets.tsx';
import { Note } from './NstLabs.tsx';
import { extract } from '../../../shared/questions/surd.ts';

const dec = (v: number, dp = 3) => String(Math.round(v * 10 ** dp) / 10 ** dp).replace('.', '{,}');
const txt = (v: number, dp = 3) => dec(v, dp).replace('{,}', ',');

function SurdMode() {
  const [n, setN] = useState(72);
  const { k, s } = extract(n);
  const size = 220;
  const cell = size / k;
  const simplified = k === 1 ? `\\sqrt{${n}}` : s === 1 ? `${k}` : `${k}\\sqrt{${s}}`;
  return (
    <>
      <div className="widget-readout ag-readout" aria-live="polite">
        <Tex tex={k === 1 ? `\\sqrt{${n}} \\text{ has no square factor: it is already simplest}` : `\\sqrt{${n}} = \\sqrt{${k * k} \\times ${s}} = \\sqrt{${k * k}} \\times \\sqrt{${s}} = ${simplified}`} />
      </div>
      <svg className="surd-square" viewBox={`-10 -10 ${size + 60} ${size + 30}`} role="img" aria-label={`A square of area ${n}, cut into ${k * k} small squares of area ${s}. Its side is ${k === 1 ? `root ${n}` : s === 1 ? k : `${k} root ${s}`}.`}>
        {Array.from({ length: k * k }, (_, j) => (
          <rect key={j} x={(j % k) * cell} y={Math.floor(j / k) * cell} width={cell} height={cell} className="surd-cell" />
        ))}
        <rect x={0} y={0} width={size} height={size} className="surd-outline" />
        <text x={size / 2} y={size + 18} textAnchor="middle" className="plot-point-label">
          side = {k === 1 ? `√${n}` : s === 1 ? k : `${k}√${s}`}
        </text>
        {k > 1 && s > 1 ? (
          <text x={size + 6} y={cell / 2 + 4} className="plot-point-label">
            area {s}
          </text>
        ) : null}
      </svg>
      <div className="widget-controls">
        <Slider label="Area of the square" value={n} min={2} max={200} onChange={setN} />
      </div>
      <Note ok={k > 1 && s > 1 ? true : null}>
        <Rich
          as="p"
          text={
            s === 1
              ? `${n} is a perfect square, so its root is the whole number ${k}.`
              : k === 1
                ? `${n} has no square factor bigger than 1, so $\\sqrt{${n}}$ can't be simplified. Try 72, 50 or 108.`
                : `The big square is ${k} small squares wide, and each small square has side $\\sqrt{${s}}$. So the side is $${k}\\sqrt{${s}}$. Use the **largest** square factor (${k * k}) to simplify in one step.`
          }
        />
      </Note>
    </>
  );
}

function DifferencesMode() {
  const [t1, setT1] = useState(3);
  const [f1, setF1] = useState(2);
  const [D, setD] = useState(2);
  const T = (n: number) => t1 + f1 * (n - 1) + (D * (n - 1) * (n - 2)) / 2;
  const ns = [1, 2, 3, 4, 5, 6];
  const terms = ns.map(T);
  const first = terms.slice(1).map((t, j) => t - terms[j]!);
  const second = first.slice(1).map((t, j) => t - first[j]!);
  const a = D / 2;
  const b = f1 - 3 * a;
  const c = t1 - a - b;
  const coef = (v: number, x: string, firstTerm: boolean) => {
    if (v === 0) return '';
    const abs = Math.abs(v);
    const body = x && abs === 1 ? x : `${dec(abs)}${x}`;
    return firstTerm ? `${v < 0 ? '-' : ''}${body}` : ` ${v < 0 ? '-' : '+'} ${body}`;
  };
  const formula = [coef(a, 'n^2', true), coef(b, 'n', a === 0), coef(c, '', a === 0 && b === 0)].join('') || '0';
  const vals = ns.map(T);
  const lo = Math.min(0, ...vals);
  const hi = Math.max(1, ...vals);
  const pad = Math.max(2, Math.ceil((hi - lo) * 0.1));
  return (
    <>
      <table className="diff-table">
        <tbody>
          <tr>
            <th scope="row">Terms</th>
            {terms.map((t, j) => (
              <td key={j} colSpan={2}>
                {t}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">First differences</th>
            <td />
            {first.map((t, j) => (
              <td key={j} colSpan={2}>
                {t}
              </td>
            ))}
            <td />
          </tr>
          <tr>
            <th scope="row">Second differences</th>
            <td colSpan={2} />
            {second.map((t, j) => (
              <td key={j} colSpan={2} className="diff-second">
                {t}
              </td>
            ))}
            <td colSpan={2} />
          </tr>
        </tbody>
      </table>
      <div className="widget-readout ag-readout" aria-live="polite">
        <Tex tex={`2a = ${D} \\Rightarrow a = ${dec(a)};\\quad T_n = ${formula}`} />
      </div>
      <Plot padLeft={30} xRange={[0, 7]} yRange={[lo - pad, hi + pad]} width={400} height={240} label={`The terms ${terms.join(', ')} plotted against n.`}>
        {(s) => (
          <>
            {ns.map((n) => (
              <circle key={n} cx={s.x(n)} cy={s.y(T(n))} r={5} className="plot-point pen" />
            ))}
          </>
        )}
      </Plot>
      <div className="widget-controls">
        <Slider label="First term" tex="T_1" value={t1} min={-10} max={10} onChange={setT1} />
        <Slider label="First difference" value={f1} min={-8} max={8} onChange={setF1} />
        <Slider label="Second difference" value={D} min={-4} max={6} onChange={setD} />
      </div>
      <Note ok={null}>
        <Rich
          as="p"
          text={D === 0 ? 'Second difference 0: the first differences are constant, so the pattern is **linear** and its dots lie on a straight line.' : `The second difference is $2a$. When it is constant the pattern is quadratic, and its dots lie on a parabola${D > 0 ? ' opening upwards' : ' opening downwards'}.`}
        />
      </Note>
    </>
  );
}

function SeriesMode() {
  const [r10, setR10] = useState(5);
  const r = r10 / 10;
  const a = 1;
  const N = 20;
  const sums: number[] = [];
  let S = 0;
  for (let k = 0; k < N; k++) {
    S += a * r ** k;
    sums.push(S);
  }
  const converges = Math.abs(r) < 1;
  const Sinf = converges ? a / (1 - r) : null;
  const yMax = Math.min(25, Math.max(2, ...sums.map((v) => Math.abs(v))) * 1.1);
  const yMin = Math.max(-25, Math.min(0, ...sums) * 1.1);
  return (
    <>
      <div className="widget-readout ag-readout" aria-live="polite">
        <Tex tex={`1 ${r < 0 ? '-' : '+'} ${dec(Math.abs(r), 1)} ${r < 0 ? '+' : '+'} ${dec(r * r, 2)} ${r < 0 ? '-' : '+'} \\dots`} />
        <Tex tex={converges ? `S_\\infty = \\dfrac{1}{1 - (${dec(r, 1)})} = ${dec(Sinf!)}` : `|r| \\ge 1: \\text{ no sum to infinity}`} />
      </div>
      <Plot padLeft={30} xRange={[0, N + 1]} yRange={[yMin, yMax]} width={400} height={260} label={converges ? `Partial sums of a geometric series with r = ${txt(r, 1)} approach ${txt(Sinf!)}.` : `Partial sums of a geometric series with r = ${txt(r, 1)} do not settle.`}>
        {(s) => (
          <>
            {Sinf !== null ? <line x1={s.x(0)} x2={s.x(N + 1)} y1={s.y(Sinf)} y2={s.y(Sinf)} className="plot-segment dashed" /> : null}
            {sums.map((v, j) =>
              Math.abs(v) <= 25 ? <circle key={j} cx={s.x(j + 1)} cy={s.y(v)} r={4} className="plot-point pen" /> : null,
            )}
          </>
        )}
      </Plot>
      <p className="small">Partial sums S₁, S₂, …, S₂₀ against the number of terms. Dashed: the sum to infinity.</p>
      <div className="widget-controls">
        <Slider label="Common ratio" tex="r" value={r10} min={-12} max={12} onChange={setR10} format={(v) => txt(v / 10, 1)} />
      </div>
      <Note ok={converges ? true : false}>
        <Rich
          as="p"
          text={
            converges
              ? `With $-1 < r < 1$ each term is smaller than the one before, and the partial sums settle on $S_\\infty = \\dfrac{a}{1 - r}$.${r < 0 ? ' A negative $r$ makes them jump above and below it.' : ''}`
              : `With $|r| \\ge 1$ the terms don't shrink, so the sums never settle: the series diverges and has no sum to infinity.`
          }
        />
      </Note>
    </>
  );
}

export function NumberLab({ mode }: { mode: 'surd' | 'differences' | 'series' }) {
  return mode === 'surd' ? <SurdMode /> : mode === 'differences' ? <DifferencesMode /> : <SeriesMode />;
}
