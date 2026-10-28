/**
 * Touch-first answer inputs for Grades 1–3. Big targets (≥ 64px), tap-to-place rather than drag (easier for
 * small hands and works with a keyboard), and every tile that names a picture is spoken when tapped.
 * After answering, `reveal` shows the right answer in place: never only "wrong".
 */
import { useState } from 'react';
import type { InputSpec, Tile } from '../../../shared/questions/types.ts';
import type { ResponseValue } from '../../../shared/questions/answer.ts';
import { Glyph, MoneyGlyph } from './Glyph.tsx';
import { TenFrame, Base10, ClockFace } from './Scene.tsx';
import { Icon } from '../../ui/Icon.tsx';

export interface Reveal {
  correct: ResponseValue;
  wrongIds: string[];
  isCorrect: boolean;
}

interface Props {
  input: InputSpec;
  value: ResponseValue | null;
  onChange: (v: ResponseValue | null) => void;
  locked: boolean;
  reveal: Reveal | null;
  say: (text: string) => void;
}

export function JuniorInput(p: Props) {
  switch (p.input.kind) {
    case 'choice':
      return <Choice {...p} input={p.input} />;
    case 'pad':
      return <Pad {...p} input={p.input} />;
    case 'build':
      return <Build {...p} input={p.input} />;
    case 'pick':
      return <Pick {...p} input={p.input} />;
    case 'order':
      return <Order {...p} input={p.input} />;
    case 'sort':
      return <Sort {...p} input={p.input} />;
    case 'clock':
      return <ClockInput {...p} input={p.input} />;
    case 'spell':
      return <Spell {...p} input={p.input} />;
    case 'numberline':
      return <NumberLine {...p} input={p.input} />;
    default:
      return <p className="note">This question type is for older learners.</p>;
  }
}

/** Is there enough of an answer to check? */
export function canCheck(input: InputSpec, v: ResponseValue | null): boolean {
  if (v === null) return false;
  if (input.kind === 'sort') return Array.isArray(v) && v.length === input.items.length;
  if (input.kind === 'order') return Array.isArray(v) && v.length === input.items.length;
  if (input.kind === 'spell') return typeof v === 'string' && v.length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return v !== '';
}

const asList = (v: ResponseValue | null): string[] => (Array.isArray(v) ? v : v ? [v] : []);

function TileFace({ t, size = 64 }: { t: { text?: string; icon?: string; say?: string }; size?: number }) {
  return (
    <>
      {t.icon ? <Glyph token={t.icon} size={size} {...(t.text ? {} : t.say ? { label: t.say } : {})} /> : null}
      {t.text ? <span className="tile-text">{t.text}</span> : null}
    </>
  );
}

// ---------------------------------------------------------------------------
function Choice({ input, value, onChange, locked, reveal, say }: Props & { input: Extract<InputSpec, { kind: 'choice' }> }) {
  const big = input.options.every((o) => o.icon);
  const textOnly = input.options.every((o) => !o.icon);
  const long = textOnly && input.options.some((o) => o.text.length > 14);
  const short = textOnly && input.options.every((o) => o.text.length <= 3);
  const wide = !long && !short && input.options.some((o) => o.text.length > 8);
  return (
    <div className={`j-choice${big ? ' pics' : ''}${long ? ' long' : ''}${short ? ' short' : ''}${wide ? ' wide' : ''}`} role="radiogroup" aria-label="Answers">
      {input.options.map((o) => {
        const chosen = value === o.id;
        const right = reveal && reveal.correct === o.id;
        const wrong = reveal && chosen && !right;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={chosen}
            disabled={locked}
            className={`tile${chosen ? ' chosen' : ''}${right ? ' right' : ''}${wrong ? ' wrong' : ''}`}
            onClick={() => {
              onChange(o.id);
              if (o.say) say(o.say);
            }}
          >
            <TileFace t={o} size={big ? 72 : 56} />
            {right ? <Mark ok /> : wrong ? <Mark /> : null}
          </button>
        );
      })}
    </div>
  );
}

function Mark({ ok = false }: { ok?: boolean }) {
  return (
    <span className={`tile-mark ${ok ? 'ok' : 'no'}`} aria-label={ok ? 'right answer' : 'not this one'}>
      <Icon name={ok ? 'check' : 'cross'} size={18} />
    </span>
  );
}

// ---------------------------------------------------------------------------
function Pad({ input, value, onChange, locked, reveal }: Props & { input: Extract<InputSpec, { kind: 'pad' }> }) {
  const v = typeof value === 'string' ? value : '';
  const maxLen = String(input.max).length;
  const press = (d: string) => {
    if (locked) return;
    if (d === 'del') onChange(v.slice(0, -1) || null);
    else if (v.length < maxLen) onChange(v === '0' ? d : v + d);
  };
  return (
    <div className="j-pad">
      <output className={`pad-display${reveal ? (reveal.isCorrect ? ' right' : ' wrong') : ''}`} aria-live="polite" aria-label="Your answer">
        {input.prefix ? <span className="pad-affix">{input.prefix}</span> : null}
        <span className="pad-value">{v ? Number(v).toLocaleString('en-ZA').replace(/,/g, ' ') : <span className="pad-empty">?</span>}</span>
        {input.unit ? <span className="pad-affix">{input.unit}</span> : null}
      </output>
      <div className="pad-keys" role="group" aria-label="Number keys">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" className="key" onClick={() => press(d)} disabled={locked}>
            {d}
          </button>
        ))}
        <span />
        <button type="button" className="key" onClick={() => press('0')} disabled={locked}>
          0
        </button>
        <button type="button" className="key key-del" onClick={() => press('del')} disabled={locked || !v} aria-label="Delete">
          <Icon name="undo" size={26} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
const COIN_SET = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];

function Build({ input, value, onChange, locked }: Props & { input: Extract<InputSpec, { kind: 'build' }> }) {
  const n = typeof value === 'string' && value ? Number(value) : 0;
  const [purse, setPurse] = useState<number[]>([]);
  const set = (x: number) => !locked && onChange(x > 0 ? String(Math.min(input.max, x)) : null);
  if (input.tool === 'counters' || input.tool === 'tenframe') {
    const frames = input.tool === 'counters' ? 1 : 2;
    return (
      <div className="j-build">
        <div className="build-frames">
          {Array.from({ length: frames }, (_, f) => (
            <TenFrame key={f} filled={Math.max(0, Math.min(10, n - f * 10))} onTap={(i) => set(f * 10 + i + 1 === n ? f * 10 + i : f * 10 + i + 1)} label={`Frame ${f + 1}`} />
          ))}
        </div>
        <div className="build-actions">
          <button type="button" className="btn btn-secondary" onClick={() => set(n - 1)} disabled={locked || n === 0}>
            Take one away
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => set(n + 1)} disabled={locked || n >= frames * 10}>
            Add one
          </button>
        </div>
        <p className="sr-only" aria-live="polite">
          {n} counters
        </p>
      </div>
    );
  }
  if (input.tool === 'base10') {
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;
    const cols: { label: string; val: number; count: number; max: number }[] = [
      ...(input.max >= 100 ? [{ label: 'Hundreds', val: 100, count: h, max: 9 }] : []),
      { label: 'Tens', val: 10, count: t, max: input.max >= 100 ? 9 : Math.floor(input.max / 10) },
      { label: 'Ones', val: 1, count: o, max: 9 },
    ];
    return (
      <div className="j-build">
        <div className="b10-builder">
          {cols.map((c) => (
            <div key={c.label} className="b10-col">
              <p className="b10-col-label">{c.label}</p>
              <div className="b10-col-area">
                <Base10 hundreds={c.val === 100 ? c.count : 0} tens={c.val === 10 ? c.count : 0} ones={c.val === 1 ? c.count : 0} compact />
              </div>
              <div className="b10-col-btns">
                <button type="button" className="key key-sm" aria-label={`One less ${c.label.toLowerCase().replace(/s$/, '')}`} disabled={locked || c.count === 0} onClick={() => set(n - c.val)}>
                  −
                </button>
                <span className="b10-count" aria-live="polite">
                  {c.count}
                </span>
                <button type="button" className="key key-sm" aria-label={`One more ${c.label.toLowerCase().replace(/s$/, '')}`} disabled={locked || c.count >= c.max} onClick={() => set(n + c.val)}>
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  // coins: a purse you add to; tap a coin in the purse to take it out. The total is not shown: counting it is the task.
  const coins = (input.coins ?? COIN_SET).slice().sort((a, b) => a - b);
  const setP = (next: number[]) => {
    setPurse(next);
    const total = next.reduce((a, b) => a + b, 0);
    onChange(total ? String(total) : null);
  };
  return (
    <div className="j-build">
      <div className="purse" aria-label="Your money" aria-live="polite">
        {purse.length ? (
          purse.map((c, i) => (
            <button key={i} type="button" className="purse-item" disabled={locked} onClick={() => setP(purse.filter((_, j) => j !== i))} aria-label={`Take out ${c >= 100 ? `R${c / 100}` : `${c}c`}`}>
              <MoneyGlyph cents={c} size={c >= 1000 ? 46 : 54} />
            </button>
          ))
        ) : (
          <span className="purse-empty">Tap money below to put it here.</span>
        )}
      </div>
      <div className="coin-bank" role="group" aria-label="Coins and notes">
        {coins.map((c) => (
          <button key={c} type="button" className="coin-btn" disabled={locked || purse.length >= 12} onClick={() => setP([...purse, c])} aria-label={`Add ${c >= 100 ? `R${c / 100}` : `${c}c`}`}>
            <MoneyGlyph cents={c} size={c >= 1000 ? 50 : 60} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function Pick({ input, value, onChange, locked, reveal, say }: Props & { input: Extract<InputSpec, { kind: 'pick' }> }) {
  const chosen = asList(value);
  const correct = reveal ? asList(reveal.correct) : [];
  return (
    <div className="j-pick" role="group" aria-label="Tap all that fit">
      {input.options.map((t) => {
        const on = chosen.includes(t.id);
        const right = reveal && correct.includes(t.id);
        const wrong = reveal && on && !right;
        const missed = reveal && !on && right;
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={on}
            disabled={locked}
            className={`tile${on ? ' chosen' : ''}${right && on ? ' right' : ''}${wrong ? ' wrong' : ''}${missed ? ' missed' : ''}`}
            onClick={() => {
              const next = on ? chosen.filter((x) => x !== t.id) : [...chosen, t.id];
              onChange(next.length ? next : null);
              if (!on && t.say) say(t.say);
            }}
          >
            <TileFace t={t} size={t.text ? 52 : 84} />
            {on ? <span className="tile-tick" aria-hidden>✓</span> : null}
            {missed ? <Mark ok /> : wrong ? <Mark /> : null}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
function Order({ input, value, onChange, locked, reveal, say }: Props & { input: Extract<InputSpec, { kind: 'order' }> }) {
  const seq = asList(value);
  const byId = new Map(input.items.map((t) => [t.id, t]));
  const correct = reveal ? asList(reveal.correct) : [];
  const words = input.items.every((t) => !t.icon && (t.text ?? '').split(' ').length === 1);
  return (
    <div className={`j-order${words ? ' words' : ''}`}>
      <ol className="order-slots" aria-label="Your order">
        {input.items.map((_, i) => {
          const id = seq[i];
          const t = id ? byId.get(id) : undefined;
          const bad = reveal && id && correct[i] !== id;
          return (
            <li key={i} className={`slot${t ? ' filled' : ''}${bad ? ' wrong' : reveal && t ? ' right' : ''}`}>
              <span className="slot-n" aria-hidden>
                {i + 1}
              </span>
              {t ? (
                <button type="button" className="slot-tile" disabled={locked} onClick={() => onChange(seq.length > 1 ? seq.slice(0, i) : null)} aria-label={`${t.text ?? t.say ?? ''}, tap to take back`}>
                  <TileFace t={t} size={44} />
                </button>
              ) : (
                <span className="slot-empty" aria-label="empty" />
              )}
            </li>
          );
        })}
      </ol>
      <div className="order-bank" role="group" aria-label="Tap them in order">
        {input.items
          .filter((t) => !seq.includes(t.id))
          .map((t) => (
            <button
              key={t.id}
              type="button"
              className="tile"
              disabled={locked}
              onClick={() => {
                onChange([...seq, t.id]);
                if (t.say) say(t.say);
              }}
            >
              <TileFace t={t} size={48} />
            </button>
          ))}
      </div>
      {reveal && !reveal.isCorrect ? (
        <ol className="order-answer" aria-label="The right order">
          {correct.map((id) => (
            <li key={id}>
              <TileFace t={byId.get(id) ?? { text: id }} size={32} />
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
function Sort({ input, value, onChange, locked, reveal, say }: Props & { input: Extract<InputSpec, { kind: 'sort' }> }) {
  const pairs = new Map(asList(value).map((p) => p.split('=') as [string, string]));
  const [held, setHeld] = useState<string | null>(null);
  const emit = (m: Map<string, string>) => onChange(m.size ? [...m].map(([k, v]) => `${k}=${v}`) : null);
  const correct = new Map(reveal ? asList(reveal.correct).map((p) => p.split('=') as [string, string]) : []);
  const place = (bin: string) => {
    if (!held || locked) return;
    const m = new Map(pairs);
    m.set(held, bin);
    setHeld(null);
    emit(m);
  };
  const tileBtn = (t: Tile, inBin: boolean) => {
    const wrong = reveal && pairs.get(t.id) !== correct.get(t.id);
    return (
      <button
        key={t.id}
        type="button"
        className={`tile tile-sm${held === t.id ? ' held' : ''}${reveal ? (wrong ? ' wrong' : ' right') : ''}`}
        disabled={locked}
        aria-pressed={held === t.id}
        onClick={() => {
          if (inBin) {
            const m = new Map(pairs);
            m.delete(t.id);
            emit(m);
          }
          setHeld(held === t.id ? null : t.id);
          if (t.say && held !== t.id) say(t.say);
        }}
      >
        <TileFace t={t} size={40} />
      </button>
    );
  };
  const loose = input.items.filter((t) => !pairs.has(t.id));
  return (
    <div className="j-sort">
      <div className="sort-bank" role="group" aria-label="Pictures to sort">
        {loose.length ? loose.map((t) => tileBtn(t, false)) : <span className="sort-done">All sorted.</span>}
      </div>
      <p className="sort-help" aria-live="polite">
        {held ? 'Now tap a box.' : loose.length ? 'Tap a picture, then tap its box.' : ''}
      </p>
      <div className="sort-bins" style={{ gridTemplateColumns: `repeat(${input.bins.length}, minmax(0, 1fr))` }}>
        {input.bins.map((b) => (
          <div key={b.id} className={`bin${held ? ' ready' : ''}`}>
            <button type="button" className="bin-head" onClick={() => (held ? place(b.id) : b.say && say(b.say))} disabled={locked} aria-label={`${held ? 'Put it in: ' : ''}${b.text ?? b.say ?? ''}`}>
              {b.icon ? <Glyph token={b.icon} size={34} /> : null}
              <span>{b.text}</span>
            </button>
            <div className="bin-items">{input.items.filter((t) => pairs.get(t.id) === b.id).map((t) => tileBtn(t, true))}</div>
            {reveal && !reveal.isCorrect ? (
              <p className="bin-should">
                {input.items
                  .filter((t) => correct.get(t.id) === b.id && pairs.get(t.id) !== b.id)
                  .map((t) => t.text)
                  .join(', ') ? `Also belongs here: ${input.items
                  .filter((t) => correct.get(t.id) === b.id && pairs.get(t.id) !== b.id)
                  .map((t) => t.text)
                  .join(', ')}` : null}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function ClockInput({ input, value, onChange, locked }: Props & { input: Extract<InputSpec, { kind: 'clock' }> }) {
  const [hand, setHand] = useState<'hour' | 'minute'>(input.step === 60 ? 'hour' : 'minute');
  const v = typeof value === 'string' && value ? Number(value) : 0;
  const hour = Math.floor(v / 60);
  const min = v % 60;
  const pick = (n: number) => {
    if (locked) return;
    if (hand === 'hour') onChange(String((n % 12) * 60 + min));
    else {
      const m = (n % 12) * 5;
      if (m % input.step !== 0) return;
      onChange(String(hour * 60 + m));
    }
  };
  return (
    <div className="j-clock">
      <div className="clock-hands" role="radiogroup" aria-label="Which hand to move">
        {input.step !== 60 ? (
          <button type="button" role="radio" aria-checked={hand === 'minute'} className={`hand-btn${hand === 'minute' ? ' on' : ''}`} onClick={() => setHand('minute')}>
            Long hand: minutes
          </button>
        ) : null}
        <button type="button" role="radio" aria-checked={hand === 'hour'} className={`hand-btn${hand === 'hour' ? ' on' : ''}`} onClick={() => setHand('hour')}>
          Short hand: hour
        </button>
      </div>
      <ClockFace minutes={v} size={260} onPick={pick} active={hand} />
      <p className="clock-help">Tap a number to point the {hand === 'hour' ? 'short' : 'long'} hand at it.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
function Spell({ input, value, onChange, locked, reveal }: Props & { input: Extract<InputSpec, { kind: 'spell' }> }) {
  const [used, setUsed] = useState<number[]>([]);
  const word = used.map((i) => input.tiles[i]).join('');
  const update = (u: number[]) => {
    setUsed(u);
    onChange(u.length ? u.map((i) => input.tiles[i]).join('') : null);
  };
  void value;
  return (
    <div className="j-spell">
      <div className={`spell-slots${reveal ? (reveal.isCorrect ? ' right' : ' wrong') : ''}`} aria-label={`Your word: ${word || 'empty'}`} aria-live="polite">
        {Array.from({ length: Math.max(input.length, used.length) }, (_, i) => {
          const ti = used[i];
          return ti !== undefined ? (
            <button key={i} type="button" className="spell-slot filled" disabled={locked} onClick={() => update(used.slice(0, i))} aria-label={`${input.tiles[ti]}, tap to take back`}>
              {input.tiles[ti]}
            </button>
          ) : (
            <span key={i} className="spell-slot" aria-hidden />
          );
        })}
      </div>
      <div className="spell-bank" role="group" aria-label="Letters">
        {input.tiles.map((t, i) => (
          <button key={i} type="button" className="tile letter" disabled={locked || used.includes(i)} onClick={() => update([...used, i])}>
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function NumberLine({ input, value, onChange, locked }: Props & { input: Extract<InputSpec, { kind: 'numberline' }> }) {
  const v = typeof value === 'string' && value ? Number(value) : null;
  const ticks: number[] = [];
  for (let x = input.min; x <= input.max; x += input.step) ticks.push(x);
  return (
    <div className="j-line" role="radiogroup" aria-label="Number line">
      {ticks.map((t) => (
        <button key={t} type="button" role="radio" aria-checked={v === t} className={`nl-tick${v === t ? ' on' : ''}`} disabled={locked} onClick={() => onChange(String(t))}>
          <span className="nl-mark" aria-hidden />
          <span className="nl-label">{(t - input.min) % input.labelEvery === 0 ? t : ''}</span>
        </button>
      ))}
    </div>
  );
}
