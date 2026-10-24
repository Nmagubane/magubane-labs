/**
 * Hand-drawn SVG illustrations in the Magubane Labs style: ink outlines, one purposeful accent,
 * and theme-aware colours. They are crisp at any size and tiny over a slow connection.
 * Decorative unless given a `label`.
 */
import type { ReactNode } from 'react';
import type { VClass } from '../../shared/questions/generators/science-life.ts';

function Svg({ size = 64, label, children, viewBox = '0 0 64 64', className = '' }: { size?: number; label?: string; children: ReactNode; viewBox?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox={viewBox} className={`illo ${className}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {children}
    </svg>
  );
}

export function ClassIcon({ cls, size = 64 }: { cls: VClass; size?: number }) {
  switch (cls) {
    case 'fish':
      return (
        <Svg size={size} label="Fish">
          <path d="M8 32 C18 18 38 16 48 32 C38 48 18 46 8 32 Z" className="illo-fill" />
          <path d="M48 32 L60 22 V42 Z" className="illo-fill" />
          <path d="M24 26 C27 30 27 34 24 38" className="illo-line" />
          <circle cx={16} cy={30} r={2.2} className="illo-ink" />
          <path d="M34 22 L38 16 L42 24" className="illo-accent-line" />
        </Svg>
      );
    case 'amphibian':
      return (
        <Svg size={size} label="Amphibian">
          <ellipse cx={32} cy={36} rx={14} ry={16} className="illo-fill" />
          <circle cx={25} cy={20} r={5} className="illo-fill" />
          <circle cx={39} cy={20} r={5} className="illo-fill" />
          <circle cx={25} cy={20} r={2} className="illo-ink" />
          <circle cx={39} cy={20} r={2} className="illo-ink" />
          <path d="M19 30 L8 24 L4 28 M19 44 L8 52 L6 58 M45 30 L56 24 L60 28 M45 44 L56 52 L58 58" className="illo-line" />
          <path d="M26 42 q6 4 12 0" className="illo-accent-line" />
        </Svg>
      );
    case 'reptile':
      return (
        <Svg size={size} label="Reptile">
          <path d="M10 30 C14 24 22 24 26 28 C34 34 42 32 50 36 C56 40 60 46 58 50 C52 44 44 42 36 42 C26 42 20 38 16 36 C12 36 9 34 10 30 Z" className="illo-fill" />
          <path d="M22 34 L18 44 M30 38 L28 48 M38 40 L42 50 M44 40 L50 46" className="illo-line" />
          <circle cx={15} cy={30} r={1.8} className="illo-ink" />
          <path d="M28 32 l3 -3 l3 3 l3 -3 l3 3" className="illo-accent-line" />
        </Svg>
      );
    case 'bird':
      return (
        <Svg size={size} label="Bird">
          <path d="M14 34 C14 22 30 18 38 26 C44 32 50 30 56 28 C52 40 44 46 32 46 C22 46 14 42 14 34 Z" className="illo-fill" />
          <circle cx={20} cy={24} r={8} className="illo-fill" />
          <path d="M12 24 L4 27 L12 28 Z" className="illo-accent" />
          <circle cx={19} cy={22} r={1.8} className="illo-ink" />
          <path d="M26 34 C32 30 40 32 44 36" className="illo-line" />
          <path d="M28 46 V56 M36 46 V56 M26 56 H30 M34 56 H38" className="illo-line" />
        </Svg>
      );
    case 'mammal':
      return (
        <Svg size={size} label="Mammal">
          <path d="M14 36 C14 26 24 22 36 24 C46 25 52 30 52 38 C52 44 46 46 36 46 C24 46 14 44 14 36 Z" className="illo-fill" />
          <circle cx={14} cy={30} r={8} className="illo-fill" />
          <path d="M10 22 L9 16 L14 21 M17 21 L20 15 L20 22" className="illo-line" />
          <circle cx={11} cy={29} r={1.8} className="illo-ink" />
          <path d="M22 46 V56 M30 46 V56 M40 46 V56 M48 44 V56 M52 36 C58 36 60 30 58 26" className="illo-line" />
          <path d="M26 28 l2 -3 M32 27 l2 -3 M38 27 l2 -3 M44 29 l2 -3" className="illo-accent-line" />
        </Svg>
      );
  }
}

export { Svg as IlloFrame };

/** Sorting-box icons for living / never alive / once living. */
export function BinIcon({ kind, size = 48 }: { kind: 'living' | 'non-living' | 'once-living'; size?: number }) {
  if (kind === 'living')
    return (
      <Svg size={size}>
        <path d="M32 56 V30" className="illo-line" />
        <path d="M32 36 C20 36 14 26 14 16 C26 16 32 24 32 36 Z" className="illo-accent" />
        <path d="M32 30 C42 30 50 22 50 12 C38 12 32 20 32 30 Z" className="illo-fill" />
        <path d="M14 56 H50" className="illo-line" />
      </Svg>
    );
  if (kind === 'non-living')
    return (
      <Svg size={size}>
        <path d="M10 48 L18 26 L32 18 L48 24 L56 44 L44 52 L20 54 Z" className="illo-fill" />
        <path d="M22 34 L30 30 M38 40 L46 36" className="illo-line" />
        <path d="M32 18 L36 30" className="illo-accent-line" />
      </Svg>
    );
  return (
    <Svg size={size}>
      <path d="M10 26 H50 V44 H10 Z" className="illo-fill" />
      <ellipse cx={50} cy={35} rx={6} ry={9} className="illo-accent" />
      <ellipse cx={50} cy={35} rx={2.5} ry={4} className="illo-line" />
      <path d="M18 32 H38 M22 39 H42" className="illo-line" />
      <path d="M26 26 C26 18 32 14 36 12" className="illo-line" />
    </Svg>
  );
}
