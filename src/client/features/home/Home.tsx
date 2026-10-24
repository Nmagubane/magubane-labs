import { useState } from 'react';
import { useResource, invalidate } from '../../lib/useResource.ts';
import { api, ApiError } from '../../lib/api.ts';
import { useRouter, Link } from '../../lib/router.tsx';
import { greeting, relativeDay, inDays, plural, BAND_LABEL, clock } from '../../lib/format.ts';
import { Button, ButtonLink, MasteryBar, Mark, Loading, ErrorState, BandDot } from '../../ui/primitives.tsx';
import { Tex } from '../../ui/RichText.tsx';
import type { HomeResponse, ActivityDto, RecommendationDto } from '../../../shared/api.ts';
import { Assignments } from './Assignments.tsx';

const ACTION_LABEL: Record<RecommendationDto['action'], string> = { learn: 'Learn', practice: 'Practise', review: 'Review' };

export function useStartActivity() {
  const { navigate } = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const start = async (key: string, body: Record<string, unknown>) => {
    setBusy(key);
    setError(null);
    try {
      const a = await api.post<ActivityDto>('/api/activities', body);
      invalidate('/api/home');
      navigate(a.kind === 'test' || a.kind === 'baseline' ? `/tests/${a.id}` : `/practice/${a.id}`);
    } catch (e) {
      const ae = e as ApiError;
      const id = (ae.details as { activityId?: string } | undefined)?.activityId;
      if (ae.code === 'assessment_in_progress' && id) navigate(`/tests/${id}`);
      else setError(ae.message);
    } finally {
      setBusy(null);
    }
  };
  return { start, busy, error };
}

export function Home() {
  const { data, error, loading, reload } = useResource<HomeResponse>('/api/home');
  const { start, busy, error: startError } = useStartActivity();
  const { navigate } = useRouter();

  if (loading && !data) return <Loading label="Working out your next step" />;
  if (error && !data) return <ErrorState error={error} onRetry={() => void reload()} />;
  if (!data) return null;

  const p = data.priority;
  const minutesLeft = Math.max(0, data.dailyMinutes - data.minutesToday);

  const act = (r: RecommendationDto) => {
    if (r.action === 'learn') navigate(`/learn/${r.skillId}`);
    else void start(r.skillId, { kind: 'practice', skillId: r.skillId, count: r.action === 'review' ? 5 : 8 });
  };

  return (
    <div className="home">
      <header className="home-head">
        <h1>
          {greeting()}, {data.firstName}.
        </h1>
        <p className="lead">
          {data.minutesToday === 0
            ? `You planned ${data.dailyMinutes} minutes a day. Here's the best use of them.`
            : minutesLeft > 0
              ? `${data.minutesToday} minutes done today. ${minutesLeft} left of your ${data.dailyMinutes}.`
              : `You've done your ${data.dailyMinutes} minutes today. Anything more is a bonus.`}
        </p>
      </header>

      {data.activeTest ? (
        <div className="banner banner-test" role="status">
          <span>
            <strong>{data.activeTest.title}</strong> is still in progress{data.activeTest.remainingSec !== null ? `, with ${clock(data.activeTest.remainingSec)} left` : ''}.
          </span>
          <ButtonLink to={`/tests/${data.activeTest.id}`} size="sm">
            Return to test
          </ButtonLink>
        </div>
      ) : null}

      {data.assignments?.length ? <Assignments items={data.assignments} /> : null}

      {p ? (
        <section className="priority graph-paper" aria-labelledby="priority-title">
          <p className="priority-kicker">Do this next</p>
          <div className="priority-sig" aria-hidden>
            <Tex tex={p.signature} />
          </div>
          <h2 id="priority-title" className="priority-title">
            <Mark>{p.skillName}</Mark>
          </h2>
          <p className="priority-topic">{p.topicName}</p>
          <div className="priority-mastery">
            <MasteryBar value={p.mastery} band={p.band} size="lg" />
          </div>
          <ul className="priority-reasons">
            {p.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <div className="priority-actions">
            <Button size="lg" busy={busy === p.skillId} onClick={() => act(p)}>
              {p.action === 'learn' ? 'Start the lesson' : p.action === 'review' ? 'Review: 5 questions' : 'Practise: 8 questions'}
            </Button>
            {p.action !== 'learn' ? (
              <ButtonLink to={`/learn/${p.skillId}`} variant="secondary" size="lg">
                Revisit the lesson
              </ButtonLink>
            ) : (
              <Button variant="secondary" size="lg" busy={busy === `${p.skillId}-p`} onClick={() => void start(`${p.skillId}-p`, { kind: 'practice', skillId: p.skillId, count: 8 })}>
                Skip to practice
              </Button>
            )}
            <span className="muted priority-time">About {p.estMinutes} min</span>
          </div>
          {p.nextBand ? (
            <p className="priority-next">
              About {plural(p.nextBand.answers, 'more correct answer')} at your level would take you to {BAND_LABEL[p.nextBand.band]}.
            </p>
          ) : null}
          {startError ? (
            <p className="form-error" role="alert">
              {startError}
            </p>
          ) : null}
        </section>
      ) : (
        <section className="priority graph-paper">
          <h2 className="priority-title">You&apos;re on top of everything in range.</h2>
          <p>Every skill for your grade is mastered and nothing needs review. Explore something ahead of your grade in Learn, or take a mixed test to prove it.</p>
          <div className="priority-actions">
            <ButtonLink to="/learn">Explore Learn</ButtonLink>
          </div>
        </section>
      )}

      <nav className="quick" aria-label="Quick actions">
        <Button variant="quiet" busy={busy === 'weak'} onClick={() => void start('weak', { kind: 'practice', weak: true })}>
          Practise weak areas
        </Button>
        <Link to="/tests" className="btn btn-quiet btn-md">
          <span>Take a test</span>
        </Link>
        <Link to="/tutor" className="btn btn-quiet btn-md">
          <span>Ask the tutor</span>
        </Link>
        <Link to="/progress" className="btn btn-quiet btn-md">
          <span>See progress</span>
        </Link>
      </nav>

      <div className="home-grid">
        <section className="sheet" aria-labelledby="also-title">
          <h2 id="also-title" className="sheet-title">
            Also worth doing
          </h2>
          {data.alternatives.length ? (
            <ul className="rows">
              {data.alternatives.map((r) => (
                <li key={r.skillId}>
                  <button type="button" className="row row-button" onClick={() => act(r)} disabled={busy === r.skillId}>
                    <span className={`tag tag-${r.action}`}>{ACTION_LABEL[r.action]}</span>
                    <span className="row-main">
                      <span className="row-title">{r.skillName}</span>
                      <span className="row-sub">{r.reasons[0]}</span>
                    </span>
                    <span className="row-end num">{r.band === 'not-started' ? 'New' : `${r.mastery}%`}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Nothing else stands out right now.</p>
          )}
        </section>

        <section className="sheet" aria-labelledby="exam-title">
          <h2 id="exam-title" className="sheet-title">
            Exam readiness
          </h2>
          {data.exam ? (
            <Link to={`/exams/${data.exam.id}`} className="exam-mini">
              <span className="exam-mini-title">{data.exam.title}</span>
              <span className="muted">
                {new Date(`${data.exam.examDate}T00:00:00`).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' })}, {inDays(data.exam.daysLeft)}
              </span>
              <span className="exam-mini-score">
                <span className="num">{data.exam.readiness}%</span>
                <span className="muted">ready ({data.exam.confidence} confidence)</span>
              </span>
              <span className="exam-mini-risk">{data.exam.highRisk ? `${plural(data.exam.highRisk, 'high-risk topic')}. Open your plan.` : 'No high-risk topics. Open your plan.'}</span>
            </Link>
          ) : (
            <div className="exam-empty">
              <p className="muted">Got a test or exam coming up? Add it and you&apos;ll get a readiness estimate and a day-by-day plan.</p>
              <ButtonLink to="/exams" variant="secondary" size="sm">
                Add an exam
              </ButtonLink>
            </div>
          )}
        </section>

        <section className="sheet" aria-labelledby="weak-title">
          <h2 id="weak-title" className="sheet-title">
            Weak areas
          </h2>
          {data.weakAreas.length ? (
            <ul className="rows">
              {data.weakAreas.map((w) => (
                <li key={w.skillId}>
                  <Link to={`/learn/${w.skillId}`} className="row">
                    <span className="row-main">
                      <span className="row-title">{w.name}</span>
                    </span>
                    <span className="row-bar">
                      <MasteryBar value={w.mastery} band={w.mastery >= 70 ? 'proficient' : w.mastery >= 40 ? 'developing' : 'learning'} size="sm" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Nothing below Proficient among the skills you&apos;ve started.</p>
          )}
        </section>

        <section className="sheet" aria-labelledby="recent-title">
          <h2 id="recent-title" className="sheet-title">
            Recent results
          </h2>
          {data.recentResults.length ? (
            <ul className="rows">
              {data.recentResults.map((r) => (
                <li key={r.activityId}>
                  <Link to={`/results/${r.activityId}`} className="row">
                    <BandDot band={r.scorePct >= 85 ? 'mastered' : r.scorePct >= 70 ? 'proficient' : r.scorePct >= 40 ? 'developing' : 'learning'} />
                    <span className="row-main">
                      <span className="row-title">{r.title}</span>
                      <span className="row-sub">{relativeDay(r.completedAt)}</span>
                    </span>
                    <span className="row-end num">{r.scorePct}%</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Your test and practice results will appear here.</p>
          )}
          <p className="week">
            This week: {plural(data.week.questions, 'question')}
            {data.week.accuracy !== null ? `, ${data.week.accuracy}% correct` : ''}, on {plural(data.week.activeDays, 'day')}.
          </p>
        </section>
      </div>
    </div>
  );
}
