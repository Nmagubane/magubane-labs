import { useState } from 'react';
import { useResource } from '../../lib/useResource.ts';
import { Button, ButtonLink, Loading, ErrorState, PageHeader, MasteryBar, Segmented } from '../../ui/primitives.tsx';
import { useStartActivity } from '../home/Home.tsx';
import type { CatalogueResponse, HomeResponse } from '../../../shared/api.ts';

export function PracticeHub() {
  const home = useResource<HomeResponse>('/api/home');
  const cat = useResource<CatalogueResponse>('/api/catalogue');
  const { start, busy, error } = useStartActivity();
  const [count, setCount] = useState<'5' | '8' | '12'>('8');
  if ((home.loading && !home.data) || (cat.loading && !cat.data)) return <Loading />;
  if (home.error && !home.data) return <ErrorState error={home.error} onRetry={() => void home.reload()} />;
  if (!home.data || !cat.data) return null;
  const weak = home.data.weakAreas;
  const n = Number(count);

  return (
    <div className="practice-hub">
      <PageHeader title="Practice" lead="Questions adapt as you answer: they get harder when you're right and ease off when you're stuck. Every one has hints and a worked solution.">
        <Segmented label="Questions per set" value={count} onChange={setCount} options={[{ value: '5', label: '5' }, { value: '8', label: '8' }, { value: '12', label: '12' }]} />
      </PageHeader>

      {home.data.activePractice ? (
        <div className="banner" role="status">
          <span>
            You have an unfinished set: <strong>{home.data.activePractice.title}</strong> ({home.data.activePractice.answered} of {home.data.activePractice.targetCount}).
          </span>
          <ButtonLink to={`/practice/${home.data.activePractice.id}`} size="sm">
            Continue
          </ButtonLink>
        </div>
      ) : null}

      <section className="sheet sheet-feature">
        <h2 className="sheet-title">Your weak areas</h2>
        {weak.length ? (
          <>
            <p className="muted">A mixed set from the skills that need it most: {weak.map((w) => w.name).join(', ')}.</p>
            <Button size="lg" busy={busy === 'weak'} onClick={() => void start('weak', { kind: 'practice', weak: true, count: n })}>
              Practise weak areas ({n})
            </Button>
          </>
        ) : (
          <>
            <p className="muted">No weak areas yet. We&apos;ll mix in the skills recommended for you.</p>
            <Button size="lg" busy={busy === 'weak'} onClick={() => void start('weak', { kind: 'practice', weak: true, count: n })}>
              Start a recommended set ({n})
            </Button>
          </>
        )}
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      {cat.data.subjects.map((s) => (
        <section key={s.id} className="practice-subject" aria-labelledby={`ps-${s.id}`}>
          <h2 id={`ps-${s.id}`} className="topic-title">
            {s.name}
          </h2>
          <ul className="rows rows-practice">
            {s.topics.flatMap((t) =>
              t.skills
                .filter((k) => k.inScope || k.evidence > 0)
                .map((k) => (
                  <li key={k.skillId}>
                    <button type="button" className="row row-button" disabled={busy === k.skillId} onClick={() => void start(k.skillId, { kind: 'practice', skillId: k.skillId, count: n })}>
                      <span className="row-main">
                        <span className="row-title">{k.name}</span>
                        <span className="row-sub">{t.name}</span>
                      </span>
                      <span className="row-bar">
                        <MasteryBar value={k.mastery} band={k.band} size="sm" />
                      </span>
                    </button>
                  </li>
                )),
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}
