import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, ApiError } from '../../lib/api.ts';
import { useSession } from '../../lib/session.tsx';
import { Button, Logo } from '../../ui/primitives.tsx';
import type { MeResponse, PublicConfig } from '../../../shared/api.ts';

/** Shown to a signed-in user until their email address is confirmed with the 6-digit code. */
export function VerifyEmail() {
  const { me, setMe, logout } = useSession();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [wait, setWait] = useState(60);
  const [cfg, setCfg] = useState<PublicConfig | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<PublicConfig>('/api/config').then(setCfg).catch(() => undefined);
    input.current?.focus();
  }, []);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const verify = async (value: string) => {
    setBusy(true);
    setError(null);
    try {
      setMe(await api.post<MeResponse>('/api/auth/verify', { code: value }));
    } catch (e) {
      setError((e as ApiError).message);
      setCode('');
      input.current?.focus();
    } finally {
      setBusy(false);
    }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void verify(code);
  };
  const resend = async () => {
    setError(null);
    setNotice(null);
    try {
      await api.post('/api/auth/resend');
      setNotice('A new code is on its way.');
      setWait(60);
    } catch (e) {
      const ae = e as ApiError;
      const retry = (ae.details as { retryAfter?: number } | undefined)?.retryAfter;
      if (retry) setWait(retry);
      setError(ae.message);
    }
  };

  const digits = code.replace(/\D/g, '');
  return (
    <main id="main" className="verify">
      <div className="verify-card">
        <Logo />
        <h1>Check your email</h1>
        <p className="lead">
          We sent a 6-digit code to <strong>{me?.user?.email}</strong>. Enter it below to confirm it&apos;s you.
        </p>
        <form onSubmit={submit} className="form" noValidate>
          <label htmlFor="otp" className="sr-only">
            6-digit code
          </label>
          <input
            ref={input}
            id="otp"
            className="otp-input num"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={7}
            value={code}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'otp-err' : undefined}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
              setCode(v);
              if (v.length === 6 && !busy) void verify(v);
            }}
            placeholder="000000"
          />
          {error ? (
            <p className="form-error" id="otp-err" role="alert">
              {error}
            </p>
          ) : notice ? (
            <p className="note" role="status">
              {notice}
            </p>
          ) : null}
          <Button type="submit" size="lg" busy={busy} disabled={digits.length !== 6}>
            Confirm
          </Button>
        </form>
        <div className="verify-help">
          <p className="muted">The code works for 10 minutes. Can&apos;t find it? Check your spam or promotions folder.</p>
          {cfg?.emailDelivery === 'log' ? <p className="note">Email isn&apos;t connected on this server yet, so the code is in the server log. Ask the person who runs Magubane Labs.</p> : null}
          <div className="widget-buttons">
            <Button variant="secondary" size="sm" onClick={() => void resend()} disabled={wait > 0}>
              {wait > 0 ? `Send a new code (${wait}s)` : 'Send a new code'}
            </Button>
            <Button variant="quiet" size="sm" onClick={() => void logout()}>
              Wrong email? Log out
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
