/**
 * Educator mode. Teachers create classes; learners join with a code; teachers see progress and set work.
 * Access is decided only by canAccessLearner (auth.ts) and requireTeacher/requireOwnClass here.
 */
import { randomInt } from 'node:crypto';
import type { Db } from './db.ts';
import { all, one, run, newId } from './db.ts';
import { HttpError } from './http.ts';
import { now } from './config.ts';
import { getProfile, getStates, summarise, localDay } from './learner.ts';
import { createActivity } from './activities.ts';
import { progress } from './insights.ts';
import { getUser } from './auth.ts';
import { sendMail, layout } from './mailer.ts';
import { logged } from './verification.ts';
import { unsubscribeUrl } from './links.ts';
import type { UserDto, ResultsDto } from '../shared/api.ts';
import type { ClassSubjectId, AssignmentDto, ClassDetailDto, ClassLearnerDto, ClassSummaryDto, MyAssignmentDto, MyClassDto, TeacherLearnerDto, LearnerFlag, HeatCell } from '../shared/api-teach.ts';
import { getSkill, getTopic, getSubject, skillsForLearner, FOUNDATION_SUBJECTS, type SubjectId } from '../shared/curriculum/catalogue.ts';
import { mistakeInfo } from '../shared/questions/mistakes.ts';

interface ClassRow {
  id: string;
  teacher_id: string;
  name: string;
  grade: number;
  subject_id: ClassSubjectId;
  join_code: string;
  weekly_reports: number;
  created_at: string;
  archived_at: string | null;
}
interface AssignmentRow {
  id: string;
  class_id: string;
  kind: AssignmentDto['kind'];
  skill_id: string;
  title: string;
  note: string | null;
  question_count: number | null;
  due_at: string;
  created_at: string;
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function newJoinCode(db: Db): string {
  for (let i = 0; i < 20; i++) {
    const code = Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)]).join('');
    if (!one(db, 'SELECT 1 FROM classes WHERE join_code = ?', code)) return code;
  }
  throw new Error('Could not create a unique class code');
}

export function requireTeacher(user: UserDto | null): UserDto {
  if (!user) throw new HttpError(401, 'unauthenticated', 'Please log in.');
  if (user.role !== 'teacher') throw new HttpError(403, 'not_teacher', 'This is for teacher accounts.');
  if (!user.emailVerified) throw new HttpError(403, 'email_unverified', 'Confirm your email address first.');
  return user;
}

function requireOwnClass(db: Db, teacher: UserDto, classId: string): ClassRow {
  const c = one<ClassRow>(db, 'SELECT * FROM classes WHERE id = ?', classId);
  if (!c || c.teacher_id !== teacher.id) throw new HttpError(404, 'not_found', 'That class does not exist.');
  return c;
}

/** Skills a class covers: the subject's skills around the class grade, plus anything assigned. */
function classSkillIds(db: Db, c: ClassRow): string[] {
  const subjects: SubjectId[] = c.subject_id === 'all' ? FOUNDATION_SUBJECTS : [c.subject_id];
  // Grades 1–3: the class's own grade (last grade's skills show up per child where started).
  const band = skillsForLearner(subjects, c.grade)
    .filter((s) => c.grade > 3 || s.grade === c.grade)
    .map((s) => s.id);
  const assigned = all<{ skill_id: string }>(db, 'SELECT DISTINCT skill_id FROM assignments WHERE class_id = ?', c.id).map((r) => r.skill_id);
  return [...new Set([...band, ...assigned])].filter((id) => getSkill(id));
}

function members(db: Db, classId: string): { id: string; name: string; joined_at: string; is_minor: number; guardian_email: string | null }[] {
  return all(db, `SELECT u.id, u.display_name AS name, m.joined_at, u.is_minor, u.guardian_email FROM class_members m JOIN users u ON u.id = m.learner_id WHERE m.class_id = ? ORDER BY u.display_name COLLATE NOCASE`, classId);
}

function assignmentDto(a: AssignmentRow): AssignmentDto {
  return { id: a.id, classId: a.class_id, kind: a.kind, skillId: a.skill_id, skillName: getSkill(a.skill_id)?.name ?? a.skill_id, title: a.title, note: a.note, questionCount: a.question_count, dueAt: a.due_at, createdAt: a.created_at };
}

/**
 * Has this learner done the assignment? Lessons count once completed. Practice and tests count when an attempt
 * started from the assignment is completed, or any completed attempt of the same kind on that skill after it was set
 * (learners shouldn't lose credit for doing the work from the Learn page instead of the assignment).
 */
export function assignmentStatus(db: Db, a: AssignmentRow, learnerId: string): { done: boolean; scorePct: number | null; activityId: string | null } {
  if (a.kind === 'lesson') {
    const lessonId = getSkill(a.skill_id)?.lessonId ?? a.skill_id;
    return { done: !!one(db, 'SELECT 1 FROM lesson_progress WHERE user_id = ? AND lesson_id = ?', learnerId, lessonId), scorePct: null, activityId: null };
  }
  const act = one<{ id: string; status: string; summary: string | null }>(
    db,
    `SELECT id, status, summary FROM activities
     WHERE user_id = ? AND (assignment_id = ? OR (kind = ? AND status = 'completed' AND started_at >= ? AND skill_ids = ?))
     ORDER BY CASE status WHEN 'completed' THEN 0 ELSE 1 END, CASE WHEN assignment_id = ? THEN 0 ELSE 1 END, started_at DESC LIMIT 1`,
    learnerId,
    a.id,
    a.kind,
    a.created_at,
    JSON.stringify([a.skill_id]),
    a.id,
  );
  if (!act) return { done: false, scorePct: null, activityId: null };
  const done = act.status === 'completed';
  return { done, scorePct: done && act.summary ? (JSON.parse(act.summary) as ResultsDto).scorePct : null, activityId: act.id };
}

const isOverdue = (a: { due_at: string }, at: Date) => a.due_at < localDay(at);

function learnerRow(db: Db, m: ReturnType<typeof members>[number], skillIds: string[], assigns: AssignmentRow[], at: Date): ClassLearnerDto {
  const weekAgo = new Date(at.getTime() - 7 * 86_400_000).toISOString();
  const wk = one<{ n: number; c: number | null; ms: number | null }>(db, 'SELECT COUNT(*) AS n, SUM(is_correct) AS c, SUM(time_ms) AS ms FROM responses WHERE user_id = ? AND graded_at >= ? AND skipped = 0', m.id, weekAgo) ?? { n: 0, c: 0, ms: 0 };
  const last = one<{ t: string | null }>(db, 'SELECT MAX(t) AS t FROM (SELECT MAX(graded_at) AS t FROM responses WHERE user_id = ? UNION ALL SELECT MAX(completed_at) FROM lesson_progress WHERE user_id = ?)', m.id, m.id)?.t ?? null;
  const states = getStates(db, m.id);
  const started = skillIds.map((id) => summarise(states.get(id), id, at)).filter((s) => s.evidence > 0);
  const avgMastery = started.length ? Math.round(started.reduce((a, s) => a + s.mastery, 0) / started.length) : null;
  const overdue = assigns.filter((a) => isOverdue(a, at) && !assignmentStatus(db, a, m.id).done).length;
  const accuracy7d = wk.n ? Math.round((100 * (wk.c ?? 0)) / wk.n) : null;
  const flags: LearnerFlag[] = [];
  const joinedDaysAgo = (at.getTime() - new Date(m.joined_at).getTime()) / 86_400_000;
  if (!last && joinedDaysAgo < 7) flags.push('new');
  else if (!last || at.getTime() - new Date(last).getTime() > 7 * 86_400_000) flags.push('inactive');
  // Grades 1–3 play short sets at easy levels, so mastery climbs slowly at first: judge them on
  // first-try accuracy alone, or every child who has just started looks like they're struggling.
  const foundation = skillIds.length > 0 && skillIds.every((id) => getSkill(id)?.phase === 'foundation');
  if ((!foundation && avgMastery !== null && avgMastery < 35 && started.length >= 2) || (accuracy7d !== null && accuracy7d < 50 && wk.n >= 10)) flags.push('struggling');
  if (overdue > 0) flags.push('overdue');
  return {
    id: m.id,
    name: m.name,
    joinedAt: m.joined_at,
    lastActiveAt: last,
    minutes7d: Math.round((wk.ms ?? 0) / 60000),
    questions7d: wk.n,
    accuracy7d,
    avgMastery,
    skillsStarted: started.length,
    overdue,
    flags,
    hasGuardianEmail: !!(m.is_minor && m.guardian_email),
  };
}

function summary(db: Db, c: ClassRow, at: Date): ClassSummaryDto {
  const ms = members(db, c.id);
  const skillIds = classSkillIds(db, c);
  const weekAgo = new Date(at.getTime() - 7 * 86_400_000).toISOString();
  let active = 0;
  const masteries: number[] = [];
  for (const m of ms) {
    if (one(db, 'SELECT 1 FROM responses WHERE user_id = ? AND graded_at >= ? LIMIT 1', m.id, weekAgo)) active++;
    const states = getStates(db, m.id);
    const started = skillIds.map((id) => summarise(states.get(id), id, at)).filter((s) => s.evidence > 0);
    if (started.length) masteries.push(started.reduce((a, s) => a + s.mastery, 0) / started.length);
  }
  const open = one<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM assignments WHERE class_id = ? AND due_at >= ?', c.id, localDay(at))?.n ?? 0;
  return {
    id: c.id,
    name: c.name,
    grade: c.grade,
    subjectId: c.subject_id,
    subjectName: c.subject_id === 'all' ? 'All subjects' : (getSubject(c.subject_id)?.name ?? c.subject_id),
    joinCode: c.join_code,
    learnerCount: ms.length,
    activeThisWeek: active,
    avgMastery: masteries.length ? Math.round(masteries.reduce((a, b) => a + b, 0) / masteries.length) : null,
    openAssignments: open,
    weeklyReports: !!c.weekly_reports,
    archived: !!c.archived_at,
  };
}

// ---------- teacher ----------

export function listClasses(db: Db, teacher: UserDto): ClassSummaryDto[] {
  const at = now();
  return all<ClassRow>(db, 'SELECT * FROM classes WHERE teacher_id = ? ORDER BY archived_at IS NOT NULL, created_at DESC', teacher.id).map((c) => summary(db, c, at));
}

export function createClass(db: Db, teacher: UserDto, body: { name: string; grade: number; subjectId: ClassSubjectId }): ClassSummaryDto {
  const count = one<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM classes WHERE teacher_id = ? AND archived_at IS NULL', teacher.id)?.n ?? 0;
  if (count >= 30) throw new HttpError(422, 'too_many_classes', 'You can have up to 30 active classes. Archive one first.');
  const id = newId('cls');
  run(db, 'INSERT INTO classes (id, teacher_id, name, grade, subject_id, join_code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', id, teacher.id, body.name, body.grade, body.subjectId, newJoinCode(db), now().toISOString());
  return summary(db, requireOwnClass(db, teacher, id), now());
}

export function updateClass(db: Db, teacher: UserDto, id: string, body: { name?: string | undefined; weeklyReports?: boolean | undefined; archived?: boolean | undefined }): ClassSummaryDto {
  const c = requireOwnClass(db, teacher, id);
  if (body.name !== undefined) run(db, 'UPDATE classes SET name = ? WHERE id = ?', body.name, c.id);
  if (body.weeklyReports !== undefined) run(db, 'UPDATE classes SET weekly_reports = ? WHERE id = ?', body.weeklyReports ? 1 : 0, c.id);
  if (body.archived !== undefined) run(db, 'UPDATE classes SET archived_at = ? WHERE id = ?', body.archived ? now().toISOString() : null, c.id);
  return summary(db, requireOwnClass(db, teacher, id), now());
}

export function newClassCode(db: Db, teacher: UserDto, id: string): ClassSummaryDto {
  const c = requireOwnClass(db, teacher, id);
  run(db, 'UPDATE classes SET join_code = ? WHERE id = ?', newJoinCode(db), c.id);
  return summary(db, requireOwnClass(db, teacher, id), now());
}

export function removeMember(db: Db, teacher: UserDto, classId: string, learnerId: string): void {
  const c = requireOwnClass(db, teacher, classId);
  run(db, 'DELETE FROM class_members WHERE class_id = ? AND learner_id = ?', c.id, learnerId);
}

export function classDetail(db: Db, teacher: UserDto, id: string): ClassDetailDto {
  const c = requireOwnClass(db, teacher, id);
  const at = now();
  const ms = members(db, c.id);
  const skillIds = classSkillIds(db, c);
  const assigns = all<AssignmentRow>(db, 'SELECT * FROM assignments WHERE class_id = ? ORDER BY due_at DESC, created_at DESC', c.id);

  const heat: Record<string, Record<string, HeatCell>> = {};
  const perSkill = new Map<string, number[]>();
  for (const m of ms) {
    const states = getStates(db, m.id);
    heat[m.id] = {};
    for (const sid of skillIds) {
      const s = summarise(states.get(sid), sid, at);
      if (s.evidence > 0) {
        heat[m.id]![sid] = { mastery: s.mastery, band: s.band, evidence: s.evidence };
        perSkill.set(sid, [...(perSkill.get(sid) ?? []), s.mastery]);
      }
    }
  }

  const ids = ms.map((m) => m.id);
  const since = new Date(at.getTime() - 30 * 86_400_000).toISOString();
  const mistakeRows = ids.length
    ? all<{ mistake_code: string; skill_id: string; user_id: string; n: number }>(
        db,
        `SELECT mistake_code, skill_id, user_id, COUNT(*) AS n FROM responses WHERE user_id IN (${ids.map(() => '?').join(',')}) AND mistake_code IS NOT NULL AND mistake_code != 'probable-slip' AND graded_at >= ? GROUP BY mistake_code, skill_id, user_id`,
        ...ids,
        since,
      )
    : [];
  const mm = new Map<string, { count: number; learners: Set<string>; skills: Set<string> }>();
  for (const r of mistakeRows) {
    const e = mm.get(r.mistake_code) ?? { count: 0, learners: new Set(), skills: new Set() };
    e.count += r.n;
    e.learners.add(r.user_id);
    e.skills.add(getSkill(r.skill_id)?.name ?? r.skill_id);
    mm.set(r.mistake_code, e);
  }
  const mistakes = [...mm.entries()]
    .map(([code, e]) => {
      const info = mistakeInfo(code);
      return info ? { code, label: info.label, kind: info.kind, tip: info.tip, count: e.count, learners: e.learners.size, skills: [...e.skills] } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => b.learners - a.learners || b.count - a.count)
    .slice(0, 8);

  const teacherRow = one<{ display_name: string; school: string | null }>(db, 'SELECT display_name, school FROM users WHERE id = ?', c.teacher_id);
  const lastReport = one<{ t: string | null }>(db, "SELECT MAX(created_at) AS t FROM email_log WHERE class_id = ? AND kind LIKE '%report%'", c.id)?.t ?? null;

  return {
    class: summary(db, c, at),
    teacherName: teacherRow?.display_name ?? '',
    school: teacherRow?.school ?? null,
    learners: ms.map((m) => learnerRow(db, m, skillIds, assigns, at)),
    skills: skillIds.map((sid) => {
      const sk = getSkill(sid)!;
      const vals = perSkill.get(sid) ?? [];
      return { skillId: sid, name: sk.name, topic: getTopic(sk.topicId)?.name ?? '', grade: sk.grade, classAvg: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null, started: vals.length };
    }),
    heat,
    mistakes,
    assignments: assigns.map((a) => {
      const st = ms.map((m) => assignmentStatus(db, a, m.id));
      const scores = st.filter((x) => x.scorePct !== null).map((x) => x.scorePct as number);
      return { ...assignmentDto(a), completed: st.filter((x) => x.done).length, total: ms.length, avgScore: scores.length ? Math.round(scores.reduce((p, q) => p + q, 0) / scores.length) : null };
    }),
    lastReportAt: lastReport,
  };
}

export function createAssignment(db: Db, teacher: UserDto, classId: string, body: { kind: AssignmentDto['kind']; skillId: string; dueAt: string; note?: string | undefined; questionCount?: number | undefined }): AssignmentDto {
  const c = requireOwnClass(db, teacher, classId);
  const skill = getSkill(body.skillId);
  if (!skill) throw new HttpError(422, 'invalid', 'Choose a skill.', { fieldErrors: { skillId: ['Choose a skill'] } });
  if (body.dueAt < localDay(now())) throw new HttpError(422, 'invalid', 'The due date has already passed.', { fieldErrors: { dueAt: ['Choose today or a later date'] } });
  const verb = body.kind === 'lesson' ? 'Lesson' : body.kind === 'practice' ? 'Practice' : 'Test';
  const id = newId('asg');
  const count = body.kind === 'lesson' ? null : (body.questionCount ?? (body.kind === 'test' ? 8 : 10));
  run(db, 'INSERT INTO assignments (id, class_id, kind, skill_id, title, note, question_count, due_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', id, c.id, body.kind, skill.id, `${verb}: ${skill.name}`, body.note ?? null, count, body.dueAt, now().toISOString());
  return assignmentDto(one<AssignmentRow>(db, 'SELECT * FROM assignments WHERE id = ?', id)!);
}

export function deleteAssignment(db: Db, teacher: UserDto, id: string): void {
  const a = one<AssignmentRow>(db, 'SELECT * FROM assignments WHERE id = ?', id);
  if (!a) throw new HttpError(404, 'not_found', 'That assignment does not exist.');
  requireOwnClass(db, teacher, a.class_id);
  run(db, 'DELETE FROM assignments WHERE id = ?', a.id);
}

export function teacherLearner(db: Db, teacher: UserDto, learnerId: string): TeacherLearnerDto {
  const classes = all<ClassRow>(db, 'SELECT c.* FROM classes c JOIN class_members m ON m.class_id = c.id WHERE c.teacher_id = ? AND m.learner_id = ? AND c.archived_at IS NULL', teacher.id, learnerId);
  if (!classes.length) throw new HttpError(404, 'not_found', 'That learner is not in any of your classes.');
  const user = getUser(db, learnerId);
  const row = one<{ is_minor: number; guardian_email: string | null }>(db, 'SELECT is_minor, guardian_email FROM users WHERE id = ?', learnerId);
  if (!user || !row) throw new HttpError(404, 'not_found', 'That learner no longer exists.');
  const profile = getProfile(db, learnerId);
  const recent = all<{ id: string; title: string; kind: string; summary: string; completed_at: string }>(db, `SELECT id, title, kind, summary, completed_at FROM activities WHERE user_id = ? AND kind IN ('test', 'baseline', 'practice') AND status = 'completed' AND summary IS NOT NULL ORDER BY completed_at DESC LIMIT 8`, learnerId);
  const assigns = all<AssignmentRow>(db, `SELECT * FROM assignments WHERE class_id IN (${classes.map(() => '?').join(',')}) ORDER BY due_at DESC LIMIT 20`, ...classes.map((c) => c.id));
  const lastReport = one<{ t: string | null }>(db, "SELECT MAX(created_at) AS t FROM email_log WHERE learner_id = ? AND kind LIKE '%report%'", learnerId)?.t ?? null;
  return {
    learner: { id: learnerId, name: user.displayName, grade: profile?.grade ?? null, isMinor: !!row.is_minor, hasGuardianEmail: !!(row.is_minor && row.guardian_email), classes: classes.map((c) => c.name) },
    progress: profile ? progress(db, user) : null,
    recentResults: recent.map((r) => ({ activityId: r.id, title: r.title, kind: r.kind, scorePct: (JSON.parse(r.summary) as ResultsDto).scorePct, completedAt: r.completed_at })),
    assignments: assigns.map((a) => {
      const st = assignmentStatus(db, a, learnerId);
      return { ...assignmentDto(a), done: st.done, scorePct: st.scorePct };
    }),
    lastReportAt: lastReport,
  };
}

// ---------- learner ----------

export function findClassByCode(db: Db, code: string): ClassRow | null {
  const c = one<ClassRow>(db, 'SELECT * FROM classes WHERE join_code = ? AND archived_at IS NULL', code.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''));
  return c ?? null;
}

export function myClasses(db: Db, learner: UserDto): MyClassDto[] {
  return all<{ id: string; name: string; teacher: string; school: string | null; joined_at: string }>(
    db,
    `SELECT c.id, c.name, t.display_name AS teacher, t.school, m.joined_at FROM class_members m JOIN classes c ON c.id = m.class_id JOIN users t ON t.id = c.teacher_id WHERE m.learner_id = ? AND c.archived_at IS NULL ORDER BY m.joined_at`,
    learner.id,
  ).map((r) => ({ id: r.id, name: r.name, teacherName: r.teacher, school: r.school, joinedAt: r.joined_at }));
}

export async function joinClass(db: Db, learner: UserDto, code: string): Promise<MyClassDto> {
  if (learner.role !== 'student') throw new HttpError(403, 'not_learner', 'Only learner accounts can join a class.');
  const c = findClassByCode(db, code);
  if (!c) throw new HttpError(404, 'unknown_class', 'No class has that code. Check it with your teacher.', { fieldErrors: { code: ['No class has that code'] } });
  if (!one(db, 'SELECT 1 FROM class_members WHERE class_id = ? AND learner_id = ?', c.id, learner.id)) {
    const n = one<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM class_members WHERE class_id = ?', c.id)?.n ?? 0;
    if (n >= 60) throw new HttpError(422, 'class_full', 'This class is full. Ask your teacher.');
    run(db, 'INSERT INTO class_members (class_id, learner_id, joined_at) VALUES (?, ?, ?)', c.id, learner.id, now().toISOString());
    await notifyGuardianOfJoin(db, learner, c).catch((e) => console.error('[classes] guardian notice failed', e));
  }
  return myClasses(db, learner).find((x) => x.id === c.id)!;
}

async function notifyGuardianOfJoin(db: Db, learner: UserDto, c: ClassRow): Promise<void> {
  const g = one<{ is_minor: number; guardian_email: string | null; guardian_name: string | null; guardian_reports_off: number }>(db, 'SELECT is_minor, guardian_email, guardian_name, guardian_reports_off FROM users WHERE id = ?', learner.id);
  if (!g?.is_minor || !g.guardian_email) return;
  const t = one<{ display_name: string; school: string | null }>(db, 'SELECT display_name, school FROM users WHERE id = ?', c.teacher_id);
  const { html, text } = layout({
    heading: `${learner.displayName} joined a class on Magubane Labs`,
    paragraphs: [
      `Hello${g.guardian_name ? ` ${g.guardian_name}` : ''}. ${learner.displayName} has joined "${c.name}", taught by ${t?.display_name ?? 'their teacher'}${t?.school ? ` at ${t.school}` : ''}.`,
      'Their teacher can now see their progress in Magubane Labs: mastery per skill, results and common mistakes. Tutor conversations stay private.',
      g.guardian_reports_off ? 'You have turned off weekly reports.' : 'You will receive a short progress report (PDF) by email each week.',
      `If you don't recognise this, ${learner.displayName} can leave the class from "Your account", or reply to this email.`,
    ],
    footer: g.guardian_reports_off ? undefined : `To stop weekly reports: ${unsubscribeUrl(db, learner.id)}`,
  });
  logged(db, learner.id, g.guardian_email, 'class-join', await sendMail({ to: { email: g.guardian_email, ...(g.guardian_name ? { name: g.guardian_name } : {}) }, subject: `${learner.displayName} joined ${c.name} on Magubane Labs`, html, text }), { classId: c.id });
}

export function leaveClass(db: Db, learner: UserDto, classId: string): void {
  run(db, 'DELETE FROM class_members WHERE class_id = ? AND learner_id = ?', classId, learner.id);
}

export function myAssignments(db: Db, learner: UserDto): MyAssignmentDto[] {
  const at = now();
  const rows = all<AssignmentRow & { class_name: string; teacher: string }>(
    db,
    `SELECT a.*, c.name AS class_name, t.display_name AS teacher
     FROM assignments a
     JOIN classes c ON c.id = a.class_id
     JOIN class_members m ON m.class_id = c.id AND m.learner_id = ?
     JOIN users t ON t.id = c.teacher_id
     WHERE c.archived_at IS NULL AND a.due_at >= ?
     ORDER BY a.due_at ASC LIMIT 30`,
    learner.id,
    localDay(new Date(at.getTime() - 14 * 86_400_000)),
  );
  const seen = new Set<string>();
  return rows
    .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
    .map((r) => {
      const st = assignmentStatus(db, r, learner.id);
      return { ...assignmentDto(r), className: r.class_name, teacherName: r.teacher, done: st.done, scorePct: st.scorePct, overdue: !st.done && isOverdue(r, at) };
    });
}

/** Starts (or resumes) the activity for an assignment. Lessons are opened on the lesson page instead. */
export function startAssignment(db: Db, learner: UserDto, id: string): { activityId: string; kind: 'practice' | 'test' } | { lesson: string } {
  const a = one<AssignmentRow>(db, 'SELECT a.* FROM assignments a JOIN class_members m ON m.class_id = a.class_id WHERE a.id = ? AND m.learner_id = ?', id, learner.id);
  if (!a) throw new HttpError(404, 'not_found', 'That assignment does not exist.');
  if (a.kind === 'lesson') return { lesson: a.skill_id };
  const st = assignmentStatus(db, a, learner.id);
  if (st.activityId && !st.done) {
    const open = one<{ id: string }>(db, "SELECT id FROM activities WHERE id = ? AND status = 'in_progress'", st.activityId);
    if (open) return { activityId: open.id, kind: a.kind };
  }
  const count = a.question_count ?? undefined;
  const act = createActivity(db, learner, a.kind === 'practice' ? { kind: 'practice', skillId: a.skill_id, ...(count ? { count } : {}) } : { kind: 'test', skillId: a.skill_id, ...(count ? { count } : {}) }, { assignmentId: a.id, title: a.title });
  return { activityId: act.id, kind: a.kind };
}
