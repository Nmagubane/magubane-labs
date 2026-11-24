/**
 * Exponent labs, Grades 7–9. SquareLab: a square of side n holds n² unit squares and a cube n³ unit cubes, so the
 * square root and cube root are the side you started from. FactorLab: write the powers out as factors and count them,
 * so each law is something the learner sees before they read it, including a⁰ = 1 and a⁻ⁿ = 1/aⁿ when the bottom of a
 * division has as many factors as the top, or more.
 */
import { useState } from 'react';
import { Segmented } from '../../ui/primitives.tsx';
import { Tex } from '../../ui/RichText.tsx';
import { Slider } from './MathWidgets.tsx';
import { Note } from './NstLabs.tsx';

/** The learner states the pattern after trying `need` different settings; the note then says it. */
function useExplore(need = 3) {
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set());
  const tried = (key: string) => setSeen((s) => (s.has(key) ? s : new Set(s).add(key)));
  return { explored: seen.size >= need, tried, seen };
}

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
/** a⁻³ in plain text, for the notes. */
const pow = (e: number) => `a${e === 1 ? '' : [...String(e)].map((c) => SUP[c] ?? c).join('')}`;
const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\\,');

// ---------------------------------------------------------------------------
export function SquareLab() {
  const [shape, setShape] = useState<'square' | 'cube'>('square');
  const [n, setN] = useState(4);
  const { explored, tried } = useExplore();
  const cube = shape === 'cube';
  const side = cube ? Math.min(n, 6) : n;
  const total = cube ? side ** 3 : side * side;
  const pick = (s: 'square' | 'cube') => {
    setShape(s);
    if (s === 'cube' && n > 6) setN(6);
  };
  return (
    <div className="geo-lab exp-lab">
      <Segmented
        label="Shape"
        value={shape}
        onChange={pick}
        options={[
          { value: 'square', label: 'Square' },
          { value: 'cube', label: 'Cube' },
        ]}
      />
      <p className="widget-readout" aria-live="polite">
        <Tex tex={cube ? `${side}^3 = ${side} \\times ${side} \\times ${side} = ${group(total)}` : `${side}^2 = ${side} \\times ${side} = ${total}`} />
        <Tex tex={cube ? `\\sqrt[3]{${total}} = ${side}` : `\\sqrt{${total}} = ${side}`} />
        {side > 1 ? <span className="muted">{`(${side} × ${cube ? 3 : 2} would be only ${side * (cube ? 3 : 2)})`}</span> : null}
      </p>
      {cube ? <CubePicture n={side} /> : <SquarePicture n={side} />}
      <div className="widget-controls">
        <Slider
          label={cube ? 'Edge' : 'Side'}
          value={side}
          min={1}
          max={cube ? 6 : 12}
          onChange={(v) => {
            setN(v);
            tried(`${shape}-${v}`);
          }}
        />
      </div>
      <Note ok={null}>
        <p>
          {!explored
            ? cube
              ? 'Change the edge. How many small cubes fill the big one? Count one layer, then the layers.'
              : 'Change the side. How many small squares fill the big one?'
            : cube
              ? `A cube with edge ${side} holds ${side} layers of ${side} × ${side}, so ${side}³ = ${total} small cubes. Going back, the cube root of ${total} is the edge: ${side}.`
              : `A square with side ${side} holds ${side} rows of ${side}, so ${side}² = ${total} small squares. Going back, the square root of ${total} is the side: ${side}.`}
        </p>
      </Note>
    </div>
  );
}

function SquarePicture({ n }: { n: number }) {
  const size = 220;
  const u = size / n;
  const lines = Array.from({ length: n + 1 }, (_, i) => i * u + 10);
  return (
    <svg viewBox="0 0 240 240" className="geo power-picture" role="img" aria-label={`A square with side ${n}, split into ${n} rows of ${n} small squares: ${n * n} altogether.`}>
      <rect x={10} y={10} width={size} height={size} className="geo-fill" />
      {lines.slice(1, -1).map((p) => (
        <g key={p}>
          <line x1={p} y1={10} x2={p} y2={10 + size} className="grid-thin" />
          <line x1={10} y1={p} x2={10 + size} y2={p} className="grid-thin" />
        </g>
      ))}
    </svg>
  );
}

function CubePicture({ n }: { n: number }) {
  const u = 105 / n;
  const [c30, s30] = [Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)];
  const P = (x: number, y: number, z: number) => ({ x: 150 + (x - y) * u * c30, y: 10 + n * u + (x + y) * u * s30 - z * u });
  const pts = (...ps: [number, number, number][]) => ps.map(([x, y, z]) => P(x, y, z)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const seg = (a: [number, number, number], b: [number, number, number], k: string) => {
    const [p, q] = [P(...a), P(...b)];
    return <line key={k} x1={p.x} y1={p.y} x2={q.x} y2={q.y} className="grid-thin" />;
  };
  const inner = Array.from({ length: Math.max(0, n - 1) }, (_, i) => i + 1);
  return (
    <svg viewBox="0 0 300 230" className="geo power-picture" role="img" aria-label={`A cube with edge ${n}, built from ${n} layers of ${n} by ${n} small cubes: ${n ** 3} altogether.`}>
      <polygon points={pts([0, 0, n], [n, 0, n], [n, n, n], [0, n, n])} className="geo-fill cube-top" />
      <polygon points={pts([n, 0, n], [n, n, n], [n, n, 0], [n, 0, 0])} className="geo-fill cube-right" />
      <polygon points={pts([0, n, n], [n, n, n], [n, n, 0], [0, n, 0])} className="geo-fill cube-left" />
      {inner.flatMap((i) => [
        seg([i, 0, n], [i, n, n], `t1-${i}`),
        seg([0, i, n], [n, i, n], `t2-${i}`),
        seg([n, i, 0], [n, i, n], `r1-${i}`),
        seg([n, 0, i], [n, n, i], `r2-${i}`),
        seg([i, n, 0], [i, n, n], `l1-${i}`),
        seg([0, n, i], [n, n, i], `l2-${i}`),
      ])}
    </svg>
  );
}

// ---------------------------------------------------------------------------
type Law = 'multiply' | 'divide' | 'power';

function Factors({ count, tone, gone = 0, label }: { count: number; tone: 'a' | 'b'; gone?: number; label: string }) {
  return (
    <span className="factor-group" role="img" aria-label={label}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={`factor factor-${tone}${i < gone ? ' gone' : ''}`} aria-hidden="true">
          a
        </span>
      ))}
    </span>
  );
}

export function FactorLab() {
  const [law, setLaw] = useState<Law>('multiply');
  const [m, setM] = useState(3);
  const [n, setN] = useState(2);
  const { explored, tried, seen } = useExplore();
  const choose = (l: Law) => {
    const nn = l === 'power' ? Math.min(n, 4) : n;
    setLaw(l);
    setN(nn);
    tried(`${l}-${m}-${nn}`);
  };
  const change = (mm: number, nn: number) => {
    setM(mm);
    setN(nn);
    tried(`${law}-${mm}-${nn}`);
  };
  const cancelled = Math.min(m, n);
  const d = m - n;
  const sawDivideEdge = [...seen].some((k) => k.startsWith('divide-') && Number(k.split('-')[1]) <= Number(k.split('-')[2]));

  const readout =
    law === 'multiply'
      ? `a^{${m}} \\times a^{${n}} = a^{${m} + ${n}} = a^{${m + n}}`
      : law === 'power'
        ? `(a^{${m}})^{${n}} = a^{${m} \\times ${n}} = a^{${m * n}}`
        : d > 0
          ? `\\dfrac{a^{${m}}}{a^{${n}}} = a^{${m} - ${n}} = a^{${d}}`
          : d === 0
            ? `\\dfrac{a^{${m}}}{a^{${n}}} = a^{${m} - ${n}} = a^{0} = 1`
            : `\\dfrac{a^{${m}}}{a^{${n}}} = a^{${m} - ${n}} = a^{${d}} = \\dfrac{1}{a^{${-d}}}`;

  const note = !explored
    ? 'Change the exponents and count the factors of a each time, before you read the answer at the top.'
    : law === 'multiply'
      ? `Multiplying puts the factors side by side: ${m} of them and ${n} more make ${m + n}. Same base, multiplying: add the exponents.`
      : law === 'power'
        ? `${n} groups of ${m} factors each: ${m} × ${n} = ${m * n} factors. A power of a power: multiply the exponents.`
        : d > 0
          ? `Each factor on the bottom cancels one on the top: ${n} cancel, ${d} ${d === 1 ? 'is' : 'are'} left. Same base, dividing: subtract the exponents.${sawDivideEdge ? '' : ' Now make the bottom exponent as big as the top one.'}`
          : d === 0
            ? 'Everything cancels and 1 is left, but subtracting the exponents gives 0. Both are right, so a⁰ = 1.'
            : `More factors on the bottom: ${-d} ${-d === 1 ? 'is' : 'are'} left there, so the answer is 1/${pow(-d)}. Subtracting the exponents gives ${d}, so a negative exponent means "one over": ${pow(d)} = 1/${pow(-d)}.`;

  return (
    <div className="geo-lab exp-lab">
      <Segmented
        label="Law"
        value={law}
        onChange={choose}
        options={[
          { value: 'multiply', label: 'Multiply' },
          { value: 'divide', label: 'Divide' },
          { value: 'power', label: 'Power of a power' },
        ]}
      />
      <p className="widget-readout" aria-live="polite">
        <Tex tex={readout} />
      </p>
      <div className="factor-board">
        {law === 'multiply' ? (
          <div className="factor-row">
            <span className="factor-bracket">(</span>
            <Factors count={m} tone="a" label={`${m} factors of a`} />
            <span className="factor-bracket">)</span>
            <span className="factor-op">×</span>
            <span className="factor-bracket">(</span>
            <Factors count={n} tone="b" label={`${n} more factors of a`} />
            <span className="factor-bracket">)</span>
          </div>
        ) : law === 'power' ? (
          <div className="factor-row">
            {Array.from({ length: n }, (_, g) => (
              <span key={g} className="factor-row-inline">
                {g > 0 ? <span className="factor-op">×</span> : null}
                <span className="factor-bracket">(</span>
                <Factors count={m} tone={g % 2 ? 'b' : 'a'} label={`group ${g + 1}: ${m} factors of a`} />
                <span className="factor-bracket">)</span>
              </span>
            ))}
          </div>
        ) : (
          <div className="factor-fraction">
            <div className="factor-row">{m ? <Factors count={m} tone="a" gone={cancelled} label={`top: ${m} factors of a, ${cancelled} cancelled`} /> : null}{m - cancelled === 0 ? <span className="factor-one">1</span> : null}</div>
            <div className="factor-bar" aria-hidden="true" />
            <div className="factor-row">{n ? <Factors count={n} tone="b" gone={cancelled} label={`bottom: ${n} factors of a, ${cancelled} cancelled`} /> : null}{n - cancelled === 0 ? <span className="factor-one">1</span> : null}</div>
          </div>
        )}
      </div>
      <div className="widget-controls">
        <Slider label="m" tex="m" value={m} min={1} max={6} onChange={(v) => change(v, n)} />
        <Slider label="n" tex="n" value={n} min={1} max={law === 'power' ? 4 : 6} onChange={(v) => change(m, v)} />
      </div>
      <Note ok={null}>
        <p>{note}</p>
      </Note>
    </div>
  );
}
