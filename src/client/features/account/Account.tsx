import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../../lib/api.ts';
import { useSession } from '../../lib/session.tsx';
import { useRouter } from '../../lib/router.tsx';
import { Button, PageHeader, TextInput } from '../../ui/primitives.tsx';

export function Account() {
  const { me, setMe } = useSession();
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
            <dt>Grade</dt>
            <dd>{me?.profile?.grade}</dd>
          </div>
        </dl>
        <p className="small" style={{ marginTop: 'var(--s4)' }}>
          <a href="/privacy">Read the privacy notice</a>
        </p>
      </section>

      <section className="sheet danger-zone" aria-labelledby="delete-title">
        <h2 id="delete-title" className="sheet-title">
          Delete your account
        </h2>
        <p>This permanently deletes your account and everything recorded about your learning: answers, progress, exams and tutor conversations. It can&apos;t be undone.</p>
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
    </div>
  );
}
