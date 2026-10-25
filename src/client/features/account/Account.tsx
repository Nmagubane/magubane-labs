import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../../lib/api.ts';
import { useSession } from '../../lib/session.tsx';
import { useRouter } from '../../lib/router.tsx';
import { useResource, invalidate } from '../../lib/useResource.ts';
import { Button, PageHeader, TextInput } from '../../ui/primitives.tsx';
import { Icon } from '../../ui/Icon.tsx';
import { PasswordField, passwordOk } from '../auth/PasswordField.tsx';
import { relativeDay } from '../../lib/format.ts';
import type { MyClassDto } from '../../../shared/api-teach.ts';
import type { ProfileDto } from '../../../shared/api.ts';
import { SUBJECTS, subjectsForGrade, defaultSubjects, getSubject, type SubjectId } from '../../../shared/curriculum/catalogue.ts';

const GRADES = [4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = [10, 20, 30, 45, 60];

/** Grade, subjects and daily time. Changing grade keeps all mastery: it only moves the band of skills you see. */
function LearningSettings() {
  const { me, refresh } = useSession();
  const profile = me!.profile!;
  const [open, setOpen] = useState(false);
  const [grade, setGrade] = useState(profile.grade);
  const [subjects, setSubjects] = useState<SubjectId[]>(profile.subjects);
  const [daily, setDaily] = useState(profile.dailyMinutes);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const offered = subjectsForGrade(grade);
  const chosen = subjects.filter((s) => offered.includes(s));
  const start = () => {
    setGrade(profile.grade);
    setSubjects(profile.subjects);
    setDaily(profile.dailyMinutes);
    setErr(null);
    setSaved(null);
    setOpen(true);
  };
  const pickGrade = (g: number) => {
    setGrade(g);
    // Keep what still fits; if nothing does, start from the usual choice for that grade.
    const keep = subjects.filter((s) => subjectsForGrade(g).includes(s));
    setSubjects(keep.length ? keep : defaultSubjects(g));
  };
  const toggle = (s: SubjectId) => setSubjects(subjects.includes(s) ? subjects.filter((x) => x !== s) : [...subjects, s]);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api.put<ProfileDto>('/api/profile', { grade, curriculumId: profile.curriculumId, subjects: chosen, goals: profile.goals, dailyMinutes: daily });
      invalidate('/api/home', '/api/catalogue', '/api/progress', '/api/exams');
      await refresh();
      setSaved(grade !== profile.grade ? `Saved. You're now in Grade ${grade}. Skills you've already practised keep their mastery; Home and Learn now follow Grade ${grade}.` : 'Saved.');
      setOpen(false);
    } catch (x) {
      setErr((x as ApiError).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="sheet">
      <div className="sheet-head">
        <h2 className="sheet-title">Grade and subjects</h2>
        {!open ? (
          <Button size="sm" variant="secondary" onClick={start} aria-label="Change grade and subjects">
            Change
          </Button>
        ) : null}
      </div>
      {!open ? (
        <>
          <dl className="details">
            <div>
              <dt>Grade</dt>
              <dd>Grade {profile.grade}</dd>
            </div>
            <div>
              <dt>Subjects</dt>
              <dd>{profile.subjects.map((s) => getSubject(s)?.name ?? s).join(', ')}</dd>
            </div>
            <div>
              <dt>Time per day</dt>
              <dd>{profile.dailyMinutes} minutes</dd>
            </div>
          </dl>
          {saved ? (
            <p className="note note-ok" role="status">
              {saved}
            </p>
          ) : null}
        </>
      ) : (
        <form onSubmit={save} className="settings-form" noValidate>
          <fieldset>
            <legend>Grade</legend>
            <div className="grade-grid compact" role="radiogroup" aria-label="Grade">
              {GRADES.map((g) => (
                <button key={g} type="button" role="radio" aria-checked={grade === g} className={`grade-btn${grade === g ? ' on' : ''}`} onClick={() => pickGrade(g)}>
                  <span className="grade-num num">{g}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Subjects</legend>
            <div className="chip-row">
              {SUBJECTS.filter((x) => offered.includes(x.id)).map((x) => (
                <button key={x.id} type="button" className={`chip chip-lg${chosen.includes(x.id) ? ' on' : ''}`} aria-pressed={chosen.includes(x.id)} onClick={() => toggle(x.id)}>
                  {chosen.includes(x.id) ? '✓ ' : ''}
                  {x.name}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Time per day</legend>
            <div className="chip-row" role="radiogroup" aria-label="Minutes per day">
              {MINUTES.map((m) => (
                <button key={m} type="button" role="radio" aria-checked={daily === m} className={`chip chip-lg${daily === m ? ' on' : ''}`} onClick={() => setDaily(m)}>
                  {m} min
                </button>
              ))}
            </div>
          </fieldset>
          {grade !== profile.grade ? (
            <p className="note">
              Moving to Grade {grade} keeps everything you&apos;ve learnt. Your recommendations and the Learn page will follow Grade {grade} from now on.
            </p>
          ) : null}
          {err ? (
            <p className="form-error" role="alert">
              {err}
            </p>
          ) : null}
          <div className="row-actions">
            <Button type="submit" busy={busy} disabled={!chosen.length}>
              Save
            </Button>
            <Button type="button" variant="quiet" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
          {!chosen.length ? <p className="small muted">Choose at least one subject.</p> : null}
        </form>
      )}
    </section>
  );
}

export function Account() {
  const { me } = useSession();
  const teacher = me?.user?.role === 'teacher';
  return (
    <div className="account">
      <PageHeader title="Your account" />
      <section className="sheet">
        <h2 className="sheet-title">Details</h2>
        <dl className="details">
          <div>
            <dt>Name</dt>
            <dd>{me?.user?.displayName}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd className="details-email">{me?.user?.email}</dd>
          </div>
          {teacher ? (
            <div>
              <dt>School</dt>
              <dd>{me?.user?.school ?? 'Not given'}</dd>
            </div>
          ) : null}
        </dl>
        <p className="small" style={{ marginTop: 'var(--s4)' }}>
          <a href="/privacy">Read the privacy notice</a>
        </p>
      </section>
      {!teacher && me?.profile ? <LearningSettings /> : null}
      {!teacher ? <MyClasses /> : null}
      {!teacher && me?.user ? (
        <section className="sheet">
          <h2 className="sheet-title">Your progress report</h2>
          <p className="muted">The same PDF report your parent or guardian and your teacher receive.</p>
          <div className="row-actions">
            <a className="btn btn-secondary btn-md" href={`/api/reports/learner/${me.user.id}`} target="_blank" rel="noopener">
              <Icon name="report" size={18} />
              <span>This week (PDF)</span>
            </a>
            <a className="btn btn-quiet btn-md" href={`/api/reports/learner/${me.user.id}?days=30`} target="_blank" rel="noopener">
              <span>Last 30 days</span>
            </a>
          </div>
        </section>
      ) : null}
      <ChangePassword />
      <DeleteAccount teacher={teacher} />
    </div>
  );
}

function MyClasses() {
  const { data, reload } = useResource<MyClassDto[]>('/api/classes');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const join = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const c = await api.post<MyClassDto>('/api/classes/join', { code });
      setMsg({ ok: true, text: `You joined ${c.name} (${c.teacherName}).` });
      setCode('');
      invalidate('/api/home', '/api/classes');
      void reload();
    } catch (err) {
      setMsg({ ok: false, text: (err as ApiError).message });
    } finally {
      setBusy(false);
    }
  };
  const leave = async (c: MyClassDto) => {
    if (!window.confirm(`Leave ${c.name}? ${c.teacherName} will no longer see your progress.`)) return;
    await api.del(`/api/classes/${c.id}`).catch(() => undefined);
    invalidate('/api/home', '/api/classes');
    void reload();
  };
  return (
    <section className="sheet">
      <h2 className="sheet-title">Your classes</h2>
      {data?.length ? (
        <ul className="rows">
          {data.map((c) => (
            <li key={c.id} className="row">
              <span className="row-main">
                <span className="row-title">{c.name}</span>
                <span className="muted">
                  {c.teacherName}
                  {c.school ? `, ${c.school}` : ''}. Joined {relativeDay(c.joinedAt)}.
                </span>
              </span>
              <span className="row-end">
                <Button variant="quiet" size="sm" onClick={() => void leave(c)}>
                  Leave
                </Button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">You&apos;re not in a class. If your teacher uses Magubane Labs, ask for the class code.</p>
      )}
      <p className="muted small">Your teacher sees your mastery, results and common mistakes. Your tutor conversations stay private.</p>
      <form onSubmit={join} className="form join-form" noValidate>
        <div className="flex flex-row flex-1 gap-2">
          <TextInput label="Class code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={12} autoComplete="off" className="code-input" />
          <Button type="submit" variant="secondary" busy={busy} disabled={code.trim().length < 4}>
            Join class
          </Button>
        </div>
      </form>
      {msg ? (
        <p className={msg.ok ? 'note note-ok' : 'form-error'} role={msg.ok ? 'status' : 'alert'}>
          {msg.text}
        </p>
      ) : null}
    </section>
  );
}

function ChangePassword() {
  const { me } = useSession();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const ctx = { email: me?.user?.email ?? '', name: me?.user?.displayName ?? '' };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr({});
    try {
      await api.post('/api/account/password', { current, next });
      setDone(true);
      setOpen(false);
      setCurrent('');
      setNext('');
    } catch (e2) {
      const ae = e2 as ApiError;
      const fe = (ae.details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors;
      setErr(fe ? Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v[0] ?? ''])) : { form: ae.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="sheet">
      <h2 className="sheet-title">Password</h2>
      {done ? (
        <p className="note note-ok" role="status">
          Password changed. You&apos;ve been signed out on your other devices.
        </p>
      ) : null}
      {open ? (
        <form onSubmit={submit} className="form" noValidate>
          <PasswordField label="Current password" value={current} onChange={setCurrent} error={err.current} />
          <PasswordField label="New password" value={next} onChange={setNext} error={err.next} isNew context={ctx} />
          {err.form ? (
            <p className="form-error" role="alert">
              {err.form}
            </p>
          ) : null}
          <div className="row-actions">
            <Button type="submit" busy={busy} disabled={!current || !passwordOk(next, ctx)}>
              Change password
            </Button>
            <Button type="button" variant="quiet" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" onClick={() => (setOpen(true), setDone(false))}>
          Change password
        </Button>
      )}
    </section>
  );
}

function DeleteAccount({ teacher }: { teacher: boolean }) {
  const { setMe } = useSession();
  const { navigate } = useRouter();
  const [password, setPassword] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remove = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/api/account/delete', { password });
      setMe({ user: null, profile: null });
      navigate('/signup', { replace: true });
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="sheet danger-zone" aria-labelledby="delete-title">
      <h2 id="delete-title" className="sheet-title">
        Delete your account
      </h2>
      <p>{teacher ? 'This permanently deletes your teacher account, your classes and assignments. Learners keep their own accounts and progress.' : 'This permanently deletes your account and everything recorded about your learning: answers, progress, exams and tutor conversations.'} It can&apos;t be undone.</p>
      {confirming ? (
        <form onSubmit={remove} className="form">
          <TextInput label="Enter your password to confirm" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={error} />
          <div className="row-actions">
            <Button type="submit" variant="danger" busy={busy} disabled={!password}>
              Delete my account permanently
            </Button>
            <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>
              Keep my account
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" onClick={() => setConfirming(true)}>
          Delete my account
        </Button>
      )}
    </section>
  );
}
