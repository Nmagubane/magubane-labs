/**
 * Children's sign-in on a device a parent or teacher has set up: tap your name, then your 3 pictures.
 * Without a set-up device nothing about any child is shown.
 */
import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api.ts';
import { useSession } from '../../lib/session.tsx';
import { Link, useRouter } from '../../lib/router.tsx';
import type { MeResponse } from '../../../shared/api.ts';
import type { JuniorDeviceDto, DeviceChildDto } from '../../../shared/api-junior.ts';
import { PICTURES, CODE_LENGTH } from '../../../shared/junior/pictures.ts';
import { UI, TALK } from '../../../shared/junior/packs/en/core.ts';
import { Logo } from '../../ui/primitives.tsx';
import { Icon } from '../../ui/Icon.tsx';
import { speak } from './speech.ts';

export function JuniorSignIn() {
  const { setMe } = useSession();
  const { navigate } = useRouter();
  const [dev, setDev] = useState<JuniorDeviceDto | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [child, setChild] = useState<DeviceChildDto | null>(null);
  const [code, setCode] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const load = () =>
    api
      .get<JuniorDeviceDto>('/api/junior/device')
      .then(setDev)
      .catch((e: ApiError) => setFailed(e.message));
  useEffect(() => {
    void load();
  }, []);

  const tapPicture = async (id: string, name: string) => {
    if (!child || code.length >= CODE_LENGTH) return;
    void speak(name);
    const next = [...code, id];
    setCode(next);
    setMsg(null);
    if (next.length < CODE_LENGTH) return;
    try {
      const me = await api.post<MeResponse>('/api/junior/login', { childId: child.id, code: next });
      setMe(me);
      navigate('/play', { replace: true });
    } catch (e) {
      const err = e as ApiError;
      setShake(true);
      window.setTimeout(() => setShake(false), 450);
      const text = err.code === 'locked' || err.status === 429 || (err.details as { left?: number } | undefined)?.left === 0 ? UI.locked : UI.wrongCode;
      setMsg(text);
      void speak(text === UI.locked ? TALK.locked : TALK.wrongPictures);
      setCode([]);
      if (text === UI.locked) void load();
    }
  };

  return (
    <main id="main" className="jsi">
      <header className="jsi-top">
        <Logo />
        <Link to="/login" className="btn btn-quiet btn-sm">
          {UI.grownUps}
        </Link>
      </header>
      {failed ? <p role="alert">{failed}</p> : null}
      {dev && !dev.set ? (
        <section className="jsi-setup">
          <h1>Children sign in here with pictures</h1>
          <p>A parent or teacher sets this up once on this phone, tablet or computer. Then each child taps their name and their 3 pictures. No email, no password.</p>
          <ol className="jsi-steps">
            <li>Log in to your parent or teacher account.</li>
            <li>Add your child (or your class).</li>
            <li>Choose “Set up this device for children”.</li>
          </ol>
          <div className="jsi-actions">
            <Link to="/login" className="btn btn-primary btn-lg">
              <span>Log in as a grown-up</span>
            </Link>
            <Link to="/signup/parent" className="btn btn-secondary btn-lg">
              <span>Create a parent account</span>
            </Link>
          </div>
        </section>
      ) : null}
      {dev?.set && !child ? (
        <section className="jsi-who" aria-labelledby="who">
          <h1 id="who" className="jsi-title">
            {UI.whoIsPlaying}
            <button type="button" className="jp-icon-btn" onClick={() => void speak(TALK.whoIsLearning)} aria-label={UI.listen}>
              <Icon name="speaker" size={24} />
            </button>
          </h1>
          <p className="jsi-label">{dev.label}</p>
          {dev.children.length ? (
            <ul className="jsi-names">
              {dev.children.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="jsi-name"
                    disabled={c.locked}
                    onClick={() => {
                      setChild(c);
                      setCode([]);
                      setMsg(null);
                      void speak(TALK.pictures(c.name));
                    }}
                  >
                    <span className="jsi-initial" style={{ background: c.colour }} aria-hidden>
                      {c.name.charAt(0).toUpperCase()}
                    </span>
                    <span>{c.name}</span>
                    {c.locked ? <span className="jsi-locked">{UI.locked}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="note">No children have been added yet. A grown-up can add them after logging in.</p>
          )}
        </section>
      ) : null}
      {child ? (
        <section className="jsi-code" aria-labelledby="code-h">
          <button type="button" className="jsi-back" onClick={() => setChild(null)}>
            <Icon name="back" />
            <span>Not {child.name}?</span>
          </button>
          <h1 id="code-h" className="jsi-title">
            <span className="jsi-initial" style={{ background: child.colour }} aria-hidden>
              {child.name.charAt(0).toUpperCase()}
            </span>
            {UI.pictureCode}
          </h1>
          <ol className={`jsi-slots${shake ? ' shake' : ''}`} aria-label={`${code.length} of ${CODE_LENGTH} pictures chosen`}>
            {Array.from({ length: CODE_LENGTH }, (_, i) => (
              <li key={i} className={code[i] ? 'filled' : ''}>
                {code[i] ? (
                  <span aria-hidden>{PICTURES.find((p) => p.id === code[i])?.icon}</span>
                ) : null}
              </li>
            ))}
          </ol>
          {msg ? (
            <p className="jsi-msg" role="alert">
              {msg}
            </p>
          ) : null}
          <div className="jsi-pad" role="group" aria-label="Pictures">
            {PICTURES.map((p) => (
              <button key={p.id} type="button" className="jsi-pic" onClick={() => void tapPicture(p.id, p.name)} aria-label={p.name} disabled={code.length >= CODE_LENGTH}>
                <span aria-hidden>{p.icon}</span>
              </button>
            ))}
          </div>
          {code.length ? (
            <button type="button" className="btn btn-quiet" onClick={() => setCode(code.slice(0, -1))}>
              <Icon name="undo" />
              <span>{UI.undo}</span>
            </button>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
