import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api.ts';
import { useRouter, Link } from '../../lib/router.tsx';
import { invalidate } from '../../lib/useResource.ts';
import { Button, Loading, ErrorState, Logo } from '../../ui/primitives.tsx';
import { Icon } from '../../ui/Icon.tsx';
import { QuestionCard } from './QuestionCard.tsx';
import type { ActivityStateResponse, PracticeItem, AnswerResponse, ResultsDto } from '../../../shared/api.ts';

export function PracticeRunner({ id }: { id: string }) {
  const { navigate } = useRouter();
  const [state, setState] = useState<ActivityStateResponse | null>(null);
  const [current, setCurrent] = useState<PracticeItem | null>(null);
  const [answered, setAnswered] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [currentDone, setCurrentDone] = useState(false);

  const fetchNext = useCallback(
    async (adjust?: 'easier' | 'harder' | 'same') => {
      setBusy(adjust ?? 'next');
      setError(null);
      try {
        const it = await api.post<PracticeItem>(`/api/activities/${id}/next`, adjust ? { adjust } : {});
        setCurrent(it);
        setCurrentDone(it.feedback !== null);
        if (adjust === 'easier') setOffset((o) => Math.max(-2, o - 1));
        if (adjust === 'harder') setOffset((o) => Math.min(2, o + 1));
      } catch (e) {
        const ae = e as ApiError;
        if (ae.code === 'complete') setDone(true);
        else setError(ae);
      } finally {
        setBusy(null);
      }
    },
    [id],
  );

  useEffect(() => {
    api
      .get<ActivityStateResponse>(`/api/activities/${id}`)
      .then((s) => {
        if (s.activity.mode !== 'learning') return navigate(`/tests/${id}`, { replace: true });
        if (s.activity.status === 'completed') return navigate(`/results/${id}`, { replace: true });
        setState(s);
        setAnswered(s.answered);
        setOffset(s.activity.difficultyOffset);
        const open = s.items.find((i) => !i.feedback);
        if (open) {
          setCurrent(open);
          setCurrentDone(false);
        }
        else if (s.answered >= s.activity.targetCount) setDone(true);
        else void fetchNext();
      })
      .catch((e: ApiError) => setError(e));
  }, [id, fetchNext, navigate]);

  const finish = async () => {
    setBusy('finish');
    try {
      await api.post<ResultsDto>(`/api/activities/${id}/submit`);
      invalidate('/api/home', '/api/progress', '/api/catalogue', '/api/skills');
      navigate(`/results/${id}`, { replace: true });
    } catch (e) {
      const ae = e as ApiError;
      if (ae.code === 'empty') navigate('/practice', { replace: true });
      else setError(ae);
    } finally {
      setBusy(null);
    }
  };

  const onAnswered = (r: AnswerResponse) => {
    setCurrentDone(true);
    setAnswered(r.answered);
    if (r.done) setDone(true);
  };

  if (error && !state) return <ErrorState error={error} onRetry={() => window.location.reload()} />;
  if (!state) return <Loading label="Setting up your practice" />;
  const target = state.activity.targetCount;

  return (
    <div className="runner">
      <header className="runner-bar">
        <Link to="/home" className="runner-logo" aria-label="Leave practice and go home">
          <Logo compact />
        </Link>
        <div className="runner-title">
          <h1>{state.activity.title}</h1>
          <p className="runner-sub">Learning mode: hints, feedback and the tutor are on.</p>
        </div>
        <div className="runner-progress" aria-label={`${answered} of ${target} answered`}>
          <span className="num">
            {answered}/{target}
          </span>
          <span className="dots" aria-hidden>
            {Array.from({ length: target }, (_, i) => (
              <i key={i} className={i < answered ? 'on' : ''} />
            ))}
          </span>
        </div>
        <Button variant="quiet" size="sm" busy={busy === 'finish'} onClick={() => void finish()}>
          {answered ? 'Finish' : 'Leave'}
        </Button>
      </header>

      <div className="runner-body">
        {error ? <ErrorState error={error} onRetry={() => void fetchNext()} /> : null}
        {done ? (
          <section className="runner-done">
            <h2>Set complete.</h2>
            <p>See what changed, including any mistakes worth fixing.</p>
            <div className="row-actions">
              <Button size="lg" busy={busy === 'finish'} onClick={() => void finish()}>
                See results
              </Button>
            </div>
          </section>
        ) : current ? (
          <QuestionCard
            key={current.question.id}
            item={current}
            number={`Question ${Math.min(answered + (currentDone ? 0 : 1), target)} of ${target}`}
            onAnswered={onAnswered}
            afterFeedback={
              answered < target ? (
                <>
                  <Button busy={busy === 'next'} onClick={() => void fetchNext()} autoFocus>
                    Next question
                  </Button>
                  <Button variant="secondary" busy={busy === 'same'} onClick={() => void fetchNext('same')}>
                    More like this
                  </Button>
                </>
              ) : (
                <Button busy={busy === 'finish'} onClick={() => void finish()} autoFocus>
                  See results
                </Button>
              )
            }
          />
        ) : (
          <Loading label="Choosing your next question" />
        )}

        <div className="difficulty" role="group" aria-label="Adjust difficulty">
          <span className="muted small">Difficulty for the next question{offset ? ` (${offset > 0 ? 'harder' : 'easier'} than usual)` : ''}:</span>
          <Button variant="quiet" size="sm" disabled={!!busy || done || (current !== null && !currentDone) || offset <= -2} onClick={() => void fetchNext('easier')}>
            <Icon name="back" size={16} /> Easier
          </Button>
          <Button variant="quiet" size="sm" disabled={!!busy || done || (current !== null && !currentDone) || offset >= 2} onClick={() => void fetchNext('harder')}>
            Harder
          </Button>
        </div>
      </div>
    </div>
  );
}
