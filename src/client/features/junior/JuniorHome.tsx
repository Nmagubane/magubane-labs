/** The child's home: one suggestion per subject, each a big tray you tap to start. No menus to read. */
import { useEffect, useState } from 'react';
import { api } from '../../lib/api.ts';
import { useRouter, Link } from '../../lib/router.tsx';
import { useResource } from '../../lib/useResource.ts';
import { useSession } from '../../lib/session.tsx';
import type { ActivityDto } from '../../../shared/api.ts';
import type { JuniorHomeDto, JuniorSkillCard, JuniorWorldDto } from '../../../shared/api-junior.ts';
import type { SubjectId } from '../../../shared/curriculum/catalogue.ts';
import { UI } from '../../../shared/junior/packs/en/core.ts';
import { Icon } from '../../ui/Icon.tsx';
import { useSpeak, useVoiceToggle } from './voice.ts';

const WORLD_LABEL = UI.worlds as Record<string, string>;

/** Growth marks: not started, growing, getting strong, strong. Honest, small, never a score. */
export function Growth({ card }: { card: Pick<JuniorSkillCard, 'band'> }) {
  const n = card.band === 'not-started' ? 0 : card.band === 'learning' || card.band === 'developing' ? 1 : card.band === 'proficient' ? 2 : 3;
  const label = n === 0 ? UI.new : n === 3 ? UI.strong : UI.growing;
  return (
    <span className="growth" role="img" aria-label={label}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= n ? 'on' : ''} aria-hidden />
      ))}
    </span>
  );
}

/** A drawn mark for each subject, from the subject's own materials. */
export function WorldMark({ subject }: { subject: SubjectId }) {
  if (subject === 'mathematics')
    return (
      <span className="wm wm-maths" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={i < 7 ? 'on' : ''} />
        ))}
      </span>
    );
  if (subject === 'home-language')
    return (
      <span className="wm wm-letters" aria-hidden>
        <span>s</span>
        <span>a</span>
        <span>t</span>
      </span>
    );
  if (subject === 'english-fal')
    return (
      <span className="wm wm-letters wm-en" aria-hidden>
        <span>A</span>
        <span>b</span>
        <span>c</span>
      </span>
    );
  return (
    <span className="wm wm-world" aria-hidden>
      🌱
    </span>
  );
}

export function useStartSkill() {
  const { navigate } = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const start = async (skillId: string) => {
    if (busy) return;
    setBusy(skillId);
    try {
      const a = await api.post<ActivityDto>('/api/activities', { kind: 'practice', skillId, count: 5 });
      navigate(`/play/go/${a.id}`);
    } finally {
      setBusy(null);
    }
  };
  return { start, busy };
}

const REASON: Record<string, string> = { 'catch-up': 'Let’s make this strong', review: 'Remember this?', continue: 'Keep going', new: 'Something new', practise: 'Practise' };

export function JuniorHome() {
  const { data, error, reload } = useResource<JuniorHomeDto>('/api/junior/home');
  const { logout } = useSession();
  const { navigate } = useRouter();
  const say = useSpeak();
  const [voiceOn, setVoiceOn] = useVoiceToggle();
  const { start, busy } = useStartSkill();

  useEffect(() => {
    if (data) void say(`${UI.greeting(data.name)} ${UI.todayIntro}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.name]);

  const finish = async () => {
    await logout();
    navigate('/junior', { replace: true });
  };

  if (error)
    return (
      <main id="main" className="jh">
        <p role="alert">{error.message}</p>
        <button type="button" className="btn btn-primary btn-lg" onClick={() => void reload()}>
          Try again
        </button>
      </main>
    );
  if (!data)
    return (
      <main id="main" className="jh" aria-busy>
        <span className="jp-spinner" aria-hidden />
      </main>
    );

  return (
    <main id="main" className="jh">
      <header className="jh-top">
        <h1 className="jh-hello">{UI.greeting(data.name)}</h1>
        <div className="jh-tools">
          <button type="button" className="jp-icon-btn" onClick={() => setVoiceOn(!voiceOn)} aria-pressed={voiceOn} aria-label={voiceOn ? 'Voice is on. Turn it off.' : 'Voice is off. Turn it on.'}>
            <Icon name={voiceOn ? 'speaker' : 'mute'} size={26} />
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => void finish()}>
            {UI.signOut}
          </button>
        </div>
      </header>
      <p className="jh-intro">{UI.todayIntro}</p>
      <ul className="jh-worlds">
        {data.worlds.map((w) => (
          <li key={w.subjectId} className={`tray tray-${w.subjectId}`}>
            <button type="button" className="tray-go" onClick={() => void start(w.next.skillId)} disabled={!!busy} aria-busy={busy === w.next.skillId || undefined} aria-label={`${WORLD_LABEL[w.subjectId]}: ${w.next.name}. Play.`}>
              <WorldMark subject={w.subjectId} />
              <span className="tray-text">
                <span className="tray-world">{WORLD_LABEL[w.subjectId]}</span>
                <span className="tray-skill">{w.next.name}</span>
                <span className="tray-meta">
                  <Growth card={w.next} />
                  {w.next.reason ? <span className="tray-reason">{REASON[w.next.reason]}</span> : null}
                </span>
              </span>
              <span className="tray-play" aria-hidden>
                <Icon name="play" size={34} />
              </span>
            </button>
            <Link to={`/play/${w.subjectId}`} className="tray-more">
              {UI.chooseSomething}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

export function JuniorWorld({ subject }: { subject: string }) {
  const { data, error } = useResource<JuniorWorldDto>(`/api/junior/world/${subject}`);
  const { start, busy } = useStartSkill();
  const say = useSpeak();
  return (
    <main id="main" className="jh jw">
      <header className="jh-top">
        <Link to="/play" className="jp-icon-btn" aria-label={UI.goHome}>
          <Icon name="back" size={28} />
        </Link>
        <h1 className="jh-hello">{WORLD_LABEL[subject] ?? subject}</h1>
        <span />
      </header>
      {error ? <p role="alert">{error.message}</p> : null}
      {data?.topics.map((t) => (
        <section key={t.id} className="jw-topic" aria-labelledby={`t-${t.id}`}>
          <h2 id={`t-${t.id}`}>{t.name}</h2>
          <ul className="jw-skills">
            {t.skills.map((s) => (
              <li key={s.skillId}>
                <button type="button" className={`jw-skill${s.reason ? ' suggested' : ''}`} onClick={() => void start(s.skillId)} onFocus={() => void say(s.name)} disabled={!!busy}>
                  <span className="jw-name">{s.name}</span>
                  <Growth card={s} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
