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

export function Account() {
  const { me } = useSession();
  const teacher = me?.user?.role === 'teacher';
  return (
    <div className="account">
      <PageHeader title="Your account" />
      <section className="sheet">
        <h2 className="sheet-title">Details</h2>
        <dl className="totals">
          <div>
            <dt>Name</dt>
            <dd>{me?.user?.displayName}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{me?.user?.email}</dd>
          </div>
          <div>
            <dt>{teacher ? 'School' : 'Grade'}</dt>
            <dd>{teacher ? me?.user?.school : me?.profile?.grade}</dd>
          </div>
        </dl>
        <p className="small" style={{ marginTop: 'var(--s4)' }}>
          <a href="/privacy">Read the privacy notice</a>
        </p>
      </section>
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
        <TextInput label="Class code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={12} autoComplete="off" className="code-input" />
        <Button type="submit" variant="secondary" busy={busy} disabled={code.trim().length < 4}>
          Join class
        </Button>
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
