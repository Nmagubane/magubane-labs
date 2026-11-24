/**
 * Senior Phase geometry labs (Grades 7–9): angles on lines and round a point, crossing lines, parallel lines and a
 * transversal, triangles, and similar triangles. Investigate first; the lesson then states the rule and its reason.
 */
import { useState } from 'react';
import { Segmented } from '../../ui/primitives.tsx';
import { Slider } from './MathWidgets.tsx';
import { Note } from './NstLabs.tsx';
import { useView, Label, Arc, centroid, angleAt } from './GeometryLabs.tsx';

type V = { x: number; y: number };
const rad = (d: number) => (d * Math.PI) / 180;
const dir = (d: number, r = 1, from: V = { x: 0, y: 0 }): V => ({ x: from.x + r * Math.cos(rad(d)), y: from.y + r * Math.sin(rad(d)) });
const c2 = (v: number, dp = 2) => v.toFixed(dp).replace('.', ',');
const below = (p: V): V => ({ x: p.x, y: p.y - 10 });

function Seg({ a, b, cls = '' }: { a: V; b: V; cls?: string }) {
  return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={`geo-line ${cls}`} />;
}

/** A parallel-line arrowhead at the middle of AB (SVG coordinates). */
function Chevron({ a, b }: { a: V; b: V }) {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const [ux, uy] = [(b.x - a.x) / len, (b.y - a.y) / len];
  const [mx, my] = [(a.x + b.x) / 2, (a.y + b.y) / 2];
  return <path d={`M ${mx - ux * 6 - uy * 5} ${my - uy * 6 + ux * 5} L ${mx} ${my} L ${mx - ux * 6 + uy * 5} ${my - uy * 6 - ux * 5}`} className="geo-mark" />;
}

/**
 * The learner finds the rule before the lab states it: the conclusion appears once they have tried `need` clearly
 * different settings. Call `tried` with a coarse key (e.g. the angle rounded to 10°) whenever a control changes.
 */
function useExplore(need = 3) {
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set());
  const tried = (key: string | number) => setSeen((s) => (s.has(String(key)) ? s : new Set(s).add(String(key))));
  return { explored: seen.size >= need, tried };
}
const tens = (v: number) => Math.round(v / 10);

export function AngleLab({ mode }: { mode: 'line' | 'cross' | 'parallel' | 'triangle' }) {
  if (mode === 'line') return <LineAngles />;
  if (mode === 'cross') return <CrossingLines />;
  if (mode === 'parallel') return <ParallelLines />;
  return <TriangleAngles />;
}

// ---------------------------------------------------------------------------
function LineAngles() {
  const [view, setView] = useState<'line' | 'point'>('line');
  return (
    <div className="geo-lab">
      <Segmented
        label="What to investigate"
        value={view}
        onChange={setView}
        options={[
          { value: 'line', label: 'On a straight line' },
          { value: 'point', label: 'Round a point' },
        ]}
      />
      {view === 'line' ? <OnALine /> : <RoundAPoint />}
    </div>
  );
}

function OnALine() {
  const [a, setA] = useState(50);
  const { explored, tried } = useExplore();
  const O = { x: 0, y: 0 };
  const A = { x: -1.4, y: 0 };
  const B = { x: 1.4, y: 0 };
  const C = dir(a, 1.2);
  const { s } = useView([A, B, O, C], 300, 170, 26, [{ x: 0, y: 1.25 }]);
  const [SO, SA, SB, SC] = [O, A, B, C].map(s) as [V, V, V, V];
  return (
    <>
      <p className="widget-readout" aria-live="polite">
        <span>
          ∠AOC + ∠COB = <strong className="num">{180 - a}°</strong> + <strong className="num">{a}°</strong> = <strong className="num">{explored ? '180°' : '?'}</strong>
        </span>
      </p>
      <svg viewBox="0 0 300 170" className="geo" role="img" aria-label={`Straight line AOB with a ray OC. Angle AOC is ${180 - a} degrees and angle COB is ${a} degrees.`}>
        <Seg a={SA} b={SB} />
        <Seg a={SO} b={SC} cls="accent" />
        <Arc v={SO} a={SB} b={SC} text={`${a}°`} r={20} />
        <Arc v={SO} a={SC} b={SA} text={`${180 - a}°`} r={30} />
        <circle cx={SO.x} cy={SO.y} r={2.5} className="geo-dot" />
        <Label p={SA} c={SO} text="A" />
        <Label p={SB} c={SO} text="B" />
        <Label p={SC} c={SO} text="C" />
        <Label p={SO} c={below(SO)} text="O" />
      </svg>
      <div className="widget-controls">
        <Slider
          label="Turn the ray OC"
          value={a}
          min={10}
          max={170}
          onChange={(v) => {
            setA(v);
            tried(tens(v));
          }}
          format={(v) => `${v}°`}
        />
      </div>
      <Note ok={explored ? true : null}>
        <p>{explored ? 'However you turn OC, the two angles on the straight line AOB add up to 180°.' : 'Turn OC to a few different places. Each time, add the two angles. What do you notice?'}</p>
      </Note>
    </>
  );
}

function RoundAPoint() {
  const [p, setP] = useState(120);
  const [qRaw, setQ] = useState(130);
  const { explored, tried } = useExplore();
  // Keep every angle under 180° so each one is a single, clearly marked angle.
  const qMin = Math.max(30, 185 - p);
  const qMax = Math.min(170, 330 - p);
  const q = Math.min(qMax, Math.max(qMin, qRaw));
  const r = 360 - p - q;
  const O = { x: 0, y: 0 };
  const [A, B, C] = [dir(0, 1.2), dir(p, 1.2), dir(p + q, 1.2)];
  const { s } = useView([O, A, B, C], 300, 210, 18, [dir(90, 1.2), dir(180, 1.2), dir(270, 1.2)]);
  const [SO, SA, SB, SC] = [O, A, B, C].map(s) as [V, V, V, V];
  return (
    <>
      <p className="widget-readout" aria-live="polite">
        <span>
          <strong className="num">{p}°</strong> + <strong className="num">{q}°</strong> + <strong className="num">{r}°</strong> = <strong className="num">{explored ? '360°' : '?'}</strong>
        </span>
      </p>
      <svg viewBox="0 0 300 210" className="geo" role="img" aria-label={`Three rays from O. The angles between them are ${p}, ${q} and ${r} degrees.`}>
        {[SA, SB, SC].map((P, i) => (
          <Seg key={i} a={SO} b={P} cls={i === 0 ? '' : 'accent'} />
        ))}
        <Arc v={SO} a={SA} b={SB} text={`${p}°`} r={26} />
        <Arc v={SO} a={SB} b={SC} text={`${q}°`} r={26} />
        <Arc v={SO} a={SC} b={SA} text={`${r}°`} r={26} />
        <circle cx={SO.x} cy={SO.y} r={2.5} className="geo-dot" />
        <Label p={SA} c={SO} text="A" />
        <Label p={SB} c={SO} text="B" />
        <Label p={SC} c={SO} text="C" />
      </svg>
      <div className="widget-controls">
        <Slider
          label="∠AOB"
          value={p}
          min={40}
          max={170}
          onChange={(v) => {
            setP(v);
            tried(`${tens(v)}-${tens(q)}`);
          }}
          format={(v) => `${v}°`}
        />
        <Slider
          label="∠BOC"
          value={q}
          min={qMin}
          max={qMax}
          onChange={(v) => {
            setQ(v);
            tried(`${tens(p)}-${tens(v)}`);
          }}
          format={(v) => `${v}°`}
        />
      </div>
      <Note ok={explored ? true : null}>
        <p>{explored ? 'The three angles go all the way round O: together they always make a full turn, 360°.' : 'Turn OB and OC to a few different places. Each time, add the three angles. What do you notice?'}</p>
      </Note>
    </>
  );
}

// ---------------------------------------------------------------------------
function CrossingLines() {
  const [a, setA] = useState(55);
  const { explored, tried } = useExplore();
  const O = { x: 0, y: 0 };
  const A = { x: -1.3, y: 0 };
  const B = { x: 1.3, y: 0 };
  const D = dir(a, 1.2);
  const C = dir(a + 180, 1.2);
  const { s } = useView([A, B, C, D, O], 300, 190, 26);
  const [SO, SA, SB, SC, SD] = [O, A, B, C, D].map(s) as [V, V, V, V, V];
  return (
    <div className="geo-lab">
      <p className="widget-readout" aria-live="polite">
        {explored ? (
          <>
            <span>
              ∠DOB = ∠AOC = <strong className="num">{a}°</strong>
            </span>
            <span>
              ∠AOD = ∠BOC = <strong className="num">{180 - a}°</strong>
            </span>
          </>
        ) : (
          <span>
            ∠DOB <strong className="num">{a}°</strong>, ∠AOD <strong className="num">{180 - a}°</strong>, ∠AOC <strong className="num">{a}°</strong>, ∠BOC <strong className="num">{180 - a}°</strong>
          </span>
        )}
      </p>
      <svg viewBox="0 0 300 190" className="geo" role="img" aria-label={`Straight lines AB and CD cross at O. Angles DOB and AOC are ${a} degrees; angles AOD and BOC are ${180 - a} degrees.`}>
        <Seg a={SA} b={SB} />
        <Seg a={SC} b={SD} cls="accent" />
        <Arc v={SO} a={SB} b={SD} text={`${a}°`} r={20} />
        <Arc v={SO} a={SA} b={SC} text={`${a}°`} r={20} />
        <Arc v={SO} a={SD} b={SA} text={`${180 - a}°`} r={30} />
        <Arc v={SO} a={SC} b={SB} text={`${180 - a}°`} r={30} />
        <circle cx={SO.x} cy={SO.y} r={2.5} className="geo-dot" />
        <Label p={SO} c={{ x: SO.x, y: SO.y - 10 }} text="O" />
        {(
          [
            [SA, 'A'],
            [SB, 'B'],
            [SC, 'C'],
            [SD, 'D'],
          ] as const
        ).map(([p, l]) => (
          <Label key={l} p={p} c={SO} text={l} />
        ))}
      </svg>
      <div className="widget-controls">
        <Slider
          label="Angle between the lines"
          value={a}
          min={15}
          max={165}
          onChange={(v) => {
            setA(v);
            tried(tens(v));
          }}
          format={(v) => `${v}°`}
        />
      </div>
      <Note ok={explored ? true : null}>
        <p>{explored ? 'Opposite angles in the X stay equal (vertically opposite angles). Angles next to each other sit on a straight line, so they add up to 180°.' : 'Change the angle a few times. Which angles always match each other?'}</p>
      </Note>
    </div>
  );
}

// ---------------------------------------------------------------------------
type Pair = 'corresp' | 'alt' | 'coint';
function ParallelLines() {
  const [pair, setPair] = useState<Pair>('corresp');
  const [t, setT] = useState(60);
  const [tilt, setTilt] = useState(0);
  const { explored, tried } = useExplore();
  const H = { x: 0, y: 0 };
  const G = { x: 1 / Math.tan(rad(t)), y: 1 };
  const lo = Math.min(G.x, 0) - 1.3;
  const hi = Math.max(G.x, 0) + 1.3;
  const A = { x: lo, y: 1 };
  const B = { x: hi, y: 1 };
  const C = dir(180 + tilt, -lo);
  const D = dir(tilt, hi);
  const E = dir(t, 0.55, G);
  const F = dir(t + 180, 0.55, H);
  const { s } = useView([A, B, C, D, E, F], 300, 200, 26);
  const [SA, SB, SC, SD, SE, SF, SG, SH] = [A, B, C, D, E, F, G, H].map(s) as [V, V, V, V, V, V, V, V];
  // The angle at G for each pair, and ∠GHD at H.
  const atG = pair === 'corresp' ? { a: SE, b: SB, v: t, name: '∠EGB' } : pair === 'alt' ? { a: SA, b: SH, v: t, name: '∠AGH' } : { a: SB, b: SH, v: 180 - t, name: '∠BGH' };
  const atH = t - tilt;
  const parallel = tilt === 0;
  const equalPair = pair !== 'coint';
  const holds = equalPair ? atG.v === atH : atG.v + atH === 180;
  const NAME: Record<Pair, string> = { corresp: 'Corresponding angles', alt: 'Alternate angles', coint: 'Co-interior angles' };
  return (
    <div className="geo-lab">
      <Segmented
        label="Angle pair"
        value={pair}
        onChange={setPair}
        options={[
          { value: 'corresp', label: 'Corresponding' },
          { value: 'alt', label: 'Alternate' },
          { value: 'coint', label: 'Co-interior' },
        ]}
      />
      <p className="widget-readout" aria-live="polite">
        <span>
          {atG.name} = <strong className="num">{atG.v}°</strong>, ∠GHD = <strong className="num">{atH}°</strong>
        </span>
        {explored || !parallel ? <span className="muted">{equalPair ? (holds ? 'Equal' : 'Not equal') : `Sum: ${atG.v + atH}°`}</span> : null}
      </p>
      <svg viewBox="0 0 300 200" className="geo" role="img" aria-label={`Lines AB and CD${parallel ? ', which are parallel,' : ', which are not parallel,'} are crossed by EF at G and H. ${atG.name} is ${atG.v} degrees and angle GHD is ${atH} degrees.`}>
        <Seg a={SA} b={SB} />
        <Seg a={SC} b={SD} cls={parallel ? '' : 'dashed'} />
        <Chevron a={SA} b={SB} />
        {parallel ? <Chevron a={SC} b={SD} /> : null}
        <Seg a={SE} b={SF} cls="accent" />
        <Arc v={SG} a={atG.a} b={atG.b} text={`${atG.v}°`} r={18} />
        <Arc v={SH} a={SG} b={SD} text={`${atH}°`} r={18} />
        {(
          [
            [SA, 'A'],
            [SB, 'B'],
            [SC, 'C'],
            [SD, 'D'],
            [SE, 'E'],
            [SF, 'F'],
          ] as const
        ).map(([p, l]) => (
          <Label key={l} p={p} c={centroid([SA, SB, SC, SD])} text={l} />
        ))}
        <Label p={SG} c={{ x: SG.x + 10, y: SG.y + 10 }} text="G" />
        <Label p={SH} c={{ x: SH.x - 10, y: SH.y - 10 }} text="H" />
      </svg>
      <div className="widget-controls">
        <Slider
          label="Turn the transversal EF"
          value={t}
          min={30}
          max={150}
          onChange={(v) => {
            setT(v);
            if (tilt === 0) tried(tens(v));
          }}
          format={(v) => `${v}°`}
        />
        <Slider label="Turn line CD" value={tilt} min={-15} max={15} onChange={setTilt} format={(v) => (v === 0 ? 'parallel' : `${v > 0 ? '+' : '−'}${Math.abs(v)}°`)} />
      </div>
      <Note ok={!parallel ? false : explored ? true : null}>
        <p>
          {!parallel
            ? `CD is no longer parallel to AB, so the ${NAME[pair].toLowerCase()} ${equalPair ? 'are no longer equal' : 'no longer add up to 180°'}. The rules only work for parallel lines.`
            : explored
              ? `AB ∥ CD. ${NAME[pair]} ${equalPair ? 'are equal' : 'add up to 180°'}, however you turn the transversal.`
              : 'Turn the transversal EF to a few different angles. What stays true about the two marked angles?'}
        </p>
      </Note>
    </div>
  );
}

// ---------------------------------------------------------------------------
function TriangleAngles() {
  const [view, setView] = useState<'inside' | 'exterior'>('inside');
  const [a, setA] = useState(65);
  const [bRaw, setB] = useState(50);
  const inside = useExplore();
  const outside = useExplore();
  const bMax = 160 - a;
  const b = Math.min(bMax, bRaw);
  const c = 180 - a - b;
  const k = Math.sin(rad(b)) / Math.sin(rad(a + b));
  const A = { x: 0, y: 0 };
  const B = { x: 1.6, y: 0 };
  const C = { x: 1.6 * k * Math.cos(rad(a)), y: 1.6 * k * Math.sin(rad(a)) };
  const len = Math.hypot(C.x - B.x, C.y - B.y);
  const D = { x: C.x + ((C.x - B.x) / len) * 0.7, y: C.y + ((C.y - B.y) / len) * 0.7 };
  const ext = view === 'exterior';
  const { explored, tried } = ext ? outside : inside;
  const track = (na: number, nb: number) => tried(`${tens(na)}-${tens(Math.min(160 - na, nb))}`);
  const { s } = useView(ext ? [A, B, C, D] : [A, B, C], 300, 190, 28);
  const [SA, SB, SC, SD] = [A, B, C, D].map(s) as [V, V, V, V];
  const mid = centroid([SA, SB, SC]);
  return (
    <div className="geo-lab">
      <Segmented
        label="What to investigate"
        value={view}
        onChange={setView}
        options={[
          { value: 'inside', label: 'Angle sum' },
          { value: 'exterior', label: 'Extend BC' },
        ]}
      />
      <p className="widget-readout" aria-live="polite">
        {ext ? (
          <span>
            ∠ACD = <strong className="num">{a + b}°</strong>, ∠A = <strong className="num">{a}°</strong>, ∠B = <strong className="num">{b}°</strong>
            {explored ? <span className="muted"> ∠ACD = ∠A + ∠B</span> : null}
          </span>
        ) : (
          <span>
            <strong className="num">{a}°</strong> + <strong className="num">{b}°</strong> + <strong className="num">{c}°</strong> = <strong className="num">{explored ? '180°' : '?'}</strong>
          </span>
        )}
      </p>
      <svg viewBox="0 0 300 190" className="geo" role="img" aria-label={`Triangle ABC with angles ${a}, ${b} and ${c} degrees${ext ? `, and BC extended to D. The exterior angle ACD is ${a + b} degrees` : ''}.`}>
        <polygon points={[SA, SB, SC].map((p) => `${p.x},${p.y}`).join(' ')} className="geo-fill" />
        {ext ? <Seg a={SC} b={SD} cls="accent" /> : null}
        <Arc v={SA} a={SB} b={SC} text={`${a}°`} r={18} />
        <Arc v={SB} a={SC} b={SA} text={`${b}°`} r={18} />
        {ext ? <Arc v={SC} a={SA} b={SD} text={`${a + b}°`} r={18} /> : <Arc v={SC} a={SA} b={SB} text={`${c}°`} r={18} />}
        <Label p={SA} c={mid} text="A" />
        <Label p={SB} c={mid} text="B" />
        <Label p={SC} c={mid} text="C" />
        {ext ? <Label p={SD} c={SC} text="D" /> : null}
      </svg>
      <div className="widget-controls">
        <Slider
          label="∠A"
          value={a}
          min={20}
          max={120}
          onChange={(v) => {
            setA(v);
            track(v, b);
          }}
          format={(v) => `${v}°`}
        />
        <Slider
          label="∠B"
          value={b}
          min={20}
          max={bMax}
          onChange={(v) => {
            setB(v);
            track(a, v);
          }}
          format={(v) => `${v}°`}
        />
      </div>
      <Note ok={explored ? true : null}>
        <p>
          {explored
            ? ext
              ? 'The outside angle at C always equals ∠A + ∠B: the two angles inside the triangle, opposite it.'
              : 'Whatever the triangle, the three angles add up to 180°.'
            : ext
              ? 'Change ∠A and ∠B a few times. Compare the outside angle at C with ∠A and ∠B. What do you notice?'
              : 'Change ∠A and ∠B to make a few different triangles. Each time, add the three angles.'}
        </p>
      </Note>
    </div>
  );
}

// ---------------------------------------------------------------------------
/** A triangle with sides XY = c, YZ = a, ZX = b, X at the origin. */
function bySides(a: number, b: number, c: number): [V, V, V] {
  const cosX = (b * b + c * c - a * a) / (2 * b * c);
  const X = Math.acos(Math.max(-1, Math.min(1, cosX)));
  return [{ x: 0, y: 0 }, { x: c, y: 0 }, { x: b * Math.cos(X), y: b * Math.sin(X) }];
}

export function SimilarLab() {
  const [how, setHow] = useState<'multiply' | 'add'>('multiply');
  const [k, setK] = useState(1.5);
  const [d, setD] = useState(1);
  const mult = useExplore();
  const plus = useExplore();
  const { explored, tried } = how === 'multiply' ? mult : plus;
  // △ABC: AB = 3, BC = 2, CA = 2,6 (a scalene triangle).
  const [ab, bc, ca] = [3, 2, 2.6];
  const [de, ef, fd] = how === 'multiply' ? [ab * k, bc * k, ca * k] : [ab + d, bc + d, ca + d];
  const t1 = bySides(bc, ca, ab);
  const t2raw = bySides(ef, fd, de);
  const gap = Math.max(...t1.map((p) => p.x)) + 1.9;
  const t2 = t2raw.map((p) => ({ x: p.x + gap, y: p.y }));
  // △ABC enlarged to the length of DE and placed on D: it covers △DEF exactly only when the triangles are similar.
  const scaled = t1.map((p) => ({ x: p.x * (de / ab) + gap, y: p.y * (de / ab) }));
  const { s } = useView([...t1, ...t2, ...scaled], 300, 150, 24);
  const S1 = t1.map(s) as [V, V, V];
  const S2 = t2.map(s) as [V, V, V];
  const SS = scaled.map(s);
  const ang = (t: [V, V, V] | V[]) => [angleAt(t[0]!, t[1]!, t[2]!), angleAt(t[1]!, t[2]!, t[0]!), angleAt(t[2]!, t[0]!, t[1]!)].map((x) => Math.round(x));
  const a1 = ang(t1);
  const a2 = ang(t2);
  const ratios = [de / ab, ef / bc, fd / ca];
  const same = ratios.every((r) => Math.abs(r - ratios[0]!) < 0.005);
  const sideLabel = (P: V, Q: V, c: V, text: string, key: string) => {
    const m = { x: (P.x + Q.x) / 2, y: (P.y + Q.y) / 2 };
    const dx = m.x - c.x;
    const dy = m.y - c.y;
    const n = Math.hypot(dx, dy) || 1;
    return (
      <text key={key} x={m.x + (dx / n) * 12} y={m.y + (dy / n) * 12 + 4} textAnchor="middle" className="geo-angle">
        {text}
      </text>
    );
  };
  const c1 = centroid(S1);
  const cc2 = centroid(S2);
  return (
    <div className="geo-lab">
      <Segmented
        label="How to change the sides"
        value={how}
        onChange={setHow}
        options={[
          { value: 'multiply', label: 'Multiply every side' },
          { value: 'add', label: 'Add to every side' },
        ]}
      />
      <p className="widget-readout" aria-live="polite">
        <span>
          DE ÷ AB = <strong className="num">{c2(ratios[0]!)}</strong>, EF ÷ BC = <strong className="num">{c2(ratios[1]!)}</strong>, FD ÷ CA = <strong className="num">{c2(ratios[2]!)}</strong>
        </span>
        <span className="muted">
          Angles: △ABC {a1.join('°, ')}°; △DEF {a2.join('°, ')}°
        </span>
      </p>
      <svg viewBox="0 0 300 150" className="geo" role="img" aria-label={`Triangle ABC with sides ${c2(ab, 1)}, ${c2(bc, 1)} and ${c2(ca, 1)}, and triangle DEF with sides ${c2(de, 1)}, ${c2(ef, 1)} and ${c2(fd, 1)}.`}>
        <polygon points={S1.map((p) => `${p.x},${p.y}`).join(' ')} className="geo-fill" />
        <polygon points={S2.map((p) => `${p.x},${p.y}`).join(' ')} className="geo-fill" />
        <polygon points={SS.map((p) => `${p.x},${p.y}`).join(' ')} className="geo-line dashed overlay" fill="none" />
        {(['A', 'B', 'C'] as const).map((l, i) => (
          <Label key={l} p={S1[i]!} c={c1} text={l} />
        ))}
        {(['D', 'E', 'F'] as const).map((l, i) => (
          <Label key={l} p={S2[i]!} c={cc2} text={l} />
        ))}
        {sideLabel(S1[0], S1[1], c1, c2(ab, 1), 'ab')}
        {sideLabel(S1[1], S1[2], c1, c2(bc, 1), 'bc')}
        {sideLabel(S1[2], S1[0], c1, c2(ca, 1), 'ca')}
        {sideLabel(S2[0], S2[1], cc2, c2(de, 1), 'de')}
        {sideLabel(S2[1], S2[2], cc2, c2(ef, 1), 'ef')}
        {sideLabel(S2[2], S2[0], cc2, c2(fd, 1), 'fd')}
      </svg>
      <div className="widget-controls">
        {how === 'multiply' ? (
          <Slider
            label="Scale factor k"
            value={k}
            min={0.5}
            max={2.5}
            step={0.25}
            onChange={(v) => {
              setK(v);
              tried(v);
            }}
            format={(v) => c2(v)}
          />
        ) : (
          <Slider
            label="Add to every side"
            value={d}
            min={0}
            max={3}
            step={0.5}
            onChange={(v) => {
              setD(v);
              tried(v);
            }}
            format={(v) => c2(v, 1)}
          />
        )}
      </div>
      <p className="muted lab-legend">Dashed: △ABC enlarged so that AB matches DE.</p>
      <Note ok={explored ? same : null}>
        <p>
          {!explored
            ? how === 'multiply'
              ? 'Try a few scale factors. Compare the ratios, the angles, and the dashed triangle with △DEF.'
              : 'Try adding a few different lengths. Do the ratios and the angles stay the same? Does the dashed triangle still fit △DEF?'
            : same
              ? 'Every side is multiplied by the same number, so the ratios are equal, the angles stay the same and the dashed triangle fits exactly: the triangles are similar.'
              : 'Adding the same length to every side changes the ratios, so the angles change and the dashed triangle no longer fits: the triangles are not the same shape, and not similar.'}
        </p>
      </Note>
    </div>
  );
}

// ---------------------------------------------------------------------------
/** Squares on the sides of a triangle: a² + b² = c² exactly when the angle between a and b is 90°. */
export function PythagorasLab() {
  const [a, setA] = useState(3);
  const [b, setB] = useState(4);
  const [angle, setAngle] = useState(90);
  const { explored, tried } = useExplore();
  const C = { x: 0, y: 0 };
  const B = { x: a, y: 0 };
  const A = dir(angle, b);
  const cc = a * a + b * b - 2 * a * b * Math.cos(rad(angle));
  // The square on side PQ, built outwards (away from the triangle's third vertex).
  const squareOn = (P: V, Q: V, third: V): V[] => {
    let [nx, ny] = [-(Q.y - P.y), Q.x - P.x];
    if ((third.x - P.x) * nx + (third.y - P.y) * ny > 0) [nx, ny] = [-nx, -ny];
    return [P, Q, { x: Q.x + nx, y: Q.y + ny }, { x: P.x + nx, y: P.y + ny }];
  };
  const sa = squareOn(C, B, A);
  const sb = squareOn(C, A, B);
  const sc = squareOn(A, B, C);
  const { s } = useView([...sa, ...sb, ...sc], 300, 240, 14);
  const poly = (ps: V[]) => ps.map(s).map((p) => `${p.x},${p.y}`).join(' ');
  const mid = (ps: V[]) => s({ x: ps.reduce((t, p) => t + p.x, 0) / ps.length, y: ps.reduce((t, p) => t + p.y, 0) / ps.length });
  const [SA, SB, SC] = [A, B, C].map(s) as [V, V, V];
  const sum = a * a + b * b;
  const isRight = angle === 90;
  const track = (na: number, nb: number, ang: number) => tried(`${na}-${nb}-${ang === 90 ? 'r' : ang > 90 ? 'w' : 'n'}`);
  return (
    <div className="geo-lab">
      <p className="widget-readout" aria-live="polite">
        <span>
          a² + b² = <strong className="num">{sum}</strong>
        </span>
        <span>
          c² = <strong className="num">{c2(cc, 1)}</strong>
        </span>
        {explored ? <span className="muted">{isRight ? 'Equal' : cc > sum ? 'c² is bigger' : 'c² is smaller'}</span> : null}
      </p>
      <svg viewBox="0 0 300 240" className="geo" role="img" aria-label={`A triangle with sides a = ${a} and b = ${b} meeting at ${angle} degrees, and a square on each side. The squares on a and b have areas ${a * a} and ${b * b}; the square on c has area ${c2(cc, 1)}.`}>
        <polygon points={poly(sa)} className="geo-fill" />
        <polygon points={poly(sb)} className="geo-fill" />
        <polygon points={poly(sc)} className="geo-fill pyth-c" />
        <polygon points={[SA, SB, SC].map((p) => `${p.x},${p.y}`).join(' ')} className="geo-line" fill="none" />
        {isRight ? <Arc v={SC} a={SB} b={SA} text="" r={12} /> : <Arc v={SC} a={SB} b={SA} text={`${angle}°`} r={16} />}
        <text {...mid(sa)} textAnchor="middle" className="geo-angle">{`a² = ${a * a}`}</text>
        <text {...mid(sb)} textAnchor="middle" className="geo-angle">{`b² = ${b * b}`}</text>
        <text {...mid(sc)} textAnchor="middle" className="geo-angle">{`c² = ${c2(cc, 1)}`}</text>
      </svg>
      <div className="widget-controls">
        <Slider
          label="Side a"
          value={a}
          min={2}
          max={8}
          onChange={(v) => {
            setA(v);
            track(v, b, angle);
          }}
        />
        <Slider
          label="Side b"
          value={b}
          min={2}
          max={8}
          onChange={(v) => {
            setB(v);
            track(a, v, angle);
          }}
        />
        <Slider
          label="Angle between a and b"
          value={angle}
          min={60}
          max={120}
          onChange={(v) => {
            setAngle(v);
            track(a, b, v);
          }}
          format={(v) => `${v}°`}
        />
      </div>
      <Note ok={explored ? isRight : null}>
        <p>
          {!explored
            ? 'Keep the angle at 90° and try different sides a and b: compare a² + b² with c². Then make the angle bigger or smaller.'
            : isRight
              ? 'At 90°, the two smaller squares exactly fill the big one: a² + b² = c², whatever a and b are. That is the Theorem of Pythagoras.'
              : angle > 90
                ? 'Wider than 90°: c² is bigger than a² + b². Only a right angle makes them equal, so a² + b² = c² tells you a triangle is right-angled.'
                : 'Narrower than 90°: c² is smaller than a² + b². Only a right angle makes them equal, so a² + b² = c² tells you a triangle is right-angled.'}
        </p>
      </Note>
    </div>
  );
}
