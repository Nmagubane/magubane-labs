/**
 * Natural Sciences & Technology labs, Grades 4–6 (part 1): life and living, matter and materials.
 * Built for small hands: big tap targets, tap-to-choose instead of fiddly dragging, instant feedback in words.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { Button, Segmented } from '../../ui/primitives.tsx';
import { Slider } from './MathWidgets.tsx';
import { THINGS, CYCLES, MATERIALS_TEST, SEPARATE, type LifeClass, type Material } from '../../../shared/questions/generators/nst-life-matter.ts';
import { BinIcon } from '../../ui/Illustrations.tsx';

const shuffle = <T,>(xs: readonly T[]): T[] => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
};
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);
const bare = (s: string) => s.replace(/^(a|an|the) /, '');

export function Note({ ok, children }: { ok: boolean | null; children: ReactNode }) {
  return (
    <div className={`lab-note${ok === true ? ' ok' : ok === false ? ' off' : ''}`} role="status" aria-live="polite">
      {ok === true ? <span className="lab-note-mark" aria-hidden="true">✓</span> : ok === false ? <span className="lab-note-mark" aria-hidden="true">✗</span> : null}
      <div>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Living sort: tap a card, then tap a bin.
const BINS: { id: LifeClass; label: string; sub: string }[] = [
  { id: 'living', label: 'Living', sub: 'does all 7 life processes' },
  { id: 'non-living', label: 'Never alive', sub: 'was never part of a living thing' },
  { id: 'once-living', label: 'Once living', sub: 'came from something that was alive' },
];
const deal = () => {
  // Make sure every round has at least two of each kind.
  const by = (c: LifeClass) => shuffle(THINGS.filter((t) => t.cls === c)).slice(0, 2);
  const base = [...by('living'), ...by('non-living'), ...by('once-living')];
  const rest = shuffle(THINGS.filter((t) => !base.includes(t))).slice(0, 3);
  return shuffle([...base, ...rest]);
};

export function LivingSort() {
  const [items, setItems] = useState(deal);
  const [placed, setPlaced] = useState<Record<string, LifeClass>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [last, setLast] = useState<{ name: string; ok: boolean } | null>(null);
  const left = items.filter((t) => !(t.name in placed));
  const right = items.filter((t) => placed[t.name] === t.cls).length;
  const drop = (bin: LifeClass) => {
    if (!sel) return;
    setPlaced({ ...placed, [sel]: bin });
    setLast({ name: sel, ok: items.find((t) => t.name === sel)!.cls === bin });
    setSel(null);
  };
  const lastThing = last ? items.find((t) => t.name === last.name)! : null;
  const again = () => (setItems(deal()), setPlaced({}), setSel(null), setLast(null));
  return (
    <div className="lsort">
      <p className="widget-readout" aria-live="polite">
        {left.length ? (
          <span>{sel ? <>Where does <strong>{bare(sel)}</strong> go? Tap a box.</> : 'Tap a card, then tap the box it belongs in.'}</span>
        ) : (
          <span>
            <strong className="num">{right}</strong> of {items.length} sorted correctly.
          </span>
        )}
      </p>
      {left.length ? (
        <ul className="lsort-tray" aria-label="Things to sort">
          {left.map((t) => (
            <li key={t.name}>
              <button type="button" className={`lsort-card${sel === t.name ? ' on' : ''}`} aria-pressed={sel === t.name} onClick={() => setSel(sel === t.name ? null : t.name)}>
                {cap(bare(t.name))}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="lsort-bins">
        {BINS.map((b) => (
          <section key={b.id} className={`lsort-bin${sel ? ' ready' : ''}`}>
            <button type="button" className="lsort-bin-head" disabled={!sel} onClick={() => drop(b.id)} aria-label={`Put ${sel ? bare(sel) : 'card'} in ${b.label}`}>
              <BinIcon kind={b.id} size={44} />
              <span>
                <strong>{b.label}</strong>
                <small>{b.sub}</small>
              </span>
            </button>
            <ul>
              {items
                .filter((t) => placed[t.name] === b.id)
                .map((t) => (
                  <li key={t.name} className={t.cls === b.id ? 'ok' : 'off'}>
                    <span aria-hidden="true">{t.cls === b.id ? '✓' : '✗'}</span> {cap(bare(t.name))}
                    <span className="sr-only">{t.cls === b.id ? ' (correct)' : ' (not this box)'}</span>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
      {last && lastThing ? (
        <Note ok={last.ok}>
          <p>
            <strong>{cap(bare(lastThing.name))}</strong>: {last.ok ? 'yes, ' : `it belongs in "${BINS.find((b) => b.id === lastThing.cls)!.label}". `}
            {lastThing.why}
          </p>
        </Note>
      ) : null}
      {!left.length ? (
        <div className="widget-controls">
          <Button size="sm" variant="secondary" onClick={again}>
            New set of cards
          </Button>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grow a bean: two pots, a fair test.
type Need = 'light' | 'water' | 'warmth' | 'soil';
const NEEDS: { id: Need; label: string }[] = [
  { id: 'light', label: 'Sunlight' },
  { id: 'water', label: 'Water' },
  { id: 'warmth', label: 'Warmth' },
  { id: 'soil', label: 'Rich soil' },
];
type Pot = Record<Need, boolean>;
const ALL: Pot = { light: true, water: true, warmth: true, soil: true };

/** A simple, honest growth model: what a Grade 4 class would see in a two-week bean experiment. */
export function beanState(p: Pot, day: number) {
  if (!p.warmth) return { sprouted: false, height: 0, leaves: 0, pale: false, wilted: false, note: 'Still a seed: it is too cold to germinate.' };
  const start = 2; // days to germinate
  const d = Math.max(0, day - start);
  if (d === 0) return { sprouted: day >= start, height: 0, leaves: 0, pale: false, wilted: false, note: 'The seed is swelling and splitting.' };
  if (!p.water) {
    const h = Math.min(d, 3) * 0.8;
    return { sprouted: true, height: h, leaves: h > 1.5 ? 2 : 0, pale: false, wilted: d > 3, note: d > 3 ? 'Wilting: the seedling has run out of water.' : 'It sprouted using water stored in the seed.' };
  }
  let rate = 1.3;
  let leafSize = 1;
  if (!p.light) rate = 1.6; // tall and spindly, searching for light
  if (!p.soil) (rate *= 0.6), (leafSize = 0.6);
  const h = Math.min(d * rate, 18);
  const pale = !p.light && d > 2;
  return {
    sprouted: true,
    height: h,
    leaves: Math.min(Math.floor(h / 2.6), 6) * (p.light ? 1 : 0.5),
    leafSize: p.light ? leafSize : 0.4,
    pale,
    wilted: !p.light && d > 9,
    note: !p.light ? (d > 9 ? 'Pale, thin and flopping: it can\'t make food without light.' : 'Tall and pale: it is stretching to find light.') : !p.soil ? 'Growing slowly with small leaves: few nutrients in this soil.' : 'Healthy and green.',
  };
}

function BeanPot({ pot, day, label }: { pot: Pot; day: number; label: string }) {
  const s = beanState(pot, day);
  const W = 170;
  const H = 230;
  const soilY = 180;
  const h = s.height * 8; // px per cm
  const top = soilY - h;
  const lean = s.wilted ? 26 : 0;
  const stem = `M ${W / 2} ${soilY} C ${W / 2} ${soilY - h * 0.5}, ${W / 2 + lean * 0.4} ${top + 10}, ${W / 2 + lean} ${top + (s.wilted ? h * 0.25 : 0)}`;
  const leafCount = Math.round(s.leaves ?? 0);
  const leafSize = 'leafSize' in s ? (s.leafSize as number) : 1;
  return (
    <figure className="bean">
      <svg viewBox={`0 0 ${W} ${H}`} className="bean-svg" role="img" aria-label={`${label}: ${s.sprouted ? `${s.height.toFixed(1)} cm tall` : 'not sprouted'}. ${s.note}`}>
        {!pot.light ? <rect x={0} y={0} width={W} height={H} className="bean-dark" /> : <g className="bean-sun">
            <circle cx={W - 30} cy={28} r={12} />
            <path d={Array.from({ length: 8 }, (_, k) => { const a = (k * Math.PI) / 4; return `M ${W - 30 + Math.cos(a) * 17} ${28 + Math.sin(a) * 17} L ${W - 30 + Math.cos(a) * 22} ${28 + Math.sin(a) * 22}`; }).join(' ')} />
          </g>}
        {pot.water ? <path className="bean-drop" d="M 22 18 C 22 18 14 30 14 35 a 8 8 0 0 0 16 0 C 30 30 22 18 22 18 Z" /> : null}
        {s.sprouted && h > 0 ? (
          <g className={`bean-plant${s.pale ? ' pale' : ''}`}>
            <path d={stem} className="bean-stem" />
            {Array.from({ length: leafCount }, (_, i) => {
              const t = (i + 1) / (leafCount + 1);
              const y = soilY - h * t;
              const side = i % 2 ? 1 : -1;
              const r = (9 + i * 1.2) * leafSize;
              return <ellipse key={i} cx={W / 2 + side * (r + 1) + lean * t} cy={y} rx={r} ry={r * 0.5} transform={`rotate(${side * (s.wilted ? 40 : -20)} ${W / 2 + lean * t} ${y})`} className="bean-leaf" />;
            })}
          </g>
        ) : null}
        <ellipse cx={W / 2} cy={soilY + 4} rx={8} ry={5} className={`bean-seed${s.sprouted ? ' split' : ''}`} />
        <path d={`M 32 ${soilY - 6} H ${W - 32} L ${W - 44} ${H - 6} H 44 Z`} className="bean-pot" />
        <path d={`M 34 ${soilY - 4} H ${W - 34}`} className={`bean-soil${pot.soil ? '' : ' sand'}`} />
      </svg>
      <figcaption>
        <strong>{label}</strong>
        <span className="num">{s.sprouted ? `${s.height.toFixed(1).replace('.', ',')} cm` : 'no shoot'}</span>
        <span className="small">{s.note}</span>
      </figcaption>
    </figure>
  );
}

export function BeanLab() {
  const [a, setA] = useState<Pot>(ALL);
  const [b, setB] = useState<Pot>({ ...ALL, light: false });
  const [day, setDay] = useState(10);
  const diff = NEEDS.filter((n) => a[n.id] !== b[n.id]);
  const toggles = (pot: Pot, set: (p: Pot) => void, name: string) => (
    <div className="bean-toggles" role="group" aria-label={`${name} conditions`}>
      {NEEDS.map((n) => (
        <button key={n.id} type="button" className={`chip${pot[n.id] ? ' on' : ''}`} aria-pressed={pot[n.id]} onClick={() => set({ ...pot, [n.id]: !pot[n.id] })}>
          {pot[n.id] ? '✓ ' : ''}
          {n.label}
        </button>
      ))}
    </div>
  );
  return (
    <div className="beanlab">
      <div className="bean-pair">
        <div>
          <BeanPot pot={a} day={day} label="Pot A" />
          {toggles(a, setA, 'Pot A')}
        </div>
        <div>
          <BeanPot pot={b} day={day} label="Pot B" />
          {toggles(b, setB, 'Pot B')}
        </div>
      </div>
      <div className="widget-controls">
        <Slider label="Day" value={day} min={0} max={14} onChange={setDay} format={(v) => `day ${v}`} />
      </div>
      <Note ok={diff.length === 1 ? true : diff.length > 1 ? false : null}>
        {diff.length === 0 ? (
          <p>Both pots are the same, so nothing is being tested. Switch off one need in one pot.</p>
        ) : diff.length === 1 ? (
          <p>
            <strong>Fair test.</strong> Only <strong>{diff[0]!.label.toLowerCase()}</strong> is different, so any difference between the plants is caused by {diff[0]!.label.toLowerCase()}.
          </p>
        ) : (
          <p>
            <strong>Not a fair test.</strong> You changed {diff.length} things ({diff.map((d) => d.label.toLowerCase()).join(' and ')}), so you can't tell which one made the difference.
          </p>
        )}
      </Note>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Life-cycle wheel: tap the stages in order.
const RING_POS = ['n', 'e', 's', 'w'] as const;

export function LifeCycleLab() {
  const [ci, setCi] = useState(0);
  const c = CYCLES[ci]!;
  const [order, setOrder] = useState<string[]>([]);
  const deck = useMemo(() => shuffle(c.stages), [c]);
  const full = order.length === c.stages.length;
  const firstWrong = order.findIndex((s, i) => s !== c.stages[i]);
  const right = full && firstWrong === -1;
  const choose = (i: number) => (setCi(i), setOrder([]));
  return (
    <div className="cyc">
      <ul className="chip-list" aria-label="Living thing">
        {CYCLES.map((x, i) => (
          <li key={x.who}>
            <button type="button" className={`chip${ci === i ? ' on' : ''}`} aria-pressed={ci === i} onClick={() => choose(i)}>
              {cap(bare(x.who))}
            </button>
          </li>
        ))}
      </ul>
      <p className="widget-readout">{full ? (right ? 'The cycle is complete.' : 'Something is out of order.') : `Tap the stages in order, starting with the ${c.stages[0]!.startsWith('seed') ? 'seed' : 'egg'}.`}</p>
      <div className="cyc-layout">
        <div className="cyc-ring" aria-label={`Life cycle of ${c.who}`}>
          {RING_POS.map((pos, i) => {
            const s = order[i];
            const state = s === undefined ? '' : full ? (s === c.stages[i] ? ' ok' : ' off') : ' set';
            return (
              <div key={pos} className={`cyc-node cyc-${pos}${state}`}>
                <span className="cyc-num num">{i + 1}</span>
                {s ? cap(s) : '?'}
              </div>
            );
          })}
          <span className="cyc-arrow cyc-ne" aria-hidden="true">↘</span>
          <span className="cyc-arrow cyc-se" aria-hidden="true">↙</span>
          <span className="cyc-arrow cyc-sw" aria-hidden="true">↖</span>
          <span className="cyc-arrow cyc-nw" aria-hidden="true">↗</span>
          <div className="cyc-centre">{cap(bare(c.who))}</div>
        </div>
        <div className="cyc-deck" role="group" aria-label="Stages to place">
          {deck.map((s) => (
            <button key={s} type="button" className="lsort-card" disabled={order.includes(s) || full} onClick={() => setOrder([...order, s])}>
              {cap(s)}
            </button>
          ))}
          <Button size="sm" variant="quiet" onClick={() => setOrder([])} disabled={!order.length}>
            Clear
          </Button>
        </div>
      </div>
      {full ? (
        <Note ok={right}>
          {right ? (
            <p>
              {cap(c.stages.join(' → '))}, and then the adult makes new {c.stages[0]!.startsWith('seed') ? 'seeds' : 'eggs'}. {c.notes}
            </p>
          ) : (
            <p>
              Stage {firstWrong + 1} isn't right. What has to happen before "{order[firstWrong]}"? Clear and try again.
            </p>
          )}
        </Note>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Solids, liquids and gases in different containers.
type StateKind = 'solid' | 'liquid' | 'gas';
type Box = 'jar' | 'bowl' | 'syringe';
const BOXES: Record<Box, { w: number; h: number; label: string }> = {
  jar: { w: 96, h: 190, label: 'Tall jar' },
  bowl: { w: 230, h: 84, label: 'Wide bowl' },
  syringe: { w: 76, h: 190, label: 'Syringe' },
};
const SAMPLE: Record<StateKind, string> = { solid: 'A wooden block', liquid: 'Water', gas: 'Air' };
const hash = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export function StatesLab() {
  const [st, setSt] = useState<StateKind>('liquid');
  const [box, setBox] = useState<Box>('jar');
  const [squash, setSquash] = useState(0);
  const B = BOXES[box];
  const W = 280;
  const H = 240;
  const x0 = (W - B.w) / 2;
  const floor = H - 20;
  // The syringe plunger moves down; whatever is inside limits it.
  const LIQUID_AREA = 96 * 74;
  const liquidH = LIQUID_AREA / B.w;
  const solidSize = 64;
  const contentTop = st === 'liquid' ? liquidH : st === 'solid' ? solidSize : 26;
  const maxSquash = box === 'syringe' ? Math.max(0, (B.h - contentTop) / B.h) : 0;
  const sq = Math.min(squash / 100, maxSquash);
  const blocked = box === 'syringe' && squash / 100 > maxSquash + 0.001 && st !== 'gas';
  const innerTop = floor - B.h * (1 - sq);
  const particles: { x: number; y: number }[] = [];
  if (st === 'solid') {
    const n = 7;
    const s = solidSize / n;
    const bx = W / 2 - solidSize / 2;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) particles.push({ x: bx + s / 2 + c * s, y: floor - s / 2 - r * s });
  } else if (st === 'liquid') {
    // Close together but jumbled: a jittered grid that fills the liquid, with a few gaps.
    const gap = 9;
    const cols = Math.floor((B.w - 6) / gap);
    const rows = Math.floor((liquidH - 3) / gap);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (hash(i, 5) < 0.12) continue;
        particles.push({ x: x0 + 3 + gap / 2 + c * gap + (hash(i, 1) - 0.5) * 3.5 + (r % 2 ? 2 : 0), y: floor - gap / 2 - r * gap + (hash(i, 2) - 0.5) * 3 });
      }
  } else {
    for (let i = 0; i < 26; i++) particles.push({ x: x0 + 6 + hash(i, 3) * (B.w - 12), y: innerTop + 6 + hash(i, 4) * (floor - innerTop - 12) });
  }
  const shapeLine =
    box === 'bowl'
      ? `M ${x0} ${floor - B.h} Q ${x0} ${floor} ${W / 2} ${floor} Q ${x0 + B.w} ${floor} ${x0 + B.w} ${floor - B.h}`
      : `M ${x0} ${floor - B.h} V ${floor} H ${x0 + B.w} V ${floor - B.h}`;
  return (
    <div className="states">
      <div className="widget-controls first">
        <Segmented label="Material" value={st} onChange={(v) => (setSt(v), setSquash(0))} options={(['solid', 'liquid', 'gas'] as StateKind[]).map((v) => ({ value: v, label: SAMPLE[v] }))} />
        <Segmented label="Container" value={box} onChange={(v) => (setBox(v), setSquash(0))} options={(Object.keys(BOXES) as Box[]).map((v) => ({ value: v, label: BOXES[v].label }))} />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="states-svg" role="img" aria-label={`${SAMPLE[st]} in a ${B.label.toLowerCase()}`}>
        <defs>
          <clipPath id="states-clip">{box === 'bowl' ? <path d={`${shapeLine} Z`} /> : <rect x={x0} y={floor - B.h} width={B.w} height={B.h} />}</clipPath>
        </defs>
        {st === 'liquid' ? <rect x={x0} y={floor - liquidH} width={B.w} height={liquidH} className="states-liquid" clipPath="url(#states-clip)" /> : null}
        {st === 'solid' ? <rect x={W / 2 - solidSize / 2} y={floor - solidSize} width={solidSize} height={solidSize} className="states-solid" /> : null}
        <g clipPath="url(#states-clip)">
          {particles.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={st === 'gas' ? 3.4 : 3.6} className={`particle particle-${st}${st === 'gas' ? ' jiggle' : ''}`} style={{ animationDelay: `${(i % 7) * -0.13}s` }} />
          ))}
        </g>
        <path d={shapeLine} className="states-glass" />
        {box === 'syringe' ? <rect x={W / 2 - 6} y={floor} width={12} height={14} className="states-nozzle" /> : null}
        {box === 'syringe' ? (
          <g className="states-plunger">
            <rect x={x0 + 3} y={innerTop - 8} width={B.w - 6} height={8} />
            <rect x={W / 2 - 4} y={innerTop - 52} width={8} height={44} />
            <rect x={W / 2 - 22} y={innerTop - 58} width={44} height={7} />
          </g>
        ) : null}
      </svg>
      {box === 'syringe' ? (
        <div className="widget-controls">
          <Slider label="Push the plunger" value={squash} min={0} max={70} onChange={setSquash} format={(v) => `${v}%`} />
        </div>
      ) : null}
      <Note ok={null}>
        <p>
          {st === 'solid'
            ? 'A solid keeps its own shape, whatever container it is in. Its particles are packed tightly and only vibrate.'
            : st === 'liquid'
              ? 'A liquid flows to the bottom and takes the shape of the container, but it keeps the same amount (volume). Compare the jar and the bowl.'
              : 'A gas spreads out to fill the whole container. Its particles are far apart and zoom about.'}{' '}
          {box === 'syringe' ? (st === 'gas' ? (squash > 0 ? `You squashed the air into ${Math.round((1 - sq) * 100)}% of the space: gases can be compressed.` : 'Push the plunger. Can you squash the air?') : blocked ? `The plunger stops: you can't squash a ${st}.` : `Push the plunger. Can you squash the ${st}?`) : null}
        </p>
      </Note>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Material test bench.
type Test = 'shine' | 'magnet' | 'circuit';
const TESTS: { id: Test; label: string }[] = [
  { id: 'shine', label: 'Look: is it shiny?' },
  { id: 'magnet', label: 'Magnet test' },
  { id: 'circuit', label: 'Circuit test' },
];
const testResult = (m: Material, t: Test) => (t === 'shine' ? m.shiny : t === 'magnet' ? m.magnetic : m.conducts);

function BenchPicture({ m, test }: { m: Material; test: Test | null }) {
  const pulled = test === 'magnet' && m.magnetic;
  const lit = test === 'circuit' && m.conducts;
  return (
    <svg viewBox="0 0 300 150" className="bench-svg" role="img" aria-label={test === 'magnet' ? (pulled ? 'The magnet pulls it' : 'The magnet does nothing') : test === 'circuit' ? (lit ? 'The bulb lights up' : 'The bulb stays off') : 'The test bench'}>
      {test === 'circuit' ? (
        <g>
          <path d="M 40 40 H 132 M 168 40 H 260 V 120 H 250 M 176 120 H 140 M 80 120 H 40 V 40" className="bench-wire" />
          <rect x={80} y={110} width={60} height={20} rx={3} className="bench-cell" />
          <text x={110} y={124} textAnchor="middle" className="bench-text">1,5 V</text>
          <circle cx={150} cy={40} r={18} className={`bench-bulb${lit ? ' lit' : ''}`} />
          {lit ? <path d="M 150 12 v -8 M 126 20 l -6 -5 M 174 20 l 6 -5" className="bench-rays" /> : null}
          <circle cx={176} cy={120} r={4} className="bench-node" />
          <circle cx={250} cy={120} r={4} className="bench-node" />
          <rect x={172} y={113} width={82} height={14} rx={7} className="bench-obj" />
          <text x={213} y={146} textAnchor="middle" className="bench-text">{bare(m.name)} in the gap</text>
        </g>
      ) : test === 'magnet' ? (
        <g>
          <path d="M 112 78 H 86 a 22 22 0 0 0 0 44 H 112" className="bench-magnet" />
          <rect x={100} y={70} width={14} height={16} className="bench-pole" />
          <rect x={100} y={114} width={14} height={16} className="bench-pole" />
          <rect x={pulled ? 118 : 190} y={93} width={70} height={14} rx={7} className="bench-obj" />
          {pulled ? null : <path d="M 150 100 h 24" className="bench-gapline" />}
          <text x={160} y={146} textAnchor="middle" className="bench-text">{pulled ? 'Click! It is pulled to the magnet.' : 'Nothing happens.'}</text>
        </g>
      ) : (
        <g>
          <rect x={110} y={70} width={80} height={18} rx={9} className={`bench-obj${test === 'shine' && m.shiny ? ' shiny' : ''}`} />
          {test === 'shine' && m.shiny ? <path d="M 200 64 l 8 -8 M 206 76 h 10 M 100 64 l -8 -8" className="bench-rays" /> : null}
          <text x={150} y={120} textAnchor="middle" className="bench-text">{cap(bare(m.name))}</text>
        </g>
      )}
    </svg>
  );
}

export function MaterialBench() {
  const [mi, setMi] = useState(0);
  const [done, setDone] = useState<Record<string, Test[]>>({});
  const [test, setTest] = useState<Test | null>(null);
  const [guess, setGuess] = useState<Record<string, boolean>>({});
  const m = MATERIALS_TEST[mi]!;
  const tested = done[m.name] ?? [];
  const run = (t: Test) => (setTest(t), setDone({ ...done, [m.name]: tested.includes(t) ? tested : [...tested, t] }));
  const allDone = tested.length === 3;
  const g = guess[m.name];
  const rows = MATERIALS_TEST.filter((x) => (done[x.name] ?? []).length > 0);
  return (
    <div className="bench">
      <label className="field compact">
        <span>Object</span>
        <select value={mi} onChange={(e) => (setMi(Number(e.target.value)), setTest(null))}>
          {MATERIALS_TEST.map((x, i) => (
            <option key={x.name} value={i}>
              {cap(bare(x.name))}
            </option>
          ))}
        </select>
      </label>
      <div className="widget-buttons wrap">
        {TESTS.map((t) => (
          <Button key={t.id} size="sm" variant={test === t.id ? 'primary' : 'secondary'} onClick={() => run(t.id)}>
            {t.label}
          </Button>
        ))}
      </div>
      <BenchPicture m={m} test={test} />
      {allDone ? (
        <div className="bench-guess">
          <span>All three tests done. Is {bare(m.name)} made of a metal?</span>
          <span className="widget-buttons">
            <Button size="sm" variant={g === true ? 'primary' : 'secondary'} onClick={() => setGuess({ ...guess, [m.name]: true })}>
              Metal
            </Button>
            <Button size="sm" variant={g === false ? 'primary' : 'secondary'} onClick={() => setGuess({ ...guess, [m.name]: false })}>
              Non-metal
            </Button>
          </span>
        </div>
      ) : null}
      {g !== undefined ? (
        <Note ok={g === m.metal}>
          <p>
            {g === m.metal ? 'Right: ' : 'Not quite: '}
            {m.metal
              ? `${bare(m.name)} is a metal. It is shiny and conducts electricity${m.magnetic ? ', and because it contains iron it is magnetic too' : ', but like most metals it is not magnetic'}.`
              : m.conducts
                ? 'graphite conducts electricity, but it is a non-metal (a form of carbon). It is dull and crumbly, not shiny and bendy.'
                : m.shiny
                  ? 'glass is shiny, but it doesn\'t conduct electricity. It is a non-metal.'
                  : `${bare(m.name)} is dull and doesn't conduct electricity: a non-metal.`}
          </p>
        </Note>
      ) : null}
      {rows.length ? (
        <table className="tally bench-table">
          <caption className="sr-only">Test results</caption>
          <thead>
            <tr>
              <th scope="col">Object</th>
              <th scope="col">Shiny</th>
              <th scope="col">Magnetic</th>
              <th scope="col">Conducts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.name}>
                <th scope="row">{cap(bare(x.name))}</th>
                {(['shine', 'magnet', 'circuit'] as Test[]).map((t) => (
                  <td key={t}>{(done[x.name] ?? []).includes(t) ? (testResult(x, t) ? 'Yes' : 'No') : '·'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Separation station.
type Tool = 'Sieving' | 'Filtering' | 'Using a magnet' | 'Evaporating the water' | 'Pouring off the top layer (decanting)';
const TOOLS: { id: Tool; short: string }[] = [
  { id: 'Sieving', short: 'Sieve' },
  { id: 'Filtering', short: 'Filter funnel' },
  { id: 'Using a magnet', short: 'Magnet' },
  { id: 'Evaporating the water', short: 'Heat to evaporate' },
  { id: 'Pouring off the top layer (decanting)', short: 'Pour off the top' },
];
function whyNot(mix: string, tool: Tool): string {
  const dissolved = /dissolved/.test(mix);
  const liquidMix = /water/.test(mix);
  switch (tool) {
    case 'Sieving':
      return dissolved ? 'Dissolved particles are far too small: everything runs through the sieve.' : liquidMix ? 'The holes in a sieve are much too big to hold back fine sand or mud from water.' : 'Both things are about the same size, so they fall through the holes together.';
    case 'Filtering':
      return dissolved ? 'Dissolved particles are tiny enough to pass straight through filter paper.' : /oil/.test(mix) ? 'Oil and water are both liquids: both run through the paper.' : 'Filtering separates a solid from a liquid. Here there is no liquid.';
    case 'Using a magnet':
      return 'Nothing in this mixture is magnetic. Only iron, steel, nickel and cobalt are pulled by a magnet.';
    case 'Evaporating the water':
      return /oil/.test(mix) ? 'Heating would boil the water away and leave hot oil: dangerous, and you lose the water.' : liquidMix ? 'It would leave the solid behind, but you lose all the water. A gentler method keeps both.' : 'There is no water to evaporate.';
    default:
      return liquidMix || /oil/.test(mix) ? 'Pouring carefully helps, but it won\'t separate this mixture properly.' : 'Pouring a dry mixture just pours both parts together.';
  }
}

export function SeparationLab() {
  const [mi, setMi] = useState(0);
  const [tool, setTool] = useState<Tool | null>(null);
  const s = SEPARATE[mi]!;
  const ok = tool === s.method;
  return (
    <div className="sep">
      <label className="field compact">
        <span>Mixture</span>
        <select value={mi} onChange={(e) => (setMi(Number(e.target.value)), setTool(null))}>
          {SEPARATE.map((x, i) => (
            <option key={x.mix} value={i}>
              {cap(x.mix)}
            </option>
          ))}
        </select>
      </label>
      <p className="widget-readout">Which tool will separate {s.mix}?</p>
      <ul className="sep-tools">
        {TOOLS.map((t) => (
          <li key={t.id}>
            <button type="button" className={`sep-tool${tool === t.id ? (ok ? ' ok' : ' off') : ''}`} aria-pressed={tool === t.id} onClick={() => setTool(t.id)}>
              <ToolIcon tool={t.id} />
              <span>{t.short}</span>
            </button>
          </li>
        ))}
      </ul>
      {tool ? (
        <Note ok={ok}>
          <p>{ok ? <><strong>It works.</strong> {s.why}</> : <><strong>That won't work well.</strong> {whyNot(s.mix, tool)}</>}</p>
        </Note>
      ) : null}
    </div>
  );
}

function ToolIcon({ tool }: { tool: Tool }) {
  return (
    <svg viewBox="0 0 48 48" width={40} height={40} className="illo" aria-hidden="true">
      {tool === 'Sieving' ? (
        <>
          <ellipse cx={22} cy={22} rx={16} ry={6} className="illo-fill" />
          <path d="M 6 22 Q 22 42 38 22" className="illo-fill" />
          <path d="M 14 26 l 2 2 M 22 28 l 0 3 M 30 26 l -2 2" className="illo-line" />
          <path d="M 38 21 L 46 17" className="illo-line" />
        </>
      ) : tool === 'Filtering' ? (
        <>
          <path d="M 8 8 H 40 L 27 26 V 38 H 21 V 26 Z" className="illo-fill" />
          <path d="M 12 12 H 36 L 26 24 H 22 Z" className="illo-accent" />
          <path d="M 24 40 v 4" className="illo-accent-line" />
        </>
      ) : tool === 'Using a magnet' ? (
        <>
          <path d="M 10 8 H 20 V 28 a 4 4 0 0 0 8 0 V 8 H 38 V 28 a 14 14 0 0 1 -28 0 Z" className="illo-fill" />
          <rect x={10} y={8} width={10} height={7} className="illo-accent" />
          <rect x={28} y={8} width={10} height={7} className="illo-accent" />
        </>
      ) : tool === 'Evaporating the water' ? (
        <>
          <path d="M 10 18 H 38 L 34 30 H 14 Z" className="illo-fill" />
          <path d="M 20 44 q -4 -6 4 -12 q 0 6 4 8 q 2 -3 0 -6 q 6 4 2 10 Z" className="illo-accent" />
          <path d="M 18 12 q 2 -3 0 -6 M 26 12 q 2 -3 0 -6 M 34 12 q 2 -3 0 -6" className="illo-line" />
        </>
      ) : (
        <>
          <path d="M 8 14 H 30 V 38 H 8 Z" className="illo-fill" transform="rotate(-25 19 26)" />
          <path d="M 30 18 q 8 6 8 22" className="illo-accent-line" />
        </>
      )}
    </svg>
  );
}
