/** Junior (Grades 1–3): the API contract for child profiles, picture sign-in, the child's screens and adult views. */
import { z } from 'zod';
import { passwordProblem } from './password.ts';
import { LANGUAGE_CODES, type LanguageCode } from './junior/languages.ts';
import { PICTURE_IDS, CODE_LENGTH } from './junior/pictures.ts';
import type { SubjectId } from './curriculum/catalogue.ts';
import type { MasteryBand } from './mastery/model.ts';
import type { MistakeKind } from './questions/mistakes.ts';
import type { JuniorReason } from './junior/recommend.ts';

const pictureCode = z.array(z.enum(PICTURE_IDS)).length(CODE_LENGTH, 'Choose 3 pictures');
const childName = z
  .string()
  .trim()
  .min(1, 'Enter the child’s first name')
  .max(30, 'Keep it short: a first name is enough')
  .regex(/^[\p{L}\p{M}' -]+$/u, 'Letters only, please');

export const CreateChildBody = z.object({
  name: childName,
  grade: z.number().int().min(1).max(3),
  homeLanguage: z.enum(LANGUAGE_CODES),
  pictureCode: pictureCode.optional(),
  /** Teachers only: where weekly reports go. Parents get them at their own address. */
  guardianEmail: z.string().trim().toLowerCase().email('Enter a valid email address').max(120).optional().or(z.literal('')),
  consent: z.literal(true, { errorMap: () => ({ message: 'Consent from a parent or guardian is needed' }) }),
});
export type CreateChildRequest = z.infer<typeof CreateChildBody>;

export const UpdateChildBody = z.object({
  name: childName.optional(),
  grade: z.number().int().min(1).max(3).optional(),
  homeLanguage: z.enum(LANGUAGE_CODES).optional(),
});
export const PictureCodeBody = z.object({ code: pictureCode.optional() });
export const DeviceBody = z.object({ classId: z.string().max(60).optional(), label: z.string().trim().max(40).optional() });
export const JuniorLoginBody = z.object({ childId: z.string().min(1).max(60), code: pictureCode });
export const CardLogBody = z.object({ cardId: z.string().min(1).max(60), note: z.string().trim().max(280).optional() });
export const DeleteChildBody = z.object({ confirmName: z.string().trim().max(30) });
/**
 * Grade 3 → Grade 4: the child gets their own email login and the full learner app.
 * The grown-up chooses the email and password with the child; the password rules are the same as everyone's.
 */
export const MoveUpBody = z
  .object({
    email: z.string().trim().toLowerCase().email('Enter a valid email address').max(120),
    password: z.string().max(200),
    /** Teachers only: the parent or guardian to tell (and send weekly reports to). */
    guardianEmail: z.string().trim().toLowerCase().email('Enter a valid email address').max(120).optional().or(z.literal('')),
    consent: z.literal(true, { errorMap: () => ({ message: 'Consent from a parent or guardian is needed' }) }),
  })
  .superRefine((v, ctx) => {
    const problem = passwordProblem(v.password, { email: v.email });
    if (problem) ctx.addIssue({ code: 'custom', path: ['password'], message: problem });
  });
export type MoveUpRequest = z.infer<typeof MoveUpBody>;

// ---------- responses ----------

export interface DeviceChildDto {
  id: string;
  name: string;
  colour: string;
  locked: boolean;
}
/** What an unsigned-in device shows: whose children can sign in here. */
export type JuniorDeviceDto = { set: false } | { set: true; label: string; children: DeviceChildDto[] };

export interface JuniorSkillCard {
  skillId: string;
  name: string;
  topic: string;
  grade: number;
  mastery: number;
  band: MasteryBand;
  reason: JuniorReason | null;
}

export interface JuniorHomeDto {
  name: string;
  grade: number;
  homeLanguage: LanguageCode;
  /** The language instructions are spoken and written in (English until a reviewed pack exists). */
  instructionLanguage: LanguageCode;
  worlds: { subjectId: SubjectId; next: JuniorSkillCard }[];
  minutesToday: number;
}

export interface JuniorWorldDto {
  subjectId: SubjectId;
  topics: { id: string; name: string; skills: JuniorSkillCard[] }[];
}

export interface ChildSummaryDto {
  id: string;
  name: string;
  grade: number;
  homeLanguage: LanguageCode;
  colour: string;
  lastActiveAt: string | null;
  minutes7d: number;
  answers7d: number;
  skillsStarted: number;
  /** Set once the child has moved up to Grade 4 and logs in with email: no picture sign-in, no Junior page. */
  movedUp: { at: string; email: string } | null;
}

export interface DeviceDto {
  id: string;
  label: string;
  scope: 'family' | 'class';
  className: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  /** This is the device the request came from. */
  current: boolean;
  scopeId: string;
}

export interface FamilyDto {
  children: ChildSummaryDto[];
  devices: DeviceDto[];
  thisDevice: boolean;
}

export interface ChildOverviewDto {
  child: {
    id: string;
    name: string;
    grade: number;
    homeLanguage: LanguageCode;
    instructionLanguage: LanguageCode;
    readingAvailable: boolean;
    createdAt: string;
    lastActiveAt: string | null;
    /** Shown to the adults who manage this child, so they can help them sign in. */
    pictureCode: string[] | null;
    canManage: boolean;
    guardianEmail: string | null;
  };
  week: { minutes: number; answers: number; firstTryPct: number | null; daysActive: number };
  subjects: { id: SubjectId; name: string; avgMastery: number | null; skills: { id: string; name: string; topic: string; grade: number; mastery: number; band: MasteryBand; evidence: number; lastPracticedAt: string | null }[] }[];
  next: (JuniorSkillCard & { subjectId: SubjectId; why: string })[];
  mistakes: { code: string; label: string; kind: MistakeKind; tip: string; count: number; skills: string[] }[];
  recent: { title: string; completedAt: string; firstTry: number; total: number }[];
  cardsDone: { cardId: string; title: string; doneAt: string }[];
  /** "I can…" statements earned, newest first. */
  ican: IcanDto[];
}

/** One "I can…" statement a child has earned. */
export interface IcanDto {
  skillId: string;
  subjectId: SubjectId;
  /** "I can count to 50." */
  text: string;
  /** "You can count to 50 now!" */
  spoken: string;
  earnedAt: string;
}

export interface CreatedChildDto {
  child: ChildSummaryDto;
  pictureCode: string[];
}

export interface ClassChildrenCardsDto {
  className: string;
  grade: number;
  children: { id: string; name: string; colour: string; pictureCode: string[] }[];
}

/** "Try one like it": at most this many second tries in one 5-question set. */
export const MAX_JUNIOR_RETRIES = 3;
