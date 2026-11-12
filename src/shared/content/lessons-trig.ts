import type { Lesson } from './types.ts';

/**
 * Trigonometry, Grades 10–12 (CAPS Paper 2). The unit-circle picture carries most of it: ratios as x, y and r,
 * CAST from the signs of x and y, reduction as "same size, sign from the quadrant", equations as "every angle
 * with that value".
 */
export const TRIG_LESSONS: Lesson[] = [
  {
    id: 'trig-special',
    skillId: 'trig-special',
    title: 'Special angles and the Cartesian plane',
    minutes: 12,
    blocks: [
      {
        kind: 'predict',
        prompt: 'P(−3; 4) is on the terminal arm of θ. Is sin θ positive or negative?',
        options: ['Positive', 'Negative', 'You cannot tell without a calculator'],
        answer: 0,
        explanation: '$\\sin\\theta = \\dfrac{y}{r} = \\dfrac{4}{5}$. y is positive and r is always positive, so sin θ is positive (θ is in the second quadrant).',
      },
      {
        kind: 'widget',
        title: 'Ratios on the Cartesian plane',
        task: 'Turn the arm through all four quadrants. Watch the signs of x and y, and which CAST letter lights up. Stop at 30°, 150°, 210° and 330°: what stays the same?',
        widget: { type: 'trig-lab', mode: 'circle' },
      },
      { kind: 'key-idea', body: 'For a point $P(x;\\, y)$ on the terminal arm: $\\sin\\theta = \\dfrac{y}{r}$, $\\cos\\theta = \\dfrac{x}{r}$, $\\tan\\theta = \\dfrac{y}{x}$, with $r = \\sqrt{x^2 + y^2} > 0$. **Special angles** come from two triangles: $\\sin 30^\\circ = \\cos 60^\\circ = \\tfrac{1}{2}$, $\\sin 60^\\circ = \\cos 30^\\circ = \\tfrac{\\sqrt{3}}{2}$, $\\tan 45^\\circ = 1$, $\\sin 45^\\circ = \\cos 45^\\circ = \\tfrac{\\sqrt{2}}{2}$.' },
      { kind: 'trap', wrong: '$\\sin^2 60^\\circ = \\sin 3600^\\circ$, or $2\\sin 60^\\circ$.', why: '$\\sin^2 60^\\circ$ means $(\\sin 60^\\circ)^2 = \\left(\\tfrac{\\sqrt{3}}{2}\\right)^2 = \\tfrac{3}{4}$.' },
      { kind: 'example', level: 3 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 2 },
    ],
  },
  {
    id: 'trig-reduction',
    skillId: 'trig-reduction',
    title: 'Reduction formulas and identities',
    minutes: 13,
    blocks: [
      {
        kind: 'predict',
        prompt: 'sin 30° = ½. What is sin 210°?',
        options: ['½', '−½', '210 ÷ 30 × ½'],
        answer: 1,
        explanation: '210° is in the third quadrant with a reference angle of 30°. Only tan is positive there, so $\\sin 210^\\circ = -\\sin 30^\\circ = -\\tfrac{1}{2}$.',
      },
      {
        kind: 'widget',
        title: 'Same size, sign from the quadrant',
        task: 'Set θ to 40°, then 140°, 220° and 320°. Compare the sizes of sin and cos each time. Only the signs change, following CAST.',
        widget: { type: 'trig-lab', mode: 'circle' },
      },
      { kind: 'key-idea', body: '**Reduction:** for $180^\\circ \\pm x$, $360^\\circ \\pm x$ and $-x$, keep the function and take the sign from CAST: $\\sin(180^\\circ - x) = \\sin x$, $\\cos(180^\\circ + x) = -\\cos x$, $\\tan(360^\\circ - x) = -\\tan x$. For $90^\\circ \\pm x$ the function **changes**: $\\sin(90^\\circ - x) = \\cos x$, $\\cos(90^\\circ + x) = -\\sin x$. **Identities:** $\\tan x = \\dfrac{\\sin x}{\\cos x}$ and $\\sin^2 x + \\cos^2 x = 1$.' },
      { kind: 'trap', wrong: '$\\cos(180^\\circ - x) = \\cos x$, because $180^\\circ - x$ is just like $x$.', why: '$180^\\circ - x$ is in the second quadrant, where cos is negative: $\\cos(180^\\circ - x) = -\\cos x$.' },
      { kind: 'example', level: 3 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 4 },
    ],
  },
  {
    id: 'trig-equations',
    skillId: 'trig-equations',
    title: 'Solving trigonometric equations',
    minutes: 13,
    blocks: [
      {
        kind: 'predict',
        prompt: 'How many angles between 0° and 360° have sin x = ½?',
        options: ['One: 30°', 'Two: 30° and 150°', 'Four'],
        answer: 1,
        explanation: 'sin is positive in the first and second quadrants, so $x = 30^\\circ$ or $x = 180^\\circ - 30^\\circ = 150^\\circ$.',
      },
      {
        kind: 'widget',
        title: 'Find every angle',
        task: 'Look for every angle between 0° and 360° where sin θ = 0,5. Then try cos θ = −0,5. Which quadrants do you land in each time?',
        widget: { type: 'trig-lab', mode: 'circle' },
      },
      { kind: 'key-idea', body: '1. Get the trig function on its own. 2. Find the **reference angle** from the positive value. 3. Use CAST to place the solutions: $\\sin$: $x$ and $180^\\circ - x$; $\\cos$: $x$ and $360^\\circ - x$; $\\tan$: $x$ and $180^\\circ + x$. **General solution:** add $k \\cdot 360^\\circ$ (sin, cos) or $k \\cdot 180^\\circ$ (tan), $k \\in \\mathbb{Z}$. If the angle is $2x$ or $x + 20^\\circ$, solve for that whole angle first.' },
      { kind: 'trap', wrong: '$\\cos x = -0{,}5$, so $x = \\cos^{-1}(-0{,}5) = 120^\\circ$, and that is the answer.', why: 'The calculator gives one angle. cos is negative in the second **and** third quadrants: $x = 120^\\circ$ or $x = 240^\\circ$.' },
      { kind: 'example', level: 2 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 4 },
    ],
  },
  {
    id: 'triangle-rules',
    skillId: 'triangle-rules',
    title: 'Sine, cosine and area rules',
    minutes: 13,
    blocks: [
      {
        kind: 'predict',
        prompt: 'You know two sides of a triangle and the angle between them. Which rule finds the third side?',
        options: ['Sine rule', 'Cosine rule', 'Pythagoras'],
        answer: 1,
        explanation: 'The sine rule needs a side with its opposite angle. Two sides and the included angle is the cosine rule: $a^2 = b^2 + c^2 - 2bc\\cos A$.',
      },
      {
        kind: 'widget',
        title: 'Triangle lab',
        task: 'Change the sides and the angle. Watch the three ratios side ÷ sin(opposite angle). Then set A to 90°: what does the cosine rule turn into?',
        widget: { type: 'trig-lab', mode: 'triangle' },
      },
      { kind: 'key-idea', body: '**Sine rule** (a side and its opposite angle known): $\\dfrac{a}{\\sin A} = \\dfrac{b}{\\sin B} = \\dfrac{c}{\\sin C}$. **Cosine rule** (two sides and the included angle, or three sides): $a^2 = b^2 + c^2 - 2bc\\cos A$. **Area rule**: Area $= \\tfrac{1}{2}bc\\sin A$, two sides and the angle between them.' },
      { kind: 'trap', wrong: 'Area $= bc\\sin A$.', why: 'There is a half: Area $= \\tfrac{1}{2}bc\\sin A$. With $A = 90^\\circ$ it becomes $\\tfrac{1}{2} \\times$ base $\\times$ height.' },
      { kind: 'example', level: 4 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 2 },
    ],
  },
  {
    id: 'compound-angles',
    skillId: 'compound-angles',
    title: 'Compound and double angles',
    minutes: 13,
    blocks: [
      {
        kind: 'predict',
        prompt: 'Is sin(30° + 60°) equal to sin 30° + sin 60°?',
        options: ['Yes', 'No'],
        answer: 1,
        explanation: '$\\sin 90^\\circ = 1$, but $\\sin 30^\\circ + \\sin 60^\\circ = \\tfrac{1}{2} + \\tfrac{\\sqrt{3}}{2} \\approx 1{,}37$. You cannot share sin over a sum: use the compound-angle formula.',
      },
      { kind: 'key-idea', body: '$\\sin(A \\pm B) = \\sin A\\cos B \\pm \\cos A\\sin B$ and $\\cos(A \\pm B) = \\cos A\\cos B \\mp \\sin A\\sin B$ (the sign flips for cos). With $B = A$: $\\sin 2A = 2\\sin A\\cos A$ and $\\cos 2A = \\cos^2 A - \\sin^2 A = 1 - 2\\sin^2 A = 2\\cos^2 A - 1$.' },
      { kind: 'trap', wrong: '$\\sin 2A = 2\\sin A$.', why: 'Doubling the angle does not double the sine: $\\sin 2A = 2\\sin A\\cos A$. Check with $A = 90^\\circ$: $\\sin 180^\\circ = 0$, not 2.' },
      { kind: 'example', level: 3 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 2 },
    ],
  },
  {
    id: 'trig-2d-3d',
    skillId: 'trig-2d-3d',
    title: 'Problems in 2D and 3D',
    minutes: 14,
    blocks: [
      {
        kind: 'predict',
        prompt: 'A vertical tower PQ stands at Q on flat ground. R is on the ground. Which angle in triangle PQR is 90°?',
        options: ['The angle at P', 'The angle at Q', 'The angle at R'],
        answer: 1,
        explanation: 'The tower is vertical and the ground is horizontal, so they meet at a right angle at the foot, Q. That right angle is the key to every 3D tower problem.',
      },
      {
        kind: 'widget',
        title: 'Triangle lab',
        task: 'Every 2D or 3D problem is two triangles that share a side. Practise moving between the rules: which one would you use if you knew two sides and the angle between them? Two angles and a side?',
        widget: { type: 'trig-lab', mode: 'triangle' },
      },
      { kind: 'key-idea', body: '1. Find the triangle you can **solve now** (you know enough sides and angles). 2. Use it to find the **shared side**. 3. Move to the second triangle. In 3D, the vertical triangle has a right angle at the foot: use $\tan$ for the angle of elevation. The horizontal triangle on the ground usually needs the sine, cosine or area rule.' },
      { kind: 'trap', wrong: 'The angle of elevation is at the top of the tower.', why: 'An angle of elevation is measured **up from the horizontal** at the observer, so it is at R (or S), between the ground and the line of sight.' },
      { kind: 'example', level: 3 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 4 },
    ],
  },
];
