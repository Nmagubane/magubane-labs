/**
 * The curriculum graph: Subject → Topic → Skill. Mastery is tracked per skill.
 * This is data. Moving it into the database (or an authoring tool) later must not change the shape.
 *
 * Curriculum mappings are PROVISIONAL: grade + strand only, and must be verified against
 * the official CAPS documents before the product claims alignment.
 */

export type SubjectId = 'mathematics' | 'physical-sciences' | 'life-sciences';
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
    grades: [4, 5, 6, 7, 8, 9, 10, 11, 12],
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
  lessonId: string;
  mappings: Partial<Record<CurriculumId, { grade: number; strand: string }>>;
}

export const SUBJECTS: Subject[] = [
  {
    id: 'mathematics',
    name: 'Mathematics',
    pitch: 'The language of engineering, medicine, finance and every science. Pure maths keeps every door open.',
  },
  {
    id: 'physical-sciences',
    name: 'Physical Sciences',
    pitch: 'Physics and chemistry: how matter, energy and forces behave, and how to predict them.',
  },
  {
    id: 'life-sciences',
    name: 'Life Sciences',
    pitch: 'How living things are built, inherit traits and stay alive. It is the road to medicine.',
  },
];

export const TOPICS: Topic[] = [
  { id: 'number', subjectId: 'mathematics', name: 'Number' },
  { id: 'fractions', subjectId: 'mathematics', name: 'Fractions' },
  { id: 'algebra', subjectId: 'mathematics', name: 'Algebraic expressions' },
  { id: 'equations', subjectId: 'mathematics', name: 'Equations' },
  { id: 'functions', subjectId: 'mathematics', name: 'Functions and graphs' },
  { id: 'mechanics', subjectId: 'physical-sciences', name: 'Mechanics', strand: 'Physics' },
  { id: 'electricity', subjectId: 'physical-sciences', name: 'Electric circuits', strand: 'Physics' },
  { id: 'matter', subjectId: 'physical-sciences', name: 'Matter and atoms', strand: 'Chemistry' },
  { id: 'chemical-change', subjectId: 'physical-sciences', name: 'Chemical change', strand: 'Chemistry' },
  { id: 'cells', subjectId: 'life-sciences', name: 'Cells', strand: 'Biology' },
  { id: 'genetics', subjectId: 'life-sciences', name: 'Genetics', strand: 'Biology' },
];

const caps = (grade: number, strand: string) => ({ 'za-caps': { grade, strand }, intl: { grade, strand } });

export const SKILLS: Skill[] = [
  // ---------- Mathematics ----------
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
    mappings: caps(7, 'Numbers, operations and relationships'),
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
    mappings: caps(7, 'Numbers, operations and relationships'),
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
    mappings: caps(6, 'Common fractions'),
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
    mappings: caps(7, 'Common fractions'),
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
    mappings: caps(7, 'Common fractions'),
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
    mappings: caps(8, 'Algebraic expressions'),
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
    mappings: caps(9, 'Algebraic expressions'),
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
    id: 'linear-equations',
    topicId: 'equations',
    name: 'Solving linear equations',
    outcome: 'Solve linear equations, including brackets and unknowns on both sides.',
    signature: '2x + 4 = 10',
    grade: 8,
    prerequisites: ['integers'],
    templateId: 'linear-equations',
    lessonId: 'linear-equations',
    mappings: caps(8, 'Algebraic equations'),
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
    mappings: caps(9, 'Graphs'),
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
  // ---------- Physical Sciences ----------
  {
    id: 'speed-distance-time',
    topicId: 'mechanics',
    name: 'Speed, distance and time',
    outcome: 'Calculate speed, distance or time, converting units where needed.',
    signature: 'v = \\dfrac{\\Delta x}{\\Delta t}',
    grade: 9,
    prerequisites: [],
    templateId: 'speed-distance-time',
    lessonId: 'speed-distance-time',
    mappings: caps(10, 'Mechanics: motion in one dimension'),
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
    mappings: caps(11, "Mechanics: Newton's laws"),
  },
  {
    id: 'projectile-motion',
    topicId: 'mechanics',
    name: 'Projectile motion',
    outcome: 'Predict flight time, maximum height and range without air resistance.',
    signature: 'y = v_0 t - \\tfrac{1}{2} g t^2',
    grade: 12,
    prerequisites: ['newtons-second-law'],
    templateId: 'projectile-motion',
    lessonId: 'projectile-motion',
    mappings: caps(12, 'Mechanics: vertical projectile motion'),
  },
  {
    id: 'ohms-law',
    topicId: 'electricity',
    name: "Ohm's law and series circuits",
    outcome: 'Use V = IR and add resistances in series.',
    signature: 'V = IR',
    grade: 10,
    prerequisites: [],
    templateId: 'ohms-law',
    lessonId: 'ohms-law',
    mappings: caps(10, 'Electricity and magnetism: electric circuits'),
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
    mappings: caps(10, 'Matter and materials: the atom'),
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
    mappings: caps(10, 'Chemical change: quantitative aspects'),
  },
  {
    id: 'balancing-equations',
    topicId: 'chemical-change',
    name: 'Balancing chemical equations',
    outcome: 'Balance equations so that atoms are conserved.',
    signature: '2\\text{H}_2 + \\text{O}_2 \\rightarrow 2\\text{H}_2\\text{O}',
    grade: 9,
    prerequisites: ['atomic-structure'],
    templateId: 'balancing-equations',
    lessonId: 'balancing-equations',
    mappings: caps(10, 'Chemical change: representing reactions'),
  },
  // ---------- Life Sciences ----------
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
    mappings: caps(10, 'Life at the molecular, cellular and tissue level'),
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
    mappings: caps(12, 'Genetics and inheritance'),
  },
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

/**
 * Skills that are relevant for a learner: in their subjects, taught up to one grade ahead,
 * and no more than four grades behind (foundations still matter).
 */
export function skillsForLearner(subjects: SubjectId[], grade: number): Skill[] {
  return SKILLS.filter((s) => subjects.includes(subjectOfSkill(s)) && s.grade <= grade + 1 && s.grade >= grade - 4);
}
