/** Natural Sciences & Technology, Grades 4–6: Energy and change, Planet Earth and beyond, Structures. */
import type { QuestionTemplate } from '../types.ts';
import { exact, num, keepNum, cap, poolQuestion, labelQuestion, type PoolItem } from './kit.ts';

// ---------------------------------------------------------------------------
const SOUND_BASICS: PoolItem[] = [
  { q: 'What causes all sounds?', a: 'Something vibrating (moving back and forth quickly)', wrong: [['Light hitting our ears', 'Light and sound are different. Sound comes from vibrations.'], ['Air being heated', 'Heating air doesn\'t make sound by itself.'], ['Electricity', 'Speakers use electricity, but the sound comes from the vibrating speaker cone.']], why: 'Every sound starts with a **vibration**: a guitar string, a drum skin, your vocal cords.' },
  { q: 'You pluck a guitar string. What does the string do to make the sound?', a: 'It vibrates', wrong: [['It gets hot', 'It barely warms up. The sound comes from vibration.'], ['It stretches and stays stretched', 'It moves back and forth quickly: it vibrates.'], ['It gives off light', 'Strings don\'t glow.']], why: 'The plucked string **vibrates**. Those vibrations pass through the air to your ear.' },
  { q: 'Put your fingers on your throat and hum. What do you feel?', a: 'Vibrations from your vocal cords', wrong: [['Your heartbeat', 'You can feel a pulse in your neck, but the buzz when you hum is vibration.'], ['Air going in', 'Humming pushes air out, and the vocal cords vibrate.'], ['Nothing', 'You feel a buzzing: your vocal cords vibrating.']], why: 'Your **vocal cords** vibrate when you hum or speak. That is how you make sound.' },
  { q: 'Why can\'t astronauts hear each other talk in space without radios?', a: 'Space has no air, and sound needs something to travel through', wrong: [['It is too cold for sound', 'Temperature isn\'t the reason. There is no air to carry the vibrations.'], ['Their helmets block light', 'Sound isn\'t light.'], ['Space is too noisy', 'Space is silent: there is nothing to carry sound.']], why: 'Sound needs a **medium** (a solid, liquid or gas) to travel through. Space is almost empty, so sound can\'t travel.' },
  { q: 'Your friend taps a desk at one end while you press your ear to the other end. Why do you hear the tap so clearly?', a: 'Sound travels well through solids', wrong: [['Wood makes sound louder by magic', 'It is about how well the vibrations travel, not magic.'], ['Sound only travels through solids', 'Sound travels through solids, liquids and gases. It travels best through solids.'], ['Your ear is closer to the air', 'Your ear is on the wood, not in the air.']], why: 'Particles in a solid are packed tightly, so vibrations pass along them easily. Sound travels **well through solids**.' },
  { q: 'Which material would be best for making a room quieter?', a: 'Thick curtains and carpets', wrong: [['Metal sheets', 'Metal reflects sound, which makes rooms echo more.'], ['Glass windows', 'Glass reflects sound.'], ['Bare tiles', 'Hard, smooth surfaces bounce sound around.']], why: 'Soft, thick materials **absorb** sound instead of reflecting it.' },
];
const PITCH: { q: string; a: 'higher' | 'lower'; why: string }[] = [
  { q: 'You make a guitar string shorter by pressing it against the neck. What happens to the pitch?', a: 'higher', why: 'A shorter string vibrates faster, so the pitch is higher.' },
  { q: 'You tighten a guitar string. What happens to the pitch?', a: 'higher', why: 'A tighter string vibrates faster, so the pitch is higher.' },
  { q: 'You blow across the top of a bottle with a little water in it. Then you pour in more water and blow again. The new note is…', a: 'higher', why: 'More water leaves a shorter column of air. A shorter air column vibrates faster, so the pitch is higher.' },
  { q: 'A thick, heavy guitar string is compared with a thin one. The thick string\'s pitch is…', a: 'lower', why: 'A thicker, heavier string vibrates more slowly, so the pitch is lower.' },
  { q: 'You loosen a drum skin. What happens to the pitch when you hit it?', a: 'lower', why: 'A looser skin vibrates more slowly, so the pitch is lower.' },
  { q: 'A big drum is compared with a small drum. The big drum\'s pitch is…', a: 'lower', why: 'A bigger drum skin vibrates more slowly, so the pitch is lower.' },
  { q: 'A small bird and a lion both make sounds. The bird\'s call has a…', a: 'higher', why: 'Small vocal parts vibrate faster, giving a higher pitch.' },
  { q: 'A ruler sticks out over the edge of a desk. You make the part sticking out shorter and twang it. The pitch is…', a: 'higher', why: 'A shorter ruler vibrates faster, so the pitch is higher.' },
];
const LOUD: PoolItem[] = [
  { q: 'You hit a drum harder. What changes?', a: 'It gets louder (bigger vibrations)', wrong: [['The pitch gets higher', 'Hitting harder makes bigger vibrations, not faster ones, so it changes loudness, not pitch.'], ['It gets quieter', 'More force makes bigger vibrations and a louder sound.'], ['Nothing changes', 'The vibrations get bigger, so the sound is louder.']], why: 'Hitting harder makes **bigger** vibrations, which makes a **louder** sound. The pitch stays about the same.' },
  { q: 'What is the difference between pitch and loudness?', a: 'Pitch is how high or low; loudness is how strong', wrong: [['They mean the same thing', 'A quiet note can be high and a loud note can be low. They are different.'], ['Pitch is how strong; loudness is how high', 'Swapped: pitch is high or low, loudness is strong or weak.'], ['Pitch only applies to singing', 'Every sound has a pitch, from drums to birds.']], why: '**Pitch**: how high or low (how fast the vibration). **Loudness**: how strong (how big the vibration).' },
  { q: 'You walk away from a radio. What happens to the sound?', a: 'It gets quieter', wrong: [['It gets louder', 'Sound spreads out and gets weaker with distance.'], ['The pitch gets lower', 'The pitch stays the same. Only the loudness changes.'], ['It stops completely after 2 metres', 'It fades gradually.']], why: 'Sound spreads out as it travels, so it gets **quieter** further away.' },
  { q: 'Why do people who work with jackhammers wear ear protectors?', a: 'Very loud sounds can damage hearing', wrong: [['To keep their ears warm', 'Ear protectors are for safety from loud noise.'], ['Jackhammers make high-pitched sounds only', 'The danger is loudness, not pitch.'], ['To hear the jackhammer better', 'They make the sound quieter to protect the ears.']], why: 'Very **loud** sounds can permanently damage the tiny hair cells inside your ears.' },
];

export const sound: QuestionTemplate = {
  id: 'sound',
  skillId: 'sound',
  generate(rng, level) {
    if (level === 1) return poolQuestion(rng, rng.pick(SOUND_BASICS.slice(0, 3)), 'pitch-loudness', 'What is moving when the sound is made?');
    if (level === 2) {
      const p = rng.pick(PITCH);
      return labelQuestion(rng, { prompt: p.q, labels: { higher: 'Higher pitch', lower: 'Lower pitch' }, answer: p.a, why: p.why, code: 'pitch-loudness', hint: 'Faster vibrations give a higher pitch. Short, tight, thin and small things vibrate faster.' });
    }
    if (level === 3) return poolQuestion(rng, rng.pick(LOUD), 'pitch-loudness', 'Bigger vibrations change loudness. Faster vibrations change pitch.');
    if (level === 4) return poolQuestion(rng, rng.pick(SOUND_BASICS.slice(3)), 'pitch-loudness', 'Sound is vibrations passing through a material.');
    if (rng.chance(0.5)) {
      const s = rng.int(2, 9);
      const d = s * 340;
      return {
        prompt: `Sound travels about 340 metres every second in air. You see lightning and hear the thunder ${s} seconds later. How far away was the lightning, in metres?`,
        input: { kind: 'numeric', unit: 'm' },
        answer: num(d, 0.005),
        answerDisplay: `${d.toLocaleString('en-ZA').replace(/ |,/g, ' ')} m`,
        hints: ['Light reaches you almost instantly. The delay is how long the sound took.', `In 1 second sound goes 340 m. How far in ${s} seconds?`],
        solution: [`$${s} \\times 340 = ${d}$ m.`],
        misconceptions: keepNum([{ code: 'probable-slip', answer: exact(340 / s), feedback: `Multiply, don't divide: each second adds another 340 m.` }, { code: 'probable-slip', answer: exact(340 + s), feedback: `Each of the ${s} seconds adds 340 m, so multiply.` }], d),
      };
    }
    const dist = rng.pick([170, 340, 510, 680]);
    const t = (2 * dist) / 340;
    return {
      prompt: `Nomsa shouts towards a cliff ${dist} m away and hears her echo. Sound travels 340 m per second. How many seconds until she hears the echo?`,
      input: { kind: 'numeric', unit: 's' },
      answer: num(t, 0.01),
      answerDisplay: `${t} s`,
      hints: ['The sound must travel to the cliff **and back**.'],
      solution: [`Distance there and back: $2 \\times ${dist} = ${2 * dist}$ m.`, `Time: $${2 * dist} \\div 340 = ${t}$ s.`],
      misconceptions: keepNum([{ code: 'pitch-loudness', answer: num(dist / 340, 0.01), feedback: 'An echo goes to the cliff and comes back, so the sound travels twice the distance.' }], t),
    };
  },
};

// ---------------------------------------------------------------------------
const CIRCUIT_SETUPS: { d: string; lights: boolean; why: string }[] = [
  { d: 'A cell, a bulb and two wires are joined in a complete loop.', lights: true, why: 'The loop is complete, so current flows from the cell, through the bulb and back.' },
  { d: 'A cell and a bulb are joined with one wire. The second wire is missing.', lights: false, why: 'There is a gap, so the circuit is incomplete and no current flows.' },
  { d: 'A cell, a bulb and a switch are joined in a loop. The switch is open (off).', lights: false, why: 'An open switch makes a gap in the circuit.' },
  { d: 'A cell, a bulb and a switch are joined in a loop. The switch is closed (on).', lights: true, why: 'A closed switch completes the circuit.' },
  { d: 'Both wires from a bulb are connected to the same end of the cell.', lights: false, why: 'Current must go from one end of the cell (+), through the bulb, to the other end (−). Both wires on one end makes no loop through the cell.' },
  { d: 'A cell and a bulb are in a loop, but a plastic straw is placed in the gap between two wires.', lights: false, why: 'Plastic is an insulator, so it doesn\'t let current through.' },
  { d: 'A cell and a bulb are in a loop, but a metal key is placed in the gap between two wires.', lights: true, why: 'Metal conducts electricity, so the key completes the circuit.' },
  { d: 'A cell and a bulb are in a loop, but the cell is flat (used up).', lights: false, why: 'A flat cell can\'t push current around the circuit.' },
  { d: 'A cell and a bulb are in a loop, but a piece of pencil lead (graphite) bridges the gap.', lights: true, why: 'Graphite conducts electricity, so the bulb lights (a bit dimly).' },
];
const COMPONENTS: { c: string; job: string }[] = [
  { c: 'the cell (battery)', job: 'pushing the current around the circuit (it is the energy source)' },
  { c: 'the switch', job: 'opening or closing a gap to turn the circuit off or on' },
  { c: 'the wires', job: 'carrying the current between the parts' },
  { c: 'the bulb', job: 'changing electrical energy into light (and some heat)' },
  { c: 'a buzzer', job: 'changing electrical energy into sound' },
  { c: 'a motor', job: 'changing electrical energy into movement' },
];
const BRIGHT: PoolItem[] = [
  { q: 'A circuit has one cell and one bulb. You add a second cell (in a row with the first). What happens to the bulb?', a: 'It gets brighter', wrong: [['It gets dimmer', 'More cells give a bigger push, so more current and a brighter bulb.'], ['It stays the same', 'Adding a cell in a row increases the push (voltage).'], ['It goes out', 'The circuit is still complete.']], why: 'Two cells in a row give a bigger **push**, so the bulb is **brighter**.' },
  { q: 'A circuit has one cell and one bulb. You add a second bulb in the same loop. What happens to the brightness?', a: 'Both bulbs are dimmer than the single bulb was', wrong: [['Both bulbs are brighter', 'The same push now has to go through two bulbs, so the current is smaller.'], ['One is bright and one is off', 'In one loop the same current flows through both, so they glow the same.'], ['Nothing changes', 'Adding a bulb in the same loop makes it harder for current to flow.']], why: 'Two bulbs in one loop share the cell\'s push, so the current is smaller and both are **dimmer**.' },
  { q: 'Two bulbs are in one loop. One bulb breaks. What happens to the other bulb?', a: 'It goes out too', wrong: [['It gets brighter', 'A broken bulb makes a gap in the only path, so no current flows anywhere.'], ['It stays the same', 'The loop is broken, so the current stops everywhere.'], ['It flickers forever', 'With a gap in the circuit, no current flows at all.']], why: 'In a single loop there is only one path. A broken bulb makes a **gap**, so all the current stops.' },
  { q: 'Why do circuits have switches?', a: 'To turn the circuit on and off safely without pulling wires out', wrong: [['To make the bulb brighter', 'A switch only opens or closes the circuit.'], ['To store electricity', 'Cells store energy, not switches.'], ['To stop the wires getting tangled', 'Switches control whether current flows.']], why: 'A **switch** makes or breaks a gap in the circuit, turning it on or off.' },
];

export const simpleCircuits: QuestionTemplate = {
  id: 'simple-circuits',
  skillId: 'simple-circuits',
  generate(rng, level) {
    if (level === 1 || level === 2) {
      const pool = level === 1 ? CIRCUIT_SETUPS.slice(0, 4) : CIRCUIT_SETUPS.slice(4);
      const s = rng.pick(pool);
      return labelQuestion(rng, { prompt: `${s.d} Will the bulb light up?`, labels: { yes: 'Yes', no: 'No' }, answer: s.lights ? 'yes' : 'no', why: s.why, code: 'complete-circuit', hint: 'The bulb lights only if there is a complete loop from one end of a working cell, through the bulb, back to the other end.' });
    }
    if (level === 3) {
      const c = rng.pick(COMPONENTS);
      const others = rng.shuffle(COMPONENTS.filter((x) => x !== c)).slice(0, 3);
      return poolQuestion(rng, { q: `What is the job of ${c.c} in a circuit?`, a: cap(c.job), wrong: others.map((o) => [cap(o.job), `That is the job of ${o.c}.`]), why: `The job of ${c.c} is ${c.job}.` }, 'complete-circuit', 'Think about what each part adds to the circuit.');
    }
    if (level === 4) return poolQuestion(rng, rng.pick(BRIGHT), 'complete-circuit', 'More cells push harder. More bulbs in one loop make it harder for current to flow.');
    const cells = rng.int(2, 6);
    const v = cells * 1.5;
    return {
      prompt: `Each cell gives 1,5 volts. A torch uses ${cells} cells placed end to end (in a row). What is the total voltage?`,
      input: { kind: 'numeric', unit: 'V' },
      answer: num(v, 0.001),
      answerDisplay: `${String(v).replace('.', ',')} V`,
      hints: ['Cells in a row add their voltages together.'],
      solution: [`$${cells} \\times 1{,}5 = ${String(v).replace('.', '{,}')}$ V.`],
      misconceptions: keepNum([{ code: 'complete-circuit', answer: num(1.5, 0.001), feedback: 'Cells placed end to end add up: each one adds another 1,5 V.' }, { code: 'probable-slip', answer: exact(cells + 1.5), feedback: `Multiply: ${cells} lots of 1,5 V.` }], v),
    };
  },
};

// ---------------------------------------------------------------------------
export const PHASES = ['new moon', 'waxing crescent', 'first quarter', 'waxing gibbous', 'full moon', 'waning gibbous', 'last quarter', 'waning crescent'];
const EARTH_FACTS: PoolItem[] = [
  { q: 'Why do we have day and night?', a: 'The Earth spins on its axis', wrong: [['The Sun moves around the Earth every day', 'It looks that way, but it is the Earth that turns.'], ['The Earth moves around the Sun every day', 'One trip around the Sun takes a whole year.'], ['The Moon blocks the Sun at night', 'The Moon doesn\'t cause night. The Earth turning away from the Sun does.']], why: 'The Earth **spins** (rotates) once every 24 hours. The side facing the Sun has day; the side facing away has night.' },
  { q: 'Why does the Sun seem to rise in the east and set in the west?', a: 'The Earth spins from west to east', wrong: [['The Sun travels across the sky each day', 'The Sun only appears to move. We are the ones turning.'], ['The Earth spins from east to west', 'If it did, the Sun would rise in the west.'], ['The Moon pushes the Sun', 'The Moon has nothing to do with sunrise.']], why: 'As the Earth **spins towards the east**, the Sun comes into view in the east and disappears in the west.' },
  { q: 'How long does the Earth take to go once around the Sun?', a: 'About 365 days (one year)', wrong: [['24 hours (one day)', 'That is one spin on its axis.'], ['About 28 days (one month)', 'That is roughly how long the Moon takes to go around the Earth.'], ['7 days (one week)', 'A week is not linked to the Earth\'s orbit.']], why: 'One **orbit** around the Sun takes about 365¼ days: one year.' },
  { q: 'Where does moonlight come from?', a: 'Sunlight reflecting off the Moon', wrong: [['The Moon makes its own light', 'The Moon is rock. It only reflects the Sun\'s light.'], ['Light from the stars', 'Starlight is far too dim. It is sunlight.'], ['Light from Earth\'s cities', 'City lights are far too weak to light up the Moon.']], why: 'The Moon gives off no light of its own. We see it because it **reflects sunlight**.' },
  { q: 'When it is daytime in South Africa, what is it like on the opposite side of the Earth?', a: 'It is night there', wrong: [['It is also day there', 'Only half of the Earth faces the Sun at a time.'], ['It is always night there', 'As the Earth spins, every place gets day and night.'], ['There is no Sun there', 'The Sun is there; that side is just facing away from it right now.']], why: 'Only half the Earth faces the Sun at a time. The other half has **night**.' },
];
const WHY_PHASES: PoolItem[] = [
  { q: 'Why does the Moon seem to change shape during the month?', a: 'We see different amounts of its sunlit half as it orbits the Earth', wrong: [['The Earth\'s shadow covers part of it', 'That only happens in an eclipse. Phases are about how much of the lit half we can see.'], ['Clouds cover part of it', 'Clouds come and go; phases follow a regular monthly pattern.'], ['The Moon really changes shape', 'The Moon is always a round ball. Only what we see changes.']], why: 'Half the Moon is always lit by the Sun. As it **orbits the Earth**, we see more or less of that lit half.' },
  { q: 'At full moon, where is the Moon?', a: 'On the opposite side of the Earth from the Sun', wrong: [['Between the Earth and the Sun', 'That is new moon: the lit side faces away from us.'], ['Right next to the Sun', 'Then we would see none of the lit side.'], ['Behind the Sun', 'The Moon orbits the Earth, never behind the Sun.']], why: 'At full moon the Moon is on the **far side of the Earth** from the Sun, so we see its whole lit face.' },
  { q: 'Why can\'t we see the Moon at new moon?', a: 'Its lit side faces away from Earth', wrong: [['The Moon has moved away from Earth', 'It is still orbiting at the same distance.'], ['It is hidden behind the Earth', 'At new moon it is between the Earth and the Sun.'], ['The Sun has stopped shining on it', 'The Sun always lights half the Moon.']], why: 'At new moon the Moon is between us and the Sun, so the **lit half faces away** from us.' },
  { q: 'About how long does the Moon take to go through all its phases (new moon to new moon)?', a: 'About 29½ days', wrong: [['24 hours', 'That is one day on Earth.'], ['7 days', 'About 7 days is the gap between one main phase and the next.'], ['365 days', 'That is a year.']], why: 'A full cycle of phases takes about **29½ days**, roughly a month.' },
  { q: 'After full moon, is the lit part of the Moon getting bigger or smaller each night?', a: 'Smaller: it is waning', wrong: [['Bigger: it is waxing', 'Waxing happens before full moon. After full moon it wanes.'], ['It stays full for two weeks', 'It changes a little every night.'], ['It jumps straight to new moon', 'It shrinks gradually over about two weeks.']], why: 'After full moon the lit part gets smaller each night: the Moon is **waning**.' },
];

export const earthMoon: QuestionTemplate = {
  id: 'earth-moon',
  skillId: 'earth-moon',
  generate(rng, level) {
    if (level === 1) return poolQuestion(rng, rng.pick(EARTH_FACTS), 'earth-motion', 'Spinning on its axis gives day and night. Going around the Sun takes a year.');
    if (level === 2) {
      const q = rng.pick([
        { q: 'How many hours does the Earth take to spin once on its axis?', a: 24, wrong: [365, 12] },
        { q: 'About how many days does the Earth take to orbit the Sun once?', a: 365, wrong: [24, 30] },
        { q: 'If it is 12 hours of daylight, how many hours of night are there in that day?', a: 12, wrong: [24, 6] },
        { q: 'In 3 days, how many times does the Earth spin on its axis?', a: 3, wrong: [72, 1] },
        { q: 'How many hours are there in 2 Earth days?', a: 48, wrong: [24, 2] },
      ]);
      return {
        prompt: q.q,
        input: { kind: 'numeric' },
        answer: exact(q.a),
        answerDisplay: String(q.a),
        hints: ['One spin = one day = 24 hours. One orbit = one year ≈ 365 days.'],
        solution: [`The answer is ${q.a}.`],
        misconceptions: keepNum(q.wrong.map((w) => ({ code: 'earth-motion' as const, answer: exact(w), feedback: 'Remember: one spin takes 24 hours (a day); one orbit of the Sun takes about 365 days (a year).' })), q.a),
      };
    }
    if (level === 3) {
      const i = rng.int(0, 7);
      const next = PHASES[(i + 1) % 8]!;
      const others = rng.shuffle(PHASES.filter((p) => p !== next && p !== PHASES[i])).slice(0, 3);
      return poolQuestion(rng, { q: `Tonight's Moon phase is **${PHASES[i]}**. Which phase comes next?`, a: cap(next), wrong: others.map((o) => [cap(o), `The order is: ${PHASES.join(' → ')} → (new moon again).`]), why: `After ${PHASES[i]} comes **${next}**. Order: ${PHASES.join(' → ')}.` }, 'moon-phases', 'Waxing means growing (getting bigger) towards full moon; waning means shrinking.');
    }
    if (level === 4) return poolQuestion(rng, rng.pick(WHY_PHASES), 'moon-phases', 'Half the Moon is always lit by the Sun. What changes is how much of that half we can see.');
    const pairs = [
      { from: 'new moon', to: 'first quarter', days: 7 },
      { from: 'new moon', to: 'full moon', days: 15 },
      { from: 'full moon', to: 'last quarter', days: 7 },
      { from: 'first quarter', to: 'full moon', days: 7 },
      { from: 'full moon', to: 'new moon', days: 15 },
      { from: 'first quarter', to: 'last quarter', days: 15 },
      { from: 'new moon', to: 'next new moon', days: 29.5 },
    ];
    const p = rng.pick(pairs);
    const date = rng.int(1, 12);
    return {
      prompt: `It was a ${p.from} on ${date} March. About how many days until the ${p.to}? (A full cycle takes about 29,5 days.)`,
      input: { kind: 'numeric', unit: 'days' },
      answer: { kind: 'numeric', value: p.days, tolerance: 1.5 },
      answerDisplay: `about ${String(p.days).replace('.', ',')} days`,
      hints: ['The four main phases are about a quarter of 29,5 days apart: roughly 7 days each.'],
      solution: [`Each main phase is about $29{,}5 \\div 4 \\approx 7{,}4$ days after the last.`, `From ${p.from} to ${p.to} is about ${String(p.days).replace('.', ',')} days.`],
      misconceptions: keepNum([{ code: 'moon-phases', answer: exact(p.days >= 14 ? 7 : 15), feedback: 'Count the quarter-steps: new → first quarter → full → last quarter → new, about 7 days each.' }], p.days),
    };
  },
};

// ---------------------------------------------------------------------------
export interface Planet {
  name: string;
  au: number;
  diameter: number; // thousand km
  inner: boolean;
  fact: string;
}
export const PLANETS: Planet[] = [
  { name: 'Mercury', au: 0.39, diameter: 4.9, inner: true, fact: 'the smallest planet and closest to the Sun' },
  { name: 'Venus', au: 0.72, diameter: 12.1, inner: true, fact: 'the hottest planet, because its thick clouds trap heat' },
  { name: 'Earth', au: 1, diameter: 12.7, inner: true, fact: 'the only planet known to have life and liquid water on its surface' },
  { name: 'Mars', au: 1.52, diameter: 6.8, inner: true, fact: 'the "red planet", coloured by rusty iron in its soil' },
  { name: 'Jupiter', au: 5.2, diameter: 143, inner: false, fact: 'the biggest planet, with a giant storm called the Great Red Spot' },
  { name: 'Saturn', au: 9.5, diameter: 121, inner: false, fact: 'famous for its bright rings of ice and rock' },
  { name: 'Uranus', au: 19.2, diameter: 51, inner: false, fact: 'tipped on its side, so it rolls around the Sun' },
  { name: 'Neptune', au: 30.1, diameter: 49.5, inner: false, fact: 'the furthest planet from the Sun, with the fastest winds' },
];
const SOLAR_FACTS: PoolItem[] = [
  { q: 'What is the Sun?', a: 'A star', wrong: [['A planet', 'Planets orbit stars. The Sun is the star at the centre of our solar system.'], ['A moon', 'Moons orbit planets.'], ['A ball of fire', 'It isn\'t burning like a fire. It is a star powered by nuclear reactions.']], why: 'The Sun is a **star**: a huge ball of hot gas that makes its own light and heat.' },
  { q: 'Why do the planets travel around the Sun instead of flying off into space?', a: 'The Sun\'s gravity pulls on them', wrong: [['They are tied by invisible strings', 'There are no strings. Gravity does the pulling.'], ['Magnetism holds them', 'Gravity, not magnetism, keeps planets in orbit.'], ['Space is too thick to move through', 'Space is almost empty.']], why: 'The Sun\'s **gravity** pulls on every planet, keeping it in orbit.' },
  { q: 'How are the four inner planets different from the four outer planets?', a: 'Inner planets are small and rocky; outer planets are giant and made mostly of gas and ice', wrong: [['Inner planets are giant gas planets', 'It is the other way round: the giants are on the outside.'], ['They are all the same size', 'Jupiter is more than 10 times wider than Earth.'], ['Only the outer planets orbit the Sun', 'All eight planets orbit the Sun.']], why: 'Mercury, Venus, Earth and Mars are small and **rocky**. Jupiter, Saturn, Uranus and Neptune are **giants** of gas and ice.' },
  { q: 'Why do stars seem to disappear during the day?', a: 'The Sun\'s light is so bright it hides them', wrong: [['Stars switch off in the day', 'Stars shine all the time.'], ['Stars move to the other side of the Sun', 'They are still there, just outshone by the Sun.'], ['Clouds always cover them', 'Even on a clear day the sky is too bright to see stars.']], why: 'Stars are still there in the day, but the **bright sunlight** scattered by our sky hides them.' },
  { q: 'Which is closest to Earth?', a: 'The Moon', wrong: [['The Sun', 'The Sun is about 400 times further away than the Moon.'], ['Mars', 'Mars is at least 140 times further than the Moon.'], ['The nearest star after the Sun', 'That is incredibly far: light takes over 4 years to reach us from it.']], why: 'The **Moon** is our nearest neighbour, about 384 000 km away.' },
];

export const solarSystem: QuestionTemplate = {
  id: 'solar-system',
  skillId: 'solar-system',
  generate(rng, level) {
    if (level === 1) {
      const i = rng.int(0, 6);
      const p = PLANETS[i]!;
      const next = PLANETS[i + 1]!;
      const others = rng.shuffle(PLANETS.filter((x) => x !== next && x !== p)).slice(0, 3);
      return poolQuestion(rng, { q: `Going outward from the Sun, which planet comes straight after ${p.name}?`, a: next.name, wrong: others.map((o) => [o.name, `The order is ${PLANETS.map((x) => x.name).join(', ')}.`]), why: `Order from the Sun: ${PLANETS.map((x) => x.name).join(', ')}. A memory trick: **M**y **V**ery **E**ager **M**other **J**ust **S**erved **U**s **N**achos.` }, 'planet-facts', 'My Very Eager Mother Just Served Us Nachos.');
    }
    if (level === 2) {
      const p = rng.pick(PLANETS);
      const others = rng.shuffle(PLANETS.filter((x) => x !== p)).slice(0, 3);
      return poolQuestion(rng, { q: `Which planet is ${p.fact}?`, a: p.name, wrong: others.map((o) => [o.name, `${o.name} is ${o.fact}.`]), why: `**${p.name}** is ${p.fact}.` }, 'planet-facts', 'Think about each planet\'s most famous feature.');
    }
    if (level === 3) {
      const p = rng.pick(PLANETS);
      return labelQuestion(rng, { prompt: `Is ${p.name} an inner (rocky) planet or an outer (giant) planet?`, labels: { inner: 'Inner, rocky planet', outer: 'Outer, giant planet' }, answer: p.inner ? 'inner' : 'outer', why: p.inner ? `${p.name} is one of the four small rocky planets closest to the Sun.` : `${p.name} is one of the four giant planets beyond the asteroid belt.`, code: 'planet-facts', hint: 'The inner four: Mercury, Venus, Earth, Mars. Then the asteroid belt. Then the giants.' });
    }
    if (level === 4) return poolQuestion(rng, rng.pick(SOLAR_FACTS), 'planet-facts', 'The Sun is a star; gravity holds the solar system together.');
    if (rng.chance(0.5)) {
      // Scale model: 1 AU = 10 cm
      const scale = rng.pick([10, 20, 5]);
      const p = rng.pick(PLANETS.filter((x) => x.au >= 1.5));
      const d = Math.round(p.au * scale * 10) / 10;
      return {
        prompt: `Your class builds a model where Earth is ${scale} cm from the Sun. ${p.name} is about ${String(p.au).replace('.', ',')} times as far from the Sun as Earth. How far from the Sun should ${p.name} be in the model, in centimetres?`,
        input: { kind: 'numeric', unit: 'cm' },
        answer: num(d, 0.02),
        answerDisplay: `about ${String(d).replace('.', ',')} cm`,
        hints: [`Multiply Earth's distance (${scale} cm) by ${String(p.au).replace('.', ',')}.`],
        solution: [`$${scale} \\times ${String(p.au).replace('.', '{,}')} \\approx ${String(d).replace('.', '{,}')}$ cm.`, 'The outer planets are very far apart: the real solar system is mostly empty space.'],
        misconceptions: keepNum([{ code: 'probable-slip', answer: num(scale + p.au, 0.02), feedback: `It is ${String(p.au).replace('.', ',')} **times** as far, so multiply.` }], d),
      };
    }
    const p = rng.pick(PLANETS.filter((x) => x.diameter > 40));
    const times = Math.round(p.diameter / 12.7);
    return {
      prompt: `Earth is about 12 700 km wide. ${p.name} is about ${(p.diameter * 1000).toLocaleString('en-ZA').replace(/ |,/g, ' ')} km wide. About how many Earths would fit side by side across ${p.name}? (Round to the nearest whole number.)`,
      input: { kind: 'numeric' },
      answer: { kind: 'numeric', value: times, tolerance: 0.6 },
      answerDisplay: `about ${times}`,
      hints: [`Divide ${p.name}'s width by Earth's width.`],
      solution: [`$${p.diameter * 1000} \\div 12\\,700 \\approx ${times}$.`],
      misconceptions: keepNum([{ code: 'probable-slip', answer: exact(Math.round(p.diameter * 1000 - 12700)), feedback: 'Subtracting tells you how much wider it is. To find how many Earths fit, divide.' }], times),
    };
  },
};

// ---------------------------------------------------------------------------
type StructType = 'frame' | 'shell' | 'solid';
const STRUCTS: { name: string; t: StructType }[] = [
  { name: 'an electricity pylon', t: 'frame' },
  { name: 'a bicycle frame', t: 'frame' },
  { name: 'a roof truss', t: 'frame' },
  { name: 'a climbing frame on a playground', t: 'frame' },
  { name: 'a hen\'s egg', t: 'shell' },
  { name: 'a cooldrink can', t: 'shell' },
  { name: 'a tortoise shell', t: 'shell' },
  { name: 'a plastic bucket', t: 'shell' },
  { name: 'a brick wall', t: 'solid' },
  { name: 'a stone dam wall', t: 'solid' },
  { name: 'a termite mound', t: 'solid' },
  { name: 'a concrete pillar', t: 'solid' },
];
const STRUCT_WHY: Record<StructType, string> = {
  frame: 'A **frame** structure is a skeleton of beams or bars joined together, with gaps between them.',
  shell: 'A **shell** structure is a thin, curved outer layer that is hollow inside.',
  solid: 'A **solid** structure is made by piling up or filling in material, with little or no empty space.',
};
const STRENGTH: PoolItem[] = [
  { q: 'Why do bridges and pylons use lots of triangles?', a: 'Triangles keep their shape when pushed; squares can squash into a diamond', wrong: [['Triangles look nicer', 'Engineers choose triangles for strength, not looks.'], ['Triangles use more material', 'Triangles actually let you build strong frames with less material.'], ['Squares are stronger than triangles', 'A square frame with pin joints can be pushed into a diamond. A triangle can\'t change shape.']], why: 'A **triangle** is rigid: you can\'t change its shape without changing a side\'s length. That makes frames strong.' },
  { q: 'Thabo folds a sheet of paper into a zigzag (concertina) and lays it across two books. It holds more coins than a flat sheet. Why?', a: 'The folds make the paper stiffer, so it resists bending', wrong: [['Folding makes the paper heavier', 'The paper weighs the same. The shape is what changed.'], ['The folds add more paper', 'It is the same amount of paper in a stronger shape.'], ['Coins stick to the folds', 'The coins rest on it; the paper is simply stiffer.']], why: 'Folding gives the paper **depth**, which makes it much harder to bend. Corrugated iron roofs work the same way.' },
  { q: 'A paper tube stands upright and supports a book. A flat sheet of the same paper can\'t. Why?', a: 'Rolling it into a tube spreads the load and stops it bending', wrong: [['The tube has more paper', 'It is the same paper rolled up.'], ['Paper is stronger when it is rolled tightly', 'It isn\'t the tightness: it is the round, hollow shape.'], ['The book is lighter on a tube', 'The book weighs the same.']], why: 'A **tube** (cylinder) spreads the weight evenly all round, and the curve stops it buckling. Pillars and bones use this idea.' },
  { q: 'When you sit on a chair, the legs are being squashed. What is this force called?', a: 'Compression', wrong: [['Tension', 'Tension is a pulling, stretching force, like in a rope.'], ['Gravity only', 'Gravity pulls you down, but the force squashing the legs is compression.'], ['Friction', 'Friction acts between surfaces sliding against each other.']], why: 'A pushing, squashing force is **compression**.' },
  { q: 'The cables holding up a suspension bridge are being pulled. What is this force called?', a: 'Tension', wrong: [['Compression', 'Compression squashes. Cables are being stretched.'], ['Friction', 'Friction is between sliding surfaces.'], ['Magnetism', 'There is no magnetism here: just pulling.']], why: 'A pulling, stretching force is **tension**. Cables and ropes are strong in tension.' },
  { q: 'Why is the bottom of a dam wall much thicker than the top?', a: 'Water pushes harder the deeper it is', wrong: [['To save concrete at the bottom', 'The bottom uses more concrete, not less.'], ['The top gets more sun', 'Sunlight has nothing to do with the shape.'], ['Fish live at the bottom', 'The shape is for strength against water pressure.']], why: 'Water **pressure increases with depth**, so the bottom of the wall needs to be strongest.' },
];

export const structures: QuestionTemplate = {
  id: 'structures',
  skillId: 'structures',
  generate(rng, level) {
    if (level === 1 || level === 2) {
      const s = rng.pick(level === 1 ? STRUCTS.filter((x) => x.t !== 'solid') : STRUCTS);
      const labels = level === 1 ? { frame: 'Frame structure', shell: 'Shell structure' } : { frame: 'Frame structure', shell: 'Shell structure', solid: 'Solid structure' };
      return labelQuestion(rng, { prompt: `What type of structure is ${s.name}?`, labels: labels as Record<StructType, string>, answer: s.t, why: STRUCT_WHY[s.t], code: 'structure-strength', hint: 'Frame: a skeleton of bars. Shell: a thin, hollow outer layer. Solid: filled in.' });
    }
    if (level === 3 || level === 4) return poolQuestion(rng, rng.pick(level === 3 ? STRENGTH.slice(0, 3) : STRENGTH.slice(3)), 'structure-strength', level === 3 ? 'Shape matters as much as material.' : 'Compression squashes; tension stretches.');
    const design = rng.pick(['flat sheet', 'zigzag fold', 'paper tube', 'triangle beam']);
    const trials = [rng.int(8, 30), rng.int(8, 30), rng.int(8, 30)];
    const sum = trials[0]! + trials[1]! + trials[2]!;
    const extra = (3 - (sum % 3)) % 3;
    trials[2]! += extra;
    const avg = (sum + extra) / 3;
    return {
      prompt: `Lindiwe tests a paper bridge (${design}) three times. It holds ${trials.join(', ')} coins before collapsing. What is the average (mean) number of coins it holds?`,
      input: { kind: 'numeric', unit: 'coins' },
      answer: exact(avg),
      answerDisplay: `${avg} coins`,
      hints: ['Add the three results, then divide by 3.', 'Scientists repeat tests and average them because one result might be unusual.'],
      solution: [`$${trials.join(' + ')} = ${sum + extra}$.`, `$${sum + extra} \\div 3 = ${avg}$ coins.`],
      misconceptions: keepNum([{ code: 'probable-slip', answer: exact(sum + extra), feedback: 'That is the total. Divide by the number of tests (3) to get the average.' }, { code: 'probable-slip', answer: exact(Math.max(...trials)), feedback: 'The average isn\'t the biggest result. Add all three and divide by 3.' }], avg),
    };
  },
};
