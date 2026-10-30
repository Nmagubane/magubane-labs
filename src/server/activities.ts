/**
 * The activity engine: lessons, practice (learning mode), tests and the baseline (assessment mode).
 * All grading happens here. The client never receives an answer before it has responded, and in
 * assessment mode it receives nothing about correctness until the activity is submitted.
 */
import { earnIcan } from './ican.ts';
import { MAX_JUNIOR_RETRIES } from '../shared/api-junior.ts';
import { randomInt } from 'node:crypto';
import type { Db } from './db.ts';
import { all, one, run, newId, tx } from './db.ts';
import { HttpError } from './http.ts';
import { now } from './config.ts';
import { getProfile, getState, getStates, saveState, localDay } from './learner.ts';
import type { UserDto, ActivityDto, ActivityStateResponse, AnswerResponse, CreateActivityRequest, FeedbackDto, MistakeDto, PracticeItem, ResultsDto, ReviewItem, AnswerRequest } from '../shared/api.ts';
import { getSkill, getTopic, skillsInTopic, skillsForLearner, subjectOfSkill, type Skill } from '../shared/curriculum/catalogue.ts';
import { generateQuestion } from '../shared/questions/registry.ts';
import { gradeResponse, canonicalResponse, type ResponseValue } from '../shared/questions/answer.ts';
import type { AnswerSpec, Difficulty, Misconception, QuestionPayload, RichText } from '../shared/questions/types.ts';
import { mistakeInfo } from '../shared/questions/mistakes.ts';
import { answerScore, chooseLevel, effectiveMastery, masteryPercent, pCorrect, updateRating, band } from '../shared/mastery/model.ts';
import { weakAreas, recommend } from '../shared/mastery/recommend.ts';
import { lessonsCompleted, recentMistakes } from './learner.ts';
import { getLesson } from '../shared/content/lessons.ts';
import { instructionLanguage } from '../shared/junior/languages.ts';

interface ActivityRow {
  id: string;
  user_id: string;
  kind: ActivityDto['kind'];
  mode: ActivityDto['mode'];
  status: ActivityDto['status'];
  title: string;
  skill_ids: string;
  target_count: number;
  time_limit_sec: number | null;
  difficulty_offset: number;
  started_at: string;
  completed_at: string | null;
  summary: string | null;
}

interface QuestionRow {
  id: string;
  activity_id: string;
  user_id: string;
  position: number;
  template_id: string;
  skill_id: string;
  difficulty: number;
  seed: number;
  payload: string;
  secret: string;
  hints_used: number;
  /** Junior "try one like it": the question this one gives a second chance at. */
  retry_of?: string | null;
}

/** At most this many "try one like it" questions in one Junior set: enough to recover, not a slog. */
const MAX_RETRIES = MAX_JUNIOR_RETRIES;

interface ResponseRow {
  id: string;
  question_id: string;
  response: string | null;
  skipped: number;
  is_correct: number | null;
  score: number | null;
  mistake_code: string | null;
  feedback: string | null;
  confidence: 'guess' | 'unsure' | 'sure' | null;
  time_ms: number;
  rating_before: number | null;
  rating_after: number | null;
}

interface Secret {
  answer: AnswerSpec;
  answerDisplay: RichText;
  hints: RichText[];
  solution: RichText[];
  misconceptions: Misconception[];
}

const GRACE_SEC = 30;

// ---------- helpers ----------

function remainingSec(a: ActivityRow, at: Date): number | null {
  if (!a.time_limit_sec || a.status !== 'in_progress') return null;
  const elapsed = (at.getTime() - new Date(a.started_at).getTime()) / 1000;
  return Math.round(a.time_limit_sec - elapsed);
}

function toDto(a: ActivityRow): ActivityDto {
  const rem = remainingSec(a, now());
  return {
    id: a.id,
    kind: a.kind,
    mode: a.mode,
    status: a.status,
    title: a.title,
    skillIds: JSON.parse(a.skill_ids) as string[],
    targetCount: a.target_count,
    startedAt: a.started_at,
    completedAt: a.completed_at,
    timeLimitSec: a.time_limit_sec,
    remainingSec: rem === null ? null : Math.max(0, rem),
    difficultyOffset: a.difficulty_offset,
  };
}

function loadActivity(db: Db, user: UserDto, id: string): ActivityRow {
  const a = one<ActivityRow>(db, 'SELECT * FROM activities WHERE id = ?', id);
  if (!a || a.user_id !== user.id) throw new HttpError(404, 'not_found', 'That activity does not exist.');
  return a;
}

function loadQuestion(db: Db, user: UserDto, id: string): { q: QuestionRow; a: ActivityRow } {
  const q = one<QuestionRow>(db, 'SELECT * FROM question_instances WHERE id = ?', id);
  if (!q || q.user_id !== user.id) throw new HttpError(404, 'not_found', 'That question does not exist.');
  const a = one<ActivityRow>(db, 'SELECT * FROM activities WHERE id = ?', q.activity_id) as ActivityRow;
  return { q, a };
}

function payloadOf(q: QuestionRow): QuestionPayload {
  return { id: q.id, ...(JSON.parse(q.payload) as Omit<QuestionPayload, 'id'>) };
}

function mistakeDto(code: string | null): MistakeDto | null {
  if (!code) return null;
  const info = mistakeInfo(code);
  return info ? { code, label: info.label, kind: info.kind, tip: info.tip } : null;
}

/** The language a learner's questions are written and spoken in. */
export function questionLanguage(db: Db, userId: string): string {
  const p = getProfile(db, userId);
  return p?.homeLanguage ? instructionLanguage(p.homeLanguage) : 'en';
}

function createQuestion(db: Db, activity: ActivityRow, skill: Skill, level: Difficulty, position: number, retryOf: string | null = null): QuestionRow {
  const seed = randomInt(1, 2 ** 31 - 1);
  const g = generateQuestion(skill.templateId, seed, level, { lang: questionLanguage(db, activity.user_id) });
  const payload: Omit<QuestionPayload, 'id'> = {
    skillId: skill.id,
    difficulty: level,
    prompt: g.prompt,
    ...(g.figure ? { figure: g.figure } : {}),
    ...(g.scene ? { scene: g.scene } : {}),
    ...(g.say ? { say: g.say } : {}),
    input: g.input,
    hintsAvailable: activity.mode === 'learning' ? g.hints.length : 0,
    ...(retryOf ? { retry: true } : {}),
  };
  const secret: Secret = { answer: g.answer, answerDisplay: g.answerDisplay, hints: g.hints, solution: g.solution, misconceptions: g.misconceptions };
  const row: QuestionRow = {
    id: newId('q'),
    activity_id: activity.id,
    user_id: activity.user_id,
    position,
    template_id: skill.templateId,
    skill_id: skill.id,
    difficulty: level,
    seed,
    payload: JSON.stringify(payload),
    secret: JSON.stringify(secret),
    hints_used: 0,
    retry_of: retryOf,
  };
  run(
    db,
    `INSERT INTO question_instances (id, activity_id, user_id, position, template_id, skill_id, difficulty, seed, payload, secret, hints_used, retry_of, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    row.id,
    row.activity_id,
    row.user_id,
    row.position,
    row.template_id,
    row.skill_id,
    row.difficulty,
    row.seed,
    row.payload,
    row.secret,
    retryOf,
    now().toISOString(),
  );
  return row;
}

function requireSkill(id: string | undefined): Skill {
  const s = id ? getSkill(id) : undefined;
  if (!s) throw new HttpError(404, 'unknown_skill', 'That skill does not exist.');
  return s;
}

function shuffle<T>(xs: T[]): T[] {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

// ---------- create ----------

export function activeAssessment(db: Db, userId: string): ActivityRow | null {
  const rows = all<ActivityRow>(db, `SELECT * FROM activities WHERE user_id = ? AND mode = 'assessment' AND status = 'in_progress' ORDER BY started_at DESC`, userId);
  for (const a of rows) {
    const rem = remainingSec(a, now());
    if (rem !== null && rem < -GRACE_SEC) {
      finaliseAssessment(db, a);
      continue;
    }
    return a;
  }
  return null;
}

export function createActivity(db: Db, user: UserDto, req: CreateActivityRequest, opts: { assignmentId?: string; title?: string } = {}): ActivityDto {
  const profile = getProfile(db, user.id);
  if (!profile) throw new HttpError(409, 'not_onboarded', 'Finish setting up your profile first.');
  const at = now();
  const states = getStates(db, user.id);

  let kind = req.kind;
  let mode: ActivityRow['mode'] = 'learning';
  let skills: Skill[] = [];
  let title = '';
  let target = 8;
  let timeLimit: number | null = null;

  if (req.kind === 'lesson') {
    const s = requireSkill(req.skillId);
    const lesson = getLesson(s.lessonId);
    skills = [s];
    title = lesson?.title ?? s.name;
    target = lesson?.blocks.filter((b) => b.kind === 'check').length ?? 2;
    // Resume an open lesson for the same skill rather than piling up activities.
    const open = one<ActivityRow>(db, `SELECT * FROM activities WHERE user_id = ? AND kind = 'lesson' AND status = 'in_progress' AND skill_ids = ?`, user.id, JSON.stringify([s.id]));
    if (open) return toDto(open);
  } else if (req.kind === 'practice') {
    target = req.count ?? 8;
    if (req.skillId) {
      skills = [requireSkill(req.skillId)];
      title = `Practice: ${skills[0]!.name}`;
    } else {
      const weak = weakAreas({ states, now: at, subjects: profile.subjects, grade: profile.grade }, 3).map((w) => getSkill(w.skillId) as Skill);
      skills = weak.length
        ? weak
        : recommend({ grade: profile.grade, subjects: profile.subjects, states, recentMistakes: recentMistakes(db, user.id), lessonsCompleted: lessonsCompleted(db, user.id), now: at })
            .slice(0, 3)
            .map((r) => getSkill(r.skillId) as Skill);
      title = weak.length ? 'Practice: your weak areas' : 'Practice: recommended skills';
    }
  } else if (req.kind === 'test' || req.kind === 'baseline') {
    mode = 'assessment';
    const existing = activeAssessment(db, user.id);
    if (existing) throw new HttpError(409, 'assessment_in_progress', 'You already have a test in progress. Finish it first.', { activityId: existing.id });
    if (req.kind === 'baseline') {
      kind = 'baseline';
      skills = pickBaselineSkills(profile.subjects, profile.grade);
      title = 'Starting point check';
      target = skills.length;
    } else {
      if (req.skillId) {
        skills = [requireSkill(req.skillId)];
        title = `Quick test: ${skills[0]!.name}`;
        target = req.count ?? 5;
      } else if (req.topicId) {
        const topic = getTopic(req.topicId);
        if (!topic) throw new HttpError(404, 'unknown_topic', 'That topic does not exist.');
        const inScope = new Set(skillsForLearner(profile.subjects, profile.grade).map((s) => s.id));
        skills = skillsInTopic(topic.id).filter((s) => inScope.has(s.id) || (states.get(s.id)?.evidence ?? 0) > 0);
        if (!skills.length) skills = skillsInTopic(topic.id);
        title = `Topic test: ${topic.name}`;
        target = req.count ?? 10;
      } else if (req.examId) {
        const exam = one<{ title: string; skill_ids: string; user_id: string }>(db, 'SELECT title, skill_ids, user_id FROM exams WHERE id = ?', req.examId);
        if (!exam || exam.user_id !== user.id) throw new HttpError(404, 'not_found', 'That exam does not exist.');
        skills = (JSON.parse(exam.skill_ids) as string[]).map((id) => getSkill(id)).filter((s): s is Skill => !!s);
        title = `Mock exam: ${exam.title}`;
        target = req.count ?? Math.min(20, Math.max(10, skills.length * 2));
      } else if (req.weak) {
        skills = weakAreas({ states, now: at, subjects: profile.subjects, grade: profile.grade }, 4).map((w) => getSkill(w.skillId) as Skill);
        title = 'Test: your weak areas';
        target = req.count ?? 10;
      } else {
        const started = skillsForLearner(profile.subjects, profile.grade).filter((s) => (states.get(s.id)?.evidence ?? 0) > 0);
        skills = started.length ? started : skillsForLearner(profile.subjects, profile.grade);
        title = 'Mixed test';
        target = req.count ?? 10;
      }
      if (req.timed !== false) timeLimit = target * (req.examId ? 120 : 90);
    }
  }
  if (!skills.length) throw new HttpError(422, 'nothing_to_do', 'There are no skills to work on yet. Start with a lesson.');
  if (opts.title) title = opts.title;

  const activity: ActivityRow = {
    id: newId('act'),
    user_id: user.id,
    kind,
    mode,
    status: 'in_progress',
    title,
    skill_ids: JSON.stringify(skills.map((s) => s.id)),
    target_count: target,
    time_limit_sec: timeLimit,
    difficulty_offset: 0,
    started_at: at.toISOString(),
    completed_at: null,
    summary: null,
  };

  tx(db, () => {
    run(
      db,
      `INSERT INTO activities (id, user_id, kind, mode, status, title, skill_ids, target_count, time_limit_sec, difficulty_offset, started_at, assignment_id)
       VALUES (?, ?, ?, ?, 'in_progress', ?, ?, ?, ?, 0, ?, ?)`,
      activity.id,
      user.id,
      activity.kind,
      activity.mode,
      activity.title,
      activity.skill_ids,
      activity.target_count,
      activity.time_limit_sec,
      activity.started_at,
      opts.assignmentId ?? null,
    );
    if (mode === 'assessment') {
      const plan = assessmentPlan(skills, target, kind === 'baseline', profile.grade, states);
      plan.forEach((p, i) => createQuestion(db, activity, p.skill, p.level, i + 1));
    }
  });
  return toDto(activity);
}

function pickBaselineSkills(subjects: Skill['id'][] | string[], grade: number): Skill[] {
  const pool = skillsForLearner(subjects as never, grade).sort((a, b) => Math.abs(a.grade - grade) - Math.abs(b.grade - grade) || b.grade - a.grade);
  const bySubject = new Map<string, Skill[]>();
  for (const s of pool) {
    const k = subjectOfSkill(s);
    bySubject.set(k, [...(bySubject.get(k) ?? []), s]);
  }
  const out: Skill[] = [];
  const max = 10;
  while (out.length < max && [...bySubject.values()].some((l) => l.length)) {
    for (const list of bySubject.values()) {
      const s = list.shift();
      if (s && out.length < max) out.push(s);
    }
  }
  return out;
}

function assessmentPlan(skills: Skill[], count: number, baseline: boolean, grade: number, states: ReturnType<typeof getStates>): { skill: Skill; level: Difficulty }[] {
  if (baseline) return skills.map((s) => ({ skill: s, level: (s.grade < grade ? 3 : 2) as Difficulty }));
  const order = shuffle(skills);
  const spread = [0, 1, -1, 0, 1, -1];
  const perSkill = new Map<string, number>();
  const plan: { skill: Skill; level: Difficulty }[] = [];
  for (let i = 0; i < count; i++) {
    const skill = order[i % order.length] as Skill;
    const k = perSkill.get(skill.id) ?? 0;
    perSkill.set(skill.id, k + 1);
    const st = states.get(skill.id);
    const base = st && st.evidence > 0 ? chooseLevel(st.rating, 0.6) : skill.grade < grade ? 3 : 2;
    plan.push({ skill, level: Math.min(5, Math.max(1, base + (spread[k % spread.length] as number))) as Difficulty });
  }
  return shuffle(plan);
}

// ---------- state ----------

function responsesFor(db: Db, activityId: string): Map<string, ResponseRow> {
  return new Map(all<ResponseRow>(db, 'SELECT * FROM responses WHERE activity_id = ?', activityId).map((r) => [r.question_id, r]));
}

function feedbackFrom(q: QuestionRow, r: ResponseRow, secret: Secret): FeedbackDto {
  return {
    questionId: q.id,
    correct: r.is_correct === 1,
    skipped: r.skipped === 1,
    mistake: mistakeDto(r.mistake_code),
    feedback: r.feedback,
    answerDisplay: secret.answerDisplay,
    // Only ever built after the learner has responded: lets the screen show the right answer in place.
    correctResponse: canonicalResponse(secret.answer),
    solution: secret.solution,
    masteryBefore: r.rating_before === null ? 0 : masteryPercent(r.rating_before),
    masteryAfter: r.rating_after === null ? 0 : masteryPercent(r.rating_after),
    band: band(r.rating_after === null ? undefined : { skillId: q.skill_id, rating: r.rating_after, evidence: 1, attempts: 1, correct: 0, lastPracticedAt: null }, now()),
  };
}

export function getActivityState(db: Db, user: UserDto, id: string): ActivityStateResponse {
  let a = loadActivity(db, user, id);
  if (a.mode === 'assessment' && a.status === 'in_progress') {
    const rem = remainingSec(a, now());
    if (rem !== null && rem < -GRACE_SEC) {
      finaliseAssessment(db, a);
      a = loadActivity(db, user, id);
    }
  }
  const questions = all<QuestionRow>(db, 'SELECT * FROM question_instances WHERE activity_id = ? ORDER BY position', a.id);
  const responses = responsesFor(db, a.id);
  const items: PracticeItem[] = questions.map((q) => {
    const r = responses.get(q.id);
    const secret = JSON.parse(q.secret) as Secret;
    const showFeedback = a.mode === 'learning' && r && r.is_correct !== null;
    return {
      question: payloadOf(q),
      response: r?.response ? (JSON.parse(r.response) as ResponseValue) : null,
      hints: a.mode === 'learning' ? secret.hints.slice(0, q.hints_used) : [],
      feedback: showFeedback ? feedbackFrom(q, r, secret) : null,
    };
  });
  const answered = [...responses.values()].filter((r) => r.response !== null || r.skipped).length;
  return { activity: toDto(a), items, answered };
}

// ---------- learning mode: next question, hints ----------

export function nextQuestion(db: Db, user: UserDto, id: string, opts: { adjust?: 'easier' | 'harder' | 'same'; level?: number; retry?: boolean }): PracticeItem {
  const a = loadActivity(db, user, id);
  if (a.mode !== 'learning') throw new HttpError(403, 'assessment_mode', 'Questions in a test are fixed in advance.');
  if (a.status !== 'in_progress') throw new HttpError(409, 'finished', 'This activity is finished.');
  const questions = all<QuestionRow>(db, 'SELECT * FROM question_instances WHERE activity_id = ? ORDER BY position', a.id);
  const responses = responsesFor(db, a.id);
  const open = questions.find((q) => !responses.has(q.id));
  if (opts.retry && open && !open.retry_of) throw new HttpError(409, 'no_retry', 'Answer this one first.');
  if (open && !opts.level) {
    const secret = JSON.parse(open.secret) as Secret;
    return { question: payloadOf(open), response: null, hints: secret.hints.slice(0, open.hints_used), feedback: null };
  }
  if (opts.retry) return retryQuestion(db, a, questions, responses);
  if (a.kind === 'practice' && responses.size >= a.target_count) throw new HttpError(409, 'complete', 'Practice set complete.');

  let offset = a.difficulty_offset;
  if (opts.adjust === 'easier') offset = Math.max(-2, offset - 1);
  if (opts.adjust === 'harder') offset = Math.min(2, offset + 1);
  if (offset !== a.difficulty_offset) run(db, 'UPDATE activities SET difficulty_offset = ? WHERE id = ?', offset, a.id);

  const skillIds = JSON.parse(a.skill_ids) as string[];
  let skill: Skill;
  const last = questions.at(-1);
  if (opts.adjust === 'same' && last) skill = getSkill(last.skill_id) as Skill;
  else if (skillIds.length === 1) skill = getSkill(skillIds[0] as string) as Skill;
  else {
    // Weighted towards weaker skills; never the same skill three times running.
    const recent = questions.slice(-2).map((q) => q.skill_id);
    const blocked = recent.length === 2 && recent[0] === recent[1] ? recent[0] : null;
    const states = getStates(db, user.id);
    const candidates = skillIds.filter((s) => s !== blocked);
    const weights = candidates.map((s) => 1.2 - effectiveMastery(states.get(s), now()) / 100);
    let roll = (randomInt(0, 1_000_000) / 1_000_000) * weights.reduce((x, y) => x + y, 0);
    let chosen = candidates[0] as string;
    for (let i = 0; i < candidates.length; i++) {
      roll -= weights[i] as number;
      if (roll <= 0) {
        chosen = candidates[i] as string;
        break;
      }
    }
    skill = getSkill(chosen) as Skill;
  }
  const state = getState(db, user.id, skill.id);
  const level = (opts.level && a.kind === 'lesson' ? opts.level : opts.adjust === 'same' && last ? Math.min(5, Math.max(1, last.difficulty)) : chooseLevel(state.rating, 0.7, offset)) as Difficulty;
  const q = createQuestion(db, a, skill, level, (last?.position ?? 0) + 1);
  return { question: payloadOf(q), response: null, hints: [], feedback: null };
}

/**
 * Junior "try one like it": straight after a wrong first try, the same kind of question at the same level
 * with new numbers, so the child leaves the mistake by getting one right. It adds a question to the set
 * (the five first tries stay five) and is capped, so a hard day doesn't turn into a long one.
 */
function retryQuestion(db: Db, a: ActivityRow, questions: QuestionRow[], responses: Map<string, ResponseRow>): PracticeItem {
  if (a.kind !== 'practice') throw new HttpError(403, 'no_retry', 'Second tries are for practice sets.');
  const last = questions.at(-1);
  const r = last ? responses.get(last.id) : undefined;
  if (!last || !r || r.is_correct === 1 || last.retry_of) throw new HttpError(409, 'no_retry', 'There is nothing to try again.');
  if (questions.filter((q) => q.retry_of).length >= MAX_RETRIES) throw new HttpError(409, 'retry_limit', 'That is enough second tries for one set.');
  const skill = getSkill(last.skill_id) as Skill;
  run(db, 'UPDATE activities SET target_count = target_count + 1 WHERE id = ?', a.id);
  const q = createQuestion(db, a, skill, last.difficulty as Difficulty, last.position + 1, last.id);
  return { question: payloadOf(q), response: null, hints: [], feedback: null };
}

export function takeHint(db: Db, user: UserDto, questionId: string): { hint: RichText; index: number; remaining: number } {
  const { q, a } = loadQuestion(db, user, questionId);
  if (a.mode !== 'learning') throw new HttpError(403, 'hints_disabled', 'Hints are off in test mode.');
  const secret = JSON.parse(q.secret) as Secret;
  if (q.hints_used >= secret.hints.length) throw new HttpError(409, 'no_more_hints', 'That was the last hint. Try the tutor, or have a go.');
  run(db, 'UPDATE question_instances SET hints_used = hints_used + 1 WHERE id = ?', q.id);
  return { hint: secret.hints[q.hints_used] as RichText, index: q.hints_used, remaining: secret.hints.length - q.hints_used - 1 };
}

// ---------- answering ----------

function grade(q: QuestionRow, secret: Secret, response: ResponseValue, ratingBefore: number) {
  const g = gradeResponse(secret.answer, response, secret.misconceptions);
  let mistake = g.mistake ?? null;
  // Junior sorting and ordering: name the kind of slip so adults see "sorted into the wrong group", not nothing.
  if (!g.correct && !mistake && g.wrongIds) mistake = secret.answer.kind === 'sequence' ? 'fp-order' : 'fp-sort';
  if (!g.correct && !mistake && !g.parseError && pCorrect(ratingBefore, q.difficulty as Difficulty) > 0.8) mistake = 'probable-slip';
  return { ...g, mistake };
}

export function answerQuestion(db: Db, user: UserDto, questionId: string, body: AnswerRequest): AnswerResponse {
  const { q, a } = loadQuestion(db, user, questionId);
  if (a.status !== 'in_progress') throw new HttpError(409, 'finished', 'This activity is already finished.');
  const secret = JSON.parse(q.secret) as Secret;
  const at = now();

  if (a.mode === 'learning') {
    if (one(db, 'SELECT 1 FROM responses WHERE question_id = ?', q.id)) throw new HttpError(409, 'already_answered', 'You have already answered this question.');
    if (body.response === null) throw new HttpError(422, 'empty', 'Enter an answer first.');
    const state = getState(db, user.id, q.skill_id);
    const g = grade(q, secret, body.response, state.rating);
    if (g.parseError) throw new HttpError(422, 'unreadable', g.parseError);
    // A second try comes straight after the worked solution, so it counts like an answer with one hint.
    const score = answerScore(g.correct, q.hints_used + (q.retry_of ? 1 : 0));
    const before = state.rating;
    const after = updateRating({ rating: before, evidence: state.evidence, level: q.difficulty as Difficulty, score, mode: 'learning' });
    tx(db, () => {
      saveState(db, user.id, { ...state, rating: after, evidence: state.evidence + 1, attempts: state.attempts + 1, correct: state.correct + (g.correct ? 1 : 0), lastPracticedAt: at.toISOString() });
      run(
        db,
        `INSERT INTO responses (id, question_id, activity_id, user_id, skill_id, response, skipped, is_correct, score, mistake_code, feedback, confidence, time_ms, rating_before, rating_after, created_at, graded_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
        newId('rsp'),
        q.id,
        a.id,
        user.id,
        q.skill_id,
        JSON.stringify(body.response),
        g.correct ? 1 : 0,
        score,
        g.mistake,
        g.feedback ?? null,
        Math.min(body.timeMs, 600_000),
        before,
        after,
        at.toISOString(),
        at.toISOString(),
      );
    });
    const answered = (one<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM responses WHERE activity_id = ?', a.id) as { n: number }).n;
    const r = one<ResponseRow>(db, 'SELECT * FROM responses WHERE question_id = ?', q.id) as ResponseRow;
    const fb = feedbackFrom(q, r, secret);
    const st = getState(db, user.id, q.skill_id);
    fb.band = band(st, at);
    fb.masteryAfter = effectiveMastery(st, at);
    if (g.wrongIds?.length) fb.wrongIds = g.wrongIds;
    // Grades 1–3: the moment a skill becomes secure, the child earns an "I can…" statement (once).
    const ican = earnIcan(db, user.id, q.skill_id, a.id, st, at);
    return { feedback: fb, saved: true, answered, done: a.kind === 'practice' && answered >= a.target_count, ...(ican ? { ican } : {}) };
  }

  // Assessment: save only. No feedback until submit.
  const rem = remainingSec(a, at);
  if (rem !== null && rem < -GRACE_SEC) {
    finaliseAssessment(db, a);
    throw new HttpError(410, 'time_up', 'Time is up. Your test has been submitted.', { activityId: a.id });
  }
  const skipped = body.skipped === true && a.kind === 'baseline';
  if (!skipped && body.response !== null) {
    const parsed = gradeResponse(secret.answer, body.response);
    if (parsed.parseError) throw new HttpError(422, 'unreadable', parsed.parseError);
  }
  const existing = one<ResponseRow>(db, 'SELECT * FROM responses WHERE question_id = ?', q.id);
  if (existing) {
    run(db, 'UPDATE responses SET response = ?, skipped = ?, confidence = ?, time_ms = time_ms + ? WHERE id = ?', body.response === null ? null : JSON.stringify(body.response), skipped ? 1 : 0, body.confidence ?? null, Math.min(body.timeMs, 600_000), existing.id);
  } else {
    run(
      db,
      `INSERT INTO responses (id, question_id, activity_id, user_id, skill_id, response, skipped, confidence, time_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      newId('rsp'),
      q.id,
      a.id,
      user.id,
      q.skill_id,
      body.response === null ? null : JSON.stringify(body.response),
      skipped ? 1 : 0,
      body.confidence ?? null,
      Math.min(body.timeMs, 600_000),
      at.toISOString(),
    );
  }
  const answered = (one<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM responses WHERE activity_id = ? AND (response IS NOT NULL OR skipped = 1)', a.id) as { n: number }).n;
  return { feedback: null, saved: true, answered, done: answered >= a.target_count };
}

// ---------- submit & results ----------

function finaliseAssessment(db: Db, a: ActivityRow): void {
  if (a.status !== 'in_progress') return;
  const at = now();
  tx(db, () => {
    const questions = all<QuestionRow>(db, 'SELECT * FROM question_instances WHERE activity_id = ? ORDER BY position', a.id);
    const responses = responsesFor(db, a.id);
    for (const q of questions) {
      const secret = JSON.parse(q.secret) as Secret;
      let r = responses.get(q.id);
      if (!r) {
        const rid = newId('rsp');
        run(db, `INSERT INTO responses (id, question_id, activity_id, user_id, skill_id, response, skipped, time_ms, created_at) VALUES (?, ?, ?, ?, ?, NULL, 0, 0, ?)`, rid, q.id, a.id, a.user_id, q.skill_id, at.toISOString());
        r = one<ResponseRow>(db, 'SELECT * FROM responses WHERE id = ?', rid) as ResponseRow;
      }
      const state = getState(db, a.user_id, q.skill_id);
      let correct = false;
      let mistake: string | null = null;
      let feedback: string | null = null;
      if (r.response !== null && !r.skipped) {
        const g = grade(q, secret, JSON.parse(r.response) as ResponseValue, state.rating);
        correct = g.correct;
        mistake = g.mistake;
        feedback = g.feedback ?? null;
      }
      const score = correct ? 1 : 0;
      const after = updateRating({ rating: state.rating, evidence: state.evidence, level: q.difficulty as Difficulty, score, mode: 'assessment' });
      saveState(db, a.user_id, { ...state, rating: after, evidence: state.evidence + 1, attempts: state.attempts + 1, correct: state.correct + score, lastPracticedAt: at.toISOString() });
      run(db, 'UPDATE responses SET is_correct = ?, score = ?, mistake_code = ?, feedback = ?, rating_before = ?, rating_after = ?, graded_at = ? WHERE id = ?', correct ? 1 : 0, score, mistake, feedback, state.rating, after, at.toISOString(), r.id);
    }
    run(db, `UPDATE activities SET status = 'completed', completed_at = ? WHERE id = ?`, at.toISOString(), a.id);
    if (a.kind === 'baseline') run(db, 'UPDATE learner_profiles SET baseline_completed_at = ? WHERE user_id = ?', at.toISOString(), a.user_id);
  });
  const summary = buildResults(db, loadActivityRaw(db, a.id));
  run(db, 'UPDATE activities SET summary = ? WHERE id = ?', JSON.stringify(summary), a.id);
}

function loadActivityRaw(db: Db, id: string): ActivityRow {
  return one<ActivityRow>(db, 'SELECT * FROM activities WHERE id = ?', id) as ActivityRow;
}

export function submitActivity(db: Db, user: UserDto, id: string): ResultsDto {
  const a = loadActivity(db, user, id);
  if (a.status === 'completed') return getResults(db, user, id);
  if (a.status !== 'in_progress') throw new HttpError(409, 'finished', 'This activity was abandoned.');
  if (a.mode === 'assessment') {
    finaliseAssessment(db, a);
    return getResults(db, user, id);
  }
  const at = now();
  const answered = (one<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM responses WHERE activity_id = ?', a.id) as { n: number }).n;
  tx(db, () => {
    // Unanswered generated questions are discarded: practice only counts what you actually answered.
    run(db, 'DELETE FROM question_instances WHERE activity_id = ? AND id NOT IN (SELECT question_id FROM responses WHERE activity_id = ?)', a.id, a.id);
    if (a.kind === 'lesson') {
      const skillId = (JSON.parse(a.skill_ids) as string[])[0] as string;
      const lessonId = getSkill(skillId)?.lessonId ?? skillId;
      run(db, 'INSERT INTO lesson_progress (user_id, lesson_id, completed_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING', user.id, lessonId, at.toISOString());
    }
    run(db, `UPDATE activities SET status = ?, completed_at = ? WHERE id = ?`, answered === 0 && a.kind === 'practice' ? 'abandoned' : 'completed', at.toISOString(), a.id);
  });
  if (answered === 0 && a.kind === 'practice') throw new HttpError(422, 'empty', 'Nothing was answered, so there are no results.');
  const summary = buildResults(db, loadActivityRaw(db, a.id));
  run(db, 'UPDATE activities SET summary = ? WHERE id = ?', JSON.stringify(summary), a.id);
  return summary;
}

export function getResults(db: Db, user: UserDto, id: string): ResultsDto {
  const a = loadActivity(db, user, id);
  if (a.status !== 'completed') throw new HttpError(409, 'not_finished', 'Results are available once you submit.');
  if (a.summary) return JSON.parse(a.summary) as ResultsDto;
  const summary = buildResults(db, a);
  run(db, 'UPDATE activities SET summary = ? WHERE id = ?', JSON.stringify(summary), a.id);
  return summary;
}

function buildResults(db: Db, a: ActivityRow): ResultsDto {
  const questions = all<QuestionRow>(db, 'SELECT * FROM question_instances WHERE activity_id = ? ORDER BY position', a.id);
  const responses = responsesFor(db, a.id);
  const items: ReviewItem[] = [];
  const perSkill = new Map<string, { correct: number; total: number; before: number | null; after: number | null; sureWrong: number; codes: Map<string, number> }>();
  const mistakes = new Map<string, number>();
  let sureWrong = 0;
  let unsureRight = 0;
  let withConfidence = 0;

  for (const q of questions) {
    const r = responses.get(q.id);
    if (!r) continue;
    const secret = JSON.parse(q.secret) as Secret;
    const correct = r.is_correct === 1;
    items.push({
      question: payloadOf(q),
      response: r.response ? (JSON.parse(r.response) as ResponseValue) : null,
      skipped: r.skipped === 1,
      correct,
      mistake: mistakeDto(r.mistake_code),
      feedback: r.feedback,
      answerDisplay: secret.answerDisplay,
      solution: secret.solution,
      timeMs: r.time_ms,
      confidence: r.confidence,
    });
    const s = perSkill.get(q.skill_id) ?? { correct: 0, total: 0, before: null, after: null, sureWrong: 0, codes: new Map() };
    s.total++;
    if (correct) s.correct++;
    if (s.before === null && r.rating_before !== null) s.before = r.rating_before;
    if (r.rating_after !== null) s.after = r.rating_after;
    if (r.mistake_code) {
      mistakes.set(r.mistake_code, (mistakes.get(r.mistake_code) ?? 0) + 1);
      s.codes.set(r.mistake_code, (s.codes.get(r.mistake_code) ?? 0) + 1);
    }
    if (r.confidence) {
      withConfidence++;
      if (r.confidence === 'sure' && !correct) {
        sureWrong++;
        s.sureWrong++;
      }
      if (r.confidence !== 'sure' && correct) unsureRight++;
    }
    perSkill.set(q.skill_id, s);
  }

  const perTopic = new Map<string, { correct: number; total: number }>();
  for (const [skillId, s] of perSkill) {
    const topicId = getSkill(skillId)?.topicId ?? 'other';
    const t = perTopic.get(topicId) ?? { correct: 0, total: 0 };
    t.correct += s.correct;
    t.total += s.total;
    perTopic.set(topicId, t);
  }

  let biggest: ResultsDto['biggestOpportunity'] = null;
  let bestScore = 0;
  for (const [skillId, s] of perSkill) {
    const lost = s.total - s.correct;
    if (lost === 0) continue;
    const after = s.after === null ? 0 : masteryPercent(s.after);
    const sc = lost * (1.2 - after / 100) + s.sureWrong * 0.5;
    if (sc > bestScore) {
      bestScore = sc;
      const name = getSkill(skillId)?.name ?? skillId;
      const topCode = [...s.codes.entries()].sort((x, y) => y[1] - x[1])[0];
      let reason = `You dropped ${lost} of ${s.total} mark${s.total > 1 ? 's' : ''} here`;
      if (s.sureWrong > 0) reason += `, and you were sure about ${s.sureWrong} of those answers. Confident mistakes usually mean a misconception, so fix this one first.`;
      else if (topCode && topCode[1] >= 2) reason += `. Most were the same mistake: ${mistakeInfo(topCode[0])?.label.toLowerCase() ?? topCode[0]}.`;
      else reason += '. A focused practice set will target exactly this.';
      biggest = { skillId, name, reason };
    }
  }

  const correctTotal = items.filter((i) => i.correct).length;
  const end = a.completed_at ? new Date(a.completed_at) : now();
  const timeTakenSec = a.mode === 'assessment' ? Math.round((end.getTime() - new Date(a.started_at).getTime()) / 1000) : Math.round(items.reduce((s, i) => s + i.timeMs, 0) / 1000);
  return {
    activityId: a.id,
    kind: a.kind,
    title: a.title,
    completedAt: a.completed_at ?? end.toISOString(),
    scorePct: items.length ? Math.round((100 * correctTotal) / items.length) : 0,
    correct: correctTotal,
    total: items.length,
    timeTakenSec,
    perTopic: [...perTopic.entries()].map(([topicId, t]) => ({ topicId, name: getTopic(topicId)?.name ?? topicId, correct: t.correct, total: t.total, pct: Math.round((100 * t.correct) / t.total) })).sort((x, y) => y.pct - x.pct),
    perSkill: [...perSkill.entries()].map(([skillId, s]) => ({
      skillId,
      name: getSkill(skillId)?.name ?? skillId,
      correct: s.correct,
      total: s.total,
      masteryBefore: s.before === null ? 0 : masteryPercent(s.before),
      masteryAfter: s.after === null ? 0 : masteryPercent(s.after),
    })),
    mistakes: [...mistakes.entries()].map(([code, count]) => ({ ...(mistakeDto(code) as MistakeDto), count })).filter((m) => m.label).sort((x, y) => y.count - x.count),
    calibration: withConfidence > 0 ? { sureWrong, unsureRight, answeredWithConfidence: withConfidence } : null,
    biggestOpportunity: biggest,
    items,
  };
}

export function listActivities(db: Db, user: UserDto, kinds: ActivityDto['kind'][]): (ActivityDto & { scorePct: number | null })[] {
  const placeholders = kinds.map(() => '?').join(',');
  return all<ActivityRow>(db, `SELECT * FROM activities WHERE user_id = ? AND kind IN (${placeholders}) AND status != 'abandoned' ORDER BY started_at DESC LIMIT 50`, user.id, ...kinds).map((a) => ({
    ...toDto(a),
    scorePct: a.summary ? (JSON.parse(a.summary) as ResultsDto).scorePct : null,
  }));
}

export { localDay };
