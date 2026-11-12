import { useEffect, useRef, useState, type Ref } from 'react';
import { useResource } from '../../lib/useResource.ts';
import { Link } from '../../lib/router.tsx';
import { Button, Loading, ErrorState, MasteryBar, PageHeader, Segmented } from '../../ui/primitives.tsx';
import { Tex } from '../../ui/RichText.tsx';
import { Icon } from '../../ui/Icon.tsx';
import { subjectName, type SubjectId } from '../../../shared/curriculum/catalogue.ts';
import { PHASES, isLookAhead, phaseOf, tierOf } from '../../../shared/curriculum/phases.ts';
import type { CatalogueResponse } from '../../../shared/api.ts';

type Data = CatalogueResponse;
type Sk = Data['subjects'][number]['topics'][number]['skills'][number];

export function Catalogue() {
  const { data, error, loading, reload } = useResource<Data>('/api/catalogue');
  const [subject, setSubject] = useState<string | null>(null);
  const [ahead, setAhead] = useState(false);
  const aheadRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (ahead) aheadRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }, [ahead]);
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorState error={error} onRetry={() => void reload()} />;
  if (!data) return null;

  // Teachers (grade 0) browse everything. Learners see their subjects and grade band; skills from
  // higher grades live behind a separate Look ahead door, so a Grade 4 learner never scrolls past
  // calculus to find fractions, and nobody mistakes a preview for their own work.
  const isAhead = (s: Sk) => isLookAhead(s.grade, data.grade);
  const mine = (s: Sk) => !isAhead(s) && (s.inScope || s.grade <= data.grade || s.mastery > 0 || s.lessonCompleted);
  const subjects = data.subjects
    .filter((sub) => data.grade === 0 || sub.topics.some((t) => t.skills.some((sk) => sk.inScope)))
    .map((sub) => ({ ...sub, topics: sub.topics.map((t) => ({ ...t, skills: t.skills.filter(mine) })).filter((t) => t.skills.length) }));
  const current = subjects.find((s) => s.id === subject) ?? subjects[0] ?? data.subjects[0]!;
  // Look ahead follows the subject tab: Mathematics looks ahead in Mathematics.
  const aheadSubject = data.subjects.find((s) => s.id === current.id);
  const aheadCount = aheadSubject ? aheadSubject.topics.reduce((m, t) => m + t.skills.filter(isAhead).length, 0) : 0;
  const learner = data.grade >= 4;

  return (
    <div className="learn">
      <PageHeader
        title="Learn"
        lead={`${learner ? `Your Grade ${data.grade} skills` : 'Every skill'}, with mastery. Lessons take about ten minutes, and each one has something to try with your hands.`}
      />
      <div className="learn-bar">
        {subjects.length > 1 ? <Segmented label="Subject" value={current.id} onChange={setSubject} options={subjects.map((s) => ({ value: s.id, label: s.name }))} /> : <span />}
        {aheadCount > 0 ? (
          <Button size="sm" variant={ahead ? 'secondary' : 'quiet'} onClick={() => setAhead(!ahead)} aria-expanded={ahead} aria-controls="look-ahead">
            {ahead ? 'Close Look ahead' : `Look ahead: ${aheadCount} skills from higher grades`}
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
                <SkillRow s={s} note={s.inScope || data.grade === 0 ? null : 'Earlier grade'} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {ahead && aheadSubject ? <LookAhead ref={aheadRef} data={data} subject={aheadSubject} tabName={current.name} isAhead={isAhead} /> : null}
    </div>
  );
}

/** Higher-grade skills, grouped by CAPS phase and then subject, clearly marked as a preview. */
function LookAhead({ data, subject, tabName, isAhead, ref }: { data: Data; subject: Data['subjects'][number]; tabName: string; isAhead: (s: Sk) => boolean; ref: Ref<HTMLElement> }) {
  const groups = PHASES.map((phase) => {
    const skills = subject.topics.flatMap((t) => t.skills.filter((s) => isAhead(s) && phaseOf(s.grade).id === phase.id).map((s) => ({ ...s, topicName: t.name })));
    // The same subject can change its name between phases (Natural Sciences → Physical Sciences).
    const name = subjectName(subject.id as SubjectId, phase.from);
    return { phase, skills, renamed: name !== tabName ? name : null };
  }).filter((g) => g.skills.length);

  return (
    <section ref={ref} id="look-ahead" className="look-ahead" aria-labelledby="look-ahead-title" tabIndex={-1}>
      <header className="look-ahead-head">
        <h2 id="look-ahead-title">Look ahead</h2>
        <p>
          Where your subjects go next. Open anything that makes you curious. Practice here is a <strong>preview</strong>: you get full feedback, but it doesn&apos;t change your mastery, and tests stay on Grade {data.grade}.
        </p>
      </header>
      {groups.map(({ phase, skills, renamed }) => (
        <section key={phase.id} className="look-ahead-phase" aria-labelledby={`la-${phase.id}`}>
          <h3 id={`la-${phase.id}`} className="look-ahead-phase-title">
            <span>
              Grades {phase.from}–{phase.to} · {phase.name}
            </span>
            <span className="tier-tag">{tierOf(phase.from).name}</span>
          </h3>
          {renamed ? <p className="look-ahead-renamed">In these grades it&apos;s called {renamed}.</p> : null}
          <ul className="skill-list">
            {skills.map((s) => (
              <li key={s.skillId}>
                <SkillRow s={s} note={`${s.topicName}. Preview`} preview />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}

function SkillRow({ s, note, preview = false }: { s: Sk; note: string | null; preview?: boolean }) {
  return (
    <Link to={`/learn/${s.skillId}`} className={`skill-row${s.inScope ? '' : ' out-of-scope'}${preview ? ' is-preview' : ''}`}>
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
          {note ? `. ${note}` : ''}
          {s.reviewDue && !preview ? '. Review due' : ''}
        </span>
      </span>
      <span className="skill-mastery">{preview ? <span className="preview-tag">Preview</span> : <MasteryBar value={s.mastery} band={s.band} size="sm" />}</span>
    </Link>
  );
}
