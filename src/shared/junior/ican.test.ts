import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FOUNDATION_SKILLS } from '../curriculum/foundation.ts';
import { icanText, icanSpoken, icanReady } from './ican.ts';
import { toYou } from './packs/en/ican.ts';

test('every Grade 1–3 skill has an "I can" statement, said back to the child as "you can"', () => {
  for (const s of FOUNDATION_SKILLS) {
    const t = icanText(s.id);
    assert.ok(t && /^I can [a-z]/.test(t) && t.endsWith('.'), `${s.id}: ${t}`);
    const said = icanSpoken(s.id) as string;
    assert.ok(/^You can .+ now!$/.test(said) && !/\b(my|I|me)\b/.test(said.replace(/^You can /, '')), `${s.id}: ${said}`);
  }
  assert.equal(new Set(FOUNDATION_SKILLS.map((s) => icanText(s.id))).size, FOUNDATION_SKILLS.length, 'no two skills claim the same thing');
  assert.equal(toYou('say which sense I am using and how to care for my body'), 'say which sense you are using and how to care for your body');
  assert.equal(icanText('factorise-trinomial'), null);
});

test('a statement is earned only when the skill is secure on enough answers', () => {
  assert.equal(icanReady(72, 6), true);
  assert.equal(icanReady(69, 20), false);
  assert.equal(icanReady(90, 4), false, 'one lucky set is not enough');
});
