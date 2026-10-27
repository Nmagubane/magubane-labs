/**
 * End-to-end over HTTP for Junior (Grades 1–3): a parent creates a child, sets up a device, the child signs in
 * with pictures and plays; a teacher does the same for a class. Plus the safety rules: no device, no names;
 * wrong codes lock; children never reach the tutor; other adults never see someone else's child.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

let app: Server;
let base = '';
let db: import('./db.ts').Db;
const outbox: { to: string; subject: string }[] = [];

before(async () => {
  process.env.SIGNUP_RATE_PER_HOUR = '1000';
  process.env.EDUCATOR_CODES = 'TEACH-2026';
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
  const { openDb } = await import('./db.ts');
  const { createApp } = await import('./app.ts');
  const { setTransport } = await import('./mailer.ts');
  setTransport(async (m) => {
    outbox.push({ to: m.to.email, subject: m.subject });
    return { status: 'sent' };
  });
  db = openDb(':memory:');
  app = createApp(db);
  await new Promise<void>((r) => app.listen(0, r));
  base = `http://127.0.0.1:${(app.address() as AddressInfo).port}`;
});
after(() => app.close());

/** A browser: keeps every cookie by name (session and device). */
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

test('a parent creates a child, sets up a device, and the child plays with picture sign-in', async () => {
  const parent = new Browser();
  const me = await parent.signup({ accountType: 'parent', displayName: 'Nomvula Dube', email: 'nomvula@example.com' });
  assert.equal(me.user.role, 'parent');
  assert.equal(me.profile, null);

  // Parents can't use learner endpoints.
  await parent.call('GET', '/api/home', undefined, 403);

  const created = await parent.call('POST', '/api/family/children', { name: 'Thandi', grade: 1, homeLanguage: 'zu', pictureCode: ['lion', 'sun', 'car'], consent: true });
  assert.equal(created.child.name, 'Thandi');
  assert.deepEqual(created.pictureCode, ['lion', 'sun', 'car']);
  const childId = created.child.id as string;

  // A child with an isiZulu home language: instructions fall back to English, English FAL is added,
  // and Home Language reading is not offered until a reviewed isiZulu reading pack exists.
  const ov = await parent.call('GET', `/api/children/${childId}/overview`);
  assert.equal(ov.child.homeLanguage, 'zu');
  assert.equal(ov.child.instructionLanguage, 'en');
  assert.equal(ov.child.readingAvailable, false);
  assert.deepEqual(ov.subjects.map((s: { id: string }) => s.id), ['mathematics', 'english-fal', 'life-skills']);
  assert.deepEqual(ov.child.pictureCode, ['lion', 'sun', 'car']);

  // A different browser with no device set up sees no names at all.
  const stranger = new Browser();
  assert.deepEqual(await stranger.call('GET', '/api/junior/device'), { set: false });
  await stranger.call('POST', '/api/junior/login', { childId, code: ['lion', 'sun', 'car'] }, 403);

  // The parent sets up this browser for the children.
  await parent.call('POST', '/api/junior/devices', {});
  const dev = await parent.call('GET', '/api/junior/device');
  assert.equal(dev.set, true);
  assert.deepEqual(dev.children.map((c: { name: string }) => c.name), ['Thandi']);

  // The child signs in on that device (the parent logs out first, as on a shared tablet).
  await parent.call('POST', '/api/auth/logout');
  const wrong = await parent.call('POST', '/api/junior/login', { childId, code: ['sun', 'lion', 'car'] }, 401);
  assert.equal(wrong.error.code, 'wrong_code');
  const signedIn = await parent.call('POST', '/api/junior/login', { childId, code: ['lion', 'sun', 'car'] });
  assert.equal(signedIn.user.junior, true);
  assert.equal(signedIn.user.email, '', 'a child account never exposes its placeholder address');
  assert.equal(signedIn.profile.grade, 1);
  assert.equal(signedIn.profile.homeLanguage, 'zu');

  const home = await parent.call('GET', '/api/junior/home');
  assert.equal(home.name, 'Thandi');
  assert.deepEqual(home.worlds.map((w: { subjectId: string }) => w.subjectId), ['mathematics', 'english-fal', 'life-skills']);
  assert.equal(home.worlds[0].next.reason, 'new');
  assert.equal(home.worlds[0].next.skillId, 'fp-count-objects-g1');

  // Play a short session: the server grades, the child sees feedback, mastery moves.
  const act = await parent.call('POST', '/api/activities', { kind: 'practice', skillId: home.worlds[0].next.skillId, count: 5 });
  let firstTry = 0;
  for (let i = 0; i < 5; i++) {
    const item = await parent.call('POST', `/api/activities/${act.id}/next`, {});
    assert.ok(item.question.say, 'junior questions carry a spoken prompt');
    assert.ok(!('answer' in item.question), 'no answer before responding');
    const secret = JSON.parse((db.prepare('SELECT secret FROM question_instances WHERE id = ?').get(item.question.id) as { secret: string }).secret);
    const { canonicalResponse } = await import('../shared/questions/answer.ts');
    const res = await parent.call('POST', `/api/questions/${item.question.id}/answer`, { response: canonicalResponse(secret.answer), timeMs: 4000 });
    if (res.feedback.correct) firstTry++;
  }
  assert.equal(firstTry, 5);
  // The player closes the set when it's done, so reports count it.
  await parent.call('POST', `/api/activities/${act.id}/submit`);
  assert.equal((db.prepare('SELECT status FROM activities WHERE id = ?').get(act.id) as { status: string }).status, 'completed');
  const after = await parent.call('GET', '/api/junior/home');
  assert.ok(after.worlds[0].next.mastery > 0 || after.worlds[0].next.skillId !== 'fp-count-objects-g1');

  // Children never reach the AI tutor.
  await parent.call('GET', '/api/tutor/status', undefined, 403);
  await parent.call('POST', '/api/tutor/conversations', {}, 403);

  // Watch first: a worked example for the child's skill, with the answer to fill in.
  const ex = await parent.call('GET', `/api/skills/fp-count-objects-g1/example?level=2`);
  assert.ok(ex.say && ex.input && ex.answer !== undefined);

  // The parent can download the child's PDF progress report.
  await parent.call('POST', '/api/auth/logout');
  await parent.call('POST', '/api/auth/login', { email: 'nomvula@example.com', password: 'Long-Pass-Phrase-42!' });
  const pdf = await fetch(`${base}/api/reports/learner/${childId}`, { headers: { cookie: [...parent.jar].map(([k, v]) => `${k}=${v}`).join('; ') } });
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get('content-type'), 'application/pdf');
  assert.ok((await pdf.arrayBuffer()).byteLength > 1000);
  await parent.call('POST', '/api/auth/logout');
  await parent.call('POST', '/api/junior/login', { childId, code: ['lion', 'sun', 'car'] });

  // The child cannot manage themselves or see family data.
  await parent.call('GET', '/api/family', undefined, 403);
  await parent.call('POST', `/api/children/${childId}/code`, {}, 403);
});

test('five wrong picture codes lock the child for a while', async () => {
  const parent = new Browser();
  await parent.signup({ accountType: 'parent', displayName: 'Pieter Botha', email: 'pieter@example.com' });
  const { child } = await parent.call('POST', '/api/family/children', { name: 'Ruan', grade: 2, homeLanguage: 'af', pictureCode: ['tree', 'moon', 'star'], consent: true });
  await parent.call('POST', '/api/junior/devices', {});
  await parent.call('POST', '/api/auth/logout');
  for (let i = 0; i < 5; i++) await parent.call('POST', '/api/junior/login', { childId: child.id, code: ['apple', 'apple', 'apple'] }, 401);
  await parent.call('POST', '/api/junior/login', { childId: child.id, code: ['tree', 'moon', 'star'] }, 423);
  const dev = await parent.call('GET', '/api/junior/device');
  assert.equal(dev.children[0].locked, true);
});

test('a teacher adds children to a Grade 2 class, prints login cards, and sees progress; other adults cannot', async () => {
  const teacher = new Browser();
  await teacher.signup({ accountType: 'teacher', displayName: 'Mrs Naidoo', email: 'naidoo@school.example', school: 'Sunrise Primary', accessCode: 'TEACH-2026' });
  const cls = await teacher.call('POST', '/api/teach/classes', { name: 'Grade 2B', grade: 2, subjectId: 'all' });
  assert.equal(cls.subjectName, 'All subjects');
  // "All subjects" only makes sense for Grades 1–3.
  await teacher.call('POST', '/api/teach/classes', { name: 'Grade 7A', grade: 7, subjectId: 'all' }, 422);

  const a = await teacher.call('POST', `/api/teach/classes/${cls.id}/children`, { name: 'Sipho', grade: 2, homeLanguage: 'en', consent: true });
  const b = await teacher.call('POST', `/api/teach/classes/${cls.id}/children`, { name: 'Lerato', grade: 2, homeLanguage: 'st', guardianEmail: 'lerato.mum@example.com', consent: true });
  assert.equal(a.pictureCode.length, 3);
  assert.equal(new Set(a.pictureCode).size, 3, 'random codes use three different pictures');

  const cards = await teacher.call('GET', `/api/teach/classes/${cls.id}/login-cards`);
  assert.deepEqual(cards.children.map((c: { name: string }) => c.name), ['Lerato', 'Sipho']);
  assert.deepEqual(cards.children.find((c: { name: string }) => c.name === 'Sipho').pictureCode, a.pictureCode);

  const detail = await teacher.call('GET', `/api/teach/classes/${cls.id}`);
  assert.equal(detail.learners.length, 2);
  assert.ok(detail.skills.length >= 35 && detail.skills.every((s: { grade: number }) => s.grade === 2), 'a Grade 2 class tracks the Grade 2 Foundation Phase skills');

  // Sipho (English home language) gets Home Language reading; Lerato (Sesotho) gets English FAL until a Sesotho pack exists.
  const ovA = await teacher.call('GET', `/api/children/${a.child.id}/overview`);
  assert.deepEqual(ovA.subjects.map((s: { id: string }) => s.id), ['mathematics', 'home-language', 'life-skills']);
  const ovB = await teacher.call('GET', `/api/children/${b.child.id}/overview`);
  assert.equal(ovB.child.guardianEmail, 'lerato.mum@example.com');

  // Class device: only this class's children appear.
  await teacher.call('POST', '/api/junior/devices', { classId: cls.id });
  const dev = await teacher.call('GET', '/api/junior/device');
  assert.deepEqual(dev.children.map((c: { name: string }) => c.name).sort(), ['Lerato', 'Sipho']);

  // An adult log for a Move & Make card.
  await teacher.call('POST', `/api/children/${a.child.id}/cards`, { cardId: 'clap-patterns' });
  const ov2 = await teacher.call('GET', `/api/children/${a.child.id}/overview`);
  assert.equal(ov2.cardsDone[0].title, 'Clap, stomp, pattern');

  // Another parent cannot see or manage these children.
  const other = new Browser();
  await other.signup({ accountType: 'parent', displayName: 'Someone Else', email: 'else@example.com' });
  await other.call('GET', `/api/children/${a.child.id}/overview`, undefined, 404);
  await other.call('PATCH', `/api/children/${a.child.id}`, { grade: 3 }, 404);
  await other.call('POST', `/api/children/${a.child.id}/delete`, { confirmName: 'Sipho' }, 404);

  // A senior class cannot take picture-login children.
  const senior = await teacher.call('POST', '/api/teach/classes', { name: 'Grade 5A', grade: 5, subjectId: 'mathematics' });
  await teacher.call('POST', `/api/teach/classes/${senior.id}/children`, { name: 'Musa', grade: 3, homeLanguage: 'en', consent: true }, 422);

  // The teacher who created a child can delete them, after typing the name.
  await teacher.call('POST', `/api/children/${a.child.id}/delete`, { confirmName: 'sipo' }, 422);
  await teacher.call('POST', `/api/children/${a.child.id}/delete`, { confirmName: 'sipho' });
  const after = await teacher.call('GET', `/api/teach/classes/${cls.id}`);
  assert.equal(after.learners.length, 1);

  // A teacher deleting their account takes the children they added with it: nobody else could manage them.
  await teacher.call('POST', '/api/account/delete', { password: 'Long-Pass-Phrase-42!' });
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM users WHERE id = ?').get(b.child.id) as { n: number }).n, 0);
});

test('children have no real email address and are never mailed', async () => {
  const { sendMail } = await import('./mailer.ts');
  const r = await sendMail({ to: { email: 'usr_abc@child.invalid' }, subject: 'x', text: 'x', html: 'x' });
  assert.equal(r.status, 'failed');
  assert.ok(!outbox.some((m) => m.to.endsWith('.invalid')));
});

test('a parent changes grade and language, resets the picture code, and deleting the parent deletes their children', async () => {
  const parent = new Browser();
  await parent.signup({ accountType: 'parent', displayName: 'Ayesha Khan', email: 'ayesha@example.com' });
  const { child } = await parent.call('POST', '/api/family/children', { name: 'Zaid', grade: 1, homeLanguage: 'en', consent: true });
  const upd = await parent.call('PATCH', `/api/children/${child.id}`, { grade: 2, homeLanguage: 'xh' });
  assert.equal(upd.grade, 2);
  assert.equal(upd.homeLanguage, 'xh');
  const { pictureCode } = await parent.call('POST', `/api/children/${child.id}/code`, { code: ['ball', 'bicycle', 'giraffe'] });
  assert.deepEqual(pictureCode, ['ball', 'bicycle', 'giraffe']);
  const fam = await parent.call('GET', '/api/family');
  assert.equal(fam.children.length, 1);
  await parent.call('POST', '/api/account/delete', { password: 'Long-Pass-Phrase-42!' });
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users WHERE id = ?').get(child.id)!.n, 0, 'the child and their data go with the parent account');
});
