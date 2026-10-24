/** Life Sciences labs, Grades 7–10: identification key, energy pyramid, pondweed, heart path, cell division. */
import { useEffect, useRef, useState } from 'react';
import { Button, Segmented } from '../../ui/primitives.tsx';
import { Slider } from './MathWidgets.tsx';
import { CHAINS, BLOOD_PATH, type VClass } from '../../../shared/questions/generators/science-life.ts';
import { ClassIcon } from '../../ui/Illustrations.tsx';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------------------
const KEY_ANIMALS: { name: string; cls: VClass; clues: string[] }[] = [
  { name: 'Bottlenose dolphin', cls: 'mammal', clues: ['Lives in the sea and swims with flippers', 'Breathes air through a blowhole on its head', 'Feeds its calf on milk', 'Is born with a few whisker hairs on its snout'] },
  { name: 'Egyptian fruit bat', cls: 'mammal', clues: ['Flies on wings made of skin', 'Has a furry body', 'Feeds its pup on milk'] },
  { name: 'Ground pangolin', cls: 'mammal', clues: ['Is covered in hard, overlapping scales', 'Has hair on its face and belly', 'Feeds its young on milk'] },
  { name: 'Rock hyrax (dassie)', cls: 'mammal', clues: ['Lives among rocks and basks in the sun', 'Has thick brown fur', 'Feeds its young on milk'] },
  { name: 'African penguin', cls: 'bird', clues: ['Cannot fly; swims with flippers', 'Is covered in short, dense feathers', 'Lays eggs with hard shells'] },
  { name: 'Common ostrich', cls: 'bird', clues: ['Cannot fly, but runs very fast', 'Has feathers and a beak', 'Lays the biggest eggs of any living bird'] },
  { name: 'Nile crocodile', cls: 'reptile', clues: ['Lives in rivers, but lays leathery eggs on land', 'Has dry, scaly skin', 'Breathes air with lungs'] },
  { name: 'Cape cobra', cls: 'reptile', clues: ['Has no legs', 'Has dry, scaly skin', 'Lays leathery eggs'] },
  { name: 'African bullfrog', cls: 'amphibian', clues: ['Has smooth, moist skin with no scales', 'Lays eggs in shallow water', 'Its tadpoles breathe with gills'] },
  { name: 'Whale shark', cls: 'fish', clues: ['Is the biggest fish in the sea', 'Breathes through gills its whole life', 'Has fins, and skin covered in tiny tooth-like scales'] },
];
const KEY: { q: string; yes: VClass | number; no: VClass | number; test: (c: VClass) => boolean }[] = [
  { q: 'Does it have feathers?', yes: 'bird', no: 1, test: (c) => c === 'bird' },
  { q: 'Does it have hair or fur, and feed its young on milk?', yes: 'mammal', no: 2, test: (c) => c === 'mammal' },
  { q: 'Does it breathe through gills its whole life?', yes: 'fish', no: 3, test: (c) => c === 'fish' },
  { q: 'Does it have dry, scaly skin?', yes: 'reptile', no: 'amphibian', test: (c) => c === 'reptile' },
];

export function KeyExplorer() {
  const [ai, setAi] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const a = KEY_ANIMALS[ai]!;
  let node: number | VClass = 0;
  for (const ans of answers) {
    const k: (typeof KEY)[number] = KEY[node as number]!;
    node = ans ? k.yes : k.no;
  }
  const done = typeof node === 'string';
  const firstWrong = answers.findIndex((ans, i) => {
    let nd = 0;
    for (let j = 0; j < i; j++) nd = (answers[j] ? KEY[nd]!.yes : KEY[nd]!.no) as number;
    return KEY[nd]!.test(a.cls) !== ans;
  });
  const choose = (i: number) => (setAi(i), setAnswers([]));
  return (
    <div className="keyx">
      <ul className="chip-list" aria-label="Animal">
        {KEY_ANIMALS.map((x, i) => (
          <li key={x.name}>
            <button type="button" className={`chip${ai === i ? ' on' : ''}`} aria-pressed={ai === i} onClick={() => choose(i)}>
              {x.name}
            </button>
          </li>
        ))}
      </ul>
      <div className="keyx-grid">
        <div className="keyx-card">
          <h4>{a.name}</h4>
          <ul>
            {a.clues.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
        <ol className="keyx-steps" aria-live="polite">
          {answers.map((ans, i) => {
            let nd = 0;
            for (let j = 0; j < i; j++) nd = (answers[j] ? KEY[nd]!.yes : KEY[nd]!.no) as number;
            return (
              <li key={i} className="keyx-done">
                <span>{KEY[nd]!.q}</span> <strong>{ans ? 'Yes' : 'No'}</strong>
              </li>
            );
          })}
          {!done ? (
            <li className="keyx-now">
              <span>{KEY[node as number]!.q}</span>
              <span className="widget-buttons">
                <Button size="sm" variant="secondary" onClick={() => setAnswers([...answers, true])}>
                  Yes
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setAnswers([...answers, false])}>
                  No
                </Button>
              </span>
            </li>
          ) : null}
        </ol>
      </div>
      {done ? (
        <div className={`keyx-result${node === a.cls ? ' ok' : ' off'}`} role="status">
          <ClassIcon cls={node as VClass} size={56} />
          <div>
            <p>
              The key says: <strong>{String(node)}</strong>.
            </p>
            {node === a.cls ? (
              <p>Correct. The {a.name.toLowerCase()} is a {a.cls}.</p>
            ) : (
              <p>
                Not quite. Look again at question {firstWrong + 1}: use the clues, not where the animal lives or how it moves.
              </p>
            )}
            <Button size="sm" variant="quiet" onClick={() => setAnswers([])}>
              Start again
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
const ENERGIES = [1000, 10000, 100000, 1000000];
const fmtE = (v: number) => (v >= 1 ? `${Math.round(v).toLocaleString('en-US').replace(/,/g, ' ')} kJ` : `${v.toPrecision(2)} kJ`);

export function EnergyPyramid() {
  const [ci, setCi] = useState(1);
  const [e0i, setE0i] = useState(2);
  const [eff, setEff] = useState(10);
  const c = CHAINS[ci]!;
  const E0 = ENERGIES[e0i]!;
  const levels = c.links.map((name, i) => ({ name, e: E0 * (eff / 100) ** i }));
  const W = 380;
  const rowH = 38;
  return (
    <div className="pyr">
      <ul className="chip-list" aria-label="Food chain">
        {CHAINS.map((x, i) => (
          <li key={x.place + i}>
            <button type="button" className={`chip${ci === i ? ' on' : ''}`} aria-pressed={ci === i} onClick={() => setCi(i)}>
              {x.place[0]!.toUpperCase() + x.place.slice(1)}
            </button>
          </li>
        ))}
      </ul>
      <p className="widget-readout" aria-live="polite">
        <span>
          The top level ({c.links.at(-1)}) gets <strong className="num">{fmtE(levels.at(-1)!.e)}</strong> of the {fmtE(E0)} captured by the {c.links[0]}.
        </span>
        <span className="muted">That is {((levels.at(-1)!.e / E0) * 100).toPrecision(2)}%.</span>
      </p>
      <svg viewBox={`0 0 ${W} ${levels.length * rowH + 10}`} className="pyr-svg" role="img" aria-label={levels.map((l) => `${l.name} ${fmtE(l.e)}`).join(', ')}>
        {levels
          .slice()
          .reverse()
          .map((l, ri) => {
            const i = levels.length - 1 - ri;
            const w = Math.max(3, (l.e / E0) * (W - 20));
            const label = `${l.name}: ${fmtE(l.e)}`;
            const inside = w > label.length * 7 + 16;
            return (
              <g key={l.name} transform={`translate(0 ${ri * rowH + 4})`}>
                <rect x={(W - w) / 2} y={0} width={w} height={rowH - 8} rx={w > 10 ? 3 : 0} className={`pyr-bar pyr-${Math.min(i, 4)}`} />
                <text x={inside ? W / 2 : (W + w) / 2 + 8} y={rowH / 2} textAnchor={inside ? 'middle' : 'start'} className="pyr-label">
                  {label}
                </text>
              </g>
            );
          })}
      </svg>
      <div className="widget-controls">
        <Slider label="Energy captured by producers" value={e0i} min={0} max={3} onChange={setE0i} format={(i) => fmtE(ENERGIES[i]!)} />
        <Slider label="Energy passed on (%)" value={eff} min={5} max={20} onChange={setEff} format={(v) => `${v}%`} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
/** Blackman-style limiting factors: the rate is the smallest of what light and CO₂ allow, scaled by temperature. */
export function photoRate(dist: number, co2: 'low' | 'high', temp: number) {
  const light = (10 / dist) ** 2; // relative intensity, 1 at 10 cm
  const byLight = 42 * light;
  const byCo2 = co2 === 'low' ? 18 : 48;
  const tf = temp <= 30 ? Math.exp(-(((temp - 30) / 14) ** 2)) : temp <= 40 ? 1 - (temp - 30) * 0.03 : Math.max(0, 0.7 - (temp - 40) * 0.14);
  const rate = Math.min(byLight, byCo2) * tf;
  const limit = tf < 0.6 ? 'temperature' : byLight < byCo2 ? 'light' : 'carbon dioxide';
  return { rate: Math.round(rate), limit };
}

export function PondweedLab() {
  const [d, setD] = useState(20);
  const [co2, setCo2] = useState<'low' | 'high'>('low');
  const [temp, setTemp] = useState(25);
  const [rows, setRows] = useState<{ d: number; co2: string; t: number; r: number }[]>([]);
  const { rate, limit } = photoRate(d, co2, temp);
  const [bubbles, setBubbles] = useState<{ id: number; y: number; x: number }[]>([]);
  const acc = useRef(0);
  const idRef = useRef(0);
  useEffect(() => {
    if (reducedMotion()) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      acc.current += (rate / 60) * dt * 3; // shown 3× faster
      const born: { id: number; y: number; x: number }[] = [];
      while (acc.current >= 1) {
        acc.current -= 1;
        born.push({ id: idRef.current++, y: 150, x: 150 + (Math.random() - 0.5) * 10 });
      }
      setBubbles((bs) => [...bs.map((b) => ({ ...b, y: b.y - 60 * dt })).filter((b) => b.y > 30), ...born]);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [rate]);
  const lampX = 300 - (d - 5) * 4.4;
  const advice = limit === 'light' ? 'Light is limiting: more light (a closer lamp) would speed it up.' : limit === 'carbon dioxide' ? 'Carbon dioxide is limiting: more light won\'t help now. Try adding CO₂.' : temp > 35 ? 'Too hot: the enzymes are being damaged.' : 'Temperature is limiting: the enzymes work slowly in the cold.';
  return (
    <div className="pond">
      <p className="widget-readout" aria-live="polite">
        <span>
          <strong className="num">{rate}</strong> bubbles of oxygen per minute
        </span>
        <span className="muted">{advice}</span>
      </p>
      <svg viewBox="0 0 340 200" className="pond-svg" role="img" aria-label={`Pondweed in a beaker with a lamp ${d} centimetres away, giving ${rate} bubbles per minute`}>
        <path d="M110 40 V185 H190 V40" className="tube-glass" fill="none" />
        <rect x={112} y={60} width={76} height={123} className="liquid liquid-water" />
        <path d="M150 182 C140 160 160 150 148 130 C140 115 156 105 150 92" className="weed-stem" fill="none" />
        {[[148, 165, -1], [152, 148, 1], [146, 132, -1], [152, 118, 1], [149, 104, -1]].map(([x, y, s], i) => (
          <ellipse key={i} cx={x! + s! * 9} cy={y} rx={10} ry={4} transform={`rotate(${s! * -25} ${x! + s! * 9} ${y})`} className="weed-leaf" />
        ))}
        {bubbles.map((b) => (
          <circle key={b.id} cx={b.x} cy={Math.max(62, b.y)} r={3} className="bubble" />
        ))}
        <g transform={`translate(${lampX} 70)`}>
          <path d="M0 -14 L22 -24 V24 L0 14 Z" className="lamp" />
          <rect x={22} y={-8} width={18} height={16} rx={2} className="lamp-base" />
          {rate > 0 ? <path d={`M-4 0 H${-(lampX - 196)}`} className="lamp-ray" /> : null}
        </g>
        <text x={lampX + 10} y={110} className="plot-tick" textAnchor="middle">
          {d} cm
        </text>
      </svg>
      <div className="widget-controls">
        <Slider label="Lamp distance (cm)" value={d} min={5} max={50} onChange={setD} />
        <Slider label="Water temperature (°C)" value={temp} min={5} max={45} onChange={setTemp} format={(v) => `${v} °C`} />
        <Segmented label="Carbon dioxide" value={co2} onChange={setCo2} options={[{ value: 'low', label: 'Normal CO₂' }, { value: 'high', label: 'Extra CO₂ added' }]} />
        <Button size="sm" variant="secondary" onClick={() => setRows([...rows.slice(-5), { d, co2: co2 === 'low' ? 'normal' : 'extra', t: temp, r: rate }])}>
          Record result
        </Button>
      </div>
      {rows.length ? (
        <table className="race-table">
          <caption className="sr-only">Your recorded results</caption>
          <thead>
            <tr>
              <th scope="col">Lamp</th>
              <th scope="col">CO₂</th>
              <th scope="col">Temp</th>
              <th scope="col">Bubbles/min</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="num">{r.d} cm</td>
                <td>{r.co2}</td>
                <td className="num">{r.t} °C</td>
                <td className="num">{r.r}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <p className="muted small">A model of a real class experiment. Change one variable at a time, and record your results.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
const HEART_NODES: Record<string, { x: number; y: number; label: string; rich: boolean }> = {
  'the vena cava': { x: 58, y: 252, label: 'Vena cava', rich: false },
  'the right atrium': { x: 150, y: 142, label: 'Right atrium', rich: false },
  'the right ventricle': { x: 150, y: 212, label: 'Right ventricle', rich: false },
  'the pulmonary artery': { x: 96, y: 72, label: 'Pulmonary artery', rich: false },
  'the lungs': { x: 220, y: 24, label: 'Lungs', rich: true },
  'the pulmonary vein': { x: 344, y: 72, label: 'Pulmonary vein', rich: true },
  'the left atrium': { x: 290, y: 142, label: 'Left atrium', rich: true },
  'the left ventricle': { x: 290, y: 212, label: 'Left ventricle', rich: true },
  'the aorta': { x: 386, y: 252, label: 'Aorta', rich: true },
  'the body': { x: 220, y: 300, label: 'Body cells', rich: false },
};
const nodeW = (label: string) => label.length * 7.2 + 22;

export function HeartPath() {
  const [step, setStep] = useState(1);
  const [miss, setMiss] = useState<string | null>(null);
  const done = step >= BLOOD_PATH.length;
  const tap = (id: string) => {
    if (done) return;
    if (id === BLOOD_PATH[step]) {
      setStep(step + 1);
      setMiss(null);
    } else setMiss(id);
  };
  const cur = BLOOD_PATH[step - 1]!;
  return (
    <div className="heart">
      <p className="widget-readout" aria-live="polite">
        {done ? (
          <span>
            <strong>Round trip complete.</strong> Blood passes through the heart twice on every lap of the body.
          </span>
        ) : (
          <span>
            Blood is in <strong>{HEART_NODES[cur]!.label.toLowerCase()}</strong>. Tap where it goes next.
          </span>
        )}
        {miss ? <span className="feedback-miss">Not {HEART_NODES[miss]!.label.toLowerCase()}. {HEART_NODES[cur]!.rich ? 'This blood is oxygen-rich, heading for the body.' : 'This blood is oxygen-poor, heading for the lungs.'}</span> : null}
      </p>
      <svg viewBox="0 0 440 320" className="heart-svg" role="group" aria-label="Diagram of the heart, lungs and body. Choose where blood goes next.">
        <path d="M220 104 C160 104 104 126 104 176 C104 228 168 258 220 280 C272 258 336 228 336 176 C336 126 280 104 220 104 Z" className="heart-outline" />
        <line x1={220} y1={118} x2={220} y2={268} className="septum" />
        {BLOOD_PATH.slice(0, step).map((id, i) => {
          const next = BLOOD_PATH[i + 1];
          if (!next || i + 1 >= step) return null;
          const a = HEART_NODES[id]!;
          const b = HEART_NODES[next]!;
          return <line key={id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={`flow ${b.rich ? 'flow-rich' : 'flow-poor'}`} markerEnd={`url(#flow-${b.rich ? 'rich' : 'poor'})`} />;
        })}
        <defs>
          {['rich', 'poor'].map((k) => (
            <marker key={k} id={`flow-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M0 0L10 5L0 10z" className={`flow-head-${k}`} />
            </marker>
          ))}
        </defs>
        {Object.entries(HEART_NODES).map(([id, n]) => {
          const visited = BLOOD_PATH.indexOf(id) < step;
          return (
            <g key={id} role="button" tabIndex={0} aria-label={n.label} className={`hnode${visited ? ' visited' : ''}${id === cur ? ' current' : ''}${miss === id ? ' miss' : ''}${n.rich ? ' rich' : ' poor'}`} onClick={() => tap(id)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), tap(id))}>
              <rect x={n.x - nodeW(n.label) / 2} y={n.y - 14} width={nodeW(n.label)} height={28} rx={14} />
              <text x={n.x} y={n.y + 4} textAnchor="middle">
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="chip-list heart-chips" aria-label="Places blood can go">
        {Object.entries(HEART_NODES).map(([id, n]) => (
          <li key={id}>
            <button type="button" className={`chip${miss === id ? ' miss' : ''}`} disabled={done || BLOOD_PATH.indexOf(id) < step} onClick={() => tap(id)}>
              {n.label}
            </button>
          </li>
        ))}
      </ul>
      <p className="heart-legend">
        <span>
          <i className="poor" /> oxygen-poor
        </span>
        <span>
          <i className="rich" /> oxygen-rich
        </span>
        <Button size="sm" variant="quiet" onClick={() => (setStep(1), setMiss(null))}>
          Start again
        </Button>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
type Chrom = { x: number; y: number; len: number; hue: 'mum' | 'dad'; tip?: 'mum' | 'dad'; double: boolean; angle?: number };
interface Frame {
  title: string;
  note: string;
  cells: { cx: number; cy: number; rx: number; ry: number; chroms: Chrom[]; spindle?: boolean; noNucleus?: boolean }[];
  count: string;
}
const LENS = [46, 34, 24];

function mitosisFrames(pairs: number): Frame[] {
  const n2 = pairs * 2;
  const all = (fn: (p: number, h: 'mum' | 'dad', k: number) => Chrom) => Array.from({ length: pairs }, (_, p) => [fn(p, 'mum', p * 2), fn(p, 'dad', p * 2 + 1)]).flat();
  const one = { cx: 200, cy: 110, rx: 160, ry: 92 };
  return [
    { title: 'Interphase', note: 'The cell grows and copies its DNA. Chromosomes are long and thin.', count: `${n2} chromosomes, copying their DNA`, cells: [{ ...one, chroms: all((p, h, k) => ({ x: 140 + k * 26, y: 90 + (k % 2) * 30, len: LENS[p]!, hue: h, double: false, angle: 30 + k * 20 })) }] },
    { title: 'Prophase', note: 'Chromosomes coil up and become visible as two identical chromatids joined at a centromere.', count: `${n2} chromosomes, ${n2 * 2} chromatids`, cells: [{ ...one, spindle: true, chroms: all((p, h, k) => ({ x: 110 + k * 36, y: 80 + (k % 3) * 25, len: LENS[p]!, hue: h, double: true, angle: k * 25 - 20 })) }] },
    { title: 'Metaphase', note: 'Chromosomes line up across the middle of the cell, attached to spindle fibres.', count: `${n2} chromosomes, ${n2 * 2} chromatids`, cells: [{ ...one, spindle: true, noNucleus: true, chroms: all((p, h, k) => ({ x: 200, y: 110 - (n2 - 1) * 14 + k * 28, len: LENS[p]!, hue: h, double: true, angle: 90 })) }] },
    {
      title: 'Anaphase',
      note: 'Centromeres split. Identical chromatids are pulled to opposite ends.',
      count: `${n2 * 2} chromatids moving apart, ${n2} to each end`,
      cells: [{ ...one, spindle: true, noNucleus: true, chroms: [...all((p, h, k) => ({ x: 120, y: 110 - (n2 - 1) * 14 + k * 28, len: LENS[p]!, hue: h, double: false, angle: 0 })), ...all((p, h, k) => ({ x: 280, y: 110 - (n2 - 1) * 14 + k * 28, len: LENS[p]!, hue: h, double: false, angle: 0 }))] }],
    },
    {
      title: 'Telophase and cytokinesis',
      note: 'Two nuclei form and the cytoplasm divides. Two identical daughter cells.',
      count: `2 cells, each with ${n2} chromosomes (2n)`,
      cells: [100, 300].map((cx) => ({ cx, cy: 110, rx: 92, ry: 82, chroms: all((p, h, k) => ({ x: cx - 30 + k * 16, y: 95 + (k % 2) * 30, len: LENS[p]! * 0.8, hue: h, double: false, angle: 70 + k * 15 })) })),
    },
  ];
}

function meiosisFrames(pairs: number): Frame[] {
  const n2 = pairs * 2;
  const n = pairs;
  const one = { cx: 200, cy: 110, rx: 160, ry: 92 };
  const ys = (k: number, total: number, cy = 110, gap = 30) => cy - ((total - 1) * gap) / 2 + k * gap;
  return [
    {
      title: 'Prophase I',
      note: 'Matching chromosomes from mum and dad pair up and swap pieces (crossing over).',
      count: `${n} pairs, ${n2 * 2} chromatids`,
      cells: [{ ...one, spindle: true, chroms: Array.from({ length: pairs }, (_, p) => [{ x: 150 + p * 50, y: 100, len: LENS[p]!, hue: 'mum' as const, tip: 'dad' as const, double: true, angle: 80 }, { x: 166 + p * 50, y: 100, len: LENS[p]!, hue: 'dad' as const, tip: 'mum' as const, double: true, angle: 80 }]).flat() }],
    },
    {
      title: 'Metaphase I',
      note: 'The pairs line up on either side of the middle.',
      count: `${n} pairs on the equator`,
      cells: [{ ...one, spindle: true, noNucleus: true, chroms: Array.from({ length: pairs }, (_, p) => [{ x: 184, y: ys(p, pairs), len: LENS[p]!, hue: p % 2 ? ('dad' as const) : ('mum' as const), tip: p % 2 ? ('mum' as const) : ('dad' as const), double: true, angle: 0 }, { x: 216, y: ys(p, pairs), len: LENS[p]!, hue: p % 2 ? ('mum' as const) : ('dad' as const), tip: p % 2 ? ('dad' as const) : ('mum' as const), double: true, angle: 0 }]).flat() }],
    },
    {
      title: 'Anaphase I',
      note: 'Each pair separates: one whole chromosome (still two chromatids) goes to each end.',
      count: `${n} chromosomes to each end`,
      cells: [{ ...one, spindle: true, noNucleus: true, chroms: Array.from({ length: pairs }, (_, p) => [{ x: 110, y: ys(p, pairs), len: LENS[p]!, hue: p % 2 ? ('dad' as const) : ('mum' as const), tip: p % 2 ? ('mum' as const) : ('dad' as const), double: true, angle: 0 }, { x: 290, y: ys(p, pairs), len: LENS[p]!, hue: p % 2 ? ('mum' as const) : ('dad' as const), tip: p % 2 ? ('dad' as const) : ('mum' as const), double: true, angle: 0 }]).flat() }],
    },
    {
      title: 'Telophase I',
      note: 'Two cells, each with half the chromosome number. Each chromosome is still two chromatids.',
      count: `2 cells, each with ${n} chromosomes (n)`,
      cells: [100, 300].map((cx, side) => ({ cx, cy: 110, rx: 92, ry: 82, chroms: Array.from({ length: pairs }, (_, p) => ({ x: cx - 20 + p * 22, y: 105, len: LENS[p]! * 0.85, hue: ((p + side) % 2 ? 'dad' : 'mum') as 'mum' | 'dad', tip: ((p + side) % 2 ? 'mum' : 'dad') as 'mum' | 'dad', double: true, angle: 75 })) })),
    },
    {
      title: 'Meiosis II',
      note: 'Each cell divides again, like mitosis: chromatids are pulled apart.',
      count: `${n * 4} chromatids separating in 2 cells`,
      cells: [100, 300].map((cx, side) => ({ cx, cy: 110, rx: 92, ry: 82, spindle: true, noNucleus: true, chroms: Array.from({ length: pairs }, (_, p) => [{ x: cx - 45, y: ys(p, pairs, 110, 26), len: LENS[p]! * 0.8, hue: ((p + side) % 2 ? 'dad' : 'mum') as 'mum' | 'dad', double: false, angle: 0 }, { x: cx + 45, y: ys(p, pairs, 110, 26), len: LENS[p]! * 0.8, hue: ((p + side) % 2 ? 'dad' : 'mum') as 'mum' | 'dad', tip: ((p + side) % 2 ? 'mum' : 'dad') as 'mum' | 'dad', double: false, angle: 0 }]).flat() })),
    },
    {
      title: 'Telophase II',
      note: 'Four gametes, each with n chromosomes, and each genetically different.',
      count: `4 cells, each with ${n} chromosomes (n)`,
      cells: [52, 150, 250, 348].map((cx, i) => ({ cx, cy: 110, rx: 46, ry: 60, chroms: Array.from({ length: pairs }, (_, p) => ({ x: cx - 12 + p * 12, y: 108, len: LENS[p]! * 0.6, hue: ((p + (i >> 1)) % 2 ? 'dad' : 'mum') as 'mum' | 'dad', ...(i % 2 ? { tip: ((p + (i >> 1)) % 2 ? 'mum' : 'dad') as 'mum' | 'dad' } : {}), double: false, angle: 80 })) })),
    },
  ];
}

function Chromosome({ c }: { c: Chrom }) {
  const arm = (rot: number) => (
    <g transform={`rotate(${rot})`}>
      <rect x={-c.len / 2} y={-3.5} width={c.len} height={7} rx={3.5} className={`chrom chrom-${c.hue}`} />
      {c.tip ? <rect x={c.len / 2 - c.len * 0.28} y={-3.5} width={c.len * 0.28} height={7} rx={3.5} className={`chrom chrom-${c.tip}`} /> : null}
    </g>
  );
  return (
    <g transform={`translate(${c.x} ${c.y}) rotate(${c.angle ?? 0})`}>
      {c.double ? (
        <>
          {arm(14)}
          {arm(-14)}
          <circle r={3.5} className="centromere" />
        </>
      ) : (
        arm(0)
      )}
    </g>
  );
}

export function MitosisLab() {
  const [mode, setMode] = useState<'mitosis' | 'meiosis'>('mitosis');
  const [pairs, setPairs] = useState(2);
  const [i, setI] = useState(0);
  const frames = mode === 'mitosis' ? mitosisFrames(pairs) : meiosisFrames(pairs);
  const f = frames[Math.min(i, frames.length - 1)]!;
  return (
    <div className="mito">
      <div className="mito-top">
        <Segmented label="Type of division" value={mode} onChange={(m) => (setMode(m), setI(0))} options={[{ value: 'mitosis', label: 'Mitosis' }, { value: 'meiosis', label: 'Meiosis' }]} />
        <Segmented label="Chromosomes in a body cell" value={String(pairs)} onChange={(v) => setPairs(Number(v))} options={[1, 2, 3].map((p) => ({ value: String(p), label: `2n = ${p * 2}` }))} />
      </div>
      <p className="widget-readout" aria-live="polite">
        <span>
          <strong>{f.title}</strong> ({i + 1} of {frames.length})
        </span>
        <span className="muted">{f.note}</span>
      </p>
      <svg viewBox="0 0 400 220" className="mito-svg" role="img" aria-label={`${f.title}: ${f.note} ${f.count}`}>
        {f.cells.map((cell, k) => (
          <g key={k}>
            <ellipse cx={cell.cx} cy={cell.cy} rx={cell.rx} ry={cell.ry} className="mcell" />
            {!cell.noNucleus ? <ellipse cx={cell.cx} cy={cell.cy} rx={cell.rx * 0.62} ry={cell.ry * 0.62} className="mnucleus" /> : null}
            {cell.spindle ? <path d={`M${cell.cx - cell.rx + 12} ${cell.cy} Q${cell.cx} ${cell.cy - cell.ry * 0.8} ${cell.cx + cell.rx - 12} ${cell.cy} Q${cell.cx} ${cell.cy + cell.ry * 0.8} ${cell.cx - cell.rx + 12} ${cell.cy}`} className="spindle" /> : null}
            {cell.chroms.map((c, j) => (
              <Chromosome key={j} c={c} />
            ))}
          </g>
        ))}
      </svg>
      <p className="mito-count num">{f.count}</p>
      <div className="widget-controls">
        <div className="widget-buttons">
          <Button size="sm" variant="quiet" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>
            Back
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setI(Math.min(frames.length - 1, i + 1))} disabled={i >= frames.length - 1}>
            Next stage
          </Button>
        </div>
        <p className="heart-legend">
          <span>
            <i className="chrom-mum" /> from the mother
          </span>
          <span>
            <i className="chrom-dad" /> from the father
          </span>
        </p>
      </div>
    </div>
  );
}
