/**
 * Learner model. One rating θ per skill, updated after every answer (Elo / 1-PL IRT style).
 * Deliberately simple, explainable and testable. Every number shown to a learner comes from here.
 */
import type { Difficulty } from '../questions/types.ts';

export interface SkillState {
  skillId: string;
  rating: number;
  /** Number of graded answers that informed the rating. */
  evidence: number;
  attempts: number;
  correct: number;
  lastPracticedAt: string | null;
}

export type MasteryBand = 'not-started' | 'learning' | 'developing' | 'proficient' | 'mastered';

export const INITIAL_RATING = -1;
const RATING_MIN = -3;
const RATING_MAX = 3.5;
const DIFFICULTY_B: Record<Difficulty, number> = { 1: -1.5, 2: -0.75, 3: 0, 4: 0.75, 5: 1.5 };

const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

export function pCorrect(rating: number, level: Difficulty): number {
  return sigmoid(rating - DIFFICULTY_B[level]);
}

/** Credit for an answer: hints reduce it; an "I haven't learnt this" skip counts as 0. */
export function answerScore(correct: boolean, hintsUsed: number): number {
  if (!correct) return 0;
  return Math.max(0.4, 1 - 0.25 * hintsUsed);
}

export interface UpdateInput {
  rating: number;
  evidence: number;
  level: Difficulty;
  score: number;
  /** Assessment answers are stronger evidence than practice with feedback. */
  mode: 'learning' | 'assessment';
}

export function updateRating({ rating, evidence, level, score, mode }: UpdateInput): number {
  const p = pCorrect(rating, level);
  const k = Math.max(0.25, 0.9 / Math.sqrt(1 + evidence / 2)) * (mode === 'assessment' ? 1.15 : 1);
  return Math.min(RATING_MAX, Math.max(RATING_MIN, rating + k * (score - p)));
}

/** 0–100. You need to be reliably right at levels 4–5 to approach 100. */
export function masteryPercent(rating: number): number {
  return Math.round(100 * sigmoid(1.5 * (rating - 0.5)));
}

/**
 * Retention: how much of the mastery we expect is still there after `days` without practice.
 * Stability grows with evidence and with mastery itself. Floor at 0.7 — skills fade, they don't vanish.
 */
export function retention(state: Pick<SkillState, 'evidence' | 'rating' | 'lastPracticedAt'>, now: Date): number {
  if (!state.lastPracticedAt) return 1;
  const days = Math.max(0, (now.getTime() - new Date(state.lastPracticedAt).getTime()) / 86_400_000);
  const m = masteryPercent(state.rating) / 100;
  const stability = 20 * (1 + Math.min(state.evidence, 40) / 10) * (0.5 + m);
  return Math.max(0.7, Math.exp(-days / stability));
}

export function effectiveMastery(state: SkillState | undefined, now: Date): number {
  if (!state || state.evidence === 0) return 0;
  return Math.round(masteryPercent(state.rating) * retention(state, now));
}

export function band(state: SkillState | undefined, now: Date): MasteryBand {
  if (!state || state.evidence === 0) return 'not-started';
  const m = effectiveMastery(state, now);
  if (m >= 85 && state.evidence >= 8) return 'mastered';
  if (m >= 70) return 'proficient';
  if (m >= 40) return 'developing';
  return 'learning';
}

export const BAND_LABEL: Record<MasteryBand, string> = {
  'not-started': 'Not started',
  learning: 'Learning',
  developing: 'Developing',
  proficient: 'Proficient',
  mastered: 'Mastered',
};

export function reviewDue(state: SkillState | undefined, now: Date): boolean {
  if (!state || state.evidence < 3) return false;
  return masteryPercent(state.rating) >= 60 && retention(state, now) < 0.85;
}

/** Pick the difficulty whose success chance is closest to `target` (desirable difficulty ≈ 70%). */
export function chooseLevel(rating: number, target = 0.7, offset = 0): Difficulty {
  const levels: Difficulty[] = [1, 2, 3, 4, 5];
  let best: Difficulty = 1;
  let bestGap = Infinity;
  for (const l of levels) {
    const gap = Math.abs(pCorrect(rating, l) - target);
    if (gap < bestGap) {
      bestGap = gap;
      best = l;
    }
  }
  return Math.min(5, Math.max(1, best + offset)) as Difficulty;
}

/** Thresholds for the next band up, used for "about N more correct answers" estimates. */
const NEXT_BAND: { band: MasteryBand; at: number }[] = [
  { band: 'developing', at: 40 },
  { band: 'proficient', at: 70 },
  { band: 'mastered', at: 85 },
];

/**
 * Honest estimate: simulate correct answers at the level practice would choose until the next band.
 * Returns null if already mastered or it would take more than 20.
 */
export function correctAnswersToNextBand(state: SkillState | undefined, now: Date = new Date()): { band: MasteryBand; answers: number } | null {
  let rating = state?.rating ?? INITIAL_RATING;
  let evidence = state?.evidence ?? 0;
  // Measured from what the learner sees (effective mastery). Practising resets retention, so the
  // simulation itself uses the raw rating.
  const current = state && state.evidence > 0 ? effectiveMastery(state, now) : masteryPercent(rating);
  const target = NEXT_BAND.find((b) => b.at > current);
  if (!target) return null;
  for (let i = 1; i <= 20; i++) {
    const level = chooseLevel(rating);
    rating = updateRating({ rating, evidence, level, score: 1, mode: 'learning' });
    evidence++;
    if (masteryPercent(rating) >= target.at && (target.band !== 'mastered' || evidence >= 8)) return { band: target.band, answers: i };
  }
  return null;
}
