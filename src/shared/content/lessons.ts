import type { Lesson } from './types.ts';
import { MATHS_LESSONS } from './lessons-maths.ts';
import { SCIENCE_LESSONS } from './lessons-science.ts';

export const LESSONS: Lesson[] = [...MATHS_LESSONS, ...SCIENCE_LESSONS];

const byId = new Map(LESSONS.map((l) => [l.id, l]));
export const getLesson = (id: string): Lesson | undefined => byId.get(id);
