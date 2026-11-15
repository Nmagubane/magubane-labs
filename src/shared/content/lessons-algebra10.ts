/** Grade 10 algebraic expressions: products, grouping and cubes; algebraic fractions. */
import type { Lesson } from './types.ts';

export const ALGEBRA10_LESSONS: Lesson[] = [
  {
    id: 'products-factors',
    skillId: 'products-factors',
    title: 'Six products, two cubes',
    minutes: 14,
    blocks: [
      {
        kind: 'predict',
        prompt: 'Expand $(x + 2)(x^2 + 3x + 1)$. How many products do you need before collecting like terms?',
        options: ['2', '4', '6'],
        answer: 2,
        explanation: 'Each of the 2 terms in the first bracket multiplies each of the 3 terms in the second: $2 \\times 3 = 6$ products. Then like terms are collected: $x^3 + 5x^2 + 7x + 2$.',
      },
      {
        kind: 'widget',
        title: 'The product grid',
        task: 'Every cell is one product, and cells of the same colour are like terms. Now choose $q$ and $r$ so that the $x^2$ terms **and** the $x$ terms cancel. What is left?',
        widget: { type: 'algebra-lab', mode: 'grid' },
      },
      {
        kind: 'key-idea',
        body: '**Binomial × trinomial:** six products, then collect like terms. **Grouping:** with four terms and no common factor, group them in pairs that share a factor, so both pairs give the same bracket: $x^3 + 2x^2 + 3x + 6 = x^2(x + 2) + 3(x + 2) = (x + 2)(x^2 + 3)$. **Cubes:** $a^3 - b^3 = (a - b)(a^2 + ab + b^2)$ and $a^3 + b^3 = (a + b)(a^2 - ab + b^2)$. The signs are the **same**, then **opposite**, then **always positive**, and the quadratic bracket never factorises further. Always take out a common factor first, and check every bracket at the end: $x^2 - 9$ is not finished. Type cubes with the ³ key: `(x - 3)(x^2 + 3x + 9)`.',
      },
      { kind: 'trap', wrong: '$x^3 - 8 = (x - 2)^3$', why: 'Expand $(x - 2)^3$: you get $x^3 - 6x^2 + 12x - 8$. The right factorisation is $(x - 2)(x^2 + 2x + 4)$, and the middle term is $2x$ ($ab$), not $4x$ ($2ab$).' },
      { kind: 'trap', wrong: '$x^3 + 2x^2 - 3x - 6 = x^2(x + 2) - 3(x - 2)$', why: 'Taking out $-3$ changes **both** signs inside: $-3x - 6 = -3(x + 2)$. Then both brackets match: $(x + 2)(x^2 - 3)$.' },
      { kind: 'example', level: 4 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 3 },
      { kind: 'check', level: 4 },
      { kind: 'check', level: 5 },
    ],
  },
  {
    id: 'algebraic-fractions',
    skillId: 'algebraic-fractions',
    title: 'Cancel factors, not terms',
    minutes: 15,
    blocks: [
      {
        kind: 'predict',
        prompt: 'Is $\\dfrac{x + 6}{x + 3}$ equal to $2$?',
        options: ['Yes: cancel the x and 6 ÷ 3 = 2', 'No'],
        answer: 1,
        explanation: 'Try $x = 3$: $\\dfrac{9}{6} = 1{,}5$, not $2$. The $x$ is a **term**, joined by $+$, so it cannot be cancelled. Only **factors** of the whole top and the whole bottom cancel.',
      },
      {
        kind: 'widget',
        title: 'Test it with numbers',
        task: 'Move $x$. Which simplification always matches the original? What happens at $x = 2$, and at $x = 0$?',
        widget: { type: 'algebra-lab', mode: 'cancel' },
      },
      {
        kind: 'key-idea',
        body: '**Simplify:** factorise the top and the bottom fully, then cancel common factors. **Multiply:** factorise everything, cancel across, multiply what is left. **Divide:** multiply by the reciprocal of the second fraction. **Add or subtract:** factorise each denominator, find the lowest common denominator, multiply each top by what its bottom is missing, and keep brackets: $-2(x - 3) = -2x + 6$. Then check whether the answer cancels. **Not defined:** a fraction has no value where its denominator is $0$. Factorise the bottom and set each factor to $0$, and remember that a value cancelled out still has to be excluded. Type answers with brackets: `(x + 3)/(x - 2)`.',
      },
      { kind: 'trap', wrong: '$\\dfrac{3}{x + 1} + \\dfrac{2}{x - 1} = \\dfrac{5}{2x}$', why: 'Fractions don\'t add top + top over bottom + bottom. With the LCD $(x + 1)(x - 1)$: $\\dfrac{3(x - 1) + 2(x + 1)}{(x + 1)(x - 1)} = \\dfrac{5x - 1}{(x + 1)(x - 1)}$.' },
      { kind: 'example', level: 4 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 2 },
      { kind: 'check', level: 3 },
      { kind: 'check', level: 5 },
    ],
  },
];
