import { daysUntil } from './mastery/recommend.ts';

/** An exam can be from tomorrow up to a year ahead: the plan needs at least one day to work with. */
export const EXAM_MAX_DAYS = 366;

/** A local calendar day as YYYY-MM-DD (not UTC: just after midnight in South Africa it is still yesterday in UTC). */
export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function spoken(d: Date): string {
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Why an exam date can't be used, in words a learner can act on; null when it is fine. */
export function examDateProblem(value: string, now: Date): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Choose the date of your exam.';
  const days = daysUntil(value, now);
  if (Number.isNaN(days)) return 'Choose the date of your exam.';
  if (days < 0) return `That date has passed. Choose a date from tomorrow, ${spoken(addDays(now, 1))}.`;
  if (days === 0) return 'That’s today. Your plan needs at least a day, so choose tomorrow or later.';
  if (days > EXAM_MAX_DAYS) return `That’s more than a year away. Choose a date up to ${spoken(addDays(now, EXAM_MAX_DAYS))}.`;
  return null;
}
