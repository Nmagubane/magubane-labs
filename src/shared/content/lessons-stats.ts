import type { Lesson } from './types.ts';

/** Statistics, Grades 10–12 (CAPS Paper 2): summarise, measure spread, then model a relationship. */
export const STATS_LESSONS: Lesson[] = [
  {
    id: 'stats-summary',
    skillId: 'stats-summary',
    title: 'Mean, median, quartiles and box plots',
    minutes: 12,
    blocks: [
      {
        kind: 'predict',
        prompt: 'Nine learners earn R20, R25, R25, R30, R30, R35, R40, R40 and R400 a week from a part-time job. Which number best describes a typical learner?',
        options: ['The mean, R75', 'The median, R30', 'The range, R380'],
        answer: 1,
        explanation: 'One very large value pulls the mean up to R75, more than eight of the nine learners earn. The median, R30, is not affected by that one value.',
      },
      {
        kind: 'widget',
        title: 'Data lab',
        task: 'Drag the dots. Watch the mean, the median, the box plot and σ. Drag the biggest value even further right: which measures move, and which stay put?',
        widget: { type: 'stats-lab', mode: 'dots' },
      },
      { kind: 'key-idea', body: '**Mean** $\\bar{x} = \\dfrac{\\Sigma x}{n}$; **median**: the middle of the ordered data; **mode**: the most common value. The **five-number summary** is (minimum; $Q_1$; median; $Q_3$; maximum), where $Q_1$ and $Q_3$ are the medians of the lower and upper halves. A **box-and-whisker plot** draws it: each of the four sections holds 25% of the data. **Range** = max − min; **IQR** = $Q_3 - Q_1$. For grouped data, estimate the mean with the class midpoints.' },
      { kind: 'trap', wrong: 'The longer section of a box plot has more data in it.', why: 'Every section holds 25% of the data. A longer section means that quarter is more **spread out**, not that it has more values.' },
      { kind: 'example', level: 3 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 4 },
    ],
  },
  {
    id: 'stats-spread',
    skillId: 'stats-spread',
    title: 'Standard deviation and ogives',
    minutes: 13,
    blocks: [
      {
        kind: 'predict',
        prompt: 'Two classes both average 60% on a test. In class A most marks are between 55% and 65%; in class B they run from 20% to 95%. Which has the bigger standard deviation?',
        options: ['Class A', 'Class B', 'The same: the means are equal'],
        answer: 1,
        explanation: 'Standard deviation measures how far the values are spread from the mean. Class B is far more spread out, so its σ is bigger, even though the means are the same.',
      },
      {
        kind: 'widget',
        title: 'Spread lab',
        task: 'Bunch the dots close to the mean, then spread them out. Watch σ and the shaded band, the mean ± σ. About how many dots stay inside the band?',
        widget: { type: 'stats-lab', mode: 'dots' },
      },
      { kind: 'key-idea', body: '**Variance** $= \\dfrac{\\Sigma(x - \\bar{x})^2}{n}$ and **standard deviation** $\\sigma = \\sqrt{\\text{variance}}$ (CAPS divides by $n$). An **ogive** plots cumulative frequency at each class’s **upper boundary**; read the median at height $\\tfrac{n}{2}$, and the quartiles at $\\tfrac{n}{4}$ and $\\tfrac{3n}{4}$. An **outlier** lies below $Q_1 - 1{,}5\\,\\text{IQR}$ or above $Q_3 + 1{,}5\\,\\text{IQR}$.' },
      { kind: 'trap', wrong: 'On a calculator, use $sx$ for the standard deviation.', why: '$sx$ divides by $n - 1$ (the sample formula). CAPS uses $\\sigma x$, which divides by $n$.' },
      { kind: 'example', level: 1 },
      { kind: 'check', level: 3 },
      { kind: 'check', level: 2 },
    ],
  },
  {
    id: 'stats-regression',
    skillId: 'stats-regression',
    title: 'Regression and correlation',
    minutes: 13,
    blocks: [
      {
        kind: 'predict',
        prompt: 'A scatter plot shows that learners who sleep more tend to score higher in tests. Does that prove that more sleep causes higher marks?',
        options: ['Yes: the correlation proves it', 'No: correlation shows a pattern, not a cause'],
        answer: 1,
        explanation: 'A correlation shows the two go together. Something else (such as better routines) could cause both. Regression lets you **predict**, not prove a cause.',
      },
      {
        kind: 'widget',
        title: 'Scatter lab',
        task: 'Drag the points. Watch the regression line and r. Make r close to 1, then close to −1, then close to 0. Then drag one point far into a corner.',
        widget: { type: 'stats-lab', mode: 'scatter' },
      },
      { kind: 'key-idea', body: 'The **least squares regression line** $\\hat{y} = a + bx$ is the straight line closest to the points ($b$ is the gradient, $a$ the $y$-intercept); find it in your calculator’s STAT mode (A + BX). The **correlation coefficient** $r$ is between $-1$ and $1$: the sign gives the direction and the size the strength. Predict inside the range of the data (interpolation); predicting far outside it (extrapolation) is unreliable.' },
      { kind: 'trap', wrong: '$r = -0{,}9$ is a weak correlation because it is negative.', why: 'The sign is only the direction. $|r| = 0{,}9$ is close to 1, so this is a **strong** negative correlation.' },
      { kind: 'example', level: 2 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 5 },
    ],
  },
];
