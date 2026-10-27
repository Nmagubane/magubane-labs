/**
 * Foundation Phase Mathematics: patterns, shape and space, measurement, time and data handling.
 * CAPS: clock reading starts in Grade 2 (hours, half hours) and reaches minutes in Grade 3; Grade 1
 * measures with informal units only; bar graphs arrive in Grade 3.
 */
import type { QuestionTemplate, GeneratedQuestion, Scene } from '../../questions/types.ts';
import type { Rng } from '../../questions/rng.ts';
import type { FoundationGrade } from '../../curriculum/foundation.ts';
import { jq, exactN, miss, keepJ, choiceJ, corePack, tile, type JOpt } from '../kit.ts';
import { ITEM_IDS, SHAPE_NAMES, DAYS, MONTHS, type ShapeId, type ItemId } from '../packs/en/core.ts';
import { fpTemplate, grp } from './maths-number.ts';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------
const SHAPE_TOKENS: ShapeId[] = ['circle', 'triangle', 'square', 'rectangle'];

interface PatTok {
  icon: string;
  name: string;
}
const shapeTok = (sh: ShapeId): PatTok => ({ icon: `shape:${sh}`, name: SHAPE_NAMES[sh] });

function shapePattern(rng: Rng, unit: PatTok[], shownUnits: number): GeneratedQuestion {
  const seq = Array.from({ length: unit.length * shownUnits + 1 }, (_, i) => unit[i % unit.length]!);
  const next = seq.pop()!;
  const pool = [...unit, ...SHAPE_TOKENS.map(shapeTok)];
  const options = pool.filter((t, i) => pool.findIndex((x) => x.icon === t.icon) === i && t.icon !== next.icon);
  const wrong = rng.shuffle(options).slice(0, 2);
  const said = unit.map((u) => u.name).join(', ');
  return choiceJ(rng, {
    prompt: 'What comes next?',
    say: 'Look at the pattern. What comes next?',
    scene: { kind: 'iconrow', items: [...seq.map((t) => t.icon), null] },
    correct: { id: 'c', text: next.name, icon: next.icon, say: next.name },
    distractors: wrong.map((o, i) => ({ id: `w${i}`, text: o.name, icon: o.icon, say: o.name, feedback: `Say the pattern out loud: ${said}, and again.` })),
    code: 'fp-order',
    hints: ['Find the part that repeats.', `The part that repeats is: ${said}.`],
    solution: [`The pattern repeats ${said}.`, `Next comes the ${next.name}.`],
    answerDisplay: next.name,
  });
}

function numberPattern(rng: Rng, start: number, step: number, len: number, gapAt: number): GeneratedQuestion {
  const seq = Array.from({ length: len }, (_, i) => start + i * step);
  const ans = seq[gapAt]!;
  const cells = seq.map((v, i) => (i === gapAt ? null : v));
  const up = step > 0;
  return jq({
    prompt: 'What number is missing?',
    say: `${cells.map((c) => (c === null ? 'something' : c)).join(', ')}. What number is missing?`,
    scene: { kind: 'track', cells },
    input: { kind: 'pad', max: 1000 },
    answer: exactN(ans),
    answerDisplay: grp(ans),
    hints: [`How much does it ${up ? 'go up' : 'go down'} each time?`, `It ${up ? 'goes up' : 'goes down'} by ${Math.abs(step)}.`],
    solution: [`The rule is ${up ? 'add' : 'take away'} ${Math.abs(step)}.`, `So the missing number is ${grp(ans)}.`],
    misconceptions: keepJ([miss('fp-count-step', gapAt > 0 ? seq[gapAt - 1]! + (up ? 1 : -1) : ans + 1, `That changes by 1. This pattern changes by ${Math.abs(step)}.`), miss('fp-count-step', ans + step, 'That is one step too far.')], ans),
  });
}

function rulePattern(rng: Rng, start: number, step: number): GeneratedQuestion {
  const seq = Array.from({ length: 4 }, (_, i) => start + i * step);
  const ruleText = (s: number) => (s > 0 ? `add ${s}` : `take away ${-s}`);
  const wrong = [...new Set([-step, step + (step > 0 ? 1 : -1), step * 2, step > 1 ? step - 1 : step + 2].filter((w) => w !== step && w !== 0))].slice(0, 2);
  return choiceJ(rng, {
    prompt: 'What is the rule?',
    say: `${seq.join(', ')}. What is the rule?`,
    scene: { kind: 'track', cells: seq },
    correct: { id: 'c', text: cap(ruleText(step)) },
    distractors: wrong.map((w, i) => ({ id: `w${i}`, text: cap(ruleText(w)), feedback: `Check: ${seq[0]} ${w > 0 ? '+' : '−'} ${Math.abs(w)} = ${seq[0]! + w}, but the next number is ${seq[1]}.`, code: 'fp-count-step' as const })),
    code: 'fp-count-step',
    hints: [`What do you do to ${seq[0]} to get ${seq[1]}?`, 'Check the rule works for every step.'],
    solution: [`${seq[0]} → ${seq[1]} is ${ruleText(step)}.`, `It works every time, so the rule is ${ruleText(step)}.`],
  });
}

const patterns = (g: FoundationGrade) =>
  fpTemplate('patterns', g, (rng, level) => {
    const shapes = (): PatTok[] => rng.shuffle([...SHAPE_TOKENS.map(shapeTok), ...rng.shuffle(ITEM_IDS).slice(0, 3).map((i) => ({ icon: corePack().ITEMS[i].icon, name: corePack().ITEMS[i].one }))]);
    if (g === 1) {
      if (level === 1) {
        const [a, b] = shapes() as [PatTok, PatTok];
        return shapePattern(rng, [a, b], 3);
      }
      if (level === 2) {
        const [a, b] = shapes() as [PatTok, PatTok];
        return shapePattern(rng, rng.pick([[a, b, b], [a, a, b]]), 2);
      }
      if (level === 3) return numberPattern(rng, rng.int(0, 10), rng.pick([1, 2]), 5, rng.int(1, 4));
      if (level === 4) {
        const step = rng.pick([5, 10]);
        return numberPattern(rng, step * rng.int(0, 5), step, 5, rng.int(1, 4));
      }
      const [a, b, c] = shapes() as [PatTok, PatTok, PatTok];
      return shapePattern(rng, [a, b, c], 2);
    }
    if (g === 2) {
      if (level === 1) {
        const [a, b, c] = shapes() as [PatTok, PatTok, PatTok];
        return shapePattern(rng, rng.pick([[a, b, c], [a, b, b, c], [a, a, b, c]]), 2);
      }
      if (level === 2) {
        const step = rng.pick([2, 5, 10]);
        return numberPattern(rng, step * rng.int(0, Math.floor(180 / step) - 4), step, 5, rng.int(0, 4));
      }
      if (level === 3) {
        const step = rng.pick([3, 4]);
        return numberPattern(rng, step * rng.int(0, 40), step, 5, rng.int(0, 4));
      }
      if (level === 4) {
        const step = rng.pick([2, 3, 4, 5, 10]);
        return numberPattern(rng, rng.int(5 * step, 200), -step, 5, rng.int(0, 4));
      }
      const step = rng.pick([2, 3, 4, 5, 10]) * (rng.chance(0.25) ? -1 : 1);
      return rulePattern(rng, step > 0 ? rng.int(0, 100) : rng.int(60, 200), step);
    }
    if (level === 1) {
      const step = rng.pick([10, 100]) * (rng.chance(0.5) ? 1 : -1);
      return numberPattern(rng, step > 0 ? rng.int(0, 999 - step * 4) : rng.int(-step * 4, 999), step, 5, rng.int(0, 4));
    }
    if (level === 2) {
      const step = rng.pick([20, 25, 50]);
      return numberPattern(rng, step * rng.int(0, Math.floor(999 / step) - 4), step, 5, rng.int(0, 4));
    }
    if (level === 3) {
      const step = rng.pick([3, 4, 5, 20, 25, 50]) * (rng.chance(0.4) ? -1 : 1);
      const start = step > 0 ? rng.int(100, 999 - step * 4) : rng.int(100 - step * 4, 999);
      return numberPattern(rng, start, step, 5, rng.int(1, 3));
    }
    if (level === 4) {
      const step = rng.pick([3, 4, 5, 10, 20, 25, 50, 100]) * (rng.chance(0.3) ? -1 : 1);
      return rulePattern(rng, step > 0 ? rng.int(100, 999 - step * 3) : rng.int(400, 999), step);
    }
    // A growing pattern in a table: row 1, 2, 3 … what is row 6?
    const start = rng.int(2, 9);
    const step = rng.int(2, 6);
    const row = rng.int(5, 8);
    const ans = start + (row - 1) * step;
    const item = rng.pick(['chairs', 'tables', 'trees', 'windows']);
    return jq({
      prompt: `Row 1 has ${start} ${item}. Each row has ${step} more than the row before. How many ${item} are in row ${row}?`,
      scene: { kind: 'track', cells: [start, start + step, start + 2 * step, null] },
      input: { kind: 'pad', max: 1000 },
      answer: exactN(ans),
      answerDisplay: String(ans),
      hints: [`Row 2 has ${start + step}, row 3 has ${start + 2 * step}.`, `Keep adding ${step} until row ${row}.`],
      solution: [`${Array.from({ length: row }, (_, i) => start + i * step).join(', ')}.`, `Row ${row} has ${ans} ${item}.`],
      misconceptions: keepJ([miss('fp-count-step', start + row * step, 'That is one row too many. Row 1 is the start.'), miss('fp-count-step', start + (row - 2) * step, 'That is one row too few.')], ans),
    });
  });

// ---------------------------------------------------------------------------
// 2-D shapes, 3-D objects, symmetry
// ---------------------------------------------------------------------------
const SHAPES_2D: Record<FoundationGrade, ShapeId[]> = { 1: ['circle', 'triangle', 'square'], 2: ['circle', 'triangle', 'square', 'rectangle'], 3: ['circle', 'triangle', 'square', 'rectangle', 'pentagon', 'hexagon'] };
const SHAPES_3D: Record<FoundationGrade, ShapeId[]> = { 1: ['sphere', 'box'], 2: ['sphere', 'box', 'cylinder'], 3: ['sphere', 'box', 'cylinder', 'cone', 'pyramid'] };
const REAL_3D: Partial<Record<ShapeId, { icon: string; name: string }[]>> = {
  sphere: [
    { icon: '⚽', name: 'soccer ball' },
    { icon: '🍊', name: 'orange' },
    { icon: '🌍', name: 'globe' },
    { icon: '🏀', name: 'basketball' },
  ],
  box: [
    { icon: '📦', name: 'box' },
    { icon: '🎁', name: 'present' },
    { icon: '🧱', name: 'brick' },
  ],
  cylinder: [
    { icon: '🥫', name: 'tin' },
    { icon: '🥁', name: 'drum' },
    { icon: '🔋', name: 'battery' },
  ],
  cone: [{ icon: '🍦', name: 'ice-cream cone' }],
};
const SIDES: Partial<Record<ShapeId, number>> = { triangle: 3, square: 4, rectangle: 4, pentagon: 5, hexagon: 6, circle: 0 };
const ROLLS: Partial<Record<ShapeId, boolean>> = { sphere: true, cylinder: true, cone: true, box: false, pyramid: false, cube: false };

const shapes = (g: FoundationGrade) =>
  fpTemplate('shapes', g, (rng, level) => {
    const twoD = SHAPES_2D[g];
    const threeD = SHAPES_3D[g];
    const variant = () => rng.int(0, 3);
    const tok = (s: ShapeId) => `shape:${s}:${variant()}`;
    if (level === 1) {
      const target = rng.pick(twoD);
      const others = rng.shuffle(twoD.filter((s) => s !== target)).slice(0, 2);
      return choiceJ(rng, {
        prompt: `Tap the ${SHAPE_NAMES[target]}.`,
        correct: { id: target, text: SHAPE_NAMES[target], icon: tok(target) },
        distractors: others.map((o) => ({ id: o, text: SHAPE_NAMES[o], icon: tok(o), feedback: `That is a ${SHAPE_NAMES[o]}. ${target === 'circle' ? 'A circle is round with no corners.' : `A ${SHAPE_NAMES[target]} has ${SIDES[target]} straight sides.`}`, code: 'fp-shape-name' as const })),
        code: 'fp-shape-name',
        hints: ['Count the sides and the corners.', target === 'circle' ? 'A circle is round all the way.' : `A ${SHAPE_NAMES[target]} has ${SIDES[target]} sides.`],
        solution: [target === 'circle' ? 'A circle is round with no straight sides.' : `A ${SHAPE_NAMES[target]} has ${SIDES[target]} straight sides${target === 'square' ? ', all the same length' : target === 'rectangle' ? ': two long and two short' : ''}.`],
        answerDisplay: SHAPE_NAMES[target],
      });
    }
    if (level === 2) {
      const target = rng.pick(twoD);
      const n = rng.int(2, 3);
      const others = twoD.filter((s) => s !== target);
      const tiles = rng.shuffle([...Array.from({ length: n }, (_, i) => ({ id: `t${i}`, s: target })), ...Array.from({ length: 6 - n }, (_, i) => ({ id: `o${i}`, s: rng.pick(others) }))]);
      return jq({
        prompt: `Tap all the ${SHAPE_NAMES[target]}s.`,
        say: `Find every ${SHAPE_NAMES[target]}. They can be big, small or turned.`,
        input: { kind: 'pick', options: tiles.map((t) => tile(t.id, undefined, tok(t.s), SHAPE_NAMES[t.s])) },
        answer: { kind: 'set', ids: tiles.filter((t) => t.s === target).map((t) => t.id) },
        answerDisplay: `${n} ${SHAPE_NAMES[target]}s`,
        hints: ['A shape keeps its name when it is turned or bigger.', target === 'circle' ? 'Look for round shapes.' : `Look for ${SIDES[target]} straight sides.`],
        solution: [`There are ${n} ${SHAPE_NAMES[target]}s.`],
      });
    }
    if (level === 3) {
      const target = rng.pick(threeD.filter((s) => REAL_3D[s]));
      const real = rng.pick(REAL_3D[target]!);
      const wrongShapes = rng.shuffle(threeD.filter((s) => s !== target && REAL_3D[s])).slice(0, 2);
      return choiceJ(rng, {
        prompt: `Which one is shaped like a ${SHAPE_NAMES[target]}?`,
        say: `Which one is shaped like a ${SHAPE_NAMES[target]}?`,
        scene: { kind: 'shapes', items: [{ shape: target, label: SHAPE_NAMES[target] }] },
        correct: { id: 'c', text: real.name, icon: real.icon, say: real.name },
        distractors: wrongShapes.map((w, i) => {
          const r = rng.pick(REAL_3D[w]!);
          return { id: `w${i}`, text: r.name, icon: r.icon, say: r.name, feedback: `A ${r.name} is shaped like a ${SHAPE_NAMES[w]}.`, code: 'fp-shape-name' as const };
        }),
        code: 'fp-shape-name',
        hints: [target === 'sphere' ? 'A ball shape is round all over.' : target === 'cylinder' ? 'A cylinder has two flat circles and a curved side.' : target === 'box' ? 'A box has flat faces and corners.' : 'A cone has one flat circle and a point.', 'Imagine holding it.'],
        solution: [`A ${real.name} is shaped like a ${SHAPE_NAMES[target]}.`],
      });
    }
    if (level === 4) {
      if (g === 1 || rng.chance(0.5)) {
        const items = rng.shuffle(threeD.flatMap((s) => (REAL_3D[s] ?? []).slice(0, 2).map((r) => ({ ...r, s })))).slice(0, 6);
        const rollers = items.filter((i) => ROLLS[i.s]);
        if (rollers.length > 0 && rollers.length < items.length)
          return jq({
            prompt: 'Tap everything that can roll.',
            input: { kind: 'pick', options: items.map((it, i) => tile(`i${i}`, it.name, it.icon, it.name)) },
            answer: { kind: 'set', ids: items.map((it, i) => (ROLLS[it.s] ? `i${i}` : '')).filter(Boolean) },
            answerDisplay: rollers.map((r) => r.name).join(', '),
            hints: ['Things with a curved side can roll.', 'Things with only flat faces slide.'],
            solution: ['Balls and cylinders have curved surfaces, so they roll.', 'Boxes have only flat faces, so they slide.'],
          });
      }
      const target = rng.pick(twoD.filter((s) => s !== 'circle'));
      const sides = SIDES[target]!;
      return jq({
        prompt: `How many sides does a ${SHAPE_NAMES[target]} have?`,
        scene: { kind: 'shapes', items: [{ shape: target }] },
        input: { kind: 'pad', max: 1000 },
        answer: exactN(sides),
        answerDisplay: String(sides),
        hints: ['Touch each straight side as you count.', 'Count the corners: there are as many corners as sides.'],
        solution: [`A ${SHAPE_NAMES[target]} has ${sides} sides and ${sides} corners.`],
        misconceptions: keepJ([miss('fp-miscount', sides - 1, 'You missed a side. Touch each one.'), miss('fp-miscount', sides + 1, 'You counted a side twice.')], sides),
      });
    }
    // Symmetry
    const sym = ['heart', 'square', 'circle', 'triangle', 'arrow', 'rectangle'];
    const notSym = ['irregular', 'flag', 'scalene'];
    const correct = rng.pick(sym);
    const wrong = rng.shuffle(notSym).slice(0, 2);
    return choiceJ(rng, {
      prompt: 'Which shape can fold in half so both halves match?',
      say: 'Which shape has a line of symmetry? If you fold it in half, both halves match.',
      correct: { id: 'c', text: 'This one', icon: `shape:${correct}`, say: 'this one' },
      distractors: wrong.map((w, i) => ({ id: `w${i}`, text: 'This one', icon: `shape:${w}`, say: 'this one', feedback: 'If you fold that one, the halves do not match.', code: 'fp-shape-name' as const })),
      code: 'fp-shape-name',
      hints: ['Imagine folding each shape down the middle.', 'Both halves must be the same, like a mirror.'],
      solution: ['That shape folds into two matching halves. The fold is a line of symmetry.'],
      answerDisplay: 'the shape with matching halves',
    });
  });

// ---------------------------------------------------------------------------
// Position and direction (grid scenes; left and right as the child sees them)
// ---------------------------------------------------------------------------
type Dir = 'above' | 'below' | 'left' | 'right';
const DIR_WORD: Record<Dir, string> = { above: 'above', below: 'below', left: 'to the left of', right: 'to the right of' };
const DIR_D: Record<Dir, [number, number]> = { above: [-1, 0], below: [1, 0], left: [0, -1], right: [0, 1] };

const position = (g: FoundationGrade) =>
  fpTemplate('position', g, (rng, level, ctx) => {
    const p = corePack(ctx);
    const size = g === 3 ? 4 : 3;
    const ids = rng.shuffle(ITEM_IDS).slice(0, size === 4 ? 7 : 5);
    const cells: { r: number; c: number; id: ItemId }[] = [];
    const free = rng.shuffle(Array.from({ length: size * size }, (_, i) => [Math.floor(i / size), i % size] as [number, number]));
    ids.forEach((id, i) => cells.push({ r: free[i]![0], c: free[i]![1], id }));
    const at = (r: number, c: number) => cells.find((x) => x.r === r && x.c === c);
    const scene: Scene = { kind: 'grid', rows: size, cols: size, cells: cells.map((x) => ({ r: x.r, c: x.c, icon: p.ITEMS[x.id].icon })) };
    const dirs: Dir[] = g === 1 && level <= 3 ? ['above', 'below'] : ['above', 'below', 'left', 'right'];

    if (g === 3 && level >= 4) {
      // Map directions: start at the house, follow moves.
      const start = cells[0]!;
      for (let tries = 0; tries < 50; tries++) {
        const dc = rng.int(-2, 2);
        const dr = rng.int(-2, 2);
        const end = at(start.r + dr, start.c + dc);
        if (!end || end === start || (dc === 0 && dr === 0)) continue;
        const moves = [dc ? `${Math.abs(dc)} ${dc > 0 ? 'right' : 'left'}` : '', dr ? `${Math.abs(dr)} ${dr > 0 ? 'down' : 'up'}` : ''].filter(Boolean).join(', then ');
        const wrongs = cells.filter((x) => x !== end && x !== start).slice(0, 2);
        return choiceJ(rng, {
          prompt: `Start at the ${p.ITEMS[start.id].one}. Go ${moves}. Where are you?`,
          scene: { ...scene, cells: (scene as Extract<Scene, { kind: 'grid' }>).cells },
          correct: { id: end.id, text: p.ITEMS[end.id].one, icon: p.ITEMS[end.id].icon, say: p.ITEMS[end.id].one },
          distractors: wrongs.map((w) => ({ id: w.id, text: p.ITEMS[w.id].one, icon: p.ITEMS[w.id].icon, say: p.ITEMS[w.id].one, feedback: 'Move one square at a time with your finger.', code: 'fp-position' as const })),
          code: 'fp-position',
          hints: ['Put your finger on the start.', 'Move one square at a time.'],
          solution: [`From the ${p.ITEMS[start.id].one}, go ${moves}: you reach the ${p.ITEMS[end.id].one}.`],
        });
      }
    }
    for (let tries = 0; tries < 100; tries++) {
      const from = rng.pick(cells);
      const d = rng.pick(dirs);
      const [dr, dc] = DIR_D[d];
      const target = at(from.r + dr, from.c + dc);
      if (!target) continue;
      const opposite = at(from.r - dr, from.c - dc);
      const wrongs = [...(opposite ? [opposite] : []), ...rng.shuffle(cells.filter((x) => x !== target && x !== from && x !== opposite))].slice(0, 2);
      return choiceJ(rng, {
        prompt: `What is ${DIR_WORD[d]} the ${p.ITEMS[from.id].one}?`,
        scene,
        correct: { id: target.id, text: p.ITEMS[target.id].one, icon: p.ITEMS[target.id].icon, say: p.ITEMS[target.id].one },
        distractors: wrongs.map((w) => ({ id: w.id, text: p.ITEMS[w.id].one, icon: p.ITEMS[w.id].icon, say: p.ITEMS[w.id].one, feedback: w === opposite ? `That is ${DIR_WORD[({ above: 'below', below: 'above', left: 'right', right: 'left' } as const)[d]]} the ${p.ITEMS[from.id].one}.` : `Find the ${p.ITEMS[from.id].one} first, then look ${d === 'above' ? 'up' : d === 'below' ? 'down' : d}.`, code: 'fp-position' as const })),
        code: 'fp-position',
        hints: [`Find the ${p.ITEMS[from.id].one} first.`, d === 'left' ? 'Your left hand makes an L with your thumb and finger.' : `Then look ${d === 'above' ? 'up' : d === 'below' ? 'down' : 'to the right'}, right next to it.`],
        solution: [`The ${p.ITEMS[target.id].one} is ${DIR_WORD[d]} the ${p.ITEMS[from.id].one}.`],
      });
    }
    // Fallback (grid had no neighbours): count items in the top row.
    const top = cells.filter((x) => x.r === 0).length;
    return jq({ prompt: 'How many things are in the top row?', scene, input: { kind: 'pad', max: 1000 }, answer: exactN(top), answerDisplay: String(top), hints: ['The top row is the highest one.'], solution: [`There are ${top}.`] });
  });

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------
const timeWords = (min: number): string => {
  const h = Math.floor(min / 60) || 12;
  const m = min % 60;
  const next = (h % 12) + 1;
  if (m === 0) return `${h} o'clock`;
  if (m === 30) return `half past ${h}`;
  if (m === 15) return `quarter past ${h}`;
  if (m === 45) return `quarter to ${next}`;
  return `${h}:${String(m).padStart(2, '0')}`;
};

const time = (g: FoundationGrade) =>
  fpTemplate('time', g, (rng, level) => {
    const readClock = (step: 60 | 30 | 15 | 5) => {
      const min = rng.int(0, Math.floor(719 / step)) * step;
      const h = Math.floor(min / 60) || 12;
      const m = min % 60;
      const swapped = step <= 15 && m === 0 && h !== 12 ? (h % 12) * 5 : null; // hands mixed: 3 o'clock read as 12:15 (Grade 3, once minutes are known)
      const wrongHour = ((Math.floor(min / 60) + 1) % 12) * 60 + m;
      const opts = ([
        { id: 'c', text: timeWords(min) },
        { id: 'h', text: timeWords(wrongHour), feedback: m === 30 ? `At half past, the short hand is between two numbers. It has just passed ${h}.` : 'Look at the short hand for the hour.', code: 'fp-clock-hands' },
        ...(swapped !== null ? [{ id: 's', text: timeWords(swapped), feedback: 'The short hand shows the hour. The long hand shows the minutes.', code: 'fp-clock-hands' as const }] : []),
        ...(step <= 30 && m !== 30 ? [{ id: 'm', text: timeWords(Math.floor(min / 60) * 60 + 30), feedback: 'Look at where the long hand points.', code: 'fp-clock-hands' as const }] : []),
      ] as JOpt[]).filter((o, i, arr) => arr.findIndex((x) => x.text === o.text) === i);
      if (opts.length < 3) opts.push({ id: 'x', text: timeWords(((Math.floor(min / 60) + 3) % 12) * 60 + m), feedback: 'Look at the short hand for the hour.', code: 'fp-clock-hands' });
      return choiceJ(rng, {
        prompt: 'What time is it?',
        scene: { kind: 'clockface', minutes: min },
        correct: opts[0]!,
        distractors: opts.slice(1),
        code: 'fp-clock-hands',
        hints: ['The short hand shows the hour.', m === 0 ? "When the long hand points to 12, it is o'clock." : m === 30 ? 'When the long hand points to 6, it is half past.' : 'Count the minutes in fives on the long hand.'],
        solution: [`The short hand is ${m === 0 ? 'on' : 'just after'} ${h}${m >= 45 ? ` (nearly ${(h % 12) + 1})` : ''}. The long hand is on ${m === 0 ? 12 : m / 5}.`, `It is ${timeWords(min)}.`],
      });
    };
    const setClock = (step: 60 | 30 | 15 | 5) => {
      const min = rng.int(0, Math.floor(719 / step)) * step;
      const h = Math.floor(min / 60);
      const m = min % 60;
      return jq({
        prompt: `Show ${timeWords(min)}.`,
        say: `Move the hands to show ${timeWords(min)}.`,
        input: { kind: 'clock', step },
        answer: exactN(min),
        answerDisplay: timeWords(min),
        hints: ['Set the long hand first: it shows the minutes.', 'Then the short hand: it shows the hour.'],
        solution: [`The long hand points to ${m === 0 ? 12 : m / 5}. The short hand points ${m === 0 ? 'to' : 'just past'} ${h || 12}.`],
        misconceptions: keepJ(m === 0 && h !== 0 ? [miss('fp-clock-hands', (h % 12) * 5, 'The hands are swapped. The short hand shows the hour.')] : [], min),
      });
    };
    if (g === 1) {
      if (level <= 2) {
        const i = rng.int(level === 1 ? 0 : 1, level === 1 ? 5 : 6);
        const before = level === 2;
        const ans = before ? DAYS[i - 1]! : DAYS[i + 1]!;
        const others = rng.shuffle(DAYS.filter((d) => d !== ans && d !== DAYS[i])).slice(0, 2);
        return choiceJ(rng, {
          prompt: `What day comes ${before ? 'before' : 'after'} ${DAYS[i]}?`,
          scene: { kind: 'week', days: DAYS, highlight: null },
          correct: { id: 'c', text: ans, say: ans },
          distractors: others.map((o, k) => ({ id: `w${k}`, text: o, say: o, feedback: `Say the days in order: Monday, Tuesday, Wednesday …`, code: 'fp-order' as const })),
          code: 'fp-order',
          hints: ['Say the days of the week in order.', `Find ${DAYS[i]} and look ${before ? 'just before it' : 'just after it'}.`],
          solution: [`${before ? `${ans}, then ${DAYS[i]}` : `${DAYS[i]}, then ${ans}`}.`],
        });
      }
      if (level === 3) {
        const start = rng.int(0, 3);
        const days = DAYS.slice(start, start + 4);
        let shown = rng.shuffle(days);
        while (shown.every((d, i) => d === days[i])) shown = rng.shuffle(days);
        return jq({
          prompt: 'Put the days in order.',
          input: { kind: 'order', items: shown.map((d) => tile(d, d, undefined, d)) },
          answer: { kind: 'sequence', ids: days },
          answerDisplay: days.join(', '),
          hints: ['Say the days of the week from Monday.', `${days[0]} comes first.`],
          solution: [days.join(', ') + '.'],
        });
      }
      if (level === 4) {
        const i = rng.int(0, 10);
        const ans = MONTHS[i + 1]!;
        const others = rng.shuffle(MONTHS.filter((m) => m !== ans && m !== MONTHS[i])).slice(0, 2);
        return choiceJ(rng, {
          prompt: `Which month comes after ${MONTHS[i]}?`,
          correct: { id: 'c', text: ans, say: ans },
          distractors: others.map((o, k) => ({ id: `w${k}`, text: o, say: o, feedback: 'Say the months in order: January, February, March …', code: 'fp-order' as const })),
          code: 'fp-order',
          hints: ['Say the months from January.', `Stop when you get to ${MONTHS[i]}.`],
          solution: [`${MONTHS[i]}, then ${ans}.`],
        });
      }
      const days = [
        { id: 'wake', text: 'Wake up', icon: '🌅' },
        { id: 'wash', text: 'Wash and dress', icon: '🧼' },
        { id: 'school', text: 'Go to school', icon: '🏫' },
        { id: 'supper', text: 'Eat supper', icon: '🍲' },
        { id: 'bed', text: 'Go to bed', icon: '🛏️' },
      ];
      const pick = rng.int(0, 1) ? days.filter((d) => d.id !== 'wash') : days.filter((d) => d.id !== 'supper');
      let shown = rng.shuffle(pick);
      while (shown.every((d, i) => d.id === pick[i]!.id)) shown = rng.shuffle(pick);
      return jq({
        prompt: 'Put the day in order.',
        say: 'What happens first in the day? Put them in order.',
        input: { kind: 'order', items: shown.map((d) => tile(d.id, d.text, d.icon, d.text)) },
        answer: { kind: 'sequence', ids: pick.map((d) => d.id) },
        answerDisplay: pick.map((d) => d.text).join(', '),
        hints: ['What do you do first in the morning?', 'What do you do last at night?'],
        solution: [pick.map((d) => d.text).join(', then ') + '.'],
      });
    }
    if (g === 2) {
      if (level === 1) return readClock(60);
      if (level === 2) return readClock(30);
      if (level === 3) return setClock(60);
      if (level === 4) return setClock(30);
      const facts = [
        { q: 'How many days are in a week?', a: 7 },
        { q: 'How many months are in a year?', a: 12 },
        { q: 'How many hours are in a day?', a: 24 },
        { q: 'How many minutes are in an hour?', a: 60 },
      ];
      const today = rng.int(0, 6);
      const plus = rng.int(2, 5);
      if (rng.chance(0.5)) {
        const ans = DAYS[(today + plus) % 7]!;
        const others = rng.shuffle(DAYS.filter((d) => d !== ans)).slice(0, 2);
        return choiceJ(rng, {
          prompt: `Today is ${DAYS[today]}. What day will it be in ${plus} days?`,
          scene: { kind: 'week', days: DAYS, highlight: today },
          correct: { id: 'c', text: ans, say: ans },
          distractors: others.map((o, k) => ({ id: `w${k}`, text: o, say: o, feedback: `Count on ${plus} days from ${DAYS[today]}.`, code: 'fp-order' as const })),
          code: 'fp-order',
          hints: [`Start at ${DAYS[today]}.`, `Count on ${plus} days. After Sunday comes Monday.`],
          solution: [`${Array.from({ length: plus + 1 }, (_, i) => DAYS[(today + i) % 7]).join(', ')}.`],
        });
      }
      const f = rng.pick(facts);
      return jq({ prompt: f.q, input: { kind: 'pad', max: 1000 }, answer: exactN(f.a), answerDisplay: String(f.a), hints: ['Think of a calendar or a clock.'], solution: [`${f.q.replace('How many', 'There are').replace('?', '')}: ${f.a}.`] });
    }
    if (level === 1) return readClock(15);
    if (level === 2) return setClock(15);
    if (level === 3) return readClock(5);
    if (level === 4) return setClock(5);
    const conv = rng.pick([
      () => {
        const w = rng.int(2, 4);
        return { q: `How many days are in ${w} weeks?`, a: w * 7, sol: `${w} × 7 = ${w * 7} days.`, wrong: w * 5 };
      },
      () => {
        const d = rng.pick([14, 21, 28]);
        return { q: `How many weeks are ${d} days?`, a: d / 7, sol: `${d} ÷ 7 = ${d / 7} weeks.`, wrong: d / 5 };
      },
      () => {
        const y = rng.int(1, 2);
        return { q: `How many months are in ${y === 1 ? '1 year' : '2 years'}?`, a: 12 * y, sol: `${y} × 12 = ${12 * y} months.`, wrong: 10 * y };
      },
    ])();
    return jq({ prompt: conv.q, input: { kind: 'pad', max: 1000 }, answer: exactN(conv.a), answerDisplay: String(conv.a), hints: ['A week has 7 days. A year has 12 months.'], solution: [conv.sol], misconceptions: keepJ([miss('fp-unit', conv.wrong, 'A week has 7 days, and a year has 12 months.')], conv.a) });
  });

// ---------------------------------------------------------------------------
// Length, mass, capacity, perimeter and area
// ---------------------------------------------------------------------------
const LONG = [
  { icon: '✏️', name: 'pencil' },
  { icon: '🖍️', name: 'crayon' },
  { icon: '🐍', name: 'snake' },
  { icon: '🥖', name: 'bread' },
  { icon: '🐛', name: 'caterpillar' },
  { icon: '🥕', name: 'carrot' },
];
const HEAVY = [
  { icon: '🐘', name: 'elephant', w: 9 },
  { icon: '🐄', name: 'cow', w: 8 },
  { icon: '🚗', name: 'car', w: 8.5 },
  { icon: '🐕', name: 'dog', w: 5 },
  { icon: '🍉', name: 'watermelon', w: 4 },
  { icon: '📕', name: 'book', w: 3 },
  { icon: '🍎', name: 'apple', w: 2 },
  { icon: '🍃', name: 'leaf', w: 0 },
  { icon: '🐭', name: 'mouse', w: 1 },
  { icon: '✏️', name: 'pencil', w: 0.5 },
];
const HOLDS = [
  { icon: '🛁', name: 'bath', c: 9 },
  { icon: '🍲', name: 'pot', c: 6 },
  { icon: '🍼', name: 'baby bottle', c: 3.5 },
  { icon: '🥛', name: 'glass', c: 3 },
  { icon: '☕', name: 'cup', c: 2.5 },
  { icon: '🥄', name: 'spoon', c: 1 },
];
const UNITS = [
  { unit: 'metres', for: ['the length of a classroom', 'how far you can jump', 'the height of a door', 'the length of a soccer field'] },
  { unit: 'kilograms', for: ['how heavy a bag of potatoes is', 'how heavy you are', 'how heavy a bag of mielie meal is'] },
  { unit: 'litres', for: ['how much water is in a bucket', 'how much milk is in a big bottle', 'how much water fills a bath'] },
];

const measure = (g: FoundationGrade) =>
  fpTemplate('measure', g, (rng, level) => {
    const twoThings = <T extends { icon: string; name: string }>(list: T[], key: (t: T) => number): [T, T] => {
      for (;;) {
        const [a, b] = rng.shuffle(list).slice(0, 2) as [T, T];
        if (Math.abs(key(a) - key(b)) >= 1) return key(a) > key(b) ? [a, b] : [b, a];
      }
    };
    const compareQ = (mode: 'length' | 'mass' | 'capacity', ask: 'more' | 'less') => {
      if (mode === 'length') {
        const [x, y] = rng.shuffle(LONG).slice(0, 2) as [(typeof LONG)[number], (typeof LONG)[number]];
        const sx = rng.int(3, 9);
        let sy = rng.int(3, 9);
        while (Math.abs(sx - sy) < 2) sy = rng.int(3, 9);
        const longer = sx > sy ? x : y;
        const shorter = sx > sy ? y : x;
        const ans = ask === 'more' ? longer : shorter;
        const other = ask === 'more' ? shorter : longer;
        return choiceJ(rng, {
          prompt: ask === 'more' ? 'Which is longer?' : 'Which is shorter?',
          scene: { kind: 'compare', mode: 'length', items: [{ id: 'x', icon: x.icon, label: x.name, size: sx }, { id: 'y', icon: y.icon, label: y.name, size: sy }] },
          correct: { id: 'c', text: ans.name, icon: ans.icon, say: ans.name },
          distractors: [{ id: 'w', text: other.name, icon: other.icon, say: other.name, feedback: `The ${other.name} is ${ask === 'more' ? 'shorter' : 'longer'}. Start both at the same line and look at the ends.`, code: 'fp-more-less' }],
          code: 'fp-more-less',
          keepOrder: true,
          hints: ['They start at the same line.', 'Look at where each one ends.'],
          solution: [`The ${longer.name} is longer than the ${shorter.name}.`],
        });
      }
      if (mode === 'mass') {
        const [heavy, light] = twoThings(HEAVY, (t) => t.w);
        const ans = ask === 'more' ? heavy : light;
        const other = ask === 'more' ? light : heavy;
        return choiceJ(rng, {
          prompt: ask === 'more' ? 'Which is heavier?' : 'Which is lighter?',
          scene: { kind: 'compare', mode: 'mass', items: rng.shuffle([{ id: 'h', icon: heavy.icon, label: heavy.name, size: 2 }, { id: 'l', icon: light.icon, label: light.name, size: 1 }]) },
          correct: { id: 'c', text: ans.name, icon: ans.icon, say: ans.name },
          distractors: [{ id: 'w', text: other.name, icon: other.icon, say: other.name, feedback: `The scale goes down on the heavier side. The ${heavy.name} is heavier.`, code: 'fp-more-less' }],
          code: 'fp-more-less',
          hints: ['The heavier side of a balance goes down.', 'Imagine holding one in each hand.'],
          solution: [`The ${heavy.name} is heavier than the ${light.name}.`],
        });
      }
      const [big, small] = twoThings(HOLDS, (t) => t.c);
      const ans = ask === 'more' ? big : small;
      const other = ask === 'more' ? small : big;
      return choiceJ(rng, {
        prompt: ask === 'more' ? 'Which holds more water?' : 'Which holds less water?',
        correct: { id: 'c', text: ans.name, icon: ans.icon, say: ans.name },
        distractors: [{ id: 'w', text: other.name, icon: other.icon, say: other.name, feedback: `A ${big.name} holds more than a ${small.name}. Imagine filling them.`, code: 'fp-more-less' }],
        code: 'fp-more-less',
        hints: ['Imagine pouring water into each.', 'Which would you use to fill the other?'],
        solution: [`A ${big.name} holds more than a ${small.name}.`],
      });
    };
    const informal = () => {
      const it = rng.pick(LONG);
      const n = rng.int(2, g === 1 ? 10 : 15);
      return jq({
        prompt: `How many blocks long is the ${it.name}?`,
        scene: { kind: 'ruler', icon: it.icon, lengthCm: n, maxCm: Math.max(10, n + 2), unit: 'block' },
        input: { kind: 'pad', max: 1000 },
        answer: exactN(n),
        answerDisplay: `${n} blocks`,
        hints: ['Count the blocks under it, from the start to the end.', 'Touch each block once.'],
        solution: [`It is ${n} blocks long.`],
        misconceptions: keepJ([miss('fp-miscount', n + 1, 'Start counting at the first block, not the line before it.'), miss('fp-miscount', n - 1, 'Count all the way to the end.')], n),
      });
    };
    const orderLength = () => {
      const items = rng.shuffle(LONG).slice(0, 3);
      const sizes = rng.shuffle([3, 5, 7, 9]).slice(0, 3);
      const withSize = items.map((it, i) => ({ ...it, size: sizes[i]! }));
      const sorted = withSize.slice().sort((a, b) => a.size - b.size);
      return jq({
        prompt: 'Order them: shortest first.',
        scene: { kind: 'compare', mode: 'length', items: withSize.map((w) => ({ id: w.name, icon: w.icon, label: w.name, size: w.size })) },
        input: { kind: 'order', items: withSize.map((w) => tile(w.name, w.name, w.icon, w.name)) },
        answer: { kind: 'sequence', ids: sorted.map((s) => s.name) },
        answerDisplay: sorted.map((s) => s.name).join(', '),
        hints: ['Find the shortest one first.', 'Then the next shortest.'],
        solution: [`${sorted.map((s) => s.name).join(', ')}.`],
      });
    };
    const chooseUnit = () => {
      const u = rng.pick(UNITS);
      const thing = rng.pick(u.for);
      return choiceJ(rng, {
        prompt: `What would you use to measure ${thing}?`,
        correct: { id: u.unit, text: u.unit, say: u.unit },
        distractors: UNITS.filter((x) => x !== u).map((x) => ({ id: x.unit, text: x.unit, say: x.unit, feedback: `${cap(x.unit)} measure ${x.unit === 'metres' ? 'how long' : x.unit === 'kilograms' ? 'how heavy' : 'how much liquid'}.`, code: 'fp-unit' as const })),
        code: 'fp-unit',
        keepOrder: true,
        hints: ['Is it about how long, how heavy, or how much liquid?', 'Metres: long. Kilograms: heavy. Litres: liquid.'],
        solution: [`We measure ${thing} in ${u.unit}.`],
      });
    };
    const ruler = () => {
      const it = rng.pick(LONG);
      const n = rng.int(3, 15);
      return jq({
        prompt: `How long is the ${it.name}?`,
        scene: { kind: 'ruler', icon: it.icon, lengthCm: n, maxCm: 16, unit: 'cm' },
        input: { kind: 'pad', max: 1000, unit: 'cm' },
        answer: exactN(n),
        answerDisplay: `${n} cm`,
        hints: ['The ruler starts at 0.', 'Read the number where the end of it is.'],
        solution: [`It starts at 0 and ends at ${n}, so it is ${n} cm long.`],
        misconceptions: keepJ([miss('fp-miscount', n + 1, 'Start at 0, not at 1.')], n),
      });
    };
    const rect = () => {
      const w = rng.int(2, 5);
      const h = rng.int(2, 4);
      const filled: [number, number][] = [];
      for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) filled.push([r, c]);
      return { w, h, filled };
    };
    const area = () => {
      const { w, h, filled } = rect();
      return jq({
        prompt: 'How many squares cover the shape?',
        say: 'This shape is made of squares. How many squares cover it?',
        scene: { kind: 'squares', rows: h, cols: w, filled },
        input: { kind: 'pad', max: 1000 },
        answer: exactN(w * h),
        answerDisplay: `${w * h} squares`,
        hints: [`Count the squares in one row: ${w}.`, `There are ${h} rows.`],
        solution: [`${h} rows of ${w}: ${Array.from({ length: h }, () => w).join(' + ')} = ${w * h}.`],
        misconceptions: keepJ([miss('fp-operation', w + h, 'That adds one side and the other. Count every square inside.'), miss('fp-operation', 2 * (w + h), 'That counts around the outside. Area counts the squares inside.')], w * h),
      });
    };
    const perimeter = () => {
      const { w, h, filled } = rect();
      const ans = 2 * (w + h);
      return jq({
        prompt: 'How many units all the way around?',
        say: 'Walk your finger all the way around the outside. How many units is it?',
        scene: { kind: 'squares', rows: h, cols: w, filled },
        input: { kind: 'pad', max: 1000 },
        answer: exactN(ans),
        answerDisplay: `${ans} units`,
        hints: ['Count the edges along the outside only.', `Top ${w}, side ${h}, bottom ${w}, side ${h}.`],
        solution: [`${w} + ${h} + ${w} + ${h} = ${ans}.`],
        misconceptions: keepJ([miss('fp-operation', w * h, 'That counts the squares inside. Perimeter goes around the outside.'), miss('fp-miscount', w + h, 'That is only two sides. Go all the way around.')], ans),
      });
    };
    const capacityFacts = () => {
      const f = rng.pick([
        { q: 'How many 250 ml cups fill a 1 litre jug?', a: 4, wrong: 250, fb: '1 litre is 1 000 ml. 250 + 250 + 250 + 250 = 1 000.' },
        { q: 'How many 500 ml bottles make 1 litre?', a: 2, wrong: 500, fb: '1 litre is 1 000 ml. 500 + 500 = 1 000.' },
        { q: 'A teaspoon holds 5 ml. How many ml do 3 teaspoons hold?', a: 15, wrong: 8, fb: '3 teaspoons: 5 + 5 + 5.' },
        { q: 'How many ml are in 2 litres?', a: 2000, wrong: 200, fb: '1 litre is 1 000 ml, so 2 litres is 2 000 ml.' },
      ]);
      return jq({ prompt: f.q, input: { kind: 'pad', max: 2000, ...(f.a >= 15 ? { unit: 'ml' } : {}) }, answer: exactN(f.a), answerDisplay: String(f.a), hints: ['1 litre = 1 000 ml.'], solution: [f.fb], misconceptions: keepJ([miss('fp-unit', f.wrong, f.fb)], f.a) });
    };
    const wordMeasure = (unit: 'm' | 'kg' | 'cm') => {
      const things = { m: ['rope', 'ribbon', 'hosepipe'], kg: ['bag of potatoes', 'bag of oranges', 'box of books'], cm: ['pencil', 'ruler', 'crayon'] }[unit];
      const [x, y] = rng.shuffle(things).slice(0, 2) as [string, string];
      const a = rng.int(unit === 'cm' ? 10 : 5, unit === 'cm' ? 30 : 20);
      const b = rng.int(2, a - 1);
      const diff = rng.chance(0.5);
      const ans = diff ? a - b : a + b;
      const unitSaid = { m: 'metres', kg: 'kilograms', cm: 'centimetres' }[unit];
      return jq({
        prompt: diff ? `The ${x} is ${a} ${unit}. The ${y} is ${b} ${unit}. How much ${unit === 'kg' ? 'heavier' : 'longer'} is the ${x}?` : `The ${x} is ${a} ${unit}. The ${y} is ${b} ${unit}. How much is that altogether?`,
        say: diff ? `The ${x} is ${a} ${unitSaid}. The ${y} is ${b} ${unitSaid}. How much ${unit === 'kg' ? 'heavier' : 'longer'} is the ${x}?` : `The ${x} is ${a} ${unitSaid}. The ${y} is ${b} ${unitSaid}. How much is that altogether?`,
        input: { kind: 'pad', max: 1000, unit },
        answer: exactN(ans),
        answerDisplay: `${ans} ${unit}`,
        hints: [diff ? 'How much more is one than the other? Take away.' : 'Altogether means add.'],
        solution: [`${a} ${diff ? '−' : '+'} ${b} = ${ans} ${unit}.`],
        misconceptions: keepJ([miss('fp-operation', diff ? a + b : a - b, diff ? 'You added. "How much more" means find the difference.' : 'You took away. "Altogether" means add.')], ans),
      });
    };
    if (g === 1) {
      if (level === 1) return compareQ('length', rng.chance(0.5) ? 'more' : 'less');
      if (level === 2) return compareQ('mass', rng.chance(0.6) ? 'more' : 'less');
      if (level === 3) return compareQ('capacity', rng.chance(0.6) ? 'more' : 'less');
      if (level === 4) return informal();
      return orderLength();
    }
    if (g === 2) {
      if (level === 1) return chooseUnit();
      if (level === 2) return compareQ('mass', rng.chance(0.5) ? 'more' : 'less');
      if (level === 3) return informal();
      if (level === 4) return rng.chance(0.5) ? chooseUnit() : capacityFacts();
      return wordMeasure(rng.pick(['m', 'kg'] as const));
    }
    if (level === 1) return ruler();
    if (level === 2) return perimeter();
    if (level === 3) return area();
    if (level === 4) return capacityFacts();
    return wordMeasure(rng.pick(['m', 'kg', 'cm'] as const));
  });

// ---------------------------------------------------------------------------
// Data handling
// ---------------------------------------------------------------------------
const FAVOURITES: { topic: string; options: { label: string; icon: string }[] }[] = [
  { topic: 'fruit', options: [{ label: 'apples', icon: '🍎' }, { label: 'bananas', icon: '🍌' }, { label: 'oranges', icon: '🍊' }, { label: 'mangoes', icon: '🥭' }] },
  { topic: 'pet', options: [{ label: 'dogs', icon: '🐕' }, { label: 'cats', icon: '🐈' }, { label: 'fish', icon: '🐟' }, { label: 'birds', icon: '🐦' }] },
  { topic: 'way to get to school', options: [{ label: 'walk', icon: '🚶' }, { label: 'taxi', icon: '🚐' }, { label: 'bus', icon: '🚌' }, { label: 'car', icon: '🚗' }] },
  { topic: 'sport', options: [{ label: 'soccer', icon: '⚽' }, { label: 'netball', icon: '🏐' }, { label: 'cricket', icon: '🏏' }, { label: 'rugby', icon: '🏉' }] },
];

const data = (g: FoundationGrade) =>
  fpTemplate('data', g, (rng, level) => {
    const fav = rng.pick(FAVOURITES);
    const k = g === 1 ? 3 : 4;
    const maxCount = g === 1 ? 8 : g === 2 ? 12 : 20;
    const opts = rng.shuffle(fav.options).slice(0, k);
    // Distinct counts so "most" and "least" have one answer.
    const counts = rng.shuffle(Array.from({ length: maxCount }, (_, i) => i + 1)).slice(0, k);
    const rows = opts.map((o, i) => ({ label: o.label, icon: o.icon, count: counts[i]! }));
    const each = g === 3 && level === 4 ? 2 : 1;
    if (each === 2) rows.forEach((r) => (r.count = r.count + (r.count % 2)));
    const scene: Scene =
      g === 1 || (g === 2 && level === 4) || each === 2
        ? { kind: 'pictograph', rows: rows.map((r) => ({ label: r.label, icon: r.icon, count: r.count })), each }
        : g === 2
          ? { kind: 'tally', rows: rows.map((r) => ({ label: r.label, count: r.count })) }
          : { kind: 'bars', bars: rows.map((r) => ({ label: r.label, value: r.count })), max: 20, step: 2 };
    const intro = `Children chose their favourite ${fav.topic}.`;
    const ask = level === 1 || level === 4 ? 'count' : level === 2 ? 'most' : level === 3 ? (g === 1 ? 'least' : 'diff') : 'total';
    if (ask === 'most' || ask === 'least') {
      const sorted = rows.slice().sort((a, b) => b.count - a.count);
      const ans = ask === 'most' ? sorted[0]! : sorted.at(-1)!;
      return choiceJ(rng, {
        prompt: ask === 'most' ? 'Which was chosen most?' : 'Which was chosen least?',
        say: `${intro} Which was chosen ${ask}?`,
        scene,
        correct: { id: ans.label, text: ans.label, icon: ans.icon, say: ans.label },
        distractors: rows.filter((r) => r !== ans).map((r) => ({ id: r.label, text: r.label, icon: r.icon, say: r.label, feedback: `${cap(r.label)}: ${r.count}. Compare all the ${g === 3 ? 'bars' : 'rows'}.`, code: 'fp-more-less' as const })),
        code: 'fp-more-less',
        keepOrder: true,
        hints: [`Look for the ${ask === 'most' ? 'longest' : 'shortest'} ${g === 3 ? 'bar' : 'row'}.`, 'Count each one if you need to.'],
        solution: [`${cap(ans.label)} has ${ans.count}, the ${ask === 'most' ? 'most' : 'least'}.`],
      });
    }
    if (ask === 'count') {
      const r = rng.pick(rows);
      return jq({
        prompt: `How many children chose ${r.label}?`,
        say: `${intro} How many children chose ${r.label}?`,
        scene,
        input: { kind: 'pad', max: 1000 },
        answer: exactN(r.count),
        answerDisplay: String(r.count),
        hints: each === 2 ? ['Look at the key: each picture stands for 2 children.', 'Count in 2s.'] : g === 2 && scene.kind === 'tally' ? ['Each bundle of tally marks with a line across is 5.', 'Count the bundles in 5s, then count on.'] : g === 3 ? ['Follow the top of the bar across to the numbers.'] : ['Count the pictures in that row.'],
        solution: [`${r.count} children chose ${r.label}.`],
        misconceptions: keepJ([...(each === 2 ? [miss('fp-count-step', r.count / 2, 'Each picture stands for 2 children. Count in 2s.')] : []), miss('fp-miscount', r.count + 1, 'Count again carefully.'), miss('fp-miscount', r.count - 1, 'Count again carefully.')], r.count),
      });
    }
    if (ask === 'diff') {
      const [a, b] = rows.slice().sort((x, y) => y.count - x.count).slice(0, 2) as [(typeof rows)[number], (typeof rows)[number]];
      const ans = a.count - b.count;
      return jq({
        prompt: `How many more chose ${a.label} than ${b.label}?`,
        say: `${intro} How many more children chose ${a.label} than ${b.label}?`,
        scene,
        input: { kind: 'pad', max: 1000 },
        answer: exactN(ans),
        answerDisplay: String(ans),
        hints: [`${cap(a.label)}: how many? ${cap(b.label)}: how many?`, 'Take the smaller from the bigger.'],
        solution: [`${a.count} − ${b.count} = ${ans}.`],
        misconceptions: keepJ([miss('fp-operation', a.count + b.count, 'You added. "How many more" means find the difference.')], ans),
      });
    }
    const total = rows.reduce((s, r) => s + r.count, 0);
    return jq({
      prompt: 'How many children chose altogether?',
      say: `${intro} How many children is that altogether?`,
      scene,
      input: { kind: 'pad', max: 1000 },
      answer: exactN(total),
      answerDisplay: String(total),
      hints: ['Find each number first.', 'Then add them all.'],
      solution: [`${rows.map((r) => r.count).join(' + ')} = ${total}.`],
      misconceptions: keepJ([miss('fp-miscount', rows.length, `That is how many choices there are. Add up the children.`)], total),
    });
  });

const G = [1, 2, 3] as const;
export const MATHS_SPACE_TEMPLATES: QuestionTemplate[] = G.flatMap((g) => [patterns(g), shapes(g), position(g), time(g), measure(g), data(g)]);
