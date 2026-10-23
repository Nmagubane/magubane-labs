/**
 * Mistakes are data. Each code is a specific, fixable thing — not "wrong".
 * conceptual: a misunderstanding of the idea. procedural: knew the idea, a step went wrong.
 * careless: likely a slip (decided at grading time from the learner's level).
 */
export type MistakeKind = 'conceptual' | 'procedural' | 'careless';

export interface MistakeInfo {
  label: string;
  kind: MistakeKind;
  /** What to do about it, addressed to the learner. */
  tip: string;
}

export const MISTAKES = {
  'sign-error': {
    label: 'Sign error',
    kind: 'procedural',
    tip: 'Before you move on, check every sign. Saying each one out loud ("negative times negative is positive") helps.',
  },
  'integer-rules': {
    label: 'Negative number rules',
    kind: 'conceptual',
    tip: 'Picture it on a number line: adding a negative moves you left, subtracting a negative moves you right.',
  },
  'left-to-right': {
    label: 'Worked left to right',
    kind: 'conceptual',
    tip: 'Do brackets first, then powers, then × and ÷, then + and −. You don\'t simply work from left to right.',
  },
  'one-side-only': {
    label: 'Changed one side only',
    kind: 'conceptual',
    tip: 'An equation is a balance. Whatever you do to one side, you must do to the other.',
  },
  'inverse-operation': {
    label: 'Wrong inverse operation',
    kind: 'procedural',
    tip: 'Undo each operation with its opposite: + with −, × with ÷. Undo them in reverse order.',
  },
  'add-denominators': {
    label: 'Added the denominators',
    kind: 'conceptual',
    tip: 'The denominator tells you the size of each piece. You can only add pieces of the same size, so find a common denominator first.',
  },
  'not-inverted': {
    label: "Didn't flip the divisor",
    kind: 'procedural',
    tip: 'To divide by a fraction, multiply by its reciprocal. Flip the second fraction only.',
  },
  unsimplified: {
    label: 'Not in simplest form',
    kind: 'procedural',
    tip: 'Divide the numerator and the denominator by their highest common factor.',
  },
  'distribute-first-only': {
    label: 'Multiplied only the first term',
    kind: 'procedural',
    tip: 'The number outside a bracket multiplies every term inside it.',
  },
  'missing-middle-term': {
    label: 'Missed the middle term',
    kind: 'conceptual',
    tip: '(a + b)² is (a + b)(a + b). Multiply every term by every term and you get 2ab in the middle.',
  },
  'like-terms': {
    label: 'Combined unlike terms',
    kind: 'conceptual',
    tip: 'You can only add terms with exactly the same variables and powers: 3x and 2x yes, 3x and 2x² no.',
  },
  'factor-signs': {
    label: 'Wrong signs in the factors',
    kind: 'procedural',
    tip: 'The two numbers must multiply to give the constant and add to give the middle coefficient. Check both conditions.',
  },
  'not-fully-factorised': {
    label: 'Not fully factorised',
    kind: 'procedural',
    tip: 'Take out any common factor first, then check whether each bracket can be factorised further.',
  },
  'root-sign': {
    label: 'Roots with the wrong sign',
    kind: 'conceptual',
    tip: 'If (x + 3) = 0, then x = −3. The root is the value that makes the bracket zero.',
  },
  'gradient-inverted': {
    label: 'Run over rise',
    kind: 'conceptual',
    tip: 'Gradient is the change in y divided by the change in x: rise ÷ run.',
  },
  'gradient-order': {
    label: 'Mixed the order of the points',
    kind: 'procedural',
    tip: 'Subtract in the same order on top and bottom: (y₂ − y₁) ÷ (x₂ − x₁).',
  },
  'intercept-confusion': {
    label: 'Mixed up gradient and intercept',
    kind: 'conceptual',
    tip: 'In y = mx + c, m is the gradient (the steepness) and c is where the line crosses the y-axis.',
  },
  'unit-conversion': {
    label: 'Units not converted',
    kind: 'procedural',
    tip: 'Convert everything to SI units (m, s, kg) before you substitute into a formula.',
  },
  'formula-rearranged-wrongly': {
    label: 'Rearranged the formula wrongly',
    kind: 'procedural',
    tip: 'Use the formula triangle or rearrange step by step, and check the units of your answer.',
  },
  'net-force': {
    label: 'Used applied force, not net force',
    kind: 'conceptual',
    tip: 'Acceleration depends on the net (resultant) force. Subtract friction and other opposing forces first.',
  },
  'average-of-speeds': {
    label: 'Averaged the speeds',
    kind: 'conceptual',
    tip: 'Average speed is total distance ÷ total time. You can\'t just average the two speeds, because you spend different amounts of time at each.',
  },
  'atoms-per-formula': {
    label: 'Atoms per formula unit',
    kind: 'conceptual',
    tip: 'The subscript tells you how many atoms are in one formula unit. CO₂ contains 2 mol of O atoms for every mol of CO₂.',
  },
  'time-to-top': {
    label: 'Gave time to the top only',
    kind: 'conceptual',
    tip: 'Without air resistance, the way up and the way down take equal time. The total flight is twice the time to the top.',
  },
  'series-resistance': {
    label: 'Series resistance',
    kind: 'conceptual',
    tip: 'Resistors in series simply add: R = R₁ + R₂. The same current flows through each one.',
  },
  'neutrons-mass-number': {
    label: 'Neutrons vs mass number',
    kind: 'conceptual',
    tip: 'The mass number counts protons + neutrons. Neutrons = mass number − atomic number.',
  },
  'ion-electrons': {
    label: 'Ion charge and electrons',
    kind: 'conceptual',
    tip: 'A positive ion has lost electrons and a negative ion has gained them. Electrons = protons − charge.',
  },
  'not-lowest-ratio': {
    label: 'Not the lowest ratio',
    kind: 'procedural',
    tip: 'It balances, but divide every coefficient by their common factor to get the lowest whole numbers.',
  },
  unbalanced: {
    label: 'Atoms not conserved',
    kind: 'conceptual',
    tip: 'Count each element on both sides. Change coefficients only, never the small numbers inside a formula.',
  },
  'genotype-phenotype': {
    label: 'Genotype vs phenotype',
    kind: 'conceptual',
    tip: 'A heterozygote (Aa) shows the dominant trait. Count the boxes that have at least one dominant allele.',
  },
  'organelle-function': {
    label: 'Organelle function',
    kind: 'conceptual',
    tip: 'Link each structure to the job it does, and to whether plant cells, animal cells or both have it.',
  },
  'probable-slip': {
    label: 'Probable slip',
    kind: 'careless',
    tip: 'You usually get these right. Slow down on the last step and check your answer against the question.',
  },
} as const satisfies Record<string, MistakeInfo>;

export type MistakeCode = keyof typeof MISTAKES;

export function mistakeInfo(code: string): MistakeInfo | undefined {
  return (MISTAKES as Record<string, MistakeInfo>)[code];
}
