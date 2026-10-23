import { useResource } from '../../lib/useResource.ts';
import { Link } from '../../lib/router.tsx';
import { useSession } from '../../lib/session.tsx';
import { Button, Loading, ErrorState, Mark } from '../../ui/primitives.tsx';
import { Rich, RichBlocks } from '../../ui/RichText.tsx';
import { Figure } from '../../ui/Figure.tsx';
import { Icon } from '../../ui/Icon.tsx';
import { useStartActivity } from '../home/Home.tsx';
import { useAskTutor } from '../practice/QuestionCard.tsx';
import { minutes, plural } from '../../lib/format.ts';
import { responseText } from '../../../shared/questions/answer.ts';
import type { ResultsDto } from '../../../shared/api.ts';

export function Results({ id }: { id: string }) {
  const { data, error, loading, reload } = useResource<ResultsDto>(`/api/activities/${id}/results`);
  const { start, busy, error: startError } = useStartActivity();
  const { ask } = useAskTutor();
  const { me } = useSession();
  if (loading && !data) return <Loading label="Marking" />;
  if (error && !data) return <ErrorState error={error} onRetry={() => void reload()} />;
  if (!data) return null;
  const isBaseline = data.kind === 'baseline';
  const isPractice = data.kind === 'practice' || data.kind === 'lesson';

  return (
    <div className="results">
      <header className="results-head">
        <p className="muted">{isBaseline ? 'Your starting point' : isPractice ? 'Practice set' : 'Test results'}</p>
        <h1>{data.title}</h1>
        <div className="score">
          <span className="score-num num">{data.scorePct}%</span>
          <span className="score-detail">
            {data.correct} of {data.total} correct
            <br />
            {minutes(data.timeTakenSec)}
          </span>
        </div>
        {isBaseline ? (
          <p className="lead">This is a starting line, not a grade. Your recommendations now start from here, and every answer you give from now on sharpens them.</p>
        ) : null}
      </header>

      {data.biggestOpportunity ? (
        <section className="opportunity" aria-labelledby="opp-title">
          <h2 id="opp-title">
            Your biggest opportunity: <Mark>{data.biggestOpportunity.name}</Mark>
          </h2>
          <p>{data.biggestOpportunity.reason}</p>
          <div className="row-actions">
            <Button busy={busy === 'opp'} onClick={() => void start('opp', { kind: 'practice', skillId: data.biggestOpportunity!.skillId, count: 8 })}>
              Practise {data.biggestOpportunity.name.toLowerCase()}
            </Button>
            <Link to={`/learn/${data.biggestOpportunity.skillId}`} className="btn btn-secondary btn-md">
              <span>Revisit the lesson</span>
            </Link>
          </div>
          {startError ? (
            <p className="form-error" role="alert">
              {startError}
            </p>
          ) : null}
        </section>
      ) : data.total > 0 && data.correct === data.total ? (
        <section className="opportunity good">
          <h2>Full marks.</h2>
          <p>Nothing to fix here. Mastery has gone up for every skill in this set.</p>
        </section>
      ) : null}

      <div className="results-grid">
        <section className="sheet" aria-labelledby="by-topic">
          <h2 id="by-topic" className="sheet-title">
            By topic
          </h2>
          <ul className="bars">
            {data.perTopic.map((t) => (
              <li key={t.topicId}>
                <span className="bars-label">{t.name}</span>
                <span className="bars-track" role="img" aria-label={`${t.pct}%`}>
                  <span className={`bars-fill ${t.pct >= 85 ? 'band-mastered' : t.pct >= 70 ? 'band-proficient' : t.pct >= 40 ? 'band-developing' : 'band-learning'}`} style={{ width: `${Math.max(2, t.pct)}%` }} />
                </span>
                <span className="bars-value num">
                  {t.pct}% <span className="muted">({t.correct}/{t.total})</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="sheet" aria-labelledby="by-skill">
          <h2 id="by-skill" className="sheet-title">
            Mastery change
          </h2>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Skill</th>
                <th scope="col" className="num">
                  Marks
                </th>
                <th scope="col" className="num">
                  Mastery
                </th>
              </tr>
            </thead>
            <tbody>
              {data.perSkill.map((s) => (
                <tr key={s.skillId}>
                  <th scope="row">
                    <Link to={`/learn/${s.skillId}`}>{s.name}</Link>
                  </th>
                  <td className="num">
                    {s.correct}/{s.total}
                  </td>
                  <td className="num">
                    {s.masteryBefore}% → <strong>{s.masteryAfter}%</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {data.mistakes.length ? (
          <section className="sheet" aria-labelledby="mistakes">
            <h2 id="mistakes" className="sheet-title">
              Mistake patterns
            </h2>
            <ul className="mistake-list">
              {data.mistakes.map((m) => (
                <li key={m.code}>
                  <strong>
                    {m.label} <span className="muted num">×{m.count}</span> <span className={`kind kind-${m.kind}`}>{m.kind === 'conceptual' ? 'idea' : m.kind === 'procedural' ? 'method' : 'slip'}</span>
                  </strong>
                  <span>{m.tip}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {data.calibration && data.calibration.answeredWithConfidence >= 3 ? (
          <section className="sheet" aria-labelledby="calib">
            <h2 id="calib" className="sheet-title">
              How well you judged yourself
            </h2>
            {data.calibration.sureWrong > 0 ? (
              <p>
                You were <strong>sure</strong> about {plural(data.calibration.sureWrong, 'answer')} that turned out wrong. Confident mistakes usually point to a misconception, a rule remembered slightly wrong, so fix those first.
              </p>
            ) : (
              <p>When you were sure, you were right. Good calibration.</p>
            )}
            {data.calibration.unsureRight > 0 ? <p className="muted">You got {plural(data.calibration.unsureRight, 'question')} right while unsure. That knowledge is still fragile, and a bit more practice will make it solid.</p> : null}
          </section>
        ) : null}
      </div>

      <section aria-labelledby="review" className="review">
        <h2 id="review" className="topic-title">
          Question by question
        </h2>
        <ol className="review-list">
          {data.items.map((it, i) => (
            <li key={it.question.id} className={`review-item ${it.correct ? 'is-correct' : 'is-wrong'}`}>
              <details open={!it.correct && i < 6}>
                <summary>
                  <span className="review-mark" aria-label={it.correct ? 'Correct' : 'Incorrect'}>
                    <Icon name={it.correct ? 'check' : 'cross'} size={18} />
                  </span>
                  <span className="review-n num">{i + 1}</span>
                  <Rich text={it.question.prompt} className="review-prompt" />
                </summary>
                <div className="review-body">
                  {it.question.figure ? <Figure figure={it.question.figure} /> : null}
                  <p>
                    Your answer: <strong>{it.skipped ? "I haven't learnt this" : it.response === null ? 'no answer' : responseText(it.response)}</strong>
                    {it.confidence ? <span className="muted"> ({it.confidence === 'sure' ? 'sure' : it.confidence === 'unsure' ? 'not sure' : 'guessing'})</span> : null}
                  </p>
                  {!it.correct ? (
                    <p>
                      Correct answer: <Rich text={it.answerDisplay} />
                    </p>
                  ) : null}
                  {it.mistake ? (
                    <p className="feedback-tip">
                      <strong>{it.mistake.label}.</strong> {it.feedback ? <Rich text={it.feedback} /> : null} {it.mistake.tip}
                    </p>
                  ) : null}
                  <ol className="solution-steps">
                    {it.solution.map((s, k) => (
                      <li key={k}>
                        <RichBlocks text={s} />
                      </li>
                    ))}
                  </ol>
                  {!it.correct ? (
                    <Button variant="quiet" size="sm" onClick={() => void ask(it.question.id)}>
                      Ask the tutor about this one
                    </Button>
                  ) : null}
                </div>
              </details>
            </li>
          ))}
        </ol>
      </section>

      <div className="results-foot">
        <Link to="/home" className="btn btn-primary btn-lg">
          <span>{isBaseline && me?.profile?.baselineCompleted ? 'See your plan on Home' : 'Back to Home'}</span>
        </Link>
        <Link to="/progress" className="btn btn-secondary btn-lg">
          <span>See progress</span>
        </Link>
      </div>
    </div>
  );
}
