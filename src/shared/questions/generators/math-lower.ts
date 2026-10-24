/** Mathematics, Grades 4–6: place value, multiplication and division, fractions, decimals, perimeter and area. */
import type { QuestionTemplate, Misconception, AnswerSpec } from '../types.ts';
import { rat } from '../rational.ts';
import { choice, num, exact, keepNum, type Opt } from './kit.ts';

/** 12345 → "12 345" (South African digit grouping). */
export const grp = (v: number): string => {
  const [i, d] = String(v).split('.');
  return `${v < 0 ? '−' : ''}${(i ?? '').replace('-', '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}${d ? `,${d}` : ''}`;
};
/** Decimal with a comma, the South African way: 3.5 → "3,5". */
const dc = (v: number, dp = 2) => String(Math.round(v * 10 ** dp) / 10 ** dp).replace('.', ',');
const rands = (v: number) => `R${grp(Math.floor(v))},${String(Math.round((v - Math.floor(v)) * 100)).padStart(2, '0')}`;

const PLACE = ['units', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands'];

// ---------------------------------------------------------------------------
export const placeValue: QuestionTemplate = {
  id: 'place-value',
  skillId: 'place-value',
  generate(rng, level) {
    if (level === 1) {
      const digits = Array.from({ length: 4 }, () => rng.int(1, 9));
      const n = Number(digits.join(''));
      const pos = rng.int(0, 3); // from the right
      const d = digits[3 - pos]!;
      const value = d * 10 ** pos;
      return {
        prompt: `What is the value of the digit ${d} in ${grp(n)}? (Look at the ${PLACE[pos]} place.)`,
        input: { kind: 'numeric' },
        answer: exact(value),
        answerDisplay: grp(value),
        hints: ['Say the place of the digit: units, tens, hundreds or thousands.', `A ${d} in the ${PLACE[pos]} place is worth ${d} × ${grp(10 ** pos)}.`],
        solution: [`The ${d} is in the ${PLACE[pos]} place.`, `Its value is $${d} \\times ${10 ** pos} = ${value}$.`],
        misconceptions: keepNum(
          [
            { code: 'place-value', answer: exact(d), feedback: `${d} is the digit. Its value depends on its place: it is in the ${PLACE[pos]} place.` },
            { code: 'place-value', answer: exact(d * 10 ** (pos + 1)), feedback: `That is one place too far to the left. The ${d} is in the ${PLACE[pos]} place.` },
            ...(pos > 0 ? [{ code: 'place-value' as const, answer: exact(d * 10 ** (pos - 1)), feedback: `That is one place too far to the right. The ${d} is in the ${PLACE[pos]} place.` }] : []),
          ],
          value,
        ),
      };
    }
    if (level === 2) {
      const parts = [rng.int(1, 9) * 10000, rng.int(1, 9) * 1000, rng.chance(0.5) ? 0 : rng.int(1, 9) * 100, rng.int(1, 9) * 10, rng.int(0, 9)];
      const zeroAt = rng.int(1, 3);
      parts[zeroAt] = 0;
      const n = parts.reduce((a, b) => a + b, 0);
      const shown = parts.filter((p) => p > 0);
      const squashed = Number(shown.map((p) => String(p).replace(/0+$/, '') || '0').join(''));
      return {
        prompt: `Write this number in digits: $${shown.map((p) => grp(p).replace(/ /g, '\\,')).join(' + ')}$`,
        input: { kind: 'numeric' },
        answer: exact(n),
        answerDisplay: grp(n),
        hints: ['Use a place-value table: ten thousands, thousands, hundreds, tens, units.', 'An empty place still needs a 0.'],
        solution: [`Ten thousands: ${parts[0]! / 10000}, thousands: ${parts[1]! / 1000}, hundreds: ${parts[2]! / 100}, tens: ${parts[3]! / 10}, units: ${parts[4]}.`, `So the number is ${grp(n)}.`],
        misconceptions: keepNum([{ code: 'place-value', answer: exact(squashed), feedback: 'You left out a place that has nothing in it. Every empty place needs a 0 to hold it.' }], n),
      };
    }
    if (level === 3 || level === 4) {
      const to = level === 3 ? rng.pick([10, 100]) : rng.pick([100, 1000]);
      let n = level === 3 ? rng.int(1000, 9999) : rng.int(10000, 999999);
      if (n % to === 0) n += rng.int(1, to - 1);
      const down = Math.floor(n / to) * to;
      const up = down + to;
      const ans = n - down >= to / 2 ? up : down;
      const wrong = ans === up ? down : up;
      const ctx = level === 4 ? rng.pick([`${grp(n)} people watched a match at FNB Stadium.`, `A school raised R${grp(n)} for a new science lab.`, `A farmer harvested ${grp(n)} oranges.`, `A town has a population of ${grp(n)}.`]) : `${grp(n)}`;
      const word = to === 10 ? 'ten' : to === 100 ? 'hundred' : 'thousand';
      return {
        prompt: level === 4 ? `${ctx} Round the number to the nearest ${word}.` : `Round ${ctx} to the nearest ${word}.`,
        input: { kind: 'numeric' },
        answer: exact(ans),
        answerDisplay: grp(ans),
        hints: [`Which two multiples of ${grp(to)} is ${grp(n)} between?`, `Look at the digit in the ${PLACE[Math.log10(to) - 1]} place: 5 or more rounds up.`],
        solution: [`${grp(n)} is between ${grp(down)} and ${grp(up)}.`, `It is closer to ${grp(ans)}${n - down === to / 2 ? ' (exactly halfway rounds up)' : ''}.`],
        misconceptions: keepNum(
          [
            { code: 'rounding', answer: exact(wrong), feedback: `Check the digit to the right of the ${word}s: it decides whether you round up or down.` },
            { code: 'rounding', answer: exact(Math.round(n / (to / 10)) * (to / 10)), feedback: `That is rounded to the nearest ${to === 10 ? 'unit' : grp(to / 10)}. The question asks for the nearest ${word}.` },
          ],
          ans,
        ),
      };
    }
    const base = rng.int(10, 98) * 1000 + rng.int(100, 999);
    const s = String(base);
    const swap = (str: string, i: number, j: number) => {
      const a = str.split('');
      [a[i], a[j]] = [a[j]!, a[i]!];
      return Number(a.join(''));
    };
    const shorter = Number(s.slice(0, 4).split('').sort().reverse().join(''));
    const opts = [...new Set([base, swap(s, 2, 3), swap(s, 1, 2), shorter])].filter((v) => v > 0);
    while (opts.length < 4) {
      const extra = base - rng.int(1, 999);
      if (!opts.includes(extra)) opts.push(extra);
    }
    const largest = Math.max(...opts);
    const largestFirst = shorter === largest ? null : shorter;
    return choice(rng, {
      prompt: `Which number is the largest: ${rng.shuffle(opts).map(grp).join(';  ')}?`,
      correct: { id: String(largest), text: grp(largest) },
      distractors: opts.filter((v) => v !== largest).map((v) => ({ id: String(v), text: grp(v), feedback: v === largestFirst ? `${grp(v)} starts with big digits, but it has fewer digits. A 5-digit number is always bigger than a 4-digit number.` : `Compare digit by digit from the left. ${grp(largest)} is bigger at the first place where they differ.` })),
      code: 'place-value',
      hints: ['First compare how many digits each number has.', 'Then compare from the left, place by place.'],
      solution: ['Count the digits: more digits means a bigger number.', `Then compare place by place from the left: ${grp(largest)} is the largest.`],
    });
  },
};

// ---------------------------------------------------------------------------
export const multiplication: QuestionTemplate = {
  id: 'multiplication',
  skillId: 'multiplication',
  generate(rng, level) {
    if (level === 1) {
      const a = rng.int(3, 12);
      const b = rng.int(3, 12);
      return {
        prompt: `$${a} \\times ${b} = \\;?$`,
        input: { kind: 'numeric' },
        answer: exact(a * b),
        answerDisplay: String(a * b),
        hints: [`${a} groups of ${b}.`, `If you know ${a} × ${b - 1}, add one more ${a}.`],
        solution: [`$${a} \\times ${b} = ${a * b}$.`],
        misconceptions: keepNum([{ code: 'multiplication-method', answer: exact(a + b), feedback: 'You added. × means groups of: add the number to itself again and again.' }], a * b),
      };
    }
    if (level === 2) {
      const t = rng.int(1, 9);
      const u = rng.int(2, 9);
      const m = rng.int(3, 9);
      const n = t * 10 + u;
      const ans = n * m;
      const ctx = rng.pick([`A taxi carries ${n} passengers a trip. How many passengers in ${m} trips?`, `One packet has ${n} sweets. How many sweets in ${m} packets?`, `$${n} \\times ${m} = \\;?$`]);
      return {
        prompt: ctx,
        input: { kind: 'numeric' },
        answer: exact(ans),
        answerDisplay: String(ans),
        hints: [`Split ${n} into ${t * 10} and ${u}.`, `$${t * 10} \\times ${m}$ and $${u} \\times ${m}$, then add.`],
        solution: [`$${t * 10} \\times ${m} = ${t * 10 * m}$ and $${u} \\times ${m} = ${u * m}$.`, `$${t * 10 * m} + ${u * m} = ${ans}$.`],
        misconceptions: keepNum(
          [
            { code: 'multiplication-method', answer: exact(t * 10 * m + u), feedback: `You multiplied the tens but not the units. Both parts get multiplied by ${m}.` },
            { code: 'place-value', answer: exact(Number(`${t * m}${u * m}`)), feedback: `You wrote ${t} × ${m} and ${u} × ${m} side by side. The ${t} is ${t} tens, so ${t} × ${m} = ${t * m} tens = ${t * m * 10}.` },
          ],
          ans,
        ),
      };
    }
    if (level === 3) {
      const d = rng.int(3, 9);
      const q = rng.int(4, 15);
      const r = rng.int(1, d - 1);
      const n = d * q + r;
      const askGroups = rng.chance(0.5);
      const ctx = rng.pick([
        { thing: 'learners', group: `teams of ${d}` },
        { thing: 'eggs', group: `boxes that hold ${d}` },
        { thing: 'chairs', group: `rows of ${d}` },
      ]);
      return {
        prompt: askGroups ? `There are ${n} ${ctx.thing}, put into ${ctx.group}. How many full ${ctx.group.split(' ')[0]} can be made?` : `There are ${n} ${ctx.thing}, put into ${ctx.group}. How many ${ctx.thing} are left over?`,
        input: { kind: 'numeric' },
        answer: exact(askGroups ? q : r),
        answerDisplay: askGroups ? `${q} (with ${r} left over)` : `${r} (after ${q} full ${ctx.group.split(' ')[0]})`,
        hints: [`How many ${d}s fit into ${n}?`, `${d} × ${q} = ${d * q}.`],
        solution: [`$${n} \\div ${d} = ${q}$ remainder $${r}$, because $${d} \\times ${q} = ${d * q}$ and $${n} - ${d * q} = ${r}$.`, askGroups ? `So ${q} full ${ctx.group.split(' ')[0]}.` : `So ${r} are left over.`],
        misconceptions: keepNum(
          askGroups
            ? [
                { code: 'division-remainder', answer: exact(q + 1), feedback: `The last one would not be full: only ${r} are left for it.` },
                { code: 'division-remainder', answer: num(Math.round((n / d) * 100) / 100, 0.005), feedback: 'You can\'t make part of a group here. Give the whole number of full groups.' },
              ]
            : [{ code: 'division-remainder', answer: exact(q), feedback: `${q} is how many full groups. The question asks how many are left over.` }],
          askGroups ? q : r,
        ),
      };
    }
    if (level === 4) {
      const a = rng.int(12, 49);
      const b = rng.int(12, 39);
      const ans = a * b;
      const at = Math.floor(a / 10) * 10;
      const bt = Math.floor(b / 10) * 10;
      return {
        prompt: `$${a} \\times ${b} = \\;?$`,
        input: { kind: 'numeric' },
        answer: exact(ans),
        answerDisplay: grp(ans),
        hints: [`Split both: $(${at} + ${a - at})(${bt} + ${b - bt})$.`, 'Multiply every part by every part (4 products), then add.'],
        solution: [`$${at} \\times ${bt} = ${at * bt}$, $${at} \\times ${b - bt} = ${at * (b - bt)}$, $${a - at} \\times ${bt} = ${(a - at) * bt}$, $${a - at} \\times ${b - bt} = ${(a - at) * (b - bt)}$.`, `Total: $${ans}$.`],
        misconceptions: keepNum([{ code: 'multiplication-method', answer: exact(at * bt + (a - at) * (b - bt)), feedback: 'You multiplied tens by tens and units by units, but missed the two "cross" products. There are four parts.' }], ans),
      };
    }
    const boxes = rng.int(12, 25);
    const per = rng.pick([12, 24, 30, 36]);
    const used = rng.int(2, 6) * 25;
    const ans = boxes * per - used;
    return {
      prompt: `A school buys ${boxes} boxes of pencils with ${per} pencils in each box. It gives out ${used} pencils. How many pencils are left?`,
      input: { kind: 'numeric' },
      answer: exact(ans),
      answerDisplay: String(ans),
      hints: ['First find how many pencils were bought.', 'Then take away the ones given out.'],
      solution: [`Bought: $${boxes} \\times ${per} = ${boxes * per}$.`, `Left: $${boxes * per} - ${used} = ${ans}$.`],
      misconceptions: keepNum([{ code: 'probable-slip', answer: exact(boxes * per), feedback: `${boxes * per} is how many were bought. Take away the ${used} given out.` }], ans),
    };
  },
};

// ---------------------------------------------------------------------------
const fracAns = (n: number, d: number): AnswerSpec => {
  const r = rat(n, d);
  return { kind: 'fraction', n: r.n, d: r.d, requireSimplest: false };
};

export const fractionsBasic: QuestionTemplate = {
  id: 'fractions-basic',
  skillId: 'fractions-basic',
  generate(rng, level) {
    if (level === 1) {
      const whole = rng.pick([4, 5, 6, 8, 10, 12]);
      const part = rng.int(1, whole - 1);
      const ctx = rng.pick([
        { s: `A pizza is cut into ${whole} equal slices. Sipho eats ${part}.`, q: 'What fraction of the pizza did he eat?' },
        { s: `A chocolate bar has ${whole} equal blocks. Lindiwe shares ${part} with her friends.`, q: 'What fraction of the bar did she share?' },
        { s: `A garden has ${whole} equal beds. ${part} are planted with spinach.`, q: 'What fraction of the beds has spinach?' },
      ]);
      return {
        prompt: `${ctx.s} ${ctx.q}`,
        input: { kind: 'fraction' },
        answer: fracAns(part, whole),
        answerDisplay: `$\\tfrac{${part}}{${whole}}$`,
        hints: ['How many equal parts make the whole? That goes at the bottom.', 'How many parts are we talking about? That goes on top.'],
        solution: [`The whole has ${whole} equal parts and we want ${part} of them.`, `So the fraction is $\\tfrac{${part}}{${whole}}$.`],
        misconceptions: part !== whole - part ? [{ code: 'part-whole', answer: fracAns(part, whole - part), feedback: `You compared the parts eaten with the parts left. The bottom number is the total: ${whole}.` }] : [],
      };
    }
    if (level === 2 || level === 3) {
      const d = rng.pick([2, 3, 4, 5, 6, 8, 10]);
      const n = level === 2 ? 1 : rng.int(2, d - 1);
      const k = rng.int(2, 12);
      const total = d * k;
      const ans = n * k;
      const thing = rng.pick(['sweets', 'learners', 'marbles', 'rand', 'stickers', 'oranges']);
      return {
        prompt: thing === 'rand' ? `What is $\\tfrac{${n}}{${d}}$ of R${total}?` : `A bag has ${total} ${thing}. What is $\\tfrac{${n}}{${d}}$ of them?`,
        input: { kind: 'numeric' },
        answer: exact(ans),
        answerDisplay: thing === 'rand' ? `R${ans}` : String(ans),
        hints: [`Share ${total} into ${d} equal groups.`, n > 1 ? `Then take ${n} of those groups.` : 'One group is the answer.'],
        solution: [`$${total} \\div ${d} = ${k}$`, ...(n > 1 ? [`$${k} \\times ${n} = ${ans}$`] : [])],
        misconceptions: keepNum(
          [
            { code: 'fraction-of-amount', answer: exact(total * d), feedback: `You multiplied by ${d}. To find a fraction of an amount, divide by the denominator.` },
            ...(n > 1 ? [{ code: 'fraction-of-amount' as const, answer: exact(k), feedback: `${k} is one ${d === 2 ? 'half' : `${d}th`}. You need ${n} of them.` }] : [{ code: 'fraction-of-amount' as const, answer: exact(total - d), feedback: `You took away ${d}. Find 1/${d} by sharing into ${d} equal groups.` }]),
          ],
          ans,
        ),
      };
    }
    if (level === 4) {
      const kind = rng.pick(['unit', 'same-den', 'equal'] as const);
      let a: [number, number];
      let b: [number, number];
      if (kind === 'unit') {
        const [x, y] = rng.shuffle([2, 3, 4, 5, 6, 8, 10, 12]).slice(0, 2) as [number, number];
        a = [1, x];
        b = [1, y];
      } else if (kind === 'same-den') {
        const d = rng.pick([5, 6, 7, 8, 9, 10]);
        const [x, y] = rng.shuffle(Array.from({ length: d - 1 }, (_, i) => i + 1)).slice(0, 2) as [number, number];
        a = [x, d];
        b = [y, d];
      } else {
        const d = rng.pick([2, 3, 4, 5]);
        const n = rng.int(1, d - 1);
        const m = rng.int(2, 4);
        a = [n, d];
        b = [n * m, d * m];
      }
      const va = a[0] / a[1];
      const vb = b[0] / b[1];
      const opts: Opt[] = [
        { id: 'a', text: `$\\tfrac{${a[0]}}{${a[1]}}$ is bigger` },
        { id: 'b', text: `$\\tfrac{${b[0]}}{${b[1]}}$ is bigger` },
        { id: 'eq', text: 'They are equal' },
      ];
      const correctId = Math.abs(va - vb) < 1e-9 ? 'eq' : va > vb ? 'a' : 'b';
      return choice(rng, {
        prompt: `Which is bigger: $\\tfrac{${a[0]}}{${a[1]}}$ or $\\tfrac{${b[0]}}{${b[1]}}$?`,
        correct: opts.find((o) => o.id === correctId)!,
        distractors: opts
          .filter((o) => o.id !== correctId)
          .map((o) => ({ ...o, feedback: kind === 'unit' ? `More pieces means smaller pieces: one of ${Math.max(a[1], b[1])} pieces is smaller than one of ${Math.min(a[1], b[1])}.` : kind === 'equal' ? `$\\tfrac{${b[0]}}{${b[1]}}$ is $\\tfrac{${a[0]}}{${a[1]}}$ with top and bottom both multiplied by ${b[1] / a[1]}: the same amount.` : 'Same size pieces: the one with more pieces is bigger.' })),
        keepOrder: opts,
        code: kind === 'unit' ? 'bigger-denominator' : 'part-whole',
        hints: kind === 'unit' ? ['Imagine cutting the same cake into each number of pieces.'] : kind === 'same-den' ? ['The pieces are the same size. Which has more of them?'] : ['Try multiplying the top and bottom of the first fraction by the same number.'],
        solution: [kind === 'unit' ? `Cutting into ${Math.max(a[1], b[1])} pieces makes smaller pieces than cutting into ${Math.min(a[1], b[1])}.` : kind === 'equal' ? `$\\tfrac{${a[0]}}{${a[1]}} = \\tfrac{${b[0]}}{${b[1]}}$: they are equal.` : `Both are in ${a[1]}ths, so compare the tops: ${Math.max(a[0], b[0])} > ${Math.min(a[0], b[0])}.`],
      });
    }
    if (rng.chance(0.5)) {
      const d = rng.pick([2, 3, 4, 5, 8]);
      const part = rng.int(3, 12);
      const total = part * d;
      return {
        prompt: `${part} learners walk to school. That is $\\tfrac{1}{${d}}$ of the class. How many learners are in the class?`,
        input: { kind: 'numeric' },
        answer: exact(total),
        answerDisplay: String(total),
        hints: [`The class is split into ${d} equal groups, and one group has ${part}.`, `So the whole class is ${d} groups of ${part}.`],
        solution: [`$\\tfrac{1}{${d}}$ of the class is ${part}, so the whole class is $${part} \\times ${d} = ${total}$.`],
        misconceptions: keepNum([{ code: 'fraction-of-amount', answer: num(part / d, 0.01), feedback: `${part} is one part of ${d}. The whole is bigger: multiply by ${d}.` }], total),
      };
    }
    const d = rng.pick([3, 4, 5, 6]);
    const n = rng.int(1, d - 1);
    const m = rng.int(2, 4);
    const opts: Opt[] = [
      { id: 'eq', text: `$\\tfrac{${n * m}}{${d * m}}$` },
      { id: 'top', text: `$\\tfrac{${n * m}}{${d}}$`, feedback: 'Multiply the top **and** the bottom by the same number to keep the fraction the same size.' },
      { id: 'add', text: `$\\tfrac{${n + m}}{${d + m}}$`, feedback: 'Adding the same number to top and bottom changes the size of the fraction. Multiply instead.' },
      { id: 'flip', text: `$\\tfrac{${d}}{${n}}$`, feedback: 'That is the fraction upside down: a different number.' },
    ];
    return choice(rng, {
      prompt: `Which fraction is equal to $\\tfrac{${n}}{${d}}$?`,
      correct: opts[0]!,
      distractors: opts.slice(1),
      code: 'part-whole',
      hints: ['Equal fractions: multiply the top and the bottom by the same number.'],
      solution: [`$\\tfrac{${n}}{${d}} = \\tfrac{${n} \\times ${m}}{${d} \\times ${m}} = \\tfrac{${n * m}}{${d * m}}$.`],
    });
  },
};

// ---------------------------------------------------------------------------
const FRAC_DEC: [number, number, number][] = [
  [1, 2, 0.5], [1, 4, 0.25], [3, 4, 0.75], [1, 5, 0.2], [2, 5, 0.4], [3, 5, 0.6], [4, 5, 0.8], [1, 10, 0.1], [3, 10, 0.3], [7, 10, 0.7], [9, 10, 0.9], [1, 20, 0.05], [1, 8, 0.125], [3, 20, 0.15],
];

export const decimals: QuestionTemplate = {
  id: 'decimals',
  skillId: 'decimals',
  generate(rng, level) {
    if (level === 1) {
      const w = rng.int(0, 9);
      const t = rng.int(1, 9);
      const h = rng.intExcept(1, 9, [t]);
      const which = rng.pick(['t', 'h'] as const);
      const dgt = which === 't' ? t : h;
      const opts: Opt[] = [
        { id: 'tenths', text: `${dgt} tenths` },
        { id: 'hundredths', text: `${dgt} hundredths` },
        { id: 'units', text: `${dgt} units` },
        { id: 'tens', text: `${dgt} tens` },
      ];
      const correct = which === 't' ? 'tenths' : 'hundredths';
      return choice(rng, {
        prompt: `What is the value of the digit ${dgt} in ${w},${t}${h}?`,
        correct: opts.find((o) => o.id === correct)!,
        distractors: opts.filter((o) => o.id !== correct).map((o) => ({ ...o, feedback: `After the comma come tenths, then hundredths. The ${dgt} is ${which === 't' ? 'first' : 'second'} after the comma.` })),
        keepOrder: opts,
        code: 'place-value',
        hints: ['The first place after the decimal comma is tenths. The second is hundredths.'],
        solution: [`In ${w},${t}${h}: ${w} units, ${t} tenths, ${h} hundredths.`, `So the ${dgt} means **${dgt} ${correct}**.`],
      });
    }
    if (level === 2) {
      const pairs: [number, number][] = [
        [0.5, 0.45], [0.8, 0.75], [2.3, 2.25], [0.1, 0.09], [1.6, 1.55], [3.4, 3.38], [0.7, 0.65], [5.2, 5.19], [0.3, 0.299], [4.05, 4.5], [0.06, 0.6], [1.2, 1.15],
      ];
      const [x, y] = rng.pick(pairs);
      const [a, b] = rng.shuffle([x, y]) as [number, number];
      const big = Math.max(a, b);
      const longer = String(a).length > String(b).length ? a : b;
      return choice(rng, {
        prompt: `Which is bigger: ${dc(a, 3)} or ${dc(b, 3)}?`,
        correct: { id: String(big), text: dc(big, 3) },
        distractors: [{ id: String(Math.min(a, b)), text: dc(Math.min(a, b), 3), feedback: longer !== big ? `${dc(longer, 3)} has more digits, but that doesn't make it bigger. Compare tenths first: ${dc(big, 3)} has more tenths.` : 'Compare place by place from the left, starting with the units, then the tenths.' }],
        keepOrder: [{ id: String(a), text: dc(a, 3) }, { id: String(b), text: dc(b, 3) }],
        code: 'decimal-length',
        hints: ['Write both with the same number of decimal places (add zeros), then compare.'],
        solution: [`Write them with the same places: ${dc(a, 3).padEnd(dc(Math.max(a, b), 3).length, '0')} and ${dc(b, 3)}.`, `${dc(big, 3)} is bigger.`],
      });
    }
    if (level === 3) {
      const a = rng.int(11, 89) / 10;
      const b = rng.int(101, 899) / 100;
      const add = rng.chance(0.6);
      const [x, y] = add ? [a, b] : a > b ? [a, b] : [b, a];
      const ans = Math.round((add ? x + y : x - y) * 100) / 100;
      const wrongA = add ? (Math.round(a * 10) + Math.round(b * 100)) / 100 : null;
      return {
        prompt: `$${dc(x, 2)} ${add ? '+' : '-'} ${dc(y, 2)} = \\;?$`.replace(/,/g, '{,}'),
        input: { kind: 'numeric' },
        answer: num(ans, 0.0001),
        answerDisplay: dc(ans, 2),
        hints: ['Line up the decimal commas.', 'Give both numbers the same number of decimal places by adding a 0.'],
        solution: [`$${dc(x, 2).includes(',') && dc(x, 2).split(',')[1]!.length === 1 ? `${dc(x, 2)}0` : dc(x, 2)} ${add ? '+' : '-'} ${dc(y, 2).includes(',') && dc(y, 2).split(',')[1]!.length === 1 ? `${dc(y, 2)}0` : dc(y, 2)} = ${dc(ans, 2)}$`.replace(/,/g, '{,}')],
        misconceptions: keepNum(wrongA !== null ? [{ code: 'decimal-alignment', answer: num(wrongA, 0.0001), feedback: 'You lined up the last digits instead of the decimal commas, so tenths were added to hundredths.' }] : [], ans),
      };
    }
    if (level === 4) {
      const [n, d, v] = rng.pick(FRAC_DEC);
      if (rng.chance(0.5)) {
        return {
          prompt: `Write $\\tfrac{${n}}{${d}}$ as a decimal.`,
          input: { kind: 'numeric' },
          answer: num(v, 0.0001),
          answerDisplay: dc(v, 3),
          hints: [`Make the denominator 10, 100 or 1 000 by multiplying top and bottom by the same number.`],
          solution: [`$\\tfrac{${n}}{${d}} = ${dc(v, 3)}$`.replace(/,/g, '{,}')],
          misconceptions: keepNum([{ code: 'place-value', answer: num(Number(`${n}.${d}`), 0.0001), feedback: `${n},${d} isn't ${n} over ${d}. Make the denominator 10 or 100 first.` }], v),
        };
      }
      return {
        prompt: `Write ${dc(v, 3)} as a fraction in simplest form.`,
        input: { kind: 'fraction' },
        answer: { kind: 'fraction', n, d, requireSimplest: true },
        answerDisplay: `$\\tfrac{${n}}{${d}}$`,
        hints: [`${dc(v, 3)} means ${String(v).split('.')[1]} ${String(v).split('.')[1]!.length === 1 ? 'tenths' : String(v).split('.')[1]!.length === 2 ? 'hundredths' : 'thousandths'}.`, 'Then simplify.'],
        solution: [`$${dc(v, 3)} = \\tfrac{${Number(String(v).split('.')[1])}}{${10 ** String(v).split('.')[1]!.length}} = \\tfrac{${n}}{${d}}$`.replace(/,/g, '{,}')],
        misconceptions: [],
      };
    }
    const price = rng.int(1200, 4999) / 100;
    const paid = price < 20 ? 20 : price < 50 ? 50 : 100;
    const change = Math.round((paid - price) * 100) / 100;
    const item = rng.pick(['a loaf of bread and milk', 'a maths workbook', 'airtime', 'a calculator battery', 'school socks']);
    return {
      prompt: `You buy ${item} for ${rands(price)} and pay with a R${paid} note. How much change should you get? (Answer in rand.)`,
      input: { kind: 'numeric', prefix: 'R' },
      answer: num(change, 0.0001),
      answerDisplay: rands(change),
      hints: [`Change = R${paid},00 − ${rands(price)}.`, 'Line up the commas and subtract, borrowing where you need to.'],
      solution: [`$${paid}{,}00 - ${dc(price, 2)} = ${dc(change, 2)}$`.replace(/(\d),(\d)/g, '$1{,}$2'), `Your change is ${rands(change)}.`],
      misconceptions: keepNum([{ code: 'decimal-alignment', answer: num(Math.round((change + 1) * 100) / 100, 0.0001), feedback: 'Check the rands: when you borrow 100 cents to subtract the cents, the rands go down by 1.' }], change),
    };
  },
};

// ---------------------------------------------------------------------------
export const perimeterArea: QuestionTemplate = {
  id: 'perimeter-area',
  skillId: 'perimeter-area',
  generate(rng, level) {
    const l = rng.int(4, 15);
    const b = rng.intExcept(3, 12, [l]);
    if (level === 1) {
      const thing = rng.pick([{ t: 'A vegetable garden', u: 'm', q: 'How many metres of fencing go all the way around it?' }, { t: 'A poster', u: 'cm', q: 'How long is a ribbon that goes once around its edge?' }, { t: 'A soccer pitch drawn on the playground', u: 'm', q: 'How far do you walk going once around it?' }]);
      const P = 2 * (l + b);
      return {
        prompt: `${thing.t} is a rectangle ${l} ${thing.u} long and ${b} ${thing.u} wide. ${thing.q}`,
        input: { kind: 'numeric', unit: thing.u },
        answer: exact(P),
        answerDisplay: `${P} ${thing.u}`,
        hints: ['Going around means adding all four sides.', `Two sides are ${l} and two sides are ${b}.`],
        solution: [`$P = ${l} + ${b} + ${l} + ${b} = ${P}$ ${thing.u}.`],
        misconceptions: keepNum(
          [
            { code: 'perimeter-area', answer: exact(l * b), feedback: 'You multiplied, which gives the area (the space inside). Going around means adding the sides.' },
            { code: 'perimeter-area', answer: exact(l + b), feedback: 'That is only two of the four sides.' },
          ],
          P,
        ),
      };
    }
    if (level === 2) {
      const A = l * b;
      return {
        prompt: `A classroom floor is a rectangle ${l} m long and ${b} m wide. What is its area?`,
        input: { kind: 'numeric', unit: 'm²' },
        answer: exact(A),
        answerDisplay: `${A} m²`,
        hints: ['Area counts the squares that cover the floor.', 'Area of a rectangle = length × breadth.'],
        solution: [`$A = ${l} \\times ${b} = ${A}$ m².`],
        misconceptions: keepNum([{ code: 'perimeter-area', answer: exact(2 * (l + b)), feedback: 'That is the perimeter (the distance around). Area is the space inside: length × breadth.' }], A),
      };
    }
    if (level === 3) {
      const s = rng.int(3, 15);
      return {
        prompt: `A square tile has a perimeter of ${4 * s} cm. What is its area?`,
        input: { kind: 'numeric', unit: 'cm²' },
        answer: exact(s * s),
        answerDisplay: `${s * s} cm²`,
        hints: ['A square has 4 equal sides. Find one side first.', `Side = ${4 * s} ÷ 4.`],
        solution: [`Side $= ${4 * s} \\div 4 = ${s}$ cm.`, `Area $= ${s} \\times ${s} = ${s * s}$ cm².`],
        misconceptions: keepNum(
          [
            { code: 'perimeter-area', answer: exact(s), feedback: `${s} cm is the length of one side. Now find the area.` },
            { code: 'perimeter-area', answer: exact(4 * s * 4 * s), feedback: 'You squared the perimeter. Find one side first, then square that.' },
          ],
          s * s,
        ),
      };
    }
    if (level === 4) {
      const L = rng.int(8, 16);
      const B = rng.int(6, 12);
      const cl = rng.int(2, Math.floor(L / 2));
      const cb = rng.int(2, Math.floor(B / 2));
      const A = L * B - cl * cb;
      return {
        prompt: `A rectangular stoep is ${L} m by ${B} m, but a ${cl} m by ${cb} m flower bed is cut out of one corner. What area of stoep needs tiles?`,
        input: { kind: 'numeric', unit: 'm²' },
        answer: exact(A),
        answerDisplay: `${A} m²`,
        hints: ['Find the area of the whole rectangle.', 'Then subtract the area of the corner that is cut out.'],
        solution: [`Whole: $${L} \\times ${B} = ${L * B}$ m². Cut-out: $${cl} \\times ${cb} = ${cl * cb}$ m².`, `$${L * B} - ${cl * cb} = ${A}$ m².`],
        misconceptions: keepNum([{ code: 'perimeter-area', answer: exact(L * B), feedback: `That is the whole rectangle. Remember to subtract the ${cl * cb} m² flower bed.` }], A),
      };
    }
    const A = l * b;
    return {
      prompt: `A rectangle has an area of ${A} cm² and a length of ${l} cm. What is its perimeter?`,
      input: { kind: 'numeric', unit: 'cm' },
      answer: exact(2 * (l + b)),
      answerDisplay: `${2 * (l + b)} cm`,
      hints: ['Use the area to find the breadth: area ÷ length.', 'Then add all four sides.'],
      solution: [`Breadth $= ${A} \\div ${l} = ${b}$ cm.`, `Perimeter $= 2(${l} + ${b}) = ${2 * (l + b)}$ cm.`],
      misconceptions: keepNum(
        [
          { code: 'perimeter-area', answer: exact(b), feedback: `${b} cm is the breadth. The question asks for the perimeter.` },
          { code: 'perimeter-area', answer: exact(l + b), feedback: 'That is half the perimeter: only two of the four sides.' },
        ] as Misconception[],
        2 * (l + b),
      ),
    };
  },
};
