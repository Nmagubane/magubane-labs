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
  // ---- Physical Sciences (Grades 7–10) ----
  'state-boundaries': {
    label: 'Melting and boiling points',
    kind: 'conceptual',
    tip: 'Below the melting point: solid. Between the melting and boiling points: liquid. Above the boiling point: gas. Compare with both.',
  },
  'particle-model': {
    label: 'Particle model',
    kind: 'conceptual',
    tip: 'Solids: particles packed tight, vibrating in place. Liquids: close but sliding past each other. Gases: far apart, moving fast. Particles themselves don\'t melt or expand.',
  },
  'mass-not-density': {
    label: 'Heavy is not the same as dense',
    kind: 'conceptual',
    tip: 'Floating depends on density (mass per volume), not on mass. A huge log floats; a tiny pebble sinks.',
  },
  'displacement-volume': {
    label: 'Displacement volume',
    kind: 'procedural',
    tip: "The object's volume is the rise in the water level: final reading minus starting reading.",
  },
  'ph-scale': {
    label: 'Reading the pH scale',
    kind: 'conceptual',
    tip: 'pH below 7 is acidic, 7 is neutral, above 7 is basic (alkaline). The further from 7, the stronger the acid or base.',
  },
  'ph-tenfold': {
    label: 'pH is a ×10 scale',
    kind: 'conceptual',
    tip: 'Each step of 1 on the pH scale is a factor of 10. Two steps is 10 × 10 = 100 times.',
  },
  'indicator-colour': {
    label: 'Indicator colours',
    kind: 'conceptual',
    tip: 'Litmus: acids turn blue litmus red, bases turn red litmus blue. Phenolphthalein: colourless in acids and neutral solutions, pink in bases.',
  },
  'neutralisation-products': {
    label: 'Products of acid reactions',
    kind: 'conceptual',
    tip: 'Acid + base (hydroxide or oxide) → salt + water. Acid + carbonate → salt + water + carbon dioxide. Acid + metal → salt + hydrogen.',
  },
  'heat-transfer-mode': {
    label: 'Conduction, convection or radiation',
    kind: 'conceptual',
    tip: 'Conduction: through touching particles, mostly in solids. Convection: a liquid or gas moves and carries the heat. Radiation: waves, no particles needed.',
  },
  'conductor-insulator': {
    label: 'Conductors and insulators',
    kind: 'conceptual',
    tip: 'Metals conduct heat well. Wood, plastic and trapped air insulate. A metal feels cold because it carries heat away from your hand quickly.',
  },
  'potential-energy-formula': {
    label: 'Potential energy formula',
    kind: 'procedural',
    tip: 'Ep = mgh: mass in kg, g = 9.8 m/s², height in m. Leave out g and you have kg·m, not joules.',
  },
  'kinetic-energy-formula': {
    label: 'Kinetic energy formula',
    kind: 'procedural',
    tip: 'Ek = ½mv². Square the speed first, then multiply by the mass and halve it.',
  },
  'energy-conservation': {
    label: 'Conservation of energy',
    kind: 'conceptual',
    tip: 'Without friction, Ep + Ek stays the same. Energy lost as height becomes kinetic energy: mgΔh = ½mv², so v = √(2gΔh).',
  },
  'parallel-resistance': {
    label: 'Parallel resistance',
    kind: 'conceptual',
    tip: 'In parallel, 1/R = 1/R₁ + 1/R₂, and the total is smaller than the smallest branch. Remember to flip the answer at the end.',
  },
  'series-parallel-behaviour': {
    label: 'Series vs parallel behaviour',
    kind: 'conceptual',
    tip: 'Series: one path, the same current everywhere, a break stops everything. Parallel: each branch gets the full battery voltage and works on its own.',
  },
  // ---- Life Sciences (Grades 7–10) ----
  'vertebrate-features': {
    label: 'Vertebrate classes',
    kind: 'conceptual',
    tip: 'Classify by features, not by where an animal lives: feathers = bird; hair and milk = mammal; dry scales = reptile; moist skin and tadpoles = amphibian; gills and fins for life = fish.',
  },
  'arthropod-features': {
    label: 'Arthropod groups',
    kind: 'conceptual',
    tip: 'Count legs and body parts. Insects: 6 legs, 3 parts. Arachnids: 8 legs, 2 parts. Crustaceans: hard shell, many legs, mostly in water. Myriapods: many segments, many legs.',
  },
  'trophic-levels': {
    label: 'Trophic levels',
    kind: 'conceptual',
    tip: 'Producers make food from sunlight (level 1). Herbivores eat producers (level 2). Each arrow points from the food to the feeder.',
  },
  'energy-transfer-10': {
    label: 'Energy passed along a chain',
    kind: 'conceptual',
    tip: 'Only about 10% of the energy at one level reaches the next. Most is used to stay alive or lost as heat. Multiply by 0.1 at every step.',
  },
  'population-effects': {
    label: 'Knock-on effects in a food chain',
    kind: 'conceptual',
    tip: 'Remove a predator and its prey increases at first. Remove a food source and whatever eats it decreases.',
  },
  'photosynthesis-inputs-outputs': {
    label: 'Photosynthesis inputs and outputs',
    kind: 'conceptual',
    tip: 'Photosynthesis takes in carbon dioxide and water, using light, and gives out glucose and oxygen. Respiration is the reverse, and it happens all the time.',
  },
  'limiting-factor': {
    label: 'Limiting factors',
    kind: 'conceptual',
    tip: 'The rate is held back by whichever factor is in shortest supply. Increasing anything else makes no difference.',
  },
  'gross-vs-net': {
    label: 'Forgot respiration',
    kind: 'conceptual',
    tip: 'Plants respire day and night. The net oxygen given out is what photosynthesis makes minus what respiration uses.',
  },
  'organ-system': {
    label: 'Organs and systems',
    kind: 'conceptual',
    tip: "Ask what the organ's main job is: moving blood, exchanging gases, breaking down food, removing waste, or carrying signals.",
  },
  'blood-flow-path': {
    label: 'Path of blood',
    kind: 'conceptual',
    tip: 'Body → vena cava → right atrium → right ventricle → pulmonary artery → lungs → pulmonary vein → left atrium → left ventricle → aorta → body.',
  },
  'oxygenated-blood': {
    label: 'Oxygen-rich or oxygen-poor',
    kind: 'conceptual',
    tip: 'The right side of the heart carries oxygen-poor blood to the lungs; the left side carries oxygen-rich blood to the body. Arteries leave the heart, veins return to it.',
  },
  'mitosis-phases': {
    label: 'Phases of mitosis',
    kind: 'conceptual',
    tip: 'Prophase: chromosomes appear. Metaphase: they line up in the middle. Anaphase: chromatids pulled apart. Telophase: two new nuclei form.',
  },
  'mitosis-meiosis': {
    label: 'Mitosis vs meiosis',
    kind: 'conceptual',
    tip: 'Mitosis keeps the chromosome number (2n → 2n) and makes 2 identical cells. Meiosis halves it (2n → n) and makes 4 different gametes.',
  },
  chromatids: {
    label: 'Chromosomes vs chromatids',
    kind: 'conceptual',
    tip: 'After DNA copies itself, each chromosome is two identical chromatids joined at the centromere. Chromatids = 2 × chromosomes until anaphase.',
  },
  // ---- Mathematics, Grades 4–6 ----
  'place-value': {
    label: 'Place value',
    kind: 'conceptual',
    tip: 'Each place is worth 10 times the place to its right: units, tens, hundreds, thousands. A digit\'s value depends on where it sits.',
  },
  rounding: {
    label: 'Rounding',
    kind: 'procedural',
    tip: 'Look at the digit just to the right of the place you are rounding to. 5 or more: round up. 4 or less: round down.',
  },
  'multiplication-method': {
    label: 'Multiplication method',
    kind: 'procedural',
    tip: 'Split the number into parts (tens and units), multiply each part, then add. 23 × 4 = 20 × 4 + 3 × 4.',
  },
  'division-remainder': {
    label: 'Division and remainders',
    kind: 'procedural',
    tip: 'Check: quotient × divisor + remainder must equal the number you started with, and the remainder must be smaller than the divisor.',
  },
  'bigger-denominator': {
    label: 'Bigger denominator, smaller pieces',
    kind: 'conceptual',
    tip: 'The denominator is how many equal pieces the whole is cut into. More pieces means each piece is smaller, so 1/8 is less than 1/3.',
  },
  'part-whole': {
    label: 'Parts and the whole',
    kind: 'conceptual',
    tip: 'The denominator (bottom) is how many equal parts make the whole. The numerator (top) is how many of those parts you mean.',
  },
  'fraction-of-amount': {
    label: 'Fraction of an amount',
    kind: 'procedural',
    tip: 'To find 3/4 of 20: divide by the denominator (20 ÷ 4 = 5), then multiply by the numerator (5 × 3 = 15).',
  },
  'decimal-length': {
    label: 'Longer is not bigger',
    kind: 'conceptual',
    tip: 'Compare decimals place by place from the left: tenths first, then hundredths. 0.5 is bigger than 0.45 because 5 tenths beats 4 tenths.',
  },
  'decimal-alignment': {
    label: 'Decimal points not lined up',
    kind: 'procedural',
    tip: 'When adding or subtracting decimals, line up the decimal points so tenths are under tenths. Fill gaps with zeros.',
  },
  'perimeter-area': {
    label: 'Perimeter vs area',
    kind: 'conceptual',
    tip: 'Perimeter is the distance around the outside (add all the sides). Area is the space inside (length × breadth, in square units).',
  },
  // ---- Mathematics, Grades 10–12 ----
  'exponent-laws': {
    label: 'Laws of exponents',
    kind: 'conceptual',
    tip: 'Same base: multiplying adds the exponents, dividing subtracts them, and a power of a power multiplies them. Different bases don\'t combine.',
  },
  'negative-exponent': {
    label: 'Negative and zero exponents',
    kind: 'conceptual',
    tip: 'A negative exponent means "one over": 2⁻³ = 1/2³ = 1/8. It never makes the answer negative. Anything (except 0) to the power 0 is 1.',
  },
  'quadratic-formula-use': {
    label: 'Using the quadratic formula',
    kind: 'procedural',
    tip: 'Write the equation as ax² + bx + c = 0 first. Then −b ± √(b² − 4ac), and divide the whole top by 2a. Watch the signs of b and c.',
  },
  discriminant: {
    label: 'The discriminant',
    kind: 'conceptual',
    tip: 'Δ = b² − 4ac. Δ > 0: two real roots (rational if Δ is a perfect square). Δ = 0: one repeated root. Δ < 0: no real roots.',
  },
  'nth-term': {
    label: 'General term',
    kind: 'procedural',
    tip: 'Arithmetic: Tₙ = a + (n − 1)d. Geometric: Tₙ = arⁿ⁻¹. Use n − 1, because the first term has no differences added yet.',
  },
  'sequence-type': {
    label: 'Arithmetic vs geometric',
    kind: 'conceptual',
    tip: 'Arithmetic sequences add the same number each time (constant difference). Geometric sequences multiply by the same number (constant ratio).',
  },
  'trig-ratio-choice': {
    label: 'Choosing the trig ratio',
    kind: 'conceptual',
    tip: 'SOH CAH TOA. Label the sides from the angle: opposite, adjacent, hypotenuse. Choose the ratio that uses the side you know and the side you want.',
  },
  'simple-vs-compound': {
    label: 'Simple vs compound interest',
    kind: 'conceptual',
    tip: 'Simple: A = P(1 + in). Compound earns interest on interest: A = P(1 + i)ⁿ. Read which one the question asks for.',
  },
  'rate-period': {
    label: 'Rate and period mismatch',
    kind: 'procedural',
    tip: 'Match the rate to the period. Compounded monthly: use i ÷ 12 and n × 12. A percentage must be divided by 100.',
  },
  'power-rule': {
    label: 'Power rule',
    kind: 'procedural',
    tip: 'd/dx(axⁿ) = naxⁿ⁻¹: multiply by the power, then lower the power by 1. A constant on its own differentiates to 0.',
  },
  // ---- Natural Sciences & Technology, Grades 4–6 ----
  'life-processes': {
    label: 'Signs of life',
    kind: 'conceptual',
    tip: 'Living things do all seven life processes (MRS GREN): Move, Respire, Sense, Grow, Reproduce, Excrete, take in Nutrition. Doing one or two isn\'t enough.',
  },
  'plant-parts': {
    label: 'Plant parts',
    kind: 'conceptual',
    tip: 'Roots take in water and hold the plant. The stem carries water and holds it up. Leaves make food using light. Flowers make seeds.',
  },
  'life-cycle-order': {
    label: 'Life cycle order',
    kind: 'conceptual',
    tip: 'Every life cycle starts with an egg or seed and ends with an adult that can reproduce. Insects like butterflies have a pupa stage; frogs have tadpoles.',
  },
  'states-properties': {
    label: 'Properties of solids, liquids and gases',
    kind: 'conceptual',
    tip: 'Solids keep their shape. Liquids flow and take the shape of their container but keep their volume. Gases spread out to fill any container.',
  },
  'metal-properties': {
    label: 'Properties of metals',
    kind: 'conceptual',
    tip: 'Metals are shiny, conduct heat and electricity, and bend without breaking. Only a few (iron, steel, nickel, cobalt) are magnetic.',
  },
  'separation-method': {
    label: 'Separating mixtures',
    kind: 'conceptual',
    tip: 'Match the method to the difference: size (sieve), dissolved or not (filter), dissolved solid (evaporate), magnetic (magnet), floats or sinks (decant).',
  },
  dissolving: {
    label: 'Dissolving',
    kind: 'conceptual',
    tip: 'When sugar dissolves it hasn\'t melted or disappeared. It has spread out through the water, so the mass of the solution = solute + solvent.',
  },
  'pitch-loudness': {
    label: 'Pitch vs loudness',
    kind: 'conceptual',
    tip: 'Pitch is how high or low a sound is: faster vibrations, higher pitch. Loudness is how strong the sound is: bigger vibrations, louder sound.',
  },
  'complete-circuit': {
    label: 'Complete circuits',
    kind: 'conceptual',
    tip: 'Electricity flows only through an unbroken loop from one end of the cell, through the bulb, and back to the other end. A gap or an insulator stops it.',
  },
  'earth-motion': {
    label: 'How the Earth moves',
    kind: 'conceptual',
    tip: 'The Earth spins once a day, giving day and night. It travels around the Sun once a year. The Sun does not go around the Earth.',
  },
  'moon-phases': {
    label: 'Phases of the Moon',
    kind: 'conceptual',
    tip: 'The Moon makes no light. Half of it is always lit by the Sun; the phase is how much of that lit half we can see from Earth as the Moon orbits us.',
  },
  'planet-facts': {
    label: 'The planets',
    kind: 'conceptual',
    tip: 'My Very Educated Mother Just Served Us Noodles: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune. The first four are small and rocky.',
  },
  'structure-strength': {
    label: 'Strong structures',
    kind: 'conceptual',
    tip: 'Triangles don\'t change shape when pushed, so frames use them. Folding, rolling or corrugating a material makes it much stiffer.',
  },
  // ---- Foundation Phase (Grades 1–3). Tips are written for the adult helping the child. ----
  'fp-miscount': { label: 'Miscounted by one', kind: 'procedural', tip: 'Touch each object once and say one number for each touch. Move counted objects aside.' },
  'fp-operation': { label: 'Added instead of took away', kind: 'conceptual', tip: 'Act the story out with real things: joining makes more, taking away makes fewer.' },
  'fp-digit-swap': { label: 'Swapped tens and ones', kind: 'conceptual', tip: 'Build both numbers with bundles of ten sticks: 31 is three bundles and one; 13 is one bundle and three.' },
  'fp-count-step': { label: 'Counted in the wrong step', kind: 'procedural', tip: 'Look at how much the numbers jump each time, then jump the same again. Count the jumps on fingers.' },
  'fp-more-less': { label: 'Mixed up more and less', kind: 'conceptual', tip: 'Line up two groups one-to-one: the group with some left over has more. On a number line, more is further along.' },
  'fp-place-value': { label: 'Read a place wrong', kind: 'conceptual', tip: 'Count the hundreds, the tens and the ones separately with real bundles, then put them together.' },
  'fp-regroup': { label: 'Forgot to exchange a ten', kind: 'procedural', tip: 'When the ones make ten or more, swap ten ones for one ten. Practise with real bundles of ten.' },
  'fp-unequal-parts': { label: 'Parts not equal', kind: 'conceptual', tip: 'Fold paper or share food: a half, a third or a quarter only counts when every part is the same size.' },
  'fp-coin-value': { label: 'Counted coins, not their value', kind: 'conceptual', tip: 'Each coin has a value printed on it. Swap a R5 for five R1 coins to see it is worth the same.' },
  'fp-clock-hands': { label: 'Mixed up the clock hands', kind: 'conceptual', tip: 'The short hand shows the hour, the long hand shows the minutes. Practise on a real clock at home.' },
  'fp-sound': { label: 'Heard a different sound', kind: 'conceptual', tip: 'Say the word slowly and stretch the sound: "sssun". Ask the child to say it after you and feel their mouth.' },
  'fp-letter-shape': { label: 'Mixed up letters that look alike', kind: 'procedural', tip: 'b and d, p and q face different ways. Trace them in sand or on a back, saying the sound.' },
  'fp-rhyme': { label: 'Matched the start, not the end', kind: 'conceptual', tip: 'Rhyming words sound the same at the end: cat, hat, mat. Play rhyming games in the car or at supper.' },
  'fp-similar-word': { label: 'Read a word that looks similar', kind: 'procedural', tip: 'Sound out every letter, left to right, not just the first one. Point under each letter while reading.' },
  'fp-story-detail': { label: 'Missed a detail in the story', kind: 'procedural', tip: 'Read the story again together and find the words that answer who, what, where or why.' },
  'fp-sort': { label: 'Sorted into the wrong group', kind: 'conceptual', tip: 'Ask the sorting question about each picture on its own, then talk about why it belongs.' },
  'fp-order': { label: 'Put steps in the wrong order', kind: 'procedural', tip: 'Act out the steps: what must happen first before anything else can happen?' },
  'fp-unit': { label: 'Chose the wrong unit', kind: 'conceptual', tip: 'Metres for long things, kilograms for heavy things, litres for liquids. Look at labels on things at home.' },
  'fp-shape-name': { label: 'Mixed up shape names', kind: 'conceptual', tip: 'Count the sides and corners together: a triangle has 3; squares and rectangles have 4.' },
  'fp-position': { label: 'Mixed up position words', kind: 'conceptual', tip: 'Play "put the cup under the chair" games. For left: your left hand makes an L with thumb and finger.' },
  'fp-knowledge': { label: 'Not known yet', kind: 'conceptual', tip: 'Talk about it together and find a real example at home, at school or outside.' },
  'fp-grammar': { label: 'Language rule', kind: 'conceptual', tip: 'Read the sentence aloud together: it should sound right. Talk about the rule with more examples.' },
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
