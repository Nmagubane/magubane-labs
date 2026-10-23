import type { QuestionTemplate, Misconception, AnswerSpec, Difficulty } from '../types.ts';
import type { Rng } from '../rng.ts';
import { rat, ratTex } from '../rational.ts';

// ---------------------------------------------------------------------------
export interface Organelle {
  id: string;
  name: string;
  fn: string;
  plant: boolean;
  animal: boolean;
  level: Difficulty;
}

export const ORGANELLES: Organelle[] = [
  { id: 'nucleus', name: 'nucleus', fn: 'contains the DNA and controls the activities of the cell', plant: true, animal: true, level: 1 },
  { id: 'membrane', name: 'cell membrane', fn: 'controls what enters and leaves the cell', plant: true, animal: true, level: 1 },
  { id: 'mitochondrion', name: 'mitochondrion', fn: 'releases energy from glucose in cellular respiration', plant: true, animal: true, level: 1 },
  { id: 'chloroplast', name: 'chloroplast', fn: 'captures light energy for photosynthesis', plant: true, animal: false, level: 1 },
  { id: 'wall', name: 'cell wall', fn: 'gives the cell a rigid shape and support', plant: true, animal: false, level: 2 },
  { id: 'vacuole', name: 'large central vacuole', fn: 'stores water and keeps the cell firm (turgid)', plant: true, animal: false, level: 2 },
  { id: 'ribosome', name: 'ribosome', fn: 'makes proteins', plant: true, animal: true, level: 3 },
  { id: 'cytoplasm', name: 'cytoplasm', fn: 'is the jelly-like fluid where most chemical reactions happen', plant: true, animal: true, level: 2 },
  { id: 'er', name: 'rough endoplasmic reticulum', fn: 'transports proteins made by its attached ribosomes', plant: true, animal: true, level: 4 },
  { id: 'golgi', name: 'Golgi body', fn: 'packages and modifies proteins for secretion', plant: true, animal: true, level: 4 },
  { id: 'lysosome', name: 'lysosome', fn: 'contains enzymes that break down worn-out parts and waste', plant: false, animal: true, level: 5 },
  { id: 'centriole', name: 'centriole', fn: 'helps organise the spindle during cell division', plant: false, animal: true, level: 5 },
];

const choiceAns = (id: string): AnswerSpec => ({ kind: 'choice', id });

function pickDistractors(rng: Rng, correct: Organelle, pool: Organelle[], n: number): Organelle[] {
  return rng.shuffle(pool.filter((o) => o.id !== correct.id)).slice(0, n);
}

export const cellStructure: QuestionTemplate = {
  id: 'cell-structure',
  skillId: 'cell-structure',
  generate(rng, level) {
    const eligible = ORGANELLES.filter((o) => o.level <= level);
    const variant = level >= 2 ? rng.pick(['fn-to-name', 'name-to-fn', 'plant-only', 'scenario'] as const) : rng.pick(['fn-to-name', 'name-to-fn'] as const);

    if (variant === 'plant-only' || (variant === 'scenario' && level < 3)) {
      const plantOnly = ORGANELLES.filter((o) => o.plant && !o.animal && o.level <= Math.max(level, 2));
      const correct = rng.pick(plantOnly);
      const distract = pickDistractors(rng, correct, ORGANELLES.filter((o) => o.plant && o.animal && o.level <= Math.max(level, 2)), 3);
      const options = rng.shuffle([correct, ...distract]);
      return {
        prompt: 'Which of these structures is found in plant cells but **not** in animal cells?',
        input: { kind: 'choice', options: options.map((o) => ({ id: o.id, text: o.name[0]!.toUpperCase() + o.name.slice(1) })) },
        answer: choiceAns(correct.id),
        answerDisplay: `The ${correct.name}`,
        hints: ['Think about what plants do that animals don\'t: make their own food, and stand upright without a skeleton.'],
        solution: [`The ${correct.name} ${correct.fn}. Animal cells don't have one.`, `The other options are found in both plant and animal cells.`],
        misconceptions: distract.map<Misconception>((d) => ({ code: 'organelle-function', answer: choiceAns(d.id), feedback: `The ${d.name} is found in both plant and animal cells. It ${d.fn}.` })),
      };
    }

    if (variant === 'scenario') {
      const scenarios = [
        { id: 'mitochondrion', text: 'Muscle cells in an athlete\'s legs contain far more of one organelle than skin cells do. Which organelle, and why does that help?', why: 'Muscles need a lot of energy, and mitochondria release energy in cellular respiration.' },
        { id: 'ribosome', text: 'Cells in the pancreas make large amounts of the protein insulin. Which structure would you expect to find in very large numbers?', why: 'Ribosomes make proteins, so protein-producing cells have many of them.' },
        { id: 'chloroplast', text: 'Cells in the upper layer of a leaf are packed with one organelle that root cells lack. Which one?', why: 'Upper leaf cells receive the most light, so they hold the chloroplasts for photosynthesis. Roots are underground in the dark.' },
        { id: 'lysosome', text: 'White blood cells engulf bacteria and then destroy them. Which organelle supplies the enzymes for that?', why: 'Lysosomes contain digestive enzymes that break down engulfed material.' },
      ];
      const s = rng.pick(scenarios.filter((x) => (ORGANELLES.find((o) => o.id === x.id) as Organelle).level <= level));
      const correct = ORGANELLES.find((o) => o.id === s.id) as Organelle;
      const distract = pickDistractors(rng, correct, eligible, 3);
      const options = rng.shuffle([correct, ...distract]);
      return {
        prompt: s.text,
        input: { kind: 'choice', options: options.map((o) => ({ id: o.id, text: o.name[0]!.toUpperCase() + o.name.slice(1) })) },
        answer: choiceAns(correct.id),
        answerDisplay: `The ${correct.name}`,
        hints: ['Structure follows function. What job does this cell do a lot of?'],
        solution: [s.why],
        misconceptions: distract.map<Misconception>((d) => ({ code: 'organelle-function', answer: choiceAns(d.id), feedback: `The ${d.name} ${d.fn}. That isn't the job this cell does more of.` })),
      };
    }

    const correct = rng.pick(eligible);
    const distract = pickDistractors(rng, correct, eligible.length >= 4 ? eligible : ORGANELLES.filter((o) => o.level <= 2), 3);
    const options = rng.shuffle([correct, ...distract]);
    if (variant === 'fn-to-name') {
      return {
        prompt: `Which organelle ${correct.fn}?`,
        input: { kind: 'choice', options: options.map((o) => ({ id: o.id, text: o.name[0]!.toUpperCase() + o.name.slice(1) })) },
        answer: choiceAns(correct.id),
        answerDisplay: `The ${correct.name}`,
        hints: ['Link the job to the structure. Which part of the cell would need to do this?'],
        solution: [`The ${correct.name} ${correct.fn}.`],
        misconceptions: distract.map<Misconception>((d) => ({ code: 'organelle-function', answer: choiceAns(d.id), feedback: `The ${d.name} ${d.fn}.` })),
      };
    }
    return {
      prompt: `What is the function of the ${correct.name}?`,
      input: { kind: 'choice', options: options.map((o) => ({ id: o.id, text: o.fn[0]!.toUpperCase() + o.fn.slice(1) })) },
      answer: choiceAns(correct.id),
      answerDisplay: `It ${correct.fn}.`,
      hints: [`Where is the ${correct.name}, and what would a cell need there?`],
      solution: [`The ${correct.name} ${correct.fn}.`],
      misconceptions: distract.map<Misconception>((d) => ({ code: 'organelle-function', answer: choiceAns(d.id), feedback: `That is the job of the ${d.name}.` })),
    };
  },
};

// ---------------------------------------------------------------------------
interface Trait {
  organism: string;
  letter: string;
  dominant: string;
  recessive: string;
}

const TRAITS: Trait[] = [
  { organism: 'pea plants', letter: 'T', dominant: 'tall', recessive: 'short' },
  { organism: 'pea plants', letter: 'R', dominant: 'round seeds', recessive: 'wrinkled seeds' },
  { organism: 'guinea pigs', letter: 'B', dominant: 'black fur', recessive: 'white fur' },
  { organism: 'tomato plants', letter: 'P', dominant: 'purple stems', recessive: 'green stems' },
  { organism: 'Nguni cattle', letter: 'H', dominant: 'no horns (polled)', recessive: 'horns' },
  { organism: 'maize plants', letter: 'G', dominant: 'green leaves', recessive: 'white (albino) leaves' },
  { organism: 'fruit flies', letter: 'N', dominant: 'normal wings', recessive: 'short, crumpled wings' },
  { organism: 'rabbits', letter: 'B', dominant: 'brown fur', recessive: 'white fur' },
  { organism: 'sunflowers', letter: 'Y', dominant: 'yellow petals', recessive: 'pale cream petals' },
];

const ALLELES = (g: string): [string, string] => [g[0] as string, g[1] as string];

/** Probability (as count out of 4) of each genotype class in a cross. */
export function crossCounts(p1: string, p2: string): { homDom: number; het: number; homRec: number } {
  let homDom = 0, het = 0, homRec = 0;
  for (const a of ALLELES(p1)) {
    for (const b of ALLELES(p2)) {
      const upper = [a, b].filter((x) => x === x.toUpperCase()).length;
      if (upper === 2) homDom++;
      else if (upper === 1) het++;
      else homRec++;
    }
  }
  return { homDom, het, homRec };
}

const fracAns = (n: number, d: number): AnswerSpec => {
  const r = rat(n, d);
  return { kind: 'fraction', n: r.n, d: r.d, requireSimplest: false };
};

export const monohybridCrosses: QuestionTemplate = {
  id: 'monohybrid-crosses',
  skillId: 'monohybrid-crosses',
  generate(rng, level) {
    const t = rng.pick(TRAITS);
    const D = t.letter;
    const r = D.toLowerCase();
    const het = `${D}${r}`;
    const homR = `${r}${r}`;
    const homD = `${D}${D}`;
    const intro = `In ${t.organism}, the allele for ${t.dominant} ($\\text{${D}}$) is dominant over the allele for ${t.recessive} ($\\text{${r}}$).`;

    if (level === 1) {
      const c = crossCounts(het, homR);
      return {
        prompt: `${intro} A heterozygous individual ($\\text{${het}}$) is crossed with a homozygous recessive one ($\\text{${homR}}$). What is the probability that an offspring shows the recessive trait (${t.recessive})?`,
        figure: { kind: 'punnett', parentA: het, parentB: homR, reveal: false },
        input: { kind: 'fraction' },
        answer: fracAns(c.homRec, 4),
        answerDisplay: `$${ratTex(rat(c.homRec, 4))}$ (2 out of 4 boxes are $\\text{${homR}}$)`,
        hints: ['Fill in the Punnett square: one parent\'s alleles across the top, the other\'s down the side.', `Only $\\text{${homR}}$ offspring show the recessive trait.`],
        solution: [`Offspring: $\\text{${het}}, \\text{${het}}, \\text{${homR}}, \\text{${homR}}$.`, `${c.homRec} of 4 show the recessive trait: probability $${ratTex(rat(c.homRec, 4))}$.`],
        misconceptions: [{ code: 'genotype-phenotype', answer: fracAns(1, 4), feedback: 'Count the boxes again. With an $\\text{' + homR + '}$ parent, half the offspring get two recessive alleles.' }],
      };
    }
    if (level === 2 || level === 3) {
      const c = crossCounts(het, het);
      if (level === 2) {
        return {
          prompt: `${intro} Two heterozygous parents ($\\text{${het}} \\times \\text{${het}}$) are crossed. What is the probability that an offspring shows the dominant trait (${t.dominant})?`,
          figure: { kind: 'punnett', parentA: het, parentB: het, reveal: false },
          input: { kind: 'fraction' },
          answer: fracAns(c.homDom + c.het, 4),
          answerDisplay: '$\\tfrac{3}{4}$',
          hints: ['Fill in the Punnett square.', `Both $\\text{${homD}}$ and $\\text{${het}}$ show the dominant trait.`],
          solution: [`Offspring: $\\text{${homD}}, \\text{${het}}, \\text{${het}}, \\text{${homR}}$.`, `3 of 4 have at least one $\\text{${D}}$, so the probability is $\\tfrac{3}{4}$.`],
          misconceptions: [
            { code: 'genotype-phenotype', answer: fracAns(1, 4), feedback: `You counted only $\\text{${homD}}$. Heterozygous $\\text{${het}}$ offspring also show the dominant trait.` },
            { code: 'genotype-phenotype', answer: fracAns(1, 2), feedback: `You counted only the heterozygotes. $\\text{${homD}}$ also shows the dominant trait.` },
          ],
        };
      }
      return {
        prompt: `${intro} Two heterozygous parents are crossed. What is the probability that an offspring is heterozygous ($\\text{${het}}$)?`,
        input: { kind: 'fraction' },
        answer: fracAns(c.het, 4),
        answerDisplay: '$\\tfrac{1}{2}$',
        hints: ['Draw the Punnett square for $\\text{' + het + '} \\times \\text{' + het + '}$.', 'Heterozygous means one of each allele.'],
        solution: [`Offspring: $\\text{${homD}}, \\text{${het}}, \\text{${het}}, \\text{${homR}}$.`, '2 of 4 are heterozygous: $\\tfrac{1}{2}$.'],
        misconceptions: [{ code: 'genotype-phenotype', answer: fracAns(3, 4), feedback: 'That is the probability of the dominant **phenotype**. The question asks about the **genotype**.' }],
      };
    }
    if (level === 4) {
      const total = rng.pick([12, 16, 20, 24, 40, 60, 80]);
      const expected = total / 4;
      return {
        prompt: `${intro} Two heterozygous parents produce ${total} offspring. How many would you expect to show the recessive trait (${t.recessive})?`,
        input: { kind: 'numeric' },
        answer: { kind: 'numeric', value: expected, tolerance: 0 },
        answerDisplay: `${expected}`,
        hints: ['First find the probability of the recessive phenotype from a Punnett square.', `Then multiply that probability by ${total}.`],
        solution: [`$P(\\text{${homR}}) = \\tfrac{1}{4}$.`, `Expected: $\\tfrac{1}{4} \\times ${total} = ${expected}$.`],
        misconceptions: [{ code: 'genotype-phenotype', answer: { kind: 'numeric', value: (3 * total) / 4, tolerance: 0 }, feedback: 'That is the number showing the **dominant** trait.' }],
      };
    }
    const options = [
      { id: 'het-het', text: `$\\text{${het}} \\times \\text{${het}}$` },
      { id: 'het-rec', text: `$\\text{${het}} \\times \\text{${homR}}$` },
      { id: 'dom-rec', text: `$\\text{${homD}} \\times \\text{${homR}}$` },
      { id: 'dom-het', text: `$\\text{${homD}} \\times \\text{${het}}$` },
    ];
    const scenario = rng.pick([
      { ratio: 'roughly half', correct: 'het-rec', why: `$\\text{${het}} \\times \\text{${homR}}$ gives $\\text{${het}}$ and $\\text{${homR}}$ in equal numbers.` },
      { ratio: 'about one quarter', correct: 'het-het', why: `Only $\\text{${het}} \\times \\text{${het}}$ produces $\\text{${homR}}$ offspring a quarter of the time.` },
    ]);
    return {
      prompt: `${intro} A breeder crosses two ${t.organism}. Of their many offspring, ${scenario.ratio} show the recessive trait (${t.recessive}). What were the parents' genotypes?`,
      input: { kind: 'choice', options: rng.shuffle(options) },
      answer: { kind: 'choice', id: scenario.correct },
      answerDisplay: options.find((o) => o.id === scenario.correct)!.text,
      hints: ['Recessive offspring ($\\text{' + homR + '}$) need a recessive allele from **each** parent.', 'Try a Punnett square for each option and compare the ratios.'],
      solution: [scenario.why, 'Any cross with a $\\text{' + homD + '}$ parent gives no recessive offspring at all.'],
      misconceptions: options
        .filter((o) => o.id !== scenario.correct)
        .map<Misconception>((o) => ({
          code: 'genotype-phenotype',
          answer: { kind: 'choice', id: o.id },
          feedback: o.id.startsWith('dom') ? `A $\\text{${homD}}$ parent passes on a dominant allele every time, so no offspring could show the recessive trait.` : 'Draw the Punnett square for this cross and check the ratio it gives.',
        })),
    };
  },
};
