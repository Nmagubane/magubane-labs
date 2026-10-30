/**
 * English Junior pack: the words every activity shares.
 *
 * TRANSLATORS: copy this folder to packs/<code>/ and rewrite each entry in your language. Write whole
 * phrases, not word-for-word: functions are there so a phrase can change with its noun (noun classes)
 * or its number. Keep numbers on their own where possible ("Show 7.") so they need no agreement.
 * Keep sentences short: a six-year-old hears them before they can read them.
 */

/** Things children count. The icon is language-free; the words are this language's. */
export const ITEMS = {
  apple: { icon: '🍎', one: 'apple', many: 'apples' },
  orange: { icon: '🍊', one: 'orange', many: 'oranges' },
  banana: { icon: '🍌', one: 'banana', many: 'bananas' },
  mango: { icon: '🥭', one: 'mango', many: 'mangoes' },
  ball: { icon: '⚽', one: 'ball', many: 'balls' },
  car: { icon: '🚗', one: 'car', many: 'cars' },
  star: { icon: '⭐', one: 'star', many: 'stars' },
  fish: { icon: '🐟', one: 'fish', many: 'fish' },
  bird: { icon: '🐦', one: 'bird', many: 'birds' },
  flower: { icon: '🌼', one: 'flower', many: 'flowers' },
  book: { icon: '📕', one: 'book', many: 'books' },
  sweet: { icon: '🍬', one: 'sweet', many: 'sweets' },
  egg: { icon: '🥚', one: 'egg', many: 'eggs' },
  cow: { icon: '🐄', one: 'cow', many: 'cows' },
  chicken: { icon: '🐔', one: 'chicken', many: 'chickens' },
  goat: { icon: '🐐', one: 'goat', many: 'goats' },
  pencil: { icon: '✏️', one: 'pencil', many: 'pencils' },
  cupcake: { icon: '🧁', one: 'cupcake', many: 'cupcakes' },
  leaf: { icon: '🍃', one: 'leaf', many: 'leaves' },
  shell: { icon: '🐚', one: 'shell', many: 'shells' },
  mielie: { icon: '🌽', one: 'mielie', many: 'mielies' },
  butterfly: { icon: '🦋', one: 'butterfly', many: 'butterflies' },
  strawberry: { icon: '🍓', one: 'strawberry', many: 'strawberries' },
  balloon: { icon: '🎈', one: 'balloon', many: 'balloons' },
} satisfies Record<string, { icon: string; one: string; many: string }>;
export type ItemId = keyof typeof ITEMS;
export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];

/** Names for story sums. South African, and they work in every language. */
export const NAMES = ['Thandi', 'Sipho', 'Lerato', 'Anele', 'Pieter', 'Ayanda', 'Kagiso', 'Naledi', 'Musa', 'Zanele', 'Ruan', 'Fatima', 'Lindiwe', 'Tshepo', 'Mpho', 'Karabo', 'Amahle', 'Bongani', 'Nomsa', 'Liam'];

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** 0–1 000 in words, South African English: "three hundred and five", "forty-six". */
export function numberWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 1000) throw new Error(`numberWords: ${n}`);
  if (n === 1000) return 'one thousand';
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const restWords = rest < 20 ? ONES[rest]! : `${TENS[Math.floor(rest / 10)]}${rest % 10 ? `-${ONES[rest % 10]}` : ''}`;
  if (!h) return restWords;
  return rest ? `${ONES[h]} hundred and ${restWords}` : `${ONES[h]} hundred`;
}

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
export const ordinal = (n: number): string => ORDINALS[n - 1] ?? `${n}th`;

/** "R7", "50c", "R12,50": how South Africans write money. */
export function money(cents: number): string {
  if (cents < 100) return `${cents}c`;
  const r = Math.floor(cents / 100);
  const c = cents % 100;
  return c ? `R${r},${String(c).padStart(2, '0')}` : `R${r}`;
}
/** How money is said aloud. */
export function moneySaid(cents: number): string {
  if (cents < 100) return `${cents} cents`;
  const r = Math.floor(cents / 100);
  const c = cents % 100;
  return `${r} rand${c ? ` ${c}` : ''}`;
}

/** Words on the child's screens. Short, kind, and never about scores. */
export const UI = {
  listen: 'Listen again',
  help: 'Help me',
  check: 'Check',
  next: 'Next',
  tryOneLikeIt: 'Try one like it',
  oneLikeIt: 'One like it',
  clear: 'Start again',
  undo: 'Undo',
  watch: 'Watch first',
  done: 'I am done',
  goHome: 'Back',
  play: 'Play',
  correctWas: (answer: string) => `The answer is ${answer}.`,
  picked: (n: number) => (n === 1 ? '1 picked' : `${n} picked`),
  tapToPlace: 'Tap a picture, then tap its box.',
  tapInOrder: 'Tap them in order.',
  youMade: (n: string) => `You made ${n}.`,
  firstTry: (n: number, of: number) => `${n} of ${of} right first time.`,
  todayIntro: 'What shall we learn today?',
  worlds: { mathematics: 'Maths', 'home-language': 'Reading', 'english-fal': 'English', 'life-skills': 'My world' },
  worldSay: { mathematics: 'Maths', 'home-language': 'Reading and words', 'english-fal': 'English words', 'life-skills': 'My world' },
  chooseSomething: 'Or choose something else',
  allSkills: 'Everything to learn',
  growing: 'Growing',
  strong: 'Strong',
  new: 'New',
  signOut: 'I am finished',
  whoIsPlaying: 'Who is learning?',
  pictureCode: 'Tap your 3 pictures',
  wrongCode: 'Those are not your pictures. Try again.',
  locked: 'Ask a grown-up to help you.',
  grownUps: 'Grown-ups',
  hour: (h: number) => `${h} o'clock`,
} as const;

const cap1 = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * What the voice says around the questions. Several ways of saying each thing, so it sounds like a person
 * and not a recording on repeat. Warm, short and honest: praise the thinking, never the child's "cleverness",
 * and no prizes or points.
 * TRANSLATORS: write as many or as few variants as sound natural in your language.
 */
export const TALK = {
  /** Right first time, saying the answer back. Used when the answer is short. */
  rightWithAnswer: [(a: string) => `Yes! ${cap1(a)}.`, (a: string) => `That's right: ${a}.`, (a: string) => `${cap1(a)}. Well done!`],
  /** Extra ways to say a number answer back. */
  rightWithNumber: [(a: string) => `Yes, it's ${a}.`, (a: string) => `${a} is right!`],
  /** Right first time, when the answer is too long to repeat. */
  right: ["Yes, that's right!", 'Well done!', 'You got it!', 'Good thinking!', "That's it!", 'Spot on!'],
  /** A wrong answer. Kind, then straight to the thinking. */
  notYet: ['Not quite.', 'Not yet.', 'Good try.', 'Hmm, not this time.'],
  nearly: ['Oh, so close!', 'Nearly!'],
  together: ["Let's look together.", "Let's work it out.", "Here's how."],
  /** "Try one like it": after a wrong first try, the same kind of question with new numbers. */
  retryOffer: ["Let's try one like it.", 'Now try one like it.', "Here comes one like it. You can do it."],
  retryIntro: ["Here's one like it.", 'One like it.', 'Your turn.'],
  retryRight: ['You got it this time!', 'Yes! You worked it out.', "That's it. You fixed it!"],
  retryWrong: ["That's a tricky one.", 'Not this time.', 'Still tricky.'],
  retryLater: "We'll practise it again soon.",
  doneFixed: (n: number) => `And you fixed ${n === 1 ? 'one more' : `${n} more`} on a second try!`,
  /** "I can…" */
  icanNew: 'And something new:',
  icanNewLabel: 'New',
  icanTitle: 'Things I can do',
  icanAll: (n: number) => `All ${n} things I can do`,
  icanEmpty: 'Keep playing. Each thing you learn goes here.',
  icanIntro: (name: string) => `${name}, here are the things you can do.`,
  /** Before a hint. */
  clue: ["Here's a clue.", 'Try this.', 'Think about this.'],
  /** Watch first. */
  watchStart: 'Watch me do one.',
  watchEnd: 'Now you try.',
  /** End of a set of 5. */
  doneAll: (n: number, name: string) => `You got all ${n} right first time, ${name}! Great thinking.`,
  doneSome: (r: number, n: number) => `You finished! ${r} of ${n} right first time.`,
  doneNone: (n: number) => `You finished all ${n}. These were tricky.`,
  doneEncourage: ['Every mistake helps your brain grow.', 'The more you practise, the easier it gets.', 'Keep going, you are getting stronger.'],
  doneSkill: (skill: string) => `You practised ${skill.charAt(0).toLowerCase()}${skill.slice(1)}.`,
  /** Home and sign-in. */
  greeting: (name: string, hour: number) => `${hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}, ${name}!`,
  homeAsk: ['What shall we learn today?', 'What would you like to do?', 'Pick something to play.'],
  whoIsLearning: "Who's learning today? Tap your name.",
  pictures: (name: string) => `Hi ${name}! Now tap your 3 pictures.`,
  wrongPictures: "Hmm, those aren't your pictures. Let's try again.",
  locked: "Let's ask a grown-up to help you.",
} as const;

/** "a cone", "an oval", "an 8". English only: other packs decide their own articles. */
export function aWord(w: string, capital = false): string {
  const an = (/^[aeiou]/i.test(w) && !/^(one|once|uni|use|usu|eu)/i.test(w)) || /^(8|11|18)(?!\d)|^8\d/.test(w);
  return `${capital ? (an ? 'An' : 'A') : an ? 'an' : 'a'} ${w}`;
}

/** "1 ten", "3 tens", "1 group". */
export const nOf = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** "4 hundreds, 1 ten and 0 ones" (hundreds only when asked for or present). */
export function placeWords(b: { hundreds: number; tens: number; ones: number }, withHundreds = b.hundreds > 0): string {
  const parts = [...(withHundreds ? [nOf(b.hundreds, 'hundred', 'hundreds')] : []), nOf(b.tens, 'ten', 'tens'), nOf(b.ones, 'one', 'ones')];
  return parts.length === 3 ? `${parts[0]}, ${parts[1]} and ${parts[2]}` : `${parts[0]} and ${parts[1]}`;
}

/**
 * A number sequence with a gap, as a teacher reads it aloud: "90, 80, 70, 60. What comes next?" or
 * "87, 77, 67, then a gap, then 47. What number goes in the gap?"
 */
export function saySequence(cells: (number | string | null)[], lead = ''): string {
  const gap = cells.indexOf(null);
  const start = lead ? `${lead} ` : '';
  if (gap === cells.length - 1) return `${start}${cells.slice(0, -1).join(', ')}. What comes next?`;
  if (gap === 0) return `${start}What number comes just before ${cells.slice(1).join(', ')}?`;
  return `${start}${cells.slice(0, gap).join(', ')}, then a gap, then ${cells.slice(gap + 1).join(', ')}. What number goes in the gap?`;
}

/** Pick a variant. `n` turns over as the session goes on so the same line doesn't come twice in a row. */
export function vary<T>(list: readonly T[], n: number): T {
  return list[((n % list.length) + list.length) % list.length]!;
}

export const SHAPE_NAMES = {
  circle: 'circle',
  triangle: 'triangle',
  square: 'square',
  rectangle: 'rectangle',
  oval: 'oval',
  pentagon: 'pentagon',
  hexagon: 'hexagon',
  sphere: 'ball (sphere)',
  cube: 'cube',
  box: 'box (prism)',
  cylinder: 'cylinder',
  cone: 'cone',
  pyramid: 'pyramid',
} satisfies Record<string, string>;
export type ShapeId = keyof typeof SHAPE_NAMES;

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
