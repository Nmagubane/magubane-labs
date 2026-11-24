/**
 * Answer inputs, one per input kind. Built for touch as much as keyboards:
 * a ± key (mobile number pads often lack a minus), stacked fraction boxes, an algebra key row,
 * and a live "reads as" preview so learners see exactly how their algebra was understood.
 */
import { useId, useMemo, useRef, type KeyboardEvent } from 'react';
import type { ProofCell, InputSpec } from '../../../shared/questions/types.ts';
import type { ResponseValue } from '../../../shared/questions/answer.ts';
import { parseExpression, toTex, ParseError, splitEquation } from '../../../shared/questions/expr.ts';
import { Rich, Tex } from '../../ui/RichText.tsx';
import { chem } from '../../../shared/questions/tex.ts';
import { parseInequality, setTex, toWire, InequalityError } from '../../../shared/questions/inequality.ts';
import { parseFormula, formulaTex, FormulaError } from '../../../shared/questions/formula.ts';
import { parseSurd, surdTex } from '../../../shared/questions/surd.ts';
import { NumberLine } from '../../ui/NumberLine.tsx';

interface Props {
  input: InputSpec;
  value: ResponseValue | null;
  onChange: (v: ResponseValue) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Labels the input for screen readers (the question prompt id). */
  describedBy?: string;
  /** After marking (proofs): the blanks that were wrong, as "row:part". Absent before marking. */
  marks?: string[];
}

/** A prefix in TeX: "R" (rand) is set upright, as text, not as an italic variable; "?" is a blank box. */
const prefixTex = (p: string) => (p === 'R' ? '\\text{R}' : p.replace('?', '\\square'));

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
    case 'equation':
      return <ExpressionInput {...props} input={props.input} />;
    case 'point':
      return <PointInput {...props} input={props.input} />;
    case 'scientific':
      return <ScientificInput {...props} />;
    case 'proof':
      return <ProofInput {...props} input={props.input} />;
    case 'roots':
      return <RootsInput {...props} input={props.input} />;
    case 'coefficients':
      return <CoefficientsInput {...props} input={props.input} />;
    case 'choice':
      return <ChoiceInput {...props} input={props.input} />;
    case 'inequality':
      return <InequalityInput {...props} input={props.input} />;
    case 'formula':
      return <FormulaInput {...props} input={props.input} />;
    case 'surd':
      return <FormulaInput {...props} input={{ kind: 'formula', variables: [], ...(props.input.prefix ? { prefix: props.input.prefix } : {}) }} surd />;
  }
}

function NumericInput({ input, value, onChange, onSubmit, disabled, autoFocus, describedBy }: Props & { input: Extract<InputSpec, { kind: 'numeric' }> }) {
  const id = useId();
  const v = typeof value === 'string' ? value : '';
  return (
    <div className="answer-row">
      {input.prefix ? (
        <label htmlFor={id} className="answer-prefix">
          <Tex tex={prefixTex(input.prefix)} />
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
      {input.positive ? null : (
        <button type="button" className="key key-sign" onClick={() => onChange(toggleSign(v))} disabled={disabled} aria-label="Make negative or positive">
          ±
        </button>
      )}
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

/** Expressions, and equations (one = sign, each side read separately). */
function ExpressionInput({ input, value, onChange, onSubmit, disabled, autoFocus, describedBy }: Props & { input: Extract<InputSpec, { kind: 'expression' | 'equation' }> }) {
  const isEq = input.kind === 'equation';
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  const v = typeof value === 'string' ? value : '';
  const preview = useMemo(() => {
    if (!v.trim()) return null;
    try {
      if (isEq) {
        const sides = splitEquation(v);
        if (!sides) return { tex: null, error: v.includes('=') ? 'Use one = sign' : 'Add the = sign' };
        return { tex: `${toTex(parseExpression(sides[0]))} = ${toTex(parseExpression(sides[1]))}`, error: null };
      }
      // Display style, so a typed fraction reads as a real fraction, not a small inline one.
      return { tex: `\\displaystyle ${toTex(parseExpression(v))}`, error: null };
    } catch (e) {
      return { tex: null, error: e instanceof ParseError ? e.message : 'Check your expression' };
    }
  }, [v, isEq]);
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
  const fraction = input.kind === 'expression' && input.fraction === true;
  const cubes = input.kind === 'expression' && input.cubes === true;
  const keys = [...input.variables, '²', ...(cubes ? ['³'] : []), '(', ')', '+', '−', ...(fraction ? ['/'] : []), ...(isEq ? ['='] : [])];
  return (
    <div className="expr-input">
      <div className="answer-row">
        {input.kind === 'expression' && input.prefix ? (
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
          placeholder={input.placeholder ?? (isEq ? 'e.g. y = 2x + 3' : fraction ? 'e.g. (x + 3)/(x - 2)' : 'e.g. (x + 2)(x - 3)')}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={enter(onSubmit)}
        />
      </div>
      <div className="expr-keys" aria-label="Insert symbol">
        {keys.map((k) => (
          <button key={k} type="button" className="key" disabled={disabled} onClick={() => insert(k === '²' ? '^2' : k === '³' ? '^3' : k === '−' ? '-' : k)} aria-label={k === '²' ? 'squared' : k === '³' ? 'cubed' : k === '/' ? 'divided by' : k === '−' ? 'minus' : k === '+' ? 'plus' : k === '(' ? 'open bracket' : k === ')' ? 'close bracket' : k}>
            {k === '²' ? <Tex tex="\square^2" /> : k === '³' ? <Tex tex="\square^3" /> : k}
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
          <span className="muted">{isEq ? 'Type the whole equation, with one = sign. x^2 for x².' : fraction ? 'Put the top and the bottom in brackets: (x + 3)/(x - 2).' : 'Type with the keyboard: x^2 for x², and brackets where you need them.'}</span>
        )}
      </p>
    </div>
  );
}

/** Inserts text at the caret and puts the caret back, so on-screen keys behave like typing. */
function useInsert(v: string, onChange: (v: string) => void) {
  const ref = useRef<HTMLInputElement>(null);
  const insert = (s: string) => {
    const el = ref.current;
    if (!el) return onChange(v + s);
    const start = el.selectionStart ?? v.length;
    const end = el.selectionEnd ?? v.length;
    onChange(v.slice(0, start) + s + v.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + s.length, start + s.length);
    });
  };
  return { ref, insert };
}

interface Key {
  label: string;
  text: string;
  aria: string;
}

function KeyRow({ keys, insert, disabled }: { keys: Key[]; insert: (s: string) => void; disabled?: boolean }) {
  return (
    <div className="expr-keys" aria-label="Insert symbol">
      {keys.map((k) => (
        <button key={k.label} type="button" className="key" disabled={disabled} onClick={() => insert(k.text)} aria-label={k.aria}>
          {k.label}
        </button>
      ))}
    </div>
  );
}

/** Solution sets: "x < -2 or x > 3", "-1 <= x < 4", interval notation. Shows the set back as TeX and on a number line. */
function InequalityInput({ input, value, onChange, onSubmit, disabled, autoFocus, describedBy }: Props & { input: Extract<InputSpec, { kind: 'inequality' }> }) {
  const id = useId();
  const v = typeof value === 'string' ? value : '';
  const { ref, insert } = useInsert(v, onChange);
  const x = input.variable;
  const preview = useMemo(() => {
    if (!v.trim()) return null;
    try {
      const set = parseInequality(v, x);
      return { set, tex: setTex(set, x), error: null };
    } catch (e) {
      return { set: null, tex: null, error: e instanceof InequalityError ? e.message : 'Check your inequality' };
    }
  }, [v, x]);
  const keys: Key[] = [
    { label: x, text: x, aria: x },
    { label: '<', text: ' < ', aria: 'less than' },
    { label: '>', text: ' > ', aria: 'greater than' },
    { label: '≤', text: ' ≤ ', aria: 'less than or equal to' },
    { label: '≥', text: ' ≥ ', aria: 'greater than or equal to' },
    { label: '−', text: '-', aria: 'minus' },
    { label: '/', text: '/', aria: 'over' },
    { label: 'or', text: ' or ', aria: 'or' },
  ];
  return (
    <div className="expr-input ineq-input">
      <div className="answer-row">
        <label htmlFor={id} className="sr-only">
          Your answer
        </label>
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
          placeholder={`e.g. ${x} < -2 or ${x} ≥ 3`}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={enter(onSubmit)}
        />
      </div>
      <KeyRow keys={keys} insert={insert} disabled={disabled} />
      <div className="expr-preview" id={`${id}-preview`} aria-live="polite">
        {preview?.tex ? (
          <>
            <p>
              <span className="muted">Reads as </span>
              <Tex tex={preview.tex} />
            </p>
            {preview.set ? <NumberLine set={toWire(preview.set)} variable={x} alt={`Your answer on a number line`} /> : null}
          </>
        ) : preview?.error ? (
          <p className="muted">{preview.error}</p>
        ) : (
          <p className="muted">Type {x} &lt; 3, {x} &gt;= -1 (or ≥), or two parts joined by “or”. A chain like -1 &lt; {x} ≤ 4 works too.</p>
        )}
      </div>
    </div>
  );
}

/** A formula in letters: "make r the subject" answers like (v - u)/t or sqrt(A/pi). */
/** Also used for surds (`surd`): no letters or π, and the hint is about simplest form. */
function FormulaInput({ input, value, onChange, onSubmit, disabled, autoFocus, describedBy, surd = false }: Props & { input: Extract<InputSpec, { kind: 'formula' }>; surd?: boolean }) {
  const id = useId();
  const v = typeof value === 'string' ? value : '';
  const { ref, insert } = useInsert(v, onChange);
  const preview = useMemo(() => {
    if (!v.trim()) return null;
    try {
      return { tex: formulaTex(parseFormula(v.replace(/^\s*[a-zA-Z]\s*=\s*/, ''))), error: null };
    } catch (e) {
      return { tex: null, error: e instanceof FormulaError ? e.message : 'Check your formula' };
    }
  }, [v]);
  const keys: Key[] = [
    ...input.variables.map((k) => ({ label: k, text: k, aria: k })),
    { label: '/', text: '/', aria: 'divided by' },
    { label: '(', text: '(', aria: 'open bracket' },
    { label: ')', text: ')', aria: 'close bracket' },
    ...(surd ? [] : [{ label: '^', text: '^', aria: 'to the power' }]),
    { label: '√', text: surd ? '√' : '√(', aria: 'square root' },
    ...(surd ? [{ label: '+', text: ' + ', aria: 'plus' }, { label: '−', text: ' - ', aria: 'minus' }] : [{ label: 'π', text: 'π', aria: 'pi' }]),
  ];
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
          placeholder={surd ? 'e.g. 3 - 2√5' : 'e.g. (v - u)/t'}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={enter(onSubmit)}
        />
      </div>
      <KeyRow keys={keys} insert={insert} disabled={disabled} />
      <p className="expr-preview" id={`${id}-preview`} aria-live="polite">
        {preview?.tex ? (
          <>
            <span className="muted">Reads as </span>
            <Tex tex={preview.tex} />
          </>
        ) : preview?.error ? (
          <span className="muted">{preview.error}</span>
        ) : (
          <span className="muted">{surd ? 'Type √ (or sqrt) for a root: 6√2, 3 - 2√5, (1 + √3)/2. Brackets for a whole top or bottom.' : 'Use brackets for a whole top or bottom: (v - u)/t. sqrt(…) or √ for a root.'}</span>
        )}
      </p>
    </div>
  );
}

function RootsInput({ input, value, onChange, onSubmit, disabled, autoFocus }: Props & { input: Extract<InputSpec, { kind: 'roots' }> }) {
  // One box to start with: the learner decides how many solutions there are.
  const vals = Array.isArray(value) && value.length > 0 ? value : [''];
  const set = (i: number, s: string) => onChange(vals.map((x, j) => (j === i ? s : x)));
  const remove = (i: number) => onChange(vals.filter((_, j) => j !== i));
  const surds = input.surds === true;
  // Read surd roots back as maths, with "a ± b" shown as the two roots it stands for.
  const preview = useMemo(() => {
    if (!surds) return null;
    const parts = vals.map((v) => v.replace(/^\s*[a-z]\s*=/i, '').trim()).filter(Boolean);
    if (!parts.length) return null;
    try {
      const all = parts.flatMap((p) => (/±|\+-/.test(p) ? [p.replace(/±|\+-/, '+'), p.replace(/±|\+-/, '-')] : [p]));
      return { tex: all.map((p) => `${input.variable} = ${surdTex(parseSurd(p).value)}`).join(' \\text{ or } '), error: null };
    } catch {
      return { tex: null, error: 'Type roots like -3 + √7, or both at once as -3 ± √7.' };
    }
  }, [surds, vals, input.variable]);
  const insertRoot = (i: number) => set(i, `${vals[i] ?? ''}√`);
  return (
    <div className="roots-input">
      <div className="answer-row roots" role="group" aria-label="Solutions">
        {vals.map((v, i) => (
          <span key={i} className="root">
            {i > 0 ? <span className="root-or">or</span> : null}
            <span className="answer-prefix" aria-hidden>
              <Tex tex={`${input.variable} =`} />
            </span>
            <input
              aria-label={`Solution ${i + 1}`}
              className={`answer-box ${surds ? 'answer-root-surd' : 'answer-narrow'}`}
              type="text"
              inputMode={surds ? 'text' : 'decimal'}
              autoComplete="off"
              placeholder={surds && i === 0 ? 'e.g. -3 ± √7' : undefined}
              value={v}
              disabled={disabled}
              autoFocus={(autoFocus && i === 0) || (i > 0 && i === vals.length - 1 && v === '')}
              onChange={(e) => set(i, e.target.value)}
              onKeyDown={enter(onSubmit)}
            />
            {surds ? (
              <button type="button" className="key" onClick={() => insertRoot(i)} disabled={disabled} aria-label={`Insert a square root in solution ${i + 1}`}>
                √
              </button>
            ) : (
              <button type="button" className="key key-sign" onClick={() => set(i, toggleSign(v))} disabled={disabled} aria-label={`Make solution ${i + 1} negative or positive`}>
                ±
              </button>
            )}
            {i > 0 ? (
              <button type="button" className="key key-remove" onClick={() => remove(i)} disabled={disabled} aria-label={`Remove solution ${i + 1}`}>
                ×
              </button>
            ) : null}
          </span>
        ))}
      </div>
      <button type="button" className="roots-add" onClick={() => onChange([...vals, ''])} disabled={disabled || vals.length >= 8}>
        + Add another solution
      </button>
      {surds ? (
        <p className="expr-preview" aria-live="polite">
          {preview?.tex ? (
            <>
              <span className="muted">Reads as </span>
              <Tex tex={preview.tex} />
            </>
          ) : (
            <span className="muted">{preview?.error ?? 'One root per box, or both at once with ±: -3 ± √7. Leave surds in simplest form.'}</span>
          )}
        </p>
      ) : null}
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

function PointInput({ input, value, onChange, onSubmit, disabled, autoFocus }: Props & { input: Extract<InputSpec, { kind: 'point' }> }) {
  const vals = Array.isArray(value) && value.length === 2 ? value : ['', ''];
  const set = (i: number, s: string) => onChange(vals.map((x, j) => (j === i ? s : x)));
  return (
    <div className="answer-row point-input" role="group" aria-label={`Coordinates of ${input.name}`}>
      <span className="answer-prefix" aria-hidden>
        <Tex tex={`${input.name}\\,(`} />
      </span>
      <input aria-label={`${input.name}, x-coordinate`} className="answer-box answer-narrow" type="text" inputMode="decimal" autoComplete="off" value={vals[0]} disabled={disabled} autoFocus={autoFocus} onChange={(e) => set(0, e.target.value)} onKeyDown={enter(onSubmit)} />
      <span className="point-sep" aria-hidden>
        ;
      </span>
      <input aria-label={`${input.name}, y-coordinate`} className="answer-box answer-narrow" type="text" inputMode="decimal" autoComplete="off" value={vals[1]} disabled={disabled} onChange={(e) => set(1, e.target.value)} onKeyDown={enter(onSubmit)} />
      <span className="answer-prefix" aria-hidden>
        <Tex tex=")" />
      </span>
    </div>
  );
}

/** a × 10^n: the exponent box sits raised, like the power it is, with its own ± (it is often negative). */
function ScientificInput({ value, onChange, onSubmit, disabled, autoFocus, describedBy }: Props) {
  const vals = Array.isArray(value) && value.length === 2 ? value : ['', ''];
  const set = (i: number, s: string) => onChange(vals.map((x, j) => (j === i ? s : x)));
  return (
    <div className="answer-row sci-input" role="group" aria-label="Scientific notation" aria-describedby={describedBy}>
      <input aria-label="Number in front" className="answer-box answer-narrow" type="text" inputMode="decimal" autoComplete="off" value={vals[0]} disabled={disabled} autoFocus={autoFocus} onChange={(e) => set(0, e.target.value)} onKeyDown={enter(onSubmit)} />
      <span className="sci-ten" aria-hidden>
        <Tex tex="\times 10" />
      </span>
      <span className="sci-power">
        <input aria-label="Power of 10" className="answer-box sci-exp" type="text" inputMode="numeric" autoComplete="off" value={vals[1]} disabled={disabled} onChange={(e) => set(1, e.target.value)} onKeyDown={enter(onSubmit)} />
        <button type="button" className="key key-sign" onClick={() => set(1, toggleSign(vals[1] ?? ''))} disabled={disabled} aria-label="Make the power negative or positive">
          ±
        </button>
      </span>
    </div>
  );
}

function ProofInput({ input, value, onChange, disabled, marks }: Props & { input: Extract<InputSpec, { kind: 'proof' }> }) {
  const blanks = input.rows.reduce((n, r) => n + ('blank' in r.s ? 1 : 0) + ('blank' in r.r ? 1 : 0), 0);
  const vals = Array.isArray(value) && value.length === blanks ? value : Array.from({ length: blanks }, () => '');
  const set = (i: number, v: string) => onChange(vals.map((x, j) => (j === i ? v : x)));
  const cell = (c: ProofCell, row: number, part: string) => {
    if (!('blank' in c)) return <span className="proof-text">{c.text}</span>;
    const wrong = marks?.includes(`${row}:${part}`);
    const state = marks ? (wrong ? ' is-wrong' : ' is-right') : '';
    return (
      <span className={`proof-cell${state}`}>
        <select className={`proof-select${vals[c.blank] ? '' : ' empty'}`} aria-label={`Step ${row + 1}, ${part}${marks ? (wrong ? ' (wrong)' : ' (right)') : ''}`} value={vals[c.blank]} disabled={disabled} onChange={(e) => set(c.blank, e.target.value)}>
          <option value="">Choose the {part}…</option>
          {c.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.text}
            </option>
          ))}
        </select>
        {marks ? (
          <span className="proof-flag" aria-hidden>
            {wrong ? '✗' : '✓'}
          </span>
        ) : null}
      </span>
    );
  };
  return (
    <ol className="proof-table" aria-label="Proof: statements and reasons">
      <li className="proof-head" aria-hidden>
        <span />
        <span>Statement</span>
        <span>Reason</span>
      </li>
      {input.rows.map((r, i) => (
        <li key={i} className="proof-row">
          <span className="proof-n" aria-hidden>
            {i + 1}
          </span>
          <span className="proof-s">{cell(r.s, i, 'statement')}</span>
          <span className="proof-r">{cell(r.r, i, 'reason')}</span>
        </li>
      ))}
    </ol>
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
  if (input.kind === 'roots') return Array.isArray(value) ? value.some((v) => v.trim() !== '') : value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0 && value.every((v) => v.trim() !== '');
  return value.trim() !== '' && !value.trim().endsWith('/') && !value.trim().startsWith('/');
}
