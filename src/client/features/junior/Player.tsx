/**
 * A Junior session: 5 short questions on one skill. Spoken prompt, big materials on the work mat,
 * one Check button, and feedback that always shows (and says) the right answer and why.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError } from '../../lib/api.ts';
import { useRouter } from '../../lib/router.tsx';
import { invalidate } from '../../lib/useResource.ts';
import type { ActivityStateResponse, AnswerResponse, PracticeItem, FeedbackDto, ActivityDto, WorkedExample } from '../../../shared/api.ts';
import type { ResponseValue } from '../../../shared/questions/answer.ts';
import { getSkill } from '../../../shared/curriculum/catalogue.ts';
import { UI } from '../../../shared/junior/packs/en/core.ts';
import { rightLine, wrongLine, hintLine, watchLine, doneLine } from '../../../shared/junior/narrate.ts';
import { useSession } from '../../lib/session.tsx';
import { Scene } from './Scene.tsx';
import { JuniorInput, canCheck, type Reveal } from './JuniorInput.tsx';
import { Icon } from '../../ui/Icon.tsx';
import { useSpeak, useVoiceToggle } from './voice.ts';
import { stopSpeaking } from './speech.ts';
import { playSound } from './sounds.ts';

type Phase = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'question'; item: PracticeItem; startedAt: number } | { kind: 'feedback'; item: PracticeItem; fb: FeedbackDto; line: string; detail: string } | { kind: 'done' };

export function Player({ id }: { id: string }) {
  const { navigate } = useRouter();
  const say = useSpeak();
  const [voiceOn] = useVoiceToggle();
  const [activity, setActivity] = useState<ActivityDto | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
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
    (item: PracticeItem) => {
      setValue(null);
      setHints(item.hints);
      setPhase({ kind: 'question', item, startedAt: Date.now() });
      void say(item.question.say ?? item.question.prompt);
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

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const st = await api.get<ActivityStateResponse>(`/api/activities/${id}`);
        if (!live) return;
        setActivity(st.activity);
        setResults(st.items.filter((i) => i.feedback).map((i) => !!i.feedback?.correct));
        const open = st.items.find((i) => !i.feedback && i.response === null);
        if (st.answered >= st.activity.targetCount || st.activity.status !== 'in_progress') setPhase({ kind: 'done' });
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
      const turn = offset + results.length;
      const wrong = fb.correct ? null : wrongLine(fb.feedback, fb.solution, turn);
      const line = wrong ? wrong.opener : rightLine(fb.answerDisplay, turn);
      setResults((x) => [...x, fb.correct]);
      setPhase({ kind: 'feedback', item: phase.item, fb, line, detail: wrong?.detail ?? '' });
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

  const target = activity?.targetCount ?? 5;
  const skillName = activity ? (getSkill(activity.skillIds[0] ?? '')?.name ?? activity.title) : '';
  const item = phase.kind === 'question' || phase.kind === 'feedback' ? phase.item : null;
  const reveal: Reveal | null = phase.kind === 'feedback' ? { correct: phase.fb.correctResponse ?? '', wrongIds: phase.fb.wrongIds ?? [], isCorrect: phase.fb.correct } : null;

  if (phase.kind === 'done') return <Done skillName={skillName} results={results} skillId={activity?.skillIds[0] ?? ''} />;

  return (
    <div className="jp">
      <header className="jp-top">
        <button type="button" className="jp-icon-btn" onClick={() => navigate('/play')} aria-label="Stop and go back">
          <Icon name="close" size={26} />
        </button>
        <ol className="jp-dots" aria-label={`Question ${Math.min(results.length + 1, target)} of ${target}`}>
          {Array.from({ length: target }, (_, i) => (
            <li key={i} className={i < results.length ? (results[i] ? 'ok' : 'no') : i === results.length ? 'now' : ''} aria-hidden />
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
            {results.length === 0 ? (
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
          <button type="button" className="btn btn-primary jp-check" onClick={() => (results.length >= target ? setPhase({ kind: 'done' }) : void next())} autoFocus>
            {UI.next}
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

function Done({ skillName, results, skillId }: { skillName: string; results: boolean[]; skillId: string }) {
  const { navigate } = useRouter();
  const { me } = useSession();
  const say = useSpeak();
  const right = results.filter(Boolean).length;
  const [busy, setBusy] = useState(false);
  const [line] = useState(() => doneLine({ name: me?.user?.displayName ?? '', skill: skillName, right, total: results.length, n: Date.now() % 7 }));
  useEffect(() => {
    void say(line.spoken);
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
      <ol className="jp-done-marks" aria-label={UI.firstTry(right, results.length)}>
        {results.map((r, i) => (
          <li key={i} className={r ? 'ok' : 'no'}>
            <Icon name={r ? 'check' : 'retry'} size={30} />
          </li>
        ))}
      </ol>
      <p className="jp-done-line">{UI.firstTry(right, results.length)}</p>
      {right < results.length ? <p className="muted">The ones with a circle arrow are worth another go. Practice makes them stick.</p> : null}
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
