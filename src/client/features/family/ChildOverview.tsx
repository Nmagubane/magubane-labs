/**
 * What a parent or teacher sees about one Grade 1–3 child: what to do next and why, how each subject is
 * going, mistakes with practical tips, the picture code, things to do together, and settings.
 */
import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../../lib/api.ts';
import { useResource, invalidate } from '../../lib/useResource.ts';
import { Link, useRouter } from '../../lib/router.tsx';
import { Button, MasteryBar, Loading, ErrorState, TextInput, PageHeader } from '../../ui/primitives.tsx';
import { Icon } from '../../ui/Icon.tsx';
import type { ChildOverviewDto } from '../../../shared/api-junior.ts';
import { LANGUAGES, type LanguageCode } from '../../../shared/junior/languages.ts';
import { cardsForGrade, type ActivityCard } from '../../../shared/junior/cards.ts';
import { PictureCode, PictureCodePicker, LanguageNote, languageLine } from './ChildBits.tsx';
import { relativeDay } from '../../lib/format.ts';

const KIND_LABEL: Record<ActivityCard['kind'], string> = { move: 'Move', make: 'Make', talk: 'Talk' };

export function ChildOverview({ id, backTo, backLabel }: { id: string; backTo: string; backLabel: string }) {
  const { data, error, reload } = useResource<ChildOverviewDto>(`/api/children/${id}/overview`);
  if (error) return <ErrorState error={error} onRetry={() => void reload()} />;
  if (!data) return <Loading label="Loading" />;
  const c = data.child;
  return (
    <div className="child-page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to={backTo}>{backLabel}</Link>
      </nav>
      <PageHeader title={c.name} lead={`Grade ${c.grade}. Home language: ${languageLine(c.homeLanguage)}.${c.lastActiveAt ? ` Last practised ${relativeDay(c.lastActiveAt)}.` : ' Has not practised yet.'}`}>
        <a className="btn btn-secondary btn-md" href={`/api/reports/learner/${c.id}`} target="_blank" rel="noopener">
          <Icon name="report" size={18} />
          <span>Progress report (PDF)</span>
        </a>
      </PageHeader>

      {c.instructionLanguage !== c.homeLanguage || !c.readingAvailable ? <LanguageNote code={c.homeLanguage} name={c.name} /> : null}

      <section className="sheet ch-week" aria-labelledby="wk">
        <h2 id="wk">This week</h2>
        <dl className="stats">
          <div>
            <dt>Minutes</dt>
            <dd>{data.week.minutes}</dd>
          </div>
          <div>
            <dt>Days practised</dt>
            <dd>{data.week.daysActive}</dd>
          </div>
          <div>
            <dt>Answers</dt>
            <dd>{data.week.answers}</dd>
          </div>
          <div>
            <dt>Right first time</dt>
            <dd>{data.week.firstTryPct === null ? '–' : `${data.week.firstTryPct}%`}</dd>
          </div>
        </dl>
        <p className="muted">Ten to fifteen minutes a day works better than one long session a week.</p>
      </section>

      <section className="sheet" aria-labelledby="nx">
        <h2 id="nx">What {c.name} will see next</h2>
        <ul className="ch-next">
          {data.next.map((n) => (
            <li key={n.skillId}>
              <span className="ch-next-skill">
                {n.name} <span className="muted">(Grade {n.grade})</span>
              </span>
              <span className="muted">{n.why}</span>
            </li>
          ))}
        </ul>
      </section>

      {data.mistakes.length ? (
        <section className="sheet" aria-labelledby="mk">
          <h2 id="mk">How to help</h2>
          <p className="muted">From {c.name}’s recent answers. Each one is a specific thing to practise, not a judgement.</p>
          <ul className="ch-mistakes">
            {data.mistakes.map((m) => (
              <li key={m.code}>
                <p className="ch-m-label">
                  {m.label} <span className="muted">({m.count}× in {m.skills.join(', ')})</span>
                </p>
                <p>{m.tip}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.subjects.map((s) => (
        <section key={s.id} className="sheet" aria-labelledby={`s-${s.id}`}>
          <h2 id={`s-${s.id}`}>
            {s.name}
            {s.avgMastery !== null ? <span className="muted"> (average {s.avgMastery}%)</span> : null}
          </h2>
          {s.skills.some((k) => k.evidence > 0) ? (
            <ul className="ch-skills">
              {s.skills
                .filter((k) => k.evidence > 0)
                .map((k) => (
                  <li key={k.id}>
                    <span className="ch-skill-name">
                      {k.name}
                      {k.grade !== c.grade ? <span className="muted"> (Grade {k.grade})</span> : null}
                    </span>
                    <MasteryBar value={k.mastery} band={k.band} size="sm" />
                  </li>
                ))}
            </ul>
          ) : (
            <p className="muted">Nothing practised yet.</p>
          )}
          {s.skills.some((k) => k.evidence === 0) ? (
            <details className="ch-later">
              <summary>
                {s.skills.filter((k) => k.evidence === 0).length} more {c.name} will meet this year
              </summary>
              <p className="muted">{s.skills.filter((k) => k.evidence === 0).map((k) => k.name).join(', ')}.</p>
            </details>
          ) : null}
        </section>
      ))}

      <TogetherCards child={data} onLogged={() => void reload()} />

      {data.recent.length ? (
        <section className="sheet" aria-labelledby="rc">
          <h2 id="rc">Recent sessions</h2>
          <ul className="ch-recent">
            {data.recent.map((r, i) => (
              <li key={i}>
                <span>{r.title}</span>
                <span className="muted">
                  {r.firstTry} of {r.total} right first time, {relativeDay(r.completedAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {c.canManage ? <Manage data={data} onChanged={() => void reload()} backTo={backTo} /> : null}
    </div>
  );
}

function TogetherCards({ child, onLogged }: { child: ChildOverviewDto; onLogged: () => void }) {
  const cards = cardsForGrade(child.child.grade);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const done = new Map(child.cardsDone.map((d) => [d.cardId, d.doneAt]));
  const log = async (cardId: string) => {
    setBusy(cardId);
    try {
      await api.post(`/api/children/${child.child.id}/cards`, { cardId });
      onLogged();
    } finally {
      setBusy(null);
    }
  };
  return (
    <section className="sheet" aria-labelledby="tg">
      <h2 id="tg">Do together</h2>
      <p className="muted">Physical Education, Creative Arts and some conversations belong off the screen. Each card takes 5 to 20 minutes. Tick it when you have done it.</p>
      <ul className="cards-list">
        {cards.map((k) => (
          <li key={k.id} className={`card-row kind-${k.kind}`}>
            <button type="button" className="card-head" aria-expanded={open === k.id} onClick={() => setOpen(open === k.id ? null : k.id)}>
              <span className="card-kind">{KIND_LABEL[k.kind]}</span>
              <span className="card-title">{k.title}</span>
              <span className="muted">{k.minutes} min</span>
              {done.has(k.id) ? (
                <span className="card-done" title={`Done ${relativeDay(done.get(k.id)!)}`}>
                  <Icon name="check" size={16} />
                  <span className="sr-only">done</span>
                </span>
              ) : null}
            </button>
            {open === k.id ? (
              <div className="card-body">
                {k.needs.length ? <p className="muted">You need: {k.needs.join(', ')}.</p> : null}
                <ol>
                  {k.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
                <p>
                  <strong>Look for:</strong> {k.lookFor}
                </p>
                <p className="muted">
                  CAPS: {k.caps}
                  {k.links ? `. Links to ${k.links}.` : '.'}
                </p>
                <Button variant="secondary" size="sm" busy={busy === k.id} onClick={() => void log(k.id)}>
                  We did this
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Manage({ data, onChanged, backTo }: { data: ChildOverviewDto; onChanged: () => void; backTo: string }) {
  const c = data.child;
  const { navigate } = useRouter();
  const [name, setName] = useState(c.name);
  const [grade, setGrade] = useState(c.grade);
  const [lang, setLang] = useState<LanguageCode>(c.homeLanguage);
  const [code, setCode] = useState<string[]>([]);
  const [editCode, setEditCode] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api.patch(`/api/children/${c.id}`, { name, grade, homeLanguage: lang });
      invalidate('/api/family', '/api/teach');
      setMsg('Saved.');
      onChanged();
    } catch (e2) {
      setMsg((e2 as ApiError).message);
    } finally {
      setBusy(false);
    }
  };
  const newCode = async (chosen?: string[]) => {
    await api.post(`/api/children/${c.id}/code`, chosen ? { code: chosen } : {});
    setEditCode(false);
    setCode([]);
    onChanged();
  };
  const del = async () => {
    try {
      await api.post(`/api/children/${c.id}/delete`, { confirmName: confirm });
      invalidate('/api/family', '/api/teach');
      navigate(backTo, { replace: true });
    } catch (e2) {
      setMsg((e2 as ApiError).message);
    }
  };
  return (
    <section className="sheet" aria-labelledby="mg">
      <h2 id="mg">Sign-in and settings</h2>
      {c.pictureCode ? (
        <div className="ch-code">
          <p>{c.name}’s pictures, in order:</p>
          <PictureCode code={c.pictureCode} size="lg" />
          {editCode ? (
            <>
              <PictureCodePicker value={code} onChange={setCode} />
              <div className="row-actions">
                <Button size="sm" disabled={code.length !== 3} onClick={() => void newCode(code)}>
                  Save these pictures
                </Button>
                <Button size="sm" variant="secondary" onClick={() => void newCode()}>
                  Pick 3 for me
                </Button>
                <Button size="sm" variant="quiet" onClick={() => setEditCode(false)}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setEditCode(true)}>
              Change pictures
            </Button>
          )}
        </div>
      ) : null}
      <form className="form" onSubmit={save}>
        <TextInput label="First name" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
        <div className="field">
          <label htmlFor="mg-grade">Grade</label>
          <select id="mg-grade" value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
            {[1, 2, 3].map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="mg-lang">Home language</label>
          <select id="mg-lang" value={lang} onChange={(e) => setLang(e.target.value as LanguageCode)}>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {languageLine(l.code)}
              </option>
            ))}
          </select>
        </div>
        {msg ? <p role="status">{msg}</p> : null}
        <Button type="submit" busy={busy}>
          Save changes
        </Button>
      </form>
      <details className="danger-zone">
        <div className="pt-3"><summary>Delete {c.name}’s account</summary></div>
        <p>This permanently deletes {c.name} and everything recorded about their learning. It cannot be undone.</p>
        <TextInput label={`Type ${c.name} to confirm`} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
        <Button variant="danger" disabled={confirm.trim().toLowerCase() !== c.name.toLowerCase()} onClick={() => void del()}>
          Delete permanently
        </Button>
      </details>
    </section>
  );
}
