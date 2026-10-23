/**
 * The tutor. A notebook conversation, not a chat clone: the tutor writes on the page,
 * your messages sit in the margin column in pen. Streams token by token; Stop, Copy, Regenerate.
 */
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useResource, invalidate } from '../../lib/useResource.ts';
import { api, streamEvents, ApiError } from '../../lib/api.ts';
import { Link, useRouter } from '../../lib/router.tsx';
import { Button, Loading, ErrorState, Empty } from '../../ui/primitives.tsx';
import { Rich, RichBlocks } from '../../ui/RichText.tsx';
import { Icon } from '../../ui/Icon.tsx';
import { relativeDay } from '../../lib/format.ts';
import type { TutorConversationDto, TutorConversationDetail, TutorStatusResponse, TutorMessageDto } from '../../../shared/api.ts';

export function Tutor({ conversationId }: { conversationId: string | null }) {
  const status = useResource<TutorStatusResponse>('/api/tutor/status');
  const list = useResource<TutorConversationDto[]>('/api/tutor/conversations');
  const { navigate } = useRouter();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const newConversation = async (firstMessage?: string) => {
    setCreating(true);
    setCreateError(null);
    try {
      const c = await api.post<TutorConversationDetail>('/api/tutor/conversations', {});
      invalidate('/api/tutor/conversations');
      navigate(`/tutor/${c.id}${firstMessage ? `?q=${encodeURIComponent(firstMessage)}` : ''}`);
    } catch (e) {
      setCreateError((e as ApiError).message);
    } finally {
      setCreating(false);
    }
  };

  if (status.loading && !status.data) return <Loading />;
  if (status.error && !status.data) return <ErrorState error={status.error} onRetry={() => void status.reload()} />;
  const st = status.data!;

  return (
    <div className={`tutor${conversationId ? ' has-conv' : ''}`}>
      <aside className="tutor-list" aria-label="Conversations">
        <div className="tutor-list-head">
          <h1>Tutor</h1>
          <Button size="sm" variant="secondary" busy={creating} disabled={st.locked} onClick={() => void newConversation()}>
            <Icon name="plus" size={16} /> New
          </Button>
        </div>
        {list.data?.length ? (
          <ul className="conv-list">
            {list.data.map((c) => (
              <li key={c.id}>
                <Link to={`/tutor/${c.id}`} className={`conv${c.id === conversationId ? ' on' : ''}`} aria-current={c.id === conversationId ? 'page' : undefined}>
                  <span className="conv-title">{c.title}</span>
                  <span className="conv-meta">{relativeDay(c.updatedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small tutor-list-empty">Your conversations will be listed here.</p>
        )}
      </aside>

      <section className="tutor-main">
        {st.locked ? (
          <Empty title="The tutor is off during your test" action={<Link to="/tests" className="btn btn-primary btn-md"><span>Go to your test</span></Link>}>
            That keeps the result honest. It comes back on as soon as you submit, and it can walk you through every question you got wrong.
          </Empty>
        ) : !st.configured ? (
          <Empty title="The tutor isn't connected yet">
            Whoever runs this copy of Magubane Labs needs to add an <code>ANTHROPIC_API_KEY</code> to the <code>.env</code> file and restart the server. Lessons, practice hints, worked solutions and tests all work without it.
          </Empty>
        ) : conversationId ? (
          <Conversation key={conversationId} id={conversationId} status={st} onChanged={() => (invalidate('/api/tutor/conversations', '/api/tutor/status'), void list.reload(), void status.reload())} />
        ) : (
          <div className="tutor-welcome">
            <h2>A tutor that teaches instead of handing out answers.</h2>
            <p className="lead">Ask about anything you&apos;re learning. It will ask you questions back, find where you&apos;re stuck and help you take the next step yourself. When you&apos;ve genuinely tried, it will show you the full working.</p>
            <ul className="suggest">
              {['Help me understand factorising', "Quiz me on Newton's second law", 'Why does dividing by a fraction make it bigger?', 'Why should I take pure maths instead of maths lit?'].map((s) => (
                <li key={s}>
                  <button type="button" className="chip chip-lg" disabled={creating} onClick={() => void newConversation(s)}>
                    {s}
                  </button>
                </li>
              ))}
            </ul>
            {createError ? (
              <p className="form-error" role="alert">
                {createError}
              </p>
            ) : null}
            <p className="muted small">
              {st.usedToday} of {st.dailyLimit} messages used today. Conversations are saved so you can come back to them.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function Conversation({ id, status, onChanged }: { id: string; status: TutorStatusResponse; onChanged: () => void }) {
  const { data, error, loading, reload, setData } = useResource<TutorConversationDetail>(`/api/tutor/conversations/${id}`);
  const { search, navigate } = useRouter();
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const autoSent = useRef(false);
  const stick = useRef(true);

  const messages: TutorMessageDto[] = data?.messages ?? [];

  // Keep pinned to the bottom while streaming, unless the learner scrolled up to read.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, streaming]);

  const onScroll = () => {
    const el = scroller.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const run = async (path: string, body: unknown, optimistic: TutorMessageDto | null) => {
    if (!data) return;
    setSendError(null);
    const base = optimistic ? [...data.messages, optimistic] : data.messages.slice(0, -1);
    setData({ ...data, messages: base, suggestions: [] });
    setStreaming('');
    stick.current = true;
    const ctrl = new AbortController();
    abort.current = ctrl;
    let text = '';
    try {
      await streamEvents(
        path,
        body,
        (e) => {
          if (e.type === 'delta') {
            text += e.text;
            setStreaming(text);
          } else if (e.type === 'error') setSendError(e.message);
        },
        ctrl.signal,
      );
    } catch (e) {
      const ae = e as ApiError;
      setSendError(ae.message);
      if (optimistic && !text) setDraft(optimistic.content);
    } finally {
      abort.current = null;
      setStreaming(null);
      await reload();
      onChanged();
    }
  };

  const send = (content: string) => {
    const c = content.trim();
    if (!c || streaming !== null) return;
    setDraft('');
    void run(`/api/tutor/conversations/${id}/messages`, { content: c }, { id: `tmp-${Date.now()}`, role: 'user', content: c, createdAt: new Date().toISOString() });
  };

  useEffect(() => {
    const q = search.get('q');
    if (q && data && !autoSent.current && data.messages.length === 0) {
      autoSent.current = true;
      navigate(`/tutor/${id}`, { replace: true });
      send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Auto-grow the composer.
  useLayoutEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [draft]);

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    if (e.key === 'Enter' && !e.shiftKey && !coarse) {
      e.preventDefault();
      send(draft);
    }
  };

  const copy = async (m: TutorMessageDto) => {
    try {
      await navigator.clipboard.writeText(m.content);
      setCopied(m.id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard unavailable
    }
  };

  if (loading && !data) return <Loading label="Opening the conversation" />;
  if (error && !data) return <ErrorState error={error} onRetry={() => void reload()} />;
  if (!data) return null;
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  const limitReached = status.usedToday >= status.dailyLimit;

  return (
    <div className="conv-view">
      <header className="conv-head">
        <Link to="/tutor" className="conv-back" aria-label="All conversations">
          <Icon name="back" />
        </Link>
        <h2>{data.title}</h2>
      </header>
      {data.context?.questionPrompt ? (
        <div className="conv-context">
          <span className="muted small">About this question</span>
          <Rich text={data.context.questionPrompt} as="p" />
        </div>
      ) : data.context?.skillName ? (
        <div className="conv-context">
          <span className="muted small">Skill: {data.context.skillName}</span>
        </div>
      ) : null}

      <div className="messages" ref={scroller} onScroll={onScroll} aria-live="polite" aria-busy={streaming !== null}>
        {messages.length === 0 && streaming === null ? <p className="muted messages-empty">Ask your question. Try to say what you&apos;ve already tried, because it helps the tutor find exactly where you&apos;re stuck.</p> : null}
        {messages.map((m) => (
          <article key={m.id} className={`msg msg-${m.role}`}>
            <span className="msg-who">{m.role === 'user' ? 'You' : 'Tutor'}</span>
            <RichBlocks text={m.content} className="msg-text" />
            {m.role === 'assistant' ? (
              <div className="msg-actions">
                <button type="button" className="icon-btn" onClick={() => void copy(m)} aria-label="Copy reply">
                  <Icon name="copy" size={16} /> <span>{copied === m.id ? 'Copied' : 'Copy'}</span>
                </button>
                {m.id === lastAssistant?.id && streaming === null ? (
                  <button type="button" className="icon-btn" onClick={() => void run(`/api/tutor/conversations/${id}/regenerate`, {}, null)} aria-label="Regenerate reply" disabled={limitReached}>
                    <Icon name="retry" size={16} /> <span>Regenerate</span>
                  </button>
                ) : null}
              </div>
            ) : null}
          </article>
        ))}
        {streaming !== null ? (
          <article className="msg msg-assistant streaming">
            <span className="msg-who">Tutor</span>
            {streaming ? <RichBlocks text={streaming} className="msg-text" /> : <p className="msg-text thinking">Thinking…</p>}
          </article>
        ) : null}
        {sendError ? (
          <p className="form-error" role="alert">
            {sendError}
          </p>
        ) : null}
      </div>

      {data.suggestions.length && streaming === null ? (
        <ul className="suggest suggest-inline" aria-label="Suggested questions">
          {data.suggestions.map((s) => (
            <li key={s}>
              <button type="button" className="chip" onClick={() => send(s)} disabled={limitReached}>
                {s}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <form
        className="composer"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <label htmlFor="composer" className="sr-only">
          Message the tutor
        </label>
        <textarea
          id="composer"
          ref={textarea}
          rows={1}
          value={draft}
          maxLength={2000}
          placeholder={limitReached ? "You've reached today's tutor limit." : 'Ask about a step, an idea, or why something works…'}
          disabled={limitReached}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
        />
        {streaming !== null ? (
          <Button type="button" variant="secondary" onClick={() => abort.current?.abort()} aria-label="Stop the reply">
            <Icon name="stop" size={16} /> Stop
          </Button>
        ) : (
          <Button type="submit" disabled={!draft.trim() || limitReached} aria-label="Send">
            <Icon name="send" size={18} />
          </Button>
        )}
      </form>
      <p className="composer-note muted small">Type x^2 for x². The tutor can make mistakes, so check anything that looks off.</p>
    </div>
  );
}
