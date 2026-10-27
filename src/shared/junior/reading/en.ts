/**
 * English reading pack for Home Language (and English First Additional Language).
 *
 * A reading pack is written for its language, never translated: English is taught letter-sound by
 * letter-sound (s a t p i n …), then digraphs (sh ch th), then vowel teams (ee ai oa). An isiZulu pack
 * would be built from syllables (ba be bi bo bu) instead. Every word here has a picture so a child who
 * cannot read yet can still work with it. Pictures are emoji supported since 2019 (Emoji 12) so they
 * show on older phones; nothing newer.
 */

export interface PicWord {
  word: string;
  icon: string;
}

/** Three-letter consonant–vowel–consonant words (Grade 1). */
export const CVC: PicWord[] = [
  { word: 'cat', icon: '🐈' },
  { word: 'dog', icon: '🐕' },
  { word: 'pig', icon: '🐖' },
  { word: 'hen', icon: '🐔' },
  { word: 'bus', icon: '🚌' },
  { word: 'sun', icon: '☀️' },
  { word: 'bed', icon: '🛏️' },
  { word: 'hat', icon: '🎩' },
  { word: 'map', icon: '🗺️' },
  { word: 'pen', icon: '🖊️' },
  { word: 'box', icon: '📦' },
  { word: 'fox', icon: '🦊' },
  { word: 'bug', icon: '🐛' },
  { word: 'net', icon: '🥅' },
  { word: 'web', icon: '🕸️' },
  { word: 'van', icon: '🚐' },
  { word: 'ant', icon: '🐜' },
  { word: 'mug', icon: '☕' },
  { word: 'nut', icon: '🥜' },
  { word: 'pan', icon: '🍳' },
  { word: 'bat', icon: '🦇' },
  { word: 'rat', icon: '🐀' },
  { word: 'cup', icon: '🥤' },
  { word: 'bag', icon: '👜' },
  { word: 'cap', icon: '🧢' },
  { word: 'leg', icon: '🦵' },
  { word: 'pot', icon: '🍲' },
  { word: 'jet', icon: '✈️' },
  { word: 'bin', icon: '🗑️' },
  { word: 'tub', icon: '🛁' },
  { word: 'ram', icon: '🐏' },
  { word: 'pin', icon: '📌' },
  { word: 'tin', icon: '🥫' },
  { word: 'six', icon: '6️⃣' },
  { word: 'ten', icon: '🔟' },
];

/** First-sound words for single letters (Grade 1). Each starts with the plain sound of its letter. */
export const LETTER_WORDS: Record<string, PicWord[]> = {
  a: [{ word: 'apple', icon: '🍎' }, { word: 'ant', icon: '🐜' }],
  b: [{ word: 'ball', icon: '⚽' }, { word: 'bus', icon: '🚌' }, { word: 'bed', icon: '🛏️' }, { word: 'bat', icon: '🦇' }],
  c: [{ word: 'cat', icon: '🐈' }, { word: 'cup', icon: '🥤' }, { word: 'cap', icon: '🧢' }],
  d: [{ word: 'dog', icon: '🐕' }, { word: 'duck', icon: '🦆' }, { word: 'drum', icon: '🥁' }],
  e: [{ word: 'egg', icon: '🥚' }, { word: 'elephant', icon: '🐘' }],
  f: [{ word: 'fish', icon: '🐟' }, { word: 'fox', icon: '🦊' }, { word: 'frog', icon: '🐸' }],
  g: [{ word: 'goat', icon: '🐐' }, { word: 'gift', icon: '🎁' }],
  h: [{ word: 'hat', icon: '🎩' }, { word: 'hen', icon: '🐔' }, { word: 'horse', icon: '🐎' }],
  j: [{ word: 'jet', icon: '✈️' }, { word: 'jeans', icon: '👖' }],
  k: [{ word: 'kite', icon: '🪁' }, { word: 'king', icon: '🤴' }, { word: 'key', icon: '🔑' }],
  l: [{ word: 'lion', icon: '🦁' }, { word: 'leg', icon: '🦵' }, { word: 'lemon', icon: '🍋' }],
  m: [{ word: 'moon', icon: '🌙' }, { word: 'map', icon: '🗺️' }, { word: 'monkey', icon: '🐒' }, { word: 'mug', icon: '☕' }],
  n: [{ word: 'nose', icon: '👃' }, { word: 'net', icon: '🥅' }, { word: 'nut', icon: '🥜' }],
  o: [{ word: 'octopus', icon: '🐙' }, { word: 'ox', icon: '🐂' }],
  p: [{ word: 'pig', icon: '🐖' }, { word: 'pen', icon: '🖊️' }, { word: 'pan', icon: '🍳' }],
  r: [{ word: 'rabbit', icon: '🐇' }, { word: 'rat', icon: '🐀' }, { word: 'ring', icon: '💍' }],
  s: [{ word: 'snake', icon: '🐍' }, { word: 'sun', icon: '☀️' }, { word: 'sock', icon: '🧦' }],
  t: [{ word: 'tiger', icon: '🐅' }, { word: 'tent', icon: '⛺' }, { word: 'tin', icon: '🥫' }],
  u: [{ word: 'umbrella', icon: '☂️' }, { word: 'up', icon: '⬆️' }],
  v: [{ word: 'van', icon: '🚐' }, { word: 'violin', icon: '🎻' }],
  w: [{ word: 'watch', icon: '⌚' }, { word: 'web', icon: '🕸️' }],
  y: [{ word: 'yo-yo', icon: '🪀' }, { word: 'yawn', icon: '🥱' }],
  z: [{ word: 'zebra', icon: '🦓' }, { word: 'zero', icon: '0️⃣' }],
};
/** Letters taught first in most South African English programmes (s a t p i n), then the rest. */
export const EARLY_LETTERS = ['s', 'a', 't', 'p', 'n', 'm', 'd', 'g', 'c', 'h', 'b', 'f', 'l', 'r'];
/** Letters that look alike: a classic confusion to diagnose. */
export const LOOKALIKE: Record<string, string[]> = { b: ['d', 'p'], d: ['b', 'p'], p: ['b', 'q', 'd'], m: ['n', 'w'], n: ['m', 'u'], u: ['n'], w: ['m'], f: ['t'], t: ['f'], h: ['n'] };

/** Two-letter sounds (Grade 2) with picture words, and where the sound sits. */
export const DIGRAPH_WORDS: { sound: string; at: 'start' | 'end'; words: PicWord[] }[] = [
  { sound: 'sh', at: 'start', words: [{ word: 'ship', icon: '🚢' }, { word: 'shoe', icon: '👟' }, { word: 'sheep', icon: '🐑' }, { word: 'shell', icon: '🐚' }] },
  { sound: 'ch', at: 'start', words: [{ word: 'chair', icon: '🪑' }, { word: 'cheese', icon: '🧀' }, { word: 'chick', icon: '🐤' }, { word: 'cherry', icon: '🍒' }] },
  { sound: 'th', at: 'start', words: [{ word: 'thumb', icon: '👍' }, { word: 'three', icon: '3️⃣' }] },
  { sound: 'wh', at: 'start', words: [{ word: 'whale', icon: '🐋' }, { word: 'wheat', icon: '🌾' }] },
  { sound: 'sh', at: 'end', words: [{ word: 'fish', icon: '🐟' }, { word: 'brush', icon: '🖌️' }] },
  { sound: 'ch', at: 'end', words: [{ word: 'peach', icon: '🍑' }, { word: 'watch', icon: '⌚' }] },
  { sound: 'th', at: 'end', words: [{ word: 'tooth', icon: '🦷' }, { word: 'mouth', icon: '👄' }] },
  { sound: 'ck', at: 'end', words: [{ word: 'duck', icon: '🦆' }, { word: 'sock', icon: '🧦' }, { word: 'clock', icon: '🕐' }, { word: 'chick', icon: '🐤' }] },
  { sound: 'ng', at: 'end', words: [{ word: 'ring', icon: '💍' }, { word: 'king', icon: '🤴' }] },
];

/** Words with consonant blends and digraphs to read and spell (Grade 2). Tiles split them into sounds. */
export const BLEND_WORDS: { word: string; icon: string; sounds: string[] }[] = [
  { word: 'frog', icon: '🐸', sounds: ['f', 'r', 'o', 'g'] },
  { word: 'flag', icon: '🚩', sounds: ['f', 'l', 'a', 'g'] },
  { word: 'drum', icon: '🥁', sounds: ['d', 'r', 'u', 'm'] },
  { word: 'crab', icon: '🦀', sounds: ['c', 'r', 'a', 'b'] },
  { word: 'star', icon: '⭐', sounds: ['s', 't', 'ar'] },
  { word: 'tent', icon: '⛺', sounds: ['t', 'e', 'n', 't'] },
  { word: 'hand', icon: '✋', sounds: ['h', 'a', 'n', 'd'] },
  { word: 'milk', icon: '🥛', sounds: ['m', 'i', 'l', 'k'] },
  { word: 'gift', icon: '🎁', sounds: ['g', 'i', 'f', 't'] },
  { word: 'ship', icon: '🚢', sounds: ['sh', 'i', 'p'] },
  { word: 'fish', icon: '🐟', sounds: ['f', 'i', 'sh'] },
  { word: 'shop', icon: '🏪', sounds: ['sh', 'o', 'p'] },
  { word: 'chick', icon: '🐤', sounds: ['ch', 'i', 'ck'] },
  { word: 'duck', icon: '🦆', sounds: ['d', 'u', 'ck'] },
  { word: 'sock', icon: '🧦', sounds: ['s', 'o', 'ck'] },
  { word: 'clock', icon: '🕐', sounds: ['c', 'l', 'o', 'ck'] },
  { word: 'ring', icon: '💍', sounds: ['r', 'i', 'ng'] },
  { word: 'king', icon: '🤴', sounds: ['k', 'i', 'ng'] },
  { word: 'bath', icon: '🛁', sounds: ['b', 'a', 'th'] },
  { word: 'snail', icon: '🐌', sounds: ['s', 'n', 'ai', 'l'] },
  { word: 'swan', icon: '🦢', sounds: ['s', 'w', 'a', 'n'] },
  { word: 'sled', icon: '🛷', sounds: ['s', 'l', 'e', 'd'] },
  { word: 'crown', icon: '👑', sounds: ['c', 'r', 'ow', 'n'] },
];

/** Vowel teams (Grade 3). Each word's tiles keep the team together. */
export const VOWEL_TEAMS: { team: string; words: { word: string; icon: string; sounds: string[] }[] }[] = [
  { team: 'ee', words: [{ word: 'tree', icon: '🌳', sounds: ['t', 'r', 'ee'] }, { word: 'bee', icon: '🐝', sounds: ['b', 'ee'] }, { word: 'feet', icon: '🦶', sounds: ['f', 'ee', 't'] }, { word: 'sheep', icon: '🐑', sounds: ['sh', 'ee', 'p'] }, { word: 'queen', icon: '👸', sounds: ['qu', 'ee', 'n'] }] },
  { team: 'ea', words: [{ word: 'leaf', icon: '🍃', sounds: ['l', 'ea', 'f'] }, { word: 'tea', icon: '🍵', sounds: ['t', 'ea'] }, { word: 'peach', icon: '🍑', sounds: ['p', 'ea', 'ch'] }, { word: 'beach', icon: '🏖️', sounds: ['b', 'ea', 'ch'] }] },
  { team: 'ai', words: [{ word: 'rain', icon: '🌧️', sounds: ['r', 'ai', 'n'] }, { word: 'snail', icon: '🐌', sounds: ['s', 'n', 'ai', 'l'] }, { word: 'train', icon: '🚆', sounds: ['t', 'r', 'ai', 'n'] }, { word: 'nail', icon: '💅', sounds: ['n', 'ai', 'l'] }] },
  { team: 'oa', words: [{ word: 'boat', icon: '⛵', sounds: ['b', 'oa', 't'] }, { word: 'goat', icon: '🐐', sounds: ['g', 'oa', 't'] }, { word: 'coat', icon: '🧥', sounds: ['c', 'oa', 't'] }, { word: 'soap', icon: '🧼', sounds: ['s', 'oa', 'p'] }] },
  { team: 'oo', words: [{ word: 'moon', icon: '🌙', sounds: ['m', 'oo', 'n'] }, { word: 'spoon', icon: '🥄', sounds: ['s', 'p', 'oo', 'n'] }, { word: 'boot', icon: '👢', sounds: ['b', 'oo', 't'] }] },
  { team: 'ar', words: [{ word: 'car', icon: '🚗', sounds: ['c', 'ar'] }, { word: 'star', icon: '⭐', sounds: ['s', 't', 'ar'] }, { word: 'shark', icon: '🦈', sounds: ['sh', 'ar', 'k'] }, { word: 'arm', icon: '💪', sounds: ['ar', 'm'] }] },
  { team: 'or', words: [{ word: 'fork', icon: '🍴', sounds: ['f', 'or', 'k'] }, { word: 'horse', icon: '🐎', sounds: ['h', 'or', 's', 'e'] }, { word: 'corn', icon: '🌽', sounds: ['c', 'or', 'n'] }] },
  { team: 'igh', words: [{ word: 'light', icon: '💡', sounds: ['l', 'igh', 't'] }, { word: 'night', icon: '🌃', sounds: ['n', 'igh', 't'] }] },
  { team: 'ow', words: [{ word: 'cow', icon: '🐄', sounds: ['c', 'ow'] }, { word: 'owl', icon: '🦉', sounds: ['ow', 'l'] }, { word: 'crown', icon: '👑', sounds: ['c', 'r', 'ow', 'n'] }] },
  { team: 'ou', words: [{ word: 'house', icon: '🏠', sounds: ['h', 'ou', 's', 'e'] }, { word: 'mouse', icon: '🐁', sounds: ['m', 'ou', 's', 'e'] }, { word: 'cloud', icon: '☁️', sounds: ['c', 'l', 'ou', 'd'] }] },
  { team: 'ir', words: [{ word: 'bird', icon: '🐦', sounds: ['b', 'ir', 'd'] }, { word: 'girl', icon: '👧', sounds: ['g', 'ir', 'l'] }, { word: 'shirt', icon: '👕', sounds: ['sh', 'ir', 't'] }] },
  { team: 'ur', words: [{ word: 'turtle', icon: '🐢', sounds: ['t', 'ur', 't', 'l', 'e'] }, { word: 'purse', icon: '👛', sounds: ['p', 'ur', 's', 'e'] }] },
  { team: 'oy', words: [{ word: 'boy', icon: '👦', sounds: ['b', 'oy'] }, { word: 'toy', icon: '🧸', sounds: ['t', 'oy'] }] },
];

/** High-frequency words by grade. Grade 2 and 3 lists add to the earlier ones. */
export const SIGHT_WORDS: Record<1 | 2 | 3, string[]> = {
  1: ['the', 'a', 'I', 'is', 'it', 'in', 'and', 'to', 'go', 'my', 'me', 'see', 'can', 'we', 'he', 'she', 'you', 'at', 'on', 'up', 'look', 'like', 'this', 'no', 'yes', 'come', 'here', 'said', 'was', 'big', 'little', 'mum', 'dad', 'play', 'run', 'for', 'are', 'am', 'of', 'saw', 'not', 'get'],
  2: ['they', 'have', 'what', 'when', 'where', 'there', 'went', 'some', 'could', 'would', 'because', 'after', 'again', 'any', 'by', 'every', 'from', 'give', 'going', 'has', 'her', 'him', 'his', 'how', 'just', 'know', 'old', 'once', 'open', 'over', 'put', 'take', 'thank', 'them', 'then', 'think', 'walk', 'were', 'who', 'why', 'your', 'very'],
  3: ['about', 'always', 'around', 'before', 'both', 'buy', 'carry', 'does', 'done', 'draw', 'drink', 'eight', 'enough', 'full', 'grow', 'hold', 'laugh', 'light', 'long', 'much', 'myself', 'never', 'only', 'own', 'show', 'small', 'start', 'today', 'together', 'thought', 'through', 'people', 'friend', 'school', 'beautiful', 'different', 'answer', 'learn', 'should', 'write'],
};
/** Pairs that children mix up: shown together so reading the whole word matters. */
export const SIGHT_CONFUSIONS: [string, string][] = [
  ['was', 'saw'],
  ['on', 'no'],
  ['the', 'then'],
  ['there', 'three'],
  ['were', 'where'],
  ['went', 'want'],
  ['come', 'came'],
  ['what', 'that'],
  ['form', 'from'],
  ['thought', 'through'],
  ['they', 'then'],
  ['here', 'her'],
];

export const RHYME_FAMILIES: { end: string; words: PicWord[] }[] = [
  { end: 'at', words: [{ word: 'cat', icon: '🐈' }, { word: 'hat', icon: '🎩' }, { word: 'bat', icon: '🦇' }, { word: 'rat', icon: '🐀' }] },
  { end: 'og', words: [{ word: 'dog', icon: '🐕' }, { word: 'frog', icon: '🐸' }] },
  { end: 'en', words: [{ word: 'hen', icon: '🐔' }, { word: 'pen', icon: '🖊️' }, { word: 'ten', icon: '🔟' }] },
  { end: 'ox', words: [{ word: 'box', icon: '📦' }, { word: 'fox', icon: '🦊' }] },
  { end: 'ake', words: [{ word: 'cake', icon: '🎂' }, { word: 'snake', icon: '🐍' }] },
  { end: 'ee', words: [{ word: 'bee', icon: '🐝' }, { word: 'tree', icon: '🌳' }, { word: 'three', icon: '3️⃣' }] },
  { end: 'ing', words: [{ word: 'ring', icon: '💍' }, { word: 'king', icon: '🤴' }] },
  { end: 'ail', words: [{ word: 'snail', icon: '🐌' }, { word: 'nail', icon: '💅' }] },
  { end: 'ar', words: [{ word: 'car', icon: '🚗' }, { word: 'star', icon: '⭐' }] },
  { end: 'oat', words: [{ word: 'boat', icon: '⛵' }, { word: 'goat', icon: '🐐' }, { word: 'coat', icon: '🧥' }] },
  { end: 'ouse', words: [{ word: 'house', icon: '🏠' }, { word: 'mouse', icon: '🐁' }] },
  { end: 'ock', words: [{ word: 'sock', icon: '🧦' }, { word: 'clock', icon: '🕐' }] },
  { end: 'ug', words: [{ word: 'bug', icon: '🐛' }, { word: 'mug', icon: '☕' }] },
];

/** Words and their syllables. */
export const SYLLABLES: { word: string; icon: string; parts: string[] }[] = [
  { word: 'cat', icon: '🐈', parts: ['cat'] },
  { word: 'sun', icon: '☀️', parts: ['sun'] },
  { word: 'dog', icon: '🐕', parts: ['dog'] },
  { word: 'fish', icon: '🐟', parts: ['fish'] },
  { word: 'apple', icon: '🍎', parts: ['ap', 'ple'] },
  { word: 'rabbit', icon: '🐇', parts: ['rab', 'bit'] },
  { word: 'tiger', icon: '🐅', parts: ['ti', 'ger'] },
  { word: 'pencil', icon: '✏️', parts: ['pen', 'cil'] },
  { word: 'zebra', icon: '🦓', parts: ['ze', 'bra'] },
  { word: 'monkey', icon: '🐒', parts: ['mon', 'key'] },
  { word: 'giraffe', icon: '🦒', parts: ['gi', 'raffe'] },
  { word: 'lemon', icon: '🍋', parts: ['le', 'mon'] },
  { word: 'banana', icon: '🍌', parts: ['ba', 'na', 'na'] },
  { word: 'elephant', icon: '🐘', parts: ['el', 'e', 'phant'] },
  { word: 'butterfly', icon: '🦋', parts: ['but', 'ter', 'fly'] },
  { word: 'tomato', icon: '🍅', parts: ['to', 'ma', 'to'] },
  { word: 'umbrella', icon: '☂️', parts: ['um', 'brel', 'la'] },
  { word: 'octopus', icon: '🐙', parts: ['oc', 'to', 'pus'] },
  { word: 'kangaroo', icon: '🦘', parts: ['kan', 'ga', 'roo'] },
  { word: 'crocodile', icon: '🐊', parts: ['croc', 'o', 'dile'] },
  { word: 'caterpillar', icon: '🐛', parts: ['cat', 'er', 'pil', 'lar'] },
  { word: 'watermelon', icon: '🍉', parts: ['wa', 'ter', 'mel', 'on'] },
];

export const COMPOUNDS: { word: string; icon: string; a: string; b: string; wrong: string[] }[] = [
  { word: 'sunflower', icon: '🌻', a: 'sun', b: 'flower', wrong: ['ball', 'shine'] },
  { word: 'rainbow', icon: '🌈', a: 'rain', b: 'bow', wrong: ['coat', 'drop'] },
  { word: 'football', icon: '⚽', a: 'foot', b: 'ball', wrong: ['print', 'step'] },
  { word: 'snowman', icon: '⛄', a: 'snow', b: 'man', wrong: ['ball', 'flake'] },
  { word: 'cupcake', icon: '🧁', a: 'cup', b: 'cake', wrong: ['board', 'pan'] },
  { word: 'butterfly', icon: '🦋', a: 'butter', b: 'fly', wrong: ['milk', 'cup'] },
  { word: 'popcorn', icon: '🍿', a: 'pop', b: 'corn', wrong: ['cake', 'star'] },
  { word: 'ladybird', icon: '🐞', a: 'lady', b: 'bird', wrong: ['bug', 'fly'] },
  { word: 'handbag', icon: '👜', a: 'hand', b: 'bag', wrong: ['shake', 'stand'] },
  { word: 'bedroom', icon: '🛏️', a: 'bed', b: 'room', wrong: ['time', 'bug'] },
];

/** Sentences to read, each with a question answered by tapping a picture. Grade = first grade it suits. */
export const SENTENCES: { grade: 1 | 2 | 3; text: string; q: string; a: PicWord; wrong: PicWord[] }[] = [
  { grade: 1, text: 'The cat is on the bed.', q: 'Where is the cat?', a: { word: 'bed', icon: '🛏️' }, wrong: [{ word: 'box', icon: '📦' }, { word: 'bus', icon: '🚌' }] },
  { grade: 1, text: 'I can see a red hen.', q: 'What can I see?', a: { word: 'hen', icon: '🐔' }, wrong: [{ word: 'pig', icon: '🐖' }, { word: 'dog', icon: '🐕' }] },
  { grade: 1, text: 'Sam has a big hat.', q: 'What does Sam have?', a: { word: 'hat', icon: '🎩' }, wrong: [{ word: 'cap', icon: '🧢' }, { word: 'bag', icon: '👜' }] },
  { grade: 1, text: 'The dog sat in the sun.', q: 'Who sat in the sun?', a: { word: 'dog', icon: '🐕' }, wrong: [{ word: 'cat', icon: '🐈' }, { word: 'fox', icon: '🦊' }] },
  { grade: 1, text: 'The fox is in the box.', q: 'Where is the fox?', a: { word: 'box', icon: '📦' }, wrong: [{ word: 'bed', icon: '🛏️' }, { word: 'van', icon: '🚐' }] },
  { grade: 1, text: 'Mum got a pot.', q: 'What did Mum get?', a: { word: 'pot', icon: '🍲' }, wrong: [{ word: 'pan', icon: '🍳' }, { word: 'mug', icon: '☕' }] },
  { grade: 1, text: 'A bug is on the leg.', q: 'What is on the leg?', a: { word: 'bug', icon: '🐛' }, wrong: [{ word: 'ant', icon: '🐜' }, { word: 'bat', icon: '🦇' }] },
  { grade: 1, text: 'Dad can run to the bus.', q: 'Where does Dad run to?', a: { word: 'bus', icon: '🚌' }, wrong: [{ word: 'van', icon: '🚐' }, { word: 'jet', icon: '✈️' }] },
  { grade: 2, text: 'The frog jumped into the pond.', q: 'Who jumped into the pond?', a: { word: 'frog', icon: '🐸' }, wrong: [{ word: 'duck', icon: '🦆' }, { word: 'fish', icon: '🐟' }] },
  { grade: 2, text: 'Lerato put her shoes under the chair.', q: 'What did Lerato put under the chair?', a: { word: 'shoes', icon: '👟' }, wrong: [{ word: 'socks', icon: '🧦' }, { word: 'bag', icon: '🎒' }] },
  { grade: 2, text: 'The duck swam to the ship.', q: 'Where did the duck swim to?', a: { word: 'ship', icon: '🚢' }, wrong: [{ word: 'shop', icon: '🏪' }, { word: 'tree', icon: '🌳' }] },
  { grade: 2, text: 'Sipho had milk and bread for lunch.', q: 'What did Sipho drink?', a: { word: 'milk', icon: '🥛' }, wrong: [{ word: 'tea', icon: '🍵' }, { word: 'water', icon: '💧' }] },
  { grade: 2, text: 'The chick hid behind the clock.', q: 'Where did the chick hide?', a: { word: 'clock', icon: '🕐' }, wrong: [{ word: 'chair', icon: '🪑' }, { word: 'tent', icon: '⛺' }] },
  { grade: 2, text: 'We sang a song for the king.', q: 'Who did we sing for?', a: { word: 'king', icon: '🤴' }, wrong: [{ word: 'queen', icon: '👸' }, { word: 'baby', icon: '👶' }] },
  { grade: 3, text: 'After the rain, Anele saw a rainbow over the hills.', q: 'What did Anele see?', a: { word: 'rainbow', icon: '🌈' }, wrong: [{ word: 'cloud', icon: '☁️' }, { word: 'moon', icon: '🌙' }] },
  { grade: 3, text: 'The goat ate the corn because it was hungry.', q: 'What did the goat eat?', a: { word: 'corn', icon: '🌽' }, wrong: [{ word: 'leaf', icon: '🍃' }, { word: 'bread', icon: '🍞' }] },
  { grade: 3, text: 'At night the owl sat high up in the tree.', q: 'Who sat in the tree?', a: { word: 'owl', icon: '🦉' }, wrong: [{ word: 'bird', icon: '🐦' }, { word: 'monkey', icon: '🐒' }] },
  { grade: 3, text: 'Ayanda packed a coat and boots for the cold trip.', q: 'What did Ayanda pack for her feet?', a: { word: 'boots', icon: '👢' }, wrong: [{ word: 'socks', icon: '🧦' }, { word: 'shoes', icon: '👟' }] },
  { grade: 3, text: 'The train left the station before the sun came up.', q: 'What left the station?', a: { word: 'train', icon: '🚆' }, wrong: [{ word: 'bus', icon: '🚌' }, { word: 'boat', icon: '⛵' }] },
  { grade: 3, text: 'A snail moved slowly across the leaf.', q: 'What moved across the leaf?', a: { word: 'snail', icon: '🐌' }, wrong: [{ word: 'bug', icon: '🐛' }, { word: 'ant', icon: '🐜' }] },
];

/** Sentences to build from word tiles. Each has only one sensible order. */
export const BUILD_SENTENCES: Record<1 | 2 | 3, string[]> = {
  1: ['The dog can run.', 'I see a cat.', 'Mum has a hat.', 'We go to school.', 'The sun is hot.', 'I like my bed.'],
  2: ['The frog jumped into the pond.', 'Sipho went to the shop.', 'The cow is in the field.', 'The baby is fast asleep.', 'We eat lunch at school.', 'The duck swam in the river.'],
  3: ['After school we played soccer in the park.', 'The farmer planted mielies in his field.', 'Grandma told us a story before bed.', 'The children walked to the bus stop.', 'My brother found a shell on the beach.'],
};

export interface Story {
  id: string;
  grade: 1 | 2 | 3;
  title: string;
  /** One sentence per entry, so the reader can highlight sentence by sentence. */
  text: string[];
  questions: {
    kind: 'who' | 'what' | 'where' | 'order' | 'why' | 'feel';
    q: string;
    a: string;
    wrong: string[];
    /** For 'order' questions: the events in the right order. */
    events?: string[];
    why: string;
  }[];
}

/** Original stories written for Magubane Labs. */
export const STORIES: Story[] = [
  {
    id: 'lost-ball',
    grade: 1,
    title: 'The lost ball',
    text: ['Thabo had a red ball.', 'He kicked it too far.', 'The ball went under the car.', 'His dog Max got it out.', 'Thabo was happy.'],
    questions: [
      { kind: 'what', q: 'What colour was the ball?', a: 'red', wrong: ['blue', 'green'], why: 'The story says Thabo had a red ball.' },
      { kind: 'where', q: 'Where did the ball go?', a: 'under the car', wrong: ['into the tree', 'into the house'], why: 'The ball went under the car.' },
      { kind: 'who', q: 'Who got the ball out?', a: 'Max the dog', wrong: ['Thabo', 'Mum'], why: 'His dog Max got it out.' },
      { kind: 'feel', q: 'How did Thabo feel at the end?', a: 'happy', wrong: ['sad', 'angry'], why: 'The story says Thabo was happy.' },
      { kind: 'order', q: 'What happened first?', a: 'Thabo kicked the ball too far.', wrong: ['Max got the ball out.', 'Thabo was happy.'], events: ['Thabo kicked the ball too far.', 'The ball went under the car.', 'Max got the ball out.'], why: 'First Thabo kicked the ball, then it went under the car, then Max got it.' },
    ],
  },
  {
    id: 'rain',
    grade: 1,
    title: 'Rain',
    text: ['Grey clouds came over the hill.', 'Lindi saw the rain coming.', 'She ran home fast.', 'She got her umbrella.', 'Then she went out to play in the puddles.'],
    questions: [
      { kind: 'what', q: 'What did Lindi see coming?', a: 'the rain', wrong: ['the bus', 'her friend'], why: 'Lindi saw the rain coming.' },
      { kind: 'where', q: 'Where did Lindi run?', a: 'home', wrong: ['to school', 'to the shop'], why: 'She ran home fast.' },
      { kind: 'what', q: 'What did Lindi get?', a: 'her umbrella', wrong: ['her hat', 'her ball'], why: 'She got her umbrella.' },
      { kind: 'why', q: 'Why did Lindi get her umbrella?', a: 'because it was raining', wrong: ['because it was hot', 'because it was night'], why: 'She saw rain coming, so she needed an umbrella to stay dry.' },
      { kind: 'order', q: 'What happened last?', a: 'She played in the puddles.', wrong: ['She ran home.', 'She saw the rain.'], events: ['She saw the rain coming.', 'She ran home.', 'She played in the puddles.'], why: 'Playing in the puddles happened last.' },
    ],
  },
  {
    id: 'hen-eggs',
    grade: 1,
    title: 'Gogo’s hen',
    text: ['Gogo has a brown hen.', 'The hen sits on six eggs.', 'One day the eggs crack.', 'Six little chicks come out.', 'Gogo gives them water.'],
    questions: [
      { kind: 'who', q: 'Who has a hen?', a: 'Gogo', wrong: ['Mum', 'the farmer'], why: 'The story says Gogo has a brown hen.' },
      { kind: 'what', q: 'How many eggs are there?', a: 'six', wrong: ['two', 'ten'], why: 'The hen sits on six eggs.' },
      { kind: 'what', q: 'What comes out of the eggs?', a: 'chicks', wrong: ['ducks', 'birds'], why: 'Six little chicks come out.' },
      { kind: 'what', q: 'What does Gogo give the chicks?', a: 'water', wrong: ['milk', 'bread'], why: 'Gogo gives them water.' },
      { kind: 'order', q: 'What happened before the chicks came out?', a: 'The eggs cracked.', wrong: ['Gogo gave them water.', 'The chicks ate.'], events: ['The hen sat on the eggs.', 'The eggs cracked.', 'The chicks came out.'], why: 'The eggs had to crack first.' },
    ],
  },
  {
    id: 'new-friend',
    grade: 1,
    title: 'A new friend',
    text: ['A new girl came to our class.', 'Her name was Aisha.', 'She sat alone at break.', 'Kagiso asked her to play.', 'Now they play every day.'],
    questions: [
      { kind: 'who', q: 'Who was new in the class?', a: 'Aisha', wrong: ['Kagiso', 'the teacher'], why: 'A new girl came. Her name was Aisha.' },
      { kind: 'feel', q: 'How do you think Aisha felt when she sat alone?', a: 'lonely', wrong: ['excited', 'angry'], why: 'Sitting alone in a new place can make you feel lonely.' },
      { kind: 'who', q: 'Who asked Aisha to play?', a: 'Kagiso', wrong: ['the teacher', 'Mum'], why: 'Kagiso asked her to play.' },
      { kind: 'why', q: 'Why are they friends now?', a: 'Kagiso was kind to Aisha', wrong: ['Aisha was angry', 'it rained'], why: 'Kagiso was kind and asked her to play, so they became friends.' },
    ],
  },
  {
    id: 'garden',
    grade: 2,
    title: 'The bean seed',
    text: ['Naledi planted a bean seed in a pot.', 'She gave it water every morning.', 'She put the pot by the sunny window.', 'After a week, a small green shoot came up.', 'Soon the plant had big leaves and long beans.', 'Naledi cooked the beans for supper.'],
    questions: [
      { kind: 'what', q: 'What did Naledi plant?', a: 'a bean seed', wrong: ['a flower', 'a tree'], why: 'Naledi planted a bean seed in a pot.' },
      { kind: 'where', q: 'Where did she put the pot?', a: 'by the sunny window', wrong: ['in a dark cupboard', 'under her bed'], why: 'She put the pot by the sunny window.' },
      { kind: 'what', q: 'What did she give the seed every morning?', a: 'water', wrong: ['milk', 'sand'], why: 'She gave it water every morning.' },
      { kind: 'why', q: 'Why did she put the pot by the window?', a: 'plants need sunlight', wrong: ['to keep it cold', 'so it could see outside'], why: 'Plants need light to grow, so the sunny window helps.' },
      { kind: 'order', q: 'What happened after a week?', a: 'A green shoot came up.', wrong: ['She cooked the beans.', 'She planted the seed.'], events: ['She planted the seed.', 'A green shoot came up.', 'The plant grew beans.', 'She cooked the beans.'], why: 'After a week, a small green shoot came up.' },
    ],
  },
  {
    id: 'taxi',
    grade: 2,
    title: 'The taxi ride',
    text: ['Musa and his mother went to town in a taxi.', 'The taxi was full of people.', 'Musa sat next to the window.', 'He counted the cows in the fields.', 'He saw twelve cows and one horse.', 'In town, his mother bought him new school shoes.'],
    questions: [
      { kind: 'who', q: 'Who went to town with Musa?', a: 'his mother', wrong: ['his teacher', 'his grandfather'], why: 'Musa and his mother went to town.' },
      { kind: 'what', q: 'How did they get to town?', a: 'by taxi', wrong: ['by train', 'on foot'], why: 'They went to town in a taxi.' },
      { kind: 'what', q: 'How many cows did Musa see?', a: 'twelve', wrong: ['two', 'twenty'], why: 'He saw twelve cows and one horse.' },
      { kind: 'what', q: 'What did his mother buy?', a: 'new school shoes', wrong: ['a new bag', 'sweets'], why: 'His mother bought him new school shoes.' },
      { kind: 'where', q: 'Where did Musa sit?', a: 'next to the window', wrong: ['at the back', 'next to the driver'], why: 'Musa sat next to the window.' },
    ],
  },
  {
    id: 'cake',
    grade: 2,
    title: 'Grandpa’s birthday',
    text: ['It was Grandpa’s birthday on Saturday.', 'Zanele and Ruan wanted to bake him a cake.', 'They mixed flour, eggs, sugar and milk.', 'Ruan forgot the cake in the oven, and it got burnt.', 'Zanele said, “Let us try again.”', 'The second cake was perfect, and Grandpa smiled.'],
    questions: [
      { kind: 'what', q: 'What day was Grandpa’s birthday?', a: 'Saturday', wrong: ['Monday', 'Sunday'], why: 'It was Grandpa’s birthday on Saturday.' },
      { kind: 'what', q: 'What happened to the first cake?', a: 'it got burnt', wrong: ['the dog ate it', 'it fell on the floor'], why: 'Ruan forgot the cake in the oven, and it got burnt.' },
      { kind: 'why', q: 'Why did the first cake burn?', a: 'it stayed in the oven too long', wrong: ['they forgot the eggs', 'the oven was off'], why: 'Ruan forgot the cake in the oven, so it cooked too long.' },
      { kind: 'feel', q: 'How did Grandpa feel at the end?', a: 'happy', wrong: ['cross', 'worried'], why: 'Grandpa smiled, so he was happy.' },
      { kind: 'order', q: 'What did they do after the first cake burnt?', a: 'They tried again.', wrong: ['They went to sleep.', 'They bought a cake.'], events: ['They mixed the cake.', 'The first cake got burnt.', 'They tried again.', 'Grandpa smiled.'], why: 'Zanele said, “Let us try again.”' },
    ],
  },
  {
    id: 'water',
    grade: 2,
    title: 'Saving water',
    text: ['There was no rain for a long time.', 'The dam near Pieter’s town was nearly empty.', 'His teacher said everyone must save water.', 'Pieter turned off the tap while he brushed his teeth.', 'His family used bath water for the garden.', 'When the rain came, the dam filled up again.'],
    questions: [
      { kind: 'what', q: 'Why was the dam nearly empty?', a: 'there was no rain for a long time', wrong: ['the dam had a hole', 'people swam in it'], why: 'There was no rain for a long time, so the dam emptied.' },
      { kind: 'what', q: 'What did Pieter do while he brushed his teeth?', a: 'turned off the tap', wrong: ['sang a song', 'filled the bath'], why: 'Pieter turned off the tap while he brushed his teeth.' },
      { kind: 'what', q: 'What did the family use for the garden?', a: 'bath water', wrong: ['fresh tap water', 'milk'], why: 'His family used bath water for the garden.' },
      { kind: 'why', q: 'Why did they use bath water for the garden?', a: 'to save water', wrong: ['because it was warm', 'to make it dirty'], why: 'Using it twice saves clean water.' },
    ],
  },
  {
    id: 'soccer',
    grade: 3,
    title: 'The big match',
    text: [
      'On Friday, the Grade 3 soccer team played against Hillview Primary.',
      'Amahle was the goalkeeper, and she was very nervous.',
      'In the first half, Hillview scored a goal.',
      'At half time, the coach said, “Keep your eyes on the ball and talk to each other.”',
      'In the second half, Bongani scored twice.',
      'In the last minute, Amahle stopped a hard shot, and her team won two goals to one.',
    ],
    questions: [
      { kind: 'who', q: 'Who was the goalkeeper?', a: 'Amahle', wrong: ['Bongani', 'the coach'], why: 'Amahle was the goalkeeper.' },
      { kind: 'feel', q: 'How did Amahle feel at the start?', a: 'nervous', wrong: ['bored', 'sleepy'], why: 'The story says she was very nervous.' },
      { kind: 'what', q: 'What was the final score?', a: 'two goals to one', wrong: ['one goal to nil', 'three goals to two'], why: 'Her team won two goals to one.' },
      { kind: 'why', q: 'Why did the coach tell them to talk to each other?', a: 'to help them work as a team', wrong: ['because they were too quiet in class', 'so they would get tired'], why: 'Talking helps players know where everyone is, so they play as a team.' },
      { kind: 'order', q: 'What happened just before half time ended?', a: 'The coach talked to the team.', wrong: ['Bongani scored twice.', 'Amahle stopped a hard shot.'], events: ['Hillview scored a goal.', 'The coach talked to the team.', 'Bongani scored twice.', 'Amahle stopped a hard shot.'], why: 'At half time the coach spoke; the goals and the save came in the second half.' },
    ],
  },
  {
    id: 'tortoise',
    grade: 3,
    title: 'The tortoise on the road',
    text: [
      'Karabo and her dad were driving home from the farm.',
      'Suddenly Dad stopped the bakkie.',
      'A big tortoise was crossing the road very slowly.',
      'Dad said cars could hurt it, so they waited.',
      'Karabo watched it walk into the long grass on the other side.',
      'At home she drew a picture of the tortoise and its patterned shell.',
    ],
    questions: [
      { kind: 'what', q: 'Why did Dad stop the bakkie?', a: 'a tortoise was crossing the road', wrong: ['the bakkie broke', 'they were home'], why: 'A big tortoise was crossing the road.' },
      { kind: 'why', q: 'Why did they wait?', a: 'so the tortoise would be safe', wrong: ['because they were tired', 'to take the tortoise home'], why: 'Dad said cars could hurt it, so they waited until it was across.' },
      { kind: 'where', q: 'Where did the tortoise go?', a: 'into the long grass', wrong: ['into the bakkie', 'back to the farm'], why: 'It walked into the long grass on the other side.' },
      { kind: 'what', q: 'What did Karabo do at home?', a: 'drew a picture', wrong: ['wrote a letter', 'fed the tortoise'], why: 'At home she drew a picture of the tortoise.' },
      { kind: 'feel', q: 'What does this story show about Karabo’s dad?', a: 'he cares about animals', wrong: ['he is in a hurry', 'he is scared of tortoises'], why: 'He stopped and waited to keep the tortoise safe.' },
    ],
  },
  {
    id: 'library',
    grade: 3,
    title: 'Library day',
    text: [
      'Every Wednesday, Mrs Dlamini takes her class to the library.',
      'Tshepo always chooses books about space.',
      'This week the space books were all taken.',
      'At first Tshepo was disappointed.',
      'The librarian showed him a book about the ocean instead.',
      'Tshepo learnt that some fish make their own light, and now he loves ocean books too.',
    ],
    questions: [
      { kind: 'what', q: 'Which day is library day?', a: 'Wednesday', wrong: ['Monday', 'Friday'], why: 'Every Wednesday, the class goes to the library.' },
      { kind: 'what', q: 'What books does Tshepo usually choose?', a: 'books about space', wrong: ['books about cars', 'books about animals'], why: 'Tshepo always chooses books about space.' },
      { kind: 'why', q: 'Why was Tshepo disappointed?', a: 'the space books were taken', wrong: ['the library was closed', 'he lost his book'], why: 'The space books were all taken.' },
      { kind: 'who', q: 'Who helped Tshepo find a new book?', a: 'the librarian', wrong: ['Mrs Dlamini', 'his friend'], why: 'The librarian showed him a book about the ocean.' },
      { kind: 'what', q: 'What did Tshepo learn?', a: 'some fish make their own light', wrong: ['fish can fly', 'the ocean is small'], why: 'He learnt that some fish make their own light.' },
    ],
  },
  {
    id: 'fire-drill',
    grade: 3,
    title: 'The fire drill',
    text: [
      'On Tuesday the school bell rang three long times.',
      'It was a fire drill.',
      'Mr Naidoo said, “Leave your bags. Walk, do not run, and stay in your line.”',
      'The class walked to the soccer field and stood quietly.',
      'Mr Naidoo counted everyone to make sure nobody was missing.',
      'After ten minutes, they went back to class.',
    ],
    questions: [
      { kind: 'what', q: 'How did the class know it was a fire drill?', a: 'the bell rang three long times', wrong: ['they smelt smoke', 'a fire truck came'], why: 'The school bell rang three long times.' },
      { kind: 'why', q: 'Why did they leave their bags?', a: 'to get out quickly and safely', wrong: ['the bags were heavy', 'to clean the class'], why: 'In a fire you leave things behind and get out quickly.' },
      { kind: 'where', q: 'Where did the class go?', a: 'to the soccer field', wrong: ['to the library', 'to the car park'], why: 'The class walked to the soccer field.' },
      { kind: 'why', q: 'Why did Mr Naidoo count everyone?', a: 'to check nobody was missing', wrong: ['to pick a team', 'because he was bored'], why: 'He counted to make sure nobody was missing.' },
      { kind: 'order', q: 'What did the class do after they reached the field?', a: 'They stood quietly.', wrong: ['They left their bags.', 'The bell rang.'], events: ['The bell rang.', 'They left their bags.', 'They walked to the field.', 'Mr Naidoo counted everyone.'], why: 'They walked to the field, stood quietly and were counted.' },
    ],
  },
];

/** Opposites (Grade 1), plurals (Grade 2), past tense (Grade 3), and more. */
export const OPPOSITES: [string, string][] = [
  ['big', 'small'],
  ['hot', 'cold'],
  ['up', 'down'],
  ['open', 'closed'],
  ['fast', 'slow'],
  ['happy', 'sad'],
  ['day', 'night'],
  ['in', 'out'],
  ['full', 'empty'],
  ['wet', 'dry'],
  ['tall', 'short'],
  ['old', 'new'],
];
export const PLURALS: { one: string; many: string; wrong: string[] }[] = [
  { one: 'cat', many: 'cats', wrong: ['cates', 'cat'] },
  { one: 'dog', many: 'dogs', wrong: ['doges', 'dog'] },
  { one: 'box', many: 'boxes', wrong: ['boxs', 'box'] },
  { one: 'bus', many: 'buses', wrong: ['buss', 'bus'] },
  { one: 'dish', many: 'dishes', wrong: ['dishs', 'dish'] },
  { one: 'baby', many: 'babies', wrong: ['babys', 'babyes'] },
  { one: 'child', many: 'children', wrong: ['childs', 'childes'] },
  { one: 'foot', many: 'feet', wrong: ['foots', 'feets'] },
  { one: 'mouse', many: 'mice', wrong: ['mouses', 'mices'] },
  { one: 'tooth', many: 'teeth', wrong: ['tooths', 'teeths'] },
  { one: 'sheep', many: 'sheep', wrong: ['sheeps', 'sheepes'] },
  { one: 'peach', many: 'peaches', wrong: ['peachs', 'peach'] },
];
export const PAST: { now: string; past: string; wrong: string[] }[] = [
  { now: 'jump', past: 'jumped', wrong: ['jumpt', 'jumping'] },
  { now: 'play', past: 'played', wrong: ['plaied', 'playing'] },
  { now: 'walk', past: 'walked', wrong: ['walkt', 'walks'] },
  { now: 'kick', past: 'kicked', wrong: ['kickt', 'kicking'] },
  { now: 'run', past: 'ran', wrong: ['runned', 'runs'] },
  { now: 'go', past: 'went', wrong: ['goed', 'goes'] },
  { now: 'eat', past: 'ate', wrong: ['eated', 'eats'] },
  { now: 'see', past: 'saw', wrong: ['seed', 'sees'] },
  { now: 'sit', past: 'sat', wrong: ['sitted', 'sits'] },
  { now: 'swim', past: 'swam', wrong: ['swimmed', 'swims'] },
  { now: 'write', past: 'wrote', wrong: ['writed', 'writes'] },
  { now: 'bake', past: 'baked', wrong: ['bakeed', 'bakes'] },
];
/** Sentences to sort words in: naming words (nouns), doing words (verbs), describing words (adjectives). */
export const WORD_CLASSES: { sentence: string[]; nouns: string[]; verbs: string[]; adjectives: string[] }[] = [
  { sentence: ['The', 'big', 'dog', 'runs.'], nouns: ['dog'], verbs: ['runs.'], adjectives: ['big'] },
  { sentence: ['A', 'small', 'bird', 'sings.'], nouns: ['bird'], verbs: ['sings.'], adjectives: ['small'] },
  { sentence: ['The', 'happy', 'baby', 'laughs.'], nouns: ['baby'], verbs: ['laughs.'], adjectives: ['happy'] },
  { sentence: ['My', 'old', 'cat', 'sleeps.'], nouns: ['cat'], verbs: ['sleeps.'], adjectives: ['old'] },
  { sentence: ['The', 'red', 'car', 'stops.'], nouns: ['car'], verbs: ['stops.'], adjectives: ['red'] },
  { sentence: ['A', 'tall', 'giraffe', 'eats.'], nouns: ['giraffe'], verbs: ['eats.'], adjectives: ['tall'] },
  { sentence: ['The', 'hungry', 'goat', 'chews.'], nouns: ['goat'], verbs: ['chews.'], adjectives: ['hungry'] },
];
export const JOINING: { a: string; b: string; join: 'and' | 'but' | 'because' }[] = [
  { a: 'I like apples', b: 'I like bananas', join: 'and' },
  { a: 'Sipho wanted to play', b: 'it was raining', join: 'but' },
  { a: 'We stayed inside', b: 'it was cold', join: 'because' },
  { a: 'Lerato ran fast', b: 'she won the race', join: 'and' },
  { a: 'The dog barked', b: 'it heard a noise', join: 'because' },
  { a: 'I want to swim', b: 'the pool is closed', join: 'but' },
  { a: 'Mum bought bread', b: 'she bought milk', join: 'and' },
  { a: 'The plant died', b: 'nobody watered it', join: 'because' },
  { a: 'It is late', b: 'I am not tired', join: 'but' },
];
