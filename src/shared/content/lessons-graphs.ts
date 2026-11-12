import type { Lesson } from './types.ts';

/** Functions and graphs, Grades 10–12 (CAPS Paper 1): one idea throughout: a, p and q do the same job on every graph. */
export const GRAPH_LESSONS: Lesson[] = [
  {
    id: 'graphs-basic',
    skillId: 'graphs-basic',
    title: 'Parabolas, hyperbolas and exponential graphs',
    minutes: 13,
    blocks: [
      {
        kind: 'predict',
        prompt: 'y = x² has its lowest point at (0; 0). Where is the lowest point of y = x² − 3?',
        options: ['(0; −3)', '(−3; 0)', '(3; 0)'],
        answer: 0,
        explanation: 'Subtracting 3 lowers every point by 3, so the turning point moves down to (0; −3). That is what q does on every graph.',
      },
      {
        kind: 'widget',
        title: 'Function lab',
        task: 'Pick each graph in turn. Change a and q (leave p at 0). What does q do to each graph? What does a negative a do?',
        widget: { type: 'function-lab', mode: 'algebraic' },
      },
      { kind: 'key-idea', body: '**Parabola** $y = ax^2 + q$: turning point $(0;\\, q)$; $a > 0$ opens up. **Hyperbola** $y = \\dfrac{a}{x} + q$: asymptotes $x = 0$ and $y = q$. **Exponential** $y = ab^x + q$: asymptote $y = q$; $b > 1$ increases, $0 < b < 1$ decreases. In all three, $q$ moves the graph up or down and the sign of $a$ flips it. $y$-intercept: put $x = 0$; $x$-intercept: put $y = 0$.' },
      { kind: 'trap', wrong: 'The range of $y = 2^x + 3$ is $y \\ge 3$.', why: 'The graph gets closer and closer to $y = 3$ but never reaches it, so the range is $y > 3$.' },
      { kind: 'example', level: 4 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 3 },
    ],
  },
  {
    id: 'graphs-shifted',
    skillId: 'graphs-shifted',
    title: 'Shifted graphs and average gradient',
    minutes: 13,
    blocks: [
      {
        kind: 'predict',
        prompt: 'Which way does y = (x − 2)² move compared with y = x²?',
        options: ['2 units to the left', '2 units to the right', '2 units up'],
        answer: 1,
        explanation: '$(x - 2)^2$ is 0 when $x = 2$, so the turning point is at $x = 2$: the graph moves **right**. A minus inside the bracket moves it right; a plus moves it left.',
      },
      {
        kind: 'widget',
        title: 'Function lab',
        task: 'Now change p. Watch the turning point and the vertical asymptote. Which way does p = 2 move the graph?',
        widget: { type: 'function-lab', mode: 'algebraic' },
      },
      { kind: 'key-idea', body: 'Replacing $x$ with $(x + p)$ moves any graph $p$ units **left**. So $y = a(x + p)^2 + q$ has turning point $(-p;\\, q)$; $y = \\dfrac{a}{x + p} + q$ has asymptotes $x = -p$ and $y = q$, and axes of symmetry $y = \\pm(x + p) + q$. The **average gradient** between two points on a curve is $\\dfrac{f(x_2) - f(x_1)}{x_2 - x_1}$. For $y = ax^2 + bx + c$, the turning point is at $x = -\\dfrac{b}{2a}$.' },
      { kind: 'trap', wrong: '$y = (x + 3)^2 - 1$ has its turning point at $(3;\\, -1)$.', why: '$(x + 3)^2$ is 0 when $x = -3$. The turning point is $(-3;\\, -1)$.' },
      { kind: 'example', level: 3 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 4 },
    ],
  },
  {
    id: 'trig-graphs',
    skillId: 'trig-graphs',
    title: 'Trigonometric graphs',
    minutes: 13,
    blocks: [
      {
        kind: 'predict',
        prompt: 'y = sin x repeats every 360°. How often does y = sin 2x repeat?',
        options: ['Every 720°', 'Every 180°', 'Every 360°'],
        answer: 1,
        explanation: 'The angle 2x goes round twice as fast, so the graph fits two waves into 360°: the period is $360^\\circ \\div 2 = 180^\\circ$.',
      },
      {
        kind: 'widget',
        title: 'Trig graph lab',
        task: 'Change a, k, p and q one at a time. Which one changes the height of the wave? Which one changes how many waves fit in 360°? Which way does p = 30° move it?',
        widget: { type: 'function-lab', mode: 'trig' },
      },
      { kind: 'key-idea', body: 'In $y = a\\sin k(x + p) + q$ (and the same for cos): $|a|$ is the **amplitude**; $q$ moves the graph up or down (the middle line is $y = q$, the maximum $q + |a|$); the **period** is $\\dfrac{360^\\circ}{k}$ (for tan, $\\dfrac{180^\\circ}{k}$); $p$ moves the graph $p$ to the **left**. At $x = 0$, sin starts on the middle line and cos at its maximum.' },
      { kind: 'trap', wrong: 'The maximum of $y = -2\\sin x + 1$ is at $x = 90^\\circ$.', why: 'A negative $a$ flips the graph. $-2\\sin x$ is largest where $\\sin x = -1$, at $x = 270^\\circ$ (maximum value $3$).' },
      { kind: 'example', level: 3 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 2 },
    ],
  },
  {
    id: 'inverse-log',
    skillId: 'inverse-log',
    title: 'Inverses and logarithms',
    minutes: 13,
    blocks: [
      {
        kind: 'predict',
        prompt: '2⁵ = 32. What is log₂ 32?',
        options: ['16', '5', '2'],
        answer: 1,
        explanation: 'A logarithm is a power: $\\log_2 32$ asks "2 to what power gives 32?". The answer is 5.',
      },
      { kind: 'key-idea', body: 'The **inverse** undoes a function: swap $x$ and $y$, then make $y$ the subject. Its graph is the reflection in $y = x$. The inverse of $y = b^x$ is $y = \\log_b x$, and $\\log_b x = n$ means $b^n = x$. **Log laws:** $\\log a + \\log b = \\log ab$; $\\log a - \\log b = \\log \\dfrac{a}{b}$; $n\\log a = \\log a^n$; $\\log_b b = 1$; $\\log_b 1 = 0$. To solve $b^x = c$: $x = \\dfrac{\\log c}{\\log b}$.' },
      { kind: 'trap', wrong: '$\\dfrac{\\log 8}{\\log 2} = \\log 4$.', why: 'You cannot cancel inside logs. $\\dfrac{\\log 8}{\\log 2} = \\dfrac{3\\log 2}{\\log 2} = 3$.' },
      { kind: 'example', level: 1 },
      { kind: 'check', level: 3 },
      { kind: 'check', level: 4 },
    ],
  },
];
