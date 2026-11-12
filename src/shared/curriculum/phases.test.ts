import { test } from 'node:test';
import assert from 'node:assert/strict';
import { phaseOf, tierOf, gradeLabel, isLookAhead } from './phases.ts';
import { SKILLS, getSkill, subjectName, subjectOfSkill, subjectsForGrade, skillsForLearner } from './catalogue.ts';

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

test('subjects follow CAPS: Natural Sciences in Grades 4–9, Physical and Life Sciences from Grade 10', () => {
  assert.deepEqual(subjectsForGrade(5), ['mathematics', 'natural-sciences']);
  assert.deepEqual(subjectsForGrade(9), ['mathematics', 'natural-sciences']);
  assert.deepEqual(subjectsForGrade(10), ['mathematics', 'physical-sciences', 'life-sciences']);
  assert.equal(subjectName('natural-sciences', 5), 'Natural Sciences and Technology');
  assert.equal(subjectName('natural-sciences', 8), 'Natural Sciences');
  for (const s of SKILLS.filter((x) => x.phase !== 'foundation')) {
    const sid = subjectOfSkill(s);
    if (sid === 'natural-sciences') assert.ok(s.grade >= 4 && s.grade <= 9, `${s.id}: Natural Sciences is Grades 4–9`);
    if (sid === 'physical-sciences' || sid === 'life-sciences') assert.ok(s.grade >= 10, `${s.id}: ${sid} starts in Grade 10`);
  }
});

test('every skill sits at its CAPS grade, after its prerequisites', () => {
  for (const s of SKILLS) {
    const caps = s.mappings['za-caps'];
    assert.ok(caps, `${s.id}: no CAPS mapping`);
    assert.equal(caps.grade, s.grade, `${s.id}: grade ${s.grade} but CAPS grade ${caps.grade}`);
    for (const p of s.prerequisites) assert.ok((getSkill(p)?.grade ?? 99) <= s.grade, `${s.id}: prerequisite ${p} is taught later`);
  }
});

test('Natural Sciences has all four CAPS strands in every Senior Phase grade', () => {
  for (const g of [7, 8, 9]) {
    const topics = new Set(SKILLS.filter((s) => s.grade === g && subjectOfSkill(s) === 'natural-sciences').map((s) => s.topicId));
    for (const t of ['nst-life', 'nst-matter', 'nst-energy', 'nst-earth']) assert.ok(topics.has(t), `Grade ${g} has no ${t} skill`);
  }
});

test('the band follows the CAPS path between Natural Sciences and Physical/Life Sciences', () => {
  const g9 = skillsForLearner(['natural-sciences'], 9).map((s) => s.id);
  assert.ok(g9.includes('atomic-structure'), 'Grade 9 reaches Grade 10 physical sciences');
  const g10 = skillsForLearner(['physical-sciences'], 10).map((s) => s.id);
  assert.ok(g10.includes('circuits') && g10.includes('states-of-matter'), 'Grade 10 can catch up on Senior Phase physics and chemistry');
  assert.ok(!g10.includes('classification'), 'but not on Life and Living');
});
