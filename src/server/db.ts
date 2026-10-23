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
];

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
