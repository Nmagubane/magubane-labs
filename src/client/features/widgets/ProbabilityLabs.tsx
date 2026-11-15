/**
 * Probability labs (Grades 10–12):
 * - dice: roll two dice many times and watch the relative frequency settle near the theoretical probability;
 * - venn: change n(A), n(B) and the overlap; the addition rule and the independence test update together;
 * - slots: the counting principle as boxes, one per position, each holding its number of choices.
 */
import { useState } from 'react';
import { Plot } from '../../ui/Plot.tsx';
import { Tex, Rich } from '../../ui/RichText.tsx';
import { Figure } from '../../ui/Figure.tsx';
import { Slider } from './MathWidgets.tsx';
import { Note } from './NstLabs.tsx';

const dec = (v: number, dp = 3) => (Math.round(v * 10 ** dp) / 10 ** dp).toString().replace('.', '{,}');
const plain = (v: number, dp = 3) => (Math.round(v * 10 ** dp) / 10 ** dp).toString().replace('.', ',');

const EVENTS = [
  { id: 'seven', name: 'The sum is 7', hit: (a: number, b: number) => a + b === 7 },
  { id: 'double', name: 'A double', hit: (a: number, b: number) => a === b },
  { id: 'ten', name: 'The sum is 10 or more', hit: (a: number, b: number) => a + b >= 10 },
  { id: 'six', name: 'At least one 6', hit: (a: number, b: number) => a === 6 || b === 6 },
] as const;

function DiceMode() {
  const [ev, setEv] = useState<(typeof EVENTS)[number]['id']>('seven');
  const [trials, setTrials] = useState(0);
  const [hits, setHits] = useState(0);
  const [trace, setTrace] = useState<[number, number][]>([]);
  const [last, setLast] = useState<[number, number] | null>(null);
  const event = EVENTS.find((e) => e.id === ev)!;
  let fav = 0;
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (event.hit(a, b)) fav++;
  const theory = fav / 36;
  const roll = (k: number) => {
    let t = trials;
    let h = hits;
    const add: [number, number][] = [];
    let pair: [number, number] = [1, 1];
    for (let i = 0; i < k; i++) {
      pair = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
      t++;
      if (event.hit(pair[0], pair[1])) h++;
      if (t <= 50 || t % Math.ceil(t / 200) === 0) add.push([t, h / t]);
    }
    setTrials(t);
    setHits(h);
    setLast(pair);
    setTrace((old) => [...old, ...add]);
  };
  const reset = (id = ev) => {
    setEv(id);
    setTrials(0);
    setHits(0);
    setTrace([]);
    setLast(null);
  };
  const xMax = Math.max(50, trials);
  return (
    <>
      <div className="widget-readout ag-readout" aria-live="polite">
        <Tex tex={`\\text{Theory: } \\frac{${fav}}{36} = ${dec(theory)}`} />
        <Tex tex={trials ? `\\text{Relative frequency: } \\frac{${hits}}{${trials}} = ${dec(hits / trials)}` : '\\text{Relative frequency: roll the dice}'} />
        {last ? <Tex tex={`\\text{Last roll: } (${last[0]};\\, ${last[1]})`} /> : null}
      </div>
      <Plot xRange={[0, xMax]} yRange={[0, 1]} width={400} height={240} label={`Relative frequency after ${trials} rolls is ${trials ? plain(hits / trials) : 'not yet known'}; the theoretical probability is ${plain(theory)}.`}>
        {(s) => (
          <>
            <line x1={s.x(0)} x2={s.x(xMax)} y1={s.y(theory)} y2={s.y(theory)} className="plot-segment dashed" />
            {trace.length > 1 ? <polyline points={trace.map(([x, y]) => `${s.x(x)},${s.y(y)}`).join(' ')} className="plot-curve plot-line pen" /> : null}
          </>
        )}
      </Plot>
      <div className="widget-controls">
        <label className="field compact">
          <span>Event</span>
          <select value={ev} onChange={(e) => reset(e.target.value as typeof ev)}>
            {EVENTS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <div className="lab-buttons" role="group" aria-label="Roll the dice">
          <button type="button" className="btn btn-secondary" onClick={() => roll(1)}>
            Roll once
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => roll(10)}>
            Roll 10
          </button>
          <button type="button" className="btn btn-primary" onClick={() => roll(100)}>
            Roll 100
          </button>
          <button type="button" className="btn btn-quiet" onClick={() => reset()}>
            Start again
          </button>
        </div>
      </div>
      <Note ok={trials >= 500 ? true : null}>
        <Rich
          as="p"
          text={
            trials >= 500
              ? `After ${trials} rolls the relative frequency is $${dec(hits / trials)}$, close to the theoretical $${dec(theory)}$. More trials, closer agreement.`
              : 'A few rolls can land far from the dashed line (the theoretical probability). Keep rolling and watch the blue line settle.'
          }
        />
      </Note>
    </>
  );
}

function VennMode() {
  const [n, setN] = useState(40);
  const [a, setA] = useState(20);
  const [b, setB] = useState(10);
  const [both, setBoth] = useState(5);
  // Keep the numbers possible: the overlap fits inside both sets, and everything fits inside S.
  const ab = Math.min(both, a, b);
  const N = Math.max(n, a + b - ab);
  const out = N - (a + b - ab);
  const independent = ab * N === a * b;
  return (
    <>
      <Figure figure={{ kind: 'venn', alt: `Venn diagram: ${a - ab} only A, ${ab} both, ${b - ab} only B, ${out} neither, ${N} in total.`, sets: ['A', 'B'], universe: `S\\ (${N})`, regions: { '0': `${a - ab}`, '1': `${b - ab}`, '01': `${ab}`, '': `${out}` } }} />
      <div className="widget-readout ag-readout" aria-live="polite">
        <Tex tex={`P(A \\text{ or } B) = \\frac{${a} + ${b} - ${ab}}{${N}} = \\frac{${a + b - ab}}{${N}}`} />
        <Tex tex={`P(A) \\times P(B) = ${dec((a * b) / (N * N))}`} />
        <Tex tex={`P(A \\text{ and } B) = ${dec(ab / N)}`} />
      </div>
      <div className="widget-controls">
        <Slider label="n(S)" tex="n(S)" value={N} min={20} max={60} onChange={(v) => setN(Math.max(v, a + b - ab))} />
        <Slider label="n(A)" tex="n(A)" value={a} min={1} max={N} onChange={(v) => setA(Math.min(v, N - b + ab))} />
        <Slider label="n(B)" tex="n(B)" value={b} min={1} max={N} onChange={(v) => setB(Math.min(v, N - a + ab))} />
        <Slider label="n(A and B)" tex={'n(A \\text{ and } B)'} value={both} min={0} max={Math.min(a, b)} onChange={setBoth} />
      </div>
      <Note ok={independent ? true : null}>
        <Rich
          as="p"
          text={
            independent
              ? `$P(A \\text{ and } B) = P(A) \\times P(B)$: right now $A$ and $B$ are **independent**. Knowing that $A$ happened doesn't change the chance of $B$.`
              : ab === 0
                ? 'No overlap: $A$ and $B$ are **mutually exclusive**, so $P(A \\text{ or } B) = P(A) + P(B)$. They are not independent: if $A$ happens, $B$ can\'t.'
                : 'The overlap is counted in both $n(A)$ and $n(B)$, which is why the addition rule subtracts it once. Try $n(S) = 40$, $n(A) = 20$, $n(B) = 10$: which overlap makes them independent?'
          }
        />
      </Note>
    </>
  );
}

function SlotsMode() {
  const [n, setN] = useState(5);
  const [r, setR] = useState(3);
  const [rep, setRep] = useState(false);
  const pos = Math.min(r, rep ? 8 : n);
  const choices = Array.from({ length: pos }, (_, i) => (rep ? n : n - i));
  const total = choices.reduce((p, c) => p * c, 1);
  return (
    <>
      <div className="cslots" aria-live="polite">
        {choices.map((c, i) => (
          <span key={i} className="cslot">
            <span className="cslot-n">{c}</span>
            <span className="cslot-label">place {i + 1}</span>
          </span>
        ))}
      </div>
      <div className="widget-readout ag-readout">
        <Tex tex={`${choices.join(' \\times ')} = ${total.toLocaleString('en-ZA').replace(/\s|,/g, '\\ ')}${!rep && pos === n ? ` = ${n}!` : ''}`} />
      </div>
      <div className="widget-controls">
        <Slider label="Items to choose from" value={n} min={2} max={9} onChange={(v) => setN(v)} />
        <Slider label="Places to fill" value={r} min={1} max={rep ? 8 : n} onChange={setR} />
        <label className="toggle">
          <input type="checkbox" checked={rep} onChange={(e) => setRep(e.target.checked)} /> Repetition allowed
        </label>
      </div>
      <Note ok={null}>
        <Rich as="p" text={rep ? 'With repetition, every place has all the choices again: $n \\times n \\times \\dots$' : 'Without repetition, each place has one choice fewer than the place before. Fill every place and you get $n!$.'} />
      </Note>
    </>
  );
}

export function ProbabilityLab({ mode }: { mode: 'dice' | 'venn' | 'slots' }) {
  return mode === 'dice' ? <DiceMode /> : mode === 'venn' ? <VennMode /> : <SlotsMode />;
}
