/**
 * Solve a linear equation by choosing operations that apply to both sides.
 * Working is written like an exercise book: each line, with the operation in the margin.
 * The learner decides every step; the widget only checks legality and notices when a step
 * made things messier rather than simpler.
 */
import { useMemo, useState } from 'react';
import { rat, add, sub, mul, div, isZero, eq, type Rational } from '../../../shared/questions/rational.ts';
import { parseNumber } from '../../../shared/questions/answer.ts';
import { Tex } from '../../ui/RichText.tsx';
import { Button } from '../../ui/primitives.tsx';

interface Side {
  x: Rational;
  k: Rational;
}
interface Eqn {
  l: Side;
  r: Side;
}
type Op = '+' | '-' | '×' | '÷';
interface Step {
  op: Op;
  value: Rational;
  isX: boolean;
  eqn: Eqn;
  messier: boolean;
}

function coefTex(c: Rational, withX: boolean, first: boolean): string {
  if (isZero(c)) return '';
  const neg = c.n < 0;
  const absN = Math.abs(c.n);
  let body: string;
  if (withX) body = c.d === 1 ? (absN === 1 ? 'x' : `${absN}x`) : `\\tfrac{${absN}}{${c.d}}x`;
  else body = c.d === 1 ? String(absN) : `\\tfrac{${absN}}{${c.d}}`;
  if (first) return neg ? `-${body}` : body;
  return neg ? ` - ${body}` : ` + ${body}`;
}

function sideTex(s: Side): string {
  const a = coefTex(s.x, true, true);
  const b = coefTex(s.k, false, a === '');
  return a + b || '0';
}

const eqnTex = (e: Eqn) => `${sideTex(e.l)} = ${sideTex(e.r)}`;

function complexity(e: Eqn): number {
  const terms = [e.l.x, e.l.k, e.r.x, e.r.k].filter((c) => !isZero(c)).length;
  const fracs = [e.l.x, e.l.k, e.r.x, e.r.k].filter((c) => c.d !== 1).length;
  const xBoth = !isZero(e.l.x) && !isZero(e.r.x) ? 1 : 0;
  return terms + fracs + xBoth;
}

function solved(e: Eqn): Rational | null {
  const one = rat(1);
  if (eq(e.l.x, one) && isZero(e.l.k) && isZero(e.r.x)) return e.r.k;
  if (eq(e.r.x, one) && isZero(e.r.k) && isZero(e.l.x)) return e.l.k;
  return null;
}

function apply(e: Eqn, op: Op, v: Rational, isX: boolean): Eqn {
  const f = (s: Side): Side => {
    switch (op) {
      case '+':
        return isX ? { x: add(s.x, v), k: s.k } : { x: s.x, k: add(s.k, v) };
      case '-':
        return isX ? { x: sub(s.x, v), k: s.k } : { x: s.x, k: sub(s.k, v) };
      case '×':
        return { x: mul(s.x, v), k: mul(s.k, v) };
      case '÷':
        return { x: div(s.x, v), k: div(s.k, v) };
    }
  };
  return { l: f(e.l), r: f(e.r) };
}

const opTex: Record<Op, string> = { '+': '+', '-': '-', '×': '\\times', '÷': '\\div' };

function valueTex(v: Rational, isX: boolean): string {
  const t = v.d === 1 ? String(v.n) : `\\tfrac{${v.n}}{${v.d}}`;
  return isX ? (v.d === 1 && Math.abs(v.n) === 1 ? (v.n < 0 ? '(-x)' : 'x') : `${t}x`) : v.n < 0 ? `(${t})` : t;
}

export function EquationBalancer({ a, b, c, d }: { a: number; b: number; c: number; d: number }) {
  const start: Eqn = useMemo(() => ({ l: { x: rat(a), k: rat(b) }, r: { x: rat(c), k: rat(d) } }), [a, b, c, d]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [op, setOp] = useState<Op>('-');
  const [raw, setRaw] = useState('');
  const [isX, setIsX] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = steps.at(-1)?.eqn ?? start;
  const answer = solved(current);
  const last = steps.at(-1);

  const doApply = () => {
    const p = parseNumber(raw);
    if (!p || !p.exact) return setError('Type a number, like 4, -3 or 1/2.');
    if ((op === '×' || op === '÷') && isZero(p.exact)) return setError(op === '÷' ? 'You can never divide by zero.' : 'Multiplying both sides by 0 destroys the equation (0 = 0).');
    if (isX && (op === '×' || op === '÷')) return setError('Keep to numbers for × and ÷ here.');
    const next = apply(current, op, p.exact, isX);
    setSteps([...steps, { op, value: p.exact, isX, eqn: next, messier: complexity(next) > complexity(current) }]);
    setRaw('');
    setError(null);
  };

  const verify = (x: Rational) => {
    const lhs = add(mul(rat(a), x), rat(b));
    const rhs = add(mul(rat(c), x), rat(d));
    return eq(lhs, rhs);
  };

  return (
    <div className="eqb">
      <ol className="eqb-working" aria-label="Your working" aria-live="polite">
        <li className="eqb-line">
          <Tex tex={eqnTex(start)} />
          <span className="eqb-margin" aria-hidden />
        </li>
        {steps.map((s, i) => (
          <li key={i} className={`eqb-line${s.messier ? ' messier' : ''}`}>
            <Tex tex={eqnTex(s.eqn)} />
            <span className="eqb-margin">
              <Tex tex={`${opTex[s.op]}\\,${valueTex(s.value, s.isX)}`} />
              <span className="sr-only">applied to both sides</span>
            </span>
          </li>
        ))}
      </ol>

      {answer ? (
        <div className="eqb-solved" role="status">
          <p>
            <strong>Solved:</strong> <Tex tex={`x = ${answer.d === 1 ? answer.n : `\\tfrac{${answer.n}}{${answer.d}}`}`} />
          </p>
          <p className="muted">
            Check by substituting into the original: {verify(answer) ? 'both sides match.' : "they don't match, so look back through your steps."} You used {steps.length} step{steps.length === 1 ? '' : 's'}.
          </p>
        </div>
      ) : last?.messier ? (
        <p className="eqb-note" role="status">
          That step is allowed, but the equation got more complicated, not less. Try undoing it. What is stopping <Tex tex="x" /> from being alone?
        </p>
      ) : null}

      {!answer ? (
        <form
          className="eqb-controls"
          onSubmit={(e) => {
            e.preventDefault();
            doApply();
          }}
        >
          <span className="eqb-label">To both sides:</span>
          <div className="eqb-ops" role="radiogroup" aria-label="Operation">
            {(['+', '-', '×', '÷'] as Op[]).map((o) => (
              <button key={o} type="button" role="radio" aria-checked={op === o} className={`key${op === o ? ' on' : ''}`} onClick={() => setOp(o)} aria-label={{ '+': 'add', '-': 'subtract', '×': 'multiply by', '÷': 'divide by' }[o]}>
                {o === '-' ? '−' : o}
              </button>
            ))}
          </div>
          <input className="answer-box answer-narrow" aria-label="Number" inputMode="decimal" value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="4" />
          {op === '+' || op === '-' ? (
            <label className="eqb-xtoggle">
              <input type="checkbox" checked={isX} onChange={(e) => setIsX(e.target.checked)} /> <Tex tex="x" /> term
            </label>
          ) : null}
          <Button type="submit" variant="secondary" size="sm">
            Apply
          </Button>
        </form>
      ) : null}
      {error ? (
        <p className="field-msg" role="alert">
          {error}
        </p>
      ) : null}
      <div className="eqb-foot">
        <Button variant="quiet" size="sm" onClick={() => setSteps(steps.slice(0, -1))} disabled={!steps.length}>
          Undo step
        </Button>
        <Button
          variant="quiet"
          size="sm"
          onClick={() => {
            setSteps([]);
            setError(null);
          }}
          disabled={!steps.length}
        >
          Start again
        </Button>
      </div>
    </div>
  );
}
