import { useState } from 'react';
import { api, ApiError } from '../../lib/api.ts';
import { useResource } from '../../lib/useResource.ts';
import { Link } from '../../lib/router.tsx';
import { Button, Loading, ErrorState, MasteryBar } from '../../ui/primitives.tsx';
import { Icon } from '../../ui/Icon.tsx';
import { relativeDay, shortDate } from '../../lib/format.ts';
import type { TeacherLearnerDto, ReportSentDto } from '../../../shared/api-teach.ts';
import { ChildOverview } from '../family/ChildOverview.tsx';

export function TeacherLearner({ id }: { id: string }) {
  const { data, error, loading, reload } = useResource<TeacherLearnerDto>(`/api/teach/learners/${id}`);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (loading && !data) return <Loading label="Loading progress" />;
  if (error && !data) return <ErrorState error={error} onRetry={() => void reload()} />;
  if (!data) return null;
  const { learner, progress: p } = data;
  // Grades 1–3: the child view (what next, how to help, picture code, things to do together).
  if (learner.grade !== null && learner.grade <= 3) return <ChildOverview id={id} backTo="/teach" backLabel="Classes" />;

  const send = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await api.post<ReportSentDto>(`/api/teach/learners/${id}/report`, note.trim() ? { note: note.trim() } : {});
      const who = r.sentTo.map((s) => (s.role === 'guardian' ? `the guardian (${s.email})` : `you (${s.email})`)).join(' and ');
      const logged = r.sentTo.some((s) => s.status === 'logged');
      setMsg({ ok: !r.sentTo.some((s) => s.status === 'failed'), text: r.sentTo.some((s) => s.status === 'failed') ? 'Some emails could not be sent. Try again later.' : `Report sent to ${who}.${logged ? ' (Email isn\'t connected on this server yet, so it was written to the server log.)' : ''}` });
      setNote('');
      void reload();
    } catch (e) {
      setMsg({ ok: false, text: (e as ApiError).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tlearner">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/teach">Classes</Link>
        <span aria-hidden>/</span>
        <span>{learner.name}</span>
      </nav>
      <header className="class-head">
        <div>
          <h1>{learner.name}</h1>
          <p className="lead">
            {learner.grade ? `Grade ${learner.grade}. ` : ''}
            {learner.classes.join(', ')}.
          </p>
        </div>
        <a className="btn btn-secondary btn-md" href={`/api/reports/learner/${id}`} target="_blank" rel="noopener">
          <Icon name="report" size={18} />
          <span>Open report (PDF)</span>
        </a>
      </header>

      {p ? (
        <div className="stat-strip">
          <div>
            <span className="num">{p.totals.minutes30}</span>
            <span className="muted">minutes in 30 days</span>
          </div>
          <div>
            <span className="num">{p.totals.accuracy30 === null ? '–' : `${p.totals.accuracy30}%`}</span>
            <span className="muted">accuracy, 30 days</span>
          </div>
          <div>
            <span className="num">{p.totals.questions}</span>
            <span className="muted">questions answered</span>
          </div>
          <div>
            <span className="num">{p.totals.improvement30 === null ? '–' : `${p.totals.improvement30 >= 0 ? '+' : ''}${p.totals.improvement30}`}</span>
            <span className="muted">mastery change, 30 days</span>
          </div>
        </div>
      ) : (
        <p className="note">{learner.name} hasn&apos;t finished setting up yet.</p>
      )}

      <div className="class-grid">
        <section className="sheet">
          <h2 className="sheet-title">Mastery by topic</h2>
          {p?.subjects.map((s) => (
            <div key={s.id} className="tl-subject">
              <h3>{s.name}</h3>
              <ul className="rows rows-tight">
                {s.topics.map((t) => (
                  <li key={t.id} className="row">
                    <span className="row-main">
                      <span className="row-title">{t.name}</span>
                    </span>
                    <span className="row-end tl-bar">
                      <MasteryBar value={t.mastery ?? 0} band={t.mastery === null ? 'not-started' : t.mastery >= 85 ? 'mastered' : t.mastery >= 70 ? 'proficient' : t.mastery >= 40 ? 'developing' : 'learning'} size="sm" />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <div className="stack">
          <section className="sheet">
            <h2 className="sheet-title">Send a progress report</h2>
            <p className="muted">
              {learner.hasGuardianEmail ? 'The PDF report goes to their parent or guardian, with a copy to you.' : 'No guardian email is on file (the learner is an adult or didn\'t give one), so the report comes only to you.'}{' '}
              {data.lastReportAt ? `Last sent ${relativeDay(data.lastReportAt)}.` : ''}
            </p>
            <div className="field">
              <label htmlFor="tl-note">A note to include (optional)</label>
              <textarea id="tl-note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Great effort this week. Please encourage 20 minutes of practice on Tuesday and Thursday." />
            </div>
            <Button busy={busy} onClick={() => void send()}>
              <Icon name="mail" size={18} /> Email the report
            </Button>
            {msg ? (
              <p className={msg.ok ? 'note note-ok' : 'form-error'} role={msg.ok ? 'status' : 'alert'}>
                {msg.text}
              </p>
            ) : null}
          </section>

          <section className="sheet">
            <h2 className="sheet-title">Assignments</h2>
            {data.assignments.length ? (
              <ul className="rows rows-tight">
                {data.assignments.map((a) => (
                  <li key={a.id} className="row">
                    <span className="row-main">
                      <span className="row-title">{a.title}</span>
                      <span className="muted">Due {shortDate(a.dueAt)}</span>
                    </span>
                    <span className={`row-end tag ${a.done ? 'tag-done' : a.dueAt < new Date().toISOString().slice(0, 10) ? 'tag-overdue' : 'tag-open'}`}>{a.done ? (a.scorePct !== null ? `Done, ${a.scorePct}%` : 'Done') : a.dueAt < new Date().toISOString().slice(0, 10) ? 'Overdue' : 'Not yet'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">None yet.</p>
            )}
          </section>

          <section className="sheet">
            <h2 className="sheet-title">Recent results</h2>
            {data.recentResults.length ? (
              <ul className="rows rows-tight">
                {data.recentResults.map((r) => (
                  <li key={r.activityId} className="row">
                    <span className="row-main">
                      <span className="row-title">{r.title}</span>
                      <span className="muted">{relativeDay(r.completedAt)}</span>
                    </span>
                    <span className="row-end num">{r.scorePct === null ? '–' : `${r.scorePct}%`}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No completed practice or tests yet.</p>
            )}
          </section>

          {p?.mistakes.length ? (
            <section className="sheet">
              <h2 className="sheet-title">Mistake patterns</h2>
              <ul className="mistake-list">
                {p.mistakes.slice(0, 4).map((m) => (
                  <li key={m.code}>
                    <strong>
                      {m.label} <span className="muted num">×{m.count}</span>
                    </strong>
                    <span>{m.tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
      <p className="muted small">Tutor conversations are private to the learner and are not shown here.</p>
    </div>
  );
}
