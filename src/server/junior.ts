/**
 * Junior (Grades 1–3): children created by a parent or teacher, picture sign-in on adult-approved devices,
 * the child's home and subject screens, and the adult's view of a child.
 *
 * Security model for picture sign-in:
 * - A child can only sign in on a device an adult has set up (a 400-day httpOnly device cookie, hashed in
 *   the database, revocable). Without it, nobody even sees the children's names.
 * - The device shows only first names for that family or class.
 * - 5 wrong codes lock that child for 10 minutes; each device is rate limited too.
 * - Picture codes are encrypted at rest (AES-256-GCM) so the adults who manage the child can see the code
 *   and help them; nobody else can.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import type { Db } from './db.ts';
import { all, one, run, newId, tx, appSecret } from './db.ts';
import { HttpError } from './http.ts';
import { now } from './config.ts';
import { getProfile, getStates, summarise, localDay } from './learner.ts';
import { canAccessLearner, canManageChild, hashPassword, CHILD_EMAIL_DOMAIN } from './auth.ts';
import { minutesOnDay } from './insights.ts';
import type { UserDto } from '../shared/api.ts';
import type { CreateChildRequest, ChildSummaryDto, CreatedChildDto, DeviceDto, FamilyDto, JuniorDeviceDto, JuniorHomeDto, JuniorWorldDto, JuniorSkillCard, ChildOverviewDto, ClassChildrenCardsDto } from '../shared/api-junior.ts';
import { PRIVACY_VERSION } from '../shared/api.ts';
import { CHILD_COLOURS, PICTURE_IDS, randomPictureCode } from '../shared/junior/pictures.ts';
import { foundationSubjectsFor, instructionLanguage, hasReadingPack, isLanguageCode, type LanguageCode } from '../shared/junior/languages.ts';
import { juniorNext, juniorPlan, juniorSkills, REASON_TEXT, type JuniorPick } from '../shared/junior/recommend.ts';
import { getCard } from '../shared/junior/cards.ts';
import { getSkill, getSubject, getTopic, topicsInSubject, skillsInTopic, type SubjectId } from '../shared/curriculum/catalogue.ts';
import { mistakeInfo } from '../shared/questions/mistakes.ts';
import { effectiveMastery, band } from '../shared/mastery/model.ts';

export const DEVICE_COOKIE = 'ml_device';
export const DEVICE_DAYS = 400;
const MAX_CHILDREN_PER_PARENT = 8;
const LOCK_AFTER = 5;
const LOCK_MINUTES = 10;

const sha256 = (s: string) => createHash('sha256').update(s).digest('base64url');

// ---------------------------------------------------------------------------
// Picture codes, encrypted at rest
// ---------------------------------------------------------------------------
function codeKey(db: Db): Buffer {
  return createHash('sha256').update(`${appSecret(db)}:picture-codes:v1`).digest();
}
export function encryptCode(db: Db, code: string[]): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', codeKey(db), iv);
  const enc = Buffer.concat([c.update(code.join(','), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64url');
}
export function decryptCode(db: Db, stored: string | null): string[] | null {
  if (!stored) return null;
  try {
    const buf = Buffer.from(stored, 'base64url');
    const d = createDecipheriv('aes-256-gcm', codeKey(db), buf.subarray(0, 12));
    d.setAuthTag(buf.subarray(12, 28));
    return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8').split(',');
  } catch {
    return null;
  }
}
const sameCode = (a: string[], b: string[]) => {
  const x = Buffer.from(a.join(','));
  const y = Buffer.from(b.join(','));
  return x.length === y.length && timingSafeEqual(x, y);
};

// ---------------------------------------------------------------------------
// Children
// ---------------------------------------------------------------------------
interface ChildRow {
  id: string;
  display_name: string;
  created_at: string;
  created_by: string | null;
  picture_code: string | null;
  picture_fails: number;
  picture_locked_until: string | null;
  guardian_email: string | null;
}

function colourFor(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CHILD_COLOURS[h % CHILD_COLOURS.length]!;
}

function requireChild(db: Db, id: string): ChildRow {
  const c = one<ChildRow>(db, "SELECT id, display_name, created_at, created_by, picture_code, picture_fails, picture_locked_until, guardian_email FROM users WHERE id = ? AND login_kind = 'picture'", id);
  if (!c) throw new HttpError(404, 'not_found', 'That child does not exist.');
  return c;
}

function lastActive(db: Db, id: string): string | null {
  return one<{ t: string | null }>(db, 'SELECT MAX(graded_at) AS t FROM responses WHERE user_id = ?', id)?.t ?? null;
}

export function childSummary(db: Db, id: string): ChildSummaryDto {
  const c = requireChild(db, id);
  const p = getProfile(db, id);
  const weekAgo = new Date(now().getTime() - 7 * 86_400_000).toISOString();
  const w = one<{ n: number; ms: number }>(db, 'SELECT COUNT(*) AS n, COALESCE(SUM(time_ms), 0) AS ms FROM responses WHERE user_id = ? AND graded_at >= ?', id, weekAgo) ?? { n: 0, ms: 0 };
  const started = one<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM skill_states WHERE user_id = ? AND evidence > 0', id)?.n ?? 0;
  return {
    id,
    name: c.display_name,
    grade: p?.grade ?? 1,
    homeLanguage: p?.homeLanguage ?? 'en',
    colour: colourFor(id),
    lastActiveAt: lastActive(db, id),
    minutes7d: Math.round(w.ms / 60000),
    answers7d: w.n,
    skillsStarted: started,
  };
}

function saveJuniorProfile(db: Db, childId: string, grade: number, homeLanguage: LanguageCode): void {
  const t = now().toISOString();
  run(
    db,
    `INSERT INTO learner_profiles (user_id, grade, curriculum_id, subjects, goals, daily_minutes, onboarded_at, baseline_completed_at, home_language)
     VALUES (?, ?, 'za-caps', ?, '[]', 15, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET grade = excluded.grade, subjects = excluded.subjects, home_language = excluded.home_language`,
    childId,
    grade,
    JSON.stringify(foundationSubjectsFor(homeLanguage)),
    t,
    t, // no baseline test for young children: they start at level 1 and the engine adapts within minutes
    homeLanguage,
  );
}

export function createChild(db: Db, adult: UserDto, body: CreateChildRequest, opts: { classId?: string } = {}): CreatedChildDto {
  if (adult.role === 'parent') {
    const n = one<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM guardianships WHERE adult_id = ?', adult.id)?.n ?? 0;
    if (n >= MAX_CHILDREN_PER_PARENT) throw new HttpError(422, 'too_many_children', `A family account can have up to ${MAX_CHILDREN_PER_PARENT} children.`);
  } else if (adult.role === 'teacher') {
    if (!opts.classId) throw new HttpError(400, 'invalid', 'Choose a class.');
    const c = one<{ teacher_id: string; grade: number; archived_at: string | null }>(db, 'SELECT teacher_id, grade, archived_at FROM classes WHERE id = ?', opts.classId);
    if (!c || c.teacher_id !== adult.id || c.archived_at) throw new HttpError(404, 'not_found', 'That class does not exist.');
    if (c.grade > 3) throw new HttpError(422, 'not_foundation', 'Picture sign-in is for Grade 1 to 3 classes. Older learners sign up with a class code.');
    const n = one<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM class_members WHERE class_id = ?', opts.classId)?.n ?? 0;
    if (n >= 60) throw new HttpError(422, 'class_full', 'This class is full.');
  } else {
    throw new HttpError(403, 'forbidden', 'Only parents and teachers can add children.');
  }
  const code = body.pictureCode ?? randomPictureCode((n) => randomInt(0, n));
  const id = newId('usr');
  const t = now().toISOString();
  const guardianEmail = adult.role === 'parent' ? adult.email : body.guardianEmail || null;
  const guardianName = adult.role === 'parent' ? adult.displayName : null;
  tx(db, () => {
    run(
      db,
      `INSERT INTO users (id, email, password_hash, display_name, role, created_at, is_minor, guardian_name, guardian_email, consent_at, consent_version, email_verified_at, login_kind, created_by, picture_code)
       VALUES (?, ?, ?, ?, 'student', ?, 1, ?, ?, ?, ?, ?, 'picture', ?, ?)`,
      id,
      `${id}@${CHILD_EMAIL_DOMAIN}`,
      hashPassword(randomBytes(24).toString('base64url')), // never used: children sign in with pictures
      body.name,
      t,
      guardianName,
      guardianEmail,
      t,
      `${PRIVACY_VERSION}${adult.role === 'teacher' ? ':school-attested' : ':guardian'}`,
      t,
      adult.id,
      encryptCode(db, code),
    );
    saveJuniorProfile(db, id, body.grade, body.homeLanguage);
    if (adult.role === 'parent') run(db, 'INSERT INTO guardianships (adult_id, child_id, created_at) VALUES (?, ?, ?)', adult.id, id, t);
    else run(db, 'INSERT INTO class_members (class_id, learner_id, joined_at) VALUES (?, ?, ?)', opts.classId as string, id, t);
  });
  return { child: childSummary(db, id), pictureCode: code };
}

export function updateChild(db: Db, adult: UserDto, id: string, body: { name?: string | undefined; grade?: number | undefined; homeLanguage?: LanguageCode | undefined }): ChildSummaryDto {
  if (!canManageChild(db, adult, id)) throw new HttpError(404, 'not_found', 'That child does not exist.');
  const p = getProfile(db, id);
  if (body.name) run(db, 'UPDATE users SET display_name = ? WHERE id = ?', body.name, id);
  if (body.grade !== undefined || body.homeLanguage !== undefined) saveJuniorProfile(db, id, body.grade ?? p?.grade ?? 1, body.homeLanguage ?? p?.homeLanguage ?? 'en');
  return childSummary(db, id);
}

export function resetPictureCode(db: Db, adult: UserDto, id: string, code?: string[]): string[] {
  if (!canManageChild(db, adult, id)) throw new HttpError(404, 'not_found', 'That child does not exist.');
  const next = code ?? randomPictureCode((n) => randomInt(0, n));
  run(db, 'UPDATE users SET picture_code = ?, picture_fails = 0, picture_locked_until = NULL WHERE id = ?', encryptCode(db, next), id);
  return next;
}

/** Parents can delete a child they look after; teachers a child they created. Everything about the child goes. */
export function canDeleteChild(db: Db, adult: UserDto, id: string): boolean {
  if (!canManageChild(db, adult, id)) return false;
  const c = requireChild(db, id);
  return adult.role === 'parent' || c.created_by === adult.id;
}

export function listFamily(db: Db, parent: UserDto, deviceToken: string | undefined): FamilyDto {
  const kids = all<{ child_id: string }>(db, 'SELECT child_id FROM guardianships WHERE adult_id = ? ORDER BY created_at', parent.id);
  const dev = deviceToken ? deviceRow(db, deviceToken) : null;
  return { children: kids.map((k) => childSummary(db, k.child_id)), devices: listDevices(db, parent, deviceToken), thisDevice: !!dev && dev.owner_id === parent.id && dev.scope_kind === 'family' };
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------
interface DeviceRow {
  id: string;
  token_hash: string;
  owner_id: string;
  scope_kind: 'family' | 'class';
  scope_id: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

function deviceRow(db: Db, token: string): DeviceRow | null {
  if (!token || token.length > 100) return null;
  const d = one<DeviceRow>(db, 'SELECT * FROM junior_devices WHERE token_hash = ? AND revoked_at IS NULL', sha256(token));
  if (!d) return null;
  // A class device stops working when the class is archived or no longer belongs to its owner.
  if (d.scope_kind === 'class' && !one(db, 'SELECT 1 FROM classes WHERE id = ? AND teacher_id = ? AND archived_at IS NULL', d.scope_id, d.owner_id)) return null;
  return d;
}

export function createDevice(db: Db, adult: UserDto, body: { classId?: string | undefined; label?: string | undefined }): { token: string; label: string } {
  let scope: { kind: 'family' | 'class'; id: string; label: string };
  if (adult.role === 'parent') scope = { kind: 'family', id: adult.id, label: body.label || `${adult.displayName}’s family` };
  else if (adult.role === 'teacher') {
    const c = body.classId ? one<{ id: string; name: string; teacher_id: string; grade: number; archived_at: string | null }>(db, 'SELECT id, name, teacher_id, grade, archived_at FROM classes WHERE id = ?', body.classId) : undefined;
    if (!c || c.teacher_id !== adult.id || c.archived_at) throw new HttpError(404, 'not_found', 'That class does not exist.');
    if (c.grade > 3) throw new HttpError(422, 'not_foundation', 'Picture sign-in is for Grade 1 to 3 classes.');
    scope = { kind: 'class', id: c.id, label: body.label || c.name };
  } else throw new HttpError(403, 'forbidden', 'Only a parent or teacher can set up a device for children.');
  const token = randomBytes(32).toString('base64url');
  run(db, 'INSERT INTO junior_devices (id, token_hash, owner_id, scope_kind, scope_id, label, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', newId('dev'), sha256(token), adult.id, scope.kind, scope.id, scope.label, now().toISOString());
  return { token, label: scope.label };
}

export function listDevices(db: Db, adult: UserDto, currentToken?: string): DeviceDto[] {
  const cur = currentToken ? sha256(currentToken) : null;
  return all<DeviceRow & { class_name: string | null }>(db, 'SELECT d.*, c.name AS class_name FROM junior_devices d LEFT JOIN classes c ON d.scope_kind = \'class\' AND c.id = d.scope_id WHERE d.owner_id = ? AND d.revoked_at IS NULL ORDER BY d.created_at DESC', adult.id).map((d) => ({
    id: d.id,
    label: d.label,
    scope: d.scope_kind,
    className: d.class_name,
    createdAt: d.created_at,
    lastUsedAt: d.last_used_at,
    current: d.token_hash === cur,
    scopeId: d.scope_id,
  }));
}

export function revokeDevice(db: Db, adult: UserDto, id: string): void {
  const d = one<DeviceRow>(db, 'SELECT * FROM junior_devices WHERE id = ?', id);
  if (!d || d.owner_id !== adult.id) throw new HttpError(404, 'not_found', 'That device does not exist.');
  run(db, 'UPDATE junior_devices SET revoked_at = ? WHERE id = ?', now().toISOString(), id);
}

export function revokeDeviceToken(db: Db, token: string): void {
  run(db, 'UPDATE junior_devices SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL', now().toISOString(), sha256(token));
}

function childrenOnDevice(db: Db, d: DeviceRow): ChildRow[] {
  const cols = 'u.id, u.display_name, u.created_at, u.created_by, u.picture_code, u.picture_fails, u.picture_locked_until, u.guardian_email';
  return d.scope_kind === 'family'
    ? all<ChildRow>(db, `SELECT ${cols} FROM guardianships g JOIN users u ON u.id = g.child_id WHERE g.adult_id = ? AND u.login_kind = 'picture' ORDER BY u.display_name COLLATE NOCASE`, d.scope_id)
    : all<ChildRow>(db, `SELECT ${cols} FROM class_members m JOIN users u ON u.id = m.learner_id WHERE m.class_id = ? AND u.login_kind = 'picture' ORDER BY u.display_name COLLATE NOCASE`, d.scope_id);
}

const isLocked = (c: ChildRow) => !!c.picture_locked_until && new Date(c.picture_locked_until) > now();

export function deviceInfo(db: Db, token: string | undefined): JuniorDeviceDto {
  const d = token ? deviceRow(db, token) : null;
  if (!d) return { set: false };
  return { set: true, label: d.label, children: childrenOnDevice(db, d).map((c) => ({ id: c.id, name: c.display_name, colour: colourFor(c.id), locked: isLocked(c) })) };
}

/** Returns the child's id on success. Throws 401 on a wrong code, 423 when locked. */
export function juniorLogin(db: Db, token: string | undefined, childId: string, code: string[]): string {
  const d = token ? deviceRow(db, token) : null;
  if (!d) throw new HttpError(403, 'no_device', 'A grown-up needs to set up this device first.');
  const child = childrenOnDevice(db, d).find((c) => c.id === childId);
  if (!child) throw new HttpError(404, 'not_found', 'That child is not on this device.');
  if (isLocked(child)) throw new HttpError(423, 'locked', 'Too many tries. Ask a grown-up to help you.');
  const stored = decryptCode(db, child.picture_code);
  if (!stored || !code.every((c) => (PICTURE_IDS as readonly string[]).includes(c)) || !sameCode(stored, code)) {
    const fails = child.picture_fails + 1;
    if (fails >= LOCK_AFTER) run(db, 'UPDATE users SET picture_fails = 0, picture_locked_until = ? WHERE id = ?', new Date(now().getTime() + LOCK_MINUTES * 60_000).toISOString(), child.id);
    else run(db, 'UPDATE users SET picture_fails = ? WHERE id = ?', fails, child.id);
    throw new HttpError(401, 'wrong_code', fails >= LOCK_AFTER ? 'Too many tries. Ask a grown-up to help you.' : 'Those are not your pictures. Try again.', { left: Math.max(0, LOCK_AFTER - fails) });
  }
  run(db, 'UPDATE users SET picture_fails = 0, picture_locked_until = NULL WHERE id = ?', child.id);
  run(db, 'UPDATE junior_devices SET last_used_at = ? WHERE id = ?', now().toISOString(), d.id);
  return child.id;
}

// ---------------------------------------------------------------------------
// The child's screens
// ---------------------------------------------------------------------------
function requireJunior(db: Db, user: UserDto) {
  const p = getProfile(db, user.id);
  if (!p || p.grade > 3) throw new HttpError(403, 'not_junior', 'This is for Grade 1 to 3 learners.');
  return p;
}

function recentSkillIds(db: Db, userId: string): string[] {
  return all<{ skill_ids: string }>(db, "SELECT skill_ids FROM activities WHERE user_id = ? AND kind = 'practice' ORDER BY started_at DESC LIMIT 4", userId).map((r) => (JSON.parse(r.skill_ids) as string[])[0] ?? '');
}

function card(db: Db, userId: string, skillId: string, reason: JuniorPick['reason'] | null): JuniorSkillCard {
  const s = getSkill(skillId)!;
  const st = getStates(db, userId).get(skillId);
  const at = now();
  return { skillId, name: s.name, topic: getTopic(s.topicId)?.name ?? '', grade: s.grade, mastery: effectiveMastery(st, at), band: band(st, at), reason };
}

export function juniorHome(db: Db, user: UserDto): JuniorHomeDto {
  const p = requireJunior(db, user);
  const hl = p.homeLanguage ?? 'en';
  const plan = juniorPlan({ grade: p.grade, subjects: p.subjects, states: getStates(db, user.id), recentSkillIds: recentSkillIds(db, user.id), now: now() });
  return {
    name: user.displayName,
    grade: p.grade,
    homeLanguage: hl,
    instructionLanguage: instructionLanguage(hl),
    worlds: plan.map((pk) => ({ subjectId: pk.subjectId, next: card(db, user.id, pk.skillId, pk.reason) })),
    minutesToday: minutesOnDay(db, user.id, localDay(now())),
  };
}

export function juniorWorld(db: Db, user: UserDto, subjectId: string): JuniorWorldDto {
  const p = requireJunior(db, user);
  if (!p.subjects.includes(subjectId as SubjectId)) throw new HttpError(404, 'not_found', 'That subject is not set up for this child.');
  const subject = subjectId as SubjectId;
  const next = juniorNext({ grade: p.grade, subjects: p.subjects, states: getStates(db, user.id), recentSkillIds: recentSkillIds(db, user.id), now: now() }, subject);
  const own = new Set(juniorSkills(subject, p.grade).map((s) => s.id));
  return {
    subjectId: subject,
    topics: topicsInSubject(subject)
      .map((t) => ({ id: t.id, name: t.name, skills: skillsInTopic(t.id).filter((s) => own.has(s.id)).map((s) => card(db, user.id, s.id, next?.skillId === s.id ? next.reason : null)) }))
      .filter((t) => t.skills.length),
  };
}

// ---------------------------------------------------------------------------
// What an adult sees about a child
// ---------------------------------------------------------------------------
export function childOverview(db: Db, viewer: UserDto, childId: string): ChildOverviewDto {
  if (viewer.id === childId || !canAccessLearner(db, viewer, childId)) throw new HttpError(404, 'not_found', 'That child does not exist.');
  const c = one<ChildRow & { login_kind: string }>(db, 'SELECT id, display_name, created_at, created_by, picture_code, picture_fails, picture_locked_until, guardian_email, login_kind FROM users WHERE id = ?', childId);
  const p = getProfile(db, childId);
  if (!c || !p || p.grade > 3) throw new HttpError(404, 'not_found', 'That child does not exist.');
  const at = now();
  const hl = p.homeLanguage ?? 'en';
  const states = getStates(db, childId);
  const manage = canManageChild(db, viewer, childId);
  const weekAgo = new Date(at.getTime() - 7 * 86_400_000).toISOString();
  const week = all<{ graded_at: string; time_ms: number; is_correct: number | null }>(db, 'SELECT graded_at, time_ms, is_correct FROM responses WHERE user_id = ? AND graded_at >= ? AND skipped = 0', childId, weekAgo);
  const correct = week.filter((r) => r.is_correct === 1).length;

  const subjects = p.subjects.map((sid) => {
    const skills = [...juniorSkills(sid, p.grade - 1 >= 1 ? p.grade - 1 : p.grade).filter((s) => (states.get(s.id)?.evidence ?? 0) > 0 && s.grade < p.grade), ...juniorSkills(sid, p.grade)].map((s) => {
      const sm = summarise(states.get(s.id), s.id, at);
      return { id: s.id, name: s.name, topic: getTopic(s.topicId)?.name ?? '', grade: s.grade, mastery: sm.mastery, band: sm.band, evidence: sm.evidence, lastPracticedAt: sm.lastPracticedAt };
    });
    const started = skills.filter((s) => s.evidence > 0);
    return { id: sid, name: getSubject(sid)?.name ?? sid, avgMastery: started.length ? Math.round(started.reduce((a, s) => a + s.mastery, 0) / started.length) : null, skills };
  });

  const plan = juniorPlan({ grade: p.grade, subjects: p.subjects, states, recentSkillIds: recentSkillIds(db, childId), now: at });
  const since = new Date(at.getTime() - 30 * 86_400_000).toISOString();
  const mistakes = all<{ mistake_code: string; skill_id: string; n: number }>(db, "SELECT mistake_code, skill_id, COUNT(*) AS n FROM responses WHERE user_id = ? AND mistake_code IS NOT NULL AND mistake_code != 'probable-slip' AND graded_at >= ? GROUP BY mistake_code, skill_id", childId, since);
  const byCode = new Map<string, { count: number; skills: Set<string> }>();
  for (const m of mistakes) {
    const e = byCode.get(m.mistake_code) ?? { count: 0, skills: new Set<string>() };
    e.count += m.n;
    e.skills.add(getSkill(m.skill_id)?.name ?? m.skill_id);
    byCode.set(m.mistake_code, e);
  }
  const recent = all<{ title: string; completed_at: string | null; started_at: string; id: string }>(db, "SELECT id, title, completed_at, started_at FROM activities WHERE user_id = ? AND kind = 'practice' ORDER BY started_at DESC LIMIT 6", childId)
    .map((a) => {
      const rs = all<{ is_correct: number | null }>(db, 'SELECT is_correct FROM responses WHERE activity_id = ? AND skipped = 0', a.id);
      return { title: a.title.replace(/^Practice: /, ''), completedAt: a.completed_at ?? a.started_at, firstTry: rs.filter((r) => r.is_correct === 1).length, total: rs.length };
    })
    .filter((r) => r.total > 0);
  const cards = all<{ card_id: string; done_at: string }>(db, 'SELECT card_id, done_at FROM card_log WHERE child_id = ? ORDER BY done_at DESC LIMIT 10', childId);

  return {
    child: {
      id: childId,
      name: c.display_name,
      grade: p.grade,
      homeLanguage: hl,
      instructionLanguage: instructionLanguage(hl),
      readingAvailable: hasReadingPack(hl),
      createdAt: c.created_at,
      lastActiveAt: lastActive(db, childId),
      pictureCode: manage ? decryptCode(db, c.picture_code) : null,
      canManage: manage,
      guardianEmail: manage ? c.guardian_email : null,
    },
    week: { minutes: Math.round(week.reduce((a, r) => a + r.time_ms, 0) / 60000), answers: week.length, firstTryPct: week.length ? Math.round((100 * correct) / week.length) : null, daysActive: new Set(week.map((r) => localDay(new Date(r.graded_at)))).size },
    subjects,
    next: plan.map((pk) => ({ ...card(db, childId, pk.skillId, pk.reason), subjectId: pk.subjectId, why: REASON_TEXT[pk.reason] })),
    mistakes: [...byCode.entries()]
      .map(([code, e]) => {
        const info = mistakeInfo(code);
        return info ? { code, label: info.label, kind: info.kind, tip: info.tip, count: e.count, skills: [...e.skills] } : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    recent,
    cardsDone: cards.map((r) => ({ cardId: r.card_id, title: getCard(r.card_id)?.title ?? r.card_id, doneAt: r.done_at })),
  };
}

export function logCard(db: Db, viewer: UserDto, childId: string, cardId: string, note?: string): { ok: true } {
  if (viewer.id === childId || !canAccessLearner(db, viewer, childId)) throw new HttpError(404, 'not_found', 'That child does not exist.');
  if (!getCard(cardId)) throw new HttpError(404, 'not_found', 'That activity card does not exist.');
  run(db, 'INSERT INTO card_log (id, child_id, card_id, logged_by, note, done_at) VALUES (?, ?, ?, ?, ?, ?)', newId('crd'), childId, cardId, viewer.id, note ?? null, now().toISOString());
  return { ok: true };
}

export function classLoginCards(db: Db, teacher: UserDto, classId: string): ClassChildrenCardsDto {
  const c = one<{ name: string; grade: number; teacher_id: string }>(db, 'SELECT name, grade, teacher_id FROM classes WHERE id = ?', classId);
  if (!c || c.teacher_id !== teacher.id) throw new HttpError(404, 'not_found', 'That class does not exist.');
  const kids = all<ChildRow>(db, "SELECT u.id, u.display_name, u.created_at, u.created_by, u.picture_code, u.picture_fails, u.picture_locked_until, u.guardian_email FROM class_members m JOIN users u ON u.id = m.learner_id WHERE m.class_id = ? AND u.login_kind = 'picture' ORDER BY u.display_name COLLATE NOCASE", classId);
  return { className: c.name, grade: c.grade, children: kids.map((k) => ({ id: k.id, name: k.display_name, colour: colourFor(k.id), pictureCode: decryptCode(db, k.picture_code) ?? [] })) };
}

/** Is this signed-in learner a Junior (Grades 1–3)? Used to keep the AI tutor and tests away from young children. */
export function isJuniorLearner(db: Db, userId: string): boolean {
  const p = getProfile(db, userId);
  return !!p && p.grade <= 3;
}

export const parseLanguage = (s: string | null | undefined): LanguageCode => (s && isLanguageCode(s) ? s : 'en');
