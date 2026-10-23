import type { QuestionTemplate, Misconception, AnswerSpec } from '../types.ts';
import { fmt, round } from '../tex.ts';

const G = 9.8;
const num = (value: number, rel = 0.01): AnswerSpec => ({ kind: 'numeric', value, tolerance: rel, relative: true });

function keepNum(ms: Misconception[], correct: number): Misconception[] {
  const seen = [correct];
  return ms.filter((m) => {
    if (m.answer.kind !== 'numeric' || !Number.isFinite(m.answer.value)) return false;
    const v = m.answer.value;
    if (seen.some((s) => Math.abs(s - v) <= Math.abs(s) * 0.02 + 1e-9)) return false;
    seen.push(v);
    return true;
  });
}

// ---------------------------------------------------------------------------
const TRIPS = [
  { what: 'A minibus taxi', from: 'Pietermaritzburg', to: 'Durban', km: 80 },
  { what: 'A bus', from: 'Johannesburg', to: 'Polokwane', km: 320 },
  { what: 'A truck', from: 'Cape Town', to: 'Worcester', km: 110 },
  { what: 'A car', from: 'Gqeberha', to: 'Makhanda', km: 130 },
  { what: 'A train', from: 'Pretoria', to: 'Johannesburg', km: 60 },
];

export const speedDistanceTime: QuestionTemplate = {
  id: 'speed-distance-time',
  skillId: 'speed-distance-time',
  generate(rng, level) {
    if (level === 1) {
      const v = rng.int(2, 12);
      const t = rng.int(5, 60);
      const d = v * t;
      return {
        prompt: `A cyclist travels ${d} m in ${t} s at a constant speed. What is her speed?`,
        input: { kind: 'numeric', unit: 'm/s' },
        answer: num(v),
        answerDisplay: `${v} m/s`,
        hints: ['Speed = distance ÷ time.'],
        solution: [`$v = \\dfrac{d}{t} = \\dfrac{${d}}{${t}} = ${v}$ m/s.`],
        misconceptions: keepNum([{ code: 'formula-rearranged-wrongly', answer: num(t / d), feedback: 'You divided time by distance. Speed is distance ÷ time.' }], v),
      };
    }
    if (level === 2 || level === 3) {
      const trip = rng.pick(TRIPS);
      const t = rng.pick([0.5, 1, 1.25, 1.5, 2, 2.5, 3, 4]);
      const v = round(trip.km / t, 1);
      if (level === 2) {
        const d = round(v * t, 1);
        return {
          prompt: `${trip.what} drives at an average speed of ${fmt(v)} km/h for ${fmt(t)} h. How far does it travel?`,
          input: { kind: 'numeric', unit: 'km' },
          answer: num(d),
          answerDisplay: `${fmt(d)} km`,
          hints: ['Distance = speed × time.'],
          solution: [`$d = v \\times t = ${fmt(v)} \\times ${fmt(t)} = ${fmt(d)}$ km.`],
          misconceptions: keepNum([{ code: 'formula-rearranged-wrongly', answer: num(v / t), feedback: 'You divided. Distance = speed × time.' }], d),
        };
      }
      const tt = round(trip.km / v, 2);
      return {
        prompt: `${trip.what} travels ${trip.km} km from ${trip.from} to ${trip.to} at an average speed of ${fmt(v)} km/h. How long does the trip take, in hours?`,
        input: { kind: 'numeric', unit: 'h' },
        answer: num(tt),
        answerDisplay: `${fmt(tt, 2)} h`,
        hints: ['Rearrange $v = \\dfrac{d}{t}$ to make $t$ the subject.', '$t = \\dfrac{d}{v}$.'],
        solution: [`$t = \\dfrac{d}{v} = \\dfrac{${trip.km}}{${fmt(v)}} = ${fmt(tt, 2)}$ h.`],
        misconceptions: keepNum([{ code: 'formula-rearranged-wrongly', answer: num(trip.km * v), feedback: 'Time = distance ÷ speed. You multiplied.' }], tt),
      };
    }
    if (level === 4) {
      const kmh = rng.pick([36, 54, 72, 90, 108, 120]);
      const ms = kmh / 3.6;
      const t = rng.int(5, 30);
      const d = round(ms * t, 1);
      return {
        prompt: `A car travels at ${kmh} km/h. How many metres does it cover in ${t} s?`,
        input: { kind: 'numeric', unit: 'm' },
        answer: num(d),
        answerDisplay: `${fmt(d)} m`,
        hints: ['The speed is in km/h but the time is in seconds. Convert first.', 'To convert km/h to m/s, divide by 3.6.'],
        solution: [`$${kmh} \\text{ km/h} \\div 3.6 = ${fmt(ms, 2)}$ m/s.`, `$d = v t = ${fmt(ms, 2)} \\times ${t} = ${fmt(d)}$ m.`],
        misconceptions: keepNum(
          [
            { code: 'unit-conversion', answer: num(kmh * t), feedback: 'You multiplied km/h by seconds. Convert the speed to m/s first (÷ 3.6).' },
            { code: 'unit-conversion', answer: num(kmh * 3.6 * t), feedback: 'To go from km/h to m/s you divide by 3.6, not multiply.' },
          ],
          d,
        ),
      };
    }
    const d1 = rng.pick([20, 30, 40, 60]);
    const v1 = rng.pick([40, 60, 80]);
    const d2 = rng.pick([20, 30, 40, 60]);
    const v2 = rng.pick([100, 120]);
    const t1 = d1 / v1;
    const t2 = d2 / v2;
    const avg = round((d1 + d2) / (t1 + t2), 1);
    return {
      prompt: `A driver travels ${d1} km through town at ${v1} km/h, then ${d2} km on the highway at ${v2} km/h. What is the average speed for the whole trip?`,
      input: { kind: 'numeric', unit: 'km/h' },
      answer: num(avg),
      answerDisplay: `${fmt(avg)} km/h`,
      hints: ['Average speed = total distance ÷ total time.', 'Work out the time for each part separately.'],
      solution: [
        `Time in town: $\\dfrac{${d1}}{${v1}} = ${fmt(t1, 3)}$ h. Time on highway: $\\dfrac{${d2}}{${v2}} = ${fmt(t2, 3)}$ h.`,
        `Total: ${d1 + d2} km in ${fmt(t1 + t2, 3)} h.`,
        `$v_{\\text{avg}} = \\dfrac{${d1 + d2}}{${fmt(t1 + t2, 3)}} = ${fmt(avg)}$ km/h.`,
      ],
      misconceptions: keepNum([{ code: 'average-of-speeds', answer: num((v1 + v2) / 2), feedback: 'You averaged the two speeds. The driver spends more time at the slower speed, so work with total distance ÷ total time.' }], avg),
    };
  },
};

// ---------------------------------------------------------------------------
export const newtonsSecondLaw: QuestionTemplate = {
  id: 'newtons-second-law',
  skillId: 'newtons-second-law',
  generate(rng, level) {
    const m = rng.pick([2, 4, 5, 8, 10, 12, 15, 20, 25, 50, 60, 80]);
    const a = rng.pick([0.5, 1.5, 2, 2.5, 3, 4, 5, 6]);
    if (level === 1) {
      const F = round(m * a, 2);
      return {
        prompt: `A ${m} kg trolley accelerates at ${fmt(a)} m/s². What net force acts on it?`,
        input: { kind: 'numeric', unit: 'N' },
        answer: num(F),
        answerDisplay: `${fmt(F)} N`,
        hints: ['Use $F_{\\text{net}} = ma$.'],
        solution: [`$F_{\\text{net}} = ma = ${m} \\times ${fmt(a)} = ${fmt(F)}$ N.`],
        misconceptions: keepNum([{ code: 'formula-rearranged-wrongly', answer: num(m / a), feedback: 'Force is mass **times** acceleration.' }], F),
      };
    }
    if (level === 2 || level === 3) {
      const F = round(m * a, 2);
      if (level === 2) {
        return {
          prompt: `A net force of ${fmt(F)} N acts on a ${m} kg box. What is its acceleration?`,
          input: { kind: 'numeric', unit: 'm/s²' },
          answer: num(a),
          answerDisplay: `${fmt(a)} m/s²`,
          hints: ['Rearrange $F = ma$ to make $a$ the subject.', '$a = \\dfrac{F}{m}$.'],
          solution: [`$a = \\dfrac{F_{\\text{net}}}{m} = \\dfrac{${fmt(F)}}{${m}} = ${fmt(a)}$ m/s².`],
          misconceptions: keepNum(
            [
              { code: 'formula-rearranged-wrongly', answer: num(F * m), feedback: 'Acceleration = force ÷ mass. You multiplied.' },
              { code: 'formula-rearranged-wrongly', answer: num(m / F), feedback: 'You divided mass by force. It should be force ÷ mass.' },
            ],
            a,
          ),
        };
      }
      return {
        prompt: `A net force of ${fmt(F)} N gives an object an acceleration of ${fmt(a)} m/s². What is its mass?`,
        input: { kind: 'numeric', unit: 'kg' },
        answer: num(m),
        answerDisplay: `${m} kg`,
        hints: ['Rearrange $F = ma$ to make $m$ the subject.'],
        solution: [`$m = \\dfrac{F_{\\text{net}}}{a} = \\dfrac{${fmt(F)}}{${fmt(a)}} = ${m}$ kg.`],
        misconceptions: keepNum([{ code: 'formula-rearranged-wrongly', answer: num(F * a), feedback: 'Mass = force ÷ acceleration.' }], m),
      };
    }
    if (level === 4) {
      const f = rng.pick([5, 10, 15, 20, 30, 40]);
      const Fa = round(m * a + f, 2);
      return {
        prompt: `A learner pushes a ${m} kg crate with a force of ${fmt(Fa)} N. Friction of ${f} N opposes the motion. What is the crate's acceleration?`,
        input: { kind: 'numeric', unit: 'm/s²' },
        answer: num(a),
        answerDisplay: `${fmt(a)} m/s²`,
        hints: ['Acceleration depends on the **net** force.', `Net force = applied force − friction.`],
        solution: [`$F_{\\text{net}} = ${fmt(Fa)} - ${f} = ${fmt(Fa - f)}$ N.`, `$a = \\dfrac{F_{\\text{net}}}{m} = \\dfrac{${fmt(Fa - f)}}{${m}} = ${fmt(a)}$ m/s².`],
        misconceptions: keepNum(
          [
            { code: 'net-force', answer: num(Fa / m), feedback: 'You used the applied force. Friction opposes it, so subtract friction first.' },
            { code: 'net-force', answer: num((Fa + f) / m), feedback: 'Friction acts against the push, so subtract it. Don\'t add it.' },
          ],
          a,
        ),
      };
    }
    const f = rng.pick([10, 20, 25, 40]);
    const Fa = round(m * a + f, 2);
    return {
      prompt: `What applied force is needed to accelerate a ${m} kg cart at ${fmt(a)} m/s² if friction of ${f} N acts on it?`,
      input: { kind: 'numeric', unit: 'N' },
      answer: num(Fa),
      answerDisplay: `${fmt(Fa)} N`,
      hints: ['First find the net force needed: $F_{\\text{net}} = ma$.', 'The applied force must provide that net force **and** overcome friction.'],
      solution: [`$F_{\\text{net}} = ma = ${m} \\times ${fmt(a)} = ${fmt(m * a)}$ N.`, `$F_{\\text{applied}} = F_{\\text{net}} + f = ${fmt(m * a)} + ${f} = ${fmt(Fa)}$ N.`],
      misconceptions: keepNum(
        [
          { code: 'net-force', answer: num(m * a), feedback: 'That is the net force. The push must also overcome friction.' },
          { code: 'net-force', answer: num(m * a - f), feedback: 'Friction works against the push, so the push must be bigger. Add friction.' },
        ],
        Fa,
      ),
    };
  },
};

// ---------------------------------------------------------------------------
export const projectileMotion: QuestionTemplate = {
  id: 'projectile-motion',
  skillId: 'projectile-motion',
  generate(rng, level) {
    const note = 'Ignore air resistance and use $g = 9.8$ m/s².';
    if (level === 1) {
      const t = rng.int(2, 16) / 4;
      const v = round(G * t, 2);
      const thing = rng.pick(['A stone is dropped from rest off a bridge', 'A coin falls from rest from the top of a tall building', 'An apple falls from rest from a high branch']);
      return {
        prompt: `${thing}. How fast is it falling after ${fmt(t)} s? ${note}`,
        input: { kind: 'numeric', unit: 'm/s' },
        answer: num(v),
        answerDisplay: `${fmt(v)} m/s`,
        hints: ['Starting from rest, $v = u + gt$ with $u = 0$.'],
        solution: [`$v = gt = 9.8 \\times ${fmt(t)} = ${fmt(v)}$ m/s.`],
        misconceptions: keepNum([{ code: 'formula-rearranged-wrongly', answer: num(G / t), feedback: 'Velocity after falling is $g \\times t$, not $g \\div t$.' }], v),
      };
    }
    if (level === 2) {
      const h = rng.int(1, 20) * 5;
      const t = round(Math.sqrt((2 * h) / G), 2);
      return {
        prompt: `A ball is dropped from rest from a height of ${h} m. How long does it take to hit the ground? ${note}`,
        input: { kind: 'numeric', unit: 's' },
        answer: num(t, 0.02),
        answerDisplay: `${fmt(t, 2)} s`,
        hints: ['Use $\\Delta y = \\tfrac{1}{2} g t^2$ (it starts from rest).', 'Make $t$ the subject: $t = \\sqrt{\\dfrac{2\\Delta y}{g}}$.'],
        solution: [`$${h} = \\tfrac{1}{2}(9.8)t^2$.`, `$t^2 = \\dfrac{2 \\times ${h}}{9.8} = ${fmt((2 * h) / G, 3)}$.`, `$t = ${fmt(t, 2)}$ s.`],
        misconceptions: keepNum([{ code: 'formula-rearranged-wrongly', answer: num((2 * h) / G), feedback: 'That is $t^2$. Take the square root to get $t$.' }], t),
      };
    }
    const v0 = rng.int(8, 50) / 2;
    if (level === 3) {
      const t = round(v0 / G, 2);
      return {
        prompt: `A ball is thrown straight up at ${fmt(v0)} m/s. How long does it take to reach its highest point? ${note}`,
        input: { kind: 'numeric', unit: 's' },
        answer: num(t, 0.02),
        answerDisplay: `${fmt(t, 2)} s`,
        hints: ['At the highest point the velocity is momentarily zero.', 'Gravity reduces the speed by 9.8 m/s every second.'],
        solution: [`At the top, $v = 0$: $0 = ${fmt(v0)} - 9.8t$.`, `$t = \\dfrac{${fmt(v0)}}{9.8} = ${fmt(t, 2)}$ s.`],
        misconceptions: keepNum([{ code: 'time-to-top', answer: num((2 * v0) / G), feedback: 'That is the time for the whole flight, up **and** down. The question asks for the time to the top.' }], t),
      };
    }
    if (level === 4) {
      const h = round((v0 * v0) / (2 * G), 2);
      return {
        prompt: `A ball is thrown straight up at ${fmt(v0)} m/s. What maximum height does it reach above the launch point? ${note}`,
        input: { kind: 'numeric', unit: 'm' },
        answer: num(h, 0.02),
        answerDisplay: `${fmt(h, 2)} m`,
        hints: ['Use $v^2 = u^2 - 2g\\Delta y$ with $v = 0$ at the top.', '$\\Delta y = \\dfrac{u^2}{2g}$.'],
        solution: [`$0 = ${fmt(v0)}^2 - 2(9.8)\\Delta y$.`, `$\\Delta y = \\dfrac{${fmt(v0 * v0, 2)}}{19.6} = ${fmt(h, 2)}$ m.`],
        misconceptions: keepNum([{ code: 'formula-rearranged-wrongly', answer: num(v0 / (2 * G)), feedback: 'Remember to square the launch speed: $\\Delta y = \\dfrac{u^2}{2g}$.' }], h),
      };
    }
    const t = round((2 * v0) / G, 2);
    return {
      prompt: `A ball is kicked straight up at ${fmt(v0)} m/s and lands back at the same height. How long is it in the air? ${note}`,
      input: { kind: 'numeric', unit: 's' },
      answer: num(t, 0.02),
      answerDisplay: `${fmt(t, 2)} s`,
      hints: ['Find the time to the top first.', 'Without air resistance, the way down takes as long as the way up.'],
      solution: [`Time to top: $\\dfrac{${fmt(v0)}}{9.8} = ${fmt(v0 / G, 2)}$ s.`, `Total time: $2 \\times ${fmt(v0 / G, 2)} = ${fmt(t, 2)}$ s.`],
      misconceptions: keepNum([{ code: 'time-to-top', answer: num(v0 / G), feedback: 'That is only the time to the highest point. The ball also has to come back down.' }], t),
    };
  },
};

// ---------------------------------------------------------------------------
export const ohmsLaw: QuestionTemplate = {
  id: 'ohms-law',
  skillId: 'ohms-law',
  generate(rng, level) {
    if (level <= 3) {
      const R = rng.pick([2, 4, 5, 6, 10, 12, 15, 20, 25, 30]);
      const I = rng.pick([0.2, 0.25, 0.5, 0.75, 1, 1.5, 2, 3]);
      const V = round(I * R, 2);
      if (level === 1) {
        return {
          prompt: `A current of ${fmt(I)} A flows through a ${R} Ω resistor. What is the potential difference across it?`,
          figure: { kind: 'circuit', voltage: null, resistors: [R], current: I },
          input: { kind: 'numeric', unit: 'V' },
          answer: num(V),
          answerDisplay: `${fmt(V)} V`,
          hints: ['Use $V = IR$.'],
          solution: [`$V = IR = ${fmt(I)} \\times ${R} = ${fmt(V)}$ V.`],
          misconceptions: keepNum([{ code: 'formula-rearranged-wrongly', answer: num(R / I), feedback: '$V = I \\times R$. You divided.' }], V),
        };
      }
      if (level === 2) {
        return {
          prompt: `A ${fmt(V)} V battery is connected across a ${R} Ω resistor. What current flows?`,
          figure: { kind: 'circuit', voltage: V, resistors: [R], current: null },
          input: { kind: 'numeric', unit: 'A' },
          answer: num(I),
          answerDisplay: `${fmt(I)} A`,
          hints: ['Rearrange $V = IR$ to make $I$ the subject.', '$I = \\dfrac{V}{R}$.'],
          solution: [`$I = \\dfrac{V}{R} = \\dfrac{${fmt(V)}}{${R}} = ${fmt(I)}$ A.`],
          misconceptions: keepNum(
            [
              { code: 'formula-rearranged-wrongly', answer: num(V * R), feedback: 'Current = voltage ÷ resistance. You multiplied.' },
              { code: 'formula-rearranged-wrongly', answer: num(R / V), feedback: 'Upside down: $I = \\dfrac{V}{R}$, not $\\dfrac{R}{V}$.' },
            ],
            I,
          ),
        };
      }
      return {
        prompt: `A ${fmt(V)} V supply drives a current of ${fmt(I)} A through a resistor. What is the resistance?`,
        figure: { kind: 'circuit', voltage: V, resistors: [null], current: I },
        input: { kind: 'numeric', unit: 'Ω' },
        answer: num(R),
        answerDisplay: `${R} Ω`,
        hints: ['Rearrange $V = IR$ to make $R$ the subject.'],
        solution: [`$R = \\dfrac{V}{I} = \\dfrac{${fmt(V)}}{${fmt(I)}} = ${R}$ Ω.`],
        misconceptions: keepNum([{ code: 'formula-rearranged-wrongly', answer: num(V * I), feedback: '$R = V \\div I$. You multiplied.' }], R),
      };
    }
    const R1 = rng.pick([2, 3, 4, 5, 6, 8, 10]);
    const R2 = rng.pick([4, 6, 10, 12, 15, 20]);
    const I = rng.pick([0.5, 1, 1.5, 2]);
    const V = round(I * (R1 + R2), 2);
    if (level === 4) {
      const parallel = (R1 * R2) / (R1 + R2);
      return {
        prompt: `A ${fmt(V)} V battery is connected to a ${R1} Ω resistor and a ${R2} Ω resistor in series. What current flows?`,
        figure: { kind: 'circuit', voltage: V, resistors: [R1, R2], current: null },
        input: { kind: 'numeric', unit: 'A' },
        answer: num(I),
        answerDisplay: `${fmt(I)} A`,
        hints: ['In series, resistances add.', `Total resistance: $${R1} + ${R2}$. Then use $I = \\dfrac{V}{R}$.`],
        solution: [`$R_{\\text{total}} = ${R1} + ${R2} = ${R1 + R2}$ Ω.`, `$I = \\dfrac{${fmt(V)}}{${R1 + R2}} = ${fmt(I)}$ A.`],
        misconceptions: keepNum(
          [
            { code: 'series-resistance', answer: num(V / R1), feedback: `You used only the ${R1} Ω resistor. In series, the current passes through both, so add them.` },
            { code: 'series-resistance', answer: num(V / parallel), feedback: 'That uses the parallel formula. For series, simply add the resistances.' },
          ],
          I,
        ),
      };
    }
    const V1 = round(I * R1, 2);
    return {
      prompt: `A ${fmt(V)} V battery drives current through a ${R1} Ω and a ${R2} Ω resistor in series. What is the potential difference across the ${R1} Ω resistor?`,
      figure: { kind: 'circuit', voltage: V, resistors: [R1, R2], current: null },
      input: { kind: 'numeric', unit: 'V' },
      answer: num(V1),
      answerDisplay: `${fmt(V1)} V`,
      hints: ['First find the current: it is the same everywhere in a series circuit.', `Then use $V = IR$ for the ${R1} Ω resistor only.`],
      solution: [`$I = \\dfrac{${fmt(V)}}{${R1} + ${R2}} = ${fmt(I)}$ A.`, `$V_1 = IR_1 = ${fmt(I)} \\times ${R1} = ${fmt(V1)}$ V.`],
      misconceptions: keepNum(
        [
          { code: 'series-resistance', answer: num(V), feedback: 'That is the battery voltage. It is shared between the two resistors.' },
          { code: 'series-resistance', answer: num(V / 2), feedback: 'The voltage is shared in proportion to the resistance, not equally.' },
        ],
        V1,
      ),
    };
  },
};
