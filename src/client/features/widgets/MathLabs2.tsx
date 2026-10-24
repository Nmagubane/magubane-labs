/** Maths labs for Grades 4–6: place value, multiplication arrays, fractions of a set, decimals, perimeter and area. */
import { useState } from 'react';
import { Button } from '../../ui/primitives.tsx';
import { Tex } from '../../ui/RichText.tsx';
import { Slider, Stepper } from './MathWidgets.tsx';
import { Note } from './NstLabs.tsx';

const grp = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

// ---------------------------------------------------------------------------
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function under100(n: number): string {
  if (n < 20) return ONES[n]!;
  return TENS[Math.floor(n / 10)]! + (n % 10 ? `-${ONES[n % 10]}` : '');
}
function under1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (!h) return under100(r);
  return `${ONES[h]} hundred${r ? ` and ${under100(r)}` : ''}`;
}
/** English number words, South African style ("four hundred and six"). Up to 999 999. */
export function numberWords(n: number): string {
  if (n === 0) return 'zero';
  const th = Math.floor(n / 1000);
  const r = n % 1000;
  const parts: string[] = [];
  if (th) parts.push(`${under1000(th)} thousand`);
  if (r) parts.push(th && r < 100 ? `and ${under100(r)}` : under1000(r));
  return parts.join(' ');
}

const PLACES = ['Ten thousands', 'Thousands', 'Hundreds', 'Tens', 'Units'];
const SHORT = ['TTh', 'Th', 'H', 'T', 'U'];
const PLACE_VAL = [10000, 1000, 100, 10, 1];

export function PlaceValueChart({ start }: { start: number }) {
  const [d, setD] = useState(() => String(start).padStart(5, '0').slice(-5).split('').map(Number));
  const n = d.reduce((a, v, i) => a + v * PLACE_VAL[i]!, 0);
  const set = (i: number, v: number) => setD(d.map((x, j) => (j === i ? (v + 10) % 10 : x)));
  const times10 = () => d[0] === 0 && setD([...d.slice(1), 0]);
  const parts = d.map((v, i) => v * PLACE_VAL[i]!).filter((v) => v > 0);
  return (
    <div className="pv">
      <p className="widget-readout" aria-live="polite">
        <strong className="num pv-big">{grp(n)}</strong>
        <span className="muted">{numberWords(n)}</span>
      </p>
      <div className="pv-chart" role="group" aria-label="Place-value chart">
        {d.map((v, i) => (
          <div key={i} className={`pv-col${v ? '' : ' zero'}`}>
            <span className="pv-head">
              <span className="pv-long">{PLACES[i]}</span>
              <abbr className="pv-short" title={PLACES[i]}>
                {SHORT[i]}
              </abbr>
            </span>
            <button type="button" className="key" aria-label={`More ${PLACES[i]!.toLowerCase()}`} onClick={() => set(i, v + 1)}>
              +
            </button>
            <output className="num pv-digit" aria-label={`${PLACES[i]}: ${v}`}>
              {v}
            </output>
            <button type="button" className="key" aria-label={`Fewer ${PLACES[i]!.toLowerCase()}`} onClick={() => set(i, v - 1)}>
              −
            </button>
            <span className="pv-val num">{grp(v * PLACE_VAL[i]!)}</span>
          </div>
        ))}
      </div>
      <p className="pv-expanded">
        <Tex tex={parts.length ? `${parts.map((p) => grp(p).replace(/ /g, '\\,')).join(' + ')} = ${grp(n).replace(/ /g, '\\,')}` : '0'} />
      </p>
      <div className="widget-controls">
        <Button size="sm" variant="secondary" onClick={times10} disabled={d[0] !== 0}>
          × 10
        </Button>
        <span className="small muted">Multiplying by 10 moves every digit one place to the left. A 0 holds the empty units place.</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function ArrayModel({ rows: r0, cols: c0 }: { rows: number; cols: number }) {
  const [rows, setRows] = useState(r0);
  const [cols, setCols] = useState(c0);
  const [split, setSplit] = useState(Math.min(10, c0 - 1));
  const k = Math.min(split, cols);
  const cell = 18;
  const W = cols * cell + 24;
  const H = rows * cell + 24;
  return (
    <div className="arr">
      <p className="widget-readout" aria-live="polite">
        <Tex tex={k > 0 && k < cols ? `${rows} \\times ${cols} = ${rows} \\times ${k} + ${rows} \\times ${cols - k} = ${rows * k} + ${rows * (cols - k)} = ${rows * cols}` : `${rows} \\times ${cols} = ${rows * cols}`} />
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="arr-svg" style={{ maxWidth: W * 1.6 }} role="img" aria-label={`${rows} rows of ${cols} dots, split after ${k} columns`}>
        {Array.from({ length: rows * cols }, (_, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          return <circle key={i} cx={12 + c * cell + cell / 2} cy={12 + r * cell + cell / 2} r={6} className={c < k ? 'arr-a' : 'arr-b'} />;
        })}
        {k > 0 && k < cols ? <path d={`M ${12 + k * cell} 4 V ${H - 4}`} className="arr-split" /> : null}
      </svg>
      <div className="widget-controls">
        <Stepper label="Rows" value={rows} min={1} max={12} onChange={setRows} />
        <Stepper label="In each row" value={cols} min={2} max={20} onChange={(v) => (setCols(v), setSplit(Math.min(split, v - 1)))} />
        <Slider label="Split after column" value={k} min={0} max={cols} onChange={setSplit} />
      </div>
      <Note ok={null}>
        <p>Splitting the array doesn't change how many dots there are. Split off a ten (or a number you know well), multiply each part, then add. That is how long multiplication works.</p>
      </Note>
    </div>
  );
}

// ---------------------------------------------------------------------------
const SETS = [6, 8, 10, 12, 15, 16, 18, 20, 24];
const divisors = (n: number) => Array.from({ length: n - 1 }, (_, i) => i + 2).filter((d) => n % d === 0 && d < n && d <= 8);

export function FractionOfSet() {
  const [n, setN] = useState(12);
  const [den, setDen] = useState(4);
  const [num, setNum] = useState(3);
  const ds = divisors(n);
  const d = ds.includes(den) ? den : ds[ds.length - 1]!;
  const k = Math.min(num, d);
  const per = n / d;
  return (
    <div className="fset">
      <p className="widget-readout" aria-live="polite">
        <Tex tex={`\\tfrac{1}{${d}} \\text{ of } ${n} = ${per} \\quad\\Rightarrow\\quad \\tfrac{${k}}{${d}} \\text{ of } ${n} = ${k} \\times ${per} = ${k * per}`} />
      </p>
      <div className="fset-groups" aria-hidden="true">
        {Array.from({ length: d }, (_, g) => (
          <div key={g} className={`fset-group${g < k ? ' on' : ''}`}>
            {Array.from({ length: per }, (_, i) => (
              <span key={i} className="fset-sweet" />
            ))}
          </div>
        ))}
      </div>
      <div className="widget-controls">
        <label className="field compact">
          <span>Sweets</span>
          <select value={n} onChange={(e) => setN(Number(e.target.value))}>
            {SETS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="field compact">
          <span>Share into (bottom number)</span>
          <select value={d} onChange={(e) => setDen(Number(e.target.value))}>
            {ds.map((v) => (
              <option key={v} value={v}>
                {v} equal groups
              </option>
            ))}
          </select>
        </label>
        <Stepper label="Groups taken (top number)" value={k} min={1} max={d} onChange={setNum} />
      </div>
      <Note ok={null}>
        <p>
          The bottom number tells you how many equal groups to make. The top number tells you how many groups to take. So <Tex tex={`\\tfrac{${k}}{${d}}`} /> of {n}: divide by {d}, then multiply by {k}.
        </p>
      </Note>
    </div>
  );
}

// ---------------------------------------------------------------------------
const dec = (h: number) => (h === 100 ? '1' : `0,${String(h).padStart(2, '0').replace(/0$/, '')}`);

function Grid100({ h, cls, label }: { h: number; cls: string; label: string }) {
  return (
    <figure className="dgrid">
      <svg viewBox="0 0 104 104" className="dgrid-svg" role="img" aria-label={`${label}: ${dec(h)}, ${Math.floor(h / 10)} tenths and ${h % 10} hundredths`}>
        {Array.from({ length: 100 }, (_, i) => {
          const col = Math.floor(i / 10);
          const row = i % 10;
          return <rect key={i} x={2 + col * 10} y={2 + row * 10} width={10} height={10} className={i < h ? cls : 'dgrid-off'} />;
        })}
      </svg>
      <figcaption>
        <strong className="num">{dec(h)}</strong>
        <span className="small">
          {Math.floor(h / 10)} tenths, {h % 10} hundredths
        </span>
      </figcaption>
    </figure>
  );
}

export function DecimalGrid() {
  const [a, setA] = useState(50);
  const [b, setB] = useState(45);
  const bigger = a === b ? null : a > b ? 'A' : 'B';
  return (
    <div className="dec">
      <p className="widget-readout" aria-live="polite">
        <span>
          <strong className="num">{dec(a)}</strong> {a === b ? '=' : a > b ? '>' : '<'} <strong className="num">{dec(b)}</strong>
        </span>
        <span className="muted">{bigger ? `More of grid ${bigger} is shaded.` : 'The same amount is shaded.'}</span>
      </p>
      <div className="dgrid-pair">
        <Grid100 h={a} cls="dgrid-a" label="Grid A" />
        <Grid100 h={b} cls="dgrid-b" label="Grid B" />
      </div>
      <div className="widget-controls">
        <Slider label="A (hundredths)" value={a} min={0} max={100} onChange={setA} format={dec} />
        <Slider label="B (hundredths)" value={b} min={0} max={100} onChange={setB} format={dec} />
      </div>
      <Note ok={null}>
        <p>Each column is one tenth; each small square is one hundredth. 0,5 is five whole columns, which is more than 0,45 (four columns and five squares), even though 45 looks bigger than 5.</p>
      </Note>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function RectangleLab({ target }: { target: number }) {
  const [l, setL] = useState(6);
  const [w, setW] = useState(2);
  const [found, setFound] = useState<string[]>([]);
  const area = l * w;
  const per = 2 * (l + w);
  const resize = (nl: number, nw: number) => {
    setL(nl);
    setW(nw);
    const key = `${Math.max(nl, nw)} × ${Math.min(nl, nw)}`;
    if (nl * nw === target && !found.includes(key)) setFound([...found, key].sort((x, y) => Number(y.split(' ')[0]) - Number(x.split(' ')[0])));
  };
  const all = Array.from({ length: 12 }, (_, i) => i + 1).filter((a) => target % a === 0 && target / a <= 12 && a >= target / a).length;
  const cell = 22;
  return (
    <div className="rect">
      <p className="widget-readout" aria-live="polite">
        <span>
          Area <strong className="num">{area} cm²</strong>
        </span>
        <span>
          Perimeter <strong className="num">{per} cm</strong>
        </span>
      </p>
      <svg viewBox={`0 0 ${12 * cell + 20} ${10 * cell + 20}`} className="rect-svg" role="img" aria-label={`A rectangle ${l} cm by ${w} cm`}>
        {Array.from({ length: 13 }, (_, i) => (
          <path key={`v${i}`} d={`M ${10 + i * cell} 10 V ${10 + 10 * cell}`} className="rect-grid" />
        ))}
        {Array.from({ length: 11 }, (_, i) => (
          <path key={`h${i}`} d={`M 10 ${10 + i * cell} H ${10 + 12 * cell}`} className="rect-grid" />
        ))}
        <rect x={10} y={10} width={l * cell} height={w * cell} className="rect-fill" />
        <rect x={10} y={10} width={l * cell} height={w * cell} className="rect-edge" />
      </svg>
      <div className="widget-controls">
        <Slider label="Length" value={l} min={1} max={12} onChange={(v) => resize(v, w)} format={(v) => `${v} cm`} />
        <Slider label="Width" value={w} min={1} max={10} onChange={(v) => resize(l, v)} format={(v) => `${v} cm`} />
      </div>
      <Note ok={found.length === all ? true : null}>
        <p>
          <strong>Challenge:</strong> find every rectangle with an area of {target} cm² (whole centimetres). Found {found.length} of {all}
          {found.length ? `: ${found.join(', ')}` : ''}.{' '}
          {found.length === all ? 'All found! Same area, different perimeters: the squarer the rectangle, the shorter its perimeter.' : 'Do they all have the same perimeter?'}
        </p>
      </Note>
    </div>
  );
}
