/** Energy and electricity: heat transfer (Gr 7), series and parallel circuits (Gr 9), mechanical energy (Gr 10). */
import type { QuestionTemplate, Misconception } from '../types.ts';
import { fmt, round } from '../tex.ts';
import { choice, num, keepNum, n, cap, type Opt } from './kit.ts';

// ---------------------------------------------------------------------------
type Mode = 'conduction' | 'convection' | 'radiation';
const MODE_OPTS: Record<Mode, Opt> = {
  conduction: { id: 'conduction', text: 'Conduction' },
  convection: { id: 'convection', text: 'Convection' },
  radiation: { id: 'radiation', text: 'Radiation' },
};
const MODE_WHY: Record<Mode, string> = {
  conduction: 'Conduction passes heat from particle to particle through something solid, or between things that touch.',
  convection: 'Convection happens when a liquid or a gas moves, carrying heat with it: warm fluid rises, cool fluid sinks.',
  radiation: 'Radiation travels as waves (infrared). It needs no particles, so it even crosses empty space.',
};

const SCENARIOS: { text: string; mode: Mode }[] = [
  { text: 'A metal spoon left in a pot of hot soup becomes hot right up to the handle.', mode: 'conduction' },
  { text: 'You burn your fingers touching the handle of a pot that has been on the stove.', mode: 'conduction' },
  { text: 'A tiled floor feels cold under bare feet on a winter morning.', mode: 'conduction' },
  { text: 'An ice cube melts faster on a metal tray than on a wooden chopping board.', mode: 'conduction' },
  { text: 'Boerewors on a braai grid gets dark stripes where it touches the hot metal.', mode: 'conduction' },
  { text: 'Hot air rises above a heater, and cooler air flows in to take its place.', mode: 'convection' },
  { text: 'Water heated at the bottom of a kettle rises, and cooler water sinks to be heated.', mode: 'convection' },
  { text: 'Smoke from a fire drifts upwards.', mode: 'convection' },
  { text: 'A hot-air balloon rises when the burner heats the air inside it.', mode: 'convection' },
  { text: 'An air conditioner is mounted high on a wall so that the cool air sinks through the room.', mode: 'convection' },
  { text: 'You feel the warmth of the Sun on your face.', mode: 'radiation' },
  { text: 'A solar geyser panel on a roof heats up in the sunshine.', mode: 'radiation' },
  { text: 'A black car parked in the sun gets hotter than a white one.', mode: 'radiation' },
  { text: 'You feel the glow of a bar heater on your skin from across the room.', mode: 'radiation' },
  { text: 'The Sun\'s energy reaches Earth across millions of kilometres of empty space.', mode: 'radiation' },
];

const K = [
  { name: 'copper', k: 400 },
  { name: 'aluminium', k: 237 },
  { name: 'iron', k: 80 },
  { name: 'glass', k: 1 },
  { name: 'wood', k: 0.15 },
  { name: 'plastic', k: 0.2 },
  { name: 'wool', k: 0.04 },
  { name: 'polystyrene foam', k: 0.03 },
] as const;
const CONDUCT_CTX = ['A cook wants a pot base that heats food quickly and evenly.', 'A computer chip needs a heat sink to carry heat away from it fast.', 'A braai grid should get hot enough to sear meat.', 'A frying pan should spread the stove\'s heat to the food quickly.', 'A geyser element is covered in a metal sheath that must pass heat into the water.', 'An engineer needs a rod that carries heat from one end to the other as fast as possible.'];
const INSULATE_CTX = ['A pot handle must stay cool enough to hold.', 'A cooler box must keep cold drinks cold on a hot day.', 'An oven glove must protect your hand from a hot tray.', 'A tea cosy must keep a teapot warm.', 'The lid of a lunch flask must stop heat escaping.', 'A takeaway coffee cup must keep the drink hot without burning your hand.'];

interface Concept {
  prompt: string;
  correct: string;
  wrong: [string, string][];
  why: string;
  level: 3 | 4;
  code: 'heat-transfer-mode' | 'conductor-insulator';
}
const CONCEPTS: Concept[] = [
  { level: 3, code: 'conductor-insulator', prompt: 'On a cold morning a metal bench and a wooden bench are both at 8 °C, but the metal one feels much colder to sit on. Why?', correct: 'Metal conducts heat away from your body faster', wrong: [['The metal is actually at a lower temperature', 'Both benches are at 8 °C. A thermometer would read the same on each.'], ['Metal lets the cold flow into you', 'Cold doesn\'t flow. Heat flows from warm to cold: from you into the bench.'], ['Wood makes its own heat', 'Wood doesn\'t produce heat. It is an insulator, so it carries heat away from you slowly.']], why: 'Both are at the same temperature. Metal is a good conductor, so it carries heat away from your skin quickly, and your skin feels cold.' },
  { level: 3, code: 'conductor-insulator', prompt: 'Double-glazed windows have two panes of glass with a layer of air trapped between them. Why do they keep a house warmer?', correct: 'Trapped air is a poor conductor of heat', wrong: [['Two panes reflect all the heat back inside', 'Glass lets most radiation through. It is the trapped air layer that matters.'], ['Air is a good conductor, so it spreads the heat out', 'Air is one of the **worst** conductors. That is exactly why it insulates.'], ['The glass gets thicker in winter', 'The glass doesn\'t change. The insulation comes from the still air between the panes.']], why: 'Still, trapped air is an excellent insulator, so far less heat is conducted out through the window.' },
  { level: 3, code: 'conductor-insulator', prompt: 'Why do birds fluff up their feathers on a freezing morning?', correct: 'To trap more air, which insulates them', wrong: [['To make heat by moving the feathers', 'Fluffing isn\'t about moving. It creates a thicker layer of still air.'], ['So the sun can reach their skin', 'The point is to keep heat in, not to let sunlight through.'], ['Feathers conduct heat into their bodies', 'Feathers are insulators; heat leaves the bird more slowly through them.']], why: 'Fluffed feathers hold a thicker layer of still air, and still air is a poor conductor. Less heat escapes.' },
  { level: 3, code: 'heat-transfer-mode', prompt: 'A vacuum flask has a vacuum (empty space) between its two glass walls. Which kinds of heat transfer does the vacuum stop?', correct: 'Conduction and convection', wrong: [['Radiation only', 'Radiation can cross a vacuum. That is how sunlight reaches us. The shiny walls deal with radiation.'], ['All three: conduction, convection and radiation', 'Radiation crosses a vacuum easily, so the vacuum can\'t stop it.'], ['Convection only', 'A vacuum has no particles, so conduction is stopped too.']], why: 'Conduction and convection both need particles. A vacuum has none, so both are stopped.' },
  { level: 3, code: 'heat-transfer-mode', prompt: 'Why is the heating element of a kettle at the bottom, not the top?', correct: 'Heated water rises, so convection currents heat all the water', wrong: [['Heat only travels downwards', 'Heat in a fluid is carried **upwards** by the rising warm water.'], ['So the element is closer to the plug', 'It is about how the water moves, not wiring.'], ['Radiation works best through water', 'The main process inside the water is convection.']], why: 'Water heated at the bottom becomes less dense and rises; cooler water sinks to take its place. That circulation heats the whole kettle.' },
  { level: 3, code: 'conductor-insulator', prompt: 'Why do cooks stir hot pots with wooden spoons rather than metal ones?', correct: 'Wood is a poor conductor, so the handle stays cool', wrong: [['Wood heats up faster than metal', 'It\'s the opposite: wood conducts heat very slowly.'], ['Metal spoons make food cook slower', 'The spoon doesn\'t change the cooking much. The point is your hand.'], ['Wood reflects heat', 'Wood doesn\'t reflect heat. It is an insulator: it conducts heat slowly.']], why: 'Wood is an insulator, so heat from the food travels up the handle very slowly.' },
  { level: 3, code: 'conductor-insulator', prompt: 'Ceiling insulation (a thick, fluffy blanket of fibres) keeps a house cooler in summer. How?', correct: 'It traps air, slowing conduction of heat through the ceiling', wrong: [['It makes cold air', 'Insulation doesn\'t make anything cold. It slows heat flow.'], ['It absorbs the heat and destroys it', 'Energy can\'t be destroyed. The insulation just slows heat getting through.'], ['It conducts heat quickly out of the roof', 'It is a poor conductor; that is the whole point.']], why: 'The fibres trap still air, a poor conductor, so heat from the hot roof reaches the rooms slowly.' },
  { level: 4, code: 'heat-transfer-mode', prompt: 'The inner walls of a vacuum flask are silvered like a mirror. Which kind of heat transfer does that reduce?', correct: 'Radiation', wrong: [['Conduction', 'The vacuum stops conduction. The shiny surface deals with radiation.'], ['Convection', 'The vacuum stops convection. The shiny surface deals with radiation.'], ['None: it is only decoration', 'Shiny surfaces reflect infrared radiation back towards the drink.']], why: 'Shiny, silvery surfaces reflect infrared radiation, so heat isn\'t radiated away from the drink.' },
  { level: 4, code: 'heat-transfer-mode', prompt: 'Which colour of roof keeps a house coolest on a hot, sunny day?', correct: 'White or very light', wrong: [['Black', 'Dark, matt surfaces absorb the most radiation, so a black roof gets hottest.'], ['Dark red', 'Dark colours absorb more radiation than light ones.'], ['The colour makes no difference', 'Colour matters for radiation: light colours reflect it, dark colours absorb it.']], why: 'Light-coloured surfaces reflect most of the Sun\'s radiation; dark ones absorb it.' },
  { level: 4, code: 'heat-transfer-mode', prompt: 'A solar cooker is a box with a glass lid. Inside, the pot should be painted which colour to cook fastest?', correct: 'Matt black', wrong: [['Shiny silver', 'Shiny surfaces reflect radiation. You want the pot to absorb it.'], ['White', 'White reflects most radiation. You want the pot to absorb it.'], ['Any colour; only the glass matters', 'The pot\'s colour decides how much radiation it absorbs.']], why: 'Matt black surfaces are the best absorbers of radiation, so the pot heats fastest.' },
  { level: 4, code: 'heat-transfer-mode', prompt: 'Emergency blankets for marathon runners are thin shiny foil. How do they keep a runner warm?', correct: 'They reflect the runner\'s infrared radiation back to the body', wrong: [['They are thick insulators like wool', 'They are paper-thin. The trick is the shiny surface.'], ['They produce heat from sunlight', 'They don\'t produce heat; they reflect it.'], ['They speed up convection', 'They actually reduce convection by trapping air, but the shiny surface\'s main job is reflecting radiation.']], why: 'Shiny surfaces are poor emitters and good reflectors of infrared radiation, so the body\'s heat is reflected back.' },
  { level: 4, code: 'heat-transfer-mode', prompt: 'On a hot afternoon at the beach, the sand heats up faster than the sea. Which way does the breeze blow?', correct: 'From the sea towards the land', wrong: [['From the land towards the sea', 'That happens at night, when the land cools faster than the sea.'], ['Straight up', 'The warm air above the land rises, but air flows in sideways to replace it.'], ['There is no breeze', 'The difference in temperature sets up a convection current.']], why: 'Air above the hot land warms and rises. Cooler air from over the sea flows in to replace it: a sea breeze, caused by convection.' },
  { level: 4, code: 'heat-transfer-mode', prompt: 'In an old-style fridge, the freezer compartment is at the top. Why?', correct: 'Cold air sinks, so it cools the whole fridge by convection', wrong: [['Cold rises to the top anyway', 'Cold air is denser, so it **sinks**.'], ['To keep the freezer away from the motor', 'It\'s about how the air moves.'], ['Radiation works better upwards', 'The cooling works by convection: the air circulates.']], why: 'Air cooled by the freezer becomes denser and sinks, while warmer air rises to be cooled. That convection current cools the fridge.' },
];

const BLANKS: { ctx: string; text: string; mode: Mode }[] = [
  { ctx: 'A pot of water boils on a gas stove.', text: 'Heat passes through the metal bottom of the pot by', mode: 'conduction' },
  { ctx: 'A pot of water boils on a gas stove.', text: 'Hot water at the bottom rises and cooler water sinks. Heat spreads through the water by', mode: 'convection' },
  { ctx: 'A pot of water boils on a gas stove.', text: 'You feel heat on your hand held beside the flame (not above it) mainly by', mode: 'radiation' },
  { ctx: 'A room is heated by a heater in winter.', text: 'Warm air from the heater rises to the ceiling by', mode: 'convection' },
  { ctx: 'A room is heated by a heater in winter.', text: 'Heat escapes through the window glass to the cold outside by', mode: 'conduction' },
  { ctx: 'A room is heated by a heater in winter.', text: 'You feel the glowing bar of the heater on your skin across the room by', mode: 'radiation' },
  { ctx: 'A family braais in the evening.', text: 'The hot grid sears the meat where they touch by', mode: 'conduction' },
  { ctx: 'A family braais in the evening.', text: 'Smoke and hot air rise above the fire by', mode: 'convection' },
  { ctx: 'A family braais in the evening.', text: 'Your face feels hot when you stand beside the glowing coals, mainly by', mode: 'radiation' },
  { ctx: 'It is midday in summer.', text: 'Energy travels from the Sun to Earth by', mode: 'radiation' },
  { ctx: 'It is midday in summer.', text: 'Hot air above a tar road rises, making the air shimmer, by', mode: 'convection' },
  { ctx: 'It is midday in summer.', text: 'Bare feet burn on the hot sand by', mode: 'conduction' },
];

export const heatTransfer: QuestionTemplate = {
  id: 'heat-transfer',
  skillId: 'heat-transfer',
  generate(rng, level) {
    const modeQ = (prompt: string, mode: Mode) =>
      choice(rng, {
        prompt,
        correct: MODE_OPTS[mode],
        distractors: (Object.keys(MODE_OPTS) as Mode[]).filter((m) => m !== mode).map((m) => ({ ...MODE_OPTS[m], feedback: `${MODE_WHY[m]} That isn't what is happening here.` })),
        keepOrder: [MODE_OPTS.conduction, MODE_OPTS.convection, MODE_OPTS.radiation],
        code: 'heat-transfer-mode',
        hints: ['Is something touching? Is a liquid or gas moving? Or is the heat crossing a gap?'],
        solution: [MODE_WHY[mode], `So this is **${mode}**.`],
      });
    if (level === 1) {
      const s = rng.pick(SCENARIOS);
      return modeQ(`${s.text} How is the heat mainly transferred?`, s.mode);
    }
    if (level === 2) {
      const best = rng.chance(0.5);
      const ctx = rng.pick(best ? CONDUCT_CTX : INSULATE_CTX);
      let mats: (typeof K)[number][] = [];
      for (let i = 0; i < 50; i++) {
        mats = rng.shuffle(K).slice(0, 4);
        const ks = mats.map((m) => m.k).sort((a, b) => a - b);
        const top = best ? ks[3]! / ks[2]! : ks[1]! / ks[0]!;
        if (top >= 1.4) break;
      }
      const winner = mats.reduce((a, b) => (best ? (b.k > a.k ? b : a) : b.k < a.k ? b : a));
      return choice(rng, {
        prompt: `${ctx} Which of these materials would work best?`,
        correct: { id: winner.name, text: cap(winner.name) },
        distractors: mats
          .filter((m) => m !== winner)
          .map((m) => ({ id: m.name, text: cap(m.name), feedback: best ? `${cap(m.name)} conducts heat less well than ${winner.name}. Metals are the best conductors, and copper is one of the best of all.` : `${cap(m.name)} conducts heat better than ${winner.name}, so it would let more heat through.` })),
        code: 'conductor-insulator',
        hints: [best ? 'You need a good **conductor**. Which materials let heat through easily?' : 'You need a good **insulator**. Which material lets heat through most slowly?'],
        solution: [best ? `Metals conduct heat well. Of these, **${winner.name}** conducts best.` : `Of these, **${winner.name}** is the poorest conductor, so it is the best insulator.${winner.name.includes('foam') || winner.name === 'wool' ? ' It works by trapping air.' : ''}`],
      });
    }
    if (level === 3 || level === 4) {
      const c = rng.pick(CONCEPTS.filter((x) => x.level === level));
      return choice(rng, {
        prompt: c.prompt,
        correct: { id: 'c', text: c.correct },
        distractors: c.wrong.map(([text, feedback], i) => ({ id: `w${i}`, text, feedback })),
        code: c.code,
        hints: level === 3 ? ['Think about which materials let heat through easily and which trap it.'] : ['Think about radiation (colour and shininess) and how fluids move when heated.'],
        solution: [c.why],
      });
    }
    const b = rng.pick(BLANKS);
    return modeQ(`${b.ctx} ${b.text} ___.`, b.mode);
  },
};

// ---------------------------------------------------------------------------
const G = 9.8;
const OBJECTS = [
  { what: 'a bag of cement', m: [25, 40, 50] },
  { what: 'a crate of oranges', m: [12, 15, 18, 20] },
  { what: 'a learner', m: [45, 50, 55, 60] },
  { what: 'a bucket of water', m: [8, 10, 12] },
  { what: 'a brick', m: [2, 2.5, 3] },
  { what: 'a box of books', m: [6, 8, 10, 14] },
];

export const mechanicalEnergy: QuestionTemplate = {
  id: 'mechanical-energy',
  skillId: 'mechanical-energy',
  generate(rng, level) {
    if (level === 1) {
      const o = rng.pick(OBJECTS);
      const m = rng.pick(o.m);
      const h = rng.pick([1.5, 2, 3, 4, 5, 6, 8, 10, 12, 15]);
      const ep = round(m * G * h, 1);
      return {
        prompt: `A crane lifts ${o.what} of mass ${fmt(m)} kg to a height of ${fmt(h)} m. How much gravitational potential energy does it gain?`,
        input: { kind: 'numeric', unit: 'J' },
        // 2.5% tolerance: an answer worked with g = 10 m/s² is accepted.
        answer: num(ep, 0.025),
        answerDisplay: `${n(ep, 1)} J`,
        hints: ['$E_p = mgh$, with $g = 9.8$ m/s².'],
        solution: [`$E_p = mgh = ${fmt(m)} \\times 9.8 \\times ${fmt(h)} = ${fmt(ep, 1)}$ J.`],
        misconceptions: keepNum([{ code: 'potential-energy-formula', answer: num(m * h), feedback: 'You left out $g$. $E_p = mgh$, so multiply by $9.8$ as well.' }], ep),
      };
    }
    if (level === 2) {
      const what = rng.pick(['a cyclist and bicycle', 'a rugby player', 'a sprinter', 'a scooter and rider', 'a netball']);
      const m = what === 'a netball' ? rng.pick([0.4, 0.45]) : rng.pick([60, 70, 75, 80, 90, 100]);
      const v = what === 'a netball' ? rng.pick([6, 8, 10, 12]) : rng.pick([3, 4, 5, 6, 8, 9, 10]);
      const ek = round(0.5 * m * v * v, 2);
      return {
        prompt: `${cap(what)} of mass ${fmt(m)} kg moves at ${v} m/s. What is its kinetic energy?`,
        input: { kind: 'numeric', unit: 'J' },
        answer: num(ek),
        answerDisplay: `${n(ek)} J`,
        hints: ['$E_k = \\tfrac{1}{2}mv^2$.', 'Square the speed first.'],
        solution: [`$E_k = \\tfrac{1}{2} \\times ${fmt(m)} \\times ${v}^2 = \\tfrac{1}{2} \\times ${fmt(m)} \\times ${v * v} = ${fmt(ek)}$ J.`],
        misconceptions: keepNum(
          [
            { code: 'kinetic-energy-formula', answer: num(m * v * v), feedback: 'You forgot the ½. $E_k = \\tfrac{1}{2}mv^2$.' },
            { code: 'kinetic-energy-formula', answer: num(0.5 * m * v), feedback: 'Square the speed: $v^2$, not $v$.' },
            { code: 'kinetic-energy-formula', answer: num(0.5 * (m * v) ** 2), feedback: 'Only the speed is squared, not the mass.' },
          ],
          ek,
        ),
      };
    }
    if (level === 3) {
      if (rng.chance(0.5)) {
        const g = rng.pick([150, 200, 250, 400, 500, 600]);
        const h = rng.pick([2, 3, 5, 8, 10, 20]);
        const ep = round((g / 1000) * G * h, 2);
        return {
          prompt: `A ${g} g apple hangs ${h} m above the ground. What is its gravitational potential energy?`,
          input: { kind: 'numeric', unit: 'J' },
          answer: num(ep),
          answerDisplay: `${n(ep)} J`,
          hints: ['Mass must be in kilograms.', `${g} g $= ${g / 1000}$ kg.`],
          solution: [`$m = ${g / 1000}$ kg.`, `$E_p = mgh = ${g / 1000} \\times 9.8 \\times ${h} = ${fmt(ep)}$ J.`],
          misconceptions: keepNum([{ code: 'unit-conversion', answer: num(g * G * h), feedback: `Convert grams to kilograms first: ${g} g = ${g / 1000} kg.` }], ep),
        };
      }
      const m = rng.pick([800, 1000, 1200, 1500]);
      const kmh = rng.pick([36, 54, 72, 90, 108]);
      const v = kmh / 3.6;
      const ek = round(0.5 * m * v * v, 0);
      return {
        prompt: `${m === 800 ? 'An' : 'A'} ${m} kg car travels at ${kmh} km/h. What is its kinetic energy? Give your answer in joules.`,
        input: { kind: 'numeric', unit: 'J' },
        answer: num(ek),
        answerDisplay: `${n(ek, 0)} J (${n(ek / 1000, 1)} kJ)`,
        hints: ['Convert km/h to m/s first: divide by 3.6.', '$E_k = \\tfrac{1}{2}mv^2$.'],
        solution: [`$${kmh} \\div 3.6 = ${fmt(v)}$ m/s.`, `$E_k = \\tfrac{1}{2} \\times ${m} \\times ${fmt(v)}^2 = ${fmt(ek, 0)}$ J.`],
        misconceptions: keepNum([{ code: 'unit-conversion', answer: num(0.5 * m * kmh * kmh), feedback: 'You used km/h. Convert the speed to m/s first (÷ 3.6).' }], ek),
      };
    }
    if (level === 4) {
      const h = rng.pick([1.25, 2.5, 5, 7.2, 10, 12.8, 20, 45]);
      const m = rng.pick([0.2, 0.5, 2, 5, 10]);
      const v = round(Math.sqrt(2 * G * h), 2);
      return {
        prompt: `A ${fmt(m)} kg ball is dropped from a height of ${fmt(h)} m. Ignoring air resistance, how fast is it moving just before it hits the ground?`,
        input: { kind: 'numeric', unit: 'm/s' },
        answer: num(v),
        answerDisplay: `${n(v)} m/s`,
        hints: ['All the potential energy at the top becomes kinetic energy at the bottom.', '$mgh = \\tfrac{1}{2}mv^2$. The mass cancels, so $v = \\sqrt{2gh}$.'],
        solution: [`$mgh = \\tfrac{1}{2}mv^2 \\Rightarrow v = \\sqrt{2gh}$. The mass doesn't matter.`, `$v = \\sqrt{2 \\times 9.8 \\times ${fmt(h)}} = ${fmt(v)}$ m/s.`],
        misconceptions: keepNum(
          [
            { code: 'energy-conservation', answer: num(2 * G * h), feedback: 'That is $v^2$. Take the square root.' },
            { code: 'energy-conservation', answer: num(Math.sqrt(G * h)), feedback: 'You dropped the 2: from $\\tfrac{1}{2}mv^2 = mgh$ you get $v = \\sqrt{2gh}$.' },
            { code: 'energy-conservation', answer: num(m * G * h), feedback: 'That is the potential energy in joules, not the speed.' },
          ],
          v,
        ),
      };
    }
    const h1 = rng.pick([20, 25, 30, 40, 45]);
    const h2 = rng.pick([0, 5, 10, 15].filter((x) => x < h1 - 5));
    const v1 = rng.pick([0, 2, 3, 4, 5]);
    const v2 = round(Math.sqrt(v1 * v1 + 2 * G * (h1 - h2)), 2);
    const ms: Misconception[] = [
      { code: 'energy-conservation', answer: num(Math.sqrt(2 * G * (h1 - h2))), feedback: `You left out the speed it already had at the top. Include $\\tfrac{1}{2}mv_1^2$ with $v_1 = ${v1}$ m/s.` },
      { code: 'energy-conservation', answer: num(v1 + Math.sqrt(2 * G * (h1 - h2))), feedback: 'Speeds don\'t add like that. Add the **energies** ($v^2$ terms), then take the square root.' },
      { code: 'energy-conservation', answer: num(Math.sqrt(v1 * v1 + 2 * G * h1)), feedback: `It only drops ${h1 - h2} m, not ${h1} m. Use the change in height.` },
    ];
    return {
      prompt: `A roller-coaster car passes the top of a ${h1} m hill at ${v1} m/s. Ignoring friction, how fast is it moving at the bottom of the next dip, ${h2} m above the ground?`,
      input: { kind: 'numeric', unit: 'm/s' },
      answer: num(v2),
      answerDisplay: `${n(v2)} m/s`,
      hints: ['Mechanical energy is conserved: $E_p + E_k$ at the top = $E_p + E_k$ at the bottom.', 'Divide every term by $m$: $gh_1 + \\tfrac{1}{2}v_1^2 = gh_2 + \\tfrac{1}{2}v_2^2$.'],
      solution: [`$gh_1 + \\tfrac{1}{2}v_1^2 = gh_2 + \\tfrac{1}{2}v_2^2$ (the mass cancels).`, `$v_2^2 = v_1^2 + 2g(h_1 - h_2) = ${v1 * v1} + 2(9.8)(${h1 - h2}) = ${fmt(v2 * v2, 1)}$.`, `$v_2 = ${fmt(v2)}$ m/s.`],
      misconceptions: keepNum(ms, v2),
    };
  },
};

// ---------------------------------------------------------------------------
const PAR_PAIRS: [number, number][] = [
  [3, 6], [4, 12], [6, 12], [10, 15], [12, 24], [20, 30], [10, 40], [5, 20], [15, 30], [8, 24], [9, 18], [60, 30], [6, 3], [12, 4], [20, 5], [30, 15],
];
const parallel = (a: number, b: number) => (a * b) / (a + b);

export const circuits: QuestionTemplate = {
  id: 'circuits',
  skillId: 'circuits',
  generate(rng, level) {
    if (level === 1) {
      const k = rng.pick([2, 3, 4]);
      const kind = rng.pick(['series', 'parallel'] as const);
      const q = rng.pick(['blows', 'brightness'] as const);
      if (q === 'blows') {
        const opts: Opt[] = [
          { id: 'all-off', text: 'All the other bulbs go out' },
          { id: 'stay-on', text: 'The other bulbs stay on' },
          { id: 'brighter', text: 'The other bulbs get much brighter', feedback: kind === 'parallel' ? 'Each branch still gets the full battery voltage, so their brightness doesn\'t change.' : 'In series the broken bulb breaks the only path, so no current flows at all.' },
        ];
        const correct = kind === 'series' ? opts[0]! : opts[1]!;
        return choice(rng, {
          prompt: `${k} identical bulbs are connected in ${kind} to a battery. One bulb blows (its filament breaks). What happens to the other ${k - 1 === 1 ? 'bulb' : 'bulbs'}?`,
          correct,
          distractors: opts.filter((o) => o !== correct).map((o) => ({ ...o, feedback: o.feedback ?? (kind === 'series' ? 'In series there is only **one** path. A break anywhere stops the current everywhere.' : 'In parallel each bulb has its **own** path to the battery, so the others keep working.') })),
          code: 'series-parallel-behaviour',
          hints: ['How many paths can the current take?'],
          solution: [kind === 'series' ? 'A series circuit has one path. When one bulb breaks, the circuit is broken and **all the bulbs go out**.' : 'In parallel, each bulb is on its own branch. The other branches are still complete, so **the other bulbs stay on**.'],
        });
      }
      const opts: Opt[] = [
        { id: 'dimmer', text: 'Dimmer than a single bulb on the battery' },
        { id: 'same', text: 'The same brightness as a single bulb' },
        { id: 'brighter', text: 'Brighter than a single bulb', feedback: 'Adding bulbs never makes each bulb brighter with the same battery.' },
      ];
      const correct = kind === 'series' ? opts[0]! : opts[1]!;
      return choice(rng, {
        prompt: `${k} identical bulbs are connected in ${kind} to the same battery. How bright is each bulb?`,
        correct,
        distractors: opts.filter((o) => o !== correct).map((o) => ({ ...o, feedback: o.feedback ?? (kind === 'series' ? 'In series the bulbs share the battery\'s voltage, so each gets less and glows dimmer.' : 'In parallel each bulb gets the full battery voltage, so each glows as brightly as one bulb alone.') })),
        code: 'series-parallel-behaviour',
        hints: ['Does each bulb get the full battery voltage, or a share of it?'],
        solution: [kind === 'series' ? `In series the ${k} bulbs share the voltage, so each is **dimmer**.` : 'In parallel each bulb gets the full voltage, so each is **as bright as a single bulb**. (The battery runs down faster.)'],
      });
    }
    if (level === 2) {
      const R = rng.pick([2, 4, 6, 8, 10, 12, 16, 20, 24, 30]);
      const k = rng.pick([2, 2, 3, 4]);
      const Rp = round(R / k, 2);
      return {
        prompt: `${k} identical ${R} Ω resistors are connected in parallel. What is their total (equivalent) resistance?`,
        input: { kind: 'numeric', unit: 'Ω' },
        answer: num(Rp),
        answerDisplay: `${n(Rp)} Ω`,
        hints: ['In parallel, the total is **less** than any single branch.', `For identical resistors in parallel, $R_p = \\dfrac{R}{\\text{number of resistors}}$.`],
        solution: [`$\\dfrac{1}{R_p} = ${Array.from({ length: k }, () => `\\dfrac{1}{${R}}`).join(' + ')} = \\dfrac{${k}}{${R}}$.`, `$R_p = \\dfrac{${R}}{${k}} = ${fmt(Rp)}$ Ω.`],
        misconceptions: keepNum([{ code: 'parallel-resistance', answer: num(R * k), feedback: 'You added them as if they were in series. In parallel the total is **smaller** than one resistor.' }], Rp),
      };
    }
    const [a, b] = rng.pick(PAR_PAIRS);
    const Rp = parallel(a, b);
    if (level === 3) {
      return {
        prompt: `A ${a} Ω resistor and a ${b} Ω resistor are connected in parallel. What is the equivalent resistance?`,
        input: { kind: 'numeric', unit: 'Ω' },
        answer: num(Rp),
        answerDisplay: `${n(Rp)} Ω`,
        hints: ['$\\dfrac{1}{R_p} = \\dfrac{1}{R_1} + \\dfrac{1}{R_2}$.', 'Find $\\dfrac{1}{R_p}$, then flip it.'],
        solution: [`$\\dfrac{1}{R_p} = \\dfrac{1}{${a}} + \\dfrac{1}{${b}} = \\dfrac{${b + a}}{${a * b}}$.`, `$R_p = \\dfrac{${a * b}}{${a + b}} = ${fmt(Rp)}$ Ω.`],
        misconceptions: keepNum(
          [
            { code: 'parallel-resistance', answer: num(a + b), feedback: 'Adding gives the **series** total. In parallel use $\\dfrac{1}{R_p} = \\dfrac{1}{R_1} + \\dfrac{1}{R_2}$.' },
            { code: 'parallel-resistance', answer: num(1 / a + 1 / b), feedback: 'That is $\\dfrac{1}{R_p}$. Flip it to get $R_p$.' },
          ],
          Rp,
        ),
      };
    }
    const V = rng.pick([6, 9, 12, 18, 24]);
    if (level === 4) {
      const which = rng.chance(0.5) ? a : b;
      const I = round(V / which, 2);
      return {
        prompt: `A ${a} Ω resistor and a ${b} Ω resistor are connected in parallel across a ${V} V battery. What current flows through the ${which} Ω resistor?`,
        input: { kind: 'numeric', unit: 'A' },
        answer: num(I),
        answerDisplay: `${n(I)} A`,
        hints: ['In parallel, every branch gets the **full** battery voltage.', '$I = \\dfrac{V}{R}$ for that branch alone.'],
        solution: [`The ${which} Ω resistor has the full ${V} V across it.`, `$I = \\dfrac{V}{R} = \\dfrac{${V}}{${which}} = ${fmt(I)}$ A.`],
        misconceptions: keepNum(
          [
            { code: 'parallel-resistance', answer: num(V / (a + b)), feedback: 'You treated the resistors as series. In parallel each branch gets the full battery voltage.' },
            { code: 'parallel-resistance', answer: num(V / Rp), feedback: 'That is the **total** current from the battery. The question asks about one branch.' },
          ],
          I,
        ),
      };
    }
    const I = round(V / Rp, 2);
    return {
      prompt: `A ${a} Ω resistor and a ${b} Ω resistor are connected in parallel across a ${V} V battery. What is the total current drawn from the battery?`,
      input: { kind: 'numeric', unit: 'A' },
      answer: num(I),
      answerDisplay: `${n(I)} A`,
      hints: ['Either find the equivalent resistance first, or add the two branch currents.', `$I_1 = \\dfrac{${V}}{${a}}$ and $I_2 = \\dfrac{${V}}{${b}}$.`],
      solution: [`$I_1 = \\dfrac{${V}}{${a}} = ${fmt(V / a)}$ A, $I_2 = \\dfrac{${V}}{${b}} = ${fmt(V / b)}$ A.`, `$I = I_1 + I_2 = ${fmt(I)}$ A. (Check: $R_p = ${fmt(Rp)}$ Ω and $\\dfrac{${V}}{${fmt(Rp)}} = ${fmt(I)}$ A.)`],
      misconceptions: keepNum(
        [
          { code: 'parallel-resistance', answer: num(V / (a + b)), feedback: 'You added the resistances as if in series. In parallel the total resistance is smaller, so **more** current flows.' },
          { code: 'parallel-resistance', answer: num(V / a), feedback: 'That is the current in one branch only. Add both branches.' },
        ],
        I,
      ),
    };
  },
};
