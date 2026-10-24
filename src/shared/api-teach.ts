/** Educator mode: the API contract for classes, assignments and reports. */
import { z } from 'zod';
import { SUBJECT_IDS, type SubjectId } from './curriculum/catalogue.ts';
import type { MasteryBand } from './mastery/model.ts';
import type { MistakeKind } from './questions/mistakes.ts';
import type { ProgressResponse } from './api.ts';

export const CreateClassBody = z.object({
  name: z.string().trim().min(1, 'Name the class').max(60),
  grade: z.number().int().min(4).max(12),
  subjectId: z.enum(SUBJECT_IDS),
});
export const UpdateClassBody = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  weeklyReports: z.boolean().optional(),
  archived: z.boolean().optional(),
});
export const CreateAssignmentBody = z.object({
  kind: z.enum(['lesson', 'practice', 'test']),
  skillId: z.string().max(60),
  dueAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a due date'),
  note: z.string().trim().max(280).optional(),
  questionCount: z.number().int().min(3).max(20).optional(),
});
export const SendReportBody = z.object({ note: z.string().trim().max(500).optional() });

export type LearnerFlag = 'inactive' | 'struggling' | 'overdue' | 'new';

export interface ClassSummaryDto {
  id: string;
  name: string;
  grade: number;
  subjectId: SubjectId;
  subjectName: string;
  joinCode: string;
  learnerCount: number;
  activeThisWeek: number;
  avgMastery: number | null;
  openAssignments: number;
  weeklyReports: boolean;
  archived: boolean;
}

export interface AssignmentDto {
  id: string;
  classId: string;
  kind: 'lesson' | 'practice' | 'test';
  skillId: string;
  skillName: string;
  title: string;
  note: string | null;
  questionCount: number | null;
  dueAt: string;
  createdAt: string;
  /** Teacher view. */
  completed?: number;
  total?: number;
  avgScore?: number | null;
}

export interface ClassLearnerDto {
  id: string;
  name: string;
  joinedAt: string;
  lastActiveAt: string | null;
  minutes7d: number;
  questions7d: number;
  accuracy7d: number | null;
  avgMastery: number | null;
  skillsStarted: number;
  overdue: number;
  flags: LearnerFlag[];
  hasGuardianEmail: boolean;
}

export interface HeatCell {
  mastery: number;
  band: MasteryBand;
  evidence: number;
}

export interface ClassDetailDto {
  class: ClassSummaryDto;
  teacherName: string;
  school: string | null;
  learners: ClassLearnerDto[];
  skills: { skillId: string; name: string; topic: string; grade: number; classAvg: number | null; started: number }[];
  heat: Record<string, Record<string, HeatCell>>;
  mistakes: { code: string; label: string; kind: MistakeKind; tip: string; count: number; learners: number; skills: string[] }[];
  assignments: AssignmentDto[];
  lastReportAt: string | null;
}

export interface TeacherLearnerDto {
  learner: { id: string; name: string; grade: number | null; isMinor: boolean; hasGuardianEmail: boolean; classes: string[] };
  progress: ProgressResponse | null;
  recentResults: { activityId: string; title: string; kind: string; scorePct: number | null; completedAt: string }[];
  assignments: (AssignmentDto & { done: boolean; scorePct: number | null })[];
  lastReportAt: string | null;
}

/** What a learner sees about their classes. */
export interface MyClassDto {
  id: string;
  name: string;
  teacherName: string;
  school: string | null;
  joinedAt: string;
}

export interface MyAssignmentDto extends AssignmentDto {
  className: string;
  teacherName: string;
  done: boolean;
  scorePct: number | null;
  overdue: boolean;
}

export interface ReportSentDto {
  sentTo: { role: 'guardian' | 'teacher' | 'learner'; email: string; status: 'sent' | 'logged' | 'failed' }[];
}
