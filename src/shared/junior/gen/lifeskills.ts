/**
 * Foundation Phase Life Skills: Beginning Knowledge and Personal & Social Well-being.
 * Topics follow the Grade 1–3 Annual Teaching Plans (Me, My body, Healthy habits, Safety, Plants and seeds,
 * Animals, Weather, Water, The sky, Feelings, Family and community, Rights and responsibilities).
 *
 * Science here follows Observe → Predict → Explain: "Will it float or sink?" asks for a prediction and
 * explains the result. Facts are stated plainly and checked: South Africa drives on the left, so children
 * look right first; police 10111, ambulance and fire 10177, and 112 from any cellphone.
 *
 * "Keeping my body safe" is NOT an app activity: it is an adult-led conversation card (cards.ts).
 */
import type { QuestionTemplate, GeneratedQuestion, Tile } from '../../questions/types.ts';
import type { Rng } from '../../questions/rng.ts';
import type { FoundationGrade } from '../../curriculum/foundation.ts';
import { jq, choiceJ, tile, aWord } from '../kit.ts';
import { fpTemplate } from './maths-number.ts';

interface T {
  text: string;
  icon?: string;
}
const t = (text: string, icon?: string): T => ({ text, ...(icon ? { icon } : {}) });
const toTile = (id: string, x: T): Tile => tile(id, x.text, x.icon, x.text);
/** "a, b and c" */
const andList = (xs: string[]): string => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** A one-answer question. Options are always spoken when tapped: Life Skills is not a reading test. */
function fact(rng: Rng, q: { q: string; a: T; wrong: (T & { why?: string })[]; why: string; hint: string; scene?: GeneratedQuestion['scene'] }): GeneratedQuestion {
  return choiceJ(rng, {
    prompt: q.q,
    ...(q.scene ? { scene: q.scene } : {}),
    correct: { id: 'c', text: q.a.text, ...(q.a.icon ? { icon: q.a.icon } : {}), say: q.a.text },
    distractors: q.wrong.slice(0, 3).map((w, i) => ({ id: `w${i}`, text: w.text, ...(w.icon ? { icon: w.icon } : {}), say: w.text, feedback: w.why ?? q.why, code: 'fp-knowledge' as const })),
    code: 'fp-knowledge',
    hints: [q.hint],
    solution: [q.why],
    answerDisplay: q.a.text,
  });
}

/** Tap every tile that fits. Samples so each question is a little different. */
function pick(rng: Rng, q: { q: string; yes: T[]; no: T[]; why: string; hint: string; nYes?: [number, number]; total?: number }): GeneratedQuestion {
  const total = q.total ?? 6;
  const nYes = Math.min(q.yes.length, rng.int(q.nYes?.[0] ?? 2, q.nYes?.[1] ?? 3));
  const yes = rng.shuffle(q.yes).slice(0, nYes);
  const no = rng.shuffle(q.no).slice(0, Math.min(q.no.length, total - nYes));
  const all = rng.shuffle([...yes.map((x, i) => ({ id: `y${i}`, x })), ...no.map((x, i) => ({ id: `n${i}`, x }))]);
  return jq({
    prompt: q.q,
    say: `${q.q} There is more than one.`,
    input: { kind: 'pick', options: all.map((a) => toTile(a.id, a.x)) },
    answer: { kind: 'set', ids: all.filter((a) => a.id.startsWith('y')).map((a) => a.id) },
    answerDisplay: yes.map((y) => y.text).join(', '),
    hints: [q.hint, 'Think about each picture on its own.'],
    solution: [`The right ones are ${andList(yes.map((y) => y.text))}.`, q.why],
  });
}

/** Put each tile in a box. */
function sort(rng: Rng, q: { q: string; bins: [T, T] | [T, T, T]; items: (T & { bin: number })[]; why: string; hint: string; n?: number }): GeneratedQuestion {
  const n = q.n ?? 6;
  // At least one item in each bin, then fill.
  const byBin = q.bins.map((_, b) => rng.shuffle(q.items.filter((i) => i.bin === b)));
  const chosen = byBin.map((l) => l[0]).filter((x): x is NonNullable<typeof x> => !!x);
  const rest = rng.shuffle(q.items.filter((i) => !chosen.includes(i)));
  while (chosen.length < Math.min(n, q.items.length)) chosen.push(rest.shift()!);
  const items = rng.shuffle(chosen).map((x, i) => ({ id: `i${i}`, x }));
  return jq({
    prompt: q.q,
    input: { kind: 'sort', bins: q.bins.map((b, i) => toTile(`b${i}`, b)), items: items.map((it) => toTile(it.id, it.x)) },
    answer: { kind: 'groups', pairs: Object.fromEntries(items.map((it) => [it.id, `b${it.x.bin}`])) },
    answerDisplay: q.bins.map((b, bi) => `${b.text}: ${items.filter((it) => it.x.bin === bi).map((it) => it.x.text).join(', ')}`).join('. '),
    hints: [q.hint, 'Take one picture at a time.'],
    solution: [q.why],
  });
}

/** Tap the steps in order. */
function order(rng: Rng, q: { q: string; steps: T[]; why: string; hint: string }): GeneratedQuestion {
  const items = q.steps.map((s, i) => toTile(`s${i}`, s));
  let shown = rng.shuffle(items);
  while (shown.every((x, i) => x.id === `s${i}`)) shown = rng.shuffle(items);
  return jq({
    prompt: q.q,
    input: { kind: 'order', items: shown },
    answer: { kind: 'sequence', ids: items.map((x) => x.id) },
    answerDisplay: q.steps.map((s) => s.text).join(', then '),
    hints: [q.hint, 'What has to happen first?'],
    solution: [`First ${q.steps.map((s) => s.text).join(', then ')}.`, q.why],
  });
}

/** Pick one prompt from a pool of fact questions. */
const fromPool = (rng: Rng, pool: Parameters<typeof fact>[1][]) => fact(rng, rng.pick(pool));

// ---------------------------------------------------------------------------
// My body and senses
// ---------------------------------------------------------------------------
const PARTS: T[] = [t('hand', '✋'), t('foot', '🦶'), t('eye', '👁️'), t('ear', '👂'), t('nose', '👃'), t('mouth', '👄'), t('leg', '🦵'), t('arm', '💪'), t('tooth', '🦷'), t('tongue', '👅')];
const SENSES: { sense: string; part: T; examples: string[] }[] = [
  { sense: 'see', part: t('eyes', '👁️'), examples: ['a rainbow', 'the colours of a flower', 'a bird in a tree'] },
  { sense: 'hear', part: t('ears', '👂'), examples: ['a dog barking', 'the school bell', 'music'] },
  { sense: 'smell', part: t('nose', '👃'), examples: ['bread baking', 'a flower', 'smoke'] },
  { sense: 'taste', part: t('tongue', '👅'), examples: ['a sweet mango', 'a sour lemon', 'salty chips'] },
  { sense: 'feel', part: t('skin and fingers', '✋'), examples: ['soft fur', 'a hot cup', 'rough sand'] },
];
const ORGANS = [
  { q: 'Which part pumps blood around your body?', a: t('heart', '❤️'), wrong: [t('brain', '🧠'), t('stomach'), t('bones', '🦴')], why: 'Your heart is a pump. It pushes blood all around your body.', hint: 'Put your hand on your chest and feel it beat.' },
  { q: 'Which part do you think with?', a: t('brain', '🧠'), wrong: [t('heart', '❤️'), t('lungs'), t('stomach')], why: 'Your brain thinks, remembers and tells your body what to do.', hint: 'It is inside your head.' },
  { q: 'Which parts fill with air when you breathe in?', a: t('lungs'), wrong: [t('stomach'), t('heart', '❤️'), t('bones', '🦴')], why: 'Your lungs fill with air when you breathe in.', hint: 'Take a deep breath. What fills up?' },
  { q: 'Where does your food go after you swallow it?', a: t('stomach'), wrong: [t('lungs'), t('brain', '🧠'), t('heart', '❤️')], why: 'Food goes down to your stomach, where it is broken down.', hint: 'It rumbles when you are hungry.' },
  { q: 'What holds your body up and gives it shape?', a: t('bones', '🦴'), wrong: [t('skin'), t('blood'), t('hair')], why: 'Your bones make a strong frame called a skeleton.', hint: 'They are hard and strong.' },
  { q: 'What do your muscles help you do?', a: t('move', '💪'), wrong: [t('see'), t('smell'), t('think')], why: 'Muscles pull on your bones so you can move.', hint: 'Make a strong arm.' },
  { q: 'What covers your whole body and protects it?', a: t('skin'), wrong: [t('bones', '🦴'), t('hair'), t('muscles', '💪')], why: 'Your skin covers and protects your body.', hint: 'It covers you all over.' },
];

const myBody = (g: FoundationGrade) =>
  fpTemplate('my-body', g, (rng, level) => {
    const partQ = () => {
      const p = rng.pick(PARTS);
      return fact(rng, { q: `Tap the ${p.text}.`, a: p, wrong: rng.shuffle(PARTS.filter((x) => x !== p)).slice(0, level <= 1 ? 2 : 3), why: `This is ${aWord(p.text)}.`, hint: 'Point to it on your own body first.' });
    };
    const senseQ = () => {
      const s = rng.pick(SENSES);
      return fact(rng, { q: `What do you use to ${s.sense}?`, a: s.part, wrong: rng.shuffle(SENSES.filter((x) => x !== s).map((x) => x.part)).slice(0, 3), why: `We ${s.sense} with our ${s.part.text}.`, hint: 'Try it: which part of you does that?' });
    };
    const exampleQ = () => {
      const s = rng.pick(SENSES);
      const ex = rng.pick(s.examples);
      return fact(rng, { q: `Which sense tells you about ${ex}?`, a: t(s.sense, s.part.icon), wrong: rng.shuffle(SENSES.filter((x) => x !== s).map((x) => t(x.sense, x.part.icon))).slice(0, 3), why: `You ${s.sense} ${ex} with your ${s.part.text}.`, hint: 'Imagine it. Do you see it, hear it, smell it, taste it or feel it?' });
    };
    const careQ = () =>
      fromPool(rng, [
        { q: 'How do you keep your teeth healthy?', a: t('brush them twice a day'), wrong: [t('eat sweets before bed'), t('never brush them')], why: 'Brush your teeth in the morning and before bed.', hint: 'What do you do with a toothbrush?' },
        { q: 'How do you look after your eyes?', a: t('never look straight at the sun'), wrong: [t('rub them with dirty hands'), t('read in the dark')], why: 'Looking at the sun can hurt your eyes, even for a short time.', hint: 'The sun is very bright.' },
        { q: 'How do you look after your ears?', a: t('keep loud music soft'), wrong: [t('put pencils in them'), t('shout into them')], why: 'Very loud sounds can hurt your ears. Never put things in your ears.', hint: 'Ears are gentle.' },
        { q: 'How do you look after your skin on a hot day?', a: t('wear a hat and sunscreen', '🧢'), wrong: [t('stay in the sun all day'), t('wear no hat')], why: 'A hat, shade and sunscreen protect your skin from sunburn.', hint: 'What keeps the sun off you?' },
      ]);
    const habitsSort = () =>
      sort(rng, {
        q: 'Sort them into two groups: good for my body, and not good for my body.',
        bins: [t('good for my body', '👍'), t('not good for my body', '👎')],
        items: [
          { ...t('brush teeth'), bin: 0 },
          { ...t('wash hands', '🧼'), bin: 0 },
          { ...t('sleep early', '😴'), bin: 0 },
          { ...t('play outside', '🏃'), bin: 0 },
          { ...t('drink water', '💧'), bin: 0 },
          { ...t('eat sweets all day', '🍬'), bin: 1 },
          { ...t('stay up very late', '🌃'), bin: 1 },
          { ...t('never wash', '🚫'), bin: 1 },
          { ...t('sit still all day', '📺'), bin: 1 },
        ],
        why: 'Sleep, clean hands and teeth, water and play keep your body healthy.',
        hint: 'Would a doctor tell you to do it?',
      });
    if (g === 1) return [partQ, partQ, senseQ, exampleQ, () => (rng.chance(0.5) ? senseQ() : exampleQ())][level - 1]!();
    if (g === 2) return [senseQ, exampleQ, careQ, habitsSort, careQ][level - 1]!();
    return [exampleQ, () => fromPool(rng, ORGANS.slice(0, 4)), () => fromPool(rng, ORGANS), careQ, () => fromPool(rng, ORGANS)][level - 1]!();
  });

// ---------------------------------------------------------------------------
// Healthy habits and food
// ---------------------------------------------------------------------------
const EVERYDAY: T[] = [t('apple', '🍎'), t('banana', '🍌'), t('carrot', '🥕'), t('mielies', '🌽'), t('milk', '🥛'), t('egg', '🥚'), t('water', '💧'), t('bread', '🍞'), t('fish', '🐟'), t('tomato', '🍅'), t('rice', '🍚'), t('orange', '🍊')];
const TREATS: T[] = [t('sweets', '🍬'), t('chips', '🍟'), t('cake', '🍰'), t('fizzy cool drink', '🥤'), t('chocolate', '🍫'), t('doughnut', '🍩'), t('lollipop', '🍭')];
const FRUIT: T[] = [t('apple', '🍎'), t('banana', '🍌'), t('orange', '🍊'), t('mango', '🥭'), t('grapes', '🍇'), t('pineapple', '🍍')];
const VEG: T[] = [t('carrot', '🥕'), t('tomato', '🍅'), t('potato', '🥔'), t('cabbage', '🥬'), t('broccoli', '🥦'), t('pumpkin', '🎃')];

const healthy = (g: FoundationGrade) =>
  fpTemplate('healthy', g, (rng, level) => {
    const washHands = () =>
      order(rng, {
        q: 'Put the hand-washing steps in order.',
        steps: [t('wet your hands', '💧'), t('rub with soap', '🧼'), t('rinse with water', '🚿'), t('dry your hands', '🧻')],
        why: 'Soap and rubbing take the germs off; rinsing washes them away.',
        hint: 'You need water before soap works.',
      });
    const whenWash = () =>
      fromPool(rng, [
        { q: 'When must you wash your hands?', a: t('before you eat', '🍽️'), wrong: [t('only on Sundays'), t('never')], why: 'Wash your hands before eating and after using the toilet.', hint: 'Germs on your hands can go into your mouth.' },
        { q: 'When must you wash your hands?', a: t('after using the toilet', '🚽'), wrong: [t('only when they look dirty'), t('once a week')], why: 'Always wash your hands after using the toilet, even if they look clean.', hint: 'Germs are too small to see.' },
        { q: 'How much sleep do children need?', a: t('a long sleep every night', '😴'), wrong: [t('a short nap only'), t('no sleep')], why: 'Children need about 9 to 12 hours of sleep every night to grow and learn.', hint: 'Your body grows while you sleep.' },
        { q: 'What is the best drink when you are thirsty?', a: t('water', '💧'), wrong: [t('fizzy cool drink', '🥤'), t('coffee', '☕')], why: 'Water is the best drink. Your body needs it every day.', hint: 'It comes out of the tap.' },
      ]);
    const habitsPick = () =>
      pick(rng, {
        q: 'Tap everything that keeps you healthy.',
        yes: [t('wash hands', '🧼'), t('sleep well', '😴'), t('eat fruit', '🍎'), t('play outside', '🏃'), t('drink water', '💧')],
        no: [t('eat sweets all day', '🍬'), t('watch TV all day', '📺'), t('drink lots of cool drink', '🥤')],
        why: 'Clean hands, sleep, good food, water and playing keep you healthy.',
        hint: 'Would it help your body grow strong?',
      });
    const foodSort = () =>
      sort(rng, {
        q: 'Sort the food into everyday food and sometimes food.',
        bins: [t('everyday food', '🥗'), t('sometimes food', '🍬')],
        items: [...rng.shuffle(EVERYDAY).slice(0, 5).map((x) => ({ ...x, bin: 0 })), ...rng.shuffle(TREATS).slice(0, 4).map((x) => ({ ...x, bin: 1 }))],
        why: 'Fruit, vegetables, milk, eggs, bread and water are everyday food. Sweets, chips, cake and cool drinks are sometimes food.',
        hint: 'Is it full of sugar or fat?',
      });
    const fruitVeg = () =>
      sort(rng, {
        q: 'Sort them into fruit and vegetables.',
        bins: [t('fruit', '🍎'), t('vegetables', '🥕')],
        items: [...rng.shuffle(FRUIT).slice(0, 3).map((x) => ({ ...x, bin: 0 })), ...rng.shuffle(VEG).slice(0, 3).map((x) => ({ ...x, bin: 1 }))],
        why: 'Fruit is usually sweet and has seeds inside. Vegetables are other plant parts we eat.',
        hint: 'Would you put it in a fruit salad?',
      });
    const lunchbox = () =>
      fromPool(rng, [
        { q: 'Which lunchbox is the healthiest?', a: t('a sandwich, an apple and water'), wrong: [t('chips, sweets and a cool drink'), t('cake, biscuits and juice')], why: 'A healthy lunch has bread or grains, fruit or vegetables, and water.', hint: 'Look for fruit and water.' },
        { q: 'Which supper is the healthiest?', a: t('pap, vegetables and chicken'), wrong: [t('only chips'), t('only cake')], why: 'A balanced meal has a starch, vegetables and some protein.', hint: 'Look for vegetables.' },
        { q: 'Why does your body need water?', a: t('to keep it working well'), wrong: [t('to make it sticky'), t('it does not need water')], why: 'Every part of your body needs water. Drink water every day, more when it is hot.', hint: 'You feel thirsty when you need it.' },
        { q: 'How long should children be active every day?', a: t('at least one hour'), wrong: [t('five minutes'), t('not at all')], why: 'Children should run, play or move for at least an hour every day.', hint: 'Think of a long break and sport.' },
        { q: 'Which food helps build strong bones?', a: t('milk', '🥛'), wrong: [t('sweets', '🍬'), t('fizzy cool drink', '🥤')], why: 'Milk, yoghurt and cheese help build strong bones and teeth.', hint: 'Babies drink it.' },
      ]);
    if (g === 1) return [whenWash, washHands, habitsPick, whenWash, washHands][level - 1]!();
    if (g === 2) return [habitsPick, fruitVeg, foodSort, foodSort, whenWash][level - 1]!();
    return [foodSort, fruitVeg, lunchbox, lunchbox, lunchbox][level - 1]!();
  });

// ---------------------------------------------------------------------------
// Safety
// ---------------------------------------------------------------------------
const safety = (g: FoundationGrade) =>
  fpTemplate('safety', g, (rng, level) => {
    const dangers = () =>
      pick(rng, {
        q: 'Tap everything that is NOT safe to play with.',
        yes: [t('fire', '🔥'), t('knife', '🔪'), t('medicine', '💊'), t('plug socket', '🔌'), t('cleaning liquid', '🧴'), t('matches')],
        no: [t('teddy bear', '🧸'), t('book', '📕'), t('ball', '⚽'), t('crayons', '🖍️'), t('blocks', '🧱')],
        why: 'Fire, knives, medicine, electricity and cleaning liquids can hurt you. Leave them for grown-ups.',
        hint: 'Could it burn, cut or poison you?',
      });
    const homeQ = () =>
      fromPool(rng, [
        { q: 'You find some tablets on the floor. What should you do?', a: t('tell a grown-up', '🧑'), wrong: [t('taste one'), t('hide them in your pocket')], why: 'Never eat tablets or medicine you find. Tell a grown-up straight away.', hint: 'Medicine can make you very sick if it is not yours.' },
        { q: 'The pot on the stove is hot. What should you do?', a: t('stay away from it'), wrong: [t('touch it to check'), t('pull the handle')], why: 'Hot pots can burn you badly. Stay away from the stove.', hint: 'It could burn you.' },
        { q: 'A stranger asks you to get into their car. What should you do?', a: t('say no and run to a grown-up you trust'), wrong: [t('get in the car'), t('go if they give you sweets')], why: 'Never go with a stranger. Say no, get away, and tell a grown-up you trust.', hint: 'Who do you go with?' },
        { q: 'Where is it safe to play?', a: t('in the yard or the park', '🏞️'), wrong: [t('in the road', '🚗'), t('near the river alone')], why: 'Play away from cars and deep water, where a grown-up can see you.', hint: 'Somewhere away from cars.' },
      ]);
    const crossRoad = () =>
      order(rng, {
        q: 'Put the steps for crossing the road in order.',
        steps: [t('stop at the edge'), t('look right'), t('look left'), t('look right again'), t('cross when it is clear')],
        why: 'In South Africa cars drive on the left, so the nearest cars come from your right. Look right, left, then right again.',
        hint: 'You always stop first.',
      });
    const roadQ = () =>
      fromPool(rng, [
        { q: 'Where is the safest place to cross the road?', a: t('at a pedestrian crossing', '🚸'), wrong: [t('between parked cars'), t('on a bend in the road')], why: 'Cross at a pedestrian crossing or a robot, where drivers can see you.', hint: 'Look for the stripes on the road.' },
        { q: 'The robot for walkers shows a red person. What do you do?', a: t('wait', '✋'), wrong: [t('run across'), t('walk slowly across')], why: 'A red person means wait. Cross when it shows green and the road is clear.', hint: 'Red means stop.' },
        { q: 'What should you wear when you ride a bicycle?', a: t('a helmet', '⛑️'), wrong: [t('a scarf'), t('sunglasses only')], why: 'A helmet protects your head if you fall.', hint: 'It protects your head.' },
        { q: 'Where should you sit in a car?', a: t('in the back with a seatbelt on'), wrong: [t('on someone’s lap'), t('in the front without a seatbelt')], why: 'Children are safest in the back seat with a seatbelt or car seat.', hint: 'Click! Put the seatbelt on before the car moves.' },
      ]);
    const electricity = () =>
      fromPool(rng, [
        { q: 'What should you never put into a plug socket?', a: t('anything at all', '🔌'), wrong: [t('only a plug, so pencils are fine'), t('only wet fingers')], why: 'Electricity can badly hurt you. Never put fingers or objects into sockets.', hint: 'Electricity is dangerous.' },
        { q: 'You see a broken electric wire on the ground. What do you do?', a: t('stay away and tell a grown-up'), wrong: [t('pick it up'), t('step over it')], why: 'Broken wires can still carry electricity. Stay far away.', hint: 'Do not touch it.' },
        { q: 'Why must you not touch a switch with wet hands?', a: t('water and electricity are dangerous together'), wrong: [t('the switch will get dirty'), t('it makes the light brighter')], why: 'Water lets electricity flow into your body.', hint: 'Water and electricity do not mix.' },
      ]);
    const fire = () =>
      rng.chance(0.5)
        ? order(rng, { q: 'Your clothes catch fire. Put what you do in order.', steps: [t('stop'), t('drop to the ground'), t('roll over and over')], why: 'Stop, drop and roll smothers the flames. Running makes them bigger.', hint: 'Do not run.' })
        : fromPool(rng, [
            { q: 'There is a fire in your house. What should you do?', a: t('get out and stay out', '🚪'), wrong: [t('hide under the bed'), t('go back for your toys')], why: 'Get out fast, stay low under smoke, and never go back inside.', hint: 'Get away from the fire.' },
            { q: 'Which number do you call for the police in South Africa?', a: t('10111', '📞'), wrong: [t('10177'), t('123')], why: 'The police number is 10111. From any cellphone you can also call 112.', hint: 'It has lots of ones.' },
            { q: 'Which number can you call from any cellphone in an emergency?', a: t('112', '📱'), wrong: [t('999'), t('100')], why: 'In South Africa, 112 works from any cellphone, even without airtime.', hint: 'It is a short number.' },
            { q: 'Smoke is filling the room. How should you move?', a: t('stay low and crawl'), wrong: [t('stand up tall'), t('jump up and down')], why: 'Smoke rises, so the cleaner air is near the floor.', hint: 'Smoke goes up.' },
          ]);
    const firstAid = () =>
      fromPool(rng, [
        { q: 'You have a nosebleed. What should you do?', a: t('lean forward and pinch your nose'), wrong: [t('lean far back'), t('blow your nose hard')], why: 'Lean forward and pinch the soft part of your nose for about 10 minutes.', hint: 'Lean forward, not back.' },
        { q: 'You burn your finger. What should you do first?', a: t('hold it under cool running water'), wrong: [t('put butter on it'), t('cover it with a blanket')], why: 'Cool running water for at least 10 minutes helps a burn. Tell a grown-up.', hint: 'Cool it down.' },
        { q: 'A friend has a cut that is bleeding. What should you do?', a: t('get a grown-up and do not touch the blood'), wrong: [t('lick it'), t('touch the blood to help')], why: 'Do not touch other people’s blood. Call a grown-up who will use gloves or a clean cloth.', hint: 'Keep safe from blood.' },
        { q: 'A dog bites someone. What should you do?', a: t('tell a grown-up straight away'), wrong: [t('chase the dog'), t('keep it a secret')], why: 'Animal bites need cleaning and checking by a nurse or doctor.', hint: 'Who can help?' },
      ]);
    if (g === 1) return [dangers, homeQ, dangers, homeQ, () => (rng.chance(0.5) ? dangers() : homeQ())][level - 1]!();
    if (g === 2) return [roadQ, crossRoad, electricity, roadQ, () => (rng.chance(0.5) ? crossRoad() : electricity())][level - 1]!();
    return [crossRoad, fire, fire, firstAid, firstAid][level - 1]!();
  });

// ---------------------------------------------------------------------------
// Plants and seeds
// ---------------------------------------------------------------------------
const plants = (g: FoundationGrade) =>
  fpTemplate('plants', g, (rng, level) => {
    const needs = () =>
      pick(rng, {
        q: 'Tap what a plant needs to grow.',
        yes: [t('sunlight', '☀️'), t('water', '💧'), t('air', '🌬️'), t('soil', '🟫')],
        no: [t('sweets', '🍬'), t('milk', '🥛'), t('toys', '🧸'), t('television', '📺')],
        why: 'Plants need sunlight, water, air and soil (or something to grow in).',
        hint: 'Think of a garden.',
        nYes: [3, 4],
      });
    const grow = () =>
      order(rng, {
        q: 'How does a seed grow? Put it in order.',
        steps: [t('seed', '🌰'), t('the seed sprouts', '🌱'), t('a small plant', '🌿'), t('a plant with flowers', '🌻')],
        why: 'A seed sprouts roots and a shoot, grows leaves, then flowers.',
        hint: 'Everything starts as a seed.',
      });
    const parts = () =>
      fromPool(rng, [
        { q: 'Which part of a plant takes in water from the soil?', a: t('roots'), wrong: [t('flower', '🌸'), t('leaves', '🍃')], why: 'Roots grow down into the soil and take in water.', hint: 'It is under the ground.' },
        { q: 'Which part of a plant holds it up?', a: t('stem'), wrong: [t('roots'), t('flower', '🌸')], why: 'The stem holds the plant up and carries water to the leaves.', hint: 'It is like a plant’s backbone.' },
        { q: 'Which part of a plant makes food using sunlight?', a: t('leaves', '🍃'), wrong: [t('roots'), t('stem')], why: 'Leaves use sunlight to make food for the plant.', hint: 'They are usually green and flat.' },
        { q: 'Which part of a plant makes seeds?', a: t('flower', '🌸'), wrong: [t('roots'), t('stem')], why: 'Flowers make seeds, often inside a fruit.', hint: 'Bees visit it.' },
      ]);
    const fromPlants = () =>
      pick(rng, {
        q: 'Tap everything that comes from plants.',
        yes: [t('apple', '🍎'), t('mielies', '🌽'), t('bread', '🍞'), t('cotton shirt', '👕'), t('paper', '📄'), t('carrot', '🥕')],
        no: [t('egg', '🥚'), t('milk', '🥛'), t('fish', '🐟'), t('honey', '🍯')],
        why: 'Fruit, vegetables, grain for bread, cotton for clothes and wood for paper all come from plants. Eggs, milk, fish and honey come from animals.',
        hint: 'Did it grow in the ground?',
      });
    const spread = () =>
      fromPool(rng, [
        { q: 'How do coconut seeds travel to new places?', a: t('they float on water', '🥥'), wrong: [t('they walk'), t('they fly like birds')], why: 'Coconuts float, so the sea carries them to new beaches.', hint: 'Coconut trees grow by the sea.' },
        { q: 'How do dandelion seeds travel?', a: t('the wind blows them', '🌬️'), wrong: [t('they swim'), t('they roll on wheels')], why: 'Dandelion seeds have fluffy tops that the wind carries far away.', hint: 'Blow on one.' },
        { q: 'A bird eats a fruit and flies away. How does this help the plant?', a: t('the bird drops the seeds far away', '🐦'), wrong: [t('it does not help'), t('the bird plants a tree on purpose')], why: 'Seeds pass through the bird and land far from the parent plant.', hint: 'Where do the seeds end up?' },
        { q: 'What do plants give us that we breathe?', a: t('oxygen (fresh air)', '🌬️'), wrong: [t('smoke'), t('water')], why: 'Plants give out oxygen, which we need to breathe.', hint: 'We need it every second.' },
      ]);
    const predictDark = () =>
      fact(rng, {
        q: 'A plant is kept in a dark cupboard for two weeks. What will happen?',
        a: t('it turns pale and weak'),
        wrong: [t('it grows faster and greener'), t('nothing changes')],
        why: 'Without light a plant cannot make food, so it turns pale and weak. Try it with two bean plants!',
        hint: 'What do leaves need to make food?',
      });
    if (g === 1) return [needs, grow, needs, grow, () => (rng.chance(0.5) ? needs() : grow())][level - 1]!();
    if (g === 2) return [grow, parts, parts, fromPlants, fromPlants][level - 1]!();
    return [parts, spread, () => (rng.chance(0.4) ? predictDark() : spread()), fromPlants, () => (rng.chance(0.3) ? predictDark() : rng.chance(0.5) ? fromPlants() : spread())][level - 1]!();
  });

// ---------------------------------------------------------------------------
// Animals
// ---------------------------------------------------------------------------
const FARM: T[] = [t('cow', '🐄'), t('sheep', '🐑'), t('goat', '🐐'), t('chicken', '🐔'), t('pig', '🐖'), t('horse', '🐎')];
const WILD: T[] = [t('lion', '🦁'), t('elephant', '🐘'), t('giraffe', '🦒'), t('zebra', '🦓'), t('rhino', '🦏'), t('hippo', '🦛'), t('crocodile', '🐊')];
const PETS: T[] = [t('dog', '🐕'), t('cat', '🐈'), t('fish', '🐟'), t('rabbit', '🐇'), t('budgie', '🐦')];

const animals = (g: FoundationGrade) =>
  fpTemplate('animals', g, (rng, level) => {
    const petNeeds = () =>
      pick(rng, {
        q: 'Tap what a pet dog needs every day.',
        yes: [t('food', '🥣'), t('clean water', '💧'), t('shelter', '🏠'), t('a walk', '🦮'), t('kindness', '❤️')],
        no: [t('chocolate', '🍫'), t('a bath every hour', '🛁'), t('sweets', '🍬')],
        why: 'Pets need food, clean water, shelter, exercise and kindness. Chocolate is poisonous to dogs.',
        hint: 'What do you need every day?',
      });
    const petsSort = () =>
      sort(rng, {
        q: 'Sort them into pets and wild animals.',
        bins: [t('pets', '🏠'), t('wild animals', '🌳')],
        items: [...rng.shuffle(PETS).slice(0, 3).map((x) => ({ ...x, bin: 0 })), ...rng.shuffle(WILD).slice(0, 3).map((x) => ({ ...x, bin: 1 }))],
        why: 'Pets live with people and are cared for. Wild animals look after themselves in nature.',
        hint: 'Could it live in your house?',
      });
    const farmWild = () =>
      sort(rng, {
        q: 'Sort them into farm animals and wild animals.',
        bins: [t('farm animals', '🚜'), t('wild animals', '🦁')],
        items: [...rng.shuffle(FARM).slice(0, 3).map((x) => ({ ...x, bin: 0 })), ...rng.shuffle(WILD).slice(0, 3).map((x) => ({ ...x, bin: 1 }))],
        why: 'Farmers keep cows, sheep, goats, chickens, pigs and horses. Lions, elephants and zebras live wild.',
        hint: 'Would a farmer keep it?',
      });
    const homes = () =>
      fromPool(rng, [
        { q: 'Where does a bird lay its eggs?', a: t('in a nest'), wrong: [t('in a web', '🕸️'), t('in a burrow')], why: 'Birds build nests for their eggs.', hint: 'It is made of twigs.' },
        { q: 'Where do bees live?', a: t('in a hive', '🐝'), wrong: [t('in a nest under water'), t('in a kennel')], why: 'Bees live together in a hive and make honey there.', hint: 'They make honey there.' },
        { q: 'What does a spider make to live on?', a: t('a web', '🕸️'), wrong: [t('a nest'), t('a hive')], why: 'Spiders spin webs to catch food and to live on.', hint: 'It is sticky.' },
        { q: 'Where does a rabbit live in the wild?', a: t('in a burrow under the ground'), wrong: [t('in a tree'), t('in the sea', '🌊')], why: 'Wild rabbits dig burrows under the ground.', hint: 'They dig.' },
        { q: 'Where do fish live?', a: t('in water', '🌊'), wrong: [t('in a nest'), t('in a burrow')], why: 'Fish live in rivers, dams and the sea. They breathe in water.', hint: 'They swim.' },
      ]);
    const babies = () =>
      fromPool(rng, [
        { q: 'What is a baby cow called?', a: t('calf', '🐄'), wrong: [t('kitten'), t('puppy')], why: 'A baby cow is a calf.', hint: 'It drinks its mother’s milk.' },
        { q: 'What is a baby sheep called?', a: t('lamb', '🐑'), wrong: [t('foal'), t('chick')], why: 'A baby sheep is a lamb.', hint: 'It says baa.' },
        { q: 'What is a baby dog called?', a: t('puppy', '🐶'), wrong: [t('kitten'), t('calf')], why: 'A baby dog is a puppy.', hint: 'It says woof.' },
        { q: 'What is a baby cat called?', a: t('kitten', '🐱'), wrong: [t('puppy'), t('lamb')], why: 'A baby cat is a kitten.', hint: 'It says meow.' },
        { q: 'What is a baby hen called?', a: t('chick', '🐤'), wrong: [t('calf'), t('kitten')], why: 'A baby hen is a chick. It hatches from an egg.', hint: 'It hatches from an egg.' },
        { q: 'What is a baby horse called?', a: t('foal', '🐎'), wrong: [t('lamb'), t('chick')], why: 'A baby horse is a foal.', hint: 'It can stand soon after it is born.' },
      ]);
    const lifeCycle = () =>
      rng.pick([
        () => order(rng, { q: 'Put the frog’s life cycle in order.', steps: [t('eggs (frogspawn)', '🥚'), t('tadpole'), t('froglet'), t('frog', '🐸')], why: 'Frog eggs hatch into tadpoles, which grow legs, become froglets, then frogs.', hint: 'Tadpoles live in water and have tails.' }),
        () => order(rng, { q: 'Put the butterfly’s life cycle in order.', steps: [t('egg', '🥚'), t('caterpillar', '🐛'), t('pupa (chrysalis)'), t('butterfly', '🦋')], why: 'An egg hatches into a caterpillar, which makes a chrysalis and comes out as a butterfly.', hint: 'Caterpillars eat leaves and grow.' }),
        () => order(rng, { q: 'Put the chicken’s life cycle in order.', steps: [t('egg', '🥚'), t('chick', '🐤'), t('young chicken'), t('hen', '🐔')], why: 'A chick hatches from an egg and grows into a hen or a rooster.', hint: 'What hatches?' }),
      ])();
    const eaters = () =>
      sort(rng, {
        q: 'Sort them into plant-eaters and meat-eaters.',
        bins: [t('plant-eaters', '🌿'), t('meat-eaters', '🍖')],
        items: [
          { ...t('cow', '🐄'), bin: 0 },
          { ...t('giraffe', '🦒'), bin: 0 },
          { ...t('zebra', '🦓'), bin: 0 },
          { ...t('rabbit', '🐇'), bin: 0 },
          { ...t('elephant', '🐘'), bin: 0 },
          { ...t('lion', '🦁'), bin: 1 },
          { ...t('crocodile', '🐊'), bin: 1 },
          { ...t('shark', '🦈'), bin: 1 },
          { ...t('owl', '🦉'), bin: 1 },
        ],
        why: 'Cows, giraffes, zebras, rabbits and elephants eat plants. Lions, crocodiles, sharks and owls eat other animals.',
        hint: 'What do its teeth look like?',
      });
    if (g === 1) return [petNeeds, petsSort, petNeeds, petsSort, babies][level - 1]!();
    if (g === 2) return [farmWild, homes, babies, homes, farmWild][level - 1]!();
    return [homes, lifeCycle, eaters, lifeCycle, eaters][level - 1]!();
  });

// ---------------------------------------------------------------------------
// Weather and seasons
// ---------------------------------------------------------------------------
const WEATHER: { name: string; icon: string; wear: T; wrongWear: T[] }[] = [
  { name: 'sunny', icon: '☀️', wear: t('a sun hat', '👒'), wrongWear: [t('a raincoat', '🧥'), t('gloves', '🧤')] },
  { name: 'rainy', icon: '🌧️', wear: t('an umbrella', '☂️'), wrongWear: [t('sunglasses', '🕶️'), t('a swimming costume', '🩳')] },
  { name: 'cloudy', icon: '☁️', wear: t('a jersey', '🧥'), wrongWear: [t('a swimming costume', '🩳'), t('sunglasses', '🕶️')] },
  { name: 'windy', icon: '🌬️', wear: t('a warm jacket', '🧥'), wrongWear: [t('a paper hat'), t('an open umbrella', '☂️')] },
  { name: 'stormy', icon: '⛈️', wear: t('stay inside', '🏠'), wrongWear: [t('play under a tree', '🌳'), t('swim in the river')] },
  { name: 'snowy', icon: '❄️', wear: t('a warm coat and gloves', '🧤'), wrongWear: [t('shorts', '🩳'), t('sandals')] },
];
const SEASONS: { season: string; months: string[]; icon: string; clue: string }[] = [
  { season: 'summer', months: ['December', 'January', 'February'], icon: '☀️', clue: 'the hottest days' },
  { season: 'autumn', months: ['March', 'April', 'May'], icon: '🍂', clue: 'leaves turn brown and fall' },
  { season: 'winter', months: ['June', 'July', 'August'], icon: '🧣', clue: 'the coldest days' },
  { season: 'spring', months: ['September', 'October', 'November'], icon: '🌸', clue: 'flowers bloom and trees get new leaves' },
];

const weather = (g: FoundationGrade) =>
  fpTemplate('weather', g, (rng, level) => {
    const name = () => {
      const w = rng.pick(WEATHER.slice(0, 5));
      return fact(rng, { q: 'What is the weather like?', scene: { kind: 'picture', icon: w.icon }, a: t(w.name, w.icon), wrong: rng.shuffle(WEATHER.filter((x) => x !== w).map((x) => t(x.name, x.icon))).slice(0, 2), why: `This picture shows ${w.name} weather.`, hint: 'Look at the sky in the picture.' });
    };
    const dress = () => {
      const w = rng.pick(WEATHER);
      return fact(rng, { q: `It is ${w.name}. What is best?`, scene: { kind: 'picture', icon: w.icon }, a: w.wear, wrong: w.wrongWear, why: w.name === 'stormy' ? 'In a thunderstorm, go inside. Never shelter under a tree.' : `On ${aWord(w.name)} day, ${w.wear.text} is best.`, hint: 'What would keep you safe and comfortable?' });
    };
    const season = () => {
      const s = rng.pick(SEASONS);
      const m = rng.pick(s.months);
      return rng.chance(0.5)
        ? fact(rng, { q: `In South Africa, which season is ${m} in?`, a: t(s.season, s.icon), wrong: rng.shuffle(SEASONS.filter((x) => x !== s).map((x) => t(x.season, x.icon))).slice(0, 3), why: `In South Africa, ${s.season} is ${s.months.join(', ')}.`, hint: 'In South Africa, Christmas is in summer.' })
        : fact(rng, { q: `In which season do ${s.clue.startsWith('the') ? `we have ${s.clue}` : s.clue}?`, a: t(s.season, s.icon), wrong: rng.shuffle(SEASONS.filter((x) => x !== s).map((x) => t(x.season, x.icon))).slice(0, 3), why: `In ${s.season}, ${s.clue.startsWith('the') ? `we have ${s.clue}` : s.clue}.`, hint: 'Think about what happens outside.' });
    };
    const seasonOrder = () => {
      const start = rng.int(0, 3);
      const seq = Array.from({ length: 4 }, (_, i) => SEASONS[(start + i) % 4]!);
      return order(rng, { q: `Start with ${seq[0]!.season}. Put the seasons in order.`, steps: seq.map((s) => t(s.season, s.icon)), why: 'The seasons go summer, autumn, winter, spring, and round again.', hint: 'After summer the leaves start to fall.' });
    };
    const chart = () => {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const ws = rng.shuffle(WEATHER.slice(0, 5));
      const target = rng.int(0, 4);
      return fact(rng, {
        q: `On which day was it ${ws[target]!.name}?`,
        scene: { kind: 'pictograph', rows: days.map((d, i) => ({ label: d, icon: ws[i]!.icon, count: 1 })), each: 1 },
        a: t(days[target]!),
        wrong: rng.shuffle(days.filter((_, i) => i !== target)).slice(0, 2).map((d) => t(d)),
        why: `The chart shows ${ws[target]!.icon} on ${days[target]}.`,
        hint: `Find the ${ws[target]!.name} picture.`,
      });
    };
    const effects = () =>
      fromPool(rng, [
        { q: 'Why do farmers need rain?', a: t('so their crops can grow', '🌽'), wrong: [t('so the cows can swim'), t('to wash the tractors')], why: 'Crops and grass need water to grow.', hint: 'Plants need water.' },
        { q: 'Where is the safest place in a thunderstorm?', a: t('inside a building', '🏠'), wrong: [t('under a tall tree', '🌳'), t('on an open field')], why: 'Lightning strikes tall things. Go inside a building.', hint: 'Lightning hits tall things.' },
        { q: 'There has been no rain for a long time. What should people do?', a: t('save water', '💧'), wrong: [t('fill swimming pools'), t('water the street')], why: 'In a drought, every drop counts.', hint: 'Water is running out.' },
        { q: 'What does a weather forecast tell us?', a: t('what the weather will be like'), wrong: [t('what is on television'), t('what time school starts')], why: 'A forecast helps us plan: an umbrella, a jersey or a hat.', hint: 'Fore means before.' },
      ]);
    if (g === 1) return [name, dress, name, dress, dress][level - 1]!();
    if (g === 2) return [dress, season, season, seasonOrder, season][level - 1]!();
    return [season, chart, effects, chart, effects][level - 1]!();
  });

// ---------------------------------------------------------------------------
// Water and the sky (including float or sink: predict, then explain)
// ---------------------------------------------------------------------------
const FLOATERS: { name: string; icon: string; floats: boolean; why: string }[] = [
  { name: 'apple', icon: '🍎', floats: true, why: 'Apples have air inside them, so they float.' },
  { name: 'leaf', icon: '🍃', floats: true, why: 'A leaf is light and flat, so it floats.' },
  { name: 'ice', icon: '🧊', floats: true, why: 'Ice floats. That is why ice cubes bob at the top of a drink.' },
  { name: 'wooden pencil', icon: '✏️', floats: true, why: 'Wood floats on water.' },
  { name: 'beach ball', icon: '🏐', floats: true, why: 'A ball full of air floats.' },
  { name: 'sponge', icon: '🧽', floats: true, why: 'A dry sponge is full of air holes, so it floats.' },
  { name: 'key', icon: '🔑', floats: false, why: 'A metal key is heavy for its size, so it sinks.' },
  { name: 'metal spoon', icon: '🥄', floats: false, why: 'A metal spoon sinks.' },
  { name: 'paper clip', icon: '📎', floats: false, why: 'A metal paper clip sinks.' },
  { name: 'stone', icon: '⚫', floats: false, why: 'A stone sinks.' },
  { name: 'fresh egg', icon: '🥚', floats: false, why: 'A fresh egg sinks in tap water. Try it!' },
  { name: 'R5 coin', icon: 'coin:500', floats: false, why: 'Coins are metal and sink.' },
];

const waterSky = (g: FoundationGrade) =>
  fpTemplate('water-sky', g, (rng, level) => {
    const uses = () =>
      pick(rng, {
        q: 'Tap the ways we use water.',
        yes: [t('drinking', '🥛'), t('washing', '🧼'), t('cooking', '🍲'), t('watering plants', '🌱'), t('bathing', '🛁')],
        no: [t('reading', '📖'), t('sleeping', '😴'), t('drawing', '🖍️')],
        why: 'We drink, wash, cook, water plants and bath with water.',
        hint: 'Which ones need a tap?',
      });
    const sky = () =>
      rng.chance(0.5)
        ? pick(rng, { q: 'Tap what we see in the sky at night.', yes: [t('moon', '🌙'), t('stars', '⭐')], no: [t('rainbow', '🌈'), t('sun', '☀️'), t('kite', '🪁')], why: 'At night we see the Moon and stars. The Sun lights the day sky.', hint: 'It is dark outside.', nYes: [2, 2], total: 5 })
        : fromPool(rng, [
            { q: 'What gives us light and warmth in the day?', a: t('the Sun', '☀️'), wrong: [t('the Moon', '🌙'), t('the clouds', '☁️')], why: 'The Sun gives us light and heat.', hint: 'It is very bright.' },
            { q: 'Is the Sun a star?', a: t('yes, the Sun is a star', '☀️'), wrong: [t('no, the Sun is a planet'), t('no, the Sun is the Moon')], why: 'The Sun is a star. It is the closest star to Earth.', hint: 'Stars make their own light.' },
            { q: 'Why must you never look straight at the Sun?', a: t('it can hurt your eyes'), wrong: [t('it will get angry'), t('it will go out')], why: 'The Sun is so bright it can damage your eyes, even quickly.', hint: 'It is very, very bright.' },
          ]);
    const save = () =>
      sort(rng, {
        q: 'Which ones save water, and which ones waste it? Sort them.',
        bins: [t('saves water', '👍'), t('wastes water', '👎')],
        items: [
          { ...t('close the tap while brushing'), bin: 0 },
          { ...t('take a short shower', '🚿'), bin: 0 },
          { ...t('fix a dripping tap'), bin: 0 },
          { ...t('use bath water for plants', '🌱'), bin: 0 },
          { ...t('leave the tap running'), bin: 1 },
          { ...t('wash the car with a hosepipe', '🚗'), bin: 1 },
          { ...t('play with the hosepipe'), bin: 1 },
          { ...t('fill the bath to the top', '🛁'), bin: 1 },
        ],
        why: 'Closing taps, short showers and reusing water save it. Running taps and hosepipes waste it.',
        hint: 'Does water go down the drain for nothing?',
      });
    const dayNight = () =>
      fromPool(rng, [
        { q: 'Why do we have day and night?', a: t('the Earth turns around', '🌍'), wrong: [t('the Sun switches off'), t('clouds cover the Sun every night')], why: 'The Earth spins. When our side faces the Sun, it is day; when it faces away, it is night.', hint: 'The Earth spins like a top.' },
        { q: 'Does the Moon make its own light?', a: t('no, it shines with light from the Sun', '🌙'), wrong: [t('yes, it is a lamp'), t('yes, it is on fire')], why: 'The Moon reflects the Sun’s light, like a mirror.', hint: 'Only stars make their own light.' },
        { q: 'When is your shadow shortest?', a: t('at midday, when the Sun is high', '☀️'), wrong: [t('early in the morning'), t('late in the afternoon')], why: 'When the Sun is high in the sky, shadows are short.', hint: 'Where is the Sun at lunchtime?' },
        { q: 'Which way does your shadow point?', a: t('away from the Sun'), wrong: [t('towards the Sun'), t('always to the left')], why: 'Your body blocks the light, so the shadow falls on the side away from the Sun.', hint: 'Light cannot go through you.' },
      ]);
    const floatSink = () => {
      const o = rng.pick(FLOATERS);
      return choiceJ(rng, {
        prompt: `Predict: will the ${o.name} float or sink?`,
        say: `Think first. If you put the ${o.name} in water, will it float or sink?`,
        scene: { kind: 'picture', icon: o.icon, caption: o.name },
        correct: { id: o.floats ? 'float' : 'sink', text: o.floats ? 'float' : 'sink', say: o.floats ? 'float' : 'sink', icon: o.floats ? '⬆️' : '⬇️' },
        distractors: [{ id: o.floats ? 'sink' : 'float', text: o.floats ? 'sink' : 'float', say: o.floats ? 'sink' : 'float', icon: o.floats ? '⬇️' : '⬆️', feedback: `${o.why} Test it in a bowl of water!`, code: 'fp-knowledge' }],
        code: 'fp-knowledge',
        keepOrder: true,
        hints: ['Is it heavy for its size? Is there air inside it?'],
        solution: [o.why, 'Test it in a bowl of water to check.'],
      });
    };
    if (g === 1) return [uses, sky, uses, sky, () => (rng.chance(0.5) ? uses() : sky())][level - 1]!();
    if (g === 2) return [sky, save, dayNight, save, dayNight][level - 1]!();
    return [floatSink, dayNight, floatSink, dayNight, floatSink][level - 1]!();
  });

// ---------------------------------------------------------------------------
// Feelings, manners, rights and responsibilities
// ---------------------------------------------------------------------------
const FACES: T[] = [t('happy', '😀'), t('sad', '😢'), t('angry', '😠'), t('scared', '😨'), t('surprised', '😮'), t('tired', '🥱')];

const feelings = (g: FoundationGrade) =>
  fpTemplate('feelings', g, (rng, level) => {
    const face = () => {
      const f = rng.pick(FACES);
      return fact(rng, { q: 'How does this face feel?', scene: { kind: 'picture', icon: f.icon! }, a: t(f.text), wrong: rng.shuffle(FACES.filter((x) => x !== f).map((x) => t(x.text))).slice(0, 2), why: `This face looks ${f.text}.`, hint: 'Look at the eyes and the mouth.' });
    };
    const situation = () =>
      fromPool(rng, [
        { q: 'Your friend shares her lunch with you. How do you feel?', a: t('happy', '😀'), wrong: [t('angry', '😠'), t('scared', '😨')], why: 'When someone is kind to us, we feel happy.', hint: 'Sharing is kind.' },
        { q: 'Your balloon pops. How might you feel?', a: t('sad', '😢'), wrong: [t('happy', '😀'), t('tired', '🥱')], why: 'Losing something you like can make you feel sad.', hint: 'Your balloon is gone.' },
        { q: 'You hear a loud bang in the dark. How might you feel?', a: t('scared', '😨'), wrong: [t('happy', '😀'), t('tired', '🥱')], why: 'Loud noises in the dark can make us feel scared. Tell a grown-up.', hint: 'You don’t know what it was.' },
        { q: 'Someone takes your toy without asking. How might you feel?', a: t('angry', '😠'), wrong: [t('happy', '😀'), t('sleepy', '🥱')], why: 'It is normal to feel angry. Use words to say how you feel.', hint: 'That is not fair.' },
      ]);
    const manners = () =>
      fromPool(rng, [
        { q: 'Someone gives you a present. What do you say?', a: t('thank you'), wrong: [t('go away'), t('sorry')], why: 'We say thank you when someone gives us something.', hint: 'Be polite.' },
        { q: 'You want to borrow a crayon. What do you say?', a: t('please may I borrow it?'), wrong: [t('give it to me!'), t('thank you')], why: 'We say please when we ask for something.', hint: 'It is a magic word.' },
        { q: 'You bump into someone by mistake. What do you say?', a: t('sorry'), wrong: [t('thank you'), t('nothing')], why: 'We say sorry when we hurt someone, even by mistake.', hint: 'You did not mean it, but…' },
        { q: 'Your teacher is talking. What do you do?', a: t('listen and wait my turn', '👂'), wrong: [t('talk at the same time'), t('shout my answer')], why: 'Listening and taking turns are good manners.', hint: 'Whose turn is it?' },
      ]);
    const helping = () =>
      fromPool(rng, [
        { q: 'Lerato fell and hurt her knee. What can you do?', a: t('help her up and call a teacher'), wrong: [t('laugh at her'), t('walk away')], why: 'Helping and getting a grown-up shows you care.', hint: 'How would you feel?' },
        { q: 'A new child is sitting alone. What can you do?', a: t('ask them to play'), wrong: [t('ignore them'), t('tell others not to play with them')], why: 'Asking someone to play is kind. It helps them feel welcome.', hint: 'How would you feel on your first day?' },
        { q: 'Your friend is crying. What can you do?', a: t('ask what is wrong'), wrong: [t('tell them to stop'), t('take their toy')], why: 'Asking shows you care, and you can get help if needed.', hint: 'Be a good friend.' },
      ]);
    const kindSort = () =>
      sort(rng, {
        q: 'Sort them into kind and unkind.',
        bins: [t('kind', '😊'), t('unkind', '😠')],
        items: [
          { ...t('sharing toys'), bin: 0 },
          { ...t('helping a friend'), bin: 0 },
          { ...t('saying thank you'), bin: 0 },
          { ...t('taking turns'), bin: 0 },
          { ...t('pushing in line'), bin: 1 },
          { ...t('calling names'), bin: 1 },
          { ...t('grabbing toys'), bin: 1 },
          { ...t('leaving someone out'), bin: 1 },
        ],
        why: 'Kind actions make others feel good. Unkind actions hurt.',
        hint: 'How would it make someone feel?',
      });
    const anger = () =>
      fromPool(rng, [
        { q: 'You feel very angry. What is a good thing to do?', a: t('take deep breaths and count to ten'), wrong: [t('hit someone'), t('break something')], why: 'Breathing slowly calms your body. Then talk about it.', hint: 'Calm your body first.' },
        { q: 'You feel worried about something. What can you do?', a: t('talk to a grown-up you trust'), wrong: [t('keep it a secret forever'), t('shout at a friend')], why: 'Talking about worries helps. Grown-ups you trust can help.', hint: 'Who can help you?' },
        { q: 'You hurt a friend’s feelings. What should you do?', a: t('say sorry and mean it'), wrong: [t('pretend it did not happen'), t('blame someone else')], why: 'A real apology helps to fix a friendship.', hint: 'Make it right.' },
      ]);
    const rights = () =>
      sort(rng, {
        q: 'Sort them into my rights and my responsibilities.',
        bins: [t('my right', '🛡️'), t('my responsibility', '✅')],
        items: [
          { ...t('to go to school', '🏫'), bin: 0 },
          { ...t('to be safe', '🛡️'), bin: 0 },
          { ...t('to have a name'), bin: 0 },
          { ...t('to have food and clean water', '💧'), bin: 0 },
          { ...t('to play', '⚽'), bin: 0 },
          { ...t('to do my homework', '✏️'), bin: 1 },
          { ...t('to be kind to others'), bin: 1 },
          { ...t('to keep my classroom tidy'), bin: 1 },
          { ...t('to listen to my teacher'), bin: 1 },
        ],
        why: 'The Constitution gives every child rights, like being safe and going to school. Our responsibilities are the things we do to respect others.',
        hint: 'Is it something you get, or something you do?',
      });
    if (g === 1) return [face, situation, manners, manners, () => (rng.chance(0.5) ? face() : situation())][level - 1]!();
    if (g === 2) return [situation, helping, kindSort, helping, kindSort][level - 1]!();
    return [anger, helping, rights, anger, rights][level - 1]!();
  });

// ---------------------------------------------------------------------------
// Family, homes and community
// ---------------------------------------------------------------------------
const community = (g: FoundationGrade) =>
  fpTemplate('community', g, (rng, level) => {
    const family = () =>
      fromPool(rng, [
        { q: 'Who is your mother’s mother?', a: t('grandmother', '👵'), wrong: [t('sister', '👧'), t('aunt', '👩')], why: 'Your mother’s mother is your grandmother.', hint: 'In many homes we call her Gogo.' },
        { q: 'Who is your father’s father?', a: t('grandfather', '👴'), wrong: [t('brother', '👦'), t('uncle', '👨')], why: 'Your father’s father is your grandfather.', hint: 'He is older than your father.' },
        { q: 'Your mother’s sister is your…', a: t('aunt', '👩'), wrong: [t('grandmother', '👵'), t('cousin', '👧')], why: 'Your mother’s sister is your aunt.', hint: 'She is your mother’s sister.' },
        { q: 'Your aunt’s child is your…', a: t('cousin', '🧒'), wrong: [t('uncle', '👨'), t('grandmother', '👵')], why: 'Your aunt’s or uncle’s child is your cousin.', hint: 'You are about the same age.' },
      ]);
    const helpers = () =>
      fromPool(rng, [
        { q: 'Who helps you when you are sick?', a: t('a nurse', '👩‍⚕️'), wrong: [t('a builder', '👷'), t('a farmer', '👨‍🌾')], why: 'Nurses and doctors help us when we are sick.', hint: 'You see them at the clinic.' },
        { q: 'Who puts out fires?', a: t('a firefighter', '👩‍🚒'), wrong: [t('a teacher', '👩‍🏫'), t('a cook', '👩‍🍳')], why: 'Firefighters put out fires and rescue people.', hint: 'They drive a red truck.' },
        { q: 'Who keeps our streets safe?', a: t('a police officer', '👮'), wrong: [t('a nurse', '👩‍⚕️'), t('a farmer', '👨‍🌾')], why: 'Police officers help keep people safe.', hint: 'Call 10111.' },
        { q: 'Who grows our food?', a: t('a farmer', '👨‍🌾'), wrong: [t('a police officer', '👮'), t('a builder', '👷')], why: 'Farmers grow crops and keep animals for food.', hint: 'They work on a farm.' },
        { q: 'Who builds houses?', a: t('a builder', '👷'), wrong: [t('a nurse', '👩‍⚕️'), t('a teacher', '👩‍🏫')], why: 'Builders build houses, schools and bridges.', hint: 'They use bricks.' },
      ]);
    const homes = () =>
      fromPool(rng, [
        { q: 'Which home can you pack up and carry?', a: t('a tent', '⛺'), wrong: [t('a brick house', '🏠'), t('a block of flats', '🏢')], why: 'A tent can be packed up and taken with you.', hint: 'People take it camping.' },
        { q: 'What is a home with many families living on top of each other?', a: t('a block of flats', '🏢'), wrong: [t('a tent', '⛺'), t('a car', '🚗')], why: 'In a block of flats, many homes are built on top of each other.', hint: 'It is tall.' },
        { q: 'Why do people need homes?', a: t('to stay safe, dry and warm', '🏠'), wrong: [t('only to watch TV'), t('to keep cars in')], why: 'A home keeps us safe, dry and warm.', hint: 'Think of a rainy night.' },
      ]);
    const transport = () =>
      sort(rng, {
        q: 'Sort the transport: does it go on land, on water, or in the air?',
        bins: [t('land', '🛣️'), t('water', '🌊'), t('air', '☁️')],
        items: [
          { ...t('bus', '🚌'), bin: 0 },
          { ...t('taxi', '🚐'), bin: 0 },
          { ...t('train', '🚆'), bin: 0 },
          { ...t('bicycle', '🚲'), bin: 0 },
          { ...t('ship', '🚢'), bin: 1 },
          { ...t('sailing boat', '⛵'), bin: 1 },
          { ...t('canoe', '🛶'), bin: 1 },
          { ...t('aeroplane', '✈️'), bin: 2 },
          { ...t('helicopter', '🚁'), bin: 2 },
        ],
        why: 'Buses, taxis, trains and bicycles go on land. Ships and boats go on water. Aeroplanes and helicopters fly.',
        hint: 'Where does it travel?',
        n: 7,
      });
    const places = () =>
      fromPool(rng, [
        { q: 'Where do you go to borrow books?', a: t('a library', '📚'), wrong: [t('a garage'), t('a bank', '🏦')], why: 'A library lends books for free.', hint: 'It is quiet inside.' },
        { q: 'Where do you go to see a nurse?', a: t('a clinic', '🏥'), wrong: [t('a shop', '🏪'), t('a school', '🏫')], why: 'Clinics have nurses who help sick people.', hint: 'When you are sick.' },
        { q: 'Where do you post a letter?', a: t('a post office', '🏤'), wrong: [t('a clinic', '🏥'), t('a church', '⛪')], why: 'The post office sends letters and parcels.', hint: 'It has a postbox.' },
      ]);
    const recycle = () =>
      rng.chance(0.5)
        ? pick(rng, { q: 'Tap everything that can be recycled.', yes: [t('tin can', '🥫'), t('newspaper', '📰'), t('glass bottle', '🍾'), t('cardboard box', '📦')], no: [t('banana peel', '🍌'), t('apple core', '🍎'), t('used tissue', '🤧')], why: 'Tins, paper, glass and cardboard can be made into new things. Peels and cores can go on a compost heap.', hint: 'Could a factory make it into something new?' })
        : fromPool(rng, [
            { q: 'What does reuse mean?', a: t('use something again'), wrong: [t('throw it away'), t('buy a new one')], why: 'Reuse means using something again, like a jar for pencils.', hint: 'Re means again.' },
            { q: 'Where should litter go?', a: t('in a bin', '🗑️'), wrong: [t('on the ground'), t('in the river')], why: 'Litter goes in a bin. Litter in rivers harms fish and birds.', hint: 'Keep our streets clean.' },
            { q: 'What does a plumber fix?', a: t('water pipes and taps', '🔧'), wrong: [t('teeth', '🦷'), t('cars', '🚗')], why: 'A plumber fixes pipes, taps and toilets.', hint: 'Think of a dripping tap.' },
            { q: 'Why should we turn off lights we are not using?', a: t('to save electricity', '💡'), wrong: [t('to make the room cold'), t('so the bulb grows')], why: 'Saving electricity is cheaper and better for the environment.', hint: 'Electricity costs money.' },
          ]);
    if (g === 1) return [family, homes, helpers, family, helpers][level - 1]!();
    if (g === 2) return [helpers, transport, places, transport, places][level - 1]!();
    return [places, helpers, recycle, recycle, recycle][level - 1]!();
  });

const G = [1, 2, 3] as const;
export const LIFESKILLS_TEMPLATES: QuestionTemplate[] = G.flatMap((g) => [myBody(g), healthy(g), safety(g), plants(g), animals(g), weather(g), waterSky(g), feelings(g), community(g)]);
