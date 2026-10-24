import { useCallback, useEffect, useState } from 'react';
import { useResource } from '../../lib/useResource.ts';
import { Link } from '../../lib/router.tsx';
import { Button, Loading, ErrorState } from '../../ui/primitives.tsx';
import { Tex } from '../../ui/RichText.tsx';
import { Icon } from '../../ui/Icon.tsx';
import { Block } from '../learn/SkillPage.tsx';
import type { SkillDetailResponse } from '../../../shared/api.ts';

/**
 * Teach a lesson to a whole class from one screen (projector or smartboard): one step at a time,
 * large type, labs fully interactive. Arrow keys or the on-screen buttons move between steps.
 */
export function Present({ skillId }: { skillId: string }) {
  const { data, error, loading, reload } = useResource<SkillDetailResponse>(`/api/skills/${skillId}`);
  const [i, setI] = useState(0);
  const total = (data?.lesson.blocks.length ?? 0) + 1;
  const go = useCallback((d: number) => setI((x) => Math.max(0, Math.min(total - 1, x + d))), [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [role="slider"], button')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') go(1);
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  if (loading && !data) return <Loading label="Preparing the lesson" />;
  if (error && !data) return <ErrorState error={error} onRetry={() => void reload()} />;
  if (!data) return null;
  const { skill, lesson } = data;
  let checks = 0;
  const checkNo = lesson.blocks.map((b) => (b.kind === 'check' ? ++checks : 0));

  return (
    <div className="present">
      <header className="present-bar">
        <Link to={`/learn/${skillId}`} className="btn btn-quiet btn-sm">
          <Icon name="close" size={18} />
          <span>Exit</span>
        </Link>
        <span className="present-title">{lesson.title}</span>
        <span className="present-count num" aria-live="polite">
          {i + 1} / {total}
        </span>
        <button type="button" className="btn btn-quiet btn-sm" onClick={fullscreen}>
          Full screen
        </button>
      </header>
      <main id="main" className="present-stage">
        {i === 0 ? (
          <section className="present-cover graph-paper">
            <p className="present-kicker">
              {skill.subjectName}: {skill.topicName}. Grade {skill.grade}.
            </p>
            <h1>{lesson.title}</h1>
            <div className="present-sig">
              <Tex tex={skill.signature} display />
            </div>
            <p className="present-outcome">By the end: {skill.outcome.charAt(0).toLowerCase() + skill.outcome.slice(1)}</p>
          </section>
        ) : (
          <div className="present-block" key={i}>
            <Block block={lesson.blocks[i - 1]!} skillId={skillId} activityId={null} checkNumber={checkNo[i - 1] ?? 0} teacher />
          </div>
        )}
      </main>
      <footer className="present-nav">
        <Button variant="secondary" onClick={() => go(-1)} disabled={i === 0}>
          Back
        </Button>
        <ol className="present-dots" aria-hidden>
          {Array.from({ length: total }, (_, k) => (
            <li key={k} className={k === i ? 'on' : k < i ? 'done' : ''} />
          ))}
        </ol>
        <Button onClick={() => go(1)} disabled={i >= total - 1}>
          Next
        </Button>
      </footer>
    </div>
  );
}
