/**
 * Grade 10 algebra labs:
 * - grid: (x + p)(x² + qx + r) as a 2 × 3 table of products; like terms share a colour. Choosing q and r so
 *   the x² and x terms cancel turns it into a sum or difference of cubes;
 * - cancel: put numbers into an algebraic fraction, its correct simplification and a tempting wrong one.
 */
import { useState } from 'react';
import { Tex, Rich } from '../../ui/RichText.tsx';
import { Slider } from './MathWidgets.tsx';
import { Note } from './NstLabs.tsx';

/** A term c·x^k in TeX, as the first term or with its sign. */
function termTex(c: number, k: number, first: boolean): string {
  if (c === 0) return first ? '0' : '';
  const abs = Math.abs(c);
  const v = k === 0 ? '' : k === 1 ? 'x' : `x^{${k}}`;
  const body = k === 0 ? String(abs) : abs === 1 ? v : `${abs}${v}`;
  return first ? `${c < 0 ? '-' : ''}${body}` : ` ${c < 0 ? '-' : '+'} ${body}`;
}
/** Polynomial TeX from coefficients, highest power first: [1, 0, -8] is x² − 8. */
function polyTex(cs: number[]): string {
  const deg = cs.length - 1;
  let out = '';
  cs.forEach((c, i) => {
    if (c !== 0) out += termTex(c, deg - i, out === '');
  });
  return out || '0';
}

function GridMode() {
  const [p, setP] = useState(-2);
  const [q, setQ] = useState(3);
  const [r, setR] = useState(1);
  const rows: [number, number][] = [
    [1, 1],
    [p, 0],
  ]; // coefficient, power
  const cols: [number, number][] = [
    [1, 2],
    [q, 1],
    [r, 0],
  ];
  const x2 = q + p;
  const x1 = r + p * q;
  const result = [1, x2, x1, p * r];
  const cubes = x2 === 0 && x1 === 0 && p !== 0;
  return (
    <>
      <div className="widget-readout" aria-live="polite">
        <Tex tex={`(${polyTex([1, p])})(${polyTex([1, q, r])}) = ${polyTex(result)}`} />
      </div>
      <table className="alg-grid">
        <caption className="sr-only">Every term of the first bracket times every term of the second</caption>
        <thead>
          <tr>
            <th scope="col">
              <span aria-hidden="true">×</span>
              <span className="sr-only">times</span>
            </th>
            {cols.map(([c, k], j) => (
              <th key={j} scope="col">
                <Tex tex={termTex(c, k, true)} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([a, ka], i) => (
            <tr key={i}>
              <th scope="row">
                <Tex tex={termTex(a, ka, true)} />
              </th>
              {cols.map(([c, kc], j) => {
                const power = ka + kc;
                return (
                  <td key={j} className={`like-${power}${a * c === 0 ? ' zero' : ''}`}>
                    <Tex tex={termTex(a * c, power, true)} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small alg-key">
        Cells with the same colour are like terms: <Tex tex={`${termTex(q, 2, true)}${termTex(p, 2, q === 0)} = ${termTex(x2, 2, true)}`} /> and <Tex tex={`${termTex(r, 1, true)}${termTex(p * q, 1, r === 0)} = ${termTex(x1, 1, true)}`} />.
      </p>
      <div className="widget-controls">
        <Slider label="p" tex="p" value={p} min={-5} max={5} onChange={setP} />
        <Slider label="q" tex="q" value={q} min={-10} max={10} onChange={setQ} />
        <Slider label="r" tex="r" value={r} min={-10} max={25} onChange={setR} />
      </div>
      <Note ok={cubes ? true : null}>
        <Rich
          as="p"
          text={
            cubes
              ? `The $x^2$ terms and the $x$ terms cancel, leaving $${polyTex(result)}$: a ${p < 0 ? 'difference' : 'sum'} of two cubes. So $${polyTex(result)} = (${polyTex([1, p])})(${polyTex([1, q, r])})$. Notice $q = ${q}$ is $p$ with its sign changed, and $r = ${r}$ is $p^2$.`
              : p === 0
                ? 'With $p = 0$ the first bracket is just $x$. Choose another $p$.'
                : 'Six products, then like terms collected. Can you choose $q$ and $r$ so that both the $x^2$ terms and the $x$ terms cancel?'
          }
        />
      </Note>
    </>
  );
}

// ---- Cancel factors, not terms: (x² + x − 6)/(x² − 4) = (x + 3)/(x + 2), x ≠ 2 ----
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
function fracTex(n: number, d: number): string {
  if (d === 0) return n === 0 ? '\\dfrac{0}{0}' : `\\dfrac{${n}}{0}`;
  const g = gcd(n, d) || 1;
  const [a, b] = [(n / g) * Math.sign(d), Math.abs(d / g)];
  return b === 1 ? String(a) : `${a < 0 ? '-' : ''}\\dfrac{${Math.abs(a)}}{${b}}`;
}

function CancelMode() {
  const [x, setX] = useState(3);
  const topO = x * x + x - 6;
  const botO = x * x - 4;
  const rows = [
    { label: 'Original', tex: '\\dfrac{x^2 + x - 6}{x^2 - 4}', n: topO, d: botO },
    { label: 'Cancel the factor (x − 2)', tex: '\\dfrac{x + 3}{x + 2}', n: x + 3, d: x + 2 },
    { label: 'Cross out x² and x', tex: '\\dfrac{-6}{-4} = \\dfrac{3}{2}', n: 3, d: 2 },
  ];
  const original = botO === 0 ? null : topO / botO;
  const note =
    x === 2
      ? 'At $x = 2$ the original is $\\dfrac{0}{0}$: not defined. The simplified fraction gives $\\tfrac{5}{4}$ there, so it equals the original only for $x \\ne 2$. Write the restriction with your answer.'
      : x === -2
        ? 'At $x = -2$ both bottoms are $0$: neither is defined. That is a real restriction, not one created by cancelling.'
        : x === 0
          ? 'At $x = 0$ the wrong one happens to agree with the original. Testing one value proves nothing: try another.'
          : 'Cancelling the **factor** $(x - 2)$ gives the same value for every $x$ you try (apart from $x = 2$). Crossing out **terms** does not.';
  return (
    <>
      <div className="widget-readout" aria-live="polite">
        <Tex tex={`x = ${x}`} />
      </div>
      <table className="alg-test">
        <caption className="sr-only">Values at x = {x}</caption>
        <tbody>
          {rows.map((row, i) => {
            const v = row.d === 0 ? null : row.n / row.d;
            const same = original !== null && v !== null && Math.abs(v - original) < 1e-12;
            return (
              <tr key={i}>
                <th scope="row">
                  <span className="alg-test-label">{row.label}</span>
                  <Tex tex={row.tex} />
                </th>
                <td className="num">
                  <Tex tex={fracTex(row.n, row.d)} />
                  {row.d === 0 ? <span className="muted small"> not defined</span> : null}
                </td>
                <td className="alg-test-mark">{i === 0 ? null : same ? <span className="tick">✓ same</span> : <span className="muted">✗ different</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="widget-controls">
        <Slider label="x" tex="x" value={x} min={-6} max={6} onChange={setX} />
      </div>
      <Note ok={x === 2 || x === 0 ? null : true}>
        <Rich as="p" text={note} />
      </Note>
    </>
  );
}

export function AlgebraLab({ mode }: { mode: 'grid' | 'cancel' }) {
  return mode === 'grid' ? <GridMode /> : <CancelMode />;
}
