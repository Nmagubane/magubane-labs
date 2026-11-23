/** One learning-mode question: answer, hints, feedback. Used by practice sessions and lesson checks. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { api, ApiError } from '../../lib/api.ts';
import { useRouter } from '../../lib/router.tsx';
import { Button } from '../../ui/primitives.tsx';
import { Rich } from '../../ui/RichText.tsx';
import { Icon } from '../../ui/Icon.tsx';
import { QuestionView, FeedbackPanel } from '../questions/QuestionView.tsx';
import { hasAnswer } from '../questions/AnswerInput.tsx';
import type { PracticeItem, AnswerResponse, ResponseValue, TutorConversationDetail } from '../../../shared/api.ts';

export function defaultValue(item: PracticeItem): ResponseValue | null {
  if (item.question.input.kind === 'coefficients') return item.question.input.species.map(() => '');
  if (item.question.input.kind === 'roots') return [''];
  if (item.question.input.kind === 'proof') return item.question.input.rows.flatMap((r) => [r.s, r.r]).filter((c) => 'blank' in c).map(() => '');
  return null;
}

export function useAskTutor() {
  const { navigate } = useRouter();
  const [error, setError] = useState<string | null>(null);
  const ask = async (questionId: string) => {
    setError(null);
    try {
      const c = await api.post<TutorConversationDetail>('/api/tutor/conversations', { questionId });
      navigate(`/tutor/${c.id}`);
    } catch (e) {
      setError((e as ApiError).message);
    }
  };
  return { ask, error };
}

export function QuestionCard({
  item,
  onAnswered,
  number,
  afterFeedback,
  autoFocus = true,
}: {
  item: PracticeItem;
  onAnswered?: (r: AnswerResponse) => void;
  number?: ReactNode;
  afterFeedback?: ReactNode;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState<ResponseValue | null>(item.response ?? defaultValue(item));
  const [hints, setHints] = useState<string[]>(item.hints);
  const [feedback, setFeedback] = useState(item.feedback);
  const [tryAgain, setTryAgain] = useState(item.tryAgain);
  const [busy, setBusy] = useState<'check' | 'hint' | 'reveal' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(performance.now());
  const { ask, error: tutorError } = useAskTutor();

  useEffect(() => {
    setValue(item.response ?? defaultValue(item));
    setHints(item.hints);
    setFeedback(item.feedback);
    setTryAgain(item.tryAgain);
    setError(null);
    started.current = performance.now();
  }, [item]);

  // A second try must be a different answer: sending the same one again would just use up the try.
  const unchanged = !!tryAgain && JSON.stringify(value) === JSON.stringify(tryAgain.response);

  const send = async (body: { response: ResponseValue | null; reveal?: boolean }) => {
    const res = await api.post<AnswerResponse>(`/api/questions/${item.question.id}/answer`, { ...body, timeMs: Math.round(performance.now() - started.current) });
    started.current = performance.now();
    if (res.tryAgain) {
      setTryAgain(res.tryAgain);
      return;
    }
    setFeedback(res.feedback);
    onAnswered?.(res);
  };

  const check = async () => {
    if (feedback || unchanged || !hasAnswer(item.question.input, value)) return;
    setBusy('check');
    setError(null);
    try {
      await send({ response: value });
    } catch (e) {
      const ae = e as ApiError;
      setError(ae.code === 'unreadable' ? `${ae.message} This doesn't count against you.` : ae.message);
    } finally {
      setBusy(null);
    }
  };

  const reveal = async () => {
    setBusy('reveal');
    setError(null);
    try {
      await send({ response: null, reveal: true });
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(null);
    }
  };

  const hint = async () => {
    setBusy('hint');
    setError(null);
    try {
      const res = await api.post<{ hint: string; index: number; remaining: number }>(`/api/questions/${item.question.id}/hint`);
      setHints((h) => [...h, res.hint]);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(null);
    }
  };

  const hintsLeft = item.question.hintsAvailable - hints.length;

  return (
    <div className="qcard graph-paper">
      <QuestionView question={item.question} value={value} onChange={setValue} onSubmit={() => void check()} disabled={!!feedback} autoFocus={autoFocus} number={number} marks={feedback ? (feedback.correct ? [] : feedback.wrongIds) : undefined} />
      {hints.length ? (
        <ol className="hints" aria-label="Hints">
          {hints.map((h, i) => (
            <li key={i}>
              <span className="hint-n">Hint {i + 1}</span> <Rich text={h} />
            </li>
          ))}
        </ol>
      ) : null}
      {tryAgain && !feedback ? (
        <section className="try-again" aria-live="polite">
          <h3>
            Not yet{tryAgain.mistake ? <span className="try-again-label">: {tryAgain.mistake.label}</span> : null}
          </h3>
          {tryAgain.feedback ? <Rich text={tryAgain.feedback} as="p" /> : null}
          {tryAgain.mistake ? <p className="feedback-tip">{tryAgain.mistake.tip}</p> : null}
          {!tryAgain.mistake && !tryAgain.feedback ? <p>That isn&apos;t it. Go back over each step, or take a hint.</p> : null}
          <p className="try-again-next">{unchanged ? 'Change your answer, then check it again.' : 'Have another go: check your new answer.'}</p>
        </section>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {!feedback ? (
        <div className="qcard-actions">
          <Button size="lg" busy={busy === 'check'} disabled={unchanged || !hasAnswer(item.question.input, value)} onClick={() => void check()}>
            {tryAgain ? 'Check again' : 'Check answer'}
          </Button>
          {hintsLeft > 0 ? (
            <Button variant="secondary" busy={busy === 'hint'} onClick={() => void hint()}>
              <Icon name="hint" size={18} /> {hints.length ? 'Another hint' : 'Hint'}
            </Button>
          ) : null}
          <Button variant="quiet" onClick={() => void ask(item.question.id)}>
            Ask the tutor
          </Button>
          {tryAgain ? (
            <Button variant="quiet" busy={busy === 'reveal'} onClick={() => void reveal()}>
              Show me the answer
            </Button>
          ) : null}
          {hints.length ? <span className="muted small">Hints lower the credit for this question a little. Learning is what counts.</span> : null}
        </div>
      ) : (
        <FeedbackPanel feedback={feedback} response={value} input={item.question.input}>
          {afterFeedback}
          <Button variant="quiet" onClick={() => void ask(item.question.id)}>
            {feedback.correct ? 'Discuss with the tutor' : 'Ask the tutor why'}
          </Button>
        </FeedbackPanel>
      )}
      {tutorError ? (
        <p className="form-error" role="alert">
          {tutorError}
        </p>
      ) : null}
    </div>
  );
}
