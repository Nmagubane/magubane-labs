/**
 * The "try one" on the sign-in page: a two-step equation, solved by choosing what to do next.
 * One decision at a time, every choice explained in plain words, and a worked check at the end.
 * It should take a curious 11-year-old about 30 seconds and end with "wait, I can do this".
 */
import { useState } from 'react';
import { Tex } from '../../ui/RichText.tsx';
import { Link } from '../../lib/router.tsx';

interface Puzzle {
  a: number;
  b: number;
  x: number;
}
const make = (prev?: Puzzle): Puzzle => {
  for (;;) {
    const p = { a: 2 + Math.floor(Math.random() * 5), b: 1 + Math.floor(Math.random() * 9), x: 2 + Math.floor(Math.random() * 8) };
    if (!prev || p.a !== prev.a || p.b !== prev.b || p.x !== prev.x) return p;
  }
};

type Choice = { label: string; right: boolean; feedback: (p: Puzzle) => string };
const STEP1: Choice[] = [
  { label: 'Take {b} away from both sides', right: true, feedback: () => '' },
  { label: 'Divide both sides by {a}', right: false, feedback: (p) => `That's allowed, but then every part gets divided and you end up with fractions. Undo the + ${p.b} first: it keeps the numbers whole.` },
  { label: 'Add {b} to both sides', right: false, feedback: (p) => `That gives ${p.a}x + ${2 * p.b} = ${p.a * p.x + 2 * p.b}: x is further from being on its own. Do the opposite of + ${p.b}.` },
];
const STEP2: Choice[] = [
  { label: 'Divide both sides by {a}', right: true, feedback: () => '' },
  { label: 'Take {a} away from both sides', right: false, feedback: (p) => `${p.a}x means ${p.a} × x: the ${p.a} is multiplying, not added. The opposite of multiplying is dividing.` },
  { label: 'Multiply both sides by {a}', right: false, feedback: (p) => `That gives ${p.a * p.a}x: even more x's, not one. Do the opposite of × ${p.a}.` },
];
const fill = (s: string, p: Puzzle) => s.replace(/\{a\}/g, String(p.a)).replace(/\{b\}/g, String(p.b));

export function TryOne() {
  const [p, setP] = useState<Puzzle>({ a: 3, b: 5, x: 5 });
  const [step, setStep] = useState(0); // 0: first move, 1: second move, 2: solved
  const [hint, setHint] = useState<string | null>(null);
  const [tried, setTried] = useState<string[]>([]);
  const [order] = useState(() => [STEP1, STEP2].map((list) => [...list].sort(() => Math.random() - 0.5)));
  const c = p.a * p.x + p.b;
  const choose = (ch: Choice) => {
    if (ch.right) {
      setStep(step + 1);
      setHint(null);
      setTried([]);
    } else {
      setHint(ch.feedback(p));
      setTried([...tried, ch.label]);
    }
  };
  const again = () => {
    setP(make(p));
    setStep(0);
    setHint(null);
    setTried([]);
  };
  const choices = step < 2 ? order[step]! : [];
  return (
    <div className="try">
      <p className="try-kicker">Try one. No account needed.</p>
      <p className="try-ask">
        What is <Tex tex="x" />?
      </p>
      <ol className="try-work" aria-label="Working">
        <li>
          <Tex tex={`${p.a}x + ${p.b} = ${c}`} />
        </li>
        {step >= 1 ? (
          <li>
            <Tex tex={`${p.a}x = ${c - p.b}`} />
            <span className="try-margin">
              <Tex tex={`-${p.b}`} /> both sides
            </span>
          </li>
        ) : null}
        {step >= 2 ? (
          <li className="try-answer">
            <Tex tex={`x = ${p.x}`} />
            <span className="try-margin">
              <Tex tex={`\\div ${p.a}`} /> both sides
            </span>
          </li>
        ) : null}
      </ol>
      <div aria-live="polite">
        {step < 2 ? (
          <>
            <p className="try-q">
              <span className="try-step">Step {step + 1} of 2.</span> {step === 0 ? `Something has been added to ${p.a}x. What do you do first?` : `x is being multiplied by ${p.a}. What next?`}
            </p>
            <div className="try-choices">
              {choices.map((ch) => (
                <button key={ch.label} type="button" className={`try-choice${tried.includes(ch.label) ? ' off' : ''}`} onClick={() => choose(ch)}>
                  {fill(ch.label, p)}
                </button>
              ))}
            </div>
            {hint ? <p className="try-hint">{hint}</p> : <p className="try-tip">Whatever you do to one side, do to the other. Like a balanced scale.</p>}
          </>
        ) : (
          <div className="try-done">
            <p>
              <strong>Solved.</strong> Check it: <Tex tex={`${p.a} \\times ${p.x} + ${p.b} = ${c}`} /> ✓
            </p>
            <p className="muted">You just solved a two-step equation, the way it&apos;s done in Grade 8.</p>
            <p className="try-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={again}>
                <span>Try another</span>
              </button>
              <Link to="/signup" className="btn btn-quiet btn-sm">
                <span>Keep going: create a free account</span>
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
