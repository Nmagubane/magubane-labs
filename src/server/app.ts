import { listIcan } from './ican.ts';
import { createServer, type Server, type ServerResponse } from 'node:http';
import type { Db } from './db.ts';
import { one } from './db.ts';
import { Router, HttpError, readJson, sendJson, parseCookies, setCookie, securityHeaders, serveStatic, RateLimiter, type Ctx } from './http.ts';
import { config } from './config.ts';
import { createSession, destroySession, destroyAllSessions, userForSession, createUser, deleteUser, verifyPassword, burnPasswordCheck, markEmailVerified, setPassword, getUser, toUserDto, USER_COLS, type UserRow } from './auth.ts';
import { getProfile, saveProfile } from './learner.ts';
import { createActivity, getActivityState, nextQuestion, answerQuestion, takeHint, submitActivity, getResults, listActivities } from './activities.ts';
import { catalogue, skillDetail, workedExample, home, progress, listExams, createExam, deleteExam, examDetail } from './insights.ts';
import { tutorStatus, listConversations, createConversation, getConversation, deleteConversation, streamReply } from './tutor.ts';
import { sendVerificationEmail, sendResetEmail, checkCode } from './verification.ts';
import { sendMail, layout } from './mailer.ts';
import { logged } from './verification.ts';
import { requireTeacher, listClasses, createClass, updateClass, newClassCode, classDetail, removeMember, createAssignment, deleteAssignment, teacherLearner, findClassByCode, myClasses, joinClass, leaveClass, myAssignments, startAssignment } from './classes.ts';
import { learnerReportPdf, classReportPdf, sendLearnerReport, sendClassReport, unsubscribe } from './reports.ts';
import { canAccessLearner } from './auth.ts';
import { SignupBody, DeleteAccountBody, VerifyBody, ForgotBody, ResetBody, ChangePasswordBody, JoinClassBody, PRIVACY_VERSION, type PublicConfig, LoginBody, ProfileBody, CreateActivityBody, NextQuestionBody, AnswerBody, ExamBody, TutorConversationBody, TutorMessageBody, type MeResponse, type UserDto } from '../shared/api.ts';
import { CreateClassBody, UpdateClassBody, CreateAssignmentBody, SendReportBody } from '../shared/api-teach.ts';
import { passwordProblem } from '../shared/password.ts';
import { CURRICULA, subjectsForGrade } from '../shared/curriculum/catalogue.ts';
import { CreateChildBody, UpdateChildBody, PictureCodeBody, DeviceBody, JuniorLoginBody, CardLogBody, DeleteChildBody, MoveUpBody } from '../shared/api-junior.ts';
import { moveUpChild } from './moveup.ts';
import { DEVICE_COOKIE, DEVICE_DAYS, createChild, updateChild, resetPictureCode, canDeleteChild, listFamily, createDevice, listDevices, revokeDevice, revokeDeviceToken, deviceInfo, juniorLogin, juniorHome, juniorWorld, childOverview, logCard, classLoginCards, isJuniorLearner, childSummary } from './junior.ts';
import { questionLanguage } from './activities.ts';

const COOKIE = 'ml_session';
const loginLimiter = new RateLimiter(10, 15 * 60_000);
// Generous per network: a whole class behind one school IP may sign up in the same lesson.
const signupLimiter = new RateLimiter(config.signupRatePerHour, 60 * 60_000);
const codeLimiter = new RateLimiter(20, 15 * 60_000);
const forgotLimiter = new RateLimiter(5, 15 * 60_000);
const reportLimiter = new RateLimiter(30, 60 * 60_000);
// Picture sign-in: per network and per device, on top of the per-child lockout in junior.ts.
const pictureIpLimiter = new RateLimiter(120, 15 * 60_000);
const pictureDeviceLimiter = new RateLimiter(40, 15 * 60_000);

/** While an email is unconfirmed, only these endpoints work. */
const UNVERIFIED_OK = new Set(['/api/me', '/api/config', '/api/auth/verify', '/api/auth/resend', '/api/auth/logout', '/api/account/delete', '/api/health']);

function requireUser(ctx: Ctx): UserDto {
  if (!ctx.user) throw new HttpError(401, 'unauthenticated', 'Please log in.');
  return ctx.user;
}
function requireLearner(ctx: Ctx): UserDto {
  const u = requireUser(ctx);
  if (u.role === 'teacher' || u.role === 'parent') throw new HttpError(403, 'not_learner', 'This is for learner accounts.');
  return u;
}
function requireParent(ctx: Ctx): UserDto {
  const u = requireUser(ctx);
  if (u.role !== 'parent') throw new HttpError(403, 'not_parent', 'This is for parent accounts.');
  return u;
}
/** Parents and teachers: the adults who look after Grade 1–3 children. */
function requireAdult(ctx: Ctx): UserDto {
  const u = requireUser(ctx);
  if (u.role !== 'parent' && u.role !== 'teacher') throw new HttpError(403, 'not_adult', 'This is for parent and teacher accounts.');
  return u;
}
/** The AI tutor is not for Grades 1–3: open-ended chat with young children is a safety risk, and they cannot type yet. */
function requireTutorLearner(ctx: Ctx, db: Db): UserDto {
  const u = requireLearner(ctx);
  if (isJuniorLearner(db, u.id)) throw new HttpError(403, 'not_for_junior', 'The tutor is for Grade 4 and up.');
  return u;
}

function startSession(ctx: Ctx, db: Db, userId: string): void {
  setCookie(ctx.res, COOKIE, createSession(db, userId, config.sessionDays), { maxAge: config.sessionDays * 86400, secure: !config.dev });
}

/** Emails a guardian once their child's account is confirmed. */
async function noticeToGuardian(db: Db, userId: string): Promise<void> {
  const g = one<{ display_name: string; is_minor: number; guardian_email: string | null; guardian_name: string | null; moved_up_at: string | null }>(db, 'SELECT display_name, is_minor, guardian_email, guardian_name, moved_up_at FROM users WHERE id = ?', userId);
  if (!g?.is_minor || !g.guardian_email || g.moved_up_at) return;
  const { html, text } = layout({
    heading: `${g.display_name} created a Magubane Labs account`,
    paragraphs: [
      `Hello${g.guardian_name ? ` ${g.guardian_name}` : ''}. ${g.display_name} has created an account on Magubane Labs, a maths and science learning app, and gave your email address as their parent or guardian. Consent was given when the account was created.`,
      'You will receive a short progress report by email each week.',
      `If you did not agree to this, reply to this email${config.contactEmail ? ` or write to ${config.contactEmail}` : ''} and we will delete the account and all its data.`,
    ],
    button: { label: 'Read the privacy notice', url: `${config.publicUrl}/privacy` },
  });
  logged(db, userId, g.guardian_email, 'guardian-welcome', await sendMail({ to: { email: g.guardian_email, ...(g.guardian_name ? { name: g.guardian_name } : {}) }, subject: `${g.display_name} joined Magubane Labs`, html, text }));
}

function sendPdf(res: ServerResponse, file: { pdf: Buffer; name: string }, download: boolean): void {
  res.writeHead(200, { 'content-type': 'application/pdf', 'content-length': file.pdf.length, 'cache-control': 'no-store', 'content-disposition': `${download ? 'attachment' : 'inline'}; filename="${file.name}"` });
  res.end(file.pdf);
}

export function buildRouter(db: Db): Router {
  const r = new Router();
  const me = (u: UserDto | null): MeResponse => ({ user: u, profile: u && u.role === 'student' ? getProfile(db, u.id) : null });

  // ---- auth ----
  r.post('/api/auth/signup', async (ctx) => {
    if (!signupLimiter.take(ctx.ip)) throw new HttpError(429, 'rate_limited', 'Too many sign-ups from this network. Try again later.');
    if (config.signupMode === 'closed') throw new HttpError(403, 'signup_closed', 'Sign-ups are closed at the moment.');
    const body = await readJson(ctx, SignupBody);
    let inviteCode: string | null = null;
    let joinCode: string | null = null;
    if (body.accountType === 'parent') {
      if (config.signupMode === 'invite') {
        inviteCode = (body.accessCode ?? '').toUpperCase();
        if (!inviteCode || !config.inviteCodes.includes(inviteCode)) throw new HttpError(403, 'bad_access_code', "That access code isn't valid. Check it with the person who invited you.", { fieldErrors: { accessCode: ["That access code isn't valid"] } });
      }
    } else if (body.accountType === 'teacher') {
      if (!config.educatorCodes.length) throw new HttpError(403, 'educator_closed', `Teacher accounts aren't open yet.${config.contactEmail ? ` Write to ${config.contactEmail} to join the pilot.` : ''}`);
      inviteCode = (body.accessCode ?? '').toUpperCase();
      if (!config.educatorCodes.includes(inviteCode)) throw new HttpError(403, 'bad_access_code', "That educator code isn't valid.", { fieldErrors: { accessCode: ["That educator code isn't valid"] } });
    } else {
      const cls = body.classCode ? findClassByCode(db, body.classCode) : null;
      if (body.classCode && !cls) throw new HttpError(404, 'unknown_class', 'No class has that code. Check it with your teacher.', { fieldErrors: { classCode: ['No class has that code'] } });
      if (cls) joinCode = cls.join_code;
      else if (config.signupMode === 'invite') {
        inviteCode = (body.accessCode ?? '').toUpperCase();
        if (!inviteCode || !config.inviteCodes.includes(inviteCode)) throw new HttpError(403, 'bad_access_code', "That access code isn't valid. Check it with the person who invited you.", { fieldErrors: { accessCode: ["That access code isn't valid"] } });
      }
    }
    if (one(db, 'SELECT 1 FROM users WHERE email = ?', body.email)) throw new HttpError(409, 'email_taken', 'An account with that email already exists. Log in instead.');
    const user = createUser(db, {
      email: body.email,
      password: body.password,
      displayName: body.displayName,
      inviteCode,
      role: body.accountType === 'teacher' ? 'teacher' : body.accountType === 'parent' ? 'parent' : 'student',
      school: body.accountType === 'teacher' ? (body.school ?? null) : null,
      isMinor: body.ageGroup === 'minor',
      guardianName: body.ageGroup === 'minor' ? (body.guardianName ?? null) : null,
      guardianEmail: body.ageGroup === 'minor' ? (body.guardianEmail ?? null) : null,
      consentVersion: PRIVACY_VERSION,
    });
    startSession(ctx, db, user.id);
    if (joinCode) await joinClass(db, user, joinCode).catch((e) => console.error('[signup] join class failed', e));
    await sendVerificationEmail(db, user).catch((e) => console.error('[signup] verification email failed', e));
    return me(user);
  });

  r.post('/api/auth/verify', async (ctx) => {
    const user = requireUser(ctx);
    if (user.emailVerified) return me(user);
    if (!codeLimiter.take(`${ctx.ip}:${user.id}`)) throw new HttpError(429, 'rate_limited', 'Too many tries. Wait a few minutes.');
    const body = await readJson(ctx, VerifyBody);
    checkCode(db, user.id, 'verify', body.code);
    markEmailVerified(db, user.id);
    await noticeToGuardian(db, user.id).catch((e) => console.error('[verify] guardian notice failed', e));
    return me(getUser(db, user.id));
  });

  r.post('/api/auth/resend', async (ctx) => {
    const user = requireUser(ctx);
    if (user.emailVerified) throw new HttpError(400, 'already_verified', 'Your email is already confirmed.');
    const res = await sendVerificationEmail(db, user);
    return { ok: true, delivery: res.status };
  });

  r.post('/api/auth/login', async (ctx) => {
    const body = await readJson(ctx, LoginBody);
    if (!loginLimiter.take(`${ctx.ip}:${body.email}`)) throw new HttpError(429, 'rate_limited', 'Too many attempts. Wait 15 minutes and try again.');
    const row = one<UserRow & { password_hash: string }>(db, `SELECT ${USER_COLS}, password_hash FROM users WHERE email = ?`, body.email);
    if (!row) {
      burnPasswordCheck(body.password);
      throw new HttpError(401, 'bad_credentials', "That email and password don't match.");
    }
    if (!verifyPassword(body.password, row.password_hash)) throw new HttpError(401, 'bad_credentials', "That email and password don't match.");
    startSession(ctx, db, row.id);
    const user = toUserDto(row);
    if (!user.emailVerified) {
      // Send a fresh code unless one went out in the last minute.
      await sendVerificationEmail(db, user).catch(() => undefined);
    }
    return me(user);
  });

  r.post('/api/auth/logout', (ctx) => {
    const token = parseCookies(ctx.req.headers.cookie)[COOKIE];
    if (token) destroySession(db, token);
    setCookie(ctx.res, COOKIE, '', { maxAge: 0, secure: !config.dev });
    return { ok: true };
  });

  r.post('/api/auth/forgot', async (ctx) => {
    if (!forgotLimiter.take(ctx.ip)) throw new HttpError(429, 'rate_limited', 'Too many requests. Wait 15 minutes and try again.');
    const body = await readJson(ctx, ForgotBody);
    const row = one<UserRow>(db, `SELECT ${USER_COLS} FROM users WHERE email = ?`, body.email);
    // Same answer whether or not the account exists, so this can't be used to find out who has an account.
    if (row) await sendResetEmail(db, toUserDto(row)).catch((e) => (e instanceof HttpError ? undefined : console.error('[forgot]', e)));
    return { ok: true };
  });

  r.post('/api/auth/reset', async (ctx) => {
    if (!codeLimiter.take(ctx.ip)) throw new HttpError(429, 'rate_limited', 'Too many tries. Wait a few minutes.');
    const body = await readJson(ctx, ResetBody);
    const row = one<UserRow>(db, `SELECT ${USER_COLS} FROM users WHERE email = ?`, body.email);
    if (!row) throw new HttpError(400, 'code_expired', 'That code has expired. Ask for a new one.');
    const problem = passwordProblem(body.password, { email: row.email, name: row.display_name });
    if (problem) throw new HttpError(422, 'invalid', problem, { fieldErrors: { password: [problem] } });
    checkCode(db, row.id, 'reset', body.code);
    setPassword(db, row.id, body.password);
    markEmailVerified(db, row.id);
    destroyAllSessions(db, row.id);
    startSession(ctx, db, row.id);
    return me(getUser(db, row.id));
  });

  r.get('/api/config', () => ({ signupMode: config.signupMode, contactEmail: config.contactEmail, tutorEnabled: config.anthropicKey !== null, privacyVersion: PRIVACY_VERSION, emailDelivery: config.email.provider === 'log' ? 'log' : 'live', educatorSignup: config.educatorCodes.length > 0 }) satisfies PublicConfig);

  r.post('/api/account/password', async (ctx) => {
    const user = requireUser(ctx);
    const body = await readJson(ctx, ChangePasswordBody);
    const row = one<{ password_hash: string }>(db, 'SELECT password_hash FROM users WHERE id = ?', user.id);
    if (!row || !verifyPassword(body.current, row.password_hash)) throw new HttpError(401, 'bad_credentials', "Your current password isn't right.", { fieldErrors: { current: ["That isn't your current password"] } });
    const problem = passwordProblem(body.next, { email: user.email, name: user.displayName });
    if (problem) throw new HttpError(422, 'invalid', problem, { fieldErrors: { next: [problem] } });
    setPassword(db, user.id, body.next);
    destroyAllSessions(db, user.id);
    startSession(ctx, db, user.id);
    return { ok: true };
  });

  r.post('/api/account/delete', async (ctx) => {
    const user = requireUser(ctx);
    const body = await readJson(ctx, DeleteAccountBody);
    const row = one<{ password_hash: string }>(db, 'SELECT password_hash FROM users WHERE id = ?', user.id);
    if (!row || !verifyPassword(body.password, row.password_hash)) throw new HttpError(401, 'bad_credentials', "That password isn't right.");
    deleteUser(db, user.id);
    setCookie(ctx.res, COOKIE, '', { maxAge: 0, secure: !config.dev });
    return { ok: true };
  });

  r.get('/api/me', (ctx) => me(ctx.user));

  // ---- profile ----
  r.get('/api/curricula', () => CURRICULA);
  r.put('/api/profile', async (ctx) => {
    const user = requireLearner(ctx);
    const body = await readJson(ctx, ProfileBody);
    // Subjects must make sense for the grade (no Natural Sciences & Technology in Grade 10, say).
    const subjects = body.subjects.filter((s) => subjectsForGrade(body.grade).includes(s));
    if (!subjects.length) throw new HttpError(400, 'invalid', 'Choose at least one subject for that grade.');
    saveProfile(db, user.id, { ...body, subjects });
    return getProfile(db, user.id);
  });

  // ---- learning content ----
  r.get('/api/catalogue', (ctx) => catalogue(db, requireUser(ctx)));
  r.get('/api/skills/:id', (ctx) => skillDetail(db, requireUser(ctx), ctx.params.id as string));
  r.get('/api/skills/:id/example', (ctx) => {
    const u = requireUser(ctx);
    return workedExample(ctx.params.id as string, Number(ctx.query.get('level') ?? 3), u.role === 'student' ? questionLanguage(db, u.id) : 'en');
  });

  // ---- activities ----
  r.post('/api/activities', async (ctx) => createActivity(db, requireLearner(ctx), await readJson(ctx, CreateActivityBody)));
  r.get('/api/activities', (ctx) => {
    const kinds = (ctx.query.get('kind') ?? 'test,baseline').split(',').filter((k): k is 'test' | 'baseline' | 'practice' | 'lesson' => ['test', 'baseline', 'practice', 'lesson'].includes(k));
    return listActivities(db, requireLearner(ctx), kinds.length ? kinds : ['test']);
  });
  r.get('/api/activities/:id', (ctx) => getActivityState(db, requireLearner(ctx), ctx.params.id as string));
  r.post('/api/activities/:id/next', async (ctx) => nextQuestion(db, requireLearner(ctx), ctx.params.id as string, await readJson(ctx, NextQuestionBody)));
  r.post('/api/activities/:id/submit', (ctx) => submitActivity(db, requireLearner(ctx), ctx.params.id as string));
  r.get('/api/activities/:id/results', (ctx) => getResults(db, requireLearner(ctx), ctx.params.id as string));
  r.post('/api/questions/:id/answer', async (ctx) => answerQuestion(db, requireLearner(ctx), ctx.params.id as string, await readJson(ctx, AnswerBody)));
  r.post('/api/questions/:id/hint', (ctx) => takeHint(db, requireLearner(ctx), ctx.params.id as string));

  // ---- insights ----
  r.get('/api/home', (ctx) => {
    const user = requireLearner(ctx);
    return { ...home(db, user), assignments: myAssignments(db, user) };
  });
  r.get('/api/progress', (ctx) => progress(db, requireLearner(ctx)));
  r.get('/api/exams', (ctx) => listExams(db, requireLearner(ctx)));
  r.post('/api/exams', async (ctx) => createExam(db, requireLearner(ctx), await readJson(ctx, ExamBody)));
  r.get('/api/exams/:id', (ctx) => examDetail(db, requireLearner(ctx), ctx.params.id as string));
  r.delete('/api/exams/:id', (ctx) => {
    deleteExam(db, requireLearner(ctx), ctx.params.id as string);
    return { ok: true };
  });

  // ---- classes (learner side) ----
  r.get('/api/classes', (ctx) => myClasses(db, requireLearner(ctx)));
  r.post('/api/classes/join', async (ctx) => joinClass(db, requireLearner(ctx), (await readJson(ctx, JoinClassBody)).code));
  r.delete('/api/classes/:id', (ctx) => {
    leaveClass(db, requireLearner(ctx), ctx.params.id as string);
    return { ok: true };
  });
  r.get('/api/assignments', (ctx) => myAssignments(db, requireLearner(ctx)));
  r.post('/api/assignments/:id/start', (ctx) => startAssignment(db, requireLearner(ctx), ctx.params.id as string));

  // ---- educator mode ----
  r.get('/api/teach/classes', (ctx) => listClasses(db, requireTeacher(ctx.user)));
  r.post('/api/teach/classes', async (ctx) => createClass(db, requireTeacher(ctx.user), await readJson(ctx, CreateClassBody)));
  r.get('/api/teach/classes/:id', (ctx) => classDetail(db, requireTeacher(ctx.user), ctx.params.id as string));
  r.patch('/api/teach/classes/:id', async (ctx) => updateClass(db, requireTeacher(ctx.user), ctx.params.id as string, await readJson(ctx, UpdateClassBody)));
  r.post('/api/teach/classes/:id/code', (ctx) => newClassCode(db, requireTeacher(ctx.user), ctx.params.id as string));
  r.delete('/api/teach/classes/:id/members/:learnerId', (ctx) => {
    removeMember(db, requireTeacher(ctx.user), ctx.params.id as string, ctx.params.learnerId as string);
    return { ok: true };
  });
  r.post('/api/teach/classes/:id/assignments', async (ctx) => createAssignment(db, requireTeacher(ctx.user), ctx.params.id as string, await readJson(ctx, CreateAssignmentBody)));
  r.delete('/api/teach/assignments/:id', (ctx) => {
    deleteAssignment(db, requireTeacher(ctx.user), ctx.params.id as string);
    return { ok: true };
  });
  r.get('/api/teach/learners/:id', (ctx) => teacherLearner(db, requireTeacher(ctx.user), ctx.params.id as string));
  r.post('/api/teach/learners/:id/report', async (ctx) => {
    const teacher = requireTeacher(ctx.user);
    if (!reportLimiter.take(teacher.id)) throw new HttpError(429, 'rate_limited', 'Too many reports sent this hour. Try again later.');
    const learnerId = ctx.params.id as string;
    if (!canAccessLearner(db, teacher, learnerId)) throw new HttpError(404, 'not_found', 'That learner is not in any of your classes.');
    const body = await readJson(ctx, SendReportBody);
    return sendLearnerReport(db, learnerId, { teacher, note: body.note, kind: 'learner-report' });
  });
  r.post('/api/teach/classes/:id/report', async (ctx) => {
    const teacher = requireTeacher(ctx.user);
    if (!reportLimiter.take(teacher.id)) throw new HttpError(429, 'rate_limited', 'Too many reports sent this hour. Try again later.');
    return sendClassReport(db, teacher, ctx.params.id as string);
  });

  // ---- reports (PDF) ----
  r.get('/api/reports/learner/:id', (ctx) => {
    const viewer = requireUser(ctx);
    const id = ctx.params.id as string;
    if (!canAccessLearner(db, viewer, id)) throw new HttpError(404, 'not_found', 'Report not found.');
    sendPdf(ctx.res, learnerReportPdf(db, id, { days: Number(ctx.query.get('days') ?? 7) === 30 ? 30 : 7 }), ctx.query.get('download') === '1');
    return STREAMED;
  });
  r.get('/api/reports/class/:id', (ctx) => {
    sendPdf(ctx.res, classReportPdf(db, requireTeacher(ctx.user), ctx.params.id as string), ctx.query.get('download') === '1');
    return STREAMED;
  });
  r.get('/api/reports/unsubscribe', (ctx) => {
    const ok = unsubscribe(db, ctx.query.get('l') ?? '', ctx.query.get('t') ?? '');
    const msg = ok ? 'Done. You will no longer receive weekly progress reports for this learner.' : 'This link is not valid. Reply to any report email and we will stop them for you.';
    ctx.res.writeHead(ok ? 200 : 400, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    ctx.res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Magubane Labs</title><body style="font-family:system-ui,sans-serif;max-width:520px;margin:15vh auto;padding:0 20px;color:#1a1d21"><p style="font-weight:700">Magubane Labs</p><h1 style="font-size:22px">${ok ? 'Reports stopped' : 'Link not valid'}</h1><p>${msg}</p></body>`);
    return STREAMED;
  });

  // ---- tutor ----
  r.get('/api/tutor/status', (ctx) => tutorStatus(db, requireTutorLearner(ctx, db)));
  r.get('/api/tutor/conversations', (ctx) => listConversations(db, requireTutorLearner(ctx, db)));
  r.post('/api/tutor/conversations', async (ctx) => createConversation(db, requireTutorLearner(ctx, db), await readJson(ctx, TutorConversationBody)));
  r.get('/api/tutor/conversations/:id', (ctx) => getConversation(db, requireTutorLearner(ctx, db), ctx.params.id as string));
  r.delete('/api/tutor/conversations/:id', (ctx) => {
    deleteConversation(db, requireTutorLearner(ctx, db), ctx.params.id as string);
    return { ok: true };
  });
  r.post('/api/tutor/conversations/:id/messages', async (ctx) => {
    const user = requireTutorLearner(ctx, db);
    const body = await readJson(ctx, TutorMessageBody);
    await streamReply(db, user, ctx.params.id as string, body.content, ctx.res, (fn) => ctx.res.on('close', fn));
    return STREAMED;
  });
  r.post('/api/tutor/conversations/:id/regenerate', async (ctx) => {
    const user = requireTutorLearner(ctx, db);
    await streamReply(db, user, ctx.params.id as string, null, ctx.res, (fn) => ctx.res.on('close', fn));
    return STREAMED;
  });

  // ---- Junior (Grades 1–3) ----
  const deviceToken = (ctx: Ctx) => parseCookies(ctx.req.headers.cookie)[DEVICE_COOKIE];

  r.get('/api/junior/device', (ctx) => deviceInfo(db, deviceToken(ctx)));
  r.post('/api/junior/login', async (ctx) => {
    const token = deviceToken(ctx);
    if (!pictureIpLimiter.take(ctx.ip) || (token && !pictureDeviceLimiter.take(token))) throw new HttpError(429, 'rate_limited', 'Too many tries. Ask a grown-up to help you.');
    const body = await readJson(ctx, JuniorLoginBody);
    const childId = juniorLogin(db, token, body.childId, body.code);
    startSession(ctx, db, childId);
    return me(getUser(db, childId));
  });
  r.post('/api/junior/devices', async (ctx) => {
    const adult = requireAdult(ctx);
    const { token, label } = createDevice(db, adult, await readJson(ctx, DeviceBody));
    setCookie(ctx.res, DEVICE_COOKIE, token, { maxAge: DEVICE_DAYS * 86400, secure: !config.dev });
    return { label };
  });
  r.get('/api/junior/devices', (ctx) => listDevices(db, requireAdult(ctx), deviceToken(ctx)));
  r.delete('/api/junior/devices/:id', (ctx) => {
    revokeDevice(db, requireAdult(ctx), ctx.params.id as string);
    return { ok: true };
  });
  /** An adult signed in on this device turns children's sign-in off here. */
  r.post('/api/junior/device/forget', (ctx) => {
    requireAdult(ctx);
    const token = deviceToken(ctx);
    if (token) revokeDeviceToken(db, token);
    setCookie(ctx.res, DEVICE_COOKIE, '', { maxAge: 0, secure: !config.dev });
    return { ok: true };
  });
  r.get('/api/junior/home', (ctx) => juniorHome(db, requireLearner(ctx)));
  r.get('/api/junior/ican', (ctx) => {
    const u = requireLearner(ctx);
    if (!isJuniorLearner(db, u.id)) throw new HttpError(403, 'not_junior', 'This is for Grade 1 to 3 learners.');
    return listIcan(db, u.id);
  });
  r.get('/api/junior/world/:subject', (ctx) => juniorWorld(db, requireLearner(ctx), ctx.params.subject as string));

  r.get('/api/family', (ctx) => listFamily(db, requireParent(ctx), deviceToken(ctx)));
  r.post('/api/family/children', async (ctx) => createChild(db, requireParent(ctx), await readJson(ctx, CreateChildBody)));
  r.post('/api/teach/classes/:id/children', async (ctx) => createChild(db, requireTeacher(ctx.user), await readJson(ctx, CreateChildBody), { classId: ctx.params.id as string }));
  r.get('/api/teach/classes/:id/login-cards', (ctx) => classLoginCards(db, requireTeacher(ctx.user), ctx.params.id as string));

  r.get('/api/children/:id', (ctx) => {
    const adult = requireAdult(ctx);
    const id = ctx.params.id as string;
    if (!canAccessLearner(db, adult, id)) throw new HttpError(404, 'not_found', 'That child does not exist.');
    return childSummary(db, id);
  });
  r.get('/api/children/:id/overview', (ctx) => childOverview(db, requireAdult(ctx), ctx.params.id as string));
  r.patch('/api/children/:id', async (ctx) => updateChild(db, requireAdult(ctx), ctx.params.id as string, await readJson(ctx, UpdateChildBody)));
  r.post('/api/children/:id/code', async (ctx) => ({ pictureCode: resetPictureCode(db, requireAdult(ctx), ctx.params.id as string, (await readJson(ctx, PictureCodeBody)).code) }));
  r.post('/api/children/:id/cards', async (ctx) => {
    const body = await readJson(ctx, CardLogBody);
    return logCard(db, requireAdult(ctx), ctx.params.id as string, body.cardId, body.note);
  });
  r.post('/api/children/:id/move-up', async (ctx) => {
    const adult = requireAdult(ctx);
    const body = await readJson(ctx, MoveUpBody);
    return moveUpChild(db, adult, ctx.params.id as string, body);
  });
  r.post('/api/children/:id/delete', async (ctx) => {
    const adult = requireAdult(ctx);
    const id = ctx.params.id as string;
    if (!canDeleteChild(db, adult, id)) throw new HttpError(404, 'not_found', 'That child does not exist, or you cannot delete them.');
    const body = await readJson(ctx, DeleteChildBody);
    const name = one<{ display_name: string }>(db, 'SELECT display_name FROM users WHERE id = ?', id)?.display_name ?? '';
    if (body.confirmName.toLowerCase() !== name.toLowerCase()) throw new HttpError(422, 'invalid', 'Type the child’s name to confirm.', { fieldErrors: { confirmName: ['Type the name exactly as shown'] } });
    deleteUser(db, id);
    return { ok: true };
  });

  r.get('/api/health', () => ({ ok: true }));
  return r;
}

const STREAMED = Symbol('streamed');

function clientIp(req: import('node:http').IncomingMessage): string {
  if (config.trustProxy) {
    const fwd = req.headers['x-forwarded-for'];
    const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.socket.remoteAddress ?? 'unknown';
}

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
      ip: clientIp(req),
    };
    try {
      // CSRF: state-changing requests must carry our header (cross-site forms can't set it; SameSite=Lax covers the rest).
      if (req.method !== 'GET' && req.method !== 'HEAD' && req.headers['x-requested-with'] !== 'magubane') {
        throw new HttpError(403, 'csrf', 'Missing request header.');
      }
      if (ctx.user && !ctx.user.emailVerified && !UNVERIFIED_OK.has(url.pathname)) throw new HttpError(403, 'email_unverified', 'Confirm your email address first.');
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

