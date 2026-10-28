import { useId, useState } from 'react';
import { passwordRules } from '../../../shared/password.ts';

/** Password input with show/hide and, for new passwords, a live checklist of the rules. */
export function PasswordField({
  label = 'Password',
  value,
  onChange,
  error,
  isNew,
  context,
  autoComplete,
  autoFocus,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
  isNew?: boolean;
  context?: { email?: string; name?: string };
  autoComplete?: string;
  autoFocus?: boolean;
}) {
  const id = useId();
  const [show, setShow] = useState(false);
  const rules = isNew ? passwordRules(value, context) : [];
  const touched = value.length > 0;
  return (
    <div className={`field${error ? ' field-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="pw-wrap">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete ?? (isNew ? 'new-password' : 'current-password')}
          aria-invalid={error ? true : undefined}
          aria-describedby={isNew ? `${id}-rules` : error ? `${id}-err` : undefined}
          maxLength={128}
          spellCheck={false}
          autoCapitalize="off"
          autoFocus={autoFocus}
          {...(autoFocus ? { 'data-autofocus': '' } : {})}
        />
        <button type="button" className="pw-toggle" onClick={() => setShow(!show)} aria-pressed={show} aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      {isNew ? (
        <ul className="pw-rules" id={`${id}-rules`} aria-live="polite">
          {rules.map((r) => (
            <li key={r.id} className={r.ok ? 'ok' : touched ? 'todo' : ''}>
              <span className="pw-mark" aria-hidden>
                {r.ok ? '✓' : '·'}
              </span>
              <span>
                {r.label}
                <span className="sr-only">{r.ok ? ': done' : ': not yet'}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p className="field-msg" id={`${id}-err`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const passwordOk = (value: string, context?: { email?: string; name?: string }) => passwordRules(value, context).every((r) => r.ok);
