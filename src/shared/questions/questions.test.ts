import { test } from 'node:test';
import assert from 'node:assert/strict';
import katex from 'katex';
import { TEMPLATES, generateQuestion } from './registry.ts';
import { gradeResponse, parseNumber, canonicalResponse } from './answer.ts';
import { parseExpression, isFactorisedForm, isExpandedForm, expressionsEquivalent } from './expr.ts';
import { DIFFICULTIES, type AnswerSpec } from './types.ts';
import { MISTAKES } from './mistakes.ts';
import { SKILLS, subjectOfSkill } from '../curriculum/catalogue.ts';

const canonical = canonicalResponse;

/** Every $…$ / $$…$$ segment must render in KaTeX. */
function assertTexRenders(text: string, where: string) {
  const re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const tex = (m[1] ?? m[2]) as string;
    try {
      katex.renderToString(tex, { throwOnError: true, strict: 'ignore' });
    } catch (e) {
      assert.fail(`${where}: KaTeX failed on "${tex}": ${(e as Error).message}`);
    }
  }
  const dollars = (text.replace(/\\\$/g, '').match(/\$/g) ?? []).length;
  assert.equal(dollars % 2, 0, `${where}: unbalanced $ in "${text}"`);
}

test('expression parser handles what learners type', () => {
  assert.ok(expressionsEquivalent('2x(x-3)', '2x^2-6x'));
  assert.ok(expressionsEquivalent('x²+5x+6', '(x+2)(x+3)'));
  assert.ok(expressionsEquivalent('3a − 2b', '-2b+3a'));
  assert.ok(expressionsEquivalent('(x+3)^2', 'x^2+6x+9'));
  assert.ok(expressionsEquivalent('yx + 2', 'xy+2'));
  assert.ok(!expressionsEquivalent('(x+3)^2', 'x^2+9'));
  assert.throws(() => parseExpression('2x+'));
  assert.throws(() => parseExpression('(x+1'));
});

test('form checks: factorised vs expanded', () => {
  assert.ok(isFactorisedForm(parseExpression('(x+2)(x+3)')));
  assert.ok(isFactorisedForm(parseExpression('2(x+1)(x-3)')));
  assert.ok(isFactorisedForm(parseExpression('(x-4)^2')));
  assert.ok(!isFactorisedForm(parseExpression('x^2+5x+6')));
  assert.ok(!isFactorisedForm(parseExpression('(2x+2)(x+3)')));
  assert.ok(!isFactorisedForm(parseExpression('x(x+5)+6')));
  assert.ok(isExpandedForm(parseExpression('x^2+5x+6')));
  assert.ok(!isExpandedForm(parseExpression('x^2+2x+3x+6')));
  assert.ok(!isExpandedForm(parseExpression('x(x+5)')));
});

test('numbers: decimal comma, fractions, mixed numbers', () => {
  assert.equal(parseNumber('2,5')?.value, 2.5);
  assert.equal(parseNumber('-3/4')?.value, -0.75);
  assert.equal(parseNumber('1 1/2')?.value, 1.5);
  assert.equal(parseNumber('x = 7')?.value, 7);
  assert.equal(parseNumber('−4')?.value, -4);
  assert.equal(parseNumber('abc'), null);
  assert.equal(parseNumber('4 725')?.value, 4725);
  assert.equal(parseNumber('1 250 000,5')?.value, 1250000.5);
  assert.equal(parseNumber('1 1/2')?.value, 1.5);
});

test('grading: equivalent fractions, simplest form, misconceptions', () => {
  const spec: AnswerSpec = { kind: 'fraction', n: 3, d: 4, requireSimplest: true };
  assert.equal(gradeResponse(spec, '3/4').correct, true);
  assert.equal(gradeResponse(spec, '6/8').mistake, 'unsimplified');
  assert.equal(gradeResponse(spec, '0,75').correct, true);
  const r = gradeResponse({ kind: 'numeric', value: 3, tolerance: 0 }, '7', [
    { code: 'one-side-only', answer: { kind: 'numeric', value: 7, tolerance: 0 }, feedback: 'x' },
  ]);
  assert.equal(r.mistake, 'one-side-only');
  assert.ok(gradeResponse({ kind: 'numeric', value: 3, tolerance: 0 }, '??').parseError);
});

test('grading: roots in any order; coefficients not in lowest ratio', () => {
  const roots: AnswerSpec = { kind: 'roots', values: [{ n: -2, d: 1 }, { n: 1, d: 2 }] };
  assert.equal(gradeResponse(roots, ['0.5', '-2']).correct, true);
  assert.equal(gradeResponse(roots, ['1/2', '-2']).correct, true);
  const co: AnswerSpec = { kind: 'coefficients', values: [2, 1, 2] };
  assert.equal(gradeResponse(co, ['2', '', '2']).correct, true);
  assert.equal(gradeResponse(co, ['4', '2', '4']).mistake, 'not-lowest-ratio');
  assert.equal(gradeResponse(co, ['1', '1', '1']).mistake, 'unbalanced');
});

test('every skill has a template and every template a skill', () => {
  const ids = new Set(TEMPLATES.map((t) => t.id));
  for (const s of SKILLS) assert.ok(ids.has(s.templateId), `skill ${s.id} → missing template ${s.templateId}`);
  for (const t of TEMPLATES) assert.ok(SKILLS.some((s) => s.id === t.skillId), `template ${t.id} → unknown skill`);
});

// Foundation Phase (Junior) templates have their own, stricter suite: src/shared/junior/junior.test.ts.
for (const template of TEMPLATES.filter((t) => SKILLS.find((s) => s.id === t.skillId)?.phase !== 'foundation')) {
  test(`generator ${template.id}: 5 levels × 250 seeds are self-consistent and render`, () => {
    for (const level of DIFFICULTIES) {
      const prompts = new Set<string>();
      for (let seed = 1; seed <= 250; seed++) {
        const where = `${template.id} L${level} seed ${seed}`;
        const q = generateQuestion(template.id, seed * 7919, level);
        const all = [q.prompt, q.answerDisplay, ...q.hints, ...q.solution, ...q.misconceptions.map((m) => m.feedback)];
        if (q.input.kind === 'choice') all.push(...q.input.options.map((o) => o.text));
        for (const text of all) {
          assert.ok(text && !/NaN|undefined|Infinity|\[object/.test(text), `${where}: bad text "${text}"`);
          assertTexRenders(text, where);
        }
        assert.ok(q.hints.length >= 1, `${where}: no hints`);
        assert.ok(q.solution.length >= 1, `${where}: no solution`);
        assert.equal(q.input.kind === 'fraction' ? 'fraction' : q.input.kind, q.answer.kind === 'fraction' ? 'fraction' : q.input.kind, `${where}: input/answer kinds differ`);

        const grade = gradeResponse(q.answer, canonical(q.answer), q.misconceptions);
        assert.equal(grade.correct, true, `${where}: canonical answer graded wrong (${JSON.stringify(q.answer)}) ${JSON.stringify(grade)}`);

        for (const m of q.misconceptions) {
          assert.ok(m.code in MISTAKES, `${where}: unknown mistake code ${m.code}`);
          const g = gradeResponse(q.answer, canonical(m.answer), q.misconceptions);
          assert.equal(g.correct, false, `${where}: misconception ${m.code} graded correct`);
          assert.ok(g.mistake, `${where}: misconception ${m.code} not diagnosed (${JSON.stringify(g)})`);
        }
        prompts.add(q.prompt + JSON.stringify(q.figure ?? null));
      }
      // Fact-based skills draw from finite pools (there are only 9 steps in the path of blood); parametric ones must vary more.
      const FACT_POOLS: Record<string, number> = { 'balancing-equations': 3, 'cell-structure': 4, 'heat-transfer': 6, 'body-systems': 8, 'atomic-structure': 8, 'monohybrid-crosses': 8 };
      // Natural Sciences & Technology (Gr 4–6) is mostly fact-based concept checks: each level draws on a curated pool.
      const skill = SKILLS.find((s) => s.id === template.skillId);
      const nst = !!skill && subjectOfSkill(skill) === 'natural-sciences';
      const minUnique = FACT_POOLS[template.id] ?? (nst ? 3 : 10);
      assert.ok(prompts.size >= minUnique, `${template.id} L${level}: only ${prompts.size} distinct questions`);
    }
  });
}
