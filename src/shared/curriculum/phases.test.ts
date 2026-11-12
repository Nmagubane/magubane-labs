import { test } from 'node:test';
import assert from 'node:assert/strict';
import { phaseOf, tierOf, gradeLabel, isLookAhead } from './phases.ts';
import { subjectName, subjectsForGrade } from './catalogue.ts';

test('CAPS phases and Bonisa tiers', () => {
  assert.deepEqual([1, 3, 4, 6, 7, 9, 10, 12].map((g) => phaseOf(g).id), ['foundation', 'foundation', 'intermediate', 'intermediate', 'senior', 'senior', 'fet', 'fet']);
  assert.deepEqual([2, 4, 9, 10].map((g) => tierOf(g).name), ['Bonisa Junior', 'Bonisa', 'Bonisa', 'Bonisa Matric']);
  assert.equal(gradeLabel(8), 'Grade 8 · Senior Phase');
});

test('look ahead starts two grades up, and only for Grades 4–12', () => {
  assert.equal(isLookAhead(9, 8), false);
  assert.equal(isLookAhead(10, 8), true);
  assert.equal(isLookAhead(12, 0), false, 'teachers browse everything');
  assert.equal(isLookAhead(3, 1), false, 'Junior has no look ahead');
});

test('subjects carry their CAPS names for the grade', () => {
  assert.equal(subjectName('physical-sciences', 8), 'Natural Sciences: Matter & Energy');
  assert.equal(subjectName('life-sciences', 9), 'Natural Sciences: Life & Living');
  assert.equal(subjectName('physical-sciences', 10), 'Physical Sciences');
  assert.deepEqual(subjectsForGrade(5), ['mathematics', 'natural-sciences']);
});
