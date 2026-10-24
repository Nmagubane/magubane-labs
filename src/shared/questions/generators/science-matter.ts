/** Matter and materials, Grades 7–9: states of matter, density, acids and bases. */
import type { QuestionTemplate, Misconception } from '../types.ts';
import { choice, num, exact, keepNum, degC, n, cap, type Opt } from './kit.ts';

// ---------------------------------------------------------------------------
// States of matter. Melting and boiling points at normal atmospheric pressure (°C).
export interface Substance {
  name: string;
  mp: number;
  bp: number;
  familiar: boolean;
}

export const SUBSTANCES: Substance[] = [
  { name: 'water', mp: 0, bp: 100, familiar: true },
  { name: 'ethanol', mp: -114, bp: 78, familiar: true },
  { name: 'mercury', mp: -39, bp: 357, familiar: true },
  { name: 'iron', mp: 1538, bp: 2862, familiar: true },
  { name: 'table salt (sodium chloride)', mp: 801, bp: 1465, familiar: true },
  { name: 'oxygen', mp: -218, bp: -183, familiar: false },
  { name: 'nitrogen', mp: -210, bp: -196, familiar: false },
  { name: 'chlorine', mp: -101, bp: -34, familiar: false },
  { name: 'bromine', mp: -7, bp: 59, familiar: false },
  { name: 'gold', mp: 1064, bp: 2856, familiar: false },
  { name: 'copper', mp: 1085, bp: 2562, familiar: false },
  { name: 'lead', mp: 327, bp: 1749, familiar: false },
];

export type State = 'solid' | 'liquid' | 'gas';
export const stateAt = (s: Pick<Substance, 'mp' | 'bp'>, t: number): State => (t < s.mp ? 'solid' : t > s.bp ? 'gas' : 'liquid');

/** A temperature comfortably inside the region for a state (never within 5 °C of a boundary). */
function tempIn(rng: { int(a: number, b: number): number }, s: Substance, st: State): number {
  if (st === 'solid') return s.mp - rng.int(8, Math.max(10, Math.min(80, Math.round((s.mp + 273) / 3))));
  if (st === 'gas') return s.bp + rng.int(10, 120);
  const lo = s.mp + 5;
  const hi = s.bp - 5;
  return lo >= hi ? Math.round((s.mp + s.bp) / 2) : rng.int(lo, hi);
}

const STATE_OPTS: Record<State, Opt> = {
  solid: { id: 'solid', text: 'Solid' },
  liquid: { id: 'liquid', text: 'Liquid' },
  gas: { id: 'gas', text: 'Gas' },
};

function stateFeedback(chosen: State, actual: State, s: Substance, t: number): string {
  const T = degC(t);
  if (actual === 'liquid') return chosen === 'solid' ? `${T} is above the melting point (${degC(s.mp)}), so it has already melted.` : `${T} is below the boiling point (${degC(s.bp)}), so it hasn't boiled yet.`;
  if (actual === 'solid') return chosen === 'liquid' ? `${T} is below the melting point (${degC(s.mp)}), so it hasn't melted yet.` : `${T} is below the melting point (${degC(s.mp)}), never mind the boiling point.`;
  return chosen === 'liquid' ? `${T} is above the boiling point (${degC(s.bp)}), so it has boiled.` : `${T} is above the boiling point (${degC(s.bp)}) as well as the melting point.`;
}

const PARTICLES: Record<State, string> = {
  solid: 'Packed tightly in fixed positions, vibrating on the spot',
  liquid: 'Close together, but sliding past each other',
  gas: 'Far apart, moving fast in all directions',
};

export const statesOfMatter: QuestionTemplate = {
  id: 'states-of-matter',
  skillId: 'states-of-matter',
  generate(rng, level) {
    if (level <= 2) {
      const s = rng.pick(SUBSTANCES.filter((x) => (level === 1 ? x.familiar : true)));
      const st = rng.pick(['solid', 'liquid', 'gas'] as const);
      const t = level === 2 && st === 'liquid' && s.mp < 25 && s.bp > 25 && rng.chance(0.4) ? 25 : tempIn(rng, s, st);
      const where = t === 25 ? ' (room temperature)' : '';
      return choice(rng, {
        prompt: `${cap(s.name)} melts at ${degC(s.mp)} and boils at ${degC(s.bp)}. Is it a solid, a liquid or a gas at ${degC(t)}${where}?`,
        correct: STATE_OPTS[st],
        distractors: (['solid', 'liquid', 'gas'] as const).filter((x) => x !== st).map((x) => ({ ...STATE_OPTS[x], feedback: stateFeedback(x, st, s, t) })),
        keepOrder: [STATE_OPTS.solid, STATE_OPTS.liquid, STATE_OPTS.gas],
        code: 'state-boundaries',
        hints: ['Compare the temperature with the melting point first.', 'Below the melting point it is solid; between the two points it is liquid; above the boiling point it is gas.'],
        solution: [`${degC(t)} is ${st === 'solid' ? `below the melting point (${degC(s.mp)})` : st === 'gas' ? `above the boiling point (${degC(s.bp)})` : `between the melting point (${degC(s.mp)}) and the boiling point (${degC(s.bp)})`}.`, `So ${s.name} is a **${st}** at ${degC(t)}.`],
      });
    }

    if (level === 3) {
      const changes = [
        { from: 'solid', to: 'liquid', id: 'melting', verb: 'heated' },
        { from: 'liquid', to: 'solid', id: 'freezing', verb: 'cooled' },
        { from: 'liquid', to: 'gas', id: 'boiling', verb: 'heated' },
        { from: 'gas', to: 'liquid', id: 'condensation', verb: 'cooled' },
      ] as const;
      const NAMES: Record<string, Opt> = {
        melting: { id: 'melting', text: 'Melting', feedback: 'Melting is solid → liquid.' },
        freezing: { id: 'freezing', text: 'Freezing', feedback: 'Freezing is liquid → solid.' },
        boiling: { id: 'boiling', text: 'Boiling (evaporation)', feedback: 'Boiling is liquid → gas.' },
        condensation: { id: 'condensation', text: 'Condensation', feedback: 'Condensation is gas → liquid.' },
        sublimation: { id: 'sublimation', text: 'Sublimation', feedback: 'Sublimation is solid → gas, skipping the liquid.' },
      };
      if (rng.chance(0.15)) {
        const t1 = -rng.int(85, 110);
        const t2 = -rng.int(20, 60);
        return choice(rng, {
          prompt: `Solid carbon dioxide ("dry ice") at ${degC(t1)} is left out at ${degC(t2)}. It turns straight into a gas without becoming a liquid. What is this change called?`,
          correct: NAMES.sublimation!,
          distractors: ['melting', 'boiling', 'condensation'].map((k) => NAMES[k]!),
          code: 'state-boundaries',
          hints: ['It goes from solid to gas in one step.'],
          solution: ['A solid turning directly into a gas is **sublimation**. At normal air pressure, carbon dioxide has no liquid state.'],
        });
      }
      const c = rng.pick(changes);
      const s = rng.pick(SUBSTANCES);
      const t1 = tempIn(rng, s, c.from);
      const t2 = tempIn(rng, s, c.to);
      return choice(rng, {
        prompt: `A sample of ${s.name} at ${degC(t1)} is ${c.verb} to ${degC(t2)}. It melts at ${degC(s.mp)} and boils at ${degC(s.bp)}. Which change of state happens?`,
        correct: { id: c.id, text: NAMES[c.id]!.text },
        distractors: Object.values(NAMES).filter((o) => o.id !== c.id && o.id !== 'sublimation'),
        code: 'state-boundaries',
        hints: [`Work out the state at ${degC(t1)}, then the state at ${degC(t2)}.`],
        solution: [`At ${degC(t1)} it is a ${c.from}; at ${degC(t2)} it is a ${c.to}.`, `${cap(c.from)} → ${c.to} is **${NAMES[c.id]!.text.toLowerCase()}**.`],
      });
    }

    if (level === 4) {
      const s = rng.pick(SUBSTANCES);
      if (rng.chance(0.35)) {
        const st: State = s.bp - s.mp > 30 ? 'liquid' : rng.pick(['solid', 'gas'] as const);
        const t1 = tempIn(rng, s, st);
        const t2 = st === 'liquid' ? Math.min(s.bp - 3, t1 + rng.int(3, 40)) : st === 'solid' ? Math.min(s.mp - 3, t1 + rng.int(2, 6)) : t1 + rng.int(10, 50);
        const opts: Opt[] = [
          { id: 'faster', text: 'They move faster' },
          { id: 'bigger', text: 'Each particle gets bigger', feedback: 'Particles themselves don\'t grow. They move faster and spread out a little, so the **substance** expands.' },
          { id: 'melt', text: 'The particles start to melt', feedback: 'Single particles can\'t melt. Melting describes what the whole substance does when its particles break free of fixed positions.' },
          { id: 'slower', text: 'They move more slowly', feedback: 'Heating gives particles more energy, so they move faster, not slower.' },
        ];
        return choice(rng, {
          prompt: `${cap(s.name)} is warmed from ${degC(t1)} to ${degC(t2)}. It stays a ${st} the whole time. What happens to its particles?`,
          correct: opts[0]!,
          distractors: opts.slice(1),
          code: 'particle-model',
          hints: ['Heating transfers energy to the particles.'],
          solution: ['Heating gives the particles more kinetic energy, so they **move faster** (vibrate harder in a solid).', 'The particles don\'t change size. The substance expands slightly because the particles move further apart.'],
        });
      }
      const st = rng.pick(['solid', 'liquid', 'gas'] as const);
      const t = tempIn(rng, s, st);
      const opts = (['solid', 'liquid', 'gas'] as const).map((x) => ({ id: x, text: PARTICLES[x] }));
      return choice(rng, {
        prompt: `${cap(s.name)} melts at ${degC(s.mp)} and boils at ${degC(s.bp)}. Which describes its particles at ${degC(t)}?`,
        correct: opts.find((o) => o.id === st)!,
        distractors: opts.filter((o) => o.id !== st).map((o) => ({ ...o, feedback: `That describes a ${o.id}. At ${degC(t)}, ${s.name} is a ${st}.` })),
        code: 'particle-model',
        hints: ['First decide whether it is a solid, liquid or gas at this temperature.'],
        solution: [`At ${degC(t)}, ${s.name} is a ${st}.`, `In a ${st}, particles are ${PARTICLES[st].toLowerCase()}.`],
      });
    }

    // Level 5: reason with data.
    if (rng.chance(0.5)) {
      const s = rng.pick(SUBSTANCES);
      const range = s.bp - s.mp;
      const ms: Misconception[] = s.mp < 0 ? [{ code: 'integer-rules', answer: exact(s.bp + s.mp), feedback: `Subtracting a negative melting point means adding: ${n(s.bp)} − (${n(s.mp)}) = ${n(s.bp)} + ${n(-s.mp)}.` }] : [];
      return {
        prompt: `${cap(s.name)} melts at ${degC(s.mp)} and boils at ${degC(s.bp)}. Over a range of how many degrees Celsius is it a liquid?`,
        input: { kind: 'numeric', unit: '°C' },
        answer: exact(range),
        answerDisplay: `${range} °C`,
        hints: ['The liquid range runs from the melting point up to the boiling point.', 'Range = boiling point − melting point.'],
        solution: [`Range $= ${s.bp} - (${s.mp}) = ${range}$ °C.`],
        misconceptions: keepNum(ms, range),
      };
    }
    const target = rng.pick(SUBSTANCES);
    const t = tempIn(rng, target, 'liquid');
    const others = rng.shuffle(SUBSTANCES.filter((x) => x !== target && Math.min(Math.abs(t - x.mp), Math.abs(t - x.bp)) > 5 && stateAt(x, t) !== 'liquid')).slice(0, 3);
    const all = [target, ...others];
    const data = rng.shuffle(all).map((x) => `${x.name} (melts at ${degC(x.mp)}, boils at ${degC(x.bp)})`).join('; ');
    return choice(rng, {
      prompt: `Which of these is a liquid at ${degC(t)}? ${cap(data)}.`,
      correct: { id: target.name, text: cap(target.name) },
      distractors: others.map((x) => ({ id: x.name, text: cap(x.name), feedback: `At ${degC(t)}, ${x.name} is a ${stateAt(x, t)}: ${stateAt(x, t) === 'solid' ? `that's below its melting point (${degC(x.mp)})` : `that's above its boiling point (${degC(x.bp)})`}.` })),
      code: 'state-boundaries',
      hints: ['For each substance, ask: is the temperature above its melting point **and** below its boiling point?'],
      solution: [`${cap(target.name)}: ${degC(t)} is between ${degC(target.mp)} and ${degC(target.bp)}, so it is a liquid.`, 'Every other substance is either below its melting point or above its boiling point.'],
    });
  },
};

// ---------------------------------------------------------------------------
// Density (g/cm³).
export const MATERIALS = [
  { name: 'cork', rho: 0.24 },
  { name: 'pine wood', rho: 0.5 },
  { name: 'ice', rho: 0.92 },
  { name: 'concrete', rho: 2.4 },
  { name: 'glass', rho: 2.5 },
  { name: 'aluminium', rho: 2.7 },
  { name: 'iron', rho: 7.9 },
  { name: 'copper', rho: 8.9 },
  { name: 'silver', rho: 10.5 },
  { name: 'lead', rho: 11.3 },
  { name: 'gold', rho: 19.3 },
] as const;
const METALS = MATERIALS.filter((m) => m.rho >= 2.7);
export const LIQUIDS = [
  { name: 'water', rho: 1.0 },
  { name: 'cooking oil', rho: 0.92 },
  { name: 'sea water', rho: 1.03 },
  { name: 'glycerine', rho: 1.26 },
] as const;
/** 12000 → "12 000" (South African style, no locale dependency). */
const grp = (v: number) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;

export const density: QuestionTemplate = {
  id: 'density',
  skillId: 'density',
  generate(rng, level) {
    if (level === 1) {
      const mat = rng.pick(MATERIALS);
      const V = rng.int(2, 40);
      const m = r1(mat.rho * V);
      const rho = r2(m / V);
      return {
        prompt: `A block of an unknown material has a mass of ${n(m, 1)} g and a volume of ${V} cm³. What is its density?`,
        input: { kind: 'numeric', unit: 'g/cm³' },
        answer: num(rho),
        answerDisplay: `${n(rho)} g/cm³`,
        hints: ['Density = mass ÷ volume.'],
        solution: [`$\\rho = \\dfrac{m}{V} = \\dfrac{${m}}{${V}} = ${rho}$ g/cm³.`, `That matches ${mat.name} (${mat.rho} g/cm³).`],
        misconceptions: keepNum([{ code: 'formula-rearranged-wrongly', answer: num(V / m), feedback: 'You divided volume by mass. Density is **mass** ÷ volume.' }], rho),
      };
    }
    if (level === 2) {
      const mat = rng.pick(MATERIALS);
      const V = rng.int(2, 60);
      const m = r2(mat.rho * V);
      return {
        prompt: `${cap(mat.name)} has a density of ${mat.rho} g/cm³. What is the mass of a ${V} cm³ piece of ${mat.name}?`,
        input: { kind: 'numeric', unit: 'g' },
        answer: num(m),
        answerDisplay: `${n(m)} g`,
        hints: ['Rearrange $\\rho = \\dfrac{m}{V}$ to make $m$ the subject.', '$m = \\rho V$.'],
        solution: [`$m = \\rho V = ${mat.rho} \\times ${V} = ${m}$ g.`],
        misconceptions: keepNum(
          [
            { code: 'formula-rearranged-wrongly', answer: num(mat.rho / V), feedback: 'Mass = density × volume. You divided.' },
            { code: 'formula-rearranged-wrongly', answer: num(V / mat.rho), feedback: 'Volume ÷ density gives... nothing useful here. Mass = density × volume.' },
          ],
          m,
        ),
      };
    }
    if (level === 3) {
      const mat = rng.pick(METALS);
      const V = rng.int(2, 50);
      const m = r1(mat.rho * V);
      const v = r2(m / mat.rho);
      return {
        prompt: `A ${mat.name} object has a mass of ${n(m, 1)} g. The density of ${mat.name} is ${mat.rho} g/cm³. What is its volume?`,
        input: { kind: 'numeric', unit: 'cm³' },
        answer: num(v),
        answerDisplay: `${n(v)} cm³`,
        hints: ['Rearrange $\\rho = \\dfrac{m}{V}$ to make $V$ the subject.', '$V = \\dfrac{m}{\\rho}$.'],
        solution: [`$V = \\dfrac{m}{\\rho} = \\dfrac{${m}}{${mat.rho}} = ${v}$ cm³.`],
        misconceptions: keepNum([{ code: 'formula-rearranged-wrongly', answer: num(m * mat.rho), feedback: 'Volume = mass ÷ density. You multiplied.' }], v),
      };
    }
    if (level === 4) {
      const liquid = rng.pick(LIQUIDS);
      // An object density clearly above or below the liquid's (never within 6%).
      let rho = 0;
      do rho = r2(rng.pick([0.1, 0.2, 0.3, 0.45, 0.6, 0.7, 0.8, 0.85, 1.1, 1.15, 1.4, 1.6, 2.2, 2.7, 4.5, 7.9]) * (1 + (rng.int(-3, 3) / 100)));
      while (Math.abs(rho - liquid.rho) / liquid.rho < 0.06);
      const heavy = rng.chance(0.5);
      const V = heavy ? rng.int(4, 60) * 500 : rng.int(2, 30);
      const m = Math.round(rho * V);
      const actual = m / V;
      const floats = actual < liquid.rho;
      const opts: Opt[] = [
        { id: 'float', text: 'It floats' },
        { id: 'sink', text: 'It sinks' },
      ];
      const wrong = floats ? opts[1]! : opts[0]!;
      return choice(rng, {
        prompt: `An object has a mass of ${grp(m)} g and a volume of ${grp(V)} cm³. It is dropped into ${liquid.name} (density ${liquid.rho} g/cm³). Does it float or sink?`,
        correct: floats ? opts[0]! : opts[1]!,
        distractors: [{ ...wrong, feedback: floats ? `Its density is ${n(actual)} g/cm³, less than the ${liquid.name}'s ${liquid.rho} g/cm³. However heavy it is, it floats.` : `Its density is ${n(actual)} g/cm³, more than the ${liquid.name}'s ${liquid.rho} g/cm³. However light it seems, it sinks.` }],
        keepOrder: opts,
        code: 'mass-not-density',
        hints: ['Work out the object\'s density first.', 'Compare it with the density of the liquid.'],
        solution: [`$\\rho = \\dfrac{${m}}{${V}} = ${r2(actual)}$ g/cm³.`, `${r2(actual)} ${floats ? '<' : '>'} ${liquid.rho}, so it **${floats ? 'floats' : 'sinks'}**.`],
      });
    }
    const metal = rng.pick(METALS);
    const V = rng.int(2, 30);
    const V1 = rng.int(20, 60);
    const V2 = V1 + V;
    const m = r1(metal.rho * V);
    const rho = r2(m / V);
    return {
      prompt: `A metal ring with a mass of ${n(m, 1)} g is lowered into a measuring cylinder. The water level rises from ${V1} mL to ${V2} mL. What is the density of the metal?`,
      input: { kind: 'numeric', unit: 'g/cm³' },
      answer: num(rho),
      answerDisplay: `${n(rho)} g/cm³ (it is probably ${metal.name})`,
      hints: ['The ring pushes aside its own volume of water. $1$ mL $= 1$ cm³.', 'Volume of the ring = final reading − starting reading.'],
      solution: [`$V = ${V2} - ${V1} = ${V}$ cm³.`, `$\\rho = \\dfrac{m}{V} = \\dfrac{${m}}{${V}} = ${rho}$ g/cm³.`, `That matches ${metal.name} (${metal.rho} g/cm³).`],
      misconceptions: keepNum(
        [
          { code: 'displacement-volume', answer: num(m / V2), feedback: `You used the final reading. The ring's volume is the **rise**: ${V2} − ${V1} = ${V} cm³.` },
          { code: 'displacement-volume', answer: num(m / V1), feedback: `You used the starting reading. The ring's volume is the **rise**: ${V2} − ${V1} = ${V} cm³.` },
          { code: 'formula-rearranged-wrongly', answer: num(V / m), feedback: 'Density is mass ÷ volume, not volume ÷ mass.' },
        ],
        rho,
      ),
    };
  },
};

// ---------------------------------------------------------------------------
// Acids and bases. Typical pH values (they vary; prompts say "about").
export const PH_SUBSTANCES = [
  { name: 'battery acid', ph: 0.8 },
  { name: 'stomach acid', ph: 1.5 },
  { name: 'lemon juice', ph: 2.2 },
  { name: 'cola', ph: 2.5 },
  { name: 'vinegar', ph: 2.9 },
  { name: 'orange juice', ph: 3.5 },
  { name: 'tomato juice', ph: 4.3 },
  { name: 'black coffee', ph: 5 },
  { name: 'milk', ph: 6.6 },
  { name: 'pure water', ph: 7 },
  { name: 'blood', ph: 7.4 },
  { name: 'sea water', ph: 8.1 },
  { name: 'baking soda solution', ph: 8.3 },
  { name: 'soapy water', ph: 10 },
  { name: 'milk of magnesia', ph: 10.5 },
  { name: 'household ammonia', ph: 11.5 },
  { name: 'bleach', ph: 12.5 },
  { name: 'drain cleaner', ph: 13.5 },
] as const;

type PhClass = 'acidic' | 'neutral' | 'basic';
const phClass = (ph: number): PhClass => (ph < 7 ? 'acidic' : ph > 7 ? 'basic' : 'neutral');

const ACIDS = [
  { name: 'hydrochloric acid', salt: 'chloride' },
  { name: 'sulfuric acid', salt: 'sulfate' },
  { name: 'nitric acid', salt: 'nitrate' },
] as const;
const PARTNERS = [
  { name: 'sodium hydroxide', metal: 'sodium', type: 'base' },
  { name: 'potassium hydroxide', metal: 'potassium', type: 'base' },
  { name: 'calcium hydroxide', metal: 'calcium', type: 'base' },
  { name: 'magnesium oxide', metal: 'magnesium', type: 'base' },
  { name: 'copper(II) oxide', metal: 'copper(II)', type: 'base' },
  { name: 'calcium carbonate (chalk)', metal: 'calcium', type: 'carbonate' },
  { name: 'sodium carbonate', metal: 'sodium', type: 'carbonate' },
  { name: 'magnesium ribbon', metal: 'magnesium', type: 'metal' },
  { name: 'zinc granules', metal: 'zinc', type: 'metal' },
] as const;

export const acidsBases: QuestionTemplate = {
  id: 'acids-bases',
  skillId: 'acids-bases',
  generate(rng, level) {
    if (level === 1) {
      const generic = rng.chance(0.35);
      const s = generic ? { name: 'a solution', ph: rng.pick([1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13]) + rng.pick([0, 0.5]) } : rng.pick(PH_SUBSTANCES);
      const cls = phClass(s.ph);
      const opts: Record<PhClass, Opt> = { acidic: { id: 'acidic', text: 'Acidic' }, neutral: { id: 'neutral', text: 'Neutral' }, basic: { id: 'basic', text: 'Basic (alkaline)' } };
      return choice(rng, {
        prompt: `${cap(s.name)} has a pH of ${generic ? '' : 'about '}${n(s.ph, 1)}. Is it acidic, neutral or basic?`,
        correct: opts[cls],
        distractors: (Object.keys(opts) as PhClass[]).filter((k) => k !== cls).map((k) => ({ ...opts[k], feedback: k === 'neutral' ? 'Only pH 7 is neutral.' : `pH ${k === 'acidic' ? 'below' : 'above'} 7 is ${k}. ${n(s.ph, 1)} is ${s.ph < 7 ? 'below' : 'above'} 7.` })),
        keepOrder: [opts.acidic, opts.neutral, opts.basic],
        code: 'ph-scale',
        hints: ['pH 7 is neutral. Which side of 7 is this?'],
        solution: [`pH ${n(s.ph, 1)} is ${cls === 'neutral' ? 'exactly 7' : s.ph < 7 ? 'below 7' : 'above 7'}, so it is **${cls}**.`],
      });
    }
    if (level === 2) {
      const wantAcid = rng.chance(0.5);
      const pool = PH_SUBSTANCES.filter((s) => (wantAcid ? s.ph < 7 : s.ph > 7));
      const picks = rng.shuffle(pool).slice(0, 2);
      const other = rng.shuffle(PH_SUBSTANCES.filter((s) => !picks.includes(s) && (wantAcid ? s.ph >= 7 : s.ph <= 7))).slice(0, 2);
      const all = [...picks, ...other];
      const best = picks.reduce((a, b) => (wantAcid ? (b.ph < a.ph ? b : a) : b.ph > a.ph ? b : a));
      const listed = rng.shuffle(all);
      return choice(rng, {
        prompt: `Which is the strongest ${wantAcid ? 'acid' : 'base'}? ${listed.map((s) => `${cap(s.name)} (pH ${n(s.ph, 1)})`).join(', ')}.`,
        correct: { id: best.name, text: cap(best.name) },
        distractors: all
          .filter((s) => s !== best)
          .map((s) => ({
            id: s.name,
            text: cap(s.name),
            feedback: phClass(s.ph) !== (wantAcid ? 'acidic' : 'basic') ? `${cap(s.name)} (pH ${n(s.ph, 1)}) isn't ${wantAcid ? 'acidic' : 'basic'} at all.` : `${cap(s.name)} is ${wantAcid ? 'an acid' : 'a base'}, but its pH is closer to 7 than ${best.name}'s (${n(best.ph, 1)}).`,
          })),
        code: 'ph-scale',
        hints: [wantAcid ? 'Acids have pH below 7. The lower the pH, the stronger the acid.' : 'Bases have pH above 7. The higher the pH, the stronger the base.'],
        solution: [`The strongest ${wantAcid ? 'acid has the lowest' : 'base has the highest'} pH: **${best.name}** (pH ${n(best.ph, 1)}).`],
      });
    }
    if (level === 3) {
      const clear = PH_SUBSTANCES.filter((s) => s.ph <= 4.3 || s.ph >= 10 || s.ph === 7);
      const s = rng.pick(clear);
      const cls = phClass(s.ph);
      const ind = rng.pick(['blue litmus', 'red litmus', 'phenolphthalein'] as const);
      if (ind === 'phenolphthalein') {
        const pink = s.ph >= 10 && s.ph <= 12;
        const sub = pink || s.ph <= 7 ? s : rng.pick(clear.filter((x) => x.ph <= 7));
        const isPink = sub.ph >= 10;
        const opts: Opt[] = [
          { id: 'colourless', text: 'Colourless' },
          { id: 'pink', text: 'Pink' },
          { id: 'blue', text: 'Blue', feedback: 'Phenolphthalein is never blue. It is colourless in acids and neutral solutions, and pink in bases.' },
          { id: 'red', text: 'Red', feedback: 'Phenolphthalein is never red. It is colourless in acids and neutral solutions, and pink in bases.' },
        ];
        const correct = isPink ? opts[1]! : opts[0]!;
        return choice(rng, {
          prompt: `A few drops of phenolphthalein are added to ${sub.name} (pH about ${n(sub.ph, 1)}). What colour is the mixture?`,
          correct,
          distractors: opts.filter((o) => o !== correct).map((o) => ({ ...o, feedback: o.feedback ?? (isPink ? 'This is a base, so phenolphthalein turns pink.' : `Phenolphthalein stays colourless in ${phClass(sub.ph) === 'neutral' ? 'neutral solutions' : 'acids'}.`) })),
          code: 'indicator-colour',
          hints: [`Is ${sub.name} acidic, neutral or basic?`, 'Phenolphthalein only changes colour in bases.'],
          solution: [`${cap(sub.name)} is ${phClass(sub.ph)}.`, `Phenolphthalein is **${isPink ? 'pink' : 'colourless'}** in ${isPink ? 'bases' : phClass(sub.ph) === 'neutral' ? 'neutral solutions' : 'acids'}.`],
        });
      }
      const blue = ind === 'blue litmus';
      const changes = blue ? cls === 'acidic' : cls === 'basic';
      const opts: Opt[] = [
        { id: 'red', text: 'It turns red' },
        { id: 'blue', text: 'It turns blue' },
        { id: 'same', text: 'It stays the same colour' },
      ];
      const correct = changes ? (blue ? opts[0]! : opts[1]!) : opts[2]!;
      return choice(rng, {
        prompt: `A strip of ${ind} paper is dipped into ${s.name} (pH about ${n(s.ph, 1)}). What happens to the paper?`,
        correct,
        distractors: opts
          .filter((o) => o !== correct)
          .map((o) => ({
            ...o,
            feedback:
              o.id === 'same'
                ? `${cap(s.name)} is ${cls}, and ${cls === 'acidic' ? 'acids turn blue litmus red' : 'bases turn red litmus blue'}.`
                : (o.id === 'red' && !blue) || (o.id === 'blue' && blue)
                  ? `The paper is already ${blue ? 'blue' : 'red'}. Ask whether it changes at all.`
                  : cls === 'neutral'
                    ? 'A neutral solution doesn\'t change either colour of litmus.'
                    : `${cap(s.name)} is ${cls}. ${blue ? 'Blue litmus only changes in acids.' : 'Red litmus only changes in bases.'}`,
          })),
        code: 'indicator-colour',
        hints: [`Is ${s.name} acidic, neutral or basic?`, 'Acids turn blue litmus red. Bases turn red litmus blue.'],
        solution: [`${cap(s.name)} is ${cls}.`, changes ? `${cls === 'acidic' ? 'Acids turn blue litmus red' : 'Bases turn red litmus blue'}.` : `${cap(ind)} only changes colour in ${blue ? 'acids' : 'bases'}, so it **stays the same**.`],
      });
    }
    if (level === 4) {
      const acid = rng.pick(ACIDS);
      const p = rng.pick(PARTNERS);
      const salt = `${p.metal} ${acid.salt}`;
      const wrongSalt = `${p.metal} ${rng.pick(ACIDS.filter((a) => a !== acid)).salt}`;
      const products = {
        base: `${salt} and water`,
        carbonate: `${salt}, water and carbon dioxide`,
        metal: `${salt} and hydrogen`,
      } as const;
      const correctText = products[p.type];
      const opts: Opt[] = (['base', 'carbonate', 'metal'] as const).map((t) => ({
        id: t,
        text: cap(products[t]),
        feedback: t === 'base' ? 'Salt + water is what an acid gives with a hydroxide or an oxide.' : t === 'carbonate' ? 'Carbon dioxide only forms when the acid reacts with a **carbonate**.' : 'Hydrogen only forms when the acid reacts with a **metal**.',
      }));
      const ws: Opt = { id: 'wrong-salt', text: cap(correctText.replace(salt, wrongSalt)), feedback: `The salt is named after the acid: ${acid.name} makes a ${acid.salt}.` };
      return choice(rng, {
        prompt: `${cap(acid.name)} reacts with ${p.name}. What are the products?`,
        correct: opts.find((o) => o.id === p.type)!,
        distractors: [...opts.filter((o) => o.id !== p.type), ws],
        code: 'neutralisation-products',
        hints: [`Is ${p.name} a base (hydroxide or oxide), a carbonate or a metal?`, 'The salt\'s name: metal first, then the part from the acid (chloride, sulfate, nitrate).'],
        solution: [`${cap(p.name)} is ${p.type === 'base' ? 'a base' : p.type === 'carbonate' ? 'a carbonate' : 'a metal'}.`, `Acid + ${p.type === 'base' ? 'base → salt + water' : p.type === 'carbonate' ? 'carbonate → salt + water + carbon dioxide' : 'metal → salt + hydrogen'}.`, `${cap(acid.name)} gives a ${acid.salt}, so the products are **${correctText}**.`],
      });
    }
    const contexts = ['two samples of rainwater', 'water from two rivers', 'two soil samples mixed with water', 'two fruit juices', 'two swimming-pool water samples'];
    const ctx = rng.pick(contexts);
    const a = rng.int(2, 5);
    const b = a + rng.int(1, 3);
    const times = 10 ** (b - a);
    return {
      prompt: `Scientists test ${ctx}. Sample A has a pH of ${a} and sample B has a pH of ${b}. How many times higher is the concentration of hydrogen ions in sample A?`,
      input: { kind: 'numeric', unit: 'times' },
      answer: exact(times),
      answerDisplay: `${times} times`,
      hints: ['The pH scale is not like a ruler: each step of 1 is a factor of 10.', `The difference is ${b - a} step${b - a === 1 ? '' : 's'}.`],
      solution: [`Difference: $${b} - ${a} = ${b - a}$.`, `Each step multiplies by 10: $10^{${b - a}} = ${times}$.`],
      misconceptions: keepNum(
        [
          { code: 'ph-tenfold', answer: exact(b - a), feedback: `${b - a} is the difference in pH, but each pH step is a **factor of 10**.` },
          { code: 'ph-tenfold', answer: exact((b - a) * 10), feedback: `Each step multiplies by 10, so ${b - a} steps is $10^{${b - a}}$, not ${b - a} × 10.` },
        ],
        times,
      ),
    };
  },
};
