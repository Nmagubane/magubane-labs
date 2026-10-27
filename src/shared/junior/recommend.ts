/**
 * Junior "what next?": one suggestion per subject, chosen in curriculum order, so a child (or the adult
 * beside them) never faces a long menu. Pure and testable, like the senior recommender.
 */
import { SKILLS, subjectOfSkill, getSkill, type Skill, type SubjectId } from '../curriculum/catalogue.ts';
import { foundationKey } from '../curriculum/foundation.ts';
import { band, effectiveMastery, reviewDue, type MasteryBand, type SkillState } from '../mastery/model.ts';

export type JuniorReason = 'catch-up' | 'review' | 'continue' | 'new' | 'practise';

export interface JuniorPick {
  skillId: string;
  subjectId: SubjectId;
  reason: JuniorReason;
  mastery: number;
  band: MasteryBand;
}

export interface JuniorInput {
  grade: number;
  subjects: SubjectId[];
  states: Map<string, SkillState>;
  /** Skill ids of the last few sessions, newest first, to avoid the same thing three times running. */
  recentSkillIds: string[];
  now: Date;
}

/** Curriculum order for a subject and grade (the order skills are listed in foundation.ts). */
export function juniorSkills(subject: SubjectId, grade: number): Skill[] {
  return SKILLS.filter((s) => s.phase === 'foundation' && s.grade === grade && subjectOfSkill(s) === subject);
}

const pickOf = (s: Skill, reason: JuniorReason, input: JuniorInput): JuniorPick => {
  const st = input.states.get(s.id);
  return { skillId: s.id, subjectId: subjectOfSkill(s), reason, mastery: effectiveMastery(st, input.now), band: band(st, input.now) };
};

export function juniorNext(input: JuniorInput, subject: SubjectId): JuniorPick | null {
  const current = juniorSkills(subject, input.grade);
  if (!current.length) return null;
  const st = (s: Skill) => input.states.get(s.id);
  const m = (s: Skill) => effectiveMastery(st(s), input.now);
  // The same skill two sessions running is fine; a third time in a row is not: interleave.
  const r = input.recentSkillIds;
  const tooRecent = new Set(r.length >= 2 && r[0] === r[1] ? [r[0]!] : []);

  // 1. Catch up: last grade's version of a skill that has clearly not landed yet.
  if (input.grade > 1) {
    for (const s of current) {
      const prev = getSkill(`fp-${foundationKey(s.id)}-g${input.grade - 1}`);
      const ps = prev ? st(prev) : undefined;
      if (prev && ps && ps.evidence >= 3 && m(prev) < 40 && !tooRecent.has(prev.id)) return pickOf(prev, 'catch-up', input);
    }
  }
  // 2. Review: something learnt that is fading.
  const due = current.find((s) => reviewDue(st(s), input.now) && !tooRecent.has(s.id));
  if (due) return pickOf(due, 'review', input);
  // 3. Continue: the most recently practised skill that is not yet strong (finish what you started),
  //    unless it was the last two sessions in a row.
  const started = current
    .filter((s) => (st(s)?.evidence ?? 0) > 0 && m(s) < 70 && !tooRecent.has(s.id))
    .sort((a, b) => (st(b)?.lastPracticedAt ?? '').localeCompare(st(a)?.lastPracticedAt ?? ''));
  if (started[0]) return pickOf(started[0], 'continue', input);
  // 4. New: the next skill in curriculum order.
  const fresh = current.find((s) => (st(s)?.evidence ?? 0) === 0 && !tooRecent.has(s.id));
  if (fresh) return pickOf(fresh, 'new', input);
  // 5. Everything started and strong: practise the weakest.
  const weakest = current.filter((s) => !tooRecent.has(s.id)).sort((a, b) => m(a) - m(b))[0] ?? current[0]!;
  return pickOf(weakest, 'practise', input);
}

/** One suggestion per subject, in the order the subjects are given. */
export function juniorPlan(input: JuniorInput): JuniorPick[] {
  return input.subjects.map((s) => juniorNext(input, s)).filter((p): p is JuniorPick => !!p);
}

/** For adults: a sentence saying why this was suggested. */
export const REASON_TEXT: Record<JuniorReason, string> = {
  'catch-up': 'From last grade, and not secure yet. Strong foundations first.',
  review: 'Learnt before and starting to fade. A short review keeps it.',
  continue: 'Started and still growing.',
  new: 'Next in the curriculum.',
  practise: 'Everything this grade is going well; this is the weakest one.',
};
