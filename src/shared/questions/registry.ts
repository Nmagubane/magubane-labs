import type { QuestionTemplate, GeneratedQuestion, Difficulty } from './types.ts';
import { createRng } from './rng.ts';
import { gradeResponse, canonicalResponse } from './answer.ts';
import { integers, orderOfOperations, fractionSimplify, fractionAdd, fractionMultiply } from './generators/math-number.ts';
import { likeTerms, expandBrackets, factoriseTrinomial, linearEquations, quadraticEquations } from './generators/math-algebra.ts';
import { gradient, straightLine } from './generators/math-functions.ts';
import { speedDistanceTime, newtonsSecondLaw, projectileMotion, ohmsLaw } from './generators/science-physics.ts';
import { atomicStructure, moles, balancingEquations } from './generators/science-chemistry.ts';
import { cellStructure, monohybridCrosses } from './generators/science-biology.ts';

export const TEMPLATES: QuestionTemplate[] = [
  integers,
  orderOfOperations,
  fractionSimplify,
  fractionAdd,
  fractionMultiply,
  likeTerms,
  expandBrackets,
  factoriseTrinomial,
  linearEquations,
  quadraticEquations,
  gradient,
  straightLine,
  speedDistanceTime,
  newtonsSecondLaw,
  projectileMotion,
  ohmsLaw,
  atomicStructure,
  moles,
  balancingEquations,
  cellStructure,
  monohybridCrosses,
];

const byId = new Map(TEMPLATES.map((t) => [t.id, t]));

export function getTemplate(id: string): QuestionTemplate {
  const t = byId.get(id);
  if (!t) throw new Error(`Unknown question template: ${id}`);
  return t;
}

/** Deterministic: the same (template, seed, level) always gives the same question. */
export function generateQuestion(templateId: string, seed: number, level: Difficulty): GeneratedQuestion {
  const q = getTemplate(templateId).generate(createRng(seed), level);
  // A predicted misconception that happens to equal the right answer (e.g. symmetric roots) is not a misconception.
  q.misconceptions = q.misconceptions.filter((m) => !gradeResponse(q.answer, canonicalResponse(m.answer)).correct);
  return q;
}
