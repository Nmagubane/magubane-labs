/** Natural Sciences & Technology labs, Grades 4–6 (part 2): sound, circuits, Earth and space, structures. */
import { useRef, useState } from 'react';
import { Button, Segmented } from '../../ui/primitives.tsx';
import { Slider, Stepper } from './MathWidgets.tsx';
import { PHASES, PLANETS } from '../../../shared/questions/generators/nst-energy-earth.ts';
import { Note } from './NstLabs.tsx';

const comma = (v: number, dp = 1) => v.toFixed(dp).replace('.', ',');
const spaced = (v: number) => Math.round(v).toLocaleString('en-US').replace(/,/g, ' ');

// ---------------------------------------------------------------------------
// Sound lab: a string you can shorten, tighten and pluck — with real sound.
type Medium = 'air' | 'water' | 'steel' | 'space';
const MEDIA: Record<Medium, { label: string; speed: number | null }> = {
  air: { label: 'Air', speed: 340 },
  water: { label: 'Water', speed: 1500 },
  steel: { label: 'Steel', speed: 5000 },
  space: { label: 'Space (no air)', speed: null },
};

export function SoundLab() {
  const [length, setLength] = useState(50);
  const [tension, setTension] = useState(5);
  const [loud, setLoud] = useState(5);
  const [medium, setMedium] = useState<Medium>('air');
  const [playing, setPlaying] = useState(false);
  const ctx = useRef<AudioContext | null>(null);
  const f = Math.round(220 * Math.sqrt(tension / 5) * (50 / length));
  const describe = f < 150 ? 'low' : f < 400 ? 'middle' : 'high';
  const speed = MEDIA[medium].speed;
  const pluck = () => {
    setPlaying(true);
    window.setTimeout(() => setPlaying(false), 900);
    if (speed === null) return;
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx.current ??= new AC();
      const ac = ctx.current;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      const peak = 0.04 + (loud / 10) ** 2 * 0.3;
      gain.gain.setValueAtTime(peak, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 1.2);
      osc.connect(gain).connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + 1.25);
    } catch {
      /* No audio available: the picture still shows the vibration. */
    }
  };
  // Picture: string between two pegs, vibrating; waveform underneath.
  const W = 420;
  const sx0 = 40;
  const sx1 = sx0 + length * 4.2;
  const amp = playing ? 2 + loud * 1.6 : 0;
  const cycles = Math.max(1.5, f / 45);
  const wave = Array.from({ length: 161 }, (_, i) => {
    const x = 20 + (i / 160) * (W - 40);
    const y = 150 + Math.sin((i / 160) * cycles * 2 * Math.PI) * (4 + loud * 3.4);
    return `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  return (
    <div className="sound">
      <p className="widget-readout" aria-live="polite">
        <span>
          Pitch <strong className="num">{f} Hz</strong> <span className="muted">({describe})</span>
        </span>
        <span>
          Loudness <strong className="num">{loud}</strong>/10
        </span>
      </p>
      <svg viewBox={`0 0 ${W} 190`} className="sound-svg" role="img" aria-label={`A string ${length} cm long vibrating ${f} times a second`}>
        <rect x={20} y={36} width={W - 40} height={20} rx={4} className="sound-board" />
        <path d={`M ${sx0} 46 Q ${(sx0 + sx1) / 2} ${46 - amp} ${sx1} 46`} className={`sound-string${playing ? ' buzz' : ''}`} />
        <path d={`M ${sx0} 46 Q ${(sx0 + sx1) / 2} ${46 + amp} ${sx1} 46`} className={`sound-string ghost${playing ? ' buzz' : ''}`} />
        <rect x={sx0 - 6} y={30} width={8} height={32} className="sound-peg" />
        <rect x={sx1 - 2} y={30} width={8} height={32} className="sound-peg" />
        <text x={(sx0 + sx1) / 2} y={84} textAnchor="middle" className="sound-text">
          {length} cm
        </text>
        <text x={20} y={112} className="sound-text muted">What the sound wave looks like</text>
        <path d={wave} className={`sound-wave${speed === null ? ' none' : ''}`} />
      </svg>
      <div className="widget-controls">
        <Slider label="String length" value={length} min={20} max={80} step={5} onChange={setLength} format={(v) => `${v} cm`} />
        <Slider label="Tightness" value={tension} min={1} max={10} onChange={setTension} />
        <Slider label="Pluck strength" value={loud} min={1} max={10} onChange={setLoud} />
        <Button onClick={pluck}>Pluck</Button>
      </div>
      <div className="widget-controls">
        <Segmented label="What the sound travels through" value={medium} onChange={setMedium} options={(Object.keys(MEDIA) as Medium[]).map((m) => ({ value: m, label: MEDIA[m].label }))} />
      </div>
      <Note ok={null}>
        <p>
          {speed === null
            ? 'In space there are no particles to pass the vibrations along, so nobody hears the pluck. The string still vibrates.'
            : `Through ${MEDIA[medium].label.toLowerCase()}, sound travels about ${spaced(speed)} m every second: it would reach a friend 100 m away in ${comma(100 / speed, 2)} s.`}{' '}
          Shorter or tighter strings vibrate faster: higher pitch. Plucking harder makes bigger vibrations: louder, same pitch.
        </p>
      </Note>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Circuit builder.
const GAP_ITEMS: { id: string; label: string; conducts: number }[] = [
  { id: 'wire', label: 'Copper wire', conducts: 1 },
  { id: 'none', label: 'Nothing (a gap)', conducts: 0 },
  { id: 'straw', label: 'Plastic straw', conducts: 0 },
  { id: 'key', label: 'Metal key', conducts: 1 },
  { id: 'foil', label: 'Aluminium foil', conducts: 1 },
  { id: 'pencil', label: 'Pencil lead', conducts: 0.5 },
  { id: 'rubber', label: 'Rubber band', conducts: 0 },
  { id: 'coin', label: 'R2 coin', conducts: 1 },
];

export function CircuitBuilder() {
  const [cells, setCells] = useState(1);
  const [bulbs, setBulbs] = useState(1);
  const [closed, setClosed] = useState(true);
  const [gap, setGap] = useState('wire');
  const item = GAP_ITEMS.find((g) => g.id === gap)!;
  const flows = closed && item.conducts > 0;
  const bright = flows ? Math.min(1.25, (cells / bulbs) * item.conducts * 0.55) : 0;
  const v = cells * 1.5;
  const W = 360;
  const H = 230;
  return (
    <div className="cbuild">
      <p className="widget-readout" aria-live="polite">
        <span>
          Push from the cells: <strong className="num">{comma(v)} V</strong>
        </span>
        <span>{flows ? (bright > 1.05 ? 'Very bright! A real bulb could burn out.' : bright < 0.4 ? 'Lit, but dim.' : 'The bulb is lit.') : 'No current: the bulb is off.'}</span>
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="cbuild-svg" role="img" aria-label={`${cells} cells, ${bulbs} bulbs, switch ${closed ? 'closed' : 'open'}, ${item.label} in the gap. ${flows ? 'Bulbs lit' : 'Bulbs off'}.`}>
        {/* loop */}
        <path d={`M 60 40 H 150 M 210 40 H 300 V 190 H 220 M 140 190 H 60 V 40`} className={`cb-wire${flows ? ' live' : ''}`} />
        {/* switch on top */}
        <circle cx={150} cy={40} r={4} className="cb-node" />
        <circle cx={210} cy={40} r={4} className="cb-node" />
        <path d={closed ? 'M 150 40 L 210 40' : 'M 150 40 L 204 16'} className="cb-switch" />
        <text x={180} y={64} textAnchor="middle" className="cb-text">switch</text>
        {/* cells on the left, stacked */}
        {Array.from({ length: cells }, (_, i) => {
          const y = 115 - ((cells - 1) * 22) / 2 + i * 22;
          return (
            <g key={i}>
              <rect x={44} y={y - 8} width={32} height={16} fill="var(--paper)" stroke="none" />
              <path d={`M 44 ${y - 4} H 76`} className="cb-cell-long" />
              <path d={`M 52 ${y + 4} H 68`} className="cb-cell-short" />
            </g>
          );
        })}
        <text x={22} y={118} textAnchor="middle" className="cb-text" transform="rotate(-90 22 118)">
          {cells} × 1,5 V
        </text>
        {/* bulbs on the right */}
        {Array.from({ length: bulbs }, (_, i) => {
          const y = bulbs === 1 ? 115 : 88 + i * 56;
          return (
            <g key={i}>
              {bright > 0 ? <circle cx={300} cy={y} r={14 + bright * 18} className="cb-glow" style={{ opacity: Math.min(0.9, bright * 0.7) }} /> : null}
              <circle cx={300} cy={y} r={14} className={`cb-bulb${bright > 0 ? ' lit' : ''}`} />
              <path d={`M 290 ${y - 10} L 310 ${y + 10} M 310 ${y - 10} L 290 ${y + 10}`} className="cb-x" />
            </g>
          );
        })}
        {/* gap at the bottom */}
        <circle cx={140} cy={190} r={4} className="cb-node" />
        <circle cx={220} cy={190} r={4} className="cb-node" />
        {gap !== 'none' ? <rect x={146} y={182} width={68} height={16} rx={8} className={`cb-gap cb-gap-${gap}`} /> : null}
        <text x={180} y={218} textAnchor="middle" className="cb-text">
          {item.label}
        </text>
      </svg>
      <div className="widget-controls">
        <Stepper label="Cells" value={cells} min={1} max={3} onChange={setCells} />
        <Stepper label="Bulbs" value={bulbs} min={1} max={2} onChange={setBulbs} />
        <Button size="sm" variant="secondary" onClick={() => setClosed(!closed)}>
          {closed ? 'Open the switch' : 'Close the switch'}
        </Button>
        <label className="field compact">
          <span>In the gap</span>
          <select value={gap} onChange={(e) => setGap(e.target.value)}>
            {GAP_ITEMS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Note ok={null}>
        <p>
          {!closed
            ? 'The open switch makes a gap, so the loop is broken.'
            : item.conducts === 0
              ? `${item.label} ${gap === 'none' ? 'is not a conductor at all' : 'is an insulator'}: current can't cross the gap.`
              : item.conducts < 1
                ? 'Pencil lead (graphite) is a non-metal that conducts, but not as well as metal: the bulb is dimmer.'
                : `${item.label} conducts, so the loop is complete.`}{' '}
          {flows ? (bulbs > 1 ? 'Two bulbs in one loop share the push, so each is dimmer.' : cells > 1 ? 'More cells in a row push harder, so the bulb is brighter.' : '') : ''}
        </p>
      </Note>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Moon phases: the view from space and the view from South Africa.
const MONTH = 29.53;

export function moonPath(day: number, cx: number, cy: number, r: number, south: boolean): string {
  const a = (2 * Math.PI * day) / MONTH;
  const waxing = a % (2 * Math.PI) < Math.PI;
  const lit: 'left' | 'right' = waxing === south ? 'left' : 'right';
  const k = Math.cos(a); // > 0: crescent, < 0: gibbous
  const rx = Math.abs(k) * r;
  const limbSweep = lit === 'right' ? 1 : 0;
  const termSweep = (lit === 'left') === k > 0 ? 1 : 0;
  return `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${limbSweep} ${cx} ${cy + r} A ${rx.toFixed(2)} ${r} 0 0 ${termSweep} ${cx} ${cy - r} Z`;
}

export function MoonLab() {
  const [day, setDay] = useState(4);
  const [south, setSouth] = useState<'south' | 'north'>('south');
  const phase = PHASES[Math.round((day / MONTH) * 8) % 8]!;
  const lit = Math.round(((1 - Math.cos((2 * Math.PI * day) / MONTH)) / 2) * 100);
  const cx = 150;
  const cy = 120;
  const R = 82;
  const phi = Math.PI - (2 * Math.PI * day) / MONTH;
  const mx = cx + R * Math.cos(phi);
  const my = cy + R * Math.sin(phi);
  return (
    <div className="moon">
      <p className="widget-readout" aria-live="polite">
        <span>
          Day <strong className="num">{comma(day)}</strong>: <strong>{phase}</strong>
        </span>
        <span className="muted">{lit}% of the side facing us is lit</span>
      </p>
      <div className="moon-grid">
        <svg viewBox="0 0 300 240" className="moon-svg" role="img" aria-label={`From space: the Moon is ${phase === 'new moon' ? 'between the Earth and the Sun' : phase === 'full moon' ? 'on the far side of the Earth from the Sun' : 'part of the way around its orbit'}`}>
          <text x={8} y={18} className="moon-text">From space (Sun on the left)</text>
          {[60, 100, 140, 180].map((y) => (
            <path key={y} d={`M 6 ${y} H 34`} className="moon-ray" markerEnd="url(#moon-arrow)" />
          ))}
          <defs>
            <marker id="moon-arrow" viewBox="0 0 8 8" refX={7} refY={4} markerWidth={6} markerHeight={6} orient="auto">
              <path d="M 0 0 L 8 4 L 0 8 Z" className="moon-ray-head" />
            </marker>
          </defs>
          <circle cx={cx} cy={cy} r={R} className="moon-orbit" />
          <circle cx={cx} cy={cy} r={18} className="moon-earth" />
          <path d={`M ${cx} ${cy - 18} A 18 18 0 0 1 ${cx} ${cy + 18} Z`} className="moon-night" />
          <circle cx={mx} cy={my} r={10} className="moon-body" />
          <path d={`M ${mx} ${my - 10} A 10 10 0 0 1 ${mx} ${my + 10} Z`} className="moon-night" />
          <path d={`M ${cx} ${cy} L ${mx} ${my}`} className="moon-sight" />
        </svg>
        <svg viewBox="0 0 200 240" className="moon-svg" role="img" aria-label={`From ${south === 'south' ? 'South Africa' : 'Europe'}: ${phase}, ${lit}% lit`}>
          <text x={100} y={18} textAnchor="middle" className="moon-text">
            Seen from {south === 'south' ? 'South Africa' : 'Europe'}
          </text>
          <rect x={20} y={34} width={160} height={180} rx={8} className="moon-sky" />
          <circle cx={100} cy={124} r={56} className="moon-dark" />
          {lit > 0 ? <path d={moonPath(day, 100, 124, 56, south === 'south')} className="moon-lit" /> : null}
        </svg>
      </div>
      <div className="widget-controls">
        <Slider label="Days since new moon" value={day} min={0} max={29.5} step={0.5} onChange={setDay} format={(v) => comma(v)} />
        <Segmented label="Hemisphere" value={south} onChange={setSouth} options={[{ value: 'south', label: 'South Africa' }, { value: 'north', label: 'Europe' }]} />
      </div>
      <Note ok={null}>
        <p>
          The Sun always lights half of the Moon. As the Moon orbits the Earth (about 29½ days), we see more or less of that lit half. In South Africa a growing (waxing) Moon is lit on the <strong>left</strong>; in Europe it is lit on the right.
        </p>
      </Note>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The solar system to scale: distances or sizes, never both (they don't fit on one screen).
export function PlanetStrip() {
  const [mode, setMode] = useState<'distance' | 'size'>('distance');
  const [pi, setPi] = useState(2);
  const p = PLANETS[pi]!;
  const W = 640;
  let body;
  if (mode === 'distance') {
    body = (
      <svg viewBox={`0 0 ${W} 130`} className="planet-svg" role="img" aria-label="Distances from the Sun to scale">
        <circle cx={-60} cy={64} r={76} className="planet-sun" />
        <path d={`M 20 64 H ${W - 10}`} className="planet-axis" />
        {PLANETS.map((x, i) => {
          const px = 24 + (x.au / 30.1) * (W - 50);
          const up = i % 2 === 0;
          return (
            <g key={x.name} className={`planet-dot${i === pi ? ' on' : ''}`} onClick={() => setPi(i)}>
              <circle cx={px} cy={64} r={i === pi ? 7 : 5} />
              {x.au > 1.6 || i === pi ? (
                <text x={px} y={up ? 44 : 92} textAnchor="middle">
                  {x.name}
                </text>
              ) : null}
            </g>
          );
        })}
        <text x={24} y={118} className="planet-note">
          ↑ Mercury, Venus, Earth and Mars are all squashed in here!
        </text>
      </svg>
    );
  } else {
    const scale = 78 / 143;
    let x = 14;
    const placed = PLANETS.map((pl) => {
      const r = Math.max(2.5, (pl.diameter / 2) * scale);
      const cx = x + r;
      x += 2 * r + 16;
      return { pl, r, cx };
    });
    const total = Math.max(x, 580);
    let small = 0;
    body = (
      <svg viewBox={`0 0 ${total} 170`} className="planet-svg" role="img" aria-label="Planet sizes to scale">
        {placed.map(({ pl, r, cx }, i) => {
          const big = r > 20;
          const ly = big ? 84 + r + 18 : 112 + (small++ % 2) * 16;
          return (
            <g key={pl.name} className={`planet-ball${i === pi ? ' on' : ''}`} onClick={() => setPi(i)}>
              <circle cx={cx} cy={84} r={r} />
              <text x={cx} y={ly} textAnchor="middle">
                {pl.name}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }
  return (
    <div className="planets">
      <div className="widget-controls first">
        <Segmented label="Show" value={mode} onChange={setMode} options={[{ value: 'distance', label: 'Distances to scale' }, { value: 'size', label: 'Sizes to scale' }]} />
      </div>
      {body}
      <ul className="chip-list" aria-label="Planet">
        {PLANETS.map((x, i) => (
          <li key={x.name}>
            <button type="button" className={`chip${pi === i ? ' on' : ''}`} aria-pressed={pi === i} onClick={() => setPi(i)}>
              {x.name}
            </button>
          </li>
        ))}
      </ul>
      <dl className="planet-facts" aria-live="polite">
        <div>
          <dt>Distance from the Sun</dt>
          <dd className="num">{spaced(p.au * 150)} million km</dd>
        </div>
        <div>
          <dt>Sunlight takes</dt>
          <dd className="num">{p.au * 8.3 < 60 ? `${comma(p.au * 8.3)} minutes` : `${comma((p.au * 8.3) / 60)} hours`}</dd>
        </div>
        <div>
          <dt>Width</dt>
          <dd className="num">{spaced(p.diameter * 1000)} km ({p.diameter > 12.7 ? `${comma(p.diameter / 12.7)} × Earth` : p.name === 'Earth' ? 'Earth' : `${comma(p.diameter / 12.7, 2)} × Earth`})</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{p.inner ? 'Inner, rocky' : 'Outer, giant'}</dd>
        </div>
      </dl>
      <Note ok={null}>
        <p>
          <strong>{p.name}</strong> is {p.fact}.
        </p>
      </Note>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Paper bridge tester: load coins until it fails, repeat, average.
type Design = 'flat' | 'edges' | 'zigzag' | 'triangle';
const DESIGNS: Record<Design, { label: string; cap: number; why: string }> = {
  flat: { label: 'Flat sheet', cap: 4, why: 'A flat sheet is thin, so it bends easily.' },
  edges: { label: 'Folded edges', cap: 15, why: 'Folding up the edges gives the beam depth along both sides.' },
  zigzag: { label: 'Zigzag folds', cap: 26, why: 'Each fold adds depth, like corrugated iron.' },
  triangle: { label: 'Triangle tube', cap: 34, why: 'A triangle can\'t change shape, so the tube resists bending best.' },
};

export function BridgeLab() {
  const [design, setDesign] = useState<Design>('flat');
  const [coins, setCoins] = useState(0);
  const [limit, setLimit] = useState(() => DESIGNS.flat.cap);
  const [trials, setTrials] = useState<Record<Design, number[]>>({ flat: [], edges: [], zigzag: [], triangle: [] });
  const d = DESIGNS[design];
  const broken = coins > limit;
  const sag = broken ? 60 : (coins / Math.max(1, limit)) * 22;
  const list = trials[design];
  const avg = list.length ? list.reduce((a, b) => a + b, 0) / list.length : null;
  const newTrial = (des = design) => {
    setCoins(0);
    setLimit(Math.round(DESIGNS[des].cap * (0.85 + Math.random() * 0.3)));
  };
  const add = (n: number) => {
    const next = coins + n;
    setCoins(next);
    if (next > limit && coins <= limit) setTrials({ ...trials, [design]: [...list, limit].slice(-5) });
  };
  const W = 360;
  const midY = 100 + sag;
  return (
    <div className="bridge">
      <div className="widget-controls first">
        <Segmented label="Design" value={design} onChange={(v) => (setDesign(v), newTrial(v))} options={(Object.keys(DESIGNS) as Design[]).map((k) => ({ value: k, label: DESIGNS[k].label }))} />
      </div>
      <svg viewBox={`0 0 ${W} 200`} className="bridge-svg" role="img" aria-label={`${d.label} bridge with ${coins} coins${broken ? ': collapsed' : ''}`}>
        {[20, W - 100].map((bx, side) => (
          <g key={bx}>
            {[0, 1, 2, 3].map((k) => (
              <rect key={k} x={bx + (k % 2 ? 4 : 0)} y={100 + k * 20} width={76} height={20} rx={2} className={`bridge-book b${(k + side) % 3}`} />
            ))}
          </g>
        ))}
        {broken ? (
          <path d={`M 60 100 L ${W / 2 - 4} 175 M ${W / 2 + 4} 175 L ${W - 60} 100`} className={`bridge-beam ${design}`} />
        ) : (
          <path d={`M 60 100 Q ${W / 2} ${midY + sag} ${W - 60} 100`} className={`bridge-beam ${design}`} />
        )}
        {Array.from({ length: Math.min(coins, 40) }, (_, i) => (
          <ellipse key={i} cx={W / 2 + ((i % 3) - 1) * 18} cy={(broken ? 172 : midY) - 6 - Math.floor(i / 3) * 4} rx={9} ry={3} className="bridge-coin" />
        ))}
        <text x={W / 2} y={24} textAnchor="middle" className="bridge-text">
          {broken ? `Held ${limit} coins, then collapsed` : `${coins} coin${coins === 1 ? '' : 's'}`}
        </text>
      </svg>
      <div className="widget-controls">
        <div className="widget-buttons">
          <Button size="sm" onClick={() => add(1)} disabled={broken}>
            Add 1 coin
          </Button>
          <Button size="sm" variant="secondary" onClick={() => add(5)} disabled={broken}>
            Add 5
          </Button>
          <Button size="sm" variant="quiet" onClick={() => newTrial()}>
            New trial
          </Button>
        </div>
      </div>
      {list.length ? (
        <p className="bridge-trials">
          {d.label} trials: <span className="num">{list.join(', ')}</span> coins.{' '}
          {list.length > 1 && avg !== null ? (
            <>
              Average: <strong className="num">{comma(avg)}</strong> coins.
            </>
          ) : (
            'Do another trial: one result could be a fluke.'
          )}
        </p>
      ) : null}
      <Note ok={null}>
        <p>
          {d.why} Scientists repeat a test and work out the <strong>average</strong>, because no two paper bridges are exactly the same.
        </p>
      </Note>
    </div>
  );
}
