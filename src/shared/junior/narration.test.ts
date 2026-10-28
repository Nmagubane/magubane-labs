/**
 * Everything a Grade 1–3 child can hear, checked for the things that make a voice sound like a robot:
 * symbols read literally, blanks read as "something", "1 tens", "a ice-cream", and words said twice.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JUNIOR_TEMPLATES } from './templates.ts';
import { generateQuestion } from '../questions/registry.ts';
import { toSpoken } from './spoken.ts';
import type { Difficulty } from '../questions/types.ts';

const CHECKS: [string, RegExp][] = [
  ['a symbol read literally', /[_+=×÷−<>]/],
  ['a blank read as "something"', /, something[,.]|^something\b/i],
  ['"1" with a plural', /\b1 (?:tens|ones|hundreds|groups|times)\b|\bare 1\b/i],
  ['"a" before a vowel', /\b[Aa] (?:[aeiou][a-z]{2,}|8\b|11\b|18\b)/],
  ['a word said twice', /\b([a-z]{2,}) \1\b/i],
  ['a sentence starting with a bare word', /^[a-z]+\. /],
  ['a "Tap:" instruction', /\bTap: /],
];

test('everything the voice says sounds like a teacher, not a calculator', () => {
  const problems: string[] = [];
  for (const t of JUNIOR_TEMPLATES)
    for (const level of [1, 2, 3, 4, 5] as Difficulty[])
      for (let seed = 1; seed <= 25; seed++) {
        const q = generateQuestion(t.id, seed * 7919, level, { lang: 'en' });
        const heard = [q.say ?? q.prompt, ...q.hints, ...q.solution, ...q.misconceptions.map((m) => m.feedback ?? '')];
        if (q.input.kind === 'choice') heard.push(...q.input.options.map((o) => o.say ?? o.text ?? ''));
        for (const text of heard) {
          if (!text) continue;
          const said = toSpoken(text);
          for (const [what, re] of CHECKS) if (re.test(said)) problems.push(`${t.id} L${level}: ${what}: "${said}"`);
        }
        for (const h of q.hints) if (h.trim().split(/\s+/).length < 2) problems.push(`${t.id} L${level}: a one-word hint: "${h}"`);
      }
  assert.deepEqual([...new Set(problems)].slice(0, 15), []);
});
