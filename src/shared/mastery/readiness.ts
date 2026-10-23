/**
 * Exam readiness and an adaptive study plan.
 * Unassessed skills count as "probably not ready" (prior 0.3) rather than being ignored —
 * a readiness score that ignores what you haven't tried would be flattering and wrong.
 */
import { getSkill } from '../curriculum/catalogue.ts';
import { effectiveMastery, type SkillState } from './model.ts';
import { daysUntil } from './recommend.ts';

const PRIOR = 0.3;
const FULL_CONFIDENCE_EVIDENCE = 8;

export interface SkillReadiness {
  skillId: string;
  mastery: number;
  /** 0–1: how much evidence backs the mastery number. */
  confidence: number;
  readiness: number;
}

export interface Readiness {
  score: number;
  confidence: 'low' | 'medium' | 'high';
  assessed: number;
  total: number;
  answers: number;
  strong: SkillReadiness[];
  needsWork: SkillReadiness[];
  highRisk: SkillReadiness[];
  perSkill: SkillReadiness[];
  daysLeft: number;
}

export function computeReadiness(skillIds: string[], states: Map<string, SkillState>, examDate: string, now: Date): Readiness {
  const perSkill = skillIds.map<SkillReadiness>((id) => {
    const st = states.get(id);
    const mastery = effectiveMastery(st, now);
    const confidence = Math.min(1, (st?.evidence ?? 0) / FULL_CONFIDENCE_EVIDENCE);
    return { skillId: id, mastery, confidence, readiness: (mastery / 100) * confidence + PRIOR * (1 - confidence) };
  });
  const n = Math.max(1, perSkill.length);
  const score = Math.round((100 * perSkill.reduce((s, x) => s + x.readiness, 0)) / n);
  const meanConf = perSkill.reduce((s, x) => s + x.confidence, 0) / n;
  const highRisk = perSkill.filter((x) => x.confidence < 0.25 || x.mastery < 50);
  const strong = perSkill.filter((x) => !highRisk.includes(x) && x.mastery >= 80 && x.confidence >= 0.5);
  const needsWork = perSkill.filter((x) => !highRisk.includes(x) && !strong.includes(x));
  const byNeed = (a: SkillReadiness, b: SkillReadiness) => a.readiness - b.readiness;
  return {
    score,
    confidence: meanConf >= 0.75 ? 'high' : meanConf >= 0.4 ? 'medium' : 'low',
    assessed: perSkill.filter((x) => x.confidence > 0).length,
    total: perSkill.length,
    answers: skillIds.reduce((s, id) => s + (states.get(id)?.evidence ?? 0), 0),
    strong: strong.sort((a, b) => b.mastery - a.mastery),
    needsWork: needsWork.sort(byNeed),
    highRisk: highRisk.sort(byNeed),
    perSkill,
    daysLeft: daysUntil(examDate, now),
  };
}

export type PlanAction = 'learn' | 'practice' | 'test' | 'review' | 'mock';

export interface PlanItem {
  action: PlanAction;
  skillId: string | null;
  minutes: number;
  label: string;
}

export interface PlanDay {
  date: string;
  items: PlanItem[];
}

export interface StudyPlan {
  days: PlanDay[];
  /** Skills that needed work but didn't fit before the exam. */
  overflow: string[];
}

const SESSION_MINUTES: Record<PlanAction, number> = { learn: 10, practice: 12, test: 10, review: 6, mock: 30 };

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function label(action: PlanAction, skillId: string | null): string {
  const name = skillId ? (getSkill(skillId)?.name ?? skillId) : '';
  switch (action) {
    case 'learn':
      return `Learn: ${name}`;
    case 'practice':
      return `Practise: ${name}`;
    case 'test':
      return `Quick test: ${name}`;
    case 'review':
      return `Review: ${name}`;
    case 'mock':
      return 'Mock exam: Everything on the exam, timed';
  }
}

/**
 * Rebuilt from current mastery on every view, so it adapts as the learner improves.
 * Sessions are interleaved across skills (spacing beats cramming one topic per day).
 */
export function buildPlan(readiness: Readiness, opts: { now: Date; dailyMinutes: number; lessonsCompleted: Set<string>; horizonDays?: number }): StudyPlan {
  const { now } = opts;
  const daysLeft = readiness.daysLeft;
  if (daysLeft <= 0) return { days: [], overflow: [] };
  const horizon = Math.min(daysLeft, opts.horizonDays ?? 21);
  const perDay = Math.min(4, Math.max(1, Math.floor(opts.dailyMinutes / 12)));

  const queues = [...readiness.perSkill]
    .sort((a, b) => a.readiness - b.readiness)
    .map((s) => {
      const steps: PlanAction[] = [];
      if (s.confidence === 0) steps.push(opts.lessonsCompleted.has(s.skillId) ? 'practice' : 'learn', 'practice', 'test');
      else if (s.mastery < 50) steps.push('practice', 'practice', 'test');
      else if (s.mastery < 80 || s.confidence < 0.5) steps.push('practice', 'test');
      else steps.push('review');
      return { skillId: s.skillId, steps };
    });

  // Round-robin interleave
  const sequence: PlanItem[] = [];
  for (let round = 0; queues.some((q) => q.steps.length > round); round++) {
    for (const q of queues) {
      const action = q.steps[round];
      if (action) sequence.push({ action, skillId: q.skillId, minutes: SESSION_MINUTES[action], label: label(action, q.skillId) });
    }
  }

  const reserveMock = daysLeft >= 3 && horizon === daysLeft;
  const studyDays = reserveMock ? horizon - 1 : horizon;
  const days: PlanDay[] = [];
  let cursor = 0;
  for (let i = 0; i < horizon; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const items: PlanItem[] = [];
    if (reserveMock && i === horizon - 1) {
      items.push({ action: 'mock', skillId: null, minutes: SESSION_MINUTES.mock, label: label('mock', null) });
    } else if (i < studyDays) {
      for (let k = 0; k < perDay && cursor < sequence.length; k++) items.push(sequence[cursor++] as PlanItem);
      // Queue done: keep weak skills warm with short spaced reviews.
      const byNeed = [...readiness.perSkill].sort((a, b) => a.readiness - b.readiness);
      for (let k = 0; items.length < perDay && byNeed.length && k < perDay; k++) {
        const s = byNeed[(i * perDay + k) % byNeed.length] as SkillReadiness;
        if (!items.some((it) => it.skillId === s.skillId)) items.push({ action: 'review', skillId: s.skillId, minutes: SESSION_MINUTES.review, label: label('review', s.skillId) });
      }
    }
    days.push({ date: isoDate(date), items });
  }
  const scheduled = new Set(sequence.slice(0, cursor).map((s) => s.skillId));
  const overflow = [...new Set(sequence.slice(cursor).map((s) => s.skillId as string))].filter((id) => !scheduled.has(id));
  return { days, overflow };
}
