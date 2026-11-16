/**
 * Solids for measurement questions, drawn the way exam papers draw them: schematic (not to scale), oblique,
 * hidden edges dashed, and the given measurements written on. Every figure has alt text from the generator.
 */
import type { Figure as FigureSpec } from '../../shared/questions/types.ts';

type Spec = Extract<FigureSpec, { kind: 'solid' }>;
type L = Spec['labels'];

const Line = ({ x1, y1, x2, y2, hidden }: { x1: number; y1: number; x2: number; y2: number; hidden?: boolean }) => <line x1={x1} y1={y1} x2={x2} y2={y2} className={hidden ? 'sf-hidden' : 'sf-edge'} />;
const Label = ({ x, y, text, anchor = 'middle' }: { x: number; y: number; text?: string | undefined; anchor?: 'start' | 'middle' | 'end' }) =>
  text ? (
    <text x={x} y={y} textAnchor={anchor} className="sf-label">
      {text}
    </text>
  ) : null;
/** An ellipse whose back half is dashed (hidden), as a base seen from slightly above. */
const Base = ({ cx, cy, rx, ry, solidBack }: { cx: number; cy: number; rx: number; ry: number; solidBack?: boolean }) => (
  <>
    <path d={`M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 0 ${cx + rx} ${cy}`} className="sf-edge" />
    <path d={`M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`} className={solidBack ? 'sf-edge' : 'sf-hidden'} />
  </>
);
const Radius = ({ cx, cy, rx, text }: { cx: number; cy: number; rx: number; text?: string | undefined }) =>
  text ? (
    <>
      <Line x1={cx} y1={cy} x2={cx + rx} y2={cy} />
      <circle cx={cx} cy={cy} r={2.5} className="sf-dot" />
      <Label x={cx + rx / 2} y={cy - 6} text={text} />
    </>
  ) : null;

function Cuboid({ l }: { l: L }) {
  const [x, y, w, h, dx, dy] = [40, 80, 150, 110, 45, -35];
  return (
    <>
      <Line x1={x} y1={y + h} x2={x + dx} y2={y + h + dy} hidden />
      <Line x1={x + dx} y1={y + h + dy} x2={x + dx} y2={y + dy} hidden />
      <Line x1={x + dx} y1={y + h + dy} x2={x + w + dx} y2={y + h + dy} hidden />
      <path d={`M ${x} ${y} l ${dx} ${dy} h ${w} l ${-dx} ${-dy} Z`} className="sf-edge sf-fill" />
      <path d={`M ${x + w} ${y} l ${dx} ${dy} v ${h} l ${-dx} ${-dy} Z`} className="sf-edge sf-side" />
      <rect x={x} y={y} width={w} height={h} className="sf-face" />
      <Label x={x + w / 2} y={y + h + 18} text={l.l} />
      <Label x={x - 8} y={y + h / 2} text={l.h} anchor="end" />
      <Label x={x + w + dx / 2 + 6} y={y + h + dy / 2 + 14} text={l.w} anchor="start" />
    </>
  );
}

function TriPrism({ l }: { l: L }) {
  const A: [number, number] = [40, 190];
  const B: [number, number] = [40, 90];
  const C: [number, number] = [130, 190];
  const [dx, dy] = [110, -45];
  return (
    <>
      <path d={`M ${B[0]} ${B[1]} L ${B[0] + dx} ${B[1] + dy} L ${C[0] + dx} ${C[1] + dy} L ${C[0]} ${C[1]} Z`} className="sf-edge sf-fill" />
      <polygon points={`${A} ${B} ${C}`} className="sf-face" />
      <Line x1={A[0]!} y1={A[1]!} x2={A[0]! + dx} y2={A[1]! + dy} hidden />
      <Line x1={A[0]! + dx} y1={A[1]! + dy} x2={B[0]! + dx} y2={B[1]! + dy} hidden />
      <Line x1={A[0]! + dx} y1={A[1]! + dy} x2={C[0]! + dx} y2={C[1]! + dy} hidden />
      <path d={`M ${A[0]! + 10} ${A[1]} v -10 h -10`} className="sf-edge" />
      <Label x={A[0]! - 8} y={(A[1]! + B[1]!) / 2} text={l.a} anchor="end" />
      <Label x={(A[0]! + C[0]!) / 2} y={A[1]! + 18} text={l.b} />
      <Label x={(B[0]! + C[0]!) / 2 + 4} y={(B[1]! + C[1]!) / 2 + 4} text={l.slant} anchor="start" />
      <Label x={C[0]! + dx / 2 + 10} y={C[1]! + dy / 2 + 12} text={l.l} anchor="start" />
    </>
  );
}

function Cylinder({ l, top = 50, bottom = 190, cap }: { l: L; top?: number; bottom?: number; cap?: 'hemi' | 'cone' }) {
  const [cx, rx, ry] = [130, 70, 18];
  return (
    <>
      <rect x={cx - rx} y={top} width={2 * rx} height={bottom - top} className="sf-fill" stroke="none" />
      <Line x1={cx - rx} y1={top} x2={cx - rx} y2={bottom} />
      <Line x1={cx + rx} y1={top} x2={cx + rx} y2={bottom} />
      <Base cx={cx} cy={bottom} rx={rx} ry={ry} />
      {cap ? <Base cx={cx} cy={top} rx={rx} ry={ry} /> : <ellipse cx={cx} cy={top} rx={rx} ry={ry} className="sf-face" />}
      <Radius cx={cx} cy={cap ? bottom : top} rx={rx} text={l.r} />
      <Label x={cx + rx + 8} y={(top + bottom) / 2} text={l.h} anchor="start" />
    </>
  );
}

function Cone({ l, base = 190, apexY = 40, down = false }: { l: L; base?: number; apexY?: number; down?: boolean }) {
  const [cx, rx, ry] = [130, 70, 18];
  return (
    <>
      <path d={`M ${cx - rx} ${base} L ${cx} ${apexY} L ${cx + rx} ${base}`} className="sf-edge sf-fill" />
      {down ? <Base cx={cx} cy={base} rx={rx} ry={ry} solidBack /> : <Base cx={cx} cy={base} rx={rx} ry={ry} />}
      <Line x1={cx} y1={apexY} x2={cx} y2={base} hidden />
      <Radius cx={cx} cy={base} rx={rx} text={l.r} />
      <Label x={cx + 5} y={apexY + (base - apexY) * 0.68} text={l.h} anchor="start" />
      <Label x={cx + rx / 2 + 10} y={(apexY + base) / 2} text={l.slant} anchor="start" />
    </>
  );
}

function Dome({ cx, cy, r, ry = 18, flat }: { cx: number; cy: number; r: number; ry?: number; flat?: boolean }) {
  return (
    <>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} className="sf-edge sf-fill" />
      {flat ? <ellipse cx={cx} cy={cy} rx={r} ry={ry} className="sf-face" /> : <Base cx={cx} cy={cy} rx={r} ry={ry} />}
    </>
  );
}

function Pyramid({ l, tri }: { l: L; tri: boolean }) {
  const apex = [128, 40];
  const base = tri
    ? [
        [50, 190],
        [190, 190],
        [150, 150],
      ]
    : [
        [45, 190],
        [170, 190],
        [215, 155],
        [90, 155],
      ];
  const centre = tri ? [(50 + 190 + 150) / 3, (190 + 190 + 150) / 3] : [130, 172.5];
  const front = tri ? [0, 1] : [0, 1, 2];
  const hiddenCorner = tri ? 2 : 3;
  const mid = [(base[0]![0]! + base[1]![0]!) / 2, (base[0]![1]! + base[1]![1]!) / 2];
  return (
    <>
      <polygon points={`${apex} ${front.map((i) => base[i]).join(' ')}`} className="sf-fill" stroke="none" />
      {base.map((p, i) => {
        const q = base[(i + 1) % base.length]!;
        const hidden = i === hiddenCorner || (i + 1) % base.length === hiddenCorner;
        return <Line key={i} x1={p[0]!} y1={p[1]!} x2={q[0]!} y2={q[1]!} hidden={hidden} />;
      })}
      {base.map((p, i) => (
        <Line key={`a${i}`} x1={apex[0]!} y1={apex[1]!} x2={p[0]!} y2={p[1]!} hidden={i === hiddenCorner} />
      ))}
      {l.h ? (
        <>
          <Line x1={apex[0]!} y1={apex[1]!} x2={centre[0]!} y2={centre[1]!} hidden />
          <Label x={apex[0]! + 5} y={apex[1]! + (centre[1]! - apex[1]!) * 0.7} text={l.h} anchor="start" />
        </>
      ) : null}
      {l.slant ? (
        <>
          <Line x1={apex[0]!} y1={apex[1]!} x2={mid[0]!} y2={mid[1]!} hidden />
          <Label x={(apex[0]! + mid[0]!) / 2 + 6} y={(apex[1]! + mid[1]!) / 2} text={l.slant} anchor="start" />
        </>
      ) : null}
      <Label x={mid[0]!} y={mid[1]! + 18} text={l.side} />
    </>
  );
}

function Shape({ f }: { f: Spec }) {
  const l = f.labels;
  switch (f.shape) {
    case 'cuboid':
      return <Cuboid l={l} />;
    case 'triangular-prism':
      return <TriPrism l={l} />;
    case 'cylinder':
      return <Cylinder l={l} />;
    case 'cone':
      return <Cone l={l} />;
    case 'sphere':
      return (
        <>
          <circle cx={130} cy={120} r={85} className="sf-edge sf-fill" />
          <Base cx={130} cy={120} rx={85} ry={20} />
          <Radius cx={130} cy={120} rx={85} text={l.r} />
        </>
      );
    case 'hemisphere':
      return (
        <>
          <Dome cx={130} cy={170} r={95} flat />
          <Radius cx={130} cy={170} rx={95} text={l.r} />
        </>
      );
    case 'square-pyramid':
      return <Pyramid l={l} tri={false} />;
    case 'triangular-pyramid':
      return <Pyramid l={l} tri />;
    case 'cylinder-hemisphere':
      return (
        <>
          <Dome cx={130} cy={110} r={70} />
          <Cylinder l={{ ...l, r: undefined }} top={110} bottom={200} cap="hemi" />
          <Radius cx={130} cy={110} rx={70} text={l.r} />
        </>
      );
    case 'cone-hemisphere':
      return (
        <>
          <Dome cx={130} cy={95} r={70} />
          <Cone l={l} base={95} apexY={210} down />
        </>
      );
    case 'cylinder-cone':
      return (
        <>
          <Cone l={{ h: l.h2 }} base={110} apexY={25} />
          <Cylinder l={l} top={110} bottom={200} cap="cone" />
        </>
      );
  }
}

export function SolidFigure({ f }: { f: Spec }) {
  return (
    <figure className="solid-figure">
      <svg viewBox="-20 0 320 225" role="img" aria-label={f.alt}>
        <Shape f={f} />
      </svg>
      <figcaption className="muted small">Not drawn to scale.</figcaption>
    </figure>
  );
}
