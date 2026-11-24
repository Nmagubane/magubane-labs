/** Grade 10 measurement: surface area and volume of solids. */
import type { Lesson } from './types.ts';

export const MEASUREMENT_LESSONS: Lesson[] = [
  {
    id: 'pythagoras',
    skillId: 'pythagoras',
    title: 'The Theorem of Pythagoras',
    minutes: 12,
    blocks: [
      {
        kind: 'predict',
        prompt: 'A right-angled triangle has shorter sides of 3 cm and 4 cm. How long is the longest side?',
        options: ['$5$ cm', '$7$ cm', '$12$ cm'],
        answer: 0,
        explanation: 'It is $5$ cm, not $3 + 4 = 7$. The lengths don\'t add, but the squares on them do: $3^2 + 4^2 = 9 + 16 = 25 = 5^2$.',
      },
      {
        kind: 'widget',
        title: 'Squares on the sides',
        task: 'Keep the angle at 90° and try different sides. Compare $a^2 + b^2$ with $c^2$. Then make the angle bigger or smaller than 90°.',
        widget: { type: 'pythagoras-lab' },
      },
      {
        kind: 'key-idea',
        body: 'In a right-angled triangle, the **hypotenuse** is the longest side, opposite the right angle, and $c^2 = a^2 + b^2$ (Pythagoras). To find the hypotenuse, add the squares; to find a shorter side, subtract: $a^2 = c^2 - b^2$. Take the square root at the end, and leave an answer that isn\'t a whole number in surd form, like $\\sqrt{41}$. **The other way round:** if the square of the longest side equals the sum of the squares of the other two, the triangle is right-angled, with the right angle opposite the longest side.',
      },
      { kind: 'trap', wrong: '$AC^2 = 13^2 + 5^2$, where $AC$ is a shorter side and $13$ is the hypotenuse.', why: 'The hypotenuse is the longest side, so a shorter side comes from subtracting: $AC^2 = 13^2 - 5^2 = 144$, $AC = 12$.' },
      { kind: 'example', level: 2 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 3 },
    ],
  },
  {
    id: 'surface-area-volume',
    skillId: 'surface-area-volume',
    title: 'Solids: how much they hold, how much covers them',
    minutes: 16,
    blocks: [
      {
        kind: 'predict',
        prompt: 'A cone and a cylinder have the same base and the same height. How many cones of water fill the cylinder?',
        options: ['2', '3', '4'],
        answer: 1,
        explanation: 'Exactly three, so a cone holds a third of its cylinder: $V = \\tfrac{1}{3}\\pi r^2 h$. A pyramid and the prism on the same base behave the same way.',
      },
      {
        kind: 'widget',
        title: 'Three cones',
        task: 'Pour cones of water into the cylinder until it is full.',
        widget: { type: 'measure-lab', mode: 'third' },
      },
      {
        kind: 'key-idea',
        body: '**Volume** of a prism or cylinder: area of the base × height ($\\pi r^2 h$ for a cylinder). A **cone** or **pyramid** holds a third of that. **Sphere**: $V = \\tfrac{4}{3}\\pi r^3$, $S = 4\\pi r^2$. **Surface area** adds the area of every face: a closed cylinder is $2\\pi r^2 + 2\\pi r h$; a cone is $\\pi r^2 + \\pi r s$, with $s$ the **slant height** ($s^2 = r^2 + h^2$); a pyramid is its base plus its triangles, each as high as the slant height. **Joined solids**: add the volumes; for the outside surface, leave out the circle where they join. Pyramid bases in Grade 10 are squares or equilateral triangles. Watch for a **diameter**: halve it first.',
      },
      {
        kind: 'widget',
        title: 'Scale it up',
        task: 'Set $k = 2$, then $k = 3$. By how much do the surface area and the volume grow? Does the shape of the box matter?',
        widget: { type: 'measure-lab', mode: 'scale' },
      },
      { kind: 'trap', wrong: 'The radius of a cylinder is doubled, so its volume doubles.', why: '$V = \\pi r^2 h$ has the radius twice: $\\pi (2r)^2 h = 4\\pi r^2 h$. The volume is multiplied by $4$. Doubling every length would multiply it by $8$.' },
      { kind: 'example', level: 5 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 2 },
      { kind: 'check', level: 3 },
      { kind: 'check', level: 4 },
    ],
  },
];
