/**
 * Grade 3 → Grade 4: a picture-sign-in child becomes a learner with their own email login.
 *
 * What changes: the child logs in with an email and password (confirmed by a code on first login), the picture code
 * is wiped, they leave their Foundation Phase classes, and their profile is cleared so the full app welcomes them
 * the way it welcomes every Grade 4 learner: grade, subjects, goals and a starting-point check.
 * What stays: everything they learnt (skill history, "I can…" statements, reports) and the parent link, so the
 * parent still gets the weekly report. The account is still a child's account (is_minor).
 */
import type { Db } from './db.ts';
import { one, run, tx } from './db.ts';
import { HttpError } from './http.ts';
import { now, config } from './config.ts';
import { canManageChild, hashPassword } from './auth.ts';
import { getProfile } from './learner.ts';
import { layout, sendMail } from './mailer.ts';
import { logged } from './verification.ts';
import { passwordProblem } from '../shared/password.ts';
import { PRIVACY_VERSION, type UserDto } from '../shared/api.ts';
import type { MoveUpRequest } from '../shared/api-junior.ts';

export async function moveUpChild(db: Db, adult: UserDto, childId: string, body: MoveUpRequest): Promise<{ email: string; leftClasses: number }> {
  if (!canManageChild(db, adult, childId)) throw new HttpError(404, 'not_found', 'That child does not exist.');
  const child = one<{ display_name: string; guardian_email: string | null; guardian_name: string | null }>(db, 'SELECT display_name, guardian_email, guardian_name FROM users WHERE id = ?', childId);
  const p = getProfile(db, childId);
  if (!child || !p) throw new HttpError(404, 'not_found', 'That child does not exist.');
  if (p.grade !== 3) throw new HttpError(422, 'not_grade_3', 'Only Grade 3 children can move up to Grade 4. Change the grade first if it is wrong.');
  const problem = passwordProblem(body.password, { email: body.email, name: child.display_name });
  if (problem) throw new HttpError(422, 'invalid', problem, { fieldErrors: { password: [problem] } });
  if (one(db, 'SELECT 1 FROM users WHERE email = ?', body.email)) throw new HttpError(409, 'email_taken', 'That email already has an account. Use a different one.', { fieldErrors: { email: ['That email already has an account'] } });

  const t = now().toISOString();
  const guardianEmail = adult.role === 'parent' ? adult.email : body.guardianEmail || child.guardian_email;
  if (guardianEmail && guardianEmail === body.email && adult.role !== 'parent') {
    throw new HttpError(422, 'invalid', "Use the child's own email for logging in, and the guardian's for reports.", { fieldErrors: { guardianEmail: ['This must be different from the login email'] } });
  }
  let leftClasses = 0;
  tx(db, () => {
    run(
      db,
      `UPDATE users SET email = ?, password_hash = ?, login_kind = 'email', email_verified_at = NULL,
         picture_code = NULL, picture_fails = 0, picture_locked_until = NULL,
         guardian_email = ?, guardian_name = ?, consent_at = ?, consent_version = ?, moved_up_at = ?
       WHERE id = ?`,
      body.email,
      hashPassword(body.password),
      guardianEmail ?? null,
      adult.role === 'parent' ? adult.displayName : child.guardian_name,
      t,
      `${PRIVACY_VERSION}${adult.role === 'teacher' ? ':school-attested' : ':guardian'}:moved-up`,
      t,
      childId,
    );
    leftClasses = one<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM class_members WHERE learner_id = ? AND class_id IN (SELECT id FROM classes WHERE grade <= 3)', childId)?.n ?? 0;
    run(db, 'DELETE FROM class_members WHERE learner_id = ? AND class_id IN (SELECT id FROM classes WHERE grade <= 3)', childId);
    // The full app asks grade, subjects and goals, then a starting-point check: the same welcome as every Grade 4.
    run(db, 'DELETE FROM learner_profiles WHERE user_id = ?', childId);
    // Any picture sign-in session ends now.
    run(db, 'DELETE FROM sessions WHERE user_id = ?', childId);
  });

  // A teacher moved them up: tell the guardian, who did not do this themselves.
  if (adult.role === 'teacher' && guardianEmail) {
    const name = child.display_name;
    const { html, text } = layout({
      heading: `${name} has moved up to Grade 4 on Magubane Labs`,
      paragraphs: [
        `Hello${child.guardian_name ? ` ${child.guardian_name}` : ''}. ${name}'s teacher, ${adult.displayName}, has moved ${name} from picture sign-in to their own login for Grade 4.`,
        `${name} now logs in with ${body.email} and a password. Everything ${name} learnt so far is kept, and you will still get the weekly progress report at this address.`,
        `If you did not expect this, reply to this email${config.contactEmail ? ` or write to ${config.contactEmail}` : ''}.`,
      ],
      button: { label: 'Read the privacy notice', url: `${config.publicUrl}/privacy` },
    });
    logged(db, childId, guardianEmail, 'guardian-moved-up', await sendMail({ to: { email: guardianEmail, ...(child.guardian_name ? { name: child.guardian_name } : {}) }, subject: `${name} moved up to Grade 4`, html, text }).catch((e: unknown) => ({ status: 'failed' as const, error: String(e) })));
  }
  return { email: body.email, leftClasses };
}
