/**
 * Foundation Phase Mathematics: numbers and counting.
 * Ranges per grade follow CAPS (counting objects to 50 / 200 / 1 000; ordering to 20 / 99 / 999).
 * Level 5 is the end-of-year expectation for the grade.
 */
import type { Difficulty, QuestionTemplate, Scene, GenContext, GeneratedQuestion } from '../../questions/types.ts';
import type { Rng } from '../../questions/rng.ts';
import type { FoundationGrade } from '../../curriculum/foundation.ts';
import { jq, exactN, miss, keepJ, choiceJ, nearNumbers, digitSwap, tile, corePack, type JOpt, type CorePack, aWord } from '../kit.ts';
import { ITEM_IDS } from '../packs/en/core.ts';

type Gen = (rng: Rng, level: Difficulty, ctx?: GenContext) => GeneratedQuestion;
export const fpTemplate = (key: string, g: FoundationGrade, generate: Gen): QuestionTemplate => ({ id: `fp-${key}-g${g}`, skillId: `fp-${key}-g${g}`, generate });

/** 1000 → "1 000" (South African grouping). */
export const grp = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export function base10Of(n: number): Extract<Scene, { kind: 'base10' }> {
  return { kind: 'base10', hundreds: Math.floor(n / 100), tens: Math.floor((n % 100) / 10), ones: n % 10 };
}

// ---------------------------------------------------------------------------
// Count objects
// ---------------------------------------------------------------------------
const COUNT_RANGE: Record<FoundationGrade, [number, number][]> = {
  1: [[1, 5], [6, 10], [11, 20], [20, 34], [35, 50]],
  2: [[10, 30], [30, 60], [60, 100], [100, 150], [150, 200]],
  3: [[100, 200], [200, 400], [400, 600], [600, 900], [900, 1000]],
};

function countSolution(p: CorePack, n: number, layout: 'loose' | 'frames' | 'blocks'): string[] {
  if (layout === 'loose') {
    const said = n <= 6 ? Array.from({ length: n }, (_, i) => i + 1).join(', ') : `1, 2, 3, all the way to ${n}`;
    return [`Touch each one and count: ${said}.`, `There ${n === 1 ? 'is 1' : `are ${n}`}.`];
  }
  if (layout === 'frames') {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    const tensSaid = Array.from({ length: tens }, (_, i) => (i + 1) * 10).join(', ');
    return [tens ? `Each full frame is 10. Count the full frames: ${tensSaid}.` : 'Count the dots in the frame.', ones ? `Then count on the rest: ${tens * 10 + 1}${ones > 1 ? `, all the way to ${n}` : ''}.` : 'There are no extras.', `So there are ${n}.`];
  }
  const b = base10Of(n);
  return [
    `Each flat is 100, each long rod is 10, each small cube is 1.`,
    `${p.placeWords(b)}.`,
    `${b.hundreds ? `${b.hundreds * 100} + ` : ''}${b.tens * 10} + ${b.ones} = ${grp(n)}.`,
  ];
}

const countObjects = (g: FoundationGrade) =>
  fpTemplate('count-objects', g, (rng, level, ctx) => {
    const p = corePack(ctx);
    const [lo, hi] = COUNT_RANGE[g][level - 1]!;
    const n = rng.int(lo, hi);
    const id = rng.pick(ITEM_IDS);
    const it = p.ITEMS[id];

    if (g === 1 && level <= 3 && n >= 3 && rng.chance(0.35)) {
      const tool = n <= 10 ? 'counters' : 'tenframe';
      return jq({
        prompt: `Make ${n}.`,
        say: `Show me ${n}. Put down ${n} counters.`,
        input: { kind: 'build', tool, max: tool === 'counters' ? 10 : 20 },
        answer: exactN(n),
        answerDisplay: String(n),
        hints: ['Count as you put each counter down.', tool === 'tenframe' ? 'Fill one frame first. A full frame is 10.' : 'Say one number for each counter.'],
        solution: tool === 'tenframe' ? countSolution(p, n, 'frames') : [`Put down counters one at a time: 1, 2, 3, all the way to ${n}.`],
        misconceptions: keepJ([miss('fp-miscount', n + 1, `That is ${n + 1}. One too many.`), miss('fp-miscount', n - 1, `That is ${n - 1}. One more counter makes ${n}.`)], n),
      });
    }

    const blocks = (g === 2 && level >= 3) || g === 3;
    if (blocks) {
      const b = base10Of(n);
      const loose = b.hundreds + b.tens + b.ones;
      const swapped = b.hundreds * 100 + b.ones * 10 + b.tens;
      return jq({
        prompt: 'How many are there?',
        say: 'How many are there? Count the hundreds, then the tens, then the ones.',
        scene: b,
        input: { kind: 'pad', max: 1000 },
        answer: exactN(n),
        answerDisplay: grp(n),
        hints: ['A flat is 100. A long rod is 10. A small cube is 1.', `Count in hundreds first, then tens, then ones.`],
        solution: countSolution(p, n, 'blocks'),
        misconceptions: keepJ(
          [
            miss('fp-place-value', loose, `You counted every block as 1. A rod is worth 10${b.hundreds ? ' and a flat is worth 100' : ''}.`),
            miss('fp-digit-swap', swapped, `That swaps the tens and the ones. There ${b.tens === 1 ? 'is' : 'are'} ${p.placeWords({ ...b, hundreds: 0 }, false)}.`),
            miss('fp-miscount', n + 10, `That is one ten too many. Count the rods again.`),
            miss('fp-miscount', n - 10, `That is one ten too few. Count the rods again.`),
            miss('fp-miscount', n + 1, 'Nearly! Count the small cubes again.'),
            miss('fp-miscount', n - 1, 'Nearly! Count the small cubes again.'),
          ],
          n,
        ),
      });
    }

    const frames = n > 10;
    return jq({
      prompt: `How many ${it.many}?`,
      say: `How many ${it.many} are there?`,
      scene: { kind: 'objects', icon: it.icon, count: n, arrange: frames ? 'tenframes' : level === 1 ? 'scatter' : 'rows' },
      input: { kind: 'pad', max: 1000 },
      answer: exactN(n),
      answerDisplay: String(n),
      hints: frames ? ['Each full frame holds 10.', 'Count the full frames in tens, then count on the rest.'] : ['Touch each one as you count.', 'Say one number for each one.'],
      solution: countSolution(p, n, frames ? 'frames' : 'loose'),
      misconceptions: keepJ(
        [
          miss('fp-miscount', n + 1, `That is one too many. Touch each ${it.one} once.`),
          miss('fp-miscount', n - 1, `You missed one. Touch each ${it.one} once.`),
          ...(frames ? [miss('fp-miscount', n - 10, 'You missed a full frame. Each full frame is 10.')] : []),
        ],
        n,
      ),
    });
  });

// ---------------------------------------------------------------------------
// Count forwards and backwards (including skip counting)
// ---------------------------------------------------------------------------
interface CountCfg {
  hi: number;
  steps: number[];
  dir: 'on' | 'back' | 'mix';
}
const COUNT_CFG: Record<FoundationGrade, CountCfg[]> = {
  1: [
    { hi: 20, steps: [1], dir: 'on' },
    { hi: 50, steps: [1], dir: 'mix' },
    { hi: 100, steps: [1], dir: 'mix' },
    { hi: 100, steps: [10, 5], dir: 'on' },
    { hi: 100, steps: [2, 5, 10], dir: 'mix' },
  ],
  2: [
    { hi: 200, steps: [1], dir: 'on' },
    { hi: 200, steps: [1], dir: 'back' },
    { hi: 200, steps: [2, 5, 10], dir: 'mix' },
    { hi: 200, steps: [3, 4], dir: 'on' },
    { hi: 200, steps: [3, 4, 5, 10], dir: 'mix' },
  ],
  3: [
    { hi: 1000, steps: [1], dir: 'mix' },
    { hi: 1000, steps: [10, 100], dir: 'mix' },
    { hi: 1000, steps: [20, 25, 50], dir: 'on' },
    { hi: 1000, steps: [10, 50, 100], dir: 'back' },
    { hi: 1000, steps: [3, 4, 5, 20, 25], dir: 'mix' },
  ],
};

const counting = (g: FoundationGrade) =>
  fpTemplate('counting', g, (rng, level, ctx) => {
    const p = corePack(ctx);
    const cfg = COUNT_CFG[g][level - 1]!;
    const step = rng.pick(cfg.steps);
    const back = cfg.dir === 'back' || (cfg.dir === 'mix' && rng.chance(0.5));
    const len = 5;
    // Skip counts start on a multiple of the step (CAPS: count in 5s, 10s … from 0 and from multiples).
    let seq: number[];
    if (step === 1) {
      const start = rng.int(0, cfg.hi - (len - 1));
      seq = Array.from({ length: len }, (_, i) => start + i);
    } else {
      const maxK = Math.max(0, Math.floor(cfg.hi / step) - (len - 1));
      const k = rng.int(0, maxK);
      seq = Array.from({ length: len }, (_, i) => (k + i) * step);
    }
    if (back) seq.reverse();
    const gap = level <= 2 ? rng.int(1, len - 1) : rng.int(0, len - 1);
    const ans = seq[gap]!;
    const cells = seq.map((v, i) => (i === gap ? null : v));
    const dirWord = back ? 'back' : 'on';
    const stepWords = step === 1 ? 'ones' : `${step}s`;
    const prevVal = gap > 0 ? seq[gap - 1]! : null;
    const nextVal = gap < len - 1 ? seq[gap + 1]! : null;
    const delta = back ? -step : step;
    return jq({
      prompt: 'What number is missing?',
      say: p.saySequence(cells, `Let's count ${dirWord} in ${stepWords}.`),
      scene: { kind: 'track', cells },
      input: { kind: 'pad', max: 1000 },
      answer: exactN(ans),
      answerDisplay: String(ans),
      hints: [`The numbers go ${back ? 'down' : 'up'} by ${step} each time.`, prevVal !== null ? `What is ${prevVal} ${back ? 'take away' : 'plus'} ${step}?` : `What is ${nextVal} ${back ? 'plus' : 'take away'} ${step}?`],
      solution: [`Each jump is ${back ? 'back ' : ''}${step}.`, prevVal !== null ? `${prevVal} ${back ? '−' : '+'} ${step} = ${ans}.` : `${nextVal} ${back ? '+' : '−'} ${step} = ${ans}.`],
      misconceptions: keepJ(
        [
          ...(step > 1 && prevVal !== null ? [miss('fp-count-step', prevVal + (back ? -1 : 1), `That counts in ones. These numbers jump by ${step}.`)] : []),
          ...(prevVal !== null ? [miss('fp-count-step', prevVal - delta, `That goes the wrong way. The numbers go ${back ? 'down' : 'up'}.`)] : []),
          miss('fp-count-step', ans + delta, `That is one jump too far.`),
        ],
        ans,
      ),
    });
  });

// ---------------------------------------------------------------------------
// Number symbols and names
// ---------------------------------------------------------------------------
type NumMode = 'hear' | 'name-to-numeral' | 'numeral-to-name';
const NUM_CFG: Record<FoundationGrade, { lo: number; hi: number; mode: NumMode }[]> = {
  1: [
    { lo: 1, hi: 10, mode: 'hear' },
    { lo: 11, hi: 20, mode: 'hear' },
    { lo: 21, hi: 100, mode: 'hear' },
    { lo: 1, hi: 10, mode: 'name-to-numeral' },
    { lo: 1, hi: 10, mode: 'numeral-to-name' },
  ],
  2: [
    { lo: 20, hi: 100, mode: 'hear' },
    { lo: 100, hi: 200, mode: 'hear' },
    { lo: 11, hi: 20, mode: 'name-to-numeral' },
    { lo: 20, hi: 100, mode: 'name-to-numeral' },
    { lo: 20, hi: 200, mode: 'numeral-to-name' },
  ],
  3: [
    { lo: 100, hi: 500, mode: 'hear' },
    { lo: 500, hi: 1000, mode: 'hear' },
    { lo: 20, hi: 100, mode: 'name-to-numeral' },
    { lo: 100, hi: 999, mode: 'name-to-numeral' },
    { lo: 100, hi: 999, mode: 'numeral-to-name' },
  ],
};

const numerals = (g: FoundationGrade) =>
  fpTemplate('numerals', g, (rng, level, ctx) => {
    const p = corePack(ctx);
    const cfg = NUM_CFG[g][level - 1]!;
    let n = rng.int(cfg.lo, cfg.hi);
    // Include a zero in the tens sometimes in Grade 3 (508 vs 58 vs 580): a classic confusion.
    if (g === 3 && level >= 4 && rng.chance(0.4)) n = Math.floor(n / 100) * 100 + (n % 10 || 7);
    const sw = digitSwap(n);
    const prefer = [...(sw !== null ? [sw] : []), ...(n >= 100 && n % 100 < 10 ? [Math.floor(n / 100) * 10 + (n % 10), n - (n % 100) + (n % 10) * 10] : [])];
    const others = nearNumbers(rng, n, 3, Math.max(0, cfg.lo - 10), cfg.hi + 10, prefer);
    const again = cfg.mode === 'hear' ? ` Listen again: ${n}.` : '';
    const feedbackFor = (v: number): { feedback: string; code: JOpt['code'] } =>
      v === sw ? { feedback: `That is ${v}. The digits are the other way round.${again}`, code: 'fp-digit-swap' } : Math.abs(v - n) === 1 ? { feedback: `That is ${v}, just next to ${n}.`, code: 'fp-miscount' } : { feedback: `That is ${v}.${again}`, code: 'fp-place-value' };

    if (cfg.mode === 'numeral-to-name') {
      return choiceJ(rng, {
        prompt: 'Which word says this number?',
        say: 'Which word says this number? Read the words.',
        scene: { kind: 'text', text: grp(n), size: 'sum' },
        correct: { id: 'c', text: p.numberWords(n) },
        distractors: others.map((v, i) => ({ id: `w${i}`, text: p.numberWords(v), ...feedbackFor(v) })),
        code: 'fp-place-value',
        hints: ['Read each word slowly.', n >= 100 ? 'Read the hundreds first, then the tens and ones.' : n >= 20 ? `The tens word comes first: ${p.numberWords(Math.floor(n / 10) * 10)}.` : 'Count up to the number on your fingers.'],
        solution: [`${grp(n)} is ${p.numberWords(n)}.`],
      });
    }
    const opts: JOpt[] = [{ id: 'c', text: grp(n) }, ...others.map((v, i) => ({ id: `w${i}`, text: grp(v), ...feedbackFor(v) }))];
    if (cfg.mode === 'name-to-numeral') {
      return choiceJ(rng, {
        prompt: 'Which number is this?',
        say: 'Read the word. Which number is it?',
        scene: { kind: 'text', text: p.numberWords(n), size: 'word' },
        correct: opts[0]!,
        distractors: opts.slice(1),
        code: 'fp-place-value',
        hints: ['Read the word slowly, part by part.', n > 20 ? 'The first part tells you the tens.' : 'Count on your fingers to check.'],
        solution: [`The word "${p.numberWords(n)}" means ${grp(n)}.`],
      });
    }
    return choiceJ(rng, {
      prompt: 'Tap the number you hear.',
      say: `Find the number ${n}.`,
      correct: opts[0]!,
      distractors: opts.slice(1),
      code: 'fp-place-value',
      hints: [`Listen again: ${n}.`, n >= 20 ? `${n} starts with ${n >= 100 ? `${Math.floor(n / 100)} hundred` : `${Math.floor(n / 10) * 10}`}.` : 'Count up on your fingers.'],
      solution: [n < 10 ? `${n} is written like this: ${n}.` : `${grp(n)} is written with ${[...String(n)].map((d) => `${aWord(d)}`).join(', then ')}.`],
    });
  });

// ---------------------------------------------------------------------------
// Compare and order numbers
// ---------------------------------------------------------------------------
const ORDER_MAX: Record<FoundationGrade, number> = { 1: 20, 2: 99, 3: 999 };

function orderQuestion(rng: Rng, hi: number, count: number, biggestFirst: boolean, lo = 0): GeneratedQuestion {
  const nums = new Set<number>();
  // Mix in a digit-swap pair where possible: 45 and 54.
  const a = rng.int(Math.max(lo, 10), hi);
  nums.add(a);
  const sw = digitSwap(a);
  if (sw !== null && sw <= hi && sw >= lo && rng.chance(0.6)) nums.add(sw);
  let guard = 0;
  while (nums.size < count && guard++ < 200) nums.add(rng.int(lo, hi));
  const sorted = [...nums].sort((x, y) => (biggestFirst ? y - x : x - y));
  let list = rng.shuffle([...nums]);
  // Never hand the child a list that is already in the answer order.
  while (list.every((v, i) => v === sorted[i])) list = rng.shuffle(list);
  const items = list.map((v) => tile(`n${v}`, grp(v)));
  return jq({
    prompt: biggestFirst ? 'Put them in order: biggest first.' : 'Put them in order: smallest first.',
    say: biggestFirst ? 'Put the numbers in order. Start with the biggest.' : 'Put the numbers in order. Start with the smallest.',
    input: { kind: 'order', items },
    answer: { kind: 'sequence', ids: sorted.map((v) => `n${v}`) },
    answerDisplay: sorted.map(grp).join(', '),
    hints: [hi > 20 ? 'Look at the tens first. More tens means a bigger number.' : 'Which number comes first when you count?', biggestFirst ? 'Find the biggest and tap it first.' : 'Find the smallest and tap it first.'],
    solution: [`From ${biggestFirst ? 'biggest to smallest' : 'smallest to biggest'}: ${sorted.map(grp).join(', ')}.`],
  });
}

const compare = (g: FoundationGrade) =>
  fpTemplate('compare', g, (rng, level, ctx) => {
    const p = corePack(ctx);
    const hi = ORDER_MAX[g];
    if (g === 1 && level === 1) {
      const [x, y] = rng.shuffle(ITEM_IDS).slice(0, 2) as [typeof ITEM_IDS[number], typeof ITEM_IDS[number]];
      const a = rng.int(2, 10);
      let b = rng.int(2, 10);
      while (Math.abs(a - b) < 2) b = rng.int(2, 10);
      const more = a > b ? x : y;
      const less = a > b ? y : x;
      const askMore = rng.chance(0.6);
      const ix = p.ITEMS[x];
      const iy = p.ITEMS[y];
      const correct = askMore ? more : less;
      const wrong = askMore ? less : more;
      return choiceJ(rng, {
        prompt: askMore ? 'Which has more?' : 'Which has fewer?',
        say: askMore ? `Are there more ${ix.many} or more ${iy.many}?` : `Are there fewer ${ix.many} or fewer ${iy.many}?`,
        scene: { kind: 'objects', icon: ix.icon, count: a, arrange: 'rows', second: { icon: iy.icon, count: b } },
        correct: { id: correct, text: p.ITEMS[correct].many, icon: p.ITEMS[correct].icon, say: p.ITEMS[correct].many },
        distractors: [{ id: wrong, text: p.ITEMS[wrong].many, icon: p.ITEMS[wrong].icon, say: p.ITEMS[wrong].many, feedback: askMore ? `There are fewer ${p.ITEMS[wrong].many}. Match them one to one and see which row has some left over.` : `There are more ${p.ITEMS[wrong].many}. Match them one to one.`, code: 'fp-more-less' }],
        code: 'fp-more-less',
        keepOrder: true,
        hints: ['Match them one to one.', askMore ? 'The row with some left over has more.' : 'The row that runs out first has fewer.'],
        solution: [`There are ${a} ${ix.many} and ${b} ${iy.many}.`, `There are ${askMore ? 'more' : 'fewer'} ${p.ITEMS[correct].many}.`],
        answerDisplay: p.ITEMS[correct].many,
      });
    }
    if (level <= 2) {
      const a = rng.int(g === 1 ? 1 : 10, hi);
      const sw = digitSwap(a);
      let b = sw !== null && sw !== a && rng.chance(0.5) ? sw : rng.int(g === 1 ? 1 : 10, hi);
      while (b === a) b = rng.int(1, hi);
      const askBig = g === 1 ? true : level === 1;
      const correct = askBig ? Math.max(a, b) : Math.min(a, b);
      const wrong = askBig ? Math.min(a, b) : Math.max(a, b);
      return choiceJ(rng, {
        prompt: askBig ? 'Which number is bigger?' : 'Which number is smaller?',
        say: askBig ? `Which number is bigger, ${a} or ${b}?` : `Which number is smaller, ${a} or ${b}?`,
        correct: { id: 'c', text: grp(correct) },
        distractors: [{ id: 'w', text: grp(wrong), feedback: `${wrong} is ${askBig ? 'smaller' : 'bigger'} than ${correct}.${hi > 20 ? ' Look at the tens first.' : ''}`, code: 'fp-more-less' }],
        code: 'fp-more-less',
        hints: [hi > 20 ? 'Compare the tens first. More tens is bigger.' : 'Which comes later when you count?', 'Picture them on a number line.'],
        solution: [`${grp(Math.max(a, b))} is bigger than ${grp(Math.min(a, b))}.`],
      });
    }
    if (level === 3) return orderQuestion(rng, hi, 3, false, g === 1 ? 0 : 10);
    if (level === 5) return orderQuestion(rng, hi, 4, true, g === 1 ? 0 : 10);
    // level 4
    if (g === 1) {
      const row = rng.shuffle(ITEM_IDS).slice(0, 7);
      const pos = rng.int(2, 7);
      const target = row[pos - 1]!;
      const others = rng.shuffle(row.filter((r) => r !== target)).slice(0, 2);
      const near = [row[pos - 2], row[pos]].filter((r): r is NonNullable<typeof r> => !!r && r !== target);
      const distract = [...new Set([...near, ...others])].slice(0, 3);
      return choiceJ(rng, {
        prompt: `Which one is ${p.ordinal(pos)}?`,
        say: `Start at the arrow. Which one is ${p.ordinal(pos)}?`,
        scene: { kind: 'iconrow', items: row.map((r) => p.ITEMS[r].icon) },
        correct: { id: target, text: p.ITEMS[target].one, icon: p.ITEMS[target].icon, say: p.ITEMS[target].one },
        distractors: distract.map((d) => ({ id: d, text: p.ITEMS[d].one, icon: p.ITEMS[d].icon, say: p.ITEMS[d].one, feedback: `That is ${p.ordinal(row.indexOf(d) + 1)}. Count from the arrow: first, second, third …`, code: 'fp-miscount' as const })),
        code: 'fp-miscount',
        hints: ['Start at the arrow.', `Touch each one and say: first, second, third … up to ${p.ordinal(pos)}.`],
        solution: [`Counting from the arrow, the ${p.ordinal(pos)} one is the ${p.ITEMS[target].one}.`],
        answerDisplay: p.ITEMS[target].one,
      });
    }
    // Grades 2 and 3: neighbours and one/ten/hundred more or less.
    const kinds = g === 2 ? ['between', 'more1', 'less1', 'more10', 'less10'] : ['more10', 'less10', 'more100', 'less100', 'between'];
    const kind = rng.pick(kinds);
    const n = rng.int(g === 2 ? 11 : 101, hi - (g === 2 ? 11 : 101));
    if (kind === 'between') {
      return jq({
        prompt: `What number comes between ${grp(n - 1)} and ${grp(n + 1)}?`,
        input: { kind: 'pad', max: 1000 },
        answer: exactN(n),
        answerDisplay: grp(n),
        hints: [`Count on from ${n - 1}.`, `${n - 1}, then …`],
        solution: [`${grp(n - 1)}, ${grp(n)}, ${grp(n + 1)}.`],
        misconceptions: keepJ([miss('fp-miscount', n + 2, `That comes after ${n + 1}.`)], n),
      });
    }
    const d = kind.endsWith('100') ? 100 : kind.endsWith('10') ? 10 : 1;
    const up = kind.startsWith('more');
    const ans = up ? n + d : n - d;
    return jq({
      prompt: `What is ${d} ${up ? 'more' : 'less'} than ${grp(n)}?`,
      input: { kind: 'pad', max: 1000 },
      answer: exactN(ans),
      answerDisplay: grp(ans),
      hints: [d === 1 ? `Count ${up ? 'on' : 'back'} one.` : `Only the ${d === 10 ? 'tens' : 'hundreds'} digit changes.`, `${up ? 'Add' : 'Take away'} ${d}.`],
      solution: [`${grp(n)} ${up ? '+' : '−'} ${d} = ${grp(ans)}.`],
      misconceptions: keepJ(
        [
          miss('fp-more-less', up ? n - d : n + d, `That is ${d} ${up ? 'less' : 'more'}. ${up ? 'More' : 'Less'} means ${up ? 'bigger' : 'smaller'}.`),
          ...(d > 1 ? [miss('fp-place-value', up ? n + 1 : n - 1, `That changes the ones. ${d} ${up ? 'more' : 'less'} changes the ${d === 10 ? 'tens' : 'hundreds'}.`)] : []),
        ],
        ans,
      ),
    });
  });

// ---------------------------------------------------------------------------
// Place value: tens and ones (and hundreds in Grade 3)
// ---------------------------------------------------------------------------
const PV_RANGE: Record<FoundationGrade, [number, number]> = { 1: [11, 20], 2: [21, 99], 3: [101, 999] };

const placeValue = (g: FoundationGrade) =>
  fpTemplate('place-value', g, (rng, level, ctx) => {
    const p = corePack(ctx);
    const [lo, hi] = PV_RANGE[g];
    let n = rng.int(lo, hi);
    if (n % 10 === 0 && level >= 3) n += rng.int(1, 9);
    if (n > hi) n = hi;
    const b = base10Of(n);
    const parts = [...(b.hundreds ? [b.hundreds * 100] : []), b.tens * 10, b.ones].filter((x, i, arr) => x > 0 || i === arr.length - 1);
    const expanded = parts.join(' + ');

    if (level === 1) {
      return jq({
        prompt: `Make ${grp(n)}.`,
        say: `Make ${n} with ${g === 3 ? 'hundreds, tens and ones' : 'tens and ones'}.`,
        input: { kind: 'build', tool: 'base10', max: g === 3 ? 999 : g === 2 ? 99 : 20 },
        answer: exactN(n),
        answerDisplay: grp(n),
        hints: [g === 3 ? 'How many hundreds? How many tens? How many ones?' : 'How many tens? How many ones?', `${grp(n)} is ${expanded}.`],
        solution: [`${grp(n)} = ${expanded}.`, `That is ${p.placeWords(b, g === 3)}.`],
        misconceptions: keepJ([miss('fp-digit-swap', b.hundreds * 100 + b.ones * 10 + b.tens, `That swaps the tens and the ones. ${grp(n)} has ${p.nOf(b.tens, 'ten', 'tens')}.`)], n),
      });
    }
    if (level === 2) {
      return jq({
        prompt: 'What number is this?',
        say: 'What number do the blocks make?',
        scene: b,
        input: { kind: 'pad', max: 1000 },
        answer: exactN(n),
        answerDisplay: grp(n),
        hints: ['A long rod is 10. A small cube is 1.' + (b.hundreds ? ' A flat is 100.' : ''), 'Count the tens, then count on the ones.'],
        solution: [`${expanded} = ${grp(n)}.`],
        misconceptions: keepJ(
          [miss('fp-place-value', b.hundreds + b.tens + b.ones, 'You counted every block as 1. A rod is worth 10.'), miss('fp-digit-swap', b.hundreds * 100 + b.ones * 10 + b.tens, 'That swaps the tens and the ones.')],
          n,
        ),
      });
    }
    if (level === 3) {
      const askHundreds = g === 3 && rng.chance(0.4);
      const ans = askHundreds ? b.hundreds : b.tens;
      const unit = askHundreds ? 'hundreds' : 'tens';
      return jq({
        prompt: `How many ${unit} are in ${grp(n)}?`,
        input: { kind: 'pad', max: 1000 },
        answer: exactN(ans),
        answerDisplay: String(ans),
        hints: [`Break ${grp(n)} into ${g === 3 ? 'hundreds, tens and ones' : 'tens and ones'}.`, `${grp(n)} = ${expanded}.`],
        solution: [`${grp(n)} = ${expanded}.`, `There ${ans === 1 ? 'is' : 'are'} ${ans} ${ans === 1 ? unit.slice(0, -1) : unit}.`],
        misconceptions: keepJ([miss('fp-place-value', b.ones, `${b.ones} is the number of ones.`), miss('fp-place-value', askHundreds ? b.hundreds * 100 : b.tens * 10, `${askHundreds ? b.hundreds * 100 : b.tens * 10} is what the ${unit} are worth. How many ${unit} is that?`)], ans),
      });
    }
    if (level === 4) {
      // "67 = 60 + ?" or "? + 7"
      const hideOnes = rng.chance(0.5);
      const tensPart = n - b.ones;
      const ans = hideOnes ? b.ones : tensPart;
      return jq({
        prompt: hideOnes ? `${grp(n)} = ${grp(tensPart)} + ?` : `${grp(n)} = ? + ${b.ones}`,
        say: hideOnes ? `What do you add to ${tensPart} to make ${n}?` : `What number and ${b.ones} make ${n}?`,
        input: { kind: 'pad', max: 1000 },
        answer: exactN(ans),
        answerDisplay: grp(ans),
        hints: [`Break ${grp(n)} into parts.`, `${grp(n)} = ${expanded}.`],
        solution: [`${grp(n)} = ${grp(tensPart)} + ${b.ones}.`],
        misconceptions: keepJ([miss('fp-place-value', hideOnes ? b.ones * 10 : b.tens, hideOnes ? 'The ones digit is worth just its own value.' : `The tens are worth ${b.tens * 10}, not ${b.tens}.`)], ans),
      });
    }
    // level 5: value of a digit
    const which = g === 3 ? rng.pick(['hundreds', 'tens'] as const) : 'tens';
    const digit = which === 'hundreds' ? b.hundreds : b.tens;
    const value = which === 'hundreds' ? digit * 100 : digit * 10;
    if (digit === 0)
      return jq({
        prompt: `What is ${grp(n)} + 10?`,
        input: { kind: 'pad', max: 1000 },
        answer: exactN(n + 10),
        answerDisplay: grp(n + 10),
        hints: ['Only the tens change.', `Add one more ten.`],
        solution: [`${grp(n)} + 10 = ${grp(n + 10)}.`],
        misconceptions: keepJ([miss('fp-place-value', n + 1, 'That adds 1. Ten more changes the tens.')], n + 10),
      });
    return jq({
      prompt: `What is the ${digit} in ${grp(n)} worth?`,
      say: `In ${n}, what is the digit ${digit} worth?`,
      input: { kind: 'pad', max: 1000 },
      answer: exactN(value),
      answerDisplay: grp(value),
      hints: [`Is the ${digit} in the ones, tens${g === 3 ? ' or hundreds' : ''} place?`, `${grp(n)} = ${expanded}.`],
      solution: [`The ${digit} is in the ${which} place.`, `It is worth ${grp(value)}.`],
      misconceptions: keepJ([miss('fp-place-value', digit, `${digit} is the digit. In the ${which} place it is worth ${grp(value)}.`), miss('fp-place-value', which === 'hundreds' ? digit * 10 : digit * 100, `That is the wrong place. The ${digit} is in the ${which} place.`)], value),
    });
  });

const G = [1, 2, 3] as const;
export const MATHS_NUMBER_TEMPLATES: QuestionTemplate[] = G.flatMap((g) => [countObjects(g), counting(g), numerals(g), compare(g), placeValue(g)]);
