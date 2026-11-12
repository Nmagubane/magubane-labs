/**
 * CAPS school phases and the three Bonisa experiences built on them.
 *
 * Phases are the names South African teachers use, so labels follow CAPS exactly:
 * "Senior Phase" means Grades 7–9, never Grades 10–12.
 * Tiers are the product: one per genuinely different experience, not one per phase.
 */

export type PhaseId = 'foundation' | 'intermediate' | 'senior' | 'fet';
export type TierId = 'junior' | 'bonisa' | 'matric';

export interface Phase {
  id: PhaseId;
  name: string;
  from: number;
  to: number;
}

export interface Tier {
  id: TierId;
  /** The full product name, as it appears in the logo lockup. */
  name: string;
  /** The word after "Bonisa" in the lockup, if any. */
  suffix: string | null;
  from: number;
  to: number;
  phases: PhaseId[];
}

export const PHASES: Phase[] = [
  { id: 'foundation', name: 'Foundation Phase', from: 1, to: 3 },
  { id: 'intermediate', name: 'Intermediate Phase', from: 4, to: 6 },
  { id: 'senior', name: 'Senior Phase', from: 7, to: 9 },
  { id: 'fet', name: 'FET Phase', from: 10, to: 12 },
];

export const TIERS: Tier[] = [
  { id: 'junior', name: 'Bonisa Junior', suffix: 'Junior', from: 1, to: 3, phases: ['foundation'] },
  { id: 'bonisa', name: 'Bonisa', suffix: null, from: 4, to: 9, phases: ['intermediate', 'senior'] },
  { id: 'matric', name: 'Bonisa Matric', suffix: 'Matric', from: 10, to: 12, phases: ['fet'] },
];

const clamp = (grade: number) => Math.min(12, Math.max(1, Math.round(grade)));

export function phaseOf(grade: number): Phase {
  const g = clamp(grade);
  return PHASES.find((p) => g >= p.from && g <= p.to) as Phase;
}

export function tierOf(grade: number): Tier {
  const g = clamp(grade);
  return TIERS.find((t) => g >= t.from && g <= t.to) as Tier;
}

/** "Grade 8 · Senior Phase" */
export const gradeLabel = (grade: number): string => `Grade ${grade} · ${phaseOf(grade).name}`;

/** How far above their own grade a learner's working band reaches. */
export const BAND_AHEAD = 1;

/**
 * A skill beyond the learner's working band (Grades 4–12 only). Look-ahead skills can be
 * explored and practised as a preview: they never change mastery, never appear in tests or
 * recommendations, and never show to adults as a weakness. Assigned work is the exception.
 */
export function isLookAhead(skillGrade: number, learnerGrade: number): boolean {
  return learnerGrade >= 4 && skillGrade > learnerGrade + BAND_AHEAD;
}
