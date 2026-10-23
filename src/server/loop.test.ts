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

before(async () => {
  fakeAnthropic = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      lastUpstreamBody = JSON.parse(body);
      assert.equal(req.headers['x-api-key'], 'test-key');
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      const send = (o: unknown) => res.write(`event: x\ndata: ${JSON.stringify(o)}\n\n`);
      send({ type: 'message_start', message: {} });
      for (const t of ['What ', 'do you ', 'think $x$ ', 'should be?']) send({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: t } });
      send({ type: 'message_stop' });
      res.end();
    });
  });
  await new Promise<void>((r) => fakeAnthropic.listen(0, r));
  process.env.ANTHROPIC_API_KEY = 'test-key';
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(fakeAnthropic.address() as AddressInfo).port}`;
  const { openDb } = await import('./db.ts');
  const { createApp } = await import('./app.ts');
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
}

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
  const signup = await neo.call('POST', '/api/auth/signup', { displayName: 'Thandiwe Nkosi', email: 'thandiwe@example.com', password: 'correct horse battery' });
  assert.equal(signup.user.displayName, 'Thandiwe Nkosi');
  assert.ok(neo.cookie.startsWith('ml_session='));
  await neo.call('POST', '/api/auth/signup', { displayName: 'X', email: 'thandiwe@example.com', password: 'another password' }, 409);

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
  const back = await neo.call('POST', '/api/auth/login', { email: 'THANDIWE@example.com', password: 'correct horse battery' });
  assert.equal(back.profile.grade, 10);
  assert.equal((await neo.call('GET', '/api/progress')).totals.testsCompleted, 2);
});

test('security: CSRF header, authorisation, validation', async () => {
  const a = new Client();
  await a.call('POST', '/api/auth/signup', { displayName: 'Sipho', email: 'sipho@example.com', password: 'longenough1' });
  await a.call('PUT', '/api/profile', { grade: 8, curriculumId: 'za-caps', subjects: ['mathematics'], goals: [], dailyMinutes: 20 });
  const act = await a.call('POST', '/api/activities', { kind: 'practice', skillId: 'integers' });
  const q = await a.call('POST', `/api/activities/${act.id}/next`, {});

  const b = new Client();
  await b.call('POST', '/api/auth/signup', { displayName: 'Lindiwe', email: 'lindiwe@example.com', password: 'longenough2' });
  await b.call('GET', `/api/activities/${act.id}`, undefined, 404);
  await b.call('POST', `/api/questions/${q.question.id}/answer`, { response: '1', timeMs: 10 }, 404);
  await b.call('POST', `/api/questions/${q.question.id}/hint`, undefined, 404);

  const noHeader = await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { cookie: a.cookie } });
  assert.equal(noHeader.status, 403);
  await a.call('PUT', '/api/profile', { grade: 99, curriculumId: 'za-caps', subjects: [], goals: [], dailyMinutes: 1 }, 422);
  await a.call('POST', '/api/auth/signup', { displayName: 'x', email: 'not-an-email', password: 'short' }, 422);
  const health = await fetch(`${base}/api/health`);
  assert.match(health.headers.get('content-security-policy') ?? '', /default-src 'self'/);
});
