import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../../lib/api.ts';
import { useResource, invalidate } from '../../lib/useResource.ts';
import { Link, useRouter } from '../../lib/router.tsx';
import { useSession } from '../../lib/session.tsx';
import { Button, Loading, ErrorState, PageHeader, TextInput } from '../../ui/primitives.tsx';
import { SUBJECTS, subjectsForGrade, type SubjectId } from '../../../shared/curriculum/catalogue.ts';
import type { ClassSummaryDto } from '../../../shared/api-teach.ts';

export function TeachHome() {
  const { me } = useSession();
  const { data, error, loading, reload } = useResource<ClassSummaryDto[]>('/api/teach/classes');
  const [creating, setCreating] = useState(false);
  if (loading && !data) return <Loading label="Loading your classes" />;
  if (error && !data) return <ErrorState error={error} onRetry={() => void reload()} />;
  const classes = data ?? [];
  const active = classes.filter((c) => !c.archived);
  const archived = classes.filter((c) => c.archived);
  const first = me?.user?.displayName ?? '';

  return (
    <div className="teach">
      <PageHeader title="Your classes" lead={me?.user?.school ? `${first}, ${me.user.school}` : first}>
        {active.length ? (
          <Button onClick={() => setCreating(!creating)} variant={creating ? 'quiet' : 'primary'}>
            {creating ? 'Cancel' : 'New class'}
          </Button>
        ) : null}
      </PageHeader>

      {creating || !active.length ? (
        <section className="sheet">
          {!active.length ? (
            <div className="teach-intro">
              <h2 className="sheet-title">Start with a class</h2>
              <ol className="steps-inline">
                <li>
                  <strong>Create a class.</strong> You get a 6-letter class code.
                </li>
                <li>
                  <strong>Learners join</strong> with the code (on their phone or a school computer). Their guardian is told by email.
                </li>
                <li>
                  <strong>Set work and follow progress.</strong> See mastery per skill, who needs help and the most common misconceptions.
                </li>
                <li>
                  <strong>Reports</strong> go to you and to each guardian every Sunday as a PDF.
                </li>
              </ol>
            </div>
          ) : null}
          <CreateClass onDone={() => setCreating(false)} />
        </section>
      ) : null}

      {active.length ? (
        <ul className="class-list">
          {active.map((c) => (
            <li key={c.id}>
              <Link to={`/teach/classes/${c.id}`} className="class-row">
                <span className="class-main">
                  <span className="class-name">{c.name}</span>
                  <span className="muted">
                    {c.subjectName}, Grade {c.grade}
                  </span>
                </span>
                <span className="class-stat">
                  <span className="num">{c.learnerCount}</span>
                  <span className="muted">learners</span>
                </span>
                <span className="class-stat">
                  <span className="num">{c.learnerCount ? `${c.activeThisWeek}/${c.learnerCount}` : '–'}</span>
                  <span className="muted">active this week</span>
                </span>
                <span className="class-stat">
                  <span className="num">{c.avgMastery === null ? '–' : `${c.avgMastery}%`}</span>
                  <span className="muted">average mastery</span>
                </span>
                <span className="class-code" aria-label={`Class code ${c.joinCode.split('').join(' ')}`}>
                  <span className="muted">Code</span>
                  <span className="num">{c.joinCode}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {archived.length ? (
        <details className="archived">
          <summary>Archived classes ({archived.length})</summary>
          <ul className="rows">
            {archived.map((c) => (
              <li key={c.id}>
                <Link to={`/teach/classes/${c.id}`} className="row">
                  <span className="row-main">
                    <span className="row-title">{c.name}</span>
                    <span className="muted">{c.learnerCount} learners</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function CreateClass({ onDone }: { onDone: () => void }) {
  const { navigate } = useRouter();
  const [name, setName] = useState('');
  const [grade, setGrade] = useState(9);
  const [subjectId, setSubjectId] = useState<string>(grade <= 6 ? 'natural-sciences' : 'mathematics');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const c = await api.post<ClassSummaryDto>('/api/teach/classes', { name, grade, subjectId });
      invalidate('/api/teach');
      onDone();
      navigate(`/teach/classes/${c.id}`);
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="form create-class" noValidate>
      <TextInput label="Class name" placeholder="e.g. 9B Natural Sciences" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
      <div className="assign-row">
        <div className="field">
          <label htmlFor="cc-grade">Grade</label>
          <select
            id="cc-grade"
            value={grade}
            onChange={(e) => {
              const g = Number(e.target.value);
              setGrade(g);
              // Grades 1–3 usually have one teacher for every subject.
              if (g <= 3) setSubjectId('all');
              else if (!subjectsForGrade(g).includes(subjectId as SubjectId)) setSubjectId('mathematics');
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="cc-subject">Subject</label>
          <select id="cc-subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {grade <= 3 ? <option value="all">All subjects (Foundation Phase)</option> : null}
            {SUBJECTS.filter((s) => subjectsForGrade(grade).includes(s.id)).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" busy={busy} disabled={!name.trim()}>
        Create class
      </Button>
    </form>
  );
}
