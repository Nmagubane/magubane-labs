import { useState } from 'react';
import { useResource } from '../../lib/useResource.ts';
import { Link } from '../../lib/router.tsx';
import { Button, Loading, ErrorState, MasteryBar, PageHeader, Segmented } from '../../ui/primitives.tsx';
import { Tex } from '../../ui/RichText.tsx';
import { Icon } from '../../ui/Icon.tsx';
import type { CatalogueResponse } from '../../../shared/api.ts';

export function Catalogue() {
  const { data, error, loading, reload } = useResource<CatalogueResponse>('/api/catalogue');
  const [subject, setSubject] = useState<string | null>(null);
  const [everything, setEverything] = useState(false);
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorState error={error} onRetry={() => void reload()} />;
  if (!data) return null;
  // By default a learner sees their own subjects and their grade band (plus anything they have started).
  // A Grade 4 learner shouldn't scroll past calculus to find fractions, but anyone curious can look ahead.
  type Sk = (typeof data.subjects)[number]['topics'][number]['skills'][number];
  const visible = (s: Sk) => everything || s.inScope || s.grade <= data.grade || s.mastery > 0 || s.lessonCompleted;
  const subjects = data.subjects
    .map((sub) => ({ ...sub, topics: sub.topics.map((t) => ({ ...t, skills: t.skills.filter(visible) })).filter((t) => t.skills.length) }))
    .filter((sub) => everything || sub.topics.some((t) => t.skills.some((sk) => sk.inScope)));
  const hidden = data.subjects.reduce((n, sub) => n + sub.topics.reduce((m, t) => m + t.skills.length, 0), 0) - subjects.reduce((n, sub) => n + sub.topics.reduce((m, t) => m + t.skills.length, 0), 0);
  const current = subjects.find((s) => s.id === subject) ?? subjects[0] ?? data.subjects[0]!;

  return (
    <div className="learn">
      <PageHeader title="Learn" lead="Every skill, with your mastery. Lessons take about ten minutes, and each one has something to try with your hands." />
      <div className="learn-bar">
        {subjects.length > 1 ? <Segmented label="Subject" value={current.id} onChange={setSubject} options={subjects.map((s) => ({ value: s.id, label: s.name }))} /> : <span />}
        {hidden > 0 || everything ? (
          <Button size="sm" variant="quiet" onClick={() => setEverything(!everything)}>
            {everything ? 'Show my grade only' : `Look ahead: ${hidden} more skills`}
          </Button>
        ) : null}
      </div>
      {current.topics.map((t) => (
        <section key={t.id} className="topic" aria-labelledby={`t-${t.id}`}>
          <h2 id={`t-${t.id}`} className="topic-title">
            {t.name}
            {t.strand ? <span className="topic-strand">{t.strand}</span> : null}
          </h2>
          <ul className="skill-list">
            {t.skills.map((s) => (
              <li key={s.skillId}>
                <Link to={`/learn/${s.skillId}`} className={`skill-row${s.inScope ? '' : ' out-of-scope'}`}>
                  <span className="skill-sig" aria-hidden>
                    <Tex tex={s.signature} />
                  </span>
                  <span className="skill-main">
                    <span className="skill-name">
                      {s.name}
                      {s.lessonCompleted ? (
                        <span className="lesson-done" title="Lesson completed">
                          <Icon name="check" size={16} label="Lesson completed" />
                        </span>
                      ) : null}
                    </span>
                    <span className="skill-outcome">{s.outcome}</span>
                    <span className="skill-grade">
                      Grade {s.grade}
                      {!s.inScope ? (s.grade > data.grade ? '. Ahead of your grade' : '. Earlier grade') : ''}
                      {s.reviewDue ? '. Review due' : ''}
                    </span>
                  </span>
                  <span className="skill-mastery">
                    <MasteryBar value={s.mastery} band={s.band} size="sm" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
