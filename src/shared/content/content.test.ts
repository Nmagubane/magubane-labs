import { test } from 'node:test';
import assert from 'node:assert/strict';
import katex from 'katex';
import { LESSONS, getLesson } from './lessons.ts';
import { SKILLS } from '../curriculum/catalogue.ts';
import { EQUATIONS } from '../questions/generators/science-chemistry.ts';

function texOk(text: string, where: string) {
  const re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    try {
      katex.renderToString((m[1] ?? m[2]) as string, { throwOnError: true, strict: 'ignore' });
    } catch (e) {
      assert.fail(`${where}: ${(e as Error).message}`);
    }
  }
  assert.equal((text.match(/\$/g) ?? []).length % 2, 0, `${where}: unbalanced $`);
}

test('every skill has a lesson for the same skill', () => {
  // Foundation Phase skills teach through "watch first" worked examples, not written lessons.
  for (const s of SKILLS.filter((x) => x.phase !== 'foundation')) {
    const l = getLesson(s.lessonId);
    assert.ok(l, `missing lesson ${s.lessonId}`);
    assert.equal(l!.skillId, s.id);
  }
});

test('lesson text renders and has a check', () => {
  for (const l of LESSONS) {
    assert.ok(l.blocks.some((b) => b.kind === 'check'), `${l.id}: no check`);
    for (const [i, b] of l.blocks.entries()) {
      const where = `${l.id}#${i}`;
      if (b.kind === 'text' || b.kind === 'key-idea') texOk(b.body, where);
      if (b.kind === 'widget') texOk(b.task, where);
      if (b.kind === 'trap') (texOk(b.wrong, where), texOk(b.why, where));
      if (b.kind === 'predict') {
        texOk(b.prompt, where);
        b.options.forEach((o) => texOk(o, where));
        texOk(b.explanation, where);
        assert.ok(b.answer >= 0 && b.answer < b.options.length);
      }
      if (b.kind === 'widget' && b.widget.type === 'chem-balancer') assert.ok(EQUATIONS[b.widget.level][b.widget.index], `${where}: no equation`);
    }
  }
});
