/**
 * Foundation Phase Mathematics: calculating. Add and subtract (to 20 / 99 / 999), number bonds, story sums,
 * groups and sharing (repeated addition → × and ÷ by 2, 3, 4, 5, 10), fractions and money.
 */
import type { QuestionTemplate, GeneratedQuestion } from '../../questions/types.ts';
import type { Rng } from '../../questions/rng.ts';
import type { FoundationGrade } from '../../curriculum/foundation.ts';
import { jq, exactN, miss, keepJ, choiceJ, corePack, sayOp, showOp, type CorePack, type JOpt } from '../kit.ts';
import { ITEM_IDS, type ItemId } from '../packs/en/core.ts';
import { fpTemplate, grp } from './maths-number.ts';

const sumText = (a: number, op: '+' | '-' | '×' | '÷', b: number, ans: number | '?') => `${grp(a)} ${showOp(op)} ${grp(b)} = ${ans === '?' ? '?' : grp(ans)}`;
const sumSay = (a: number, op: '+' | '-' | '×' | '÷', b: number) => `What is ${a} ${sayOp(op)} ${b}?`;

/** Column-wise "smaller from bigger" subtraction: the classic no-exchange error (62 − 27 → 45). */
function noExchange(a: number, b: number): number {
  let out = 0;
  let place = 1;
  while (a > 0 || b > 0) {
    out += Math.abs((a % 10) - (b % 10)) * place;
    a = Math.floor(a / 10);
    b = Math.floor(b / 10);
    place *= 10;
  }
  return out;
}
/** Addition without carrying (47 + 28 → 65). */
function noCarry(a: number, b: number): number {
  let out = 0;
  let place = 1;
  while (a > 0 || b > 0) {
    out += ((a % 10) + (b % 10)) % 10 * place;
    a = Math.floor(a / 10);
    b = Math.floor(b / 10);
    place *= 10;
  }
  return out;
}
const carries = (a: number, b: number) => noCarry(a, b) !== a + b;
const exchanges = (a: number, b: number) => noExchange(a, b) !== a - b;

// ---------------------------------------------------------------------------
// Add and subtract
// ---------------------------------------------------------------------------
type Pair = { a: number; b: number; op: '+' | '-' };

function pickPair(rng: Rng, g: FoundationGrade, level: number): Pair {
  const add = (lo: number, hi: number, maxSum: number, carry?: boolean): Pair => {
    for (let i = 0; i < 300; i++) {
      const a = rng.int(lo, hi);
      const b = rng.int(lo, hi);
      if (a + b > maxSum) continue;
      if (carry !== undefined && carries(a, b) !== carry) continue;
      return { a, b, op: '+' };
    }
    return { a: lo, b: lo, op: '+' };
  };
  const sub = (lo: number, hi: number, exchange?: boolean, minB = 1): Pair => {
    for (let i = 0; i < 300; i++) {
      const a = rng.int(lo, hi);
      const b = rng.int(minB, a - 1);
      if (b < minB) continue;
      if (exchange !== undefined && exchanges(a, b) !== exchange) continue;
      return { a, b, op: '-' };
    }
    return { a: hi, b: minB, op: '-' };
  };
  if (g === 1) {
    if (level === 1) return add(1, 6, 10);
    if (level === 2) return sub(3, 10);
    if (level === 3) return add(3, 12, 20);
    if (level === 4) return sub(11, 20);
    return rng.chance(0.5) ? add(6, 12, 20, true) : sub(11, 20, true, 2);
  }
  if (g === 2) {
    if (level === 1) return rng.chance(0.5) ? { a: rng.int(2, 8) * 10 + rng.int(1, 5), b: rng.int(1, 4), op: '+' } : { a: rng.int(2, 9) * 10 + rng.int(5, 9), b: rng.int(1, 5), op: '-' };
    if (level === 2) return add(11, 60, 99, false);
    if (level === 3) return sub(30, 99, false, 11);
    if (level === 4) return add(15, 70, 99, true);
    return sub(31, 99, true, 12);
  }
  if (level === 1) return add(101, 880, 999, false);
  if (level === 2) {
    const p = add(110, 600, 999, false);
    return p.b < 100 ? { ...p, b: p.b + 100 } : p;
  }
  if (level === 3) return add(105, 700, 999, true);
  if (level === 4) return sub(200, 999, true, 101);
  return rng.chance(0.5) ? add(150, 800, 999, true) : sub(300, 999, true, 120);
}

const addSub = (g: FoundationGrade) =>
  fpTemplate('add-sub', g, (rng, level, ctx) => {
    const p = corePack(ctx);
    const { a, b, op } = pickPair(rng, g, level);
    const ans = op === '+' ? a + b : a - b;
    const id = rng.pick(ITEM_IDS);
    // Grade 1 levels 1–2 show the sum with pictures so the child can count.
    const scene = g === 1 && level <= 2 ? (op === '+' ? { kind: 'objects' as const, icon: p.ITEMS[id].icon, count: a, arrange: 'rows' as const, second: { icon: p.ITEMS[id].icon, count: b } } : { kind: 'objects' as const, icon: p.ITEMS[id].icon, count: a, arrange: 'rows' as const, crossed: b }) : { kind: 'text' as const, text: sumText(a, op, b, '?'), size: 'sum' as const };
    const ms = [
      miss('fp-operation', op === '+' ? Math.abs(a - b) : a + b, op === '+' ? 'You took away. The sign says add.' : 'You added. The sign says take away.'),
      miss('fp-miscount', ans + 1, op === '+' ? `Nearly. When you count on from ${a}, start with the next number.` : 'Nearly. Count back carefully.'),
      miss('fp-miscount', ans - 1, 'Nearly. Count again carefully.'),
    ];
    if (op === '+' && carries(a, b)) ms.push(miss('fp-regroup', noCarry(a, b), 'The ones made more than ten. Carry the ten to the tens.'));
    if (op === '-' && exchanges(a, b)) ms.push(miss('fp-regroup', noExchange(a, b), 'You took the smaller digit from the bigger one. Exchange a ten for ten ones first.'));
    const hints =
      g === 1
        ? op === '+'
          ? [`Start at ${a} and count on ${b}.`, a + b > 10 ? `Make 10 first: ${a} + ${10 - a} = 10, then add the rest.` : 'Use your fingers or the pictures.']
          : [`Start at ${a} and count back ${b}.`, 'Or count up from the small number to the big one.']
        : op === '+'
          ? ['Add the ones, then the tens' + (g === 3 ? ', then the hundreds.' : '.'), 'If the ones make 10 or more, carry a ten.']
          : ['Take away the ones, then the tens' + (g === 3 ? ', then the hundreds.' : '.'), 'If there are not enough ones, exchange a ten for ten ones.'];
    const solution =
      g === 1
        ? [op === '+' ? `${a} and ${b} more is ${ans}.` : `${a} take away ${b} leaves ${ans}.`, sumText(a, op, b, ans)]
        : [sumText(a, op, b, ans)];
    return jq({
      prompt: g === 1 && level <= 2 ? sumText(a, op, b, '?') : 'Work it out.',
      say: sumSay(a, op, b),
      scene,
      input: { kind: 'pad', max: 1000 },
      answer: exactN(ans),
      answerDisplay: grp(ans),
      hints,
      solution,
      misconceptions: keepJ(ms, ans),
    });
  });

// ---------------------------------------------------------------------------
// Number bonds and mental maths
// ---------------------------------------------------------------------------
const bonds = (g: FoundationGrade) =>
  fpTemplate('bonds', g, (rng, level) => {
    type B = { known: number; target: number; frame?: boolean; tens?: boolean };
    let q: B;
    const r = rng;
    if (g === 1) q = level === 1 ? { known: r.int(1, 4), target: 5, frame: true } : level === 2 ? { known: r.int(1, 9), target: 10, frame: true } : level === 3 ? { known: r.int(1, 9), target: 10 } : level === 4 ? { known: r.int(11, 19), target: 20 } : { known: 0, target: 0 };
    else if (g === 2) q = level === 1 ? { known: r.int(1, 9), target: 10 } : level === 2 ? { known: r.int(11, 19), target: 20 } : level === 3 ? { known: r.int(1, 9) * 10, target: 100, tens: true } : level === 4 ? { known: 0, target: 0 } : { known: r.int(11, 19), target: 20 };
    else q = level === 1 ? { known: r.int(11, 19), target: 20 } : level === 2 ? { known: r.int(21, 29), target: 30 } : level === 3 ? { known: r.int(1, 9) * 10, target: 100, tens: true } : level === 4 ? { known: r.int(1, 9) * 100, target: 1000, tens: true } : { known: r.int(51, 95), target: 100 };

    // Doubles and near doubles (Grade 1 level 5).
    if (g === 1 && level === 5) {
      const d = r.int(3, 9);
      const near = r.chance(0.5);
      const ans = d + d + (near ? 1 : 0);
      return jq({
        prompt: sumText(d, '+', d + (near ? 1 : 0), '?'),
        say: sumSay(d, '+', d + (near ? 1 : 0)),
        input: { kind: 'pad', max: 1000 },
        answer: exactN(ans),
        answerDisplay: String(ans),
        hints: near ? [`${d} + ${d + 1} is one more than ${d} + ${d}.`, `${d} + ${d} = ${d * 2}.`] : ['A double: the same number twice.', `Count on ${d} from ${d}.`],
        solution: near ? [`${d} + ${d} = ${d * 2}.`, `One more makes ${ans}.`] : [`${d} + ${d} = ${ans}.`],
        misconceptions: keepJ([miss('fp-miscount', ans - 1, 'Nearly. Check with your fingers.'), miss('fp-miscount', ans + 1, 'Nearly. Check with your fingers.')], ans),
      });
    }
    // Add or subtract multiples of ten (Grade 2 level 4).
    if (g === 2 && level === 4) {
      const a = r.int(3, 9) * 10;
      const b = r.int(1, a / 10 - 1) * 10;
      const add = a + b <= 100 && r.chance(0.5);
      const ans = add ? a + b : a - b;
      return jq({
        prompt: sumText(a, add ? '+' : '-', b, '?'),
        say: sumSay(a, add ? '+' : '-', b),
        input: { kind: 'pad', max: 1000 },
        answer: exactN(ans),
        answerDisplay: String(ans),
        hints: [`Think in tens: ${a / 10} tens ${add ? 'and' : 'take away'} ${b / 10} tens.`, `${a / 10} ${add ? '+' : '−'} ${b / 10} = ${add ? a / 10 + b / 10 : a / 10 - b / 10}.`],
        solution: [`${a / 10} tens ${add ? '+' : '−'} ${b / 10} tens = ${ans / 10} tens = ${ans}.`],
        misconceptions: keepJ([miss('fp-place-value', ans / 10, `That is ${ans / 10} ones. It is ${ans / 10} tens.`), miss('fp-operation', add ? a - b : a + b, add ? 'You took away. The sign says add.' : 'You added. The sign says take away.')], ans),
      });
    }
    // Take away from 20 (Grade 2 level 5).
    if (g === 2 && level === 5) {
      const ans = 20 - q.known;
      return jq({
        prompt: sumText(20, '-', q.known, '?'),
        say: sumSay(20, '-', q.known),
        input: { kind: 'pad', max: 1000 },
        answer: exactN(ans),
        answerDisplay: String(ans),
        hints: [`Count up from ${q.known} to 20.`, `${q.known} + ? = 20.`],
        solution: [`${q.known} + ${ans} = 20, so 20 − ${q.known} = ${ans}.`],
        misconceptions: keepJ([miss('fp-operation', 20 + q.known, 'You added. Take away makes it smaller.'), miss('fp-miscount', ans + 1, 'Nearly. Count up again.'), miss('fp-miscount', ans - 1, 'Nearly. Count up again.')], ans),
      });
    }
    const ans = q.target - q.known;
    const body = q.frame
      ? {
          prompt: `How many more make ${q.target}?`,
          say: `There ${q.known === 1 ? 'is 1' : `are ${q.known}`}. How many more to make ${q.target}?`,
          scene: { kind: 'objects' as const, icon: '●', count: q.known, arrange: q.target === 5 ? ('rows' as const) : ('tenframes' as const) },
        }
      : { prompt: `${grp(q.known)} + ? = ${grp(q.target)}`, say: `${q.known} plus what makes ${q.target}?` };
    return jq({
      ...body,
      input: { kind: 'pad', max: 1000 },
      answer: exactN(ans),
      answerDisplay: grp(ans),
      hints: q.tens ? [`Think in ${q.target === 1000 ? 'hundreds' : 'tens'}.`, `${q.known / (q.target === 1000 ? 100 : 10)} and what make ${q.target === 1000 ? '10 hundreds' : '10 tens'}?`] : q.frame ? ['Count the empty spaces.', `Count on from ${q.known} to ${q.target}.`] : [`Count on from ${q.known} to ${q.target}.`, q.target === 20 ? `First get to 10${q.known > 10 ? '' : ''}: what makes ${q.known % 10} up to 10?` : 'Use what you know about 10.'],
      solution: [`${grp(q.known)} + ${grp(ans)} = ${grp(q.target)}.`],
      misconceptions: keepJ(
        [
          miss('fp-operation', q.target + q.known, `That adds them. We need what goes with ${q.known} to make ${q.target}.`),
          miss('fp-miscount', ans + 1, `Nearly. ${q.known} + ${ans + 1} is ${q.known + ans + 1}.`),
          miss('fp-miscount', ans - 1, `Nearly. ${q.known} + ${ans - 1} is ${q.known + ans - 1}.`),
        ],
        ans,
      ),
    });
  });

// ---------------------------------------------------------------------------
// Story sums
// ---------------------------------------------------------------------------
type StoryKind = 'join' | 'separate' | 'compare' | 'missing' | 'share' | 'two-step';
const STORY_KINDS: Record<FoundationGrade, StoryKind[][]> = {
  1: [['join'], ['separate'], ['join', 'separate'], ['compare'], ['missing', 'share']],
  2: [['join', 'separate'], ['join', 'separate'], ['compare'], ['missing'], ['share', 'compare']],
  3: [['join', 'separate'], ['compare'], ['missing'], ['share'], ['two-step']],
};
const STORY_MAX: Record<FoundationGrade, number> = { 1: 20, 2: 99, 3: 999 };

function story(p: CorePack, rng: Rng, g: FoundationGrade, kind: StoryKind): GeneratedQuestion {
  const [n1, n2] = rng.shuffle(p.NAMES).slice(0, 2) as [string, string];
  const id: ItemId = rng.pick(ITEM_IDS);
  const it = p.ITEMS[id];
  const q = (n: number) => `${n} ${n === 1 ? it.one : it.many}`;
  const max = STORY_MAX[g];
  const lo = g === 1 ? 2 : g === 2 ? 11 : 101;
  const pic = { kind: 'picture' as const, icon: it.icon };
  const mk = (text: string, ans: number, wrongOp: number, hint: string[], sol: string[]) =>
    jq({
      prompt: text,
      scene: pic,
      input: { kind: 'pad', max: 1000 },
      answer: exactN(ans),
      answerDisplay: grp(ans),
      hints: hint,
      solution: sol,
      misconceptions: keepJ([miss('fp-operation', wrongOp, 'Think about the story again: does the number get bigger or smaller?'), miss('fp-miscount', ans + 1, 'Nearly. Check your counting.'), miss('fp-miscount', ans - 1, 'Nearly. Check your counting.')], ans),
    });
  if (kind === 'join') {
    const total = rng.int(lo + 2, max);
    const a = rng.int(Math.max(1, Math.floor(total / 4)), total - 1);
    const b = total - a;
    return mk(`${n1} has ${q(a)}. ${n2} gives ${n1} ${b} more. How many ${it.many} does ${n1} have now?`, total, Math.abs(a - b), ['Does it get more or less?', `Start at ${a} and add ${b}.`], [`${a} + ${b} = ${total}.`, `${n1} has ${q(total)}.`]);
  }
  if (kind === 'separate') {
    const a = rng.int(lo + 2, max);
    const b = rng.int(1, a - 1);
    const verb = rng.pick(['gives away', 'loses', 'shares out']);
    return mk(`${n1} has ${q(a)}. ${n1} ${verb} ${b}. How many ${it.many} are left?`, a - b, a + b, ['Are there more or fewer at the end?', `Start at ${a} and take away ${b}.`], [`${a} − ${b} = ${a - b}.`, `There ${a - b === 1 ? 'is' : 'are'} ${a - b} left.`]);
  }
  if (kind === 'compare') {
    const a = rng.int(lo + 2, max);
    const b = rng.int(Math.max(1, Math.floor(a / 3)), a - 1);
    return mk(`${n1} has ${q(a)}. ${n2} has ${q(b)}. How many more does ${n1} have?`, a - b, a + b, ['Line them up and see how many are left over.', `Count up from ${b} to ${a}.`], [`${a} − ${b} = ${a - b}.`, `${n1} has ${a - b} more.`]);
  }
  if (kind === 'missing') {
    const total = rng.int(lo + 3, max);
    const a = rng.int(1, total - 1);
    return mk(`${n1} had ${q(a)}. Now ${n1} has ${total}. How many more did ${n1} get?`, total - a, total + a, ['How far is it from the first number to the second?', `${a} + ? = ${total}.`], [`${a} + ${total - a} = ${total}.`, `${n1} got ${total - a} more.`]);
  }
  if (kind === 'share') {
    const people = g === 1 ? rng.int(2, 4) : g === 2 ? rng.int(2, 5) : rng.pick([2, 3, 4, 5, 10]);
    const each = g === 1 ? rng.int(2, Math.floor(20 / people)) : g === 2 ? rng.int(2, Math.floor(50 / people)) : rng.int(2, Math.floor(100 / people));
    const total = people * each;
    return mk(`${n1} shares ${q(total)} equally between ${people} friends. How many ${it.many} does each friend get?`, each, total - people, ['Give one to each friend, then another, until they are all gone.', `${people} groups. How many in each?`], [`${total} shared between ${people} is ${each} each.`, `Check: ${people} × ${each} = ${total}.`]);
  }
  // two-step (Grade 3)
  const a = rng.int(120, 600);
  const b = rng.int(50, 300);
  const c = rng.int(20, Math.min(a + b - 10, 300));
  const ans = a + b - c;
  return mk(`A farm has ${q(a)}. The farmer buys ${b} more, then sells ${c}. How many ${it.many} are on the farm now?`, ans, a + b + c, ['Do it in two steps.', `First ${a} + ${b}, then take away ${c}.`], [`${a} + ${b} = ${a + b}.`, `${a + b} − ${c} = ${ans}.`]);
}

const wordProblems = (g: FoundationGrade) =>
  fpTemplate('word-problems', g, (rng, level, ctx) => {
    const q = story(corePack(ctx), rng, g, rng.pick(STORY_KINDS[g][level - 1]!));
    return { ...q, say: q.prompt };
  });

// ---------------------------------------------------------------------------
// Groups and sharing → multiplication and division
// ---------------------------------------------------------------------------
const groups = (g: FoundationGrade) =>
  fpTemplate('groups', g, (rng, level, ctx) => {
    const p = corePack(ctx);
    const id = rng.pick(ITEM_IDS);
    const it = p.ITEMS[id];
    const groupsOf = (n: number, size: number, show: boolean) => {
      const ans = n * size;
      const addition = Array.from({ length: n }, () => size).join(' + ');
      return jq({
        prompt: show ? `${n} groups of ${size}. How many ${it.many}?` : g === 1 ? `${addition} = ?` : `${n} × ${size} = ?`,
        say: show ? `There are ${n} groups. Each group has ${size} ${it.many}. How many ${it.many} altogether?` : g === 1 ? `What is ${addition.replace(/\+/g, 'plus')}?` : `What is ${n} times ${size}?`,
        ...(show ? { scene: { kind: 'objects' as const, icon: it.icon, count: ans, arrange: 'groups' as const, groupSize: size } } : {}),
        input: { kind: 'pad', max: 1000 },
        answer: exactN(ans),
        answerDisplay: String(ans),
        hints: [`Count in ${size}s, ${n} times.`, `${Array.from({ length: Math.min(n, 3) }, (_, i) => (i + 1) * size).join(', ')}${n > 3 ? ' …' : ''}`],
        solution: [`${addition} = ${ans}.`, ...(g > 1 ? [`${n} × ${size} = ${ans}.`] : [])],
        misconceptions: keepJ([miss('fp-operation', n + size, `That adds ${n} and ${size}. There are ${n} groups of ${size}.`), miss('fp-count-step', (n + 1) * size, 'That is one group too many.'), miss('fp-count-step', (n - 1) * size, 'That is one group too few.')], ans),
      });
    };
    const share = (total: number, people: number, remainder: boolean, asDivision: boolean) => {
      const each = Math.floor(total / people);
      const left = total % people;
      const ask = remainder ? 'left' : 'each';
      const ans = remainder ? left : each;
      return jq({
        prompt: asDivision ? `${total} ÷ ${people} = ?` : remainder ? `Share ${total} ${it.many} equally between ${people} children. How many are left over?` : `Share ${total} ${it.many} equally between ${people} children. How many does each child get?`,
        say: asDivision ? `What is ${total} divided by ${people}?` : remainder ? `Share ${total} ${it.many} equally between ${people} children. How many ${it.many} are left over?` : `Share ${total} ${it.many} equally between ${people} children. How many does each child get?`,
        ...(!asDivision && total <= 30 ? { scene: { kind: 'objects' as const, icon: it.icon, count: total, arrange: 'scatter' as const } } : {}),
        input: { kind: 'pad', max: 1000 },
        answer: exactN(ans),
        answerDisplay: String(ans),
        hints: ['Give one to each, then another to each, until you cannot share any more.', `${people} × ? is close to ${total}.`],
        solution: remainder ? [`Each child gets ${each}: ${people} × ${each} = ${people * each}.`, `${total} − ${people * each} = ${left} left over.`] : [`${total} shared between ${people} is ${each} each.`, `Check: ${people} × ${each} = ${total}.`],
        misconceptions: keepJ(remainder ? [miss('fp-operation', each, `${each} is how many each child gets. How many are left over?`)] : [miss('fp-operation', total - people, 'That takes away. Sharing means splitting into equal groups.'), miss('fp-count-step', each + 1, `Check: ${people} × ${each + 1} = ${people * (each + 1)}, too many.`)], ans),
      });
    };
    if (g === 1) {
      if (level === 1) return groupsOf(rng.int(2, 4), rng.int(2, 5), true);
      if (level === 2) {
        const people = rng.int(2, 4);
        return share(people * rng.int(2, Math.floor(20 / people)), people, false, false);
      }
      if (level === 3) {
        const size = rng.pick([2, 5, 10]);
        const n = rng.int(2, Math.floor(20 / size));
        const total = n * size;
        return jq({
          prompt: `How many groups of ${size} can you make from ${total} ${it.many}?`,
          say: `Make groups of ${size}. How many groups of ${size} can you make from ${total} ${it.many}?`,
          scene: { kind: 'objects', icon: it.icon, count: total, arrange: 'rows' },
          input: { kind: 'pad', max: 1000 },
          answer: exactN(n),
          answerDisplay: String(n),
          hints: [`Count in ${size}s until you reach ${total}.`, `How many jumps of ${size}?`],
          solution: [`${Array.from({ length: n }, (_, i) => (i + 1) * size).join(', ')}: that is ${n} groups.`],
          misconceptions: keepJ([miss('fp-operation', total - size, 'That takes away. Count how many groups.'), miss('fp-count-step', n + 1, 'Count the jumps again.')], n),
        });
      }
      if (level === 4) return groupsOf(rng.int(3, 5), rng.int(2, 4), false);
      const people = rng.int(2, 5);
      let total = rng.int(people + 1, 20);
      if (total % people === 0) total += 1;
      return share(Math.min(total, 20), people, (Math.min(total, 20) % people) !== 0, false);
    }
    if (g === 2) {
      const tables = level === 1 ? [2, 5] : level === 2 ? [3, 4] : [2, 3, 4, 5];
      if (level <= 3) return groupsOf(rng.int(1, 10), rng.pick(tables), level === 1);
      const people = rng.int(2, 5);
      if (level === 4) return share(people * rng.int(2, Math.floor(50 / people)), people, false, false);
      let total = rng.int(people * 2, 50);
      if (total % people === 0) total -= 1;
      return share(total, people, true, false);
    }
    const tables = level === 1 ? [2, 5, 10] : level === 2 ? [3, 4] : level === 3 ? [2, 5, 10] : [3, 4, 5];
    if (level <= 2) return groupsOf(rng.int(1, 10), rng.pick(tables), false);
    const d = rng.pick(tables);
    if (level <= 4) return share(d * rng.int(1, 10), d, false, true);
    const people = rng.pick([3, 4, 5, 10]);
    let total = rng.int(people * 2, 100);
    if (total % people === 0) total -= 1;
    return share(total, people, true, false);
  });

// ---------------------------------------------------------------------------
// Fractions (CAPS: written as "1 half", "3 quarters" in the Foundation Phase)
// ---------------------------------------------------------------------------
const FRAC_NAME: Record<number, [string, string]> = { 2: ['half', 'halves'], 3: ['third', 'thirds'], 4: ['quarter', 'quarters'], 5: ['fifth', 'fifths'], 6: ['sixth', 'sixths'], 8: ['eighth', 'eighths'] };
const fracWords = (n: number, d: number) => `${n} ${n === 1 ? FRAC_NAME[d]![0] : FRAC_NAME[d]![1]}`;
const fracIcon = (shape: string, d: number, n: number, equal = true) => `frac:${shape}:${d}:${n}:${equal ? 'eq' : 'uneq'}`;

const fractions = (g: FoundationGrade) =>
  fpTemplate('fractions', g, (rng, level, ctx) => {
    const p = corePack(ctx);
    const dens = g === 1 ? [2, 3, 4, 5] : [2, 3, 4, 5, 6, 8];
    const shape = rng.pick(['circle', 'rect', 'bar'] as const);
    const nameShaded = (d: number, n: number) => {
      const others = dens.filter((x) => x !== d);
      const wrongDen = rng.shuffle(others).slice(0, 2);
      const opts: JOpt[] = [
        { id: 'c', text: fracWords(n, d) },
        ...wrongDen.map((x, i) => ({ id: `d${i}`, text: fracWords(n, x), feedback: `Count the equal parts: there are ${d}, so each part is 1 ${FRAC_NAME[d]![0]}.`, code: 'fp-unequal-parts' as const })),
        ...(n !== d - n && d - n > 0 ? [{ id: 'u', text: fracWords(d - n, d), feedback: `That is the part that is not coloured. Count the coloured parts.`, code: 'fp-miscount' as const }] : []),
      ];
      return choiceJ(rng, {
        prompt: 'What part is coloured?',
        say: 'What part of the shape is coloured in?',
        scene: { kind: 'fraction', shape, parts: d, shaded: n, equal: true },
        correct: opts[0]!,
        distractors: opts.slice(1),
        code: 'fp-unequal-parts',
        hints: ['Count all the equal parts.', 'Then count the coloured parts.'],
        solution: [`There are ${d} equal parts and ${n} ${n === 1 ? 'is' : 'are'} coloured.`, `That is ${fracWords(n, d)}.`],
      });
    };
    const ofCollection = (n: number, d: number, maxTotal: number) => {
      const each = rng.int(1, Math.max(1, Math.floor(maxTotal / d)));
      const total = each * d;
      const id = rng.pick(ITEM_IDS);
      const it = p.ITEMS[id];
      const ans = each * n;
      return jq({
        prompt: `What is ${fracWords(n, d)} of ${total} ${it.many}?`,
        say: `What is ${fracWords(n, d)} of ${total} ${it.many}?`,
        ...(total <= 24 ? { scene: { kind: 'objects' as const, icon: it.icon, count: total, arrange: 'groups' as const, groupSize: each } } : {}),
        input: { kind: 'pad', max: 1000 },
        answer: exactN(ans),
        answerDisplay: String(ans),
        hints: [`Share ${total} into ${d} equal groups.`, n > 1 ? `Each group has ${each}. Take ${n} groups.` : `How many in one group?`],
        solution: [`${total} shared into ${d} equal groups is ${each} each.`, n > 1 ? `${n} groups is ${ans}.` : `So 1 ${FRAC_NAME[d]![0]} of ${total} is ${ans}.`],
        misconceptions: keepJ([miss('fp-operation', total - d, `That takes away ${d}. Share into ${d} equal groups instead.`), ...(n > 1 ? [miss('fp-count-step', each, `That is 1 ${FRAC_NAME[d]![0]}. We need ${fracWords(n, d)}.`)] : []), miss('fp-operation', d, `${d} is the number of groups. How many are in each?`)], ans),
      });
    };
    const equalParts = () => {
      const d = rng.pick(dens);
      return choiceJ(rng, {
        prompt: `Which one is cut into ${FRAC_NAME[d]![1]}?`,
        say: `Which shape is cut into ${FRAC_NAME[d]![1]}? The parts must be equal.`,
        // Pictures only: a label saying "equal" would give the answer away.
        correct: { id: 'eq', text: '', icon: fracIcon(shape === 'bar' ? 'rect' : shape, d, 0, true), say: 'this one' },
        distractors: [{ id: 'uneq', text: '', icon: fracIcon(shape === 'bar' ? 'rect' : shape, d, 0, false), say: 'this one', feedback: `Those parts are not the same size. ${FRAC_NAME[d]![1].replace(/^./, (c) => c.toUpperCase())} must be equal.`, code: 'fp-unequal-parts' }],
        code: 'fp-unequal-parts',
        hints: ['Look at the size of each part.', 'All the parts must be the same size.'],
        solution: [`${FRAC_NAME[d]![1].replace(/^./, (c) => c.toUpperCase())} are ${d} equal parts.`],
        answerDisplay: `${d} equal parts`,
      });
    };
    const compareUnit = () => {
      const [a, b] = rng.shuffle(dens).slice(0, 2) as [number, number];
      const bigger = Math.min(a, b);
      const smaller = Math.max(a, b);
      return choiceJ(rng, {
        prompt: `Which is bigger: 1 ${FRAC_NAME[a]![0]} or 1 ${FRAC_NAME[b]![0]}?`,
        say: `Which piece is bigger, 1 ${FRAC_NAME[a]![0]} of a cake or 1 ${FRAC_NAME[b]![0]} of the same cake?`,
        correct: { id: 'c', text: `1 ${FRAC_NAME[bigger]![0]}`, icon: fracIcon('circle', bigger, 1) },
        distractors: [{ id: 'w', text: `1 ${FRAC_NAME[smaller]![0]}`, icon: fracIcon('circle', smaller, 1), feedback: `More pieces means smaller pieces. Sharing between ${smaller} gives less each than sharing between ${bigger}.`, code: 'fp-more-less' }],
        code: 'fp-more-less',
        hints: ['Would you rather share a cake with 1 friend or with 7 friends?', 'More pieces means each piece is smaller.'],
        solution: [`1 ${FRAC_NAME[bigger]![0]} is bigger than 1 ${FRAC_NAME[smaller]![0]}.`],
      });
    };
    const howManyMakeWhole = () => {
      const d = rng.pick([2, 3, 4, 5, 6, 8]);
      return jq({
        prompt: `How many ${FRAC_NAME[d]![1]} make a whole?`,
        scene: { kind: 'fraction', shape: 'circle', parts: d, shaded: 0, equal: true },
        input: { kind: 'pad', max: 1000 },
        answer: exactN(d),
        answerDisplay: String(d),
        hints: ['Count the equal parts in the whole circle.', `A ${FRAC_NAME[d]![0]} is 1 of ${d} equal parts.`],
        solution: [`${d} ${FRAC_NAME[d]![1]} make 1 whole.`],
        misconceptions: keepJ([miss('fp-miscount', d - 1, 'Count all the parts.'), miss('fp-miscount', d + 1, 'Count the parts once each.')], d),
      });
    };
    const quartersInHalf = () =>
      jq({
        prompt: 'How many quarters make 1 half?',
        scene: { kind: 'fraction', shape: 'circle', parts: 4, shaded: 2, equal: true },
        input: { kind: 'pad', max: 1000 },
        answer: exactN(2),
        answerDisplay: '2',
        hints: ['The coloured part is half the circle.', 'Count the quarters in it.'],
        solution: ['2 quarters make 1 half.'],
        misconceptions: keepJ([miss('fp-miscount', 4, '4 quarters make a whole. How many make a half?')], 2),
      });

    if (g === 1) {
      if (level === 1) return equalParts();
      if (level === 2) return nameShaded(rng.pick([2, 3, 4, 5]), 1);
      if (level === 3) return ofCollection(1, 2, 20);
      if (level === 4) return ofCollection(1, 4, 20);
      return ofCollection(1, rng.pick([3, 5]), 20);
    }
    if (g === 2) {
      if (level === 1) return nameShaded(rng.pick(dens), 1);
      if (level === 2) {
        const d = rng.pick([3, 4, 5, 6, 8]);
        return nameShaded(d, rng.int(2, d - 1));
      }
      if (level === 3) return howManyMakeWhole();
      if (level === 4) return ofCollection(1, rng.pick([2, 3, 4, 5]), 50);
      return compareUnit();
    }
    if (level === 1) {
      const d = rng.pick([3, 4, 5, 6, 8]);
      return nameShaded(d, rng.int(2, d - 1));
    }
    if (level === 2) {
      const d = rng.pick([3, 4, 5]);
      return ofCollection(rng.int(2, d - 1), d, 40);
    }
    if (level === 3) return rng.chance(0.5) ? quartersInHalf() : howManyMakeWhole();
    if (level === 4) return compareUnit();
    const d = rng.pick([2, 3, 4, 5]);
    return ofCollection(rng.int(1, d - 1), d, 100);
  });

// ---------------------------------------------------------------------------
// Money (South African coins and notes, in cents)
// ---------------------------------------------------------------------------
const COINS_G1 = [10, 20, 50, 100, 200, 500];
const NOTES_G1 = [1000, 2000];

const money = (g: FoundationGrade) =>
  fpTemplate('money', g, (rng, level, ctx) => {
    const p = corePack(ctx);
    const coinIcon = (c: number) => `coin:${c}`;
    const totalOf = (items: number[]) => items.reduce((a, b) => a + b, 0);
    const totalQuestion = (items: number[], unitCents: boolean) => {
      const total = totalOf(items);
      const ans = unitCents ? total : total / 100;
      return jq({
        prompt: unitCents ? 'How many cents altogether?' : 'How much money altogether?',
        say: unitCents ? 'How many cents are there altogether?' : 'How much money is there altogether? Count the rands.',
        scene: { kind: 'coins', items },
        input: { kind: 'pad', max: 1000, ...(unitCents ? { unit: 'c' } : { prefix: 'R' }) },
        answer: exactN(ans),
        answerDisplay: p.money(total),
        hints: ['Look at the number on each coin or note, not how many there are.', 'Start with the biggest and count on.'],
        solution: [`${items.slice().sort((a, b) => b - a).map(p.money).join(' + ')} = ${p.money(total)}.`],
        misconceptions: keepJ([miss('fp-coin-value', items.length, `You counted ${items.length} pieces of money. Each one has its own value: add up the values.`)], ans),
      });
    };
    const randItems = (max: number, denoms: number[], count: [number, number]) => {
      for (let i = 0; i < 200; i++) {
        const n = rng.int(count[0], count[1]);
        const items = Array.from({ length: n }, () => rng.pick(denoms));
        const t = totalOf(items);
        if (t <= max && new Set(items).size > 1) return items;
      }
      return [denoms[0]!, denoms[1]!];
    };
    const change = (maxPaid: number, notes: number[]) => {
      const paid = rng.pick(notes.filter((n) => n <= maxPaid));
      const cost = rng.int(1, paid / 100 - 1) * 100;
      const ans = (paid - cost) / 100;
      const item = rng.pick(['a juice', 'a pencil case', 'a ball', 'a book', 'a loaf of bread', 'some apples']);
      return jq({
        prompt: `You buy ${item} for ${p.money(cost)}. You pay with ${p.money(paid)}. How much change do you get?`,
        scene: { kind: 'coins', items: [paid] },
        input: { kind: 'pad', max: 1000, prefix: 'R' },
        answer: exactN(ans),
        answerDisplay: p.money(paid - cost),
        hints: [`Count up from ${p.money(cost)} to ${p.money(paid)}.`, `${cost / 100} + ? = ${paid / 100}.`],
        solution: [`${p.money(paid)} − ${p.money(cost)} = ${p.money(paid - cost)}.`],
        misconceptions: keepJ([miss('fp-operation', (paid + cost) / 100, 'You added. Change is what is left after you pay.'), miss('fp-operation', cost / 100, 'That is the price. Change is what you get back.')], ans),
      });
    };
    const build = (amount: number, coins: number[]) =>
      jq({
        prompt: `Make ${p.money(amount)}.`,
        say: `Make ${p.moneySaid(amount)} with coins${coins.some((c) => c >= 1000) ? ' and notes' : ''}.`,
        input: { kind: 'build', tool: 'coins', max: 20000, coins },
        answer: exactN(amount),
        answerDisplay: p.money(amount),
        hints: ['Start with the biggest coin that fits.', 'Keep adding until you reach the amount.'],
        solution: [`For example: ${greedy(amount, coins).map(p.money).join(' + ')} = ${p.money(amount)}.`],
      });
    const identify = () => {
      const all = [...COINS_G1, ...NOTES_G1];
      const target = rng.pick(all);
      const others = rng.shuffle(all.filter((c) => c !== target)).slice(0, 3);
      return choiceJ(rng, {
        prompt: `Tap the ${p.money(target)} ${target >= 1000 ? 'note' : 'coin'}.`,
        say: `Tap the ${p.moneySaid(target)} ${target >= 1000 ? 'note' : 'coin'}.`,
        correct: { id: String(target), text: p.money(target), icon: coinIcon(target) },
        distractors: others.map((o) => ({ id: String(o), text: p.money(o), icon: coinIcon(o), feedback: `That is ${p.moneySaid(o)}. Look at the number on it.`, code: 'fp-coin-value' as const })),
        code: 'fp-coin-value',
        hints: ['Look for the number on the coin or note.', target < 100 ? 'Cents coins are smaller in value than rand coins.' : 'R means rand.'],
        solution: [`This is ${p.moneySaid(target)}.`],
      });
    };
    if (g === 1) {
      if (level === 1) return identify();
      if (level === 2) return totalQuestion(randItems(1000, [100, 200, 500], [2, 3]), false);
      if (level === 3) return totalQuestion(randItems(2000, [100, 200, 500, 1000], [2, 4]), false);
      if (level === 4) return build(rng.int(3, 20) * 100, [100, 200, 500, 1000]);
      return change(2000, [1000, 2000]);
    }
    if (g === 2) {
      if (level === 1) return totalQuestion(randItems(9900, [100, 200, 500, 1000, 2000, 5000], [2, 4]), false);
      if (level === 2) return totalQuestion(randItems(90, [10, 20, 50], [2, 4]), true);
      if (level === 3) return build(rng.int(11, 99) * 100, [100, 200, 500, 1000, 2000, 5000]);
      if (level === 4) return change(5000, [2000, 5000]);
      return change(9900, [5000]);
    }
    if (level === 1) {
      const r = rng.int(1, 9);
      return jq({
        prompt: `R${r} = how many cents?`,
        say: `How many cents make ${r} rand?`,
        input: { kind: 'pad', max: 1000, unit: 'c' },
        answer: exactN(r * 100),
        answerDisplay: `${r * 100}c`,
        hints: ['R1 = 100c.', `${r} lots of 100.`],
        solution: [`R1 = 100c, so R${r} = ${r * 100}c.`],
        misconceptions: keepJ([miss('fp-place-value', r * 10, 'R1 is 100 cents, not 10.')], r * 100),
      });
    }
    if (level === 2) return totalQuestion(randItems(1000, [10, 20, 50, 100, 200, 500], [3, 5]).map((c) => c), true);
    if (level === 3) return build(rng.int(2, 19) * 1000 + rng.pick([0, 500]), [500, 1000, 2000, 5000, 10000]);
    if (level === 4) return change(10000, [5000, 10000]);
    return change(20000, [10000, 20000]);
  });

function greedy(amount: number, coins: number[]): number[] {
  const out: number[] = [];
  let left = amount;
  for (const c of [...coins].sort((a, b) => b - a)) {
    while (left >= c) {
      out.push(c);
      left -= c;
    }
  }
  return out;
}

const G = [1, 2, 3] as const;
export const MATHS_CALC_TEMPLATES: QuestionTemplate[] = G.flatMap((g) => [addSub(g), bonds(g), wordProblems(g), groups(g), fractions(g), money(g)]);
