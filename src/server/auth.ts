import { scryptSync, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import type { Db } from './db.ts';
import { one, run, newId } from './db.ts';
import { now } from './config.ts';
import type { UserDto } from '../shared/api.ts';

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, N, r, p, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length, { N: Number(N), r: Number(r), p: Number(p) });
  return timingSafeEqual(actual, expected);
}

/** A dummy hash so failed logins for unknown emails take as long as wrong passwords. */
const DUMMY_HASH = hashPassword(randomBytes(16).toString('hex'));
export function burnPasswordCheck(password: string): void {
  verifyPassword(password, DUMMY_HASH);
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('base64url');

export function createSession(db: Db, userId: string, days: number): string {
  const token = randomBytes(32).toString('base64url');
  const t = now();
  const expires = new Date(t.getTime() + days * 86_400_000);
  run(db, 'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)', sha256(token), userId, t.toISOString(), expires.toISOString());
  return token;
}

export function destroySession(db: Db, token: string): void {
  run(db, 'DELETE FROM sessions WHERE token_hash = ?', sha256(token));
}

export function userForSession(db: Db, token: string | undefined): UserDto | null {
  if (!token || token.length > 100) return null;
  const row = one<UserRow & { expires_at: string }>(
    db,
    `SELECT u.id, u.email, u.display_name, u.role, u.email_verified_at, u.school, u.moved_up_at, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`,
    sha256(token),
  );
  if (!row) return null;
  if (new Date(row.expires_at) < now()) {
    destroySession(db, token);
    return null;
  }
  return toUserDto(row);
}

export interface UserRow {
  id: string;
  email: string;
  display_name: string;
  role: UserDto['role'];
  email_verified_at: string | null;
  school: string | null;
  moved_up_at?: string | null;
}
export const USER_COLS = 'id, email, display_name, role, email_verified_at, school, moved_up_at';
/** Children created by an adult have a placeholder address in the reserved .invalid domain: never shown, never mailed. */
export const CHILD_EMAIL_DOMAIN = 'child.invalid';
export const isChildEmail = (email: string): boolean => email.toLowerCase().endsWith(`@${CHILD_EMAIL_DOMAIN}`);

export function toUserDto(row: UserRow): UserDto {
  const child = isChildEmail(row.email);
  return { id: row.id, email: child ? '' : row.email, displayName: row.display_name, role: row.role, emailVerified: !!row.email_verified_at, school: row.school, ...(child ? { junior: true } : {}), ...(row.moved_up_at ? { movedUp: true } : {}) };
}
export function getUser(db: Db, id: string): UserDto | null {
  const row = one<UserRow>(db, `SELECT ${USER_COLS} FROM users WHERE id = ?`, id);
  return row ? toUserDto(row) : null;
}

export function markEmailVerified(db: Db, userId: string): void {
  run(db, 'UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?) WHERE id = ?', now().toISOString(), userId);
}

export function setPassword(db: Db, userId: string, password: string): void {
  run(db, 'UPDATE users SET password_hash = ? WHERE id = ?', hashPassword(password), userId);
}

/** Signs the user out everywhere (after a password change or reset). */
export function destroyAllSessions(db: Db, userId: string): void {
  run(db, 'DELETE FROM sessions WHERE user_id = ?', userId);
}

export interface NewUser {
  email: string;
  password: string;
  displayName: string;
  inviteCode?: string | null;
  isMinor?: boolean;
  guardianName?: string | null;
  guardianEmail?: string | null;
  consentVersion?: string | null;
  role?: 'student' | 'teacher' | 'parent';
  school?: string | null;
  /** Only the demo seeder and tests create pre-verified accounts. */
  verified?: boolean;
}

export function createUser(db: Db, input: NewUser): UserDto {
  const id = newId('usr');
  const t = now().toISOString();
  run(
    db,
    `INSERT INTO users (id, email, password_hash, display_name, role, created_at, invite_code, is_minor, guardian_name, guardian_email, consent_at, consent_version, school, email_verified_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.email,
    hashPassword(input.password),
    input.displayName,
    input.role ?? 'student',
    t,
    input.inviteCode ?? null,
    input.isMinor ? 1 : 0,
    input.guardianName ?? null,
    input.guardianEmail ?? null,
    input.consentVersion ? t : null,
    input.consentVersion ?? null,
    input.school ?? null,
    input.verified ? t : null,
  );
  return { id, email: input.email, displayName: input.displayName, role: input.role ?? 'student', emailVerified: !!input.verified, school: input.school ?? null };
}

/** Permanently removes a learner and everything recorded about them. */
export function deleteUser(db: Db, userId: string): void {
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const table of ['responses', 'question_instances', 'mastery_snapshots', 'lesson_progress', 'tutor_messages']) run(db, `DELETE FROM ${table} WHERE user_id = ?`, userId);
    run(db, 'DELETE FROM email_log WHERE learner_id = ?', userId);
    // A parent or teacher deleting their account also deletes the picture-sign-in children they created
    // (and only those): nobody else could manage them or sign them in, so keeping them would orphan a child's data.
    for (const c of db.prepare("SELECT id FROM users WHERE created_by = ? AND login_kind = 'picture'").all(userId) as { id: string }[]) {
      for (const table of ['responses', 'question_instances', 'mastery_snapshots', 'lesson_progress', 'tutor_messages']) run(db, `DELETE FROM ${table} WHERE user_id = ?`, c.id);
      run(db, 'DELETE FROM email_log WHERE learner_id = ?', c.id);
      run(db, 'DELETE FROM users WHERE id = ?', c.id);
    }
    run(db, 'DELETE FROM users WHERE id = ?', userId); // cascades: sessions, profile, skill states, activities, exams, conversations
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/**
 * The single place that decides who may see a learner's data:
 * the learner themself, or a teacher of an active class the learner has joined.
 */
export function canAccessLearner(db: Db, viewer: UserDto, learnerId: string): boolean {
  if (viewer.id === learnerId) return true;
  if (!viewer.emailVerified) return false;
  if (viewer.role === 'parent') return !!one(db, 'SELECT 1 FROM guardianships WHERE adult_id = ? AND child_id = ?', viewer.id, learnerId);
  if (viewer.role !== 'teacher') return false;
  return !!one(db, 'SELECT 1 FROM class_members m JOIN classes c ON c.id = m.class_id WHERE m.learner_id = ? AND c.teacher_id = ? AND c.archived_at IS NULL', learnerId, viewer.id);
}

/**
 * Who may manage a picture-login child (rename, change grade or language, reset the picture code, delete):
 * a parent linked to them, or a teacher of an active class they are in. Children cannot manage themselves.
 */
export function canManageChild(db: Db, viewer: UserDto, childId: string): boolean {
  if (viewer.id === childId) return false;
  const row = one<{ login_kind: string }>(db, 'SELECT login_kind FROM users WHERE id = ?', childId);
  if (row?.login_kind !== 'picture') return false;
  return canAccessLearner(db, viewer, childId);
}
