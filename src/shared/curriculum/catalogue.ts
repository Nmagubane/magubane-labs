/**
 * The curriculum graph: Subject → Topic → Skill. Mastery is tracked per skill.
 * This is data. Moving it into the database (or an authoring tool) later must not change the shape.
 *
 * Curriculum mappings are PROVISIONAL: grade + strand only, and must be verified against
 * the official CAPS documents before the product claims alignment.
 */

import { FOUNDATION_TOPICS, FOUNDATION_SKILLS } from './foundation.ts';
import { BAND_AHEAD } from './phases.ts';

export const SUBJECT_IDS = ['mathematics', 'natural-sciences', 'physical-sciences', 'life-sciences', 'home-language', 'english-fal', 'life-skills'] as const;
export type SubjectId = (typeof SUBJECT_IDS)[number];
export type CurriculumId = 'za-caps' | 'intl';

export interface Curriculum {
  id: CurriculumId;
  name: string;
  description: string;
  grades: number[];
}

export const CURRICULA: Curriculum[] = [
  {
    id: 'za-caps',
    name: 'South Africa — CAPS',
    description: 'Mathematics, Physical Sciences and Life Sciences as taught in South African schools.',
    grades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
  {
    id: 'intl',
    name: 'International',
    description: 'Organised by grade and age rather than a national syllabus.',
    grades: [4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
];

export interface Subject {
  id: SubjectId;
  name: string;
  /** Shown when choosing subjects: why this subject opens doors. */
  pitch: string;
}

export interface Topic {
  id: string;
  subjectId: SubjectId;
  name: string;
  /** "Physics" / "Chemistry" grouping inside Physical Sciences, for progress views. */
  strand?: string;
}

export interface Skill {
  id: string;
  topicId: string;
  name: string;
  /** One line: what you can do once you have this skill. */
  outcome: string;
  /** The skill's signature expression, in TeX. Shown large on Home and in Learn. */
  signature: string;
  /** Typical grade at which this is taught (CAPS-ish). */
  grade: number;
  prerequisites: string[];
  templateId: string;
  /** Senior skills have a lesson. Foundation Phase skills use "watch first" worked examples instead (lessonId ''). */
  lessonId: string;
  /** Grades 1–3 are 'foundation': played in the Junior experience with touch inputs and a voice. */
  phase?: 'foundation';
  mappings: Partial<Record<CurriculumId, { grade: number; strand: string }>>;
}

export const SUBJECTS: Subject[] = [
  {
    id: 'mathematics',
    name: 'Mathematics',
    pitch: 'The language of engineering, medicine, finance and every science. Pure maths keeps every door open.',
  },
  {
    id: 'natural-sciences',
    name: 'Natural Sciences',
    pitch: 'Life and Living, Matter and Materials, Energy and Change, Planet Earth and Beyond. Science for Grades 4 to 9.',
  },
  {
    id: 'physical-sciences',
    name: 'Physical Sciences',
    pitch: 'Physics and chemistry for Grades 10 to 12: how matter, energy and forces behave, and how to predict them.',
  },
  {
    id: 'life-sciences',
    name: 'Life Sciences',
    pitch: 'Grades 10 to 12: how living things are built, inherit traits and stay alive. It is the road to medicine.',
  },
  {
    id: 'home-language',
    name: 'Home Language',
    pitch: 'Sounds, reading, spelling and stories in the language a child speaks at home. Grades 1 to 3.',
  },
  {
    id: 'english-fal',
    name: 'English First Additional Language',
    pitch: 'Listening, words and reading in English for children whose home language is not English. Grades 1 to 3.',
  },
  {
    id: 'life-skills',
    name: 'Life Skills',
    pitch: 'Beginning Knowledge and Personal & Social Well-being: my body, safety, plants, animals, weather and feelings. Grades 1 to 3.',
  },
];

export const TOPICS: Topic[] = [
  // Mathematics: one list across Grades 4–12, named after the CAPS topics.
  { id: 'number', subjectId: 'mathematics', name: 'Whole numbers and integers' },
  { id: 'fractions', subjectId: 'mathematics', name: 'Common and decimal fractions' },
  { id: 'measurement', subjectId: 'mathematics', name: 'Measurement' },
  { id: 'algebra', subjectId: 'mathematics', name: 'Algebraic expressions and exponents' },
  { id: 'equations', subjectId: 'mathematics', name: 'Equations and inequalities' },
  { id: 'functions', subjectId: 'mathematics', name: 'Functions and graphs' },
  { id: 'euclidean', subjectId: 'mathematics', name: 'Euclidean geometry' },
  { id: 'analytical', subjectId: 'mathematics', name: 'Analytical geometry' },
  { id: 'statistics', subjectId: 'mathematics', name: 'Statistics' },
  { id: 'patterns', subjectId: 'mathematics', name: 'Number patterns, sequences and series' },
  { id: 'trigonometry', subjectId: 'mathematics', name: 'Trigonometry' },
  { id: 'finance', subjectId: 'mathematics', name: 'Finance, growth and decay' },
  { id: 'calculus', subjectId: 'mathematics', name: 'Differential calculus' },
  // Natural Sciences, Grades 4–9 (Natural Sciences and Technology in 4–6): the four CAPS knowledge strands,
  // plus the Technology strand that CAPS integrates into Grades 4–6.
  { id: 'nst-life', subjectId: 'natural-sciences', name: 'Life and Living' },
  { id: 'nst-matter', subjectId: 'natural-sciences', name: 'Matter and Materials' },
  { id: 'nst-energy', subjectId: 'natural-sciences', name: 'Energy and Change' },
  { id: 'nst-earth', subjectId: 'natural-sciences', name: 'Planet Earth and Beyond' },
  { id: 'nst-tech', subjectId: 'natural-sciences', name: 'Technology: Structures' },
  // Physical Sciences, Grades 10–12: CAPS knowledge areas (Paper 1 physics, Paper 2 chemistry).
  { id: 'mechanics', subjectId: 'physical-sciences', name: 'Mechanics', strand: 'Physics' },
  { id: 'electricity', subjectId: 'physical-sciences', name: 'Electricity and magnetism', strand: 'Physics' },
  { id: 'matter', subjectId: 'physical-sciences', name: 'Matter and materials', strand: 'Chemistry' },
  { id: 'chemical-change', subjectId: 'physical-sciences', name: 'Chemical change', strand: 'Chemistry' },
  // Life Sciences, Grades 10–12: CAPS knowledge strands.
  { id: 'cells', subjectId: 'life-sciences', name: 'Life at the molecular, cellular and tissue level' },
  { id: 'genetics', subjectId: 'life-sciences', name: 'Genetics and inheritance' },
  ...FOUNDATION_TOPICS,
];

const caps = (grade: number, strand: string) => ({ 'za-caps': { grade, strand }, intl: { grade, strand } });

export const SKILLS: Skill[] = [
  // ---------- Mathematics ----------
  {
    id: 'place-value',
    topicId: 'number',
    name: 'Place value and rounding',
    outcome: 'Read, write, compare and round whole numbers up to 6 digits.',
    signature: '4\\,725 = 4\\,000 + 700 + 20 + 5',
    grade: 4,
    prerequisites: [],
    templateId: 'place-value',
    lessonId: 'place-value',
    mappings: caps(4, 'Numbers, operations and relationships: Whole numbers'),
  },
  {
    id: 'multiplication',
    topicId: 'number',
    name: 'Multiplication and division',
    outcome: 'Multiply and divide whole numbers, including with remainders and in word problems.',
    signature: '7 \\times 8 = 7 \\times 5 + 7 \\times 3',
    grade: 4,
    prerequisites: ['place-value'],
    templateId: 'multiplication',
    lessonId: 'multiplication',
    mappings: caps(4, 'Numbers, operations and relationships: Whole numbers (multiplication and division)'),
  },
  {
    id: 'integers',
    topicId: 'number',
    name: 'Operations with integers',
    outcome: 'Add, subtract, multiply and divide positive and negative numbers.',
    signature: '-7 - (-3) = -4',
    grade: 7,
    prerequisites: [],
    templateId: 'integers',
    lessonId: 'integers',
    mappings: caps(7, 'Numbers, operations and relationships: Integers'),
  },
  {
    id: 'order-of-operations',
    topicId: 'number',
    name: 'Order of operations',
    outcome: 'Evaluate expressions with brackets, powers and mixed operations correctly.',
    signature: '3 + 4 \\times 2^2 = 19',
    grade: 7,
    prerequisites: ['integers'],
    templateId: 'order-of-operations',
    lessonId: 'order-of-operations',
    mappings: caps(7, 'Numbers, operations and relationships: Whole numbers (calculation techniques)'),
  },
  {
    id: 'fractions-basic',
    topicId: 'fractions',
    name: 'What fractions mean',
    outcome: 'Find fractions of shapes and amounts, and compare fractions.',
    signature: '\\tfrac{1}{3} \\text{ of } 12 = 4',
    grade: 4,
    prerequisites: [],
    templateId: 'fractions-basic',
    lessonId: 'fractions-basic',
    mappings: caps(4, 'Numbers, operations and relationships: Common fractions'),
  },
  {
    id: 'fraction-simplify',
    topicId: 'fractions',
    name: 'Equivalent fractions',
    outcome: 'Write fractions in simplest form and recognise equivalent fractions.',
    signature: '\\tfrac{18}{24} = \\tfrac{3}{4}',
    grade: 6,
    prerequisites: [],
    templateId: 'fraction-simplify',
    lessonId: 'fraction-simplify',
    mappings: caps(6, 'Numbers, operations and relationships: Common fractions'),
  },
  {
    id: 'fraction-add',
    topicId: 'fractions',
    name: 'Adding and subtracting fractions',
    outcome: 'Add and subtract fractions with different denominators.',
    signature: '\\tfrac{2}{3} + \\tfrac{1}{4} = \\tfrac{11}{12}',
    grade: 7,
    prerequisites: ['fraction-simplify'],
    templateId: 'fraction-add',
    lessonId: 'fraction-add',
    mappings: caps(7, 'Numbers, operations and relationships: Common fractions'),
  },
  {
    id: 'fraction-multiply',
    topicId: 'fractions',
    name: 'Multiplying and dividing fractions',
    outcome: 'Multiply and divide fractions, including dividing by a fraction.',
    signature: '\\tfrac{3}{4} \\div \\tfrac{1}{2} = \\tfrac{3}{2}',
    grade: 7,
    prerequisites: ['fraction-simplify'],
    templateId: 'fraction-multiply',
    lessonId: 'fraction-multiply',
    mappings: caps(7, 'Numbers, operations and relationships: Common fractions'),
  },
  {
    id: 'decimals',
    topicId: 'fractions',
    name: 'Decimals',
    outcome: 'Read, compare, add and subtract decimals, and convert between fractions and decimals.',
    signature: '0{,}5 = \\tfrac{1}{2} = 50\\%',
    grade: 6,
    prerequisites: ['fractions-basic'],
    templateId: 'decimals',
    lessonId: 'decimals',
    mappings: caps(6, 'Numbers, operations and relationships: Decimal fractions'),
  },
  {
    id: 'perimeter-area',
    topicId: 'measurement',
    name: 'Perimeter and area',
    outcome: 'Find the perimeter and area of rectangles and shapes made from them.',
    signature: 'A = l \\times b',
    grade: 5,
    prerequisites: ['multiplication'],
    templateId: 'perimeter-area',
    lessonId: 'perimeter-area',
    mappings: caps(5, 'Measurement: Perimeter, area and volume'),
  },
  {
    id: 'like-terms',
    topicId: 'algebra',
    name: 'Simplifying expressions',
    outcome: 'Collect like terms to simplify algebraic expressions.',
    signature: '5x + 3y - 2x = 3x + 3y',
    grade: 8,
    prerequisites: ['integers'],
    templateId: 'like-terms',
    lessonId: 'like-terms',
    mappings: caps(8, 'Patterns, functions and algebra: Algebraic expressions'),
  },
  {
    id: 'expand-brackets',
    topicId: 'algebra',
    name: 'Expanding brackets',
    outcome: 'Multiply out brackets, including the product of two binomials.',
    signature: '(x + 2)(x + 3) = x^2 + 5x + 6',
    grade: 9,
    prerequisites: ['like-terms'],
    templateId: 'expand-brackets',
    lessonId: 'expand-brackets',
    mappings: caps(9, 'Patterns, functions and algebra: Algebraic expressions'),
  },
  {
    id: 'factorise-trinomial',
    topicId: 'algebra',
    name: 'Factorising trinomials',
    outcome: 'Factorise x² + bx + c and ax² + bx + c, taking out common factors first.',
    signature: 'x^2 + 5x + 6 = (x + 2)(x + 3)',
    grade: 10,
    prerequisites: ['expand-brackets'],
    templateId: 'factorise-trinomial',
    lessonId: 'factorise-trinomial',
    mappings: caps(10, 'Algebraic expressions'),
  },
  {
    id: 'exponents',
    topicId: 'algebra',
    name: 'Laws of exponents',
    outcome: 'Simplify and evaluate expressions with exponents, including zero and negative exponents.',
    signature: 'a^m \\times a^n = a^{m+n}',
    grade: 10,
    prerequisites: ['multiplication'],
    templateId: 'exponents',
    lessonId: 'exponents',
    mappings: caps(10, 'Exponents and surds'),
  },
  {
    id: 'linear-equations',
    topicId: 'equations',
    name: 'Solving linear equations',
    outcome: 'Solve linear equations, including brackets and unknowns on both sides.',
    signature: '2x + 4 = 10',
    grade: 8,
    prerequisites: ['integers'],
    templateId: 'linear-equations',
    lessonId: 'linear-equations',
    mappings: caps(8, 'Patterns, functions and algebra: Algebraic equations'),
  },
  {
    id: 'quadratic-equations',
    topicId: 'equations',
    name: 'Quadratic equations by factorising',
    outcome: 'Solve quadratic equations by factorising and using the zero-product rule.',
    signature: 'x^2 + 5x + 6 = 0',
    grade: 10,
    prerequisites: ['factorise-trinomial', 'linear-equations'],
    templateId: 'quadratic-equations',
    lessonId: 'quadratic-equations',
    mappings: caps(10, 'Equations and inequalities'),
  },
  {
    id: 'gradient',
    topicId: 'functions',
    name: 'Gradient between two points',
    outcome: 'Calculate the gradient of a line through two points and interpret it.',
    signature: 'm = \\dfrac{y_2 - y_1}{x_2 - x_1}',
    grade: 9,
    prerequisites: ['integers', 'fraction-simplify'],
    templateId: 'gradient',
    lessonId: 'gradient',
    mappings: caps(9, 'Patterns, functions and algebra: Graphs'),
  },
  {
    id: 'straight-line',
    topicId: 'functions',
    name: 'Straight-line graphs',
    outcome: 'Connect y = mx + c to its graph: gradient, intercepts and equation.',
    signature: 'y = mx + c',
    grade: 10,
    prerequisites: ['gradient', 'linear-equations'],
    templateId: 'straight-line',
    lessonId: 'straight-line',
    mappings: caps(10, 'Functions'),
  },
  {
    id: 'quadratic-formula',
    topicId: 'equations',
    name: 'The quadratic formula',
    outcome: 'Solve any quadratic equation with the formula and use the discriminant to describe its roots.',
    signature: 'x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
    grade: 11,
    prerequisites: ['quadratic-equations'],
    templateId: 'quadratic-formula',
    lessonId: 'quadratic-formula',
    mappings: caps(11, 'Equations and inequalities'),
  },
  {
    id: 'sequences',
    topicId: 'patterns',
    name: 'Arithmetic and geometric sequences',
    outcome: 'Find terms, general terms and sums of arithmetic and geometric sequences.',
    signature: 'T_n = a + (n-1)d',
    grade: 12,
    prerequisites: ['linear-equations'],
    templateId: 'sequences',
    lessonId: 'sequences',
    mappings: caps(12, 'Number patterns, sequences and series'),
  },
  {
    id: 'trig-ratios',
    topicId: 'trigonometry',
    name: 'Trigonometric ratios',
    outcome: 'Use sin, cos and tan to find sides and angles in right-angled triangles.',
    signature: '\\sin\\theta = \\dfrac{\\text{opp}}{\\text{hyp}}',
    grade: 10,
    prerequisites: ['linear-equations'],
    templateId: 'trig-ratios',
    lessonId: 'trig-ratios',
    mappings: caps(10, 'Trigonometry'),
  },
  {
    id: 'trig-special',
    topicId: 'trigonometry',
    name: 'Special angles and the Cartesian plane',
    outcome: 'Use exact values of special angles, define the ratios with x, y and r in any quadrant, and solve simple equations.',
    signature: '\\sin 30^\\circ = \\tfrac{1}{2}',
    grade: 10,
    prerequisites: ['trig-ratios'],
    templateId: 'trig-special',
    lessonId: 'trig-special',
    mappings: caps(10, 'Trigonometry: special angles; ratios in the Cartesian plane; simple equations'),
  },
  {
    id: 'trig-reduction',
    topicId: 'trigonometry',
    name: 'Reduction formulas and identities',
    outcome: 'Reduce any angle to an acute one with CAST, and simplify with the reduction formulas and basic identities.',
    signature: '\\sin(180^\\circ - x) = \\sin x',
    grade: 11,
    prerequisites: ['trig-special'],
    templateId: 'trig-reduction',
    lessonId: 'trig-reduction',
    mappings: caps(11, 'Trigonometry: reduction formulas; identities'),
  },
  {
    id: 'trig-equations',
    topicId: 'trigonometry',
    name: 'Trigonometric equations',
    outcome: 'Find all solutions of a trigonometric equation in an interval, and write the general solution.',
    signature: 'x = 30^\\circ + k \\cdot 360^\\circ',
    grade: 11,
    prerequisites: ['trig-reduction', 'factorise-trinomial'],
    templateId: 'trig-equations',
    lessonId: 'trig-equations',
    mappings: caps(11, 'Trigonometry: general solution of equations'),
  },
  {
    id: 'triangle-rules',
    topicId: 'trigonometry',
    name: 'Sine, cosine and area rules',
    outcome: 'Solve any triangle with the sine, cosine and area rules.',
    signature: '\\dfrac{a}{\\sin A} = \\dfrac{b}{\\sin B}',
    grade: 11,
    prerequisites: ['trig-special'],
    templateId: 'triangle-rules',
    lessonId: 'triangle-rules',
    mappings: caps(11, 'Trigonometry: sine, cosine and area rules'),
  },
  {
    id: 'compound-angles',
    topicId: 'trigonometry',
    name: 'Compound and double angles',
    outcome: 'Use the compound- and double-angle identities to evaluate, find exact values and simplify.',
    signature: '\\sin 2A = 2\\sin A\\cos A',
    grade: 12,
    prerequisites: ['trig-reduction'],
    templateId: 'compound-angles',
    lessonId: 'compound-angles',
    mappings: caps(12, 'Trigonometry: compound and double angle identities'),
  },
  {
    id: 'trig-2d-3d',
    topicId: 'trigonometry',
    name: 'Problems in 2D and 3D',
    outcome: 'Solve problems that link two triangles, in a plane and in three dimensions, with the sine, cosine and area rules.',
    signature: 'PQ = QR\\tan\\theta',
    grade: 12,
    prerequisites: ['triangle-rules'],
    templateId: 'trig-2d-3d',
    lessonId: 'trig-2d-3d',
    mappings: caps(12, 'Trigonometry: problems in two and three dimensions'),
  },
  {
    id: 'stats-summary',
    topicId: 'statistics',
    name: 'Mean, median, quartiles and box plots',
    outcome: 'Summarise data with the mean, median, mode, quartiles and five-number summary, draw and read box-and-whisker plots, and estimate the mean of grouped data.',
    signature: '\\bar{x} = \\dfrac{\\Sigma x}{n}',
    grade: 10,
    prerequisites: ['decimals'],
    templateId: 'stats-summary',
    lessonId: 'stats-summary',
    mappings: caps(10, 'Statistics: measures of central tendency and dispersion; five-number summary; box-and-whisker plots'),
  },
  {
    id: 'stats-spread',
    topicId: 'statistics',
    name: 'Standard deviation and ogives',
    outcome: 'Calculate variance and standard deviation, read ogives, and identify outliers.',
    signature: '\\sigma = \\sqrt{\\dfrac{\\Sigma(x - \\bar{x})^2}{n}}',
    grade: 11,
    prerequisites: ['stats-summary'],
    templateId: 'stats-spread',
    lessonId: 'stats-spread',
    mappings: caps(11, 'Statistics: ogives; variance and standard deviation; symmetric and skewed data; outliers'),
  },
  {
    id: 'stats-regression',
    topicId: 'statistics',
    name: 'Regression and correlation',
    outcome: 'Draw and interpret scatter plots, find the least squares regression line and the correlation coefficient, and make predictions.',
    signature: '\\hat{y} = a + bx',
    grade: 12,
    prerequisites: ['stats-spread', 'straight-line'],
    templateId: 'stats-regression',
    lessonId: 'stats-regression',
    mappings: caps(12, 'Statistics: scatter plots; least squares regression line; correlation coefficient'),
  },
  {
    id: 'finance',
    topicId: 'finance',
    name: 'Simple and compound interest',
    outcome: 'Calculate simple and compound interest, growth and depreciation.',
    signature: 'A = P(1 + i)^n',
    grade: 10,
    prerequisites: ['exponents'],
    templateId: 'finance',
    lessonId: 'finance',
    mappings: caps(10, 'Finance, growth and decay'),
  },
  {
    id: 'derivatives',
    topicId: 'calculus',
    name: 'Derivatives',
    outcome: 'Differentiate polynomials with the power rule and find the gradient of a tangent.',
    signature: "f'(x) = nx^{n-1}",
    grade: 12,
    prerequisites: ['straight-line', 'exponents'],
    templateId: 'derivatives',
    lessonId: 'derivatives',
    mappings: caps(12, 'Differential calculus'),
  },
  // Euclidean geometry (CAPS Paper 2): theorems as listed in the CAPS Grades 10–12 clarification column.
  {
    id: 'quadrilaterals',
    topicId: 'euclidean',
    name: 'Special quadrilaterals',
    outcome: 'Use the properties of parallelograms, rectangles and rhombuses to find angles and lengths, with reasons.',
    signature: '\\hat{A} = \\hat{C}, \\quad \\hat{A} + \\hat{B} = 180^\\circ',
    grade: 10,
    prerequisites: ['linear-equations'],
    templateId: 'quadrilaterals',
    lessonId: 'quadrilaterals',
    mappings: caps(10, 'Euclidean geometry and measurement: properties of special quadrilaterals'),
  },
  {
    id: 'midpoint-theorem',
    topicId: 'euclidean',
    name: 'The midpoint theorem',
    outcome: 'Use the midpoint theorem and its converse to find lengths and angles in triangles, with reasons.',
    signature: 'DE \\parallel BC, \\ DE = \\tfrac{1}{2}BC',
    grade: 10,
    prerequisites: ['quadrilaterals'],
    templateId: 'midpoint-theorem',
    lessonId: 'midpoint-theorem',
    mappings: caps(10, 'Euclidean geometry and measurement: the midpoint theorem'),
  },
  {
    id: 'circle-theorems',
    topicId: 'euclidean',
    name: 'Circle theorems: centre, chords and segments',
    outcome: 'Use the angle at the centre, angles in the same segment, the angle in a semicircle and the perpendicular from the centre to a chord.',
    signature: '\\angle AOB = 2\\angle ACB',
    grade: 11,
    prerequisites: ['midpoint-theorem'],
    templateId: 'circle-theorems',
    lessonId: 'circle-theorems',
    mappings: caps(11, 'Euclidean geometry and measurement: circle geometry (chords and angles)'),
  },
  {
    id: 'cyclic-tangents',
    topicId: 'euclidean',
    name: 'Cyclic quadrilaterals and tangents',
    outcome: 'Use cyclic quadrilaterals, tangents from a common point and the tan chord theorem to find angles, with reasons.',
    signature: '\\hat{A} + \\hat{C} = 180^\\circ',
    grade: 11,
    prerequisites: ['circle-theorems'],
    templateId: 'cyclic-tangents',
    lessonId: 'cyclic-tangents',
    mappings: caps(11, 'Euclidean geometry and measurement: circle geometry (cyclic quadrilaterals and tangents)'),
  },
  {
    id: 'proportionality',
    topicId: 'euclidean',
    name: 'Proportionality and similar triangles',
    outcome: 'Use the proportion theorem and similar triangles to find lengths, with reasons.',
    signature: '\\frac{AD}{DB} = \\frac{AE}{EC}',
    grade: 12,
    prerequisites: ['midpoint-theorem'],
    templateId: 'proportionality',
    lessonId: 'proportionality',
    mappings: caps(12, 'Euclidean geometry and measurement: proportionality and similarity'),
  },
  {
    id: 'coordinate-geometry',
    topicId: 'analytical',
    name: 'Distance, midpoint and gradient',
    outcome: 'Find the distance, midpoint and gradient between two points, and use parallel, perpendicular and collinear points.',
    signature: 'AB = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}',
    grade: 10,
    prerequisites: ['gradient'],
    templateId: 'coordinate-geometry',
    lessonId: 'coordinate-geometry',
    mappings: caps(10, 'Analytical geometry: distance, gradient and midpoint; parallel, perpendicular and collinear points'),
  },
  {
    id: 'line-equations',
    topicId: 'analytical',
    name: 'Equations of lines and inclination',
    outcome: 'Find the equation of a line through a point, parallel or perpendicular to another line, and use the angle of inclination.',
    signature: '\\tan\\theta = m',
    grade: 11,
    prerequisites: ['coordinate-geometry', 'straight-line'],
    templateId: 'line-equations',
    lessonId: 'line-equations',
    mappings: caps(11, 'Analytical geometry: equation of a line; inclination of a line'),
  },
  {
    id: 'circle-equations',
    topicId: 'analytical',
    name: 'Circles and tangents',
    outcome: 'Find and use the equation of a circle with any centre, and the equation of a tangent at a point on it.',
    signature: '(x - a)^2 + (y - b)^2 = r^2',
    grade: 12,
    prerequisites: ['line-equations'],
    templateId: 'circle-equations',
    lessonId: 'circle-equations',
    mappings: caps(12, 'Analytical geometry: equation of a circle; tangent to a circle'),
  },

  // ---------- Natural Sciences (Grades 4–9; Natural Sciences and Technology in Grades 4–6) ----------
  {
    id: 'living-nonliving',
    topicId: 'nst-life',
    name: 'Living and non-living things',
    outcome: 'Decide whether something is living, non-living or was once living, using the seven life processes.',
    signature: '\\text{MRS GREN}',
    grade: 4,
    prerequisites: [],
    templateId: 'living-nonliving',
    lessonId: 'living-nonliving',
    mappings: caps(4, 'Life and Living: Living and non-living things'),
  },
  {
    id: 'plant-needs',
    topicId: 'nst-life',
    name: 'What plants need to grow',
    outcome: 'Name the parts of a plant and what each does, and test what a plant needs to grow.',
    signature: '\\text{light} + \\text{water} + \\text{air} \\rightarrow \\text{growth}',
    grade: 4,
    prerequisites: [],
    templateId: 'plant-needs',
    lessonId: 'plant-needs',
    mappings: caps(4, 'Life and Living: What plants need to grow'),
  },
  {
    id: 'life-cycles',
    topicId: 'nst-life',
    name: 'Life cycles',
    outcome: 'Order the stages in the life cycles of animals and plants, including metamorphosis.',
    signature: '\\text{egg} \\rightarrow \\text{larva} \\rightarrow \\text{pupa} \\rightarrow \\text{adult}',
    grade: 5,
    prerequisites: ['living-nonliving'],
    templateId: 'life-cycles',
    lessonId: 'life-cycles',
    mappings: caps(5, 'Life and Living: Life cycles'),
  },
  {
    id: 'matter-properties',
    topicId: 'nst-matter',
    name: 'Solids, liquids and gases',
    outcome: 'Describe solids, liquids and gases by their properties, and explain melting and freezing.',
    signature: '\\text{solid} \\cdot \\text{liquid} \\cdot \\text{gas}',
    grade: 4,
    prerequisites: [],
    templateId: 'matter-properties',
    lessonId: 'matter-properties',
    mappings: caps(4, 'Matter and Materials: Solids, liquids and gases'),
  },
  {
    id: 'metals-nonmetals',
    topicId: 'nst-matter',
    name: 'Metals and non-metals',
    outcome: 'Test materials to sort them into metals and non-metals, and match materials to their uses.',
    signature: '\\text{shiny} \\cdot \\text{conducts} \\cdot \\text{magnetic?}',
    grade: 5,
    prerequisites: ['matter-properties'],
    templateId: 'metals-nonmetals',
    lessonId: 'metals-nonmetals',
    mappings: caps(5, 'Matter and Materials: Metals and non-metals'),
  },
  {
    id: 'mixtures',
    topicId: 'nst-matter',
    name: 'Mixtures and solutions',
    outcome: 'Tell soluble from insoluble, and choose a method to separate a mixture.',
    signature: '\\text{solute} + \\text{solvent} = \\text{solution}',
    grade: 6,
    prerequisites: ['matter-properties'],
    templateId: 'mixtures',
    lessonId: 'mixtures',
    mappings: caps(6, 'Matter and Materials: Mixtures; Solutions as special mixtures'),
  },
  {
    id: 'sound',
    topicId: 'nst-energy',
    name: 'Sound and vibrations',
    outcome: 'Explain how sounds are made, and what changes pitch and loudness.',
    signature: '\\text{vibration} \\rightarrow \\text{sound}',
    grade: 4,
    prerequisites: [],
    templateId: 'sound',
    lessonId: 'sound',
    mappings: caps(4, 'Energy and Change: Energy and sound'),
  },
  {
    id: 'simple-circuits',
    topicId: 'nst-energy',
    name: 'Simple electric circuits',
    outcome: 'Build complete circuits, choose conductors and insulators, and use switches.',
    signature: '\\text{cell} \\rightarrow \\text{bulb} \\rightarrow \\text{cell}',
    grade: 6,
    prerequisites: [],
    templateId: 'simple-circuits',
    lessonId: 'simple-circuits',
    mappings: caps(6, 'Energy and Change: Electric circuits'),
  },
  {
    id: 'earth-moon',
    topicId: 'nst-earth',
    name: 'The Sun, Earth and Moon',
    outcome: 'Explain day and night, years and the phases of the Moon.',
    signature: '\\text{1 day} = \\text{1 turn of Earth}',
    grade: 4,
    prerequisites: [],
    templateId: 'earth-moon',
    lessonId: 'earth-moon',
    mappings: caps(4, 'Planet Earth and Beyond: The Earth and the Sun; The Moon'),
  },
  {
    id: 'solar-system',
    topicId: 'nst-earth',
    name: 'The solar system',
    outcome: 'Know the order and features of the planets, and compare their sizes and distances.',
    signature: '\\text{Mercury} \\rightarrow \\dots \\rightarrow \\text{Neptune}',
    grade: 6,
    prerequisites: ['earth-moon'],
    templateId: 'solar-system',
    lessonId: 'solar-system',
    mappings: caps(6, 'Planet Earth and Beyond: The Solar System'),
  },
  {
    id: 'structures',
    topicId: 'nst-tech',
    name: 'Strong structures',
    outcome: 'Recognise frame, shell and solid structures, and make structures stronger with shapes and folds.',
    signature: '\\triangle \\text{ is rigid}',
    grade: 5,
    prerequisites: [],
    templateId: 'structures',
    lessonId: 'structures',
    mappings: caps(5, 'Technology: Structures (frame structures)'),
  },
  // Planet Earth and Beyond across Grades 5–9, plus the Senior Phase topics that complete each strand.
  {
    id: 'rocks-fossils',
    topicId: 'nst-earth',
    name: 'Rocks, soil and fossils',
    outcome: 'Tell soil types apart, explain how sedimentary rock forms, and use rock layers to tell which fossils are older.',
    signature: '\\text{deeper layer} \\Rightarrow \\text{older fossil}',
    grade: 5,
    prerequisites: [],
    templateId: 'rocks-fossils',
    lessonId: 'rocks-fossils',
    mappings: caps(5, 'Planet Earth and Beyond: Planet Earth (rocks and soil); Sedimentary rocks; Fossils'),
  },
  {
    id: 'periodic-table',
    topicId: 'nst-matter',
    name: 'The Periodic Table',
    outcome: 'Find elements by name, symbol and atomic number, and sort them into metals, non-metals and semi-metals.',
    signature: '{}_{11}\\text{Na} \\quad {}_{8}\\text{O} \\quad {}_{14}\\text{Si}',
    grade: 7,
    prerequisites: ['metals-nonmetals'],
    templateId: 'periodic-table',
    lessonId: 'periodic-table',
    mappings: caps(7, 'Matter and Materials: Introduction to the Periodic Table of Elements'),
  },
  {
    id: 'seasons',
    topicId: 'nst-earth',
    name: 'The Sun and the seasons',
    outcome: "Explain the seasons and day length from the tilt of the Earth, and how the Sun's energy keeps life going.",
    signature: '23{,}5^\\circ \\text{ tilt} \\Rightarrow \\text{seasons}',
    grade: 7,
    prerequisites: ['earth-moon'],
    templateId: 'seasons',
    lessonId: 'seasons',
    mappings: caps(7, 'Planet Earth and Beyond: Relationship of the Sun to the Earth'),
  },
  {
    id: 'moon-tides',
    topicId: 'nst-earth',
    name: 'The Moon, gravity and tides',
    outcome: "Explain how the Moon's gravity causes tides, and when spring and neap tides happen.",
    signature: '\\text{Sun, Earth, Moon in line} \\Rightarrow \\text{spring tide}',
    grade: 7,
    prerequisites: ['earth-moon'],
    templateId: 'moon-tides',
    lessonId: 'moon-tides',
    mappings: caps(7, 'Planet Earth and Beyond: Relationship of the Moon to the Earth'),
  },
  {
    id: 'visible-light',
    topicId: 'nst-energy',
    name: 'Visible light',
    outcome: 'Use the law of reflection, explain colour and refraction, and describe how white light splits into a spectrum.',
    signature: '\\angle i = \\angle r',
    grade: 8,
    prerequisites: [],
    templateId: 'visible-light',
    lessonId: 'visible-light',
    mappings: caps(8, 'Energy and Change: Visible light'),
  },
  {
    id: 'beyond-solar-system',
    topicId: 'nst-earth',
    name: 'Beyond the Solar System',
    outcome: 'Use light-years to compare distances to the planets, the nearest stars and other galaxies, and explain how we look into space.',
    signature: '1 \\text{ light-year} \\approx 9{,}5 \\times 10^{12} \\text{ km}',
    grade: 8,
    prerequisites: ['solar-system'],
    templateId: 'beyond-solar-system',
    lessonId: 'beyond-solar-system',
    mappings: caps(8, 'Planet Earth and Beyond: The Solar System; Beyond the Solar System; Looking into space'),
  },
  {
    id: 'earth-systems',
    topicId: 'nst-earth',
    name: 'The Earth as a system and the rock cycle',
    outcome: 'Name the four spheres of the Earth, follow rocks through the rock cycle, and explain how minerals are mined and refined.',
    signature: '\\text{magma} \\to \\text{rock} \\to \\text{sediment}',
    grade: 9,
    prerequisites: ['rocks-fossils'],
    templateId: 'earth-systems',
    lessonId: 'earth-systems',
    mappings: caps(9, 'Planet Earth and Beyond: The Earth as a system; Lithosphere; Mining of mineral resources'),
  },
  {
    id: 'atmosphere',
    topicId: 'nst-earth',
    name: 'The atmosphere',
    outcome: 'Name the layers of the atmosphere by how temperature changes with height, and explain the greenhouse effect.',
    signature: 'T \\downarrow \\text{ as height} \\uparrow \\ (\\text{troposphere})',
    grade: 9,
    prerequisites: ['earth-systems'],
    templateId: 'atmosphere',
    lessonId: 'atmosphere',
    mappings: caps(9, 'Planet Earth and Beyond: Atmosphere'),
  },
  {
    id: 'star-life',
    topicId: 'nst-earth',
    name: 'Birth, life and death of stars',
    outcome: "Describe how stars form, shine by fusion and die, and how a star's mass decides its fate.",
    signature: '\\text{nebula} \\to \\text{star} \\to \\text{white dwarf}',
    grade: 9,
    prerequisites: ['beyond-solar-system'],
    templateId: 'star-life',
    lessonId: 'star-life',
    mappings: caps(9, 'Planet Earth and Beyond: Birth, life and death of stars'),
  },

  // ---------- Physical Sciences ----------
  // Grades 7–9 skills below are CAPS Natural Sciences (see their topicId); Physical Sciences itself is Grades 10–12.
  {
    id: 'states-of-matter',
    topicId: 'nst-matter',
    name: 'States of matter and the particle model',
    outcome: 'Predict whether a substance is solid, liquid or gas, and explain it with particles.',
    signature: '\\text{solid} \\rightleftharpoons \\text{liquid} \\rightleftharpoons \\text{gas}',
    grade: 8,
    prerequisites: [],
    templateId: 'states-of-matter',
    lessonId: 'states-of-matter',
    mappings: caps(8, 'Matter and Materials: Particle model of matter'),
  },
  {
    id: 'density',
    topicId: 'nst-matter',
    name: 'Density: will it float?',
    outcome: 'Calculate density, mass or volume, and predict floating and sinking.',
    signature: '\\rho = \\dfrac{m}{V}',
    grade: 8,
    prerequisites: ['states-of-matter'],
    templateId: 'density',
    lessonId: 'density',
    mappings: caps(8, 'Matter and Materials: Particle model of matter (density)'),
  },
  {
    id: 'heat-transfer',
    topicId: 'nst-energy',
    name: 'Heat transfer',
    outcome: 'Explain conduction, convection and radiation, and choose conductors and insulators.',
    signature: '\\text{hot} \\xrightarrow{\\;Q\\;} \\text{cold}',
    grade: 7,
    prerequisites: [],
    templateId: 'heat-transfer',
    lessonId: 'heat-transfer',
    mappings: caps(7, 'Energy and Change: Heat transfer'),
  },
  {
    id: 'mechanical-energy',
    topicId: 'mechanics',
    name: 'Potential and kinetic energy',
    outcome: 'Calculate gravitational potential and kinetic energy, and use conservation of energy.',
    signature: 'mgh = \\tfrac{1}{2}mv^2',
    grade: 10,
    prerequisites: ['speed-distance-time'],
    templateId: 'mechanical-energy',
    lessonId: 'mechanical-energy',
    mappings: caps(10, 'Mechanics: Energy (gravitational potential and kinetic energy)'),
  },
  {
    id: 'circuits',
    topicId: 'nst-energy',
    name: 'Series and parallel circuits',
    outcome: 'Compare series and parallel circuits, and calculate resistance and current in parallel.',
    signature: '\\tfrac{1}{R_p} = \\tfrac{1}{R_1} + \\tfrac{1}{R_2}',
    grade: 9,
    prerequisites: [],
    templateId: 'circuits',
    lessonId: 'circuits',
    mappings: caps(9, 'Energy and Change: Series and parallel circuits'),
  },
  {
    id: 'speed-distance-time',
    topicId: 'mechanics',
    name: 'Speed, distance and time',
    outcome: 'Calculate speed, distance or time, converting units where needed.',
    signature: 'v = \\dfrac{\\Delta x}{\\Delta t}',
    grade: 10,
    prerequisites: [],
    templateId: 'speed-distance-time',
    lessonId: 'speed-distance-time',
    mappings: caps(10, 'Mechanics: Motion in one dimension'),
  },
  {
    id: 'newtons-second-law',
    topicId: 'mechanics',
    name: "Newton's second law",
    outcome: 'Use F = ma with net force, including friction.',
    signature: 'F_{\\text{net}} = ma',
    grade: 11,
    prerequisites: ['speed-distance-time'],
    templateId: 'newtons-second-law',
    lessonId: 'newtons-second-law',
    mappings: caps(11, "Mechanics: Newton's laws and application of Newton's laws"),
  },
  {
    id: 'projectile-motion',
    topicId: 'mechanics',
    name: 'Vertical projectile motion',
    outcome: 'Predict flight time, maximum height and range without air resistance.',
    signature: 'y = v_0 t - \\tfrac{1}{2} g t^2',
    grade: 12,
    prerequisites: ['newtons-second-law'],
    templateId: 'projectile-motion',
    lessonId: 'projectile-motion',
    mappings: caps(12, 'Mechanics: Vertical projectile motion in one dimension'),
  },
  {
    id: 'ohms-law',
    topicId: 'electricity',
    name: "Ohm's law and series circuits",
    outcome: 'Use V = IR and add resistances in series.',
    signature: 'V = IR',
    grade: 11,
    prerequisites: [],
    templateId: 'ohms-law',
    lessonId: 'ohms-law',
    mappings: caps(11, "Electricity and magnetism: Electric circuits (Ohm's law)"),
  },
  {
    id: 'atomic-structure',
    topicId: 'matter',
    name: 'Atomic structure',
    outcome: 'Work out protons, neutrons and electrons for atoms and ions.',
    signature: '{}^{23}_{11}\\text{Na}',
    grade: 10,
    prerequisites: [],
    templateId: 'atomic-structure',
    lessonId: 'atomic-structure',
    mappings: caps(10, 'Matter and materials: The atom'),
  },
  {
    id: 'acids-bases',
    topicId: 'nst-matter',
    name: 'Acids, bases and pH',
    outcome: 'Use the pH scale and indicators, and predict the products of neutralisation.',
    signature: '\\text{acid} + \\text{base} \\rightarrow \\text{salt} + \\text{water}',
    grade: 9,
    prerequisites: [],
    templateId: 'acids-bases',
    lessonId: 'acids-bases',
    mappings: caps(9, 'Matter and Materials: Acids & bases, and pH value'),
  },
  {
    id: 'moles',
    topicId: 'chemical-change',
    name: 'The mole',
    outcome: 'Convert between mass and amount of substance using molar mass.',
    signature: 'n = \\dfrac{m}{M}',
    grade: 10,
    prerequisites: ['atomic-structure'],
    templateId: 'moles',
    lessonId: 'moles',
    mappings: caps(10, 'Chemical change: Quantitative aspects of chemical change'),
  },
  {
    id: 'balancing-equations',
    topicId: 'nst-matter',
    name: 'Balancing chemical equations',
    outcome: 'Balance equations so that atoms are conserved.',
    signature: '2\\text{H}_2 + \\text{O}_2 \\rightarrow 2\\text{H}_2\\text{O}',
    grade: 9,
    prerequisites: ['states-of-matter'],
    templateId: 'balancing-equations',
    lessonId: 'balancing-equations',
    mappings: caps(9, 'Matter and Materials: Chemical reactions (balanced equations)'),
  },
  // ---------- Life Sciences ----------
  // Grades 7–9 skills below are CAPS Natural Sciences (Life and Living); Life Sciences itself is Grades 10–12.
  {
    id: 'classification',
    topicId: 'nst-life',
    name: 'Classifying animals',
    outcome: 'Sort animals into vertebrate classes and arthropod groups from their features.',
    signature: '\\text{backbone?} \\rightarrow \\text{vertebrate}',
    grade: 7,
    prerequisites: [],
    templateId: 'classification',
    lessonId: 'classification',
    mappings: caps(7, 'Life and Living: Biodiversity'),
  },
  {
    id: 'food-chains',
    topicId: 'nst-life',
    name: 'Food chains and energy flow',
    outcome: 'Read food chains, follow energy through trophic levels, and predict knock-on effects.',
    signature: '\\text{grass} \\rightarrow \\text{impala} \\rightarrow \\text{lion}',
    grade: 8,
    prerequisites: [],
    templateId: 'food-chains',
    lessonId: 'food-chains',
    mappings: caps(8, 'Life and Living: Interactions and interdependence within the environment'),
  },
  {
    id: 'photosynthesis',
    topicId: 'nst-life',
    name: 'Photosynthesis and respiration',
    outcome: 'Explain what plants take in and give out, what limits photosynthesis, and the net gas balance.',
    signature: '\\text{CO}_2 + \\text{H}_2\\text{O} \\xrightarrow{\\text{light}} \\text{glucose} + \\text{O}_2',
    grade: 8,
    prerequisites: [],
    templateId: 'photosynthesis',
    lessonId: 'photosynthesis',
    mappings: caps(8, 'Life and Living: Photosynthesis and respiration'),
  },
  {
    id: 'body-systems',
    topicId: 'nst-life',
    name: 'Circulation, breathing and digestion',
    outcome: 'Trace blood, air and food through the body, and say what each organ does.',
    signature: '\\text{RA} \\rightarrow \\text{RV} \\rightarrow \\text{lungs} \\rightarrow \\text{LA} \\rightarrow \\text{LV}',
    grade: 9,
    prerequisites: [],
    templateId: 'body-systems',
    lessonId: 'body-systems',
    mappings: caps(9, 'Life and Living: Systems in the human body; Circulatory and respiratory systems; Digestive system'),
  },
  {
    id: 'cell-structure',
    topicId: 'cells',
    name: 'Cell structure and function',
    outcome: 'Identify organelles, their functions, and how plant and animal cells differ.',
    signature: '\\text{structure} \\leftrightarrow \\text{function}',
    grade: 10,
    prerequisites: [],
    templateId: 'cell-structure',
    lessonId: 'cell-structure',
    mappings: caps(10, 'Life at the molecular, cellular and tissue level: Cells, the basic units of life'),
  },
  {
    id: 'cell-division',
    topicId: 'cells',
    name: 'Cell division: mitosis',
    outcome: 'Order the phases of mitosis, track chromosomes and chromatids, and explain what mitosis is for.',
    signature: '2n \\xrightarrow{\\text{mitosis}} 2n,\\ 2n',
    grade: 10,
    prerequisites: ['cell-structure'],
    templateId: 'cell-division',
    lessonId: 'cell-division',
    mappings: caps(10, 'Life at the molecular, cellular and tissue level: Cell division (mitosis)'),
  },
  {
    id: 'monohybrid-crosses',
    topicId: 'genetics',
    name: 'Monohybrid crosses',
    outcome: 'Use Punnett squares to predict genotype and phenotype probabilities.',
    signature: '\\text{Aa} \\times \\text{Aa} \\rightarrow 1 : 2 : 1',
    grade: 12,
    prerequisites: ['fraction-simplify'],
    templateId: 'monohybrid-crosses',
    lessonId: 'monohybrid-crosses',
    mappings: caps(12, 'Life at the molecular, cellular and tissue level: Genetics and inheritance'),
  },
  ...FOUNDATION_SKILLS,
];

// ---------- Lookups ----------

const skillById = new Map(SKILLS.map((s) => [s.id, s]));
const topicById = new Map(TOPICS.map((t) => [t.id, t]));
const subjectById = new Map(SUBJECTS.map((s) => [s.id, s]));

export const getSkill = (id: string): Skill | undefined => skillById.get(id);
export const getTopic = (id: string): Topic | undefined => topicById.get(id);
export const getSubject = (id: string): Subject | undefined => subjectById.get(id as SubjectId);

export function subjectOfSkill(skill: Skill): SubjectId {
  return (topicById.get(skill.topicId) as Topic).subjectId;
}

export const skillsInTopic = (topicId: string): Skill[] => SKILLS.filter((s) => s.topicId === topicId);
export const topicsInSubject = (subjectId: SubjectId): Topic[] => TOPICS.filter((t) => t.subjectId === subjectId);
export const skillsInSubject = (subjectId: SubjectId): Skill[] => SKILLS.filter((s) => subjectOfSkill(s) === subjectId);

export const isFoundationSkill = (s: Skill): boolean => s.phase === 'foundation';

/**
 * Natural Sciences (Grades 4–9) leads into Physical Sciences and Life Sciences (Grades 10–12), strand by strand.
 * A learner's band follows that path in both directions: a Grade 9 learner reaches Grade 10 physics and biology,
 * and a Grade 10 Physical Sciences learner can catch up on Grade 6–9 Matter and Materials and Energy and Change.
 */
const FEEDS: Record<string, SubjectId> = { 'nst-matter': 'physical-sciences', 'nst-energy': 'physical-sciences', 'nst-life': 'life-sciences' };

function onPath(s: Skill, subjects: SubjectId[]): boolean {
  const sid = subjectOfSkill(s);
  if (subjects.includes(sid)) return true;
  if (sid === 'natural-sciences') return !!FEEDS[s.topicId] && subjects.includes(FEEDS[s.topicId] as SubjectId);
  return (sid === 'physical-sciences' || sid === 'life-sciences') && subjects.includes('natural-sciences');
}

/**
 * Skills that are relevant for a learner: in their subjects (or on the CAPS path into or out of them),
 * taught up to one grade ahead, and no more than four grades behind (foundations still matter).
 * Grades 1–3 get the Foundation Phase skills of their own grade and the grade before (to catch up);
 * Grade 4 and up never get Foundation Phase skills here: they are played in the Junior experience.
 */
export function skillsForLearner(subjects: SubjectId[], grade: number): Skill[] {
  if (grade <= 3) return SKILLS.filter((s) => isFoundationSkill(s) && subjects.includes(subjectOfSkill(s)) && s.grade <= grade && s.grade >= grade - 1);
  return SKILLS.filter((s) => !isFoundationSkill(s) && onPath(s, subjects) && s.grade <= grade + BAND_AHEAD && s.grade >= grade - 4);
}

export const FOUNDATION_SUBJECTS: SubjectId[] = ['mathematics', 'home-language', 'english-fal', 'life-skills'];

/**
 * Which subjects make sense at a grade, following CAPS. Bonisa teaches mathematics and the sciences:
 * Grades 4–9 take Natural Sciences (Natural Sciences and Technology in Grades 4–6);
 * Physical Sciences and Life Sciences start in Grade 10.
 */
export function subjectsForGrade(grade: number): SubjectId[] {
  if (grade <= 3) return FOUNDATION_SUBJECTS;
  if (grade <= 9) return ['mathematics', 'natural-sciences'];
  return ['mathematics', 'physical-sciences', 'life-sciences'];
}

/** A subject's CAPS name for a grade: Natural Sciences is "Natural Sciences and Technology" in Grades 4–6. */
export function subjectName(id: SubjectId | string, grade: number): string {
  if (id === 'natural-sciences' && grade >= 4 && grade <= 6) return 'Natural Sciences and Technology';
  return getSubject(id)?.name ?? id;
}

/** Why the subject matters, in the words of the learner's phase. */
export function subjectPitch(id: SubjectId, grade: number): string {
  if (id === 'natural-sciences') {
    if (grade >= 4 && grade <= 6) return 'Living things, materials, energy, Earth and space, and how people design and build structures.';
    return 'Life and Living, Matter and Materials, Energy and Change, Planet Earth and Beyond. It leads to Physical Sciences and Life Sciences in Grade 10.';
  }
  return getSubject(id)?.pitch ?? '';
}

/** What to tick by default for a new learner at a grade. */
export function defaultSubjects(grade: number): SubjectId[] {
  if (grade <= 3) return FOUNDATION_SUBJECTS;
  return grade <= 9 ? ['mathematics', 'natural-sciences'] : ['mathematics', 'physical-sciences'];
}
