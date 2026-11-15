import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SKILLS, getSkill, getTopic, defaultSubjects, isFoundationSkill } from './catalogue.ts';
import { examOptions, skillPaper, defaultSkillIds, PAPERS } from './papers.ts';

test('papers: every Grade 10–12 skill in a two-paper subject belongs to exactly one paper', () => {
  for (const s of SKILLS) {
    const subject = getTopic(s.topicId)?.subjectId;
    if (!subject || !PAPERS[subject] || s.grade < 10 || isFoundationSkill(s)) continue;
    assert.ok(skillPaper(s) === 1 || skillPaper(s) === 2, `${s.id} (${s.topicId}) has no paper`);
  }
});

test('papers: the DBE split (trig graphs are Paper 2, the rest of Functions Paper 1)', () => {
  const paper = (id: string) => skillPaper(getSkill(id)!);
  assert.equal(paper('trig-graphs'), 2);
  for (const id of ['graphs-basic', 'inverse-log', 'surds', 'finance', 'series', 'counting-principle', 'derivative-powers', 'algebraic-fractions']) assert.equal(paper(id), 1, id);
  for (const id of ['stats-regression', 'circle-equations', 'compound-angles', 'proportionality', 'circle-proofs']) assert.equal(paper(id), 2, id);
  assert.equal(paper('projectile-motion'), 1);
  assert.equal(paper('moles'), 2);
  assert.equal(paper('monohybrid-crosses'), null); // Life Sciences is one exam until its split is checked
  assert.equal(paper('like-terms'), null); // no papers below Grade 10
});

test('papers: a Grade 12 learner picks Paper 1 or 2 with Grades 10–12 ticked; a test has nothing ticked', () => {
  const opts = examOptions(['mathematics', 'physical-sciences', 'life-sciences'], 12);
  assert.deepEqual(opts.map((o) => o.id), ['mathematics:p1', 'mathematics:p2', 'mathematics:test', 'physical-sciences:p1', 'physical-sciences:p2', 'physical-sciences:test', 'life-sciences:exam', 'life-sciences:test']);
  const p1 = opts[0]!;
  const p2 = opts[1]!;
  const t = opts[2]!;
  assert.equal(p1.label, 'Mathematics Paper 1');
  assert.equal(opts[4]!.label, 'Physical Sciences Paper 2 (Chemistry)');
  const ids = (o: typeof p1) => o.skills.map((s) => s.skillId);
  assert.ok(!ids(p1).some((id) => ids(p2).includes(id)), 'no skill is in both papers');
  assert.deepEqual([...ids(p1), ...ids(p2)].sort(), ids(t).sort(), 'the papers together are the whole subject');
  assert.ok(p1.skills.every((s) => s.ticked && s.grade >= 10));
  assert.ok(!ids(p1).includes('trig-graphs') && ids(p2).includes('trig-graphs'));
  assert.ok(t.skills.every((s) => !s.ticked));
});

test('papers: Grade 11 ticks Grade 11, lists Grade 10, and never lists Grade 12', () => {
  const p1 = examOptions(['mathematics'], 11).find((o) => o.id === 'mathematics:p1')!;
  assert.ok(p1.skills.every((s) => s.grade === 10 || s.grade === 11));
  assert.ok(p1.skills.some((s) => s.grade === 10 && !s.ticked));
  assert.ok(p1.skills.filter((s) => s.grade === 11).every((s) => s.ticked));
});

test('papers: Grades 4–9 have one exam per subject, with their own grade ticked', () => {
  const opts = examOptions(['mathematics', 'natural-sciences'], 8);
  assert.deepEqual(opts.map((o) => o.id), ['mathematics:exam', 'mathematics:test', 'natural-sciences:exam', 'natural-sciences:test']);
  const m = opts[0]!;
  assert.ok(m.skills.every((s) => s.grade <= 8 && s.grade >= 5));
  assert.ok(m.skills.filter((s) => s.ticked).every((s) => s.grade === 8));
});

test('papers: every option for every grade has skills and a non-empty default', () => {
  for (let grade = 4; grade <= 12; grade++) {
    for (const o of examOptions(defaultSubjects(grade), grade)) {
      assert.ok(o.skills.length > 0, `${grade} ${o.id}`);
      assert.ok(defaultSkillIds(o).length > 0, `${grade} ${o.id} default`);
      if (o.kind !== 'test') assert.ok(o.skills.some((s) => s.ticked), `${grade} ${o.id} ticks nothing`);
    }
  }
});

test('papers: in Paper 2, trig graphs are listed under Trigonometry', () => {
  const p2 = examOptions(['mathematics'], 11).find((o) => o.id === 'mathematics:p2')!;
  assert.equal(p2.skills.find((s) => s.skillId === 'trig-graphs')?.topicId, 'trigonometry');
});
