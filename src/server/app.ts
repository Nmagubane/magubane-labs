import { createServer, type Server } from 'node:http';
import type { Db } from './db.ts';
import { one } from './db.ts';
import { Router, HttpError, readJson, sendJson, parseCookies, setCookie, securityHeaders, serveStatic, RateLimiter, type Ctx } from './http.ts';
import { config } from './config.ts';
import { createSession, destroySession, userForSession, createUser, verifyPassword, burnPasswordCheck } from './auth.ts';
import { getProfile, saveProfile } from './learner.ts';
import { createActivity, getActivityState, nextQuestion, answerQuestion, takeHint, submitActivity, getResults, listActivities } from './activities.ts';
import { catalogue, skillDetail, workedExample, home, progress, listExams, createExam, deleteExam, examDetail } from './insights.ts';
import { tutorStatus, listConversations, createConversation, getConversation, deleteConversation, streamReply } from './tutor.ts';
import { SignupBody, LoginBody, ProfileBody, CreateActivityBody, NextQuestionBody, AnswerBody, ExamBody, TutorConversationBody, TutorMessageBody, type MeResponse, type UserDto } from '../shared/api.ts';
import { CURRICULA } from '../shared/curriculum/catalogue.ts';

const COOKIE = 'ml_session';
const loginLimiter = new RateLimiter(10, 15 * 60_000);
const signupLimiter = new RateLimiter(5, 60 * 60_000);

function requireUser(ctx: Ctx): UserDto {
  if (!ctx.user) throw new HttpError(401, 'unauthenticated', 'Please log in.');
  return ctx.user;
}

export function buildRouter(db: Db): Router {
  const r = new Router();

  // ---- auth ----
  r.post('/api/auth/signup', async (ctx) => {
    if (!signupLimiter.take(ctx.ip)) throw new HttpError(429, 'rate_limited', 'Too many sign-ups from this network. Try again later.');
    const body = await readJson(ctx, SignupBody);
    if (one(db, 'SELECT 1 FROM users WHERE email = ?', body.email)) throw new HttpError(409, 'email_taken', 'An account with that email already exists. Log in instead.');
    const user = createUser(db, body);
    setCookie(ctx.res, COOKIE, createSession(db, user.id, config.sessionDays), { maxAge: config.sessionDays * 86400, secure: !config.dev });
    return { user, profile: null } satisfies MeResponse;
  });

  r.post('/api/auth/login', async (ctx) => {
    const body = await readJson(ctx, LoginBody);
    if (!loginLimiter.take(`${ctx.ip}:${body.email}`)) throw new HttpError(429, 'rate_limited', 'Too many attempts. Wait 15 minutes and try again.');
    const row = one<{ id: string; password_hash: string; display_name: string; email: string; role: UserDto['role'] }>(db, 'SELECT id, password_hash, display_name, email, role FROM users WHERE email = ?', body.email);
    if (!row) {
      burnPasswordCheck(body.password);
      throw new HttpError(401, 'bad_credentials', 'That email and password don\'t match.');
    }
    if (!verifyPassword(body.password, row.password_hash)) throw new HttpError(401, 'bad_credentials', 'That email and password don\'t match.');
    setCookie(ctx.res, COOKIE, createSession(db, row.id, config.sessionDays), { maxAge: config.sessionDays * 86400, secure: !config.dev });
    const user: UserDto = { id: row.id, email: row.email, displayName: row.display_name, role: row.role };
    return { user, profile: getProfile(db, row.id) } satisfies MeResponse;
  });

  r.post('/api/auth/logout', (ctx) => {
    const token = parseCookies(ctx.req.headers.cookie)[COOKIE];
    if (token) destroySession(db, token);
    setCookie(ctx.res, COOKIE, '', { maxAge: 0, secure: !config.dev });
    return { ok: true };
  });

  r.get('/api/me', (ctx) => ({ user: ctx.user, profile: ctx.user ? getProfile(db, ctx.user.id) : null }) satisfies MeResponse);

  // ---- profile ----
  r.get('/api/curricula', () => CURRICULA);
  r.put('/api/profile', async (ctx) => {
    const user = requireUser(ctx);
    const body = await readJson(ctx, ProfileBody);
    saveProfile(db, user.id, body);
    return getProfile(db, user.id);
  });

  // ---- learning content ----
  r.get('/api/catalogue', (ctx) => catalogue(db, requireUser(ctx)));
  r.get('/api/skills/:id', (ctx) => skillDetail(db, requireUser(ctx), ctx.params.id as string));
  r.get('/api/skills/:id/example', (ctx) => {
    requireUser(ctx);
    return workedExample(ctx.params.id as string, Number(ctx.query.get('level') ?? 3));
  });

  // ---- activities ----
  r.post('/api/activities', async (ctx) => createActivity(db, requireUser(ctx), await readJson(ctx, CreateActivityBody)));
  r.get('/api/activities', (ctx) => {
    const kinds = (ctx.query.get('kind') ?? 'test,baseline').split(',').filter((k): k is 'test' | 'baseline' | 'practice' | 'lesson' => ['test', 'baseline', 'practice', 'lesson'].includes(k));
    return listActivities(db, requireUser(ctx), kinds.length ? kinds : ['test']);
  });
  r.get('/api/activities/:id', (ctx) => getActivityState(db, requireUser(ctx), ctx.params.id as string));
  r.post('/api/activities/:id/next', async (ctx) => nextQuestion(db, requireUser(ctx), ctx.params.id as string, await readJson(ctx, NextQuestionBody)));
  r.post('/api/activities/:id/submit', (ctx) => submitActivity(db, requireUser(ctx), ctx.params.id as string));
  r.get('/api/activities/:id/results', (ctx) => getResults(db, requireUser(ctx), ctx.params.id as string));
  r.post('/api/questions/:id/answer', async (ctx) => answerQuestion(db, requireUser(ctx), ctx.params.id as string, await readJson(ctx, AnswerBody)));
  r.post('/api/questions/:id/hint', (ctx) => takeHint(db, requireUser(ctx), ctx.params.id as string));

  // ---- insights ----
  r.get('/api/home', (ctx) => home(db, requireUser(ctx)));
  r.get('/api/progress', (ctx) => progress(db, requireUser(ctx)));
  r.get('/api/exams', (ctx) => listExams(db, requireUser(ctx)));
  r.post('/api/exams', async (ctx) => createExam(db, requireUser(ctx), await readJson(ctx, ExamBody)));
  r.get('/api/exams/:id', (ctx) => examDetail(db, requireUser(ctx), ctx.params.id as string));
  r.delete('/api/exams/:id', (ctx) => {
    deleteExam(db, requireUser(ctx), ctx.params.id as string);
    return { ok: true };
  });

  // ---- tutor ----
  r.get('/api/tutor/status', (ctx) => tutorStatus(db, requireUser(ctx)));
  r.get('/api/tutor/conversations', (ctx) => listConversations(db, requireUser(ctx)));
  r.post('/api/tutor/conversations', async (ctx) => createConversation(db, requireUser(ctx), await readJson(ctx, TutorConversationBody)));
  r.get('/api/tutor/conversations/:id', (ctx) => getConversation(db, requireUser(ctx), ctx.params.id as string));
  r.delete('/api/tutor/conversations/:id', (ctx) => {
    deleteConversation(db, requireUser(ctx), ctx.params.id as string);
    return { ok: true };
  });
  r.post('/api/tutor/conversations/:id/messages', async (ctx) => {
    const user = requireUser(ctx);
    const body = await readJson(ctx, TutorMessageBody);
    await streamReply(db, user, ctx.params.id as string, body.content, ctx.res, (fn) => ctx.res.on('close', fn));
    return STREAMED;
  });
  r.post('/api/tutor/conversations/:id/regenerate', async (ctx) => {
    const user = requireUser(ctx);
    await streamReply(db, user, ctx.params.id as string, null, ctx.res, (fn) => ctx.res.on('close', fn));
    return STREAMED;
  });

  r.get('/api/health', () => ({ ok: true }));
  return r;
}

const STREAMED = Symbol('streamed');

export function createApp(db: Db): Server {
  const router = buildRouter(db);
  return createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    securityHeaders(res, config.dev);
    const isApi = url.pathname.startsWith('/api/');
    if (!isApi) {
      if ((req.method === 'GET' || req.method === 'HEAD') && serveStatic(req, res, config.clientDir, url.pathname)) return;
      res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
      return;
    }
    const ctx: Ctx = {
      req,
      res,
      params: {},
      query: url.searchParams,
      user: userForSession(db, parseCookies(req.headers.cookie)[COOKIE]),
      ip: req.socket.remoteAddress ?? 'unknown',
    };
    try {
      // CSRF: state-changing requests must carry our header (cross-site forms can't set it; SameSite=Lax covers the rest).
      if (req.method !== 'GET' && req.method !== 'HEAD' && req.headers['x-requested-with'] !== 'magubane') {
        throw new HttpError(403, 'csrf', 'Missing request header.');
      }
      const match = router.match(req.method ?? 'GET', url.pathname);
      if (match === null) throw new HttpError(404, 'not_found', 'No such endpoint.');
      if (match === 'method') throw new HttpError(405, 'method_not_allowed', 'Method not allowed.');
      ctx.params = match.params;
      const out = await match.handler(ctx);
      if (out === STREAMED) return;
      sendJson(res, 200, out ?? { ok: true });
    } catch (e) {
      if (res.headersSent) {
        res.end();
        return;
      }
      if (e instanceof HttpError) {
        sendJson(res, e.status, { error: { code: e.code, message: e.message, ...(e.details !== undefined && e.status < 500 ? { details: e.details } : {}) } });
      } else {
        console.error('[server]', e);
        sendJson(res, 500, { error: { code: 'internal', message: 'Something went wrong on our side. Try again.' } });
      }
    }
  });
}
