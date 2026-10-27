/**
 * Foundation Phase Home Language (English pack) and English First Additional Language.
 *
 * Device voices say letter NAMES ("ess"), not letter SOUNDS ("sss"), so sound work is always anchored on
 * a spoken picture word: "snake: which letter does it start with?". When a skill is about reading,
 * nothing that gives the answer away is spoken (the written word is never read aloud before answering);
 * the last hint can read it aloud, and using a hint lowers the credit as everywhere else.
 */
import type { QuestionTemplate, GeneratedQuestion } from '../../questions/types.ts';
import type { Rng } from '../../questions/rng.ts';
import type { FoundationGrade } from '../../curriculum/foundation.ts';
import { jq, choiceJ, corePack, tile, type JOpt } from '../kit.ts';
import { fpTemplate } from './maths-number.ts';
import * as R from '../reading/en.ts';
import { VOCAB, COLOURS } from '../reading/en-fal.ts';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const ALPHABET = 'abcdefghijklmnoprstuvwyz'.split('');

// ---------------------------------------------------------------------------
// Letters and sounds
// ---------------------------------------------------------------------------
function letterQuestion(rng: Rng, w: R.PicWord, where: 'first' | 'last' | 'middle', nOpts: number, correct: string, wrongs: { text: string; why: string; code: 'fp-sound' | 'fp-letter-shape' }[]): GeneratedQuestion {
  const said = where === 'first' ? 'start with' : where === 'last' ? 'end with' : 'have in the middle';
  const picks = wrongs.filter((x, i, a) => x.text !== correct && a.findIndex((y) => y.text === x.text) === i).slice(0, nOpts - 1);
  while (picks.length < nOpts - 1) {
    const l = rng.pick(ALPHABET.filter((a) => a !== correct && !picks.some((p) => p.text === a)));
    picks.push({ text: l, why: `Say "${w.word}" slowly and listen to the ${where} sound.`, code: 'fp-sound' });
  }
  return choiceJ(rng, {
    // The word is spoken, never printed: printing it would let a reader copy the letter.
    prompt: `Which ${correct.length > 1 ? 'letters' : 'letter'} does it ${said}?`,
    say: `${w.word}. Which ${correct.length > 1 ? 'letters does' : 'letter does'} ${w.word} ${said}?`,
    scene: { kind: 'picture', icon: w.icon },
    correct: { id: 'c', text: correct },
    distractors: picks.map((p, i) => ({ id: `w${i}`, text: p.text, feedback: p.why, code: p.code })),
    code: 'fp-sound',
    hints: [`Say "${w.word}" slowly. Stretch the ${where} sound.`, where === 'first' ? `Listen: ${w.word}. What is the very first sound you make?` : where === 'last' ? `What sound do you finish with?` : 'Listen for the sound between the first and the last.'],
    solution: [`"${w.word}" ${where === 'first' ? 'starts' : where === 'last' ? 'ends' : 'has'} with the sound of ${correct}${where === 'middle' ? ' in the middle' : ''}.`],
    answerDisplay: correct,
  });
}

function initialLetter(rng: Rng, letters: string[], nOpts: number): GeneratedQuestion {
  const l = rng.pick(letters.filter((x) => R.LETTER_WORDS[x]));
  const w = rng.pick(R.LETTER_WORDS[l]!);
  const inside = [...new Set(w.word.replace(/[^a-z]/g, '').slice(1).split(''))].filter((c) => c !== l);
  const wrongs = [
    ...(R.LOOKALIKE[l] ?? []).map((x) => ({ text: x, why: `${x} looks a bit like ${l}, but makes a different sound.`, code: 'fp-letter-shape' as const })),
    ...rng.shuffle(inside).map((x) => ({ text: x, why: `${x} is in "${w.word}", but it is not the first sound.`, code: 'fp-sound' as const })),
  ];
  return letterQuestion(rng, w, 'first', nOpts, l, rng.shuffle(wrongs).slice(0, nOpts - 1));
}

function lastLetter(rng: Rng): GeneratedQuestion {
  const w = rng.pick(R.CVC);
  const last = w.word.at(-1)!;
  return letterQuestion(rng, w, 'last', 3, last, [{ text: w.word[0]!, why: `${w.word[0]} is the first sound. Listen to the end.`, code: 'fp-sound' }]);
}

function middleVowel(rng: Rng, words: { word: string; icon: string }[]): GeneratedQuestion {
  const w = rng.pick(words.filter((x) => /^[^aeiou]*[aeiou][^aeiou]*$/.test(x.word)));
  const v = w.word.match(/[aeiou]/)![0];
  const others = rng.shuffle('aeiou'.split('').filter((x) => x !== v)).slice(0, 2);
  return letterQuestion(rng, w, 'middle', 3, v, others.map((o) => ({ text: o, why: `Say "${w.word}" slowly: listen to the middle sound.`, code: 'fp-sound' as const })));
}

function digraph(rng: Rng, at: 'start' | 'end'): GeneratedQuestion {
  const g = rng.pick(R.DIGRAPH_WORDS.filter((d) => d.at === at));
  const w = rng.pick(g.words);
  const others = rng.shuffle(['sh', 'ch', 'th', 'ck', 'ng', 'wh'].filter((x) => x !== g.sound && (at === 'start' ? !['ck', 'ng'].includes(x) : x !== 'wh'))).slice(0, 2);
  return letterQuestion(rng, w, at === 'start' ? 'first' : 'last', 3, g.sound, others.map((o) => ({ text: o, why: `${o} makes a different sound. Listen again: ${w.word}.`, code: 'fp-sound' as const })));
}

function initialBlend(rng: Rng): GeneratedQuestion {
  const w = rng.pick(R.BLEND_WORDS.filter((x) => x.sounds[0]!.length === 1 && x.sounds[1]!.length === 1 && !'aeiou'.includes(x.sounds[1]!)));
  const blend = w.sounds[0]! + w.sounds[1]!;
  const others = rng.shuffle(['fr', 'fl', 'dr', 'cr', 'cl', 'st', 'sn', 'sl', 'sw', 'tr', 'gr', 'br'].filter((x) => x !== blend && x[0] === blend[0])).slice(0, 2);
  const fill = others.length < 2 ? rng.shuffle(['fr', 'fl', 'dr', 'cr', 'st', 'sn', 'tr'].filter((x) => x !== blend && !others.includes(x))).slice(0, 2 - others.length) : [];
  return letterQuestion(rng, w, 'first', 3, blend, [...others, ...fill].map((o) => ({ text: o, why: `Listen to both sounds at the start: ${w.word}.`, code: 'fp-sound' as const })));
}

function vowelTeam(rng: Rng, teams: string[]): GeneratedQuestion {
  const t = rng.pick(R.VOWEL_TEAMS.filter((v) => teams.includes(v.team)));
  const w = rng.pick(t.words);
  const others = rng.shuffle(teams.filter((x) => x !== t.team && !(t.team === 'ee' && x === 'ea') && !(t.team === 'ea' && x === 'ee') && !(['ir', 'ur'].includes(t.team) && ['ir', 'ur'].includes(x)))).slice(0, 2);
  return choiceJ(rng, {
    prompt: 'Which letters make the vowel sound?',
    say: `${w.word}. Which letters make the vowel sound in ${w.word}?`,
    scene: { kind: 'picture', icon: w.icon },
    correct: { id: 'c', text: t.team },
    distractors: others.map((o, i) => ({ id: `w${i}`, text: o, feedback: `"${o}" says a different sound. Listen again: ${w.word}.`, code: 'fp-sound' as const })),
    code: 'fp-sound',
    hints: [`Say "${w.word}" slowly.`, 'Listen to the long sound in the middle.'],
    solution: [`In "${w.word}", the letters ${t.team} make the vowel sound: ${w.sounds.join('-')}.`],
    answerDisplay: t.team,
  });
}

const firstSounds = (g: FoundationGrade) =>
  fpTemplate('first-sounds', g, (rng, level) => {
    if (g === 1) {
      if (level === 1) return initialLetter(rng, R.EARLY_LETTERS, 3);
      if (level === 2) return initialLetter(rng, Object.keys(R.LETTER_WORDS), 4);
      if (level === 3) return lastLetter(rng);
      if (level === 4) return middleVowel(rng, R.CVC);
      return rng.pick([() => initialLetter(rng, Object.keys(R.LETTER_WORDS), 4), () => lastLetter(rng), () => middleVowel(rng, R.CVC)])();
    }
    if (g === 2) {
      if (level === 1) return digraph(rng, 'start');
      if (level === 2) return digraph(rng, 'end');
      if (level === 3) return middleVowel(rng, R.BLEND_WORDS.filter((w) => w.sounds.every((s) => s.length <= 2)));
      if (level === 4) return initialBlend(rng);
      return rng.pick([() => digraph(rng, 'start'), () => digraph(rng, 'end'), () => initialBlend(rng)])();
    }
    const sets = [['ee', 'ai', 'oa'], ['ee', 'ai', 'oa', 'oo', 'ar', 'or'], ['oo', 'ar', 'or', 'igh', 'ow', 'ou'], ['ir', 'ur', 'oy', 'ea', 'igh', 'ow'], R.VOWEL_TEAMS.map((v) => v.team)];
    return vowelTeam(rng, sets[level - 1]!);
  });

// ---------------------------------------------------------------------------
// Rhymes, syllables, compound words
// ---------------------------------------------------------------------------
function rhyme(rng: Rng): GeneratedQuestion {
  const fam = rng.pick(R.RHYME_FAMILIES);
  const [target, match] = rng.shuffle(fam.words).slice(0, 2) as [R.PicWord, R.PicWord];
  const others = R.RHYME_FAMILIES.filter((f) => f !== fam).flatMap((f) => f.words);
  const sameStart = others.filter((w) => w.word[0] === target.word[0]);
  const wrong = [...rng.shuffle(sameStart).slice(0, 1), ...rng.shuffle(others.filter((w) => w.word[0] !== target.word[0]))].slice(0, 2);
  return choiceJ(rng, {
    prompt: `Which one rhymes with ${target.word}?`,
    scene: { kind: 'picture', icon: target.icon },
    correct: { id: 'c', text: match.word, icon: match.icon, say: match.word },
    distractors: wrong.map((w, i) => ({ id: `w${i}`, text: w.word, icon: w.icon, say: w.word, feedback: w.word[0] === target.word[0] ? `${cap(w.word)} starts like ${target.word}, but rhyming words sound the same at the end.` : `${cap(w.word)} and ${target.word} end differently.`, code: 'fp-rhyme' as const })),
    code: 'fp-rhyme',
    hints: ['Rhyming words sound the same at the end.', `Say each one with ${target.word}: do they end the same?`],
    solution: [`${cap(target.word)} and ${match.word} rhyme: they both end in "${fam.end}".`],
  });
}

function oddOneOut(rng: Rng): GeneratedQuestion {
  const fam = rng.pick(R.RHYME_FAMILIES.filter((f) => f.words.length >= 3));
  const three = rng.shuffle(fam.words).slice(0, 3);
  const odd = rng.pick(R.RHYME_FAMILIES.filter((f) => f !== fam).flatMap((f) => f.words));
  return choiceJ(rng, {
    prompt: 'Which one does not rhyme?',
    correct: { id: 'odd', text: odd.word, icon: odd.icon, say: odd.word },
    distractors: three.map((w, i) => ({ id: `r${i}`, text: w.word, icon: w.icon, say: w.word, feedback: `${cap(w.word)} rhymes with the others: they end in "${fam.end}".`, code: 'fp-rhyme' as const })),
    code: 'fp-rhyme',
    hints: ['Say all four words.', 'Three of them end the same way.'],
    solution: [`${three.map((w) => w.word).join(', ')} rhyme. ${cap(odd.word)} does not.`],
    answerDisplay: odd.word,
  });
}

function syllables(rng: Rng, maxParts: number): GeneratedQuestion {
  const w = rng.pick(R.SYLLABLES.filter((s) => s.parts.length <= maxParts));
  const n = w.parts.length;
  const opts = Array.from({ length: Math.max(3, maxParts) }, (_, i) => i + 1);
  return choiceJ(rng, {
    prompt: `Clap ${w.word}. How many claps?`,
    say: `Clap the word ${w.word}. How many claps?`,
    scene: { kind: 'picture', icon: w.icon },
    correct: { id: String(n), text: String(n) },
    distractors: opts.filter((o) => o !== n).map((o) => ({ id: String(o), text: String(o), feedback: `Clap it slowly: ${w.parts.join(' - ')}. That is ${n}.`, code: 'fp-sound' as const })),
    code: 'fp-sound',
    keepOrder: 'numeric',
    hints: ['Put your hand under your chin. Each time your chin drops is one clap.', `Say it slowly: ${w.word}.`],
    solution: [`${w.parts.join(' - ')}: ${n} ${n === 1 ? 'clap' : 'claps'}.`],
  });
}

function compound(rng: Rng, split: boolean): GeneratedQuestion {
  const c = rng.pick(R.COMPOUNDS);
  if (!split) {
    return choiceJ(rng, {
      prompt: `${cap(c.a)} + ? = ${c.word}`,
      say: `Which word joins with ${c.a} to make ${c.word}?`,
      scene: { kind: 'picture', icon: c.icon },
      correct: { id: 'c', text: c.b, say: c.b },
      distractors: c.wrong.map((w, i) => ({ id: `w${i}`, text: w, say: w, feedback: `${c.a}${w} is not the word. Say ${c.word} slowly: ${c.a} … ${c.b}.`, code: 'fp-sound' as const })),
      code: 'fp-sound',
      hints: [`Say ${c.word} slowly.`, `${cap(c.a)} … and then?`],
      solution: [`${cap(c.a)} + ${c.b} = ${c.word}.`],
    });
  }
  return choiceJ(rng, {
    prompt: `Which two words make ${c.word}?`,
    scene: { kind: 'picture', icon: c.icon },
    correct: { id: 'c', text: `${c.a} + ${c.b}` },
    distractors: c.wrong.map((w, i) => ({ id: `w${i}`, text: i === 0 ? `${c.a} + ${w}` : `${w} + ${c.b}`, feedback: `Say ${c.word} slowly: ${c.a} … ${c.b}.`, code: 'fp-sound' as const })),
    code: 'fp-sound',
    hints: [`Say ${c.word} slowly. Where does it break?`],
    solution: [`${c.word} = ${c.a} + ${c.b}.`],
  });
}

const phonological = (g: FoundationGrade) =>
  fpTemplate('phonological', g, (rng, level) => {
    if (g === 1) return [() => rhyme(rng), () => rhyme(rng), () => syllables(rng, 3), () => rhyme(rng), () => syllables(rng, 4)][level - 1]!();
    if (g === 2) return [() => rhyme(rng), () => syllables(rng, 3), () => oddOneOut(rng), () => syllables(rng, 4), () => oddOneOut(rng)][level - 1]!();
    return [() => compound(rng, false), () => syllables(rng, 4), () => compound(rng, true), () => oddOneOut(rng), () => (rng.chance(0.5) ? compound(rng, true) : syllables(rng, 4))][level - 1]!();
  });

// ---------------------------------------------------------------------------
// Read words (decode) and spell words
// ---------------------------------------------------------------------------
const diffLetters = (a: string, b: string) => (a.length !== b.length ? 9 : [...a].filter((c, i) => c !== b[i]).length);

function readWord(rng: Rng, pool: { word: string; icon: string }[], nOpts: number, similar: boolean): GeneratedQuestion {
  const w = rng.pick(pool);
  const others = pool.filter((x) => x.word !== w.word && x.icon !== w.icon);
  const close = similar ? others.filter((x) => diffLetters(x.word, w.word) === 1) : [];
  const wrong = [...rng.shuffle(close), ...rng.shuffle(others.filter((x) => !close.includes(x)))].slice(0, nOpts - 1);
  return choiceJ(rng, {
    prompt: 'Read the word. Tap its picture.',
    say: 'Read the word. Then tap its picture.',
    scene: { kind: 'text', text: w.word, size: 'word' },
    correct: { id: 'c', text: '', icon: w.icon },
    distractors: wrong.map((x, i) => ({ id: `w${i}`, text: '', icon: x.icon, feedback: `That picture is "${x.word}". Sound out every letter: ${w.word.split('').join('-')}.`, code: 'fp-similar-word' as const })),
    code: 'fp-similar-word',
    hints: ['Say the sound of each letter, left to right.', `Push the sounds together: ${w.word.split('').join('… ')}.`, `Listen: ${w.word}.`],
    solution: [`${w.word.split('').join('-')}: ${w.word}.`],
    answerDisplay: w.word,
  });
}

function spell(rng: Rng, w: { word: string; icon: string; sounds: string[] }, extras: string[]): GeneratedQuestion {
  const tiles = rng.shuffle([...w.sounds, ...extras.filter((e) => !w.sounds.includes(e))]);
  return jq({
    prompt: 'Spell the word.',
    say: `Spell ${w.word}.`,
    scene: { kind: 'picture', icon: w.icon },
    input: { kind: 'spell', tiles, length: w.sounds.length },
    answer: { kind: 'text', value: w.word },
    answerDisplay: w.word,
    hints: [`Say ${w.word} slowly. What sound comes first?`, `It has ${w.sounds.length} sounds: ${w.sounds.map(() => '_').join(' ')}.`],
    solution: [`${w.sounds.join(' - ')}: ${w.word}.`],
  });
}

const cvcSounds = (w: R.PicWord) => ({ ...w, sounds: w.word.split('') });
const extraLetters = (rng: Rng, word: string, n: number): string[] => {
  const look = word.split('').flatMap((c) => R.LOOKALIKE[c] ?? []);
  return [...new Set([...rng.shuffle(look), ...rng.shuffle('aeioumstpnbdg'.split(''))])].filter((c) => !word.includes(c)).slice(0, n);
};

const decode = (g: FoundationGrade) =>
  fpTemplate('decode', g, (rng, level) => {
    if (g === 1) return readWord(rng, R.CVC, level <= 2 ? 3 : 4, level >= 2);
    if (g === 2) return readWord(rng, [...R.BLEND_WORDS, ...R.DIGRAPH_WORDS.flatMap((d) => d.words)].filter((w, i, a) => a.findIndex((x) => x.word === w.word) === i), level <= 2 ? 3 : 4, level >= 3);
    return readWord(rng, R.VOWEL_TEAMS.flatMap((v) => v.words), level <= 2 ? 3 : 4, level >= 3);
  });

const spelling = (g: FoundationGrade) =>
  fpTemplate('spelling', g, (rng, level) => {
    if (g === 1) {
      const w = cvcSounds(rng.pick(R.CVC.filter((x) => /^[a-z]+$/.test(x.word))));
      return spell(rng, w, extraLetters(rng, w.word, level <= 2 ? 1 : level <= 4 ? 2 : 3));
    }
    if (g === 2) {
      const w = rng.pick(R.BLEND_WORDS);
      const confuse = ['sh', 'ch', 'th', 'ck', 'ng'].filter((d) => !w.sounds.includes(d));
      return spell(rng, w, [...rng.shuffle(confuse).slice(0, level >= 3 ? 1 : 0), ...extraLetters(rng, w.word, level <= 2 ? 1 : 2)]);
    }
    const t = rng.pick(R.VOWEL_TEAMS);
    const w = rng.pick(t.words);
    const confuse = R.VOWEL_TEAMS.map((v) => v.team).filter((x) => x !== t.team && !w.sounds.includes(x));
    return spell(rng, w, [...rng.shuffle(confuse).slice(0, level >= 2 ? 1 : 0), ...extraLetters(rng, w.word, level >= 4 ? 2 : 1)]);
  });

// ---------------------------------------------------------------------------
// Sight words
// ---------------------------------------------------------------------------
function sightWord(rng: Rng, pool: string[], all: string[], nOpts: number): GeneratedQuestion {
  const w = rng.pick(pool);
  const confusion = R.SIGHT_CONFUSIONS.find((p) => p.includes(w));
  const partner = confusion ? confusion.find((x) => x !== w)! : null;
  const sameStart = all.filter((x) => x !== w && x[0]?.toLowerCase() === w[0]?.toLowerCase());
  const wrong = [...new Set([...(partner ? [partner] : []), ...rng.shuffle(sameStart), ...rng.shuffle(all.filter((x) => x !== w))])].filter((x) => x !== w).slice(0, nOpts - 1);
  return choiceJ(rng, {
    prompt: 'Tap the word you hear.',
    say: `Tap the word: ${w}.`,
    correct: { id: 'c', text: w },
    distractors: wrong.map((x, i) => ({ id: `w${i}`, text: x, feedback: x === partner ? `That says "${x}". Look at every letter, from left to right.` : `That says "${x}". Listen again: ${w}.`, code: 'fp-similar-word' as const })),
    code: 'fp-similar-word',
    hints: [`Listen again: ${w}.`, `It starts with "${w[0]}".`],
    solution: [`This is the word "${w}".`],
  });
}

const sightWords = (g: FoundationGrade) =>
  fpTemplate('sight-words', g, (rng, level) => {
    const upTo = (gr: number) => ([1, 2, 3] as const).filter((x) => x <= gr).flatMap((x) => R.SIGHT_WORDS[x]);
    const pool = level === 1 && g > 1 ? R.SIGHT_WORDS[(g - 1) as 1 | 2] : R.SIGHT_WORDS[g];
    return sightWord(rng, pool, upTo(g), level <= 2 ? 3 : 4);
  });

// ---------------------------------------------------------------------------
// Sentences
// ---------------------------------------------------------------------------
function sentencePicture(rng: Rng, grade: 1 | 2 | 3): GeneratedQuestion {
  const s = rng.pick(R.SENTENCES.filter((x) => x.grade === grade));
  return choiceJ(rng, {
    prompt: s.q,
    say: `Read the sentence. ${s.q}`,
    scene: { kind: 'text', text: s.text, size: 'sentence' },
    correct: { id: 'c', text: s.a.word, icon: s.a.icon },
    distractors: s.wrong.map((w, i) => ({ id: `w${i}`, text: w.word, icon: w.icon, feedback: `Read the sentence again and look for the word that answers: ${s.q}`, code: 'fp-similar-word' as const })),
    code: 'fp-similar-word',
    hints: ['Point to each word as you read.', `Listen: "${s.text}"`],
    solution: [`"${s.text}" ${s.q} ${cap(s.a.word)}.`],
  });
}

function buildSentence(rng: Rng, grade: 1 | 2 | 3): GeneratedQuestion {
  const s = rng.pick(R.BUILD_SENTENCES[grade]);
  const words = s.split(' ');
  const items = words.map((w, i) => tile(`w${i}`, w));
  let shown = rng.shuffle(items);
  while (shown.every((t, i) => t.id === `w${i}`)) shown = rng.shuffle(items);
  return jq({
    prompt: 'Make a sentence.',
    say: 'Put the words in order to make a sentence.',
    input: { kind: 'order', items: shown },
    answer: { kind: 'sequence', ids: items.map((t) => t.id) },
    answerDisplay: s,
    hints: ['A sentence starts with a capital letter.', 'It ends with a full stop.', `Listen: "${s}"`],
    solution: [s],
  });
}

const sentences = (g: FoundationGrade) =>
  fpTemplate('sentences', g, (rng, level) => {
    if (level <= 3) return sentencePicture(rng, level === 1 && g > 1 ? ((g - 1) as 1 | 2) : g);
    return buildSentence(rng, level === 4 && g > 1 ? ((g - 1) as 1 | 2) : g);
  });

// ---------------------------------------------------------------------------
// Stories: listening (Grade 1) and reading (Grades 2–3) comprehension
// ---------------------------------------------------------------------------
const LEVEL_KINDS: R.Story['questions'][number]['kind'][][] = [['who', 'what'], ['what', 'where'], ['feel', 'what', 'where'], ['order'], ['why']];

const comprehension = (g: FoundationGrade) =>
  fpTemplate('comprehension', g, (rng, level) => {
    const story = rng.pick(R.STORIES.filter((s) => s.grade === g));
    const kinds = LEVEL_KINDS[level - 1]!;
    const fitting = story.questions.filter((q) => kinds.includes(q.kind));
    const q = rng.pick(fitting.length ? fitting : story.questions);
    const readAloud = g === 1 || (g === 2 && level <= 2);
    const storyText = story.text.join(' ');
    const scene = { kind: 'text' as const, text: storyText, size: 'story' as const, title: story.title };
    if (q.kind === 'order' && q.events) {
      const items = q.events.map((e, i) => tile(`e${i}`, e, undefined, readAloud ? e : undefined));
      let shown = rng.shuffle(items);
      while (shown.every((t, i) => t.id === `e${i}`)) shown = rng.shuffle(items);
      return jq({
        prompt: 'Put what happened in order.',
        say: readAloud ? `${storyText} Put what happened in order.` : 'Put what happened in the story in order.',
        scene,
        input: { kind: 'order', items: shown },
        answer: { kind: 'sequence', ids: items.map((t) => t.id) },
        answerDisplay: q.events.join(' Then '),
        hints: ['What happened at the very start of the story?', `Listen to the story again: ${storyText}`],
        solution: [q.events.join(' Then '), q.why],
      });
    }
    return choiceJ(rng, {
      prompt: q.q,
      say: readAloud ? `${storyText} ${q.q}` : q.q,
      scene,
      correct: { id: 'c', text: q.a, ...(readAloud ? { say: q.a } : {}) },
      distractors: q.wrong.map((w, i) => ({ id: `w${i}`, text: w, ...(readAloud ? { say: w } : {}), feedback: `Look back at the story. ${q.why}`, code: 'fp-story-detail' as const })),
      code: 'fp-story-detail',
      hints: [q.kind === 'why' ? 'Think about what happened and what the person wanted.' : 'Look back at the story for the answer.', readAloud ? 'Listen to the story again.' : `Listen to the story: ${storyText}`],
      solution: [q.why],
    });
  });

// ---------------------------------------------------------------------------
// Language use
// ---------------------------------------------------------------------------
const language = (g: FoundationGrade) =>
  fpTemplate('language', g, (rng, level, ctx) => {
    const p = corePack(ctx);
    const name = rng.pick(p.NAMES);
    const verb = rng.pick(['went home', 'can swim', 'has a dog', 'likes mangoes', 'is six', 'saw a bird']);
    const capitals = () =>
      choiceJ(rng, {
        prompt: 'Which sentence is written correctly?',
        say: 'Which sentence is written correctly? Look at the start and the end.',
        correct: { id: 'c', text: `${name} ${verb}.` },
        distractors: [
          { id: 'lc', text: `${name.toLowerCase()} ${verb}.`, feedback: 'A name and the start of a sentence need a capital letter.', code: 'fp-grammar' },
          { id: 'nf', text: `${name} ${verb}`, feedback: 'A sentence ends with a full stop.', code: 'fp-grammar' },
        ],
        code: 'fp-grammar',
        hints: ['A sentence starts with a capital letter.', 'A sentence ends with a full stop.'],
        solution: [`"${name} ${verb}." starts with a capital letter and ends with a full stop.`],
      });
    const opposite = () => {
      const [a, b] = rng.pick(R.OPPOSITES);
      const [word, ans] = rng.chance(0.5) ? [a, b] : [b, a];
      const others = rng.shuffle(R.OPPOSITES.flat().filter((x) => x !== a && x !== b)).slice(0, 2);
      return choiceJ(rng, {
        prompt: `What is the opposite of ${word}?`,
        correct: { id: 'c', text: ans, say: ans },
        distractors: others.map((o, i) => ({ id: `w${i}`, text: o, say: o, feedback: `The opposite of ${word} is ${ans}.`, code: 'fp-grammar' as const })),
        code: 'fp-grammar',
        hints: ['Opposites are as different as can be.', `If it is not ${word}, what is it?`],
        solution: [`${cap(word)} and ${ans} are opposites.`],
      });
    };
    const plural = (irregular: boolean) => {
      const pl = rng.pick(R.PLURALS.filter((x) => irregular === ['child', 'foot', 'mouse', 'tooth', 'sheep', 'baby'].includes(x.one)));
      return choiceJ(rng, {
        prompt: `One ${pl.one}, two …`,
        say: `One ${pl.one}, two what?`,
        correct: { id: 'c', text: pl.many },
        distractors: pl.wrong.map((w, i) => ({ id: `w${i}`, text: w, feedback: irregular ? `Some words change: one ${pl.one}, two ${pl.many}.` : pl.many.endsWith('es') ? `Words ending in s, x, sh or ch add "es": ${pl.many}.` : `Most words just add "s": ${pl.many}.`, code: 'fp-grammar' as const })),
        code: 'fp-grammar',
        hints: ['More than one usually adds "s".', pl.many.endsWith('es') ? 'Words ending in s, x, sh or ch add "es".' : 'Some words change in a special way.'],
        solution: [`One ${pl.one}, two ${pl.many}.`],
      });
    };
    const question = () => {
      const qs = [`Where is my ${rng.pick(['bag', 'hat', 'book'])}`, `Can we go outside`, `What is your name`, `Do you like apples`];
      const ss = [`I like my school`, `The dog is asleep`, `We had rice for supper`, `It is a sunny day`];
      const q = rng.pick(qs);
      const wrong = rng.shuffle(ss).slice(0, 2);
      return choiceJ(rng, {
        prompt: 'Which one needs a question mark?',
        correct: { id: 'c', text: `${q} _` },
        distractors: wrong.map((w, i) => ({ id: `w${i}`, text: `${w} _`, feedback: `"${w}" tells us something. It ends with a full stop.`, code: 'fp-grammar' as const })),
        code: 'fp-grammar',
        hints: ['A question asks something.', 'Questions often start with what, where, can or do.'],
        solution: [`"${q}?" asks something, so it ends with a question mark.`],
        answerDisplay: `${q}?`,
      });
    };
    const wordClass = (kind: 'nouns' | 'verbs' | 'adjectives') => {
      const s = rng.pick(R.WORD_CLASSES);
      const label = { nouns: 'naming word', verbs: 'doing word', adjectives: 'describing word' }[kind];
      const options = s.sentence.map((w, i) => tile(`w${i}`, w));
      return jq({
        prompt: `Tap the ${label}.`,
        say: `Read the sentence. Tap the ${label}.`,
        input: { kind: 'pick', options },
        answer: { kind: 'set', ids: s.sentence.map((w, i) => (s[kind].includes(w) ? `w${i}` : '')).filter(Boolean) },
        answerDisplay: s[kind].join(', ').replace('.', ''),
        hints: [kind === 'nouns' ? 'A naming word names a person, animal or thing.' : kind === 'verbs' ? 'A doing word tells what someone does.' : 'A describing word tells us what something is like.'],
        solution: [`"${s[kind].join(', ').replace('.', '')}" is the ${label}.`],
      });
    };
    const past = (irregular: boolean) => {
      const v = rng.pick(R.PAST.filter((x) => irregular === !x.past.endsWith('ed')));
      return choiceJ(rng, {
        prompt: `Today I ${v.now}. Yesterday I …`,
        say: `Today I ${v.now}. Yesterday I what?`,
        correct: { id: 'c', text: v.past },
        distractors: v.wrong.map((w, i) => ({ id: `w${i}`, text: w, feedback: irregular ? `Some words change: today I ${v.now}, yesterday I ${v.past}.` : `For things that already happened, many words add "ed": ${v.past}.`, code: 'fp-grammar' as const })),
        code: 'fp-grammar',
        hints: ['Yesterday is in the past.', irregular ? 'This word changes in a special way.' : 'Many words add "ed" for the past.'],
        solution: [`Yesterday I ${v.past}.`],
      });
    };
    const joining = () => {
      const j = rng.pick(R.JOINING);
      return choiceJ(rng, {
        prompt: `${j.a} ___ ${j.b}.`,
        say: `Which word joins the sentence? ${j.a}, something, ${j.b}.`,
        correct: { id: j.join, text: j.join, say: j.join },
        distractors: (['and', 'but', 'because'] as const).filter((x) => x !== j.join).map((x) => ({ id: x, text: x, say: x, feedback: x === 'because' ? '"Because" gives a reason.' : x === 'but' ? '"But" shows something different or surprising.' : '"And" adds more of the same.', code: 'fp-grammar' as const })),
        code: 'fp-grammar',
        keepOrder: true,
        hints: ['Read it with each word. Which sounds right?', '"Because" gives a reason. "But" shows a change. "And" adds more.'],
        solution: [`${j.a} ${j.join} ${j.b}.`],
      });
    };
    if (g === 1) return [capitals, capitals, opposite, opposite, () => (rng.chance(0.5) ? capitals() : opposite())][level - 1]!();
    if (g === 2) return [() => plural(false), () => plural(rng.chance(0.4)), question, () => wordClass('nouns'), () => wordClass('verbs')][level - 1]!();
    return [() => past(false), () => past(true), joining, () => wordClass('adjectives'), () => plural(true)][level - 1]!();
  });

// ---------------------------------------------------------------------------
// English First Additional Language
// ---------------------------------------------------------------------------
function vocabQuestion(rng: Rng, grades: number[], nOpts: number): GeneratedQuestion {
  const themes = VOCAB.filter((t) => grades.includes(t.grade));
  const theme = rng.pick(themes);
  const w = rng.pick(theme.words);
  const wrong = rng.shuffle(theme.words.filter((x) => x.word !== w.word && x.icon !== w.icon)).slice(0, nOpts - 1);
  return choiceJ(rng, {
    prompt: 'Tap what you hear.',
    say: `Tap: ${w.word}.`,
    // Pictures only: this is listening, so printed words would let a reader skip it.
    correct: { id: 'c', text: '', icon: w.icon },
    distractors: wrong.map((x, i) => ({ id: `w${i}`, text: '', icon: x.icon, feedback: `That is "${x.word}". Listen again: ${w.word}.`, code: 'fp-knowledge' as const })),
    answerDisplay: w.word,
    code: 'fp-knowledge',
    hints: [`Listen again: ${w.word}.`, `It is one of the ${theme.theme} words.`],
    solution: [`This is "${w.word}".`],
  });
}

const shapeTok = (shape: string, colour: string, size: 'big' | 'small' = 'big') => `shape:${shape}:0:${colour}:${size}`;

const falVocabulary = (g: FoundationGrade) =>
  fpTemplate('fal-vocabulary', g, (rng, level) => vocabQuestion(rng, level <= 2 && g > 1 ? [g - 1, g] : [g], level <= 2 ? 3 : 4));

const falInstructions = (g: FoundationGrade) =>
  fpTemplate('fal-instructions', g, (rng, level, ctx) => {
    const p = corePack(ctx);
    const colourShape = (withSize: boolean) => {
      const shapes = ['circle', 'square', 'triangle'];
      const s = rng.pick(shapes);
      const c = rng.pick(COLOURS);
      const size = rng.pick(['big', 'small'] as const);
      const c2 = rng.pick(COLOURS.filter((x) => x !== c));
      const s2 = rng.pick(shapes.filter((x) => x !== s));
      const opts: JOpt[] = [
        { id: 'c', text: '', icon: shapeTok(s, c, size) },
        { id: 'wc', text: '', icon: shapeTok(s, c2, size), feedback: `That ${s} is ${c2}. Listen for the colour.`, code: 'fp-knowledge' },
        { id: 'ws', text: '', icon: shapeTok(s2, c, size), feedback: `That is a ${s2}. Listen for the shape.`, code: 'fp-knowledge' },
        ...(withSize ? [{ id: 'wz', text: '', icon: shapeTok(s, c, size === 'big' ? 'small' : 'big'), feedback: `That one is ${size === 'big' ? 'small' : 'big'}.`, code: 'fp-knowledge' as const }] : []),
      ];
      return choiceJ(rng, {
        prompt: 'Listen and tap.',
        say: `Tap the ${withSize ? `${size} ` : ''}${c} ${s}.`,
        correct: opts[0]!,
        distractors: opts.slice(1),
        code: 'fp-knowledge',
        hints: [`Listen again: the ${withSize ? `${size} ` : ''}${c} ${s}.`, `First find the ${c} ones.`],
        solution: [`This is the ${withSize ? `${size} ` : ''}${c} ${s}.`],
        answerDisplay: `the ${withSize ? `${size} ` : ''}${c} ${s}`,
      });
    };
    const colourOnly = () => {
      const c = rng.pick(COLOURS);
      const others = rng.shuffle(COLOURS.filter((x) => x !== c)).slice(0, 2);
      return choiceJ(rng, {
        prompt: 'Listen and tap.',
        say: `Tap ${c}.`,
        correct: { id: c, text: '', icon: `color:${c}` },
        distractors: others.map((o) => ({ id: o, text: '', icon: `color:${o}`, feedback: `That is ${o}. Listen again: ${c}.`, code: 'fp-knowledge' as const })),
        code: 'fp-knowledge',
        hints: [`Listen again: ${c}.`],
        solution: [`This is ${c}.`],
        answerDisplay: c,
      });
    };
    const howMany = (max: number) => {
      const id = rng.pick(['apple', 'ball', 'star', 'fish', 'car'] as const);
      const it = p.ITEMS[id];
      const n = rng.int(1, max);
      const others = rng.shuffle(Array.from({ length: max }, (_, i) => i + 1).filter((x) => x !== n)).slice(0, 2);
      return choiceJ(rng, {
        prompt: 'Listen and tap.',
        say: `Tap ${n === 1 ? `one ${it.one}` : `${n} ${it.many}`}.`,
        correct: { id: String(n), text: '', icon: `count:${n}:${it.icon}` },
        distractors: others.map((o) => ({ id: String(o), text: '', icon: `count:${o}:${it.icon}`, feedback: `There are ${o} there. Count them.`, code: 'fp-miscount' as const })),
        code: 'fp-miscount',
        hints: ['Listen for the number.', 'Count each group.'],
        solution: [`There are ${n} ${n === 1 ? it.one : it.many} here.`],
        answerDisplay: `${n} ${n === 1 ? it.one : it.many}`,
      });
    };
    const notOne = () => {
      const s = rng.pick(['circle', 'square', 'triangle']);
      const c = rng.pick(COLOURS);
      const others = rng.shuffle(['circle', 'square', 'triangle'].filter((x) => x !== s));
      const target = others[0]!;
      return choiceJ(rng, {
        prompt: 'Listen and tap.',
        say: `Tap the shape that is not a ${s} and not a ${others[1]}.`,
        correct: { id: 'c', text: '', icon: shapeTok(target, c) },
        distractors: [s, others[1]!].map((x, i) => ({ id: `w${i}`, text: '', icon: shapeTok(x, c), feedback: `That is a ${x}. Listen for the word "not".`, code: 'fp-knowledge' as const })),
        code: 'fp-knowledge',
        hints: ['"Not" means leave those out.', `Leave out the ${s} and the ${others[1]}.`],
        solution: [`The ${target} is not a ${s} and not a ${others[1]}.`],
        answerDisplay: `the ${target}`,
      });
    };
    const pickAll = () => {
      const c = rng.pick(COLOURS);
      const shapes = ['circle', 'square', 'triangle'];
      const n = rng.int(2, 3);
      const tiles = rng.shuffle([...Array.from({ length: n }, (_, i) => ({ id: `t${i}`, s: rng.pick(shapes), c })), ...Array.from({ length: 6 - n }, (_, i) => ({ id: `o${i}`, s: rng.pick(shapes), c: rng.pick(COLOURS.filter((x) => x !== c)) }))]);
      return jq({
        prompt: 'Listen and tap.',
        say: `Tap all the ${c} shapes.`,
        input: { kind: 'pick', options: tiles.map((t) => tile(t.id, undefined, shapeTok(t.s, t.c))) },
        answer: { kind: 'set', ids: tiles.filter((t) => t.c === c).map((t) => t.id) },
        answerDisplay: `all the ${c} shapes`,
        hints: [`Listen again: all the ${c} shapes.`, `Find every ${c} one, big or small, any shape.`],
        solution: [`There are ${n} ${c} shapes.`],
      });
    };
    if (g === 1) return [() => vocabQuestion(rng, [1], 3), colourOnly, () => howMany(5), () => colourShape(false), () => colourShape(true)][level - 1]!();
    if (g === 2) return [() => colourShape(false), () => howMany(10), () => colourShape(true), pickAll, notOne][level - 1]!();
    return [() => colourShape(true), pickAll, notOne, () => colourShape(true), () => (rng.chance(0.5) ? pickAll() : notOne())][level - 1]!();
  });

const falPhonics = (g: FoundationGrade) =>
  fpTemplate('fal-phonics', g, (rng, level) => {
    if (g === 2) return initialLetter(rng, level <= 2 ? R.EARLY_LETTERS : Object.keys(R.LETTER_WORDS), level <= 3 ? 3 : 4);
    return level <= 2 ? initialLetter(rng, Object.keys(R.LETTER_WORDS), 4) : digraph(rng, level <= 4 ? 'start' : 'end');
  });

const falReading = (g: FoundationGrade) =>
  fpTemplate('fal-reading', g, (rng, level) => {
    if (g === 2) return level <= 3 ? readWord(rng, R.CVC, level === 1 ? 3 : 4, level === 3) : sentencePicture(rng, 1);
    return level <= 2 ? readWord(rng, [...R.CVC, ...R.BLEND_WORDS], 4, level === 2) : sentencePicture(rng, level === 5 ? 2 : 1);
  });

const G = [1, 2, 3] as const;
export const LITERACY_TEMPLATES: QuestionTemplate[] = [
  ...G.flatMap((g) => [firstSounds(g), phonological(g), decode(g), sightWords(g), spelling(g), sentences(g), comprehension(g), language(g), falVocabulary(g), falInstructions(g)]),
  ...([2, 3] as const).flatMap((g) => [falPhonics(g), falReading(g)]),
];
