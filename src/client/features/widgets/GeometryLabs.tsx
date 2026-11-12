/** Euclidean geometry labs (Grades 10–12): investigate first, then state the theorem. */
import { useState } from 'react';
import { Button, Segmented } from '../../ui/primitives.tsx';
import { Slider } from './MathWidgets.tsx';
import { Note } from './NstLabs.tsx';

type V = { x: number; y: number };
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const dist = (a: V, b: V) => Math.hypot(b.x - a.x, b.y - a.y);
const sub = (a: V, b: V): V => ({ x: a.x - b.x, y: a.y - b.y });
const angleAt = (v: V, a: V, b: V) => {
  const u = sub(a, v);
  const w = sub(b, v);
  return deg(Math.acos(Math.max(-1, Math.min(1, (u.x * w.x + u.y * w.y) / (Math.hypot(u.x, u.y) * Math.hypot(w.x, w.y))))));
};
const cross = (u: V, w: V) => u.x * w.y - u.y * w.x;
const c2 = (v: number, dp = 2) => v.toFixed(dp).replace('.', ',');
const onC = (d: number, r = 1): V => ({ x: r * Math.cos(rad(d)), y: r * Math.sin(rad(d)) });

/** Fit points (maths coords, y up) into an SVG box. */
function useView(pts: V[], W: number, H: number, pad = 28, extra: V[] = []) {
  const all = [...pts, ...extra];
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = Math.min((W - 2 * pad) / (x1 - x0 || 1), (H - 2 * pad) / (y1 - y0 || 1));
  const ox = (W - k * (x1 - x0)) / 2;
  const oy = (H - k * (y1 - y0)) / 2;
  return { k, s: (p: V) => ({ x: ox + k * (p.x - x0), y: H - (oy + k * (p.y - y0)) }) };
}

function Label({ p, c, text }: { p: { x: number; y: number }; c: { x: number; y: number }; text: string }) {
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  const n = Math.hypot(dx, dy) || 1;
  return (
    <text x={p.x + (dx / n) * 14} y={p.y + (dy / n) * 14 + 4} textAnchor="middle" className="geo-label">
      {text}
    </text>
  );
}
const centroid = (ps: { x: number; y: number }[]) => ({ x: ps.reduce((a, p) => a + p.x, 0) / ps.length, y: ps.reduce((a, p) => a + p.y, 0) / ps.length });

// ---------------------------------------------------------------------------
type Quad = 'parallelogram' | 'rectangle' | 'rhombus' | 'square' | 'kite' | 'trapezium';
function quadPoints(kind: Quad, t: number): V[] {
  switch (kind) {
    case 'parallelogram': {
      const d = onC(t, 1);
      return [{ x: 0, y: 0 }, { x: 1.6, y: 0 }, { x: 1.6 + d.x, y: d.y }, d];
    }
    case 'rectangle': {
      const h = 0.5 + (t - 40) / 100;
      return [{ x: 0, y: 0 }, { x: 1.6, y: 0 }, { x: 1.6, y: h }, { x: 0, y: h }];
    }
    case 'rhombus': {
      const d = onC(t, 1.2);
      return [{ x: 0, y: 0 }, { x: 1.2, y: 0 }, { x: 1.2 + d.x, y: d.y }, d];
    }
    case 'square':
      return [{ x: 0, y: 0 }, { x: 1.2, y: 0 }, { x: 1.2, y: 1.2 }, { x: 0, y: 1.2 }];
    case 'kite': {
      const h = 0.4 + (t - 40) / 80;
      return [{ x: 0, y: -h }, { x: 0.7, y: 0 }, { x: 0, y: 0.6 }, { x: -0.7, y: 0 }];
    }
    case 'trapezium': {
      const top = 0.4 + (t - 40) / 100;
      return [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 1 + top / 2 + 0.2, y: 1 }, { x: 1 - top / 2 + 0.2, y: 1 }];
    }
  }
}

export function QuadLab() {
  const [kind, setKind] = useState<Quad>('parallelogram');
  const [t, setT] = useState(65);
  const [A, B, C, D] = quadPoints(kind, t) as [V, V, V, V];
  const { s } = useView([A, B, C, D], 300, 200);
  const S = [A, B, C, D].map(s);
  const c = centroid(S);
  const tol = 0.01;
  const par = (p: V, q: V, r: V, w: V) => Math.abs(cross(sub(q, p), sub(w, r))) < tol;
  const eq = (a: number, b: number) => Math.abs(a - b) < tol * 4;
  const angles: [number, number, number, number] = [angleAt(A, B, D), angleAt(B, C, A), angleAt(C, D, B), angleAt(D, A, C)];
  const mAC = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 };
  const mBD = { x: (B.x + D.x) / 2, y: (B.y + D.y) / 2 };
  const dAC = sub(C, A);
  const dBD = sub(D, B);
  const props = [
    { name: 'Both pairs of opposite sides parallel', ok: par(A, B, D, C) && par(A, D, B, C) },
    { name: 'Both pairs of opposite sides equal', ok: eq(dist(A, B), dist(D, C)) && eq(dist(A, D), dist(B, C)) },
    { name: 'Both pairs of opposite angles equal', ok: Math.abs(angles[0] - angles[2]) < 0.5 && Math.abs(angles[1] - angles[3]) < 0.5 },
    { name: 'Diagonals bisect each other', ok: dist(mAC, mBD) < tol },
    { name: 'Diagonals are equal', ok: eq(dist(A, C), dist(B, D)) },
    { name: 'Diagonals are perpendicular', ok: Math.abs(dAC.x * dBD.x + dAC.y * dBD.y) < tol },
  ];
  const canFlex = kind !== 'square';
  return (
    <div className="geo-lab">
      <p className="widget-readout" aria-live="polite">
        <span>
          <strong>{kind[0]!.toUpperCase() + kind.slice(1)}</strong> ABCD
        </span>
        <span className="muted">
          Angles: {angles.map((a, i) => `${'ABCD'[i]} ${Math.round(a)}°`).join(', ')}
        </span>
      </p>
      <div className="geo-lab-grid">
        <svg viewBox="0 0 300 200" className="geo" role="img" aria-label={`${kind} ABCD with diagonals AC and BD.`}>
          <polygon points={S.map((p) => `${p.x},${p.y}`).join(' ')} className="geo-fill" />
          <line x1={S[0]!.x} y1={S[0]!.y} x2={S[2]!.x} y2={S[2]!.y} className="geo-line dashed" />
          <line x1={S[1]!.x} y1={S[1]!.y} x2={S[3]!.x} y2={S[3]!.y} className="geo-line dashed" />
          {S.map((p, i) => (
            <Label key={i} p={p} c={c} text={'ABCD'[i]!} />
          ))}
        </svg>
        <ul className="geo-props" aria-label="Properties">
          {props.map((p) => (
            <li key={p.name} className={p.ok ? 'ok' : 'no'}>
              <span aria-hidden="true">{p.ok ? '✓' : '✗'}</span> {p.name}
              <span className="sr-only">{p.ok ? ': yes' : ': no'}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="widget-controls">
        <label className="field compact">
          <span>Shape</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as Quad)}>
            {(['parallelogram', 'rectangle', 'rhombus', 'square', 'kite', 'trapezium'] as Quad[]).map((k) => (
              <option key={k} value={k}>
                {k[0]!.toUpperCase() + k.slice(1)}
              </option>
            ))}
          </select>
        </label>
        {canFlex ? <Slider label="Change the shape" value={t} min={40} max={140} onChange={setT} format={(v) => (kind === 'parallelogram' || kind === 'rhombus' ? `${v}°` : `${v}`)} /> : null}
      </div>
      <Note ok={null}>
        <p>Properties that stay ✓ however you change the shape are true for every {kind}. Those are the ones you can use as reasons.</p>
      </Note>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function MidpointLab() {
  const [ax, setAx] = useState(0.8);
  const [ah, setAh] = useState(1.6);
  const [bc, setBc] = useState(2.4);
  const A = { x: ax, y: ah };
  const B = { x: 0, y: 0 };
  const C = { x: bc, y: 0 };
  const D = { x: ax / 2, y: ah / 2 };
  const E = { x: (ax + bc) / 2, y: ah / 2 };
  const { s } = useView([A, B, C], 300, 200, 30, [{ x: -0.6, y: 0 }, { x: 3.2, y: 0 }]);
  const [SA, SB, SC, SD, SE] = [A, B, C, D, E].map(s) as [V, V, V, V, V];
  const c = centroid([SA, SB, SC]);
  const de = dist(D, E);
  const bcl = dist(B, C);
  return (
    <div className="geo-lab">
      <p className="widget-readout" aria-live="polite">
        <span>
          DE = <strong className="num">{c2(de)}</strong>, BC = <strong className="num">{c2(bcl)}</strong>
        </span>
        <span className="muted">
          DE ÷ BC = {c2(de / bcl)}. DE {Math.abs(D.y - E.y) < 1e-9 ? 'is parallel to' : 'is not parallel to'} BC.
        </span>
      </p>
      <svg viewBox="0 0 300 200" className="geo" role="img" aria-label={`Triangle ABC with D and E the midpoints of AB and AC. DE is ${c2(de)} and BC is ${c2(bcl)}.`}>
        <polygon points={[SA, SB, SC].map((p) => `${p.x},${p.y}`).join(' ')} className="geo-fill" />
        <line x1={SD.x} y1={SD.y} x2={SE.x} y2={SE.y} className="geo-line strong" />
        {[SD, SE].map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} className="geo-dot" />
        ))}
        {(
          [
            [SA, 'A'],
            [SB, 'B'],
            [SC, 'C'],
          ] as const
        ).map(([p, l]) => (
          <Label key={l} p={p} c={c} text={l} />
        ))}
        <text x={SD.x - 14} y={SD.y + 4} textAnchor="end" className="geo-label">
          D
        </text>
        <text x={SE.x + 14} y={SE.y + 4} className="geo-label">
          E
        </text>
      </svg>
      <div className="widget-controls">
        <Slider label="Move A sideways" value={ax} min={-0.5} max={2.9} step={0.1} onChange={setAx} format={(v) => c2(v, 1)} />
        <Slider label="Height of A" value={ah} min={0.6} max={2.2} step={0.1} onChange={setAh} format={(v) => c2(v, 1)} />
        <Slider label="Length of BC" value={bc} min={1.6} max={3} step={0.1} onChange={setBc} format={(v) => c2(v, 1)} />
      </div>
      <Note ok={null}>
        <p>D and E always stay the midpoints of AB and AC. Whatever the triangle, DE ÷ BC stays 0,50 and DE stays parallel to BC.</p>
      </Note>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Circle theorems. "centre": angle at the centre, same segment, semicircle. "cyclic": cyclic quad, tangent–chord.
function Arc({ v, a, b, text, r = 18 }: { v: V; a: V; b: V; text: string; r?: number }) {
  const a1 = Math.atan2(a.y - v.y, a.x - v.x);
  let d = Math.atan2(b.y - v.y, b.x - v.x) - a1;
  while (d <= -Math.PI) d += 2 * Math.PI;
  while (d > Math.PI) d -= 2 * Math.PI;
  const a2 = a1 + d;
  const mid = a1 + d / 2;
  return (
    <g>
      <path d={`M ${v.x + Math.cos(a1) * r} ${v.y + Math.sin(a1) * r} A ${r} ${r} 0 0 ${d > 0 ? 1 : 0} ${v.x + Math.cos(a2) * r} ${v.y + Math.sin(a2) * r}`} className="geo-arc" />
      <text x={v.x + Math.cos(mid) * (r + 14)} y={v.y + Math.sin(mid) * (r + 14) + 4} textAnchor="middle" className="geo-angle">
        {text}
      </text>
    </g>
  );
}

export function CircleLab({ mode }: { mode: 'centre' | 'cyclic' }) {
  const [view, setView] = useState<'a' | 'b'>('a');
  const [half, setHalf] = useState(55);
  const [cp, setCp] = useState(0.5);
  const [dp, setDp] = useState(0.25);
  const [pa, setPa] = useState(215);
  const [pc, setPc] = useState(45);
  const [tt, setTt] = useState(55);
  const R = 80;
  const O = { x: 150, y: 110 };
  const at = (d: number) => ({ x: O.x + R * Math.cos(rad(d)), y: O.y - R * Math.sin(rad(d)) });
  let body: React.ReactNode;
  let readout: React.ReactNode;
  let note: string;
  let controls: React.ReactNode;
  if (mode === 'centre') {
    const a = -90 - half;
    const b = -90 + half;
    const span = 360 - 2 * half;
    const A = at(a);
    const B = at(b);
    const C = at(b + 15 + cp * (span - 30));
    const D = at(b + 15 + dp * (span - 30));
    const aob = 2 * half;
    const acb = angleAt(C, A, B);
    const adb = angleAt(D, A, B);
    body = (
      <>
        {half < 90 ? (
          <>
            <line x1={O.x} y1={O.y} x2={A.x} y2={A.y} className="geo-line" />
            <line x1={O.x} y1={O.y} x2={B.x} y2={B.y} className="geo-line" />
            {view === 'a' ? <Arc v={O} a={A} b={B} text={`${aob}°`} r={14} /> : null}
          </>
        ) : (
          <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} className="geo-line" />
        )}
        <line x1={C.x} y1={C.y} x2={A.x} y2={A.y} className="geo-line" />
        <line x1={C.x} y1={C.y} x2={B.x} y2={B.y} className="geo-line" />
        <Arc v={C} a={A} b={B} text={`${Math.round(acb)}°`} />
        {view === 'b' ? (
          <>
            <line x1={D.x} y1={D.y} x2={A.x} y2={A.y} className="geo-line accent" />
            <line x1={D.x} y1={D.y} x2={B.x} y2={B.y} className="geo-line accent" />
            <Arc v={D} a={A} b={B} text={`${Math.round(adb)}°`} />
          </>
        ) : null}
        {(
          [
            [A, 'A'],
            [B, 'B'],
            [C, 'C'],
            ...(view === 'b' ? ([[D, 'D']] as const) : []),
          ] as const
        ).map(([p, l]) => (
          <Label key={l} p={p} c={O} text={l} />
        ))}
        <circle cx={O.x} cy={O.y} r={2.5} className="geo-dot" />
        <text x={O.x + 6} y={O.y - 6} className="geo-label">
          O
        </text>
      </>
    );
    readout =
      view === 'a' ? (
        <span>
          ∠AOB = <strong className="num">{aob}°</strong>, ∠ACB = <strong className="num">{Math.round(acb)}°</strong>
        </span>
      ) : (
        <span>
          ∠ACB = <strong className="num">{Math.round(acb)}°</strong>, ∠ADB = <strong className="num">{Math.round(adb)}°</strong>
        </span>
      );
    note = half >= 90 ? 'AB is a diameter, so the centre angle is 180° and every angle in the semicircle is 90°.' : view === 'a' ? 'However you move C, the angle at the centre is double the angle at the circumference.' : 'C and D are on the same side of AB, so their angles are equal: angles in the same segment.';
    controls = (
      <>
        <Slider label="Size of arc AB" value={half} min={15} max={90} onChange={setHalf} format={(v) => `${2 * v}°`} />
        <Slider label="Move C" value={cp} min={0} max={1} step={0.01} onChange={setCp} format={(v) => `${Math.round(v * 100)}%`} />
        {view === 'b' ? <Slider label="Move D" value={dp} min={0} max={1} step={0.01} onChange={setDp} format={(v) => `${Math.round(v * 100)}%`} /> : null}
        <Button size="sm" variant="secondary" onClick={() => setHalf(90)}>
          Make AB a diameter
        </Button>
      </>
    );
  } else if (view === 'a') {
    const A = at(pa);
    const B = at(300);
    const C = at(pc);
    const D = at(130);
    const angs = [angleAt(A, B, D), angleAt(B, C, A), angleAt(C, D, B), angleAt(D, A, C)].map((x) => Math.round(x));
    body = (
      <>
        <polygon points={[A, B, C, D].map((p) => `${p.x},${p.y}`).join(' ')} className="geo-fill" />
        {(
          [
            [A, B, D, 'A', 0],
            [B, C, A, 'B', 1],
            [C, D, B, 'C', 2],
            [D, A, C, 'D', 3],
          ] as const
        ).map(([v, a, b, l, i]) => (
          <g key={l}>
            <Arc v={v} a={a} b={b} text={`${angs[i]}°`} r={14} />
            <Label p={v} c={O} text={l} />
          </g>
        ))}
      </>
    );
    readout = (
      <span>
        A + C = <strong className="num">{angs[0]! + angs[2]!}°</strong>, B + D = <strong className="num">{angs[1]! + angs[3]!}°</strong>
      </span>
    );
    note = 'Opposite angles of a cyclic quadrilateral always add up to 180°. (Rounding can make it 179° or 181°.)';
    controls = (
      <>
        <Slider label="Move A" value={pa} min={180} max={255} onChange={setPa} format={(v) => `${v}°`} />
        <Slider label="Move C" value={pc} min={0} max={95} onChange={setPc} format={(v) => `${v}°`} />
      </>
    );
  } else {
    const A = at(270);
    const B = at(2 * tt - 90);
    const C = at(2 * tt - 90 + 15 + cp * (360 - 2 * tt - 30));
    const T = { x: O.x + 130, y: A.y };
    const S = { x: O.x - 130, y: A.y };
    const tab = angleAt(A, T, B);
    const acb = angleAt(C, A, B);
    body = (
      <>
        <line x1={S.x} y1={S.y} x2={T.x} y2={T.y} className="geo-line" />
        <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} className="geo-line" />
        <line x1={C.x} y1={C.y} x2={A.x} y2={A.y} className="geo-line accent" />
        <line x1={C.x} y1={C.y} x2={B.x} y2={B.y} className="geo-line accent" />
        <Arc v={A} a={T} b={B} text={`${Math.round(tab)}°`} />
        <Arc v={C} a={A} b={B} text={`${Math.round(acb)}°`} />
        {(
          [
            [A, 'A'],
            [B, 'B'],
            [C, 'C'],
          ] as const
        ).map(([p, l]) => (
          <Label key={l} p={p} c={O} text={l} />
        ))}
        <text x={T.x - 4} y={T.y + 16} className="geo-label" textAnchor="end">
          T
        </text>
        <text x={S.x + 4} y={S.y + 16} className="geo-label">
          S
        </text>
      </>
    );
    readout = (
      <span>
        ∠TAB = <strong className="num">{Math.round(tab)}°</strong>, ∠ACB = <strong className="num">{Math.round(acb)}°</strong>
      </span>
    );
    note = 'The angle between the tangent and the chord equals the angle in the alternate segment, wherever C is.';
    controls = (
      <>
        <Slider label="Turn the chord AB" value={tt} min={20} max={85} onChange={setTt} format={(v) => `${v}°`} />
        <Slider label="Move C" value={cp} min={0} max={1} step={0.01} onChange={setCp} format={(v) => `${Math.round(v * 100)}%`} />
      </>
    );
  }
  return (
    <div className="geo-lab">
      <p className="widget-readout" aria-live="polite">
        {readout}
      </p>
      <svg viewBox="0 0 300 230" className="geo" role="img" aria-label={`Circle theorem lab. ${note}`}>
        <circle cx={O.x} cy={O.y} r={R} className="geo-circle" />
        {body}
      </svg>
      <div className="widget-controls first">
        <Segmented label="Theorem" value={view} onChange={setView} options={mode === 'centre' ? [{ value: 'a', label: 'Centre and circle' }, { value: 'b', label: 'Same segment' }] : [{ value: 'a', label: 'Cyclic quad' }, { value: 'b', label: 'Tangent and chord' }]} />
      </div>
      <div className="widget-controls">{controls}</div>
      <Note ok={null}>
        <p>{note}</p>
      </Note>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function ProportionLab() {
  const [t, setT] = useState(0.4);
  const [ax, setAx] = useState(0.9);
  const A = { x: ax, y: 2 };
  const B = { x: 0, y: 0 };
  const C = { x: 2.6, y: 0 };
  const D = { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t };
  const E = { x: A.x + (C.x - A.x) * t, y: A.y + (C.y - A.y) * t };
  const { s } = useView([A, B, C], 300, 210, 30, [{ x: -0.4, y: 0 }, { x: 3, y: 0 }]);
  const [SA, SB, SC, SD, SE] = [A, B, C, D, E].map(s) as [V, V, V, V, V];
  const k = 2.5;
  const len = (p: V, q: V) => dist(p, q) * k;
  return (
    <div className="geo-lab">
      <p className="widget-readout" aria-live="polite">
        <span>
          AD : DB = <strong className="num">{c2(len(A, D) / len(D, B))}</strong>, AE : EC = <strong className="num">{c2(len(A, E) / len(E, C))}</strong>
        </span>
        <span className="muted">
          DE ÷ BC = {c2(len(D, E) / len(B, C))}, AD ÷ AB = {c2(len(A, D) / len(A, B))}
        </span>
      </p>
      <svg viewBox="0 0 300 210" className="geo" role="img" aria-label={`Triangle ABC with DE parallel to BC. AD to DB is ${c2(len(A, D) / len(D, B))}, the same as AE to EC.`}>
        <polygon points={[SA, SB, SC].map((p) => `${p.x},${p.y}`).join(' ')} className="geo-fill" />
        <line x1={SD.x} y1={SD.y} x2={SE.x} y2={SE.y} className="geo-line strong" />
        <text x={SA.x} y={SA.y - 10} textAnchor="middle" className="geo-label">
          A
        </text>
        <text x={SB.x - 10} y={SB.y + 14} className="geo-label">
          B
        </text>
        <text x={SC.x + 6} y={SC.y + 14} className="geo-label">
          C
        </text>
        <text x={SD.x - 12} y={SD.y + 4} textAnchor="end" className="geo-label">
          D
        </text>
        <text x={SE.x + 12} y={SE.y + 4} className="geo-label">
          E
        </text>
      </svg>
      <dl className="es-stats geo-stats">
        {(
          [
            ['AD', len(A, D)],
            ['DB', len(D, B)],
            ['AE', len(A, E)],
            ['EC', len(E, C)],
            ['DE', len(D, E)],
            ['BC', len(B, C)],
          ] as const
        ).map(([n, v]) => (
          <div key={n}>
            <dt>{n}</dt>
            <dd className="num">{c2(v, 1)}</dd>
          </div>
        ))}
      </dl>
      <div className="widget-controls">
        <Slider label="Slide DE (keeps DE ∥ BC)" value={t} min={0.15} max={0.85} step={0.05} onChange={setT} format={(v) => c2(v)} />
        <Slider label="Move A" value={ax} min={-0.3} max={2.9} step={0.1} onChange={setAx} format={(v) => c2(v, 1)} />
      </div>
      <Note ok={null}>
        <p>The sides change, but AD : DB always equals AE : EC. Triangle ADE is an enlargement of triangle ABC, so DE ÷ BC equals AD ÷ AB.</p>
      </Note>
    </div>
  );
}
