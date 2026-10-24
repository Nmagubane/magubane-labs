import { useEffect, useState } from 'react';
import { useResource, invalidate } from '../../lib/useResource.ts';
import { api, ApiError } from '../../lib/api.ts';
import { Link, useRouter } from '../../lib/router.tsx';
import { Button, Loading, ErrorState, MasteryBar } from '../../ui/primitives.tsx';
import { Tex, RichBlocks, Rich } from '../../ui/RichText.tsx';
import { Figure } from '../../ui/Figure.tsx';
import { Icon } from '../../ui/Icon.tsx';
import { Widget } from '../widgets/Widget.tsx';
import { useStartActivity } from '../home/Home.tsx';
import { InlineQuestion } from '../practice/InlineQuestion.tsx';
import { BAND_LABEL, plural } from '../../lib/format.ts';
import type { SkillDetailResponse, WorkedExample, ActivityDto, TutorConversationDetail } from '../../../shared/api.ts';
import type { LessonBlock } from '../../../shared/content/types.ts';
import { useSession } from '../../lib/session.tsx';
import { AssignForm } from '../teach/AssignForm.tsx';

export function SkillPage({ skillId }: { skillId: string }) {
  const { me } = useSession();
  const teacher = me?.user?.role === 'teacher';
  const { data, error, loading, reload } = useResource<SkillDetailResponse>(`/api/skills/${skillId}`);
  const [activity, setActivity] = useState<ActivityDto | null>(null);
  const [finished, setFinished] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const { start, busy, error: startError } = useStartActivity();
  const { navigate } = useRouter();

  useEffect(() => {
    if (teacher) return;
    let live = true;
    api
      .post<ActivityDto>('/api/activities', { kind: 'lesson', skillId })
      .then((a) => live && setActivity(a))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [skillId, teacher]);

  if (loading && !data) return <Loading label="Opening the lesson" />;
  if (error && !data) return <ErrorState error={error} onRetry={() => void reload()} />;
  if (!data) return null;
  const { skill, state, lesson } = data;
  let checkIndex = 0;

  const finish = async () => {
    if (!activity) return;
    setFinishing(true);
    try {
      await api.post(`/api/activities/${activity.id}/submit`);
      invalidate('/api/home', '/api/catalogue', `/api/skills/${skillId}`, '/api/progress');
      setFinished(true);
    } catch {
      setFinished(true);
    } finally {
      setFinishing(false);
    }
  };

  const askTutor = async () => {
    try {
      const c = await api.post<TutorConversationDetail>('/api/tutor/conversations', { skillId });
      navigate(`/tutor/${c.id}`);
    } catch (e) {
      const ae = e as ApiError;
      if (ae.code === 'assessment_in_progress') navigate('/tutor');
    }
  };

  return (
    <div className="lesson-page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/learn">Learn</Link>
        <span aria-hidden>/</span>
        <span>{skill.subjectName}</span>
        <span aria-hidden>/</span>
        <span>{skill.topicName}</span>
      </nav>
      <header className="lesson-head">
        <div className="lesson-sig graph-paper" aria-hidden>
          <Tex tex={skill.signature} display />
        </div>
        <div className="lesson-head-text">
          <h1>{lesson.title}</h1>
          <p className="lead">{skill.outcome}</p>
          <p className="muted">
            {skill.name}. Grade {skill.grade}. About {lesson.minutes} minutes.
          </p>
        </div>
      </header>

      <div className="lesson-layout">
        <article className="lesson-body">
          {lesson.blocks.map((b, i) => {
            const ci = b.kind === 'check' ? ++checkIndex : 0;
            return <Block key={i} block={b} skillId={skillId} activityId={activity?.id ?? null} checkNumber={ci} teacher={teacher} />;
          })}

          {teacher ? null : (
          <section className="lesson-end">
            {finished ? (
              <>
                <h2>Lesson complete.</h2>
                <p>The best next step is practice while it&apos;s fresh. Questions adapt to you as you go.</p>
                <div className="row-actions">
                  <Button size="lg" busy={busy === 'practice'} onClick={() => void start('practice', { kind: 'practice', skillId, count: 8 })}>
                    Practise this skill
                  </Button>
                  <Link to="/home" className="btn btn-secondary btn-lg">
                    <span>Back to Home</span>
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h2>Done with the lesson?</h2>
                <p className="muted">Marking it complete helps us plan what comes next.</p>
                <Button size="lg" busy={finishing} disabled={!activity} onClick={() => void finish()}>
                  Finish lesson
                </Button>
              </>
            )}
            {startError ? (
              <p className="form-error" role="alert">
                {startError}
              </p>
            ) : null}
          </section>
          )}
        </article>

        <aside className="lesson-side" aria-label="This skill">
          {teacher ? (
            <>
              <div className="side-sheet">
                <h2 className="side-title">Teach this</h2>
                <p className="muted side-note">Present the lesson on a projector or smartboard, one step at a time. Labs stay interactive.</p>
                <div className="side-actions">
                  <Link to={`/teach/present/${skillId}`} className="btn btn-primary btn-md">
                    <span>Present to the class</span>
                  </Link>
                </div>
              </div>
              <div className="side-sheet">
                <h2 className="side-title">Assign it</h2>
                <AssignForm skillId={skillId} compact />
              </div>
            </>
          ) : (
          <div className="side-sheet">
            <h2 className="side-title">Your mastery</h2>
            <MasteryBar value={state.mastery} band={state.band} />
            <p className="muted side-note">
              {state.evidence === 0 ? 'Not started yet. The checks in this lesson count a little.' : `Based on ${plural(state.evidence, 'answer')}.`}
              {data.nextBand ? ` About ${plural(data.nextBand.answers, 'more correct answer')} to reach ${BAND_LABEL[data.nextBand.band]}.` : ''}
            </p>
            <div className="side-actions">
              <Button busy={busy === 'practice'} onClick={() => void start('practice', { kind: 'practice', skillId, count: 8 })}>
                Practise
              </Button>
              <Button variant="secondary" busy={busy === 'test'} onClick={() => void start('test', { kind: 'test', skillId, count: 5 })}>
                Quick test (5)
              </Button>
              <Button variant="quiet" onClick={() => void askTutor()}>
                Ask the tutor about this
              </Button>
            </div>
          </div>
          )}
          {skill.prerequisites.length && !teacher ? (
            <div className="side-sheet">
              <h2 className="side-title">Builds on</h2>
              <ul className="rows rows-tight">
                {skill.prerequisites.map((p) => (
                  <li key={p.id}>
                    <Link to={`/learn/${p.id}`} className="row">
                      <span className="row-main">
                        <span className="row-title">{p.name}</span>
                      </span>
                      <span className="row-end num">{p.mastery ? `${p.mastery}%` : 'New'}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {data.recentMistakes.length && !teacher ? (
            <div className="side-sheet">
              <h2 className="side-title">Your recent mistakes here</h2>
              <ul className="mistake-list">
                {data.recentMistakes.map((m) => (
                  <li key={m.code}>
                    <strong>
                      {m.label} <span className="muted num">×{m.count}</span>
                    </strong>
                    <span>{m.tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

export function Block({ block, skillId, activityId, checkNumber, teacher = false }: { block: LessonBlock; skillId: string; activityId: string | null; checkNumber: number; teacher?: boolean }) {
  switch (block.kind) {
    case 'text':
      return <RichBlocks text={block.body} className="lesson-text" />;
    case 'key-idea':
      return (
        <aside className="key-idea">
          <h3>Key idea</h3>
          <RichBlocks text={block.body} />
        </aside>
      );
    case 'widget':
      return (
        <section className="lab">
          <header className="lab-head">
            <h3>{block.title}</h3>
            <Rich text={block.task} as="p" />
          </header>
          <div className="lab-stage graph-paper">
            <Widget spec={block.widget} />
          </div>
        </section>
      );
    case 'predict':
      return <Predict block={block} />;
    case 'example':
      return <Example skillId={skillId} level={block.level} />;
    case 'trap':
      return (
        <aside className="trap">
          <h3>Common trap</h3>
          <p className="trap-wrong">
            <Icon name="cross" size={18} /> <Rich text={block.wrong} />
          </p>
          <Rich text={block.why} as="p" />
        </aside>
      );
    case 'check':
      if (teacher) return <Example skillId={skillId} level={block.level} title={`Try this together (check ${checkNumber})`} />;
      return (
        <section className="lesson-check">
          <h3>Check {checkNumber}</h3>
          {activityId ? <InlineQuestion activityId={activityId} level={block.level} checkNumber={checkNumber} /> : <Loading label="Preparing a question" />}
        </section>
      );
  }
}

export function Predict({ block }: { block: Extract<LessonBlock, { kind: 'predict' }> }) {
  const [choice, setChoice] = useState<number | null>(null);
  return (
    <section className="predict">
      <h3>Predict first</h3>
      <Rich text={block.prompt} as="p" />
      <div className="predict-options" role="radiogroup" aria-label="Your prediction">
        {block.options.map((o, i) => (
          <button key={i} type="button" role="radio" aria-checked={choice === i} disabled={choice !== null} className={`choice${choice === i ? ' on' : ''}${choice !== null && i === block.answer ? ' right' : ''}`} onClick={() => setChoice(i)}>
            <span className="choice-key" aria-hidden>
              {String.fromCharCode(65 + i)}
            </span>
            <Rich text={o} />
          </button>
        ))}
      </div>
      {choice !== null ? (
        <p className={`predict-result ${choice === block.answer ? 'good' : 'off'}`} role="status">
          <strong>{choice === block.answer ? 'Good prediction.' : 'Interesting prediction. It turns out differently.'}</strong> <Rich text={block.explanation} />
        </p>
      ) : (
        <p className="muted">Commit to an answer before you experiment. Being wrong first is how this sticks.</p>
      )}
    </section>
  );
}

export function Example({ skillId, level, title = 'Worked example' }: { skillId: string; level: number; title?: string }) {
  const [ex, setEx] = useState<WorkedExample | null>(null);
  const [shown, setShown] = useState(1);
  const [error, setError] = useState<ApiError | null>(null);
  const load = () => {
    setError(null);
    api
      .get<WorkedExample>(`/api/skills/${skillId}/example?level=${level}`)
      .then((e) => {
        setEx(e);
        setShown(1);
      })
      .catch((e: ApiError) => setError(e));
  };
  useEffect(load, [skillId, level]);
  return (
    <section className="example">
      <h3>{title}</h3>
      {error ? <ErrorState error={error} onRetry={load} /> : null}
      {ex ? (
        <>
          <Rich text={ex.prompt} as="p" className="example-prompt" />
          {ex.figure ? <Figure figure={ex.figure} /> : null}
          <ol className="example-steps" aria-live="polite">
            {ex.solution.slice(0, shown).map((s, i) => (
              <li key={i}>
                <RichBlocks text={s} />
              </li>
            ))}
          </ol>
          <div className="row-actions">
            {shown < ex.solution.length ? (
              <Button variant="secondary" size="sm" onClick={() => setShown(shown + 1)}>
                Show next step ({shown} of {ex.solution.length})
              </Button>
            ) : (
              <p className="example-answer">
                Answer: <Rich text={ex.answerDisplay} />
              </p>
            )}
            <Button variant="quiet" size="sm" onClick={load}>
              Another example
            </Button>
          </div>
        </>
      ) : !error ? (
        <Loading label="Generating an example" />
      ) : null}
    </section>
  );
}
