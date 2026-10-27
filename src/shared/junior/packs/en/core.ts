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
  clear: 'Start again',
  undo: 'Undo',
  watch: 'Watch first',
  done: 'I am done',
  goHome: 'Back',
  play: 'Play',
  yes: (answer: string) => `Yes! ${answer}.`,
  notYet: 'Not yet.',
  lookTogether: "Let's look together.",
  correctWas: (answer: string) => `The answer is ${answer}.`,
  picked: (n: number) => (n === 1 ? '1 picked' : `${n} picked`),
  tapToPlace: 'Tap a picture, then tap its box.',
  tapInOrder: 'Tap them in order.',
  youMade: (n: string) => `You made ${n}.`,
  sessionDone: (name: string) => `Well done for practising, ${name}.`,
  youPractised: (skill: string) => `You practised ${skill}.`,
  firstTry: (n: number, of: number) => `${n} of ${of} right first time.`,
  greeting: (name: string) => `Hello, ${name}!`,
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
