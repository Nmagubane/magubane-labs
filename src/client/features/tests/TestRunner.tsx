/**
 * Assessment mode. Clearly different from practice: no hints, no tutor, no feedback until submit.
 * Answers autosave; the server enforces the time limit.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../../lib/api.ts';
import { useRouter } from '../../lib/router.tsx';
import { useSession } from '../../lib/session.tsx';
import { invalidate } from '../../lib/useResource.ts';
import { clock, plural } from '../../lib/format.ts';
import { Button, Loading, ErrorState, Logo } from '../../ui/primitives.tsx';
import { Icon } from '../../ui/Icon.tsx';
import { QuestionView } from '../questions/QuestionView.tsx';
import { hasAnswer } from '../questions/AnswerInput.tsx';
import { defaultValue } from '../practice/QuestionCard.tsx';
import type { ActivityStateResponse, ResponseValue, AnswerResponse } from '../../../shared/api.ts';

type Confidence = 'guess' | 'unsure' | 'sure';

export function TestRunner({ id }: { id: string }) {
  const { navigate } = useRouter();
  const { refresh } = useSession();
  const [state, setState] = useState<ActivityStateResponse | null>(null);
  const [idx, setIdx] = useState(0);
  const [values, setValues] = useState<Record<string, ResponseValue | null>>({});
  const [skipped, setSkipped] = useState<Record<string, boolean>>({});
  const [conf, setConf] = useState<Record<string, Confidence | undefined>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [remaining, setRemaining] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const timeOn = useRef(performance.now());
  const submitting = useRef(false);

  const isBaseline = state?.activity.kind === 'baseline';

  useEffect(() => {
    api
      .get<ActivityStateResponse>(`/api/activities/${id}`)
      .then((s) => {
        if (s.activity.mode !== 'assessment') return navigate(`/practice/${id}`, { replace: true });
        if (s.activity.status === 'completed') return navigate(`/results/${id}`, { replace: true });
        setState(s);
        const v: Record<string, ResponseValue | null> = {};
        const sv: Record<string, boolean> = {};
        for (const it of s.items) {
          v[it.question.id] = it.response ?? defaultValue(it);
          sv[it.question.id] = it.response !== null;
        }
        setValues(v);
        setSaved(sv);
        setRemaining(s.activity.remainingSec);
        const firstOpen = s.items.findIndex((it) => it.response === null);
        setIdx(firstOpen >= 0 ? firstOpen : 0);
      })
      .catch((e: ApiError) => setError(e));
  }, [id, navigate]);

  const submit = useCallback(async () => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      await api.post(`/api/activities/${id}/submit`);
      invalidate('/api');
      if (isBaseline) await refresh();
      navigate(`/results/${id}`, { replace: true });
    } catch (e) {
      submitting.current = false;
      setError(e as ApiError);
      setBusy(false);
    }
  }, [id, isBaseline, navigate, refresh]);

  // Countdown (display only — the server is the authority).
  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0) {
      void submit();
      return;
    }
    const t = window.setTimeout(() => setRemaining((r) => (r === null ? null : r - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [remaining, submit]);

  const save = async (questionId: string, opts?: { skip?: boolean }): Promise<boolean> => {
    if (!state) return false;
    const item = state.items.find((i) => i.question.id === questionId);
    if (!item) return false;
    const value = values[questionId] ?? null;
    const skip = opts?.skip === true;
    if (!skip && !hasAnswer(item.question.input, value)) return true; // nothing to save, move on
    const elapsed = Math.round(performance.now() - timeOn.current);
    timeOn.current = performance.now();
    try {
      await api.post<AnswerResponse>(`/api/questions/${questionId}/answer`, { response: skip ? null : value, skipped: skip, timeMs: elapsed, ...(conf[questionId] ? { confidence: conf[questionId] } : {}) });
      setSaved((s) => ({ ...s, [questionId]: true }));
      setSkipped((s) => ({ ...s, [questionId]: skip }));
      setFieldError(null);
      return true;
    } catch (e) {
      const ae = e as ApiError;
      if (ae.code === 'time_up') {
        navigate(`/results/${id}`, { replace: true });
        return false;
      }
      setFieldError(ae.code === 'unreadable' ? `${ae.message} Fix it before moving on.` : ae.message);
      return false;
    }
  };

  const go = async (to: number, skip = false) => {
    if (!state) return;
    const q = state.items[idx];
    if (q && !(await save(q.question.id, { skip }))) return;
    setIdx(Math.max(0, Math.min(state.items.length - 1, to)));
  };

  if (error && !state) return <ErrorState error={error} onRetry={() => window.location.reload()} />;
  if (!state) return <Loading label="Preparing your questions" />;

  const item = state.items[idx]!;
  const qid = item.question.id;
  const answeredCount = state.items.filter((it) => saved[it.question.id] || skipped[it.question.id]).length;
  const unanswered = state.items.length - answeredCount;
  const last = idx === state.items.length - 1;
  const lowTime = remaining !== null && remaining <= 60;

  return (
    <div className="runner runner-test">
      <header className="runner-bar">
        <span className="runner-logo">
          <Logo compact />
        </span>
        <div className="runner-title">
          <h1>{state.activity.title}</h1>
          <p className="runner-sub">
            <Icon name="lock" size={14} /> {isBaseline ? 'No feedback until the end, so just do your best.' : 'Test mode. Hints and the tutor are off until you submit.'}
          </p>
        </div>
        {remaining !== null ? (
          <p className={`timer${lowTime ? ' low' : ''}`} role="timer" aria-live={lowTime ? 'assertive' : 'off'} aria-label={`${clock(remaining)} remaining`}>
            <Icon name="clock" size={18} /> <span className="num">{clock(remaining)}</span>
          </p>
        ) : null}
        <Button variant="secondary" size="sm" onClick={() => setConfirm(true)}>
          Submit
        </Button>
      </header>

      <div className="test-layout">
        <nav className="qnav" aria-label="Questions">
          <ol>
            {state.items.map((it, i) => {
              const done = saved[it.question.id] || skipped[it.question.id];
              return (
                <li key={it.question.id}>
                  <button type="button" className={`qnav-btn${i === idx ? ' now' : ''}${done ? ' done' : ''}`} aria-current={i === idx ? 'step' : undefined} aria-label={`Question ${i + 1}${done ? ', answered' : ''}`} onClick={() => void go(i)}>
                    {i + 1}
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="muted small">
            {answeredCount} of {state.items.length} answered
          </p>
        </nav>

        <div className="test-main">
          <div className="qcard graph-paper">
            <QuestionView
              key={qid}
              question={item.question}
              value={values[qid] ?? null}
              onChange={(v) => {
                setValues((s) => ({ ...s, [qid]: v }));
                setSaved((s) => ({ ...s, [qid]: false }));
                setSkipped((s) => ({ ...s, [qid]: false }));
              }}
              onSubmit={() => void go(idx + 1)}
              number={`Question ${idx + 1} of ${state.items.length}`}
              showLevel={false}
              autoFocus
            />
            {fieldError ? (
              <p className="form-error" role="alert">
                {fieldError}
              </p>
            ) : null}
            {!isBaseline ? (
              <fieldset className="confidence">
                <legend>How sure are you? (optional)</legend>
                {(['guess', 'unsure', 'sure'] as Confidence[]).map((c) => (
                  <label key={c} className={`chip${conf[qid] === c ? ' on' : ''}`}>
                    <input type="radio" name={`conf-${qid}`} checked={conf[qid] === c} onChange={() => setConf((s) => ({ ...s, [qid]: c }))} />
                    {c === 'guess' ? 'Guessing' : c === 'unsure' ? 'Not sure' : 'Sure'}
                  </label>
                ))}
              </fieldset>
            ) : null}
            <div className="qcard-actions">
              <Button variant="quiet" disabled={idx === 0} onClick={() => void go(idx - 1)}>
                Previous
              </Button>
              {isBaseline ? (
                <Button variant="secondary" onClick={() => (last ? void save(qid, { skip: true }).then((ok) => ok && setConfirm(true)) : void go(idx + 1, true))}>
                  I haven&apos;t learnt this
                </Button>
              ) : null}
              {last ? (
                <Button onClick={() => void save(qid).then((ok) => ok && setConfirm(true))}>Review and submit</Button>
              ) : (
                <Button onClick={() => void go(idx + 1)}>{hasAnswer(item.question.input, values[qid] ?? null) ? 'Save and next' : 'Next'}</Button>
              )}
            </div>
          </div>
          {error ? <ErrorState error={error} /> : null}
        </div>
      </div>

      {confirm ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setConfirm(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Escape' && setConfirm(false)}>
            <h2 id="confirm-title">Submit {isBaseline ? 'your check' : 'the test'}?</h2>
            <p>{unanswered > 0 ? `${plural(unanswered, 'question')} ${unanswered === 1 ? 'has' : 'have'} no answer. ${isBaseline ? 'Those count as not learnt yet, which is fine.' : 'Unanswered questions are marked wrong.'}` : 'Every question has an answer.'}</p>
            <p className="muted">You&apos;ll see your marks, the worked solutions and what to work on next.</p>
            <div className="row-actions">
              <Button busy={busy} onClick={() => void save(qid).then(() => submit())} autoFocus>
                Submit
              </Button>
              <Button variant="secondary" onClick={() => setConfirm(false)}>
                Keep working
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
