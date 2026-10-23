import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../../lib/api.ts';
import { useSession } from '../../lib/session.tsx';
import { Link } from '../../lib/router.tsx';
import { Button, TextInput, Logo } from '../../ui/primitives.tsx';
import { EquationBalancer } from '../widgets/EquationBalancer.tsx';
import type { MeResponse } from '../../../shared/api.ts';

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const { setMe } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErr({});
    try {
      const me = mode === 'signup' ? await api.post<MeResponse>('/api/auth/signup', { displayName: name, email, password }) : await api.post<MeResponse>('/api/auth/login', { email, password });
      setMe(me);
    } catch (err) {
      const ae = err as ApiError;
      const fe = (ae.details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors;
      if (fe) setFieldErr(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v[0] ?? ''])));
      else setError(ae.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main id="main" className="auth">
      <section className="auth-intro">
        <Logo />
        <h1 className="auth-title">Build the minds that build the future.</h1>
        <p className="auth-lead">Mathematics and science you work out with your own hands: equations you solve step by step, labs you run, and honest feedback on what to do next.</p>
        <div className="auth-demo graph-paper">
          <p className="auth-demo-label">Try it now. Get x on its own, doing the same to both sides.</p>
          <EquationBalancer a={3} b={5} c={0} d={20} />
        </div>
      </section>
      <section className="auth-panel" aria-labelledby="auth-heading">
        <h2 id="auth-heading">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
        <p className="muted">{mode === 'signup' ? 'Free while we build. It takes a minute, then we find your starting point.' : 'Log in to carry on where you left off.'}</p>
        <form onSubmit={submit} noValidate className="form">
          {mode === 'signup' ? <TextInput label="First name" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} error={fieldErr.displayName} required maxLength={40} /> : null}
          <TextInput label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErr.email} required />
          <TextInput
            label="Password"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErr.password}
            hint={mode === 'signup' ? 'At least 8 characters.' : undefined}
            required
          />
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" busy={busy}>
            {mode === 'signup' ? 'Create account' : 'Log in'}
          </Button>
        </form>
        <p className="auth-switch">
          {mode === 'signup' ? (
            <>
              Already have an account? <Link to="/login">Log in</Link>
            </>
          ) : (
            <>
              New here? <Link to="/signup">Create an account</Link>
            </>
          )}
        </p>
        <p className="auth-fine">We only ask for what we need to teach you. Your data is never sold or used for advertising.</p>
      </section>
    </main>
  );
}
