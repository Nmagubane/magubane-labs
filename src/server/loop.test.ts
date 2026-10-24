/**
 * End-to-end over HTTP: the complete learning loop a real student goes through,
 * plus the integrity and security rules (assessment lock, no answer leakage, CSRF, authorisation).
 * The tutor is tested against a local fake of the Anthropic streaming API.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

let fakeAnthropic: Server;
let app: Server;
let base = '';
let db: import('./db.ts').Db;
let lastUpstreamBody: { system: string; messages: { role: string; content: string }[] } | null = null;
/** Every email the app sends, captured instead of delivered. */
const outbox: { to: string; subject: string; text: string; attachments: { filename: string; content: Buffer }[] }[] = [];
const lastCode = (email: string) => {
  const m = [...outbox].reverse().find((x) => x.to === email && /\b\d{6}\b/.test(x.subject));
  return m?.subject.match(/\b(\d{6})\b/)?.[1] ?? '';
};

before(async () => {
  fakeAnthropic = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      lastUpstreamBody = JSON.parse(body);
      assert.equal(req.headers['x-api-key'], 'sk-ant-test-key');
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      const send = (o: unknown) => res.write(`event: x\ndata: ${JSON.stringify(o)}\n\n`);
      send({ type: 'message_start', message: {} });
      for (const t of ['What ', 'do you ', 'think $x$ ', 'should be?']) send({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: t } });
      send({ type: 'message_stop' });
      res.end();
    });
  });
  await new Promise<void>((r) => fakeAnthropic.listen(0, r));
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
  process.env.SIGNUP_RATE_PER_HOUR = '1000';
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(fakeAnthropic.address() as AddressInfo).port}`;
  process.env.EDUCATOR_CODES = 'TEACH-2026';
  const { openDb } = await import('./db.ts');
  const { createApp } = await import('./app.ts');
  const { setTransport } = await import('./mailer.ts');
  setTransport(async (m) => {
    outbox.push({ to: m.to.email, subject: m.subject, text: m.text, attachments: m.attachments ?? [] });
    return { status: 'sent' };
  });
  db = openDb(':memory:');
  app = createApp(db);
  await new Promise<void>((r) => app.listen(0, r));
  base = `http://127.0.0.1:${(app.address() as AddressInfo).port}`;
});

after(() => {
  app.close();
  fakeAnthropic.close();
});

class Client {
  cookie = '';
  async call<T = any>(method: string, path: string, body?: unknown, expect = 200): Promise<T> {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json', 'x-requested-with': 'magubane', ...(this.cookie ? { cookie: this.cookie } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) this.cookie = c.split(';')[0] as string;
    const text = await res.text();
    assert.equal(res.status, expect, `${method} ${path} → ${res.status}: ${text}`);
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as T;
    }
  }
  /** Sign up and confirm the email with the code that was "sent". */
  async signup<T = any>(body: Record<string, unknown>): Promise<T> {
    const out = await this.call<T>('POST', '/api/auth/signup', body);
    await this.call('POST', '/api/auth/verify', { code: lastCode(String(body.email)) });
    return out;
  }
}

const backdateCodes = () => db.prepare("UPDATE email_codes SET created_at = '2000-01-01T00:00:00.000Z'").run();

function secretOf(questionId: string): { answer: any; misconceptions: any[] } {
  const row = db.prepare('SELECT secret FROM question_instances WHERE id = ?').get(questionId) as { secret: string };
  return JSON.parse(row.secret);
}

function correctResponse(answer: any): string | string[] {
  switch (answer.kind) {
    case 'numeric':
      return String(answer.value);
    case 'fraction':
      return answer.d === 1 ? String(answer.n) : `${answer.n}/${answer.d}`;
    case 'expression':
      return answer.expr;
    case 'roots':
      return answer.values.map((v: any) => (v.d === 1 ? String(v.n) : `${v.n}/${v.d}`));
    case 'coefficients':
      return answer.values.map(String);
    case 'choice':
      return answer.id;
  }
  throw new Error('unknown');
}

test('the complete learning loop', async () => {
  const neo = new Client();

  // 1. Create an account
  const signup = await neo.call('POST', '/api/auth/signup', { displayName: 'Thandiwe Nkosi', email: 'thandiwe@example.com', password: 'Correct-horse-9', ageGroup: 'minor', guardianName: 'Nomsa Nkosi', guardianEmail: 'nomsa@example.com', consent: true });
  assert.equal(signup.user.displayName, 'Thandiwe Nkosi');
  assert.equal(signup.user.emailVerified, false);
  assert.ok(neo.cookie.startsWith('ml_session='));
  // Nothing works until the email is confirmed
  await neo.call('GET', '/api/home', undefined, 403);
  await neo.call('POST', '/api/auth/verify', { code: '000000' === lastCode('thandiwe@example.com') ? '111111' : '000000' }, 400);
  const verified = await neo.call('POST', '/api/auth/verify', { code: lastCode('thandiwe@example.com') });
  assert.equal(verified.user.emailVerified, true);
  assert.ok(outbox.some((m) => m.to === 'nomsa@example.com' && /joined Magubane Labs/.test(m.subject)), 'guardian is told about the account');
  await neo.call('POST', '/api/auth/signup', { displayName: 'X', email: 'thandiwe@example.com', password: 'Another-pass-7', ageGroup: 'adult', consent: true }, 409);

  // 2. Onboarding
  const me = await neo.call('GET', '/api/me');
  assert.equal(me.profile, null);
  await neo.call('GET', '/api/home', undefined, 409);
  const profile = await neo.call('PUT', '/api/profile', { grade: 10, curriculumId: 'za-caps', subjects: ['mathematics', 'physical-sciences'], goals: ['pure-maths', 'pass-exams'], dailyMinutes: 30 });
  assert.equal(profile.baselineCompleted, false);

  // Baseline — assessment mode, no answers leak
  const baseline = await neo.call('POST', '/api/activities', { kind: 'baseline' });
  assert.equal(baseline.mode, 'assessment');
  const bState = await neo.call('GET', `/api/activities/${baseline.id}`);
  assert.ok(bState.items.length >= 6);
  const raw = JSON.stringify(bState);
  assert.ok(!/"answer"|"solution"|"misconceptions"|"hints":\["/.test(raw), 'baseline payload must not contain answers');
  for (const item of bState.items) assert.equal(item.question.hintsAvailable, 0);

  // Tutor and hints are locked during an assessment
  await neo.call('POST', '/api/tutor/conversations', {}, 423);
  await neo.call('POST', `/api/questions/${bState.items[0].question.id}/hint`, undefined, 403);
  await neo.call('POST', '/api/activities', { kind: 'test' }, 409);

  // Answer: half right, a couple skipped, rest wrong; unreadable answers are rejected, not marked wrong
  for (const [i, item] of bState.items.entries()) {
    const secret = secretOf(item.question.id);
    if (i % 4 === 3) await neo.call('POST', `/api/questions/${item.question.id}/answer`, { response: null, skipped: true, timeMs: 3000 });
    else if (i % 2 === 0) await neo.call('POST', `/api/questions/${item.question.id}/answer`, { response: correctResponse(secret.answer), timeMs: 20000 });
    else {
      const wrong = secret.misconceptions[0] ? correctResponse(secret.misconceptions[0].answer) : secret.answer.kind === 'choice' ? 'not-an-option' : secret.answer.kind === 'roots' ? ['99', '98'] : secret.answer.kind === 'coefficients' ? ['9', '9', '9', '9', '9'].slice(0, secret.answer.values.length) : secret.answer.kind === 'expression' ? 'x+12345' : '987654';
      await neo.call('POST', `/api/questions/${item.question.id}/answer`, { response: wrong, timeMs: 15000 });
    }
  }
  const numericQ = bState.items.find((it: any) => it.question.input.kind === 'numeric');
  if (numericQ) await neo.call('POST', `/api/questions/${numericQ.question.id}/answer`, { response: 'banana', timeMs: 1000 }, 422);

  const bResults = await neo.call('POST', `/api/activities/${baseline.id}/submit`);
  assert.equal(bResults.total, bState.items.length);
  assert.ok(bResults.perTopic.length > 0);
  assert.ok(bResults.items.every((i: any) => typeof i.answerDisplay === 'string' && i.solution.length > 0), 'results reveal solutions after submit');
  assert.equal((await neo.call('GET', '/api/me')).profile.baselineCompleted, true);

  // 3. Dashboard
  const home = await neo.call('GET', '/api/home');
  assert.equal(home.firstName, 'Thandiwe');
  assert.ok(home.priority, 'home has a priority');
  assert.ok(home.priority.reasons.length > 0);
  assert.equal(home.recentResults[0].activityId, baseline.id);

  // 4–5. Open a lesson and learn: worked example + check question
  const skill = await neo.call('GET', '/api/skills/linear-equations');
  assert.ok(skill.lesson.blocks.some((b: any) => b.kind === 'widget' && b.widget.type === 'equation-balancer'));
  const example = await neo.call('GET', '/api/skills/linear-equations/example?level=3');
  assert.ok(example.solution.length >= 2);
  const lesson = await neo.call('POST', '/api/activities', { kind: 'lesson', skillId: 'linear-equations' });
  const lessonAgain = await neo.call('POST', '/api/activities', { kind: 'lesson', skillId: 'linear-equations' });
  assert.equal(lesson.id, lessonAgain.id, 'reopening a lesson resumes it');
  const check = await neo.call('POST', `/api/activities/${lesson.id}/next`, { level: 2 });
  assert.equal(check.question.difficulty, 2);
  assert.ok(!('answer' in check.question));
  const checkFb = await neo.call('POST', `/api/questions/${check.question.id}/answer`, { response: correctResponse(secretOf(check.question.id).answer), timeMs: 30000 });
  assert.equal(checkFb.feedback.correct, true);
  await neo.call('POST', `/api/activities/${lesson.id}/submit`);
  const cat = await neo.call('GET', '/api/catalogue');
  const le = cat.subjects.flatMap((s: any) => s.topics).flatMap((t: any) => t.skills).find((s: any) => s.skillId === 'linear-equations');
  assert.equal(le.lessonCompleted, true);

  // 6–9. Practice: hints, a diagnosed mistake, feedback, difficulty adjust
  const practice = await neo.call('POST', '/api/activities', { kind: 'practice', skillId: 'factorise-trinomial', count: 4 });
  let item = await neo.call('POST', `/api/activities/${practice.id}/next`, {});
  const same = await neo.call('POST', `/api/activities/${practice.id}/next`, {});
  assert.equal(same.question.id, item.question.id, 'an unanswered question is resumed, not replaced');
  const hint = await neo.call('POST', `/api/questions/${item.question.id}/hint`);
  assert.ok(hint.hint.length > 0);
  const secret = secretOf(item.question.id);
  const wrong = secret.misconceptions[0];
  let fb = await neo.call('POST', `/api/questions/${item.question.id}/answer`, { response: wrong ? correctResponse(wrong.answer) : 'x+1', timeMs: 40000 });
  assert.equal(fb.feedback.correct, false);
  if (wrong) assert.equal(fb.feedback.mistake.code, wrong.code);
  assert.ok(fb.feedback.solution.length > 0);
  await neo.call('POST', `/api/questions/${item.question.id}/answer`, { response: 'x', timeMs: 1000 }, 409);
  const harder = await neo.call('POST', `/api/activities/${practice.id}/next`, { adjust: 'harder' });
  for (let i = 0; i < 3; i++) {
    item = i === 0 ? harder : await neo.call('POST', `/api/activities/${practice.id}/next`, {});
    fb = await neo.call('POST', `/api/questions/${item.question.id}/answer`, { response: correctResponse(secretOf(item.question.id).answer), timeMs: 25000 });
    assert.equal(fb.feedback.correct, true);
  }
  assert.equal(fb.done, true);
  await neo.call('POST', `/api/activities/${practice.id}/next`, {}, 409);
  const pResults = await neo.call('POST', `/api/activities/${practice.id}/submit`);
  assert.equal(pResults.total, 4);
  assert.equal(pResults.correct, 3);

  // 10–12. Take a test, get results with weaknesses
  const t = await neo.call('POST', '/api/activities', { kind: 'test', topicId: 'equations', count: 6 });
  assert.ok(t.timeLimitSec > 0);
  await neo.call('POST', '/api/tutor/conversations', {}, 423);
  const tState = await neo.call('GET', `/api/activities/${t.id}`);
  assert.equal(tState.items.length, 6);
  for (const [i, it] of tState.items.entries()) {
    const s = secretOf(it.question.id);
    if (i < 3) await neo.call('POST', `/api/questions/${it.question.id}/answer`, { response: correctResponse(s.answer), timeMs: 30000, confidence: 'sure' });
    else if (i < 5) {
      const w = s.misconceptions[0] ? correctResponse(s.misconceptions[0].answer) : s.answer.kind === 'roots' ? ['50', '51'] : '50';
      const answerRes = await neo.call('POST', `/api/questions/${it.question.id}/answer`, { response: w, timeMs: 30000, confidence: 'sure' });
      assert.equal(answerRes.feedback, null, 'no feedback during a test');
    }
    // the 6th is left unanswered
  }
  const tResults = await neo.call('POST', `/api/activities/${t.id}/submit`);
  assert.equal(tResults.total, 6);
  assert.equal(tResults.correct, 3);
  assert.ok(tResults.biggestOpportunity, 'results name the biggest opportunity');
  assert.ok(tResults.calibration.sureWrong >= 2);
  assert.deepEqual(await neo.call('GET', `/api/activities/${t.id}/results`), tResults);

  // 13. Ask the tutor (now unlocked) about a practice question — streamed
  const conv = await neo.call('POST', '/api/tutor/conversations', { questionId: item.question.id });
  assert.ok(conv.title.startsWith('Help with'));
  assert.ok(conv.suggestions.length > 0);
  const res = await fetch(`${base}/api/tutor/conversations/${conv.id}/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-requested-with': 'magubane', cookie: neo.cookie },
    body: JSON.stringify({ content: 'I don\'t get why this works' }),
  });
  assert.equal(res.status, 200);
  const stream = await res.text();
  assert.match(stream, /"type":"delta"/);
  assert.match(stream, /"type":"done"/);
  assert.ok(lastUpstreamBody!.system.includes('Grade 10'));
  assert.ok(lastUpstreamBody!.system.includes('QUESTION:'));
  assert.ok(!lastUpstreamBody!.system.includes('thandiwe@example.com') && !lastUpstreamBody!.system.includes('Thandiwe'), 'no personal data sent to the model');
  const convAfter = await neo.call('GET', `/api/tutor/conversations/${conv.id}`);
  assert.equal(convAfter.messages.length, 2);
  assert.equal(convAfter.messages[1].content, 'What do you think $x$ should be?');
  const regen = await fetch(`${base}/api/tutor/conversations/${conv.id}/regenerate`, { method: 'POST', headers: { 'x-requested-with': 'magubane', cookie: neo.cookie } });
  assert.match(await regen.text(), /"type":"done"/);
  assert.equal((await neo.call('GET', `/api/tutor/conversations/${conv.id}`)).messages.length, 2);

  // 14–15. Progress and exam readiness
  const prog = await neo.call('GET', '/api/progress');
  assert.ok(prog.subjects[0].topics.length > 0);
  assert.equal(prog.trend.length, 30);
  assert.ok(prog.totals.questions > 10);
  assert.equal(prog.totals.testsCompleted, 1);
  assert.ok(prog.mistakes.length > 0, 'recurring mistakes are surfaced');
  const examDate = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);
  const exam = await neo.call('POST', '/api/exams', { title: 'Maths June exam', subjectId: 'mathematics', examDate });
  assert.ok(exam.readiness > 0 && exam.readiness < 100);
  const detail = await neo.call('GET', `/api/exams/${exam.id}`);
  assert.ok(detail.plan.days.length >= 19);
  assert.equal(detail.plan.days.at(-1).items[0].action, 'mock');
  assert.ok(detail.readiness.highRisk.length > 0);
  const home2 = await neo.call('GET', '/api/home');
  assert.equal(home2.exam.id, exam.id);
  const mock = await neo.call('POST', '/api/activities', { kind: 'test', examId: exam.id, count: 3, timed: false });
  assert.equal(mock.timeLimitSec, null);
  await neo.call('POST', `/api/activities/${mock.id}/submit`);

  // Return later: log out and back in, everything is still there
  await neo.call('POST', '/api/auth/logout');
  assert.equal((await neo.call('GET', '/api/me')).user, null);
  await neo.call('GET', '/api/home', undefined, 401);
  await neo.call('POST', '/api/auth/login', { email: 'thandiwe@example.com', password: 'wrong password' }, 401);
  const back = await neo.call('POST', '/api/auth/login', { email: 'THANDIWE@example.com', password: 'Correct-horse-9' });
  assert.equal(back.profile.grade, 10);
  assert.equal((await neo.call('GET', '/api/progress')).totals.testsCompleted, 2);
});

test('learners can change grade and subjects later, and mastery is kept', async () => {
  const k = new Client();
  await k.signup({ displayName: 'Kabelo', email: 'kabelo@example.com', password: 'Grade-change-5', ageGroup: 'adult', consent: true });
  await k.call('PUT', '/api/profile', { grade: 5, curriculumId: 'za-caps', subjects: ['mathematics', 'natural-sciences'], goals: [], dailyMinutes: 20 });
  const act = await k.call('POST', '/api/activities', { kind: 'practice', skillId: 'place-value' });
  const q = await k.call('POST', `/api/activities/${act.id}/next`, {});
  const input = q.question.input;
  await k.call('POST', `/api/questions/${q.question.id}/answer`, { response: input.kind === 'choice' ? input.options[0].id : '1', timeMs: 2000 });
  const before = (await k.call('GET', '/api/catalogue')).subjects.find((s: { id: string }) => s.id === 'mathematics').topics.flatMap((t: { skills: { skillId: string; attempts?: number; mastery: number }[] }) => t.skills).find((s: { skillId: string }) => s.skillId === 'place-value');
  // Grade 10: Natural Sciences & Technology no longer applies and is dropped; the rest is kept.
  const p = await k.call('PUT', '/api/profile', { grade: 10, curriculumId: 'za-caps', subjects: ['mathematics', 'natural-sciences'], goals: [], dailyMinutes: 30 });
  assert.equal(p.grade, 10);
  assert.deepEqual(p.subjects, ['mathematics']);
  assert.equal(p.dailyMinutes, 30);
  await k.call('PUT', '/api/profile', { grade: 10, curriculumId: 'za-caps', subjects: ['natural-sciences'], goals: [], dailyMinutes: 30 }, 400);
  const cat = await k.call('GET', '/api/catalogue');
  assert.equal(cat.grade, 10);
  const pv = cat.subjects.find((s: { id: string }) => s.id === 'mathematics').topics.flatMap((t: { skills: { skillId: string; inScope: boolean; mastery: number }[] }) => t.skills).find((s: { skillId: string }) => s.skillId === 'place-value');
  assert.equal(pv.mastery, before.mastery, 'mastery survives a grade change');
  assert.equal(pv.inScope, false, 'Grade 4 place value is outside the Grade 10 band');
});

test('security: CSRF header, authorisation, validation', async () => {
  const a = new Client();
  await a.signup({ displayName: 'Sipho', email: 'sipho@example.com', password: 'Long-enough-1', ageGroup: 'adult', consent: true });
  await a.call('PUT', '/api/profile', { grade: 8, curriculumId: 'za-caps', subjects: ['mathematics'], goals: [], dailyMinutes: 20 });
  const act = await a.call('POST', '/api/activities', { kind: 'practice', skillId: 'integers' });
  const q = await a.call('POST', `/api/activities/${act.id}/next`, {});

  const b = new Client();
  await b.signup({ displayName: 'Lindiwe', email: 'lindiwe@example.com', password: 'Long-enough-2', ageGroup: 'adult', consent: true });
  await b.call('GET', `/api/activities/${act.id}`, undefined, 404);
  await b.call('POST', `/api/questions/${q.question.id}/answer`, { response: '1', timeMs: 10 }, 404);
  await b.call('POST', `/api/questions/${q.question.id}/hint`, undefined, 404);

  const noHeader = await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { cookie: a.cookie } });
  assert.equal(noHeader.status, 403);
  await a.call('PUT', '/api/profile', { grade: 99, curriculumId: 'za-caps', subjects: [], goals: [], dailyMinutes: 1 }, 422);
  await a.call('POST', '/api/auth/signup', { displayName: 'x', email: 'not-an-email', password: 'short', ageGroup: 'adult', consent: true }, 422);
  const health = await fetch(`${base}/api/health`);
  assert.match(health.headers.get('content-security-policy') ?? '', /default-src 'self'/);
});

test('pilot: invite codes, parent consent, account deletion', async () => {
  const { config } = await import('./config.ts');
  config.signupMode = 'invite';
  config.inviteCodes = ['PILOT-SOWETO'];
  try {
    const c = new Client();
    const base_ = { displayName: 'Ayanda', email: 'ayanda@example.com', password: 'Long-enough-3', ageGroup: 'minor', guardianName: 'Zodwa', guardianEmail: 'zodwa@example.com', consent: true };
    await c.call('POST', '/api/auth/signup', base_, 403);
    await c.call('POST', '/api/auth/signup', { ...base_, accessCode: 'WRONG' }, 403);
    await c.call('POST', '/api/auth/signup', { ...base_, accessCode: 'pilot-soweto', guardianEmail: undefined }, 422);
    await c.call('POST', '/api/auth/signup', { ...base_, accessCode: 'pilot-soweto', guardianEmail: 'ayanda@example.com' }, 422);
    await c.call('POST', '/api/auth/signup', { ...base_, accessCode: 'pilot-soweto', consent: false }, 422);
    const ok = await c.signup({ ...base_, accessCode: 'pilot-soweto' });
    const row = db.prepare('SELECT invite_code, is_minor, guardian_email, consent_at, consent_version FROM users WHERE id = ?').get(ok.user.id) as Record<string, unknown>;
    assert.equal(row.invite_code, 'PILOT-SOWETO');
    assert.equal(row.is_minor, 1);
    assert.equal(row.guardian_email, 'zodwa@example.com');
    assert.ok(row.consent_at && row.consent_version);
    const cfg = await c.call('GET', '/api/config');
    assert.equal(cfg.signupMode, 'invite');
    assert.ok(!JSON.stringify(cfg).includes('PILOT-SOWETO'), 'codes are never exposed');

    await c.call('PUT', '/api/profile', { grade: 9, curriculumId: 'za-caps', subjects: ['mathematics'], goals: [], dailyMinutes: 20 });
    const act = await c.call('POST', '/api/activities', { kind: 'practice', skillId: 'integers' });
    const q = await c.call('POST', `/api/activities/${act.id}/next`, {});
    await c.call('POST', `/api/questions/${q.question.id}/answer`, { response: '1', timeMs: 1000 });
    await c.call('POST', '/api/account/delete', { password: 'nope' }, 401);
    await c.call('POST', '/api/account/delete', { password: 'Long-enough-3' });
    for (const t of ['users', 'responses', 'question_instances', 'activities', 'skill_states', 'mastery_snapshots', 'sessions']) {
      const col = t === 'users' ? 'id' : 'user_id';
      const n = (db.prepare(`SELECT COUNT(*) AS n FROM ${t} WHERE ${col} = ?`).get(ok.user.id) as { n: number }).n;
      assert.equal(n, 0, `${t} still has rows after deletion`);
    }
    assert.equal((await c.call('GET', '/api/me')).user, null);
  } finally {
    config.signupMode = 'open';
  }
});

test('security: password rules, email codes, password reset', async () => {
  const c = new Client();
  const base_ = { displayName: 'Bongani', email: 'bongani@example.com', ageGroup: 'adult', consent: true };
  for (const [pw, why] of [
    ['Short-1', 'at least 8'],
    ['alllowercase-1', 'uppercase'],
    ['ALLUPPERCASE-1', 'lowercase'],
    ['No-numbers-here', 'number'],
    ['NoSpecial123', 'special'],
    ['Password1!', 'well known'],
    ['Bongani-2026!', 'name or email'],
  ] as const) {
    const res = await c.call('POST', '/api/auth/signup', { ...base_, password: pw }, 422);
    assert.match(JSON.stringify(res.error.details), new RegExp(why, 'i'), `${pw} should fail for: ${why}`);
  }
  const ok = await c.call('POST', '/api/auth/signup', { ...base_, password: 'Strong-enough-8' });
  assert.equal(ok.user.emailVerified, false);
  const code = lastCode('bongani@example.com');
  assert.match(code, /^\d{6}$/);
  // Stored only as a hash
  assert.ok(!JSON.stringify(db.prepare('SELECT * FROM email_codes').all()).includes(code));
  await c.call('POST', '/api/auth/resend', {}, 429); // too soon
  for (let i = 0; i < 5; i++) await c.call('POST', '/api/auth/verify', { code: code === '123456' ? '654321' : '123456' }, 400);
  const locked = await c.call('POST', '/api/auth/verify', { code }, 400);
  assert.equal(locked.error.code, 'too_many_attempts');
  backdateCodes();
  await c.call('POST', '/api/auth/resend', {});
  await c.call('POST', '/api/auth/verify', { code: lastCode('bongani@example.com') });
  await c.call('PUT', '/api/profile', { grade: 8, curriculumId: 'za-caps', subjects: ['mathematics'], goals: [], dailyMinutes: 20 });

  // Forgot password: same answer for unknown emails; a reset signs out other sessions
  const other = new Client();
  await other.call('POST', '/api/auth/login', { email: 'bongani@example.com', password: 'Strong-enough-8' });
  const before_ = outbox.length;
  await new Client().call('POST', '/api/auth/forgot', { email: 'nobody@example.com' });
  assert.equal(outbox.length, before_, 'no email for unknown accounts');
  const r = new Client();
  await r.call('POST', '/api/auth/forgot', { email: 'bongani@example.com' });
  const resetCode = lastCode('bongani@example.com');
  await r.call('POST', '/api/auth/reset', { email: 'bongani@example.com', code: resetCode, password: 'weak' }, 422);
  await r.call('POST', '/api/auth/reset', { email: 'bongani@example.com', code: resetCode, password: 'Brand-new-pass-4' });
  await other.call('GET', '/api/home', undefined, 401);
  await c.call('GET', '/api/home', undefined, 401);
  await r.call('GET', '/api/home');
  await r.call('POST', '/api/auth/reset', { email: 'bongani@example.com', code: resetCode, password: 'Another-pass-5' }, 400);
  await new Client().call('POST', '/api/auth/login', { email: 'bongani@example.com', password: 'Brand-new-pass-4' });

  // Change password needs the current one
  await r.call('POST', '/api/account/password', { current: 'nope', next: 'Changed-pass-6' }, 401);
  await r.call('POST', '/api/account/password', { current: 'Brand-new-pass-4', next: 'short' }, 422);
  await r.call('POST', '/api/account/password', { current: 'Brand-new-pass-4', next: 'Changed-pass-6' });
  await r.call('GET', '/api/home');
});

test('educator mode: classes, assignments, access rules, PDF reports', async () => {
  const { config } = await import('./config.ts');
  const { runWeeklyReports } = await import('./reports.ts');
  config.signupMode = 'invite';
  config.inviteCodes = ['PILOT-1'];
  try {
    // Teacher accounts need an educator code, not a learner invite code
    const t = new Client();
    const teacherBody = { accountType: 'teacher', displayName: 'Ms Dlamini', email: 'dlamini@school.example', password: 'Teach-well-2026', school: 'Thabo High', ageGroup: 'adult', consent: true };
    await t.call('POST', '/api/auth/signup', { ...teacherBody, accessCode: 'PILOT-1' }, 403);
    await t.call('POST', '/api/auth/signup', { ...teacherBody, accessCode: 'TEACH-2026', ageGroup: 'minor' }, 422);
    const tch = await t.signup({ ...teacherBody, accessCode: 'teach-2026' });
    assert.equal(tch.user.role, 'teacher');
    await t.call('GET', '/api/home', undefined, 403); // teachers have no learner home

    const cls = await t.call('POST', '/api/teach/classes', { name: '9B Natural Sciences', grade: 9, subjectId: 'physical-sciences' });
    assert.match(cls.joinCode, /^[A-Z2-9]{6}$/);

    // A class code works as an invite: a learner signs up with it and joins straight away
    const l = new Client();
    const lr = await l.signup({ displayName: 'Kagiso', email: 'kagiso@example.com', password: 'Learn-hard-77', classCode: cls.joinCode.toLowerCase(), ageGroup: 'minor', guardianName: 'Mpho', guardianEmail: 'mpho@example.com', consent: true });
    assert.ok(outbox.some((m) => m.to === 'mpho@example.com' && /joined 9B Natural Sciences/.test(m.subject)), 'guardian told about the class');
    assert.equal((await l.call('GET', '/api/classes')).length, 1);
    await l.call('PUT', '/api/profile', { grade: 9, curriculumId: 'za-caps', subjects: ['physical-sciences', 'life-sciences'], goals: [], dailyMinutes: 30 });
    await l.call('POST', '/api/teach/classes', { name: 'x', grade: 9, subjectId: 'mathematics' }, 403); // learners can't teach

    // A second learner, not in the class
    const outsider = new Client();
    const or_ = await outsider.signup({ displayName: 'Zanele', email: 'zanele@example.com', password: 'Learn-hard-88', accessCode: 'PILOT-1', ageGroup: 'adult', consent: true });

    // Teacher sets work; the learner sees it on Home and does it
    const asg = await t.call('POST', `/api/teach/classes/${cls.id}/assignments`, { kind: 'practice', skillId: 'density', dueAt: '2099-01-01', questionCount: 3, note: 'Show your working' });
    await t.call('POST', `/api/teach/classes/${cls.id}/assignments`, { kind: 'practice', skillId: 'density', dueAt: '2000-01-01' }, 422);
    const home = await l.call('GET', '/api/home');
    assert.equal(home.assignments.length, 1);
    assert.equal(home.assignments[0].done, false);
    const started = await l.call('POST', `/api/assignments/${asg.id}/start`);
    assert.equal(started.kind, 'practice');
    for (let i = 0; i < 3; i++) {
      const item = await l.call('POST', `/api/activities/${started.activityId}/next`, {});
      await l.call('POST', `/api/questions/${item.question.id}/answer`, { response: correctResponse(secretOf(item.question.id).answer), timeMs: 4000 });
    }
    await l.call('POST', `/api/activities/${started.activityId}/submit`);
    assert.equal((await l.call('GET', '/api/home')).assignments[0].done, true);

    // Teacher view: learner row, heatmap, assignment completion
    const detail = await t.call('GET', `/api/teach/classes/${cls.id}`);
    assert.equal(detail.learners.length, 1);
    assert.equal(detail.learners[0].name, 'Kagiso');
    assert.ok(detail.heat[lr.user.id].density, 'heatmap has the practised skill');
    assert.equal(detail.assignments[0].completed, 1);
    const learnerView = await t.call('GET', `/api/teach/learners/${lr.user.id}`);
    assert.ok(learnerView.progress.subjects.length >= 1);
    await t.call('GET', `/api/teach/learners/${or_.user.id}`, undefined, 404); // not in their class

    // Another teacher can't see this class or learner
    const t2 = new Client();
    await t2.signup({ ...teacherBody, email: 'other@school.example', accessCode: 'TEACH-2026' });
    await t2.call('GET', `/api/teach/classes/${cls.id}`, undefined, 404);
    await t2.call('GET', `/api/reports/learner/${lr.user.id}`, undefined, 404);
    await outsider.call('GET', `/api/reports/learner/${lr.user.id}`, undefined, 404);

    // PDF reports: the teacher and the learner can download; the file is a real PDF with the right content
    const pdfRes = await fetch(`${base}/api/reports/learner/${lr.user.id}`, { headers: { cookie: t.cookie } });
    assert.equal(pdfRes.status, 200);
    assert.equal(pdfRes.headers.get('content-type'), 'application/pdf');
    const pdf = Buffer.from(await pdfRes.arrayBuffer());
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.ok(pdf.includes('Kagiso'), 'report names the learner');
    assert.ok(pdf.includes('%%EOF'));
    assert.equal((await fetch(`${base}/api/reports/learner/${lr.user.id}`, { headers: { cookie: l.cookie } })).status, 200);
    const classPdf = await fetch(`${base}/api/reports/class/${cls.id}`, { headers: { cookie: t.cookie } });
    assert.equal(classPdf.status, 200);

    // Teacher emails a report: guardian and teacher both get the PDF
    const sent = await t.call('POST', `/api/teach/learners/${lr.user.id}/report`, { note: 'Great effort on density this week.' });
    assert.deepEqual(sent.sentTo.map((s: any) => s.role).sort(), ['guardian', 'teacher']);
    const toGuardian = [...outbox].reverse().find((m) => m.to === 'mpho@example.com' && /progress report/.test(m.subject))!;
    assert.equal(toGuardian.attachments.length, 1);
    assert.equal(toGuardian.attachments[0]!.content.subarray(0, 5).toString(), '%PDF-');
    assert.ok(toGuardian.text.includes('Great effort on density'));

    // Weekly reports: sent on the report day, once per period
    const sunday = new Date('2026-11-01T16:30:00Z'); // Sunday 18:30 in South Africa
    db.prepare("UPDATE users SET created_at = '2026-01-01T00:00:00.000Z'").run();
    const first = await runWeeklyReports(db, sunday);
    assert.ok(first.guardians >= 1 && first.teachers >= 1, JSON.stringify(first));
    const again = await runWeeklyReports(db, sunday);
    assert.deepEqual(again, { guardians: 0, teachers: 0 }, 'never twice in one period');
    assert.deepEqual(await runWeeklyReports(db, new Date('2026-11-02T16:30:00Z')), { guardians: 0, teachers: 0 }, 'only on the report day');

    // The guardian can stop reports with the link in the email
    const link = toGuardian.text.match(/http\S+unsubscribe\S+/)![0];
    const u = new URL(link);
    assert.equal((await fetch(`${base}${u.pathname}${u.search}`)).status, 200);
    assert.equal((await fetch(`${base}${u.pathname}?l=${u.searchParams.get('l')}&t=forged`)).status, 400);
    const after_ = await t.call('POST', `/api/teach/learners/${lr.user.id}/report`, {});
    assert.deepEqual(after_.sentTo.map((s: any) => s.role), ['teacher']);

    // Leaving the class ends the teacher's access
    await l.call('DELETE', `/api/classes/${cls.id}`);
    await t.call('GET', `/api/teach/learners/${lr.user.id}`, undefined, 404);
    await t.call('GET', `/api/reports/learner/${lr.user.id}`, undefined, 404);
  } finally {
    config.signupMode = 'open';
  }
});
