import { useResource, invalidate } from '../../lib/useResource.ts';
import { api } from '../../lib/api.ts';
import { Link, useRouter } from '../../lib/router.tsx';
import { Button, Loading, ErrorState, Mark } from '../../ui/primitives.tsx';
import { Icon } from '../../ui/Icon.tsx';
import { useStartActivity } from '../home/Home.tsx';
import { inDays, longDate, plural } from '../../lib/format.ts';
import type { ExamDetailResponse, PlanAction } from '../../../shared/api.ts';

const ACTION_WORD: Record<PlanAction, string> = { learn: 'Learn', practice: 'Practise', test: 'Test', review: 'Review', mock: 'Mock exam' };

export function ExamDetail({ id }: { id: string }) {
  const { data, error, loading, reload } = useResource<ExamDetailResponse>(`/api/exams/${id}`);
  const { start, busy, error: startError } = useStartActivity();
  const { navigate } = useRouter();
  if (loading && !data) return <Loading label="Estimating readiness" />;
  if (error && !data) return <ErrorState error={error} onRetry={() => void reload()} />;
  if (!data) return null;
  const { exam, readiness: r, plan } = data;

  const doItem = (action: PlanAction, skillId: string | null) => {
    if (action === 'mock') return void start('mock', { kind: 'test', examId: exam.id });
    if (!skillId) return;
    if (action === 'learn') return navigate(`/learn/${skillId}`);
    if (action === 'test') return void start(`${skillId}-t`, { kind: 'test', skillId, count: 5 });
    return void start(`${skillId}-p`, { kind: 'practice', skillId, count: action === 'review' ? 5 : 8 });
  };

  const remove = async () => {
    await api.del(`/api/exams/${id}`);
    invalidate('/api/exams', '/api/home');
    navigate('/exams', { replace: true });
  };

  const confidenceText = {
    low: `Low confidence: only ${r.assessed} of ${r.total} topics have been assessed. Untested topics count as "probably not ready", so this will move as you practise.`,
    medium: `Medium confidence, based on ${plural(r.answers, 'answer')} across ${r.assessed} of ${r.total} topics.`,
    high: `High confidence, based on ${plural(r.answers, 'answer')} across every topic.`,
  }[r.confidence];

  return (
    <div className="exam-detail">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/exams">Exam readiness</Link>
        <span aria-hidden>/</span>
        <span>{exam.title}</span>
      </nav>
      <header className="readiness-head">
        <div>
          <h1>{exam.title}</h1>
          <p className="lead">
            {longDate(exam.examDate)}, {exam.daysLeft >= 0 ? inDays(exam.daysLeft) : 'finished'}.
          </p>
        </div>
        <div className="readiness-score">
          <span className="score-num num">{r.score}%</span>
          <span className="muted">ready if the exam were today</span>
        </div>
      </header>
      <p className="readiness-confidence">{confidenceText}</p>

      <div className="readiness-grid">
        <section className="sheet">
          <h2 className="sheet-title">High risk</h2>
          {r.highRisk.length ? (
            <ul className="rows rows-tight">
              {r.highRisk.map((s) => (
                <li key={s.skillId}>
                  <Link to={`/learn/${s.skillId}`} className="row">
                    <span className="row-main">
                      <span className="row-title">{s.name}</span>
                      <span className="row-sub">{s.assessed ? `${s.mastery}% mastery` : 'Not assessed yet'}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">None. Nothing is below 50% or untested.</p>
          )}
        </section>
        <section className="sheet">
          <h2 className="sheet-title">Needs work</h2>
          {r.needsWork.length ? (
            <ul className="rows rows-tight">
              {r.needsWork.map((s) => (
                <li key={s.skillId}>
                  <Link to={`/learn/${s.skillId}`} className="row">
                    <span className="row-main">
                      <span className="row-title">{s.name}</span>
                    </span>
                    <span className="row-end num">{s.mastery}%</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Nothing in the middle band.</p>
          )}
        </section>
        <section className="sheet">
          <h2 className="sheet-title">Strong</h2>
          {r.strong.length ? (
            <ul className="rows rows-tight">
              {r.strong.map((s) => (
                <li key={s.skillId}>
                  <Link to={`/learn/${s.skillId}`} className="row">
                    <span className="row-main">
                      <span className="row-title">{s.name}</span>
                    </span>
                    <span className="row-end num">{s.mastery}%</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Nothing is secure yet. That&apos;s what the plan is for.</p>
          )}
        </section>
      </div>

      <section aria-labelledby="plan-title" className="plan">
        <div className="plan-head">
          <h2 id="plan-title" className="topic-title">
            Your plan
          </h2>
          <p className="muted">Rebuilt from your current mastery every time you open it. Weakest topics first, mixed across days, a mock exam at the end.</p>
        </div>
        {startError ? (
          <p className="form-error" role="alert">
            {startError}
          </p>
        ) : null}
        {plan.days.length ? (
          <ol className="plan-days">
            {plan.days.map((d, i) => (
              <li key={d.date} className={`plan-day${i === 0 ? ' today' : ''}`}>
                <h3>{i === 0 ? <Mark>Today</Mark> : i === 1 ? 'Tomorrow' : longDate(d.date)}</h3>
                {d.items.length ? (
                  <ul>
                    {d.items.map((it, k) => (
                      <li key={k} className={`plan-item${it.done ? ' done' : ''}`}>
                        <span className={`tag tag-${it.action}`}>{ACTION_WORD[it.action]}</span>
                        <span className="plan-label">{it.label.replace(/^[^:]+: /, '')}</span>
                        <span className="muted small num">{it.minutes} min</span>
                        {i === 0 ? (
                          it.done ? (
                            <span className="plan-done">
                              <Icon name="check" size={16} /> Done
                            </span>
                          ) : (
                            <Button size="sm" variant="secondary" busy={busy === (it.action === 'mock' ? 'mock' : `${it.skillId}-${it.action === 'test' ? 't' : 'p'}`)} onClick={() => doItem(it.action, it.skillId)}>
                              Start
                            </Button>
                          )
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted small">Rest day.</p>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">This exam date has passed.</p>
        )}
        {plan.overflow.length ? <p className="note">These didn&apos;t fit before the exam at your daily time: {plan.overflow.map((o) => o.name).join(', ')}. More minutes a day would cover them.</p> : null}
      </section>
      <div className="results-foot">
        <Button busy={busy === 'mock'} onClick={() => void start('mock', { kind: 'test', examId: exam.id })}>
          Take a mock exam now
        </Button>
        <Button variant="quiet" onClick={() => void remove()}>
          <Icon name="trash" size={16} /> Remove exam
        </Button>
      </div>
    </div>
  );
}
