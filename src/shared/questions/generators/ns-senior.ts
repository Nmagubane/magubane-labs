/**
 * Natural Sciences: the Planet Earth and Beyond strand (Grades 5, 7, 8, 9) and the two Senior Phase
 * skills that complete the other strands (Grade 7 Periodic Table, Grade 8 Visible light).
 * CAPS topics: see each skill's mapping in curriculum/catalogue.ts.
 */
import type { QuestionTemplate } from '../types.ts';
import { exact, num, keepNum, n, poolQuestion, labelQuestion, choice, type PoolItem } from './kit.ts';
import { PLANETS } from './nst-energy-earth.ts';

/** Decimal comma for text, e.g. 2,5. */
const c = (v: number, dp = 2) => n(v, dp).replace('.', ',');
/** Decimal comma inside TeX, e.g. 2{,}5. */
const tc = (v: number, dp = 2) => c(v, dp).replace(',', '{,}');
const cap1 = (s: string) => s[0]!.toUpperCase() + s.slice(1);

// ---------------------------------------------------------------------------
// Grade 5: rocks, soil and fossils
const SOIL: PoolItem[] = [
  { q: 'Which soil has the biggest grains and lets water drain away fastest?', a: 'Sandy soil', wrong: [['Clay soil', 'Clay has tiny grains packed tightly, so water drains away very slowly.'], ['Loam', 'Loam is a mix. It holds some water and drains some.']], why: '**Sandy soil** has big grains with gaps between them, so water runs straight through.' },
  { q: 'Which soil feels sticky when it is wet and holds water for a long time?', a: 'Clay soil', wrong: [['Sandy soil', 'Sand feels gritty and dries out quickly.'], ['Loam', 'Loam is crumbly, not sticky.']], why: '**Clay** has very fine grains that pack together and hold water.' },
  { q: 'Which soil is best for growing most crops?', a: 'Loam: a mix of sand, clay and humus', wrong: [['Pure sand', 'Sand drains too fast and holds few nutrients.'], ['Pure clay', 'Clay gets waterlogged and hard, so roots struggle.']], why: '**Loam** holds enough water and air, and its humus feeds plants.' },
  { q: 'What is humus?', a: 'The rotting remains of plants and animals in soil', wrong: [['Tiny grains of rock', 'Rock grains are sand, silt and clay. Humus comes from living things.'], ['The water in soil', 'Humus is dead plant and animal matter, not water.']], why: '**Humus** is decayed plant and animal matter. It makes soil dark and rich in nutrients.' },
  { q: 'Where does soil come from?', a: 'Rock broken down by weathering over a very long time, mixed with humus', wrong: [['Dust that falls from space', 'Almost all soil comes from rock on Earth.'], ['Plant roots make it from water', 'Roots help break rock, but soil is mostly broken-down rock.']], why: 'Wind, water, heat and cold **weather** rock into small pieces. Mixed with humus, they become soil.' },
];
const FOSSIL_KIND: { x: string; k: 'body' | 'trace' }[] = [
  { x: 'a dinosaur footprint', k: 'trace' },
  { x: 'a fossil bone', k: 'body' },
  { x: 'a fossil leaf', k: 'body' },
  { x: 'a burrow dug by an ancient animal', k: 'trace' },
  { x: 'a fossil tooth', k: 'body' },
  { x: 'a shell turned to stone', k: 'body' },
  { x: 'a trail left by a crawling worm', k: 'trace' },
  { x: 'fossil dung', k: 'trace' },
  { x: 'a fossil skull', k: 'body' },
  { x: 'tooth marks on a fossil bone', k: 'trace' },
];
const LAYER_FOSSILS = ['fern leaves', 'fish', 'shells', 'a reptile skull', 'insect wings', 'a tree trunk', 'snail shells', 'a crocodile tooth'];
const SED_FACTS: PoolItem[] = [
  { q: 'How does sedimentary rock form?', a: 'Layers of sand, mud and remains settle and are pressed into rock over millions of years', wrong: [['Lava cools quickly on the surface', 'That makes igneous rock.'], ['Rock is heated and squeezed deep underground', 'That changes rock into metamorphic rock.']], why: '**Sedimentary** rock builds up in layers that are pressed and cemented together over a very long time.' },
  { q: 'Which rock is most likely to contain fossils?', a: 'Sandstone or shale (sedimentary rock)', wrong: [['Granite', 'Granite forms from melted rock, which would destroy any remains.'], ['Basalt from a volcano', 'Lava is far too hot for remains to survive.']], why: 'Fossils form when remains are buried in sediment, so they are found in **sedimentary** rock.' },
  { q: "South Africa's Karoo is famous for fossils of…", a: 'reptiles and early relatives of mammals from about 250 million years ago', wrong: [['woolly mammoths', 'Mammoths lived in cold northern lands, much more recently.'], ['whales that died last year', 'Fossils take thousands to millions of years to form.']], why: "The **Karoo** rocks hold some of the world's best fossils of ancient reptiles and the ancestors of mammals." },
  { q: 'Why is the Cradle of Humankind a World Heritage Site?', a: 'Its caves hold some of the oldest fossils of human ancestors', wrong: [['It has the deepest gold mines', 'It is famous for fossils, not gold.'], ['It is where the first dinosaur was found', 'It is famous for fossils of human ancestors.']], why: 'Caves such as Sterkfontein near Johannesburg have given scientists fossils of our **early ancestors**.' },
  { q: 'Scientists knew the coelacanth fish only from fossils. What happened in 1938?', a: 'A living one was caught off the coast near East London', wrong: [['A frozen one was dug out of ice', 'It was caught alive in the sea.'], ['It was made in a laboratory', 'It was caught by fishermen.']], why: 'A **living coelacanth** was caught near East London: a "fossil" fish was still alive.' },
];

export const rocksFossils: QuestionTemplate = {
  id: 'rocks-fossils',
  skillId: 'rocks-fossils',
  generate(rng, level) {
    if (level === 1) return poolQuestion(rng, rng.pick(SOIL), 'rock-layers', 'Think about the size of the grains and how much water gets through.');
    if (level === 2) {
      const f = rng.pick(FOSSIL_KIND);
      return labelQuestion(rng, { prompt: `Is ${f.x} a body fossil or a trace fossil?`, labels: { body: 'Body fossil: part of the living thing', trace: 'Trace fossil: a sign that it was there' }, answer: f.k, why: f.k === 'body' ? `${cap1(f.x)} was part of the living thing itself: a **body fossil**.` : `${cap1(f.x)} shows what the living thing did, not its body: a **trace fossil**.`, code: 'rock-layers', hint: 'Was it part of the animal or plant, or something it left behind?' });
    }
    if (level === 3) {
      const [a, b, d] = rng.shuffle(LAYER_FOSSILS).slice(0, 3) as [string, string, string];
      const old = rng.chance(0.6);
      return choice(rng, {
        prompt: `A cliff shows layers of sedimentary rock that have not been disturbed. From the top down: layer 1 has fossil ${a}, layer 2 has fossil ${b}, layer 3 has fossil ${d}. Which fossils are the ${old ? 'oldest' : 'youngest'}?`,
        correct: { id: 'c', text: cap1(old ? d : a) },
        distractors: [
          { id: 'x', text: cap1(old ? a : d), feedback: old ? 'The top layer settled last, so its fossils are the youngest.' : 'The bottom layer settled first, so its fossils are the oldest.' },
          { id: 'y', text: cap1(b), feedback: 'The middle layer is neither the oldest nor the youngest.' },
        ],
        code: 'rock-layers',
        hints: ['Sediment settles on top of what is already there. Which layer was laid down first?'],
        solution: [`Layers build up from the bottom, so the **${old ? 'deepest' : 'top'}** layer is the ${old ? 'oldest' : 'youngest'}: ${old ? d : a}.`],
      });
    }
    if (level === 4) return poolQuestion(rng, rng.pick(SED_FACTS), 'rock-layers', 'Sedimentary rock forms in layers from sand, mud and the remains of living things.');
    const rate = rng.pick([1, 2, 5]);
    const depth = rng.pick([10, 20, 30, 50, 60]);
    const years = (depth * 10) / rate;
    return {
      prompt: `At the bottom of a lake, about ${rate} mm of mud settles every year. A fossil fish is found ${depth} cm below the top of the mud. Roughly how many years ago was the fish buried?`,
      input: { kind: 'numeric', unit: 'years' },
      answer: exact(years),
      answerDisplay: `about ${years} years`,
      hints: ['Change the depth to millimetres first: 1 cm = 10 mm.', `Then divide by ${rate} mm per year.`],
      solution: [`${depth} cm = ${depth * 10} mm.`, `$${depth * 10} \\div ${rate} = ${years}$ years.`],
      misconceptions: keepNum([
        { code: 'probable-slip', answer: exact(depth / rate), feedback: 'Change centimetres to millimetres first: 1 cm = 10 mm.' },
        { code: 'probable-slip', answer: exact(depth * 10 * rate), feedback: `Each year adds ${rate} mm, so divide the depth by ${rate}.` },
      ], years),
    };
  },
};

// ---------------------------------------------------------------------------
// Grade 7: the Periodic Table
type Kind = 'metal' | 'nonmetal' | 'semimetal';
export const ELEMENTS: { z: number; sym: string; name: string; kind: Kind; state: 'solid' | 'liquid' | 'gas' }[] = [
  { z: 1, sym: 'H', name: 'hydrogen', kind: 'nonmetal', state: 'gas' },
  { z: 2, sym: 'He', name: 'helium', kind: 'nonmetal', state: 'gas' },
  { z: 3, sym: 'Li', name: 'lithium', kind: 'metal', state: 'solid' },
  { z: 4, sym: 'Be', name: 'beryllium', kind: 'metal', state: 'solid' },
  { z: 5, sym: 'B', name: 'boron', kind: 'semimetal', state: 'solid' },
  { z: 6, sym: 'C', name: 'carbon', kind: 'nonmetal', state: 'solid' },
  { z: 7, sym: 'N', name: 'nitrogen', kind: 'nonmetal', state: 'gas' },
  { z: 8, sym: 'O', name: 'oxygen', kind: 'nonmetal', state: 'gas' },
  { z: 9, sym: 'F', name: 'fluorine', kind: 'nonmetal', state: 'gas' },
  { z: 10, sym: 'Ne', name: 'neon', kind: 'nonmetal', state: 'gas' },
  { z: 11, sym: 'Na', name: 'sodium', kind: 'metal', state: 'solid' },
  { z: 12, sym: 'Mg', name: 'magnesium', kind: 'metal', state: 'solid' },
  { z: 13, sym: 'Al', name: 'aluminium', kind: 'metal', state: 'solid' },
  { z: 14, sym: 'Si', name: 'silicon', kind: 'semimetal', state: 'solid' },
  { z: 15, sym: 'P', name: 'phosphorus', kind: 'nonmetal', state: 'solid' },
  { z: 16, sym: 'S', name: 'sulfur', kind: 'nonmetal', state: 'solid' },
  { z: 17, sym: 'Cl', name: 'chlorine', kind: 'nonmetal', state: 'gas' },
  { z: 18, sym: 'Ar', name: 'argon', kind: 'nonmetal', state: 'gas' },
  { z: 19, sym: 'K', name: 'potassium', kind: 'metal', state: 'solid' },
  { z: 20, sym: 'Ca', name: 'calcium', kind: 'metal', state: 'solid' },
  { z: 26, sym: 'Fe', name: 'iron', kind: 'metal', state: 'solid' },
  { z: 29, sym: 'Cu', name: 'copper', kind: 'metal', state: 'solid' },
  { z: 30, sym: 'Zn', name: 'zinc', kind: 'metal', state: 'solid' },
  { z: 47, sym: 'Ag', name: 'silver', kind: 'metal', state: 'solid' },
  { z: 79, sym: 'Au', name: 'gold', kind: 'metal', state: 'solid' },
  { z: 80, sym: 'Hg', name: 'mercury', kind: 'metal', state: 'liquid' },
  { z: 82, sym: 'Pb', name: 'lead', kind: 'metal', state: 'solid' },
];
/** Wrong symbols learners really write. Each one is checked not to be the symbol of any element. */
const SYMBOL_TRAPS: Record<string, string[]> = { sodium: ['So'], potassium: ['Ps'], iron: ['Io'], gold: ['Go'], silver: ['Sv'], lead: ['Le'], copper: ['Cp'], mercury: ['Me'], magnesium: ['Ma'], chlorine: ['CL'], aluminium: ['Ai'], helium: ['Hl'], fluorine: ['Fu'] };
const KIND_LABEL: Record<Kind, string> = { metal: 'Metal', nonmetal: 'Non-metal', semimetal: 'Semi-metal' };
const PT_FACTS: PoolItem[] = [
  { q: 'Elements in the same column (group) of the Periodic Table…', a: 'have similar chemical properties', wrong: [['have the same atomic number', 'Every element has its own atomic number.'], ['were all discovered in the same year', 'The columns group elements by how they behave, not when they were found.']], why: 'Elements in a **group** react in similar ways. That is why the table is so useful.' },
  { q: "What does an element's atomic number tell you?", a: 'How many protons are in each of its atoms', wrong: [['How heavy a lump of it is', 'The atomic number counts protons, not the mass of a sample.'], ['How many of its atoms exist', 'It is a property of each atom, not a count of atoms.']], why: 'The **atomic number** is the number of protons. The table is in order of atomic number.' },
  { q: 'Where are most metals on the Periodic Table?', a: 'On the left and in the middle', wrong: [['On the far right', 'The far right holds non-metals such as oxygen and neon.'], ['Only in the top row', 'The top row holds just hydrogen and helium, both non-metals.']], why: '**Metals** fill the left side and the middle. Non-metals are on the right, with semi-metals between them.' },
  { q: 'Which element is a metal that is liquid at room temperature?', a: 'Mercury', wrong: [['Iron', 'Iron melts at about 1 538 °C.'], ['Oxygen', 'Oxygen is a gas and not a metal.']], why: '**Mercury** (Hg) is the only metal that is liquid at room temperature.' },
  { q: 'Who arranged the elements into the first useful Periodic Table, leaving gaps for elements not yet discovered?', a: 'Dmitri Mendeleev', wrong: [['Isaac Newton', 'Newton worked on gravity, motion and light.'], ['Marie Curie', 'Curie discovered polonium and radium, after the table was made.']], why: '**Mendeleev** (1869) arranged the elements and correctly predicted elements that filled his gaps.' },
  { q: "Why is gold's symbol Au?", a: 'It comes from aurum, the Latin word for gold', wrong: [['It stands for "always useful"', 'Symbols come from names, often Latin ones.'], ['G was already taken', 'No element has the symbol G.']], why: 'Some symbols come from **Latin** names: Au (aurum, gold), Fe (ferrum, iron), Na (natrium, sodium).' },
];

export const periodicTable: QuestionTemplate = {
  id: 'periodic-table',
  skillId: 'periodic-table',
  generate(rng, level) {
    if (level === 1) {
      const e = rng.pick(ELEMENTS);
      const traps = (SYMBOL_TRAPS[e.name] ?? []).slice(0, 1);
      const others = rng.shuffle(ELEMENTS.filter((x) => x !== e)).slice(0, 3 - traps.length);
      const wrong: [string, string][] = [...traps.map((t): [string, string] => [t, `${t} is not a chemical symbol. Some symbols come from Latin names.`]), ...others.map((o): [string, string] => [o.sym, `${o.sym} is ${o.name}.`])];
      return poolQuestion(rng, { q: `What is the chemical symbol for ${e.name}?`, a: e.sym, wrong, why: `The symbol for ${e.name} is **${e.sym}**. A symbol is one capital letter, sometimes followed by a small letter.` }, 'element-facts', 'Symbols start with a capital letter. Some come from Latin names.');
    }
    if (level === 2) {
      const e = rng.pick(ELEMENTS);
      const o3 = rng.shuffle(ELEMENTS.filter((x) => x !== e)).slice(0, 3);
      return poolQuestion(rng, { q: `Which element has the symbol ${e.sym}?`, a: cap1(e.name), wrong: o3.map((o): [string, string] => [cap1(o.name), `${cap1(o.name)} is ${o.sym}.`]), why: `**${e.sym}** is ${e.name}.` }, 'element-facts', 'Some symbols come from Latin: Na natrium, K kalium, Fe ferrum, Au aurum.');
    }
    if (level === 3) {
      const e = rng.pick(ELEMENTS);
      const why = e.kind === 'metal'
        ? `${cap1(e.name)} is a **metal**: shiny, conducts heat and electricity, and sits on the left or in the middle of the table.`
        : e.kind === 'semimetal'
          ? `${cap1(e.name)} is a **semi-metal**: it has some properties of metals and some of non-metals, and sits on the staircase line.`
          : `${cap1(e.name)} is a **non-metal**: it sits on the right of the table${e.state === 'gas' ? ' and is a gas at room temperature' : ''}.`;
      return labelQuestion(rng, { prompt: `Is ${e.name} (${e.sym}) a metal, a non-metal or a semi-metal?`, labels: KIND_LABEL, answer: e.kind, why, code: 'element-facts', hint: 'Metals on the left and in the middle, non-metals on the right, semi-metals along the staircase between them.' });
    }
    if (level === 4) return poolQuestion(rng, rng.pick(PT_FACTS), 'element-facts', 'The table is in order of atomic number, and columns group similar elements.');
    const start = rng.int(1, 16);
    const strip = ELEMENTS.filter((x) => x.z >= start && x.z < start + 5);
    const e = rng.pick(strip);
    return poolQuestion(rng, {
      q: `Part of the Periodic Table, in order: ${strip.map((x) => `${x.z} ${x.sym}`).join(', ')}. An atom has ${e.z} protons. Which element is it?`,
      a: `${cap1(e.name)} (${e.sym})`,
      wrong: rng.shuffle(strip.filter((x) => x !== e)).slice(0, 3).map((o): [string, string] => [`${cap1(o.name)} (${o.sym})`, `${cap1(o.name)} has ${o.z} protons. The number of protons is the atomic number.`]),
      why: `The number of protons is the **atomic number**: ${e.z} is ${e.name}.`,
    }, 'element-facts', 'The number of protons in an atom is its atomic number.');
  },
};

// ---------------------------------------------------------------------------
// Grade 7: the Sun and the seasons (Southern Hemisphere first)
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
type Season = 'summer' | 'autumn' | 'winter' | 'spring';
const SOUTH: Season[] = ['summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter', 'winter', 'winter', 'spring', 'spring', 'spring', 'summer'];
const FLIP: Record<Season, Season> = { summer: 'winter', winter: 'summer', autumn: 'spring', spring: 'autumn' };
const SEASON_FACTS: PoolItem[] = [
  { q: 'What causes the seasons?', a: "The tilt of the Earth's axis as it orbits the Sun", wrong: [['The Earth being closer to the Sun in summer', "The Earth is closest to the Sun in early January: our summer, but Europe's winter. Distance isn't the cause."], ['The Sun getting hotter and cooler each year', 'The Sun gives out about the same energy all year.']], why: "The Earth's axis is tilted about $23{,}5^\\circ$. As it orbits, first one hemisphere and then the other leans towards the Sun." },
  { q: 'When it is summer in South Africa, what season is it in Europe?', a: 'Winter', wrong: [['Summer', 'The hemispheres lean towards the Sun at opposite times of year.'], ['Spring', 'Europe is in the opposite season: winter.']], why: 'When the **Southern** Hemisphere leans towards the Sun, the Northern Hemisphere leans away: opposite seasons.' },
  { q: 'In December, the Southern Hemisphere is tilted…', a: 'towards the Sun', wrong: [['away from the Sun', 'In December South Africa has summer, so it leans towards the Sun.'], ['neither towards nor away', 'That happens at the equinoxes, in March and September.']], why: 'In December the Southern Hemisphere leans **towards** the Sun: long days and a high noon Sun.' },
  { q: 'On about which date is the longest day of the year in South Africa?', a: '21 or 22 December', wrong: [['21 June', 'That is our shortest day: the Southern Hemisphere leans away from the Sun.'], ['1 January', 'The longest day is at the December solstice, about 21 December.']], why: 'The **December solstice** (about 21 December) is when the Southern Hemisphere leans most towards the Sun.' },
  { q: 'At the equinoxes in March and September, what is special about day and night?', a: 'They are about 12 hours each everywhere', wrong: [['There is no night anywhere', 'Every place still has day and night.'], ['The day is longest', 'The longest day is at the solstice in December.']], why: 'At the **equinoxes** neither hemisphere leans towards the Sun, so day and night are about equal everywhere.' },
];
const SUN_FACTS: PoolItem[] = [
  { q: 'Why is a summer noon in South Africa hotter than a winter noon?', a: 'The Sun is higher, so its energy is concentrated on a smaller area, and the days are longer', wrong: [['The Sun is closer to South Africa in summer', 'The distance barely changes. The angle and day length do.'], ['There are more clouds in summer', 'Clouds would block sunlight. The Sun is higher and shines for longer.']], why: 'A **high** Sun focuses its energy on a smaller patch of ground, and **long days** add more hours of heating.' },
  { q: 'Coal, oil and natural gas store energy that first came from…', a: 'the Sun, captured by plants millions of years ago', wrong: [['the heat inside the Earth', 'The energy was captured by ancient plants through photosynthesis.'], ['lightning', "Lightning didn't make fossil fuels."]], why: 'Ancient plants captured **sunlight** by photosynthesis. Their buried remains became fossil fuels.' },
  { q: "How does the Sun's energy keep almost all life on Earth going?", a: 'Plants use sunlight to make food, and animals eat plants or other animals', wrong: [['Animals absorb sunlight through their skin to make food', "Animals can't make food from sunlight. Plants can."], ['Sunlight turns into water', 'Sunlight drives the water cycle, but food chains start with plants.']], why: 'Food chains start with **plants**, which capture sunlight by photosynthesis.' },
  { q: 'Why are places near the equator hot all year?', a: 'The noon Sun is always high in the sky there', wrong: [['They are closer to the Sun', 'The equator is not meaningfully closer to the Sun.'], ['The Earth spins faster there', "Spin speed doesn't heat the ground. The high Sun does."]], why: 'Near the equator the Sun is **high** all year, so the sunlight is always concentrated.' },
  { q: "If the Earth's axis were not tilted at all, what would happen?", a: 'There would be no seasons', wrong: [['Every day would be summer everywhere', 'Places would have the same weather all year, but polar regions would stay cold.'], ['There would be no day and night', 'Day and night come from the spin, not the tilt.']], why: 'The **tilt** causes the seasons. Without it, each place would get the same sunlight all year.' },
];
const SA_CITIES = ['Johannesburg', 'Cape Town', 'Durban', 'Polokwane', 'Bloemfontein', 'Gqeberha'];
const NORTH_CITIES = ['London', 'Paris', 'New York', 'Beijing', 'Moscow'];

export const seasons: QuestionTemplate = {
  id: 'seasons',
  skillId: 'seasons',
  generate(rng, level) {
    if (level === 1) return poolQuestion(rng, rng.pick(SEASON_FACTS.slice(0, 3)), 'season-cause', 'It is the tilt of the axis, not the distance from the Sun.');
    if (level === 2) {
      const m = rng.int(0, 11);
      const north = rng.chance(0.3);
      const city = rng.pick(north ? NORTH_CITIES : SA_CITIES);
      const s = north ? FLIP[SOUTH[m]!] : SOUTH[m]!;
      const why = north
        ? `${city} is in the Northern Hemisphere, which has the opposite season to South Africa: **${s}** in ${MONTHS[m]}.`
        : `South Africa has summer in December to February, autumn in March to May, winter in June to August and spring in September to November. ${MONTHS[m]} is **${s}**.`;
      return labelQuestion(rng, { prompt: `Which season is it in ${city} in ${MONTHS[m]}?`, labels: { summer: 'Summer', autumn: 'Autumn', winter: 'Winter', spring: 'Spring' }, answer: s, why, code: 'season-cause', hint: north ? 'The Northern Hemisphere has the opposite season to South Africa.' : 'Summer in South Africa is December, January and February.' });
    }
    if (level === 3) return poolQuestion(rng, rng.pick(SEASON_FACTS.slice(2)), 'season-cause', 'Think about which hemisphere is leaning towards the Sun.');
    if (level === 4) {
      const area = rng.pick([1.25, 1.5, 2, 2.5, 4, 5]);
      const pct = Math.round((100 / area) * 10) / 10;
      return {
        prompt: `A beam of sunlight lights up 1 m² of ground when the Sun is straight overhead. When the Sun is lower, the same beam spreads over ${c(area)} m². Each square metre now gets what percentage of the energy it got before?`,
        input: { kind: 'numeric', unit: '%' },
        answer: num(pct, 0.02),
        answerDisplay: `about ${c(pct, 1)}%`,
        hints: ['The same energy is shared over a bigger area.', `Divide 100% by ${c(area)}.`],
        solution: [`$100\\% \\div ${tc(area)} \\approx ${tc(pct, 1)}\\%$.`, 'Spreading the same energy over a bigger area is why a low winter Sun heats the ground less.'],
        misconceptions: keepNum([
          { code: 'season-cause', answer: num(100 * area, 0.02), feedback: 'Spreading the beam out makes each square metre get **less** energy, not more.' },
          { code: 'probable-slip', answer: num(100 - area, 0.02), feedback: `Divide 100% by ${c(area)}: the energy is shared out over ${c(area)} m².` },
        ], pct),
      };
    }
    return poolQuestion(rng, rng.pick(SUN_FACTS), 'season-cause', 'A higher Sun concentrates its energy; longer days add more hours of it.');
  },
};

// ---------------------------------------------------------------------------
// Grade 7: the Moon, gravity and tides
const TIDE_FACTS: PoolItem[] = [
  { q: 'What mainly causes the tides in the sea?', a: "The pull of the Moon's gravity on the oceans", wrong: [['Wind blowing the water', 'Wind makes waves, not the twice-daily rise and fall of the tide.'], ["The Earth's magnetism", 'Magnetism has nothing to do with tides.']], why: "The **Moon's gravity** pulls on the oceans, making them bulge. As the Earth turns, coasts move through the bulges." },
  { q: 'About how many high tides does a beach on the South African coast get each day?', a: 'Two', wrong: [['One', 'There are two bulges of water, one facing the Moon and one on the far side, so most coasts get two high tides a day.'], ['Four', 'Two high tides and two low tides.']], why: 'There are **two** high tides (and two low tides) about every 24 hours and 50 minutes.' },
  { q: 'Why do the tides come about 50 minutes later each day?', a: 'The Moon moves along its orbit, so the Earth has to turn a little further to face it again', wrong: [["The Earth's spin slows down each day", "The Earth's spin hardly changes."], ['The sea gets heavier', 'The timing comes from the Moon moving in its orbit.']], why: 'While the Earth spins once, the Moon moves on in its orbit, so it takes about **50 minutes more** for a place to face the Moon again.' },
  { q: 'What happens to the gravitational pull between two objects if they move further apart?', a: 'It gets weaker', wrong: [['It gets stronger', 'Gravity weakens with distance.'], ['It stays the same', 'Distance matters: further apart means a weaker pull.']], why: 'Gravity is stronger between objects with **more mass** and **closer together**.' },
  { q: 'The Sun is far more massive than the Moon. Why does the Moon have a bigger effect on the tides?', a: 'The Moon is much closer to the Earth', wrong: [['The Moon is made of heavier rock', 'The Sun has far more mass. Distance is what matters here.'], ['The Sun has no gravity', "The Sun's gravity holds the whole Solar System together. It causes smaller tides too."]], why: "The Moon is about 400 times **closer** than the Sun, so its tidal pull is about twice as strong as the Sun's." },
  { q: 'Animals in a rocky-shore rock pool must survive…', a: 'being uncovered at low tide, with drying air, sun and changing temperature', wrong: [['being frozen solid twice a day', "South African rock pools don't freeze."], ['deep-sea darkness', 'Rock pools are shallow and sunny.']], why: 'Shore life is adapted to the **tides**: mussels close tightly and anemones fold up when the water goes out.' },
];
const TIDE_PHASE: { x: string; at: string; k: 'spring' | 'neap' }[] = [
  { x: 'new moon', at: 'at new moon', k: 'spring' },
  { x: 'full moon', at: 'at full moon', k: 'spring' },
  { x: 'first quarter', at: 'at first quarter (half moon)', k: 'neap' },
  { x: 'last quarter', at: 'at last quarter (half moon)', k: 'neap' },
  { x: '', at: 'when the Sun, Earth and Moon are in a straight line', k: 'spring' },
  { x: '', at: 'when the Sun and Moon are at right angles, as seen from the Earth', k: 'neap' },
];

export const moonTides: QuestionTemplate = {
  id: 'moon-tides',
  skillId: 'moon-tides',
  generate(rng, level) {
    if (level === 1) return poolQuestion(rng, rng.pick(TIDE_FACTS.slice(0, 3)), 'tide-cause', "The Moon's gravity pulls on the oceans.");
    if (level === 2) {
      const p = rng.pick(TIDE_PHASE);
      return labelQuestion(rng, { prompt: `What kind of tides happen ${p.at}?`, labels: { spring: 'Spring tides: very high highs and very low lows', neap: 'Neap tides: the smallest difference between high and low' }, answer: p.k, why: p.k === 'spring' ? 'When the Sun, Earth and Moon line up (new and full moon), their pulls add together: **spring tides**.' : 'When the Sun and Moon pull at right angles (the half moons), they partly cancel: **neap tides**.', code: 'tide-cause', hint: 'Do the pulls of the Sun and the Moon line up, or are they at right angles?' });
    }
    if (level === 3) {
      if (rng.chance(0.5)) {
        const w = rng.pick([60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 720, 900]);
        return {
          prompt: `Gravity on the Moon is about one sixth of the gravity on Earth. A space suit weighs ${w} N on Earth. About how much does it weigh on the Moon?`,
          input: { kind: 'numeric', unit: 'N' },
          answer: exact(w / 6),
          answerDisplay: `${w / 6} N`,
          hints: ['One sixth means divide by 6.'],
          solution: [`$${w} \\div 6 = ${w / 6}$ N. Its mass is the same; the Moon just pulls on it less.`],
          misconceptions: keepNum([
            { code: 'tide-cause', answer: exact(w * 6), feedback: 'The Moon has less mass than the Earth, so it pulls **less**: divide by 6.' },
            { code: 'probable-slip', answer: exact(w - 6), feedback: '"One sixth" means divide by 6, not take away 6.' },
          ], w / 6),
        };
      }
      const d = rng.int(2, 9);
      return {
        prompt: `High tide at a beach is at 06:00 this morning. The tides come about 50 minutes later each day. How many minutes after 06:00 will the morning high tide be in ${d} days' time?`,
        input: { kind: 'numeric', unit: 'minutes' },
        answer: exact(50 * d),
        answerDisplay: `${50 * d} minutes`,
        hints: ['Each day adds 50 minutes.'],
        solution: [`$${d} \\times 50 = ${50 * d}$ minutes later.`],
        misconceptions: keepNum([{ code: 'probable-slip', answer: exact(50 + d), feedback: `It is 50 minutes **for each** of the ${d} days: multiply.` }], 50 * d),
      };
    }
    if (level === 4) return poolQuestion(rng, rng.pick(TIDE_FACTS.slice(3)), 'tide-cause', 'Gravity depends on mass and distance.');
    const p = rng.pick(TIDE_PHASE.slice(0, 4));
    const next = p.k === 'spring' ? 'neap' : 'spring';
    return poolQuestion(rng, {
      q: `It is ${p.x} tonight, so the tides are ${p.k} tides. About how many days until the next ${next} tides?`,
      a: 'About 7 days',
      wrong: [['About 1 day', "Spring and neap tides take turns about every 7 days: a quarter of the Moon's cycle."], ['About 15 days', `That is about when the next ${p.k} tides come.`], ['About 29 days', 'That is a whole cycle of phases.']],
      why: `The phases go new → first quarter → full → last quarter, about **7 days** apart, so spring and neap tides take turns about every 7 days.`,
    }, 'tide-cause', "The Moon's phases are about a week apart.");
  },
};

// ---------------------------------------------------------------------------
// Grade 8: visible light
const SEE_THROUGH: { x: string; k: 'transparent' | 'translucent' | 'opaque' }[] = [
  { x: 'a clear glass window', k: 'transparent' },
  { x: 'frosted bathroom glass', k: 'translucent' },
  { x: 'a wooden door', k: 'opaque' },
  { x: 'wax paper', k: 'translucent' },
  { x: 'clean water in a glass', k: 'transparent' },
  { x: 'a brick wall', k: 'opaque' },
  { x: 'tissue paper', k: 'translucent' },
  { x: 'aluminium foil', k: 'opaque' },
  { x: 'clear plastic wrap', k: 'transparent' },
  { x: 'a sheet of cardboard', k: 'opaque' },
];
const COLOUR: PoolItem[] = [
  { q: 'Why does a red apple look red in white light?', a: 'It reflects red light and absorbs the other colours', wrong: [['It makes its own red light', "The apple doesn't glow. It reflects light that falls on it."], ['It absorbs red light', 'The colour you see is the light that is reflected, not absorbed.']], why: "An object's colour is the light it **reflects**. A red apple reflects red and absorbs the rest." },
  { q: 'A red T-shirt is lit only by green light. What colour does it look?', a: 'Black (very dark)', wrong: [['Red', 'There is no red light for it to reflect.'], ['Green', 'A red shirt absorbs green light.']], why: 'A red shirt reflects only red. With **no red light**, it reflects almost nothing and looks black.' },
  { q: 'Why do black clothes get hotter in the sun than white clothes?', a: 'Black absorbs all colours of light; white reflects them', wrong: [['Black reflects more light', 'Black reflects very little: that is why it looks dark.'], ['White makes its own cold light', "White reflects light; it doesn't make it."]], why: 'Black **absorbs** all the light and turns it into heat. White **reflects** most of it.' },
  { q: 'What does a prism do to white light?', a: 'It splits it into a spectrum of colours', wrong: [['It turns it into heat only', 'A prism spreads white light into colours.'], ['It makes it brighter', "It bends and spreads the light; it doesn't add any."]], why: 'Each colour bends by a different amount in the glass, so white light **disperses** into a spectrum.' },
  { q: 'A rainbow forms when…', a: 'sunlight is refracted and split into colours by raindrops', wrong: [['clouds are painted by the sunset', 'The colours come from sunlight being split by water drops.'], ['light reflects off the sea', 'Rainbows need sunlight passing through raindrops.']], why: 'Raindrops act like tiny prisms: they **refract** sunlight and split it into colours.' },
];
const LIGHT_FACTS: PoolItem[] = [
  { q: 'A straw in a glass of water looks bent at the surface. Why?', a: 'Light bends (refracts) as it passes from water into air', wrong: [['The water bends the straw', 'Take it out: the straw is straight.'], ['Light speeds up in water', 'Light slows down in water. The change of speed bends it.']], why: 'Light changes speed between water and air, so it **refracts** and the straw looks bent.' },
  { q: 'How fast does light travel through space?', a: 'About 300 000 km per second', wrong: [['About 340 m per second', 'That is the speed of sound in air.'], ['About 300 km per hour', 'Light is millions of times faster than that.']], why: 'Light travels at about **300 000 km/s**. It could go around the Earth more than 7 times in one second.' },
  { q: 'Why can we see the Moon even though it makes no light?', a: 'It reflects sunlight towards us', wrong: [['It glows because it is hot', 'The Moon is not hot enough to glow.'], ['It reflects light from the Earth only', 'Most moonlight is reflected sunlight.']], why: 'The Moon **reflects** sunlight. That is also why it has phases.' },
  { q: 'Light usually travels…', a: 'in straight lines', wrong: [['in curves around objects', "That is why objects cast sharp shadows: light can't go around them."], ['only through air', 'Light travels through glass, water and empty space too.']], why: 'Light travels in **straight lines**, which is why shadows form.' },
];
const ANGLES = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75];

export const visibleLight: QuestionTemplate = {
  id: 'visible-light',
  skillId: 'visible-light',
  generate(rng, level) {
    if (level === 1) {
      const m = rng.pick(SEE_THROUGH);
      return labelQuestion(rng, { prompt: `Is ${m.x} transparent, translucent or opaque?`, labels: { transparent: 'Transparent: you can see clearly through it', translucent: 'Translucent: some light gets through, but not a clear picture', opaque: 'Opaque: no light gets through' }, answer: m.k, why: `${cap1(m.x)} is **${m.k}**.`, code: 'light-reflection', hint: 'Can you see clearly through it, see only light, or see nothing?' });
    }
    if (level === 2) {
      const i = rng.pick(ANGLES);
      return {
        prompt: `A ray of light hits a flat mirror. The angle of incidence (measured from the normal) is ${i}°. What is the angle of reflection?`,
        input: { kind: 'numeric', unit: '°' },
        answer: exact(i),
        answerDisplay: `${i}°`,
        hints: ['Law of reflection: the angle of incidence equals the angle of reflection.'],
        solution: [`$\\angle i = \\angle r$, so the angle of reflection is ${i}°.`],
        misconceptions: keepNum([
          { code: 'light-reflection', answer: exact(90 - i), feedback: 'Both angles are measured from the **normal**, so they are equal.' },
          { code: 'light-reflection', answer: exact(2 * i), feedback: `${2 * i}° is the angle between the two rays. Each ray makes ${i}° with the normal.` },
        ], i),
      };
    }
    if (level === 3) return poolQuestion(rng, rng.pick(COLOUR), 'light-reflection', 'We see the colours of light that an object reflects.');
    if (level === 4) {
      const i = rng.pick(ANGLES.filter((a) => a !== 45));
      return {
        prompt: `A ray of light hits a flat mirror, making an angle of ${i}° with the surface of the mirror. What is the angle of reflection?`,
        input: { kind: 'numeric', unit: '°' },
        answer: exact(90 - i),
        answerDisplay: `${90 - i}°`,
        hints: ['The angles of incidence and reflection are measured from the normal, which is at 90° to the mirror.', `So the angle of incidence is $90^\\circ - ${i}^\\circ$.`],
        solution: [`Angle of incidence $= 90^\\circ - ${i}^\\circ = ${90 - i}^\\circ$.`, `Angle of reflection = angle of incidence = ${90 - i}°.`],
        misconceptions: keepNum([
          { code: 'light-reflection', answer: exact(i), feedback: 'That angle is measured from the **mirror**. Measure from the normal instead.' },
          { code: 'probable-slip', answer: exact(180 - i), feedback: `The normal is at 90° to the mirror, so subtract from 90°.` },
        ], 90 - i),
      };
    }
    return poolQuestion(rng, rng.pick(LIGHT_FACTS), 'light-reflection', 'Light travels in straight lines, reflects off surfaces and bends when it changes speed.');
  },
};

// ---------------------------------------------------------------------------
// Grade 8: the Solar System, beyond the Solar System, looking into space
const SPACE_FACTS: PoolItem[] = [
  { q: 'What is a light-year?', a: 'The distance light travels in one year', wrong: [['A year on another planet', 'It measures distance, not time.'], ['The time it takes light to reach the Moon', 'Light reaches the Moon in about 1,3 seconds.']], why: 'A **light-year** is a distance: about 9,5 trillion km, how far light travels in a year.' },
  { q: 'What is our galaxy called?', a: 'The Milky Way', wrong: [['The Solar System', 'The Solar System is the Sun and everything orbiting it: a tiny part of our galaxy.'], ['Andromeda', 'Andromeda is our nearest big neighbouring galaxy.']], why: 'We live in the **Milky Way**, a galaxy of hundreds of billions of stars.' },
  { q: 'What is a galaxy?', a: 'A huge group of billions of stars, gas and dust held together by gravity', wrong: [['A star with planets around it', 'That is a solar system.'], ['A cloud in the atmosphere', 'Galaxies are far beyond the atmosphere.']], why: 'A **galaxy** is a vast system of stars, gas and dust held together by gravity.' },
  { q: 'Which is the nearest star to the Earth?', a: 'The Sun', wrong: [['Proxima Centauri', 'Proxima is the nearest star after the Sun, about 4,2 light-years away.'], ['Sirius', 'Sirius is the brightest star in the night sky, but it is 8,6 light-years away.']], why: 'The **Sun** is a star, about 8 light-minutes away. The next nearest is Proxima Centauri.' },
  { q: 'From South Africa you can see two small galaxies close to the Milky Way. What are they called?', a: 'The Large and Small Magellanic Clouds', wrong: [['The Southern Cross', 'The Southern Cross is a group of stars in our own galaxy.'], ['The Pleiades', 'The Pleiades is a cluster of stars in our own galaxy.']], why: 'The **Magellanic Clouds** are small galaxies that orbit the Milky Way, best seen from the Southern Hemisphere.' },
];
const LOOKING: PoolItem[] = [
  { q: 'What is SALT, near Sutherland in the Northern Cape?', a: 'The largest single optical telescope in the Southern Hemisphere', wrong: [['A salt mine', 'SALT stands for Southern African Large Telescope.'], ['A rocket launch site', 'It is a telescope that collects light from space.']], why: 'The **Southern African Large Telescope** collects light from very faint, distant objects.' },
  { q: 'What does the MeerKAT telescope in the Karoo collect?', a: 'Radio waves from space', wrong: [['Visible light only', 'MeerKAT is a radio telescope: 64 dishes that collect radio waves.'], ['Rocks from meteorites', 'It collects signals, not rocks.']], why: '**MeerKAT** is a radio telescope. It is part of the Square Kilometre Array project.' },
  { q: 'In 1610 Galileo used a telescope to discover…', a: 'four moons orbiting Jupiter', wrong: [['the planet Neptune', 'Neptune was discovered in 1846.'], ['that the Moon makes its own light', 'The Moon reflects sunlight.']], why: 'Galileo saw **moons orbiting Jupiter**: proof that not everything orbits the Earth.' },
  { q: 'Why do telescopes in space, like Hubble, get very sharp pictures?', a: 'There is no air to blur the light', wrong: [['They are much closer to the stars', 'A few hundred kilometres is nothing compared with the distance to the stars.'], ['Space is brighter', 'Space is dark. The advantage is no blurring atmosphere.']], why: 'The **atmosphere** blurs and blocks some light. Above it, telescopes see more clearly.' },
  { q: 'Andromeda is about 2,5 million light-years away. What does that mean when we look at it?', a: 'We see it as it was 2,5 million years ago', wrong: [['We see it as it is right now', 'The light left it 2,5 million years ago.'], ['It is 2,5 million years old', 'Its light has travelled for that long; the galaxy is far older.']], why: 'Light takes time to travel, so looking far away is **looking back in time**.' },
];
const WHERE: { x: string; k: 'solar' | 'galaxy' | 'beyond' }[] = [
  { x: 'the Moon', k: 'solar' },
  { x: 'Mars', k: 'solar' },
  { x: 'Neptune', k: 'solar' },
  { x: "Halley's comet", k: 'solar' },
  { x: 'Proxima Centauri', k: 'galaxy' },
  { x: 'Sirius, the brightest star in the night sky', k: 'galaxy' },
  { x: 'the stars of the Southern Cross', k: 'galaxy' },
  { x: 'the Orion Nebula', k: 'galaxy' },
  { x: 'the Andromeda Galaxy', k: 'beyond' },
  { x: 'the Large Magellanic Cloud', k: 'beyond' },
];
const NEAR_STARS = [
  { name: 'Proxima Centauri', ly: 4.2 },
  { name: 'Alpha Centauri A', ly: 4.4 },
  { name: 'Sirius', ly: 8.6 },
  { name: 'Procyon', ly: 11.5 },
  { name: 'Altair', ly: 16.7 },
];

export const beyondSolarSystem: QuestionTemplate = {
  id: 'beyond-solar-system',
  skillId: 'beyond-solar-system',
  generate(rng, level) {
    if (level === 1) return poolQuestion(rng, rng.pick(SPACE_FACTS), 'light-years', 'A light-year is a distance. A galaxy is billions of stars.');
    if (level === 2) {
      const p = rng.pick(PLANETS.filter((x) => x.au > 1));
      const mins = Math.round(8.3 * p.au);
      return {
        prompt: `Sunlight takes about 8,3 minutes to reach the Earth. ${p.name} is about ${c(p.au)} times as far from the Sun as the Earth. About how many minutes does sunlight take to reach ${p.name}? (Round to the nearest minute.)`,
        input: { kind: 'numeric', unit: 'minutes' },
        answer: { kind: 'numeric', value: mins, tolerance: 1 },
        answerDisplay: `about ${mins} minutes`,
        hints: [`${c(p.au)} times as far means ${c(p.au)} times as long.`],
        solution: [`$8{,}3 \\times ${tc(p.au)} \\approx ${mins}$ minutes.`],
        misconceptions: keepNum([
          { code: 'light-years', answer: exact(Math.round(8.3 / p.au)), feedback: `Further away takes **longer**: multiply by ${c(p.au)}.` },
          { code: 'probable-slip', answer: exact(Math.round(8.3 + p.au)), feedback: `It is ${c(p.au)} **times** as far, so multiply.` },
        ], mins).filter((m) => m.answer.kind === 'numeric' && Math.abs(m.answer.value - mins) > 1),
      };
    }
    if (level === 3) {
      const s = rng.pick(WHERE);
      const why = s.k === 'solar' ? `${cap1(s.x)} orbits the Sun, so it is in our **Solar System**.` : s.k === 'galaxy' ? `${cap1(s.x)} is part of our galaxy, the **Milky Way**, but far beyond the Solar System.` : `${cap1(s.x)} is a separate galaxy, **outside the Milky Way**.`;
      return labelQuestion(rng, { prompt: `Where is ${s.x}?`, labels: { solar: 'In our Solar System', galaxy: 'In the Milky Way, outside our Solar System', beyond: 'Outside the Milky Way' }, answer: s.k, why, code: 'light-years', hint: 'Planets, moons and comets orbit the Sun. Other stars are in our galaxy. Other galaxies are beyond it.' });
    }
    if (level === 4) {
      const st = rng.pick(NEAR_STARS);
      const km = Math.round(st.ly * 9.5 * 10) / 10;
      return {
        prompt: `${st.name} is about ${c(st.ly, 1)} light-years away. One light-year is about 9,5 trillion km. About how many trillion kilometres away is ${st.name}?`,
        input: { kind: 'numeric', unit: 'trillion km' },
        answer: num(km, 0.03),
        answerDisplay: `about ${c(km, 1)} trillion km`,
        hints: ['Multiply the number of light-years by 9,5 trillion km.'],
        solution: [`$${tc(st.ly, 1)} \\times 9{,}5 \\approx ${tc(km, 1)}$ trillion km.`, 'Numbers this big are why astronomers use light-years.'],
        misconceptions: keepNum([
          { code: 'light-years', answer: num(st.ly / 9.5, 0.03), feedback: 'Each light-year is 9,5 trillion km, so **multiply**.' },
          { code: 'light-years', answer: num(st.ly, 0.03), feedback: 'That is the distance in light-years. Change it to trillions of kilometres.' },
        ], km),
      };
    }
    return poolQuestion(rng, rng.pick(LOOKING), 'light-years', 'Light takes time to travel; telescopes collect light (or radio waves) from far away.');
  },
};

// ---------------------------------------------------------------------------
// Grade 9: the Earth as a system, the lithosphere and the rock cycle, mining
const SPHERE_NAME = { litho: 'lithosphere', hydro: 'hydrosphere', atmo: 'atmosphere', bio: 'biosphere' } as const;
const SPHERE: { x: string; k: keyof typeof SPHERE_NAME }[] = [
  { x: 'a river', k: 'hydro' },
  { x: 'the granite of a mountain', k: 'litho' },
  { x: 'the nitrogen and oxygen we breathe', k: 'atmo' },
  { x: 'a baobab tree', k: 'bio' },
  { x: 'the Indian Ocean', k: 'hydro' },
  { x: 'groundwater deep underground', k: 'hydro' },
  { x: 'bacteria in the soil', k: 'bio' },
  { x: 'the wind', k: 'atmo' },
  { x: "the Earth's crust", k: 'litho' },
  { x: 'a herd of elephants', k: 'bio' },
  { x: 'a glacier', k: 'hydro' },
  { x: 'a seam of coal', k: 'litho' },
];
const ROCKS: { x: string; k: 'igneous' | 'sedimentary' | 'metamorphic'; why: string }[] = [
  { x: 'granite', k: 'igneous', why: 'Granite forms when magma cools slowly underground, giving large crystals.' },
  { x: 'basalt', k: 'igneous', why: 'Basalt forms when lava cools quickly at the surface, giving tiny crystals.' },
  { x: 'pumice', k: 'igneous', why: 'Pumice is frothy lava that cooled so fast that gas bubbles were trapped.' },
  { x: 'obsidian', k: 'igneous', why: 'Obsidian is volcanic glass: lava that cooled almost instantly.' },
  { x: 'sandstone', k: 'sedimentary', why: 'Sandstone is grains of sand pressed and cemented together.' },
  { x: 'shale', k: 'sedimentary', why: 'Shale is layers of mud pressed into rock.' },
  { x: 'limestone', k: 'sedimentary', why: 'Limestone forms mostly from the shells and skeletons of sea creatures.' },
  { x: 'conglomerate', k: 'sedimentary', why: 'Conglomerate is rounded pebbles cemented together. The Witwatersrand gold is found in it.' },
  { x: 'marble', k: 'metamorphic', why: 'Marble is limestone changed by heat and pressure.' },
  { x: 'slate', k: 'metamorphic', why: 'Slate is shale changed by heat and pressure.' },
  { x: 'quartzite', k: 'metamorphic', why: 'Quartzite is sandstone changed by heat and pressure.' },
  { x: 'gneiss', k: 'metamorphic', why: 'Gneiss is rock such as granite changed by great heat and pressure, giving bands.' },
];
const CYCLE: PoolItem[] = [
  { q: 'What turns limestone into marble?', a: 'Heat and pressure deep underground', wrong: [['Weathering by wind and rain', "Weathering breaks rock into sediment; it doesn't make marble."], ['Cooling of lava', 'Cooling lava makes igneous rock.'], ['Compaction of sand', 'Compacting sand makes sandstone.']], why: '**Heat and pressure** change rock without melting it: that makes metamorphic rock.' },
  { q: 'How does igneous rock form?', a: 'Magma or lava cools and becomes solid', wrong: [['Layers of mud are pressed together', 'That makes sedimentary rock.'], ['Rock is squeezed without melting', 'That makes metamorphic rock.'], ['Plants turn into rock', 'Plant remains can become coal, a sedimentary rock.']], why: '**Igneous** rock forms when molten rock (magma underground, lava at the surface) cools and solidifies.' },
  { q: 'How do loose sediments become sedimentary rock?', a: 'They are buried, compacted and cemented together', wrong: [['They melt and cool', 'Melting and cooling make igneous rock.'], ['They are blown away by the wind', 'Wind moves sediment; burial and cementing turn it into rock.'], ['They dissolve in the sea', 'Sediment becomes rock by compaction and cementation.']], why: 'Layers of sediment are **compacted** by the weight above and **cemented** by minerals.' },
  { q: 'What breaks rocks into small pieces that can become new sedimentary rock?', a: 'Weathering and erosion', wrong: [['Melting', 'Melting makes magma, not sediment.'], ['Heat and pressure', 'Heat and pressure change rock into metamorphic rock.'], ['Cementation', "Cementation sticks sediments together; it doesn't break rock."]], why: '**Weathering** breaks rock down; **erosion** carries the pieces away to settle as sediment.' },
  { q: 'Granite has large crystals but basalt has tiny ones. Why?', a: 'Granite cooled slowly underground; basalt cooled quickly at the surface', wrong: [['Granite is older', 'Crystal size depends on cooling speed, not age.'], ['Basalt was squeezed harder', 'Squeezing makes metamorphic rock. These are both igneous.'], ['Granite has more water in it', 'Crystal size depends on how slowly the rock cooled.']], why: 'Slow cooling gives crystals time to **grow**: large in granite, tiny in basalt.' },
];
const MINING: PoolItem[] = [
  { q: "Most of the world's known platinum is found in South Africa's…", a: 'Bushveld Complex', wrong: [['Witwatersrand', 'The Witwatersrand is famous for gold.'], ['Karoo', 'The Karoo is famous for fossils.']], why: "The **Bushveld Complex** holds the world's largest known platinum reserves." },
  { q: 'Johannesburg grew up around gold found in…', a: 'the Witwatersrand', wrong: [['the Bushveld Complex', 'The Bushveld is famous for platinum.'], ['the Drakensberg', 'The Drakensberg is basalt and sandstone, not gold reefs.']], why: 'Gold was found on the **Witwatersrand** in 1886.' },
  { q: 'What is an ore?', a: 'Rock that contains enough of a mineral to be worth mining', wrong: [['Any shiny rock', "Shine doesn't make a rock worth mining."], ['A pure metal found in the ground', 'Most metals are found combined with other substances in ore.']], why: 'An **ore** has enough of a valuable mineral to make mining and refining worth the cost.' },
  { q: 'After ore is mined, why must it be refined?', a: 'To separate the valuable mineral from the waste rock', wrong: [['To make the ore heavier', 'Refining removes waste.'], ['To turn the ore into a different metal', "Refining separates; it doesn't change one metal into another."]], why: '**Refining** separates the useful mineral from the waste rock and other substances.' },
  { q: 'Water draining from old mines can become acidic and polluted. Which spheres does this harm?', a: 'The hydrosphere and the biosphere', wrong: [['Only the atmosphere', 'The polluted water flows into rivers and harms living things.'], ['No sphere: it stays underground', 'Acid mine drainage reaches rivers and groundwater.']], why: 'The spheres **interact**: polluted water (hydrosphere) harms plants and animals (biosphere).' },
  { q: "Where is most of South Africa's coal mined?", a: 'Mpumalanga', wrong: [['The Western Cape', 'There are no big coal fields there.'], ['Kimberley', 'Kimberley is famous for diamonds.']], why: 'Most of our coal comes from **Mpumalanga**, where it fuels the big power stations.' },
];

export const earthSystems: QuestionTemplate = {
  id: 'earth-systems',
  skillId: 'earth-systems',
  generate(rng, level) {
    if (level === 1) {
      const s = rng.pick(SPHERE);
      return labelQuestion(rng, { prompt: `Which of the Earth's spheres does ${s.x} belong to?`, labels: { litho: 'Lithosphere (rock)', hydro: 'Hydrosphere (water)', atmo: 'Atmosphere (air)', bio: 'Biosphere (living things)' }, answer: s.k, why: `${cap1(s.x)} belongs to the **${SPHERE_NAME[s.k]}**.`, code: 'rock-cycle', hint: 'Rock, water, air or living things?' });
    }
    if (level === 2) {
      const r = rng.pick(ROCKS);
      return labelQuestion(rng, { prompt: `What type of rock is ${r.x}?`, labels: { igneous: 'Igneous', sedimentary: 'Sedimentary', metamorphic: 'Metamorphic' }, answer: r.k, why: r.why, code: 'rock-cycle', hint: 'Cooled from melted rock, built from sediment, or changed by heat and pressure?' });
    }
    if (level === 3) return poolQuestion(rng, rng.pick(CYCLE), 'rock-cycle', 'Melting and cooling → igneous. Sediment, compaction, cementing → sedimentary. Heat and pressure → metamorphic.');
    if (level === 4) return poolQuestion(rng, rng.pick(MINING), 'rock-cycle', "Think about where South Africa's minerals come from and what happens after mining.");
    const g = rng.pick([2, 4, 5, 8, 10]);
    if (rng.chance(0.5)) {
      const t = rng.pick([50, 100, 250, 500, 1000]);
      return {
        prompt: `A gold ore contains about ${g} g of gold in every tonne of rock. How many grams of gold can be refined from ${t} tonnes of ore?`,
        input: { kind: 'numeric', unit: 'g' },
        answer: exact(g * t),
        answerDisplay: `${g * t} g`,
        hints: [`Each tonne gives ${g} g.`],
        solution: [`$${t} \\times ${g} = ${g * t}$ g of gold.`, 'Very little gold comes from a lot of rock, which is why gold mines leave huge waste dumps.'],
        misconceptions: keepNum([{ code: 'probable-slip', answer: exact(t / g), feedback: `Each tonne gives ${g} g, so multiply.` }], g * t),
      };
    }
    return {
      prompt: `A gold ore contains about ${g} g of gold in every tonne of rock. How many tonnes of ore must be mined and refined to get 1 kg of gold?`,
      input: { kind: 'numeric', unit: 'tonnes' },
      answer: exact(1000 / g),
      answerDisplay: `${1000 / g} tonnes`,
      hints: ['1 kg = 1 000 g.', `How many lots of ${g} g make 1 000 g?`],
      solution: [`$1\\,000 \\div ${g} = ${1000 / g}$ tonnes of ore.`],
      misconceptions: keepNum([
        { code: 'probable-slip', answer: exact(1 / g), feedback: 'Change 1 kg into grams first: 1 kg = 1 000 g.' },
        { code: 'probable-slip', answer: exact(1000 * g), feedback: `Each tonne gives ${g} g, so divide 1 000 g by ${g}.` },
      ], 1000 / g),
    };
  },
};

// ---------------------------------------------------------------------------
// Grade 9: the atmosphere
const LAYER_NAME = { tropo: 'Troposphere', strato: 'Stratosphere', meso: 'Mesosphere', thermo: 'Thermosphere' } as const;
const LAYER_OF: { x: string; k: keyof typeof LAYER_NAME }[] = [
  { x: 'almost all weather: clouds, rain and storms', k: 'tropo' },
  { x: 'the ozone layer that absorbs harmful ultraviolet light', k: 'strato' },
  { x: 'most meteors burning up as "shooting stars"', k: 'meso' },
  { x: 'the auroras (southern and northern lights)', k: 'thermo' },
  { x: 'the International Space Station, about 400 km up', k: 'thermo' },
  { x: 'the top of Mount Kilimanjaro', k: 'tropo' },
  { x: 'the coldest temperatures in the atmosphere, below −80 °C', k: 'meso' },
  { x: 'temperatures that rise with height because ozone absorbs sunlight', k: 'strato' },
  { x: 'about three quarters of all the air in the atmosphere', k: 'tropo' },
];
const AIR: PoolItem[] = [
  { q: 'Which gas makes up most of the air?', a: 'Nitrogen (about 78%)', wrong: [['Oxygen', 'Oxygen is about 21%.'], ['Carbon dioxide', 'Carbon dioxide is only about 0,04%.']], why: 'Air is about **78% nitrogen**, 21% oxygen and about 1% other gases.' },
  { q: 'About what percentage of the air is oxygen?', a: 'About 21%', wrong: [['About 78%', 'That is nitrogen.'], ['About 50%', 'Oxygen is about a fifth of the air.']], why: 'Oxygen is about **21%**: roughly one fifth of the air.' },
  { q: 'About how much of the air is carbon dioxide?', a: 'About 0,04%', wrong: [['About 21%', 'That is oxygen.'], ['About 4%', 'Carbon dioxide is about a hundred times less than that.']], why: 'Carbon dioxide is only about **0,04%** of the air, but it has a big effect on climate.' },
  { q: 'Why does it get colder as you climb a high mountain?', a: 'In the troposphere, the air gets colder with height', wrong: [['You are further from the Sun', 'A few kilometres closer to the Sun makes no difference.'], ['There is more wind', 'Wind can make you feel colder, but the air itself is colder higher up.']], why: 'The troposphere is warmed from the **ground** up, so it gets colder with height: about 6,5 °C per km.' },
];
const GREENHOUSE: PoolItem[] = [
  { q: 'How does the greenhouse effect keep the Earth warm?', a: 'Gases such as carbon dioxide absorb heat given off by the Earth and send some back down', wrong: [['A layer of glass surrounds the Earth', 'There is no glass. Greenhouse gases do the trapping.'], ['The ozone layer reflects heat back down', 'Ozone absorbs ultraviolet light. It is not what traps heat.']], why: 'Sunlight warms the ground. The ground gives off **infrared** (heat), which greenhouse gases absorb and partly send back.' },
  { q: 'Which of these is a greenhouse gas?', a: 'Methane', wrong: [['Nitrogen', 'Nitrogen does not absorb infrared heat.'], ['Oxygen', 'Oxygen does not absorb infrared heat.']], why: 'Carbon dioxide, **methane** and water vapour are greenhouse gases.' },
  { q: 'Without any greenhouse effect, the Earth would be…', a: 'far too cold for most life', wrong: [['much hotter', 'Greenhouse gases keep heat in. Without them, more heat escapes.'], ['exactly the same', 'Without the greenhouse effect the average temperature would be about −18 °C.']], why: 'The natural greenhouse effect keeps the Earth about **33 °C warmer** than it would otherwise be.' },
  { q: 'What is making the greenhouse effect stronger?', a: 'Burning coal, oil and gas, which adds carbon dioxide to the air', wrong: [['The hole in the ozone layer', 'The ozone hole lets in more ultraviolet light; it is a different problem.'], ['Volcanoes erupting more often', 'Burning fossil fuels adds far more CO₂ than volcanoes do.']], why: 'Burning **fossil fuels** adds carbon dioxide. More CO₂ traps more heat: global warming.' },
];

export const atmosphere: QuestionTemplate = {
  id: 'atmosphere',
  skillId: 'atmosphere',
  generate(rng, level) {
    if (level === 1) {
      const l = rng.pick(LAYER_OF);
      return labelQuestion(rng, { prompt: `Which layer of the atmosphere has ${l.x}?`, labels: LAYER_NAME, answer: l.k, why: `That is the **${LAYER_NAME[l.k].toLowerCase()}**.`, code: 'atmosphere-layers', hint: 'From the ground up: troposphere, stratosphere, mesosphere, thermosphere.' });
    }
    if (level === 2) return poolQuestion(rng, rng.pick(AIR), 'atmosphere-layers', 'Air is mostly nitrogen, then oxygen, with a tiny amount of carbon dioxide.');
    if (level === 3 || level === 5) {
      const t0 = rng.int(level === 3 ? 18 : 14, level === 3 ? 30 : 26);
      const h0 = level === 3 ? 0 : rng.pick([1000, 1500, 1750]);
      const h1 = level === 3 ? rng.int(1, 9) * 1000 : h0 + rng.int(4, 18) * 100;
      const km = (h1 - h0) / 1000;
      const dt = 6.5 * km;
      const t1 = Math.round((t0 - dt) * 100) / 100;
      return {
        prompt: level === 3
          ? `Near the ground it is ${t0} °C. In the troposphere the air cools by about 6,5 °C for every kilometre you go up. Estimate the temperature ${km} km above the ground.`
          : `A weather station ${h0} m above sea level measures ${t0} °C. The air cools by about 6,5 °C per kilometre of height. Estimate the temperature at a mountain hut ${h1} m above sea level.`,
        input: { kind: 'numeric', unit: '°C' },
        answer: { kind: 'numeric', value: t1, tolerance: 0.3 },
        answerDisplay: `about ${c(t1, 1)} °C`,
        hints: [level === 3 ? 'Multiply the number of kilometres by 6,5 °C.' : `First find the height gained, ${h1} m − ${h0} m, in kilometres.`, 'Subtract that cooling from the starting temperature.'],
        solution: [`Height gained: ${c(km)} km. Cooling: $${tc(km)} \\times 6{,}5 = ${tc(dt)}$ °C.`, `$${t0} - ${tc(dt)} \\approx ${tc(t1, 1)}$ °C.`],
        misconceptions: keepNum([
          { code: 'atmosphere-layers', answer: { kind: 'numeric', value: t0 + dt, tolerance: 0.3 }, feedback: 'In the troposphere it gets **colder** as you go up, so subtract.' },
          { code: 'probable-slip', answer: { kind: 'numeric', value: -dt, tolerance: 0.3 }, feedback: `That is only the change. Subtract it from ${t0} °C.` },
        ], t1),
      };
    }
    return poolQuestion(rng, rng.pick(GREENHOUSE), 'atmosphere-layers', 'Greenhouse gases absorb infrared heat given off by the Earth.');
  },
};

// ---------------------------------------------------------------------------
// Grade 9: birth, life and death of stars
const SUN_LIFE = ['cloud of gas and dust (nebula)', 'main-sequence star', 'red giant', 'planetary nebula', 'white dwarf'];
const BIG_LIFE = ['cloud of gas and dust (nebula)', 'main-sequence star', 'red supergiant', 'supernova explosion', 'neutron star or black hole'];
const COLOURS = ['blue', 'white', 'yellow', 'orange', 'red'];
const STAR_FACTS: PoolItem[] = [
  { q: 'What makes a star shine?', a: 'Nuclear fusion of hydrogen into helium in its core', wrong: [['Burning coal and gas', 'There is no burning like a fire. Stars are powered by fusion.'], ['Reflected light from other stars', 'Stars make their own light. Planets and moons reflect it.']], why: 'In the hot, dense core, **hydrogen nuclei fuse** into helium and release huge amounts of energy.' },
  { q: 'What pulls a cloud of gas and dust together to form a new star?', a: 'Gravity', wrong: [['Magnetism', 'Gravity pulls the gas and dust together.'], ['Wind in space', 'Gravity does the pulling.']], why: '**Gravity** pulls the nebula together until the core is hot and dense enough for fusion to start.' },
  { q: 'About how old is the Sun?', a: 'About 4,6 billion years', wrong: [['About 6 000 years', 'Rocks and meteorites show the Solar System is billions of years old.'], ['About 100 billion years', 'The whole universe is only about 13,8 billion years old.']], why: 'The Sun formed about **4,6 billion years** ago, about halfway through its main-sequence life.' },
  { q: 'Where were the iron atoms in your blood made?', a: 'Inside massive stars that later exploded', wrong: [["In the Earth's core", 'The iron was made in stars before the Earth formed.'], ['In your liver', "Your body uses iron; it can't make new iron atoms."]], why: 'Elements like iron are made in **massive stars** and spread through space when they explode. We are made of star stuff.' },
  { q: 'Which stars live the shortest lives?', a: 'The most massive stars', wrong: [['The smallest stars', 'Small stars use their fuel slowly and live the longest.'], ['Stars like the Sun', 'Massive stars use their fuel far faster than the Sun.']], why: 'Massive stars are hotter and use their fuel **much faster**, so they live only millions of years.' },
];

export const starLife: QuestionTemplate = {
  id: 'star-life',
  skillId: 'star-life',
  generate(rng, level) {
    if (level === 1) {
      const big = rng.chance(0.5);
      const path = big ? BIG_LIFE : SUN_LIFE;
      const i = rng.int(0, 3);
      const nextStage = path[i + 1]!;
      const others = [...new Set([...SUN_LIFE, ...BIG_LIFE])].filter((x) => x !== nextStage && x !== path[i]);
      return poolQuestion(rng, {
        q: `In the life of ${big ? 'a very massive star' : 'a star like the Sun'}, what comes straight after the ${path[i]}?`,
        a: cap1(nextStage),
        wrong: rng.shuffle(others).slice(0, 3).map((o): [string, string] => [cap1(o), `The order for ${big ? 'a massive star' : 'a Sun-like star'} is: ${path.join(' → ')}.`]),
        why: `${big ? 'A massive star' : 'A star like the Sun'}: ${path.join(' → ')}.`,
      }, 'star-life', 'Sun-like stars end gently as white dwarfs; massive stars explode as supernovae.');
    }
    if (level === 2) {
      const m = rng.pick([0.5, 0.8, 1, 1.5, 2, 3, 12, 15, 20, 25, 40]);
      const big = m >= 8;
      return labelQuestion(rng, { prompt: `A star has ${c(m, 1)} times the mass of the Sun. How will it end its life?`, labels: { small: 'As a white dwarf, after a red giant stage', big: 'In a supernova, leaving a neutron star or black hole' }, answer: big ? 'big' : 'small', why: big ? "Stars more than about 8 times the Sun's mass end in a **supernova**." : "Stars up to a few times the Sun's mass swell into red giants and end as **white dwarfs**.", code: 'star-life', hint: 'The dividing line is about 8 times the mass of the Sun.' });
    }
    if (level === 3) {
      const [i, j] = (rng.shuffle([0, 1, 2, 3, 4]).slice(0, 2) as [number, number]).sort((a, b) => a - b);
      const hot = rng.chance(0.5);
      const right = hot ? COLOURS[i]! : COLOURS[j]!;
      const wrongC = hot ? COLOURS[j]! : COLOURS[i]!;
      return poolQuestion(rng, { q: `Which star is ${hot ? 'hotter' : 'cooler'}: a ${COLOURS[i]} star or a ${COLOURS[j]} star?`, a: `The ${right} star`, wrong: [[`The ${wrongC} star`, `From hottest to coolest: ${COLOURS.join(', ')}.`], ['They are the same temperature', "A star's colour shows its surface temperature."]], why: `A star's colour shows its temperature. From hottest to coolest: **${COLOURS.join(' → ')}**. The Sun is yellow-white.` }, 'star-life', 'Blue stars are the hottest; red stars are the coolest.');
    }
    if (level === 4) return poolQuestion(rng, rng.pick(STAR_FACTS), 'star-life', 'Gravity forms stars; fusion powers them; mass decides their fate.');
    const total = rng.pick([8, 10, 12, 20]);
    const age = rng.pick([1.5, 2.5, 3, 4.6, 5.5, 6]);
    const left = Math.round((total - age) * 10) / 10;
    return {
      prompt: `A star will shine on its main sequence for about ${total} billion years in total. It is now ${c(age, 1)} billion years old. About how many billion years of main-sequence life does it have left?`,
      input: { kind: 'numeric', unit: 'billion years' },
      answer: num(left, 0.01),
      answerDisplay: `about ${c(left, 1)} billion years`,
      hints: ['Subtract its age from its total main-sequence life.'],
      solution: [`$${total} - ${tc(age, 1)} = ${tc(left, 1)}$ billion years.`, 'The Sun is about 4,6 billion years into a main-sequence life of about 10 billion years.'],
      misconceptions: keepNum([{ code: 'probable-slip', answer: num(total + age, 0.01), feedback: 'Time left = total life − age so far.' }], left),
    };
  },
};
