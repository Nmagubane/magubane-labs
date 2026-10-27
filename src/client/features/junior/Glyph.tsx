/**
 * Pictures for Junior activities, drawn from tokens so they look the same on every device:
 *   shape:<name>[:variant][:colour][:size]   2-D shapes and 3-D objects
 *   coin:<cents>                             South African coins and notes (value-led, not a replica)
 *   frac:<shape>:<parts>:<shaded>:<eq|uneq>  fraction pictures
 *   color:<name>                             a colour swatch
 *   count:<n>:<emoji>                        a small group of things
 * Anything else is an emoji, shown as-is.
 */
import type { CSSProperties, ReactElement } from 'react';
import { SHAPE_NAMES } from '../../../shared/junior/packs/en/core.ts';

const COLOURS: Record<string, string> = {
  red: '#d6382f',
  blue: '#2a5bd7',
  yellow: '#f2c41d',
  green: '#2f9a4f',
  orange: '#ee7d22',
  purple: '#7d43b8',
  black: '#1a1d21',
  white: '#ffffff',
  brown: '#8a5a33',
};

export function glyphLabel(token: string): string {
  const [kind, a, , c, d] = token.split(':');
  if (kind === 'shape') return [d === 'small' ? 'small' : d === 'big' ? 'big' : '', c ?? '', SHAPE_NAMES[a as keyof typeof SHAPE_NAMES] ?? a ?? 'shape'].filter(Boolean).join(' ');
  if (kind === 'coin') {
    const v = Number(a);
    return v >= 100 ? `${v / 100} rand ${v >= 1000 ? 'note' : 'coin'}` : `${v} cents coin`;
  }
  if (kind === 'frac') return `a ${a === 'rect' ? 'rectangle' : a === 'bar' ? 'bar' : 'circle'} cut into ${token.split(':')[2]} ${token.endsWith('uneq') ? 'unequal' : 'equal'} parts`;
  if (kind === 'color') return a ?? 'colour';
  if (kind === 'count') return `${a} of them`;
  return token;
}

export function Glyph({ token, size = 64, className, label }: { token: string; size?: number; className?: string; label?: string }) {
  const [kind] = token.split(':');
  const aria = label ?? glyphLabel(token);
  if (kind === 'shape') return <ShapeGlyph token={token} size={size} label={aria} {...(className ? { className } : {})} />;
  if (kind === 'coin') return <MoneyGlyph cents={Number(token.split(':')[1])} size={size} label={aria} />;
  if (kind === 'frac') {
    const [, shape, d, n, eq] = token.split(':');
    return <FractionPicture shape={(shape ?? 'circle') as 'circle' | 'rect' | 'bar'} parts={Number(d)} shaded={Number(n)} equal={eq !== 'uneq'} size={size} label={aria} />;
  }
  if (kind === 'color') {
    const c = token.split(':')[1] ?? 'black';
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={aria} className={className}>
        <path d="M32 6c14 0 26 9 26 24S46 58 30 58 6 47 7 32 18 6 32 6z" fill={COLOURS[c] ?? c} stroke="var(--ink)" strokeOpacity={c === 'white' ? 0.5 : 0.15} strokeWidth={2} />
      </svg>
    );
  }
  if (kind === 'count') {
    const [, n, ...rest] = token.split(':');
    const icon = rest.join(':');
    return (
      <span className={`glyph-count${className ? ` ${className}` : ''}`} role="img" aria-label={aria} style={{ '--g': `${Math.round(size * 0.42)}px` } as CSSProperties}>
        {Array.from({ length: Number(n) }, (_, i) => (
          <span key={i} aria-hidden>
            {icon}
          </span>
        ))}
      </span>
    );
  }
  return (
    <span className={`emoji${className ? ` ${className}` : ''}`} role="img" aria-label={aria} style={{ fontSize: size * 0.82 }}>
      {token}
    </span>
  );
}

// ---------------------------------------------------------------------------
const ROT = [0, 18, -24, 40];
const SCALE = [1, 0.72, 0.9, 0.62];

function ShapeGlyph({ token, size, label, className }: { token: string; size: number; label: string; className?: string }) {
  const [, name = 'circle', v = '0', colour, sz] = token.split(':');
  const vi = Number(v) % 4;
  const fill = colour ? (COLOURS[colour] ?? colour) : 'var(--pen-tint)';
  const stroke = colour ? 'rgba(0,0,0,.35)' : 'var(--pen)';
  const scale = (sz === 'small' ? 0.55 : 1) * SCALE[vi]!;
  const solid = ['sphere', 'cube', 'box', 'cylinder', 'cone', 'pyramid'].includes(name);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={label} className={className}>
      <g transform={`translate(50 50) rotate(${solid ? 0 : ROT[vi]}) scale(${scale}) translate(-50 -50)`} fill={fill} stroke={stroke} strokeWidth={3} strokeLinejoin="round">
        {SHAPES[name]?.(fill) ?? SHAPES.circle!(fill)}
      </g>
    </svg>
  );
}

const SHAPES: Record<string, (fill: string) => ReactElement> = {
  circle: () => <circle cx="50" cy="50" r="38" />,
  oval: () => <ellipse cx="50" cy="50" rx="42" ry="27" />,
  triangle: () => <path d="M50 12 88 82H12z" />,
  scalene: () => <path d="M14 80 84 70 34 16z" />,
  square: () => <rect x="16" y="16" width="68" height="68" />,
  rectangle: () => <rect x="8" y="28" width="84" height="44" />,
  pentagon: () => <path d="M50 10 90 40 75 86H25L10 40z" />,
  hexagon: () => <path d="M28 14h44l22 36-22 36H28L6 50z" />,
  heart: () => <path d="M50 86C22 64 10 50 10 34a19 19 0 0 1 40-8 19 19 0 0 1 40 8c0 16-12 30-40 52z" />,
  arrow: () => <path d="M50 8 84 44H64v46H36V44H16z" />,
  irregular: () => <path d="M12 30 70 12 90 64 40 88 22 70z" />,
  flag: () => (
    <>
      <path d="M22 10v82" fill="none" />
      <path d="M22 14h56L64 32l14 18H22z" />
    </>
  ),
  sphere: (f) => (
    <>
      <circle cx="50" cy="50" r="38" />
      <ellipse cx="50" cy="50" rx="38" ry="12" fill="none" strokeOpacity={0.5} />
      <circle cx="38" cy="36" r="8" fill="#fff" stroke="none" opacity={f === 'var(--pen-tint)' ? 0.7 : 0.35} />
    </>
  ),
  cube: () => (
    <>
      <path d="M20 34h46v46H20z" />
      <path d="M20 34 34 20h46L66 34zM66 34l14-14v46L66 80z" />
    </>
  ),
  box: () => (
    <>
      <path d="M10 42h58v40H10z" />
      <path d="M10 42 26 26h62L68 42zM68 42l20-16v40L68 82z" />
    </>
  ),
  cylinder: () => (
    <>
      <path d="M22 22v56c0 7 12.5 12 28 12s28-5 28-12V22" />
      <ellipse cx="50" cy="22" rx="28" ry="10" />
    </>
  ),
  cone: () => (
    <>
      <path d="M50 8 80 78c0 7-13.4 12-30 12s-30-5-30-12z" />
      <ellipse cx="50" cy="78" rx="30" ry="10" fill="none" strokeDasharray="5 4" />
    </>
  ),
  pyramid: () => (
    <>
      <path d="M50 10 12 74l30 14z" />
      <path d="M50 10 42 88l46-14z" />
    </>
  ),
};

// ---------------------------------------------------------------------------
/** South African money: coins by colour family (copper/bronze/silver, R5 two-tone), notes by colour. Value-led, not replicas. */
const NOTE_COLOUR: Record<number, string> = { 1000: '#5f9c5a', 2000: '#a2774a', 5000: '#c4554a', 10000: '#4f78c2', 20000: '#e08a3a' };
export function MoneyGlyph({ cents, size = 64, label }: { cents: number; size?: number; label?: string }) {
  const text = cents >= 100 ? `R${cents / 100}` : `${cents}c`;
  if (cents >= 1000) {
    return (
      <svg width={size * 1.6} height={size} viewBox="0 0 160 100" role="img" aria-label={label ?? `${cents / 100} rand note`} className="money money-note">
        <rect x="4" y="12" width="152" height="76" rx="6" fill={NOTE_COLOUR[cents] ?? '#7a8a7a'} />
        <rect x="12" y="20" width="136" height="60" rx="3" fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={2} />
        <circle cx="122" cy="50" r="18" fill="#fff" opacity={0.25} />
        <text x="58" y="62" textAnchor="middle" fontSize="34" fontWeight="700" fill="#fff" fontFamily="var(--font)">
          {text}
        </text>
      </svg>
    );
  }
  const bronze = cents >= 10 && cents < 100;
  const r = cents === 5 ? 30 : cents === 10 ? 32 : cents === 20 ? 36 : cents === 50 ? 40 : cents === 100 ? 40 : cents === 200 ? 43 : 46;
  const face = cents === 5 ? '#c27a4a' : bronze ? '#d8b04e' : '#c9ccc8';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={label ?? (cents >= 100 ? `${cents / 100} rand coin` : `${cents} cents coin`)} className="money coin">
      {cents === 500 ? <circle cx="50" cy="50" r={r} fill="#d8b04e" /> : null}
      <circle cx="50" cy="50" r={cents === 500 ? r - 9 : r} fill={face} stroke="rgba(0,0,0,.25)" strokeWidth={2} />
      <circle cx="50" cy="50" r={(cents === 500 ? r - 9 : r) - 6} fill="none" stroke="rgba(0,0,0,.18)" strokeWidth={1.5} strokeDasharray="2 3" />
      <text x="50" y="58" textAnchor="middle" fontSize={text.length > 2 ? 22 : 26} fontWeight="700" fill="#1a1d21" fontFamily="var(--font)">
        {text}
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
export function FractionPicture({ shape, parts, shaded, equal, size = 120, label }: { shape: 'circle' | 'rect' | 'bar'; parts: number; shaded: number; equal: boolean; size?: number; label?: string }) {
  // Unequal parts: deliberately different sizes so "equal parts" is visible.
  const weights = equal ? Array.from({ length: parts }, () => 1) : Array.from({ length: parts }, (_, i) => (i === 0 ? 2.2 : i === 1 ? 0.6 : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  const shadeFill = 'var(--pen)';
  const empty = 'var(--paper)';
  if (shape === 'circle') {
    let a0 = -90;
    const segs = weights.map((w, i) => {
      const a1 = a0 + (360 * w) / total;
      const p = (deg: number) => [50 + 42 * Math.cos((deg * Math.PI) / 180), 50 + 42 * Math.sin((deg * Math.PI) / 180)];
      const [x0, y0] = p(a0);
      const [x1, y1] = p(a1);
      const large = a1 - a0 > 180 ? 1 : 0;
      const d = parts === 1 ? 'M50 8a42 42 0 1 1 0 84a42 42 0 1 1 0-84' : `M50 50L${x0} ${y0}A42 42 0 ${large} 1 ${x1} ${y1}z`;
      a0 = a1;
      return <path key={i} d={d} fill={i < shaded ? shadeFill : empty} stroke="var(--ink)" strokeWidth={2} />;
    });
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={label ?? `${shaded} of ${parts} parts coloured`}>
        {segs}
      </svg>
    );
  }
  const W = shape === 'bar' ? 160 : 120;
  const H = shape === 'bar' ? 40 : 80;
  let x = 0;
  return (
    <svg width={size * (W / 100)} height={size * (H / 100)} viewBox={`-2 -2 ${W + 4} ${H + 4}`} role="img" aria-label={label ?? `${shaded} of ${parts} parts coloured`}>
      {weights.map((w, i) => {
        const wd = (W * w) / total;
        const r = <rect key={i} x={x} y={0} width={wd} height={H} fill={i < shaded ? shadeFill : empty} stroke="var(--ink)" strokeWidth={2} />;
        x += wd;
        return r;
      })}
    </svg>
  );
}
