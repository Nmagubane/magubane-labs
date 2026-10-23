import { useState } from 'react';
import { useResource } from '../../lib/useResource.ts';
import { Link } from '../../lib/router.tsx';
import { Loading, ErrorState, MasteryBar, PageHeader, Segmented } from '../../ui/primitives.tsx';
import { Tex } from '../../ui/RichText.tsx';
import { Icon } from '../../ui/Icon.tsx';
import type { CatalogueResponse } from '../../../shared/api.ts';

export function Catalogue() {
  const { data, error, loading, reload } = useResource<CatalogueResponse>('/api/catalogue');
  const [subject, setSubject] = useState<string | null>(null);
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorState error={error} onRetry={() => void reload()} />;
  if (!data) return null;
  const current = data.subjects.find((s) => s.id === subject) ?? data.subjects[0]!;

  return (
    <div className="learn">
      <PageHeader title="Learn" lead="Every skill, with your mastery. Lessons take about ten minutes, and each one has something to try with your hands." />
      <Segmented label="Subject" value={current.id} onChange={setSubject} options={data.subjects.map((s) => ({ value: s.id, label: s.name }))} />
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
