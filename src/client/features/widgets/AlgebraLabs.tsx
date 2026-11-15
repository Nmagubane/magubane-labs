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

// ---- Completing the square, drawn: x² + bx is a square and two strips; the corner (b/2)² completes it ----
function SquareMode() {
  const [b, setB] = useState(6);
  const [c, setC] = useState(2);
  const h = b / 2;
  const X = 150; // drawn size of x
  const u = 22; // pixels per unit for b/2
  const H = Math.abs(h) * u;
  const hTex = Number.isInteger(h) ? String(Math.abs(h)) : `\\tfrac{${Math.abs(b)}}{2}`;
  const sq = h * h;
  const sqTex = Number.isInteger(sq) ? String(sq) : `\\tfrac{${b * b}}{4}`;
  const q = c - sq;
  const qTex = Number.isInteger(q) ? `${q < 0 ? '-' : '+'} ${Math.abs(q)}` : `${q < 0 ? '-' : '+'} \\tfrac{${Math.abs(4 * c - b * b)}}{4}`;
  const sign = b < 0 ? '-' : '+';
  const size = X + H + 40;
  const dec = (v: number) => String(v).replace('.', ',');
  return (
    <>
      <div className="widget-readout" aria-live="polite">
        <Tex tex={`x^2 ${sign} ${Math.abs(b) === 1 ? '' : Math.abs(b)}x ${c < 0 ? '-' : '+'} ${Math.abs(c)} = \\left(x ${sign} ${hTex}\\right)^2 - ${sqTex} ${c < 0 ? '-' : '+'} ${Math.abs(c)} = \\left(x ${sign} ${hTex}\\right)^2 ${q === 0 ? '' : qTex}`} />
      </div>
      <svg className="cs-figure" viewBox={`-30 -10 ${size + 90} ${size}`} role="img" aria-label={`A square of side x, two strips of x by ${Math.abs(h)}, and a missing corner of ${Math.abs(h)} by ${Math.abs(h)}, area ${sq}, which completes a square of side x plus ${Math.abs(h)}.`}>
        <rect x={0} y={0} width={X} height={X} className="cs-x2" />
        <rect x={X} y={0} width={H} height={X} className="cs-strip" />
        <rect x={0} y={X} width={X} height={H} className="cs-strip" />
        <rect x={X} y={X} width={H} height={H} className="cs-corner" />
        <text x={X / 2} y={X / 2 + 5} textAnchor="middle" className="cs-label">x²</text>
        {H > 14 ? (
          <>
            <text x={X + H / 2} y={X / 2 + 5} textAnchor="middle" className="cs-label">{`${dec(Math.abs(h))}x`}</text>
            <text x={X / 2} y={X + H / 2 + 5} textAnchor="middle" className="cs-label">{`${dec(Math.abs(h))}x`}</text>
          </>
        ) : null}
        <text x={X / 2} y={-2} textAnchor="middle" className="plot-point-label">x</text>
        <text x={-8} y={X / 2} textAnchor="end" className="plot-point-label">x</text>
        <text x={X + H + 4} y={X + H / 2 + 4} className="plot-point-label">{`${dec(Math.abs(h))}² = ${dec(sq)}`}</text>
      </svg>
      <div className="widget-controls">
        <Slider label="Coefficient of x" tex="b" value={b} min={-10} max={10} onChange={(v) => setB(v === 0 ? 1 : v)} />
        <Slider label="Constant" tex="c" value={c} min={-10} max={20} onChange={setC} />
      </div>
      <Note ok={null}>
        <Rich
          as="p"
          text={`The $x^2$ square and the two strips of $${hTex} \\times x$ are $x^2 ${sign} ${Math.abs(b) === 1 ? '' : Math.abs(b)}x$. They are a square of side $x ${sign} ${hTex}$ with one corner missing: the corner is $${hTex}^2 = ${sqTex}$. So add the corner and take it away again: $x^2 ${sign} ${Math.abs(b) === 1 ? '' : Math.abs(b)}x = (x ${sign} ${hTex})^2 - ${sqTex}$.${b < 0 ? ' (With a negative $b$ the strips are taken away, but the algebra is the same.)' : ''}`}
        />
      </Note>
    </>
  );
}

// ---- Decimal digits: fractions always repeat, roots and π never do ----
/** Digits after the comma of n/d by long division, and where the repeating block starts and how long it is. */
function fractionDigits(n: number, d: number, count: number): { whole: number; digits: string; start: number; len: number } {
  const whole = Math.floor(n / d);
  let r = n % d;
  const seen = new Map<number, number>();
  let digits = '';
  let start = -1;
  let len = 0;
  for (let i = 0; i < count; i++) {
    if (r === 0) break;
    if (start < 0 && seen.has(r)) {
      start = seen.get(r) as number;
      len = i - start;
    }
    if (!seen.has(r)) seen.set(r, i);
    r *= 10;
    digits += String(Math.floor(r / d));
    r %= d;
  }
  return { whole, digits, start, len };
}
/** √n to `count` decimal places with whole-number arithmetic (BigInt), so every digit shown is exact. */
function rootDigits(n: number, count: number): { whole: number; digits: string } {
  const scale = 10n ** BigInt(count);
  const target = BigInt(n) * scale * scale;
  let x = BigInt(Math.floor(Math.sqrt(n) * 1e6)) * (scale / 1000000n || 1n);
  for (let i = 0; i < 100; i++) {
    const y = (x + target / x) / 2n;
    if (y === x || y === x - 1n || y === x + 1n) {
      x = y;
      break;
    }
    x = y;
  }
  while (x * x > target) x -= 1n;
  while ((x + 1n) * (x + 1n) <= target) x += 1n;
  const s = x.toString().padStart(count + 1, '0');
  return { whole: Number(s.slice(0, s.length - count)), digits: s.slice(s.length - count) };
}
const PI_DIGITS = '14159265358979323846264338327950288419716939937510'; // first 50 decimals of π

const NUMBERS: { id: string; say: string; tex: string; kind: 'fraction' | 'root' | 'pi'; n: number; d: number }[] = [
  { id: '1/7', say: 'one seventh', tex: '\\tfrac{1}{7}', kind: 'fraction', n: 1, d: 7 },
  { id: '5/12', say: 'five twelfths', tex: '\\tfrac{5}{12}', kind: 'fraction', n: 5, d: 12 },
  { id: '3/8', say: 'three eighths', tex: '\\tfrac{3}{8}', kind: 'fraction', n: 3, d: 8 },
  { id: '7/13', say: 'seven thirteenths', tex: '\\tfrac{7}{13}', kind: 'fraction', n: 7, d: 13 },
  { id: '22/7', say: '22 sevenths', tex: '\\tfrac{22}{7}', kind: 'fraction', n: 22, d: 7 },
  { id: 'r2', say: 'square root of 2', tex: '\\sqrt{2}', kind: 'root', n: 2, d: 1 },
  { id: 'r10', say: 'square root of 10', tex: '\\sqrt{10}', kind: 'root', n: 10, d: 1 },
  { id: 'pi', say: 'pi', tex: '\\pi', kind: 'pi', n: 0, d: 1 },
];

function DecimalsMode() {
  const [id, setId] = useState('1/7');
  const item = NUMBERS.find((x) => x.id === id) ?? (NUMBERS[0] as (typeof NUMBERS)[number]);
  const COUNT = 36;
  const frac = item.kind === 'fraction' ? fractionDigits(item.n, item.d, COUNT) : null;
  const root = item.kind === 'root' ? rootDigits(item.n, COUNT) : null;
  const whole = frac ? frac.whole : root ? root.whole : 3;
  const digits = frac ? frac.digits : root ? root.digits : PI_DIGITS.slice(0, COUNT);
  const terminates = frac !== null && frac.digits.length < COUNT && frac.start < 0;
  const note = frac
    ? terminates
      ? `$${item.tex}$ stops after ${frac.digits.length} decimal place${frac.digits.length === 1 ? '' : 's'}: a terminating decimal, so it is rational.`
      : `The highlighted block of ${frac.len} digit${frac.len === 1 ? '' : 's'} repeats for ever. Dividing by ${item.d} leaves at most ${item.d - 1} different remainders, so the digits **must** start repeating: every fraction is a terminating or recurring decimal.${item.id === '22/7' ? ' $\\tfrac{22}{7}$ is close to $\\pi$ for two decimal places, then the two part ways: $\\pi$ never repeats.' : ''}`
    : `These digits never settle into a repeating block, however far you go. A number like that can't be a fraction: $${item.tex}$ is irrational.`;
  return (
    <>
      <div className="dec-pick" role="group" aria-label="Choose a number">
        {NUMBERS.map((x) => (
          <button key={x.id} type="button" className={`chip${x.id === id ? ' on' : ''}`} aria-pressed={x.id === id} aria-label={x.say} onClick={() => setId(x.id)}>
            <Tex tex={x.tex} />
          </button>
        ))}
      </div>
      <p className="dec-digits" aria-label={`${whole} comma ${digits.split('').join(' ')} and so on`}>
        <span>{whole},</span>
        {digits.split('').map((ch, i) => {
          const inBlock = frac && frac.start >= 0 && i >= frac.start && i < frac.start + frac.len;
          const repeatAgain = frac && frac.start >= 0 && i >= frac.start + frac.len;
          return (
            <span key={i} className={inBlock ? 'dec-block' : repeatAgain ? 'dec-again' : undefined}>
              {ch}
            </span>
          );
        })}
        {terminates ? null : <span className="muted">…</span>}
      </p>
      <Note ok={null}>
        <Rich as="p" text={note} />
      </Note>
    </>
  );
}

export function AlgebraLab({ mode }: { mode: 'grid' | 'cancel' | 'square' | 'decimals' }) {
  return mode === 'grid' ? <GridMode /> : mode === 'cancel' ? <CancelMode /> : mode === 'square' ? <SquareMode /> : <DecimalsMode />;
}
