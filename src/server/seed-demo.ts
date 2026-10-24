/**
 * Demo data built by running simulated learners through the real engine (same activities, generators,
 * grading and mastery updates as a person). Nothing is inserted directly, so every dashboard and report
 * shows exactly what the product would compute.
 *
 *   npm run seed:demo
 *     learner:  demo@magubane.local     / Learn-maths-daily-1
 *     teacher:  teacher@magubane.local  / Teach-maths-2026!
 */
import { randomInt } from 'node:crypto';
import { config, setClock } from './config.ts';
import { openDb, one, run, all, newId } from './db.ts';
import { createUser, deleteUser } from './auth.ts';
import { saveProfile } from './learner.ts';
import { createActivity, nextQuestion, answerQuestion, submitActivity, getActivityState } from './activities.ts';
import { createExam } from './insights.ts';
import { canonicalResponse, type ResponseValue } from '../shared/questions/answer.ts';
import type { AnswerSpec, Difficulty } from '../shared/questions/types.ts';
import { pCorrect } from '../shared/mastery/model.ts';
import type { UserDto } from '../shared/api.ts';
import type { SubjectId } from '../shared/curriculum/catalogue.ts';

const LEARNER = { email: 'demo@magubane.local', password: 'Learn-maths-daily-1' };
const TEACHER = { email: 'teacher@magubane.local', password: 'Teach-maths-2026!' };

const db = openDb(config.databasePath);

// Remove earlier demo data (all demo accounts use @magubane.local addresses).
for (const u of all<{ id: string }>(db, "SELECT id FROM users WHERE email LIKE '%@magubane.local'")) deleteUser(db, u.id);

const today = new Date();
const dayAt = (daysAgo: number, hour: number, minute = 0) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo, hour, minute);
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function secretOf(questionId: string) {
  return JSON.parse((one<{ secret: string }>(db, 'SELECT secret FROM question_instances WHERE id = ?', questionId) as { secret: string }).secret) as { answer: AnswerSpec; misconceptions: { answer: AnswerSpec }[] };
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

/** One simulated learner: true ability per skill, improving a little with every question practised. */
class Sim {
  practised = new Map<string, number>();
  private clockSec = 0;
  private base = new Date();
  constructor(
    readonly user: UserDto,
    private abilities: Record<string, number>,
    private fallback = 0,
  ) {}

  ability(skillId: string): number {
    return (this.abilities[skillId] ?? this.fallback) + 0.12 * (this.practised.get(skillId) ?? 0);
  }
  private respond(questionId: string, skillId: string, level: Difficulty): ResponseValue {
    const s = secretOf(questionId);
    return Math.random() < pCorrect(this.ability(skillId), level) ? canonicalResponse(s.answer) : wrongResponse(s.answer, s.misconceptions);
  }
  private at(daysAgo: number, hour: number) {
    this.clockSec = 0;
    this.base = dayAt(daysAgo, hour, randomInt(0, 40));
    setClock(this.base);
  }
  private advance(seconds: number) {
    this.clockSec += seconds;
    setClock(new Date(this.base.getTime() + this.clockSec * 1000));
  }

  lesson(daysAgo: number, skillId: string) {
    this.at(daysAgo, 17);
    const a = createActivity(db, this.user, { kind: 'lesson', skillId });
    for (const level of [2, 3] as Difficulty[]) {
      this.advance(180);
      const item = nextQuestion(db, this.user, a.id, { level });
      this.advance(50);
      answerQuestion(db, this.user, item.question.id, { response: this.respond(item.question.id, skillId, level), timeMs: 50_000 });
    }
    this.advance(120);
    submitActivity(db, this.user, a.id);
  }

  practice(daysAgo: number, hour: number, skillId: string | null, count = 8, assignmentId?: string) {
    this.at(daysAgo, hour);
    const a = createActivity(db, this.user, skillId ? { kind: 'practice', skillId, count } : { kind: 'practice', weak: true, count }, assignmentId ? { assignmentId } : {});
    for (let i = 0; i < count; i++) {
      const item = nextQuestion(db, this.user, a.id, {});
      const t = randomInt(25, 95);
      this.advance(t);
      const sid = item.question.skillId;
      try {
        answerQuestion(db, this.user, item.question.id, { response: this.respond(item.question.id, sid, item.question.difficulty), timeMs: t * 1000 });
      } catch {
        answerQuestion(db, this.user, item.question.id, { response: canonicalResponse(secretOf(item.question.id).answer), timeMs: t * 1000 });
      }
      this.practised.set(sid, (this.practised.get(sid) ?? 0) + 1);
    }
    submitActivity(db, this.user, a.id);
  }

  assessment(daysAgo: number, hour: number, req: Parameters<typeof createActivity>[2]) {
    this.at(daysAgo, hour);
    const a = createActivity(db, this.user, req);
    const state = getActivityState(db, this.user, a.id);
    for (const item of state.items) {
      const t = randomInt(30, 110);
      this.advance(t);
      const sid = item.question.skillId;
      const skip = req.kind === 'baseline' && this.ability(sid) < -0.5 && Math.random() < 0.5;
      const conf = Math.random() < 0.6 ? (Math.random() < 0.6 ? 'sure' : 'unsure') : undefined;
      try {
        answerQuestion(db, this.user, item.question.id, skip ? { response: null, skipped: true, timeMs: t * 1000 } : { response: this.respond(item.question.id, sid, item.question.difficulty), timeMs: t * 1000, ...(conf ? { confidence: conf } : {}) });
      } catch {
        // an unreadable simulated response: leave it unanswered, as a real learner might
      }
    }
    this.advance(20);
    submitActivity(db, this.user, a.id);
  }
}

// ---------------------------------------------------------------------------
// The teacher and classes (created 35 days ago).
setClock(dayAt(35, 8));
const teacher = createUser(db, { email: TEACHER.email, password: TEACHER.password, displayName: 'Mr Sipho Khumalo', role: 'teacher', school: 'Ikusasa Secondary School', verified: true, consentVersion: '2026-10-pilot' });
function makeClass(name: string, grade: number, subjectId: SubjectId, code: string): string {
  const id = newId('cls');
  run(db, 'INSERT INTO classes (id, teacher_id, name, grade, subject_id, join_code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', id, teacher.id, name, grade, subjectId, code, dayAt(35, 8).toISOString());
  return id;
}
const maths10 = makeClass('10A Mathematics', 10, 'mathematics', 'DEMO10');
const science9 = makeClass('9B Natural Sciences', 9, 'physical-sciences', 'DEMO9B');
const join = (classId: string, u: UserDto, daysAgo: number) => run(db, 'INSERT INTO class_members (class_id, learner_id, joined_at) VALUES (?, ?, ?)', classId, u.id, dayAt(daysAgo, 9).toISOString());
function assign(classId: string, kind: 'lesson' | 'practice' | 'test', skillId: string, title: string, dueDaysAhead: number, createdDaysAgo: number, count: number | null = null): string {
  const id = newId('asg');
  run(db, 'INSERT INTO assignments (id, class_id, kind, skill_id, title, note, question_count, due_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', id, classId, kind, skillId, title, null, count, ymd(dayAt(-dueDaysAhead, 9)), dayAt(createdDaysAgo, 8).toISOString());
  return id;
}

// ---------------------------------------------------------------------------
// Lerato: the main demo learner, with a full month of history.
setClock(dayAt(30, 16));
const leratoUser = createUser(db, { email: LEARNER.email, password: LEARNER.password, displayName: 'Lerato Dlamini', verified: true, isMinor: true, guardianName: 'Thandi Dlamini', guardianEmail: 'thandi.dlamini@magubane.local', consentVersion: '2026-10-pilot' });
saveProfile(db, leratoUser.id, { grade: 10, curriculumId: 'za-caps', subjects: ['mathematics', 'physical-sciences'], goals: ['pure-maths', 'pass-exams', 'stem-career'], dailyMinutes: 30 });
join(maths10, leratoUser, 30);
const lerato = new Sim(leratoUser, {
  integers: 1.9, 'order-of-operations': 1.4, 'fraction-simplify': 1.6, 'fraction-add': 0.9, 'fraction-multiply': 0.6, 'like-terms': 1.5, 'expand-brackets': 0.7, 'factorise-trinomial': -0.6,
  'linear-equations': 1.1, 'quadratic-equations': -0.9, gradient: 0.4, 'straight-line': -0.2, 'speed-distance-time': 1.2, 'ohms-law': 0.3, 'atomic-structure': 0.9, moles: -0.5, 'balancing-equations': 0.1, 'mechanical-energy': 0.2,
});
const factoriseTask = assign(maths10, 'practice', 'factorise-trinomial', 'Practice: Factorising trinomials', -2, 9, 8);
assign(maths10, 'test', 'quadratic-equations', 'Test: Quadratic equations by factorising', 4, 2, 8);
assign(maths10, 'lesson', 'straight-line', 'Lesson: Straight-line graphs', 6, 1);

lerato.assessment(30, 16, { kind: 'baseline' });
const month: (() => void)[] = [
  () => lerato.lesson(29, 'fraction-add'), () => lerato.practice(29, 18, 'fraction-add'), () => lerato.practice(28, 17, null), () => lerato.lesson(27, 'expand-brackets'),
  () => lerato.practice(27, 18, 'expand-brackets'), () => lerato.practice(25, 16, 'linear-equations'), () => lerato.lesson(24, 'factorise-trinomial'), () => lerato.practice(24, 18, 'factorise-trinomial'),
  () => lerato.practice(23, 17, 'factorise-trinomial'), () => lerato.assessment(22, 15, { kind: 'test', topicId: 'algebra', count: 10, timed: true }), () => lerato.practice(21, 17, 'factorise-trinomial'),
  () => lerato.lesson(20, 'gradient'), () => lerato.practice(20, 18, 'gradient'), () => lerato.practice(18, 17, null), () => lerato.lesson(17, 'speed-distance-time'), () => lerato.practice(17, 18, 'speed-distance-time'),
  () => lerato.lesson(16, 'ohms-law'), () => lerato.practice(15, 17, 'ohms-law'), () => lerato.assessment(14, 15, { kind: 'test', count: 10, timed: true }), () => lerato.practice(13, 17, 'factorise-trinomial'),
  () => lerato.lesson(12, 'quadratic-equations'), () => lerato.practice(11, 18, 'quadratic-equations'), () => lerato.practice(10, 17, 'expand-brackets'), () => lerato.lesson(9, 'moles'), () => lerato.practice(8, 17, 'moles'),
  () => lerato.practice(7, 17, 'factorise-trinomial', 8, factoriseTask), () => lerato.assessment(6, 15, { kind: 'test', topicId: 'equations', count: 8, timed: true }), () => lerato.practice(5, 17, 'quadratic-equations'),
  () => lerato.lesson(4, 'mechanical-energy'), () => lerato.practice(4, 18, 'gradient'), () => lerato.lesson(3, 'straight-line'), () => lerato.practice(2, 17, 'straight-line'), () => lerato.practice(1, 17, 'quadratic-equations', 5),
];
for (const step of month) step();
setClock(dayAt(1, 19));
createExam(db, leratoUser, {
  title: 'Term 4 Mathematics exam',
  subjectId: 'mathematics',
  examDate: ymd(dayAt(-18, 9)),
  skillIds: ['expand-brackets', 'factorise-trinomial', 'linear-equations', 'quadratic-equations', 'gradient', 'straight-line', 'fraction-add', 'like-terms'],
});

// ---------------------------------------------------------------------------
// Classmates: shorter histories with different strengths, so the teacher dashboard has a real spread.
const gauss = () => Math.sqrt(-2 * Math.log(Math.random() || 1e-9)) * Math.cos(2 * Math.PI * Math.random());
interface Mate {
  name: string;
  minor: boolean;
  level: number;
  activeDays: number[];
}
function classmates(classId: string, grade: number, subjects: SubjectId[], skills: string[], mates: Mate[], taskSkill: string, taskId: string) {
  for (const [i, m] of mates.entries()) {
    setClock(dayAt(21, 15));
    const slug = m.name.toLowerCase().replace(/[^a-z]+/g, '.');
    const u = createUser(db, { email: `${slug}@magubane.local`, password: LEARNER.password, displayName: m.name, verified: true, isMinor: m.minor, ...(m.minor ? { guardianName: `Parent of ${m.name.split(' ')[0]}`, guardianEmail: `guardian.${slug}@magubane.local` } : {}), consentVersion: '2026-10-pilot' });
    saveProfile(db, u.id, { grade, curriculumId: 'za-caps', subjects, goals: ['pass-exams'], dailyMinutes: 20 });
    join(classId, u, 21);
    const abilities = Object.fromEntries(skills.map((s) => [s, m.level + gauss() * 0.7]));
    const sim = new Sim(u, abilities, m.level);
    sim.assessment(21, 15, { kind: 'baseline' });
    for (const [k, d] of m.activeDays.entries()) {
      const skill = skills[(i + k) % skills.length]!;
      if (k % 3 === 0) sim.lesson(d, skill);
      sim.practice(d, 16 + (k % 3), d <= 7 && k % 2 === 0 ? taskSkill : skill, 6, d <= 7 && k % 2 === 0 ? taskId : undefined);
    }
  }
}

const mathsTask2 = assign(maths10, 'practice', 'expand-brackets', 'Practice: Expanding brackets', 1, 6, 6);
classmates(maths10, 10, ['mathematics'], ['expand-brackets', 'factorise-trinomial', 'linear-equations', 'quadratic-equations', 'gradient', 'like-terms'], [
  { name: 'Ayanda Mokoena', minor: true, level: 1.0, activeDays: [20, 18, 15, 12, 9, 6, 4, 2] },
  { name: 'Thabo Nkosi', minor: true, level: -0.6, activeDays: [19, 14, 10, 5, 3] },
  { name: 'Naledi Khumalo', minor: true, level: 1.6, activeDays: [20, 17, 13, 11, 8, 6, 3, 1] },
  { name: 'Sibusiso Zulu', minor: true, level: 0.1, activeDays: [18, 16, 12] },
  { name: 'Zinhle Ndlovu', minor: true, level: -1.0, activeDays: [17, 11, 6, 2] },
], 'expand-brackets', mathsTask2);

const sciTask = assign(science9, 'practice', 'density', 'Practice: Density', 2, 5, 6);
assign(science9, 'lesson', 'circuits', 'Lesson: Series and parallel circuits', 5, 1);
classmates(science9, 9, ['physical-sciences', 'life-sciences'], ['states-of-matter', 'density', 'heat-transfer', 'acids-bases', 'circuits', 'speed-distance-time'], [
  { name: 'Karabo Mahlangu', minor: true, level: 0.8, activeDays: [20, 16, 13, 9, 6, 3, 1] },
  { name: 'Precious Sithole', minor: true, level: 0.2, activeDays: [19, 15, 8, 4] },
  { name: 'Lwazi Mthembu', minor: true, level: -0.4, activeDays: [18, 12] },
  { name: 'Anele Mabaso', minor: true, level: 1.3, activeDays: [20, 17, 14, 10, 7, 5, 2, 1] },
  { name: 'Reneilwe Maluleke', minor: true, level: -0.9, activeDays: [16, 9, 5, 3] },
  { name: 'Kgothatso Molefe', minor: true, level: 0.5, activeDays: [15, 11, 6] },
], 'density', sciTask);

setClock(null);
console.log(`Demo data ready (database: ${config.databasePath})`);
console.log(`  Learner: ${LEARNER.email} / ${LEARNER.password}`);
console.log(`  Teacher: ${TEACHER.email} / ${TEACHER.password}  (classes 10A Mathematics, 9B Natural Sciences)`);
db.close();
