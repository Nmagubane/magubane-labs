/** Learner profile and per-skill state persistence. */
import type { Db } from './db.ts';
import { all, one, run } from './db.ts';
import { now } from './config.ts';
import type { ProfileDto, Goal } from '../shared/api.ts';
import type { CurriculumId, SubjectId } from '../shared/curriculum/catalogue.ts';
import { INITIAL_RATING, masteryPercent, effectiveMastery, band, reviewDue, type SkillState } from '../shared/mastery/model.ts';
import type { SkillSummary } from '../shared/api.ts';
import { isLanguageCode, type LanguageCode } from '../shared/junior/languages.ts';

interface ProfileRow {
  grade: number;
  curriculum_id: string;
  subjects: string;
  goals: string;
  daily_minutes: number;
  baseline_completed_at: string | null;
  home_language: string | null;
}

export interface Profile extends ProfileDto {}

export function getProfile(db: Db, userId: string): Profile | null {
  const r = one<ProfileRow>(db, 'SELECT * FROM learner_profiles WHERE user_id = ?', userId);
  if (!r) return null;
  return {
    grade: r.grade,
    curriculumId: r.curriculum_id as CurriculumId,
    subjects: JSON.parse(r.subjects) as SubjectId[],
    goals: JSON.parse(r.goals) as Goal[],
    dailyMinutes: r.daily_minutes,
    baselineCompleted: r.baseline_completed_at !== null,
    ...(r.grade <= 3 ? { homeLanguage: (isLanguageCode(r.home_language ?? '') ? r.home_language : 'en') as LanguageCode } : {}),
  };
}

export function saveProfile(db: Db, userId: string, p: Omit<Profile, 'baselineCompleted'>): void {
  run(
    db,
    `INSERT INTO learner_profiles (user_id, grade, curriculum_id, subjects, goals, daily_minutes, onboarded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET grade = excluded.grade, curriculum_id = excluded.curriculum_id,
       subjects = excluded.subjects, goals = excluded.goals, daily_minutes = excluded.daily_minutes`,
    userId,
    p.grade,
    p.curriculumId,
    JSON.stringify(p.subjects),
    JSON.stringify(p.goals),
    p.dailyMinutes,
    now().toISOString(),
  );
}

interface StateRow {
  skill_id: string;
  rating: number;
  evidence: number;
  attempts: number;
  correct: number;
  last_practiced_at: string | null;
}

const toState = (r: StateRow): SkillState => ({
  skillId: r.skill_id,
  rating: r.rating,
  evidence: r.evidence,
  attempts: r.attempts,
  correct: r.correct,
  lastPracticedAt: r.last_practiced_at,
});

export function getStates(db: Db, userId: string): Map<string, SkillState> {
  return new Map(all<StateRow>(db, 'SELECT * FROM skill_states WHERE user_id = ?', userId).map((r) => [r.skill_id, toState(r)]));
}

export function getState(db: Db, userId: string, skillId: string): SkillState {
  const r = one<StateRow>(db, 'SELECT * FROM skill_states WHERE user_id = ? AND skill_id = ?', userId, skillId);
  return r ? toState(r) : { skillId, rating: INITIAL_RATING, evidence: 0, attempts: 0, correct: 0, lastPracticedAt: null };
}

/** Persist a state change and the day's mastery snapshot (for trends). */
export function saveState(db: Db, userId: string, s: SkillState): void {
  run(
    db,
    `INSERT INTO skill_states (user_id, skill_id, rating, evidence, attempts, correct, last_practiced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, skill_id) DO UPDATE SET rating = excluded.rating, evidence = excluded.evidence,
       attempts = excluded.attempts, correct = excluded.correct, last_practiced_at = excluded.last_practiced_at`,
    userId,
    s.skillId,
    s.rating,
    s.evidence,
    s.attempts,
    s.correct,
    s.lastPracticedAt,
  );
  run(
    db,
    `INSERT INTO mastery_snapshots (user_id, skill_id, day, mastery) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, skill_id, day) DO UPDATE SET mastery = excluded.mastery`,
    userId,
    s.skillId,
    localDay(now()),
    masteryPercent(s.rating),
  );
}

export function summarise(s: SkillState | undefined, skillId: string, at: Date): SkillSummary {
  return {
    skillId,
    mastery: effectiveMastery(s, at),
    band: band(s, at),
    evidence: s?.evidence ?? 0,
    lastPracticedAt: s?.lastPracticedAt ?? null,
    reviewDue: reviewDue(s, at),
  };
}

export function lessonsCompleted(db: Db, userId: string): Set<string> {
  return new Set(all<{ lesson_id: string }>(db, 'SELECT lesson_id FROM lesson_progress WHERE user_id = ?', userId).map((r) => r.lesson_id));
}

/** Mistakes per skill over the last `days` days. */
export function recentMistakes(db: Db, userId: string, days = 14): Map<string, number> {
  const since = new Date(now().getTime() - days * 86_400_000).toISOString();
  const rows = all<{ skill_id: string; n: number }>(
    db,
    `SELECT skill_id, COUNT(*) AS n FROM responses WHERE user_id = ? AND is_correct = 0 AND skipped = 0 AND graded_at >= ? GROUP BY skill_id`,
    userId,
    since,
  );
  return new Map(rows.map((r) => [r.skill_id, r.n]));
}

/** YYYY-MM-DD in the server's local time zone (SAST for a South African deployment). */
export function localDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
