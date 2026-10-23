import { useState } from 'react';
import { useResource } from '../../lib/useResource.ts';
import { Link } from '../../lib/router.tsx';
import { Button, Loading, ErrorState, PageHeader, BandDot, Segmented } from '../../ui/primitives.tsx';
import { useStartActivity } from '../home/Home.tsx';
import { relativeDay, minutes as fmtMinutes } from '../../lib/format.ts';
import type { CatalogueResponse, ActivityDto, ExamDto } from '../../../shared/api.ts';

type Listed = ActivityDto & { scorePct: number | null };

export function TestsHub() {
  const cat = useResource<CatalogueResponse>('/api/catalogue');
  const past = useResource<Listed[]>('/api/activities?kind=test,baseline');
  const exams = useResource<ExamDto[]>('/api/exams');
  const { start, busy, error } = useStartActivity();
  const [timed, setTimed] = useState<'timed' | 'untimed'>('timed');
  if ((cat.loading && !cat.data) || (past.loading && !past.data)) return <Loading />;
  if (cat.error && !cat.data) return <ErrorState error={cat.error} onRetry={() => void cat.reload()} />;
  if (!cat.data || !past.data) return null;
  const t = timed === 'timed';
  const inProgress = past.data.find((a) => a.status === 'in_progress');

  return (
    <div className="tests-hub">
      <PageHeader title="Tests" lead="Test mode measures what you can do on your own: no hints, no tutor and no feedback until you submit. Every learner gets different numbers.">
        <Segmented label="Timing" value={timed} onChange={setTimed} options={[{ value: 'timed', label: 'Timed' }, { value: 'untimed', label: 'Untimed' }]} />
      </PageHeader>

      {inProgress ? (
        <div className="banner banner-test" role="status">
          <span>
            <strong>{inProgress.title}</strong> is in progress.
          </span>
          <Link to={`/tests/${inProgress.id}`} className="btn btn-primary btn-sm">
            <span>Return to it</span>
          </Link>
        </div>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="tests-grid">
        <section className="sheet">
          <h2 className="sheet-title">Mixed test</h2>
          <p className="muted">10 questions across everything you&apos;ve started. Good for an honest check-in.{t ? ' 15 minutes.' : ''}</p>
          <Button busy={busy === 'mixed'} onClick={() => void start('mixed', { kind: 'test', count: 10, timed: t })}>
            Start mixed test
          </Button>
        </section>
        <section className="sheet">
          <h2 className="sheet-title">Weak-areas test</h2>
          <p className="muted">10 questions on the skills below Proficient. See whether your practice is working.</p>
          <Button variant="secondary" busy={busy === 'weak'} onClick={() => void start('weak', { kind: 'test', weak: true, count: 10, timed: t })}>
            Start weak-areas test
          </Button>
        </section>
        {exams.data?.length ? (
          <section className="sheet">
            <h2 className="sheet-title">Mock exam</h2>
            <p className="muted">Everything on your exam, under exam-like timing.</p>
            {exams.data.map((e) => (
              <Button key={e.id} variant="secondary" busy={busy === e.id} onClick={() => void start(e.id, { kind: 'test', examId: e.id, timed: t })}>
                Mock: {e.title}
              </Button>
            ))}
          </section>
        ) : null}
      </div>

      <section aria-labelledby="topic-tests">
        <h2 id="topic-tests" className="topic-title">
          Topic tests
        </h2>
        {cat.data.subjects.map((s) => (
          <div key={s.id} className="topic-tests">
            <h3 className="subject-mini">{s.name}</h3>
            <ul className="chip-list">
              {s.topics.map((tp) => (
                <li key={tp.id}>
                  <button type="button" className="chip chip-lg" disabled={busy === tp.id} onClick={() => void start(tp.id, { kind: 'test', topicId: tp.id, count: 10, timed: t })}>
                    {tp.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section aria-labelledby="past-tests" className="past">
        <h2 id="past-tests" className="topic-title">
          Past results
        </h2>
        {past.data.filter((a) => a.status === 'completed').length ? (
          <ul className="rows">
            {past.data
              .filter((a) => a.status === 'completed')
              .map((a) => (
                <li key={a.id}>
                  <Link to={`/results/${a.id}`} className="row">
                    <BandDot band={(a.scorePct ?? 0) >= 85 ? 'mastered' : (a.scorePct ?? 0) >= 70 ? 'proficient' : (a.scorePct ?? 0) >= 40 ? 'developing' : 'learning'} />
                    <span className="row-main">
                      <span className="row-title">{a.title}</span>
                      <span className="row-sub">
                        {relativeDay(a.completedAt as string)}
                        {a.timeLimitSec ? `. ${fmtMinutes(a.timeLimitSec)} limit` : ''}
                      </span>
                    </span>
                    <span className="row-end num">{a.scorePct ?? '–'}%</span>
                  </Link>
                </li>
              ))}
          </ul>
        ) : (
          <p className="muted">No tests yet. Your first one sets the baseline that later results are compared against.</p>
        )}
      </section>
    </div>
  );
}
