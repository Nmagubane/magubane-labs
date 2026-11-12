import type { Lesson } from './types.ts';

/**
 * Analytical geometry, Grades 10–12 (CAPS Paper 2). Each formula is found on the grid before it is written down:
 * distance is Pythagoras, the midpoint is an average, and a tangent is perpendicular to a radius.
 */
export const ANALYTIC_LESSONS: Lesson[] = [
  {
    id: 'coordinate-geometry',
    skillId: 'coordinate-geometry',
    title: 'Distance, midpoint and gradient',
    minutes: 11,
    blocks: [
      {
        kind: 'predict',
        prompt: 'A is at (1; 1) and B is at (4; 5). How long is AB?',
        options: ['7 units (3 across plus 4 up)', '5 units', '25 units'],
        answer: 1,
        explanation: 'Across 3 and up 4 make a right-angled triangle. AB is the hypotenuse: $\\sqrt{3^2 + 4^2} = \\sqrt{25} = 5$.',
      },
      {
        kind: 'widget',
        title: 'Distance and midpoint lab',
        task: 'Drag A and B. Watch the dashed sides, the length AB and the midpoint M. What do you do to the coordinates of A and B to get M?',
        widget: { type: 'coord-lab', mode: 'points' },
      },
      { kind: 'key-idea', body: 'For $A(x_1;\\, y_1)$ and $B(x_2;\\, y_2)$: **distance** $AB = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$ (Pythagoras), **midpoint** $M\\left(\\dfrac{x_1 + x_2}{2};\\, \\dfrac{y_1 + y_2}{2}\\right)$ (the average), **gradient** $m = \\dfrac{y_2 - y_1}{x_2 - x_1}$. Parallel lines have equal gradients; perpendicular gradients multiply to $-1$; collinear points give the same gradient from any pair.' },
      { kind: 'trap', wrong: 'The midpoint of A(2; 1) and B(8; 5) is (3; 2), half of the difference.', why: 'Half the difference is how far M is **from A**. The midpoint itself is the average: $\\left(\\tfrac{2 + 8}{2};\\, \\tfrac{1 + 5}{2}\\right) = (5;\\, 3)$.' },
      { kind: 'example', level: 3 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 2 },
    ],
  },
  {
    id: 'line-equations',
    skillId: 'line-equations',
    title: 'Equations of lines and inclination',
    minutes: 12,
    blocks: [
      {
        kind: 'predict',
        prompt: 'A line has gradient 2. What is the gradient of a line perpendicular to it?',
        options: ['2', '−2', '−½', '½'],
        answer: 2,
        explanation: 'Perpendicular gradients multiply to $-1$: $2 \\times (-\\tfrac{1}{2}) = -1$. Flip the fraction and change the sign.',
      },
      {
        kind: 'widget',
        title: 'Parallel and perpendicular lines',
        task: 'Drag A and B to turn the black line. Switch the blue line between parallel and perpendicular, and watch the gradients and the angle θ.',
        widget: { type: 'coord-lab', mode: 'lines' },
      },
      { kind: 'key-idea', body: 'To find the equation of a line, you need its **gradient** and **one point**. Write $y = mx + c$, put in $m$, then substitute the point to find $c$. Parallel: $m_1 = m_2$. Perpendicular: $m_1 \\times m_2 = -1$. The **angle of inclination** $\\theta$ is measured anticlockwise from the positive $x$-axis, with $\\tan\\theta = m$ and $0^\\circ \\le \\theta < 180^\\circ$.' },
      { kind: 'trap', wrong: 'm = −1, so θ = tan⁻¹(−1) = −45°.', why: 'An inclination is between $0^\\circ$ and $180^\\circ$. A negative gradient means the line slopes down, so $\\theta$ is obtuse: $-45^\\circ + 180^\\circ = 135^\\circ$.' },
      { kind: 'example', level: 3 },
      { kind: 'check', level: 2 },
      { kind: 'check', level: 4 },
    ],
  },
  {
    id: 'circle-equations',
    skillId: 'circle-equations',
    title: 'Circles and tangents',
    minutes: 13,
    blocks: [
      {
        kind: 'predict',
        prompt: 'Every point P on a circle is the same distance r from the centre C(a; b). Which equation says that?',
        options: ['$(x + a)^2 + (y + b)^2 = r$', '$(x - a)^2 + (y - b)^2 = r^2$', '$x^2 + y^2 = r$'],
        answer: 1,
        explanation: 'The distance formula from $C(a;\\, b)$ to $P(x;\\, y)$, squared: $(x - a)^2 + (y - b)^2 = r^2$.',
      },
      {
        kind: 'widget',
        title: 'Circle and tangent lab',
        task: 'Drag the centre C and change the radius. Watch the equation. Then move P round the circle and compare the gradient of the radius with the gradient of the tangent.',
        widget: { type: 'coord-lab', mode: 'circle' },
      },
      { kind: 'key-idea', body: 'A circle with centre $(a;\\, b)$ and radius $r$ is $(x - a)^2 + (y - b)^2 = r^2$. If the equation is expanded, **complete the square** for $x$ and for $y$ to find the centre and radius. The **tangent** at $P$ is perpendicular to the radius $CP$: find $m_{CP}$, take the negative reciprocal, and substitute $P$.' },
      { kind: 'trap', wrong: '$(x + 3)^2 + (y - 2)^2 = 16$ has centre $(3;\\, -2)$ and radius 16.', why: 'The signs flip: the centre is $(-3;\\, 2)$. And the right-hand side is $r^2$, so $r = 4$.' },
      { kind: 'example', level: 4 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 3 },
    ],
  },
];
