/** Draws a Junior question's scene on the work mat. Every scene comes from data; none of them contain the answer. */
import type { ReactElement } from 'react';
import type { Scene as SceneSpec } from '../../../shared/questions/types.ts';
import { Glyph, MoneyGlyph, FractionPicture } from './Glyph.tsx';

export function Scene({ scene }: { scene: SceneSpec }): ReactElement | null {
  switch (scene.kind) {
    case 'objects':
      return <Objects s={scene} />;
    case 'base10':
      return <Base10 hundreds={scene.hundreds} tens={scene.tens} ones={scene.ones} />;
    case 'coins':
      return (
        <div className="sc-coins" role="img" aria-label={`Money: ${scene.items.map((c) => (c >= 100 ? `R${c / 100}` : `${c}c`)).join(', ')}`}>
          {scene.items.map((c, i) => (
            <MoneyGlyph key={i} cents={c} size={c >= 1000 ? 64 : 72} />
          ))}
        </div>
      );
    case 'clockface':
      return <ClockFace minutes={scene.minutes} size={220} />;
    case 'track':
      return (
        <ol className="sc-track" aria-label="Number track">
          {scene.cells.map((c, i) => (
            <li key={i} className={c === null ? 'gap' : undefined} aria-label={c === null ? 'missing number' : String(c)}>
              {c === null ? '?' : c}
            </li>
          ))}
        </ol>
      );
    case 'iconrow':
      return (
        <div className="sc-iconrow">
          <span className="sc-start" aria-hidden>
            ▶
          </span>
          <ol aria-label="A row, starting at the arrow">
            {scene.items.map((it, i) => (
              <li key={i} className={it === null ? 'gap' : undefined}>
                {it === null ? <span aria-label="what comes next">?</span> : <Glyph token={it} size={58} />}
              </li>
            ))}
          </ol>
        </div>
      );
    case 'fraction':
      return <FractionPicture shape={scene.shape} parts={scene.parts} shaded={scene.shaded} equal={scene.equal} size={170} />;
    case 'picture':
      return (
        <figure className="sc-picture">
          <Glyph token={scene.icon} size={150} {...(scene.caption ? { label: scene.caption } : {})} />
          {scene.caption ? <figcaption>{scene.caption}</figcaption> : null}
        </figure>
      );
    case 'text':
      return (
        <div className={`sc-text sc-text-${scene.size}`}>
          {scene.title ? <p className="sc-text-title">{scene.title}</p> : null}
          <p lang="en">{scene.text}</p>
        </div>
      );
    case 'pictograph':
      return (
        <div className="sc-picto">
          <table>
            <tbody>
              {scene.rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  <td aria-label={`${r.count}`}>
                    {Array.from({ length: Math.round(r.count / scene.each) }, (_, i) => (
                      <span key={i} aria-hidden>
                        {r.icon}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {scene.each > 1 ? (
            <p className="sc-key">
              <span aria-hidden>{scene.rows[0]?.icon}</span> = {scene.each} children
            </p>
          ) : null}
        </div>
      );
    case 'tally':
      return (
        <table className="sc-tally">
          <tbody>
            {scene.rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                <td>
                  <Tally n={r.count} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    case 'bars':
      return <Bars bars={scene.bars} max={scene.max} step={scene.step} />;
    case 'compare':
      return <Compare s={scene} />;
    case 'grid':
      return (
        <div className="sc-grid" style={{ gridTemplateColumns: `repeat(${scene.cols}, 1fr)` }} role="img" aria-label="A grid of pictures">
          {Array.from({ length: scene.rows * scene.cols }, (_, i) => {
            const r = Math.floor(i / scene.cols);
            const c = i % scene.cols;
            const cell = scene.cells.find((x) => x.r === r && x.c === c);
            return <span key={i}>{cell ? <Glyph token={cell.icon} size={52} /> : null}</span>;
          })}
        </div>
      );
    case 'squares':
      return (
        <svg className="sc-squares" viewBox={`-4 -4 ${scene.cols * 40 + 8} ${scene.rows * 40 + 8}`} width={Math.min(320, scene.cols * 48)} role="img" aria-label="A shape made of squares">
          {scene.filled.map(([r, c]) => (
            <rect key={`${r}-${c}`} x={c * 40} y={r * 40} width={40} height={40} fill="var(--pen-tint)" stroke="var(--pen)" strokeWidth={2} />
          ))}
        </svg>
      );
    case 'ruler':
      return <Ruler icon={scene.icon} length={scene.lengthCm} max={scene.maxCm} unit={scene.unit} />;
    case 'shapes':
      return (
        <div className="sc-shapes">
          {scene.items.map((it, i) => (
            <figure key={i}>
              <Glyph token={`shape:${it.shape}`} size={130} />
              {it.label ? <figcaption>{it.label}</figcaption> : null}
            </figure>
          ))}
        </div>
      );
    case 'week':
      return (
        <ol className="sc-week" aria-label="Days of the week">
          {scene.days.map((d, i) => (
            <li key={d} className={scene.highlight === i ? 'on' : undefined} aria-current={scene.highlight === i ? 'date' : undefined}>
              {d.slice(0, 3)}
            </li>
          ))}
        </ol>
      );
  }
}

// ---------------------------------------------------------------------------
function Objects({ s }: { s: Extract<SceneSpec, { kind: 'objects' }> }) {
  const label = s.second ? `${s.count} and ${s.second.count}` : `${s.count} things${s.crossed ? `, ${s.crossed} crossed out` : ''}`;
  if (s.arrange === 'tenframes') {
    const frames = Math.ceil(s.count / 10) || 1;
    return (
      <div className="sc-frames" role="img" aria-label={`${label}, in ten-frames`}>
        {Array.from({ length: frames }, (_, f) => (
          <TenFrame key={f} filled={Math.min(10, s.count - f * 10)} icon={s.icon} />
        ))}
      </div>
    );
  }
  if (s.arrange === 'groups') {
    const size = s.groupSize ?? 1;
    const groups = Math.ceil(s.count / size);
    return (
      <div className="sc-groups" role="img" aria-label={`${groups} groups of ${size}`}>
        {Array.from({ length: groups }, (_, g) => (
          <span key={g} className="sc-group">
            {Array.from({ length: Math.min(size, s.count - g * size) }, (_, i) => (
              <span key={i} className="obj" aria-hidden>
                {s.icon}
              </span>
            ))}
          </span>
        ))}
      </div>
    );
  }
  const row = (icon: string, n: number, crossed = 0) => (
    <span className={`sc-row${s.arrange === 'scatter' ? ' scatter' : ''}`}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={`obj${i >= n - crossed ? ' crossed' : ''}`} style={s.arrange === 'scatter' ? { transform: `translate(${((i * 37) % 13) - 6}px, ${((i * 53) % 17) - 8}px) rotate(${((i * 29) % 21) - 10}deg)` } : undefined} aria-hidden>
          {icon}
        </span>
      ))}
    </span>
  );
  return (
    <div className={`sc-objects${s.second ? ' two' : ''}`} role="img" aria-label={label}>
      {row(s.icon, s.count, s.crossed ?? 0)}
      {s.second ? row(s.second.icon, s.second.count) : null}
    </div>
  );
}

export function TenFrame({ filled, icon, onTap, label }: { filled: number; icon?: string; onTap?: (i: number) => void; label?: string }) {
  return (
    <span className="tenframe" role={onTap ? 'group' : undefined} aria-label={label}>
      {Array.from({ length: 10 }, (_, i) =>
        onTap ? (
          <button key={i} type="button" className={`tf-cell${i < filled ? ' on' : ''}`} onClick={() => onTap(i)} aria-label={`space ${i + 1}${i < filled ? ', filled' : ''}`}>
            {i < filled ? <span className="counter" aria-hidden /> : null}
          </button>
        ) : (
          <span key={i} className={`tf-cell${i < filled ? ' on' : ''}`}>
            {i < filled ? icon && icon !== '●' ? <span aria-hidden>{icon}</span> : <span className="counter" aria-hidden /> : null}
          </span>
        ),
      )}
    </span>
  );
}

export function Base10({ hundreds, tens, ones, compact = false }: { hundreds: number; tens: number; ones: number; compact?: boolean }) {
  return (
    <div className={`base10${compact ? ' compact' : ''}`} role="img" aria-label={`${hundreds} hundreds, ${tens} tens and ${ones} ones`}>
      {hundreds ? (
        <span className="b10-group">
          {Array.from({ length: hundreds }, (_, i) => (
            <span key={i} className="b10-flat" aria-hidden />
          ))}
        </span>
      ) : null}
      {tens ? (
        <span className="b10-group">
          {Array.from({ length: tens }, (_, i) => (
            <span key={i} className="b10-rod" aria-hidden />
          ))}
        </span>
      ) : null}
      {ones ? (
        <span className="b10-group b10-ones">
          {Array.from({ length: ones }, (_, i) => (
            <span key={i} className="b10-cube" aria-hidden />
          ))}
        </span>
      ) : null}
    </div>
  );
}

function Tally({ n }: { n: number }) {
  const fives = Math.floor(n / 5);
  const rest = n % 5;
  return (
    <span className="tally" aria-label={`${n}`}>
      {Array.from({ length: fives }, (_, i) => (
        <svg key={i} width="44" height="36" viewBox="0 0 44 36" aria-hidden>
          {[6, 14, 22, 30].map((x) => (
            <line key={x} x1={x} y1="4" x2={x} y2="32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          ))}
          <line x1="2" y1="28" x2="36" y2="8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ))}
      {rest ? (
        <svg width={rest * 8 + 6} height="36" viewBox={`0 0 ${rest * 8 + 6} 36`} aria-hidden>
          {Array.from({ length: rest }, (_, i) => (
            <line key={i} x1={6 + i * 8} y1="4" x2={6 + i * 8} y2="32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          ))}
        </svg>
      ) : null}
    </span>
  );
}

function Bars({ bars, max, step }: { bars: { label: string; value: number }[]; max: number; step: number }) {
  const W = 300;
  const H = 200;
  const pad = { l: 28, b: 34, t: 8 };
  const bw = (W - pad.l) / bars.length;
  const y = (v: number) => H - pad.b - ((H - pad.b - pad.t) * v) / max;
  return (
    <svg className="sc-bars" viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 380 }} role="img" aria-label={`Bar graph: ${bars.map((b) => `${b.label} ${b.value}`).join(', ')}`}>
      {Array.from({ length: max / step + 1 }, (_, i) => i * step).map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W} y1={y(v)} y2={y(v)} stroke="var(--rule)" />
          <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--ink-2)">
            {v}
          </text>
        </g>
      ))}
      {bars.map((b, i) => (
        <g key={b.label}>
          <rect x={pad.l + i * bw + bw * 0.18} y={y(b.value)} width={bw * 0.64} height={H - pad.b - y(b.value)} fill="var(--pen)" />
          <text x={pad.l + i * bw + bw / 2} y={H - pad.b + 18} textAnchor="middle" fontSize="12" fill="var(--ink)">
            {b.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Compare({ s }: { s: Extract<SceneSpec, { kind: 'compare' }> }) {
  if (s.mode === 'mass') {
    const [a, b] = s.items as [(typeof s.items)[number], (typeof s.items)[number]];
    // The heavier side goes DOWN. Rotating by a negative angle lowers the left pan.
    const tilt = a.size > b.size ? -10 : a.size < b.size ? 10 : 0;
    return (
      <div className="sc-balance" role="img" aria-label={`A balance scale with a ${a.label} and a ${b.label}. The side with the ${a.size > b.size ? a.label : b.label} is lower.`}>
        <svg viewBox="0 0 300 190" width="100%" style={{ maxWidth: 360 }} aria-hidden>
          <path d="M150 60 L130 175 H170 Z" fill="var(--rule-strong)" />
          <g transform={`rotate(${tilt} 150 60)`}>
            <line x1="40" y1="60" x2="260" y2="60" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" />
            <line x1="60" y1="60" x2="60" y2="96" stroke="var(--ink-2)" strokeWidth="2" />
            <line x1="240" y1="60" x2="240" y2="96" stroke="var(--ink-2)" strokeWidth="2" />
            <g transform={`rotate(${-tilt} 60 100)`}>
              <path d="M24 100 H96 Q60 122 24 100Z" fill="var(--paper-2)" stroke="var(--ink-2)" strokeWidth="2" />
              <text x="60" y="94" textAnchor="middle" fontSize="44">
                {a.icon}
              </text>
            </g>
            <g transform={`rotate(${-tilt} 240 100)`}>
              <path d="M204 100 H276 Q240 122 204 100Z" fill="var(--paper-2)" stroke="var(--ink-2)" strokeWidth="2" />
              <text x="240" y="94" textAnchor="middle" fontSize="44">
                {b.icon}
              </text>
            </g>
          </g>
          <circle cx="150" cy="60" r="7" fill="var(--ink)" />
        </svg>
      </div>
    );
  }
  const max = Math.max(...s.items.map((i) => i.size));
  return (
    <div className="sc-compare" role="img" aria-label={s.items.map((i) => `${i.label}: ${i.size} long`).join(', ')}>
      <span className="sc-startline" aria-hidden />
      {s.items.map((it) => (
        <div key={it.id} className="sc-cmp-row">
          <span className="sc-cmp-bar" style={{ width: `${(it.size / max) * 100}%` }}>
            <span className="sc-cmp-icon" aria-hidden>
              {it.icon}
            </span>
          </span>
          <span className="sc-cmp-label">{it.label}</span>
        </div>
      ))}
    </div>
  );
}

function Ruler({ icon, length, max, unit }: { icon: string; length: number; max: number; unit: 'cm' | 'block' }) {
  const cell = Math.min(34, 320 / max);
  return (
    <div className={`sc-ruler ${unit}`} role="img" aria-label={`A ${unit === 'cm' ? 'ruler' : 'row of blocks'} under an object`}>
      <div className="sc-ruler-obj" style={{ width: length * cell }}>
        <span aria-hidden>{icon}</span>
      </div>
      <div className="sc-ruler-scale" style={{ width: max * cell }}>
        {unit === 'block'
          ? Array.from({ length: max }, (_, i) => <span key={i} className="block" style={{ width: cell }} aria-hidden />)
          : Array.from({ length: max + 1 }, (_, i) => (
              <span key={i} className="tick" style={{ left: i * cell }} aria-hidden>
                {cell >= 24 || i % 2 === 0 ? <span>{i}</span> : null}
              </span>
            ))}
      </div>
    </div>
  );
}

export function ClockFace({ minutes, size = 200, onPick, active }: { minutes: number; size?: number; onPick?: (n: number) => void; active?: 'hour' | 'minute' }) {
  const h = (minutes / 60) % 12;
  const m = minutes % 60;
  const hourAngle = h * 30;
  const minAngle = m * 6;
  const pos = (n: number, r: number) => [100 + r * Math.sin((n * 30 * Math.PI) / 180), 100 - r * Math.cos((n * 30 * Math.PI) / 180)];
  return (
    <svg className="clockface" width={size} height={size} viewBox="0 0 200 200" role="img" aria-label="A clock">
      <circle cx="100" cy="100" r="94" fill="var(--paper)" stroke="var(--ink)" strokeWidth="4" />
      {Array.from({ length: 60 }, (_, i) => {
        const [x1, y1] = pos(i / 5, i % 5 ? 88 : 82);
        const [x2, y2] = pos(i / 5, 92);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ink-2)" strokeWidth={i % 5 ? 1 : 2.5} />;
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const n = i + 1;
        const [x, y] = pos(n, 66);
        return onPick ? (
          <g key={n} className="clock-num" onClick={() => onPick(n)} role="button" tabIndex={0} aria-label={`point the ${active === 'hour' ? 'short' : 'long'} hand at ${n}`} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onPick(n))}>
            <circle cx={x} cy={y} r="15" fill="transparent" />
            <text x={x} y={(y ?? 0) + 7} textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--ink)">
              {n}
            </text>
          </g>
        ) : (
          <text key={n} x={x} y={(y ?? 0) + 7} textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--ink)">
            {n}
          </text>
        );
      })}
      <line x1="100" y1="100" x2="100" y2="50" stroke={active === 'hour' ? 'var(--pen)' : 'var(--ink)'} strokeWidth="8" strokeLinecap="round" transform={`rotate(${hourAngle} 100 100)`} />
      <line x1="100" y1="100" x2="100" y2="24" stroke={active === 'minute' ? 'var(--pen)' : 'var(--ink-2)'} strokeWidth="4.5" strokeLinecap="round" transform={`rotate(${minAngle} 100 100)`} />
      <circle cx="100" cy="100" r="6" fill="var(--ink)" />
    </svg>
  );
}
