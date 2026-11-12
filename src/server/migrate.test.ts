import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openDb } from './db.ts';

test('migration v7 moves Grade 4–9 science onto CAPS Natural Sciences and keeps FET subjects', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bonisa-'));
  const path = join(dir, 'm.db');
  try {
    openDb(path).close();
    const raw = new DatabaseSync(path, { enableForeignKeyConstraints: false });
    raw.exec('PRAGMA user_version = 6');
    const p = raw.prepare("INSERT INTO learner_profiles (user_id, grade, curriculum_id, subjects, goals, daily_minutes, onboarded_at) VALUES (?, ?, 'za-caps', ?, '[]', 20, '2026-01-01')");
    p.run('g8', 8, JSON.stringify(['mathematics', 'physical-sciences', 'life-sciences']));
    p.run('g5', 5, JSON.stringify(['life-sciences', 'mathematics']));
    p.run('g11', 11, JSON.stringify(['mathematics', 'physical-sciences']));
    p.run('g10', 10, JSON.stringify(['natural-sciences']));
    const c = raw.prepare("INSERT INTO classes (id, teacher_id, name, grade, subject_id, join_code, created_at) VALUES (?, 't', ?, ?, ?, ?, '2026-01-01')");
    c.run('c9', '9B', 9, 'physical-sciences', 'AAAAAA');
    c.run('c10', '10A', 10, 'physical-sciences', 'BBBBBB');
    raw.close();

    const db = openDb(path);
    const subjects = (id: string) => JSON.parse((db.prepare('SELECT subjects FROM learner_profiles WHERE user_id = ?').get(id) as { subjects: string }).subjects);
    assert.deepEqual(subjects('g8'), ['mathematics', 'natural-sciences']);
    assert.deepEqual(subjects('g5'), ['natural-sciences', 'mathematics']);
    assert.deepEqual(subjects('g11'), ['mathematics', 'physical-sciences']);
    assert.deepEqual(subjects('g10'), ['mathematics']);
    const cls = (id: string) => (db.prepare('SELECT subject_id FROM classes WHERE id = ?').get(id) as { subject_id: string }).subject_id;
    assert.equal(cls('c9'), 'natural-sciences');
    assert.equal(cls('c10'), 'physical-sciences');
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
