/** Science labs: force cart, projectile lab, circuit lab, atom builder, equation balancing, cell explorer, Punnett square. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Tex } from '../../ui/RichText.tsx';
import { Button, Segmented } from '../../ui/primitives.tsx';
import { CircuitFigure } from '../../ui/Figure.tsx';
import { Slider, Stepper } from './MathWidgets.tsx';
import { ELEMENTS, EQUATIONS, equationTex, type ChemEquation } from '../../../shared/questions/generators/science-chemistry.ts';
import { ORGANELLES } from '../../../shared/questions/generators/science-biology.ts';
import { chem, parseFormula } from '../../../shared/questions/tex.ts';
import { gcd } from '../../../shared/questions/rational.ts';
import type { Difficulty } from '../../../shared/questions/types.ts';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Animate t from 0→1 over `ms`, or jump straight to 1 when reduced motion is requested. */
function useAnimation() {
  const [t, setT] = useState(1);
  const raf = useRef(0);
  const run = (ms: number) => {
    cancelAnimationFrame(raf.current);
    if (reducedMotion()) return setT(1);
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setT(p);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    setT(0);
    raf.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return { t, run };
}

// ---------------------------------------------------------------------------
export function ForceCart({ mass: m0, force: f0, friction: fr0 }: { mass: number; force: number; friction: number }) {
  const [m, setM] = useState(m0);
  const [F, setF] = useState(f0);
  const [fr, setFr] = useState(fr0);
  const { t, run } = useAnimation();
  const net = Math.max(0, F - fr);
  const a = net / m;
  const T = 3; // seconds simulated
  const dist = 0.5 * a * T * T;
  const W = 600;
  const track = 520;
  const scale = track / 112; // fixed scale (pixels per metre) so different set-ups can be compared
  const pos = Math.min(track - 70, 0.5 * a * (t * T) ** 2 * scale);
  const arrow = (n: number) => Math.min(150, n * 1.5);
  return (
    <div className="cart">
      <p className="widget-readout" aria-live="polite">
        <Tex tex={`F_\\text{net} = ${F} - ${fr} = ${net}\\text{ N} \\qquad a = \\dfrac{F_\\text{net}}{m} = \\dfrac{${net}}{${m}} = ${r2(a)}\\text{ m/s}^2`} />
        <span className="muted">{F <= fr ? 'Friction balances the push: the net force is zero, so the cart does not accelerate.' : `After ${T} s it will have travelled ${r2(dist)} m.`}</span>
      </p>
      <svg viewBox={`0 0 ${W} 150`} className="cart-svg" role="img" aria-label={`Cart of mass ${m} kilograms pushed with ${F} newtons against ${fr} newtons of friction`}>
        <line x1={20} x2={W - 20} y1={118} y2={118} className="plot-axis" />
        <g transform={`translate(${30 + pos} 0)`}>
          <rect x={0} y={68} width={70} height={40} rx={4} className="cart-body" />
          <circle cx={16} cy={112} r={7} className="cart-wheel" />
          <circle cx={54} cy={112} r={7} className="cart-wheel" />
          <text x={35} y={93} textAnchor="middle" className="cart-label">
            {m} kg
          </text>
          {F > 0 ? (
            <g>
              <line x1={-arrow(F) - 4} x2={-4} y1={88} y2={88} className="force force-push" markerEnd="url(#arrow-push)" />
              <text x={-arrow(F) / 2 - 4} y={80} textAnchor="middle" className="force-label">
                {F} N
              </text>
            </g>
          ) : null}
          {fr > 0 ? (
            <g>
              <line x1={74 + arrow(fr)} x2={74} y1={112} y2={112} className="force force-friction" markerEnd="url(#arrow-friction)" />
              <text x={74 + arrow(fr) / 2} y={134} textAnchor="middle" className="force-label">
                friction {fr} N
              </text>
            </g>
          ) : null}
        </g>
        <defs>
          <marker id="arrow-push" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0 0L10 5L0 10z" className="force-head-push" />
          </marker>
          <marker id="arrow-friction" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0 0L10 5L0 10z" className="force-head-friction" />
          </marker>
        </defs>
      </svg>
      <div className="widget-controls">
        <Slider label="Push (N)" value={F} min={0} max={100} step={5} onChange={setF} />
        <Slider label="Mass (kg)" value={m} min={1} max={50} onChange={setM} />
        <Slider label="Friction (N)" value={fr} min={0} max={60} step={5} onChange={setFr} />
        <Button variant="secondary" size="sm" onClick={() => run(1800)}>
          Push for 3 s
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
const GRAVITY = [
  { id: 'earth', label: 'Earth', g: 9.8 },
  { id: 'moon', label: 'Moon', g: 1.6 },
  { id: 'mars', label: 'Mars', g: 3.7 },
  { id: 'jupiter', label: 'Jupiter', g: 24.8 },
] as const;

interface Shot {
  v: number;
  angle: number;
  g: number;
  where: string;
  mass: number;
}

function flight(s: Shot) {
  const rad = (s.angle * Math.PI) / 180;
  const vx = s.v * Math.cos(rad);
  const vy = s.v * Math.sin(rad);
  const time = (2 * vy) / s.g;
  return { vx, vy, time, range: vx * time, height: (vy * vy) / (2 * s.g) };
}

export function ProjectileLab() {
  const [v, setV] = useState(20);
  const [angle, setAngle] = useState(30);
  const [gid, setGid] = useState<(typeof GRAVITY)[number]['id']>('earth');
  const [mass, setMass] = useState(1);
  const [shots, setShots] = useState<Shot[]>([]);
  const { t, run } = useAnimation();
  const g = GRAVITY.find((x) => x.id === gid)!;
  const W = 640;
  const H = 300;
  const pad = 30;
  const all = shots.length ? shots : [{ v, angle, g: g.g, where: g.label, mass }];
  const maxRange = Math.max(20, ...all.map((s) => flight(s).range));
  const maxH = Math.max(10, ...all.map((s) => flight(s).height));
  const k = Math.min((W - 2 * pad) / maxRange, (H - 2 * pad) / maxH);
  const X = (x: number) => pad + x * k;
  const Y = (y: number) => H - pad - y * k;

  const pathFor = (s: Shot, upto = 1) => {
    const f = flight(s);
    const pts: string[] = [];
    const N = 60;
    for (let i = 0; i <= N * upto; i++) {
      const tt = (i / N) * f.time;
      pts.push(`${i ? 'L' : 'M'}${X(f.vx * tt).toFixed(1)} ${Y(f.vy * tt - 0.5 * s.g * tt * tt).toFixed(1)}`);
    }
    return pts.join(' ');
  };

  const launch = () => {
    setShots((prev) => [...prev.slice(-3), { v, angle, g: g.g, where: g.label, mass }]);
    run(1400);
  };
  const latest = shots.at(-1);
  const lf = latest ? flight(latest) : null;
  return (
    <div className="proj">
      <p className="widget-readout" aria-live="polite">
        {latest && lf ? (
          <>
            <span>
              {latest.where}, {latest.v} m/s at {latest.angle}°, {latest.mass} kg: range <strong className="num">{r2(lf.range)} m</strong>, max height <strong className="num">{r2(lf.height)} m</strong>, flight time{' '}
              <strong className="num">{r2(lf.time)} s</strong>
            </span>
          </>
        ) : (
          <span className="muted">Set it up, make your prediction, then launch.</span>
        )}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="proj-svg" role="img" aria-label="Projectile trajectories">
        <line x1={pad} x2={W - pad} y1={Y(0)} y2={Y(0)} className="plot-axis" />
        {shots.map((s, i) => {
          const isLast = i === shots.length - 1;
          return <path key={i} d={pathFor(s, isLast ? t : 1)} className={`traj${isLast ? ' traj-current' : ''}`} fill="none" />;
        })}
        {shots.map((s, i) => {
          const f = flight(s);
          if (i === shots.length - 1 && t < 1) return null;
          return (
            <text key={`l${i}`} x={X(f.range)} y={Y(0) + 14 + 12 * shots.slice(0, i).filter((o) => Math.abs(flight(o).range - f.range) < maxRange * 0.06).length} textAnchor="middle" className="plot-tick">
              {s.angle}°{s.where !== 'Earth' ? ` ${s.where}` : ''}
            </text>
          );
        })}
        <text x={pad} y={14} className="plot-tick">
          scale: {Math.round(maxRange)} m across
        </text>
      </svg>
      <div className="widget-controls">
        <Slider label="Launch speed (m/s)" value={v} min={5} max={40} onChange={setV} />
        <Slider label="Angle (°)" value={angle} min={5} max={85} onChange={setAngle} />
        <Slider label="Mass (kg)" value={mass} min={0.1} max={10} step={0.1} onChange={setMass} format={(x) => x.toFixed(1)} />
        <Segmented label="Gravity" value={gid} onChange={setGid} options={GRAVITY.map((x) => ({ value: x.id, label: x.label }))} />
        <div className="widget-buttons">
          <Button variant="secondary" size="sm" onClick={launch}>
            Launch
          </Button>
          <Button variant="quiet" size="sm" onClick={() => setShots([])} disabled={!shots.length}>
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function CircuitLab({ voltage, r1, r2: r2_ }: { voltage: number; r1: number; r2: number }) {
  const [V, setV] = useState(voltage);
  const [R1, setR1] = useState(r1);
  const [R2, setR2] = useState(r2_);
  const R = R1 + R2;
  const I = V / R;
  return (
    <div className="circ">
      <p className="widget-readout" aria-live="polite">
        <Tex tex={`R = ${R1}${R2 ? ` + ${R2}` : ''} = ${R}\\,\\Omega \\qquad I = \\dfrac{V}{R} = \\dfrac{${V}}{${R}} = ${r2(I)}\\text{ A}`} />
        <span className="muted">
          Voltage across {R1} Ω: {r2(I * R1)} V{R2 ? `; across ${R2} Ω: ${r2(I * R2)} V. Together: ${r2(I * R)} V, the battery's voltage.` : '.'}
        </span>
      </p>
      <CircuitFigure f={{ voltage: V, resistors: R2 ? [R1, R2] : [R1], current: r2(I) }} />
      <div className="widget-controls">
        <Slider label="Battery (V)" value={V} min={1.5} max={24} step={1.5} onChange={setV} />
        <Slider label="R₁ (Ω)" value={R1} min={1} max={30} onChange={setR1} />
        <Slider label="R₂ (Ω), 0 removes it" value={R2} min={0} max={30} onChange={setR2} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
const SHELLS = [2, 8, 8, 18];

export function AtomBuilder({ protons: p0, neutrons: n0, electrons: e0 }: { protons: number; neutrons: number; electrons: number }) {
  const [p, setP] = useState(p0);
  const [n, setN] = useState(n0);
  const [e, setE] = useState(e0);
  const el = ELEMENTS.find((x) => x.z === p);
  const charge = p - e;
  const chargeTex = charge === 0 ? '' : `^{${Math.abs(charge) === 1 ? '' : Math.abs(charge)}${charge > 0 ? '+' : '-'}}`;
  const shells: number[] = [];
  let left = e;
  for (const cap of SHELLS) {
    if (left <= 0) break;
    shells.push(Math.min(cap, left));
    left -= cap;
  }
  const C = 150;
  const nucleons = useMemo(() => {
    const out: { x: number; y: number; kind: 'p' | 'n' }[] = [];
    const total = p + n;
    for (let i = 0; i < total; i++) {
      const ang = i * 2.39996;
      const rad = 4.2 * Math.sqrt(i);
      out.push({ x: C + rad * Math.cos(ang), y: C + rad * Math.sin(ang), kind: i % 2 === 0 && out.filter((o) => o.kind === 'p').length < p ? 'p' : out.filter((o) => o.kind === 'n').length < n ? 'n' : 'p' });
    }
    return out;
  }, [p, n]);
  return (
    <div className="atom">
      <div className="atom-grid">
        <svg viewBox="0 0 300 300" className="atom-svg" role="img" aria-label={`Atom with ${p} protons, ${n} neutrons and ${e} electrons arranged ${shells.join(', ')}`}>
          {shells.map((_, i) => (
            <circle key={i} cx={C} cy={C} r={48 + i * 30} className="e-shell" />
          ))}
          {shells.map((count, i) =>
            Array.from({ length: count }, (_, j) => {
              const ang = (j / count) * Math.PI * 2 - Math.PI / 2;
              const r = 48 + i * 30;
              return <circle key={`${i}-${j}`} cx={C + r * Math.cos(ang)} cy={C + r * Math.sin(ang)} r={4.5} className="electron" />;
            }),
          )}
          {nucleons.map((o, i) => (
            <circle key={i} cx={o.x} cy={o.y} r={5.5} className={o.kind === 'p' ? 'proton' : 'neutron'} />
          ))}
        </svg>
        <dl className="atom-facts" aria-live="polite">
          <div>
            <dt>Element</dt>
            <dd>{el ? `${el.name[0]!.toUpperCase()}${el.name.slice(1)} (${el.symbol})` : p > 20 ? 'Beyond this lab' : 'No element'}</dd>
          </div>
          <div>
            <dt>Notation</dt>
            <dd>{el ? <Tex tex={`{}^{${p + n}}_{${p}}\\text{${el.symbol}}${chargeTex}`} /> : '–'}</dd>
          </div>
          <div>
            <dt>Mass number</dt>
            <dd className="num">{p + n}</dd>
          </div>
          <div>
            <dt>Charge</dt>
            <dd className="num">{charge === 0 ? '0 (neutral atom)' : `${charge > 0 ? '+' : '−'}${Math.abs(charge)} (${charge > 0 ? 'positive' : 'negative'} ion)`}</dd>
          </div>
          <div>
            <dt>Electron arrangement</dt>
            <dd className="num">{shells.join(', ') || '–'}</dd>
          </div>
        </dl>
      </div>
      <div className="widget-controls">
        <Stepper label="Protons" value={p} min={1} max={20} onChange={setP} />
        <Stepper label="Neutrons" value={n} min={0} max={30} onChange={setN} />
        <Stepper label="Electrons" value={e} min={0} max={22} onChange={setE} />
      </div>
      <p className="atom-legend">
        <span>
          <i className="proton" /> proton
        </span>
        <span>
          <i className="neutron" /> neutron
        </span>
        <span>
          <i className="electron" /> electron
        </span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function ChemBalancer({ level, index }: { level: Difficulty; index: number }) {
  const pool = useMemo(() => ([1, 2, 3, 4, 5] as Difficulty[]).flatMap((l) => EQUATIONS[l]), []);
  const startIdx = Math.max(0, pool.indexOf(EQUATIONS[level][index] as ChemEquation));
  const [i, setI] = useState(startIdx);
  const eq = pool[i % pool.length] as ChemEquation;
  const species = [...eq.reactants, ...eq.products];
  const [coef, setCoef] = useState<number[]>(() => species.map(() => 1));
  useEffect(() => setCoef([...eq.reactants, ...eq.products].map(() => 1)), [eq]);
  const elements = [...new Set(species.flatMap((s) => Object.keys(parseFormula(s))))];
  const count = (side: 'l' | 'r', el: string) =>
    species.reduce((sum, sp, j) => {
      const isLeft = j < eq.reactants.length;
      if ((side === 'l') !== isLeft) return sum;
      return sum + (parseFormula(sp)[el] ?? 0) * (coef[j] ?? 1);
    }, 0);
  const rows = elements.map((el) => ({ el, l: count('l', el), r: count('r', el) }));
  const balanced = rows.every((r) => r.l === r.r);
  const lowest = coef.reduce((g, c) => gcd(g, c), 0) === 1;
  return (
    <div className="chemb">
      <p className="chemb-name">{eq.name}</p>
      <div className="coef-row chemb-eq">
        {species.map((sp, j) => (
          <span key={`${i}-${j}`} className="coef">
            {j > 0 ? <span className="coef-op">{j === eq.reactants.length ? <Tex tex="\rightarrow" /> : '+'}</span> : null}
            <span className="chemb-step">
              <button type="button" className="key key-sm" aria-label={`Increase coefficient of ${sp}`} onClick={() => setCoef(coef.map((c, k) => (k === j ? Math.min(15, c + 1) : c)))}>
                +
              </button>
              <output className="num chemb-c">{coef[j]}</output>
              <button type="button" className="key key-sm" aria-label={`Decrease coefficient of ${sp}`} onClick={() => setCoef(coef.map((c, k) => (k === j ? Math.max(1, c - 1) : c)))}>
                −
              </button>
            </span>
            <Tex tex={chem(sp)} />
          </span>
        ))}
      </div>
      <table className="tally">
        <caption className="sr-only">Atoms of each element on each side</caption>
        <thead>
          <tr>
            <th scope="col">Element</th>
            <th scope="col">Left</th>
            <th scope="col">Right</th>
            <th scope="col">
              <span className="sr-only">Status</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.el} className={r.l === r.r ? 'ok' : 'off'}>
              <th scope="row">{r.el}</th>
              <td className="num">{r.l}</td>
              <td className="num">{r.r}</td>
              <td>{r.l === r.r ? 'balanced' : r.l > r.r ? 'more on left' : 'more on right'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="widget-readout" role="status">
        {balanced ? (
          lowest ? (
            <>
              <strong>Balanced.</strong> <Tex tex={equationTex(eq, coef)} />
            </>
          ) : (
            'Balanced, but every coefficient shares a factor. Divide them down to the lowest whole numbers.'
          )
        ) : (
          <span className="muted">Not balanced yet. Pick one element that doesn&apos;t match and adjust a coefficient.</span>
        )}
      </p>
      <div className="widget-buttons">
        <Button variant="quiet" size="sm" onClick={() => setCoef(species.map(() => 1))}>
          Reset
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setI((i + 1) % pool.length)}>
          Next equation
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
type CellPart = { id: string; shape: 'ellipse' | 'circle' | 'path'; props: Record<string, number | string>; plantOnly?: boolean; animalOnly?: boolean };

const CELL_PARTS: CellPart[] = [
  { id: 'wall', shape: 'path', props: { d: 'M20 40 Q20 20 40 20 H360 Q380 20 380 40 V220 Q380 240 360 240 H40 Q20 240 20 220 Z' }, plantOnly: true },
  { id: 'vacuole', shape: 'path', props: { d: 'M150 70 Q260 55 300 110 Q320 170 250 190 Q170 205 140 160 Q120 110 150 70 Z' }, plantOnly: true },
  { id: 'nucleus', shape: 'circle', props: { cx: 95, cy: 120, r: 34 } },
  { id: 'mitochondrion', shape: 'ellipse', props: { cx: 330, cy: 200, rx: 26, ry: 12 } },
  { id: 'chloroplast', shape: 'ellipse', props: { cx: 330, cy: 70, rx: 24, ry: 13 }, plantOnly: true },
  { id: 'golgi', shape: 'path', props: { d: 'M95 190 q25 -14 50 0 M98 200 q22 -12 44 0 M101 210 q19 -10 38 0' } },
  { id: 'er', shape: 'path', props: { d: 'M60 60 q20 10 40 0 t40 0 M60 72 q20 10 40 0 t40 0' } },
  { id: 'ribosome', shape: 'circle', props: { cx: 210, cy: 215, r: 5 } },
  { id: 'lysosome', shape: 'circle', props: { cx: 250, cy: 110, r: 15 }, animalOnly: true },
  { id: 'centriole', shape: 'path', props: { d: 'M290 140 h26 v8 h-26 z M300 128 h8 v26 h-8 z' }, animalOnly: true },
];

export function CellExplorer() {
  const [kind, setKind] = useState<'plant' | 'animal'>('plant');
  const [sel, setSel] = useState<string>('nucleus');
  const info = ORGANELLES.find((o) => o.id === sel);
  const parts = CELL_PARTS.filter((p) => (kind === 'plant' ? !p.animalOnly : !p.plantOnly));
  const choose = (id: string) => setSel(id);
  return (
    <div className="cell">
      <Segmented label="Cell type" value={kind} onChange={(k) => (setKind(k), setSel('nucleus'))} options={[{ value: 'plant', label: 'Plant cell' }, { value: 'animal', label: 'Animal cell' }]} />
      <div className="cell-grid">
        <svg viewBox="0 0 400 260" className="cell-svg" role="group" aria-label={`${kind} cell diagram. Choose a structure to learn about it.`}>
          {kind === 'animal' ? <ellipse cx={200} cy={130} rx={185} ry={118} className="cell-membrane" /> : <path d="M28 46 Q28 28 46 28 H354 Q372 28 372 46 V214 Q372 232 354 232 H46 Q28 232 28 214 Z" className="cell-membrane" />}
          {parts.map((p) => {
            const El = p.shape;
            const name = ORGANELLES.find((o) => o.id === p.id)?.name ?? p.id;
            return (
              <g
                key={p.id}
                role="button"
                tabIndex={0}
                aria-label={name}
                aria-pressed={sel === p.id}
                className={`organelle org-${p.id}${sel === p.id ? ' on' : ''}`}
                onClick={() => choose(p.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    choose(p.id);
                  }
                }}
              >
                <El {...(p.props as Record<string, string | number>)} />
                {p.id === 'ribosome' ? (
                  <>
                    <circle cx={225} cy={222} r={5} />
                    <circle cx={198} cy={226} r={5} />
                  </>
                ) : null}
                {p.id === 'mitochondrion' ? <ellipse cx={60} cy={205} rx={22} ry={10} /> : null}
                {p.id === 'chloroplast' ? <ellipse cx={350} cy={150} rx={20} ry={11} /> : null}
              </g>
            );
          })}
          <g role="button" tabIndex={0} aria-label="cell membrane" aria-pressed={sel === 'membrane'} className={`organelle org-membrane-hit${sel === 'membrane' ? ' on' : ''}`} onClick={() => choose('membrane')} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), choose('membrane'))}>
            <text x={kind === 'plant' ? 44 : 60} y={kind === 'plant' ? 252 : 254} className="cell-tag">
              cell membrane
            </text>
          </g>
          <g role="button" tabIndex={0} aria-label="cytoplasm" aria-pressed={sel === 'cytoplasm'} className={`organelle org-cyto-hit${sel === 'cytoplasm' ? ' on' : ''}`} onClick={() => choose('cytoplasm')} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), choose('cytoplasm'))}>
            <text x={220} y={252} className="cell-tag">
              cytoplasm
            </text>
          </g>
        </svg>
        <div className="cell-info" aria-live="polite">
          {info ? (
            <>
              <h4>{info.name[0]!.toUpperCase() + info.name.slice(1)}</h4>
              <p>It {info.fn}.</p>
              <p className="muted">{info.plant && info.animal ? 'Found in plant and animal cells.' : info.plant ? 'Plant cells only.' : 'Animal cells only (not in most plant cells).'}</p>
            </>
          ) : null}
          <p className="cell-list-label">Structures in this cell</p>
          <ul className="cell-list">
            {[...parts.map((p) => p.id), 'membrane', 'cytoplasm'].map((id) => {
              const o = ORGANELLES.find((x) => x.id === id);
              return o ? (
                <li key={id}>
                  <button type="button" className={`chip${sel === id ? ' on' : ''}`} onClick={() => choose(id)}>
                    {o.name}
                  </button>
                </li>
              ) : null;
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
const GENOTYPES = ['TT', 'Tt', 'tt'] as const;

export function PunnettSquare({ parentA, parentB }: { parentA: string; parentB: string }) {
  const [a, setA] = useState(parentA);
  const [b, setB] = useState(parentB);
  const cells: string[] = [];
  for (const y of b) for (const x of a) cells.push(x === x.toUpperCase() ? x + y : y === y.toUpperCase() ? y + x : x + y);
  const tt = cells.filter((c) => c === 'TT').length;
  const het = cells.filter((c) => c === 'Tt').length;
  const rec = cells.filter((c) => c === 'tt').length;
  const frac = (k: number) => (k === 0 ? '0' : k === 4 ? '1' : `\\tfrac{${k / gcd(k, 4)}}{${4 / gcd(k, 4)}}`);
  return (
    <div className="punnett">
      <div className="punnett-controls">
        <Segmented label="Parent 1" value={a} onChange={setA} options={GENOTYPES.map((g) => ({ value: g, label: g }))} />
        <span className="punnett-x" aria-hidden>
          ×
        </span>
        <Segmented label="Parent 2" value={b} onChange={setB} options={GENOTYPES.map((g) => ({ value: g, label: g }))} />
      </div>
      <table className="punnett-table punnett-live">
        <caption className="sr-only">
          Punnett square for {a} × {b}
        </caption>
        <thead>
          <tr>
            <th scope="col" aria-label="Alleles" />
            {[...a].map((x, i) => (
              <th key={i} scope="col">
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...b].map((y, r) => (
            <tr key={r}>
              <th scope="row">{y}</th>
              {[0, 1].map((c) => {
                const g = cells[r * 2 + c] as string;
                return (
                  <td key={c} className={g === 'tt' ? 'rec' : 'dom'}>
                    {g}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="widget-readout" aria-live="polite">
        <span>
          Genotypes: TT <Tex tex={frac(tt)} />, Tt <Tex tex={frac(het)} />, tt <Tex tex={frac(rec)} />.
        </span>
        <span>
          Phenotypes: tall <Tex tex={frac(tt + het)} />, short <Tex tex={frac(rec)} />.
        </span>
      </p>
    </div>
  );
}
