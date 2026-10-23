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
  if (item.question.input.kind === 'roots') return Array.from({ length: item.question.input.count }, () => '');
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
  const [busy, setBusy] = useState<'check' | 'hint' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(performance.now());
  const { ask, error: tutorError } = useAskTutor();

  useEffect(() => {
    setValue(item.response ?? defaultValue(item));
    setHints(item.hints);
    setFeedback(item.feedback);
    setError(null);
    started.current = performance.now();
  }, [item]);

  const check = async () => {
    if (feedback || !hasAnswer(item.question.input, value)) return;
    setBusy('check');
    setError(null);
    try {
      const res = await api.post<AnswerResponse>(`/api/questions/${item.question.id}/answer`, { response: value, timeMs: Math.round(performance.now() - started.current) });
      setFeedback(res.feedback);
      onAnswered?.(res);
    } catch (e) {
      const ae = e as ApiError;
      setError(ae.code === 'unreadable' ? `${ae.message} This doesn't count against you.` : ae.message);
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
      <QuestionView question={item.question} value={value} onChange={setValue} onSubmit={() => void check()} disabled={!!feedback} autoFocus={autoFocus} number={number} />
      {hints.length ? (
        <ol className="hints" aria-label="Hints">
          {hints.map((h, i) => (
            <li key={i}>
              <span className="hint-n">Hint {i + 1}</span> <Rich text={h} />
            </li>
          ))}
        </ol>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {!feedback ? (
        <div className="qcard-actions">
          <Button size="lg" busy={busy === 'check'} disabled={!hasAnswer(item.question.input, value)} onClick={() => void check()}>
            Check answer
          </Button>
          {hintsLeft > 0 ? (
            <Button variant="secondary" busy={busy === 'hint'} onClick={() => void hint()}>
              <Icon name="hint" size={18} /> {hints.length ? 'Another hint' : 'Hint'}
            </Button>
          ) : null}
          <Button variant="quiet" onClick={() => void ask(item.question.id)}>
            Ask the tutor
          </Button>
          {hints.length ? <span className="muted small">Hints lower the credit for this question a little. Learning is what counts.</span> : null}
        </div>
      ) : (
        <FeedbackPanel feedback={feedback} response={value}>
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
