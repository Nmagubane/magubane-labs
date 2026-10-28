import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toSpoken, spokenChunks } from './spoken.ts';

const cases: [string, string][] = [
  ['3 + 3 = 6', '3 plus 3 is 6'],
  ['98 − 71 = 27', '98 take away 71 is 27'],
  ['17 + ? = 89.', '17 plus what is 89.'],
  ['170 + ? = 890.', 'one hundred and seventy plus what is eight hundred and ninety.'],
  ['2 × 10 = 20.', '2 times 10 is 20.'],
  ['20 ÷ 4 = 5', '20 shared by 4 is 5'],
  ['415 + 346 = 761', 'four hundred and fifteen plus three hundred and forty-six is seven hundred and sixty-one'],
  ['It is 12:05.', 'It is five past twelve.'],
  ['Show 3:30.', 'Show half past three.'],
  ['It is 4:45.', 'It is quarter to five.'],
  ['It is 7:00.', "It is seven o'clock."],
  ['It is 2:40.', 'It is twenty to three.'],
  ['R10 + R2 = R12.', '10 rand plus 2 rand is 12 rand.'],
  ['It costs R12,50.', 'It costs 12 rand 50.'],
  ['You have 50c.', 'You have 50 cents.'],
  ['c-a-t: cat.', 'c, a, t: cat.'],
  ['t - r - ee: tree.', 't, r, ee: tree.'],
  ['Push the sounds together: c… a… t.', 'Push the sounds together: c, a, t.'],
  ['It has 3 sounds: _ _ _.', 'It has 3 sounds.'],
  ['What is your name _', 'What is your name'],
  ['sunflower = sun + flower.', 'sunflower is sun and flower.'],
  ['Tap everything that is NOT safe.', 'Tap everything that is not safe.'],
  ['A soccer ball is shaped like a ball (sphere).', 'A soccer ball is shaped like a ball, or sphere.'],
  ['Plants need soil (or something to grow in).', 'Plants need soil, or something to grow in.'],
  ['“The cat is on the bed.”', 'The cat is on the bed.'],
  ['It drinks its mother’s milk.', "It drinks its mother's milk."],
  ['Colour 3/4 of the shape.', 'Colour three quarters of the shape.'],
  ['1/2 of 8 is 4.', 'one half of 8 is 4.'],
  ['forty-six and plant-eaters stay words.', 'forty-six and plant-eaters stay words.'],
  ['Count to 1 000.', 'Count to one thousand.'],
];

test('written Junior text is said the way a Foundation Phase teacher would say it', () => {
  for (const [written, said] of cases) assert.equal(toSpoken(written), said, written);
});

test('speech is cut into sentences, and one-word bits ride with the next sentence', () => {
  assert.deepEqual(spokenChunks('Yes! It is 6. Well done.'), ['Yes! It is 6.', 'Well done.']);
  assert.deepEqual(spokenChunks('Not quite. 3 + 3 = 6'), ['Not quite.', '3 plus 3 is 6']);
});
