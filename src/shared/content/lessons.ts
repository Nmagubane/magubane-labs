import type { Lesson } from './types.ts';
import { MATHS_LESSONS } from './lessons-maths.ts';
import { SCIENCE_LESSONS } from './lessons-science.ts';
import { SCIENCE_LESSONS_2 } from './lessons-science-2.ts';
import { NST_LESSONS } from './lessons-nst.ts';
import { MATHS_LESSONS_2 } from './lessons-maths-2.ts';

export const LESSONS: Lesson[] = [...MATHS_LESSONS, ...MATHS_LESSONS_2, ...NST_LESSONS, ...SCIENCE_LESSONS, ...SCIENCE_LESSONS_2];

const byId = new Map(LESSONS.map((l) => [l.id, l]));
export const getLesson = (id: string): Lesson | undefined => byId.get(id);
