/** Natural Sciences labs: Planet Earth and Beyond (Grades 5–9), the Periodic Table (Grade 7) and visible light (Grade 8). */
import { useState } from 'react';
import { Button, Segmented } from '../../ui/primitives.tsx';
import { Slider } from './MathWidgets.tsx';
import { Note } from './NstLabs.tsx';
import { ELEMENTS } from '../../../shared/questions/generators/ns-senior.ts';

const comma = (v: number, dp = 1) => v.toFixed(dp).replace('.', ',');
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

// ---------------------------------------------------------------------------
// Fossil layers: sediment settles layer by layer; deeper fossils are older.
const STRATA = [
  { rock: 'Shale', fossil: 'shells of sea creatures', mya: 300, tone: 'a' },
  { rock: 'Sandstone', fossil: 'fern leaves', mya: 270, tone: 'b' },
  { rock: 'Mudstone', fossil: 'a fish', mya: 255, tone: 'c' },
  { rock: 'Sandstone', fossil: 'a reptile skull', mya: 240, tone: 'b' },
  { rock: 'Siltstone', fossil: 'dinosaur footprints', mya: 200, tone: 'a' },
] as const;

export function FossilLayers() {
  const [laid, setLaid] = useState(2);
  const [pick, setPick] = useState<number | null>(null);
  const H = 34;
  const top = 200 - laid * H;
  return (
    <div className="es-fossil">
      <p className="widget-readout" aria-live="polite">
        <span>
          <strong className="num">{laid}</strong> of {STRATA.length} layers laid down
        </span>
        <span className="muted">{laid ? `Newest layer: ${STRATA[laid - 1]!.rock.toLowerCase()} with ${STRATA[laid - 1]!.fossil}` : 'Nothing has settled yet'}</span>
      </p>
      <svg viewBox="0 0 320 220" className="es-svg" role="img" aria-label={`A cliff with ${laid} layers of rock. The bottom layer is the oldest.`}>
        <rect x={20} y={200} width={280} height={14} className="es-bedrock" />
        {STRATA.slice(0, laid).map((s, i) => {
          const y = 200 - (i + 1) * H;
          return (
            <g key={i}>
              <rect x={20} y={y} width={280} height={H} className={`es-layer es-layer-${s.tone}${pick === i ? ' on' : ''}`} />
              <text x={30} y={y + 21} className="es-small es-on-light">
                {s.rock}
              </text>
              <text x={290} y={y + 21} textAnchor="end" className="es-small es-on-light">
                {s.fossil}
              </text>
            </g>
          );
        })}
        {laid < STRATA.length ? (
          <text x={160} y={Math.max(16, top - 10)} textAnchor="middle" className="es-small muted-fill">
            water and mud above
          </text>
        ) : null}
      </svg>
      <div className="widget-controls">
        <Slider label="Time passing (layers)" value={laid} min={0} max={STRATA.length} onChange={(v) => (setLaid(v), setPick(null))} />
      </div>
      {laid ? (
        <div className="es-chips" role="group" aria-label="Tap a fossil">
          {STRATA.slice(0, laid).map((s, i) => (
            <button key={i} type="button" className={`chip${pick === i ? ' on' : ''}`} aria-pressed={pick === i} onClick={() => setPick(i)}>
              {s.fossil}
            </button>
          ))}
        </div>
      ) : null}
      {pick !== null ? (
        <Note ok={null}>
          <p>
            <strong>{STRATA[pick]!.fossil}</strong>: layer {pick + 1} from the bottom, about {STRATA[pick]!.mya} million years old.{' '}
            {pick === 0 ? 'It is the deepest layer, so it is the oldest.' : pick === laid - 1 ? 'It is the top layer, so it is the youngest so far.' : `Layers below it are older; layers above it are younger.`}
          </p>
        </Note>
      ) : (
        <Note ok={null}>
          <p>Each layer settles on top of the last one, so in rock that has not been disturbed, the deeper the layer, the older it is.</p>
        </Note>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The first 20 elements, in the shape of the Periodic Table (groups 1, 2 and 13–18).
const FIRST20 = ELEMENTS.filter((e) => e.z <= 20);
const PLACE: Record<number, [number, number]> = { 1: [1, 1], 2: [1, 8], 3: [2, 1], 4: [2, 2], 5: [2, 3], 6: [2, 4], 7: [2, 5], 8: [2, 6], 9: [2, 7], 10: [2, 8], 11: [3, 1], 12: [3, 2], 13: [3, 3], 14: [3, 4], 15: [3, 5], 16: [3, 6], 17: [3, 7], 18: [3, 8], 19: [4, 1], 20: [4, 2] };
const KIND_WORD = { metal: 'metal', nonmetal: 'non-metal', semimetal: 'semi-metal' } as const;

export function ElementTable() {
  const [z, setZ] = useState(11);
  const [mode, setMode] = useState<'plain' | 'kind'>('plain');
  const e = FIRST20.find((x) => x.z === z)!;
  return (
    <div className="es-pt">
      <p className="widget-readout" aria-live="polite">
        <span>
          <strong>
            {e.sym}: {e.name}
          </strong>{' '}
          atomic number <strong className="num">{e.z}</strong>
        </span>
        <span className="muted">
          {KIND_WORD[e.kind]}, {e.state} at room temperature. Period {PLACE[e.z]![0]}, {groupName(e.z)}.
        </span>
      </p>
      <div className={`es-pt-grid${mode === 'kind' ? ' by-kind' : ''}`} role="group" aria-label="The first 20 elements">
        {FIRST20.map((x) => {
          const [r, col] = PLACE[x.z]!;
          return (
            <button key={x.z} type="button" style={{ gridRow: r, gridColumn: col }} className={`es-pt-cell k-${x.kind}${x.z === z ? ' on' : ''}`} aria-pressed={x.z === z} aria-label={`${x.name}, ${x.sym}, atomic number ${x.z}`} onClick={() => setZ(x.z)}>
              <span className="es-pt-z">{x.z}</span>
              <span className="es-pt-sym">{x.sym}</span>
            </button>
          );
        })}
      </div>
      <p className="es-caption">Groups 1, 2 and 13 to 18. The transition metals (such as iron and copper) slot in between groups 2 and 13 from period 4.</p>
      <div className="widget-controls">
        <Segmented label="Colour" value={mode} onChange={setMode} options={[{ value: 'plain', label: 'Plain' }, { value: 'kind', label: 'By type' }]} />
      </div>
      {mode === 'kind' ? (
        <ul className="es-legend" aria-label="Key">
          <li className="k-metal">Metal</li>
          <li className="k-semimetal">Semi-metal</li>
          <li className="k-nonmetal">Non-metal</li>
        </ul>
      ) : null}
    </div>
  );
}
function groupName(z: number): string {
  const col = PLACE[z]![1];
  const g = col <= 2 ? col : col + 10;
  return `group ${g}`;
}

// ---------------------------------------------------------------------------
// Seasons: the noon Sun, day length and energy per square metre in Johannesburg through the year.
const LAT = -26.2;
const MONTH_STARTS = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SEASON_SA = ['summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter', 'winter', 'winter', 'spring', 'spring', 'spring', 'summer'];

export function sunFor(day: number, lat = LAT) {
  const dec = 23.44 * Math.sin(rad((360 / 365) * (284 + day)));
  const noon = 90 - Math.abs(lat - dec);
  const x = -Math.tan(rad(lat)) * Math.tan(rad(dec));
  const hours = (2 * deg(Math.acos(Math.max(-1, Math.min(1, x))))) / 15;
  return { dec, noon, hours, energy: Math.sin(rad(noon)) };
}

export function SeasonsLab() {
  const [day, setDay] = useState(355);
  const m = MONTH_STARTS.filter((s) => s <= day).length - 1;
  const date = `${day - MONTH_STARTS[m]! + 1} ${MONTH_NAMES[m]}`;
  const { dec, noon, hours, energy } = sunFor(day);
  const hh = Math.floor(hours);
  const mm = Math.round((hours - hh) * 60);
  // Orbit view: the axis always points the same way in space; the south pole leans right.
  const th = (2 * Math.PI * (day - 355)) / 365;
  const ex = 110 - 78 * Math.cos(th);
  const ey = 90 + 50 * Math.sin(th);
  const t = rad(23.44);
  const leans = dec < -2 ? 'towards' : dec > 2 ? 'away from' : 'neither towards nor away from';
  // Side view: the beam and its footprint.
  const sx = 230 - 150 * Math.cos(rad(noon));
  const sy = 170 - 150 * Math.sin(rad(noon));
  const foot = 40 / Math.sin(rad(noon));
  return (
    <div className="es-seasons">
      <p className="widget-readout" aria-live="polite">
        <span>
          <strong>{date}</strong>: {SEASON_SA[m]} in South Africa
        </span>
        <span className="muted">The Southern Hemisphere leans {leans} the Sun.</span>
      </p>
      <div className="es-two">
        <svg viewBox="0 0 220 180" className="es-svg" role="img" aria-label={`The Earth's orbit. The Southern Hemisphere leans ${leans} the Sun.`}>
          <ellipse cx={110} cy={90} rx={78} ry={50} className="es-orbit" />
          <circle cx={110} cy={90} r={14} className="es-sun" />
          <circle cx={ex} cy={ey} r={11} className="es-earth" />
          <line x1={ex - 17 * Math.sin(t)} y1={ey - 17 * Math.cos(t)} x2={ex + 17 * Math.sin(t)} y2={ey + 17 * Math.cos(t)} className="es-axis" />
          <text x={ex + 17 * Math.sin(t) + 3} y={ey + 17 * Math.cos(t) + 8} className="es-small">
            S
          </text>
          <text x={8} y={16} className="es-small">
            From above (not to scale)
          </text>
        </svg>
        <svg viewBox="0 0 260 190" className="es-svg" role="img" aria-label={`Noon in Johannesburg: the Sun is ${Math.round(noon)} degrees above the horizon.`}>
          <text x={8} y={16} className="es-small">
            Noon in Johannesburg
          </text>
          <line x1={10} y1={170} x2={250} y2={170} className="es-ground" />
          <path d={`M 230 170 L ${sx} ${sy}`} className="es-ray" />
          <path d={`M ${230 - foot} 170 L ${sx - foot} ${sy}`} className="es-ray" />
          <circle cx={sx - foot / 2} cy={sy} r={10} className="es-sun" />
          <line x1={230 - foot} y1={174} x2={230} y2={174} className="es-foot" />
          <path d={`M 200 170 A 30 30 0 0 1 ${230 - 30 * Math.cos(rad(noon))} ${170 - 30 * Math.sin(rad(noon))}`} className="es-arc" />
          <text x={178} y={160} className="es-small">
            {Math.round(noon)}°
          </text>
        </svg>
      </div>
      <dl className="es-stats">
        <div>
          <dt>Noon Sun height</dt>
          <dd className="num">{Math.round(noon)}°</dd>
        </div>
        <div>
          <dt>Daylight</dt>
          <dd className="num">
            {hh} h {String(mm).padStart(2, '0')} min
          </dd>
        </div>
        <div>
          <dt>Energy per m² at noon</dt>
          <dd className="num">{Math.round(energy * 100)}%</dd>
        </div>
      </dl>
      <div className="widget-controls">
        <Slider label="Day of the year" value={day} min={1} max={365} onChange={setDay} format={() => date} />
      </div>
      <Note ok={null}>
        <p>
          100% would be the Sun straight overhead. A lower Sun spreads the same beam over more ground (the line under the beam), so each square metre gets less energy, and the days are shorter too.
        </p>
      </Note>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tides: spring tides when the Sun and Moon line up, neap tides at right angles.
const MONTH = 29.5;
function phaseName(d: number): string {
  const names = ['new moon', 'waxing crescent', 'first quarter', 'waxing gibbous', 'full moon', 'waning gibbous', 'last quarter', 'waning crescent'];
  return names[Math.round((d / MONTH) * 8) % 8]!;
}

export function TideLab() {
  const [day, setDay] = useState(0);
  const a = (2 * Math.PI * day) / MONTH;
  const r = 0.75 + 0.25 * Math.cos(2 * a);
  const range = 2 * r;
  const kind = r > 0.93 ? 'Spring tides' : r < 0.57 ? 'Neap tides' : 'Between spring and neap';
  // Top view: Sun on the left, so the Moon starts between the Earth and the Sun.
  const mx = 120 - 78 * Math.cos(a);
  const my = 95 - 78 * Math.sin(a);
  const ang = deg(Math.atan2(my - 95, mx - 120));
  const high = 60 - 22 * r;
  const low = 60 + 22 * r;
  return (
    <div className="es-tides">
      <p className="widget-readout" aria-live="polite">
        <span>
          Day <strong className="num">{comma(day)}</strong>: {phaseName(day)}
        </span>
        <span className="muted">
          {kind}: about {comma(range)} m between high and low water
        </span>
      </p>
      <div className="es-two">
        <svg viewBox="0 0 240 190" className="es-svg" role="img" aria-label={`From above: ${phaseName(day)}. The ocean bulges towards and away from the Moon.`}>
          {[50, 95, 140].map((y) => (
            <path key={y} d={`M 4 ${y} H 26`} className="es-sunray" />
          ))}
          <text x={6} y={186} className="es-small">
            Sunlight from the left
          </text>
          <circle cx={120} cy={95} r={78} className="es-orbit" />
          <ellipse cx={120} cy={95} rx={22 + 10 * r} ry={22} transform={`rotate(${ang} 120 95)`} className="es-water" />
          <circle cx={120} cy={95} r={18} className="es-earth" />
          <circle cx={mx} cy={my} r={8} className="es-moon" />
        </svg>
        <svg viewBox="0 0 220 120" className="es-svg" role="img" aria-label={`The beach: about ${comma(range)} metres between high and low water.`}>
          <path d="M 0 110 L 220 30 L 220 120 L 0 120 Z" className="es-sand" />
          <line x1={0} y1={high} x2={220} y2={high} className="es-hw" />
          <line x1={0} y1={low} x2={220} y2={low} className="es-lw" />
          <text x={6} y={high - 4} className="es-small">
            high water
          </text>
          <text x={6} y={low + 12} className="es-small">
            low water
          </text>
        </svg>
      </div>
      <div className="widget-controls">
        <Slider label="Days since new moon" value={day} min={0} max={29.5} step={0.5} onChange={setDay} format={(v) => comma(v)} />
      </div>
      <Note ok={null}>
        <p>
          The Moon's gravity pulls the ocean into two bulges, one towards the Moon and one on the far side. When the Sun and Moon are in line (new and full moon) their pulls add up: <strong>spring tides</strong>. At the half moons they pull at right angles: <strong>neap tides</strong>.
        </p>
      </Note>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reflection and refraction: angles measured from the normal.
export function ReflectionLab() {
  const [mode, setMode] = useState<'mirror' | 'water'>('mirror');
  const [i, setI] = useState(40);
  const r = mode === 'mirror' ? i : deg(Math.asin(Math.sin(rad(i)) / 1.33));
  const cx = 150;
  const cy = 120;
  const L = 100;
  const ix = cx - L * Math.sin(rad(i));
  const iy = cy - L * Math.cos(rad(i));
  const ox = cx + L * Math.sin(rad(r));
  const oy = mode === 'mirror' ? cy - L * Math.cos(rad(r)) : cy + L * Math.cos(rad(r));
  return (
    <div className="es-light">
      <p className="widget-readout" aria-live="polite">
        <span>
          Angle of incidence <strong className="num">{i}°</strong>
        </span>
        <span>
          {mode === 'mirror' ? 'Angle of reflection' : 'Angle of refraction'} <strong className="num">{Math.round(r)}°</strong>
        </span>
      </p>
      <svg viewBox="0 0 300 230" className="es-svg" role="img" aria-label={mode === 'mirror' ? `A ray reflects off a mirror at ${i} degrees from the normal.` : `A ray enters water at ${i} degrees and bends to ${Math.round(r)} degrees.`}>
        {mode === 'water' ? <rect x={0} y={cy} width={300} height={110} className="es-pool" /> : <rect x={30} y={cy} width={240} height={8} className="es-mirror" />}
        <line x1={cx} y1={10} x2={cx} y2={mode === 'water' ? 225 : cy} className="es-normal" />
        <text x={cx + 4} y={20} className="es-small">
          normal
        </text>
        <line x1={ix} y1={iy} x2={cx} y2={cy} className="es-beam" markerEnd="url(#es-arrow)" />
        <line x1={cx} y1={cy} x2={ox} y2={oy} className="es-beam" markerEnd="url(#es-arrow)" />
        {mode === 'water' ? <line x1={cx} y1={cy} x2={cx + L * 0.6 * Math.sin(rad(i))} y2={cy - L * 0.6 * Math.cos(rad(i))} className="es-beam faint" /> : null}
        <defs>
          <marker id="es-arrow" viewBox="0 0 8 8" refX={7} refY={4} markerWidth={6} markerHeight={6} orient="auto">
            <path d="M 0 0 L 8 4 L 0 8 Z" className="es-beam-head" />
          </marker>
        </defs>
        <text x={cx - 34} y={cy - 46} className="es-small">
          i
        </text>
        <text x={cx + 28} y={mode === 'mirror' ? cy - 46 : cy + 56} className="es-small">
          {mode === 'mirror' ? 'r' : 'refracted'}
        </text>
        <text x={34} y={mode === 'water' ? cy - 6 : cy + 24} className="es-small">
          {mode === 'water' ? 'air' : 'mirror'}
        </text>
        {mode === 'water' ? (
          <text x={34} y={cy + 18} className="es-small">
            water
          </text>
        ) : null}
      </svg>
      <div className="widget-controls">
        <Slider label="Angle of incidence" value={i} min={0} max={80} onChange={setI} format={(v) => `${v}°`} />
        <Segmented label="Surface" value={mode} onChange={setMode} options={[{ value: 'mirror', label: 'Mirror' }, { value: 'water', label: 'Water' }]} />
      </div>
      <Note ok={null}>
        <p>
          {mode === 'mirror'
            ? 'Both angles are measured from the normal, and they are always equal: the law of reflection.'
            : 'Light slows down in water, so it bends towards the normal. A little light is also reflected (the faint ray).'}
        </p>
      </Note>
    </div>
  );
}

// ---------------------------------------------------------------------------
// How old is the light? Distances from the Moon to Andromeda, on a log scale.
const SKY = [
  { name: 'Moon', secs: 1.3, dist: 'about 384 000 km', when: 'just over a second ago' },
  { name: 'Sun', secs: 500, dist: 'about 150 million km', when: 'about 8 minutes ago' },
  { name: 'Jupiter', secs: 2600, dist: 'about 5 times as far as the Sun', when: 'about 43 minutes ago (on average)' },
  { name: 'Neptune', secs: 15000, dist: 'about 30 times as far as the Sun', when: 'about 4 hours ago' },
  { name: 'Proxima Centauri', secs: 4.2 * 3.156e7, dist: '4,2 light-years', when: 'about 4 years ago, when you were a few years younger' },
  { name: 'Sirius', secs: 8.6 * 3.156e7, dist: '8,6 light-years', when: 'about 9 years ago' },
  { name: 'Centre of the Milky Way', secs: 26000 * 3.156e7, dist: 'about 26 000 light-years', when: 'about 26 000 years ago, during the last ice age' },
  { name: 'Large Magellanic Cloud', secs: 160000 * 3.156e7, dist: 'about 160 000 light-years', when: 'about 160 000 years ago, when early modern humans already lived in southern Africa' },
  { name: 'Andromeda Galaxy', secs: 2.5e6 * 3.156e7, dist: 'about 2,5 million light-years', when: 'about 2,5 million years ago, before modern humans existed' },
];

export function LightTravel() {
  const [k, setK] = useState(1);
  const o = SKY[k]!;
  const lo = Math.log10(1);
  const hi = Math.log10(SKY[SKY.length - 1]!.secs);
  const x = (s: number) => 16 + ((Math.log10(s) - lo) / (hi - lo)) * 288;
  return (
    <div className="es-travel">
      <p className="widget-readout" aria-live="polite">
        <span>
          <strong>{o.name}</strong>: {o.dist}
        </span>
        <span className="muted">The light you see left it {o.when}.</span>
      </p>
      <svg viewBox="0 0 320 90" className="es-svg" role="img" aria-label={`Light from ${o.name} left it ${o.when}.`}>
        <line x1={16} y1={50} x2={304} y2={50} className="es-axisline" />
        {[1, 60, 3600, 86400, 3.156e7, 3.156e10, 3.156e13].map((s, i) => (
          <g key={s}>
            <line x1={x(s)} y1={46} x2={x(s)} y2={54} className="es-axisline" />
            <text x={x(s)} y={70} textAnchor="middle" className="es-tiny">
              {['1 s', '1 min', '1 h', '1 day', '1 yr', '1 000 yr', '1 million yr'][i]}
            </text>
          </g>
        ))}
        {SKY.map((s, i) => (
          <circle key={s.name} cx={x(s.secs)} cy={50} r={i === k ? 7 : 4} className={`es-dot${i === k ? ' on' : ''}`} />
        ))}
        <text x={16} y={86} className="es-tiny">
          Light travel time (each step is far bigger than the last)
        </text>
      </svg>
      <div className="es-chips" role="group" aria-label="Choose an object">
        {SKY.map((s, i) => (
          <button key={s.name} type="button" className={`chip${i === k ? ' on' : ''}`} aria-pressed={i === k} onClick={() => setK(i)}>
            {s.name}
          </button>
        ))}
      </div>
      <Note ok={null}>
        <p>Light takes time to travel, so looking further away means looking further back in time. A light-year is the distance light travels in a year: about 9,5 trillion km.</p>
      </Note>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The rock cycle: choose a process and follow your rock.
type RockState = 'magma' | 'igneous' | 'sediment' | 'sedimentary' | 'metamorphic';
const NODES: Record<RockState, { label: string; x: number; y: number }> = {
  magma: { label: 'Magma', x: 170, y: 24 },
  igneous: { label: 'Igneous rock', x: 280, y: 96 },
  sediment: { label: 'Sediment', x: 238, y: 192 },
  sedimentary: { label: 'Sedimentary rock', x: 102, y: 192 },
  metamorphic: { label: 'Metamorphic rock', x: 60, y: 96 },
};
type Step = { to: RockState; label: string; rock: string; why: string };
function stepsFrom(s: RockState, rock: string): Step[] {
  const weather: Step = { to: 'sediment', label: 'Weathering and erosion', rock: 'sand and mud', why: 'Wind, water and ice break the rock into grains and carry them away.' };
  const melt: Step = { to: 'magma', label: 'Melt deep underground', rock: 'magma', why: 'Deep underground it gets hot enough to melt rock.' };
  const meta: Step = { to: 'metamorphic', label: 'Heat and pressure (no melting)', rock: rock === 'limestone' ? 'marble' : rock === 'sandstone' ? 'quartzite' : rock === 'shale' ? 'slate' : 'gneiss', why: 'Buried deep, the rock is squeezed and heated. It changes without melting.' };
  switch (s) {
    case 'magma':
      return [
        { to: 'igneous', label: 'Cool slowly underground', rock: 'granite', why: 'Slow cooling gives the crystals time to grow large.' },
        { to: 'igneous', label: 'Erupt and cool quickly', rock: 'basalt', why: 'Lava cools fast at the surface, so the crystals are tiny.' },
      ];
    case 'sediment':
      return [
        { to: 'sedimentary', label: 'Bury, compact and cement (sand)', rock: 'sandstone', why: 'Layers of sand are pressed and cemented together.' },
        { to: 'sedimentary', label: 'Bury, compact and cement (mud)', rock: 'shale', why: 'Layers of mud are pressed into thin sheets of rock.' },
        { to: 'sedimentary', label: 'Shells pile up on the sea floor', rock: 'limestone', why: 'Shells and skeletons of sea creatures build up and are cemented.' },
      ];
    case 'metamorphic':
      return [weather, melt, { ...meta, rock: 'gneiss', why: 'More heat and pressure change it further, into banded gneiss.' }];
    default:
      return [weather, meta, melt];
  }
}

export function RockCycleLab() {
  const [state, setState] = useState<RockState>('magma');
  const [rock, setRock] = useState('magma');
  const [path, setPath] = useState<string[]>(['magma']);
  const [last, setLast] = useState<Step | null>(null);
  const go = (s: Step) => (setState(s.to), setRock(s.rock), setPath((p) => [...p, s.rock].slice(-8)), setLast(s));
  const reset = () => (setState('magma'), setRock('magma'), setPath(['magma']), setLast(null));
  const order: RockState[] = ['magma', 'igneous', 'sediment', 'sedimentary', 'metamorphic'];
  return (
    <div className="es-rock">
      <p className="widget-readout" aria-live="polite">
        <span>
          Now: <strong>{rock}</strong>
          {rock !== NODES[state].label.toLowerCase() ? ` (${NODES[state].label.toLowerCase()})` : ''}
        </span>
        {path.length > 1 ? <span className="muted">{path.join(' → ')}</span> : null}
      </p>
      <svg viewBox="0 0 340 216" className="es-svg es-rock-svg" role="img" aria-label={`Rock cycle. Your rock is now ${rock}.`}>
        {order.map((k, i) => {
          const a = NODES[k];
          const b = NODES[order[(i + 1) % order.length]!];
          return <line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="es-cycle-line" />;
        })}
        {order.map((k) => (
          <g key={k} className={`es-node${k === state ? ' on' : ''}`}>
            <rect x={NODES[k].x - 56} y={NODES[k].y - 13} width={112} height={26} rx={6} />
            <text x={NODES[k].x} y={NODES[k].y + 4} textAnchor="middle">
              {NODES[k].label}
            </text>
          </g>
        ))}
      </svg>
      <div className="widget-buttons wrap" role="group" aria-label="Choose a process">
        {stepsFrom(state, rock).map((s) => (
          <Button key={s.label} size="sm" variant="secondary" onClick={() => go(s)}>
            {s.label}
          </Button>
        ))}
        <Button size="sm" variant="quiet" onClick={reset}>
          Start again
        </Button>
      </div>
      {last ? (
        <Note ok={null}>
          <p>
            <strong>{last.label}</strong> → {last.rock}. {last.why}
          </p>
        </Note>
      ) : (
        <Note ok={null}>
          <p>Every rock can become any other kind of rock, given enough time. Choose a process to start.</p>
        </Note>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The atmosphere: temperature with height (a standard atmosphere).
const PROFILE: [number, number][] = [[0, 15], [12, -56], [20, -56], [32, -44], [47, -2], [51, -2], [71, -58], [85, -90], [100, -78], [110, -33], [120, 87]];
export function tempAt(h: number): number {
  for (let i = 1; i < PROFILE.length; i++) {
    const [h0, t0] = PROFILE[i - 1]!;
    const [h1, t1] = PROFILE[i]!;
    if (h <= h1) return t0 + ((t1 - t0) * (h - h0)) / (h1 - h0);
  }
  return PROFILE[PROFILE.length - 1]![1];
}
const LAYERS = [
  { name: 'Troposphere', from: 0, to: 12, cls: 'tropo', trend: 'gets colder as you go up' },
  { name: 'Stratosphere', from: 12, to: 50, cls: 'strato', trend: 'gets warmer as you go up, because ozone absorbs ultraviolet light' },
  { name: 'Mesosphere', from: 50, to: 85, cls: 'meso', trend: 'gets colder as you go up: the coldest layer' },
  { name: 'Thermosphere', from: 85, to: 120, cls: 'thermo', trend: 'gets much hotter as you go up' },
];
function featureAt(h: number): string {
  if (h <= 1) return 'People, plants and almost all weather start here.';
  if (h <= 8) return 'Clouds and rain. The top of Mount Everest is at 8,8 km.';
  if (h <= 12) return 'Passenger jets cruise around 10 to 12 km.';
  if (h <= 19) return 'Above most weather: the air is dry and very thin.';
  if (h <= 35) return 'The ozone layer is thickest around 20 to 30 km. Weather balloons burst at about 30 to 35 km.';
  if (h <= 50) return 'Thin air warmed by ozone absorbing ultraviolet light.';
  if (h <= 85) return 'Most meteors burn up here as "shooting stars".';
  return 'Auroras glow here. The International Space Station orbits far above, at about 400 km.';
}

export function AtmosphereClimb() {
  const [h, setH] = useState(5);
  const t = tempAt(h);
  const layer = LAYERS.find((l) => h <= l.to) ?? LAYERS[3]!;
  const X = (temp: number) => 40 + ((temp + 100) / 200) * 250;
  const Y = (alt: number) => 200 - (alt / 120) * 186;
  const d = PROFILE.map(([a, tt], i) => `${i ? 'L' : 'M'} ${X(tt)} ${Y(a)}`).join(' ');
  return (
    <div className="es-atmo">
      <p className="widget-readout" aria-live="polite">
        <span>
          <strong className="num">{h} km</strong>: {layer.name}, about <strong className="num">{Math.round(t)} °C</strong>
        </span>
        <span className="muted">{featureAt(h)}</span>
      </p>
      <svg viewBox="0 0 300 220" className="es-svg" role="img" aria-label={`At ${h} kilometres: ${layer.name}, about ${Math.round(t)} degrees Celsius.`}>
        {LAYERS.map((l) => (
          <g key={l.cls}>
            <rect x={40} y={Y(l.to)} width={250} height={Y(l.from) - Y(l.to)} className={`es-band es-${l.cls}`} />
            <text x={286} y={(Y(l.from) + Y(Math.min(l.to, 110))) / 2 + 4} textAnchor="end" className="es-small">
              {l.name}
            </text>
          </g>
        ))}
        <line x1={X(0)} y1={Y(0)} x2={X(0)} y2={Y(120)} className="es-zero" />
        <path d={d} className="es-profile" />
        <circle cx={X(t)} cy={Y(h)} r={6} className="es-marker" />
        <line x1={40} y1={Y(h)} x2={290} y2={Y(h)} className="es-level" />
        {[0, 20, 40, 60, 80, 100, 120].map((a) => (
          <text key={a} x={34} y={Y(a) + 4} textAnchor="end" className="es-tiny">
            {a}
          </text>
        ))}
        {[-100, -50, 0, 50].map((tt) => (
          <text key={tt} x={X(tt)} y={214} textAnchor="middle" className="es-tiny">
            {tt < 0 ? `−${-tt}` : tt}
          </text>
        ))}
        <text x={4} y={12} className="es-tiny">
          km
        </text>
        <text x={290} y={214} textAnchor="end" className="es-tiny">
          °C
        </text>
      </svg>
      <div className="widget-controls">
        <Slider label="Height above the ground" value={h} min={0} max={120} onChange={setH} format={(v) => `${v} km`} />
      </div>
      <Note ok={null}>
        <p>
          In the <strong>{layer.name.toLowerCase()}</strong> the air {layer.trend}. The layers are named by these changes in temperature.
        </p>
      </Note>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The life of a star: mass decides the path.
type Stage = { name: string; r: number; cls: string; text: string };
const STAR_PATHS: Record<'1' | '3' | '20', { life: string; stages: Stage[] }> = {
  '1': {
    life: 'about 10 billion years on the main sequence',
    stages: [
      { name: 'Nebula', r: 60, cls: 'nebula', text: 'Gravity pulls a cloud of gas and dust together. The centre gets hotter and denser.' },
      { name: 'Main-sequence star', r: 22, cls: 'yellow', text: 'Fusion of hydrogen into helium starts in the core. The star shines steadily for about 10 billion years. The Sun is here now, about 4,6 billion years in.' },
      { name: 'Red giant', r: 70, cls: 'red', text: 'The core runs out of hydrogen. The star swells to hundreds of times its size and cools to red.' },
      { name: 'Planetary nebula', r: 62, cls: 'shell', text: 'The outer layers drift away into space as a glowing shell of gas.' },
      { name: 'White dwarf', r: 7, cls: 'white', text: 'The hot core is left: about the size of the Earth. It slowly cools and fades.' },
    ],
  },
  '3': {
    life: 'a few hundred million years on the main sequence',
    stages: [
      { name: 'Nebula', r: 64, cls: 'nebula', text: 'Gravity pulls a bigger cloud of gas and dust together.' },
      { name: 'Main-sequence star', r: 28, cls: 'white', text: 'Hotter and brighter than the Sun, so it uses its hydrogen much faster: a few hundred million years.' },
      { name: 'Red giant', r: 76, cls: 'red', text: 'The core runs out of hydrogen and the star swells into a red giant.' },
      { name: 'Planetary nebula', r: 66, cls: 'shell', text: 'The outer layers drift away into space.' },
      { name: 'White dwarf', r: 7, cls: 'white', text: 'Below about 8 Sun masses, the star still ends as a white dwarf.' },
    ],
  },
  '20': {
    life: 'only about 10 million years on the main sequence',
    stages: [
      { name: 'Nebula', r: 70, cls: 'nebula', text: 'Gravity pulls a huge cloud of gas and dust together.' },
      { name: 'Main-sequence star', r: 36, cls: 'blue', text: 'Very hot and blue. It uses its fuel thousands of times faster than the Sun: only about 10 million years.' },
      { name: 'Red supergiant', r: 88, cls: 'red', text: 'It swells into one of the biggest stars there is, making heavier elements such as iron in its core.' },
      { name: 'Supernova', r: 84, cls: 'burst', text: 'The core collapses and the star explodes, briefly outshining a whole galaxy and scattering new elements into space.' },
      { name: 'Black hole (or neutron star)', r: 12, cls: 'hole', text: 'What is left of the core collapses further. The heaviest cores become black holes.' },
    ],
  },
};

export function StarLab() {
  const [mass, setMass] = useState<'1' | '3' | '20'>('1');
  const [i, setI] = useState(1);
  const p = STAR_PATHS[mass];
  const s = p.stages[i]!;
  return (
    <div className="es-star">
      <p className="widget-readout" aria-live="polite">
        <span>
          Stage {i + 1} of {p.stages.length}: <strong>{s.name}</strong>
        </span>
        <span className="muted">
          {mass === '1' ? 'A star like the Sun' : `${mass} times the Sun's mass`}: {p.life}
        </span>
      </p>
      <svg viewBox="0 0 300 200" className="es-svg es-space" role="img" aria-label={`${s.name}. ${s.text}`}>
        <rect x={0} y={0} width={300} height={200} className="es-sky" />
        <circle cx={150} cy={100} r={s.r} className={`es-st es-st-${s.cls}`} />
        {s.cls === 'hole' ? <circle cx={150} cy={100} r={s.r + 10} className="es-st-ring" /> : null}
      </svg>
      <div className="widget-controls">
        <Segmented label="Mass" value={mass} onChange={(m) => (setMass(m), setI(1))} options={[{ value: '1', label: '1 Sun' }, { value: '3', label: '3 Suns' }, { value: '20', label: '20 Suns' }]} />
        <div className="widget-buttons">
          <Button size="sm" variant="secondary" disabled={i === 0} onClick={() => setI(i - 1)}>
            Back
          </Button>
          <Button size="sm" disabled={i === p.stages.length - 1} onClick={() => setI(i + 1)}>
            Next stage
          </Button>
        </div>
      </div>
      <Note ok={null}>
        <p>{s.text}</p>
      </Note>
    </div>
  );
}
