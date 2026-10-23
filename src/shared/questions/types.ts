import type { Rng } from './rng.ts';
import type { MistakeCode } from './mistakes.ts';

export type Difficulty = 1 | 2 | 3 | 4 | 5;
export const DIFFICULTIES: readonly Difficulty[] = [1, 2, 3, 4, 5];

/**
 * Rich text: plain text with inline maths in $…$ and display maths in $$…$$.
 * **bold** is supported. Nothing else — content stays simple and safe to render.
 */
export type RichText = string;

/** What the learner sees and types into. Never contains the answer. */
export type InputSpec =
  | { kind: 'numeric'; unit?: string; prefix?: string; placeholder?: string }
  | { kind: 'fraction'; prefix?: string }
  | { kind: 'expression'; prefix?: string; variables: string[] }
  | { kind: 'roots'; count: number; variable: string }
  | { kind: 'coefficients'; species: string[]; arrowAfter: number }
  | { kind: 'choice'; options: { id: string; text: RichText }[] };

/** Server-only. How the response is graded. */
export type AnswerSpec =
  | { kind: 'numeric'; value: number; tolerance: number; relative?: boolean }
  | { kind: 'fraction'; n: number; d: number; requireSimplest: boolean }
  | { kind: 'expression'; expr: string; form?: 'expanded' | 'factorised' }
  | { kind: 'roots'; values: { n: number; d: number }[] }
  | { kind: 'coefficients'; values: number[] }
  | { kind: 'choice'; id: string };

/** A predicted wrong answer that reveals a specific misconception. Same shape as the answer. */
export interface Misconception {
  code: MistakeCode;
  answer: AnswerSpec;
  /** Specific to this question: "You subtracted 4 from the left side only." */
  feedback: RichText;
}

export type Figure =
  | {
      kind: 'graph';
      xRange: [number, number];
      yRange: [number, number];
      lines?: { m: number; c: number; label?: string }[];
      points?: { x: number; y: number; label?: string }[];
    }
  | { kind: 'circuit'; voltage: number | null; resistors: (number | null)[]; current: number | null }
  | { kind: 'punnett'; parentA: string; parentB: string; reveal: boolean };

export interface GeneratedQuestion {
  prompt: RichText;
  figure?: Figure;
  input: InputSpec;
  answer: AnswerSpec;
  /** How the correct answer is displayed after marking, e.g. "$x = 3$". */
  answerDisplay: RichText;
  /** Ladder: each hint gives a little more. Never the answer itself. */
  hints: RichText[];
  /** Worked solution, one reasoning step per entry. */
  solution: RichText[];
  misconceptions: Misconception[];
}

export interface QuestionTemplate {
  id: string;
  skillId: string;
  generate(rng: Rng, level: Difficulty): GeneratedQuestion;
}

/** What the client receives for a question. */
export interface QuestionPayload {
  id: string;
  skillId: string;
  difficulty: Difficulty;
  prompt: RichText;
  figure?: Figure;
  input: InputSpec;
  hintsAvailable: number;
}
