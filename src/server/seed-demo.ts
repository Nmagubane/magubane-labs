/**
 * Creates a demo learner with 30 days of realistic history by running a simulated student
 * through the real engine (same activities, generators, grading and mastery updates as a person).
 * Nothing is inserted directly, so the dashboards show exactly what the product would compute.
 *
 *   npm run seed:demo           → demo@magubane.local / learn-maths-daily
 */
import { randomInt } from 'node:crypto';
import { config, setClock } from './config.ts';
import { openDb, one, run } from './db.ts';
import { createUser } from './auth.ts';
import { saveProfile } from './learner.ts';
import { createActivity, nextQuestion, answerQuestion, submitActivity, getActivityState } from './activities.ts';
import { createExam } from './insights.ts';
import { canonicalResponse, type ResponseValue } from '../shared/questions/answer.ts';
import type { AnswerSpec, Difficulty } from '../shared/questions/types.ts';
import { pCorrect } from '../shared/mastery/model.ts';
import type { UserDto } from '../shared/api.ts';

const EMAIL = 'demo@magubane.local';
const PASSWORD = 'learn-maths-daily';

const db = openDb(config.databasePath);
const existing = one<{ id: string }>(db, 'SELECT id FROM users WHERE email = ?', EMAIL);
if (existing) {
  run(db, 'DELETE FROM users WHERE id = ?', existing.id);
  for (const t of ['responses', 'question_instances', 'mastery_snapshots', 'lesson_progress']) run(db, `DELETE FROM ${t} WHERE user_id = ?`, existing.id);
}

const today = new Date();
const dayAt = (daysAgo: number, hour: number, minute = 0) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo, hour, minute);

setClock(dayAt(30, 16));
const user: UserDto = createUser(db, { email: EMAIL, password: PASSWORD, displayName: 'Lerato Dlamini' });
saveProfile(db, user.id, { grade: 10, curriculumId: 'za-caps', subjects: ['mathematics', 'physical-sciences'], goals: ['pure-maths', 'pass-exams', 'stem-career'], dailyMinutes: 30 });

/** Lerato's true ability per skill on a given day: strong at number work, weaker at factorising, improving with practice. */
const BASE: Record<string, number> = {
  integers: 1.9,
  'order-of-operations': 1.4,
  'fraction-simplify': 1.6,
  'fraction-add': 0.9,
  'fraction-multiply': 0.6,
  'like-terms': 1.5,
  'expand-brackets': 0.7,
  'factorise-trinomial': -0.6,
  'linear-equations': 1.1,
  'quadratic-equations': -0.9,
  gradient: 0.4,
  'straight-line': -0.2,
  'speed-distance-time': 1.2,
  'ohms-law': 0.3,
  'atomic-structure': 0.9,
  moles: -0.5,
  'balancing-equations': 0.1,
};
const practised = new Map<string, number>();
function ability(skillId: string): number {
  return (BASE[skillId] ?? 0) + 0.12 * (practised.get(skillId) ?? 0);
}

function wrongResponse(answer: AnswerSpec, misconceptions: { answer: AnswerSpec }[]): ResponseValue {
  if (misconceptions.length && Math.random() < 0.7) return canonicalResponse(misconceptions[randomInt(0, misconceptions.length)]!.answer);
  switch (answer.kind) {
    case 'numeric':
      return String(Math.round((answer.value + (randomInt(0, 2) ? 1 : -1) * Math.max(1, Math.abs(answer.value) * 0.3)) * 100) / 100);
    case 'fraction':
      return `${answer.n + 1}/${answer.d}`;
    case 'expression':
      return `${answer.expr}+1`;
    case 'roots':
      return answer.values.map((v) => String(v.n / v.d + 1));
    case 'coefficients':
      return answer.values.map((v) => String(v + 1));
    case 'choice':
      return 'wrong';
  }
}

function secretOf(questionId: string) {
  return JSON.parse((one<{ secret: string }>(db, 'SELECT secret FROM question_instances WHERE id = ?', questionId) as { secret: string }).secret) as { answer: AnswerSpec; misconceptions: { answer: AnswerSpec }[] };
}

function respond(questionId: string, skillId: string, level: Difficulty): ResponseValue {
  const s = secretOf(questionId);
  const right = Math.random() < pCorrect(ability(skillId), level);
  return right ? canonicalResponse(s.answer) : wrongResponse(s.answer, s.misconceptions);
}

let clockMinute = 0;
function tick(seconds: number) {
  clockMinute += seconds;
}
function setTime(daysAgo: number, hour: number) {
  clockMinute = 0;
  const base = dayAt(daysAgo, hour);
  setClock(base);
  return base;
}
function advance(base: Date, seconds: number) {
  tick(seconds);
  setClock(new Date(base.getTime() + clockMinute * 1000));
}

function lesson(daysAgo: number, skillId: string) {
  const base = setTime(daysAgo, 17);
  const a = createActivity(db, user, { kind: 'lesson', skillId });
  for (const level of [2, 3] as Difficulty[]) {
    advance(base, 180);
    const item = nextQuestion(db, user, a.id, { level });
    advance(base, 50);
    answerQuestion(db, user, item.question.id, { response: respond(item.question.id, skillId, level), timeMs: 50_000 });
  }
  advance(base, 120);
  submitActivity(db, user, a.id);
}

function practice(daysAgo: number, hour: number, skillId: string | null, count = 8) {
  const base = setTime(daysAgo, hour);
  const a = createActivity(db, user, skillId ? { kind: 'practice', skillId, count } : { kind: 'practice', weak: true, count });
  for (let i = 0; i < count; i++) {
    const item = nextQuestion(db, user, a.id, {});
    const t = randomInt(25, 95);
    advance(base, t);
    const sid = item.question.skillId;
    try {
      answerQuestion(db, user, item.question.id, { response: respond(item.question.id, sid, item.question.difficulty), timeMs: t * 1000 });
    } catch {
      answerQuestion(db, user, item.question.id, { response: canonicalResponse(secretOf(item.question.id).answer), timeMs: t * 1000 });
    }
    practised.set(sid, (practised.get(sid) ?? 0) + 1);
  }
  submitActivity(db, user, a.id);
}

function assessment(daysAgo: number, hour: number, req: Parameters<typeof createActivity>[2]) {
  const base = setTime(daysAgo, hour);
  const a = createActivity(db, user, req);
  const state = getActivityState(db, user, a.id);
  for (const item of state.items) {
    const t = randomInt(30, 110);
    advance(base, t);
    const sid = item.question.skillId;
    const skip = req.kind === 'baseline' && ability(sid) < -0.5 && Math.random() < 0.5;
    const resp = respond(item.question.id, sid, item.question.difficulty);
    const conf = Math.random() < 0.6 ? (Math.random() < 0.6 ? 'sure' : 'unsure') : undefined;
    try {
      answerQuestion(db, user, item.question.id, skip ? { response: null, skipped: true, timeMs: t * 1000 } : { response: resp, timeMs: t * 1000, ...(conf ? { confidence: conf } : {}) });
    } catch {
      // unreadable simulated response: leave unanswered, as a real learner might
    }
  }
  advance(base, 20);
  submitActivity(db, user, a.id);
}

// ---- The month ----
assessment(30, 16, { kind: 'baseline' });
const schedule: [number, () => void][] = [
  [29, () => lesson(29, 'fraction-add')],
  [29, () => practice(29, 18, 'fraction-add')],
  [28, () => practice(28, 17, null)],
  [27, () => lesson(27, 'expand-brackets')],
  [27, () => practice(27, 18, 'expand-brackets')],
  [25, () => practice(25, 16, 'linear-equations')],
  [24, () => lesson(24, 'factorise-trinomial')],
  [24, () => practice(24, 18, 'factorise-trinomial')],
  [23, () => practice(23, 17, 'factorise-trinomial')],
  [22, () => assessment(22, 15, { kind: 'test', topicId: 'algebra', count: 10, timed: true })],
  [21, () => practice(21, 17, 'factorise-trinomial')],
  [20, () => lesson(20, 'gradient')],
  [20, () => practice(20, 18, 'gradient')],
  [18, () => practice(18, 17, null)],
  [17, () => lesson(17, 'speed-distance-time')],
  [17, () => practice(17, 18, 'speed-distance-time')],
  [16, () => lesson(16, 'ohms-law')],
  [15, () => practice(15, 17, 'ohms-law')],
  [14, () => assessment(14, 15, { kind: 'test', count: 10, timed: true })],
  [13, () => practice(13, 17, 'factorise-trinomial')],
  [12, () => lesson(12, 'quadratic-equations')],
  [11, () => practice(11, 18, 'quadratic-equations')],
  [10, () => practice(10, 17, 'expand-brackets')],
  [9, () => lesson(9, 'moles')],
  [8, () => practice(8, 17, 'moles')],
  [7, () => practice(7, 17, null)],
  [6, () => assessment(6, 15, { kind: 'test', topicId: 'equations', count: 8, timed: true })],
  [5, () => practice(5, 17, 'quadratic-equations')],
  [4, () => practice(4, 18, 'gradient')],
  [3, () => lesson(3, 'straight-line')],
  [2, () => practice(2, 17, 'straight-line')],
  [1, () => practice(1, 17, 'quadratic-equations', 5)],
];
for (const [, fn] of schedule) fn();

setClock(dayAt(1, 19));
const examDate = dayAt(-18, 9);
createExam(db, user, {
  title: 'Term 4 Mathematics exam',
  subjectId: 'mathematics',
  examDate: `${examDate.getFullYear()}-${String(examDate.getMonth() + 1).padStart(2, '0')}-${String(examDate.getDate()).padStart(2, '0')}`,
  skillIds: ['expand-brackets', 'factorise-trinomial', 'linear-equations', 'quadratic-equations', 'gradient', 'straight-line', 'fraction-add', 'like-terms'],
});

setClock(null);
console.log(`Demo learner ready: ${EMAIL} / ${PASSWORD}  (database: ${config.databasePath})`);
db.close();
