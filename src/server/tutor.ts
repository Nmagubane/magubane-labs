/**
 * The AI tutor. A teacher, not an answer vending machine.
 * - Streams from the Anthropic Messages API (no SDK; plain fetch + SSE).
 * - Locked server-side while any assessment is in progress.
 * - Sends grade and skill context only: never names, emails or other personal data.
 */
import type { ServerResponse } from 'node:http';
import type { Db } from './db.ts';
import { all, one, run, newId } from './db.ts';
import { HttpError, RateLimiter } from './http.ts';
import { config, now } from './config.ts';
import { getProfile, getStates } from './learner.ts';
import { activeAssessment } from './activities.ts';
import type { UserDto, TutorConversationDto, TutorConversationDetail, TutorMessageDto, TutorStatusResponse, TutorStreamEvent } from '../shared/api.ts';
import { getSkill, getTopic, getSubject } from '../shared/curriculum/catalogue.ts';
import { effectiveMastery } from '../shared/mastery/model.ts';
import { weakAreas } from '../shared/mastery/recommend.ts';
import { responseText, type ResponseValue } from '../shared/questions/answer.ts';
import { mistakeInfo } from '../shared/questions/mistakes.ts';

const perMinute = new RateLimiter(10, 60_000);

interface ConversationRow {
  id: string;
  user_id: string;
  title: string;
  context: string | null;
  updated_at: string;
}

interface Context {
  skillId?: string;
  questionId?: string;
}

function usedToday(db: Db, userId: string): number {
  const since = new Date(now().getTime() - 86_400_000).toISOString();
  return (one<{ n: number }>(db, `SELECT COUNT(*) AS n FROM tutor_messages WHERE user_id = ? AND role = 'user' AND created_at >= ?`, userId, since)?.n ?? 0) as number;
}

export function tutorStatus(db: Db, user: UserDto): TutorStatusResponse {
  return { configured: config.anthropicKey !== null, locked: activeAssessment(db, user.id) !== null, usedToday: usedToday(db, user.id), dailyLimit: config.tutorDailyLimit };
}

function assertUnlocked(db: Db, user: UserDto) {
  const a = activeAssessment(db, user.id);
  if (a) throw new HttpError(423, 'assessment_in_progress', 'The tutor is switched off while you have a test in progress. Finish the test first.', { activityId: a.id });
}

function loadConversation(db: Db, user: UserDto, id: string): ConversationRow {
  const c = one<ConversationRow>(db, 'SELECT * FROM tutor_conversations WHERE id = ?', id);
  if (!c || c.user_id !== user.id) throw new HttpError(404, 'not_found', 'That conversation does not exist.');
  return c;
}

function questionInfo(db: Db, user: UserDto, questionId: string) {
  const q = one<{ id: string; user_id: string; activity_id: string; skill_id: string; payload: string; secret: string; difficulty: number }>(db, 'SELECT * FROM question_instances WHERE id = ?', questionId);
  if (!q || q.user_id !== user.id) throw new HttpError(404, 'not_found', 'That question does not exist.');
  const a = one<{ mode: string; status: string }>(db, 'SELECT mode, status FROM activities WHERE id = ?', q.activity_id)!;
  if (a.mode === 'assessment' && a.status === 'in_progress') throw new HttpError(423, 'assessment_in_progress', 'The tutor can\'t help with a test question until the test is submitted.');
  const r = one<{ response: string | null; is_correct: number | null; mistake_code: string | null }>(db, 'SELECT response, is_correct, mistake_code FROM responses WHERE question_id = ?', q.id);
  return { q, payload: JSON.parse(q.payload) as { prompt: string }, secret: JSON.parse(q.secret) as { answerDisplay: string; solution: string[]; hints: string[] }, response: r ?? null };
}

function toConvDto(db: Db, user: UserDto, c: ConversationRow): TutorConversationDto {
  const ctx = c.context ? (JSON.parse(c.context) as Context) : null;
  let questionPrompt: string | undefined;
  if (ctx?.questionId) {
    const q = one<{ payload: string }>(db, 'SELECT payload FROM question_instances WHERE id = ? AND user_id = ?', ctx.questionId, user.id);
    questionPrompt = q ? (JSON.parse(q.payload) as { prompt: string }).prompt : undefined;
  }
  return {
    id: c.id,
    title: c.title,
    context: ctx ? { ...ctx, ...(ctx.skillId ? { skillName: getSkill(ctx.skillId)?.name } : {}), ...(questionPrompt ? { questionPrompt } : {}) } : null,
    updatedAt: c.updated_at,
  };
}

export function listConversations(db: Db, user: UserDto): TutorConversationDto[] {
  return all<ConversationRow>(db, 'SELECT * FROM tutor_conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50', user.id).map((c) => toConvDto(db, user, c));
}

export function createConversation(db: Db, user: UserDto, ctx: Context): TutorConversationDetail {
  assertUnlocked(db, user);
  let title = 'New conversation';
  const context: Context = {};
  if (ctx.questionId) {
    const info = questionInfo(db, user, ctx.questionId);
    context.questionId = ctx.questionId;
    context.skillId = info.q.skill_id;
    title = `Help with ${getSkill(info.q.skill_id)?.name.toLowerCase() ?? 'a question'}`;
  } else if (ctx.skillId) {
    const s = getSkill(ctx.skillId);
    if (!s) throw new HttpError(404, 'unknown_skill', 'That skill does not exist.');
    context.skillId = s.id;
    title = s.name;
  }
  const id = newId('cnv');
  const t = now().toISOString();
  run(db, 'INSERT INTO tutor_conversations (id, user_id, title, context, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', id, user.id, title, Object.keys(context).length ? JSON.stringify(context) : null, t, t);
  return getConversation(db, user, id);
}

function suggestionsFor(db: Db, user: UserDto, ctx: Context | null, hasMessages: boolean): string[] {
  if (ctx?.questionId) {
    const info = questionInfo(db, user, ctx.questionId);
    if (info.response && info.response.is_correct === 0) return ['Why was my answer wrong?', 'Show me where I went wrong, step by step', 'Give me a similar one to try'];
    if (info.response) return ['Is there a faster way to do this?', 'Why does this method work?', 'Give me a harder one'];
    return ['Give me a hint, not the answer', 'What should I do first?', 'Explain the idea behind this'];
  }
  if (ctx?.skillId) {
    const name = getSkill(ctx.skillId)?.name.toLowerCase() ?? 'this';
    return [`Explain ${name} simply`, 'Show me a worked example', 'Where is this used in real life?'];
  }
  if (hasMessages) return [];
  return ['Help me understand factorising', 'Quiz me on Newton\'s second law', 'Why do I need pure maths?'];
}

export function getConversation(db: Db, user: UserDto, id: string): TutorConversationDetail {
  const c = loadConversation(db, user, id);
  const messages = all<TutorMessageDto & { created_at: string }>(db, 'SELECT id, role, content, created_at FROM tutor_messages WHERE conversation_id = ? ORDER BY created_at, rowid', id).map((m) => ({ id: m.id, role: m.role, content: m.content, createdAt: m.created_at }));
  const ctx = c.context ? (JSON.parse(c.context) as Context) : null;
  let suggestions: string[] = [];
  try {
    suggestions = messages.length > 4 ? [] : suggestionsFor(db, user, ctx, messages.length > 0);
  } catch {
    suggestions = [];
  }
  return { ...toConvDto(db, user, c), messages, suggestions };
}

export function deleteConversation(db: Db, user: UserDto, id: string): void {
  loadConversation(db, user, id);
  run(db, 'DELETE FROM tutor_conversations WHERE id = ?', id);
}

// ---------- prompt ----------

function systemPrompt(db: Db, user: UserDto, ctx: Context | null): string {
  const profile = getProfile(db, user.id);
  const states = getStates(db, user.id);
  const at = now();
  const lines: string[] = [];
  lines.push(
    `You are the tutor inside Magubane Labs, a mathematics and science learning platform for school learners${profile?.curriculumId === 'za-caps' ? ' in South Africa (CAPS curriculum)' : ''}.`,
    profile ? `The learner is in Grade ${profile.grade}. Pitch every explanation at that level.` : '',
    '',
    'How you teach:',
    '- You are a teacher, not an answer vending machine. Work out what the learner is stuck on, find the conceptual gap, then ask one useful question or give one hint.',
    '- Do not give the final answer straight away. Give the smallest helpful step. If the learner has tried and is still stuck after two or three exchanges, or clearly understands the idea and only wants to check, give more direct help, including a full worked solution. Never be withholding to the point of frustration.',
    '- When a learner is wrong, say so kindly and specifically. Explain WHY, then let them try again.',
    '- Keep replies short: usually 2–6 sentences. One idea at a time. End with a question or a next step when it helps.',
    '- Use LaTeX for all maths, inline as $...$ and display as $$...$$. Use **bold** sparingly. No headings and no tables.',
    '- Be accurate. If you are not sure of a fact, say so. Use SI units, and g = 9.8 m/s² unless told otherwise.',
    '- Encourage effort and reasoning, not "being smart". Never say a learner is bad at maths. Mistakes are information.',
    '- Use South African contexts where natural (rand, local places), never forced.',
    '',
    'Boundaries:',
    '- Stay on learning: maths, science, study skills, careers in STEM. Politely steer anything else back.',
    '- Never ask for personal information (full name, school, address, phone, social media).',
    '- If the learner seems upset, unsafe or mentions harm, respond with warmth, encourage them to talk to a parent, teacher or another trusted adult straight away, and keep it brief.',
    '- Questions are generated by the platform, not by you. If asked for practice, you may suggest one or two quick questions, and point them to Practice for tracked, marked questions.',
  );

  const weak = profile ? weakAreas({ states, now: at, subjects: profile.subjects, grade: profile.grade }, 3) : [];
  if (weak.length) lines.push('', `Skills the learner is currently weakest at: ${weak.map((w) => `${getSkill(w.skillId)?.name} (${w.mastery}% mastery)`).join('; ')}.`);

  if (ctx?.skillId) {
    const s = getSkill(ctx.skillId);
    if (s) {
      const topic = getTopic(s.topicId);
      lines.push('', `This conversation is about the skill "${s.name}" (${getSubject(topic?.subjectId ?? '')?.name} › ${topic?.name}): ${s.outcome} Learner's mastery: ${effectiveMastery(states.get(s.id), at)}%.`);
    }
  }
  if (ctx?.questionId) {
    try {
      const info = questionInfo(db, user, ctx.questionId);
      lines.push('', 'The learner opened this conversation from this question:', `QUESTION: ${info.payload.prompt}`);
      if (info.response?.response) {
        const resp = responseText(JSON.parse(info.response.response) as ResponseValue);
        lines.push(`THE LEARNER ANSWERED: ${resp} — which was ${info.response.is_correct ? 'CORRECT' : 'INCORRECT'}.`);
        if (info.response.mistake_code) lines.push(`Diagnosed mistake: ${mistakeInfo(info.response.mistake_code)?.label ?? info.response.mistake_code}.`);
        lines.push(`CORRECT ANSWER (they have already seen it): ${info.secret.answerDisplay}`, `WORKED SOLUTION: ${info.secret.solution.join(' ')}`);
      } else {
        lines.push(
          'The learner has NOT answered yet.',
          `For your reference only (do not reveal unless they have genuinely tried and remain stuck): answer ${info.secret.answerDisplay}; solution: ${info.secret.solution.join(' ')}`,
          `Hints the platform already offers, in order: ${info.secret.hints.join(' | ')}`,
        );
      }
    } catch {
      // Question no longer available; continue without it.
    }
  }
  return lines.filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n');
}

// ---------- streaming ----------

function sse(res: ServerResponse, event: TutorStreamEvent) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

async function* anthropicStream(system: string, messages: { role: 'user' | 'assistant'; content: string }[], signal: AbortSignal): AsyncGenerator<string> {
  const resp = await fetch(`${config.anthropicBaseUrl}/v1/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': config.anthropicKey as string, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: config.tutorModel, max_tokens: 1024, system, messages, stream: true }),
    signal,
  });
  if (!resp.ok || !resp.body) {
    const text = await resp.text().catch(() => '');
    throw new HttpError(502, 'tutor_upstream', `The tutor service returned ${resp.status}.`, text.slice(0, 300));
  }
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of resp.body as unknown as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(chunk, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const dataLine = block.split('\n').find((l) => l.startsWith('data:'));
      if (!dataLine) continue;
      let evt: { type: string; delta?: { type: string; text?: string }; error?: { message?: string } };
      try {
        evt = JSON.parse(dataLine.slice(5).trim());
      } catch {
        continue;
      }
      if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta' && evt.delta.text) yield evt.delta.text;
      if (evt.type === 'error') throw new HttpError(502, 'tutor_upstream', evt.error?.message ?? 'The tutor service failed.');
    }
  }
}

/** Streams a reply. If `regenerate`, replaces the last assistant message instead of adding a user one. */
export async function streamReply(db: Db, user: UserDto, conversationId: string, content: string | null, res: ServerResponse, onClose: (fn: () => void) => void): Promise<void> {
  assertUnlocked(db, user);
  const conv = loadConversation(db, user, conversationId);
  if (!config.anthropicKey) throw new HttpError(503, 'tutor_unconfigured', 'The tutor isn\'t connected yet. Add ANTHROPIC_API_KEY to .env and restart the server.');
  if (usedToday(db, user.id) >= config.tutorDailyLimit) throw new HttpError(429, 'tutor_daily_limit', 'You\'ve reached today\'s tutor limit. It resets in 24 hours. Practice and lessons are still available.');
  if (!perMinute.take(user.id)) throw new HttpError(429, 'tutor_rate', 'Slow down a little. Try again in a minute.');
  const since = new Date(now().getTime() - 86_400_000).toISOString();
  const siteToday = (one<{ n: number }>(db, `SELECT COUNT(*) AS n FROM tutor_messages WHERE role = 'user' AND created_at >= ?`, since)?.n ?? 0) as number;
  if (siteToday >= config.tutorGlobalDailyLimit) throw new HttpError(429, 'tutor_site_limit', 'The tutor is very busy today and has reached its daily limit. Lessons, hints and worked solutions still work. Try the tutor again tomorrow.');

  const t = now().toISOString();
  if (content !== null) {
    run(db, 'INSERT INTO tutor_messages (id, conversation_id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)', newId('msg'), conv.id, user.id, 'user', content, t);
    const count = (one<{ n: number }>(db, `SELECT COUNT(*) AS n FROM tutor_messages WHERE conversation_id = ? AND role = 'user'`, conv.id)?.n ?? 0) as number;
    if (count === 1 && conv.title === 'New conversation') run(db, 'UPDATE tutor_conversations SET title = ? WHERE id = ?', content.length > 48 ? `${content.slice(0, 46).trim()}…` : content, conv.id);
  } else {
    const last = one<{ id: string; role: string }>(db, 'SELECT id, role FROM tutor_messages WHERE conversation_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1', conv.id);
    if (!last || last.role !== 'assistant') throw new HttpError(409, 'nothing_to_regenerate', 'There is no reply to regenerate.');
    run(db, 'DELETE FROM tutor_messages WHERE id = ?', last.id);
  }

  const history = all<{ role: 'user' | 'assistant'; content: string }>(db, 'SELECT role, content FROM tutor_messages WHERE conversation_id = ? ORDER BY created_at, rowid', conv.id).slice(-20);
  while (history.length && history[0]!.role !== 'user') history.shift();
  const ctx = conv.context ? (JSON.parse(conv.context) as Context) : null;
  const system = systemPrompt(db, user, ctx);

  res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' });
  const controller = new AbortController();
  onClose(() => controller.abort());
  let text = '';
  try {
    for await (const delta of anthropicStream(system, history, controller.signal)) {
      text += delta;
      sse(res, { type: 'delta', text: delta });
    }
  } catch (e) {
    if (!controller.signal.aborted) {
      const err = e instanceof HttpError ? e : new HttpError(502, 'tutor_upstream', 'The tutor could not be reached.');
      if (err.details) console.error('[tutor]', err.message, err.details);
      sse(res, { type: 'error', code: err.code, message: text ? 'The reply was cut off. You can regenerate it.' : err.message });
    }
  }
  if (text) {
    const id = newId('msg');
    run(db, 'INSERT INTO tutor_messages (id, conversation_id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)', id, conv.id, user.id, 'assistant', text, now().toISOString());
    run(db, 'UPDATE tutor_conversations SET updated_at = ? WHERE id = ?', now().toISOString(), conv.id);
    if (!controller.signal.aborted) sse(res, { type: 'done', messageId: id });
  }
  res.end();
}
