import { test } from 'node:test';
import assert from 'node:assert/strict';
import { examDateProblem, isoDay } from './exam-dates.ts';

// 15 November 2026, 23:30 local: late in the evening, when a UTC date would already be wrong in some time zones.
const now = new Date(2026, 10, 15, 23, 30);

test('exam dates: tomorrow up to a year ahead is fine', () => {
  assert.equal(examDateProblem('2026-11-16', now), null);
  assert.equal(examDateProblem('2027-06-01', now), null);
  assert.equal(examDateProblem('2027-11-16', now), null); // 366 days, the last day allowed
});

test('exam dates: every refusal says what to do instead', () => {
  assert.match(examDateProblem('', now) ?? '', /Choose the date/);
  assert.match(examDateProblem('2026-11-10', now) ?? '', /passed.*16 November 2026/);
  assert.match(examDateProblem('2026-11-15', now) ?? '', /today/);
  assert.match(examDateProblem('2027-11-17', now) ?? '', /more than a year/);
  assert.match(examDateProblem('15/11/2026', now) ?? '', /Choose the date/);
});

test('exam dates: isoDay is the local calendar day', () => {
  assert.equal(isoDay(new Date(2026, 0, 1, 0, 5)), '2026-01-01');
  assert.equal(isoDay(now), '2026-11-15');
});
