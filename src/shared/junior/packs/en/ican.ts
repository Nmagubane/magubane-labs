/**
 * "I can…": what a child can do once a skill is secure, in words they'd use themselves.
 * Earned when a skill reaches Proficient (reliably right at the middle levels of the grade), so each line
 * claims what those questions ask, never the hardest edge of the grade's range.
 * Shown as "I can …"; said to the child as "You can … now!".
 * TRANSLATORS: write each as a phrase that follows "I can".
 */
export const ICAN: Record<string, Partial<Record<1 | 2 | 3, string>>> = {
  // Mathematics
  'count-objects': { 1: 'count lots of things by putting them in groups of ten', 2: 'count big piles of things in tens and fives', 3: 'count hundreds of things using hundreds, tens and ones' },
  counting: { 1: 'count forwards and backwards, and in 2s, 5s and 10s', 2: 'count on and back in 2s, 3s, 4s, 5s and 10s', 3: 'count on and back in 20s, 25s, 50s and 100s' },
  numerals: { 1: 'find a number when I hear it', 2: 'read numbers and number names up to 200', 3: 'read numbers and number names up to 1 000' },
  compare: { 1: 'put numbers in order from smallest to biggest', 2: 'say which of two numbers is bigger', 3: 'put three-digit numbers in order' },
  'place-value': { 1: 'see a number like 14 as one ten and some ones', 2: 'break a number into tens and ones', 3: 'break a number into hundreds, tens and ones' },
  'add-sub': { 1: 'add and take away with answers up to 20', 2: 'add and take away two-digit numbers', 3: 'add and take away three-digit numbers' },
  bonds: { 1: 'find the pairs of numbers that make 10', 2: 'find the pairs that make 20, and add tens', 3: 'find the missing number that makes 100' },
  'word-problems': { 1: 'solve story sums', 2: 'solve story sums with bigger numbers', 3: 'solve story sums with big numbers' },
  groups: { 1: 'share things equally and count in groups', 2: 'multiply by 2, 3, 4 and 5', 3: 'multiply and divide by 2, 3, 4, 5 and 10' },
  fractions: { 1: 'find a half and a quarter', 2: 'name fractions like three quarters', 3: 'find a fraction of a shape or a group' },
  money: { 1: 'know our coins and notes and add up money', 2: 'add up money and work out change', 3: 'work with rands and cents' },
  patterns: { 1: 'carry on a pattern', 2: 'find the rule in a number pattern', 3: 'find the missing numbers in a pattern' },
  shapes: { 1: 'name circles, triangles, squares, balls and boxes', 2: 'name rectangles and cylinders and count their sides', 3: 'name cones and pyramids and sort shapes' },
  position: { 1: 'say where things are: on, under, next to, left and right', 2: 'describe where things are', 3: 'find my way on a map grid' },
  time: { 1: 'say the days of the week in order', 2: 'tell the time on the hour and half hour', 3: 'tell the time to the quarter hour' },
  measure: { 1: 'say which is longer, heavier or holds more', 2: 'measure with blocks and choose metres, kilograms or litres', 3: 'measure in centimetres and count squares to find the area' },
  data: { 1: 'read a picture graph', 2: 'read tally marks and picture graphs', 3: 'read a bar graph' },
  // Home Language
  'first-sounds': { 1: 'hear the first and last sound in a word', 2: 'hear sounds like sh, ch and th', 3: 'hear vowel sounds like ee, ai and oa' },
  phonological: { 1: 'hear rhymes and clap the parts of a word', 2: 'find rhymes and count the parts in long words', 3: 'split a word like sunflower into two words' },
  decode: { 1: 'sound out and read three-letter words', 2: 'read words like ship and frog', 3: 'read words like rain and boat' },
  'sight-words': { 1: 'read words like the, is and go straight away', 2: 'read lots of common words straight away', 3: 'read even more common words at a glance' },
  spelling: { 1: 'spell three-letter words', 2: 'spell words like fish and frog', 3: 'spell words like boat and tree' },
  sentences: { 1: 'read a short sentence', 2: 'read a sentence and put words in the right order', 3: 'read long sentences' },
  comprehension: { 1: 'listen to a story and answer questions about it', 2: 'read a short story and say who, what and where', 3: 'read a story and say why things happened' },
  language: { 1: 'find opposites like big and small', 2: 'make plurals and spot questions', 3: 'use words like jumped, but and because' },
  // English First Additional Language
  'fal-vocabulary': { 1: 'understand English words for my body, family, food and colours', 2: 'understand English words for animals, clothes, weather and places', 3: 'understand English words for actions, feelings and helpers' },
  'fal-instructions': { 1: 'follow an instruction in English', 2: 'follow English instructions with colours and sizes', 3: 'follow longer instructions in English' },
  'fal-phonics': { 2: 'hear the first sound of English words', 3: 'hear English sounds like sh, ch and ee' },
  'fal-reading': { 2: 'read simple English words', 3: 'read short English sentences' },
  // Life Skills
  'my-body': { 1: 'name my body parts and my five senses', 2: 'say which sense I am using and how to care for my body', 3: 'say what my heart, lungs and other parts do' },
  healthy: { 1: 'say how to stay healthy: wash hands, brush teeth and sleep', 2: 'sort everyday food from sometimes food', 3: 'choose a healthy lunch' },
  safety: { 1: 'spot dangers at home and at school', 2: 'cross the road safely', 3: 'stop, drop and roll, and know some first aid' },
  plants: { 1: 'say what a plant needs to grow', 2: 'name the parts of a plant', 3: 'explain how plants grow and spread' },
  animals: { 1: 'say what a pet needs', 2: 'sort wild animals and farm animals', 3: 'put an animal life cycle in order' },
  weather: { 1: 'name the weather and dress for it', 2: 'name the four seasons', 3: 'read weather symbols' },
  'water-sky': { 1: 'say how we use water and what is in the sky', 2: 'explain why we save water, and why there is day and night', 3: 'predict what floats and what sinks' },
  feelings: { 1: 'name feelings and use good manners', 2: 'notice how others feel and help them', 3: 'talk about my feelings, my rights and my responsibilities' },
  community: { 1: 'name my family and the people who help us', 2: 'name kinds of transport', 3: 'name jobs in my community and how to look after our world' },
};

/** "I am" / "my" → "you are" / "your", for saying it to the child. */
export function toYou(phrase: string): string {
  return phrase
    .replace(/\bI am\b/g, 'you are')
    .replace(/\bmy\b/g, 'your')
    .replace(/\bme\b/g, 'you')
    .replace(/\bI\b/g, 'you');
}

export const icanShown = (phrase: string): string => `I can ${phrase}.`;
export const icanSaid = (phrase: string): string => `You can ${toYou(phrase)} now!`;
