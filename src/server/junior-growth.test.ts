/**
 * Junior, growing up: "try one like it" after a mistake, "I can…" statements a child earns, and the
 * Grade 3 → Grade 4 handover into a full learner account. End to end over HTTP.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

let app: Server;
let base = '';
let db: import('./db.ts').Db;
const outbox: { to: string; subject: string; text: string }[] = [];

before(async () => {
  process.env.SIGNUP_RATE_PER_HOUR = '1000';
  process.env.EDUCATOR_CODES = 'TEACH-2026';
  const { openDb } = await import('./db.ts');
  const { createApp } = await import('./app.ts');
  const { setTransport } = await import('./mailer.ts');
  setTransport(async (m) => {
    outbox.push({ to: m.to.email, subject: m.subject, text: m.text });
    return { status: 'sent' };
  });
  db = openDb(':memory:');
  app = createApp(db);
  await new Promise<void>((r) => app.listen(0, r));
  base = `http://127.0.0.1:${(app.address() as AddressInfo).port}`;
});
after(() => app.close());

class Browser {
  jar = new Map<string, string>();
  async call<T = any>(method: string, path: string, body?: unknown, expect = 200): Promise<T> {
    const cookie = [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ');
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json', 'x-requested-with': 'magubane', ...(cookie ? { cookie } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(';');
      const [k, ...v] = (pair as string).split('=');
      if (/Max-Age=0/.test(c)) this.jar.delete(k as string);
      else this.jar.set(k as string, v.join('='));
    }
    const text = await res.text();
    assert.equal(res.status, expect, `${method} ${path} → ${res.status}: ${text}`);
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as T;
    }
  }
  async signup(body: Record<string, unknown>) {
    await this.call('POST', '/api/auth/signup', { ageGroup: 'adult', consent: true, password: 'Long-Pass-Phrase-42!', ...body });
    const code = [...outbox].reverse().find((m) => m.to === body.email)?.subject.match(/\b(\d{6})\b/)?.[1];
    return this.call('POST', '/api/auth/verify', { code });
  }
}

let families = 0;
/** A parent with one child, signed in as the child on the family's device. */
async function familyWithChild(grade: number, name = 'Lindiwe') {
  const n = ++families;
  const parent = new Browser();
  await parent.signup({ accountType: 'parent', displayName: `Parent ${n}`, email: `parent${n}@example.com` });
  const { child } = await parent.call('POST', '/api/family/children', { name, grade, homeLanguage: 'en', pictureCode: ['lion', 'sun', 'car'], consent: true });
  await parent.call('POST', '/api/junior/devices', {});
  const kid = new Browser();
  kid.jar.set('ml_device', parent.jar.get('ml_device') as string);
  await kid.call('POST', '/api/junior/login', { childId: child.id, code: ['lion', 'sun', 'car'] });
  return { parent, kid, childId: child.id as string, parentEmail: `parent${n}@example.com` };
}

const secretOf = (questionId: string) => JSON.parse((db.prepare('SELECT secret FROM question_instances WHERE id = ?').get(questionId) as { secret: string }).secret);
async function rightAnswer(questionId: string) {
  const { canonicalResponse } = await import('../shared/questions/answer.ts');
  return canonicalResponse(secretOf(questionId).answer);
}
const wrongAnswer = (questionId: string) => String(secretOf(questionId).answer.value + 1);

test('try one like it: after a wrong first try, the same kind of question at the same level, on top of the five', async () => {
  const { kid } = await familyWithChild(1);
  const act = await kid.call('POST', '/api/activities', { kind: 'practice', skillId: 'fp-add-sub-g1', count: 5 });

  // Nothing to retry before anything has been answered, or after a right answer.
  const q1 = await kid.call('POST', `/api/activities/${act.id}/next`, {});
  await kid.call('POST', `/api/activities/${act.id}/next`, { retry: true }, 409);
  await kid.call('POST', `/api/questions/${q1.question.id}/answer`, { response: await rightAnswer(q1.question.id), timeMs: 3000 });
  await kid.call('POST', `/api/activities/${act.id}/next`, { retry: true }, 409);

  // Wrong, then a second try: same skill and level, new question, flagged, and the set grows by one.
  const q2 = await kid.call('POST', `/api/activities/${act.id}/next`, {});
  const miss = await kid.call('POST', `/api/questions/${q2.question.id}/answer`, { response: wrongAnswer(q2.question.id), timeMs: 3000 });
  assert.equal(miss.feedback.correct, false);
  const r2 = await kid.call('POST', `/api/activities/${act.id}/next`, { retry: true });
  assert.equal(r2.question.retry, true);
  assert.equal(r2.question.skillId, q2.question.skillId);
  assert.equal(r2.question.difficulty, q2.question.difficulty);
  assert.notEqual(r2.question.id, q2.question.id);
  let st = await kid.call('GET', `/api/activities/${act.id}`);
  assert.equal(st.activity.targetCount, 6);

  // A second try counts like an answer with one hint: less credit than a clean first try.
  const ok = await kid.call('POST', `/api/questions/${r2.question.id}/answer`, { response: await rightAnswer(r2.question.id), timeMs: 3000 });
  assert.equal(ok.feedback.correct, true);
  const score = (db.prepare('SELECT score FROM responses WHERE question_id = ?').get(r2.question.id) as { score: number }).score;
  assert.ok(score < 1 && score > 0, `retry score ${score}`);
  // No retry of a retry.
  await kid.call('POST', `/api/activities/${act.id}/next`, { retry: true }, 409);

  // At most three second tries in one set.
  for (let i = 0; i < 3; i++) {
    const q = await kid.call('POST', `/api/activities/${act.id}/next`, {});
    await kid.call('POST', `/api/questions/${q.question.id}/answer`, { response: wrongAnswer(q.question.id), timeMs: 3000 });
    if (i < 2) {
      const r = await kid.call('POST', `/api/activities/${act.id}/next`, { retry: true });
      await kid.call('POST', `/api/questions/${r.question.id}/answer`, { response: wrongAnswer(r.question.id), timeMs: 3000 });
    } else await kid.call('POST', `/api/activities/${act.id}/next`, { retry: true }, 409);
  }
  st = await kid.call('GET', `/api/activities/${act.id}`);
  assert.equal(st.items.filter((i: any) => !i.question.retry).length, 5, 'still five first tries');
  assert.equal(st.items.filter((i: any) => i.question.retry).length, 3);
  assert.equal(st.answered, st.activity.targetCount, 'the set is complete');
  await kid.call('POST', `/api/activities/${act.id}/next`, {}, 409);
});

test('first-try numbers for adults leave second tries out', async () => {
  const { kid, parent, childId } = await familyWithChild(1, 'Sipho');
  const act = await kid.call('POST', '/api/activities', { kind: 'practice', skillId: 'fp-add-sub-g1', count: 5 });
  const q = await kid.call('POST', `/api/activities/${act.id}/next`, {});
  await kid.call('POST', `/api/questions/${q.question.id}/answer`, { response: wrongAnswer(q.question.id), timeMs: 3000 });
  const r = await kid.call('POST', `/api/activities/${act.id}/next`, { retry: true });
  await kid.call('POST', `/api/questions/${r.question.id}/answer`, { response: await rightAnswer(r.question.id), timeMs: 3000 });
  const ov = await parent.call('GET', `/api/children/${childId}/overview`);
  assert.equal(ov.week.answers, 1, 'one first try: the second try is not counted');
  assert.equal(ov.week.firstTryPct, 0);
});

test('"I can…": earned once when a skill becomes secure, listed for the child and their grown-ups', async () => {
  const { kid, parent, childId } = await familyWithChild(1, 'Ayanda');
  const earned: { skillId: string; text: string; spoken: string }[] = [];
  // Before anything is learnt: an empty list, not an error.
  assert.deepEqual(await kid.call('GET', '/api/junior/ican'), []);
  for (let set = 0; set < 8 && !earned.length; set++) {
    const act = await kid.call('POST', '/api/activities', { kind: 'practice', skillId: 'fp-add-sub-g1', count: 5 });
    for (let i = 0; i < 5; i++) {
      const q = await kid.call('POST', `/api/activities/${act.id}/next`, {});
      const r = await kid.call('POST', `/api/questions/${q.question.id}/answer`, { response: await rightAnswer(q.question.id), timeMs: 4000 });
      if (r.ican) earned.push(r.ican);
    }
  }
  assert.equal(earned.length, 1, 'earned exactly once, however many right answers follow');
  assert.equal(earned[0]!.skillId, 'fp-add-sub-g1');
  assert.match(earned[0]!.text, /^I can add and take away/);
  assert.match(earned[0]!.spoken, /^You can .* now!$/);

  // Keep going: no second announcement for the same skill.
  const act = await kid.call('POST', '/api/activities', { kind: 'practice', skillId: 'fp-add-sub-g1', count: 5 });
  for (let i = 0; i < 5; i++) {
    const q = await kid.call('POST', `/api/activities/${act.id}/next`, {});
    const r = await kid.call('POST', `/api/questions/${q.question.id}/answer`, { response: await rightAnswer(q.question.id), timeMs: 4000 });
    assert.equal(r.ican, undefined);
  }

  const mine = await kid.call('GET', '/api/junior/ican');
  assert.equal(mine.length, 1);
  assert.equal(mine[0].subjectId, 'mathematics');
  const ov = await parent.call('GET', `/api/children/${childId}/overview`);
  assert.deepEqual(ov.ican.map((i: any) => i.text), [earned[0]!.text]);

  // The weekly report says it in the child's words.
  const pdf = await parent.call('GET', `/api/reports/learner/${childId}`);
  assert.match(String(pdf), /New things Ayanda can do/);

  // Grown-ups don't have an "I can" list of their own.
  await parent.call('GET', '/api/junior/ican', undefined, 403);
});

test('Grade 3 → Grade 4: a parent gives the child their own login; learning is kept, pictures stop', async () => {
  // Only Grade 3 children move up.
  const young = await familyWithChild(1, 'Nomsa');
  await young.parent.call('POST', `/api/children/${young.childId}/move-up`, { email: 'nomsa.kid@example.com', password: 'Green-Kite-Field-7', consent: true }, 422);

  const { parent, kid, childId, parentEmail } = await familyWithChild(3, 'Thabo');
  // Some learning to keep, including one "I can…".
  for (let set = 0; set < 4; set++) {
    const act = await kid.call('POST', '/api/activities', { kind: 'practice', skillId: 'fp-add-sub-g3', count: 5 });
    for (let i = 0; i < 5; i++) {
      const q = await kid.call('POST', `/api/activities/${act.id}/next`, {});
      await kid.call('POST', `/api/questions/${q.question.id}/answer`, { response: await rightAnswer(q.question.id), timeMs: 4000 });
    }
  }
  const icanBefore = (await kid.call('GET', '/api/junior/ican')).length;
  assert.ok(icanBefore >= 1);

  // The rules: consent, a real password, an email nobody uses.
  await parent.call('POST', `/api/children/${childId}/move-up`, { email: 'thabo.m@example.com', password: 'Green-Kite-Field-7' }, 422);
  await parent.call('POST', `/api/children/${childId}/move-up`, { email: 'thabo.m@example.com', password: 'short', consent: true }, 422);
  await parent.call('POST', `/api/children/${childId}/move-up`, { email: 'thabo.m@example.com', password: 'Thabo-Kite-Field-7', consent: true }, 422);
  await parent.call('POST', `/api/children/${childId}/move-up`, { email: parentEmail, password: 'Green-Kite-Field-7', consent: true }, 409);

  const mailsBefore = outbox.length;
  const r = await parent.call('POST', `/api/children/${childId}/move-up`, { email: 'Thabo.M@example.com', password: 'Green-Kite-Field-7', consent: true });
  assert.equal(r.email, 'thabo.m@example.com');
  assert.equal(outbox.length, mailsBefore, 'the parent did this themselves: no email about it');

  // The picture session ended, the device no longer lists them, and pictures no longer work.
  assert.equal((await kid.call('GET', '/api/me')).user, null);
  const dev = await kid.call('GET', '/api/junior/device');
  assert.ok(!dev.children.some((c: any) => c.id === childId));
  await kid.call('POST', '/api/junior/login', { childId, code: ['lion', 'sun', 'car'] }, 404);
  // The parent can't move them up twice or manage them as a picture child any more.
  await parent.call('POST', `/api/children/${childId}/move-up`, { email: 'other@example.com', password: 'Green-Kite-Field-7', consent: true }, 404);

  // The family page shows where they went; the report still works.
  const fam = await parent.call('GET', '/api/family');
  const row = fam.children.find((c: any) => c.id === childId);
  assert.equal(row.movedUp.email, 'thabo.m@example.com');
  assert.equal(row.grade, 4);
  await parent.call('GET', `/api/reports/learner/${childId}`);

  // Thabo logs in with email, confirms the address, and lands in the full app's welcome.
  const thabo = new Browser();
  const login = await thabo.call('POST', '/api/auth/login', { email: 'thabo.m@example.com', password: 'Green-Kite-Field-7' });
  assert.equal(login.user.emailVerified, false);
  assert.equal(login.user.movedUp, true);
  assert.equal(login.user.junior, undefined);
  assert.equal(login.profile, null, 'no profile: onboarding asks grade and subjects');
  const code = [...outbox].reverse().find((m) => m.to === 'thabo.m@example.com')?.subject.match(/\b(\d{6})\b/)?.[1];
  const before = outbox.length;
  await thabo.call('POST', '/api/auth/verify', { code });
  assert.equal(outbox.length, before, 'no "created an account" notice to the guardian for a moved-up child');
  await thabo.call('PUT', '/api/profile', { grade: 4, curriculumId: 'za-caps', subjects: ['mathematics'], goals: ['pure-maths'], dailyMinutes: 20 });
  const meNow = await thabo.call('GET', '/api/me');
  assert.equal(meNow.profile.grade, 4);
  assert.equal(meNow.profile.baselineCompleted, false, 'the starting-point check comes next');
  await thabo.call('GET', '/api/junior/home', undefined, 403);

  // Nothing learnt was lost.
  const kept = db.prepare("SELECT COUNT(*) AS n FROM responses WHERE user_id = ?").get(childId) as { n: number };
  assert.equal(kept.n, 20);
  const icans = db.prepare('SELECT COUNT(*) AS n FROM junior_ican WHERE child_id = ?').get(childId) as { n: number };
  assert.equal(icans.n, icanBefore);
});

test('Grade 3 → Grade 4 by a teacher: the child leaves the Foundation Phase class and the guardian is told', async () => {
  const teacher = new Browser();
  await teacher.signup({ accountType: 'teacher', displayName: 'Mr Dlamini', email: 'dlamini@school.example', school: 'Hillside Primary', accessCode: 'TEACH-2026' });
  const cls = await teacher.call('POST', '/api/teach/classes', { name: 'Grade 3A', grade: 3, subjectId: 'all' });
  const { child } = await teacher.call('POST', `/api/teach/classes/${cls.id}/children`, { name: 'Zanele', grade: 3, homeLanguage: 'zu', guardianEmail: 'zanele.gran@example.com', consent: true });
  // The guardian's address is for reports, not the child's login.
  await teacher.call('POST', `/api/children/${child.id}/move-up`, { email: 'zanele.gran@example.com', password: 'Green-Kite-Field-7', consent: true }, 422);
  await teacher.call('POST', `/api/children/${child.id}/move-up`, { email: 'zanele.k@example.com', password: 'Green-Kite-Field-7', consent: true });
  const notice = outbox.find((m) => m.to === 'zanele.gran@example.com');
  assert.ok(notice, 'the guardian hears about it');
  assert.match(notice!.subject, /Zanele moved up to Grade 4/);
  assert.match(notice!.text, /zanele\.k@example\.com/);
  const detail = await teacher.call('GET', `/api/teach/classes/${cls.id}`);
  assert.equal(detail.learners.length, 0);
  // The teacher no longer sees them: their Grade 4 teacher adds them with a class code.
  await teacher.call('GET', `/api/children/${child.id}/overview`, undefined, 404);
});
