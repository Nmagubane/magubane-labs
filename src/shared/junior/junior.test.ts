import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JUNIOR_TEMPLATES } from './templates.ts';
import { generateQuestion } from '../questions/registry.ts';
import { gradeResponse, canonicalResponse } from '../questions/answer.ts';
import { DIFFICULTIES, type GeneratedQuestion } from '../questions/types.ts';
import { MISTAKES } from '../questions/mistakes.ts';
import { getSkill } from '../curriculum/catalogue.ts';
import { FOUNDATION_SKILLS } from '../curriculum/foundation.ts';

const BAD = /NaN|undefined|Infinity|\[object|null/;

function texts(q: GeneratedQuestion): string[] {
  const out = [q.prompt, q.say ?? '', q.answerDisplay, ...q.hints, ...q.solution, ...q.misconceptions.map((m) => m.feedback)];
  const i = q.input;
  if (i.kind === 'choice') for (const o of i.options) out.push(o.text, o.say ?? 'x');
  if (i.kind === 'pick' || i.kind === 'order') for (const t of i.kind === 'pick' ? i.options : i.items) out.push(t.text ?? t.icon ?? '', t.say ?? 'x');
  if (i.kind === 'sort') for (const t of [...i.bins, ...i.items]) out.push(t.text ?? t.icon ?? '');
  return out;
}

/** The input can actually produce the answer, and the answer's kind fits the input. */
function assertAnswerable(q: GeneratedQuestion, where: string) {
  const i = q.input;
  const a = q.answer;
  const numericInputs = ['pad', 'build', 'numberline', 'clock'];
  if (numericInputs.includes(i.kind)) {
    assert.equal(a.kind, 'numeric', `${where}: ${i.kind} needs a numeric answer`);
    if (a.kind !== 'numeric') return;
    assert.ok(Number.isInteger(a.value) && a.value >= 0, `${where}: answer ${a.value} is not a whole number`);
    if (i.kind === 'pad') assert.ok(a.value <= i.max, `${where}: pad max ${i.max} < ${a.value}`);
    if (i.kind === 'build') {
      assert.ok(a.value <= i.max, `${where}: build max ${i.max} < ${a.value}`);
      if (i.tool === 'coins') {
        assert.ok(i.coins && i.coins.length, `${where}: coins tool without coins`);
        // greedy check that the amount can be made from the offered denominations
        let left = a.value;
        for (const c of [...(i.coins ?? [])].sort((x, y) => y - x)) left -= Math.floor(left / c) * c;
        assert.equal(left, 0, `${where}: ${a.value}c cannot be made from ${i.coins}`);
      }
    }
    if (i.kind === 'numberline') assert.ok(a.value >= i.min && a.value <= i.max && (a.value - i.min) % i.step === 0, `${where}: numberline cannot reach ${a.value}`);
    if (i.kind === 'clock') assert.ok(a.value < 720 && a.value % i.step === 0, `${where}: clock cannot show ${a.value}`);
  }
  if (i.kind === 'choice') {
    assert.equal(a.kind, 'choice');
    const ids = i.options.map((o) => o.id);
    assert.equal(new Set(ids).size, ids.length, `${where}: duplicate option ids`);
    const shown = i.options.map((o) => `${o.text}|${o.icon ?? ''}`);
    assert.equal(new Set(shown).size, shown.length, `${where}: two options look the same: ${shown}`);
    assert.ok(a.kind === 'choice' && ids.includes(a.id), `${where}: answer not an option`);
    assert.ok(i.options.length >= 2 && i.options.length <= 6, `${where}: ${i.options.length} options`);
  }
  if (i.kind === 'pick') {
    assert.equal(a.kind, 'set');
    const ids = i.options.map((o) => o.id);
    assert.equal(new Set(ids).size, ids.length, `${where}: duplicate tile ids`);
    assert.ok(a.kind === 'set' && a.ids.length >= 1 && a.ids.every((x) => ids.includes(x)) && a.ids.length < ids.length, `${where}: bad pick answer`);
    assert.ok(ids.length <= 8, `${where}: too many pick tiles`);
  }
  if (i.kind === 'order') {
    assert.equal(a.kind, 'sequence');
    const ids = i.items.map((o) => o.id);
    assert.equal(new Set(ids).size, ids.length, `${where}: duplicate tile ids`);
    assert.ok(a.kind === 'sequence' && a.ids.length === ids.length && ids.every((x) => a.ids.includes(x)), `${where}: order answer must use every tile once`);
    assert.ok(ids.length <= 8);
  }
  if (i.kind === 'sort') {
    assert.equal(a.kind, 'groups');
    const items = i.items.map((t) => t.id);
    const bins = i.bins.map((t) => t.id);
    assert.ok(a.kind === 'groups' && Object.keys(a.pairs).length === items.length && items.every((x) => bins.includes(a.pairs[x] as string)), `${where}: bad sort answer`);
    assert.ok(items.length <= 8 && bins.length >= 2 && bins.length <= 3);
    assert.ok(new Set(Object.values(a.kind === 'groups' ? a.pairs : {})).size >= 2, `${where}: everything in one bin`);
  }
  if (i.kind === 'spell') {
    assert.equal(a.kind, 'text');
    if (a.kind !== 'text') return;
    const pool = [...i.tiles];
    // tiles may be single letters or digraphs; greedy match from the left
    let w = a.value;
    while (w.length) {
      const t = pool.filter((x) => w.startsWith(x)).sort((x, y) => y.length - x.length)[0];
      assert.ok(t, `${where}: cannot spell "${a.value}" from ${i.tiles}`);
      pool.splice(pool.indexOf(t as string), 1);
      w = w.slice((t as string).length);
    }
    assert.ok(i.length >= 1);
  }
}

test('every Foundation Phase skill has exactly one Junior template', () => {
  const ids = new Set(JUNIOR_TEMPLATES.map((t) => t.id));
  const missing = FOUNDATION_SKILLS.filter((s) => !ids.has(s.templateId)).map((s) => s.id);
  assert.deepEqual(missing, [], `skills without templates: ${missing.join(', ')}`);
  for (const t of JUNIOR_TEMPLATES) assert.ok(getSkill(t.skillId), `template ${t.id} has no skill`);
});

for (const template of JUNIOR_TEMPLATES) {
  test(`junior ${template.id}: 5 levels × 200 seeds are answerable and self-consistent`, () => {
    for (const level of DIFFICULTIES) {
      const seen = new Set<string>();
      for (let seed = 1; seed <= 200; seed++) {
        const where = `${template.id} L${level} seed ${seed}`;
        const q = generateQuestion(template.id, seed * 7919, level, { lang: 'en' });
        for (const t of texts(q)) assert.ok(t !== undefined && !BAD.test(t), `${where}: bad text "${t}"`);
        assert.ok(q.prompt.length > 0 && (q.say ?? '').length > 0, `${where}: needs a prompt and a spoken prompt`);
        assert.ok(!/\$/.test(q.prompt + q.say + q.answerDisplay), `${where}: no TeX in Junior text`);
        assert.ok(q.hints.length >= 1 && q.solution.length >= 1, `${where}: needs hints and a solution`);
        assertAnswerable(q, where);
        const g = gradeResponse(q.answer, canonicalResponse(q.answer), q.misconceptions);
        assert.equal(g.correct, true, `${where}: canonical answer graded wrong ${JSON.stringify(q.answer)}`);
        for (const m of q.misconceptions) {
          assert.ok(m.code in MISTAKES, `${where}: unknown mistake ${m.code}`);
          const mg = gradeResponse(q.answer, canonicalResponse(m.answer), q.misconceptions);
          assert.equal(mg.correct, false, `${where}: misconception ${m.code} graded correct`);
          assert.equal(mg.mistake, m.code, `${where}: misconception ${m.code} not diagnosed`);
          assert.ok(m.feedback.length > 3, `${where}: empty feedback`);
        }
        seen.add(q.prompt + (q.say ?? '') + JSON.stringify(q.scene ?? null) + JSON.stringify(q.input));
      }
      assert.ok(seen.size >= 4, `${template.id} L${level}: only ${seen.size} distinct questions`);
    }
  });
}

test('every Junior answer can be shown after marking', () => {
  for (const t of JUNIOR_TEMPLATES)
    for (const level of DIFFICULTIES)
      for (let seed = 1; seed <= 40; seed++) {
        const q = generateQuestion(t.id, seed * 104729, level, { lang: 'en' });
        assert.ok(q.answerDisplay.trim().length > 0, `${t.id} L${level} seed ${seed}: empty answerDisplay`);
        if (q.input.kind === 'choice') for (const o of q.input.options) assert.ok(o.text || o.icon, `${t.id}: option with neither text nor picture`);
      }
});
