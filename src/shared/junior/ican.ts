/**
 * "I can…" statements: earned once, when a Grade 1–3 skill becomes secure, and kept.
 * Secure = Proficient (the child is reliably right at the middle levels of the grade) on enough answers
 * that one lucky set can't earn it.
 */
import { getSkill } from '../curriculum/catalogue.ts';
import { foundationKey } from '../curriculum/foundation.ts';
import { ICAN, icanShown, icanSaid } from './packs/en/ican.ts';

export const ICAN_AT_MASTERY = 70;
export const ICAN_MIN_ANSWERS = 6;

/** The phrase that follows "I can" for a skill, or null if it has none (senior skills). */
export function icanPhrase(skillId: string): string | null {
  const s = getSkill(skillId);
  if (!s || s.phase !== 'foundation') return null;
  return ICAN[foundationKey(skillId)]?.[s.grade as 1 | 2 | 3] ?? null;
}

export const icanText = (skillId: string): string | null => {
  const p = icanPhrase(skillId);
  return p ? icanShown(p) : null;
};
export const icanSpoken = (skillId: string): string | null => {
  const p = icanPhrase(skillId);
  return p ? icanSaid(p) : null;
};

export function icanReady(mastery: number, answers: number): boolean {
  return mastery >= ICAN_AT_MASTERY && answers >= ICAN_MIN_ANSWERS;
}
