/**
 * Answer inputs, one per input kind. Built for touch as much as keyboards:
 * a ± key (mobile number pads often lack a minus), stacked fraction boxes, an algebra key row,
 * and a live "reads as" preview so learners see exactly how their algebra was understood.
 */
import { useId, useMemo, useRef, type KeyboardEvent } from 'react';
import type { InputSpec } from '../../../shared/questions/types.ts';
import type { ResponseValue } from '../../../shared/questions/answer.ts';
import { parseExpression, toTex, ParseError } from '../../../shared/questions/expr.ts';
import { Rich, Tex } from '../../ui/RichText.tsx';
import { chem } from '../../../shared/questions/tex.ts';

interface Props {
  input: InputSpec;
  value: ResponseValue | null;
  onChange: (v: ResponseValue) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Labels the input for screen readers (the question prompt id). */
  describedBy?: string;
}

function toggleSign(v: string): string {
  const t = v.trim();
  return t.startsWith('-') ? t.slice(1) : `-${t}`;
}

const enter = (onSubmit?: () => void) => (e: KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter' && onSubmit) {
    e.preventDefault();
    onSubmit();
  }
};

export function AnswerInput(props: Props) {
  switch (props.input.kind) {
    case 'numeric':
      return <NumericInput {...props} input={props.input} />;
    case 'fraction':
      return <FractionInput {...props} input={props.input} />;
    case 'expression':
      return <ExpressionInput {...props} input={props.input} />;
    case 'roots':
      return <RootsInput {...props} input={props.input} />;
    case 'coefficients':
      return <CoefficientsInput {...props} input={props.input} />;
    case 'choice':
      return <ChoiceInput {...props} input={props.input} />;
  }
}

function NumericInput({ input, value, onChange, onSubmit, disabled, autoFocus, describedBy }: Props & { input: Extract<InputSpec, { kind: 'numeric' }> }) {
  const id = useId();
  const v = typeof value === 'string' ? value : '';
  return (
    <div className="answer-row">
      {input.prefix ? (
        <label htmlFor={id} className="answer-prefix">
          <Tex tex={input.prefix.replace('?', '\\square')} />
        </label>
      ) : (
        <label htmlFor={id} className="sr-only">
          Your answer
        </label>
      )}
      <input
        id={id}
        className="answer-box"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={v}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-describedby={describedBy}
        placeholder={input.placeholder ?? ''}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={enter(onSubmit)}
      />
      {input.unit ? <span className="answer-unit">{input.unit}</span> : null}
      <button type="button" className="key key-sign" onClick={() => onChange(toggleSign(v))} disabled={disabled} aria-label="Make negative or positive">
        ±
      </button>
    </div>
  );
}

function FractionInput({ input, value, onChange, onSubmit, disabled, autoFocus, describedBy }: Props & { input: Extract<InputSpec, { kind: 'fraction' }> }) {
  const id = useId();
  const raw = typeof value === 'string' ? value : '';
  const [n = '', d = ''] = raw.includes('/') ? raw.split('/') : [raw, ''];
  const set = (nn: string, dd: string) => onChange(dd.trim() ? `${nn}/${dd}` : nn);
  const dRef = useRef<HTMLInputElement>(null);
  return (
    <div className="answer-row">
      {input.prefix ? (
        <span className="answer-prefix" aria-hidden>
          <Tex tex={input.prefix} />
        </span>
      ) : null}
      <div className="frac-input" role="group" aria-label={`${input.prefix ? `${input.prefix} ` : ''}fraction answer`} aria-describedby={describedBy}>
        <input
          id={id}
          aria-label="Numerator (or a whole number or decimal)"
          className="answer-box frac-n"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={n}
          disabled={disabled}
          autoFocus={autoFocus}
          onChange={(e) => {
            const val = e.target.value;
            if (val.includes('/')) {
              const [a = '', b = ''] = val.split('/');
              set(a, b);
              dRef.current?.focus();
            } else set(val, d);
          }}
          onKeyDown={enter(onSubmit)}
        />
        <span className="frac-bar" aria-hidden />
        <input ref={dRef} aria-label="Denominator (leave empty for a whole number)" className="answer-box frac-d" type="text" inputMode="numeric" autoComplete="off" value={d} disabled={disabled} onChange={(e) => set(n, e.target.value)} onKeyDown={enter(onSubmit)} />
      </div>
      <button type="button" className="key key-sign" onClick={() => set(toggleSign(n), d)} disabled={disabled} aria-label="Make negative or positive">
        ±
      </button>
    </div>
  );
}

function ExpressionInput({ input, value, onChange, onSubmit, disabled, autoFocus, describedBy }: Props & { input: Extract<InputSpec, { kind: 'expression' }> }) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  const v = typeof value === 'string' ? value : '';
  const preview = useMemo(() => {
    if (!v.trim()) return null;
    try {
      return { tex: toTex(parseExpression(v)), error: null };
    } catch (e) {
      return { tex: null, error: e instanceof ParseError ? e.message : 'Check your expression' };
    }
  }, [v]);
  const insert = (s: string) => {
    const el = ref.current;
    if (!el) return onChange(v + s);
    const start = el.selectionStart ?? v.length;
    const end = el.selectionEnd ?? v.length;
    const next = v.slice(0, start) + s + v.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + s.length - (s === '()' ? 1 : 0);
      el.setSelectionRange(pos, pos);
    });
  };
  const keys = [...input.variables, '²', '(', ')', '+', '−'];
  return (
    <div className="expr-input">
      <div className="answer-row">
        {input.prefix ? (
          <label htmlFor={id} className="answer-prefix">
            <Tex tex={input.prefix} />
          </label>
        ) : (
          <label htmlFor={id} className="sr-only">
            Your answer
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className="answer-box answer-wide"
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={v}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-describedby={`${id}-preview${describedBy ? ` ${describedBy}` : ''}`}
          placeholder="e.g. (x + 2)(x - 3)"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={enter(onSubmit)}
        />
      </div>
      <div className="expr-keys" aria-label="Insert symbol">
        {keys.map((k) => (
          <button key={k} type="button" className="key" disabled={disabled} onClick={() => insert(k === '²' ? '^2' : k === '−' ? '-' : k)} aria-label={k === '²' ? 'squared' : k === '−' ? 'minus' : k === '+' ? 'plus' : k === '(' ? 'open bracket' : k === ')' ? 'close bracket' : k}>
            {k === '²' ? <Tex tex="\square^2" /> : k}
          </button>
        ))}
      </div>
      <p className="expr-preview" id={`${id}-preview`} aria-live="polite">
        {preview?.tex ? (
          <>
            <span className="muted">Reads as </span>
            <Tex tex={preview.tex} />
          </>
        ) : preview?.error ? (
          <span className="muted">{preview.error}</span>
        ) : (
          <span className="muted">Type with the keyboard: x^2 for x², and brackets for factors.</span>
        )}
      </p>
    </div>
  );
}

function RootsInput({ input, value, onChange, onSubmit, disabled, autoFocus }: Props & { input: Extract<InputSpec, { kind: 'roots' }> }) {
  const vals = Array.isArray(value) ? value : Array.from({ length: input.count }, () => '');
  const set = (i: number, s: string) => onChange(vals.map((x, j) => (j === i ? s : x)));
  return (
    <div className="answer-row roots" role="group" aria-label="Solutions">
      {vals.map((v, i) => (
        <span key={i} className="root">
          {i > 0 ? <span className="root-or">or</span> : null}
          <span className="answer-prefix" aria-hidden>
            <Tex tex={`${input.variable} =`} />
          </span>
          <input aria-label={`Solution ${i + 1}`} className="answer-box answer-narrow" type="text" inputMode="decimal" autoComplete="off" value={v} disabled={disabled} autoFocus={autoFocus && i === 0} onChange={(e) => set(i, e.target.value)} onKeyDown={enter(onSubmit)} />
          <button type="button" className="key key-sign" onClick={() => set(i, toggleSign(v))} disabled={disabled} aria-label={`Make solution ${i + 1} negative or positive`}>
            ±
          </button>
        </span>
      ))}
    </div>
  );
}

function CoefficientsInput({ input, value, onChange, onSubmit, disabled, autoFocus }: Props & { input: Extract<InputSpec, { kind: 'coefficients' }> }) {
  const vals = Array.isArray(value) ? value : input.species.map(() => '');
  const set = (i: number, s: string) => onChange(vals.map((x, j) => (j === i ? s.replace(/[^0-9]/g, '') : x)));
  return (
    <div className="coef-row" role="group" aria-label="Coefficients. Leave a box empty for 1.">
      {input.species.map((sp, i) => (
        <span key={i} className="coef">
          {i > 0 ? <span className="coef-op">{i === input.arrowAfter ? <Tex tex="\rightarrow" /> : '+'}</span> : null}
          <input aria-label={`Coefficient for ${sp}`} className="answer-box coef-box" type="text" inputMode="numeric" autoComplete="off" placeholder="1" value={vals[i] ?? ''} disabled={disabled} autoFocus={autoFocus && i === 0} onChange={(e) => set(i, e.target.value)} onKeyDown={enter(onSubmit)} />
          <Tex tex={chem(sp)} />
        </span>
      ))}
    </div>
  );
}

function ChoiceInput({ input, value, onChange, disabled, describedBy }: Props & { input: Extract<InputSpec, { kind: 'choice' }> }) {
  const name = useId();
  return (
    <fieldset className="choices" aria-describedby={describedBy} disabled={disabled}>
      <legend className="sr-only">Choose one answer</legend>
      {input.options.map((o, i) => (
        <label key={o.id} className={`choice${value === o.id ? ' on' : ''}`}>
          <input type="radio" name={name} value={o.id} checked={value === o.id} onChange={() => onChange(o.id)} />
          <span className="choice-key" aria-hidden>
            {String.fromCharCode(65 + i)}
          </span>
          <Rich text={o.text} />
        </label>
      ))}
    </fieldset>
  );
}

/** Is there something to submit? */
export function hasAnswer(input: InputSpec, value: ResponseValue | null): boolean {
  if (input.kind === 'coefficients') return true; // empty boxes mean 1
  if (value === null) return false;
  if (Array.isArray(value)) return value.length > 0 && value.every((v) => v.trim() !== '');
  return value.trim() !== '' && !value.trim().endsWith('/') && !value.trim().startsWith('/');
}
