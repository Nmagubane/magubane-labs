/** Every Junior (Grades 1–3) question template. */
import type { QuestionTemplate } from '../questions/types.ts';
import { MATHS_NUMBER_TEMPLATES } from './gen/maths-number.ts';
import { MATHS_CALC_TEMPLATES } from './gen/maths-calc.ts';
import { MATHS_SPACE_TEMPLATES } from './gen/maths-space.ts';
import { LITERACY_TEMPLATES } from './gen/literacy.ts';
import { LIFESKILLS_TEMPLATES } from './gen/lifeskills.ts';

export const JUNIOR_TEMPLATES: QuestionTemplate[] = [...MATHS_NUMBER_TEMPLATES, ...MATHS_CALC_TEMPLATES, ...MATHS_SPACE_TEMPLATES, ...LITERACY_TEMPLATES, ...LIFESKILLS_TEMPLATES];
