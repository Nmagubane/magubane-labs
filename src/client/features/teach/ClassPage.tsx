import { useState } from 'react';
import { api, ApiError } from '../../lib/api.ts';
import { useResource, invalidate } from '../../lib/useResource.ts';
import { Link, useRouter } from '../../lib/router.tsx';
import { Button, Loading, ErrorState, Segmented, BandDot, Empty } from '../../ui/primitives.tsx';
import { Icon } from '../../ui/Icon.tsx';
import { relativeDay, shortDate, BAND_LABEL } from '../../lib/format.ts';
import { AssignForm } from './AssignForm.tsx';
import type { ClassDetailDto, ClassLearnerDto, ReportSentDto } from '../../../shared/api-teach.ts';

type Tab = 'overview' | 'learners' | 'work' | 'settings';

const FLAG_TEXT: Record<string, string> = { inactive: 'Inactive', struggling: 'Struggling', overdue: 'Overdue work', new: 'New' };

function flagReason(l: ClassLearnerDto): string {
  const bits: string[] = [];
  if (l.flags.includes('inactive')) bits.push(l.lastActiveAt ? `last active ${relativeDay(l.lastActiveAt)}` : 'hasn\'t started yet');
  if (l.flags.includes('struggling')) bits.push(l.accuracy7d !== null && l.accuracy7d < 50 ? `${l.accuracy7d}% correct this week` : `average mastery ${l.avgMastery}%`);
  if (l.flags.includes('overdue')) bits.push(`${l.overdue} overdue ${l.overdue === 1 ? 'task' : 'tasks'}`);
  return bits.join(', ');
}

export function ClassPage({ id }: { id: string }) {
  const { data, error, loading, reload } = useResource<ClassDetailDto>(`/api/teach/classes/${id}`);
  const [tab, setTab] = useState<Tab>('overview');
  if (loading && !data) return <Loading label="Loading the class" />;
  if (error && !data) return <ErrorState error={error} onRetry={() => void reload()} />;
  if (!data) return null;
  const c = data.class;

  return (
    <div className="class-page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/teach">Classes</Link>
        <span aria-hidden>/</span>
        <span>{c.name}</span>
      </nav>
      <header className="class-head">
        <div>
          <h1>{c.name}</h1>
          <p className="lead">
            {c.subjectName}, Grade {c.grade}. {c.learnerCount} {c.learnerCount === 1 ? 'learner' : 'learners'}, {c.activeThisWeek} active this week.
          </p>
        </div>
        <JoinCode code={c.joinCode} />
      </header>

      <Segmented label="Class view" value={tab} onChange={setTab} options={[{ value: 'overview', label: 'Overview' }, { value: 'learners', label: 'Learners' }, { value: 'work', label: 'Assignments' }, { value: 'settings', label: 'Reports & settings' }]} />

      {!data.learners.length && tab !== 'settings' ? (
        <section className="sheet">
          <Empty title="No learners yet">
            Share the class code <strong className="num">{c.joinCode}</strong>. Learners enter it when they sign up, or under &ldquo;Your account&rdquo; if they already have an account.
          </Empty>
        </section>
      ) : tab === 'overview' ? (
        <Overview d={data} onOpen={() => setTab('learners')} />
      ) : tab === 'learners' ? (
        <Learners d={data} onChange={() => void reload()} />
      ) : tab === 'work' ? (
        <Work d={data} onChange={() => void reload()} />
      ) : null}
      {tab === 'settings' ? <Settings d={data} onChange={() => void reload()} /> : null}
    </div>
  );
}

function JoinCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/signup?class=${code}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="join-code">
      <span className="join-label">Class code</span>
      <span className="join-value num">{code}</span>
      <button type="button" className="btn btn-quiet btn-sm" onClick={() => void copy()}>
        <Icon name="copy" size={16} />
        <span>{copied ? 'Link copied' : 'Copy join link'}</span>
      </button>
    </div>
  );
}

function Overview({ d, onOpen }: { d: ClassDetailDto; onOpen: () => void }) {
  const flagged = d.learners.filter((l) => l.flags.some((f) => f !== 'new'));
  const skills = d.skills.filter((s) => s.started > 0);
  return (
    <>
      <div className="class-grid">
        <section className="sheet">
          <h2 className="sheet-title">Needs your attention</h2>
          {flagged.length ? (
            <ul className="rows">
              {flagged.map((l) => (
                <li key={l.id}>
                  <Link to={`/teach/learners/${l.id}`} className="row">
                    <span className="row-main">
                      <span className="row-title">{l.name}</span>
                      <span className="muted">{flagReason(l)}</span>
                    </span>
                    <span className="row-end flag-tags">
                      {l.flags
                        .filter((f) => f !== 'new')
                        .map((f) => (
                          <span key={f} className={`tag tag-${f}`}>
                            {FLAG_TEXT[f]}
                          </span>
                        ))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Everyone is active and on track this week.</p>
          )}
        </section>
        <section className="sheet">
          <h2 className="sheet-title">Most common misconceptions</h2>
          {d.mistakes.length ? (
            <ul className="mistake-list">
              {d.mistakes.slice(0, 5).map((m) => (
                <li key={m.code}>
                  <strong>
                    {m.label}{' '}
                    <span className="muted num">
                      {m.learners} {m.learners === 1 ? 'learner' : 'learners'}
                    </span>
                  </strong>
                  <span>{m.tip}</span>
                  <span className="muted small">Seen in {m.skills.slice(0, 3).join(', ')}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No patterns yet. They appear once learners have answered a few questions.</p>
          )}
        </section>
      </div>

      <section className="sheet">
        <div className="sheet-head">
          <h2 className="sheet-title">Mastery by learner and skill</h2>
          <p className="muted small heat-legend">
            {(['learning', 'developing', 'proficient', 'mastered'] as const).map((b) => (
              <span key={b}>
                <BandDot band={b} /> {BAND_LABEL[b]}
              </span>
            ))}
          </p>
        </div>
        {skills.length ? (
          <div className="heat-wrap" tabIndex={0} aria-label="Mastery table, scrolls sideways">
            <table className="heat">
              <thead>
                <tr>
                  <th scope="col" className="heat-name">
                    Learner
                  </th>
                  {skills.map((s) => (
                    <th key={s.skillId} scope="col" title={`${s.name} (${s.topic})`}>
                      <Link to={`/learn/${s.skillId}`}>{s.name}</Link>
                    </th>
                  ))}
                </tr>
                <tr className="heat-avg">
                  <th scope="row" className="heat-name">
                    Class average
                  </th>
                  {skills.map((s) => (
                    <td key={s.skillId} className="num">
                      {s.classAvg === null ? '–' : `${s.classAvg}%`}
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.learners.map((l) => (
                  <tr key={l.id}>
                    <th scope="row" className="heat-name">
                      <Link to={`/teach/learners/${l.id}`}>{l.name}</Link>
                    </th>
                    {skills.map((s) => {
                      const cell = d.heat[l.id]?.[s.skillId];
                      return (
                        <td key={s.skillId} className={cell ? `heat-cell band-${cell.band}` : 'heat-cell heat-empty'} title={cell ? `${cell.mastery}% from ${cell.evidence} answers` : 'Not started'}>
                          {cell ? <span className="num">{cell.mastery}</span> : <span aria-label="Not started">·</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            Nothing practised yet. <button type="button" className="linklike" onClick={onOpen}>See the learners</button>
          </p>
        )}
      </section>
    </>
  );
}

function Learners({ d, onChange }: { d: ClassDetailDto; onChange: () => void }) {
  const remove = async (l: ClassLearnerDto) => {
    if (!window.confirm(`Remove ${l.name} from ${d.class.name}? You will no longer see their progress.`)) return;
    await api.del(`/api/teach/classes/${d.class.id}/members/${l.id}`).catch(() => undefined);
    invalidate('/api/teach');
    onChange();
  };
  return (
    <section className="sheet">
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Learner</th>
              <th scope="col">Last active</th>
              <th scope="col" className="num-col">
                Min this week
              </th>
              <th scope="col" className="num-col">
                Questions
              </th>
              <th scope="col" className="num-col">
                Accuracy
              </th>
              <th scope="col" className="num-col">
                Mastery
              </th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {d.learners.map((l) => (
              <tr key={l.id}>
                <th scope="row">
                  <Link to={`/teach/learners/${l.id}`}>{l.name}</Link>
                  {l.flags.length ? (
                    <span className="flag-tags">
                      {l.flags.map((f) => (
                        <span key={f} className={`tag tag-${f}`}>
                          {FLAG_TEXT[f]}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </th>
                <td>{l.lastActiveAt ? relativeDay(l.lastActiveAt) : 'Not yet'}</td>
                <td className="num-col">{l.minutes7d}</td>
                <td className="num-col">{l.questions7d}</td>
                <td className="num-col">{l.accuracy7d === null ? '–' : `${l.accuracy7d}%`}</td>
                <td className="num-col">{l.avgMastery === null ? '–' : `${l.avgMastery}%`}</td>
                <td>
                  <button type="button" className="btn btn-quiet btn-sm" onClick={() => void remove(l)} aria-label={`Remove ${l.name} from the class`}>
                    <Icon name="trash" size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">Mastery is the average over the skills each learner has started in this class&apos;s subject and grade.</p>
    </section>
  );
}

function Work({ d, onChange }: { d: ClassDetailDto; onChange: () => void }) {
  const remove = async (id: string) => {
    if (!window.confirm('Delete this assignment? Learners will no longer see it. Work they already did is kept.')) return;
    await api.del(`/api/teach/assignments/${id}`).catch(() => undefined);
    invalidate('/api/teach');
    onChange();
  };
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="class-grid class-grid-work">
      <section className="sheet">
        <h2 className="sheet-title">Set work</h2>
        <AssignForm classId={d.class.id} subjectId={d.class.subjectId} onDone={onChange} />
      </section>
      <section className="sheet">
        <h2 className="sheet-title">Assignments</h2>
        {d.assignments.length ? (
          <ul className="rows">
            {d.assignments.map((a) => {
              const pct = a.total ? Math.round(((a.completed ?? 0) / a.total) * 100) : 0;
              return (
                <li key={a.id} className="row assign-row-item">
                  <span className="row-main">
                    <span className="row-title">{a.title}</span>
                    <span className="muted">
                      Due {shortDate(a.dueAt)}
                      {a.dueAt < today ? ' (closed)' : ''}. {a.completed ?? 0} of {a.total ?? 0} done{a.avgScore != null ? `, average ${a.avgScore}%` : ''}.
                    </span>
                    <span className="progress-bar" aria-hidden>
                      <span style={{ width: `${pct}%` }} />
                    </span>
                  </span>
                  <span className="row-end">
                    <button type="button" className="btn btn-quiet btn-sm" onClick={() => void remove(a.id)} aria-label={`Delete ${a.title}`}>
                      <Icon name="trash" size={16} />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted">No assignments yet. Work you set appears on each learner&apos;s Home screen.</p>
        )}
      </section>
    </div>
  );
}

function Settings({ d, onChange }: { d: ClassDetailDto; onChange: () => void }) {
  const { navigate } = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const patch = async (body: Record<string, unknown>, label: string) => {
    setBusy(label);
    setMsg(null);
    try {
      await api.patch(`/api/teach/classes/${d.class.id}`, body);
      invalidate('/api/teach');
      onChange();
    } catch (e) {
      setMsg({ ok: false, text: (e as ApiError).message });
    } finally {
      setBusy(null);
    }
  };
  const sendReport = async () => {
    setBusy('report');
    setMsg(null);
    try {
      const r = await api.post<ReportSentDto>(`/api/teach/classes/${d.class.id}/report`);
      setMsg({ ok: true, text: `Class report sent to ${r.sentTo.map((s) => s.email).join(', ')}.` });
      onChange();
    } catch (e) {
      setMsg({ ok: false, text: (e as ApiError).message });
    } finally {
      setBusy(null);
    }
  };
  const newCode = async () => {
    if (!window.confirm('Make a new class code? The old one stops working. Learners already in the class stay in it.')) return;
    setBusy('code');
    await api.post(`/api/teach/classes/${d.class.id}/code`).catch(() => undefined);
    invalidate('/api/teach');
    onChange();
    setBusy(null);
  };
  return (
    <div className="class-grid">
      <section className="sheet">
        <h2 className="sheet-title">Reports</h2>
        <p className="muted">
          Every Sunday evening you get a class report (PDF), and each learner&apos;s parent or guardian gets their child&apos;s report. {d.lastReportAt ? `Last sent ${relativeDay(d.lastReportAt)}.` : ''}
        </p>
        <label className="check-row">
          <input type="checkbox" checked={d.class.weeklyReports} disabled={busy !== null} onChange={(e) => void patch({ weeklyReports: e.target.checked }, 'weekly')} />
          <span>Send me the weekly class report</span>
        </label>
        <div className="row-actions">
          <a className="btn btn-secondary btn-md" href={`/api/reports/class/${d.class.id}`} target="_blank" rel="noopener">
            <Icon name="report" size={18} />
            <span>Open class report (PDF)</span>
          </a>
          <Button variant="quiet" busy={busy === 'report'} onClick={() => void sendReport()}>
            Email it to me now
          </Button>
        </div>
        {msg ? (
          <p className={msg.ok ? 'note note-ok' : 'form-error'} role={msg.ok ? 'status' : 'alert'}>
            {msg.text}
          </p>
        ) : null}
      </section>
      <section className="sheet">
        <h2 className="sheet-title">Class</h2>
        <p className="muted">Class code: <strong className="num">{d.class.joinCode}</strong></p>
        <div className="row-actions">
          <Button variant="secondary" busy={busy === 'code'} onClick={() => void newCode()}>
            Make a new code
          </Button>
          {d.class.archived ? (
            <Button variant="secondary" busy={busy === 'archive'} onClick={() => void patch({ archived: false }, 'archive')}>
              Restore class
            </Button>
          ) : (
            <Button
              variant="quiet"
              busy={busy === 'archive'}
              onClick={() => {
                if (window.confirm(`Archive ${d.class.name}? Learners keep their accounts and progress, but you stop seeing them and reports stop.`)) void patch({ archived: true }, 'archive').then(() => navigate('/teach'));
              }}
            >
              Archive class
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
