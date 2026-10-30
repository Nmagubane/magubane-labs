/** "I can…" statements: earned once when a Grade 1–3 skill becomes secure, then kept. */
import type { Db } from './db.ts';
import { all, one, run } from './db.ts';
import { getSkill, subjectOfSkill } from '../shared/curriculum/catalogue.ts';
import { effectiveMastery, type SkillState } from '../shared/mastery/model.ts';
import { icanReady, icanText, icanSpoken } from '../shared/junior/ican.ts';
import type { IcanDto } from '../shared/api-junior.ts';

/** Call after a learning-mode answer. Returns the new statement the first time the skill is secure. */
export function earnIcan(db: Db, userId: string, skillId: string, activityId: string, state: SkillState, at: Date): { skillId: string; text: string; spoken: string } | null {
  const s = getSkill(skillId);
  if (!s || s.phase !== 'foundation') return null;
  if (!icanReady(effectiveMastery(state, at), state.evidence)) return null;
  if (one(db, 'SELECT 1 FROM junior_ican WHERE child_id = ? AND skill_id = ?', userId, skillId)) return null;
  const text = icanText(skillId);
  const spoken = icanSpoken(skillId);
  if (!text || !spoken) return null;
  run(db, 'INSERT INTO junior_ican (child_id, skill_id, activity_id, earned_at) VALUES (?, ?, ?, ?)', userId, skillId, activityId, at.toISOString());
  return { skillId, text, spoken };
}

export function listIcan(db: Db, childId: string): IcanDto[] {
  return all<{ skill_id: string; earned_at: string }>(db, 'SELECT skill_id, earned_at FROM junior_ican WHERE child_id = ? ORDER BY earned_at DESC', childId).flatMap((r) => {
    const s = getSkill(r.skill_id);
    const text = icanText(r.skill_id);
    const spoken = icanSpoken(r.skill_id);
    return s && text && spoken ? [{ skillId: r.skill_id, subjectId: subjectOfSkill(s), text, spoken, earnedAt: r.earned_at }] : [];
  });
}
