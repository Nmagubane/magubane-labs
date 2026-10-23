import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../questions/rng.ts';
import { INITIAL_RATING, chooseLevel, masteryPercent, pCorrect, updateRating, band, retention, correctAnswersToNextBand, type SkillState } from './model.ts';
import { recommend } from './recommend.ts';
import { computeReadiness, buildPlan } from './readiness.ts';

function simulate(trueAbility: number, n: number, seed = 1) {
  const rng = createRng(seed);
  let rating = INITIAL_RATING;
  for (let i = 0; i < n; i++) {
    const level = chooseLevel(rating);
    const correct = rng.next() < pCorrect(trueAbility, level);
    rating = updateRating({ rating, evidence: i, level, score: correct ? 1 : 0, mode: 'learning' });
  }
  return rating;
}

test('ratings converge towards true ability', () => {
  const strong = simulate(2.2, 40);
  const weak = simulate(-1.2, 40);
  assert.ok(masteryPercent(strong) > 80, `strong learner mastery ${masteryPercent(strong)}`);
  assert.ok(masteryPercent(weak) < 25, `weak learner mastery ${masteryPercent(weak)}`);
});

test('a brand-new skill is not started and starts low', () => {
  assert.ok(masteryPercent(INITIAL_RATING) < 15);
  assert.equal(band(undefined, new Date()), 'not-started');
});

test('mastered requires evidence, not one lucky answer', () => {
  const s: SkillState = { skillId: 'x', rating: 3, evidence: 2, attempts: 2, correct: 2, lastPracticedAt: new Date().toISOString() };
  assert.notEqual(band(s, new Date()), 'mastered');
  assert.equal(band({ ...s, evidence: 10 }, new Date()), 'mastered');
});

test('retention decays over weeks, with a floor', () => {
  const now = new Date('2026-10-23T12:00:00Z');
  const s = { rating: 1.5, evidence: 10, lastPracticedAt: '2026-09-01T12:00:00Z' };
  const r = retention(s, now);
  assert.ok(r < 0.9 && r >= 0.6, `retention ${r}`);
});

test('next-band estimate is a small honest number', () => {
  const est = correctAnswersToNextBand({ skillId: 'x', rating: 0.2, evidence: 6, attempts: 6, correct: 4, lastPracticedAt: null });
  assert.ok(est && est.answers >= 1 && est.answers <= 20);
});

test('recommendations: exam skills and weak skills rise to the top, with reasons', () => {
  const now = new Date('2026-10-23T12:00:00Z');
  const states = new Map<string, SkillState>([
    ['linear-equations', { skillId: 'linear-equations', rating: 1.8, evidence: 15, attempts: 15, correct: 13, lastPracticedAt: '2026-10-22T10:00:00Z' }],
    ['factorise-trinomial', { skillId: 'factorise-trinomial', rating: -0.4, evidence: 9, attempts: 9, correct: 4, lastPracticedAt: '2026-10-20T10:00:00Z' }],
    ['integers', { skillId: 'integers', rating: 2.5, evidence: 20, attempts: 20, correct: 19, lastPracticedAt: '2026-10-21T10:00:00Z' }],
  ]);
  const recs = recommend({
    grade: 10,
    subjects: ['mathematics'],
    states,
    recentMistakes: new Map([['factorise-trinomial', 4]]),
    lessonsCompleted: new Set(['factorise-trinomial']),
    exam: { title: 'Maths final', examDate: '2026-11-10', skillIds: ['factorise-trinomial', 'quadratic-equations'] },
    now,
  });
  assert.equal(recs[0]?.skillId, 'factorise-trinomial');
  assert.ok(recs[0]!.reasons.some((r) => r.includes('Maths final')));
  assert.ok(!recs.some((r) => r.skillId === 'integers'), 'mastered skills are not recommended');
});

test('readiness counts unassessed skills as not ready; plan ends with a mock', () => {
  const now = new Date('2026-10-23T12:00:00Z');
  const states = new Map<string, SkillState>([['gradient', { skillId: 'gradient', rating: 2, evidence: 10, attempts: 10, correct: 9, lastPracticedAt: '2026-10-22T10:00:00Z' }]]);
  const r = computeReadiness(['gradient', 'straight-line', 'linear-equations'], states, '2026-11-05', now);
  assert.ok(r.score < 60, `score ${r.score}`);
  assert.equal(r.assessed, 1);
  assert.equal(r.highRisk.length, 2);
  const plan = buildPlan(r, { now, dailyMinutes: 30, lessonsCompleted: new Set() });
  assert.equal(plan.days.length, 13);
  assert.equal(plan.days.at(-1)!.items[0]!.action, 'mock');
  assert.equal(plan.days[0]!.items[0]!.action, 'learn');
  // interleaved: first two sessions are different skills
  assert.notEqual(plan.days[0]!.items[0]!.skillId, plan.days[0]!.items[1]!.skillId);
});
