import { useState } from 'react';
import { api, ApiError } from '../../lib/api.ts';
import { invalidate } from '../../lib/useResource.ts';
import { useRouter } from '../../lib/router.tsx';
import { Button } from '../../ui/primitives.tsx';
import { shortDate } from '../../lib/format.ts';
import type { MyAssignmentDto } from '../../../shared/api-teach.ts';

const VERB = { lesson: 'Lesson', practice: 'Practice', test: 'Test' } as const;

/** Work set by the learner's teachers: shown on Home, most urgent first. */
export function Assignments({ items }: { items: MyAssignmentDto[] }) {
  const { navigate } = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const open = items.filter((a) => !a.done).sort((a, b) => (a.overdue === b.overdue ? a.dueAt.localeCompare(b.dueAt) : a.overdue ? -1 : 1));
  const done = items.filter((a) => a.done);
  if (!items.length) return null;

  const start = async (a: MyAssignmentDto) => {
    setBusy(a.id);
    setError(null);
    try {
      const r = await api.post<{ activityId?: string; kind?: 'practice' | 'test'; lesson?: string }>(`/api/assignments/${a.id}/start`);
      invalidate('/api/home');
      if (r.lesson) navigate(`/learn/${r.lesson}`);
      else navigate(r.kind === 'test' ? `/tests/${r.activityId}` : `/practice/${r.activityId}`);
    } catch (e) {
      const ae = e as ApiError;
      const id = (ae.details as { activityId?: string } | undefined)?.activityId;
      if (ae.code === 'assessment_in_progress' && id) navigate(`/tests/${id}`);
      else setError(ae.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="assignments" aria-labelledby="assign-title">
      <h2 id="assign-title" className="sheet-title">
        From your teacher
      </h2>
      {open.length ? (
        <ul className="assign-list">
          {open.map((a) => (
            <li key={a.id} className={a.overdue ? 'overdue' : ''}>
              <span className={`tag tag-${a.kind}`}>{VERB[a.kind]}</span>
              <span className="assign-main">
                <span className="assign-title">{a.skillName}</span>
                <span className="muted">
                  {a.teacherName}, {a.className}. {a.overdue ? <strong className="overdue-text">Was due {shortDate(a.dueAt)}</strong> : <>Due {shortDate(a.dueAt)}</>}
                  {a.questionCount ? `. ${a.questionCount} questions` : ''}
                </span>
                {a.note ? <span className="assign-note">&ldquo;{a.note}&rdquo;</span> : null}
              </span>
              <Button size="sm" variant={a.overdue ? 'primary' : 'secondary'} busy={busy === a.id} onClick={() => void start(a)}>
                {a.kind === 'lesson' ? 'Open lesson' : 'Start'}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">All done. Nice work.</p>
      )}
      {done.length ? (
        <p className="muted small">
          Done: {done.map((a) => `${a.skillName}${a.scorePct !== null ? ` (${a.scorePct}%)` : ''}`).join(', ')}.
        </p>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
