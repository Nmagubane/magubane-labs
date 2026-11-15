/**
 * What a learner can add as an exam: a paper (Mathematics Paper 1, Physical Sciences Paper 2), a whole-subject
 * exam, or a class test, and which skills each one can contain.
 *
 * Paper splits (FACT, DBE examination guidelines):
 * - Mathematics Paper 1: algebra, equations and inequalities; patterns, sequences and series; functions and
 *   graphs; finance, growth and decay; differential calculus; counting and probability.
 *   Paper 2: statistics and regression; analytical geometry; trigonometry; Euclidean geometry and measurement.
 *   Trigonometric functions are examined in Paper 2 only, so trig graphs (in our Functions topic) are Paper 2.
 * - Physical Sciences, Grades 10–12: Paper 1 is Physics, Paper 2 is Chemistry.
 * Life Sciences also writes two papers, but its split is not checked yet, so it is offered as one exam.
 * Papers exist only in Grades 10–12 (the FET phase).
 */
import { type Skill, type SubjectId, getTopic, isFoundationSkill, skillsInSubject, subjectName } from './catalogue.ts';

export type PaperNo = 1 | 2;
export type ExamKind = 'paper' | 'exam' | 'test';

/** Subjects that write two papers in Grades 10–12, and how each paper is named. */
export const PAPERS: Partial<Record<SubjectId, Record<PaperNo, string>>> = {
  mathematics: { 1: 'Paper 1', 2: 'Paper 2' },
  'physical-sciences': { 1: 'Paper 1 (Physics)', 2: 'Paper 2 (Chemistry)' },
};

const PAPER_BY_TOPIC: Record<string, PaperNo> = {
  // Mathematics
  algebra: 1,
  equations: 1,
  patterns: 1,
  functions: 1,
  finance: 1,
  probability: 1,
  calculus: 1,
  statistics: 2,
  analytical: 2,
  trigonometry: 2,
  euclidean: 2,
  measurement: 2,
  // Physical Sciences
  mechanics: 1,
  electricity: 1,
  waves: 1,
  matter: 2,
  'chemical-change': 2,
  'chemical-systems': 2,
};

/** Skills examined in a different paper from the rest of their topic, and the topic they are listed under there. */
const PAPER_BY_SKILL: Record<string, PaperNo> = { 'trig-graphs': 2 };
const PAPER_TOPIC: Record<string, string> = { 'trig-graphs': 'trigonometry' };

const FET = (s: Skill) => s.grade >= 10 && s.grade <= 12;

/** The paper a Grade 10–12 skill is examined in, or null if its subject has no papers. */
export function skillPaper(skill: Skill): PaperNo | null {
  const topic = getTopic(skill.topicId);
  if (!topic || !PAPERS[topic.subjectId] || !FET(skill)) return null;
  return PAPER_BY_SKILL[skill.id] ?? PAPER_BY_TOPIC[skill.topicId] ?? null;
}

export interface ExamOptionSkill {
  skillId: string;
  name: string;
  topicId: string;
  topicName: string;
  grade: number;
  /** Ticked when the form opens. */
  ticked: boolean;
}

export interface ExamOption {
  /** `mathematics:p1`, `mathematics:test`, `life-sciences:exam` */
  id: string;
  subjectId: SubjectId;
  kind: ExamKind;
  paper: PaperNo | null;
  /** "Mathematics Paper 1", also the exam's name if the learner gives none. */
  label: string;
  /** One line under the topic list: what is listed and what is ticked. */
  note: string;
  skills: ExamOptionSkill[];
}

/** The label of an exam already stored: its subject, and its paper if it has one. */
export function examLabel(subjectId: SubjectId, paper: PaperNo | null, grade: number): string {
  const name = subjectName(subjectId, grade);
  const p = paper ? PAPERS[subjectId]?.[paper] : undefined;
  return p ? `${name} ${p}` : name;
}

/**
 * The skills an exam in this subject can contain for this learner: never above their grade (an exam can't
 * test what hasn't been taught yet), Grades 10–12 only for a Grade 10–12 learner, and up to three grades back
 * for Grades 4–9, where earlier work is the foundation.
 */
function examSkills(subjectId: SubjectId, grade: number): Skill[] {
  const lowest = grade >= 10 ? 10 : Math.max(4, grade - 3);
  return skillsInSubject(subjectId)
    .filter((s) => !isFoundationSkill(s) && s.grade <= grade && s.grade >= lowest)
    .sort((a, b) => a.grade - b.grade);
}

/**
 * Ticked when the form opens: the learner's own grade. A Grade 12 final covers Grades 10–12, so a Grade 12
 * learner gets all three. With nothing at their grade, the latest grade that has skills.
 */
function defaultTicked(skills: Skill[], grade: number): Set<string> {
  if (grade === 12) return new Set(skills.map((s) => s.id));
  const own = skills.filter((s) => s.grade === grade);
  if (own.length) return new Set(own.map((s) => s.id));
  const latest = Math.max(...skills.map((s) => s.grade));
  return new Set(skills.filter((s) => s.grade === latest).map((s) => s.id));
}

function option(subjectId: SubjectId, kind: ExamKind, paper: PaperNo | null, skills: Skill[], grade: number): ExamOption {
  const ticked = kind === 'test' ? new Set<string>() : defaultTicked(skills, grade);
  const name = subjectName(subjectId, grade);
  const label = kind === 'paper' ? examLabel(subjectId, paper, grade) : kind === 'test' ? `${name} class test` : `${name} exam`;
  const earlier = skills.some((s) => s.grade < grade);
  const note =
    kind === 'test'
      ? 'Tick what your test covers.'
      : `${kind === 'paper' ? `Only ${PAPERS[subjectId]?.[paper as PaperNo]} topics are listed. ` : ''}${grade === 12 && kind === 'paper' ? 'The final exam covers Grades 10 to 12, so all of them are ticked.' : `Your grade's skills are ticked${earlier ? '; earlier grades are there if your exam builds on them' : ''}.`} Untick anything your teacher said won't be examined.`;
  return {
    id: `${subjectId}:${kind === 'paper' ? `p${paper}` : kind}`,
    subjectId,
    kind,
    paper,
    label,
    note,
    skills: skills.map((s) => {
      // In a paper, a skill is listed under the topic it is examined with: trig graphs with Trigonometry.
      const topicId = (kind === 'paper' && PAPER_TOPIC[s.id]) || s.topicId;
      return { skillId: s.id, name: s.name, topicId, topicName: getTopic(topicId)?.name ?? '', grade: s.grade, ticked: ticked.has(s.id) };
    }),
  };
}

/** Everything a learner can add, in the order of their subjects: papers first, then a class test. */
export function examOptions(subjects: SubjectId[], grade: number): ExamOption[] {
  const out: ExamOption[] = [];
  for (const subjectId of subjects) {
    const all = examSkills(subjectId, grade);
    if (!all.length) continue;
    if (grade >= 10 && PAPERS[subjectId]) {
      for (const paper of [1, 2] as const) {
        const inPaper = all.filter((s) => skillPaper(s) === paper);
        if (inPaper.length) out.push(option(subjectId, 'paper', paper, inPaper, grade));
      }
    } else {
      out.push(option(subjectId, 'exam', null, all, grade));
    }
    out.push(option(subjectId, 'test', null, all, grade));
  }
  return out;
}

/** The skills ticked by default for an option, used when an exam is created without a list. */
export const defaultSkillIds = (o: ExamOption): string[] => {
  const ticked = o.skills.filter((s) => s.ticked).map((s) => s.skillId);
  return ticked.length ? ticked : [...defaultTicked(o.skills.map((s) => ({ id: s.skillId, grade: s.grade }) as Skill), Math.max(...o.skills.map((s) => s.grade)))];
};
