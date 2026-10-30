/**
 * A Junior session: 5 short questions on one skill. Spoken prompt, big materials on the work mat,
 * one Check button, and feedback that always shows (and says) the right answer and why.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError } from '../../lib/api.ts';
import { useRouter, Link } from '../../lib/router.tsx';
import { invalidate } from '../../lib/useResource.ts';
import type { ActivityStateResponse, AnswerResponse, PracticeItem, FeedbackDto, ActivityDto, WorkedExample } from '../../../shared/api.ts';
import type { ResponseValue } from '../../../shared/questions/answer.ts';
import { getSkill } from '../../../shared/curriculum/catalogue.ts';
import { UI, TALK } from '../../../shared/junior/packs/en/core.ts';
import { MAX_JUNIOR_RETRIES } from '../../../shared/api-junior.ts';
import { rightLine, wrongWithRetry, retryIntroLine, retryRightLine, hintLine, watchLine, doneLine } from '../../../shared/junior/narrate.ts';
import { useSession } from '../../lib/session.tsx';
import { Scene } from './Scene.tsx';
import { JuniorInput, canCheck, type Reveal } from './JuniorInput.tsx';
import { Icon } from '../../ui/Icon.tsx';
import { useSpeak, useVoiceToggle } from './voice.ts';
import { stopSpeaking } from './speech.ts';
import { playSound } from './sounds.ts';

type Phase =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'question'; item: PracticeItem; startedAt: number }
  | { kind: 'feedback'; item: PracticeItem; fb: FeedbackDto; line: string; detail: string; offerRetry: boolean }
  | { kind: 'done' };

/** One of the set's first tries, and how its "try one like it" went (if there was one). */
export interface Slot {
  first: boolean;
  second?: boolean;
}

const isRetry = (item: PracticeItem | null | undefined) => !!item?.question.retry;

export function Player({ id }: { id: string }) {
  const { navigate } = useRouter();
  const say = useSpeak();
  const [voiceOn] = useVoiceToggle();
  const [activity, setActivity] = useState<ActivityDto | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [retriesUsed, setRetriesUsed] = useState(0);
  // The five first tries; second tries are extra questions on top.
  const [firstTarget, setFirstTarget] = useState(5);
  // "I can…" statements earned during this set: the end-of-set moment.
  const [earned, setEarned] = useState<{ text: string; spoken: string }[]>([]);
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [value, setValue] = useState<ResponseValue | null>(null);
  const [hints, setHints] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [watch, setWatch] = useState<WorkedExample | null>(null);
  const checkRef = useRef<HTMLButtonElement>(null);
  // Turns the narrator's wording over, starting somewhere different each session.
  const offset = useMemo(() => [...id].reduce((a, c) => a + c.charCodeAt(0), 0), [id]);
  const hintTurn = useRef(0);

  const showQuestion = useCallback(
    (item: PracticeItem, intro = '') => {
      setValue(null);
      setHints(item.hints);
      setPhase({ kind: 'question', item, startedAt: Date.now() });
      void say(`${intro} ${item.question.say ?? item.question.prompt}`.trim());
    },
    [say],
  );

  const next = useCallback(async () => {
    setPhase({ kind: 'loading' });
    try {
      showQuestion(await api.post<PracticeItem>(`/api/activities/${id}/next`, {}));
    } catch (e) {
      if (e instanceof ApiError && e.code === 'complete') setPhase({ kind: 'done' });
      else setPhase({ kind: 'error', message: (e as Error).message });
    }
  }, [id, showQuestion]);

  /** "Try one like it": same kind of question, same level, new numbers. */
  const retry = useCallback(async () => {
    setPhase({ kind: 'loading' });
    try {
      const item = await api.post<PracticeItem>(`/api/activities/${id}/next`, { retry: true });
      setRetriesUsed((n) => n + 1);
      showQuestion(item, retryIntroLine(offset + retriesUsed));
    } catch {
      // Nothing to retry after all (or the cap was reached elsewhere): carry on with the set.
      await next();
    }
  }, [id, next, offset, retriesUsed, showQuestion]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const st = await api.get<ActivityStateResponse>(`/api/activities/${id}`);
        if (!live) return;
        setActivity(st.activity);
        const restored: Slot[] = [];
        for (const it of st.items) {
          if (!it.feedback) continue;
          if (isRetry(it) && restored.length) restored[restored.length - 1]!.second = it.feedback.correct;
          else restored.push({ first: it.feedback.correct });
        }
        const retries = st.items.filter(isRetry).length;
        const firsts = st.activity.targetCount - retries;
        setSlots(restored);
        setRetriesUsed(retries);
        setFirstTarget(firsts);
        const open = st.items.find((i) => !i.feedback && i.response === null);
        if (st.activity.status !== 'in_progress' || (!open && restored.length >= firsts)) setPhase({ kind: 'done' });
        else if (open) showQuestion(open);
        else await next();
      } catch (e) {
        if (live) setPhase({ kind: 'error', message: (e as Error).message });
      }
    })();
    return () => {
      live = false;
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const check = async () => {
    if (phase.kind !== 'question' || !canCheck(phase.item.question.input, value)) return;
    setBusy(true);
    try {
      const r = await api.post<AnswerResponse>(`/api/questions/${phase.item.question.id}/answer`, { response: value, timeMs: Math.min(Date.now() - phase.startedAt, 600_000) });
      const fb = r.feedback as FeedbackDto;
      if (r.ican) setEarned((x) => [...x, { text: r.ican!.text, spoken: r.ican!.spoken }]);
      const second = isRetry(phase.item);
      const turn = offset + slots.length + retriesUsed;
      const offerRetry = !fb.correct && !second && retriesUsed < MAX_JUNIOR_RETRIES;
      const wrong = fb.correct ? null : wrongWithRetry(fb.feedback, fb.solution, turn, { offerRetry, wasRetry: second });
      const line = wrong ? wrong.opener : second ? retryRightLine(fb.answerDisplay, turn) : rightLine(fb.answerDisplay, turn);
      setSlots((x) => (second && x.length ? [...x.slice(0, -1), { ...x[x.length - 1]!, second: fb.correct }] : [...x, { first: fb.correct }]));
      setPhase({ kind: 'feedback', item: phase.item, fb, line, detail: wrong?.detail ?? '', offerRetry });
      playSound(fb.correct ? 'right' : 'notyet', voiceOn);
      void say(wrong ? wrong.spoken : line);
      invalidate('/api/junior');
    } catch (e) {
      setPhase({ kind: 'error', message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const help = async () => {
    if (phase.kind !== 'question') return;
    try {
      const h = await api.post<{ hint: string }>(`/api/questions/${phase.item.question.id}/hint`);
      setHints((x) => [...x, h.hint]);
      void say(hintLine(h.hint, offset + hintTurn.current++));
    } catch (e) {
      void say((e as Error).message);
    }
  };

  const openWatch = async () => {
    if (phase.kind !== 'question') return;
    try {
      const ex = await api.get<WorkedExample>(`/api/skills/${phase.item.question.skillId}/example?level=${phase.item.question.difficulty}`);
      setWatch(ex);
      await say(watchLine(ex.say ?? ex.prompt, ex.solution));
    } catch {
      setWatch(null);
    }
  };

  // Close the set on the server once it's finished, so reports and "sets finished" count it.
  const submitted = useRef(false);
  useEffect(() => {
    if (phase.kind !== 'done' || submitted.current || !activity || activity.status !== 'in_progress') return;
    submitted.current = true;
    void api.post(`/api/activities/${id}/submit`).then(() => invalidate('/api/junior'), () => undefined);
  }, [phase.kind, activity, id]);

  const skillName = activity ? (getSkill(activity.skillIds[0] ?? '')?.name ?? activity.title) : '';
  const item = phase.kind === 'question' || phase.kind === 'feedback' ? phase.item : null;
  const reveal: Reveal | null = phase.kind === 'feedback' ? { correct: phase.fb.correctResponse ?? '', wrongIds: phase.fb.wrongIds ?? [], isCorrect: phase.fb.correct } : null;

  if (phase.kind === 'done') return <Done skillName={skillName} slots={slots} skillId={activity?.skillIds[0] ?? ''} earned={earned} />;

  const retrying = isRetry(item) && phase.kind === 'question';
  const dotClass = (i: number): string => {
    const sl = slots[i];
    if (sl) return `${sl.first ? 'ok' : sl.second ? 'fixed' : 'no'}${retrying && i === slots.length - 1 ? ' retrying' : ''}`;
    return i === slots.length && !retrying ? 'now' : '';
  };
  const finishedFirsts = slots.length >= firstTarget;

  return (
    <div className="jp">
      <header className="jp-top">
        <button type="button" className="jp-icon-btn" onClick={() => navigate('/play')} aria-label="Stop and go back">
          <Icon name="close" size={26} />
        </button>
        <ol className="jp-dots" aria-label={retrying ? 'A second try' : `Question ${Math.min(slots.length + 1, firstTarget)} of ${firstTarget}`}>
          {Array.from({ length: firstTarget }, (_, i) => (
            <li key={i} className={dotClass(i)} aria-hidden />
          ))}
        </ol>
        <button type="button" className="jp-icon-btn jp-listen" onClick={() => item && void say(item.question.say ?? item.question.prompt)} aria-label={UI.listen} disabled={!item}>
          <Icon name="speaker" size={28} />
        </button>
      </header>

      {phase.kind === 'loading' ? (
        <div className="jp-loading" aria-live="polite">
          <span className="jp-spinner" aria-hidden />
          <span className="sr-only">Loading the next question</span>
        </div>
      ) : null}
      {phase.kind === 'error' ? (
        <div className="jp-error" role="alert">
          <p>{phase.message}</p>
          <button type="button" className="btn btn-primary btn-lg" onClick={() => void next()}>
            Try again
          </button>
        </div>
      ) : null}

      {item ? (
        <main id="main" className="jp-main" key={item.question.id}>
          {isRetry(item) ? <p className="jp-retry-tag">{UI.oneLikeIt}</p> : null}
          <h1 className="jp-prompt">{item.question.prompt}</h1>
          {item.question.scene ? (
            <div className="jp-mat graph-paper">
              <Scene scene={item.question.scene} />
            </div>
          ) : null}
          {hints.length ? (
            <ul className="jp-hints" aria-live="polite">
              {hints.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          ) : null}
          <div className="jp-answer">
            <JuniorInput input={item.question.input} value={value} onChange={setValue} locked={phase.kind !== 'question' || busy} reveal={reveal} say={(t) => void say(t)} />
          </div>
        </main>
      ) : null}

      {phase.kind === 'question' ? (
        <footer className="jp-bar">
          <div className="jp-aids">
            {phase.item.question.hintsAvailable > hints.length ? (
              <button type="button" className="btn btn-quiet" onClick={() => void help()}>
                <Icon name="hint" />
                <span>{UI.help}</span>
              </button>
            ) : null}
            {slots.length === 0 && !isRetry(phase.item) ? (
              <button type="button" className="btn btn-quiet" onClick={() => void openWatch()}>
                <Icon name="play" />
                <span>{UI.watch}</span>
              </button>
            ) : null}
          </div>
          <button ref={checkRef} type="button" className="btn btn-primary jp-check" onClick={() => void check()} disabled={busy || !canCheck(phase.item.question.input, value)} aria-busy={busy || undefined}>
            {UI.check}
          </button>
        </footer>
      ) : null}

      {phase.kind === 'feedback' ? (
        <section className={`jp-feedback ${phase.fb.correct ? 'ok' : 'no'}`} role="status" aria-live="assertive">
          <div className="jp-fb-text">
            <p className="jp-fb-head">
              <Icon name={phase.fb.correct ? 'check' : 'cross'} size={28} />
              <span>{phase.line}</span>
            </p>
            {!phase.fb.correct ? (
              <>
                {phase.detail ? <p>{phase.detail}</p> : null}
                <p className="jp-fb-answer">{UI.correctWas(phase.fb.answerDisplay)}</p>
                {phase.fb.solution.length ? <p className="jp-fb-why">{phase.fb.solution.join(' ')}</p> : null}
              </>
            ) : null}
          </div>
          <button type="button" className="btn btn-primary jp-check" onClick={() => (phase.offerRetry ? void retry() : finishedFirsts ? setPhase({ kind: 'done' }) : void next())} autoFocus>
            {phase.offerRetry ? UI.tryOneLikeIt : UI.next}
          </button>
        </section>
      ) : null}

      {watch ? (
        <div className="jp-watch" role="dialog" aria-modal="true" aria-label="Watch first">
          <div className="jp-watch-inner">
            <p className="jp-watch-label">{UI.watch}</p>
            <p className="jp-prompt">{watch.prompt}</p>
            {watch.scene ? (
              <div className="jp-mat graph-paper">
                <Scene scene={watch.scene} />
              </div>
            ) : null}
            {watch.input && watch.answer !== undefined ? (
              <div className="jp-answer">
                <JuniorInput input={watch.input} value={watch.input.kind === 'build' && watch.input.tool === 'coins' ? null : watch.answer} onChange={() => undefined} locked reveal={{ correct: watch.answer, wrongIds: [], isCorrect: true }} say={() => undefined} />
              </div>
            ) : null}
            <ol className="jp-watch-steps">
              {watch.solution.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            <button
              type="button"
              className="btn btn-primary jp-check"
              onClick={() => {
                stopSpeaking();
                setWatch(null);
                if (item) void say(item.question.say ?? item.question.prompt);
              }}
              autoFocus
            >
              My turn
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Done({ skillName, slots, skillId, earned }: { skillName: string; slots: Slot[]; skillId: string; earned: { text: string; spoken: string }[] }) {
  const { navigate } = useRouter();
  const { me } = useSession();
  const say = useSpeak();
  const right = slots.filter((s) => s.first).length;
  const fixed = slots.filter((s) => !s.first && s.second).length;
  const stillTricky = slots.length - right - fixed;
  const [busy, setBusy] = useState(false);
  const [voiceOn] = useVoiceToggle();
  const [line] = useState(() => doneLine({ name: me?.user?.displayName ?? '', skill: skillName, right, total: slots.length, n: Date.now() % 7, fixed }));
  useEffect(() => {
    if (earned.length) playSound('ican', voiceOn);
    void say([line.spoken, ...earned.map((e) => `${TALK.icanNew} ${e.spoken}`)].join(' '));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const again = async () => {
    setBusy(true);
    try {
      const a = await api.post<ActivityDto>('/api/activities', { kind: 'practice', skillId, count: 5 });
      navigate(`/play/go/${a.id}`, { replace: true });
    } finally {
      setBusy(false);
    }
  };
  return (
    <main id="main" className="jp-done">
      <h1>{line.title}</h1>
      <ol className="jp-done-marks" aria-label={`${UI.firstTry(right, slots.length)}${fixed ? ` ${TALK.doneFixed(fixed)}` : ''}`}>
        {slots.map((s, i) => (
          <li key={i} className={s.first ? 'ok' : s.second ? 'fixed' : 'no'}>
            <Icon name={s.first || s.second ? 'check' : 'retry'} size={30} />
          </li>
        ))}
      </ol>
      <p className="jp-done-line">{UI.firstTry(right, slots.length)}</p>
      {fixed ? <p className="jp-done-fixed">{TALK.doneFixed(fixed)}</p> : null}
      {stillTricky ? <p className="muted">The ones with a circle arrow are worth another go. Practice makes them stick.</p> : null}
      {earned.map((e) => (
        <section key={e.text} className="ican-new" aria-label={TALK.icanNewLabel}>
          <span className="ican-new-label">{TALK.icanNewLabel}</span>
          <p className="ican-new-text">{e.text}</p>
          <div className="ican-new-row">
            <button type="button" className="jp-icon-btn" onClick={() => void say(e.spoken)} aria-label="Hear it">
              <Icon name="speaker" size={24} />
            </button>
            <Link to="/play/ican" className="ican-new-all">
              {TALK.icanTitle}
            </Link>
          </div>
        </section>
      ))}
      <div className="jp-done-actions">
        <button type="button" className="btn btn-primary btn-lg" onClick={() => void again()} disabled={busy}>
          Play again
        </button>
        <button type="button" className="btn btn-secondary btn-lg" onClick={() => navigate('/play')}>
          Choose something else
        </button>
      </div>
    </main>
  );
}
