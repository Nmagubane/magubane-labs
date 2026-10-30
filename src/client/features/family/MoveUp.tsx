/**
 * Grade 3 → Grade 4: give a child their own login for the full app.
 * Shown only on a Grade 3 child's page, to the grown-ups who manage them. Explains what changes before asking.
 */
import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../../lib/api.ts';
import { invalidate } from '../../lib/useResource.ts';
import { useRouter } from '../../lib/router.tsx';
import { Button, TextInput } from '../../ui/primitives.tsx';
import { PasswordField, passwordOk } from '../auth/PasswordField.tsx';

export function MoveUp({ childId, name, forTeacher, guardianEmail, backTo }: { childId: string; name: string; forTeacher: boolean; guardianEmail: string | null; backTo: string }) {
  const { navigate } = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [guardian, setGuardian] = useState(guardianEmail ?? '');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [done, setDone] = useState<{ email: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setFieldErr({});
    try {
      const r = await api.post<{ email: string }>(`/api/children/${childId}/move-up`, {
        email,
        password,
        ...(forTeacher && guardian.trim() ? { guardianEmail: guardian } : {}),
        consent: consent || undefined,
      });
      invalidate('/api/family', '/api/teach', `/api/children/${childId}`);
      setDone(r);
    } catch (e2) {
      const ae = e2 as ApiError;
      const fe = (ae.details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors;
      if (fe) setFieldErr(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v[0] ?? ''])));
      else setErr(ae.message);
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <section className="sheet sheet-feature moveup" role="status" aria-labelledby="mu-done">
        <h2 id="mu-done">{name} is ready for Grade 4</h2>
        <ol className="moveup-steps">
          <li>
            On the <strong>Log in</strong> page (not the picture screen), {name} enters <strong>{done.email}</strong> and the password you chose.
          </li>
          <li>We send a 6-digit code to {done.email} the first time, to confirm the address.</li>
          <li>{name} chooses their subjects and does a short starting-point check, so the questions start at the right level.</li>
        </ol>
        <p className="muted">{forTeacher ? `${name} has left your Foundation Phase class. Their Grade 4 teacher can add them with a class code.` : `${name} no longer appears on the picture screen. You still get the weekly progress report.`}</p>
        <Button variant="secondary" onClick={() => navigate(backTo, { replace: true })}>
          {forTeacher ? 'Back to your classes' : 'Back to your children'}
        </Button>
      </section>
    );

  return (
    <section className="sheet moveup" aria-labelledby="mu">
      <h2 id="mu">Moving up to Grade 4</h2>
      <p>From Grade 4, {name} uses the full Magubane Labs: Mathematics and Natural Sciences &amp; Technology with longer problems, worked solutions and labs. That part needs {name}’s own login, so do this when they start Grade 4.</p>
      <dl className="moveup-what">
        <div>
          <dt>Changes</dt>
          <dd>
            {name} logs in with an email and password instead of pictures. {forTeacher ? `${name} leaves your class.` : 'Their pictures stop working.'}
          </dd>
        </div>
        <div>
          <dt>Stays</dt>
          <dd>Everything {name} has learnt, the things {name} can do, and {forTeacher ? 'the weekly report to their parent or guardian' : 'your weekly progress report'}.</dd>
        </div>
      </dl>
      {!open ? (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Set up {name}’s Grade 4 login
        </Button>
      ) : (
        <form className="form" onSubmit={submit} noValidate>
          <TextInput
            label={`${name}’s login email`}
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErr.email}
            hint={forTeacher ? 'An address the family uses for the child. The first login sends a code to it.' : 'One you can open: the first login sends a code to it. Many email services also deliver yourname+anything@… to you, so yourname+' + name.toLowerCase().replace(/[^a-z]/g, '') + '@… works too.'}
            maxLength={120}
            required
          />
          <PasswordField label={`A password for ${name}`} value={password} onChange={setPassword} error={fieldErr.password} isNew context={{ email, name }} />
          {forTeacher ? <TextInput label="Parent or guardian’s email" type="email" autoComplete="off" value={guardian} onChange={(e) => setGuardian(e.target.value)} error={fieldErr.guardianEmail} hint="We tell them about the change. Weekly reports keep going there." maxLength={120} /> : null}
          <label className="check-row consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              {forTeacher ? (
                <>The school has consent from {name}’s parent or guardian for this login, as described in the <a href="/privacy" target="_blank" rel="noopener">privacy notice</a>.</>
              ) : (
                <>I am {name}’s parent or guardian and agree to {name} having their own login, as described in the <a href="/privacy" target="_blank" rel="noopener">privacy notice</a>.</>
              )}
            </span>
          </label>
          {fieldErr.consent ? (
            <p className="field-msg" role="alert">
              {fieldErr.consent}
            </p>
          ) : null}
          {err ? (
            <p className="form-error" role="alert">
              {err}
            </p>
          ) : null}
          <div className="row-actions">
            <Button type="submit" busy={busy} disabled={!email.trim() || !passwordOk(password, { email, name }) || !consent}>
              Move {name} to Grade 4
            </Button>
            <Button variant="quiet" onClick={() => setOpen(false)}>
              Not yet
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
