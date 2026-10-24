/** Natural Sciences & Technology, Grades 4–6: Life and living, Matter and materials. */
import type { QuestionTemplate } from '../types.ts';
import { exact, num, keepNum, cap, poolQuestion, labelQuestion, type PoolItem } from './kit.ts';

// ---------------------------------------------------------------------------
export type LifeClass = 'living' | 'non-living' | 'once-living';
export const THINGS: { name: string; cls: LifeClass; why: string }[] = [
  { name: 'a dog', cls: 'living', why: 'A dog moves, breathes, grows, eats, has puppies, gets rid of waste and senses the world around it.' },
  { name: 'a mango tree', cls: 'living', why: 'A tree grows, makes its own food, takes in air, makes seeds and turns towards light.' },
  { name: 'a mushroom', cls: 'living', why: 'A mushroom is a fungus. It feeds, grows and makes spores to reproduce.' },
  { name: 'a frog', cls: 'living', why: 'A frog does all seven life processes.' },
  { name: 'grass', cls: 'living', why: 'Grass grows, makes food from sunlight and spreads to make new plants.' },
  { name: 'a bean seed', cls: 'living', why: 'A seed is alive but resting. Give it water and warmth and it grows into a plant.' },
  { name: 'an ant', cls: 'living', why: 'An ant moves, feeds, breathes, grows and its colony reproduces.' },
  { name: 'a sunflower', cls: 'living', why: 'A sunflower grows, makes food, takes in air and makes seeds.' },
  { name: 'a rock', cls: 'non-living', why: 'A rock never eats, breathes, grows or reproduces, and was never alive.' },
  { name: 'a cloud', cls: 'non-living', why: 'A cloud moves and changes size, but it is just water droplets. It can\'t feed, breathe or reproduce.' },
  { name: 'a bicycle', cls: 'non-living', why: 'A bicycle is made from metal and rubber. It was never alive.' },
  { name: 'water', cls: 'non-living', why: 'Living things need water, but water itself is not alive.' },
  { name: 'a cellphone', cls: 'non-living', why: 'A cellphone can "sense" touch, but it can\'t grow, feed or reproduce.' },
  { name: 'a fire', cls: 'non-living', why: 'Fire moves, grows and uses air, but it can\'t do all seven life processes. It is a chemical reaction, not a living thing.' },
  { name: 'sand', cls: 'non-living', why: 'Sand is tiny pieces of rock. It was never alive.' },
  { name: 'a wooden chair', cls: 'once-living', why: 'Wood comes from a tree that was alive. The chair itself is no longer living.' },
  { name: 'a sheet of paper', cls: 'once-living', why: 'Paper is made from wood pulp, which came from living trees.' },
  { name: 'a piece of coal', cls: 'once-living', why: 'Coal formed from plants that lived millions of years ago.' },
  { name: 'a leather shoe', cls: 'once-living', why: 'Leather is made from the skin of an animal that was alive.' },
  { name: 'a cotton T-shirt', cls: 'once-living', why: 'Cotton comes from the cotton plant.' },
  { name: 'a dry, fallen leaf', cls: 'once-living', why: 'The leaf was part of a living tree, but it has died.' },
  { name: 'firewood', cls: 'once-living', why: 'Firewood was part of a living tree.' },
];
const LIFE_LABELS: Record<LifeClass, string> = { living: 'Living', 'non-living': 'Non-living (never alive)', 'once-living': 'Was once living' };

const PROCESS = ['Movement', 'Respiration', 'Sensitivity', 'Growth', 'Reproduction', 'Excretion', 'Nutrition'] as const;
const PROCESS_DESC: Record<(typeof PROCESS)[number], string> = {
  Movement: 'moving all or part of the body',
  Respiration: 'using oxygen and food to release energy',
  Sensitivity: 'sensing and reacting to the surroundings',
  Growth: 'getting bigger',
  Reproduction: 'making new living things of the same kind',
  Excretion: 'getting rid of waste',
  Nutrition: 'taking in or making food',
};
const PROCESS_EXAMPLES: { q: string; a: (typeof PROCESS)[number] }[] = [
  { q: 'A hen lays eggs that hatch into chicks.', a: 'Reproduction' },
  { q: 'A puppy gets bigger and heavier every week.', a: 'Growth' },
  { q: 'You sweat on a hot day and breathe out carbon dioxide.', a: 'Excretion' },
  { q: 'A cow eats grass.', a: 'Nutrition' },
  { q: 'A plant\'s leaves make food using sunlight.', a: 'Nutrition' },
  { q: 'A snail pulls into its shell when it is touched.', a: 'Sensitivity' },
  { q: 'Your pupils get smaller in bright light.', a: 'Sensitivity' },
  { q: 'A cheetah runs after a springbok.', a: 'Movement' },
  { q: 'Your body uses food and oxygen to release energy.', a: 'Respiration' },
  { q: 'A fish takes oxygen from water through its gills to release energy.', a: 'Respiration' },
  { q: 'A sheep\'s body gets rid of urine.', a: 'Excretion' },
  { q: 'A bird flaps its wings to fly.', a: 'Movement' },
  { q: 'A spider plant grows small new plants on long stems.', a: 'Reproduction' },
];

const TRAPS: PoolItem[] = [
  { q: 'A fire moves, grows bigger and uses oxygen from the air. Is fire alive?', a: 'No: it can\'t do all seven life processes', wrong: [['Yes: it moves, grows and uses oxygen', 'Doing two or three life processes isn\'t enough. Fire can\'t reproduce itself or take in food, and it has no cells.'], ['Yes, but only when it is burning', 'Fire is never alive: it is a chemical reaction.'], ['Nobody knows', 'Scientists agree: living things do all seven life processes. Fire doesn\'t.']], why: 'Living things must do **all** seven life processes. Fire seems to move, grow and "breathe", but it doesn\'t feed, reproduce or excrete like living things do.' },
  { q: 'A car moves, uses fuel ("food") and gives off waste gases. Is a car alive?', a: 'No: it doesn\'t grow or reproduce', wrong: [['Yes: it moves, feeds and excretes', 'A car only looks like it does these. It can\'t grow, reproduce or sense like a living thing.'], ['Yes, while the engine is running', 'Switching an engine on doesn\'t make a car alive.'], ['Only electric cars are alive', 'No machine is alive: none of them grow or reproduce.']], why: 'A car is a machine. It can\'t grow, reproduce or repair itself, so it is non-living.' },
  { q: 'A bean seed in a packet looks dry and doesn\'t move. Is it living?', a: 'Yes: it is resting, and will grow when it gets water and warmth', wrong: [['No: it doesn\'t move or eat', 'A seed is dormant (resting). It is still alive, which is why it can grow into a plant.'], ['It was once living', 'A seed is still alive. That is how it can germinate.'], ['It is non-living until it is planted', 'Planting doesn\'t bring a seed to life. It was alive all along, just resting.']], why: 'A seed is **dormant**: alive but resting. With water, air and warmth it germinates and grows.' },
  { q: 'A robot vacuum cleaner moves around a room, senses walls and collects dust. Is it alive?', a: 'No: it can\'t grow, reproduce or feed itself', wrong: [['Yes: it moves and senses', 'Moving and sensing are only two of the seven life processes.'], ['Yes, because it "eats" dust', 'Collecting dust isn\'t nutrition: the robot doesn\'t use it to grow or get energy.'], ['It was once living', 'A robot was never alive. It is made of plastic and metal.']], why: 'Machines can copy some life processes, but they can\'t grow, reproduce or get energy from food. A robot is non-living.' },
  { q: 'Crystals of salt can "grow" bigger in a jar of salty water. Are they alive?', a: 'No: they get bigger by adding layers, not by living processes', wrong: [['Yes: they grow', 'Growing on its own doesn\'t make something alive. Crystals don\'t feed, breathe or reproduce.'], ['Yes, while they are in water', 'Being in water doesn\'t make crystals alive.'], ['They were once living', 'Salt crystals were never alive.']], why: 'Crystals get bigger by adding more salt to their outside. That isn\'t growth in the living sense: they don\'t feed, respire, sense or reproduce.' },
  { q: 'A dry log has been lying in the veld for a year. What is it?', a: 'Was once living', wrong: [['Living', 'The tree it came from was alive, but the log no longer grows, feeds or breathes.'], ['Non-living, never alive', 'The log came from a living tree, so it was once living.'], ['Living, because mushrooms grow on it', 'Living things may grow on the log, but the log itself is dead.']], why: 'The log was part of a living tree, so it **was once living**.' },
];

export const livingNonliving: QuestionTemplate = {
  id: 'living-nonliving',
  skillId: 'living-nonliving',
  generate(rng, level) {
    if (level === 1) {
      const t = rng.pick(THINGS.filter((x) => x.cls !== 'once-living'));
      return labelQuestion(rng, { prompt: `Is ${t.name} living or non-living?`, labels: { living: 'Living', 'non-living': 'Non-living' }, answer: t.cls as 'living' | 'non-living', why: t.why, code: 'life-processes', hint: 'Does it do all seven life processes: Move, Respire, Sense, Grow, Reproduce, Excrete and take in Nutrition (MRS GREN)?' });
    }
    if (level === 2) {
      const t = rng.pick(THINGS);
      return labelQuestion(rng, { prompt: `Sort ${t.name}: is it living, non-living, or was it once living?`, labels: LIFE_LABELS, answer: t.cls, why: t.why, code: 'life-processes', hint: 'Was it ever part of a living thing? Is it still alive now?' });
    }
    if (level === 3) {
      const e = rng.pick(PROCESS_EXAMPLES);
      const wrong = rng.shuffle(PROCESS.filter((p) => p !== e.a)).slice(0, 3);
      return poolQuestion(rng, { q: `${e.q} Which life process is this?`, a: e.a, wrong: wrong.map((w) => [w, `${w} means ${PROCESS_DESC[w]}.`]), why: `This is **${e.a.toLowerCase()}**: ${PROCESS_DESC[e.a]}.` }, 'life-processes', 'MRS GREN: Movement, Respiration, Sensitivity, Growth, Reproduction, Excretion, Nutrition.');
    }
    if (level === 4) return poolQuestion(rng, rng.pick(TRAPS), 'life-processes', 'A living thing must do all seven life processes, not just some.');
    const set = rng.shuffle(THINGS).slice(0, 6);
    const living = set.filter((x) => x.cls === 'living').length;
    const once = set.filter((x) => x.cls === 'once-living').length;
    return {
      prompt: `How many of these are **living** right now? ${set.map((x) => x.name).join(', ')}.`,
      input: { kind: 'numeric' },
      answer: exact(living),
      answerDisplay: String(living),
      hints: ['Go through them one by one. "Was once living" doesn\'t count as living now.'],
      solution: [`Living: ${set.filter((x) => x.cls === 'living').map((x) => x.name).join(', ') || 'none'}.`, `That is ${living}.`],
      misconceptions: keepNum(once ? [{ code: 'life-processes', answer: exact(living + once), feedback: `You counted things that were once living (like ${set.find((x) => x.cls === 'once-living')!.name}). They are not alive now.` }] : [], living),
    };
  },
};

// ---------------------------------------------------------------------------
const PARTS = [
  { part: 'roots', job: 'taking in water and minerals from the soil, and holding the plant in place' },
  { part: 'stem', job: 'holding the plant up and carrying water to the leaves' },
  { part: 'leaves', job: 'making food for the plant using sunlight' },
  { part: 'flower', job: 'making seeds so new plants can grow' },
  { part: 'fruit', job: 'protecting the seeds and helping to spread them' },
  { part: 'seed', job: 'growing into a new plant' },
];
const PLANTS4 = ['a bean plant', 'a mielie (maize) plant', 'a sunflower', 'a tomato plant', 'a pumpkin plant', 'a spekboom'];
const EXPERIMENTS: PoolItem[] = [
  { q: 'Lerato grows two bean plants. One is in a dark cupboard and one is on a sunny windowsill. Both get the same water. After a week the cupboard plant is pale and yellow. What does this show?', a: 'Plants need light to stay healthy and green', wrong: [['Plants need water', 'Both plants got the same water, so water isn\'t what was tested.'], ['Plants grow better in cupboards', 'The cupboard plant is unhealthy: pale and yellow.'], ['Plants need soil', 'Both plants had soil. Only the light was different.']], why: 'Only the light was different, so the test shows plants need **light**. Without it they can\'t make food and turn pale.' },
  { q: 'Sipho waters one seedling every day and doesn\'t water the other. Both are in the sun. After four days one has drooped and wilted. What does this show?', a: 'Plants need water', wrong: [['Plants need sunlight', 'Both were in the sun. Only the water was different.'], ['Plants need to be touched', 'Neither was touched. Only the water changed.'], ['The wilted plant was a different kind', 'In a fair test both plants are the same kind. Only the water was changed.']], why: 'Only the water was different, so the test shows plants need **water**.' },
  { q: 'Thandi grows one plant in rich garden soil and one in plain washed sand. Both get water and light. The one in sand grows slowly with small leaves. What does this show?', a: 'Plants need nutrients (minerals) from the soil', wrong: [['Plants need light', 'Both got light. The soil was the only difference.'], ['Plants don\'t need soil at all', 'The plant in sand did worse, so the soil helped.'], ['Sand is too heavy for roots', 'The difference is the nutrients in garden soil, not the weight.']], why: 'Garden soil has **nutrients** (minerals) that plants need to grow well. Washed sand has very few.' },
  { q: 'Kagiso covers the leaves of one plant with petroleum jelly so air can\'t get in. The other plant\'s leaves are left alone. The covered plant dies. What does this show?', a: 'Plants need air', wrong: [['Plants need petroleum jelly', 'The jelly harmed the plant by blocking the air.'], ['Plants need water', 'Both plants got water. Only the air to the leaves was blocked.'], ['Leaves are not important', 'Blocking the leaves killed the plant, so they are very important.']], why: 'Leaves take in **air** (carbon dioxide) through tiny holes. Blocking them stopped the plant from making food.' },
  { q: 'Ayanda plants 20 seeds close together in one small pot and 4 seeds in another pot of the same size. The crowded seedlings are thin and weak. What does this show?', a: 'Plants need space', wrong: [['Plants need more seeds', 'More seeds made it worse: they competed with each other.'], ['Seeds don\'t need soil', 'Both pots had soil. The number of seeds was different.'], ['Small pots are always bad', 'Both pots were the same size. Only the crowding was different.']], why: 'Crowded plants compete for light, water and nutrients. Plants need **space** to grow well.' },
  { q: 'Naledi puts one pot of seeds in the fridge and one in a warm room. Both are watered. Only the warm seeds sprout. What does this show?', a: 'Seeds need warmth to germinate (start growing)', wrong: [['Seeds need light to sprout', 'The fridge is dark, but so is soil. Temperature is what was tested.'], ['Seeds need cold', 'The cold seeds didn\'t sprout.'], ['Fridges have no air', 'Fridges do have air. The difference is the temperature.']], why: 'Only the temperature was different. Seeds need **warmth** to germinate.' },
];
const FAIR = [
  { test: 'whether fertiliser helps bean plants grow taller', change: 'The amount of fertiliser', same: ['The amount of water each plant gets', 'The type of bean', 'The size of the pots'] },
  { test: 'whether plants grow better in sunlight or shade', change: 'How much light each plant gets', same: ['The amount of water', 'The type of soil', 'The kind of plant'] },
  { test: 'how the amount of water affects how fast cress seeds sprout', change: 'The amount of water each pot gets', same: ['The number of seeds in each pot', 'Where the pots are kept', 'The type of seed'] },
  { test: 'whether seeds sprout faster when it is warmer', change: 'The temperature', same: ['The amount of water', 'The type and number of seeds', 'The type of soil'] },
  { test: 'which type of soil is best for growing spinach', change: 'The type of soil', same: ['The amount of water', 'The amount of sunlight', 'The size of the seedlings'] },
];

export const plantNeeds: QuestionTemplate = {
  id: 'plant-needs',
  skillId: 'plant-needs',
  generate(rng, level) {
    if (level === 1 || level === 2) {
      const p = rng.pick(PARTS);
      const plant = rng.pick(PLANTS4);
      const others = rng.shuffle(PARTS.filter((x) => x !== p)).slice(0, 3);
      const why = `The job of the **${p.part}** is ${p.job}.`;
      if (level === 1) return poolQuestion(rng, { q: `What is the job of the ${p.part} of ${plant}?`, a: cap(p.job), wrong: others.map((o) => [cap(o.job), `That is the job of the ${o.part}.`]), why }, 'plant-parts', 'Think about where the part is: underground, in the middle, or up in the light?');
      return poolQuestion(rng, { q: `Which part of ${plant} has this job: ${p.job}?`, a: cap(p.part), wrong: others.map((o) => [cap(o.part), `The job of the ${o.part} is ${o.job}.`]), why }, 'plant-parts', 'Picture the plant from the bottom (roots) to the top (flowers).');
    }
    if (level === 3) return poolQuestion(rng, rng.pick(EXPERIMENTS), 'plant-parts', 'Look for the one thing that was different between the two plants.');
    if (level === 4) {
      const f = rng.pick(FAIR);
      const askChange = rng.chance(0.5);
      if (askChange) return poolQuestion(rng, { q: `Sizwe wants to test ${f.test}. In a fair test, what should he change?`, a: f.change, wrong: f.same.map((x) => [x, 'That must stay the same, or he won\'t know what caused any difference.']), why: `In a fair test you change only **one** thing: ${f.change.toLowerCase()}. Everything else stays the same.` }, 'plant-parts', 'A fair test changes just one thing: the thing being tested.');
      const keep = rng.pick(f.same);
      return poolQuestion(rng, { q: `Sizwe wants to test ${f.test}. Which of these must he keep the **same** for every plant?`, a: keep, wrong: [[f.change, 'That is the one thing he changes: it is what he is testing.'], ['Nothing: he can change everything', 'If he changes everything he won\'t know what caused the difference.'], ['Only the colour of the pots matters', 'Pot colour hardly matters. Keep the important things the same.']], why: `${keep} must stay the same so that only ${f.change.toLowerCase()} is different.` }, 'plant-parts', 'Everything except the thing being tested must stay the same.');
    }
    const days = rng.pick([5, 7, 10]);
    const rate = rng.int(1, 4);
    const start = rng.int(2, 8);
    const end = start + rate * days;
    return {
      prompt: `A bean seedling was ${start} cm tall on day 1. ${days} days later it was ${end} cm tall. On average, how many centimetres did it grow each day?`,
      input: { kind: 'numeric', unit: 'cm' },
      answer: num(rate, 0.001),
      answerDisplay: `${rate} cm per day`,
      hints: ['First find how much it grew altogether.', `Then share that growth over ${days} days.`],
      solution: [`Growth: $${end} - ${start} = ${end - start}$ cm.`, `Per day: $${end - start} \\div ${days} = ${rate}$ cm.`],
      misconceptions: keepNum(
        [
          { code: 'probable-slip', answer: exact(end - start), feedback: `${end - start} cm is the total growth. Divide by ${days} to get the growth per day.` },
          { code: 'probable-slip', answer: num(end / days, 0.01), feedback: 'Use how much it grew (end height minus start height), not the end height.' },
        ],
        rate,
      ),
    };
  },
};

// ---------------------------------------------------------------------------
export const CYCLES: { who: string; stages: string[]; notes: string }[] = [
  { who: 'a frog', stages: ['egg (frogspawn)', 'tadpole', 'froglet', 'adult frog'], notes: 'Tadpoles live in water and breathe with gills; adult frogs breathe with lungs.' },
  { who: 'a butterfly', stages: ['egg', 'caterpillar (larva)', 'pupa (chrysalis)', 'adult butterfly'], notes: 'Inside the pupa, the caterpillar\'s body is completely rebuilt: complete metamorphosis.' },
  { who: 'a chicken', stages: ['egg', 'chick', 'young chicken', 'adult hen'], notes: 'A chick hatches looking like a small version of its parents.' },
  { who: 'a bean plant', stages: ['seed', 'seedling', 'adult plant with flowers', 'bean pod with seeds'], notes: 'The seeds in the pod can grow into new plants, starting the cycle again.' },
  { who: 'a mosquito', stages: ['egg', 'larva', 'pupa', 'adult mosquito'], notes: 'Mosquito larvae and pupae live in still water, which is why we empty standing water.' },
  { who: 'a dung beetle', stages: ['egg', 'larva (grub)', 'pupa', 'adult beetle'], notes: 'Dung beetles lay their eggs inside balls of dung, which the larvae eat.' },
];
const META: PoolItem[] = [
  { q: 'What is the caterpillar stage of a butterfly also called?', a: 'The larva', wrong: [['The pupa', 'The pupa (chrysalis) comes after the caterpillar.'], ['The adult', 'The adult is the butterfly with wings.'], ['The egg', 'The caterpillar hatches out of the egg.']], why: 'A caterpillar is the **larva** of a butterfly. It eats and grows before becoming a pupa.' },
  { q: 'How does a tadpole breathe underwater?', a: 'Through gills', wrong: [['Through lungs', 'Adult frogs have lungs. Tadpoles use gills, like fish.'], ['Through its tail', 'The tail is for swimming.'], ['It holds its breath', 'Tadpoles live in water all the time, taking oxygen from the water with gills.']], why: 'Tadpoles breathe with **gills**. As they become frogs they grow lungs.' },
  { q: 'Which of these animals goes through a pupa stage?', a: 'A butterfly', wrong: [['A frog', 'Frogs change from tadpoles to frogs, but they have no pupa stage.'], ['A chicken', 'A chick hatches and simply grows bigger.'], ['A dog', 'Puppies are born looking like small dogs.']], why: 'Insects like butterflies, beetles and mosquitoes have a **pupa** stage, when the body is rebuilt.' },
  { q: 'What does "metamorphosis" mean?', a: 'A big change in body shape as an animal grows up', wrong: [['Laying eggs', 'Many animals lay eggs without metamorphosis.'], ['Growing bigger without changing shape', 'That is just growth. Metamorphosis is a change of body form.'], ['Shedding fur in summer', 'That is moulting, not metamorphosis.']], why: '**Metamorphosis** is a big change in body form, like a tadpole becoming a frog or a caterpillar becoming a butterfly.' },
  { q: 'Why does a frog lay so many eggs (often hundreds)?', a: 'Most eggs and tadpoles get eaten or die, so only a few grow up', wrong: [['Frogs need lots of eggs to eat', 'Frogs don\'t eat their own eggs for food.'], ['Each egg makes only part of a frog', 'Each egg can become one whole frog.'], ['To fill the pond', 'The reason is survival: few eggs make it to adulthood.']], why: 'Fish, birds and insects eat many eggs and tadpoles. Laying lots means a few **survive** to become adults.' },
  { q: 'Which stage comes first in every animal life cycle shown in this lesson?', a: 'An egg', wrong: [['A baby', 'In these cycles the young hatch from eggs first.'], ['An adult', 'Adults come last: they lay the eggs that start the cycle again.'], ['A pupa', 'Only insects have a pupa, and it comes in the middle.']], why: 'These cycles all start with an **egg** and end with an adult that lays eggs again.' },
  { q: 'Why is it important to empty buckets of standing water near houses?', a: 'Mosquito larvae grow in still water', wrong: [['Water attracts lightning', 'That isn\'t the reason.'], ['Frogs might lay eggs in it', 'Frogs are harmless. Mosquitoes carry diseases like malaria.'], ['The water goes bad and smells', 'It might, but the real health reason is mosquitoes.']], why: 'Mosquitoes lay eggs in still water, and their larvae and pupae grow there. Emptying it breaks their **life cycle**.' },
];

export const lifeCycles: QuestionTemplate = {
  id: 'life-cycles',
  skillId: 'life-cycles',
  generate(rng, level) {
    const c = rng.pick(CYCLES);
    if (level === 1 || level === 2) {
      const i = level === 1 ? rng.int(0, 2) : rng.int(1, 2);
      const target = c.stages[i + (level === 1 ? 1 : 0)]!;
      const others = c.stages.filter((x) => x !== target);
      const q = level === 1 ? `In the life cycle of ${c.who}, what comes after the ${c.stages[i]}?` : `In the life cycle of ${c.who}, which stage comes between the ${c.stages[i - 1]} and the ${c.stages[i + 1]}?`;
      return poolQuestion(rng, { q, a: cap(target), wrong: others.map((o) => [cap(o), `The life cycle of ${c.who} is: ${c.stages.join(' → ')}.`]), why: `${cap(c.stages.join(' → '))}. ${c.notes}` }, 'life-cycle-order', 'Start at the egg (or seed) and go step by step to the adult.');
    }
    if (level === 3) return poolQuestion(rng, rng.pick(META), 'life-cycle-order', 'Think about how the young animal is different from the adult.');
    if (level === 4) {
      const right = c.stages.join(' → ');
      const perms = new Set<string>();
      while (perms.size < 3) {
        const p = rng.shuffle(c.stages).join(' → ');
        if (p !== right) perms.add(p);
      }
      return poolQuestion(rng, { q: `Which shows the life cycle of ${c.who} in the right order?`, a: cap(right), wrong: [...perms].map((p) => [cap(p), 'Start with the egg or seed and finish with the adult.']), why: `${cap(right)}. ${c.notes}` }, 'life-cycle-order', 'What hatches or sprouts first? What can make the next eggs or seeds?');
    }
    const insect = rng.pick(['butterfly', 'mosquito', 'dung beetle'] as const);
    const e = rng.int(3, 8);
    const l = rng.int(10, 21);
    const p = rng.int(5, 14);
    const total = e + l + p;
    return {
      prompt: `A ${insect} egg hatches after ${e} days. The larva stage lasts ${l} days and the pupa stage lasts ${p} days. How many days is it from the egg being laid to the adult ${insect}?`,
      input: { kind: 'numeric', unit: 'days' },
      answer: exact(total),
      answerDisplay: `${total} days`,
      hints: ['Add the time for each stage before the adult.'],
      solution: [`$${e} + ${l} + ${p} = ${total}$ days.`],
      misconceptions: keepNum([{ code: 'life-cycle-order', answer: exact(l + p), feedback: 'Remember the egg stage too: the cycle starts when the egg is laid.' }], total),
    };
  },
};

// ---------------------------------------------------------------------------
type St = 'solid' | 'liquid' | 'gas';
const STATE_LABELS: Record<St, string> = { solid: 'Solid', liquid: 'Liquid', gas: 'Gas' };
export const EVERYDAY: { name: string; st: St; why: string }[] = [
  { name: 'a rock', st: 'solid', why: 'A rock keeps its own shape.' },
  { name: 'milk', st: 'liquid', why: 'Milk flows and takes the shape of the glass.' },
  { name: 'steam from a kettle', st: 'gas', why: 'Steam is water as a gas. (The white cloud you see is tiny droplets that have already cooled.)' },
  { name: 'an ice cube', st: 'solid', why: 'Ice keeps its shape: it is solid water.' },
  { name: 'the air in a balloon', st: 'gas', why: 'Air spreads out to fill the whole balloon.' },
  { name: 'honey', st: 'liquid', why: 'Honey flows slowly, but it still flows and takes the shape of its jar.' },
  { name: 'a wooden spoon', st: 'solid', why: 'Wood keeps its shape.' },
  { name: 'cooking oil', st: 'liquid', why: 'Oil pours and takes the shape of its container.' },
  { name: 'orange juice', st: 'liquid', why: 'Juice flows and fills the bottom of its glass.' },
  { name: 'the gas in a braai gas bottle', st: 'gas', why: 'It is stored as a gas (and partly squashed into a liquid under pressure). It spreads out when released.' },
  { name: 'a grain of sand', st: 'solid', why: 'Each grain keeps its shape. Sand pours only because the grains are tiny.' },
  { name: 'butter from the fridge', st: 'solid', why: 'Cold butter keeps its shape. It melts into a liquid when heated.' },
];
const PROPS: { p: string; st: St }[] = [
  { p: 'keeps its own shape, even when you move it to a new container', st: 'solid' },
  { p: 'flows and takes the shape of the bottom of its container', st: 'liquid' },
  { p: 'spreads out to fill the whole container, whatever its size', st: 'gas' },
  { p: 'can easily be squashed into a smaller space', st: 'gas' },
  { p: 'can be poured, and keeps the same amount (volume) when poured', st: 'liquid' },
  { p: 'cannot be poured and cannot be squashed', st: 'solid' },
];
const CHANGES: PoolItem[] = [
  { q: 'An ice lolly left in the sun becomes runny. What is this change called?', a: 'Melting', wrong: [['Freezing', 'Freezing is liquid turning to solid. Here a solid turns to liquid.'], ['Evaporation', 'Evaporation is a liquid turning into a gas.'], ['Condensation', 'Condensation is a gas turning into a liquid.']], why: 'A solid turning into a liquid when heated is **melting**.' },
  { q: 'Water in an ice tray turns hard in the freezer. What is this change called?', a: 'Freezing', wrong: [['Melting', 'Melting is solid to liquid. Here liquid becomes solid.'], ['Boiling', 'Boiling needs heat. The freezer cools the water.'], ['Condensation', 'Condensation is gas to liquid.']], why: 'A liquid turning into a solid when cooled is **freezing**.' },
  { q: 'A puddle disappears on a hot, sunny day. Where did the water go?', a: 'It evaporated into the air as water vapour', wrong: [['It soaked away and was destroyed', 'Water isn\'t destroyed. Some soaks in, but most evaporates into the air.'], ['It melted', 'Melting is solid to liquid. The puddle was already liquid.'], ['It froze', 'It was hot, not cold.']], why: 'The Sun\'s heat made the water **evaporate**: it turned into an invisible gas, water vapour.' },
  { q: 'Drops of water form on the outside of a glass of cold juice. Where do they come from?', a: 'Water vapour in the air condenses on the cold glass', wrong: [['The juice leaks through the glass', 'Glass doesn\'t leak. The water comes from the air.'], ['The glass is melting', 'Glass doesn\'t melt at room temperature.'], ['The ice is evaporating', 'Evaporation would make vapour, not drops.']], why: 'Air contains water vapour. When it touches the cold glass it cools and **condenses** into liquid drops.' },
  { q: 'Candle wax drips down the side of a candle and becomes hard again. Which changes happened?', a: 'Melting, then freezing (solidifying)', wrong: [['Evaporation, then condensation', 'The wax went from solid to liquid and back, not into a gas.'], ['Only melting', 'It became hard again, which is a second change.'], ['Burning only', 'Some wax burns, but the drips melted and then solidified.']], why: 'The heat **melted** the wax. The drips cooled and **solidified** (froze) again.' },
  { q: 'A pot of water on the stove bubbles and steam comes off. What is happening to the water?', a: 'It is boiling: turning into a gas', wrong: [['It is melting', 'The water is already a liquid.'], ['It is condensing', 'Condensation is gas turning to liquid, the opposite.'], ['It is freezing', 'It is being heated, not cooled.']], why: 'At 100 °C water **boils**: it turns into water vapour (a gas) throughout the liquid.' },
];
const TRICKY: PoolItem[] = [
  { q: 'Sand can be poured like a liquid. Is sand a solid or a liquid?', a: 'A solid: each grain keeps its own shape', wrong: [['A liquid, because it pours', 'It pours because the grains are tiny. Look at one grain: it keeps its shape.'], ['A gas', 'Sand doesn\'t spread out to fill a container.'], ['Half solid, half liquid', 'Each grain is a solid. A pile of sand is lots of tiny solids.']], why: 'Sand is a **solid**. Each grain keeps its shape; the pile pours because the grains are so small.' },
  { q: 'Honey flows very slowly. Is it a solid or a liquid?', a: 'A liquid: it flows and takes the shape of its container', wrong: [['A solid, because it is thick', 'Being thick only means it flows slowly. It still flows.'], ['A gas', 'Honey doesn\'t spread out to fill a jar.'], ['Neither', 'Honey is a thick (viscous) liquid.']], why: 'Honey is a thick **liquid**. Given time, it flows and takes the shape of its jar.' },
  { q: 'Is the air inside a bicycle tyre a solid, a liquid or a gas?', a: 'A gas, squashed into the tyre', wrong: [['A solid, because the tyre is hard', 'The tyre feels hard because lots of air is squashed inside it.'], ['A liquid', 'Air doesn\'t flow to the bottom of the tyre: it fills all of it.'], ['Nothing: the tyre is empty', 'The tyre is full of air that has been pumped in.']], why: 'Air is a **gas**. Gases can be squashed, which is why we can pump so much into a tyre.' },
  { q: 'A sponge can be squashed. Is a sponge a gas?', a: 'No: it is a solid with air in its holes', wrong: [['Yes, because it squashes', 'You are squeezing the air out of its holes. The sponge material is a solid.'], ['It is a liquid', 'A dry sponge doesn\'t flow.'], ['It is half gas', 'The sponge is a solid. The holes are full of air, a gas.']], why: 'A sponge is a **solid** full of tiny holes. Squeezing pushes the air (a gas) out of the holes.' },
  { q: 'Salt can be poured from a salt cellar. Is salt a liquid?', a: 'No: salt is a solid made of tiny crystals', wrong: [['Yes, because it pours', 'It pours because the crystals are tiny, like sand.'], ['It is a gas', 'Salt doesn\'t spread out to fill a container.'], ['It is a liquid when it is warm', 'Salt only melts at around 800 °C!']], why: 'Salt is a **solid**: tiny crystals that each keep their shape.' },
  { q: 'Smoke rises and spreads out across a room. What state are the hot gases in smoke?', a: 'Gas (carrying tiny bits of solid soot)', wrong: [['Solid', 'The soot bits are solid, but the hot gases carrying them are gas.'], ['Liquid', 'Smoke doesn\'t pour or collect at the bottom.'], ['Smoke is not matter', 'Smoke is matter: gases and tiny solid particles.']], why: 'Smoke is mostly hot **gases** that spread out, carrying tiny solid particles of soot.' },
];

export const matterProperties: QuestionTemplate = {
  id: 'matter-properties',
  skillId: 'matter-properties',
  generate(rng, level) {
    if (level === 1) {
      const t = rng.pick(EVERYDAY);
      return labelQuestion(rng, { prompt: `Is ${t.name} a solid, a liquid or a gas?`, labels: STATE_LABELS, answer: t.st, why: t.why, code: 'states-properties', hint: 'Does it keep its shape (solid), flow (liquid) or spread out to fill its container (gas)?' });
    }
    if (level === 2) {
      const p = rng.pick(PROPS);
      return labelQuestion(rng, { prompt: `Something ${p.p}. Is it a solid, a liquid or a gas?`, labels: STATE_LABELS, answer: p.st, why: `Only a ${p.st} ${p.p}.`, code: 'states-properties', hint: 'Solids keep their shape. Liquids flow but keep their volume. Gases spread out and can be squashed.' });
    }
    if (level === 3) return poolQuestion(rng, rng.pick(CHANGES), 'states-properties', 'Is it being heated or cooled? What does it change from, and into?');
    if (level === 4) return poolQuestion(rng, rng.pick(TRICKY), 'states-properties', 'Look closely at one small piece. Does it keep its shape?');
    const item = rng.pick([
      { what: 'Butter', mp: 32 },
      { what: 'Chocolate', mp: 34 },
      { what: 'Candle wax', mp: 55 },
      { what: 'Ice', mp: 0 },
    ]);
    const temp = item.mp === 0 ? rng.pick([-8, -3, 4, 12, 25]) : rng.pick([item.mp - 12, item.mp - 6, item.mp + 4, item.mp + 10]);
    const melts = temp > item.mp;
    return labelQuestion(rng, {
      prompt: `${item.what} melts at about ${item.mp} °C. It is left in a place where the temperature is ${temp < 0 ? '−' : ''}${Math.abs(temp)} °C. What happens?`,
      labels: { melts: 'It melts into a liquid', stays: 'It stays solid' },
      answer: melts ? 'melts' : 'stays',
      why: melts ? `${temp} °C is higher than its melting point (${item.mp} °C), so it melts.` : `${temp < 0 ? '−' : ''}${Math.abs(temp)} °C is lower than its melting point (${item.mp} °C), so it stays solid.`,
      code: 'states-properties',
      hint: 'Is the temperature above or below the melting point?',
    });
  },
};

// ---------------------------------------------------------------------------
export interface Material {
  name: string;
  metal: boolean;
  magnetic: boolean;
  conducts: boolean;
  shiny: boolean;
}
export const MATERIALS_TEST: Material[] = [
  { name: 'an iron nail', metal: true, magnetic: true, conducts: true, shiny: true },
  { name: 'a steel paperclip', metal: true, magnetic: true, conducts: true, shiny: true },
  { name: 'copper wire', metal: true, magnetic: false, conducts: true, shiny: true },
  { name: 'aluminium foil', metal: true, magnetic: false, conducts: true, shiny: true },
  { name: 'a gold ring', metal: true, magnetic: false, conducts: true, shiny: true },
  { name: 'a silver spoon', metal: true, magnetic: false, conducts: true, shiny: true },
  { name: 'a plastic ruler', metal: false, magnetic: false, conducts: false, shiny: false },
  { name: 'a wooden peg', metal: false, magnetic: false, conducts: false, shiny: false },
  { name: 'a glass marble', metal: false, magnetic: false, conducts: false, shiny: true },
  { name: 'pencil lead (graphite)', metal: false, magnetic: false, conducts: true, shiny: false },
  { name: 'a rubber band', metal: false, magnetic: false, conducts: false, shiny: false },
  { name: 'a piece of chalk', metal: false, magnetic: false, conducts: false, shiny: false },
  { name: 'a cork', metal: false, magnetic: false, conducts: false, shiny: false },
];
const USES: PoolItem[] = [
  { q: 'Why are electrical wires made of copper?', a: 'Copper conducts electricity very well', wrong: [['Copper is magnetic', 'Copper isn\'t magnetic. It is used because it conducts electricity.'], ['Copper is cheap and soft like plastic', 'Its main job in a wire is to conduct electricity.'], ['Copper stops electricity', 'The opposite: it lets electricity flow easily.']], why: 'Copper is an excellent **conductor** of electricity, so current flows easily through it.' },
  { q: 'Why are electrical wires covered in plastic?', a: 'Plastic is an insulator, so it stops shocks', wrong: [['Plastic conducts electricity', 'Plastic does NOT conduct electricity. That is why it is used as a cover.'], ['Plastic makes the wire magnetic', 'Plastic isn\'t magnetic.'], ['To make the wire shiny', 'The plastic is there for safety, not looks.']], why: 'Plastic is an electrical **insulator**. It keeps the current inside the copper and protects you.' },
  { q: 'Why are cooking pots made of metal but have handles of plastic or wood?', a: 'Metal conducts heat to the food; plastic and wood insulate your hand', wrong: [['Metal is lighter than plastic', 'Metal is usually heavier. The reason is heat.'], ['Plastic handles look nicer', 'The handle is there to keep your hand from being burnt.'], ['Metal is magnetic', 'Not all metal pots are magnetic, and that isn\'t why metal is used.']], why: 'Metals are good **conductors** of heat, so the pot heats food. Plastic and wood are **insulators**, so the handle stays cool.' },
  { q: 'Why is gold used for jewellery?', a: 'It is shiny and does not rust or go dull', wrong: [['It is magnetic', 'Gold is not magnetic.'], ['It is a good insulator', 'Gold conducts electricity well. It is used for jewellery because it stays shiny.'], ['It is very light', 'Gold is actually very heavy (dense).']], why: 'Gold stays **shiny** and doesn\'t rust, so jewellery keeps looking good for years.' },
  { q: 'Why is aluminium used to make cooldrink cans and aeroplane bodies?', a: 'It is light, strong and does not rust easily', wrong: [['It is magnetic', 'Aluminium is not magnetic.'], ['It doesn\'t conduct heat', 'Aluminium conducts heat well.'], ['It is the heaviest metal', 'It is one of the lightest metals, which is why planes use it.']], why: 'Aluminium is **light** but strong, and it doesn\'t rust easily.' },
  { q: 'Why can a magnet be used to sort steel cans from aluminium cans at a recycling plant?', a: 'Steel is magnetic but aluminium is not', wrong: [['All metals are magnetic', 'Most metals are not magnetic. Only iron, steel, nickel and cobalt are.'], ['Aluminium is magnetic but steel is not', 'It is the other way round.'], ['The magnet makes the cans shiny', 'The magnet pulls out the steel cans.']], why: 'Only a few metals are **magnetic**: iron, steel, nickel and cobalt. Aluminium isn\'t, so it stays behind.' },
];

export const metalsNonmetals: QuestionTemplate = {
  id: 'metals-nonmetals',
  skillId: 'metals-nonmetals',
  generate(rng, level) {
    const m = rng.pick(MATERIALS_TEST);
    if (level === 1) return labelQuestion(rng, { prompt: `Is ${m.name} made of a metal or a non-metal?`, labels: { metal: 'Metal', non: 'Non-metal' }, answer: m.metal ? 'metal' : 'non', why: m.metal ? `${cap(m.name)} is made of metal: shiny, and it conducts heat and electricity.` : m.shiny ? `${cap(m.name)} is shiny, but it is a non-metal. It doesn't conduct electricity.` : m.conducts ? 'Graphite conducts electricity, but it is a non-metal (a form of carbon). It isn\'t shiny or bendy like metals.' : `${cap(m.name)} is a non-metal.`, code: 'metal-properties', hint: 'Metals are shiny, cold to touch and conduct electricity.' });
    if (level === 2) return labelQuestion(rng, { prompt: `Will a magnet pick up ${m.name}?`, labels: { yes: 'Yes', no: 'No' }, answer: m.magnetic ? 'yes' : 'no', why: m.magnetic ? `${cap(m.name)} contains iron, so a magnet attracts it.` : m.metal ? `${cap(m.name)} is a metal, but not a magnetic one. Only iron, steel, nickel and cobalt are magnetic.` : `${cap(m.name)} isn't a magnetic material.`, code: 'metal-properties', hint: 'Only a few metals are magnetic: iron, steel, nickel and cobalt.' });
    if (level === 3) return labelQuestion(rng, { prompt: `You put ${m.name} into the gap in a circuit with a cell and a bulb. Will the bulb light up?`, labels: { yes: 'Yes: it conducts electricity', no: 'No: it is an insulator' }, answer: m.conducts ? 'yes' : 'no', why: m.conducts ? (m.metal ? `${cap(m.name)} is a metal, and metals conduct electricity.` : 'Surprise! Graphite is a non-metal, but it does conduct electricity.') : `${cap(m.name)} doesn't conduct electricity, so the circuit stays broken.`, code: 'conductor-insulator', hint: 'Metals conduct electricity. Most non-metals don\'t (with one famous exception: graphite).' });
    if (level === 4) return poolQuestion(rng, rng.pick(USES), 'metal-properties', 'Think about the property that matters for the job: conducting, insulating, shiny, light or magnetic.');
    // Level 5: identify from test results
    const target = m;
    const match = (x: Material) => x.magnetic === target.magnetic && x.conducts === target.conducts && x.shiny === target.shiny;
    const others = rng.shuffle(MATERIALS_TEST.filter((x) => !match(x))).slice(0, 3);
    const desc = `${target.shiny ? 'is shiny' : 'is not shiny'}, ${target.conducts ? 'conducts electricity' : 'does not conduct electricity'} and ${target.magnetic ? 'is attracted to a magnet' : 'is not attracted to a magnet'}`;
    return poolQuestion(
      rng,
      {
        q: `Sizwe tests an object. It ${desc}. Which object could it be?`,
        a: cap(target.name),
        wrong: others.map((o) => [cap(o.name), `${cap(o.name)} ${o.shiny ? 'is shiny' : 'isn\'t shiny'}, ${o.conducts ? 'conducts' : 'doesn\'t conduct'} and ${o.magnetic ? 'is magnetic' : 'isn\'t magnetic'}. That doesn't match all three results.`]),
        why: `${cap(target.name)} matches all three results.`,
      },
      'metal-properties',
      'Check each object against all three test results.',
    );
  },
};

// ---------------------------------------------------------------------------
const SOLUBLE: { name: string; sol: boolean; note: string }[] = [
  { name: 'sugar', sol: true, note: 'Sugar dissolves: it spreads out through the water and you can\'t see it.' },
  { name: 'table salt', sol: true, note: 'Salt dissolves to make salt water.' },
  { name: 'sand', sol: false, note: 'Sand sinks to the bottom: it doesn\'t dissolve.' },
  { name: 'instant coffee', sol: true, note: 'Instant coffee dissolves and colours the water.' },
  { name: 'flour', sol: false, note: 'Flour makes the water cloudy, but the particles don\'t dissolve. Left to stand, they settle.' },
  { name: 'cooking oil', sol: false, note: 'Oil floats on top in a separate layer.' },
  { name: 'chalk powder', sol: false, note: 'Chalk makes water cloudy and then settles: insoluble.' },
  { name: 'food colouring', sol: true, note: 'Food colouring dissolves and spreads through all the water.' },
  { name: 'baking soda', sol: true, note: 'Baking soda dissolves in water.' },
  { name: 'rice', sol: false, note: 'Rice grains stay whole: insoluble.' },
  { name: 'pebbles', sol: false, note: 'Pebbles sink and don\'t dissolve.' },
  { name: 'Rooibos tea leaves', sol: false, note: 'The leaves themselves don\'t dissolve, though some substances from them do (giving the colour).' },
];
export const SEPARATE: { mix: string; method: string; why: string }[] = [
  { mix: 'sand mixed with water', method: 'Filtering', why: 'The filter paper lets water through but traps the sand grains.' },
  { mix: 'salt dissolved in water (and you want the salt)', method: 'Evaporating the water', why: 'Heat makes the water evaporate, leaving the salt crystals behind.' },
  { mix: 'iron filings mixed with sand', method: 'Using a magnet', why: 'The magnet pulls out the iron filings and leaves the sand.' },
  { mix: 'small stones mixed with sand', method: 'Sieving', why: 'The sieve holes let the sand through but stop the stones.' },
  { mix: 'cooking oil floating on water', method: 'Pouring off the top layer (decanting)', why: 'The oil floats, so it can be carefully poured off the top.' },
  { mix: 'muddy water', method: 'Filtering', why: 'The filter traps the mud and lets the clearer water through.' },
  { mix: 'sugar dissolved in water (and you want the sugar)', method: 'Evaporating the water', why: 'Evaporating the water leaves the sugar behind.' },
  { mix: 'dried beans mixed with flour', method: 'Sieving', why: 'Flour falls through the sieve; the beans stay on top.' },
  { mix: 'steel pins dropped in a jar of sand', method: 'Using a magnet', why: 'Steel is magnetic, so a magnet collects the pins.' },
];
const METHODS = ['Filtering', 'Evaporating the water', 'Using a magnet', 'Sieving', 'Pouring off the top layer (decanting)'];
const SPEED: PoolItem[] = [
  { q: 'Which will make sugar dissolve fastest?', a: 'Stirring it into hot water', wrong: [['Leaving it in cold water without stirring', 'Cold and still is the slowest way.'], ['Stirring it into ice water', 'Cold water slows dissolving down.'], ['Using big lumps of sugar', 'Bigger pieces dissolve more slowly.']], why: 'Heat and stirring both make dissolving faster.' },
  { q: 'Which dissolves faster in the same amount of water: a sugar cube or the same amount of fine sugar?', a: 'The fine sugar', wrong: [['The sugar cube', 'The cube has less surface touching the water, so it is slower.'], ['They take exactly the same time', 'Smaller pieces have more surface for the water to work on, so they dissolve faster.'], ['Neither dissolves', 'Sugar is soluble.']], why: 'Small pieces have more surface in contact with the water, so they **dissolve faster**.' },
  { q: 'Zinhle tests whether temperature affects how fast salt dissolves. What should she change?', a: 'The temperature of the water', wrong: [['The amount of salt', 'Keep the amount of salt the same, or the test isn\'t fair.'], ['How much she stirs', 'Stirring must be the same for every glass.'], ['The size of the glass and the amount of water', 'Those must stay the same.']], why: 'In a fair test, change only the thing you are testing: the **temperature**.' },
  { q: 'Why does stirring help sugar dissolve?', a: 'It moves fresh water against the sugar', wrong: [['It melts the sugar', 'Dissolving isn\'t melting: stirring doesn\'t heat the sugar much.'], ['It destroys the sugar', 'The sugar is still there, spread through the water. You can taste it.'], ['It makes more water', 'Stirring doesn\'t add water.']], why: 'Stirring keeps bringing fresh water to the sugar, so it **dissolves faster**.' },
  { q: 'Sugar is stirred into tea and disappears. Where did it go?', a: 'It dissolved and is spread through the tea', wrong: [['It melted', 'Melting needs heat to turn a solid into a liquid. Dissolving is different: the sugar spreads out in the water.'], ['It disappeared completely', 'It is still there: you can taste it, and it adds mass.'], ['It sank and is hiding at the bottom', 'If it all dissolved, there are no grains left at the bottom.']], why: 'The sugar **dissolved**: it broke into particles too small to see, spread through the tea.' },
];

export const mixtures: QuestionTemplate = {
  id: 'mixtures',
  skillId: 'mixtures',
  generate(rng, level) {
    if (level === 1) {
      const s = rng.pick(SOLUBLE);
      return labelQuestion(rng, { prompt: `You stir ${s.name} into a glass of water. Which word describes ${s.name}?`, labels: { sol: 'Soluble (it dissolves)', insol: 'Insoluble (it doesn\'t dissolve)' }, answer: s.sol ? 'sol' : 'insol', why: s.note, code: 'dissolving', hint: 'Does it disappear into the water, or can you still see it (sinking, floating or making the water cloudy)?' });
    }
    if (level === 2) {
      const pair = rng.pick([
        { solute: 'salt', solvent: 'water', solution: 'salt water' },
        { solute: 'sugar', solvent: 'tea', solution: 'sweet tea' },
        { solute: 'instant coffee', solvent: 'hot water', solution: 'coffee' },
        { solute: 'juice powder', solvent: 'water', solution: 'juice' },
      ]);
      const role = rng.pick(['solute', 'solvent', 'solution'] as const);
      const labels = { solute: 'The solute', solvent: 'The solvent', solution: 'The solution' };
      const thing = pair[role];
      return labelQuestion(rng, {
        prompt: `${cap(pair.solute)} is dissolved in ${pair.solvent} to make ${pair.solution}. What is the ${thing}?`,
        labels,
        answer: role,
        why: `The **solute** is what dissolves (${pair.solute}). The **solvent** does the dissolving (${pair.solvent}). Together they make the **solution** (${pair.solution}).`,
        code: 'dissolving',
        hint: 'Solute: the thing that dissolves. Solvent: the liquid it dissolves in. Solution: the mixture.',
      });
    }
    if (level === 3) {
      const s = rng.pick(SEPARATE);
      const wrong = rng.shuffle(METHODS.filter((m) => m !== s.method)).slice(0, 3);
      return poolQuestion(rng, { q: `How would you separate ${s.mix}?`, a: s.method, wrong: wrong.map((w) => [w, `${w} wouldn't work well here. ${s.why}`]), why: `${s.method}: ${s.why}` }, 'separation-method', 'How are the two things different: size, magnetism, dissolving, or floating?');
    }
    if (level === 4) return poolQuestion(rng, rng.pick(SPEED), 'dissolving', 'Think about heat, stirring and the size of the pieces.');
    if (rng.chance(0.5)) {
      const solute = rng.pick([10, 20, 25, 30, 40, 50]);
      const water = rng.pick([100, 150, 200, 250, 300, 500]);
      return {
        prompt: `${solute} g of salt is completely dissolved in ${water} g of water. What is the mass of the salt water?`,
        input: { kind: 'numeric', unit: 'g' },
        answer: exact(solute + water),
        answerDisplay: `${solute + water} g`,
        hints: ['The salt hasn\'t disappeared: it is spread through the water.'],
        solution: [`Mass of solution = solute + solvent = $${solute} + ${water} = ${solute + water}$ g.`],
        misconceptions: keepNum([{ code: 'dissolving', answer: exact(water), feedback: 'The salt is still there, dissolved. Its mass is added to the water\'s.' }], solute + water),
      };
    }
    const per100 = rng.pick([2, 3, 4, 5]);
    const total = rng.pick([200, 300, 400, 500, 1000]);
    const salt = (per100 * total) / 100;
    return {
      prompt: `Every 100 g of sea water contains about ${per100} g of salt. How much salt is left when ${total} g of sea water is evaporated?`,
      input: { kind: 'numeric', unit: 'g' },
      answer: exact(salt),
      answerDisplay: `${salt} g`,
      hints: [`How many lots of 100 g are in ${total} g?`],
      solution: [`${total} g is ${total / 100} lots of 100 g.`, `$${total / 100} \\times ${per100} = ${salt}$ g of salt.`],
      misconceptions: keepNum([{ code: 'dissolving', answer: exact(per100), feedback: `${per100} g is the salt in only 100 g. There are ${total / 100} lots of 100 g.` }], salt),
    };
  },
};
