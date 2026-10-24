import { useState } from 'react';
import { api, ApiError } from '../../lib/api.ts';
import { useSession } from '../../lib/session.tsx';
import { useRouter } from '../../lib/router.tsx';
import { Button, Logo } from '../../ui/primitives.tsx';
import type { ActivityDto, ProfileDto, Goal } from '../../../shared/api.ts';
import { SUBJECTS, type SubjectId, type CurriculumId } from '../../../shared/curriculum/catalogue.ts';

const GOALS: { id: Goal; label: string; detail: string }[] = [
  { id: 'pure-maths', label: 'Stay in pure Maths', detail: 'Keep Mathematics, not Maths Literacy, after Grade 9.' },
  { id: 'pass-exams', label: 'Do well in exams', detail: 'Be ready for tests and finals, not surprised by them.' },
  { id: 'catch-up', label: 'Fill gaps', detail: "Fix the things I never quite got." },
  { id: 'get-ahead', label: 'Get ahead', detail: 'Learn things before class does.' },
  { id: 'stem-career', label: 'Prepare for a STEM career', detail: 'Engineering, medicine, science, technology.' },
];

const MINUTES = [10, 20, 30, 45, 60];
const STEPS = ['Grade', 'Subjects', 'Goals', 'Time', 'Starting point'] as const;

export function Onboarding() {
  const { me, refresh } = useSession();
  const { navigate } = useRouter();
  const existing = me?.profile;
  const [step, setStep] = useState(existing && !existing.baselineCompleted ? 4 : 0);
  const [grade, setGrade] = useState<number | null>(existing?.grade ?? null);
  const [curriculum, setCurriculum] = useState<CurriculumId>(existing?.curriculumId ?? 'za-caps');
  const [subjects, setSubjects] = useState<SubjectId[]>(existing?.subjects ?? ['mathematics']);
  const [goals, setGoals] = useState<Goal[]>(existing?.goals ?? []);
  const [daily, setDaily] = useState(existing?.dailyMinutes ?? 30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  /** Which subjects make sense at a grade, and which to tick by default. */
  const offered = (g: number | null): SubjectId[] => (g === null ? SUBJECTS.map((x) => x.id) : g <= 6 ? ['mathematics', 'natural-sciences', 'physical-sciences', 'life-sciences'] : g === 7 ? ['mathematics', 'natural-sciences', 'physical-sciences', 'life-sciences'] : ['mathematics', 'physical-sciences', 'life-sciences']);
  const defaults = (g: number): SubjectId[] => (g <= 6 ? ['mathematics', 'natural-sciences'] : g <= 9 ? ['mathematics', 'physical-sciences', 'life-sciences'] : ['mathematics', 'physical-sciences']);
  const chooseGrade = (g: number) => {
    setGrade(g);
    if (!existing) setSubjects(defaults(g));
  };

  const saveProfile = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.put<ProfileDto>('/api/profile', { grade, curriculumId: curriculum, subjects: subjects.filter((x) => offered(grade).includes(x)), goals, dailyMinutes: daily });
      await refresh();
      setStep(4);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  const startBaseline = async () => {
    setBusy(true);
    setError(null);
    try {
      const a = await api.post<ActivityDto>('/api/activities', { kind: 'baseline' });
      navigate(`/tests/${a.id}`);
    } catch (e) {
      const ae = e as ApiError;
      const id = (ae.details as { activityId?: string } | undefined)?.activityId;
      if (ae.code === 'assessment_in_progress' && id) navigate(`/tests/${id}`);
      else setError(ae.message);
    } finally {
      setBusy(false);
    }
  };

  const first = me?.user?.displayName.split(' ')[0] ?? '';
  const canNext = [grade !== null, subjects.filter((x) => offered(grade).includes(x)).length > 0, true, true][step] ?? true;

  return (
    <main id="main" className="onboard">
      <header className="onboard-head">
        <Logo />
        <ol className="onboard-steps" aria-label="Setup steps">
          {STEPS.map((s, i) => (
            <li key={s} className={i === step ? 'now' : i < step ? 'done' : ''} aria-current={i === step ? 'step' : undefined}>
              <span className="num">{i + 1}</span> {s}
            </li>
          ))}
        </ol>
      </header>

      <section className="onboard-body">
        {step === 0 ? (
          <>
            <h1>Hi {first}. Which grade are you in?</h1>
            <p className="lead">We use this to pitch questions at the right level. You can change it later.</p>
            <div className="grade-grid" role="radiogroup" aria-label="Grade">
              {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                <button key={g} type="button" role="radio" aria-checked={grade === g} className={`grade-btn${grade === g ? ' on' : ''}`} onClick={() => chooseGrade(g)}>
                  <span className="grade-num num">{g}</span>
                  <span className="grade-word">Grade</span>
                </button>
              ))}
            </div>
            {grade !== null && grade <= 6 ? <p className="note">Grades 4 to 6 get Mathematics and Natural Sciences &amp; Technology, with hands-on labs for each topic.</p> : null}
            <fieldset className="curric">
              <legend>Curriculum</legend>
              <label className={`radio-row${curriculum === 'za-caps' ? ' on' : ''}`}>
                <input type="radio" name="curr" checked={curriculum === 'za-caps'} onChange={() => setCurriculum('za-caps')} />
                <span>
                  <strong>South Africa (CAPS)</strong>
                  <span className="muted">Topics organised the way your school teaches them.</span>
                </span>
              </label>
              <label className={`radio-row${curriculum === 'intl' ? ' on' : ''}`}>
                <input type="radio" name="curr" checked={curriculum === 'intl'} onChange={() => setCurriculum('intl')} />
                <span>
                  <strong>International</strong>
                  <span className="muted">Organised by grade and age instead of one national syllabus.</span>
                </span>
              </label>
            </fieldset>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <h1>What do you want to work on?</h1>
            <p className="lead">Pick at least one. We recommend Mathematics for everyone, because it opens every other door.</p>
            <div className="subject-list">
              {SUBJECTS.filter((x) => offered(grade).includes(x.id)).map((s) => (
                <label key={s.id} className={`subject-row${subjects.includes(s.id) ? ' on' : ''}`}>
                  <input type="checkbox" checked={subjects.includes(s.id)} onChange={() => setSubjects(toggle(subjects, s.id))} />
                  <span>
                    <strong>{s.name}</strong>
                    <span className="muted">{s.pitch}</span>
                  </span>
                </label>
              ))}
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h1>What are you aiming for?</h1>
            <p className="lead">Choose any that fit. It changes what we recommend first.</p>
            <div className="subject-list">
              {GOALS.map((g) => (
                <label key={g.id} className={`subject-row${goals.includes(g.id) ? ' on' : ''}`}>
                  <input type="checkbox" checked={goals.includes(g.id)} onChange={() => setGoals(toggle(goals, g.id))} />
                  <span>
                    <strong>{g.label}</strong>
                    <span className="muted">{g.detail}</span>
                  </span>
                </label>
              ))}
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <h1>How much time can you give it on a normal day?</h1>
            <p className="lead">Be honest. Twenty focused minutes every day beats two hours once a week.</p>
            <div className="minutes-row" role="radiogroup" aria-label="Minutes per day">
              {MINUTES.map((m) => (
                <button key={m} type="button" role="radio" aria-checked={daily === m} className={`grade-btn${daily === m ? ' on' : ''}`} onClick={() => setDaily(m)}>
                  <span className="grade-num num">{m}</span>
                  <span className="grade-word">min</span>
                </button>
              ))}
            </div>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <h1>Let&apos;s find your starting point.</h1>
            <p className="lead">About 10 questions across your subjects. This isn&apos;t a test and nothing is graded for anyone else. It tells us what you already know, so you don&apos;t waste time on it.</p>
            <ul className="plain-list">
              <li>No feedback during the check, so you won&apos;t get stuck on one question.</li>
              <li>If you haven&apos;t learnt something yet, choose &ldquo;I haven&apos;t learnt this&rdquo;. That&apos;s useful information too.</li>
              <li>Take your time. There&apos;s no timer.</li>
            </ul>
          </>
        ) : null}

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="onboard-actions">
          {step > 0 && step < 4 ? (
            <Button variant="quiet" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          ) : (
            <span />
          )}
          {step < 3 ? (
            <Button size="lg" disabled={!canNext} onClick={() => setStep(step + 1)}>
              Continue
            </Button>
          ) : step === 3 ? (
            <Button size="lg" busy={busy} onClick={() => void saveProfile()}>
              Save and continue
            </Button>
          ) : (
            <Button size="lg" busy={busy} onClick={() => void startBaseline()}>
              Start the check
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}
