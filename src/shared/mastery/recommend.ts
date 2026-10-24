/**
 * "What should I do right now?" — ranks every relevant skill and explains why, in plain words.
 * Inputs are plain data so this stays pure and testable.
 */
import { SKILLS, getSkill, getTopic, skillsForLearner, type Skill, type SubjectId } from '../curriculum/catalogue.ts';
import { band, effectiveMastery, retention, reviewDue, type MasteryBand, type SkillState } from './model.ts';

export type RecAction = 'learn' | 'practice' | 'review';

export interface Recommendation {
  skillId: string;
  action: RecAction;
  score: number;
  reasons: string[];
  mastery: number;
  band: MasteryBand;
  estMinutes: number;
}

export interface RecommendInput {
  grade: number;
  subjects: SubjectId[];
  states: Map<string, SkillState>;
  /** Mistakes per skill in the last 14 days. */
  recentMistakes: Map<string, number>;
  lessonsCompleted: Set<string>;
  exam?: { title: string; examDate: string; skillIds: string[] } | null;
  now: Date;
}

const MINUTES: Record<RecAction, number> = { learn: 10, practice: 12, review: 6 };

export function daysUntil(dateIso: string, now: Date): number {
  const d = new Date(`${dateIso.slice(0, 10)}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

function prerequisitesReady(skill: Skill, input: RecommendInput): { ready: boolean; secure: string[] } {
  const secure: string[] = [];
  for (const pid of skill.prerequisites) {
    const p = getSkill(pid);
    if (!p) continue;
    const st = input.states.get(pid);
    const m = effectiveMastery(st, input.now);
    if (m >= 50) secure.push(p.name);
    else if (!st || st.evidence === 0) {
      // Never assessed here: assume learners already have skills taught two or more grades earlier.
      if (p.grade > input.grade - 2) return { ready: false, secure };
    } else return { ready: false, secure };
  }
  return { ready: true, secure };
}

/**
 * Skills worth considering: the learner's grade band, plus anything they have already started
 * or put on an exam, even outside the band (a Grade 7 who chose to learn Grade 10 atoms keeps getting it).
 */
function candidates(input: Pick<RecommendInput, 'subjects' | 'grade' | 'states'> & { exam?: RecommendInput['exam'] }): Skill[] {
  const base = skillsForLearner(input.subjects, input.grade);
  const ids = new Set(base.map((s) => s.id));
  const extra = SKILLS.filter((s) => !ids.has(s.id) && ((input.states.get(s.id)?.evidence ?? 0) > 0 || (input.exam?.skillIds.includes(s.id) ?? false)));
  return [...base, ...extra];
}

/** The most specific reason leads; the exam (shown elsewhere too) comes last. */
const withExam = (reasons: string[], exam: string | null): string[] => (exam ? [...reasons, exam] : reasons);

export function recommend(input: RecommendInput): Recommendation[] {
  const { now } = input;
  const skills = candidates(input);
  const examDays = input.exam ? daysUntil(input.exam.examDate, now) : null;
  const started = skills.filter((s) => (input.states.get(s.id)?.evidence ?? 0) > 0);
  const weakest = new Set(
    started
      .map((s) => ({ id: s.id, m: effectiveMastery(input.states.get(s.id), now) }))
      .filter((x) => x.m < 70)
      .sort((a, b) => a.m - b.m)
      .slice(0, 3)
      .map((x) => x.id),
  );

  const recs: Recommendation[] = [];
  for (const skill of skills) {
    const st = input.states.get(skill.id);
    const m = effectiveMastery(st, now);
    const b = band(st, now);
    const reasons: string[] = [];
    const onExam = input.exam && examDays !== null && examDays >= 0 && input.exam.skillIds.includes(skill.id);
    const examBoost = onExam ? 1 + 1.5 * Math.min(1, Math.max(0, 1 - (examDays as number) / 45)) : 1;
    const examReason = onExam ? `Your ${input.exam!.title} is ${examDays === 0 ? 'today' : examDays === 1 ? 'tomorrow' : `in ${examDays} days`}, and this is on it.` : null;
    const mistakes = input.recentMistakes.get(skill.id) ?? 0;

    if (b === 'not-started') {
      const pre = prerequisitesReady(skill, input);
      if (!pre.ready) continue;
      const gradeFit = skill.grade === input.grade ? 1 : skill.grade < input.grade ? 0.85 : 0.6;
      const action: RecAction = input.lessonsCompleted.has(skill.id) ? 'practice' : 'learn';
      reasons.push(pre.secure.length ? `New for you, and you're ready: ${pre.secure.join(' and ')} ${pre.secure.length > 1 ? 'are' : 'is'} secure.` : `New for you, and part of ${getTopic(skill.topicId)?.name.toLowerCase()}.`);
      recs.push({ skillId: skill.id, action, score: 0.45 * gradeFit * examBoost, reasons: withExam(reasons, examReason), mastery: 0, band: b, estMinutes: MINUTES[action] });
      continue;
    }

    if (reviewDue(st, now)) {
      const days = Math.round((now.getTime() - new Date(st!.lastPracticedAt as string).getTime()) / 86_400_000);
      reasons.push(`You last practised this ${days} days ago. A short review now locks it in before it fades.`);
      recs.push({ skillId: skill.id, action: 'review', score: (0.35 + (1 - retention(st!, now))) * examBoost, reasons: withExam(reasons, examReason), mastery: m, band: b, estMinutes: MINUTES.review });
      continue;
    }

    if (b === 'mastered') continue;

    if (weakest.has(skill.id)) reasons.push(`At ${m}% mastery, this is one of your weakest skills right now.`);
    if (mistakes >= 2) reasons.push(`You've made ${mistakes} mistakes here in the last two weeks. They're worth fixing while they're fresh.`);
    if (reasons.length === 0 && !examReason) reasons.push(`You're at ${m}%. Proficient starts at 70%.`);
    const action: RecAction = m < 40 && !input.lessonsCompleted.has(skill.id) ? 'learn' : 'practice';
    const score = (1 - m / 100) * examBoost + 0.06 * Math.min(mistakes, 5) + (weakest.has(skill.id) ? 0.1 : 0);
    recs.push({ skillId: skill.id, action, score, reasons: withExam(reasons, examReason), mastery: m, band: b, estMinutes: MINUTES[action] });
  }
  return recs.sort((a, b) => b.score - a.score);
}

/** Started skills below Proficient, weakest first. */
export function weakAreas(input: Pick<RecommendInput, 'states' | 'now' | 'subjects' | 'grade'>, limit = 4): { skillId: string; mastery: number }[] {
  return candidates(input)
    .filter((s) => (input.states.get(s.id)?.evidence ?? 0) > 0)
    .map((s) => ({ skillId: s.id, mastery: effectiveMastery(input.states.get(s.id), input.now) }))
    .filter((x) => x.mastery < 70)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, limit);
}
