import type { Lesson } from './types.ts';

/**
 * Euclidean geometry, Grades 10–12 (CAPS Paper 2). Investigate first, state the theorem, then practise
 * statements with reasons, because that is how geometry is marked.
 */
export const GEOMETRY_LESSONS: Lesson[] = [
  {
    id: 'quadrilaterals',
    skillId: 'quadrilaterals',
    title: 'Special quadrilaterals',
    minutes: 11,
    blocks: [
      {
        kind: 'predict',
        prompt: 'Every square is a rectangle. Is every rectangle a parallelogram?',
        options: ['Yes', 'No: a rectangle has right angles, a parallelogram does not', 'Only if its sides are equal'],
        answer: 0,
        explanation: 'A rectangle has two pairs of parallel sides, so it **is** a parallelogram, with extra properties: right angles and equal diagonals.',
      },
      {
        kind: 'widget',
        title: 'Quadrilateral explorer',
        task: 'Switch between the shapes and change the angle. Which properties stay true for every parallelogram? Which only appear for the rectangle, rhombus or square?',
        widget: { type: 'quad-lab' },
      },
      { kind: 'key-idea', body: 'In a **parallelogram**, opposite sides are equal and parallel, opposite angles are equal, and the diagonals bisect each other. A **rectangle** adds equal diagonals; a **rhombus** adds perpendicular diagonals that bisect its angles; a **square** has all of these. Every statement in geometry needs its **reason**, for example: $\\hat{A} = \\hat{C}$ (opp ∠s of ∥m).' },
      { kind: 'trap', wrong: 'The diagonals of any parallelogram are equal.', why: 'Only in a **rectangle** (and square). In a general parallelogram the diagonals bisect each other but have different lengths.' },
      { kind: 'example', level: 2 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 3 },
    ],
  },
  {
    id: 'midpoint-theorem',
    skillId: 'midpoint-theorem',
    title: 'The midpoint theorem',
    minutes: 10,
    blocks: [
      {
        kind: 'predict',
        prompt: 'Join the midpoints of two sides of any triangle. How does that line compare with the third side?',
        options: ['It depends on the triangle', 'It is parallel to it and half as long', 'It is the same length'],
        answer: 1,
        explanation: 'For **every** triangle, the line joining two midpoints is parallel to the third side and exactly half its length.',
      },
      {
        kind: 'widget',
        title: 'Midpoint investigation',
        task: 'Move the top vertex and stretch the base. Watch DE and BC. Does DE ever stop being half of BC, or stop being parallel to it?',
        widget: { type: 'midpoint-lab' },
      },
      { kind: 'key-idea', body: '**Midpoint theorem:** if D and E are the midpoints of AB and AC, then $DE \\parallel BC$ and $DE = \\tfrac{1}{2}BC$ (midpt theorem). **Converse:** a line through the midpoint of one side, parallel to a second side, bisects the third side (line through midpt ∥ 2nd side).' },
      { kind: 'trap', wrong: 'DE is half of BC, so angle ADE is half of angle ABC.', why: 'The theorem halves the **length**. DE ∥ BC, so angle ADE **equals** angle ABC (corresp ∠s).' },
      { kind: 'example', level: 4 },
      { kind: 'check', level: 2 },
      { kind: 'check', level: 3 },
    ],
  },
  {
    id: 'circle-theorems',
    skillId: 'circle-theorems',
    title: 'Circle theorems: centre, chords and segments',
    minutes: 12,
    blocks: [
      {
        kind: 'predict',
        prompt: 'A and B are fixed on a circle. C moves around the big arc. What happens to angle ACB?',
        options: ['It gets bigger as C gets closer to A', 'It stays exactly the same', 'It is always 90°'],
        answer: 1,
        explanation: 'Every angle on the same arc, on the same side of AB, is **equal**: half of the angle AOB at the centre.',
      },
      {
        kind: 'widget',
        title: 'Circle theorem lab',
        task: 'Move C around the circle and change the arc AB. Compare angle ACB with angle AOB. Then make AB a diameter: what happens to angle ACB?',
        widget: { type: 'circle-lab', mode: 'centre' },
      },
      { kind: 'key-idea', body: '1. A line from the centre ⊥ to a chord bisects it. 2. The ⊥ bisector of a chord passes through the centre. 3. The angle at the centre is **double** the angle at the circumference on the same arc. 4. Angles in the **same segment** are equal. When AB is a diameter, the centre angle is $180^\\circ$, so the angle in a semicircle is $90^\\circ$.' },
      { kind: 'trap', wrong: '$\\angle AOB = 80^\\circ$, so $\\angle ACB = 160^\\circ$.', why: 'The angle at the **centre** is the bigger one. The angle at the circumference is half: $40^\\circ$.' },
      { kind: 'example', level: 4 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 5 },
    ],
  },
  {
    id: 'cyclic-tangents',
    skillId: 'cyclic-tangents',
    title: 'Cyclic quadrilaterals and tangents',
    minutes: 12,
    blocks: [
      {
        kind: 'predict',
        prompt: 'ABCD has all four corners on a circle, and angle A is 70°. What is angle C?',
        options: ['70°', '110°', '140°'],
        answer: 1,
        explanation: 'A and C stand on arcs that together make the whole circle, so they add up to $180^\\circ$: $C = 110^\\circ$.',
      },
      {
        kind: 'widget',
        title: 'Circle theorem lab',
        task: 'Move the corners of the cyclic quadrilateral and watch opposite angles. Then switch to the tangent: compare the tangent–chord angle with the angle in the other segment.',
        widget: { type: 'circle-lab', mode: 'cyclic' },
      },
      { kind: 'key-idea', body: '5. Opposite angles of a **cyclic quadrilateral** add up to $180^\\circ$ (opp ∠s of cyclic quad); its exterior angle equals the interior opposite angle (ext ∠ of cyclic quad). A **tangent** is ⊥ to the radius. 6. Two tangents from the same point are equal (tans from common pt). 7. The angle between a tangent and a chord equals the angle in the **alternate segment** (tan chord theorem).' },
      { kind: 'trap', wrong: 'ABCD is a cyclic quad, so $\\hat{A} = \\hat{C}$.', why: 'That is a parallelogram rule. In a cyclic quad, opposite angles are **supplementary**: $\\hat{A} + \\hat{C} = 180^\\circ$.' },
      { kind: 'example', level: 3 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 4 },
    ],
  },
  {
    id: 'proportionality',
    skillId: 'proportionality',
    title: 'Proportionality and similar triangles',
    minutes: 12,
    blocks: [
      {
        kind: 'predict',
        prompt: 'DE ∥ BC, and D is one third of the way from A to B. Where is E on AC?',
        options: ['Halfway', 'One third of the way from A to C', 'You need to measure'],
        answer: 1,
        explanation: 'A line parallel to one side divides the other two sides in the **same ratio**, so E is one third of the way along AC too.',
      },
      {
        kind: 'widget',
        title: 'Parallel line lab',
        task: 'Slide DE up and down, keeping it parallel to BC. Compare AD : DB with AE : EC, and DE : BC with AD : AB.',
        widget: { type: 'proportion-lab' },
      },
      { kind: 'key-idea', body: 'A line parallel to one side of a triangle divides the other two sides proportionally: $\\frac{AD}{DB} = \\frac{AE}{EC}$ (line ∥ one side of Δ). The midpoint theorem is the special case $1 : 1$. **Equiangular** triangles are similar (∠∠∠), and similar triangles have corresponding sides in the same ratio (|||Δs). Write similar triangles with matching vertices in the same order.' },
      { kind: 'trap', wrong: '$\\triangle ABC ||| \\triangle DEF$, so $\\frac{AB}{DF} = \\frac{BC}{DE}$.', why: 'Match vertices in order: A ↔ D, B ↔ E, C ↔ F. So $\\frac{AB}{DE} = \\frac{BC}{EF} = \\frac{AC}{DF}$.' },
      { kind: 'example', level: 3 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 4 },
    ],
  },
];
