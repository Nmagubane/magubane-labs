/** Physical Sciences labs, Grades 7–10: particles, density, pH, conduction, energy, series/parallel. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Tex } from '../../ui/RichText.tsx';
import { Button, Segmented } from '../../ui/primitives.tsx';
import { Slider } from './MathWidgets.tsx';
import { SUBSTANCES, stateAt, LIQUIDS, PH_SUBSTANCES, type State } from '../../../shared/questions/generators/science-matter.ts';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const r2 = (v: number) => Math.round(v * 100) / 100;
const degC = (t: number) => `${t < 0 ? '−' : ''}${Math.abs(Math.round(t))} °C`;

/** Calls `frame(dtSeconds)` every animation frame while `on` is true. Never runs under reduced motion. */
function useFrames(on: boolean, frame: (dt: number) => void) {
  const cb = useRef(frame);
  cb.current = frame;
  useEffect(() => {
    if (!on || reducedMotion()) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      cb.current(Math.min(0.05, (now - last) / 1000));
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on]);
}

/** A small seeded generator so first renders are stable (no hydration-style jumps). */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

// ---------------------------------------------------------------------------
const LAB_SUBSTANCES = ['water', 'ethanol', 'oxygen', 'bromine', 'mercury', 'iron'];
const BOX_W = 320;
const BOX_H = 220;
const N = 30;

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hx: number;
  hy: number;
  ph: number;
}

function home(i: number): { hx: number; hy: number } {
  const cols = 6;
  const c = i % cols;
  const r = Math.floor(i / cols);
  return { hx: BOX_W / 2 - (cols - 1) * 11 + c * 22, hy: BOX_H - 20 - r * 22 };
}

export function ParticleLab({ substance }: { substance: string }) {
  const [sid, setSid] = useState(LAB_SUBSTANCES.includes(substance) ? substance : 'water');
  const s = SUBSTANCES.find((x) => x.name === sid)!;
  const span = Math.max(60, s.bp - s.mp);
  const tMin = Math.round(s.mp - span * 0.5);
  const tMax = Math.round(s.bp + span * 0.5);
  const [t, setT] = useState(() => (s.mp < 25 && s.bp > 25 ? 25 : Math.round((s.mp + s.bp) / 2)));
  useEffect(() => setT(s.mp < 25 && s.bp > 25 ? 25 : Math.round((s.mp + s.bp) / 2)), [s]);
  const st: State = stateAt(s, t);
  const energy = 0.25 + (1.75 * (t - tMin)) / (tMax - tMin);

  const ps = useRef<P[]>([]);
  if (ps.current.length === 0) {
    const rnd = seeded(7);
    ps.current = Array.from({ length: N }, (_, i) => ({ x: rnd() * BOX_W, y: rnd() * BOX_H, vx: rnd() - 0.5, vy: rnd() - 0.5, ...home(i), ph: rnd() * 6.28 }));
  }
  const [, setTick] = useState(0);
  const clock = useRef(0);

  // Snap to a sensible static arrangement for the state (also the reduced-motion view).
  useEffect(() => {
    const rnd = seeded(11);
    for (const [i, p] of ps.current.entries()) {
      if (st === 'solid') (p.x = p.hx), (p.y = p.hy);
      else if (st === 'liquid') {
        const c = i % 8;
        const r = Math.floor(i / 8);
        p.x = 30 + c * 36 + rnd() * 8;
        p.y = BOX_H - 12 - r * 18 - rnd() * 4;
      } else (p.x = 15 + rnd() * (BOX_W - 30)), (p.y = 15 + rnd() * (BOX_H - 30));
    }
    setTick((k) => k + 1);
  }, [st]);

  useFrames(true, (dt) => {
    clock.current += dt;
    const speed = 60 * energy;
    const top = st === 'liquid' ? BOX_H * 0.5 : 8;
    for (const p of ps.current) {
      if (st === 'solid') {
        const amp = 1 + energy * 2.2;
        p.x = p.hx + Math.sin(clock.current * 18 + p.ph) * amp;
        p.y = p.hy + Math.cos(clock.current * 15 + p.ph * 1.3) * amp;
        continue;
      }
      const jitter = st === 'liquid' ? 2.4 : 0.6;
      p.vx += (Math.random() - 0.5) * jitter;
      p.vy += (Math.random() - 0.5) * jitter + (st === 'liquid' ? 0.05 : 0);
      const v = Math.hypot(p.vx, p.vy) || 1;
      const target = st === 'gas' ? speed * 2.2 : speed * 0.55;
      p.vx = (p.vx / v) * target;
      p.vy = (p.vy / v) * target;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < 8) (p.x = 8), (p.vx = Math.abs(p.vx));
      if (p.x > BOX_W - 8) (p.x = BOX_W - 8), (p.vx = -Math.abs(p.vx));
      if (p.y < top) (p.y = top), (p.vy = Math.abs(p.vy));
      if (p.y > BOX_H - 8) (p.y = BOX_H - 8), (p.vy = -Math.abs(p.vy));
    }
    setTick((k) => (k + 1) % 1e6);
  });

  const pct = (v: number) => ((v - tMin) / (tMax - tMin)) * 100;
  const step = tMax - tMin > 1000 ? 10 : 1;
  return (
    <div className="plab">
      <ul className="chip-list" aria-label="Substance">
        {LAB_SUBSTANCES.map((id) => (
          <li key={id}>
            <button type="button" className={`chip${sid === id ? ' on' : ''}`} aria-pressed={sid === id} onClick={() => setSid(id)}>
              {id[0]!.toUpperCase() + id.slice(1)}
            </button>
          </li>
        ))}
      </ul>
      <p className="widget-readout" aria-live="polite">
        <span>
          At <strong className="num">{degC(t)}</strong>, {s.name} is a <strong className={`state-word state-${st}`}>{st}</strong>.
        </span>
        <span className="muted">
          It melts at {degC(s.mp)} and boils at {degC(s.bp)}.
        </span>
      </p>
      <div className="plab-grid">
        <svg viewBox={`0 0 ${BOX_W} ${BOX_H}`} className="plab-box" role="img" aria-label={`Particles of ${s.name} as a ${st}: ${st === 'solid' ? 'packed in fixed positions, vibrating' : st === 'liquid' ? 'close together, sliding past each other' : 'far apart, moving fast'}`}>
          <rect x={1} y={1} width={BOX_W - 2} height={BOX_H - 2} rx={8} className="plab-container" />
          {ps.current.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={8} className={`particle particle-${st}`} />
          ))}
        </svg>
        <div className="thermo" aria-hidden>
          <div className="thermo-bar">
            <span className="thermo-zone zone-solid" style={{ width: `${pct(s.mp)}%` }} />
            <span className="thermo-zone zone-liquid" style={{ left: `${pct(s.mp)}%`, width: `${pct(s.bp) - pct(s.mp)}%` }} />
            <span className="thermo-zone zone-gas" style={{ left: `${pct(s.bp)}%`, right: 0 }} />
            <span className="thermo-mark" style={{ left: `${pct(s.mp)}%` }}>
              <span>melts {degC(s.mp)}</span>
            </span>
            <span className="thermo-mark thermo-mark-b" style={{ left: `${pct(s.bp)}%` }}>
              <span>boils {degC(s.bp)}</span>
            </span>
            <span className="thermo-now" style={{ left: `${pct(t)}%` }} />
          </div>
        </div>
      </div>
      <div className="widget-controls">
        <Slider label="Temperature (°C)" value={t} min={tMin} max={tMax} step={step} onChange={setT} format={(v) => degC(v)} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function FloatTank() {
  const [m, setM] = useState(150);
  const [V, setV] = useState(200);
  const [lid, setLid] = useState<(typeof LIQUIDS)[number]['name']>('water');
  const liq = LIQUIDS.find((l) => l.name === lid)!;
  const rho = m / V;
  const floats = rho < liq.rho;
  const frac = Math.min(1, rho / liq.rho);
  const W = 360;
  const H = 240;
  const surface = 70;
  const floor = H - 14;
  const side = 30 + Math.cbrt(V) * 7.5;
  const x = W / 2 - side / 2;
  const y = floats ? surface - side * (1 - frac) : floor - side;
  return (
    <div className="tank">
      <p className="widget-readout" aria-live="polite">
        <Tex tex={`\\rho = \\dfrac{m}{V} = \\dfrac{${m}}{${V}} = ${r2(rho)}\\ \\text{g/cm}^3`} />
        <span className="muted">
          {floats ? `Less dense than ${liq.name} (${liq.rho} g/cm³), so it floats with ${Math.round(frac * 100)}% of its volume under the surface.` : `Denser than ${liq.name} (${liq.rho} g/cm³), so it sinks.`}
        </span>
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="tank-svg" role="img" aria-label={`A block of density ${r2(rho)} grams per cubic centimetre ${floats ? 'floating in' : 'sunk to the bottom of'} ${liq.name}`}>
        <rect x={40} y={surface} width={W - 80} height={floor - surface} className={`liquid liquid-${lid.replace(/\s/g, '-')}`} />
        <path d={`M40 20 V${floor} H${W - 40} V20`} className="tank-glass" fill="none" />
        <g className="tank-block" style={{ transform: `translate(${x}px, ${y}px)` }}>
          <rect width={side} height={side} rx={3} className="block" />
          <text x={side / 2} y={side / 2 + 4} textAnchor="middle" className="block-label">
            {r2(rho)}
          </text>
        </g>
        <text x={W - 44} y={surface - 6} textAnchor="end" className="plot-tick">
          {liq.name}: {liq.rho} g/cm³
        </text>
      </svg>
      <div className="widget-controls">
        <Slider label="Mass (g)" value={m} min={5} max={600} step={5} onChange={setM} />
        <Slider label="Volume (cm³)" value={V} min={10} max={600} step={10} onChange={setV} />
        <Segmented label="Liquid" value={lid} onChange={setLid} options={LIQUIDS.map((l) => ({ value: l.name, label: l.name[0]!.toUpperCase() + l.name.slice(1) }))} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
type Indicator = 'litmus' | 'phenolphthalein' | 'universal';
/** Universal indicator colours, pH 0 → 14. */
const UNIVERSAL = ['#d7262f', '#e3402a', '#ee6a23', '#f39a1f', '#f6c21c', '#e7d92a', '#b9d63a', '#5fb648', '#2fa36b', '#2b8f99', '#2f6fb3', '#3a50aa', '#4b3d99', '#5a2f8a', '#5a2a74'];
const uColour = (ph: number) => UNIVERSAL[Math.max(0, Math.min(14, Math.round(ph)))]!;

export function PhLab() {
  const [sid, setSid] = useState<string>('vinegar');
  const [ind, setInd] = useState<Indicator>('litmus');
  const s = PH_SUBSTANCES.find((x) => x.name === sid)!;
  const cls = s.ph < 7 ? 'acidic' : s.ph > 7 ? 'basic' : 'neutral';
  const redLitmus = s.ph > 8.3 ? 'blue' : 'red';
  const blueLitmus = s.ph < 4.5 ? 'red' : 'blue';
  const unclear = s.ph >= 4.5 && s.ph <= 8.3 && s.ph !== 7;
  const pink = s.ph >= 8.2;
  const liquidFill = ind === 'universal' ? uColour(s.ph) : ind === 'phenolphthalein' ? (pink ? '#e2489b' : 'var(--lab-clear)') : 'var(--lab-clear)';
  const result =
    ind === 'litmus'
      ? `Red litmus ${redLitmus === 'blue' ? 'turns blue' : 'stays red'}; blue litmus ${blueLitmus === 'red' ? 'turns red' : 'stays blue'}.${unclear ? ' (Near neutral, litmus barely changes: a weak result.)' : ''}`
      : ind === 'phenolphthalein'
        ? pink
          ? 'Phenolphthalein turns pink: a base.'
          : 'Phenolphthalein stays colourless: acidic or neutral. It can\'t tell those apart.'
        : `Universal indicator shows pH about ${Math.round(s.ph)}.`;
  return (
    <div className="phlab">
      <ul className="chip-list" aria-label="Substance to test">
        {PH_SUBSTANCES.filter((x) => x.name !== 'battery acid').map((x) => (
          <li key={x.name}>
            <button type="button" className={`chip${sid === x.name ? ' on' : ''}`} aria-pressed={sid === x.name} onClick={() => setSid(x.name)}>
              {x.name[0]!.toUpperCase() + x.name.slice(1)}
            </button>
          </li>
        ))}
      </ul>
      <Segmented label="Indicator" value={ind} onChange={setInd} options={[{ value: 'litmus', label: 'Litmus paper' }, { value: 'phenolphthalein', label: 'Phenolphthalein' }, { value: 'universal', label: 'Universal indicator' }]} />
      <div className="phlab-grid">
        <svg viewBox="0 0 220 220" className="phlab-svg" role="img" aria-label={`${s.name} tested with ${ind}. ${result}`}>
          <path d="M70 20 V170 a40 40 0 0 0 80 0 V20" className="tube-glass" fill="none" />
          <path d={`M72 90 V170 a38 38 0 0 0 76 0 V90 Z`} style={{ fill: liquidFill }} className="tube-liquid" />
          {ind === 'litmus' ? (
            <g>
              <rect x={84} y={30} width={14} height={110} rx={2} className={`litmus litmus-${redLitmus}`} />
              <rect x={84} y={30} width={14} height={60} rx={2} className="litmus litmus-red" />
              <rect x={122} y={30} width={14} height={110} rx={2} className={`litmus litmus-${blueLitmus}`} />
              <rect x={122} y={30} width={14} height={60} rx={2} className="litmus litmus-blue" />
              <text x={91} y={24} textAnchor="middle" className="plot-tick">
                red
              </text>
              <text x={129} y={24} textAnchor="middle" className="plot-tick">
                blue
              </text>
            </g>
          ) : null}
        </svg>
        <div className="phlab-info">
          <p className="phlab-result" aria-live="polite">
            {result}
          </p>
          <div className="ph-scale" aria-hidden>
            {UNIVERSAL.map((c, i) => (
              <span key={i} style={{ background: c }}>
                {i}
              </span>
            ))}
            <i className="ph-pointer" style={{ left: `${(s.ph / 14) * 100}%` }} />
          </div>
          <p className="muted">
            {s.name[0]!.toUpperCase() + s.name.slice(1)}: pH about {s.ph}, so it is {cls}.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
/** Complementary error function (Abramowitz & Stegun 7.1.26), accurate to ~1e-7. */
function erfc(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-x * x);
  return x >= 0 ? y : 2 - y;
}
/** Thermal diffusivity in mm²/s (typical values). */
const RODS = [
  { name: 'Copper', a: 111 },
  { name: 'Aluminium', a: 97 },
  { name: 'Iron', a: 23 },
  { name: 'Glass', a: 0.34 },
  { name: 'Wood', a: 0.08 },
];
const DROPS = [25, 55, 85]; // mm along a 100 mm rod
const MELT = 0.3; // fraction of the flame's temperature rise that melts the wax
const SPEEDUP = 15;

export function ConductionRace() {
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  useFrames(running, (dt) => setTime((t) => Math.min(600, t + dt * SPEEDUP)));
  useEffect(() => {
    if (time >= 600) setRunning(false);
  }, [time]);
  const u = (a: number, x: number, tt: number) => (tt <= 0 ? 0 : erfc(x / (2 * Math.sqrt(a * tt))));
  const meltTime = (a: number, x: number) => (x * x) / (4 * a * 0.7329 ** 2);
  const W = 420;
  const rowH = 46;
  const L = 300;
  const x0 = 104;
  const start = () => {
    if (reducedMotion()) {
      setTime(600);
      return;
    }
    setTime(0);
    setRunning(true);
  };
  return (
    <div className="race">
      <p className="widget-readout" aria-live="polite">
        <span>
          Time: <strong className="num">{Math.round(time)} s</strong>
        </span>
        <span className="muted">The animation runs {SPEEDUP}× faster than real time. Each rod is 10 cm long.</span>
      </p>
      <svg viewBox={`0 0 ${W} ${RODS.length * rowH + 20}`} className="race-svg" role="img" aria-label="Five rods heated at the left end, with wax drops along each rod">
        <defs>
          {RODS.map((r, i) => (
            <linearGradient key={r.name} id={`heat-${i}`} x1="0" x2="1">
              {[0, 0.1, 0.25, 0.4, 0.6, 0.8, 1].map((f) => {
                const v = u(r.a, f * 100, time);
                return <stop key={f} offset={f} style={{ stopColor: `color-mix(in srgb, var(--lab-hot) ${Math.round(v * 100)}%, var(--lab-rod))` }} />;
              })}
            </linearGradient>
          ))}
        </defs>
        <rect x={x0 - 14} y={4} width={14} height={RODS.length * rowH - 10} rx={3} className="flame" />
        <text x={x0 - 7} y={RODS.length * rowH + 12} textAnchor="middle" className="plot-tick">
          heat
        </text>
        {RODS.map((r, i) => {
          const y = 18 + i * rowH;
          return (
            <g key={r.name}>
              <text x={0} y={y + 6} className="race-label">
                {r.name}
              </text>
              <rect x={x0} y={y - 6} width={L} height={12} rx={3} fill={`url(#heat-${i})`} className="rod" />
              {DROPS.map((d) => {
                const gone = time >= meltTime(r.a, d);
                return <circle key={d} cx={x0 + (d / 100) * L} cy={gone ? y + 26 : y + 12} r={5} className={`wax${gone ? ' wax-gone' : ''}`} />;
              })}
            </g>
          );
        })}
      </svg>
      <table className="race-table">
        <caption className="sr-only">Wax drops fallen off each rod</caption>
        <thead>
          <tr>
            <th scope="col">Rod</th>
            <th scope="col">Drops off</th>
            <th scope="col">Last drop falls after</th>
          </tr>
        </thead>
        <tbody>
          {RODS.map((r) => {
            const off = DROPS.filter((d) => time >= meltTime(r.a, d)).length;
            const last = meltTime(r.a, DROPS[2]!);
            return (
              <tr key={r.name}>
                <th scope="row">{r.name}</th>
                <td className="num">{off} of 3</td>
                <td className="num">{last < 120 ? `${Math.round(last)} s` : last < 3600 ? `${Math.round(last / 60)} min` : `about ${Math.round(last / 3600)} h`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="widget-buttons">
        <Button variant="secondary" size="sm" onClick={start}>
          {time > 0 ? 'Heat again' : 'Light the flame'}
        </Button>
        <Button variant="quiet" size="sm" onClick={() => (setRunning(false), setTime(0))} disabled={time === 0}>
          Reset
        </Button>
      </div>
      <p className="muted small">Model: heat spreading along an insulated rod, using typical thermal diffusivities. Real rods also lose heat to the air.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
const G = 9.8;
export function EnergyDrop() {
  const [h, setH] = useState(20);
  const [m, setM] = useState(2);
  const [f, setF] = useState(0); // fraction of the fall completed (by time)
  const [running, setRunning] = useState(false);
  const T = Math.sqrt((2 * h) / G);
  const dur = Math.min(2.2, 0.6 + T * 0.5);
  useFrames(running, (dt) => setF((x) => Math.min(1, x + dt / dur)));
  useEffect(() => {
    if (f >= 1) setRunning(false);
  }, [f]);
  useEffect(() => setF(0), [h, m]);
  const tt = f * T;
  const fallen = Math.min(h, 0.5 * G * tt * tt);
  const height = h - fallen;
  const v = G * tt;
  const Ep = m * G * height;
  const Ek = 0.5 * m * v * v;
  const total = m * G * h;
  const W = 360;
  const H = 260;
  const top = 20;
  const ground = H - 24;
  const yBall = ground - (height / 50) * (ground - top) - 10;
  const bar = (val: number) => (total > 0 ? (val / total) * 176 : 0);
  return (
    <div className="drop">
      <p className="widget-readout" aria-live="polite">
        <span>
          Height <strong className="num">{r2(height)} m</strong>, speed <strong className="num">{r2(v)} m/s</strong>
        </span>
        <span className="muted">{f >= 1 ? `It lands at ${r2(Math.sqrt(2 * G * h))} m/s, whatever its mass.` : 'Press Drop and watch the energy change form.'}</span>
      </p>
      <div className="drop-grid">
        <svg viewBox={`0 0 ${W} ${H}`} className="drop-svg" role="img" aria-label={`Ball of mass ${m} kilograms at ${r2(height)} metres`}>
          <line x1={20} x2={W - 20} y1={ground} y2={ground} className="plot-axis" />
          <line x1={60} x2={60} y1={top} y2={ground} className="plot-grid" />
          {[0, 10, 20, 30, 40, 50].map((k) => (
            <text key={k} x={52} y={ground - (k / 50) * (ground - top) + 4} textAnchor="end" className="plot-tick">
              {k} m
            </text>
          ))}
          <line x1={60} x2={150} y1={ground - (h / 50) * (ground - top)} y2={ground - (h / 50) * (ground - top)} className="plot-line-soft" />
          <circle cx={110} cy={yBall} r={6 + m * 0.9} className="ball" />
        </svg>
        <div className="ebars" role="group" aria-label="Energy">
          {[
            { k: 'Ep', label: 'Potential', val: Ep, cls: 'e-pot' },
            { k: 'Ek', label: 'Kinetic', val: Ek, cls: 'e-kin' },
            { k: 'Em', label: 'Total', val: total, cls: 'e-tot' },
          ].map((b) => (
            <div key={b.k} className="ebar">
              <span className="ebar-track">
                <span className={`ebar-fill ${b.cls}`} style={{ height: `${Math.max(1, bar(b.val))}px` }} />
              </span>
              <span className="ebar-label">
                <Tex tex={`E_${b.k === 'Ep' ? 'p' : b.k === 'Ek' ? 'k' : 'm'}`} />
                <span className="num">{Math.round(b.val)} J</span>
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="widget-controls">
        <Slider label="Drop height (m)" value={h} min={1} max={50} onChange={setH} />
        <Slider label="Mass (kg)" value={m} min={0.5} max={10} step={0.5} onChange={setM} format={(x) => x.toFixed(1)} />
        <div className="widget-buttons">
          <Button variant="secondary" size="sm" onClick={() => (reducedMotion() ? setF(1) : (setF(0), setRunning(true)))}>
            Drop
          </Button>
          <Button variant="quiet" size="sm" onClick={() => (setRunning(false), setF(0))} disabled={f === 0}>
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function ParallelLab() {
  const [mode, setMode] = useState<'series' | 'parallel'>('parallel');
  const [V, setV] = useState(12);
  const [R1, setR1] = useState(6);
  const [R2, setR2] = useState(12);
  const [in1, setIn1] = useState(true);
  const [in2, setIn2] = useState(true);
  const res = useMemo(() => {
    if (mode === 'series') {
      const ok = in1 && in2;
      const R = R1 + R2;
      const I = ok ? V / R : 0;
      return { R: ok ? R : Infinity, I, I1: I, I2: I, V1: I * R1, V2: I * R2 };
    }
    const I1 = in1 ? V / R1 : 0;
    const I2 = in2 ? V / R2 : 0;
    const R = in1 && in2 ? (R1 * R2) / (R1 + R2) : in1 ? R1 : in2 ? R2 : Infinity;
    return { R, I: I1 + I2, I1, I2, V1: in1 ? V : 0, V2: in2 ? V : 0 };
  }, [mode, V, R1, R2, in1, in2]);
  const glow = (I: number, R: number) => Math.min(1, (I * I * R) / 30);
  const Bulb = ({ x, y, on, I, R, label, toggle }: { x: number; y: number; on: boolean; I: number; R: number; label: string; toggle: () => void }) => (
    <g className="bulb" transform={`translate(${x} ${y})`} role="button" tabIndex={0} aria-pressed={!on} aria-label={`${label}: ${on ? 'in place, select to unscrew' : 'removed, select to put back'}`} onClick={toggle} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggle())}>
      <circle r={30} className="bulb-glow" style={{ opacity: on ? glow(I, R) : 0 }} />
      <circle r={16} className={`bulb-glass${on ? '' : ' bulb-out'}`} />
      {on ? <path d="M-7 4 l3 -10 l4 8 l4 -8 l3 10" className="bulb-filament" fill="none" /> : <text y={5} textAnchor="middle" className="bulb-x">×</text>}
      <text y={36} textAnchor="middle" className="bulb-label">
        {label}
      </text>
    </g>
  );
  const W = 420;
  return (
    <div className="plab2">
      <p className="widget-readout" aria-live="polite">
        <Tex tex={mode === 'series' ? `R = ${R1} + ${R2} = ${R1 + R2}\\,\\Omega` : `\\tfrac{1}{R_p} = \\tfrac{1}{${R1}} + \\tfrac{1}{${R2}} \\Rightarrow R_p = ${r2((R1 * R2) / (R1 + R2))}\\,\\Omega`} />
        <span className="muted">
          Battery current {r2(res.I)} A. Bulb 1: {r2(res.I1)} A, {r2(res.V1)} V. Bulb 2: {r2(res.I2)} A, {r2(res.V2)} V.
          {mode === 'series' && !(in1 && in2) ? ' The circuit is broken, so no current flows anywhere.' : ''}
        </span>
      </p>
      <svg viewBox={`0 0 ${W} 230`} className="pl-svg" role="group" aria-label={`${mode} circuit with two bulbs`}>
        {/* battery on the left */}
        <line x1={40} y1={100} x2={40} y2={130} className="wire" />
        <line x1={28} y1={100} x2={52} y2={100} className="cell-long" />
        <line x1={34} y1={110} x2={46} y2={110} className="cell-short" />
        <text x={58} y={112} className="plot-tick">
          {V} V
        </text>
        {mode === 'series' ? (
          <>
            <path d={`M40 100 V30 H${W - 40} V200 H40 V130`} className="wire" fill="none" />
            <Bulb x={150} y={30} on={in1} I={res.I1} R={R1} label={`Bulb 1 (${R1} Ω)`} toggle={() => setIn1(!in1)} />
            <Bulb x={290} y={30} on={in2} I={res.I2} R={R2} label={`Bulb 2 (${R2} Ω)`} toggle={() => setIn2(!in2)} />
          </>
        ) : (
          <>
            <path d={`M40 100 V30 H${W - 60} V200 H40 V130 M110 30 V200`} className="wire" fill="none" />
            <Bulb x={110} y={115} on={in1} I={res.I1} R={R1} label={`Bulb 1 (${R1} Ω)`} toggle={() => setIn1(!in1)} />
            <Bulb x={W - 60} y={115} on={in2} I={res.I2} R={R2} label={`Bulb 2 (${R2} Ω)`} toggle={() => setIn2(!in2)} />
          </>
        )}
      </svg>
      <p className="muted small">Tap a bulb to unscrew it.</p>
      <div className="widget-controls">
        <Segmented label="Circuit" value={mode} onChange={setMode} options={[{ value: 'series', label: 'Series' }, { value: 'parallel', label: 'Parallel' }]} />
        <Slider label="Battery (V)" value={V} min={1.5} max={24} step={1.5} onChange={setV} />
        <Slider label="Bulb 1 (Ω)" value={R1} min={2} max={30} onChange={setR1} />
        <Slider label="Bulb 2 (Ω)" value={R2} min={2} max={30} onChange={setR2} />
      </div>
    </div>
  );
}
