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
  const row = one<{ id: string; email: string; display_name: string; role: UserDto['role']; expires_at: string }>(
    db,
    `SELECT u.id, u.email, u.display_name, u.role, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`,
    sha256(token),
  );
  if (!row) return null;
  if (new Date(row.expires_at) < now()) {
    destroySession(db, token);
    return null;
  }
  return { id: row.id, email: row.email, displayName: row.display_name, role: row.role };
}

export function createUser(db: Db, input: { email: string; password: string; displayName: string }): UserDto {
  const id = newId('usr');
  run(db, 'INSERT INTO users (id, email, password_hash, display_name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)', id, input.email, hashPassword(input.password), input.displayName, 'student', now().toISOString());
  return { id, email: input.email, displayName: input.displayName, role: 'student' };
}

/**
 * The single place that decides who may see a learner's data.
 * Today: only the learner themself. Parent/teacher access will be added here (guardianships, classes).
 */
export function canAccessLearner(viewer: UserDto, learnerId: string): boolean {
  return viewer.id === learnerId;
}
