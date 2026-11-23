import type { Lesson } from './types.ts';

/**
 * Space and shape (geometry), Grades 7–9 (CAPS Senior Phase). Investigate in a lab, state the rule with its reason,
 * then practise. CAPS asks for a reason with every written statement, so every key idea gives the reason's short form.
 */
export const SENIOR_GEOMETRY_LESSONS: Lesson[] = [
  {
    id: 'straight-line-angles',
    skillId: 'straight-line-angles',
    title: 'Angles on straight lines',
    minutes: 9,
    blocks: [
      {
        kind: 'predict',
        prompt: 'A ray from a point on a straight line splits the straight angle into two parts. One part is $65^\\circ$. What is the other?',
        options: ['$65^\\circ$', '$115^\\circ$', '$295^\\circ$'],
        answer: 1,
        explanation: 'The two parts make up the straight line, so they add up to $180^\\circ$: $180^\\circ - 65^\\circ = 115^\\circ$.',
      },
      {
        kind: 'widget',
        title: 'Angles on a line and round a point',
        task: 'Turn the ray OC and watch the two angles on the line. What do they always add up to? Then switch to **Round a point**: what do the three angles add up to?',
        widget: { type: 'angle-lab', mode: 'line' },
      },
      {
        kind: 'widget',
        title: 'Two lines crossing',
        task: 'Change the angle between the lines. Which pairs of angles stay equal, however you turn them?',
        widget: { type: 'angle-lab', mode: 'cross' },
      },
      {
        kind: 'key-idea',
        body: '**Angles on a straight line** add up to $180^\\circ$ (∠s on a str line). **Angles round a point** add up to $360^\\circ$ (∠s round a pt). Where two straight lines cross, **vertically opposite angles** are equal (vert opp ∠s). Write the reason in brackets after every statement, for example $x = 180^\\circ - 65^\\circ = 115^\\circ$ (∠s on a str line).',
      },
      { kind: 'trap', wrong: 'Three angles round a point: $x + 100^\\circ + 120^\\circ = 180^\\circ$.', why: 'Round a point is a full turn, $360^\\circ$. Only angles on one straight line add up to $180^\\circ$.' },
      { kind: 'example', level: 2 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 3 },
    ],
  },
  {
    id: 'parallel-lines',
    skillId: 'parallel-lines',
    title: 'Parallel lines and a transversal',
    minutes: 12,
    blocks: [
      {
        kind: 'predict',
        prompt: 'A straight line crosses two parallel lines. Look at the angle in the same position at each crossing. Are they equal?',
        options: ['Yes, always', 'Only if the line crosses at $90^\\circ$', 'Never'],
        answer: 0,
        explanation: 'The parallel lines run in the same direction, so the transversal cuts both at the same angle. Angles in the same position (corresponding angles) are always equal.',
      },
      {
        kind: 'widget',
        title: 'Parallel line lab',
        task: 'Choose a pair and turn the transversal: does the rule still hold? Then turn line CD so that it is no longer parallel to AB. What happens to the rule?',
        widget: { type: 'angle-lab', mode: 'parallel' },
      },
      {
        kind: 'key-idea',
        body: 'When a transversal crosses **parallel** lines: **corresponding** angles are equal (an F shape), **alternate** angles are equal (a Z shape), and **co-interior** angles add up to $180^\\circ$ (a U shape). Reasons: (corresp ∠s; AB ∥ CD), (alt ∠s; AB ∥ CD), (co-int ∠s; AB ∥ CD). The rules only work when the lines are parallel.',
      },
      { kind: 'trap', wrong: 'Co-interior angles are equal.', why: 'They add up to $180^\\circ$. They are equal only when both are $90^\\circ$.' },
      { kind: 'example', level: 2 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 4 },
    ],
  },
  {
    id: 'triangle-angles',
    skillId: 'triangle-angles',
    title: 'Angles in triangles',
    minutes: 11,
    blocks: [
      {
        kind: 'predict',
        prompt: 'Draw any triangle, tear off its three corners and put them side by side. What do they make?',
        options: ['A right angle', 'A straight line', 'A full turn'],
        answer: 1,
        explanation: 'The three corners always make a straight line, whatever the triangle: the angles of a triangle add up to $180^\\circ$.',
      },
      {
        kind: 'widget',
        title: 'Triangle lab',
        task: 'Change ∠A and ∠B and watch ∠C and the total. Then extend BC: compare the outside angle at C with ∠A + ∠B.',
        widget: { type: 'angle-lab', mode: 'triangle' },
      },
      {
        kind: 'key-idea',
        body: 'The angles of a triangle add up to $180^\\circ$ (∠s of Δ). In an **isosceles** triangle the angles opposite the equal sides are equal (∠s opp = sides), and the sides opposite equal angles are equal (sides opp = ∠s). Every angle of an **equilateral** triangle is $60^\\circ$. An **exterior angle** equals the sum of the two interior opposite angles (ext ∠ of Δ).',
      },
      { kind: 'trap', wrong: '$AB = AC$ and $\\hat{A} = 40^\\circ$, so $\\hat{B} = 180^\\circ - 40^\\circ = 140^\\circ$.', why: '$140^\\circ$ is $\\hat{B}$ and $\\hat{C}$ together. They are equal, so each is $70^\\circ$.' },
      { kind: 'example', level: 3 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 4 },
    ],
  },
  {
    id: 'quadrilateral-properties',
    skillId: 'quadrilateral-properties',
    title: 'Quadrilaterals: sides, angles and diagonals',
    minutes: 11,
    blocks: [
      {
        kind: 'predict',
        prompt: 'Is every square a rhombus?',
        options: ['Yes', 'No: a rhombus is slanted'],
        answer: 0,
        explanation: 'A rhombus is a parallelogram with four equal sides. A square has that, so it is a rhombus with right angles. A rhombus does not have to be slanted.',
      },
      {
        kind: 'widget',
        title: 'Quadrilateral explorer',
        task: 'Choose each shape in turn, including the kite and the trapezium, and change it. Which diagonal properties stay ✓ for each one?',
        widget: { type: 'quad-lab' },
      },
      {
        kind: 'key-idea',
        body: 'A **trapezium** has one pair of parallel sides; a **parallelogram** has two. A **rectangle** is a parallelogram with right angles, a **rhombus** is a parallelogram with four equal sides, and a **square** is both. A **kite** has two pairs of equal adjacent sides. Diagonals: a parallelogram\'s bisect each other; a rectangle\'s are also equal; a rhombus\'s are also perpendicular; a kite\'s are perpendicular and only one is bisected. The angles of every quadrilateral add up to $360^\\circ$ (∠s of quad).',
      },
      { kind: 'trap', wrong: 'The diagonals of a rhombus are equal.', why: 'They bisect each other at right angles, but they are equal only when the rhombus is a square.' },
      { kind: 'example', level: 4 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 2 },
    ],
  },
  {
    id: 'congruent-similar',
    skillId: 'congruent-similar',
    title: 'Congruent and similar triangles',
    minutes: 13,
    blocks: [
      {
        kind: 'predict',
        prompt: 'Two triangles have the same three angles. Must they be congruent?',
        options: ['Yes', 'No: they can be different sizes'],
        answer: 1,
        explanation: 'Equal angles fix the **shape**, not the size: the triangles are similar. Congruent triangles are the same shape **and** size.',
      },
      {
        kind: 'widget',
        title: 'Similar triangle lab',
        task: 'Multiply every side by $k$ and compare the angles of the two triangles. Then switch to **Add to every side**: do the angles stay the same?',
        widget: { type: 'similar-lab' },
      },
      {
        kind: 'key-idea',
        body: '**Congruent** triangles ($\\equiv$) are the same shape and size. The minimum conditions are S,S,S; S,A,S (the angle **between** the two sides); A,A,S; and R,H,S. **Similar** triangles ($|||$) have equal angles and sides in proportion: every side is multiplied by the same scale factor. The order of the letters matters: in $\\triangle ABC \\equiv \\triangle PQR$, A matches P, B matches Q and C matches R.',
      },
      { kind: 'trap', wrong: '$\\triangle ABC \\,|||\\, \\triangle DEF$ with $AB = 4$ and $DE = 6$, so $EF = BC + 2$.', why: 'Similar triangles **multiply**: $DE$ is $1{,}5$ times $AB$, so $EF$ is $1{,}5$ times $BC$. Adding the same length to every side changes the shape.' },
      { kind: 'example', level: 3 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 2 },
    ],
  },
];
