import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rightLine, wrongLine, hintLine, doneLine, watchLine } from './narrate.ts';

test('praise varies from one question to the next and says short answers back', () => {
  const lines = [0, 1, 2, 3].map((n) => rightLine('11', n));
  assert.equal(new Set(lines).size, 4);
  assert.ok(lines.every((l) => l.includes('11')));
  // Long answers (sorted sets, lists) are not read back.
  assert.ok(!rightLine('everyday food: egg, bread. sometimes food: doughnut', 0).includes('doughnut'));
});

test('a wrong answer never says the same sentence twice', () => {
  const w = wrongLine('We see with our eyes.', ['We see with our eyes.'], 0);
  assert.equal(w.spoken, 'Not quite. We see with our eyes.');
  const story = wrongLine('Look back at the story. The story says Thabo had a red ball.', ['The story says Thabo had a red ball.'], 1);
  assert.equal(story.spoken.match(/red ball/g)?.length, 1);
});

test('a near miss sounds like one, and the working follows "let\'s look together"', () => {
  const w = wrongLine('Nearly. When you count on from 3, start with the next number.', ['3 and 3 more is 6.', '3 + 3 = 6'], 0);
  assert.match(w.opener, /close|Nearly/);
  assert.ok(!/Nearly\. When/.test(w.spoken));
  assert.match(w.spoken, /Let's look together\. 3 and 3 more is 6\. 3 \+ 3 = 6$/);
});

test('hints, watch-first and the end of a set sound like a person', () => {
  assert.equal(hintLine('Count in 2s.', 0), "Here's a clue. Count in 2s.");
  assert.equal(watchLine('What is 2 + 2?', ['2 and 2 more is 4.']), 'Watch me do one. What is 2 + 2? 2 and 2 more is 4. Now you try.');
  assert.match(doneLine({ name: 'Thandi', skill: 'Count objects', right: 5, total: 5, n: 0 }).spoken, /all 5 right first time, Thandi/);
  assert.equal(doneLine({ name: 'Thandi', skill: 'Count objects', right: 3, total: 5, n: 0 }).title, 'You practised count objects.');
});
