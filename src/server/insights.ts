/** Read models: catalogue, skill detail, home, progress, exams. Computed from raw learning data. */
import { randomInt } from 'node:crypto';
import type { Db } from './db.ts';
import { all, one, run, newId } from './db.ts';
import { HttpError } from './http.ts';
import { now } from './config.ts';
import { getProfile, getStates, summarise, lessonsCompleted, recentMistakes, localDay, type Profile } from './learner.ts';
import { activeAssessment } from './activities.ts';
import type { UserDto, CatalogueResponse, SkillDetailResponse, HomeResponse, ProgressResponse, RecommendationDto, ExamDto, ExamDetailResponse, WorkedExample, ResultsDto } from '../shared/api.ts';
import { SUBJECTS, getSkill, getTopic, getSubject, topicsInSubject, skillsInTopic, skillsForLearner, skillsInSubject, type SubjectId } from '../shared/curriculum/catalogue.ts';
import { getLesson } from '../shared/content/lessons.ts';
import { mistakeInfo } from '../shared/questions/mistakes.ts';
import { generateQuestion } from '../shared/questions/registry.ts';
import type { Difficulty } from '../shared/questions/types.ts';
import { effectiveMastery, correctAnswersToNextBand, masteryPercent, INITIAL_RATING, type SkillState } from '../shared/mastery/model.ts';
import { recommend, weakAreas, daysUntil, type Recommendation } from '../shared/mastery/recommend.ts';
import { computeReadiness, buildPlan } from '../shared/mastery/readiness.ts';

function requireProfile(db: Db, user: UserDto): Profile {
  const p = getProfile(db, user.id);
  if (!p) throw new HttpError(409, 'not_onboarded', 'Finish setting up your profile first.');
  return p;
}

// ---------- catalogue & skills ----------

export function catalogue(db: Db, user: UserDto): CatalogueResponse {
  const profile = requireProfile(db, user);
  const states = getStates(db, user.id);
  const done = lessonsCompleted(db, user.id);
  const inScope = new Set(skillsForLearner(profile.subjects, profile.grade).map((s) => s.id));
  const at = now();
  const order = [...profile.subjects, ...SUBJECTS.map((s) => s.id).filter((id) => !profile.subjects.includes(id))];
  return {
    grade: profile.grade,
    subjects: order.map((sid) => ({
      id: sid,
      name: getSubject(sid)?.name ?? sid,
      topics: topicsInSubject(sid).map((t) => ({
        id: t.id,
        name: t.name,
        ...(t.strand ? { strand: t.strand } : {}),
        skills: skillsInTopic(t.id).map((s) => ({
          ...summarise(states.get(s.id), s.id, at),
          name: s.name,
          outcome: s.outcome,
          signature: s.signature,
          grade: s.grade,
          inScope: inScope.has(s.id),
          lessonCompleted: done.has(s.lessonId),
        })),
      })),
    })),
  };
}

export function skillDetail(db: Db, user: UserDto, skillId: string): SkillDetailResponse {
  requireProfile(db, user);
  const skill = getSkill(skillId);
  const lesson = skill ? getLesson(skill.lessonId) : undefined;
  if (!skill || !lesson) throw new HttpError(404, 'unknown_skill', 'That skill does not exist.');
  const states = getStates(db, user.id);
  const at = now();
  const topic = getTopic(skill.topicId)!;
  const since = new Date(at.getTime() - 30 * 86_400_000).toISOString();
  const mistakes = all<{ mistake_code: string; n: number }>(
    db,
    `SELECT mistake_code, COUNT(*) AS n FROM responses WHERE user_id = ? AND skill_id = ? AND mistake_code IS NOT NULL AND graded_at >= ? GROUP BY mistake_code ORDER BY n DESC LIMIT 3`,
    user.id,
    skill.id,
    since,
  );
  return {
    skill: {
      id: skill.id,
      name: skill.name,
      outcome: skill.outcome,
      signature: skill.signature,
      grade: skill.grade,
      topicName: topic.name,
      subjectName: getSubject(topic.subjectId)?.name ?? '',
      prerequisites: skill.prerequisites.map((p) => ({ id: p, name: getSkill(p)?.name ?? p, mastery: effectiveMastery(states.get(p), at) })),
    },
    state: summarise(states.get(skill.id), skill.id, at),
    lesson,
    lessonCompleted: lessonsCompleted(db, user.id).has(lesson.id),
    recentMistakes: mistakes.map((m) => ({ code: m.mistake_code, label: mistakeInfo(m.mistake_code)?.label ?? m.mistake_code, tip: mistakeInfo(m.mistake_code)?.tip ?? '', count: m.n })),
    nextBand: correctAnswersToNextBand(states.get(skill.id), at),
  };
}

export function workedExample(skillId: string, level: number): WorkedExample {
  const skill = getSkill(skillId);
  if (!skill) throw new HttpError(404, 'unknown_skill', 'That skill does not exist.');
  const lv = Math.min(5, Math.max(1, Math.round(level))) as Difficulty;
  const q = generateQuestion(skill.templateId, randomInt(1, 2 ** 31 - 1), lv);
  return { prompt: q.prompt, ...(q.figure ? { figure: q.figure } : {}), solution: q.solution, answerDisplay: q.answerDisplay };
}

// ---------- home ----------

function toRecDto(r: Recommendation, states: Map<string, SkillState>): RecommendationDto {
  const s = getSkill(r.skillId)!;
  return {
    skillId: r.skillId,
    skillName: s.name,
    topicName: getTopic(s.topicId)?.name ?? '',
    signature: s.signature,
    action: r.action,
    reasons: r.reasons,
    mastery: r.mastery,
    band: r.band,
    estMinutes: r.estMinutes,
    nextBand: r.action === 'learn' ? null : correctAnswersToNextBand(states.get(r.skillId), now()),
  };
}

function nearestExam(db: Db, userId: string, at: Date) {
  const today = localDay(at);
  return one<{ id: string; title: string; exam_date: string; skill_ids: string; subject_id: string }>(db, 'SELECT * FROM exams WHERE user_id = ? AND exam_date >= ? ORDER BY exam_date LIMIT 1', userId, today);
}

function minutesOnDay(db: Db, userId: string, day: string): number {
  const since = new Date(now().getTime() - 2 * 86_400_000).toISOString();
  const rows = all<{ created_at: string; time_ms: number }>(db, 'SELECT created_at, time_ms FROM responses WHERE user_id = ? AND created_at >= ?', userId, since);
  const ms = rows.filter((r) => localDay(new Date(r.created_at)) === day).reduce((sum, r) => sum + r.time_ms, 0);
  return Math.round(ms / 60000);
}

export function home(db: Db, user: UserDto): HomeResponse {
  const profile = requireProfile(db, user);
  const at = now();
  const states = getStates(db, user.id);
  const examRow = nearestExam(db, user.id, at);
  const exam = examRow ? { title: examRow.title, examDate: examRow.exam_date, skillIds: JSON.parse(examRow.skill_ids) as string[] } : null;
  const recs = recommend({ grade: profile.grade, subjects: profile.subjects, states, recentMistakes: recentMistakes(db, user.id), lessonsCompleted: lessonsCompleted(db, user.id), exam, now: at });

  const assessment = activeAssessment(db, user.id);
  const practice = one<{ id: string; title: string; target_count: number; n: number }>(
    db,
    `SELECT a.id, a.title, a.target_count, (SELECT COUNT(*) FROM responses r WHERE r.activity_id = a.id) AS n
     FROM activities a WHERE a.user_id = ? AND a.kind = 'practice' AND a.status = 'in_progress' ORDER BY a.started_at DESC LIMIT 1`,
    user.id,
  );
  const recent = all<{ id: string; title: string; kind: HomeResponse['recentResults'][number]['kind']; summary: string; completed_at: string }>(
    db,
    `SELECT id, title, kind, summary, completed_at FROM activities WHERE user_id = ? AND kind IN ('test', 'baseline', 'practice') AND status = 'completed' AND summary IS NOT NULL ORDER BY completed_at DESC LIMIT 4`,
    user.id,
  );

  let examSummary: HomeResponse['exam'] = null;
  if (examRow && exam) {
    const r = computeReadiness(exam.skillIds, states, exam.examDate, at);
    examSummary = { id: examRow.id, title: exam.title, examDate: exam.examDate, daysLeft: r.daysLeft, readiness: r.score, confidence: r.confidence, highRisk: r.highRisk.length };
  }

  const weekAgo = new Date(at.getTime() - 7 * 86_400_000).toISOString();
  const weekRows = all<{ graded_at: string; is_correct: number }>(db, 'SELECT graded_at, is_correct FROM responses WHERE user_id = ? AND graded_at >= ? AND skipped = 0', user.id, weekAgo);
  const week = { n: weekRows.length, c: weekRows.reduce((sum, r) => sum + r.is_correct, 0), days: new Set(weekRows.map((r) => localDay(new Date(r.graded_at)))).size };

  return {
    firstName: user.displayName.split(' ')[0] ?? user.displayName,
    grade: profile.grade,
    minutesToday: minutesOnDay(db, user.id, localDay(at)),
    dailyMinutes: profile.dailyMinutes,
    priority: recs[0] ? toRecDto(recs[0], states) : null,
    alternatives: recs.slice(1, 4).map((r) => toRecDto(r, states)),
    activeTest: assessment ? { id: assessment.id, title: assessment.title, remainingSec: assessment.time_limit_sec ? Math.max(0, Math.round(assessment.time_limit_sec - (at.getTime() - new Date(assessment.started_at).getTime()) / 1000)) : null } : null,
    activePractice: practice && practice.n < practice.target_count ? { id: practice.id, title: practice.title, answered: practice.n, targetCount: practice.target_count } : null,
    weakAreas: weakAreas({ states, now: at, subjects: profile.subjects, grade: profile.grade }).map((w) => ({ ...w, name: getSkill(w.skillId)?.name ?? w.skillId })),
    recentResults: recent.map((r) => ({ activityId: r.id, title: r.title, kind: r.kind, scorePct: (JSON.parse(r.summary) as ResultsDto).scorePct, completedAt: r.completed_at })),
    exam: examSummary,
    week: { questions: week.n, accuracy: week.n ? Math.round((100 * (week.c ?? 0)) / week.n) : null, activeDays: week.days },
  };
}

// ---------- progress ----------

export function progress(db: Db, user: UserDto): ProgressResponse {
  const profile = requireProfile(db, user);
  const at = now();
  const states = getStates(db, user.id);
  const inScope = new Set(skillsForLearner(profile.subjects, profile.grade).map((s) => s.id));
  const day30 = localDay(new Date(at.getTime() - 30 * 86_400_000));

  const snapshots = all<{ skill_id: string; day: string; mastery: number }>(db, 'SELECT skill_id, day, mastery FROM mastery_snapshots WHERE user_id = ? ORDER BY day', user.id);
  const masteryOn = (skillId: string, day: string): number | null => {
    let v: number | null = null;
    for (const s of snapshots) {
      if (s.skill_id !== skillId) continue;
      if (s.day <= day) v = s.mastery;
      else break;
    }
    return v;
  };

  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

  const subjects: ProgressResponse['subjects'] = profile.subjects.map((sid) => {
    const topics = topicsInSubject(sid)
      .map((t) => {
        const skills = skillsInTopic(t.id)
          .filter((s) => inScope.has(s.id) || (states.get(s.id)?.evidence ?? 0) > 0)
          .map((s) => {
            const sum = summarise(states.get(s.id), s.id, at);
            const then = masteryOn(s.id, day30);
            return { ...sum, name: s.name, trend30: sum.evidence ? sum.mastery - (then ?? 0) : null };
          });
        const started = skills.filter((s) => s.evidence > 0);
        return { id: t.id, name: t.name, ...(t.strand ? { strand: t.strand } : {}), mastery: avg(started.map((s) => s.mastery)), skills };
      })
      .filter((t) => t.skills.length > 0);
    const all_ = topics.flatMap((t) => t.skills);
    const started = all_.filter((s) => s.evidence > 0);
    return { id: sid, name: getSubject(sid)?.name ?? sid, mastery: avg(started.map((s) => s.mastery)), started: started.length, total: all_.length, topics };
  });

  // 30-day trend: average snapshot mastery across skills that had started by that day.
  const startedSkills = [...states.values()].filter((s) => s.evidence > 0).map((s) => s.skillId);
  const perDay = new Map<string, number>();
  for (const r of all<{ graded_at: string }>(db, 'SELECT graded_at FROM responses WHERE user_id = ? AND graded_at IS NOT NULL AND skipped = 0', user.id)) {
    const d = localDay(new Date(r.graded_at));
    perDay.set(d, (perDay.get(d) ?? 0) + 1);
  }
  const trend: ProgressResponse['trend'] = [];
  for (let i = 29; i >= 0; i--) {
    const day = localDay(new Date(at.getTime() - i * 86_400_000));
    const vals = startedSkills.map((s) => masteryOn(s, day)).filter((v): v is number => v !== null);
    trend.push({ day, mastery: avg(vals), questions: perDay.get(day) ?? 0 });
  }

  const topicList = subjects.flatMap((s) => s.topics).filter((t) => t.mastery !== null) as { id: string; name: string; mastery: number }[];
  const sorted = [...topicList].sort((a, b) => b.mastery - a.mastery);

  const since30 = new Date(at.getTime() - 30 * 86_400_000).toISOString();
  const mistakeRows = all<{ mistake_code: string; skill_id: string; n: number }>(
    db,
    `SELECT mistake_code, skill_id, COUNT(*) AS n FROM responses WHERE user_id = ? AND mistake_code IS NOT NULL AND graded_at >= ? GROUP BY mistake_code, skill_id`,
    user.id,
    since30,
  );
  const mistakeMap = new Map<string, { count: number; skills: Set<string> }>();
  for (const r of mistakeRows) {
    const m = mistakeMap.get(r.mistake_code) ?? { count: 0, skills: new Set() };
    m.count += r.n;
    m.skills.add(getSkill(r.skill_id)?.name ?? r.skill_id);
    mistakeMap.set(r.mistake_code, m);
  }
  const mistakes = [...mistakeMap.entries()]
    .map(([code, m]) => {
      const info = mistakeInfo(code);
      return info ? { code, label: info.label, kind: info.kind, tip: info.tip, count: m.count, skills: [...m.skills] } : null;
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const totals = one<{ ms: number | null; n: number; c30: number | null; n30: number; ms30: number | null }>(
    db,
    `SELECT SUM(time_ms) AS ms, SUM(CASE WHEN skipped = 0 AND graded_at IS NOT NULL THEN 1 ELSE 0 END) AS n,
            SUM(CASE WHEN graded_at >= ? AND skipped = 0 THEN is_correct ELSE 0 END) AS c30,
            SUM(CASE WHEN graded_at >= ? AND skipped = 0 THEN 1 ELSE 0 END) AS n30,
            SUM(CASE WHEN created_at >= ? THEN time_ms ELSE 0 END) AS ms30
     FROM responses WHERE user_id = ?`,
    since30,
    since30,
    since30,
    user.id,
  ) ?? { ms: 0, n: 0, c30: 0, n30: 0, ms30: 0 };
  const lessonMinutes = all<{ started_at: string; completed_at: string }>(db, `SELECT started_at, completed_at FROM activities WHERE user_id = ? AND kind = 'lesson' AND status = 'completed'`, user.id).reduce(
    (s, r) => s + Math.min(30, (new Date(r.completed_at).getTime() - new Date(r.started_at).getTime()) / 60000),
    0,
  );
  const testsCompleted = (one<{ n: number }>(db, `SELECT COUNT(*) AS n FROM activities WHERE user_id = ? AND kind = 'test' AND status = 'completed'`, user.id)?.n ?? 0) as number;

  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const day = localDay(new Date(at.getTime() - i * 86_400_000));
    if (perDay.get(day)) streak++;
    else if (i > 0) break;
  }

  const startLevel = masteryPercent(INITIAL_RATING);
  const improvements = startedSkills
    .filter((s) => (states.get(s)?.lastPracticedAt ?? '') >= since30)
    .map((s) => (masteryOn(s, localDay(at)) ?? startLevel) - (masteryOn(s, day30) ?? startLevel));

  return {
    subjects,
    trend,
    strongest: sorted.slice(0, Math.min(3, Math.ceil(sorted.length / 2))).map((t) => ({ topicId: t.id, name: t.name, mastery: t.mastery })),
    weakest: sorted
      .slice(Math.min(3, Math.ceil(sorted.length / 2)))
      .reverse()
      .slice(0, 3)
      .map((t) => ({ topicId: t.id, name: t.name, mastery: t.mastery })),
    mistakes,
    totals: {
      minutesAllTime: Math.round((totals.ms ?? 0) / 60000 + lessonMinutes),
      minutes30: Math.round((totals.ms30 ?? 0) / 60000),
      questions: totals.n,
      testsCompleted,
      streakDays: streak,
      accuracy30: totals.n30 ? Math.round((100 * (totals.c30 ?? 0)) / totals.n30) : null,
      improvement30: improvements.length ? Math.round(improvements.reduce((a, b) => a + b, 0) / improvements.length) : null,
    },
  };
}

// ---------- exams ----------

interface ExamRow {
  id: string;
  user_id: string;
  title: string;
  subject_id: SubjectId;
  exam_date: string;
  skill_ids: string;
}

function examDto(row: ExamRow, states: Map<string, SkillState>, at: Date): ExamDto {
  const skillIds = JSON.parse(row.skill_ids) as string[];
  const r = computeReadiness(skillIds, states, row.exam_date, at);
  return { id: row.id, title: row.title, subjectId: row.subject_id, examDate: row.exam_date, skillIds, daysLeft: r.daysLeft, readiness: r.score, confidence: r.confidence };
}

export function listExams(db: Db, user: UserDto): ExamDto[] {
  const at = now();
  const states = getStates(db, user.id);
  return all<ExamRow>(db, 'SELECT * FROM exams WHERE user_id = ? ORDER BY exam_date', user.id).map((r) => examDto(r, states, at));
}

export function createExam(db: Db, user: UserDto, body: { title: string; subjectId: SubjectId; examDate: string; skillIds?: string[] | undefined }): ExamDto {
  const profile = requireProfile(db, user);
  const at = now();
  const days = daysUntil(body.examDate, at);
  if (Number.isNaN(days) || days < 1) throw new HttpError(422, 'invalid', 'Choose a date after today.');
  if (days > 366) throw new HttpError(422, 'invalid', 'Choose a date within the next year.');
  const valid = new Set(skillsInSubject(body.subjectId).map((s) => s.id));
  const skillIds = body.skillIds?.length ? body.skillIds.filter((id) => valid.has(id)) : skillsForLearner([body.subjectId], profile.grade).map((s) => s.id);
  if (!skillIds.length) throw new HttpError(422, 'invalid', 'Pick at least one topic that will be in the exam.');
  const id = newId('exm');
  run(db, 'INSERT INTO exams (id, user_id, title, subject_id, exam_date, skill_ids, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', id, user.id, body.title, body.subjectId, body.examDate, JSON.stringify(skillIds), at.toISOString());
  return examDto(one<ExamRow>(db, 'SELECT * FROM exams WHERE id = ?', id) as ExamRow, getStates(db, user.id), at);
}

export function deleteExam(db: Db, user: UserDto, id: string): void {
  const row = one<ExamRow>(db, 'SELECT * FROM exams WHERE id = ?', id);
  if (!row || row.user_id !== user.id) throw new HttpError(404, 'not_found', 'That exam does not exist.');
  run(db, 'DELETE FROM exams WHERE id = ?', id);
}

export function examDetail(db: Db, user: UserDto, id: string): ExamDetailResponse {
  const profile = requireProfile(db, user);
  const row = one<ExamRow>(db, 'SELECT * FROM exams WHERE id = ?', id);
  if (!row || row.user_id !== user.id) throw new HttpError(404, 'not_found', 'That exam does not exist.');
  const at = now();
  const states = getStates(db, user.id);
  const skillIds = JSON.parse(row.skill_ids) as string[];
  const r = computeReadiness(skillIds, states, row.exam_date, at);
  const plan = buildPlan(r, { now: at, dailyMinutes: profile.dailyMinutes, lessonsCompleted: lessonsCompleted(db, user.id) });

  // Mark today's plan items done when the matching activity happened today.
  const today = localDay(at);
  const since = new Date(at.getTime() - 2 * 86_400_000).toISOString();
  const doneToday = all<{ kind: string; skill_ids: string; completed_at: string }>(db, `SELECT kind, skill_ids, completed_at FROM activities WHERE user_id = ? AND status = 'completed' AND completed_at >= ?`, user.id, since).filter(
    (a) => localDay(new Date(a.completed_at)) === today,
  );
  const isDone = (action: string, skillId: string | null) =>
    doneToday.some((a) => {
      const ids = JSON.parse(a.skill_ids) as string[];
      const kindMatch = action === 'learn' ? a.kind === 'lesson' : action === 'test' || action === 'mock' ? a.kind === 'test' : a.kind === 'practice';
      return kindMatch && (skillId === null || ids.includes(skillId));
    });

  const name = (sid: string) => getSkill(sid)?.name ?? sid;
  return {
    exam: examDto(row, states, at),
    readiness: {
      score: r.score,
      confidence: r.confidence,
      assessed: r.assessed,
      total: r.total,
      answers: r.answers,
      strong: r.strong.map((s) => ({ skillId: s.skillId, name: name(s.skillId), mastery: s.mastery })),
      needsWork: r.needsWork.map((s) => ({ skillId: s.skillId, name: name(s.skillId), mastery: s.mastery })),
      highRisk: r.highRisk.map((s) => ({ skillId: s.skillId, name: name(s.skillId), mastery: s.mastery, assessed: s.confidence > 0 })),
    },
    plan: {
      days: plan.days.map((d) => ({ ...d, items: d.items.map((it) => ({ ...it, done: d.date === today && isDone(it.action, it.skillId) })) })),
      overflow: plan.overflow.map((sid) => ({ skillId: sid, name: name(sid) })),
    },
  };
}

