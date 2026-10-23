/** Reusable design primitives. Small on purpose. */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode, type InputHTMLAttributes } from 'react';
import type { MasteryBand } from '../../shared/mastery/model.ts';
import { BAND_LABEL } from '../lib/format.ts';
import { Link } from '../lib/router.tsx';
import type { ApiError } from '../lib/api.ts';

type Variant = 'primary' | 'secondary' | 'quiet' | 'danger';

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean; size?: 'md' | 'lg' | 'sm' }>(function Button(
  { variant = 'primary', busy, size = 'md', className, children, disabled, ...rest },
  ref,
) {
  return (
    <button ref={ref} className={`btn btn-${variant} btn-${size}${className ? ` ${className}` : ''}`} disabled={disabled || busy} aria-busy={busy || undefined} {...rest}>
      {busy ? <span className="btn-spinner" aria-hidden /> : null}
      <span>{children}</span>
    </button>
  );
});

export function ButtonLink({ to, variant = 'primary', size = 'md', children, className }: { to: string; variant?: Variant; size?: 'md' | 'lg' | 'sm'; children: ReactNode; className?: string }) {
  return (
    <Link to={to} className={`btn btn-${variant} btn-${size}${className ? ` ${className}` : ''}`}>
      <span>{children}</span>
    </Link>
  );
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | null; hint?: string }>(function TextInput({ label, error, hint, id, className, ...rest }, ref) {
  const inputId = id ?? `f-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className={`field${error ? ' field-error' : ''}${className ? ` ${className}` : ''}`}>
      <label htmlFor={inputId}>{label}</label>
      <input ref={ref} id={inputId} aria-invalid={error ? true : undefined} aria-describedby={error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined} {...rest} />
      {hint && !error ? (
        <p className="field-hint" id={`${inputId}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field-msg" id={`${inputId}-err`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});

/** Mastery as a ruler: band thresholds are marked, the fill colour is the band. */
export function MasteryBar({ value, band, size = 'md', label = true }: { value: number; band: MasteryBand; size?: 'sm' | 'md' | 'lg'; label?: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`mastery mastery-${size}`}>
      <div className="mastery-track" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-valuetext={`${pct}% mastery, ${BAND_LABEL[band]}`} aria-label="Mastery">
        <div className={`mastery-fill band-${band}`} style={{ width: `${band === 'not-started' ? 0 : Math.max(2, pct)}%` }} />
        <span className="mastery-tick" style={{ left: '40%' }} />
        <span className="mastery-tick" style={{ left: '70%' }} />
        <span className="mastery-tick" style={{ left: '85%' }} />
      </div>
      {label ? (
        <div className="mastery-label">
          <span className="num">{band === 'not-started' ? '–' : `${pct}%`}</span>
          <span className={`band-name band-text-${band}`}>{BAND_LABEL[band]}</span>
        </div>
      ) : null}
    </div>
  );
}

export function BandDot({ band }: { band: MasteryBand }) {
  return <span className={`band-dot band-${band}`} aria-hidden />;
}

/** Highlighter mark: used only for "focus" — today's priority, the biggest opportunity. */
export function Mark({ children }: { children: ReactNode }) {
  return <mark className="hl">{children}</mark>;
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="state state-loading" role="status" aria-live="polite">
      <span className="loader" aria-hidden />
      <span>{label}…</span>
    </div>
  );
}

export function ErrorState({ error, onRetry, title }: { error: ApiError | Error; onRetry?: () => void; title?: string }) {
  const offline = 'offline' in error && (error as ApiError).offline;
  return (
    <div className="state state-error" role="alert">
      <h2>{title ?? (offline ? "You're offline" : "This didn't load")}</h2>
      <p>{error.message}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="state state-empty">
      <h2>{title}</h2>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="logo">
      <svg className="logo-tile" viewBox="0 0 36 36" aria-hidden="true" focusable="false">
        <rect x="1.25" y="1.25" width="33.5" height="33.5" rx="4" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <text x="6" y="11.5" fontSize="7.5" fontWeight="700" fill="currentColor" fontFamily="inherit">
          12
        </text>
        <text x="18" y="27.5" fontSize="15" fontWeight="700" fill="currentColor" textAnchor="middle" fontFamily="inherit">
          Mg
        </text>
      </svg>
      {compact ? <span className="sr-only">Magubane Labs</span> : <span className="logo-word">Magubane Labs</span>}
    </span>
  );
}

export function PageHeader({ title, lead, children }: { title: ReactNode; lead?: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {lead ? <p className="lead">{lead}</p> : null}
      </div>
      {children ? <div className="page-header-actions">{children}</div> : null}
    </header>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
