import type { QuestionTemplate, GeneratedQuestion, Difficulty, GenContext } from './types.ts';
import { createRng } from './rng.ts';
import { gradeResponse, canonicalResponse } from './answer.ts';
import { integers, orderOfOperations, fractionSimplify, fractionAdd, fractionMultiply } from './generators/math-number.ts';
import { likeTerms, expandBrackets, factoriseTrinomial, linearEquations, quadraticEquations } from './generators/math-algebra.ts';
import { gradient, straightLine } from './generators/math-functions.ts';
import { speedDistanceTime, newtonsSecondLaw, projectileMotion, ohmsLaw } from './generators/science-physics.ts';
import { atomicStructure, moles, balancingEquations } from './generators/science-chemistry.ts';
import { cellStructure, monohybridCrosses } from './generators/science-biology.ts';
import { statesOfMatter, density, acidsBases } from './generators/science-matter.ts';
import { heatTransfer, mechanicalEnergy, circuits } from './generators/science-energy.ts';
import { classification, foodChains, photosynthesis, bodySystems, cellDivision } from './generators/science-life.ts';
import { placeValue, multiplication, fractionsBasic, decimals, perimeterArea } from './generators/math-lower.ts';
import { exponents, quadraticFormula, sequences, trigRatios, finance, derivatives } from './generators/math-upper.ts';
import { livingNonliving, plantNeeds, lifeCycles, matterProperties, metalsNonmetals, mixtures } from './generators/nst-life-matter.ts';
import { sound, simpleCircuits, earthMoon, solarSystem, structures } from './generators/nst-energy-earth.ts';
import { JUNIOR_TEMPLATES } from '../junior/templates.ts';

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
  statesOfMatter,
  density,
  acidsBases,
  heatTransfer,
  mechanicalEnergy,
  circuits,
  classification,
  foodChains,
  photosynthesis,
  bodySystems,
  cellDivision,
  placeValue,
  multiplication,
  fractionsBasic,
  decimals,
  perimeterArea,
  exponents,
  quadraticFormula,
  sequences,
  trigRatios,
  finance,
  derivatives,
  livingNonliving,
  plantNeeds,
  lifeCycles,
  matterProperties,
  metalsNonmetals,
  mixtures,
  sound,
  simpleCircuits,
  earthMoon,
  solarSystem,
  structures,
  ...JUNIOR_TEMPLATES,
];

const byId = new Map(TEMPLATES.map((t) => [t.id, t]));

export function getTemplate(id: string): QuestionTemplate {
  const t = byId.get(id);
  if (!t) throw new Error(`Unknown question template: ${id}`);
  return t;
}

/** Deterministic: the same (template, seed, level) always gives the same question. */
export function generateQuestion(templateId: string, seed: number, level: Difficulty, ctx?: GenContext): GeneratedQuestion {
  const q = getTemplate(templateId).generate(createRng(seed), level, ctx);
  // A predicted misconception that happens to equal the right answer (e.g. symmetric roots) is not a misconception.
  q.misconceptions = q.misconceptions.filter((m) => !gradeResponse(q.answer, canonicalResponse(m.answer)).correct);
  return q;
}
