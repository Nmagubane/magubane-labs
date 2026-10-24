/** Life and living, Grades 7–10: classification, food chains, photosynthesis, body systems, cell division. */
import type { QuestionTemplate, Misconception } from '../types.ts';
import { choice, num, exact, keepNum, n, cap, type Opt } from './kit.ts';

// ---------------------------------------------------------------------------
export type VClass = 'fish' | 'amphibian' | 'reptile' | 'bird' | 'mammal';
export const CLASS_NAME: Record<VClass, string> = { fish: 'Fish', amphibian: 'Amphibian', reptile: 'Reptile', bird: 'Bird', mammal: 'Mammal' };
export const CLASS_FEATURES: Record<VClass, string[]> = {
  fish: ['breathes through gills its whole life', 'has fins for swimming', 'has wet scales', 'lays soft eggs in water', 'is cold-blooded'],
  amphibian: ['has smooth, moist skin with no scales', 'lays jelly-coated eggs in water', 'has young (tadpoles) that breathe with gills', 'breathes with lungs and through its skin as an adult', 'is cold-blooded'],
  reptile: ['has dry, scaly skin', 'lays eggs with leathery shells on land', 'breathes with lungs from birth', 'is cold-blooded and basks in the sun to warm up'],
  bird: ['has feathers', 'has a beak and no teeth', 'lays eggs with hard shells', 'is warm-blooded', 'has wings'],
  mammal: ['has hair or fur', 'feeds its young on milk', 'usually gives birth to live young', 'is warm-blooded', 'breathes with lungs'],
};
/** Features that alone identify the class (used when only two features are shown). */
const KEY_FEATURE: Record<VClass, string[]> = {
  fish: ['breathes through gills its whole life', 'has fins for swimming'],
  amphibian: ['has smooth, moist skin with no scales', 'has young (tadpoles) that breathe with gills'],
  reptile: ['has dry, scaly skin', 'lays eggs with leathery shells on land'],
  bird: ['has feathers', 'has a beak and no teeth'],
  mammal: ['has hair or fur', 'feeds its young on milk'],
};

export const ANIMALS: { name: string; cls: VClass; trap?: string }[] = [
  { name: 'chacma baboon', cls: 'mammal' },
  { name: 'rock hyrax (dassie)', cls: 'mammal' },
  { name: 'bottlenose dolphin', cls: 'mammal', trap: 'It lives in water, but it breathes air with lungs and feeds its calves on milk.' },
  { name: 'Egyptian fruit bat', cls: 'mammal', trap: 'It flies, but it has fur and feeds its young on milk. It has no feathers.' },
  { name: 'Temminck\'s ground pangolin', cls: 'mammal', trap: 'Its scales are made of hair-like keratin, and it feeds its young on milk.' },
  { name: 'African penguin', cls: 'bird', trap: 'It can\'t fly and it swims, but it has feathers and lays hard-shelled eggs.' },
  { name: 'common ostrich', cls: 'bird', trap: 'It can\'t fly, but it has feathers and a beak and lays hard-shelled eggs.' },
  { name: 'African fish eagle', cls: 'bird' },
  { name: 'Nile crocodile', cls: 'reptile' },
  { name: 'leopard tortoise', cls: 'reptile' },
  { name: 'Cape cobra', cls: 'reptile' },
  { name: 'African bullfrog', cls: 'amphibian' },
  { name: 'African clawed frog', cls: 'amphibian' },
  { name: 'great white shark', cls: 'fish' },
  { name: 'whale shark', cls: 'fish', trap: 'Despite the name it is not a whale. It breathes with gills its whole life.' },
  { name: 'coelacanth', cls: 'fish' },
];
const INVERTS = ['brown house spider', 'dung beetle', 'mopane worm (a caterpillar)', 'garden snail', 'earthworm', 'Cape rock lobster', 'millipede', 'octopus', 'honey bee', 'scorpion'];

type Arthro = 'insect' | 'arachnid' | 'crustacean' | 'myriapod';
const ARTHRO_NAME: Record<Arthro, string> = { insect: 'Insect', arachnid: 'Arachnid', crustacean: 'Crustacean', myriapod: 'Myriapod' };
const ARTHRO_DESC: Record<Arthro, string> = {
  insect: '6 legs, 3 body parts (head, thorax, abdomen) and usually wings and antennae',
  arachnid: '8 legs, 2 body parts and no antennae',
  crustacean: 'a hard outer shell, many jointed legs, two pairs of antennae, and it mostly lives in water',
  myriapod: 'a long body of many segments, with many pairs of legs',
};
const ARTHROPODS: { name: string; g: Arthro }[] = [
  { name: 'dung beetle', g: 'insect' },
  { name: 'mosquito', g: 'insect' },
  { name: 'honey bee', g: 'insect' },
  { name: 'locust', g: 'insect' },
  { name: 'Cape rain spider', g: 'arachnid' },
  { name: 'scorpion', g: 'arachnid' },
  { name: 'tick', g: 'arachnid' },
  { name: 'crab', g: 'crustacean' },
  { name: 'Cape rock lobster', g: 'crustacean' },
  { name: 'woodlouse', g: 'crustacean' },
  { name: 'millipede', g: 'myriapod' },
  { name: 'centipede', g: 'myriapod' },
];

const SEPARATE: { a: VClass; b: VClass; correct: string; wrong: string[] }[] = [
  { a: 'bird', b: 'reptile', correct: 'Feathers', wrong: ['Lays eggs', 'Breathes with lungs', 'Has a backbone'] },
  { a: 'bird', b: 'mammal', correct: 'Feathers or hair', wrong: ['Warm-blooded', 'Breathes with lungs', 'Has a backbone'] },
  { a: 'mammal', b: 'reptile', correct: 'Hair, and feeding young on milk', wrong: ['Breathes with lungs', 'Has a backbone', 'Lives on land'] },
  { a: 'amphibian', b: 'reptile', correct: 'Moist skin without scales vs dry scaly skin', wrong: ['Breathes with lungs as an adult', 'Cold-blooded', 'Has a backbone'] },
  { a: 'fish', b: 'amphibian', correct: 'Gills for its whole life vs lungs as an adult', wrong: ['Lays eggs in water', 'Cold-blooded', 'Has a backbone'] },
  { a: 'fish', b: 'mammal', correct: 'Gills vs lungs, and milk for the young', wrong: ['Can swim', 'Has a backbone', 'Lives in the sea'] },
  { a: 'bird', b: 'amphibian', correct: 'Feathers vs moist, bare skin', wrong: ['Lays eggs', 'Has a backbone', 'Breathes with lungs as an adult'] },
  { a: 'reptile', b: 'fish', correct: 'Lungs and dry scales vs gills and fins', wrong: ['Has scales', 'Cold-blooded', 'Lays eggs'] },
  { a: 'mammal', b: 'amphibian', correct: 'Hair and milk vs moist skin and tadpoles', wrong: ['Has a backbone', 'Breathes with lungs as an adult', 'Has four limbs'] },
  { a: 'bird', b: 'fish', correct: 'Feathers and lungs vs scales and gills', wrong: ['Lays eggs', 'Has a backbone', 'Some can swim'] },
];
const SEP_WHY: Record<string, string> = {
  'Has a backbone': 'Every vertebrate has a backbone, so it can\'t separate two vertebrate classes.',
  'Lays eggs': 'Both of these lay eggs, so egg-laying can\'t tell them apart.',
  'Breathes with lungs': 'Both breathe with lungs.',
  'Breathes with lungs as an adult': 'Both breathe with lungs as adults.',
  'Warm-blooded': 'Birds and mammals are both warm-blooded.',
  'Cold-blooded': 'Both are cold-blooded.',
  'Lives on land': 'Where an animal lives doesn\'t decide its class.',
  'Lays eggs in water': 'Both lay their eggs in water.',
  'Can swim': 'Many animals swim. Where it lives doesn\'t decide its class.',
  'Lives in the sea': 'Dolphins and sharks both live in the sea. Habitat doesn\'t decide class.',
  'Has scales': 'Both have scales, so scales alone can\'t separate them.',
  'Has four limbs': 'Both usually have four limbs.',
  'Some can swim': 'Penguins swim too. Habitat doesn\'t decide class.',
};

export const classification: QuestionTemplate = {
  id: 'classification',
  skillId: 'classification',
  generate(rng, level) {
    if (level === 1) {
      const vert = rng.chance(0.5);
      const name = vert ? rng.pick(ANIMALS).name : rng.pick(INVERTS);
      const opts: Opt[] = [
        { id: 'vertebrate', text: 'Vertebrate (has a backbone)' },
        { id: 'invertebrate', text: 'Invertebrate (no backbone)' },
      ];
      return choice(rng, {
        prompt: `Is the ${name} a vertebrate or an invertebrate?`,
        correct: vert ? opts[0]! : opts[1]!,
        distractors: [{ ...(vert ? opts[1]! : opts[0]!), feedback: vert ? `The ${name} has a skeleton inside its body with a backbone, so it is a vertebrate.` : `The ${name} has no backbone. ${/spider|beetle|lobster|millipede|bee|scorpion|caterpillar/.test(name) ? 'Its hard outer covering is an exoskeleton, not bones.' : 'Its body is soft, with no bones at all.'}` }],
        keepOrder: opts,
        code: 'vertebrate-features',
        hints: ['Does it have a skeleton of bones inside its body, with a backbone?'],
        solution: [vert ? `The ${name} has a backbone: it is a **vertebrate**.` : `The ${name} has no backbone: it is an **invertebrate**.`],
      });
    }
    if (level === 2) {
      const a = rng.chance(0.55) ? rng.pick(ANIMALS.filter((x) => x.trap)) : rng.pick(ANIMALS);
      const opts = (Object.keys(CLASS_NAME) as VClass[]).map((c) => ({ id: c, text: CLASS_NAME[c] }));
      return choice(rng, {
        prompt: `Which vertebrate class does the ${a.name} belong to?`,
        correct: opts.find((o) => o.id === a.cls)!,
        distractors: opts.filter((o) => o.id !== a.cls).map((o) => ({ ...o, feedback: a.trap ?? `The ${a.name} ${CLASS_FEATURES[a.cls][0]}, which makes it a ${a.cls}.` })),
        keepOrder: opts,
        code: 'vertebrate-features',
        hints: ['Classify by body features (skin covering, breathing, how the young are fed), not by where it lives or whether it flies.'],
        solution: [`The ${a.name} ${CLASS_FEATURES[a.cls].slice(0, 2).join(' and ')}.`, `It is a **${a.cls}**.${a.trap ? ` ${a.trap}` : ''}`],
      });
    }
    if (level === 3) {
      const cls = rng.pick(Object.keys(CLASS_NAME) as VClass[]);
      const key = rng.pick(KEY_FEATURE[cls]);
      const other = rng.pick(CLASS_FEATURES[cls].filter((f) => f !== key));
      const feats = rng.shuffle([key, other]);
      const opts = (Object.keys(CLASS_NAME) as VClass[]).map((c) => ({ id: c, text: CLASS_NAME[c] }));
      return choice(rng, {
        prompt: `A newly described animal ${feats[0]} and ${feats[1]}. Which vertebrate class is it?`,
        correct: opts.find((o) => o.id === cls)!,
        distractors: opts.filter((o) => o.id !== cls).map((o) => ({ ...o, feedback: `"${cap(key)}" points to a ${cls}. ${CLASS_NAME[o.id as VClass]}s don't have that feature.` })),
        keepOrder: opts,
        code: 'vertebrate-features',
        hints: ['Find the feature that only one class has.'],
        solution: [`"${cap(key)}" is found only in ${cls}s.`, `So it is a **${cls}**.`],
      });
    }
    if (level === 4) {
      const a = rng.pick(ARTHROPODS);
      const byDesc = rng.chance(0.4);
      const opts = (Object.keys(ARTHRO_NAME) as Arthro[]).map((g) => ({ id: g, text: ARTHRO_NAME[g] }));
      return choice(rng, {
        prompt: byDesc ? `An arthropod has ${ARTHRO_DESC[a.g]}. Which group does it belong to?` : `Which arthropod group does the ${a.name} belong to?`,
        correct: opts.find((o) => o.id === a.g)!,
        distractors: opts.filter((o) => o.id !== a.g).map((o) => ({ ...o, feedback: `${ARTHRO_NAME[o.id as Arthro]}s have ${ARTHRO_DESC[o.id as Arthro]}. ${byDesc ? 'That doesn\'t match.' : `The ${a.name} has ${ARTHRO_DESC[a.g]}.`}` })),
        keepOrder: opts,
        code: 'arthropod-features',
        hints: ['Count the legs and the body parts.'],
        solution: [byDesc ? `${cap(ARTHRO_DESC[a.g])}: that is a **${a.g}**.` : `The ${a.name} has ${ARTHRO_DESC[a.g]}, so it is a **${a.g}**.`],
      });
    }
    const s = rng.pick(SEPARATE);
    const [x, y] = rng.chance(0.5) ? [s.a, s.b] : [s.b, s.a];
    return choice(rng, {
      prompt: `You are writing an identification key. Which feature would separate a ${x} from a ${y}?`,
      correct: { id: 'c', text: s.correct },
      distractors: s.wrong.map((w, i) => ({ id: `w${i}`, text: w, feedback: SEP_WHY[w] ?? 'Both classes share that, so it can\'t separate them.' })),
      code: 'vertebrate-features',
      hints: [`A useful key question has a "yes" for one group and a "no" for the other. What does a ${x} have that a ${y} doesn't?`],
      solution: [`${s.correct}: one class has it and the other doesn't.`, 'Features both classes share are useless in a key.'],
    });
  },
};

// ---------------------------------------------------------------------------
export interface Chain {
  place: string;
  links: string[];
}
export const CHAINS: Chain[] = [
  { place: 'grassland', links: ['grass', 'grasshopper', 'frog', 'snake', 'secretary bird'] },
  { place: 'ocean off the KwaZulu-Natal coast', links: ['phytoplankton', 'zooplankton', 'sardine', 'Cape fur seal', 'great white shark'] },
  { place: 'bushveld', links: ['acacia leaves', 'giraffe', 'lion'] },
  { place: 'vegetable garden', links: ['cabbage', 'caterpillar', 'thrush', 'sparrowhawk'] },
  { place: 'Karoo', links: ['grass', 'harvester termite', 'aardwolf'] },
  { place: 'savanna', links: ['grass', 'impala', 'leopard'] },
  { place: 'pond', links: ['algae', 'mosquito larva', 'dragonfly nymph'] },
];
const arrows = (c: Chain) => c.links.join(' → ');
const PLURAL: Record<string, string> = { thrush: 'thrushes', aardwolf: 'aardwolves', impala: 'impala', zooplankton: 'zooplankton', 'mosquito larva': 'mosquito larvae' };
/** "the number of leopards" / "the amount of grass" (producers are measured as amounts). */
const howMany = (c: Chain, i: number) => (i === 0 ? `the amount of ${c.links[0]}` : `the number of ${PLURAL[c.links[i]!] ?? `${c.links[i]}s`}`);
const ORD = ['producer', 'primary consumer', 'secondary consumer', 'tertiary consumer', 'quaternary consumer'];
const LEVELNAME = ['first', 'second', 'third', 'fourth', 'fifth'];

export const foodChains: QuestionTemplate = {
  id: 'food-chains',
  skillId: 'food-chains',
  generate(rng, level) {
    if (level === 1) {
      const c = rng.pick(CHAINS);
      const role = rng.int(0, c.links.length - 1);
      const asTop = role === c.links.length - 1 && rng.chance(0.5);
      const label = asTop ? 'top consumer' : ORD[role]!;
      const opts = c.links.map((l) => ({ id: l, text: cap(l) }));
      return choice(rng, {
        prompt: `In this ${c.place} food chain: ${arrows(c)}. Which organism is the ${label}?`,
        correct: opts[role]!,
        distractors: opts
          .filter((_, i) => i !== role)
          .map((o) => {
            const idx = c.links.indexOf(o.id);
            return { ...o, feedback: `The ${o.id} is the ${idx === 0 ? 'producer: it makes food using sunlight' : `${ORD[idx]}: it is ${idx} step${idx === 1 ? '' : 's'} along from the producer`}.` };
          }),
        keepOrder: opts,
        code: 'trophic-levels',
        hints: ['The producer is first. Each arrow points from the food to the animal that eats it.'],
        solution: [`${cap(c.links[0]!)} is the producer. Count along the arrows.`, `The ${label} is the **${c.links[role]}**.`],
      });
    }
    if (level === 2) {
      const c = rng.pick(CHAINS.filter((x) => x.links.length >= 4));
      if (rng.chance(0.5)) {
        const i = rng.int(1, c.links.length - 1);
        const opts = LEVELNAME.slice(0, c.links.length).map((l, k) => ({ id: String(k), text: `${cap(l)} trophic level` }));
        return choice(rng, {
          prompt: `In the food chain ${arrows(c)}, on which trophic level is the ${c.links[i]}?`,
          correct: opts[i]!,
          distractors: opts.filter((_, k) => k !== i).map((o) => ({ ...o, feedback: `Count from the producer: ${c.links.map((l, k) => `${l} (${k + 1})`).join(', ')}.` })),
          keepOrder: opts,
          code: 'trophic-levels',
          hints: ['The producer is on the first trophic level.'],
          solution: [`${c.links.map((l, k) => `${cap(l)}: level ${k + 1}`).join('; ')}.`, `The ${c.links[i]} is on the **${LEVELNAME[i]}** trophic level.`],
        });
      }
      const opts: Opt[] = [
        { id: 'energy', text: 'The direction energy flows: from the food to the eater' },
        { id: 'eats', text: 'Which animal is eaten by the next one', feedback: 'Read it the other way: the arrow points **towards** the eater, showing where the energy goes.' },
        { id: 'size', text: 'Each organism is bigger than the one before', feedback: 'Size has nothing to do with it. Phytoplankton feed the whole ocean, and lions eat giraffes.' },
        { id: 'chase', text: 'Which animal chases which', feedback: 'Arrows show energy (food) moving, not chasing.' },
      ];
      return choice(rng, {
        prompt: `In the ${c.place} food chain ${arrows(c)}, what does each arrow show?`,
        correct: opts[0]!,
        distractors: opts.slice(1),
        code: 'trophic-levels',
        hints: [`The arrow points from ${c.links[0]} to ${c.links[1]}. Which way does the food go?`],
        solution: ['Each arrow points from the food to the organism that eats it: the direction **energy** flows.'],
      });
    }
    if (level === 3) {
      const c = rng.pick(CHAINS);
      const E = rng.pick([10000, 20000, 50000, 80000, 100000, 1000000]);
      const k = rng.int(2, Math.min(4, c.links.length));
      const ans = E * 0.1 ** (k - 1);
      return {
        prompt: `In the food chain ${arrows(c)}, the producers (${c.links[0]}) store ${E.toLocaleString('en-US').replace(/,/g, ' ')} kJ of energy. About 10% passes to each next level. How much energy reaches the ${c.links[k - 1]}?`,
        input: { kind: 'numeric', unit: 'kJ' },
        answer: num(ans),
        answerDisplay: `${n(ans)} kJ`,
        hints: ['Multiply by 0.1 (10%) for every arrow.', `The ${c.links[k - 1]} is ${k - 1} arrow${k - 1 === 1 ? '' : 's'} from the ${c.links[0]}.`],
        solution: [`${k - 1} step${k - 1 === 1 ? '' : 's'}: $${E} \\times ${Array.from({ length: k - 1 }, () => '0.1').join(' \\times ')} = ${ans}$ kJ.`],
        misconceptions: keepNum(
          [
            { code: 'energy-transfer-10', answer: num(E * 0.9 ** (k - 1)), feedback: '10% is what **passes on**, not what is lost. About 90% is lost at each step.' },
            { code: 'energy-transfer-10', answer: num(E * 0.1), feedback: `That is only one step. The ${c.links[k - 1]} is ${k - 1} steps along.` },
            { code: 'energy-transfer-10', answer: num(E * 0.1 ** k), feedback: `Count the arrows, not the organisms: there are ${k - 1} arrows.` },
          ],
          ans,
        ),
      };
    }
    if (level === 4) {
      const c = rng.pick(CHAINS);
      const i = rng.int(0, c.links.length - 2);
      const pct = rng.pick([5, 8, 10, 12, 15, 20]);
      const E1 = rng.pick([2000, 5000, 8000, 12000, 25000, 40000]);
      const E2 = (E1 * pct) / 100;
      return {
        prompt: `In a ${c.place} food chain (${arrows(c)}), the ${c.links[i]} level takes in ${E1.toLocaleString('en-US').replace(/,/g, ' ')} kJ of energy. The ${c.links[i + 1]} level that feeds on it gains ${n(E2)} kJ. What percentage of the energy was transferred?`,
        input: { kind: 'numeric', unit: '%' },
        answer: num(pct),
        answerDisplay: `${pct}%`,
        hints: ['Efficiency = energy passed on ÷ energy available × 100.'],
        solution: [`$\\dfrac{${E2}}{${E1}} \\times 100 = ${pct}\\%$.`],
        misconceptions: keepNum(
          [
            { code: 'formula-rearranged-wrongly', answer: num((E1 / E2) * 100), feedback: 'Put the energy passed on over the energy available: smaller ÷ bigger.' },
            { code: 'energy-transfer-10', answer: num(100 - pct), feedback: 'That is the percentage **lost**. The question asks what was transferred.' },
          ],
          pct,
        ),
      };
    }
    const c = rng.pick(CHAINS.filter((x) => x.links.length >= 3));
    const r = rng.int(1, c.links.length - 1);
    const askBelow = r - 1 >= 1 ? rng.chance(0.5) : false;
    const askIdx = askBelow ? r - 1 : r < c.links.length - 1 ? r + 1 : r - 1;
    const below = askIdx < r;
    const opts: Opt[] = [
      { id: 'up', text: 'It increases' },
      { id: 'down', text: 'It decreases' },
      { id: 'same', text: 'It stays the same', feedback: 'In a food chain every organism depends on its neighbours. Removing one always has a knock-on effect.' },
    ];
    const correct = below ? opts[0]! : opts[1]!;
    return choice(rng, {
      prompt: `In the food chain ${arrows(c)}, disease wipes out most of the ${PLURAL[c.links[r]!] ?? `${c.links[r]}s`}. What happens to ${howMany(c, askIdx)} at first?`,
      correct,
      distractors: opts.filter((o) => o !== correct).map((o) => ({ ...o, feedback: o.feedback ?? (below ? `The ${c.links[r]} eat the ${c.links[askIdx]}. With fewer predators, more ${c.links[askIdx]} survive.` : `The ${c.links[askIdx]} eat the ${c.links[r]}. With less food, their numbers fall.`) })),
      keepOrder: opts,
      code: 'population-effects',
      hints: [`Do the ${c.links[askIdx]} eat the ${c.links[r]}, or are they eaten by them?`],
      solution: [below ? `The ${c.links[r]} feed on the ${c.links[askIdx]}. Fewer predators means more ${c.links[askIdx]} survive, so their numbers **increase** at first.` : `The ${c.links[askIdx]} feed on the ${c.links[r]}. Less food means their numbers **decrease**.`],
    });
  },
};

// ---------------------------------------------------------------------------
const PLANTS = ['a spekboom', 'a maize plant', 'a sunflower', 'pondweed in a dam', 'a cabbage', 'a protea', 'an acacia tree', 'a lettuce seedling', 'seaweed in a rock pool', 'a bean plant', 'a mango tree', 'a rooibos bush'];

export const photosynthesis: QuestionTemplate = {
  id: 'photosynthesis',
  skillId: 'photosynthesis',
  generate(rng, level) {
    const plant = rng.pick(PLANTS);
    if (level === 1) {
      const ask = rng.pick(['product', 'reactant', 'energy', 'where'] as const);
      if (ask === 'where') {
        return choice(rng, {
          prompt: `In which part of the cells of ${plant} does photosynthesis happen?`,
          correct: { id: 'chloroplast', text: 'Chloroplasts' },
          distractors: [
            { id: 'nucleus', text: 'Nucleus', feedback: 'The nucleus controls the cell. Photosynthesis happens in the green chloroplasts.' },
            { id: 'mitochondria', text: 'Mitochondria', feedback: 'Mitochondria carry out respiration, releasing energy from glucose.' },
            { id: 'wall', text: 'Cell wall', feedback: 'The cell wall gives support. Chloroplasts contain the chlorophyll that traps light.' },
          ],
          code: 'photosynthesis-inputs-outputs',
          hints: ['Look for the green structures that contain chlorophyll.'],
          solution: ['Photosynthesis happens in **chloroplasts**, which contain green chlorophyll to trap light energy.'],
        });
      }
      const product = ask === 'product';
      const pool = product ? ['oxygen', 'glucose'] : ['carbon dioxide', 'water'];
      const c = ask === 'energy' ? 'light from the Sun' : rng.pick(pool);
      const opts: Opt[] =
        ask === 'energy'
          ? [
              { id: 'c', text: 'Light from the Sun' },
              { id: 'soil', text: 'Nutrients from the soil', feedback: 'Plants take minerals from the soil, but the energy for photosynthesis comes from light.' },
              { id: 'glucose', text: 'Glucose', feedback: 'Glucose is what photosynthesis makes. The energy to make it comes from light.' },
              { id: 'oxygen', text: 'Oxygen from the air', feedback: 'Oxygen is given out by photosynthesis, not used as an energy source.' },
            ]
          : [
              { id: 'c', text: cap(c) },
              ...(product ? ['carbon dioxide', 'water'] : ['oxygen', 'glucose']).map((x) => ({ id: x, text: cap(x), feedback: product ? `${cap(x)} is taken **in** for photosynthesis. It is a raw material, not a product.` : `${cap(x)} is **made** by photosynthesis. It is a product, not a raw material.` })),
              { id: 'nitrogen', text: 'Nitrogen', feedback: 'Nitrogen isn\'t part of the photosynthesis equation.' },
            ];
      return choice(rng, {
        prompt: ask === 'energy' ? `Where does ${plant} get the energy to make its food by photosynthesis?` : `Which of these does ${plant} ${product ? '**make**' : '**take in**'} during photosynthesis?`,
        correct: opts[0]!,
        distractors: opts.slice(1),
        code: 'photosynthesis-inputs-outputs',
        hints: ['carbon dioxide + water → (light) → glucose + oxygen'],
        solution: ['Carbon dioxide + water, using light energy and chlorophyll, make glucose + oxygen.', ask === 'energy' ? 'The energy comes from **light**.' : `So **${c}** is ${product ? 'a product' : 'a raw material'}.`],
      });
    }
    if (level === 2) {
      const qs: { prompt: string; correct: string; wrong: [string, string][]; why: string }[] = [
        { prompt: `Which process happens in the cells of ${plant} at night, in the dark?`, correct: 'Respiration only', wrong: [['Photosynthesis only', 'Photosynthesis needs light, so it stops in the dark.'], ['Both photosynthesis and respiration', 'Photosynthesis needs light. In the dark only respiration continues.'], ['Neither: plants rest at night', 'Respiration never stops; every living cell needs energy all the time.']], why: 'Respiration happens all the time in every living cell. Photosynthesis needs light, so it stops at night.' },
        { prompt: `On a bright sunny day, which gas does ${plant} give out overall?`, correct: 'Oxygen', wrong: [['Carbon dioxide', 'In bright light photosynthesis is much faster than respiration, so more oxygen is made than used.'], ['Nitrogen', 'Nitrogen isn\'t involved in either process.'], ['No gas at all', 'Gases are exchanged through the stomata all the time.']], why: 'In bright light photosynthesis outpaces respiration, so there is a net release of oxygen.' },
        { prompt: `At midnight, which gas does ${plant} give out overall?`, correct: 'Carbon dioxide', wrong: [['Oxygen', 'There is no light, so no photosynthesis. Respiration gives out carbon dioxide.'], ['Both, in equal amounts', 'With no photosynthesis at night, only respiration\'s carbon dioxide is released.'], ['Nitrogen', 'Nitrogen isn\'t involved in either process.']], why: 'At night only respiration happens, so the plant takes in oxygen and gives out carbon dioxide.' },
        { prompt: `What does ${plant} use the glucose from photosynthesis for?`, correct: 'Respiration (energy), growth, and storing it as starch', wrong: [['Nothing: it is a waste product', 'Glucose is the plant\'s food. Oxygen is the waste product.'], ['Making carbon dioxide for photosynthesis', 'That would go round in a circle. Glucose is mainly used for energy and building the plant.'], ['Absorbing water from the soil', 'Roots take in water by osmosis. Glucose is food and building material.']], why: 'Glucose is the plant\'s food: it is respired for energy, used to build cellulose and other substances, and stored as starch.' },
        { prompt: `Which process releases energy from glucose in the cells of ${plant}?`, correct: 'Cellular respiration', wrong: [['Photosynthesis', 'Photosynthesis stores light energy in glucose. Respiration releases it.'], ['Transpiration', 'Transpiration is water evaporating from the leaves.'], ['Osmosis', 'Osmosis moves water. It doesn\'t release energy.']], why: 'Respiration (glucose + oxygen → carbon dioxide + water + energy) happens in the mitochondria.' },
      ];
      const q = rng.pick(qs);
      return choice(rng, {
        prompt: q.prompt,
        correct: { id: 'c', text: q.correct },
        distractors: q.wrong.map(([text, feedback], i) => ({ id: `w${i}`, text, feedback })),
        code: 'photosynthesis-inputs-outputs',
        hints: ['Photosynthesis needs light. Respiration happens in every living cell, day and night.'],
        solution: [q.why],
      });
    }
    if (level === 3) {
      const plateau = rng.int(18, 40);
      const lamp = rng.pick(['10 cm', '15 cm', '20 cm']);
      const temp = rng.pick([20, 22, 25]);
      return choice(rng, {
        prompt: `Pondweed is placed ${lamp} from a lamp in water at ${temp} °C. As the lamp is moved closer, the bubbles of oxygen increase, then level off at ${plateau} bubbles per minute. Moving the lamp even closer makes no difference. Which factor is most likely limiting the rate now?`,
        correct: { id: 'co2', text: 'The amount of carbon dioxide in the water' },
        distractors: [
          { id: 'light', text: 'Light intensity', feedback: 'More light no longer increases the rate, so light is **not** what is holding it back now.' },
          { id: 'water', text: 'Not enough water', feedback: 'The pondweed is surrounded by water. Water is not the limiting factor.' },
          { id: 'oxygen', text: 'Too much oxygen in the water', feedback: 'Oxygen is a product. It isn\'t what limits photosynthesis here.' },
        ],
        code: 'limiting-factor',
        hints: ['If increasing light stops helping, light isn\'t the limit any more.', 'Which raw material could run short?'],
        solution: ['Once extra light makes no difference, something else is in short supply.', `At ${temp} °C, the most likely limit is **carbon dioxide**. Adding sodium hydrogen carbonate (which releases CO₂) would raise the rate.`],
      });
    }
    const made = rng.pick([30, 40, 45, 50, 60, 72, 80, 90]);
    const used = rng.pick([5, 6, 8, 10, 12, 15]);
    if (level === 4) {
      const hours = rng.pick([2, 3, 4, 5, 6, 8]);
      const net = (made - used) * hours;
      return {
        prompt: `In bright light, the leaves of ${plant} make ${made} mL of oxygen per hour by photosynthesis. Respiration uses ${used} mL of oxygen per hour. How much oxygen does the plant release into the air in ${hours} hours?`,
        input: { kind: 'numeric', unit: 'mL' },
        answer: exact(net),
        answerDisplay: `${net} mL`,
        hints: ['Respiration keeps going while photosynthesis happens.', 'Net release per hour = made − used.'],
        solution: [`Net per hour: $${made} - ${used} = ${made - used}$ mL.`, `Over ${hours} h: $${made - used} \\times ${hours} = ${net}$ mL.`],
        misconceptions: keepNum(
          [
            { code: 'gross-vs-net', answer: exact(made * hours), feedback: 'You forgot respiration. The plant uses some of that oxygen itself.' },
            { code: 'gross-vs-net', answer: exact((made + used) * hours), feedback: 'Respiration **uses** oxygen, so subtract it.' },
          ],
          net,
        ),
      };
    }
    const light = rng.pick([10, 11, 12, 13, 14]);
    const net = made * light - used * 24;
    const ms: Misconception[] = [
      { code: 'gross-vs-net', answer: exact(made * light - used * (24 - light)), feedback: 'Respiration happens during the day too, so it runs for all 24 hours.' },
      { code: 'gross-vs-net', answer: exact(made * light), feedback: 'You left out respiration completely.' },
      { code: 'gross-vs-net', answer: exact((made - used) * light), feedback: 'At night the plant still respires. Include respiration for the dark hours as well.' },
    ];
    return {
      prompt: `On a summer day ${plant} gets ${light} hours of light. In the light it makes ${made} mL of oxygen per hour. It uses ${used} mL of oxygen per hour in respiration, day and night. What is its net oxygen release over the full 24 hours?`,
      input: { kind: 'numeric', unit: 'mL' },
      answer: exact(net),
      answerDisplay: `${net} mL`,
      hints: ['Photosynthesis only happens in the light hours.', 'Respiration happens for all 24 hours.'],
      solution: [`Made: $${made} \\times ${light} = ${made * light}$ mL.`, `Used: $${used} \\times 24 = ${used * 24}$ mL.`, `Net: $${made * light} - ${used * 24} = ${net}$ mL.`],
      misconceptions: keepNum(ms, net),
    };
  },
};

// ---------------------------------------------------------------------------
export const BLOOD_PATH = ['the vena cava', 'the right atrium', 'the right ventricle', 'the pulmonary artery', 'the lungs', 'the pulmonary vein', 'the left atrium', 'the left ventricle', 'the aorta', 'the body'];
const AIR_PATH = ['the nose', 'the pharynx', 'the larynx', 'the trachea', 'a bronchus', 'the bronchioles', 'the alveoli'];
const ORGANS: { organ: string; system: string }[] = [
  { organ: 'heart', system: 'Circulatory' },
  { organ: 'arteries and veins', system: 'Circulatory' },
  { organ: 'lungs', system: 'Respiratory' },
  { organ: 'trachea (windpipe)', system: 'Respiratory' },
  { organ: 'diaphragm', system: 'Respiratory' },
  { organ: 'stomach', system: 'Digestive' },
  { organ: 'small intestine', system: 'Digestive' },
  { organ: 'liver', system: 'Digestive' },
  { organ: 'oesophagus', system: 'Digestive' },
  { organ: 'kidneys', system: 'Excretory' },
  { organ: 'bladder', system: 'Excretory' },
  { organ: 'brain', system: 'Nervous' },
  { organ: 'spinal cord', system: 'Nervous' },
];
const SYSTEMS = ['Circulatory', 'Respiratory', 'Digestive', 'Excretory', 'Nervous'];
const SYS_JOB: Record<string, string> = {
  Circulatory: 'moves blood around the body',
  Respiratory: 'brings oxygen in and gets rid of carbon dioxide',
  Digestive: 'breaks food down and absorbs it',
  Excretory: 'removes waste such as urea from the blood',
  Nervous: 'carries messages and controls the body',
};
const FUNCTIONS: { q: string; a: string; others: string[] }[] = [
  { q: 'Where is most digested food absorbed into the blood?', a: 'Small intestine', others: ['Stomach', 'Large intestine', 'Oesophagus'] },
  { q: 'Where is most water absorbed back into the body from the food waste?', a: 'Large intestine', others: ['Stomach', 'Small intestine', 'Liver'] },
  { q: 'Which organ makes bile, which breaks fat into small droplets?', a: 'Liver', others: ['Pancreas', 'Stomach', 'Kidneys'] },
  { q: 'Where does oxygen pass from the air into the blood?', a: 'Alveoli', others: ['Trachea', 'Bronchi', 'Heart'] },
  { q: 'Which muscle contracts and flattens to make you breathe in?', a: 'Diaphragm', others: ['Heart', 'Biceps', 'Stomach wall'] },
  { q: 'Which chamber of the heart has the thickest muscle wall?', a: 'Left ventricle', others: ['Right ventricle', 'Left atrium', 'Right atrium'] },
  { q: 'Which organ filters waste (urea) out of the blood to make urine?', a: 'Kidneys', others: ['Liver', 'Bladder', 'Lungs'] },
  { q: 'Where does the digestion of protein begin, helped by acid?', a: 'Stomach', others: ['Mouth', 'Small intestine', 'Large intestine'] },
  { q: 'Which structures stop blood flowing backwards in the heart and veins?', a: 'Valves', others: ['Capillaries', 'Platelets', 'Alveoli'] },
  { q: 'In which blood vessels does oxygen pass from the blood into the body\'s cells?', a: 'Capillaries', others: ['Arteries', 'Veins', 'The aorta'] },
  { q: 'Which part of the blood carries oxygen?', a: 'Red blood cells', others: ['White blood cells', 'Platelets', 'Plasma'] },
  { q: 'Where does the digestion of starch begin?', a: 'Mouth', others: ['Stomach', 'Large intestine', 'Oesophagus'] },
];
const FN_WHY: Record<string, string> = {
  'Small intestine': 'The small intestine is long and lined with villi, giving a huge surface for absorbing digested food.',
  'Large intestine': 'The large intestine absorbs water from what is left, forming faeces.',
  Liver: 'The liver makes bile, which is stored in the gall bladder and emulsifies fats.',
  Alveoli: 'The alveoli are tiny air sacs with thin walls and many capillaries, ideal for gas exchange.',
  Diaphragm: 'When the diaphragm contracts it flattens, the chest gets bigger and air rushes in.',
  'Left ventricle': 'The left ventricle pumps blood all around the body, so it needs the strongest muscle.',
  Kidneys: 'The kidneys filter the blood, removing urea and extra water as urine.',
  Stomach: 'The stomach makes hydrochloric acid and the enzyme pepsin, which starts protein digestion.',
  Valves: 'Valves close when blood tries to flow backwards, keeping it moving one way.',
  Capillaries: 'Capillary walls are one cell thick, so oxygen and food can pass through to the cells.',
  'Red blood cells': 'Red blood cells contain haemoglobin, which picks up oxygen in the lungs.',
  Mouth: 'Saliva contains amylase, which starts breaking starch down in the mouth.',
};
const O2: { thing: string; rich: boolean }[] = [
  { thing: 'the aorta', rich: true },
  { thing: 'the vena cava', rich: false },
  { thing: 'the pulmonary artery', rich: false },
  { thing: 'the pulmonary vein', rich: true },
  { thing: 'the left atrium', rich: true },
  { thing: 'the right atrium', rich: false },
  { thing: 'the left ventricle', rich: true },
  { thing: 'the right ventricle', rich: false },
];

export const bodySystems: QuestionTemplate = {
  id: 'body-systems',
  skillId: 'body-systems',
  generate(rng, level) {
    if (level === 1) {
      const o = rng.pick(ORGANS);
      const opts = SYSTEMS.map((s) => ({ id: s, text: `${s} system` }));
      return choice(rng, {
        prompt: `Which body system is the ${o.organ} part of?`,
        correct: opts.find((x) => x.id === o.system)!,
        distractors: opts.filter((x) => x.id !== o.system).map((x) => ({ ...x, feedback: `The ${x.id.toLowerCase()} system ${SYS_JOB[x.id]}. The ${o.organ} belongs to the ${o.system.toLowerCase()} system, which ${SYS_JOB[o.system]}.` })),
        keepOrder: opts,
        code: 'organ-system',
        hints: [`What is the main job of the ${o.organ}?`],
        solution: [`The ${o.system.toLowerCase()} system ${SYS_JOB[o.system]}.`, `The ${o.organ} is part of the **${o.system.toLowerCase()} system**.`],
      });
    }
    if (level === 2) {
      const f = rng.pick(FUNCTIONS);
      return choice(rng, {
        prompt: f.q,
        correct: { id: f.a, text: f.a },
        distractors: f.others.map((o) => ({ id: o, text: o, feedback: FN_WHY[f.a] ?? `It is the ${f.a.toLowerCase()}.` })),
        code: 'organ-system',
        hints: ['Think about the structure: what shape or feature would suit that job?'],
        solution: [FN_WHY[f.a] ?? f.a],
      });
    }
    if (level === 3) {
      const i = rng.int(0, BLOOD_PATH.length - 2);
      const next = BLOOD_PATH[i + 1]!;
      const others = rng.shuffle(BLOOD_PATH.filter((x) => x !== next && x !== BLOOD_PATH[i])).slice(0, 3);
      return choice(rng, {
        prompt: `Blood is in ${BLOOD_PATH[i]}. Where does it go next?`,
        correct: { id: next, text: cap(next) },
        distractors: others.map((o) => ({ id: o, text: cap(o), feedback: `The order is: ${BLOOD_PATH.join(' → ')}. After ${BLOOD_PATH[i]} comes ${next}.` })),
        code: 'blood-flow-path',
        hints: ['Blood goes through the heart twice: right side to the lungs, then left side to the body.', 'Atria receive blood; ventricles pump it out.'],
        solution: [`${cap(BLOOD_PATH.join(' → '))}.`, `After ${BLOOD_PATH[i]}, blood goes to **${next}**.`],
      });
    }
    if (level === 4) {
      if (rng.chance(0.45)) {
        const i = rng.int(0, AIR_PATH.length - 2);
        const next = AIR_PATH[i + 1]!;
        const others = rng.shuffle(AIR_PATH.filter((x) => x !== next && x !== AIR_PATH[i])).slice(0, 3);
        return choice(rng, {
          prompt: `When you breathe in, air passes through ${AIR_PATH[i]}. Where does it go next?`,
          correct: { id: next, text: cap(next) },
          distractors: others.map((o) => ({ id: o, text: cap(o), feedback: `The order is: ${AIR_PATH.join(' → ')}.` })),
          code: 'organ-system',
          hints: ['The airways branch like an upside-down tree: one trunk, two branches, many twigs, then tiny sacs.'],
          solution: [`${cap(AIR_PATH.join(' → '))}.`, `After ${AIR_PATH[i]} comes **${next}**.`],
        });
      }
      const o = rng.pick(O2);
      const opts: Opt[] = [
        { id: 'rich', text: 'Oxygen-rich blood' },
        { id: 'poor', text: 'Oxygen-poor blood' },
      ];
      const trap = o.thing.includes('pulmonary');
      return choice(rng, {
        prompt: `Does ${o.thing} carry oxygen-rich or oxygen-poor blood?`,
        correct: o.rich ? opts[0]! : opts[1]!,
        distractors: [{ ...(o.rich ? opts[1]! : opts[0]!), feedback: trap ? (o.rich ? 'The pulmonary vein brings blood **back from the lungs**, where it has just picked up oxygen.' : 'The pulmonary artery is an artery (it leaves the heart), but it carries blood **to the lungs** to collect oxygen, so the blood is oxygen-poor.') : `${cap(o.thing)} is on the ${o.rich ? 'left' : 'right'} side of the circulation, which carries ${o.rich ? 'oxygen-rich blood to the body' : 'oxygen-poor blood towards the lungs'}.` }],
        keepOrder: opts,
        code: 'oxygenated-blood',
        hints: ['Is this blood on its way to the lungs, or coming back from them?'],
        solution: [o.rich ? `${cap(o.thing)} carries blood that has just been to the lungs: **oxygen-rich**.` : `${cap(o.thing)} carries blood on its way to the lungs: **oxygen-poor**.`, trap ? 'The pulmonary vessels are the exception to "arteries carry oxygen-rich blood".' : 'Left side: oxygen-rich. Right side: oxygen-poor.'],
      });
    }
    if (rng.chance(0.5)) {
      const sv = rng.pick([60, 65, 70, 75, 80]);
      const hr = rng.pick([60, 66, 70, 72, 75, 80, 90, 120, 150]);
      const mL = sv * hr;
      const L = mL / 1000;
      return {
        prompt: `A heart pumps ${sv} mL of blood with each beat and beats ${hr} times per minute${hr >= 120 ? ' during exercise' : ''}. How many litres of blood does it pump per minute?`,
        input: { kind: 'numeric', unit: 'L/min' },
        answer: num(L),
        answerDisplay: `${n(L)} L per minute`,
        hints: ['Volume per minute = volume per beat × beats per minute.', '1 L = 1000 mL.'],
        solution: [`$${sv} \\times ${hr} = ${mL}$ mL per minute.`, `$${mL} \\div 1000 = ${n(L)}$ L per minute.`],
        misconceptions: keepNum(
          [
            { code: 'unit-conversion', answer: num(mL), feedback: `That is in millilitres. Divide by 1000 to get litres.` },
            { code: 'formula-rearranged-wrongly', answer: num(hr / sv), feedback: 'Multiply the volume per beat by the number of beats.' },
          ],
          L,
        ),
      };
    }
    const tv = rng.pick([400, 450, 500, 600]);
    const br = rng.pick([12, 14, 15, 16, 18, 20, 30]);
    const L = (tv * br) / 1000;
    return {
      prompt: `Each breath moves ${tv} mL of air into the lungs, and a person takes ${br} breaths per minute. How many litres of air do they breathe in per minute?`,
      input: { kind: 'numeric', unit: 'L/min' },
      answer: num(L),
      answerDisplay: `${n(L)} L per minute`,
      hints: ['Air per minute = air per breath × breaths per minute.', '1 L = 1000 mL.'],
      solution: [`$${tv} \\times ${br} = ${tv * br}$ mL.`, `$${tv * br} \\div 1000 = ${n(L)}$ L.`],
      misconceptions: keepNum([{ code: 'unit-conversion', answer: num(tv * br), feedback: 'That is in millilitres. Divide by 1000 for litres.' }], L),
    };
  },
};

// ---------------------------------------------------------------------------
export const ORGANISMS_2N: { name: string; n2: number; plant?: boolean }[] = [
  { name: 'a human', n2: 46 },
  { name: 'a chimpanzee', n2: 48 },
  { name: 'a dog', n2: 78 },
  { name: 'a cat', n2: 38 },
  { name: 'a horse', n2: 64 },
  { name: 'a cow', n2: 60 },
  { name: 'a chicken', n2: 78 },
  { name: 'a mouse', n2: 40 },
  { name: 'a fruit fly', n2: 8 },
  { name: 'a maize plant', n2: 20, plant: true },
  { name: 'a rice plant', n2: 24, plant: true },
  { name: 'an onion plant', n2: 16, plant: true },
  { name: 'a garden pea plant', n2: 14, plant: true },
];
export const PHASES = [
  { id: 'prophase', name: 'Prophase', desc: ['Chromosomes coil up and become visible, each made of two chromatids joined at a centromere.', 'The nuclear membrane breaks down and spindle fibres start to form.'] },
  { id: 'metaphase', name: 'Metaphase', desc: ['Chromosomes line up across the middle (equator) of the cell.', 'Spindle fibres attach to the centromere of each chromosome, which sits on the equator.'] },
  { id: 'anaphase', name: 'Anaphase', desc: ['The centromeres split and the chromatids are pulled to opposite ends of the cell.', 'Spindle fibres shorten, dragging identical chromatids towards the two poles.'] },
  { id: 'telophase', name: 'Telophase', desc: ['A nuclear membrane forms around each set of chromosomes at the two ends of the cell.', 'The chromosomes uncoil at each pole and two new nuclei appear.'] },
  { id: 'interphase', name: 'Interphase', desc: ['The cell grows and copies its DNA, ready to divide.', 'The DNA replicates; chromosomes are long and thin and can\'t be seen as separate threads.'] },
] as const;
const USES: { q: string; a: 'mitosis' | 'meiosis' }[] = [
  { q: 'A broken bone heals as new bone cells are made.', a: 'mitosis' },
  { q: 'A cut on your knee is repaired with new skin cells.', a: 'mitosis' },
  { q: 'Sperm cells are made in the testes.', a: 'meiosis' },
  { q: 'Egg cells are made in the ovaries.', a: 'meiosis' },
  { q: 'Cells at the tip of a growing root divide to make the root longer.', a: 'mitosis' },
  { q: 'Pollen grains are formed in the anthers of a flower.', a: 'meiosis' },
  { q: 'A spekboom cutting grows into a new plant identical to its parent.', a: 'mitosis' },
  { q: 'A baby grows from a few cells into trillions.', a: 'mitosis' },
  { q: 'The process makes four cells, each with half the chromosome number.', a: 'meiosis' },
  { q: 'The process makes two cells genetically identical to the parent cell.', a: 'mitosis' },
  { q: 'Crossing over creates new combinations of genes in the cells produced.', a: 'meiosis' },
];

export const cellDivision: QuestionTemplate = {
  id: 'cell-division',
  skillId: 'cell-division',
  generate(rng, level) {
    if (level === 1) {
      const p = rng.pick(PHASES);
      const opts = PHASES.map((x) => ({ id: x.id, text: x.name }));
      return choice(rng, {
        prompt: `Which phase of the cell cycle is described? "${rng.pick(p.desc)}"`,
        correct: opts.find((o) => o.id === p.id)!,
        distractors: opts.filter((o) => o.id !== p.id).map((o) => ({ ...o, feedback: `In ${o.text.toLowerCase()}: ${PHASES.find((x) => x.id === o.id)!.desc[0].toLowerCase()}` })),
        keepOrder: [opts[4]!, ...opts.slice(0, 4)],
        code: 'mitosis-phases',
        hints: ['Remember the order: interphase, then Prophase, Metaphase, Anaphase, Telophase (PMAT). Metaphase = Middle, Anaphase = Apart.'],
        solution: [`That describes **${p.name.toLowerCase()}**.`],
      });
    }
    const o = rng.pick(ORGANISMS_2N);
    if (level === 2) {
      return {
        prompt: `A body cell of ${o.name} has ${o.n2} chromosomes. It divides by mitosis. How many chromosomes does each daughter cell have?`,
        input: { kind: 'numeric', unit: 'chromosomes' },
        answer: exact(o.n2),
        answerDisplay: `${o.n2}`,
        hints: ['Mitosis makes cells that are identical to the parent cell.'],
        solution: ['Mitosis keeps the chromosome number the same.', `Each daughter cell has **${o.n2}** chromosomes.`],
        misconceptions: keepNum(
          [
            { code: 'mitosis-meiosis', answer: exact(o.n2 / 2), feedback: 'Halving happens in **meiosis**. Mitosis copies the DNA first, so each daughter cell gets a full set.' },
            { code: 'chromatids', answer: exact(o.n2 * 2), feedback: 'The DNA doubles before division, then splits between two cells, so each gets the original number.' },
          ],
          o.n2,
        ),
      };
    }
    if (level === 3) {
      const half = o.n2 / 2;
      const gamete = o.plant ? 'pollen grain' : rng.pick(['sperm cell', 'egg cell']);
      return {
        prompt: `A body cell of ${o.name} has ${o.n2} chromosomes. How many chromosomes are there in a ${gamete} made by meiosis?`,
        input: { kind: 'numeric', unit: 'chromosomes' },
        answer: exact(half),
        answerDisplay: `${half}`,
        hints: ['Gametes are haploid ($n$): they have half the body-cell number.', 'At fertilisation two gametes join to restore $2n$.'],
        solution: [`Meiosis halves the chromosome number: $2n = ${o.n2} \\Rightarrow n = ${half}$.`, `When two gametes fuse, $${half} + ${half} = ${o.n2}$ again.`],
        misconceptions: keepNum([{ code: 'mitosis-meiosis', answer: exact(o.n2), feedback: 'That is what mitosis gives. Meiosis halves the number so that fertilisation restores it.' }], half),
      };
    }
    if (level === 4) {
      if (rng.chance(0.5)) {
        return {
          prompt: `A body cell of ${o.name} has ${o.n2} chromosomes. How many chromatids are there in the cell at metaphase of mitosis?`,
          input: { kind: 'numeric', unit: 'chromatids' },
          answer: exact(o.n2 * 2),
          answerDisplay: `${o.n2 * 2}`,
          hints: ['The DNA was copied during interphase.', 'At metaphase, each chromosome is two chromatids joined at the centromere.'],
          solution: [`Each of the ${o.n2} chromosomes is two chromatids: $${o.n2} \\times 2 = ${o.n2 * 2}$ chromatids.`],
          misconceptions: keepNum(
            [
              { code: 'chromatids', answer: exact(o.n2), feedback: 'That is the number of chromosomes. Each one is **two** chromatids at metaphase.' },
              { code: 'chromatids', answer: exact(o.n2 / 2), feedback: 'Nothing halves in mitosis. At metaphase every chromosome is two chromatids.' },
            ],
            o.n2 * 2,
          ),
        };
      }
      const k = rng.int(3, 8);
      return {
        prompt: `A single cell divides by mitosis, then each new cell divides again, and so on. How many cells are there after ${k} rounds of division?`,
        input: { kind: 'numeric', unit: 'cells' },
        answer: exact(2 ** k),
        answerDisplay: `${2 ** k}`,
        hints: ['Each round doubles the number of cells: 1 → 2 → 4 → …', `That is $2^{${k}}$.`],
        solution: [`After each division the number doubles: $2^{${k}} = ${2 ** k}$.`],
        misconceptions: keepNum(
          [
            { code: 'mitosis-meiosis', answer: exact(2 * k), feedback: 'The number doubles each round; it doesn\'t go up by 2. 1 → 2 → 4 → 8…' },
            { code: 'mitosis-meiosis', answer: exact(2 ** (k + 1)), feedback: `Start with 1 cell: after 1 round there are 2, so after ${k} rounds there are $2^{${k}}$.` },
          ],
          2 ** k,
        ),
      };
    }
    const u = rng.pick(USES);
    const opts: Opt[] = [
      { id: 'mitosis', text: 'Mitosis' },
      { id: 'meiosis', text: 'Meiosis' },
    ];
    return choice(rng, {
      prompt: `Which type of cell division is this? "${u.q}"`,
      correct: opts.find((x) => x.id === u.a)!,
      distractors: [{ ...opts.find((x) => x.id !== u.a)!, feedback: u.a === 'mitosis' ? 'Growth, repair and asexual reproduction need identical cells with the full chromosome number: mitosis.' : 'Making gametes (sex cells) halves the chromosome number and creates variety: meiosis.' }],
      keepOrder: opts,
      code: 'mitosis-meiosis',
      hints: ['Is the purpose growth/repair (identical cells), or making sex cells (half the chromosomes)?'],
      solution: [u.a === 'mitosis' ? 'Growth, repair and asexual reproduction use **mitosis**: 2 identical cells with the full set of chromosomes.' : 'Gametes are made by **meiosis**: 4 genetically different cells with half the chromosomes.'],
    });
  },
};
