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
  | { kind: 'choice'; options: ChoiceOption[] }
  // ---- Junior (Grades 1–3): touch-first inputs. See src/shared/junior. ----
  /** A big number pad. Graded as numeric. */
  | { kind: 'pad'; max: number; prefix?: string; unit?: string }
  /** Make a number with real classroom materials. Graded as numeric (cents for coins). */
  | { kind: 'build'; tool: 'counters' | 'tenframe' | 'base10' | 'coins'; max: number; coins?: number[] }
  /** Tap every tile that fits. Graded as a set. */
  | { kind: 'pick'; options: Tile[] }
  /** Tap the tiles in order. Graded as a sequence. */
  | { kind: 'order'; items: Tile[] }
  /** Put each tile in a box. Graded as groups. */
  | { kind: 'sort'; bins: Tile[]; items: Tile[] }
  /** Put a marker on a number line. Graded as numeric. */
  | { kind: 'numberline'; min: number; max: number; step: number; labelEvery: number }
  /** Turn the clock's hands. Graded as minutes after 12:00 (0–719). */
  | { kind: 'clock'; step: 60 | 30 | 15 | 5 }
  /** Build a word from letter tiles. Graded as text. */
  | { kind: 'spell'; tiles: string[]; length: number };

/** A tappable thing in a Junior activity: a word, a picture, or both. */
export interface Tile {
  id: string;
  text?: string;
  /** An emoji or a shape token like "shape:triangle". */
  icon?: string;
  /** What the voice says when the tile is tapped or read out. Defaults to text. */
  say?: string;
}

export interface ChoiceOption {
  id: string;
  text: RichText;
  icon?: string;
  say?: string;
}

/** Server-only. How the response is graded. */
export type AnswerSpec =
  | { kind: 'numeric'; value: number; tolerance: number; relative?: boolean }
  | { kind: 'fraction'; n: number; d: number; requireSimplest: boolean }
  | { kind: 'expression'; expr: string; form?: 'expanded' | 'factorised' }
  | { kind: 'roots'; values: { n: number; d: number }[] }
  | { kind: 'coefficients'; values: number[] }
  | { kind: 'choice'; id: string }
  | { kind: 'set'; ids: string[] }
  | { kind: 'sequence'; ids: string[] }
  | { kind: 'groups'; pairs: Record<string, string> }
  | { kind: 'text'; value: string };

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

/**
 * What a Junior learner looks at. Drawn by the client from data, never an image of the answer.
 * Every scene is safe to show before answering (it never encodes the answer itself).
 */
export type Scene =
  | { kind: 'objects'; icon: string; count: number; arrange: 'scatter' | 'rows' | 'tenframes' | 'groups'; groupSize?: number; crossed?: number; second?: { icon: string; count: number } }
  | { kind: 'base10'; hundreds: number; tens: number; ones: number }
  | { kind: 'coins'; items: number[] }
  | { kind: 'clockface'; minutes: number }
  | { kind: 'track'; cells: (number | null)[] }
  | { kind: 'iconrow'; items: (string | null)[] }
  | { kind: 'fraction'; shape: 'circle' | 'rect' | 'bar'; parts: number; shaded: number; equal: boolean }
  | { kind: 'picture'; icon: string; caption?: string }
  | { kind: 'text'; text: string; size: 'sum' | 'word' | 'sentence' | 'story'; title?: string }
  | { kind: 'pictograph'; rows: { label: string; icon: string; count: number }[]; each: number }
  | { kind: 'tally'; rows: { label: string; count: number }[] }
  | { kind: 'bars'; bars: { label: string; value: number }[]; max: number; step: number }
  | { kind: 'compare'; mode: 'length' | 'height' | 'mass' | 'capacity'; items: { id: string; icon: string; label: string; size: number }[] }
  | { kind: 'grid'; rows: number; cols: number; cells: { r: number; c: number; icon: string }[] }
  | { kind: 'squares'; rows: number; cols: number; filled: [number, number][] }
  | { kind: 'ruler'; icon: string; lengthCm: number; maxCm: number; unit: 'cm' | 'block' }
  | { kind: 'shapes'; items: { shape: string; label?: string }[] }
  | { kind: 'week'; days: string[]; highlight: number | null };

export interface GeneratedQuestion {
  prompt: RichText;
  figure?: Figure;
  /** Junior only: what to show. */
  scene?: Scene;
  /** Junior only: the prompt as it should be spoken (may differ from the written prompt). */
  say?: string;
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

/** Junior generators speak the child's language. Senior generators ignore this. */
export interface GenContext {
  lang: string;
}

export interface QuestionTemplate {
  id: string;
  skillId: string;
  generate(rng: Rng, level: Difficulty, ctx?: GenContext): GeneratedQuestion;
}

/** What the client receives for a question. */
export interface QuestionPayload {
  id: string;
  skillId: string;
  difficulty: Difficulty;
  prompt: RichText;
  figure?: Figure;
  scene?: Scene;
  say?: string;
  input: InputSpec;
  hintsAvailable: number;
  /** Junior: a second try straight after a wrong answer ("try one like it"). */
  retry?: boolean;
}
