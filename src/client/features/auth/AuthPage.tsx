import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../../lib/api.ts';
import { useSession } from '../../lib/session.tsx';
import { Link } from '../../lib/router.tsx';
import { Button, TextInput, Logo } from '../../ui/primitives.tsx';
import { TryOne } from './TryOne.tsx';
import { PasswordField, passwordOk } from './PasswordField.tsx';
import type { MeResponse, PublicConfig } from '../../../shared/api.ts';

export type AuthMode = 'login' | 'signup' | 'teacher' | 'parent' | 'forgot';

const HEADINGS: Record<AuthMode, [string, string]> = {
  login: ['Welcome back', 'Log in to carry on where you left off.'],
  signup: ['Create your account', 'Free while we build. It takes a minute, then we find your starting point.'],
  teacher: ['Create a teacher account', 'Set up classes, set work, follow every learner\'s progress and send reports to parents.'],
  parent: ['Create a parent account', 'For children in Grades 1 to 3. You add your children; they sign in by tapping their name and 3 pictures.'],
  forgot: ['Reset your password', "We'll email you a 6-digit code."],
};

function useFieldErrors() {
  const [error, setError] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const handle = (err: unknown) => {
    const ae = err as ApiError;
    const fe = (ae.details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors;
    if (fe && Object.keys(fe).length) {
      setFieldErr(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v[0] ?? ''])));
      setError(null);
    } else setError(ae.message);
  };
  const clear = () => (setError(null), setFieldErr({}));
  return { error, fieldErr, handle, clear };
}

export function AuthPage({ mode }: { mode: AuthMode }) {
  const [cfg, setCfg] = useState<PublicConfig | null>(null);
  useEffect(() => {
    api.get<PublicConfig>('/api/config').then(setCfg).catch(() => undefined);
  }, []);
  const [h, lead] = HEADINGS[mode];
  return (
    <main id="main" className="auth">
      <header className="auth-brand">
        <Logo />
      </header>
      <section className="auth-intro">
        <h1 className="auth-title">Build the minds that build the future.</h1>
        <p className="auth-lead">Maths and science for Grades 4 to 12, worked out with your own hands: step-by-step problems, labs you can play with, and honest feedback on what to do next. Grades 1 to 3 learn maths, reading and life skills with a voice, pictures and real classroom materials.</p>
        <div className="auth-demo graph-paper">
          <TryOne />
        </div>
      </section>
      <section className="auth-panel" aria-labelledby="auth-heading">
        <h2 id="auth-heading">{h}</h2>
        <p className="muted">{mode === 'signup' && cfg?.signupMode === 'closed' ? 'Sign-ups are closed at the moment.' : lead}</p>
        {mode === 'login' ? <LoginForm /> : mode === 'forgot' ? <ForgotForm /> : <SignupForm teacher={mode === 'teacher'} parent={mode === 'parent'} cfg={cfg} />}
        <p className="auth-switch">
          {mode === 'login' ? (
            <>
              New here? <Link to="/signup">Create an account</Link>
            </>
          ) : (
            <>
              Already have an account? <Link to="/login">Log in</Link>
            </>
          )}
        </p>
        {mode === 'signup' || mode === 'login' ? (
          <p className="auth-switch">
            A child in Grades 1 to 3? <Link to="/signup/parent">Create a parent account</Link>. Children sign in <Link to="/junior">with pictures</Link>.
          </p>
        ) : null}
        {mode === 'parent' ? (
          <p className="auth-switch">
            A learner in Grade 4 or up? <Link to="/signup">Create a learner account</Link>
          </p>
        ) : null}
        {mode === 'signup' && cfg?.educatorSignup ? (
          <p className="auth-switch">
            Are you a teacher? <Link to="/signup/teacher">Create a teacher account</Link>
          </p>
        ) : null}
        {mode === 'teacher' ? (
          <p className="auth-switch">
            A learner? <Link to="/signup">Create a learner account</Link>
          </p>
        ) : null}
        <p className="auth-fine">
          We only ask for what we need to teach you. Your data is never sold or used for advertising. <a href="/privacy">Privacy notice</a>
        </p>
      </section>
    </main>
  );
}

function LoginForm() {
  const { setMe } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const { error, fieldErr, handle, clear } = useFieldErrors();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    clear();
    try {
      setMe(await api.post<MeResponse>('/api/auth/login', { email, password }));
    } catch (err) {
      handle(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} noValidate className="form">
      <TextInput label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErr.email} required />
      <PasswordField value={password} onChange={setPassword} error={fieldErr.password} />
      <p className="form-aside">
        <Link to="/forgot">Forgot your password?</Link>
      </p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" busy={busy}>
        Log in
      </Button>
    </form>
  );
}

function SignupForm({ teacher, parent = false, cfg }: { teacher: boolean; parent?: boolean; cfg: PublicConfig | null }) {
  const { setMe } = useSession();
  const params = new URLSearchParams(window.location.search);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [school, setSchool] = useState('');
  const [accessCode, setAccessCode] = useState(() => params.get('code') ?? '');
  const [classCode, setClassCode] = useState(() => params.get('class') ?? '');
  const [showClass, setShowClass] = useState(() => !!params.get('class'));
  const [ageGroup, setAgeGroup] = useState<'adult' | 'minor' | null>(teacher || parent ? 'adult' : null);
  const [guardianName, setGuardianName] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const { error, fieldErr, handle, clear } = useFieldErrors();

  const needsAccess = teacher || (cfg?.signupMode === 'invite' && (parent || !classCode.trim()));
  const pwOk = passwordOk(password, { email, name });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    clear();
    try {
      const me = await api.post<MeResponse>('/api/auth/signup', {
        accountType: teacher ? 'teacher' : parent ? 'parent' : 'learner',
        displayName: name,
        email,
        password,
        ...(needsAccess ? { accessCode } : {}),
        ...(!teacher && !parent && classCode.trim() ? { classCode } : {}),
        ...(teacher ? { school } : {}),
        ageGroup,
        ...(ageGroup === 'minor' ? { guardianName, guardianEmail } : {}),
        consent: consent || undefined,
      });
      setMe(me);
    } catch (err) {
      handle(err);
    } finally {
      setBusy(false);
    }
  };

  if (teacher && cfg && !cfg.educatorSignup)
    return (
      <div className="note">
        <p>Teacher accounts are open to schools in our pilot.{cfg.contactEmail ? ` Write to ${cfg.contactEmail} to join.` : ''}</p>
      </div>
    );

  return (
    <form onSubmit={submit} noValidate className="form">
      {teacher ? (
        <TextInput label="Educator code" hint="Teacher accounts need a code from Magubane Labs. This keeps learner data safe." autoComplete="off" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} error={fieldErr.accessCode} required maxLength={40} />
      ) : parent ? (
        needsAccess ? <TextInput label="Access code" hint="Magubane Labs is in a small pilot. Your access code comes from the person who invited you." autoComplete="off" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} error={fieldErr.accessCode} required maxLength={40} /> : null
      ) : (
        <>
          {showClass ? (
            <TextInput label="Class code" hint="The 6-letter code from your teacher. You'll join their class." autoComplete="off" value={classCode} onChange={(e) => setClassCode(e.target.value.toUpperCase())} error={fieldErr.classCode} maxLength={12} className="code-input" />
          ) : (
            <p className="form-aside">
              <button type="button" className="linklike" onClick={() => setShowClass(true)}>
                I have a class code from my teacher
              </button>
            </p>
          )}
          {needsAccess ? <TextInput label="Access code" hint="Magubane Labs is in a small pilot. Your access code comes from the person who invited you." autoComplete="off" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} error={fieldErr.accessCode} required maxLength={40} /> : null}
        </>
      )}
      <TextInput label={teacher ? 'Your name, as learners know you' : parent ? 'Your name' : 'First name'} placeholder={teacher ? 'e.g. Ms Dlamini' : undefined} autoComplete={teacher ? 'name' : 'given-name'} value={name} onChange={(e) => setName(e.target.value)} error={fieldErr.displayName} required maxLength={40} />
      {teacher ? <TextInput label="School" autoComplete="organization" value={school} onChange={(e) => setSchool(e.target.value)} error={fieldErr.school} required maxLength={100} /> : null}
      <TextInput label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErr.email} hint="We'll send a code to confirm it." required />
      <PasswordField value={password} onChange={setPassword} error={fieldErr.password} isNew context={{ email, name }} />
      {!teacher && !parent ? (
        <fieldset className="age-choice">
          <legend>How old are you?</legend>
          <label className={`radio-row${ageGroup === 'adult' ? ' on' : ''}`}>
            <input type="radio" name="age" checked={ageGroup === 'adult'} onChange={() => setAgeGroup('adult')} />
            <span>18 or older</span>
          </label>
          <label className={`radio-row${ageGroup === 'minor' ? ' on' : ''}`}>
            <input type="radio" name="age" checked={ageGroup === 'minor'} onChange={() => setAgeGroup('minor')} />
            <span>Under 18</span>
          </label>
          {fieldErr.ageGroup ? (
            <p className="field-msg" role="alert">
              {fieldErr.ageGroup}
            </p>
          ) : null}
        </fieldset>
      ) : null}
      {ageGroup === 'minor' ? (
        <div className="guardian">
          <p className="guardian-note">Because you&apos;re under 18, a parent or guardian needs to agree. Please create your account together. They&apos;ll get a weekly progress report by email.</p>
          <TextInput label="Parent or guardian's name" autoComplete="off" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} error={fieldErr.guardianName} maxLength={80} />
          <TextInput label="Parent or guardian's email" type="email" autoComplete="off" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} error={fieldErr.guardianEmail} maxLength={120} />
        </div>
      ) : null}
      {ageGroup ? (
        <label className="check-row consent">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>
            {ageGroup === 'minor' ? (
              <>
                <strong>Parent or guardian:</strong> I have read the{' '}
                <a href="/privacy" target="_blank" rel="noopener">
                  privacy notice
                </a>{' '}
                and I agree to my child using Magubane Labs.
              </>
            ) : (
              <>
                I have read the{' '}
                <a href="/privacy" target="_blank" rel="noopener">
                  privacy notice
                </a>{' '}
                and agree to it{teacher ? ', including how I may use learner data: only to support their learning' : ''}.
              </>
            )}
          </span>
        </label>
      ) : null}
      {fieldErr.consent ? (
        <p className="field-msg" role="alert">
          {fieldErr.consent}
        </p>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" busy={busy} disabled={cfg?.signupMode === 'closed' || !ageGroup || !consent || !pwOk}>
        {teacher ? 'Create teacher account' : parent ? 'Create parent account' : 'Create account'}
      </Button>
    </form>
  );
}

function ForgotForm() {
  const { setMe } = useSession();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const { error, fieldErr, handle, clear } = useFieldErrors();
  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    clear();
    try {
      await api.post('/api/auth/forgot', { email });
      setStep('code');
    } catch (err) {
      handle(err);
    } finally {
      setBusy(false);
    }
  };
  const reset = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    clear();
    try {
      setMe(await api.post<MeResponse>('/api/auth/reset', { email, code, password }));
    } catch (err) {
      handle(err);
    } finally {
      setBusy(false);
    }
  };
  if (step === 'email')
    return (
      <form onSubmit={send} noValidate className="form">
        <TextInput label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErr.email} required />
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" busy={busy} disabled={!email.includes('@')}>
          Email me a code
        </Button>
      </form>
    );
  return (
    <form onSubmit={reset} noValidate className="form">
      <p className="note" role="status">
        If an account exists for <strong>{email}</strong>, a code is on its way. Check your inbox (and spam folder).
      </p>
      <TextInput label="6-digit code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9 ]/g, '').slice(0, 7))} error={fieldErr.code} className="code-input" required />
      <PasswordField label="New password" value={password} onChange={setPassword} error={fieldErr.password} isNew context={{ email }} />
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" busy={busy} disabled={code.replace(/\D/g, '').length !== 6 || !passwordOk(password, { email })}>
        Set new password
      </Button>
      <p className="form-aside">
        <button type="button" className="linklike" onClick={() => void send()}>
          Send another code
        </button>
      </p>
    </form>
  );
}
