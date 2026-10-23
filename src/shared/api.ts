/**
 * The API contract shared by client and server. Request bodies are validated with zod on the server;
 * responses are typed here so the client can't drift from what the server sends.
 */
import { z } from 'zod';
import type { QuestionPayload, RichText, Figure, InputSpec, Difficulty } from './questions/types.ts';
import type { MasteryBand } from './mastery/model.ts';
import type { RecAction } from './mastery/recommend.ts';
import type { PlanDay, PlanAction } from './mastery/readiness.ts';
import type { MistakeKind } from './questions/mistakes.ts';
import type { CurriculumId, SubjectId } from './curriculum/catalogue.ts';
import type { ResponseValue } from './questions/answer.ts';

export type { QuestionPayload, ResponseValue };

// ---------- Requests ----------

export const PRIVACY_VERSION = '2026-10-pilot';

export const SignupBody = z
  .object({
    displayName: z.string().trim().min(1, 'Tell us your name').max(40),
    email: z.string().trim().toLowerCase().email('Enter a valid email address').max(120),
    password: z.string().min(8, 'Use at least 8 characters').max(200),
    accessCode: z.string().trim().max(40).optional(),
    ageGroup: z.enum(['adult', 'minor'], { errorMap: () => ({ message: 'Tell us whether you are under 18' }) }),
    guardianName: z.string().trim().max(80).optional(),
    guardianEmail: z.string().trim().toLowerCase().max(120).optional(),
    consent: z.literal(true, { errorMap: () => ({ message: 'Consent is needed to create an account' }) }),
  })
  .superRefine((v, ctx) => {
    if (v.ageGroup !== 'minor') return;
    if (!v.guardianName) ctx.addIssue({ code: 'custom', path: ['guardianName'], message: "Enter your parent or guardian's name" });
    if (!v.guardianEmail || !z.string().email().safeParse(v.guardianEmail).success) ctx.addIssue({ code: 'custom', path: ['guardianEmail'], message: "Enter your parent or guardian's email" });
    else if (v.guardianEmail === v.email) ctx.addIssue({ code: 'custom', path: ['guardianEmail'], message: "This must be your parent or guardian's own email, not yours" });
  });

export const DeleteAccountBody = z.object({ password: z.string().min(1).max(200) });

export interface PublicConfig {
  signupMode: 'invite' | 'open' | 'closed';
  contactEmail: string | null;
  tutorEnabled: boolean;
  privacyVersion: string;
}
export const LoginBody = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(1).max(200),
});

export const GOALS = ['pass-exams', 'pure-maths', 'catch-up', 'get-ahead', 'stem-career'] as const;
export type Goal = (typeof GOALS)[number];

export const ProfileBody = z.object({
  grade: z.number().int().min(4).max(12),
  curriculumId: z.enum(['za-caps', 'intl']),
  subjects: z.array(z.enum(['mathematics', 'physical-sciences', 'life-sciences'])).min(1).max(3),
  goals: z.array(z.enum(GOALS)).max(5),
  dailyMinutes: z.number().int().min(10).max(180),
});

export const CreateActivityBody = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('practice'), skillId: z.string().max(60).optional(), weak: z.boolean().optional(), count: z.number().int().min(3).max(20).optional() }),
  z.object({
    kind: z.literal('test'),
    skillId: z.string().max(60).optional(),
    topicId: z.string().max(60).optional(),
    examId: z.string().max(60).optional(),
    weak: z.boolean().optional(),
    count: z.number().int().min(3).max(30).optional(),
    timed: z.boolean().optional(),
  }),
  z.object({ kind: z.literal('baseline') }),
  z.object({ kind: z.literal('lesson'), skillId: z.string().max(60) }),
]);
export type CreateActivityRequest = z.infer<typeof CreateActivityBody>;

export const NextQuestionBody = z.object({
  adjust: z.enum(['easier', 'harder', 'same']).optional(),
  level: z.number().int().min(1).max(5).optional(),
});

const responseValue = z.union([z.string().max(300), z.array(z.string().max(60)).max(8)]);
export const AnswerBody = z.object({
  response: responseValue.nullable(),
  timeMs: z.number().int().min(0).max(3_600_000),
  confidence: z.enum(['guess', 'unsure', 'sure']).optional(),
  skipped: z.boolean().optional(),
});
export type AnswerRequest = z.infer<typeof AnswerBody>;

export const ExamBody = z.object({
  title: z.string().trim().min(1).max(80),
  subjectId: z.enum(['mathematics', 'physical-sciences', 'life-sciences']),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  skillIds: z.array(z.string().max(60)).min(1).max(40).optional(),
});

export const TutorConversationBody = z.object({
  skillId: z.string().max(60).optional(),
  questionId: z.string().max(60).optional(),
});
export const TutorMessageBody = z.object({ content: z.string().trim().min(1).max(2000) });

// ---------- Responses ----------

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export interface UserDto {
  id: string;
  displayName: string;
  email: string;
  role: 'student' | 'parent' | 'teacher';
}

export interface ProfileDto {
  grade: number;
  curriculumId: CurriculumId;
  subjects: SubjectId[];
  goals: Goal[];
  dailyMinutes: number;
  baselineCompleted: boolean;
}

export interface MeResponse {
  user: UserDto | null;
  profile: ProfileDto | null;
}

export interface SkillSummary {
  skillId: string;
  mastery: number;
  band: MasteryBand;
  evidence: number;
  lastPracticedAt: string | null;
  reviewDue: boolean;
}

export interface CatalogueResponse {
  grade: number;
  subjects: {
    id: SubjectId;
    name: string;
    topics: { id: string; name: string; strand?: string; skills: (SkillSummary & { name: string; outcome: string; signature: string; grade: number; inScope: boolean; lessonCompleted: boolean })[] }[];
  }[];
}

export interface SkillDetailResponse {
  skill: { id: string; name: string; outcome: string; signature: string; grade: number; topicName: string; subjectName: string; prerequisites: { id: string; name: string; mastery: number }[] };
  state: SkillSummary;
  lesson: import('./content/types.ts').Lesson;
  lessonCompleted: boolean;
  recentMistakes: { code: string; label: string; tip: string; count: number }[];
  nextBand: { band: MasteryBand; answers: number } | null;
}

export interface WorkedExample {
  prompt: RichText;
  figure?: Figure;
  solution: RichText[];
  answerDisplay: RichText;
}

export type ActivityKind = 'lesson' | 'practice' | 'test' | 'baseline';
export type ActivityMode = 'learning' | 'assessment';

export interface ActivityDto {
  id: string;
  kind: ActivityKind;
  mode: ActivityMode;
  status: 'in_progress' | 'completed' | 'abandoned';
  title: string;
  skillIds: string[];
  targetCount: number;
  startedAt: string;
  completedAt: string | null;
  timeLimitSec: number | null;
  remainingSec: number | null;
  difficultyOffset: number;
}

export interface MistakeDto {
  code: string;
  label: string;
  kind: MistakeKind;
  tip: string;
}

export interface FeedbackDto {
  questionId: string;
  correct: boolean;
  skipped: boolean;
  mistake: MistakeDto | null;
  feedback: RichText | null;
  answerDisplay: RichText;
  solution: RichText[];
  masteryBefore: number;
  masteryAfter: number;
  band: MasteryBand;
}

export interface PracticeItem {
  question: QuestionPayload;
  response: ResponseValue | null;
  hints: RichText[];
  feedback: FeedbackDto | null;
}

export interface ActivityStateResponse {
  activity: ActivityDto;
  /** Learning mode: answered items plus the current one. Assessment: every question, no feedback. */
  items: PracticeItem[];
  answered: number;
}

export interface AnswerResponse {
  /** Learning mode: immediate feedback. Assessment: just saved. */
  feedback: FeedbackDto | null;
  saved: boolean;
  answered: number;
  done: boolean;
}

export interface ReviewItem {
  question: QuestionPayload;
  response: ResponseValue | null;
  skipped: boolean;
  correct: boolean;
  mistake: MistakeDto | null;
  feedback: RichText | null;
  answerDisplay: RichText;
  solution: RichText[];
  timeMs: number;
  confidence: 'guess' | 'unsure' | 'sure' | null;
}

export interface ResultsDto {
  activityId: string;
  kind: ActivityKind;
  title: string;
  completedAt: string;
  scorePct: number;
  correct: number;
  total: number;
  timeTakenSec: number;
  perTopic: { topicId: string; name: string; correct: number; total: number; pct: number }[];
  perSkill: { skillId: string; name: string; correct: number; total: number; masteryBefore: number; masteryAfter: number }[];
  mistakes: (MistakeDto & { count: number })[];
  calibration: { sureWrong: number; unsureRight: number; answeredWithConfidence: number } | null;
  biggestOpportunity: { skillId: string; name: string; reason: string } | null;
  items: ReviewItem[];
}

export interface RecommendationDto {
  skillId: string;
  skillName: string;
  topicName: string;
  signature: string;
  action: RecAction;
  reasons: string[];
  mastery: number;
  band: MasteryBand;
  estMinutes: number;
  nextBand: { band: MasteryBand; answers: number } | null;
}

export interface HomeResponse {
  firstName: string;
  grade: number;
  minutesToday: number;
  dailyMinutes: number;
  priority: RecommendationDto | null;
  alternatives: RecommendationDto[];
  activeTest: { id: string; title: string; remainingSec: number | null } | null;
  activePractice: { id: string; title: string; answered: number; targetCount: number } | null;
  weakAreas: { skillId: string; name: string; mastery: number }[];
  recentResults: { activityId: string; title: string; kind: ActivityKind; scorePct: number; completedAt: string }[];
  exam: { id: string; title: string; examDate: string; daysLeft: number; readiness: number; confidence: 'low' | 'medium' | 'high'; highRisk: number } | null;
  week: { questions: number; accuracy: number | null; activeDays: number };
}

export interface ProgressResponse {
  subjects: {
    id: SubjectId;
    name: string;
    mastery: number | null;
    started: number;
    total: number;
    topics: {
      id: string;
      name: string;
      strand?: string;
      mastery: number | null;
      skills: (SkillSummary & { name: string; trend30: number | null })[];
    }[];
  }[];
  trend: { day: string; mastery: number | null; questions: number }[];
  strongest: { topicId: string; name: string; mastery: number }[];
  weakest: { topicId: string; name: string; mastery: number }[];
  mistakes: (MistakeDto & { count: number; skills: string[] })[];
  totals: { minutesAllTime: number; minutes30: number; questions: number; testsCompleted: number; streakDays: number; accuracy30: number | null; improvement30: number | null };
}

export interface ExamDto {
  id: string;
  title: string;
  subjectId: SubjectId;
  examDate: string;
  skillIds: string[];
  daysLeft: number;
  readiness: number;
  confidence: 'low' | 'medium' | 'high';
}

export interface ExamDetailResponse {
  exam: ExamDto;
  readiness: {
    score: number;
    confidence: 'low' | 'medium' | 'high';
    assessed: number;
    total: number;
    answers: number;
    strong: { skillId: string; name: string; mastery: number }[];
    needsWork: { skillId: string; name: string; mastery: number }[];
    highRisk: { skillId: string; name: string; mastery: number; assessed: boolean }[];
  };
  plan: { days: (Omit<PlanDay, 'items'> & { items: (PlanDay['items'][number] & { done: boolean })[] })[]; overflow: { skillId: string; name: string }[] };
}

export type { PlanAction };

export interface TutorStatusResponse {
  configured: boolean;
  locked: boolean;
  usedToday: number;
  dailyLimit: number;
}

export interface TutorMessageDto {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface TutorConversationDto {
  id: string;
  title: string;
  context: { skillId?: string; skillName?: string; questionId?: string; questionPrompt?: string } | null;
  updatedAt: string;
}

export interface TutorConversationDetail extends TutorConversationDto {
  messages: TutorMessageDto[];
  suggestions: string[];
}

/** Server-sent events from the tutor stream. */
export type TutorStreamEvent = { type: 'delta'; text: string } | { type: 'done'; messageId: string } | { type: 'error'; code: string; message: string };

export type { Difficulty, InputSpec };
