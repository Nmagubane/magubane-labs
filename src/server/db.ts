/**
 * SQLite via Node's built-in node:sqlite (no native dependency to compile on Windows).
 * Migrations are append-only, tracked with PRAGMA user_version.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';

const MIGRATIONS: string[] = [
  /* v1 */ `
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'parent', 'teacher')),
    created_at TEXT NOT NULL
  );

  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE INDEX sessions_user ON sessions(user_id);

  CREATE TABLE learner_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    grade INTEGER NOT NULL,
    curriculum_id TEXT NOT NULL,
    subjects TEXT NOT NULL,
    goals TEXT NOT NULL,
    daily_minutes INTEGER NOT NULL,
    onboarded_at TEXT NOT NULL,
    baseline_completed_at TEXT
  );

  CREATE TABLE skill_states (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id TEXT NOT NULL,
    rating REAL NOT NULL,
    evidence INTEGER NOT NULL DEFAULT 0,
    attempts INTEGER NOT NULL DEFAULT 0,
    correct INTEGER NOT NULL DEFAULT 0,
    last_practiced_at TEXT,
    PRIMARY KEY (user_id, skill_id)
  );

  CREATE TABLE activities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('lesson', 'practice', 'test', 'baseline')),
    mode TEXT NOT NULL CHECK (mode IN ('learning', 'assessment')),
    status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    title TEXT NOT NULL,
    skill_ids TEXT NOT NULL,
    target_count INTEGER NOT NULL,
    time_limit_sec INTEGER,
    difficulty_offset INTEGER NOT NULL DEFAULT 0,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    summary TEXT
  );
  CREATE INDEX activities_user_status ON activities(user_id, status);
  CREATE INDEX activities_user_kind ON activities(user_id, kind, completed_at);

  CREATE TABLE question_instances (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    template_id TEXT NOT NULL,
    skill_id TEXT NOT NULL,
    difficulty INTEGER NOT NULL,
    seed INTEGER NOT NULL,
    payload TEXT NOT NULL,
    secret TEXT NOT NULL,
    hints_used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    UNIQUE (activity_id, position)
  );

  CREATE TABLE responses (
    id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL UNIQUE REFERENCES question_instances(id) ON DELETE CASCADE,
    activity_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    skill_id TEXT NOT NULL,
    response TEXT,
    skipped INTEGER NOT NULL DEFAULT 0,
    is_correct INTEGER,
    score REAL,
    mistake_code TEXT,
    feedback TEXT,
    confidence TEXT,
    time_ms INTEGER NOT NULL DEFAULT 0,
    rating_before REAL,
    rating_after REAL,
    created_at TEXT NOT NULL,
    graded_at TEXT
  );
  CREATE INDEX responses_user_time ON responses(user_id, graded_at);
  CREATE INDEX responses_user_skill ON responses(user_id, skill_id);

  CREATE TABLE mastery_snapshots (
    user_id TEXT NOT NULL,
    skill_id TEXT NOT NULL,
    day TEXT NOT NULL,
    mastery INTEGER NOT NULL,
    PRIMARY KEY (user_id, skill_id, day)
  );

  CREATE TABLE lesson_progress (
    user_id TEXT NOT NULL,
    lesson_id TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    PRIMARY KEY (user_id, lesson_id)
  );

  CREATE TABLE exams (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    exam_date TEXT NOT NULL,
    skill_ids TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE tutor_conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    context TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX tutor_conversations_user ON tutor_conversations(user_id, updated_at);

  CREATE TABLE tutor_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES tutor_conversations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX tutor_messages_conv ON tutor_messages(conversation_id, created_at);
  CREATE INDEX tutor_messages_user ON tutor_messages(user_id, created_at);
  `,
  /* v2: pilot access and consent records */ `
  ALTER TABLE users ADD COLUMN invite_code TEXT;
  ALTER TABLE users ADD COLUMN is_minor INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE users ADD COLUMN guardian_name TEXT;
  ALTER TABLE users ADD COLUMN guardian_email TEXT;
  ALTER TABLE users ADD COLUMN consent_at TEXT;
  ALTER TABLE users ADD COLUMN consent_version TEXT;
  CREATE INDEX tutor_messages_time ON tutor_messages(role, created_at);
  `,
  /* v3: email verification, password reset, email log, app secrets */ `
  ALTER TABLE users ADD COLUMN email_verified_at TEXT;
  -- Accounts created before verification existed are treated as verified.
  UPDATE users SET email_verified_at = created_at;
  ALTER TABLE users ADD COLUMN guardian_reports_off INTEGER NOT NULL DEFAULT 0;

  CREATE TABLE email_codes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL CHECK (purpose IN ('verify', 'reset')),
    code_hash TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    consumed_at TEXT
  );
  CREATE INDEX email_codes_user ON email_codes(user_id, purpose, created_at);

  CREATE TABLE email_log (
    id TEXT PRIMARY KEY,
    learner_id TEXT,
    class_id TEXT,
    recipient TEXT NOT NULL,
    kind TEXT NOT NULL,
    period TEXT,
    status TEXT NOT NULL CHECK (status IN ('sent', 'logged', 'failed')),
    error TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX email_log_learner ON email_log(learner_id, kind, period);
  CREATE INDEX email_log_class ON email_log(class_id, kind, period);

  CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `,
  /* v4: educator mode: classes, members, assignments */ `
  ALTER TABLE users ADD COLUMN school TEXT;

  CREATE TABLE classes (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    grade INTEGER NOT NULL,
    subject_id TEXT NOT NULL,
    join_code TEXT NOT NULL UNIQUE,
    weekly_reports INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    archived_at TEXT
  );
  CREATE INDEX classes_teacher ON classes(teacher_id);

  CREATE TABLE class_members (
    class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    learner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TEXT NOT NULL,
    PRIMARY KEY (class_id, learner_id)
  );
  CREATE INDEX class_members_learner ON class_members(learner_id);

  CREATE TABLE assignments (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('lesson', 'practice', 'test')),
    skill_id TEXT NOT NULL,
    title TEXT NOT NULL,
    note TEXT,
    question_count INTEGER,
    due_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX assignments_class ON assignments(class_id, due_at);

  ALTER TABLE activities ADD COLUMN assignment_id TEXT;
  CREATE INDEX activities_assignment ON activities(assignment_id);
  `,
];

/** A per-installation secret (for signed links in emails), created on first use and kept in the database. */
export function appSecret(db: Db): string {
  const row = one<{ value: string }>(db, "SELECT value FROM app_settings WHERE key = 'secret'");
  if (row) return row.value;
  const value = randomBytes(32).toString('base64url');
  run(db, "INSERT INTO app_settings (key, value) VALUES ('secret', ?)", value);
  return value;
}

export type Db = DatabaseSync;
export type Row = Record<string, string | number | null>;

export function openDb(path: string): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;');
  const current = (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[v] as string);
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
  return db;
}

export function tx<T>(db: Db, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/** Short, URL-safe, unguessable ids. */
export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString('base64url')}`;
}

export function one<T = Row>(db: Db, sql: string, ...params: (string | number | null)[]): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined;
}

export function all<T = Row>(db: Db, sql: string, ...params: (string | number | null)[]): T[] {
  return db.prepare(sql).all(...params) as T[];
}

export function run(db: Db, sql: string, ...params: (string | number | null)[]): void {
  db.prepare(sql).run(...params);
}
