/**
 * "I can…": the things a child has shown they can do, in their own words.
 * A record of learning, not a trophy shelf: no counts to chase, no locked slots, no ranks.
 */
import { Link } from '../../lib/router.tsx';
import { useResource } from '../../lib/useResource.ts';
import { useSession } from '../../lib/session.tsx';
import type { IcanDto } from '../../../shared/api-junior.ts';
import { UI, TALK } from '../../../shared/junior/packs/en/core.ts';
import { Icon } from '../../ui/Icon.tsx';
import { useSpeak } from './voice.ts';

const WORLD_LABEL = UI.worlds as Record<string, string>;
const ORDER = ['mathematics', 'home-language', 'english-fal', 'life-skills'];

function IcanLine({ item }: { item: IcanDto }) {
  const say = useSpeak();
  return (
    <li>
      <button type="button" className="ican-line" onClick={() => void say(item.text)} aria-label={`${item.text} Hear it.`}>
        <span className="ican-tick" aria-hidden>
          <Icon name="check" size={20} />
        </span>
        <span className="ican-words">{item.text}</span>
        <Icon name="speaker" size={20} />
      </button>
    </li>
  );
}

/** On the home screen: the newest three, and a way to see them all. */
export function IcanShelf() {
  const { data } = useResource<IcanDto[]>('/api/junior/ican');
  if (!data) return null;
  return (
    <section className="ican" aria-labelledby="ican-h">
      <h2 id="ican-h" className="ican-h">
        {TALK.icanTitle}
      </h2>
      {data.length === 0 ? (
        <p className="ican-empty">{TALK.icanEmpty}</p>
      ) : (
        <>
          <ul className="ican-list">
            {data.slice(0, 3).map((i) => (
              <IcanLine key={i.skillId} item={i} />
            ))}
          </ul>
          {data.length > 3 ? (
            <Link to="/play/ican" className="tray-more">
              {TALK.icanAll(data.length)}
            </Link>
          ) : null}
        </>
      )}
    </section>
  );
}

/** Everything, grouped by subject. */
export function IcanPage() {
  const { data, error, reload } = useResource<IcanDto[]>('/api/junior/ican');
  const { me } = useSession();
  const groups = ORDER.map((s) => ({ subject: s, items: (data ?? []).filter((i) => i.subjectId === s) })).filter((g) => g.items.length);
  return (
    <main id="main" className="jh">
      <header className="jh-top jh-top-back">
        <Link to="/play" className="jp-icon-btn" aria-label={UI.goHome}>
          <Icon name="back" size={28} />
        </Link>
        <h1 className="jh-hello">{TALK.icanTitle}</h1>
        <span />
      </header>
      {error ? (
        <>
          <p role="alert">{error.message}</p>
          <button type="button" className="btn btn-primary btn-lg" onClick={() => void reload()}>
            Try again
          </button>
        </>
      ) : null}
      {!data && !error ? <span className="jp-spinner" aria-hidden /> : null}
      {data && data.length === 0 ? <p className="jh-intro">{TALK.icanEmpty}</p> : null}
      {data && data.length > 0 ? <p className="jh-intro">{TALK.icanIntro(me?.user?.displayName ?? '')}</p> : null}
      {groups.map((g) => (
        <section key={g.subject} className="ican" aria-labelledby={`ican-${g.subject}`}>
          <h2 id={`ican-${g.subject}`} className="ican-h">
            {WORLD_LABEL[g.subject]}
          </h2>
          <ul className="ican-list">
            {g.items.map((i) => (
              <IcanLine key={i.skillId} item={i} />
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
