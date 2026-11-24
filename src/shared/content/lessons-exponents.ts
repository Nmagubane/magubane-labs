import type { Lesson } from './types.ts';

/**
 * Exponents, Grades 7–9 (CAPS Senior Phase, 1.2 Exponents). Grade 7 builds the meaning of a power from squares and
 * cubes of unit pieces; Grades 8–9 find each law by writing powers out as factors and counting them, so a⁰ = 1 and
 * a⁻ⁿ = 1/aⁿ fall out of division instead of being rules to memorise.
 */
export const EXPONENT_LESSONS: Lesson[] = [
  {
    id: 'powers-roots',
    skillId: 'powers-roots',
    title: 'Exponents, squares and roots',
    minutes: 10,
    blocks: [
      {
        kind: 'predict',
        prompt: 'What is $2^5$?',
        options: ['$10$', '$25$', '$32$'],
        answer: 2,
        explanation: '$2^5$ means five 2s multiplied: $2 \\times 2 \\times 2 \\times 2 \\times 2 = 32$. It is not $2 \\times 5 = 10$, and not $5^2 = 25$.',
      },
      {
        kind: 'widget',
        title: 'Squares and cubes',
        task: 'How many small squares fill a square of side 7? Try a few sides, then switch to cubes.',
        widget: { type: 'square-lab' },
      },
      {
        kind: 'key-idea',
        body: 'In $3^4 = 3 \\times 3 \\times 3 \\times 3 = 81$, the **base** 3 is the number being multiplied and the **exponent** 4 counts how many times. A **square** uses a number twice ($7^2 = 49$, the area of a 7 by 7 square); a **cube** uses it three times ($4^3 = 64$, the volume of a 4 by 4 by 4 cube). A **square root** undoes squaring: $\\sqrt{49} = 7$ because $7^2 = 49$. A **cube root** undoes cubing: $\\sqrt[3]{64} = 4$. Know the squares up to $12^2 = 144$ and the cubes up to $6^3 = 216$: they come back in area, volume and Pythagoras. In a calculation, do brackets first, then powers and roots, then × and ÷, then + and −.',
      },
      {
        kind: 'trap',
        wrong: '$\\sqrt{9 + 16} = \\sqrt{9} + \\sqrt{16} = 3 + 4 = 7$',
        why: 'The root sign covers the whole sum, so add first: $\\sqrt{9 + 16} = \\sqrt{25} = 5$. Powers don\'t split over a sum either: $(3 + 4)^2 = 7^2 = 49$, not $9 + 16 = 25$.',
      },
      { kind: 'example', level: 3 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 2 },
      { kind: 'check', level: 4 },
    ],
  },
  {
    id: 'exponent-laws',
    skillId: 'exponent-laws',
    title: 'Laws of exponents and scientific notation',
    minutes: 15,
    blocks: [
      {
        kind: 'predict',
        prompt: 'Simplify $a^3 \\times a^2$.',
        options: ['$a^5$', '$a^6$', '$2a^5$'],
        answer: 0,
        explanation: 'Write it out: $(a \\times a \\times a) \\times (a \\times a)$ is five factors of $a$, so $a^5$. Multiplying adds the exponents; it doesn\'t multiply them.',
      },
      {
        kind: 'widget',
        title: 'Count the factors',
        task: 'Try each law with different exponents, and count the factors before you read the answer. In Divide, make the bottom exponent as big as the top one, then bigger.',
        widget: { type: 'factor-lab' },
      },
      {
        kind: 'key-idea',
        body: 'For the same base: $a^m \\times a^n = a^{m+n}$, $\\;a^m \\div a^n = a^{m-n}$ and $(a^m)^n = a^{mn}$. A power of a product raises every factor: $(2x^3)^4 = 2^4 x^{12} = 16x^{12}$. Any number except 0 to the power 0 is 1: $a^0 = 1$. The **numbers in front** are multiplied or divided as usual; only the exponents are added or subtracted: $3x^4 \\times 5x^2 = 15x^6$. **Grade 9:** a negative exponent means "one over": $a^{-n} = \\dfrac{1}{a^n}$, so $x^2 \\div x^5 = x^{-3} = \\dfrac{1}{x^3}$. Give final answers with positive exponents.',
      },
      { kind: 'trap', wrong: '$(3x^2)^2 = 3x^4$', why: 'The power is on everything in the bracket, the 3 too: $(3x^2)^2 = 3^2 x^4 = 9x^4$.' },
      { kind: 'example', level: 2 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 2 },
      {
        kind: 'key-idea',
        body: '**Scientific notation** writes a number as $a \\times 10^{n}$, with $a$ at least 1 and less than 10. Count how many places the decimal point moves: $45\\,600\\,000 = 4{,}56 \\times 10^{7}$ (7 places to the left). **Grade 9:** a number smaller than 1 gets a negative power: $0{,}000\\,42 = 4{,}2 \\times 10^{-4}$ (4 places to the right). To multiply, multiply the numbers and add the powers of 10. If the number in front comes out 10 or more, move the point once more and add 1 to the power: $(6 \\times 10^{5}) \\times (4 \\times 10^{3}) = 24 \\times 10^{8} = 2{,}4 \\times 10^{9}$.',
      },
      { kind: 'trap', wrong: '$45\\,600\\,000 = 4{,}56 \\times 10^{5}$, because there are 5 zeros.', why: 'Count the places the point moves, not the zeros: from $45\\,600\\,000$ to $4{,}56$ it moves 7 places, so it is $4{,}56 \\times 10^{7}$.' },
      { kind: 'example', level: 3 },
      { kind: 'check', level: 3 },
      { kind: 'check', level: 4 },
    ],
  },
];
