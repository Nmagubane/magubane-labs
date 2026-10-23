import { useResource } from '../../lib/useResource.ts';
import { Link } from '../../lib/router.tsx';
import { Loading, ErrorState, PageHeader, MasteryBar, Empty, ButtonLink } from '../../ui/primitives.tsx';
import { TrendChart } from './TrendChart.tsx';
import { relativeDay, plural } from '../../lib/format.ts';
import type { ProgressResponse, ExamDto } from '../../../shared/api.ts';

export function Progress() {
  const { data, error, loading, reload } = useResource<ProgressResponse>('/api/progress');
  const exams = useResource<ExamDto[]>('/api/exams');
  if (loading && !data) return <Loading label="Adding it all up" />;
  if (error && !data) return <ErrorState error={error} onRetry={() => void reload()} />;
  if (!data) return null;
  const t = data.totals;
  const hasData = t.questions > 0;

  return (
    <div className="progress-page">
      <PageHeader title="Progress" lead="What you know, what you don't yet, and whether it's improving.">
        <ButtonLink to="/exams" variant="secondary" size="sm">
          Exam readiness
        </ButtonLink>
      </PageHeader>

      {!hasData ? (
        <Empty title="Nothing to show yet" action={<ButtonLink to="/home">Go to Home</ButtonLink>}>
          Answer a few questions and your mastery map, trends and mistake patterns will appear here.
        </Empty>
      ) : (
        <>
          <section className="subject-summary" aria-label="Mastery by subject">
            {data.subjects.map((s) => (
              <div key={s.id} className="subject-stat">
                <h2>{s.name}</h2>
                <p className="subject-num">
                  <span className="num">{s.mastery === null ? '–' : `${s.mastery}%`}</span>
                </p>
                <p className="muted small">
                  average across {s.started} of {plural(s.total, 'skill')} started
                </p>
              </div>
            ))}
            <div className="subject-stat">
              <h2>Last 30 days</h2>
              <p className="subject-num">
                <span className="num">{t.improvement30 === null ? '–' : `${t.improvement30 >= 0 ? '+' : ''}${t.improvement30}`}</span>
              </p>
              <p className="muted small">mastery points gained, on average, per skill you practised</p>
            </div>
          </section>

          <section className="sheet" aria-labelledby="trend-title">
            <h2 id="trend-title" className="sheet-title">
              The last 30 days
            </h2>
            <TrendChart data={data.trend} />
          </section>

          <div className="progress-grid">
            <section className="sheet" aria-labelledby="mistakes-title">
              <h2 id="mistakes-title" className="sheet-title">
                Recurring mistakes
              </h2>
              {data.mistakes.length ? (
                <ul className="mistake-list">
                  {data.mistakes.map((m) => (
                    <li key={m.code}>
                      <strong>
                        {m.label} <span className="muted num">×{m.count}</span> <span className={`kind kind-${m.kind}`}>{m.kind === 'conceptual' ? 'idea' : m.kind === 'procedural' ? 'method' : 'slip'}</span>
                      </strong>
                      <span>{m.tip}</span>
                      <span className="muted small">In: {m.skills.join(', ')}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No repeated mistakes in the last 30 days.</p>
              )}
            </section>
            <section className="sheet" aria-labelledby="sw-title">
              <h2 id="sw-title" className="sheet-title">
                Strongest and weakest topics
              </h2>
              <ul className="rows rows-tight">
                {data.strongest.map((x) => (
                  <li key={x.topicId} className="row">
                    <span className="tag tag-strong">Strong</span>
                    <span className="row-main">
                      <span className="row-title">{x.name}</span>
                    </span>
                    <span className="row-end num">{x.mastery}%</span>
                  </li>
                ))}
                {data.weakest.map((x) => (
                  <li key={x.topicId} className="row">
                    <span className="tag tag-weak">Focus</span>
                    <span className="row-main">
                      <span className="row-title">{x.name}</span>
                    </span>
                    <span className="row-end num">{x.mastery}%</span>
                  </li>
                ))}
              </ul>
              <dl className="totals">
                <div>
                  <dt>Time studied</dt>
                  <dd className="num">{t.minutesAllTime >= 60 ? `${Math.floor(t.minutesAllTime / 60)} h ${t.minutesAllTime % 60} min` : `${t.minutesAllTime} min`}</dd>
                </div>
                <div>
                  <dt>Questions answered</dt>
                  <dd className="num">{t.questions}</dd>
                </div>
                <div>
                  <dt>Accuracy, last 30 days</dt>
                  <dd className="num">{t.accuracy30 === null ? '–' : `${t.accuracy30}%`}</dd>
                </div>
                <div>
                  <dt>Tests completed</dt>
                  <dd className="num">{t.testsCompleted}</dd>
                </div>
                <div>
                  <dt>Days in a row</dt>
                  <dd className="num">{t.streakDays}</dd>
                </div>
              </dl>
            </section>
          </div>

          {exams.data?.length ? (
            <section className="sheet" aria-labelledby="exam-ready">
              <h2 id="exam-ready" className="sheet-title">
                Exam readiness
              </h2>
              <ul className="rows">
                {exams.data.map((e) => (
                  <li key={e.id}>
                    <Link to={`/exams/${e.id}`} className="row">
                      <span className="row-main">
                        <span className="row-title">{e.title}</span>
                        <span className="row-sub">{e.daysLeft >= 0 ? `in ${plural(e.daysLeft, 'day')}` : 'finished'}</span>
                      </span>
                      <span className="row-end num">{e.readiness}% ready</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="map-title">
            <h2 id="map-title" className="topic-title">
              Mastery map
            </h2>
            {data.subjects.map((s) => (
              <div key={s.id} className="map-subject">
                <h3 className="subject-mini">{s.name}</h3>
                {s.topics.map((tp) => (
                  <div key={tp.id} className="map-topic">
                    <h4>
                      {tp.name}
                      {tp.strand ? <span className="topic-strand">{tp.strand}</span> : null}
                      <span className="map-topic-num num">{tp.mastery === null ? '' : `${tp.mastery}%`}</span>
                    </h4>
                    <ul className="rows rows-tight">
                      {tp.skills.map((k) => (
                        <li key={k.skillId}>
                          <Link to={`/learn/${k.skillId}`} className="row">
                            <span className="row-main">
                              <span className="row-title">{k.name}</span>
                              <span className="row-sub">
                                {k.evidence ? `${plural(k.evidence, 'answer')}, last ${relativeDay(k.lastPracticedAt as string)}` : 'Not started'}
                                {k.reviewDue ? '. Review due' : ''}
                              </span>
                            </span>
                            <span className="row-trend num" title="Change over 30 days">
                              {k.trend30 === null ? '' : k.trend30 > 0 ? `+${k.trend30}` : k.trend30 < 0 ? `${k.trend30}` : '±0'}
                            </span>
                            <span className="row-bar">
                              <MasteryBar value={k.mastery} band={k.band} size="sm" />
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
